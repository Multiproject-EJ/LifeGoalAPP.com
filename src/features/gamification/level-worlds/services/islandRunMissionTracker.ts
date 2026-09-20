import { resolveIslandRunCompletion } from './islandRunCompletion';
import { resolveIslandMissionObjectives, type IslandMissionObjectivesPresentation } from './islandRunMissionObjectives';
export { ISLAND_MISSION_TRACKER_REGISTRY_VERSION, type IslandMissionTrackerObjective } from './islandRunMissionObjectives';

export interface IslandMissionTrackerPresentation extends IslandMissionObjectivesPresentation {
  islandCompletion: ReturnType<typeof resolveIslandRunCompletion> | null;
}

/** The phone and departure use the same activity evidence and completion gate. */
export function resolveIslandMissionTrackerPresentation(
  options: Parameters<typeof resolveIslandMissionObjectives>[0],
): IslandMissionTrackerPresentation {
  const islandCompletion = options.state.currentIslandNumber === options.islandNumber
    ? resolveIslandRunCompletion(options.state) : null;
  const presentation = resolveIslandMissionObjectives({ ...options, landmarkCount: islandCompletion?.landmarkCount });
  return {
    ...presentation,
    complete: islandCompletion?.complete ?? presentation.complete,
    overallProgressPercent: islandCompletion?.percent ?? presentation.overallProgressPercent,
    islandCompletion,
  };
}
