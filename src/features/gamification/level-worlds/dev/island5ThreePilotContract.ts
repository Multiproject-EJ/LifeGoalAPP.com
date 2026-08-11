import type { TileAnchor } from '../services/islandBoardLayout';
import type { IslandTileType } from '../services/islandBoardTileMap';
import { ISLAND_KIT_SCENE } from './islandCameraLockedKit';

export type Island3DQuality = 'low' | 'medium' | 'high';
export type Island3DQualitySelection = 'auto' | Island3DQuality;

export interface Island3DQualityProfile {
  id: Island3DQuality;
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  terrainSegments: number;
  ambientDetailCount: number;
  greeneryCount: number;
  cloudWispCount: number;
  birdFlockCount: number;
  butterflyGroupCount: number;
  waterSparkleCount: number;
  shorelineDetail: number;
  coastalStrataDetail: number;
  shoreBreakLayerCount: number;
  oceanGridSegments: number;
  oceanWaveBandCount: number;
  oceanUpdateFps: number;
  distantShipCount: number;
}

export type Island5AmbienceKind = 'cypress' | 'topiary' | 'hedge' | 'flower' | 'reed' | 'lantern';

export interface Island5AmbiencePoint {
  kind: Island5AmbienceKind;
  position: readonly [number, number, number];
  scale: number;
  rotationYRad: number;
  windPhase: number;
}

export interface CrownCitadelDetailProfile {
  quality: Island3DQuality;
  textureSize: number;
  radialSegments: number;
  towerWindowFaces: number;
  keepWindowRows: number;
  balustradePosts: number;
  reefAccentCount: number;
  pearlLanternCount: number;
  roofRibs: boolean;
  banners: boolean;
  shellOrnaments: boolean;
}

export interface Island3DDeviceSignals {
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  devicePixelRatio?: number;
  viewportPixels?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  platform?: string;
  userAgent?: string;
  runtimeProtocol?: string;
  prefersReducedMotion?: boolean;
}

export type Island3DPerformanceRating = 'pass' | 'review' | 'fail';

export interface Island3DPerformanceTarget {
  minAverageFps: number;
  maxP95FrameMs: number;
  slowFrameMs: number;
  maxSlowFramePercent: number;
}

export interface Island3DPerformanceSummary {
  quality: Island3DQuality;
  rating: Island3DPerformanceRating;
  durationMs: number;
  sampleCount: number;
  averageFps: number;
  p95FrameMs: number;
  worstFrameMs: number;
  slowFrameCount: number;
  slowFramePercent: number;
  severeJankCount: number;
  target: Island3DPerformanceTarget;
}

export type Island5LandmarkId = 'boss' | 'hatchery' | 'habit' | 'wisdom' | 'event';

export interface Island5LandmarkDefinition {
  id: Island5LandmarkId;
  label: string;
  subtitle: string;
  position: readonly [number, number, number];
  accent: number;
}

export type Island5CameraPresetId =
  | 'overview'
  | 'survey'
  | 'orbit-left'
  | 'orbit-right'
  | Island5LandmarkId;

export interface Island5CameraPreset {
  id: Island5CameraPresetId;
  label: string;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  durationMs: number;
}

export interface IslandCameraTourStep {
  preset: Island5CameraPresetId;
  holdMs: number;
}

export interface Island5TileTransform {
  id: string;
  index: number;
  position: readonly [number, number, number];
  rotationYRad: number;
  isKeyTile: boolean;
}

export interface Island3DRadialTileGeometrySpec {
  tileCount: number;
  centerRadius: number;
  radialDepth: number;
  height: number;
  jointGap: number;
  innerRadius: number;
  outerRadius: number;
  innerWidth: number;
  outerWidth: number;
}

export interface Island3DRadialTileMeshData {
  spec: Island3DRadialTileGeometrySpec;
  positions: readonly number[];
  indices: readonly number[];
}

export const ISLAND_3D_ROUTE_RADIUS = 3.4;
export const ISLAND_3D_TILE_RADIAL_DEPTH = 0.92;
export const ISLAND_3D_TILE_HEIGHT = 0.18;
/** Visible mortar/joint clearance between neighbouring radial blocks. */
export const ISLAND_3D_TILE_JOINT_GAP = 0.018;

export const ISLAND_3D_TOKEN_GROUND_OFFSET = 0.12;
export const ISLAND_3D_TOKEN_HOP_ARC_HEIGHT = 0.72;
export const ISLAND_3D_TOKEN_PRE_ROLL_HOLD_MS = 150;
export const ISLAND_3D_TOKEN_FOLLOW_OFFSET: readonly [number, number, number] = [0, 8.4, 10.8];
export const ISLAND_3D_SPECIAL_HOP_ARC_BOOST = 0.16;
export const ISLAND_3D_TILE_IMPACT_DURATION_MS = 420;
/** Wait for real inactivity before the camera starts returning to overview. */
export const ISLAND_3D_IDLE_OVERVIEW_DELAY_MS = 3_600;
/** Deliberately slower than authored focus changes, so it reads as a drift. */
export const ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE = 2.8;

export type Island3DLandingImpact = 'standard' | 'special' | 'hazard';

export interface Island3DTileImpactPose {
  yOffset: number;
  scaleY: number;
  scaleXZ: number;
  compression: number;
}

export function resolveIsland3DLandingImpact(tileType: IslandTileType | undefined): Island3DLandingImpact {
  if (tileType === 'hazard') return 'hazard';
  if (!tileType || tileType === 'currency') return 'standard';
  return 'special';
}

export function getIsland3DTileImpactPose(
  elapsedMs: number,
  strength = 1,
): Island3DTileImpactPose {
  const progress = Math.max(0, Math.min(1, elapsedMs / ISLAND_3D_TILE_IMPACT_DURATION_MS));
  if (progress >= 1) return { yOffset: 0, scaleY: 1, scaleXZ: 1, compression: 0 };
  const safeStrength = Math.max(0, Math.min(1.5, strength));
  const attackEnd = 0.18;
  const response = progress < attackEnd
    ? Math.sin((progress / attackEnd) * Math.PI / 2)
    : Math.cos(((progress - attackEnd) / (1 - attackEnd)) * Math.PI * 3.25)
      * Math.exp(-(progress - attackEnd) * 4.2);
  const compression = Math.max(-0.35, Math.min(1, response)) * safeStrength;
  const downward = Math.max(0, compression);
  const rebound = Math.max(0, -compression);
  return {
    yOffset: -downward * 0.045 + rebound * 0.012,
    scaleY: 1 - downward * 0.14 + rebound * 0.04,
    // Keep the satisfying landing compression without expanding a block far
    // enough to intersect either neighbour in the fine radial joint.
    scaleXZ: 1 + downward * 0.008 - rebound * 0.004,
    compression,
  };
}

/**
 * Returns a polar-sector tile footprint. A rectangular block cannot fit a
 * circular route: its inner corners overlap before its outer corners meet.
 * This shared trapezoid follows the two radial boundary rays instead.
 */
export function resolveIsland3DRadialTileGeometry(
  tileCount: number,
  centerRadius = ISLAND_3D_ROUTE_RADIUS,
  radialDepth = ISLAND_3D_TILE_RADIAL_DEPTH,
  height = ISLAND_3D_TILE_HEIGHT,
  jointGap = ISLAND_3D_TILE_JOINT_GAP,
): Island3DRadialTileGeometrySpec {
  const safeTileCount = Math.max(3, Math.round(Number.isFinite(tileCount) ? tileCount : 36));
  const safeCenterRadius = Math.max(0.1, Number.isFinite(centerRadius) ? centerRadius : ISLAND_3D_ROUTE_RADIUS);
  const safeDepth = Math.max(0.05, Math.min(safeCenterRadius * 1.8, Number.isFinite(radialDepth) ? radialDepth : ISLAND_3D_TILE_RADIAL_DEPTH));
  const safeHeight = Math.max(0.02, Number.isFinite(height) ? height : ISLAND_3D_TILE_HEIGHT);
  const safeJointGap = Math.max(0, Number.isFinite(jointGap) ? jointGap : ISLAND_3D_TILE_JOINT_GAP);
  const innerRadius = safeCenterRadius - safeDepth / 2;
  const outerRadius = safeCenterRadius + safeDepth / 2;
  const halfSectorAngle = Math.PI / safeTileCount;
  const widthAtRadius = (radius: number) => Math.max(0.04, (2 * radius * Math.tan(halfSectorAngle)) - safeJointGap);

  return {
    tileCount: safeTileCount,
    centerRadius: safeCenterRadius,
    radialDepth: safeDepth,
    height: safeHeight,
    jointGap: safeJointGap,
    innerRadius,
    outerRadius,
    innerWidth: widthAtRadius(innerRadius),
    outerWidth: widthAtRadius(outerRadius),
  };
}

/**
 * Builds one closed radial prism with every face wound toward the outside.
 * Three.js culls back faces by default, so the winding is part of the visual
 * contract: the top must face +Y and remain visible from the game camera.
 */
export function buildIsland3DRadialTileMeshData(tileCount: number): Island3DRadialTileMeshData {
  const spec = resolveIsland3DRadialTileGeometry(tileCount);
  const halfHeight = spec.height / 2;
  const outerZ = -spec.radialDepth / 2;
  const innerZ = spec.radialDepth / 2;
  const outerHalfWidth = spec.outerWidth / 2;
  const innerHalfWidth = spec.innerWidth / 2;

  return {
    spec,
    positions: [
      -outerHalfWidth, -halfHeight, outerZ,
      outerHalfWidth, -halfHeight, outerZ,
      innerHalfWidth, -halfHeight, innerZ,
      -innerHalfWidth, -halfHeight, innerZ,
      -outerHalfWidth, halfHeight, outerZ,
      outerHalfWidth, halfHeight, outerZ,
      innerHalfWidth, halfHeight, innerZ,
      -innerHalfWidth, halfHeight, innerZ,
    ],
    indices: [
      // bottom (-Y), top (+Y)
      0, 1, 2, 0, 2, 3,
      4, 6, 5, 4, 7, 6,
      // outer (-Z), right (+X), inner (+Z), left (-X)
      0, 4, 5, 0, 5, 1,
      1, 5, 6, 1, 6, 2,
      3, 2, 6, 3, 6, 7,
      0, 3, 7, 0, 7, 4,
    ],
  };
}

export const ISLAND_3D_QUALITY_PROFILES: Record<Island3DQuality, Island3DQualityProfile> = {
  low: {
    id: 'low',
    maxPixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 0,
    terrainSegments: 32,
    ambientDetailCount: 18,
    greeneryCount: 40,
    cloudWispCount: 2,
    birdFlockCount: 0,
    butterflyGroupCount: 0,
    waterSparkleCount: 36,
    shorelineDetail: 24,
    coastalStrataDetail: 24,
    shoreBreakLayerCount: 1,
    oceanGridSegments: 12,
    oceanWaveBandCount: 2,
    oceanUpdateFps: 20,
    distantShipCount: 0,
  },
  medium: {
    id: 'medium',
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    terrainSegments: 56,
    ambientDetailCount: 42,
    greeneryCount: 88,
    cloudWispCount: 4,
    birdFlockCount: 1,
    butterflyGroupCount: 1,
    waterSparkleCount: 92,
    shorelineDetail: 48,
    coastalStrataDetail: 56,
    shoreBreakLayerCount: 2,
    oceanGridSegments: 22,
    oceanWaveBandCount: 4,
    oceanUpdateFps: 30,
    distantShipCount: 2,
  },
  high: {
    id: 'high',
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    terrainSegments: 88,
    ambientDetailCount: 86,
    greeneryCount: 168,
    cloudWispCount: 7,
    birdFlockCount: 2,
    butterflyGroupCount: 2,
    waterSparkleCount: 180,
    shorelineDetail: 72,
    coastalStrataDetail: 96,
    shoreBreakLayerCount: 3,
    oceanGridSegments: 34,
    oceanWaveBandCount: 6,
    oceanUpdateFps: 45,
    distantShipCount: 4,
  },
};

export const ISLAND_3D_PROFILE_DURATION_MS = 30_000;
export const ISLAND_3D_SEVERE_JANK_MS = 50;

export const ISLAND_3D_PERFORMANCE_TARGETS: Record<Island3DQuality, Island3DPerformanceTarget> = {
  low: { minAverageFps: 30, maxP95FrameMs: 45, slowFrameMs: 40, maxSlowFramePercent: 20 },
  medium: { minAverageFps: 45, maxP95FrameMs: 34, slowFrameMs: 28, maxSlowFramePercent: 20 },
  high: { minAverageFps: 50, maxP95FrameMs: 29, slowFrameMs: 25, maxSlowFramePercent: 15 },
};

const roundMetric = (value: number) => Math.round(value * 10) / 10;

export function summarizeIsland3DPerformance(
  frameTimesMs: readonly number[],
  quality: Island3DQuality,
): Island3DPerformanceSummary {
  const target = ISLAND_3D_PERFORMANCE_TARGETS[quality];
  const samples = frameTimesMs
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice()
    .sort((left, right) => left - right);
  if (samples.length === 0) {
    return {
      quality,
      rating: 'fail',
      durationMs: 0,
      sampleCount: 0,
      averageFps: 0,
      p95FrameMs: 0,
      worstFrameMs: 0,
      slowFrameCount: 0,
      slowFramePercent: 0,
      severeJankCount: 0,
      target,
    };
  }

  const durationMs = samples.reduce((total, sample) => total + sample, 0);
  const p95Index = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1);
  const p95FrameMs = samples[p95Index];
  const worstFrameMs = samples[samples.length - 1];
  const slowFrameCount = samples.filter((sample) => sample > target.slowFrameMs).length;
  const severeJankCount = samples.filter((sample) => sample > ISLAND_3D_SEVERE_JANK_MS).length;
  const averageFps = (samples.length * 1000) / durationMs;
  const slowFramePercent = (slowFrameCount / samples.length) * 100;
  const passes = averageFps >= target.minAverageFps
    && p95FrameMs <= target.maxP95FrameMs
    && slowFramePercent <= target.maxSlowFramePercent;
  const hardFailure = averageFps < target.minAverageFps * 0.72
    || p95FrameMs > target.maxP95FrameMs * 1.8;

  return {
    quality,
    rating: passes ? 'pass' : hardFailure ? 'fail' : 'review',
    durationMs: Math.round(durationMs),
    sampleCount: samples.length,
    averageFps: roundMetric(averageFps),
    p95FrameMs: roundMetric(p95FrameMs),
    worstFrameMs: roundMetric(worstFrameMs),
    slowFrameCount,
    slowFramePercent: roundMetric(slowFramePercent),
    severeJankCount,
    target,
  };
}

/**
 * Geometry authority for the first production-target landmark. Detail can be
 * removed by device tier, but the five-tower silhouette and crown/prism story
 * remain identical so quality never changes landmark identity or hit bounds.
 */
export const CROWN_CITADEL_DETAIL_PROFILES: Record<Island3DQuality, CrownCitadelDetailProfile> = {
  low: {
    quality: 'low',
    textureSize: 0,
    radialSegments: 8,
    towerWindowFaces: 2,
    keepWindowRows: 1,
    balustradePosts: 0,
    reefAccentCount: 0,
    pearlLanternCount: 0,
    roofRibs: false,
    banners: false,
    shellOrnaments: false,
  },
  medium: {
    quality: 'medium',
    textureSize: 128,
    radialSegments: 10,
    towerWindowFaces: 4,
    keepWindowRows: 2,
    balustradePosts: 8,
    reefAccentCount: 6,
    pearlLanternCount: 4,
    roofRibs: false,
    banners: true,
    shellOrnaments: true,
  },
  high: {
    quality: 'high',
    textureSize: 256,
    radialSegments: 14,
    towerWindowFaces: 6,
    keepWindowRows: 2,
    balustradePosts: 16,
    reefAccentCount: 14,
    pearlLanternCount: 8,
    roofRibs: true,
    banners: true,
    shellOrnaments: true,
  },
};

export const CROWN_CITADEL_DESIGN_LOCK = {
  id: 'crown-citadel',
  silhouette: 'central-crowned-keep-plus-four-corner-spires',
  primaryMaterials: ['pale-reef-limestone', 'royal-purple-roof', 'warm-gold', 'aqua-voice-glass'],
  lightDirection: 'upper-left-front',
  levelStory: ['floodgate-foundation', 'operational-tide-palace', 'restored-voice-crown'],
} as const;

/**
 * Presentation hierarchy for the central boss landmark. L1 and L2 retain the
 * authored model dimensions; the restored L3 Citadel grows from its grounded
 * origin so it dominates the satellites without moving its anchor or tiles.
 */
export const CROWN_CITADEL_LEVEL_SCALES = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
  [1.16, 1.24, 1.16],
] as const;

const SCENE_UNITS_PER_WORLD_UNIT = 100;
const BOARD_UNITS_PER_WORLD_UNIT = 100;

export function islandKitPointToWorld(cx: number, cy: number, height = 0): readonly [number, number, number] {
  return [
    (cx - ISLAND_KIT_SCENE.centerX) / SCENE_UNITS_PER_WORLD_UNIT,
    height,
    (cy - ISLAND_KIT_SCENE.centerY) / SCENE_UNITS_PER_WORLD_UNIT,
  ];
}

const satellitePosition = (id: string): readonly [number, number, number] => {
  const satellite = ISLAND_KIT_SCENE.satellites.find((entry) => entry.id === id);
  if (!satellite) return [0, 0, 0];
  return islandKitPointToWorld(satellite.cx, satellite.cy);
};

export const ISLAND_5_LANDMARKS: readonly Island5LandmarkDefinition[] = [
  {
    id: 'boss',
    label: 'Crown Citadel',
    subtitle: 'Boss landmark',
    position: [0, 0, 0],
    accent: 0xffd57a,
  },
  {
    id: 'hatchery',
    label: 'Coral Cradle',
    subtitle: 'Hatchery',
    position: satellitePosition('hatchery'),
    accent: 0xff8fb7,
  },
  {
    id: 'habit',
    label: 'Tidekeeper Hall',
    subtitle: 'Habit landmark',
    position: satellitePosition('habit'),
    accent: 0x7de9ca,
  },
  {
    id: 'wisdom',
    label: 'Pearl Archive',
    subtitle: 'Wisdom landmark',
    position: satellitePosition('wisdom'),
    accent: 0xa992ff,
  },
  {
    id: 'event',
    label: 'Concord Arena',
    subtitle: 'Mystery and events',
    position: satellitePosition('event'),
    accent: 0x6dc9ff,
  },
] as const;

export const ISLAND_5_AMBIENCE_SEED = 0x15a5c0de;

/**
 * Deterministic scenery layout outside the canonical tile corridor. Future
 * islands can reuse this contract with their own zone centers and biome meshes.
 */
export function buildIsland5AmbienceLayout(
  profile: Island3DQualityProfile,
  seed = ISLAND_5_AMBIENCE_SEED,
): Island5AmbiencePoint[] {
  const seededPhase = ((seed >>> 0) % 6283) / 1000;
  const satelliteCenters = ISLAND_5_LANDMARKS
    .filter((landmark) => landmark.id !== 'boss')
    .map((landmark) => landmark.position);
  const mainIslandCount = Math.floor((profile.greeneryCount * 0.64) / 8) * 8;
  const formalKinds: readonly Island5AmbienceKind[] = ['hedge', 'topiary', 'flower', 'cypress', 'lantern', 'flower', 'hedge', 'reed'];

  return Array.from({ length: profile.greeneryCount }, (_, index) => {
    const onMainIsland = index < mainIslandCount;
    if (onMainIsland) {
      const gardenBandIndex = Math.floor(index / 8);
      const symmetryIndex = index % 8;
      const radiusBand = Math.floor(gardenBandIndex / 4);
      const angle = symmetryIndex * (Math.PI / 4) + (gardenBandIndex % 4 - 1.5) * 0.085;
      const radius = 4.34 + radiusBand * 0.5;
      const kind = formalKinds[gardenBandIndex % formalKinds.length];
      const baseScale = kind === 'cypress'
        ? 0.78
        : kind === 'lantern'
          ? 0.74
          : kind === 'hedge'
            ? 0.86
            : kind === 'topiary'
              ? 0.72
              : 0.66;
      const pairedScale = baseScale * (0.96 + radiusBand * 0.035);
      return {
        kind,
        position: [Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius],
        scale: pairedScale,
        rotationYRad: angle + Math.PI / 2,
        windPhase: seededPhase + gardenBandIndex * 0.61,
      };
    }

    const satelliteLayoutIndex = index - mainIslandCount;
    const satelliteIndex = satelliteLayoutIndex % satelliteCenters.length;
    const localSlot = Math.floor(satelliteLayoutIndex / satelliteCenters.length);
    const center = satelliteCenters[satelliteIndex];
    const outwardAngle = Math.atan2(center[2], center[0]);
    const localColumn = (localSlot % 4) - 1.5;
    const localBand = Math.floor(localSlot / 4);
    const tangentX = -Math.sin(outwardAngle);
    const tangentZ = Math.cos(outwardAngle);
    const outwardDistance = 1.18 + localBand * 0.28;
    const tangentDistance = localColumn * 0.34;
    const kind = formalKinds[localSlot % formalKinds.length];
    const baseScale = kind === 'cypress'
      ? 0.72
      : kind === 'lantern'
        ? 0.68
        : kind === 'hedge'
          ? 0.78
          : kind === 'topiary'
            ? 0.66
            : 0.6;

    return {
      kind,
      position: [
        center[0] + Math.cos(outwardAngle) * outwardDistance + tangentX * tangentDistance,
        0.2,
        center[2] + Math.sin(outwardAngle) * outwardDistance + tangentZ * tangentDistance,
      ],
      scale: baseScale * (0.96 + localBand * 0.08),
      rotationYRad: outwardAngle,
      windPhase: seededPhase + localSlot * 0.57,
    };
  });
}

export const ISLAND_5_CAMERA_PRESETS: readonly Island5CameraPreset[] = [
  { id: 'overview', label: 'Overview', position: [0, 25, 33], target: [0, 0.15, 0], durationMs: 950 },
  { id: 'survey', label: 'High survey', position: [0, 34, 44], target: [0, 0, 0], durationMs: 1050 },
  { id: 'orbit-left', label: 'Left orbit', position: [-24, 23, 28], target: [0, 0.25, 0], durationMs: 1100 },
  { id: 'orbit-right', label: 'Right orbit', position: [24, 23, 28], target: [0, 0.25, 0], durationMs: 1100 },
  { id: 'boss', label: 'Crown Citadel', position: [0, 9.2, 13.5], target: [0, 1.85, 0], durationMs: 980 },
  { id: 'hatchery', label: 'Coral Cradle', position: [-8.5, 7, 4.5], target: [-4.36, 0.72, -3.9], durationMs: 900 },
  { id: 'habit', label: 'Tidekeeper Hall', position: [8.5, 7, 4.5], target: [4.36, 0.86, -3.9], durationMs: 900 },
  { id: 'wisdom', label: 'Pearl Archive', position: [-8.5, 7, 12.5], target: [-4.36, 0.82, 3.9], durationMs: 900 },
  { id: 'event', label: 'Concord Arena', position: [8.5, 7, 12.5], target: [4.36, 0.68, 3.9], durationMs: 900 },
] as const;

/**
 * Semantic camera choreography shared by the Island Run 3D pipeline. Future
 * islands keep this order and map the same landmark roles to their own models.
 */
export const ISLAND_CAMERA_TOUR_STEPS: readonly IslandCameraTourStep[] = [
  { preset: 'overview', holdMs: 850 },
  { preset: 'survey', holdMs: 750 },
  { preset: 'orbit-left', holdMs: 800 },
  { preset: 'hatchery', holdMs: 850 },
  { preset: 'habit', holdMs: 850 },
  { preset: 'boss', holdMs: 950 },
  { preset: 'wisdom', holdMs: 850 },
  { preset: 'event', holdMs: 850 },
  { preset: 'orbit-right', holdMs: 800 },
  { preset: 'overview', holdMs: 1_100 },
] as const;

export function getIsland5CameraPreset(id: Island5CameraPresetId): Island5CameraPreset {
  return ISLAND_5_CAMERA_PRESETS.find((preset) => preset.id === id) ?? ISLAND_5_CAMERA_PRESETS[0];
}

export function resolveIsland3DQuality(
  selection: Island3DQualitySelection,
  signals: Island3DDeviceSignals,
): Island3DQualityProfile {
  if (selection !== 'auto') return ISLAND_3D_QUALITY_PROFILES[selection];

  const memory = signals.deviceMemoryGb ?? 4;
  const cores = signals.hardwareConcurrency ?? 4;
  const dpr = signals.devicePixelRatio ?? 1;
  const viewportPixels = signals.viewportPixels ?? 390 * 844;

  if (signals.prefersReducedMotion || memory <= 3 || cores <= 4 || viewportPixels * dpr * dpr > 4_000_000) {
    return ISLAND_3D_QUALITY_PROFILES.low;
  }
  if (memory >= 8 && cores >= 8 && dpr <= 3) {
    return ISLAND_3D_QUALITY_PROFILES.high;
  }
  return ISLAND_3D_QUALITY_PROFILES.medium;
}

export function getIsland3DRendererPixelRatio(profile: Island3DQualityProfile, devicePixelRatio: number): number {
  const safeDeviceRatio = Number.isFinite(devicePixelRatio) ? Math.max(0.5, devicePixelRatio) : 1;
  return Math.min(profile.maxPixelRatio, safeDeviceRatio);
}

export function buildIsland5TileTransforms(anchors: readonly TileAnchor[]): Island5TileTransform[] {
  return anchors.map((anchor, index) => ({
    id: anchor.id,
    index,
    position: [
      (anchor.x - 500) / BOARD_UNITS_PER_WORLD_UNIT,
      0.34,
      (anchor.y - 500) / BOARD_UNITS_PER_WORLD_UNIT,
    ],
    rotationYRad: -(anchor.tangentDeg * Math.PI) / 180,
    isKeyTile: index % 6 === 0,
  }));
}

export function getIsland5TokenGroundPosition(
  transforms: readonly Island5TileTransform[],
  tileIndex: number,
): readonly [number, number, number] {
  if (transforms.length === 0) return [0, ISLAND_3D_TOKEN_GROUND_OFFSET, 0];
  const safeIndex = ((Math.round(tileIndex) % transforms.length) + transforms.length) % transforms.length;
  const position = transforms[safeIndex].position;
  return [position[0], position[1] + ISLAND_3D_TOKEN_GROUND_OFFSET, position[2]];
}

export function getIsland3DTokenHopPosition(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  progress: number,
  arcHeight = ISLAND_3D_TOKEN_HOP_ARC_HEIGHT,
): readonly [number, number, number] {
  const safeProgress = Math.max(0, Math.min(1, progress));
  if (safeProgress === 0) return [from[0], from[1], from[2]];
  if (safeProgress === 1) return [to[0], to[1], to[2]];
  return [
    from[0] + (to[0] - from[0]) * safeProgress,
    from[1] + (to[1] - from[1]) * safeProgress + Math.sin(Math.PI * safeProgress) * arcHeight,
    from[2] + (to[2] - from[2]) * safeProgress,
  ];
}
