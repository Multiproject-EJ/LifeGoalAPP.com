import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  DEMO_USER_ID,
  addDemoGoal,
  getDemoGoals,
  removeDemoGoal,
  updateDemoGoal,
} from './demoData';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function fetchGoals(): Promise<ServiceResponse<GoalRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoGoals(DEMO_USER_ID), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<GoalRow[]>();
}

export async function insertGoal(payload: GoalInsert): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    return { data: addDemoGoal(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .insert(payload)
    .select()
    .returns<GoalRow>()
    .single();
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const record = updateDemoGoal(id, payload);
    return { data: record, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<GoalRow>()
    .single();
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoGoal(id);
    return { data: removed, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .select()
    .single();
}
