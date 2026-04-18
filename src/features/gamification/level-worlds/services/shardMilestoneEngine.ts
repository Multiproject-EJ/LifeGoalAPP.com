// Cumulative shard thresholds for each milestone tier (T1–T5), per docs/13_COLLECTIBLE_PROGRESS_BAR.md §3
// These are the TOTAL lifetime shard counts at which each tier milestone is reached:
// T1: 20 total shards, T2: 60 total, T3: 120 total, T4: 220 total, T5: 350 total.
export const SHARD_MILESTONE_THRESHOLDS = [20, 60, 120, 220, 350]; // cumulative lifetime shard totals per tier (0-indexed)

// T6 cumulative threshold and the +150 increment for every tier beyond T5 (docs §3b)
export const SHARD_EXTENDED_BASE_THRESHOLD = 500; // T6 = 500
export const SHARD_EXTENDED_TIER_INCREMENT = 150; // T7 = 650, T8 = 800, …

export const SHARD_EARN = {
  stop_complete: 2,   // completing any non-boss stop
  boss_defeat: 5,     // defeating the boss
  egg_open: 2,        // opening / hatching an egg
  body_habit: 1,      // completing a Body-tagged habit
} as const;
export type ShardEarnSource = keyof typeof SHARD_EARN;

/**
 * Returns the cumulative shard threshold required to reach the given tier.
 * T1–T5 (indices 0–4) are in SHARD_MILESTONE_THRESHOLDS.
 * T6+ follow the formula: 500 + (tierIndex − 5) × 150.
 * Per docs/13_COLLECTIBLE_PROGRESS_BAR.md §3.
 */
export function getShardTierThreshold(tierIndex: number): number {
  if (tierIndex < SHARD_MILESTONE_THRESHOLDS.length) return SHARD_MILESTONE_THRESHOLDS[tierIndex];
  return SHARD_EXTENDED_BASE_THRESHOLD + (tierIndex - SHARD_MILESTONE_THRESHOLDS.length) * SHARD_EXTENDED_TIER_INCREMENT;
}

/**
 * Given current shard state + shards to add, returns the new shard state.
 * island_shards is a global lifetime integer — it NEVER resets.
 * shard_tier_index does NOT auto-advance here; the player must claim the milestone
 * (M16E) to advance the tier. Returns shardMilestoneReached: true when
 * islandShards crosses the cumulative threshold for the current tier.
 * Per docs/13_COLLECTIBLE_PROGRESS_BAR.md §3 (M16C).
 */
export function computeShardEarn(
  current: { islandShards: number; shardTierIndex: number; shardClaimCount: number },
  shardsToAdd: number,
): { islandShards: number; shardTierIndex: number; shardClaimCount: number; shardMilestoneReached: boolean } {
  const islandShards = current.islandShards + shardsToAdd;
  const shardMilestoneReached = islandShards >= getShardTierThreshold(current.shardTierIndex);
  return {
    islandShards,
    shardTierIndex: current.shardTierIndex,
    shardClaimCount: current.shardClaimCount,
    shardMilestoneReached,
  };
}
