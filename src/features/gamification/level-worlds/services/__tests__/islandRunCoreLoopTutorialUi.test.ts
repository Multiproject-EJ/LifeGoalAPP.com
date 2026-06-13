import {
  ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY,
  ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY,
  isIslandRunFirstRollCoachmarkActive,
  isIslandRunKeepRollingCoachmarkActive,
} from '../islandRunCoreLoopTutorialUi';
import { assert, type TestCase } from './testHarness';

export const islandRunCoreLoopTutorialUiTests: TestCase[] = [
  {
    name: 'First-roll coachmark is active only while awaiting the first roll',
    run: () => {
      assert(
        isIslandRunFirstRollCoachmarkActive('awaiting_first_roll'),
        'awaiting_first_roll should show the roll coachmark',
      );
      assert(
        !isIslandRunFirstRollCoachmarkActive('not_started'),
        'not_started should not show the roll coachmark',
      );
      assert(
        !isIslandRunFirstRollCoachmarkActive('first_roll_consumed'),
        'first_roll_consumed should hide the roll coachmark',
      );
      assert(
        !isIslandRunFirstRollCoachmarkActive('complete'),
        'completed players should not see the roll coachmark',
      );
    },
  },
  {
    name: 'Keep-rolling coachmark covers the free-play window before the creature pack',
    run: () => {
      assert(
        isIslandRunKeepRollingCoachmarkActive('hatchery_l1_celebrated'),
        'hatchery_l1_celebrated should show the keep-rolling nudge',
      );
      assert(
        isIslandRunKeepRollingCoachmarkActive('normal_play_until_low_dice'),
        'normal_play_until_low_dice should show the keep-rolling nudge',
      );
      assert(
        !isIslandRunKeepRollingCoachmarkActive('build_modal_opened'),
        'build_modal_opened should not show the keep-rolling nudge',
      );
      assert(
        !isIslandRunKeepRollingCoachmarkActive('first_creature_pack_available'),
        'the creature pack moment should not show the keep-rolling nudge',
      );
      assert(
        !isIslandRunKeepRollingCoachmarkActive('complete'),
        'completed players should not see the keep-rolling nudge',
      );
    },
  },
  {
    name: 'Coachmark copy is populated',
    run: () => {
      assert(
        ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY.title.length > 0
          && ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY.body.length > 0,
        'first-roll coachmark copy should be set',
      );
      assert(
        ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY.title.length > 0
          && ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY.body.length > 0,
        'keep-rolling coachmark copy should be set',
      );
    },
  },
];
