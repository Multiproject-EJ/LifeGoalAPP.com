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

import {
  getRankById,
  isRankServiceEligible,
  nextRankForLevel,
  rankForLevel,
  rankForLevelAndService,
  serviceEligibilityDate,
  type RankDefinition,
} from './rankModel';

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
  /** True when XP is sufficient but registered service time is still required. */
  serviceLocked: boolean;
  /** Required registered service years for the next rank, when applicable. */
  serviceRequirementYears: number | null;
  /** ISO date when the service requirement becomes eligible, if an account exists. */
  serviceEligibleAt: string | null;
}

export function buildRankProgressView(params: {
  level: number;
  xp: number;
  cumulativeXpForLevel: (level: number) => number;
  /** Undefined preserves the level-only legacy calculation; null means local guest/no registered service. */
  accountCreatedAt?: string | null;
  nowMs?: number;
}): RankProgressView {
  const { level, xp, cumulativeXpForLevel } = params;
  const serviceAware = Object.prototype.hasOwnProperty.call(params, 'accountCreatedAt');
  const nowMs = params.nowMs ?? Date.now();
  const current = serviceAware
    ? rankForLevelAndService(level, params.accountCreatedAt, nowMs)
    : rankForLevel(level);
  const next = serviceAware
    ? getRankById(current.id + 1) ?? null
    : nextRankForLevel(level);

  if (!next) {
    return {
      current,
      next: null,
      xpIntoRank: 0,
      xpForRank: 1,
      xpRemaining: 0,
      percent: 100,
      serviceLocked: false,
      serviceRequirementYears: null,
      serviceEligibleAt: null,
    };
  }

  const bandStartXp = cumulativeXpForLevel(current.minLevel);
  const bandEndXp = cumulativeXpForLevel(next.minLevel);
  const xpForRank = Math.max(1, bandEndXp - bandStartXp);
  const xpIntoRank = Math.min(xpForRank, Math.max(0, Math.round(xp - bandStartXp)));
  const xpRemaining = Math.max(0, Math.round(bandEndXp - xp));
  const percent = Math.min(100, Math.max(0, Math.round((xpIntoRank / xpForRank) * 100)));
  const serviceLocked = serviceAware
    && !isRankServiceEligible(next, params.accountCreatedAt, nowMs);

  return {
    current,
    next,
    xpIntoRank,
    xpForRank,
    xpRemaining,
    percent,
    serviceLocked,
    serviceRequirementYears: next.minServiceYears ?? null,
    serviceEligibleAt: serviceEligibilityDate(next, params.accountCreatedAt),
  };
}
