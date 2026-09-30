import { sanitizeVaultRushClaimsByIsland, } from './islandRunVaultRush.mjs';
import { CELESTIAL_REDOCKING_ROLL_TARGET, } from './islandRunSignatureMissions';
import { usesOpeningGamesCampaign } from './islandRunOpeningGames';
export const VAULT_ISLAND_UNLOCK_MISSION_ID = 'broken-causeway';
export const VAULT_ISLAND_COLLECTION_TREASURE_IDS = [
    'crown',
    'compass',
    'obelisk',
    'egg',
    'hourglass',
    'key',
    'medallion',
    'chalice',
];
function formatVaultIslandAccessionNumber(sourceIslandNumber, collectionIndex) {
    return `VI-${String(sourceIslandNumber).padStart(3, '0')}-${String(collectionIndex + 1).padStart(2, '0')}`;
}
export function isVaultIslandCollectionUnlocked(missionProgressByIsland) {
    const ledger = missionProgressByIsland ?? {};
    const hasLegacyUnlock = Object.values(ledger).some((progress) => (progress.missionId === VAULT_ISLAND_UNLOCK_MISSION_ID
        && typeof progress.completedAtMs === 'number'
        && Number.isFinite(progress.completedAtMs)
        && progress.completedAtMs >= 0));
    if (hasLegacyUnlock)
        return true;
    if (!usesOpeningGamesCampaign(ledger))
        return false;
    // A later island number is not an entitlement. Only completed Re-Docking
    // on the new campaign's Island 004 qualifies, in any journey cycle. Do not
    // reinterpret old Island 002 progress as an earned Vault unlock.
    return Object.entries(ledger).some(([key, progress]) => (/^(0|[1-9]\d*):4$/.test(key)
        && progress.missionId === 'celestial-great-redocking'
        && progress.version === 1
        && Number.isFinite(progress.rollsCompleted)
        && progress.rollsCompleted >= CELESTIAL_REDOCKING_ROLL_TARGET
        && typeof progress.completedAtMs === 'number'
        && Number.isFinite(progress.completedAtMs)
        && progress.completedAtMs >= 0));
}
export function resolveVaultIslandWealthDisplay(holdingsValue) {
    const normalizedHoldings = typeof holdingsValue === 'number' && Number.isFinite(holdingsValue)
        ? Math.max(0, Math.floor(holdingsValue))
        : 0;
    if (normalizedHoldings === 0) {
        return { holdingsValue: 0, tier: 'empty', ingotsPerStack: 0, looseCoinCount: 0, stackGemCount: 0, looseGemCount: 0 };
    }
    if (normalizedHoldings < 500) {
        return { holdingsValue: normalizedHoldings, tier: 'starter', ingotsPerStack: 4, looseCoinCount: 10, stackGemCount: 0, looseGemCount: 1 };
    }
    if (normalizedHoldings < 2500) {
        return { holdingsValue: normalizedHoldings, tier: 'growing', ingotsPerStack: 10, looseCoinCount: 24, stackGemCount: 2, looseGemCount: 4 };
    }
    if (normalizedHoldings < 10000) {
        return { holdingsValue: normalizedHoldings, tier: 'abundant', ingotsPerStack: 18, looseCoinCount: 42, stackGemCount: 4, looseGemCount: 8 };
    }
    return { holdingsValue: normalizedHoldings, tier: 'legendary', ingotsPerStack: 28, looseCoinCount: 64, stackGemCount: 7, looseGemCount: 12 };
}
/**
 * Projects the canonical Vault Rush ledger into presentation-only museum ownership.
 * One distinct island with a successful claim unlocks one relic; repeat claims on
 * that island remain part of the existing Vault Rush economy only.
 */
export function resolveVaultIslandCollection(claimsByIsland) {
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
export function findNewVaultIslandCollectionEntry(previousClaimsByIsland, nextClaimsByIsland) {
    const previousTreasureIds = new Set(resolveVaultIslandCollection(previousClaimsByIsland).unlockedTreasureIds);
    return resolveVaultIslandCollection(nextClaimsByIsland).entries.find((entry) => !previousTreasureIds.has(entry.treasureId)) ?? null;
}
