import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type HabitV2Row = Database['public']['Tables']['habits_v2']['Row'];
export type HabitLogV2Row = Database['public']['Tables']['habit_logs_v2']['Row'];
export type HabitStreakRow = Database['public']['Views']['v_habit_streaks']['Row'];

type HabitV2Insert = Database['public']['Tables']['habits_v2']['Insert'];
type HabitLogV2Insert = Database['public']['Tables']['habit_logs_v2']['Insert'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * List all habits for the current authenticated user.
 * Filters by user_id automatically via RLS policies.
 * Returns habits ordered by creation date (newest first).
 */
export async function listHabitsV2(): Promise<ServiceResponse<HabitV2Row[]>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habits_v2')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .returns<HabitV2Row[]>();
}

/**
 * List all habit logs for today filtered by the current authenticated user.
 * Uses the date field which is auto-generated from the timestamp.
 * 
 * @param userId - The user ID to filter logs by
 * @returns Promise with data array of habit logs and error
 */
export async function listTodayHabitLogsV2(
  userId: string,
): Promise<ServiceResponse<HabitLogV2Row[]>> {
  const supabase = getSupabaseClient();
  
  // Get today's date in UTC format (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  
  return supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .returns<HabitLogV2Row[]>();
}

/**
 * Create a new habit for the current authenticated user.
 * The user_id is provided separately and merged with the input.
 * 
 * @param input - Habit data without user_id
 * @param userId - The user ID to associate with the habit
 * @returns Promise with the created habit data and error
 */
export async function createHabitV2(
  input: Omit<HabitV2Insert, 'user_id'>,
  userId: string,
): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  
  const payload: HabitV2Insert = {
    ...input,
    user_id: userId,
  };
  
  return supabase
    .from('habits_v2')
    .insert(payload)
    .select()
    .single();
}

/**
 * Log a habit completion for the current authenticated user.
 * The user_id is provided separately and merged with the input.
 * The date field is auto-generated from the timestamp.
 * 
 * @param input - Habit log data without user_id
 * @param userId - The user ID to associate with the log
 * @returns Promise with the created habit log data and error
 */
export async function logHabitCompletionV2(
  input: Omit<HabitLogV2Insert, 'user_id'>,
  userId: string,
): Promise<ServiceResponse<HabitLogV2Row>> {
  const supabase = getSupabaseClient();
  
  const payload: HabitLogV2Insert = {
    ...input,
    user_id: userId,
  };
  
  return supabase
    .from('habit_logs_v2')
    .insert(payload)
    .select()
    .single();
}

/**
 * List all habit streaks for the current authenticated user.
 * Joins the v_habit_streaks view with habits_v2 to filter by user_id.
 * Returns streaks ordered by current streak descending.
 * 
 * @param userId - The user ID to filter streaks by
 * @returns Promise with data array of habit streaks and error
 */
export async function listHabitStreaksV2(
  userId: string,
): Promise<ServiceResponse<HabitStreakRow[]>> {
  const supabase = getSupabaseClient();
  
  // First, get the user's habit IDs
  const { data: userHabits, error: habitsError } = await supabase
    .from('habits_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('archived', false);
  
  if (habitsError) {
    return { data: null, error: habitsError };
  }
  
  if (!userHabits || userHabits.length === 0) {
    return { data: [], error: null };
  }
  
  const habitIds = userHabits.map(h => h.id);
  
  // Query the streaks view filtered by the user's habit IDs
  const result = await supabase
    .from('v_habit_streaks')
    .select('*')
    .in('habit_id', habitIds)
    .order('current_streak', { ascending: false })
    .returns<HabitStreakRow[]>();
  
  return result;
}

/**
 * List habit logs for a specific habit within a date range.
 * Used for generating insights and heatmap visualizations.
 * 
 * @param params - Query parameters with userId, habitId, and date range
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForRangeV2(params: {
  userId: string;
  habitId: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;   // ISO date (YYYY-MM-DD)
}): Promise<ServiceResponse<HabitLogV2Row[]>> {
  const supabase = getSupabaseClient();
  
  return supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', params.userId)
    .eq('habit_id', params.habitId)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
}

/**
 * Quick add a daily boolean habit with minimal configuration.
 * Intended for use by the Dashboard quick form to create habits
 * that immediately appear in the habits_v2 unified checklist.
 * 
 * @param params - Habit configuration
 * @param params.title - The habit title/name
 * @param params.domainKey - Optional life wheel domain key
 * @param params.goalId - Optional goal ID to link the habit to
 * @param params.emoji - Optional emoji for the habit (defaults to null)
 * @param userId - The user ID to associate with the habit
 * @returns Promise with the created habit data and error
 */
export async function quickAddDailyHabit(params: {
  title: string;
  domainKey?: string | null;
  goalId?: string | null;
  emoji?: string | null;
}, userId: string): Promise<ServiceResponse<HabitV2Row>> {
  const habitInput: Omit<HabitV2Insert, 'user_id'> = {
    title: params.title,
    emoji: params.emoji ?? null,
    type: 'boolean',
    schedule: { mode: 'daily' },
    domain_key: params.domainKey ?? null,
    goal_id: params.goalId ?? null,
    archived: false,
    target_num: null,
    target_unit: null,
  };
  
  return createHabitV2(habitInput, userId);
}

/**
 * Archive a habit by setting its archived flag to true.
 * Archived habits will not appear in the active habits list.
 * 
 * @param habitId - The ID of the habit to archive
 * @returns Promise with data (null) and error
 */
export async function archiveHabitV2(habitId: string): Promise<ServiceResponse<null>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('habits_v2')
    .update({ archived: true })
    .eq('id', habitId);
  
  return { data: null, error };
}

/**
 * Get ISO week bounds (Monday to Sunday) for a given date.
 * ISO weeks start on Monday.
 */
function getISOWeekBounds(date: Date): { startDate: string; endDate: string } {
  const d = new Date(date);
  const day = d.getDay();
  // Convert Sunday (0) to 7 for ISO week calculation
  const isoDay = day === 0 ? 7 : day;
  
  // Get Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - isoDay + 1);
  
  // Get Sunday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * List habit logs for the current ISO week (Monday-Sunday) for the provided habit IDs.
 * Used for times_per_week schedule mode to determine if weekly target has been met.
 * 
 * @param userId - The user ID to filter logs by
 * @param habitIds - Array of habit IDs to fetch logs for
 * @param referenceDate - Optional reference date for the week (defaults to today)
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForWeekV2(
  userId: string,
  habitIds: string[],
  referenceDate: Date = new Date(),
): Promise<ServiceResponse<HabitLogV2Row[]>> {
  if (!habitIds || habitIds.length === 0) {
    return { data: [], error: null };
  }
  
  const supabase = getSupabaseClient();
  const { startDate, endDate } = getISOWeekBounds(referenceDate);
  
  return supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', userId)
    .in('habit_id', habitIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
}

/**
 * List habit logs for multiple habits within a date range.
 * Used for adherence calculations and analytics.
 * 
 * @param params - Query parameters with userId, habitIds, and date range
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForRangeMultiV2(params: {
  userId: string;
  habitIds: string[];
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;   // ISO date (YYYY-MM-DD)
}): Promise<ServiceResponse<HabitLogV2Row[]>> {
  if (!params.habitIds || params.habitIds.length === 0) {
    return { data: [], error: null };
  }
  
  const supabase = getSupabaseClient();
  
  return supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', params.userId)
    .in('habit_id', params.habitIds)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
}
