"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minigameConsolidationPhase1Tests = void 0;
/**
 * Phase 1 consolidation-plan tests. See
 * `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §12 Phase 1 and §9.
 */
const islandRunFeatureFlags_1 = require("../../../../../config/islandRunFeatureFlags");
const islandRunStops_1 = require("../islandRunStops");
const testHarness_1 = require("./testHarness");
exports.minigameConsolidationPhase1Tests = [
    {
        name: 'feature flags: every flag defaults to false',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const flags = (0, islandRunFeatureFlags_1.getIslandRunFeatureFlags)();
            (0, testHarness_1.assertDeepEqual)(flags, {
                islandRunEventEngineEnabled: false,
                islandRunShooterBlitzBossEnabled: false,
                islandRunTaskTowerMysteryEnabled: false,
                islandRunVisionQuestMysteryEnabled: false,
                islandRunPartnerWheelEnabled: false,
                todaysOfferSpinEntryEnabled: false,
            }, 'All feature flags must default to false so adding a flag cannot change behavior');
        },
    },
    {
        name: 'isIslandRunFeatureEnabled reflects overlay merges',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, testHarness_1.assertEqual)((0, islandRunFeatureFlags_1.isIslandRunFeatureEnabled)('islandRunTaskTowerMysteryEnabled'), false, 'default off');
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ islandRunTaskTowerMysteryEnabled: true });
            (0, testHarness_1.assertEqual)((0, islandRunFeatureFlags_1.isIslandRunFeatureEnabled)('islandRunTaskTowerMysteryEnabled'), true, 'flipped on by overlay');
            (0, testHarness_1.assertEqual)((0, islandRunFeatureFlags_1.isIslandRunFeatureEnabled)('islandRunVisionQuestMysteryEnabled'), false, 'other flags untouched');
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
        },
    },
    {
        name: 'mystery pool ignores task_tower / vision_quest while their flags are off',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            // Walk the first 200 islands — the seeded PRNG should cover the whole pool.
            for (let island = 1; island <= 200; island += 1) {
                const plan = (0, islandRunStops_1.generateIslandStopPlan)(island);
                const mystery = plan.find((stop) => stop.stopId === 'mystery');
                (0, testHarness_1.assert)(mystery, `island ${island}: mystery stop missing`);
                const kind = mystery.mysteryContentKind;
                (0, testHarness_1.assert)(kind === 'breathing' || kind === 'habit_action' || kind === 'checkin_reflection', `island ${island}: unexpected mystery kind "${kind}" while flags are off`);
            }
        },
    },
    {
        name: 'enabling the task_tower flag admits task_tower into the mystery pool',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ islandRunTaskTowerMysteryEnabled: true });
            let sawTaskTower = false;
            for (let island = 1; island <= 400 && !sawTaskTower; island += 1) {
                const plan = (0, islandRunStops_1.generateIslandStopPlan)(island);
                const mystery = plan.find((stop) => stop.stopId === 'mystery');
                if (mystery?.mysteryContentKind === 'task_tower')
                    sawTaskTower = true;
            }
            (0, testHarness_1.assert)(sawTaskTower, 'task_tower should appear at least once across 400 islands when its flag is on');
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
        },
    },
    {
        name: 'enabling the vision_quest flag admits vision_quest into the mystery pool',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ islandRunVisionQuestMysteryEnabled: true });
            let sawVisionQuest = false;
            for (let island = 1; island <= 400 && !sawVisionQuest; island += 1) {
                const plan = (0, islandRunStops_1.generateIslandStopPlan)(island);
                const mystery = plan.find((stop) => stop.stopId === 'mystery');
                if (mystery?.mysteryContentKind === 'vision_quest')
                    sawVisionQuest = true;
            }
            (0, testHarness_1.assert)(sawVisionQuest, 'vision_quest should appear at least once across 400 islands when its flag is on');
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
        },
    },
];
