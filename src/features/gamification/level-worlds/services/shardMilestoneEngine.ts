// Shard cost to reach each milestone tier index (repeating chain)
// Per docs/13_COLLECTIBLE_PROGRESS_BAR.md canonical design
export const SHARD_MILESTONE_THRESHOLDS = [20, 60, 120, 220, 350]; // shards needed per tier (0-indexed)

export const SHARD_EARN = {
  egg_shard_tile: 1,  // landing on egg_shard tile
  stop_complete: 2,   // completing any non-boss stop
  boss_defeat: 5,     // defeating the boss
  egg_open: 2,        // opening / hatching an egg
} as const;
export type ShardEarnSource = keyof typeof SHARD_EARN;

/**
 * Given current shard state + shards to add, returns the new shard state.
 * Advances shardTierIndex when islandShards crosses the current tier threshold.
 * When the full chain is completed (all 5 tiers), resets islandShards to 0
 * and advances shardClaimCount by 1, then starts shardTierIndex from 0 again.
 */
export function computeShardEarn(
  current: { islandShards: number; shardTierIndex: number; shardClaimCount: number },
  shardsToAdd: number,
): { islandShards: number; shardTierIndex: number; shardClaimCount: number; milestonesReached: number } {
  let { islandShards, shardTierIndex, shardClaimCount } = current;
  let milestonesReached = 0;

  islandShards += shardsToAdd;

  while (islandShards >= SHARD_MILESTONE_THRESHOLDS[shardTierIndex]) {
    islandShards -= SHARD_MILESTONE_THRESHOLDS[shardTierIndex];
    milestonesReached += 1;
    shardTierIndex += 1;

    if (shardTierIndex >= SHARD_MILESTONE_THRESHOLDS.length) {
      shardTierIndex = 0;
      shardClaimCount += 1;
    }
  }

  return { islandShards, shardTierIndex, shardClaimCount, milestonesReached };
}
