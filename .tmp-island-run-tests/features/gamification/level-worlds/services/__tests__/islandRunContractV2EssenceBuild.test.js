"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunContractV2EssenceBuildTests = void 0;
const islandRunContractV2EssenceBuild_1 = require("../islandRunContractV2EssenceBuild");
const islandRunContractV2StopResolver_1 = require("../islandRunContractV2StopResolver");
const testHarness_1 = require("./testHarness");
const EFFECTIVE_ISLAND_1 = 1; // cycle 0, island 1
const BASE_STOP_STATES = [
    { objectiveComplete: false, buildComplete: false },
    { objectiveComplete: false, buildComplete: false },
    { objectiveComplete: false, buildComplete: false },
    { objectiveComplete: false, buildComplete: false },
    { objectiveComplete: false, buildComplete: false },
];
/** Build states as initialized for island 1 via initStopBuildStatesForIsland. */
const ISLAND1_BUILD_STATES = (0, islandRunContractV2EssenceBuild_1.initStopBuildStatesForIsland)(EFFECTIVE_ISLAND_1);
/** Compact single-level build state for unit tests that don't rely on scaling. */
const BASE_BUILD_STATES = [
    { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
    { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
    { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
    { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
    { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
];
/** Fully built state for all 5 stops (buildLevel === MAX_BUILD_LEVEL). */
const FULL_BUILD_STATES = Array.from({ length: 5 }, () => ({
    requiredEssence: 50,
    spentEssence: 50,
    buildLevel: islandRunContractV2EssenceBuild_1.MAX_BUILD_LEVEL,
}));
exports.islandRunContractV2EssenceBuildTests = [
    {
        name: 'v2 on: essence can be earned via explicit board-loop earn call',
        run: () => {
            const result = (0, islandRunContractV2EssenceBuild_1.awardIslandRunContractV2Essence)({
                islandRunContractV2Enabled: true,
                essence: 3,
                essenceLifetimeEarned: 7,
                amount: 5,
            });
            (0, testHarness_1.assertEqual)(result.essence, 8, 'Expected essence wallet to increase by earned amount');
            (0, testHarness_1.assertEqual)(result.essenceLifetimeEarned, 12, 'Expected lifetime earned to increase by earned amount');
            (0, testHarness_1.assertEqual)(result.earned, 5, 'Expected deterministic earned value');
        },
    },
    {
        name: 'v2 board wiring: tile landing earn source resolves deterministic essence amount',
        run: () => {
            const fixedSeed = 42;
            const currencyResult = (0, islandRunContractV2EssenceBuild_1.resolveIslandRunContractV2EssenceEarnForTile)('currency', { islandNumber: 1, seed: fixedSeed });
            (0, testHarness_1.assertEqual)(currencyResult >= 5 && currencyResult <= 15, true, 'Expected currency tile in range 5-15 for island 1');
            const chestResult = (0, islandRunContractV2EssenceBuild_1.resolveIslandRunContractV2EssenceEarnForTile)('chest', { islandNumber: 1, seed: fixedSeed });
            (0, testHarness_1.assertEqual)(chestResult >= 20 && chestResult <= 40, true, 'Expected chest tile in range 20-40 for island 1');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.resolveIslandRunContractV2EssenceEarnForTile)('unknown_tile'), 0, 'Expected unknown tile to award zero essence');
            const repeatResult = (0, islandRunContractV2EssenceBuild_1.resolveIslandRunContractV2EssenceEarnForTile)('currency', { islandNumber: 1, seed: fixedSeed });
            (0, testHarness_1.assertEqual)(repeatResult, currencyResult, 'Expected deterministic results with same seed');
        },
    },
    {
        name: 'effective island number combines cycle and island for scaling',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getEffectiveIslandNumber)(1, 0), 1, 'Cycle 0 island 1 → effective 1');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getEffectiveIslandNumber)(1, 1), 121, 'Cycle 1 island 1 → effective 121');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getEffectiveIslandNumber)(120, 1), 240, 'Cycle 1 island 120 → effective 240');
            const costCycle0 = (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 });
            const costCycle1 = (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 121, stopIndex: 0, currentBuildLevel: 0 });
            (0, testHarness_1.assertEqual)(costCycle1 > costCycle0, true, 'Cycle 1 island 1 build costs higher than cycle 0 island 1');
        },
    },
    {
        name: 'initStopBuildStatesForIsland seeds correct costs for all 5 stops',
        run: () => {
            const states = (0, islandRunContractV2EssenceBuild_1.initStopBuildStatesForIsland)(1);
            (0, testHarness_1.assertEqual)(states.length, 5, 'Expected 5 stop build states');
            (0, testHarness_1.assertEqual)(states[0].spentEssence, 0, 'Fresh state: nothing spent');
            (0, testHarness_1.assertEqual)(states[0].buildLevel, 0, 'Fresh state: build level 0');
            (0, testHarness_1.assertEqual)(states[0].requiredEssence, (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 }), 'Stop 0 cost matches getStopUpgradeCost');
            (0, testHarness_1.assertEqual)(states[4].requiredEssence, (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 1, stopIndex: 4, currentBuildLevel: 0 }), 'Boss stop cost matches getStopUpgradeCost');
        },
    },
    {
        name: 'v2 on: spending essence updates stop build progress without affecting stop sequencing',
        run: () => {
            const result = (0, islandRunContractV2EssenceBuild_1.spendIslandRunContractV2EssenceOnStopBuild)({
                islandRunContractV2Enabled: true,
                stopIndex: 0,
                spendAmount: 6,
                essence: 10,
                essenceLifetimeSpent: 2,
                stopBuildStateByIndex: BASE_BUILD_STATES,
                stopStatesByIndex: BASE_STOP_STATES,
                effectiveIslandNumber: EFFECTIVE_ISLAND_1,
            });
            (0, testHarness_1.assertEqual)(result.spent, 6, 'Expected requested spend to be applied when balance and requirement allow');
            (0, testHarness_1.assertEqual)(result.essence, 4, 'Expected wallet to be debited');
            (0, testHarness_1.assertEqual)(result.essenceLifetimeSpent, 8, 'Expected lifetime spent ledger to increase');
            (0, testHarness_1.assertEqual)(result.stopBuildStateByIndex[0].spentEssence, 6, 'Expected build spentEssence to increment');
            (0, testHarness_1.assertEqual)(result.stopStatesByIndex[0].buildComplete, false, 'Expected buildComplete to remain false below requirement');
            (0, testHarness_1.assertEqual)(result.leveledUp, false, 'No level-up when level not fully funded');
        },
    },
    {
        name: 'v2 on: build can be funded on any stop regardless of which stop is active for objectives',
        run: () => {
            // Simulate stop 0 objective done (stop 1 is now active), but funding stop 2 (boss build).
            const statesWithObjective0 = BASE_STOP_STATES.map((s, i) => i === 0 ? { ...s, objectiveComplete: true } : s);
            const result = (0, islandRunContractV2EssenceBuild_1.spendIslandRunContractV2EssenceOnStopBuild)({
                islandRunContractV2Enabled: true,
                stopIndex: 4, // boss build — not the active objective stop
                spendAmount: 15,
                essence: 30,
                essenceLifetimeSpent: 0,
                stopBuildStateByIndex: BASE_BUILD_STATES,
                stopStatesByIndex: statesWithObjective0,
                effectiveIslandNumber: EFFECTIVE_ISLAND_1,
            });
            (0, testHarness_1.assertEqual)(result.spent > 0, true, 'Expected build spend to succeed on any stop');
            (0, testHarness_1.assertEqual)(result.stopBuildStateByIndex[0].spentEssence, 0, 'Other stops unchanged');
        },
    },
    {
        name: 'v2 on: completing a build level advances buildLevel and resets progress counter',
        run: () => {
            const result = (0, islandRunContractV2EssenceBuild_1.spendIslandRunContractV2EssenceOnStopBuild)({
                islandRunContractV2Enabled: true,
                stopIndex: 0,
                spendAmount: 9999, // overspend — clamps to remaining
                essence: 9999,
                essenceLifetimeSpent: 0,
                stopBuildStateByIndex: BASE_BUILD_STATES, // requiredEssence: 20
                stopStatesByIndex: BASE_STOP_STATES,
                effectiveIslandNumber: EFFECTIVE_ISLAND_1,
            });
            (0, testHarness_1.assertEqual)(result.spent, 20, 'Expected spend to clamp at level requirement');
            (0, testHarness_1.assertEqual)(result.leveledUp, true, 'Expected level-up flag when level completes');
            (0, testHarness_1.assertEqual)(result.stopBuildStateByIndex[0].buildLevel, 1, 'Expected buildLevel to increment to 1');
            (0, testHarness_1.assertEqual)(result.stopBuildStateByIndex[0].spentEssence, 0, 'Expected spentEssence to reset after level-up');
            (0, testHarness_1.assertEqual)(result.stopStatesByIndex[0].buildComplete, false, 'buildComplete stays false — only L1 done, not all levels');
        },
    },
    {
        name: 'v2 on: buildComplete only flips when ALL build levels (MAX_BUILD_LEVEL) are complete',
        run: () => {
            // Simulate a stop at level MAX_BUILD_LEVEL - 1 with 1 essence left to finish.
            const nearlyDone = BASE_BUILD_STATES.map((s, i) => i === 0 ? { requiredEssence: 10, spentEssence: 0, buildLevel: islandRunContractV2EssenceBuild_1.MAX_BUILD_LEVEL - 1 } : s);
            const result = (0, islandRunContractV2EssenceBuild_1.spendIslandRunContractV2EssenceOnStopBuild)({
                islandRunContractV2Enabled: true,
                stopIndex: 0,
                spendAmount: 9999,
                essence: 9999,
                essenceLifetimeSpent: 0,
                stopBuildStateByIndex: nearlyDone,
                stopStatesByIndex: BASE_STOP_STATES,
                effectiveIslandNumber: EFFECTIVE_ISLAND_1,
            });
            (0, testHarness_1.assertEqual)(result.stopBuildStateByIndex[0].buildLevel, islandRunContractV2EssenceBuild_1.MAX_BUILD_LEVEL, 'Expected final build level');
            (0, testHarness_1.assertEqual)(result.stopStatesByIndex[0].buildComplete, true, 'Expected buildComplete = true only at MAX_BUILD_LEVEL');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.isStopBuildFullyComplete)(result.stopBuildStateByIndex[0]), true, 'isStopBuildFullyComplete should return true');
        },
    },
    {
        name: 'v2 on: stop sequencing advances on objective completion alone (build does not gate unlock)',
        run: () => {
            const objectiveDoneNoBuild = (0, islandRunContractV2StopResolver_1.resolveIslandRunContractV2Stops)({
                stopStatesByIndex: [
                    { objectiveComplete: true, buildComplete: false },
                    ...BASE_STOP_STATES.slice(1),
                ],
            });
            (0, testHarness_1.assertEqual)(objectiveDoneNoBuild.activeStopIndex, 1, 'Expected stop 1 to become active once stop 0 objective is done, even without build');
            (0, testHarness_1.assertDeepEqual)(objectiveDoneNoBuild.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected stop 0 completed status and stop 1 active without build requirement');
        },
    },
    {
        name: 'v2 on: island full clear requires all objectives + all builds at MAX + hatchery egg resolved',
        run: () => {
            const allObjectivesDone = Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: false }));
            // Objectives done, no builds, no egg → NOT cleared
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.isIslandRunFullyClearedV2)({
                stopStatesByIndex: allObjectivesDone,
                stopBuildStateByIndex: BASE_BUILD_STATES,
                hatcheryEggResolved: false,
            }), false, 'Expected not cleared: egg not resolved, no builds');
            // Objectives done, builds done, no egg → NOT cleared
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.isIslandRunFullyClearedV2)({
                stopStatesByIndex: allObjectivesDone,
                stopBuildStateByIndex: FULL_BUILD_STATES,
                hatcheryEggResolved: false,
            }), false, 'Expected not cleared: egg not resolved');
            // Objectives done, egg done, no builds → NOT cleared
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.isIslandRunFullyClearedV2)({
                stopStatesByIndex: allObjectivesDone,
                stopBuildStateByIndex: BASE_BUILD_STATES,
                hatcheryEggResolved: true,
            }), false, 'Expected not cleared: builds not done');
            // All three conditions met → CLEARED
            (0, testHarness_1.assertEqual)((0, islandRunContractV2StopResolver_1.isIslandRunFullyClearedV2)({
                stopStatesByIndex: allObjectivesDone,
                stopBuildStateByIndex: FULL_BUILD_STATES,
                hatcheryEggResolved: true,
            }), true, 'Expected island fully cleared when all objectives, builds, and egg resolved');
        },
    },
    {
        name: 'v2 off: essence/build helpers preserve legacy values unchanged',
        run: () => {
            const earned = (0, islandRunContractV2EssenceBuild_1.awardIslandRunContractV2Essence)({
                islandRunContractV2Enabled: false,
                essence: 10,
                essenceLifetimeEarned: 30,
                amount: 8,
            });
            (0, testHarness_1.assertEqual)(earned.essence, 10, 'Expected legacy mode to ignore essence earn path');
            (0, testHarness_1.assertEqual)(earned.essenceLifetimeEarned, 30, 'Expected legacy mode to preserve earned ledger');
            const spent = (0, islandRunContractV2EssenceBuild_1.spendIslandRunContractV2EssenceOnStopBuild)({
                islandRunContractV2Enabled: false,
                stopIndex: 0,
                spendAmount: 5,
                essence: 10,
                essenceLifetimeSpent: 4,
                stopBuildStateByIndex: BASE_BUILD_STATES,
                stopStatesByIndex: BASE_STOP_STATES,
                effectiveIslandNumber: EFFECTIVE_ISLAND_1,
            });
            (0, testHarness_1.assertEqual)(spent.spent, 0, 'Expected legacy mode to bypass v2 spend path');
            (0, testHarness_1.assertEqual)(spent.essence, 10, 'Expected legacy mode to keep essence unchanged');
            (0, testHarness_1.assertEqual)(spent.essenceLifetimeSpent, 4, 'Expected legacy mode to keep spend ledger unchanged');
        },
    },
    {
        name: 'island essence multiplier scales 1.5x every 10 islands',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getIslandEssenceMultiplier)(1), 1, 'Island 1 multiplier should be 1.0');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getIslandEssenceMultiplier)(10), 1, 'Island 10 still tier 0');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getIslandEssenceMultiplier)(11), 1.5, 'Island 11 enters tier 1 = 1.5');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2EssenceBuild_1.getIslandEssenceMultiplier)(21), 1.5 * 1.5, 'Island 21 enters tier 2');
        },
    },
    {
        name: 'stop upgrade cost scales with stop index and island number',
        run: () => {
            const cost1 = (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 });
            (0, testHarness_1.assertEqual)(cost1, 50, 'Island 1 Stop 0 L1 should be base cost 50');
            const costBoss = (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 1, stopIndex: 4, currentBuildLevel: 0 });
            (0, testHarness_1.assertEqual)(costBoss, 200, 'Island 1 Boss Stop L1 should be 4× base = 200');
            const costIsland11 = (0, islandRunContractV2EssenceBuild_1.getStopUpgradeCost)({ islandNumber: 11, stopIndex: 0, currentBuildLevel: 0 });
            (0, testHarness_1.assertEqual)(costIsland11, 75, 'Island 11 Stop 0 L1 should be 50 × 1.5 = 75');
        },
    },
    {
        name: 'island total essence cost sums all stops and levels',
        run: () => {
            const total = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(1);
            (0, testHarness_1.assertEqual)(total > 0, true, 'Total cost for island 1 should be positive');
            const total11 = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(11);
            (0, testHarness_1.assertEqual)(total11 > total, true, 'Island 11 total should exceed island 1 total due to scaling');
        },
    },
    {
        name: 'essence drift decays excess above threshold',
        run: () => {
            const islandCost = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(1);
            const threshold = Math.floor(islandCost * 1.5); // ESSENCE_DRIFT_THRESHOLD_RATIO
            const noDrift = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({ essence: threshold, islandNumber: 1, elapsedMs: 60 * 60 * 1000 });
            (0, testHarness_1.assertEqual)(noDrift.driftLost, 0, 'No drift at or below threshold');
            const highEssence = threshold + 1000;
            const drifted = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({ essence: highEssence, islandNumber: 1, elapsedMs: 60 * 60 * 1000 });
            (0, testHarness_1.assertEqual)(drifted.driftLost > 0, true, 'Should lose essence when above threshold');
            (0, testHarness_1.assertEqual)(drifted.essence, highEssence - drifted.driftLost, 'Remaining should equal original minus lost');
            (0, testHarness_1.assertEqual)(drifted.essence >= threshold, true, 'Should never decay below threshold');
        },
    },
    {
        name: 'essence drift zero elapsed yields no loss',
        run: () => {
            const islandCost = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(1);
            const threshold = Math.floor(islandCost * 1.5);
            const result = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({ essence: threshold + 500, islandNumber: 1, elapsedMs: 0 });
            (0, testHarness_1.assertEqual)(result.driftLost, 0, 'No drift when no time has passed');
        },
    },
    {
        name: 'essence drift suppressed when island is complete',
        run: () => {
            const islandCost = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(1);
            const highEssence = islandCost * 2; // far above threshold
            const result = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({ essence: highEssence, islandNumber: 1, elapsedMs: 60 * 60 * 1000, isIslandComplete: true });
            (0, testHarness_1.assertEqual)(result.driftLost, 0, 'No drift when island is complete');
            (0, testHarness_1.assertEqual)(result.essence, highEssence, 'Essence unchanged when island is complete');
        },
    },
    {
        // P1-12 regression. Before the fix, `remainingIslandCost: 0` combined with
        // `Math.max(1, …)` collapsed the drift threshold to `1.5 × 1 = 1`, so the
        // player's entire wallet above 1 essence was "excess" and drifted every
        // hour. That's the exact inverse of the contract's "nothing left to build
        // → no drift" rule. The L3/L3/L3/L3/L3 state is reachable naturally:
        // fully-funded island where the player is still resolving objectives
        // (e.g., hatching the egg, beating the boss) before `isIslandComplete`
        // flips. This case locks that door shut.
        name: 'P1-12: no drift when remainingIslandCost is 0 (all buildings L3 but objectives not yet flipped)',
        run: () => {
            const islandCost = (0, islandRunContractV2EssenceBuild_1.getIslandTotalEssenceCost)(1);
            const highEssence = islandCost * 10; // 10× the island cost — way above the old collapsed threshold
            const result = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({
                essence: highEssence,
                islandNumber: 1,
                elapsedMs: 24 * 60 * 60 * 1000, // 24h of "drift time"
                remainingIslandCost: 0, // fully built out
                // Note: isIslandComplete deliberately false to simulate the window
                // where all 5 buildings are L3 but the egg / boss / final objective
                // hasn't flipped the island-complete flag yet.
            });
            (0, testHarness_1.assertEqual)(result.driftLost, 0, 'No drift when remainingIslandCost is 0');
            (0, testHarness_1.assertEqual)(result.essence, highEssence, 'Essence unchanged when nothing is left to build');
        },
    },
    {
        name: 'P1-12: negative remainingIslandCost is also treated as fully built out',
        run: () => {
            // Defensive — should never happen, but if a buggy caller passes a
            // negative value the drift must not silently flip to "drain everything"
            // as it did with the old clamp semantics.
            const result = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({
                essence: 50000,
                islandNumber: 1,
                elapsedMs: 72 * 60 * 60 * 1000,
                remainingIslandCost: -42,
            });
            (0, testHarness_1.assertEqual)(result.driftLost, 0, 'No drift when remainingIslandCost is negative');
            (0, testHarness_1.assertEqual)(result.essence, 50000, 'Essence unchanged on negative remaining cost');
        },
    },
];
