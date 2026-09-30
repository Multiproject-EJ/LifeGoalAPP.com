export const VAULT_RUSH_MAX_CLAIMS_PER_ISLAND = 5;
function clampClaimCount(value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(VAULT_RUSH_MAX_CLAIMS_PER_ISLAND, Math.floor(value)));
}
export function sanitizeVaultRushClaimsByIsland(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    const sanitized = {};
    for (const [islandKey, count] of Object.entries(value)) {
        const effectiveIslandNumber = Number(islandKey);
        if (!Number.isFinite(effectiveIslandNumber) || effectiveIslandNumber < 1)
            continue;
        const normalizedCount = clampClaimCount(count);
        if (normalizedCount > 0)
            sanitized[String(Math.floor(effectiveIslandNumber))] = normalizedCount;
    }
    return sanitized;
}
export function getVaultRushClaimCount(ledger, effectiveIslandNumber) {
    const islandKey = String(Math.max(1, Math.floor(effectiveIslandNumber)));
    return clampClaimCount(ledger?.[islandKey]);
}
export function isVaultRushUnlocked(completedStopIds) {
    return completedStopIds.some((stopId) => stopId !== 'hatchery');
}
