interface ResolveIslandClearsCountOptions {
  currentIslandNumber: number;
  cycleIndex: number;
  isCurrentIslandFullyCleared: boolean;
}

/**
 * Counts total islands fully cleared in the current run (across cycle wraps).
 * This is intentionally a progress counter, not a "streak" gate.
 */
export function resolveIslandClearsCount(
  options: ResolveIslandClearsCountOptions,
): number {
  const safeCurrentIsland = Math.max(1, Math.floor(options.currentIslandNumber));
  const safeCycleIndex = Math.max(0, Math.floor(options.cycleIndex));
  const clearedBeforeCurrentIsland = safeCycleIndex * 120 + (safeCurrentIsland - 1);
  return Math.max(0, clearedBeforeCurrentIsland + (options.isCurrentIslandFullyCleared ? 1 : 0));
}
