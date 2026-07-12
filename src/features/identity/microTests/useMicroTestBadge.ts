import { useMemo } from 'react';
import type { PlayerState, MicroTestTrigger } from './microTestTriggers';
import { evaluateAvailableMicroTests, getTopMicroTestNotification } from './microTestTriggers';

export type MicroTestBadgeState = {
  count: number;
  topNotification: MicroTestTrigger | null;
  showBadge: boolean;
};

/**
 * MicroTestFlow is not mounted anywhere yet, so the badge must stay hidden —
 * otherwise it advertises quizzes the user has no way to open. Flip this to
 * true once a surface renders MicroTestFlow for the triggered tests.
 */
const MICRO_TEST_UI_WIRED = false;

/**
 * Hook that evaluates micro-test triggers and returns badge state
 */
export function useMicroTestBadge(playerState: PlayerState): MicroTestBadgeState {
  return useMemo(() => {
    if (!MICRO_TEST_UI_WIRED) {
      return { count: 0, topNotification: null, showBadge: false };
    }

    const availableTests = evaluateAvailableMicroTests(playerState);
    const topNotification = getTopMicroTestNotification(playerState);

    return {
      count: availableTests.length,
      topNotification,
      showBadge: availableTests.length > 0,
    };
  }, [
    playerState.level,
    playerState.currentStreakDays,
    playerState.daysSinceFoundationTest,
    playerState.completedMicroTests.length, // Use length to avoid deep comparison
  ]);
}
