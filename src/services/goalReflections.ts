import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  addDemoGoalReflection,
  getDemoGoalReflections,
  removeDemoGoalReflection,
  updateDemoGoalReflection,
  type GoalReflectionInsert,
  type GoalReflectionRow,
  type GoalReflectionUpdate,
} from './demoData';

export type { GoalReflectionRow, GoalReflectionInsert, GoalReflectionUpdate };

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function fetchGoalReflections(
  goalId: string,
): Promise<ServiceResponse<GoalReflectionRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoGoalReflections(goalId), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goal_reflections')
    .select('*')
    .eq('goal_id', goalId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<GoalReflectionRow[]>();
}

export async function insertGoalReflection(
  payload: GoalReflectionInsert,
): Promise<ServiceResponse<GoalReflectionRow>> {
  if (!canUseSupabaseData()) {
    return { data: addDemoGoalReflection(payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goal_reflections')
    .insert(payload)
    .select()
    .returns<GoalReflectionRow>()
    .single();
}

export async function updateGoalReflection(
  id: string,
  payload: GoalReflectionUpdate,
): Promise<ServiceResponse<GoalReflectionRow>> {
  if (!canUseSupabaseData()) {
    return { data: updateDemoGoalReflection(id, payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goal_reflections')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<GoalReflectionRow>()
    .single();
}

export async function deleteGoalReflection(
  id: string,
): Promise<ServiceResponse<GoalReflectionRow>> {
  if (!canUseSupabaseData()) {
    return { data: removeDemoGoalReflection(id), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goal_reflections')
    .delete()
    .eq('id', id)
    .select()
    .returns<GoalReflectionRow>()
    .single();
}
