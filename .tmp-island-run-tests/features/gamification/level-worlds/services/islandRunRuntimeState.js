"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readIslandRunRuntimeState = readIslandRunRuntimeState;
exports.hydrateIslandRunRuntimeState = hydrateIslandRunRuntimeState;
exports.hydrateIslandRunRuntimeStateWithSource = hydrateIslandRunRuntimeStateWithSource;
exports.resolveCollectibleForClaim = resolveCollectibleForClaim;
exports.persistIslandRunRuntimeStatePatch = persistIslandRunRuntimeStatePatch;
const islandRunRuntimeStateBackend_1 = require("./islandRunRuntimeStateBackend");
function readIslandRunRuntimeState(session) {
    return (0, islandRunRuntimeStateBackend_1.getIslandRunRuntimeStateBackend)().read(session);
}
async function hydrateIslandRunRuntimeState(options) {
    const { session, client, forceRemote } = options;
    return (0, islandRunRuntimeStateBackend_1.getIslandRunRuntimeStateBackend)().hydrate({ session, client, forceRemote });
}
async function hydrateIslandRunRuntimeStateWithSource(options) {
    const { session, client, forceRemote } = options;
    return (0, islandRunRuntimeStateBackend_1.getIslandRunRuntimeStateBackend)().hydrateWithSource({ session, client, forceRemote });
}
const COLLECTIBLE_ROSTER = [
    { emoji: '⚡', name: 'Energy Cell', era: 'Era 1 — Electric Age' },
    { emoji: '🎳', name: 'Bowl Token', era: 'Era 2 — Bowling Era' },
    { emoji: '🌸', name: 'Petal', era: 'Era 3 — Cherry Blossom' },
    { emoji: '💡', name: 'Spark Shard', era: 'Era 4 — Invention Age' },
    { emoji: '🔷', name: 'Memory Gem', era: 'Era 5 — Crystal Era' },
    { emoji: '🌀', name: 'Flux Orb', era: 'Era 6 — Vortex Age' },
    { emoji: '🌈', name: 'Prism Shard', era: 'Era 7 — Rainbow Era' },
];
/**
 * Returns the collectible earned for the given shard_tier_index.
 * Deterministic and cycles through the 7 era collectibles indefinitely.
 */
function resolveCollectibleForClaim(shardTierIndex) {
    return COLLECTIBLE_ROSTER[shardTierIndex % COLLECTIBLE_ROSTER.length];
}
async function persistIslandRunRuntimeStatePatch(options) {
    const { session, client, patch } = options;
    return (0, islandRunRuntimeStateBackend_1.getIslandRunRuntimeStateBackend)().persistPatch({ session, client, patch });
}
