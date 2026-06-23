/**
 * Rank progress view — derives "progress toward the next rank" in XP terms.
 *
 * The rank model keys off level only (it stays agnostic of any XP curve). The
 * header bar, however, wants to show real XP toward the next rank
 * ("6,230 / 10,000 XP"), which needs the progression XP curve. To avoid coupling
 * the pure rank model to the game's XP curve, the cumulative-XP function is
 * injected by the caller (App passes `cumulativeXpForLevel` from
 * combinedJourneyLevel.ts).
 */

import { rankForLevel, nextRankForLevel, type RankDefinition } from './rankModel';

export interface RankProgressView {
  /** Rank currently held. */
  current: RankDefinition;
  /** Next rank to earn, or null at max rank. */
  next: RankDefinition | null;
  /** XP accumulated inside the current rank band. */
  xpIntoRank: number;
  /** Total XP span of the current rank band (>= 1). */
  xpForRank: number;
  /** XP still required to reach the next rank (0 at max rank). */
  xpRemaining: number;
  /** Fill toward the next rank, 0..100 (100 at max rank). */
  percent: number;
}

export function buildRankProgressView(params: {
  level: number;
  xp: number;
  cumulativeXpForLevel: (level: number) => number;
}): RankProgressView {
  const { level, xp, cumulativeXpForLevel } = params;
  const current = rankForLevel(level);
  const next = nextRankForLevel(level);

  if (!next) {
    return { current, next: null, xpIntoRank: 0, xpForRank: 1, xpRemaining: 0, percent: 100 };
  }

  const bandStartXp = cumulativeXpForLevel(current.minLevel);
  const bandEndXp = cumulativeXpForLevel(next.minLevel);
  const xpForRank = Math.max(1, bandEndXp - bandStartXp);
  const xpIntoRank = Math.min(xpForRank, Math.max(0, Math.round(xp - bandStartXp)));
  const xpRemaining = Math.max(0, Math.round(bandEndXp - xp));
  const percent = Math.min(100, Math.max(0, Math.round((xpIntoRank / xpForRank) * 100)));

  return { current, next, xpIntoRank, xpForRank, xpRemaining, percent };
}
