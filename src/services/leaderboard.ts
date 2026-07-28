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
  level: number;
  combinedWealth: number;
}

export interface LeaderboardSnapshot {
  topEntries: LeaderboardEntry[];
  viewerRank: number | null;
  viewerEntries: LeaderboardEntry[];
}

export interface AdventureLeagueMembership {
  joined: boolean;
  joinedAt: string | null;
}

interface AdventureLeagueRow extends GamificationProfileLeaderboardRow {
  display_name: string | null;
  archetype: string | null;
  joined_at?: string | null;
}

interface FetchLeaderboardSnapshotOptions {
  viewerUserId: string;
  topLimit?: number;
  contextRadius?: number;
}

interface JoinAdventureLeagueOptions {
  viewerUserId: string;
  displayName: string;
  archetype: string;
  level: number;
  combinedJourneyXp: number;
}

const LEAGUE_TABLE = 'adventure_league_entries';
const LEAGUE_COLUMNS = 'user_id,display_name,archetype,combined_journey_level,combined_journey_xp,joined_at';
const emptySnapshot: LeaderboardSnapshot = { topEntries: [], viewerRank: null, viewerEntries: [] };

function getAdventureLeagueClient() {
  // The migration ships in this change; generated database.types will learn
  // the table after the remote schema is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

function cleanPublicLabel(value: string, fallback: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return normalized || fallback;
}

function toLeaderboardEntry(row: AdventureLeagueRow, rank: number): LeaderboardEntry {
  const { level, score } = toLeaderboardScore(row);
  return {
    rank,
    userId: row.user_id,
    playerName: cleanPublicLabel(row.display_name ?? '', 'Explorer', 60),
    archetype: cleanPublicLabel(row.archetype ?? '', 'Uncharted', 40),
    level,
    combinedWealth: score,
  };
}

function cloudUnavailableMessage(): string | null {
  if (!canUseSupabaseData()) return 'Adventure League requires an active Supabase session.';
  const availability = getFeatureAvailability('multiplayer', getServiceHealthManager().getSnapshot());
  return availability.status === 'available' ? null : availability.reason;
}

export async function fetchAdventureLeagueMembership(
  viewerUserId: string,
): Promise<{ data: AdventureLeagueMembership; error: string | null }> {
  const unavailable = cloudUnavailableMessage();
  if (unavailable) return { data: { joined: false, joinedAt: null }, error: unavailable };

  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await getAdventureLeagueClient()
      .from(LEAGUE_TABLE)
      .select('joined_at')
      .eq('user_id', viewerUserId)
      .maybeSingle();
    if (error) throw error;
    return {
      joined: Boolean(data),
      joinedAt: typeof data?.joined_at === 'string' ? data.joined_at : null,
    };
  });
  return result.ok
    ? { data: result.data, error: null }
    : { data: { joined: false, joinedAt: null }, error: result.error.explanation };
}

export async function joinAdventureLeague({
  viewerUserId,
  displayName,
  archetype,
  level,
  combinedJourneyXp,
}: JoinAdventureLeagueOptions): Promise<{ data: AdventureLeagueMembership; error: string | null }> {
  const unavailable = cloudUnavailableMessage();
  if (unavailable) return { data: { joined: false, joinedAt: null }, error: unavailable };

  const now = new Date().toISOString();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await getAdventureLeagueClient()
      .from(LEAGUE_TABLE)
      .upsert({
        user_id: viewerUserId,
        display_name: cleanPublicLabel(displayName, 'Explorer', 60),
        archetype: cleanPublicLabel(archetype, 'Uncharted', 40),
        combined_journey_level: Math.max(1, Math.floor(level)),
        combined_journey_xp: Math.max(0, Math.floor(combinedJourneyXp)),
        updated_at: now,
      }, { onConflict: 'user_id' })
      .select('joined_at')
      .single();
    if (error) throw error;
    return {
      joined: true,
      joinedAt: typeof data?.joined_at === 'string' ? data.joined_at : now,
    };
  });
  return result.ok
    ? { data: result.data, error: null }
    : { data: { joined: false, joinedAt: null }, error: result.error.explanation };
}

export async function leaveAdventureLeague(
  viewerUserId: string,
): Promise<{ left: boolean; error: string | null }> {
  const unavailable = cloudUnavailableMessage();
  if (unavailable) return { left: false, error: unavailable };

  const result = await guardedCloudCall('database', async () => {
    const { error } = await getAdventureLeagueClient()
      .from(LEAGUE_TABLE)
      .delete()
      .eq('user_id', viewerUserId);
    if (error) throw error;
    return true;
  });
  return result.ok
    ? { left: true, error: null }
    : { left: false, error: result.error.explanation };
}

export async function refreshAdventureLeagueEntry(
  options: JoinAdventureLeagueOptions,
): Promise<{ refreshed: boolean; error: string | null }> {
  const membership = await fetchAdventureLeagueMembership(options.viewerUserId);
  if (membership.error || !membership.data.joined) {
    return { refreshed: false, error: membership.error };
  }
  const joined = await joinAdventureLeague(options);
  return { refreshed: joined.data.joined, error: joined.error };
}

export async function fetchLeaderboardSnapshot({
  viewerUserId,
  topLimit = 50,
  contextRadius = 10,
}: FetchLeaderboardSnapshotOptions): Promise<{ data: LeaderboardSnapshot; error: string | null }> {
  const unavailable = cloudUnavailableMessage();
  if (unavailable) return { data: emptySnapshot, error: unavailable };

  const result = await guardedCloudCall('database', async () => {
    const safeTopLimit = Math.max(1, Math.min(topLimit, 100));
    const safeRadius = Math.max(1, Math.min(contextRadius, 20));
    const supabase = getAdventureLeagueClient();
    const orderedBaseQuery = () =>
      supabase
        .from(LEAGUE_TABLE)
        .select(LEAGUE_COLUMNS)
        .order('combined_journey_xp', { ascending: false })
        .order('combined_journey_level', { ascending: false })
        .order('user_id', { ascending: true });

    const { data: topRowsRaw, error: topRowsError } = await orderedBaseQuery().range(0, safeTopLimit - 1);
    if (topRowsError) throw topRowsError;
    const topRows = (topRowsRaw as AdventureLeagueRow[]) ?? [];

    const { data: viewerRowRaw, error: viewerRowError } = await supabase
      .from(LEAGUE_TABLE)
      .select(LEAGUE_COLUMNS)
      .eq('user_id', viewerUserId)
      .maybeSingle();
    if (viewerRowError) throw viewerRowError;
    if (!viewerRowRaw) {
      return {
        topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1)),
        viewerRank: null,
        viewerEntries: [],
      } satisfies LeaderboardSnapshot;
    }

    const viewerRow = viewerRowRaw as AdventureLeagueRow;
    const rankAheadFilter = buildRankAheadFilter(toLeaderboardScore(viewerRow), viewerUserId);
    const { count: aheadCount, error: aheadCountError } = await supabase
      .from(LEAGUE_TABLE)
      .select('user_id', { count: 'exact', head: true })
      .or(rankAheadFilter);
    if (aheadCountError) throw aheadCountError;

    const viewerRank = (aheadCount ?? 0) + 1;
    const startRank = Math.max(1, viewerRank - safeRadius);
    const endRank = viewerRank + safeRadius;
    const { data: viewerRowsRaw, error: viewerRowsError } = await orderedBaseQuery().range(startRank - 1, endRank - 1);
    if (viewerRowsError) throw viewerRowsError;
    const viewerRows = (viewerRowsRaw as AdventureLeagueRow[]) ?? [];

    return {
      topEntries: topRows.map((row, index) => toLeaderboardEntry(row, index + 1)),
      viewerRank,
      viewerEntries: viewerRows.map((row, index) => toLeaderboardEntry(row, startRank + index)),
    } satisfies LeaderboardSnapshot;
  });

  return result.ok
    ? { data: result.data, error: null }
    : { data: emptySnapshot, error: result.error.explanation };
}
