/**
 * Phase 1 consolidation-plan tests. See
 * `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §12 Phase 1 and §9.
 */
import {
  getIslandRunFeatureFlags,
  isIslandRunFeatureEnabled,
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import { generateIslandStopPlan } from '../islandRunStops';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const minigameConsolidationPhase1Tests: TestCase[] = [
  {
    name: 'feature flags: every flag defaults to false',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const flags = getIslandRunFeatureFlags();
      assertDeepEqual(
        flags,
        {
          islandRunEventEngineEnabled: false,
          islandRunShooterBlitzBossEnabled: false,
          islandRunTaskTowerMysteryEnabled: false,
          islandRunVisionQuestMysteryEnabled: false,
          islandRunPartnerWheelEnabled: false,
          todaysOfferSpinEntryEnabled: false,
        },
        'All feature flags must default to false so adding a flag cannot change behavior',
      );
    },
  },
  {
    name: 'isIslandRunFeatureEnabled reflects overlay merges',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(isIslandRunFeatureEnabled('islandRunTaskTowerMysteryEnabled'), false, 'default off');
      __setIslandRunFeatureFlagsForTests({ islandRunTaskTowerMysteryEnabled: true });
      assertEqual(isIslandRunFeatureEnabled('islandRunTaskTowerMysteryEnabled'), true, 'flipped on by overlay');
      assertEqual(
        isIslandRunFeatureEnabled('islandRunVisionQuestMysteryEnabled'),
        false,
        'other flags untouched',
      );
      __resetIslandRunFeatureFlagsForTests();
    },
  },
  {
    name: 'mystery pool ignores task_tower / vision_quest while their flags are off',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      // Walk the first 200 islands — the seeded PRNG should cover the whole pool.
      for (let island = 1; island <= 200; island += 1) {
        const plan = generateIslandStopPlan(island);
        const mystery = plan.find((stop) => stop.stopId === 'mystery');
        assert(mystery, `island ${island}: mystery stop missing`);
        const kind = mystery!.mysteryContentKind;
        assert(
          kind === 'breathing' || kind === 'habit_action' || kind === 'checkin_reflection',
          `island ${island}: unexpected mystery kind "${kind}" while flags are off`,
        );
      }
    },
  },
  {
    name: 'enabling the task_tower flag admits task_tower into the mystery pool',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunTaskTowerMysteryEnabled: true });
      let sawTaskTower = false;
      for (let island = 1; island <= 400 && !sawTaskTower; island += 1) {
        const plan = generateIslandStopPlan(island);
        const mystery = plan.find((stop) => stop.stopId === 'mystery');
        if (mystery?.mysteryContentKind === 'task_tower') sawTaskTower = true;
      }
      assert(sawTaskTower, 'task_tower should appear at least once across 400 islands when its flag is on');
      __resetIslandRunFeatureFlagsForTests();
    },
  },
  {
    name: 'enabling the vision_quest flag admits vision_quest into the mystery pool',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunVisionQuestMysteryEnabled: true });
      let sawVisionQuest = false;
      for (let island = 1; island <= 400 && !sawVisionQuest; island += 1) {
        const plan = generateIslandStopPlan(island);
        const mystery = plan.find((stop) => stop.stopId === 'mystery');
        if (mystery?.mysteryContentKind === 'vision_quest') sawVisionQuest = true;
      }
      assert(sawVisionQuest, 'vision_quest should appear at least once across 400 islands when its flag is on');
      __resetIslandRunFeatureFlagsForTests();
    },
  },
];
