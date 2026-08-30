import {
  sanitizeVaultRushClaimsByIsland,
  type VaultRushClaimsByIsland,
} from './islandRunVaultRush';
import type { IslandRunSignatureMissionProgressByIsland } from './islandRunSignatureMissions';

export const VAULT_ISLAND_UNLOCK_MISSION_ID = 'broken-causeway' as const;

export const VAULT_ISLAND_COLLECTION_TREASURE_IDS = [
  'crown',
  'compass',
  'obelisk',
  'egg',
  'hourglass',
  'key',
  'medallion',
  'chalice',
] as const;

export type VaultIslandCollectionTreasureId = typeof VAULT_ISLAND_COLLECTION_TREASURE_IDS[number];

export interface VaultIslandCollectionEntry {
  treasureId: VaultIslandCollectionTreasureId;
  sourceIslandNumber: number;
  accessionNumber: string;
}

export interface VaultIslandCollectionResolution {
  entries: VaultIslandCollectionEntry[];
  unlockedTreasureIds: VaultIslandCollectionTreasureId[];
  qualifyingIslandNumbers: number[];
  unlockedCount: number;
  collectionSize: number;
  remainingCount: number;
  nextTreasureId: VaultIslandCollectionTreasureId | null;
}

export type VaultIslandWealthTier = 'empty' | 'starter' | 'growing' | 'abundant' | 'legendary';

function formatVaultIslandAccessionNumber(
  sourceIslandNumber: number,
  collectionIndex: number,
): string {
  return `VI-${String(sourceIslandNumber).padStart(3, '0')}-${String(collectionIndex + 1).padStart(2, '0')}`;
}

export interface VaultIslandWealthDisplay {
  holdingsValue: number;
  tier: VaultIslandWealthTier;
  ingotsPerStack: number;
  looseCoinCount: number;
  stackGemCount: number;
  looseGemCount: number;
}

export function isVaultIslandCollectionUnlocked(
  missionProgressByIsland: IslandRunSignatureMissionProgressByIsland | null | undefined,
): boolean {
  return Object.values(missionProgressByIsland ?? {}).some((progress) => (
    progress.missionId === VAULT_ISLAND_UNLOCK_MISSION_ID
    && progress.completedAtMs !== null
  ));
}

export function resolveVaultIslandWealthDisplay(holdingsValue: unknown): VaultIslandWealthDisplay {
  const normalizedHoldings = typeof holdingsValue === 'number' && Number.isFinite(holdingsValue)
    ? Math.max(0, Math.floor(holdingsValue))
    : 0;
  if (normalizedHoldings === 0) {
    return { holdingsValue: 0, tier: 'empty', ingotsPerStack: 0, looseCoinCount: 0, stackGemCount: 0, looseGemCount: 0 };
  }
  if (normalizedHoldings < 500) {
    return { holdingsValue: normalizedHoldings, tier: 'starter', ingotsPerStack: 4, looseCoinCount: 10, stackGemCount: 0, looseGemCount: 1 };
  }
  if (normalizedHoldings < 2_500) {
    return { holdingsValue: normalizedHoldings, tier: 'growing', ingotsPerStack: 10, looseCoinCount: 24, stackGemCount: 2, looseGemCount: 4 };
  }
  if (normalizedHoldings < 10_000) {
    return { holdingsValue: normalizedHoldings, tier: 'abundant', ingotsPerStack: 18, looseCoinCount: 42, stackGemCount: 4, looseGemCount: 8 };
  }
  return { holdingsValue: normalizedHoldings, tier: 'legendary', ingotsPerStack: 28, looseCoinCount: 64, stackGemCount: 7, looseGemCount: 12 };
}

/**
 * Projects the canonical Vault Rush ledger into presentation-only museum ownership.
 * One distinct island with a successful claim unlocks one relic; repeat claims on
 * that island remain part of the existing Vault Rush economy only.
 */
export function resolveVaultIslandCollection(
  claimsByIsland: VaultRushClaimsByIsland | null | undefined,
): VaultIslandCollectionResolution {
  const sanitizedClaims = sanitizeVaultRushClaimsByIsland(claimsByIsland);
  const qualifyingIslandNumbers = Object.keys(sanitizedClaims)
    .map(Number)
    .filter((islandNumber) => Number.isInteger(islandNumber) && islandNumber > 0)
    .sort((left, right) => left - right);
  const entries = qualifyingIslandNumbers
    .slice(0, VAULT_ISLAND_COLLECTION_TREASURE_IDS.length)
    .map((sourceIslandNumber, index) => ({
      treasureId: VAULT_ISLAND_COLLECTION_TREASURE_IDS[index],
      sourceIslandNumber,
      accessionNumber: formatVaultIslandAccessionNumber(sourceIslandNumber, index),
    }));
  const unlockedTreasureIds = entries.map((entry) => entry.treasureId);
  const unlockedCount = unlockedTreasureIds.length;

  return {
    entries,
    unlockedTreasureIds,
    qualifyingIslandNumbers,
    unlockedCount,
    collectionSize: VAULT_ISLAND_COLLECTION_TREASURE_IDS.length,
    remainingCount: VAULT_ISLAND_COLLECTION_TREASURE_IDS.length - unlockedCount,
    nextTreasureId: VAULT_ISLAND_COLLECTION_TREASURE_IDS[unlockedCount] ?? null,
  };
}

export function findNewVaultIslandCollectionEntry(
  previousClaimsByIsland: VaultRushClaimsByIsland | null | undefined,
  nextClaimsByIsland: VaultRushClaimsByIsland | null | undefined,
): VaultIslandCollectionEntry | null {
  const previousTreasureIds = new Set(
    resolveVaultIslandCollection(previousClaimsByIsland).unlockedTreasureIds,
  );
  return resolveVaultIslandCollection(nextClaimsByIsland).entries.find(
    (entry) => !previousTreasureIds.has(entry.treasureId),
  ) ?? null;
}
