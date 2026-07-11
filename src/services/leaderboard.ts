import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  getFeatureAvailability,
  getServiceHealthManager,
  guardedCloudCall,
} from './service-health';
import {
  buildRankAheadFilter,
  toLeaderboardScore,
  type GamificationProfileLeaderboardRow,
} from './leaderboardScore';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  playerName: string;
  archetype: string;
  /** Displayed as the player's level — the Combined Journey Level. */
  level: number;
  /** The canonical leaderboard score — Combined Journey XP. */
  combinedWealth: number;
}

export interface LeaderboardSnapshot {
  topEntries: LeaderboardEntry[];
  viewerRank: number | null;
  viewerEntries: LeaderboardEntry[];
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

const LEADERBOARD_COLUMNS = 'user_id,combined_journey_level,combined_journey_xp';

function toLeaderboardEntry(
  row: GamificationProfileLeaderboardRow,
  rank: number,
  profileByUserId: Map<string, ProfileLeaderboardRow>,
): LeaderboardEntry {
  const profile = profileByUserId.get(row.user_id);
  const { level, score } = toLeaderboardScore(row);

  return {
    rank,
    userId: row.user_id,
    playerName: profile?.display_name?.trim() || 'Player',
    archetype: profile?.personality_profile_type?.trim() || 'Unknown',
    level,
    combinedWealth: score,
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
  const emptySnapshot: LeaderboardSnapshot = { topEntries: [], viewerRank: null, viewerEntries: [] };

  if (!canUseSupabaseData()) {
    return { data: emptySnapshot, error: 'Leaderboard requires an active Supabase session.' };
  }

  const availability = getFeatureAvailability('multiplayer', getServiceHealthManager().getSnapshot());
  if (availability.status !== 'available') {
    return { data: emptySnapshot, error: availability.reason };
  }

  const result = await guardedCloudCall('database', async () => {
    const safeTopLimit = Math.max(1, Math.min(topLimit, 100));
    const safeRadius = Math.max(1, Math.min(contextRadius, 20));
    const supabase = getSupabaseClient();

    const orderedBaseQuery = () =>
      supabase
        .from('gamification_profiles')
        .select(LEADERBOARD_COLUMNS)
        .eq('gamification_enabled', true)
        .order('combined_journey_xp', { ascending: false })
        .order('combined_journey_level', { ascending: false })
        .order('user_id', { ascending: true });

    const { data: topRowsRaw, error: topRowsError } = await orderedBaseQuery().range(0, safeTopLimit - 1);
    if (topRowsError) throw topRowsError;
    const topRows = (topRowsRaw as GamificationProfileLeaderboardRow[]) ?? [];

    const { data: viewerRowRaw, error: viewerRowError } = await supabase
      .from('gamification_profiles')
      .select(LEADERBOARD_COLUMNS)
      .eq('user_id', viewerUserId)
      .eq('gamification_enabled', true)
      .maybeSingle();
    if (viewerRowError) throw viewerRowError;

    if (!viewerRowRaw) {
      const profileMap = await fetchProfileMap(topRows.map((row) => row.user_id));
      return {
        topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1, profileMap)),
        viewerRank: null,
        viewerEntries: [],
      } satisfies LeaderboardSnapshot;
    }

    const viewerRow = viewerRowRaw as GamificationProfileLeaderboardRow;
    const viewerScore = toLeaderboardScore(viewerRow);
    const rankAheadFilter = buildRankAheadFilter(viewerScore, viewerUserId);

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
      topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1, profileMap)),
      viewerRank,
      viewerEntries: viewerRows.map((row, index) =>
        toLeaderboardEntry(row, startRank + index, profileMap),
      ),
    } satisfies LeaderboardSnapshot;
  });

  if (!result.ok) {
    // Translated explanation only — raw provider text never reaches the UI.
    return { data: emptySnapshot, error: result.error.explanation };
  }
  return { data: result.data, error: null };
}
