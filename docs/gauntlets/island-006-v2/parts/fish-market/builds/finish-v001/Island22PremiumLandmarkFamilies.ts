import { populateIsland22FishMarketV2 } from './Island22FishMarketV2';
import { populateIsland22LighthouseV2 } from './Island22LighthouseV2';
import { populateIsland22TavernV2 } from './Island22TavernV2';
import { populateIsland22HatcheryV2 } from './Island22HatcheryV2';
import { populateIsland22BoatwrightV2 } from './Island22BoatwrightV2';
import { addHarborSlateSurface } from './Island22HarborV2';
import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export type Island22PremiumLandmarkLevel = 1 | 2 | 3;

export type Island22PremiumLandmarkFamilyId =
  | 'lighthouse-library'
  | 'round-lantern-tavern'
  | 'boatwright-yard'
  | 'net-house-hatchery'
  | 'fish-market-hall';

export interface Island22PremiumLandmarkFactoryOptions {
  level: Island22PremiumLandmarkLevel;
  quality: Island3DQuality;
  materials: Island22FishermansVillageMaterials;
}

export interface Island22PremiumLandmarkBudget {
  family: Island22PremiumLandmarkFamilyId;
  quality: Island3DQuality;
  meshCount: number;
  triangleCount: number;
}

const MODULE_ID = 'island-016-premium-landmark-families-v001';
const FRONT_AXIS = '+z';

const RADIAL_SEGMENTS: Record<Island3DQuality, number> = {
  low: 8,
  medium: 12,
  high: 16,
};

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  segments: number,
) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function cone(radius: number, height: number, material: THREE.Material, segments: number) {
  return new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material);
}

function addSocket(
  owner: THREE.Group,
  socketId: string,
  position: readonly [number, number, number],
  rotationY = 0,
) {
  const socket = new THREE.Object3D();
  socket.name = `ISLAND_016_SOCKET_${socketId.toUpperCase().split('-').join('_')}`;
  socket.position.set(...position);
  socket.rotation.y = rotationY;
  socket.userData.socketId = socketId;
  socket.userData.socketOwner = owner.userData.partId ?? owner.name;
  owner.add(socket);
  return socket;
}

function markPart(
  part: THREE.Group,
  family: Island22PremiumLandmarkFamilyId,
  partId: string,
  sockets: readonly string[] = [],
) {
  const canonicalId = `island-016-${family}-${partId}`;
  part.userData.partId = canonicalId;
  part.userData.partKind = 'part';
  part.userData.partModule = MODULE_ID;
  part.userData.clickable = true;
  part.userData.explodable = true;
  part.userData.sculptRuntime = {
    parts: [{
      id: canonicalId,
      name: canonicalId,
      kind: 'part',
      nodeName: part.name,
      module: MODULE_ID,
      triangles: 0,
    }],
    clickable: true,
    explodable: true,
    sockets: Object.fromEntries(sockets.map((socket) => [socket, socket])),
    colliders: [{ id: canonicalId, type: 'compound', isTrigger: true }],
    destructionGroups: [{ id: canonicalId, breakable: false, partIds: [canonicalId] }],
  };
  return part;
}

function setShadows(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}

function createBeamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 6,
) {
  const vector = new THREE.Vector3().subVectors(end, start);
  const beam = cylinder(radius, radius, vector.length(), material, segments);
  beam.position.copy(start).addScaledVector(vector, 0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize());
  return beam;
}

function createGablePanel(
  width: number,
  wallHeight: number,
  rise: number,
  depth: number,
  material: THREE.Material,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, wallHeight);
  shape.lineTo(0, wallHeight + rise);
  shape.lineTo(-width / 2, wallHeight);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function createGabledRoof(
  width: number,
  depth: number,
  rise: number,
  thickness: number,
  material: THREE.Material,
  trimMaterial: THREE.Material,
) {
  if (material instanceof THREE.MeshStandardMaterial) {
    material = material.clone();
    addHarborSlateSurface(material as THREE.MeshStandardMaterial);
  }
  const root = new THREE.Group();
  const slopeLength = Math.hypot(width / 2, rise);
  const angle = Math.atan2(rise, width / 2);
  [-1, 1].forEach((side) => {
    const slope = box(slopeLength + 0.08, thickness, depth + 0.16, material);
    slope.position.set(side * width * 0.25, rise * 0.5, 0);
    slope.rotation.z = -side * angle;
    root.add(slope);
    const eave = box(0.07, 0.08, depth + 0.26, trimMaterial);
    eave.position.set(side * (width / 2 + 0.035), -0.02, 0);
    root.add(eave);
  });
  const ridge = box(0.08, 0.1, depth + 0.22, trimMaterial);
  ridge.position.y = rise;
  root.add(ridge);
  return root;
}

function addWindowWithFrame(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  materials: Island22FishermansVillageMaterials,
) {
  const frame = box(width + 0.12, height + 0.12, 0.07, materials.timberDark);
  frame.position.set(x, y, z);
  const glass = box(width, height, 0.045, materials.window);
  glass.position.set(x, y, z + 0.045);
  const vertical = box(0.035, height, 0.035, materials.brass);
  vertical.position.set(x, y, z + 0.075);
  const horizontal = box(width, 0.035, 0.035, materials.brass);
  horizontal.position.set(x, y, z + 0.076);
  owner.add(frame, glass, vertical, horizontal);
}

function addArchedDoor(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  materials: Island22FishermansVillageMaterials,
) {
  const surround = createGablePanel(width + 0.18, height * 0.7, height * 0.3, 0.1, materials.stone);
  surround.position.set(x, y, z);
  const door = createGablePanel(width, height * 0.72, height * 0.28, 0.12, materials.timberDark);
  door.position.set(x, y + 0.04, z + 0.07);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), materials.brass);
  handle.position.set(x + width * 0.28, y + height * 0.46, z + 0.16);
  owner.add(surround, door, handle);
}

function addHalfTimberFacade(
  owner: THREE.Group,
  width: number,
  wallHeight: number,
  z: number,
  materials: Island22FishermansVillageMaterials,
  offsetX = 0,
  offsetY = 0,
) {
  const bottom = box(width, 0.09, 0.08, materials.timberDark);
  bottom.position.set(offsetX, offsetY + 0.12, z);
  const top = bottom.clone();
  top.position.y = offsetY + wallHeight - 0.08;
  owner.add(bottom, top);
  const postCount = width > 2.2 ? 4 : 3;
  for (let index = 0; index < postCount; index += 1) {
    const x = offsetX - width / 2 + index * width / (postCount - 1);
    const post = box(0.085, wallHeight - 0.15, 0.085, materials.timberDark);
    post.position.set(x, offsetY + wallHeight / 2, z);
    owner.add(post);
  }
  const leftBrace = box(width * 0.44, 0.075, 0.075, materials.timber);
  leftBrace.position.set(offsetX - width * 0.24, offsetY + wallHeight * 0.53, z + 0.006);
  leftBrace.rotation.z = 0.48;
  const rightBrace = leftBrace.clone();
  rightBrace.position.x = offsetX + width * 0.24;
  rightBrace.rotation.z *= -1;
  owner.add(leftBrace, rightBrace);
}

function addRoofCourses(
  owner: THREE.Group,
  width: number,
  depth: number,
  baseY: number,
  rise: number,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
  offsetX = 0,
  offsetZ = 0,
) {
  if (quality === 'low') return;
  const rows = quality === 'high' ? 4 : 2;
  for (let row = 0; row < rows; row += 1) {
    const progress = (row + 0.7) / (rows + 0.8);
    [-1, 1].forEach((side) => {
      const course = box(0.035, 0.035, depth + 0.2, row % 2 ? materials.brass : materials.timberDark);
      course.position.set(
        offsetX + side * width * (0.5 - progress * 0.46),
        baseY + rise * progress,
        offsetZ,
      );
      course.rotation.z = -side * Math.atan2(rise, width / 2);
      owner.add(course);
    });
  }
}

function addBarrel(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island22FishermansVillageMaterials,
  segments: number,
) {
  const barrel = cylinder(0.17 * scale, 0.19 * scale, 0.48 * scale, materials.timber, segments);
  barrel.position.set(x, y + 0.24 * scale, z);
  owner.add(barrel);
  [-0.15, 0.15].forEach((offset) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.18 * scale, 0.018 * scale, 4, segments), materials.brass);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(x, y + (0.24 + offset) * scale, z);
    owner.add(hoop);
  });
}

function addCrate(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island22FishermansVillageMaterials,
) {
  const crate = box(0.38 * scale, 0.3 * scale, 0.34 * scale, materials.timber);
  crate.position.set(x, y + 0.15 * scale, z);
  const braceA = box(0.035 * scale, 0.34 * scale, 0.37 * scale, materials.timberDark);
  braceA.position.copy(crate.position);
  braceA.rotation.z = 0.66;
  const braceB = braceA.clone();
  braceB.rotation.z = -0.66;
  owner.add(crate, braceA, braceB);
}

function addLantern(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island22FishermansVillageMaterials,
  segments: number,
) {
  const frame = cylinder(0.12 * scale, 0.14 * scale, 0.3 * scale, materials.brass, Math.max(6, segments / 2));
  frame.position.set(x, y, z);
  const glow = cylinder(0.085 * scale, 0.095 * scale, 0.22 * scale, materials.window, Math.max(6, segments / 2));
  glow.position.copy(frame.position);
  const cap = cone(0.15 * scale, 0.16 * scale, materials.roofWarm, Math.max(6, segments / 2));
  cap.position.set(x, y + 0.23 * scale, z);
  owner.add(frame, glow, cap);
}

function addFishEmblem(
  owner: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island22FishermansVillageMaterials,
  rotationY = 0,
) {
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), materials.window);
  body.scale.set(1.65, 0.68, 0.42);
  const tail = cone(0.22, 0.38, materials.roofWarm, 3);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.48;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), materials.timberDark);
  eye.position.set(0.28, 0.05, 0.1);
  fish.add(body, tail, eye);
  fish.position.set(x, y, z);
  fish.rotation.y = rotationY;
  fish.scale.setScalar(scale);
  owner.add(fish);
}

function addPennantLine(
  owner: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  count: number,
  materials: Island22FishermansVillageMaterials,
) {
  owner.add(createBeamBetween(start, end, 0.012, materials.rope, 5));
  for (let index = 0; index < count; index += 1) {
    const progress = (index + 1) / (count + 1);
    const flag = cone(0.09, 0.3, index % 2 ? materials.window : materials.roofWarm, 3);
    flag.rotation.z = Math.PI;
    flag.position.copy(start).lerp(end, progress);
    flag.position.y -= 0.13;
    owner.add(flag);
  }
}

function addPostAndRail(
  owner: THREE.Group,
  startX: number,
  endX: number,
  z: number,
  y: number,
  materials: Island22FishermansVillageMaterials,
) {
  [startX, endX].forEach((x) => {
    const post = box(0.09, 0.58, 0.09, materials.timberDark);
    post.position.set(x, y + 0.29, z);
    owner.add(post);
  });
  const rail = box(Math.abs(endX - startX), 0.08, 0.08, materials.timber);
  rail.position.set((startX + endX) / 2, y + 0.48, z);
  owner.add(rail);
}

function addFoundation(
  owner: THREE.Group,
  width: number,
  depth: number,
  materials: Island22FishermansVillageMaterials,
  segments: number,
) {
  const stone = cylinder(Math.min(width, depth) * 0.52, Math.min(width, depth) * 0.57, 0.18, materials.stone, segments);
  stone.scale.x = width / Math.min(width, depth);
  stone.scale.z = depth / Math.min(width, depth);
  stone.position.y = 0.09;
  owner.add(stone);
  for (let step = 0; step < 3; step += 1) {
    const stair = box(0.9 + step * 0.2, 0.08, 0.28, materials.cobble);
    stair.position.set(0, 0.13 + step * 0.06, depth * 0.48 + 0.3 - step * 0.18);
    owner.add(stair);
  }
}

function createFamilyRoot(
  family: Island22PremiumLandmarkFamilyId,
  level: Island22PremiumLandmarkLevel,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_016_PREMIUM_${family.toUpperCase().split('-').join('_')}`;
  root.userData.landmarkFamily = family;
  root.userData.buildLevel = level;
  root.userData.quality = quality;
  root.userData.frontAxis = FRONT_AXIS;
  root.userData.referenceAuthority = [
    'goals/exact/016-fishermans-village-approved-v004.png',
    'generated-hypotheses/landmark-family-lineup-v001.png',
  ];
  root.userData.phoneBudget = {
    qualityScaled: true,
    lowOmitsMicroDetail: true,
    repeatedDetailsEligibleForCompaction: true,
  };
  return root;
}

function finalizeFamily(root: THREE.Group) {
  setShadows(root);
  root.children.forEach((child, index) => {
    if (!(child instanceof THREE.Group) || child.userData.partKind !== 'part') return;
    compactStaticGeometry(
      child,
      `ISLAND_016_${String(root.userData.landmarkFamily).toUpperCase().split('-').join('_')}_PART_${index}`,
    );
  });
  root.updateMatrixWorld(true);
  return root;
}

export function measureIsland22PremiumLandmarkBudget(
  family: Island22PremiumLandmarkFamilyId,
  quality: Island3DQuality,
  root: THREE.Object3D,
): Island22PremiumLandmarkBudget {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = node.geometry;
    triangleCount += geometry.index
      ? Math.floor(geometry.index.count / 3)
      : Math.floor((geometry.getAttribute('position')?.count ?? 0) / 3);
  });
  return { family, quality, meshCount, triangleCount };
}

export function createIsland22PremiumLighthouseLibrary(options: Island22PremiumLandmarkFactoryOptions) {
 const {level,quality}=options;const family: Island22PremiumLandmarkFamilyId='lighthouse-library';const root=createFamilyRoot(family,level,quality);
 const macro=markPart(new THREE.Group(),family,'macro-tower-annex',['focus','entry','market-occlusion']);macro.name='ISLAND_016_LIGHTHOUSE_LIBRARY_L1_MACRO';
 const gallery=markPart(new THREE.Group(),family,'gallery-lantern-library',['beacon','library-porch']);gallery.name='ISLAND_016_LIGHTHOUSE_LIBRARY_L2_GALLERY';
 const restored=markPart(new THREE.Group(),family,'restored-detail-system',['signal-flag','loading-crane']);restored.name='ISLAND_016_LIGHTHOUSE_LIBRARY_L3_RESTORED';
 populateIsland22LighthouseV2({macro,gallery,restored},options);
 addSocket(macro,'focus',[-.2,1.75,0]);addSocket(macro,'entry',[.82,.41,1.04]);addSocket(macro,'market-occlusion',[-1.45,.4,-.55]);
 addSocket(gallery,'beacon',[-.73,4.24,-.1]);addSocket(gallery,'library-porch',[.82,1.45,1.14]);
 addSocket(restored,'signal-flag',[-.73,5.34,-.1]);addSocket(restored,'loading-crane',[-1.45,.42,-.8]);
 root.add(macro);if(level>=2)root.add(gallery);if(level>=3)root.add(restored);return finalizeFamily(root);
}

export function createIsland22PremiumRoundLanternTavern(options: Island22PremiumLandmarkFactoryOptions) {
  const {level,quality}=options;
  const family: Island22PremiumLandmarkFamilyId='round-lantern-tavern';
  const root=createFamilyRoot(family,level,quality);
  const macro=markPart(new THREE.Group(),family,'round-macro',['focus','entry','terrace']);macro.name='ISLAND_016_ROUND_LANTERN_TAVERN_L1_MACRO';
  const lantern=markPart(new THREE.Group(),family,'roof-lantern-terrace',['roof-lantern','hanging-sign']);lantern.name='ISLAND_016_ROUND_LANTERN_TAVERN_L2_LANTERN';
  const occupied=markPart(new THREE.Group(),family,'occupied-detail-system',['chimney','service-deck']);occupied.name='ISLAND_016_ROUND_LANTERN_TAVERN_L3_OCCUPIED';
  populateIsland22TavernV2({macro,lantern,occupied},options);
  addSocket(macro,'focus',[0,1.55,0]);addSocket(macro,'entry',[0,.42,1.6]);addSocket(macro,'terrace',[0,.37,1.95]);
  addSocket(lantern,'roof-lantern',[0,3.68,0]);addSocket(lantern,'hanging-sign',[-1.82,1.72,1.0]);
  addSocket(occupied,'chimney',[-.85,3.55,-.45]);addSocket(occupied,'service-deck',[0,.37,-1.8]);
  root.add(macro);if(level>=2)root.add(lantern);if(level>=3)root.add(occupied);
  return finalizeFamily(root);
}

function createOpenBoatHull(
  length: number,
  width: number,
  height: number,
  material: THREE.Material,
) {
  const zPositions = [-length / 2, -length * 0.3, 0, length * 0.3, length / 2];
  const widths = [0.03, width * 0.42, width * 0.5, width * 0.42, 0.03];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let section = 0; section < zPositions.length; section += 1) {
    const z = zPositions[section];
    const halfWidth = widths[section];
    const v = section / (zPositions.length - 1);
    positions.push(-halfWidth, height, z, halfWidth, height, z, 0, 0, z);
    uvs.push(0, v, 1, v, 0.5, v);
  }
  for (let section = 0; section < zPositions.length - 1; section += 1) {
    const current = section * 3;
    const next = (section + 1) * 3;
    indices.push(current, next, current + 2, current + 2, next, next + 2);
    indices.push(current + 1, current + 2, next + 1, current + 2, next + 2, next + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

export function createIsland22PremiumBoatwrightYard({
  level,
  quality,
  materials,
}: Island22PremiumLandmarkFactoryOptions) {
  const family: Island22PremiumLandmarkFamilyId = 'boatwright-yard';
  const root = createFamilyRoot(family, level, quality);
  const macro = markPart(new THREE.Group(), family, 'hall-hull-gantry', ['focus','hull','gantry-hook','slipway']);
  macro.name = 'ISLAND_016_BOATWRIGHT_YARD_L1_MACRO';
  const rigging = markPart(new THREE.Group(), family, 'rigging-winch-workshop', ['winch','tool-bench']);
  rigging.name = 'ISLAND_016_BOATWRIGHT_YARD_L2_RIGGING';
  const restored = markPart(new THREE.Group(), family, 'restored-yard-detail', ['launch-line','worker-station']);
  restored.name = 'ISLAND_016_BOATWRIGHT_YARD_L3_RESTORED';
  populateIsland22BoatwrightV2({macro,rigging,restored},{level,quality,materials});
  addSocket(macro,'focus',[.35,1.35,-.05]);addSocket(macro,'hull',[.88,.9,.05]);
  addSocket(macro,'gantry-hook',[.91,2.23,-.64]);addSocket(macro,'slipway',[.88,.38,1.55]);
  addSocket(rigging,'winch',[-.15,.62,-1.18]);addSocket(rigging,'tool-bench',[-1.25,.74,-.92]);
  addSocket(restored,'launch-line',[.88,.38,1.65]);addSocket(restored,'worker-station',[-1.25,.3,-.9]);
  root.add(macro);if(level>=2)root.add(rigging);if(level>=3)root.add(restored);

  return finalizeFamily(root);
}

export function createIsland22PremiumNetHouseHatchery(options: Island22PremiumLandmarkFactoryOptions) {
  const {level,quality}=options;
  const family: Island22PremiumLandmarkFamilyId = 'net-house-hatchery';
  const root=createFamilyRoot(family,level,quality);
  const macro=markPart(new THREE.Group(),family,'net-canopy-house-trough',['focus','entry','hatchery-water','dock-edge']);
  macro.name='ISLAND_016_NET_HOUSE_HATCHERY_L1_MACRO';
  const operations=markPart(new THREE.Group(),family,'drying-frames-baskets',['sorting-bench','net-hoist']);
  operations.name='ISLAND_016_NET_HOUSE_HATCHERY_L2_OPERATIONS';
  const restored=markPart(new THREE.Group(),family,'restored-hatchery-detail',['fish-basket','water-ripple']);
  restored.name='ISLAND_016_NET_HOUSE_HATCHERY_L3_RESTORED';
  populateIsland22HatcheryV2({macro,operations,restored},options);
  addSocket(macro,'focus',[-.15,1.05,0]);addSocket(macro,'entry',[.8,.4,.78]);
  addSocket(macro,'hatchery-water',[-.79,.55,.42]);addSocket(macro,'dock-edge',[.18,.3,1.76]);
  addSocket(operations,'sorting-bench',[1.38,.91,1.08]);addSocket(operations,'net-hoist',[-1.68,1.8,.83]);
  addSocket(restored,'fish-basket',[-1.4,.66,1.3]);addSocket(restored,'water-ripple',[-.79,.55,.42]);
  root.add(macro);if(level>=2)root.add(operations);if(level>=3)root.add(restored);
  return finalizeFamily(root);
}

export function createIsland22PremiumFishMarketHall(options: Island22PremiumLandmarkFactoryOptions) {
  const { level, quality } = options;
  const family: Island22PremiumLandmarkFamilyId = 'fish-market-hall';
  const root = createFamilyRoot(family, level, quality);
  const macro = markPart(new THREE.Group(), family, 'compact-hall-loading-dock', ['focus', 'loading-crane', 'dock-ramp', 'market-apron']);
  macro.name = 'ISLAND_016_FISH_MARKET_HALL_L1_MACRO';
  const operations = markPart(new THREE.Group(), family, 'awning-crane-fish-stalls', ['crane-hook', 'fish-display', 'cargo-stack']);
  operations.name = 'ISLAND_016_FISH_MARKET_HALL_L2_OPERATIONS';
  const restored = markPart(new THREE.Group(), family, 'restored-loading-detail', ['mooring', 'worker-route']);
  restored.name = 'ISLAND_016_FISH_MARKET_HALL_L3_RESTORED';
  populateIsland22FishMarketV2({ macro, operations, restored }, options);
  addSocket(macro, 'focus', [0, 1.15, 0]);
  addSocket(macro, 'loading-crane', [-1.55, 1.46, 0.61]);
  addSocket(macro, 'dock-ramp', [-0.25, 0.28, 1.82]);
  addSocket(macro, 'market-apron', [-0.15, 0.28, 0.25]);
  addSocket(operations, 'crane-hook', [-2.35, 1.56, 0.61]);
  addSocket(operations, 'fish-display', [-0.47, 0.75, 0.91]);
  addSocket(operations, 'cargo-stack', [-1.31, 0.475, -1.03]);
  addSocket(restored, 'mooring', [-1.7, 0.50, 1.6]);
  addSocket(restored, 'worker-route', [0.22, 0.31, 1.46]);
  root.add(macro);
  if (level >= 2) root.add(operations);
  if (level >= 3) root.add(restored);
  return finalizeFamily(root);
}

export const ISLAND_22_PREMIUM_LANDMARK_FACTORIES = {
  wisdom: createIsland22PremiumLighthouseLibrary,
  event: createIsland22PremiumRoundLanternTavern,
  habit: createIsland22PremiumBoatwrightYard,
  hatchery: createIsland22PremiumNetHouseHatchery,
  fishMarket: createIsland22PremiumFishMarketHall,
} as const;
