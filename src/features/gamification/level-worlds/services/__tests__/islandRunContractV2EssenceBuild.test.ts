import {
  applyEssenceDrift,
  awardIslandRunContractV2Essence,
  getEffectiveIslandNumber,
  getIslandEssenceMultiplier,
  getIslandTotalEssenceCost,
  getStopUpgradeCost,
  initStopBuildStatesForIsland,
  isStopBuildFullyComplete,
  MAX_BUILD_LEVEL,
  resolveIslandRunContractV2EssenceEarnForTile,
  spendIslandRunContractV2EssenceOnStopBuild,
} from '../islandRunContractV2EssenceBuild';
import {
  isIslandRunFullyClearedV2,
  resolveIslandRunContractV2Stops,
} from '../islandRunContractV2StopResolver';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const EFFECTIVE_ISLAND_1 = 1; // cycle 0, island 1

const BASE_STOP_STATES = [
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
];

/** Build states as initialized for island 1 via initStopBuildStatesForIsland. */
const ISLAND1_BUILD_STATES = initStopBuildStatesForIsland(EFFECTIVE_ISLAND_1);

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
  buildLevel: MAX_BUILD_LEVEL,
}));

export const islandRunContractV2EssenceBuildTests: TestCase[] = [
  {
    name: 'v2 on: essence can be earned via explicit board-loop earn call',
    run: () => {
      const result = awardIslandRunContractV2Essence({
        islandRunContractV2Enabled: true,
        essence: 3,
        essenceLifetimeEarned: 7,
        amount: 5,
      });

      assertEqual(result.essence, 8, 'Expected essence wallet to increase by earned amount');
      assertEqual(result.essenceLifetimeEarned, 12, 'Expected lifetime earned to increase by earned amount');
      assertEqual(result.earned, 5, 'Expected deterministic earned value');
    },
  },
  {
    name: 'v2 board wiring: tile landing earn source resolves deterministic essence amount',
    run: () => {
      const fixedSeed = 42;
      const currencyResult = resolveIslandRunContractV2EssenceEarnForTile('currency', { islandNumber: 1, seed: fixedSeed });
      assertEqual(currencyResult >= 5 && currencyResult <= 15, true, 'Expected currency tile in range 5-15 for island 1');
      const chestResult = resolveIslandRunContractV2EssenceEarnForTile('chest', { islandNumber: 1, seed: fixedSeed });
      assertEqual(chestResult >= 20 && chestResult <= 40, true, 'Expected chest tile in range 20-40 for island 1');
      assertEqual(resolveIslandRunContractV2EssenceEarnForTile('unknown_tile'), 0, 'Expected unknown tile to award zero essence');
      const repeatResult = resolveIslandRunContractV2EssenceEarnForTile('currency', { islandNumber: 1, seed: fixedSeed });
      assertEqual(repeatResult, currencyResult, 'Expected deterministic results with same seed');
    },
  },
  {
    name: 'effective island number combines cycle and island for scaling',
    run: () => {
      assertEqual(getEffectiveIslandNumber(1, 0), 1, 'Cycle 0 island 1 → effective 1');
      assertEqual(getEffectiveIslandNumber(1, 1), 121, 'Cycle 1 island 1 → effective 121');
      assertEqual(getEffectiveIslandNumber(120, 1), 240, 'Cycle 1 island 120 → effective 240');
      const costCycle0 = getStopUpgradeCost({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 });
      const costCycle1 = getStopUpgradeCost({ islandNumber: 121, stopIndex: 0, currentBuildLevel: 0 });
      assertEqual(costCycle1 > costCycle0, true, 'Cycle 1 island 1 build costs higher than cycle 0 island 1');
    },
  },
  {
    name: 'initStopBuildStatesForIsland seeds correct costs for all 5 stops',
    run: () => {
      const states = initStopBuildStatesForIsland(1);
      assertEqual(states.length, 5, 'Expected 5 stop build states');
      assertEqual(states[0].spentEssence, 0, 'Fresh state: nothing spent');
      assertEqual(states[0].buildLevel, 0, 'Fresh state: build level 0');
      assertEqual(states[0].requiredEssence, getStopUpgradeCost({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 }), 'Stop 0 cost matches getStopUpgradeCost');
      assertEqual(states[4].requiredEssence, getStopUpgradeCost({ islandNumber: 1, stopIndex: 4, currentBuildLevel: 0 }), 'Boss stop cost matches getStopUpgradeCost');
    },
  },
  {
    name: 'v2 on: spending essence updates stop build progress without affecting stop sequencing',
    run: () => {
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 0,
        spendAmount: 6,
        essence: 10,
        essenceLifetimeSpent: 2,
        stopBuildStateByIndex: BASE_BUILD_STATES,
        stopStatesByIndex: BASE_STOP_STATES,
        effectiveIslandNumber: EFFECTIVE_ISLAND_1,
      });

      assertEqual(result.spent, 6, 'Expected requested spend to be applied when balance and requirement allow');
      assertEqual(result.essence, 4, 'Expected wallet to be debited');
      assertEqual(result.essenceLifetimeSpent, 8, 'Expected lifetime spent ledger to increase');
      assertEqual(result.stopBuildStateByIndex[0].spentEssence, 6, 'Expected build spentEssence to increment');
      assertEqual(result.stopStatesByIndex[0].buildComplete, false, 'Expected buildComplete to remain false below requirement');
      assertEqual(result.leveledUp, false, 'No level-up when level not fully funded');
    },
  },
  {
    name: 'v2 on: build can be funded on any stop regardless of which stop is active for objectives',
    run: () => {
      // Simulate stop 0 objective done (stop 1 is now active), but funding stop 2 (boss build).
      const statesWithObjective0 = BASE_STOP_STATES.map((s, i) =>
        i === 0 ? { ...s, objectiveComplete: true } : s,
      );
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 4, // boss build — not the active objective stop
        spendAmount: 15,
        essence: 30,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: BASE_BUILD_STATES,
        stopStatesByIndex: statesWithObjective0,
        effectiveIslandNumber: EFFECTIVE_ISLAND_1,
      });
      assertEqual(result.spent > 0, true, 'Expected build spend to succeed on any stop');
      assertEqual(result.stopBuildStateByIndex[0].spentEssence, 0, 'Other stops unchanged');
    },
  },
  {
    name: 'v2 on: completing a build level advances buildLevel and resets progress counter',
    run: () => {
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 0,
        spendAmount: 9999, // overspend — clamps to remaining
        essence: 9999,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: BASE_BUILD_STATES, // requiredEssence: 20
        stopStatesByIndex: BASE_STOP_STATES,
        effectiveIslandNumber: EFFECTIVE_ISLAND_1,
      });

      assertEqual(result.spent, 20, 'Expected spend to clamp at level requirement');
      assertEqual(result.leveledUp, true, 'Expected level-up flag when level completes');
      assertEqual(result.stopBuildStateByIndex[0].buildLevel, 1, 'Expected buildLevel to increment to 1');
      assertEqual(result.stopBuildStateByIndex[0].spentEssence, 0, 'Expected spentEssence to reset after level-up');
      assertEqual(result.stopStatesByIndex[0].buildComplete, false, 'buildComplete stays false — only L1 done, not all levels');
    },
  },
  {
    name: 'v2 on: buildComplete only flips when ALL build levels (MAX_BUILD_LEVEL) are complete',
    run: () => {
      // Simulate a stop at level MAX_BUILD_LEVEL - 1 with 1 essence left to finish.
      const nearlyDone = BASE_BUILD_STATES.map((s, i) =>
        i === 0 ? { requiredEssence: 10, spentEssence: 0, buildLevel: MAX_BUILD_LEVEL - 1 } : s,
      );
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 0,
        spendAmount: 9999,
        essence: 9999,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: nearlyDone,
        stopStatesByIndex: BASE_STOP_STATES,
        effectiveIslandNumber: EFFECTIVE_ISLAND_1,
      });

      assertEqual(result.stopBuildStateByIndex[0].buildLevel, MAX_BUILD_LEVEL, 'Expected final build level');
      assertEqual(result.stopStatesByIndex[0].buildComplete, true, 'Expected buildComplete = true only at MAX_BUILD_LEVEL');
      assertEqual(isStopBuildFullyComplete(result.stopBuildStateByIndex[0]), true, 'isStopBuildFullyComplete should return true');
    },
  },
  {
    name: 'v2 on: stop sequencing advances on objective completion alone (build does not gate unlock)',
    run: () => {
      const objectiveDoneNoBuild = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          ...BASE_STOP_STATES.slice(1),
        ],
      });
      assertEqual(objectiveDoneNoBuild.activeStopIndex, 1, 'Expected stop 1 to become active once stop 0 objective is done, even without build');
      assertDeepEqual(
        objectiveDoneNoBuild.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Expected stop 0 completed status and stop 1 active without build requirement',
      );
    },
  },
  {
    name: 'v2 on: island full clear requires all objectives + all builds at MAX + hatchery egg resolved',
    run: () => {
      const allObjectivesDone = Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: false }));

      // Objectives done, no builds, no egg → NOT cleared
      assertEqual(
        isIslandRunFullyClearedV2({
          stopStatesByIndex: allObjectivesDone,
          stopBuildStateByIndex: BASE_BUILD_STATES,
          hatcheryEggResolved: false,
        }),
        false,
        'Expected not cleared: egg not resolved, no builds',
      );

      // Objectives done, builds done, no egg → NOT cleared
      assertEqual(
        isIslandRunFullyClearedV2({
          stopStatesByIndex: allObjectivesDone,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: false,
        }),
        false,
        'Expected not cleared: egg not resolved',
      );

      // Objectives done, egg done, no builds → NOT cleared
      assertEqual(
        isIslandRunFullyClearedV2({
          stopStatesByIndex: allObjectivesDone,
          stopBuildStateByIndex: BASE_BUILD_STATES,
          hatcheryEggResolved: true,
        }),
        false,
        'Expected not cleared: builds not done',
      );

      // All three conditions met → CLEARED
      assertEqual(
        isIslandRunFullyClearedV2({
          stopStatesByIndex: allObjectivesDone,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
        }),
        true,
        'Expected island fully cleared when all objectives, builds, and egg resolved',
      );
    },
  },
  {
    name: 'v2 off: essence/build helpers preserve legacy values unchanged',
    run: () => {
      const earned = awardIslandRunContractV2Essence({
        islandRunContractV2Enabled: false,
        essence: 10,
        essenceLifetimeEarned: 30,
        amount: 8,
      });
      assertEqual(earned.essence, 10, 'Expected legacy mode to ignore essence earn path');
      assertEqual(earned.essenceLifetimeEarned, 30, 'Expected legacy mode to preserve earned ledger');

      const spent = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: false,
        stopIndex: 0,
        spendAmount: 5,
        essence: 10,
        essenceLifetimeSpent: 4,
        stopBuildStateByIndex: BASE_BUILD_STATES,
        stopStatesByIndex: BASE_STOP_STATES,
        effectiveIslandNumber: EFFECTIVE_ISLAND_1,
      });
      assertEqual(spent.spent, 0, 'Expected legacy mode to bypass v2 spend path');
      assertEqual(spent.essence, 10, 'Expected legacy mode to keep essence unchanged');
      assertEqual(spent.essenceLifetimeSpent, 4, 'Expected legacy mode to keep spend ledger unchanged');
    },
  },
  {
    name: 'island essence multiplier scales 1.5x every 10 islands',
    run: () => {
      assertEqual(getIslandEssenceMultiplier(1), 1, 'Island 1 multiplier should be 1.0');
      assertEqual(getIslandEssenceMultiplier(10), 1, 'Island 10 still tier 0');
      assertEqual(getIslandEssenceMultiplier(11), 1.5, 'Island 11 enters tier 1 = 1.5');
      assertEqual(getIslandEssenceMultiplier(21), 1.5 * 1.5, 'Island 21 enters tier 2');
    },
  },
  {
    name: 'stop upgrade cost scales with stop index and island number',
    run: () => {
      const cost1 = getStopUpgradeCost({ islandNumber: 1, stopIndex: 0, currentBuildLevel: 0 });
      assertEqual(cost1, 50, 'Island 1 Stop 0 L1 should be base cost 50');
      const costBoss = getStopUpgradeCost({ islandNumber: 1, stopIndex: 4, currentBuildLevel: 0 });
      assertEqual(costBoss, 200, 'Island 1 Boss Stop L1 should be 4× base = 200');
      const costIsland11 = getStopUpgradeCost({ islandNumber: 11, stopIndex: 0, currentBuildLevel: 0 });
      assertEqual(costIsland11, 75, 'Island 11 Stop 0 L1 should be 50 × 1.5 = 75');
    },
  },
  {
    name: 'island total essence cost sums all stops and levels',
    run: () => {
      const total = getIslandTotalEssenceCost(1);
      assertEqual(total > 0, true, 'Total cost for island 1 should be positive');
      const total11 = getIslandTotalEssenceCost(11);
      assertEqual(total11 > total, true, 'Island 11 total should exceed island 1 total due to scaling');
    },
  },
  {
    name: 'essence drift decays excess above threshold',
    run: () => {
      const islandCost = getIslandTotalEssenceCost(1);
      const threshold = Math.floor(islandCost * 1.5); // ESSENCE_DRIFT_THRESHOLD_RATIO
      const noDrift = applyEssenceDrift({ essence: threshold, islandNumber: 1, elapsedMs: 60 * 60 * 1000 });
      assertEqual(noDrift.driftLost, 0, 'No drift at or below threshold');
      const highEssence = threshold + 1000;
      const drifted = applyEssenceDrift({ essence: highEssence, islandNumber: 1, elapsedMs: 60 * 60 * 1000 });
      assertEqual(drifted.driftLost > 0, true, 'Should lose essence when above threshold');
      assertEqual(drifted.essence, highEssence - drifted.driftLost, 'Remaining should equal original minus lost');
      assertEqual(drifted.essence >= threshold, true, 'Should never decay below threshold');
    },
  },
  {
    name: 'essence drift zero elapsed yields no loss',
    run: () => {
      const islandCost = getIslandTotalEssenceCost(1);
      const threshold = Math.floor(islandCost * 1.5);
      const result = applyEssenceDrift({ essence: threshold + 500, islandNumber: 1, elapsedMs: 0 });
      assertEqual(result.driftLost, 0, 'No drift when no time has passed');
    },
  },
  {
    name: 'essence drift suppressed when island is complete',
    run: () => {
      const islandCost = getIslandTotalEssenceCost(1);
      const highEssence = islandCost * 2; // far above threshold
      const result = applyEssenceDrift({ essence: highEssence, islandNumber: 1, elapsedMs: 60 * 60 * 1000, isIslandComplete: true });
      assertEqual(result.driftLost, 0, 'No drift when island is complete');
      assertEqual(result.essence, highEssence, 'Essence unchanged when island is complete');
    },
  },
];
