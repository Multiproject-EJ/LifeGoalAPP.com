import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

export type WorkspaceStats = {
  goalCount: number;
  habitCount: number;
  checkinCount: number;
};

export type WorkspaceStatsResponse = {
  data: WorkspaceStats | null;
  error: PostgrestError | null;
};

export async function fetchWorkspaceStats(userId: string): Promise<WorkspaceStatsResponse> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();

  const goalsResult = await supabase
    .from('goals')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (goalsResult.error) {
    return { data: null, error: goalsResult.error };
  }

  const goalIds = (goalsResult.data ?? []).map((goal) => goal.id);

  let habitCount = 0;
  if (goalIds.length > 0) {
    const habitsResult = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .in('goal_id', goalIds);

    if (habitsResult.error) {
      return { data: null, error: habitsResult.error };
    }
    habitCount = habitsResult.count ?? 0;
  }

  const checkinsResult = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (checkinsResult.error) {
    return { data: null, error: checkinsResult.error };
  }

  return {
    data: {
      goalCount: goalsResult.count ?? 0,
      habitCount,
      checkinCount: checkinsResult.count ?? 0,
    },
    error: null,
  };
}
