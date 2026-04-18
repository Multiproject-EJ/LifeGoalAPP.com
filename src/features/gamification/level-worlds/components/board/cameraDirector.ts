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
  /** Resting board view — medium-wide */
  boardWide:    1.0,
  /** During token travel */
  travelMedium: 1.5,
  /** Normal tile landing */
  tileClose:    1.7,
  /** High-interest stop landing (boss, hatchery) */
  rewardClose:  1.9,
  /** Overview zoom-out */
  overview:     0.88,
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
    zoom: 1.15, // micro push-in for anticipation
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

/** Pixels of lead offset in the token's direction of travel (screen space). */
const LEAD_OFFSET_PX = 40;

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
 * Compute per-hop durations for a multi-tile hop sequence.
 * Middle hops are fast (narrative compression), final hops are slow (landing emphasis).
 *
 * @param hopCount  Total number of hops in the sequence
 * @param fastMs    Duration for fast middle hops (default 120)
 * @param slowMs    Duration for the final landing hops (default 220)
 * @param slowCount How many hops at the end get the slow treatment (default 2)
 */
export function computeHopDurations(
  hopCount: number,
  fastMs = 120,
  slowMs = 220,
  slowCount = 2,
): number[] {
  if (hopCount <= 0) return [];
  if (hopCount <= slowCount) {
    // All hops are "final" — use slow timing
    return Array.from({ length: hopCount }, () => slowMs);
  }
  return Array.from({ length: hopCount }, (_, i) =>
    i >= hopCount - slowCount ? slowMs : fastMs,
  );
}
