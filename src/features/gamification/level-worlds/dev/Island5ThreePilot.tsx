import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILE_ANCHORS_36 } from '../services/islandBoardLayout';
import {
  applyLandmarkDoorTiles,
  generateTileMap,
  getIslandRarity,
  type IslandTileMapEntry,
  type IslandTileType,
} from '../services/islandBoardTileMap';
import { logIslandRunEntryDebug } from '../services/islandRunEntryDebug';
import { computeHopDurations } from '../components/board/cameraDirector';
import {
  compactStaticGeometry,
  createCrownCitadelModel,
  type CrownCitadelMaterials,
} from './CrownCitadelThreeModel';
import {
  buildIsland5AmbienceLayout,
  buildIsland3DRadialTileMeshData,
  buildIsland5TileTransforms,
  CROWN_CITADEL_DETAIL_PROFILES,
  CROWN_CITADEL_LEVEL_SCALES,
  getIsland3DTileImpactPose,
  getIsland3DRendererPixelRatio,
  getIsland3DTokenHopPosition,
  getIsland5CameraPreset,
  getIsland5TokenGroundPosition,
  ISLAND_CAMERA_TOUR_STEPS,
  ISLAND_3D_PROFILE_DURATION_MS,
  ISLAND_3D_IDLE_OVERVIEW_DELAY_MS,
  ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE,
  ISLAND_3D_TOKEN_FOLLOW_OFFSET,
  ISLAND_3D_SPECIAL_HOP_ARC_BOOST,
  ISLAND_3D_TILE_IMPACT_DURATION_MS,
  ISLAND_3D_TOKEN_PRE_ROLL_HOLD_MS,
  ISLAND_5_CAMERA_PRESETS,
  ISLAND_5_LANDMARKS,
  resolveIsland3DQuality,
  resolveIsland3DRadialTileGeometry,
  resolveIsland3DLandingImpact,
  summarizeIsland3DPerformance,
  type Island3DDeviceSignals,
  type Island3DPerformanceSummary,
  type Island3DQuality,
  type Island3DQualityProfile,
  type Island3DQualitySelection,
  type Island5AmbiencePoint,
  type Island5CameraPresetId,
  type Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { createCaretakerMaster, type CaretakerModel } from './CaretakerThreeModel';
import { createCrownDrifterModel } from './CrownDrifterThreeModel';
import {
  isIslandRunArenaIsland,
  resolveIslandRunArenaCreatureMotion,
} from '../services/islandRunArenaCreaturePresentation';
import {
  resolveIslandRun3DWorldRoute,
  type IslandRunAuthored3DWorldSource,
} from '../services/islandRun3DWorldRouting';
import {
  buildIsland1Landmark,
  createIsland1LivingAmbience,
  createIsland1WorldMaterials,
  ISLAND_1_LANDMARK_LABELS,
  ISLAND_1_WORLD_NAME,
} from './Island1ThreeWorld';
import {
  buildIsland2Landmark as buildIsland5SunshoreLandmark,
  createIsland2LivingAmbience as createIsland5SunshoreLivingAmbience,
  createIsland2WorldMaterials as createIsland5SunshoreWorldMaterials,
  ISLAND_2_LANDMARK_LABELS as ISLAND_5_SUNSHORE_LANDMARK_LABELS,
  ISLAND_2_WORLD_NAME as ISLAND_5_SUNSHORE_WORLD_NAME,
} from './Island2ThreeWorld';
import {
  buildIsland2CelestialLandmark,
  createIsland2CelestialLivingAmbience,
  createIsland2CelestialMaterials,
  ISLAND_2_CELESTIAL_LANDMARK_LABELS,
  ISLAND_2_CELESTIAL_WORLD_NAME,
} from './Island2CelestialThreeWorld';
import {
  buildIsland3FrostmoonLandmark,
  createIsland3FrostmoonLivingAmbience,
  createIsland3FrostmoonMaterials,
  ISLAND_3_FROSTMOON_LANDMARK_LABELS,
  ISLAND_3_FROSTMOON_WORLD_NAME,
} from './Island3FrostmoonThreeWorld';
import {
  buildIsland6MoonveilLandmark,
  createIsland6MoonveilLivingAmbience,
  createIsland6MoonveilMaterials,
  ISLAND_6_MOONVEIL_LANDMARK_LABELS,
  ISLAND_6_MOONVEIL_WORLD_NAME,
} from './Island6MoonveilThreeWorld';
import {
  buildIsland7UnderwaterLandmark,
  createIsland7UnderwaterLivingAmbience,
  createIsland7UnderwaterMaterials,
  ISLAND_7_UNDERWATER_LANDMARK_LABELS,
  ISLAND_7_UNDERWATER_WORLD_NAME,
} from './Island7UnderwaterThreeWorld';
import { createIslandRunTileRewardThreeObjects } from './IslandRunTileRewardThreeObjects';

export type BuildLevel = 0 | 1 | 2 | 3;
export type Island5LandmarkBuildLevels = Partial<Record<Island5LandmarkDefinition['id'], BuildLevel>>;

export type IslandRunArenaBattleVisualCue =
  | 'idle'
  | 'player_attack'
  | 'player_power'
  | 'player_guard'
  | 'player_shield'
  | 'opponent_charge'
  | 'opponent_attack'
  | 'victory'
  | 'defeat';

export interface IslandRunArenaBattlePresentation {
  active: boolean;
  cue: IslandRunArenaBattleVisualCue;
  sequence: number;
}

interface Island5ThreePilotProps {
  /** Runtime identity: owns arena cadence, story, progression, and persistence. */
  islandNumber?: number;
  /** Visual-only authored geometry/material pack selected by the routing manifest. */
  worldSourceNumber?: IslandRunAuthored3DWorldSource;
  buildLevel: BuildLevel;
  landmarkBuildLevels?: Island5LandmarkBuildLevels;
  presentation?: 'workbench' | 'embedded';
  qualityOverride?: Island3DQualitySelection;
  /** Canonical presentation map. This never becomes a gameplay write path. */
  tileMap?: readonly IslandTileMapEntry[];
  tokenIndex?: number;
  pendingHopSequence?: readonly number[] | null;
  isRolling?: boolean;
  landingTileType?: IslandTileType;
  movementSpeedFactor?: number;
  cameraFocusPreset?: Island5CameraPresetId | null;
  cameraFocusTransition?: 'standard' | 'quick';
  /** Monotonic presentation request used by the board magnifier. */
  cameraOverviewRequestVersion?: number;
  onHopSequenceComplete?: () => void;
  onTokenHop?: (tileIndex: number) => void;
  onTokenLand?: (tileIndex: number) => void;
  onLandmarkClick?: (landmarkId: Island5LandmarkDefinition['id']) => void;
  caretakerEncounterOpen?: boolean;
  onCaretakerClick?: () => void;
  interactionPaused?: boolean;
  arenaBattlePresentation?: IslandRunArenaBattlePresentation | null;
  onRendererUnavailable?: () => void;
}

interface TokenMotionRequest {
  id: number;
  requestedAt: number;
  holdMs: number;
  sequence: readonly number[];
  durationsMs: readonly number[];
  landingImpact: ReturnType<typeof resolveIsland3DLandingImpact>;
}

interface ControlledCameraFocusRequest {
  version: number;
  preset: Island5CameraPresetId;
  durationScale: number;
}

interface CameraPoseSnapshot {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

interface ActiveTileImpact {
  startedAt: number;
  strength: number;
}

function createRadialTileGeometry(tileCount: number): THREE.BufferGeometry {
  const meshData = buildIsland3DRadialTileMeshData(tileCount);
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
  geometry.setIndex(Array.from(meshData.indices));
  const facetedGeometry = geometry.toNonIndexed();
  geometry.dispose();
  facetedGeometry.computeVertexNormals();
  facetedGeometry.computeBoundingBox();
  facetedGeometry.computeBoundingSphere();
  facetedGeometry.name = 'ISLAND_SHARED_RADIAL_TILE_TRAPEZOID';
  return facetedGeometry;
}

function createTileBorderMeshGeometry(tileGeometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const edges = new THREE.EdgesGeometry(tileGeometry, 28);
  const positions = edges.getAttribute('position');
  const segments: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < positions.count; index += 2) {
    start.fromBufferAttribute(positions, index);
    end.fromBufferAttribute(positions, index + 1);
    const length = start.distanceTo(end);
    if (length <= 0.001) continue;
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start).normalize();
    quaternion.setFromUnitVectors(up, direction);
    matrix.compose(midpoint, quaternion, new THREE.Vector3(1, 1, 1));
    const segment = new THREE.CylinderGeometry(0.012, 0.012, length, 4, 1, false);
    segment.applyMatrix4(matrix);
    segments.push(segment);
  }
  edges.dispose();
  const merged = mergeGeometries(segments, false);
  segments.forEach((segment) => segment.dispose());
  if (!merged) throw new Error('Unable to build shared tile border geometry.');
  merged.name = 'ISLAND_7_SHARED_GILDED_TILE_BORDER';
  return merged;
}

interface ActiveTokenSettle {
  startedAt: number;
  strength: number;
  position: readonly [number, number, number];
}

interface PilotMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  width: number;
  height: number;
}

type ProfilerStatus = 'idle' | 'running' | 'complete' | 'cancelled';
type CameraTourStatus = 'idle' | 'running';

interface PilotProfileReport extends Island3DPerformanceSummary {
  profileSchema: 'island-3d-m7-v1';
  deviceLabel: string;
  capturedAt: string;
  drawCalls: number;
  triangles: number;
  maxDrawCalls: number;
  maxTriangles: number;
  geometryBudgetPass: boolean;
  rendererWidth: number;
  rendererHeight: number;
  gpuVendor?: string;
  gpuRenderer?: string;
  deviceSignals: Island3DDeviceSignals;
}

// Smootherstep gives camera motion zero velocity and acceleration at both ends.
const CAMERA_EASE = (progress: number) => progress * progress * progress * (progress * (progress * 6 - 15) + 10);
const CARETAKER_BOARD_HOME = new THREE.Vector3(-2.12, 0.36, -4.68);
const CARETAKER_ENCOUNTER_HOME = new THREE.Vector3(0, 0.36, 5.25);
const CARETAKER_BOARD_SCALE = 0.36;
const CARETAKER_ENCOUNTER_SCALE = 0.52;
const CROWN_DRIFTER_BOARD_SCALE = 0.38;

function readDeviceSignals(): Island3DDeviceSignals {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemoryGb: navigatorWithMemory.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
    viewportPixels: window.innerWidth * window.innerHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    runtimeProtocol: window.location.protocol.replace(':', ''),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function readInitialQualitySelection(): Island3DQualitySelection {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 'auto';
  const requested = new URLSearchParams(window.location.search).get('island3dQuality');
  return requested === 'low' || requested === 'medium' || requested === 'high' ? requested : 'auto';
}

function setLandmarkId(object: THREE.Object3D, id: Island5LandmarkDefinition['id']) {
  object.traverse((child) => {
    child.userData.landmarkId = id;
  });
}

function addShadowFlags(object: THREE.Object3D, castShadow: boolean) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = castShadow;
      child.receiveShadow = true;
    }
  });
}

function createCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function createErodedCoastalCylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  seed: number,
  erosionStrength: number,
) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 2, false);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const seedPhase = (seed % 4096) * 0.0017;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius < 0.0001) continue;
    const angle = Math.atan2(z, x);
    const heightRatio = THREE.MathUtils.clamp((y + height / 2) / Math.max(0.001, height), 0, 1);
    const broadErosion = Math.sin(angle * 5 + seedPhase) * 0.62;
    const fineErosion = Math.sin(angle * 11 - seedPhase * 1.7) * 0.26;
    const shelfBreak = Math.cos(angle * 17 + seedPhase * 0.7) * 0.12;
    const wallBias = 1 + (1 - heightRatio) * 0.42;
    const scale = 1 + (broadErosion + fineErosion + shelfBreak) * erosionStrength * wallBias;
    positions.setX(index, x * scale);
    positions.setZ(index, z * scale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createTerrainPlate(options: {
  radius: number;
  depth: number;
  segments: number;
  topMaterial: THREE.Material;
  reefMaterial: THREE.Material;
  position: readonly [number, number, number];
  seed?: number;
}): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...options.position);

  const terrainSeed = options.seed ?? 0x15c0a57;

  const reef = new THREE.Mesh(
    createErodedCoastalCylinderGeometry(
      options.radius * 1.08,
      options.radius * 1.18,
      options.depth * 0.78,
      options.segments,
      terrainSeed ^ 0x5a17,
      0.042,
    ),
    options.reefMaterial,
  );
  reef.position.y = -options.depth * 0.58;
  group.add(reef);

  const land = new THREE.Mesh(
    createErodedCoastalCylinderGeometry(
      options.radius,
      options.radius * 1.04,
      options.depth,
      options.segments,
      terrainSeed,
      0.024,
    ),
    [options.reefMaterial, options.topMaterial, options.reefMaterial],
  );
  land.position.y = -options.depth * 0.18;
  group.add(land);
  addShadowFlags(group, false);
  return group;
}

function createBridge(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, length), material);
  bridge.position.set((from[0] + to[0]) / 2, 0.22, (from[2] + to[2]) / 2);
  bridge.rotation.y = Math.atan2(dx, dz);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  return bridge;
}

function addPearlFinial(group: THREE.Group, materials: PilotMaterials, position: readonly [number, number, number], scale = 0.12) {
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(scale, 14, 10), materials.pearlAccent);
  pearl.position.set(...position);
  const pin = createCylinder(scale * 0.28, scale * 0.38, scale * 1.2, 8, materials.gold);
  pin.position.set(position[0], position[1] - scale * 0.7, position[2]);
  group.add(pin, pearl);
}

function addLandmarkTower(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  x: number;
  z: number;
  height: number;
  radius?: number;
  quality: Island3DQuality;
  roofMaterial?: THREE.Material;
}) {
  const radius = options.radius ?? 0.3;
  const segments = options.quality === 'low' ? 8 : options.quality === 'medium' ? 12 : 18;
  const base = createCylinder(radius * 1.16, radius * 1.3, 0.22, segments, options.materials.limestoneShade);
  base.position.set(options.x, 0.34, options.z);
  const body = createCylinder(radius, radius * 1.07, options.height, segments, options.materials.limestoneBright);
  body.position.set(options.x, 0.45 + options.height / 2, options.z);
  const waist = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.015, radius * 0.055, 6, segments), options.materials.gold);
  waist.rotation.x = Math.PI / 2;
  waist.position.set(options.x, 0.45 + options.height * 0.63, options.z);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, radius * 0.1, 6, segments), options.materials.gold);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(options.x, 0.45 + options.height, options.z);
  const roofHeight = radius * 2.1;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.22, roofHeight, segments), options.roofMaterial ?? options.materials.purpleRoofBright);
  roof.position.set(options.x, 0.45 + options.height + roofHeight / 2, options.z);
  options.group.add(base, body, waist, collar, roof);
  addPearlFinial(options.group, options.materials, [options.x, 0.45 + options.height + roofHeight + 0.08, options.z], radius * 0.24);

  if (options.quality === 'high') {
    for (let side = 0; side < 4; side += 1) {
      const angle = side * Math.PI / 2;
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.22, options.height * 0.58, radius * 0.2), options.materials.limestoneShade);
      buttress.position.set(
        options.x + Math.sin(angle) * radius * 1.03,
        0.48 + options.height * 0.29,
        options.z + Math.cos(angle) * radius * 1.03,
      );
      buttress.rotation.y = angle;
      options.group.add(buttress);
    }
  }

  if (options.quality !== 'low') {
    for (let face = 0; face < 4; face += 1) {
      const angle = face * Math.PI / 2;
      const window = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.36, options.height * 0.24), options.materials.deepWindow);
      window.position.set(
        options.x + Math.sin(angle) * (radius + 0.005),
        0.48 + options.height * 0.56,
        options.z + Math.cos(angle) * (radius + 0.005),
      );
      window.rotation.y = angle;
      const windowCrown = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.105, radius * 0.22, 3), options.materials.gold);
      windowCrown.position.set(
        options.x + Math.sin(angle) * (radius + 0.012),
        0.5 + options.height * 0.69,
        options.z + Math.cos(angle) * (radius + 0.012),
      );
      windowCrown.rotation.z = Math.PI;
      windowCrown.rotation.y = angle;
      options.group.add(window, windowCrown);
    }
  }
}

function addArchRib(
  group: THREE.Group,
  radius: number,
  tube: number,
  y: number,
  rotationY: number,
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const rib = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, quality === 'low' ? 5 : 8, quality === 'high' ? 32 : 20, Math.PI),
    material,
  );
  rib.position.y = y;
  rib.rotation.y = rotationY;
  group.add(rib);
}

function addCoralCrown(group: THREE.Group, materials: PilotMaterials, radius: number, y: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const height = 0.38 + (index % 3) * 0.12;
    const branch = new THREE.Mesh(new THREE.ConeGeometry(0.055, height, 5), index % 2 === 0 ? materials.reefAccent : materials.coral);
    branch.position.set(Math.cos(angle) * radius, y + height / 2, Math.sin(angle) * radius);
    branch.rotation.z = Math.cos(angle) * 0.2;
    branch.rotation.x = Math.sin(angle) * 0.2;
    group.add(branch);
    if (count >= 14 && index % 2 === 0) {
      for (const direction of [-1, 1]) {
        const sideBranch = new THREE.Mesh(new THREE.ConeGeometry(0.035, height * 0.58, 5), index % 4 === 0 ? materials.coral : materials.reefAccent);
        sideBranch.position.set(
          Math.cos(angle) * radius + direction * Math.cos(angle + Math.PI / 2) * 0.1,
          y + height * 0.62,
          Math.sin(angle) * radius + direction * Math.sin(angle + Math.PI / 2) * 0.1,
        );
        sideBranch.rotation.z = direction * 0.62 + Math.cos(angle) * 0.16;
        sideBranch.rotation.x = Math.sin(angle) * 0.16;
        group.add(sideBranch);
      }
    }
  }
}

function addCeremonialTerrace(group: THREE.Group, materials: PilotMaterials, quality: Island3DQuality) {
  const segments = quality === 'low' ? 16 : quality === 'medium' ? 24 : 36;
  const lower = createCylinder(1.45, 1.56, 0.26, segments, materials.limestoneShade);
  lower.position.y = 0.2;
  const upper = createCylinder(1.25, 1.38, 0.22, segments, materials.limestoneBright);
  upper.position.y = 0.42;
  const waterChannel = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.09, 8, segments), materials.waterGlow);
  waterChannel.rotation.x = Math.PI / 2;
  waterChannel.position.y = 0.55;
  group.add(lower, upper, waterChannel);
  if (quality === 'high') {
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const pier = createCylinder(0.07, 0.095, 0.38, 7, materials.limestoneBright);
      pier.position.set(Math.cos(angle) * 1.47, 0.43, Math.sin(angle) * 1.47);
      group.add(pier);
      if (index % 3 === 0) addPearlFinial(group, materials, [Math.cos(angle) * 1.47, 0.68, Math.sin(angle) * 1.47], 0.06);
    }
  }
}

function addArchedEntrance(group: THREE.Group, materials: PilotMaterials, z = 1.03, scale = 1) {
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.72 * scale, 0.055), materials.deepWindow);
  door.position.set(0, 0.92 * scale, z);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.045 * scale, 7, 20, Math.PI), materials.gold);
  arch.position.set(0, 1.27 * scale, z + 0.015);
  const pearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.085 * scale), materials.voiceGlow);
  pearl.position.set(0, 1.52 * scale, z + 0.03);
  group.add(door, arch, pearl);
  for (let step = 0; step < 3; step += 1) {
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry((0.72 + step * 0.15) * scale, 0.09 * scale, 0.22 * scale),
      materials.limestoneBright,
    );
    stair.position.set(0, (0.34 - step * 0.07) * scale, z + 0.18 + step * 0.17);
    group.add(stair);
  }
}

function addCircularWindowBand(
  group: THREE.Group,
  materials: PilotMaterials,
  radius: number,
  y: number,
  count: number,
  height = 0.32,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const window = new THREE.Mesh(new THREE.PlaneGeometry(0.16, height), materials.aquaGlass);
    window.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    window.rotation.y = angle;
    group.add(window);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 3), materials.gold);
    point.position.set(Math.sin(angle) * (radius + 0.015), y + height * 0.62, Math.cos(angle) * (radius + 0.015));
    point.rotation.z = Math.PI;
    point.rotation.y = angle;
    group.add(point);
  }
}

function addGoldBalustrade(group: THREE.Group, materials: PilotMaterials, radius: number, y: number, count: number) {
  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.027, 6, Math.max(24, count * 2)), materials.gold);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = y;
  group.add(rail);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const post = createCylinder(0.022, 0.027, 0.26, 6, materials.gold);
    post.position.set(Math.cos(angle) * radius, y - 0.13, Math.sin(angle) * radius);
    group.add(post);
    if (index % 3 === 0) addPearlFinial(group, materials, [Math.cos(angle) * radius, y + 0.08, Math.sin(angle) * radius], 0.055);
  }
}

function addShellOrnaments(group: THREE.Group, materials: PilotMaterials, radius: number, y: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7), materials.pearlAccent);
    shell.scale.set(1.15, 1.35, 0.42);
    shell.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    shell.rotation.y = -angle;
    group.add(shell);
  }
}

function addHatcheryFoundationDetail(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
) {
  const detailSegments = quality === 'low' ? 14 : quality === 'medium' ? 20 : 28;
  const lowerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 6, detailSegments), materials.gold);
  lowerCollar.rotation.x = Math.PI / 2;
  lowerCollar.position.y = 0.57;
  group.add(lowerCollar);

  const ribCount = quality === 'low' ? 3 : 5;
  for (let index = 0; index < ribCount; index += 1) {
    addArchRib(
      group,
      0.865,
      0.026,
      0.53,
      (index / ribCount) * Math.PI,
      index % 2 === 0 ? materials.gold : materials.coral,
      quality,
    );
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2 + Math.PI / 4;
    const x = Math.cos(angle) * 0.77;
    const z = Math.sin(angle) * 0.77;
    const pedestal = createCylinder(0.075, 0.1, 0.34, 7, materials.limestoneBright);
    pedestal.position.set(x, 0.62, z);
    group.add(pedestal);
    addPearlFinial(group, materials, [x, 0.86, z], 0.07);
  }

  for (let step = 0; step < 3; step += 1) {
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry(0.56 + step * 0.16, 0.07, 0.18),
      step === 0 ? materials.gold : materials.limestoneBright,
    );
    stair.position.set(0, 0.5 - step * 0.055, 0.83 + step * 0.13);
    group.add(stair);
  }
  const thresholdPearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), materials.voiceGlow);
  thresholdPearl.position.set(0, 0.72, 0.83);
  group.add(thresholdPearl);

  addCoralCrown(group, materials, 0.98, 0.52, quality === 'high' ? 8 : 5);
}

/** L1 establishes a deliberately built foundation; L2 and L3 add complete
 * architectural layers from the approved Island 5 progression sheets. */
function createHatcheryLandmark(level: BuildLevel, quality: Island3DQuality, materials: PilotMaterials): THREE.Group {
  const group = new THREE.Group();
  addCeremonialTerrace(group, materials, quality);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.86, quality === 'low' ? 14 : 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.coralGlass);
  bowl.position.y = 0.52;
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.13, 10, 28), materials.coral);
  cradle.rotation.x = Math.PI / 2;
  cradle.position.y = 0.68;
  group.add(bowl, cradle);
  addPearlFinial(group, materials, [0, 1.08, 0], 0.26);

  if (level === 1) addHatcheryFoundationDetail(group, materials, quality);

  if (level >= 2) {
    const ribCount = quality === 'low' ? 4 : 6;
    for (let index = 0; index < ribCount; index += 1) {
      addArchRib(group, 1.02, 0.065, 0.56, (index / ribCount) * Math.PI, materials.limestoneBright, quality);
    }
    addLandmarkTower({ group, materials, x: -0.96, z: 0.34, height: 1.5, radius: 0.24, quality });
    addLandmarkTower({ group, materials, x: 0.96, z: 0.34, height: 1.5, radius: 0.24, quality });
    addCoralCrown(group, materials, 1.18, 0.48, quality === 'low' ? 6 : 10);
    if (level === 2) {
      addLandmarkTower({ group, materials, x: -0.76, z: -0.66, height: 1.12, radius: 0.2, quality });
      addLandmarkTower({ group, materials, x: 0.76, z: -0.66, height: 1.12, radius: 0.2, quality });
      addGoldBalustrade(group, materials, 1.32, 0.8, quality === 'high' ? 16 : 10);
      addShellOrnaments(group, materials, 1.2, 0.62, quality === 'high' ? 8 : 5);
      addArchedEntrance(group, materials, 1.26, 0.9);
    }
  }

  if (level >= 3) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, quality === 'low' ? 16 : 30, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.purpleRoofBright,
    );
    dome.position.y = 0.62;
    group.add(dome);
    const goldRibs = quality === 'low' ? 4 : quality === 'medium' ? 6 : 10;
    for (let index = 0; index < goldRibs; index += 1) {
      addArchRib(group, 0.91, 0.025, 0.63, (index / goldRibs) * Math.PI, materials.gold, quality);
    }
    addLandmarkTower({ group, materials, x: -1.03, z: -0.34, height: 2.18, radius: 0.26, quality });
    addLandmarkTower({ group, materials, x: 1.03, z: -0.34, height: 1.78, radius: 0.23, quality });
    addLandmarkTower({ group, materials, x: 0, z: -0.92, height: 2.42, radius: 0.25, quality });
    addCoralCrown(group, materials, 1.28, 0.54, quality === 'high' ? 16 : 10);
    addCircularWindowBand(group, materials, 0.92, 0.94, quality === 'high' ? 12 : 8, 0.3);
    addGoldBalustrade(group, materials, 1.34, 0.82, quality === 'high' ? 18 : 12);
    addShellOrnaments(group, materials, 1.26, 0.62, quality === 'high' ? 10 : 6);
    addArchedEntrance(group, materials, 1.28, 0.92);
    addPearlFinial(group, materials, [0, 1.75, 0], 0.18);
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const ceremonialSpire = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.46, 5), materials.gold);
      ceremonialSpire.position.set(Math.cos(angle) * 1.22, 1.03, Math.sin(angle) * 1.22);
      group.add(ceremonialSpire);
    }
    for (const x of [-1.03, 1.03]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.52), materials.banner);
      banner.position.set(x, 1.55, 0.61);
      group.add(banner);
      const bannerRod = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.025, 0.025), materials.gold);
      bannerRod.position.set(x, 1.82, 0.62);
      group.add(bannerRod);
    }
    if (quality === 'high') addCoralCrown(group, materials, 1.02, 1.02, 18);
    const pearlCupola = createCylinder(0.18, 0.28, 0.24, quality === 'low' ? 8 : 16, materials.gold);
    pearlCupola.position.y = 1.58;
    const pearlHalo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 24), materials.gold);
    pearlHalo.rotation.x = Math.PI / 2;
    pearlHalo.position.y = 1.72;
    group.add(pearlCupola, pearlHalo);
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), materials.pearlAccent);
      shell.scale.set(1.15, 1.45, 0.38);
      shell.position.set(Math.cos(angle) * 0.91, 1.03, Math.sin(angle) * 0.91);
      shell.rotation.y = -angle;
      group.add(shell);
    }
  }
  return group;
}

function addTidekeeperCrescent(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  angle: number;
  radius: number;
  y: number;
  quality: Island3DQuality;
  accent?: boolean;
  size?: number;
}) {
  const curveSegments = options.quality === 'low' ? 12 : options.quality === 'medium' ? 18 : 26;
  const size = options.size ?? 0.24;
  const x = Math.cos(options.angle) * options.radius;
  const z = Math.sin(options.angle) * options.radius;
  const crescent = new THREE.Mesh(
    new THREE.TorusGeometry(size, size * 0.175, options.quality === 'low' ? 5 : 7, curveSegments, Math.PI * 0.82),
    options.accent ? options.materials.reefAccent : options.materials.limestoneBright,
  );
  crescent.position.set(x, options.y, z);
  crescent.rotation.y = -options.angle;
  crescent.rotation.z = Math.PI * 0.09;
  const pearlBase = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 7), options.materials.pearlAccent);
  pearlBase.scale.set(1, 0.72, 1);
  pearlBase.position.set(x, options.y - 0.02, z);
  options.group.add(crescent, pearlBase);
}

function addTidekeeperPavilion(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  x: number;
  z: number;
  quality: Island3DQuality;
  scale?: number;
}) {
  const scale = options.scale ?? 1;
  const segments = options.quality === 'low' ? 10 : options.quality === 'medium' ? 16 : 22;
  const base = createCylinder(0.3 * scale, 0.34 * scale, 0.16 * scale, segments, options.materials.limestoneShade);
  base.position.set(options.x, 0.61, options.z);
  const body = createCylinder(0.265 * scale, 0.29 * scale, 0.66 * scale, segments, options.materials.limestoneBright);
  body.position.set(options.x, 0.98, options.z);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.31 * scale, segments, Math.max(8, Math.round(segments / 2)), 0, Math.PI * 2, 0, Math.PI / 2),
    options.materials.purpleRoofBright,
  );
  dome.position.set(options.x, 1.31, options.z);
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.285 * scale, 0.035 * scale, 6, segments), options.materials.gold);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(options.x, 1.31, options.z);
  options.group.add(base, body, dome, domeRing);

  const facingAngle = Math.atan2(options.x, options.z);
  const window = new THREE.Mesh(new THREE.PlaneGeometry(0.13 * scale, 0.3 * scale), options.materials.aquaGlass);
  window.position.set(
    options.x + Math.sin(facingAngle) * 0.268 * scale,
    1.01,
    options.z + Math.cos(facingAngle) * 0.268 * scale,
  );
  window.rotation.y = facingAngle;
  options.group.add(window);
  addPearlFinial(options.group, options.materials, [options.x, 1.68, options.z], 0.075 * scale);
}

function addTidekeeperFacadeArcade(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  quality: Island3DQuality;
  radius: number;
  baseY: number;
  count: number;
}) {
  const segments = options.quality === 'low' ? 7 : 10;
  for (let index = 0; index < options.count; index += 1) {
    const angle = (index / options.count) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const pilaster = createCylinder(0.035, 0.047, 0.58, segments, options.materials.gold);
    pilaster.position.set(sin * options.radius, options.baseY + 0.29, cos * options.radius);
    const window = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.31), options.materials.deepWindow);
    window.position.set(sin * (options.radius + 0.012), options.baseY + 0.3, cos * (options.radius + 0.012));
    window.rotation.y = angle;
    const windowArch = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.018, 5, 12, Math.PI), options.materials.gold);
    windowArch.position.set(sin * (options.radius + 0.025), options.baseY + 0.455, cos * (options.radius + 0.025));
    windowArch.rotation.y = angle;
    windowArch.rotation.z = Math.PI;
    options.group.add(pilaster, window, windowArch);
    if (index % 2 === 0) {
      addPearlFinial(
        options.group,
        options.materials,
        [sin * options.radius, options.baseY + 0.67, cos * options.radius],
        0.052,
      );
    }
  }
}

function addTidekeeperHallFoundationDetail(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
) {
  const frontCornice = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.075, 0.1), materials.gold);
  frontCornice.position.set(0, 1.57, 0.51);
  const rearCornice = frontCornice.clone();
  rearCornice.position.z = -0.51;
  const sideCorniceGeometry = new THREE.BoxGeometry(0.1, 0.075, 1.0);
  const leftCornice = new THREE.Mesh(sideCorniceGeometry, materials.gold);
  leftCornice.position.set(-0.64, 1.57, 0);
  const rightCornice = leftCornice.clone();
  rightCornice.position.x = 0.64;
  group.add(frontCornice, rearCornice, leftCornice, rightCornice);

  for (const x of [-0.5, 0.5]) {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.09), materials.limestoneShade);
    pilaster.position.set(x, 1.12, 0.535);
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.075, 0.13), materials.gold);
    capital.position.set(x, 1.52, 0.54);
    group.add(pilaster, capital);
  }

  for (const x of [-0.34, 0.34]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 5, 14, Math.PI), materials.gold);
    arch.position.set(x, 1.29, 0.525);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.055), materials.gold);
    sill.position.set(x, 0.95, 0.53);
    group.add(arch, sill);
  }

  if (quality !== 'low') {
    for (const side of [-1, 1]) {
      const sideWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.3), materials.deepWindow);
      sideWindow.position.set(side * 0.626, 1.13, 0);
      sideWindow.rotation.y = side * Math.PI / 2;
      const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.38, 0.25), materials.gold);
      sideFrame.position.set(side * 0.64, 1.13, 0);
      group.add(sideWindow, sideFrame);
    }
  }

  const roofTip = new THREE.Vector3(0, 2.26, 0);
  for (const [x, z] of [[-0.67, -0.56], [0.67, -0.56], [-0.67, 0.56], [0.67, 0.56]] as const) {
    const start = new THREE.Vector3(x, 1.62, z);
    const direction = new THREE.Vector3().subVectors(roofTip, start);
    const rib = createCylinder(0.018, 0.018, direction.length(), 6, materials.gold);
    rib.position.copy(start).add(roofTip).multiplyScalar(0.5);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(rib);
  }

  const tideCrest = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.027, 6, quality === 'high' ? 20 : 14, Math.PI * 0.82),
    materials.reefAccent,
  );
  tideCrest.position.set(0, 2.04, 0.59);
  tideCrest.rotation.z = 0.22;
  group.add(tideCrest);
}

function createHabitLandmark(level: BuildLevel, quality: Island3DQuality, materials: PilotMaterials): THREE.Group {
  const group = new THREE.Group();
  addCeremonialTerrace(group, materials, quality);

  // L1 deliberately preserves the compact hall identity that Eivind recognised
  // as the correct starting tier. Its small details introduce the Tidekeeper
  // language without borrowing the later sanctuary silhouette.
  if (level === 1) {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.05, 1.0), materials.limestoneBright);
    hall.position.y = 1.06;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.98, 0.68, 4), materials.purpleRoof);
    roof.position.y = 1.92;
    roof.rotation.y = Math.PI / 4;
    group.add(hall, roof);
    addArchedEntrance(group, materials, 0.515, 0.58);
    for (const x of [-0.34, 0.34]) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.34), materials.aquaGlass);
      window.position.set(x, 1.12, 0.506);
      group.add(window);
    }
    addTidekeeperHallFoundationDetail(group, materials, quality);
    addPearlFinial(group, materials, [0, 2.34, 0], 0.17);
    return group;
  }

  // The upper tiers preserve a working tide pool beneath an increasingly
  // complete rotunda, retaining the water-first identity at every upgrade.
  const sanctuaryBase = createCylinder(0.92, 1.04, 0.42, quality === 'low' ? 16 : 28, materials.limestoneBright);
  sanctuaryBase.position.y = 0.76;
  const tidePool = createCylinder(0.55, 0.55, 0.055, quality === 'low' ? 16 : 30, materials.waterGlow);
  tidePool.position.y = 0.995;
  const poolRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.042, 7, quality === 'low' ? 16 : 28), materials.gold);
  poolRim.rotation.x = Math.PI / 2;
  poolRim.position.y = 1.03;
  group.add(sanctuaryBase, tidePool, poolRim);

  if (level === 2) {
    const drum = createCylinder(0.9, 0.95, 0.68, quality === 'low' ? 16 : 28, materials.limestoneBright);
    drum.position.y = 1.19;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.91, quality === 'low' ? 16 : quality === 'medium' ? 24 : 32, quality === 'low' ? 9 : 16, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.purpleRoof,
    );
    dome.position.y = 1.53;
    const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.04, 7, quality === 'low' ? 18 : 30), materials.gold);
    domeRing.rotation.x = Math.PI / 2;
    domeRing.position.y = 1.53;
    group.add(drum, dome, domeRing);

    const ribCount = quality === 'low' ? 6 : quality === 'medium' ? 8 : 12;
    for (let index = 0; index < ribCount; index += 1) {
      addArchRib(group, 0.915, 0.022, 1.535, (index / ribCount) * Math.PI, materials.gold, quality);
    }
    addTidekeeperFacadeArcade({
      group,
      materials,
      quality,
      radius: 0.905,
      baseY: 0.88,
      count: quality === 'high' ? 12 : 8,
    });
    const crescentCount = quality === 'low' ? 6 : 8;
    for (let index = 0; index < crescentCount; index += 1) {
      const angle = (index / crescentCount) * Math.PI * 2 + Math.PI / crescentCount;
      addTidekeeperCrescent({ group, materials, angle, radius: 1.24, y: 0.82, quality, accent: index % 3 === 0, size: 0.3 });
    }
    addGoldBalustrade(group, materials, 1.16, 0.76, quality === 'high' ? 18 : 12);
    addArchedEntrance(group, materials, 0.98, 0.78);
    const oculus = createCylinder(0.17, 0.23, 0.14, quality === 'low' ? 10 : 18, materials.gold);
    oculus.position.y = 2.46;
    group.add(oculus);
    addPearlFinial(group, materials, [0, 2.68, 0], 0.13);
    return group;
  }

  // L3 is the complete Tidekeeper palace: a broad rotunda replaces the former
  // tall generic citadel so it matches the approved purple-and-gold dome family.
  const drum = createCylinder(1.02, 1.08, 0.78, quality === 'low' ? 18 : 32, materials.limestoneBright);
  drum.position.y = 1.18;
  const drumGoldRing = new THREE.Mesh(new THREE.TorusGeometry(1.035, 0.045, 7, quality === 'low' ? 18 : 32), materials.gold);
  drumGoldRing.rotation.x = Math.PI / 2;
  drumGoldRing.position.y = 1.57;
  const grandDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, quality === 'low' ? 18 : quality === 'medium' ? 26 : 36, quality === 'low' ? 10 : 18, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.purpleRoofBright,
  );
  grandDome.position.y = 1.57;
  group.add(drum, drumGoldRing, grandDome);

  const goldRibs = quality === 'low' ? 6 : quality === 'medium' ? 10 : 14;
  for (let index = 0; index < goldRibs; index += 1) {
    addArchRib(group, 1.045, 0.023, 1.575, (index / goldRibs) * Math.PI, materials.gold, quality);
  }

  for (const [x, z] of [[-0.94, -0.72], [0.94, -0.72], [-0.94, 0.72], [0.94, 0.72]] as const) {
    addTidekeeperPavilion({ group, materials, x, z, quality });
  }

  addTidekeeperFacadeArcade({
    group,
    materials,
    quality,
    radius: 1.03,
    baseY: 0.91,
    count: quality === 'high' ? 14 : 10,
  });

  const lanternBase = createCylinder(0.25, 0.32, 0.28, quality === 'low' ? 10 : 18, materials.gold);
  lanternBase.position.y = 2.66;
  const lanternGlass = createCylinder(0.19, 0.22, 0.26, quality === 'low' ? 10 : 18, materials.aquaGlass);
  lanternGlass.position.y = 2.92;
  const lanternCap = new THREE.Mesh(new THREE.SphereGeometry(0.25, quality === 'low' ? 10 : 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), materials.gold);
  lanternCap.position.y = 3.05;
  group.add(lanternBase, lanternGlass, lanternCap);
  addPearlFinial(group, materials, [0, 3.35, 0], 0.15);

  addCircularWindowBand(group, materials, 1.025, 1.21, quality === 'high' ? 16 : 10, 0.29);
  addGoldBalustrade(group, materials, 1.31, 0.79, quality === 'high' ? 20 : 12);
  addShellOrnaments(group, materials, 1.24, 0.65, quality === 'high' ? 10 : 6);
  addArchedEntrance(group, materials, 1.09, 0.9);

  const crescentCount = quality === 'low' ? 6 : quality === 'medium' ? 8 : 10;
  for (let index = 0; index < crescentCount; index += 1) {
    const angle = (index / crescentCount) * Math.PI * 2;
    addTidekeeperCrescent({ group, materials, angle, radius: 1.31, y: 0.85, quality, accent: index % 4 === 0, size: 0.33 });
  }
  return group;
}

function addArchiveShelfWall(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  quality: Island3DQuality;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
}) {
  const back = new THREE.Mesh(new THREE.BoxGeometry(options.width, options.height, 0.12), options.materials.limestoneShade);
  back.position.set(options.x, options.y, options.z);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(options.width * 0.88, options.height * 0.78, 0.045), options.materials.deepWindow);
  inset.position.set(options.x, options.y, options.z + 0.083);
  options.group.add(back, inset);

  const rows = options.quality === 'low' ? 2 : 3;
  const columns = options.quality === 'high' ? 5 : 3;
  for (let row = 0; row <= rows; row += 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(options.width * 0.9, 0.035, 0.09), options.materials.gold);
    shelf.position.set(options.x, options.y - options.height * 0.38 + row * (options.height * 0.76 / rows), options.z + 0.115);
    options.group.add(shelf);
  }
  for (let column = 1; column < columns; column += 1) {
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.025, options.height * 0.76, 0.08), options.materials.gold);
    divider.position.set(
      options.x - options.width * 0.44 + column * (options.width * 0.88 / columns),
      options.y,
      options.z + 0.112,
    );
    options.group.add(divider);
  }
  if (options.quality !== 'low') {
    for (let index = 0; index < columns * 2; index += 1) {
      const volume = new THREE.Mesh(
        new THREE.BoxGeometry(0.045 + (index % 2) * 0.018, 0.12 + (index % 3) * 0.025, 0.045),
        index % 3 === 0 ? options.materials.reefAccent : index % 2 === 0 ? options.materials.aquaGlass : options.materials.banner,
      );
      const row = index % 2;
      volume.position.set(
        options.x - options.width * 0.38 + (index % columns) * (options.width * 0.76 / Math.max(1, columns - 1)),
        options.y - options.height * 0.21 + row * options.height * 0.28,
        options.z + 0.145,
      );
      options.group.add(volume);
    }
  }
}

function addArchiveGableRoof(options: {
  group: THREE.Group;
  materials: PilotMaterials;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  bright?: boolean;
}) {
  const roofMaterial = options.bright ? options.materials.purpleRoofBright : options.materials.purpleRoof;
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(options.width * 0.56, 0.085, options.depth * 1.08), roofMaterial);
    panel.position.set(options.x + side * options.width * 0.235, options.y, options.z);
    panel.rotation.z = side * 0.38;
    options.group.add(panel);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, options.depth * 1.12), options.materials.gold);
  ridge.position.set(options.x, options.y + options.width * 0.105, options.z);
  options.group.add(ridge);
}

function addArchiveCodex(
  group: THREE.Group,
  materials: PilotMaterials,
  position: readonly [number, number, number],
  scale = 1,
) {
  for (const side of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.045 * scale, 0.3 * scale), materials.limestoneBright);
    page.position.set(position[0] + side * 0.16 * scale, position[1], position[2]);
    page.rotation.z = side * -0.22;
    group.add(page);
    const lineCount = 3;
    for (let line = 0; line < lineCount; line += 1) {
      const glyphLine = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.008 * scale, 0.012 * scale), materials.gold);
      glyphLine.position.set(
        position[0] + side * 0.17 * scale,
        position[1] + 0.055 * scale,
        position[2] - 0.08 * scale + line * 0.075 * scale,
      );
      glyphLine.rotation.z = side * -0.22;
      group.add(glyphLine);
    }
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.075 * scale, 0.34 * scale), materials.gold);
  spine.position.set(position[0], position[1] - 0.015 * scale, position[2]);
  group.add(spine);
}

function addArchiveEntrance(
  group: THREE.Group,
  materials: PilotMaterials,
  z: number,
  baseY: number,
  scale = 1,
) {
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.72 * scale, 0.07), materials.deepWindow);
  door.position.set(0, baseY + 0.36 * scale, z);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.235 * scale, 0.045 * scale, 7, 22, Math.PI), materials.gold);
  arch.position.set(0, baseY + 0.72 * scale, z + 0.035);
  arch.rotation.z = Math.PI;
  group.add(door, arch);
  for (const x of [-0.32, 0.32]) {
    const column = createCylinder(0.055 * scale, 0.07 * scale, 0.8 * scale, 9, materials.limestoneBright);
    column.position.set(x * scale, baseY + 0.4 * scale, z + 0.01);
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.07 * scale, 0.14), materials.gold);
    capital.position.set(x * scale, baseY + 0.81 * scale, z + 0.01);
    group.add(column, capital);
  }
  for (let step = 0; step < 3; step += 1) {
    const stair = new THREE.Mesh(new THREE.BoxGeometry((0.72 + step * 0.16) * scale, 0.075, 0.2), materials.limestoneBright);
    stair.position.set(0, baseY - step * 0.055, z + 0.16 + step * 0.14);
    group.add(stair);
  }
}

function addArchiveFoundationDetail(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
) {
  // Keep the L1 archive an open reading pavilion, but give every visible edge
  // a crafted purpose: a processional threshold, side reading bays and a
  // clearly framed roof. Later levels still own the enclosed wings and height.
  for (let step = 0; step < 3; step += 1) {
    const stair = new THREE.Mesh(
      new THREE.BoxGeometry(0.72 + step * 0.18, 0.065, 0.18),
      step === 0 ? materials.gold : materials.limestoneBright,
    );
    stair.position.set(0, 0.65 - step * 0.045, 0.55 + step * 0.13);
    group.add(stair);
  }

  for (const side of [-1, 1]) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.66), materials.limestoneShade);
    bay.position.set(side * 0.55, 0.88, -0.02);
    const shelfInset = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.23, 0.43), materials.deepWindow);
    shelfInset.position.set(side * 0.7, 0.93, -0.02);
    const shelfFrame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.5), materials.gold);
    shelfFrame.position.set(side * 0.718, 0.93, -0.02);
    const readingBench = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.25), materials.purpleRoof);
    readingBench.position.set(side * 0.52, 0.82, 0.34);
    group.add(bay, shelfFrame, shelfInset, readingBench);

    if (quality !== 'low') {
      for (const z of [-0.15, 0.02, 0.19]) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.13, 0.08),
          z === 0.02 ? materials.reefAccent : materials.purpleRoofBright,
        );
        book.position.set(side * 0.742, 0.93, z);
        group.add(book);
      }
    }

    const lampPost = createCylinder(0.025, 0.035, 0.44, 7, materials.gold);
    lampPost.position.set(side * 0.68, 0.9, 0.45);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), materials.voiceGlow);
    lamp.position.set(side * 0.68, 1.15, 0.45);
    group.add(lampPost, lamp);
  }

  const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.055, 0.055), materials.gold);
  frontFascia.position.set(0, 1.43, -0.105);
  const floorInlay = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, quality === 'low' ? 12 : 24), materials.aquaGlass);
  floorInlay.rotation.x = -Math.PI / 2;
  floorInlay.position.set(0, 0.73, 0.12);
  group.add(frontFascia, floorInlay);
}

function createWisdomLandmark(level: BuildLevel, quality: Island3DQuality, materials: PilotMaterials): THREE.Group {
  const group = new THREE.Group();
  addCeremonialTerrace(group, materials, quality);

  if (level === 1) {
    const readingFloor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.13, 0.96), materials.limestoneBright);
    readingFloor.position.y = 0.66;
    group.add(readingFloor);
    addArchiveShelfWall({ group, materials, quality, x: 0, y: 1.03, z: -0.34, width: 1.08, height: 0.68 });
    addArchiveGableRoof({ group, materials, x: 0, y: 1.43, z: -0.34, width: 1.18, depth: 0.42 });
    for (const x of [-0.62, 0.62]) {
      const column = createCylinder(0.065, 0.08, 0.7, 9, materials.limestoneBright);
      column.position.set(x, 1.03, 0.28);
      group.add(column);
    }
    addArchiveFoundationDetail(group, materials, quality);
    const readingDesk = createCylinder(0.26, 0.3, 0.18, quality === 'low' ? 12 : 20, materials.gold);
    readingDesk.position.set(0, 0.82, 0.16);
    group.add(readingDesk);
    addArchiveCodex(group, materials, [0, 0.98, 0.16], 0.82);
    addPearlFinial(group, materials, [0, 1.33, 0.16], 0.11);
    return group;
  }

  const grand = level >= 3;
  const centralHeight = grand ? 1.32 : 1.02;
  const centralBody = new THREE.Mesh(new THREE.BoxGeometry(1.06, centralHeight, 0.82), materials.limestoneBright);
  centralBody.position.set(0, 0.62 + centralHeight / 2, -0.08);
  group.add(centralBody);

  const wingHeight = grand ? 1.0 : 0.72;
  for (const x of [-0.79, 0.79]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(grand ? 0.64 : 0.56, wingHeight, 0.84), materials.limestoneBright);
    wing.position.set(x, 0.62 + wingHeight / 2, -0.02);
    group.add(wing);
    addArchiveShelfWall({
      group,
      materials,
      quality,
      x,
      y: grand ? 1.12 : 0.97,
      z: 0.415,
      width: grand ? 0.52 : 0.46,
      height: grand ? 0.66 : 0.48,
    });
    addArchiveGableRoof({
      group,
      materials,
      x,
      y: grand ? 1.69 : 1.42,
      z: -0.02,
      width: grand ? 0.7 : 0.62,
      depth: 0.9,
      bright: grand,
    });
  }

  addArchiveGableRoof({
    group,
    materials,
    x: 0,
    y: grand ? 2.0 : 1.69,
    z: -0.08,
    width: 1.18,
    depth: 0.9,
    bright: grand,
  });
  addArchiveEntrance(group, materials, 0.35, 0.61, grand ? 1.02 : 0.88);

  if (!grand) {
    for (const x of [-0.76, 0.76]) addPearlFinial(group, materials, [x, 1.72, -0.02], 0.08);
    addArchiveCodex(group, materials, [0, 1.98, -0.06], 0.68);
    addPearlFinial(group, materials, [0, 2.29, -0.06], 0.12);
    return group;
  }

  addArchiveShelfWall({ group, materials, quality, x: 0, y: 1.52, z: 0.345, width: 0.78, height: 0.42 });
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.09, 0.24), materials.limestoneShade);
  balcony.position.set(0, 1.45, 0.5);
  group.add(balcony);
  for (const x of [-0.38, -0.19, 0, 0.19, 0.38]) {
    const baluster = createCylinder(0.02, 0.025, 0.28, 7, materials.gold);
    baluster.position.set(x, 1.62, 0.57);
    group.add(baluster);
  }
  const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.035, 0.045), materials.gold);
  balconyRail.position.set(0, 1.76, 0.57);
  group.add(balconyRail);

  const portalCrown = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 7, 24, Math.PI), materials.limestoneShade);
  portalCrown.position.set(0, 1.36, 0.405);
  portalCrown.rotation.z = Math.PI;
  const portalGold = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.026, 6, 22, Math.PI), materials.gold);
  portalGold.position.set(0, 1.36, 0.442);
  portalGold.rotation.z = Math.PI;
  const portalPearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), materials.voiceGlow);
  portalPearl.position.set(0, 1.7, 0.45);
  group.add(portalCrown, portalGold, portalPearl);

  for (const x of [-0.49, 0.49]) {
    const scrollColumn = createCylinder(0.06, 0.075, 0.88, 10, materials.limestoneBright);
    scrollColumn.position.set(x, 1.15, 0.43);
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.022, 6, 14), materials.gold);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(x, 0.72, 0.43);
    const scrollCap = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.025, 6, 16), materials.gold);
    scrollCap.rotation.x = Math.PI / 2;
    scrollCap.position.set(x, 1.6, 0.43);
    group.add(scrollColumn, baseRing, scrollCap);
  }

  const centralCornice = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.075, 0.08), materials.gold);
  centralCornice.position.set(0, 1.89, 0.34);
  group.add(centralCornice);
  for (const x of [-0.79, 0.79]) {
    const wingCornice = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.065, 0.075), materials.gold);
    wingCornice.position.set(x, 1.59, 0.4);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.18), materials.limestoneShade);
    bench.position.set(x, 0.7, 0.68);
    const benchGold = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.2), materials.gold);
    benchGold.position.set(x, 0.76, 0.68);
    group.add(wingCornice, bench, benchGold);
    addPearlFinial(group, materials, [x, 0.98, 0.68], 0.065);
  }

  addArchiveCodex(group, materials, [0, 2.46, -0.06], 1.18);
  addPearlFinial(group, materials, [0, 2.94, -0.06], 0.16);
  const rayCount = quality === 'low' ? 3 : 7;
  for (let index = 0; index < rayCount; index += 1) {
    const progress = index / (rayCount - 1);
    const angle = -0.72 + progress * 1.44;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.56, 0.025), materials.gold);
    ray.position.set(Math.sin(angle) * 0.48, 2.45 + Math.cos(angle) * 0.18, -0.12);
    ray.rotation.z = -angle;
    group.add(ray);
  }
  addGoldBalustrade(group, materials, 1.31, 0.76, quality === 'high' ? 18 : 12);
  addShellOrnaments(group, materials, 1.23, 0.63, quality === 'high' ? 10 : 6);
  return group;
}

function addArenaGoal(
  group: THREE.Group,
  materials: PilotMaterials,
  x: number,
  direction: -1 | 1,
) {
  const goalX = x + direction * 0.025;
  for (const z of [-0.23, 0.23]) {
    const upright = createCylinder(0.026, 0.032, 0.32, 8, materials.gold);
    upright.position.set(goalX, 0.82, z);
    group.add(upright);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), materials.gold);
  crossbar.position.set(goalX, 0.98, 0);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.25), materials.aquaGlass);
  net.rotation.y = Math.PI / 2;
  net.position.set(goalX - direction * 0.018, 0.84, 0);
  group.add(crossbar, net);
}

function addArenaField(group: THREE.Group, materials: PilotMaterials, quality: Island3DQuality) {
  const segments = quality === 'low' ? 18 : quality === 'medium' ? 28 : 40;
  const pitch = createCylinder(0.71, 0.74, 0.085, segments, materials.grass);
  pitch.scale.z = 0.66;
  pitch.position.y = 0.64;
  const pitchBorder = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.035, 7, segments), materials.limestoneBright);
  pitchBorder.rotation.x = Math.PI / 2;
  pitchBorder.scale.y = 0.66;
  pitchBorder.position.y = 0.695;
  const centreCircle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 6, 20), materials.gold);
  centreCircle.rotation.x = Math.PI / 2;
  centreCircle.scale.y = 0.76;
  centreCircle.position.y = 0.7;
  const halfwayLine = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.84), materials.gold);
  halfwayLine.position.y = 0.704;
  const centrePearl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 7), materials.pearlAccent);
  centrePearl.position.y = 0.77;
  group.add(pitch, pitchBorder, centreCircle, halfwayLine, centrePearl);
  addArenaGoal(group, materials, -0.62, -1);
  addArenaGoal(group, materials, 0.62, 1);
}

function addArenaStandRing(options: {
  group: THREE.Group;
  material: THREE.Material;
  radius: number;
  tube: number;
  y: number;
  quality: Island3DQuality;
}) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(
      options.radius,
      options.tube,
      options.quality === 'low' ? 6 : 8,
      options.quality === 'high' ? 40 : options.quality === 'medium' ? 30 : 20,
    ),
    options.material,
  );
  ring.rotation.x = Math.PI / 2;
  ring.scale.y = 0.68;
  ring.position.y = options.y;
  options.group.add(ring);
}

function addArenaTunnel(group: THREE.Group, materials: PilotMaterials, front: boolean) {
  const z = front ? 0.995 : -0.995;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.07), materials.deepWindow);
  door.position.set(0, 0.82, z);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.034, 6, 18, Math.PI), materials.gold);
  arch.position.set(0, 0.98, z + (front ? 0.04 : -0.04));
  arch.rotation.z = Math.PI;
  group.add(door, arch);
  if (!front) return;
  for (let step = 0; step < 3; step += 1) {
    const stair = new THREE.Mesh(new THREE.BoxGeometry(0.58 + step * 0.13, 0.07, 0.18), materials.limestoneBright);
    stair.position.set(0, 0.55 - step * 0.055, 1.09 + step * 0.14);
    group.add(stair);
  }
}

function addArenaSeatMarkers(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
  radius: number,
  y: number,
) {
  const count = quality === 'low' ? 8 : quality === 'medium' ? 16 : 26;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    if (Math.cos(angle) > 0.9) continue;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.04, 0.075),
      index % 6 === 0 ? materials.gold : materials.purpleRoofBright,
    );
    seat.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius * 0.68);
    seat.rotation.y = angle;
    group.add(seat);
  }
}

function addArenaScoreboard(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
  grand = false,
) {
  const boardY = grand ? 1.78 : 1.46;
  const boardZ = grand ? -0.84 : -0.92;
  for (const x of [-0.3, 0.3]) {
    const postHeight = grand ? 1.1 : 0.72;
    const post = createCylinder(0.035, 0.045, postHeight, 8, materials.gold);
    post.position.set(x, boardY - postHeight * 0.48, boardZ);
    group.add(post);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.38, 0.085), materials.deepWindow);
  board.position.set(0, boardY, boardZ);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.045, 0.12), materials.gold);
  frameTop.position.set(0, boardY + 0.21, boardZ);
  const frameBottom = frameTop.clone();
  frameBottom.position.y = boardY - 0.21;
  group.add(board, frameTop, frameBottom);
  if (quality !== 'low') {
    for (const x of [-0.18, 0.18]) {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), x < 0 ? materials.voiceGlow : materials.reefAccent);
      crest.position.set(x, boardY, boardZ + 0.05);
      group.add(crest);
    }
  }
}

function addArenaFloodlight(group: THREE.Group, materials: PilotMaterials, x: number, quality: Island3DQuality) {
  const pole = createCylinder(0.035, 0.05, 1.32, 8, materials.gold);
  pole.position.set(x, 1.2, -0.73);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.07), materials.limestoneBright);
  panel.position.set(x, 1.91, -0.7);
  panel.rotation.x = -0.18;
  group.add(pole, panel);
  const lampCount = quality === 'low' ? 2 : 4;
  for (let index = 0; index < lampCount; index += 1) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), materials.voiceGlow);
    lamp.position.set(x - 0.12 + index * (0.24 / Math.max(1, lampCount - 1)), 1.91, -0.655);
    group.add(lamp);
  }
}

function addArenaPracticeGroundDetail(
  group: THREE.Group,
  materials: PilotMaterials,
  quality: Island3DQuality,
) {
  // L1 reads as a finished community practice ground, not an empty disk. The
  // low rail, benches and team standards deliberately stop below L2 seating.
  const markerCount = quality === 'low' ? 8 : quality === 'medium' ? 12 : 16;
  for (let index = 0; index < markerCount; index += 1) {
    const angle = (index / markerCount) * Math.PI * 2;
    if (Math.cos(angle) > 0.82) continue;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.055, 0.1),
      index % 4 === 0 ? materials.gold : materials.purpleRoofBright,
    );
    seat.position.set(Math.sin(angle) * 0.9, 0.82, Math.cos(angle) * 0.61);
    seat.rotation.y = angle;
    group.add(seat);
  }

  for (const side of [-1, 1]) {
    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.64), materials.limestoneShade);
    benchBase.position.set(side * 0.86, 0.75, 0.02);
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.58), materials.purpleRoof);
    benchSeat.position.set(side * 0.86, 0.86, 0.02);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.7), materials.gold);
    rail.position.set(side * 1.0, 0.91, 0.02);
    group.add(benchBase, benchSeat, rail);
  }

  const standards: readonly [number, number, THREE.Material][] = [
    [-0.78, -0.58, materials.reefAccent],
    [0.78, -0.58, materials.voiceGlow],
    [-0.78, 0.55, materials.voiceGlow],
    [0.78, 0.55, materials.reefAccent],
  ];
  for (const [x, z, material] of standards) {
    const post = createCylinder(0.018, 0.025, 0.42, 7, materials.gold);
    post.position.set(x, 1.0, z);
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065), material);
    crest.position.set(x, 1.23, z);
    group.add(post, crest);
  }

  const entranceLintel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.09), materials.limestoneBright);
  entranceLintel.position.set(0, 1.09, 0.995);
  const entrancePearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), materials.pearlAccent);
  entrancePearl.position.set(0, 1.18, 1.02);
  group.add(entranceLintel, entrancePearl);
}

function createEventLandmark(level: BuildLevel, quality: Island3DQuality, materials: PilotMaterials): THREE.Group {
  const group = new THREE.Group();
  addCeremonialTerrace(group, materials, quality);
  addArenaField(group, materials, quality);

  // L1 is an unmistakable open practice arena: playing field, goals and a low
  // spectator rail. The centre remains playable at every later level.
  addArenaStandRing({ group, material: materials.limestoneBright, radius: 0.94, tube: 0.075, y: 0.69, quality });
  addArenaStandRing({ group, material: materials.gold, radius: 1.02, tube: 0.025, y: 0.79, quality });
  addArenaTunnel(group, materials, true);
  if (level === 1) addArenaPracticeGroundDetail(group, materials, quality);

  if (level >= 2) {
    // L2 turns the practice court into an operational tournament bowl with
    // stepped seating, team tunnel and a real score display.
    const tiers = quality === 'low' ? 2 : 3;
    for (let index = 0; index < tiers; index += 1) {
      addArenaStandRing({
        group,
        material: materials.limestoneBright,
        radius: 0.8 + index * 0.15,
        tube: 0.095,
        y: 0.78 + index * 0.12,
        quality,
      });
      addArenaStandRing({
        group,
        material: index % 2 === 0 ? materials.purpleRoof : materials.purpleRoofBright,
        radius: 0.82 + index * 0.15,
        tube: 0.045,
        y: 0.86 + index * 0.12,
        quality,
      });
    }
    addArenaTunnel(group, materials, false);
    addArenaScoreboard(group, materials, quality, level >= 3);
    addArenaSeatMarkers(group, materials, quality, 1.0, 1.12);
    const bannerCount = quality === 'low' ? 4 : 8;
    for (let index = 0; index < bannerCount; index += 1) {
      const angle = (index / bannerCount) * Math.PI * 2 + Math.PI / bannerCount;
      const post = createCylinder(0.022, 0.03, 0.5, 7, materials.gold);
      post.position.set(Math.sin(angle) * 1.08, 1.18, Math.cos(angle) * 0.73);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24), materials.banner);
      flag.position.set(Math.sin(angle) * 1.08, 1.34, Math.cos(angle) * 0.73);
      flag.rotation.y = angle;
      group.add(post, flag);
    }
  }

  if (level >= 3) {
    // L3 adds championship infrastructure around—not over—the field. Three
    // canopy sections leave the pitch visually open and avoid palace language.
    addArenaStandRing({ group, material: materials.limestoneShade, radius: 1.16, tube: 0.11, y: 1.08, quality });
    addArenaStandRing({ group, material: materials.purpleRoofBright, radius: 1.17, tube: 0.065, y: 1.19, quality });

    for (const x of [-0.98, 0.98]) {
      const sideCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 1.12), materials.purpleRoofBright);
      sideCanopy.position.set(x, 1.37, 0.05);
      sideCanopy.rotation.z = x < 0 ? -0.1 : 0.1;
      const goldEdge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.16), materials.gold);
      goldEdge.position.set(x + (x < 0 ? -0.14 : 0.14), 1.42, 0.05);
      goldEdge.rotation.z = sideCanopy.rotation.z;
      group.add(sideCanopy, goldEdge);
    }
    const rearCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.09, 0.26), materials.purpleRoof);
    rearCanopy.position.set(0, 1.37, -0.72);
    const rearEdge = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.035, 0.035), materials.gold);
    rearEdge.position.set(0, 1.42, -0.59);
    group.add(rearCanopy, rearEdge);

    const royalBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.25), materials.limestoneBright);
    royalBox.position.set(0, 1.31, -0.82);
    const royalWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.25), materials.aquaGlass);
    royalWindow.position.set(0, 1.33, -0.686);
    const royalAwning = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.36), materials.purpleRoofBright);
    royalAwning.position.set(0, 1.57, -0.8);
    const championPearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), materials.pearlAccent);
    championPearl.position.set(0, 1.72, -0.8);
    group.add(royalBox, royalWindow, royalAwning, championPearl);

    addArenaFloodlight(group, materials, -0.96, quality);
    addArenaFloodlight(group, materials, 0.96, quality);
    addArenaSeatMarkers(group, materials, quality, 1.12, 1.25);

    const trophyPlinth = createCylinder(0.13, 0.18, 0.22, quality === 'low' ? 8 : 14, materials.gold);
    trophyPlinth.position.set(0, 0.88, 0.73);
    const trophyPearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), materials.voiceGlow);
    trophyPearl.position.set(0, 1.08, 0.73);
    group.add(trophyPlinth, trophyPearl);
  }
  return group;
}

type CitadelTexturePattern = 'reef-stone' | 'roof-tile';

function createCitadelPatternTexture(size: number, pattern: CitadelTexturePattern): THREE.DataTexture | null {
  if (size <= 0) return null;
  const data = new Uint8Array(size * size * 4);
  const rowHeight = Math.max(8, Math.round(size / (pattern === 'reef-stone' ? 8 : 10)));
  const cellWidth = Math.max(8, Math.round(size / (pattern === 'reef-stone' ? 4 : 9)));
  const mortarWidth = Math.max(1, Math.round(size / 180));

  const noise = (x: number, y: number) => {
    let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
  };

  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / rowHeight);
    const offset = row % 2 === 0 ? 0 : Math.floor(cellWidth / 2);
    for (let x = 0; x < size; x += 1) {
      const pixel = (y * size + x) * 4;
      const localX = (x + offset) % cellWidth;
      const localY = y % rowHeight;
      const seam = localY < mortarWidth || localX < mortarWidth;
      const grain = (noise(x, y) - 0.5) * (pattern === 'reef-stone' ? 18 : 12);
      const edgeLight = localY < mortarWidth * 3 ? 7 : 0;
      const base = pattern === 'reef-stone' ? 224 : 218;
      const value = Math.max(72, Math.min(255, Math.round(seam ? base - 54 : base + grain + edgeLight)));
      data[pixel] = value;
      data[pixel + 1] = value;
      data[pixel + 2] = pattern === 'reef-stone' ? Math.min(255, value + 4) : value;
      data[pixel + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `CROWN_CITADEL_${pattern.toUpperCase()}_${size}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'reef-stone' ? 3 : 4, pattern === 'reef-stone' ? 3 : 4);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

interface PilotMaterials extends CrownCitadelMaterials {
  reef: THREE.MeshBasicMaterial;
  grass: THREE.MeshStandardMaterial;
  bridge: THREE.MeshStandardMaterial;
  coral: THREE.MeshStandardMaterial;
  coralGlass: THREE.MeshPhysicalMaterial;
  pearl: THREE.MeshStandardMaterial;
  mintGlow: THREE.MeshStandardMaterial;
  waterGlow: THREE.MeshStandardMaterial;
}

function createPilotMaterials(quality: Island3DQuality, worldSourceNumber: IslandRunAuthored3DWorldSource = 5): PilotMaterials {
  const detail = CROWN_CITADEL_DETAIL_PROFILES[quality];
  const stoneMap = createCitadelPatternTexture(detail.textureSize, 'reef-stone');
  const roofMap = createCitadelPatternTexture(detail.textureSize, 'roof-tile');
  const isFirstLightKingdom = worldSourceNumber === 1;
  const isCelestialSkyKingdom = worldSourceNumber === 2;
  const isFrostmoonHaven = worldSourceNumber === 3;
  const isSunshoreAtoll = worldSourceNumber === 5;
  const isMoonveilNexus = worldSourceNumber === 6;
  const isAbyssalPearlKingdom = worldSourceNumber === 7;
  const limestoneColor = isFirstLightKingdom
    ? 0xf1e6d3
    : isCelestialSkyKingdom
      ? 0xf5f0dd
      : isFrostmoonHaven
        ? 0xdce8f5
        : isSunshoreAtoll
          ? 0xe7c67d
          : isMoonveilNexus
            ? 0x242957
            : isAbyssalPearlKingdom
              ? 0xd8eee5
            : 0xe8dcbf;
  const limestoneShadeColor = isFirstLightKingdom
    ? 0xc5b59e
    : isCelestialSkyKingdom
      ? 0xc9d3d5
      : isFrostmoonHaven
        ? 0x73849f
        : isSunshoreAtoll
          ? 0x8e7963
          : isMoonveilNexus
            ? 0x090b20
            : isAbyssalPearlKingdom
              ? 0x4d7c82
            : 0xb7a98e;
  const limestoneBrightColor = isFirstLightKingdom
    ? 0xfff8e7
    : isCelestialSkyKingdom
      ? 0xfffaf0
      : isFrostmoonHaven
        ? 0xf4f9ff
        : isSunshoreAtoll
          ? 0xffe6a2
          : isMoonveilNexus
            ? 0x5961bc
            : isAbyssalPearlKingdom
              ? 0xf5fff3
            : 0xfff1cf;
  const reefColor = isFirstLightKingdom
    ? 0xa9a7a8
    : isCelestialSkyKingdom
      ? 0x66768b
      : isFrostmoonHaven
        ? 0x46536a
        : isSunshoreAtoll
          ? 0x81766d
          : isMoonveilNexus
            ? 0x08091b
            : isAbyssalPearlKingdom
              ? 0x164454
            : 0xb9a6b3;
  const grassColor = isFirstLightKingdom
    ? 0x779851
    : isCelestialSkyKingdom
      ? 0x6fa45d
      : isFrostmoonHaven
        ? 0xdfeafa
        : isSunshoreAtoll
          ? 0x4d9b45
          : isMoonveilNexus
            ? 0x17383b
            : isAbyssalPearlKingdom
              ? 0x27715e
            : 0x4e8f72;
  const bridgeColor = isFirstLightKingdom
    ? 0xeee1c8
    : isCelestialSkyKingdom
      ? 0xf1eadb
      : isFrostmoonHaven
        ? 0x8e9db8
        : isSunshoreAtoll
          ? 0xb26f32
          : isMoonveilNexus
            ? 0x302f66
            : isAbyssalPearlKingdom
              ? 0xd8d5b5
            : 0xd6c69e;
  const roofColor = isAbyssalPearlKingdom
    ? 0x159ba8
    : isMoonveilNexus
    ? 0x202561
    : isFirstLightKingdom || isCelestialSkyKingdom
    ? 0x1d4385
    : isFrostmoonHaven
      ? 0x30488e
      : 0x6340b4;
  const roofBrightColor = isAbyssalPearlKingdom
    ? 0x4ed9d2
    : isMoonveilNexus
    ? 0x5047bd
    : isFirstLightKingdom || isCelestialSkyKingdom
    ? 0x2866b4
    : isFrostmoonHaven
      ? 0x536bb8
      : 0x794ee0;
  return {
    limestone: new THREE.MeshStandardMaterial({ color: limestoneColor, map: stoneMap, roughness: 0.72, metalness: 0.04 }),
    limestoneShade: new THREE.MeshStandardMaterial({ color: limestoneShadeColor, map: stoneMap, roughness: 0.8, metalness: 0.02 }),
    limestoneBright: new THREE.MeshStandardMaterial({ color: limestoneBrightColor, map: stoneMap, roughness: 0.6, metalness: 0.04 }),
    reef: new THREE.MeshBasicMaterial({ color: reefColor }),
    grass: new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.88 }),
    bridge: new THREE.MeshStandardMaterial({ color: bridgeColor, roughness: 0.78 }),
    purpleRoof: new THREE.MeshStandardMaterial({ color: roofColor, map: roofMap, roughness: 0.42, metalness: 0.12 }),
    purpleRoofBright: new THREE.MeshStandardMaterial({ color: roofBrightColor, map: roofMap, roughness: 0.32, metalness: 0.18 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf1c866, roughness: 0.32, metalness: 0.58, emissive: 0x3d2504, emissiveIntensity: 0.18 }),
    deepWindow: new THREE.MeshStandardMaterial({ color: 0x172849, roughness: 0.2, metalness: 0.15, emissive: 0x164e70, emissiveIntensity: 0.52 }),
    aquaGlass: new THREE.MeshPhysicalMaterial({ color: 0x8effe7, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.82, transmission: 0.22, thickness: 0.35 }),
    voiceGlow: new THREE.MeshStandardMaterial({ color: 0xa8fff0, roughness: 0.12, emissive: 0x38d9cd, emissiveIntensity: 1.05 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x50309d, roughness: 0.55, side: THREE.DoubleSide }),
    reefAccent: new THREE.MeshStandardMaterial({ color: 0xff7da9, roughness: 0.5, emissive: 0x5c1735, emissiveIntensity: 0.22 }),
    pearlAccent: new THREE.MeshStandardMaterial({ color: 0xfff6db, roughness: 0.16, metalness: 0.16, emissive: 0x50b9b2, emissiveIntensity: 0.42 }),
    coral: new THREE.MeshStandardMaterial({ color: 0xe972a4, roughness: 0.52, emissive: 0x49142d, emissiveIntensity: 0.16 }),
    coralGlass: new THREE.MeshPhysicalMaterial({ color: 0xc288e8, roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.68, transmission: 0.18, thickness: 0.7 }),
    pearl: new THREE.MeshStandardMaterial({ color: 0xfff3da, roughness: 0.18, metalness: 0.22, emissive: 0x7a5d91, emissiveIntensity: 0.16 }),
    mintGlow: new THREE.MeshStandardMaterial({ color: 0x8df5d5, roughness: 0.2, emissive: 0x23836f, emissiveIntensity: 0.72 }),
    waterGlow: new THREE.MeshStandardMaterial({ color: 0x61cbed, roughness: 0.22, metalness: 0.12, emissive: 0x125a7a, emissiveIntensity: 0.48 }),
  };
}

function buildLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: PilotMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(...definition.position);

  const foundationMaterial = new THREE.MeshStandardMaterial({
    color: definition.accent,
    roughness: 0.5,
    emissive: definition.accent,
    emissiveIntensity: 0.08,
  });
  const foundationRadius = definition.id === 'boss' ? 1.98 : 1.46;
  const foundation = createCylinder(foundationRadius, foundationRadius + 0.12, 0.22, 32, foundationMaterial);
  foundation.position.y = 0.13;
  root.add(foundation);

  if (level > 0) {
    const builtLevel = level as 1 | 2 | 3;
    const building = definition.id === 'boss'
      ? createCrownCitadelModel({ level: builtLevel, quality, materials })
      : definition.id === 'hatchery'
        ? createHatcheryLandmark(builtLevel, quality, materials)
        : definition.id === 'habit'
          ? createHabitLandmark(builtLevel, quality, materials)
          : definition.id === 'wisdom'
            ? createWisdomLandmark(builtLevel, quality, materials)
            : createEventLandmark(builtLevel, quality, materials);
    if (definition.id === 'boss') {
      const scale = CROWN_CITADEL_LEVEL_SCALES[builtLevel];
      building.scale.set(scale[0], scale[1], scale[2]);
    } else {
      building.scale.setScalar(1);
    }
    if (definition.id !== 'boss') compactStaticGeometry(building, `ISLAND5_${definition.id.toUpperCase()}`);
    root.add(building);
  }

  setLandmarkId(root, definition.id);
  if (definition.id === 'boss') {
    foundation.castShadow = true;
    foundation.receiveShadow = true;
  } else {
    addShadowFlags(root, true);
  }
  return root;
}

function addAmbientReefDetails(
  scene: THREE.Scene,
  count: number,
  materials: PilotMaterials,
): THREE.InstancedMesh {
  const geometry = new THREE.ConeGeometry(0.12, 0.55, 5);
  const material = materials.coral.clone();
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  let seed = 0x5c0a17;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 4.45 + random() * 1.45;
    dummy.position.set(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius);
    dummy.rotation.y = random() * Math.PI;
    const scale = 0.55 + random() * 1.15;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

const ISLAND_5_SKY_DOME_SRC = '/assets/islands/island-005/background/sky-dome-v2.webp';

interface Island5AmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

function createInstancedScenery(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  points: readonly Island5AmbiencePoint[],
  options: {
    yOffset?: number;
    scaleMultiplier?: number;
    colorForPoint?: (point: Island5AmbiencePoint, index: number) => THREE.Color;
  } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  const dummy = new THREE.Object3D();
  points.forEach((point, index) => {
    const scale = point.scale * (options.scaleMultiplier ?? 1);
    dummy.position.set(
      point.position[0],
      point.position[1] + (options.yOffset ?? 0) * scale,
      point.position[2],
    );
    dummy.rotation.set(0, point.rotationYRad, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (options.colorForPoint) mesh.setColorAt(index, options.colorForPoint(point, index));
  });
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function addIsland5Greenery(
  root: THREE.Group,
  profile: Island3DQualityProfile,
  materials: PilotMaterials,
) {
  const layout = buildIsland5AmbienceLayout(profile);
  const byKind = (kind: Island5AmbiencePoint['kind']) => layout.filter((point) => point.kind === kind);
  const cypressPoints = byKind('cypress');
  const topiaryPoints = byKind('topiary');
  const hedgePoints = byKind('hedge');
  const flowerPoints = byKind('flower');
  const reedPoints = byKind('reed');
  const lanternPoints = byKind('lantern');

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x7b6851, roughness: 0.88 });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f936d,
    roughness: 0.76,
    emissive: 0x123c31,
    emissiveIntensity: 0.11,
  });
  const topiaryMaterial = new THREE.MeshStandardMaterial({
    color: 0x5caf72,
    roughness: 0.82,
  });
  const hedgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x37875d,
    roughness: 0.86,
  });
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: 0xe68abf,
    roughness: 0.48,
    emissive: 0x531738,
    emissiveIntensity: 0.18,
  });
  const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x86cfa4, roughness: 0.72 });
  const lanternMaterial = materials.limestoneBright.clone();
  const lanternGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff5c9,
    roughness: 0.18,
    metalness: 0.08,
    emissive: 0x72d9d0,
    emissiveIntensity: 0.72,
  });

  const trunkGeometry = new THREE.CylinderGeometry(0.085, 0.12, 0.58, profile.id === 'low' ? 5 : 7);
  trunkGeometry.translate(0, 0.29, 0);
  const canopyGeometry = new THREE.ConeGeometry(0.3, 1.05, profile.id === 'high' ? 10 : 7);
  canopyGeometry.translate(0, 0.94, 0);
  const topiaryGeometry = new THREE.IcosahedronGeometry(0.32, profile.id === 'high' ? 1 : 0);
  topiaryGeometry.translate(0, 0.3, 0);
  const topiaryCrownGeometry = new THREE.IcosahedronGeometry(0.23, profile.id === 'high' ? 1 : 0);
  topiaryCrownGeometry.translate(0, 0.72, 0);
  const hedgeGeometry = new THREE.BoxGeometry(0.72, 0.28, 0.2, 1, 1, 1);
  hedgeGeometry.translate(0, 0.14, 0);
  const flowerGeometry = new THREE.IcosahedronGeometry(0.12, profile.id === 'high' ? 1 : 0);
  flowerGeometry.translate(0, 0.28, 0);
  const reedGeometry = new THREE.ConeGeometry(0.075, 0.52, 5);
  reedGeometry.translate(0, 0.26, 0);
  const lanternPostGeometry = new THREE.CylinderGeometry(0.035, 0.055, 0.48, 6);
  lanternPostGeometry.translate(0, 0.24, 0);
  const lanternGlowGeometry = new THREE.SphereGeometry(0.11, profile.id === 'high' ? 10 : 7, 6);
  lanternGlowGeometry.translate(0, 0.55, 0);

  const cypressTrunks = createInstancedScenery(trunkGeometry, trunkMaterial, cypressPoints);
  const cypressCanopies = createInstancedScenery(canopyGeometry, canopyMaterial, cypressPoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 2 === 0 ? 0x4d9c71 : 0x3f8469),
  });
  const topiaries = createInstancedScenery(topiaryGeometry, topiaryMaterial, topiaryPoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 3 === 0 ? 0x6fbf77 : index % 3 === 1 ? 0x3d9368 : 0x85c96f),
  });
  const topiaryCrowns = createInstancedScenery(topiaryCrownGeometry, topiaryMaterial, topiaryPoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 3 === 0 ? 0x78c97c : index % 3 === 1 ? 0x4aa374 : 0x91d279),
  });
  const hedges = createInstancedScenery(hedgeGeometry, hedgeMaterial, hedgePoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 2 === 0 ? 0x3b8a5f : 0x2f7655),
  });
  const flowers = createInstancedScenery(flowerGeometry, flowerMaterial, flowerPoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 3 === 0 ? 0xf49ac4 : index % 3 === 1 ? 0x9f87ed : 0xffd67a),
  });
  const reeds = createInstancedScenery(reedGeometry, reedMaterial, reedPoints, {
    colorForPoint: (_, index) => new THREE.Color(index % 2 === 0 ? 0x91d7a4 : 0x66b998),
  });
  const lanternPosts = createInstancedScenery(lanternPostGeometry, lanternMaterial, lanternPoints);
  const lanternGlows = createInstancedScenery(lanternGlowGeometry, lanternGlowMaterial, lanternPoints);
  [cypressTrunks, cypressCanopies, topiaries, topiaryCrowns, hedges, flowers, reeds, lanternPosts, lanternGlows].forEach((mesh) => root.add(mesh));

  return { canopyMaterial, lanternGlowMaterial };
}

function addIsland5FormalParterres(
  root: THREE.Group,
  profile: Island3DQualityProfile,
  materials: PilotMaterials,
) {
  const garden = new THREE.Group();
  garden.name = 'ISLAND_5_FORMAL_PARTERRES';
  const clippedGreen = new THREE.MeshStandardMaterial({ color: 0x1f6848, roughness: 0.9 });
  const flowerBed = new THREE.MeshStandardMaterial({
    color: 0x9a77cb,
    roughness: 0.76,
    emissive: 0x351654,
    emissiveIntensity: 0.1,
  });
  const pearlGravel = new THREE.MeshStandardMaterial({ color: 0xd7d6b4, roughness: 0.94 });
  const promenadeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0deb0,
    roughness: 0.78,
    metalness: 0.04,
  });
  for (const [radius, tube] of [[3.98, 0.035], [5.68, 0.045]] as const) {
    const promenade = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, profile.id === 'low' ? 5 : 7, Math.max(32, profile.shorelineDetail)),
      promenadeMaterial,
    );
    promenade.rotation.x = Math.PI / 2;
    promenade.rotation.z = Math.PI / 8;
    promenade.position.y = 0.274;
    garden.add(promenade);
  }
  const mainBedCount = profile.id === 'low' ? 4 : 8;
  for (let index = 0; index < mainBedCount; index += 1) {
    const angle = (index / mainBedCount) * Math.PI * 2 + Math.PI / mainBedCount;
    const span = profile.id === 'low' ? 0.44 : 0.31;
    const bed = new THREE.Mesh(
      new THREE.RingGeometry(4.02, 5.65, Math.max(8, Math.round(profile.shorelineDetail / 4)), 1, angle - span / 2, span),
      index % 2 === 0 ? clippedGreen : flowerBed,
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0.286;
    garden.add(bed);

    const border = new THREE.Mesh(
      new THREE.RingGeometry(3.96, 4.04, Math.max(8, Math.round(profile.shorelineDetail / 4)), 1, angle - span / 2, span),
      pearlGravel,
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.292;
    garden.add(border);
  }

  ISLAND_5_LANDMARKS.filter((landmark) => landmark.id !== 'boss').forEach((landmark, index) => {
    const outwardAngle = Math.atan2(landmark.position[2], landmark.position[0]);
    const bed = new THREE.Mesh(
      new THREE.RingGeometry(1.58, 2.22, Math.max(8, Math.round(profile.shorelineDetail / 5)), 1, outwardAngle - 0.54, 1.08),
      index % 2 === 0 ? flowerBed : clippedGreen,
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(landmark.position[0], 0.286, landmark.position[2]);
    garden.add(bed);
    const border = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.59, Math.max(8, Math.round(profile.shorelineDetail / 5)), 1, outwardAngle - 0.54, 1.08),
      pearlGravel,
    );
    border.rotation.x = -Math.PI / 2;
    border.position.set(landmark.position[0], 0.292, landmark.position[2]);
    garden.add(border);
  });
  compactStaticGeometry(garden, 'ISLAND5_FORMAL_GARDEN');
  root.add(garden);

  const fountainPositions = Array.from({ length: 4 }, (_, index) => {
    const angle = index * Math.PI / 2;
    return [Math.cos(angle) * 4.42, 0.29, Math.sin(angle) * 4.42] as const;
  });
  const basinGeometry = new THREE.CylinderGeometry(0.34, 0.4, 0.15, profile.id === 'low' ? 10 : 16);
  const basinMaterial = materials.limestoneBright.clone();
  const basins = new THREE.InstancedMesh(basinGeometry, basinMaterial, fountainPositions.length);
  const waterJetGeometry = new THREE.CylinderGeometry(0.018, 0.034, 0.68, 6);
  waterJetGeometry.translate(0, 0.34, 0);
  const waterSurfaceGeometry = new THREE.CircleGeometry(0.3, profile.id === 'low' ? 10 : 18);
  waterSurfaceGeometry.rotateX(-Math.PI / 2);
  const fountainWaterMaterial = materials.waterGlow.clone();
  fountainWaterMaterial.transparent = true;
  fountainWaterMaterial.opacity = 0.78;
  const jets = new THREE.InstancedMesh(waterJetGeometry, fountainWaterMaterial, fountainPositions.length);
  const waterSurfaces = new THREE.InstancedMesh(waterSurfaceGeometry, fountainWaterMaterial, fountainPositions.length);
  const dummy = new THREE.Object3D();
  fountainPositions.forEach((position, index) => {
    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    basins.setMatrixAt(index, dummy.matrix);
    dummy.position.y += 0.09;
    dummy.updateMatrix();
    jets.setMatrixAt(index, dummy.matrix);
    waterSurfaces.setMatrixAt(index, dummy.matrix);
  });
  basins.receiveShadow = true;
  root.add(basins, waterSurfaces, jets);
  return { fountainWaterMaterial };
}

interface Island5CoastDefinition {
  center: readonly [number, number];
  terrainRadius: number;
  waterlineRadius: number;
  seed: number;
}

function getIsland5CoastDefinitions(): Island5CoastDefinition[] {
  return [
    { center: [0, 0], terrainRadius: 6.25, waterlineRadius: 6.68, seed: 0x15c05a },
    ...ISLAND_5_LANDMARKS
      .filter((landmark) => landmark.id !== 'boss')
      .map((landmark, index) => ({
        center: [landmark.position[0], landmark.position[2]] as const,
        terrainRadius: 2.58,
        waterlineRadius: 2.8,
        seed: 0x51a7 + index * 0x913,
      })),
  ];
}

function createIrregularCoastRibbonGeometry(widthRatio: number, segments: number, seed: number) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const phase = (seed % 2048) * 0.0031;
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle = progress * Math.PI * 2;
    const irregularity = Math.sin(angle * 5 + phase) * 0.012
      + Math.sin(angle * 11 - phase * 1.3) * 0.006;
    const outerRadius = 1 + irregularity;
    const localWidth = widthRatio * (0.88 + Math.sin(angle * 7 + phase) * 0.12);
    const innerRadius = outerRadius - localWidth;
    positions.push(
      Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius,
      Math.cos(angle) * innerRadius, 0, Math.sin(angle) * innerRadius,
    );
    uvs.push(progress, 1, progress, 0);
    if (index < segments) {
      const outer = index * 2;
      const inner = outer + 1;
      const nextOuter = outer + 2;
      const nextInner = outer + 3;
      indices.push(outer, nextOuter, inner, inner, nextOuter, nextInner);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addIsland5Shoreline(root: THREE.Group, profile: Island3DQualityProfile) {
  const shallowMaterial = new THREE.MeshBasicMaterial({
    color: 0x66e0dc,
    transparent: true,
    opacity: profile.id === 'low' ? 0.22 : 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xeafffb,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const detail = Math.max(24, profile.shorelineDetail);
  const coastDefinitions = getIsland5CoastDefinitions();
  const shallowGeometry = createIrregularCoastRibbonGeometry(0.075, detail, 0x5a1105);
  const foamGeometry = createIrregularCoastRibbonGeometry(0.028, detail, 0xf0a5);
  const breakerGeometry = createIrregularCoastRibbonGeometry(0.016, detail, 0xb4ea6);
  const shallows = new THREE.InstancedMesh(shallowGeometry, shallowMaterial, coastDefinitions.length);
  shallows.name = 'ISLAND_5_COASTAL_SHALLOWS';
  const foamEdge = new THREE.InstancedMesh(foamGeometry, foamMaterial, coastDefinitions.length);
  foamEdge.name = 'ISLAND_5_PERSISTENT_FOAM_EDGE';
  const breakerMaterial = new THREE.MeshBasicMaterial({
    color: 0xf5ffff,
    transparent: true,
    opacity: profile.id === 'low' ? 0.32 : 0.48,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const breakerCount = coastDefinitions.length * profile.shoreBreakLayerCount;
  const shoreBreakers = new THREE.InstancedMesh(breakerGeometry, breakerMaterial, breakerCount);
  shoreBreakers.name = 'ISLAND_5_INSTANCED_SHORE_BREAKERS';
  shoreBreakers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shoreBreakers.frustumCulled = false;
  const dummy = new THREE.Object3D();
  coastDefinitions.forEach((coast, index) => {
    dummy.position.set(coast.center[0], -0.535, coast.center[1]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(coast.waterlineRadius + 0.42);
    dummy.updateMatrix();
    shallows.setMatrixAt(index, dummy.matrix);
    dummy.position.y = -0.395;
    dummy.scale.setScalar(coast.waterlineRadius + 0.08);
    dummy.updateMatrix();
    foamEdge.setMatrixAt(index, dummy.matrix);
  });
  shallows.renderOrder = -3;
  foamEdge.renderOrder = -1;
  shoreBreakers.renderOrder = -2;
  root.add(shallows, foamEdge, shoreBreakers);

  const animate = (elapsed: number) => {
    let instanceIndex = 0;
    coastDefinitions.forEach((coast, coastIndex) => {
      for (let layer = 0; layer < profile.shoreBreakLayerCount; layer += 1) {
        const phase = (elapsed * (0.16 + coastIndex * 0.008) + layer / profile.shoreBreakLayerCount + coast.seed * 0.00001) % 1;
        const radius = coast.waterlineRadius + 0.1 + phase * (coastIndex === 0 ? 0.5 : 0.28);
        dummy.position.set(
          coast.center[0],
          -0.455 + Math.sin(elapsed * 0.85 + coastIndex + layer) * 0.008,
          coast.center[1],
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(radius);
        dummy.updateMatrix();
        shoreBreakers.setMatrixAt(instanceIndex, dummy.matrix);
        instanceIndex += 1;
      }
    });
    shoreBreakers.instanceMatrix.needsUpdate = true;
    breakerMaterial.opacity = (profile.id === 'low' ? 0.26 : 0.38) + Math.sin(elapsed * 0.72) * 0.09;
    foamMaterial.opacity = 0.58 + Math.sin(elapsed * 0.72) * 0.1;
    shallowMaterial.opacity = (profile.id === 'low' ? 0.2 : 0.29) + Math.sin(elapsed * 0.42) * 0.035;
  };

  animate(0);
  return { foamMaterial, shallowMaterial, breakerMaterial, animate };
}

function addIsland5CoastalRockStrata(root: THREE.Group, profile: Island3DQualityProfile) {
  const coastDefinitions = getIsland5CoastDefinitions();
  const geometry = createErodedCoastalCylinderGeometry(
    1,
    1.015,
    1,
    Math.max(24, profile.coastalStrataDetail),
    0xc0457a,
    profile.id === 'low' ? 0.016 : 0.024,
  );
  const material = new THREE.MeshBasicMaterial({
    color: 0xb9a6b4,
    side: THREE.DoubleSide,
  });
  const layersPerCoast = profile.id === 'low' ? 2 : 3;
  const strata = new THREE.InstancedMesh(geometry, material, coastDefinitions.length * layersPerCoast);
  strata.name = 'ISLAND_5_INSTANCED_COASTAL_ROCK_STRATA';
  const dummy = new THREE.Object3D();
  const layerColors = [
    new THREE.Color(0xded4c4),
    new THREE.Color(0xb9a6b4),
    new THREE.Color(0x97889c),
  ];
  let instanceIndex = 0;
  coastDefinitions.forEach((coast, coastIndex) => {
    const layers = profile.id === 'low'
      ? [
          { radius: coast.terrainRadius * 1.035, y: -0.09, thickness: 0.24, colorIndex: 0 },
          { radius: coast.waterlineRadius - 0.02, y: -0.37, thickness: 0.36, colorIndex: 2 },
        ]
      : [
          { radius: coast.terrainRadius * 1.035, y: -0.055, thickness: 0.18, colorIndex: 0 },
          { radius: coast.terrainRadius * 1.075, y: -0.21, thickness: 0.22, colorIndex: 1 },
          { radius: coast.waterlineRadius - 0.01, y: -0.405, thickness: 0.26, colorIndex: 2 },
        ];
    layers.forEach((layer, layerIndex) => {
      dummy.position.set(coast.center[0], layer.y, coast.center[1]);
      dummy.rotation.set(0, (coast.seed % 1024) * 0.00012 + layerIndex * 0.025, 0);
      dummy.scale.set(layer.radius, layer.thickness, layer.radius);
      dummy.updateMatrix();
      strata.setMatrixAt(instanceIndex, dummy.matrix);
      strata.setColorAt(instanceIndex, layerColors[layer.colorIndex]);
      instanceIndex += 1;
    });
    if (coastIndex === 0) strata.userData.mainCoastLayerCount = layers.length;
  });
  if (strata.instanceColor) strata.instanceColor.needsUpdate = true;
  strata.castShadow = false;
  strata.receiveShadow = true;
  strata.renderOrder = -1;
  root.add(strata);
  return { strata, material };
}

function addIsland5ReefShelves(root: THREE.Group, profile: Island3DQualityProfile, materials: PilotMaterials) {
  const count = profile.ambientDetailCount;
  const geometry = new THREE.IcosahedronGeometry(0.32, profile.id === 'high' ? 1 : 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x998792,
    roughness: 0.92,
    metalness: 0.01,
  });
  const shelves = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  let seed = 0x51e1f00d;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let index = 0; index < count; index += 1) {
    const onMain = index < Math.ceil(count * 0.58);
    const satellites = ISLAND_5_LANDMARKS.filter((landmark) => landmark.id !== 'boss');
    const center = onMain ? ([0, 0, 0] as const) : satellites[index % satellites.length].position;
    const angle = random() * Math.PI * 2;
    const radius = onMain ? 6.25 + random() * 0.82 : 2.55 + random() * 0.52;
    dummy.position.set(center[0] + Math.cos(angle) * radius, -0.5 + random() * 0.18, center[2] + Math.sin(angle) * radius);
    dummy.rotation.set(random() * 0.35, random() * Math.PI * 2, random() * 0.2);
    dummy.scale.set(0.45 + random() * 0.8, 0.28 + random() * 0.48, 0.5 + random() * 0.9);
    dummy.updateMatrix();
    shelves.setMatrixAt(index, dummy.matrix);
  }
  shelves.receiveShadow = false;
  root.add(shelves);
}

function addIsland5WaterSparkles(root: THREE.Group, profile: Island3DQualityProfile) {
  const positions = new Float32Array(profile.waterSparkleCount * 3);
  let seed = 0x5a9f1e;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let index = 0; index < profile.waterSparkleCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 8.2 + random() * 15.5;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = -0.47 + random() * 0.04;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe6ffff,
    size: profile.id === 'high' ? 0.105 : 0.085,
    transparent: true,
    opacity: 0.62,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const sparkles = new THREE.Points(geometry, material);
  sparkles.renderOrder = -1;
  root.add(sparkles);
  return { sparkles, material };
}

function addIsland5OceanMotion(
  root: THREE.Group,
  profile: Island3DQualityProfile,
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>,
) {
  const positions = ocean.geometry.getAttribute('position') as THREE.BufferAttribute;
  const basePositions = new Float32Array(positions.array as ArrayLike<number>);
  positions.setUsage(THREE.DynamicDrawUsage);

  const waveGeometry = new THREE.TorusGeometry(1, 0.007, 4, Math.max(36, profile.shorelineDetail));
  const waveMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8f7f3,
    transparent: true,
    opacity: profile.id === 'low' ? 0.1 : 0.15,
    depthWrite: false,
  });
  const waveBands = new THREE.InstancedMesh(waveGeometry, waveMaterial, profile.oceanWaveBandCount);
  waveBands.name = 'ISLAND_5_OCEAN_WAVE_BANDS';
  waveBands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waveBands.frustumCulled = false;
  waveBands.renderOrder = -3;
  root.add(waveBands);

  const dummy = new THREE.Object3D();
  let lastUpdateAt = Number.NEGATIVE_INFINITY;
  const intervalSeconds = 1 / profile.oceanUpdateFps;
  const amplitude = profile.id === 'low' ? 0.024 : profile.id === 'medium' ? 0.038 : 0.052;

  return {
    waveMaterial,
    animate: (elapsed: number) => {
      if (elapsed - lastUpdateAt < intervalSeconds) return;
      lastUpdateAt = elapsed;

      for (let index = 0; index < positions.count; index += 1) {
        const offset = index * 3;
        const x = basePositions[offset];
        const y = basePositions[offset + 1];
        const swell = Math.sin(x * 0.23 + elapsed * 0.62) * 0.58
          + Math.cos(y * 0.29 - elapsed * 0.48) * 0.42;
        positions.setZ(index, basePositions[offset + 2] + swell * amplitude);
      }
      positions.needsUpdate = true;
      ocean.geometry.computeVertexNormals();

      for (let index = 0; index < profile.oceanWaveBandCount; index += 1) {
        const baseRadius = 8.4 + index * (profile.id === 'high' ? 2.55 : 3.1);
        const travel = (elapsed * (0.11 + index * 0.008) + index * 0.74) % 1;
        const radius = baseRadius + travel * 2.1;
        dummy.position.set(0, -0.545 + Math.sin(elapsed * 0.55 + index) * 0.008, 0);
        dummy.rotation.set(Math.PI / 2, elapsed * 0.004 * (index % 2 === 0 ? 1 : -1), 0);
        dummy.scale.set(radius, radius, 1);
        dummy.updateMatrix();
        waveBands.setMatrixAt(index, dummy.matrix);
      }
      waveBands.instanceMatrix.needsUpdate = true;
      waveMaterial.opacity = (profile.id === 'low' ? 0.075 : 0.11) + Math.sin(elapsed * 0.5) * 0.025;
    },
  };
}

interface DistantShipMaterials {
  hull: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  sail: THREE.MeshStandardMaterial;
  accentSail: THREE.MeshStandardMaterial;
  wake: THREE.MeshBasicMaterial;
}

function createDistantShipMaterials(pirate = false): DistantShipMaterials {
  return {
    hull: new THREE.MeshStandardMaterial({ color: pirate ? 0x292238 : 0x273d61, roughness: 0.66 }),
    trim: new THREE.MeshStandardMaterial({ color: pirate ? 0xb06a42 : 0xd9b65b, roughness: 0.36, metalness: 0.32 }),
    sail: new THREE.MeshStandardMaterial({
      color: pirate ? 0x343043 : 0xf1e5c3,
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
    accentSail: new THREE.MeshStandardMaterial({
      color: pirate ? 0x9c3d5a : 0x7554a8,
      roughness: 0.76,
      side: THREE.DoubleSide,
    }),
    wake: new THREE.MeshBasicMaterial({
      color: 0xd9ffff,
      transparent: true,
      opacity: pirate ? 0.24 : 0.34,
      depthWrite: false,
    }),
  };
}

function addDistantShipModel(options: {
  parent: THREE.Group;
  materials: DistantShipMaterials;
  variant: 'flagship' | 'escort' | 'pirate';
  position?: readonly [number, number, number];
  scale?: number;
}) {
  const ship = new THREE.Group();
  const flagship = options.variant === 'flagship';
  const escort = options.variant === 'escort';
  const length = flagship ? 3.55 : escort ? 2.15 : 2.95;
  const width = flagship ? 0.86 : escort ? 0.58 : 0.76;

  const hull = new THREE.Mesh(new THREE.BoxGeometry(length, flagship ? 0.48 : 0.36, width), options.materials.hull);
  hull.position.y = 0.1;
  const keel = new THREE.Mesh(new THREE.BoxGeometry(length * 0.76, 0.25, width * 0.72), options.materials.hull);
  keel.position.set(-length * 0.08, -0.18, 0);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(width * 0.62, length * 0.3, 4), options.materials.hull);
  bow.position.set(length * 0.63, 0.08, 0);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(length * 0.95, 0.06, width * 1.12), options.materials.trim);
  rail.position.y = flagship ? 0.42 : 0.34;
  ship.add(hull, keel, bow, rail);

  if (flagship) {
    const sternCastle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, width * 0.92), options.materials.hull);
    sternCastle.position.set(-1.12, 0.63, 0);
    const sternCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), options.materials.trim);
    sternCrown.position.set(-1.12, 1.04, 0);
    const figurehead = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), options.materials.trim);
    figurehead.position.set(2.02, 0.14, 0);
    ship.add(sternCastle, sternCrown, figurehead);
  }

  const mastPositions = flagship ? [-0.62, 0.72] : options.variant === 'pirate' ? [-0.42, 0.62] : [0];
  mastPositions.forEach((mastX, index) => {
    const mastHeight = flagship ? (index === 0 ? 2.8 : 2.45) : escort ? 1.82 : (index === 0 ? 2.25 : 1.95);
    const mast = createCylinder(0.035, 0.055, mastHeight, 7, options.materials.trim);
    mast.position.set(mastX, 0.42 + mastHeight / 2, 0);
    ship.add(mast);

    const sailShape = new THREE.Shape();
    const sailWidth = flagship ? 1.02 : escort ? 0.72 : 0.86;
    const sailHeight = mastHeight * 0.63;
    const direction = index % 2 === 0 ? 1 : -1;
    sailShape.moveTo(0, 0.04);
    sailShape.lineTo(0, sailHeight);
    sailShape.lineTo(direction * sailWidth, 0.23);
    sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      index % 2 === 0 ? options.materials.sail : options.materials.accentSail,
    );
    sail.position.set(mastX, 0.54, 0.055 + index * 0.012);
    ship.add(sail);

    const pennant = new THREE.Mesh(new THREE.PlaneGeometry(flagship ? 0.5 : 0.34, flagship ? 0.18 : 0.13), options.materials.accentSail);
    pennant.position.set(mastX + 0.13, 0.46 + mastHeight, 0.04);
    ship.add(pennant);
  });

  if (options.variant === 'pirate') {
    const crowsNest = createCylinder(0.14, 0.17, 0.13, 8, options.materials.hull);
    crowsNest.position.set(-0.42, 1.9, 0);
    ship.add(crowsNest);
  }

  const wake = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.95, width * 0.56), options.materials.wake);
  wake.rotation.x = -Math.PI / 2;
  wake.rotation.z = -0.1;
  wake.position.set(-length * 0.86, -0.15, 0);
  const wakeTrail = new THREE.Mesh(new THREE.PlaneGeometry(length * 1.16, width * 0.22), options.materials.wake);
  wakeTrail.rotation.x = -Math.PI / 2;
  wakeTrail.rotation.z = 0.08;
  wakeTrail.position.set(-length * 1.08, -0.155, width * 0.45);
  ship.add(wake, wakeTrail);

  ship.position.set(...(options.position ?? [0, 0, 0]));
  ship.scale.setScalar(options.scale ?? 1);
  options.parent.add(ship);
}

function createIsland5DistantFleet(profile: Island3DQualityProfile) {
  if (profile.distantShipCount === 0) return null;
  const armada = new THREE.Group();
  armada.name = 'ISLAND_5_ROYAL_ARMADA';
  const royalMaterials = createDistantShipMaterials(false);
  addDistantShipModel({ parent: armada, materials: royalMaterials, variant: 'flagship' });
  addDistantShipModel({ parent: armada, materials: royalMaterials, variant: 'escort', position: [-7.2, 0, -8.2], scale: 0.58 });
  if (profile.distantShipCount >= 4) {
    addDistantShipModel({ parent: armada, materials: royalMaterials, variant: 'escort', position: [7.4, 0, -11.8], scale: 0.47 });
  }
  compactStaticGeometry(armada, 'ISLAND5_ROYAL_ARMADA');
  armada.scale.setScalar(profile.id === 'high' ? 0.43 : 0.39);
  armada.position.set(-7.4, -0.48, -8.4);
  armada.userData.baseY = armada.position.y;

  let pirateBrig: THREE.Group | null = null;
  if (profile.distantShipCount >= 4) {
    pirateBrig = new THREE.Group();
    pirateBrig.name = 'ISLAND_5_PIRATE_BRIG';
    addDistantShipModel({ parent: pirateBrig, materials: createDistantShipMaterials(true), variant: 'pirate' });
    compactStaticGeometry(pirateBrig, 'ISLAND5_PIRATE_BRIG');
    pirateBrig.scale.setScalar(0.34);
    pirateBrig.rotation.y = Math.PI;
    pirateBrig.position.set(7.2, -0.49, -12.8);
    pirateBrig.userData.baseY = pirateBrig.position.y;
  }

  return { armada, pirateBrig };
}

function addIsland5CloudWisps(root: THREE.Group, profile: Island3DQualityProfile) {
  const geometry = new THREE.SphereGeometry(1, profile.id === 'high' ? 12 : 8, profile.id === 'high' ? 8 : 6);
  const material = new THREE.MeshBasicMaterial({
    color: 0xf5fcff,
    transparent: true,
    opacity: profile.id === 'low' ? 0.1 : 0.14,
    depthWrite: false,
    fog: false,
  });
  const clouds = new THREE.InstancedMesh(geometry, material, profile.cloudWispCount * 3);
  const dummy = new THREE.Object3D();
  for (let cloudIndex = 0; cloudIndex < profile.cloudWispCount; cloudIndex += 1) {
    const angle = (cloudIndex / profile.cloudWispCount) * Math.PI * 2 + 0.28;
    const radius = 31 + (cloudIndex % 2) * 5;
    const centerX = Math.cos(angle) * radius;
    const centerZ = Math.sin(angle) * radius;
    for (let lobe = 0; lobe < 3; lobe += 1) {
      const index = cloudIndex * 3 + lobe;
      dummy.position.set(centerX + (lobe - 1) * 1.6, 13 + (cloudIndex % 3) * 3 + (lobe === 1 ? 0.65 : 0), centerZ);
      dummy.rotation.y = -angle;
      dummy.scale.set(2.7 + lobe * 0.5, 0.72 + (lobe === 1 ? 0.35 : 0), 1.3 + lobe * 0.24);
      dummy.updateMatrix();
      clouds.setMatrixAt(index, dummy.matrix);
    }
  }
  clouds.frustumCulled = false;
  root.add(clouds);
  return clouds;
}

function createBirdFlock(profile: Island3DQualityProfile, flockIndex: number) {
  const birdCount = profile.id === 'high' ? 6 : 4;
  const vertices: number[] = [];
  for (let index = 0; index < birdCount; index += 1) {
    const x = (index - (birdCount - 1) / 2) * 0.48;
    const y = Math.sin(index * 1.7) * 0.22;
    const z = (index % 2) * 0.32;
    vertices.push(x - 0.13, y, z, x, y + 0.08, z, x, y + 0.08, z, x + 0.13, y, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const flock = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x29486b, transparent: true, opacity: 0.64 }),
  );
  const angle = flockIndex * Math.PI + 0.55;
  flock.position.set(Math.cos(angle) * 10.5, 5.4 + flockIndex * 1.2, Math.sin(angle) * 10.5);
  flock.userData.baseY = flock.position.y;
  return flock;
}

function addIsland5Wildlife(root: THREE.Group, profile: Island3DQualityProfile) {
  const birdFlocks = Array.from({ length: profile.birdFlockCount }, (_, index) => createBirdFlock(profile, index));
  birdFlocks.forEach((flock) => root.add(flock));
  const butterflyGroups = Array.from({ length: profile.butterflyGroupCount }, (_, groupIndex) => {
    const count = profile.id === 'high' ? 14 : 9;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + groupIndex;
      const radius = 0.5 + (index % 4) * 0.18;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(index * 2.1) * 0.18;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const color = new THREE.Color(index % 2 === 0 ? 0xffb6d7 : 0xffdf83);
      colors.set([color.r, color.g, color.b], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    const landmark = ISLAND_5_LANDMARKS.filter((entry) => entry.id !== 'boss')[groupIndex % 4];
    points.position.set(landmark.position[0], 1.15, landmark.position[2] + (groupIndex % 2 === 0 ? 1.8 : -1.8));
    points.userData.baseY = points.position.y;
    root.add(points);
    return points;
  });
  return { birdFlocks, butterflyGroups };
}

function createIsland5LivingAmbience(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  profile: Island3DQualityProfile,
  materials: PilotMaterials,
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>,
): Island5AmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_5_LIVING_AMBIENCE';
  const skyTexture = new THREE.TextureLoader().load(ISLAND_5_SKY_DOME_SRC);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.mapping = THREE.UVMapping;
  skyTexture.wrapS = THREE.RepeatWrapping;
  skyTexture.repeat.x = -1;
  skyTexture.offset.x = 1;
  skyTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const skyDome = new THREE.Mesh(
    new THREE.CylinderGeometry(80, 80, 180, profile.id === 'low' ? 32 : 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  skyDome.name = 'ISLAND_5_SKY_DOME';
  skyDome.rotation.y = 0.42;
  skyDome.renderOrder = -30;
  root.add(skyDome);

  const greenery = addIsland5Greenery(root, profile, materials);
  const parterres = addIsland5FormalParterres(root, profile, materials);
  addIsland5CoastalRockStrata(root, profile);
  const shoreline = addIsland5Shoreline(root, profile);
  addIsland5ReefShelves(root, profile, materials);
  const waterSparkles = addIsland5WaterSparkles(root, profile);
  const oceanMotion = addIsland5OceanMotion(root, profile, ocean);
  const cloudWisps = addIsland5CloudWisps(root, profile);
  const wildlife = addIsland5Wildlife(root, profile);
  const distantFleet = createIsland5DistantFleet(profile);
  if (distantFleet) {
    root.add(distantFleet.armada);
    if (distantFleet.pirateBrig) root.add(distantFleet.pirateBrig);
  }
  scene.add(root);

  return {
    root,
    animate: (elapsed: number) => {
      skyDome.rotation.y = 0.42 + elapsed * 0.00045;
      cloudWisps.rotation.y = elapsed * 0.006;
      waterSparkles.sparkles.rotation.y = elapsed * 0.018;
      waterSparkles.material.opacity = 0.48 + Math.sin(elapsed * 1.15) * 0.14;
      oceanMotion.animate(elapsed);
      shoreline.animate(elapsed);
      greenery.canopyMaterial.emissiveIntensity = 0.08 + Math.sin(elapsed * 0.54) * 0.025;
      greenery.lanternGlowMaterial.emissiveIntensity = 0.66 + Math.sin(elapsed * 1.6) * 0.12;
      parterres.fountainWaterMaterial.emissiveIntensity = 0.44 + Math.sin(elapsed * 1.25) * 0.1;
      wildlife.birdFlocks.forEach((flock, index) => {
        const angle = elapsed * (0.075 + index * 0.012) + index * Math.PI;
        flock.position.x = Math.cos(angle) * (10.5 + index * 1.2);
        flock.position.z = Math.sin(angle) * (10.5 + index * 1.2);
        flock.position.y = flock.userData.baseY + Math.sin(elapsed * 0.9 + index) * 0.3;
        flock.rotation.y = -angle + Math.PI / 2;
        const presenceSeed = Math.sin(elapsed * 0.16 + index * 2.4);
        const presence = THREE.MathUtils.smoothstep(presenceSeed, -0.15, 0.72);
        flock.visible = presence > 0.025;
        if (flock.material instanceof THREE.LineBasicMaterial) flock.material.opacity = presence * 0.68;
      });
      wildlife.butterflyGroups.forEach((group, index) => {
        group.rotation.y = elapsed * (0.34 + index * 0.06);
        group.position.y = group.userData.baseY + Math.sin(elapsed * 1.5 + index) * 0.18;
      });
      if (distantFleet) {
        const armadaProgress = (elapsed / 104 + 0.045) % 1;
        distantFleet.armada.position.x = -6.2 + armadaProgress * 12.4;
        distantFleet.armada.position.z = -8.4 + Math.sin(elapsed * 0.06) * 0.28;
        distantFleet.armada.position.y = distantFleet.armada.userData.baseY + Math.sin(elapsed * 0.66) * 0.03;
        distantFleet.armada.rotation.z = Math.sin(elapsed * 0.46) * 0.012;

        if (distantFleet.pirateBrig) {
          const pirateProgress = (elapsed / 132 + 0.18) % 1;
          distantFleet.pirateBrig.position.x = 6.2 - pirateProgress * 12.4;
          distantFleet.pirateBrig.position.z = -12.8 + Math.cos(elapsed * 0.05) * 0.38;
          distantFleet.pirateBrig.position.y = distantFleet.pirateBrig.userData.baseY + Math.sin(elapsed * 0.58 + 1.4) * 0.026;
          distantFleet.pirateBrig.rotation.z = Math.sin(elapsed * 0.4 + 0.8) * 0.014;
        }
      }
    },
  };
}

function createIslandPlayerPiece(quality: Island3DQuality) {
  const radialSegments = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
  const root = new THREE.Group();
  root.name = 'ISLAND_5_PLAYER_TOKEN';

  const navy = new THREE.MeshStandardMaterial({ color: 0x26356f, roughness: 0.38, metalness: 0.08 });
  const violet = new THREE.MeshStandardMaterial({ color: 0x7650c5, roughness: 0.34, metalness: 0.12 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2cc69, roughness: 0.24, metalness: 0.72 });
  const pearl = new THREE.MeshStandardMaterial({
    color: 0xeefcff,
    emissive: 0x7dd9ff,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.08,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.11, radialSegments), gold);
  base.position.y = 0.055;
  root.add(base);

  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.48, radialSegments), violet);
  cloak.position.y = 0.34;
  root.add(cloak);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.035, 6, radialSegments), gold);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.55;
  root.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, radialSegments, Math.max(6, radialSegments / 2)), navy);
  head.position.y = 0.68;
  root.add(head);

  const compassLight = new THREE.Mesh(new THREE.OctahedronGeometry(0.115, quality === 'high' ? 1 : 0), pearl);
  compassLight.position.y = 0.91;
  compassLight.rotation.y = Math.PI / 4;
  compassLight.name = 'ISLAND_5_PLAYER_TOKEN_LIGHT';
  root.add(compassLight);

  const frontSigil = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.092, radialSegments), gold);
  frontSigil.position.set(0, 0.36, 0.205);
  root.add(frontSigil);

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = quality !== 'low';
    object.receiveShadow = quality !== 'low';
  });

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x18354b,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, radialSegments), shadowMaterial);
  shadow.name = 'ISLAND_5_PLAYER_TOKEN_SHADOW';
  shadow.rotation.x = -Math.PI / 2;

  return { root, shadow, compassLight, shadowMaterial };
}

function disposeScene(scene: THREE.Scene) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  if (scene.background instanceof THREE.Texture) textures.add(scene.background);
  if (scene.environment instanceof THREE.Texture) textures.add(scene.environment);
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Points || object instanceof THREE.LineSegments)) return;
    object.geometry?.dispose();
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    material.dispose();
  });
  textures.forEach((texture) => texture.dispose());
}

export default function Island5ThreePilot({
  islandNumber = 5,
  worldSourceNumber,
  buildLevel,
  landmarkBuildLevels,
  presentation = 'workbench',
  qualityOverride,
  tileMap,
  tokenIndex = 0,
  pendingHopSequence = null,
  isRolling = false,
  landingTileType,
  movementSpeedFactor = 1,
  cameraFocusPreset = null,
  cameraFocusTransition = 'standard',
  cameraOverviewRequestVersion = 0,
  onHopSequenceComplete,
  onTokenHop,
  onTokenLand,
  onLandmarkClick,
  caretakerEncounterOpen = false,
  onCaretakerClick,
  interactionPaused = false,
  arenaBattlePresentation = null,
  onRendererUnavailable,
}: Island5ThreePilotProps) {
  const resolvedWorldSourceNumber = worldSourceNumber
    ?? resolveIslandRun3DWorldRoute(islandNumber)?.worldSourceNumber
    ?? 5;
  const isFirstLightKingdom = resolvedWorldSourceNumber === 1;
  const isCelestialSkyKingdom = resolvedWorldSourceNumber === 2;
  const isFrostmoonHaven = resolvedWorldSourceNumber === 3;
  const isSunshoreAtoll = resolvedWorldSourceNumber === 5;
  const isMoonveilNexus = resolvedWorldSourceNumber === 6;
  const isAbyssalPearlKingdom = resolvedWorldSourceNumber === 7;
  const worldName = isFirstLightKingdom
    ? ISLAND_1_WORLD_NAME
    : isCelestialSkyKingdom
      ? ISLAND_2_CELESTIAL_WORLD_NAME
      : isFrostmoonHaven
        ? ISLAND_3_FROSTMOON_WORLD_NAME
        : isSunshoreAtoll
          ? ISLAND_5_SUNSHORE_WORLD_NAME
          : isMoonveilNexus
            ? ISLAND_6_MOONVEIL_WORLD_NAME
            : isAbyssalPearlKingdom
              ? ISLAND_7_UNDERWATER_WORLD_NAME
              : 'Crown of Tides';
  const isEmbedded = presentation === 'embedded';
  const [qualitySelection, setQualitySelection] = useState<Island3DQualitySelection>(readInitialQualitySelection);
  const [runtimeQualityCap, setRuntimeQualityCap] = useState<Island3DQuality | null>(null);
  const sustainedQualityMissesRef = useRef(0);
  const [activePreset, setActivePreset] = useState<Island5CameraPresetId | 'manual'>('overview');
  const [metrics, setMetrics] = useState<PilotMetrics>({ fps: 0, drawCalls: 0, triangles: 0, width: 0, height: 0 });
  const [tourStatus, setTourStatus] = useState<CameraTourStatus>('idle');
  const [profilerStatus, setProfilerStatus] = useState<ProfilerStatus>('idle');
  const [profilerProgress, setProfilerProgress] = useState(0);
  const [profileReport, setProfileReport] = useState<PilotProfileReport | null>(null);
  const [profilerNotice, setProfilerNotice] = useState('Keep this tab visible during the run.');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [reportShareNotice, setReportShareNotice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkBuildLevelsRef = useRef(landmarkBuildLevels);
  landmarkBuildLevelsRef.current = landmarkBuildLevels;
  const applyPresetRef = useRef<(id: Island5CameraPresetId, durationScale?: number) => void>(() => undefined);
  const previousCameraFocusPresetRef = useRef<Island5CameraPresetId | null>(null);
  const previousCameraFocusTransitionRef = useRef<'standard' | 'quick'>('standard');
  const previousCameraOverviewRequestVersionRef = useRef(cameraOverviewRequestVersion);
  const cameraFocusRequestVersionRef = useRef(0);
  const controlledCameraFocusRequestRef = useRef<ControlledCameraFocusRequest | null>(null);
  const applyControlledCameraFocusRef = useRef<(request: ControlledCameraFocusRequest) => void>(() => undefined);
  const appliedControlledCameraFocusVersionRef = useRef(0);
  const cameraPoseSnapshotRef = useRef<CameraPoseSnapshot | null>(null);
  const startTourRef = useRef<() => void>(() => undefined);
  const stopTourRef = useRef<() => void>(() => undefined);
  const startProfilerRef = useRef<() => void>(() => undefined);
  const deviceLabelRef = useRef('');
  const tokenIndexRef = useRef(tokenIndex);
  const tokenSnapRequestRef = useRef(tokenIndex);
  const tokenMotionRequestRef = useRef<TokenMotionRequest | null>(null);
  const tokenMotionRequestIdRef = useRef(0);
  const lastRequestedHopSequenceRef = useRef<readonly number[] | null>(null);
  const onHopSequenceCompleteRef = useRef(onHopSequenceComplete);
  const onTokenHopRef = useRef(onTokenHop);
  const onTokenLandRef = useRef(onTokenLand);
  const onLandmarkClickRef = useRef(onLandmarkClick);
  const caretakerEncounterOpenRef = useRef(caretakerEncounterOpen);
  const onCaretakerClickRef = useRef(onCaretakerClick);
  const interactionPausedRef = useRef(interactionPaused);
  const arenaBattlePresentationRef = useRef<{
    value: IslandRunArenaBattlePresentation | null;
    cueStartedAtMs: number;
  }>({ value: arenaBattlePresentation, cueStartedAtMs: 0 });
  const onRendererUnavailableRef = useRef(onRendererUnavailable);
  const deviceSignals = useMemo(() => readDeviceSignals(), []);
  const productionQualitySelection = qualitySelection === 'auto' && runtimeQualityCap
    ? runtimeQualityCap
    : qualitySelection;
  const resolvedQualitySelection = qualityOverride ?? productionQualitySelection;
  const qualityProfile = useMemo(
    () => resolveIsland3DQuality(resolvedQualitySelection, deviceSignals),
    [deviceSignals, resolvedQualitySelection],
  );

  useEffect(() => {
    if (qualityOverride || qualitySelection !== 'auto' || profilerStatus === 'running' || metrics.fps <= 0) {
      sustainedQualityMissesRef.current = 0;
      return;
    }
    const missThreshold = qualityProfile.id === 'high' ? 44 : qualityProfile.id === 'medium' ? 32 : 24;
    if (metrics.fps >= missThreshold) {
      sustainedQualityMissesRef.current = 0;
      return;
    }
    sustainedQualityMissesRef.current += 1;
    if (sustainedQualityMissesRef.current < 8) return;
    sustainedQualityMissesRef.current = 0;
    if (qualityProfile.id === 'high') setRuntimeQualityCap('medium');
    else if (qualityProfile.id === 'medium') setRuntimeQualityCap('low');
  }, [metrics.fps, profilerStatus, qualityOverride, qualityProfile.id, qualitySelection]);
  const resolvedTileMap = useMemo<readonly IslandTileMapEntry[]>(() => (
    tileMap ?? applyLandmarkDoorTiles(
      generateTileMap(islandNumber, getIslandRarity(islandNumber), `island-${islandNumber}`, 2),
      { expandedActiveStopId: 'hatchery' },
    )
  ), [islandNumber, tileMap]);
  const tileRewardMapKey = useMemo(
    () => resolvedTileMap
      .map((entry) => `${entry.index}:${entry.tileType}:${entry.doorStopId ?? ''}:${entry.isActiveDoorCluster ? 1 : 0}`)
      .join('|'),
    [resolvedTileMap],
  );
  const landmarkBuildLevelsKey = useMemo(
    () => ISLAND_5_LANDMARKS
      .map((landmark) => `${landmark.id}:${landmarkBuildLevels?.[landmark.id] ?? buildLevel}`)
      .join('|'),
    [buildLevel, landmarkBuildLevels],
  );

  useEffect(() => {
    onLandmarkClickRef.current = onLandmarkClick;
  }, [onLandmarkClick]);

  useEffect(() => {
    caretakerEncounterOpenRef.current = caretakerEncounterOpen;
  }, [caretakerEncounterOpen]);

  useEffect(() => {
    onCaretakerClickRef.current = onCaretakerClick;
  }, [onCaretakerClick]);

  useEffect(() => {
    interactionPausedRef.current = interactionPaused;
  }, [interactionPaused]);

  useEffect(() => {
    const previous = arenaBattlePresentationRef.current.value;
    arenaBattlePresentationRef.current = {
      value: arenaBattlePresentation,
      cueStartedAtMs: previous?.sequence === arenaBattlePresentation?.sequence
        ? arenaBattlePresentationRef.current.cueStartedAtMs
        : performance.now(),
    };
  }, [arenaBattlePresentation]);

  useEffect(() => {
    onRendererUnavailableRef.current = onRendererUnavailable;
  }, [onRendererUnavailable]);

  useEffect(() => {
    onHopSequenceCompleteRef.current = onHopSequenceComplete;
    onTokenHopRef.current = onTokenHop;
    onTokenLandRef.current = onTokenLand;
  }, [onHopSequenceComplete, onTokenHop, onTokenLand]);

  useEffect(() => {
    const previousPreset = previousCameraFocusPresetRef.current;
    const previousTransition = previousCameraFocusTransitionRef.current;
    if (cameraFocusPreset === previousPreset && cameraFocusTransition === previousTransition) return;
    previousCameraFocusPresetRef.current = cameraFocusPreset;
    previousCameraFocusTransitionRef.current = cameraFocusTransition;
    const nextPreset = cameraFocusPreset ?? (previousPreset ? 'overview' : null);
    if (!nextPreset) return;
    cameraFocusRequestVersionRef.current += 1;
    const request: ControlledCameraFocusRequest = {
      version: cameraFocusRequestVersionRef.current,
      preset: nextPreset,
      durationScale: cameraFocusPreset
        ? cameraFocusTransition === 'quick' ? 0.48 : 0.82
        : 0.72,
    };
    controlledCameraFocusRequestRef.current = request;
    applyControlledCameraFocusRef.current(request);
  }, [cameraFocusPreset, cameraFocusTransition]);

  useEffect(() => {
    if (cameraOverviewRequestVersion === previousCameraOverviewRequestVersionRef.current) return;
    previousCameraOverviewRequestVersionRef.current = cameraOverviewRequestVersion;
    cameraFocusRequestVersionRef.current += 1;
    const request: ControlledCameraFocusRequest = {
      version: cameraFocusRequestVersionRef.current,
      // The magnifier is an explicit escape hatch, so it uses the widest
      // framing. The post-roll idle drift intentionally keeps the closer
      // canonical overview and therefore never yanks repeated rolls away.
      preset: 'survey',
      durationScale: 0.82,
    };
    controlledCameraFocusRequestRef.current = request;
    applyControlledCameraFocusRef.current(request);
  }, [cameraOverviewRequestVersion]);

  useEffect(() => {
    tokenIndexRef.current = tokenIndex;
    if (!isRolling && pendingHopSequence === null) tokenSnapRequestRef.current = tokenIndex;
  }, [isRolling, pendingHopSequence, tokenIndex]);

  useEffect(() => {
    if (!pendingHopSequence || pendingHopSequence.length === 0) {
      lastRequestedHopSequenceRef.current = null;
      return;
    }
    if (pendingHopSequence === lastRequestedHopSequenceRef.current) return;
    lastRequestedHopSequenceRef.current = pendingHopSequence;
    tokenMotionRequestIdRef.current += 1;
    tokenMotionRequestRef.current = {
      id: tokenMotionRequestIdRef.current,
      requestedAt: performance.now(),
      holdMs: ISLAND_3D_TOKEN_PRE_ROLL_HOLD_MS / Math.max(1, movementSpeedFactor),
      sequence: pendingHopSequence.slice(),
      durationsMs: computeHopDurations(pendingHopSequence.length, movementSpeedFactor),
      landingImpact: resolveIsland3DLandingImpact(landingTileType),
    };
    logIslandRunEntryDebug('island_3d_hop_requested', {
      islandNumber,
      requestId: tokenMotionRequestIdRef.current,
      hopCount: pendingHopSequence.length,
      startTile: pendingHopSequence[0] ?? null,
      endTile: pendingHopSequence[pendingHopSequence.length - 1] ?? null,
      landingImpact: resolveIsland3DLandingImpact(landingTileType),
    });
  }, [islandNumber, landingTileType, movementSpeedFactor, pendingHopSequence]);
  const isReducedMotion = deviceSignals.prefersReducedMotion === true;

  const shareProfileReport = async () => {
    if (!profileReport) return;
    const reportText = JSON.stringify(profileReport, null, 2);
    const title = `Island ${islandNumber} 3D profile — ${profileReport.deviceLabel}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: reportText });
        setReportShareNotice('Report shared.');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
        setReportShareNotice('Report copied.');
        return;
      }
      const download = document.createElement('a');
      download.href = URL.createObjectURL(new Blob([reportText], { type: 'application/json' }));
      download.download = `island-${islandNumber}-profile-${profileReport.capturedAt.replace(/[:.]/g, '-')}.json`;
      download.click();
      URL.revokeObjectURL(download.href);
      setReportShareNotice('Report downloaded.');
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') {
        setReportShareNotice('Share cancelled.');
        return;
      }
      setReportShareNotice('Unable to share. Take a screenshot of this result.');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    setError(null);
    setTourStatus('idle');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: qualityProfile.antialias, alpha: false, powerPreference: qualityProfile.id === 'high' ? 'high-performance' : 'default' });
    } catch (caught) {
      console.error(`[island-${islandNumber}-3d-pilot] WebGL initialization failed:`, caught);
      setError('This device could not start the 3D renderer. The 2D camera kit is still available.');
      onRendererUnavailableRef.current?.();
      return undefined;
    }

    const scene = new THREE.Scene();
    const backgroundColor = isFirstLightKingdom
      ? 0x9bdff4
      : isCelestialSkyKingdom
        ? 0x86c8ff
        : isFrostmoonHaven
          ? 0xc6d5ee
          : isSunshoreAtoll
            ? 0x78d7ee
            : isMoonveilNexus
              ? 0x020316
              : isAbyssalPearlKingdom
                ? 0x06465e
              : 0x91d7e8;
    const fogColor = isFirstLightKingdom
      ? 0xbdebf5
      : isCelestialSkyKingdom
        ? 0xbddfff
        : isFrostmoonHaven
          ? 0xdbe5f3
          : isSunshoreAtoll
            ? 0x9fe9ef
            : isMoonveilNexus
              ? 0x080a2d
              : isAbyssalPearlKingdom
                ? 0x07526b
              : 0x8ecdda;
    const fogDensity = isFirstLightKingdom
      ? 0.0038
      : isCelestialSkyKingdom
        ? 0.0036
        : isFrostmoonHaven
          ? 0.008
          : isSunshoreAtoll
            ? 0.0035
            : isMoonveilNexus
              ? 0.0022
              : isAbyssalPearlKingdom
                ? 0.0075
              : 0.0048;
    scene.background = new THREE.Color(backgroundColor);
    if (isMoonveilNexus) {
      const moonveilSky = new THREE.TextureLoader().load('/assets/islands/island-006/background/moonveil-nebula-sky-portrait-v2.webp');
      moonveilSky.colorSpace = THREE.SRGBColorSpace;
      moonveilSky.wrapS = THREE.ClampToEdgeWrapping;
      moonveilSky.wrapT = THREE.ClampToEdgeWrapping;
      scene.background = moonveilSky;
    } else if (isAbyssalPearlKingdom) {
      const abyssalCavern = new THREE.TextureLoader().load('/assets/islands/island-007/background/abyssal-cavern-backdrop-v1.webp');
      abyssalCavern.colorSpace = THREE.SRGBColorSpace;
      abyssalCavern.wrapS = THREE.ClampToEdgeWrapping;
      abyssalCavern.wrapT = THREE.ClampToEdgeWrapping;
      scene.background = abyssalCavern;
    }
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    // Leave enough depth for the First Light horizon ring at every camera
    // azimuth; foreground gameplay geometry remains inside the shadow budget.
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 210);
    camera.zoom = isMoonveilNexus ? 1.2 : isAbyssalPearlKingdom ? 1.12 : 1;
    camera.updateProjectionMatrix();
    const overview = getIsland5CameraPreset('overview');
    const restoredCameraPose = cameraPoseSnapshotRef.current;
    camera.position.set(...(restoredCameraPose?.position ?? overview.position));
    camera.lookAt(...(restoredCameraPose?.target ?? overview.target));
    if (!restoredCameraPose) setActivePreset('overview');

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isFirstLightKingdom
      ? 0.86
      : isCelestialSkyKingdom
        ? 0.92
        : isFrostmoonHaven
          ? 0.9
          : isSunshoreAtoll
            ? 0.9
            : isMoonveilNexus
              ? 0.96
              : isAbyssalPearlKingdom
                ? 0.86
              : 1.06;
    renderer.setPixelRatio(getIsland3DRendererPixelRatio(qualityProfile, window.devicePixelRatio));
    // The underwater kingdom uses diffuse water-column light, emissive window
    // contrast and caustic/contact accents instead of a second full shadow-map
    // render. That is both physically plausible underwater and preserves the
    // geometry budget for readable architecture on mobile GPUs.
    const sceneUsesRealtimeShadows = qualityProfile.shadows && !isAbyssalPearlKingdom;
    renderer.shadowMap.enabled = sceneUsesRealtimeShadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = sceneUsesRealtimeShadows;

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...(restoredCameraPose?.target ?? overview.target));
    controls.enableDamping = !isReducedMotion;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 5.4;
    controls.maxDistance = 72;
    controls.minPolarAngle = THREE.MathUtils.degToRad(28);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(69);
    controls.rotateSpeed = 0.56;
    controls.zoomSpeed = 0.78;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

    const hemisphereGroundColor = isFirstLightKingdom
      ? 0x70877f
      : isCelestialSkyKingdom
        ? 0x7787a0
        : isFrostmoonHaven
          ? 0x47546e
          : isSunshoreAtoll
            ? 0x50754d
            : isMoonveilNexus
              ? 0x070312
              : isAbyssalPearlKingdom
                ? 0x032c3a
              : 0x28566a;
    const hemisphereIntensity = isFirstLightKingdom
      ? 1.7
      : isCelestialSkyKingdom
        ? 1.75
        : isFrostmoonHaven
          ? 1.55
          : isSunshoreAtoll
            ? 1.82
            : isMoonveilNexus
              ? 1.24
              : isAbyssalPearlKingdom
                ? 1.08
              : 2.25;
    const hemisphere = new THREE.HemisphereLight(isMoonveilNexus ? 0x7181ff : isAbyssalPearlKingdom ? 0x78efff : 0xeefcff, hemisphereGroundColor, hemisphereIntensity);
    scene.add(hemisphere);
    const sunlightIntensity = isFirstLightKingdom
      ? 3.15
      : isCelestialSkyKingdom
        ? 3.3
        : isFrostmoonHaven
          ? 2.65
          : isSunshoreAtoll
            ? 3.25
            : isMoonveilNexus
              ? 2.05
              : isAbyssalPearlKingdom
                ? 1.85
              : 4.2;
    const sunlight = new THREE.DirectionalLight(
      isMoonveilNexus ? 0xa8b6ff : isAbyssalPearlKingdom ? 0x9ff7ff : isFrostmoonHaven ? 0xffe5c4 : 0xfff1cb,
      sunlightIntensity,
    );
    sunlight.position.set(-9, 15, 10);
    sunlight.castShadow = sceneUsesRealtimeShadows;
    sunlight.shadow.mapSize.set(qualityProfile.shadowMapSize, qualityProfile.shadowMapSize);
    sunlight.shadow.camera.left = -11;
    sunlight.shadow.camera.right = 11;
    sunlight.shadow.camera.top = 11;
    sunlight.shadow.camera.bottom = -11;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 34;
    sunlight.shadow.bias = -0.0006;
    scene.add(sunlight);

    const materials = createPilotMaterials(qualityProfile.id, resolvedWorldSourceNumber);
    const island1Materials = isFirstLightKingdom ? createIsland1WorldMaterials() : null;
    const island2CelestialMaterials = isCelestialSkyKingdom ? createIsland2CelestialMaterials() : null;
    const island3FrostmoonMaterials = isFrostmoonHaven ? createIsland3FrostmoonMaterials() : null;
    const island5SunshoreMaterials = isSunshoreAtoll ? createIsland5SunshoreWorldMaterials() : null;
    const island6MoonveilMaterials = isMoonveilNexus ? createIsland6MoonveilMaterials() : null;
    const island7UnderwaterMaterials = isAbyssalPearlKingdom ? createIsland7UnderwaterMaterials() : null;
    const hasBrightWater = isFirstLightKingdom || isCelestialSkyKingdom || isSunshoreAtoll || isAbyssalPearlKingdom;
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: isFirstLightKingdom
        ? 0x52c7e8
        : isCelestialSkyKingdom
          ? 0x75dff7
          : isFrostmoonHaven
            ? 0x87cfe6
            : isSunshoreAtoll
              ? 0x18bad0
              : isMoonveilNexus
                ? 0x08031d
                : isAbyssalPearlKingdom
                  ? 0x12627b
                : 0x2a98bb,
      roughness: hasBrightWater ? 0.12 : isFrostmoonHaven ? 0.2 : 0.18,
      metalness: 0.06,
      transparent: true,
      opacity: hasBrightWater ? 0.82 : 0.88,
      clearcoat: hasBrightWater ? 0.82 : 0.62,
      clearcoatRoughness: 0.25,
    });
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(68, 68, qualityProfile.oceanGridSegments, qualityProfile.oceanGridSegments),
      waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.62;
    water.receiveShadow = true;
    scene.add(water);

    const island = createTerrainPlate({
      radius: 6.25,
      depth: 0.82,
      segments: qualityProfile.terrainSegments,
      topMaterial: materials.grass,
      reefMaterial: materials.reef,
      position: [0, 0, 0],
      seed: 0x15c05a,
    });
    // Celestial Sky Kingdom owns a deeper, tapered procedural sky-root in its
    // ambience layer. Hiding the generic coastal cylinder prevents the island
    // from reading as a flat plate while preserving the canonical board above.
    island.visible = !isCelestialSkyKingdom && !isMoonveilNexus && !isAbyssalPearlKingdom;
    scene.add(island);

    ISLAND_5_LANDMARKS.filter((entry) => entry.id !== 'boss').forEach((landmark, landmarkIndex) => {
      const satellite = createTerrainPlate({
        radius: 2.58,
        depth: 0.68,
        segments: qualityProfile.terrainSegments,
        topMaterial: materials.grass,
        reefMaterial: materials.reef,
        position: landmark.position,
        seed: 0x51a7 + landmarkIndex * 0x913,
      });
      satellite.visible = !isCelestialSkyKingdom && !isMoonveilNexus && !isAbyssalPearlKingdom;
      scene.add(satellite);
      const bridgeStart: readonly [number, number, number] = [landmark.position[0] * 0.56, 0, landmark.position[2] * 0.56];
      const bridgeEnd: readonly [number, number, number] = [landmark.position[0] * 0.82, 0, landmark.position[2] * 0.82];
      const sharedBridge = createBridge(bridgeStart, bridgeEnd, materials.bridge);
      sharedBridge.visible = !isMoonveilNexus && !isAbyssalPearlKingdom;
      scene.add(sharedBridge);
    });

    const innerLagoon = new THREE.Mesh(new THREE.CircleGeometry(2.25, qualityProfile.terrainSegments), waterMaterial.clone());
    innerLagoon.rotation.x = -Math.PI / 2;
    innerLagoon.position.y = 0.255;
    innerLagoon.receiveShadow = true;
    innerLagoon.visible = !isMoonveilNexus && !isAbyssalPearlKingdom;
    scene.add(innerLagoon);

    const livingAmbience = isFirstLightKingdom && island1Materials
      ? createIsland1LivingAmbience(scene, qualityProfile, island1Materials, water)
      : isCelestialSkyKingdom && island2CelestialMaterials
        ? createIsland2CelestialLivingAmbience(scene, qualityProfile, island2CelestialMaterials, water)
        : isFrostmoonHaven && island3FrostmoonMaterials
          ? createIsland3FrostmoonLivingAmbience(scene, qualityProfile, island3FrostmoonMaterials, water)
          : isSunshoreAtoll && island5SunshoreMaterials
            ? createIsland5SunshoreLivingAmbience(scene, qualityProfile, island5SunshoreMaterials, water)
            : isMoonveilNexus && island6MoonveilMaterials
              ? createIsland6MoonveilLivingAmbience(scene, qualityProfile, island6MoonveilMaterials, water)
            : isAbyssalPearlKingdom && island7UnderwaterMaterials
              ? createIsland7UnderwaterLivingAmbience(scene, qualityProfile, island7UnderwaterMaterials, water)
            : createIsland5LivingAmbience(scene, renderer, qualityProfile, materials, water);

    const tileTransforms = buildIsland5TileTransforms(TILE_ANCHORS_36);
    const tileGeometry = createRadialTileGeometry(tileTransforms.length);
    const tileMaterials = isFirstLightKingdom
      ? [
          new THREE.MeshStandardMaterial({ color: 0xe5f3f7, roughness: 0.68 }),
          new THREE.MeshStandardMaterial({ color: 0x4d91c8, roughness: 0.5, metalness: 0.08 }),
          new THREE.MeshStandardMaterial({ color: 0x72c9e8, roughness: 0.38, metalness: 0.16, emissive: 0x174f80, emissiveIntensity: 0.14 }),
        ]
      : isCelestialSkyKingdom
        ? [
            new THREE.MeshStandardMaterial({ color: 0xf6f0dc, roughness: 0.64 }),
            new THREE.MeshStandardMaterial({ color: 0x7eb5e6, roughness: 0.46, metalness: 0.08 }),
            new THREE.MeshStandardMaterial({ color: 0xe9c35e, roughness: 0.32, metalness: 0.4, emissive: 0x735019, emissiveIntensity: 0.14 }),
          ]
        : isFrostmoonHaven
          ? [
              new THREE.MeshStandardMaterial({ color: 0xe8f2fc, roughness: 0.72 }),
              new THREE.MeshStandardMaterial({ color: 0x536bb8, roughness: 0.52, metalness: 0.07 }),
              new THREE.MeshStandardMaterial({ color: 0x9a72e2, roughness: 0.36, metalness: 0.22, emissive: 0x46257d, emissiveIntensity: 0.18 }),
            ]
          : isSunshoreAtoll
        ? [
            new THREE.MeshStandardMaterial({ color: 0xf5dc9b, roughness: 0.76 }),
            new THREE.MeshStandardMaterial({ color: 0x3aa9c7, roughness: 0.5, metalness: 0.07 }),
            new THREE.MeshStandardMaterial({ color: 0xf2b840, roughness: 0.34, metalness: 0.32, emissive: 0x74400a, emissiveIntensity: 0.14 }),
          ]
      : isMoonveilNexus
        ? [
            new THREE.MeshStandardMaterial({ color: 0x3547a8, roughness: 0.42, metalness: 0.17, emissive: 0x244bd4, emissiveIntensity: 0.9 }),
            new THREE.MeshStandardMaterial({ color: 0x523fa6, roughness: 0.35, metalness: 0.21, emissive: 0x612fd7, emissiveIntensity: 0.95 }),
            new THREE.MeshStandardMaterial({ color: 0x65e7ff, roughness: 0.2, metalness: 0.22, emissive: 0x3265ff, emissiveIntensity: 1.25 }),
          ]
      : isAbyssalPearlKingdom
        ? [
            new THREE.MeshPhysicalMaterial({ color: 0x07549a, roughness: 0.31, metalness: 0.11, clearcoat: 0.62, emissive: 0x063667, emissiveIntensity: 0.3 }),
            new THREE.MeshPhysicalMaterial({ color: 0x6fc9c7, roughness: 0.42, metalness: 0.04, clearcoat: 0.46, emissive: 0x104e5b, emissiveIntensity: 0.17 }),
            new THREE.MeshStandardMaterial({ color: 0xe8bd5c, roughness: 0.28, metalness: 0.62, emissive: 0x74400a, emissiveIntensity: 0.22 }),
          ]
      : [
          new THREE.MeshStandardMaterial({ color: 0xf3e4bd, roughness: 0.7 }),
          new THREE.MeshStandardMaterial({ color: 0x8c67cf, roughness: 0.56 }),
          new THREE.MeshStandardMaterial({ color: 0xf2c861, roughness: 0.42, metalness: 0.18 }),
        ];
    const moonveilTileEdgeGeometry = isMoonveilNexus ? new THREE.EdgesGeometry(tileGeometry, 24) : null;
    const moonveilTileEdgeMaterials = isMoonveilNexus
      ? [
          new THREE.LineBasicMaterial({ color: 0xb4a0ff, transparent: true, opacity: 0.88 }),
          new THREE.LineBasicMaterial({ color: 0xb4f5ff, transparent: true, opacity: 1 }),
        ]
      : [];
    const abyssalTileEdgeGeometry = isAbyssalPearlKingdom ? createTileBorderMeshGeometry(tileGeometry) : null;
    const abyssalTileEdgeMaterials = isAbyssalPearlKingdom
      ? [
          new THREE.MeshBasicMaterial({ color: 0xe2ba61, transparent: true, opacity: 0.58 }),
          new THREE.MeshBasicMaterial({ color: 0xffdf79, transparent: true, opacity: 0.86 }),
        ]
      : [];
    type TileMeshEntry = {
      mesh: THREE.Mesh | THREE.InstancedMesh;
      baseY: number;
      instanceId?: number;
      edgeMesh?: THREE.InstancedMesh;
      basePosition?: THREE.Vector3;
      baseRotationY?: number;
    };
    const tileMeshes = new Map<number, TileMeshEntry>();
    const abyssalTileCounts = [0, 0, 0];
    if (isAbyssalPearlKingdom) {
      tileTransforms.forEach((transform) => {
        abyssalTileCounts[transform.isKeyTile ? 2 : transform.index % 2] += 1;
      });
    }
    const abyssalTileMeshes = isAbyssalPearlKingdom
      ? abyssalTileCounts.map((count, materialIndex) => {
          const mesh = new THREE.InstancedMesh(tileGeometry, tileMaterials[materialIndex], count);
          mesh.name = `ISLAND_7_TILE_SURFACE_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.receiveShadow = true;
          scene.add(mesh);
          return mesh;
        })
      : [];
    const abyssalTileEdgeMeshes = isAbyssalPearlKingdom
      ? abyssalTileCounts.map((count, materialIndex) => {
          const edgeMaterial = abyssalTileEdgeMaterials[materialIndex === 2 ? 1 : 0];
          const mesh = new THREE.InstancedMesh(abyssalTileEdgeGeometry!, edgeMaterial, count);
          mesh.name = `ISLAND_7_TILE_BORDER_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          scene.add(mesh);
          return mesh;
        })
      : [];
    const abyssalTileInstanceCursor = [0, 0, 0];
    const tileMatrixScratch = new THREE.Matrix4();
    const tileQuaternionScratch = new THREE.Quaternion();
    const tileScaleScratch = new THREE.Vector3(1, 1, 1);
    for (const transform of tileTransforms) {
      const tileMaterial = transform.isKeyTile ? tileMaterials[2] : tileMaterials[transform.index % 2];
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.position.set(...transform.position);
      tile.rotation.y = transform.rotationYRad;
      tile.castShadow = sceneUsesRealtimeShadows;
      tile.receiveShadow = true;
      tile.userData.tileIndex = transform.index;
      if (moonveilTileEdgeGeometry) {
        const outline = new THREE.LineSegments(
          moonveilTileEdgeGeometry,
          moonveilTileEdgeMaterials[transform.isKeyTile ? 1 : 0],
        );
        outline.position.y = 0.004;
        outline.name = 'ISLAND_6_ASTRAL_TILE_EDGE';
        tile.add(outline);
      }
      if (isAbyssalPearlKingdom) {
        const materialIndex = transform.isKeyTile ? 2 : transform.index % 2;
        const instanceId = abyssalTileInstanceCursor[materialIndex];
        abyssalTileInstanceCursor[materialIndex] += 1;
        const batch = abyssalTileMeshes[materialIndex];
        tileQuaternionScratch.setFromAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotationYRad);
        tileMatrixScratch.compose(
          new THREE.Vector3(...transform.position),
          tileQuaternionScratch,
          tileScaleScratch,
        );
        batch.setMatrixAt(instanceId, tileMatrixScratch);
        batch.instanceMatrix.needsUpdate = true;
        abyssalTileEdgeMeshes[materialIndex].setMatrixAt(instanceId, tileMatrixScratch);
        abyssalTileEdgeMeshes[materialIndex].instanceMatrix.needsUpdate = true;
        tileMeshes.set(transform.index, {
          mesh: batch,
          baseY: transform.position[1],
          instanceId,
          edgeMesh: abyssalTileEdgeMeshes[materialIndex],
          basePosition: new THREE.Vector3(...transform.position),
          baseRotationY: transform.rotationYRad,
        });
      } else {
        tileMeshes.set(transform.index, { mesh: tile, baseY: transform.position[1] });
        scene.add(tile);
      }
    }

    // Three-dimensional tile rewards are projections of the canonical tile
    // map. They carry no click handlers, wallet logic, or persistence and are
    // intentionally hidden beneath the player piece while its tile is occupied.
    const tileRewardObjects = createIslandRunTileRewardThreeObjects({
      tileMap: resolvedTileMap,
      tileTransforms,
      quality: qualityProfile.id,
      compactCollectibles: isAbyssalPearlKingdom,
    });
    scene.add(tileRewardObjects.root);

    const playerPiece = createIslandPlayerPiece(qualityProfile.id);
    const startingTokenPosition = getIsland5TokenGroundPosition(tileTransforms, tokenIndexRef.current);
    playerPiece.root.position.set(...startingTokenPosition);
    playerPiece.shadow.position.set(startingTokenPosition[0], startingTokenPosition[1] + 0.012, startingTokenPosition[2]);
    scene.add(playerPiece.shadow, playerPiece.root);

    const caretakerFootplateMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fb7b7,
      roughness: 0.82,
      metalness: 0.04,
    });
    const caretakerFootplate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 0.12, 12),
      caretakerFootplateMaterial,
    );
    caretakerFootplate.name = 'ISLAND_5_CARETAKER_FOOTPLATE';
    caretakerFootplate.position.copy(CARETAKER_BOARD_HOME).add(new THREE.Vector3(0, -0.06, 0));
    caretakerFootplate.scale.z = 0.78;
    caretakerFootplate.castShadow = sceneUsesRealtimeShadows;
    caretakerFootplate.receiveShadow = true;
    caretakerFootplate.userData.caretakerTarget = true;

    const caretakerContactShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x102b38,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const caretakerContactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 12),
      caretakerContactShadowMaterial,
    );
    caretakerContactShadow.name = 'ISLAND_5_CARETAKER_CONTACT_SHADOW';
    caretakerContactShadow.rotation.x = -Math.PI / 2;
    caretakerContactShadow.position.copy(CARETAKER_BOARD_HOME).add(new THREE.Vector3(0, 0.035, 0));
    caretakerContactShadow.scale.y = 0.64;
    caretakerContactShadow.userData.caretakerTarget = true;

    // Visual scale and touch scale are intentionally decoupled. The Caretaker
    // reads like a small topiary on the board while this transparent volume
    // keeps the tap target forgiving on a phone.
    const caretakerHitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    caretakerHitTarget.name = 'ISLAND_5_CARETAKER_HIT_TARGET';
    caretakerHitTarget.position.copy(CARETAKER_BOARD_HOME).add(new THREE.Vector3(0, 0.72, 0));
    caretakerHitTarget.userData.caretakerTarget = true;

    const boardCaretaker = createCaretakerMaster({ quality: 'low' });
    boardCaretaker.root.name = 'ISLAND_5_CARETAKER_BOARD_LOD';
    boardCaretaker.root.position.copy(CARETAKER_BOARD_HOME);
    boardCaretaker.root.scale.setScalar(CARETAKER_BOARD_SCALE);
    boardCaretaker.root.rotation.y = 0;
    boardCaretaker.root.traverse((child) => {
      child.userData.caretakerTarget = true;
    });
    boardCaretaker.setAnimation('idle', 0, true);
    boardCaretaker.setEmotion('calm');
    scene.add(caretakerFootplate, caretakerContactShadow, caretakerHitTarget, boardCaretaker.root);
    const clickableCaretaker: THREE.Object3D[] = [caretakerHitTarget, caretakerFootplate, caretakerContactShadow, boardCaretaker.root];
    let encounterCaretaker: CaretakerModel | null = null;
    let wasCaretakerEncounterOpen = false;
    let caretakerEncounterStartedAt = 0;

    const clickableLandmarks: THREE.Object3D[] = [];
    const landmarkRootsById = new Map<Island5LandmarkDefinition['id'], THREE.Object3D>();
    for (const landmark of ISLAND_5_LANDMARKS) {
      const resolvedBuildLevel = landmarkBuildLevelsRef.current?.[landmark.id] ?? buildLevel;
      const landmarkRoot = isFirstLightKingdom && island1Materials
        ? buildIsland1Landmark(landmark, resolvedBuildLevel, qualityProfile.id, island1Materials)
        : isCelestialSkyKingdom && island2CelestialMaterials
          ? buildIsland2CelestialLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island2CelestialMaterials)
          : isFrostmoonHaven && island3FrostmoonMaterials
            ? buildIsland3FrostmoonLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island3FrostmoonMaterials)
            : isSunshoreAtoll && island5SunshoreMaterials
              ? buildIsland5SunshoreLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island5SunshoreMaterials)
              : isMoonveilNexus && island6MoonveilMaterials
                ? buildIsland6MoonveilLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island6MoonveilMaterials)
              : isAbyssalPearlKingdom && island7UnderwaterMaterials
                ? buildIsland7UnderwaterLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island7UnderwaterMaterials)
              : buildLandmark(landmark, resolvedBuildLevel, qualityProfile.id, materials);
      scene.add(landmarkRoot);
      clickableLandmarks.push(landmarkRoot);
      landmarkRootsById.set(landmark.id, landmarkRoot);
    }
    const bossBuildLevel = landmarkBuildLevelsRef.current?.boss ?? buildLevel;
    const crownDrifter = isIslandRunArenaIsland(islandNumber) && bossBuildLevel >= 1
      ? createCrownDrifterModel({ lod: 'board', quality: qualityProfile.id })
      : null;
    const crownDrifterPresentationRoot = crownDrifter ? new THREE.Group() : null;
    if (crownDrifter && crownDrifterPresentationRoot) {
      crownDrifterPresentationRoot.name = 'ISLAND_RUN_ARENA_CREATURE_PRESENTATION_ROOT';
      crownDrifterPresentationRoot.scale.setScalar(CROWN_DRIFTER_BOARD_SCALE);
      crownDrifterPresentationRoot.add(crownDrifter.root);
      scene.add(crownDrifterPresentationRoot);
    }
    const voicePrism = scene.getObjectByName('CROWN_CITADEL_VOICE_PRISM');
    const voiceLight = scene.getObjectByName('CROWN_CITADEL_VOICE_LIGHT');

    const coralInstances = isFirstLightKingdom || isCelestialSkyKingdom || isFrostmoonHaven || isSunshoreAtoll || isMoonveilNexus || isAbyssalPearlKingdom
      ? new THREE.Group()
      : addAmbientReefDetails(scene, qualityProfile.ambientDetailCount, materials);
    const routeGlowColor = isFirstLightKingdom
      ? 0x9be5ff
      : isCelestialSkyKingdom
        ? 0xd7f4ff
        : isFrostmoonHaven
          ? 0xa98cff
          : isSunshoreAtoll
            ? 0x77e8df
            : isMoonveilNexus
              ? 0x72ecff
              : isAbyssalPearlKingdom
                ? 0x9ffff4
              : 0xffdb8c;
    const routeGlowEmissive = isFirstLightKingdom
      ? 0x247bb2
      : isCelestialSkyKingdom
        ? 0x286fb3
        : isFrostmoonHaven
          ? 0x52289f
          : isSunshoreAtoll
            ? 0x11767a
            : isMoonveilNexus
              ? 0x3d2dff
              : isAbyssalPearlKingdom
                ? 0x0a7898
              : 0xa96f18;
    const routeGlow = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.055, 8, 96),
      new THREE.MeshStandardMaterial({ color: routeGlowColor, emissive: routeGlowEmissive, emissiveIntensity: 0.62, roughness: 0.38 }),
    );
    routeGlow.rotation.x = Math.PI / 2;
    routeGlow.position.y = 0.25;
    scene.add(routeGlow);

    // Deterministic Gauntlet evidence mode. The scene keeps its authored
    // geometry and camera, but removes texture/material-map influence so the
    // blockout can be judged on silhouette and structure alone.
    const isMapStrippedEvidence = (isSunshoreAtoll || isMoonveilNexus || isAbyssalPearlKingdom)
      && new URLSearchParams(window.location.search).get('island3dMapStripped') === '1';
    const evidenceOverrideMaterial = isMapStrippedEvidence
      ? new THREE.MeshBasicMaterial({ color: 0xb8c1bd, side: THREE.DoubleSide })
      : null;
    if (evidenceOverrideMaterial) scene.overrideMaterial = evidenceOverrideMaterial;

    const timer = new THREE.Timer();
    timer.connect(document);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    let animationFrame = 0;
    let transition: {
      startedAt: number;
      durationMs: number;
      fromPosition: THREE.Vector3;
      fromTarget: THREE.Vector3;
      controlPosition: THREE.Vector3;
      toPosition: THREE.Vector3;
      toTarget: THREE.Vector3;
    } | null = null;
    let frameCount = 0;
    let metricStartedAt = performance.now();
    let activeProfiler: {
      startedAt: number;
      lastFrameAt: number;
      lastProgressAt: number;
      choreographyIndex: number;
      frameTimesMs: number[];
      maxDrawCalls: number;
      maxTriangles: number;
    } | null = null;
    let activeTour: {
      stepIndex: number;
      nextStepAt: number;
    } | null = null;
    let consumedTokenMotionRequestId = 0;
    let appliedTokenSnapIndex = tokenIndexRef.current;
    let lastAnimationFrameAt = performance.now();
    let activeTokenMotion: {
      request: TokenMotionRequest;
      startsAt: number;
      fromPosition: readonly [number, number, number];
      lastTriggeredHopIndex: number;
      finalImpactTriggered: boolean;
    } | null = null;
    let idleOverviewAt: number | null = null;
    const activeTileImpacts = new Map<number, ActiveTileImpact>();
    let activeTokenSettle: ActiveTokenSettle | null = null;

    const setBoardActorsVisibleForPreset = (preset: Island5CameraPresetId | 'manual') => {
      const isLandmarkInspection = preset === 'boss'
        || preset === 'hatchery'
        || preset === 'habit'
        || preset === 'wisdom'
        || preset === 'event';
      const visible = !isLandmarkInspection;
      playerPiece.root.visible = visible;
      playerPiece.shadow.visible = visible;
      boardCaretaker.root.visible = visible;
      caretakerFootplate.visible = visible;
      caretakerContactShadow.visible = visible;
      caretakerHitTarget.visible = visible;
      if (isAbyssalPearlKingdom) {
        landmarkRootsById.forEach((landmarkRoot, landmarkId) => {
          landmarkRoot.visible = !isLandmarkInspection || landmarkId === preset;
        });
      }
    };

    const triggerTileImpact = (tileIndex: number, strength: number, startedAt: number) => {
      if (isReducedMotion) return;
      const existing = activeTileImpacts.get(tileIndex);
      activeTileImpacts.set(tileIndex, {
        startedAt,
        strength: Math.max(strength, existing?.strength ?? 0),
      });
    };

    const triggerFinalSettle = (
      tileIndex: number,
      impact: TokenMotionRequest['landingImpact'],
      startedAt: number,
    ) => {
      const strength = impact === 'special' ? 1.35 : impact === 'hazard' ? 1.2 : 0.9;
      triggerTileImpact(tileIndex, strength, startedAt);
      if (!isReducedMotion) {
        activeTokenSettle = {
          startedAt,
          strength,
          position: getIsland5TokenGroundPosition(tileTransforms, tileIndex),
        };
      }
    };

    const applyPreset = (id: Island5CameraPresetId, durationScale = 1) => {
      const basePreset = getIsland5CameraPreset(id);
      const firstLightFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        boss: { position: [0, 7.8, 9.8], target: [0, 0.82, 0] },
        hatchery: { position: [2.3, 7.8, -0.9], target: [-4.36, 1.55, -3.9] },
        habit: { position: [0.6, 7.7, 2.4], target: [4.36, 1.62, -3.9] },
        wisdom: { position: [-0.6, 7.7, -2.4], target: [-4.36, 1.52, 3.9] },
        event: { position: [-2.3, 7.7, 0.9], target: [4.36, 1.48, 3.9] },
      };
      const moonveilFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 13, 22], target: [0, -4.1, 0] },
        survey: { position: [0, 31, 35], target: [0, -1.4, 0] },
        'orbit-left': { position: [-21, 23, 26], target: [0, -1.05, 0] },
        'orbit-right': { position: [21, 23, 26], target: [0, -1.05, 0] },
        boss: { position: [0, 8.4, 11.2], target: [0, 1.35, 0] },
        // Keep the whole L3 roofline, entrance, bridge and cliff root in the
        // phone view. The target values are Moonveil's resolved tall-layout
        // anchors; the camera positions are intentionally pulled back from
        // the earlier extreme close-up framing.
        hatchery: { position: [1.6, 9.8, 5.2], target: [-2.96, 1.38, -6.05] },
        habit: { position: [-1.6, 9.8, 5.2], target: [2.96, 1.4, -6.05] },
        wisdom: { position: [1.6, 9.6, -4.5], target: [-2.96, 1.42, 6.05] },
        event: { position: [-1.6, 9.6, -4.5], target: [2.96, 1.4, 6.05] },
      };
      const underwaterFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 18.5, 25], target: [0, 0.45, 0] },
        survey: { position: [0, 29, 37], target: [0, 0.15, 0] },
        'orbit-left': { position: [-23, 22, 27], target: [0, 0.25, 0] },
        'orbit-right': { position: [23, 22, 27], target: [0, 0.25, 0] },
        boss: { position: [0, 10.8, 15.6], target: [0, 1.5, 0] },
        // Satellite entrances face the central promenade. Focus approaches
        // from inside the board so the authored facade—not the rear shell—is
        // what fills the phone screen.
        hatchery: { position: [2.5, 6.8, 2.5], target: [-4.36, 1.3, -3.9] },
        habit: { position: [-2.5, 6.8, 2.5], target: [4.36, 1.34, -3.9] },
        wisdom: { position: [2.5, 6.8, -2.5], target: [-4.36, 1.38, 3.9] },
        event: { position: [-2.5, 6.8, -2.5], target: [4.36, 1.28, 3.9] },
      };
      const firstLightOverride = isFirstLightKingdom ? firstLightFocusOverrides[id] : undefined;
      const moonveilOverride = isMoonveilNexus ? moonveilFocusOverrides[id] : undefined;
      const underwaterOverride = isAbyssalPearlKingdom ? underwaterFocusOverrides[id] : undefined;
      const authoredFocusOverride = firstLightOverride ?? moonveilOverride ?? underwaterOverride;
      const preset = authoredFocusOverride ? { ...basePreset, ...authoredFocusOverride } : basePreset;
      setBoardActorsVisibleForPreset(id);
      setActivePreset(id);
      if (isReducedMotion) {
        camera.position.set(...preset.position);
        controls.target.set(...preset.target);
        camera.lookAt(controls.target);
        controls.update();
        transition = null;
        return;
      }
      const fromPosition = camera.position.clone();
      const toPosition = new THREE.Vector3(...preset.position);
      const controlPosition = fromPosition.clone().lerp(toPosition, 0.5);
      controlPosition.y += Math.min(5.5, Math.max(1.25, fromPosition.distanceTo(toPosition) * 0.12));
      transition = {
        startedAt: performance.now(),
        durationMs: Math.max(220, preset.durationMs * durationScale),
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget: new THREE.Vector3(...preset.target),
      };
    };
    const applyCaretakerFocus = (durationScale = 1) => {
      setBoardActorsVisibleForPreset('manual');
      setActivePreset('manual');
      const fromPosition = camera.position.clone();
      const toTarget = CARETAKER_BOARD_HOME.clone().add(new THREE.Vector3(0, 1.12, 0));
      const toPosition = CARETAKER_BOARD_HOME.clone().add(new THREE.Vector3(2.35, 3.25, 4.1));
      const controlPosition = fromPosition.clone().lerp(toPosition, 0.5);
      controlPosition.y += 1.8;
      transition = {
        startedAt: performance.now(),
        durationMs: Math.max(280, 720 * durationScale),
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget,
      };
    };
    const applyCaretakerEncounterFocus = (durationScale = 1) => {
      setBoardActorsVisibleForPreset('manual');
      setActivePreset('manual');
      const fromPosition = camera.position.clone();
      // Aim close to the character's feet so the hat, eyes and upper torso stay
      // above the topic panel in a phone portrait viewport.
      const toTarget = CARETAKER_ENCOUNTER_HOME.clone().add(new THREE.Vector3(0, -0.7, 0));
      const toPosition = CARETAKER_ENCOUNTER_HOME.clone().add(new THREE.Vector3(2.65, 3.55, 6.35));
      const controlPosition = fromPosition.clone().lerp(toPosition, 0.5);
      controlPosition.y += 2.2;
      transition = {
        startedAt: performance.now(),
        durationMs: Math.max(300, 780 * durationScale),
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget,
      };
    };
    applyPresetRef.current = applyPreset;
    const applyControlledCameraFocus = (request: ControlledCameraFocusRequest) => {
      if (request.version <= appliedControlledCameraFocusVersionRef.current) return;
      appliedControlledCameraFocusVersionRef.current = request.version;
      idleOverviewAt = null;
      applyPreset(request.preset, request.durationScale);
    };
    applyControlledCameraFocusRef.current = applyControlledCameraFocus;
    if (controlledCameraFocusRequestRef.current) {
      applyControlledCameraFocus(controlledCameraFocusRequestRef.current);
    }

    const stopTour = (returnToOverview = true) => {
      if (!activeTour) return;
      activeTour = null;
      controls.enabled = true;
      setTourStatus('idle');
      if (returnToOverview) applyPreset('overview');
    };
    const startTour = () => {
      if (activeProfiler || activeTour) return;
      const firstStep = ISLAND_CAMERA_TOUR_STEPS[0];
      const firstPreset = getIsland5CameraPreset(firstStep.preset);
      controls.enabled = false;
      setTourStatus('running');
      applyPreset(firstStep.preset);
      activeTour = {
        stepIndex: 0,
        nextStepAt: performance.now() + firstPreset.durationMs + firstStep.holdMs,
      };
    };
    startTourRef.current = startTour;
    stopTourRef.current = () => stopTour(true);

    const profilerChoreography: readonly { atMs: number; preset: Island5CameraPresetId }[] = [
      { atMs: 5_000, preset: 'boss' },
      { atMs: 11_000, preset: 'orbit-left' },
      { atMs: 17_000, preset: 'hatchery' },
      { atMs: 23_000, preset: 'overview' },
    ];

    const cancelProfiler = (notice: string) => {
      if (!activeProfiler) return;
      activeProfiler = null;
      controls.enabled = true;
      setProfilerStatus('cancelled');
      setProfilerProgress(0);
      setProfilerNotice(notice);
    };

    const startProfiler = () => {
      if (activeTour) return;
      if (document.visibilityState !== 'visible') {
        setProfilerStatus('cancelled');
        setProfilerNotice('Profile not started: bring this tab to the foreground first.');
        return;
      }
      const startedAt = performance.now();
      activeProfiler = {
        startedAt,
        lastFrameAt: 0,
        lastProgressAt: startedAt,
        choreographyIndex: 0,
        frameTimesMs: [],
        maxDrawCalls: 0,
        maxTriangles: 0,
      };
      controls.enabled = false;
      setProfileReport(null);
      setReportShareNotice('');
      setProfilerProgress(0);
      setProfilerStatus('running');
      setProfilerNotice('Running overview and landmark camera choreography…');
      applyPreset('overview');
    };
    startProfilerRef.current = startProfiler;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        cancelProfiler('Profile cancelled because the tab left the foreground.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const cancelTransition = () => {
      transition = null;
      idleOverviewAt = null;
      setBoardActorsVisibleForPreset('manual');
      setActivePreset('manual');
    };
    controls.addEventListener('start', cancelTransition);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown.set(event.clientX, event.clientY);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (interactionPausedRef.current || activeTour || activeProfiler || activeTokenMotion) return;
      if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 7) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const caretakerIntersection = raycaster.intersectObjects(clickableCaretaker, true)[0];
      if (caretakerIntersection) {
        idleOverviewAt = null;
        applyCaretakerFocus(0.88);
        onCaretakerClickRef.current?.();
        return;
      }
      const intersection = raycaster.intersectObjects(clickableLandmarks, true)[0];
      const landmarkId = intersection?.object.userData.landmarkId as Island5CameraPresetId | undefined;
      if (landmarkId) {
        idleOverviewAt = null;
        applyPreset(landmarkId);
        if (landmarkId === 'boss' || landmarkId === 'hatchery' || landmarkId === 'habit' || landmarkId === 'wisdom' || landmarkId === 'event') {
          onLandmarkClickRef.current?.(landmarkId);
        }
      }
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    const animate = (now: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      timer.update(now);
      const elapsed = timer.getElapsed();
      const frameDeltaSeconds = Math.min(0.05, Math.max(0, (now - lastAnimationFrameAt) / 1000));
      lastAnimationFrameAt = now;
      // View culling is accessibility-neutral scene hygiene, not decorative
      // motion, so it must still run when reduced motion freezes ambience.
      livingAmbience.updateView?.(camera.position);
      if (!isReducedMotion) {
        livingAmbience.animate(elapsed);
        tileRewardObjects.animate(elapsed, tokenIndexRef.current);
        routeGlow.material instanceof THREE.MeshStandardMaterial
          && (routeGlow.material.emissiveIntensity = 0.48 + Math.sin(elapsed * 1.2) * 0.14);
        coralInstances.rotation.y = Math.sin(elapsed * 0.08) * 0.012;
        if (voicePrism) {
          voicePrism.rotation.y = elapsed * 0.46;
          voicePrism.rotation.x = Math.sin(elapsed * 0.7) * 0.12;
        }
        if (voiceLight instanceof THREE.PointLight) {
          voiceLight.intensity = 1.85 + Math.sin(elapsed * 1.35) * 0.25;
        }
        materials.deepWindow.emissiveIntensity = 0.46 + Math.sin(elapsed * 0.92) * 0.1;
        materials.voiceGlow.emissiveIntensity = 0.96 + Math.sin(elapsed * 1.35) * 0.14;
        materials.pearlAccent.emissiveIntensity = 0.36 + Math.sin(elapsed * 1.08 + 0.7) * 0.1;
        playerPiece.compassLight.rotation.y += frameDeltaSeconds * 1.8;
      } else {
        // Reduced motion freezes bob/spin at a deterministic pose while still
        // reflecting canonical token occupancy so the landed-on reward does
        // not clip through the player piece.
        tileRewardObjects.animate(0, tokenIndexRef.current);
      }

      if (crownDrifter && crownDrifterPresentationRoot) {
        const battlePresentation = arenaBattlePresentationRef.current.value;
        const creatureMotion = battlePresentation?.active
          ? {
              mode: 'roaming' as const,
              visible: true,
              position: [0, 2.82, 0.28] as const,
              yaw: Math.PI,
              emergenceProgress: 1,
            }
          : resolveIslandRunArenaCreatureMotion({
              islandNumber,
              bossBuildLevel,
              elapsedSeconds: elapsed,
              tokenPosition: [playerPiece.root.position.x, playerPiece.root.position.y, playerPiece.root.position.z],
              reducedMotion: isReducedMotion,
            });
        crownDrifterPresentationRoot.visible = creatureMotion.visible;
        crownDrifterPresentationRoot.position.set(...creatureMotion.position);
        crownDrifterPresentationRoot.rotation.y = creatureMotion.yaw;
        crownDrifterPresentationRoot.rotation.x = 0;
        crownDrifterPresentationRoot.rotation.z = 0;
        crownDrifterPresentationRoot.scale.setScalar(battlePresentation?.active ? 0.86 : CROWN_DRIFTER_BOARD_SCALE);
        crownDrifter.update(elapsed, frameDeltaSeconds, isReducedMotion, creatureMotion.emergenceProgress);
        if (battlePresentation?.active && !isReducedMotion) {
          const cueElapsed = Math.max(0, (now - arenaBattlePresentationRef.current.cueStartedAtMs) / 1000);
          const cuePulse = Math.sin(Math.min(1, cueElapsed) * Math.PI);
          if (battlePresentation.cue === 'opponent_charge') {
            const chargePulse = 1 + Math.sin(cueElapsed * 12) * 0.055 + Math.min(0.12, cueElapsed * 0.08);
            crownDrifterPresentationRoot.scale.multiplyScalar(chargePulse);
            crownDrifter.leftWingPivot.rotation.z -= 0.28;
            crownDrifter.rightWingPivot.rotation.z += 0.28;
            routeGlow.material instanceof THREE.MeshStandardMaterial
              && (routeGlow.material.emissiveIntensity = 1.05 + Math.sin(cueElapsed * 10) * 0.32);
          } else if (battlePresentation.cue === 'opponent_attack') {
            crownDrifterPresentationRoot.position.z -= cuePulse * 0.72;
            crownDrifterPresentationRoot.rotation.x = -cuePulse * 0.14;
          } else if (battlePresentation.cue === 'player_attack' || battlePresentation.cue === 'player_power') {
            const powerScale = battlePresentation.cue === 'player_power' ? 0.22 : 0.1;
            crownDrifterPresentationRoot.position.z += cuePulse * (battlePresentation.cue === 'player_power' ? 0.7 : 0.34);
            crownDrifterPresentationRoot.rotation.z = Math.sin(cueElapsed * 34) * powerScale * (1 - Math.min(1, cueElapsed));
          } else if (battlePresentation.cue === 'victory') {
            crownDrifterPresentationRoot.position.y = 1.38 - Math.min(0.34, cueElapsed * 0.16);
            crownDrifterPresentationRoot.rotation.z = Math.min(0.22, cueElapsed * 0.08);
          } else if (battlePresentation.cue === 'defeat') {
            crownDrifterPresentationRoot.position.y += Math.abs(Math.sin(cueElapsed * 3.8)) * 0.18;
            crownDrifterPresentationRoot.scale.multiplyScalar(1 + Math.sin(cueElapsed * 4.2) * 0.04);
          }
        }
      }

      const isCaretakerEncounterOpen = caretakerEncounterOpenRef.current;
      if (isCaretakerEncounterOpen !== wasCaretakerEncounterOpen) {
        wasCaretakerEncounterOpen = isCaretakerEncounterOpen;
        if (isCaretakerEncounterOpen) {
          caretakerEncounterStartedAt = elapsed;
          boardCaretaker.root.visible = false;
          if (!encounterCaretaker) {
            encounterCaretaker = createCaretakerMaster({ quality: 'high' });
            encounterCaretaker.root.name = 'ISLAND_5_CARETAKER_ENCOUNTER_LOD';
            encounterCaretaker.root.position.copy(CARETAKER_ENCOUNTER_HOME);
            encounterCaretaker.root.scale.setScalar(CARETAKER_ENCOUNTER_SCALE);
            // Keep the character-lab's canonical front orientation; the
            // dedicated encounter camera now frames it above the phone card.
            encounterCaretaker.root.rotation.y = 0;
            encounterCaretaker.setEmotion('delighted');
            encounterCaretaker.setAnimation('greet', elapsed, true);
            scene.add(encounterCaretaker.root);
            if (sceneUsesRealtimeShadows) renderer.shadowMap.needsUpdate = true;
          }
          controls.enabled = false;
          applyCaretakerEncounterFocus(0.72);
        } else {
          if (encounterCaretaker) {
            scene.remove(encounterCaretaker.root);
            encounterCaretaker.dispose();
            encounterCaretaker = null;
          }
          boardCaretaker.root.visible = true;
          boardCaretaker.setEmotion('calm');
          boardCaretaker.setAnimation('idle', elapsed, true);
          controls.enabled = true;
          applyPreset('overview', 0.72);
        }
      }

      if (encounterCaretaker) {
        const encounterElapsed = elapsed - caretakerEncounterStartedAt;
        if (encounterElapsed > 2.25 && encounterCaretaker.animation === 'greet') {
          encounterCaretaker.setAnimation('talk-gentle', elapsed);
          encounterCaretaker.setEmotion('curious');
        }
        encounterCaretaker.update(elapsed, frameDeltaSeconds, isReducedMotion);
      } else {
        const wanderCycle = elapsed % 18;
        const isWalking = !isReducedMotion && wanderCycle < 4.4;
        const wanderProgress = Math.min(1, wanderCycle / 4.4);
        const wanderAngle = wanderProgress * Math.PI * 2;
        boardCaretaker.root.position.set(
          CARETAKER_BOARD_HOME.x + Math.sin(wanderAngle) * 0.16,
          CARETAKER_BOARD_HOME.y,
          CARETAKER_BOARD_HOME.z + (1 - Math.cos(wanderAngle)) * 0.055,
        );
        const tangentX = Math.cos(wanderAngle) * 0.16;
        const tangentZ = Math.sin(wanderAngle) * 0.055;
        boardCaretaker.root.rotation.y = isWalking ? Math.atan2(tangentX, tangentZ) : 0;
        if (isWalking && boardCaretaker.animation !== 'walk') boardCaretaker.setAnimation('walk', elapsed);
        if (!isWalking && boardCaretaker.animation !== 'idle') boardCaretaker.setAnimation('idle', elapsed);
        boardCaretaker.update(elapsed, frameDeltaSeconds, isReducedMotion);
      }

      for (const [tileIndex, impact] of activeTileImpacts) {
        const tileEntry = tileMeshes.get(tileIndex);
        if (!tileEntry) {
          activeTileImpacts.delete(tileIndex);
          continue;
        }
        const elapsedImpactMs = now - impact.startedAt;
        const pose = getIsland3DTileImpactPose(elapsedImpactMs, impact.strength);
        if (tileEntry.mesh instanceof THREE.InstancedMesh && tileEntry.instanceId !== undefined && tileEntry.basePosition) {
          tileQuaternionScratch.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tileEntry.baseRotationY ?? 0);
          tileScaleScratch.set(pose.scaleXZ, pose.scaleY, pose.scaleXZ);
          tileMatrixScratch.compose(
            tileEntry.basePosition.clone().setY(tileEntry.baseY + pose.yOffset),
            tileQuaternionScratch,
            tileScaleScratch,
          );
          tileEntry.mesh.setMatrixAt(tileEntry.instanceId, tileMatrixScratch);
          tileEntry.mesh.instanceMatrix.needsUpdate = true;
          const edgeBatch = tileEntry.edgeMesh;
          if (edgeBatch) {
            edgeBatch.setMatrixAt(tileEntry.instanceId, tileMatrixScratch);
            edgeBatch.instanceMatrix.needsUpdate = true;
          }
        } else {
          tileEntry.mesh.position.y = tileEntry.baseY + pose.yOffset;
          tileEntry.mesh.scale.set(pose.scaleXZ, pose.scaleY, pose.scaleXZ);
        }
        if (elapsedImpactMs >= ISLAND_3D_TILE_IMPACT_DURATION_MS) {
          if (tileEntry.mesh instanceof THREE.InstancedMesh && tileEntry.instanceId !== undefined && tileEntry.basePosition) {
            tileQuaternionScratch.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tileEntry.baseRotationY ?? 0);
            tileScaleScratch.set(1, 1, 1);
            tileMatrixScratch.compose(tileEntry.basePosition, tileQuaternionScratch, tileScaleScratch);
            tileEntry.mesh.setMatrixAt(tileEntry.instanceId, tileMatrixScratch);
            tileEntry.mesh.instanceMatrix.needsUpdate = true;
            const edgeBatch = tileEntry.edgeMesh;
            if (edgeBatch) {
              edgeBatch.setMatrixAt(tileEntry.instanceId, tileMatrixScratch);
              edgeBatch.instanceMatrix.needsUpdate = true;
            }
          } else {
            tileEntry.mesh.position.y = tileEntry.baseY;
            tileEntry.mesh.scale.set(1, 1, 1);
          }
          activeTileImpacts.delete(tileIndex);
        }
      }

      if (!activeTokenMotion && activeTokenSettle) {
        const elapsedSettleMs = now - activeTokenSettle.startedAt;
        const pose = getIsland3DTileImpactPose(elapsedSettleMs, activeTokenSettle.strength);
        const compression = Math.max(0, pose.compression);
        playerPiece.root.position.set(
          activeTokenSettle.position[0],
          activeTokenSettle.position[1] + pose.yOffset,
          activeTokenSettle.position[2],
        );
        playerPiece.root.scale.set(1 + compression * 0.085, 1 - compression * 0.19, 1 + compression * 0.085);
        playerPiece.root.rotation.z = Math.sin(Math.min(1, elapsedSettleMs / ISLAND_3D_TILE_IMPACT_DURATION_MS) * Math.PI * 2)
          * (1 - Math.min(1, elapsedSettleMs / ISLAND_3D_TILE_IMPACT_DURATION_MS))
          * 0.035
          * activeTokenSettle.strength;
        playerPiece.shadow.scale.setScalar(1 + compression * 0.18);
        playerPiece.shadowMaterial.opacity = 0.32 + compression * 0.08;
        if (elapsedSettleMs >= ISLAND_3D_TILE_IMPACT_DURATION_MS) {
          playerPiece.root.position.set(...activeTokenSettle.position);
          playerPiece.root.scale.set(1, 1, 1);
          playerPiece.root.rotation.z = 0;
          playerPiece.shadow.scale.set(1, 1, 1);
          playerPiece.shadowMaterial.opacity = 0.32;
          activeTokenSettle = null;
        }
      }

      const pendingTokenMotion = tokenMotionRequestRef.current;
      if (pendingTokenMotion && pendingTokenMotion.id !== consumedTokenMotionRequestId) {
        consumedTokenMotionRequestId = pendingTokenMotion.id;
        idleOverviewAt = null;
        transition = null;
        controls.enabled = false;
        setBoardActorsVisibleForPreset('manual');
        setActivePreset('manual');
        activeTokenSettle = null;
        playerPiece.root.scale.set(1, 1, 1);
        playerPiece.root.rotation.z = 0;
        activeTokenMotion = {
          request: pendingTokenMotion,
          startsAt: pendingTokenMotion.requestedAt + pendingTokenMotion.holdMs,
          fromPosition: [playerPiece.root.position.x, playerPiece.root.position.y, playerPiece.root.position.z],
          lastTriggeredHopIndex: -1,
          finalImpactTriggered: false,
        };
        logIslandRunEntryDebug('island5_3d_hop_started', {
          requestId: pendingTokenMotion.id,
          hopCount: pendingTokenMotion.sequence.length,
          fromX: playerPiece.root.position.x,
          fromY: playerPiece.root.position.y,
          fromZ: playerPiece.root.position.z,
        });
      }

      if (!activeTokenMotion && tokenSnapRequestRef.current !== appliedTokenSnapIndex) {
        appliedTokenSnapIndex = tokenSnapRequestRef.current;
        activeTokenSettle = null;
        const snappedPosition = getIsland5TokenGroundPosition(tileTransforms, appliedTokenSnapIndex);
        playerPiece.root.position.set(...snappedPosition);
        playerPiece.root.scale.set(1, 1, 1);
        playerPiece.root.rotation.z = 0;
        playerPiece.shadow.position.set(snappedPosition[0], snappedPosition[1] + 0.012, snappedPosition[2]);
        playerPiece.shadow.scale.set(1, 1, 1);
        playerPiece.shadowMaterial.opacity = 0.32;
      }

      if (activeTokenMotion) {
        const { request, startsAt, fromPosition } = activeTokenMotion;
        const totalMotionMs = request.durationsMs.reduce((total, duration) => total + duration, 0);
        const motionElapsedMs = isReducedMotion ? totalMotionMs : Math.max(0, now - startsAt);
        const finalTileIndex = request.sequence[request.sequence.length - 1] ?? tokenIndexRef.current;

        if (now < startsAt && !isReducedMotion) {
          const anticipationProgress = Math.max(0, Math.min(1, (now - request.requestedAt) / request.holdMs));
          const anticipationScale = 1 + Math.sin(anticipationProgress * Math.PI) * 0.08;
          playerPiece.root.scale.set(1.06, 1 / anticipationScale, 1.06);
        } else if (motionElapsedMs >= totalMotionMs) {
          const finalPosition = getIsland5TokenGroundPosition(tileTransforms, finalTileIndex);
          if (!activeTokenMotion.finalImpactTriggered) {
            triggerFinalSettle(finalTileIndex, request.landingImpact, now);
            activeTokenMotion.finalImpactTriggered = true;
            onTokenHopRef.current?.(finalTileIndex);
          }
          playerPiece.root.position.set(...finalPosition);
          playerPiece.root.scale.set(1, 1, 1);
          playerPiece.root.rotation.z = 0;
          playerPiece.shadow.position.set(finalPosition[0], finalPosition[1] + 0.012, finalPosition[2]);
          playerPiece.shadow.scale.set(1, 1, 1);
          playerPiece.shadowMaterial.opacity = 0.32;
          appliedTokenSnapIndex = finalTileIndex;
          activeTokenMotion = null;
          controls.enabled = true;
          // Keep the landed framing while the player is actively rolling.
          // A later, cancellable idle drift restores the full island view;
          // another roll or a manual gesture cancels it before any zoom-out.
          idleOverviewAt = now + ISLAND_3D_IDLE_OVERVIEW_DELAY_MS;
          onTokenLandRef.current?.(finalTileIndex);
          logIslandRunEntryDebug('island5_3d_hop_complete', {
            requestId: request.id,
            hopCount: request.sequence.length,
            endTile: finalTileIndex,
            landingImpact: request.landingImpact,
          });
          onHopSequenceCompleteRef.current?.();
        } else {
          let hopIndex = 0;
          let hopStartedAt = 0;
          while (
            hopIndex < request.durationsMs.length - 1
            && motionElapsedMs >= hopStartedAt + request.durationsMs[hopIndex]
          ) {
            hopStartedAt += request.durationsMs[hopIndex];
            hopIndex += 1;
          }
          const hopDurationMs = request.durationsMs[hopIndex] ?? 1;
          const rawHopProgress = Math.max(0, Math.min(1, (motionElapsedMs - hopStartedAt) / hopDurationMs));
          const easedHopProgress = 1 - Math.pow(1 - rawHopProgress, 2.35);
          const fromTilePosition = hopIndex === 0
            ? fromPosition
            : getIsland5TokenGroundPosition(tileTransforms, request.sequence[hopIndex - 1] ?? finalTileIndex);
          const destinationTileIndex = request.sequence[hopIndex] ?? finalTileIndex;
          const destinationTilePosition = getIsland5TokenGroundPosition(
            tileTransforms,
            destinationTileIndex,
          );
          const isFinalHop = hopIndex === request.sequence.length - 1;
          const specialArcBoost = isFinalHop && request.landingImpact === 'special' && !isReducedMotion
            ? ISLAND_3D_SPECIAL_HOP_ARC_BOOST
            : 0;
          const hazardArcAdjustment = isFinalHop && request.landingImpact === 'hazard' && !isReducedMotion
            ? -0.08
            : 0;
          const baseTokenPosition = getIsland3DTokenHopPosition(
            fromTilePosition,
            destinationTilePosition,
            easedHopProgress,
          );
          const airborne = Math.sin(Math.PI * rawHopProgress);
          const tokenPosition: readonly [number, number, number] = [
            baseTokenPosition[0],
            baseTokenPosition[1] + airborne * (specialArcBoost + hazardArcAdjustment),
            baseTokenPosition[2],
          ];
          playerPiece.root.rotation.z = 0;

          if (!isFinalHop && rawHopProgress >= 0.9 && activeTokenMotion.lastTriggeredHopIndex < hopIndex) {
            triggerTileImpact(destinationTileIndex, 0.42, now);
            activeTokenMotion.lastTriggeredHopIndex = hopIndex;
            onTokenHopRef.current?.(destinationTileIndex);
            logIslandRunEntryDebug('island5_3d_hop_tile', {
              requestId: request.id,
              hopIndex,
              tileIndex: destinationTileIndex,
            });
          }
          if (isFinalHop && rawHopProgress >= 0.94 && !activeTokenMotion.finalImpactTriggered) {
            triggerFinalSettle(destinationTileIndex, request.landingImpact, now);
            activeTokenMotion.finalImpactTriggered = true;
            onTokenHopRef.current?.(destinationTileIndex);
          }

          const groundX = fromTilePosition[0] + (destinationTilePosition[0] - fromTilePosition[0]) * easedHopProgress;
          const groundZ = fromTilePosition[2] + (destinationTilePosition[2] - fromTilePosition[2]) * easedHopProgress;

          playerPiece.root.position.set(...tokenPosition);
          playerPiece.root.rotation.y = Math.atan2(
            destinationTilePosition[0] - fromTilePosition[0],
            destinationTilePosition[2] - fromTilePosition[2],
          );
          playerPiece.root.scale.set(1 - airborne * 0.08, 1 + airborne * 0.14, 1 - airborne * 0.08);
          playerPiece.shadow.position.set(groundX, fromTilePosition[1] + 0.012, groundZ);
          playerPiece.shadow.scale.setScalar(1 - airborne * 0.38);
          playerPiece.shadowMaterial.opacity = 0.32 - airborne * 0.18;

          const desiredTarget = new THREE.Vector3(tokenPosition[0], 0.72, tokenPosition[2]);
          const desiredCamera = desiredTarget.clone().add(new THREE.Vector3(...ISLAND_3D_TOKEN_FOLLOW_OFFSET));
          const followAlpha = 1 - Math.exp(-frameDeltaSeconds * 6.4);
          controls.target.lerp(desiredTarget, followAlpha);
          camera.position.lerp(desiredCamera, followAlpha);
          camera.lookAt(controls.target);
        }
      }

      if (transition) {
        const rawProgress = Math.min(1, (now - transition.startedAt) / transition.durationMs);
        const eased = CAMERA_EASE(rawProgress);
        const inverse = 1 - eased;
        camera.position.set(
          inverse * inverse * transition.fromPosition.x + 2 * inverse * eased * transition.controlPosition.x + eased * eased * transition.toPosition.x,
          inverse * inverse * transition.fromPosition.y + 2 * inverse * eased * transition.controlPosition.y + eased * eased * transition.toPosition.y,
          inverse * inverse * transition.fromPosition.z + 2 * inverse * eased * transition.controlPosition.z + eased * eased * transition.toPosition.z,
        );
        controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        camera.lookAt(controls.target);
        if (rawProgress >= 1) transition = null;
      }
      if (
        idleOverviewAt !== null
        && now >= idleOverviewAt
        && !activeTokenMotion
        && !activeTour
        && !activeProfiler
        && !caretakerEncounterOpenRef.current
      ) {
        idleOverviewAt = null;
        applyPreset('overview', ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE);
      }
      controls.update();
      renderer.render(scene, camera);

      if (activeTour && now >= activeTour.nextStepAt) {
        const nextStepIndex = activeTour.stepIndex + 1;
        const nextStep = ISLAND_CAMERA_TOUR_STEPS[nextStepIndex];
        if (!nextStep) {
          activeTour = null;
          controls.enabled = true;
          setTourStatus('idle');
        } else {
          const nextPreset = getIsland5CameraPreset(nextStep.preset);
          applyPreset(nextStep.preset);
          activeTour = {
            stepIndex: nextStepIndex,
            nextStepAt: now + nextPreset.durationMs + nextStep.holdMs,
          };
        }
      }

      if (activeProfiler) {
        activeProfiler.maxDrawCalls = Math.max(activeProfiler.maxDrawCalls, renderer.info.render.calls);
        activeProfiler.maxTriangles = Math.max(activeProfiler.maxTriangles, renderer.info.render.triangles);
        if (activeProfiler.lastFrameAt > 0) {
          activeProfiler.frameTimesMs.push(now - activeProfiler.lastFrameAt);
        }
        activeProfiler.lastFrameAt = now;
        const profileElapsedMs = now - activeProfiler.startedAt;
        const nextCamera = profilerChoreography[activeProfiler.choreographyIndex];
        if (nextCamera && profileElapsedMs >= nextCamera.atMs) {
          applyPreset(nextCamera.preset);
          activeProfiler.choreographyIndex += 1;
        }
        if (now - activeProfiler.lastProgressAt >= 250) {
          setProfilerProgress(Math.min(100, Math.round((profileElapsedMs / ISLAND_3D_PROFILE_DURATION_MS) * 100)));
          activeProfiler.lastProgressAt = now;
        }
        if (profileElapsedMs >= ISLAND_3D_PROFILE_DURATION_MS) {
          const summary = summarizeIsland3DPerformance(activeProfiler.frameTimesMs, qualityProfile.id);
          const rendererSize = renderer.getSize(new THREE.Vector2());
          const gl = renderer.getContext();
          const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info') as {
            UNMASKED_VENDOR_WEBGL: number;
            UNMASKED_RENDERER_WEBGL: number;
          } | null;
          const report: PilotProfileReport = {
            ...summary,
            profileSchema: 'island-3d-m7-v1',
            deviceLabel: deviceLabelRef.current.trim() || `${deviceSignals.platform || 'Unknown device'} · ${deviceSignals.screenWidth || '?'}×${deviceSignals.screenHeight || '?'}`,
            capturedAt: new Date().toISOString(),
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            maxDrawCalls: activeProfiler.maxDrawCalls,
            maxTriangles: activeProfiler.maxTriangles,
            geometryBudgetPass: activeProfiler.maxDrawCalls <= 175 && activeProfiler.maxTriangles <= 180_000,
            rendererWidth: Math.round(rendererSize.x * renderer.getPixelRatio()),
            rendererHeight: Math.round(rendererSize.y * renderer.getPixelRatio()),
            gpuVendor: String(gl.getParameter(debugRendererInfo?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR)),
            gpuRenderer: String(gl.getParameter(debugRendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)),
            deviceSignals,
          };
          if (!report.geometryBudgetPass && report.rating === 'pass') report.rating = 'review';
          activeProfiler = null;
          controls.enabled = true;
          setProfilerProgress(100);
          setProfileReport(report);
          setProfilerStatus('complete');
          setProfilerNotice(`${report.rating.toUpperCase()} against ${qualityProfile.id} timing and geometry targets.`);
          console.info(`[island-${islandNumber}-3d-profile]`, report);
        }
      }

      frameCount += 1;
      const metricElapsedMs = now - metricStartedAt;
      if (metricElapsedMs >= 750) {
        const size = renderer.getSize(new THREE.Vector2());
        setMetrics({
          fps: Math.round((frameCount * 1000) / metricElapsedMs),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          width: Math.round(size.x * renderer.getPixelRatio()),
          height: Math.round(size.y * renderer.getPixelRatio()),
        });
        frameCount = 0;
        metricStartedAt = now;
      }
    };
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      if (activeTour) {
        setTourStatus('idle');
      }
      if (activeProfiler) {
        setProfilerStatus('cancelled');
        setProfilerProgress(0);
        setProfilerNotice('Profile cancelled because the 3D scene changed.');
      }
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      controls.removeEventListener('start', cancelTransition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cameraPoseSnapshotRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      };
      controls.dispose();
      timer.dispose();
      if (encounterCaretaker) {
        scene.remove(encounterCaretaker.root);
        encounterCaretaker.dispose();
        encounterCaretaker = null;
      }
      scene.remove(boardCaretaker.root);
      boardCaretaker.dispose();
      disposeScene(scene);
      evidenceOverrideMaterial?.dispose();
      tileGeometry.dispose();
      tileMaterials.forEach((material) => material.dispose());
      moonveilTileEdgeGeometry?.dispose();
      moonveilTileEdgeMaterials.forEach((material) => material.dispose());
      abyssalTileEdgeGeometry?.dispose();
      abyssalTileEdgeMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      applyPresetRef.current = () => undefined;
      applyControlledCameraFocusRef.current = () => undefined;
      startTourRef.current = () => undefined;
      stopTourRef.current = () => undefined;
      startProfilerRef.current = () => undefined;
    };
  }, [buildLevel, deviceSignals, islandNumber, isAbyssalPearlKingdom, isCelestialSkyKingdom, isFirstLightKingdom, isFrostmoonHaven, isMoonveilNexus, isReducedMotion, isSunshoreAtoll, landmarkBuildLevelsKey, qualityProfile, resolvedTileMap, resolvedWorldSourceNumber, tileRewardMapKey]);

  return (
    <section
      className={`island-5-three-pilot${isEmbedded ? ' island-5-three-pilot--embedded' : ''}`}
      data-quality={qualityProfile.id}
      data-camera-preset={activePreset}
      aria-label={isEmbedded ? `Interactive 3D Island ${islandNumber}` : `Actual 3D Island ${islandNumber} pilot`}
    >
      <canvas key={`${islandNumber}-${resolvedWorldSourceNumber}-${qualityProfile.id}`} ref={canvasRef} className="island-5-three-pilot__canvas" aria-label={`Interactive 3D ${worldName} island`} />
      {!isEmbedded ? (
        <>
          <div className="island-5-three-pilot__topline">
            <div>
              <span>ACTUAL 3D PILOT</span>
              <strong>{worldName} · Island {String(islandNumber).padStart(3, '0')}</strong>
            </div>
            <label>
              Quality
              <select disabled={profilerStatus === 'running' || tourStatus === 'running'} value={qualitySelection} onChange={(event) => setQualitySelection(event.target.value as Island3DQualitySelection)}>
                <option value="auto">Auto ({qualityProfile.id})</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

      <div className="island-5-three-pilot__metrics" aria-label="3D renderer performance">
        <span><strong>{metrics.fps}</strong> FPS</span>
        <span><strong>{metrics.drawCalls}</strong> calls</span>
        <span><strong>{Math.round(metrics.triangles / 1000)}k</strong> tris</span>
        <span><strong>{metrics.width}×{metrics.height}</strong> px</span>
      </div>

      <section
        className="island-5-three-pilot__profiler"
        data-status={profilerStatus}
        data-rating={profileReport?.rating ?? 'pending'}
        aria-label="30 second device profiler"
        aria-live="polite"
      >
        <div className="island-5-three-pilot__profiler-heading">
          <span>DEVICE PROFILE</span>
          <strong>{profileReport?.rating.toUpperCase() ?? (profilerStatus === 'running' ? `${profilerProgress}%` : '30 SEC')}</strong>
        </div>
        {profilerStatus === 'running' ? (
          <div className="island-5-three-pilot__profiler-progress" aria-label={`${profilerProgress}% complete`}>
            <span style={{ width: `${profilerProgress}%` }} />
          </div>
        ) : null}
        {!profileReport ? (
          <input
            aria-label="Device model"
            disabled={profilerStatus === 'running' || tourStatus === 'running'}
            maxLength={48}
            placeholder="Device model (optional)"
            value={deviceLabel}
            onChange={(event) => {
              deviceLabelRef.current = event.target.value;
              setDeviceLabel(event.target.value);
            }}
          />
        ) : null}
        {profileReport ? (
          <dl>
            <div><dt>Average</dt><dd>{profileReport.averageFps} FPS</dd></div>
            <div><dt>P95 frame</dt><dd>{profileReport.p95FrameMs} ms</dd></div>
            <div><dt>Worst</dt><dd>{profileReport.worstFrameMs} ms</dd></div>
            <div><dt>Slow</dt><dd>{profileReport.slowFramePercent}%</dd></div>
            <div><dt>Max calls</dt><dd>{profileReport.maxDrawCalls}</dd></div>
            <div><dt>Max tris</dt><dd>{Math.round(profileReport.maxTriangles / 1_000)}k</dd></div>
          </dl>
        ) : null}
        <div className="island-5-three-pilot__profiler-actions">
          <button type="button" disabled={profilerStatus === 'running' || tourStatus === 'running'} onClick={() => startProfilerRef.current()}>
            {profileReport ? 'Run again' : profilerStatus === 'cancelled' ? 'Restart profile' : 'Run 30s profile'}
          </button>
          {profileReport ? <button type="button" onClick={() => void shareProfileReport()}>Share report</button> : null}
        </div>
        <p>{profilerNotice}</p>
        {reportShareNotice ? <p className="island-5-three-pilot__profiler-share-notice">{reportShareNotice}</p> : null}
      </section>

      <div className="island-5-three-pilot__camera-controls" aria-label="3D camera presets">
        <div className="island-5-three-pilot__camera-row">
          {ISLAND_5_CAMERA_PRESETS.slice(0, 4).map((preset) => (
            <button key={preset.id} type="button" disabled={profilerStatus === 'running' || tourStatus === 'running'} aria-pressed={activePreset === preset.id} onClick={() => applyPresetRef.current(preset.id)}>
              {preset.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Focus a landmark"
          disabled={profilerStatus === 'running' || tourStatus === 'running'}
          value={['boss', 'hatchery', 'habit', 'wisdom', 'event'].includes(activePreset) ? activePreset : ''}
          onChange={(event) => event.target.value && applyPresetRef.current(event.target.value as Island5CameraPresetId)}
        >
          <option value="">Focus landmark…</option>
          {ISLAND_5_CAMERA_PRESETS.slice(4).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {isFirstLightKingdom
                ? ISLAND_1_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_1_LANDMARK_LABELS]
                : isCelestialSkyKingdom
                  ? ISLAND_2_CELESTIAL_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_2_CELESTIAL_LANDMARK_LABELS]
                  : isFrostmoonHaven
                    ? ISLAND_3_FROSTMOON_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_3_FROSTMOON_LANDMARK_LABELS]
                    : isSunshoreAtoll
                      ? ISLAND_5_SUNSHORE_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_5_SUNSHORE_LANDMARK_LABELS]
                      : isMoonveilNexus
                        ? ISLAND_6_MOONVEIL_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_6_MOONVEIL_LANDMARK_LABELS]
                        : isAbyssalPearlKingdom
                          ? ISLAND_7_UNDERWATER_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_7_UNDERWATER_LANDMARK_LABELS]
                          : preset.label}
            </option>
          ))}
        </select>
        <button
          className="island-5-three-pilot__tour-button"
          type="button"
          disabled={profilerStatus === 'running'}
          aria-pressed={tourStatus === 'running'}
          onClick={() => (tourStatus === 'running' ? stopTourRef.current() : startTourRef.current())}
        >
          {tourStatus === 'running' ? 'Stop cinematic tour' : 'Play cinematic tour'}
        </button>
        <p>{tourStatus === 'running' ? 'Touring the island and all five landmarks…' : 'Drag to orbit · pinch to zoom · tap a building to focus'}</p>
      </div>
        </>
      ) : null}

      {error ? <div className="island-5-three-pilot__error" role="alert">{error}</div> : null}
    </section>
  );
}
