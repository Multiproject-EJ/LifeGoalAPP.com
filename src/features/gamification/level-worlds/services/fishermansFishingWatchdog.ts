/**
 * Fisherman's Village fishing — stall watchdog.
 *
 * The fishing session hides the controller and owns the camera, so no phase
 * may sit unchanged forever (lost timers, a failed release, state churn that
 * keeps restarting a timer). Pure decision; the board applies it through the
 * existing canonical fishing actions.
 */
import { FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG } from './islandRunSignatureMissions';

export type FishingPhase = 'off' | 'approach' | 'casting' | 'waiting' | 'countdown' | 'bite' | 'reeling' | 'caught' | 'escaped';
export type FishingCatchKind = 'nothing' | 'small' | 'medium' | 'large' | 'colossal';

/** How long each phase may sit unchanged before the watchdog steps in. */
export const FISHING_PHASE_STALL_MS: Record<FishingPhase, number> = {
  off: 3_000,
  approach: 4_000,
  // The player's throw: generous, but a walked-away player still gets released.
  casting: 30_000,
  waiting: 5_000,
  countdown: 6_000,
  // Waiting for the player's taps: generous, but a walked-away player must not lock the board.
  bite: 30_000,
  reeling: 30_000,
  caught: 7_000,
  escaped: 7_000,
};

/** After this many stall windows without progress, close the session outright. */
export const FISHING_FORCE_CLOSE_STALLS = 3;

export type FishingStallAction =
  | 'wait'
  | 'advance_to_bite'
  | 'release_empty'
  | 'release_escaped'
  | 'close'
  | 'force_close';

export function resolveFishingStall(options: {
  phase: FishingPhase;
  stalledMs: number;
  /** Consecutive stall windows already acted on without the phase moving. */
  stallCount: number;
  pendingKind: FishingCatchKind | null;
  actionInFlight: boolean;
}): FishingStallAction {
  const { phase, stalledMs, stallCount, pendingKind, actionInFlight } = options;
  if (stalledMs < FISHING_PHASE_STALL_MS[phase]) return 'wait';
  if (stallCount >= FISHING_FORCE_CLOSE_STALLS) return 'force_close';
  if (actionInFlight) return 'wait';
  if (!pendingKind) return 'close';
  if (phase === 'bite' || phase === 'reeling') return 'release_escaped';
  if (phase === 'approach' || phase === 'casting' || phase === 'waiting' || phase === 'countdown') {
    return pendingKind === 'nothing' ? 'release_empty' : 'advance_to_bite';
  }
  // caught / escaped / off with a catch still pending: the settle never landed.
  return pendingKind === 'nothing' ? 'release_empty' : 'release_escaped';
}

/** Length of the dragon arrival cinematic that owns the camera and controller. */
export const FISHERMANS_DRAGON_CINEMATIC_SECONDS = 23.5;

/**
 * Seconds into the dragon cinematic, measured from when the dragon was
 * actually triggered, so it plays once live and is settled on every later
 * visit instead of re-locking the board.
 */
export function resolveFishermansDragonElapsedSeconds(options: {
  fishCaughtKg: number;
  dragonTriggeredAtMs: number | null;
  nowMs: number;
}): number {
  const { fishCaughtKg, dragonTriggeredAtMs, nowMs } = options;
  if (dragonTriggeredAtMs !== null) return Math.max(0, (nowMs - dragonTriggeredAtMs) / 1_000);
  return fishCaughtKg >= FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG ? FISHERMANS_DRAGON_CINEMATIC_SECONDS + 1 : 0;
}
