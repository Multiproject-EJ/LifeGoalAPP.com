import type { Island3DQuality } from '../dev/island5ThreePilotContract';

/**
 * Adaptive 3D quality (user goal 2026-10-01): weak phones must still feel
 * smooth, strong phones should get the excellent version.
 *
 * Three levers, cheapest first:
 * 1. Render resolution (pixel-ratio scale) — adjusts instantly, no rebuild.
 * 2. Tier down — only after resolution is already at its floor and frames
 *    are still slow.
 * 3. Tier up — once per session, when a device has clear, sustained headroom
 *    at full resolution, and only at a calm moment.
 *
 * Whatever a device settles on is remembered, so the next session starts at
 * the right tier instead of stuttering, then rebuilding.
 */
export const ISLAND_3D_TIER_ORDER: readonly Island3DQuality[] = ['low', 'medium', 'high'];

/** FPS below this (per ~750 ms sample) counts as a miss for the tier. */
export const ISLAND_3D_MISS_FPS: Record<Island3DQuality, number> = { low: 24, medium: 32, high: 44 };
/** Sustained FPS at or above this, at full resolution, earns a tier up. */
export const ISLAND_3D_HEADROOM_FPS = 56;
export const ISLAND_3D_MIN_PIXEL_SCALE = 0.7;
export const ISLAND_3D_PIXEL_SCALE_STEP = 0.15;

const MISSES_BEFORE_SCALE_DOWN = 3; // ~2 s
const MISSES_BEFORE_TIER_DOWN = 6; // ~4.5 s at the resolution floor
const HEADROOM_BEFORE_SCALE_UP = 6; // ~4.5 s
const HEADROOM_BEFORE_TIER_UP = 20; // ~15 s of comfortable, full-resolution frames

export interface Island3DAdaptiveState {
  tier: Island3DQuality;
  pixelScale: number;
  misses: number;
  headroom: number;
  upgradedThisSession: boolean;
}

export type Island3DAdaptiveAction =
  | { kind: 'none' }
  | { kind: 'scale'; pixelScale: number }
  | { kind: 'tier'; tier: Island3DQuality; reason: 'slow' | 'headroom' };

export function createIsland3DAdaptiveState(tier: Island3DQuality): Island3DAdaptiveState {
  return { tier, pixelScale: 1, misses: 0, headroom: 0, upgradedThisSession: false };
}

function tierStep(tier: Island3DQuality, delta: -1 | 1): Island3DQuality | null {
  const index = ISLAND_3D_TIER_ORDER.indexOf(tier) + delta;
  return index >= 0 && index < ISLAND_3D_TIER_ORDER.length ? ISLAND_3D_TIER_ORDER[index]! : null;
}

/**
 * Feed one FPS sample. `busy` marks authored bursts (construction, cinematics,
 * hidden tab) that must never count as a device verdict; `maxTier` is the
 * highest tier this device may ever use (e.g. reduced motion keeps it low).
 */
export function stepIsland3DAdaptiveQuality(
  state: Island3DAdaptiveState,
  sample: { fps: number; busy: boolean; maxTier: Island3DQuality },
): { state: Island3DAdaptiveState; action: Island3DAdaptiveAction } {
  if (sample.busy || !Number.isFinite(sample.fps) || sample.fps <= 0) {
    return { state: { ...state, misses: 0, headroom: 0 }, action: { kind: 'none' } };
  }
  const missFps = ISLAND_3D_MISS_FPS[state.tier];
  if (sample.fps < missFps) {
    const misses = state.misses + 1;
    if (state.pixelScale > ISLAND_3D_MIN_PIXEL_SCALE + 1e-6 && misses >= MISSES_BEFORE_SCALE_DOWN) {
      const pixelScale = Math.max(ISLAND_3D_MIN_PIXEL_SCALE, Math.round((state.pixelScale - ISLAND_3D_PIXEL_SCALE_STEP) * 100) / 100);
      return { state: { ...state, pixelScale, misses: 0, headroom: 0 }, action: { kind: 'scale', pixelScale } };
    }
    const lower = tierStep(state.tier, -1);
    if (lower && misses >= MISSES_BEFORE_TIER_DOWN) {
      // A fresh tier starts back at full resolution.
      return {
        state: { ...state, tier: lower, pixelScale: 1, misses: 0, headroom: 0 },
        action: { kind: 'tier', tier: lower, reason: 'slow' },
      };
    }
    return { state: { ...state, misses, headroom: 0 }, action: { kind: 'none' } };
  }

  const comfortable = sample.fps >= Math.max(missFps + 12, ISLAND_3D_HEADROOM_FPS - 8);
  if (!comfortable) return { state: { ...state, misses: 0, headroom: 0 }, action: { kind: 'none' } };
  const headroom = state.headroom + 1;
  if (state.pixelScale < 1 && headroom >= HEADROOM_BEFORE_SCALE_UP) {
    const pixelScale = Math.min(1, Math.round((state.pixelScale + 0.1) * 100) / 100);
    return { state: { ...state, pixelScale, misses: 0, headroom: 0 }, action: { kind: 'scale', pixelScale } };
  }
  const higher = tierStep(state.tier, 1);
  const allowedHigher = higher && ISLAND_3D_TIER_ORDER.indexOf(higher) <= ISLAND_3D_TIER_ORDER.indexOf(sample.maxTier);
  if (allowedHigher && !state.upgradedThisSession && state.pixelScale >= 1 && sample.fps >= ISLAND_3D_HEADROOM_FPS
    && headroom >= HEADROOM_BEFORE_TIER_UP) {
    return {
      state: { ...state, tier: higher!, pixelScale: 1, misses: 0, headroom: 0, upgradedThisSession: true },
      action: { kind: 'tier', tier: higher!, reason: 'headroom' },
    };
  }
  return { state: { ...state, misses: 0, headroom }, action: { kind: 'none' } };
}

// ── Remembered tier ───────────────────────────────────────────────────────

export const ISLAND_3D_LEARNED_TIER_STORAGE_KEY = 'islandRun.learned3dTier.v1';
/** Re-check a remembered tier after a month (OS/browser updates change performance). */
export const ISLAND_3D_LEARNED_TIER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface Island3DLearnedTier {
  tier: Island3DQuality;
  learnedAtMs: number;
}

export function parseIsland3DLearnedTier(raw: string | null, nowMs: number): Island3DLearnedTier | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Island3DLearnedTier>;
    if (!value || !ISLAND_3D_TIER_ORDER.includes(value.tier as Island3DQuality)) return null;
    const learnedAtMs = Number(value.learnedAtMs);
    if (!Number.isFinite(learnedAtMs) || nowMs - learnedAtMs > ISLAND_3D_LEARNED_TIER_MAX_AGE_MS || learnedAtMs > nowMs + 60_000) return null;
    return { tier: value.tier as Island3DQuality, learnedAtMs };
  } catch {
    return null;
  }
}

export function serializeIsland3DLearnedTier(tier: Island3DQuality, nowMs: number): string {
  return JSON.stringify({ tier, learnedAtMs: nowMs } satisfies Island3DLearnedTier);
}

/**
 * Highest tier a device may reach. Reduced motion stays low; otherwise the
 * adaptive controller can earn its way to high (iPhones never report memory,
 * so the static detector alone would cap even the newest ones at medium).
 */
export function resolveIsland3DMaxTier(signals: { prefersReducedMotion?: boolean }): Island3DQuality {
  return signals.prefersReducedMotion ? 'low' : 'high';
}

/** Starting tier: a fresh remembered verdict wins over the static device guess. */
export function resolveIsland3DStartTier(options: {
  detected: Island3DQuality;
  learned: Island3DLearnedTier | null;
  maxTier: Island3DQuality;
}): Island3DQuality {
  const start = options.learned?.tier ?? options.detected;
  return ISLAND_3D_TIER_ORDER.indexOf(start) > ISLAND_3D_TIER_ORDER.indexOf(options.maxTier) ? options.maxTier : start;
}
