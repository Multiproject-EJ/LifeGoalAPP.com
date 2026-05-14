import {
  getIslandRunBuildPromptInitialTransitionTarget,
  isIslandRunBuildPromptOverlayActive,
  resolveIslandRunBuildPromptClickTransitionTargets,
  shouldIslandRunBuildPromptBlockControl,
} from '../islandRunFirstSessionTutorialUi';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunFirstSessionTutorialUiTests: TestCase[] = [
  {
    name: 'Build prompt overlay is active for the first essence reward claim state',
    run: () => {
      assert(
        isIslandRunBuildPromptOverlayActive('first_essence_reward_claimed'),
        'first_essence_reward_claimed should activate the Build prompt overlay',
      );
      assert(
        isIslandRunBuildPromptOverlayActive('build_prompt_visible'),
        'build_prompt_visible should keep the Build prompt overlay active',
      );
      assert(
        !isIslandRunBuildPromptOverlayActive('not_started'),
        'Non-tutorial players should not see the Build prompt overlay',
      );
      assert(
        !isIslandRunBuildPromptOverlayActive('complete'),
        'Completed tutorial players should not see the Build prompt overlay',
      );
    },
  },
  {
    name: 'Build prompt leaves Build clickable and blocks other gameplay controls',
    run: () => {
      assertEqual(
        shouldIslandRunBuildPromptBlockControl('first_essence_reward_claimed', 'build'),
        false,
        'Build remains clickable while the prompt is active',
      );
      assertEqual(
        shouldIslandRunBuildPromptBlockControl('first_essence_reward_claimed', 'gameplay'),
        true,
        'Gameplay controls are blocked while the prompt is active',
      );
      assertEqual(
        shouldIslandRunBuildPromptBlockControl('not_started', 'gameplay'),
        false,
        'Gameplay controls are not blocked outside the tutorial prompt',
      );
    },
  },
  {
    name: 'Build prompt uses sequential canonical tutorial transition targets',
    run: () => {
      assertEqual(
        getIslandRunBuildPromptInitialTransitionTarget('first_essence_reward_claimed'),
        'build_prompt_visible',
        'Entering the prompt advances to build_prompt_visible',
      );
      assertEqual(
        getIslandRunBuildPromptInitialTransitionTarget('build_prompt_visible'),
        null,
        'Already-visible prompt does not re-advance on render',
      );
      assertDeepEqual(
        resolveIslandRunBuildPromptClickTransitionTargets('first_essence_reward_claimed'),
        ['build_prompt_visible', 'build_modal_opened'],
        'Clicking Build from first_essence_reward_claimed can advance through both sequential states',
      );
      assertDeepEqual(
        resolveIslandRunBuildPromptClickTransitionTargets('build_prompt_visible'),
        ['build_modal_opened'],
        'Clicking Build from build_prompt_visible advances to build_modal_opened',
      );
      assertDeepEqual(
        resolveIslandRunBuildPromptClickTransitionTargets('not_started'),
        [],
        'Non-tutorial states do not advance on Build click',
      );
    },
  },
];
