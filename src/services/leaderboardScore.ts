/**
 * Pure leaderboard scoring helpers.
 *
 * Kept free of any Supabase import so the ranking logic is unit-testable in
 * isolation. The leaderboard ranks by the Combined Journey Level — the
 * harmonized canonical progression metric (see combinedJourneyLevel.ts and the
 * player-rank-system-integration investigation §7).
 */

export interface GamificationProfileLeaderboardRow {
  user_id: string;
  combined_journey_level: number | null;
  combined_journey_xp: number | null;
}

export interface LeaderboardScore {
  level: number;
  score: number;
}

/** The canonical leaderboard score for a row. Pure and null-safe. */
export function toLeaderboardScore(row: GamificationProfileLeaderboardRow): LeaderboardScore {
  return {
    level: row.combined_journey_level ?? 1,
    score: row.combined_journey_xp ?? 0,
  };
}

/**
 * PostgREST `.or()` filter counting users ranked strictly ahead of the viewer,
 * matching the leaderboard ordering: Combined Journey XP, then level, then a
 * deterministic user_id tiebreaker.
 */
export function buildRankAheadFilter(viewer: LeaderboardScore, viewerUserId: string): string {
  return [
    `combined_journey_xp.gt.${viewer.score}`,
    `and(combined_journey_xp.eq.${viewer.score},combined_journey_level.gt.${viewer.level})`,
    `and(combined_journey_xp.eq.${viewer.score},combined_journey_level.eq.${viewer.level},user_id.lt.${viewerUserId})`,
  ].join(',');
}
