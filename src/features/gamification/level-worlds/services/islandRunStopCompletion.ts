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
  requestedStopId: string | null;
  islandNumber: number;
  completedStopsByIsland?: Record<string, string[]>;
}): boolean {
  const { requestedStopId, islandNumber, completedStopsByIsland } = options;
  if (!requestedStopId) return false;
  const persistedStops = getCompletedStopsForIsland(completedStopsByIsland, islandNumber);
  return !persistedStops.includes(requestedStopId);
}
