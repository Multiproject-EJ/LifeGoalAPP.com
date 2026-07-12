import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import { shouldQueueAfterFailure, toPostgrestError } from './offlineWriteThrough';
import {
  buildLocalCompletionKey,
  buildLocalCompletionRowId,
  getLocalHabitCompletionRecord,
  listLocalHabitCompletionsForUserInRange,
  listPendingHabitCompletionMutations,
  removeHabitCompletionMutation,
  upsertLocalHabitCompletionRecord,
} from '../data/habitCompletionsOfflineRepo';
import {
  DEMO_USER_ID,
  getDemoHabitLogsForRange,
  getDemoHabitsForUser,
} from './demoData';

type HabitLogRow = Database['public']['Tables']['habit_logs_v2']['Row'];
type HabitCompletionRow = Database['public']['Tables']['habit_completions']['Row'];
type HabitCompletionInsert = Database['public']['Tables']['habit_completions']['Insert'];
type HabitCompletionUpdate = Database['public']['Tables']['habit_completions']['Update'];
type HabitV2Row = Database['public']['Tables']['habits_v2']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export type HabitCompletionQueueStatus = {
  pending: number;
  failed: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function toLocalQueuedCompletionRow(
  userId: string,
  habitId: string,
  date: string,
  completed: boolean,
): HabitCompletionRow {
  return {
    id: buildLocalCompletionRowId(userId, habitId, date),
    user_id: userId,
    habit_id: habitId,
    completed_date: date,
    completed,
    created_at: nowIso(),
  };
}

async function queueLocalHabitCompletionToggle(
  userId: string,
  habitId: string,
  date: string,
  baseCompleted: boolean,
): Promise<HabitCompletionRow> {
  const key = buildLocalCompletionKey(userId, habitId, date);
  const localExisting = await getLocalHabitCompletionRecord(key);
  const currentCompleted = localExisting?.row.completed ?? baseCompleted;
  const desiredCompleted = !currentCompleted;
  const nowMs = Date.now();
  const localRow = toLocalQueuedCompletionRow(userId, habitId, date, desiredCompleted);

  await upsertLocalHabitCompletionRecord({
    id: key,
    user_id: userId,
    habit_id: habitId,
    completed_date: date,
    row: localRow,
    sync_state: 'pending_upsert',
    updated_at_ms: nowMs,
    last_error: null,
  });

  // Desired state is absolute for (user, habit, date): latest toggle wins.
  await getMutationQueue().enqueue({
    feature: 'habit_completions',
    operation: 'habit_completion.set',
    payload: { userId, habitId, date, completed: desiredCompleted },
    dedupeKey: key,
  });

  return localRow;
}

async function buildMergedMonthlyGrid(
  userId: string,
  startDate: string,
  endDate: string,
  remoteGrid: Record<string, Record<string, boolean>>,
): Promise<Record<string, Record<string, boolean>>> {
  const localRecords = await listLocalHabitCompletionsForUserInRange(userId, startDate, endDate);
  if (!localRecords.length) return remoteGrid;
  const merged: Record<string, Record<string, boolean>> = { ...remoteGrid };

  for (const record of localRecords) {
    if (!merged[record.habit_id]) {
      merged[record.habit_id] = {};
    }
    merged[record.habit_id][record.completed_date] = record.row.completed;
  }

  return merged;
}

/**
 * Structure representing completion data for a single habit in a month.
 * Contains the habit ID, name, and completion percentage for the month.
 */
export type HabitMonthlyCompletion = {
  habitId: string;
  habitName: string;
  totalDays: number;
  completedDays: number;
  completionPercentage: number;
  goalTitle?: string | null;
  emoji?: string | null;
  schedule?: Json | null;
};

/**
 * Structure representing the monthly completion summary for all habits.
 */
export type MonthlyHabitCompletions = {
  userId: string;
  year: number;
  month: number; // 1-12 (January = 1)
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  habits: HabitMonthlyCompletion[];
  overallCompletionPercentage: number;
};

/**
 * Helper function to get the first and last day of a given month.
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Object with startDate and endDate as ISO strings (YYYY-MM-DD)
 */
export function getMonthBoundaries(year: number, month: number): { startDate: string; endDate: string } {
  // Create date for first day of month
  const firstDay = new Date(year, month - 1, 1);
  
  // Create date for last day of month (day 0 of next month = last day of current month)
  const lastDay = new Date(year, month, 0);
  
  // Format as ISO date strings (YYYY-MM-DD)
  const startDate = formatISODate(firstDay);
  const endDate = formatISODate(lastDay);
  
  return { startDate, endDate };
}

/**
 * Format a Date object as an ISO date string (YYYY-MM-DD).
 */
function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main helper function to get habit completions for a specific month.
 * 
 * **IMPORTANT**: This function queries the NEW habits_v2 and habit_completions tables.
 * 
 * Data structure differences from legacy habits table:
 * - Uses `habits_v2.title` instead of `habits.name`
 * - No direct goal associations (goalTitle will be null)
 * - Includes emoji and schedule fields from habits_v2
 * 
 * @param userId - The user's ID
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Promise with monthly completion data or error
 * 
 * @example
 * ```typescript
 * const result = await getHabitCompletionsByMonth('user-123', 2025, 1);
 * if (result.data) {
 *   result.data.habits.forEach(habit => {
 *     console.log(`${habit.habitName}: ${habit.completionPercentage}%`);
 *   });
 * }
 * ```
 */
export async function getHabitCompletionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<ServiceResponse<MonthlyHabitCompletions>> {
  try {
    // Get month boundaries
    const { startDate, endDate } = getMonthBoundaries(year, month);
    
    // Check if we should use demo data or real Supabase data
    if (!canUseSupabaseData()) {
      return getHabitCompletionsByMonthDemo(userId, year, month, startDate, endDate);
    }
    
    const supabase = getSupabaseClient();

    // Fetch all habits_v2 for the user (no goal association in habits_v2)
    const habitsResult = await guardedCloudCall('database', async () => {
      const { data, error } = await supabase
        .from('habits_v2')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false);
      if (error) throw error;
      return data ?? [];
    });

    if (!habitsResult.ok) {
      return { data: null, error: toPostgrestError(habitsResult.error) };
    }
    const habitsData = habitsResult.data;

    if (!habitsData || habitsData.length === 0) {
      return {
        data: {
          userId,
          year,
          month,
          startDate,
          endDate,
          habits: [],
          overallCompletionPercentage: 0,
        },
        error: null,
      };
    }
    
    const habits = habitsData as HabitV2Row[];
    
    // Get habit IDs
    const habitIds = habits.map(h => h.id);
    
    // Fetch all habit_completions for these habits within the month range
    const completionsResult = await guardedCloudCall('database', async () => {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .in('habit_id', habitIds)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);
      if (error) throw error;
      return data ?? [];
    });

    if (!completionsResult.ok) {
      return { data: null, error: toPostgrestError(completionsResult.error) };
    }

    const completions = completionsResult.data as HabitCompletionRow[];
    
    // Calculate days in month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const totalDaysInMonth = monthEnd.getDate();
    
    // Build completion data for each habit
    const habitCompletions: HabitMonthlyCompletion[] = habits.map(habit => {
      // Count completed entries for this habit
      const habitCompletions = completions.filter(
        completion => completion.habit_id === habit.id && completion.completed
      );
      const completedDays = habitCompletions.length;
      
      // Calculate completion percentage (out of total days in month)
      const completionPercentage = totalDaysInMonth > 0
        ? Math.round((completedDays / totalDaysInMonth) * 100)
        : 0;
      
      return {
        habitId: habit.id,
        habitName: habit.title, // habits_v2 uses 'title' instead of 'name'
        totalDays: totalDaysInMonth,
        completedDays,
        completionPercentage,
        goalTitle: null, // habits_v2 doesn't have direct goal associations
        emoji: habit.emoji,
        schedule: habit.schedule,
      };
    });
    
    // Calculate overall completion percentage
    const totalPossibleCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.totalDays,
      0,
    );
    const totalActualCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.completedDays,
      0,
    );
    const overallCompletionPercentage = totalPossibleCompletions > 0
      ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
      : 0;
    
    return {
      data: {
        userId,
        year,
        month,
        startDate,
        endDate,
        habits: habitCompletions,
        overallCompletionPercentage,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getHabitCompletionsByMonth:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Demo mode version of getHabitCompletionsByMonth.
 * Uses demo data instead of Supabase queries.
 */
function getHabitCompletionsByMonthDemo(
  userId: string,
  year: number,
  month: number,
  startDate: string,
  endDate: string,
): ServiceResponse<MonthlyHabitCompletions> {
  try {
    const effectiveUserId = userId || DEMO_USER_ID;
    
    // Get demo habits
    const habits = getDemoHabitsForUser(effectiveUserId);
    
    if (!habits || habits.length === 0) {
      return {
        data: {
          userId: effectiveUserId,
          year,
          month,
          startDate,
          endDate,
          habits: [],
          overallCompletionPercentage: 0,
        },
        error: null,
      };
    }
    
    // Get habit IDs
    const habitIds = habits.map(h => h.id);
    
    // Get demo logs for the date range
    const logs = getDemoHabitLogsForRange(habitIds, startDate, endDate);
    
    // Calculate days in month
    const monthEnd = new Date(year, month, 0);
    const totalDaysInMonth = monthEnd.getDate();
    
    // Build completion data for each habit
    const habitCompletions: HabitMonthlyCompletion[] = habits.map(habit => {
      // Count completed logs for this habit
      const habitLogs = logs.filter(log => log.habit_id === habit.id && log.done);
      const completedDays = habitLogs.length;
      
      // Calculate completion percentage
      const completionPercentage = totalDaysInMonth > 0
        ? Math.round((completedDays / totalDaysInMonth) * 100)
        : 0;
      
      return {
        habitId: habit.id,
        habitName: habit.title,
        totalDays: totalDaysInMonth,
        completedDays,
        completionPercentage,
        goalTitle: null, // Demo data doesn't have goal associations in this context
      };
    });
    
    // Calculate overall completion percentage
    const totalPossibleCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.totalDays,
      0,
    );
    const totalActualCompletions = habitCompletions.reduce(
      (sum, h) => sum + h.completedDays,
      0,
    );
    const overallCompletionPercentage = totalPossibleCompletions > 0
      ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
      : 0;
    
    return {
      data: {
        userId: effectiveUserId,
        year,
        month,
        startDate,
        endDate,
        habits: habitCompletions,
        overallCompletionPercentage,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getHabitCompletionsByMonthDemo:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Toggle habit completion for a specific date.
 * If a row for (user_id, habit_id, completed_date) does not exist, insert one with completed = true.
 * If it exists, toggle the completed value.
 * 
 * @param userId - The user's ID
 * @param habitId - The habit ID
 * @param date - The date in ISO format (YYYY-MM-DD)
 * @returns Promise with the updated completion row or error
 * 
 * @example
 * ```typescript
 * const result = await toggleHabitCompletionForDate('user-123', 'habit-456', '2025-01-15');
 * if (result.data) {
 *   console.log(`Habit completion toggled to: ${result.data.completed}`);
 * }
 * ```
 */
export async function toggleHabitCompletionForDate(
  userId: string,
  habitId: string,
  date: string,
): Promise<ServiceResponse<HabitCompletionRow>> {
  // Check if we should use demo data or real Supabase data
  if (!canUseSupabaseData()) {
    return toggleHabitCompletionForDateDemo(userId, habitId, date);
  }

  const supabase = getSupabaseClient();

  const result = await guardedCloudCall('database', async () => {
    // Check if a completion record already exists for this user/habit/date
    const { data: existingData, error: fetchError } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('completed_date', date)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const existingCompletion = existingData as HabitCompletionRow | null;

    if (existingCompletion) {
      // Record exists - toggle the completed value
      const newCompletedValue = !existingCompletion.completed;
      const { data: updateData, error: updateError } = await supabase
        .from('habit_completions')
        .update({ completed: newCompletedValue })
        .eq('id', existingCompletion.id)
        .select()
        .single();
      if (updateError) throw updateError;
      return updateData as HabitCompletionRow;
    }

    // Record doesn't exist - insert a new one with completed = true
    const insertPayload: HabitCompletionInsert = {
      user_id: userId,
      habit_id: habitId,
      completed_date: date,
      completed: true,
    };

    const { data: insertData, error: insertError } = await supabase
      .from('habit_completions')
      .insert(insertPayload)
      .select()
      .single();
    if (insertError) throw insertError;
    return insertData as HabitCompletionRow;
  });

  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      // Base state unknown during an outage; the local record (if any)
      // carries the last toggle, so flipping from it is still correct.
      const queued = await queueLocalHabitCompletionToggle(userId, habitId, date, false);
      return { data: queued, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  return { data: result.data, error: null };
}

/**
 * Demo mode version of toggleHabitCompletionForDate.
 * Uses demo data instead of Supabase queries.
 */
function toggleHabitCompletionForDateDemo(
  userId: string,
  habitId: string,
  date: string,
): ServiceResponse<HabitCompletionRow> {
  try {
    // In demo mode, we simulate the toggle behavior and return a mock completion row.
    const effectiveUserId = userId || DEMO_USER_ID;
    
    // Create a mock completion row
    // Note: In demo mode, this won't actually persist to the database
    // The actual demo data is managed by the existing demo functions
    const mockCompletion: HabitCompletionRow = {
      id: `demo-${habitId}-${date}`,
      user_id: effectiveUserId,
      habit_id: habitId,
      completed_date: date,
      completed: true, // Always toggle to true in demo mode for simplicity
      created_at: new Date().toISOString(),
    };
    
    return { data: mockCompletion, error: null };
  } catch (error) {
    console.error('Error in toggleHabitCompletionForDateDemo:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Get per-day completion data for all habits in a given month.
 * Returns a map of habitId -> date -> completed boolean.
 * This is useful for rendering monthly grids.
 * 
 * @param userId - The user's ID
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12, where 1 = January)
 * @returns Promise with per-day completion data or error
 */
export async function getMonthlyCompletionGrid(
  userId: string,
  year: number,
  month: number,
): Promise<ServiceResponse<Record<string, Record<string, boolean>>>> {
  try {
    const { startDate, endDate } = getMonthBoundaries(year, month);
    
    if (!canUseSupabaseData()) {
      return getMonthlyCompletionGridDemo(userId, year, month, startDate, endDate);
    }
    
    const supabase = getSupabaseClient();

    // Fetch all habit_completions for the user within the month range
    const completionsResult = await guardedCloudCall('database', async () => {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('habit_id, completed_date, completed')
        .eq('user_id', userId)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);
      if (error) throw error;
      return (data ?? []) as HabitCompletionRow[];
    });

    if (!completionsResult.ok) {
      // Outage: local pending toggles still render on the grid.
      const localOnly = await buildMergedMonthlyGrid(userId, startDate, endDate, {});
      return { data: localOnly, error: null };
    }

    // Build the grid: habitId -> date -> completed
    const grid: Record<string, Record<string, boolean>> = {};

    for (const completion of completionsResult.data) {
      if (!grid[completion.habit_id]) {
        grid[completion.habit_id] = {};
      }
      grid[completion.habit_id][completion.completed_date] = completion.completed;
    }

    const mergedGrid = await buildMergedMonthlyGrid(userId, startDate, endDate, grid);
    return { data: mergedGrid, error: null };
  } catch (error) {
    console.error('Error in getMonthlyCompletionGrid:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

let legacyCompletionQueueMigrated = false;

/**
 * One-time convergence of the pre-framework habit-completion queue onto the
 * shared MutationQueue. Pending toggles survive the upgrade.
 */
export async function migrateLegacyHabitCompletionQueue(userId: string): Promise<void> {
  if (legacyCompletionQueueMigrated) return;
  legacyCompletionQueueMigrated = true;

  try {
    const queue = getMutationQueue();
    for (const legacy of await listPendingHabitCompletionMutations(userId)) {
      await queue.enqueue({
        feature: 'habit_completions',
        operation: 'habit_completion.set',
        payload: {
          userId,
          habitId: legacy.habit_id,
          date: legacy.completed_date,
          completed: legacy.desired_completed,
        },
        dedupeKey: buildLocalCompletionKey(userId, legacy.habit_id, legacy.completed_date),
      });
      await removeHabitCompletionMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyCompletionQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedHabitCompletions(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyHabitCompletionQueue(userId);
  await getSyncEngine().syncNow();
}

export async function getHabitCompletionQueueStatus(_userId: string): Promise<HabitCompletionQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'habit_completions') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

/**
 * Demo mode version of getMonthlyCompletionGrid.
 */
function getMonthlyCompletionGridDemo(
  userId: string,
  year: number,
  month: number,
  startDate: string,
  endDate: string,
): ServiceResponse<Record<string, Record<string, boolean>>> {
  try {
    const effectiveUserId = userId || DEMO_USER_ID;
    const habits = getDemoHabitsForUser(effectiveUserId);
    const habitIds = habits.map(h => h.id);
    const logs = getDemoHabitLogsForRange(habitIds, startDate, endDate);
    
    const grid: Record<string, Record<string, boolean>> = {};
    
    for (const log of logs) {
      if (!grid[log.habit_id]) {
        grid[log.habit_id] = {};
      }
      grid[log.habit_id][log.date] = log.done;
    }
    
    return { data: grid, error: null };
  } catch (error) {
    console.error('Error in getMonthlyCompletionGridDemo:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}

/**
 * Helper function to get habit completions for a specific habit across multiple months.
 * Useful for showing trend data.
 * 
 * @param userId - The user's ID
 * @param habitId - The habit ID to track
 * @param startYear - Starting year
 * @param startMonth - Starting month (1-12)
 * @param endYear - Ending year
 * @param endMonth - Ending month (1-12)
 * @returns Promise with array of monthly completion data
 */
export async function getHabitCompletionsTrend(
  userId: string,
  habitId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Promise<ServiceResponse<HabitMonthlyCompletion[]>> {
  try {
    const monthlyData: HabitMonthlyCompletion[] = [];
    
    // Iterate through each month in the range
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (
      currentYear < endYear ||
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const result = await getHabitCompletionsByMonth(userId, currentYear, currentMonth);
      
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      if (result.data) {
        const habitData = result.data.habits.find(h => h.habitId === habitId);
        if (habitData) {
          monthlyData.push(habitData);
        }
      }
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    
    return { data: monthlyData, error: null };
  } catch (error) {
    console.error('Error in getHabitCompletionsTrend:', error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}
