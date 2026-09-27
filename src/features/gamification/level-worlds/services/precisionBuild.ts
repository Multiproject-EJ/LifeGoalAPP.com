/**
 * Precision Build — a timing skill layer on top of the canonical build step.
 *
 * A marker sweeps around a ring; a target arc sits somewhere on it. Tapping
 * while the marker is inside the arc performs one ordinary build step (same
 * cost, same rewards). A miss costs nothing. Streaks narrow the arc and speed
 * the marker so players feel themselves getting better; a miss eases it back.
 * Pure presentation/pacing logic: it never grants or spends anything.
 */

/** Tolerance knobs (degrees of arc the player may hit). */
export const PRECISION_BUILD_START_ZONE_DEG = 72;
export const PRECISION_BUILD_MIN_ZONE_DEG = 26;
export const PRECISION_BUILD_ZONE_SHRINK_PER_HIT = 5;
export const PRECISION_BUILD_ZONE_RELIEF_ON_MISS = 14;
/** Share of the arc (around its centre) that counts as a perfect hit. */
export const PRECISION_BUILD_PERFECT_SHARE = 0.3;
/** Marker speed, degrees per second. */
export const PRECISION_BUILD_START_SPEED = 200;
export const PRECISION_BUILD_MAX_SPEED = 340;
export const PRECISION_BUILD_SPEED_PER_HIT = 9;

export type PrecisionBuildJudgement = 'perfect' | 'good' | 'miss';

export type PrecisionBuildState = {
  streak: number;
  bestStreak: number;
  zoneDeg: number;
  speedDegPerSec: number;
  /** Centre of the target arc, degrees clockwise from 12 o'clock. */
  targetDeg: number;
  attempt: number;
};

export function createPrecisionBuildState(bestStreak = 0): PrecisionBuildState {
  return {
    streak: 0,
    bestStreak: Math.max(0, Math.floor(bestStreak) || 0),
    zoneDeg: PRECISION_BUILD_START_ZONE_DEG,
    speedDegPerSec: PRECISION_BUILD_START_SPEED,
    targetDeg: precisionTargetDeg(0),
    attempt: 0,
  };
}

/** Deterministic, well-spread target positions (golden-angle walk). */
export function precisionTargetDeg(attempt: number): number {
  return Math.round(((attempt * 137.508) + 40) % 360);
}

/** Marker angle after `elapsedMs` of sweeping. */
export function precisionMarkerDeg(elapsedMs: number, speedDegPerSec: number): number {
  const deg = (Math.max(0, elapsedMs) * speedDegPerSec) / 1000;
  return ((deg % 360) + 360) % 360;
}

/** Smallest angular distance between two angles, 0..180. */
export function angularDistance(a: number, b: number): number {
  const d = (((a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

export function judgePrecisionTap(markerDeg: number, state: Pick<PrecisionBuildState, 'targetDeg' | 'zoneDeg'>): PrecisionBuildJudgement {
  const distance = angularDistance(markerDeg, state.targetDeg);
  if (distance <= (state.zoneDeg * PRECISION_BUILD_PERFECT_SHARE) / 2) return 'perfect';
  if (distance <= state.zoneDeg / 2) return 'good';
  return 'miss';
}

export function advancePrecisionBuild(state: PrecisionBuildState, judgement: PrecisionBuildJudgement): PrecisionBuildState {
  const attempt = state.attempt + 1;
  if (judgement === 'miss') {
    return {
      ...state,
      streak: 0,
      zoneDeg: Math.min(PRECISION_BUILD_START_ZONE_DEG, state.zoneDeg + PRECISION_BUILD_ZONE_RELIEF_ON_MISS),
      speedDegPerSec: Math.max(PRECISION_BUILD_START_SPEED, state.speedDegPerSec - PRECISION_BUILD_SPEED_PER_HIT * 2),
      attempt,
    };
  }
  const streak = state.streak + 1;
  return {
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    zoneDeg: Math.max(PRECISION_BUILD_MIN_ZONE_DEG, state.zoneDeg - PRECISION_BUILD_ZONE_SHRINK_PER_HIT),
    speedDegPerSec: Math.min(PRECISION_BUILD_MAX_SPEED, state.speedDegPerSec + PRECISION_BUILD_SPEED_PER_HIT),
    targetDeg: precisionTargetDeg(attempt),
    attempt,
  };
}

export function precisionFeedbackLabel(judgement: PrecisionBuildJudgement, streak: number): string {
  if (judgement === 'miss') return 'Almost! Try again';
  if (judgement === 'perfect') return streak >= 3 ? `PERFECT ×${streak}!` : 'PERFECT!';
  return streak >= 3 ? `Nice ×${streak}` : 'Nice!';
}
