import { SKILL_BUILD_ISLAND_NUMBER } from './precisionBuild';

/**
 * Build variety: how you build changes from island to island. Every style is
 * only an input on top of the same canonical one-step build (same cost, same
 * rewards) — Hold is the default, Skill (timing ring) belongs to Island 019's
 * roller coaster, and Bricks (LEGO-ASMR), Stack and Rhythm rotate across
 * islands so building never feels the same way twice in a row.
 */
export type IslandBuildStyle = 'hold' | 'skill' | 'bricks' | 'stack' | 'rhythm';

/** Islands where players are still learning keep the classic Hold. */
export const BUILD_STYLE_TUTORIAL_ISLANDS = 3;
const ROTATION: readonly IslandBuildStyle[] = ['hold', 'bricks', 'stack', 'rhythm'];

export function resolveIslandBuildStyle(islandNumber: number): IslandBuildStyle {
  const n = Math.max(1, Math.floor(islandNumber));
  if (n === SKILL_BUILD_ISLAND_NUMBER) return 'skill';
  if (n <= BUILD_STYLE_TUTORIAL_ISLANDS) return 'hold';
  return ROTATION[(n - BUILD_STYLE_TUTORIAL_ISLANDS - 1) % ROTATION.length]!;
}

export const BUILD_STYLE_LABELS: Record<IslandBuildStyle, { title: string; hint: string }> = {
  hold: { title: 'Hold to build', hint: 'Hold the button to build steadily' },
  skill: { title: 'Skill build', hint: 'Tap when the marker hits the gold' },
  bricks: { title: 'Brick by brick', hint: 'Tap to click each brick into place' },
  stack: { title: 'Hoist & stack', hint: 'Drag the beam up and lock it in' },
  rhythm: { title: 'Build to the beat', hint: 'Tap as the ring meets the drum' },
};

/* ── Bricks (LEGO-ASMR) ─────────────────────────────────────────────── */
export const BRICKS_PER_LAYER = 5;
/** The satisfying pause-and-animate beat when a layer completes. */
export const BRICK_LAYER_PAUSE_MS = 700;
export const BRICK_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'] as const;

export function brickLayerState(placed: number): { layer: number; inLayer: number; layerJustCompleted: boolean } {
  const safe = Math.max(0, Math.floor(placed));
  return {
    layer: Math.floor(safe / BRICKS_PER_LAYER),
    inLayer: safe % BRICKS_PER_LAYER,
    layerJustCompleted: safe > 0 && safe % BRICKS_PER_LAYER === 0,
  };
}

/* ── Stack ──────────────────────────────────────────────────────────── */
/** Share of the track the beam must be lifted past before release locks it. */
export const STACK_LOCK_THRESHOLD = 0.72;
export function stackReleaseLocks(progress: number): boolean {
  return progress >= STACK_LOCK_THRESHOLD;
}

/* ── Rhythm ─────────────────────────────────────────────────────────── */
export const RHYTHM_BEAT_MS = 1000;
/** Forgiving window around the beat (either side). */
export const RHYTHM_WINDOW_MS = 150;
export function judgeRhythmTap(elapsedMs: number): 'beat' | 'off' {
  const phase = ((elapsedMs % RHYTHM_BEAT_MS) + RHYTHM_BEAT_MS) % RHYTHM_BEAT_MS;
  const distance = Math.min(phase, RHYTHM_BEAT_MS - phase);
  return distance <= RHYTHM_WINDOW_MS ? 'beat' : 'off';
}
