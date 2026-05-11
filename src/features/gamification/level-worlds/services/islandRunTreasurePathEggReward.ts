import type { EggTier } from './eggService';

export const TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR = 500;
export const TREASURE_PATH_RARE_EGG_THRESHOLD = 5;

export type TreasurePathEggTier = Extract<EggTier, 'common' | 'rare'>;

export interface TreasurePathEggRewardInput {
  sessionKey: string;
  runId: string;
  tileId: number;
  rewardId: string;
  cycleIndex: number;
  targetIslandNumber: number;
}

export interface TreasurePathEggRewardOutcome {
  eggTier: TreasurePathEggTier;
  eggRarity: TreasurePathEggTier;
  rarityRoll: number;
  rarityRollDenominator: typeof TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR;
  rarityThreshold: typeof TREASURE_PATH_RARE_EGG_THRESHOLD;
  eggSeed: number;
}

function normalizeString(value: string): string {
  return value.trim();
}

function normalizeInteger(value: number, minimum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.floor(value));
}

function stableHashToUint32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildTreasurePathEggSeedMaterial(input: TreasurePathEggRewardInput): string {
  return [
    'island-run-treasure-path-egg-v1',
    `sessionKey=${normalizeString(input.sessionKey)}`,
    `runId=${normalizeString(input.runId)}`,
    `tileId=${normalizeInteger(input.tileId, 0)}`,
    `rewardId=${normalizeString(input.rewardId)}`,
    `cycleIndex=${normalizeInteger(input.cycleIndex, 0)}`,
    `targetIslandNumber=${normalizeInteger(input.targetIslandNumber, 1)}`,
  ].join('|');
}

export function resolveTreasurePathEggTierFromRoll(rarityRoll: number): TreasurePathEggTier {
  const normalizedRoll = normalizeInteger(rarityRoll, 0) % TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR;
  return normalizedRoll < TREASURE_PATH_RARE_EGG_THRESHOLD ? 'rare' : 'common';
}

export function resolveTreasurePathEggRewardOutcome(
  input: TreasurePathEggRewardInput,
): TreasurePathEggRewardOutcome {
  const seedMaterial = buildTreasurePathEggSeedMaterial(input);
  const rarityRoll = stableHashToUint32(`${seedMaterial}|rarity`) % TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR;
  const eggTier = resolveTreasurePathEggTierFromRoll(rarityRoll);

  return {
    eggTier,
    eggRarity: eggTier,
    rarityRoll,
    rarityRollDenominator: TREASURE_PATH_EGG_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: TREASURE_PATH_RARE_EGG_THRESHOLD,
    eggSeed: stableHashToUint32(`${seedMaterial}|egg-seed`),
  };
}
