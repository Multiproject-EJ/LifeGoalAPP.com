"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunTimerProgressionTests = void 0;
const islandRunTimerProgression_1 = require("../islandRunTimerProgression");
const testHarness_1 = require("./testHarness");
exports.islandRunTimerProgressionTests = [
    {
        name: 'island timers retired: auto-advance never triggers',
        run: () => {
            const shouldAutoAdvance = (0, islandRunTimerProgression_1.shouldAutoAdvanceIslandOnTimerExpiry)({
                islandRunContractV2Enabled: true,
                isIslandTimerPendingStart: false,
                timeLeftSec: 0,
                showTravelOverlay: false,
            });
            (0, testHarness_1.assertEqual)(shouldAutoAdvance, false, 'Expected retired timer to never auto-advance');
        },
    },
    {
        name: 'island timers retired: hydration always returns inert state',
        run: () => {
            const nowMs = 1000000;
            const hydrationState = (0, islandRunTimerProgression_1.resolveIslandTimerHydrationState)({
                islandRunContractV2Enabled: true,
                persistedStartedAtMs: nowMs - 10000,
                persistedExpiresAtMs: nowMs - 1000,
                nowMs,
                defaultDurationMs: 60000,
            });
            (0, testHarness_1.assertEqual)(hydrationState.shouldAutoAdvanceOnHydration, false, 'Expected retired timer hydration to never auto-advance');
            (0, testHarness_1.assertEqual)(hydrationState.isIslandTimerPendingStart, false, 'Expected retired timer to not be pending');
            (0, testHarness_1.assertEqual)(hydrationState.timeLeftSec, 0, 'Expected retired timer to report 0 time left');
        },
    },
    {
        name: 'island timers retired: legacy mode also returns inert state',
        run: () => {
            const nowMs = 1000000;
            const hydrationState = (0, islandRunTimerProgression_1.resolveIslandTimerHydrationState)({
                islandRunContractV2Enabled: false,
                persistedStartedAtMs: nowMs - 10000,
                persistedExpiresAtMs: nowMs - 1000,
                nowMs,
                defaultDurationMs: 60000,
            });
            const shouldAutoAdvance = (0, islandRunTimerProgression_1.shouldAutoAdvanceIslandOnTimerExpiry)({
                islandRunContractV2Enabled: false,
                isIslandTimerPendingStart: false,
                timeLeftSec: 0,
                showTravelOverlay: false,
            });
            (0, testHarness_1.assertEqual)(hydrationState.shouldAutoAdvanceOnHydration, false, 'Expected retired timer to never auto-advance even in legacy mode');
            (0, testHarness_1.assertEqual)(shouldAutoAdvance, false, 'Expected retired timer auto-advance check to always return false');
        },
    },
];
