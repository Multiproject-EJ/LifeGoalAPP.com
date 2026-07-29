import type { SpinPrize } from '../types/gamification';

export const ISLAND_THREE_JACKPOT_DICE = 2000;

export const ISLAND_THREE_JACKPOT_PRIZE: SpinPrize = {
  type: 'dice',
  value: ISLAND_THREE_JACKPOT_DICE,
  label: `${ISLAND_THREE_JACKPOT_DICE} Dice`,
  icon: '🎲',
  wheelSize: 'large',
  wheelWeight: 0,
  details: {
    rarity: 'mythic',
    island3Jackpot: true,
    guaranteed: true,
    ignoreMultiplier: true,
  },
};

export function isIslandThreeJackpotPrize(prize: SpinPrize): boolean {
  return prize.type === 'dice'
    && prize.value === ISLAND_THREE_JACKPOT_DICE
    && prize.details?.island3Jackpot === true;
}

export function buildDailySpinPrizePool(options: {
  basePrizes: readonly SpinPrize[];
  currentIslandNumber: number;
  islandThreeJackpotClaimed: boolean;
}): SpinPrize[] {
  const basePrizes = [...options.basePrizes];
  if (options.currentIslandNumber !== 3 || options.islandThreeJackpotClaimed) {
    return basePrizes;
  }
  return [...basePrizes, ISLAND_THREE_JACKPOT_PRIZE];
}

export function selectDailySpinPrize(
  prizes: readonly SpinPrize[],
  random: () => number = Math.random,
): SpinPrize {
  const guaranteedPrize = prizes.find(isIslandThreeJackpotPrize);
  if (guaranteedPrize) return guaranteedPrize;

  if (prizes.length === 0) {
    return { type: 'gold', value: 0, label: '0 Gold', icon: '🪙' };
  }

  const totalWeight = prizes.reduce(
    (sum, prize) => sum + Math.max(0, prize.wheelWeight ?? 1),
    0,
  );
  if (totalWeight <= 0) return prizes[0];

  const boundedRandom = Math.min(0.999999999, Math.max(0, random()));
  let roll = boundedRandom * totalWeight;
  for (const prize of prizes) {
    roll -= Math.max(0, prize.wheelWeight ?? 1);
    if (roll <= 0) return prize;
  }

  return prizes[0];
}
