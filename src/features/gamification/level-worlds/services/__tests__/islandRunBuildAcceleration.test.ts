import {
  BUILD_REPEAT_STREAK_RESET_MS,
  getInitialBuildRepeatStreakState,
  MAX_REPEATED_BUILD_BATCH_STEPS,
  resolveNextBuildRepeatStreak,
  resolveRepeatedBuildBatchSteps,
} from '../islandRunBuildAcceleration';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunBuildAccelerationTests: TestCase[] = [
  {
    name: 'same-landmark repeated build clicks ramp to 7x legacy max on the 6th click',
    run: () => {
      assertDeepEqual(
        [1, 2, 3, 4, 5, 6, 7].map(resolveRepeatedBuildBatchSteps),
        [1, 2, 4, 8, 16, MAX_REPEATED_BUILD_BATCH_STEPS, MAX_REPEATED_BUILD_BATCH_STEPS],
        'Repeated build batch steps should ramp 1/2/4/8/16/28 and clamp at max',
      );
    },
  },
  {
    name: 'same stop increments streak while accepted clicks stay fresh',
    run: () => {
      const first = resolveNextBuildRepeatStreak({
        current: getInitialBuildRepeatStreakState(),
        stopIndex: 2,
        nowMs: 1_000,
      });
      const second = resolveNextBuildRepeatStreak({
        current: first,
        stopIndex: 2,
        nowMs: 1_000 + BUILD_REPEAT_STREAK_RESET_MS,
      });

      assertEqual(first.count, 1, 'First accepted build should start the streak at 1');
      assertEqual(second.count, 2, 'Fresh same-stop accepted build should increment the streak');
      assertEqual(second.stopIndex, 2, 'Streak should stay keyed to the built stop');
    },
  },
  {
    name: 'stale timeout resets repeated build streak',
    run: () => {
      const first = resolveNextBuildRepeatStreak({
        current: getInitialBuildRepeatStreakState(),
        stopIndex: 1,
        nowMs: 1_000,
      });
      const stale = resolveNextBuildRepeatStreak({
        current: first,
        stopIndex: 1,
        nowMs: 1_000 + BUILD_REPEAT_STREAK_RESET_MS + 1,
      });

      assertEqual(stale.count, 1, 'Accepted build after stale timeout should reset to streak 1');
      assertEqual(stale.stopIndex, 1, 'Stale reset should key the new streak to the requested stop');
    },
  },
  {
    name: 'different landmark resets repeated build streak',
    run: () => {
      const first = resolveNextBuildRepeatStreak({
        current: getInitialBuildRepeatStreakState(),
        stopIndex: 1,
        nowMs: 1_000,
      });
      const same = resolveNextBuildRepeatStreak({ current: first, stopIndex: 1, nowMs: 1_100 });
      const different = resolveNextBuildRepeatStreak({ current: same, stopIndex: 3, nowMs: 1_200 });

      assertEqual(same.count, 2, 'Setup should have an active streak before changing stops');
      assertEqual(different.count, 1, 'Different stop should reset the streak to 1');
      assertEqual(different.stopIndex, 3, 'Different-stop reset should key the streak to the new stop');
    },
  },
];
