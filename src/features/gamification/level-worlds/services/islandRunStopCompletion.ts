export function ensureStopCompleted(completedStops: string[], stopId: string): string[] {
  return completedStops.includes(stopId) ? completedStops : [...completedStops, stopId];
}

export function isStopCompleted(completedStops: string[], stopId: string): boolean {
  return completedStops.includes(stopId);
}

export function isIslandStopEffectivelyCompleted(options: {
  stopId: string | null;
  completedStops: string[];
  hasActiveEgg: boolean;
  islandEggSlotUsed: boolean;
}): boolean {
  const { stopId, completedStops, hasActiveEgg, islandEggSlotUsed } = options;
  if (!stopId) return false;
  if (isStopCompleted(completedStops, stopId)) return true;

  if (stopId === 'hatchery') {
    return hasActiveEgg || islandEggSlotUsed;
  }

  return false;
}

export function getEffectiveCompletedStops(options: {
  completedStops: string[];
  hasActiveEgg: boolean;
  islandEggSlotUsed: boolean;
}): string[] {
  const { completedStops, hasActiveEgg, islandEggSlotUsed } = options;
  return isIslandStopEffectivelyCompleted({
    stopId: 'hatchery',
    completedStops,
    hasActiveEgg,
    islandEggSlotUsed,
  })
    ? ensureStopCompleted(completedStops, 'hatchery')
    : completedStops;
}

export function getCompletedStopsForIsland(
  completedStopsByIsland: Record<string, string[]> | undefined,
  islandNumber: number,
): string[] {
  return completedStopsByIsland?.[String(islandNumber)] ?? [];
}

export function shouldAutoOpenIslandStopOnLoad(options: {
  requestedStopId: string | null;
  islandNumber: number;
  completedStopsByIsland?: Record<string, string[]>;
  islandEggSlotUsed?: boolean;
  hasActiveEgg?: boolean;
}): boolean {
  const {
    requestedStopId,
    islandNumber,
    completedStopsByIsland,
    islandEggSlotUsed = false,
    hasActiveEgg = false,
  } = options;
  if (!requestedStopId) return false;
  if (requestedStopId === 'hatchery' && (islandEggSlotUsed || hasActiveEgg)) return false;
  const persistedStops = getCompletedStopsForIsland(completedStopsByIsland, islandNumber);
  return !persistedStops.includes(requestedStopId);
}

export function getStopCompletionBlockReason(options: {
  stopId: string | null;
  completedStops: string[];
  hasActiveEgg: boolean;
  islandEggSlotUsed: boolean;
  bossTrialResolved: boolean;
}): string | null {
  const {
    stopId,
    completedStops,
    hasActiveEgg,
    islandEggSlotUsed,
    bossTrialResolved,
  } = options;

  if (!stopId) {
    return 'No stop selected.';
  }

  if (stopId === 'hatchery' && !hasActiveEgg && !islandEggSlotUsed) {
    return 'Set an egg in Hatchery before completing Stop 1.';
  }

  if (stopId === 'boss' && !bossTrialResolved) {
    return 'Boss challenge is still pending. Resolve the boss trial before clearing the island.';
  }

  // No blocking reason — stop is either already effectively completed (the
  // `isIslandStopEffectivelyCompleted` path) or nothing else prevents the
  // caller from proceeding. Either way there is no message to surface.
  return null;
}
