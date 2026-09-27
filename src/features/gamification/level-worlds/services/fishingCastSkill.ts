/**
 * Fisherman's Village cast skill — presentation-side judgement only.
 *
 * A power needle climbs toward the sweet spot on its own. The closer it gets,
 * the more violently it jitters, so waiting for a "perfect" throw risks an
 * overswing that slams the rod into the ground. Throwing too early is a short
 * cast the fish ignore. Canonical outcomes (catch, miss, mercy casts) are
 * committed by the mission actions; this module never grants anything.
 */

export type FishingCastJudgement = 'perfect' | 'good' | 'short' | 'overswing';

/** Needle scale: 0 = no power, 1 = full; above OVERSWING the rod hits the ground. */
export const FISHING_CAST_SWEET_SPOT = 0.8;
export const FISHING_CAST_GOOD_MIN = 0.58;
export const FISHING_CAST_PERFECT_HALF_WIDTH = 0.06;
export const FISHING_CAST_OVERSWING = 0.96;
/** Swipes faster than this (px/ms) count as a throw rather than a drag. */
export const FISHING_CAST_MIN_SWIPE_SPEED = 0.35;

/** Needle position after `elapsedMs` of charging. Deterministic for a seed. */
export function fishingCastPowerAt(elapsedMs: number, seed = 0): number {
  const t = Math.max(0, elapsedMs) / 1000;
  const base = FISHING_CAST_SWEET_SPOT * (1 - Math.exp(-t / 0.75));
  const approach = Math.pow(base / FISHING_CAST_SWEET_SPOT, 4);
  // Jitter grows near the sweet spot and keeps growing the longer you hold.
  const amplitude = 0.015 + approach * (0.1 + Math.min(0.14, t * 0.035));
  const wobble = Math.sin(t * 17.3 + seed * 1.7) * 0.6 + Math.sin(t * 29.1 + seed * 3.1) * 0.4;
  return Math.max(0, Math.min(1.12, base + amplitude * wobble));
}

/** Assisted casts glide to the sweet spot with a calm needle. */
export function fishingAssistedCastPowerAt(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000;
  return FISHING_CAST_SWEET_SPOT * (1 - Math.exp(-t / 0.45)) + Math.sin(t * 6) * 0.01;
}

export function judgeFishingCast(power: number, assisted = false): FishingCastJudgement {
  if (assisted) {
    return Math.abs(power - FISHING_CAST_SWEET_SPOT) <= FISHING_CAST_PERFECT_HALF_WIDTH ? 'perfect' : 'good';
  }
  if (power >= FISHING_CAST_OVERSWING) return 'overswing';
  if (power < FISHING_CAST_GOOD_MIN) return 'short';
  return Math.abs(power - FISHING_CAST_SWEET_SPOT) <= FISHING_CAST_PERFECT_HALF_WIDTH ? 'perfect' : 'good';
}

export function isFishingCastHit(judgement: FishingCastJudgement): boolean {
  return judgement === 'perfect' || judgement === 'good';
}

export function fishingCastLabel(judgement: FishingCastJudgement): string {
  switch (judgement) {
    case 'perfect': return 'PERFECT CAST!';
    case 'good': return 'Nice cast!';
    case 'short': return 'Too short — the fish ignored it';
    case 'overswing': return 'Overswing! The rod hit the ground';
  }
}
