"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredStopIdsForIsland = getRequiredStopIdsForIsland;
exports.isIslandFullyCleared = isIslandFullyCleared;
exports.getNextIslandOnExpiry = getNextIslandOnExpiry;
const islandRunStops_1 = require("./islandRunStops");
function getRequiredStopIdsForIsland(islandNumber) {
    return (0, islandRunStops_1.generateIslandStopPlan)(islandNumber).map((stop) => stop.stopId);
}
function isIslandFullyCleared(islandNumber, completedStopIds) {
    const completed = new Set(completedStopIds);
    return getRequiredStopIdsForIsland(islandNumber).every((stopId) => completed.has(stopId));
}
function getNextIslandOnExpiry(islandNumber, _completedStopIds) {
    return islandNumber + 1;
}
