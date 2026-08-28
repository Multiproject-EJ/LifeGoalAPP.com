export const VAULT_RUSH_MAX_CLAIMS_PER_ISLAND = 5 as const;

export type VaultRushClaimsByIsland = Record<string, number>;

function clampClaimCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(VAULT_RUSH_MAX_CLAIMS_PER_ISLAND, Math.floor(value)));
}

export function sanitizeVaultRushClaimsByIsland(value: unknown): VaultRushClaimsByIsland {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const sanitized: VaultRushClaimsByIsland = {};
  for (const [islandKey, count] of Object.entries(value)) {
    const effectiveIslandNumber = Number(islandKey);
    if (!Number.isFinite(effectiveIslandNumber) || effectiveIslandNumber < 1) continue;
    const normalizedCount = clampClaimCount(count);
    if (normalizedCount > 0) sanitized[String(Math.floor(effectiveIslandNumber))] = normalizedCount;
  }
  return sanitized;
}

export function getVaultRushClaimCount(
  ledger: VaultRushClaimsByIsland | null | undefined,
  effectiveIslandNumber: number,
): number {
  const islandKey = String(Math.max(1, Math.floor(effectiveIslandNumber)));
  return clampClaimCount(ledger?.[islandKey]);
}

export function isVaultRushUnlocked(completedStopIds: readonly string[]): boolean {
  return completedStopIds.some((stopId) => stopId !== 'hatchery');
}
