import {
  awardIslandRunContractV2Essence,
  canIslandRunContractV2CompleteStop,
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
      assertEqual(resolveIslandRunContractV2EssenceEarnForTile('currency'), 2, 'Expected currency tile essence amount');
      assertEqual(resolveIslandRunContractV2EssenceEarnForTile('chest'), 4, 'Expected chest tile essence amount');
      assertEqual(resolveIslandRunContractV2EssenceEarnForTile('unknown_tile'), 0, 'Expected unknown tile to award zero essence');
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
];
