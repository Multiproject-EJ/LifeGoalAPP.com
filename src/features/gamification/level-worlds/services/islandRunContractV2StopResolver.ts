import { MAX_BUILD_LEVEL, type IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';
import { getStopTicketsPaidForIsland, isStopTicketPaid } from './islandRunStopTickets';

export type IslandRunContractV2StopType = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
export const ISLAND_RUN_CONTRACT_V2_STOP_TYPES: readonly IslandRunContractV2StopType[] = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];
export const ISLAND_RUN_POSTPONABLE_STOP_TYPES: readonly IslandRunContractV2StopType[] = ['habit', 'mystery', 'wisdom'];
export const ISLAND_RUN_MAX_OPEN_INCOMPLETE_STOPS = 3;

/**
 * Stop status emitted by `resolveIslandRunContractV2Stops.statusesByIndex`:
 *  - `completed`: objective complete (build may still be pending).
 *  - `active`: the single recommended unfinished accessible stop.
 *  - `accessible`: unfinished and enterable, but not the primary recommendation.
 *  - `postponed`: unfinished, enterable, and intentionally saved for later.
 *  - `ticket_required`: access is unlocked, but the per-island essence ticket is unpaid.
 *  - `locked`: not currently accessible.
 */
export type IslandRunContractV2StopStatus = 'completed' | 'active' | 'accessible' | 'postponed' | 'ticket_required' | 'locked';

type StopRuntimeStateEntry = {
  objectiveComplete: boolean;
  buildComplete: boolean;
  accessUnlocked?: boolean;
  postponedAtMs?: number | null;
  completedAtMs?: number;
};

export interface ResolveIslandRunContractV2StopsResult {
  activeStopIndex: number;
  activeStopType: IslandRunContractV2StopType;
  recommendedStopIndex: number;
  recommendedStopType: IslandRunContractV2StopType;
  statusesByIndex: IslandRunContractV2StopStatus[];
}

function isStopObjectiveComplete(entry: StopRuntimeStateEntry | null | undefined): boolean {
  return entry?.objectiveComplete === true;
}

function isStopAccessUnlocked(entry: StopRuntimeStateEntry | null | undefined, index: number, states?: Array<StopRuntimeStateEntry | null | undefined>): boolean {
  if (index === 0) return true;
  return entry?.accessUnlocked === true || (states ? isStopObjectiveComplete(states[index - 1]) : false);
}

function isStopPostponed(entry: StopRuntimeStateEntry | null | undefined): boolean {
  return !isStopObjectiveComplete(entry) && typeof entry?.postponedAtMs === 'number' && Number.isFinite(entry.postponedAtMs);
}

export function getIslandRunOpenIncompleteStopCount(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): number {
  return ISLAND_RUN_CONTRACT_V2_STOP_TYPES.reduce((count, _, index) => {
    const entry = options.stopStatesByIndex[index];
    return !isStopObjectiveComplete(entry) && isStopAccessUnlocked(entry, index, options.stopStatesByIndex) ? count + 1 : count;
  }, 0);
}

export function isIslandRunContractV2StopCompleteAtIndex(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  index: number;
}): boolean {
  const normalizedIndex = Math.max(0, Math.min(ISLAND_RUN_CONTRACT_V2_STOP_TYPES.length - 1, Math.floor(options.index)));
  return isStopObjectiveComplete(options.stopStatesByIndex[normalizedIndex]);
}

export function areIslandRunContractV2ObjectivesComplete(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
}): boolean {
  return ISLAND_RUN_CONTRACT_V2_STOP_TYPES.every((_, index) => isStopObjectiveComplete(options.stopStatesByIndex[index]));
}

export function isIslandRunFullyClearedV2(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  stopBuildStateByIndex: Array<IslandRunContractV2BuildState | null | undefined>;
  hatcheryEggResolved: boolean;
}): boolean {
  if (!options.hatcheryEggResolved) return false;
  if (!areIslandRunContractV2ObjectivesComplete({ stopStatesByIndex: options.stopStatesByIndex })) return false;
  return ISLAND_RUN_CONTRACT_V2_STOP_TYPES.every((_, index) => {
    const build = options.stopBuildStateByIndex[index];
    return build != null && build.buildLevel >= MAX_BUILD_LEVEL;
  });
}


export function isIslandRunFinishedForDepartureV2(options: {
  stopBuildStateByIndex: Array<IslandRunContractV2BuildState | null | undefined>;
  hatcheryEggResolved: boolean;
  bossDefeated: boolean;
}): boolean {
  if (!options.hatcheryEggResolved) return false;
  if (!options.bossDefeated) return false;
  return ISLAND_RUN_CONTRACT_V2_STOP_TYPES.every((_, index) => {
    const build = options.stopBuildStateByIndex[index];
    return build != null && build.buildLevel >= MAX_BUILD_LEVEL;
  });
}

export function resolveIslandRunStep1CompleteForProgression(options: {
  islandRunContractV2Enabled: boolean;
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  legacyStep1Complete: boolean;
}): boolean {
  if (!options.islandRunContractV2Enabled) return options.legacyStep1Complete;
  return isIslandRunContractV2StopCompleteAtIndex({
    stopStatesByIndex: options.stopStatesByIndex,
    index: 0,
  });
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

export type PostponeIslandRunStopReason =
  | 'already_completed'
  | 'not_postponable'
  | 'not_accessible'
  | 'next_stop_unavailable'
  | 'open_limit_reached';

export function canPostponeIslandRunStop(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  stopIndex: number;
  maxOpenIncompleteStops?: number;
}): { ok: true; nextStopIndex: number; openIncompleteCount: number } | { ok: false; reason: PostponeIslandRunStopReason; openIncompleteCount: number } {
  const stopIndex = Math.max(0, Math.min(ISLAND_RUN_CONTRACT_V2_STOP_TYPES.length - 1, Math.floor(options.stopIndex)));
  const entry = options.stopStatesByIndex[stopIndex];
  const openIncompleteCount = getIslandRunOpenIncompleteStopCount({ stopStatesByIndex: options.stopStatesByIndex });
  if (isStopObjectiveComplete(entry)) return { ok: false, reason: 'already_completed', openIncompleteCount };
  if (!ISLAND_RUN_POSTPONABLE_STOP_TYPES.includes(ISLAND_RUN_CONTRACT_V2_STOP_TYPES[stopIndex])) {
    return { ok: false, reason: 'not_postponable', openIncompleteCount };
  }
  if (!isStopAccessUnlocked(entry, stopIndex, options.stopStatesByIndex)) return { ok: false, reason: 'not_accessible', openIncompleteCount };
  const nextStopIndex = stopIndex + 1;
  if (nextStopIndex >= ISLAND_RUN_CONTRACT_V2_STOP_TYPES.length || ISLAND_RUN_CONTRACT_V2_STOP_TYPES[nextStopIndex] === 'boss') {
    return { ok: false, reason: 'next_stop_unavailable', openIncompleteCount };
  }
  const nextEntry = options.stopStatesByIndex[nextStopIndex];
  if (!isStopObjectiveComplete(nextEntry) && !isStopAccessUnlocked(nextEntry, nextStopIndex, options.stopStatesByIndex)) {
    const maxOpen = Math.max(1, Math.floor(options.maxOpenIncompleteStops ?? ISLAND_RUN_MAX_OPEN_INCOMPLETE_STOPS));
    if (openIncompleteCount >= maxOpen) return { ok: false, reason: 'open_limit_reached', openIncompleteCount };
  }
  return { ok: true, nextStopIndex, openIncompleteCount };
}

export function resolveIslandRunContractV2Stops(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  stopTicketsPaidByIsland?: Record<string, number[]> | null;
  islandNumber?: number;
}): ResolveIslandRunContractV2StopsResult {
  const normalizedStates = ISLAND_RUN_CONTRACT_V2_STOP_TYPES.map((_, index) => options.stopStatesByIndex[index]);
  const firstIncompleteIndex = normalizedStates.findIndex((entry) => !isStopObjectiveComplete(entry));
  const activeStopIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : ISLAND_RUN_CONTRACT_V2_STOP_TYPES.length - 1;
  const allObjectivesComplete = firstIncompleteIndex === -1;
  const ticketsPaid = options.stopTicketsPaidByIsland != null && typeof options.islandNumber === 'number'
    ? getStopTicketsPaidForIsland(options.stopTicketsPaidByIsland, options.islandNumber)
    : null;

  const baseStatusesByIndex = ISLAND_RUN_CONTRACT_V2_STOP_TYPES.map((_, index): IslandRunContractV2StopStatus => {
    const entry = normalizedStates[index];
    if (allObjectivesComplete || index < activeStopIndex || (index === activeStopIndex && isStopObjectiveComplete(entry))) return 'completed';
    const accessUnlocked = index === 0 || entry?.accessUnlocked === true || index === activeStopIndex;
    if (!accessUnlocked) return 'locked';
    if (ticketsPaid != null && index > 0 && !isStopTicketPaid({ ticketsPaid, stopIndex: index })) return 'ticket_required';
    if (index === activeStopIndex) return isStopPostponed(entry) ? 'postponed' : 'active';
    return isStopPostponed(entry) ? 'postponed' : 'accessible';
  });

  const recommendedStopIndex = (() => {
    const activeIndex = baseStatusesByIndex.findIndex((status) => status === 'active');
    if (activeIndex >= 0) return activeIndex;
    const ticketIndex = baseStatusesByIndex.findIndex((status) => status === 'ticket_required');
    if (ticketIndex >= 0) return ticketIndex;
    const accessibleIndex = baseStatusesByIndex.findIndex((status) => status === 'accessible');
    if (accessibleIndex >= 0) return accessibleIndex;
    const postponedIndex = baseStatusesByIndex.findIndex((status) => status === 'postponed');
    if (postponedIndex >= 0) return postponedIndex;
    return activeStopIndex;
  })();

  const statusesByIndex = baseStatusesByIndex.map((status, index): IslandRunContractV2StopStatus => {
    if (index === recommendedStopIndex && (status === 'accessible' || status === 'postponed')) return 'active';
    return status;
  });

  return {
    activeStopIndex,
    activeStopType: ISLAND_RUN_CONTRACT_V2_STOP_TYPES[activeStopIndex],
    recommendedStopIndex,
    recommendedStopType: ISLAND_RUN_CONTRACT_V2_STOP_TYPES[recommendedStopIndex],
    statusesByIndex,
  };
}
