import { useMemo } from 'react';
import type { PlayerState, MicroTestTrigger } from './microTestTriggers';
import { evaluateAvailableMicroTests, getTopMicroTestNotification } from './microTestTriggers';

export type MicroTestBadgeState = {
  count: number;
  topNotification: MicroTestTrigger | null;
  showBadge: boolean;
};

/**
 * Hook that evaluates micro-test triggers and returns badge state
 */
export function useMicroTestBadge(playerState: PlayerState): MicroTestBadgeState {
  return useMemo(() => {
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
