export interface IslandRunOrbitProgressInput {
  currentIslandNumber: number;
  cycleIndex: number;
  maxIslandCount: number;
  completedStopsByIsland?: Readonly<Record<string, readonly string[] | undefined>>;
  perIslandEggs?: Readonly<Record<string, unknown>>;
}

export interface IslandRunOrbitProgress {
  currentIslandNumber: number;
  completedIslandNumbers: number[];
  visitedIslandNumbers: number[];
  completedCount: number;
}

function clampIslandNumber(value: number, maxIslandCount: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maxIslandCount, Math.max(1, Math.floor(value)));
}

function parseIslandKey(key: string, maxIslandCount: number): number | null {
  if (!/^\d+$/.test(key)) return null;
  const islandNumber = Number(key);
  if (!Number.isInteger(islandNumber) || islandNumber < 1 || islandNumber > maxIslandCount) return null;
  return islandNumber;
}

/**
 * Builds a presentation-only journey history. Sequential progression proves
 * earlier islands were completed; ledger entries only prove that an island was
 * visited and must never unlock travel or rewards from the atlas.
 */
export function resolveIslandRunOrbitProgress(input: IslandRunOrbitProgressInput): IslandRunOrbitProgress {
  const maxIslandCount = Math.max(1, Math.floor(input.maxIslandCount));
  const currentIslandNumber = clampIslandNumber(input.currentIslandNumber, maxIslandCount);
  const hasCompletedCycle = Number.isFinite(input.cycleIndex) && Math.floor(input.cycleIndex) > 0;
  const completedIslandNumbers = hasCompletedCycle
    ? Array.from({ length: maxIslandCount }, (_, index) => index + 1)
      .filter((islandNumber) => islandNumber !== currentIslandNumber)
    : Array.from({ length: Math.max(0, currentIslandNumber - 1) }, (_, index) => index + 1);
  const completedSet = new Set(completedIslandNumbers);
  const visitedSet = new Set<number>();

  for (const [key, stops] of Object.entries(input.completedStopsByIsland ?? {})) {
    const islandNumber = parseIslandKey(key, maxIslandCount);
    if (islandNumber !== null && (stops?.length ?? 0) > 0) visitedSet.add(islandNumber);
  }
  for (const [key, eggEntry] of Object.entries(input.perIslandEggs ?? {})) {
    const islandNumber = parseIslandKey(key, maxIslandCount);
    if (islandNumber !== null && eggEntry != null) visitedSet.add(islandNumber);
  }

  visitedSet.delete(currentIslandNumber);
  completedSet.forEach((islandNumber) => visitedSet.delete(islandNumber));

  return {
    currentIslandNumber,
    completedIslandNumbers,
    visitedIslandNumbers: [...visitedSet].sort((left, right) => left - right),
    completedCount: completedIslandNumbers.length,
  };
}
