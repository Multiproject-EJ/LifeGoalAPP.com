import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';

export const ISLAND_9_HEARTSHAFT_WORLD_NAME = 'The Heartshaft Crucible';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_9_HEARTSHAFT_LANDMARK_LABELS = {
  boss: 'Heartshaft Crucible',
  hatchery: 'Blastglass Incubator',
  habit: 'The Great Fuse',
  wisdom: 'Memory Press',
  event: 'Seismic Switchyard',
} as const;

export interface Island9HeartshaftMaterials {
  basalt: THREE.MeshStandardMaterial;
  basaltLight: THREE.MeshStandardMaterial;
  ashStone: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  copperHot: THREE.MeshStandardMaterial;
  molten: THREE.MeshStandardMaterial;
  moltenCore: THREE.MeshBasicMaterial;
  furnaceGlass: THREE.MeshPhysicalMaterial;
  violetCrystal: THREE.MeshPhysicalMaterial;
  tealGlass: THREE.MeshPhysicalMaterial;
  ember: THREE.MeshStandardMaterial;
  cinder: THREE.PointsMaterial;
}

export interface Island9HeartshaftAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

export const ISLAND_9_RUNTIME_PART_IDS = [
  'caldera-network',
  'heartshaft-crucible',
  'landmark-network',
  'route-integration',
  'ambience-system',
  'caldera-wall-network',
  'lava-channel-network',
  'heartshaft-wall',
  'heartshaft-gantry-array',
  'ignition-ring',
  'blastglass-incubator',
  'great-fuse',
  'memory-press',
  'seismic-switchyard',
  'basalt-needle-field',
  'ember-flora-field',
  'gantry-truss-array',
  'chain-system',
  'shaft-strata-array',
  'incubator-cage-array',
  'fuse-segment-array',
  'memory-rune-array',
  'switchyard-valve-array',
  'conduit-pulse-network',
  'rivet-seam-system',
  'cinder-particle-field',
] as const;

type Island9RuntimePartId = typeof ISLAND_9_RUNTIME_PART_IDS[number];
interface Island9RuntimePart {
  id: Island9RuntimePartId;
  name: Island9RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland9RuntimePart(
  id: Island9RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island9RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland9RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island9RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island9RuntimePart) => {
      if (!candidate?.name || !ISLAND_9_RUNTIME_PART_IDS.includes(candidate.name)) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ ...candidate });
    });
  }));
  return { model: 'island-009-heartshaft-crucible', parts, unnamedMeshes: 0, integralMeshes };
}

const radialSegments = (quality: Island3DQuality) => quality === 'high' ? 20 : quality === 'medium' ? 14 : 10;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.66 : 0.4;
export const ISLAND_9_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.24;
export const ISLAND_9_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.24;

export function isIsland9RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_9_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_9_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function torus(radius: number, tube: number, material: THREE.Material, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createProceduralTexture(size: number, kind: 'basalt' | 'metal', relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const cellX = Math.floor(x / 18);
      const cellY = Math.floor(y / 15);
      const cell = (cellX * 31 + cellY * 47 + cellX * cellY * 7) % 29;
      const seam = x % 18 < 2 || y % 15 < 2 ? -30 : 0;
      const forge = Math.sin(x * 0.31 + y * 0.08) * 8;
      // Albedo maps modulate the material color. Keep them near neutral and
      // encode the dark palette in `color`; otherwise the map multiplies the
      // already-dark basalt down to near-black on phone displays.
      const base = relief ? 128 : kind === 'basalt' ? 202 : 218;
      const value = THREE.MathUtils.clamp(base + cell + seam + (kind === 'metal' ? forge : 0), 8, 210);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'basalt' ? 5 : 3, kind === 'basalt' ? 5 : 6);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland9HeartshaftMaterials(): Island9HeartshaftMaterials {
  const basaltMap = createProceduralTexture(128, 'basalt');
  const basaltBump = createProceduralTexture(128, 'basalt', true);
  const metalMap = createProceduralTexture(96, 'metal');
  const metalBump = createProceduralTexture(96, 'metal', true);
  return {
    basalt: new THREE.MeshStandardMaterial({ color: 0x373138, map: basaltMap, bumpMap: basaltBump, bumpScale: 0.075, roughness: 0.91, metalness: 0.02 }),
    basaltLight: new THREE.MeshStandardMaterial({ color: 0x5a4b49, map: basaltMap, bumpMap: basaltBump, bumpScale: 0.05, roughness: 0.82, metalness: 0.03 }),
    ashStone: new THREE.MeshStandardMaterial({ color: 0x4b4241, map: basaltMap, bumpMap: basaltBump, bumpScale: 0.035, roughness: 0.76, metalness: 0.04 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x474149, map: metalMap, bumpMap: metalBump, bumpScale: 0.025, roughness: 0.42, metalness: 0.82 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x28232a, map: metalMap, roughness: 0.54, metalness: 0.78 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xa65a2c, map: metalMap, bumpMap: metalBump, bumpScale: 0.02, roughness: 0.34, metalness: 0.78 }),
    copperHot: new THREE.MeshStandardMaterial({ color: 0xd16e2e, emissive: 0x692000, emissiveIntensity: 0.42, roughness: 0.28, metalness: 0.66 }),
    molten: new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff2d00, emissiveIntensity: 2.25, roughness: 0.22, metalness: 0.04 }),
    moltenCore: new THREE.MeshBasicMaterial({ color: 0xffbd45, toneMapped: false }),
    furnaceGlass: new THREE.MeshPhysicalMaterial({ color: 0xff6b21, emissive: 0xff2700, emissiveIntensity: 1.5, roughness: 0.14, transmission: 0.25, thickness: 0.5, transparent: true, opacity: 0.88, clearcoat: 0.82 }),
    violetCrystal: new THREE.MeshPhysicalMaterial({ color: 0x8e48ed, emissive: 0x5f14ce, emissiveIntensity: 1.18, roughness: 0.14, transmission: 0.2, thickness: 0.44, transparent: true, opacity: 0.92, clearcoat: 0.9 }),
    tealGlass: new THREE.MeshPhysicalMaterial({ color: 0x35e0d3, emissive: 0x087f7c, emissiveIntensity: 0.88, roughness: 0.12, transmission: 0.28, thickness: 0.34, transparent: true, opacity: 0.9, clearcoat: 0.9 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x652615, emissive: 0x3b0b00, emissiveIntensity: 0.2, roughness: 0.74 }),
    cinder: new THREE.PointsMaterial({ color: 0xff8a32, size: 0.055, transparent: true, opacity: 0.72, depthWrite: false, sizeAttenuation: true }),
  };
}

function pipeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, segments = 8) {
  const direction = end.clone().sub(start);
  const mesh = cylinder(radius, radius, direction.length(), material, segments);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function addRadialRibs(root: THREE.Group, radius: number, y: number, height: number, count: number, material: THREE.Material, name: string) {
  const group = new THREE.Group();
  group.name = name;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const rib = box(0.055, height, 0.055, material);
    rib.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    rib.rotation.y = -angle;
    group.add(rib);
  }
  root.add(group);
  return group;
}

function addRivets(root: THREE.Group, radius: number, y: number, count: number, material: THREE.Material, quality: Island3DQuality) {
  if (quality === 'low') return;
  const geometry = new THREE.SphereGeometry(0.035, 5, 4);
  const rivets = new THREE.InstancedMesh(geometry, material, count);
  rivets.name = 'ISLAND_9_RIVET_ARRAY';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    rivets.setMatrixAt(index, matrix);
  }
  rivets.instanceMatrix.needsUpdate = true;
  root.add(rivets);
}

function mergeStaticMeshesByMaterial(root: THREE.Group) {
  const buckets = new Map<string, { material: THREE.Material; entries: Array<{ geometry: THREE.BufferGeometry; object: THREE.Mesh }> }>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    let ancestor: THREE.Object3D | null = object;
    let keepSeparate = false;
    while (ancestor && ancestor !== root) {
      if (ancestor.userData.keepSeparate) { keepSeparate = true; break; }
      ancestor = ancestor.parent;
    }
    if (object.children.length > 0 || keepSeparate) return;
    if (Array.isArray(object.material) || object.material.transparent) return;
    const clonedGeometry = object.geometry.clone();
    const geometry = clonedGeometry.index ? clonedGeometry.toNonIndexed() : clonedGeometry;
    if (geometry !== clonedGeometry) clonedGeometry.dispose();
    geometry.applyMatrix4(root.matrixWorld.clone().invert().multiply(object.matrixWorld));
    const attributes = geometry.attributes as Record<string, THREE.BufferAttribute | THREE.InterleavedBufferAttribute>;
    const attributeSignature = Object.entries(attributes)
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
      .sort()
      .join('|');
    const bucketKey = `${object.material.uuid}:${attributeSignature}`;
    const bucket = buckets.get(bucketKey) ?? {
      material: object.material,
      entries: [] as Array<{ geometry: THREE.BufferGeometry; object: THREE.Mesh }>,
    };
    const entries = bucket.entries;
    entries.push({ geometry, object });
    buckets.set(bucketKey, bucket);
  });
  let index = 0;
  buckets.forEach(({ entries, material }) => {
    if (entries.length < 2) {
      entries.forEach(({ geometry }) => geometry.dispose());
      return;
    }
    entries.forEach(({ object }) => { object.visible = false; });
    const geometries = entries.map(({ geometry }) => geometry);
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `ISLAND_9_STATIC_MATERIAL_BATCH_${index += 1}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
}

function createStairApproach(materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const step = box(0.82 + index * 0.12, 0.09, 0.22, materials.ashStone);
    step.position.set(0, 0.05 + index * 0.07, 0.5 + index * 0.18);
    root.add(step);
  }
  return root;
}

function addLandmarkPlinth(root: THREE.Group, radius: number, materials: Island9HeartshaftMaterials, quality: Island3DQuality) {
  const base = cylinder(radius * 0.88, radius, 0.3, materials.basalt, radialSegments(quality));
  base.position.y = 0.1;
  const upper = cylinder(radius * 0.76, radius * 0.82, 0.16, materials.ashStone, radialSegments(quality));
  upper.position.y = 0.31;
  const trim = torus(radius * 0.77, 0.04, materials.copper, radialSegments(quality) * 2);
  trim.position.y = 0.4;
  root.add(base, upper, trim);
  addRivets(root, radius * 0.77, 0.405, Math.round(12 * detailScale(quality)), materials.copper, quality);
}

function addCagedFurnace(root: THREE.Group, y: number, radius: number, materials: Island9HeartshaftMaterials, quality: Island3DQuality, name: string) {
  const cage = new THREE.Group();
  cage.name = name;
  cage.userData.keepSeparate = true;
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, quality === 'high' ? 2 : 1), materials.furnaceGlass);
  bulb.scale.y = 1.16;
  bulb.position.y = y;
  cage.add(bulb);
  const top = torus(radius * 0.94, 0.045, materials.copper, radialSegments(quality));
  const bottom = top.clone();
  top.position.y = y + radius * 0.62;
  bottom.position.y = y - radius * 0.62;
  cage.add(top, bottom);
  addRadialRibs(cage, radius * 0.91, y, radius * 1.45, quality === 'high' ? 10 : 7, materials.copper, `${name}_RIBS`);
  root.add(cage);
  return cage;
}

function createBlastglassIncubator(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_BLASTGLASS_INCUBATOR_PIVOT';
  addLandmarkPlinth(root, 1.05, materials, quality);
  root.add(createStairApproach(materials));
  const furnaceBase = cylinder(0.55, 0.68, 0.7, materials.steelDark, radialSegments(quality));
  furnaceBase.position.y = 0.72;
  root.add(furnaceBase);
  const lower = addCagedFurnace(root, 1.36, 0.42, materials, quality, 'ISLAND_9_INCUBATOR_CAGE');
  if (level >= 2) {
    const upper = addCagedFurnace(root, 2.13, 0.36, materials, quality, 'ISLAND_9_INCUBATOR_CAGE');
    upper.rotation.y = Math.PI / 10;
    const waist = cylinder(0.31, 0.36, 0.27, materials.steel, radialSegments(quality));
    waist.position.y = 1.75;
    root.add(waist);
  }
  if (level >= 3) {
    const cap = cylinder(0.24, 0.38, 0.42, materials.steelDark, radialSegments(quality));
    cap.position.y = 2.65;
    const chimney = cylinder(0.12, 0.16, 0.88, materials.copper, 10);
    chimney.position.set(0.55, 1.92, 0.08);
    const exhaust = torus(0.16, 0.045, materials.copper, 14);
    exhaust.position.set(0.55, 2.36, 0.08);
    root.add(cap, chimney, exhaust);
    const sidePipe = pipeBetween(new THREE.Vector3(0.42, 0.9, 0), new THREE.Vector3(0.7, 1.55, 0), 0.075, materials.copper, 8);
    root.add(sidePipe);
  }
  lower.userData.phaseOffset = 0;
  return root;
}

function addFlywheel(root: THREE.Group, x: number, y: number, radius: number, materials: Island9HeartshaftMaterials, quality: Island3DQuality, name: string) {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.userData.keepSeparate = true;
  wheel.position.set(x, y, 0);
  wheel.rotation.y = Math.PI / 2;
  const rim = torus(radius, 0.055, materials.copper, radialSegments(quality) * 2);
  rim.rotation.x = 0;
  wheel.add(rim);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    wheel.add(pipeBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0), 0.025, materials.copper, 6));
  }
  root.add(wheel);
  return wheel;
}

function createGreatFuse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_GREAT_FUSE_PIVOT';
  addLandmarkPlinth(root, 1.04, materials, quality);
  root.add(createStairApproach(materials));
  const socket = cylinder(0.58, 0.72, 0.7, materials.steelDark, radialSegments(quality));
  socket.position.y = 0.72;
  root.add(socket);
  const segmentCount = level === 1 ? 3 : level === 2 ? 5 : 7;
  const fuseCore = cylinder(0.26, 0.3, 0.42 * segmentCount, materials.molten, radialSegments(quality));
  fuseCore.position.y = 1.13 + segmentCount * 0.21;
  fuseCore.name = 'ISLAND_9_FUSE_CORE';
  fuseCore.userData.keepSeparate = true;
  root.add(fuseCore);
  for (let index = 0; index <= segmentCount; index += 1) {
    const band = torus(0.39, 0.07, materials.copper, radialSegments(quality));
    band.position.y = 1.08 + index * 0.42;
    root.add(band);
  }
  addRadialRibs(root, 0.38, 1.08 + segmentCount * 0.21, segmentCount * 0.42, 6, materials.steel, 'ISLAND_9_FUSE_CAGE_RIBS');
  if (level >= 2) addFlywheel(root, -0.55, 1.25, 0.46, materials, quality, 'ISLAND_9_FUSE_FLYWHEEL');
  if (level >= 3) {
    const crown = cylinder(0.34, 0.48, 0.32, materials.steelDark, radialSegments(quality));
    crown.position.y = 1.22 + segmentCount * 0.42;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 9), materials.moltenCore);
    flame.position.y = crown.position.y + 0.44;
    root.add(crown, flame);
    const returnPipe = new THREE.Group();
    returnPipe.add(
      pipeBetween(new THREE.Vector3(0.42, 1.1, 0), new THREE.Vector3(0.78, 2.25, 0), 0.075, materials.copper, 8),
      pipeBetween(new THREE.Vector3(0.78, 2.25, 0), new THREE.Vector3(0.38, 3.34, 0), 0.075, materials.copper, 8),
    );
    root.add(returnPipe);
  }
  return root;
}

function createMemoryPress(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_MEMORY_PRESS_PIVOT';
  addLandmarkPlinth(root, 1.07, materials, quality);
  root.add(createStairApproach(materials));
  const drumPivot = new THREE.Group();
  drumPivot.name = 'ISLAND_9_MEMORY_RUNE_DRUM';
  drumPivot.userData.keepSeparate = true;
  drumPivot.position.set(0, 1.12, 0);
  drumPivot.rotation.z = Math.PI / 2;
  const drum = cylinder(0.5, 0.5, 0.82, materials.copperHot, radialSegments(quality));
  drumPivot.add(drum);
  for (let index = -1; index <= 1; index += 1) {
    const band = torus(0.51, 0.035, materials.steelDark, radialSegments(quality));
    band.rotation.y = Math.PI / 2;
    band.position.y = index * 0.27;
    drumPivot.add(band);
  }
  root.add(drumPivot);
  const table = box(1.34, 0.17, 0.64, materials.steel);
  table.position.set(0, 0.68, 0.38);
  root.add(table);
  if (level >= 2) {
    const posts = [-0.62, 0.62].map((x) => {
      const post = box(0.16, 1.68, 0.18, materials.steelDark);
      post.position.set(x, 1.35, 0.12);
      return post;
    });
    const lintel = box(1.42, 0.2, 0.22, materials.copper);
    lintel.position.set(0, 2.16, 0.12);
    const stamp = cylinder(0.22, 0.28, 0.55, materials.copperHot, 10);
    stamp.name = 'ISLAND_9_MEMORY_STAMP';
    stamp.userData.keepSeparate = true;
    stamp.position.set(0, 1.72, 0.12);
    root.add(...posts, lintel, stamp);
  }
  if (level >= 3) {
    [-0.78, 0.78].forEach((x) => {
      const pylon = cylinder(0.13, 0.2, 1.12, materials.steelDark, 8);
      pylon.position.set(x, 1.02, -0.14);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), materials.tealGlass);
      crystal.position.set(x, 1.68, -0.14);
      root.add(pylon, crystal);
    });
    addFlywheel(root, 0.72, 1.28, 0.33, materials, quality, 'ISLAND_9_PRESS_INDEX_WHEEL');
    const archiveCrown = cylinder(0.16, 0.28, 0.38, materials.steelDark, 9);
    archiveCrown.position.set(0, 2.38, 0.12);
    const indexCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), materials.tealGlass);
    indexCrystal.position.set(0, 2.68, 0.12);
    root.add(archiveCrown, indexCrystal);
  }
  return root;
}

function createValveWheel(materials: Island9HeartshaftMaterials, quality: Island3DQuality, scale = 1) {
  const wheel = new THREE.Group();
  const rim = torus(0.18 * scale, 0.026 * scale, materials.copper, radialSegments(quality));
  rim.rotation.x = 0;
  wheel.add(rim);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    wheel.add(pipeBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(angle) * 0.17 * scale, Math.sin(angle) * 0.17 * scale, 0), 0.012 * scale, materials.copper, 5));
  }
  return wheel;
}

function createSeismicSwitchyard(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_SEISMIC_SWITCHYARD_PIVOT';
  addLandmarkPlinth(root, 1.08, materials, quality);
  root.add(createStairApproach(materials));
  const vessel = new THREE.Mesh(new THREE.DodecahedronGeometry(level === 1 ? 0.43 : 0.54, quality === 'high' ? 1 : 0), materials.violetCrystal);
  vessel.position.set(0, level === 1 ? 1.05 : 1.32, 0);
  vessel.scale.y = 1.22;
  vessel.name = 'ISLAND_9_PRESSURE_CRYSTAL';
  root.add(vessel);
  addRadialRibs(root, level === 1 ? 0.48 : 0.59, vessel.position.y, level === 1 ? 0.92 : 1.18, quality === 'high' ? 9 : 6, materials.copper, 'ISLAND_9_PRESSURE_CAGE');
  if (level >= 2) {
    [-0.67, 0.67].forEach((x, index) => {
      const piston = cylinder(0.13, 0.16, 0.76, materials.steel, 8);
      piston.name = 'ISLAND_9_SWITCHYARD_PISTON';
      piston.userData.keepSeparate = true;
      piston.position.set(x, 0.94 + index * 0.12, 0.1);
      const wheel = createValveWheel(materials, quality, 1);
      wheel.name = 'ISLAND_9_SWITCHYARD_VALVE';
      wheel.userData.keepSeparate = true;
      wheel.position.set(x, 1.25 + index * 0.12, 0.22);
      root.add(piston, wheel);
    });
  }
  if (level >= 3) {
    const crown = cylinder(0.3, 0.5, 0.32, materials.steelDark, radialSegments(quality));
    crown.position.y = 2.04;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), materials.violetCrystal);
    crystal.position.y = 2.34;
    root.add(crown, crystal);
    for (let index = 0; index < 4; index += 1) {
      const angle = -0.95 + index * 0.62;
      const gauge = cylinder(0.13, 0.13, 0.055, materials.ashStone, 12);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(Math.sin(angle) * 0.74, 0.78 + (index % 2) * 0.25, Math.cos(angle) * 0.52);
      root.add(gauge);
    }
  }
  return root;
}

function createGantry(index: number, level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_HEARTSHAFT_GANTRY';
  root.userData.keepSeparate = true;
  const angle = [Math.PI * 0.82, Math.PI * 0.08, Math.PI * 1.52][index];
  // Local -X is the boom direction. Rotating by the radial angle aims every
  // asymmetric boom toward the shaft centre; the earlier inverse rotation
  // sent the arms outward behind the caldera wall.
  root.rotation.y = angle;
  const radius = [2.14, 2.18, 2.06][index];
  root.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  const footing = cylinder(0.28, 0.39, 0.5, materials.steelDark, radialSegments(quality));
  footing.position.y = 0.36;
  const tower = box(0.23, 1.35 + index * 0.12, 0.3, materials.steel);
  tower.position.y = 1.18 + index * 0.06;
  root.add(footing, tower);
  if (level >= 2 || index === 0) {
    const armLength = [1.7, 1.55, 1.82][index];
    const arm = box(armLength, 0.18, 0.23, materials.steel);
    arm.position.set(-armLength * 0.42, 1.8 + index * 0.12, 0);
    arm.rotation.z = [0.16, -0.06, 0.1][index];
    root.add(arm);
    const upperRail = pipeBetween(new THREE.Vector3(0, 1.88, 0), new THREE.Vector3(-armLength * 0.82, 2.08 + index * 0.08, 0), 0.035, materials.copper, 6);
    root.add(upperRail);
    const wheel = addFlywheel(root, 0, 1.68, 0.28, materials, quality, 'ISLAND_9_GANTRY_DRIVE_WHEEL');
    wheel.rotation.y = 0;
    if (level >= 3) {
      const chainEnd = new THREE.Vector3(-armLength * 0.82, 0.88, 0);
      const chain = pipeBetween(new THREE.Vector3(-armLength * 0.82, 1.94, 0), chainEnd, 0.018, materials.copper, 5);
      chain.name = 'ISLAND_9_GANTRY_CHAIN';
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.48, 7), materials.copperHot);
      finial.position.set(0, 2.18 + index * 0.12, 0);
      root.add(chain, finial);
    }
  }
  return root;
}

function createHeartshaftCrucible(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island9HeartshaftMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_9_HEARTSHAFT_CRUCIBLE_PIVOT';
  const rim = torus(2.46, 0.1, materials.copper, radialSegments(quality) * 3);
  rim.position.y = 0.26;
  root.add(rim);
  const gantryCount = level === 1 ? 1 : 3;
  for (let index = 0; index < gantryCount; index += 1) root.add(createGantry(index, level, quality, materials));
  if (level >= 3) {
    const ringPivot = new THREE.Group();
    ringPivot.name = 'ISLAND_9_IGNITION_RING_PIVOT';
    ringPivot.userData.keepSeparate = true;
    ringPivot.position.y = 0.78;
    const outer = torus(0.92, 0.09, materials.copperHot, radialSegments(quality) * 2);
    const inner = torus(0.7, 0.035, materials.steel, radialSegments(quality) * 2);
    ringPivot.add(outer, inner);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      ringPivot.add(pipeBetween(new THREE.Vector3(Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72), new THREE.Vector3(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9), 0.025, materials.copper, 5));
    }
    root.add(ringPivot);
  }
  return root;
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

export function buildIsland9HeartshaftLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island9HeartshaftMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_9_HEARTSHAFT_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  const partId: Island9RuntimePartId = definition.id === 'hatchery' ? 'blastglass-incubator' : definition.id === 'habit' ? 'great-fuse' : definition.id === 'wisdom' ? 'memory-press' : definition.id === 'event' ? 'seismic-switchyard' : 'heartshaft-crucible';
  const focusSocket = new THREE.Object3D();
  focusSocket.name = `ISLAND_9_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focusSocket.position.set(0, definition.id === 'boss' ? 0.8 : 1.25, 0);
  root.add(focusSocket);
  const runtimeParts: Island9RuntimePart[] = [registerIsland9RuntimePart(partId, root, 'landmark')];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-009-heartshaft',
    parts: runtimeParts,
    sockets: { focus: focusSocket.name },
    colliders: [{ id: `${definition.id}-focus-trigger`, type: 'cylinder', isTrigger: true, radius: definition.id === 'boss' ? 2.5 : 1.14 }],
    destructionGroups: [{ id: `${definition.id}-architecture`, breakable: false, partIds: [partId] }],
    attachment: { parentId: 'landmark-network', parentSocket: `${definition.id}-basalt-shelf`, localStart: [0, 0, 0], localEnd: [0, 0.1, 0], contactType: 'embedded', embedDepth: 0.1, gapTolerance: 0.01 },
  };
  if (level === 0) {
    if (definition.id === 'boss') {
      const rim = torus(2.46, 0.08, materials.copper, radialSegments(quality) * 2);
      rim.position.y = 0.25;
      root.add(rim);
    } else addLandmarkPlinth(root, 1.04, materials, quality);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createBlastglassIncubator(resolved, quality, materials)
      : definition.id === 'habit'
        ? createGreatFuse(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createMemoryPress(resolved, quality, materials)
          : definition.id === 'event'
            ? createSeismicSwitchyard(resolved, quality, materials)
            : createHeartshaftCrucible(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    const scale = definition.id === 'boss'
      ? resolved === 3 ? 1.08 : resolved === 2 ? 1.02 : 0.96
      : resolved === 3 ? 1.42 : resolved === 2 ? 1.31 : 1.2;
    building.scale.setScalar(scale);
    if (definition.id === 'boss') {
      const verticalEmphasis = resolved === 3 ? 1.3 : resolved === 2 ? 1.16 : 1.04;
      building.scale.y *= verticalEmphasis;
    }
    root.add(building);
    const extraPart: Island9RuntimePartId = definition.id === 'boss' ? 'heartshaft-gantry-array' : definition.id === 'hatchery' ? 'incubator-cage-array' : definition.id === 'habit' ? 'fuse-segment-array' : definition.id === 'wisdom' ? 'memory-rune-array' : 'switchyard-valve-array';
    runtimeParts.push(registerIsland9RuntimePart(extraPart, building, 'landmark-architecture'));
    if (definition.id === 'boss' && resolved === 3) {
      const ring = building.getObjectByName('ISLAND_9_IGNITION_RING_PIVOT');
      if (ring) runtimeParts.push(registerIsland9RuntimePart('ignition-ring', ring, 'boss-mechanism'));
    }
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  // Static structural parts are authored individually for clarity, then
  // collapsed by material for the phone renderer. Named animated pivots stay
  // separate and retain their action-ready hierarchy.
  const animatedGroups: THREE.Group[] = [];
  root.traverse((object) => {
    if (object !== root && object instanceof THREE.Group && object.userData.keepSeparate) animatedGroups.push(object);
  });
  animatedGroups.reverse().forEach((group) => mergeStaticMeshesByMaterial(group));
  mergeStaticMeshesByMaterial(root);
  markShadows(root, quality === 'high');
  return root;
}

function createBasaltNeedle(height: number, radius: number, materials: Island9HeartshaftMaterials, quality: Island3DQuality) {
  const needle = new THREE.Mesh(new THREE.ConeGeometry(radius, height, quality === 'high' ? 7 : 5), materials.basalt);
  needle.rotation.z = (radius * 7.3) % 0.14 - 0.07;
  return needle;
}

function addConduit(root: THREE.Group, points: THREE.Vector3[], materials: Island9HeartshaftMaterials, quality: Island3DQuality, name: string) {
  const curve = new THREE.CatmullRomCurve3(points);
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, radialSegments(quality) * 2, 0.055, 6, false), materials.molten);
  pipe.name = name;
  root.add(pipe);
  return pipe;
}

export function createIsland9HeartshaftLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island9HeartshaftMaterials,
  sharedWater: THREE.Mesh,
): Island9HeartshaftAmbienceRuntime {
  const quality = profile.id;
  sharedWater.visible = false;
  const root = new THREE.Group();
  root.name = 'ISLAND_9_HEARTSHAFT_LIVING_AMBIENCE';
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-009-heartshaft',
    parts: [],
    sockets: { ambience: 'ISLAND_9_AMBIENCE_ORIGIN_SOCKET' },
    colliders: [{ id: 'island-009-caldera-envelope', type: 'compound', isTrigger: false }],
    destructionGroups: [{ id: 'heartshaft-world-static', breakable: false, partIds: ['caldera-network', 'heartshaft-wall'] }],
  };

  const terrain = new THREE.Group();
  terrain.name = 'ISLAND_9_CALDERA_NETWORK';
  const landTop = new THREE.Mesh(new THREE.RingGeometry(2.52, 8.25, radialSegments(quality) * 4, 3), materials.basalt);
  landTop.rotation.x = -Math.PI / 2;
  landTop.position.y = 0.18;
  landTop.receiveShadow = true;
  const landWall = cylinder(8.15, 8.55, 0.82, materials.basalt, radialSegments(quality) * 3);
  landWall.position.y = -0.23;
  const outerRim = torus(8.08, 0.25, materials.basaltLight, radialSegments(quality) * 3);
  outerRim.position.y = 0.24;
  terrain.add(landWall, landTop, outerRim);
  const shaftWallMaterial = materials.basalt.clone();
  shaftWallMaterial.side = THREE.BackSide;
  const shaftWall = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.38, 6.8, radialSegments(quality) * 3, 10, true), shaftWallMaterial);
  shaftWall.name = 'ISLAND_9_DEEP_SHAFT_WALL';
  shaftWall.position.y = -3.2;
  terrain.add(shaftWall);
  const shaftGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4b0a,
    transparent: true,
    opacity: 0.32,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const shaftGlow = new THREE.Mesh(new THREE.CylinderGeometry(2.38, 1.32, 6.55, radialSegments(quality) * 2, 1, true), shaftGlowMaterial);
  shaftGlow.name = 'ISLAND_9_SHAFT_INTERIOR_GLOW';
  shaftGlow.position.y = -3.28;
  terrain.add(shaftGlow);
  const depthPlateDefs: Array<[number, number, THREE.Material]> = [
    [1.98, -1.05, materials.steelDark],
    [1.55, -2.35, materials.ember],
    [1.08, -3.72, materials.molten],
    [0.58, -5.12, materials.moltenCore],
  ];
  depthPlateDefs.forEach(([radius, y, material], index) => {
    const plate = new THREE.Mesh(new THREE.CircleGeometry(radius, radialSegments(quality) * 2), material);
    plate.name = `ISLAND_9_SHAFT_DEPTH_PLATE_${index + 1}`;
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = y;
    terrain.add(plate);
    const lip = torus(radius, index < 2 ? 0.045 : 0.07, index < 2 ? materials.copperHot : materials.moltenCore, radialSegments(quality) * 2);
    lip.position.y = y + 0.035;
    terrain.add(lip);
  });
  for (let index = 0; index < 9; index += 1) {
    const depthRing = torus(2.36 - index * 0.12, index % 2 ? 0.032 : 0.065, index % 2 ? materials.copper : materials.moltenCore, radialSegments(quality) * 2);
    depthRing.name = 'ISLAND_9_SHAFT_DEPTH_RING';
    depthRing.position.y = -0.25 - index * 0.62;
    terrain.add(depthRing);
  }
  const shaftRibCount = quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
  const shaftRibGeometry = new THREE.BoxGeometry(0.065, 4.9, 0.055);
  const shaftRibs = new THREE.InstancedMesh(shaftRibGeometry, materials.copperHot, shaftRibCount);
  shaftRibs.name = 'ISLAND_9_DESCENDING_SHAFT_RIBS';
  const ribDummy = new THREE.Object3D();
  for (let index = 0; index < shaftRibCount; index += 1) {
    const angle = index / shaftRibCount * Math.PI * 2;
    const radius = 2.18;
    ribDummy.position.set(Math.cos(angle) * radius, -2.55, Math.sin(angle) * radius);
    ribDummy.rotation.set(0.12 * Math.sin(angle * 3), -angle, 0.18 * Math.cos(angle));
    ribDummy.updateMatrix();
    shaftRibs.setMatrixAt(index, ribDummy.matrix);
  }
  shaftRibs.instanceMatrix.needsUpdate = true;
  terrain.add(shaftRibs);
  const magmaHeart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.29, 2), materials.moltenCore);
  magmaHeart.name = 'ISLAND_9_MAGMA_HEART';
  magmaHeart.position.y = -5.78;
  const magmaHalo = new THREE.PointLight(0xff3b0a, quality === 'high' ? 22 : 15, 10, 1.6);
  magmaHalo.name = 'ISLAND_9_MAGMA_HEART_LIGHT';
  magmaHalo.position.y = -4.8;
  terrain.add(magmaHeart, magmaHalo);
  const rimLightA = new THREE.PointLight(0xff7a35, quality === 'high' ? 9 : 6, 7, 1.7);
  rimLightA.position.set(-2.3, 1.15, 1.1);
  const rimLightB = new THREE.PointLight(0xff4f20, quality === 'high' ? 7 : 5, 6, 1.8);
  rimLightB.position.set(2.1, 0.85, -1.2);
  terrain.add(rimLightA, rimLightB);
  const innerLip = torus(2.51, 0.14, materials.basaltLight, radialSegments(quality) * 3);
  innerLip.position.y = 0.25;
  const innerCopper = torus(2.43, 0.045, materials.copperHot, radialSegments(quality) * 3);
  innerCopper.position.y = 0.31;
  terrain.add(innerLip, innerCopper);
  const heatLights: THREE.PointLight[] = [];
  const addHeatLight = (x: number, y: number, z: number, color: number, intensity: number, distance: number) => {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.set(x, y, z);
    heatLights.push(light);
    root.add(light);
  };
  addHeatLight(-4.55, 1.35, -4.05, 0xff5a24, quality === 'high' ? 5 : 3.5, 4.2);
  addHeatLight(4.55, 1.45, -4.05, 0xff6c2e, quality === 'high' ? 5 : 3.5, 4.2);
  addHeatLight(-4.55, 1.25, 4.05, 0x28c9c1, quality === 'high' ? 3 : 2, 3.5);
  addHeatLight(4.55, 1.3, 4.05, 0x8d39ff, quality === 'high' ? 4 : 2.8, 3.8);

  const satellites: Array<[number, number]> = [[-4.55, -4.05], [4.55, -4.05], [-4.55, 4.05], [4.55, 4.05]];
  satellites.forEach(([x, z], index) => {
    const shelf = cylinder(2.05, 2.25, 0.5, materials.basalt, radialSegments(quality));
    shelf.position.set(x, 0.05 + (index % 2) * 0.03, z);
    shelf.scale.z = 0.82;
    const rim = torus(1.73, 0.06, materials.copper, radialSegments(quality) * 2);
    rim.position.set(x, 0.32, z);
    rim.scale.z = 0.82;
    terrain.add(shelf, rim);
  });

  const horizon = new THREE.Group();
  horizon.name = 'ISLAND_9_CALDERA_WALL_NETWORK';
  const cliffCount = Math.round((quality === 'high' ? 38 : quality === 'medium' ? 28 : 20));
  for (let index = 0; index < cliffCount; index += 1) {
    const angle = index / cliffCount * Math.PI * 2;
    const radius = 9.1 + ((index * 17) % 5) * 0.18;
    const height = 1.4 + ((index * 29) % 11) * 0.2;
    const needle = createBasaltNeedle(height, 0.48 + (index % 4) * 0.08, materials, quality);
    needle.position.set(Math.cos(angle) * radius, height * 0.5 - 0.05, Math.sin(angle) * radius);
    needle.rotation.y = -angle;
    horizon.add(needle);
    if (index % 9 === 3) {
      const fall = box(0.18, height * 0.72, 0.045, materials.molten);
      fall.name = 'ISLAND_9_LAVA_FALL';
      fall.position.set(Math.cos(angle) * (radius - 0.5), height * 0.44, Math.sin(angle) * (radius - 0.5));
      fall.lookAt(0, fall.position.y, 0);
      horizon.add(fall);
    }
  }

  const conduits = new THREE.Group();
  conduits.name = 'ISLAND_9_CONDUIT_PULSE_NETWORK';
  const conduitTargets = [[-4.55, -4.05], [4.55, -4.05], [-4.55, 4.05], [4.55, 4.05]];
  conduitTargets.forEach(([x, z], index) => {
    const start = new THREE.Vector3(Math.sign(x) * 2.72, 0.23, Math.sign(z) * 2.72);
    const end = new THREE.Vector3(x * 0.74, 0.24, z * 0.74);
    const elbow = new THREE.Vector3((start.x + end.x) * 0.5 + (index % 2 ? 0.2 : -0.2), 0.25, (start.z + end.z) * 0.5);
    const pipe = addConduit(conduits, [start, elbow, end], materials, quality, 'ISLAND_9_REACTIVE_CONDUIT');
    pipe.userData.phaseOffset = index * 0.23;
  });

  const needleField = new THREE.Group();
  needleField.name = 'ISLAND_9_BASALT_NEEDLE_FIELD';
  const needleCount = Math.round((quality === 'high' ? 28 : quality === 'medium' ? 18 : 10));
  for (let index = 0; index < needleCount; index += 1) {
    const angle = index * 2.39996;
    const radius = 4.45 + (index % 5) * 0.63;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isIsland9RouteCorridorClear(x, z, 0.22)) continue;
    if (satellites.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.72)) continue;
    const height = 0.4 + (index % 7) * 0.12;
    const needle = createBasaltNeedle(height, 0.11 + (index % 3) * 0.035, materials, quality);
    needle.position.set(x, 0.2 + height * 0.5, z);
    needleField.add(needle);
  }

  const emberFlora = new THREE.Group();
  emberFlora.name = 'ISLAND_9_EMBER_FLORA_FIELD';
  const floraCount = Math.round(22 * detailScale(quality));
  for (let index = 0; index < floraCount; index += 1) {
    const angle = index * 2.13;
    const radius = 7 + (index % 3) * 0.34;
    const cluster = new THREE.Group();
    cluster.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
    for (let petal = 0; petal < 4; petal += 1) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + (petal % 2) * 0.03, 0), petal === 0 && index % 6 === 0 ? materials.violetCrystal : materials.ember);
      crystal.position.set((petal - 1.5) * 0.07, 0.05 + (petal % 2) * 0.08, Math.sin(petal) * 0.06);
      crystal.scale.y = 1.8;
      cluster.add(crystal);
    }
    emberFlora.add(cluster);
  }

  const cinderCount = quality === 'high' ? 120 : quality === 'medium' ? 68 : 34;
  const cinderPositions = new Float32Array(cinderCount * 3);
  for (let index = 0; index < cinderCount; index += 1) {
    const angle = index * 2.39996;
    const radius = 1.5 + (index % 19) * 0.43;
    cinderPositions[index * 3] = Math.cos(angle) * radius;
    cinderPositions[index * 3 + 1] = 0.4 + (index % 17) * 0.18;
    cinderPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const cinderGeometry = new THREE.BufferGeometry();
  cinderGeometry.setAttribute('position', new THREE.BufferAttribute(cinderPositions, 3));
  const cinders = new THREE.Points(cinderGeometry, materials.cinder);
  cinders.name = 'ISLAND_9_CINDER_PARTICLE_FIELD';

  root.add(terrain, horizon, conduits, needleField, emberFlora, cinders);
  mergeStaticMeshesByMaterial(terrain);
  mergeStaticMeshesByMaterial(horizon);
  mergeStaticMeshesByMaterial(needleField);
  mergeStaticMeshesByMaterial(emberFlora);
  const runtimeParts = [
    registerIsland9RuntimePart('caldera-network', terrain, 'terrain'),
    registerIsland9RuntimePart('heartshaft-wall', shaftWall, 'heartshaft'),
    registerIsland9RuntimePart('shaft-strata-array', terrain, 'heartshaft-depth'),
    registerIsland9RuntimePart('caldera-wall-network', horizon, 'horizon'),
    registerIsland9RuntimePart('lava-channel-network', conduits, 'lava-and-conduits'),
    registerIsland9RuntimePart('conduit-pulse-network', conduits, 'reactive-ambience'),
    registerIsland9RuntimePart('basalt-needle-field', needleField, 'terrain-detail'),
    registerIsland9RuntimePart('ember-flora-field', emberFlora, 'terrain-detail'),
    registerIsland9RuntimePart('cinder-particle-field', cinders, 'particles'),
    registerIsland9RuntimePart('ambience-system', root, 'ambience'),
  ];
  root.userData.sculptRuntime.parts = runtimeParts;
  scene.add(root);

  let cached = false;
  const fuseCores: THREE.Mesh[] = [];
  const incubatorCages: THREE.Object3D[] = [];
  const runeDrums: THREE.Object3D[] = [];
  const stamps: THREE.Object3D[] = [];
  const pistons: THREE.Object3D[] = [];
  const valves: THREE.Object3D[] = [];
  const gantries: THREE.Object3D[] = [];
  const driveWheels: THREE.Object3D[] = [];
  const ignitionRings: THREE.Object3D[] = [];
  const reactiveConduits: THREE.Mesh[] = [];
  const cacheAnimated = () => {
    if (cached) return;
    cached = true;
    scene.traverse((object) => {
      if (object.name === 'ISLAND_9_FUSE_CORE' && object instanceof THREE.Mesh) fuseCores.push(object);
      if (object.name === 'ISLAND_9_INCUBATOR_CAGE') incubatorCages.push(object);
      if (object.name === 'ISLAND_9_MEMORY_RUNE_DRUM') runeDrums.push(object);
      if (object.name === 'ISLAND_9_MEMORY_STAMP') stamps.push(object);
      if (object.name === 'ISLAND_9_SWITCHYARD_PISTON') pistons.push(object);
      if (object.name === 'ISLAND_9_SWITCHYARD_VALVE') valves.push(object);
      if (object.name === 'ISLAND_9_HEARTSHAFT_GANTRY') gantries.push(object);
      if (object.name.includes('DRIVE_WHEEL') || object.name.includes('FLYWHEEL') || object.name.includes('INDEX_WHEEL')) driveWheels.push(object);
      if (object.name === 'ISLAND_9_IGNITION_RING_PIVOT') ignitionRings.push(object);
      if (object.name === 'ISLAND_9_REACTIVE_CONDUIT' && object instanceof THREE.Mesh) reactiveConduits.push(object);
    });
    pistons.forEach((piston) => { piston.userData.baseY = piston.position.y; });
    gantries.forEach((gantry) => { gantry.userData.baseRotationY = gantry.rotation.y; });
  };

  return {
    root,
    animate: (elapsed) => {
      cacheAnimated();
      const cycle = (elapsed * 0.12) % 1;
      const pulseAt = (center: number, width = 0.12) => Math.max(0, 1 - Math.abs(cycle - center) / width);
      const fusePulse = pulseAt(0.08);
      const conduitPulse = pulseAt(0.22);
      const incubatorPulse = pulseAt(0.36);
      const pressPulse = pulseAt(0.5);
      const switchPulse = pulseAt(0.64);
      const gantryPulse = pulseAt(0.78);
      const heartPulse = pulseAt(0.92, 0.16);
      fuseCores.forEach((mesh) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.8 + fusePulse * 2.1;
        mesh.scale.y = 1 + fusePulse * 0.035;
      });
      reactiveConduits.forEach((mesh, index) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.7 + Math.max(0, conduitPulse - index * 0.04) * 2.4;
      });
      incubatorCages.forEach((cage, index) => { cage.rotation.y = elapsed * (0.12 + index * 0.025) * (0.35 + incubatorPulse); });
      runeDrums.forEach((drum) => { drum.rotation.x = elapsed * 0.16 + pressPulse * 0.18; });
      stamps.forEach((stamp) => { stamp.position.y = 1.72 - pressPulse * 0.24; });
      pistons.forEach((piston, index) => { piston.position.y = Number(piston.userData.baseY) + Math.sin(elapsed * 1.4 + index) * 0.025 * (1 + switchPulse * 2); });
      valves.forEach((valve, index) => { valve.rotation.z = elapsed * (0.14 + index * 0.025); });
      gantries.forEach((gantry, index) => { gantry.rotation.y = Number(gantry.userData.baseRotationY) + Math.sin(elapsed * 0.24 + index) * 0.008 * (1 + gantryPulse); });
      driveWheels.forEach((wheel, index) => { wheel.rotation.z = elapsed * (0.12 + index * 0.015); });
      ignitionRings.forEach((ring) => {
        const pulse = 1 + gantryPulse * 0.045 + Math.sin(elapsed * 0.65) * 0.012;
        ring.scale.setScalar(pulse);
        ring.rotation.y = elapsed * 0.055;
      });
      magmaHeart.scale.setScalar(1 + Math.sin(elapsed * 1.25) * 0.08 + heartPulse * 0.22);
      magmaHalo.intensity = (quality === 'high' ? 22 : 15) + heartPulse * 16;
      heatLights[0].intensity = (quality === 'high' ? 5 : 3.5) + incubatorPulse * 3;
      heatLights[1].intensity = (quality === 'high' ? 5 : 3.5) + fusePulse * 3;
      heatLights[2].intensity = (quality === 'high' ? 3 : 2) + pressPulse * 2;
      heatLights[3].intensity = (quality === 'high' ? 4 : 2.8) + switchPulse * 2.5;
      cinders.rotation.y = elapsed * 0.018;
      cinders.position.y = Math.sin(elapsed * 0.15) * 0.08;
      emberFlora.children.forEach((cluster, index) => { cluster.scale.y = 0.96 + Math.sin(elapsed * 0.7 + index) * 0.04; });
    },
    updateView: (cameraPosition, cameraTarget) => {
      if (!cameraTarget) return;
      const focusView = cameraPosition.distanceTo(cameraTarget) < 14;
      horizon.visible = !focusView;
      cinders.visible = !focusView || quality === 'high';
    },
  };
}
