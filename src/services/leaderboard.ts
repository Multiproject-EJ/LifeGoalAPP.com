import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  playerName: string;
  archetype: string;
  level: number;
  combinedWealth: number;
}

export interface LeaderboardSnapshot {
  topEntries: LeaderboardEntry[];
  viewerRank: number | null;
  viewerEntries: LeaderboardEntry[];
}

interface GamificationProfileLeaderboardRow {
  user_id: string;
  current_level: number | null;
  total_points: number | null;
  total_xp: number | null;
}

interface ProfileLeaderboardRow {
  user_id: string;
  display_name: string | null;
  personality_profile_type: string | null;
}

interface FetchLeaderboardSnapshotOptions {
  viewerUserId: string;
  topLimit?: number;
  contextRadius?: number;
}

function toCombinedWealth(row: GamificationProfileLeaderboardRow): number {
  return (row.total_points ?? 0) + (row.total_xp ?? 0);
}

function toLeaderboardEntry(
  row: GamificationProfileLeaderboardRow,
  rank: number,
  profileByUserId: Map<string, ProfileLeaderboardRow>,
): LeaderboardEntry {
  const profile = profileByUserId.get(row.user_id);

  return {
    rank,
    userId: row.user_id,
    playerName: profile?.display_name?.trim() || 'Player',
    archetype: profile?.personality_profile_type?.trim() || 'Unknown',
    level: row.current_level ?? 1,
    combinedWealth: toCombinedWealth(row),
  };
}

async function fetchProfileMap(userIds: string[]): Promise<Map<string, ProfileLeaderboardRow>> {
  if (userIds.length === 0) return new Map();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,display_name,personality_profile_type')
    .in('user_id', userIds);

  if (error) throw error;

  return new Map(((data as ProfileLeaderboardRow[]) ?? []).map((row) => [row.user_id, row]));
}

export async function fetchLeaderboardSnapshot({
  viewerUserId,
  topLimit = 50,
  contextRadius = 10,
}: FetchLeaderboardSnapshotOptions): Promise<{ data: LeaderboardSnapshot; error: string | null }> {
  try {
    if (!canUseSupabaseData()) {
      return {
        data: { topEntries: [], viewerRank: null, viewerEntries: [] },
        error: 'Leaderboard requires an active Supabase session.',
      };
    }

    const safeTopLimit = Math.max(1, Math.min(topLimit, 100));
    const safeRadius = Math.max(1, Math.min(contextRadius, 20));
    const supabase = getSupabaseClient();

    const orderedBaseQuery = () =>
      supabase
        .from('gamification_profiles')
        .select('user_id,current_level,total_points,total_xp')
        .eq('gamification_enabled', true)
        .order('total_points', { ascending: false })
        .order('total_xp', { ascending: false })
        .order('current_level', { ascending: false })
        .order('user_id', { ascending: true });

    const { data: topRowsRaw, error: topRowsError } = await orderedBaseQuery().range(0, safeTopLimit - 1);
    if (topRowsError) throw topRowsError;
    const topRows = (topRowsRaw as GamificationProfileLeaderboardRow[]) ?? [];

    const { data: viewerRowRaw, error: viewerRowError } = await supabase
      .from('gamification_profiles')
      .select('user_id,current_level,total_points,total_xp')
      .eq('user_id', viewerUserId)
      .eq('gamification_enabled', true)
      .maybeSingle();
    if (viewerRowError) throw viewerRowError;

    if (!viewerRowRaw) {
      const profileMap = await fetchProfileMap(topRows.map((row) => row.user_id));
      return {
        data: {
          topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1, profileMap)),
          viewerRank: null,
          viewerEntries: [],
        },
        error: null,
      };
    }

    const viewerRow = viewerRowRaw as GamificationProfileLeaderboardRow;
    const viewerPoints = viewerRow.total_points ?? 0;
    const viewerXp = viewerRow.total_xp ?? 0;
    const viewerLevel = viewerRow.current_level ?? 1;

    const rankAheadFilter = [
      `total_points.gt.${viewerPoints}`,
      `and(total_points.eq.${viewerPoints},total_xp.gt.${viewerXp})`,
      `and(total_points.eq.${viewerPoints},total_xp.eq.${viewerXp},current_level.gt.${viewerLevel})`,
      `and(total_points.eq.${viewerPoints},total_xp.eq.${viewerXp},current_level.eq.${viewerLevel},user_id.lt.${viewerUserId})`,
    ].join(',');

    const { count: aheadCount, error: aheadCountError } = await supabase
      .from('gamification_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('gamification_enabled', true)
      .or(rankAheadFilter);

    if (aheadCountError) throw aheadCountError;

    const viewerRank = (aheadCount ?? 0) + 1;
    const startRank = Math.max(1, viewerRank - safeRadius);
    const endRank = viewerRank + safeRadius;

    const { data: viewerRowsRaw, error: viewerRowsError } = await orderedBaseQuery().range(startRank - 1, endRank - 1);
    if (viewerRowsError) throw viewerRowsError;

    const viewerRows = (viewerRowsRaw as GamificationProfileLeaderboardRow[]) ?? [];
    const allUserIds = Array.from(new Set([...topRows, ...viewerRows].map((row) => row.user_id)));
    const profileMap = await fetchProfileMap(allUserIds);

    return {
      data: {
        topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1, profileMap)),
        viewerRank,
        viewerEntries: viewerRows.map((row, index) =>
          toLeaderboardEntry(row, startRank + index, profileMap),
        ),
      },
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch leaderboard snapshot:', error);
    return {
      data: { topEntries: [], viewerRank: null, viewerEntries: [] },
      error: error instanceof Error ? error.message : 'Unable to load leaderboard.',
    };
  }
}
