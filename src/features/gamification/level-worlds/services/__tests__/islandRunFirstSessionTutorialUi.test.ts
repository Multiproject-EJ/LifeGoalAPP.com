import {
  formatIslandRunFirstCreaturePackBonusCopy,
  getIslandRunBuildPromptInitialTransitionTarget,
  getIslandRunFirstCreaturePackContinueTarget,
  getIslandRunFirstCreaturePackLowDiceTriggerTarget,
  getIslandRunHatcheryL1CelebrationContinueTarget,
  ISLAND_RUN_FIRST_CREATURE_PACK_LOW_DICE_THRESHOLD,
  isIslandRunFirstCreaturePackModalActive,
  isIslandRunHatcheryBuildGuidanceActive,
  isIslandRunHatcheryL1CelebrationActive,
  isIslandRunBuildPromptOverlayActive,
  resolveIslandRunFirstCreaturePackOpenAttempt,
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
    name: 'Hatchery L1 built state shows only the tutorial celebration',
    run: () => {
      assert(
        isIslandRunHatcheryL1CelebrationActive('hatchery_l1_built'),
        'hatchery_l1_built should show the Hatchery L1 celebration',
      );
      assertEqual(
        isIslandRunHatcheryL1CelebrationActive('hatchery_l1_celebrated'),
        false,
        'Already-celebrated tutorial state should not keep showing the celebration',
      );
      assertEqual(
        isIslandRunHatcheryL1CelebrationActive('not_started'),
        false,
        'Non-tutorial players should not see the Hatchery L1 celebration',
      );
      assertEqual(
        isIslandRunHatcheryL1CelebrationActive('complete'),
        false,
        'Completed tutorial players should not see the Hatchery L1 celebration',
      );
    },
  },
  {
    name: 'Hatchery L1 celebration Continue advances to the next canonical tutorial state',
    run: () => {
      assertEqual(
        getIslandRunHatcheryL1CelebrationContinueTarget('hatchery_l1_built'),
        'hatchery_l1_celebrated',
        'Continue should target the next sequential tutorial state',
      );
      assertEqual(
        getIslandRunHatcheryL1CelebrationContinueTarget('hatchery_l1_celebrated'),
        null,
        'Continue should not advance outside the celebration state',
      );
      assertEqual(
        getIslandRunHatcheryL1CelebrationContinueTarget('not_started'),
        null,
        'Non-tutorial states should not get a celebration Continue target',
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
  {
    name: 'First Creature Pack low-dice trigger is gated to post-Hatchery Island 1 tutorial play',
    run: () => {
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'hatchery_l1_celebrated',
          currentIslandNumber: 1,
          cycleIndex: 0,
          dicePool: ISLAND_RUN_FIRST_CREATURE_PACK_LOW_DICE_THRESHOLD,
        }),
        'first_creature_pack_available',
        'Hatchery-celebrated tutorial state should trigger at the low-dice threshold on Island 1',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'normal_play_until_low_dice',
          currentIslandNumber: 1,
          cycleIndex: 0,
          dicePool: 0,
        }),
        'first_creature_pack_available',
        'normal early tutorial play should trigger below the low-dice threshold on Island 1',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'hatchery_l1_built',
          currentIslandNumber: 1,
          cycleIndex: 0,
          dicePool: 0,
        }),
        null,
        'Trigger should not fire before Hatchery L1 is celebrated',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'not_started',
          currentIslandNumber: 1,
          cycleIndex: 0,
          dicePool: 0,
        }),
        null,
        'Trigger should not fire for non-tutorial players',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'hatchery_l1_celebrated',
          currentIslandNumber: 2,
          cycleIndex: 0,
          dicePool: 0,
        }),
        null,
        'Trigger should not fire outside Island 1',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'hatchery_l1_celebrated',
          currentIslandNumber: 1,
          cycleIndex: 1,
          dicePool: 0,
        }),
        null,
        'Trigger should not fire outside cycle 0',
      );
      assertEqual(
        getIslandRunFirstCreaturePackLowDiceTriggerTarget({
          firstSessionTutorialState: 'hatchery_l1_celebrated',
          currentIslandNumber: 1,
          cycleIndex: 0,
          dicePool: ISLAND_RUN_FIRST_CREATURE_PACK_LOW_DICE_THRESHOLD + 1,
        }),
        null,
        'Trigger should not fire above the low-dice threshold',
      );
    },
  },
  {
    name: 'First Creature Pack modal opens only for available tutorial state',
    run: () => {
      assert(
        isIslandRunFirstCreaturePackModalActive('first_creature_pack_available'),
        'first_creature_pack_available should show the Creature Pack modal',
      );
      assertEqual(
        isIslandRunFirstCreaturePackModalActive('complete'),
        false,
        'Non-tutorial players should not see the Creature Pack modal',
      );
      assertEqual(
        isIslandRunFirstCreaturePackModalActive('first_creature_pack_claimed'),
        false,
        'Claimed state should not reopen the intro modal after refresh',
      );
    },
  },
  {
    name: 'First Creature Pack open attempt calls claim once and blocks spam while in flight',
    run: () => {
      assertDeepEqual(
        resolveIslandRunFirstCreaturePackOpenAttempt({
          firstSessionTutorialState: 'first_creature_pack_available',
          isClaimInFlight: false,
        }),
        { shouldCallClaim: true, nextClaimInFlight: true },
        'Available state should allow one claim call and mark it in flight',
      );
      assertDeepEqual(
        resolveIslandRunFirstCreaturePackOpenAttempt({
          firstSessionTutorialState: 'first_creature_pack_available',
          isClaimInFlight: true,
        }),
        { shouldCallClaim: false, nextClaimInFlight: true },
        'Repeated open taps while in flight should not call claim again',
      );
      assertDeepEqual(
        resolveIslandRunFirstCreaturePackOpenAttempt({
          firstSessionTutorialState: 'complete',
          isClaimInFlight: false,
        }),
        { shouldCallClaim: false, nextClaimInFlight: false },
        'Non-tutorial state should not call the claim action',
      );
    },
  },
  {
    name: 'First Creature Pack reveal copy reports the guaranteed dice bonus',
    run: () => {
      assertEqual(
        formatIslandRunFirstCreaturePackBonusCopy(100),
        '+100 dice added',
        'Reveal should show the guaranteed +100 dice bonus',
      );
      assertEqual(
        formatIslandRunFirstCreaturePackBonusCopy(null),
        '+100 dice added',
        'Missing reveal payload bonus should fall back to safe copy without regranting',
      );
    },
  },
  {
    name: 'First Creature Pack Continue completes the tutorial after claimed state',
    run: () => {
      assertEqual(
        getIslandRunFirstCreaturePackContinueTarget('first_creature_pack_claimed'),
        'complete',
        'Continue should advance claimed tutorial state to complete',
      );
      assertEqual(
        getIslandRunFirstCreaturePackContinueTarget('first_creature_pack_available'),
        null,
        'Continue should not skip claim from the available state',
      );
    },
  },
];
