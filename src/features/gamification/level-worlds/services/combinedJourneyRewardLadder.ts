/**
 * Combined Journey Level — deterministic reward ladder (R4).
 *
 * Each threshold chest grants exactly ONE reward. The mapping is a pure function
 * of the threshold level so it is fully recomputable and not client-chosen.
 *
 * IMPORTANT: this table is mirrored exactly by the SQL claim RPC
 * (latest: supabase/migrations/0261_combined_journey_reward_ladder_capacity.sql),
 * which is the server-authoritative source for what gets recorded/granted. Keep
 * the two in lockstep; the math is intentionally simple integer arithmetic so the
 * mirror is exact. The TS copy is used for client-side previews and the runtime
 * grant switch.
 *
 * All four reward kinds are live: reroll-capacity (every 5 levels) takes
 * priority, then eggs (every 3), then dice (even) / essence (odd).
 */

export type JourneyRewardKind = 'dice' | 'essence' | 'egg' | 'reroll_capacity';

export type JourneyChestReward = {
  kind: JourneyRewardKind;
  amount: number;
};

/** Reward amounts grow one band every 5 levels. */
export function journeyRewardBand(thresholdLevel: number): number {
  const level = Math.max(1, Math.floor(thresholdLevel));
  return Math.floor(level / 5);
}

/** Each reroll-capacity milestone permanently raises max dice by this much. */
export const REROLL_CAPACITY_STEP = 5;

/**
 * Resolve the single reward for a given threshold level. Mirrors the SQL RPC,
 * in priority order: multiples of 5 grant a reroll-capacity upgrade; else
 * multiples of 3 grant an egg; else even thresholds grant dice and odd
 * thresholds grant essence.
 */
export function resolveJourneyChestReward(thresholdLevel: number): JourneyChestReward {
  const level = Math.max(1, Math.floor(thresholdLevel));
  const band = journeyRewardBand(level);
  if (level % 5 === 0) {
    return { kind: 'reroll_capacity', amount: REROLL_CAPACITY_STEP };
  }
  if (level % 3 === 0) {
    return { kind: 'egg', amount: 1 };
  }
  if (level % 2 === 0) {
    return { kind: 'dice', amount: 10 + 5 * band };
  }
  return { kind: 'essence', amount: 5 + 3 * band };
}
