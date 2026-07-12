import { useMemo } from 'react';
import type { PlayerState, MicroTestTrigger } from './microTestTriggers';
import { evaluateAvailableMicroTests, getTopMicroTestNotification } from './microTestTriggers';

export type MicroTestBadgeState = {
  count: number;
  topNotification: MicroTestTrigger | null;
  showBadge: boolean;
};

/**
 * The Personality results screen now mounts MicroTestFlow via MicroTestPanel,
 * so the badge points at something the player can actually open. (Kept as a
 * single switch in case the entry point is ever temporarily removed.)
 */
const MICRO_TEST_UI_WIRED = true;

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
    playerState.foundationTestTaken,
  ]);
}
