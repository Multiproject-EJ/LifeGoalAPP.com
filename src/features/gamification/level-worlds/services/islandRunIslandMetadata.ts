/**
 * Central Island Run island classification metadata.
 *
 * Lucky Roll uses metadata-only trigger rules so product slices can decide
 * when to create/resume canonical sessions without coupling rule definition to
 * UI, travel, persistence, or reward-board logic. This service does not launch
 * Lucky Roll, persist Lucky Roll sessions, or change travel behavior.
 *
 * Compatibility note: the gameplay contract describes rare islands as every
 * 10th island, while the current board-tile implementation only treats the
 * canonical special islands that are divisible by 10 as `rare` (30/60/90/120).
 * This service preserves that existing runtime behavior until product resolves
 * the schedule discrepancy.
 */

export type IslandRunIslandRarity = 'normal' | 'seasonal' | 'rare';
export type IslandRunLuckyRollTrigger = 'none' | 'pre_island';
export type IslandRunPostRareLuckyRollTrigger = 'none' | 'post_rare_completion';

export interface IslandRunIslandMetadata {
  islandNumber: number;
  rarity: IslandRunIslandRarity;
  isSpecial: boolean;
  isMilestone: boolean;
  /**
   * Legacy dormant pre-island trigger metadata. This remains available for the
   * disabled pre-island foundation and is intentionally separate from the
   * production post-rare rule.
   */
  luckyRollTrigger: IslandRunLuckyRollTrigger;
  luckyRollConfigId?: string;
  /**
   * Production-direction rule foundation: after completing a rare island, the
   * player may receive a Lucky Roll bonus before continuing.
   */
  postRareLuckyRollTrigger: IslandRunPostRareLuckyRollTrigger;
  postRareLuckyRollConfigId?: string;
}

export interface IslandRunPostRareLuckyRollMetadata {
  islandNumber: number;
  rarity: 'rare';
  trigger: 'post_rare_completion';
  configId: string;
}

export const ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS = [
  5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120,
] as const;

const SPECIAL_ISLAND_NUMBERS = new Set<number>(ISLAND_RUN_CANONICAL_SPECIAL_ISLAND_NUMBERS);
const ISLAND_RUN_MILESTONE_INTERVAL = 10;
const LUCKY_ROLL_RARE_CONFIG_ID = 'rare_island_pre_island_v1';
const POST_RARE_LUCKY_ROLL_CONFIG_ID = 'rare_island_post_rare_completion_v1';

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
  const postRareLuckyRollTrigger: IslandRunPostRareLuckyRollTrigger = rarity === 'rare'
    ? 'post_rare_completion'
    : 'none';

  return {
    islandNumber: normalizedIslandNumber,
    rarity,
    isSpecial,
    isMilestone,
    luckyRollTrigger,
    postRareLuckyRollTrigger,
    ...(luckyRollTrigger === 'pre_island' ? { luckyRollConfigId: LUCKY_ROLL_RARE_CONFIG_ID } : {}),
    ...(postRareLuckyRollTrigger === 'post_rare_completion'
      ? { postRareLuckyRollConfigId: POST_RARE_LUCKY_ROLL_CONFIG_ID }
      : {}),
  };
}

export function isLuckyRollIsland(islandNumber: number): boolean {
  return getIslandRunIslandMetadata(islandNumber).luckyRollTrigger === 'pre_island';
}

export function isPostRareLuckyRollIsland(islandNumber: number): boolean {
  return getIslandRunIslandMetadata(islandNumber).postRareLuckyRollTrigger === 'post_rare_completion';
}

export function getPostRareLuckyRollMetadata(islandNumber: number): IslandRunPostRareLuckyRollMetadata | null {
  const metadata = getIslandRunIslandMetadata(islandNumber);
  if (metadata.postRareLuckyRollTrigger !== 'post_rare_completion' || metadata.rarity !== 'rare') return null;
  return {
    islandNumber: metadata.islandNumber,
    rarity: metadata.rarity,
    trigger: metadata.postRareLuckyRollTrigger,
    configId: metadata.postRareLuckyRollConfigId ?? POST_RARE_LUCKY_ROLL_CONFIG_ID,
  };
}
