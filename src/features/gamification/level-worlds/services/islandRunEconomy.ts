export const ISLAND_RUN_BASE_DICE_PER_HEART = 20;

export type IslandRunConversionTier = {
  minIsland: number;
  dicePerHeart: number;
};

export const ISLAND_RUN_CONVERSION_TIERS: IslandRunConversionTier[] = [
  { minIsland: 1, dicePerHeart: 20 },
  { minIsland: 5, dicePerHeart: 30 },
  { minIsland: 10, dicePerHeart: 40 },
  { minIsland: 15, dicePerHeart: 50 },
];

export function getDicePerHeartForIsland(islandNumber: number): number {
  const safeIsland = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;

  let dicePerHeart = ISLAND_RUN_BASE_DICE_PER_HEART;

  for (const tier of ISLAND_RUN_CONVERSION_TIERS) {
    if (safeIsland >= tier.minIsland) {
      dicePerHeart = tier.dicePerHeart;
    }
  }

  return dicePerHeart;
}

export function convertHeartToDicePool(islandNumber: number): number {
  return getDicePerHeartForIsland(islandNumber);
}
