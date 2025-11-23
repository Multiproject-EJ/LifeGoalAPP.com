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
