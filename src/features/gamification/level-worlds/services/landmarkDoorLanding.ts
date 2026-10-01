import { resolveLandmarkFlag, type LandmarkFlag } from './landmarkFlags';

/**
 * Landing on a landmark's door tile (user decision 2026-09-30):
 * - red flag (building started, not finished): zoom in and open it as before;
 * - green flag (Level 3, done): no zoom, no modal — a short "Great job!"
 *   burst and the roll loop keeps going;
 * - no flag (not started): no zoom; the door's Vault Rush minigame / early
 *   ticket offer still run as before.
 * Presentation policy only; gameplay writes stay in the canonical actions.
 */
export type LandmarkDoorLandingPresentation = 'focus' | 'celebrate' | 'no_zoom';

export function resolveLandmarkDoorFlag(options: { buildLevel: number; spentTowardLevel: number }): LandmarkFlag {
  const level = Number.isFinite(options.buildLevel) ? Math.floor(options.buildLevel) : 0;
  // Same reading as the Mission Phone flag list.
  return resolveLandmarkFlag({ level, percent: level >= 3 ? 100 : options.spentTowardLevel > 0 ? 1 : 0 });
}

export function resolveLandmarkDoorLandingPresentation(flag: LandmarkFlag): LandmarkDoorLandingPresentation {
  if (flag === 'green') return 'celebrate';
  if (flag === 'red') return 'focus';
  return 'no_zoom';
}

export const GREAT_JOB_BURST_MS = 1_900;
