/**
 * Combined Journey Level — deterministic reward ladder (R4).
 *
 * Each threshold chest grants exactly ONE reward. The mapping is a pure function
 * of the threshold level so it is fully recomputable and not client-chosen.
 *
 * IMPORTANT: this table is mirrored exactly by the SQL claim RPC
 * (supabase/migrations/0258_combined_journey_reward_claim_rpc.sql), which is the
 * server-authoritative source for what gets recorded/granted. Keep the two in
 * lockstep; the math is intentionally simple integer arithmetic so the mirror is
 * exact. The TS copy is used for client-side previews and the runtime grant
 * switch.
 *
 * R4 ships dice + essence (simple currency grants), proving the end-to-end
 * idempotent claim pipeline. Eggs and reroll-capacity upgrades are added in a
 * later slice (the ledger CHECK already allows those kinds).
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

/**
 * Resolve the single reward for a given threshold level. Mirrors the SQL RPC:
 * even thresholds grant dice, odd thresholds grant essence.
 */
export function resolveJourneyChestReward(thresholdLevel: number): JourneyChestReward {
  const level = Math.max(1, Math.floor(thresholdLevel));
  const band = journeyRewardBand(level);
  if (level % 2 === 0) {
    return { kind: 'dice', amount: 10 + 5 * band };
  }
  return { kind: 'essence', amount: 5 + 3 * band };
}
