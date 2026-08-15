import { MAX_ISLANDS } from './islandContentManifest';

export const ISLAND_RUN_ARENA_INTERVAL = 5 as const;
export const ISLAND_RUN_ARENA_CREATURE_COUNT = MAX_ISLANDS / ISLAND_RUN_ARENA_INTERVAL;
export const ISLAND_RUN_ARENA_CREATURE_MIN_BOSS_LEVEL = 1 as const;
/**
 * Island 005 is the authored arena pilot: Crown Drifter is part of its opening
 * world composition, not a reward for funding Boss landmark Level 1. Later
 * arena islands retain the normal Level-1 reveal gate.
 */
export const ISLAND_RUN_ALWAYS_PRESENT_ARENA_CREATURE_ISLAND = 5 as const;

export type IslandRunArenaCreatureMotionMode = 'hidden' | 'emerging' | 'roaming' | 'following';

export interface IslandRunArenaCreatureMotion {
  mode: IslandRunArenaCreatureMotionMode;
  visible: boolean;
  position: readonly [number, number, number];
  yaw: number;
  emergenceProgress: number;
}

export interface ResolveIslandRunArenaCreatureMotionOptions {
  islandNumber: number;
  bossBuildLevel: number;
  elapsedSeconds: number;
  tokenPosition?: readonly [number, number, number];
  reducedMotion?: boolean;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smootherstep = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
};

export function isIslandRunArenaIsland(islandNumber: number): boolean {
  return Number.isInteger(islandNumber)
    && islandNumber >= ISLAND_RUN_ARENA_INTERVAL
    && islandNumber <= MAX_ISLANDS
    && islandNumber % ISLAND_RUN_ARENA_INTERVAL === 0;
}

export function getIslandRunArenaCreatureSlot(islandNumber: number): number | null {
  if (!isIslandRunArenaIsland(islandNumber)) return null;
  return islandNumber / ISLAND_RUN_ARENA_INTERVAL - 1;
}

export function shouldPresentIslandRunArenaCreature(
  islandNumber: number,
  bossBuildLevel: number,
): boolean {
  if (!isIslandRunArenaIsland(islandNumber)) return false;
  return islandNumber === ISLAND_RUN_ALWAYS_PRESENT_ARENA_CREATURE_ISLAND
    || bossBuildLevel >= ISLAND_RUN_ARENA_CREATURE_MIN_BOSS_LEVEL;
}

/**
 * Presentation-only motion contract. It never mutates gameplay state and is
 * intentionally independent from stop/tile semantics. The creature spends
 * most of its time roaming the arena, then occasionally glides toward the
 * current player-piece direction before returning to the inner circle.
 */
export function resolveIslandRunArenaCreatureMotion(
  options: ResolveIslandRunArenaCreatureMotionOptions,
): IslandRunArenaCreatureMotion {
  if (!shouldPresentIslandRunArenaCreature(options.islandNumber, options.bossBuildLevel)) {
    return {
      mode: 'hidden',
      visible: false,
      position: [0, 0.42, 0],
      yaw: 0,
      emergenceProgress: 0,
    };
  }

  const safeElapsed = Math.max(0, Number.isFinite(options.elapsedSeconds) ? options.elapsedSeconds : 0);
  const startsInWorld = options.islandNumber === ISLAND_RUN_ALWAYS_PRESENT_ARENA_CREATURE_ISLAND;
  const emergenceDurationSeconds = 3.1;
  const emergenceProgress = options.reducedMotion || startsInWorld
    ? 1
    : smootherstep(safeElapsed / emergenceDurationSeconds);
  if (emergenceProgress < 1) {
    const liftProgress = smootherstep(safeElapsed / 1.45);
    const glideProgress = smootherstep((safeElapsed - 1.45) / (emergenceDurationSeconds - 1.45));
    const liftedY = 0.52 + liftProgress * 3.18;
    return {
      mode: 'emerging',
      visible: true,
      position: [
        glideProgress * 2.3,
        liftedY + (1.48 - liftedY) * glideProgress,
        0,
      ],
      yaw: -Math.PI / 2,
      emergenceProgress,
    };
  }

  if (options.reducedMotion) {
    return {
      mode: 'roaming',
      visible: true,
      position: [0, 1.48, 2.02],
      yaw: Math.PI,
      emergenceProgress: 1,
    };
  }

  const roamingElapsed = startsInWorld ? safeElapsed : safeElapsed - emergenceDurationSeconds;
  const cycleSeconds = 24;
  const cycle = roamingElapsed % cycleSeconds;
  const roamAngle = roamingElapsed * 0.22;
  // Stay clearly outside the boss-landmark footprint while remaining inside
  // the playable tile ring. This prevents the Level 2/3 landmark from
  // swallowing the creature in the phone camera.
  const roamRadiusX = 2.3;
  const roamRadiusZ = 2.02;
  const roamAltitude = startsInWorld ? 1.72 : 1.43;
  const roamPosition: readonly [number, number, number] = [
    Math.cos(roamAngle) * roamRadiusX,
    roamAltitude + Math.sin(safeElapsed * 1.15) * 0.08,
    Math.sin(roamAngle) * roamRadiusZ,
  ];

  const followsPlayer = cycle >= 16 && cycle < 20.5 && options.tokenPosition !== undefined;
  if (!followsPlayer || !options.tokenPosition) {
    const tangentX = -Math.sin(roamAngle) * roamRadiusX;
    const tangentZ = Math.cos(roamAngle) * roamRadiusZ;
    return {
      mode: 'roaming',
      visible: true,
      position: roamPosition,
      yaw: Math.atan2(tangentX, tangentZ),
      emergenceProgress: 1,
    };
  }

  const followPhase = clamp01((cycle - 16) / 4.5);
  const approach = Math.sin(followPhase * Math.PI) * 0.72;
  const tokenRadius = Math.max(0.001, Math.hypot(options.tokenPosition[0], options.tokenPosition[2]));
  const followTargetX = (options.tokenPosition[0] / tokenRadius) * 2.92;
  const followTargetZ = (options.tokenPosition[2] / tokenRadius) * 2.92;
  const position: readonly [number, number, number] = [
    roamPosition[0] + (followTargetX - roamPosition[0]) * approach,
    roamPosition[1] + Math.sin(followPhase * Math.PI) * 0.16,
    roamPosition[2] + (followTargetZ - roamPosition[2]) * approach,
  ];
  return {
    mode: 'following',
    visible: true,
    position,
    yaw: Math.atan2(options.tokenPosition[0] - position[0], options.tokenPosition[2] - position[2]),
    emergenceProgress: 1,
  };
}
