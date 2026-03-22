export function ensureStopCompleted(completedStops: string[], stopId: string): string[] {
  return completedStops.includes(stopId) ? completedStops : [...completedStops, stopId];
}

export function getCompletedStopsForIsland(
  completedStopsByIsland: Record<string, string[]> | undefined,
  islandNumber: number,
): string[] {
  return completedStopsByIsland?.[String(islandNumber)] ?? [];
}

export function shouldAutoOpenIslandStopOnLoad(options: {
  requestedStopId: 'hatchery' | 'boss' | 'dynamic' | null;
  islandNumber: number;
  completedStopsByIsland?: Record<string, string[]>;
}): boolean {
  const { requestedStopId, islandNumber, completedStopsByIsland } = options;
  if (!requestedStopId) return false;
  if (requestedStopId !== 'hatchery') return true;
  const persistedStops = getCompletedStopsForIsland(completedStopsByIsland, islandNumber);
  return !persistedStops.includes('hatchery');
}
