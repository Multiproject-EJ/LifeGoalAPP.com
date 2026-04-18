/**
 * Island timer progression — RETIRED.
 *
 * Island completion is now the only way the player progresses to the next island.
 * There are no time-based island expirations or auto-advances.
 * The egg hatch delay (24–72 hours) is the natural pacing gate.
 *
 * These functions remain for backwards-compatibility with existing callers
 * but always return inert/no-op values.
 */

export interface ResolveIslandTimerHydrationResult {
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  timeLeftSec: number;
  isIslandTimerPendingStart: boolean;
  shouldAutoAdvanceOnHydration: boolean;
}

/**
 * Always returns an inert timer state — island timers are retired.
 * Progression is completion-based only.
 */
export function resolveIslandTimerHydrationState(_options: {
  islandRunContractV2Enabled: boolean;
  persistedStartedAtMs: number;
  persistedExpiresAtMs: number;
  nowMs: number;
  defaultDurationMs: number;
}): ResolveIslandTimerHydrationResult {
  return {
    islandStartedAtMs: 0,
    islandExpiresAtMs: 0,
    timeLeftSec: 0,
    isIslandTimerPendingStart: false,
    shouldAutoAdvanceOnHydration: false,
  };
}

/**
 * Island timers are retired — auto-advance on timer expiry never triggers.
 */
export function shouldAutoAdvanceIslandOnTimerExpiry(_options: {
  islandRunContractV2Enabled: boolean;
  isIslandTimerPendingStart: boolean;
  timeLeftSec: number;
  showTravelOverlay: boolean;
}): boolean {
  return false;
}
