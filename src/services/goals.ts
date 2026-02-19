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
import {
  buildSnapshotSummary,
  createGoalSnapshot,
  inferSnapshotType,
} from './goalSnapshots';

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
  const { data, error } = await supabase
    .from('goals')
    .insert(payload)
    .select()
    .single<GoalRow>();

  if (data) {
    const snapshotType = inferSnapshotType(null, data);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: null,
      after_state: data,
      metadata: {
        source: 'goals.insert',
      },
    });
  }

  return { data: data ?? null, error };
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const record = updateDemoGoal(id, payload);
    return { data: record, error: null };
  }

  const supabase = getSupabaseClient();

  const { data: beforeState } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .maybeSingle<GoalRow>();

  const { data, error } = await supabase
    .from('goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single<GoalRow>();

  if (data) {
    const snapshotType = inferSnapshotType(beforeState ?? null, data);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: beforeState,
      after_state: data,
      metadata: {
        source: 'goals.update',
      },
    });
  }

  return { data: data ?? null, error };
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoGoal(id);
    return { data: removed, error: null };
  }

  const supabase = getSupabaseClient();
  const { data: beforeState } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .maybeSingle<GoalRow>();

  const { data, error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .select()
    .single<GoalRow>();

  if (data) {
    const snapshotType = inferSnapshotType(beforeState ?? null, null);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: beforeState,
      after_state: null,
      metadata: {
        source: 'goals.delete',
      },
    });
  }

  return { data: data ?? null, error };
}
