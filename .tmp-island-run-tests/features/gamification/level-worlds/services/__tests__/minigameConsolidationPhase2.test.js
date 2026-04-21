"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minigameConsolidationPhase2Tests = void 0;
/**
 * Phase 2 consolidation-plan tests: strict-1/day Daily Spin clamp.
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §2.4 and §12 Phase 2.
 *
 * The module under test (`services/dailySpinLimit.ts`) is deliberately free
 * of Supabase / `import.meta.env` imports so it compiles in the island-run
 * test harness without any extra wiring.
 */
const islandRunFeatureFlags_1 = require("../../../../../config/islandRunFeatureFlags");
const dailySpinLimit_1 = require("../../../../../services/dailySpinLimit");
const testHarness_1 = require("./testHarness");
exports.minigameConsolidationPhase2Tests = [
    {
        name: 'STRICT_DAILY_SPIN_LIMIT is the contract value (1)',
        run: () => {
            (0, testHarness_1.assertEqual)(dailySpinLimit_1.STRICT_DAILY_SPIN_LIMIT, 1, 'plan §2.4 enforces "one spin per day, max"');
        },
    },
    {
        name: 'clampSpinsForStrictDailyLimit is a no-op when the flag is OFF',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(0), 0, 'flag off: passthrough 0');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(1), 1, 'flag off: passthrough 1');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(2), 2, 'flag off: passthrough 2 (legacy all-habits-done bonus)');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(3), 3, 'flag off: passthrough 3 (legacy streak bonus stacked)');
        },
    },
    {
        name: 'clampSpinsForStrictDailyLimit clamps to 1 when the flag is ON',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ todaysOfferSpinEntryEnabled: true });
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(0), 0, 'flag on: 0 stays 0');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(1), 1, 'flag on: 1 stays 1');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(2), 1, 'flag on: 2 clamps to 1 (all-habits bonus retired)');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(3), 1, 'flag on: 3 clamps to 1 (streak bonus retired)');
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
        },
    },
    {
        name: 'clampSpinsForStrictDailyLimit sanitizes non-finite / negative / fractional inputs when the flag is ON',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ todaysOfferSpinEntryEnabled: true });
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(Number.NaN), 0, 'NaN → 0');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(Number.POSITIVE_INFINITY), 0, 'Infinity → 0 (non-finite treated as invalid)');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(-5), 0, 'negative → 0');
            (0, testHarness_1.assertEqual)((0, dailySpinLimit_1.clampSpinsForStrictDailyLimit)(1.9), 1, 'fractional floored then clamped');
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
        },
    },
];
