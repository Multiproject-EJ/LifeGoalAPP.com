export type TodayWinsTier = 'zero_star' | 'one_star' | 'two_star' | 'three_star';
export type TodayStarCount = 1 | 2 | 3;

export const getTodayWinsTier = (score: number): TodayWinsTier => {
  if (score >= 75) return 'three_star';
  if (score >= 40) return 'two_star';
  if (score > 0) return 'one_star';
  return 'zero_star';
};

export const getTodayWinsStarCount = (score: number): number => {
  const tier = getTodayWinsTier(score);
  if (tier === 'three_star') return 3;
  if (tier === 'two_star') return 2;
  if (tier === 'one_star') return 1;
  return 0;
};

export const getTodayStarUpgradeQueue = (
  previousHighest: number,
  currentStarCount: number,
): TodayStarCount[] => {
  const from = Math.max(0, Math.min(3, Math.floor(previousHighest)));
  const to = Math.max(0, Math.min(3, Math.floor(currentStarCount)));
  if (to <= from) return [];

  return Array.from({ length: to - from }, (_, index) => (from + index + 1) as TodayStarCount);
};
