import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';

type HabitRow = Database['public']['Tables']['habits']['Row'];
type HabitInsert = Database['public']['Tables']['habits']['Insert'];
type HabitUpdate = Database['public']['Tables']['habits']['Update'];

type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];

export type HabitWithGoal = HabitRow & {
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

export async function fetchHabitsByGoal(goalId: string): Promise<ServiceResponse<HabitRow[]>> {
  const supabase = getSupabaseClient();
  return supabase.from('habits').select('*').eq('goal_id', goalId).order('name');
}

export async function fetchHabitsForUser(userId: string): Promise<ServiceResponse<HabitWithGoal[]>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .select('id, goal_id, name, frequency, schedule, goal:goals(id, title, target_date)')
    .eq('goals.user_id', userId)
    .order('name')
    .returns<HabitWithGoal[]>();
}

export async function upsertHabit(payload: HabitInsert | HabitUpdate): Promise<ServiceResponse<HabitRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
}

export async function deleteHabit(id: string): Promise<ServiceResponse<HabitRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

export async function logHabitCompletion(payload: HabitLogInsert): Promise<ServiceResponse<HabitLogRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .insert(payload)
    .select()
    .single();
}

export async function clearHabitCompletion(
  habitId: string,
  date: string,
): Promise<ServiceResponse<HabitLogRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', date)
    .select()
    .single();
}

export function buildSchedulePayload(schedule: Record<string, Json>): Json {
  return schedule as Json;
}

export async function fetchHabitLogsForDate(
  date: string,
  habitIds: string[],
): Promise<ServiceResponse<HabitLogRow[]>> {
  if (!habitIds.length) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase.from('habit_logs').select('*').eq('date', date).in('habit_id', habitIds);
}
