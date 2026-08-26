import * as THREE from 'three';
import type { Island3DQuality, Island5LandmarkDefinition } from './island5ThreePilotContract';
import {
  buildIsland1Landmark,
  type Island1LandmarkBuildOptions,
  type Island1WorldMaterials,
} from './Island1ThreeWorld';

export const ISLAND_1_ASSEMBLY_CRATER_NAME = 'Assembly Crater';
export const ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT = 20;
export const ISLAND_1_ASSEMBLY_CRATER_RADIUS = 2.72;
export const ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y = 0.26;
export const ISLAND_1_ASSEMBLY_CRATER_DEPTH = 4.72;
// The hall should feel implausibly capacious without overwhelming the island's
// silhouette: 6.95 is only about 11% wider than the 6.25-unit surface crown.
export const ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS = 6.95;
export const ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS = 2.4;
export const ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS = 7.2;

export interface Island1AssemblyCraterPresentation {
  chargesDetonated: number;
  targetCharges: number;
  completed: boolean;
  claimedDynamiteTileIndices?: readonly number[];
  constructionSequence?: number;
}

export interface Island1AssemblyCraterRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateAssemblyCrater: (presentation: Island1AssemblyCraterPresentation, immediate?: boolean) => void;
  setInspectionCutaway: (active: boolean) => void;
  getBlastPresentation: () => Island1AssemblyBlastPresentation;
  getConstructionPresentation: () => Island1AssemblyConstructionPresentation;
}

export interface Island1AssemblyBlastPresentation {
  active: boolean;
  progress: number;
  intensity: number;
  cameraShake: number;
  impactPosition: readonly [number, number, number];
}

export interface Island1AssemblyConstructionPresentation {
  active: boolean;
  progress: number;
  completed: boolean;
}

type BuildLevel = 0 | 1 | 2 | 3;

function clampChargeCount(value: number, target: number): number {
  return Math.max(0, Math.min(target, Math.floor(Number.isFinite(value) ? value : 0)));
}

/**
 * Island 001 keeps the canonical Boss as a progression stop, but it no longer
 * presents a boss building in the centre. The low civic seal gives the shared
 * focus/click/build systems a stable ground reference without recreating a
 * tower or landmark silhouette.
 */
export function buildIsland1AssemblyLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island1WorldMaterials,
  options: Island1LandmarkBuildOptions = {},
) {
  if (definition.id !== 'boss') {
    return buildIsland1Landmark(definition, level, quality, materials, options);
  }

  const root = new THREE.Group();
  root.name = 'ISLAND_1_ASSEMBLY_CRATER_CANONICAL_BOSS_GROUND_REFERENCE';
  root.position.set(...definition.position);
  const segments = quality === 'high' ? 32 : quality === 'medium' ? 24 : 16;
  const seal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.55, 0.055, segments),
    materials.moonstone,
  );
  seal.name = 'ISLAND_1_ASSEMBLY_CRATER_CIVIC_SEAL';
  seal.position.y = -0.17;
  // Retain the canonical boss-stop object for focus/progression routing, but
  // never let a white centre disc float inside the active excavation.
  seal.visible = false;
  seal.receiveShadow = true;
  root.add(seal);
  root.traverse((child) => {
    child.userData.landmarkId = definition.id;
    child.userData.presentationOnly = true;
  });
  return root;
}

/**
 * Runtime Island 001 needs a real opening in the First Light terrain. Placing
 * a low bowl over the original solid cap leaves the grass visible through the
 * mission and makes the crater read as a flat field. This annular terrain keeps
 * the route and outer island crown intact while exposing a deep access throat.
 * The civic chamber itself flares far beyond the island footprint below this
 * protected opening. Island 011 never calls this factory and therefore
 * preserves the original terrain.
 */
export function createIsland1AssemblyCraterTerrain(
  quality: Island3DQuality,
  materials: {
    top: THREE.Material;
    cliff: THREE.Material;
    innerSoil: THREE.MeshStandardMaterial;
    innerRock: THREE.Material;
    rim: THREE.Material;
  },
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_1_ASSEMBLY_CRATER_ANNULAR_TERRAIN';
  const segments = quality === 'high' ? 72 : quality === 'medium' ? 56 : 40;
  const outerRadius = 6.25;
  const outerDepth = 3.4;

  const crown = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_1_ASSEMBLY_CRATER_RADIUS, outerRadius, segments, 3),
    materials.top,
  );
  crown.name = 'ISLAND_1_ASSEMBLY_CRATER_ROUTE_BEARING_CROWN';
  crown.rotation.x = -Math.PI / 2;
  crown.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y;
  crown.receiveShadow = true;
  root.add(crown);

  const outerCliff = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius, outerRadius * 1.07, outerDepth, segments, 5, true),
    materials.cliff,
  );
  outerCliff.name = 'ISLAND_1_ASSEMBLY_CRATER_OUTER_CLIFF';
  outerCliff.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - outerDepth / 2;
  outerCliff.castShadow = quality !== 'low';
  outerCliff.receiveShadow = true;
  root.add(outerCliff);

  const soilDepth = 0.38;
  const soilFlareRadius = ISLAND_1_ASSEMBLY_CRATER_RADIUS + 0.12;
  const innerSoilMaterial = materials.innerSoil.clone();
  innerSoilMaterial.name = 'ISLAND_1_ASSEMBLY_CRATER_EXPOSED_SOIL_MATERIAL';
  innerSoilMaterial.side = THREE.BackSide;
  innerSoilMaterial.roughness = Math.max(0.82, innerSoilMaterial.roughness);
  const innerSoilCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(
      ISLAND_1_ASSEMBLY_CRATER_RADIUS,
      soilFlareRadius,
      soilDepth,
      segments,
      1,
      true,
    ),
    innerSoilMaterial,
  );
  innerSoilCollar.name = 'ISLAND_1_ASSEMBLY_CRATER_THIN_EXPOSED_SOIL_COLLAR';
  innerSoilCollar.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - soilDepth / 2;
  innerSoilCollar.receiveShadow = true;
  root.add(innerSoilCollar);

  const rockDepth = ISLAND_1_ASSEMBLY_CRATER_DEPTH - soilDepth;
  const innerRockMaterial = materials.innerRock.clone();
  innerRockMaterial.name = 'ISLAND_1_ASSEMBLY_CRATER_DEEP_STONE_MATERIAL';
  innerRockMaterial.side = THREE.BackSide;
  if (innerRockMaterial instanceof THREE.MeshStandardMaterial) {
    innerRockMaterial.roughness = Math.max(0.78, innerRockMaterial.roughness);
  }
  const innerRockWall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      soilFlareRadius,
      ISLAND_1_ASSEMBLY_CRATER_RADIUS + 1.18,
      rockDepth,
      segments,
      6,
      true,
    ),
    innerRockMaterial,
  );
  innerRockWall.name = 'ISLAND_1_ASSEMBLY_CRATER_DEEP_EXPOSED_STONE';
  innerRockWall.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - soilDepth - rockDepth / 2;
  innerRockWall.receiveShadow = true;
  root.add(innerRockWall);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_1_ASSEMBLY_CRATER_RADIUS, 0.085, 8, segments),
    materials.rim,
  );
  rim.name = 'ISLAND_1_ASSEMBLY_CRATER_PROTECTED_ROUTE_RIM';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.035;
  root.add(rim);

  root.userData.routeInnerClearanceRadius = ISLAND_1_ASSEMBLY_CRATER_RADIUS;
  root.userData.presentationOnly = true;
  return root;
}

function setInstanceTransform(
  target: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  rotationY: number,
  scale: THREE.Vector3,
  dummy: THREE.Object3D,
) {
  dummy.position.copy(position);
  dummy.rotation.set(0, rotationY, 0);
  dummy.scale.copy(scale);
  dummy.updateMatrix();
  target.setMatrixAt(index, dummy.matrix);
}

export function createIsland1AssemblyCraterRuntime(
  scene: THREE.Scene,
  quality: Island3DQuality,
  materials: Island1WorldMaterials,
): Island1AssemblyCraterRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_1_ASSEMBLY_CRATER_RUNTIME_ROOT';
  root.userData.signatureMissionId = 'first-light-assembly-crater';
  root.userData.presentationOnly = true;

  const segmentAngle = Math.PI * 2 / ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT;
  const radialSegments = quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
  const dummy = new THREE.Object3D();

  // The focused Assembly view keeps a canonical-radius rear half of Island 001
  // as geological context. It deliberately uses no perimeter railing/fence and
  // does not alter the real board or terrain; it only makes the depth and modest
  // hall overhang legible while the front half is presented as a cutaway.
  const inspectionCutawayContext = new THREE.Group();
  inspectionCutawayContext.name = 'ISLAND_1_ASSEMBLY_CANONICAL_REAR_HALF_CUTAWAY_CONTEXT';
  inspectionCutawayContext.visible = false;
  inspectionCutawayContext.userData.presentationOnly = true;
  const cutawaySegments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 36;
  const cutawayGrassMaterial = materials.leaf.clone();
  cutawayGrassMaterial.name = 'ISLAND_1_ASSEMBLY_CUTAWAY_GRASS_MATERIAL';
  cutawayGrassMaterial.roughness = Math.max(0.88, cutawayGrassMaterial.roughness);
  const cutawaySoilMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4d35, roughness: 0.94 });
  cutawaySoilMaterial.name = 'ISLAND_1_ASSEMBLY_CUTAWAY_SOIL_MATERIAL';
  const cutawayStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x3f4751, roughness: 0.96 });
  cutawayStoneMaterial.name = 'ISLAND_1_ASSEMBLY_CUTAWAY_DEEP_STONE_MATERIAL';
  const rearGrassCrown = new THREE.Mesh(
    new THREE.RingGeometry(
      ISLAND_1_ASSEMBLY_CRATER_RADIUS,
      6.25,
      cutawaySegments,
      2,
      0,
      Math.PI,
    ),
    cutawayGrassMaterial,
  );
  rearGrassCrown.name = 'ISLAND_1_ASSEMBLY_CANONICAL_REAR_GRASS_CROWN';
  rearGrassCrown.rotation.x = -Math.PI / 2;
  rearGrassCrown.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y;
  rearGrassCrown.receiveShadow = true;
  inspectionCutawayContext.add(rearGrassCrown);

  const rearStoneCliff = new THREE.Mesh(
    new THREE.CylinderGeometry(
      6.25,
      6.48,
      3.62,
      cutawaySegments,
      4,
      true,
      Math.PI / 2,
      Math.PI,
    ),
    cutawayStoneMaterial,
  );
  rearStoneCliff.name = 'ISLAND_1_ASSEMBLY_CANONICAL_REAR_DEEP_STONE';
  rearStoneCliff.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - 1.81;
  rearStoneCliff.receiveShadow = true;
  inspectionCutawayContext.add(rearStoneCliff);

  const cutFaceWidth = (6.25 - ISLAND_1_ASSEMBLY_CRATER_RADIUS) / 2;
  const cutFaceCenter = ISLAND_1_ASSEMBLY_CRATER_RADIUS + cutFaceWidth;
  [-1, 1].forEach((side) => {
    const stoneFace = new THREE.Mesh(
      new THREE.BoxGeometry(cutFaceWidth * 2, 3.62, 0.2),
      cutawayStoneMaterial,
    );
    stoneFace.name = `ISLAND_1_ASSEMBLY_CUT_FACE_STONE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    stoneFace.position.set(side * cutFaceCenter, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - 1.81, 0);
    stoneFace.receiveShadow = true;
    inspectionCutawayContext.add(stoneFace);
    const soilFace = new THREE.Mesh(
      new THREE.BoxGeometry(cutFaceWidth * 2, 0.34, 0.215),
      cutawaySoilMaterial,
    );
    soilFace.name = `ISLAND_1_ASSEMBLY_CUT_FACE_SOIL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    soilFace.position.set(side * cutFaceCenter, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - 0.17, 0.005);
    inspectionCutawayContext.add(soilFace);
  });
  root.add(inspectionCutawayContext);

  const chamberFloorY = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - ISLAND_1_ASSEMBLY_CRATER_DEPTH + 0.16;
  const assemblyInnerRadius = 1.18;
  const megahallTierSpecs = [
    { inner: assemblyInnerRadius, outer: 1.94, y: chamberFloorY + 0.28 },
    { inner: 1.94, outer: 2.76, y: chamberFloorY + 0.68 },
    { inner: 2.76, outer: 3.61, y: chamberFloorY + 1.08 },
    { inner: 3.61, outer: 4.48, y: chamberFloorY + 1.48 },
    { inner: 4.48, outer: 5.32, y: chamberFloorY + 1.88 },
    { inner: 5.32, outer: 6.14, y: chamberFloorY + 2.28 },
    { inner: 6.14, outer: ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS, y: chamberFloorY + 2.68 },
  ] as const;
  const aisleOuterRadius = ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.22;
  const aisleLength = aisleOuterRadius - assemblyInnerRadius;
  const aisleCenterRadius = (aisleOuterRadius + assemblyInnerRadius) / 2;

  const foundationGeometry = new THREE.RingGeometry(
    0.18,
    ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS,
    radialSegments * 3,
    1,
    -segmentAngle * 0.46,
    segmentAngle * 0.92,
  );
  foundationGeometry.rotateX(-Math.PI / 2);
  const rawExcavation = new THREE.Group();
  rawExcavation.name = 'ISLAND_1_ASSEMBLY_TWENTY_STAGE_EXCAVATION_VOLUME';
  const rawExcavationWallMaterial = cutawayStoneMaterial.clone();
  rawExcavationWallMaterial.name = 'ISLAND_1_ASSEMBLY_RAW_EXCAVATION_WALL_MATERIAL';
  rawExcavationWallMaterial.side = THREE.BackSide;
  const rawExcavationWall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      ISLAND_1_ASSEMBLY_CRATER_RADIUS,
      ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS,
      ISLAND_1_ASSEMBLY_CRATER_DEPTH,
      radialSegments * 3,
      7,
      true,
    ),
    rawExcavationWallMaterial,
  );
  rawExcavationWall.name = 'ISLAND_1_ASSEMBLY_PROGRESSIVE_RAW_EXCAVATION_WALL';
  rawExcavationWall.receiveShadow = true;
  rawExcavation.add(rawExcavationWall);
  const rawExcavationFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(
      ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS,
      ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS,
      0.12,
      radialSegments * 3,
    ),
    cutawayStoneMaterial,
  );
  rawExcavationFloor.name = 'ISLAND_1_ASSEMBLY_PROGRESSIVE_RAW_EXCAVATION_FLOOR';
  rawExcavationFloor.receiveShadow = true;
  rawExcavation.add(rawExcavationFloor);
  root.add(rawExcavation);
  const foundationSectors = new THREE.InstancedMesh(
    foundationGeometry,
    materials.navy,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  foundationSectors.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_FOUNDATION_SECTORS';
  foundationSectors.receiveShadow = true;
  root.add(foundationSectors);

  const terraceDecks = megahallTierSpecs.map((tier, index) => {
    const geometry = new THREE.RingGeometry(
      tier.inner,
      tier.outer,
      radialSegments * 2,
      1,
      -segmentAngle * 0.44,
      segmentAngle * 0.88,
    );
    geometry.rotateX(-Math.PI / 2);
    const deck = new THREE.InstancedMesh(
      geometry,
      index % 2 === 0 ? materials.ivoryShade : materials.moonstone,
      ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
    );
    deck.name = `ISLAND_1_ASSEMBLY_COLOSSAL_DELEGATE_TERRACE_${index + 1}`;
    deck.castShadow = quality !== 'low';
    deck.receiveShadow = true;
    root.add(deck);
    return deck;
  });

  const lowerFoundationRim = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS, 0.18, 8, radialSegments * 3),
    materials.gold,
  );
  lowerFoundationRim.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_FOUNDATION_RIM';
  lowerFoundationRim.rotation.x = Math.PI / 2;
  lowerFoundationRim.position.y = chamberFloorY + 0.02;
  root.add(lowerFoundationRim);

  const upperVaultRing = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.08, 0.14, 8, radialSegments * 3),
    materials.gold,
  );
  upperVaultRing.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_VAULT_CROWN';
  upperVaultRing.rotation.x = Math.PI / 2;
  upperVaultRing.position.y = megahallTierSpecs[megahallTierSpecs.length - 1].y + 0.52;
  root.add(upperVaultRing);

  const surfaceTurfMaterial = materials.leaf.clone();
  surfaceTurfMaterial.name = 'ISLAND_1_ASSEMBLY_CRATER_GREEN_GRASS_CRUST';
  surfaceTurfMaterial.roughness = Math.max(0.86, surfaceTurfMaterial.roughness);
  const earthCover = new THREE.Group();
  earthCover.name = 'ISLAND_1_ASSEMBLY_CRATER_TWENTY_CONCENTRIC_GRASS_LAYERS';
  const earthCoverLayers = Array.from({ length: ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT }, (_, index) => {
    const innerRadius = index === 0
      ? 0.001
      : ISLAND_1_ASSEMBLY_CRATER_RADIUS * Math.sqrt(index / ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT);
    const outerRadius = ISLAND_1_ASSEMBLY_CRATER_RADIUS * Math.sqrt(
      (index + 1) / ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
    );
    const layer = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, outerRadius, radialSegments * 3, 1),
      surfaceTurfMaterial,
    );
    layer.name = `ISLAND_1_ASSEMBLY_GRASS_EXCAVATION_RING_${String(index + 1).padStart(2, '0')}`;
    layer.rotation.x = -Math.PI / 2;
    layer.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.012;
    layer.receiveShadow = true;
    earthCover.add(layer);
    return layer;
  });
  root.add(earthCover);

  const rowRadii = megahallTierSpecs.map((tier) => (tier.inner + tier.outer) / 2);
  const rowHeights = megahallTierSpecs.map((tier) => tier.y + 0.16);
  const seatGeometry = new THREE.BoxGeometry(0.72, 0.18, 0.42);
  const delegateSeats = new THREE.InstancedMesh(
    seatGeometry,
    materials.navy,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT * rowRadii.length,
  );
  delegateSeats.name = 'ISLAND_1_ASSEMBLY_CRATER_DELEGATE_SEATING';
  delegateSeats.castShadow = quality !== 'low';
  delegateSeats.receiveShadow = true;
  root.add(delegateSeats);

  const backGeometry = new THREE.BoxGeometry(0.72, 0.46, 0.09);
  const delegateSeatBacks = new THREE.InstancedMesh(
    backGeometry,
    materials.ivory,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT * rowRadii.length,
  );
  delegateSeatBacks.name = 'ISLAND_1_ASSEMBLY_CRATER_DELEGATE_SEAT_BACKS';
  delegateSeatBacks.castShadow = quality !== 'low';
  root.add(delegateSeatBacks);

  const aisleGeometry = new THREE.BoxGeometry(0.15, 0.055, aisleLength);
  const radialAisles = new THREE.InstancedMesh(
    aisleGeometry,
    materials.gold,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  radialAisles.name = 'ISLAND_1_ASSEMBLY_CRATER_RADIAL_AISLES';
  root.add(radialAisles);

  const buttressGeometry = new THREE.BoxGeometry(0.38, 3.28, 0.68);
  const vaultButtresses = new THREE.InstancedMesh(
    buttressGeometry,
    cutawayStoneMaterial,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  vaultButtresses.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_OUTER_BUTTRESSES';
  vaultButtresses.castShadow = quality !== 'low';
  vaultButtresses.receiveShadow = true;
  root.add(vaultButtresses);

  const buttressCaps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.52, 0.16, 0.82),
    materials.gold,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  buttressCaps.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_BUTTRESS_GOLD_CAPS';
  buttressCaps.castShadow = quality !== 'low';
  root.add(buttressCaps);

  const lampGeometry = new THREE.OctahedronGeometry(0.09, 0);
  const aisleLights = new THREE.InstancedMesh(
    lampGeometry,
    materials.warmGlow,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT * 2,
  );
  aisleLights.name = 'ISLAND_1_ASSEMBLY_CRATER_AISLE_LIGHTS';
  root.add(aisleLights);

  const podium = new THREE.Group();
  podium.name = 'ISLAND_1_ASSEMBLY_CRATER_SPEAKER_PODIUM';
  podium.position.y = chamberFloorY + 0.24;
  const podiumBase = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.08, 0.24, radialSegments), materials.ivory);
  podiumBase.position.y = -0.12;
  const podiumHalo = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 6, radialSegments * 2), materials.gold);
  podiumHalo.rotation.x = Math.PI / 2;
  const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.92, 0.52), materials.moonstone);
  lectern.position.set(0, 0.43, -0.08);
  lectern.rotation.x = -0.08;
  const lecternTop = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.11, 0.62), materials.gold);
  lecternTop.position.set(0, 0.9, -0.12);
  lecternTop.rotation.x = -0.16;
  const speakingLight = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), materials.warmGlow);
  speakingLight.position.set(0, 1.22, -0.18);
  podium.add(podiumBase, podiumHalo, lectern, lecternTop, speakingLight);
  root.add(podium);

  const missionHitTarget = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_1_ASSEMBLY_CRATER_RADIUS, ISLAND_1_ASSEMBLY_CRATER_RADIUS, 0.48, radialSegments),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false }),
  );
  missionHitTarget.name = 'ISLAND_1_ASSEMBLY_CRATER_MISSION_HIT_TARGET';
  missionHitTarget.position.y = 0.08;
  missionHitTarget.userData.signatureMissionId = 'first-light-assembly-crater';
  root.add(missionHitTarget);

  const rubbleCount = quality === 'high' ? 64 : quality === 'medium' ? 48 : 36;
  const rubbleGeometry = new THREE.DodecahedronGeometry(0.16, 0);
  const blastRubble = new THREE.InstancedMesh(rubbleGeometry, materials.ivoryShade, rubbleCount);
  blastRubble.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_RUBBLE';
  blastRubble.visible = false;
  root.add(blastRubble);

  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xb78b61,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const dustCount = quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
  const blastDust = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.34, 1),
    dustMaterial,
    dustCount,
  );
  blastDust.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_DUST_CLOUDS';
  blastDust.visible = false;
  root.add(blastDust);

  const sparkCount = quality === 'high' ? 40 : quality === 'medium' ? 28 : 18;
  const blastSparks = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.055, 0),
    materials.warmGlow,
    sparkCount,
  );
  blastSparks.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_SPARKS';
  blastSparks.visible = false;
  root.add(blastSparks);

  const blastShockwaveMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd27a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const blastShockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, Math.max(12, radialSegments * 2)),
    blastShockwaveMaterial,
  );
  blastShockwave.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_SHOCKWAVE';
  blastShockwave.rotation.x = -Math.PI / 2;
  blastShockwave.visible = false;
  root.add(blastShockwave);

  const pressureWaveMaterial = blastShockwaveMaterial.clone();
  pressureWaveMaterial.color.setHex(0x8be9ff);
  const pressureWave = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, Math.max(16, radialSegments * 2)),
    pressureWaveMaterial,
  );
  pressureWave.name = 'ISLAND_1_ASSEMBLY_CRATER_PRESSURE_WAVE';
  pressureWave.rotation.x = -Math.PI / 2;
  pressureWave.visible = false;
  root.add(pressureWave);

  const blastFlashMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff0a8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const blastFlash = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, quality === 'high' ? 1 : 0),
    blastFlashMaterial,
  );
  blastFlash.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_FLASH';
  blastFlash.visible = false;
  root.add(blastFlash);

  const blastCoreMaterial = blastFlashMaterial.clone();
  blastCoreMaterial.color.setHex(0xffffff);
  const blastCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, Math.max(10, radialSegments), Math.max(6, radialSegments / 2)),
    blastCoreMaterial,
  );
  blastCore.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_CORE';
  blastCore.visible = false;
  root.add(blastCore);

  const internalBlastFlashes = Array.from({ length: 3 }, (_, index) => {
    const material = blastFlashMaterial.clone();
    material.color.setHex(index === 1 ? 0xff9b4a : 0xffd36a);
    const flash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2 + index * 0.035, quality === 'high' ? 1 : 0),
      material,
    );
    flash.name = `ISLAND_1_ASSEMBLY_INTERNAL_DIGGING_BLAST_${index + 1}`;
    flash.visible = false;
    root.add(flash);
    return flash;
  });

  const blastLight = new THREE.PointLight(0xffd071, 0, 12, 2);
  blastLight.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_LIGHT';
  root.add(blastLight);

  let currentPresentation: Island1AssemblyCraterPresentation = {
    chargesDetonated: 0,
    targetCharges: ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
    completed: false,
    constructionSequence: 0,
  };
  let lastConstructionSequence = 0;
  let blastStartedAt = Number.NEGATIVE_INFINITY;
  let blastQueued = false;
  let assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
  let assemblyBuildQueued = false;
  let assemblyBuildProgress = 0;
  let lastAppliedAssemblyBuildProgress = Number.NEGATIVE_INFINITY;
  let excavationVisualProgress = 0;
  let excavationAnimationFromProgress = 0;
  let excavationAnimationToProgress = 0;
  let blastPresentation: Island1AssemblyBlastPresentation = {
    active: false,
    progress: 1,
    intensity: 0,
    cameraShake: 0,
    impactPosition: [0, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y, 0],
  };

  root.userData.undergroundAssemblyRadius = ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS;
  root.userData.surfaceIslandRadius = 6.25;
  root.userData.seatingTierCount = megahallTierSpecs.length;

  const updateExcavationVisuals = () => {
    const excavationProgress = THREE.MathUtils.clamp(excavationVisualProgress, 0, 1);
    // The first six charges break through the grass cap. The remaining fourteen
    // are therefore visibly spent widening and lowering the underground void,
    // instead of continuing to shave twenty cosmetic slices off the surface.
    const surfaceBreakProgress = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(excavationProgress / 0.3, 0, 1),
      0,
      1,
    );
    const surfaceLayerProgress = surfaceBreakProgress * ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT;
    const collapsedSurfaceLayers = Math.min(
      ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
      Math.floor(surfaceLayerProgress + 0.0001),
    );
    const activeLayerCollapse = surfaceLayerProgress - collapsedSurfaceLayers;
    const excavationRadiusProgress = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(0.18 + excavationProgress * 0.82, 0, 1),
      0,
      1,
    );
    const excavationDepthProgress = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(0.04 + excavationProgress * 0.96, 0, 1),
      0,
      1,
    );

    earthCoverLayers.forEach((layer, index) => {
      layer.visible = index >= collapsedSurfaceLayers;
      layer.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.012;
      layer.scale.setScalar(1);
      if (index === collapsedSurfaceLayers && activeLayerCollapse > 0) {
        const collapse = THREE.MathUtils.smoothstep(activeLayerCollapse, 0.28, 1);
        layer.position.y -= collapse * 0.24;
        layer.scale.setScalar(Math.max(0.02, 1 - collapse * 0.28));
      }
    });
    rawExcavation.visible = excavationProgress > 0 && assemblyBuildProgress < 1;
    rawExcavationWall.scale.set(
      Math.max(0.001, excavationRadiusProgress),
      Math.max(0.001, excavationDepthProgress),
      Math.max(0.001, excavationRadiusProgress),
    );
    rawExcavationWall.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y
      - ISLAND_1_ASSEMBLY_CRATER_DEPTH * excavationDepthProgress / 2;
    rawExcavationFloor.scale.set(
      Math.max(0.001, excavationRadiusProgress),
      1,
      Math.max(0.001, excavationRadiusProgress),
    );
    rawExcavationFloor.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y
      - ISLAND_1_ASSEMBLY_CRATER_DEPTH * excavationDepthProgress;
    root.userData.excavationVisualProgress = excavationProgress;
    root.userData.excavationDepthProgress = excavationDepthProgress;
  };

  const updateInstances = () => {
    const target = Math.max(1, Math.floor(currentPresentation.targetCharges));
    const detonated = clampChargeCount(currentPresentation.chargesDetonated, target);
    const hiddenScale = new THREE.Vector3(0.0001, 0.0001, 0.0001);
    const buildProgress = currentPresentation.completed ? assemblyBuildProgress : 0;
    const reveal = (start: number, duration: number) => THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp((buildProgress - start) / duration, 0, 1),
      0,
      1,
    );
    const foundationProgress = reveal(0, 0.2);
    const aisleProgress = reveal(0.32, 0.28);
    const buttressProgress = reveal(0.56, 0.28);
    const capProgress = reveal(0.72, 0.18);
    updateExcavationVisuals();

    for (let sector = 0; sector < ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT; sector += 1) {
      const angle = sector * segmentAngle;
      const open = sector < detonated;
      setInstanceTransform(
        foundationSectors,
        sector,
        new THREE.Vector3(0, chamberFloorY, 0),
        angle,
        open && foundationProgress > 0
          ? new THREE.Vector3(foundationProgress, foundationProgress, foundationProgress)
          : hiddenScale,
        dummy,
      );
      terraceDecks.forEach((deck, tierIndex) => {
        const tierProgress = reveal(0.12 + tierIndex * 0.075, 0.24);
        setInstanceTransform(
          deck,
          sector,
          new THREE.Vector3(0, megahallTierSpecs[tierIndex].y, 0),
          angle,
          open && tierProgress > 0
            ? new THREE.Vector3(tierProgress, tierProgress, tierProgress)
            : hiddenScale,
          dummy,
        );
      });
      setInstanceTransform(
        radialAisles,
        sector,
        new THREE.Vector3(
          Math.sin(angle) * aisleCenterRadius,
          chamberFloorY + 1.48,
          Math.cos(angle) * aisleCenterRadius,
        ),
        angle,
        open && aisleProgress > 0 ? new THREE.Vector3(1, 1, aisleProgress) : hiddenScale,
        dummy,
      );
      rowRadii.forEach((radius, row) => {
        const seatProgress = reveal(0.28 + row * 0.065, 0.2);
        const seatIndex = sector * rowRadii.length + row;
        const seatPosition = new THREE.Vector3(Math.sin(angle) * radius, rowHeights[row], Math.cos(angle) * radius);
        const seatScale = open && seatProgress > 0
          ? new THREE.Vector3(seatProgress, seatProgress, seatProgress)
          : hiddenScale;
        setInstanceTransform(delegateSeats, seatIndex, seatPosition, angle, seatScale, dummy);
        const backPosition = seatPosition.clone().add(new THREE.Vector3(Math.sin(angle) * 0.2, 0.28, Math.cos(angle) * 0.2));
        setInstanceTransform(delegateSeatBacks, seatIndex, backPosition, angle, seatScale, dummy);
      });
      [1.04, ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.32].forEach((radius, lampIndex) => {
        setInstanceTransform(
          aisleLights,
          sector * 2 + lampIndex,
          new THREE.Vector3(
            Math.sin(angle) * radius,
            lampIndex === 0 ? chamberFloorY + 0.48 : megahallTierSpecs[6].y + 0.62,
            Math.cos(angle) * radius,
          ),
          angle,
          open && capProgress > 0
            ? new THREE.Vector3(capProgress, capProgress, capProgress)
            : hiddenScale,
          dummy,
        );
      });
      setInstanceTransform(
        vaultButtresses,
        sector,
        new THREE.Vector3(
          Math.sin(angle) * (ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.18),
          chamberFloorY + 1.64 * buttressProgress,
          Math.cos(angle) * (ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.18),
        ),
        angle,
        open && buttressProgress > 0
          ? new THREE.Vector3(1, buttressProgress, 1)
          : hiddenScale,
        dummy,
      );
      setInstanceTransform(
        buttressCaps,
        sector,
        new THREE.Vector3(
          Math.sin(angle) * (ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.18),
          chamberFloorY + 3.24,
          Math.cos(angle) * (ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS - 0.18),
        ),
        angle,
        open && capProgress > 0
          ? new THREE.Vector3(capProgress, capProgress, capProgress)
          : hiddenScale,
        dummy,
      );
    }
    [
      foundationSectors,
      ...terraceDecks,
      delegateSeats,
      delegateSeatBacks,
      radialAisles,
      aisleLights,
      vaultButtresses,
      buttressCaps,
    ].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    const foundationRimProgress = reveal(0.08, 0.22);
    lowerFoundationRim.visible = foundationRimProgress > 0;
    lowerFoundationRim.scale.setScalar(Math.max(0.001, foundationRimProgress));
    const vaultProgress = reveal(0.7, 0.22);
    upperVaultRing.visible = vaultProgress > 0;
    upperVaultRing.scale.setScalar(Math.max(0.001, vaultProgress));
    const podiumProgress = reveal(0.82, 0.18);
    podium.visible = podiumProgress > 0;
    podium.scale.setScalar(Math.max(0.001, podiumProgress));
    lastAppliedAssemblyBuildProgress = buildProgress;
  };

  const updateAssemblyCrater = (presentation: Island1AssemblyCraterPresentation, immediate = false) => {
    const previousExcavationTarget = excavationAnimationToProgress;
    currentPresentation = {
      ...presentation,
      chargesDetonated: clampChargeCount(presentation.chargesDetonated, ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT),
      targetCharges: ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
    };
    const sequence = Math.max(0, Math.floor(presentation.constructionSequence ?? 0));
    // The renderer supplies elapsed seconds from its own animation timer. Queue
    // the beat here and capture that same clock on the next animation frame;
    // performance.now() has a different origin and would leave the blast at a
    // permanently negative age after a committed detonation.
    const hasNewCommittedBlast = sequence > lastConstructionSequence;
    const nextExcavationTarget = currentPresentation.chargesDetonated / ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT;
    if (!immediate && hasNewCommittedBlast) {
      blastQueued = true;
      excavationAnimationFromProgress = Math.min(excavationVisualProgress, previousExcavationTarget);
      excavationAnimationToProgress = nextExcavationTarget;
    }
    if (
      !immediate
      && hasNewCommittedBlast
      && currentPresentation.completed
      && currentPresentation.chargesDetonated >= ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT
    ) {
      assemblyBuildProgress = 0;
      assemblyBuildQueued = true;
      assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
    }
    if (immediate) {
      blastQueued = false;
      blastStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildProgress = currentPresentation.completed ? 1 : 0;
      excavationVisualProgress = nextExcavationTarget;
      excavationAnimationFromProgress = nextExcavationTarget;
      excavationAnimationToProgress = nextExcavationTarget;
      blastPresentation = {
        active: false,
        progress: 1,
        intensity: 0,
        cameraShake: 0,
        impactPosition: [0, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y, 0],
      };
    } else if (!hasNewCommittedBlast) {
      excavationVisualProgress = nextExcavationTarget;
      excavationAnimationFromProgress = nextExcavationTarget;
      excavationAnimationToProgress = nextExcavationTarget;
    }
    if (!currentPresentation.completed) {
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildProgress = 0;
    }
    lastConstructionSequence = Math.max(lastConstructionSequence, sequence);
    updateInstances();
  };

  const animate = (elapsed: number) => {
    if (blastQueued) {
      blastQueued = false;
      blastStartedAt = elapsed;
    }
    if (assemblyBuildQueued) {
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = elapsed + ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS;
    }
    if (currentPresentation.completed && Number.isFinite(assemblyBuildStartedAt)) {
      const nextBuildProgress = THREE.MathUtils.clamp(
        (elapsed - assemblyBuildStartedAt) / ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS,
        0,
        1,
      );
      if (Math.abs(nextBuildProgress - lastAppliedAssemblyBuildProgress) >= 0.002 || nextBuildProgress === 1) {
        assemblyBuildProgress = nextBuildProgress;
        updateInstances();
      }
    }
    materials.warmGlow.emissiveIntensity = 1.02 + Math.sin(elapsed * 1.8) * 0.18;
    speakingLight.rotation.y = elapsed * 0.45;
    const blastAge = elapsed - blastStartedAt;
    const activeBlast = blastAge >= 0 && blastAge < ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS;
    blastRubble.visible = activeBlast;
    blastDust.visible = activeBlast;
    blastSparks.visible = activeBlast;
    blastShockwave.visible = activeBlast;
    pressureWave.visible = activeBlast;
    blastFlash.visible = activeBlast;
    blastCore.visible = activeBlast;
    if (activeBlast) {
      const detonated = clampChargeCount(currentPresentation.chargesDetonated, 20);
      const chargeIndex = Math.max(0, detonated - 1);
      const angle = chargeIndex * Math.PI * (3 - Math.sqrt(5));
      const excavationSpread = Math.sqrt(chargeIndex / Math.max(1, ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT - 1));
      const internalDigProgress = THREE.MathUtils.smoothstep(
        THREE.MathUtils.clamp((chargeIndex - 2) / 17, 0, 1),
        0,
        1,
      );
      const impactRadius = THREE.MathUtils.lerp(
        ISLAND_1_ASSEMBLY_CRATER_RADIUS * (0.1 + excavationSpread * 0.72),
        ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS * (0.3 + excavationSpread * 0.42),
        internalDigProgress,
      );
      const milestoneBoost = detonated % 5 === 0 ? 0.24 : 0;
      const finalBoost = detonated === ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT ? 0.38 : 0;
      const intensity = 1 + excavationSpread * 0.42 + milestoneBoost + finalBoost;
      const progress = Math.min(1, blastAge / ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS);
      const excavationBeat = THREE.MathUtils.smoothstep(
        THREE.MathUtils.clamp((progress - 0.1) / 0.76, 0, 1),
        0,
        1,
      );
      excavationVisualProgress = THREE.MathUtils.lerp(
        excavationAnimationFromProgress,
        excavationAnimationToProgress,
        excavationBeat,
      );
      updateExcavationVisuals();
      const impactPosition = new THREE.Vector3(
        Math.sin(angle) * impactRadius,
        ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.1
          - ISLAND_1_ASSEMBLY_CRATER_DEPTH * internalDigProgress * 0.82,
        Math.cos(angle) * impactRadius,
      );
      const ventPosition = new THREE.Vector3(
        Math.sin(angle) * Math.min(impactRadius, ISLAND_1_ASSEMBLY_CRATER_RADIUS * 0.62),
        ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.09,
        Math.cos(angle) * Math.min(impactRadius, ISLAND_1_ASSEMBLY_CRATER_RADIUS * 0.62),
      );
      const flashEnvelope = Math.max(0, 1 - progress / 0.34);
      const debrisProgress = THREE.MathUtils.clamp(progress / 0.82, 0, 1);
      const dustProgress = THREE.MathUtils.clamp((progress - 0.08) / 0.92, 0, 1);
      blastShockwave.position.copy(ventPosition);
      blastShockwave.scale.setScalar(0.72 + progress * (5.4 + intensity * 1.4));
      blastShockwaveMaterial.opacity = Math.max(0, 0.82 * (1 - progress) * Math.min(1.4, intensity));
      pressureWave.position.copy(ventPosition).setY(ventPosition.y + 0.04);
      pressureWave.scale.setScalar(0.4 + Math.max(0, progress - 0.08) * (8.2 + intensity * 2.2));
      pressureWaveMaterial.opacity = Math.max(0, (progress - 0.04) * 2.8) * (1 - progress) * 0.62;
      blastFlash.position.copy(impactPosition).setY(impactPosition.y + Math.sin(progress * Math.PI) * 0.52);
      blastFlash.scale.setScalar(0.85 + Math.sin(Math.min(1, progress * 3) * Math.PI) * (2.4 + intensity));
      blastFlashMaterial.opacity = flashEnvelope * 0.96;
      blastCore.position.copy(impactPosition).setY(impactPosition.y + 0.18);
      blastCore.scale.setScalar(0.45 + flashEnvelope * (2.1 + intensity * 0.5));
      blastCoreMaterial.opacity = flashEnvelope;
      blastLight.position.copy(impactPosition).setY(impactPosition.y + 0.6);
      blastLight.intensity = flashEnvelope * 18 * intensity;
      blastLight.distance = 10 + intensity * 3;

      const internalPulseCount = detonated >= 16 ? 3 : detonated >= 11 ? 2 : detonated >= 6 ? 1 : 0;
      let internalShake = 0;
      internalBlastFlashes.forEach((flash, index) => {
        const pulseProgress = THREE.MathUtils.clamp(
          (progress - (0.24 + index * 0.19)) / 0.22,
          0,
          1,
        );
        const pulseEnvelope = index < internalPulseCount ? Math.sin(pulseProgress * Math.PI) : 0;
        flash.visible = pulseEnvelope > 0.001;
        if (!flash.visible) return;
        const pulseAngle = angle + (index - 1) * 0.72 + chargeIndex * 0.17;
        const pulseRadius = Math.max(
          ISLAND_1_ASSEMBLY_CRATER_RADIUS * 0.34,
          impactRadius * (0.72 + index * 0.12),
        );
        flash.position.set(
          Math.sin(pulseAngle) * pulseRadius,
          impactPosition.y + 0.34 - index * 0.24,
          Math.cos(pulseAngle) * pulseRadius,
        );
        flash.scale.setScalar(0.45 + pulseEnvelope * (2.1 + internalDigProgress * 1.25));
        (flash.material as THREE.MeshBasicMaterial).opacity = pulseEnvelope * 0.92;
        internalShake = Math.max(internalShake, pulseEnvelope * (0.12 + internalDigProgress * 0.14));
      });
      for (let index = 0; index < blastRubble.count; index += 1) {
        const scatter = (index / blastRubble.count - 0.5) * segmentAngle * 2.2;
        const travel = debrisProgress * (1.5 + (index % 7) * 0.34) * Math.min(2.2, intensity);
        const rubbleAngle = angle + scatter;
        dummy.position.set(
          impactPosition.x + Math.sin(rubbleAngle) * travel,
          impactPosition.y + Math.sin(debrisProgress * Math.PI) * (1.15 + (index % 5) * 0.32) * intensity - debrisProgress * debrisProgress * 0.74,
          impactPosition.z + Math.cos(rubbleAngle) * travel,
        );
        dummy.rotation.set(debrisProgress * index * 1.4, rubbleAngle, debrisProgress * index * 0.9);
        dummy.scale.setScalar((0.62 + (index % 5) * 0.15) * Math.max(0.16, 1 - debrisProgress * 0.72));
        dummy.updateMatrix();
        blastRubble.setMatrixAt(index, dummy.matrix);
      }
      blastRubble.instanceMatrix.needsUpdate = true;
      for (let index = 0; index < blastDust.count; index += 1) {
        const dustAngle = angle + (index / blastDust.count - 0.5) * segmentAngle * 3.4;
        const travel = dustProgress * (0.72 + (index % 4) * 0.32) * intensity;
        const ventRise = Math.max(0, ventPosition.y - impactPosition.y) * dustProgress;
        dummy.position.set(
          impactPosition.x + Math.sin(dustAngle) * travel,
          impactPosition.y + ventRise + 0.08
            + Math.sin(dustProgress * Math.PI) * (0.34 + (index % 3) * 0.16),
          impactPosition.z + Math.cos(dustAngle) * travel,
        );
        dummy.rotation.set(0, dustAngle, 0);
        dummy.scale.setScalar(0.2 + dustProgress * (1.8 + (index % 5) * 0.25) * intensity);
        dummy.updateMatrix();
        blastDust.setMatrixAt(index, dummy.matrix);
      }
      dustMaterial.opacity = Math.max(0, (1 - dustProgress) * 0.46);
      blastDust.instanceMatrix.needsUpdate = true;
      for (let index = 0; index < blastSparks.count; index += 1) {
        const sparkAngle = angle + index * 2.399963;
        const travel = debrisProgress * (0.9 + (index % 6) * 0.24) * intensity;
        dummy.position.set(
          impactPosition.x + Math.sin(sparkAngle) * travel,
          impactPosition.y + Math.sin(debrisProgress * Math.PI) * (0.8 + (index % 4) * 0.25),
          impactPosition.z + Math.cos(sparkAngle) * travel,
        );
        dummy.rotation.set(debrisProgress * index, sparkAngle, debrisProgress * index * 1.7);
        dummy.scale.setScalar(Math.max(0.05, (1 - debrisProgress) * (0.9 + (index % 3) * 0.3)));
        dummy.updateMatrix();
        blastSparks.setMatrixAt(index, dummy.matrix);
      }
      blastSparks.instanceMatrix.needsUpdate = true;
      const cameraShake = Math.exp(-progress * 4.4)
        * (0.28 + Math.abs(Math.sin(progress * 88)) * 0.72)
        * 0.26
        * intensity
        + internalShake;
      blastPresentation = {
        active: true,
        progress,
        intensity,
        cameraShake,
        impactPosition: [impactPosition.x, impactPosition.y, impactPosition.z],
      };
    } else {
      if (Number.isFinite(blastStartedAt)) {
        excavationVisualProgress = excavationAnimationToProgress;
        updateExcavationVisuals();
      }
      blastShockwaveMaterial.opacity = 0;
      pressureWaveMaterial.opacity = 0;
      blastFlashMaterial.opacity = 0;
      blastCoreMaterial.opacity = 0;
      dustMaterial.opacity = 0;
      blastLight.intensity = 0;
      internalBlastFlashes.forEach((flash) => {
        flash.visible = false;
        (flash.material as THREE.MeshBasicMaterial).opacity = 0;
      });
      blastPresentation = {
        active: false,
        progress: 1,
        intensity: 0,
        cameraShake: 0,
        impactPosition: blastPresentation.impactPosition,
      };
    }
  };

  updateAssemblyCrater(currentPresentation, true);
  scene.add(root);
  return {
    root,
    animate,
    updateAssemblyCrater,
    setInspectionCutaway: (active) => {
      inspectionCutawayContext.visible = active;
    },
    getBlastPresentation: () => blastPresentation,
    getConstructionPresentation: () => ({
      active: currentPresentation.completed && assemblyBuildProgress < 1,
      progress: assemblyBuildProgress,
      completed: currentPresentation.completed && assemblyBuildProgress >= 1,
    }),
  };
}
