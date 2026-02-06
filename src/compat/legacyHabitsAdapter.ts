/**
 * Legacy Habits Adapter
 * 
 * This adapter provides backward compatibility for code that still uses
 * the legacy habits.ts service signatures. Internally, it redirects calls
 * to the habitsV2.ts service helpers.
 * 
 * @deprecated This adapter is temporary during the migration period.
 * New code should use habitsV2.ts directly.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import type { Database, Json } from '../lib/database.types';
import { buildDefaultAutoProgressState } from '../features/habits/autoProgression';
import {
  listHabitsV2,
  createHabitV2,
  logHabitCompletionV2,
  listTodayHabitLogsV2,
  listHabitLogsForRangeMultiV2,
  archiveHabitV2,
  type HabitV2Row,
  type HabitLogV2Row,
} from '../services/habitsV2';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

// Legacy type definitions for compatibility
type LegacyHabitRow = Database['public']['Tables']['habits']['Row'];
type LegacyHabitInsert = Database['public']['Tables']['habits']['Insert'];
type LegacyHabitUpdate = Database['public']['Tables']['habits']['Update'];
type LegacyHabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
type LegacyHabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];

export type LegacyHabitWithGoal = LegacyHabitRow & {
  emoji?: string | null;
  type?: Database['public']['Enums']['habit_type'];
  target_num?: number | null;
  target_unit?: string | null;
  autoprog?: Json | null;
  goal: {
    id: string;
    title: string;
    target_date: string | null;
  } | null;
};

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Log deprecation warning (only in development mode)
 */
function logDeprecationWarning(functionName: string): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[DEPRECATED] ${functionName} from legacyHabitsAdapter.ts is deprecated. ` +
      'Please migrate to habitsV2.ts functions. This adapter will be removed in a future release.'
    );
  }
}

/**
 * Convert v2 habit to legacy habit format
 */
function tolegacyHabit(v2Habit: HabitV2Row): LegacyHabitRow {
  return {
    id: v2Habit.id,
    goal_id: v2Habit.goal_id || '', // Legacy requires goal_id, provide empty string if null
    name: v2Habit.title,
    frequency: deriveFrequencyFromSchedule(v2Habit.schedule),
    schedule: v2Habit.schedule as Json,
  };
}

/**
 * Convert v2 habit to legacy habit with goal format
 */
function toLegacyHabitWithGoal(v2Habit: HabitV2Row): LegacyHabitWithGoal {
  return {
    ...tolegacyHabit(v2Habit),
    emoji: v2Habit.emoji ?? null,
    type: v2Habit.type,
    target_num: v2Habit.target_num ?? null,
    target_unit: v2Habit.target_unit ?? null,
    autoprog: v2Habit.autoprog ?? null,
    goal: v2Habit.goal_id ? {
      id: v2Habit.goal_id,
      title: '', // Goal title not available from v2 habit directly
      target_date: null,
    } : null,
  };
}

/**
 * Convert v2 log to legacy log format
 */
function toLegacyLog(v2Log: HabitLogV2Row): LegacyHabitLogRow {
  return {
    id: v2Log.id,
    habit_id: v2Log.habit_id,
    date: v2Log.date,
    completed: v2Log.done,
  };
}

/**
 * Derive frequency string from v2 schedule JSON
 */
function deriveFrequencyFromSchedule(schedule: Json): string {
  if (!schedule || typeof schedule !== 'object') {
    return 'daily';
  }
  
  const scheduleObj = schedule as Record<string, Json>;
  const mode = scheduleObj.mode;
  
  if (mode === 'daily') return 'daily';
  if (mode === 'specific_days') return 'weekly';
  if (mode === 'times_per_week') return 'weekly';
  if (mode === 'every_n_days') return 'custom';
  
  return 'daily';
}

/**
 * Fetch habits by goal ID
 * @deprecated Use listHabitsV2() and filter by goal_id instead
 */
export async function fetchHabitsByGoal(goalId: string): Promise<ServiceResponse<LegacyHabitRow[]>> {
  logDeprecationWarning('fetchHabitsByGoal');
  
  const { data, error } = await listHabitsV2();
  
  if (error) {
    return { data: null, error };
  }
  
  const filteredHabits = (data || [])
    .filter(habit => habit.goal_id === goalId)
    .map(tolegacyHabit);
  
  return { data: filteredHabits, error: null };
}

/**
 * Fetch all habits for a user
 * @deprecated Use listHabitsV2() instead
 */
export async function fetchHabitsForUser(userId: string): Promise<ServiceResponse<LegacyHabitWithGoal[]>> {
  logDeprecationWarning('fetchHabitsForUser');
  
  const { data, error } = await listHabitsV2();
  
  if (error) {
    return { data: null, error };
  }
  
  // If goal information is needed, we need to fetch it separately
  // For now, return habits with minimal goal info
  const habitsWithGoal = (data || []).map(toLegacyHabitWithGoal);
  
  return { data: habitsWithGoal, error: null };
}

/**
 * Create or update a habit
 * @deprecated Use createHabitV2() for new habits
 */
export async function upsertHabit(
  payload: LegacyHabitInsert | LegacyHabitUpdate,
  userId?: string
): Promise<ServiceResponse<LegacyHabitRow>> {
  logDeprecationWarning('upsertHabit');
  
  if (!userId) {
    // Try to get user from session
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided and not authenticated' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  // Determine schedule from legacy format
  const schedule = payload.schedule || { mode: 'daily' };
  
  const v2Payload = {
    title: payload.name || '',
    emoji: null,
    type: 'boolean' as const,
    schedule: schedule as Json,
    autoprog: buildDefaultAutoProgressState({
      schedule: schedule as Json,
      target: null,
    }) as Database['public']['Tables']['habits_v2']['Insert']['autoprog'],
    goal_id: payload.goal_id || null,
    archived: false,
  };
  
  const { data, error } = await createHabitV2(v2Payload, userId);
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: tolegacyHabit(data), error: null };
}

/**
 * Delete a habit
 * @deprecated Use archiveHabitV2() instead (soft delete)
 */
export async function deleteHabit(id: string): Promise<ServiceResponse<LegacyHabitRow>> {
  logDeprecationWarning('deleteHabit');
  
  // In v2, we archive instead of delete
  const { error } = await archiveHabitV2(id);
  
  if (error) {
    return { data: null, error };
  }
  
  // Return a placeholder since we can't get the deleted data
  return { 
    data: { id, goal_id: '', name: '', frequency: '', schedule: null }, 
    error: null 
  };
}

/**
 * Log a habit completion
 * @deprecated Use logHabitCompletionV2() instead
 */
export async function logHabitCompletion(
  payload: LegacyHabitLogInsert,
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow>> {
  logDeprecationWarning('logHabitCompletion');
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided and not authenticated' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  const v2Payload = {
    habit_id: payload.habit_id,
    done: payload.completed ?? true,
    value: null,
    date: payload.date,
    // Set timestamp to midnight UTC for the target date to ensure the trigger sets the correct date
    // The database trigger converts ts to UTC timezone before extracting the date
    ts: payload.date ? new Date(payload.date + 'T00:00:00Z').toISOString() : undefined,
  };
  
  const { data, error } = await logHabitCompletionV2(v2Payload, userId);
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: toLegacyLog(data), error: null };
}

/**
 * Clear a habit completion
 * @deprecated Consider using v2 approach with done=false or deleting the log
 */
export async function clearHabitCompletion(
  habitId: string,
  date: string
): Promise<ServiceResponse<LegacyHabitLogRow>> {
  logDeprecationWarning('clearHabitCompletion');
  
  if (!canUseSupabaseData()) {
    return { data: null, error: { message: 'Not in Supabase mode' } as PostgrestError };
  }
  
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
  }
  
  // Delete the v2 log entry
  const { data, error } = await supabase
    .from('habit_logs_v2')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', session.user.id)
    .eq('date', date)
    .select()
    .single();
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: toLegacyLog(data as HabitLogV2Row), error: null };
}

/**
 * Build schedule payload
 * @deprecated Use v2 schedule format directly
 */
export function buildSchedulePayload(schedule: Record<string, Json>): Json {
  logDeprecationWarning('buildSchedulePayload');
  return schedule as Json;
}

/**
 * Fetch habit logs for a specific date
 * @deprecated Use listTodayHabitLogsV2() instead
 */
export async function fetchHabitLogsForDate(
  date: string,
  habitIds: string[],
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow[]>> {
  logDeprecationWarning('fetchHabitLogsForDate');
  
  if (!habitIds.length) {
    return { data: [], error: null };
  }
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  // Use v2 service to get today's logs, then filter by habitIds
  const { data, error } = await listTodayHabitLogsV2(userId);
  
  if (error) {
    return { data: null, error };
  }
  
  const filteredLogs = (data || [])
    .filter(log => habitIds.includes(log.habit_id) && log.date === date)
    .map(toLegacyLog);
  
  return { data: filteredLogs, error: null };
}

/**
 * Fetch habit logs for a date range
 * @deprecated Use listHabitLogsForRangeMultiV2() instead
 */
export async function fetchHabitLogsForRange(
  habitIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow[]>> {
  logDeprecationWarning('fetchHabitLogsForRange');
  
  if (!habitIds.length) {
    return { data: [], error: null };
  }
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  const { data, error } = await listHabitLogsForRangeMultiV2({
    userId,
    habitIds,
    startDate,
    endDate,
  });
  
  if (error) {
    return { data: null, error };
  }
  
  const legacyLogs = (data || []).map(toLegacyLog);
  
  return { data: legacyLogs, error: null };
}
