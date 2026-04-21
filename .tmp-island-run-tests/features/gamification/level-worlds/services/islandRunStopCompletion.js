"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureStopCompleted = ensureStopCompleted;
exports.isStopCompleted = isStopCompleted;
exports.isIslandStopEffectivelyCompleted = isIslandStopEffectivelyCompleted;
exports.getEffectiveCompletedStops = getEffectiveCompletedStops;
exports.getCompletedStopsForIsland = getCompletedStopsForIsland;
exports.shouldAutoOpenIslandStopOnLoad = shouldAutoOpenIslandStopOnLoad;
exports.getStopCompletionBlockReason = getStopCompletionBlockReason;
function ensureStopCompleted(completedStops, stopId) {
    return completedStops.includes(stopId) ? completedStops : [...completedStops, stopId];
}
function isStopCompleted(completedStops, stopId) {
    return completedStops.includes(stopId);
}
function isIslandStopEffectivelyCompleted(options) {
    const { stopId, completedStops, hasActiveEgg, islandEggSlotUsed } = options;
    if (!stopId)
        return false;
    if (isStopCompleted(completedStops, stopId))
        return true;
    if (stopId === 'hatchery') {
        return hasActiveEgg || islandEggSlotUsed;
    }
    return false;
}
function getEffectiveCompletedStops(options) {
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
function getCompletedStopsForIsland(completedStopsByIsland, islandNumber) {
    return completedStopsByIsland?.[String(islandNumber)] ?? [];
}
function shouldAutoOpenIslandStopOnLoad(options) {
    const { requestedStopId, islandNumber, completedStopsByIsland, islandEggSlotUsed = false, hasActiveEgg = false, } = options;
    if (!requestedStopId)
        return false;
    if (requestedStopId === 'hatchery' && (islandEggSlotUsed || hasActiveEgg))
        return false;
    const persistedStops = getCompletedStopsForIsland(completedStopsByIsland, islandNumber);
    return !persistedStops.includes(requestedStopId);
}
function getStopCompletionBlockReason(options) {
    const { stopId, completedStops, hasActiveEgg, islandEggSlotUsed, bossTrialResolved, } = options;
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
