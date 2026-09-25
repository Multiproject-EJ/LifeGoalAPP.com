import * as THREE from 'three';
import { ASSEMBLY_CAVITY_DEPTH } from './Island1AssemblyLayout';
import { createIsland001V2Terrain } from './Island1V2Terrain';
import { createIsland001V2Asset, getIsland001V2LandmarkYaw } from './Island1V2Assets';
import { createAssemblyHeroCoast } from './Island1AssemblyCoast';
import { createAssemblyLandmarkAccess } from './Island1AssemblyAccess';
import { createAssemblyVault } from './Island1AssemblyVault';
import { createAssemblyDiplomaticHall } from './Island1AssemblyDiplomaticHall';
import {
  createIsland1AssemblyMarina,
  ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS,
  type Island1MarinaPresentation,
} from './Island1AssemblyMarina';
import { FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET } from '../services/islandRunSignatureMissions';
import type { Island3DQuality, Island5LandmarkDefinition } from './island5ThreePilotContract';
import {
  buildIsland1Landmark,
  ISLAND_1_OCEAN_SURFACE_Y,
  type Island1LandmarkBuildOptions,
  type Island1WorldMaterials,
} from './Island1ThreeWorld';

export const ISLAND_1_ASSEMBLY_CRATER_NAME = 'Assembly Crater';
export const ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT = 20;
export const ISLAND_1_ASSEMBLY_CRATER_RADIUS = 2.72;
export const ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y = 0.26;
export const ISLAND_1_ASSEMBLY_CRATER_DEPTH = ASSEMBLY_CAVITY_DEPTH;
// The hall should feel implausibly capacious without overwhelming the island's
// silhouette: 6.95 is only about 11% wider than the 6.25-unit surface crown.
export const ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS = 6.95;
export const ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS = 5.2;
export const ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS = 8;

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
  setMarinaProgress: (progress: number) => void;
  replayMarina: () => void;
  endMarinaMeeting: () => void;
  getBlastPresentation: () => Island1AssemblyBlastPresentation;
  getConstructionPresentation: () => Island1AssemblyConstructionPresentation;
  getMarinaPresentation: () => Island1MarinaPresentation;
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
  if (definition.id !== 'boss' && level === 0) {
    const root = new THREE.Group(); root.name = `ISLAND_001_${definition.id}_CIVIC_BUILD_PLOT`; root.position.set(...definition.position);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.48, .06, 32), new THREE.MeshStandardMaterial({ color: 0xcfc3a5, roughness: .8 }));
    pad.position.y = .10; root.add(pad); root.traverse(node => { node.userData.landmarkId = definition.id; }); return root;
  }
  if (definition.id !== 'boss' && level > 0) {
    const model = createIsland001V2Asset(definition.id, level as 1|2|3, Boolean(options.constructionPreview));
    if (model) {
      const root = new THREE.Group(); root.name = `ISLAND_001_V2_${definition.id.toUpperCase()}_ROOT`; root.position.set(...definition.position);
      model.rotation.y = getIsland001V2LandmarkYaw(definition.id); root.add(model);
      root.traverse(child => { child.userData.landmarkId = definition.id; });
      return root;
    }
  }
  if (definition.id !== 'boss') {
    const landmark = buildIsland1Landmark(definition, level, quality, materials, options);
    if (level > 0) {
      const detail = new THREE.Group();
      detail.name = `ISLAND_001_${definition.id}_CIVIC_FORECOURT_L${level}`;
      const count = level === 3 ? 8 : level === 2 ? 6 : 4;
      const plinths = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.075, 0.18, 6), materials.gold, count);
      const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 4), materials.warmGlow, count);
      const transform = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const angle = i / 8 * Math.PI * 2;
        transform.position.set(Math.sin(angle) * 1.38, 0.23, Math.cos(angle) * 1.38);
        transform.updateMatrix();
        plinths.setMatrixAt(i, transform.matrix);
        transform.position.y = 0.36;
        transform.updateMatrix();
        lamps.setMatrixAt(i, transform.matrix);
      }
      plinths.name = 'CIVIC_FORECOURT_BRASS_LANTERNS';
      lamps.name = 'CIVIC_FORECOURT_WARM_LIGHTS';
      detail.add(plinths, lamps);
      detail.traverse((child) => { child.userData.landmarkId = definition.id; });
      landmark.add(detail);
    }
    return landmark;
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

  root.add(createIsland001V2Terrain(quality));

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

  const rockDepth = .42; // Short finished oculus collar; the excavation owns its deep wall.
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
    new THREE.TorusGeometry(ISLAND_1_ASSEMBLY_CRATER_RADIUS, 0.022, 6, segments),
    materials.rim,
  );
  rim.name = 'ISLAND_1_ASSEMBLY_CRATER_PROTECTED_ROUTE_RIM';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y + 0.035;
  root.add(rim);
  const coping = new THREE.Mesh(new THREE.RingGeometry(2.72, 2.92, segments), new THREE.MeshStandardMaterial({ color: 0xdaceb0, roughness: .7 }));
  coping.rotation.x = -Math.PI / 2; coping.position.y = .283; root.add(coping);

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

  const heroCoast = createAssemblyHeroCoast(quality, materials);
  root.add(heroCoast.root);

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
  const cutawayStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x827b68, roughness: 0.96 });
  cutawayStoneMaterial.name = 'ISLAND_1_ASSEMBLY_CUTAWAY_DEEP_STONE_MATERIAL';
  inspectionCutawayContext.add(createIsland001V2Terrain(quality, true));

  const cutFaceWidth = (6.25 - ISLAND_1_ASSEMBLY_CRATER_RADIUS) / 2;
  const cutFaceCenter = ISLAND_1_ASSEMBLY_CRATER_RADIUS + cutFaceWidth;
  [-1, 1].forEach((side) => {
    const stoneFace = new THREE.Mesh(
      new THREE.BoxGeometry(cutFaceWidth * 2, 3.62, 0.2),
      cutawayStoneMaterial,
    );
    stoneFace.name = `ISLAND_1_ASSEMBLY_CUT_FACE_STONE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    stoneFace.position.set(side * cutFaceCenter, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - 1.81, 0);
    stoneFace.rotation.y = 0;
    stoneFace.receiveShadow = true;
    stoneFace.visible = false; // Superseded by the thin carved vault section.
    inspectionCutawayContext.add(stoneFace);
    // Exposed excavation face: broken strata, not a smooth architectural wall.
    const strata = new THREE.Group();
    strata.name = `ISLAND_001_EXPOSED_GEOLOGY_${side}`;
    strata.position.copy(stoneFace.position);
    strata.rotation.copy(stoneFace.rotation);
    const geologyMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xaca18a, roughness: 0.98 }),
      new THREE.MeshStandardMaterial({ color: 0x8f846e, roughness: 0.97 }),
      new THREE.MeshStandardMaterial({ color: 0xc1b391, roughness: 0.94 }),
    ];
    const stoneDummy = new THREE.Object3D();
    geologyMaterials.forEach((material, band) => {
      const seamGeometry = new THREE.BoxGeometry(cutFaceWidth * 2, 1, 1, 24, 1, 1);
      const seamVertices = seamGeometry.attributes.position;
      for (let vertex = 0; vertex < seamVertices.count; vertex++) {
        const x = seamVertices.getX(vertex);
        seamVertices.setY(vertex, seamVertices.getY(vertex)
          + Math.sin(x * 4.1 + band + side) * 0.1
          + Math.sin(x * 11.3 + band * 2) * 0.045);
      }
      seamGeometry.computeVertexNormals();
      const pieces = new THREE.InstancedMesh(seamGeometry, material, 3);
      pieces.name = `EXCAVATION_STRATA_${side}_${band}`;
      pieces.receiveShadow = true;
      for (let i = 0; i < 3; i++) {
        const row = i * 3 + band;
        stoneDummy.position.set(0, -1.55 + row * 0.35, 0.12 + i * 0.009);
        stoneDummy.rotation.set(0, 0, 0);
        stoneDummy.scale.set(1, band === 2 ? 0.18 : 0.31, 0.06 + i * 0.025);
        stoneDummy.updateMatrix();
        pieces.setMatrixAt(i, stoneDummy.matrix);
      }
      strata.add(pieces);
    });
    strata.visible = false;
    inspectionCutawayContext.add(strata);

    const soilFace = new THREE.Mesh(
      new THREE.BoxGeometry(cutFaceWidth * 2, 0.34, 0.215),
      cutawaySoilMaterial,
    );
    soilFace.name = `ISLAND_1_ASSEMBLY_CUT_FACE_SOIL_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    soilFace.position.set(side * cutFaceCenter, ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y - 0.17, 0.005);
    soilFace.rotation.y = 0;
    soilFace.visible = false;
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
    1.18,
    5,
    1,
    -segmentAngle * 0.5,
    segmentAngle * 1.005,
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
  const rawShoulder=new THREE.Mesh(new THREE.RingGeometry(.001,ISLAND_1_ASSEMBLY_CRATER_RADIUS,72),rawExcavationWallMaterial.clone());
  (rawShoulder.material as THREE.Material).side=THREE.DoubleSide;
  rawShoulder.name='ISLAND_001_RAW_EXCAVATION_ROCK_SHOULDER';rawShoulder.rotation.x=-Math.PI/2;rawShoulder.position.y=ISLAND_1_ASSEMBLY_CRATER_SURFACE_Y-.035;rawExcavation.add(rawShoulder);
  const shoulderVertices=rawShoulder.geometry.attributes.position as THREE.BufferAttribute;

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
    materials.ivoryShade,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  foundationSectors.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_FOUNDATION_SECTORS';
  foundationSectors.receiveShadow = true;
  root.add(foundationSectors);

  const terraceDecks = megahallTierSpecs.map((tier, index) => {
    const geometry = new THREE.RingGeometry(
      tier.inner,
      tier.outer,
      5,
      1,
      -segmentAngle * 0.5,
      segmentAngle * 1.005,
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

  const vault = createAssemblyVault(chamberFloorY); root.add(vault.root);
  const diplomaticHall = createAssemblyDiplomaticHall(materials, chamberFloorY);
  root.add(diplomaticHall.root);
  const landmarkAccess = createAssemblyLandmarkAccess(materials, chamberFloorY);
  root.add(landmarkAccess.root);
  const marina = createIsland1AssemblyMarina(quality, materials);
  root.add(marina.root);

  const aisleGeometry = new THREE.BoxGeometry(0.15, 0.055, aisleLength);
  const radialAisles = new THREE.InstancedMesh(
    aisleGeometry,
    materials.gold,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  radialAisles.name = 'ISLAND_1_ASSEMBLY_CRATER_RADIAL_AISLES';
  radialAisles.visible = false;
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
  vaultButtresses.visible=false; root.add(vaultButtresses);

  const buttressCaps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.52, 0.16, 0.82),
    materials.gold,
    ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT,
  );
  buttressCaps.name = 'ISLAND_1_ASSEMBLY_COLOSSAL_BUTTRESS_GOLD_CAPS';
  buttressCaps.castShadow = quality !== 'low';
  buttressCaps.visible=false; root.add(buttressCaps);

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
  const speakingLight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.035), materials.warmGlow);
  speakingLight.position.set(0, 0.99, -0.28);
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

  const dustMaterial = new THREE.MeshStandardMaterial({
    color: 0xb78b61,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const dustCount = quality === 'high' ? 64 : quality === 'medium' ? 44 : 28;
  const blastDust = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.34, 1),
    dustMaterial,
    dustCount,
  );
  blastDust.name = 'ISLAND_1_ASSEMBLY_CRATER_BLAST_DUST_CLOUDS';
  blastDust.visible = false;
  root.add(blastDust);

  const splashMaterial = new THREE.MeshBasicMaterial({ color: 0xc8f4ef, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const waterImpacts = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.035, 4, 20), splashMaterial, 12);
  waterImpacts.name = 'ISLAND_1_ASSEMBLY_SEA_IMPACTS';
  waterImpacts.frustumCulled = false;
  root.add(waterImpacts);
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
    targetCharges: FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
    completed: false,
    constructionSequence: 0,
  };
  let lastConstructionSequence = 0;
  let lastAnimationElapsed = 0;
  let blastStartedAt = Number.NEGATIVE_INFINITY;
  let blastQueued = false;
  let assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
  let assemblyBuildQueued = false;
  let assemblyBuildProgress = 0;
  let lastAppliedAssemblyBuildProgress = Number.NEGATIVE_INFINITY;
  let marinaStartedAt = Number.NEGATIVE_INFINITY;
  let marinaBuildQueued = false;
  let marinaProgress = 0;
  let marinaManualProgress: number | null = null;
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
    // The first batch breaches the cap; the second removes most of the void.
    // Twenty mesh bands are geological detail, independent of charge count.
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
    rawExcavation.visible = excavationProgress > 0 && assemblyBuildProgress <= 0;
    const mouth=ISLAND_1_ASSEMBLY_CRATER_RADIUS*excavationRadiusProgress;
    for(let i=0;i<73;i++){const a=i/72*Math.PI*2;shoulderVertices.setXY(i,Math.cos(a)*mouth,Math.sin(a)*mouth);}
    shoulderVertices.needsUpdate=true;

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
      const open = currentPresentation.completed;
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
          open && Math.sin(angle) < 0.61 && tierProgress > 0
            ? new THREE.Vector3(tierProgress, tierProgress, tierProgress)
            : hiddenScale,
          dummy,
        );
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
      aisleLights,
      vaultButtresses,
      buttressCaps,
    ].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    const foundationRimProgress = reveal(0.08, 0.22);
    lowerFoundationRim.visible = false;
    lowerFoundationRim.scale.setScalar(Math.max(0.001, foundationRimProgress));
    const vaultProgress = reveal(0.7, 0.22);
    upperVaultRing.visible = false;
    upperVaultRing.scale.setScalar(Math.max(0.001, vaultProgress));
    const podiumProgress = reveal(0.82, 0.18);
    podium.visible = podiumProgress > 0;
    podium.scale.setScalar(Math.max(0.001, podiumProgress));
    lastAppliedAssemblyBuildProgress = buildProgress;
  };

  const updateAssemblyCrater = (presentation: Island1AssemblyCraterPresentation, immediate = false) => {
    const previousExcavationTarget = excavationAnimationToProgress;
    const previousPresentation = currentPresentation;
    currentPresentation = {
      ...presentation,
      chargesDetonated: clampChargeCount(presentation.chargesDetonated, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET),
      targetCharges: FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
    };
    const sequence = Math.max(0, Math.floor(presentation.constructionSequence ?? 0));
    const rewinding = currentPresentation.chargesDetonated < previousPresentation.chargesDetonated;
    immediate = immediate || rewinding || (sequence === 0 && currentPresentation.completed);
    // The renderer supplies elapsed seconds from its own animation timer. Queue
    // the beat here and capture that same clock on the next animation frame;
    // performance.now() has a different origin and would leave the blast at a
    // permanently negative age after a committed detonation.
    const hasNewCommittedBlast = sequence > lastConstructionSequence;
    const used = currentPresentation.chargesDetonated;
    const nextExcavationTarget = used >= 10 ? 1 : used >= 8 ? 0.92 : used >= 3 ? 0.24 : 0;
    if (!immediate && hasNewCommittedBlast) {
      blastQueued = true;
      excavationAnimationFromProgress = Math.min(excavationVisualProgress, previousExcavationTarget);
      excavationAnimationToProgress = nextExcavationTarget;
    }
    if (
      !immediate
      && (hasNewCommittedBlast || !previousPresentation.completed)
      && currentPresentation.completed
      && currentPresentation.chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET
    ) {
      assemblyBuildProgress = 0;
      assemblyBuildQueued = blastQueued;
      assemblyBuildStartedAt = blastQueued
        ? Number.NEGATIVE_INFINITY
        : Math.max(lastAnimationElapsed, blastStartedAt + ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS);
      marinaProgress = 0;
      marinaManualProgress = null;
      marinaBuildQueued = blastQueued;
      marinaStartedAt = blastQueued
        ? Number.NEGATIVE_INFINITY
        : assemblyBuildStartedAt + ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS;
    }
    if (immediate) {
      [blastRubble, blastDust, blastSparks, blastShockwave, pressureWave, blastFlash, blastCore, waterImpacts, ...internalBlastFlashes]
        .forEach(effect => { effect.visible = false; });
      blastLight.intensity = 0;
      blastQueued = false;
      blastStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildProgress = currentPresentation.completed ? 1 : 0;
      marinaBuildQueued = false;
      marinaStartedAt = Number.NEGATIVE_INFINITY;
      marinaManualProgress = currentPresentation.completed ? 1 : 0;
      marinaProgress = currentPresentation.completed ? 1 : 0;
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
    } else if (!hasNewCommittedBlast && !blastQueued
      && lastAnimationElapsed - blastStartedAt >= ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS) {
      excavationVisualProgress = nextExcavationTarget;
      excavationAnimationFromProgress = nextExcavationTarget;
      excavationAnimationToProgress = nextExcavationTarget;
    }
    if (!currentPresentation.completed) {
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = Number.NEGATIVE_INFINITY;
      assemblyBuildProgress = 0;
      marinaBuildQueued = false;
      marinaStartedAt = Number.NEGATIVE_INFINITY;
      marinaManualProgress = 0;
      marinaProgress = 0;
    }
    lastConstructionSequence = immediate ? sequence : Math.max(lastConstructionSequence, sequence);
    updateInstances();
    vault.update(assemblyBuildProgress);
    diplomaticHall.update(assemblyBuildProgress, 0);
    landmarkAccess.update(assemblyBuildProgress, 0);
    marina.update(marinaProgress, 0);
    const admission=marina.getPresentation();
    heroCoast.animate(0,admission.waterfallFlow,admission.waterfallDraining);
  };

  const animate = (elapsed: number) => {
    lastAnimationElapsed = elapsed;
    if (blastQueued) {
      blastQueued = false;
      blastStartedAt = elapsed;
    }
    if (assemblyBuildQueued) {
      assemblyBuildQueued = false;
      assemblyBuildStartedAt = elapsed + ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS;
      marinaBuildQueued = true;
    }
    if (marinaBuildQueued && Number.isFinite(assemblyBuildStartedAt)) {
      marinaBuildQueued = false;
      marinaStartedAt = assemblyBuildStartedAt + ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS;
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
    if (currentPresentation.completed && marinaManualProgress === null && Number.isFinite(marinaStartedAt)) {
      marinaProgress = THREE.MathUtils.clamp(
        (elapsed - marinaStartedAt) / ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS,
        0,
        1,
      );
    }
    materials.warmGlow.emissiveIntensity = 1.02 + Math.sin(elapsed * 1.8) * 0.18;
    speakingLight.rotation.y = elapsed * 0.45;
    const blastAge = elapsed - blastStartedAt;
    const activeBlast = blastAge >= 0 && blastAge < ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS;
    root.userData.missionPresentationActive = activeBlast
      || (Number.isFinite(assemblyBuildStartedAt) && elapsed >= assemblyBuildStartedAt
        && elapsed < assemblyBuildStartedAt + ISLAND_1_ASSEMBLY_BUILD_DURATION_SECONDS)
      || (Number.isFinite(marinaStartedAt) && elapsed >= marinaStartedAt
        && elapsed < marinaStartedAt + ISLAND_1_MARINA_ANIMATION_DURATION_SECONDS);
    waterImpacts.visible = activeBlast && currentPresentation.chargesDetonated === 8;
    if (waterImpacts.visible) {
      const wave = THREE.MathUtils.clamp((blastAge / ISLAND_1_ASSEMBLY_BLAST_DURATION_SECONDS - 0.68) / 0.32, 0, 1);
      splashMaterial.opacity = Math.sin(wave * Math.PI) * 0.8;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        dummy.position.set(Math.sin(a) * (8.4 + i % 3 * 0.3), ISLAND_1_OCEAN_SURFACE_Y + 0.025, Math.cos(a) * (8.4 + i % 3 * 0.3));
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.scale.setScalar(0.01 + wave * 2.8);
        dummy.updateMatrix();
        waterImpacts.setMatrixAt(i, dummy.matrix);
      }
      waterImpacts.instanceMatrix.needsUpdate = true;
    }
    blastRubble.visible = activeBlast;
    blastDust.visible = activeBlast;
    blastSparks.visible = activeBlast;
    blastShockwave.visible = activeBlast;
    pressureWave.visible = activeBlast;
    blastFlash.visible = activeBlast;
    blastCore.visible = activeBlast;
    if (activeBlast) {
      const detonated = clampChargeCount(currentPresentation.chargesDetonated, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET);
      const act = detonated >= 10 ? 3 : detonated >= 8 ? 2 : 1;
      const chargeIndex = act === 1 ? 2 : act === 2 ? 14 : 19;
      const angle = act === 1 ? blastAge / 3.6 * Math.PI * 2 : chargeIndex * Math.PI * (3 - Math.sqrt(5));
      const excavationSpread = Math.sqrt(chargeIndex / Math.max(1, ISLAND_1_ASSEMBLY_CRATER_SECTOR_COUNT - 1));
      const internalDigProgress = THREE.MathUtils.smoothstep(
        THREE.MathUtils.clamp((chargeIndex - 2) / 17, 0, 1),
        0,
        1,
      );
      const impactRadius = act === 1 ? ISLAND_1_ASSEMBLY_CRATER_RADIUS * .82 : THREE.MathUtils.lerp(
        ISLAND_1_ASSEMBLY_CRATER_RADIUS * (0.1 + excavationSpread * 0.72),
        ISLAND_1_ASSEMBLY_UNDERGROUND_RADIUS * (0.3 + excavationSpread * 0.42),
        internalDigProgress,
      );
      const intensity = act === 2 ? 2.4 : act === 1 ? 1.35 : 1.1;
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
      const flashEnvelope = act === 1 ? Math.max(0, 1 - ((blastAge * 3) % 1) * 2) * Math.max(0, 1 - progress) : Math.max(0, 1 - progress / 0.28);
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

      const internalPulseCount = act === 3 ? 3 : act === 2 ? 2 : 0;
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
        const scatter = index / blastRubble.count * Math.PI * 2;
        const travel = debrisProgress * (act === 2 ? 8.4 + (index % 7) * 0.3 : 1.5 + (index % 7) * 0.34);
        const rubbleAngle = angle + scatter;
        dummy.position.set(
          (act === 2 ? 0 : impactPosition.x) + Math.sin(rubbleAngle) * travel,
          act === 2 ? 0.26 + Math.sin(debrisProgress * Math.PI) * (4.8 + (index % 5) * 0.4) + (ISLAND_1_OCEAN_SURFACE_Y - 0.26) * debrisProgress * debrisProgress : impactPosition.y + Math.sin(debrisProgress * Math.PI) * (1.15 + (index % 5) * 0.32) * intensity - debrisProgress * debrisProgress * 0.74,
          (act === 2 ? 0 : impactPosition.z) + Math.cos(rubbleAngle) * travel,
        );
        dummy.rotation.set(debrisProgress * index * 1.4, rubbleAngle, debrisProgress * index * 0.9);
        dummy.scale.setScalar((0.62 + (index % 5) * 0.15) * Math.max(0.16, 1 - debrisProgress * 0.72));
        dummy.updateMatrix();
        blastRubble.setMatrixAt(index, dummy.matrix);
      }
      blastRubble.instanceMatrix.needsUpdate = true;
      for (let index = 0; index < blastDust.count; index += 1) {
        const dustAngle = index * 2.399963;
        const head = index >= blastDust.count * 0.28;
        const rise = Math.sin(dustProgress * Math.PI * 0.72);
        const spread = head ? (.55 + dustProgress * 3.2) * Math.sqrt(((index * 17) % 37 + .5)/37) : .15 + dustProgress * .5;
        if (act === 2) {
          dummy.position.set(Math.sin(dustAngle) * spread,
            0.3 + rise * (head ? 4.8 + (index % 3) * 0.35 : 1 + (index % 5) * 0.6),
            Math.cos(dustAngle) * spread);
          dummy.scale.set(head ? 1.9 + dustProgress * 2.8 : 1 + dustProgress,
            head ? 1.25 + dustProgress * 1.8 : 1.8 + dustProgress,
            head ? 1.9 + dustProgress * 2.8 : 1 + dustProgress);
        } else {
          const travel = dustProgress * (0.72 + (index % 4) * 0.32) * intensity;
          dummy.position.set(THREE.MathUtils.lerp(impactPosition.x,ventPosition.x,THREE.MathUtils.smoothstep(dustProgress,0,.6)) + Math.sin(dustAngle) * travel,
            impactPosition.y + dustProgress * (ventPosition.y - impactPosition.y + 1.1),
            THREE.MathUtils.lerp(impactPosition.z,ventPosition.z,THREE.MathUtils.smoothstep(dustProgress,0,.6)) + Math.cos(dustAngle) * travel);
          dummy.scale.setScalar(0.2 + dustProgress * (1.8 + (index % 5) * 0.25) * intensity);
        }
        dummy.rotation.set(0, dustAngle, 0);
        dummy.updateMatrix();
        blastDust.setMatrixAt(index, dummy.matrix);
      }
      dustMaterial.opacity = Math.max(0, Math.pow(1-dustProgress,.65)*(act===2?.78:.48));
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
    vault.update(assemblyBuildProgress);
    diplomaticHall.update(assemblyBuildProgress, elapsed);
    landmarkAccess.update(assemblyBuildProgress, elapsed);
    marina.update(marinaManualProgress ?? marinaProgress, elapsed);
    const admission=marina.getPresentation();
    heroCoast.animate(elapsed,admission.waterfallFlow,admission.waterfallDraining);
  };

  updateAssemblyCrater(currentPresentation, true);
  scene.add(root);
  return {
    root,
    animate,
    updateAssemblyCrater,
    setMarinaProgress: (progress) => {
      marinaManualProgress = THREE.MathUtils.clamp(progress, 0, 1);
      marinaProgress = marinaManualProgress;
      marina.update(marinaProgress, lastAnimationElapsed);
      const admission=marina.getPresentation();
      heroCoast.animate(lastAnimationElapsed,admission.waterfallFlow,admission.waterfallDraining);
    },
    replayMarina: () => {
      marinaManualProgress = null;
      marinaProgress = 0;
      marinaBuildQueued = false;
      marinaStartedAt = lastAnimationElapsed;
      marina.update(0, lastAnimationElapsed);
      heroCoast.animate(lastAnimationElapsed,1,true);
    },
    endMarinaMeeting: () => marina.endMeeting(lastAnimationElapsed),
    setInspectionCutaway: (active) => {
      inspectionCutawayContext.visible = active;
      vault.setCutaway(active);
      heroCoast.root.visible = !active;
    },
    getBlastPresentation: () => blastPresentation,
    getConstructionPresentation: () => ({
      active: currentPresentation.completed && assemblyBuildProgress < 1,
      progress: assemblyBuildProgress,
      completed: currentPresentation.completed && assemblyBuildProgress >= 1,
    }),
    getMarinaPresentation: marina.getPresentation,
  };
}
