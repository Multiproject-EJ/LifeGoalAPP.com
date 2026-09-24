export const ISLAND_RUN_ORBIT_MAX_ISLANDS = 120;
export const ISLAND_RUN_ORBIT_ARM_COUNT = 5;
export const ISLAND_RUN_ORBIT_ISLANDS_PER_ARM = 24;

export type IslandRunOrbitFocusEntry = number | null;

export interface IslandRunOrbitAddress {
  islandNumber: number;
  armIndex: number;
  armStep: number;
}

export function normalizeIslandRunOrbitCount(value: number): number {
  if (!Number.isFinite(value)) return ISLAND_RUN_ORBIT_MAX_ISLANDS;
  return Math.min(ISLAND_RUN_ORBIT_MAX_ISLANDS, Math.max(1, Math.floor(value)));
}

export function clampIslandRunOrbitNumber(value: number, maxIslandCount = ISLAND_RUN_ORBIT_MAX_ISLANDS): number {
  const safeMax = normalizeIslandRunOrbitCount(maxIslandCount);
  if (!Number.isFinite(value)) return 1;
  return Math.min(safeMax, Math.max(1, Math.floor(value)));
}

export function resolveIslandRunOrbitAddress(
  islandNumber: number,
  maxIslandCount = ISLAND_RUN_ORBIT_MAX_ISLANDS,
): IslandRunOrbitAddress {
  const safeIsland = clampIslandRunOrbitNumber(islandNumber, maxIslandCount);
  return {
    islandNumber: safeIsland,
    armIndex: Math.min(ISLAND_RUN_ORBIT_ARM_COUNT - 1, Math.floor((safeIsland - 1) / ISLAND_RUN_ORBIT_ISLANDS_PER_ARM)),
    armStep: (safeIsland - 1) % ISLAND_RUN_ORBIT_ISLANDS_PER_ARM,
  };
}

export function getIslandRunOrbitArmNumbers(
  armIndex: number,
  maxIslandCount = ISLAND_RUN_ORBIT_MAX_ISLANDS,
): number[] {
  const safeMax = normalizeIslandRunOrbitCount(maxIslandCount);
  const safeArm = Math.min(ISLAND_RUN_ORBIT_ARM_COUNT - 1, Math.max(0, Math.floor(armIndex)));
  const firstIsland = safeArm * ISLAND_RUN_ORBIT_ISLANDS_PER_ARM + 1;
  const lastIsland = Math.min(safeMax, firstIsland + ISLAND_RUN_ORBIT_ISLANDS_PER_ARM - 1);
  if (firstIsland > safeMax) return [];
  return Array.from({ length: lastIsland - firstIsland + 1 }, (_, index) => firstIsland + index);
}

/**
 * Local browsing follows island order, independently of the atlas arm layout.
 * Keep the selection centered and leave empty slots at the campaign edges.
 */
export function resolveIslandRunOrbitFocusEntries(
  islandNumber: number,
  maxIslandCount = ISLAND_RUN_ORBIT_MAX_ISLANDS,
): IslandRunOrbitFocusEntry[] {
  const safeMax = normalizeIslandRunOrbitCount(maxIslandCount);
  const selected = clampIslandRunOrbitNumber(islandNumber, safeMax);
  return [-2, -1, 0, 1, 2].map((offset) => {
    const destination = selected + offset;
    return destination >= 1 && destination <= safeMax ? destination : null;
  });
}
