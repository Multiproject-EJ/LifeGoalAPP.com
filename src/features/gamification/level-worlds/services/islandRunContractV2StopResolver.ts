import { MAX_BUILD_LEVEL, type IslandRunContractV2BuildState } from './islandRunContractV2EssenceBuild';
import { getStopTicketsPaidForIsland, isStopTicketPaid } from './islandRunStopTickets';

export type IslandRunContractV2StopType = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
/**
 * Stop status emitted by `resolveIslandRunContractV2Stops.statusesByIndex`:
 *  - `completed`: objective complete (build may still be pending).
 *  - `active`: first-incomplete stop AND its ticket is paid (or Hatchery / stop 0,
 *    which is implicitly free). This is the only stop the player can currently
 *    interact with through the stop modal.
 *  - `ticket_required`: first-incomplete stop whose ticket hasn't been paid yet
 *    on this island. It is sequentially next but the stop modal refuses to open
 *    until `payStopTicket(...)` succeeds. Emitted only when the caller supplies
 *    `stopTicketsPaidByIsland` + `islandNumber`; otherwise the old "active /
 *    locked" two-state behaviour is preserved for backwards compatibility.
 *  - `locked`: sequentially later than the active stop.
 */
export type IslandRunContractV2StopStatus = 'completed' | 'active' | 'ticket_required' | 'locked';

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

export function resolveIslandRunContractV2Stops(options: {
  stopStatesByIndex: Array<StopRuntimeStateEntry | null | undefined>;
  /**
   * Optional per-island paid-ticket ledger. When supplied alongside
   * `islandNumber`, the first-incomplete stop whose ticket has NOT been paid
   * is emitted as `'ticket_required'` instead of `'active'`. This fixes the
   * HUD/telemetry consumer misreport from P1-11 where a ticket-locked stop
   * looked identical to a genuinely interactable active stop. The stop-modal
   * open-path already enforces `isStopTicketPaid` separately, so omitting
   * both params preserves the legacy two-state behaviour.
   *
   * Hatchery (stop 0) is implicitly free on every island and is never gated
   * by a ticket — if it's the first-incomplete stop it always resolves to
   * `'active'`.
   */
  stopTicketsPaidByIsland?: Record<string, number[]> | null;
  /** Current island number used to look up the paid-ticket list. Required
   *  when `stopTicketsPaidByIsland` is supplied; ignored otherwise. */
  islandNumber?: number;
}): ResolveIslandRunContractV2StopsResult {
  const normalizedStates = CONTRACT_V2_STOP_TYPES.map((_, index) => options.stopStatesByIndex[index]);
  // Stop sequencing uses OBJECTIVE completion only — builds are decoupled.
  const firstIncompleteIndex = normalizedStates.findIndex((entry) => !isStopObjectiveComplete(entry));
  const activeStopIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : CONTRACT_V2_STOP_TYPES.length - 1;
  const allObjectivesComplete = firstIncompleteIndex === -1;

  // Resolve whether the active stop is currently ticket-gated. Only applies
  // when the caller supplied the ledger + island number (otherwise we can't
  // know and must preserve legacy 'active' semantics).
  let activeStopRequiresTicket = false;
  if (
    !allObjectivesComplete &&
    activeStopIndex > 0 &&
    options.stopTicketsPaidByIsland != null &&
    typeof options.islandNumber === 'number'
  ) {
    const ticketsPaid = getStopTicketsPaidForIsland(options.stopTicketsPaidByIsland, options.islandNumber);
    activeStopRequiresTicket = !isStopTicketPaid({ ticketsPaid, stopIndex: activeStopIndex });
  }

  const statusesByIndex = CONTRACT_V2_STOP_TYPES.map((_, index): IslandRunContractV2StopStatus => {
    if (allObjectivesComplete) return 'completed';
    if (index < activeStopIndex) return 'completed';
    if (index === activeStopIndex) return activeStopRequiresTicket ? 'ticket_required' : 'active';
    return 'locked';
  });

  return {
    activeStopIndex,
    activeStopType: CONTRACT_V2_STOP_TYPES[activeStopIndex],
    statusesByIndex,
  };
}
