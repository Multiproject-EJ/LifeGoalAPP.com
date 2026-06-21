/**
 * Combined Journey Level — claimable chest view model (R5).
 *
 * Pure helper that decides which threshold chest (if any) is currently
 * claimable, given the derived level and the set of already-claimed thresholds.
 * Presentational only; the actual grant goes through the server-authoritative
 * claim action. Chests are claimed oldest-first so the user never skips rewards.
 */

import { resolveJourneyChestReward } from './combinedJourneyRewardLadder';

/** The lowest unlocked threshold whose chest has not yet been claimed. */
export const FIRST_CHEST_THRESHOLD = 2;

export type JourneyChestClaimViewModel = {
  /** Threshold level the user can claim now, or null when nothing is claimable. */
  claimableThreshold: number | null;
  /** Short reward preview, e.g. "10 dice". Empty when nothing is claimable. */
  rewardPreviewLabel: string;
  /** Call-to-action label for the chest button. */
  ctaLabel: string;
};

export interface BuildJourneyChestClaimInput {
  /** Whether the rewards feature is enabled. */
  enabled: boolean;
  /** Current derived Combined Journey Level. */
  level: number;
  /** Threshold levels already claimed (any order). */
  claimedThresholds: Iterable<number>;
  /**
   * Launch baseline: chests are only offered for thresholds strictly above this
   * level, so existing players don't receive chests for pre-launch progress.
   * Omit (or undefined) to offer from the first threshold.
   */
  baselineLevel?: number;
}

function describeReward(thresholdLevel: number): string {
  const reward = resolveJourneyChestReward(thresholdLevel);
  return `${reward.amount} ${reward.kind}`;
}

export function buildJourneyChestClaim(input: BuildJourneyChestClaimInput): JourneyChestClaimViewModel {
  const empty: JourneyChestClaimViewModel = {
    claimableThreshold: null,
    rewardPreviewLabel: '',
    ctaLabel: 'No chest ready',
  };

  if (!input.enabled) return empty;

  const level = Math.floor(input.level);
  if (!Number.isFinite(level) || level < FIRST_CHEST_THRESHOLD) return empty;

  const claimed = new Set<number>();
  for (const threshold of input.claimedThresholds) {
    if (Number.isFinite(threshold)) claimed.add(Math.floor(threshold));
  }

  // Only offer chests above the launch baseline (pre-launch thresholds are skipped).
  const baseline = Number.isFinite(input.baselineLevel) ? Math.max(0, Math.floor(input.baselineLevel as number)) : 0;
  const firstThreshold = Math.max(FIRST_CHEST_THRESHOLD, baseline + 1);

  for (let threshold = firstThreshold; threshold <= level; threshold += 1) {
    if (!claimed.has(threshold)) {
      return {
        claimableThreshold: threshold,
        rewardPreviewLabel: describeReward(threshold),
        ctaLabel: `Claim Lv ${threshold} chest`,
      };
    }
  }

  return empty;
}
