"use strict";
/**
 * Island Run feature flags.
 *
 * Phase 1 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`).
 *
 * Every flag here defaults to `false` so that adding a flag cannot accidentally
 * change runtime behavior. Later phases flip individual flags on as pieces
 * land. Read via `getIslandRunFeatureFlags()` so a future switch to a remote
 * feature-flag source is a single-call change.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIslandRunFeatureFlags = getIslandRunFeatureFlags;
exports.isIslandRunFeatureEnabled = isIslandRunFeatureEnabled;
exports.__setIslandRunFeatureFlagsForTests = __setIslandRunFeatureFlagsForTests;
exports.__resetIslandRunFeatureFlagsForTests = __resetIslandRunFeatureFlagsForTests;
const DEFAULT_FLAGS = Object.freeze({
    islandRunEventEngineEnabled: false,
    islandRunShooterBlitzBossEnabled: false,
    islandRunTaskTowerMysteryEnabled: false,
    islandRunVisionQuestMysteryEnabled: false,
    islandRunPartnerWheelEnabled: false,
    todaysOfferSpinEntryEnabled: false,
});
let currentFlags = { ...DEFAULT_FLAGS };
/** Read the full flag snapshot. */
function getIslandRunFeatureFlags() {
    return currentFlags;
}
/** Read a single flag by key. */
function isIslandRunFeatureEnabled(key) {
    return currentFlags[key];
}
/**
 * Test-only override. Overlay is merged on top of current flags; omit keys to
 * leave the rest unchanged.
 *
 * Production code MUST NOT call this — flags are flipped on permanently by
 * editing `DEFAULT_FLAGS` as each phase lands (or later, by wiring a remote
 * config source through `getIslandRunFeatureFlags`).
 */
function __setIslandRunFeatureFlagsForTests(overlay) {
    currentFlags = { ...currentFlags, ...overlay };
}
/** Test-only: reset to the compile-time defaults. */
function __resetIslandRunFeatureFlagsForTests() {
    currentFlags = { ...DEFAULT_FLAGS };
}
