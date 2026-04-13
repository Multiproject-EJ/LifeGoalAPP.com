const MAX_ISLANDS = 120;

const ISLAND_NAME_OVERRIDES: Partial<Record<number, string>> = {};

export function getIslandDisplayName(islandNumber: number): string {
  const safeIsland = Number.isFinite(islandNumber)
    ? Math.min(MAX_ISLANDS, Math.max(1, Math.floor(islandNumber)))
    : 1;
  return ISLAND_NAME_OVERRIDES[safeIsland] ?? `Island ${safeIsland}`;
}

