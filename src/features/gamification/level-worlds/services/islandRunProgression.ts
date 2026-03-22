import { generateIslandStopPlan } from './islandRunStops';

export function getRequiredStopIdsForIsland(islandNumber: number): string[] {
  return generateIslandStopPlan(islandNumber).map((stop) => stop.stopId);
}

export function isIslandFullyCleared(islandNumber: number, completedStopIds: string[]): boolean {
  const completed = new Set(completedStopIds);
  return getRequiredStopIdsForIsland(islandNumber).every((stopId) => completed.has(stopId));
}

export function getNextIslandOnExpiry(islandNumber: number, completedStopIds: string[]): number {
  return isIslandFullyCleared(islandNumber, completedStopIds) ? islandNumber + 1 : islandNumber;
}
