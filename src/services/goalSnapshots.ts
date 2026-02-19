import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type GoalSnapshotRow = Database['public']['Tables']['goal_snapshots']['Row'];
export type GoalSnapshotInsert = Database['public']['Tables']['goal_snapshots']['Insert'];

type GoalSnapshotType = GoalSnapshotInsert['snapshot_type'];

type SnapshotMeta = {
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createGoalSnapshot(
  payload: GoalSnapshotInsert,
): Promise<{ data: GoalSnapshotRow | null; error: Error | null }> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('goal_snapshots')
      .insert(payload)
      .select('*')
      .single<GoalSnapshotRow>();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error creating goal snapshot'),
    };
  }
}

export async function fetchGoalSnapshots(goalId: string): Promise<GoalSnapshotRow[]> {
  if (!canUseSupabaseData()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goal_snapshots')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export function inferSnapshotType(
  beforeState: Database['public']['Tables']['goals']['Row'] | null,
  afterState: Database['public']['Tables']['goals']['Row'] | null,
): GoalSnapshotType {
  if (!beforeState && afterState) {
    return 'created';
  }

  if (beforeState && !afterState) {
    return 'deleted';
  }

  if (!beforeState || !afterState) {
    return 'updated';
  }

  if (beforeState.title !== afterState.title) {
    return 'retitled';
  }

  if (beforeState.target_date !== afterState.target_date) {
    return 'timeline_shifted';
  }

  if (beforeState.status_tag !== afterState.status_tag) {
    return 'status_changed';
  }

  return 'evolved';
}

export function buildSnapshotSummary(
  snapshotType: GoalSnapshotType,
  meta?: SnapshotMeta,
): string {
  if (meta?.summary?.trim()) {
    return meta.summary.trim();
  }

  const defaults: Record<GoalSnapshotType, string> = {
    created: 'Goal created as a new chapter.',
    updated: 'Goal details were updated to reflect reality.',
    deleted: 'Goal was archived/removed from active planning.',
    status_changed: 'Goal status was updated as progress evolved.',
    retitled: 'Goal title changed to match a clearer direction.',
    timeline_shifted: 'Goal timeline shifted to fit new constraints or opportunities.',
    evolved: 'Goal evolved as life circumstances changed.',
  };

  return defaults[snapshotType];
}

export async function fetchRecentGoalSnapshots(
  userId: string,
  limit = 12,
): Promise<GoalSnapshotRow[]> {
  if (!canUseSupabaseData()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goal_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}
