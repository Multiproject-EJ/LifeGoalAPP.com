import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient, hasSupabaseCredentials } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';
import {
  DEMO_USER_ID,
  clearDemoHabitCompletion,
  getDemoGoals,
  getDemoHabitLogsForDate,
  getDemoHabitLogsForRange,
  getDemoHabitsByGoal,
  getDemoHabitsForUser,
  logDemoHabitCompletion,
  removeDemoHabit,
  upsertDemoHabit,
} from './demoData';

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
  if (!hasSupabaseCredentials()) {
    return { data: getDemoHabitsByGoal(goalId), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .select('*')
    .eq('goal_id', goalId)
    .order('name')
    .returns<HabitRow[]>();
}

export async function fetchHabitsForUser(userId: string): Promise<ServiceResponse<HabitWithGoal[]>> {
  if (!hasSupabaseCredentials()) {
    const habits = getDemoHabitsForUser(userId || DEMO_USER_ID);
    const goals = getDemoGoals(userId || DEMO_USER_ID);
    const goalMap = new Map(
      goals.map((goal) => [goal.id, { id: goal.id, title: goal.title, target_date: goal.target_date }]),
    );
    const result = habits.map((habit) => ({
      ...habit,
      goal: goalMap.get(habit.goal_id) ?? null,
    }));
    return { data: result, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .select('id, goal_id, name, frequency, schedule, goal:goals(id, title, target_date)')
    .eq('goals.user_id', userId)
    .order('name')
    .returns<HabitWithGoal[]>();
}

export async function upsertHabit(payload: HabitInsert | HabitUpdate): Promise<ServiceResponse<HabitRow>> {
  if (!hasSupabaseCredentials()) {
    return { data: upsertDemoHabit(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .upsert(payload as HabitInsert, { onConflict: 'id' })
    .select()
    .returns<HabitRow>()
    .single();
}

export async function deleteHabit(id: string): Promise<ServiceResponse<HabitRow>> {
  if (!hasSupabaseCredentials()) {
    return { data: removeDemoHabit(id), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .select()
    .returns<HabitRow>()
    .single();
}

export async function logHabitCompletion(payload: HabitLogInsert): Promise<ServiceResponse<HabitLogRow>> {
  if (!hasSupabaseCredentials()) {
    return { data: logDemoHabitCompletion(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .insert(payload)
    .select()
    .returns<HabitLogRow>()
    .single();
}

export async function clearHabitCompletion(
  habitId: string,
  date: string,
): Promise<ServiceResponse<HabitLogRow>> {
  if (!hasSupabaseCredentials()) {
    return { data: clearDemoHabitCompletion(habitId, date), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', date)
    .select()
    .returns<HabitLogRow>()
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

  if (!hasSupabaseCredentials()) {
    return { data: getDemoHabitLogsForDate(date, habitIds), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .select('*')
    .eq('date', date)
    .in('habit_id', habitIds)
    .returns<HabitLogRow[]>();
}

export async function fetchHabitLogsForRange(
  habitIds: string[],
  startDate: string,
  endDate: string,
): Promise<ServiceResponse<HabitLogRow[]>> {
  if (!habitIds.length) {
    return { data: [], error: null };
  }

  if (!hasSupabaseCredentials()) {
    return { data: getDemoHabitLogsForRange(habitIds, startDate, endDate), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('habit_logs')
    .select('*')
    .in('habit_id', habitIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .returns<HabitLogRow[]>();
}
