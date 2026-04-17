import {
  applyEssenceDrift,
  awardIslandRunContractV2Essence,
  canIslandRunContractV2CompleteStop,
  getIslandEssenceMultiplier,
  getIslandTotalEssenceCost,
  getStopUpgradeCost,
  isIslandRunContractV2BuildPanelVisibleForStop,
  resolveIslandRunContractV2EssenceEarnForTile,
  spendIslandRunContractV2EssenceOnStopBuild,
} from '../islandRunContractV2EssenceBuild';
import { resolveIslandRunContractV2Stops } from '../islandRunContractV2StopResolver';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const BASE_STOP_STATES = [
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
  { objectiveComplete: false, buildComplete: false },
];

const BASE_BUILD_STATES = [
  { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
  { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
  { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
  { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
  { requiredEssence: 20, spentEssence: 0, buildLevel: 0 },
];

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
      // With the Monopoly GO-style range system, we test that:
      // 1. Known tiles return a positive value within the expected range
      // 2. Unknown tiles return 0
      // 3. Results are deterministic given the same seed
      const fixedSeed = 42;
      const currencyResult = resolveIslandRunContractV2EssenceEarnForTile('currency', { islandNumber: 1, seed: fixedSeed });
      assertEqual(currencyResult >= 5 && currencyResult <= 15, true, 'Expected currency tile in range 5-15 for island 1');
      const chestResult = resolveIslandRunContractV2EssenceEarnForTile('chest', { islandNumber: 1, seed: fixedSeed });
      assertEqual(chestResult >= 20 && chestResult <= 40, true, 'Expected chest tile in range 20-40 for island 1');
      assertEqual(resolveIslandRunContractV2EssenceEarnForTile('unknown_tile'), 0, 'Expected unknown tile to award zero essence');
      // Determinism: same seed → same result
      const repeatResult = resolveIslandRunContractV2EssenceEarnForTile('currency', { islandNumber: 1, seed: fixedSeed });
      assertEqual(repeatResult, currencyResult, 'Expected deterministic results with same seed');
    },
  },
  {
    name: 'v2 on: spending essence updates explicit stop build progress only',
    run: () => {
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 0,
        spendAmount: 6,
        essence: 10,
        essenceLifetimeSpent: 2,
        stopBuildStateByIndex: BASE_BUILD_STATES,
        stopStatesByIndex: BASE_STOP_STATES,
      });

      assertEqual(result.spent, 6, 'Expected requested spend to be applied when balance and requirement allow');
      assertEqual(result.essence, 4, 'Expected wallet to be debited');
      assertEqual(result.essenceLifetimeSpent, 8, 'Expected lifetime spent ledger to increase');
      assertEqual(result.stopBuildStateByIndex[0].spentEssence, 6, 'Expected explicit build spentEssence to increment');
      assertEqual(result.stopStatesByIndex[0].buildComplete, false, 'Expected build gate to remain false below requirement');
    },
  },
  {
    name: 'v2 board wiring: build panel visibility hard-locks to active stop index',
    run: () => {
      assertEqual(
        isIslandRunContractV2BuildPanelVisibleForStop({
          islandRunContractV2Enabled: true,
          openedStopIndex: 2,
          activeStopIndex: 2,
        }),
        true,
        'Expected build panel to render for active stop',
      );
      assertEqual(
        isIslandRunContractV2BuildPanelVisibleForStop({
          islandRunContractV2Enabled: true,
          openedStopIndex: 1,
          activeStopIndex: 2,
        }),
        false,
        'Expected build panel to stay hidden for non-active stop',
      );
    },
  },
  {
    name: 'v2 on: buildComplete flips only when spentEssence reaches requiredEssence',
    run: () => {
      const result = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: true,
        stopIndex: 0,
        spendAmount: 25,
        essence: 40,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: BASE_BUILD_STATES,
        stopStatesByIndex: BASE_STOP_STATES,
      });

      assertEqual(result.spent, 20, 'Expected spend to clamp at remaining requiredEssence');
      assertEqual(result.stopBuildStateByIndex[0].spentEssence, 20, 'Expected build spend to hit requirement exactly');
      assertEqual(result.stopStatesByIndex[0].buildComplete, true, 'Expected buildComplete only when requirement is met');
    },
  },
  {
    name: 'v2 on: stop remains active until both objective and build gates are true',
    run: () => {
      const unresolved = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          ...BASE_STOP_STATES.slice(1),
        ],
      });
      assertEqual(unresolved.activeStopIndex, 0, 'Expected stop 0 to remain active when objective complete but build incomplete');

      const resolved = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          ...BASE_STOP_STATES.slice(1),
        ],
      });
      assertDeepEqual(resolved.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected sequential unlock only after both gates pass');
    },
  },
  {
    name: 'v2 board wiring: boss clear eligibility requires objective + build dual gate',
    run: () => {
      const bossBlocked = canIslandRunContractV2CompleteStop({
        islandRunContractV2Enabled: true,
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: false },
        ],
        stopIndex: 4,
      });
      assertEqual(bossBlocked, false, 'Expected boss stop to remain incomplete until build gate is complete');

      const bossAllowed = canIslandRunContractV2CompleteStop({
        islandRunContractV2Enabled: true,
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
        ],
        stopIndex: 4,
      });
      assertEqual(bossAllowed, true, 'Expected boss stop to allow clear only after both gates complete');
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
    name: 'essence drift decays excess above 80% threshold',
    run: () => {
      const islandCost = getIslandTotalEssenceCost(1);
      const threshold = Math.floor(islandCost * 0.8);
      // Essence at threshold → no drift
      const noDrift = applyEssenceDrift({ essence: threshold, islandNumber: 1, elapsedMs: 60 * 60 * 1000 });
      assertEqual(noDrift.driftLost, 0, 'No drift at or below threshold');
      // Essence above threshold → loses some
      const highEssence = threshold + 100;
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
      const threshold = Math.floor(islandCost * 0.8);
      const result = applyEssenceDrift({ essence: threshold + 500, islandNumber: 1, elapsedMs: 0 });
      assertEqual(result.driftLost, 0, 'No drift when no time has passed');
    },
  },
];
