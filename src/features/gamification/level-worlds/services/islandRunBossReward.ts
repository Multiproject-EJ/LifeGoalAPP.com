import { resolveExpansionEconomyIslandNumber } from './islandRunExpansionPacks';
import { applyDriftCurrentToReward, resolveDriftCurrent } from './islandRunDriftVoyage';

export interface IslandRunBossReward {
  dice: number;
  essence: number;
  spinTokens: number;
}

export const ISLAND_CLEAR_DICE_START = 50;
export const ISLAND_CLEAR_DICE_STEP = 5;
export const ISLAND_CLEAR_DICE_ISLANDS_PER_STEP = 5;
export const ISLAND_CLEAR_DICE_CAP = 120;

/**
 * Island-clear dice: 50 on Islands 1-5, then +5 every five islands
 * (55, 60, 65 ... ) up to a cap of 120, reached on Island 71.
 */
export function getIslandRunIslandClearDice(islandNumber: number): number {
  const safeIslandNumber = Math.max(1, Math.floor(islandNumber));
  const steps = Math.floor((safeIslandNumber - 1) / ISLAND_CLEAR_DICE_ISLANDS_PER_STEP);
  return Math.min(ISLAND_CLEAR_DICE_CAP, ISLAND_CLEAR_DICE_START + steps * ISLAND_CLEAR_DICE_STEP);
}

/**
 * Shared deterministic boss payout used by both legacy trials and arenas.
 * On a Drift Voyage (cycle 1+) the island's drift current adds its bonus.
 */
export function getIslandRunBossReward(islandNumber: number, options?: { cycleIndex?: number }): IslandRunBossReward {
  // Expansion-pack islands pay like the main island at the same position.
  const safeIslandNumber = Math.max(1, Math.floor(resolveExpansionEconomyIslandNumber(islandNumber)));
  const tier = Math.floor((safeIslandNumber - 1) / 10);
  return applyDriftCurrentToReward({
    dice: getIslandRunIslandClearDice(safeIslandNumber),
    essence: 80 + tier * 25,
    spinTokens: tier >= 2 ? 1 : 0,
  }, resolveDriftCurrent(options?.cycleIndex ?? 0, safeIslandNumber));
}
