import type { SpinAward, SpinPrize } from '../types/gamification';

export const DAILY_SPIN_DICE_REWARD_AMOUNTS = {
  minimum: 25,
  standard: 100,
  rare: 250,
  ultraRare: 500,
  islandThreeJackpot: 2000,
  treasureChest: 100,
  legendaryMystery: 250,
} as const;

type RandomSource = () => number;

/**
 * Super Slice jackpots, weighted. Values are before the reward boost.
 * Controller themes and other owned digital items can join this list once
 * the game can grant owned themes.
 */
export const DAILY_SPIN_SUPER_SLICE_OPTIONS: ReadonlyArray<{ weight: number; awards: readonly SpinAward[] }> = [
  { weight: 40, awards: [{ currency: 'dice', amount: 550, label: 'Dice', icon: '🎲' }] },
  { weight: 28, awards: [{ currency: 'essence', amount: 400, label: 'Money', icon: '💰' }] },
  {
    weight: 20,
    awards: [
      { currency: 'dice', amount: 300, label: 'Dice', icon: '🎲' },
      { currency: 'essence', amount: 200, label: 'Money', icon: '💰' },
      { currency: 'shards', amount: 20, label: 'Essence', icon: '🟣' },
    ],
  },
  { weight: 12, awards: [{ currency: 'dice', amount: 1000, label: 'Dice', icon: '🎲' }] },
];

function normalizeMultiplier(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

/**
 * Resolves the exact player-facing awards for a daily wheel prize.
 *
 * Keeping this policy pure lets the UI, persistence service, and regression
 * tests agree on one reward payload before any wallet is mutated.
 */
export function resolveDailySpinAwards(
  prize: SpinPrize,
  rewardMultiplier = 1,
  random: RandomSource = Math.random,
): SpinAward[] {
  const multiplier = prize.details?.ignoreMultiplier === true
    ? 1
    : normalizeMultiplier(rewardMultiplier);
  const scaledValue = Math.max(0, Math.floor(prize.value * multiplier));

  switch (prize.type) {
    case 'gold':
      return [{ currency: 'gold', amount: scaledValue, label: 'Gold', icon: '🪙' }];
    case 'essence':
      return [{ currency: 'essence', amount: scaledValue, label: 'Money', icon: '💰' }];
    case 'shards':
      return [{ currency: 'shards', amount: scaledValue, label: 'Essence', icon: '🟣' }];
    case 'dice':
      return [{ currency: 'dice', amount: scaledValue, label: 'Dice', icon: '🎲' }];
    case 'game_tokens':
      return [{ currency: 'game_tokens', amount: scaledValue, label: 'Game Tokens', icon: '🎟️' }];
    case 'treasure_chest':
      return [
        { currency: 'essence', amount: 20 * multiplier, label: 'Money', icon: '💰' },
        { currency: 'shards', amount: 3 * multiplier, label: 'Essence', icon: '🟣' },
        {
          currency: 'dice',
          amount: DAILY_SPIN_DICE_REWARD_AMOUNTS.treasureChest * multiplier,
          label: 'Dice',
          icon: '🎲',
        },
      ];
    case 'mystery': {
      const mysteryOptions: SpinAward[] = [
        { currency: 'essence', amount: 40 * multiplier, label: 'Money', icon: '💰' },
        { currency: 'shards', amount: 5 * multiplier, label: 'Essence', icon: '🟣' },
        {
          currency: 'dice',
          amount: DAILY_SPIN_DICE_REWARD_AMOUNTS.legendaryMystery * multiplier,
          label: 'Dice',
          icon: '🎲',
        },
        { currency: 'gold', amount: 50 * multiplier, label: 'Gold', icon: '🪙' },
      ];
      const boundedRandom = Math.min(0.999999999, Math.max(0, random()));
      return [mysteryOptions[Math.floor(boundedRandom * mysteryOptions.length)]];
    }
    case 'super': {
      const totalWeight = DAILY_SPIN_SUPER_SLICE_OPTIONS.reduce((sum, option) => sum + option.weight, 0);
      let roll = Math.min(0.999999999, Math.max(0, random())) * totalWeight;
      const option = DAILY_SPIN_SUPER_SLICE_OPTIONS.find((entry) => (roll -= entry.weight) < 0)
        ?? DAILY_SPIN_SUPER_SLICE_OPTIONS[0];
      return option.awards.map((award) => ({ ...award, amount: award.amount * multiplier }));
    }
    default:
      return [];
  }
}
