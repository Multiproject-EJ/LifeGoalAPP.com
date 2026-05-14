import {
  getIslandRunBuildPromptInitialTransitionTarget,
  isIslandRunHatcheryBuildGuidanceActive,
  isIslandRunBuildPromptOverlayActive,
  resolveIslandRunBuildPromptClickTransitionTargets,
  resolveIslandRunBuildModalTutorialRowState,
  shouldIslandRunBuildPromptBlockControl,
  shouldAdvanceFirstSessionTutorialAfterHatcheryBuild,
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
  {
    name: 'Build modal tutorial guidance highlights only Hatchery and blocks other rows',
    run: () => {
      assert(
        isIslandRunHatcheryBuildGuidanceActive('build_modal_opened'),
        'build_modal_opened should activate Hatchery row guidance',
      );
      assert(
        !isIslandRunHatcheryBuildGuidanceActive('build_prompt_visible'),
        'pre-modal prompt should not activate row guidance',
      );
      assertDeepEqual(
        resolveIslandRunBuildModalTutorialRowState({
          firstSessionTutorialState: 'build_modal_opened',
          stopIndex: 0,
        }),
        { guidanceActive: true, isHighlighted: true, isUnavailable: false },
        'Hatchery row should be highlighted and available during guidance',
      );
      assertDeepEqual(
        resolveIslandRunBuildModalTutorialRowState({
          firstSessionTutorialState: 'build_modal_opened',
          stopIndex: 1,
        }),
        { guidanceActive: true, isHighlighted: false, isUnavailable: true },
        'Non-Hatchery rows should be unavailable during guidance',
      );
      assertDeepEqual(
        resolveIslandRunBuildModalTutorialRowState({
          firstSessionTutorialState: 'not_started',
          stopIndex: 1,
        }),
        { guidanceActive: false, isHighlighted: false, isUnavailable: false },
        'Non-tutorial rows should remain unchanged',
      );
    },
  },
  {
    name: 'Hatchery L1 tutorial advancement requires build_modal_opened and Hatchery level 0 to 1',
    run: () => {
      assert(
        shouldAdvanceFirstSessionTutorialAfterHatcheryBuild({
          firstSessionTutorialState: 'build_modal_opened',
          stopIndex: 0,
          previousBuildLevel: 0,
          nextBuildLevel: 1,
        }),
        'Hatchery level 0 to 1 should advance the tutorial',
      );
      assertEqual(
        shouldAdvanceFirstSessionTutorialAfterHatcheryBuild({
          firstSessionTutorialState: 'build_modal_opened',
          stopIndex: 1,
          previousBuildLevel: 0,
          nextBuildLevel: 1,
        }),
        false,
        'Other stops should not advance the Hatchery tutorial',
      );
      assertEqual(
        shouldAdvanceFirstSessionTutorialAfterHatcheryBuild({
          firstSessionTutorialState: 'not_started',
          stopIndex: 0,
          previousBuildLevel: 0,
          nextBuildLevel: 1,
        }),
        false,
        'Non-tutorial states should not advance',
      );
      assertEqual(
        shouldAdvanceFirstSessionTutorialAfterHatcheryBuild({
          firstSessionTutorialState: 'build_modal_opened',
          stopIndex: 0,
          previousBuildLevel: 1,
          nextBuildLevel: 2,
        }),
        false,
        'Later Hatchery levels should not advance this tutorial slice',
      );
    },
  },
];
