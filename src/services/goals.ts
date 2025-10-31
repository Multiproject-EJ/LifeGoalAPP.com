import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function fetchGoals(): Promise<ServiceResponse<GoalRow[]>> {
  const supabase = getSupabaseClient();
  return supabase.from('goals').select('*').order('created_at', { ascending: false });
}

export async function insertGoal(payload: GoalInsert): Promise<ServiceResponse<GoalRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .insert(payload)
    .select()
    .single();
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .select()
    .single();
}
