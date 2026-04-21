import { getEggSellRewardOptions, type EggSellRewardChoice, type EggTier } from './eggService';

export interface IslandRunEggSellAdvisorInput {
  tier: EggTier;
  shardsBalance: number;
  diceBalance: number;
  nextStickerShardCost: number;
}

export interface IslandRunEggSellAdvisorResult {
  recommendedChoice: EggSellRewardChoice;
  reason: string;
}

/**
 * Recommends which egg-sell reward choice (shards vs dice) is better for the
 * player's immediate state.
 *
 * Priority:
 *  1) If shard choice would complete (or nearly complete) the next sticker
 *     threshold, prefer shards.
 *  2) If dice wallet is very low, prefer dice.
 *  3) Otherwise prefer shards for long-term progression.
 */
export function adviseEggSellChoice(input: IslandRunEggSellAdvisorInput): IslandRunEggSellAdvisorResult {
  const sellOptions = getEggSellRewardOptions(input.tier);
  const shardReward = sellOptions.find((entry) => entry.choice === 'shards')?.amount ?? 0;
  const diceReward = sellOptions.find((entry) => entry.choice === 'dice')?.amount ?? 0;

  const shardsBalance = Math.max(0, Math.floor(Number.isFinite(input.shardsBalance) ? input.shardsBalance : 0));
  const diceBalance = Math.max(0, Math.floor(Number.isFinite(input.diceBalance) ? input.diceBalance : 0));
  const nextStickerShardCost = Math.max(
    0,
    Math.floor(Number.isFinite(input.nextStickerShardCost) ? input.nextStickerShardCost : 0),
  );
  const shardGap = Math.max(0, nextStickerShardCost - shardsBalance);

  if (shardGap > 0 && shardGap <= shardReward) {
    return {
      recommendedChoice: 'shards',
      reason: `Shards will reach your next sticker threshold (${nextStickerShardCost}).`,
    };
  }

  if (diceBalance <= Math.max(10, diceReward)) {
    return {
      recommendedChoice: 'dice',
      reason: 'Dice are low right now, so the dice payout gives faster momentum.',
    };
  }

  return {
    recommendedChoice: 'shards',
    reason: 'Shards are recommended for long-term progression value.',
  };
}
