import {
  resolveIslandTimerHydrationState,
  shouldAutoAdvanceIslandOnTimerExpiry,
} from '../islandRunTimerProgression';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunTimerProgressionTests: TestCase[] = [
  {
    name: 'v2 flag ON: timer expiry does not auto-advance island',
    run: () => {
      const shouldAutoAdvance = shouldAutoAdvanceIslandOnTimerExpiry({
        islandRunContractV2Enabled: true,
        isIslandTimerPendingStart: false,
        timeLeftSec: 0,
        showTravelOverlay: false,
      });

      assertEqual(shouldAutoAdvance, false, 'Expected v2 mode to bypass timer-expiry auto-advance behavior');
    },
  },
  {
    name: 'v2 flag ON: hydration keeps expired islands on current island and does not mark completion via expiry',
    run: () => {
      const nowMs = 1_000_000;
      const hydrationState = resolveIslandTimerHydrationState({
        islandRunContractV2Enabled: true,
        persistedStartedAtMs: nowMs - 10_000,
        persistedExpiresAtMs: nowMs - 1_000,
        nowMs,
        defaultDurationMs: 60_000,
      });

      assertEqual(hydrationState.shouldAutoAdvanceOnHydration, false, 'Expected v2 mode to avoid hydration-time auto-advance on expired timer');
      assertEqual(hydrationState.isIslandTimerPendingStart, false, 'Expected v2 mode to keep timer non-gating (no pending-start gate)');
      assertEqual(hydrationState.timeLeftSec, 0, 'Expected expired timer to clamp at 0 without progression side effects');
    },
  },
  {
    name: 'v2 flag OFF: legacy timer expiry behavior remains auto-advance capable',
    run: () => {
      const nowMs = 1_000_000;
      const hydrationState = resolveIslandTimerHydrationState({
        islandRunContractV2Enabled: false,
        persistedStartedAtMs: nowMs - 10_000,
        persistedExpiresAtMs: nowMs - 1_000,
        nowMs,
        defaultDurationMs: 60_000,
      });
      const shouldAutoAdvance = shouldAutoAdvanceIslandOnTimerExpiry({
        islandRunContractV2Enabled: false,
        isIslandTimerPendingStart: false,
        timeLeftSec: 0,
        showTravelOverlay: false,
      });

      assertEqual(hydrationState.shouldAutoAdvanceOnHydration, true, 'Expected legacy mode hydration to preserve expiry auto-advance behavior');
      assertEqual(shouldAutoAdvance, true, 'Expected legacy mode interval check to preserve expiry auto-advance behavior');
    },
  },
];
