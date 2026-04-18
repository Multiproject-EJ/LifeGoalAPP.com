import { MAX_BUILD_LEVEL, type IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';

export type IslandRunContractV2StopType = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
export type IslandRunContractV2StopStatus = 'completed' | 'active' | 'locked';

const CONTRACT_V2_STOP_TYPES: IslandRunContractV2StopType[] = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];

type StopRuntimeStateEntry = {
  objectiveComplete: boolean;
  buildComplete: boolean;
  completedAtMs?: number;
};

export interface ResolveIslandRunContractV2StopsResult {
  activeStopIndex: number;
  activeStopType: IslandRunContractV2StopType;
  statusesByIndex: IslandRunContractV2StopStatus[];
}

/**
 * A stop is "done" for unlock/sequencing purposes when its OBJECTIVE is complete.
 * Build completion is tracked separately and contributes to island clear, not stop unlock.
 */
function isStopObjectiveComplete(entry: StopRuntimeStateEntry | null | undefined): boolean {
  return entry?.objectiveComplete === true;
}

export function isIslandRunContractV2StopCompleteAtIndex(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  index: number;
}): boolean {
  const normalizedIndex = Math.max(0, Math.min(CONTRACT_V2_STOP_TYPES.length - 1, Math.floor(options.index)));
  return isStopObjectiveComplete(options.stopStatesByIndex[normalizedIndex]);
}

/**
 * All 5 stop OBJECTIVES complete (does not check builds).
 */
export function areIslandRunContractV2ObjectivesComplete(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): boolean {
  return CONTRACT_V2_STOP_TYPES.every((_, index) => isStopObjectiveComplete(options.stopStatesByIndex[index]));
}

/**
 * Island is fully cleared when:
 *  1. All 5 stop objectives are complete.
 *  2. The hatchery egg has been collected or sold (hatcheryEggResolved).
 *     Note: egg *set* unlocks stop 2; egg *collected/sold* is required for island clear.
 *  3. All 5 stop buildings are fully built (each buildLevel === MAX_BUILD_LEVEL).
 */
export function isIslandRunFullyClearedV2(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  stopBuildStateByIndex: Array<IslandRunContractV2BuildState | null | undefined>;
  /** True when the current island's egg has been collected or sold. */
  hatcheryEggResolved: boolean;
}): boolean {
  if (!options.hatcheryEggResolved) return false;
  if (!areIslandRunContractV2ObjectivesComplete({ stopStatesByIndex: options.stopStatesByIndex })) return false;
  return CONTRACT_V2_STOP_TYPES.every((_, index) => {
    const build = options.stopBuildStateByIndex[index];
    return build != null && build.buildLevel >= MAX_BUILD_LEVEL;
  });
}

export function resolveIslandRunStep1CompleteForProgression(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  legacyStep1Complete: boolean;
  /** When true, the hatchery egg has been set — meaning stop 0 (hatchery) is
   *  effectively resolved even if v2 stopStatesByIndex hasn't been written yet.
   *  This bridges the gap between the egg-slot lifecycle and the v2 progression
   *  model so the dice button doesn't get stuck on "Open Stop 1". */
  hatcheryEffectivelyComplete?: boolean;
}): boolean {
  if (!options.islandRunContractV2Enabled) return options.legacyStep1Complete;
  if (isIslandRunContractV2StopCompleteAtIndex({
    stopStatesByIndex: options.stopStatesByIndex,
    index: 0,
  })) {
    return true;
  }
  // Fallback: if the egg lifecycle has resolved the hatchery (egg set), treat step 1 as done.
  return options.hatcheryEffectivelyComplete === true;
}

export function resolveIslandRunFullClearForProgression(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  stopBuildStateByIndex?: Array<IslandRunContractV2BuildState | null | undefined>;
  hatcheryEggResolved?: boolean;
  legacyIslandFullyCleared: boolean;
}): boolean {
  if (!options.islandRunContractV2Enabled) return options.legacyIslandFullyCleared;
  return isIslandRunFullyClearedV2({
    stopStatesByIndex: options.stopStatesByIndex,
    stopBuildStateByIndex: options.stopBuildStateByIndex ?? [],
    hatcheryEggResolved: options.hatcheryEggResolved ?? false,
  });
}

export function resolveIslandRunContractV2Stops(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): ResolveIslandRunContractV2StopsResult {
  const normalizedStates = CONTRACT_V2_STOP_TYPES.map((_, index) => options.stopStatesByIndex[index]);
  // Stop sequencing uses OBJECTIVE completion only — builds are decoupled.
  const firstIncompleteIndex = normalizedStates.findIndex((entry) => !isStopObjectiveComplete(entry));
  const activeStopIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : CONTRACT_V2_STOP_TYPES.length - 1;
  const allObjectivesComplete = firstIncompleteIndex === -1;

  const statusesByIndex = CONTRACT_V2_STOP_TYPES.map((_, index): IslandRunContractV2StopStatus => {
    if (allObjectivesComplete) return 'completed';
    if (index < activeStopIndex) return 'completed';
    if (index === activeStopIndex) return 'active';
    return 'locked';
  });

  return {
    activeStopIndex,
    activeStopType: CONTRACT_V2_STOP_TYPES[activeStopIndex],
    statusesByIndex,
  };
}
