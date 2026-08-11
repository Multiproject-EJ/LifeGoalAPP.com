export interface IslandRunBossReward {
  dice: number;
  essence: number;
  spinTokens: number;
}

/** Shared deterministic boss payout used by both legacy trials and arenas. */
export function getIslandRunBossReward(islandNumber: number): IslandRunBossReward {
  const safeIslandNumber = Math.max(1, Math.floor(islandNumber));
  const tier = Math.floor((safeIslandNumber - 1) / 10);
  return {
    dice: 10 + tier * 2,
    essence: 80 + tier * 25,
    spinTokens: tier >= 2 ? 1 : 0,
  };
}
