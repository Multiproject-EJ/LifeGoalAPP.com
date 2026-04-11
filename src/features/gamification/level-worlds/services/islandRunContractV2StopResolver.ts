export type IslandRunContractV2StopType = 'hatchery' | 'habit' | 'breathing' | 'wisdom' | 'boss';
export type IslandRunContractV2StopStatus = 'completed' | 'active' | 'locked';

const CONTRACT_V2_STOP_TYPES: IslandRunContractV2StopType[] = ['hatchery', 'habit', 'breathing', 'wisdom', 'boss'];

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

function isStopComplete(entry: StopRuntimeStateEntry | null | undefined): boolean {
  return entry?.objectiveComplete === true && entry?.buildComplete === true;
}

export function isIslandRunContractV2StopCompleteAtIndex(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  index: number;
}): boolean {
  const normalizedIndex = Math.max(0, Math.min(CONTRACT_V2_STOP_TYPES.length - 1, Math.floor(options.index)));
  return isStopComplete(options.stopStatesByIndex[normalizedIndex]);
}

export function areIslandRunContractV2StopsFullyComplete(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): boolean {
  return CONTRACT_V2_STOP_TYPES.every((_, index) => isStopComplete(options.stopStatesByIndex[index]));
}

export function resolveIslandRunStep1CompleteForProgression(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  legacyStep1Complete: boolean;
  /** When true, the hatchery egg has been set, collected, or sold — meaning stop 0
   *  (hatchery) is effectively resolved even if v2 stopStatesByIndex hasn't been
   *  written yet. This bridges the gap between the egg-slot lifecycle and the v2
   *  progression model so the dice button doesn't get stuck on "Open Stop 1". */
  hatcheryEffectivelyComplete?: boolean;
}): boolean {
  if (!options.islandRunContractV2Enabled) return options.legacyStep1Complete;
  if (isIslandRunContractV2StopCompleteAtIndex({
    stopStatesByIndex: options.stopStatesByIndex,
    index: 0,
  })) {
    return true;
  }
  // Fallback: if the egg lifecycle has resolved the hatchery, treat step 1 as done
  // so the player is not stuck on "Open Stop 1 (Hatchery)" forever.
  return options.hatcheryEffectivelyComplete === true;
}

export function resolveIslandRunFullClearForProgression(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  legacyIslandFullyCleared: boolean;
}): boolean {
  if (!options.islandRunContractV2Enabled) return options.legacyIslandFullyCleared;
  return areIslandRunContractV2StopsFullyComplete({
    stopStatesByIndex: options.stopStatesByIndex,
  });
}

export function resolveIslandRunContractV2Stops(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): ResolveIslandRunContractV2StopsResult {
  const normalizedStates = CONTRACT_V2_STOP_TYPES.map((_, index) => options.stopStatesByIndex[index]);
  const firstIncompleteIndex = normalizedStates.findIndex((entry) => !isStopComplete(entry));
  const activeStopIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : CONTRACT_V2_STOP_TYPES.length - 1;
  const allStopsComplete = firstIncompleteIndex === -1;

  const statusesByIndex = CONTRACT_V2_STOP_TYPES.map((_, index): IslandRunContractV2StopStatus => {
    if (allStopsComplete) return 'completed';
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
