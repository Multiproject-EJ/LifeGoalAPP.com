"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIslandTimerHydrationState = resolveIslandTimerHydrationState;
exports.shouldAutoAdvanceIslandOnTimerExpiry = shouldAutoAdvanceIslandOnTimerExpiry;
/**
 * Always returns an inert timer state — island timers are retired.
 * Progression is completion-based only.
 */
function resolveIslandTimerHydrationState(_options) {
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
function shouldAutoAdvanceIslandOnTimerExpiry(_options) {
    return false;
}
