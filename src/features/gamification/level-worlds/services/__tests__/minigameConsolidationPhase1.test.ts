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
import { hydrateIslandRunGameStateRecordWithSource } from '../islandRunGameStateStore';
import {
  ALL_MINIGAME_MANIFESTS,
  registerAllMinigameManifests,
} from '../islandRunMinigameManifests';
import { getAllMinigames, getMinigame } from '../islandRunMinigameRegistry';
import { generateIslandStopPlan } from '../islandRunStops';
import {
  assert,
  assertDeepEqual,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

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
    name: 'manifest registry includes canonical consolidation minigames and unique ids',
    run: () => {
      const manifestIds = ALL_MINIGAME_MANIFESTS.map((manifest) => manifest.id);
      const uniqueIds = new Set(manifestIds);
      assertEqual(uniqueIds.size, manifestIds.length, 'Every manifest id should be unique');
      assert(manifestIds.includes('shooter_blitz'), 'Shooter Blitz manifest should be registered');
      assert(manifestIds.includes('task_tower'), 'Task Tower manifest should be registered');
      assert(manifestIds.includes('vision_quest'), 'Vision Quest manifest should be registered');
    },
  },
  {
    name: 'registerAllMinigameManifests is idempotent and wires canonical entries into the runtime registry',
    run: () => {
      const beforeCount = getAllMinigames().length;
      registerAllMinigameManifests();
      const afterFirstPassCount = getAllMinigames().length;
      registerAllMinigameManifests();
      const afterSecondPassCount = getAllMinigames().length;
      assert(
        afterFirstPassCount >= beforeCount,
        'First registration pass should keep or increase registry size',
      );
      assertEqual(
        afterSecondPassCount,
        afterFirstPassCount,
        'Second registration pass should be a no-op',
      );
      assert(getMinigame('shooter_blitz'), 'Shooter Blitz should be present in registry');
      assert(getMinigame('task_tower'), 'Task Tower should be present in registry');
      assert(getMinigame('vision_quest'), 'Vision Quest should be present in registry');
    },
  },
  {
    name: 'runtime hydration query selects minigame_tickets_by_event column',
    run: async () => {
      installWindowWithStorage(createMemoryStorage());
      let selectColumns = '';
      const client = {
        from(tableName: string) {
          assertEqual(tableName, 'island_run_runtime_state', 'Hydration should read runtime-state table');
          return {
            select(columns: string) {
              selectColumns = columns;
              return {
                eq() {
                  return {
                    maybeSingle() {
                      return Promise.resolve({ data: null, error: null });
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const session = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'phase1-hydration-test-user', user_metadata: {} },
      } as unknown as import('@supabase/supabase-js').Session;

      await hydrateIslandRunGameStateRecordWithSource({ session, client });
      assert(
        selectColumns.includes('minigame_tickets_by_event'),
        'Hydration select-list should include minigame_tickets_by_event',
      );
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
