import {
  resolveIslandTimerHydrationState,
  shouldAutoAdvanceIslandOnTimerExpiry,
} from '../islandRunTimerProgression';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunTimerProgressionTests: TestCase[] = [
  {
    name: 'island timers retired: auto-advance never triggers',
    run: () => {
      const shouldAutoAdvance = shouldAutoAdvanceIslandOnTimerExpiry({
        islandRunContractV2Enabled: true,
        isIslandTimerPendingStart: false,
        timeLeftSec: 0,
        showTravelOverlay: false,
      });

      assertEqual(shouldAutoAdvance, false, 'Expected retired timer to never auto-advance');
    },
  },
  {
    name: 'island timers retired: hydration always returns inert state',
    run: () => {
      const nowMs = 1_000_000;
      const hydrationState = resolveIslandTimerHydrationState({
        islandRunContractV2Enabled: true,
        persistedStartedAtMs: nowMs - 10_000,
        persistedExpiresAtMs: nowMs - 1_000,
        nowMs,
        defaultDurationMs: 60_000,
      });

      assertEqual(hydrationState.shouldAutoAdvanceOnHydration, false, 'Expected retired timer hydration to never auto-advance');
      assertEqual(hydrationState.isIslandTimerPendingStart, false, 'Expected retired timer to not be pending');
      assertEqual(hydrationState.timeLeftSec, 0, 'Expected retired timer to report 0 time left');
    },
  },
  {
    name: 'island timers retired: legacy mode also returns inert state',
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

      assertEqual(hydrationState.shouldAutoAdvanceOnHydration, false, 'Expected retired timer to never auto-advance even in legacy mode');
      assertEqual(shouldAutoAdvance, false, 'Expected retired timer auto-advance check to always return false');
    },
  },
];
