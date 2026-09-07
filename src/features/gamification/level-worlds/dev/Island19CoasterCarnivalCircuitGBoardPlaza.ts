import * as THREE from 'three';
import { TILE_ANCHORS_36 } from '../services/islandBoardLayout';
import {
  buildIsland3DRadialTileMeshData,
  buildIsland5TileTransforms,
  type Island3DQuality,
  type Island5TileTransform,
} from './island5ThreePilotContract';
import {
  createIsland19CoasterCarnivalCircuitGFountainStatue,
  type Island19CircuitGFountainStatueRuntime,
} from './Island19CoasterCarnivalCircuitGFountainStatue';

export const ISLAND_19_CIRCUIT_G_BOARD_NAME = 'Island 019 Coaster Carnival — Circuit G Board Plaza';
export const ISLAND_19_CIRCUIT_G_BOARD_PACKET =
  'docs/visual-references/island-019-coaster-carnival/secondary-inferred/circuit-g-multiview/board-plaza-multiview-v1.png';

export interface Island19CircuitGBoardDiagnostics {
  valid: boolean;
  tileCount: number;
  uniqueTileIndices: number;
  routeViolations: string[];
  minimumTileCenterDistance: number;
  fountainClearance: number;
  boardOuterRadius: number;
  generatedLabelsAuthoritative: false;
}

export interface Island19CircuitGBoardRuntime {
  root: THREE.Group;
  tileRoot: THREE.Group;
  tileMeshes: readonly THREE.Mesh[];
  tileTransforms: readonly Island5TileTransform[];
  fountain: THREE.Group;
  fountainStatue: Island19CircuitGFountainStatueRuntime;
  castlePortalSocket: THREE.Object3D;
  coasterClearanceSockets: readonly THREE.Object3D[];
  diagnostics: Island19CircuitGBoardDiagnostics;
  dataset: Record<string, string>;
  animate: (elapsedSeconds: number) => void;
  setClay: (enabled: boolean) => void;
}

export interface Island19CircuitGBoardOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  reducedMotion?: boolean;
  clay?: boolean;
}

interface BoardMaterials {
  ivory: THREE.MeshStandardMaterial;
  ivoryWarm: THREE.MeshStandardMaterial;
  ivoryShade: THREE.MeshStandardMaterial;
  teal: THREE.MeshPhysicalMaterial;
  tealDark: THREE.MeshStandardMaterial;
  red: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  water: THREE.MeshPhysicalMaterial;
  waterJet: THREE.MeshPhysicalMaterial;
  grass: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  flowerPink: THREE.MeshStandardMaterial;
  flowerYellow: THREE.MeshStandardMaterial;
  flowerBlue: THREE.MeshStandardMaterial;
  warmLamp: THREE.MeshStandardMaterial;
  clay: THREE.MeshStandardMaterial;
}

const BOARD_OUTER_RADIUS = 4.18;
const GARDEN_INNER_RADIUS = 1.34;
const GARDEN_OUTER_RADIUS = 2.62;
const TILE_CENTER_Y = 0.34;
const TILE_COUNT = 36;

const segmentsFor = (quality: Island3DQuality) => quality === 'high' ? 96 : quality === 'medium' ? 72 : 48;

function createMaterials(): BoardMaterials {
  return {
    ivory: new THREE.MeshStandardMaterial({ color: 0xe7d7b5, roughness: 0.72, metalness: 0.01 }),
    ivoryWarm: new THREE.MeshStandardMaterial({ color: 0xf4e8ca, roughness: 0.66, metalness: 0.01 }),
    ivoryShade: new THREE.MeshStandardMaterial({ color: 0xc9b58e, roughness: 0.79, metalness: 0.01 }),
    teal: new THREE.MeshPhysicalMaterial({ color: 0x187f83, roughness: 0.36, metalness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.25 }),
    tealDark: new THREE.MeshStandardMaterial({ color: 0x0f555b, roughness: 0.52, metalness: 0.28 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xb53b2d, roughness: 0.34, metalness: 0.22, clearcoat: 0.42, clearcoatRoughness: 0.22 }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xc98a32, roughness: 0.28, metalness: 0.88, clearcoat: 0.22, clearcoatRoughness: 0.18 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x27a7bf, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.82, clearcoat: 0.78, clearcoatRoughness: 0.08, depthWrite: false }),
    waterJet: new THREE.MeshPhysicalMaterial({ color: 0xbff6ff, roughness: 0.08, transparent: true, opacity: 0.74, emissive: 0x1687a5, emissiveIntensity: 0.16, depthWrite: false }),
    grass: new THREE.MeshStandardMaterial({ color: 0x2f773d, roughness: 0.9, metalness: 0 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x6b4a31, roughness: 0.96, metalness: 0 }),
    flowerPink: new THREE.MeshStandardMaterial({ color: 0xd94a66, roughness: 0.65, emissive: 0x4b1021, emissiveIntensity: 0.05 }),
    flowerYellow: new THREE.MeshStandardMaterial({ color: 0xf4cd62, roughness: 0.62, emissive: 0x5a3b09, emissiveIntensity: 0.06 }),
    flowerBlue: new THREE.MeshStandardMaterial({ color: 0x5e9ed6, roughness: 0.6, emissive: 0x102d58, emissiveIntensity: 0.06 }),
    warmLamp: new THREE.MeshStandardMaterial({ color: 0xffd97a, roughness: 0.24, emissive: 0xffa62d, emissiveIntensity: 1.1 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xd6d0c7, roughness: 0.82, metalness: 0 }),
  };
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = castShadow;
  result.receiveShadow = receiveShadow;
  return result;
}

function createRadialTileGeometry() {
  const data = buildIsland3DRadialTileMeshData(TILE_COUNT);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setIndex(Array.from(data.indices));
  const nonIndexed = geometry.toNonIndexed();
  geometry.dispose();
  nonIndexed.computeVertexNormals();
  nonIndexed.name = 'ISLAND_19_CIRCUIT_G_CANONICAL_TILE_GEOMETRY';
  return nonIndexed;
}

function createStarGeometry(outerRadius: number, innerRadius: number, depth: number) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index / 10 * Math.PI * 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.34, bevelThickness: depth * 0.25, bevelSegments: 2, curveSegments: 2 });
  geometry.center();
  return geometry;
}

function createAnnularSectorGeometry(innerRadius: number, outerRadius: number, start: number, length: number, depth: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, start, start + length, false);
  shape.lineTo(Math.cos(start + length) * innerRadius, Math.sin(start + length) * innerRadius);
  shape.absarc(0, 0, innerRadius, start + length, start, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.035, depth * 0.22),
    bevelThickness: Math.min(0.025, depth * 0.18),
    curveSegments: 12,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addFoundation(root: THREE.Group, materials: BoardMaterials, segments: number, castShadow: boolean, receiveShadow: boolean) {
  const foundation = new THREE.Group();
  foundation.name = 'ISLAND_19_G01_RAISED_BOARD_FOUNDATION';
  foundation.userData = { partId: 'raised-board-slab', explodable: true, clickable: false };
  const lower = mesh(new THREE.CylinderGeometry(BOARD_OUTER_RADIUS - 0.02, BOARD_OUTER_RADIUS + 0.22, 0.38, segments, 2), materials.ivoryShade, 'ISLAND_19_G01_LOWER_RETAINING_SLAB', castShadow, receiveShadow);
  lower.position.y = -0.04;
  lower.userData = { explodeWithParent: true };
  foundation.add(lower);

  const goldCourse = mesh(new THREE.CylinderGeometry(BOARD_OUTER_RADIUS + 0.04, BOARD_OUTER_RADIUS + 0.11, 0.075, segments, 1), materials.gold, 'ISLAND_19_G01_FOUNDATION_GOLD_COURSE', castShadow, receiveShadow);
  goldCourse.position.y = 0.155;
  goldCourse.userData = { explodeWithParent: true };
  foundation.add(goldCourse);

  const upper = mesh(new THREE.CylinderGeometry(BOARD_OUTER_RADIUS - 0.13, BOARD_OUTER_RADIUS, 0.22, segments, 1), materials.ivory, 'ISLAND_19_G01_RAISED_BOARD_SLAB', castShadow, receiveShadow);
  upper.position.y = 0.245;
  upper.userData = { explodeWithParent: true };
  foundation.add(upper);

  const innerPlaza = mesh(new THREE.CylinderGeometry(4.1, 4.18, 0.12, segments, 1), materials.ivoryWarm, 'ISLAND_19_G01_INNER_PLAZA_DISC', castShadow, receiveShadow);
  innerPlaza.position.y = 0.35;
  innerPlaza.userData = { explodeWithParent: true };
  foundation.add(innerPlaza);

  const entry = new THREE.Group();
  entry.name = 'ISLAND_19_G01_FRONT_ENTRY_STAIR_AND_CASTLE_SOCKET';
  for (let index = 0; index < 5; index += 1) {
    const step = mesh(new THREE.BoxGeometry(1.55 + index * 0.12, 0.1, 0.42), index % 2 === 0 ? materials.ivoryWarm : materials.ivory, `ISLAND_19_G01_ENTRY_STEP_${index + 1}`, castShadow, receiveShadow);
    step.position.set(0, 0.08 + index * 0.075, 4.48 - index * 0.29);
    entry.add(step);
  }
  const socket = new THREE.Object3D();
  socket.name = 'ISLAND_19_G01_CASTLE_PORTAL_SOCKET';
  socket.position.set(0, 0.42, 2.92);
  socket.userData = {
    socketType: 'castle-portal',
    reservedWidth: 2.3,
    reservedDepth: 1.8,
    routeViolationsAllowed: 0,
    attachment: {
      parentSocket: 'ISLAND_19_G01_FRONT_ENTRY_STAIR_AND_CASTLE_SOCKET',
      localStart: [0, 0, 0],
      localEnd: [0, 0, -1.8],
      contactType: 'socketed-foundation',
      embedDepth: 0.12,
      gapTolerance: 0.02,
    },
  };
  entry.add(socket);
  foundation.add(entry);
  root.add(foundation);
  return socket;
}

function addCanonicalTiles(
  root: THREE.Group,
  materials: BoardMaterials,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const tileRoot = new THREE.Group();
  tileRoot.name = 'ISLAND_19_G01_CANONICAL_36_TILE_ROUTE';
  tileRoot.userData = { partId: 'canonical-36-tile-route', explodable: true, clickable: true };
  const tileGeometry = createRadialTileGeometry();
  const rimGeometry = tileGeometry.clone();
  const starGeometry = createStarGeometry(0.14, 0.065, 0.028);
  const transforms = buildIsland5TileTransforms(TILE_ANCHORS_36);
  const tiles: THREE.Mesh[] = [];

  transforms.forEach((transform) => {
    const tileGroup = new THREE.Group();
    tileGroup.name = `ISLAND_19_G01_TILE_GROUP_${String(transform.index).padStart(2, '0')}`;
    tileGroup.userData = { partId: `canonical-tile-${transform.index}`, clickable: true, tileIndex: transform.index };
    tileGroup.position.set(transform.position[0], TILE_CENTER_Y, transform.position[2]);
    tileGroup.rotation.y = transform.rotationYRad;

    const rim = mesh(rimGeometry, materials.gold, `ISLAND_19_G01_TILE_RIM_${String(transform.index).padStart(2, '0')}`, castShadow, receiveShadow);
    rim.userData = { explodeWithParent: true };
    rim.scale.set(1.055, 0.78, 1.07);
    rim.position.y = -0.045;
    tileGroup.add(rim);

    const tileMaterial = transform.isKeyTile
      ? materials.gold
      : transform.index % 3 === 0
        ? materials.red
        : transform.index % 2 === 0
          ? materials.teal
          : materials.ivoryWarm;
    const tile = mesh(tileGeometry, tileMaterial, `ISLAND_19_G01_CANONICAL_TILE_${String(transform.index).padStart(2, '0')}`, castShadow, receiveShadow);
    tile.userData = { tileIndex: transform.index, canonicalAuthority: 'TILE_ANCHORS_36', generatedLabelAuthoritative: false };
    tileGroup.add(tile);
    tiles.push(tile);

    const emblem = mesh(starGeometry, transform.isKeyTile ? materials.tealDark : materials.gold, `ISLAND_19_G01_TILE_EMBLEM_${String(transform.index).padStart(2, '0')}`, castShadow, false);
    emblem.userData = { explodeWithParent: true };
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.y = 0.125;
    emblem.scale.setScalar(transform.isKeyTile ? 1.18 : 0.88);
    tileGroup.add(emblem);

    tileRoot.add(tileGroup);
  });
  root.add(tileRoot);
  return { tileRoot, tileMeshes: tiles, tileTransforms: transforms };
}

function addRadialPathsAndGardens(root: THREE.Group, materials: BoardMaterials, segments: number, castShadow: boolean, receiveShadow: boolean, quality: Island3DQuality) {
  const gardenRoot = new THREE.Group();
  gardenRoot.name = 'ISLAND_19_G01_RADIAL_PATHS_AND_GARDENS';
  gardenRoot.userData = { partId: 'radial-paths-and-gardens', explodable: true, clickable: false };
  const pathGeometry = new THREE.BoxGeometry(0.62, 0.075, 0.48);
  const paverBatches = [materials.ivory, materials.ivoryWarm].map((material, batchIndex) => {
    const batch = new THREE.InstancedMesh(pathGeometry, material, 8);
    batch.name = `ISLAND_19_G01_INSTANCED_PATH_PAVERS_${batchIndex}`;
    batch.castShadow = castShadow;
    batch.receiveShadow = receiveShadow;
    return batch;
  });
  const paverCursors = [0, 0];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let direction = 0; direction < 4; direction += 1) {
    const angle = direction * Math.PI / 2;
    for (let stepIndex = 0; stepIndex < 4; stepIndex += 1) {
      const radius = 1.48 + stepIndex * 0.35;
      const batchIndex = (stepIndex + direction) % 2;
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      matrix.compose(new THREE.Vector3(Math.sin(angle) * radius, 0.45, Math.cos(angle) * radius), quaternion, scale);
      paverBatches[batchIndex].setMatrixAt(paverCursors[batchIndex], matrix);
      paverCursors[batchIndex] += 1;
    }
  }
  paverBatches.forEach((batch) => {
    batch.instanceMatrix.needsUpdate = true;
    gardenRoot.add(batch);
  });

  const wedgeCount = 8;
  const wedgeGap = 0.12;
  const shrubGeometry = new THREE.DodecahedronGeometry(0.16, 1);
  const wedgeLength = Math.PI * 2 / wedgeCount - wedgeGap * 2;
  const curbBatch = new THREE.InstancedMesh(
    createAnnularSectorGeometry(GARDEN_INNER_RADIUS, GARDEN_OUTER_RADIUS, wedgeGap, wedgeLength, 0.13),
    materials.ivoryShade,
    wedgeCount,
  );
  curbBatch.name = 'ISLAND_19_G01_INSTANCED_GARDEN_CURBS';
  curbBatch.castShadow = castShadow;
  curbBatch.receiveShadow = receiveShadow;
  const bedBatches = [materials.grass, materials.soil].map((material, batchIndex) => {
    const batch = new THREE.InstancedMesh(
      createAnnularSectorGeometry(GARDEN_INNER_RADIUS + 0.12, GARDEN_OUTER_RADIUS - 0.12, wedgeGap + 0.025, wedgeLength - 0.05, 0.09),
      material,
      wedgeCount / 2,
    );
    batch.name = `ISLAND_19_G01_INSTANCED_GARDEN_BEDS_${batchIndex}`;
    batch.receiveShadow = receiveShadow;
    return batch;
  });
  const shrubBatch = new THREE.InstancedMesh(shrubGeometry, materials.grass, wedgeCount * 2);
  shrubBatch.name = 'ISLAND_19_G01_INSTANCED_TOPIARIES';
  shrubBatch.castShadow = castShadow;
  const bedCursors = [0, 0];
  let shrubCursor = 0;
  for (let wedgeIndex = 0; wedgeIndex < wedgeCount; wedgeIndex += 1) {
    const start = wedgeIndex / wedgeCount * Math.PI * 2 + wedgeGap;
    const rotation = wedgeIndex / wedgeCount * Math.PI * 2;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    matrix.compose(new THREE.Vector3(0, 0.44, 0), quaternion, scale);
    curbBatch.setMatrixAt(wedgeIndex, matrix);
    const bedBatchIndex = wedgeIndex % 2;
    matrix.compose(new THREE.Vector3(0, 0.55, 0), quaternion, scale);
    bedBatches[bedBatchIndex].setMatrixAt(bedCursors[bedBatchIndex], matrix);
    bedCursors[bedBatchIndex] += 1;

    const centerAngle = start + wedgeLength * 0.5;
    [1.72, 2.16].forEach((radius, shrubIndex) => {
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), centerAngle);
      matrix.compose(
        new THREE.Vector3(Math.cos(centerAngle) * radius, 0.74 + shrubIndex * 0.035, Math.sin(centerAngle) * radius),
        quaternion,
        new THREE.Vector3(1.08, shrubIndex === 0 ? 1.35 : 1.08, 1.08),
      );
      shrubBatch.setMatrixAt(shrubCursor, matrix);
      shrubCursor += 1;
    });
  }
  curbBatch.instanceMatrix.needsUpdate = true;
  bedBatches.forEach((batch) => { batch.instanceMatrix.needsUpdate = true; });
  shrubBatch.instanceMatrix.needsUpdate = true;
  gardenRoot.add(curbBatch, ...bedBatches, shrubBatch);

  const flowerCount = quality === 'high' ? 96 : quality === 'medium' ? 64 : 32;
  const flowerGeometry = new THREE.SphereGeometry(0.065, 6, 4);
  const flowerMaterials = [materials.flowerPink, materials.flowerYellow, materials.flowerBlue];
  const flowerTransforms: THREE.Matrix4[][] = [[], [], []];
  for (let index = 0; index < flowerCount; index += 1) {
    const golden = index * 2.3999632297;
    const radius = 1.48 + ((index * 37) % 100) / 100 * 0.98;
    const nearPath = Math.abs(Math.sin(golden * 2)) < 0.13;
    if (nearPath) continue;
    flowerTransforms[index % flowerMaterials.length].push(new THREE.Matrix4().compose(
      new THREE.Vector3(Math.sin(golden) * radius, 0.53 + (index % 3) * 0.012, Math.cos(golden) * radius),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 0.7, 1),
    ));
  }
  flowerTransforms.forEach((transforms, index) => {
    const batch = new THREE.InstancedMesh(flowerGeometry, flowerMaterials[index], transforms.length);
    batch.name = `ISLAND_19_G01_INSTANCED_FLOWERS_${index}`;
    batch.castShadow = castShadow;
    transforms.forEach((transform, instanceIndex) => batch.setMatrixAt(instanceIndex, transform));
    batch.instanceMatrix.needsUpdate = true;
    gardenRoot.add(batch);
  });
  root.add(gardenRoot);
}

function addOuterParapet(root: THREE.Group, materials: BoardMaterials, castShadow: boolean, receiveShadow: boolean, quality: Island3DQuality) {
  const parapet = new THREE.Group();
  parapet.name = 'ISLAND_19_G01_LOW_PARAPET_AND_BOLLARDS';
  parapet.userData = { partId: 'outer-parapet-and-bollards', explodable: true, clickable: false };
  const blockCount = quality === 'low' ? 36 : 72;
  const blockGeometry = new THREE.BoxGeometry(0.42, 0.22, 0.18);
  const blockTransforms: THREE.Matrix4[][] = [[], []];
  for (let index = 0; index < blockCount; index += 1) {
    const angle = index / blockCount * Math.PI * 2;
    const frontEntryGap = Math.abs(THREE.MathUtils.euclideanModulo(angle - Math.PI / 2 + Math.PI, Math.PI * 2) - Math.PI) < 0.15;
    if (frontEntryGap) continue;
    blockTransforms[index % 3 === 0 ? 0 : 1].push(new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(angle) * 4.1, 0.49, Math.sin(angle) * 4.1),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle),
      new THREE.Vector3(1, 1, 1),
    ));
  }
  blockTransforms.forEach((transforms, index) => {
    const batch = new THREE.InstancedMesh(blockGeometry, index === 0 ? materials.ivoryWarm : materials.ivoryShade, transforms.length);
    batch.name = `ISLAND_19_G01_INSTANCED_PARAPET_BLOCKS_${index}`;
    batch.castShadow = castShadow;
    batch.receiveShadow = receiveShadow;
    transforms.forEach((transform, instanceIndex) => batch.setMatrixAt(instanceIndex, transform));
    batch.instanceMatrix.needsUpdate = true;
    parapet.add(batch);
  });
  const postGeometry = new THREE.CylinderGeometry(0.075, 0.095, 0.42, 8);
  const finialGeometry = new THREE.SphereGeometry(0.105, 8, 6);
  const postBatch = new THREE.InstancedMesh(postGeometry, materials.gold, 24);
  postBatch.name = 'ISLAND_19_G01_INSTANCED_BOLLARDS';
  postBatch.castShadow = castShadow;
  postBatch.receiveShadow = receiveShadow;
  const lampTransforms: THREE.Matrix4[][] = [[], []];
  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * Math.PI * 2;
    const x = Math.cos(angle) * 4.2;
    const z = Math.sin(angle) * 4.2;
    postBatch.setMatrixAt(index, new THREE.Matrix4().makeTranslation(x, 0.65, z));
    lampTransforms[index % 3 === 0 ? 0 : 1].push(new THREE.Matrix4().makeTranslation(x, 0.91, z));
  }
  postBatch.instanceMatrix.needsUpdate = true;
  parapet.add(postBatch);
  lampTransforms.forEach((transforms, index) => {
    const batch = new THREE.InstancedMesh(finialGeometry, index === 0 ? materials.warmLamp : materials.gold, transforms.length);
    batch.name = `ISLAND_19_G01_INSTANCED_BOLLARD_FINIALS_${index}`;
    batch.castShadow = castShadow;
    transforms.forEach((transform, instanceIndex) => batch.setMatrixAt(instanceIndex, transform));
    batch.instanceMatrix.needsUpdate = true;
    parapet.add(batch);
  });
  root.add(parapet);
}

function addFountain(
  root: THREE.Group,
  materials: BoardMaterials,
  segments: number,
  castShadow: boolean,
  receiveShadow: boolean,
  quality: Island3DQuality,
  reducedMotion: boolean,
) {
  const fountain = new THREE.Group();
  fountain.name = 'ISLAND_19_G01_UNOBSTRUCTED_CENTER_FOUNTAIN';
  fountain.userData = { partId: 'unobstructed-center-fountain', explodable: true, clickable: true };
  const plazaRing = mesh(new THREE.CylinderGeometry(1.78, 1.88, 0.16, segments), materials.ivoryWarm, 'ISLAND_19_G01_FOUNTAIN_PLAZA_RING', castShadow, receiveShadow);
  plazaRing.position.y = 0.44;
  fountain.add(plazaRing);
  const basin = mesh(new THREE.CylinderGeometry(1.36, 1.52, 0.42, segments), materials.ivory, 'ISLAND_19_G01_FOUNTAIN_BASIN', castShadow, receiveShadow);
  basin.position.y = 0.68;
  fountain.add(basin);
  const tealBand = mesh(new THREE.TorusGeometry(1.36, 0.12, 12, segments), materials.teal, 'ISLAND_19_G01_FOUNTAIN_TEAL_BAND', castShadow, receiveShadow);
  tealBand.rotation.x = Math.PI / 2;
  tealBand.position.y = 0.86;
  fountain.add(tealBand);
  const water = mesh(new THREE.CircleGeometry(1.27, segments), materials.water, 'ISLAND_19_G01_FOUNTAIN_WATER', false, false);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.88;
  fountain.add(water);
  const pedestal = mesh(new THREE.CylinderGeometry(0.25, 0.5, 1.26, 18), materials.ivoryWarm, 'ISLAND_19_G01_FOUNTAIN_PEDESTAL', castShadow, receiveShadow);
  pedestal.position.y = 1.43;
  fountain.add(pedestal);
  const collar = mesh(new THREE.TorusGeometry(0.37, 0.07, 8, 24), materials.gold, 'ISLAND_19_G01_FOUNTAIN_GOLD_COLLAR', castShadow, receiveShadow);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.72;
  fountain.add(collar);
  const upperBowl = mesh(new THREE.CylinderGeometry(0.5, 0.64, 0.18, 24), materials.teal, 'ISLAND_19_G01_FOUNTAIN_UPPER_BOWL', castShadow, receiveShadow);
  upperBowl.position.y = 1.91;
  fountain.add(upperBowl);
  const upperWater = mesh(new THREE.CircleGeometry(0.46, 24), materials.water, 'ISLAND_19_G01_FOUNTAIN_UPPER_WATER', false, false);
  upperWater.rotation.x = -Math.PI / 2;
  upperWater.position.y = 2.01;
  fountain.add(upperWater);

  const statueSocket = new THREE.Object3D();
  statueSocket.name = 'ISLAND_19_G01_FOUNTAIN_STATUE_SOCKET';
  statueSocket.position.y = 1.94;
  statueSocket.userData = {
    socketType: 'keyed-fountain-statue',
    ownsBoardTransform: false,
    contactType: 'keyed-embed',
    embedDepth: 0.08,
    gapTolerance: 0.008,
  };
  const statue = createIsland19CoasterCarnivalCircuitGFountainStatue({
    quality,
    castShadow,
    receiveShadow,
    reducedMotion,
  });
  statue.root.scale.setScalar(0.92);
  statueSocket.add(statue.root);
  fountain.add(statueSocket);

  const jets = new THREE.Group();
  jets.name = 'ISLAND_19_G01_FOUNTAIN_EIGHT_JETS';
  jets.userData = {
    partId: 'fountain-jets',
    explodeWithParent: true,
    attachment: {
      parentSocket: 'ISLAND_19_G01_FOUNTAIN_BASIN',
      localStart: [0, 0.94, 0],
      localEnd: [0, 1.72, 0],
      contactType: 'embedded-nozzle-array',
      embedDepth: 0.04,
      gapTolerance: 0.015,
    },
  };
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(angle) * 1.02, 0.94, Math.sin(angle) * 1.02);
    const end = new THREE.Vector3(Math.cos(angle) * 0.34, 1.32, Math.sin(angle) * 0.34);
    const control = start.clone().lerp(end, 0.5);
    control.y = 1.72;
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    jets.add(mesh(new THREE.TubeGeometry(curve, 12, 0.018, 5, false), materials.waterJet, `ISLAND_19_G01_FOUNTAIN_JET_${index}`, false, false));
  }
  fountain.add(jets);
  root.add(fountain);
  return { fountain, water, jets, statue, statueSocket };
}

function createClearanceSockets(root: THREE.Group) {
  const sockets: THREE.Object3D[] = [];
  const definitions = [
    ['rear-overpass', -3.6, 2.9, -1.6, 0.95, 2.3],
    ['side-overpass', 3.95, 2.55, 0.45, 0.95, 2.1],
  ] as const;
  for (const [id, x, y, z, halfWidth, height] of definitions) {
    const socket = new THREE.Object3D();
    socket.name = `ISLAND_19_G01_COASTER_CLEARANCE_${id.toUpperCase()}`;
    socket.position.set(x, y, z);
    socket.userData = { socketType: 'coaster-clearance', halfWidth, height, routeViolationsAllowed: 0, visibleGeometry: false };
    root.add(socket);
    sockets.push(socket);
  }
  return sockets;
}

function diagnose(tileMeshes: readonly THREE.Mesh[], transforms: readonly Island5TileTransform[]) {
  const violations: string[] = [];
  const indices = new Set<number>();
  let minimumDistance = Number.POSITIVE_INFINITY;
  tileMeshes.forEach((tile) => {
    const index = Number(tile.userData.tileIndex);
    if (!Number.isInteger(index) || index < 0 || index >= TILE_COUNT) violations.push(`invalid-tile-index:${String(tile.userData.tileIndex)}`);
    if (indices.has(index)) violations.push(`duplicate-tile-index:${index}`);
    indices.add(index);
  });
  for (let index = 0; index < transforms.length; index += 1) {
    const current = new THREE.Vector3(...transforms[index].position);
    const next = new THREE.Vector3(...transforms[(index + 1) % transforms.length].position);
    minimumDistance = Math.min(minimumDistance, current.distanceTo(next));
    const radius = Math.hypot(current.x, current.z);
    if (radius <= GARDEN_OUTER_RADIUS + 0.2) violations.push(`tile-garden-overlap:${index}`);
    if (radius >= BOARD_OUTER_RADIUS - 0.15) violations.push(`tile-parapet-overlap:${index}`);
  }
  const fountainClearance = Math.min(...transforms.map((transform) => Math.hypot(transform.position[0], transform.position[2]))) - GARDEN_OUTER_RADIUS;
  return {
    valid: tileMeshes.length === TILE_COUNT && indices.size === TILE_COUNT && violations.length === 0 && fountainClearance > 0.7,
    tileCount: tileMeshes.length,
    uniqueTileIndices: indices.size,
    routeViolations: violations,
    minimumTileCenterDistance: minimumDistance,
    fountainClearance,
    boardOuterRadius: BOARD_OUTER_RADIUS,
    generatedLabelsAuthoritative: false as const,
  };
}

export function createIsland19CoasterCarnivalCircuitGBoardPlaza(options: Island19CircuitGBoardOptions = {}): Island19CircuitGBoardRuntime {
  const quality = options.quality ?? 'high';
  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;
  const reducedMotion = options.reducedMotion ?? false;
  const materials = createMaterials();
  const segments = segmentsFor(quality);
  const root = new THREE.Group();
  root.name = ISLAND_19_CIRCUIT_G_BOARD_NAME;
  root.userData = {
    circuitFamily: 'circuit-g-source-locked-modular-mesh',
    moduleId: 'g01-board-plaza',
    sourcePacket: ISLAND_19_CIRCUIT_G_BOARD_PACKET,
    canonicalTileAuthority: 'TILE_ANCHORS_36',
    generatedLabelsAuthoritative: false,
    sculptRuntime: {
      schemaVersion: 1,
      actionReady: true,
      partRoots: [
        'ISLAND_19_G01_RAISED_BOARD_FOUNDATION',
        'ISLAND_19_G01_CANONICAL_36_TILE_ROUTE',
        'ISLAND_19_G01_RADIAL_PATHS_AND_GARDENS',
        'ISLAND_19_G01_LOW_PARAPET_AND_BOLLARDS',
        'ISLAND_19_G01_UNOBSTRUCTED_CENTER_FOUNTAIN',
        'Island 019 Circuit G — Gold Carnival Guardian Fountain Statue',
      ],
      sockets: [
        'ISLAND_19_G01_CASTLE_PORTAL_SOCKET',
        'ISLAND_19_G01_COASTER_CLEARANCE_REAR-OVERPASS',
        'ISLAND_19_G01_COASTER_CLEARANCE_SIDE-OVERPASS',
        'ISLAND_19_G01_FOUNTAIN_STATUE_SOCKET',
      ],
      colliderPolicy: 'canonical tile hit targets remain the only gameplay interaction colliders',
      destructionGroups: ['foundation', 'route', 'gardens', 'parapet', 'fountain', 'fountain-statue'],
    },
  };

  const castlePortalSocket = addFoundation(root, materials, segments, castShadow, receiveShadow);
  const { tileRoot, tileMeshes, tileTransforms } = addCanonicalTiles(root, materials, castShadow, receiveShadow);
  addRadialPathsAndGardens(root, materials, segments, castShadow, receiveShadow, quality);
  addOuterParapet(root, materials, castShadow, receiveShadow, quality);
  const { fountain, water, jets, statue } = addFountain(
    root,
    materials,
    segments,
    castShadow,
    receiveShadow,
    quality,
    reducedMotion,
  );
  const coasterClearanceSockets = createClearanceSockets(root);
  const diagnostics = diagnose(tileMeshes, tileTransforms);
  root.userData.diagnostics = diagnostics;

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) originalMaterials.set(object, object.material);
  });
  const setClay = (enabled: boolean) => {
    originalMaterials.forEach((material, object) => {
      object.material = enabled ? materials.clay : material;
    });
  };
  if (options.clay) setClay(true);

  const animate = (elapsedSeconds: number) => {
    const time = reducedMotion ? 0 : elapsedSeconds;
    water.rotation.z = reducedMotion ? 0 : time * 0.055;
    const pulse = reducedMotion ? 1 : 0.96 + Math.sin(time * 1.8) * 0.04;
    jets.scale.set(1, pulse, 1);
    jets.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.26) * 0.025;
    statue.animate(elapsedSeconds);
  };

  const dataset = {
    island19CircuitGModule: 'g01-board-plaza',
    island19CircuitGPacket: 'approved',
    island19CircuitGTileCount: String(diagnostics.tileCount),
    island19CircuitGUniqueTileIndices: String(diagnostics.uniqueTileIndices),
    island19CircuitGRouteViolations: String(diagnostics.routeViolations.length),
    island19CircuitGBoardValid: String(diagnostics.valid),
    island19CircuitGFountainClearance: diagnostics.fountainClearance.toFixed(5),
    island19CircuitGGeneratedLabelsAuthoritative: 'false',
    island19CircuitGStructuralParts: '6',
    island19CircuitGAssemblySockets: '4',
    island19CircuitGActionReady: 'true',
    ...statue.dataset,
  };

  return {
    root,
    tileRoot,
    tileMeshes,
    tileTransforms,
    fountain,
    fountainStatue: statue,
    castlePortalSocket,
    coasterClearanceSockets,
    diagnostics,
    dataset,
    animate,
    setClay,
  };
}
