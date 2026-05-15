/**
 * Phase 5 consolidation-plan tests — Mystery minigame launch + stop completion
 * contract for Task Tower and Vision Quest.
 */
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import {
  resolveMysteryStopMinigame,
  shouldResolveMysteryStopOnMinigameComplete,
} from '../islandRunMinigameLauncherService';
import { resolveVisionQuestRewardRouting } from '../../../games/vision-quest/visionQuestRewardRouting';
import { generateIslandStopPlan } from '../islandRunStops';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const minigameConsolidationPhase5Tests: TestCase[] = [
  {
    name: 'resolveMysteryStopMinigame keeps vision_quest gated while flags are off',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({
        islandRunVisionQuestMysteryEnabled: false,
      });
      assertEqual(
        resolveMysteryStopMinigame({ kind: 'fixed_mystery', mysteryContentKind: 'vision_quest' }),
        null,
        'vision_quest must not launch while its flag is off',
      );
    },
  },
  {
    name: 'resolveMysteryStopMinigame launches vision_quest when the Vision Quest mystery flag is enabled',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunVisionQuestMysteryEnabled: true });
      const descriptor = resolveMysteryStopMinigame({
        kind: 'fixed_mystery',
        mysteryContentKind: 'vision_quest',
      });
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(
        descriptor?.minigameId,
        'vision_quest',
        'vision_quest mystery routes to vision_quest minigame',
      );
    },
  },
  {
    name: 'resolveMysteryStopMinigame ignores non-minigame mystery variants',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({
        islandRunVisionQuestMysteryEnabled: true,
      });
      assertEqual(
        resolveMysteryStopMinigame({ kind: 'fixed_mystery', mysteryContentKind: 'breathing' }),
        null,
        'breathing stays inline and should never route to launcher',
      );
      assertEqual(
        resolveMysteryStopMinigame({ kind: 'fixed_mystery', mysteryContentKind: 'habit_action' }),
        null,
        'habit_action stays inline and should never route to launcher',
      );
      __resetIslandRunFeatureFlagsForTests();
    },
  },
  {
    name: 'phase-5 rollout matrix: first 10 islands include vision_quest mystery variant when flag is enabled',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({
        islandRunVisionQuestMysteryEnabled: true,
      });

      const seen = new Set<string>();
      for (let island = 1; island <= 10; island += 1) {
        const mystery = generateIslandStopPlan(island).find((stop) => stop.stopId === 'mystery');
        if (!mystery?.mysteryContentKind) continue;
        seen.add(mystery.mysteryContentKind);
      }
      __resetIslandRunFeatureFlagsForTests();

      assertEqual(seen.has('vision_quest'), true, 'first 10 islands should include vision_quest in mystery rotation');
    },
  },
  {
    name: 'shouldResolveMysteryStopOnMinigameComplete only resolves stop for completed mystery vision_quest runs',
    run: () => {
      assertEqual(
        shouldResolveMysteryStopOnMinigameComplete({
          launchSource: 'mystery_stop',
          minigameId: 'vision_quest',
          completed: true,
        }),
        true,
        'completed vision_quest mystery run should resolve stop',
      );
      assertEqual(
        shouldResolveMysteryStopOnMinigameComplete({
          launchSource: 'mystery_stop',
          minigameId: 'vision_quest',
          completed: false,
        }),
        false,
        'incomplete minigame run should not resolve stop',
      );
      assertEqual(
        shouldResolveMysteryStopOnMinigameComplete({
          launchSource: 'boss_trial',
          minigameId: 'vision_quest',
          completed: true,
        }),
        false,
        'non-mystery source should not resolve mystery stop',
      );
      assertEqual(
        shouldResolveMysteryStopOnMinigameComplete({
          launchSource: 'mystery_stop',
          minigameId: 'shooter_blitz',
          completed: true,
        }),
        false,
        'unknown mystery minigame id should not auto-resolve stop',
      );
    },
  },
  {
    name: 'vision_quest reward routing suppresses legacy dice awards in island_run_landmark context',
    run: () => {
      const baseRewards = { coins: 20, dice: 4, tokens: 2 };
      const standaloneRouting = resolveVisionQuestRewardRouting({
        rewards: baseRewards,
        rewardContext: 'default',
      });
      assertDeepEqual(
        standaloneRouting.completionRewards,
        baseRewards,
        'standalone Vision Quest should keep canonical completion rewards unchanged',
      );
      assertDeepEqual(
        standaloneRouting.legacyRewards,
        baseRewards,
        'standalone Vision Quest should keep legacy reward writes enabled',
      );

      const islandRunRouting = resolveVisionQuestRewardRouting({
        rewards: baseRewards,
        rewardContext: 'island_run_landmark',
      });
      assertDeepEqual(
        islandRunRouting.completionRewards,
        { coins: 0, dice: 4, tokens: 0 },
        'Island Run Vision Quest should still return only canonical completion dice once',
      );
      assertDeepEqual(
        islandRunRouting.legacyRewards,
        { coins: 0, dice: 0, tokens: 0 },
        'Island Run Vision Quest should not also write legacy gameRewards dice',
      );
    },
  },
];
