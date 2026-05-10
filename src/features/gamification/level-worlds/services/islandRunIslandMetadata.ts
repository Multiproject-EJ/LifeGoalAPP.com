/**
 * Central Island Run island classification metadata.
 *
 * Lucky Roll will use `luckyRollTrigger` during a later island-travel slice to
 * decide whether a pre-island reward board should launch. This service is
 * metadata-only: it does not launch Lucky Roll, persist Lucky Roll sessions, or
 * change travel behavior.
 *
 * Compatibility note: the gameplay contract describes rare islands as every
 * 10th island, while the current board-tile implementation only treats the
 * canonical special islands that are divisible by 10 as `rare` (30/60/90/120).
 * This service preserves that existing runtime behavior until product resolves
 * the schedule discrepancy.
 */

export type IslandRunIslandRarity = 'normal' | 'seasonal' | 'rare';
export type IslandRunLuckyRollTrigger = 'none' | 'pre_island';

export interface IslandRunIslandMetadata {
  islandNumber: number;
  rarity: IslandRunIslandRarity;
  isSpecial: boolean;
  isMilestone: boolean;
  luckyRollTrigger: IslandRunLuckyRollTrigger;
  luckyRollConfigId?: string;
}

export const ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS = [
  5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120,
] as const;

const SPECIAL_ISLAND_NUMBERS = new Set<number>(ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS);
const ISLAND_RUN_MILESTONE_INTERVAL = 10;
const LUCKY_ROLL_RARE_CONFIG_ID = 'rare_island_pre_island_v1';

function normalizeIslandNumber(islandNumber: number): number {
  if (!Number.isFinite(islandNumber)) return 1;
  return Math.max(1, Math.floor(islandNumber));
}

export function getIslandRunRarity(islandNumber: number): IslandRunIslandRarity {
  const normalizedIslandNumber = normalizeIslandNumber(islandNumber);
  if (!SPECIAL_ISLAND_NUMBERS.has(normalizedIslandNumber)) return 'normal';
  if (normalizedIslandNumber % ISLAND_RUN_MILESTONE_INTERVAL === 0) return 'rare';
  return 'seasonal';
}

export function getIslandRunIslandMetadata(islandNumber: number): IslandRunIslandMetadata {
  const normalizedIslandNumber = normalizeIslandNumber(islandNumber);
  const rarity = getIslandRunRarity(normalizedIslandNumber);
  const isSpecial = rarity !== 'normal';
  const isMilestone = normalizedIslandNumber % ISLAND_RUN_MILESTONE_INTERVAL === 0;
  const luckyRollTrigger: IslandRunLuckyRollTrigger = rarity === 'rare' ? 'pre_island' : 'none';

  return {
    islandNumber: normalizedIslandNumber,
    rarity,
    isSpecial,
    isMilestone,
    luckyRollTrigger,
    ...(luckyRollTrigger === 'pre_island' ? { luckyRollConfigId: LUCKY_ROLL_RARE_CONFIG_ID } : {}),
  };
}

export function isLuckyRollIsland(islandNumber: number): boolean {
  return getIslandRunIslandMetadata(islandNumber).luckyRollTrigger === 'pre_island';
}
