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
  const root = new THREE.Group();
  const slopeLength = Math.hypot(width / 2, rise);
  const angle = Math.atan2(rise, width / 2);
  [-1, 1].forEach((side) => {
    const slope = box(slopeLength + 0.08, thickness, depth + 0.16, material);
    slope.position.set(side * width * 0.25, rise * 0.5, 0);
    slope.rotation.z = side * angle;
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
      course.rotation.z = side * Math.atan2(rise, width / 2);
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

export function createIsland22PremiumLighthouseLibrary({
  level,
  quality,
  materials,
}: Island22PremiumLandmarkFactoryOptions) {
  const family: Island22PremiumLandmarkFamilyId = 'lighthouse-library';
  const root = createFamilyRoot(family, level, quality);
  const segments = RADIAL_SEGMENTS[quality];

  const macro = markPart(new THREE.Group(), family, 'macro-tower-annex', ['focus', 'entry', 'market-occlusion']);
  macro.name = 'ISLAND_016_LIGHTHOUSE_LIBRARY_L1_MACRO';
  addFoundation(macro, 3.15, 2.65, materials, segments);
  const towerHeight = 2.75 + level * 0.24;
  const tower = cylinder(0.68, 0.9, towerHeight, materials.stone, segments);
  tower.position.set(-0.52, 0.27 + towerHeight / 2, -0.08);
  macro.add(tower);
  const towerPlinth = cylinder(0.94, 1.02, 0.36, materials.cliff, segments);
  towerPlinth.position.set(-0.52, 0.37, -0.08);
  macro.add(towerPlinth);
  const annex = createGablePanel(1.62, 0.94, 0.72, 1.48, materials.plaster);
  annex.position.set(0.68, 0.27, 0.02);
  macro.add(annex);
  const annexRoof = createGabledRoof(1.9, 1.68, 0.72, 0.1, materials.roof, materials.brass);
  annexRoof.position.set(0.68, 1.22, 0.02);
  macro.add(annexRoof);
  addHalfTimberFacade(macro, 1.55, 1.04, 0.78, materials, 0.68, 0.27);
  addArchedDoor(macro, 0.68, 0.28, 0.79, 0.46, 0.82, materials);
  addWindowWithFrame(macro, 0.15, 0.9, 0.8, 0.3, 0.38, materials);
  addWindowWithFrame(macro, 1.22, 0.9, 0.8, 0.3, 0.38, materials);
  for (let band = 0; band < 4; band += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.83 - band * 0.045, 0.035, 5, segments), band % 2 ? materials.cobble : materials.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.52, 0.78 + band * 0.55, -0.08);
    macro.add(ring);
  }
  addArchedDoor(macro, -0.52, 0.29, 0.79, 0.42, 0.78, materials);
  addWindowWithFrame(macro, -0.52, 1.48, 0.62, 0.28, 0.34, materials);
  addSocket(macro, 'focus', [-0.2, 1.75, 0]);
  addSocket(macro, 'entry', [0.68, 0.3, 0.94]);
  addSocket(macro, 'market-occlusion', [-1.45, 0.4, -0.55]);
  root.add(macro);

  if (level >= 2) {
    const gallery = markPart(new THREE.Group(), family, 'gallery-lantern-library', ['beacon', 'library-porch']);
    gallery.name = 'ISLAND_016_LIGHTHOUSE_LIBRARY_L2_GALLERY';
    const deck = cylinder(1.02, 1.02, 0.13, materials.brass, segments);
    deck.position.set(-0.52, towerHeight + 0.25, -0.08);
    gallery.add(deck);
    const lamp = cylinder(0.62, 0.62, 0.72, materials.window, segments);
    lamp.position.set(-0.52, towerHeight + 0.66, -0.08);
    gallery.add(lamp);
    const railCount = quality === 'low' ? 6 : quality === 'medium' ? 8 : 10;
    for (let index = 0; index < railCount; index += 1) {
      const angle = index / railCount * Math.PI * 2;
      const rail = cylinder(0.026, 0.03, 0.5, materials.brass, 5);
      rail.position.set(-0.52 + Math.cos(angle) * 0.84, towerHeight + 0.53, -0.08 + Math.sin(angle) * 0.84);
      gallery.add(rail);
    }
    const galleryRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 5, segments), materials.brass);
    galleryRing.rotation.x = Math.PI / 2;
    galleryRing.position.set(-0.52, towerHeight + 0.74, -0.08);
    gallery.add(galleryRing);
    const lanternCap = cone(0.83, 0.72, materials.roofWarm, segments);
    lanternCap.position.set(-0.52, towerHeight + 1.38, -0.08);
    gallery.add(lanternCap);
    const finial = cylinder(0.05, 0.07, 0.48, materials.brass, 6);
    finial.position.set(-0.52, towerHeight + 1.92, -0.08);
    gallery.add(finial);
    const porch = createGabledRoof(0.94, 0.62, 0.33, 0.07, materials.roofWarm, materials.brass);
    porch.position.set(0.68, 0.98, 0.92);
    gallery.add(porch);
    addSocket(gallery, 'beacon', [-0.52, towerHeight + 0.72, -0.08]);
    addSocket(gallery, 'library-porch', [0.68, 0.98, 0.92]);
    root.add(gallery);
  }

  if (level >= 3) {
    const restored = markPart(new THREE.Group(), family, 'restored-detail-system', ['signal-flag', 'loading-crane']);
    restored.name = 'ISLAND_016_LIGHTHOUSE_LIBRARY_L3_RESTORED';
    const chimney = box(0.28, 0.98, 0.28, materials.stone);
    chimney.position.set(1.22, 1.72, -0.32);
    const cap = box(0.38, 0.12, 0.38, materials.brass);
    cap.position.set(1.22, 2.25, -0.32);
    restored.add(chimney, cap);
    const bracket = createBeamBetween(new THREE.Vector3(-1.2, 1.15, 0.42), new THREE.Vector3(-1.72, 1.15, 0.42), 0.035, materials.brass);
    const chain = cylinder(0.014, 0.014, 0.42, materials.rope, 5);
    chain.position.set(-1.66, 0.94, 0.42);
    restored.add(bracket, chain);
    addLantern(restored, -1.66, 0.66, 0.42, 0.8, materials, segments);
    const pennantPole = cylinder(0.025, 0.035, 0.76, materials.brass, 5);
    pennantPole.position.set(-0.52, towerHeight + 2.35, -0.08);
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 3), materials.roofWarm);
    pennant.rotation.z = -Math.PI / 2;
    pennant.position.set(-0.28, towerHeight + 2.58, -0.08);
    restored.add(pennantPole, pennant);
    const barrelCount = quality === 'low' ? 2 : 4;
    for (let index = 0; index < barrelCount; index += 1) {
      addBarrel(restored, -1.18 + index * 0.38, 0.2, -0.94, 0.86, materials, Math.max(7, segments / 2));
    }
    addSocket(restored, 'signal-flag', [-0.52, towerHeight + 2.58, -0.08]);
    addSocket(restored, 'loading-crane', [-1.45, 0.42, -0.8]);
    // Strong phone-scale identity: illuminated slit windows, library books,
    // and a nautical pennant line break up the formerly plain tower mass.
    [1.08, 1.72, 2.34].forEach((windowY, index) => {
      const angle = index % 2 ? -0.42 : 0.5;
      const windowGroup = new THREE.Group();
      addWindowWithFrame(windowGroup, 0, 0, 0, 0.3, 0.42, materials);
      windowGroup.position.set(-0.52 + Math.sin(angle) * 0.75, windowY, -0.08 + Math.cos(angle) * 0.75);
      windowGroup.rotation.y = angle;
      restored.add(windowGroup);
    });
    for (let book = 0; book < 5; book += 1) {
      const volume = box(0.12 + (book % 2) * 0.035, 0.28 + (book % 3) * 0.04, 0.1, book % 2 ? materials.roofWarm : materials.window);
      volume.position.set(0.36 + book * 0.16, 1.05 + volume.geometry.parameters.height / 2, 0.84);
      restored.add(volume);
    }
    addPennantLine(restored, new THREE.Vector3(-1.58, 2.15, 0.46), new THREE.Vector3(0.98, 2.32, 0.54), quality === 'low' ? 3 : 6, materials);
    root.add(restored);
  }

  return finalizeFamily(root);
}

export function createIsland22PremiumRoundLanternTavern({
  level,
  quality,
  materials,
}: Island22PremiumLandmarkFactoryOptions) {
  const family: Island22PremiumLandmarkFamilyId = 'round-lantern-tavern';
  const root = createFamilyRoot(family, level, quality);
  const segments = RADIAL_SEGMENTS[quality];

  const macro = markPart(new THREE.Group(), family, 'round-macro', ['focus', 'entry', 'terrace']);
  macro.name = 'ISLAND_016_ROUND_LANTERN_TAVERN_L1_MACRO';
  addFoundation(macro, 3.15, 3.05, materials, segments);
  const bodyHeight = 1.42 + level * 0.1;
  const body = cylinder(1.34, 1.52, bodyHeight, materials.plaster, segments);
  body.position.y = 0.27 + bodyHeight / 2;
  macro.add(body);
  const timberBand = new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.085, 5, segments), materials.timberDark);
  timberBand.rotation.x = Math.PI / 2;
  timberBand.position.y = 1.05;
  macro.add(timberBand);
  const roofLower = cylinder(0.86, 1.72, 0.66, materials.roof, segments);
  roofLower.position.y = bodyHeight + 0.58;
  macro.add(roofLower);
  const roofUpper = cylinder(0.46, 0.94, 0.5, materials.roofWarm, segments);
  roofUpper.position.y = bodyHeight + 1.13;
  macro.add(roofUpper);
  const roofBand = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.055, 5, segments), materials.brass);
  roofBand.rotation.x = Math.PI / 2;
  roofBand.position.y = bodyHeight + 0.27;
  macro.add(roofBand);
  for (let index = 0; index < 5; index += 1) {
    const angle = (-0.72 + index * 0.36);
    const x = Math.sin(angle) * 1.43;
    const z = Math.cos(angle) * 1.43;
    const windowGroup = new THREE.Group();
    addWindowWithFrame(windowGroup, 0, 0, 0, 0.36, 0.5, materials);
    windowGroup.position.set(x, 0.93, z);
    windowGroup.rotation.y = angle;
    macro.add(windowGroup);
  }
  addArchedDoor(macro, 0, 0.29, 1.48, 0.54, 0.96, materials);
  for (let step = 0; step < 3; step += 1) {
    const stair = box(1.02 + step * 0.18, 0.09, 0.3, materials.cobble);
    stair.position.set(0, 0.2 + step * 0.06, 1.66 + step * 0.16);
    macro.add(stair);
  }
  addSocket(macro, 'focus', [0, 1.55, 0]);
  addSocket(macro, 'entry', [0, 0.32, 1.68]);
  addSocket(macro, 'terrace', [0, 0.28, 1.9]);
  root.add(macro);

  if (level >= 2) {
    const lantern = markPart(new THREE.Group(), family, 'roof-lantern-terrace', ['roof-lantern', 'hanging-sign']);
    lantern.name = 'ISLAND_016_ROUND_LANTERN_TAVERN_L2_LANTERN';
    const lanternBase = cylinder(0.59, 0.67, 0.18, materials.brass, segments);
    lanternBase.position.y = bodyHeight + 1.47;
    const lanternGlow = cylinder(0.48, 0.48, 0.72, materials.window, segments);
    lanternGlow.position.y = bodyHeight + 1.9;
    const lanternFrameTop = cylinder(0.57, 0.57, 0.12, materials.brass, segments);
    lanternFrameTop.position.y = bodyHeight + 2.3;
    const cap = cone(0.69, 0.62, materials.roofWarm, segments);
    cap.position.y = bodyHeight + 2.67;
    const finial = cylinder(0.05, 0.07, 0.44, materials.brass, 6);
    finial.position.y = bodyHeight + 3.16;
    lantern.add(lanternBase, lanternGlow, lanternFrameTop, cap, finial);
    const frameCount = quality === 'low' ? 6 : 8;
    for (let index = 0; index < frameCount; index += 1) {
      const angle = index / frameCount * Math.PI * 2;
      const rail = cylinder(0.026, 0.03, 0.72, materials.timberDark, 5);
      rail.position.set(Math.cos(angle) * 0.5, bodyHeight + 1.9, Math.sin(angle) * 0.5);
      lantern.add(rail);
    }
    addPostAndRail(lantern, -1.43, 1.43, 1.78, 0.27, materials);
    const signArm = createBeamBetween(new THREE.Vector3(-1.25, 1.48, 1.25), new THREE.Vector3(-1.78, 1.48, 1.25), 0.035, materials.brass);
    const signDrop = cylinder(0.015, 0.015, 0.34, materials.rope, 5);
    signDrop.position.set(-1.7, 1.29, 1.25);
    const sign = cylinder(0.19, 0.19, 0.08, materials.roofWarm, 10);
    sign.rotation.x = Math.PI / 2;
    sign.position.set(-1.7, 1.08, 1.25);
    lantern.add(signArm, signDrop, sign);
    addSocket(lantern, 'roof-lantern', [0, bodyHeight + 1.9, 0]);
    addSocket(lantern, 'hanging-sign', [-1.7, 1.08, 1.25]);
    root.add(lantern);
  }

  if (level >= 3) {
    const occupied = markPart(new THREE.Group(), family, 'occupied-detail-system', ['chimney', 'service-deck']);
    occupied.name = 'ISLAND_016_ROUND_LANTERN_TAVERN_L3_OCCUPIED';
    const chimney = box(0.34, 1.08, 0.34, materials.stone);
    chimney.position.set(-0.78, bodyHeight + 1.5, -0.42);
    const chimneyCap = box(0.46, 0.12, 0.46, materials.brass);
    chimneyCap.position.set(-0.78, bodyHeight + 2.08, -0.42);
    occupied.add(chimney, chimneyCap);
    const awningCount = quality === 'low' ? 2 : 3;
    for (let index = 0; index < awningCount; index += 1) {
      const angle = -0.62 + index * 0.62;
      const awning = box(0.58, 0.08, 0.42, index % 2 ? materials.plaster : materials.roofWarm);
      awning.position.set(Math.sin(angle) * 1.62, 1.45, Math.cos(angle) * 1.62);
      awning.rotation.y = angle;
      awning.rotation.x = 0.22;
      occupied.add(awning);
    }
    const barrelCount = quality === 'low' ? 2 : quality === 'medium' ? 4 : 6;
    for (let index = 0; index < barrelCount; index += 1) {
      const angle = -1.2 + index * 0.45;
      addBarrel(occupied, Math.sin(angle) * 1.73, 0.24, Math.cos(angle) * 1.73, 0.78, materials, Math.max(7, segments / 2));
    }
    addLantern(occupied, 1.5, 0.92, 1.28, 0.72, materials, segments);
    addLantern(occupied, -1.5, 0.92, 1.28, 0.72, materials, segments);
    addFishEmblem(occupied, -1.7, 1.08, 1.3, 0.62, materials);
    addPennantLine(occupied, new THREE.Vector3(-1.35, 2.12, 0.7), new THREE.Vector3(1.35, 2.2, 0.7), quality === 'low' ? 3 : 5, materials);
    addSocket(occupied, 'chimney', [-0.78, bodyHeight + 2.08, -0.42]);
    addSocket(occupied, 'service-deck', [0, 0.28, -1.55]);
    root.add(occupied);
  }

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
  const segments = RADIAL_SEGMENTS[quality];
  const hullPaintMaterial = materials.roofWarm.clone();
  hullPaintMaterial.name = 'ISLAND_016_BOATWRIGHT_HULL_TEAL_PAINT';
  hullPaintMaterial.color.set(0x2d7380);
  hullPaintMaterial.emissive.set(0x0d2930);
  hullPaintMaterial.emissiveIntensity = 0.08;
  hullPaintMaterial.roughness = 0.66;
  const structuralTimberMaterial = materials.timberDark.clone();
  structuralTimberMaterial.name = 'ISLAND_016_BOATWRIGHT_STRUCTURAL_TIMBER';
  structuralTimberMaterial.color.set(0x241813);
  structuralTimberMaterial.roughness = 0.9;

  const macro = markPart(new THREE.Group(), family, 'hall-hull-gantry', ['focus', 'hull', 'gantry-hook', 'slipway']);
  macro.name = 'ISLAND_016_BOATWRIGHT_YARD_L1_MACRO';
  addFoundation(macro, 3.65, 3.3, materials, segments);
  const workshop = createGablePanel(1.7, 1.0, 0.72, 1.56, materials.plaster);
  workshop.position.set(-0.88, 0.28, 0.08);
  macro.add(workshop);
  const roof = createGabledRoof(1.98, 1.78, 0.72, 0.1, materials.roof, materials.brass);
  roof.position.set(-0.88, 1.28, 0.08);
  macro.add(roof);
  addHalfTimberFacade(macro, 1.62, 1.12, 0.88, materials, -0.88, 0.28);
  addArchedDoor(macro, -0.88, 0.3, 0.9, 0.62, 0.92, materials);
  addWindowWithFrame(macro, -1.47, 0.98, 0.89, 0.34, 0.42, materials);
  const hullDisplayZ = 0.35;
  const hull = createOpenBoatHull(2.9, 1.32, 0.82, hullPaintMaterial);
  hull.position.set(0.72, 0.28, hullDisplayZ);
  hull.rotation.y = Math.PI / 2;
  macro.add(hull);
  // The open procedural hull was correct in profile but vanished at phone
  // scale. A painted inner shell and bright gunwale make the boat immediate.
  const paintedHull = new THREE.Mesh(new THREE.SphereGeometry(0.5, segments, Math.max(6, segments / 2)), hullPaintMaterial);
  paintedHull.scale.set(2.65, 0.72, 1.02);
  paintedHull.position.set(0.72, 0.66, hullDisplayZ);
  const gunwale = box(2.72, 0.11, 0.92, materials.brass);
  gunwale.position.set(0.72, 0.93, hullDisplayZ);
  const innerDeck = box(2.36, 0.08, 0.7, materials.timberDark);
  innerDeck.position.set(0.72, 0.98, hullDisplayZ);
  const hullStripe = box(2.42, 0.09, 0.045, materials.brass);
  hullStripe.name = 'ISLAND_016_BOATWRIGHT_PHONE_HULL_STRIPE';
  hullStripe.position.set(0.72, 0.7, hullDisplayZ + 0.53);
  macro.add(paintedHull, gunwale, innerDeck, hullStripe);
  addFishEmblem(macro, 0.72, 0.73, hullDisplayZ + 0.57, 0.42, materials);
  const keel = box(3.02, 0.14, 0.14, structuralTimberMaterial);
  keel.position.set(0.72, 0.26, hullDisplayZ);
  macro.add(keel);
  const ribCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  for (let index = 0; index < ribCount; index += 1) {
    const progress = index / Math.max(1, ribCount - 1);
    const x = -0.55 + progress * 2.5;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 5, 10, Math.PI), structuralTimberMaterial);
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(x, 0.86, hullDisplayZ);
    macro.add(rib);
  }
  const gantry = new THREE.Group();
  [-0.5, 1.95].forEach((x) => {
    const post = box(0.14, 2.55, 0.14, structuralTimberMaterial);
    post.position.set(x, 1.48, -1.15);
    gantry.add(post);
  });
  const cross = box(2.72, 0.16, 0.16, structuralTimberMaterial);
  cross.position.set(0.72, 2.7, -1.15);
  gantry.add(cross);
  const braceA = createBeamBetween(new THREE.Vector3(-0.5, 2.18, -1.15), new THREE.Vector3(0.1, 2.7, -1.15), 0.045, materials.timber);
  const braceB = createBeamBetween(new THREE.Vector3(1.95, 2.18, -1.15), new THREE.Vector3(1.35, 2.7, -1.15), 0.045, materials.timber);
  gantry.add(braceA, braceB);
  macro.add(gantry);
  const slipway = box(2.8, 0.14, 0.92, materials.timber);
  slipway.position.set(0.72, 0.27, 1.2);
  slipway.rotation.z = -0.08;
  macro.add(slipway);
  addSocket(macro, 'focus', [0.35, 1.35, -0.05]);
  addSocket(macro, 'hull', [0.72, 0.86, hullDisplayZ]);
  addSocket(macro, 'gantry-hook', [0.72, 2.52, -1.15]);
  addSocket(macro, 'slipway', [0.72, 0.38, 1.55]);
  root.add(macro);

  if (level >= 2) {
    const rigging = markPart(new THREE.Group(), family, 'rigging-winch-workshop', ['winch', 'tool-bench']);
    rigging.name = 'ISLAND_016_BOATWRIGHT_YARD_L2_RIGGING';
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 5, segments), materials.brass);
    pulley.position.set(0.72, 2.46, -1.15);
    const rope = cylinder(0.018, 0.018, 1.28, materials.rope, 5);
    rope.position.set(0.72, 1.8, -1.15);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 5, segments, Math.PI * 1.55), materials.brass);
    hook.position.set(0.72, 1.12, -1.15);
    hook.rotation.z = 0.3;
    rigging.add(pulley, rope, hook);
    const winchDrum = cylinder(0.22, 0.22, 0.48, materials.timber, segments);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(-0.15, 0.62, -1.18);
    const winchAxle = cylinder(0.055, 0.055, 0.74, materials.brass, 6);
    winchAxle.rotation.z = Math.PI / 2;
    winchAxle.position.copy(winchDrum.position);
    rigging.add(winchDrum, winchAxle);
    const bench = box(1.12, 0.12, 0.46, materials.timber);
    bench.position.set(-1.25, 0.62, -0.92);
    rigging.add(bench);
    const tools = quality === 'low' ? 2 : 4;
    for (let index = 0; index < tools; index += 1) {
      const tool = createBeamBetween(
        new THREE.Vector3(-1.63 + index * 0.25, 0.74, -0.9),
        new THREE.Vector3(-1.52 + index * 0.25, 1.16, -0.9),
        0.018,
        index % 2 ? materials.brass : materials.timberDark,
        5,
      );
      rigging.add(tool);
    }
    addSocket(rigging, 'winch', [-0.15, 0.62, -1.18]);
    addSocket(rigging, 'tool-bench', [-1.25, 0.74, -0.92]);
    root.add(rigging);
  }

  if (level >= 3) {
    const restored = markPart(new THREE.Group(), family, 'restored-yard-detail', ['launch-line', 'worker-station']);
    restored.name = 'ISLAND_016_BOATWRIGHT_YARD_L3_RESTORED';
    addRoofCourses(restored, 1.98, 1.78, 1.28, 0.72, quality, materials, -0.88, 0.08);
    const railCount = quality === 'low' ? 3 : 5;
    for (let index = 0; index < railCount; index += 1) {
      const beam = box(0.08, 0.07, 0.9, materials.timberDark);
      beam.position.set(-0.4 + index * 0.56, 0.38, 1.2);
      restored.add(beam);
    }
    addCrate(restored, -1.68, 0.22, -0.7, 0.9, materials);
    addCrate(restored, -1.35, 0.22, -1.1, 0.72, materials);
    addBarrel(restored, 1.73, 0.22, 1.02, 0.9, materials, Math.max(7, segments / 2));
    addLantern(restored, -1.64, 1.3, 0.88, 0.68, materials, segments);
    addFishEmblem(restored, -0.88, 1.72, 0.96, 0.78, materials);
    addPennantLine(restored, new THREE.Vector3(-0.45, 2.5, -1.13), new THREE.Vector3(1.9, 2.5, -1.13), quality === 'low' ? 3 : 5, materials);
    addSocket(restored, 'launch-line', [0.72, 0.38, 1.65]);
    addSocket(restored, 'worker-station', [-1.25, 0.3, -0.9]);
    root.add(restored);
  }

  return finalizeFamily(root);
}

function createNetGrid(
  width: number,
  depth: number,
  height: number,
  quality: Island3DQuality,
  material: THREE.Material,
) {
  const root = new THREE.Group();
  const lines = quality === 'low' ? 3 : quality === 'medium' ? 5 : 7;
  for (let index = 0; index < lines; index += 1) {
    const x = -width / 2 + index * width / Math.max(1, lines - 1);
    root.add(createBeamBetween(
      new THREE.Vector3(x, 0.12, -depth / 2),
      new THREE.Vector3(x, height, 0),
      0.012,
      material,
      5,
    ));
    root.add(createBeamBetween(
      new THREE.Vector3(x, height, 0),
      new THREE.Vector3(x, 0.12, depth / 2),
      0.012,
      material,
      5,
    ));
  }
  const crossLines = quality === 'high' ? 5 : quality === 'medium' ? 4 : 2;
  for (let row = 0; row < crossLines; row += 1) {
    const progress = (row + 1) / (crossLines + 1);
    [-1, 1].forEach((side) => {
      const y = 0.12 + Math.sin(progress * Math.PI / 2) * (height - 0.12);
      const z = side * depth / 2 * (1 - progress);
      root.add(createBeamBetween(
        new THREE.Vector3(-width / 2, y, z),
        new THREE.Vector3(width / 2, y, z),
        0.012,
        material,
        5,
      ));
    });
  }
  return root;
}

export function createIsland22PremiumNetHouseHatchery({
  level,
  quality,
  materials,
}: Island22PremiumLandmarkFactoryOptions) {
  const family: Island22PremiumLandmarkFamilyId = 'net-house-hatchery';
  const root = createFamilyRoot(family, level, quality);
  const segments = RADIAL_SEGMENTS[quality];
  const hatcheryRopeMaterial = materials.rope.clone();
  hatcheryRopeMaterial.name = 'ISLAND_016_HATCHERY_SUNLIT_NET_ROPE';
  hatcheryRopeMaterial.color.set(0xf0c98d);
  hatcheryRopeMaterial.roughness = 0.86;
  const hatcheryWaterMaterial = materials.pond.clone();
  hatcheryWaterMaterial.name = 'ISLAND_016_HATCHERY_TROUGHS_WATER';
  hatcheryWaterMaterial.color.set(0x0792a0);

  const macro = markPart(new THREE.Group(), family, 'net-canopy-house-trough', ['focus', 'entry', 'hatchery-water', 'dock-edge']);
  macro.name = 'ISLAND_016_NET_HOUSE_HATCHERY_L1_MACRO';
  addFoundation(macro, 3.55, 3.25, materials, segments);
  const trough = box(2.18, 0.44, 1.38, materials.stone);
  trough.position.set(-0.5, 0.47, 0.2);
  const water = box(1.92, 0.06, 1.14, hatcheryWaterMaterial);
  water.position.set(-0.5, 0.71, 0.2);
  macro.add(trough, water);
  const netCanopy = createNetGrid(2.38, 1.58, 1.74, quality, hatcheryRopeMaterial);
  netCanopy.position.set(-0.5, 0.68, 0.2);
  macro.add(netCanopy);
  const netHeader = box(2.52, 0.085, 0.085, materials.brass);
  netHeader.name = 'ISLAND_016_HATCHERY_PHONE_NET_HEADER';
  netHeader.position.set(-0.5, 2.43, 0.2);
  macro.add(netHeader);
  const house = createGablePanel(1.36, 0.9, 0.58, 1.34, materials.plaster);
  house.position.set(1.15, 0.28, -0.1);
  macro.add(house);
  const roof = createGabledRoof(1.62, 1.54, 0.6, 0.1, materials.roof, materials.brass);
  roof.position.set(1.15, 1.18, -0.1);
  macro.add(roof);
  addArchedDoor(macro, 1.15, 0.29, 0.61, 0.43, 0.8, materials);
  addWindowWithFrame(macro, 1.15, 0.92, 0.62, 0.31, 0.34, materials);
  addFishEmblem(macro, 1.15, 1.5, 0.72, 0.58, materials);
  [-1.7, 0.7].forEach((x) => {
    const post = cylinder(0.055, 0.07, 1.88, materials.timberDark, 6);
    post.position.set(x, 1.08, 0.2);
    macro.add(post);
  });
  addSocket(macro, 'focus', [-0.15, 1.05, 0.08]);
  addSocket(macro, 'entry', [1.15, 0.32, 0.78]);
  addSocket(macro, 'hatchery-water', [-0.5, 0.74, 0.2]);
  addSocket(macro, 'dock-edge', [-0.5, 0.28, 1.76]);
  root.add(macro);

  if (level >= 2) {
    const operations = markPart(new THREE.Group(), family, 'drying-frames-baskets', ['sorting-bench', 'net-hoist']);
    operations.name = 'ISLAND_016_NET_HOUSE_HATCHERY_L2_OPERATIONS';
    const dryingFrames = quality === 'low' ? 2 : 3;
    for (let frameIndex = 0; frameIndex < dryingFrames; frameIndex += 1) {
      const x = -1.55 + frameIndex * 0.62;
      const left = box(0.07, 1.18, 0.07, materials.timberDark);
      left.position.set(x, 0.88, -1.1);
      const right = left.clone();
      right.position.x += 0.48;
      const rail = box(0.56, 0.07, 0.07, materials.timber);
      rail.position.set(x + 0.24, 1.44, -1.1);
      operations.add(left, right, rail);
      const net = createNetGrid(0.44, 0.08, 0.86, quality === 'high' ? 'medium' : 'low', hatcheryRopeMaterial);
      net.position.set(x + 0.24, 0.48, -1.1);
      net.rotation.x = Math.PI / 2;
      operations.add(net);
    }
    const bench = box(1.24, 0.12, 0.46, materials.timber);
    bench.position.set(0.98, 0.62, 1.02);
    operations.add(bench);
    const basketCount = quality === 'low' ? 2 : 4;
    for (let index = 0; index < basketCount; index += 1) {
      const basket = cylinder(0.19, 0.24, 0.28, materials.rope, Math.max(7, segments / 2));
      basket.position.set(0.55 + index * 0.38, 0.42, 1.08 + (index % 2) * 0.28);
      operations.add(basket);
    }
    const hoistArm = createBeamBetween(new THREE.Vector3(-1.72, 1.62, 0.2), new THREE.Vector3(-2.18, 1.72, 0.2), 0.035, materials.timberDark);
    const hoistRope = cylinder(0.015, 0.015, 0.66, materials.rope, 5);
    hoistRope.position.set(-2.1, 1.34, 0.2);
    operations.add(hoistArm, hoistRope);
    addSocket(operations, 'sorting-bench', [0.98, 0.74, 1.02]);
    addSocket(operations, 'net-hoist', [-2.1, 1.0, 0.2]);
    root.add(operations);
  }

  if (level >= 3) {
    const restored = markPart(new THREE.Group(), family, 'restored-hatchery-detail', ['fish-basket', 'water-ripple']);
    restored.name = 'ISLAND_016_NET_HOUSE_HATCHERY_L3_RESTORED';
    const floatCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : 10;
    for (let index = 0; index < floatCount; index += 1) {
      const progress = index / Math.max(1, floatCount - 1);
      const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), index % 3 === 0 ? materials.window : materials.brass);
      buoy.position.set(-1.55 + progress * 2.08, 1.42 - Math.sin(progress * Math.PI) * 0.3, 0.22);
      restored.add(buoy);
    }
    addBarrel(restored, 1.7, 0.24, -0.9, 0.78, materials, Math.max(7, segments / 2));
    addCrate(restored, 1.7, 0.24, 0.96, 0.76, materials);
    addLantern(restored, 1.75, 1.34, 0.58, 0.68, materials, segments);
    addRoofCourses(restored, 1.62, 1.54, 1.18, 0.6, quality, materials, 1.15, -0.1);
    const visibleFish = quality === 'low' ? 3 : 6;
    for (let index = 0; index < visibleFish; index += 1) {
      addFishEmblem(
        restored,
        -1.25 + (index % 3) * 0.72,
        0.82 + Math.floor(index / 3) * 0.08,
        -0.12 + Math.floor(index / 3) * 0.58,
        0.34 + (index % 2) * 0.08,
        materials,
        index % 2 ? 0.35 : -0.45,
      );
    }
    addPennantLine(restored, new THREE.Vector3(-1.72, 2.05, 0.2), new THREE.Vector3(0.72, 2.02, 0.2), quality === 'low' ? 3 : 6, materials);
    addSocket(restored, 'fish-basket', [0.98, 0.74, 1.02]);
    addSocket(restored, 'water-ripple', [-0.5, 0.75, 0.2]);
    root.add(restored);
  }

  return finalizeFamily(root);
}

export function createIsland22PremiumFishMarketHall({
  level,
  quality,
  materials,
}: Island22PremiumLandmarkFactoryOptions) {
  const family: Island22PremiumLandmarkFamilyId = 'fish-market-hall';
  const root = createFamilyRoot(family, level, quality);
  const segments = RADIAL_SEGMENTS[quality];

  const macro = markPart(new THREE.Group(), family, 'compact-hall-loading-dock', ['focus', 'loading-crane', 'dock-ramp', 'market-apron']);
  macro.name = 'ISLAND_016_FISH_MARKET_HALL_L1_MACRO';
  const dock = box(3.45, 0.2, 1.35, materials.timber);
  dock.position.set(-0.25, 0.2, 1.08);
  macro.add(dock);
  const apron = box(3.2, 0.16, 1.6, materials.cobble);
  apron.position.set(-0.15, 0.18, -0.25);
  macro.add(apron);
  const hall = createGablePanel(2.18, 1.04, 0.72, 1.52, materials.plaster);
  hall.position.set(0.22, 0.28, -0.32);
  macro.add(hall);
  const roof = createGabledRoof(2.52, 1.76, 0.74, 0.1, materials.roof, materials.brass);
  roof.position.set(0.22, 1.32, -0.32);
  macro.add(roof);
  addHalfTimberFacade(macro, 2.08, 1.14, 0.46, materials, 0.22, 0.28);
  addArchedDoor(macro, 0.22, 0.3, 0.48, 0.64, 0.92, materials);
  addWindowWithFrame(macro, -0.55, 0.92, 0.48, 0.38, 0.42, materials);
  addWindowWithFrame(macro, 0.99, 0.92, 0.48, 0.38, 0.42, materials);
  [-1.62, 1.12].forEach((x) => {
    for (let pile = 0; pile < 3; pile += 1) {
      const post = cylinder(0.07, 0.085, 1.28, materials.timberDark, 7);
      post.position.set(x, -0.12, 0.58 + pile * 0.55);
      macro.add(post);
    }
  });
  addSocket(macro, 'focus', [0, 1.15, 0]);
  addSocket(macro, 'loading-crane', [-1.34, 1.55, 0.85]);
  addSocket(macro, 'dock-ramp', [-0.25, 0.28, 1.82]);
  addSocket(macro, 'market-apron', [-0.15, 0.28, 0.25]);
  root.add(macro);

  if (level >= 2) {
    const operations = markPart(new THREE.Group(), family, 'awning-crane-fish-stalls', ['crane-hook', 'fish-display', 'cargo-stack']);
    operations.name = 'ISLAND_016_FISH_MARKET_HALL_L2_OPERATIONS';
    const awningWidth = 2.24;
    const stripes = quality === 'low' ? 4 : 6;
    for (let index = 0; index < stripes; index += 1) {
      const stripe = box(awningWidth / stripes, 0.07, 0.56, index % 2 ? materials.plaster : materials.roofWarm);
      stripe.position.set(-0.9 + (index + 0.5) * awningWidth / stripes, 1.18, 0.72);
      stripe.rotation.x = 0.18;
      operations.add(stripe);
    }
    const cranePost = cylinder(0.09, 0.12, 2.35, materials.timberDark, 7);
    cranePost.position.set(-1.32, 1.4, 0.72);
    const craneArm = createBeamBetween(new THREE.Vector3(-1.32, 2.4, 0.72), new THREE.Vector3(-2.34, 2.06, 0.72), 0.07, materials.timberDark);
    const craneRope = cylinder(0.018, 0.018, 1.18, materials.rope, 5);
    craneRope.position.set(-2.25, 1.46, 0.72);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, segments, Math.PI * 1.55), materials.brass);
    hook.position.set(-2.25, 0.84, 0.72);
    operations.add(cranePost, craneArm, craneRope, hook);
    const stallCount = quality === 'low' ? 2 : 3;
    for (let index = 0; index < stallCount; index += 1) {
      const counter = box(0.64, 0.18, 0.46, materials.timber);
      counter.position.set(-0.78 + index * 0.78, 0.54, 0.9);
      const fishBed = box(0.54, 0.05, 0.36, materials.foam);
      fishBed.position.set(counter.position.x, 0.66, 0.9);
      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 5), materials.roof);
      fish.scale.set(1.65, 0.55, 0.42);
      fish.rotation.y = Math.PI / 2;
      fish.position.set(counter.position.x, 0.73, 0.9);
      operations.add(counter, fishBed, fish);
    }
    addSocket(operations, 'crane-hook', [-2.25, 0.84, 0.72]);
    addSocket(operations, 'fish-display', [0, 0.72, 0.9]);
    addSocket(operations, 'cargo-stack', [1.45, 0.3, 1.18]);
    root.add(operations);
  }

  if (level >= 3) {
    const restored = markPart(new THREE.Group(), family, 'restored-loading-detail', ['mooring', 'worker-route']);
    restored.name = 'ISLAND_016_FISH_MARKET_HALL_L3_RESTORED';
    const cargoCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : 7;
    for (let index = 0; index < cargoCount; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      addCrate(restored, 1.2 + column * 0.38, 0.27 + row * 0.28, 1.06 - row * 0.22, 0.78, materials);
    }
    addBarrel(restored, -1.48, 0.27, 1.35, 0.86, materials, Math.max(7, segments / 2));
    addBarrel(restored, -1.08, 0.27, 1.42, 0.72, materials, Math.max(7, segments / 2));
    addLantern(restored, -0.98, 1.45, 0.5, 0.68, materials, segments);
    addLantern(restored, 1.42, 1.45, 0.5, 0.68, materials, segments);
    const signArm = createBeamBetween(new THREE.Vector3(1.05, 1.74, 0.48), new THREE.Vector3(1.72, 1.74, 0.48), 0.035, materials.brass);
    const signRope = cylinder(0.015, 0.015, 0.36, materials.rope, 5);
    signRope.position.set(1.62, 1.54, 0.48);
    const signFish = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 5), materials.brass);
    signFish.scale.set(1.65, 0.62, 0.25);
    signFish.position.set(1.62, 1.3, 0.48);
    restored.add(signArm, signRope, signFish);
    addFishEmblem(restored, 0.22, 2.08, 0.5, 1.08, materials);
    addPennantLine(restored, new THREE.Vector3(-1.62, 2.22, 0.38), new THREE.Vector3(1.35, 2.28, 0.38), quality === 'low' ? 4 : 7, materials);
    addRoofCourses(restored, 2.52, 1.76, 1.32, 0.74, quality, materials, 0.22, -0.32);
    addSocket(restored, 'mooring', [-1.62, 0.45, 1.65]);
    addSocket(restored, 'worker-route', [0, 0.3, 1.46]);
    root.add(restored);
  }

  return finalizeFamily(root);
}

export const ISLAND_22_PREMIUM_LANDMARK_FACTORIES = {
  wisdom: createIsland22PremiumLighthouseLibrary,
  event: createIsland22PremiumRoundLanternTavern,
  habit: createIsland22PremiumBoatwrightYard,
  hatchery: createIsland22PremiumNetHouseHatchery,
  fishMarket: createIsland22PremiumFishMarketHall,
} as const;
