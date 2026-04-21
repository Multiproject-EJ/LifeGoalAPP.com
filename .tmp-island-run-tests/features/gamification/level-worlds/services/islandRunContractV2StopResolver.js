"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIslandRunContractV2StopCompleteAtIndex = isIslandRunContractV2StopCompleteAtIndex;
exports.areIslandRunContractV2ObjectivesComplete = areIslandRunContractV2ObjectivesComplete;
exports.isIslandRunFullyClearedV2 = isIslandRunFullyClearedV2;
exports.resolveIslandRunStep1CompleteForProgression = resolveIslandRunStep1CompleteForProgression;
exports.resolveIslandRunFullClearForProgression = resolveIslandRunFullClearForProgression;
exports.resolveIslandRunContractV2Stops = resolveIslandRunContractV2Stops;
const islandRunContractV2EssenceBuild_1 = require("./islandRunContractV2EssenceBuild");
const islandRunStopTickets_1 = require("./islandRunStopTickets");
const CONTRACT_V2_STOP_TYPES = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'];
/**
 * A stop is "done" for unlock/sequencing purposes when its OBJECTIVE is complete.
 * Build completion is tracked separately and contributes to island clear, not stop unlock.
 */
function isStopObjectiveComplete(entry) {
    return entry?.objectiveComplete === true;
}
function isIslandRunContractV2StopCompleteAtIndex(options) {
    const normalizedIndex = Math.max(0, Math.min(CONTRACT_V2_STOP_TYPES.length - 1, Math.floor(options.index)));
    return isStopObjectiveComplete(options.stopStatesByIndex[normalizedIndex]);
}
/**
 * All 5 stop OBJECTIVES complete (does not check builds).
 */
function areIslandRunContractV2ObjectivesComplete(options) {
    return CONTRACT_V2_STOP_TYPES.every((_, index) => isStopObjectiveComplete(options.stopStatesByIndex[index]));
}
/**
 * Island is fully cleared when:
 *  1. All 5 stop objectives are complete.
 *  2. The hatchery egg has been collected or sold (hatcheryEggResolved).
 *     Note: egg *set* unlocks stop 2; egg *collected/sold* is required for island clear.
 *  3. All 5 stop buildings are fully built (each buildLevel === MAX_BUILD_LEVEL).
 */
function isIslandRunFullyClearedV2(options) {
    if (!options.hatcheryEggResolved)
        return false;
    if (!areIslandRunContractV2ObjectivesComplete({ stopStatesByIndex: options.stopStatesByIndex }))
        return false;
    return CONTRACT_V2_STOP_TYPES.every((_, index) => {
        const build = options.stopBuildStateByIndex[index];
        return build != null && build.buildLevel >= islandRunContractV2EssenceBuild_1.MAX_BUILD_LEVEL;
    });
}
function resolveIslandRunStep1CompleteForProgression(options) {
    if (!options.islandRunContractV2Enabled)
        return options.legacyStep1Complete;
    return isIslandRunContractV2StopCompleteAtIndex({
        stopStatesByIndex: options.stopStatesByIndex,
        index: 0,
    });
}
function resolveIslandRunFullClearForProgression(options) {
    if (!options.islandRunContractV2Enabled)
        return options.legacyIslandFullyCleared;
    return isIslandRunFullyClearedV2({
        stopStatesByIndex: options.stopStatesByIndex,
        stopBuildStateByIndex: options.stopBuildStateByIndex ?? [],
        hatcheryEggResolved: options.hatcheryEggResolved ?? false,
    });
}
function resolveIslandRunContractV2Stops(options) {
    const normalizedStates = CONTRACT_V2_STOP_TYPES.map((_, index) => options.stopStatesByIndex[index]);
    // Stop sequencing uses OBJECTIVE completion only — builds are decoupled.
    const firstIncompleteIndex = normalizedStates.findIndex((entry) => !isStopObjectiveComplete(entry));
    const activeStopIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : CONTRACT_V2_STOP_TYPES.length - 1;
    const allObjectivesComplete = firstIncompleteIndex === -1;
    // Resolve whether the active stop is currently ticket-gated. Only applies
    // when the caller supplied the ledger + island number (otherwise we can't
    // know and must preserve legacy 'active' semantics).
    let activeStopRequiresTicket = false;
    if (!allObjectivesComplete &&
        activeStopIndex > 0 &&
        options.stopTicketsPaidByIsland != null &&
        typeof options.islandNumber === 'number') {
        const ticketsPaid = (0, islandRunStopTickets_1.getStopTicketsPaidForIsland)(options.stopTicketsPaidByIsland, options.islandNumber);
        activeStopRequiresTicket = !(0, islandRunStopTickets_1.isStopTicketPaid)({ ticketsPaid, stopIndex: activeStopIndex });
    }
    const statusesByIndex = CONTRACT_V2_STOP_TYPES.map((_, index) => {
        if (allObjectivesComplete)
            return 'completed';
        if (index < activeStopIndex)
            return 'completed';
        if (index === activeStopIndex)
            return activeStopRequiresTicket ? 'ticket_required' : 'active';
        return 'locked';
    });
    return {
        activeStopIndex,
        activeStopType: CONTRACT_V2_STOP_TYPES[activeStopIndex],
        statusesByIndex,
    };
}
