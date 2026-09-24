import { sunshoreCreatureClearanceLift } from './SunshoreCreatureClearance';
import { createSunshoreArenaRetraction } from './SunshoreArenaRetraction';
import { createSunshoreLandmarkMagicRuntime } from './Island5SunshoreV2Architecture';
import { resolveSunshoreCreatureCelebration, type CelebrationPoint } from '../services/islandRunCreatureCelebration';
import { createSunshoreCelebrationSmoke } from './SunshoreCreatureCelebrationSmoke';
import { createLandmarkAttentionVisual } from './landmarkAttentionVisual';
import type { LandmarkAttention } from '../services/islandRunLandmarkAttention';
import { resolveIslandRunFeatureAccess } from '../services/islandRunFeatureAccess';
import {FIRST_ARRIVAL_WELCOME_TIME,advanceFirstArrivalTime} from '../services/islandRunFirstArrival';
import type {VisibleTechnologyFragment} from '../services/islandTechnologyFragmentVisuals';
import {createIsland001FirstArrival} from './Island001FirstArrival';
import { useEffect, useMemo, useRef, useState } from 'react';
import './Island19WonderRide.css';
import {createAssemblySeaGeometry} from './Island1V2Terrain';
import { createWonderRideCameraFilter } from './island19WonderRideCamera';
import * as THREE from 'three';
import { choosePawnCamera, shortestPawnAngle, pawnSightBlocked, completedPawnHops, type PawnObstacle, type PawnPoint } from './islandPawnPresentation';
import { createIslandPawnTileTrail } from './islandPawnTileTrail';
import { resolveIsland18CompassCeremonyCamera } from './island18CompassCeremonyCamera';
import { JUNGLE_COMPASS_CEREMONY_DURATION_MS, JUNGLE_COMPASS_REDUCED_CEREMONY_DURATION_MS } from '../services/islandRunJungleMissionPresentation';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createIsland1AnimatedBatches, createIslandRigidSurfaceBatches } from './Island1AnimatedBatches';
import { createCelestialPlantRuntimeBatches } from './Island2CelestialV2PlantRuntimeBatch';
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
  ISLAND_3D_AMBIENT_POV_INTERVAL_MS,
  ISLAND_3D_BOARD_POV_IDLE_DELAY_MS,
  ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS,
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
  shouldFadeCentralLandmarkForCamera,
  type Island3DDeviceSignals,
  type Island3DPerformanceSummary,
  type Island3DQuality,
  type Island3DQualityProfile,
  type Island3DQualitySelection,
  type Island5AmbiencePoint,
  type Island5CameraPresetId,
  type Island5LandmarkDefinition,
  type Island5LandmarkId,
  type Island5TileTransform,
} from './island5ThreePilotContract';
import { createCaretakerMaster, type CaretakerModel } from './CaretakerThreeModel';
import { createCrownDrifterModel } from './CrownDrifterThreeModel';
import { createIsland4OpeningPalaceModel } from './Island4OpeningPalaceThreeModel';
import { createPalaceBalconyPlanting } from './PalaceBalconyPlanting';
import { createPalaceBalconyGardenAssembly } from './PalaceBalconyGardenAssembly';
import { createOpeningGamesCeremonyThree } from './OpeningGamesCeremonyThree';
import { sampleOpeningCeremony, type OpeningCeremonyPlayback } from '../services/islandRunOpeningCeremonyPresentation';
import { createRobotFamilyModel } from './RobotFamilyThreeModel';
import { createRobotConstructionTheatre } from './RobotConstructionTheatre';
import { createIslandConstructionCommissioningFx } from './IslandConstructionCommissioningFx';
import {
  prepareIslandConstructionLevelDelta,
  type IslandConstructionLevelDelta,
} from './IslandConstructionLevelDelta';
import {
  applyIslandConstructionAuthoring,
  resolveIslandLandmarkConstructionProfile,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';
import type { IslandRunConstructionPresentation } from '../services/islandRunConstructionPresentation';
import {
  resolveIslandRunArenaCreatureMotion,
  shouldPresentIslandRunArenaCreature,
} from '../services/islandRunArenaCreaturePresentation';
import {
  resolveIslandRun3DWorldRoute,
  type IslandRunAuthored3DWorldSource,
} from '../services/islandRun3DWorldRouting';
import { JUNGLE_EXPEDITION_ISLAND_NUMBER } from '../services/islandRunSignatureMissions';
import { areIsland001V2AssetsReady, preloadIsland001V2Assets } from './Island1V2Assets';
import {
  buildIsland1Landmark,
  createIsland1LivingAmbience,
  createIsland1WorldMaterials,
  ISLAND_1_LANDMARK_LABELS,
  ISLAND_1_OCEAN_SURFACE_Y,
  ISLAND_1_WORLD_NAME,
} from './Island1ThreeWorld';
import {
  buildIsland1AssemblyLandmark,
  createIsland1AssemblyCraterTerrain,
  createIsland1AssemblyCraterRuntime,
  ISLAND_1_ASSEMBLY_CRATER_NAME,
  ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS,
  type Island1AssemblyCraterPresentation,
} from './Island1AssemblyCraterThreeWorld';
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
  type Island2CelestialRedockingPresentation,
} from './Island2CelestialThreeWorld';
import {
  buildIsland3FrostmoonLandmark,
  createIsland3FrostmoonLivingAmbience,
  createIsland3FrostmoonMaterials,
  ISLAND_3_FROSTMOON_LANDMARK_LABELS,
  ISLAND_3_FROSTMOON_WORLD_NAME,
} from './Island3FrostmoonThreeWorld';
import {
  createIsland4DriftwoodLivingAmbience,
  createIsland4DriftwoodMaterials,
  ISLAND_4_DRIFTWOOD_LANDMARK_LABELS,
  ISLAND_4_DRIFTWOOD_WORLD_NAME,
  upgradeIsland4LegacyLandmark,
  createIsland4LandmarkPalette,
  compactIsland4Landmark,
} from './Island4DriftwoodThreeWorld';
import type { FrostwellIceworksPresentation } from './FrostwellIceworksThreeModel';
import { createMoonwellThermalAnimator, type MoonwellThermalPresentation } from './Island3MoonwellThermalPresentation';
import {
  buildIsland6MoonveilLandmark,
  createIsland6MoonveilLivingAmbience,
  createIsland6MoonveilMaterials,
  ISLAND_6_MOONVEIL_LANDMARK_LABELS,
  ISLAND_6_MOONVEIL_WORLD_NAME,
} from './Island6MoonveilThreeWorld';
import {
  buildIsland7UnderwaterLandmark,
  collectIsland7RuntimePartManifest,
  createIsland7UnderwaterLivingAmbience,
  createIsland7UnderwaterMaterials,
  registerIsland7RuntimePart,
  ISLAND_7_UNDERWATER_LANDMARK_LABELS,
  ISLAND_7_UNDERWATER_WORLD_NAME,
} from './Island7UnderwaterThreeWorld';
import {
  buildIsland8EverblossomLandmark,
  collectIsland8RuntimePartManifest,
  createIsland8EverblossomLivingAmbience,
  createIsland8EverblossomMaterials,
  registerIsland8RuntimePart,
  ISLAND_8_EVERBLOSSOM_LANDMARK_LABELS,
  ISLAND_8_EVERBLOSSOM_WORLD_NAME,
} from './Island8EverblossomThreeWorld';
import {
  buildIsland9HeartshaftLandmark,
  collectIsland9RuntimePartManifest,
  createIsland9HeartshaftLivingAmbience,
  createIsland9HeartshaftMaterials,
  registerIsland9RuntimePart,
  ISLAND_9_HEARTSHAFT_LANDMARK_LABELS,
  ISLAND_9_HEARTSHAFT_WORLD_NAME,
} from './Island9HeartshaftThreeWorld';
import {
  buildIsland10RootheartLandmark,
  collectIsland10RuntimePartManifest,
  createIsland10RootheartLivingAmbience,
  createIsland10RootheartMaterials,
  registerIsland10RuntimePart,
  ISLAND_10_ROOTHEART_LANDMARK_LABELS,
  ISLAND_10_ROOTHEART_WORLD_NAME,
  type Island10RootheartPowerworksPresentation,
} from './Island10RootheartThreeWorld';
import {
  buildIsland12SunkenSandsLandmark,
  collectIsland12PerformanceInventory,
  collectIsland12RuntimePartManifest,
  createIsland12SunkenSandsLivingAmbience,
  createIsland12SunkenSandsMaterials,
  registerIsland12RuntimePart,
  ISLAND_12_SUNKEN_SANDS_LANDMARK_LABELS,
  ISLAND_12_SUNKEN_SANDS_WORLD_NAME,
  type Island12SunkenSandsTreasurePresentation,
} from './Island12SunkenSandsThreeWorld';
import {
  buildIsland13CactusCanyonLandmark,
  collectIsland13RuntimePartManifest,
  createIsland13CactusCanyonBackdrop,
  createIsland13CactusCanyonLivingAmbience,
  createIsland13CactusCanyonMaterials,
  getIsland13SpiralBlastFocus,
  registerIsland13RuntimePart,
  ISLAND_13_CACTUS_CANYON_LANDMARK_LABELS,
  ISLAND_13_CACTUS_CANYON_WORLD_NAME,
  type Island13CactusCanyonSpiralPresentation,
  type Island13TrainRideView,
} from './Island13CactusCanyonThreeWorld';
import {
  buildIsland22FishermansVillageLandmark,
  createIsland22FishermansVillageLivingAmbience,
  createIsland22FishermansVillageMaterials,
  ISLAND_22_BOARD_PRESENTATION_Y_OFFSET,
  ISLAND_22_FISHERMANS_VILLAGE_WORLD_NAME,
  type Island22FishingInteractionPresentation,
} from './Island22FishermansVillageThreeWorld';
import type { Island22WaterDragonPresentation } from './Island22WaterDragonMission';
import {
  buildIsland14HoneycombLandmark,
  createIsland14HoneycombBackdrop,
  createIsland14HoneycombLivingAmbience,
  createIsland14HoneycombMaterials,
  ISLAND_14_HONEYCOMB_LANDMARK_LABELS,
  ISLAND_14_HONEYCOMB_WORLD_NAME,
  type Island14GreatHoneyfallPresentation,
} from './Island14HoneycombKingdomThreeWorld';
import {
  buildIsland18JungleExpeditionLandmark,
  collectIsland18RuntimePartManifest,
  createIsland18JungleExpeditionLivingAmbience,
  createIsland18JungleExpeditionMaterials,
  getIsland18EmeraldZenithFocus,
  ISLAND_18_JUNGLE_EXPEDITION_LANDMARK_LABELS,
  ISLAND_18_JUNGLE_EXPEDITION_WORLD_NAME,
  ISLAND_18_WEATHER_CYCLE_SECONDS,
  type Island18LivingCompassPresentation,
} from './Island18JungleExpeditionThreeWorld';
import {
  buildIsland20LavaLabyrinthLandmark,
  collectIsland20RuntimePartManifest,
  createIsland20LavaLabyrinthLivingAmbience,
  createIsland20LavaLabyrinthMaterials,
  ISLAND_20_LAVA_LABYRINTH_LANDMARK_LABELS,
  ISLAND_20_LAVA_LABYRINTH_WORLD_NAME,
  type Island20SkiffNavigationPresentation,
} from './Island20LavaLabyrinthThreeWorld';
import {
  createIsland19CoasterCarnivalSourceLoftWorld,
  type Island19SourceLoftWorldRuntime,
} from './Island19CoasterCarnivalSourceLoftWorld';
import {
  createIsland19CoasterCarnivalCircuitFWorld,
  ISLAND_19_CIRCUIT_F_WORLD_NAME,
  type Island19CircuitFRidePhase,
  type Island19CircuitFWagon,
  type Island19CircuitFWorldRuntime,
} from './Island19CoasterCarnivalCircuitFWorld';
import {
  createIsland19CoasterCarnivalCircuitGBoardPlaza,
  ISLAND_19_CIRCUIT_G_BOARD_NAME,
  type Island19CircuitGBoardRuntime,
} from './Island19CoasterCarnivalCircuitGBoardPlaza';
import {
  createIsland19CoasterCarnivalHybridOverlay,
  ISLAND_19_HYBRID_PHONE_PLATE,
  ISLAND_19_HYBRID_WORLD_NAME,
  type Island19HybridOverlayRuntime,
} from './Island19CoasterCarnivalHybridOverlay';
import {
  buildIsland15CrystalGlacierLandmark,
  collectIsland15RuntimePartManifest,
  createIsland15CrystalGlacierBackdrop,
  createIsland15CrystalGlacierLivingAmbience,
  createIsland15CrystalGlacierMaterials,
  createIsland15UnifiedCrystalPalaceAsset,
  registerIsland15RuntimePart,
  ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS,
  ISLAND_15_CRYSTAL_GLACIER_WORLD_NAME,
} from './Island15CrystalGlacierThreeWorld';
import {
  bindIsland15CrystalPalaceRuntime,
  ISLAND_15_CRYSTAL_PALACE_NODE_NAMES,
  ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS,
  resolveIsland15CrystalPalaceRoom,
  type Island15CrystalPalaceBuildLevels,
  type Island15CrystalPalaceFocusMode,
  type Island15CrystalPalaceRuntime,
} from './island15/Island15CrystalPalaceRuntime';
import {
  ISLAND_15_CAMERA_PRESET_IDS,
  ISLAND_15_CAMERA_TOUR_STEPS,
  ISLAND_15_PALACE_ROOM_ORDER,
  ISLAND_15_R17_CAMERA_AUTHORITY,
  fitIsland15ExteriorCameraPose,
  hashIsland15CameraPose,
  isIsland15ExteriorCameraPreset,
  isIsland15PalaceRoomPreset,
  resolveIsland15CameraPose,
  resolveIsland15CameraPoseSafety,
  resolveIsland15OrbitControlLimits,
  resolveIsland15PortalEntrySequence,
  resolveIsland15PortalExitSequence,
  resolveIsland15QuietDriftPose,
  resolveIsland15RoomNavigationHallPose,
  type Island15CameraEnvelope,
  type Island15CameraOrbitMode,
  type Island15CameraPose,
  type Island15CameraPoint,
  type Island15PalaceFramingBounds,
  type Island15PalaceRoomPreset,
} from './island15/Island15CameraDirector';
import {
  buildIsland17TitansRestLandmark,
  collectIsland17RuntimePartManifest,
  createIsland17TitansRestLivingAmbience,
  createIsland17TitansRestMaterials,
  registerIsland17RuntimePart,
  ISLAND_17_TITANS_REST_LANDMARK_LABELS,
  ISLAND_17_TITANS_REST_WORLD_NAME,
} from './Island17TitansRestThreeWorld';
import { createIslandRunTileRewardThreeObjects } from './IslandRunTileRewardThreeObjects';
import {
  createIslandStagedRestorationThreePresentation,
  type IslandStagedRestorationPresentation,
} from './IslandStagedRestorationThreePresentation';

export type BuildLevel = 0 | 1 | 2 | 3;
export type Island5LandmarkBuildLevels = Partial<Record<Island5LandmarkDefinition['id'], BuildLevel>>;

type Island15PalaceEntryPhase =
  | 'idle'
  | 'approach'
  | 'stair-crest'
  | 'threshold'
  | 'crossing'
  | 'boss-wonder'
  | 'boss-settle'
  | 'boss-exit-align'
  | 'narthex-return'
  | 'threshold-return'
  | 'exterior-settle'
  | 'navigating'
  | 'reveal';

export function resolveIsland15CrystalPalaceBuildLevels(
  fallbackLevel: BuildLevel,
  landmarkLevels?: Island5LandmarkBuildLevels,
): Island15CrystalPalaceBuildLevels {
  return {
    hatchery: landmarkLevels?.hatchery ?? fallbackLevel,
    habit: landmarkLevels?.habit ?? fallbackLevel,
    event: landmarkLevels?.event ?? fallbackLevel,
    wisdom: landmarkLevels?.wisdom ?? fallbackLevel,
    boss: landmarkLevels?.boss ?? fallbackLevel,
  };
}

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
  visibleTechnologyFragments?: readonly VisibleTechnologyFragment[];
  trafficLightCharge?: number;
  firstArrivalWaitForWelcome?: boolean;
  firstArrivalWelcomeComplete?: boolean;
  onFirstArrivalWelcome?: () => void;
  firstArrivalPreviewTime?: number;
  firstArrivalActive?: boolean;
  firstArrivalSkip?: boolean;
  onFirstArrivalComplete?: () => void;
  onFirstArrivalBeat?: (beat: string) => void;
  /** Runtime identity: owns arena cadence, story, progression, and persistence. */
  islandNumber?: number;
  /** Visual-only authored geometry/material pack selected by the routing manifest. */
  worldSourceNumber?: IslandRunAuthored3DWorldSource;
  buildLevel: BuildLevel;
  landmarkBuildLevels?: Island5LandmarkBuildLevels;
  landmarkProgress?: ReadonlyArray<{ id: string; title: string; percent: number; status: string; attention?: LandmarkAttention }>;
  landedLandmarkId?: string;
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
  onTokenLand?: (tileIndex: number, origin?: { viewportX: number; viewportY: number }) => void;
  onLandmarkClick?: (landmarkId: Island5LandmarkDefinition['id']) => void;
  signatureMissionPresentation?: FrostwellIceworksPresentation;
  moonwellThermalPresentation?: MoonwellThermalPresentation;
  onMoonwellThermalPhaseChange?: (phase: string) => void;
  onMoonwellThermalComplete?: () => void;
  celestialRedockingPresentation?: Island2CelestialRedockingPresentation;
  rootheartPowerworksPresentation?: Island10RootheartPowerworksPresentation;
  sunkenSandsTreasurePresentation?: Island12SunkenSandsTreasurePresentation;
  cactusCanyonSpiralPresentation?: Island13CactusCanyonSpiralPresentation;
  firstLightAssemblyCraterPresentation?: Island1AssemblyCraterPresentation;
  greatHoneyfallPresentation?: Island14GreatHoneyfallPresentation;
  stagedRestorationPresentation?: IslandStagedRestorationPresentation;
  island20SkiffNavigation?: Island20SkiffNavigationPresentation;
  onIsland20SkiffRunComplete?: () => void;
  fishermansFishingPresentation?: Island22WaterDragonPresentation & {
    fishingInteraction?: Island22FishingInteractionPresentation;
  };
  onSignatureMissionClick?: () => void;
  onAssemblyMeetingComplete?: () => void;
  caretakerEncounterOpen?: boolean;
  onCaretakerClick?: () => void;
  interactionPaused?: boolean;
  /** Read-only build-modal choreography. It cannot mutate gameplay state. */
  constructionPresentation?: IslandRunConstructionPresentation | null;
  arenaBattlePresentation?: IslandRunArenaBattlePresentation | null;
  /** Successful max-throw presentation cue; no gameplay authority. */
  arenaCelebrationSequence?: number;
  openingCeremonyPlayback?: OpeningCeremonyPlayback | null;
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
  fov?: number;
}

interface CameraAuthoringPose extends CameraPoseSnapshot {
  islandNumber: number;
  preset: Island5CameraPresetId | 'manual';
  fov: number;
  zoom: number;
  aspect: number;
  /** Dev-only inspection data; never participates in mission state. */
  signatureMissionSocketActive?: boolean;
  signatureMissionMetersDrilled?: number;
}

interface ActiveTileImpact {
  startedAt: number;
  strength: number;
}

const ISLAND_1_ASSEMBLY_POV_TOUR_STEPS: readonly {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  durationMs: number;
  holdMs: number;
}[] = [
  { position: [0, 2.55, 21], target: [0, -2.55, -0.7], durationMs: 1_250, holdMs: 850 },
  { position: [-9.6, 2.2, 10.8], target: [0, -3.25, 0], durationMs: 1_300, holdMs: 720 },
  { position: [0, -2.85, 7.2], target: [0, -3.05, -3.2], durationMs: 1_150, holdMs: 900 },
  { position: [4.8, -2.0, 3.6], target: [0, -3.1, -2.8], durationMs: 1_100, holdMs: 850 },
  { position: [9.7, 2.5, 10.4], target: [0, -3.2, 0], durationMs: 1_300, holdMs: 720 },
  { position: [0, 12.8, 11.6], target: [0, -3.05, 0], durationMs: 1_400, holdMs: 1_000 },
];

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

function createTileBorderMeshGeometry(tileGeometry: THREE.BufferGeometry, borderRadius = 0.012): THREE.BufferGeometry {
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
    const segment = new THREE.CylinderGeometry(borderRadius, borderRadius, length, 5, 1, false);
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

function createRootheartTileDetailNetwork(tileTransforms: readonly Island5TileTransform[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_10_ROOTHEART_TILE_DETAIL_NETWORK';
  root.userData.presentationOnly = true;

  const seamMaterial = new THREE.MeshStandardMaterial({
    color: 0x765033,
    roughness: 0.9,
    metalness: 0.02,
  });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x769d50,
    roughness: 0.62,
    metalness: 0.02,
    emissive: 0x2a5b2c,
    emissiveIntensity: 0.26,
  });
  const dowelMaterial = new THREE.MeshStandardMaterial({
    color: 0xa77d3e,
    roughness: 0.44,
    metalness: 0.46,
    emissive: 0x4a2a08,
    emissiveIntensity: 0.08,
  });
  const seamGeometry = new THREE.BoxGeometry(0.018, 0.011, 0.62);
  const glowGeometry = new THREE.BoxGeometry(0.018, 0.012, 0.16);
  const dowelGeometry = new THREE.CylinderGeometry(0.021, 0.021, 0.018, 7);
  const seamInstances = new THREE.InstancedMesh(seamGeometry, seamMaterial, tileTransforms.length * 2);
  const glowTransforms = tileTransforms.filter((transform) => !transform.isKeyTile && transform.index % 3 === 1);
  const glowInstances = new THREE.InstancedMesh(glowGeometry, glowMaterial, glowTransforms.length * 2);
  const dowelInstances = new THREE.InstancedMesh(dowelGeometry, dowelMaterial, tileTransforms.length * 2);
  seamInstances.name = 'ISLAND_10_HEARTWOOD_PLANK_SEAMS';
  glowInstances.name = 'ISLAND_10_GLOWROOT_BIOLUMINESCENT_INLAYS';
  dowelInstances.name = 'ISLAND_10_TILE_BRASS_DOWELS';
  const baseMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  let seamCursor = 0;
  let glowCursor = 0;
  let dowelCursor = 0;
  tileTransforms.forEach((transform) => {
    position.set(transform.position[0], transform.position[1] + 0.087, transform.position[2]);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotationYRad);
    baseMatrix.compose(position, quaternion, scale);
    [-0.19, 0.19].forEach((offset) => {
      localMatrix.makeTranslation(offset, 0, 0);
      seamInstances.setMatrixAt(seamCursor, baseMatrix.clone().multiply(localMatrix));
      seamCursor += 1;
      localMatrix.makeTranslation(offset, 0.015, 0.22);
      dowelInstances.setMatrixAt(dowelCursor, baseMatrix.clone().multiply(localMatrix));
      dowelCursor += 1;
    });
    if (!transform.isKeyTile && transform.index % 3 === 1) {
      [-0.28, 0.28].forEach((edgeOffset) => {
        localMatrix.makeTranslation(0, 0.006, edgeOffset);
        glowInstances.setMatrixAt(glowCursor, baseMatrix.clone().multiply(localMatrix));
        glowCursor += 1;
      });
    }
  });
  seamInstances.instanceMatrix.needsUpdate = true;
  glowInstances.instanceMatrix.needsUpdate = true;
  dowelInstances.instanceMatrix.needsUpdate = true;
  root.add(seamInstances, glowInstances, dowelInstances);
  return root;
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
type Island13TrainRidePhase = 'idle' | Island13TrainRideView;
type Island19WonderRidePhase = 'idle' | Island19CircuitFRidePhase;

const ISLAND_13_TRAIN_RIDE_VIEWS: readonly Island13TrainRideView[] = ['driver', 'rear', 'side'];
const ISLAND_13_TRAIN_RIDE_PHASE_MS = 15_000;

interface PilotProfileReport extends Island3DPerformanceSummary {
  profileSchema: 'island-3d-m7-v1';
  deviceLabel: string;
  capturedAt: string;
  drawCalls: number;
  triangles: number;
  maxDrawCalls: number;
  maxTriangles: number;
  geometryBudgetPass: boolean;
  measuredRefreshFps: number;
  refreshNormalizedP95Ms: number;
  refreshNormalizedTimingPass: boolean;
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
  const reducedMotionEvidence = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('island3dReducedMotion') === '1';
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
    prefersReducedMotion: reducedMotionEvidence
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function readInitialQualitySelection(): Island3DQualitySelection {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 'auto';
  const requested = new URLSearchParams(window.location.search).get('island3dQuality');
  return requested === 'low' || requested === 'medium' || requested === 'high' ? requested : 'auto';
}

function readInitialRootheartPowerworksPresentation(): Island10RootheartPowerworksPresentation {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { buildStage: 0 };
  const requested = Number(new URLSearchParams(window.location.search).get('rootheartPowerStage') ?? '3');
  const buildStage = Number.isFinite(requested) ? Math.max(0, Math.min(3, Math.floor(requested))) : 3;
  return { buildStage: buildStage as 0 | 1 | 2 | 3, transitionProgress: 1 };
}

function readInitialGreatHoneyfallPresentation(): Island14GreatHoneyfallPresentation {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { activatedReservoirs: 0, constructionSequence: 0 };
  const requested = Number(new URLSearchParams(window.location.search).get('honeyfallMissionStage') ?? '0');
  const activatedReservoirs = Number.isFinite(requested)
    ? Math.max(0, Math.min(4, Math.floor(requested)))
    : 0;
  return {
    activatedReservoirs: activatedReservoirs as 0 | 1 | 2 | 3 | 4,
    constructionSequence: new URLSearchParams(window.location.search).get('honeyfallReplay') === '1' ? 1 : 0,
  };
}

function setLandmarkId(object: THREE.Object3D, id: Island5LandmarkDefinition['id']) {
  object.traverse((child) => {
    child.userData.landmarkId = id;
  });
}

function createLandmarkHitTarget(definition: Island5LandmarkDefinition) {
  const radius = definition.id === 'boss' ? 1.72 : 1.32;
  const height = definition.id === 'boss' ? 4.8 : 3.5;
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, height, 12);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const target = new THREE.Mesh(geometry, material);
  target.name = `ISLAND_SHARED_${definition.id.toUpperCase()}_HIT_TARGET`;
  target.position.set(definition.position[0], definition.position[1] + height / 2, definition.position[2]);
  target.userData.landmarkId = definition.id;
  target.userData.landmarkHitTarget = true;
  target.renderOrder = -100;
  return target;
}

function resolveLandmarkIdFromIntersection(object: THREE.Object3D | undefined): Island5CameraPresetId | null {
  let current = object;
  while (current) {
    const landmarkId = current.userData.landmarkId as Island5CameraPresetId | undefined;
    if (landmarkId) return landmarkId;
    current = current.parent ?? undefined;
  }
  return null;
}

function addShadowFlags(object: THREE.Object3D, castShadow: boolean) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = castShadow;
      child.receiveShadow = true;
    }
  });
}

/** The central landmark fades independently during an occluded focus shot.
 * Island builders intentionally share material palettes, so clone only this
 * root's materials before changing presentation opacity. */
function makeLandmarkMaterialsIndependent(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
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

function createFirstLightSunriseBackdrop() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#6fb8d3');
  sky.addColorStop(0.46, '#b9e1df');
  sky.addColorStop(0.72, '#e9ead4');
  sky.addColorStop(1, '#f6c99b');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const sunrise = context.createRadialGradient(128, 96, 3, 128, 96, 96);
  sunrise.addColorStop(0, 'rgba(255, 245, 194, 0.96)');
  sunrise.addColorStop(0.18, 'rgba(255, 225, 159, 0.7)');
  sunrise.addColorStop(1, 'rgba(255, 188, 122, 0)');
  context.fillStyle = sunrise;
  context.fillRect(0, 0, canvas.width, 240);
  context.fillStyle = 'rgba(255, 247, 205, 0.92)';
  context.beginPath();
  context.ellipse(128, 96, 9, 14, 0, 0, Math.PI * 2);
  context.fill();
  const cloudBands = [176, 226, 282];
  cloudBands.forEach((y, bandIndex) => {
    const cloud = context.createLinearGradient(0, y, canvas.width, y + 30);
    cloud.addColorStop(0, 'rgba(255,255,255,0)');
    cloud.addColorStop(0.22, `rgba(255,250,235,${0.07 + (bandIndex % 2) * 0.03})`);
    cloud.addColorStop(0.72, `rgba(255,243,223,${0.045 + (bandIndex % 3) * 0.018})`);
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = cloud;
    context.beginPath();
    context.ellipse(128 + Math.sin(bandIndex * 1.8) * 34, y, 126, 12 + (bandIndex % 2) * 6, 0, 0, Math.PI * 2);
    context.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'ISLAND_1_FIRST_LIGHT_SUNRISE_BACKDROP';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createSunkenSandsDesertBackdrop() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#c99858');
  sky.addColorStop(0.38, '#ddb978');
  sky.addColorStop(0.72, '#ecd09a');
  sky.addColorStop(1, '#f2dfb9');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // The visible Sunken Sands sun is a world-space sprite, not part of the
  // camera background. Keeping the backdrop directionless prevents the sun
  // from following the player when they orbit the island.
  const lateDayLift = context.createLinearGradient(0, 0, canvas.width, 0);
  lateDayLift.addColorStop(0, 'rgba(255,218,157,0.02)');
  lateDayLift.addColorStop(0.7, 'rgba(255,235,190,0.08)');
  lateDayLift.addColorStop(1, 'rgba(255,225,170,0.03)');
  context.fillStyle = lateDayLift;
  context.fillRect(0, 0, canvas.width, 210);
  const hazeBands = [286, 340, 396];
  hazeBands.forEach((y, index) => {
    const haze = context.createLinearGradient(0, y - 12, 0, y + 18);
    haze.addColorStop(0, 'rgba(250,227,186,0)');
    haze.addColorStop(0.5, `rgba(255,239,206,${0.08 + index * 0.025})`);
    haze.addColorStop(1, 'rgba(250,227,186,0)');
    context.fillStyle = haze;
    context.fillRect(0, y - 12, canvas.width, 30);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'ISLAND_12_SUNKEN_SANDS_DESERT_BACKDROP';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
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
  reef: THREE.Material;
  grass: THREE.MeshStandardMaterial;
  bridge: THREE.MeshStandardMaterial;
  coral: THREE.MeshStandardMaterial;
  coralGlass: THREE.MeshPhysicalMaterial;
  pearl: THREE.MeshStandardMaterial;
  mintGlow: THREE.MeshStandardMaterial;
  waterGlow: THREE.MeshStandardMaterial;
}

export function createPilotMaterials(quality: Island3DQuality, worldSourceNumber: IslandRunAuthored3DWorldSource = 5): PilotMaterials {
  const detail = CROWN_CITADEL_DETAIL_PROFILES[quality];
  const stoneMap = createCitadelPatternTexture(detail.textureSize, 'reef-stone');
  const roofMap = createCitadelPatternTexture(detail.textureSize, 'roof-tile');
  const isFirstLightKingdom = worldSourceNumber === 1 || worldSourceNumber === 11;
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
    ? 0x918d84
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
    ? 0x6fa34a
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
    reef: isFirstLightKingdom
      ? new THREE.MeshLambertMaterial({ color: reefColor, map: stoneMap })
      : new THREE.MeshBasicMaterial({ color: reefColor }),
    grass: new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.88 }),
    bridge: new THREE.MeshStandardMaterial({ color: bridgeColor, roughness: 0.78 }),
    purpleRoof: new THREE.MeshStandardMaterial({ color: roofColor, map: roofMap, roughness: 0.42, metalness: 0.12 }),
    purpleRoofBright: new THREE.MeshStandardMaterial({ color: roofBrightColor, map: roofMap, roughness: 0.32, metalness: 0.18 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf1c866, roughness: 0.32, metalness: 0.58, emissive: 0x3d2504, emissiveIntensity: 0.18 }),
    deepWindow: new THREE.MeshStandardMaterial({ color: 0x172849, roughness: 0.2, metalness: 0.15, emissive: 0x164e70, emissiveIntensity: 0.52 }),
    aquaGlass: new THREE.MeshPhysicalMaterial({ color: 0x8effe7, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.82, transmission: isCelestialSkyKingdom ? 0 : 0.22, thickness: 0.35 }),
    voiceGlow: new THREE.MeshStandardMaterial({ color: 0xa8fff0, roughness: 0.12, emissive: 0x38d9cd, emissiveIntensity: 1.05 }),
    banner: new THREE.MeshStandardMaterial({ color: 0x50309d, roughness: 0.55, side: THREE.DoubleSide }),
    reefAccent: new THREE.MeshStandardMaterial({ color: 0xff7da9, roughness: 0.5, emissive: 0x5c1735, emissiveIntensity: 0.22 }),
    pearlAccent: new THREE.MeshStandardMaterial({ color: 0xfff6db, roughness: 0.16, metalness: 0.16, emissive: 0x50b9b2, emissiveIntensity: 0.42 }),
    coral: new THREE.MeshStandardMaterial({ color: 0xe972a4, roughness: 0.52, emissive: 0x49142d, emissiveIntensity: 0.16 }),
    coralGlass: new THREE.MeshPhysicalMaterial({ color: 0xc288e8, roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.68, transmission: isCelestialSkyKingdom ? 0 : 0.18, thickness: 0.7 }),
    pearl: new THREE.MeshStandardMaterial({ color: 0xfff3da, roughness: 0.18, metalness: 0.22, emissive: 0x7a5d91, emissiveIntensity: 0.16 }),
    mintGlow: new THREE.MeshStandardMaterial({ color: 0x8df5d5, roughness: 0.2, emissive: 0x23836f, emissiveIntensity: 0.72 }),
    waterGlow: new THREE.MeshStandardMaterial({ color: 0x61cbed, roughness: 0.22, metalness: 0.12, emissive: 0x125a7a, emissiveIntensity: 0.48 }),
  };
}

export function compactOpeningPalaceParts(building: THREE.Group) {
  // Preserve the semantic groups while batching their static, funded surfaces.
  for (const child of building.children) if (child instanceof THREE.Group) {
    compactStaticGeometry(child, child.name);
  }
}

export function buildLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: PilotMaterials,
  worldSourceNumber: IslandRunAuthored3DWorldSource = 5,
  options: IslandConstructionFactoryOptions = {},
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(...definition.position);
  if (worldSourceNumber === 4) materials = createIsland4LandmarkPalette(materials, definition.id);

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
    // Visual-only replacement for source 004. Campaign ordinal, saved progress
    // and ceremony eligibility remain owned by the existing gameplay services.
    const usesOpeningPalace = worldSourceNumber === 4 && definition.id === 'boss';
    const building = definition.id === 'boss'
      ? usesOpeningPalace
        ? createIsland4OpeningPalaceModel({ level: builtLevel, quality, materials })
        : createCrownCitadelModel({ level: builtLevel, quality, materials, compact: worldSourceNumber !== 4 && !options.constructionPreview })
      : definition.id === 'hatchery'
        ? createHatcheryLandmark(builtLevel, quality, materials)
        : definition.id === 'habit'
          ? createHabitLandmark(builtLevel, quality, materials)
          : definition.id === 'wisdom'
            ? createWisdomLandmark(builtLevel, quality, materials)
            : createEventLandmark(builtLevel, quality, materials);
    if (definition.id === 'boss' && !usesOpeningPalace) {
      const scale = options.constructionPreview
        ? CROWN_CITADEL_LEVEL_SCALES[2]
        : CROWN_CITADEL_LEVEL_SCALES[builtLevel];
      building.scale.set(scale[0], scale[1], scale[2]);
    } else {
      building.scale.setScalar(1);
    }
    if (worldSourceNumber === 4 && !usesOpeningPalace) {
      upgradeIsland4LegacyLandmark(building, definition, level, quality, createIsland4DriftwoodMaterials());
    }
    if (usesOpeningPalace && import.meta.env?.DEV && typeof window !== 'undefined') {
      const plantingMode = new URLSearchParams(window.location.search).get('islandPalacePlanting');
      if (plantingMode === 'bay' || plantingMode === 'assembly') {
        const planting = plantingMode === 'assembly'
          ? createPalaceBalconyGardenAssembly(builtLevel, quality, materials.limestoneBright)
          : createPalaceBalconyPlanting(quality, materials.limestoneBright);
        planting.position.y = .24;
        building.add(planting);
      }
      const proofMode = new URLSearchParams(window.location.search).get('islandPalaceProof');
      if (proofMode === 'clay' || proofMode === 'normals') {
        const proofMaterial = proofMode === 'normals'
          ? new THREE.MeshNormalMaterial()
          : new THREE.MeshStandardMaterial({ color: 0xb8b6b0, roughness: .9 });
        building.traverse(node => { if (node instanceof THREE.Mesh) node.material = proofMaterial; });
      }
    }
    if (options.constructionPreview === 'target') {
      applyIslandConstructionAuthoring({
        root: building,
        worldSourceNumber,
        landmarkId: definition.id,
        quality,
        includeTemporaryRig: true,
      });
    }
    if (usesOpeningPalace && !options.constructionPreview) {
      compactOpeningPalaceParts(building);
    } else if (worldSourceNumber === 4 && !options.constructionPreview) {
      compactIsland4Landmark(building, definition.id);
    } else if (definition.id !== 'boss' && !options.constructionPreview) {
      compactStaticGeometry(building, `ISLAND5_${definition.id.toUpperCase()}`);
    }
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
  animate: (elapsed: number, reducedMotion?: boolean) => void;
  dispose?: () => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3, reducedMotion?: boolean) => void;
  updateSignatureMission?: (presentation: FrostwellIceworksPresentation) => void;
  updateStagedRestoration?: (presentation: IslandStagedRestorationPresentation, immediate?: boolean) => void;
  missionHitTarget?: THREE.Object3D;
  registerRedockingLandmark?: (landmarkId: Island5LandmarkDefinition['id'], root: THREE.Object3D) => void;
  updateRedocking?: (presentation: Island2CelestialRedockingPresentation, immediate?: boolean) => void;
  consumeShadowUpdate?: () => boolean;
  getSignatureMissionCameraPose?: () => { position: THREE.Vector3; target: THREE.Vector3 } | null;
  setSignatureMissionCinematicActive?: (active: boolean) => void;
  updatePowerworksStage?: (presentation: Island10RootheartPowerworksPresentation) => void;
  updateTreasureProgress?: (
    presentation: Island12SunkenSandsTreasurePresentation,
    instant?: boolean,
  ) => void;
  updateSpiralRail?: (presentation: Island13CactusCanyonSpiralPresentation) => void;
  setGreatHoneyfallStage?: (stage: number, replay?: boolean) => void;
  setLivingCompassStage?: (presentation: Island18LivingCompassPresentation, replay?: boolean) => void;
  setIronSkiffStage?: (stage: number, replay?: boolean) => void;
  updateIronSkiffNavigation?: (presentation: Island20SkiffNavigationPresentation) => void;
  consumeIronSkiffCompletion?: () => boolean;
  updateWaterDragonMission?: (presentation: Island22WaterDragonPresentation) => void;
  updateFishingInteraction?: (presentation: Island22FishingInteractionPresentation) => void;
  getFishingInteractionCameraPose?: () => { position: THREE.Vector3; target: THREE.Vector3; shake: number };
  getWaterDragonMissionCameraPose?: () => {
    position: THREE.Vector3;
    target: THREE.Vector3;
    shake: number;
    fov: number;
  };
  getTrainRidePose?: (
    view: Island13TrainRideView,
  ) => { position: THREE.Vector3; target: THREE.Vector3 } | null;
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
  ocean: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>,
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
  ocean: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>,
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

function collectIslandThreeScenePerformanceInventory(scene: THREE.Object3D) {
  type Totals = {
    renderables: number;
    triangles: number;
    estimatedCalls: number;
    logicalInstances: number;
    shadowCasters: number;
    transparentRenderables: number;
  };
  const emptyTotals = (): Totals => ({
    renderables: 0,
    triangles: 0,
    estimatedCalls: 0,
    logicalInstances: 0,
    shadowCasters: 0,
    transparentRenderables: 0,
  });
  const addTotals = (target: Totals, source: Totals) => {
    target.renderables += source.renderables;
    target.triangles += source.triangles;
    target.estimatedCalls += source.estimatedCalls;
    target.logicalInstances += source.logicalInstances;
    target.shadowCasters += source.shadowCasters;
    target.transparentRenderables += source.transparentRenderables;
  };
  const summarize = (root: THREE.Object3D) => {
    const totals = emptyTotals();
    root.traverseVisible((node) => {
      if (!(node instanceof THREE.Mesh
        || node instanceof THREE.InstancedMesh
        || node instanceof THREE.Points
        || node instanceof THREE.LineSegments)) return;
      if (!node.geometry.attributes.position?.count) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      const geometryGroups = 'groups' in node.geometry && node.geometry.groups.length > 0
        ? node.geometry.groups.length
        : 1;
      totals.renderables += 1;
      if (node instanceof THREE.Mesh) totals.triangles += (node.geometry.index?.count ?? node.geometry.attributes.position?.count ?? 0) / 3 * (node instanceof THREE.InstancedMesh ? node.count : 1);
      totals.estimatedCalls += Array.isArray(node.material)
        ? Math.max(1, Math.min(materials.length, geometryGroups))
        : 1;
      totals.logicalInstances += node instanceof THREE.InstancedMesh ? node.count : 1;
      if (node.castShadow) totals.shadowCasters += 1;
      if (materials.some((material) => material.transparent)) totals.transparentRenderables += 1;
    });
    return totals;
  };
  const classify = (root: THREE.Object3D) => {
    if (root.userData.tileIndex !== undefined || root.name.includes('TILE_SURFACE_BATCH')) return 'canonical-route-tiles';
    if (root.name === 'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS') return 'canonical-tile-rewards';
    if (root.name === 'ISLAND_12_SUNKEN_SANDS_WORLD_ROOT') return 'island-authored-world';
    if (root.name.includes('PLAYER_TOKEN')) return 'player-token';
    if (root.name.includes('CARETAKER')) return 'caretaker';
    if (root.name.includes('ROUTE_GLOW')) return 'route-glow';
    return root.name || root.type;
  };
  const familyTotals = new Map<string, Totals>();
  const topLevel = scene.children
    .filter((root) => root.visible)
    .map((root) => {
      const totals = summarize(root);
      const family = classify(root);
      const accumulated = familyTotals.get(family) ?? emptyTotals();
      addTotals(accumulated, totals);
      familyTotals.set(family, accumulated);
      return { name: root.name || root.type, family, ...totals };
    })
    .filter((entry) => entry.renderables > 0)
    .sort((left, right) => right.estimatedCalls - left.estimatedCalls || left.name.localeCompare(right.name));
  const families = [...familyTotals.entries()]
    .map(([family, totals]) => ({ family, ...totals }))
    .filter((entry) => entry.renderables > 0)
    .sort((left, right) => right.estimatedCalls - left.estimatedCalls || left.family.localeCompare(right.family));
  const totals = families.reduce((result, family) => {
    addTotals(result, family);
    return result;
  }, emptyTotals());
  return { topLevel, families, totals };
}

export default function Island5ThreePilot({
  visibleTechnologyFragments = [], trafficLightCharge = 0,
  firstArrivalWaitForWelcome = false, firstArrivalWelcomeComplete = false, onFirstArrivalWelcome,
  firstArrivalPreviewTime, firstArrivalActive = false, firstArrivalSkip = false, onFirstArrivalComplete, onFirstArrivalBeat,
  openingCeremonyPlayback = null,
  islandNumber = 5,
  worldSourceNumber,
  buildLevel,
  landmarkBuildLevels,
  landmarkProgress,
  landedLandmarkId,
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
  signatureMissionPresentation = { metersDrilled: 0, built: false, constructionSequence: 0 },
  moonwellThermalPresentation = { heated: false, running: false, sequence: 0 },
  onMoonwellThermalPhaseChange,
  onMoonwellThermalComplete,
  celestialRedockingPresentation = { completedRolls: 20, targetRolls: 20, dockedPlatformCount: 4 },
  rootheartPowerworksPresentation = readInitialRootheartPowerworksPresentation(),
  sunkenSandsTreasurePresentation = { revealProgress: 1, ready: true, claimed: false },
  cactusCanyonSpiralPresentation = { segmentsExcavated: 16, maxSegments: 16, completed: true },
  firstLightAssemblyCraterPresentation = { chargesDetonated: 0, targetCharges: 10, completed: false },
  greatHoneyfallPresentation = readInitialGreatHoneyfallPresentation(),
  stagedRestorationPresentation,
  island20SkiffNavigation = { active: false, steering: 0, throttle: 0, sequence: 0 },
  onIsland20SkiffRunComplete,
  fishermansFishingPresentation = {
    fishCaughtKg: 0,
    previewElapsedSeconds: 0,
    fishingInteraction: {
      active: false,
      phase: 'off',
      catchKind: 'nothing',
      countdown: null,
      pullProgress: 0,
      tension: 0,
      reelPulse: 0,
    },
  },
  onSignatureMissionClick,
  onAssemblyMeetingComplete,
  caretakerEncounterOpen = false,
  onCaretakerClick,
  interactionPaused = false,
  constructionPresentation = null,
  arenaBattlePresentation = null,
  arenaCelebrationSequence = 0,
}: Island5ThreePilotProps) {
  const arenaCrownPreviewUntilRef = useRef(0);
  const creatureCelebrationRequestRef = useRef(0);
  const lastCelebrationPropRef = useRef(arenaCelebrationSequence);
  useEffect(() => {
    if (arenaCelebrationSequence !== lastCelebrationPropRef.current) {
      lastCelebrationPropRef.current = arenaCelebrationSequence;
      if (islandNumber === 5) creatureCelebrationRequestRef.current += 1;
    }
  }, [arenaCelebrationSequence, islandNumber]);
  const tilePresentationRef = useRef({fragments:visibleTechnologyFragments,trafficLightCharge});
  tilePresentationRef.current = {fragments:visibleTechnologyFragments,trafficLightCharge};
  const firstArrivalCompletedRef = useRef(false);
  const firstArrivalRestartRef = useRef(0);
  useEffect(() => {
    if (firstArrivalActive) { firstArrivalCompletedRef.current = false; firstArrivalRestartRef.current += 1; }
  }, [firstArrivalActive]);
  const firstArrivalRef = useRef({waitForWelcome:firstArrivalWaitForWelcome, welcomeComplete:firstArrivalWelcomeComplete, onWelcome:onFirstArrivalWelcome, previewTime:firstArrivalPreviewTime, active:firstArrivalActive, skip:firstArrivalSkip, onComplete:onFirstArrivalComplete, onBeat:onFirstArrivalBeat});
  firstArrivalRef.current = {waitForWelcome:firstArrivalWaitForWelcome, welcomeComplete:firstArrivalWelcomeComplete, onWelcome:onFirstArrivalWelcome, previewTime:firstArrivalPreviewTime, active:firstArrivalActive, skip:firstArrivalSkip, onComplete:onFirstArrivalComplete, onBeat:onFirstArrivalBeat};
  const resolvedWorldSourceNumber = worldSourceNumber
    ?? resolveIslandRun3DWorldRoute(islandNumber)?.worldSourceNumber
    ?? 5;
  // Source 011 is the preserved pre-Assembly-Crater First Light world. It
  // deliberately shares source 001's authored geometry/material dependency;
  // runtime Island 001 receives its new centre through a separate overlay.
  const isFirstLightKingdom = resolvedWorldSourceNumber === 1 || resolvedWorldSourceNumber === 11;
  const isAssemblyCraterFirstLight = resolvedWorldSourceNumber === 1 && islandNumber === 1;
  const isCelestialSkyKingdom = resolvedWorldSourceNumber === 2;
  const isFrostmoonHaven = resolvedWorldSourceNumber === 3;
  const isDriftwoodIsle = resolvedWorldSourceNumber === 4;
  const isSunshoreAtoll = resolvedWorldSourceNumber === 5;
  const isMoonveilNexus = resolvedWorldSourceNumber === 6;
  const isAbyssalPearlKingdom = resolvedWorldSourceNumber === 7;
  const isEverblossomKingdom = resolvedWorldSourceNumber === 8;
  const isHeartshaftCrucible = resolvedWorldSourceNumber === 9;
  const isRootheartCanopyCity = resolvedWorldSourceNumber === 10;
  const isSunkenSands = resolvedWorldSourceNumber === 12;
  const isCactusCanyon = resolvedWorldSourceNumber === 13;
  const isFishermansVillage = resolvedWorldSourceNumber === 22;
  // Honeycomb Kingdom owns a dedicated procedural world factory and evidence route.
  const isHoneycombKingdom = resolvedWorldSourceNumber === 14;
  const isJungleExpedition = resolvedWorldSourceNumber === 18;
  const isLavaLabyrinth = resolvedWorldSourceNumber === 20;
  const isCoasterCarnival = resolvedWorldSourceNumber === 19;
  const isCircuitGBoardPreviewEnabled = isCoasterCarnival
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island19CircuitGBoard') === '1';
  const isCircuitFPreviewEnabled = isCoasterCarnival
    && !isCircuitGBoardPreviewEnabled
    && typeof window !== 'undefined'
    // d022: user approved the current all-angle island for the live release.
    // Keep an explicit diagnostic rollback, but ordinary players need no flag.
    && new URLSearchParams(window.location.search).get('island19CircuitF') !== '0';
  const isIsland19BoardFocusEvidenceEnabled = isCoasterCarnival
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island19BoardFocus') === '1';
  const isCrystalGlacier = resolvedWorldSourceNumber === 15;
  const isTitansRest = resolvedWorldSourceNumber === 17;
  const worldName = isAssemblyCraterFirstLight
    ? ISLAND_1_ASSEMBLY_CRATER_NAME
    : isFirstLightKingdom
    ? ISLAND_1_WORLD_NAME
    : isCelestialSkyKingdom
      ? ISLAND_2_CELESTIAL_WORLD_NAME
      : isFrostmoonHaven
        ? ISLAND_3_FROSTMOON_WORLD_NAME
        : isDriftwoodIsle
          ? ISLAND_4_DRIFTWOOD_WORLD_NAME
        : isSunshoreAtoll
          ? ISLAND_5_SUNSHORE_WORLD_NAME
          : isMoonveilNexus
            ? ISLAND_6_MOONVEIL_WORLD_NAME
            : isAbyssalPearlKingdom
              ? ISLAND_7_UNDERWATER_WORLD_NAME
              : isEverblossomKingdom
                ? ISLAND_8_EVERBLOSSOM_WORLD_NAME
                : isHeartshaftCrucible
                  ? ISLAND_9_HEARTSHAFT_WORLD_NAME
                  : isRootheartCanopyCity
                    ? ISLAND_10_ROOTHEART_WORLD_NAME
                    : isSunkenSands
                      ? ISLAND_12_SUNKEN_SANDS_WORLD_NAME
                      : isCactusCanyon
                        ? ISLAND_13_CACTUS_CANYON_WORLD_NAME
                      : isHoneycombKingdom
                        ? ISLAND_14_HONEYCOMB_WORLD_NAME
                        : isCrystalGlacier
                          ? ISLAND_15_CRYSTAL_GLACIER_WORLD_NAME
                      : isJungleExpedition
                        ? ISLAND_18_JUNGLE_EXPEDITION_WORLD_NAME
                        : isLavaLabyrinth
                          ? ISLAND_20_LAVA_LABYRINTH_WORLD_NAME
                        : isCoasterCarnival
                          ? isCircuitGBoardPreviewEnabled
                            ? ISLAND_19_CIRCUIT_G_BOARD_NAME
                            : isCircuitFPreviewEnabled
                              ? ISLAND_19_CIRCUIT_F_WORLD_NAME
                              : ISLAND_19_HYBRID_WORLD_NAME
                      : isTitansRest
                        ? ISLAND_17_TITANS_REST_WORLD_NAME
                        : isFishermansVillage
                          ? ISLAND_22_FISHERMANS_VILLAGE_WORLD_NAME
              : 'Crown of Tides';
  const isEmbedded = presentation === 'embedded';
  const isIsland15ProductAcceptanceCapture = isCrystalGlacier
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island15ProductAcceptance') === '1';
  const useIsland15ProductPresentation = isEmbedded || isIsland15ProductAcceptanceCapture;
  const [isEvidenceCapture, setIsEvidenceCapture] = useState(() => (
    typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island3dEvidence') === '1'
  ));
  const [isMapStrippedEvidenceEnabled, setIsMapStrippedEvidenceEnabled] = useState(() => (
    typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island3dMapStripped') === '1'
  ));
  const lavaLookdevEvidenceTime = (() => {
    if (!isLavaLabyrinth || typeof window === 'undefined') return null;
    const rawValue = new URLSearchParams(window.location.search).get('island20LavaTime');
    if (rawValue === null || rawValue.trim() === '') return null;
    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0 ? value : null;
  })();
  const [qualitySelection, setQualitySelection] = useState<Island3DQualitySelection>(readInitialQualitySelection);
  const [runtimeQualityCap, setRuntimeQualityCap] = useState<Island3DQuality | null>(null);
  const sustainedQualityMissesRef = useRef(0);
  const [archiveInteriorOpen, setArchiveInteriorOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('archiveInterior') === '1');
  const archiveInteriorOpenRef = useRef(archiveInteriorOpen);
  archiveInteriorOpenRef.current = archiveInteriorOpen;
  const [activePreset, setActivePreset] = useState<Island5CameraPresetId | 'manual'>(() => (
    isIsland19BoardFocusEvidenceEnabled
      ? 'survey'
      : 'overview'
  ));
  const [island15PalaceEntryPhase, setIsland15PalaceEntryPhase] = useState<Island15PalaceEntryPhase>('idle');
  const [isCameraAuthoring, setIsCameraAuthoring] = useState(() => (
    typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('cameraAuthoring') === '1'
  ));
  const [cameraAuthoringPose, setCameraAuthoringPose] = useState<CameraAuthoringPose | null>(null);
  const [cameraAuthoringNotice, setCameraAuthoringNotice] = useState('');
  const [metrics, setMetrics] = useState<PilotMetrics>({ fps: 0, drawCalls: 0, triangles: 0, width: 0, height: 0 });
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [tourStatus, setTourStatus] = useState<CameraTourStatus>('idle');
  const [profilerStatus, setProfilerStatus] = useState<ProfilerStatus>('idle');
  const [profilerProgress, setProfilerProgress] = useState(0);
  const [profileReport, setProfileReport] = useState<PilotProfileReport | null>(null);
  const [profilerNotice, setProfilerNotice] = useState('Keep this tab visible during the run.');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [reportShareNotice, setReportShareNotice] = useState('');
  const [trainRidePhase, setTrainRidePhase] = useState<Island13TrainRidePhase>('idle');
  const [trainRideSecondsRemaining, setTrainRideSecondsRemaining] = useState(15);
  const [wonderRidePhase, setWonderRidePhase] = useState<Island19WonderRidePhase>('idle');
  const [wonderRideWagon, setWonderRideWagon] = useState<Island19CircuitFWagon>('front');
  const [wonderRideSecondsRemaining, setWonderRideSecondsRemaining] = useState(0);
  const [wonderRideTelemetry, setWonderRideTelemetry] = useState({ progress: 0, pace: 'Boarding' });
  const [error, setError] = useState<string | null>(null);
  const [rendererRetryVersion, setRendererRetryVersion] = useState(0);
  const [assemblyAssetsReady, setAssemblyAssetsReady] = useState(areIsland001V2AssetsReady);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkProgressRef = useRef(landmarkProgress);
  landmarkProgressRef.current = landmarkProgress;
  const selectedLandmarkIdRef = useRef<string | undefined>(undefined);
  const landedLandmarkIdRef = useRef(landedLandmarkId);
  landedLandmarkIdRef.current = landedLandmarkId;
  const labelMovingRef = useRef(false);
  labelMovingRef.current = isRolling || Boolean(pendingHopSequence);
  if (labelMovingRef.current) selectedLandmarkIdRef.current = undefined;
  const landmarkLabelRefs = useRef(new Map<string, HTMLButtonElement>());
  const wonderRideTransitionVeilRef = useRef<HTMLDivElement>(null);
  const wonderRideFrontButtonRef = useRef<HTMLButtonElement>(null);
  const wonderRideMiddleButtonRef = useRef<HTMLButtonElement>(null);
  const wonderRideExitButtonRef = useRef<HTMLButtonElement>(null);
  const previousWonderRidePhaseRef = useRef<Island19WonderRidePhase>('idle');
  const buildLevelRef = useRef(buildLevel);
  buildLevelRef.current = buildLevel;
  const landmarkBuildLevelsRef = useRef(landmarkBuildLevels);
  landmarkBuildLevelsRef.current = landmarkBuildLevels;
  const island15CrystalPalaceRuntimeRef = useRef<Island15CrystalPalaceRuntime | null>(null);
  const constructionPresentationRef = useRef<IslandRunConstructionPresentation | null>(constructionPresentation);
  constructionPresentationRef.current = constructionPresentation;
  const applyPresetRef = useRef<(id: Island5CameraPresetId, durationScale?: number) => void>(() => undefined);
  useEffect(() => {
    if (isDriftwoodIsle && activePreset === 'wisdom') applyPresetRef.current('wisdom');
    // The active preset itself is not a dependency: this only reacts to opening
    // or closing the roof; camera selection already applies its own preset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveInteriorOpen, isDriftwoodIsle]);
  const applyEvidenceOrbitRef = useRef<(degrees: number) => void>(() => undefined);
  const exitIsland15PalaceRef = useRef<() => void>(() => undefined);
  const previousCameraFocusPresetRef = useRef<Island5CameraPresetId | null>(null);
  const previousCameraFocusTransitionRef = useRef<'standard' | 'quick'>('standard');
  const previousCameraOverviewRequestVersionRef = useRef(cameraOverviewRequestVersion);
  const cameraFocusRequestVersionRef = useRef(0);
  const controlledCameraFocusRequestRef = useRef<ControlledCameraFocusRequest | null>(null);
  const applyControlledCameraFocusRef = useRef<(request: ControlledCameraFocusRequest) => void>(() => undefined);
  const appliedControlledCameraFocusVersionRef = useRef(0);
  const cameraPoseSnapshotRef = useRef<CameraPoseSnapshot | null>(null);
  const cameraAuthoringEnabledRef = useRef(isCameraAuthoring);
  const setCameraAuthoringModeRef = useRef<(enabled: boolean) => void>(() => undefined);
  const startTourRef = useRef<() => void>(() => undefined);
  const stopTourRef = useRef<() => void>(() => undefined);
  const startProfilerRef = useRef<() => void>(() => undefined);
  const exitTrainRideRef = useRef<() => void>(() => undefined);
  const advanceTrainRideRef = useRef<() => void>(() => undefined);
  const startWonderRideRef = useRef<(wagon: Island19CircuitFWagon) => void>(() => undefined);
  const exitWonderRideRef = useRef<() => void>(() => undefined);
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
  const signatureMissionPresentationRef = useRef(signatureMissionPresentation);
  signatureMissionPresentationRef.current = signatureMissionPresentation;
  const moonwellThermalPresentationRef = useRef(moonwellThermalPresentation);
  moonwellThermalPresentationRef.current = moonwellThermalPresentation;
  const moonwellThermalPhaseChangeRef = useRef(onMoonwellThermalPhaseChange);
  moonwellThermalPhaseChangeRef.current = onMoonwellThermalPhaseChange;
  const moonwellThermalCompleteRef = useRef(onMoonwellThermalComplete);
  moonwellThermalCompleteRef.current = onMoonwellThermalComplete;
  const celestialRedockingPresentationRef = useRef(celestialRedockingPresentation);
  const openingCeremonyPlaybackRef = useRef(openingCeremonyPlayback);
  openingCeremonyPlaybackRef.current = openingCeremonyPlayback;
  celestialRedockingPresentationRef.current = celestialRedockingPresentation;
  const rootheartPowerworksPresentationRef = useRef(rootheartPowerworksPresentation);
  rootheartPowerworksPresentationRef.current = rootheartPowerworksPresentation;
  const sunkenSandsTreasurePresentationRef = useRef(sunkenSandsTreasurePresentation);
  sunkenSandsTreasurePresentationRef.current = sunkenSandsTreasurePresentation;
  const cactusCanyonSpiralPresentationRef = useRef(cactusCanyonSpiralPresentation);
  cactusCanyonSpiralPresentationRef.current = cactusCanyonSpiralPresentation;
  const firstLightAssemblyCraterPresentationRef = useRef(firstLightAssemblyCraterPresentation);
  firstLightAssemblyCraterPresentationRef.current = firstLightAssemblyCraterPresentation;
  const greatHoneyfallPresentationRef = useRef(greatHoneyfallPresentation);
  greatHoneyfallPresentationRef.current = greatHoneyfallPresentation;
  const stagedRestorationPresentationRef = useRef(stagedRestorationPresentation);
  stagedRestorationPresentationRef.current = stagedRestorationPresentation;
  const island20SkiffNavigationRef = useRef(island20SkiffNavigation);
  island20SkiffNavigationRef.current = island20SkiffNavigation;
  const onIsland20SkiffRunCompleteRef = useRef(onIsland20SkiffRunComplete);
  onIsland20SkiffRunCompleteRef.current = onIsland20SkiffRunComplete;
  const fishermansFishingPresentationRef = useRef(fishermansFishingPresentation);
  fishermansFishingPresentationRef.current = fishermansFishingPresentation;
  const onSignatureMissionClickRef = useRef(onSignatureMissionClick);
  const onAssemblyMeetingCompleteRef = useRef(onAssemblyMeetingComplete);
  onAssemblyMeetingCompleteRef.current = onAssemblyMeetingComplete;
  const caretakerEncounterOpenRef = useRef(caretakerEncounterOpen);
  const onCaretakerClickRef = useRef(onCaretakerClick);
  const interactionPausedRef = useRef(interactionPaused);
  const arenaBattlePresentationRef = useRef<{
    value: IslandRunArenaBattlePresentation | null;
    cueStartedAtMs: number;
  }>({ value: arenaBattlePresentation, cueStartedAtMs: 0 });
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
    // Construction briefly raises draw calls and triangle count. Treating that
    // authored burst as a sustained device-quality failure used to rebuild the
    // entire renderer mid-build on iOS, exposing the retired 2D fallback.
    // Keep the active scene stable and reconsider quality once the crew rests.
    if (constructionPresentationRef.current?.active) {
      sustainedQualityMissesRef.current = 0;
      return;
    }
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
  const resolvedTileMap = useMemo<readonly IslandTileMapEntry[]>(() => {
    if (tileMap) return tileMap;
    const previewTiles = applyLandmarkDoorTiles(
      generateTileMap(islandNumber, getIslandRarity(islandNumber), `island-${islandNumber}`, 2),
      { expandedActiveStopId: 'hatchery' },
    );
    return previewTiles.map(entry => entry.signatureMissionKind === 'moonwell_heat' && (landmarkBuildLevels?.event ?? buildLevel) < 3
      ? { ...entry, signatureMissionKind: undefined, signatureMissionId: undefined } : entry);
  }, [islandNumber, tileMap, landmarkBuildLevels?.event, buildLevel]);
  // Door affordability and newly unlocked mission tiles can change during a
  // spend too. Board input is inert in Build, so defer those presentation-only
  // changes with the overview instead of tearing down the active renderer.
  const constructionTileMapRef = useRef(resolvedTileMap);
  if (!constructionPresentation?.active) constructionTileMapRef.current = resolvedTileMap;
  const sceneTileMap = constructionTileMapRef.current;
  const tileRewardMapKey = useMemo(
    () => sceneTileMap
      .map((entry) => `${entry.index}:${entry.tileType}:${entry.doorStopId ?? ''}:${entry.isActiveDoorCluster ? 1 : 0}:${entry.signatureMissionKind ?? ''}`)
      .join('|'),
    [sceneTileMap],
  );
  const landmarkBuildLevelsKey = useMemo(
    () => ISLAND_5_LANDMARKS
      .map((landmark) => `${landmark.id}:${landmarkBuildLevels?.[landmark.id] ?? buildLevel}`)
      .join('|'),
    [buildLevel, landmarkBuildLevels],
  );
  // Island 015 build levels mutate semantic GLB groups through the binder.
  // Other worlds still rebuild their authored procedural geometry as before.
  // Keep the WebGL world/camera alive throughout construction. The additive
  // preview reads live levels through refs; the overview catches up on exit.
  const constructionSceneLevelsRef = useRef({ buildLevel, key: landmarkBuildLevelsKey });
  if (!constructionPresentation?.active) {
    constructionSceneLevelsRef.current = { buildLevel, key: landmarkBuildLevelsKey };
  }
  const sceneBuildLevelDependency = isCrystalGlacier ? 0 : constructionSceneLevelsRef.current.buildLevel;
  const sceneLandmarkBuildLevelsDependency = isCrystalGlacier
    ? 'island-015-runtime-levels'
    : constructionSceneLevelsRef.current.key;

  useEffect(() => {
    if (!isCrystalGlacier) return;
    island15CrystalPalaceRuntimeRef.current?.setBuildLevels(
      resolveIsland15CrystalPalaceBuildLevels(buildLevel, landmarkBuildLevels),
    );
  }, [buildLevel, isCrystalGlacier, landmarkBuildLevels, landmarkBuildLevelsKey]);

  useEffect(() => {
    onLandmarkClickRef.current = onLandmarkClick;
  }, [onLandmarkClick]);

  useEffect(() => {
    onSignatureMissionClickRef.current = onSignatureMissionClick;
  }, [onSignatureMissionClick]);

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
  const isReducedMotion = deviceSignals.prefersReducedMotion === true || (
    new URLSearchParams(window.location.search).get('island3dEvidence') === '1'
    && new URLSearchParams(window.location.search).get('reduced') === '1'
  );

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

  // Asset readiness is presentation state; mission/progression remains canonical.
  useEffect(() => {
    if (!isAssemblyCraterFirstLight) return undefined;
    let cancelled = false;
    void preloadIsland001V2Assets().then(() => {
      if (!cancelled) setAssemblyAssetsReady(true);
    }, () => {
      if (!cancelled) setError('The island models could not load. Tap to retry.');
    });
    return () => { cancelled = true; };
  }, [isAssemblyCraterFirstLight, rendererRetryVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (isAssemblyCraterFirstLight && !assemblyAssetsReady)) return undefined;
    setHasRenderedFrame(false);
    setError(null);
    setTourStatus('idle');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: qualityProfile.antialias,
        alpha: isCoasterCarnival,
        powerPreference: qualityProfile.id === 'high' ? 'high-performance' : 'default',
      });
    } catch (caught) {
      console.error(`[island-${islandNumber}-3d-pilot] WebGL initialization failed:`, caught);
      setError('The 3D world paused while its renderer restarted. Tap to retry.');
      return undefined;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setError('The 3D world paused to recover graphics memory. Tap to retry.');
    };
    const handleContextRestored = () => {
      setRendererRetryVersion((current) => current + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const backgroundColor = isFirstLightKingdom
      ? 0x9bdff4
      : isCelestialSkyKingdom
        ? 0x86c8ff
        : isFrostmoonHaven
          ? 0xc6d5ee
          : isDriftwoodIsle
            ? 0x7bcbd0
          : isSunshoreAtoll
            ? 0x78d7ee
            : isMoonveilNexus
              ? 0x020316
              : isAbyssalPearlKingdom
                ? 0x06465e
              : isEverblossomKingdom
                ? 0x83d7df
                : isHeartshaftCrucible
                  ? 0x160b0b
                  : isRootheartCanopyCity
                    ? 0x2b3d2a
                    : isSunkenSands
                      ? 0xdfbd7d
                      : isCactusCanyon
                        ? 0xd98a58
                        : isHoneycombKingdom
                        ? 0x148ac8
                        : isCrystalGlacier
                          ? 0x10253a
                      : isJungleExpedition
                        ? 0x1397bd
                        : isLavaLabyrinth
                          ? 0x120706
              : 0x91d7e8;
    const fogColor = isFirstLightKingdom
      ? 0xbdebf5
      : isCelestialSkyKingdom
        ? 0xbddfff
        : isFrostmoonHaven
          ? 0xdbe5f3
          : isDriftwoodIsle
            ? 0xa9d9d1
          : isSunshoreAtoll
            ? 0x9fe9ef
            : isMoonveilNexus
              ? 0x080a2d
              : isAbyssalPearlKingdom
                ? 0x07526b
              : isEverblossomKingdom
                ? 0xbbe6d5
                : isHeartshaftCrucible
                  ? 0x35120e
                  : isRootheartCanopyCity
                    ? 0x665f3d
                    : isSunkenSands
                      ? 0xdccba6
                      : isCactusCanyon
                        ? 0xc98258
                      : isHoneycombKingdom
                        ? 0x83d4ee
                        : isCrystalGlacier
                          ? 0x9eb8c5
                      : isJungleExpedition
                        ? 0x8edbd3
                        : isLavaLabyrinth
                          ? 0x35100b
              : 0x8ecdda;
    const fogDensity = isFirstLightKingdom
      ? 0.0038
      : isCelestialSkyKingdom
        ? 0.0036
        : isFrostmoonHaven
          ? 0.008
          : isDriftwoodIsle
            ? 0.0042
          : isSunshoreAtoll
            ? 0.0035
            : isMoonveilNexus
              ? 0.0022
              : isAbyssalPearlKingdom
                ? 0.0026
              : isEverblossomKingdom
                ? 0.0032
                : isHeartshaftCrucible
                  ? 0.006
                  : isRootheartCanopyCity
                    ? 0.0036
                    : isSunkenSands
                      ? 0.0105
                      : isCactusCanyon
                        ? 0.0065
                      : isHoneycombKingdom
                        ? 0.0034
                        : isCrystalGlacier
                          ? 0.0028
                      : isJungleExpedition
                        ? 0.0042
                        : isLavaLabyrinth
                          ? 0.0062
              : 0.0048;
    let rootheartDayBackdrop: THREE.Texture | null = null;
    let rootheartNightBackdrop: THREE.Texture | null = null;
    scene.background = new THREE.Color(backgroundColor);
    if (isFirstLightKingdom) {
      scene.background = createFirstLightSunriseBackdrop() ?? scene.background;
    } else if (isSunkenSands) {
      scene.background = createSunkenSandsDesertBackdrop() ?? scene.background;
    } else if (isCactusCanyon) {
      scene.background = createIsland13CactusCanyonBackdrop();
    } else if (isHoneycombKingdom) {
      scene.background = createIsland14HoneycombBackdrop();
    } else if (isCrystalGlacier) {
      scene.background = createIsland15CrystalGlacierBackdrop();
    } else if (isMoonveilNexus) {
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
    } else if (isRootheartCanopyCity) {
      const textureLoader = new THREE.TextureLoader();
      rootheartDayBackdrop = textureLoader.load('/assets/islands/island-010/background/rootheart-canopy-backdrop-v1.webp');
      rootheartNightBackdrop = textureLoader.load('/assets/islands/island-010/background/rootheart-canopy-backdrop-night-v1.webp');
      [rootheartDayBackdrop, rootheartNightBackdrop].forEach((backdrop) => {
        backdrop.colorSpace = THREE.SRGBColorSpace;
        backdrop.wrapS = THREE.ClampToEdgeWrapping;
        backdrop.wrapT = THREE.ClampToEdgeWrapping;
      });
      scene.background = rootheartDayBackdrop;
    }
    if (isCoasterCarnival) {
      scene.background = isCircuitFPreviewEnabled || isCircuitGBoardPreviewEnabled ? new THREE.Color(0x77c9ef) : null;
    }
    scene.fog = isCoasterCarnival
      ? isCircuitFPreviewEnabled || isCircuitGBoardPreviewEnabled
        ? new THREE.FogExp2(0x86d2ee, 0.008)
        : null
      : new THREE.FogExp2(fogColor, fogDensity);

    // Leave enough depth for the First Light horizon ring at every camera
    // azimuth; foreground gameplay geometry remains inside the shadow budget.
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 210);
    camera.zoom = isMoonveilNexus ? 1.2 : isAbyssalPearlKingdom ? 1.12 : isCactusCanyon ? 1.06 : isHoneycombKingdom ? 1.16 : isJungleExpedition ? 0.98 : isLavaLabyrinth ? 1.2 : isFirstLightKingdom ? 1.03 : 1;
    camera.updateProjectionMatrix();
    const overview = getIsland5CameraPreset('overview');
    const celestialInitialOverview = {
      // The separated districts must fit too. Only the view changes; canonical
      // route, landmark anchors and hit proxies retain their shared transforms.
      position: celestialRedockingPresentationRef.current.completedRolls < 20
        ? [0, 35, 43] as const : [0, 29, 34] as const,
      target: [0, -0.8, 0] as const,
    };
    const firstLightInitialOverview = {
      // First Light is the onboarding hero, so its board must read at phone
      // scale instead of dissolving into a large field of empty ocean. The
      // lower target keeps the taller ocean-rooted cliff and waterfall feet
      // visible above the controller safe area.
      position: [0, 16, 31] as const,
      target: [0, -0.8, 0] as const,
    };
    const sunkenSandsInitialOverview = {
      // Sunken Sands is a low, wide oasis. A lower camera converts its real
      // ground depth into portrait-screen depth, while the raised target keeps
      // the monumental citadel below the header safe area.
      position: [0, 16.5, 27] as const,
      target: [0, 0.72, -0.35] as const,
    };
    const cactusCanyonInitialOverview = {
      // Cactus Canyon is a compact floating mesa with tall central railway
      // architecture and a deep butte horizon. This pitch keeps the rail loop,
      // cliff underside and skyline readable together on portrait screens.
      position: [0, 14.8, 24] as const,
      target: [0, 0.78, -0.35] as const,
    };
    const fishermansVillageInitialOverview = {
      // The fisherman island is wider than the generic board. Preserve the
      // complete left/right shoreline landmark families (especially the raised
      // northern Guild) in portrait instead of cropping them off-screen.
      position: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
        ? [0, 21.5, 36.5] as const
        : [0, 19.5, 33] as const,
      target: [0, 0.25, 0] as const,
    };
    const honeycombInitialOverview = {
      // Honeycomb Kingdom is a tall central hive city on a floating honey-rock
      // crown. This angle preserves the entire real board while keeping the
      // palace dome, satellite landmarks, honey falls and cliff underside in frame.
      position: [0, 15.8, 27.8] as const,
      target: [0, -0.75, -0.05] as const,
    };
    const jungleExpeditionWorldView = new URLSearchParams(window.location.search).get('island18WorldView');
    const jungleExpeditionInitialOverview = {
      // Preserve the crown temple, full route, waterfall faces and tapered
      // underside together in the portrait gameplay composition.
      position: jungleExpeditionWorldView === 'residents-left'
        ? [-3.2, 5.8, 12.6] as const
        : jungleExpeditionWorldView === 'residents-right'
          ? [2.8, 5.8, 12.6] as const
          : jungleExpeditionWorldView === 'residents'
            ? [0, 9.8, 19.8] as const
            : jungleExpeditionWorldView === 'fauna-left'
              ? [-7.5, 8.2, 22.5] as const
              : jungleExpeditionWorldView === 'fauna-right'
                ? [7.5, 8.2, 22.5] as const
                : jungleExpeditionWorldView === 'fauna'
                  ? [0, 10.8, 24] as const
        : jungleExpeditionWorldView === 'rear'
          ? [0, 14.9, -25.6] as const
          : [0, 14.9, 25.6] as const,
      target: jungleExpeditionWorldView === 'residents-left'
        ? [-2.7, 0.72, 4.35] as const
        : jungleExpeditionWorldView === 'residents-right'
          ? [2.5, 0.72, 4.65] as const
          : jungleExpeditionWorldView === 'residents'
            ? [0, 0.72, 3.8] as const
            : jungleExpeditionWorldView === 'fauna-left'
              ? [-3.2, 0.82, 8.2] as const
              : jungleExpeditionWorldView === 'fauna-right'
                ? [3.2, 0.82, 8.2] as const
                : jungleExpeditionWorldView === 'fauna'
                  ? [0, 0.82, 8] as const
        : jungleExpeditionWorldView === 'rear'
          ? [0, 0.18, 0.1] as const
          : [0, 0.38, -0.18] as const,
    };
    const lavaLabyrinthInitialOverview = {
      // The labyrinth is gameplay, not a façade: keep enough pitch to read its
      // connected top-down paths while the keep, board ring and lavafall still
      // form the source image's strong portrait silhouette.
      position: [0, 14.8, 19.6] as const,
      target: [0, 0.18, -0.18] as const,
    };
    const coasterCarnivalInitialOverview = {
      // Give the production hybrid a closer establishing view while keeping
      // the complete Ferris wheel, crest, drop tower, carousel and cliff root
      // inside the portrait. This camera scales the real Three.js overlay in
      // step with the slightly enlarged source-locked plate below.
      position: [1.25, 17.3, 31.7] as const,
      target: [0, 1.25, -0.05] as const,
    };
    const circuitGBoardInitialOverview = {
      position: [0.4, 12.8, 20.8] as const,
      target: [0, 0.35, 0] as const,
    };
    const crystalGlacierInitialOverview = resolveIsland15CameraPose('overview', {
      portrait: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75,
    }) ?? {
      position: [0, 20.5, 32] as const,
      target: [0, 1.15, 0] as const,
      fov: 47,
    };
    const restoredCameraPose = cameraPoseSnapshotRef.current;
    const initialOverviewPosition = isCelestialSkyKingdom
      ? celestialInitialOverview.position
      : isFirstLightKingdom
      ? firstLightInitialOverview.position
      : isSunkenSands
        ? sunkenSandsInitialOverview.position
        : isCactusCanyon
          ? cactusCanyonInitialOverview.position
          : isFishermansVillage
            ? fishermansVillageInitialOverview.position
            : isHoneycombKingdom
              ? honeycombInitialOverview.position
          : isCrystalGlacier
            ? crystalGlacierInitialOverview.position
            : isJungleExpedition
              ? jungleExpeditionInitialOverview.position
            : isLavaLabyrinth
              ? lavaLabyrinthInitialOverview.position
              : isCoasterCarnival
                ? isCircuitGBoardPreviewEnabled
                  ? circuitGBoardInitialOverview.position
                  : coasterCarnivalInitialOverview.position
        : overview.position;
    const initialOverviewTarget = isCelestialSkyKingdom
      ? celestialInitialOverview.target
      : isFirstLightKingdom
      ? firstLightInitialOverview.target
      : isSunkenSands
        ? sunkenSandsInitialOverview.target
        : isCactusCanyon
          ? cactusCanyonInitialOverview.target
          : isFishermansVillage
            ? fishermansVillageInitialOverview.target
            : isHoneycombKingdom
              ? honeycombInitialOverview.target
          : isCrystalGlacier
            ? crystalGlacierInitialOverview.target
            : isJungleExpedition
              ? jungleExpeditionInitialOverview.target
            : isLavaLabyrinth
              ? lavaLabyrinthInitialOverview.target
              : isCoasterCarnival
                ? isCircuitGBoardPreviewEnabled
                  ? circuitGBoardInitialOverview.target
                  : coasterCarnivalInitialOverview.target
        : overview.target;
    if (isCrystalGlacier && !restoredCameraPose) {
      camera.fov = crystalGlacierInitialOverview.fov ?? camera.fov;
      camera.updateProjectionMatrix();
    }
    if (restoredCameraPose && Number.isFinite(restoredCameraPose.fov)) {
      camera.fov = Number(restoredCameraPose.fov);
      camera.updateProjectionMatrix();
    }
    camera.position.set(...(restoredCameraPose?.position ?? initialOverviewPosition));
    camera.lookAt(...(restoredCameraPose?.target ?? initialOverviewTarget));
    if (!restoredCameraPose && !isIsland19BoardFocusEvidenceEnabled) setActivePreset('overview');

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isFirstLightKingdom
      ? 0.86
      : isCelestialSkyKingdom
        ? 0.92
        : isFrostmoonHaven
          ? 0.9
          : isDriftwoodIsle
            ? 0.94
          : isSunshoreAtoll
            ? 0.9
            : isMoonveilNexus
              ? 0.96
              : isAbyssalPearlKingdom
                ? 1.08
                : isEverblossomKingdom
                  ? 0.98
                  : isHeartshaftCrucible
                    ? 1.02
                    : isRootheartCanopyCity
                      ? 1.1
                      : isSunkenSands
                        ? 1.02
                        : isCactusCanyon
                          ? 1.08
                        : isFishermansVillage
                          ? 0.94
                        : isHoneycombKingdom
                          ? 0.98
                        : isCrystalGlacier
                          ? 0.96
                        : isJungleExpedition
                          ? 1.03
                        : isLavaLabyrinth
                          ? 1.08
              : 1.06;
    // The underwater scene carries multiple full-screen transparent water and
    // light layers. A 1.4 DPR ceiling remains crisp at the phone viewport while
    // reserving fill-rate for fauna, caustics and landmark motion.
    renderer.setPixelRatio(getIsland3DRendererPixelRatio(
      qualityProfile,
      window.devicePixelRatio,
      isAbyssalPearlKingdom ? 1.4 : isJungleExpedition ? 1.5 : Number.POSITIVE_INFINITY,
    ));
    // The underwater kingdom uses diffuse volume light. Jungle Expedition uses
    // a tiny selective shadow set applied after scene assembly so its merged
    // ruin structures keep readable stair and balcony depth without shadowing
    // every leaf, tile reward, controller prop or ambient effect.
    const sceneUsesRealtimeShadows = qualityProfile.shadows
      && !isAbyssalPearlKingdom
      && !isLavaLabyrinth
      && !(isCoasterCarnival && isCircuitFPreviewEnabled);
    renderer.shadowMap.enabled = sceneUsesRealtimeShadows;
    renderer.shadowMap.type = isSunkenSands ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = sceneUsesRealtimeShadows;

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...(restoredCameraPose?.target ?? initialOverviewTarget));
    controls.enableDamping = !isReducedMotion;
    controls.dampingFactor = 0.075;
    controls.enablePan = cameraAuthoringEnabledRef.current;
    controls.screenSpacePanning = true;
    controls.minDistance = 5.4;
    controls.maxDistance = 72;
    controls.minPolarAngle = THREE.MathUtils.degToRad(28);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(69);
    controls.enableRotate = true;
    controls.enableZoom = true;
    let island15OrbitMode: Island15CameraOrbitMode = 'exterior';
    let island15FittedExteriorDistance = 0;
    const applyIsland15OrbitControlMode = (
      mode: Island15CameraOrbitMode,
      syncCamera = false,
    ) => {
      island15OrbitMode = mode;
      const limits = resolveIsland15OrbitControlLimits(mode);
      controls.minDistance = limits.minDistance;
      controls.maxDistance = isCrystalGlacier && mode === 'exterior'
        ? Math.max(limits.maxDistance, island15FittedExteriorDistance * 1.3)
        : limits.maxDistance;
      controls.minPolarAngle = limits.minPolarAngle;
      controls.maxPolarAngle = limits.maxPolarAngle;
      if (isCrystalGlacier) {
        canvas.dataset.island15OrbitControlMode = mode;
        canvas.dataset.island15OrbitControlLimits = JSON.stringify({
          minDistance: Number(limits.minDistance.toFixed(3)),
          maxDistance: Number(controls.maxDistance.toFixed(3)),
          minPolarAngleDegrees: Number(THREE.MathUtils.radToDeg(limits.minPolarAngle).toFixed(1)),
          maxPolarAngleDegrees: Number(THREE.MathUtils.radToDeg(limits.maxPolarAngle).toFixed(1)),
        });
      }
      if (syncCamera) {
        camera.lookAt(controls.target);
        controls.update();
      }
    };
    if (isCrystalGlacier) applyIsland15OrbitControlMode('exterior');
    controls.rotateSpeed = 0.56;
    controls.zoomSpeed = 0.78;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

    const island12ArchiveLookdevMode = isSunkenSands && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('island12ArchiveLookdev')
      : null;
    // Development-only relighting proof for Sunshore's real runtime surfaces.
    const sunshoreSurfaceLookdev = isSunshoreAtoll && import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get('island5SurfaceLookdev') : null;
    if (isSunshoreAtoll) canvas.dataset.sunshoreSurfaceLookdev = sunshoreSurfaceLookdev ?? 'production';
    const isArchiveNeutralLookdev = island12ArchiveLookdevMode === 'neutral' || sunshoreSurfaceLookdev === 'neutral';
    const isArchiveGrazingLookdev = island12ArchiveLookdevMode === 'grazing' || sunshoreSurfaceLookdev === 'grazing';
    const isArchiveEnvironmentLookdev = island12ArchiveLookdevMode === 'environment';
    const isArchiveBacklightLookdev = island12ArchiveLookdevMode === 'backlight';
    const isArchiveAlbedoLookdev = island12ArchiveLookdevMode === 'albedo';
    const archiveAlbedoMaterials: THREE.Material[] = [];
    if (isArchiveAlbedoLookdev) {
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 1;
    }
    let assemblyEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let archiveLookdevEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let fishermansVillageEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let honeycombEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let jungleExpeditionEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    let lavaLabyrinthEnvironmentTarget: THREE.WebGLRenderTarget | null = null;
    if (isAssemblyCraterFirstLight || isCelestialSkyKingdom || isSunshoreAtoll) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      assemblyEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, isSunshoreAtoll ? .04 : .06);
      scene.environment = assemblyEnvironmentTarget.texture; scene.environmentIntensity = isSunshoreAtoll ? .24 : isCelestialSkyKingdom ? .35 : .4;
      roomEnvironment.dispose(); pmremGenerator.dispose();
    }
    if (isArchiveEnvironmentLookdev || isArchiveBacklightLookdev) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      archiveLookdevEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
      scene.environment = archiveLookdevEnvironmentTarget.texture;
      scene.environmentIntensity = isArchiveEnvironmentLookdev ? 0.36 : 0.18;
      renderer.toneMappingExposure = isArchiveEnvironmentLookdev ? 0.9 : 0.84;
      roomEnvironment.dispose();
      pmremGenerator.dispose();
    }
    if (isHoneycombKingdom) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      honeycombEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.06);
      scene.environment = honeycombEnvironmentTarget.texture;
      scene.environmentIntensity = 0.52;
      roomEnvironment.dispose();
      pmremGenerator.dispose();
    }
    if (isJungleExpedition) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      jungleExpeditionEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
      scene.environment = jungleExpeditionEnvironmentTarget.texture;
      scene.environmentIntensity = 0.34;
      roomEnvironment.dispose();
      pmremGenerator.dispose();
    }
    if (isFishermansVillage) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      fishermansVillageEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.08);
      scene.environment = fishermansVillageEnvironmentTarget.texture;
      scene.environmentIntensity = 0.34;
      roomEnvironment.dispose();
      pmremGenerator.dispose();
    }
    if (isLavaLabyrinth) {
      const roomEnvironment = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      lavaLabyrinthEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.05);
      scene.environment = lavaLabyrinthEnvironmentTarget.texture;
      scene.environmentIntensity = 0.34;
      roomEnvironment.dispose();
      pmremGenerator.dispose();
    }
    const hemisphereGroundColor = isArchiveNeutralLookdev
      ? 0x747474
      : isArchiveGrazingLookdev
        ? 0x241f1c
        : isArchiveEnvironmentLookdev
          ? 0x1b2430
          : isArchiveBacklightLookdev
            ? 0x0b1018
        : isFirstLightKingdom
      ? 0x70877f
      : isCelestialSkyKingdom
        ? 0x7787a0
        : isFrostmoonHaven
          ? 0x47546e
          : isDriftwoodIsle
            ? 0x3b5f55
          : isSunshoreAtoll
            ? 0x50754d
            : isMoonveilNexus
              ? 0x070312
              : isAbyssalPearlKingdom
                ? 0x032c3a
                : isEverblossomKingdom
                  ? 0x526f42
                  : isHeartshaftCrucible
                    ? 0x180706
                    : isRootheartCanopyCity
                      ? 0x24351f
                      : isSunkenSands
                        ? 0x6e4b2f
                        : isCactusCanyon
                          ? 0x4b241b
                        : isFishermansVillage
                          ? 0x3e514c
                        : isHoneycombKingdom
                          ? 0x91531d
                        : isJungleExpedition
                          ? 0x173b26
                        : isLavaLabyrinth
                          ? 0x0c1016
                          : isCrystalGlacier
                            ? 0x33434f
              : 0x28566a;
    const hemisphereIntensity = isArchiveNeutralLookdev
      ? 1.18
      : isArchiveGrazingLookdev
        ? 0.48
        : isArchiveEnvironmentLookdev
          ? 0.72
          : isArchiveBacklightLookdev
            ? 0.24
        : isFirstLightKingdom
      ? 1.7
      : isCelestialSkyKingdom
        ? 1.05
        : isFrostmoonHaven
          ? 1.55
          : isDriftwoodIsle
            ? 1.78
          : isSunshoreAtoll
            ? 1.82
            : isMoonveilNexus
              ? 1.24
              : isAbyssalPearlKingdom
                ? 1.24
                : isEverblossomKingdom
                  ? 1.86
                  : isHeartshaftCrucible
                    ? 1.55
                    : isRootheartCanopyCity
                      ? 1.78
                      : isSunkenSands
                        ? 1.52
                        : isCactusCanyon
                          ? 1.78
                        : isFishermansVillage
                          ? 1.48
                        : isHoneycombKingdom
                          ? 1.7
                        : isJungleExpedition
                          ? 1.58
                        : isLavaLabyrinth
                          ? 1.15
                          : isCrystalGlacier
                            ? 1.22
              : 2.25;
    const hemisphere = new THREE.HemisphereLight(
      isArchiveNeutralLookdev
        ? 0xffffff
        : isArchiveGrazingLookdev
          ? 0xdcecff
          : isArchiveEnvironmentLookdev
            ? 0xd9eaff
            : isArchiveBacklightLookdev
              ? 0x7d9bc2
          : isDriftwoodIsle ? 0xffefcf : isMoonveilNexus ? 0x7181ff : isAbyssalPearlKingdom ? 0x78efff : isEverblossomKingdom ? 0xd9fbff : isHeartshaftCrucible ? 0xc76d45 : isRootheartCanopyCity ? 0xffedc2 : isSunkenSands ? 0xfff0ca : isCactusCanyon ? 0xffd5a8 : isFishermansVillage ? 0xffe0b7 : isHoneycombKingdom ? 0xd7f5ff : isJungleExpedition ? 0xdaf6d8 : isLavaLabyrinth ? 0xc5d2e4 : isCrystalGlacier ? 0xdceaf0 : 0xeefcff,
      hemisphereGroundColor,
      hemisphereIntensity,
    );
    if (isAssemblyCraterFirstLight) { hemisphere.intensity = 1.6; hemisphere.groundColor.setHex(0x847862); }
    if (isSunshoreAtoll) { hemisphere.intensity = 1.65; hemisphere.groundColor.setHex(0x7c8170); }
    if (isJungleExpedition) hemisphere.name = 'ISLAND_18_PRIMARY_SKY_LIGHT';
    scene.add(hemisphere);
    const sunlightIntensity = isArchiveNeutralLookdev
      ? 2.35
      : isArchiveGrazingLookdev
        ? 3.15
        : isArchiveEnvironmentLookdev
          ? 1.35
          : isArchiveBacklightLookdev
            ? 4.6
        : isFirstLightKingdom
      ? 3.15
      : isCelestialSkyKingdom
        ? 2.8
        : isFrostmoonHaven
          ? 2.65
          : isDriftwoodIsle
            ? 3.25
          : isSunshoreAtoll
            ? 3.25
            : isMoonveilNexus
              ? 2.05
              : isAbyssalPearlKingdom
                ? 2.15
                : isEverblossomKingdom
                  ? 3.45
                  : isHeartshaftCrucible
                    ? 2.75
                    : isRootheartCanopyCity
                      ? 3.8
                      : isSunkenSands
                        ? 3.9
                        : isCactusCanyon
                          ? 4.15
                        : isFishermansVillage
                          ? 3.35
                        : isHoneycombKingdom
                          ? 3.45
                        : isJungleExpedition
                          ? 3.75
                        : isLavaLabyrinth
                          ? 2.45
                          : isCrystalGlacier
                            ? 3.05
              : 4.2;
    const sunlight = new THREE.DirectionalLight(
      isArchiveNeutralLookdev
        ? 0xffffff
        : isArchiveGrazingLookdev
          ? 0xffefd8
          : isArchiveEnvironmentLookdev
            ? 0xe8f2ff
            : isArchiveBacklightLookdev
              ? 0x83c7ff
          : isDriftwoodIsle ? 0xffcf91 : isMoonveilNexus ? 0xa8b6ff : isAbyssalPearlKingdom ? 0x9ff7ff : isHeartshaftCrucible ? 0xff9b65 : isRootheartCanopyCity ? 0xffc36d : isSunkenSands ? 0xffdf9f : isCactusCanyon ? 0xffb36b : isFishermansVillage ? 0xffbd72 : isHoneycombKingdom ? 0xffc052 : isJungleExpedition ? 0xffdda6 : isLavaLabyrinth ? 0xffd9c2 : isCrystalGlacier ? 0xf5fbff : isFrostmoonHaven ? 0xffe5c4 : 0xfff1cb,
      sunlightIntensity,
    );
    if (isJungleExpedition) sunlight.name = 'ISLAND_18_PRIMARY_SUN_LIGHT';
    sunlight.position.set(
      isArchiveGrazingLookdev ? -14 : isArchiveEnvironmentLookdev ? -6 : isArchiveBacklightLookdev ? 5 : isSunkenSands ? 6 : isCactusCanyon ? 8 : isFishermansVillage ? -12 : isHoneycombKingdom ? -10 : isJungleExpedition ? -10 : isLavaLabyrinth ? -7 : -9,
      isArchiveGrazingLookdev ? 3.4 : isArchiveEnvironmentLookdev ? 10 : isArchiveBacklightLookdev ? 6 : isSunkenSands ? 16 : isCactusCanyon ? 18 : isFishermansVillage ? 11 : isHoneycombKingdom ? 17 : isJungleExpedition ? 17 : isLavaLabyrinth ? 12 : 15,
      isArchiveGrazingLookdev ? 8 : isArchiveEnvironmentLookdev ? 7 : isArchiveBacklightLookdev ? -14 : isSunkenSands ? -12 : isCactusCanyon ? -14 : isFishermansVillage ? -8 : isHoneycombKingdom ? 11 : isJungleExpedition ? 10 : isLavaLabyrinth ? 9 : 10,
    );
    sunlight.castShadow = sceneUsesRealtimeShadows;
    sunlight.shadow.mapSize.set(qualityProfile.shadowMapSize, qualityProfile.shadowMapSize);
    sunlight.shadow.camera.left = -11;
    sunlight.shadow.camera.right = 11;
    sunlight.shadow.camera.top = 11;
    sunlight.shadow.camera.bottom = -11;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 34;
    sunlight.shadow.bias = isSunkenSands ? -0.00035 : -0.0006;
    sunlight.shadow.normalBias = isSunkenSands ? 0.025 : isJungleExpedition || isSunshoreAtoll ? 0.018 : 0;
    scene.add(sunlight);
    const wonderRideKeyLight = new THREE.PointLight(0xffc36d, 0, 7.5, 1.7);
    wonderRideKeyLight.name = 'ISLAND_19_WONDER_EXPRESS_PHASE_KEY_LIGHT';
    wonderRideKeyLight.visible = false;
    const wonderRideRimLight = new THREE.PointLight(0x74ddff, 0, 6.5, 1.8);
    wonderRideRimLight.name = 'ISLAND_19_WONDER_EXPRESS_PHASE_RIM_LIGHT';
    wonderRideRimLight.visible = false;
    if (isCoasterCarnival) scene.add(wonderRideKeyLight, wonderRideRimLight);
    if (isSunkenSands) {
      // A restrained water-colour fill keeps shaded sandstone legible while
      // allowing the warmer key light and static shadow map to do the actual
      // grounding. This is deliberately unshadowed and adds no draw calls.
      const oasisBounce = new THREE.DirectionalLight(
        isArchiveNeutralLookdev
          ? 0xffffff
          : isArchiveGrazingLookdev
            ? 0x789dcc
            : isArchiveEnvironmentLookdev
              ? 0xc9e5ff
              : isArchiveBacklightLookdev
                ? 0xffd8ad
                : 0x72d7df,
        isArchiveNeutralLookdev
          ? 0.62
          : isArchiveGrazingLookdev
            ? 0.2
            : isArchiveEnvironmentLookdev
              ? 0.22
              : isArchiveBacklightLookdev
                ? 0.12
                : 0.46,
      );
      oasisBounce.name = 'ISLAND_12_OASIS_BOUNCE_LIGHT';
      oasisBounce.position.set(8, 4, 13);
      scene.add(oasisBounce);
    }
    if (isCactusCanyon) {
      const canyonBounce = new THREE.DirectionalLight(0x8fb9d0, 0.48);
      canyonBounce.name = 'ISLAND_13_CANYON_SKY_BOUNCE_LIGHT';
      canyonBounce.position.set(10, 7, 12);
      scene.add(canyonBounce);
    }
    if (isJungleExpedition) {
      const jungleBounce = new THREE.DirectionalLight(0x8de8dc, 0.46);
      jungleBounce.name = 'ISLAND_18_TURQUOISE_SKY_BOUNCE_LIGHT';
      jungleBounce.position.set(11, 7, 13);
      scene.add(jungleBounce);
    }
    if (isLavaLabyrinth) {
      const forgeKey = new THREE.PointLight(0xff6a24, 9.6, 8.8, 2.05);
      forgeKey.name = 'ISLAND_20_CRUCIBLE_FORGE_KEY_LIGHT';
      forgeKey.position.set(0, 4.2, 0.2);
      const underglow = new THREE.PointLight(0xff2705, 5.8, 7.2, 2.1);
      underglow.name = 'ISLAND_20_LAVA_UNDERGLOW_LIGHT';
      underglow.position.set(0, -1.1, 0);
      const lavaSeaBounce = new THREE.PointLight(0xff3b08, 4.2, 8.5, 2.1);
      lavaSeaBounce.name = 'ISLAND_20_MAGMA_SEA_BOUNCE_LIGHT';
      lavaSeaBounce.position.set(0, -3.35, 2.4);
      const coolRim = new THREE.DirectionalLight(0x91abd0, 1.6);
      coolRim.name = 'ISLAND_20_OBSIDIAN_SEPARATION_RIM_LIGHT';
      coolRim.position.set(10, 7, 12);
      scene.add(forgeKey, underglow, lavaSeaBounce, coolRim);
    }
    if (isCrystalGlacier) {
      const glacierBounce = new THREE.DirectionalLight(0x9acfdc, 0.34);
      glacierBounce.name = 'ISLAND_15_GLACIER_BOUNCE_LIGHT';
      glacierBounce.position.set(9, 6, 11);
      scene.add(glacierBounce);
      const hearthBounce = new THREE.PointLight(0xffb177, 0.34, 9, 2);
      hearthBounce.name = 'ISLAND_15_CASTLE_HEARTH_BOUNCE_LIGHT';
      hearthBounce.position.set(0, 2.2, 1.4);
      scene.add(hearthBounce);
    }
    const rootheartDaySky = new THREE.Color(0xffedc2);
    const rootheartEveningSky = new THREE.Color(0x52647a);
    const rootheartDayGround = new THREE.Color(0x24351f);
    const rootheartEveningGround = new THREE.Color(0x070d0b);
    const rootheartDaySun = new THREE.Color(0xffc36d);
    const rootheartEveningSun = new THREE.Color(0xff8d52);
    const rootheartDayFog = new THREE.Color(0x665f3d);
    const rootheartEveningFog = new THREE.Color(0x0b1721);
    const rootheartLightingScratch = new THREE.Color();
    let rootheartLastConstructionSequence = Math.max(
      0,
      Math.floor(rootheartPowerworksPresentationRef.current.constructionSequence ?? 0),
    );
    let rootheartConstructionStartedAtMs = Number.NEGATIVE_INFINITY;
    let cactusCanyonLastConstructionSequence = Math.max(
      0,
      Math.floor(cactusCanyonSpiralPresentationRef.current.constructionSequence ?? 0),
    );
    let cactusCanyonBlastStartedAtMs = Number.NEGATIVE_INFINITY;
    let cactusCanyonBlastCameraWasActive = false;
    let waterDragonCameraWasActive = false;
    let fishingCameraWasActive = false;
    let firstLightAssemblyPresentationKey = '';
    let honeyfallLastConstructionSequence = Math.max(
      0,
      Math.floor(greatHoneyfallPresentationRef.current.constructionSequence ?? 0),
    );
    let honeyfallLastStage = greatHoneyfallPresentationRef.current.activatedReservoirs;
    let jungleZenithLastConstructionSequence = Math.max(
      0,
      Math.floor(stagedRestorationPresentationRef.current?.constructionSequence ?? 0),
    );
    let jungleZenithStartedAtMs = Number.NEGATIVE_INFINITY;
    let jungleZenithCameraWasActive = false;
    let jungleZenithCameraOrigin: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
    let jungleBuildupStartedAtMs = Number.NEGATIVE_INFINITY;
    let jungleBuildupStage = 0;
    let jungleBuildupCameraWasActive = false;
    let jungleBuildupCameraOrigin: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
    const jungleBuildupCameraShots = [
      null,
      { position: new THREE.Vector3(9.8, 10.2, 18.6), target: new THREE.Vector3(0, 7.35, -0.2) },
      { position: new THREE.Vector3(11.8, 11.2, 19.8), target: new THREE.Vector3(0.55, 4.6, -0.1) },
      { position: new THREE.Vector3(0, 14.5, 20.5), target: new THREE.Vector3(0, 0.92, 0.1) },
      { position: new THREE.Vector3(10.6, 11.6, 18.4), target: new THREE.Vector3(0, 8.35, -0.2) },
    ] as const;
    const jungleBuildupDurationMs = [0, 4_200, 4_800, 5_400, 6_200] as const;
    const cactusCanyonBlastPreviewEnabled = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('island13BlastPreview') === '1';
    const cactusCanyonBlastPreviewSegment = typeof window !== 'undefined'
      ? THREE.MathUtils.clamp(
          Number(new URLSearchParams(window.location.search).get('island13BlastSegment') ?? 8),
          1,
          16,
        )
      : 8;
    const jungleZenithPreviewEnabled = isJungleExpedition
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('island18ZenithPreview') === '1';
    const jungleMissionPreviewStageParam = isJungleExpedition && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('island18MissionPreview')
      : null;
    const jungleMissionPreviewStage = jungleMissionPreviewStageParam !== null
      && Number.isFinite(Number(jungleMissionPreviewStageParam))
      ? THREE.MathUtils.clamp(Math.floor(Number(jungleMissionPreviewStageParam)), 1, 4)
      : null;
    const jungleMissionPreviewReplay = jungleMissionPreviewStage !== null
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('island18MissionReplay') === '1';
    const jungleWeatherPreview = isJungleExpedition && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('island18WeatherPreview')
      : null;
    const jungleWeatherPreviewElapsed = jungleWeatherPreview === 'clear'
      ? 20
      : jungleWeatherPreview === 'gathering'
        ? 74
        : jungleWeatherPreview === 'storm'
          ? 115.5
          : jungleWeatherPreview === 'lightning'
            ? 111.2
            : jungleWeatherPreview === 'lightning-rare'
              ? 27 * ISLAND_18_WEATHER_CYCLE_SECONDS + 113.16646
              : jungleWeatherPreview === 'sunbreak'
                ? 138
                : jungleWeatherPreview === 'recovery'
                  ? 166
                  : null;
    const jungleResidentPreview = isJungleExpedition && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('island18ResidentPreview')
      : null;
    const jungleResidentPreviewElapsed = jungleResidentPreview === 'work-a'
      ? 22
      : jungleResidentPreview === 'work-b'
        ? 24.2
        : null;
    const jungleFaunaPreview = isJungleExpedition && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('island18FaunaPreview')
      : null;
    const jungleFaunaPreviewElapsed = jungleFaunaPreview === 'motion-a'
      ? 16
      : jungleFaunaPreview === 'motion-b'
        ? 18.2
        : null;
    const jungleDeterministicPreviewElapsed = jungleWeatherPreviewElapsed
      ?? jungleResidentPreviewElapsed
      ?? jungleFaunaPreviewElapsed;
    if (isJungleExpedition && jungleWeatherPreviewElapsed !== null) {
      canvas.dataset.island18WeatherPreview = jungleWeatherPreview ?? '';
    }
    if (isJungleExpedition && jungleResidentPreviewElapsed !== null) {
      canvas.dataset.island18ResidentPreview = jungleResidentPreview ?? '';
    }
    if (isJungleExpedition && jungleFaunaPreviewElapsed !== null) {
      canvas.dataset.island18FaunaPreview = jungleFaunaPreview ?? '';
    }

    const materials = createPilotMaterials(qualityProfile.id, resolvedWorldSourceNumber);
    if (isDriftwoodIsle) {
      materials.grass.color.setHex(0x4b975f);
      materials.reef.dispose();
      materials.reef = new THREE.MeshStandardMaterial({color:0xb8ac99,roughness:.92});
    }
    const island1Materials = isFirstLightKingdom ? createIsland1WorldMaterials() : null;
    // This palette belongs to this scene. Tinted reflective glass avoids the
    // extra opaque transmission pass on the mobile Assembly island.
    if (isAssemblyCraterFirstLight && island1Materials) {
      Object.values(island1Materials).forEach(material => {
        if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
      });
    }
    const island2CelestialMaterials = isCelestialSkyKingdom ? createIsland2CelestialMaterials() : null;
    const island3FrostmoonMaterials = isFrostmoonHaven ? createIsland3FrostmoonMaterials() : null;
    const island4DriftwoodMaterials = isDriftwoodIsle ? createIsland4DriftwoodMaterials() : null;
    const island5SunshoreMaterials = isSunshoreAtoll ? createIsland5SunshoreWorldMaterials() : null;
    const island6MoonveilMaterials = isMoonveilNexus ? createIsland6MoonveilMaterials() : null;
    const island7UnderwaterMaterials = isAbyssalPearlKingdom ? createIsland7UnderwaterMaterials() : null;
    const island8EverblossomMaterials = isEverblossomKingdom ? createIsland8EverblossomMaterials() : null;
    const island9HeartshaftMaterials = isHeartshaftCrucible ? createIsland9HeartshaftMaterials() : null;
    const island10RootheartMaterials = isRootheartCanopyCity ? createIsland10RootheartMaterials() : null;
    const island12SunkenSandsMaterials = isSunkenSands ? createIsland12SunkenSandsMaterials() : null;
    const island13CactusCanyonMaterials = isCactusCanyon ? createIsland13CactusCanyonMaterials() : null;
    const island22FishermansVillageMaterials = isFishermansVillage ? createIsland22FishermansVillageMaterials() : null;
    const island14HoneycombMaterials = isHoneycombKingdom ? createIsland14HoneycombMaterials() : null;
    const island18JungleExpeditionMaterials = isJungleExpedition ? createIsland18JungleExpeditionMaterials() : null;
    const island20LavaLabyrinthMaterials = isLavaLabyrinth ? createIsland20LavaLabyrinthMaterials(qualityProfile.id) : null;
    const island19CircuitGBoard: Island19CircuitGBoardRuntime | null = isCircuitGBoardPreviewEnabled
      ? createIsland19CoasterCarnivalCircuitGBoardPlaza({
          quality: qualityProfile.id,
          castShadow: qualityProfile.shadows,
          receiveShadow: true,
          reducedMotion: isReducedMotion,
          clay: isMapStrippedEvidenceEnabled,
        })
      : null;
    if (island19CircuitGBoard) {
      scene.add(island19CircuitGBoard.root);
      Object.assign(canvas.dataset, island19CircuitGBoard.dataset);
      canvas.dataset.island19FullWorld = 'circuit-g-g01-board-plaza-mounted';
      canvas.dataset.island19RepresentativeVariant = 'circuit-g-source-locked-modular-board';
      canvas.dataset.island19FallbackPreserved = 'circuit-e-source-locked-hybrid';
    }
    // Keep the production Wonder Express world ready behind the source-facing
    // overview. It becomes visible for the canonical mission finale and for
    // the explicit Circuit F evidence route; while hidden it owns no gameplay
    // state and contributes no draw calls.
    const island19CircuitFWorld: Island19CircuitFWorldRuntime | null = isCoasterCarnival
      ? createIsland19CoasterCarnivalCircuitFWorld({
          quality: qualityProfile.id,
          castShadow: sceneUsesRealtimeShadows,
          receiveShadow: true,
          clay: isMapStrippedEvidenceEnabled,
          cutaway: typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('island19CircuitFCutaway') === '1',
          reducedMotion: isReducedMotion,
        })
      : null;
    if (island19CircuitFWorld) {
      island19CircuitFWorld.root.visible = isCircuitFPreviewEnabled;
      scene.add(island19CircuitFWorld.root);
      if (isCircuitFPreviewEnabled) {
        Object.assign(canvas.dataset, island19CircuitFWorld.dataset);
        canvas.dataset.island19FullWorld = 'circuit-f-mounted';
        canvas.dataset.island19RepresentativeVariant = 'circuit-i-source-identity-exterior-with-deep-undersea-wonder-express';
        canvas.dataset.island19FallbackPreserved = 'circuit-e-source-locked-hybrid';
      }
    }
    const island19FullWorld: Island19SourceLoftWorldRuntime | null = isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled
      ? createIsland19CoasterCarnivalSourceLoftWorld({
          quality: qualityProfile.id,
          castShadow: qualityProfile.shadows,
          receiveShadow: true,
        })
      : null;
    if (island19FullWorld) {
      // Circuit D is retained as honest plate-free geometry evidence and as
      // the train's cumulative-distance owner. It no longer owns the
      // source-facing silhouette after the user's explicit 2/10 verdict.
      island19FullWorld.root.visible = isMapStrippedEvidenceEnabled;
      scene.add(island19FullWorld.root);
      const diagnostics = island19FullWorld.diagnostics;
      canvas.dataset.island19FullWorld = 'mounted';
      canvas.dataset.island19RepresentativeVariant = 'circuit-e-source-locked-hybrid';
      canvas.dataset.island19CircuitClosed = String(diagnostics.seamDistance <= 0.001 && diagnostics.seamTangentDot >= 0.995);
      canvas.dataset.island19PortalClearance = String(diagnostics.portalSideMargin >= 0.25 && diagnostics.portalTopMargin >= 0.2 && diagnostics.portalBottomMargin >= 0.2);
      canvas.dataset.island19LandmarksDistinct = String(diagnostics.landmarkMinimumSeparation >= 2.5);
      canvas.dataset.island19RouteClearance = String(diagnostics.routeViolations.length === 0);
      canvas.dataset.island19RuntimeManifest = String(diagnostics.manifestValid);
      canvas.dataset.island19BoundsValid = String(diagnostics.rootDepthToTopWidthRatio >= 0.32);
      canvas.dataset.island19TopologyValid = String(diagnostics.nonManifoldEdges === 0);
      canvas.dataset.island19CircuitLength = diagnostics.totalLength.toFixed(5);
      canvas.dataset.island19SourceLoftStations = String(diagnostics.stationCount);
      canvas.dataset.island19PortalMinimumSideMargin = diagnostics.portalSideMargin.toFixed(5);
    }
    const island19HybridOverlay: Island19HybridOverlayRuntime | null = island19FullWorld && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled
      ? createIsland19CoasterCarnivalHybridOverlay({
          quality: qualityProfile.id,
          castShadow: false,
          getTrainPose: island19FullWorld.getTrainPose,
          buildLevels: Object.fromEntries(
            ISLAND_5_LANDMARKS.map((landmark) => [
              landmark.id,
              landmarkBuildLevelsRef.current?.[landmark.id] ?? buildLevel,
            ]),
          ),
        })
      : null;
    if (island19HybridOverlay) {
      const geometryProofTrain = island19HybridOverlay.root.getObjectByName('island19-hybrid-wonder-train-motion');
      if (geometryProofTrain) geometryProofTrain.visible = isMapStrippedEvidenceEnabled;
      scene.add(island19HybridOverlay.root);
      Object.assign(canvas.dataset, island19HybridOverlay.dataset);
      canvas.dataset.island19HybridWorldTrainView = 'geometry-proof-only';
    }
    const island15CrystalGlacierMaterials = isCrystalGlacier ? createIsland15CrystalGlacierMaterials() : null;
    const island17TitansRestMaterials = isTitansRest ? createIsland17TitansRestMaterials() : null;
    const hasBrightWater = isFirstLightKingdom || isCelestialSkyKingdom || isSunshoreAtoll || isAbyssalPearlKingdom || isEverblossomKingdom || isSunkenSands;
    const waterMaterial = new THREE.MeshPhysicalMaterial({
      color: isFirstLightKingdom
        ? 0x2fb8d3
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
                  : isEverblossomKingdom
                    ? 0x23b9c5
                  : isSunkenSands
                    ? 0x22b8c8
                : 0x2a98bb,
      roughness: hasBrightWater ? 0.12 : isFrostmoonHaven ? 0.2 : 0.18,
      metalness: 0.06,
      transparent: true,
      opacity: hasBrightWater ? 0.82 : 0.88,
      clearcoat: hasBrightWater ? 0.82 : 0.62,
      clearcoatRoughness: 0.25,
    });
    const waterGeometry = isAssemblyCraterFirstLight
      ? createAssemblySeaGeometry(
        60,
        isFirstLightKingdom ? 120 : 68,
        Math.max(1, Math.floor(qualityProfile.oceanGridSegments / 2)),
      )
      : new THREE.PlaneGeometry(
        isSunshoreAtoll ? 360 : isFirstLightKingdom ? 120 : 68,
        isSunshoreAtoll ? 360 : isFirstLightKingdom ? 120 : 68,
        isAbyssalPearlKingdom ? 1 : qualityProfile.oceanGridSegments,
        isAbyssalPearlKingdom ? 1 : qualityProfile.oceanGridSegments,
      );
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.name = isAssemblyCraterFirstLight
      ? 'ISLAND_1_ASSEMBLY_CRATER_OCEAN_WITH_MEGAHALL_CLEARANCE'
      : 'ISLAND_3D_OCEAN_SURFACE';
    water.rotation.x = -Math.PI / 2;
    water.position.y = isFirstLightKingdom ? ISLAND_1_OCEAN_SURFACE_Y : -0.62;
    water.receiveShadow = true;
    if (!isAbyssalPearlKingdom && !isHeartshaftCrucible && !isRootheartCanopyCity && !isCactusCanyon && !isFishermansVillage && !isHoneycombKingdom && !isJungleExpedition && !isCoasterCarnival && !isLavaLabyrinth) scene.add(water);

    const assemblySurfaceCutawayRoots: THREE.Object3D[] = [];

    // Dedicated worlds own their continuous terrain. Frostmoon's deep ice
    // shelf replaces the old coastal plates, bridges and decorative lagoon.
    if (!isSunshoreAtoll && !isFrostmoonHaven && !isAbyssalPearlKingdom && !isEverblossomKingdom && !isHeartshaftCrucible && !isRootheartCanopyCity && !isSunkenSands && !isCactusCanyon && !isFishermansVillage && !isHoneycombKingdom && !isJungleExpedition && !isCoasterCarnival && !isLavaLabyrinth && !isCrystalGlacier && !isTitansRest) {
      const firstLightMainDepth = 3.4;
      const island = isAssemblyCraterFirstLight && island1Materials
        ? createIsland1AssemblyCraterTerrain(qualityProfile.id, {
          top: materials.grass,
          cliff: materials.reef,
          innerSoil: island1Materials.bark,
          innerRock: materials.reef,
          rim: island1Materials.gold,
        })
        : createTerrainPlate({
          radius: 6.25,
          depth: isFirstLightKingdom ? firstLightMainDepth : 0.82,
          segments: qualityProfile.terrainSegments,
          topMaterial: materials.grass,
          reefMaterial: materials.reef,
          // First Light is a tall ocean-rooted island. Keep the gameplay crown
          // at the shared Y while extending its cliff body down into the sea.
          position: [0, isFirstLightKingdom ? 0.26 - firstLightMainDepth * 0.32 : 0, 0],
          seed: 0x15c05a,
        });
      // Celestial Sky Kingdom and Moonveil own their deeper procedural roots.
      island.visible = !isCelestialSkyKingdom && !isMoonveilNexus;
      scene.add(island);
      if (isAssemblyCraterFirstLight) assemblySurfaceCutawayRoots.push(island);

      ISLAND_5_LANDMARKS.filter((entry) => entry.id !== 'boss' && !isAssemblyCraterFirstLight).forEach((landmark, landmarkIndex) => {
        const firstLightSatelliteDepth = 3.1;
        const satellite = createTerrainPlate({
          radius: isFirstLightKingdom ? 2.3 : 2.58,
          depth: isFirstLightKingdom ? firstLightSatelliteDepth : 0.68,
          segments: qualityProfile.terrainSegments,
          topMaterial: materials.grass,
          reefMaterial: materials.reef,
          position: isFirstLightKingdom
            ? [landmark.position[0], 0.26 - firstLightSatelliteDepth * 0.32, landmark.position[2]]
            : landmark.position,
          seed: 0x51a7 + landmarkIndex * 0x913,
        });
        satellite.visible = !isCelestialSkyKingdom && !isMoonveilNexus;
        scene.add(satellite);
        if (isAssemblyCraterFirstLight) assemblySurfaceCutawayRoots.push(satellite);
        const bridgeStart: readonly [number, number, number] = [landmark.position[0] * 0.56, 0, landmark.position[2] * 0.56];
        const bridgeEnd: readonly [number, number, number] = [landmark.position[0] * 0.82, 0, landmark.position[2] * 0.82];
        const sharedBridge = createBridge(bridgeStart, bridgeEnd, materials.bridge);
        sharedBridge.visible = !isMoonveilNexus;
        scene.add(sharedBridge);
        if (isAssemblyCraterFirstLight) assemblySurfaceCutawayRoots.push(sharedBridge);
      });

      const innerLagoon = new THREE.Mesh(new THREE.CircleGeometry(2.25, qualityProfile.terrainSegments), waterMaterial.clone());
      innerLagoon.rotation.x = -Math.PI / 2;
      innerLagoon.position.y = 0.255;
      innerLagoon.receiveShadow = true;
      // The preserved First Light world uses this decorative lagoon beneath
      // its Sun Court. Runtime Island 001 is a dry excavation: leaving the
      // lagoon enabled seals the access throat with a turquoise disc and makes
      // the underground parliament read like a shallow swimming pool.
      innerLagoon.visible = !isMoonveilNexus && !isAssemblyCraterFirstLight;
      scene.add(innerLagoon);
    }

    const livingAmbience: Island5AmbienceRuntime = isCoasterCarnival && island19CircuitGBoard
      ? { root: island19CircuitGBoard.root, animate: island19CircuitGBoard.animate }
      : isCoasterCarnival && island19CircuitFWorld && isCircuitFPreviewEnabled
      ? { root: island19CircuitFWorld.root, animate: island19CircuitFWorld.animate }
      : isCoasterCarnival && island19HybridOverlay
      ? { root: island19HybridOverlay.root, animate: island19HybridOverlay.animate }
      : isFirstLightKingdom && island1Materials
      ? createIsland1LivingAmbience(scene, qualityProfile, island1Materials, water, materials.reef, { batchStatic: isAssemblyCraterFirstLight })
      : isCelestialSkyKingdom && island2CelestialMaterials
        ? createIsland2CelestialLivingAmbience(scene, qualityProfile, island2CelestialMaterials, water)
        : isFrostmoonHaven && island3FrostmoonMaterials
          ? createIsland3FrostmoonLivingAmbience(scene, qualityProfile, island3FrostmoonMaterials, water)
          : isDriftwoodIsle && island4DriftwoodMaterials
            ? createIsland4DriftwoodLivingAmbience(scene, qualityProfile, island4DriftwoodMaterials, water,
                createIsland5LivingAmbience(scene, renderer, qualityProfile, materials, water))
          : isSunshoreAtoll && island5SunshoreMaterials
            ? createIsland5SunshoreLivingAmbience(scene, qualityProfile, island5SunshoreMaterials, water)
            : isMoonveilNexus && island6MoonveilMaterials
              ? createIsland6MoonveilLivingAmbience(scene, qualityProfile, island6MoonveilMaterials, water)
            : isAbyssalPearlKingdom && island7UnderwaterMaterials
              ? createIsland7UnderwaterLivingAmbience(scene, qualityProfile, island7UnderwaterMaterials, water)
            : isEverblossomKingdom && island8EverblossomMaterials
              ? createIsland8EverblossomLivingAmbience(scene, qualityProfile, island8EverblossomMaterials, water)
            : isHeartshaftCrucible && island9HeartshaftMaterials
              ? createIsland9HeartshaftLivingAmbience(scene, qualityProfile, island9HeartshaftMaterials, water)
            : isRootheartCanopyCity && island10RootheartMaterials
              ? createIsland10RootheartLivingAmbience(scene, qualityProfile, island10RootheartMaterials, water)
            : isSunkenSands && island12SunkenSandsMaterials
              ? createIsland12SunkenSandsLivingAmbience(scene, qualityProfile, island12SunkenSandsMaterials, water, buildLevelRef.current)
            : isCactusCanyon && island13CactusCanyonMaterials
              ? createIsland13CactusCanyonLivingAmbience(scene, qualityProfile, island13CactusCanyonMaterials)
            : isFishermansVillage && island22FishermansVillageMaterials
              ? createIsland22FishermansVillageLivingAmbience(scene, qualityProfile, island22FishermansVillageMaterials, water)
            : isHoneycombKingdom && island14HoneycombMaterials
              ? createIsland14HoneycombLivingAmbience(scene, qualityProfile, island14HoneycombMaterials)
            : isJungleExpedition && island18JungleExpeditionMaterials
              ? createIsland18JungleExpeditionLivingAmbience(scene, qualityProfile, island18JungleExpeditionMaterials)
            : isLavaLabyrinth && island20LavaLabyrinthMaterials
              ? createIsland20LavaLabyrinthLivingAmbience(scene, qualityProfile, island20LavaLabyrinthMaterials, buildLevel)
            : isCrystalGlacier && island15CrystalGlacierMaterials
              ? createIsland15CrystalGlacierLivingAmbience(scene, qualityProfile, island15CrystalGlacierMaterials, water)
            : isTitansRest && island17TitansRestMaterials
              ? createIsland17TitansRestLivingAmbience(scene, qualityProfile, island17TitansRestMaterials, water)
            : createIsland5LivingAmbience(scene, renderer, qualityProfile, materials, water);
    const jungleInspectionOccluders = isJungleExpedition
      ? [
          'ISLAND_18_INSTANCED_JUNGLE_CANOPY_FIELD',
          'ISLAND_18_INSTANCED_PALM_GROVE',
          'ISLAND_18_INSTANCED_UNDERSTORY_FIELD',
          'ISLAND_18_TEMPLE_OVERGROWTH_FIELD',
          'ISLAND_18_HANGING_VINES',
          'ISLAND_18_DEPTH_ISLAND_NETWORK',
        ].map((name) => livingAmbience.root.getObjectByName(name)).filter(Boolean) as THREE.Object3D[]
      : [];
    let jungleInspectionOccludersHidden = false;
    const constructionWildlife: THREE.Object3D[] = [];
    if (isFrostmoonHaven) livingAmbience.root.traverse((child) => {
      if (child.name === 'ISLAND_3_SNOW_HARE') constructionWildlife.push(child);
    });
    const constructionWildlifeVisibility = new Map<THREE.Object3D, boolean>();
    if (isAssemblyCraterFirstLight) {
      // Island 001 no longer has the central lagoon. Keep First Light's wider
      // living world, but remove the fish school that otherwise appears to
      // orbit in mid-air at the centre of the dry excavation. Island 011 still
      // receives the complete preserved ambience through its separate route.
      livingAmbience.root.traverse((child) => {
        if (child.name.startsWith('ISLAND_1_LAGOON_FISH_')) child.visible = false;
      });
    }
    const firstLightAssemblyCrater = isAssemblyCraterFirstLight && island1Materials
      ? createIsland1AssemblyCraterRuntime(scene, qualityProfile.id, island1Materials)
      : null;
    firstLightAssemblyCrater?.updateAssemblyCrater(firstLightAssemblyCraterPresentationRef.current, true);
    if (isFrostmoonHaven) {
      livingAmbience.updateSignatureMission?.({ ...signatureMissionPresentationRef.current, reducedMotion: isReducedMotion });
    }
    if (isCelestialSkyKingdom) {
      livingAmbience.updateRedocking?.(celestialRedockingPresentationRef.current, true);
    }
    if (isRootheartCanopyCity) {
      livingAmbience.updatePowerworksStage?.(rootheartPowerworksPresentationRef.current);
    }
    if (isSunkenSands) {
      livingAmbience.updateTreasureProgress?.(sunkenSandsTreasurePresentationRef.current, true);
    }
    if (isCactusCanyon) {
      livingAmbience.updateSpiralRail?.(cactusCanyonSpiralPresentationRef.current);
    }
    const island15PalaceAttachmentRoot = new THREE.Group();
    island15PalaceAttachmentRoot.name = 'ISLAND_15_CRYSTAL_PALACE_ATTACHMENT_ROOT';
    if (isCrystalGlacier) livingAmbience.root.add(island15PalaceAttachmentRoot);
    let island15PalaceRuntime: Island15CrystalPalaceRuntime | null = null;
    let island15PalaceFramingBounds: Island15PalaceFramingBounds | null = null;
    const island15PalaceFramingPoints: Island15CameraPoint[] = [];
    let island15LastExteriorPose: Island15CameraPose | null = null;
    let island15CameraEnvelope: Island15CameraEnvelope = {
      ...ISLAND_15_R17_CAMERA_AUTHORITY.envelope,
    };
    if (isHoneycombKingdom) {
      livingAmbience.setGreatHoneyfallStage?.(greatHoneyfallPresentationRef.current.activatedReservoirs, false);
    }
    if (isLavaLabyrinth) {
      livingAmbience.setIronSkiffStage?.(stagedRestorationPresentationRef.current?.activatedStages ?? 0, false);
      livingAmbience.updateIronSkiffNavigation?.(island20SkiffNavigationRef.current);
    }
    if (isFishermansVillage) {
      livingAmbience.updateWaterDragonMission?.(fishermansFishingPresentationRef.current);
      const fishing = fishermansFishingPresentationRef.current.fishingInteraction;
      if (fishing) livingAmbience.updateFishingInteraction?.(fishing);
    }
    const resolveStagedRestorationPresentation = (elapsed = 0): IslandStagedRestorationPresentation | null => (
      jungleZenithPreviewEnabled
        ? {
            islandNumber: JUNGLE_EXPEDITION_ISLAND_NUMBER,
            activatedStages: 5,
            stageCount: 5,
            constructionSequence: 10_000 + Math.floor(elapsed / 15.5),
            claimedPickupTileIndices: [2, 9, 16, 25, 34],
          }
        : jungleMissionPreviewStage !== null
          ? {
              islandNumber: JUNGLE_EXPEDITION_ISLAND_NUMBER,
              activatedStages: jungleMissionPreviewStage,
              stageCount: 5,
              constructionSequence: 20_000 + (jungleMissionPreviewReplay ? Math.floor(elapsed / 7.5) : 0),
              claimedPickupTileIndices: [2, 9, 16, 25, 34].slice(0, jungleMissionPreviewStage),
            }
        : stagedRestorationPresentationRef.current ?? null
    );
    const stagedRestorationInitial = resolveStagedRestorationPresentation();
    const stagedRestorationRuntime = stagedRestorationInitial?.islandNumber === 17
      && livingAmbience.updateStagedRestoration && livingAmbience.missionHitTarget
      ? {
          root: livingAmbience.root,
          missionHitTarget: livingAmbience.missionHitTarget,
          update: livingAmbience.updateStagedRestoration,
          animate: (_elapsed: number, reducedMotion: boolean) => {
            if (reducedMotion) livingAmbience.animate(0);
          },
        }
      : stagedRestorationInitial
        && stagedRestorationInitial.islandNumber !== 17
        && stagedRestorationInitial.islandNumber !== 20
        && [4, 6, 7, 8, 9, 18, 19].includes(stagedRestorationInitial.islandNumber)
      ? createIslandStagedRestorationThreePresentation({
          islandNumber: stagedRestorationInitial.islandNumber,
          stageCount: stagedRestorationInitial.stageCount,
          quality: qualityProfile.id,
        })
      : null;
    if (stagedRestorationRuntime && stagedRestorationInitial) {
      if (!stagedRestorationRuntime.root.parent) scene.add(stagedRestorationRuntime.root);
      stagedRestorationRuntime.update(stagedRestorationInitial, true);
    }
    if (isJungleExpedition && stagedRestorationInitial) {
      livingAmbience.setLivingCompassStage?.({
        activatedStages: stagedRestorationInitial.activatedStages,
        constructionSequence: stagedRestorationInitial.constructionSequence,
        completed: stagedRestorationInitial.activatedStages >= stagedRestorationInitial.stageCount,
      }, jungleZenithPreviewEnabled || jungleMissionPreviewStage !== null);
    }
    let stagedRestorationPresentationKey = stagedRestorationInitial
      ? `${stagedRestorationInitial.titanAwakening?.revision ?? 0}:${stagedRestorationInitial.activatedStages}:${stagedRestorationInitial.constructionSequence ?? 0}:${(stagedRestorationInitial.claimedPickupTileIndices ?? []).join(',')}`
      : '';
    let ironSkiffPresentationKey = isLavaLabyrinth && stagedRestorationInitial
      ? `${stagedRestorationInitial.activatedStages}:${stagedRestorationInitial.constructionSequence ?? 0}`
      : '';
    const clickableSignatureMissions = stagedRestorationRuntime
      ? [stagedRestorationRuntime.missionHitTarget, ...(isTitansRest ? [livingAmbience.root.getObjectByName('ISLAND_17_AWAKENING_HIT_TARGET')!].filter(Boolean) : [])]
      : isAssemblyCraterFirstLight
      ? [scene.getObjectByName('ISLAND_1_ASSEMBLY_CRATER_MISSION_HIT_TARGET')].filter(
          (candidate): candidate is THREE.Object3D => Boolean(candidate),
        )
      : isFrostmoonHaven
      ? [livingAmbience.root.getObjectByName('ISLAND_3_FROSTWELL_ICEWORKS_OFFSHORE_ROOT')].filter(
          (candidate): candidate is THREE.Object3D => Boolean(candidate),
        )
      : isRootheartCanopyCity
        ? [livingAmbience.root.getObjectByName('ISLAND_10_ROOTHEART_POWERWORKS')].filter(
            (candidate): candidate is THREE.Object3D => Boolean(candidate),
          )
        : isSunkenSands
          ? [scene.getObjectByName('ISLAND_12_CITADEL_PRESENTATION_ONLY_PLACEHOLDER_TOKEN')].filter(
              (candidate): candidate is THREE.Object3D => Boolean(candidate),
            )
        : isCactusCanyon
          ? [scene.getObjectByName('ISLAND_13_SPIRAL_RAIL_MISSION_HIT_TARGET')].filter(
              (candidate): candidate is THREE.Object3D => Boolean(candidate),
            )
        : isHoneycombKingdom
          ? [livingAmbience.root.getObjectByName('ISLAND_14_GREAT_HONEYFALL_MISSION_HIT_TARGET')].filter(
              (candidate): candidate is THREE.Object3D => Boolean(candidate),
            )
        : isLavaLabyrinth
          ? [livingAmbience.root.getObjectByName('ISLAND_20_IRON_SKIFF_ESCAPE_MISSION')].filter(
              (candidate): candidate is THREE.Object3D => Boolean(candidate),
            )
        : [];
    const clickableRideTrain = isCactusCanyon
      ? [livingAmbience.root.getObjectByName('ISLAND_13_LOCOMOTIVE_ORBIT')].filter(
          (candidate): candidate is THREE.Object3D => Boolean(candidate),
        )
      : isCoasterCarnival && island19CircuitFWorld && isCircuitFPreviewEnabled
        ? [island19CircuitFWorld.train]
        : [];

    const sharedTileTransforms = buildIsland5TileTransforms(TILE_ANCHORS_36);
    const tileTransforms = isFishermansVillage
      ? sharedTileTransforms.map((transform) => ({
          ...transform,
          position: [
            transform.position[0],
            transform.position[1] + ISLAND_22_BOARD_PRESENTATION_Y_OFFSET,
            transform.position[2],
          ] as const,
        }))
      : sharedTileTransforms;
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
              new THREE.MeshStandardMaterial({ color: 0xe8f2ef, roughness: 0.72 }),
              new THREE.MeshStandardMaterial({ color: 0x668e9d, roughness: 0.56, metalness: 0.07 }),
              new THREE.MeshStandardMaterial({ color: 0xd9c18b, roughness: 0.4, metalness: 0.28, emissive: 0x725328, emissiveIntensity: 0.1 }),
            ]
          : isDriftwoodIsle
            ? [
                new THREE.MeshStandardMaterial({ color: 0xe9d8b5, roughness: 0.74 }),
                new THREE.MeshStandardMaterial({ color: 0xa67ade, roughness: 0.5, metalness: 0.08 }),
                new THREE.MeshStandardMaterial({ color: 0xe6a84f, roughness: 0.34, metalness: 0.34, emissive: 0x6b3510, emissiveIntensity: 0.15 }),
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
      : isEverblossomKingdom
        ? [
            new THREE.MeshStandardMaterial({ color: 0xeadcb7, roughness: 0.66, metalness: 0.02 }),
            new THREE.MeshStandardMaterial({ color: 0xf4e8c5, roughness: 0.59, metalness: 0.02 }),
            new THREE.MeshStandardMaterial({ color: 0xc8a54c, roughness: 0.33, metalness: 0.56, emissive: 0x3f2504, emissiveIntensity: 0.08 }),
          ]
      : isHeartshaftCrucible
        ? [
            new THREE.MeshStandardMaterial({ color: 0x4a4446, roughness: 0.72, metalness: 0.06 }),
            new THREE.MeshStandardMaterial({ color: 0x332e32, roughness: 0.66, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: 0xb7672f, roughness: 0.29, metalness: 0.68, emissive: 0x702000, emissiveIntensity: 0.2 }),
          ]
      : isRootheartCanopyCity
        ? [
            new THREE.MeshPhysicalMaterial({ color: 0xc48a4d, roughness: 0.57, metalness: 0.01, clearcoat: 0.16, clearcoatRoughness: 0.48 }),
            new THREE.MeshPhysicalMaterial({ color: 0x4f3421, roughness: 0.74, metalness: 0.01, clearcoat: 0.08, emissive: 0x183d1d, emissiveIntensity: 0.2 }),
            new THREE.MeshPhysicalMaterial({ color: 0xc8a24e, roughness: 0.32, metalness: 0.56, clearcoat: 0.38, emissive: 0x62400d, emissiveIntensity: 0.16 }),
          ]
      : isSunkenSands
        ? [
            new THREE.MeshPhysicalMaterial({ color: 0xe5c27b, roughness: 0.67, metalness: 0.01, clearcoat: 0.12, clearcoatRoughness: 0.46 }),
            new THREE.MeshPhysicalMaterial({ color: 0xb77745, roughness: 0.72, metalness: 0.01, clearcoat: 0.08 }),
            new THREE.MeshPhysicalMaterial({ color: 0xc99635, roughness: 0.31, metalness: 0.68, clearcoat: 0.42, emissive: 0x4b2a08, emissiveIntensity: 0.14 }),
          ]
      : isCactusCanyon
        ? [
            new THREE.MeshStandardMaterial({ color: 0xd89a5b, roughness: 0.84, metalness: 0.01 }),
            new THREE.MeshStandardMaterial({ color: 0x7d3b27, roughness: 0.76, metalness: 0.03 }),
            new THREE.MeshStandardMaterial({ color: 0xc28235, roughness: 0.34, metalness: 0.68, emissive: 0x3b1604, emissiveIntensity: 0.15 }),
          ]
      : isFishermansVillage
        ? [
            new THREE.MeshPhysicalMaterial({
              color: 0xffe7ad,
              roughness: 0.42,
              metalness: 0.02,
              clearcoat: 0.46,
              clearcoatRoughness: 0.32,
              emissive: 0x6a3908,
              emissiveIntensity: 0.1,
            }),
            new THREE.MeshPhysicalMaterial({
              color: 0x7edbd0,
              roughness: 0.32,
              metalness: 0.04,
              clearcoat: 0.58,
              clearcoatRoughness: 0.24,
              emissive: 0x0d5d59,
              emissiveIntensity: 0.16,
            }),
            new THREE.MeshPhysicalMaterial({
              color: 0xf4c653,
              roughness: 0.25,
              metalness: 0.5,
              clearcoat: 0.62,
              clearcoatRoughness: 0.2,
              emissive: 0x7d4507,
              emissiveIntensity: 0.22,
            }),
          ]
      : isCoasterCarnival && isCircuitFPreviewEnabled
        ? [
            new THREE.MeshStandardMaterial({ color: 0xead8b0, roughness: 0.7, metalness: 0.02 }),
            new THREE.MeshStandardMaterial({ color: 0x319394, roughness: 0.48, metalness: 0.16 }),
            new THREE.MeshPhysicalMaterial({ color: 0xe8b94d, roughness: 0.28, metalness: 0.72, clearcoat: 0.34, clearcoatRoughness: 0.18 }),
          ]
      : isCoasterCarnival
        ? [
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
          ]
      : isHoneycombKingdom
        ? [
            new THREE.MeshStandardMaterial({ color: 0xffedbd, roughness: 0.62, metalness: 0.03 }),
            new THREE.MeshStandardMaterial({ color: 0xe7a31d, roughness: 0.4, metalness: 0.28, emissive: 0x7a3d05, emissiveIntensity: 0.08 }),
            new THREE.MeshStandardMaterial({ color: 0xffcf4e, roughness: 0.29, metalness: 0.58, emissive: 0x9d5107, emissiveIntensity: 0.18 }),
          ]
      : isJungleExpedition
        ? [
            new THREE.MeshPhysicalMaterial({ color: 0xf2e4b8, roughness: 0.58, metalness: 0.04, clearcoat: 0.22, clearcoatRoughness: 0.4 }),
            new THREE.MeshPhysicalMaterial({ color: 0x6745a8, roughness: 0.42, metalness: 0.12, clearcoat: 0.32, emissive: 0x25145b, emissiveIntensity: 0.24 }),
            new THREE.MeshPhysicalMaterial({ color: 0x35d47e, roughness: 0.22, metalness: 0.42, clearcoat: 0.76, emissive: 0x087747, emissiveIntensity: 0.52 }),
          ]
      : isLavaLabyrinth
        ? [
            new THREE.MeshStandardMaterial({ color: 0x312b2a, roughness: 0.78, metalness: 0.08, emissive: 0x2a0702, emissiveIntensity: 0.13 }),
            new THREE.MeshStandardMaterial({ color: 0x171313, roughness: 0.7, metalness: 0.16, emissive: 0x3a0c03, emissiveIntensity: 0.12 }),
            new THREE.MeshStandardMaterial({ color: 0xb96f2e, roughness: 0.3, metalness: 0.72, emissive: 0x7d1904, emissiveIntensity: 0.32 }),
          ]
      : [
          new THREE.MeshStandardMaterial({ color: 0xf3e4bd, roughness: 0.7 }),
          new THREE.MeshStandardMaterial({ color: 0x8c67cf, roughness: 0.56 }),
          new THREE.MeshStandardMaterial({ color: 0xf2c861, roughness: 0.42, metalness: 0.18 }),
        ];
    if (isCactusCanyon || isFishermansVillage || isJungleExpedition || isLavaLabyrinth) {
      // The canyon tiles sit very close to the sandy mesa cap. A stable depth
      // bias prevents their coplanar fragments from alternating while the
      // camera or tile-impact animation moves, without changing board logic.
      tileMaterials.forEach((material) => {
        material.polygonOffset = true;
        material.polygonOffsetFactor = -2;
        material.polygonOffsetUnits = -4;
        material.depthTest = true;
        material.depthWrite = true;
      });
    }
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
    const honeycombTileEdgeGeometry = isHoneycombKingdom ? createTileBorderMeshGeometry(tileGeometry) : null;
    const honeycombTileEdgeMaterials = isHoneycombKingdom
      ? [
          new THREE.MeshBasicMaterial({ color: 0x6c3208, transparent: true, opacity: 0.82 }),
          new THREE.MeshBasicMaterial({ color: 0xffdd62, transparent: true, opacity: 0.96 }),
        ]
      : [];
    const jungleTileEdgeGeometry = isJungleExpedition ? createTileBorderMeshGeometry(tileGeometry, 0.024) : null;
    const jungleTileEdgeMaterials = isJungleExpedition
      ? [
          new THREE.MeshStandardMaterial({ color: 0x8e6b22, roughness: 0.34, metalness: 0.72, emissive: 0x3c2504, emissiveIntensity: 0.16 }),
          new THREE.MeshStandardMaterial({ color: 0x76f5aa, roughness: 0.22, metalness: 0.54, emissive: 0x16784b, emissiveIntensity: 0.48 }),
        ]
      : [];
    const fishermansTileEdgeGeometry = isFishermansVillage
      ? createTileBorderMeshGeometry(tileGeometry, 0.026)
      : null;
    const fishermansTileEdgeMaterials = isFishermansVillage
      ? [
          new THREE.MeshStandardMaterial({
            color: 0xc77a28,
            roughness: 0.3,
            metalness: 0.72,
            emissive: 0x643006,
            emissiveIntensity: 0.2,
          }),
          new THREE.MeshStandardMaterial({
            color: 0xffdc72,
            roughness: 0.22,
            metalness: 0.78,
            emissive: 0x9a5709,
            emissiveIntensity: 0.34,
          }),
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
    const useInstancedRouteTiles = isFrostmoonHaven || isDriftwoodIsle || isSunshoreAtoll || isAssemblyCraterFirstLight || isCelestialSkyKingdom || isAbyssalPearlKingdom || isSunkenSands || isCactusCanyon || isFishermansVillage || isHoneycombKingdom || isJungleExpedition || isLavaLabyrinth || (isCoasterCarnival && !isCircuitGBoardPreviewEnabled);
    const instancedTileCounts = Array(isAssemblyCraterFirstLight ? 6 : 3).fill(0) as number[];
    if (useInstancedRouteTiles) {
      tileTransforms.forEach((transform) => {
        instancedTileCounts[(transform.isKeyTile ? 2 : transform.index % 2) + (isAssemblyCraterFirstLight && transform.position[2] > 0 ? 3 : 0)] += 1;
      });
    }
    const instancedTileMeshes = useInstancedRouteTiles
      ? instancedTileCounts.map((count, materialIndex) => {
          const mesh = new THREE.InstancedMesh(tileGeometry, tileMaterials[materialIndex % 3], count);
          mesh.userData.assemblyNearRoute = isAssemblyCraterFirstLight && materialIndex >= 3;
          mesh.name = isAssemblyCraterFirstLight
            ? `ISLAND_001_TILE_SURFACE_BATCH_${materialIndex + 1}`
            : isCelestialSkyKingdom
              ? `ISLAND_002_TILE_SURFACE_BATCH_${materialIndex + 1}`
            : isSunshoreAtoll
              ? `ISLAND_005_TILE_SURFACE_BATCH_${materialIndex + 1}`
            : isSunkenSands
            ? `ISLAND_12_TILE_SURFACE_BATCH_${materialIndex + 1}`
            : isCactusCanyon
              ? `ISLAND_13_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : isFishermansVillage
                ? `ISLAND_22_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : isHoneycombKingdom
                ? `ISLAND_14_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : isJungleExpedition
                ? `ISLAND_18_JUNGLE_ROUTE_TILE_BATCH_${materialIndex + 1}`
              : isLavaLabyrinth
                ? `ISLAND_20_TILE_SURFACE_BATCH_${materialIndex + 1}`
                : isCoasterCarnival
                  ? `ISLAND_19_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : isFrostmoonHaven ? `ISLAND_3_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : isDriftwoodIsle ? `ISLAND_4_TILE_SURFACE_BATCH_${materialIndex + 1}`
              : `ISLAND_7_TILE_SURFACE_BATCH_${materialIndex + 1}`;
          if (isAbyssalPearlKingdom && materialIndex === 0) {
            mesh.userData.sculptRuntime = {
              parts: [registerIsland7RuntimePart('route-integration', mesh, 'canonical-board-route')],
              colliders: [{ id: 'island-007-board-route', type: 'compound-ring', isTrigger: true }],
            };
          }
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          if (isCactusCanyon) mesh.renderOrder = 2;
          mesh.castShadow = sceneUsesRealtimeShadows;
          mesh.receiveShadow = true;
          scene.add(mesh);
          return mesh;
        })
      : [];
    const abyssalTileEdgeMeshes = isAbyssalPearlKingdom
      ? instancedTileCounts.map((count, materialIndex) => {
          const edgeMaterial = abyssalTileEdgeMaterials[materialIndex === 2 ? 1 : 0];
          const mesh = new THREE.InstancedMesh(abyssalTileEdgeGeometry!, edgeMaterial, count);
          mesh.name = `ISLAND_7_TILE_BORDER_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          scene.add(mesh);
          return mesh;
        })
      : [];
    const honeycombTileEdgeMeshes = isHoneycombKingdom
      ? instancedTileCounts.map((count, materialIndex) => {
          const edgeMaterial = honeycombTileEdgeMaterials[materialIndex === 2 ? 1 : 0];
          const mesh = new THREE.InstancedMesh(honeycombTileEdgeGeometry!, edgeMaterial, count);
          mesh.name = `ISLAND_14_TILE_GILDED_EDGE_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.renderOrder = 3;
          scene.add(mesh);
          return mesh;
        })
      : [];
    const jungleTileEdgeMeshes = isJungleExpedition
      ? instancedTileCounts.map((count, materialIndex) => {
          const edgeMaterial = jungleTileEdgeMaterials[materialIndex === 2 ? 1 : 0];
          const mesh = new THREE.InstancedMesh(jungleTileEdgeGeometry!, edgeMaterial, count);
          mesh.name = `ISLAND_18_BRASS_EMERALD_TILE_RIM_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.renderOrder = 4;
          scene.add(mesh);
          return mesh;
        })
      : [];
    const fishermansTileEdgeMeshes = isFishermansVillage
      ? instancedTileCounts.map((count, materialIndex) => {
          const edgeMaterial = fishermansTileEdgeMaterials[materialIndex === 2 ? 1 : 0];
          const mesh = new THREE.InstancedMesh(fishermansTileEdgeGeometry!, edgeMaterial, count);
          mesh.name = `ISLAND_22_TILE_BRASS_RIM_BATCH_${materialIndex + 1}`;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.renderOrder = 4;
          scene.add(mesh);
          return mesh;
        })
      : [];
    const instancedTileInstanceCursor = instancedTileCounts.map(() => 0);
    const tileMatrixScratch = new THREE.Matrix4();
    const tileQuaternionScratch = new THREE.Quaternion();
    const tileScaleScratch = new THREE.Vector3(
      isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1,
      isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.34 : 1,
      isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1,
    );
    const assemblyCameraBasePosition = new THREE.Vector3();
    const assemblyCameraShakeOffset = new THREE.Vector3();
    for (const transform of tileTransforms) {
      // Island 014's layered wax terraces rise slightly higher than the shared
      // coastal cap. Lift only the rendered blocks so the canonical 36 stop
      // coordinates and progression semantics stay unchanged while every
      // individual tile face and gilded joint remains visible.
      const tileVisualY = transform.position[1] + (isHoneycombKingdom ? 0.08 : isJungleExpedition ? 0.06 : isLavaLabyrinth ? 0.05 : 0);
      if (island19CircuitGBoard) {
        const circuitGTile = island19CircuitGBoard.tileMeshes[transform.index];
        if (!circuitGTile) throw new Error(`Circuit G board is missing canonical tile ${transform.index}.`);
        tileMeshes.set(transform.index, { mesh: circuitGTile, baseY: 0 });
        continue;
      }
      const tileMaterial = transform.isKeyTile ? tileMaterials[2] : tileMaterials[transform.index % 2];
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.position.set(transform.position[0], tileVisualY, transform.position[2]);
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
      if (useInstancedRouteTiles) {
        const materialIndex = (transform.isKeyTile ? 2 : transform.index % 2) + (isAssemblyCraterFirstLight && transform.position[2] > 0 ? 3 : 0);
        const instanceId = instancedTileInstanceCursor[materialIndex];
        instancedTileInstanceCursor[materialIndex] += 1;
        const batch = instancedTileMeshes[materialIndex];
        tileQuaternionScratch.setFromAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotationYRad);
        tileMatrixScratch.compose(
          new THREE.Vector3(transform.position[0], tileVisualY, transform.position[2]),
          tileQuaternionScratch,
          tileScaleScratch,
        );
        batch.setMatrixAt(instanceId, tileMatrixScratch);
        batch.instanceMatrix.needsUpdate = true;
        const edgeBatch = abyssalTileEdgeMeshes[materialIndex]
          ?? honeycombTileEdgeMeshes[materialIndex]
          ?? jungleTileEdgeMeshes[materialIndex]
          ?? fishermansTileEdgeMeshes[materialIndex];
        if (edgeBatch) {
          edgeBatch.setMatrixAt(instanceId, tileMatrixScratch);
          edgeBatch.instanceMatrix.needsUpdate = true;
        }
        tileMeshes.set(transform.index, {
          mesh: batch,
          baseY: tileVisualY,
          instanceId,
          edgeMesh: edgeBatch,
          basePosition: new THREE.Vector3(transform.position[0], tileVisualY, transform.position[2]),
          baseRotationY: transform.rotationYRad,
        });
      } else {
        tileMeshes.set(transform.index, { mesh: tile, baseY: tileVisualY });
        scene.add(tile);
      }
    }

    const rootheartTileDetails = isRootheartCanopyCity
      ? createRootheartTileDetailNetwork(tileTransforms)
      : null;
    if (rootheartTileDetails) scene.add(rootheartTileDetails);

    // Three-dimensional tile rewards are projections of the canonical tile
    // map. They carry no click handlers, wallet logic, or persistence and are
    // intentionally hidden beneath the player piece while its tile is occupied.
    const tileRewardObjects = createIslandRunTileRewardThreeObjects({
      tileMap: sceneTileMap,
      tileTransforms,
      quality: qualityProfile.id,
      compactCollectibles: isFrostmoonHaven || isDriftwoodIsle || isAssemblyCraterFirstLight || isAbyssalPearlKingdom || isSunkenSands || isJungleExpedition || isLavaLabyrinth,
      staticBatchNonMissionRewards: isLavaLabyrinth,
      signatureMissionOnly: isCoasterCarnival,
    });
    tileRewardObjects.setFirstLightClaimedDynamiteTiles(
      firstLightAssemblyCraterPresentationRef.current.claimedDynamiteTileIndices ?? [],
    );
    tileRewardObjects.setStagedRestorationClaimedTiles(
      stagedRestorationPresentationRef.current?.claimedPickupTileIndices ?? [],
    );
    if (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled) tileRewardObjects.root.scale.setScalar(0.62);
    if (isLavaLabyrinth) {
      tileRewardObjects.root.children.forEach((reward) => {
        reward.scale.multiplyScalar(0.72);
        reward.userData.island20CompactScale = 0.72;
      });
    }
    scene.add(tileRewardObjects.root);

    const playerPiece = createIslandPlayerPiece(qualityProfile.id);
    if (isLavaLabyrinth) {
      // Keep the canonical token and all movement semantics, but stop the
      // generic violet/blue hero from overpowering a source-faithful lava city.
      playerPiece.root.children.forEach((child) => {
        child.position.multiplyScalar(0.46);
        child.scale.multiplyScalar(0.46);
      });
      playerPiece.shadow.scale.setScalar(0.46);
      playerPiece.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = object.name === 'ISLAND_5_PLAYER_TOKEN_LIGHT'
          ? island20LavaLabyrinthMaterials!.emberGlass
          : island20LavaLabyrinthMaterials!.blackIron;
      });
      compactStaticGeometry(playerPiece.root, 'ISLAND_20_PLAYER_TOKEN_RUNTIME_BATCH');
      playerPiece.root.userData.island20ThemedScale = 0.46;
    }
    if (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled) playerPiece.root.scale.multiplyScalar(0.62);
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

    const caretakerBoardAvailable = resolveIslandRunFeatureAccess({ currentIslandNumber: islandNumber }).caretakerBoard && !isLavaLabyrinth;
    const boardCaretaker = createCaretakerMaster({ quality: 'low' });
    boardCaretaker.root.name = 'ISLAND_5_CARETAKER_BOARD_LOD';
    boardCaretaker.root.position.copy(CARETAKER_BOARD_HOME);
    boardCaretaker.root.scale.setScalar(CARETAKER_BOARD_SCALE * (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.62 : 1));
    boardCaretaker.root.rotation.y = 0;
    boardCaretaker.root.traverse((child) => {
      child.userData.caretakerTarget = true;
    });
    boardCaretaker.setAnimation('idle', 0, true);
    boardCaretaker.setEmotion('calm');
    scene.add(caretakerFootplate, caretakerContactShadow, caretakerHitTarget, boardCaretaker.root);
    if (!caretakerBoardAvailable) {
      caretakerHitTarget.visible = false;
      boardCaretaker.root.visible = false;
      caretakerFootplate.visible = false;
      caretakerContactShadow.visible = false;
    }
    const clickableCaretaker: THREE.Object3D[] = caretakerBoardAvailable ? [caretakerHitTarget, caretakerFootplate, caretakerContactShadow, boardCaretaker.root] : [];
    let encounterCaretaker: CaretakerModel | null = null;
    let wasCaretakerEncounterOpen = false;
    let caretakerEncounterStartedAt = 0;

    const buildAuthoredLandmark = (
      landmark: Island5LandmarkDefinition,
      resolvedBuildLevel: BuildLevel,
      constructionPreview?: 'current' | 'target',
    ) => (
      isFirstLightKingdom && island1Materials
        ? (isAssemblyCraterFirstLight ? buildIsland1AssemblyLandmark : buildIsland1Landmark)(
            landmark,
            resolvedBuildLevel,
            qualityProfile.id,
            island1Materials,
            { constructionPreview },
          )
        : isCelestialSkyKingdom && island2CelestialMaterials
          ? buildIsland2CelestialLandmark(
              landmark,
              resolvedBuildLevel,
              qualityProfile.id,
              island2CelestialMaterials,
              { constructionPreview },
            )
          : isFrostmoonHaven && island3FrostmoonMaterials
            ? buildIsland3FrostmoonLandmark(
                landmark,
                resolvedBuildLevel,
                qualityProfile.id,
                island3FrostmoonMaterials,
                { constructionPreview },
              )
            : isDriftwoodIsle && island4DriftwoodMaterials
              ? buildLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    materials,
                    resolvedWorldSourceNumber,
                    { constructionPreview },
                )
            : isSunshoreAtoll && island5SunshoreMaterials
              ? buildIsland5SunshoreLandmark(
                  landmark,
                  resolvedBuildLevel,
                  qualityProfile.id,
                  island5SunshoreMaterials,
                  { constructionPreview },
                )
              : isMoonveilNexus && island6MoonveilMaterials
                ? buildIsland6MoonveilLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island6MoonveilMaterials,
                  false,
                    { constructionPreview },
                  )
              : isAbyssalPearlKingdom && island7UnderwaterMaterials
                ? buildIsland7UnderwaterLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island7UnderwaterMaterials,
                    { constructionPreview },
                  )
              : isEverblossomKingdom && island8EverblossomMaterials
                ? buildIsland8EverblossomLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island8EverblossomMaterials,
                    { constructionPreview },
                  )
              : isHeartshaftCrucible && island9HeartshaftMaterials
                ? buildIsland9HeartshaftLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island9HeartshaftMaterials,
                    { constructionPreview },
                  )
              : isRootheartCanopyCity && island10RootheartMaterials
                ? buildIsland10RootheartLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island10RootheartMaterials,
                    { constructionPreview },
                  )
              : isSunkenSands && island12SunkenSandsMaterials
                ? buildIsland12SunkenSandsLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island12SunkenSandsMaterials)
              : isCactusCanyon && island13CactusCanyonMaterials
                ? buildIsland13CactusCanyonLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island13CactusCanyonMaterials)
              : isFishermansVillage && island22FishermansVillageMaterials
                ? buildIsland22FishermansVillageLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island22FishermansVillageMaterials)
              : isHoneycombKingdom && island14HoneycombMaterials
                ? buildIsland14HoneycombLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island14HoneycombMaterials,
                    { constructionPreview },
                  )
              : isJungleExpedition && island18JungleExpeditionMaterials
                ? buildIsland18JungleExpeditionLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island18JungleExpeditionMaterials,
                    { constructionPreview },
                  )
              : isLavaLabyrinth && island20LavaLabyrinthMaterials
                ? buildIsland20LavaLabyrinthLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island20LavaLabyrinthMaterials,
                    { constructionPreview },
                  )
              : isCrystalGlacier && island15CrystalGlacierMaterials
                ? buildIsland15CrystalGlacierLandmark(landmark, resolvedBuildLevel, qualityProfile.id, island15CrystalGlacierMaterials)
              : isTitansRest && island17TitansRestMaterials
                ? buildIsland17TitansRestLandmark(
                    landmark,
                    resolvedBuildLevel,
                    qualityProfile.id,
                    island17TitansRestMaterials,
                    { constructionPreview },
                  )
              : buildLandmark(
                  landmark,
                  resolvedBuildLevel,
                  qualityProfile.id,
                  materials,
                  resolvedWorldSourceNumber,
                  { constructionPreview },
                )
    );

    const clickableLandmarks: THREE.Object3D[] = [];
    const landmarkRootsById = new Map<Island5LandmarkDefinition['id'], THREE.Object3D>();
    const attentionVisuals = new Map<string, { root: THREE.Object3D; level: number; visual: ReturnType<typeof createLandmarkAttentionVisual> }>();
    const landmarkLabelAnchors = new WeakMap<THREE.Object3D, THREE.Vector3>();
    const projectedLandmarkLabel = new THREE.Vector3();
    const island15FallbackRoot = new THREE.Group();
    island15FallbackRoot.name = 'ISLAND_15_CRYSTAL_PALACE_V4_LOADING_FALLBACK';
    if (isCrystalGlacier) scene.add(island15FallbackRoot);
    for (const landmark of ISLAND_5_LANDMARKS) {
      const resolvedBuildLevel = landmarkBuildLevelsRef.current?.[landmark.id] ?? buildLevelRef.current;
      const landmarkRoot = buildAuthoredLandmark(landmark, resolvedBuildLevel);
      if (landmark.id === 'boss' && !isCrystalGlacier) makeLandmarkMaterialsIndependent(landmarkRoot);
      // The representative Island 019 gate intentionally shows only the
      // approved p08/p09/p10/p24 geometry. Generic Crown-of-Tides landmarks
      // would contaminate its source-fidelity review and are replaced family
      // by family after the railway/castle macro slice is accepted.
      if (isCoasterCarnival) landmarkRoot.visible = false;
      (isCrystalGlacier ? island15FallbackRoot : scene).add(landmarkRoot);
      clickableLandmarks.push(landmarkRoot);
      landmarkRootsById.set(landmark.id, landmarkRoot);
      // Capture authored surfaces before the static renderer hides/merges source meshes.
      if (landmarkProgressRef.current) attentionVisuals.set(landmark.id, {
        root: landmarkRoot, level: resolvedBuildLevel, visual: createLandmarkAttentionVisual(landmarkRoot),
      });
      if (isCelestialSkyKingdom && landmark.id !== 'boss') {
        livingAmbience.registerRedockingLandmark?.(landmark.id, landmarkRoot);
      }
      const hitTarget = createLandmarkHitTarget(landmark);
      if (isFishermansVillage) {
        hitTarget.position.x = landmarkRoot.position.x;
        hitTarget.position.z = landmarkRoot.position.z;
      }
      (isCrystalGlacier ? island15FallbackRoot : scene).add(hitTarget);
      clickableLandmarks.push(hitTarget);
    }
    const moonwellRoot = isFrostmoonHaven ? landmarkRootsById.get('event') : null;
    const archiveInspectionParts: THREE.Object3D[] = [];
    if (isFrostmoonHaven || isDriftwoodIsle) landmarkRootsById.get('wisdom')?.traverse(node => {
      if (node.userData.archiveInspectionHide === true) archiveInspectionParts.push(node);
    });
    const moonwellThermalAnimator = moonwellRoot ? createMoonwellThermalAnimator(moonwellRoot) : null;
    let moonwellThermalLastPhase = '';
    let moonwellThermalCompletedSequence = -1;
    // The live construction crew shares this renderer and reads the real
    // landmark bounds. It is intentionally absent from clickableLandmarks.
    canvas.dataset.constructionRendererGeneration = String(performance.now());
    const constructionFamily = createRobotFamilyModel({ quality: 'low', showAddonRack: false });
    const constructionTheatre = createRobotConstructionTheatre({
      family: constructionFamily,
      quality: 'low',
      showBuildingEnvelope: false,
    });
    // The family lab keeps showroom scale. On a live landmark these are a
    // coordinated miniature work crew, with matching tools and payloads.
    constructionTheatre.setCrewScale(0.11);
    const constructionCommissioningFx = createIslandConstructionCommissioningFx();
    const constructionAnchor = new THREE.Group();
    constructionAnchor.name = 'ISLAND_RUN_BUILD_MODAL_CONSTRUCTION_ANCHOR';
    constructionAnchor.visible = false;
    const constructionStageBuilding = new THREE.Group();
    constructionStageBuilding.name = 'ISLAND_RUN_BUILD_MODAL_AUTHORED_BUILDING_STAGE';
    const jungleConstructionFx = new THREE.Group();
    jungleConstructionFx.name = 'ISLAND_18_LIVING_SCAFFOLD_CONSTRUCTION_FX';
    jungleConstructionFx.visible = false;
    const jungleConstructionRings: THREE.Mesh[] = [];
    let jungleConstructionStones: THREE.InstancedMesh | null = null;
    let jungleConstructionVineHelix: THREE.Mesh | null = null;
    let jungleConstructionTotems: THREE.InstancedMesh | null = null;
    let jungleConstructionMotes: THREE.Points | null = null;
    let jungleConstructionMotePositions: THREE.BufferAttribute | null = null;
    let jungleConstructionMoteMaterial: THREE.PointsMaterial | null = null;
    let jungleConstructionLight: THREE.PointLight | null = null;
    const jungleConstructionMatrix = new THREE.Matrix4();
    const jungleConstructionQuaternion = new THREE.Quaternion();
    const jungleConstructionScale = new THREE.Vector3();
    const jungleConstructionPosition = new THREE.Vector3();
    const jungleConstructionTarget = new THREE.Vector3();
    if (isJungleExpedition && island18JungleExpeditionMaterials) {
      for (let index = 0; index < 3; index += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.7 + index * 0.48, 0.055 + index * 0.008, 7, 40),
          new THREE.MeshBasicMaterial({
            color: index === 1 ? 0xe1ff76 : 0x4cff94,
            transparent: true,
            opacity: 0.68 - index * 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        ring.name = `ISLAND_18_LIVING_SCAFFOLD_VINE_HOOP_${index + 1}`;
        ring.position.y = 1.2 + index * 0.78;
        ring.rotation.set(index === 0 ? Math.PI / 2 : index === 1 ? 0.4 : 1.08, index * 0.62, 0);
        jungleConstructionRings.push(ring);
        jungleConstructionFx.add(ring);
      }
      jungleConstructionStones = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.18, 0),
        island18JungleExpeditionMaterials.ruinStone,
        10,
      );
      jungleConstructionStones.name = 'ISLAND_18_LIVING_SCAFFOLD_LEVITATING_STONES';
      jungleConstructionStones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      jungleConstructionStones.castShadow = true;
      jungleConstructionFx.add(jungleConstructionStones);

      const constructionVineGeometries: THREE.BufferGeometry[] = [];
      for (let vineIndex = 0; vineIndex < 2; vineIndex += 1) {
        const points: THREE.Vector3[] = [];
        for (let pointIndex = 0; pointIndex <= 22; pointIndex += 1) {
          const t = pointIndex / 22;
          const angle = t * Math.PI * 4.4 + vineIndex * Math.PI;
          const radius = 1.75 - t * 0.72;
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0.25 + t * 3.6,
            Math.sin(angle) * radius,
          ));
        }
        constructionVineGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.035, 6, false));
      }
      const constructionVineGeometry = mergeGeometries(constructionVineGeometries, false);
      constructionVineGeometries.forEach((geometry) => geometry.dispose());
      jungleConstructionVineHelix = new THREE.Mesh(
        constructionVineGeometry!,
        new THREE.MeshBasicMaterial({
          color: 0x8fff54,
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      jungleConstructionVineHelix.name = 'ISLAND_18_LIVING_SCAFFOLD_GROWING_VINE_HELIX';
      jungleConstructionVineHelix.visible = false;
      jungleConstructionFx.add(jungleConstructionVineHelix);

      jungleConstructionTotems = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.08, 0.14, 0.82, 7),
        island18JungleExpeditionMaterials.brass,
        8,
      );
      jungleConstructionTotems.name = 'ISLAND_18_LIVING_SCAFFOLD_WAYFINDER_TOTEMS';
      jungleConstructionTotems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      jungleConstructionTotems.visible = false;
      jungleConstructionFx.add(jungleConstructionTotems);

      const constructionMoteCount = qualityProfile.id === 'high' ? 56 : qualityProfile.id === 'medium' ? 38 : 24;
      const constructionMoteCoordinates = new Float32Array(constructionMoteCount * 3);
      const constructionMoteColors = new Float32Array(constructionMoteCount * 3);
      const emeraldMoteColor = new THREE.Color(0x8fff69);
      const amberMoteColor = new THREE.Color(0xffd45d);
      for (let index = 0; index < constructionMoteCount; index += 1) {
        constructionMoteCoordinates[index * 3 + 1] = 0.2;
        const color = index % 5 === 0 ? amberMoteColor : emeraldMoteColor;
        constructionMoteColors[index * 3] = color.r;
        constructionMoteColors[index * 3 + 1] = color.g;
        constructionMoteColors[index * 3 + 2] = color.b;
      }
      const constructionMoteGeometry = new THREE.BufferGeometry();
      constructionMoteGeometry.setAttribute('position', new THREE.BufferAttribute(constructionMoteCoordinates, 3));
      constructionMoteGeometry.setAttribute('color', new THREE.BufferAttribute(constructionMoteColors, 3));
      jungleConstructionMotePositions = constructionMoteGeometry.getAttribute('position') as THREE.BufferAttribute;
      jungleConstructionMoteMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        vertexColors: true,
        size: qualityProfile.id === 'low' ? 0.07 : 0.095,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      jungleConstructionMotes = new THREE.Points(constructionMoteGeometry, jungleConstructionMoteMaterial);
      jungleConstructionMotes.name = 'ISLAND_18_LIVING_SCAFFOLD_CONVERGING_MOTES';
      jungleConstructionFx.add(jungleConstructionMotes);
      jungleConstructionLight = new THREE.PointLight(0x71ff84, 0, 8.5, 1.7);
      jungleConstructionLight.name = 'ISLAND_18_LIVING_SCAFFOLD_BUILD_LIGHT';
      jungleConstructionLight.position.set(0, 2.1, 0);
      jungleConstructionFx.add(jungleConstructionLight);
    }
    constructionFamily.root.visible = false;
    constructionAnchor.add(
      constructionStageBuilding,
      constructionFamily.root,
      constructionTheatre.root,
      constructionCommissioningFx.root,
      jungleConstructionFx,
    );
    scene.add(constructionAnchor);
    canvas.dataset.constructionCrewAllocatedTriangles = String(
      constructionFamily.metrics.triangles + constructionTheatre.metrics.triangles,
    );
    canvas.dataset.constructionCrewAllocatedDrawCalls = String(
      constructionFamily.metrics.drawCalls
      + constructionTheatre.metrics.drawCalls
      + constructionCommissioningFx.metrics.drawCalls,
    );
    // Allocation is deliberately distinguished from render cost. The hidden
    // parent prevents renderer traversal and the animation loop below is also
    // gated, so an idle/closed build theatre contributes zero frame work.
    canvas.dataset.constructionCrewTriangles = '0';
    canvas.dataset.constructionCrewDrawCalls = '0';
    canvas.dataset.constructionCrewRuntime = 'parked';
    const constructionBounds = new THREE.Box3();
    const constructionBoundsSize = new THREE.Vector3();
    const constructionBoundsCenter = new THREE.Vector3();
    const constructionScreenProbe = new THREE.Vector3();
    const constructionPreviewBounds = new THREE.Box3();
    const constructionPreviewSize = new THREE.Vector3();
    const constructionPreviewCenter = new THREE.Vector3();
    let constructionPreviewRoot: THREE.Object3D | null = null;
    let constructionPreviewKey = '';
    let constructionLevelDelta: IslandConstructionLevelDelta | null = null;
    let constructionSourceRoot: THREE.Object3D | null = null;
    const disposeDetachedConstructionRoot = (root: THREE.Object3D) => {
      root.traverse((entry) => {
        if (!(entry instanceof THREE.Mesh || entry instanceof THREE.Line || entry instanceof THREE.Points || entry instanceof THREE.Sprite)) return;
        if (!(entry instanceof THREE.Sprite)) entry.geometry.dispose();
        const entryMaterials = Array.isArray(entry.material) ? entry.material : [entry.material];
        entryMaterials.forEach((material) => material.dispose());
      });
    };
    const ensureConstructionPreview = (
      landmarkId: Island5LandmarkId,
      currentLevel: BuildLevel,
      targetLevel: BuildLevel,
    ) => {
      const previewKey = `${landmarkId}:${currentLevel}->${targetLevel}`;
      if (previewKey === constructionPreviewKey && constructionPreviewRoot) return;
      if (constructionPreviewRoot) {
        constructionStageBuilding.remove(constructionPreviewRoot);
        disposeDetachedConstructionRoot(constructionPreviewRoot);
      }
      constructionLevelDelta = null;
      constructionPreviewKey = previewKey;
      const definition = ISLAND_5_LANDMARKS.find((landmark) => landmark.id === landmarkId);
      if (!definition) {
        constructionPreviewRoot = null;
        return;
      }
      const stage = new THREE.Group();
      stage.name = `ISLAND_RUN_BUILD_MODAL_${landmarkId.toUpperCase()}_L${currentLevel}_TO_L${targetLevel}_DELTA_STAGE`;
      const current = island15PalaceRuntime
        ? island15PalaceRuntime.cloneRoomAtLevel(landmarkId, currentLevel)
        : buildAuthoredLandmark(definition, currentLevel, 'current');
      current.name = `ISLAND_RUN_BUILD_MODAL_${landmarkId.toUpperCase()}_L${currentLevel}_FUNDED_LEVEL`;
      const target = island15PalaceRuntime
        ? island15PalaceRuntime.cloneRoomAtLevel(landmarkId, targetLevel)
        : buildAuthoredLandmark(definition, targetLevel, 'target');
      target.name = `ISLAND_RUN_BUILD_MODAL_${landmarkId.toUpperCase()}_L${targetLevel}_ADDITIVE_TARGET`;
      [current, target].forEach((root) => {
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
        root.scale.set(1, 1, 1);
        stage.add(root);
      });
      stage.updateWorldMatrix(true, true);
      constructionPreviewBounds.makeEmpty();
      target.traverseVisible((entry) => {
        if (entry instanceof THREE.Mesh || entry instanceof THREE.Line || entry instanceof THREE.Points || entry instanceof THREE.Sprite) {
          constructionPreviewBounds.expandByObject(entry, true);
        }
      });
      constructionPreviewBounds.getSize(constructionPreviewSize);
      constructionLevelDelta = prepareIslandConstructionLevelDelta({ currentRoot: current, targetRoot: target });
      if (isDriftwoodIsle && landmarkId === 'boss' && currentLevel > 0) {
        const fundedPalace = current.getObjectByName('OPENING_PALACE');
        if (fundedPalace instanceof THREE.Group) compactOpeningPalaceParts(fundedPalace);
      }
      if ((isFirstLightKingdom || isJungleExpedition) && currentLevel > 0 && current instanceof THREE.Group) {
        const worldPrefix = isJungleExpedition ? 'ISLAND18' : 'ISLAND1';
        compactStaticGeometry(current, `${worldPrefix}_BUILD_MODAL_${landmarkId.toUpperCase()}_L${currentLevel}_FUNDED`);
      }
      if (!island15PalaceRuntime) makeLandmarkMaterialsIndependent(current);
      constructionPreviewRoot = stage;
      constructionStageBuilding.add(stage);
      canvas.dataset.constructionCrewBuilding = `${landmarkId}:L${currentLevel}->L${targetLevel}:additive-delta`;
      canvas.dataset.constructionCrewLevelDelta = `${constructionLevelDelta.retainedMeshCount}:${constructionLevelDelta.additiveMeshCount}`;
      canvas.dataset.constructionCrewRevealStages = JSON.stringify(constructionLevelDelta.stageCounts);
      canvas.dataset.constructionCrewRevealBatches = String(constructionLevelDelta.revealBatchCount);
    };
    let presentedConstructionProgress = 0;
    let targetConstructionProgress = 0;
    let presentedConstructionKey = '';
    const applyConstructionPreviewProgress = (progress: number, working: boolean) => {
      if (presentedConstructionKey !== constructionPreviewKey) {
        presentedConstructionKey = constructionPreviewKey;
        presentedConstructionProgress = Math.min(progress, 0.02);
      }
      targetConstructionProgress = progress;
    };
    const updateConstructionFacing = () => {
      if (!constructionAnchor.visible) return;
      constructionAnchor.rotation.y = Math.atan2(
        camera.position.x - constructionBoundsCenter.x,
        camera.position.z - constructionBoundsCenter.z,
      );
      if (constructionPreviewRoot) {
        // The crew's semantic +Z axis follows the camera, but the building
        // retains its authored world orientation throughout camera travel.
        constructionPreviewRoot.rotation.y = -constructionAnchor.rotation.y;
        // Counter-rotate the centering translation too. Otherwise an
        // asymmetric landmark drifts sideways as the crew faces the camera.
        constructionPreviewRoot.position.set(
          -constructionPreviewCenter.x * constructionPreviewRoot.scale.x,
          -constructionPreviewBounds.min.y * constructionPreviewRoot.scale.y,
          -constructionPreviewCenter.z * constructionPreviewRoot.scale.z,
        ).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -constructionAnchor.rotation.y);
      }
    };
    let appliedConstructionKey = '';
    const updateConstructionPresentation = () => {
      const next = constructionPresentationRef.current;
      const mappedStopId = next?.targetStopId === 'mystery' ? 'event' : next?.targetStopId;
      const targetRoot = mappedStopId
        ? landmarkRootsById.get(mappedStopId as Island5LandmarkId)
        : undefined;
      const nextKey = next
        ? [next.active, next.working, next.phase, next.progress.toFixed(4), next.sequence, next.sourceLevel, next.commissioning, next.cloudCover.toFixed(3), mappedStopId, next.targetLevel, next.completionCelebration, next.reducedMotion].join(':')
        : 'inactive';
      if (nextKey === appliedConstructionKey) return;
      appliedConstructionKey = nextKey;
      const isActive = Boolean(next?.active && targetRoot);
      const authoredConstructionProfile = mappedStopId
        ? resolveIslandLandmarkConstructionProfile(
          resolvedWorldSourceNumber,
          mappedStopId as Island5LandmarkId,
        )
        : null;
      constructionAnchor.visible = isActive;
      constructionFamily.root.visible = isActive && !next?.commissioning && !next?.completionCelebration && !next?.fastBuild;
      constructionStageBuilding.visible = isActive;
      constructionTheatre.setPresentation({
        active: isActive,
        working: next?.working ?? false,
        completionCelebration: next?.completionCelebration ?? false,
        phase: next?.phase ?? 'arrive',
        progress: next?.progress ?? 0,
        sequence: next?.sequence ?? 0,
        cloudCover: next?.cloudCover ?? 0,
        choreography: authoredConstructionProfile?.choreography,
      });
      if (next?.commissioning && mappedStopId && next.targetLevel) {
        constructionCommissioningFx.trigger(`${mappedStopId}:L${next.targetLevel}:${next.sequence}`);
      }
      canvas.dataset.constructionCrewTriangles = String(isActive
        ? constructionFamily.metrics.triangles + constructionTheatre.metrics.visibleTriangles
        : 0);
      canvas.dataset.constructionCrewDrawCalls = String(isActive
        ? constructionFamily.metrics.drawCalls
          + constructionTheatre.metrics.visibleDrawCalls
          + (next?.commissioning ? constructionCommissioningFx.metrics.drawCalls : 0)
        : 0);
      canvas.dataset.constructionCrewRuntime = isActive ? 'rendering' : 'parked';
      canvas.dataset.constructionCrewActive = isActive ? 'true' : 'false';
      canvas.dataset.constructionCrewTarget = mappedStopId ?? '';
      canvas.dataset.constructionCrewPhase = next?.phase ?? 'arrive';
      canvas.dataset.constructionCrewMode = next?.working ? 'working' : 'resting';
      canvas.dataset.constructionCommissioning = next?.commissioning ? 'pop-sparkle' : 'idle';
      canvas.dataset.constructionChoreography = authoredConstructionProfile
        ? `${authoredConstructionProfile.choreography.styleId}:station-${authoredConstructionProfile.choreography.stationOffset}`
        : '';
      if (!isActive || !targetRoot) {
        if (constructionSourceRoot) constructionSourceRoot.visible = true;
        constructionSourceRoot = null;
        return;
      }

      if (constructionSourceRoot && constructionSourceRoot !== targetRoot) constructionSourceRoot.visible = true;
      constructionSourceRoot = targetRoot;
      constructionSourceRoot.visible = false;

      const authoredCurrentLevel = next?.sourceLevel
        ?? landmarkBuildLevelsRef.current?.[mappedStopId as Island5LandmarkId]
        ?? buildLevel;
      const previewLevel = THREE.MathUtils.clamp(
        next?.targetLevel ?? Math.min(3, authoredCurrentLevel + 1),
        1,
        3,
      ) as BuildLevel;
      const currentLevel = THREE.MathUtils.clamp(
        // Visual-production previews can render an all-L3 overview while the
        // canonical demo store is still funding L1. A build transition is
        // always additive, so a stale display level must never invert L3->L1.
        Math.min(authoredCurrentLevel, previewLevel - 1),
        0,
        3,
      ) as BuildLevel;
      // Keep the same authored preview through review and the 15/15 finale.
      // Swapping to the board root here changes apparent size by up to 2.4x.
      ensureConstructionPreview(mappedStopId as Island5LandmarkId, currentLevel, previewLevel);
      applyConstructionPreviewProgress(next?.completionCelebration ? 1 : next?.progress ?? 0, next?.working ?? false);

      constructionBounds.setFromObject(targetRoot);
      constructionBounds.getCenter(constructionBoundsCenter);
      constructionBounds.getSize(constructionBoundsSize);
      const horizontalExtent = Math.max(constructionBoundsSize.x, constructionBoundsSize.z, 1);
      const crewScale = THREE.MathUtils.clamp(horizontalExtent / 8.5, 0.22, 0.38);
      constructionAnchor.position.set(
        constructionBoundsCenter.x,
        // The authored preview replaces the hidden source landmark, so its
        // bottom must stay on the source landmark's exact foundation datum.
        // Camera framing owns screen-space composition; lifting this anchor
        // makes a heavy building visibly hover and causes level-to-level drift.
        constructionBounds.min.y,
        constructionBoundsCenter.z,
      );
      constructionAnchor.scale.setScalar(crewScale);
      const authoredBuildingScale = isJungleExpedition ? 0.78 / crewScale : 1;
      constructionStageBuilding.userData.authoredBuildingScale = authoredBuildingScale;
      constructionStageBuilding.scale.setScalar(authoredBuildingScale);
      jungleConstructionFx.scale.setScalar(authoredBuildingScale);
      constructionCommissioningFx.root.scale.setScalar(1);
      canvas.dataset.constructionLandmarkGrounding = JSON.stringify({
        sourceFloorY: Number(constructionBounds.min.y.toFixed(4)),
        previewFloorY: Number(constructionAnchor.position.y.toFixed(4)),
        verticalError: Number((constructionAnchor.position.y - constructionBounds.min.y).toFixed(4)),
      });
      updateConstructionFacing();
      if (constructionPreviewRoot) {
        constructionPreviewBounds.getCenter(constructionPreviewCenter);
        const previewHorizontalSize = Math.max(constructionPreviewSize.x, constructionPreviewSize.z, 0.001);
        const crewVisualScale = THREE.MathUtils.clamp(
          0.19 * (constructionPreviewSize.y / previewHorizontalSize),
          isJungleExpedition ? 0.16 : 0.084,
          isJungleExpedition ? 0.27 : 0.2,
        );
        constructionTheatre.setCrewScale(crewVisualScale);
        canvas.dataset.constructionCrewScale = crewVisualScale.toFixed(3);
        // Tall restored landmarks (especially tree/citadel L3s) need the same
        // visible-stage ceiling as broad buildings. Otherwise their upper
        // scaffold and work stations disappear beneath the modal header.
        const verticalFit = THREE.MathUtils.clamp(
          (previewHorizontalSize * 1.38) / Math.max(constructionPreviewSize.y, 0.001),
          0.72,
          1,
        );
        const previewStageScale = (0.58 / crewScale) * verticalFit;
        constructionPreviewRoot.scale.setScalar(previewStageScale);
        constructionPreviewRoot.position.set(
          -constructionPreviewCenter.x * previewStageScale,
          -constructionPreviewBounds.min.y * previewStageScale,
          -constructionPreviewCenter.z * previewStageScale,
        );
        constructionTheatre.setTargetEnvelope(
          previewHorizontalSize * previewStageScale * 0.5,
          constructionPreviewSize.y * previewStageScale,
        );
        constructionCommissioningFx.setTargetEnvelope(
          previewHorizontalSize * previewStageScale * 0.5,
          constructionPreviewSize.y * previewStageScale,
        );
        // The target landmark already owns its stage-specific façade
        // scaffolding. A second rectangular cage around the entire plot was
        // visually dominant and flickered whenever work entered/exited its
        // burst window, so the live modal deliberately adds no site-wide rig.
        canvas.dataset.constructionScaffoldMode = 'authored-landmark-only';
      } else {
        const presentationCrewScale = next?.completionCelebration ? 0.42 : 0.18;
        constructionTheatre.setCrewScale(presentationCrewScale);
        canvas.dataset.constructionCrewScale = presentationCrewScale.toFixed(3);
        constructionTheatre.setTargetEnvelope(
          horizontalExtent / (crewScale * 2),
          constructionBoundsSize.y / crewScale,
        );
        constructionCommissioningFx.setTargetEnvelope(
          horizontalExtent / (crewScale * 2),
          constructionBoundsSize.y / crewScale,
        );
      }
      constructionFamily.setFaceFocus('heavy-worker', 0, -0.12);
      constructionFamily.setFaceFocus('project-manager', 0, -0.08);
      constructionFamily.setFaceFocus('mini-artist', 0, -0.16);
      canvas.dataset.constructionCrewTriangles = String(
        constructionFamily.metrics.triangles
        + constructionTheatre.metrics.visibleTriangles,
      );
      canvas.dataset.constructionCrewDrawCalls = String(
        constructionFamily.metrics.drawCalls
        + constructionTheatre.metrics.visibleDrawCalls
        + (next?.commissioning ? constructionCommissioningFx.metrics.drawCalls : 0),
      );
    };
    updateConstructionPresentation();

    if (isArchiveAlbedoLookdev) {
      const archiveRoot = landmarkRootsById.get('wisdom');
      const albedoMaterialCache = new Map<THREE.Material, THREE.Material>();
      archiveRoot?.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh)) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const albedoMaterials = sourceMaterials.map((sourceMaterial) => {
          const cached = albedoMaterialCache.get(sourceMaterial);
          if (cached) return cached;
          if (!(sourceMaterial instanceof THREE.MeshStandardMaterial)) return sourceMaterial;
          const albedoMaterial = new THREE.MeshBasicMaterial({
            color: sourceMaterial.color.clone(),
            map: sourceMaterial.map,
            transparent: sourceMaterial.transparent,
            opacity: sourceMaterial.opacity,
            alphaTest: sourceMaterial.alphaTest,
            side: sourceMaterial.side,
            vertexColors: sourceMaterial.vertexColors,
            depthWrite: sourceMaterial.depthWrite,
            depthTest: sourceMaterial.depthTest,
          });
          albedoMaterial.name = `${sourceMaterial.name || 'archive-material'}-albedo-review`;
          albedoMaterialCache.set(sourceMaterial, albedoMaterial);
          archiveAlbedoMaterials.push(albedoMaterial);
          return albedoMaterial;
        });
        object.material = Array.isArray(object.material) ? albedoMaterials : albedoMaterials[0];
      });
    }
    if (isAbyssalPearlKingdom) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_7_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland7RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_7_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-007-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      scene.add(landmarkNetwork);
      const partManifest = collectIsland7RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        ...landmarkRootsById.values(),
        ...instancedTileMeshes,
      ]);
      canvas.dataset.island7RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island7RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
    }
    if (isEverblossomKingdom) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_8_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_8_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland8RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_8_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-008-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland8RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-008-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland8RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
      ]);
      canvas.dataset.island8RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island8RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
    }
    if (isHeartshaftCrucible) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_9_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_9_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland9RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_9_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-009-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland9RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-009-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland9RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
      ]);
      canvas.dataset.island9RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island9RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      const countRenderableLeaves = (roots: Iterable<THREE.Object3D>) => {
        let count = 0;
        Array.from(roots).forEach((root) => root.traverse((object) => {
          if (!object.visible) return;
          if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) count += 1;
        }));
        return count;
      };
      canvas.dataset.island9AuthoredRenderableCount = String(countRenderableLeaves([livingAmbience.root, ...landmarkRootsById.values()]));
    }
    if (isRootheartCanopyCity) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_10_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_10_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland10RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_10_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-010-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland10RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-010-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland10RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
      ]);
      canvas.dataset.island10RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island10RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
    }
    if (isSunkenSands) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_12_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_12_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland12RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_12_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-012-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland12RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-012-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland12RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
      ]);
      const performanceInventory = collectIsland12PerformanceInventory([
        livingAmbience.root,
        ...landmarkRootsById.values(),
      ]);
      canvas.dataset.island12RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island12RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      canvas.dataset.island12PerformanceInventory = JSON.stringify(performanceInventory);
    }
    if (isCactusCanyon) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_13_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_13_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland13RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_13_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-013-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland13RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-013-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland13RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
        ...instancedTileMeshes,
      ]);
      canvas.dataset.island13RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island13RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      canvas.dataset.island13ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
    }
    if (isJungleExpedition) {
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh)) return;
        object.castShadow = object.name.endsWith('_STATIC_STRUCTURE');
      });
      const partManifest = collectIsland18RuntimePartManifest([
        livingAmbience.root,
        ...landmarkRootsById.values(),
        ...instancedTileMeshes,
      ]);
      canvas.dataset.island18RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island18RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      canvas.dataset.island18ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
    }
    if (isLavaLabyrinth) {
      const partManifest = collectIsland20RuntimePartManifest([
        livingAmbience.root,
        ...landmarkRootsById.values(),
        ...instancedTileMeshes,
      ]);
      canvas.dataset.island20RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island20RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      canvas.dataset.island20ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
    }
    let refreshIsland15RuntimeDatasets = () => undefined;
    if (isCrystalGlacier) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_15_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_15_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland15RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.map((rendererId) => {
          const room = resolveIsland15CrystalPalaceRoom(rendererId);
          return [rendererId, ISLAND_15_CRYSTAL_PALACE_NODE_NAMES.rooms[room].root];
        })),
        colliders: [{ id: 'island-015-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'castle-room-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland15RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-015-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      canvas.dataset.island15PalaceAssetUrl = 'procedural://island-015/unified-crystal-palace-v16';
      canvas.dataset.island15PalaceLoadStatus = 'loading';
      canvas.dataset.island15PalaceFallback = 'visible';
      canvas.dataset.island15CameraAuthority = ISLAND_15_R17_CAMERA_AUTHORITY.id;
      canvas.dataset.island15CameraGeometryAcceptance = 'pending-r17-palace';
      canvas.dataset.island15PerformanceBudget = JSON.stringify({ triangles: 110_000, drawCalls: 125 });
      refreshIsland15RuntimeDatasets = () => {
        const partManifest = collectIsland15RuntimePartManifest([
          livingAmbience.root,
          landmarkNetwork,
          routeIntegration,
          ...landmarkRootsById.values(),
          ...instancedTileMeshes,
        ]);
        canvas.dataset.island15RuntimePartManifest = JSON.stringify(partManifest);
        canvas.dataset.island15RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
        canvas.dataset.island15ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
        canvas.dataset.island15PalaceSemanticRoomCount = String(
          island15PalaceRuntime ? ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.length : 0,
        );
      };
      refreshIsland15RuntimeDatasets();
    }
    const sunshoreArenaRoot = isSunshoreAtoll ? landmarkRootsById.get('boss') : undefined;
    const sunshoreArenaRetraction = sunshoreArenaRoot ? createSunshoreArenaRetraction(sunshoreArenaRoot) : null;
    let sunshoreCrownTop = 1.05;
    const sunshoreCreatureBounds = new THREE.Box3();
    const sunshoreLandmarkMagic = isSunshoreAtoll ? createSunshoreLandmarkMagicRuntime(landmarkRootsById.values()) : null;
    if (isTitansRest) {
      const landmarkNetwork = new THREE.Object3D();
      landmarkNetwork.name = 'ISLAND_17_LANDMARK_NETWORK_RUNTIME_PROXY';
      landmarkNetwork.visible = false;
      const routeIntegration = new THREE.Object3D();
      routeIntegration.name = 'ISLAND_17_ROUTE_INTEGRATION_RUNTIME_PROXY';
      routeIntegration.visible = false;
      landmarkNetwork.userData.sculptRuntime = {
        parts: [registerIsland17RuntimePart('landmark-network', landmarkNetwork, 'landmark-network')],
        sockets: Object.fromEntries(ISLAND_5_LANDMARKS.map((landmark) => [landmark.id, `ISLAND_17_${landmark.id.toUpperCase()}_FOCUS_SOCKET`])),
        colliders: [{ id: 'island-017-landmark-network', type: 'compound', isTrigger: true }],
        destructionGroups: [{ id: 'landmark-network', breakable: false, partIds: ISLAND_5_LANDMARKS.map((landmark) => landmark.id) }],
      };
      routeIntegration.userData.sculptRuntime = {
        parts: [registerIsland17RuntimePart('route-integration', routeIntegration, 'canonical-board-route')],
        colliders: [{ id: 'island-017-board-route', type: 'compound-ring', isTrigger: true }],
      };
      scene.add(landmarkNetwork, routeIntegration);
      const partManifest = collectIsland17RuntimePartManifest([
        livingAmbience.root,
        landmarkNetwork,
        routeIntegration,
        ...landmarkRootsById.values(),
        ...instancedTileMeshes,
      ]);
      canvas.dataset.island17RuntimePartManifest = JSON.stringify(partManifest);
      canvas.dataset.island17RuntimePartCount = String(new Set(partManifest.parts.map((part) => part.name)).size);
      canvas.dataset.island17ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
    }
    const bossBuildLevel = landmarkBuildLevelsRef.current?.boss ?? buildLevelRef.current;
    const crownDrifter = !isRootheartCanopyCity && !isLavaLabyrinth && !isCrystalGlacier && shouldPresentIslandRunArenaCreature(islandNumber, bossBuildLevel)
      ? createCrownDrifterModel({ lod: 'board', quality: qualityProfile.id })
      : null;
    const crownDrifterPresentationRoot = crownDrifter ? new THREE.Group() : null;
    if (crownDrifter && crownDrifterPresentationRoot) {
      crownDrifterPresentationRoot.name = 'ISLAND_RUN_ARENA_CREATURE_PRESENTATION_ROOT';
      crownDrifterPresentationRoot.scale.setScalar(CROWN_DRIFTER_BOARD_SCALE);
      crownDrifterPresentationRoot.add(crownDrifter.root);
      scene.add(crownDrifterPresentationRoot);
    }
    const celebrationSmoke = isSunshoreAtoll && crownDrifter ? createSunshoreCelebrationSmoke() : null;
    if (celebrationSmoke) scene.add(celebrationSmoke.root);
    let consumedCelebrationRequest = creatureCelebrationRequestRef.current;
    let creatureCelebration: { startedAt: number; position: CelebrationPoint; yaw: number } | null = null;
    const voicePrism = scene.getObjectByName('CROWN_CITADEL_VOICE_PRISM');
    const voiceLight = scene.getObjectByName('CROWN_CITADEL_VOICE_LIGHT');

    const coralInstances = isFirstLightKingdom || isCelestialSkyKingdom || isFrostmoonHaven || isDriftwoodIsle || isSunshoreAtoll || isMoonveilNexus || isAbyssalPearlKingdom || isEverblossomKingdom || isHeartshaftCrucible || isRootheartCanopyCity || isSunkenSands || isCactusCanyon || isFishermansVillage || isHoneycombKingdom || isJungleExpedition || isLavaLabyrinth || isCoasterCarnival || isCrystalGlacier || isTitansRest
      ? new THREE.Group()
      : addAmbientReefDetails(scene, qualityProfile.ambientDetailCount, materials);
    const routeGlowColor = isFirstLightKingdom
      ? 0x9be5ff
      : isCelestialSkyKingdom
        ? 0xd7f4ff
      : isFrostmoonHaven
          ? 0xa98cff
          : isDriftwoodIsle
            ? 0xf4b85b
          : isSunshoreAtoll
            ? 0x77e8df
            : isMoonveilNexus
              ? 0x72ecff
              : isAbyssalPearlKingdom
                ? 0x9ffff4
              : isEverblossomKingdom
                ? 0xe6c76e
              : isHeartshaftCrucible
                ? 0xd97a3f
              : isRootheartCanopyCity
                ? 0xe5bd67
              : isSunkenSands
                ? 0xe9bf62
              : isCactusCanyon
                ? 0xd6a257
              : isHoneycombKingdom
                ? 0xffc94f
              : isJungleExpedition
                ? 0x53e68f
              : isLavaLabyrinth
                ? 0xff7a2f
              : isCrystalGlacier
                ? 0xa7f5ff
              : 0xffdb8c;
    const routeGlowEmissive = isFirstLightKingdom
      ? 0x247bb2
      : isCelestialSkyKingdom
        ? 0x286fb3
      : isFrostmoonHaven
          ? 0x52289f
          : isDriftwoodIsle
            ? 0x8b4a16
          : isSunshoreAtoll
            ? 0x11767a
            : isMoonveilNexus
              ? 0x3d2dff
              : isAbyssalPearlKingdom
                ? 0x0a7898
              : isEverblossomKingdom
                ? 0x715410
              : isHeartshaftCrucible
                ? 0x7f1e05
              : isRootheartCanopyCity
                ? 0x744311
              : isSunkenSands
                ? 0x76500f
              : isCactusCanyon
                ? 0x6f3713
              : isHoneycombKingdom
                ? 0xa94b08
              : isJungleExpedition
                ? 0x087d53
              : isLavaLabyrinth
                ? 0xa51f05
              : isCrystalGlacier
                ? 0x167ca8
              : 0xa96f18;
    const routeGlow = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.055, 8, 96),
      new THREE.MeshStandardMaterial({ color: routeGlowColor, emissive: routeGlowEmissive, emissiveIntensity: 0.62, roughness: 0.38 }),
    );
    routeGlow.rotation.x = Math.PI / 2;
    routeGlow.position.y = isFishermansVillage
      ? 0.34 + ISLAND_22_BOARD_PRESENTATION_Y_OFFSET + 0.12
      : 0.25;
    routeGlow.visible = !isCoasterCarnival;
    scene.add(routeGlow);

    // Deterministic Gauntlet evidence mode. The scene keeps its authored
    // geometry and camera, but removes texture/material-map influence so the
    // blockout can be judged on silhouette and structure alone.
    const isMapStrippedEvidence = (isCelestialSkyKingdom || isFrostmoonHaven || isDriftwoodIsle || isSunshoreAtoll || isMoonveilNexus || isAbyssalPearlKingdom || isEverblossomKingdom || isHeartshaftCrucible || isRootheartCanopyCity || isSunkenSands || isCactusCanyon || isFishermansVillage || isHoneycombKingdom || isJungleExpedition || isLavaLabyrinth || isCoasterCarnival || isCrystalGlacier)
      && isMapStrippedEvidenceEnabled;
    const evidenceMaterials: THREE.Material[] = [];
    if (isMapStrippedEvidence) {
      // A single scene.overrideMaterial turns the enclosing transparent water
      // volume opaque and hides every structure behind it. Preserve the
      // authored depth/visibility categories while stripping maps, PBR and
      // particles so the Gauntlet can judge real geometry rather than a blank
      // clay screen.
      scene.background = new THREE.Color(0x17242d);
      scene.environment = null;
      scene.traverse((object) => {
        if (object.name === 'ISLAND_20_LAVA_FLOW_AND_HEAT_OVERLAY' || object.name === 'ISLAND_2_CELESTIAL_SKY_DOME') {
          object.visible = false;
          return;
        }
        if (object instanceof THREE.Points) {
          object.visible = false;
          return;
        }
        if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.LineSegments)) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const structuralMaterials = sourceMaterials.map((sourceMaterial) => {
          const structuralMaterial = object instanceof THREE.LineSegments
            ? new THREE.LineBasicMaterial({ color: 0x8ba0a8, transparent: true, opacity: 0.72 })
            : new THREE.MeshNormalMaterial({
                transparent: sourceMaterial.transparent,
                opacity: sourceMaterial.transparent
                  ? Math.min(0.16, Math.max(0.05, sourceMaterial.opacity * 0.18))
                  : 1,
                depthWrite: !sourceMaterial.transparent,
                side: THREE.DoubleSide,
              });
          structuralMaterial.name = 'ISLAND_3D_MAP_STRIPPED_EVIDENCE_MATERIAL';
          evidenceMaterials.push(structuralMaterial);
          return structuralMaterial;
        });
        object.material = Array.isArray(object.material) ? structuralMaterials : structuralMaterials[0];
      });
    }
    if (isAssemblyCraterFirstLight) {
      canvas.dataset.island001ScenePerformanceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
    }
    if (isSunkenSands) {
      canvas.dataset.island12ScenePerformanceInventory = JSON.stringify(
        collectIslandThreeScenePerformanceInventory(scene),
      );
    }

    const timer = new THREE.Timer();
    timer.connect(document);
    const pawnTileTrail = createIslandPawnTileTrail(scene, isReducedMotion);
    let pawnCameraHeading = 0;
    let pawnCameraChoice = { heading: 0, height: 8.4, blocked: 0 };
    let pawnCameraHop = -1;
    let pawnCameraObstacles: PawnObstacle[] = [];
    let pawnCameraMeshes: THREE.Mesh[][] = [];
    const pawnVisibilityRay = new THREE.Raycaster();
    const pawnRayEye = new THREE.Vector3(), pawnRayDirection = new THREE.Vector3();
    const exactPawnBlocked = (eye: PawnPoint, target: PawnPoint) => {
      pawnRayEye.set(...eye); pawnRayDirection.set(...target).sub(pawnRayEye);
      pawnVisibilityRay.set(pawnRayEye,pawnRayDirection.clone().normalize());
      pawnVisibilityRay.near=0.1; pawnVisibilityRay.far=Math.max(0.1,pawnRayDirection.length()-0.3);
      for(let i=0;i<pawnCameraMeshes.length;i++) {
        if(!pawnSightBlocked(eye,target,pawnCameraObstacles[i]))continue;
        const hits=pawnVisibilityRay.intersectObjects(pawnCameraMeshes[i],false);
        if(hits.some(hit=>{
          let object: THREE.Object3D|null=hit.object;
          while(object){if(!object.visible)return false;object=object.parent;}
          if(!(hit.object instanceof THREE.Mesh))return false;
          const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];
          return materials.some(material=>(material.userData.islandOriginalDepthWrite??material.depthWrite) && (material.userData.islandOriginalOpacity??material.opacity)>0.4);
        }))return 1;
      }
      return 0;
    };
    const bossRootForOcclusion = isCrystalGlacier ? undefined : landmarkRootsById.get('boss');
    const bossOcclusionBounds = bossRootForOcclusion
      ? new THREE.Box3().setFromObject(bossRootForOcclusion)
      : null;
    const bossOcclusionCenter = bossOcclusionBounds?.getCenter(new THREE.Vector3()) ?? null;
    const bossOcclusionSize = bossOcclusionBounds?.getSize(new THREE.Vector3()) ?? null;
    canvas.dataset.centralLandmarkOcclusion = 'opaque';
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    let animationFrame = 0;
    let firstFrameRendered = false;
    let transition: {
      startedAt: number;
      durationMs: number;
      fromPosition: THREE.Vector3;
      fromTarget: THREE.Vector3;
      controlPosition: THREE.Vector3;
      toPosition: THREE.Vector3;
      toTarget: THREE.Vector3;
      fromFov?: number;
      toFov?: number;
      island15Intent?: Island15CameraPose['intent'];
      onComplete?: () => void;
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
      kind: 'island' | 'assembly';
      stepIndex: number;
      nextStepAt: number;
    } | null = null;
    let wasAssemblyConstructionActive = false;
    let wasMarinaArrivalActive = false;
    let marinaInspectionActive = false;
    let automaticAssemblyTourStarted = false;
    let activeTrainRide: {
      startedAt: number;
      phaseIndex: number;
      phaseDurationMs: number;
      holdRequestedView: boolean;
      returnPosition: THREE.Vector3;
      returnTarget: THREE.Vector3;
      returnFov: number;
      returnPreset: Island5CameraPresetId | 'manual';
    } | null = null;
    let activeWonderRide: {
      startedAt: number;
      durationMs: number;
      wagon: Island19CircuitFWagon;
      fixedProgress: number | null;
      returnPosition: THREE.Vector3;
      returnTarget: THREE.Vector3;
      returnFov: number;
      returnPreset: Island5CameraPresetId | 'manual';
      returnBackground: THREE.Scene['background'];
      returnFog: THREE.Scene['fog'];
      returnUp: THREE.Vector3;
      returnVisibility: Map<THREE.Object3D, boolean>;
    } | null = null;
    let wonderRidePublishedSeconds = -1;
    const wonderRideCameraFilter = createWonderRideCameraFilter();
    let wonderRidePublishedPhase: Island19WonderRidePhase = 'idle';
    const wonderRideSkyBackground = new THREE.Color(0x69c4eb);
    const wonderRideUnderseaBackground = new THREE.Color(0x07567a);
    let wonderRideCompletedConstructionSequence = stagedRestorationInitial?.activatedStages === stagedRestorationInitial?.stageCount
      ? Math.max(0, Math.floor(stagedRestorationInitial?.constructionSequence ?? 0))
      : -1;
    let wonderRidePendingAfterConstruction = false;
    let trainRidePublishedSeconds = -1;
    let lastTrainTapAt = Number.NEGATIVE_INFINITY;
    const lastTrainTapPosition = new THREE.Vector2();
    let consumedTokenMotionRequestId = 0;
    let appliedTokenSnapIndex = tokenIndexRef.current;
    let lastAnimationFrameAt = performance.now();
    let activeTokenMotion: {
      request: TokenMotionRequest;
      startsAt: number;
      fromPosition: readonly [number, number, number];
      lastTriggeredHopIndex: number;
      lastTrailHopIndex: number;
      finalImpactTriggered: boolean;
    } | null = null;
    let idleOverviewAt: number | null = null;
    let ambientCameraContext: 'board' | 'build-modal' = constructionPresentationRef.current?.active
      ? 'build-modal'
      : 'board';
    let ambientCameraEligibleAt = performance.now() + (
      ambientCameraContext === 'build-modal'
        ? ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS
        : ISLAND_3D_BOARD_POV_IDLE_DELAY_MS
    );
    let ambientCameraStep = 0;
    let wasConstructionCameraLocked = Boolean(
      constructionPresentationRef.current?.active
      && constructionPresentationRef.current?.cameraLocked,
    );
    let activeInspectionPreset: Island5CameraPresetId | 'manual' = 'overview';
    let lastCameraAuthoringPublishAt = 0;
    let lastCameraAuthoringPayload = '';
    let isBossOcclusionFadeApplied = false;
    let island15PalaceEntryActive = false;
    let island15PalaceExitActive = false;
    let requestIsland15PalaceEntry: () => void = () => undefined;
    let requestIsland15PalaceExit: () => void = () => undefined;
    const activeTileImpacts = new Map<number, ActiveTileImpact>();
    let activeTokenSettle: ActiveTokenSettle | null = null;

    const setBoardActorsVisibleForPreset = (preset: Island5CameraPresetId | 'manual') => {
      activeInspectionPreset = preset;
      const isLandmarkInspection = preset === 'boss'
        || preset === 'hatchery'
        || preset === 'habit'
        || preset === 'wisdom'
        || preset === 'event'
        || preset === 'frostwell'
        || preset === 'powerworks'
        || preset === 'canyon-spiral'
        || preset === 'titan-spine';
      const visible = !isLandmarkInspection;
      playerPiece.root.visible = visible;
      playerPiece.shadow.visible = visible;
      boardCaretaker.root.visible = visible && caretakerBoardAvailable;
      caretakerFootplate.visible = visible && caretakerBoardAvailable;
      caretakerContactShadow.visible = visible && caretakerBoardAvailable;
      caretakerHitTarget.visible = visible && caretakerBoardAvailable;
      const showAssemblyCutaway = isAssemblyCraterFirstLight && preset === 'boss';
      const showPlayableRoute = preset !== 'powerworks' && !showAssemblyCutaway;
      tileMeshes.forEach((entry) => {
        // Keep only the far half of the real canonical route in the cutaway so
        // its scale remains legible without creating the concept image's white
        // perimeter fence or letting near tiles occlude the chamber.
        entry.mesh.visible = showPlayableRoute
          || (showAssemblyCutaway && (entry.mesh instanceof THREE.InstancedMesh ? !entry.mesh.userData.assemblyNearRoute : entry.mesh.position.z <= 0));
      });
      tileRewardObjects.root.visible = showPlayableRoute;
      routeGlow.visible = showPlayableRoute && !isCoasterCarnival;
      assemblySurfaceCutawayRoots.forEach((surfaceRoot) => {
        surfaceRoot.visible = !showAssemblyCutaway;
      });
      if (isAssemblyCraterFirstLight) {
        firstLightAssemblyCrater?.setInspectionCutaway(showAssemblyCutaway);
        water.visible = !showAssemblyCutaway;
        livingAmbience.root.visible = !showAssemblyCutaway;
        landmarkRootsById.forEach((landmarkRoot) => {
          // Cut away the near buildings with the terrain to expose the dais;
          // their lift shafts stay visible and all four return in surface view.
          landmarkRoot.visible = !showAssemblyCutaway || landmarkRoot.position.z <= 0;
        });
        canvas.dataset.assemblyInspectionMode = showAssemblyCutaway ? 'subterranean-cutaway' : 'surface-board';
      }
      if (isRootheartCanopyCity) {
        landmarkRootsById.forEach((landmarkRoot) => {
          landmarkRoot.visible = preset !== 'powerworks';
        });
      }
      if (isAbyssalPearlKingdom) {
        landmarkRootsById.forEach((landmarkRoot, landmarkId) => {
          landmarkRoot.visible = !isLandmarkInspection || landmarkId === preset;
        });
      }
      if (isCrystalGlacier && island15PalaceRuntime) {
        const focusMode: Island15CrystalPalaceFocusMode = preset === 'playable-overview'
          ? 'boss'
          : ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(
          preset as (typeof ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS)[number],
        )
          ? preset as Island15CrystalPalaceFocusMode
          : 'overview';
        island15PalaceRuntime.setFocusMode(focusMode);
        canvas.dataset.island15PalaceFocusMode = focusMode;
        if (!island15PalaceEntryActive && !island15PalaceExitActive) {
          const interiorRoom = isIsland15PalaceRoomPreset(preset) ? preset : null;
          canvas.dataset.island15PalaceNavigationMode = interiorRoom ? 'inside' : 'outside';
          canvas.dataset.island15PalaceCurrentRoom = interiorRoom ?? 'none';
          canvas.dataset.island15PalaceEntryPhase = 'idle';
          setIsland15PalaceEntryPhase('idle');
        }
      }
      if (isTitansRest) {
        landmarkRootsById.forEach((landmarkRoot, landmarkId) => {
          landmarkRoot.visible = !isLandmarkInspection || landmarkId === preset;
          landmarkRoot.traverse((node) => {
            if (!node.userData.paintedPartId) return;
            node.visible = isLandmarkInspection && node.userData.paintedPartId === landmarkId;
          });
        });
      }
    };

    const publishCameraAuthoringPose = (now: number, force = false) => {
      if (!cameraAuthoringEnabledRef.current) return;
      if (!force && now - lastCameraAuthoringPublishAt < 220) return;
      lastCameraAuthoringPublishAt = now;
      const round = (value: number) => Math.round(value * 1_000) / 1_000;
      const pose: CameraAuthoringPose = {
        islandNumber,
        preset: activeInspectionPreset,
        position: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
        target: [round(controls.target.x), round(controls.target.y), round(controls.target.z)],
        fov: round(camera.fov),
        zoom: round(camera.zoom),
        aspect: round(camera.aspect),
        ...(isFrostmoonHaven ? {
          signatureMissionSocketActive: Boolean(livingAmbience.getSignatureMissionCameraPose?.()),
          signatureMissionMetersDrilled: Math.max(
            0,
            Math.floor(signatureMissionPresentationRef.current.metersDrilled),
          ),
        } : {}),
      };
      if (constructionAnchor.visible && constructionPreviewRoot) {
        const bounds = new THREE.Box3();
        constructionPreviewRoot.updateWorldMatrix(true, true);
        constructionPreviewRoot.traverseVisible((entry) => {
          if (entry instanceof THREE.Mesh && !entry.userData.constructionTemporary) bounds.expandByObject(entry, true);
        });
        if (!bounds.isEmpty()) {
          const projected = new THREE.Box2();
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(camera);
            projected.expandByPoint(new THREE.Vector2(point.x, point.y));
          }
          canvas.dataset.constructionEvidence = JSON.stringify({
            sourceVisible: constructionSourceRoot?.visible ?? false,
            previewVisible: constructionStageBuilding.visible,
            stageY: constructionStageBuilding.position.y,
            stageScale: constructionStageBuilding.scale.toArray(),
            projectedMin: projected.min.toArray().map(round),
            projectedMax: projected.max.toArray().map(round),
          });
        }
      }
      const payload = JSON.stringify(pose);
      canvas.dataset.cameraAuthoringPose = payload;
      if (payload === lastCameraAuthoringPayload) return;
      lastCameraAuthoringPayload = payload;
      setCameraAuthoringPose(pose);
    };

    const setCameraAuthoringMode = (enabled: boolean) => {
      cameraAuthoringEnabledRef.current = enabled;
      controls.enablePan = enabled;
      canvas.dataset.cameraAuthoring = enabled ? 'true' : 'false';
      if (enabled) publishCameraAuthoringPose(performance.now(), true);
      else setCameraAuthoringPose(null);
    };
    setCameraAuthoringModeRef.current = setCameraAuthoringMode;
    setCameraAuthoringMode(cameraAuthoringEnabledRef.current);

    const markPawnTrail = (tileIndex:number, startedAt:number, landing:boolean) => {
      const trailPoint = getIsland5TokenGroundPosition(tileTransforms, tileIndex);
      const trailTile = tileMeshes.get(tileIndex);
      const surfaceY = (trailTile?.baseY ?? trailPoint[1]) + (tileGeometry.boundingBox?.max.y ?? 0.12);
      pawnTileTrail.mark(tileIndex, [trailPoint[0], surfaceY + 0.035, trailPoint[2]], startedAt, landing);
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
      markPawnTrail(tileIndex,startedAt,true);
      triggerTileImpact(tileIndex, strength, startedAt);
      if (!isReducedMotion) {
        activeTokenSettle = {
          startedAt,
          strength,
          position: getIsland5TokenGroundPosition(tileTransforms, tileIndex),
        };
      }
    };

    const startIsland15CameraPose = (
      pose: Island15CameraPose,
      options: {
        durationScale?: number;
        controlPosition?: THREE.Vector3;
        instant?: boolean;
        onComplete?: () => void;
      } = {},
    ) => {
      if (pose.orbitMode === 'exterior' && island15PalaceFramingBounds) {
        island15LastExteriorPose = pose;
        pose = fitIsland15ExteriorCameraPose(
          pose,
          island15PalaceFramingBounds,
          canvas.clientWidth / Math.max(1, canvas.clientHeight),
          island15PalaceFramingPoints,
        );
        island15FittedExteriorDistance = Math.hypot(...pose.position.map((value, axis) => value - pose.target[axis]));
        canvas.dataset.island15CameraFraming = 'mounted-palace-bounds';
      } else {
        island15LastExteriorPose = null;
        canvas.dataset.island15CameraFraming = 'authored-room-socket';
      }
      const instant = Boolean(options.instant || isReducedMotion);
      const safety = resolveIsland15CameraPoseSafety(pose);
      applyIsland15OrbitControlMode(pose.orbitMode);
      canvas.dataset.island15CameraShot = pose.id;
      canvas.dataset.island15CameraIntent = pose.intent;
      canvas.dataset.island15CameraPoseHash = hashIsland15CameraPose(pose);
      canvas.dataset.island15CameraPose = JSON.stringify({
        authority: ISLAND_15_R17_CAMERA_AUTHORITY.id,
        id: pose.id,
        intent: pose.intent,
        orbitMode: pose.orbitMode,
        position: pose.position.map((value) => Number(value.toFixed(3))),
        target: pose.target.map((value) => Number(value.toFixed(3))),
        fov: Number.isFinite(pose.fov) ? pose.fov : camera.fov,
      });
      canvas.dataset.island15CameraSafety = JSON.stringify({
        ...safety,
        targetDistance: Number(safety.targetDistance.toFixed(3)),
        boundaryClearance: safety.boundaryClearance === null
          ? null
          : Number(safety.boundaryClearance.toFixed(3)),
      });
      if (instant) {
        camera.position.set(...pose.position);
        controls.target.set(...pose.target);
        if (Number.isFinite(pose.fov)) {
          camera.fov = pose.fov;
          camera.updateProjectionMatrix();
        }
        camera.lookAt(controls.target);
        // The Island 015 authored limit set is already active here, so this
        // synchronizes OrbitControls' spherical cache without applying the
        // generic 5.4-distance / 69-degree clamp to an interior endpoint.
        controls.update();
        transition = null;
        options.onComplete?.();
        return;
      }
      const fromPosition = camera.position.clone();
      const toPosition = new THREE.Vector3(...pose.position);
      const controlPosition = options.controlPosition
        ?? fromPosition.clone().lerp(toPosition, 0.5);
      if (!options.controlPosition) {
        controlPosition.y += Math.min(5.5, Math.max(1.1, fromPosition.distanceTo(toPosition) * 0.1));
      }
      transition = {
        startedAt: performance.now(),
        durationMs: Math.max(220, pose.durationMs * (options.durationScale ?? 1)),
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget: new THREE.Vector3(...pose.target),
        fromFov: Number.isFinite(pose.fov) ? camera.fov : undefined,
        toFov: Number.isFinite(pose.fov) ? pose.fov : undefined,
        island15Intent: pose.intent,
        onComplete: options.onComplete,
      };
    };

    const applyPreset = (id: Island5CameraPresetId, durationScale = 1, instant = false) => {
      if (
        isCrystalGlacier
        && id === 'boss'
        && isIsland15ExteriorCameraPreset(activeInspectionPreset)
        && !island15PalaceEntryActive
        && !island15PalaceExitActive
      ) {
        requestIsland15PalaceEntry();
        return;
      }
      if (
        isCrystalGlacier
        && id === 'overview'
        && (isIsland15PalaceRoomPreset(activeInspectionPreset) || activeInspectionPreset === 'playable-overview')
        && !island15PalaceEntryActive
        && !island15PalaceExitActive
      ) {
        requestIsland15PalaceExit();
        return;
      }
      if (island15PalaceEntryActive || island15PalaceExitActive) {
        island15PalaceEntryActive = false;
        island15PalaceExitActive = false;
        controls.enabled = true;
        setIsland15PalaceEntryPhase('idle');
      }
      if (marinaInspectionActive) {
        marinaInspectionActive = false;
        camera.fov = 42;
        camera.updateProjectionMatrix();
        controls.minDistance = 5.4;
        controls.minPolarAngle = THREE.MathUtils.degToRad(28);
        controls.maxPolarAngle = THREE.MathUtils.degToRad(69);
      }
      const basePreset = getIsland5CameraPreset(id);
      const firstLightFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 16, 31], target: [0, -0.8, 0] },
        survey: { position: [0, 27, 38], target: [0, -0.45, 0] },
        'orbit-left': { position: [-21.5, 16, 27], target: [0, -0.8, 0] },
        'orbit-right': { position: [21.5, 16, 27], target: [0, -0.8, 0] },
        boss: { position: [0, 7.8, 9.8], target: [0, 0.82, 0] },
        hatchery: { position: [2.3, 7.8, -0.9], target: [-4.36, 1.55, -3.9] },
        habit: { position: [0.6, 7.7, 2.4], target: [4.36, 1.62, -3.9] },
        wisdom: { position: [-0.6, 7.7, -2.4], target: [-4.36, 1.52, 3.9] },
        event: { position: [-2.3, 7.7, 0.9], target: [4.36, 1.48, 3.9] },
      };
      const assemblyCraterFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 20, 36], target: [0, -1.75, 0] },
        survey: { position: [0, 31, 42], target: [0, -1.9, 0] },
        'orbit-left': { position: [-30, 20, 34], target: [0, -1.95, 0] },
        'orbit-right': { position: [30, 20, 34], target: [0, -1.95, 0] },
        boss: { position: [0, 2.55, 21], target: [0, -2.55, -0.7] },
        hatchery: { position: [-1.46, 4.7, 2.4], target: [-4.36, 1.25, -3.9] },
        habit: { position: [7.26, 4.9, 2.4], target: [4.36, 1.4, -3.9] },
        wisdom: { position: [-1.46, 4.7, 10.2], target: [-4.36, 1.2, 3.9] },
        event: { position: [7.26, 4.7, 10.2], target: [4.36, 1.2, 3.9] },
      };
      const assemblyCraterFocusOverride = isAssemblyCraterFirstLight
        ? assemblyCraterFocusOverrides[id]
        : undefined;
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
      const everblossomFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 18.5, 25], target: [0, 0.42, 0] },
        survey: { position: [0, 29, 37], target: [0, 0.2, 0] },
        'orbit-left': { position: [-23, 22, 27], target: [0, 0.35, 0] },
        'orbit-right': { position: [23, 22, 27], target: [0, 0.35, 0] },
        boss: { position: [0, 10.4, 14.8], target: [0, 1.72, 0] },
        // Approach from the landmark's center-facing quadrant, but keep the
        // camera far enough back for the complete L3 crown and garden plinth.
        // Crossing the opposite quadrant lets the Citadel occlude the rear
        // Garden Hall and Archive; framing closer than this clips their roofs.
        hatchery: { position: [-1.4, 6.58, -1.4], target: [-4.36, 1.18, -3.9] },
        habit: { position: [1.4, 6.58, -1.4], target: [4.36, 1.14, -3.9] },
        wisdom: { position: [-1.4, 6.5, 1.4], target: [-4.36, 1.16, 3.9] },
        event: { position: [1.4, 6.45, 1.4], target: [4.36, 1.02, 3.9] },
      };
      const heartshaftFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 19.4, 26], target: [0, -0.45, 0] },
        survey: { position: [0, 30, 38], target: [0, -0.75, 0] },
        'orbit-left': { position: [-24, 22.5, 28], target: [0, -0.45, 0] },
        'orbit-right': { position: [24, 22.5, 28], target: [0, -0.45, 0] },
        boss: { position: [0, 9.8, 14.8], target: [0, -1.2, 0] },
        hatchery: { position: [-1.35, 6.9, -1.2], target: [-4.36, 1.42, -3.9] },
        habit: { position: [1.35, 7.1, -1.1], target: [4.36, 1.62, -3.9] },
        wisdom: { position: [-1.3, 6.75, 1.25], target: [-4.36, 1.26, 3.9] },
        event: { position: [1.3, 6.85, 1.25], target: [4.36, 1.3, 3.9] },
      };
      const rootheartFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 19.7, 27.8], target: [0, -0.1, -0.35] },
        survey: { position: [0, 28, 37], target: [0, 0.5, -0.7] },
        'orbit-left': { position: [-23, 20.5, 27], target: [0, 0.55, -0.4] },
        'orbit-right': { position: [23, 20.5, 27], target: [0, 0.55, -0.4] },
        boss: { position: [0, 12.4, 18.6], target: [0, 0.38, 0] },
        hatchery: { position: [1.5, 10.7, 5.8], target: [-4.36, 1.42, -3.9] },
        habit: { position: [-1.5, 10.7, 5.8], target: [4.36, 1.58, -3.9] },
        wisdom: { position: [-13.3, 11.0, 11.9], target: [-4.36, 1.5, 3.9] },
        event: { position: [13.3, 11.0, 11.9], target: [4.36, 1.5, 3.9] },
        powerworks: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [0, 2.4, 20.8], target: [0, -1.85, 3.2] }
          : { position: [0, 1.8, 18.4], target: [0, -1.85, 3.2] },
      };
      const sunkenSandsFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [0, 16.1, 25.8], target: [0, -0.45, 0.25] }
          : { position: [0, 16.5, 27], target: [0, 0.72, -0.35] },
        survey: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [0, 21.5, 29], target: [0, -0.7, 0.2] }
          : { position: [0, 25, 34], target: [0, 0.35, -0.4] },
        'orbit-left': canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [-18.4, 15.8, 22.8], target: [0, -0.4, 0.25] }
          : { position: [-19.5, 16.5, 23.5], target: [0, 0.72, -0.35] },
        'orbit-right': canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [18.4, 15.8, 22.8], target: [0, -0.4, 0.25] }
          : { position: [19.5, 16.5, 23.5], target: [0, 0.72, -0.35] },
        boss: { position: [0, 8.8, 13.2], target: [0, 1.7, 0] },
        hatchery: { position: [-1.1, 6.9, -0.9], target: [-4.36, 1.34, -3.9] },
        habit: { position: [1.1, 6.9, -0.9], target: [4.36, 1.34, -3.9] },
        wisdom: { position: [-1.1, 6.8, 1.1], target: [-4.36, 1.3, 3.9] },
        event: { position: [1.1, 6.8, 1.1], target: [4.36, 1.26, 3.9] },
      };
      const frostmoonFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        // All outer landmarks face the central route. Approach from that side
        // so perimeter firs do not cover their entrances or working interiors.
        hatchery: { position: [0.86, 6.68, 2.04], target: [-4.36, 1.3, -3.9] },
        habit: { position: [-0.86, 6.78, 2.04], target: [4.36, 1.4, -3.9] },
        event: { position: [0.61, 6.18, 1.14], target: [4.36, 1, 3.9] },
        // Frostfire's public stair, book crest and reading alcove face the
        // centre promenade. Approach from that quadrant so the wisdom preset
        // inspects the authored front rather than defaulting to the furnace rear.
        wisdom: { position: [-0.6, 5.4, -2.4], target: [-4.36, 1.3, 3.9] },
        frostwell: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [0, 8.6, 14.5], target: [0, 0.5, -9.4] }
          : { position: [0, 5.4, 2.8], target: [0, 0.82, -9.4] },
      };
      const cactusCanyonSpiralView = new URLSearchParams(window.location.search).get('island13SpiralView');
      const cactusCanyonLandmarkView = new URLSearchParams(window.location.search).get('island13LandmarkView');
      const cactusCanyonWorldView = new URLSearchParams(window.location.search).get('island13WorldView');
      const cactusCanyonFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: cactusCanyonWorldView === 'rear'
          ? { position: [0, 20, -31], target: [0, -2.2, 0] }
          : { position: [0, 20, 31], target: [0, -2.2, 0] },
        survey: { position: [0, 28, 39], target: [0, -2.4, 0] },
        'orbit-left': { position: [-25, 14, 27], target: [0, -2.8, 0] },
        'orbit-right': { position: [25, 14, 27], target: [0, -2.8, 0] },
        hatchery: cactusCanyonLandmarkView === 'rail'
          ? { position: [-8, 5.2, 1], target: [-3.94, 1.05, -3.52] }
          : cactusCanyonLandmarkView === 'rear'
          ? { position: [-10.8, 7.4, 2.8], target: [-4.36, 1.34, -3.9] }
          : { position: [-10.8, 7.4, -10.6], target: [-4.36, 1.34, -3.9] },
        habit: cactusCanyonLandmarkView === 'rail'
          ? { position: [8, 5.2, 1], target: [3.94, 1.05, -3.52] }
          : cactusCanyonLandmarkView === 'rear'
          ? { position: [-2, 6.6, -10.7], target: [4.36, 1.8, -3.9] }
          : { position: [10.7, 6.6, 2.9], target: [4.36, 1.8, -3.9] },
        wisdom: cactusCanyonLandmarkView === 'rail'
          ? { position: [-8, 5.2, -1], target: [-3.94, 1.05, 3.52] }
          : cactusCanyonLandmarkView === 'rear'
          ? { position: [-10.8, 7.2, -2.8], target: [-4.36, 1.42, 3.9] }
          : cactusCanyonLandmarkView === 'side'
            ? { position: [-10.8, 6.5, 3.9], target: [-4.36, 1.42, 3.9] }
            : { position: [-9.8, 6.2, 9.5], target: [-4.36, 1.42, 3.9] },
        event: cactusCanyonLandmarkView === 'rail'
          ? { position: [-0.2, 5.5, 9.5], target: [3.94, 1.05, 3.52] }
          : cactusCanyonLandmarkView === 'rear'
          ? { position: [10.8, 7.2, -2.8], target: [4.36, 1.38, 3.9] }
          : cactusCanyonLandmarkView === 'side'
            ? { position: [9.3, 5.8, 8.9], target: [4.36, 1.38, 3.9] }
            : { position: [10.8, 6.5, 3.9], target: [4.36, 1.38, 3.9] },
        'canyon-spiral': cactusCanyonSpiralView === 'rear'
          ? { position: [-24, 9.5, -34], target: [0, -7.2, 0] }
          : cactusCanyonSpiralView === 'summit'
            ? { position: [12.5, 8.2, 17.5], target: [0, 0.75, 0] }
          : cactusCanyonSpiralView === 'left'
            ? { position: [-37, 9.5, 0], target: [0, -7.2, 0] }
            : cactusCanyonSpiralView === 'right'
              ? { position: [37, 9.5, 0], target: [0, -7.2, 0] }
              : { position: [24, 9.5, 34], target: [0, -7.2, 0] },
      };
      const fishermansVillageFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75
          ? { position: [0, 21.5, 36.5], target: [0, 0.25, 0] }
          : { position: [0, 19.5, 33], target: [0, 0.25, 0] },
        survey: { position: [0, 21.5, 31], target: [0, 0.2, 0] },
        'orbit-left': { position: [-18.5, 14.2, 21.8], target: [0, 0.35, 0] },
        'orbit-right': { position: [18.5, 14.2, 21.8], target: [0, 0.35, 0] },
        boss: { position: [12.6, 8.8, 3.5], target: [6.25, 1.7, -6.25] },
        hatchery: { position: [11.2, 7.2, 10.8], target: [5.75, 1.2, 6.2] },
        habit: { position: [-11.5, 7.2, 10.5], target: [-5.95, 1.2, 6.1] },
        wisdom: { position: [-12.5, 8.2, 1.2], target: [-6.35, 1.55, -5.75] },
        event: { position: [12.1, 7.3, 5.9], target: [7.15, 1.25, 0.25] },
      };
      const honeycombFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        // Keep the source's portrait-filling kingdom hierarchy after any
        // overview reset instead of falling back to the much more distant
        // generic Island 5 camera.
        overview: { position: [0, 15.8, 27.8], target: [0, -0.75, -0.05] },
        survey: { position: [0, 19.4, 31.2], target: [0, -0.8, -0.1] },
        'orbit-left': { position: [-23.6, 14.8, 23.6], target: [0, -0.35, 0] },
        'orbit-right': { position: [23.6, 14.8, 23.6], target: [0, -0.35, 0] },
      };
      const jungleExpeditionFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: jungleExpeditionWorldView === 'residents-left'
          ? { position: [-3.2, 5.8, 12.6], target: [-2.7, 0.72, 4.35] }
          : jungleExpeditionWorldView === 'residents-right'
            ? { position: [2.8, 5.8, 12.6], target: [2.5, 0.72, 4.65] }
            : jungleExpeditionWorldView === 'residents'
              ? { position: [0, 9.8, 19.8], target: [0, 0.72, 3.8] }
              : jungleExpeditionWorldView === 'fauna-left'
                ? { position: [-7.5, 8.2, 22.5], target: [-3.2, 0.82, 8.2] }
                : jungleExpeditionWorldView === 'fauna-right'
                  ? { position: [7.5, 8.2, 22.5], target: [3.2, 0.82, 8.2] }
                  : jungleExpeditionWorldView === 'fauna'
                    ? { position: [0, 10.8, 24], target: [0, 0.82, 8] }
          : jungleExpeditionWorldView === 'rear'
            ? { position: [0, 14.9, -25.6], target: [0, 0.18, 0.1] }
            : { position: [0, 14.9, 25.6], target: [0, 0.38, -0.18] },
        survey: { position: [0, 21.2, 34.2], target: [0, -1.2, -0.2] },
        'orbit-left': { position: [-23.5, 14.6, 24.2], target: [0, -0.6, -0.1] },
        'orbit-right': { position: [23.5, 14.6, 24.2], target: [0, -0.6, -0.1] },
        boss: { position: [0, 12.2, 20.6], target: [0, 3, -0.12] },
        // The jungle precincts face the central promenade. Approach from that
        // public side so each hero prop, portal and processional stair reads
        // as one silhouette instead of exposing the unadorned rear shell.
        hatchery: { position: [-4.4, 6.6, 4.1], target: [-4.36, 1.78, -3.9] },
        habit: { position: [4.4, 6.6, 4.1], target: [4.36, 1.84, -3.9] },
        wisdom: { position: [-4.4, 6.5, -4.1], target: [-4.36, 1.78, 3.9] },
        event: { position: [4.4, 6.5, -4.1], target: [4.36, 1.82, 3.9] },
      };
      const lavaLabyrinthFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number];
        target: readonly [number, number, number];
      }>> = {
        overview: { position: [0, 14.8, 19.6], target: [0, 0.18, -0.18] },
        survey: { position: [0, 18.5, 20.1], target: [0, 0.1, -0.14] },
        'orbit-left': { position: [-19.5, 14.5, 20.5], target: [0, 0.2, -0.12] },
        'orbit-right': { position: [19.5, 14.5, 20.5], target: [0, 0.2, -0.12] },
      };
      const celestialFocusOverrides: Partial<Record<Island5CameraPresetId, {
        position: readonly [number, number, number]; target: readonly [number, number, number];
      }>> = {
        overview: {
          position: celestialRedockingPresentationRef.current.completedRolls < 20 ? [0, 35, 43] : [0, 29, 34],
          target: [0, -0.8, 0],
        },
        survey: { position: [0, 34, 37], target: [0, -0.8, 0] },
        'orbit-left': { position: [-33, 25, 36], target: [0, -0.7, 0] },
        'orbit-right': { position: [33, 25, 36], target: [0, -0.7, 0] },
        boss: { position: [0, 7.8, 13.8], target: [0, 1.75, 0] },
      };
      const celestialOverride = isCelestialSkyKingdom ? celestialFocusOverrides[id] : undefined;
      const firstLightOverride = isFirstLightKingdom ? firstLightFocusOverrides[id] : undefined;
      const moonveilOverride = isMoonveilNexus ? moonveilFocusOverrides[id] : undefined;
      const underwaterOverride = isAbyssalPearlKingdom ? underwaterFocusOverrides[id] : undefined;
      const everblossomOverride = isEverblossomKingdom ? everblossomFocusOverrides[id] : undefined;
      const heartshaftOverride = isHeartshaftCrucible ? heartshaftFocusOverrides[id] : undefined;
      const rootheartOverride = isRootheartCanopyCity ? rootheartFocusOverrides[id] : undefined;
      const sunkenSandsOverride = isSunkenSands ? sunkenSandsFocusOverrides[id] : undefined;
      const frostmoonOverride = isFrostmoonHaven ? frostmoonFocusOverrides[id] : undefined;
      const cactusCanyonOverride = isCactusCanyon ? cactusCanyonFocusOverrides[id] : undefined;
      const fishermansVillageOverride = isFishermansVillage ? fishermansVillageFocusOverrides[id] : undefined;
      const honeycombOverride = isHoneycombKingdom ? honeycombFocusOverrides[id] : undefined;
      const jungleExpeditionOverride = isJungleExpedition ? jungleExpeditionFocusOverrides[id] : undefined;
      const lavaLabyrinthOverride = isLavaLabyrinth ? lavaLabyrinthFocusOverrides[id] : undefined;
      const authoredFocusOverride = celestialOverride ?? assemblyCraterFocusOverride ?? fishermansVillageOverride ?? jungleExpeditionOverride ?? honeycombOverride ?? lavaLabyrinthOverride ?? cactusCanyonOverride ?? frostmoonOverride ?? firstLightOverride ?? moonveilOverride ?? underwaterOverride ?? everblossomOverride ?? heartshaftOverride ?? rootheartOverride ?? sunkenSandsOverride;
      let preset = authoredFocusOverride ? { ...basePreset, ...authoredFocusOverride } : basePreset;
      if (isDriftwoodIsle && id === 'wisdom' && archiveInteriorOpenRef.current) {
        preset = { ...preset, position: [-4.36, 8.5, 6.8], target: [-4.36, .9, 3.9] };
      }
      if (isCrystalGlacier) {
        const fromRoom = isIsland15PalaceRoomPreset(activeInspectionPreset)
          ? activeInspectionPreset
          : null;
        const construction = constructionPresentationRef.current;
        const pose = resolveIsland15CameraPose(id, {
          portrait: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75,
          envelope: island15CameraEnvelope,
          intent: construction?.active && construction.phase === 'reveal'
            ? 'build-reveal'
            : construction?.active
              ? 'build-work'
              : 'inspect',
        });
        if (pose) {
          const navigationStage = fromRoom && isIsland15PalaceRoomPreset(id)
            ? resolveIsland15RoomNavigationHallPose(fromRoom, id)
            : null;
          if (navigationStage) {
            setBoardActorsVisibleForPreset('boss');
            setActivePreset(id);
            setIsland15PalaceEntryPhase('navigating');
            canvas.dataset.island15PalaceEntryPhase = 'navigating';
            canvas.dataset.island15PalaceNavigationMode = 'navigating-via-boss-hall';
            canvas.dataset.island15PalaceCurrentRoom = 'boss';
            startIsland15CameraPose(navigationStage, {
              durationScale,
              instant,
              controlPosition: new THREE.Vector3(...navigationStage.controlPosition),
              onComplete: () => {
                setBoardActorsVisibleForPreset(id);
                setActivePreset(id);
                startIsland15CameraPose(pose, {
                  durationScale,
                  instant,
                  onComplete: () => {
                    setIsland15PalaceEntryPhase('idle');
                    canvas.dataset.island15PalaceEntryPhase = 'idle';
                    canvas.dataset.island15PalaceNavigationMode = 'inside';
                    canvas.dataset.island15PalaceCurrentRoom = id;
                  },
                });
              },
            });
            return;
          }
          setBoardActorsVisibleForPreset(id);
          setActivePreset(id);
          startIsland15CameraPose(pose, {
            durationScale,
            instant,
          });
          return;
        }
      }
      if (isCelestialSkyKingdom && ['hatchery', 'habit', 'wisdom', 'event'].includes(id)) {
        const landmarkId = id as Island5LandmarkDefinition['id'];
        const movingRoot = landmarkRootsById.get(landmarkId);
        const definition = ISLAND_5_LANDMARKS.find(landmark => landmark.id === landmarkId);
        if (movingRoot && definition) {
          const dx = movingRoot.position.x - definition.position[0];
          const dz = movingRoot.position.z - definition.position[2];
          preset = { ...preset,
            position: [preset.position[0] + dx, preset.position[1], preset.position[2] + dz],
            target: [preset.target[0] + dx, preset.target[1], preset.target[2] + dz],
          };
        }
      }
      if (isAssemblyCraterFirstLight && ['boss','hatchery','habit','wisdom','event'].includes(id)) {
        const target = new THREE.Vector3(...preset.target);
        const offset = new THREE.Vector3(...preset.position).sub(target);
        const required = (id === 'boss' ? 15 : 3.7) * camera.zoom / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
        offset.setLength(Math.max(offset.length(), required));
        preset = { ...preset, position: target.add(offset).toArray() as [number,number,number] };
      }
      setBoardActorsVisibleForPreset(id);
      if (
        island15PalaceRuntime
        && id !== 'boss'
        && ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(
          id as (typeof ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS)[number],
        )
      ) {
        const authoredAnchor = island15PalaceRuntime.getHitAnchor(
          id as (typeof ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS)[number],
        );
        authoredAnchor.updateWorldMatrix(true, false);
        const authoredTarget = authoredAnchor.getWorldPosition(new THREE.Vector3());
        const framingOffset = new THREE.Vector3(...preset.position)
          .sub(new THREE.Vector3(...preset.target));
        preset = {
          ...preset,
          position: authoredTarget.clone().add(framingOffset).toArray() as [number, number, number],
          target: authoredTarget.toArray() as [number, number, number],
        };
      }
      const buildPresentation = constructionPresentationRef.current;
      const buildPreset = buildPresentation?.targetStopId === 'mystery' ? 'event' : buildPresentation?.targetStopId;
      if (buildPresentation?.active && id === buildPreset && constructionPreviewRoot) {
        // Frame the actual miniature, including off-centre authored landmarks.
        // Twenty percent more apparent size comes from the camera, not from
        // compounding funded geometry or changing the board footprint.
        const offset = new THREE.Vector3(...preset.position).sub(new THREE.Vector3(...preset.target));
        offset.multiplyScalar(1 / 1.2);
        const target = constructionAnchor.position.clone();
        const previewHeight = constructionPreviewSize.y * constructionPreviewRoot.scale.y
          * constructionAnchor.scale.y * constructionStageBuilding.scale.y;
        target.y += previewHeight * 0.44;
        preset = { ...preset,
          position: target.clone().add(offset).toArray() as [number, number, number],
          target: target.toArray() as [number, number, number],
        };
        canvas.dataset.constructionFraming = 'centred-1.20';
      }
      setActivePreset(id);
      if (isReducedMotion || instant) {
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
    const applyAmbientCameraNudge = (context: 'board' | 'build-modal', now: number) => {
      if (isLavaLabyrinth) return;
      if (isCrystalGlacier) {
        const quietPose = resolveIsland15QuietDriftPose({
          position: camera.position.toArray() as [number, number, number],
          target: controls.target.toArray() as [number, number, number],
          context,
          step: ambientCameraStep,
          orbitMode: island15OrbitMode,
        });
        startIsland15CameraPose(quietPose);
        ambientCameraStep += 1;
        ambientCameraEligibleAt = now + ISLAND_3D_AMBIENT_POV_INTERVAL_MS;
        canvas.dataset.ambientCameraMode = `${context}-island15-quiet-drift`;
        canvas.dataset.ambientCameraStep = String(ambientCameraStep);
        return;
      }
      const offset = camera.position.clone().sub(controls.target);
      const yawDirection = ambientCameraStep % 2 === 0 ? 1 : -1;
      const yaw = yawDirection * (context === 'build-modal' ? 0.105 : 0.145);
      const destinationOffset = offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      destinationOffset.y += Math.sin(ambientCameraStep * 1.7) * Math.min(0.42, Math.abs(offset.y) * 0.035);
      const toPosition = controls.target.clone().add(destinationOffset);
      const controlPosition = camera.position.clone().lerp(toPosition, 0.5);
      controlPosition.y += context === 'build-modal' ? 0.28 : 0.48;
      transition = {
        startedAt: now,
        durationMs: context === 'build-modal' ? 1_650 : 2_250,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget: controls.target.clone(),
      };
      ambientCameraStep += 1;
      ambientCameraEligibleAt = now + ISLAND_3D_AMBIENT_POV_INTERVAL_MS;
      canvas.dataset.ambientCameraMode = `${context}-gentle-orbit`;
      canvas.dataset.ambientCameraStep = String(ambientCameraStep);
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
    applyEvidenceOrbitRef.current = (degrees: number) => {
      const angle = THREE.MathUtils.degToRad(degrees);
      const radius = Math.max(
        0.1,
        Math.hypot(
          camera.position.x - controls.target.x,
          camera.position.z - controls.target.z,
        ),
      );
      transition = null;
      idleOverviewAt = null;
      activeInspectionPreset = 'manual';
      setBoardActorsVisibleForPreset('manual');
      setActivePreset('manual');
      camera.position.set(
        controls.target.x + Math.sin(angle) * radius,
        camera.position.y,
        controls.target.z + Math.cos(angle) * radius,
      );
      camera.lookAt(controls.target);
      controls.update();
      canvas.dataset.evidenceOrbitDegrees = String(degrees);
    };
    if (isCrystalGlacier && island15CrystalGlacierMaterials) {
      const palaceAsset = createIsland15UnifiedCrystalPalaceAsset(island15CrystalGlacierMaterials);
      island15PalaceAttachmentRoot.add(palaceAsset);
      const runtime = bindIsland15CrystalPalaceRuntime(palaceAsset);
      island15PalaceRuntime = runtime;
      island15CrystalPalaceRuntimeRef.current = runtime;
      const palaceBounds = new THREE.Box3().setFromObject(runtime.root);
      const palaceSize = palaceBounds.getSize(new THREE.Vector3());
      island15PalaceFramingBounds = {
        minimum: palaceBounds.min.toArray() as [number, number, number],
        maximum: palaceBounds.max.toArray() as [number, number, number],
      };
      canvas.dataset.island15PalaceOccupiedBounds = JSON.stringify(island15PalaceFramingBounds);
      // Capture the permanent exterior once, before presenting any funded room
      // contents. Camera fitting uses real crown/stair vertices, not empty AABB
      // corners above the lower wings. No per-frame geometry traversal is needed.
      runtime.root.updateMatrixWorld(true);
      const fitPoint = new THREE.Vector3();
      const fitInstance = new THREE.Matrix4();
      const fitWorld = new THREE.Matrix4();
      runtime.root.traverseVisible((object) => {
        if (!(object instanceof THREE.Mesh) || object.userData.island15CrystalPalaceHitProxy) return;
        const position = object.geometry.getAttribute('position');
        if (!position) return;
        const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
        for (let instance = 0; instance < instanceCount; instance += 1) {
          fitWorld.copy(object.matrixWorld);
          if (object instanceof THREE.InstancedMesh) {
            object.getMatrixAt(instance, fitInstance);
            fitWorld.multiply(fitInstance);
          }
          for (let vertex = 0; vertex < position.count; vertex += 1) {
            fitPoint.fromBufferAttribute(position, vertex).applyMatrix4(fitWorld);
            island15PalaceFramingPoints.push([fitPoint.x, fitPoint.y, fitPoint.z]);
          }
        }
      });
      canvas.dataset.island15PalaceFramingVertexCount = String(island15PalaceFramingPoints.length);
      island15CameraEnvelope = {
        palaceRadius: Math.max(
          ISLAND_15_R17_CAMERA_AUTHORITY.envelope.palaceRadius,
          Math.max(palaceSize.x, palaceSize.z) * 0.5,
        ),
        palaceHeight: Math.max(
          ISLAND_15_R17_CAMERA_AUTHORITY.envelope.palaceHeight,
          palaceSize.y,
        ),
      };
      canvas.dataset.island15CameraEnvelope = JSON.stringify({
        palaceRadius: Number(island15CameraEnvelope.palaceRadius.toFixed(3)),
        palaceHeight: Number(island15CameraEnvelope.palaceHeight.toFixed(3)),
      });
      runtime.setBuildLevels(resolveIsland15CrystalPalaceBuildLevels(
        buildLevelRef.current,
        landmarkBuildLevelsRef.current,
      ));
      const focusMode: Island15CrystalPalaceFocusMode = ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.includes(
        activeInspectionPreset as (typeof ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS)[number],
      )
        ? activeInspectionPreset as Island15CrystalPalaceFocusMode
        : 'overview';
      runtime.setFocusMode(focusMode);

      clickableLandmarks.length = 0;
      ISLAND_15_CRYSTAL_PALACE_RENDERER_IDS.forEach((rendererId) => {
        const room = resolveIsland15CrystalPalaceRoom(rendererId);
        landmarkRootsById.set(rendererId, runtime.nodes.rooms[room].root);
        const hitAnchor = runtime.getHitAnchor(rendererId);
        setLandmarkId(hitAnchor, rendererId);
        hitAnchor.userData.landmarkHitTarget = true;
        clickableLandmarks.push(hitAnchor);
      });
      registerIsland15RuntimePart(
        'production-crystal-palace',
        runtime.root,
        'island15/Island15UnifiedCrystalPalace',
      );
      island15FallbackRoot.visible = false;
      canvas.dataset.island15PalaceLoadStatus = 'ready';
      canvas.dataset.island15PalaceFallback = 'hidden';
      canvas.dataset.island15PalaceFocusMode = focusMode;
      canvas.dataset.island15PalaceNavigationMode = isIsland15PalaceRoomPreset(activeInspectionPreset)
        ? 'inside'
        : 'outside';
      canvas.dataset.island15PalaceCurrentRoom = isIsland15PalaceRoomPreset(activeInspectionPreset)
        ? activeInspectionPreset
        : 'none';
      canvas.dataset.island15PalaceEntryPhase = 'idle';
      refreshIsland15RuntimeDatasets();
      if (activeInspectionPreset === 'overview') applyPreset('overview', 1, true);
    }

    const beginIsland15PalaceEntry = () => {
      if (
        !isCrystalGlacier
        || !island15PalaceRuntime
        || island15PalaceEntryActive
        || island15PalaceExitActive
      ) return;
      const stages = resolveIsland15PortalEntrySequence({
        portrait: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75,
        envelope: island15CameraEnvelope,
      });
      if (stages.length === 0) return;
      island15PalaceEntryActive = true;
      controls.enabled = false;
      idleOverviewAt = null;
      activeInspectionPreset = 'manual';
      setActivePreset('manual');
      canvas.dataset.island15PalaceNavigationMode = 'entering';
      canvas.dataset.island15PalaceCurrentRoom = 'none';
      canvas.dataset.island15PalaceThresholdZ = String(ISLAND_15_R17_CAMERA_AUTHORITY.southPortal.center[2]);
      canvas.dataset.island15PalaceShellSwitch = 'pending-camera-crossing';

      const finishInsideBossHall = () => {
        island15PalaceEntryActive = false;
        controls.enabled = !activeTour
          && !activeProfiler
          && !interactionPausedRef.current
          && !caretakerEncounterOpenRef.current;
        activeInspectionPreset = 'boss';
        setBoardActorsVisibleForPreset('boss');
        setActivePreset('boss');
        setIsland15PalaceEntryPhase('idle');
        canvas.dataset.island15PalaceNavigationMode = 'inside';
        canvas.dataset.island15PalaceCurrentRoom = 'boss';
        canvas.dataset.island15PalaceEntryPhase = 'idle';
        canvas.dataset.island15PalaceShellSwitch = 'inside-after-crossing';
        applyIsland15OrbitControlMode('authored-interior', true);
      };

      if (isReducedMotion) {
        const finalStage = stages[stages.length - 1];
        // Reduced motion performs the final semantic state and camera endpoint
        // in the same task; it never pairs a closed exterior with an interior
        // camera or pauses on the physical threshold.
        setBoardActorsVisibleForPreset('boss');
        canvas.dataset.island15PalaceShellSwitch = 'reduced-motion-safe-endpoint';
        startIsland15CameraPose(finalStage, { instant: true, onComplete: finishInsideBossHall });
        return;
      }

      const runStage = (index: number) => {
        const stage = stages[index];
        if (!stage) {
          finishInsideBossHall();
          return;
        }
        setIsland15PalaceEntryPhase(stage.phase);
        canvas.dataset.island15PalaceEntryPhase = stage.phase;
        canvas.dataset.island15PalaceNavigationMode = 'entering';
        if (stage.focusMode === 'boss') {
          // The prior stage ends 1.55 world units inside z=14. Only then may
          // the room cutaway open behind portal masonry.
          setBoardActorsVisibleForPreset('boss');
          setActivePreset('boss');
          canvas.dataset.island15PalaceCurrentRoom = 'boss';
          canvas.dataset.island15PalaceShellSwitch = 'inside-after-crossing';
        }
        canvas.dataset.island15CameraInsideOuterThreshold = String(stage.cameraInsideOuterThreshold);
        startIsland15CameraPose(stage, {
          onComplete: () => runStage(index + 1),
        });
      };
      runStage(0);
    };
    requestIsland15PalaceEntry = beginIsland15PalaceEntry;

    const beginIsland15PalaceExit = () => {
      if (
        !isCrystalGlacier
        || !island15PalaceRuntime
        || island15PalaceEntryActive
        || island15PalaceExitActive
      ) return;
      const stages = resolveIsland15PortalExitSequence({
        portrait: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75,
        envelope: island15CameraEnvelope,
      });
      if (stages.length === 0) return;
      island15PalaceExitActive = true;
      controls.enabled = false;
      idleOverviewAt = null;
      const departingRoom = isIsland15PalaceRoomPreset(activeInspectionPreset)
        ? activeInspectionPreset
        : 'boss';
      activeInspectionPreset = 'manual';
      setActivePreset('manual');
      canvas.dataset.island15PalaceNavigationMode = 'exiting';
      canvas.dataset.island15PalaceCurrentRoom = departingRoom;
      canvas.dataset.island15PalaceShellSwitch = 'open-until-camera-outside';

      const finishOutside = () => {
        island15PalaceExitActive = false;
        setBoardActorsVisibleForPreset('overview');
        setActivePreset('overview');
        setIsland15PalaceEntryPhase('idle');
        canvas.dataset.island15PalaceNavigationMode = 'outside';
        canvas.dataset.island15PalaceCurrentRoom = 'none';
        canvas.dataset.island15PalaceEntryPhase = 'idle';
        canvas.dataset.island15PalaceShellSwitch = 'closed-after-exit';
        applyIsland15OrbitControlMode('exterior', true);
        controls.enabled = !activeTour
          && !activeProfiler
          && !interactionPausedRef.current
          && !caretakerEncounterOpenRef.current;
      };

      if (isReducedMotion) {
        const finalStage = stages[stages.length - 1];
        setBoardActorsVisibleForPreset('overview');
        canvas.dataset.island15PalaceShellSwitch = 'reduced-motion-safe-endpoint';
        startIsland15CameraPose(finalStage, { instant: true, onComplete: finishOutside });
        return;
      }

      const runStage = (index: number) => {
        const stage = stages[index];
        if (!stage) {
          finishOutside();
          return;
        }
        setIsland15PalaceEntryPhase(stage.phase);
        canvas.dataset.island15PalaceEntryPhase = stage.phase;
        canvas.dataset.island15PalaceNavigationMode = 'exiting';
        canvas.dataset.island15CameraOutsideOuterThreshold = String(stage.cameraOutsideOuterThreshold);
        if (stage.focusMode === 'overview') {
          // The previous stage has already placed the camera outside z=14.
          // Restore the closed shell before pulling back to the hero view.
          setBoardActorsVisibleForPreset('overview');
          canvas.dataset.island15PalaceShellSwitch = 'closed-after-exit';
        }
        startIsland15CameraPose(stage, { onComplete: () => runStage(index + 1) });
      };

      if (departingRoom !== 'boss') {
        const hallStage = resolveIsland15RoomNavigationHallPose(departingRoom, 'boss');
        setBoardActorsVisibleForPreset('boss');
        if (hallStage) {
          startIsland15CameraPose(hallStage, {
            controlPosition: new THREE.Vector3(...hallStage.controlPosition),
            onComplete: () => runStage(0),
          });
          return;
        }
      }
      setBoardActorsVisibleForPreset('boss');
      runStage(0);
    };
    requestIsland15PalaceExit = beginIsland15PalaceExit;
    exitIsland15PalaceRef.current = beginIsland15PalaceExit;
    const trainRideParams = new URLSearchParams(window.location.search);
    const frostwellDeterministicEvidence = import.meta.env.DEV
      && isFrostmoonHaven
      && trainRideParams.get('island3dEvidence') === '1'
      && trainRideParams.get('island3dEvidencePreset') === 'frostwell';
    const requestedTrainRideView = trainRideParams.get('island13TrainRideView');
    const holdRequestedTrainRideView = import.meta.env.DEV
      && trainRideParams.get('island13TrainRideHold') === '1';
    const requestedTrainRidePhaseMsRaw = trainRideParams.get('island13TrainRidePhaseMs');
    const requestedTrainRidePhaseMs = requestedTrainRidePhaseMsRaw === null
      ? Number.NaN
      : Number(requestedTrainRidePhaseMsRaw);
    const trainRidePhaseDurationMs = import.meta.env.DEV && Number.isFinite(requestedTrainRidePhaseMs)
      ? THREE.MathUtils.clamp(requestedTrainRidePhaseMs, 800, ISLAND_13_TRAIN_RIDE_PHASE_MS)
      : ISLAND_13_TRAIN_RIDE_PHASE_MS;
    const requestedWonderRideWagon = trainRideParams.get('island19RideWagon') === 'middle' ? 'middle' : 'front';
    const requestedWonderRideProgressParam = trainRideParams.get('island19RideProgress');
    const requestedWonderRideProgressRaw = requestedWonderRideProgressParam === null
      ? Number.NaN
      : Number(requestedWonderRideProgressParam);
    const requestedWonderRideProgress = Number.isFinite(requestedWonderRideProgressRaw)
      ? THREE.MathUtils.clamp(requestedWonderRideProgressRaw, 0.01, 0.985)
      : null;
    const finishTrainRide = (restoreCamera = true) => {
      if (!activeTrainRide) return;
      const finishedRide = activeTrainRide;
      activeTrainRide = null;
      trainRidePublishedSeconds = -1;
      canvas.dataset.trainRidePhase = 'idle';
      setTrainRidePhase('idle');
      setTrainRideSecondsRemaining(15);
      camera.fov = finishedRide.returnFov;
      camera.updateProjectionMatrix();
      controls.enabled = !interactionPausedRef.current && !caretakerEncounterOpenRef.current;
      if (!restoreCamera) return;
      setBoardActorsVisibleForPreset(finishedRide.returnPreset);
      setActivePreset(finishedRide.returnPreset);
      if (isReducedMotion) {
        camera.position.copy(finishedRide.returnPosition);
        controls.target.copy(finishedRide.returnTarget);
        camera.lookAt(controls.target);
        controls.update();
        transition = null;
        return;
      }
      const fromPosition = camera.position.clone();
      const controlPosition = fromPosition.clone().lerp(finishedRide.returnPosition, 0.5);
      controlPosition.y += 1.4;
      transition = {
        startedAt: performance.now(),
        durationMs: 720,
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition: finishedRide.returnPosition,
        toTarget: finishedRide.returnTarget,
      };
    };
    const publishTrainRidePhase = (phaseIndex: number) => {
      if (!activeTrainRide) return;
      const view = ISLAND_13_TRAIN_RIDE_VIEWS[phaseIndex];
      if (!view) return;
      activeTrainRide.phaseIndex = phaseIndex;
      trainRidePublishedSeconds = -1;
      canvas.dataset.trainRidePhase = view;
      setTrainRidePhase(view);
      camera.fov = view === 'side' ? 56 : view === 'rear' ? 62 : 60;
      camera.updateProjectionMatrix();
    };
    const startTrainRide = (startedAt: number, initialView: Island13TrainRideView = 'driver') => {
      if (!isCactusCanyon || !livingAmbience.getTrainRidePose) return;
      const initialPhaseIndex = Math.max(0, ISLAND_13_TRAIN_RIDE_VIEWS.indexOf(initialView));
      activeTrainRide = {
        startedAt: startedAt - initialPhaseIndex * trainRidePhaseDurationMs,
        phaseIndex: initialPhaseIndex,
        phaseDurationMs: trainRidePhaseDurationMs,
        holdRequestedView: holdRequestedTrainRideView,
        returnPosition: camera.position.clone(),
        returnTarget: controls.target.clone(),
        returnFov: camera.fov,
        returnPreset: activeInspectionPreset,
      };
      transition = null;
      idleOverviewAt = null;
      controls.enabled = false;
      setBoardActorsVisibleForPreset('manual');
      setActivePreset('manual');
      publishTrainRidePhase(initialPhaseIndex);
    };
    const advanceTrainRide = () => {
      if (!activeTrainRide) return;
      const nextPhaseIndex = activeTrainRide.phaseIndex + 1;
      if (nextPhaseIndex >= ISLAND_13_TRAIN_RIDE_VIEWS.length) {
        finishTrainRide();
        return;
      }
      activeTrainRide.startedAt = performance.now() - nextPhaseIndex * activeTrainRide.phaseDurationMs;
      publishTrainRidePhase(nextPhaseIndex);
    };
    exitTrainRideRef.current = () => finishTrainRide();
    advanceTrainRideRef.current = advanceTrainRide;
    const publishWonderRidePhase = (phase: Island19CircuitFRidePhase) => {
      if (wonderRidePublishedPhase === phase) return;
      wonderRidePublishedPhase = phase;
      canvas.dataset.island19WonderRidePhase = phase;
      setWonderRidePhase(phase);
    };
    const finishWonderRide = (restoreCamera = true) => {
      if (!activeWonderRide || !island19CircuitFWorld) return;
      const finishedRide = activeWonderRide;
      activeWonderRide = null;
      wonderRidePublishedSeconds = -1;
      wonderRidePublishedPhase = 'idle';
      canvas.dataset.island19WonderRidePhase = 'idle';
      canvas.dataset.island19WonderRideActive = 'false';
      wonderRideKeyLight.visible = false;
      wonderRideRimLight.visible = false;
      if (wonderRideTransitionVeilRef.current) wonderRideTransitionVeilRef.current.style.opacity = '0';
      setWonderRidePhase('idle');
      setWonderRideSecondsRemaining(0);
      island19CircuitFWorld.train.visible = true;
      island19CircuitFWorld.setRiderPovActive(null);
      island19CircuitFWorld.setRidePhaseVisibility(null);
      island19CircuitFWorld.root.visible = isCircuitFPreviewEnabled;
      if (island19HybridOverlay) island19HybridOverlay.root.visible = true;
      if (island19FullWorld) island19FullWorld.root.visible = isMapStrippedEvidenceEnabled;
      if (island19CircuitGBoard) island19CircuitGBoard.root.visible = true;
      if (stagedRestorationRuntime) stagedRestorationRuntime.root.visible = true;
      finishedRide.returnVisibility.forEach((visible, object) => { object.visible = visible; });
      scene.background = finishedRide.returnBackground;
      scene.fog = finishedRide.returnFog;
      hemisphere.intensity = hemisphereIntensity;
      sunlight.intensity = sunlightIntensity;
      camera.up.copy(finishedRide.returnUp);
      camera.fov = finishedRide.returnFov;
      camera.updateProjectionMatrix();
      controls.enabled = !interactionPausedRef.current && !caretakerEncounterOpenRef.current;
      if (!restoreCamera) return;
      setActivePreset(finishedRide.returnPreset);
      if (isReducedMotion) {
        camera.position.copy(finishedRide.returnPosition);
        controls.target.copy(finishedRide.returnTarget);
        camera.lookAt(controls.target);
        controls.update();
        transition = null;
        return;
      }
      const fromPosition = camera.position.clone();
      const controlPosition = fromPosition.clone().lerp(finishedRide.returnPosition, 0.5);
      controlPosition.y += 1.7;
      transition = {
        startedAt: performance.now(),
        durationMs: 900,
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition: finishedRide.returnPosition,
        toTarget: finishedRide.returnTarget,
      };
    };
    const startWonderRide = (
      startedAt: number,
      wagon: Island19CircuitFWagon,
      fixedProgress: number | null = null,
    ) => {
      if (!isCoasterCarnival || !island19CircuitFWorld || activeWonderRide) return;
      if (activeTrainRide) finishTrainRide(false);
      const normalizedFixedProgress = fixedProgress === null
        ? null
        : THREE.MathUtils.clamp(fixedProgress, 0.01, 0.985);
      const returnVisibility = new Map<THREE.Object3D, boolean>();
      // Retire only legacy alternative representations. Canonical board tiles,
      // rewards and the actual island remain in the same scene during the ride.
      [island19HybridOverlay?.root, island19FullWorld?.root, island19CircuitGBoard?.root, stagedRestorationRuntime?.root].forEach((object) => {
        if (!object) return;
        returnVisibility.set(object, object.visible);
        object.visible = false;
      });
      activeWonderRide = {
        startedAt,
        durationMs: isReducedMotion ? 30_000 : island19CircuitFWorld.pacing.durationSeconds * 1000,
        wagon,
        fixedProgress: normalizedFixedProgress,
        returnPosition: camera.position.clone(),
        returnTarget: controls.target.clone(),
        returnFov: camera.fov,
        returnPreset: activeInspectionPreset,
        returnBackground: scene.background,
        returnFog: scene.fog,
        returnUp: camera.up.clone(),
        returnVisibility,
      };
      wonderRideCameraFilter.reset();
      transition = null;
      idleOverviewAt = null;
      controls.enabled = false;
      setActivePreset('manual');
      setWonderRideWagon(wagon);
      island19CircuitFWorld.root.visible = true;
      // The d017 ride camera occupies a named seat socket on the selected
      // physical carriage. Keep the train visible so the nose/restraint stays
      // in frame and the POV never reads like a detached fly-through.
      island19CircuitFWorld.train.visible = true;
      island19CircuitFWorld.setRiderPovActive(wagon);
      island19CircuitFWorld.setCutaway(false);
      if (island19HybridOverlay) island19HybridOverlay.root.visible = false;
      if (island19FullWorld) island19FullWorld.root.visible = false;
      if (island19CircuitGBoard) island19CircuitGBoard.root.visible = false;
      if (stagedRestorationRuntime) stagedRestorationRuntime.root.visible = false;
      scene.background = wonderRideSkyBackground;
      camera.fov = 66;
      camera.updateProjectionMatrix();
      canvas.dataset.island19WonderRideActive = 'true';
      canvas.dataset.island19WonderRideWagon = wagon;
      canvas.dataset.island19WonderRideMission = 'restart-wonder-circuit-victory-lap';
      const initialRidePhase = island19CircuitFWorld.getRideFrame(normalizedFixedProgress ?? 0.018, wagon).phase;
      island19CircuitFWorld.setRidePhaseVisibility(initialRidePhase);
      publishWonderRidePhase(initialRidePhase);
    };
    startWonderRideRef.current = (wagon) => startWonderRide(performance.now(), wagon);
    exitWonderRideRef.current = () => finishWonderRide();
    const applyControlledCameraFocus = (request: ControlledCameraFocusRequest) => {
      if (request.version <= appliedControlledCameraFocusVersionRef.current) return;
      appliedControlledCameraFocusVersionRef.current = request.version;
      idleOverviewAt = null;
      ambientCameraEligibleAt = performance.now() + (
        constructionPresentationRef.current?.active
          ? ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS
          : ISLAND_3D_BOARD_POV_IDLE_DELAY_MS
      );
      const snapInitialLockedConstructionFocus = Boolean(
        constructionPresentationRef.current?.active
        && constructionPresentationRef.current?.cameraLocked
        && activeInspectionPreset === 'overview'
        && request.preset !== 'overview',
      );
      // If the modal and its construction lock mount in the same React frame,
      // a normal transition is canceled on the first render tick and leaves
      // the crew stranded in the overview. Place that one initial shot
      // directly; later build input still locks every POV change.
      applyPreset(request.preset, request.durationScale, snapInitialLockedConstructionFocus);
    };
    applyControlledCameraFocusRef.current = applyControlledCameraFocus;
    if (controlledCameraFocusRequestRef.current) {
      applyControlledCameraFocus(controlledCameraFocusRequestRef.current);
    }
    // DEV microscope crops the original projection, never moves the review camera.
    const plantingMicroscopeCamera = import.meta.env?.DEV
      && new URLSearchParams(window.location.search).get('islandPalaceMicroscope') === '1'
      && new URLSearchParams(window.location.search).get('island3dEvidence') === '1'
      ? camera.clone() : null;
    if (new URLSearchParams(window.location.search).get('island3dEvidence') === '1') {
      const evidenceParams = new URLSearchParams(window.location.search);
      const evidencePreset = evidenceParams.get('island3dEvidencePreset');
      if (
        evidencePreset
        && (
          ISLAND_5_CAMERA_PRESETS.some((preset) => preset.id === evidencePreset)
          || (
            isCrystalGlacier
            && (ISLAND_15_CAMERA_PRESET_IDS as readonly Island5CameraPresetId[])
              .includes(evidencePreset as Island5CameraPresetId)
          )
        )
      ) {
        applyPreset(evidencePreset as Island5CameraPresetId, 0.2, true);
        const evidenceAzimuth = Number(evidenceParams.get('island3dEvidenceAzimuth'));
        if (Number.isFinite(evidenceAzimuth)) {
          const offset = camera.position.clone().sub(controls.target);
          const requestedDistanceScale = Number(evidenceParams.get('island3dEvidenceDistanceScale'));
          const distanceScale = Number.isFinite(requestedDistanceScale)
            ? THREE.MathUtils.clamp(requestedDistanceScale, 0.15, 4)
            : 1;
          const horizontalRadius = Math.hypot(offset.x, offset.z) * distanceScale;
          const radians = THREE.MathUtils.degToRad(evidenceAzimuth);
          camera.position.set(
            controls.target.x + Math.sin(radians) * horizontalRadius,
            controls.target.y + offset.y * distanceScale,
            controls.target.z + Math.cos(radians) * horizontalRadius,
          );
          camera.lookAt(controls.target);
          controls.update();
          publishCameraAuthoringPose(performance.now(), true);
          canvas.dataset.evidenceAzimuth = String(evidenceAzimuth);
          canvas.dataset.evidenceDistanceScale = String(distanceScale);
        }
      }
    }
    if (
      isCactusCanyon
      && ISLAND_13_TRAIN_RIDE_VIEWS.includes(requestedTrainRideView as Island13TrainRideView)
    ) {
      startTrainRide(performance.now(), requestedTrainRideView as Island13TrainRideView);
    }
    if (import.meta.env.DEV && isCoasterCarnival && trainRideParams.get('island19Ride') === '1') {
      startWonderRide(performance.now(), requestedWonderRideWagon, requestedWonderRideProgress);
    }

    const stopTour = (returnToOverview = true) => {
      if (!activeTour) return;
      activeTour = null;
      controls.enabled = true;
      setTourStatus('idle');
      if (returnToOverview) applyPreset('overview');
    };
    const applyAssemblyTourStep = (stepIndex: number) => {
      const step = ISLAND_1_ASSEMBLY_POV_TOUR_STEPS[stepIndex];
      if (!step) return;
      setBoardActorsVisibleForPreset('boss');
      setActivePreset('boss');
      const fromPosition = camera.position.clone();
      const toPosition = new THREE.Vector3(...step.position);
      if (stepIndex === 0 || stepIndex === 5) {
        const target = new THREE.Vector3(...step.target), offset = toPosition.clone().sub(target);
        const required = 15 * camera.zoom / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
        toPosition.copy(target).add(offset.setLength(Math.max(offset.length(), required)));
      }
      const controlPosition = fromPosition.clone().lerp(toPosition, 0.5);
      controlPosition.y += Math.min(4.2, Math.max(0.8, fromPosition.distanceTo(toPosition) * 0.1));
      transition = {
        startedAt: performance.now(),
        durationMs: isReducedMotion ? 220 : step.durationMs,
        fromPosition,
        fromTarget: controls.target.clone(),
        controlPosition,
        toPosition,
        toTarget: new THREE.Vector3(...step.target),
      };
    };
    const startAssemblyTour = () => {
      if (activeProfiler || activeTour || !isAssemblyCraterFirstLight) return;
      const firstStep = ISLAND_1_ASSEMBLY_POV_TOUR_STEPS[0];
      controls.enabled = false;
      setTourStatus('running');
      applyAssemblyTourStep(0);
      activeTour = {
        kind: 'assembly',
        stepIndex: 0,
        nextStepAt: performance.now() + (isReducedMotion ? 220 : firstStep.durationMs) + firstStep.holdMs,
      };
    };
    const cameraTourSteps = isCrystalGlacier
      ? ISLAND_15_CAMERA_TOUR_STEPS
      : ISLAND_CAMERA_TOUR_STEPS;
    const resolveTourTransitionDurationMs = (
      presetId: Island5CameraPresetId,
      previousPresetId?: Island5CameraPresetId,
    ) => {
      const baseDurationMs = getIsland5CameraPreset(presetId).durationMs;
      if (!isCrystalGlacier) return baseDurationMs;
      const poseOptions = {
        portrait: canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.75,
        envelope: island15CameraEnvelope,
      };
      if (presetId === 'boss' && previousPresetId && isIsland15ExteriorCameraPreset(previousPresetId)) {
        return resolveIsland15PortalEntrySequence(poseOptions)
          .reduce((total, stage) => total + stage.durationMs, 0);
      }
      if (presetId === 'overview' && previousPresetId && isIsland15PalaceRoomPreset(previousPresetId)) {
        return resolveIsland15PortalExitSequence(poseOptions)
          .reduce((total, stage) => total + stage.durationMs, 0);
      }
      const poseDurationMs = resolveIsland15CameraPose(presetId, poseOptions)?.durationMs ?? baseDurationMs;
      const navigationDurationMs = previousPresetId
        && isIsland15PalaceRoomPreset(previousPresetId)
        && isIsland15PalaceRoomPreset(presetId)
        ? resolveIsland15RoomNavigationHallPose(previousPresetId, presetId)?.durationMs ?? 0
        : 0;
      return poseDurationMs + navigationDurationMs;
    };
    const startTour = () => {
      if (activeProfiler || activeTour) return;
      if (
        isAssemblyCraterFirstLight
        && firstLightAssemblyCrater?.getConstructionPresentation().completed
      ) {
        startAssemblyTour();
        return;
      }
      const firstStep = cameraTourSteps[0];
      controls.enabled = false;
      setTourStatus('running');
      applyPreset(firstStep.preset);
      activeTour = {
        kind: 'island',
        stepIndex: 0,
        nextStepAt: performance.now() + resolveTourTransitionDurationMs(firstStep.preset) + firstStep.holdMs,
      };
    };
    startTourRef.current = startTour;
    stopTourRef.current = () => stopTour(true);

    const profilerChoreography: readonly { atMs: number; preset: Island5CameraPresetId }[] = [
      { atMs: 4_500, preset: 'boss' },
      { atMs: 9_500, preset: 'orbit-left' },
      { atMs: 14_500, preset: 'hatchery' },
      { atMs: 19_500, preset: 'orbit-right' },
      { atMs: 24_500, preset: 'overview' },
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
      island15PalaceEntryActive = false;
      island15PalaceExitActive = false;
      setIsland15PalaceEntryPhase('idle');
      idleOverviewAt = null;
      ambientCameraEligibleAt = performance.now() + (
        constructionPresentationRef.current?.active
          ? ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS
          : ISLAND_3D_BOARD_POV_IDLE_DELAY_MS
      );
      if (isCrystalGlacier && isIsland15PalaceRoomPreset(activeInspectionPreset)) {
        applyIsland15OrbitControlMode('authored-interior');
        setBoardActorsVisibleForPreset(activeInspectionPreset);
        setActivePreset(activeInspectionPreset);
        canvas.dataset.island15PalaceNavigationMode = 'inside';
        canvas.dataset.island15PalaceCurrentRoom = activeInspectionPreset;
      } else {
        if (isCrystalGlacier) applyIsland15OrbitControlMode('exterior');
        setBoardActorsVisibleForPreset('manual');
        setActivePreset('manual');
      }
    };
    controls.addEventListener('start', cancelTransition);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      const previousAspect = camera.aspect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (isAssemblyCraterFirstLight && Math.abs(previousAspect - camera.aspect) > .001 && !activeTour && !cameraAuthoringEnabledRef.current && activeInspectionPreset !== 'manual' && ['boss','hatchery','habit','wisdom','event'].includes(activeInspectionPreset)) {
        applyPreset(activeInspectionPreset, 1, true);
      }
      if (isCrystalGlacier && island15LastExteriorPose && !transition
        && !island15PalaceEntryActive && !island15PalaceExitActive
        && isIsland15ExteriorCameraPreset(activeInspectionPreset)) {
        startIsland15CameraPose(island15LastExteriorPose, { instant: true });
      }
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown.set(event.clientX, event.clientY);
      ambientCameraEligibleAt = performance.now() + (
        constructionPresentationRef.current?.active
          ? ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS
          : ISLAND_3D_BOARD_POV_IDLE_DELAY_MS
      );
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (
        interactionPausedRef.current
        || activeTour
        || activeProfiler
        || activeTokenMotion
        || activeTrainRide
        || activeWonderRide
        || island15PalaceEntryActive
        || island15PalaceExitActive
      ) return;
      if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 7) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const trainIntersection = raycaster.intersectObjects(clickableRideTrain, true)[0];
      if (trainIntersection) {
        const tappedAt = performance.now();
        const tapPosition = new THREE.Vector2(event.clientX, event.clientY);
        const isDoubleTap = tappedAt - lastTrainTapAt <= 430
          && lastTrainTapPosition.distanceTo(tapPosition) <= 28;
        lastTrainTapAt = tappedAt;
        lastTrainTapPosition.copy(tapPosition);
        if (isDoubleTap) {
          lastTrainTapAt = Number.NEGATIVE_INFINITY;
          if (isCoasterCarnival) startWonderRide(tappedAt, 'front');
          else startTrainRide(tappedAt);
        }
        // A single tap reserves the moving consist for its documented
        // double-tap interaction instead of focusing a landmark behind it.
        return;
      }
      const caretakerIntersection = raycaster.intersectObjects(clickableCaretaker, true)[0];
      if (caretakerIntersection) {
        idleOverviewAt = null;
        applyCaretakerFocus(0.88);
        onCaretakerClickRef.current?.();
        return;
      }
      const signatureMissionIntersection = raycaster.intersectObjects(clickableSignatureMissions, true)[0];
      if (signatureMissionIntersection) {
        idleOverviewAt = null;
        if (isFrostmoonHaven) applyPreset('frostwell', 0.9);
        if (isRootheartCanopyCity) applyPreset('powerworks', 0.9);
        if (isSunkenSands) applyPreset('boss', 0.9);
        if (isJungleExpedition) applyPreset('boss', 0.86);
        onSignatureMissionClickRef.current?.();
        return;
      }
      const isIsland15OutsideView = isIsland15ExteriorCameraPreset(activeInspectionPreset)
        || activeInspectionPreset === 'manual';
      if (
        isCrystalGlacier
        && island15PalaceRuntime
        && isIsland15OutsideView
        && raycaster.intersectObject(island15PalaceRuntime.root, true).length > 0
      ) {
        beginIsland15PalaceEntry();
        // Exterior entry is camera choreography only. Landmark challenges are
        // intentionally opened only by their existing explicit room targets.
        return;
      }
      const intersections = raycaster.intersectObjects(clickableLandmarks, true);
      const landmarkId = intersections
        .map((candidate) => resolveLandmarkIdFromIntersection(candidate.object))
        .find((candidate): candidate is Island5CameraPresetId => candidate !== null);
      if (landmarkId) {
        idleOverviewAt = null;
        applyPreset(landmarkId);
        if (landmarkId === 'boss' || landmarkId === 'hatchery' || landmarkId === 'habit' || landmarkId === 'wisdom' || landmarkId === 'event') {
          selectedLandmarkIdRef.current = landmarkId;
          onLandmarkClickRef.current?.(landmarkId);
        }
      }
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    if (isFrostmoonHaven || isDriftwoodIsle || isSunshoreAtoll) {
      // At phone scale the authored alpha, clearcoat and highlights carry glass
      // and frost. Avoid a second full-world transmission render for tiny panes.
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const surfaces = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of surfaces) {
          if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
          if (material.transparent) material.forceSinglePass = true;
        }
        if (surfaces.every(material => material.transparent)) object.castShadow = false;
      });
    }
    const island1AnimatedBatches = isAssemblyCraterFirstLight ? createIsland1AnimatedBatches(scene)
      : isCelestialSkyKingdom ? createIslandRigidSurfaceBatches(scene, [
        'ISLAND_2_CELESTIAL_LIVING_AMBIENCE',
        ...['BOSS', 'HATCHERY', 'HABIT', 'WISDOM', 'EVENT'].map(id => `ISLAND_2_CELESTIAL_${id}_ROOT`),
        'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS',
        'ISLAND_5_CARETAKER_BOARD_LOD',
      ], 'ISLAND_002_ANIMATED_SURFACE_BATCHES', 32)
      : isDriftwoodIsle ? createIslandRigidSurfaceBatches(scene, [
        'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS', 'ISLAND_5_CARETAKER_BOARD_LOD',
        'ISLAND_4_V2_LIVING_WORLD',
        ...['BOSS','HATCHERY','HABIT','WISDOM','EVENT'].map(id => `ISLAND_4_V2_${id}_MODEL`),
      ], 'ISLAND_004_BOARD_SURFACE_BATCHES', 32)
      : isSunshoreAtoll ? createIslandRigidSurfaceBatches(scene, [
        'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS', 'ISLAND_5_CARETAKER_BOARD_LOD',
        'ISLAND_2_TROPICAL_AMBIENCE',
        // Rigid creature parts retain their animated source pivots and raycasts.
        'ISLAND_RUN_ARENA_CREATURE_PRESENTATION_ROOT',
        ...['HATCHERY', 'HABIT', 'WISDOM', 'EVENT'].map(id => `ISLAND_2_${id}_ROOT`),
      ], 'ISLAND_005_BOARD_SURFACE_BATCHES', 32)
      : isFrostmoonHaven ? createIslandRigidSurfaceBatches(scene, [
        'ISLAND_RUN_CANONICAL_TILE_REWARD_OBJECTS', 'ISLAND_5_CARETAKER_BOARD_LOD',
        'ISLAND_3_FROSTMOON_LIVING_AMBIENCE',
      ], 'ISLAND_003_BOARD_SURFACE_BATCHES', 32, mesh => {
        for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
          if (node.name === 'ISLAND_3_FROSTWELL_ICEWORKS_OFFSHORE_ROOT') return false;
        }
        return true;
      }) : null;
    if (isSunshoreAtoll) canvas.dataset.sunshoreRigidBatchSources = String(island1AnimatedBatches?.sourceCount ?? 0);
    // Mission surfaces stay under the mission root so the cinematic's scene
    // mask cannot hide them. Material-swapping lamps remain ordinary meshes.
    const frostwellBatchOwner = isFrostmoonHaven ? scene.getObjectByName('ISLAND_3_FROSTWELL_ICEWORKS_OFFSHORE_ROOT') : null;
    const frostwellRigidBatches = frostwellBatchOwner ? createIslandRigidSurfaceBatches(scene,
      [frostwellBatchOwner.name], 'ISLAND_003_FROSTWELL_SURFACE_BATCHES', 32,
      mesh => !mesh.name.startsWith('FROSTWELL_PROGRESS_LIGHT_')) : null;
    if (frostwellRigidBatches) frostwellBatchOwner?.add(frostwellRigidBatches.root);
    const celestialPlantBatches = isCelestialSkyKingdom ? createCelestialPlantRuntimeBatches(scene) : null;
    let appliedConstructionCameraKey = '';
    let appliedIsland15ConstructionRevealKey = '';
    let firstArrival: ReturnType<typeof createIsland001FirstArrival> | null = null;
    let firstArrivalTime = 0;
    let firstArrivalWelcomeNotified = false;
    let firstArrivalCompleted = false;
    let firstArrivalBeat = '';
    let firstArrivalVersion = firstArrivalRestartRef.current;
    const openingCeremonyFx = isDriftwoodIsle ? createOpeningGamesCeremonyThree() : null;
    if (openingCeremonyFx) {
      openingCeremonyFx.bindPalace(scene.getObjectByName('OPENING_PALACE'),
        ISLAND_5_LANDMARKS.find(landmark => landmark.id === 'event')?.position);
      scene.add(openingCeremonyFx.root);
    }
    const animate = (now: number) => {
      // The opaque inspection portal owns the screen. Retain the world, but
      // avoid rendering two expensive WebGL scenes on a phone simultaneously.
      if (isTitansRest && stagedRestorationPresentationRef.current?.titanInspectionOpen) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }
      animationFrame = window.requestAnimationFrame(animate);
      timer.update(now);
      const elapsed = timer.getElapsed();
      tileRewardObjects.setTechnologyFragments(tilePresentationRef.current.fragments);
      tileRewardObjects.setTrafficLightCharge(tilePresentationRef.current.trafficLightCharge);
      const ceremonyPlayback = openingCeremonyPlaybackRef.current;
      const ceremonyElapsed = ceremonyPlayback ? Math.max(0, Date.now() - ceremonyPlayback.startedAtMs) : 0;
      openingCeremonyFx?.update(ceremonyPlayback ? {
        active: true, elapsedMs: ceremonyElapsed, reducedMotion: ceremonyPlayback.reducedMotion,
      } : null);
      if (openingCeremonyFx) canvas.dataset.openingCeremonyPhase = ceremonyPlayback
        ? sampleOpeningCeremony(ceremonyElapsed, ceremonyPlayback.reducedMotion).phase : 'idle';
      const actualFrameDeltaSeconds = Math.max(0, (now - lastAnimationFrameAt) / 1000);
      const frameDeltaSeconds = Math.min(0.05, actualFrameDeltaSeconds);
      // A tab suspension must not teleport the physical rider several metres.
      // Ordinary frames retain the faster distance-domain clock unchanged.
      if (activeWonderRide && actualFrameDeltaSeconds > .2) {
        activeWonderRide.startedAt += (actualFrameDeltaSeconds - .05) * 1000;
      }
      lastAnimationFrameAt = now;
      // Prepare the current target before an immediate work-lock captures its POV.
      updateConstructionPresentation();
      const constructionCameraPresentation = constructionPresentationRef.current;
      const constructionCameraActive = Boolean(constructionCameraPresentation?.active);
      const constructionCameraWorking = Boolean(
        constructionCameraActive && constructionCameraPresentation?.working,
      );
      const island15ConstructionReveal = Boolean(
        isCrystalGlacier
        && constructionCameraActive
        && constructionCameraPresentation?.phase === 'reveal'
      );
      const constructionCameraLocked = Boolean(
        constructionCameraActive
        && (constructionCameraPresentation?.cameraLocked || constructionCameraWorking),
      ) && !island15ConstructionReveal;
      const nextAmbientCameraContext = constructionCameraActive ? 'build-modal' : 'board';
      if (nextAmbientCameraContext !== ambientCameraContext) {
        ambientCameraContext = nextAmbientCameraContext;
        ambientCameraEligibleAt = now + (
          ambientCameraContext === 'build-modal'
            ? ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS
            : ISLAND_3D_BOARD_POV_IDLE_DELAY_MS
        );
        ambientCameraStep = 0;
      }
      if (constructionCameraLocked) {
        // Active and recently active construction owns the shot. Repeated
        // taps/hold frames continually extend the lock instead of initiating
        // a distracting camera transition mid-action. Stop an idle orbit that
        // was already in flight too: a lock that only blocks new transitions
        // still makes a grounded landmark appear to float beneath the camera.
        const lockedPreset = constructionCameraPresentation?.targetStopId === 'mystery'
          ? 'event'
          : constructionCameraPresentation?.targetStopId;
        const snapInitialLockedConstructionFocus = Boolean(
          !wasConstructionCameraLocked
          && lockedPreset
          && ISLAND_5_CAMERA_PRESETS.some((preset) => preset.id === lockedPreset)
        );
        if (snapInitialLockedConstructionFocus && lockedPreset) {
          // A player can fund the first beat while the opening camera glide is
          // still travelling or after a gentle orbit has just settled. Snap
          // every new work lock to the authored shot exactly once so the crew
          // can never begin at the edge of frame.
          applyPreset(lockedPreset as Island5CameraPresetId, 1, true);
        }
        if (transition) transition = null;
        ambientCameraEligibleAt = Number.POSITIVE_INFINITY;
        wasConstructionCameraLocked = true;
        canvas.dataset.ambientCameraMode = constructionCameraWorking
          ? 'build-locked'
          : 'build-recent-cooldown';
      } else if (wasConstructionCameraLocked) {
        wasConstructionCameraLocked = false;
        // The choreography burst is intentionally shorter than the camera
        // cooldown. Start a fresh full idle window when renderer ownership is
        // released so no React scheduling edge can collapse the promised
        // seven-second stable shot into the old 600 ms handoff.
        ambientCameraEligibleAt = now + ISLAND_3D_BUILD_MODAL_POV_IDLE_DELAY_MS;
        canvas.dataset.ambientCameraMode = 'build-recent-cooldown';
      }
      let cactusCanyonBlastCameraPose: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
      let jungleBuildupCameraPose: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
      let jungleZenithCameraPose: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
      let marinaArrivalCameraPose: { position: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
      // View culling is accessibility-neutral scene hygiene, not decorative
      // motion, so it must still run when reduced motion freezes ambience.
      livingAmbience.updateView?.(camera.position, controls.target, isReducedMotion);
      if (isAssemblyCraterFirstLight && firstLightAssemblyCrater) {
        const assemblyPresentation = firstLightAssemblyCraterPresentationRef.current;
        const presentationKey = [
          assemblyPresentation.chargesDetonated,
          assemblyPresentation.completed ? 1 : 0,
          assemblyPresentation.constructionSequence ?? 0,
          ...(assemblyPresentation.claimedDynamiteTileIndices ?? []),
        ].join(':');
        if (presentationKey !== firstLightAssemblyPresentationKey) {
          firstLightAssemblyPresentationKey = presentationKey;
          firstLightAssemblyCrater.updateAssemblyCrater(assemblyPresentation, isReducedMotion);
          if (!assemblyPresentation.completed) {
            wasAssemblyConstructionActive = false;
            wasMarinaArrivalActive = false;
            automaticAssemblyTourStarted = false;
          }
          tileRewardObjects.setFirstLightClaimedDynamiteTiles(
            assemblyPresentation.claimedDynamiteTileIndices ?? [],
          );
        }
      }
      if (isCelestialSkyKingdom) {
        const redockingPresentation = celestialRedockingPresentationRef.current;
        livingAmbience.updateRedocking?.(redockingPresentation, isReducedMotion);
        canvas.dataset.celestialRedockingRolls = String(redockingPresentation.completedRolls);
        canvas.dataset.celestialRedockingDockedPlatforms = String(redockingPresentation.dockedPlatformCount);
      }
      if (isSunkenSands) {
        livingAmbience.updateTreasureProgress?.(
          sunkenSandsTreasurePresentationRef.current,
          isReducedMotion,
        );
      }
      const resolvedStagedRestorationPresentation = resolveStagedRestorationPresentation(elapsed);
      if (stagedRestorationRuntime && resolvedStagedRestorationPresentation) {
        const nextPresentation = resolvedStagedRestorationPresentation;
        const nextKey = `${nextPresentation.titanAwakening?.revision ?? 0}:${nextPresentation.activatedStages}:${nextPresentation.constructionSequence ?? 0}:${(nextPresentation.claimedPickupTileIndices ?? []).join(',')}`;
        if (nextKey !== stagedRestorationPresentationKey) {
          stagedRestorationPresentationKey = nextKey;
          stagedRestorationRuntime.update(nextPresentation, isReducedMotion);
          tileRewardObjects.setStagedRestorationClaimedTiles(nextPresentation.claimedPickupTileIndices ?? []);
          const nextConstructionSequence = Math.max(0, Math.floor(nextPresentation.constructionSequence ?? 0));
          if (
            isCoasterCarnival
            && nextPresentation.activatedStages >= nextPresentation.stageCount
            && nextConstructionSequence > wonderRideCompletedConstructionSequence
          ) {
            wonderRideCompletedConstructionSequence = nextConstructionSequence;
            wonderRidePendingAfterConstruction = true;
            canvas.dataset.island19WonderRideReady = 'true';
          }
        }
        stagedRestorationRuntime.animate(elapsed, isReducedMotion);
        if (isJungleExpedition) {
          const requestedSequence = Math.max(0, Math.floor(nextPresentation.constructionSequence ?? 0));
          if (requestedSequence > jungleZenithLastConstructionSequence) {
            jungleZenithLastConstructionSequence = requestedSequence;
            if (nextPresentation.activatedStages >= nextPresentation.stageCount) {
              jungleBuildupCameraWasActive = false;
              jungleBuildupCameraOrigin = null;
              jungleZenithStartedAtMs = now;
              jungleZenithCameraOrigin = {
                position: camera.position.clone(),
                target: controls.target.clone(),
              };
              if (!isReducedMotion) {
                jungleZenithCameraWasActive = true;
                transition = null;
                idleOverviewAt = null;
                controls.enabled = false;
                setActivePreset('manual');
              }
            } else if (nextPresentation.activatedStages > 0) {
              jungleBuildupStage = THREE.MathUtils.clamp(Math.floor(nextPresentation.activatedStages), 1, 4);
              jungleBuildupStartedAtMs = now;
              jungleBuildupCameraOrigin = {
                position: camera.position.clone(),
                target: controls.target.clone(),
              };
              if (!isReducedMotion) {
                jungleBuildupCameraWasActive = true;
                transition = null;
                idleOverviewAt = null;
                controls.enabled = false;
                setActivePreset('manual');
              }
            }
          }
          livingAmbience.setLivingCompassStage?.({
            activatedStages: nextPresentation.activatedStages,
            constructionSequence: nextPresentation.constructionSequence,
            completed: nextPresentation.activatedStages >= nextPresentation.stageCount,
          });
          const buildupDuration = jungleBuildupDurationMs[jungleBuildupStage] || 4_200;
          const buildupProgress = Number.isFinite(jungleBuildupStartedAtMs)
            ? THREE.MathUtils.clamp((now - jungleBuildupStartedAtMs) / (isReducedMotion ? 450 : buildupDuration), 0, 1)
            : 1;
          canvas.dataset.jungleBuildupStage = String(jungleBuildupStage);
          canvas.dataset.jungleBuildupProgress = buildupProgress.toFixed(3);
          if (jungleBuildupCameraWasActive && jungleBuildupCameraOrigin && buildupProgress < 1) {
            const shot = jungleBuildupCameraShots[jungleBuildupStage];
            if (shot) {
              const position = new THREE.Vector3();
              const target = new THREE.Vector3();
              const approach = THREE.MathUtils.smoothstep(buildupProgress, 0, 0.22);
              position.lerpVectors(jungleBuildupCameraOrigin.position, shot.position, approach);
              target.lerpVectors(jungleBuildupCameraOrigin.target, shot.target, approach);
              if (buildupProgress >= 0.22) {
                const survey = THREE.MathUtils.smoothstep(buildupProgress, 0.22, 0.88);
                const lateralDirection = jungleBuildupStage === 3 ? 1 : jungleBuildupStage % 2 === 0 ? -1 : 1;
                const lateralTravel = jungleBuildupStage === 3 ? 2.35 : 0.72;
                position.x += Math.sin(survey * Math.PI) * lateralTravel * lateralDirection;
                position.y += Math.sin(survey * Math.PI) * (jungleBuildupStage === 4 ? 0.92 : 0.42);
                target.y += Math.sin(survey * Math.PI) * (jungleBuildupStage === 3 ? 0.18 : 0.36);
              }
              jungleBuildupCameraPose = { position, target };
            }
          } else if (jungleBuildupCameraWasActive) {
            jungleBuildupCameraWasActive = false;
            jungleBuildupCameraOrigin = null;
            controls.enabled = true;
            applyPreset('overview', 0.54);
          }
          const zenithDurationMs = isReducedMotion ? JUNGLE_COMPASS_REDUCED_CEREMONY_DURATION_MS : JUNGLE_COMPASS_CEREMONY_DURATION_MS;
          const zenithProgress = Number.isFinite(jungleZenithStartedAtMs)
            ? THREE.MathUtils.clamp((now - jungleZenithStartedAtMs) / zenithDurationMs, 0, 1)
            : 1;
          canvas.dataset.jungleZenithProgress = zenithProgress.toFixed(3);
          canvas.dataset.jungleZenithPhase = zenithProgress < 0.18
            ? 'compass-awakening'
            : zenithProgress < 0.48
              ? 'ruin-ascension'
              : zenithProgress < 0.66
                ? 'waterfall-reversal'
                : zenithProgress < 0.75
                  ? 'energy-to-sky'
                  : zenithProgress < 0.94
                    ? 'compass-book-descent'
                    : zenithProgress < 1
                      ? 'chapter-awakening'
                      : 'complete';
          if (jungleZenithCameraWasActive && jungleZenithCameraOrigin && zenithProgress < 1) {
            jungleZenithCameraPose = resolveIsland18CompassCeremonyCamera(
              zenithProgress, jungleZenithCameraOrigin, getIsland18EmeraldZenithFocus(), camera.aspect,
            );
          } else if (jungleZenithCameraWasActive) {
            jungleZenithCameraWasActive = false;
            jungleZenithCameraOrigin = null;
            controls.enabled = true;
            applyPreset('overview', 1.6);
          }
        }
        canvas.dataset.stagedRestorationStage = String(nextPresentation.activatedStages);
        canvas.dataset.stagedRestorationIsland = String(nextPresentation.islandNumber);
      }
      if (isLavaLabyrinth && stagedRestorationPresentationRef.current) {
        const nextPresentation = stagedRestorationPresentationRef.current;
        const nextKey = `${nextPresentation.activatedStages}:${nextPresentation.constructionSequence ?? 0}`;
        if (nextKey !== ironSkiffPresentationKey) {
          const previousSequence = Number(ironSkiffPresentationKey.split(':')[1] ?? 0);
          const nextSequence = Math.max(0, Math.floor(nextPresentation.constructionSequence ?? 0));
          livingAmbience.setIronSkiffStage?.(
            nextPresentation.activatedStages,
            nextSequence !== previousSequence,
          );
          ironSkiffPresentationKey = nextKey;
          tileRewardObjects.setStagedRestorationClaimedTiles(nextPresentation.claimedPickupTileIndices ?? []);
        }
        livingAmbience.updateIronSkiffNavigation?.(island20SkiffNavigationRef.current);
        canvas.dataset.island20IronSkiffStage = String(nextPresentation.activatedStages);
        canvas.dataset.island20IronSkiffMission = 'escape-lava-labyrinth';
        canvas.dataset.island20SkiffNavigation = island20SkiffNavigationRef.current.active ? 'active' : 'docked';
        const authoredCityEvidence = livingAmbience.root.userData.authoredCity;
        canvas.dataset.island20AuthoredCityStatus = String(authoredCityEvidence?.status ?? 'unknown');
        canvas.dataset.island20AuthoredCityAsset = String(authoredCityEvidence?.asset ?? '');
        canvas.dataset.island20AuthoredCityParts = String(authoredCityEvidence?.semanticPartCount ?? 0);
        canvas.dataset.island20RepresentationFamily = String(livingAmbience.root.userData.representationFamily ?? 'unknown');
        if (isReducedMotion && island20SkiffNavigationRef.current.active) livingAmbience.animate(elapsed);
      }
      if (
        wonderRidePendingAfterConstruction
        && !isReducedMotion
        && !interactionPausedRef.current
        && !constructionPresentationRef.current?.active
        && !activeTokenMotion
        && !activeTrainRide
        && !activeWonderRide
      ) {
        wonderRidePendingAfterConstruction = false;
        startWonderRide(now, 'front');
      }
      if (isHoneycombKingdom) {
        const honeyfallPresentation = greatHoneyfallPresentationRef.current;
        const nextHoneyfallStage = honeyfallPresentation.activatedReservoirs;
        const nextHoneyfallSequence = Math.max(
          0,
          Math.floor(honeyfallPresentation.constructionSequence ?? 0),
        );
        if (
          nextHoneyfallStage !== honeyfallLastStage
          || nextHoneyfallSequence !== honeyfallLastConstructionSequence
        ) {
          livingAmbience.setGreatHoneyfallStage?.(
            nextHoneyfallStage,
            nextHoneyfallSequence !== honeyfallLastConstructionSequence,
          );
          honeyfallLastStage = nextHoneyfallStage;
          honeyfallLastConstructionSequence = nextHoneyfallSequence;
        }
        // The mission's reduced-motion branch applies the completed state in
        // one frame; other ambient worlds remain frozen as before.
        if (isReducedMotion) livingAmbience.animate(elapsed);
      }
      if (isCactusCanyon) {
        let spiralPresentation = cactusCanyonSpiralPresentationRef.current;
        if (cactusCanyonBlastPreviewEnabled) {
          const previewCycle = Math.floor(elapsed / 3.1);
          spiralPresentation = {
            started: true,
            segmentsExcavated: Math.floor(cactusCanyonBlastPreviewSegment),
            maxSegments: 16,
            completed: false,
            constructionSequence: 10_000 + previewCycle,
          };
        }
        tileRewardObjects.setCactusCanyonMissionStarted(spiralPresentation.started !== false);
        const requestedSequence = Math.max(0, Math.floor(spiralPresentation.constructionSequence ?? 0));
        if (requestedSequence > cactusCanyonLastConstructionSequence) {
          if (activeTrainRide) finishTrainRide(false);
          cactusCanyonLastConstructionSequence = requestedSequence;
          cactusCanyonBlastStartedAtMs = now;
          cactusCanyonBlastCameraWasActive = true;
          transition = null;
          idleOverviewAt = null;
          controls.enabled = false;
          setActivePreset('manual');
        }
        const blastDurationMs = isReducedMotion ? 650 : 2_350;
        const blastProgress = Number.isFinite(cactusCanyonBlastStartedAtMs)
          ? THREE.MathUtils.clamp((now - cactusCanyonBlastStartedAtMs) / blastDurationMs, 0, 1)
          : 1;
        livingAmbience.updateSpiralRail?.({ ...spiralPresentation, blastProgress });
        if (blastProgress < 1) {
          const target = getIsland13SpiralBlastFocus(spiralPresentation.segmentsExcavated);
          const baseAngle = Math.atan2(target.z, target.x);
          const orbitProgress = THREE.MathUtils.smoothstep(blastProgress, 0, 1);
          // Orbit across the outward face of the active gallery. A full spin
          // would place the mountain between camera and charge for half the
          // sequence; this broad 86° sweep preserves the spinning sensation
          // while keeping the blast and new rail readable throughout.
          const orbitAngle = baseAngle - 0.35 + orbitProgress * 0.7;
          const shakeWindow = blastProgress >= 0.34 && blastProgress <= 0.56
            ? Math.sin((blastProgress - 0.34) / 0.22 * Math.PI)
            : 0;
          const shake = isReducedMotion ? 0 : shakeWindow * 0.16;
          cactusCanyonBlastCameraPose = {
            target,
            position: new THREE.Vector3(
              Math.cos(orbitAngle) * 24.5 + Math.sin(now * 0.11) * shake,
              target.y + 7.6 + Math.sin(now * 0.17) * shake * 0.45,
              Math.sin(orbitAngle) * 24.5 + Math.cos(now * 0.13) * shake,
            ),
          };
        } else if (cactusCanyonBlastCameraWasActive) {
          cactusCanyonBlastCameraWasActive = false;
          controls.enabled = true;
          applyPreset('canyon-spiral', 0.72);
        }
      }
      if (isRootheartCanopyCity) {
        const powerworksPresentation = rootheartPowerworksPresentationRef.current;
        const requestedSequence = Math.max(0, Math.floor(powerworksPresentation.constructionSequence ?? 0));
        if (requestedSequence > rootheartLastConstructionSequence) {
          rootheartLastConstructionSequence = requestedSequence;
          rootheartConstructionStartedAtMs = now;
        }
        const constructionDurationMs = powerworksPresentation.buildStage >= 3 ? 5_200 : 3_200;
        const derivedTransitionProgress = Number.isFinite(rootheartConstructionStartedAtMs)
          ? THREE.MathUtils.smoothstep(
              THREE.MathUtils.clamp((now - rootheartConstructionStartedAtMs) / constructionDurationMs, 0, 1),
              0,
              1,
            )
          : 1;
        const resolvedPowerworksPresentation: Island10RootheartPowerworksPresentation = {
          ...powerworksPresentation,
          transitionProgress: powerworksPresentation.transitionProgress ?? derivedTransitionProgress,
        };
        livingAmbience.updatePowerworksStage?.(resolvedPowerworksPresentation);
        const completedStageBase = Math.max(0, resolvedPowerworksPresentation.buildStage - 1);
        const activeStageProgress = resolvedPowerworksPresentation.buildStage === 0
          ? 0
          : THREE.MathUtils.clamp(resolvedPowerworksPresentation.transitionProgress ?? 1, 0, 1);
        const twilightProgress = THREE.MathUtils.clamp(
          (completedStageBase + activeStageProgress) / 3,
          0,
          1,
        );
        // Keep the first construction beats welcoming, then let the completed
        // Powerworks land as a true enchanted night reveal. The squared curve
        // protects board readability at stages one and two while giving stage
        // three enough darkness for the powered interiors to become the focus.
        const nightDepth = twilightProgress * twilightProgress;
        const isMoonlitBackdrop = twilightProgress >= 0.82;
        if (rootheartDayBackdrop && rootheartNightBackdrop) {
          // Both textures share the exact same source pixels and registration;
          // only the deterministic colour grade differs. Switch during the
          // final build transition so no branch, bridge, or lantern can jump.
          scene.background = isMoonlitBackdrop
            ? rootheartNightBackdrop
            : rootheartDayBackdrop;
        }
        // The Powerworks reward is an island-wide emotional change, not only
        // a brighter dynamo. Each funded stage advances the canopy from warm
        // afternoon into blue-hour dusk so lanterns, sapglass and travelling
        // power pulses become progressively legible.
        scene.backgroundIntensity = isMoonlitBackdrop
          ? 0.76
          : THREE.MathUtils.lerp(1, 0.48, nightDepth);
        hemisphere.intensity = THREE.MathUtils.lerp(1.78, 0.82, nightDepth);
        hemisphere.color.copy(rootheartLightingScratch.copy(rootheartDaySky).lerp(rootheartEveningSky, nightDepth));
        hemisphere.groundColor.copy(rootheartLightingScratch.copy(rootheartDayGround).lerp(rootheartEveningGround, nightDepth));
        sunlight.intensity = THREE.MathUtils.lerp(3.8, 1.12, nightDepth);
        sunlight.color.copy(rootheartLightingScratch.copy(rootheartDaySun).lerp(rootheartEveningSun, nightDepth));
        renderer.toneMappingExposure = THREE.MathUtils.lerp(1.1, 0.96, nightDepth);
        if (island10RootheartMaterials) {
          island10RootheartMaterials.lantern.emissiveIntensity = THREE.MathUtils.lerp(1.05, 2.75, nightDepth);
          island10RootheartMaterials.sapglass.emissiveIntensity = THREE.MathUtils.lerp(0.46, 1.35, nightDepth);
        }
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(rootheartLightingScratch.copy(rootheartDayFog).lerp(rootheartEveningFog, nightDepth));
        }
      }
      const lavaLookdevElapsed = lavaLookdevEvidenceTime ?? elapsed;
      if (isLavaLabyrinth) {
        const thermalElapsed = isReducedMotion ? 0 : lavaLookdevElapsed;
        const thermalContact = 0.5 + 0.5 * (
          Math.sin(thermalElapsed * 0.73) * 0.7
          + Math.sin(thermalElapsed * 1.91 + 0.8) * 0.3
        );
        tileMaterials.forEach((material, index) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return;
          const base = index === 2 ? 0.32 : index === 1 ? 0.12 : 0.13;
          material.emissiveIntensity = base + thermalContact * (index === 2 ? 0.13 : 0.1);
        });
        canvas.dataset.island20LavaFlowTime = lavaLookdevElapsed.toFixed(3);
        canvas.dataset.island20LavaFlow = isReducedMotion ? 'frozen-reduced-motion' : 'gravity-down-and-centre-outward-plus-multi-scale-hot-core-depth';
        canvas.dataset.island20HeatIllumination = 'physical-lava-contact-plus-live-forge-lights-and-tile-emissive-response';
      }
      if (isAssemblyCraterFirstLight && firstLightAssemblyCrater) {
        const assembly = firstLightAssemblyCrater.getConstructionPresentation();
        const marina = firstLightAssemblyCrater.getMarinaPresentation();
        canvas.dataset.assemblyConstructionPhase = assembly.active ? 'building' : assembly.completed ? 'complete' : 'excavating';
        canvas.dataset.assemblyConstructionProgress = assembly.progress.toFixed(3);
        canvas.dataset.assemblyMarinaPhase = marina.phase;
        canvas.dataset.assemblyMarinaProgress = marina.progress.toFixed(3);
        canvas.dataset.assemblyMarinaBerths = String(marina.berthCount);
        canvas.dataset.assemblyMarinaDesignFamilies = String(marina.designFamilyCount);
        canvas.dataset.assemblyMarinaFleetMix = `${marina.spacecraftCount}-spacecraft:${marina.yachtCount}-yachts`;
      }
      if (isFrostmoonHaven) {
        livingAmbience.updateSignatureMission?.({ ...signatureMissionPresentationRef.current, reducedMotion: isReducedMotion });
      }
      if (!isReducedMotion) {
        if (isFishermansVillage) {
          livingAmbience.updateWaterDragonMission?.(fishermansFishingPresentationRef.current);
          const fishing = fishermansFishingPresentationRef.current.fishingInteraction;
          if (fishing) livingAmbience.updateFishingInteraction?.(fishing);
        }
        if (isLavaLabyrinth) livingAmbience.animate(lavaLookdevElapsed);
        else livingAmbience.animate(
          isJungleExpedition && jungleDeterministicPreviewElapsed !== null && !jungleZenithPreviewEnabled
            ? jungleDeterministicPreviewElapsed
            : elapsed,
        );
        firstLightAssemblyCrater?.animate(elapsed);
        if (isAssemblyCraterFirstLight && firstLightAssemblyCrater) {
          const assemblyConstruction = firstLightAssemblyCrater.getConstructionPresentation();
          const marina = firstLightAssemblyCrater.getMarinaPresentation();
          if (assemblyConstruction.active && !wasAssemblyConstructionActive) {
            wasAssemblyConstructionActive = true;
            idleOverviewAt = null;
            applyPreset('boss', 0.55);
          }
          if (marina.active && !activeTour && !activeProfiler) {
            if (!wasMarinaArrivalActive) {
              setBoardActorsVisibleForPreset('manual');
              marinaInspectionActive = true;
              controls.minDistance = .5;
              controls.minPolarAngle = 0;
              controls.maxPolarAngle = Math.PI;
            }
            wasMarinaArrivalActive = true;
            idleOverviewAt = null;
            controls.enabled = false;
            marinaArrivalCameraPose = {
              position: new THREE.Vector3(...marina.cameraPosition),
              target: new THREE.Vector3(...marina.cameraTarget),
              fov: marina.cameraFov,
            };
            firstLightAssemblyCrater.setInspectionCutaway(false);
          }
          if (
            wasAssemblyConstructionActive
            && wasMarinaArrivalActive
            && marina.completed
            && !automaticAssemblyTourStarted
            && !activeTour
            && !activeProfiler
          ) {
            automaticAssemblyTourStarted = true;
            wasMarinaArrivalActive = false;
            onAssemblyMeetingCompleteRef.current?.();
            firstLightAssemblyCrater.endMarinaMeeting();
            // The arrival film now finishes at the podium. Hold that view so
            // the audience can be inspected instead of launching a second tour.
            firstLightAssemblyCrater.setInspectionCutaway(false);
            controls.enabled = true;
            controls.update();
            idleOverviewAt = null;
          }
        }
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
        if (isFishermansVillage) {
          livingAmbience.updateWaterDragonMission?.({
            ...fishermansFishingPresentationRef.current,
            reducedMotion: true,
          });
          const fishing = fishermansFishingPresentationRef.current.fishingInteraction;
          if (fishing) livingAmbience.updateFishingInteraction?.(fishing);
          livingAmbience.animate(0);
        }
        if (isJungleExpedition) {
          livingAmbience.animate(
            jungleDeterministicPreviewElapsed !== null && !jungleZenithPreviewEnabled
              ? jungleDeterministicPreviewElapsed
              : elapsed,
            true,
          );
        }
      }

      if (moonwellThermalAnimator) {
        const thermal = moonwellThermalPresentationRef.current;
        const frame = moonwellThermalAnimator.update(thermal, elapsed, isReducedMotion);
        canvas.dataset.moonwellThawProgress = frame.progress.toFixed(3);
        if (frame.phase !== moonwellThermalLastPhase) {
          moonwellThermalLastPhase = frame.phase;
          if (thermal.running) moonwellThermalPhaseChangeRef.current?.(frame.phase);
        }
        if (thermal.running && frame.progress >= 1 && thermal.sequence !== moonwellThermalCompletedSequence) {
          moonwellThermalCompletedSequence = thermal.sequence;
          moonwellThermalCompleteRef.current?.();
        }
      }
      // Close construction and restoration views must not be obscured by wildlife.
      // Preserve the frozen ambience visibility as well when reduced motion is on.
      const focusedFrostmoonRestoration = isFrostmoonHaven && (
        (activeInspectionPreset === 'wisdom' && archiveInteriorOpenRef.current)
        || activeInspectionPreset === 'event'
      );
      if (constructionPresentationRef.current?.active || focusedFrostmoonRestoration) {
        constructionWildlife.forEach((animal) => {
          if (!constructionWildlifeVisibility.has(animal)) constructionWildlifeVisibility.set(animal, animal.visible);
          animal.visible = false;
        });
      } else if (constructionWildlifeVisibility.size > 0) {
        if (isReducedMotion) constructionWildlifeVisibility.forEach((visible, animal) => { animal.visible = visible; });
        constructionWildlifeVisibility.clear();
      }

      if (isLavaLabyrinth && livingAmbience.consumeIronSkiffCompletion?.()) {
        canvas.dataset.island20SkiffNavigation = 'extracted';
        onIsland20SkiffRunCompleteRef.current?.();
      }

      if (constructionAnchor.visible) {
        const activeConstruction = constructionPresentationRef.current;
        const constructionPreset = activeConstruction?.targetStopId === 'mystery'
          ? 'event'
          : activeConstruction?.targetStopId;
        const constructionCameraKey = activeConstruction && constructionPreset
          ? `${constructionPreset}:${activeConstruction.targetLevel}`
          : '';
        const revealKey = activeConstruction && constructionPreset && activeConstruction.phase === 'reveal'
          ? `${constructionPreset}:${activeConstruction.targetLevel}:${activeConstruction.sequence}`
          : '';
        if (
          isCrystalGlacier
          && revealKey
          && revealKey !== appliedIsland15ConstructionRevealKey
          && ISLAND_5_CAMERA_PRESETS.some((preset) => preset.id === constructionPreset)
        ) {
          appliedIsland15ConstructionRevealKey = revealKey;
          idleOverviewAt = null;
          applyPreset(constructionPreset as Island5CameraPresetId, 0.86);
          setIsland15PalaceEntryPhase('reveal');
          canvas.dataset.island15PalaceEntryPhase = 'reveal';
          canvas.dataset.island15PalaceNavigationMode = 'interior-build-reveal';
        }
        if (
          constructionCameraKey
          && !activeConstruction?.cameraLocked
          && (
            constructionCameraKey !== appliedConstructionCameraKey
            || activeInspectionPreset !== constructionPreset
          )
          && ISLAND_5_CAMERA_PRESETS.some((preset) => preset.id === constructionPreset)
        ) {
          // A queued level remains the same modal session. Reassert the close
          // landmark shot so a prior roll's idle-overview timer or level
          // completion transition cannot strand the crew under the header.
          appliedConstructionCameraKey = constructionCameraKey;
          idleOverviewAt = null;
          applyPreset(constructionPreset as Island5CameraPresetId, 0.24);
        }
        // Camera-preset visibility updates may run after the modal adapter.
        // Keep the original plot hidden while its exact authored build-stage
        // preview occupies the focused construction theatre.
        if (constructionSourceRoot) {
          constructionSourceRoot.visible = false;
        }
        // The single additive commissioning beat owns the pulse. Funded
        // structure stays grounded and never receives a second scale/jump.
        constructionStageBuilding.position.y = 0;
        constructionStageBuilding.scale.setScalar(Number(
          constructionStageBuilding.userData.authoredBuildingScale ?? 1,
        ));
        updateConstructionFacing();
        const constructionReducedMotion = isReducedMotion
          || Boolean(constructionPresentationRef.current?.reducedMotion);
        presentedConstructionProgress = constructionReducedMotion ? targetConstructionProgress
          : THREE.MathUtils.damp(presentedConstructionProgress, targetConstructionProgress, activeConstruction?.fastBuild ? 5 : 14, frameDeltaSeconds);
        constructionLevelDelta?.applyProgress(presentedConstructionProgress, { working: activeConstruction?.working ?? false });
        constructionFamily.update(elapsed, frameDeltaSeconds, constructionReducedMotion);
        constructionTheatre.update(elapsed, frameDeltaSeconds, constructionReducedMotion);
        const commissioningBeat = constructionCommissioningFx.update(elapsed, constructionReducedMotion);
        canvas.dataset.constructionCommissioningScale = commissioningBeat.scaleMultiplier.toFixed(4);
        const jungleBuildPresentation = constructionPresentationRef.current;
        const jungleBuildFxActive = Boolean(
          isJungleExpedition
          && jungleBuildPresentation
          && (jungleBuildPresentation.working || jungleBuildPresentation.commissioning),
        );
        jungleConstructionFx.visible = jungleBuildFxActive;
        if (jungleBuildFxActive) {
          const buildProgress = THREE.MathUtils.clamp(jungleBuildPresentation?.progress ?? 0, 0, 1);
          const assemblyProgress = constructionReducedMotion
            ? buildProgress
            : THREE.MathUtils.smoothstep(buildProgress, 0.22, 0.86);
          const commissioningLift = jungleBuildPresentation?.commissioning
            ? 1 + commissioningBeat.flashIntensity * 0.8
            : 1;
          jungleConstructionRings.forEach((ring, index) => {
            ring.rotation.z = constructionReducedMotion
              ? index * 0.24
              : elapsed * (0.52 + index * 0.18) * (index % 2 === 0 ? 1 : -1);
            ring.scale.setScalar(commissioningLift * (1 + Math.sin(elapsed * 2.4 + index) * 0.045));
          });
          if (jungleConstructionStones) {
            for (let index = 0; index < jungleConstructionStones.count; index += 1) {
              const angle = index / jungleConstructionStones.count * Math.PI * 2
                + (constructionReducedMotion ? 0 : elapsed * (0.34 + (index % 3) * 0.06));
              const radius = 1.35 + (index % 3) * 0.46;
              jungleConstructionPosition.set(
                Math.cos(angle) * radius,
                0.72 + (index % 5) * 0.52 + Math.sin(elapsed * 1.4 + index) * 0.14,
                Math.sin(angle) * radius,
              );
              const targetAngle = index / jungleConstructionStones.count * Math.PI * 2 + (index % 2) * 0.18;
              jungleConstructionTarget.set(
                Math.cos(targetAngle) * (0.82 + (index % 3) * 0.18),
                0.42 + Math.floor(index / 3) * 0.58,
                Math.sin(targetAngle) * (0.72 + (index % 2) * 0.16),
              );
              jungleConstructionPosition.lerp(jungleConstructionTarget, assemblyProgress);
              jungleConstructionQuaternion.setFromEuler(new THREE.Euler(
                constructionReducedMotion ? 0 : (1 - assemblyProgress) * (elapsed * 0.24 + index),
                THREE.MathUtils.lerp(angle, targetAngle, assemblyProgress),
                constructionReducedMotion ? 0 : (1 - assemblyProgress) * elapsed * 0.18,
              ));
              jungleConstructionScale.setScalar(0.82 + (index % 4) * 0.11);
              jungleConstructionMatrix.compose(
                jungleConstructionPosition,
                jungleConstructionQuaternion,
                jungleConstructionScale,
              );
              jungleConstructionStones.setMatrixAt(index, jungleConstructionMatrix);
            }
            jungleConstructionStones.instanceMatrix.needsUpdate = true;
          }
          if (jungleConstructionVineHelix) {
            const vineReveal = jungleBuildPresentation?.commissioning
              ? 1
              : THREE.MathUtils.smoothstep(buildProgress, 0.12, 0.76);
            jungleConstructionVineHelix.visible = vineReveal > 0;
            jungleConstructionVineHelix.scale.set(1, Math.max(0.001, vineReveal), 1);
            jungleConstructionVineHelix.rotation.y = constructionReducedMotion ? 0 : elapsed * 0.24;
            const vineMaterial = jungleConstructionVineHelix.material as THREE.MeshBasicMaterial;
            vineMaterial.opacity = 0.34 + commissioningBeat.flashIntensity * 0.5;
          }
          if (jungleConstructionTotems) {
            const totemReveal = jungleBuildPresentation?.commissioning
              ? 1
              : THREE.MathUtils.smoothstep(buildProgress, 0.48, 0.94);
            jungleConstructionTotems.visible = totemReveal > 0;
            for (let index = 0; index < jungleConstructionTotems.count; index += 1) {
              const angle = index / jungleConstructionTotems.count * Math.PI * 2 + Math.PI / 8;
              const localReveal = constructionReducedMotion
                ? totemReveal
                : THREE.MathUtils.smoothstep(totemReveal, index * 0.055, 0.42 + index * 0.055);
              jungleConstructionQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
              jungleConstructionScale.set(1, Math.max(0.001, localReveal * commissioningLift), 1);
              jungleConstructionMatrix.compose(
                jungleConstructionPosition.set(Math.cos(angle) * 2.08, -0.22 + localReveal * 0.72, Math.sin(angle) * 2.08),
                jungleConstructionQuaternion,
                jungleConstructionScale,
              );
              jungleConstructionTotems.setMatrixAt(index, jungleConstructionMatrix);
            }
            jungleConstructionTotems.instanceMatrix.needsUpdate = true;
          }
          if (jungleConstructionMotes && jungleConstructionMotePositions && jungleConstructionMoteMaterial) {
            const moteCount = jungleConstructionMotePositions.count;
            for (let index = 0; index < moteCount; index += 1) {
              const phase = index * 2.399963;
              const orbit = 2.75 - assemblyProgress * 1.48 + (index % 7) * 0.055;
              const commissioningBurst = jungleBuildPresentation?.commissioning
                ? commissioningBeat.flashIntensity * (0.4 + index % 5 * 0.08)
                : 0;
              jungleConstructionMotePositions.setXYZ(
                index,
                Math.cos(phase + elapsed * (0.32 + index % 3 * 0.04)) * (orbit + commissioningBurst),
                0.22 + index % 14 * 0.27 + assemblyProgress * 0.68 + commissioningBurst * 1.8,
                Math.sin(phase + elapsed * (0.32 + index % 3 * 0.04)) * (orbit + commissioningBurst),
              );
            }
            jungleConstructionMotePositions.needsUpdate = true;
            jungleConstructionMotes.rotation.y = constructionReducedMotion ? 0 : elapsed * 0.08;
            jungleConstructionMoteMaterial.opacity = 0.38 + assemblyProgress * 0.34 + commissioningBeat.flashIntensity * 0.22;
          }
          if (jungleConstructionLight) {
            jungleConstructionLight.intensity = 0.55 + assemblyProgress * 1.15 + commissioningBeat.flashIntensity * 2.6;
          }
          canvas.dataset.jungleConstructionFx = jungleBuildPresentation?.commissioning
            ? 'emerald-commissioning-pulse-and-wayfinder-crown'
            : 'living-vine-scaffold-and-sequential-masonry';
        } else if (isJungleExpedition) {
          canvas.dataset.jungleConstructionFx = 'parked';
        }
        constructionLevelDelta?.applyCommissioningScale(
          commissioningBeat.scaleMultiplier,
          constructionReducedMotion,
        );
        canvas.dataset.constructionCommissioningBeat = JSON.stringify({
          active: commissioningBeat.active,
          scale: Number(commissioningBeat.scaleMultiplier.toFixed(3)),
          flash: Number(commissioningBeat.flashIntensity.toFixed(3)),
          sparkle: Number(commissioningBeat.sparkleProgress.toFixed(3)),
        });
        canvas.dataset.constructionCrewOccupancy = JSON.stringify(
          constructionTheatre.root.userData.constructionOccupancy ?? {},
        );
        canvas.dataset.constructionCrewScreen = JSON.stringify(Object.fromEntries(
          Object.entries(constructionFamily.members).map(([role, member]) => {
            member.getWorldPosition(constructionScreenProbe).project(camera);
            return [role, {
              x: Number(constructionScreenProbe.x.toFixed(3)),
              y: Number(constructionScreenProbe.y.toFixed(3)),
              z: Number(constructionScreenProbe.z.toFixed(3)),
              localX: Number(member.position.x.toFixed(3)),
              localY: Number(member.position.y.toFixed(3)),
              localZ: Number(member.position.z.toFixed(3)),
              scale: Number(member.scale.x.toFixed(3)),
              rotationY: Number(member.rotation.y.toFixed(3)),
              emotion: constructionFamily.memberEmotions[role as keyof typeof constructionFamily.memberEmotions]
                ?? constructionFamily.emotion,
            }];
          }),
        ));
        canvas.dataset.constructionManagerBrain = constructionFamily.brainState;
      } else {
        appliedConstructionCameraKey = '';
        constructionLevelDelta?.applyCommissioningScale(1);
      }

      if (sunshoreArenaRetraction) {
        const active = Boolean(arenaBattlePresentationRef.current.value?.active) || (!isEmbedded && performance.now() < arenaCrownPreviewUntilRef.current);
        const pose = sunshoreArenaRetraction.update(elapsed, active, isReducedMotion);
        sunshoreCrownTop = pose.top;
        canvas.dataset.sunshoreArenaCrown = JSON.stringify(pose);
      }
      sunshoreLandmarkMagic?.update(elapsed, isReducedMotion);
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
        if (isSunshoreAtoll && creatureCelebrationRequestRef.current !== consumedCelebrationRequest) {
          consumedCelebrationRequest = creatureCelebrationRequestRef.current;
          if (!creatureCelebration && !battlePresentation?.active && !constructionPresentationRef.current?.active && !interactionPausedRef.current) {
            creatureCelebration = { startedAt: elapsed, position: [...creatureMotion.position] as CelebrationPoint, yaw: creatureMotion.yaw };
          }
        }
        if (battlePresentation?.active || constructionPresentationRef.current?.active || interactionPausedRef.current) creatureCelebration = null;
        crownDrifterPresentationRoot.visible = creatureMotion.visible;
        crownDrifterPresentationRoot.position.set(...creatureMotion.position);
        crownDrifterPresentationRoot.rotation.y = creatureMotion.yaw;
        crownDrifterPresentationRoot.rotation.x = 0;
        crownDrifterPresentationRoot.rotation.z = 0;
        crownDrifterPresentationRoot.scale.setScalar(battlePresentation?.active ? 0.86 : CROWN_DRIFTER_BOARD_SCALE);
        crownDrifter.bodyPivot.rotation.x = 0;
        crownDrifter.bodyPivot.rotation.y = 0;
        crownDrifter.update(elapsed, frameDeltaSeconds, isReducedMotion, creatureMotion.emergenceProgress);
        const celebrationElapsed = creatureCelebration ? elapsed - creatureCelebration.startedAt : null;
        const celebrationPose = creatureCelebration && celebrationElapsed !== null
          ? resolveSunshoreCreatureCelebration(celebrationElapsed, creatureCelebration.position, creatureMotion.position, isReducedMotion)
          : null;
        if (celebrationPose && creatureCelebration) {
          crownDrifterPresentationRoot.position.set(...celebrationPose.position);
          const yawDelta = Math.atan2(Math.sin(creatureMotion.yaw - creatureCelebration.yaw), Math.cos(creatureMotion.yaw - creatureCelebration.yaw));
          crownDrifterPresentationRoot.rotation.y = creatureCelebration.yaw + celebrationPose.spin + yawDelta * celebrationPose.blend;
          crownDrifter.bodyPivot.rotation.x = celebrationPose.roll;
          crownDrifter.bodyPivot.scale.set(1 / Math.sqrt(celebrationPose.squash), celebrationPose.squash, 1 / Math.sqrt(celebrationPose.squash));
          crownDrifter.leftWingPivot.rotation.z -= celebrationPose.fold * 1.0;
          crownDrifter.rightWingPivot.rotation.z += celebrationPose.fold * 1.0;
        } else {
          creatureCelebration = null;
          crownDrifter.bodyPivot.scale.setScalar(1);
        }
        celebrationSmoke?.update(celebrationPose ? celebrationElapsed : null, camera, isReducedMotion);
        if (isSunshoreAtoll) {
          canvas.dataset.creatureCelebrationPhase = celebrationPose?.phase ?? 'idle';
          canvas.dataset.creatureCelebrationSeconds = String(celebrationElapsed ?? 0);
          canvas.dataset.creatureCelebrationPosition = JSON.stringify(crownDrifterPresentationRoot.position.toArray());
          canvas.dataset.creatureCelebrationSmoke = String(celebrationSmoke?.root.visible ?? false);
        }
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
        if (isSunshoreAtoll) {
          // Evaluate after celebration and battle transforms; neither can bypass clearance.
          crownDrifterPresentationRoot.updateWorldMatrix(true, true);
          sunshoreCreatureBounds.setFromObject(crownDrifterPresentationRoot);
          const b = sunshoreCreatureBounds;
          const lift = sunshoreCreatureClearanceLift(b.min.x, b.max.x, b.min.z, b.max.z, b.min.y, sunshoreCrownTop);
          crownDrifterPresentationRoot.position.y += lift;
          canvas.dataset.sunshoreCreatureClearanceLift = String(lift);
          canvas.dataset.creatureCelebrationPosition = JSON.stringify(crownDrifterPresentationRoot.position.toArray());
        }
      }

      const isCaretakerEncounterOpen = caretakerBoardAvailable && caretakerEncounterOpenRef.current;
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
          boardCaretaker.root.visible = caretakerBoardAvailable;
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
      } else if (caretakerBoardAvailable) {
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
          tileScaleScratch.set(
            pose.scaleXZ * (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1),
            pose.scaleY * (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.34 : 1),
            pose.scaleXZ * (isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1),
          );
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
            tileScaleScratch.set(
              isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1,
              isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.34 : 1,
              isCoasterCarnival && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled ? 0.3 : 1,
            );
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
        pawnCameraHeading = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
        pawnCameraChoice = { heading: pawnCameraHeading, height: 8.4, blocked: 0 };
        pawnCameraHop = -1;
        // Rebuild only at roll start: landmarks can grow between rolls.
        pawnCameraObstacles = [];
        pawnCameraMeshes = [];
        if (islandNumber >= 1 && islandNumber <= 20) {
          landmarkRootsById.forEach(root => {
            if (!root.visible) return;
            const bounds = new THREE.Box3().setFromObject(root);
            if (bounds.isEmpty() || bounds.max.y - bounds.min.y < 1.3) return;
            pawnCameraObstacles.push({ min: bounds.min.toArray() as [number, number, number], max: bounds.max.toArray() as [number, number, number] });
            const meshes:THREE.Mesh[]=[];
            root.traverseVisible(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
            pawnCameraMeshes.push(meshes);
          });
        }
        if (import.meta.env.DEV && window.location.pathname === '/work/controller-release-check/pawn.html') {
          let auditHeading = pawnCameraHeading;
          canvas.dataset.pawnCameraAudit = JSON.stringify(tileTransforms.map(tile => {
            const point = getIsland5TokenGroundPosition(tileTransforms, tile.index);
            const choice = choosePawnCamera([point[0], point[1] + 0.5, point[2]], auditHeading, pawnCameraObstacles,exactPawnBlocked);
            const turn = Math.abs(shortestPawnAngle(auditHeading, choice.heading));
            auditHeading = choice.heading;
            return { tile: tile.index, blocked: choice.blocked, turn: Number(turn.toFixed(2)), height: choice.height };
          }));
        }
        consumedTokenMotionRequestId = pendingTokenMotion.id;
        idleOverviewAt = null;
        ambientCameraEligibleAt = now + ISLAND_3D_BOARD_POV_IDLE_DELAY_MS;
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
          lastTrailHopIndex: -1,
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
        if (!isReducedMotion) {
          for (const hop of completedPawnHops(request.durationsMs,motionElapsedMs,activeTokenMotion.lastTrailHopIndex)) {
            markPawnTrail(request.sequence[hop.index],startsAt+hop.at,hop.index===request.sequence.length-1);
            activeTokenMotion.lastTrailHopIndex=hop.index;
          }
        }

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
          const landingOriginWorld = new THREE.Vector3(finalPosition[0], finalPosition[1] + 0.58, finalPosition[2]);
          landingOriginWorld.project(camera);
          const canvasRect = renderer.domElement.getBoundingClientRect();
          const landingOrigin = Number.isFinite(landingOriginWorld.x) && Number.isFinite(landingOriginWorld.y)
            ? {
                viewportX: canvasRect.left + ((landingOriginWorld.x + 1) * 0.5 * canvasRect.width),
                viewportY: canvasRect.top + ((1 - landingOriginWorld.y) * 0.5 * canvasRect.height),
              }
            : undefined;
          onTokenLandRef.current?.(finalTileIndex, landingOrigin);
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

          const destinationPosition = getIsland5TokenGroundPosition(tileTransforms, destinationTileIndex);
          const desiredTarget = new THREE.Vector3(tokenPosition[0], destinationPosition[1] + 0.5, tokenPosition[2]);
          const followAlpha = 1 - Math.exp(-frameDeltaSeconds * 6.4);
          if (!isReducedMotion && !interactionPausedRef.current && !constructionPresentationRef.current?.active) {
            // Palace exterior is not represented by the room landmark roots.
            // Keep its previous follow path until a route-specific cutaway is authored.
            if (islandNumber >= 1 && islandNumber <= 20 && !isCrystalGlacier) {
              if (pawnCameraHop !== hopIndex) {
                pawnCameraHop = hopIndex;
                pawnCameraChoice = choosePawnCamera([destinationPosition[0], destinationPosition[1] + 0.5, destinationPosition[2]], pawnCameraChoice.heading, pawnCameraObstacles,exactPawnBlocked);
                canvas.dataset.pawnCameraBlockedCandidates = String(pawnCameraChoice.blocked);
              }
              // Polar interpolation moves around scenery, not through its centre.
              const delta = shortestPawnAngle(pawnCameraHeading, pawnCameraChoice.heading);
              pawnCameraHeading += Math.max(-frameDeltaSeconds * 1.3, Math.min(frameDeltaSeconds * 1.3, delta));
              controls.target.lerp(desiredTarget, followAlpha);
              const radius = THREE.MathUtils.lerp(Math.hypot(camera.position.x - controls.target.x, camera.position.z - controls.target.z), 10.8, followAlpha);
              camera.position.set(controls.target.x + Math.sin(pawnCameraHeading) * radius, THREE.MathUtils.lerp(camera.position.y, controls.target.y + pawnCameraChoice.height, followAlpha), controls.target.z + Math.cos(pawnCameraHeading) * radius);
            } else {
              controls.target.lerp(desiredTarget, followAlpha);
              camera.position.lerp(desiredTarget.clone().add(new THREE.Vector3(...ISLAND_3D_TOKEN_FOLLOW_OFFSET)), followAlpha);
            }
            camera.lookAt(controls.target);
          }
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
        if (transition.fromFov !== undefined && transition.toFov !== undefined) {
          camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased);
          camera.updateProjectionMatrix();
        }
        camera.lookAt(controls.target);
        if (rawProgress >= 1) {
          const completedTransition = transition;
          transition = null;
          if (completedTransition.toFov !== undefined) {
            camera.fov = completedTransition.toFov;
            camera.updateProjectionMatrix();
          }
          completedTransition.onComplete?.();
        }
      }
      if (cactusCanyonBlastCameraPose) {
        transition = null;
        camera.position.copy(cactusCanyonBlastCameraPose.position);
        controls.target.copy(cactusCanyonBlastCameraPose.target);
        camera.lookAt(controls.target);
      }
      if (jungleBuildupCameraPose) {
        transition = null;
        camera.position.copy(jungleBuildupCameraPose.position);
        controls.target.copy(jungleBuildupCameraPose.target);
        camera.lookAt(controls.target);
      }
      if (jungleZenithCameraPose) {
        transition = null;
        camera.position.copy(jungleZenithCameraPose.position);
        controls.target.copy(jungleZenithCameraPose.target);
        camera.lookAt(controls.target);
      }
      if (marinaArrivalCameraPose) {
        transition = null;
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = marinaArrivalCameraPose.fov;
          camera.updateProjectionMatrix();
        }
        camera.position.copy(marinaArrivalCameraPose.position);
        controls.target.copy(marinaArrivalCameraPose.target);
        camera.lookAt(controls.target);
      }
      if (activeTrainRide && activeTokenMotion) finishTrainRide(false);
      if (activeTrainRide && interactionPausedRef.current) finishTrainRide();
      if (activeTrainRide) {
        const totalRideElapsedMs = Math.max(0, now - activeTrainRide.startedAt);
        const phaseIndex = activeTrainRide.holdRequestedView
          ? activeTrainRide.phaseIndex
          : Math.floor(totalRideElapsedMs / activeTrainRide.phaseDurationMs);
        if (phaseIndex >= ISLAND_13_TRAIN_RIDE_VIEWS.length) {
          finishTrainRide();
        } else {
          if (phaseIndex !== activeTrainRide.phaseIndex) publishTrainRidePhase(phaseIndex);
          const view = ISLAND_13_TRAIN_RIDE_VIEWS[phaseIndex];
          const pose = livingAmbience.getTrainRidePose?.(view);
          if (!pose) {
            finishTrainRide();
          } else {
            transition = null;
            controls.enabled = false;
            const phaseElapsedMs = activeTrainRide.holdRequestedView
              ? 0
              : totalRideElapsedMs - phaseIndex * activeTrainRide.phaseDurationMs;
            const secondsRemaining = Math.max(1, Math.ceil(
              (activeTrainRide.phaseDurationMs - phaseElapsedMs) / 1000,
            ));
            if (secondsRemaining !== trainRidePublishedSeconds) {
              trainRidePublishedSeconds = secondsRemaining;
              setTrainRideSecondsRemaining(secondsRemaining);
            }
            camera.position.copy(pose.position);
            if (!isReducedMotion) camera.position.y += Math.sin(elapsed * 5.2) * 0.012;
            controls.target.copy(pose.target);
            camera.lookAt(controls.target);
          }
        }
      }
      if (activeWonderRide && activeTokenMotion) finishWonderRide(false);
      if (activeWonderRide && interactionPausedRef.current) finishWonderRide();
      if (activeWonderRide && island19CircuitFWorld) {
        const rideElapsedMs = Math.max(0, now - activeWonderRide.startedAt);
        if (activeWonderRide.fixedProgress === null && rideElapsedMs >= activeWonderRide.durationMs) {
          finishWonderRide();
        } else {
          const reducedMotionStops = island19CircuitFWorld.getRidePhaseStops();
          const normalizedTime = THREE.MathUtils.clamp(rideElapsedMs / activeWonderRide.durationMs, 0, 1);
          const routeProgress = activeWonderRide.fixedProgress ?? (isReducedMotion
            ? reducedMotionStops[Math.min(
                reducedMotionStops.length - 1,
                Math.floor(normalizedTime * reducedMotionStops.length),
              )]
            : island19CircuitFWorld.pacing.sampleAtTime(rideElapsedMs / 1000).progress);
          const frame = island19CircuitFWorld.getRideFrame(routeProgress, activeWonderRide.wagon);
          const transitionVeilOpacity = 0;
          if (wonderRideTransitionVeilRef.current) {
            wonderRideTransitionVeilRef.current.style.opacity = transitionVeilOpacity.toFixed(3);
          }
          canvas.dataset.island19WonderRideTransitionOpacity = transitionVeilOpacity.toFixed(3);
          island19CircuitFWorld.setRidePhaseVisibility(frame.phase);
          // No image plates or replacement scenes: depth haze surrounds the
          // same physical terrain, cavern and ocean used by the overview.
          const riderPosition = island19CircuitFWorld.getRiderCameraPosition(routeProgress, activeWonderRide.wagon);
          const eyeHeight = riderPosition.y;
          const insideRock = ['plunge', 'gold-vault', 'grand-vault', 'diamond-gallery'].includes(frame.phase);
          const submerged = eyeHeight < -5.05 && !insideRock;
          // The island blocks daylight underground. Adapt the illumination,
          // not the world geometry, and restore the original sky on exit.
          const buriedLightWeight = THREE.MathUtils.smoothstep(-eyeHeight, 0, 3);
          const lightAdaptation = activeWonderRide.fixedProgress === null ? 1 - Math.exp(-3 * frameDeltaSeconds) : 1;
          // Open seawater still receives filtered daylight; only solid rock
          // removes almost all sun. Ease between the two at the cave mouth.
          hemisphere.intensity = THREE.MathUtils.lerp(hemisphere.intensity,
            hemisphereIntensity * (1 - buriedLightWeight * (insideRock ? .88 : .45)), lightAdaptation);
          sunlight.intensity = THREE.MathUtils.lerp(sunlight.intensity,
            sunlightIntensity * (1 - buriedLightWeight * (insideRock ? .98 : .7)), lightAdaptation);
          scene.background = submerged ? wonderRideUnderseaBackground : wonderRideSkyBackground;
          if (submerged) {
            if (!(scene.fog instanceof THREE.FogExp2) || scene.fog === activeWonderRide.returnFog) scene.fog = new THREE.FogExp2(0x07567a, 0.035);
            scene.fog.color.setHex(0x07567a);
            scene.fog.density = THREE.MathUtils.smoothstep(-eyeHeight, 5.05, 6.4) * 0.035;
          } else if (insideRock) {
            if (!(scene.fog instanceof THREE.FogExp2) || scene.fog === activeWonderRide.returnFog) scene.fog = new THREE.FogExp2(0x291b22, 0.012);
            scene.fog.color.setHex(0x291b22);
            scene.fog.density = 0.012;
          } else scene.fog = activeWonderRide.returnFog;
          const lookAhead = island19CircuitFWorld.getRideFrame(
            routeProgress + 1.6 / island19CircuitFWorld.diagnostics.pathLength,
            activeWonderRide.wagon,
          );
          publishWonderRidePhase(frame.phase);
          const secondsRemaining = activeWonderRide.fixedProgress === null
            ? Math.max(1, Math.ceil((activeWonderRide.durationMs - rideElapsedMs) / 1000))
            : 0;
          if (secondsRemaining !== wonderRidePublishedSeconds) {
            wonderRidePublishedSeconds = secondsRemaining;
            setWonderRideSecondsRemaining(secondsRemaining);
            const pace = island19CircuitFWorld.pacing.sampleAtTime(rideElapsedMs / 1000);
            const labels = { dispatch: 'Leaving the station', 'chain-lift': 'Powered climb', 'gravity-run': 'Gravity run', 'scenic-cruise': 'Scenic cruise', 'station-brakes': 'Returning to station' };
            setWonderRideTelemetry({ progress: routeProgress, pace: activeWonderRide.fixedProgress === null ? labels[pace.mode] : 'Preview viewpoint' });
          }
          transition = null;
          controls.enabled = false;
          camera.position.copy(riderPosition);
          const warmRidePhase = frame.phase === 'plunge' || frame.phase === 'gold-vault' || frame.phase === 'grand-vault';
          wonderRideKeyLight.visible = true;
          wonderRideKeyLight.color.setHex(warmRidePhase ? 0xffb24c : frame.phase === 'diamond-gallery' ? 0x92efff : 0xffd6a3);
          wonderRideKeyLight.intensity = warmRidePhase ? 2.15 : frame.phase === 'diamond-gallery' ? 1.65 : 1.8;
          wonderRideKeyLight.position.copy(camera.position)
            .addScaledVector(frame.up, 0.72)
            .addScaledVector(frame.side, -0.62)
            .addScaledVector(frame.tangent, 0.38);
          wonderRideRimLight.visible = true;
          wonderRideRimLight.color.setHex(frame.phase === 'diamond-gallery' || frame.phase === 'sea-cave' ? 0x76eaff : 0x6aa7d9);
          wonderRideRimLight.intensity = frame.phase === 'diamond-gallery' ? 1.45 : 0.72;
          wonderRideRimLight.position.copy(camera.position)
            .addScaledVector(frame.up, 0.28)
            .addScaledVector(frame.side, 0.78)
            .addScaledVector(frame.tangent, -0.55);
          // No artificial sleeper judder or lateral eye shake.
          canvas.dataset.island19WonderRideContact = '0.000';
          // Target a future point on the actual railway rather than extending
          // the current tangent through a bend. This keeps cavern views inside
          // the authored tunnel and prevents the camera from staring through
          // the island shell on tight curves.
          controls.target.copy(lookAhead.position).addScaledVector(lookAhead.up, activeWonderRide.wagon === 'front' ? 1.32 : 1.28);
          const scenicFocus = island19CircuitFWorld.getScenicFocus(frame.u);
          if (scenicFocus.weight > 0) {
            // A gentle downward/inward gaze from the physical seat reveals
            // the hoard below without detaching into a spectator camera.
            controls.target.lerp(scenicFocus.point, 0.65 * scenicFocus.weight);
          }
          camera.up.copy(frame.up);
          const nextFov = 68;
          if (camera.fov !== nextFov) {
            camera.fov = nextFov;
            camera.updateProjectionMatrix();
          }
          camera.lookAt(controls.target);
          camera.quaternion.copy(wonderRideCameraFilter.update(camera.quaternion,
            actualFrameDeltaSeconds, isReducedMotion || activeWonderRide.fixedProgress !== null));
          canvas.dataset.island19WonderRideSeatError = camera.position.distanceTo(
            riderPosition,
          ).toFixed(6);
          canvas.dataset.island19WonderRideCameraFilter = 'two-stage-seat-locked';
          canvas.dataset.island19WonderRideLapSeconds = island19CircuitFWorld.pacing.durationSeconds.toFixed(2);
          canvas.dataset.island19WonderRideWorldMode = 'continuous-physical-island';
          canvas.dataset.island19WonderRideProgress = routeProgress.toFixed(4);
          canvas.dataset.island19WonderRideSpeed = island19CircuitFWorld.pacing.sampleAtTime(rideElapsedMs / 1000).speed.toFixed(3);
          canvas.dataset.island19WonderRidePacing = island19CircuitFWorld.pacing.sampleAtTime(rideElapsedMs / 1000).mode;
          canvas.dataset.island19WonderRideReducedMotion = String(isReducedMotion);
        }
      }
      const archiveCutaway = (isFrostmoonHaven || isDriftwoodIsle) && activeInspectionPreset === 'wisdom'
        && archiveInteriorOpenRef.current && (landmarkBuildLevelsRef.current?.wisdom ?? buildLevelRef.current) >= 3
        && !constructionPresentationRef.current?.active;
      archiveInspectionParts.forEach(node => { node.visible = !archiveCutaway; });
      if (isFrostmoonHaven || isDriftwoodIsle) canvas.dataset.archiveInteriorOpen = String(archiveCutaway);
      const thermalPresentation = moonwellThermalPresentationRef.current;
      if (isFrostmoonHaven && activeInspectionPreset === 'event' && !transition
        && !constructionPresentationRef.current?.active
        && (thermalPresentation.running || thermalPresentation.previewProgress !== undefined)) {
        const target = new THREE.Vector3(4.36, 1, 3.9);
        const position = new THREE.Vector3(.61, 6.18, 1.14);
        const ease = isReducedMotion || thermalPresentation.previewProgress !== undefined ? 1 : 1 - Math.exp(-Math.max(.001, frameDeltaSeconds) * 2.2);
        camera.position.lerp(position, ease); controls.target.lerp(target, ease); camera.lookAt(controls.target);
      }
      const signatureMissionCameraPose = isFrostmoonHaven && activeInspectionPreset === 'frostwell'
        ? livingAmbience.getSignatureMissionCameraPose?.()
        : null;
      livingAmbience.setSignatureMissionCinematicActive?.(Boolean(signatureMissionCameraPose));
      if (
        signatureMissionCameraPose
        && !transition
        && !activeTokenMotion
        && !activeTour
        && !activeProfiler
      ) {
        // Frostwell owns the presentation socket; this renderer only eases the
        // existing inspection camera toward it. Canonical drill progress remains
        // in the signature-mission action service and is read-only here.
        const cutawayEase = isReducedMotion || frostwellDeterministicEvidence
          ? 1
          : 1 - Math.exp(-Math.max(0.001, frameDeltaSeconds) * 1.7);
        camera.position.lerp(signatureMissionCameraPose.position, cutawayEase);
        controls.target.lerp(signatureMissionCameraPose.target, cutawayEase);
        camera.lookAt(controls.target);
      }
      const waterDragonPresentation = fishermansFishingPresentationRef.current;
      const fishingInteraction = waterDragonPresentation.fishingInteraction;
      const fishingCameraActive = isFishermansVillage && Boolean(fishingInteraction?.active);
      const waterDragonElapsed = Math.max(0, waterDragonPresentation.previewElapsedSeconds ?? 0);
      const waterDragonCameraActive = isFishermansVillage
        && !fishingCameraActive
        && waterDragonPresentation.fishCaughtKg >= 78
        && waterDragonElapsed < 23.5;
      if (fishingCameraActive) {
        const pose = livingAmbience.getFishingInteractionCameraPose?.();
        if (pose) {
          fishingCameraWasActive = true;
          transition = null;
          controls.enabled = false;
          camera.position.lerp(pose.position, 0.09);
          controls.target.lerp(pose.target, 0.105);
          if (!isReducedMotion && pose.shake > 0) {
            camera.position.x += Math.sin(elapsed * 68) * pose.shake;
            camera.position.y += Math.cos(elapsed * 74) * pose.shake * 0.6;
          }
          camera.lookAt(controls.target);
        }
      } else if (fishingCameraWasActive) {
        fishingCameraWasActive = false;
        controls.enabled = true;
        applyPreset('overview', 0.78);
      } else if (waterDragonCameraActive) {
        const pose = livingAmbience.getWaterDragonMissionCameraPose?.();
        if (pose) {
          waterDragonCameraWasActive = true;
          transition = null;
          controls.enabled = false;
          if (Math.abs(camera.fov - pose.fov) > 0.01) {
            camera.fov = pose.fov;
            camera.updateProjectionMatrix();
          }
          camera.position.copy(pose.position);
          if (!isReducedMotion && pose.shake > 0) {
            camera.position.x += Math.sin(elapsed * 79) * pose.shake;
            camera.position.y += Math.cos(elapsed * 91) * pose.shake * 0.6;
          }
          controls.target.copy(pose.target);
          camera.lookAt(controls.target);
        }
      } else if (waterDragonCameraWasActive) {
        waterDragonCameraWasActive = false;
        controls.enabled = true;
        camera.fov = 42;
        camera.updateProjectionMatrix();
        applyPreset('overview', 0.72);
      }
      if (
        idleOverviewAt !== null
        && now >= idleOverviewAt
        && !activeTokenMotion
        && !activeTour
        && !activeProfiler
        && !activeTrainRide
        && !caretakerEncounterOpenRef.current
        && !constructionPresentationRef.current?.active
      ) {
        idleOverviewAt = null;
        applyPreset('overview', ISLAND_3D_IDLE_OVERVIEW_DURATION_SCALE);
      }
      const ambientCameraAllowed = !isEvidenceCapture
        && !activeWonderRide
        && !activeTrainRide
        && !isReducedMotion
        && now >= ambientCameraEligibleAt
        && !transition
        && !activeTokenMotion
        && !activeTour
        && !activeProfiler
        && !caretakerEncounterOpenRef.current
        && (
          ambientCameraContext === 'build-modal'
            ? constructionCameraActive && !constructionCameraLocked
            : !constructionCameraActive && !interactionPausedRef.current
        );
      if (ambientCameraAllowed) {
        applyAmbientCameraNudge(ambientCameraContext, now);
      }
      // OrbitControls still clamps distance and polar angle when disabled.
      // A ride owns its seat position; applying the overview limits here
      // pulls the eye out of the wagon immediately before rendering.
      if (!activeWonderRide && !activeTrainRide) controls.update();
      if (islandNumber === 1 && (firstArrivalRef.current.active || firstArrival || firstArrivalCompletedRef.current)) {
        if (firstArrivalVersion !== firstArrivalRestartRef.current) {
          attentionVisuals.forEach(entry => entry.visual.dispose());
      firstArrival?.dispose(); firstArrival = null; firstArrivalTime = 0; firstArrivalWelcomeNotified = false;
          firstArrivalCompleted = false; firstArrivalVersion = firstArrivalRestartRef.current;
        }
        if (!firstArrival) {
          firstArrival = createIsland001FirstArrival(scene, playerPiece.root, playerPiece.shadow,
            getIsland5TokenGroundPosition(tileTransforms, firstArrivalCompletedRef.current ? tokenIndexRef.current : 0),
            {position:camera.position.clone(), target:controls.target.clone(), fov:camera.fov});
          if (firstArrivalCompletedRef.current) {firstArrivalTime = 29; firstArrivalCompleted = true;}
        }
        firstArrivalTime = advanceFirstArrivalTime(firstArrivalTime,actualFrameDeltaSeconds,{hidden:document.hidden,skip:firstArrivalRef.current.skip,reducedMotion:isReducedMotion,waitForWelcome:firstArrivalRef.current.waitForWelcome,welcomeComplete:firstArrivalRef.current.welcomeComplete});
        if (import.meta.env.DEV && firstArrivalRef.current.previewTime !== undefined) {
          firstArrivalTime = firstArrivalRef.current.previewTime;
        }
        if (firstArrivalRef.current.waitForWelcome && !firstArrivalRef.current.welcomeComplete && firstArrivalTime >= FIRST_ARRIVAL_WELCOME_TIME) {
          firstArrivalTime = FIRST_ARRIVAL_WELCOME_TIME;
          if (!firstArrivalWelcomeNotified) { firstArrivalWelcomeNotified = true; firstArrivalRef.current.onWelcome?.(); }
        }
        const ownsCamera = !firstArrivalCompleted;
        if (ownsCamera) { transition = null; controls.enabled = false; }
        const done = firstArrival.update(firstArrivalTime, frameDeltaSeconds, camera, isReducedMotion,
          Boolean(constructionPresentationRef.current?.active));
        canvas.dataset.firstArrivalTime = firstArrivalTime.toFixed(2);
        canvas.dataset.firstArrivalBeat = firstArrival.root.userData.beat;
        if (firstArrivalBeat !== firstArrival.root.userData.beat) {
          firstArrivalBeat = firstArrival.root.userData.beat;
          firstArrivalRef.current.onBeat?.(firstArrivalBeat);
        }
        if (done && !firstArrivalCompleted) {
          firstArrivalCompleted = true;
          firstArrivalCompletedRef.current = true;
          controls.target.copy(firstArrival.handoffTarget); controls.enabled = true;
          firstArrivalRef.current.onComplete?.();
        }
      }
      publishCameraAuthoringPose(now);

      let restoreAssemblyCameraAfterRender = false;
      const assemblyBlastPresentation = firstLightAssemblyCrater?.getBlastPresentation();
      if (
        isAssemblyCraterFirstLight
        && !isReducedMotion
        && assemblyBlastPresentation?.active
        && assemblyBlastPresentation.cameraShake > 0
      ) {
        restoreAssemblyCameraAfterRender = true;
        assemblyCameraBasePosition.copy(camera.position);
        const shake = assemblyBlastPresentation.cameraShake;
        assemblyCameraShakeOffset.set(
          Math.sin(elapsed * 73 + assemblyBlastPresentation.progress * 19) * shake,
          Math.sin(elapsed * 101 + 0.7) * shake * 0.62,
          Math.cos(elapsed * 89 + assemblyBlastPresentation.progress * 13) * shake,
        );
        camera.position.add(assemblyCameraShakeOffset);
        camera.lookAt(controls.target);
        canvas.dataset.assemblyBlastCameraShake = shake.toFixed(3);
      } else {
        canvas.dataset.assemblyBlastCameraShake = '0.000';
      }

      const bossRoot = bossRootForOcclusion;
      pawnTileTrail.update(now, playerPiece.root.visible);
      if (bossRoot) {
        const focusedOuterLandmark = activeInspectionPreset === 'hatchery'
          || activeInspectionPreset === 'habit'
          || activeInspectionPreset === 'wisdom'
          || activeInspectionPreset === 'event';
        const jungleNeedsClearInspection = focusedOuterLandmark || constructionAnchor.visible;
        if (isJungleExpedition && jungleNeedsClearInspection !== jungleInspectionOccludersHidden) {
          jungleInspectionOccludersHidden = jungleNeedsClearInspection;
          jungleInspectionOccluders.forEach((object) => {
            object.visible = !jungleNeedsClearInspection;
          });
          canvas.dataset.island18InspectionCanopy = jungleNeedsClearInspection ? 'clear' : 'full';
        }
        const focusRoot = focusedOuterLandmark
          ? landmarkRootsById.get(activeInspectionPreset as Island5LandmarkId)
          : undefined;
        const pawnNeedsClearView = Boolean(activeTokenMotion || activeTokenSettle);
        const shouldFadeBoss = activeInspectionPreset === 'frostwell' || ((Boolean(focusRoot) || pawnNeedsClearView) && shouldFadeCentralLandmarkForCamera({
          cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
          focusPosition: pawnNeedsClearView
            ? [playerPiece.root.position.x, playerPiece.root.position.y + 0.5, playerPiece.root.position.z]
            : [focusRoot!.position.x, focusRoot!.position.y + 1.2, focusRoot!.position.z],
          centralPosition: bossOcclusionBounds && bossOcclusionCenter
            ? [bossOcclusionCenter.x, bossOcclusionBounds.min.y, bossOcclusionCenter.z]
            : undefined,
          centralOcclusionRadius: bossOcclusionSize
            ? Math.max(bossOcclusionSize.x, bossOcclusionSize.z) * 0.46
            : undefined,
          centralOcclusionHeight: bossOcclusionSize?.y,
        }));
        if (shouldFadeBoss !== isBossOcclusionFadeApplied) {
          isBossOcclusionFadeApplied = shouldFadeBoss;
          canvas.dataset.centralLandmarkOcclusion = shouldFadeBoss ? 'faded' : 'opaque';
          const targetOpacity = shouldFadeBoss ? (isJungleExpedition || isFrostmoonHaven ? 0 : 0.16) : 1;
          bossRoot.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
            objectMaterials.forEach((material) => {
              if (!material.userData.islandOriginalOpacityCaptured) {
                material.userData.islandOriginalOpacityCaptured = true;
                material.userData.islandOriginalOpacity = material.opacity;
                material.userData.islandOriginalTransparent = material.transparent;
                material.userData.islandOriginalDepthWrite = material.depthWrite;
              }
              const originalOpacity = Number(material.userData.islandOriginalOpacity ?? 1);
              material.opacity = originalOpacity * targetOpacity;
              material.transparent = shouldFadeBoss || Boolean(material.userData.islandOriginalTransparent);
              material.depthWrite = shouldFadeBoss ? false : Boolean(material.userData.islandOriginalDepthWrite);
              material.needsUpdate = true;
            });
          });
        }
      }
      // Both Frostmoon batches consume the same completed animation frame.
      // Share its scene traversal instead of repeating it in both batches
      // and again in the renderer. Other worlds retain their existing path.
      if (isFrostmoonHaven) scene.updateMatrixWorld(true);
      island1AnimatedBatches?.sync(camera, isFrostmoonHaven);
      frostwellRigidBatches?.sync(camera, isFrostmoonHaven);
      celestialPlantBatches?.sync(true);
      if (livingAmbience.consumeShadowUpdate?.() && sceneUsesRealtimeShadows) renderer.shadowMap.needsUpdate = true;
      const automaticWorldMatrices = scene.matrixWorldAutoUpdate;
      if (isFrostmoonHaven) scene.matrixWorldAutoUpdate = false;
      let renderCamera = camera;
      if (plantingMicroscopeCamera) {
        const bay = scene.getObjectByName(new URLSearchParams(window.location.search).get('islandPalaceMicroscopePart') || 'palace-planting-prototype');
        if (bay) {
          camera.updateMatrixWorld(true);
          bay.updateWorldMatrix(true, false);
          const centre = (Array.isArray(bay.userData.microscopeLocalCenter)
            ? new THREE.Vector3().fromArray(bay.userData.microscopeLocalCenter).applyMatrix4(bay.matrixWorld)
            : new THREE.Box3().setFromObject(bay).getCenter(new THREE.Vector3())).project(camera);
          const width = canvas.clientWidth, height = canvas.clientHeight, fraction = .22;
          plantingMicroscopeCamera.copy(camera);
          const x = (centre.x + 1) * .5 * width - width * fraction * .5;
          const y = (1 - centre.y) * .5 * height - height * fraction * .5;
          plantingMicroscopeCamera.setViewOffset(width, height, x, y, width * fraction, height * fraction);
          canvas.dataset.plantingMicroscope = JSON.stringify({ width, height, x, y, fraction,
            cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray() });
          renderCamera = plantingMicroscopeCamera;
        }
      }
      // DOM presentation follows the camera without React updates every frame.
      const occupiedLabelRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
      for (const item of landmarkProgressRef.current ?? []) {
        const label = landmarkLabelRefs.current.get(item.id);
        const root = landmarkRootsById.get(item.id as Island5LandmarkId);
        if (!label || !root) continue;
        const presentationVisible = !(firstArrivalRef.current.active && !firstArrivalCompletedRef.current)
          && !constructionPresentationRef.current?.active;
        let overlay = attentionVisuals.get(item.id);
        const visualLevel = landmarkBuildLevelsRef.current?.[item.id as Island5LandmarkId] ?? buildLevelRef.current;
        if (overlay?.root !== root || overlay?.level !== visualLevel) { overlay?.visual.dispose(); attentionVisuals.delete(item.id); overlay = undefined; }
        if (!overlay && item.attention && item.attention !== 'none') {
          overlay = { root, level: visualLevel, visual: createLandmarkAttentionVisual(root) };
          attentionVisuals.set(item.id, overlay);
        }
        overlay?.visual.set(item.attention ?? 'none', presentationVisible);

        let anchor = landmarkLabelAnchors.get(root);
        if (!anchor) {
          const bounds = new THREE.Box3().setFromObject(root);
          anchor = bounds.getCenter(new THREE.Vector3());
          anchor.y = bounds.max.y + 0.25;
          root.worldToLocal(anchor);
          landmarkLabelAnchors.set(root, anchor);
        }
        projectedLandmarkLabel.copy(anchor);
        root.localToWorld(projectedLandmarkLabel).project(renderCamera);
        const visible = !labelMovingRef.current && (landedLandmarkIdRef.current === item.id || selectedLandmarkIdRef.current === item.id) && root.visible && !(firstArrivalRef.current.active && !firstArrivalCompletedRef.current)
          && !constructionPresentationRef.current?.active
          && projectedLandmarkLabel.z > -1 && projectedLandmarkLabel.z < 1
          && Math.abs(projectedLandmarkLabel.x) < 0.95 && Math.abs(projectedLandmarkLabel.y) < 0.95;
        label.style.display = 'flex';
        label.style.opacity = visible ? '1' : '0';
        label.style.pointerEvents = visible ? 'auto' : 'none';
        label.setAttribute('aria-hidden', String(!visible));
        label.tabIndex = visible ? 0 : -1;
        if (visible) {
          const width = label.offsetWidth, height = label.offsetHeight;
          const x = Math.max(width / 2 + 4, Math.min(canvas.clientWidth - width / 2 - 4, (projectedLandmarkLabel.x + 1) * canvas.clientWidth / 2));
          let bottom = Math.max(height + 4, (1 - projectedLandmarkLabel.y) * canvas.clientHeight / 2);
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const collision = occupiedLabelRects.find(rect => x + width / 2 > rect.left - 4 && x - width / 2 < rect.right + 4 && bottom > rect.top - 4 && bottom - height < rect.bottom + 4);
            if (!collision) break;
            bottom = collision.top - 5;
          }
          label.style.transform = `translate(${x}px, ${bottom}px) translate(-50%, -100%)`;
          occupiedLabelRects.push({ left: x - width / 2, right: x + width / 2, top: bottom - height, bottom });
        }
      }
      try { renderer.render(scene, renderCamera); }
      finally { scene.matrixWorldAutoUpdate = automaticWorldMatrices; }
      if (isCoasterCarnival && island19CircuitFWorld && isCircuitFPreviewEnabled) {
        const atlasExterior = island19CircuitFWorld.root.userData.atlasExterior as
          | { root?: THREE.Object3D }
          | undefined;
        const atlasData = atlasExterior?.root?.userData;
        canvas.dataset.island19CircuitIReady = String(atlasData?.ready === true);
        canvas.dataset.island19CircuitIStaticDrawCalls = String(atlasData?.staticDrawCalls ?? 0);
        canvas.dataset.island19CircuitIStaticTriangles = String(atlasData?.staticTriangles ?? 0);
        canvas.dataset.island19CircuitIStaticBatchPresent = String(atlasData?.requiredStaticBatchPresent === true);
        canvas.dataset.island19SceneDrawCalls = String(renderer.info.render.calls);
        canvas.dataset.island19SceneTriangles = String(renderer.info.render.triangles);
        const visibleRootBreakdown = scene.children.map((sceneRoot) => {
          let meshes = 0;
          let triangles = 0;
          sceneRoot.traverseVisible((object) => {
            if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.InstancedMesh)) return;
            const materialCount = Array.isArray(object.material) ? object.material.length : 1;
            meshes += materialCount;
            const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
            const geometryTriangles = object.geometry.index
              ? object.geometry.index.count / 3
              : (object.geometry.getAttribute('position')?.count ?? 0) / 3;
            triangles += geometryTriangles * instanceCount;
          });
          return { name: sceneRoot.name || sceneRoot.type, meshes, triangles: Math.round(triangles) };
        }).filter((entry) => entry.meshes > 0);
        canvas.dataset.island19SceneVisibleRootBreakdown = JSON.stringify(visibleRootBreakdown);
        const circuitFChildBreakdown = island19CircuitFWorld.world.children.map((worldChild) => {
          let meshes = 0;
          let triangles = 0;
          worldChild.traverseVisible((object) => {
            if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.InstancedMesh)) return;
            meshes += Array.isArray(object.material) ? object.material.length : 1;
            const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
            const geometryTriangles = object.geometry.index
              ? object.geometry.index.count / 3
              : (object.geometry.getAttribute('position')?.count ?? 0) / 3;
            triangles += geometryTriangles * instanceCount;
          });
          return { name: worldChild.name || worldChild.type, meshes, triangles: Math.round(triangles) };
        }).filter((entry) => entry.meshes > 0);
        canvas.dataset.island19CircuitFVisibleChildBreakdown = JSON.stringify(circuitFChildBreakdown);
      }
      if (isJungleExpedition) {
        const weatherMix = livingAmbience.root.userData.weatherMix;
        canvas.dataset.island18SceneDrawCalls = String(renderer.info.render.calls);
        canvas.dataset.island18SceneTriangles = String(renderer.info.render.triangles);
        canvas.dataset.island18WeatherPhase = String(livingAmbience.root.userData.weatherPhase ?? '');
        canvas.dataset.island18StormFlashCount = String(weatherMix?.flashCount ?? '');
        canvas.dataset.island18StormCycle = String(weatherMix?.stormCycleIndex ?? '');
        canvas.dataset.island18PracticalLightExposure = Number(weatherMix?.practicalLightExposure ?? 0).toFixed(3);
        canvas.dataset.island18DaylightBlue = Number(weatherMix?.daylightBlue ?? 0).toFixed(3);
      }
      if (restoreAssemblyCameraAfterRender) {
        camera.position.copy(assemblyCameraBasePosition);
        camera.lookAt(controls.target);
      }
      if (constructionAnchor.visible) {
        canvas.dataset.constructionSceneDrawCalls = String(renderer.info.render.calls);
        canvas.dataset.constructionSceneTriangles = String(renderer.info.render.triangles);
      }
      if (!firstFrameRendered && renderer.info.render.calls > 0) {
        firstFrameRendered = true;
        setHasRenderedFrame(true);
      }

      if (activeTour && now >= activeTour.nextStepAt) {
        const nextStepIndex = activeTour.stepIndex + 1;
        const nextStep = activeTour.kind === 'assembly'
          ? ISLAND_1_ASSEMBLY_POV_TOUR_STEPS[nextStepIndex]
          : cameraTourSteps[nextStepIndex];
        if (!nextStep) {
          const completedTourKind = activeTour.kind;
          activeTour = null;
          controls.enabled = true;
          setTourStatus('idle');
          if (completedTourKind === 'assembly') setBoardActorsVisibleForPreset('boss');
        } else {
          if (activeTour.kind === 'assembly') {
            const assemblyTourStep = nextStep as (typeof ISLAND_1_ASSEMBLY_POV_TOUR_STEPS)[number];
            applyAssemblyTourStep(nextStepIndex);
            activeTour = {
              kind: 'assembly',
              stepIndex: nextStepIndex,
              nextStepAt: now + (isReducedMotion ? 220 : assemblyTourStep.durationMs) + assemblyTourStep.holdMs,
            };
          } else {
            const islandTourStep = nextStep as (typeof ISLAND_CAMERA_TOUR_STEPS)[number];
            const previousStep = cameraTourSteps[activeTour.stepIndex];
            applyPreset(islandTourStep.preset);
            activeTour = {
              kind: 'island',
              stepIndex: nextStepIndex,
              nextStepAt: now + resolveTourTransitionDurationMs(
                islandTourStep.preset,
                previousStep?.preset,
              ) + islandTourStep.holdMs,
            };
          }
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
            geometryBudgetPass: activeProfiler.maxDrawCalls <= (isCrystalGlacier ? 125 : 175)
              && activeProfiler.maxTriangles <= (isCrystalGlacier ? 110_000 : 180_000),
            measuredRefreshFps: 0,
            refreshNormalizedP95Ms: 0,
            refreshNormalizedTimingPass: false,
            rendererWidth: Math.round(rendererSize.x * renderer.getPixelRatio()),
            rendererHeight: Math.round(rendererSize.y * renderer.getPixelRatio()),
            gpuVendor: String(gl.getParameter(debugRendererInfo?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR)),
            gpuRenderer: String(gl.getParameter(debugRendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)),
            deviceSignals,
          };
          // A 60 Hz display has discrete 16.7/33.3 ms presentation bands. A
          // scene that misses occasional vsyncs can therefore report ~33 ms
          // p95 even when it satisfies the user-visible 50 FPS and slow-frame
          // targets. Record that distinction instead of silently weakening
          // the canonical continuous-frame target.
          const fastestSampleCount = Math.max(1, Math.floor(activeProfiler.frameTimesMs.length * 0.2));
          const fastestSamples = activeProfiler.frameTimesMs
            .filter((sample) => Number.isFinite(sample) && sample > 0)
            .slice()
            .sort((left, right) => left - right)
            .slice(0, fastestSampleCount);
          const refreshFrameMs = fastestSamples.reduce((total, sample) => total + sample, 0) / fastestSamples.length;
          report.measuredRefreshFps = Math.round(1000 / refreshFrameMs);
          const refreshBucketMs = 1000 / Math.max(1, report.measuredRefreshFps);
          const refreshBands = Math.max(1, Math.round(report.p95FrameMs / refreshBucketMs));
          report.refreshNormalizedP95Ms = Math.round((report.p95FrameMs / refreshBands) * 10) / 10;
          report.refreshNormalizedTimingPass = report.averageFps >= report.target.minAverageFps
            && report.slowFramePercent <= report.target.maxSlowFramePercent
            && report.refreshNormalizedP95Ms <= report.target.maxP95FrameMs;
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
        if (import.meta.env.DEV && isSunshoreAtoll && new URLSearchParams(window.location.search).get('island5ProfileDetails') === '1') {
          canvas.dataset.sunshoreSceneInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
        }
        if (import.meta.env.DEV && isFrostmoonHaven && new URLSearchParams(window.location.search).get('island3ProfileDetails') === '1') {
          canvas.dataset.island3SceneInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(scene));
          canvas.dataset.island3AmbienceInventory = JSON.stringify(collectIslandThreeScenePerformanceInventory(livingAmbience.root));
        }
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
      firstArrival?.dispose();
      livingAmbience.root.userData.disposeAwakening?.();
      tileRewardObjects.disposeFragments();
      pawnTileTrail.dispose();
      moonwellThermalAnimator?.dispose();
      applyEvidenceOrbitRef.current = () => undefined;
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.removeEventListener('start', cancelTransition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cameraPoseSnapshotRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
      };
      controls.dispose();
      timer.dispose();
      celestialPlantBatches?.dispose();
      island1AnimatedBatches?.dispose();
      frostwellRigidBatches?.dispose();
      if (encounterCaretaker) {
        scene.remove(encounterCaretaker.root);
        encounterCaretaker.dispose();
        encounterCaretaker = null;
      }
      scene.remove(boardCaretaker.root);
      boardCaretaker.dispose();
      livingAmbience.dispose?.();
      openingCeremonyFx?.dispose();
      const disposedSceneBackground = scene.background;
      if (assemblyEnvironmentTarget) { scene.environment = null; assemblyEnvironmentTarget.dispose(); }
      if (archiveLookdevEnvironmentTarget) {
        scene.environment = null;
        archiveLookdevEnvironmentTarget.dispose();
      }
      if (honeycombEnvironmentTarget) {
        scene.environment = null;
        honeycombEnvironmentTarget.dispose();
      }
      if (jungleExpeditionEnvironmentTarget) {
        scene.environment = null;
        jungleExpeditionEnvironmentTarget.dispose();
      }
      if (fishermansVillageEnvironmentTarget) {
        scene.environment = null;
        fishermansVillageEnvironmentTarget.dispose();
      }
      if (lavaLabyrinthEnvironmentTarget) {
        scene.environment = null;
        lavaLabyrinthEnvironmentTarget.dispose();
      }
      const disposingIsland15PalaceRuntime = island15PalaceRuntime;
      island15PalaceRuntime = null;
      if (island15CrystalPalaceRuntimeRef.current === disposingIsland15PalaceRuntime) {
        island15CrystalPalaceRuntimeRef.current = null;
      }
      disposeScene(scene);
      if (rootheartDayBackdrop && rootheartDayBackdrop !== disposedSceneBackground) rootheartDayBackdrop.dispose();
      if (rootheartNightBackdrop && rootheartNightBackdrop !== disposedSceneBackground) rootheartNightBackdrop.dispose();
      evidenceMaterials.forEach((material) => material.dispose());
      archiveAlbedoMaterials.forEach((material) => material.dispose());
      tileGeometry.dispose();
      tileMaterials.forEach((material) => material.dispose());
      moonveilTileEdgeGeometry?.dispose();
      moonveilTileEdgeMaterials.forEach((material) => material.dispose());
      abyssalTileEdgeGeometry?.dispose();
      abyssalTileEdgeMaterials.forEach((material) => material.dispose());
      honeycombTileEdgeGeometry?.dispose();
      honeycombTileEdgeMaterials.forEach((material) => material.dispose());
      jungleTileEdgeGeometry?.dispose();
      jungleTileEdgeMaterials.forEach((material) => material.dispose());
      fishermansTileEdgeGeometry?.dispose();
      fishermansTileEdgeMaterials.forEach((material) => material.dispose());
      // This canvas is reused when quality or landmark geometry changes.
      // Forced context loss made the immediately following WebKit renderer
      // attach to a deliberately lost context, which exposed the old 2D board.
      // Dispose GPU resources while preserving the reusable canvas context.
      renderer.dispose();
      applyPresetRef.current = () => undefined;
      exitIsland15PalaceRef.current = () => undefined;
      applyControlledCameraFocusRef.current = () => undefined;
      startTourRef.current = () => undefined;
      stopTourRef.current = () => undefined;
      startProfilerRef.current = () => undefined;
      exitTrainRideRef.current = () => undefined;
      advanceTrainRideRef.current = () => undefined;
      startWonderRideRef.current = () => undefined;
      exitWonderRideRef.current = () => undefined;
      if (activeTrainRide) setTrainRidePhase('idle');
      if (activeWonderRide) setWonderRidePhase('idle');
      setCameraAuthoringModeRef.current = () => undefined;
      setIsland15PalaceEntryPhase('idle');
    };
  }, [assemblyAssetsReady, deviceSignals, islandNumber, isAbyssalPearlKingdom, isCactusCanyon, isCelestialSkyKingdom, isCircuitFPreviewEnabled, isCircuitGBoardPreviewEnabled, isCoasterCarnival, isCrystalGlacier, isDriftwoodIsle, isEverblossomKingdom, isFirstLightKingdom, isFishermansVillage, isFrostmoonHaven, isHeartshaftCrucible, isHoneycombKingdom, isIsland19BoardFocusEvidenceEnabled, isJungleExpedition, isLavaLabyrinth, isMapStrippedEvidenceEnabled, isMoonveilNexus, isReducedMotion, isRootheartCanopyCity, isSunkenSands, isSunshoreAtoll, qualityProfile, rendererRetryVersion, sceneTileMap, resolvedWorldSourceNumber, sceneBuildLevelDependency, sceneLandmarkBuildLevelsDependency, tileRewardMapKey]);

  const trainRideViewCopy = trainRidePhase === 'driver'
    ? { eyebrow: 'ENGINEER\'S CAB', title: 'Forward through the canyon', next: 'Rear observation deck' }
    : trainRidePhase === 'rear'
      ? { eyebrow: 'ROYAL OBSERVATION', title: 'Watching the rails fall away', next: 'Open-window carriage' }
      : trainRidePhase === 'side'
        ? { eyebrow: 'LUXURY CARRIAGE', title: 'Canyon air through the open sash', next: 'Return to the island' }
        : null;
  const wonderRideUnlocked = isCoasterCarnival && (
    isCircuitFPreviewEnabled
    || Boolean(
      stagedRestorationPresentation
      && stagedRestorationPresentation.activatedStages >= stagedRestorationPresentation.stageCount,
    )
  );
  const wonderRidePhaseCopy: Readonly<Record<Island19CircuitFRidePhase, { eyebrow: string; title: string }>> = {
    dispatch: { eyebrow: 'WONDER EXPRESS', title: 'Dispatch from Coaster Castle' },
    'source-crest': { eyebrow: 'LIFT HILL', title: 'Climbing above the whole carnival' },
    'surface-s': { eyebrow: 'COURAGE RUN', title: 'Carving the great red S' },
    plunge: { eyebrow: 'UNDERGROUND DROP', title: 'Diving beneath the island' },
    'gold-vault': { eyebrow: 'THE GILDED GALLERIES', title: 'Follow the first glimmer of gold' },
    'grand-vault': { eyebrow: 'THE GREAT BELOW · LEVEL II', title: 'The vault beneath the world' },
    'diamond-gallery': { eyebrow: 'DIAMOND GALLERY', title: 'Crystal light across the rails' },
    'sea-cave': { eyebrow: 'UNDERSEA PORTAL', title: 'Entering the glass tunnel beneath the waves' },
    'ocean-reveal': { eyebrow: 'BENEATH THE BLUE', title: 'A slow passage through a living ocean' },
    return: { eyebrow: 'VICTORY ASCENT', title: 'Climbing from the seabed back to Coaster Castle' },
  };
  const activeWonderRideCopy = wonderRidePhase === 'idle' ? null : wonderRidePhaseCopy[wonderRidePhase];
  const wonderRideAnnouncement = activeWonderRideCopy
    ? `Wonder Express. ${activeWonderRideCopy.eyebrow}. ${activeWonderRideCopy.title}. ${wonderRideWagon === 'front' ? 'Front wagon' : 'Middle wagon'}.`
    : '';
  useEffect(() => {
    const previousPhase = previousWonderRidePhaseRef.current;
    previousWonderRidePhaseRef.current = wonderRidePhase;
    if (isEvidenceCapture || !wonderRideUnlocked) return undefined;
    const rideStarted = previousPhase === 'idle' && wonderRidePhase !== 'idle';
    const rideEnded = previousPhase !== 'idle' && wonderRidePhase === 'idle';
    if (!rideStarted && !rideEnded) return undefined;
    const focusFrame = window.requestAnimationFrame(() => {
      if (rideStarted) {
        wonderRideExitButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      const returnButton = wonderRideWagon === 'front'
        ? wonderRideFrontButtonRef.current
        : wonderRideMiddleButtonRef.current;
      returnButton?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [isEvidenceCapture, wonderRidePhase, wonderRideUnlocked, wonderRideWagon]);
  const island19PresentationMode = !isCoasterCarnival
    ? undefined
    : wonderRidePhase !== 'idle'
      ? 'wonder-express-3d-pov'
      : isCircuitFPreviewEnabled
        ? 'all-angle-3d-world'
        : isCircuitGBoardPreviewEnabled
          ? 'modular-board-3d-preview'
          : isMapStrippedEvidenceEnabled
            ? 'geometry-proof'
            : 'source-locked-hybrid-overview';
  const isIsland19HybridOverview = island19PresentationMode === 'source-locked-hybrid-overview';
  const presentationAccessibilityLabel = isIsland19HybridOverview
    ? 'Interactive Island 19 Coaster Carnival hybrid overview; source-matched carnival artwork with real Three.js gameplay and Wonder Express ride geometry'
    : useIsland15ProductPresentation
      ? `Interactive 3D Island ${islandNumber}`
      : `Actual 3D Island ${islandNumber} pilot`;
  const canvasAccessibilityLabel = isIsland19HybridOverview
    ? 'Interactive Three.js gameplay layer for the Island 19 Coaster Carnival hybrid overview; the Wonder Express ride uses real 3D geometry'
    : `Interactive 3D ${worldName} island${isCactusCanyon || isCoasterCarnival ? '; ride the railway in first person' : ''}`;

  const island15ActiveRoom = isIsland15PalaceRoomPreset(activePreset) ? activePreset : null;
  const island15ActiveRoomIndex = island15ActiveRoom
    ? ISLAND_15_PALACE_ROOM_ORDER.indexOf(island15ActiveRoom)
    : -1;
  const island15PreviousRoom = island15ActiveRoomIndex >= 0
    ? ISLAND_15_PALACE_ROOM_ORDER[
      (island15ActiveRoomIndex - 1 + ISLAND_15_PALACE_ROOM_ORDER.length) % ISLAND_15_PALACE_ROOM_ORDER.length
    ]
    : 'boss';
  const island15NextRoom = island15ActiveRoomIndex >= 0
    ? ISLAND_15_PALACE_ROOM_ORDER[(island15ActiveRoomIndex + 1) % ISLAND_15_PALACE_ROOM_ORDER.length]
    : 'boss';

  return (
    <section
      className={`island-5-three-pilot${useIsland15ProductPresentation ? ' island-5-three-pilot--embedded' : ''}${isIsland15ProductAcceptanceCapture ? ' island-5-three-pilot--product-acceptance' : ''}${isEvidenceCapture ? ' island-5-three-pilot--evidence' : ''}`}
      style={isCoasterCarnival && wonderRidePhase === 'idle' && !isCircuitFPreviewEnabled && !isCircuitGBoardPreviewEnabled && !isMapStrippedEvidenceEnabled ? {
        backgroundImage: `url(${ISLAND_19_HYBRID_PHONE_PLATE})`,
        backgroundPosition: activePreset === 'survey' ? 'center 43%' : 'center 10%',
        backgroundRepeat: 'no-repeat',
        backgroundSize: activePreset === 'survey' ? '172% auto' : '112% auto',
        transition: isReducedMotion ? 'none' : 'background-size 700ms ease, background-position 700ms ease',
      } : undefined}
      data-quality={qualityProfile.id}
      data-camera-preset={activePreset}
      data-train-ride-phase={trainRidePhase}
      data-wonder-ride-phase={wonderRidePhase}
      data-wonder-ride-wagon={wonderRideWagon}
      data-island-19-presentation={island19PresentationMode}
      aria-label={presentationAccessibilityLabel}
    >
      <canvas
        key={`${islandNumber}-${resolvedWorldSourceNumber}-${qualityProfile.id}`}
        ref={canvasRef}
        className="island-5-three-pilot__canvas"
        aria-label={`${canvasAccessibilityLabel}${isCrystalGlacier ? '; select the palace exterior to enter' : ''}`}
      />
      {landmarkProgress ? <div className="island-landmark-progress-layer">
        {landmarkProgress.map(item => <button key={item.id} type="button"
          ref={element => { if (element) landmarkLabelRefs.current.set(item.id, element); else landmarkLabelRefs.current.delete(item.id); }}
          className={`island-landmark-progress-label${item.attention === 'blue' ? ' island-landmark-progress-label--ready' : ''}`}
          style={{ display: 'none' }}
          disabled={isRolling || interactionPaused}
          aria-label={`${item.title}: ${item.percent}% built. ${item.status}`}
          onClick={() => onLandmarkClick?.(item.id as Island5LandmarkId)}>
          <span className="island-landmark-progress-ring" style={{ background: `conic-gradient(#70e6ad ${item.percent}%, #ffffff26 0)` }}>
            <span>{item.percent}%</span>
          </span>
          <span><strong>{item.title}</strong><small>{item.status}</small></span>
        </button>)}
      </div> : null}
      {!hasRenderedFrame ? (
        <div className="island-5-three-pilot__loading" role="status" aria-live="polite">
          <span aria-hidden="true" />
          <strong>Entering {worldName}</strong>
          <small>Awakening the living world…</small>
        </div>
      ) : null}
      {isCactusCanyon && hasRenderedFrame && trainRidePhase === 'idle' && !isEvidenceCapture ? (
        <div className="island-5-three-pilot__train-ride-prompt" aria-hidden="true">
          <span>🚂</span> Double-tap the train to ride
        </div>
      ) : null}
      {wonderRideUnlocked && hasRenderedFrame && wonderRidePhase === 'idle' && !isEvidenceCapture ? (
        <section
          className="wonder-ride-card"
          aria-labelledby="island-19-wonder-express-choice-title"
          aria-describedby="island-19-wonder-express-choice-description"
        >
          <div className="wonder-ride-card__top">
            <div className="wonder-ride-card__seal" aria-hidden="true">✧</div>
            <div className="wonder-ride-card__copy">
            <span>MISSION FINALE · WONDER EXPRESS</span>
            <strong id="island-19-wonder-express-choice-title">Your seat to the extraordinary</strong>
            <small id="island-19-wonder-express-choice-description">From carnival skies to the great treasure vault and living ocean.</small>
            </div>
          </div>
          <div className="wonder-ride-card__choices">
            <button
              ref={wonderRideFrontButtonRef}
              type="button"
              aria-label="Ride the Wonder Express from the front wagon"
              onClick={() => startWonderRideRef.current('front')}
            >
              Front wagon
              <small>The unobstructed adventure</small>
            </button>
            <button
              ref={wonderRideMiddleButtonRef}
              type="button"
              aria-label="Ride the Wonder Express from the middle wagon"
              onClick={() => startWonderRideRef.current('middle')}
            >
              Middle wagon
              <small>Follow the train into the deep</small>
            </button>
          </div>
        </section>
      ) : null}
      {isCoasterCarnival ? (
        <p
          className="sr-only island-5-three-pilot__wonder-ride-announcement"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {wonderRideAnnouncement}
        </p>
      ) : null}
      {activeWonderRideCopy ? (
        <section className="wonder-ride-card" data-phase={wonderRidePhase} aria-label="Wonder Express ride status">
          <div className="wonder-ride-card__top">
            <div className="wonder-ride-card__seal" aria-hidden="true">✧</div>
            <div className="wonder-ride-card__copy">
            <span>{activeWonderRideCopy.eyebrow}</span>
            <strong>{activeWonderRideCopy.title}</strong>
            </div>
            <button
              className="wonder-ride-card__exit"
              ref={wonderRideExitButtonRef}
              type="button"
              aria-label="Exit the Wonder Express and return to Coaster Carnival"
              onClick={() => exitWonderRideRef.current()}
            >
              <span aria-hidden="true">↩</span>
            </button>
          </div>
          <div className="wonder-ride-card__footer">
            <span>{wonderRideWagon === 'front' ? 'FRONT ROW' : 'MIDDLE ROW'} · WONDER EXPRESS</span>
            <b>{wonderRideTelemetry.pace}</b>
          </div>
          <div className="wonder-ride-card__progress" aria-hidden="true">
            <i style={{ width: `${wonderRideTelemetry.progress * 100}%` }} />
          </div>
        </section>
      ) : null}
      {activeWonderRideCopy ? (
        <div
          ref={wonderRideTransitionVeilRef}
          className="island-5-three-pilot__wonder-transition-veil"
          aria-hidden="true"
        />
      ) : null}
      {activeWonderRideCopy ? (
        <div
          className="island-5-three-pilot__wonder-cockpit"
          data-wagon={wonderRideWagon}
          aria-hidden="true"
        >
          <span />
          <span />
          <b>{wonderRideWagon === 'front' ? 'WONDER · ROW 1' : 'WONDER · ROW 3'}</b>
        </div>
      ) : null}
      {trainRideViewCopy ? (
        <section className="island-5-three-pilot__train-ride-hud" role="status" aria-live="polite">
          <div>
            <span>{trainRideViewCopy.eyebrow}</span>
            <strong>{trainRideViewCopy.title}</strong>
            <small>{trainRideSecondsRemaining}s · next: {trainRideViewCopy.next}</small>
          </div>
          <div className="island-5-three-pilot__train-ride-actions">
            <button type="button" onClick={() => advanceTrainRideRef.current()}>Next view</button>
            <button type="button" onClick={() => exitTrainRideRef.current()}>Exit ride</button>
          </div>
        </section>
      ) : null}
      {isCrystalGlacier && hasRenderedFrame && island15ActiveRoom && !isEvidenceCapture ? (
        <nav
          className="island-5-three-pilot__palace-navigation"
          aria-label="Crystal Palace rooms"
          data-entry-phase={island15PalaceEntryPhase}
        >
          <button
            className="island-5-three-pilot__palace-navigation-arrow"
            type="button"
            disabled={island15PalaceEntryPhase !== 'idle'}
            aria-label={`Previous room: ${ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[island15PreviousRoom]}`}
            onClick={() => applyPresetRef.current(island15PreviousRoom)}
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <div className="island-5-three-pilot__palace-navigation-room" aria-live="polite">
            <span>INSIDE THE CRYSTAL PALACE</span>
            <strong>{ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[island15ActiveRoom]}</strong>
            <small>{island15PalaceEntryPhase === 'crossing' ? 'Passing through the crystal gate…' : `${island15ActiveRoomIndex + 1} of ${ISLAND_15_PALACE_ROOM_ORDER.length}`}</small>
          </div>
          <button
            className="island-5-three-pilot__palace-navigation-arrow"
            type="button"
            disabled={island15PalaceEntryPhase !== 'idle'}
            aria-label={`Next room: ${ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[island15NextRoom]}`}
            onClick={() => applyPresetRef.current(island15NextRoom)}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
          <div className="island-5-three-pilot__palace-navigation-actions">
            <button
              type="button"
              disabled={island15PalaceEntryPhase !== 'idle' || island15ActiveRoom === 'boss'}
              aria-label="Return to Boss Hall"
              onClick={() => applyPresetRef.current('boss')}
            >
              Hall
            </button>
            <button
              type="button"
              disabled={island15PalaceEntryPhase !== 'idle'}
              aria-label="Exit Palace"
              onClick={() => exitIsland15PalaceRef.current()}
            >
              Exit
            </button>
          </div>
        </nav>
      ) : null}
      {!useIsland15ProductPresentation ? (
        <>
          {(isFrostmoonHaven || isDriftwoodIsle) && activePreset === 'wisdom' && (landmarkBuildLevels?.wisdom ?? buildLevel) >= 3 && !constructionPresentation?.active ? (
        <button type="button" className="island-3-archive-inspect-toggle" aria-pressed={archiveInteriorOpen}
          onClick={() => setArchiveInteriorOpen(value => !value)}>{archiveInteriorOpen ? 'Close roof' : 'Look inside'}</button>
      ) : null}
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
            <div><dt>P95 / refresh</dt><dd>{profileReport.refreshNormalizedP95Ms} ms · {profileReport.refreshNormalizedTimingPass ? 'PASS' : 'REVIEW'}</dd></div>
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

      {islandNumber === 5 ? <button className="island-5-three-pilot__celebration-test island-5-three-pilot__arena-test" type="button" onClick={() => { arenaCrownPreviewUntilRef.current = performance.now() + 6500; }}>Test arena rise + return</button> : null}
      {islandNumber === 5 ? <button className="island-5-three-pilot__celebration-test" type="button" disabled={profilerStatus === 'running' || tourStatus === 'running'} onClick={() => {
        applyPresetRef.current('overview');
        creatureCelebrationRequestRef.current += 1;
      }}>Test creature celebration</button> : null}
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
          value={['boss', 'hatchery', 'habit', 'wisdom', 'event', 'canyon-spiral'].includes(activePreset) ? activePreset : ''}
          onChange={(event) => event.target.value && applyPresetRef.current(event.target.value as Island5CameraPresetId)}
        >
          <option value="">Focus landmark…</option>
          {ISLAND_5_CAMERA_PRESETS.slice(4)
            .filter((preset) => (
              (preset.id !== 'frostwell' || isFrostmoonHaven)
              && (preset.id !== 'powerworks' || isRootheartCanopyCity)
              && (preset.id !== 'canyon-spiral' || isCactusCanyon)
            ))
            .map((preset) => (
            <option key={preset.id} value={preset.id}>
              {isAssemblyCraterFirstLight && preset.id === 'boss'
                ? 'Assembly Crater General Assembly'
                : isFirstLightKingdom
                ? ISLAND_1_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_1_LANDMARK_LABELS]
                : isCelestialSkyKingdom
                  ? ISLAND_2_CELESTIAL_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_2_CELESTIAL_LANDMARK_LABELS]
                  : isFrostmoonHaven
                    ? ISLAND_3_FROSTMOON_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_3_FROSTMOON_LANDMARK_LABELS]
                    : isDriftwoodIsle
                      ? ISLAND_4_DRIFTWOOD_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_4_DRIFTWOOD_LANDMARK_LABELS]
                    : isSunshoreAtoll
                      ? ISLAND_5_SUNSHORE_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_5_SUNSHORE_LANDMARK_LABELS]
                      : isMoonveilNexus
                        ? ISLAND_6_MOONVEIL_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_6_MOONVEIL_LANDMARK_LABELS]
                        : isAbyssalPearlKingdom
                          ? ISLAND_7_UNDERWATER_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_7_UNDERWATER_LANDMARK_LABELS]
                          : isEverblossomKingdom
                            ? ISLAND_8_EVERBLOSSOM_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_8_EVERBLOSSOM_LANDMARK_LABELS]
                            : isHeartshaftCrucible
                              ? ISLAND_9_HEARTSHAFT_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_9_HEARTSHAFT_LANDMARK_LABELS]
                            : isRootheartCanopyCity
                              ? ISLAND_10_ROOTHEART_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_10_ROOTHEART_LANDMARK_LABELS]
                            : isSunkenSands
                              ? ISLAND_12_SUNKEN_SANDS_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_12_SUNKEN_SANDS_LANDMARK_LABELS]
                            : isCactusCanyon
                              ? ISLAND_13_CACTUS_CANYON_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_13_CACTUS_CANYON_LANDMARK_LABELS]
                            : isHoneycombKingdom
                              ? ISLAND_14_HONEYCOMB_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_14_HONEYCOMB_LANDMARK_LABELS]
                            : isCrystalGlacier
                              ? ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_15_CRYSTAL_GLACIER_LANDMARK_LABELS]
                            : isJungleExpedition
                              ? ISLAND_18_JUNGLE_EXPEDITION_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_18_JUNGLE_EXPEDITION_LANDMARK_LABELS]
                            : isLavaLabyrinth
                              ? ISLAND_20_LAVA_LABYRINTH_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_20_LAVA_LABYRINTH_LANDMARK_LABELS]
                            : isTitansRest
                              ? ISLAND_17_TITANS_REST_LANDMARK_LABELS[preset.id as keyof typeof ISLAND_17_TITANS_REST_LANDMARK_LABELS]
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
          {tourStatus === 'running'
            ? isAssemblyCraterFirstLight && firstLightAssemblyCraterPresentation.completed
              ? 'Stop Assembly POV tour'
              : 'Stop cinematic tour'
            : isAssemblyCraterFirstLight && firstLightAssemblyCraterPresentation.completed
              ? 'Play Assembly POV tour'
              : 'Play cinematic tour'}
        </button>
        <button type="button" onClick={() => setIsEvidenceCapture(true)}>
          Hide overlays for evidence
        </button>
        {(isCelestialSkyKingdom || isFrostmoonHaven || isDriftwoodIsle || isSunshoreAtoll || isMoonveilNexus || isAbyssalPearlKingdom || isEverblossomKingdom || isHeartshaftCrucible || isRootheartCanopyCity || isSunkenSands || isCactusCanyon || isHoneycombKingdom || isJungleExpedition || isLavaLabyrinth || isCoasterCarnival) ? (
          <button
            type="button"
            aria-pressed={isMapStrippedEvidenceEnabled}
            onClick={() => setIsMapStrippedEvidenceEnabled((enabled) => !enabled)}
          >
            {isMapStrippedEvidenceEnabled ? 'Show materials' : 'Geometry proof'}
          </button>
        ) : null}
        {(isCelestialSkyKingdom || isDriftwoodIsle || isHoneycombKingdom || isJungleExpedition || isLavaLabyrinth) ? (
          <div className="island-5-three-pilot__camera-row" aria-label={`${worldName} 360 evidence orbit`}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => (
              <button
                key={degrees}
                type="button"
                disabled={profilerStatus === 'running' || tourStatus === 'running'}
                onClick={() => applyEvidenceOrbitRef.current(degrees)}
              >
                {degrees}°
              </button>
            ))}
          </div>
        ) : null}
        <div className="island-5-three-pilot__camera-authoring" data-active={isCameraAuthoring}>
          <button
            type="button"
            aria-pressed={isCameraAuthoring}
            onClick={() => {
              const enabled = !isCameraAuthoring;
              cameraAuthoringEnabledRef.current = enabled;
              setIsCameraAuthoring(enabled);
              setCameraAuthoringNotice('');
              setCameraAuthoringModeRef.current(enabled);
            }}
          >
            {isCameraAuthoring ? 'Close POV authoring' : 'POV authoring'}
          </button>
          {isCameraAuthoring ? (
            <>
              <code aria-label="Current camera POV coordinates">
                {cameraAuthoringPose
                  ? `preset ${cameraAuthoringPose.preset}\nposition [${cameraAuthoringPose.position.join(', ')}]\ntarget [${cameraAuthoringPose.target.join(', ')}]\nfov ${cameraAuthoringPose.fov} · zoom ${cameraAuthoringPose.zoom} · aspect ${cameraAuthoringPose.aspect}${cameraAuthoringPose.signatureMissionSocketActive === undefined ? '' : `\nmission socket ${cameraAuthoringPose.signatureMissionSocketActive ? 'active' : 'inactive'} · ${cameraAuthoringPose.signatureMissionMetersDrilled ?? 0}m`}`
                  : 'Reading camera…'}
              </code>
              <button
                type="button"
                disabled={!cameraAuthoringPose}
                onClick={() => {
                  if (!cameraAuthoringPose) return;
                  const payload = JSON.stringify(cameraAuthoringPose, null, 2);
                  void navigator.clipboard.writeText(payload).then(
                    () => setCameraAuthoringNotice('POV JSON copied — paste it into the task.'),
                    () => setCameraAuthoringNotice('Copy was blocked; select the coordinates above.'),
                  );
                }}
              >
                Copy POV JSON
              </button>
              <small>Orbit normally · right-drag or two-finger pan changes the target · scroll/pinch zooms.</small>
              {cameraAuthoringNotice ? <small role="status">{cameraAuthoringNotice}</small> : null}
            </>
          ) : null}
        </div>
        <p>{tourStatus === 'running'
          ? 'Touring the island and all five landmarks…'
          : 'Drag to orbit · pinch to zoom · tap a building to focus'}</p>
      </div>
        </>
      ) : null}

      {error ? (
        <div className="island-5-three-pilot__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRendererRetryVersion((current) => current + 1)}>Retry 3D</button>
        </div>
      ) : null}
    </section>
  );
}
