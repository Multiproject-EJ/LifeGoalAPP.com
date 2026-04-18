// ─── Camera Director ──────────────────────────────────────────────────────────
// Lightweight "film editor" that selects shot presets for each gameplay event.
// Decouples game logic from camera behaviour so events emit intent and the
// director decides framing, zoom, hold duration, and spring feel.
//
// Inspired by Monopoly GO's camera grammar:
//   Readable by default → aggressive punch-in on consequence → fast reset.

import { SPRING_PRESETS, type SpringConfig } from './springEngine';

// ─── Named zoom presets ──────────────────────────────────────────────────────

export const CAMERA_ZOOM = {
  /** Resting board view — medium-wide, full ring visible */
  boardWide:    1.0,
  /** During token travel — tight enough to see ~5-7 tiles (Monopoly GO parity) */
  travelMedium: 2.2,
  /** Normal tile landing — punchy close-up, ~4 tiles visible */
  tileClose:    2.5,
  /** High-interest stop landing (boss, hatchery) — dramatic punch-in */
  rewardClose:  2.8,
  /** Overview zoom-out */
  overview:     0.88,
  /** Pre-roll anticipation crouch — noticeable push-in from boardWide */
  preRoll:      1.5,
} as const;

// ─── Event priorities (higher number = higher priority) ──────────────────────

export type CameraEventKind =
  | 'idle'
  | 'pre_roll'
  | 'travel'
  | 'land_normal'
  | 'land_stop'
  | 'land_boss'
  | 'outcome_reward'
  | 'outcome_boss';

const EVENT_PRIORITY: Record<CameraEventKind, number> = {
  idle:           0,
  pre_roll:      10,
  travel:        20,
  land_normal:   30,
  land_stop:     40,
  land_boss:     60,
  outcome_reward: 50,
  outcome_boss:  70,
};

// ─── Shot presets ─────────────────────────────────────────────────────────────

export interface ShotPreset {
  zoom: number;
  /** Spring config for the punch-in (entering this shot) */
  springIn: SpringConfig;
  /** Spring config for returning to idle after this shot */
  springOut: SpringConfig;
  /** How long (ms) to hold the shot before returning to idle. 0 = no auto-return. */
  holdMs: number;
  /** Shake amplitude on entry (0 = no shake) */
  shakeAmplitude: number;
  /** Shake duration ms */
  shakeDurationMs: number;
}

const SHOT_PRESETS: Record<CameraEventKind, ShotPreset> = {
  idle: {
    zoom: CAMERA_ZOOM.boardWide,
    springIn: SPRING_PRESETS.smooth,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 0,
    shakeAmplitude: 0,
    shakeDurationMs: 0,
  },
  pre_roll: {
    zoom: CAMERA_ZOOM.preRoll,
    springIn: SPRING_PRESETS.snappy,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 0, // held until travel starts
    shakeAmplitude: 0,
    shakeDurationMs: 0,
  },
  travel: {
    zoom: CAMERA_ZOOM.travelMedium,
    springIn: SPRING_PRESETS.smooth,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 0, // continuous
    shakeAmplitude: 0,
    shakeDurationMs: 0,
  },
  land_normal: {
    zoom: CAMERA_ZOOM.tileClose,
    springIn: SPRING_PRESETS.snappy, // fast in
    springOut: SPRING_PRESETS.smooth, // slower out
    holdMs: 350,
    shakeAmplitude: 2.0,
    shakeDurationMs: 150,
  },
  land_stop: {
    zoom: CAMERA_ZOOM.rewardClose,
    springIn: SPRING_PRESETS.snappy,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 600,
    shakeAmplitude: 2.5,
    shakeDurationMs: 180,
  },
  land_boss: {
    zoom: CAMERA_ZOOM.rewardClose,
    springIn: SPRING_PRESETS.snappy,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 800,
    shakeAmplitude: 3.5,
    shakeDurationMs: 220,
  },
  outcome_reward: {
    zoom: CAMERA_ZOOM.rewardClose,
    springIn: SPRING_PRESETS.snappy,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 700,
    shakeAmplitude: 0,
    shakeDurationMs: 0,
  },
  outcome_boss: {
    zoom: CAMERA_ZOOM.rewardClose,
    springIn: SPRING_PRESETS.snappy,
    springOut: SPRING_PRESETS.smooth,
    holdMs: 900,
    shakeAmplitude: 0,
    shakeDurationMs: 0,
  },
};

// ─── Interest scoring ─────────────────────────────────────────────────────────

export type StopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';

/**
 * Derive the camera event kind for a tile landing based on whether the tile
 * hosts a stop and what kind of stop it is.
 */
export function landingEventForTile(
  tileIndex: number,
  stopMap: Map<number, string>,
): CameraEventKind {
  const stopId = stopMap.get(tileIndex);
  if (!stopId) return 'land_normal';
  if (stopId === 'boss') return 'land_boss';
  return 'land_stop';
}

/**
 * Get the shot preset for a given event kind.
 */
export function getShotPreset(event: CameraEventKind): ShotPreset {
  return SHOT_PRESETS[event];
}

/**
 * Determine whether a new event should override the current event based on priority.
 */
export function shouldOverride(current: CameraEventKind, incoming: CameraEventKind): boolean {
  return EVENT_PRIORITY[incoming] >= EVENT_PRIORITY[current];
}

// ─── Directional lead ─────────────────────────────────────────────────────────

/** Pixels of lead offset in the token's direction of travel (screen space).
 *  Increased to 60 to stay proportional at the tighter 2.2× travel zoom. */
const LEAD_OFFSET_PX = 60;

/**
 * Compute a directional lead offset so the token sits at ~40% of screen
 * in its travel direction, giving visual "room to go."
 *
 * @param fromX Previous token screen X
 * @param fromY Previous token screen Y
 * @param toX   Current/target token screen X
 * @param toY   Current/target token screen Y
 * @returns { leadX, leadY } offset to add to the camera target
 */
export function computeDirectionalLead(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { leadX: number; leadY: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { leadX: 0, leadY: 0 };
  // Normalize and scale
  return {
    leadX: (dx / dist) * LEAD_OFFSET_PX,
    leadY: (dy / dist) * LEAD_OFFSET_PX,
  };
}

// ─── Variable hop timing ─────────────────────────────────────────────────────

/**
 * Compute per-hop durations for a multi-tile hop sequence using a Monopoly GO-style
 * compressed power-curve so short rolls feel punchy and long rolls don't drag.
 *
 * Total duration formula:
 *   effective = hopCount ^ 0.9          (compression — longer rolls cost less per tile)
 *   total     = clamp(180 + effective × 220, 750, 2450)  ms
 *
 * The budget is then split across hops:
 *   - The final 2 hops ("landing emphasis") each run 12 % slower than cruise hops.
 *   - Remaining time is divided equally across the earlier "cruise" hops.
 *
 * Reference feel targets:
 *   3 tiles ≈  850 ms   5 tiles ≈ 1 100 ms
 *   8 tiles ≈ 1 600 ms  12 tiles ≈ 2 180 ms
 *
 * @param hopCount Total number of hops in the sequence
 */
export function computeHopDurations(hopCount: number): number[] {
  if (hopCount <= 0) return [];

  // Compressed total duration (Monopoly GO parity)
  const effective = Math.pow(hopCount, 0.9);
  const totalMs = Math.max(750, Math.min(2450, 180 + effective * 220));

  const finalCount = Math.min(2, hopCount);
  const cruiseCount = hopCount - finalCount;

  let cruiseMs: number;
  let finalMs: number;

  if (cruiseCount === 0) {
    // 1–2 tile roll: every hop is a "final" hop — split evenly
    cruiseMs = 0;
    finalMs = totalMs / hopCount;
  } else {
    // Solve: cruiseCount × cruiseMs + finalCount × (cruiseMs × 1.12) = totalMs
    cruiseMs = totalMs / (cruiseCount + finalCount * 1.12);
    finalMs = cruiseMs * 1.12;
  }

  return Array.from({ length: hopCount }, (_, i) =>
    i >= hopCount - finalCount ? finalMs : cruiseMs,
  );
}
