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

export const ISLAND_12_SUNKEN_SANDS_WORLD_NAME = 'Sunken Sands';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_12_SUNKEN_SANDS_LANDMARK_LABELS = {
  boss: 'Oasis Crown Citadel',
  hatchery: 'Scarab Egg Vault',
  habit: 'Sunweave Caravan Pavilion',
  wisdom: 'Sapphire Obelisk Archive',
  event: 'Mirage Echo Court',
} as const;

export interface Island12SunkenSandsMaterials {
  sandstone: THREE.MeshStandardMaterial;
  sandstoneLight: THREE.MeshStandardMaterial;
  sandstoneShadow: THREE.MeshStandardMaterial;
  sandstoneWorn: THREE.MeshStandardMaterial;
  sandstoneWet: THREE.MeshStandardMaterial;
  archiveSandstone: THREE.MeshStandardMaterial;
  archiveSandstoneWorn: THREE.MeshStandardMaterial;
  archiveSandstoneCavity: THREE.MeshStandardMaterial;
  archiveSandstoneEdgeWear: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  archiveGold: THREE.MeshPhysicalMaterial;
  turquoise: THREE.MeshPhysicalMaterial;
  archiveTurquoise: THREE.MeshPhysicalMaterial;
  sapphire: THREE.MeshPhysicalMaterial;
  archiveSapphire: THREE.MeshPhysicalMaterial;
  crimson: THREE.MeshStandardMaterial;
  coral: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  waterDeep: THREE.MeshPhysicalMaterial;
  waterShallow: THREE.MeshPhysicalMaterial;
  waterCaustic: THREE.MeshBasicMaterial;
  foam: THREE.MeshStandardMaterial;
  palmLeaf: THREE.MeshStandardMaterial;
  palmWood: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  linen: THREE.MeshStandardMaterial;
  archivePapyrus: THREE.MeshStandardMaterial;
  archiveShelfWood: THREE.MeshStandardMaterial;
  lampGlow: THREE.MeshStandardMaterial;
  dust: THREE.PointsMaterial;
}

export interface Island12SunkenSandsAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

export const ISLAND_12_RUNTIME_PART_IDS = [
  'terrain-network',
  'central-oasis-shelf',
  'satellite-terrain-shelves',
  'water-network',
  'watercourse-bank-network',
  'dry-path-network',
  'landmark-network',
  'route-integration',
  'ambience-system',
  'horizon-system',
  'scarab-egg-vault',
  'vault-retaining-ring',
  'vault-rib-array',
  'vault-egg-chamber',
  'vault-incubation-water',
  'vault-caretaking-props',
  'vault-ground-life',
  'vault-shade-canopy',
  'sunweave-caravan-pavilion',
  'pavilion-canopy',
  'pavilion-ground-life',
  'mirage-echo-court',
  'echo-court-basin',
  'echo-court-seating',
  'echo-court-banner-frame',
  'echo-resonance-instruments',
  'echo-resonance-prism',
  'echo-step-array',
  'sapphire-obelisk-archive',
  'archive-crystal',
  'archive-record-systems',
  'archive-library-life',
  'archive-beacon-crown',
  'oasis-crown-citadel',
  'citadel-dome',
  'citadel-upper-drum',
  'citadel-obelisk-towers',
  'citadel-monumental-entrance',
  'citadel-forecourt-life',
  'palm-clusters',
  'market-props',
  'dust-heat-field',
] as const;

type Island12RuntimePartId = typeof ISLAND_12_RUNTIME_PART_IDS[number];
interface Island12RuntimePart {
  id: Island12RuntimePartId;
  name: Island12RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export function registerIsland12RuntimePart(
  id: Island12RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island12RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return { id, name: id, kind: 'part', nodeName: node.name, module, triangles };
}

export function collectIsland12RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island12RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => root.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
    const runtimeParts = node.userData.sculptRuntime?.parts;
    if (!Array.isArray(runtimeParts)) return;
    runtimeParts.forEach((candidate: Island12RuntimePart) => {
      if (!candidate?.name || !ISLAND_12_RUNTIME_PART_IDS.includes(candidate.name)) return;
      const key = `${candidate.name}:${candidate.nodeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ ...candidate });
    });
  }));
  return { model: 'island-012-sunken-sands', parts, unnamedMeshes: 0, integralMeshes };
}

export function collectIsland12PerformanceInventory(roots: THREE.Object3D[]) {
  const summarize = (root: THREE.Object3D) => {
    let renderables = 0;
    let shadowCasters = 0;
    let transparentRenderables = 0;
    let logicalInstances = 0;
    const families = new Map<string, number>();
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points)) return;
      renderables += 1;
      logicalInstances += node instanceof THREE.InstancedMesh ? node.count : 1;
      if (node.castShadow) shadowCasters += 1;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (materials.some((material) => material.transparent)) transparentRenderables += 1;
      const materialKey = materials.map((material) => {
        const color = 'color' in material && material.color instanceof THREE.Color
          ? material.color.getHexString()
          : 'none';
        return `${material.type}:${color}`;
      }).join('+');
      const geometryKey = node instanceof THREE.Points ? 'Points' : node.geometry.type;
      const familyKey = `${materialKey}|${geometryKey}|shadow:${node.castShadow ? 1 : 0}`;
      families.set(familyKey, (families.get(familyKey) ?? 0) + 1);
    });
    return {
      name: root.name || root.type,
      renderables,
      shadowCasters,
      transparentRenderables,
      logicalInstances,
      families: [...families.entries()]
        .map(([family, count]) => ({ family, count }))
        .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family)),
    };
  };
  const inventoryRoots = roots.flatMap((root) => root.name === 'ISLAND_12_SUNKEN_SANDS_WORLD_ROOT'
    ? root.children.filter((child) => child.visible)
    : [root]);
  const groups = inventoryRoots
    .map(summarize)
    .filter((group) => group.renderables > 0)
    .sort((left, right) => right.renderables - left.renderables || left.name.localeCompare(right.name));
  return {
    model: 'island-012-sunken-sands',
    groups,
    totals: groups.reduce((totals, group) => ({
      renderables: totals.renderables + group.renderables,
      shadowCasters: totals.shadowCasters + group.shadowCasters,
      transparentRenderables: totals.transparentRenderables + group.transparentRenderables,
      logicalInstances: totals.logicalInstances + group.logicalInstances,
    }), { renderables: 0, shadowCasters: 0, transparentRenderables: 0, logicalInstances: 0 }),
  };
}

// Eighteen sides remain visually round at the phone-scale final camera while
// preserving headroom for animated ecology and reward presentation.
const radialSegments = (quality: Island3DQuality) => quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.68 : 0.42;
export const ISLAND_12_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.24;
export const ISLAND_12_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.24;

export function isIsland12RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_12_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_12_ROUTE_CLEARANCE_OUTER_RADIUS;
}

export const ISLAND_12_PALM_PLACEMENTS = [
  [-4.22, -2.82], [-4.72, 2.82], [4.24, -2.78], [4.82, 2.02],
  [-3.42, -4.24], [5.02, 3.02], [-5.02, 1.62], [5.04, -1.62],
  [-6.4, -2.4], [-5.55, 2.5], [6.72, -1.18], [6.5, 2.35],
  [-6.35, -4.85], [-5.82, -3.38], [-4.7, 3.64], [-5.88, 3.32],
  [3.58, -4.82], [6.86, -4.62], [3.22, 4.42], [7.8, 2.6],
  [-1.05, -6.7], [1.35, 6.65], [-7.1, 0.55], [7.08, -0.62],
  [-3.75, 5.35], [2.3, 5.85], [-4.2, 6.75], [7.6, 5.8],
] as const;

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function combineBoxInstanceArrays(
  name: string,
  material: THREE.Material,
  sources: THREE.InstancedMesh<THREE.BoxGeometry>[],
) {
  const combined = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    material,
    sources.reduce((count, source) => count + source.count, 0),
  );
  combined.name = name;
  combined.castShadow = sources.some((source) => source.castShadow);
  combined.receiveShadow = sources.some((source) => source.receiveShadow);
  const sourceMatrix = new THREE.Matrix4();
  const geometryScale = new THREE.Matrix4();
  let combinedIndex = 0;
  sources.forEach((source) => {
    const { width, height, depth } = source.geometry.parameters;
    geometryScale.makeScale(width, height, depth);
    for (let index = 0; index < source.count; index += 1) {
      source.getMatrixAt(index, sourceMatrix);
      combined.setMatrixAt(combinedIndex, sourceMatrix.clone().multiply(geometryScale));
      combinedIndex += 1;
    }
    source.geometry.dispose();
  });
  combined.instanceMatrix.needsUpdate = true;
  combined.computeBoundingBox();
  combined.computeBoundingSphere();
  return combined;
}

function compactIsland12StaticPresentationGeometry(root: THREE.Group, batchName: string) {
  root.updateMatrixWorld(true);
  const rootWorldInverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, {
    material: THREE.Material;
    castShadow: boolean;
    receiveShadow: boolean;
    renderOrder: number;
    geometries: THREE.BufferGeometry[];
  }>();
  const sources: Array<THREE.Mesh | THREE.InstancedMesh> = [];
  const instanceMatrix = new THREE.Matrix4();
  const transform = new THREE.Matrix4();

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    if (!node.visible || Array.isArray(node.material) || node.material.transparent) return;
    if (node instanceof THREE.InstancedMesh && node.instanceColor) return;
    const key = [
      node.material.uuid,
      node.castShadow ? 'cast' : 'no-cast',
      node.receiveShadow ? 'receive' : 'no-receive',
      `order-${node.renderOrder}`,
    ].join(':');
    const batch = batches.get(key) ?? {
      material: node.material,
      castShadow: node.castShadow,
      receiveShadow: node.receiveShadow,
      renderOrder: node.renderOrder,
      geometries: [] as THREE.BufferGeometry[],
    };
    const addGeometry = (matrix: THREE.Matrix4) => {
      const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      geometry.applyMatrix4(matrix);
      batch.geometries.push(geometry);
    };
    if (node instanceof THREE.InstancedMesh) {
      for (let index = 0; index < node.count; index += 1) {
        node.getMatrixAt(index, instanceMatrix);
        transform.multiplyMatrices(rootWorldInverse, node.matrixWorld).multiply(instanceMatrix);
        addGeometry(transform);
      }
    } else {
      transform.multiplyMatrices(rootWorldInverse, node.matrixWorld);
      addGeometry(transform);
    }
    batches.set(key, batch);
    sources.push(node);
  });

  sources.forEach((source) => {
    source.removeFromParent();
    source.geometry.dispose();
  });
  let batchIndex = 0;
  batches.forEach((batch) => {
    const geometry = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((sourceGeometry) => sourceGeometry.dispose());
    if (!geometry) return;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.name = `${batchName}_BATCH_${batchIndex}`;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.renderOrder = batch.renderOrder;
    root.add(mesh);
    batchIndex += 1;
  });
}

function createGableRoofGeometry() {
  const profile = new THREE.Shape();
  profile.moveTo(-0.5, 0);
  profile.lineTo(0.5, 0);
  profile.lineTo(0, 0.52);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function createPointedArchFrameGeometry(width: number, height: number, frameWidth: number, depth: number) {
  const outerHalfWidth = width * 0.5;
  const outerShoulderY = height * 0.7;
  const innerHalfWidth = Math.max(0.02, outerHalfWidth - frameWidth);
  const innerBottomY = frameWidth * 0.72;
  const innerShoulderY = outerShoulderY - frameWidth * 0.45;
  const innerPeakY = height - frameWidth * 1.35;
  const shape = new THREE.Shape();
  shape.moveTo(-outerHalfWidth, 0);
  shape.lineTo(outerHalfWidth, 0);
  shape.lineTo(outerHalfWidth, outerShoulderY);
  shape.lineTo(0, height);
  shape.lineTo(-outerHalfWidth, outerShoulderY);
  shape.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-innerHalfWidth, innerBottomY);
  opening.lineTo(-innerHalfWidth, innerShoulderY);
  opening.lineTo(0, innerPeakY);
  opening.lineTo(innerHalfWidth, innerShoulderY);
  opening.lineTo(innerHalfWidth, innerBottomY);
  opening.closePath();
  shape.holes.push(opening);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function createPointedPortalPanelGeometry(width: number, height: number, depth: number) {
  const halfWidth = width * 0.5;
  const shoulderY = height * 0.7;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, shoulderY);
  shape.lineTo(0, height);
  shape.lineTo(-halfWidth, shoulderY);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function torus(radius: number, tube: number, material: THREE.Material, segments = 28) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function pipeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, segments = 7) {
  const direction = end.clone().sub(start);
  const mesh = cylinder(radius, radius, direction.length(), material, segments);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createTensionedCanopyGeometry(corners: readonly [
  THREE.Vector3,
  THREE.Vector3,
  THREE.Vector3,
  THREE.Vector3,
], sag: number, segments = 4) {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= segments; row += 1) {
    const v = row / segments;
    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const front = corners[0].clone().lerp(corners[1], u);
      const rear = corners[3].clone().lerp(corners[2], u);
      const point = front.lerp(rear, v);
      point.y -= Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * sag;
      vertices.push(point.x, point.y, point.z);
    }
  }
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const topLeft = row * (segments + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + segments + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, topRight, bottomRight, topLeft, bottomRight, bottomLeft);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createStoneTexture(size: number, relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const strata = Math.sin((u * 3.1 + v * 0.82) * Math.PI * 2 + Math.sin(v * 6.2) * 0.72) * 7;
      const mineralBloom = Math.cos((u * 1.2 - v * 1.7) * Math.PI * 2) * 5;
      const grain = (((x * 37 + y * 53 + x * y * 7) % 47) / 46 - 0.5) * 13;
      const pore = ((x * 17 + y * 29 + x * y * 11) % 211 < 4) ? -18 : 0;
      const value = THREE.MathUtils.clamp((relief ? 128 : 210) + strata + mineralBloom + grain + pore, 24, 238);
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
  texture.repeat.set(2.65, 2.35);
  texture.needsUpdate = true;
  return texture;
}

function createStoneRoughnessTexture(size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const worn = Math.sin((u * 2.4 + v * 1.05) * Math.PI * 2 + Math.cos(v * 5.1) * 0.55) * 17;
      const saltVeil = Math.cos((u * 0.7 - v * 1.4) * Math.PI * 2) * 11;
      const grain = (((x * 19 + y * 31 + x * y * 3) % 59) / 58 - 0.5) * 25;
      const value = THREE.MathUtils.clamp(174 + worn + saltVeil + grain, 52, 244);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.65, 2.35);
  texture.needsUpdate = true;
  return texture;
}

function createArchiveStoneTexture(size: number, channel: 'albedo' | 'height' | 'roughness') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const macro = (
        Math.sin(u * Math.PI * 5.4 + v * 1.7)
        + Math.cos(v * Math.PI * 4.2 - u * 1.2)
        + Math.sin((u + v) * Math.PI * 3.1)
      ) / 3;
      const meso = (
        Math.sin(u * Math.PI * 29 + Math.sin(v * Math.PI * 7) * 1.9)
        + Math.cos(v * Math.PI * 35 - Math.sin(u * Math.PI * 5) * 1.4)
      ) / 2;
      const grain = ((x * 37 + y * 61 + x * y * 11) % 47) / 46 - 0.5;
      const pore = ((x * 17 + y * 29 + x * y * 7) % 173 < 3) ? -1 : 0;
      const value = channel === 'albedo'
        ? 210 + macro * 22 + meso * 7 + grain * 11 + pore * 16
        : channel === 'height'
          ? 128 + macro * 5 + meso * 15 + grain * 14 + pore * 24
          : 182 - macro * 17 + meso * 9 + grain * 18 - pore * 26;
      const clamped = THREE.MathUtils.clamp(value, channel === 'albedo' ? 142 : 58, 238);
      data[offset] = clamped;
      data[offset + 1] = clamped;
      data[offset + 2] = clamped;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.35, 2.35);
  texture.needsUpdate = true;
  return texture;
}

function createPapyrusFiberTexture(size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const longFiber = Math.sin(y * 0.34 + Math.sin(x * 0.025) * 1.8) * 12;
      const crossFiber = Math.sin(x * 0.085 + y * 0.018) * 4;
      const fleck = ((x * 17 + y * 29 + x * y * 3) % 13) - 6;
      const value = THREE.MathUtils.clamp(128 + longFiber + crossFiber + fleck, 86, 172);
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 8);
  texture.needsUpdate = true;
  return texture;
}

function createArchiveWoodTexture(size: number, channel: 'height' | 'roughness') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const longGrain = Math.sin(y * 0.085 + Math.sin(x * 0.012) * 2.2) * 18;
      const knot = Math.sin(Math.hypot(x % 257 - 128, y % 263 - 132) * 0.11) * 7;
      const fiber = ((x * 13 + y * 41 + x * y * 3) % 23) - 11;
      const value = channel === 'height'
        ? 128 + longGrain + knot + fiber * 0.45
        : 194 - longGrain * 0.72 + knot * 0.5 + fiber;
      const clamped = THREE.MathUtils.clamp(value, 62, 235);
      data[offset] = clamped;
      data[offset + 1] = clamped;
      data[offset + 2] = clamped;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 7.2);
  texture.needsUpdate = true;
  return texture;
}

function createArchiveFinishRoughnessTexture(size: number, finish: 'gold' | 'turquoise') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const broadPatina = Math.sin(x * 0.021 + y * 0.013) * (finish === 'gold' ? 23 : 14);
      const mesoBreakup = Math.cos(x * 0.11 - y * 0.075) * (finish === 'gold' ? 12 : 8);
      const microGrain = ((x * 29 + y * 43 + x * y * 5) % 31) - 15;
      const glazeCrazing = finish === 'turquoise' && ((x * 7 + y * 11) % 97 < 2) ? 34 : 0;
      const goldPit = finish === 'gold' && ((x * 13 + y * 17) % 131 < 3) ? 45 : 0;
      const base = finish === 'gold' ? 146 : 132;
      const value = THREE.MathUtils.clamp(
        base + broadPatina + mesoBreakup + microGrain + glazeCrazing + goldPit,
        finish === 'gold' ? 72 : 64,
        228,
      );
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(finish === 'gold' ? 4.2 : 3.6, finish === 'gold' ? 4.2 : 3.6);
  texture.needsUpdate = true;
  return texture;
}

function createWindSandTexture(size: number, relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const dune = Math.sin((u * 1.35 + v * 0.28) * Math.PI * 2 + Math.sin(v * 4.4) * 0.8) * 9;
      const ripple = Math.sin((u * 8.4 + v * 1.25) * Math.PI * 2 + Math.sin(v * 11.0) * 0.36) * 3.8;
      const drift = Math.cos((u * 0.55 - v * 1.12) * Math.PI * 2) * 7;
      const grain = (((x * 13 + y * 17 + x * y * 5) % 41) / 40 - 0.5) * 9;
      const value = THREE.MathUtils.clamp((relief ? 128 : 215) + dune + ripple + drift + grain, 42, 244);
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
  texture.repeat.set(2.45, 1.85);
  texture.needsUpdate = true;
  return texture;
}

function createOasisWaterTexture(size: number, mode: 'surface' | 'relief' | 'caustic') {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const longWave = Math.sin(x * 0.22 + Math.sin(y * 0.1) * 1.7);
      const crossWave = Math.cos(y * 0.31 + Math.sin(x * 0.08) * 1.25);
      const interference = longWave * crossWave;
      const surfaceGlint = Math.pow(Math.max(0, interference), 5);
      const causticRidge = Math.max(
        Math.pow(Math.abs(longWave), 11) * 0.72,
        Math.pow(Math.abs(crossWave), 13) * 0.58,
      );
      const base = mode === 'relief'
        ? 128 + interference * 28
        : mode === 'caustic'
          ? 26 + causticRidge * 226
          : 224 + interference * 6 + surfaceGlint * 8;
      const value = THREE.MathUtils.clamp(base, 12, 252);
      data[offset] = mode === 'surface' ? value * 0.9 : value;
      data[offset + 1] = mode === 'surface' ? Math.min(255, value * 0.98) : value;
      data[offset + 2] = mode === 'surface' ? Math.min(255, value * 1.02) : value;
      data[offset + 3] = mode === 'caustic' ? THREE.MathUtils.clamp(causticRidge * 142, 0, 132) : 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = mode === 'relief' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(mode === 'caustic' ? 4.2 : 3.5, mode === 'caustic' ? 5.8 : 5);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland12SunkenSandsMaterials(): Island12SunkenSandsMaterials {
  const stoneMap = createStoneTexture(256);
  const stoneBump = createStoneTexture(256, true);
  const stoneRoughness = createStoneRoughnessTexture(256);
  const sandMap = createWindSandTexture(256);
  const sandBump = createWindSandTexture(256, true);
  const waterSurface = createOasisWaterTexture(96, 'surface');
  const waterRelief = createOasisWaterTexture(96, 'relief');
  const waterCaustic = createOasisWaterTexture(96, 'caustic');
  const archiveStoneMap = createArchiveStoneTexture(1024, 'albedo');
  const archiveStoneBump = createArchiveStoneTexture(1024, 'height');
  const archiveStoneRoughness = createArchiveStoneTexture(1024, 'roughness');
  const archiveGoldRoughness = createArchiveFinishRoughnessTexture(1024, 'gold');
  const archiveTurquoiseRoughness = createArchiveFinishRoughnessTexture(1024, 'turquoise');
  const archivePapyrusBump = createPapyrusFiberTexture(512);
  const archiveWoodBump = createArchiveWoodTexture(1024, 'height');
  const archiveWoodRoughness = createArchiveWoodTexture(1024, 'roughness');
  return {
    sandstone: new THREE.MeshStandardMaterial({ color: 0xd6a45e, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.045, roughnessMap: stoneRoughness, roughness: 0.76 }),
    sandstoneLight: new THREE.MeshStandardMaterial({ color: 0xf0d08d, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.03, roughnessMap: stoneRoughness, roughness: 0.7 }),
    sandstoneShadow: new THREE.MeshStandardMaterial({ color: 0x7b4d2d, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.055, roughnessMap: stoneRoughness, roughness: 0.9 }),
    sandstoneWorn: new THREE.MeshStandardMaterial({ color: 0xd3a66f, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.025, roughnessMap: stoneRoughness, roughness: 0.68 }),
    sandstoneWet: new THREE.MeshStandardMaterial({ color: 0x684a38, map: stoneMap, bumpMap: stoneBump, bumpScale: 0.035, roughnessMap: stoneRoughness, roughness: 0.42 }),
    archiveSandstone: new THREE.MeshStandardMaterial({
      color: 0xe8b874,
      map: archiveStoneMap,
      bumpMap: archiveStoneBump,
      bumpScale: 0.042,
      roughnessMap: archiveStoneRoughness,
      roughness: 0.73,
    }),
    archiveSandstoneWorn: new THREE.MeshStandardMaterial({
      color: 0xd09a5b,
      map: archiveStoneMap,
      bumpMap: archiveStoneBump,
      bumpScale: 0.057,
      roughnessMap: archiveStoneRoughness,
      roughness: 0.82,
    }),
    archiveSandstoneCavity: new THREE.MeshStandardMaterial({
      color: 0x7c492b,
      map: archiveStoneMap,
      bumpMap: archiveStoneBump,
      bumpScale: 0.065,
      roughnessMap: archiveStoneRoughness,
      roughness: 0.94,
    }),
    archiveSandstoneEdgeWear: new THREE.MeshStandardMaterial({
      color: 0xe3ac63,
      map: archiveStoneMap,
      bumpMap: archiveStoneBump,
      bumpScale: 0.026,
      roughnessMap: archiveStoneRoughness,
      roughness: 0.68,
    }),
    obsidian: new THREE.MeshStandardMaterial({ color: 0x17252b, roughness: 0.38, metalness: 0.16, emissive: 0x061014, emissiveIntensity: 0.08 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xdfb46f, map: sandMap, bumpMap: sandBump, bumpScale: 0.064, roughness: 0.96 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc49335, roughness: 0.34, metalness: 0.78, emissive: 0x2a1200, emissiveIntensity: 0.1 }),
    archiveGold: new THREE.MeshPhysicalMaterial({
      color: 0xdda93f,
      roughnessMap: archiveGoldRoughness,
      roughness: 0.48,
      metalness: 0.38,
      clearcoat: 0.28,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.92,
      emissive: 0x241000,
      emissiveIntensity: 0.1,
    }),
    turquoise: new THREE.MeshPhysicalMaterial({ color: 0x168e96, emissive: 0x063f46, emissiveIntensity: 0.12, roughness: 0.16, metalness: 0.02, clearcoat: 0.84, clearcoatRoughness: 0.12, transparent: true, opacity: 0.93 }),
    archiveTurquoise: new THREE.MeshPhysicalMaterial({
      color: 0x2cc9bb,
      emissive: 0x0b5b5d,
      emissiveIntensity: 0.18,
      roughnessMap: archiveTurquoiseRoughness,
      roughness: 0.38,
      metalness: 0.02,
      clearcoat: 0.78,
      clearcoatRoughness: 0.16,
      envMapIntensity: 0.8,
    }),
    sapphire: new THREE.MeshPhysicalMaterial({ color: 0x176fd0, emissive: 0x0758d8, emissiveIntensity: 0.68, roughness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.1, transparent: true, opacity: 0.92 }),
    archiveSapphire: new THREE.MeshPhysicalMaterial({
      color: 0x155ed8,
      emissive: 0x0864d8,
      emissiveIntensity: 0.56,
      roughness: 0.08,
      metalness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transmission: 0.05,
      thickness: 0.22,
      ior: 1.62,
      envMapIntensity: 0.9,
    }),
    crimson: new THREE.MeshStandardMaterial({ color: 0xa83e46, roughness: 0.68, side: THREE.DoubleSide }),
    coral: new THREE.MeshStandardMaterial({ color: 0xdc7559, roughness: 0.7, side: THREE.DoubleSide }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x26b7bd, map: waterSurface, bumpMap: waterRelief, bumpScale: 0.038, emissive: 0x064e5d, emissiveIntensity: 0.11, roughness: 0.2, clearcoat: 0.94, clearcoatRoughness: 0.08, transparent: true, opacity: 0.78, depthWrite: false }),
    waterDeep: new THREE.MeshPhysicalMaterial({ color: 0x087b91, map: waterSurface, bumpMap: waterRelief, bumpScale: 0.04, emissive: 0x032f3e, emissiveIntensity: 0.11, roughness: 0.22, clearcoat: 0.92, clearcoatRoughness: 0.1, transparent: true, opacity: 0.84, depthWrite: false }),
    waterShallow: new THREE.MeshPhysicalMaterial({ color: 0x59d2bf, map: waterSurface, bumpMap: waterRelief, bumpScale: 0.024, emissive: 0x0a5963, emissiveIntensity: 0.13, roughness: 0.2, clearcoat: 0.94, clearcoatRoughness: 0.08, transparent: true, opacity: 0.7, depthWrite: false }),
    waterCaustic: new THREE.MeshBasicMaterial({ color: 0xd8fff1, map: waterCaustic, transparent: true, opacity: 0.065, depthWrite: false, blending: THREE.AdditiveBlending }),
    foam: new THREE.MeshStandardMaterial({ color: 0xc9f4ef, emissive: 0x4cb9bd, emissiveIntensity: 0.24, roughness: 0.38, transparent: true, opacity: 0.58, depthWrite: false }),
    palmLeaf: new THREE.MeshStandardMaterial({ color: 0x2f7137, roughness: 0.78, side: THREE.DoubleSide }),
    palmWood: new THREE.MeshStandardMaterial({ color: 0x704327, roughness: 0.9 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0x2b8888, roughness: 0.28, clearcoat: 0.76, clearcoatRoughness: 0.2 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xead8ac, roughness: 0.92, bumpMap: sandBump, bumpScale: 0.018 }),
    archivePapyrus: new THREE.MeshStandardMaterial({
      color: 0xd9b975,
      bumpMap: archivePapyrusBump,
      bumpScale: 0.018,
      roughness: 0.9,
    }),
    archiveShelfWood: new THREE.MeshStandardMaterial({
      color: 0x51301f,
      bumpMap: archiveWoodBump,
      bumpScale: 0.032,
      roughnessMap: archiveWoodRoughness,
      roughness: 0.83,
    }),
    lampGlow: new THREE.MeshStandardMaterial({ color: 0xffc85a, emissive: 0xff7a16, emissiveIntensity: 1.35, roughness: 0.32 }),
    dust: new THREE.PointsMaterial({ color: 0xf4d9a0, size: 0.052, transparent: true, opacity: 0.42, depthWrite: false, sizeAttenuation: true }),
  };
}

function addLandmarkPlatform(root: THREE.Group, radius: number, materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const base = cylinder(radius * 0.88, radius, 0.36, materials.sandstoneShadow, radialSegments(quality));
  base.position.y = 0.16;
  const upper = cylinder(radius, radius * 0.9, 0.22, materials.sandstone, radialSegments(quality));
  upper.position.y = 0.44;
  const trim = torus(radius * 0.92, 0.055, materials.gold, radialSegments(quality) * 2);
  trim.position.y = 0.54;
  root.add(base, upper, trim);
}

function addFrontStairs(root: THREE.Group, materials: Island12SunkenSandsMaterials, width = 0.72, count = 4) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const stairs = new THREE.InstancedMesh(geometry, materials.sandstoneLight, count);
  stairs.name = `${root.name}_FRONT_STAIR_ARRAY`;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    matrix.compose(
      position.set(0, 0.32 + index * 0.08, 0.92 - index * 0.16),
      quaternion,
      scale.set(width - index * 0.08, 0.09, 0.22),
    );
    stairs.setMatrixAt(index, matrix);
  }
  stairs.instanceMatrix.needsUpdate = true;
  root.add(stairs);
}

function createLandmarkGroundLife(
  name: string,
  level: 1 | 2 | 3,
  materials: Island12SunkenSandsMaterials,
  placements: readonly (readonly [number, number, number])[],
  leafPalette: readonly number[],
) {
  const root = new THREE.Group();
  root.name = name;
  const plantCount = level === 1 ? 4 : level === 2 ? 7 : placements.length;
  const leafMaterial = materials.palmLeaf.clone();
  leafMaterial.name = `${name}_LEAF_MATERIAL`;
  leafMaterial.color.setHex(0xffffff);
  const rosettes = new THREE.InstancedMesh(createOasisGroundRosetteGeometry(), leafMaterial, plantCount);
  rosettes.name = `${name}_ROSETTE_ARRAY`;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  placements.slice(0, plantCount).forEach(([x, z, rotation], index) => {
    const plantScale = 0.82 + index % 4 * 0.12;
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.38 + index % 3 * 0.008, z), quaternion, scale.set(plantScale, plantScale, plantScale));
    rosettes.setMatrixAt(index, matrix);
    rosettes.setColorAt(index, new THREE.Color(leafPalette[index % leafPalette.length]));
  });
  rosettes.instanceMatrix.needsUpdate = true;
  if (rosettes.instanceColor) rosettes.instanceColor.needsUpdate = true;
  rosettes.receiveShadow = true;
  root.add(rosettes);

  if (level >= 2) {
    const bloomCount = level === 2 ? 3 : 5;
    const blooms = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.045, 0), materials.coral, bloomCount);
    blooms.name = `${name}_BLOOM_ARRAY`;
    for (let index = 0; index < bloomCount; index += 1) {
      const placementIndex = (index * 2 + 1) % plantCount;
      const [x, z] = placements[placementIndex];
      matrix.compose(
        position.set(x + (index % 2 ? 0.07 : -0.055), 0.485 + index % 2 * 0.025, z + 0.025),
        new THREE.Quaternion(),
        scale.setScalar(0.72 + index % 3 * 0.12),
      );
      blooms.setMatrixAt(index, matrix);
    }
    blooms.instanceMatrix.needsUpdate = true;
    root.add(blooms);
  }

  return root;
}

function createScarabEggVault(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island12SunkenSandsMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_SCARAB_EGG_VAULT_PIVOT';
  addLandmarkPlatform(root, 1.08, materials, quality);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const approachYaw = Math.PI * 0.25;

  const retainingRing = new THREE.Group();
  retainingRing.name = 'ISLAND_12_VAULT_EXCAVATED_RETAINING_RING';
  const retainingBlockCount = level === 1 ? 7 : level === 2 ? 9 : 11;
  const retainingBlocks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneWorn,
    retainingBlockCount,
  );
  retainingBlocks.name = 'ISLAND_12_VAULT_RETAINING_BLOCK_ARRAY';
  for (let index = 0; index < retainingBlockCount; index += 1) {
    const progress = index / (retainingBlockCount - 1);
    const angle = THREE.MathUtils.lerp(-0.16, -Math.PI + 0.16, progress);
    quaternion.setFromAxisAngle(up, -angle);
    matrix.compose(
      position.set(Math.cos(angle) * 0.86, level === 3 ? 0.81 : level === 2 ? 0.75 : 0.69, Math.sin(angle) * 0.86),
      quaternion,
      scale.set(level === 3 ? 0.39 : 0.34, level === 3 ? 0.58 : level === 2 ? 0.46 : 0.29, 0.2),
    );
    retainingBlocks.setMatrixAt(index, matrix);
  }
  retainingBlocks.instanceMatrix.needsUpdate = true;
  const entranceSteps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneLight,
    3,
  );
  entranceSteps.name = 'ISLAND_12_VAULT_DESCENDING_ENTRANCE_STAIR_ARRAY';
  for (let index = 0; index < 3; index += 1) {
    matrix.compose(
      position.set(0, 0.78 - index * 0.13, 0.9 + index * 0.18),
      new THREE.Quaternion(),
      scale.set((level === 3 ? 0.98 : 0.82) + index * 0.06, 0.15, 0.29),
    );
    entranceSteps.setMatrixAt(index, matrix);
  }
  entranceSteps.instanceMatrix.needsUpdate = true;
  const stairCourseBlocks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneWorn,
    6,
  );
  stairCourseBlocks.name = 'ISLAND_12_VAULT_STAIR_MASONRY_COURSE_ARRAY';
  const stairInlays = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.ceramic,
    3,
  );
  stairInlays.name = 'ISLAND_12_VAULT_STAIR_TURQUOISE_INLAY_ARRAY';
  const spillwayLips = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneWet,
    6,
  );
  spillwayLips.name = 'ISLAND_12_VAULT_STEPPED_SPILLWAY_LIP_ARRAY';
  for (let index = 0; index < 3; index += 1) {
    const stepY = 0.78 - index * 0.13;
    const stepZ = 0.9 + index * 0.18;
    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(
        position.set(side * (0.48 + index * 0.045), stepY - 0.055, stepZ),
        new THREE.Quaternion(),
        scale.set(0.12, 0.2, 0.27),
      );
      stairCourseBlocks.setMatrixAt(index * 2 + sideIndex, matrix);
      matrix.compose(
        position.set(side * 0.14, stepY + 0.068, stepZ),
        new THREE.Quaternion(),
        scale.set(0.045, 0.045, 0.28),
      );
      spillwayLips.setMatrixAt(index * 2 + sideIndex, matrix);
    });
    if (level >= 2) {
      matrix.compose(
        position.set(0, stepY + 0.064, stepZ + 0.154),
        new THREE.Quaternion(),
        scale.set(0.24, 0.02, 0.02),
      );
      stairInlays.setMatrixAt(index, matrix);
    } else {
      matrix.compose(position.set(0, 0, 0), new THREE.Quaternion(), scale.set(0, 0, 0));
      stairInlays.setMatrixAt(index, matrix);
    }
  }
  stairCourseBlocks.instanceMatrix.needsUpdate = true;
  stairInlays.instanceMatrix.needsUpdate = true;
  spillwayLips.instanceMatrix.needsUpdate = true;
  const retainingCrest = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.055, 6, radialSegments(quality) * 2, Math.PI * 1.12),
    materials.gold,
  );
  retainingCrest.name = 'ISLAND_12_VAULT_RETAINING_CREST';
  retainingCrest.position.y = level === 3 ? 0.88 : 0.83;
  retainingCrest.rotation.set(Math.PI / 2, 0, Math.PI * 0.44);
  retainingRing.add(retainingBlocks, retainingCrest, entranceSteps, stairCourseBlocks, stairInlays, spillwayLips);
  const entrancePiers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneWorn,
    2,
  );
  entrancePiers.name = 'ISLAND_12_VAULT_ENTRANCE_PIER_ARRAY';
  const entrancePierX = level === 3 ? 0.74 : 0.68;
  [-1, 1].forEach((side, index) => {
    matrix.compose(
      position.set(side * entrancePierX, level === 3 ? 0.82 : 0.78, 0.79),
      new THREE.Quaternion(),
      scale.set(level === 3 ? 0.3 : 0.27, level === 3 ? 0.54 : 0.44, 0.29),
    );
    entrancePiers.setMatrixAt(index, matrix);
  });
  entrancePiers.instanceMatrix.needsUpdate = true;
  retainingRing.add(entrancePiers);
  if (level >= 2) {
    const reliefBackings = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.3, 0.025), materials.ceramic, 2);
    const reliefBodies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 5), materials.gold, 4);
    const reliefWings = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 5), materials.gold, 4);
    reliefBackings.name = 'ISLAND_12_VAULT_SCARAB_RELIEF_BACKING_ARRAY';
    reliefBodies.name = 'ISLAND_12_VAULT_SCARAB_RELIEF_BODY_ARRAY';
    reliefWings.name = 'ISLAND_12_VAULT_SCARAB_RELIEF_WING_ARRAY';
    [-1, 1].forEach((side, reliefIndex) => {
      const x = side * entrancePierX;
      matrix.compose(position.set(x, 0.86, 0.918), new THREE.Quaternion(), scale.set(1, 1, 1));
      reliefBackings.setMatrixAt(reliefIndex, matrix);
      matrix.compose(position.set(x, 0.82, 0.93), new THREE.Quaternion(), scale.set(0.7, 1.15, 0.28));
      reliefBodies.setMatrixAt(reliefIndex * 2, matrix);
      matrix.compose(position.set(x, 0.94, 0.935), new THREE.Quaternion(), scale.set(0.43, 0.43, 0.26));
      reliefBodies.setMatrixAt(reliefIndex * 2 + 1, matrix);
      [-1, 1].forEach((wingSide, wingIndex) => {
        quaternion.setFromEuler(new THREE.Euler(0, 0, wingSide * 0.62));
        matrix.compose(
          position.set(x + wingSide * 0.085, 0.84, 0.928),
          quaternion,
          scale.set(0.52, 0.88, 0.2),
        );
        reliefWings.setMatrixAt(reliefIndex * 2 + wingIndex, matrix);
      });
    });
    reliefBackings.instanceMatrix.needsUpdate = true;
    reliefBodies.instanceMatrix.needsUpdate = true;
    reliefWings.instanceMatrix.needsUpdate = true;
    retainingRing.add(reliefBackings, reliefBodies, reliefWings);

    const lampStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.04, 0.19, 7), materials.gold, 2);
    const lampBowls = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.075, 0.085, 9), materials.gold, 2);
    const lampFlames = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, level === 3 ? 0.19 : 0.14, 7), materials.lampGlow, 2);
    lampStems.name = 'ISLAND_12_VAULT_INCUBATION_LAMP_STEM_ARRAY';
    lampBowls.name = 'ISLAND_12_VAULT_INCUBATION_LAMP_BOWL_ARRAY';
    lampFlames.name = 'ISLAND_12_VAULT_INCUBATION_FLAME_ARRAY';
    [-1, 1].forEach((side, index) => {
      const x = side * entrancePierX;
      matrix.compose(position.set(x, 1.13, 0.78), new THREE.Quaternion(), scale.set(1, 1, 1));
      lampStems.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.25, 0.78), new THREE.Quaternion(), scale.set(1, 1, 1));
      lampBowls.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, level === 3 ? 1.39 : 1.35, 0.78), new THREE.Quaternion(), scale.set(1, 1, 1));
      lampFlames.setMatrixAt(index, matrix);
    });
    lampStems.instanceMatrix.needsUpdate = true;
    lampBowls.instanceMatrix.needsUpdate = true;
    lampFlames.instanceMatrix.needsUpdate = true;
    retainingRing.add(lampStems, lampBowls, lampFlames);
  }
  compactIsland12StaticPresentationGeometry(retainingRing, 'ISLAND_12_VAULT_RETAINING_RING');
  retainingRing.rotation.y = approachYaw;
  root.add(retainingRing);

  const incubation = new THREE.Group();
  incubation.name = 'ISLAND_12_VAULT_INCUBATION_CHAMBER';
  const basin = cylinder(0.5, 0.56, 0.16, materials.sandstoneWet, radialSegments(quality));
  basin.name = 'ISLAND_12_VAULT_NEST_BASIN';
  basin.position.y = 0.68;
  const basinWater = cylinder(0.44, 0.44, 0.035, materials.waterShallow, radialSegments(quality));
  basinWater.name = 'ISLAND_12_VAULT_NEST_COOLING_WATER';
  basinWater.position.y = 0.775;
  const paddedNest = torus(0.38, 0.095, materials.linen, radialSegments(quality) * 2);
  paddedNest.name = 'ISLAND_12_VAULT_PADDED_NEST_RING';
  paddedNest.position.y = 0.81;
  const channelCount = level === 1 ? 1 : 3;
  const coolingChannels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.waterShallow,
    channelCount,
  );
  coolingChannels.name = 'ISLAND_12_VAULT_COOLING_CHANNEL_ARRAY';
  matrix.compose(position.set(0, 0.62, 0.79), new THREE.Quaternion(), scale.set(0.16, 0.035, 0.5));
  coolingChannels.setMatrixAt(0, matrix);
  if (channelCount > 1) {
    [-1, 1].forEach((side, index) => {
      quaternion.setFromAxisAngle(up, side * 0.72);
      matrix.compose(position.set(side * 0.5, 0.615, 0.25), quaternion, scale.set(0.085, 0.03, 0.5));
      coolingChannels.setMatrixAt(index + 1, matrix);
    });
  }
  coolingChannels.instanceMatrix.needsUpdate = true;
  const spillwayWater = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.waterShallow,
    3,
  );
  spillwayWater.name = 'ISLAND_12_VAULT_DESCENDING_SPILLWAY_WATER_ARRAY';
  for (let index = 0; index < 3; index += 1) {
    const stepY = 0.78 - index * 0.13;
    matrix.compose(
      position.set(0, stepY + 0.074, 0.9 + index * 0.18),
      new THREE.Quaternion(),
      scale.set(0.17, 0.022, 0.27),
    );
    spillwayWater.setMatrixAt(index, matrix);
  }
  spillwayWater.instanceMatrix.needsUpdate = true;
  const sourceSpout = pipeBetween(
    new THREE.Vector3(0, 0.84, 0.47),
    new THREE.Vector3(0, 0.82, 0.7),
    0.034,
    materials.gold,
    7,
  );
  sourceSpout.name = 'ISLAND_12_VAULT_COOLING_SOURCE_SPOUT';
  const chamber = new THREE.Mesh(
    new THREE.IcosahedronGeometry(level === 1 ? 0.31 : level === 2 ? 0.38 : 0.43, quality === 'high' ? 2 : 1),
    materials.turquoise,
  );
  chamber.name = 'ISLAND_12_VAULT_EGG_CHAMBER';
  chamber.position.y = level === 3 ? 1.15 : 1.08;
  chamber.scale.set(0.84, level === 3 ? 1.45 : 1.26, 0.84);
  incubation.add(basin, basinWater, paddedNest, coolingChannels, spillwayWater, sourceSpout, chamber);
  if (level >= 2) {
    const coolingMoat = torus(0.68, level === 3 ? 0.075 : 0.06, materials.waterShallow, radialSegments(quality) * 2);
    coolingMoat.name = 'ISLAND_12_VAULT_OUTER_COOLING_MOAT';
    coolingMoat.position.y = 0.675;
    incubation.add(coolingMoat);
  }
  compactIsland12StaticPresentationGeometry(incubation, 'ISLAND_12_VAULT_INCUBATION_CHAMBER');
  incubation.rotation.y = approachYaw;
  root.add(incubation);

  const cage = new THREE.Group();
  cage.name = 'ISLAND_12_VAULT_RIB_ARRAY';
  const ribCount = level === 1 ? 4 : level === 2 ? 5 : 6;
  const ribButtresses = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneWorn,
    ribCount,
  );
  ribButtresses.name = 'ISLAND_12_VAULT_RIB_SOCKET_BUTTRESS_ARRAY';
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2 + (ribCount === 4 ? Math.PI / 4 : 0);
    const lower = new THREE.Vector3(Math.cos(angle) * 0.73, 0.78, Math.sin(angle) * 0.73);
    const shoulder = new THREE.Vector3(Math.cos(angle) * 0.5, level === 3 ? 1.55 : 1.38, Math.sin(angle) * 0.5);
    const upper = new THREE.Vector3(Math.cos(angle) * 0.19, level === 3 ? 1.97 : 1.78, Math.sin(angle) * 0.19);
    const ribMaterial = level === 1 ? materials.sandstoneLight : materials.gold;
    cage.add(
      pipeBetween(lower, shoulder, level === 3 ? 0.058 : 0.05, ribMaterial, 8),
      pipeBetween(shoulder, upper, level === 3 ? 0.052 : 0.045, ribMaterial, 8),
    );
    if (level === 3) {
      const innerLower = new THREE.Vector3(Math.cos(angle) * 0.66, 0.8, Math.sin(angle) * 0.66);
      const innerShoulder = new THREE.Vector3(Math.cos(angle) * 0.43, 1.51, Math.sin(angle) * 0.43);
      const innerUpper = new THREE.Vector3(Math.cos(angle) * 0.15, 1.92, Math.sin(angle) * 0.15);
      cage.add(
        pipeBetween(innerLower, innerShoulder, 0.025, materials.ceramic, 7),
        pipeBetween(innerShoulder, innerUpper, 0.022, materials.ceramic, 7),
      );
    }
    quaternion.setFromAxisAngle(up, -angle);
    matrix.compose(lower.clone().setY(0.72), quaternion, scale.set(0.18, level === 3 ? 0.3 : 0.26, 0.21));
    ribButtresses.setMatrixAt(index, matrix);
  }
  ribButtresses.instanceMatrix.needsUpdate = true;
  const crown = torus(0.21, 0.06, materials.gold, 20);
  crown.name = 'ISLAND_12_VAULT_OPEN_OCULUS';
  crown.position.y = level === 3 ? 1.98 : 1.79;
  cage.add(ribButtresses, crown);
  if (level >= 2) {
    const scarabCount = level === 3 ? 4 : 2;
    const scarabInlays = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.1, 0),
      materials.gold,
      scarabCount,
    );
    scarabInlays.name = 'ISLAND_12_VAULT_SCARAB_INLAY_ARRAY';
    for (let index = 0; index < scarabCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      matrix.compose(
        position.set(side * (0.46 + row * 0.14), 0.82, 0.72 - row * 0.1),
        quaternion,
        scale.set(1.3, 0.5, 0.78),
      );
      scarabInlays.setMatrixAt(index, matrix);
    }
    scarabInlays.instanceMatrix.needsUpdate = true;
    cage.add(scarabInlays);
  }
  compactIsland12StaticPresentationGeometry(cage, 'ISLAND_12_VAULT_RIB_ARRAY');
  root.add(cage);

  const shadeCanopy = new THREE.Group();
  shadeCanopy.name = 'ISLAND_12_VAULT_REAR_SHADE_CANOPY';
  if (level === 3) {
    [-1, 1].forEach((side) => {
      const innerFront = new THREE.Vector3(side * 0.08, 1.66, -0.61);
      const outerFront = new THREE.Vector3(side * 0.82, 1.43, -0.68);
      const outerRear = new THREE.Vector3(side * 0.72, 1.12, -0.78);
      const innerRear = new THREE.Vector3(side * 0.1, 1.26, -0.75);
      const shade = new THREE.Mesh(
        createTensionedCanopyGeometry([innerFront, outerFront, outerRear, innerRear], 0.18),
        materials.crimson,
      );
      shade.name = 'ISLAND_12_VAULT_TENSIONED_REAR_SHADE_PANEL';
      shadeCanopy.add(shade);
      shadeCanopy.add(
        pipeBetween(innerFront, outerFront, 0.018, materials.gold, 6),
        pipeBetween(outerFront, outerRear, 0.018, materials.gold, 6),
        pipeBetween(outerRear, innerRear, 0.018, materials.gold, 6),
      );
      const frontMid = innerFront.clone().lerp(outerFront, 0.5);
      const rearMid = innerRear.clone().lerp(outerRear, 0.5);
      const clothCentre = frontMid.clone().lerp(rearMid, 0.5);
      clothCentre.y -= 0.18;
      shadeCanopy.add(
        pipeBetween(frontMid, clothCentre, 0.012, materials.gold, 5),
        pipeBetween(clothCentre, rearMid, 0.012, materials.gold, 5),
      );
      const outerPost = pipeBetween(
        new THREE.Vector3(side * 0.82, 0.72, -0.68),
        outerFront,
        0.026,
        materials.palmWood,
        7,
      );
      shadeCanopy.add(outerPost);
    });
    compactIsland12StaticPresentationGeometry(shadeCanopy, 'ISLAND_12_VAULT_REAR_SHADE_CANOPY');
    root.add(shadeCanopy);
  }

  const caretakingProps = new THREE.Group();
  caretakingProps.name = 'ISLAND_12_VAULT_CARETAKING_TERRACES';
  const terraceCount = level === 1 ? 1 : 2;
  const terraceSlabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneShadow, terraceCount);
  terraceSlabs.name = 'ISLAND_12_VAULT_WORK_TERRACE_ARRAY';
  const worktops = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneWorn, terraceCount);
  worktops.name = 'ISLAND_12_VAULT_WORKTOP_ARRAY';
  const linenPads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.linen, terraceCount);
  linenPads.name = 'ISLAND_12_VAULT_INCUBATION_LINEN_PAD_ARRAY';
  const jarCount = level === 1 ? 1 : level === 2 ? 2 : 4;
  const jars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.28, 8), materials.ceramic, jarCount);
  jars.name = 'ISLAND_12_VAULT_INCUBATION_JAR_ARRAY';
  const jarRims = new THREE.InstancedMesh(new THREE.TorusGeometry(0.105, 0.025, 5, 10), materials.gold, jarCount);
  jarRims.name = 'ISLAND_12_VAULT_INCUBATION_JAR_RIM_ARRAY';
  const toolCount = level === 3 ? 4 : 2;
  const tools = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.palmWood, toolCount);
  tools.name = 'ISLAND_12_VAULT_CARETAKING_TOOL_ARRAY';
  for (let index = 0; index < terraceCount; index += 1) {
    const side = index === 0 ? -1 : 1;
    matrix.compose(position.set(side * 0.72, 0.76, 0.06), new THREE.Quaternion(), scale.set(0.38, 0.14, 0.48));
    terraceSlabs.setMatrixAt(index, matrix);
    matrix.compose(position.set(side * 0.72, 0.85, 0.06), new THREE.Quaternion(), scale.set(0.4, 0.055, 0.5));
    worktops.setMatrixAt(index, matrix);
    quaternion.setFromEuler(new THREE.Euler(0, side * 0.08, 0));
    matrix.compose(position.set(side * 0.72, 0.89, 0.12), quaternion, scale.set(0.27, 0.035, 0.24));
    linenPads.setMatrixAt(index, matrix);
  }
  for (let index = 0; index < jarCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const jarX = side * (0.7 - row * 0.12);
    const jarZ = 0.02 - row * 0.24;
    matrix.compose(position.set(jarX, 0.95, jarZ), new THREE.Quaternion(), scale.set(1, 1, 1));
    jars.setMatrixAt(index, matrix);
    quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    matrix.compose(position.set(jarX, 1.1, jarZ), quaternion, scale.set(1, 1, 1));
    jarRims.setMatrixAt(index, matrix);
  }
  for (let index = 0; index < toolCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    quaternion.setFromEuler(new THREE.Euler(0, side * 0.18, side * 0.7));
    matrix.compose(
      position.set(side * (0.62 + row * 0.08), 1.08, 0.28 - row * 0.34),
      quaternion,
      scale.set(0.035, 0.34, 0.035),
    );
    tools.setMatrixAt(index, matrix);
  }
  terraceSlabs.instanceMatrix.needsUpdate = true;
  worktops.instanceMatrix.needsUpdate = true;
  linenPads.instanceMatrix.needsUpdate = true;
  jars.instanceMatrix.needsUpdate = true;
  jarRims.instanceMatrix.needsUpdate = true;
  tools.instanceMatrix.needsUpdate = true;
  caretakingProps.add(terraceSlabs, worktops, linenPads, jars, jarRims, tools);
  if (level >= 2) {
    const basketCount = level === 3 ? 2 : 1;
    const baskets = new THREE.InstancedMesh(new THREE.TorusGeometry(0.14, 0.035, 6, 12), materials.palmWood, basketCount);
    const clothRolls = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.3, 8), materials.crimson, basketCount);
    baskets.name = 'ISLAND_12_VAULT_CARETAKING_BASKET_ARRAY';
    clothRolls.name = 'ISLAND_12_VAULT_CARETAKING_CLOTH_ROLL_ARRAY';
    for (let index = 0; index < basketCount; index += 1) {
      const side = index === 0 ? -1 : 1;
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, side * 0.2));
      matrix.compose(position.set(side * 0.76, 0.94, -0.08), quaternion, scale.set(1, 1, 1));
      baskets.setMatrixAt(index, matrix);
      quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2 + side * 0.12));
      matrix.compose(position.set(side * 0.71, 0.98, 0.1), quaternion, scale.set(1, 1, 1));
      clothRolls.setMatrixAt(index, matrix);
    }
    baskets.instanceMatrix.needsUpdate = true;
    clothRolls.instanceMatrix.needsUpdate = true;
    caretakingProps.add(baskets, clothRolls);
  }
  if (level === 3) {
    const plantCount = 8;
    const reedStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.02, 0.22, 5), materials.palmLeaf, plantCount);
    const reedFlowers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.045, 0), materials.coral, plantCount);
    reedStems.name = 'ISLAND_12_VAULT_NEST_REED_ARRAY';
    reedFlowers.name = 'ISLAND_12_VAULT_NEST_FLOWER_ARRAY';
    for (let index = 0; index < plantCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      const angle = side * (1.34 + row * 0.27);
      const x = Math.sin(angle) * (0.78 + row % 2 * 0.04);
      const z = Math.cos(angle) * (0.78 + row % 2 * 0.04) - 0.05;
      matrix.compose(position.set(x, 0.84, z), new THREE.Quaternion(), scale.set(1, 1 + row * 0.08, 1));
      reedStems.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 0.97 + row * 0.018, z), new THREE.Quaternion(), scale.set(1, 1, 1));
      reedFlowers.setMatrixAt(index, matrix);
    }
    reedStems.instanceMatrix.needsUpdate = true;
    reedFlowers.instanceMatrix.needsUpdate = true;
    caretakingProps.add(reedStems, reedFlowers);

    const caretakerCount = 2;
    const caretakerBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.075, 0.3, 6), materials.ceramic, caretakerCount);
    const caretakerHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 7, 5), materials.sandstoneLight, caretakerCount);
    const caretakerSashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.028, 0.035), materials.gold, caretakerCount);
    caretakerBodies.name = 'ISLAND_12_VAULT_CARETAKER_BODY_ARRAY';
    caretakerHeads.name = 'ISLAND_12_VAULT_CARETAKER_HEAD_ARRAY';
    caretakerSashes.name = 'ISLAND_12_VAULT_CARETAKER_SASH_ARRAY';
    [-1, 1].forEach((side, index) => {
      const x = side * 0.52;
      const z = -0.42 + index * 0.04;
      matrix.compose(position.set(x, 1.02, z), new THREE.Quaternion(), scale.set(1, 1, 1));
      caretakerBodies.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.21, z), new THREE.Quaternion(), scale.set(1, 1, 1));
      caretakerHeads.setMatrixAt(index, matrix);
      quaternion.setFromEuler(new THREE.Euler(0, 0, side * 0.18));
      matrix.compose(position.set(x, 1.06, z + 0.035), quaternion, scale.set(1, 1, 1));
      caretakerSashes.setMatrixAt(index, matrix);
    });
    caretakerBodies.instanceMatrix.needsUpdate = true;
    caretakerHeads.instanceMatrix.needsUpdate = true;
    caretakerSashes.instanceMatrix.needsUpdate = true;
    caretakingProps.add(caretakerBodies, caretakerHeads, caretakerSashes);
  }
  compactIsland12StaticPresentationGeometry(caretakingProps, 'ISLAND_12_VAULT_CARETAKING_TERRACES');
  caretakingProps.rotation.y = approachYaw;
  root.add(caretakingProps);

  const vaultGroundLife = createLandmarkGroundLife(
    'ISLAND_12_VAULT_GYPSUM_GARDEN_GROUND_LIFE',
    level,
    materials,
    [
      [-1.2, -0.72, -0.18], [1.2, -0.72, 0.18],
      [-1.3, -0.06, 0.12], [1.3, -0.06, -0.12],
      [-0.86, -1.12, 0.28], [0.86, -1.12, -0.28],
      [-1.34, 0.56, -0.24], [1.34, 0.56, 0.24],
      [-0.46, -1.32, 0.08], [0.46, -1.32, -0.08],
    ],
    [0x557f4a, 0x789554, 0x9ca261, 0x466f44],
  );
  vaultGroundLife.rotation.y = approachYaw;
  root.add(vaultGroundLife);

  root.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('scarab-egg-vault', root, 'landmark'),
    registerIsland12RuntimePart('vault-retaining-ring', retainingRing, 'landmark-detail'),
    registerIsland12RuntimePart('vault-rib-array', cage, 'landmark-detail'),
    registerIsland12RuntimePart('vault-egg-chamber', chamber, 'landmark-detail'),
    registerIsland12RuntimePart('vault-incubation-water', incubation, 'landmark-detail'),
    registerIsland12RuntimePart('vault-caretaking-props', caretakingProps, 'landmark-life'),
    registerIsland12RuntimePart('vault-ground-life', vaultGroundLife, 'landmark-life'),
    ...(level === 3 ? [registerIsland12RuntimePart('vault-shade-canopy', shadeCanopy, 'landmark-detail')] : []),
  ] };
  return root;
}

function createSunweavePavilion(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island12SunkenSandsMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_SUNWEAVE_PAVILION_PIVOT';
  addLandmarkPlatform(root, 1.08, materials, quality);
  addFrontStairs(root, materials, 0.82, 3);

  const deckY = 0.565;
  const postBaseY = 0.55;
  const postHeight = level === 1 ? 1.08 : level === 2 ? 1.36 : 1.52;
  const canopyY = postBaseY + postHeight;
  const postPositions = [[-0.72, -0.5], [0.72, -0.5], [-0.72, 0.5], [0.72, 0.5]] as const;
  const pavilionMatrix = new THREE.Matrix4();

  const structure = new THREE.Group();
  structure.name = 'ISLAND_12_PAVILION_SOCKETED_FRAME';
  const posts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.048, 0.07, postHeight, 8),
    materials.palmWood,
    postPositions.length,
  );
  posts.name = 'ISLAND_12_PAVILION_POST_ARRAY';
  postPositions.forEach(([x, z], index) => {
    pavilionMatrix.makeTranslation(x, postBaseY + postHeight / 2, z);
    posts.setMatrixAt(index, pavilionMatrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  structure.add(posts);

  const sockets = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.095, 0.105, 0.12, 10),
    materials.gold,
    postPositions.length,
  );
  sockets.name = 'ISLAND_12_PAVILION_POST_SOCKET_ARRAY';
  const collars = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.068, 0.018, 5, 10),
    materials.gold,
    postPositions.length,
  );
  collars.name = 'ISLAND_12_PAVILION_POST_COLLAR_ARRAY';
  const finials = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.09, 0.18, 7),
    materials.gold,
    postPositions.length,
  );
  finials.name = 'ISLAND_12_PAVILION_FINIAL_ARRAY';
  postPositions.forEach(([x, z], index) => {
    pavilionMatrix.makeTranslation(x, deckY + 0.055, z);
    sockets.setMatrixAt(index, pavilionMatrix);
    pavilionMatrix.makeRotationX(Math.PI / 2);
    pavilionMatrix.setPosition(x, canopyY - 0.11, z);
    collars.setMatrixAt(index, pavilionMatrix);
    pavilionMatrix.makeTranslation(x, canopyY + 0.09, z);
    finials.setMatrixAt(index, pavilionMatrix);
  });
  sockets.instanceMatrix.needsUpdate = true;
  collars.instanceMatrix.needsUpdate = true;
  finials.instanceMatrix.needsUpdate = true;
  structure.add(sockets, collars, finials);

  const upperRails = [
    [new THREE.Vector3(-0.72, canopyY - 0.07, -0.5), new THREE.Vector3(0.72, canopyY - 0.07, -0.5)],
  ] as const;
  upperRails.forEach(([start, end]) => structure.add(pipeBetween(start, end, 0.024, materials.palmWood, 7)));
  compactIsland12StaticPresentationGeometry(structure, 'ISLAND_12_PAVILION_SOCKETED_FRAME');
  root.add(structure);

  const canopy = new THREE.Group();
  canopy.name = 'ISLAND_12_PAVILION_CANOPY';
  // Keep the bespoke cloth surfaces in their own compaction batches. The
  // tensioned grids intentionally omit UVs, while the tassel primitives carry
  // them; sharing one material UUID would make mergeGeometries reject the
  // mixed attribute sets and silently drop the canopy panels.
  const crimsonCanopyMaterial = materials.crimson.clone();
  crimsonCanopyMaterial.name = 'ISLAND_12_PAVILION_CRIMSON_CLOTH';
  crimsonCanopyMaterial.emissive.setHex(0x25060a);
  crimsonCanopyMaterial.emissiveIntensity = 0.08;
  const coralCanopyMaterial = materials.coral.clone();
  coralCanopyMaterial.name = 'ISLAND_12_PAVILION_CORAL_CLOTH';
  coralCanopyMaterial.emissive.setHex(0x2b0d05);
  coralCanopyMaterial.emissiveIntensity = 0.07;

  const leftCorners = [
    new THREE.Vector3(-0.76, canopyY - 0.07, -0.54),
    new THREE.Vector3(-0.16, canopyY + 0.16, -0.54),
    new THREE.Vector3(-0.16, canopyY + 0.12, 0.1),
    new THREE.Vector3(-0.76, canopyY - 0.1, 0.08),
  ] as const;
  const rightCorners = [
    new THREE.Vector3(-0.12, canopyY + 0.14, -0.5),
    new THREE.Vector3(0.76, canopyY - 0.05, -0.5),
    new THREE.Vector3(0.76, canopyY - 0.09, 0.2),
    new THREE.Vector3(-0.12, canopyY + 0.12, 0.14),
  ] as const;
  const leftPanel = new THREE.Mesh(
    createTensionedCanopyGeometry(leftCorners, level === 1 ? 0.08 : 0.13, quality === 'low' ? 3 : 5),
    crimsonCanopyMaterial,
  );
  leftPanel.name = 'ISLAND_12_PAVILION_CRIMSON_CANOPY_PANEL';
  const rightPanel = new THREE.Mesh(
    createTensionedCanopyGeometry(rightCorners, level === 1 ? 0.07 : 0.11, quality === 'low' ? 3 : 5),
    level >= 2 ? coralCanopyMaterial : crimsonCanopyMaterial,
  );
  rightPanel.name = 'ISLAND_12_PAVILION_CORAL_CANOPY_PANEL';
  canopy.add(leftPanel, rightPanel);

  const ridgeStart = new THREE.Vector3(-0.14, canopyY + 0.165, -0.57);
  const ridgeEnd = new THREE.Vector3(-0.14, canopyY + 0.145, 0.22);
  canopy.add(pipeBetween(ridgeStart, ridgeEnd, 0.022, materials.gold, 8));
  [
    [leftCorners[0], leftCorners[3]],
    [rightCorners[1], rightCorners[2]],
    [leftCorners[0], leftCorners[1]],
    [rightCorners[0], rightCorners[1]],
    [leftCorners[3], leftCorners[2]],
    [rightCorners[3], rightCorners[2]],
  ].forEach(([start, end]) => canopy.add(pipeBetween(start, end, 0.012, materials.gold, 6)));
  canopy.add(
    pipeBetween(leftCorners[3], new THREE.Vector3(-0.72, canopyY - 0.07, 0.5), 0.012, materials.gold, 6),
    pipeBetween(rightCorners[2], new THREE.Vector3(0.72, canopyY - 0.07, 0.5), 0.012, materials.gold, 6),
    pipeBetween(rightCorners[1], new THREE.Vector3(0.72, canopyY - 0.07, -0.5), 0.012, materials.gold, 6),
  );

  const sunKnot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), materials.gold);
  sunKnot.name = 'ISLAND_12_PAVILION_CANOPY_SUN_KNOT';
  sunKnot.position.copy(ridgeEnd);
  canopy.add(
    sunKnot,
    pipeBetween(ridgeEnd, new THREE.Vector3(-0.72, canopyY - 0.07, 0.5), 0.009, materials.gold, 6),
    pipeBetween(ridgeEnd, new THREE.Vector3(0.72, canopyY - 0.07, 0.5), 0.009, materials.gold, 6),
  );

  const canopySeams = new THREE.Group();
  canopySeams.name = 'ISLAND_12_PAVILION_CANOPY_SEAMS';
  [0.32, 0.62].forEach((progress) => {
    canopySeams.add(
      pipeBetween(leftCorners[0].clone().lerp(leftCorners[3], progress), leftCorners[1].clone().lerp(leftCorners[2], progress), 0.009, materials.linen, 5),
      pipeBetween(rightCorners[0].clone().lerp(rightCorners[3], progress), rightCorners[1].clone().lerp(rightCorners[2], progress), 0.009, materials.gold, 5),
    );
  });
  canopy.add(canopySeams);

  if (level >= 2) {
    const accentCorners = [
      new THREE.Vector3(-0.22, canopyY + 0.02, 0.02),
      new THREE.Vector3(0.22, canopyY + 0.02, 0.04),
      new THREE.Vector3(0.28, canopyY - 0.15, 0.18),
      new THREE.Vector3(-0.18, canopyY - 0.16, 0.16),
    ] as const;
    const accentPanel = new THREE.Mesh(
      createTensionedCanopyGeometry(accentCorners, 0.035, 3),
      coralCanopyMaterial,
    );
    accentPanel.name = 'ISLAND_12_PAVILION_SUNWEAVE_VALANCE';
    canopy.add(accentPanel);
  }

  if (level >= 2) {
    const tasselCount = level === 2 ? 5 : 7;
    const goldCount = Math.ceil(tasselCount / 2);
    const coralCount = Math.floor(tasselCount / 2);
    const tasselGeometry = new THREE.ConeGeometry(0.045, 0.12, 7);
    const goldTassels = new THREE.InstancedMesh(tasselGeometry, materials.gold, goldCount);
    const coralTassels = new THREE.InstancedMesh(tasselGeometry, materials.coral, coralCount);
    goldTassels.name = 'ISLAND_12_PAVILION_GOLD_TASSEL_ARRAY';
    coralTassels.name = 'ISLAND_12_PAVILION_CORAL_TASSEL_ARRAY';
    let goldTasselIndex = 0;
    let coralTasselIndex = 0;
    for (let index = 0; index < tasselCount; index += 1) {
      const x = -0.64 + index * (1.28 / Math.max(1, tasselCount - 1));
      const y = canopyY - 0.17 + (1 - Math.abs(x) / 0.7) * 0.055;
      pavilionMatrix.makeTranslation(x, y, 0.17);
      if (index % 2) {
        coralTassels.setMatrixAt(coralTasselIndex, pavilionMatrix);
        coralTasselIndex += 1;
      } else {
        goldTassels.setMatrixAt(goldTasselIndex, pavilionMatrix);
        goldTasselIndex += 1;
      }
    }
    goldTassels.instanceMatrix.needsUpdate = true;
    coralTassels.instanceMatrix.needsUpdate = true;
    canopy.add(goldTassels, coralTassels);

    const tasselTails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.014, 0.13, 5), materials.crimson, tasselCount);
    tasselTails.name = 'ISLAND_12_PAVILION_TASSEL_TAIL_ARRAY';
    for (let index = 0; index < tasselCount; index += 1) {
      const x = -0.64 + index * (1.28 / Math.max(1, tasselCount - 1));
      const y = canopyY - 0.285 + (1 - Math.abs(x) / 0.7) * 0.055;
      pavilionMatrix.makeTranslation(x, y, 0.17);
      tasselTails.setMatrixAt(index, pavilionMatrix);
    }
    tasselTails.instanceMatrix.needsUpdate = true;
    canopy.add(tasselTails);

    if (level >= 3) {
      const beadCount = 11;
      const canopyBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 7, 5), materials.turquoise, beadCount);
      canopyBeads.name = 'ISLAND_12_PAVILION_TURQUOISE_BEAD_GARLAND';
      for (let index = 0; index < beadCount; index += 1) {
        const x = -0.56 + index * (1.12 / Math.max(1, beadCount - 1));
        const curve = Math.sin((index / Math.max(1, beadCount - 1)) * Math.PI) * 0.085;
        pavilionMatrix.makeTranslation(x, canopyY - 0.24 - curve, 0.185);
        canopyBeads.setMatrixAt(index, pavilionMatrix);
      }
      canopyBeads.instanceMatrix.needsUpdate = true;
      canopy.add(canopyBeads);
    }
  }
  compactIsland12StaticPresentationGeometry(canopy, 'ISLAND_12_PAVILION_CANOPY');
  root.add(canopy);

  const activity = new THREE.Group();
  activity.name = 'ISLAND_12_PAVILION_CRAFT_AND_GATHERING_DECK';
  const mainRug = box(level === 1 ? 0.78 : 0.9, 0.025, 0.5, level === 1 ? materials.linen : materials.crimson);
  mainRug.position.set(0.08, deckY + 0.014, 0.13);
  mainRug.rotation.y = -0.08;
  activity.add(mainRug);
  const rugStripeCount = level === 1 ? 3 : 5;
  const rugStripes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.48), materials.gold, rugStripeCount);
  rugStripes.name = 'ISLAND_12_PAVILION_RUG_STRIPE_ARRAY';
  for (let index = 0; index < rugStripeCount; index += 1) {
    pavilionMatrix.makeTranslation(-0.22 + index * 0.14, deckY + 0.032, 0.13);
    rugStripes.setMatrixAt(index, pavilionMatrix);
  }
  rugStripes.instanceMatrix.needsUpdate = true;
  activity.add(rugStripes);

  if (level >= 2) {
    const fringeCount = 10;
    const rugFringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.024, 0.1), materials.linen, fringeCount);
    rugFringe.name = 'ISLAND_12_PAVILION_RUG_FRINGE_ARRAY';
    for (let index = 0; index < fringeCount; index += 1) {
      const x = -0.32 + index * 0.09;
      pavilionMatrix.makeTranslation(x, deckY + 0.018, 0.405);
      rugFringe.setMatrixAt(index, pavilionMatrix);
    }
    rugFringe.instanceMatrix.needsUpdate = true;
    activity.add(rugFringe);

    const rugMotifs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.105, 0.032, 0.105), materials.turquoise, 4);
    rugMotifs.name = 'ISLAND_12_PAVILION_RUG_DIAMOND_MOTIF_ARRAY';
    for (let index = 0; index < 4; index += 1) {
      pavilionMatrix.makeRotationY(Math.PI / 4);
      pavilionMatrix.setPosition(-0.13 + index * 0.16, deckY + 0.035, 0.13);
      rugMotifs.setMatrixAt(index, pavilionMatrix);
    }
    rugMotifs.instanceMatrix.needsUpdate = true;
    activity.add(rugMotifs);
  }

  if (level >= 2) {
    const loomFrame = new THREE.Group();
    loomFrame.name = 'ISLAND_12_PAVILION_SIDE_LOOM';
    [-0.43, 0.13].forEach((x) => {
      const upright = cylinder(0.032, 0.042, 0.66, materials.palmWood, 7);
      upright.position.set(x, deckY + 0.33, -0.22);
      loomFrame.add(upright);
    });
    [deckY + 0.07, deckY + 0.58].forEach((y) => {
      const rail = box(0.64, 0.05, 0.055, materials.palmWood);
      rail.position.set(-0.15, y, -0.22);
      loomFrame.add(rail);
    });
    const textile = box(0.42, 0.42, 0.03, materials.coral);
    textile.position.set(-0.15, deckY + 0.33, -0.18);
    loomFrame.add(textile);
    const loomThreads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 5), materials.gold, 6);
    loomThreads.name = 'ISLAND_12_PAVILION_LOOM_THREAD_ARRAY';
    for (let index = 0; index < 6; index += 1) {
      pavilionMatrix.makeTranslation(-0.32 + index * 0.068, deckY + 0.33, -0.153);
      loomThreads.setMatrixAt(index, pavilionMatrix);
    }
    loomThreads.instanceMatrix.needsUpdate = true;
    loomFrame.add(loomThreads);
    const wovenBands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.025, 0.018), materials.linen, 4);
    wovenBands.name = 'ISLAND_12_PAVILION_LOOM_WOVEN_BAND_ARRAY';
    for (let index = 0; index < 4; index += 1) {
      pavilionMatrix.makeTranslation(-0.15, deckY + 0.2 + index * 0.09, -0.141);
      wovenBands.setMatrixAt(index, pavilionMatrix);
    }
    wovenBands.instanceMatrix.needsUpdate = true;
    loomFrame.add(wovenBands);
    const rolledTextile = cylinder(0.06, 0.06, 0.34, materials.linen, 8);
    rolledTextile.position.set(-0.16, deckY + 0.07, 0.0);
    rolledTextile.rotation.z = Math.PI / 2;
    loomFrame.add(rolledTextile);
    activity.add(loomFrame);

    const cushionGeometry = new THREE.CylinderGeometry(0.14, 0.16, 0.08, 10);
    const coralCushions = new THREE.InstancedMesh(cushionGeometry, materials.coral, 2);
    coralCushions.name = 'ISLAND_12_PAVILION_CUSHION_ARRAY';
    [[0.28, 0.3], [0.5, 0.12]].forEach(([x, z], index) => {
      pavilionMatrix.makeTranslation(x, deckY + 0.05, z);
      coralCushions.setMatrixAt(index, pavilionMatrix);
    });
    coralCushions.instanceMatrix.needsUpdate = true;
    activity.add(coralCushions);
    const cushionTufts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.027, 7, 5), materials.gold, 2);
    cushionTufts.name = 'ISLAND_12_PAVILION_CUSHION_TUFT_ARRAY';
    [[0.28, 0.3], [0.5, 0.12]].forEach(([x, z], index) => {
      pavilionMatrix.makeTranslation(x, deckY + 0.095, z);
      cushionTufts.setMatrixAt(index, pavilionMatrix);
    });
    cushionTufts.instanceMatrix.needsUpdate = true;
    activity.add(cushionTufts);

    const jarPositions = [[0.45, -0.34], [0.64, -0.22]] as const;
    const jars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.115, 10, 7), materials.ceramic, jarPositions.length);
    jars.name = 'ISLAND_12_PAVILION_WATER_JAR_ARRAY';
    jarPositions.forEach(([x, z], index) => {
      pavilionMatrix.compose(
        new THREE.Vector3(x, deckY + 0.14, z),
        new THREE.Quaternion(),
        new THREE.Vector3(index === 0 ? 0.92 : 0.78, index === 0 ? 1.28 : 1, index === 0 ? 0.92 : 0.78),
      );
      jars.setMatrixAt(index, pavilionMatrix);
    });
    jars.instanceMatrix.needsUpdate = true;
    activity.add(jars);
    const jarNecks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.07, 0.1, 8), materials.gold, jarPositions.length);
    jarNecks.name = 'ISLAND_12_PAVILION_WATER_JAR_NECK_ARRAY';
    jarPositions.forEach(([x, z], index) => {
      pavilionMatrix.makeTranslation(x, deckY + (index === 0 ? 0.285 : 0.25), z);
      jarNecks.setMatrixAt(index, pavilionMatrix);
    });
    jarNecks.instanceMatrix.needsUpdate = true;
    const jarRims = new THREE.InstancedMesh(new THREE.TorusGeometry(0.052, 0.012, 5, 10), materials.linen, jarPositions.length);
    jarRims.name = 'ISLAND_12_PAVILION_WATER_JAR_RIM_ARRAY';
    jarPositions.forEach(([x, z], index) => {
      pavilionMatrix.makeRotationX(Math.PI / 2);
      pavilionMatrix.setPosition(x, deckY + (index === 0 ? 0.335 : 0.3), z);
      jarRims.setMatrixAt(index, pavilionMatrix);
    });
    jarRims.instanceMatrix.needsUpdate = true;
    const jarBands = new THREE.InstancedMesh(new THREE.TorusGeometry(0.09, 0.012, 5, 12), materials.coral, jarPositions.length * 2);
    jarBands.name = 'ISLAND_12_PAVILION_WATER_JAR_PAINTED_BAND_ARRAY';
    jarPositions.forEach(([x, z], jarIndex) => {
      [0.11, 0.18].forEach((bandY, bandIndex) => {
        pavilionMatrix.makeRotationX(Math.PI / 2);
        pavilionMatrix.setPosition(x, deckY + bandY, z);
        const scaleFactor = jarIndex === 0 ? 1 : 0.82;
        pavilionMatrix.scale(new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor));
        jarBands.setMatrixAt(jarIndex * 2 + bandIndex, pavilionMatrix);
      });
    });
    jarBands.instanceMatrix.needsUpdate = true;
    activity.add(jarNecks, jarRims, jarBands);

    jarPositions.forEach(([x, z], index) => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 5, 12, Math.PI * 1.55), materials.gold);
      handle.name = `ISLAND_12_PAVILION_WATER_JAR_HANDLE_${index + 1}`;
      handle.position.set(x + (index === 0 ? 0.09 : -0.075), deckY + (index === 0 ? 0.2 : 0.17), z);
      handle.rotation.z = index === 0 ? -Math.PI * 0.72 : Math.PI * 0.28;
      activity.add(handle);
    });

    const basketPositions = [[-0.62, -0.36], [0.2, -0.36]] as const;
    const baskets = new THREE.InstancedMesh(new THREE.TorusGeometry(0.11, 0.032, 6, 10), materials.palmWood, basketPositions.length);
    baskets.name = 'ISLAND_12_PAVILION_BASKET_ARRAY';
    basketPositions.forEach(([x, z], index) => {
      pavilionMatrix.makeRotationX(Math.PI / 2);
      pavilionMatrix.setPosition(x, deckY + 0.035, z);
      baskets.setMatrixAt(index, pavilionMatrix);
    });
    baskets.instanceMatrix.needsUpdate = true;
    activity.add(baskets);
  }

  if (level >= 3) {
    const workerBodyGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.28, 7);
    const coralWorkerBody = new THREE.InstancedMesh(workerBodyGeometry, materials.coral, 1);
    const crimsonWorkerBody = new THREE.InstancedMesh(workerBodyGeometry, materials.crimson, 1);
    const workerHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), materials.sandstoneLight, 2);
    const workerHair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.083, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), materials.palmWood, 2);
    coralWorkerBody.name = 'ISLAND_12_PAVILION_CORAL_WORKER_BODY';
    crimsonWorkerBody.name = 'ISLAND_12_PAVILION_CRIMSON_WORKER_BODY';
    workerHeads.name = 'ISLAND_12_PAVILION_WORKER_HEAD_ARRAY';
    workerHair.name = 'ISLAND_12_PAVILION_WORKER_HAIR_ARRAY';
    [[-0.16, 0.22, 0.72], [0.34, -0.08, 0.7]].forEach(([x, z, scale], index) => {
      pavilionMatrix.compose(
        new THREE.Vector3(x, deckY + 0.14 * scale, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      if (index === 0) coralWorkerBody.setMatrixAt(0, pavilionMatrix);
      else crimsonWorkerBody.setMatrixAt(0, pavilionMatrix);
      pavilionMatrix.makeTranslation(x, deckY + 0.43 * scale, z);
      workerHeads.setMatrixAt(index, pavilionMatrix);
      pavilionMatrix.makeTranslation(x, deckY + 0.47 * scale, z);
      workerHair.setMatrixAt(index, pavilionMatrix);
    });
    coralWorkerBody.instanceMatrix.needsUpdate = true;
    crimsonWorkerBody.instanceMatrix.needsUpdate = true;
    workerHeads.instanceMatrix.needsUpdate = true;
    workerHair.instanceMatrix.needsUpdate = true;
    activity.add(coralWorkerBody, crimsonWorkerBody, workerHeads, workerHair);

    const workerSashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.028, 0.038), materials.gold, 2);
    workerSashes.name = 'ISLAND_12_PAVILION_WORKER_SASH_ARRAY';
    [[-0.16, 0.22, 0.72], [0.34, -0.08, 0.7]].forEach(([x, z, scale], index) => {
      pavilionMatrix.compose(
        new THREE.Vector3(x, deckY + 0.16 * scale, z + 0.035),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );
      workerSashes.setMatrixAt(index, pavilionMatrix);
    });
    workerSashes.instanceMatrix.needsUpdate = true;
    activity.add(workerSashes);

    const loomWorkerHands = new THREE.Group();
    loomWorkerHands.name = 'ISLAND_12_PAVILION_LOOM_WORKER_ARMS';
    loomWorkerHands.add(
      pipeBetween(new THREE.Vector3(-0.16, deckY + 0.27, 0.21), new THREE.Vector3(-0.28, deckY + 0.35, -0.12), 0.018, materials.sandstoneLight, 6),
      pipeBetween(new THREE.Vector3(-0.12, deckY + 0.27, 0.21), new THREE.Vector3(-0.05, deckY + 0.35, -0.12), 0.018, materials.sandstoneLight, 6),
    );
    activity.add(loomWorkerHands);

    const workTable = cylinder(0.13, 0.16, 0.08, materials.palmWood, 10);
    workTable.position.set(0.4, deckY + 0.08, 0.24);
    const workTableInlay = cylinder(0.1, 0.1, 0.025, materials.gold, 10);
    workTableInlay.position.set(0.4, deckY + 0.135, 0.24);
    activity.add(workTable, workTableInlay);
  }
  compactIsland12StaticPresentationGeometry(activity, 'ISLAND_12_PAVILION_CRAFT_AND_GATHERING_DECK');
  root.add(activity);

  if (level >= 3) {
    const garden = new THREE.Group();
    garden.name = 'ISLAND_12_PAVILION_IRRIGATION_GARDEN';
    const planterPositions = [[-0.86, 0.13], [0.86, 0.13], [-0.82, -0.28], [0.82, -0.28]] as const;
    const planters = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.16, 0.24), materials.sandstoneShadow, planterPositions.length);
    planters.name = 'ISLAND_12_PAVILION_PLANTER_ARRAY';
    planterPositions.forEach(([x, z], index) => {
      pavilionMatrix.makeTranslation(x, deckY + 0.08, z);
      planters.setMatrixAt(index, pavilionMatrix);
    });
    planters.instanceMatrix.needsUpdate = true;
    garden.add(planters);
    const reedCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
    const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 5), materials.palmLeaf, reedCount);
    reeds.name = 'ISLAND_12_PAVILION_REED_ARRAY';
    for (let index = 0; index < reedCount; index += 1) {
      const planter = planterPositions[index % planterPositions.length];
      const x = planter[0] + ((index * 37) % 5 - 2) * 0.035;
      const z = planter[1] + ((index * 29) % 5 - 2) * 0.028;
      const heightScale = 0.72 + (index % 4) * 0.1;
      pavilionMatrix.compose(
        new THREE.Vector3(x, deckY + 0.16 + 0.15 * heightScale, z),
        new THREE.Quaternion(),
        new THREE.Vector3(1, heightScale, 1),
      );
      reeds.setMatrixAt(index, pavilionMatrix);
    }
    reeds.instanceMatrix.needsUpdate = true;
    garden.add(reeds);
    const flowerCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 4;
    const reedFlowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 5), materials.coral, flowerCount);
    reedFlowers.name = 'ISLAND_12_PAVILION_REED_FLOWER_ARRAY';
    for (let index = 0; index < flowerCount; index += 1) {
      const planter = planterPositions[index % planterPositions.length];
      const x = planter[0] + ((index * 37) % 5 - 2) * 0.035;
      const z = planter[1] + ((index * 29) % 5 - 2) * 0.028;
      const heightScale = 0.72 + (index % 4) * 0.1;
      pavilionMatrix.makeTranslation(x, deckY + 0.31 + 0.3 * heightScale, z);
      reedFlowers.setMatrixAt(index, pavilionMatrix);
    }
    reedFlowers.instanceMatrix.needsUpdate = true;
    garden.add(reedFlowers);
    compactIsland12StaticPresentationGeometry(garden, 'ISLAND_12_PAVILION_IRRIGATION_GARDEN');
    root.add(garden);
  }

  const pavilionGroundLife = createLandmarkGroundLife(
    'ISLAND_12_PAVILION_DYE_GARDEN_GROUND_LIFE',
    level,
    materials,
    [
      [-1.2, -0.76, 0.16], [1.2, -0.76, -0.16],
      [-1.3, -0.08, -0.14], [1.3, -0.08, 0.14],
      [-0.82, -1.12, -0.28], [0.82, -1.12, 0.28],
      [-1.34, 0.5, 0.2], [1.34, 0.5, -0.2],
      [-0.44, -1.34, -0.08], [0.44, -1.34, 0.08],
    ],
    [0x3f7b50, 0x6d9a5b, 0x91a955, 0xb29b4d],
  );
  root.add(pavilionGroundLife);

  root.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('sunweave-caravan-pavilion', root, 'landmark'),
    registerIsland12RuntimePart('pavilion-canopy', canopy, 'landmark-detail'),
    registerIsland12RuntimePart('pavilion-ground-life', pavilionGroundLife, 'landmark-life'),
  ] };
  return root;
}

function createMirageEchoCourt(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island12SunkenSandsMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_MIRAGE_ECHO_COURT_PIVOT';
  addLandmarkPlatform(root, 1.12, materials, quality);

  const basin = new THREE.Group();
  basin.name = 'ISLAND_12_ECHO_COURT_SUNKEN_BASIN';
  const basinCavity = cylinder(0.47, 0.53, 0.16, materials.sandstoneShadow, radialSegments(quality) * 2);
  basinCavity.name = 'ISLAND_12_ECHO_COURT_RECESSED_FLOOR';
  basinCavity.position.y = 0.55;
  const mirrorWater = cylinder(0.415, 0.43, 0.028, materials.waterShallow, radialSegments(quality) * 2);
  mirrorWater.name = 'ISLAND_12_ECHO_COURT_MIRROR_WATER_DISC';
  mirrorWater.position.y = 0.642;
  const mirrorRim = torus(0.425, 0.022, materials.gold, radialSegments(quality) * 2);
  mirrorRim.name = 'ISLAND_12_ECHO_COURT_MIRROR_WATER_GOLD_RIM';
  mirrorRim.position.y = 0.663;
  mirrorRim.rotation.x = Math.PI / 2;
  basin.add(basinCavity, mirrorWater, mirrorRim);

  const inlayCount = level === 1 ? 4 : level === 2 ? 6 : 8;
  const inlaySpokes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.29, 0.012, 0.022),
    materials.gold,
    inlayCount,
  );
  inlaySpokes.name = 'ISLAND_12_ECHO_COURT_RESONANCE_INLAY_SPOKE_ARRAY';
  const echoMatrix = new THREE.Matrix4();
  const echoQuaternion = new THREE.Quaternion();
  const echoPosition = new THREE.Vector3();
  const echoScale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < inlayCount; index += 1) {
    const angle = index / inlayCount * Math.PI * 2;
    echoQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    echoMatrix.compose(
      echoPosition.set(Math.cos(angle) * 0.22, 0.671, Math.sin(angle) * 0.22),
      echoQuaternion,
      echoScale,
    );
    inlaySpokes.setMatrixAt(index, echoMatrix);
  }
  inlaySpokes.instanceMatrix.needsUpdate = true;
  const innerInlay = torus(0.15, 0.015, materials.gold, radialSegments(quality));
  innerInlay.name = 'ISLAND_12_ECHO_COURT_INNER_RESONANCE_RING';
  innerInlay.position.y = 0.674;
  innerInlay.rotation.x = Math.PI / 2;
  basin.add(inlaySpokes, innerInlay);
  compactIsland12StaticPresentationGeometry(basin, 'ISLAND_12_ECHO_COURT_BASIN');
  root.add(basin);

  const steps = new THREE.Group();
  steps.name = 'ISLAND_12_ECHO_STEP_ARRAY';
  const stepCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < stepCount; index += 1) {
    const innerRadius = 0.47 + index * 0.14;
    const outerRadius = innerRadius + 0.13;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, outerRadius, radialSegments(quality) * 2, 1, Math.PI * 0.15, Math.PI * 1.7),
      index % 2 ? materials.sandstoneLight : materials.sandstone,
    );
    ring.name = `ISLAND_12_ECHO_LISTENING_TERRACE_${index + 1}`;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.67 + index * 0.075;
    const riser = new THREE.Mesh(
      new THREE.TorusGeometry(outerRadius - 0.015, 0.03, 5, radialSegments(quality) * 2, Math.PI * 1.7),
      materials.sandstoneShadow,
    );
    riser.name = `ISLAND_12_ECHO_DARK_ACOUSTIC_RISER_${index + 1}`;
    riser.rotation.x = Math.PI / 2;
    riser.rotation.z = Math.PI * 0.15;
    riser.position.y = 0.632 + index * 0.075;
    steps.add(ring, riser);
  }

  const stairCount = level === 1 ? 3 : 5;
  const entranceStairs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneLight,
    stairCount,
  );
  entranceStairs.name = 'ISLAND_12_ECHO_COURT_ACCESS_STAIR_ARRAY';
  for (let index = 0; index < stairCount; index += 1) {
    const progress = stairCount <= 1 ? 0 : index / (stairCount - 1);
    echoMatrix.compose(
      echoPosition.set(0, 0.68 + progress * 0.14, 0.48 + progress * 0.44),
      new THREE.Quaternion(),
      echoScale.set(0.34 - progress * 0.035, 0.038, 0.15),
    );
    entranceStairs.setMatrixAt(index, echoMatrix);
  }
  entranceStairs.instanceMatrix.needsUpdate = true;
  steps.add(entranceStairs);
  compactIsland12StaticPresentationGeometry(steps, 'ISLAND_12_ECHO_COURT_SEATING');
  root.add(steps);

  const resonanceInstrument = new THREE.Group();
  resonanceInstrument.name = 'ISLAND_12_ECHO_RESONANCE_INSTRUMENT_NETWORK';
  const instrumentCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let index = 0; index < instrumentCount; index += 1) {
    const angle = index / instrumentCount * Math.PI * 2 + Math.PI * 0.25;
    const instrument = new THREE.Group();
    instrument.name = `ISLAND_12_ECHO_HARP_REFLECTOR_${index + 1}`;
    instrument.position.set(Math.cos(angle) * 0.62, 0.79, Math.sin(angle) * 0.62);
    instrument.rotation.y = -angle + Math.PI / 2;
    const base = box(0.18, 0.055, 0.12, materials.sandstoneWorn);
    base.position.y = -0.07;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.018, 5, quality === 'high' ? 16 : 10, Math.PI * 1.22),
      materials.gold,
    );
    arc.name = `${instrument.name}_GOLD_ARC`;
    arc.position.y = 0.1;
    arc.rotation.z = -Math.PI * 0.61;
    instrument.add(base, arc);
    if (level >= 2) {
      for (let stringIndex = 0; stringIndex < 3; stringIndex += 1) {
        const x = -0.055 + stringIndex * 0.055;
        const string = pipeBetween(
          new THREE.Vector3(x, -0.01, 0.012),
          new THREE.Vector3(x, 0.16 + (1 - Math.abs(stringIndex - 1)) * 0.055, 0.012),
          0.006,
          materials.turquoise,
          5,
        );
        string.name = `${instrument.name}_RESONANCE_STRING_${stringIndex + 1}`;
        instrument.add(string);
      }
    }
    resonanceInstrument.add(instrument);
  }
  compactIsland12StaticPresentationGeometry(resonanceInstrument, 'ISLAND_12_ECHO_RESONANCE_INSTRUMENTS');
  root.add(resonanceInstrument);

  const prismFrame = new THREE.Group();
  prismFrame.name = 'ISLAND_12_ECHO_CENTRAL_PRISM_INSTRUMENT';
  const prismPedestal = cylinder(0.11, 0.15, 0.16, materials.gold, 8);
  prismPedestal.position.y = 0.76;
  prismFrame.add(prismPedestal);
  const prismRing = torus(0.17, 0.018, materials.gold, radialSegments(quality));
  prismRing.position.y = 0.89;
  prismRing.rotation.x = Math.PI / 2;
  prismFrame.add(prismRing);
  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2;
    const support = pipeBetween(
      new THREE.Vector3(Math.cos(angle) * 0.13, 0.73, Math.sin(angle) * 0.13),
      new THREE.Vector3(Math.cos(angle) * 0.17, 0.89, Math.sin(angle) * 0.17),
      0.009,
      materials.gold,
      5,
    );
    prismFrame.add(support);
  }
  let prism: THREE.Mesh | null = null;
  if (level >= 3) {
    prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, quality === 'high' ? 1 : 0), materials.sapphire);
    prism.name = 'ISLAND_12_ECHO_COURT_RESONANCE_PRISM';
    prism.position.y = 0.99;
    prism.scale.set(0.86, 1.35, 0.86);
    prismFrame.add(prism);
  }
  compactIsland12StaticPresentationGeometry(prismFrame, 'ISLAND_12_ECHO_PRISM_FRAME');
  root.add(prismFrame);

  const bannerFrame = new THREE.Group();
  bannerFrame.name = 'ISLAND_12_ECHO_COURT_BANNER_FRAME';
  if (level >= 2) {
    const masts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.026, 0.042, 0.82, 7),
      materials.gold,
      2,
    );
    masts.name = 'ISLAND_12_ECHO_COURT_MAST_ARRAY';
    [-0.62, 0.62].forEach((x, index) => {
      echoMatrix.makeTranslation(x, 1.11, -0.7);
      masts.setMatrixAt(index, echoMatrix);
    });
    masts.instanceMatrix.needsUpdate = true;
    bannerFrame.add(masts);
    const crossbar = pipeBetween(
      new THREE.Vector3(-0.62, 1.48, -0.7),
      new THREE.Vector3(0.62, 1.48, -0.7),
      0.021,
      materials.gold,
      7,
    );
    crossbar.name = 'ISLAND_12_ECHO_COURT_BANNER_CROWN_CROSSBAR';
    bannerFrame.add(crossbar);

    const clothStations = [-0.48, -0.24, 0, 0.24, 0.48];
    const clothVertices: number[] = [];
    const clothIndices: number[] = [];
    clothStations.forEach((x, index) => {
      const sag = 1 - Math.abs(index - 2) / 2;
      clothVertices.push(x, 1.43 - sag * 0.04, -0.715, x, 1.29 - sag * 0.075, -0.715);
    });
    for (let index = 0; index < clothStations.length - 1; index += 1) {
      const top = index * 2;
      clothIndices.push(top, top + 2, top + 3, top, top + 3, top + 1);
    }
    const clothGeometry = new THREE.BufferGeometry();
    clothGeometry.setAttribute('position', new THREE.Float32BufferAttribute(clothVertices, 3));
    clothGeometry.setIndex(clothIndices);
    clothGeometry.computeVertexNormals();
    const crownCloth = new THREE.Mesh(clothGeometry, materials.crimson);
    crownCloth.name = 'ISLAND_12_ECHO_COURT_DRAPED_CROWN_BANNER';
    bannerFrame.add(crownCloth);

    const sidePennants = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.34), materials.coral, 2);
    sidePennants.name = 'ISLAND_12_ECHO_COURT_SIDE_PENNANT_ARRAY';
    [-0.52, 0.52].forEach((x, index) => {
      echoMatrix.compose(
        echoPosition.set(x, 1.2, -0.725),
        new THREE.Quaternion(),
        echoScale.set(index ? -1 : 1, 1, 1),
      );
      sidePennants.setMatrixAt(index, echoMatrix);
    });
    sidePennants.instanceMatrix.needsUpdate = true;
    bannerFrame.add(sidePennants);
  }
  compactIsland12StaticPresentationGeometry(bannerFrame, 'ISLAND_12_ECHO_COURT_BANNER_FRAME');
  root.add(bannerFrame);

  const courtLife = new THREE.Group();
  courtLife.name = 'ISLAND_12_ECHO_COURT_LISTENING_LIFE';
  if (level >= 3) {
    const listenerPositions = [[-0.56, -0.06], [0.56, -0.08]] as const;
    const listenerBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.09, 0.27, 7), materials.coral, 2);
    const listenerHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 7, 5), materials.sandstoneLight, 2);
    const listenerCowls = new THREE.InstancedMesh(new THREE.ConeGeometry(0.075, 0.12, 7), materials.linen, 2);
    listenerBodies.name = 'ISLAND_12_ECHO_COURT_LISTENER_BODY_ARRAY';
    listenerHeads.name = 'ISLAND_12_ECHO_COURT_LISTENER_HEAD_ARRAY';
    listenerCowls.name = 'ISLAND_12_ECHO_COURT_LISTENER_COWL_ARRAY';
    listenerPositions.forEach(([x, z], index) => {
      echoMatrix.makeTranslation(x, 0.98, z);
      listenerBodies.setMatrixAt(index, echoMatrix);
      echoMatrix.makeTranslation(x, 1.18, z);
      listenerHeads.setMatrixAt(index, echoMatrix);
      echoMatrix.makeTranslation(x, 1.27, z);
      listenerCowls.setMatrixAt(index, echoMatrix);
    });
    listenerBodies.instanceMatrix.needsUpdate = true;
    listenerHeads.instanceMatrix.needsUpdate = true;
    listenerCowls.instanceMatrix.needsUpdate = true;

    const stoolPositions = [[-0.74, 0.24], [0.74, 0.24], [-0.62, 0.48], [0.62, 0.48]] as const;
    const stools = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 7), materials.palmWood, stoolPositions.length);
    stools.name = 'ISLAND_12_ECHO_COURT_LISTENING_STOOL_ARRAY';
    const soundBowls = new THREE.InstancedMesh(new THREE.TorusGeometry(0.075, 0.02, 5, 10), materials.turquoise, stoolPositions.length);
    soundBowls.name = 'ISLAND_12_ECHO_COURT_SOUND_BOWL_ARRAY';
    stoolPositions.forEach(([x, z], index) => {
      echoMatrix.makeTranslation(x, 0.9 + index % 2 * 0.07, z);
      stools.setMatrixAt(index, echoMatrix);
      echoMatrix.makeRotationX(Math.PI / 2);
      echoMatrix.setPosition(x, 0.97 + index % 2 * 0.07, z);
      soundBowls.setMatrixAt(index, echoMatrix);
    });
    stools.instanceMatrix.needsUpdate = true;
    soundBowls.instanceMatrix.needsUpdate = true;
    courtLife.add(listenerBodies, listenerHeads, listenerCowls, stools, soundBowls);

    const planterPositions = [[-0.87, -0.12], [0.87, -0.12]] as const;
    const planters = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 8), materials.ceramic, 2);
    planters.name = 'ISLAND_12_ECHO_COURT_REED_PLANTER_ARRAY';
    const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.012, 0.28, 5), materials.palmLeaf, 8);
    reeds.name = 'ISLAND_12_ECHO_COURT_RESONANCE_REED_ARRAY';
    planterPositions.forEach(([x, z], planterIndex) => {
      echoMatrix.makeTranslation(x, 0.91, z);
      planters.setMatrixAt(planterIndex, echoMatrix);
      for (let reedIndex = 0; reedIndex < 4; reedIndex += 1) {
        echoMatrix.compose(
          echoPosition.set(x + (reedIndex - 1.5) * 0.032, 1.1 + reedIndex % 2 * 0.04, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (reedIndex - 1.5) * 0.06)),
          echoScale.set(1, 0.85 + reedIndex % 2 * 0.18, 1),
        );
        reeds.setMatrixAt(planterIndex * 4 + reedIndex, echoMatrix);
      }
    });
    planters.instanceMatrix.needsUpdate = true;
    reeds.instanceMatrix.needsUpdate = true;
    courtLife.add(planters, reeds);
  }
  compactIsland12StaticPresentationGeometry(courtLife, 'ISLAND_12_ECHO_COURT_LISTENING_LIFE');
  root.add(courtLife);

  const runtimeParts = [
    registerIsland12RuntimePart('mirage-echo-court', root, 'landmark'),
    registerIsland12RuntimePart('echo-court-basin', basin, 'landmark-detail'),
    registerIsland12RuntimePart('echo-court-seating', steps, 'landmark-detail'),
    registerIsland12RuntimePart('echo-court-banner-frame', bannerFrame, 'landmark-detail'),
    registerIsland12RuntimePart('echo-resonance-instruments', resonanceInstrument, 'landmark-detail'),
    registerIsland12RuntimePart('echo-step-array', steps, 'landmark-detail'),
  ];
  if (prism) runtimeParts.push(registerIsland12RuntimePart('echo-resonance-prism', prism, 'landmark-detail'));
  root.userData.sculptRuntime = { parts: runtimeParts };
  return root;
}

function createSapphireArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island12SunkenSandsMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_SAPPHIRE_ARCHIVE_PIVOT';
  root.rotation.y = 1.9;
  addLandmarkPlatform(root, 1.08, materials, quality);

  const stairCount = 5;
  const stairGeometry = new THREE.BoxGeometry(1, 1, 1);
  const processionalStairs = new THREE.InstancedMesh(stairGeometry, materials.sandstoneLight, stairCount);
  processionalStairs.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_ARRAY';
  const stairInlays = new THREE.InstancedMesh(stairGeometry, materials.turquoise, stairCount);
  stairInlays.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_INLAY_ARRAY';
  const stairEdgeTrim = new THREE.InstancedMesh(stairGeometry, materials.gold, stairCount);
  stairEdgeTrim.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_GOLD_EDGE_ARRAY';
  const stairCavityLines = new THREE.InstancedMesh(stairGeometry, materials.archiveSandstoneCavity, stairCount);
  stairCavityLines.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_CAVITY_ARRAY';
  const stairWearPatches = new THREE.InstancedMesh(stairGeometry, materials.archiveSandstoneEdgeWear, stairCount * 2);
  stairWearPatches.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_WEAR_PATCH_ARRAY';
  const stairMatrix = new THREE.Matrix4();
  const stairInlayMatrix = new THREE.Matrix4();
  const stairEdgeMatrix = new THREE.Matrix4();
  const stairCavityMatrix = new THREE.Matrix4();
  const stairWearMatrix = new THREE.Matrix4();
  const stairWidths: number[] = [];
  const stairCentres: THREE.Vector3[] = [];
  for (let index = 0; index < stairCount; index += 1) {
    const width = 1.08 - index * 0.08;
    const centre = new THREE.Vector3(0, 0.31 + index * 0.07, 1.12 - index * 0.12);
    stairWidths.push(width);
    stairCentres.push(centre);
    stairMatrix.compose(
      centre,
      new THREE.Quaternion(),
      new THREE.Vector3(width, 0.11, 0.19),
    );
    processionalStairs.setMatrixAt(index, stairMatrix);
    stairInlayMatrix.compose(
      new THREE.Vector3(0, centre.y + 0.061, centre.z + 0.015),
      new THREE.Quaternion(),
      new THREE.Vector3(width * 0.64, 0.014, 0.042),
    );
    stairInlays.setMatrixAt(index, stairInlayMatrix);
    stairEdgeMatrix.compose(
      new THREE.Vector3(0, centre.y + 0.027, centre.z + 0.101),
      new THREE.Quaternion(),
      new THREE.Vector3(width * 0.94, 0.032, 0.018),
    );
    stairEdgeTrim.setMatrixAt(index, stairEdgeMatrix);
    stairCavityMatrix.compose(
      new THREE.Vector3(0, centre.y - 0.018, centre.z + 0.105),
      new THREE.Quaternion(),
      new THREE.Vector3(width * 0.96, 0.015, 0.014),
    );
    stairCavityLines.setMatrixAt(index, stairCavityMatrix);
    [-1, 1].forEach((side, sideIndex) => {
      stairWearMatrix.compose(
        new THREE.Vector3(side * width * 0.38, centre.y + 0.061, centre.z + 0.108),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side * 0.08, side * 0.035)),
        new THREE.Vector3(0.12 + (index % 2) * 0.025, 0.012, 0.03),
      );
      stairWearPatches.setMatrixAt(index * 2 + sideIndex, stairWearMatrix);
    });
  }
  processionalStairs.instanceMatrix.needsUpdate = true;
  stairInlays.instanceMatrix.needsUpdate = true;
  stairEdgeTrim.instanceMatrix.needsUpdate = true;
  stairCavityLines.instanceMatrix.needsUpdate = true;
  stairWearPatches.instanceMatrix.needsUpdate = true;
  root.add(processionalStairs, stairInlays, stairEdgeTrim, stairCavityLines, stairWearPatches);

  const stairStoryGlyphs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.archiveSandstoneCavity,
    stairCount * 2,
  );
  stairStoryGlyphs.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_STORY_GLYPH_ARRAY';
  const stairChapterMarkers = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(1, 0),
    materials.gold,
    stairCount,
  );
  stairChapterMarkers.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_CHAPTER_MARKER_ARRAY';
  const stairDustPockets = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    materials.sand,
    stairCount,
  );
  stairDustPockets.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_STAIR_DUST_POCKET_ARRAY';
  const stairStoryMatrix = new THREE.Matrix4();
  const stairChapterMatrix = new THREE.Matrix4();
  const stairDustMatrix = new THREE.Matrix4();
  stairCentres.forEach((centre, index) => {
    const width = stairWidths[index];
    [-1, 1].forEach((side, sideIndex) => {
      stairStoryMatrix.compose(
        new THREE.Vector3(side * width * 0.31, centre.y + 0.004, centre.z + 0.112),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * (0.18 + index * 0.025))),
        new THREE.Vector3(0.092 - index * 0.006, 0.019, 0.012),
      );
      stairStoryGlyphs.setMatrixAt(index * 2 + sideIndex, stairStoryMatrix);
    });
    stairChapterMatrix.compose(
      new THREE.Vector3(0, centre.y + 0.005, centre.z + 0.116),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 4)),
      new THREE.Vector3(0.026, 0.036 + (index % 2) * 0.008, 0.01),
    );
    stairChapterMarkers.setMatrixAt(index, stairChapterMatrix);
    const dustSide = index % 2 === 0 ? -1 : 1;
    stairDustMatrix.compose(
      new THREE.Vector3(dustSide * width * (0.39 - index * 0.012), centre.y + 0.069, centre.z + 0.04),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, index * 0.73, dustSide * 0.08)),
      new THREE.Vector3(0.068 + (index % 3) * 0.012, 0.009, 0.035 + (index % 2) * 0.009),
    );
    stairDustPockets.setMatrixAt(index, stairDustMatrix);
  });
  stairStoryGlyphs.instanceMatrix.needsUpdate = true;
  stairChapterMarkers.instanceMatrix.needsUpdate = true;
  stairDustPockets.instanceMatrix.needsUpdate = true;
  root.add(stairStoryGlyphs, stairChapterMarkers, stairDustPockets);

  const processionalRails = new THREE.Group();
  processionalRails.name = 'ISLAND_12_ARCHIVE_PROCESSIONAL_RAILS';
  [-1, 1].forEach((side, sideIndex) => {
    const railPoints = stairCentres.map((centre, index) => new THREE.Vector3(
      side * stairWidths[index] * 0.47,
      centre.y + 0.24,
      centre.z,
    ));
    const railStart = railPoints[0];
    const railEnd = railPoints[railPoints.length - 1];
    const stoneRail = pipeBetween(railStart, railEnd, 0.052, materials.sandstoneWorn, 8);
    stoneRail.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_STONE_RAIL_${sideIndex + 1}`;
    const goldRail = pipeBetween(
      railStart.clone().add(new THREE.Vector3(0, 0.037, 0)),
      railEnd.clone().add(new THREE.Vector3(0, 0.037, 0)),
      0.026,
      materials.gold,
      8,
    );
    goldRail.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_GOLD_RAIL_${sideIndex + 1}`;
    const turquoiseRail = pipeBetween(
      railStart.clone().add(new THREE.Vector3(-side * 0.022, 0.032, 0)),
      railEnd.clone().add(new THREE.Vector3(-side * 0.018, 0.032, 0)),
      0.011,
      materials.turquoise,
      6,
    );
    turquoiseRail.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_RAIL_INLAY_${sideIndex + 1}`;
    processionalRails.add(stoneRail, goldRail, turquoiseRail);
    railPoints.forEach((railPoint, index) => {
      const stairTopY = stairCentres[index].y + 0.058;
      const baluster = pipeBetween(
        new THREE.Vector3(railPoint.x, stairTopY - 0.015, railPoint.z),
        railPoint,
        0.014,
        materials.sandstoneLight,
        5,
      );
      baluster.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_BALUSTER_${sideIndex + 1}_${index + 1}`;
      const balusterCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), materials.gold);
      balusterCap.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_BALUSTER_CAP_${sideIndex + 1}_${index + 1}`;
      balusterCap.position.copy(railPoint).add(new THREE.Vector3(0, 0.015, 0));
      processionalRails.add(baluster, balusterCap);
    });
    [
      { point: railStart, stairTopY: stairCentres[0].y + 0.058, height: 0.36, radius: 0.078 },
      { point: railEnd, stairTopY: stairCentres[stairCount - 1].y + 0.058, height: 0.28, radius: 0.06 },
    ].forEach(({ point, stairTopY, height, radius }, postIndex) => {
      const newel = cylinder(radius * 0.82, radius, height, materials.sandstoneWorn, 8);
      newel.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_NEWEL_${sideIndex + 1}_${postIndex + 1}`;
      newel.position.set(point.x, stairTopY + height * 0.5, point.z);
      const newelFoot = cylinder(radius * 1.16, radius * 1.08, 0.065, materials.gold, 8);
      newelFoot.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_NEWEL_FOOT_${sideIndex + 1}_${postIndex + 1}`;
      newelFoot.position.set(point.x, stairTopY + 0.018, point.z);
      const newelCap = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.88, 0), materials.gold);
      newelCap.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_NEWEL_CAP_${sideIndex + 1}_${postIndex + 1}`;
      newelCap.position.set(point.x, stairTopY + height + radius * 0.34, point.z);
      const newelGem = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.43, 0), materials.turquoise);
      newelGem.name = `ISLAND_12_ARCHIVE_PROCESSIONAL_NEWEL_GEM_${sideIndex + 1}_${postIndex + 1}`;
      newelGem.position.set(point.x - side * radius * 0.84, stairTopY + height * 0.67, point.z);
      newelGem.scale.set(0.58, 1.04, 0.42);
      processionalRails.add(newel, newelFoot, newelCap, newelGem);
    });
  });
  root.add(processionalRails);

  const masonry = new THREE.Group();
  masonry.name = 'ISLAND_12_ARCHIVE_STEPPED_MASONRY';
  const foundation = box(1.5, 0.24, 1.34, materials.sandstoneShadow);
  foundation.name = 'ISLAND_12_ARCHIVE_FOUNDATION';
  foundation.position.set(0, 0.68, -0.04);
  masonry.add(foundation);

  const lowerTier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.59, 0.84, 0.8, 4, 1, false),
    materials.sandstoneLight,
  );
  lowerTier.name = 'ISLAND_12_ARCHIVE_READING_CHAMBER';
  lowerTier.position.set(0, 1.08, -0.04);
  lowerTier.rotation.y = Math.PI / 4;
  masonry.add(lowerTier);

  const lowerCourse = box(1.24, 0.075, 1.12, materials.gold);
  lowerCourse.name = 'ISLAND_12_ARCHIVE_LOWER_GOLD_COURSE';
  lowerCourse.position.set(0, 0.77, -0.04);
  const lowerInlay = box(1.13, 0.045, 1.135, materials.turquoise);
  lowerInlay.name = 'ISLAND_12_ARCHIVE_LOWER_RECORD_INLAY';
  lowerInlay.position.set(0, 0.81, -0.04);
  masonry.add(lowerCourse, lowerInlay);

  if (level >= 2) {
    const middleTier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.61, 0.7, 4, 1, false),
      materials.sandstone,
    );
    middleTier.name = 'ISLAND_12_ARCHIVE_OBELISK_TIER';
    middleTier.position.set(0, 1.68, -0.06);
    middleTier.rotation.y = Math.PI / 4;
    masonry.add(middleTier);
    const middleCourse = box(0.91, 0.07, 0.82, materials.gold);
    middleCourse.name = 'ISLAND_12_ARCHIVE_MIDDLE_GOLD_COURSE';
    middleCourse.position.set(0, 1.37, -0.06);
    const middleInlay = box(0.82, 0.04, 0.84, materials.turquoise);
    middleInlay.name = 'ISLAND_12_ARCHIVE_MIDDLE_RECORD_INLAY';
    middleInlay.position.set(0, 1.41, -0.06);
    masonry.add(middleCourse, middleInlay);
  }

  if (level >= 3) {
    const upperTier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.37, 0.52, 4, 1, false),
      materials.sandstoneLight,
    );
    upperTier.name = 'ISLAND_12_ARCHIVE_BEACON_LIBRARY_TIER';
    upperTier.position.set(0, 2.13, -0.07);
    upperTier.rotation.y = Math.PI / 4;
    masonry.add(upperTier);
    const upperCourse = box(0.58, 0.065, 0.53, materials.gold);
    upperCourse.name = 'ISLAND_12_ARCHIVE_UPPER_GOLD_COURSE';
    upperCourse.position.set(0, 1.86, -0.07);
    const upperInlay = box(0.5, 0.04, 0.55, materials.turquoise);
    upperInlay.name = 'ISLAND_12_ARCHIVE_UPPER_RECORD_INLAY';
    upperInlay.position.set(0, 1.9, -0.07);
    masonry.add(upperCourse, upperInlay);

    const chronicleSeal = new THREE.Group();
    chronicleSeal.name = 'ISLAND_12_ARCHIVE_UPPER_CHRONICLE_SEAL';
    const chronicleOrbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.013, 6, radialSegments(quality)),
      materials.archiveSandstoneCavity,
    );
    chronicleOrbit.name = 'ISLAND_12_ARCHIVE_UPPER_CHRONICLE_CARVED_ORBIT';
    chronicleOrbit.position.set(0, 2.22, 0.205);
    chronicleOrbit.scale.y = 0.76;
    const chronicleGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), materials.turquoise);
    chronicleGem.name = 'ISLAND_12_ARCHIVE_UPPER_CHRONICLE_GEM';
    chronicleGem.position.set(0, 2.22, 0.226);
    chronicleGem.scale.set(0.72, 1.08, 0.34);
    chronicleSeal.add(chronicleOrbit, chronicleGem);
    [
      [-0.105, 2.22, Math.PI / 2],
      [0.105, 2.22, Math.PI / 2],
      [0, 2.135, 0],
      [0, 2.305, 0],
    ].forEach(([x, y, rotation], index) => {
      const ray = box(0.016, 0.047, 0.014, materials.archiveSandstoneCavity);
      ray.name = `ISLAND_12_ARCHIVE_UPPER_CHRONICLE_RAY_${index + 1}`;
      ray.position.set(x, y, 0.211);
      ray.rotation.z = rotation;
      chronicleSeal.add(ray);
    });
    masonry.add(chronicleSeal);
  }

  const courseSpecs = level === 1
    ? [[1.24, 0.93, 0.62], [1.16, 1.11, 0.6]] as const
    : level === 2
      ? [[1.24, 0.93, 0.62], [1.16, 1.11, 0.6], [0.83, 1.53, 0.48], [0.72, 1.7, 0.43]] as const
      : [[1.24, 0.93, 0.62], [1.16, 1.11, 0.6], [0.83, 1.53, 0.48], [0.72, 1.7, 0.43], [0.47, 1.99, 0.28], [0.37, 2.13, 0.24]] as const;
  const courseSeams = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.archiveSandstoneCavity,
    courseSpecs.length,
  );
  courseSeams.name = 'ISLAND_12_ARCHIVE_MASONRY_COURSE_SEAM_ARRAY';
  const courseEdgeWear = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.archiveSandstoneEdgeWear,
    courseSpecs.length * 2,
  );
  courseEdgeWear.name = 'ISLAND_12_ARCHIVE_MASONRY_EDGE_WEAR_ARRAY';
  const courseMatrix = new THREE.Matrix4();
  const courseWearMatrix = new THREE.Matrix4();
  courseSpecs.forEach(([width, y, z], index) => {
    courseMatrix.compose(
      new THREE.Vector3(0, y, z),
      new THREE.Quaternion(),
      new THREE.Vector3(width, index % 2 === 0 ? 0.024 : 0.018, 0.034),
    );
    courseSeams.setMatrixAt(index, courseMatrix);
    [-1, 1].forEach((side, sideIndex) => {
      courseWearMatrix.compose(
        new THREE.Vector3(side * (width * 0.5 - 0.085), y + 0.016, z + 0.024),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side * 0.045, side * 0.025)),
        new THREE.Vector3(0.15 - (index % 3) * 0.018, 0.012, 0.024),
      );
      courseEdgeWear.setMatrixAt(index * 2 + sideIndex, courseWearMatrix);
    });
  });
  courseSeams.instanceMatrix.needsUpdate = true;
  courseEdgeWear.instanceMatrix.needsUpdate = true;
  masonry.add(courseSeams, courseEdgeWear);

  const foundationGlyphSpecs = [
    [-0.54, 0.63, -0.18], [-0.54, 0.69, 0.2], [-0.54, 0.75, -0.06],
    [0.54, 0.63, 0.18], [0.54, 0.69, -0.2], [0.54, 0.75, 0.06],
  ] as const;
  const foundationGlyphs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.archiveSandstoneCavity,
    foundationGlyphSpecs.length,
  );
  foundationGlyphs.name = 'ISLAND_12_ARCHIVE_FOUNDATION_INSCRIPTION_ARRAY';
  const foundationGlyphMatrix = new THREE.Matrix4();
  foundationGlyphSpecs.forEach(([x, y, rotation], index) => {
    foundationGlyphMatrix.compose(
      new THREE.Vector3(x, y, 0.642),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rotation)),
      new THREE.Vector3(index % 3 === 1 ? 0.02 : 0.054, index % 3 === 1 ? 0.06 : 0.016, 0.012),
    );
    foundationGlyphs.setMatrixAt(index, foundationGlyphMatrix);
  });
  foundationGlyphs.instanceMatrix.needsUpdate = true;

  const courseDustPockets = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    materials.sand,
    courseSpecs.length,
  );
  courseDustPockets.name = 'ISLAND_12_ARCHIVE_MASONRY_LEDGE_DUST_POCKET_ARRAY';
  const courseDustMatrix = new THREE.Matrix4();
  courseSpecs.forEach(([width, y, z], index) => {
    const side = index % 2 === 0 ? -1 : 1;
    courseDustMatrix.compose(
      new THREE.Vector3(side * width * (0.22 + (index % 3) * 0.045), y + 0.034, z + 0.036),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, index * 0.81, side * 0.1)),
      new THREE.Vector3(0.07 + (index % 2) * 0.018, 0.01, 0.032 + (index % 3) * 0.006),
    );
    courseDustPockets.setMatrixAt(index, courseDustMatrix);
  });
  courseDustPockets.instanceMatrix.needsUpdate = true;
  masonry.add(foundationGlyphs, courseDustPockets);

  const facadeRibs = new THREE.Group();
  facadeRibs.name = 'ISLAND_12_ARCHIVE_DIAGONAL_BUTTRESS_RIBS';
  const lowerRibSpecs = [
    [-0.67, 0.78, 0.62, -0.36, 1.44, 0.43],
    [0.67, 0.78, 0.62, 0.36, 1.44, 0.43],
  ] as const;
  lowerRibSpecs.forEach(([startX, startY, startZ, endX, endY, endZ], index) => {
    const goldRib = pipeBetween(
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(endX, endY, endZ),
      0.027,
      materials.gold,
      6,
    );
    goldRib.name = `ISLAND_12_ARCHIVE_LOWER_BUTTRESS_RIB_${index + 1}`;
    const turquoiseRib = pipeBetween(
      new THREE.Vector3(startX * 0.93, startY + 0.035, startZ + 0.038),
      new THREE.Vector3(endX * 0.92, endY - 0.02, endZ + 0.04),
      0.012,
      materials.turquoise,
      6,
    );
    turquoiseRib.name = `ISLAND_12_ARCHIVE_LOWER_BUTTRESS_INLAY_${index + 1}`;
    facadeRibs.add(goldRib, turquoiseRib);
  });
  if (level >= 2) {
    const middleRibSpecs = [
      [-0.39, 1.43, 0.43, -0.19, 1.93, 0.27],
      [0.39, 1.43, 0.43, 0.19, 1.93, 0.27],
    ] as const;
    middleRibSpecs.forEach(([startX, startY, startZ, endX, endY, endZ], index) => {
      const rib = pipeBetween(
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(endX, endY, endZ),
        0.022,
        materials.gold,
        6,
      );
      rib.name = `ISLAND_12_ARCHIVE_MIDDLE_BUTTRESS_RIB_${index + 1}`;
      facadeRibs.add(rib);
    });
  }
  masonry.add(facadeRibs);

  if (level >= 2) {
    const sideReliefs = new THREE.Group();
    sideReliefs.name = 'ISLAND_12_ARCHIVE_CARVED_SIDE_STORY_RELIEFS';
    const reliefSpecs = level >= 3
      ? [
          [-1, -0.17, 1.31, 0.642, 0.072],
          [1, -0.17, 1.31, 0.642, 0.072],
          [-1, -0.08, 1.78, 0.465, 0.058],
          [1, -0.08, 1.78, 0.465, 0.058],
        ] as const
      : [
          [-1, -0.17, 1.31, 0.642, 0.072],
          [1, -0.17, 1.31, 0.642, 0.072],
        ] as const;
    reliefSpecs.forEach(([side, z, y, radius, sealRadius], index) => {
      const seal = new THREE.Mesh(
        new THREE.TorusGeometry(sealRadius, sealRadius * 0.2, 6, radialSegments(quality)),
        materials.archiveSandstoneCavity,
      );
      seal.name = `ISLAND_12_ARCHIVE_CARVED_STORY_SEAL_${index + 1}`;
      seal.position.set(side * radius, y, z);
      seal.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      seal.scale.y = 0.82;
      const chapterGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(sealRadius * 0.45, 0),
        index % 2 === 0 ? materials.gold : materials.turquoise,
      );
      chapterGem.name = `ISLAND_12_ARCHIVE_CARVED_STORY_SEAL_${index + 1}_CHAPTER_GEM`;
      chapterGem.position.set(side * (radius + 0.012), y, z);
      chapterGem.scale.set(0.28, 0.92, 0.6);
      chapterGem.rotation.z = index % 2 === 0 ? 0 : Math.PI / 4;
      sideReliefs.add(seal, chapterGem);
    });

    const reliefStrokeCount = reliefSpecs.length * 3;
    const reliefStrokes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      materials.archiveSandstoneCavity,
      reliefStrokeCount,
    );
    reliefStrokes.name = 'ISLAND_12_ARCHIVE_CARVED_SIDE_STORY_STROKE_ARRAY';
    const reliefStrokeMatrix = new THREE.Matrix4();
    reliefSpecs.forEach(([side, z, y, radius, sealRadius], sealIndex) => {
      const strokeSpecs = [
        [-sealRadius * 1.55, 0, 0.014, 0.02, sealRadius * 0.9],
        [sealRadius * 1.55, 0, 0.014, 0.02, sealRadius * 0.65],
        [0, sealRadius * 1.55, 0.014, sealRadius * 0.72, 0.018],
      ] as const;
      strokeSpecs.forEach(([yOffset, zOffset, depth, height, width], strokeIndex) => {
        reliefStrokeMatrix.compose(
          new THREE.Vector3(side * (radius + 0.006), y + yOffset, z + zOffset),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(
            strokeIndex === 2 ? side * 0.22 : 0,
            0,
            0,
          )),
          new THREE.Vector3(depth, height, width),
        );
        reliefStrokes.setMatrixAt(sealIndex * 3 + strokeIndex, reliefStrokeMatrix);
      });
    });
    reliefStrokes.instanceMatrix.needsUpdate = true;
    sideReliefs.add(reliefStrokes);
    masonry.add(sideReliefs);
  }
  root.add(masonry);

  const portal = new THREE.Group();
  portal.name = 'ISLAND_12_ARCHIVE_PORTAL_AND_CRYSTAL';
  const portalRecess = new THREE.Mesh(
    createPointedPortalPanelGeometry(0.58, 0.92, 0.12),
    materials.obsidian,
  );
  portalRecess.name = 'ISLAND_12_ARCHIVE_DEEP_PORTAL_RECESS';
  portalRecess.position.set(0, 0.68, 0.62);
  const outerPortalFrame = new THREE.Mesh(
    createPointedArchFrameGeometry(0.68, 1.03, 0.095, 0.095),
    materials.gold,
  );
  outerPortalFrame.name = 'ISLAND_12_ARCHIVE_GOLD_PORTAL_FRAME';
  outerPortalFrame.position.set(0, 0.62, 0.685);
  const innerPortalFrame = new THREE.Mesh(
    createPointedArchFrameGeometry(0.52, 0.88, 0.038, 0.075),
    materials.turquoise,
  );
  innerPortalFrame.name = 'ISLAND_12_ARCHIVE_TURQUOISE_PORTAL_FRAME';
  innerPortalFrame.position.set(0, 0.7, 0.74);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, quality === 'high' ? 1 : 0),
    materials.sapphire,
  );
  crystal.name = 'ISLAND_12_ARCHIVE_CRYSTAL';
  crystal.position.set(0, 1.04, 0.8);
  crystal.scale.set(0.7, 2, 0.58);
  const threshold = box(0.52, 0.07, 0.14, materials.gold);
  threshold.name = 'ISLAND_12_ARCHIVE_PORTAL_THRESHOLD';
  threshold.position.set(0, 0.54, 0.83);
  const thresholdInlay = box(0.3, 0.02, 0.11, materials.turquoise);
  thresholdInlay.name = 'ISLAND_12_ARCHIVE_PORTAL_THRESHOLD_INLAY';
  thresholdInlay.position.set(0, 0.585, 0.84);
  [-0.39, 0.39].forEach((x, index) => {
    const portalPylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.105, 0.72, 4),
      materials.sandstoneWorn,
    );
    portalPylon.name = `ISLAND_12_ARCHIVE_PORTAL_PYLON_${index + 1}`;
    portalPylon.position.set(x, 0.89, 0.765);
    portalPylon.rotation.y = Math.PI / 4;
    const pylonInset = box(0.055, 0.39, 0.025, materials.turquoise);
    pylonInset.name = `ISLAND_12_ARCHIVE_PORTAL_PYLON_${index + 1}_INSET`;
    pylonInset.position.set(x, 0.88, 0.847);
    const pylonCap = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), materials.gold);
    pylonCap.name = `ISLAND_12_ARCHIVE_PORTAL_PYLON_${index + 1}_CAP`;
    pylonCap.position.set(x, 1.29, 0.765);
    portal.add(portalPylon, pylonInset, pylonCap);
  });
  portal.add(portalRecess, outerPortalFrame, innerPortalFrame, crystal, threshold, thresholdInlay);
  root.add(portal);

  const records = new THREE.Group();
  records.name = 'ISLAND_12_ARCHIVE_RECORD_SYSTEMS';
  const recordRows = level === 1 ? 1 : level === 2 ? 3 : 4;
  for (let index = 0; index < recordRows; index += 1) {
    const rowWidth = 1.02 - index * 0.17;
    const rowY = 1.27 + index * 0.2;
    const goldRail = box(rowWidth, 0.034, 0.04, materials.gold);
    goldRail.name = `ISLAND_12_ARCHIVE_RECORD_ROW_${index + 1}_GOLD_RAIL`;
    goldRail.position.set(0, rowY, 0.59 - index * 0.035);
    const turquoiseRecord = box(rowWidth * 0.88, 0.034, 0.042, materials.turquoise);
    turquoiseRecord.name = `ISLAND_12_ARCHIVE_RECORD_ROW_${index + 1}_TURQUOISE_TABLET`;
    turquoiseRecord.position.set(0, rowY + 0.055, 0.625 - index * 0.035);
    records.add(goldRail, turquoiseRecord);
  }

  if (level >= 2) {
    const glyphCount = quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
    const glyphs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.042, 0.052, 0.025), materials.gold, glyphCount);
    glyphs.name = 'ISLAND_12_ARCHIVE_GLYPH_TAB_ARRAY';
    const archiveMatrix = new THREE.Matrix4();
    const archiveQuaternion = new THREE.Quaternion();
    const archiveScale = new THREE.Vector3();
    const archivePosition = new THREE.Vector3();
    for (let index = 0; index < glyphCount; index += 1) {
      const row = index % 3;
      const column = Math.floor(index / 3);
      const rowWidth = 0.94 - row * 0.14;
      const columnCount = Math.ceil(glyphCount / 3);
      const x = (column / Math.max(1, columnCount - 1) - 0.5) * rowWidth;
      archiveQuaternion.setFromEuler(new THREE.Euler(0, 0, (index % 4 === 0 ? Math.PI / 4 : 0)));
      archiveMatrix.compose(
        archivePosition.set(x, 1.34 + row * 0.2, 0.67 - row * 0.035),
        archiveQuaternion,
        archiveScale.set(1, index % 4 === 0 ? 0.72 : 1, 1),
      );
      glyphs.setMatrixAt(index, archiveMatrix);
    }
    glyphs.instanceMatrix.needsUpdate = true;
    records.add(glyphs);

    [-0.43, 0.43].forEach((x, index) => {
      const panel = box(0.3, 0.3, 0.055, materials.coral);
      panel.name = `ISLAND_12_ARCHIVE_ASTRONOMY_PANEL_${index + 1}`;
      panel.position.set(x, 1.04, 0.72);
      const panelInset = box(0.235, 0.235, 0.06, materials.sandstoneShadow);
      panelInset.name = `ISLAND_12_ARCHIVE_ASTRONOMY_PANEL_${index + 1}_INSET`;
      panelInset.position.set(x, 1.04, 0.755);
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.086, 0.013, 6, radialSegments(quality)),
        materials.gold,
      );
      orbit.name = `ISLAND_12_ARCHIVE_ASTRONOMY_ORBIT_${index + 1}`;
      orbit.position.set(x, 1.045, 0.795);
      orbit.scale.y = 0.78;
      const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(0.037, 7, 5), materials.lampGlow);
      sunDisc.name = `ISLAND_12_ARCHIVE_ASTRONOMY_SUN_${index + 1}`;
      sunDisc.position.set(x, 1.045, 0.82);
      records.add(panel, panelInset, orbit, sunDisc);
      for (let rayIndex = 0; rayIndex < 4; rayIndex += 1) {
        const ray = box(0.018, 0.055, 0.018, materials.gold);
        ray.name = `ISLAND_12_ARCHIVE_ASTRONOMY_RAY_${index + 1}_${rayIndex + 1}`;
        const angle = rayIndex * Math.PI / 2;
        ray.position.set(x + Math.cos(angle) * 0.115, 1.045 + Math.sin(angle) * 0.09, 0.825);
        ray.rotation.z = angle;
        records.add(ray);
      }
    });

    [-1, 1].forEach((side, sideIndex) => {
      const sideFrame = box(0.62, 0.22, 0.038, materials.gold);
      sideFrame.name = `ISLAND_12_ARCHIVE_SIDE_RECORD_FRAME_${sideIndex + 1}`;
      sideFrame.position.set(side * 0.57, 1.08, -0.04);
      sideFrame.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const sideField = box(0.55, 0.16, 0.042, materials.turquoise);
      sideField.name = `ISLAND_12_ARCHIVE_SIDE_RECORD_FIELD_${sideIndex + 1}`;
      sideField.position.set(side * 0.595, 1.08, -0.04);
      sideField.rotation.y = sideFrame.rotation.y;
      records.add(sideFrame, sideField);
      [-0.18, 0, 0.18].forEach((z, glyphIndex) => {
        const sideGlyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), materials.gold);
        sideGlyph.name = `ISLAND_12_ARCHIVE_SIDE_RECORD_GLYPH_${sideIndex + 1}_${glyphIndex + 1}`;
        sideGlyph.position.set(side * 0.627, 1.08, z - 0.04);
        sideGlyph.scale.set(0.34, glyphIndex === 1 ? 1.1 : 0.82, 0.7);
        sideGlyph.rotation.z = glyphIndex === 1 ? 0 : Math.PI / 4;
        records.add(sideGlyph);
      });
    });
  }
  if (level >= 3) {
    [-0.2, 0.2].forEach((x, index) => {
      const recordTablet = box(0.18, 0.24, 0.04, materials.obsidian);
      recordTablet.name = `ISLAND_12_ARCHIVE_UPPER_RECORD_TABLET_${index + 1}`;
      recordTablet.position.set(x, 1.67, 0.48);
      const tabletFrame = box(0.22, 0.035, 0.055, materials.gold);
      tabletFrame.name = `ISLAND_12_ARCHIVE_UPPER_RECORD_FRAME_${index + 1}`;
      tabletFrame.position.set(x, 1.53, 0.5);
      const tabletGlyph = box(0.055, 0.14, 0.048, materials.turquoise);
      tabletGlyph.name = `ISLAND_12_ARCHIVE_UPPER_RECORD_GLYPH_${index + 1}`;
      tabletGlyph.position.set(x, 1.67, 0.51);
      tabletGlyph.rotation.z = index ? -0.28 : 0.28;
      records.add(recordTablet, tabletFrame, tabletGlyph);
    });
    const upperSunPanel = box(0.29, 0.18, 0.04, materials.obsidian);
    upperSunPanel.name = 'ISLAND_12_ARCHIVE_BEACON_LIBRARY_SUN_PANEL';
    upperSunPanel.position.set(0, 2.05, 0.255);
    const upperSunOrbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.012, 6, radialSegments(quality)),
      materials.gold,
    );
    upperSunOrbit.name = 'ISLAND_12_ARCHIVE_BEACON_LIBRARY_SUN_ORBIT';
    upperSunOrbit.position.set(0, 2.05, 0.285);
    const upperSunDisc = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), materials.lampGlow);
    upperSunDisc.name = 'ISLAND_12_ARCHIVE_BEACON_LIBRARY_SUN_DISC';
    upperSunDisc.position.set(0, 2.05, 0.31);
    records.add(upperSunPanel, upperSunOrbit, upperSunDisc);

    [-0.26, 0.26].forEach((x, index) => {
      const reliefFrame = box(0.2, 0.23, 0.035, materials.gold);
      reliefFrame.name = `ISLAND_12_ARCHIVE_BEACON_RELIEF_FRAME_${index + 1}`;
      reliefFrame.position.set(x, 1.86, 0.34);
      const reliefField = box(0.15, 0.18, 0.045, materials.turquoise);
      reliefField.name = `ISLAND_12_ARCHIVE_BEACON_RELIEF_FIELD_${index + 1}`;
      reliefField.position.set(x, 1.86, 0.365);
      const reliefGlyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), materials.gold);
      reliefGlyph.name = `ISLAND_12_ARCHIVE_BEACON_RELIEF_GLYPH_${index + 1}`;
      reliefGlyph.position.set(x, 1.86, 0.415);
      reliefGlyph.scale.set(0.62, 1.18, 0.32);
      records.add(reliefFrame, reliefField, reliefGlyph);
    });

    [-1, 1].forEach((side, sideIndex) => {
      const middleSideFrame = box(0.42, 0.18, 0.034, materials.gold);
      middleSideFrame.name = `ISLAND_12_ARCHIVE_MIDDLE_SIDE_FRAME_${sideIndex + 1}`;
      middleSideFrame.position.set(side * 0.39, 1.67, -0.06);
      middleSideFrame.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const middleSideField = box(0.36, 0.125, 0.04, materials.obsidian);
      middleSideField.name = `ISLAND_12_ARCHIVE_MIDDLE_SIDE_FIELD_${sideIndex + 1}`;
      middleSideField.position.set(side * 0.413, 1.67, -0.06);
      middleSideField.rotation.y = middleSideFrame.rotation.y;
      const middleSideOrbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.011, 5, radialSegments(quality)),
        materials.turquoise,
      );
      middleSideOrbit.name = `ISLAND_12_ARCHIVE_MIDDLE_SIDE_ORBIT_${sideIndex + 1}`;
      middleSideOrbit.position.set(side * 0.442, 1.67, -0.06);
      middleSideOrbit.rotation.y = middleSideFrame.rotation.y;
      records.add(middleSideFrame, middleSideField, middleSideOrbit);
    });
  }
  root.add(records);

  const library = new THREE.Group();
  library.name = 'ISLAND_12_ARCHIVE_LIBRARY_LIFE';
  if (level >= 2) {
    const scrollGeometry = new THREE.CylinderGeometry(0.032, 0.032, 0.075, 8);
    const scrollsPerBay = quality === 'high' ? 12 : quality === 'medium' ? 9 : 6;
    const scrolls = new THREE.InstancedMesh(scrollGeometry, materials.linen, scrollsPerBay * 2);
    scrolls.name = 'ISLAND_12_ARCHIVE_PAPYRUS_END_ARRAY';
    const scrollMatrix = new THREE.Matrix4();
    const scrollQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const scrollScale = new THREE.Vector3(1, 1, 1);
    const scrollPosition = new THREE.Vector3();
    [-0.52, 0.52].forEach((x, bayIndex) => {
      const repository = new THREE.Group();
      repository.name = `ISLAND_12_ARCHIVE_SCROLL_REPOSITORY_${bayIndex + 1}`;
      const shelfBack = box(0.34, 0.46, 0.035, materials.obsidian);
      shelfBack.name = `${repository.name}_SHADOW_BACK`;
      shelfBack.position.set(x, 0.9, 0.7);
      repository.add(shelfBack);
      [-0.18, 0.18].forEach((xOffset, jambIndex) => {
        const jamb = box(0.045, 0.5, 0.09, materials.palmWood);
        jamb.name = `${repository.name}_JAMB_${jambIndex + 1}`;
        jamb.position.set(x + xOffset, 0.9, 0.765);
        repository.add(jamb);
      });
      [-0.24, 0, 0.24].forEach((yOffset, shelfIndex) => {
        const shelfRail = box(0.405, 0.045, 0.095, shelfIndex === 2 ? materials.gold : materials.palmWood);
        shelfRail.name = `${repository.name}_SHELF_${shelfIndex + 1}`;
        shelfRail.position.set(x, 0.9 + yOffset, 0.765);
        repository.add(shelfRail);
      });
      library.add(repository);
      for (let index = 0; index < scrollsPerBay; index += 1) {
        const row = Math.floor(index / 3);
        const column = index % 3;
        scrollMatrix.compose(
          scrollPosition.set(x + (column - 1) * 0.09, 0.74 + row * 0.103, 0.82),
          scrollQuaternion,
          scrollScale,
        );
        scrolls.setMatrixAt(bayIndex * scrollsPerBay + index, scrollMatrix);
      }
      const ledge = box(0.29, 0.045, 0.22, materials.sandstoneWorn);
      ledge.name = `ISLAND_12_ARCHIVE_READING_LEDGE_${bayIndex + 1}`;
      ledge.position.set(x + (bayIndex ? 0.23 : -0.23), 0.68, 0.88);
      ledge.rotation.x = -0.18;
      const tabletMark = box(0.12, 0.012, 0.14, materials.turquoise);
      tabletMark.name = `ISLAND_12_ARCHIVE_READING_TABLET_${bayIndex + 1}`;
      tabletMark.position.copy(ledge.position).add(new THREE.Vector3(0, 0.035, 0));
      tabletMark.rotation.x = ledge.rotation.x;
      const pageLeft = box(0.105, 0.012, 0.13, materials.linen);
      pageLeft.name = `ISLAND_12_ARCHIVE_READING_PAGE_${bayIndex + 1}_LEFT`;
      pageLeft.position.copy(ledge.position).add(new THREE.Vector3(-0.055, 0.052, 0.006));
      pageLeft.rotation.set(ledge.rotation.x, 0.08, -0.035);
      const pageRight = box(0.105, 0.012, 0.13, materials.linen);
      pageRight.name = `ISLAND_12_ARCHIVE_READING_PAGE_${bayIndex + 1}_RIGHT`;
      pageRight.position.copy(ledge.position).add(new THREE.Vector3(0.055, 0.052, 0.006));
      pageRight.rotation.set(ledge.rotation.x, -0.08, 0.035);
      const pageSpine = box(0.018, 0.024, 0.14, materials.gold);
      pageSpine.name = `ISLAND_12_ARCHIVE_READING_CODEX_SPINE_${bayIndex + 1}`;
      pageSpine.position.copy(ledge.position).add(new THREE.Vector3(0, 0.054, 0.004));
      pageSpine.rotation.x = ledge.rotation.x;
      const support = pipeBetween(
        new THREE.Vector3(ledge.position.x, 0.55, 0.69),
        new THREE.Vector3(ledge.position.x, 0.67, 0.84),
        0.018,
        materials.palmWood,
        5,
      );
      support.name = `ISLAND_12_ARCHIVE_READING_LEDGE_SUPPORT_${bayIndex + 1}`;
      library.add(ledge, tabletMark, pageLeft, pageRight, pageSpine, support);
    });
    scrolls.instanceMatrix.needsUpdate = true;
    library.add(scrolls);

    [-0.7, 0.7].forEach((x, index) => {
      const basket = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.028, 6, 10, Math.PI * 1.65),
        materials.palmWood,
      );
      basket.name = `ISLAND_12_ARCHIVE_SCROLL_BASKET_${index + 1}`;
      basket.position.set(x, 0.64, 0.72);
      basket.rotation.x = Math.PI / 2;
      basket.rotation.z = index ? -0.45 : 0.45;
      const basketBundle = cylinder(0.055, 0.06, 0.22, materials.linen, 7);
      basketBundle.name = `ISLAND_12_ARCHIVE_SCROLL_BASKET_BUNDLE_${index + 1}`;
      basketBundle.position.set(x, 0.7, 0.72);
      basketBundle.rotation.z = Math.PI / 2 + (index ? -0.18 : 0.18);
      const bundleTie = torus(0.058, 0.01, materials.gold, 8);
      bundleTie.name = `ISLAND_12_ARCHIVE_SCROLL_BASKET_TIE_${index + 1}`;
      bundleTie.position.copy(basketBundle.position);
      bundleTie.rotation.y = Math.PI / 2;
      library.add(basket, basketBundle, bundleTie);
    });
  }

  const obelisks = new THREE.Group();
  obelisks.name = 'ISLAND_12_ARCHIVE_CORNER_OBELISK_ARRAY';
  const obeliskPositions = level === 1
    ? [[-0.68, 0.2], [0.68, 0.2]] as const
    : [[-0.72, 0.2], [0.72, 0.2], [-0.58, -0.52], [0.58, -0.52]] as const;
  obeliskPositions.forEach(([x, z], index) => {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.095, level === 3 ? 0.86 : 0.68, 4),
      materials.sandstoneLight,
    );
    body.name = `ISLAND_12_ARCHIVE_OBELISK_${index + 1}`;
    body.position.set(x, level === 3 ? 1.05 : 0.96, z);
    body.rotation.y = Math.PI / 4;
    const inset = box(0.055, level === 3 ? 0.36 : 0.28, 0.024, materials.turquoise);
    inset.name = `ISLAND_12_ARCHIVE_OBELISK_${index + 1}_INSET`;
    inset.position.set(x, level === 3 ? 1.05 : 0.96, z + 0.074);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), materials.gold);
    cap.name = `ISLAND_12_ARCHIVE_OBELISK_${index + 1}_CAP`;
    cap.position.set(x, level === 3 ? 1.52 : 1.34, z);
    obelisks.add(body, inset, cap);
  });
  library.add(obelisks);

  if (level >= 3) {
    const scholarBodyGeometry = new THREE.CylinderGeometry(0.07, 0.105, 0.3, 7);
    const scholarBodies = new THREE.InstancedMesh(scholarBodyGeometry, materials.coral, 2);
    const scholarHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 7, 5), materials.sandstoneLight, 2);
    scholarBodies.name = 'ISLAND_12_ARCHIVE_SCHOLAR_BODY_ARRAY';
    scholarHeads.name = 'ISLAND_12_ARCHIVE_SCHOLAR_HEAD_ARRAY';
    const lifeMatrix = new THREE.Matrix4();
    [-0.77, 0.77].forEach((x, index) => {
      lifeMatrix.makeTranslation(x, 0.76, 0.62);
      scholarBodies.setMatrixAt(index, lifeMatrix);
      lifeMatrix.makeTranslation(x, 0.97, 0.62);
      scholarHeads.setMatrixAt(index, lifeMatrix);
    });
    scholarBodies.instanceMatrix.needsUpdate = true;
    scholarHeads.instanceMatrix.needsUpdate = true;
    library.add(scholarBodies, scholarHeads);

    [-0.77, 0.77].forEach((x, index) => {
      const sash = box(0.16, 0.045, 0.025, materials.turquoise);
      sash.name = `ISLAND_12_ARCHIVE_SCHOLAR_${index + 1}_SASH`;
      sash.position.set(x, 0.82, 0.7);
      sash.rotation.z = index ? -0.34 : 0.34;
      library.add(sash);
      const scholarCowl = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.11, 7), materials.turquoise);
      scholarCowl.name = `ISLAND_12_ARCHIVE_SCHOLAR_${index + 1}_COWL`;
      scholarCowl.position.set(x, 1.06, 0.62);
      const scholarBand = torus(0.06, 0.01, materials.gold, 8);
      scholarBand.name = `ISLAND_12_ARCHIVE_SCHOLAR_${index + 1}_HEAD_BAND`;
      scholarBand.position.set(x, 1.0, 0.62);
      scholarBand.rotation.x = Math.PI / 2;
      const readingTarget = new THREE.Vector3(index ? 0.66 : -0.66, 0.75, 0.84);
      const shoulderX = x + (index ? -0.035 : 0.035);
      const armA = pipeBetween(
        new THREE.Vector3(shoulderX, 0.86, 0.66),
        readingTarget.clone().add(new THREE.Vector3(index ? 0.02 : -0.02, 0.025, 0)),
        0.014,
        materials.sandstoneLight,
        5,
      );
      armA.name = `ISLAND_12_ARCHIVE_SCHOLAR_${index + 1}_READING_ARM_A`;
      const armB = pipeBetween(
        new THREE.Vector3(shoulderX + (index ? 0.045 : -0.045), 0.84, 0.66),
        readingTarget.clone().add(new THREE.Vector3(index ? -0.025 : 0.025, -0.005, 0.01)),
        0.014,
        materials.sandstoneLight,
        5,
      );
      armB.name = `ISLAND_12_ARCHIVE_SCHOLAR_${index + 1}_READING_ARM_B`;
      library.add(scholarCowl, scholarBand, armA, armB);
    });

    const planterPositions = [[-0.86, 0.18], [0.86, 0.18]] as const;
    planterPositions.forEach(([x, z], planterIndex) => {
      const planter = cylinder(0.13, 0.16, 0.18, materials.ceramic, 9);
      planter.name = `ISLAND_12_ARCHIVE_PLANTER_${planterIndex + 1}`;
      planter.position.set(x, 0.66, z);
      library.add(planter);
      for (let reedIndex = 0; reedIndex < 4; reedIndex += 1) {
        const reed = pipeBetween(
          new THREE.Vector3(x + (reedIndex - 1.5) * 0.035, 0.74, z),
          new THREE.Vector3(x + (reedIndex - 1.5) * 0.05, 1.04 + reedIndex % 2 * 0.08, z - 0.03),
          0.012,
          materials.palmLeaf,
          5,
        );
        reed.name = `ISLAND_12_ARCHIVE_PLANTER_${planterIndex + 1}_REED_${reedIndex + 1}`;
        library.add(reed);
      }
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), planterIndex ? materials.crimson : materials.coral);
      flower.name = `ISLAND_12_ARCHIVE_PLANTER_${planterIndex + 1}_FLOWER`;
      flower.position.set(x, 1.04, z - 0.03);
      library.add(flower);
    });
  }
  root.add(library);

  const sandAccretion = new THREE.Group();
  sandAccretion.name = 'ISLAND_12_ARCHIVE_SAND_ACCRETION';
  const driftPositions = [[-0.82, 0.5], [-0.7, 0.7], [-0.9, -0.12], [0.82, 0.5], [0.7, 0.7], [0.9, -0.12]] as const;
  const driftMounds = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.12, 0),
    materials.sandstoneWorn,
    driftPositions.length,
  );
  driftMounds.name = 'ISLAND_12_ARCHIVE_WIND_DRIFT_MOUND_ARRAY';
  const driftMatrix = new THREE.Matrix4();
  driftPositions.forEach(([x, z], index) => {
    driftMatrix.compose(
      new THREE.Vector3(x, 0.57, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, index * 0.61, 0)),
      new THREE.Vector3(1.4 + index % 2 * 0.25, 0.32, 0.8 + index % 3 * 0.12),
    );
    driftMounds.setMatrixAt(index, driftMatrix);
  });
  driftMounds.instanceMatrix.needsUpdate = true;
  sandAccretion.add(driftMounds);
  root.add(sandAccretion);

  let crown: THREE.Group | null = null;
  if (level >= 3) {
    crown = new THREE.Group();
    crown.name = 'ISLAND_12_ARCHIVE_BEACON_CROWN';
    const crownRing = torus(0.18, 0.024, materials.gold, radialSegments(quality));
    crownRing.name = 'ISLAND_12_ARCHIVE_BEACON_CROWN_RING';
    crownRing.position.set(0, 2.43, -0.06);
    crown.add(crownRing);
    const crownPedestal = cylinder(0.15, 0.19, 0.1, materials.gold, 10);
    crownPedestal.name = 'ISLAND_12_ARCHIVE_BEACON_CROWN_PEDESTAL';
    crownPedestal.position.set(0, 2.39, -0.06);
    const crownCollar = cylinder(0.14, 0.16, 0.09, materials.turquoise, 10);
    crownCollar.name = 'ISLAND_12_ARCHIVE_BEACON_CROWN_COLLAR';
    crownCollar.position.set(0, 2.47, -0.06);
    crown.add(crownPedestal, crownCollar);
    const crownPositions = [[-0.16, 0], [0.16, 0], [0, -0.16], [0, 0.16]] as const;
    crownPositions.forEach(([x, z], index) => {
      const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.027, 0), materials.turquoise);
      crownGem.name = `ISLAND_12_ARCHIVE_BEACON_CROWN_SET_GEM_${index + 1}`;
      crownGem.position.set(x, 2.47, z - 0.06);
      crownGem.scale.set(0.82, 1.32, 0.82);
      crown?.add(crownGem);
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.2, 4), materials.turquoise);
      petal.name = `ISLAND_12_ARCHIVE_CROWN_LOTUS_PETAL_${index + 1}`;
      petal.position.set(x * 0.72, 2.54, z * 0.72 - 0.06);
      petal.rotation.y = Math.PI / 4 + index * Math.PI / 2;
      petal.rotation.z = x === 0 ? 0 : -Math.sign(x) * 0.2;
      petal.rotation.x = z === 0 ? 0 : Math.sign(z) * 0.2;
      crown?.add(petal);
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.047, 0.32, 4), materials.gold);
      prong.name = `ISLAND_12_ARCHIVE_CROWN_PRONG_${index + 1}`;
      prong.position.set(x, 2.61, z - 0.06);
      prong.rotation.z = x === 0 ? 0 : -Math.sign(x) * 0.2;
      prong.rotation.x = z === 0 ? 0 : Math.sign(z) * 0.2;
      prong.rotation.y = Math.PI / 4;
      crown?.add(prong);
    });
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, quality === 'high' ? 1 : 0),
      materials.sapphire,
    );
    beacon.name = 'ISLAND_12_ARCHIVE_CROWN_SAPPHIRE';
    beacon.position.set(0, 2.65, -0.06);
    beacon.scale.set(0.9, 1.65, 0.78);
    crown.add(beacon);
    root.add(crown);
  }

  if (level >= 2) {
    const lamps = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.055, 0), materials.lampGlow, 2);
    lamps.name = 'ISLAND_12_ARCHIVE_THRESHOLD_LAMP_ARRAY';
    const lampMatrix = new THREE.Matrix4();
    [-0.34, 0.34].forEach((x, index) => {
      lampMatrix.makeTranslation(x, 0.73, 0.9);
      lamps.setMatrixAt(index, lampMatrix);
    });
    lamps.instanceMatrix.needsUpdate = true;
    root.add(lamps);
  }

  const archiveMaterialReplacements = new Map<THREE.Material, THREE.Material>([
    [materials.sandstone, materials.archiveSandstone],
    [materials.sandstoneLight, materials.archiveSandstone],
    [materials.sandstoneWorn, materials.archiveSandstoneWorn],
    [materials.sandstoneShadow, materials.archiveSandstoneWorn],
    [materials.gold, materials.archiveGold],
    [materials.turquoise, materials.archiveTurquoise],
    [materials.sapphire, materials.archiveSapphire],
    [materials.linen, materials.archivePapyrus],
    [materials.palmWood, materials.archiveShelfWood],
  ]);
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh)) return;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => archiveMaterialReplacements.get(material) ?? material);
      return;
    }
    node.material = archiveMaterialReplacements.get(node.material) ?? node.material;
  });

  // The Archive is deliberately dense, but its carved reliefs, record panels,
  // shelves and beacon ornaments are static presentation geometry. Compact
  // within the existing runtime-part boundaries so focus/collider metadata
  // keeps stable nodes while the renderer pays once per material family rather
  // than once per decorative mesh.
  const archiveStaticBoundaries: Array<[THREE.Group, string]> = [
    [processionalRails, 'ISLAND_12_ARCHIVE_PROCESSIONAL_RAILS'],
    [masonry, 'ISLAND_12_ARCHIVE_STEPPED_MASONRY'],
    [records, 'ISLAND_12_ARCHIVE_RECORD_SYSTEMS'],
    [library, 'ISLAND_12_ARCHIVE_LIBRARY_LIFE'],
    [sandAccretion, 'ISLAND_12_ARCHIVE_SAND_ACCRETION'],
  ];
  archiveStaticBoundaries.forEach(([boundary, batchName]) => {
    compactIsland12StaticPresentationGeometry(boundary, batchName);
  });
  if (crown) compactIsland12StaticPresentationGeometry(crown, 'ISLAND_12_ARCHIVE_BEACON_CROWN');

  const runtimeParts = [
    registerIsland12RuntimePart('sapphire-obelisk-archive', root, 'landmark'),
    registerIsland12RuntimePart('archive-crystal', crystal, 'landmark-detail'),
    registerIsland12RuntimePart('archive-record-systems', records, 'landmark-detail'),
    registerIsland12RuntimePart('archive-library-life', library, 'landmark-detail'),
  ];
  if (crown) runtimeParts.push(registerIsland12RuntimePart('archive-beacon-crown', crown, 'landmark-detail'));
  root.userData.sculptRuntime = { parts: runtimeParts };
  return root;
}

function createOasisCrownCitadel(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island12SunkenSandsMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_OASIS_CROWN_CITADEL_PIVOT';
  addLandmarkPlatform(root, level === 3 ? 2.18 : 1.82, materials, quality);
  addFrontStairs(root, materials, level === 3 ? 1.62 : 1.34, level === 3 ? 8 : 6);

  const palaceTerrace = new THREE.Group();
  palaceTerrace.name = 'ISLAND_12_CITADEL_PALACE_TERRACE';
  const terraceFoundation = box(
    level === 3 ? 4.45 : 3.5,
    level === 3 ? 0.72 : 0.56,
    level === 3 ? 1.66 : 1.34,
    materials.sandstoneShadow,
  );
  terraceFoundation.name = 'ISLAND_12_CITADEL_TERRACE_FOUNDATION';
  terraceFoundation.position.set(0, level === 3 ? 0.64 : 0.56, -0.2);
  palaceTerrace.add(terraceFoundation);

  const wingPositions = level === 3
    ? [[-1.62, -0.2], [1.62, -0.2], [-1.82, -0.72], [1.82, -0.72]] as const
    : [[-1.32, -0.18], [1.32, -0.18]] as const;
  const wingBodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneLight, wingPositions.length);
  const wingCrowns = new THREE.InstancedMesh(createGableRoofGeometry(), materials.crimson, wingPositions.length);
  wingBodies.name = 'ISLAND_12_CITADEL_PALACE_WING_ARRAY';
  wingCrowns.name = 'ISLAND_12_CITADEL_PALACE_CROWN_ARRAY';
  const palaceMatrix = new THREE.Matrix4();
  const palaceQuaternion = new THREE.Quaternion();
  const palaceScale = new THREE.Vector3();
  const palacePosition = new THREE.Vector3();
  wingPositions.forEach(([x, z], index) => {
    const wingHeight = level === 3 ? 1.36 + index % 2 * 0.18 : 1.08;
    palaceQuaternion.setFromEuler(new THREE.Euler(0, index < 2 ? 0 : (index % 2 ? -0.16 : 0.16), 0));
    palaceMatrix.compose(
      palacePosition.set(x, 0.9 + wingHeight * 0.5, z),
      palaceQuaternion,
      palaceScale.set(level === 3 ? 1.35 : 1.12, wingHeight, level === 3 ? 1.16 : 0.96),
    );
    wingBodies.setMatrixAt(index, palaceMatrix);
    palaceMatrix.compose(
      palacePosition.set(x, 0.9 + wingHeight, z),
      palaceQuaternion,
      palaceScale.set(level === 3 ? 1.5 : 1.24, level === 3 ? 0.9 : 0.76, level === 3 ? 1.2 : 1.0),
    );
    wingCrowns.setMatrixAt(index, palaceMatrix);
  });
  wingBodies.instanceMatrix.needsUpdate = true;
  wingCrowns.instanceMatrix.needsUpdate = true;
  wingBodies.castShadow = quality !== 'low';
  wingCrowns.castShadow = quality !== 'low';
  palaceTerrace.add(wingBodies, wingCrowns);

  const facadeBayCount = level === 3 ? 9 : 7;
  const facadeBays = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.72, 0.09), materials.turquoise, facadeBayCount);
  const facadeLintels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.09, 0.14), materials.gold, facadeBayCount);
  facadeBays.name = 'ISLAND_12_CITADEL_TERRACE_BAY_ARRAY';
  facadeLintels.name = 'ISLAND_12_CITADEL_TERRACE_LINTEL_ARRAY';
  for (let index = 0; index < facadeBayCount; index += 1) {
    const x = (index - (facadeBayCount - 1) / 2) * (level === 3 ? 0.47 : 0.42);
    palaceMatrix.compose(palacePosition.set(x, 1.28, 0.645), new THREE.Quaternion(), palaceScale.set(1, 1 + (index % 2) * 0.12, 1));
    facadeBays.setMatrixAt(index, palaceMatrix);
    palaceMatrix.compose(palacePosition.set(x, 1.69 + (index % 2) * 0.04, 0.69), new THREE.Quaternion(), palaceScale.set(1, 1, 1));
    facadeLintels.setMatrixAt(index, palaceMatrix);
  }
  facadeBays.instanceMatrix.needsUpdate = true;
  facadeLintels.instanceMatrix.needsUpdate = true;
  palaceTerrace.add(facadeBays, facadeLintels);
  root.add(palaceTerrace);

  const lowerHeight = level === 1 ? 0.86 : 1.18;
  const lower = cylinder(level === 3 ? 1.18 : 0.92, level === 3 ? 1.48 : 1.17, lowerHeight, materials.sandstoneLight, radialSegments(quality));
  lower.position.y = 0.58 + lowerHeight / 2;
  root.add(lower);
  const lowerTerrace = torus(level === 3 ? 1.34 : 1.02, level === 3 ? 0.11 : 0.085, materials.gold, radialSegments(quality) * 2);
  lowerTerrace.position.y = 0.61 + lowerHeight;
  const upperTerrace = cylinder(level === 3 ? 1.02 : 0.84, level === 3 ? 1.22 : 0.98, level === 3 ? 0.34 : 0.26, materials.sandstoneShadow, radialSegments(quality));
  upperTerrace.position.y = lowerTerrace.position.y + 0.14;
  root.add(lowerTerrace, upperTerrace);
  const drumHeight = level === 3 ? 1.42 : 0.76;
  const drum = cylinder(level === 3 ? 0.78 : 0.64, level === 3 ? 1.0 : 0.82, drumHeight, materials.sandstone, radialSegments(quality));
  drum.position.y = upperTerrace.position.y + 0.13 + drumHeight / 2;
  root.add(drum);
  const crownTerrace = torus(level === 3 ? 0.88 : 0.72, level === 3 ? 0.09 : 0.075, materials.gold, radialSegments(quality) * 2);
  crownTerrace.position.y = drum.position.y + drumHeight / 2;
  root.add(crownTerrace);
  const domeRadius = level === 1 ? 0.6 : level === 3 ? 0.94 : 0.76;
  const domeHeight = level === 3 ? 1.28 : 0.92;
  const domeProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(domeRadius * 0.92, 0),
    new THREE.Vector2(domeRadius, domeHeight * 0.16),
    new THREE.Vector2(domeRadius * 0.88, domeHeight * 0.42),
    new THREE.Vector2(domeRadius * 0.54, domeHeight * 0.7),
    new THREE.Vector2(domeRadius * 0.16, domeHeight * 0.91),
    new THREE.Vector2(0, domeHeight),
  ];
  const dome = new THREE.Group();
  dome.name = 'ISLAND_12_CITADEL_DOME';
  dome.position.y = crownTerrace.position.y + 0.02;
  if (level === 3) {
    const glassMaterial = materials.turquoise.clone();
    glassMaterial.name = 'ISLAND_12_CITADEL_REWARD_GLASS_MATERIAL';
    glassMaterial.color.setHex(0x79e0d3);
    glassMaterial.emissive.setHex(0x0c6f73);
    glassMaterial.emissiveIntensity = 0.2;
    glassMaterial.roughness = 0.08;
    glassMaterial.clearcoat = 1;
    glassMaterial.clearcoatRoughness = 0.04;
    // Keep the chamber translucent without Three's transmission pre-pass;
    // that extra full-scene render would push the phone budget over its cap.
    glassMaterial.transmission = 0;
    glassMaterial.transparent = true;
    glassMaterial.opacity = 0.52;
    glassMaterial.depthWrite = false;
    glassMaterial.side = THREE.DoubleSide;
    const glassPanelCount = 6;
    const glassPanelArc = Math.PI * 2 / glassPanelCount;
    const glassPanelGeometry = new THREE.SphereGeometry(
      domeRadius,
      quality === 'high' ? 6 : 5,
      quality === 'high' ? 6 : 5,
      -glassPanelArc * 0.485,
      glassPanelArc * 0.97,
      0,
      Math.PI / 2,
    );
    for (let index = 0; index < glassPanelCount; index += 1) {
      const angle = index / glassPanelCount * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.name = `ISLAND_12_CITADEL_REWARD_GLASS_HINGE_${index + 1}`;
      // Each glass gore is mounted on the lower dome rim. Keeping the pivot at
      // the shell centre made the pieces fan out like flower petals; translating
      // the shell back from a rim-mounted pivot makes it swing over a real
      // tangent hinge line instead.
      pivot.position.set(
        Math.cos(angle) * domeRadius,
        0,
        -Math.sin(angle) * domeRadius,
      );
      pivot.rotation.y = angle;
      pivot.userData.closedQuaternion = pivot.quaternion.clone();
      pivot.userData.openAngle = -1.12;
      const panel = new THREE.Mesh(glassPanelGeometry, glassMaterial);
      panel.name = `ISLAND_12_CITADEL_REWARD_GLASS_PANEL_${index + 1}`;
      panel.position.x = -domeRadius;
      panel.scale.y = domeHeight / domeRadius;
      panel.castShadow = false;
      const hingeAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, domeRadius * 0.42, 8),
        materials.archiveGold,
      );
      hingeAxle.name = `ISLAND_12_CITADEL_REWARD_GLASS_HINGE_AXLE_${index + 1}`;
      hingeAxle.rotation.x = Math.PI / 2;
      hingeAxle.castShadow = quality !== 'low';
      pivot.add(panel, hingeAxle);
      dome.add(pivot);
    }

    const chamberFloor = cylinder(domeRadius * 0.83, domeRadius * 0.9, 0.09, materials.sandstoneLight, radialSegments(quality));
    chamberFloor.name = 'ISLAND_12_CITADEL_REWARD_CHAMBER_FLOOR';
    chamberFloor.position.y = 0.045;
    const chamberInlay = torus(domeRadius * 0.64, 0.035, materials.gold, radialSegments(quality) * 2);
    chamberInlay.name = 'ISLAND_12_CITADEL_REWARD_CHAMBER_INLAY';
    chamberInlay.position.y = 0.098;
    const tokenPedestal = cylinder(0.2, 0.27, 0.22, materials.archiveSandstone, 10);
    tokenPedestal.name = 'ISLAND_12_CITADEL_REWARD_TOKEN_PEDESTAL';
    tokenPedestal.position.y = 0.19;
    dome.add(chamberFloor, chamberInlay, tokenPedestal);

    const token = new THREE.Group();
    token.name = 'ISLAND_12_CITADEL_PRESENTATION_ONLY_PLACEHOLDER_TOKEN';
    token.position.y = 0.62;
    token.userData.presentationOnly = true;
    const tokenCore = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.075, 14), materials.gold);
    tokenCore.name = 'ISLAND_12_CITADEL_PLACEHOLDER_TOKEN_CORE';
    tokenCore.rotation.x = Math.PI / 2;
    const tokenFace = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.sapphire);
    tokenFace.name = 'ISLAND_12_CITADEL_PLACEHOLDER_TOKEN_FACE';
    tokenFace.position.z = 0.046;
    tokenFace.scale.set(0.72, 1, 0.72);
    const tokenRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 5, 18), materials.archiveGold);
    tokenRim.name = 'ISLAND_12_CITADEL_PLACEHOLDER_TOKEN_RIM';
    token.add(tokenCore, tokenFace, tokenRim);
    dome.add(token);

    const rewardGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x9fffee,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    rewardGlowMaterial.name = 'ISLAND_12_CITADEL_REWARD_GLOW_MATERIAL';
    const rewardHalo = torus(0.36, 0.018, rewardGlowMaterial, 24);
    rewardHalo.name = 'ISLAND_12_CITADEL_REWARD_GLOW_HALO';
    rewardHalo.position.y = 0.42;
    const sparkleCount = quality === 'high' ? 10 : 6;
    const rewardSparkles = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.028, 0),
      rewardGlowMaterial,
      sparkleCount,
    );
    rewardSparkles.name = 'ISLAND_12_CITADEL_REWARD_SPARKLE_ARRAY';
    const sparkleMatrix = new THREE.Matrix4();
    for (let index = 0; index < sparkleCount; index += 1) {
      const angle = index / sparkleCount * Math.PI * 2;
      const radius = 0.34 + index % 3 * 0.08;
      sparkleMatrix.makeTranslation(
        Math.cos(angle) * radius,
        0.42 + index % 4 * 0.18,
        Math.sin(angle) * radius,
      );
      rewardSparkles.setMatrixAt(index, sparkleMatrix);
    }
    rewardSparkles.instanceMatrix.needsUpdate = true;
    dome.add(rewardHalo, rewardSparkles);
  } else {
    const closedDome = new THREE.Mesh(new THREE.LatheGeometry(domeProfile, radialSegments(quality)), materials.turquoise);
    closedDome.name = 'ISLAND_12_CITADEL_CLOSED_DOME_SHELL';
    dome.add(closedDome);
  }
  root.add(dome);
  const ribs = level === 1 ? 5 : level === 2 ? 7 : 9;
  const ribCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(domeRadius * 0.92, 0.02, 0),
    new THREE.Vector3(domeRadius * 0.98, domeHeight * 0.22, 0),
    new THREE.Vector3(domeRadius * 0.58, domeHeight * 0.7, 0),
    new THREE.Vector3(domeRadius * 0.12, domeHeight * 0.94, 0),
  ]);
  const domeRibs = new THREE.InstancedMesh(
    new THREE.TubeGeometry(ribCurve, quality === 'high' ? 10 : 7, level === 3 ? 0.025 : 0.02, 4, false),
    materials.gold,
    ribs,
  );
  domeRibs.name = 'ISLAND_12_CITADEL_DOME_RIB_ARRAY';
  const domeRibMatrix = new THREE.Matrix4();
  const domeRibPosition = new THREE.Vector3(0, dome.position.y, 0);
  const domeRibQuaternion = new THREE.Quaternion();
  const domeRibScale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < ribs; index += 1) {
    const angle = index / ribs * Math.PI * 2;
    domeRibQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    domeRibMatrix.compose(domeRibPosition, domeRibQuaternion, domeRibScale);
    domeRibs.setMatrixAt(index, domeRibMatrix);
  }
  domeRibs.instanceMatrix.needsUpdate = true;
  root.add(domeRibs);
  const domeCourseBandCount = 1;
  const domeCourseBands = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, level === 3 ? 0.014 : 0.011, 3, quality === 'high' ? 16 : 12),
    materials.gold,
    domeCourseBandCount,
  );
  domeCourseBands.name = 'ISLAND_12_CITADEL_DOME_CERAMIC_COURSE_BAND_ARRAY';
  const domeCourseBandMatrix = new THREE.Matrix4();
  const domeCourseBandQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const domeCourseBandRadii = level === 3 ? [domeRadius * 0.92] : [0.56];
  domeCourseBandRadii.forEach((radius, index) => {
    const progress = (index + 1) / (domeCourseBandCount + 1);
    domeCourseBandMatrix.compose(
      new THREE.Vector3(0, level === 3 ? 0.105 : domeHeight * (0.16 + progress * 0.64), 0),
      domeCourseBandQuaternion,
      new THREE.Vector3(radius, radius, radius),
    );
    domeCourseBands.setMatrixAt(index, domeCourseBandMatrix);
  });
  domeCourseBands.instanceMatrix.needsUpdate = true;
  dome.add(domeCourseBands);
  const buttressCount = level === 1 ? 6 : 10;
  const buttressGeometry = new THREE.BoxGeometry(0.22, 0.92, 0.28);
  const buttresses = new THREE.InstancedMesh(buttressGeometry, materials.sandstoneShadow, buttressCount);
  buttresses.name = 'ISLAND_12_CITADEL_BUTTRESS_ARRAY';
  const buttressMatrix = new THREE.Matrix4();
  const buttressQuaternion = new THREE.Quaternion();
  const buttressScale = new THREE.Vector3();
  const buttressPosition = new THREE.Vector3();
  for (let index = 0; index < buttressCount; index += 1) {
    const angle = index / buttressCount * Math.PI * 2;
    buttressQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    buttressMatrix.compose(
      buttressPosition.set(Math.cos(angle) * 1.06, 1.04, Math.sin(angle) * 1.06),
      buttressQuaternion,
      buttressScale.set(1, level === 3 ? 1.18 : 1, 1),
    );
    buttresses.setMatrixAt(index, buttressMatrix);
  }
  buttresses.instanceMatrix.needsUpdate = true;
  buttresses.castShadow = quality !== 'low';
  root.add(buttresses);
  const towers = new THREE.Group();
  towers.name = 'ISLAND_12_CITADEL_OBELISK_TOWERS';
  const towerHeight = level === 1 ? 1.2 : level === 2 ? 1.72 : 2.15;
  const towerPositions = [[-1.02, -0.62], [1.02, -0.62], [-1.02, 0.62], [1.02, 0.62]] as const;
  const towerBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.18, 1, 4), materials.sandstoneLight, towerPositions.length);
  const towerCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, 0.3, 4), materials.gold, towerPositions.length);
  const towerInsets = quality === 'low'
    ? null
    : new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 1, 0.19), materials.turquoise, towerPositions.length);
  towerBodies.name = 'ISLAND_12_CITADEL_OBELISK_BODY_ARRAY';
  towerCaps.name = 'ISLAND_12_CITADEL_OBELISK_CAP_ARRAY';
  if (towerInsets) towerInsets.name = 'ISLAND_12_CITADEL_OBELISK_INSET_ARRAY';
  const towerMatrix = new THREE.Matrix4();
  const towerQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
  const towerScale = new THREE.Vector3();
  const towerPosition = new THREE.Vector3();
  towerPositions.forEach(([x, z], index) => {
    towerMatrix.compose(towerPosition.set(x, 0.55 + towerHeight / 2, z), towerQuaternion, towerScale.set(1, towerHeight, 1));
    towerBodies.setMatrixAt(index, towerMatrix);
    towerMatrix.compose(towerPosition.set(x, 0.55 + towerHeight + 0.15, z), towerQuaternion, towerScale.set(1, 1, 1));
    towerCaps.setMatrixAt(index, towerMatrix);
    if (towerInsets) {
      towerMatrix.compose(towerPosition.set(x, 0.55 + towerHeight * 0.58, z + 0.005), towerQuaternion, towerScale.set(1, towerHeight * 0.5, 1));
      towerInsets.setMatrixAt(index, towerMatrix);
    }
  });
  towerBodies.instanceMatrix.needsUpdate = true;
  towerCaps.instanceMatrix.needsUpdate = true;
  if (towerInsets) towerInsets.instanceMatrix.needsUpdate = true;
  towerBodies.castShadow = quality !== 'low';
  towers.add(towerBodies, towerCaps);
  if (towerInsets) towers.add(towerInsets);
  root.add(towers);

  const arcadeCount = level === 1 ? 6 : level === 2 ? 8 : 10;
  const arcadePanels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.68, 0.055), materials.turquoise, arcadeCount);
  const arcadeLintels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.08, 0.085), materials.gold, arcadeCount);
  arcadePanels.name = 'ISLAND_12_CITADEL_ARCADE_PANEL_ARRAY';
  arcadeLintels.name = 'ISLAND_12_CITADEL_ARCADE_LINTEL_ARRAY';
  const arcadeMatrix = new THREE.Matrix4();
  const arcadeQuaternion = new THREE.Quaternion();
  const arcadeScale = new THREE.Vector3(1, 1, 1);
  const arcadePosition = new THREE.Vector3();
  for (let index = 0; index < arcadeCount; index += 1) {
    const angle = index / arcadeCount * Math.PI * 2;
    arcadeQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    arcadeMatrix.compose(arcadePosition.set(Math.cos(angle) * 0.94, 1.28, Math.sin(angle) * 0.94), arcadeQuaternion, arcadeScale);
    arcadePanels.setMatrixAt(index, arcadeMatrix);
    arcadeMatrix.compose(arcadePosition.set(Math.cos(angle) * 0.95, 1.66, Math.sin(angle) * 0.95), arcadeQuaternion, arcadeScale);
    arcadeLintels.setMatrixAt(index, arcadeMatrix);
  }
  arcadePanels.instanceMatrix.needsUpdate = true;
  arcadeLintels.instanceMatrix.needsUpdate = true;
  root.add(arcadePanels, arcadeLintels);

  const upperFacadeDetails = new THREE.Group();
  upperFacadeDetails.name = 'ISLAND_12_CITADEL_UPPER_FACADE_DETAIL_NETWORK';
  const upperFacadeCount = level === 1 ? 3 : level === 2 ? 4 : 5;
  const upperFacadePanels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.11, level === 3 ? 0.42 : 0.34, 0.045),
    materials.turquoise,
    upperFacadeCount,
  );
  const upperFacadeArchCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.09, 0.11, 3),
    materials.gold,
    upperFacadeCount,
  );
  const upperFacadeSills = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.18, 0.055, 0.075),
    materials.gold,
    upperFacadeCount,
  );
  const upperFacadePilasters = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.045, level === 3 ? 0.78 : 0.62, 0.075),
    materials.sandstoneLight,
    upperFacadeCount + 1,
  );
  upperFacadePanels.name = 'ISLAND_12_CITADEL_UPPER_DRUM_WINDOW_ARRAY';
  upperFacadeArchCaps.name = 'ISLAND_12_CITADEL_UPPER_DRUM_ARCH_CAP_ARRAY';
  upperFacadeSills.name = 'ISLAND_12_CITADEL_UPPER_DRUM_SILL_ARRAY';
  upperFacadePilasters.name = 'ISLAND_12_CITADEL_UPPER_DRUM_PILASTER_ARRAY';
  const upperFacadeMatrix = new THREE.Matrix4();
  const upperFacadePosition = new THREE.Vector3();
  const upperFacadeQuaternion = new THREE.Quaternion();
  const upperFacadeScale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < upperFacadeCount; index += 1) {
    const progress = index / (upperFacadeCount - 1);
    const angle = THREE.MathUtils.lerp(0.78, 2.36, progress);
    upperFacadeQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
    upperFacadeMatrix.compose(
      upperFacadePosition.set(Math.cos(angle) * 0.93, level === 3 ? 2.76 : 2.27, Math.sin(angle) * 0.93),
      upperFacadeQuaternion,
      upperFacadeScale,
    );
    upperFacadePanels.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(Math.cos(angle) * 0.945, level === 3 ? 3.01 : 2.47, Math.sin(angle) * 0.945),
      upperFacadeQuaternion,
      upperFacadeScale,
    );
    upperFacadeArchCaps.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(Math.cos(angle) * 0.95, level === 3 ? 2.51 : 2.04, Math.sin(angle) * 0.95),
      upperFacadeQuaternion,
      upperFacadeScale,
    );
    upperFacadeSills.setMatrixAt(index, upperFacadeMatrix);
  }
  for (let index = 0; index <= upperFacadeCount; index += 1) {
    const progress = index / upperFacadeCount;
    const angle = THREE.MathUtils.lerp(0.66, 2.48, progress);
    upperFacadeQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
    upperFacadeMatrix.compose(
      upperFacadePosition.set(Math.cos(angle) * 0.955, level === 3 ? 2.76 : 2.26, Math.sin(angle) * 0.955),
      upperFacadeQuaternion,
      upperFacadeScale,
    );
    upperFacadePilasters.setMatrixAt(index, upperFacadeMatrix);
  }
  upperFacadePanels.instanceMatrix.needsUpdate = true;
  upperFacadeArchCaps.instanceMatrix.needsUpdate = true;
  upperFacadeSills.instanceMatrix.needsUpdate = true;
  upperFacadePilasters.instanceMatrix.needsUpdate = true;
  upperFacadePilasters.castShadow = quality !== 'low';

  const upperBannerCount = level === 3 ? 5 : level === 2 ? 3 : 2;
  const upperFacadeBanners = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.14 : 0.11, level === 3 ? 0.46 : 0.34, 0.026),
    materials.turquoise,
    upperBannerCount,
  );
  upperFacadeBanners.name = 'ISLAND_12_CITADEL_UPPER_GALLERY_BANNER_ARRAY';
  for (let index = 0; index < upperBannerCount; index += 1) {
    const progress = index / (upperBannerCount - 1);
    const angle = THREE.MathUtils.lerp(0.82, 2.32, progress);
    upperFacadeQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, index % 2 ? 0.035 : -0.025));
    upperFacadeMatrix.compose(
      upperFacadePosition.set(
        Math.cos(angle) * 1.005,
        level === 3 ? 2.28 - index % 2 * 0.035 : 1.91,
        Math.sin(angle) * 1.005,
      ),
      upperFacadeQuaternion,
      upperFacadeScale.set(1, 1, 1),
    );
    upperFacadeBanners.setMatrixAt(index, upperFacadeMatrix);
  }
  upperFacadeBanners.instanceMatrix.needsUpdate = true;

  const facadeCourseRows = level === 3 ? 4 : level === 2 ? 3 : 2;
  const facadeCourseColumns = quality === 'high' ? 6 : quality === 'medium' ? 5 : 4;
  const facadeCourseCount = facadeCourseRows * facadeCourseColumns;
  const facadeCourseRelief = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.23 : 0.19, 0.052, 0.038),
    materials.sandstoneWorn,
    facadeCourseCount,
  );
  facadeCourseRelief.name = 'ISLAND_12_CITADEL_UPPER_DRUM_BLOCK_COURSE_ARRAY';
  let facadeCourseIndex = 0;
  for (let row = 0; row < facadeCourseRows; row += 1) {
    for (let column = 0; column < facadeCourseColumns; column += 1) {
      const stagger = row % 2 === 0 ? 0 : 0.5 / facadeCourseColumns;
      const progress = THREE.MathUtils.clamp((column + 0.5) / facadeCourseColumns + stagger, 0.08, 0.92);
      const angle = THREE.MathUtils.lerp(0.7, 2.44, progress);
      upperFacadeQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
      upperFacadeMatrix.compose(
        upperFacadePosition.set(
          Math.cos(angle) * 0.97,
          (level === 3 ? 2.23 : 1.94) + row * (level === 3 ? 0.29 : 0.24),
          Math.sin(angle) * 0.97,
        ),
        upperFacadeQuaternion,
        upperFacadeScale,
      );
      facadeCourseRelief.setMatrixAt(facadeCourseIndex, upperFacadeMatrix);
      facadeCourseIndex += 1;
    }
  }
  facadeCourseRelief.instanceMatrix.needsUpdate = true;

  const balconyCount = level === 3 ? 3 : level === 2 ? 1 : 0;
  const wingBalconyCount = level >= 2 ? 2 : 0;
  const balconyGoldBoxCount = balconyCount * 4 + wingBalconyCount * 5;
  const balconyGoldBoxes = balconyGoldBoxCount > 0
    ? new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.gold, balconyGoldBoxCount)
    : null;
  const balconyBracketCount = balconyCount + wingBalconyCount * 2;
  const balconyBrackets = balconyBracketCount > 0
    ? new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), materials.sandstoneShadow, balconyBracketCount)
    : null;
  let balconyGoldBoxIndex = 0;
  let balconyBracketIndex = 0;
  if (balconyGoldBoxes && balconyBrackets) {
    balconyGoldBoxes.name = 'ISLAND_12_CITADEL_GOLD_BALCONY_SLAB_RAIL_POST_ARRAY';
    balconyBrackets.name = 'ISLAND_12_CITADEL_BALCONY_BRACKET_ARRAY';
    for (let index = 0; index < balconyCount; index += 1) {
      const progress = balconyCount === 1 ? 0.5 : index / (balconyCount - 1);
      const angle = THREE.MathUtils.lerp(1.04, 2.1, progress);
      upperFacadeQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
      upperFacadeMatrix.compose(
        upperFacadePosition.set(Math.cos(angle) * 1.06, level === 3 ? 2.49 : 2.04, Math.sin(angle) * 1.06),
        upperFacadeQuaternion,
        upperFacadeScale.set(0.32, 0.07, 0.22),
      );
      balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
      balconyGoldBoxIndex += 1;
      upperFacadeMatrix.compose(
        upperFacadePosition.set(Math.cos(angle) * 1.17, level === 3 ? 2.68 : 2.22, Math.sin(angle) * 1.17),
        upperFacadeQuaternion,
        upperFacadeScale.set(0.3, 0.035, 0.035),
      );
      balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
      balconyGoldBoxIndex += 1;
      [-1, 1].forEach((side) => {
        const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        const postPosition = upperFacadePosition
          .set(Math.cos(angle) * 1.17, level === 3 ? 2.59 : 2.13, Math.sin(angle) * 1.17)
          .addScaledVector(tangent, side * 0.12);
        upperFacadeMatrix.compose(postPosition, upperFacadeQuaternion, upperFacadeScale.set(0.035, 0.17, 0.035));
        balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
        balconyGoldBoxIndex += 1;
      });
      upperFacadeMatrix.compose(
        upperFacadePosition.set(Math.cos(angle) * 1.02, level === 3 ? 2.38 : 1.93, Math.sin(angle) * 1.02),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, -angle + Math.PI / 2, 0)),
        upperFacadeScale.set(0.075, 0.18, 0.075),
      );
      balconyBrackets.setMatrixAt(balconyBracketIndex, upperFacadeMatrix);
      balconyBracketIndex += 1;
    }
  }

  const wingX = level === 3 ? 1.62 : 1.32;
  if (balconyGoldBoxes && balconyBrackets) {
    [-wingX, wingX].forEach((x) => {
      upperFacadeMatrix.compose(
        upperFacadePosition.set(x, level === 3 ? 1.77 : 1.62, 0.58),
        new THREE.Quaternion(),
        upperFacadeScale.set(level === 3 ? 0.72 : 0.6, 0.075, 0.34),
      );
      balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
      balconyGoldBoxIndex += 1;
      upperFacadeMatrix.compose(
        upperFacadePosition.set(x, level === 3 ? 1.98 : 1.82, 0.75),
        new THREE.Quaternion(),
        upperFacadeScale.set(level === 3 ? 0.68 : 0.56, 0.042, 0.045),
      );
      balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
      balconyGoldBoxIndex += 1;
      [-1, 0, 1].forEach((postStep) => {
        upperFacadeMatrix.compose(
          upperFacadePosition.set(
            x + postStep * (level === 3 ? 0.28 : 0.23),
            level === 3 ? 1.88 : 1.72,
            0.75,
          ),
          new THREE.Quaternion(),
          upperFacadeScale.set(0.04, 0.2, 0.04),
        );
        balconyGoldBoxes.setMatrixAt(balconyGoldBoxIndex, upperFacadeMatrix);
        balconyGoldBoxIndex += 1;
      });
      [-1, 1].forEach((bracketSide) => {
        upperFacadeMatrix.compose(
          upperFacadePosition.set(
            x + bracketSide * (level === 3 ? 0.23 : 0.19),
            level === 3 ? 1.65 : 1.5,
            0.51,
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)),
          upperFacadeScale.set(0.075, 0.22, 0.075),
        );
        balconyBrackets.setMatrixAt(balconyBracketIndex, upperFacadeMatrix);
        balconyBracketIndex += 1;
      });
    });
    balconyGoldBoxes.instanceMatrix.needsUpdate = true;
    balconyBrackets.instanceMatrix.needsUpdate = true;
  }
  const wingWindowPositions = level === 1
    ? [[-wingX, 0], [wingX, 0]] as const
    : [
        [-wingX - (level === 3 ? 0.24 : 0.2), 0],
        [-wingX + (level === 3 ? 0.24 : 0.2), 0],
        [wingX - (level === 3 ? 0.24 : 0.2), 0],
        [wingX + (level === 3 ? 0.24 : 0.2), 0],
      ] as const;
  const wingDetailCount = wingWindowPositions.length;
  const wingWindowRecesses = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.3 : 0.26, 0.66, 0.045),
    materials.sandstoneShadow,
    wingDetailCount,
  );
  const wingWindows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.16 : 0.14, 0.5, 0.065),
    materials.turquoise,
    wingDetailCount,
  );
  const wingArchFrames = new THREE.InstancedMesh(
    createPointedArchFrameGeometry(
      level === 3 ? 0.3 : 0.26,
      level === 3 ? 0.74 : 0.64,
      level === 3 ? 0.065 : 0.055,
      0.1,
    ),
    materials.gold,
    wingDetailCount,
  );
  const wingGoldBoxCount = wingDetailCount + 10;
  const wingGoldBoxes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.gold,
    wingGoldBoxCount,
  );
  const wingArcadePiers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.sandstoneLight,
    6,
  );
  const wingQuoinCount = level === 3 ? 12 : 8;
  const wingQuoins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.16 : 0.13, 0.22, 0.1),
    materials.sandstoneWorn,
    wingQuoinCount,
  );
  wingWindowRecesses.name = 'ISLAND_12_CITADEL_WING_WINDOW_RECESS_ARRAY';
  wingWindows.name = 'ISLAND_12_CITADEL_WING_WINDOW_ARRAY';
  wingArchFrames.name = 'ISLAND_12_CITADEL_WING_DEEP_POINTED_ARCH_FRAME_ARRAY';
  wingGoldBoxes.name = 'ISLAND_12_CITADEL_WING_GOLD_SILL_BAND_EAVE_ARRAY';
  wingArcadePiers.name = 'ISLAND_12_CITADEL_WING_DEEP_ARCADE_PIER_ARRAY';
  wingQuoins.name = 'ISLAND_12_CITADEL_WING_QUOIN_ARRAY';
  wingWindowPositions.forEach(([x], index) => {
    upperFacadeMatrix.compose(upperFacadePosition.set(x, level === 3 ? 1.53 : 1.36, 0.397), new THREE.Quaternion(), upperFacadeScale.set(1, 1, 1));
    wingWindowRecesses.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(upperFacadePosition.set(x, level === 3 ? 1.55 : 1.38, 0.395), new THREE.Quaternion(), upperFacadeScale.set(1, 1, 1));
    wingWindows.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.18 : 1.06, 0.455),
      new THREE.Quaternion(),
      upperFacadeScale.set(1, 1, 1),
    );
    wingArchFrames.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.25 : 1.11, 0.425),
      new THREE.Quaternion(),
      upperFacadeScale.set(level === 3 ? 0.3 : 0.26, 0.055, 0.1),
    );
    wingGoldBoxes.setMatrixAt(index, upperFacadeMatrix);
  });
  [-wingX, wingX].forEach((x, index) => {
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 2.08 : 1.9, 0.41),
      new THREE.Quaternion(),
      upperFacadeScale.set(level === 3 ? 0.92 : 0.76, 0.075, 0.08),
    );
    wingGoldBoxes.setMatrixAt(wingDetailCount + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 2.25 : 2.06, 0.41),
      new THREE.Quaternion(),
      upperFacadeScale.set(level === 3 ? 1.24 : 1.02, 0.085, level === 3 ? 0.34 : 0.29),
    );
    wingGoldBoxes.setMatrixAt(wingDetailCount + 2 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 2.73 : 2.42, -0.2),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.075, 0.075, level === 3 ? 1.28 : 1.06),
    );
    wingGoldBoxes.setMatrixAt(wingDetailCount + 4 + index, upperFacadeMatrix);
    [-1, 1].forEach((roofSide, roofSideIndex) => {
      upperFacadeMatrix.compose(
        upperFacadePosition.set(
          x + roofSide * (level === 3 ? 0.38 : 0.31),
          level === 3 ? 2.49 : 2.25,
          level === 3 ? 0.405 : 0.325,
        ),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -roofSide * 0.98)),
        upperFacadeScale.set(0.07, level === 3 ? 0.82 : 0.68, 0.07),
      );
      wingGoldBoxes.setMatrixAt(wingDetailCount + 6 + index * 2 + roofSideIndex, upperFacadeMatrix);
    });
    [-1, 0, 1].forEach((pierStep, pierIndex) => {
      upperFacadeMatrix.compose(
        upperFacadePosition.set(
          x + pierStep * (level === 3 ? 0.31 : 0.25),
          level === 3 ? 1.58 : 1.4,
          0.465,
        ),
        new THREE.Quaternion(),
        upperFacadeScale.set(level === 3 ? 0.07 : 0.06, level === 3 ? 0.82 : 0.7, 0.15),
      );
      wingArcadePiers.setMatrixAt(index * 3 + pierIndex, upperFacadeMatrix);
    });
  });
  let wingQuoinIndex = 0;
  upperFacadeScale.set(1, 1, 1);
  [-wingX, wingX].forEach((x) => {
    const rowCount = level === 3 ? 3 : 2;
    [-1, 1].forEach((side) => {
      for (let row = 0; row < rowCount; row += 1) {
        upperFacadeMatrix.compose(
          upperFacadePosition.set(
            x + side * (level === 3 ? 0.58 : 0.47),
            (level === 3 ? 1.16 : 1.08) + row * 0.34,
            0.425,
          ),
          new THREE.Quaternion(),
          upperFacadeScale,
        );
        wingQuoins.setMatrixAt(wingQuoinIndex, upperFacadeMatrix);
        wingQuoinIndex += 1;
      }
    });
  });
  wingWindowRecesses.instanceMatrix.needsUpdate = true;
  wingWindows.instanceMatrix.needsUpdate = true;
  wingArchFrames.instanceMatrix.needsUpdate = true;
  wingGoldBoxes.instanceMatrix.needsUpdate = true;
  wingArcadePiers.instanceMatrix.needsUpdate = true;
  wingArcadePiers.castShadow = quality !== 'low';
  wingQuoins.instanceMatrix.needsUpdate = true;

  const waterRibbonCount = 4;
  const waterRibbons = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.waterShallow,
    waterRibbonCount,
  );
  const waterFoamPads = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.foam,
    4,
  );
  const goldPipeNetwork = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 8),
    materials.gold,
    12,
  );
  const overflowBasins = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.23, 0.27, 0.1, 12),
    materials.sandstoneWet,
    2,
  );
  const overflowBasinWater = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.025, 12),
    materials.waterShallow,
    2,
  );
  const cisternBodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(level === 3 ? 0.22 : 0.18, level === 3 ? 0.26 : 0.22, level === 3 ? 0.38 : 0.3, 10),
    materials.turquoise,
    2,
  );
  const cisternRims = new THREE.InstancedMesh(
    new THREE.TorusGeometry(level === 3 ? 0.24 : 0.2, 0.035, 5, 12),
    materials.gold,
    2,
  );
  const terraceRunnelBorders = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.04, 0.06, level === 3 ? 0.82 : 0.68),
    materials.sandstoneWet,
    4,
  );
  waterRibbons.name = 'ISLAND_12_CITADEL_FALL_AND_RUNNEL_WATER_ARRAY';
  waterFoamPads.name = 'ISLAND_12_CITADEL_FALL_AND_RUNNEL_FOAM_ARRAY';
  goldPipeNetwork.name = 'ISLAND_12_CITADEL_CISTERN_MANIFOLD_AND_SPOUT_ARRAY';
  overflowBasins.name = 'ISLAND_12_CITADEL_TWIN_OVERFLOW_BASIN_ARRAY';
  overflowBasinWater.name = 'ISLAND_12_CITADEL_TWIN_OVERFLOW_BASIN_WATER_ARRAY';
  cisternBodies.name = 'ISLAND_12_CITADEL_RAISED_CISTERN_ARRAY';
  cisternRims.name = 'ISLAND_12_CITADEL_RAISED_CISTERN_RIM_ARRAY';
  terraceRunnelBorders.name = 'ISLAND_12_CITADEL_CEREMONIAL_RUNNEL_BORDER_ARRAY';
  const overflowX = level === 3 ? 1.16 : 1.0;
  let runnelBorderIndex = 0;
  [-overflowX, overflowX].forEach((x, index) => {
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 0.73 : 0.64, 1.46),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.16, level === 3 ? 0.62 : 0.44, 0.035),
    );
    waterRibbons.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.04 : 0.88, 1.47),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.24, 0.045, 0.09),
    );
    waterFoamPads.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.14 : 0.98, 1.46),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      upperFacadeScale.set(0.065, 0.28, 0.065),
    );
    goldPipeNetwork.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 0.35 : 0.31, 1.56),
      new THREE.Quaternion(),
      upperFacadeScale.set(1, 1, 1),
    );
    overflowBasins.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 0.407 : 0.367, 1.56),
      new THREE.Quaternion(),
      upperFacadeScale.set(1, 1, 1),
    );
    overflowBasinWater.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.48 : 1.32, 1.16),
      new THREE.Quaternion(),
      upperFacadeScale.set(1, 1, 1),
    );
    cisternBodies.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.68 : 1.48, 1.16),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      upperFacadeScale.set(1, 1, 1),
    );
    cisternRims.setMatrixAt(index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.28 : 1.14, 1.31),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.04, level === 3 ? 0.42 : 0.34, 0.04),
    );
    goldPipeNetwork.setMatrixAt(2 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.28 : 1.14, 1.39),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      upperFacadeScale.set(0.045, level === 3 ? 0.54 : 0.44, 0.045),
    );
    goldPipeNetwork.setMatrixAt(4 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.41 : 1.23, 1.16),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.075, 0.12, 0.075),
    );
    goldPipeNetwork.setMatrixAt(6 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.48 : 1.32, 1.35),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      upperFacadeScale.set(0.04, level === 3 ? 0.38 : 0.3, 0.04),
    );
    goldPipeNetwork.setMatrixAt(8 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 1.31 : 1.15, 1.46),
      new THREE.Quaternion(),
      upperFacadeScale.set(0.045, level === 3 ? 0.34 : 0.3, 0.045),
    );
    goldPipeNetwork.setMatrixAt(10 + index, upperFacadeMatrix);
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 0.418 : 0.378, level === 3 ? 1.91 : 1.83),
      new THREE.Quaternion(),
      upperFacadeScale.set(level === 3 ? 0.18 : 0.15, 0.025, level === 3 ? 0.78 : 0.64),
    );
    waterRibbons.setMatrixAt(2 + index, upperFacadeMatrix);
    [-1, 1].forEach((side) => {
      upperFacadeMatrix.compose(
        upperFacadePosition.set(
          x + side * (level === 3 ? 0.12 : 0.105),
          level === 3 ? 0.397 : 0.357,
          level === 3 ? 1.91 : 1.83,
        ),
        new THREE.Quaternion(),
        upperFacadeScale.set(1, 1, 1),
      );
      terraceRunnelBorders.setMatrixAt(runnelBorderIndex, upperFacadeMatrix);
      runnelBorderIndex += 1;
    });
    upperFacadeMatrix.compose(
      upperFacadePosition.set(x, level === 3 ? 0.43 : 0.39, level === 3 ? 2.3 : 2.15),
      new THREE.Quaternion(),
      upperFacadeScale.set(level === 3 ? 0.22 : 0.19, 0.028, 0.09),
    );
    waterFoamPads.setMatrixAt(2 + index, upperFacadeMatrix);
  });
  waterRibbons.instanceMatrix.needsUpdate = true;
  waterFoamPads.instanceMatrix.needsUpdate = true;
  goldPipeNetwork.instanceMatrix.needsUpdate = true;
  overflowBasins.instanceMatrix.needsUpdate = true;
  overflowBasinWater.instanceMatrix.needsUpdate = true;
  cisternBodies.instanceMatrix.needsUpdate = true;
  cisternRims.instanceMatrix.needsUpdate = true;
  terraceRunnelBorders.instanceMatrix.needsUpdate = true;
  const upperTurquoiseBoxDetails = combineBoxInstanceArrays(
    'ISLAND_12_CITADEL_UPPER_TURQUOISE_BOX_DETAIL_ARRAY',
    materials.turquoise,
    [upperFacadePanels, wingWindows, upperFacadeBanners],
  );
  const upperGoldBoxSources = [upperFacadeSills, wingGoldBoxes];
  if (balconyGoldBoxes) upperGoldBoxSources.push(balconyGoldBoxes);
  const upperGoldBoxDetails = combineBoxInstanceArrays(
    'ISLAND_12_CITADEL_UPPER_GOLD_BOX_DETAIL_ARRAY',
    materials.gold,
    upperGoldBoxSources,
  );
  const upperSandstoneLightBoxDetails = combineBoxInstanceArrays(
    'ISLAND_12_CITADEL_UPPER_SANDSTONE_LIGHT_BOX_DETAIL_ARRAY',
    materials.sandstoneLight,
    [upperFacadePilasters, wingArcadePiers],
  );
  const upperWornBoxDetails = combineBoxInstanceArrays(
    'ISLAND_12_CITADEL_UPPER_WORN_BOX_DETAIL_ARRAY',
    materials.sandstoneWorn,
    [facadeCourseRelief, wingQuoins],
  );
  upperFacadeDetails.add(
    upperTurquoiseBoxDetails,
    upperFacadeArchCaps,
    wingWindowRecesses,
    wingArchFrames,
    upperGoldBoxDetails,
    upperSandstoneLightBoxDetails,
    upperWornBoxDetails,
    waterRibbons,
    waterFoamPads,
    goldPipeNetwork,
    overflowBasins,
    overflowBasinWater,
    cisternBodies,
    cisternRims,
    terraceRunnelBorders,
  );
  if (balconyBrackets) upperFacadeDetails.add(balconyBrackets);
  compactIsland12StaticPresentationGeometry(upperFacadeDetails, 'ISLAND_12_CITADEL_UPPER_FACADE');
  root.add(upperFacadeDetails);
  const entrance = new THREE.Group();
  entrance.name = 'ISLAND_12_CITADEL_MONUMENTAL_ENTRANCE';
  const entranceMass = box(level === 1 ? 1.05 : 1.34, level === 1 ? 0.98 : 1.3, 0.4, materials.sandstoneShadow);
  entranceMass.name = 'ISLAND_12_CITADEL_ENTRANCE_MASS';
  entranceMass.position.set(0, 1.12, 1.04);
  const entranceCrown = new THREE.Mesh(
    new THREE.ConeGeometry(level === 1 ? 0.72 : 0.9, level === 1 ? 0.34 : 0.46, 4),
    materials.sandstoneLight,
  );
  entranceCrown.name = 'ISLAND_12_CITADEL_ENTRANCE_CROWN';
  entranceCrown.position.set(0, level === 1 ? 1.78 : 2.0, 1.04);
  entranceCrown.rotation.y = Math.PI / 4;
  entranceCrown.scale.z = 0.48;
  const doorway = box(level === 1 ? 0.46 : 0.58, level === 1 ? 0.78 : 0.96, 0.08, materials.obsidian);
  doorway.name = 'ISLAND_12_CITADEL_ENTRANCE_DOOR';
  doorway.position.set(0, 1.05, 1.34);
  doorway.scale.x = 0.8;
  const doorwayRecess = box(level === 1 ? 0.58 : 0.72, level === 1 ? 0.88 : 1.08, 0.065, materials.sandstoneShadow);
  doorwayRecess.name = 'ISLAND_12_CITADEL_ENTRANCE_RECESS';
  doorwayRecess.position.set(0, 1.05, 1.275);
  const doorwayTympanumShape = new THREE.Shape();
  const doorwayTympanumHalfWidth = level === 1 ? 0.185 : 0.235;
  doorwayTympanumShape.moveTo(-doorwayTympanumHalfWidth, 0);
  doorwayTympanumShape.lineTo(doorwayTympanumHalfWidth, 0);
  doorwayTympanumShape.lineTo(0, level === 1 ? 0.28 : 0.34);
  doorwayTympanumShape.closePath();
  const doorwayTympanum = new THREE.Mesh(new THREE.ShapeGeometry(doorwayTympanumShape), materials.turquoise);
  doorwayTympanum.name = 'ISLAND_12_CITADEL_ENTRANCE_POINTED_TYMPANUM';
  doorwayTympanum.position.set(0, level === 1 ? 1.44 : 1.53, 1.386);
  const doorReliefCount = level === 1 ? 2 : 3;
  const entranceGoldBoxes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.gold,
    7 + doorReliefCount,
  );
  entranceGoldBoxes.name = 'ISLAND_12_CITADEL_ENTRANCE_GOLD_BOX_DETAIL_ARRAY';
  const entranceDetailMatrix = new THREE.Matrix4();
  const entranceDetailPosition = new THREE.Vector3();
  const entranceDetailScale = new THREE.Vector3(1, 1, 1);
  [-1, 1].forEach((side, index) => {
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(side * (level === 1 ? 0.27 : 0.34), 1.05, 1.315),
      new THREE.Quaternion(),
      entranceDetailScale.set(0.075, level === 1 ? 0.82 : 1.0, 0.11),
    );
    entranceGoldBoxes.setMatrixAt(index, entranceDetailMatrix);
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(0, 1.05, 1.325),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * 0.48)),
      entranceDetailScale.set(0.045, level === 1 ? 0.66 : 0.82, 0.075),
    );
    entranceGoldBoxes.setMatrixAt(2 + index, entranceDetailMatrix);
  });
  entranceDetailMatrix.compose(
    entranceDetailPosition.set(0, level === 1 ? 1.47 : 1.57, 1.29),
    new THREE.Quaternion(),
    entranceDetailScale.set(level === 1 ? 0.7 : 0.88, 0.12, 0.14),
  );
  entranceGoldBoxes.setMatrixAt(4, entranceDetailMatrix);
  entranceDetailMatrix.compose(
    entranceDetailPosition.set(0, level === 1 ? 1.62 : 1.76, 1.31),
    new THREE.Quaternion(),
    entranceDetailScale.set(level === 1 ? 0.96 : 1.18, 0.14, 0.2),
  );
  entranceGoldBoxes.setMatrixAt(5, entranceDetailMatrix);
  entranceDetailMatrix.compose(
    entranceDetailPosition.set(0, 1.05, 1.34),
    new THREE.Quaternion(),
    entranceDetailScale.set(0.042, level === 1 ? 0.7 : 0.88, 0.07),
  );
  entranceGoldBoxes.setMatrixAt(6, entranceDetailMatrix);
  for (let index = 0; index < doorReliefCount; index += 1) {
    const y = (level === 1 ? 0.82 : 0.74) + index * (level === 1 ? 0.32 : 0.29);
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(0, y, 1.385),
      new THREE.Quaternion(),
      entranceDetailScale.set(level === 1 ? 0.12 : 0.15, 0.045, 0.06),
    );
    entranceGoldBoxes.setMatrixAt(7 + index, entranceDetailMatrix);
  }
  entranceGoldBoxes.instanceMatrix.needsUpdate = true;
  const portalPiers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 1 ? 0.12 : 0.16, level === 1 ? 1.0 : 1.22, 0.18),
    materials.sandstoneLight,
    2,
  );
  portalPiers.name = 'ISLAND_12_CITADEL_ENTRANCE_PORTAL_PIER_ARRAY';
  [-1, 1].forEach((side, index) => {
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(side * (level === 1 ? 0.43 : 0.52), 1.08, 1.3),
      new THREE.Quaternion(),
      entranceDetailScale.set(1, 1, 1),
    );
    portalPiers.setMatrixAt(index, entranceDetailMatrix);
  });
  portalPiers.instanceMatrix.needsUpdate = true;
  portalPiers.castShadow = quality !== 'low';
  const entranceArchPipes = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 7),
    materials.gold,
    2,
  );
  entranceArchPipes.name = 'ISLAND_12_CITADEL_ENTRANCE_POINTED_ARCH_PIPE_ARRAY';
  const entranceArchRadius = level === 1 ? 0.045 : 0.055;
  const entranceArchApex = new THREE.Vector3(0, level === 1 ? 2.02 : 2.22, 1.39);
  [
    [new THREE.Vector3(level === 1 ? -0.46 : -0.56, level === 1 ? 1.67 : 1.81, 1.39), entranceArchApex],
    [entranceArchApex, new THREE.Vector3(level === 1 ? 0.46 : 0.56, level === 1 ? 1.67 : 1.81, 1.39)],
  ].forEach(([start, end], index) => {
    const direction = end.clone().sub(start);
    entranceDetailMatrix.compose(
      entranceDetailPosition.copy(start).add(end).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      entranceDetailScale.set(entranceArchRadius, direction.length(), entranceArchRadius),
    );
    entranceArchPipes.setMatrixAt(index, entranceDetailMatrix);
  });
  entranceArchPipes.instanceMatrix.needsUpdate = true;
  const monumentalPortalFrame = new THREE.Mesh(
    createPointedArchFrameGeometry(
      level === 1 ? 0.94 : 1.16,
      level === 1 ? 1.24 : 1.54,
      level === 1 ? 0.13 : 0.17,
      level === 1 ? 0.13 : 0.17,
    ),
    materials.sandstoneWorn,
  );
  monumentalPortalFrame.name = 'ISLAND_12_CITADEL_MONUMENTAL_POINTED_PORTAL_FRAME';
  monumentalPortalFrame.position.set(0, level === 1 ? 0.63 : 0.6, 1.36);
  monumentalPortalFrame.castShadow = quality !== 'low';
  const entranceDoorPanels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 1 ? 0.13 : 0.16, level === 1 ? 0.66 : 0.8, 0.035),
    materials.turquoise,
    2,
  );
  entranceDoorPanels.name = 'ISLAND_12_CITADEL_RECESSED_TWIN_DOOR_ARRAY';
  [-1, 1].forEach((side, index) => {
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(side * (level === 1 ? 0.105 : 0.132), 1.02, 1.389),
      new THREE.Quaternion(),
      entranceDetailScale.set(1, 1, 1),
    );
    entranceDoorPanels.setMatrixAt(index, entranceDetailMatrix);
  });
  entranceDoorPanels.instanceMatrix.needsUpdate = true;
  const portalLanternStems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.022, 0.03, level === 1 ? 0.22 : 0.28, 6),
    materials.gold,
    2,
  );
  const portalLanternGlow = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(level === 1 ? 0.075 : 0.095, 0),
    materials.lampGlow,
    2,
  );
  portalLanternStems.name = 'ISLAND_12_CITADEL_PORTAL_LANTERN_STEM_ARRAY';
  portalLanternGlow.name = 'ISLAND_12_CITADEL_PORTAL_LANTERN_GLOW_ARRAY';
  [-1, 1].forEach((side, index) => {
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(side * (level === 1 ? 0.42 : 0.52), level === 1 ? 1.29 : 1.39, 1.435),
      new THREE.Quaternion(),
      entranceDetailScale.set(1, 1, 1),
    );
    portalLanternStems.setMatrixAt(index, entranceDetailMatrix);
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(side * (level === 1 ? 0.42 : 0.52), level === 1 ? 1.13 : 1.19, 1.44),
      new THREE.Quaternion(),
      entranceDetailScale.set(1, index % 2 ? 0.92 : 1.08, 1),
    );
    portalLanternGlow.setMatrixAt(index, entranceDetailMatrix);
  });
  portalLanternStems.instanceMatrix.needsUpdate = true;
  portalLanternGlow.instanceMatrix.needsUpdate = true;
  entrance.add(
    entranceMass,
    entranceCrown,
    doorwayRecess,
    doorway,
    doorwayTympanum,
    entranceDoorPanels,
    entranceGoldBoxes,
    portalPiers,
    monumentalPortalFrame,
    entranceArchPipes,
    portalLanternStems,
    portalLanternGlow,
  );

  const guardianCount = 2;
  const guardianBodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(level === 1 ? 0.12 : 0.15, level === 1 ? 0.24 : 0.29, level === 1 ? 0.48 : 0.58, 6),
    materials.obsidian,
    guardianCount,
  );
  const guardianHeadAndHaunchVolumes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 7, 5),
    materials.obsidian,
    guardianCount * 2,
  );
  const guardianPlinths = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 1 ? 0.34 : 0.42, 0.2, 0.34),
    materials.sandstoneShadow,
    guardianCount,
  );
  guardianBodies.name = 'ISLAND_12_CITADEL_GUARDIAN_BODY_ARRAY';
  guardianHeadAndHaunchVolumes.name = 'ISLAND_12_CITADEL_GUARDIAN_HEAD_AND_HAUNCH_ARRAY';
  guardianPlinths.name = 'ISLAND_12_CITADEL_GUARDIAN_PLINTH_ARRAY';
  const guardianMatrix = new THREE.Matrix4();
  const guardianPosition = new THREE.Vector3();
  const guardianQuaternion = new THREE.Quaternion();
  const guardianScale = new THREE.Vector3(1, 1, 0.86);
  [-0.78, 0.78].forEach((x, index) => {
    guardianMatrix.compose(guardianPosition.set(x, 1.02, 1.23), guardianQuaternion, guardianScale);
    guardianBodies.setMatrixAt(index, guardianMatrix);
    const headRadius = level === 1 ? 0.13 : 0.16;
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 1.39 : 1.43, 1.23),
      guardianQuaternion,
      new THREE.Vector3(headRadius * 0.94, headRadius * (level === 1 ? 1.14 : 1.24), headRadius * 1.04),
    );
    guardianHeadAndHaunchVolumes.setMatrixAt(index, guardianMatrix);
    guardianMatrix.compose(guardianPosition.set(x, 0.63, 1.23), guardianQuaternion, new THREE.Vector3(1, 1, 1));
    guardianPlinths.setMatrixAt(index, guardianMatrix);
  });
  guardianBodies.instanceMatrix.needsUpdate = true;
  guardianPlinths.instanceMatrix.needsUpdate = true;
  const guardianEars = new THREE.InstancedMesh(
    new THREE.ConeGeometry(level === 1 ? 0.07 : 0.09, level === 1 ? 0.18 : 0.23, 3),
    materials.obsidian,
    guardianCount * 2,
  );
  const guardianObsidianBoxes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.obsidian,
    guardianCount * 3,
  );
  const guardianCollars = new THREE.InstancedMesh(
    new THREE.TorusGeometry(level === 1 ? 0.15 : 0.18, 0.032, 4, 10),
    materials.turquoise,
    guardianCount,
  );
  const guardianGoldBoxes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    materials.gold,
    guardianCount * 2,
  );
  const guardianTails = new THREE.InstancedMesh(
    new THREE.TorusGeometry(level === 1 ? 0.12 : 0.15, level === 1 ? 0.026 : 0.034, 4, 9, Math.PI * 1.35),
    materials.obsidian,
    guardianCount,
  );
  guardianEars.name = 'ISLAND_12_CITADEL_GUARDIAN_EAR_ARRAY';
  guardianObsidianBoxes.name = 'ISLAND_12_CITADEL_GUARDIAN_MUZZLE_AND_FORELEG_ARRAY';
  guardianCollars.name = 'ISLAND_12_CITADEL_GUARDIAN_COLLAR_ARRAY';
  guardianGoldBoxes.name = 'ISLAND_12_CITADEL_GUARDIAN_PLINTH_AND_CHEST_GOLD_ARRAY';
  guardianTails.name = 'ISLAND_12_CITADEL_GUARDIAN_TAIL_ARRAY';
  let guardianEarIndex = 0;
  let guardianForelegIndex = 0;
  [-0.78, 0.78].forEach((x, index) => {
    [-1, 1].forEach((earSide) => {
      guardianMatrix.compose(
        guardianPosition.set(x + earSide * (level === 1 ? 0.085 : 0.105), level === 1 ? 1.52 : 1.62, 1.23),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, earSide * 0.16)),
        new THREE.Vector3(1, level === 1 ? 1.08 : 1.18, 1),
      );
      guardianEars.setMatrixAt(guardianEarIndex, guardianMatrix);
      guardianEarIndex += 1;
    });
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 1.36 : 1.42, level === 1 ? 1.38 : 1.42),
      new THREE.Quaternion(),
      new THREE.Vector3((level === 1 ? 0.11 : 0.14) * 0.82, 0.09 * 0.78, (level === 1 ? 0.11 : 0.14) * (level === 1 ? 1.3 : 1.5)),
    );
    guardianObsidianBoxes.setMatrixAt(index, guardianMatrix);
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 1.24 : 1.27, 1.23),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    guardianCollars.setMatrixAt(index, guardianMatrix);
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 0.735 : 0.755, 1.23),
      new THREE.Quaternion(),
      new THREE.Vector3(level === 1 ? 0.38 : 0.46, 0.055, level === 1 ? 0.38 : 0.46),
    );
    guardianGoldBoxes.setMatrixAt(index, guardianMatrix);
    [-1, 1].forEach((legSide) => {
      guardianMatrix.compose(
        guardianPosition.set(x + legSide * (level === 1 ? 0.075 : 0.09), level === 1 ? 0.9 : 0.94, 1.38),
        new THREE.Quaternion(),
        new THREE.Vector3(level === 1 ? 0.055 : 0.07, level === 1 ? 0.34 : 0.42, level === 1 ? 0.07 : 0.09),
      );
      guardianObsidianBoxes.setMatrixAt(guardianCount + guardianForelegIndex, guardianMatrix);
      guardianForelegIndex += 1;
    });
    const haunchRadius = level === 1 ? 0.13 : 0.17;
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 0.96 : 1.0, 1.12),
      new THREE.Quaternion(),
      new THREE.Vector3(haunchRadius * 1.08, haunchRadius * 1.32, haunchRadius * 0.9),
    );
    guardianHeadAndHaunchVolumes.setMatrixAt(guardianCount + index, guardianMatrix);
    guardianMatrix.compose(
      guardianPosition.set(x + (index === 0 ? -0.13 : 0.13), level === 1 ? 1.03 : 1.08, 1.09),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, index === 0 ? -0.35 : 0.35, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    guardianTails.setMatrixAt(index, guardianMatrix);
    guardianMatrix.compose(
      guardianPosition.set(x, level === 1 ? 1.15 : 1.2, 1.405),
      new THREE.Quaternion(),
      new THREE.Vector3(level === 1 ? 0.13 : 0.17, level === 1 ? 0.18 : 0.23, 0.04),
    );
    guardianGoldBoxes.setMatrixAt(guardianCount + index, guardianMatrix);
  });
  guardianEars.instanceMatrix.needsUpdate = true;
  guardianHeadAndHaunchVolumes.instanceMatrix.needsUpdate = true;
  guardianObsidianBoxes.instanceMatrix.needsUpdate = true;
  guardianCollars.instanceMatrix.needsUpdate = true;
  guardianGoldBoxes.instanceMatrix.needsUpdate = true;
  guardianTails.instanceMatrix.needsUpdate = true;
  entrance.add(
    guardianBodies,
    guardianHeadAndHaunchVolumes,
    guardianPlinths,
    guardianEars,
    guardianObsidianBoxes,
    guardianCollars,
    guardianGoldBoxes,
    guardianTails,
  );

  const terraceInlayCount = level === 3 ? 5 : level === 2 ? 3 : 1;
  const terraceInlays = new THREE.InstancedMesh(
    new THREE.BoxGeometry(level === 3 ? 0.36 : 0.3, 0.028, level === 3 ? 0.34 : 0.28),
    materials.turquoise,
    terraceInlayCount,
  );
  terraceInlays.name = 'ISLAND_12_CITADEL_CEREMONIAL_TERRACE_INLAY_ARRAY';
  for (let index = 0; index < terraceInlayCount; index += 1) {
    const x = (index - (terraceInlayCount - 1) / 2) * (level === 3 ? 0.355 : 0.295);
    const z = 1.59 - Math.abs(x) * 0.04;
    entranceDetailMatrix.compose(
      entranceDetailPosition.set(x, 0.595, z),
      new THREE.Quaternion(),
      entranceDetailScale,
    );
    terraceInlays.setMatrixAt(index, entranceDetailMatrix);
  }
  terraceInlays.instanceMatrix.needsUpdate = true;
  entrance.add(terraceInlays);

  if (level >= 2) {
    const brazierCount = 2;
    const brazierStems = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.055, 0.09, level === 3 ? 0.38 : 0.3, 8),
      materials.gold,
      brazierCount,
    );
    const brazierBowls = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(level === 3 ? 0.17 : 0.14, level === 3 ? 0.11 : 0.09, 0.12, 10),
      materials.sandstoneShadow,
      brazierCount,
    );
    const brazierFlames = new THREE.InstancedMesh(
      new THREE.ConeGeometry(level === 3 ? 0.1 : 0.08, level === 3 ? 0.26 : 0.2, 7),
      materials.gold,
      brazierCount,
    );
    brazierStems.name = 'ISLAND_12_CITADEL_BRAZIER_STEM_ARRAY';
    brazierBowls.name = 'ISLAND_12_CITADEL_BRAZIER_BOWL_ARRAY';
    brazierFlames.name = 'ISLAND_12_CITADEL_BRAZIER_FLAME_ARRAY';
    [-1.08, 1.08].forEach((x, index) => {
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, level === 3 ? 0.78 : 0.73, 1.55),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      brazierStems.setMatrixAt(index, entranceDetailMatrix);
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, level === 3 ? 1.01 : 0.91, 1.55),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      brazierBowls.setMatrixAt(index, entranceDetailMatrix);
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, level === 3 ? 1.2 : 1.08, 1.55),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      brazierFlames.setMatrixAt(index, entranceDetailMatrix);
    });
    brazierStems.instanceMatrix.needsUpdate = true;
    brazierBowls.instanceMatrix.needsUpdate = true;
    brazierFlames.instanceMatrix.needsUpdate = true;
    entrance.add(brazierStems, brazierBowls, brazierFlames);
  }
  if (level === 3) {
    const attendantPositions = [-0.24, 0.24] as const;
    const attendantBodies = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.045, 0.085, 0.4, 6),
      materials.turquoise,
      attendantPositions.length,
    );
    const attendantHeads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.065, 7, 5),
      materials.sandstoneLight,
      attendantPositions.length,
    );
    const attendantSashes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.12, 0.035, 0.035),
      materials.gold,
      attendantPositions.length,
    );
    attendantBodies.name = 'ISLAND_12_CITADEL_ATTENDANT_BODY_ARRAY';
    attendantHeads.name = 'ISLAND_12_CITADEL_ATTENDANT_HEAD_ARRAY';
    attendantSashes.name = 'ISLAND_12_CITADEL_ATTENDANT_SASH_ARRAY';
    attendantPositions.forEach((x, index) => {
      const z = 1.7 + Math.abs(x) * 0.08;
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, 0.82, z),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      attendantBodies.setMatrixAt(index, entranceDetailMatrix);
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, 1.07, z),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      attendantHeads.setMatrixAt(index, entranceDetailMatrix);
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, 0.86, z + 0.04),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, index % 2 ? 0.14 : -0.14)),
        entranceDetailScale,
      );
      attendantSashes.setMatrixAt(index, entranceDetailMatrix);
    });
    attendantBodies.instanceMatrix.needsUpdate = true;
    attendantHeads.instanceMatrix.needsUpdate = true;
    attendantSashes.instanceMatrix.needsUpdate = true;

    const jarPositions = [-0.88, 0.88] as const;
    const terraceJars = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.095, 8, 6),
      materials.ceramic,
      jarPositions.length,
    );
    const jarNecks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.035, 0.05, 0.08, 7),
      materials.gold,
      jarPositions.length,
    );
    terraceJars.name = 'ISLAND_12_CITADEL_TERRACE_JAR_ARRAY';
    jarNecks.name = 'ISLAND_12_CITADEL_TERRACE_JAR_NECK_ARRAY';
    jarPositions.forEach((x, index) => {
      const z = 1.74 - Math.abs(x) * 0.08;
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, 0.675, z),
        new THREE.Quaternion(),
        new THREE.Vector3(1, index % 2 === 0 ? 1.18 : 0.96, 1),
      );
      terraceJars.setMatrixAt(index, entranceDetailMatrix);
      entranceDetailMatrix.compose(
        entranceDetailPosition.set(x, index % 2 === 0 ? 0.81 : 0.78, z),
        new THREE.Quaternion(),
        entranceDetailScale,
      );
      jarNecks.setMatrixAt(index, entranceDetailMatrix);
    });
    terraceJars.instanceMatrix.needsUpdate = true;
    jarNecks.instanceMatrix.needsUpdate = true;
    entrance.add(attendantBodies, attendantHeads, attendantSashes, terraceJars, jarNecks);
  }
  compactIsland12StaticPresentationGeometry(entrance, 'ISLAND_12_CITADEL_ENTRANCE');
  root.add(entrance);

  const forecourtLife = new THREE.Group();
  forecourtLife.name = 'ISLAND_12_CITADEL_CIVIC_FORECOURT_LIFE';
  const forecourtMatrix = new THREE.Matrix4();
  const forecourtQuaternion = new THREE.Quaternion();
  const forecourtPosition = new THREE.Vector3();
  const forecourtScale = new THREE.Vector3(1, 1, 1);
  const benchPositions = [[-1.28, 1.88, -0.2], [1.28, 1.88, 0.2]] as const;
  const benchSeats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.58, 0.075, 0.2),
    materials.palmWood,
    benchPositions.length,
  );
  const benchLegs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.065, 0.2, 0.09),
    materials.gold,
    benchPositions.length * 2,
  );
  benchSeats.name = 'ISLAND_12_CITADEL_FORECOURT_BENCH_ARRAY';
  benchLegs.name = 'ISLAND_12_CITADEL_FORECOURT_BENCH_LEG_ARRAY';
  benchPositions.forEach(([x, z, rotation], index) => {
    forecourtQuaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    forecourtMatrix.compose(forecourtPosition.set(x, 0.67, z), forecourtQuaternion, forecourtScale);
    benchSeats.setMatrixAt(index, forecourtMatrix);
    [-1, 1].forEach((side, legIndex) => {
      const localX = side * 0.2;
      const legX = x + Math.cos(rotation) * localX;
      const legZ = z - Math.sin(rotation) * localX;
      forecourtMatrix.compose(
        forecourtPosition.set(legX, 0.55, legZ),
        forecourtQuaternion,
        forecourtScale,
      );
      benchLegs.setMatrixAt(index * 2 + legIndex, forecourtMatrix);
    });
  });
  benchSeats.instanceMatrix.needsUpdate = true;
  benchLegs.instanceMatrix.needsUpdate = true;
  forecourtLife.add(benchSeats, benchLegs);

  if (level >= 2) {
    const planterPositions = [[-1.62, 1.46], [1.62, 1.46]] as const;
    const planters = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.2, 7),
      materials.ceramic,
      planterPositions.length,
    );
    const planterRosettes = new THREE.InstancedMesh(
      createOasisGroundRosetteGeometry(),
      materials.palmLeaf,
      planterPositions.length,
    );
    planters.name = 'ISLAND_12_CITADEL_FORECOURT_PLANTER_ARRAY';
    planterRosettes.name = 'ISLAND_12_CITADEL_FORECOURT_PLANTED_ROSETTE_ARRAY';
    planterPositions.forEach(([x, z], index) => {
      forecourtMatrix.compose(
        forecourtPosition.set(x, 0.61, z),
        new THREE.Quaternion(),
        forecourtScale.set(1, index % 2 ? 0.9 : 1.08, 1),
      );
      planters.setMatrixAt(index, forecourtMatrix);
      forecourtQuaternion.setFromEuler(new THREE.Euler(0, index ? -0.42 : 0.42, 0));
      forecourtMatrix.compose(
        forecourtPosition.set(x, 0.76, z),
        forecourtQuaternion,
        forecourtScale.set(0.68, 0.68, 0.68),
      );
      planterRosettes.setMatrixAt(index, forecourtMatrix);
    });
    planters.instanceMatrix.needsUpdate = true;
    planterRosettes.instanceMatrix.needsUpdate = true;
    forecourtLife.add(planters, planterRosettes);
  }

  if (level === 3) {
    const tabletPlacements = [
      [-1.42, 1.84, -0.28], [-1.16, 1.91, -0.12],
      [1.16, 1.91, 0.12], [1.42, 1.84, 0.28],
    ] as const;
    const petitionTablets = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.025, 0.1),
      materials.linen,
      tabletPlacements.length,
    );
    const tabletSeals = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.026, 0),
      materials.coral,
      tabletPlacements.length,
    );
    petitionTablets.name = 'ISLAND_12_CITADEL_FORECOURT_PETITION_TABLET_ARRAY';
    tabletSeals.name = 'ISLAND_12_CITADEL_FORECOURT_PETITION_SEAL_ARRAY';
    tabletPlacements.forEach(([x, z, rotation], index) => {
      forecourtQuaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
      forecourtMatrix.compose(forecourtPosition.set(x, 0.718, z), forecourtQuaternion, forecourtScale.set(1, 1, 1));
      petitionTablets.setMatrixAt(index, forecourtMatrix);
      forecourtMatrix.compose(
        forecourtPosition.set(x + (index % 2 ? 0.035 : -0.035), 0.748, z),
        forecourtQuaternion,
        forecourtScale.set(0.72, 0.46, 0.72),
      );
      tabletSeals.setMatrixAt(index, forecourtMatrix);
    });
    petitionTablets.instanceMatrix.needsUpdate = true;
    tabletSeals.instanceMatrix.needsUpdate = true;
    forecourtLife.add(petitionTablets, tabletSeals);
  }
  compactIsland12StaticPresentationGeometry(forecourtLife, 'ISLAND_12_CITADEL_CIVIC_FORECOURT_LIFE');
  root.add(forecourtLife);

  if (level >= 3) {
    const finialSocket = torus(0.17, 0.025, materials.gold, quality === 'high' ? 14 : 10);
    finialSocket.name = 'ISLAND_12_CITADEL_LOTUS_FINIAL_SOCKET';
    finialSocket.position.y = dome.position.y + domeHeight + 0.055;
    const finialPetalCount = 6;
    const finialPetals = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.055, 0.2, 3),
      materials.gold,
      finialPetalCount,
    );
    finialPetals.name = 'ISLAND_12_CITADEL_LOTUS_FINIAL_PETAL_ARRAY';
    const finialPetalMatrix = new THREE.Matrix4();
    const finialPetalDirection = new THREE.Vector3();
    for (let index = 0; index < finialPetalCount; index += 1) {
      const angle = index / finialPetalCount * Math.PI * 2;
      finialPetalDirection.set(Math.cos(angle) * 0.52, 1, Math.sin(angle) * 0.52).normalize();
      finialPetalMatrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * 0.09,
          dome.position.y + domeHeight + 0.13,
          Math.sin(angle) * 0.09,
        ),
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), finialPetalDirection),
        new THREE.Vector3(1, 1, 1),
      );
      finialPetals.setMatrixAt(index, finialPetalMatrix);
    }
    finialPetals.instanceMatrix.needsUpdate = true;
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), materials.sapphire);
    finial.position.y = dome.position.y + domeHeight + 0.14;
    const finialMast = cylinder(0.035, 0.055, 0.58, materials.gold, 7);
    finialMast.position.y = dome.position.y + domeHeight + 0.36;
    const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), materials.gold);
    finialTip.position.y = dome.position.y + domeHeight + 0.79;
    root.add(finialSocket, finialPetals, finial, finialMast, finialTip);
  }
  root.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('oasis-crown-citadel', root, 'landmark'),
    registerIsland12RuntimePart('citadel-dome', dome, 'landmark-detail'),
    registerIsland12RuntimePart('citadel-obelisk-towers', towers, 'landmark-detail'),
    registerIsland12RuntimePart('citadel-upper-drum', upperFacadeDetails, 'landmark-detail'),
    registerIsland12RuntimePart('citadel-monumental-entrance', entrance, 'landmark-detail'),
    registerIsland12RuntimePart('citadel-forecourt-life', forecourtLife, 'landmark-life'),
  ] };
  return root;
}

export function buildIsland12SunkenSandsLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island12SunkenSandsMaterials,
) {
  const resolvedLevel = Math.max(1, level) as 1 | 2 | 3;
  const architecture = definition.id === 'hatchery'
    ? createScarabEggVault(resolvedLevel, quality, materials)
    : definition.id === 'habit'
      ? createSunweavePavilion(resolvedLevel, quality, materials)
      : definition.id === 'wisdom'
        ? createSapphireArchive(resolvedLevel, quality, materials)
        : definition.id === 'event'
          ? createMirageEchoCourt(resolvedLevel, quality, materials)
          : createOasisCrownCitadel(resolvedLevel, quality, materials);
  architecture.position.set(...definition.position);
  if (definition.id !== 'boss') {
    const satelliteScale = resolvedLevel === 3 ? 1.14 : resolvedLevel === 2 ? 1.09 : 1.04;
    architecture.scale.setScalar(satelliteScale);
  }
  architecture.userData.landmarkId = definition.id;
  architecture.userData.buildLevel = level;
  architecture.userData.sculptRuntime = {
    ...(architecture.userData.sculptRuntime ?? {}),
    sockets: { focus: `ISLAND_12_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
    colliders: [{ id: `island-012-${definition.id}`, type: 'cylinder', isTrigger: true }],
  };
  if (level === 0) architecture.visible = false;
  return architecture;
}

function addTerrainShelf(root: THREE.Group, x: number, z: number, radius: number, depth: number, materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const shelf = cylinder(radius * 0.88, radius, depth, materials.sandstoneShadow, radialSegments(quality));
  shelf.position.set(x, -depth * 0.5 + 0.2, z);
  const cap = cylinder(radius, radius * 0.92, 0.2, materials.sand, radialSegments(quality));
  cap.position.set(x, 0.18, z);
  root.add(shelf, cap);
}

function addInterlockingTerrainMasses(root: THREE.Group, materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const masses = [
    [-2.1, -0.2, 1.35, 0.9, 0.62, -0.15], [2.05, 0.25, 1.32, 0.88, 0.58, 0.2],
    [-0.25, -2.02, 0.92, 1.34, 0.66, 0.08], [0.28, 2.02, 0.9, 1.3, 0.6, -0.08],
    [-1.75, -1.5, 1.05, 0.78, 0.56, 0.42], [1.72, -1.54, 1.04, 0.76, 0.58, -0.42],
    [-1.7, 1.55, 1.02, 0.76, 0.58, -0.38], [1.74, 1.5, 1.06, 0.8, 0.56, 0.38],
    [-4.18, -2.46, 1.44, 0.62, 0.52, -0.72], [-5.78, -2.05, 1.12, 0.74, 0.6, 0.22],
    [-5.86, -3.72, 1.22, 0.68, 0.58, -0.36], [-4.26, -3.7, 1.18, 0.68, 0.54, 0.48],
    [-4.18, 2.46, 1.42, 0.62, 0.54, 0.72], [-5.82, 2.06, 1.16, 0.72, 0.58, -0.24],
    [-5.88, 3.74, 1.22, 0.68, 0.56, 0.34], [-4.28, 3.7, 1.2, 0.7, 0.54, -0.48],
    [4.18, -2.46, 1.44, 0.62, 0.54, 0.72], [5.82, -2.02, 1.16, 0.74, 0.58, -0.22],
    [5.88, -3.74, 1.22, 0.68, 0.56, 0.34], [4.26, -3.7, 1.2, 0.7, 0.54, -0.48],
    [4.18, 2.46, 1.42, 0.62, 0.52, -0.72], [5.82, 2.06, 1.16, 0.72, 0.6, 0.24],
    [5.88, 3.74, 1.22, 0.68, 0.58, -0.34], [4.26, 3.7, 1.18, 0.68, 0.54, 0.48],
  ] as const;
  const count = Math.max(12, Math.round(masses.length * detailScale(quality)));
  const segments = radialSegments(quality);
  const bodyGeometry = new THREE.CylinderGeometry(1, 0.92, 1, segments);
  const capGeometry = new THREE.CylinderGeometry(1, 0.96, 0.16, segments);
  const bodies = new THREE.InstancedMesh(bodyGeometry, materials.sandstoneShadow, count);
  const caps = new THREE.InstancedMesh(capGeometry, materials.sand, count);
  bodies.name = 'ISLAND_12_ERODED_BANK_BODIES';
  caps.name = 'ISLAND_12_ERODED_BANK_CAPS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const [x, z, radiusX, radiusZ, depth, rotation] = masses[index];
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -depth * 0.5 + 0.14, z), quaternion, scale.set(radiusX, depth, radiusZ));
    bodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.13, z), quaternion, scale.set(radiusX, 1, radiusZ));
    caps.setMatrixAt(index, matrix);
  }
  bodies.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  bodies.castShadow = quality !== 'low';
  caps.receiveShadow = quality !== 'low';
  root.add(bodies, caps);
}

function createDrySurfaceIntegration(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_DRY_SURFACE_INTEGRATION';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  const driftPlacements = [
    [-6.05, -2.7, 0.82, 0.38, -0.32], [-4.72, -5.35, 0.74, 0.32, 0.18],
    [6.02, -2.62, 0.88, 0.36, 0.28], [4.8, -5.28, 0.76, 0.34, -0.2],
    [-6.12, 2.78, 0.84, 0.34, 0.24], [-4.6, 5.42, 0.72, 0.3, -0.26],
    [6.08, 2.68, 0.86, 0.38, -0.22], [4.62, 5.5, 0.78, 0.31, 0.2],
    [-3.8, 7.02, 0.92, 0.38, 0.16], [3.82, 7.04, 0.9, 0.36, -0.16],
    [-2.25, 9.08, 0.78, 0.3, -0.12], [2.28, 9.12, 0.8, 0.32, 0.12],
  ] as const;
  const driftCount = quality === 'low' ? 6 : quality === 'medium' ? 9 : driftPlacements.length;
  const driftGeometry = new THREE.SphereGeometry(1, quality === 'high' ? 12 : 8, 5);
  const drifts = new THREE.InstancedMesh(driftGeometry, materials.sand, driftCount);
  drifts.name = 'ISLAND_12_LEEWARD_SAND_DRIFT_ARRAY';
  driftPlacements.slice(0, driftCount).forEach(([x, z, radiusX, radiusZ, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.29 + index % 3 * 0.012, z), quaternion, scale.set(radiusX, 0.055, radiusZ));
    drifts.setMatrixAt(index, matrix);
  });
  drifts.instanceMatrix.needsUpdate = true;
  drifts.receiveShadow = quality !== 'low';

  const rippleMaterial = materials.sand.clone();
  rippleMaterial.name = 'ISLAND_12_WIND_RIPPLE_HIGHLIGHT';
  rippleMaterial.color.setHex(0xf1cf91);
  rippleMaterial.bumpScale = 0.028;
  const rippleCount = quality === 'low' ? 12 : quality === 'medium' ? 22 : 34;
  const ripples = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.014, 0.045), rippleMaterial, rippleCount);
  ripples.name = 'ISLAND_12_WIND_RIPPLE_ARRAY';
  for (let index = 0; index < rippleCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2) % 6;
    const band = Math.floor(index / 12);
    const x = side * (4.45 + lane * 0.32 + band * 0.14);
    const z = 5.55 + band * 1.08 + Math.sin(index * 0.86) * 0.16;
    quaternion.setFromEuler(new THREE.Euler(0, side * 0.2 + Math.sin(index * 0.41) * 0.07, 0));
    matrix.compose(position.set(x, 0.325, z), quaternion, scale.set(0.42 + index % 4 * 0.06, 1, 1));
    ripples.setMatrixAt(index, matrix);
  }
  ripples.instanceMatrix.needsUpdate = true;

  const seamCount = quality === 'low' ? 10 : quality === 'medium' ? 16 : 22;
  const cliffSeams = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.055, 0.035), materials.sandstoneWorn, seamCount);
  cliffSeams.name = 'ISLAND_12_ERODED_CLIFF_SEAM_ARRAY';
  for (let index = 0; index < seamCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const x = side * (3.35 + row % 5 * 0.72);
    const z = 7.92 + Math.floor(row / 5) * 0.58;
    quaternion.setFromEuler(new THREE.Euler(0, side * (0.08 + row % 3 * 0.06), 0));
    matrix.compose(position.set(x, 0.06 + row % 2 * 0.035, z), quaternion, scale.set(0.8 + row % 3 * 0.12, 1, 1));
    cliffSeams.setMatrixAt(index, matrix);
  }
  cliffSeams.instanceMatrix.needsUpdate = true;

  const traceMaterial = materials.sand.clone();
  traceMaterial.name = 'ISLAND_12_COMPACTED_SAND_TRACE';
  traceMaterial.color.setHex(0xb47d48);
  traceMaterial.bumpScale = 0.018;
  const footprintCount = quality === 'low' ? 8 : quality === 'medium' ? 14 : 20;
  const footprintGeometry = new THREE.SphereGeometry(0.09, 8, 4);
  const footprints = new THREE.InstancedMesh(footprintGeometry, traceMaterial, footprintCount);
  footprints.name = 'ISLAND_12_MARKET_FOOTPRINT_TRACE_ARRAY';
  for (let index = 0; index < footprintCount; index += 1) {
    const pathSide = index < footprintCount / 2 ? -1 : 1;
    const localIndex = index % Math.ceil(footprintCount / 2);
    const x = pathSide * (2.85 + localIndex * 0.18 + Math.sin(localIndex * 0.9) * 0.08);
    const z = 8.12 + Math.sin(localIndex * 0.72) * 0.22;
    quaternion.setFromEuler(new THREE.Euler(0, pathSide * 0.12 + Math.sin(index * 0.55) * 0.08, 0));
    matrix.compose(position.set(x, 0.365, z), quaternion, scale.set(0.6, 0.12, 1));
    footprints.setMatrixAt(index, matrix);
  }
  footprints.instanceMatrix.needsUpdate = true;

  const compactedPatchPlacements = [
    [-4.12, 5.48, 0.72, 0.38, -0.16], [4.08, 5.52, 0.68, 0.36, 0.14],
    [-3.72, 6.42, 0.56, 0.32, 0.1], [3.76, 6.44, 0.58, 0.34, -0.12],
    [-2.52, 8.08, 0.66, 0.34, -0.08], [2.56, 8.12, 0.62, 0.33, 0.08],
    [-1.84, 9.34, 0.52, 0.28, 0.06], [1.88, 9.38, 0.54, 0.3, -0.06],
  ] as const;
  const compactedPatchCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : compactedPatchPlacements.length;
  const compactedPatches = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 10),
    traceMaterial,
    compactedPatchCount,
  );
  compactedPatches.name = 'ISLAND_12_COMPACTED_MARKET_SAND_PATCH_ARRAY';
  compactedPatchPlacements.slice(0, compactedPatchCount).forEach(([x, z, radiusX, radiusZ, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rotation));
    matrix.compose(position.set(x, 0.337 + index % 2 * 0.004, z), quaternion, scale.set(radiusX, radiusZ, 1));
    compactedPatches.setMatrixAt(index, matrix);
  });
  compactedPatches.instanceMatrix.needsUpdate = true;

  const rutRows = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8;
  const cartRuts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.014, 0.38), traceMaterial, rutRows * 2);
  cartRuts.name = 'ISLAND_12_CARAVAN_CART_RUT_ARRAY';
  for (let row = 0; row < rutRows; row += 1) {
    [-1, 1].forEach((rail, railIndex) => {
      const index = row * 2 + railIndex;
      const x = -3.62 + rail * 0.19 + Math.sin(row * 0.6) * 0.04;
      const z = 7.45 + row * 0.34;
      quaternion.setFromEuler(new THREE.Euler(0, -0.12 + Math.sin(row * 0.44) * 0.035, 0));
      matrix.compose(position.set(x, 0.345, z), quaternion, scale.set(1, 1, 1));
      cartRuts.setMatrixAt(index, matrix);
    });
  }
  cartRuts.instanceMatrix.needsUpdate = true;

  root.add(drifts, ripples, cliffSeams, footprints, compactedPatches, cartRuts);
  root.userData.sculptRuntime = {
    parts: [registerIsland12RuntimePart('terrain-network', root, 'dry-surface-integration')],
  };
  return root;
}

function createDesertGrassTuftGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
    const angle = bladeIndex / 3 * Math.PI * 2;
    const sideX = Math.cos(angle + Math.PI / 2) * 0.055;
    const sideZ = Math.sin(angle + Math.PI / 2) * 0.055;
    const tipX = Math.cos(angle) * 0.07;
    const tipZ = Math.sin(angle) * 0.07;
    const base = vertices.length / 3;
    vertices.push(-sideX, 0, -sideZ, sideX, 0, sideZ, tipX, 0.34 + bladeIndex * 0.04, tipZ);
    indices.push(base, base + 1, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createOasisGroundRosetteGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let leafIndex = 0; leafIndex < 6; leafIndex += 1) {
    const angle = leafIndex / 6 * Math.PI * 2;
    const tangentX = Math.cos(angle + Math.PI / 2) * 0.045;
    const tangentZ = Math.sin(angle + Math.PI / 2) * 0.045;
    const tipRadius = 0.22 + leafIndex % 2 * 0.045;
    const base = vertices.length / 3;
    vertices.push(
      -tangentX, 0.015, -tangentZ,
      tangentX, 0.015, tangentZ,
      Math.cos(angle) * tipRadius, 0.08 + leafIndex % 3 * 0.025, Math.sin(angle) * tipRadius,
    );
    indices.push(base, base + 1, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTerrainSurfaceLife(
  materials: Island12SunkenSandsMaterials,
  quality: Island3DQuality,
  level: BuildLevel,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_TERRAIN_SURFACE_LIFE';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  const tonguePlacements = [
    [-6.18, -1.34, 1.02, 0.34, -0.28], [6.16, -1.28, 1.08, 0.36, 0.26],
    [-5.72, 1.08, 0.86, 0.3, 0.18], [5.74, 1.16, 0.9, 0.32, -0.2],
    [-5.08, 5.82, 1.08, 0.36, -0.16], [5.12, 5.86, 1.06, 0.35, 0.18],
    [-3.28, 7.62, 0.92, 0.3, 0.12], [3.3, 7.68, 0.96, 0.31, -0.12],
    [-1.92, 9.38, 0.78, 0.26, -0.08], [1.96, 9.42, 0.8, 0.27, 0.08],
    [-5.92, -4.78, 0.9, 0.3, 0.24], [5.94, -4.74, 0.92, 0.31, -0.24],
  ] as const;
  const tongueCount = quality === 'low' ? 6 : quality === 'medium' ? 9 : tonguePlacements.length;
  const duneTongues = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    materials.sand,
    tongueCount,
  );
  duneTongues.name = 'ISLAND_12_WINDSWEPT_DUNE_TONGUE_ARRAY';
  tonguePlacements.slice(0, tongueCount).forEach(([x, z, length, width, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(
      position.set(x, 0.31 + index % 3 * 0.012, z),
      quaternion,
      scale.set(length, 0.045 + index % 2 * 0.012, width),
    );
    duneTongues.setMatrixAt(index, matrix);
  });
  duneTongues.instanceMatrix.needsUpdate = true;
  duneTongues.receiveShadow = quality !== 'low';

  const patinaMaterial = materials.sand.clone();
  patinaMaterial.name = 'ISLAND_12_GROUND_PATINA_MATERIAL';
  patinaMaterial.color.setHex(0xc99555);
  patinaMaterial.bumpScale = 0.075;
  patinaMaterial.roughness = 1;
  const patinaPlacements = [
    [-5.68, -1.18, 0.92, 0.5, -0.2], [5.66, -1.14, 0.96, 0.52, 0.18],
    [-5.74, 1.74, 0.82, 0.46, 0.16], [5.72, 1.78, 0.86, 0.48, -0.14],
    [-4.78, 5.32, 1.02, 0.56, -0.12], [4.82, 5.36, 1.0, 0.54, 0.12],
    [-3.34, 7.18, 0.9, 0.48, 0.08], [3.38, 7.22, 0.94, 0.5, -0.08],
    [-2.1, 9.12, 0.78, 0.42, -0.06], [2.14, 9.16, 0.8, 0.44, 0.06],
  ] as const;
  const patinaCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : patinaPlacements.length;
  const patinaPatches = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 12),
    patinaMaterial,
    patinaCount,
  );
  patinaPatches.name = 'ISLAND_12_GROUND_PATINA_PATCH_ARRAY';
  patinaPlacements.slice(0, patinaCount).forEach(([x, z, radiusX, radiusZ, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rotation));
    matrix.compose(position.set(x, 0.341 + index % 2 * 0.004, z), quaternion, scale.set(radiusX, radiusZ, 1));
    patinaPatches.setMatrixAt(index, matrix);
  });
  patinaPatches.instanceMatrix.needsUpdate = true;

  const dampPlacements = [
    [-6.35, 5.62, 0.72, 0.28, 0.18], [6.34, 5.64, 0.74, 0.29, -0.18],
    [-5.18, 7.12, 0.66, 0.24, -0.14], [5.2, 7.14, 0.68, 0.25, 0.14],
    [-3.68, 8.38, 0.58, 0.22, 0.1], [3.7, 8.4, 0.6, 0.23, -0.1],
    [-2.18, 9.52, 0.54, 0.2, -0.08], [2.2, 9.54, 0.56, 0.21, 0.08],
    [-6.62, -3.64, 0.62, 0.23, -0.16], [6.64, -3.62, 0.64, 0.24, 0.16],
  ] as const;
  const dampCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : dampPlacements.length;
  const dampMargins = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    materials.sandstoneWet,
    dampCount,
  );
  dampMargins.name = 'ISLAND_12_DAMP_SHORE_MARGIN_ARRAY';
  dampPlacements.slice(0, dampCount).forEach(([x, z, length, width, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.285, z), quaternion, scale.set(length, 0.028, width));
    dampMargins.setMatrixAt(index, matrix);
  });
  dampMargins.instanceMatrix.needsUpdate = true;

  const pebbleCount = quality === 'low' ? 10 : quality === 'medium' ? 18 : 24;
  const pebbles = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.09, 0),
    materials.sandstoneWorn,
    pebbleCount,
  );
  pebbles.name = 'ISLAND_12_DRY_PEBBLE_FIELD_ARRAY';
  for (let index = 0; index < pebbleCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const fieldIndex = Math.floor(index / 2);
    const x = side * (4.68 + fieldIndex % 4 * 0.48 + Math.sin(index * 1.7) * 0.09);
    const z = -4.92 + Math.floor(fieldIndex / 4) * 2.62 + Math.cos(index * 0.83) * 0.25;
    quaternion.setFromEuler(new THREE.Euler(index * 0.19, index * 0.73, index * 0.11));
    matrix.compose(
      position.set(x, 0.38, z),
      quaternion,
      scale.set(0.62 + index % 3 * 0.18, 0.34 + index % 2 * 0.12, 0.74 + index % 4 * 0.1),
    );
    pebbles.setMatrixAt(index, matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.castShadow = false;

  const grassMaterial = materials.palmLeaf.clone();
  grassMaterial.name = 'ISLAND_12_DRY_DESERT_GRASS_MATERIAL';
  grassMaterial.color.setHex(0x9d8b43);
  grassMaterial.roughness = 1;
  const grassQualityCount = quality === 'low' ? 12 : quality === 'medium' ? 20 : 30;
  const grassLevelScale = level === 0 ? 0 : level === 1 ? 0.4 : level === 2 ? 0.72 : 1;
  const grassCount = Math.round(grassQualityCount * grassLevelScale);
  const grasses = new THREE.InstancedMesh(
    createDesertGrassTuftGeometry(),
    grassMaterial,
    Math.max(1, grassCount),
  );
  grasses.name = 'ISLAND_12_SPARSE_DESERT_GRASS_ARRAY';
  grasses.visible = grassCount > 0;
  for (let index = 0; index < grassCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const localIndex = Math.floor(index / 2);
    const foreground = localIndex >= 6;
    const x = side * (4.5 + localIndex % 4 * 0.62 + Math.sin(index * 1.11) * 0.08);
    const z = foreground
      ? 5.65 + (localIndex - 6) * 0.72 + Math.cos(index * 0.74) * 0.16
      : -5.28 + localIndex * 1.48 + Math.sin(index * 0.62) * 0.14;
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.92, side * (0.05 + index % 3 * 0.035)));
    matrix.compose(
      position.set(x, 0.49, z),
      quaternion,
      scale.set(0.72 + index % 3 * 0.14, 0.68 + index % 4 * 0.1, 0.72 + index % 2 * 0.12),
    );
    grasses.setMatrixAt(index, matrix);
  }
  grasses.instanceMatrix.needsUpdate = true;

  const cobbleClusterAnchors = [
    [-4.82, -2.72], [4.86, -2.76], [-5.24, 2.94], [5.28, 2.98],
    [-4.24, 5.82], [4.28, 5.86], [-2.42, 7.62], [2.46, 7.66],
  ] as const;
  const cobblesPerCluster = quality === 'low' ? 2 : quality === 'medium' ? 4 : 5;
  const visibleCobbleClusterCount = level === 0 ? 0 : level === 1 ? 2 : level === 2 ? 5 : cobbleClusterAnchors.length;
  const cobbleCount = visibleCobbleClusterCount * cobblesPerCluster;
  const cobbleMaterial = materials.sandstoneWorn.clone();
  cobbleMaterial.name = 'ISLAND_12_CIVIC_COBBLE_MATERIAL';
  cobbleMaterial.color.setHex(0xffffff);
  cobbleMaterial.roughness = 0.96;
  const civicCobbles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.15, 0.045, 5),
    cobbleMaterial,
    Math.max(1, cobbleCount),
  );
  civicCobbles.name = 'ISLAND_12_CIVIC_COBBLE_POCKET_ARRAY';
  civicCobbles.visible = cobbleCount > 0;
  let cobbleIndex = 0;
  cobbleClusterAnchors.slice(0, visibleCobbleClusterCount).forEach(([anchorX, anchorZ], clusterIndex) => {
    for (let stoneIndex = 0; stoneIndex < cobblesPerCluster; stoneIndex += 1) {
      const angle = stoneIndex / cobblesPerCluster * Math.PI * 2 + clusterIndex * 0.41;
      const radius = 0.2 + stoneIndex % 2 * 0.11;
      const x = anchorX + Math.cos(angle) * radius;
      const z = anchorZ + Math.sin(angle) * radius * 0.74;
      quaternion.setFromEuler(new THREE.Euler(0, angle + stoneIndex * 0.23, 0));
      matrix.compose(
        position.set(x, 0.365 + stoneIndex % 2 * 0.008, z),
        quaternion,
        scale.set(0.82 + stoneIndex % 3 * 0.12, 0.62 + stoneIndex % 2 * 0.12, 0.9 + clusterIndex % 3 * 0.08),
      );
      civicCobbles.setMatrixAt(cobbleIndex, matrix);
      civicCobbles.setColorAt(
        cobbleIndex,
        new THREE.Color((clusterIndex + stoneIndex) % 3 === 0 ? 0xd6b77b : (clusterIndex + stoneIndex) % 3 === 1 ? 0xb88d57 : 0xe0c38a),
      );
      cobbleIndex += 1;
    }
  });
  civicCobbles.instanceMatrix.needsUpdate = true;
  if (civicCobbles.instanceColor) civicCobbles.instanceColor.needsUpdate = true;
  civicCobbles.receiveShadow = quality !== 'low';

  const rosetteQualityCount = quality === 'low' ? 10 : quality === 'medium' ? 16 : 24;
  const rosetteLevelScale = level === 0 ? 0 : level === 1 ? 0.36 : level === 2 ? 0.68 : 1;
  const rosetteCount = Math.round(rosetteQualityCount * rosetteLevelScale);
  const rosetteMaterial = materials.palmLeaf.clone();
  rosetteMaterial.name = 'ISLAND_12_OASIS_GROUND_ROSETTE_MATERIAL';
  rosetteMaterial.color.setHex(0xffffff);
  rosetteMaterial.roughness = 0.94;
  const groundRosettes = new THREE.InstancedMesh(
    createOasisGroundRosetteGeometry(),
    rosetteMaterial,
    Math.max(1, rosetteCount),
  );
  groundRosettes.name = 'ISLAND_12_OASIS_GROUND_ROSETTE_ARRAY';
  groundRosettes.visible = rosetteCount > 0;
  for (let index = 0; index < rosetteCount; index += 1) {
    const [anchorX, anchorZ] = cobbleClusterAnchors[index % cobbleClusterAnchors.length];
    const ring = Math.floor(index / cobbleClusterAnchors.length);
    const angle = index * 2.399963 + ring * 0.31;
    const radius = 0.48 + ring * 0.17;
    quaternion.setFromEuler(new THREE.Euler(0, angle, (index % 3 - 1) * 0.05));
    matrix.compose(
      position.set(anchorX + Math.cos(angle) * radius, 0.405, anchorZ + Math.sin(angle) * radius * 0.78),
      quaternion,
      scale.set(0.72 + index % 4 * 0.11, 0.8 + index % 3 * 0.1, 0.72 + index % 2 * 0.12),
    );
    groundRosettes.setMatrixAt(index, matrix);
    groundRosettes.setColorAt(
      index,
      new THREE.Color(index % 4 === 0 ? 0x4f793e : index % 4 === 1 ? 0x758c42 : index % 4 === 2 ? 0x9b9142 : 0x3e6f42),
    );
  }
  groundRosettes.instanceMatrix.needsUpdate = true;
  if (groundRosettes.instanceColor) groundRosettes.instanceColor.needsUpdate = true;

  const bloomQualityCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : cobbleClusterAnchors.length;
  const bloomCount = level === 0 ? 0 : Math.max(2, Math.round(bloomQualityCount * (level === 1 ? 0.3 : level === 2 ? 0.64 : 1)));
  const bloomMaterial = materials.coral.clone();
  bloomMaterial.name = 'ISLAND_12_OASIS_GROUND_BLOOM_MATERIAL';
  bloomMaterial.color.setHex(0xffffff);
  const groundBlooms = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.052, 0),
    bloomMaterial,
    Math.max(1, bloomCount),
  );
  groundBlooms.name = 'ISLAND_12_OASIS_GROUND_BLOOM_ARRAY';
  groundBlooms.visible = bloomCount > 0;
  for (let index = 0; index < bloomCount; index += 1) {
    const [anchorX, anchorZ] = cobbleClusterAnchors[index];
    const angle = index * 2.399963;
    quaternion.setFromEuler(new THREE.Euler(0, angle, index % 2 ? 0.12 : -0.1));
    matrix.compose(
      position.set(anchorX + Math.cos(angle) * 0.5, 0.54, anchorZ + Math.sin(angle) * 0.39),
      quaternion,
      scale.set(index % 3 === 0 ? 1.18 : 0.94, 1.15 + index % 2 * 0.16, index % 3 === 0 ? 1.18 : 0.94),
    );
    groundBlooms.setMatrixAt(index, matrix);
    groundBlooms.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xdc7559 : index % 3 === 1 ? 0x7dd1bc : 0xe3ac63));
  }
  groundBlooms.instanceMatrix.needsUpdate = true;
  if (groundBlooms.instanceColor) groundBlooms.instanceColor.needsUpdate = true;

  root.add(duneTongues, patinaPatches, dampMargins, pebbles, grasses, civicCobbles, groundRosettes, groundBlooms);
  root.userData.sculptRuntime = {
    parts: [registerIsland12RuntimePart('terrain-network', root, 'terrain-surface-life')],
  };
  return root;
}

function createSandstoneSurfaceLanguage(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_SANDSTONE_SURFACE_LANGUAGE';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  const curbRows = quality === 'low' ? 5 : quality === 'medium' ? 7 : 9;
  const curbCount = curbRows * 2;
  const curbGeometry = new THREE.BoxGeometry(0.14, 0.065, 0.42);
  const sunlitCurbs = new THREE.InstancedMesh(curbGeometry, materials.sandstoneLight, curbCount);
  const wetToes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.025, 0.44), materials.sandstoneWet, curbCount);
  sunlitCurbs.name = 'ISLAND_12_CARVED_CANAL_CURB_ARRAY';
  wetToes.name = 'ISLAND_12_WET_CANAL_TOE_ARRAY';
  for (let row = 0; row < curbRows; row += 1) {
    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const index = row * 2 + sideIndex;
      const z = 4.55 + row * 0.48;
      const x = side * (0.5 + Math.sin(row * 0.72) * 0.025);
      quaternion.setFromEuler(new THREE.Euler(0, side * Math.sin(row * 0.4) * 0.04, 0));
      matrix.compose(position.set(x, 0.31, z), quaternion, scale.set(1, 1, 1));
      sunlitCurbs.setMatrixAt(index, matrix);
      matrix.compose(position.set(x - side * 0.09, 0.265, z), quaternion, scale.set(1, 1, 1));
      wetToes.setMatrixAt(index, matrix);
    }
  }
  sunlitCurbs.instanceMatrix.needsUpdate = true;
  wetToes.instanceMatrix.needsUpdate = true;
  sunlitCurbs.receiveShadow = quality !== 'low';

  const seamPlacements = [
    [-5.85, -4.68, 0.1], [-4.72, -5.28, -0.12], [5.85, -4.68, -0.1], [4.72, -5.28, 0.12],
    [-6.12, 4.55, -0.16], [-4.85, 5.36, 0.12], [6.12, 4.55, 0.16], [4.85, 5.36, -0.12],
    [-5.35, 6.65, 0.18], [-3.92, 7.35, -0.1], [5.35, 6.65, -0.18], [3.92, 7.35, 0.1],
    [-4.65, 8.42, -0.12], [-2.92, 9.2, 0.08], [4.65, 8.42, 0.12], [2.92, 9.2, -0.08],
  ] as const;
  const seamCount = quality === 'low' ? 8 : quality === 'medium' ? 12 : seamPlacements.length;
  const blockSeams = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.022, 0.055), materials.sandstoneShadow, seamCount);
  blockSeams.name = 'ISLAND_12_TERRACE_BLOCK_SEAM_ARRAY';
  seamPlacements.slice(0, seamCount).forEach(([x, z, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.335 + index % 3 * 0.008, z), quaternion, scale.set(0.84 + index % 4 * 0.1, 1, 1));
    blockSeams.setMatrixAt(index, matrix);
  });
  blockSeams.instanceMatrix.needsUpdate = true;

  root.add(sunlitCurbs, wetToes, blockSeams);
  root.userData.sculptRuntime = {
    parts: [registerIsland12RuntimePart('terrain-network', root, 'sandstone-surface-language')],
  };
  return root;
}

function createProductionOasisCityBase(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_PRODUCTION_OASIS_CITY_BASE';
  const districts = [
    [-3.55, -1.72, 2.18, 1.28, -0.24], [3.55, -1.72, 2.18, 1.28, 0.24],
    [-3.58, 1.72, 2.22, 1.3, 0.24], [3.58, 1.72, 2.22, 1.3, -0.24],
    [-2.35, -3.92, 1.86, 1.24, 0.18], [2.35, -3.92, 1.86, 1.24, -0.18],
    [-2.62, 3.92, 1.92, 1.34, -0.14], [2.62, 3.92, 1.92, 1.34, 0.14],
    [-4.82, 0, 1.72, 1.42, 0.08], [4.82, 0, 1.72, 1.42, -0.08],
    [-5.72, -4.88, 1.84, 1.26, -0.26], [5.72, -4.88, 1.84, 1.26, 0.26],
    [-5.72, 4.82, 1.9, 1.3, 0.24], [5.72, 4.82, 1.9, 1.3, -0.24],
    [-4.25, 5.72, 1.76, 1.18, -0.18], [4.25, 5.72, 1.76, 1.18, 0.18],
    [-2.45, 5.48, 1.7, 1.28, 0.12], [2.45, 5.48, 1.7, 1.28, -0.12],
    [-3.58, 7.02, 1.78, 1.18, 0.18], [3.58, 7.02, 1.78, 1.18, -0.18],
    [-5.48, 6.72, 1.58, 1.06, -0.22], [5.48, 6.72, 1.58, 1.06, 0.22],
    [-1.95, 7.38, 1.48, 1.02, -0.08], [1.95, 7.38, 1.48, 1.02, 0.08],
    [-3.42, 8.45, 2.28, 1.5, -0.12], [3.42, 8.45, 2.28, 1.5, 0.12],
    [-5.35, 9.25, 1.92, 1.34, 0.2], [5.35, 9.25, 1.92, 1.34, -0.2],
    [-2.35, 10.18, 1.82, 1.4, 0.1], [2.35, 10.18, 1.82, 1.4, -0.1],
  ] as const;
  const count = quality === 'low' ? 16 : quality === 'medium' ? 24 : districts.length;
  const terraceFootprint = new THREE.Shape();
  terraceFootprint.moveTo(-1, -0.38);
  terraceFootprint.lineTo(-0.76, -0.88);
  terraceFootprint.lineTo(-0.16, -1);
  terraceFootprint.lineTo(0.64, -0.86);
  terraceFootprint.lineTo(1, -0.28);
  terraceFootprint.lineTo(0.84, 0.58);
  terraceFootprint.lineTo(0.28, 1);
  terraceFootprint.lineTo(-0.58, 0.86);
  terraceFootprint.lineTo(-1, 0.32);
  terraceFootprint.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(terraceFootprint, {
    depth: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.045,
    bevelThickness: 0.045,
  });
  const capGeometry = new THREE.ExtrudeGeometry(terraceFootprint, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  bodyGeometry.rotateX(Math.PI / 2);
  capGeometry.rotateX(Math.PI / 2);
  const bodies = new THREE.InstancedMesh(bodyGeometry, materials.sandstoneShadow, count);
  const aprons = new THREE.InstancedMesh(capGeometry, materials.sandstoneLight, count);
  const caps = new THREE.InstancedMesh(capGeometry, materials.sandstoneWorn, count);
  bodies.name = 'ISLAND_12_PRODUCTION_DISTRICT_BODY_ARRAY';
  aprons.name = 'ISLAND_12_PRODUCTION_DISTRICT_APRON_ARRAY';
  caps.name = 'ISLAND_12_PRODUCTION_DISTRICT_CAP_ARRAY';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const [x, z, radiusX, radiusZ, rotation] = districts[index];
    const depth = 0.58 + index % 3 * 0.07;
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.1, z), quaternion, scale.set(radiusX, depth, radiusZ));
    bodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.19 + index % 3 * 0.02, z), quaternion, scale.set(radiusX * 1.015, 1, radiusZ * 1.015));
    aprons.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.24 + index % 3 * 0.035, z), quaternion, scale.set(radiusX * 0.98, 1, radiusZ * 0.98));
    caps.setMatrixAt(index, matrix);
    bodies.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0xf4d0a4 : index % 3 === 1 ? 0xffe2bd : 0xe7bf98));
    caps.setColorAt(index, new THREE.Color(index % 4 === 0 ? 0xffe0a8 : index % 4 === 1 ? 0xf1c891 : 0xffd5a0));
  }
  bodies.instanceMatrix.needsUpdate = true;
  aprons.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  bodies.castShadow = quality !== 'low';
  caps.receiveShadow = quality !== 'low';

  const houseCandidates = [
    [-6.75, -4.25, 0.15], [-5.85, -5.55, -0.25], [-4.7, -5.7, 0.2],
    [6.75, -4.25, -0.15], [5.85, -5.55, 0.25], [4.7, -5.7, -0.2],
    [-6.7, 4.35, -0.18], [-5.7, 5.55, 0.24], [-4.55, 6.18, -0.16],
    [6.7, 4.35, 0.18], [5.7, 5.55, -0.24], [4.55, 6.18, 0.16],
    [-3.45, 7.18, 0.18], [-2.35, 6.45, -0.18], [3.45, 7.18, -0.18], [2.35, 6.45, 0.18],
    [-5.15, 8.75, -0.14], [-3.9, 9.55, 0.2], [-2.45, 9.9, -0.12],
    [5.15, 8.75, 0.14], [3.9, 9.55, -0.2], [2.45, 9.9, 0.12],
  ] as const;
  const houseCount = quality === 'low' ? 10 : quality === 'medium' ? 17 : houseCandidates.length;
  const houseBodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.72, 0.62), materials.sandstoneLight, houseCount);
  const houseRoofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.58, 0.42, 4), materials.crimson, houseCount);
  const houseDoors = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.34, 0.04), materials.turquoise, houseCount);
  const domeHouseCount = Math.floor((houseCount + 1) / 3);
  const flatHouseCount = Math.floor(houseCount / 3);
  const houseDomes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.42, quality === 'high' ? 12 : 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.turquoise,
    domeHouseCount,
  );
  const houseFlatRoofs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.43, 0.48, 0.16, 8),
    materials.sandstoneShadow,
    flatHouseCount,
  );
  const parapetGeometry = new THREE.TorusGeometry(0.41, 0.045, 5, quality === 'high' ? 12 : 8);
  parapetGeometry.rotateX(Math.PI / 2);
  const houseParapets = new THREE.InstancedMesh(parapetGeometry, materials.gold, flatHouseCount);
  houseBodies.name = 'ISLAND_12_PRODUCTION_DWELLING_BODY_ARRAY';
  houseRoofs.name = 'ISLAND_12_PRODUCTION_DWELLING_ROOF_ARRAY';
  houseDoors.name = 'ISLAND_12_PRODUCTION_DWELLING_DOOR_ARRAY';
  houseDomes.name = 'ISLAND_12_PRODUCTION_DWELLING_DOME_ARRAY';
  houseFlatRoofs.name = 'ISLAND_12_PRODUCTION_DWELLING_FLAT_ROOF_ARRAY';
  houseParapets.name = 'ISLAND_12_PRODUCTION_DWELLING_PARAPET_ARRAY';
  let domeHouseIndex = 0;
  let flatHouseIndex = 0;
  for (let index = 0; index < houseCount; index += 1) {
    const [x, z, rotation] = houseCandidates[index];
    const heightScale = 0.82 + index % 3 * 0.14;
    const roofType = index % 3;
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, 0.52, z), quaternion, scale.set(1, heightScale, 1));
    houseBodies.setMatrixAt(index, matrix);
    houseBodies.setColorAt(index, new THREE.Color(roofType === 0 ? 0xffe0b3 : roofType === 1 ? 0xf4d0a2 : 0xffedcb));
    matrix.compose(
      position.set(x, 0.96 + heightScale * 0.12, z),
      quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4 + rotation, 0)),
      scale.setScalar(roofType === 0 ? 1 : 0.001),
    );
    houseRoofs.setMatrixAt(index, matrix);
    houseRoofs.setColorAt(index, new THREE.Color(index % 2 === 0 ? 0xffd7cb : 0xe9bcb3));
    if (roofType === 1) {
      matrix.compose(
        position.set(x, 0.91 + heightScale * 0.12, z),
        quaternion.setFromEuler(new THREE.Euler(0, rotation, 0)),
        scale.set(0.92, 0.72 + index % 2 * 0.12, 0.92),
      );
      houseDomes.setMatrixAt(domeHouseIndex++, matrix);
    } else if (roofType === 2) {
      matrix.compose(position.set(x, 0.91 + heightScale * 0.12, z), quaternion, scale.set(1, 1, 1));
      houseFlatRoofs.setMatrixAt(flatHouseIndex, matrix);
      matrix.compose(position.set(x, 1.01 + heightScale * 0.12, z), quaternion, scale.set(1, 1, 1));
      houseParapets.setMatrixAt(flatHouseIndex, matrix);
      flatHouseIndex += 1;
    }
    const doorX = x + Math.sin(rotation) * 0.33;
    const doorZ = z + Math.cos(rotation) * 0.33;
    matrix.compose(position.set(doorX, 0.5, doorZ), quaternion.setFromEuler(new THREE.Euler(0, rotation, 0)), scale.set(1, 1, 1));
    houseDoors.setMatrixAt(index, matrix);
  }
  houseBodies.instanceMatrix.needsUpdate = true;
  houseRoofs.instanceMatrix.needsUpdate = true;
  houseDoors.instanceMatrix.needsUpdate = true;
  houseDomes.instanceMatrix.needsUpdate = true;
  houseFlatRoofs.instanceMatrix.needsUpdate = true;
  houseParapets.instanceMatrix.needsUpdate = true;
  houseBodies.castShadow = quality !== 'low';
  houseRoofs.castShadow = quality !== 'low';
  houseDomes.castShadow = quality !== 'low';
  houseFlatRoofs.castShadow = quality !== 'low';

  const quaySegments = [
    [-6.92, -3.65, 0.62, 1.62, -0.18], [-6.78, -1.9, 0.54, 1.44, 0.08],
    [-6.92, 2.0, 0.58, 1.52, -0.08], [-6.74, 4.25, 0.66, 1.74, 0.2],
    [6.92, -3.65, 0.62, 1.62, 0.18], [6.78, -1.9, 0.54, 1.44, -0.08],
    [6.92, 2.0, 0.58, 1.52, 0.08], [6.74, 4.25, 0.66, 1.74, -0.2],
    [-5.65, 6.82, 1.5, 0.56, -0.16], [-3.65, 7.72, 1.62, 0.58, 0.12],
    [-1.5, 8.48, 1.38, 0.54, -0.06], [1.5, 8.48, 1.38, 0.54, 0.06],
    [3.65, 7.72, 1.62, 0.58, -0.12], [5.65, 6.82, 1.5, 0.56, 0.16],
    [-5.55, -6.04, 1.42, 0.54, 0.12], [-3.45, -6.45, 1.52, 0.56, -0.08],
    [3.45, -6.45, 1.52, 0.56, 0.08], [5.55, -6.04, 1.42, 0.54, -0.12],
  ] as const;
  const quayCount = quality === 'low' ? 10 : quality === 'medium' ? 14 : quaySegments.length;
  const quayWalls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneWet, quayCount);
  const quayCrests = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneWorn, quayCount);
  const tidelineMaterial = materials.sandstoneLight.clone();
  tidelineMaterial.name = 'ISLAND_12_TIDELINE_SALT_BAND_MATERIAL';
  tidelineMaterial.color.setHex(0xdabf91);
  tidelineMaterial.roughness = 1;
  const tidelineSaltBands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tidelineMaterial, quayCount);
  quayWalls.name = 'ISLAND_12_IRREGULAR_QUAY_WALL_ARRAY';
  quayCrests.name = 'ISLAND_12_IRREGULAR_QUAY_CREST_ARRAY';
  tidelineSaltBands.name = 'ISLAND_12_IRREGULAR_TIDELINE_SALT_BAND_ARRAY';
  for (let index = 0; index < quayCount; index += 1) {
    const [x, z, width, depth, rotation] = quaySegments[index];
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -0.18 - index % 3 * 0.035, z), quaternion, scale.set(width, 0.62 + index % 2 * 0.12, depth));
    quayWalls.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x, -0.47 - index % 3 * 0.01, z),
      quaternion,
      scale.set(width * 1.055, 0.055, depth * 1.055),
    );
    tidelineSaltBands.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.18, z), quaternion, scale.set(width * 1.04, 0.12, depth * 1.04));
    quayCrests.setMatrixAt(index, matrix);
  }
  quayWalls.instanceMatrix.needsUpdate = true;
  quayCrests.instanceMatrix.needsUpdate = true;
  tidelineSaltBands.instanceMatrix.needsUpdate = true;
  quayWalls.castShadow = quality !== 'low';
  quayCrests.receiveShadow = quality !== 'low';
  root.add(
    bodies,
    aprons,
    caps,
    quayWalls,
    tidelineSaltBands,
    quayCrests,
    houseBodies,
    houseRoofs,
    houseDomes,
    houseFlatRoofs,
    houseParapets,
    houseDoors,
  );
  return root;
}

function createWatercourseBankNetwork(materials: Island12SunkenSandsMaterials, quality: Island3DQuality, channelAngles: readonly number[]) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_WATERCOURSE_BANK_NETWORK';
  const bankGeometry = new THREE.BoxGeometry(3.15, 0.12, 0.14);
  const banks = new THREE.InstancedMesh(bankGeometry, materials.sandstoneWet, channelAngles.length * 2);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  channelAngles.forEach((angle, channelIndex) => {
    const perpendicularX = -Math.sin(angle) * 0.3;
    const perpendicularZ = Math.cos(angle) * 0.3;
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(
        position.set(Math.cos(angle) * 3.55 + perpendicularX * side, 0.27, Math.sin(angle) * 3.55 + perpendicularZ * side),
        quaternion,
        scale,
      );
      banks.setMatrixAt(channelIndex * 2 + sideIndex, matrix);
    });
  });
  banks.instanceMatrix.needsUpdate = true;
  banks.receiveShadow = quality !== 'low';
  root.add(banks);
  root.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('watercourse-bank-network', root, 'terrain-water-edge')] };
  return root;
}

function createBrokenShoreBreakerGeometry(segmentCount: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const x = progress - 0.5;
    const taper = Math.sin(progress * Math.PI);
    const wanderingCenter = Math.sin(progress * Math.PI * 3) * 0.018 + taper * 0.028;
    const halfDepth = 0.016 + taper * 0.034;
    vertices.push(x, 0, wanderingCenter - halfDepth, x, 0, wanderingCenter + halfDepth);
    if (index < segmentCount) {
      const base = index * 2;
      indices.push(base, base + 2, base + 3, base, base + 3, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createOasisWaterDetailNetwork(
  materials: Island12SunkenSandsMaterials,
  quality: Island3DQuality,
  channelAngles: readonly number[],
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_OASIS_WATER_DETAIL_NETWORK';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();

  const oasisShallows = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 2.16, radialSegments(quality) * 2),
    materials.waterShallow,
  );
  oasisShallows.name = 'ISLAND_12_OASIS_SHALLOW_RING';
  oasisShallows.rotation.x = -Math.PI / 2;
  oasisShallows.position.y = 0.298;
  const oasisDepth = new THREE.Mesh(
    new THREE.CircleGeometry(1.72, radialSegments(quality) * 2),
    materials.waterDeep,
  );
  oasisDepth.name = 'ISLAND_12_OASIS_DEEP_CENTER';
  oasisDepth.rotation.x = -Math.PI / 2;
  oasisDepth.position.y = 0.294;
  const oasisCaustics = new THREE.Mesh(
    new THREE.CircleGeometry(2.02, radialSegments(quality) * 2),
    materials.waterCaustic,
  );
  oasisCaustics.name = 'ISLAND_12_OASIS_CAUSTIC_FIELD';
  oasisCaustics.rotation.x = -Math.PI / 2;
  oasisCaustics.position.y = 0.309;
  const foregroundCaustics = new THREE.Mesh(
    new THREE.PlaneGeometry(12.5, 10.5),
    materials.waterCaustic,
  );
  foregroundCaustics.name = 'ISLAND_12_FOREGROUND_OASIS_CAUSTIC_FIELD';
  foregroundCaustics.rotation.x = -Math.PI / 2;
  foregroundCaustics.position.set(0, -0.565, 8.4);
  const shallowBedMaterial = materials.sand.clone();
  shallowBedMaterial.name = 'ISLAND_12_FOREGROUND_SHALLOW_BED_MATERIAL';
  shallowBedMaterial.color.setHex(0xbfa66f);
  shallowBedMaterial.roughness = 1;
  const foregroundShallowBed = new THREE.Mesh(
    new THREE.PlaneGeometry(12.5, 10.5),
    shallowBedMaterial,
  );
  foregroundShallowBed.name = 'ISLAND_12_FOREGROUND_SHALLOW_SAND_BED';
  foregroundShallowBed.rotation.x = -Math.PI / 2;
  foregroundShallowBed.position.set(0, -0.78, 8.4);
  foregroundShallowBed.receiveShadow = quality !== 'low';


  const channelDepths = new THREE.InstancedMesh(
    new THREE.BoxGeometry(3.0, 0.018, 0.17),
    materials.waterDeep,
    channelAngles.length,
  );
  const channelCaustics = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.92, 0.012, 0.27),
    materials.waterCaustic,
    channelAngles.length,
  );
  channelDepths.name = 'ISLAND_12_RADIAL_CHANNEL_DEPTH_ARRAY';
  channelCaustics.name = 'ISLAND_12_RADIAL_CHANNEL_CAUSTIC_ARRAY';
  channelAngles.forEach((angle, index) => {
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    matrix.compose(
      position.set(Math.cos(angle) * 3.55, 0.301, Math.sin(angle) * 3.55),
      quaternion,
      scale,
    );
    channelDepths.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(Math.cos(angle) * 3.55, 0.313, Math.sin(angle) * 3.55),
      quaternion,
      scale,
    );
    channelCaustics.setMatrixAt(index, matrix);
  });
  channelDepths.instanceMatrix.needsUpdate = true;
  channelCaustics.instanceMatrix.needsUpdate = true;

  const dropBaseFoam = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.25, 0.035, 4, quality === 'high' ? 12 : 9),
    materials.foam,
    channelAngles.length,
  );
  dropBaseFoam.name = 'ISLAND_12_RADIAL_DROP_BASE_FOAM_ARRAY';
  channelAngles.forEach((angle, index) => {
    quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -angle));
    matrix.compose(
      position.set(Math.cos(angle) * 5.12, -0.545, Math.sin(angle) * 5.12),
      quaternion,
      scale.set(1.35, 0.72, 1),
    );
    dropBaseFoam.setMatrixAt(index, matrix);
  });
  dropBaseFoam.instanceMatrix.needsUpdate = true;

  const foregroundFall = box(0.58, 0.74, 0.055, materials.waterShallow);
  foregroundFall.name = 'ISLAND_12_FOREGROUND_BRIDGE_WATERFALL';
  foregroundFall.position.set(0, -0.13, 8.08);
  const foregroundFallLip = box(0.72, 0.04, 0.13, materials.foam);
  foregroundFallLip.name = 'ISLAND_12_FOREGROUND_BRIDGE_FOAM_LIP';
  foregroundFallLip.position.set(0, 0.245, 8.04);
  const foregroundFallBase = torus(0.29, 0.04, materials.foam, quality === 'high' ? 14 : 10);
  foregroundFallBase.name = 'ISLAND_12_FOREGROUND_BRIDGE_BASE_FOAM';
  foregroundFallBase.rotation.x = Math.PI / 2;
  foregroundFallBase.scale.set(1.45, 0.76, 1);
  foregroundFallBase.position.set(0, -0.535, 8.15);

  const shorelineFoamPlacements = [
    [-5.65, 6.82, 1.5, -0.16], [-3.65, 7.72, 1.62, 0.12],
    [-1.5, 8.48, 1.38, -0.06], [1.5, 8.48, 1.38, 0.06],
    [3.65, 7.72, 1.62, -0.12], [5.65, 6.82, 1.5, 0.16],
  ] as const;
  const shorelineBreakerCount = quality === 'low' ? 4 : shorelineFoamPlacements.length;
  const shorelineBreakers = new THREE.InstancedMesh(
    createBrokenShoreBreakerGeometry(quality === 'high' ? 7 : 5),
    materials.foam,
    shorelineBreakerCount,
  );
  shorelineBreakers.name = 'ISLAND_12_FOREGROUND_ANIMATED_SHORE_BREAKER_ARRAY';
  shorelineBreakers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shorelineBreakers.frustumCulled = false;
  shorelineFoamPlacements.slice(0, shorelineBreakerCount).forEach(([x, z, width, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -0.548, z + 0.3), quaternion, scale.set(width, 1, 1));
    shorelineBreakers.setMatrixAt(index, matrix);
  });
  shorelineBreakers.instanceMatrix.needsUpdate = true;

  const erodedSandLips = new THREE.InstancedMesh(
    createBrokenShoreBreakerGeometry(quality === 'high' ? 7 : 5),
    materials.sand,
    shorelineBreakerCount,
  );
  erodedSandLips.name = 'ISLAND_12_FOREGROUND_ERODED_SAND_LIP_ARRAY';
  shorelineFoamPlacements.slice(0, shorelineBreakerCount).forEach(([x, z, width, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(
      position.set(x, 0.345 + index % 2 * 0.006, z - 0.2),
      quaternion,
      scale.set(width * 1.04, 1, 1.55 + index % 2 * 0.18),
    );
    erodedSandLips.setMatrixAt(index, matrix);
  });
  erodedSandLips.instanceMatrix.needsUpdate = true;
  erodedSandLips.receiveShadow = quality !== 'low';

  const tidelineDebrisCount = quality === 'low' ? 4 : quality === 'medium' ? 8 : 12;
  const tidelineDebrisMaterial = materials.sandstoneWorn.clone();
  tidelineDebrisMaterial.name = 'ISLAND_12_TIDELINE_DEBRIS_MATERIAL';
  tidelineDebrisMaterial.color.setHex(0xffffff);
  const tidelineDebris = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.058, 0),
    tidelineDebrisMaterial,
    tidelineDebrisCount,
  );
  tidelineDebris.name = 'ISLAND_12_FOREGROUND_TIDELINE_DEBRIS_ARRAY';
  for (let index = 0; index < tidelineDebrisCount; index += 1) {
    const placementIndex = index % shorelineBreakerCount;
    const [anchorX, anchorZ, width, rotation] = shorelineFoamPlacements[placementIndex];
    const row = Math.floor(index / shorelineBreakerCount);
    const localOffset = (index % 2 ? 1 : -1) * width * (0.18 + row * 0.1);
    const x = anchorX + Math.cos(rotation) * localOffset;
    const z = anchorZ - 0.28 - Math.sin(rotation) * localOffset - row * 0.07;
    quaternion.setFromEuler(new THREE.Euler(index * 0.31, rotation + index * 0.63, index * 0.17));
    matrix.compose(
      position.set(x, 0.39 + index % 3 * 0.01, z),
      quaternion,
      scale.set(0.7 + index % 3 * 0.14, 0.42 + index % 2 * 0.12, 0.82 + index % 4 * 0.1),
    );
    tidelineDebris.setMatrixAt(index, matrix);
    tidelineDebris.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0x9c7650 : index % 3 === 1 ? 0xd6b77b : 0x6f8b83));
  }
  tidelineDebris.instanceMatrix.needsUpdate = true;
  if (tidelineDebris.instanceColor) tidelineDebris.instanceColor.needsUpdate = true;

  const animateShoreBreakers = (elapsed: number) => {
    shorelineFoamPlacements.slice(0, shorelineBreakerCount).forEach(([x, z, width, rotation], index) => {
      const phase = (elapsed * 0.16 + index * 0.173) % 1;
      const pulse = Math.sin(phase * Math.PI);
      quaternion.setFromEuler(new THREE.Euler(0, rotation + Math.sin(elapsed * 0.21 + index) * 0.012, 0));
      matrix.compose(
        position.set(x, -0.552 + pulse * 0.008, z + 0.24 + phase * 0.2),
        quaternion,
        scale.set(width * (0.9 + pulse * 0.18), 1, 0.82 + pulse * 0.46),
      );
      shorelineBreakers.setMatrixAt(index, matrix);
    });
    shorelineBreakers.instanceMatrix.needsUpdate = true;
  };

  const padPlacements = [
    [-1.82, 9.74, 0.18], [1.96, 9.94, -0.22], [-2.42, 10.62, -0.12],
    [2.56, 10.76, 0.2], [-1.2, 11.12, 0.08], [1.26, 11.28, -0.06],
  ] as const;
  const padCount = quality === 'low' ? 2 : quality === 'medium' ? 4 : padPlacements.length;
  const padMaterial = materials.palmLeaf.clone();
  padMaterial.name = 'ISLAND_12_OASIS_PAD_MATERIAL';
  padMaterial.color.setHex(0x71843f);
  const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.24, 10), padMaterial, padCount);
  pads.name = 'ISLAND_12_FOREGROUND_LILY_PAD_ARRAY';
  padPlacements.slice(0, padCount).forEach(([x, z, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rotation));
    matrix.compose(position.set(x, -0.545, z), quaternion, scale.set(1 + index % 2 * 0.2, 0.72, 1));
    pads.setMatrixAt(index, matrix);
  });
  pads.instanceMatrix.needsUpdate = true;

  const reedCount = quality === 'low' ? 6 : quality === 'medium' ? 10 : 14;
  const reedMaterial = materials.palmLeaf.clone();
  reedMaterial.name = 'ISLAND_12_WATER_REED_MATERIAL';
  reedMaterial.color.setHex(0x81965a);
  const reeds = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.014, 0.022, 0.48, 5),
    reedMaterial,
    reedCount,
  );
  reeds.name = 'ISLAND_12_FOREGROUND_REED_ARRAY';
  for (let index = 0; index < reedCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    matrix.compose(
      position.set(side * (2.42 + row % 3 * 0.13), -0.35 + index % 3 * 0.025, 8.7 + row * 0.26),
      new THREE.Quaternion(),
      scale.set(1, 0.72 + index % 4 * 0.09, 1),
    );
    reeds.setMatrixAt(index, matrix);
  }
  reeds.instanceMatrix.needsUpdate = true;

  root.add(
    oasisShallows,
    oasisDepth,
    oasisCaustics,
    foregroundShallowBed,
    foregroundCaustics,
    channelDepths,
    channelCaustics,
    dropBaseFoam,
    foregroundFall,
    foregroundFallLip,
    foregroundFallBase,
    erodedSandLips,
    shorelineBreakers,
    tidelineDebris,
    pads,
    reeds,
  );
  root.userData.sculptRuntime = {
    parts: [registerIsland12RuntimePart('water-network', root, 'water-detail-network')],
  };
  return { root, oasisCaustics, pads, reeds, animateShoreBreakers };
}

function createForegroundOasisFrame(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_FOREGROUND_OASIS_FRAME';
  const masses = [
    [-3.1, 5.65, 1.62, 0.84, 0.7, -0.2], [3.1, 5.65, 1.62, 0.84, 0.7, 0.2],
    [-4.12, 6.35, 1.22, 0.7, 0.62, 0.34], [4.12, 6.35, 1.22, 0.7, 0.62, -0.34],
    [-2.65, 6.85, 1.25, 0.66, 0.58, 0.18], [2.65, 6.85, 1.25, 0.66, 0.58, -0.18],
    [-4.35, 7.25, 1.18, 0.62, 0.54, -0.18], [4.35, 7.25, 1.18, 0.62, 0.54, 0.18],
    [-2.45, 7.62, 1.1, 0.56, 0.52, -0.28], [2.45, 7.62, 1.1, 0.56, 0.52, 0.28],
  ] as const;
  const count = quality === 'low' ? 6 : masses.length;
  const segments = radialSegments(quality);
  const bodyGeometry = new THREE.CylinderGeometry(1, 0.94, 1, segments);
  const capGeometry = new THREE.CylinderGeometry(1, 0.96, 0.15, segments);
  const bodies = new THREE.InstancedMesh(bodyGeometry, materials.sandstoneShadow, count);
  const caps = new THREE.InstancedMesh(capGeometry, materials.sand, count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const [x, z, radiusX, radiusZ, depth, rotation] = masses[index];
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -depth * 0.5 + 0.08, z), quaternion, scale.set(radiusX, depth, radiusZ));
    bodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.075, z), quaternion, scale.set(radiusX, 1, radiusZ));
    caps.setMatrixAt(index, matrix);
  }
  bodies.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;

  const stoneCount = quality === 'low' ? 7 : quality === 'medium' ? 10 : 13;
  const stoneGeometry = new THREE.BoxGeometry(1.05, 0.08, 0.62);
  const steppingStones = new THREE.InstancedMesh(stoneGeometry, materials.sandstoneLight, stoneCount);
  for (let index = 0; index < stoneCount; index += 1) {
    const z = 4.42 + index * 0.36;
    const x = Math.sin(index * 1.18) * 0.14;
    quaternion.setFromEuler(new THREE.Euler(0, Math.sin(index * 0.83) * 0.22, 0));
    matrix.compose(position.set(x, 0.2, z), quaternion, scale.set(0.88 + index % 3 * 0.08, 1, 0.9));
    steppingStones.setMatrixAt(index, matrix);
  }
  steppingStones.instanceMatrix.needsUpdate = true;
  steppingStones.receiveShadow = quality !== 'low';

  const canalSegmentCount = quality === 'low' ? 8 : 12;
  const canalGeometry = new THREE.BoxGeometry(0.62, 0.035, 0.76);
  const canals = new THREE.InstancedMesh(canalGeometry, materials.waterShallow, canalSegmentCount);
  const deepCanals = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.3, 0.02, 0.72),
    materials.waterDeep,
    canalSegmentCount,
  );
  const canalCaustics = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.52, 0.012, 0.68),
    materials.waterCaustic,
    canalSegmentCount,
  );
  canals.name = 'ISLAND_12_FOREGROUND_SHALLOW_CANAL_ARRAY';
  deepCanals.name = 'ISLAND_12_FOREGROUND_DEEP_CANAL_ARRAY';
  canalCaustics.name = 'ISLAND_12_FOREGROUND_CANAL_CAUSTIC_ARRAY';
  const foamCount = canalSegmentCount / 2;
  const foamGeometry = new THREE.BoxGeometry(0.18, 0.025, 0.34);
  const foamEdges = new THREE.InstancedMesh(foamGeometry, materials.foam, foamCount);
  const segmentsPerCanal = canalSegmentCount / 2;
  let foamIndex = 0;
  [-1, 1].forEach((side, canalIndex) => {
    for (let segmentIndex = 0; segmentIndex < segmentsPerCanal; segmentIndex += 1) {
      const curve = Math.sin(segmentIndex * 0.92 + canalIndex * 0.7) * 0.16;
      const x = side * (1.12 + curve);
      const z = 4.72 + segmentIndex * 0.62;
      const rotation = side * Math.cos(segmentIndex * 0.86) * 0.11;
      quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
      matrix.compose(position.set(x, 0.19, z), quaternion, scale.set(1, 1, 1));
      canals.setMatrixAt(canalIndex * segmentsPerCanal + segmentIndex, matrix);
      matrix.compose(position.set(x, 0.205, z), quaternion, scale.set(1, 1, 1));
      deepCanals.setMatrixAt(canalIndex * segmentsPerCanal + segmentIndex, matrix);
      matrix.compose(position.set(x, 0.218, z), quaternion, scale.set(1, 1, 1));
      canalCaustics.setMatrixAt(canalIndex * segmentsPerCanal + segmentIndex, matrix);
      if (foamIndex < foamCount && segmentIndex % 2 === 1) {
        const edgeOffset = segmentIndex % 4 === 1 ? -0.28 : 0.28;
        matrix.compose(position.set(x + edgeOffset * side, 0.215, z + 0.08), quaternion, scale.set(1, 1, 1));
        foamEdges.setMatrixAt(foamIndex++, matrix);
      }
    }
  });
  canals.instanceMatrix.needsUpdate = true;
  deepCanals.instanceMatrix.needsUpdate = true;
  canalCaustics.instanceMatrix.needsUpdate = true;
  foamEdges.instanceMatrix.needsUpdate = true;

  const masonryCount = quality === 'low' ? 12 : quality === 'medium' ? 18 : 24;
  const masonry = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.sandstoneLight, masonryCount);
  masonry.name = 'ISLAND_12_FOREGROUND_MASONRY_ARRAY';
  for (let index = 0; index < masonryCount; index += 1) {
    const side = index % 2 ? 1 : -1;
    const row = Math.floor(index / 2);
    const x = side * (2.15 + row % 4 * 0.52);
    const z = 5.0 + Math.floor(row / 4) * 0.62 + row % 2 * 0.16;
    quaternion.setFromEuler(new THREE.Euler(0, side * (0.12 + row % 3 * 0.08), 0));
    matrix.compose(position.set(x, 0.34, z), quaternion, scale.set(0.42 + row % 3 * 0.08, 0.2, 0.3 + row % 2 * 0.08));
    masonry.setMatrixAt(index, matrix);
  }
  masonry.instanceMatrix.needsUpdate = true;
  masonry.castShadow = quality !== 'low';

  const canopyGeometry = new THREE.ConeGeometry(0.72, 0.34, 4, 1, true);
  const shadeCanopies = new THREE.InstancedMesh(canopyGeometry, materials.crimson, 2);
  const shadePosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 1, 6), materials.gold, 8);
  [-3.25, 3.25].forEach((x, canopyIndex) => {
    quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 4 + canopyIndex * 0.22, 0));
    matrix.compose(position.set(x, 1.12, 6.15), quaternion, scale.set(1, 1, 0.78));
    shadeCanopies.setMatrixAt(canopyIndex, matrix);
    [[-0.46, -0.34], [0.46, -0.34], [-0.46, 0.34], [0.46, 0.34]].forEach(([offsetX, offsetZ], postIndex) => {
      matrix.compose(position.set(x + offsetX, 0.72, 6.15 + offsetZ), new THREE.Quaternion(), scale.set(1, 0.76, 1));
      shadePosts.setMatrixAt(canopyIndex * 4 + postIndex, matrix);
    });
  });
  shadeCanopies.instanceMatrix.needsUpdate = true;
  shadePosts.instanceMatrix.needsUpdate = true;
  shadeCanopies.castShadow = quality !== 'low';

  root.add(
    bodies,
    caps,
    steppingStones,
    canals,
    deepCanals,
    canalCaustics,
    foamEdges,
    masonry,
    shadeCanopies,
    shadePosts,
  );
  return root;
}

function createPalmFrondGeometry() {
  const stations = [
    [0, 0, 0.085],
    [0.24, -0.018, 0.145],
    [0.5, -0.085, 0.12],
    [0.76, -0.21, 0.075],
    [1, -0.42, 0.012],
  ] as const;
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  stations.forEach(([x, y, halfWidth], index) => {
    vertices.push(x, y, -halfWidth, x, y, halfWidth);
    const progress = index / (stations.length - 1);
    uvs.push(progress, 0, progress, 1);
  });
  for (let index = 0; index < stations.length - 1; index += 1) {
    const left = index * 2;
    indices.push(left, left + 2, left + 3, left, left + 3, left + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPalmLeafCutoutTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const u = x / (size - 1);
      const v = y / (size - 1);
      const distanceFromRib = Math.abs(v - 0.5);
      const rib = distanceFromRib < 0.3;
      const leafletPhase = (u * 10.5 + distanceFromRib * 4.6) % 1;
      const leaflet = leafletPhase < 0.95 && u < 0.99;
      const rootMass = u < 0.13;
      const value = rootMass || rib || leaflet ? 255 : 0;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'ISLAND_12_PALM_LEAFLET_CUTOUT_TEXTURE';
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createPalmInstances(
  materials: Island12SunkenSandsMaterials,
  quality: Island3DQuality,
  level: BuildLevel,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_PALM_CLUSTERS';
  const positions = ISLAND_12_PALM_PLACEMENTS;
  const levelPalmCount = level <= 1 ? 2 : level === 2 ? 14 : positions.length;
  const count = level <= 1
    ? 2
    : Math.max(2, Math.round(levelPalmCount * detailScale(quality)));
  const trunkSegmentsPerPalm = quality === 'low' ? 3 : 4;
  const highFrondCounts = [12, 3, 5, 3] as const;
  const frondQualityScale = quality === 'high' ? 1 : quality === 'medium' ? 0.76 : 0.56;
  const frondCounts = positions.slice(0, count).map((_, index) => Math.max(3, Math.round(highFrondCounts[index % 4] * frondQualityScale)));
  const totalFrondCount = frondCounts.reduce((total, palmFrondCount) => total + palmFrondCount, 0);
  const trunkGeometry = new THREE.CylinderGeometry(0.075, 0.105, 1, quality === 'high' ? 8 : 6);
  const trunkInstances = new THREE.InstancedMesh(trunkGeometry, materials.palmWood, count * trunkSegmentsPerPalm);
  trunkInstances.name = 'ISLAND_12_CURVED_PALM_TRUNK_SEGMENT_ARRAY';
  const frondMaterial = materials.palmLeaf.clone();
  frondMaterial.name = 'ISLAND_12_PALM_FEATHER_FROND_MATERIAL';
  frondMaterial.alphaMap = createPalmLeafCutoutTexture();
  frondMaterial.alphaTest = 0.42;
  frondMaterial.transparent = false;
  const frondInstances = new THREE.InstancedMesh(createPalmFrondGeometry(), frondMaterial, totalFrondCount);
  frondInstances.name = 'ISLAND_12_MIXED_DENSITY_PALM_FROND_ARRAY';
  const dateMaterial = materials.palmWood.clone();
  dateMaterial.name = 'ISLAND_12_PALM_DATE_CLUSTER_MATERIAL';
  dateMaterial.color.setHex(0x6f3522);
  const datedPalmCount = Math.ceil(count / 4);
  const dates = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4), dateMaterial, datedPalmCount);
  dates.name = 'ISLAND_12_PALM_DATE_CLUSTER_ARRAY';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const segmentStart = new THREE.Vector3();
  const segmentEnd = new THREE.Vector3();
  const segmentDirection = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let frondInstanceIndex = 0;
  let datedPalmIndex = 0;
  for (let index = 0; index < count; index += 1) {
    const [x, z] = positions[index];
    const palmFamily = index % 4;
    const height = palmFamily === 0
      ? 1.38 + index % 3 * 0.08
      : palmFamily === 1
        ? 1.48 + index % 2 * 0.12
        : palmFamily === 2
          ? 1.18 + index % 3 * 0.09
          : 0.76 + index % 2 * 0.1;
    const leanAngle = index * 1.73 + 0.4;
    const leanAmount = palmFamily === 0 ? 0.13 : palmFamily === 1 ? 0.27 : palmFamily === 2 ? 0.18 : 0.09;
    const baseY = 0.54;
    for (let segmentIndex = 0; segmentIndex < trunkSegmentsPerPalm; segmentIndex += 1) {
      const startProgress = segmentIndex / trunkSegmentsPerPalm;
      const endProgress = (segmentIndex + 1) / trunkSegmentsPerPalm;
      const bendStart = startProgress * startProgress;
      const bendEnd = endProgress * endProgress;
      segmentStart.set(
        x + Math.cos(leanAngle) * leanAmount * bendStart,
        baseY + height * startProgress,
        z + Math.sin(leanAngle) * leanAmount * bendStart,
      );
      segmentEnd.set(
        x + Math.cos(leanAngle) * leanAmount * bendEnd,
        baseY + height * endProgress,
        z + Math.sin(leanAngle) * leanAmount * bendEnd,
      );
      segmentDirection.subVectors(segmentEnd, segmentStart);
      const segmentLength = segmentDirection.length();
      quaternion.setFromUnitVectors(up, segmentDirection.normalize());
      position.copy(segmentStart).add(segmentEnd).multiplyScalar(0.5);
      const taper = 1 - segmentIndex / trunkSegmentsPerPalm * 0.24;
      matrix.compose(position, quaternion, scale.set(taper, segmentLength, taper));
      const instanceIndex = index * trunkSegmentsPerPalm + segmentIndex;
      trunkInstances.setMatrixAt(instanceIndex, matrix);
      trunkInstances.setColorAt(
        instanceIndex,
        new THREE.Color(palmFamily === 3
          ? (segmentIndex % 2 ? 0x9d7045 : 0x7d5333)
          : palmFamily === 2
            ? (segmentIndex % 2 ? 0x85613d : 0x65442d)
            : (segmentIndex % 2 ? 0x8e613a : 0x6e472b)),
      );
    }
    const crownX = x + Math.cos(leanAngle) * leanAmount;
    const crownZ = z + Math.sin(leanAngle) * leanAmount;
    const crownY = baseY + height;
    const palmFrondCount = frondCounts[index];
    const familyPalette = palmFamily === 0
      ? [0x2f7137, 0x4f8d43, 0x65a14b]
      : palmFamily === 1
        ? [0x66793b, 0x8c8a3c, 0xa79a49]
        : palmFamily === 2
          ? [0x718542, 0x9a9140, 0xb6a34a]
          : [0x3d8142, 0x58a04b, 0x74b65a];
    for (let frondIndex = 0; frondIndex < palmFrondCount; frondIndex += 1) {
      const angle = frondIndex / palmFrondCount * Math.PI * 2 + index * 0.47;
      const lift = palmFamily === 0
        ? (frondIndex % 3 === 0 ? -0.13 : frondIndex % 2 ? 0.03 : 0.16)
        : palmFamily === 1
          ? (frondIndex % 2 ? -0.2 : 0.08)
          : palmFamily === 2
            ? (frondIndex % 3 === 0 ? -0.16 : 0.04)
            : (frondIndex % 2 ? 0.08 : 0.23);
      quaternion.setFromEuler(new THREE.Euler(0, -angle, lift));
      const frondLength = palmFamily === 0
        ? 0.84 + (frondIndex + index) % 4 * 0.065
        : palmFamily === 1
          ? 0.96 + (frondIndex + index) % 3 * 0.07
          : palmFamily === 2
            ? 0.82 + (frondIndex + index) % 4 * 0.06
            : 0.58 + (frondIndex + index) % 3 * 0.06;
      const frondWidth = palmFamily === 0
        ? 1.04 + (frondIndex + index * 2) % 3 * 0.07
        : palmFamily === 1
          ? 0.66 + (frondIndex + index) % 2 * 0.09
          : palmFamily === 2
            ? 0.82 + (frondIndex + index) % 3 * 0.07
            : 0.72 + (frondIndex + index) % 2 * 0.08;
      const layeredCrownDrop = palmFamily === 0 && frondIndex >= 8 ? -0.085 : 0.035;
      const layeredCrownScale = palmFamily === 0 && frondIndex >= 8 ? 0.82 : 1;
      matrix.compose(
        position.set(crownX, crownY + layeredCrownDrop, crownZ),
        quaternion,
        scale.set(frondLength * layeredCrownScale, 1, frondWidth * layeredCrownScale),
      );
      frondInstances.setMatrixAt(frondInstanceIndex, matrix);
      frondInstances.setColorAt(frondInstanceIndex, new THREE.Color(familyPalette[(index + frondIndex) % familyPalette.length]));
      frondInstanceIndex += 1;
    }
    if (palmFamily === 0) {
      matrix.compose(
        position.set(crownX + Math.cos(leanAngle) * 0.09, crownY - 0.13, crownZ + Math.sin(leanAngle) * 0.09),
        new THREE.Quaternion(),
        scale.set(1.08, 1.42, 1.08),
      );
      dates.setMatrixAt(datedPalmIndex, matrix);
      datedPalmIndex += 1;
    }
  }
  trunkInstances.instanceMatrix.needsUpdate = true;
  frondInstances.instanceMatrix.needsUpdate = true;
  dates.instanceMatrix.needsUpdate = true;
  trunkInstances.castShadow = false;
  frondInstances.castShadow = false;
  root.add(trunkInstances, frondInstances, dates);
  root.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('palm-clusters', root, 'vegetation')] };
  return root;
}

function addMarketProps(root: THREE.Group, materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const props = new THREE.Group();
  props.name = 'ISLAND_12_MARKET_PROPS';
  const positions = [
    [-2.05, 2.12], [2.05, 2.02], [-2.22, -1.92], [2.18, -2.02],
    [-5.0, 1.85], [-5.72, 2.1], [5.02, -1.65], [5.7, -2.02],
    [-5.05, -3.82], [-4.62, -3.58], [5.04, 3.82], [4.58, 3.56],
    [-3.05, 5.7], [-3.48, 6.18], [3.05, 5.7], [3.48, 6.18],
  ] as const;
  const count = Math.max(4, Math.round(positions.length * detailScale(quality)));
  const jarGeometry = new THREE.CylinderGeometry(0.11, 0.17, 0.36, 9);
  const neckGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.14, 9);
  const jars = new THREE.InstancedMesh(jarGeometry, materials.ceramic, count);
  const necks = new THREE.InstancedMesh(neckGeometry, materials.gold, count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const [x, z] = positions[index];
    const size = 0.82 + index % 3 * 0.11;
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.72, 0));
    matrix.compose(position.set(x, 0.48, z), quaternion, scale.set(size, size, size));
    jars.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 0.69 + size * 0.04, z), quaternion, scale.set(size, size, size));
    necks.setMatrixAt(index, matrix);
  }
  jars.instanceMatrix.needsUpdate = true;
  necks.instanceMatrix.needsUpdate = true;
  jars.castShadow = quality !== 'low';
  props.add(jars, necks);
  props.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('market-props', props, 'props')] };
  root.add(props);
}

function createBuriedCrownEscarpment(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_BURIED_CROWN_ESCARPMENT';

  const silhouette = new THREE.Shape();
  silhouette.moveTo(-15.8, -2.1);
  silhouette.lineTo(-15.8, -0.55);
  silhouette.lineTo(-13.55, 0.35);
  silhouette.lineTo(-11.45, 1.52);
  silhouette.lineTo(-9.65, 2.72);
  silhouette.lineTo(-8.05, 2.18);
  silhouette.lineTo(-6.35, 1.05);
  silhouette.lineTo(-4.1, 0.12);
  silhouette.lineTo(-1.55, -0.42);
  silhouette.lineTo(0.55, -0.52);
  silhouette.lineTo(2.95, -0.24);
  silhouette.lineTo(5.05, 0.66);
  silhouette.lineTo(6.95, 1.86);
  silhouette.lineTo(8.7, 2.92);
  silhouette.lineTo(10.55, 2.12);
  silhouette.lineTo(12.15, 0.88);
  silhouette.lineTo(14.0, 0.08);
  silhouette.lineTo(15.8, -0.62);
  silhouette.lineTo(15.8, -2.1);
  silhouette.closePath();

  const geometry = new THREE.ExtrudeGeometry(silhouette, {
    depth: quality === 'low' ? 1.2 : 1.65,
    bevelEnabled: true,
    bevelSegments: quality === 'high' ? 2 : 1,
    bevelSize: 0.12,
    bevelThickness: 0.1,
  });
  const mountainMaterial = materials.sandstoneShadow.clone();
  mountainMaterial.name = 'ISLAND_12_FAR_ESCARPMENT_MATERIAL';
  mountainMaterial.color.setHex(0xb39e8d);
  mountainMaterial.roughness = 0.94;
  mountainMaterial.bumpScale = 0.018;
  const mountain = new THREE.Mesh(geometry, mountainMaterial);
  mountain.name = 'ISLAND_12_BURIED_CROWN_MOUNTAIN';
  mountain.position.set(-0.4, -1.38, -24.2);
  mountain.receiveShadow = quality !== 'low';
  root.add(mountain);

  const crownPositions = [
    [-10.45, 0.98, -23.42, 0.48], [-9.7, 1.42, -23.52, 0.72], [-8.98, 1.18, -23.62, 0.42],
    [7.42, 1.2, -23.55, 0.44], [8.2, 1.62, -23.65, 0.78], [8.92, 1.34, -23.75, 0.48],
  ] as const;
  const crownBodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.2, 1, 5),
    mountainMaterial,
    crownPositions.length,
  );
  const distantCrownMaterial = materials.gold.clone();
  distantCrownMaterial.name = 'ISLAND_12_DISTANT_CROWN_METAL';
  distantCrownMaterial.color.setHex(0xa58c67);
  distantCrownMaterial.metalness = 0.36;
  distantCrownMaterial.roughness = 0.64;
  const crownCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.19, 0.32, 5),
    distantCrownMaterial,
    crownPositions.length,
  );
  crownBodies.name = 'ISLAND_12_BURIED_CROWN_RUIN_BODY_ARRAY';
  crownCaps.name = 'ISLAND_12_BURIED_CROWN_RUIN_CAP_ARRAY';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  crownPositions.forEach(([x, y, z, height], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.41, 0));
    matrix.compose(position.set(x, y + height * 0.5, z), quaternion, scale.set(1, height, 1));
    crownBodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, y + height + 0.16, z), quaternion, scale.set(1, 1, 1));
    crownCaps.setMatrixAt(index, matrix);
  });
  crownBodies.instanceMatrix.needsUpdate = true;
  crownCaps.instanceMatrix.needsUpdate = true;
  root.add(crownBodies, crownCaps);
  compactIsland12StaticPresentationGeometry(root, 'ISLAND_12_BURIED_CROWN_ESCARPMENT');
  return root;
}

function createNearBackgroundLandscapeKit(
  materials: Island12SunkenSandsMaterials,
  quality: Island3DQuality,
  level: BuildLevel,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_NEAR_BACKGROUND_LANDSCAPE_KIT';

  const warmStone = materials.sandstone.clone();
  warmStone.name = 'ISLAND_12_NEAR_BACKGROUND_WARM_STONE';
  warmStone.color.setHex(0xc99355);
  warmStone.roughness = 0.88;
  const darkStone = materials.sandstoneShadow.clone();
  darkStone.name = 'ISLAND_12_NEAR_BACKGROUND_DARK_STONE';
  darkStone.color.setHex(0x76503b);
  darkStone.roughness = 0.92;
  const leafMaterial = materials.palmLeaf.clone();
  leafMaterial.name = 'ISLAND_12_NEAR_BACKGROUND_PALM_LEAF';
  leafMaterial.color.setHex(0x496c3f);

  const dunePositions = [
    [-9.4, -10.7, 2.2, 0.42, 1.12, -0.16], [-7.25, -11.2, 1.48, 0.3, 0.86, 0.1],
    [-4.95, -10.35, 1.72, 0.34, 0.94, -0.08], [3.9, -10.55, 1.35, 0.28, 0.8, 0.18],
    [5.65, -11.3, 1.9, 0.36, 1.02, -0.12], [8.2, -10.45, 2.32, 0.44, 1.08, 0.08],
  ] as const;
  const duneCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : dunePositions.length;
  const duneShoulders = new THREE.InstancedMesh(new THREE.SphereGeometry(1, quality === 'high' ? 12 : 8, 6), warmStone, duneCount);
  duneShoulders.name = 'ISLAND_12_NEAR_DUNE_SHOULDER_ARRAY';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  dunePositions.slice(0, duneCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -0.72 + sy * 0.15, z), quaternion, scale.set(sx, sy, sz));
    duneShoulders.setMatrixAt(index, matrix);
  });
  duneShoulders.instanceMatrix.needsUpdate = true;
  duneShoulders.receiveShadow = quality !== 'low';
  root.add(duneShoulders);

  const spurPositions = [
    [-8.15, -10.15, 0.48, 1.12, 0.72, -0.18], [-6.85, -10.42, 0.34, 0.76, 0.5, 0.22],
    [-3.95, -10.7, 0.42, 0.92, 0.62, 0.08], [4.65, -10.22, 0.36, 0.82, 0.56, -0.24],
    [6.55, -10.55, 0.5, 1.18, 0.7, 0.16], [7.45, -10.78, 0.3, 0.7, 0.44, -0.06],
  ] as const;
  const spurCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : spurPositions.length;
  const spurs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), darkStone, spurCount);
  spurs.name = 'ISLAND_12_ERODED_ROCK_SPUR_ARRAY';
  spurPositions.slice(0, spurCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(index % 2 ? 0.18 : -0.12, rotation, index % 3 * 0.08));
    matrix.compose(position.set(x, -0.15 + sy * 0.42, z), quaternion, scale.set(sx, sy, sz));
    spurs.setMatrixAt(index, matrix);
  });
  spurs.instanceMatrix.needsUpdate = true;
  spurs.castShadow = quality !== 'low';
  root.add(spurs);

  const ruinSegments = [
    [-9.0, -9.85, 1.28, 0.34, 0.18, -0.12], [-7.72, -9.98, 0.8, 0.28, 0.18, 0.2],
    [-4.8, -9.72, 1.05, 0.3, 0.18, 0.08], [3.98, -9.82, 0.86, 0.28, 0.18, -0.18],
    [5.0, -9.7, 1.12, 0.36, 0.2, 0.12], [7.85, -9.95, 1.36, 0.32, 0.18, -0.08],
  ] as const;
  const ruinCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : ruinSegments.length;
  const retainingWalls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), darkStone, ruinCount);
  retainingWalls.name = 'ISLAND_12_HALF_BURIED_RETAINING_WALL_ARRAY';
  ruinSegments.slice(0, ruinCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, index % 2 ? 0.05 : -0.04));
    matrix.compose(position.set(x, -0.28 + sy * 0.5, z), quaternion, scale.set(sx, sy, sz));
    retainingWalls.setMatrixAt(index, matrix);
  });
  retainingWalls.instanceMatrix.needsUpdate = true;
  root.add(retainingWalls);

  const aqueductPositions = [
    [-6.1, -10.0, 0.68], [-5.45, -10.08, 0.54], [5.55, -10.0, 0.6], [6.2, -10.08, 0.78],
  ] as const;
  const aqueductCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : aqueductPositions.length;
  const aqueductPillars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1, 0.2), warmStone, aqueductCount * 2);
  const aqueductLintels = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), warmStone, aqueductCount);
  aqueductPillars.name = 'ISLAND_12_IRRIGATION_RUIN_PILLAR_ARRAY';
  aqueductLintels.name = 'ISLAND_12_IRRIGATION_RUIN_LINTEL_ARRAY';
  aqueductPositions.slice(0, aqueductCount).forEach(([x, z, height], index) => {
    const width = 0.42 + index % 2 * 0.1;
    quaternion.setFromEuler(new THREE.Euler(0, index % 2 ? -0.12 : 0.1, 0));
    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(position.set(x + side * width * 0.42, -0.2 + height * 0.5, z), quaternion, scale.set(1, height, 1));
      aqueductPillars.setMatrixAt(index * 2 + sideIndex, matrix);
    });
    matrix.compose(position.set(x, -0.2 + height, z), quaternion, scale.set(width, 0.14, 0.22));
    aqueductLintels.setMatrixAt(index, matrix);
  });
  aqueductPillars.instanceMatrix.needsUpdate = true;
  aqueductLintels.instanceMatrix.needsUpdate = true;
  root.add(aqueductPillars, aqueductLintels);

  const palmPositions = [
    [-7.55, -9.9, 0.82], [-4.35, -10.05, 0.72], [4.4, -10.0, 0.78], [7.15, -9.88, 0.92],
  ] as const;
  const levelPalmCount = level <= 1 ? 2 : level === 2 ? 3 : palmPositions.length;
  const palmCount = Math.min(levelPalmCount, quality === 'low' ? 2 : quality === 'medium' ? 3 : palmPositions.length);
  const palmTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.085, 1, 6), materials.palmWood, palmCount);
  const frondsPerPalm = quality === 'low' ? 3 : 4;
  const palmCrowns = new THREE.InstancedMesh(createPalmFrondGeometry(), leafMaterial, palmCount * frondsPerPalm);
  palmTrunks.name = 'ISLAND_12_NEAR_BACKGROUND_PALM_TRUNK_ARRAY';
  palmCrowns.name = 'ISLAND_12_NEAR_BACKGROUND_PALM_CROWN_ARRAY';
  palmPositions.slice(0, palmCount).forEach(([x, z, height], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.7, index % 2 ? -0.08 : 0.08));
    matrix.compose(position.set(x, -0.18 + height * 0.5, z), quaternion, scale.set(1, height, 1));
    palmTrunks.setMatrixAt(index, matrix);
    for (let frondIndex = 0; frondIndex < frondsPerPalm; frondIndex += 1) {
      const frondAngle = frondIndex / frondsPerPalm * Math.PI * 2 + index * 0.52;
      quaternion.setFromEuler(new THREE.Euler(0, -frondAngle, frondIndex % 2 ? -0.18 : 0.08));
      matrix.compose(
        position.set(x, -0.12 + height, z),
        quaternion,
        scale.set(0.5 + index % 2 * 0.06, 0.58, 0.72),
      );
      palmCrowns.setMatrixAt(index * frondsPerPalm + frondIndex, matrix);
      palmCrowns.setColorAt(
        index * frondsPerPalm + frondIndex,
        new THREE.Color(index % 2 ? 0x657943 : 0x3f6e3d),
      );
    }
  });
  palmTrunks.instanceMatrix.needsUpdate = true;
  palmCrowns.instanceMatrix.needsUpdate = true;
  if (palmCrowns.instanceColor) palmCrowns.instanceColor.needsUpdate = true;
  root.add(palmTrunks, palmCrowns);

  const poolPositions = [[-8.25, -10.0, 0.62], [4.95, -10.08, 0.52], [7.5, -10.15, 0.45]] as const;
  const poolCount = quality === 'low' ? 1 : quality === 'medium' ? 2 : poolPositions.length;
  const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(1, quality === 'high' ? 14 : 9), materials.water, poolCount);
  pools.name = 'ISLAND_12_NEAR_BACKGROUND_OASIS_POOL_ARRAY';
  poolPositions.slice(0, poolCount).forEach(([x, z, radius], index) => {
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, index * 0.34));
    matrix.compose(position.set(x, -0.42, z), quaternion, scale.set(radius * 1.4, radius, radius));
    pools.setMatrixAt(index, matrix);
  });
  pools.instanceMatrix.needsUpdate = true;
  root.add(pools);
  compactIsland12StaticPresentationGeometry(root, 'ISLAND_12_NEAR_BACKGROUND');
  return root;
}

function createMiddleDistanceTransition(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_MIDDLE_DISTANCE_TRANSITION';

  const ridgeMaterial = materials.sandstone.clone();
  ridgeMaterial.name = 'ISLAND_12_MIDDLE_DISTANCE_RIDGE_MATERIAL';
  ridgeMaterial.color.setHex(0xb79f87);
  ridgeMaterial.roughness = 0.92;
  ridgeMaterial.bumpScale = 0.024;
  const mesaMaterial = materials.sandstoneShadow.clone();
  mesaMaterial.name = 'ISLAND_12_MIDDLE_DISTANCE_MESA_MATERIAL';
  mesaMaterial.color.setHex(0x8f7d70);
  mesaMaterial.roughness = 0.94;
  mesaMaterial.bumpScale = 0.028;

  const ridgePositions = [
    [-10.8, -16.45, 3.0, 0.42, 1.15, -0.12], [10.7, -16.65, 3.12, 0.44, 1.18, 0.1],
    [-6.65, -15.05, 2.35, 0.34, 0.96, 0.16], [6.45, -15.4, 2.5, 0.36, 1.0, -0.14],
  ] as const;
  const ridgeCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : ridgePositions.length;
  const ridges = new THREE.InstancedMesh(new THREE.SphereGeometry(1, quality === 'high' ? 12 : 8, 6), ridgeMaterial, ridgeCount);
  ridges.name = 'ISLAND_12_MIDDLE_DISTANCE_DUNE_RIDGE_ARRAY';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const sandbarPositions = [
    [-8.45, -15.7, 2.55, 0.9, -0.08], [8.4, -15.95, 2.72, 0.94, 0.1],
  ] as const;
  const sandbarCount = sandbarPositions.length;
  const sandbars = new THREE.InstancedMesh(new THREE.CircleGeometry(1, quality === 'high' ? 16 : 10), ridgeMaterial, sandbarCount);
  sandbars.name = 'ISLAND_12_MIDDLE_DISTANCE_SANDBAR_ARRAY';
  sandbarPositions.slice(0, sandbarCount).forEach(([x, z, sx, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rotation));
    matrix.compose(position.set(x, -0.57, z), quaternion, scale.set(sx, sz, 1));
    sandbars.setMatrixAt(index, matrix);
  });
  sandbars.instanceMatrix.needsUpdate = true;
  root.add(sandbars);

  ridgePositions.slice(0, ridgeCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -0.74, z), quaternion, scale.set(sx, sy, sz));
    ridges.setMatrixAt(index, matrix);
  });
  ridges.instanceMatrix.needsUpdate = true;
  ridges.receiveShadow = quality !== 'low';
  root.add(ridges);

  const mesaPositions = [
    [-9.1, -17.15, 1.15, 0.9, 0.82, -0.12], [-5.2, -15.85, 0.8, 0.66, 0.65, 0.14],
    [4.75, -16.05, 0.9, 0.72, 0.7, -0.16], [8.65, -17.0, 1.25, 0.98, 0.86, 0.1],
  ] as const;
  const mesaCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : mesaPositions.length;
  const mesas = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.78, 1, 1, quality === 'high' ? 8 : 6), mesaMaterial, mesaCount);
  mesas.name = 'ISLAND_12_MIDDLE_DISTANCE_MESA_FRAGMENT_ARRAY';
  mesaPositions.slice(0, mesaCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(index % 2 ? 0.05 : -0.04, rotation, 0));
    matrix.compose(position.set(x, -0.57 + sy * 0.5, z), quaternion, scale.set(sx, sy, sz));
    mesas.setMatrixAt(index, matrix);
  });
  mesas.instanceMatrix.needsUpdate = true;
  mesas.castShadow = quality !== 'low';
  root.add(mesas);

  const towerPositions = [
    [-10.2, -16.45, 0.74], [-4.2, -16.0, 0.56], [5.75, -16.25, 0.62], [9.75, -16.5, 0.82],
  ] as const;
  const towerCount = quality === 'low' ? 2 : quality === 'medium' ? 3 : towerPositions.length;
  const towerBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.2, 1, 6), mesaMaterial, towerCount);
  const towerCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.21, 0.24, 6), ridgeMaterial, towerCount);
  towerBodies.name = 'ISLAND_12_MIDDLE_DISTANCE_RUIN_TOWER_ARRAY';
  towerCaps.name = 'ISLAND_12_MIDDLE_DISTANCE_RUIN_CAP_ARRAY';
  towerPositions.slice(0, towerCount).forEach(([x, z, height], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, index * 0.48, index % 2 ? 0.06 : -0.04));
    matrix.compose(position.set(x, -0.57 + height * 0.5, z), quaternion, scale.set(1, height, 1));
    towerBodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, -0.45 + height, z), quaternion, scale.set(1, 1, 1));
    towerCaps.setMatrixAt(index, matrix);
  });
  towerBodies.instanceMatrix.needsUpdate = true;
  towerCaps.instanceMatrix.needsUpdate = true;
  root.add(towerBodies, towerCaps);
  compactIsland12StaticPresentationGeometry(root, 'ISLAND_12_MIDDLE_DISTANCE');
  return root;
}

function createErodedMountainGeometry(segments: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const ringProfiles = [
    { y: 0, radius: 1 },
    { y: 0.46, radius: 0.62 },
    { y: 0.78, radius: 0.31 },
  ];
  ringProfiles.forEach((profile, ringIndex) => {
    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      const irregularity = 1 + Math.sin(index * 2.31 + ringIndex * 1.17) * 0.13;
      const offsetX = ringIndex * 0.055;
      const offsetZ = ringIndex * -0.035;
      vertices.push(
        Math.cos(angle) * profile.radius * irregularity + offsetX,
        profile.y,
        Math.sin(angle) * profile.radius * irregularity + offsetZ,
      );
    }
  });
  const apexIndex = vertices.length / 3;
  vertices.push(0.08, 1, -0.04);
  for (let ringIndex = 0; ringIndex < ringProfiles.length - 1; ringIndex += 1) {
    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      const lower = ringIndex * segments + index;
      const lowerNext = ringIndex * segments + next;
      const upper = (ringIndex + 1) * segments + index;
      const upperNext = (ringIndex + 1) * segments + next;
      indices.push(lower, lowerNext, upperNext, lower, upperNext, upper);
    }
  }
  const topRingOffset = (ringProfiles.length - 1) * segments;
  for (let index = 0; index < segments; index += 1) {
    indices.push(topRingOffset + index, topRingOffset + (index + 1) % segments, apexIndex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createContinentTipDepthSystem(materials: Island12SunkenSandsMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_CONTINENT_TIP_DEPTH_SYSTEM';

  const coastalMaterial = materials.sandstone.clone();
  coastalMaterial.name = 'ISLAND_12_CONTINENT_COASTAL_SHELF_MATERIAL';
  coastalMaterial.color.setHex(0xc6aa82);
  coastalMaterial.roughness = 0.95;
  coastalMaterial.bumpScale = 0.018;
  const inlandMaterial = materials.sandstoneShadow.clone();
  inlandMaterial.name = 'ISLAND_12_CONTINENT_INLAND_RIDGE_MATERIAL';
  inlandMaterial.color.setHex(0x9c8c7e);
  inlandMaterial.roughness = 0.97;
  inlandMaterial.bumpScale = 0.014;
  const farMaterial = materials.sandstoneShadow.clone();
  farMaterial.name = 'ISLAND_12_CONTINENT_FAR_MOUNTAIN_MATERIAL';
  farMaterial.color.setHex(0xb8aea0);
  farMaterial.emissive.setHex(0x56524c);
  farMaterial.emissiveIntensity = 0.34;
  farMaterial.roughness = 1;
  farMaterial.bumpScale = 0.008;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const shelfPositions = [
    [0, -11.8, 6.7, 0.5, 3.8, 0.02],
    [-0.45, -15.5, 5.8, 0.62, 4.1, -0.08],
    [0.35, -19.4, 5.1, 0.72, 4.2, 0.1],
    [-0.2, -23.1, 4.4, 0.78, 3.7, -0.04],
    [0.15, -27.0, 3.85, 0.7, 3.55, 0.06],
    [-0.22, -31.2, 3.25, 0.62, 3.15, -0.05],
  ] as const;
  const shelfCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : shelfPositions.length;
  const shelves = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, quality === 'high' ? 14 : 9, 7),
    coastalMaterial,
    shelfCount,
  );
  shelves.name = 'ISLAND_12_CONTINENT_INLAND_SHELF_ARRAY';
  shelfPositions.slice(0, shelfCount).forEach(([x, z, sx, sy, sz, rotation], index) => {
    quaternion.setFromEuler(new THREE.Euler(0, rotation, 0));
    matrix.compose(position.set(x, -0.92 + sy * 0.34, z), quaternion, scale.set(sx, sy, sz));
    shelves.setMatrixAt(index, matrix);
  });
  shelves.instanceMatrix.needsUpdate = true;
  shelves.receiveShadow = quality !== 'low';
  root.add(shelves);

  const ridgePositions = [
    [-4.8, -15.0, 1.05, 0.78, 0.82], [4.3, -15.7, 1.12, 0.9, 0.84],
    [-2.6, -18.2, 1.08, 1.16, 0.88], [1.8, -18.8, 1.24, 1.0, 0.94],
    [-3.45, -21.5, 1.0, 1.34, 0.84], [-0.25, -22.0, 1.3, 1.52, 0.98],
    [3.1, -22.6, 1.04, 1.28, 0.86], [-1.8, -25.2, 1.18, 1.62, 0.94],
    [1.95, -26.0, 1.1, 1.46, 0.9],
  ] as const;
  const ridgeCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : ridgePositions.length;
  const ridges = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), inlandMaterial, ridgeCount);
  ridges.name = 'ISLAND_12_CONTINENT_ERODED_FOOTHILL_ARRAY';
  ridgePositions.slice(0, ridgeCount).forEach(([x, z, sx, sy, sz], index) => {
    quaternion.setFromEuler(new THREE.Euler(index % 2 ? 0.08 : -0.12, index * 0.57, index % 3 * 0.06));
    matrix.compose(position.set(x, -0.68 + sy * 0.5, z), quaternion, scale.set(sx, sy, sz));
    ridges.setMatrixAt(index, matrix);
  });
  ridges.instanceMatrix.needsUpdate = true;
  root.add(ridges);

  const farPeaks = [
    [-8.2, -30.5, 1.18, 1.05, 1.05], [-4.8, -32.0, 1.32, 1.34, 1.12],
    [-1.2, -33.5, 1.48, 1.62, 1.24], [2.25, -32.2, 1.3, 1.3, 1.1],
    [4.65, -30.8, 1.12, 0.98, 1.0], [-4.0, -38.0, 1.52, 1.46, 1.22],
    [-0.25, -39.2, 1.62, 1.72, 1.3], [3.25, -42.0, 1.68, 1.88, 1.34],
  ] as const;
  const farCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : farPeaks.length;
  const mountains = new THREE.InstancedMesh(createErodedMountainGeometry(quality === 'high' ? 8 : 6), farMaterial, farCount);
  mountains.name = 'ISLAND_12_CONTINENT_RECEDING_MOUNTAIN_CHAIN';
  farPeaks.slice(0, farCount).forEach(([x, z, sx, sy, sz], index) => {
    quaternion.setFromEuler(new THREE.Euler(index % 2 ? 0.04 : -0.03, index * 0.41, index % 3 * 0.035));
    matrix.compose(position.set(x, -0.78, z), quaternion, scale.set(sx, sy, sz));
    mountains.setMatrixAt(index, matrix);
  });
  mountains.instanceMatrix.needsUpdate = true;
  root.add(mountains);

  compactIsland12StaticPresentationGeometry(root, 'ISLAND_12_CONTINENT_TIP_DEPTH');
  return root;
}

function createDepthAtmosphericLife(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_DEPTH_ATMOSPHERIC_LIFE';

  const birdCount = quality === 'high' ? 7 : quality === 'medium' ? 4 : 2;
  const birdGeometry = new THREE.BufferGeometry();
  birdGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -0.18, 0.025, 0.07, -0.045, -0.015, -0.015,
    0, 0, 0, 0.18, 0.025, 0.07, 0.045, -0.015, -0.015,
  ], 3));
  birdGeometry.computeVertexNormals();
  const birdMaterial = new THREE.MeshBasicMaterial({
    color: 0x655c55,
    side: THREE.DoubleSide,
    fog: true,
  });
  const birds = new THREE.InstancedMesh(birdGeometry, birdMaterial, birdCount);
  birds.name = 'ISLAND_12_MIDDLE_DISTANCE_BIRD_FLOCK';
  const birdMatrix = new THREE.Matrix4();
  const birdQuaternion = new THREE.Quaternion();
  const birdPosition = new THREE.Vector3();
  const birdScale = new THREE.Vector3();
  for (let index = 0; index < birdCount; index += 1) {
    birdQuaternion.setFromEuler(new THREE.Euler(-0.18 + index % 3 * 0.07, index * 0.37, 0));
    birdMatrix.compose(
      birdPosition.set(-4.6 + index * 1.45, 2.65 + index % 3 * 0.24, -14.4 - index % 2 * 1.7),
      birdQuaternion,
      birdScale.setScalar(0.82 + index % 2 * 0.18),
    );
    birds.setMatrixAt(index, birdMatrix);
  }
  birds.instanceMatrix.needsUpdate = true;
  root.add(birds);

  const hazeCount = quality === 'high' ? 22 : quality === 'medium' ? 14 : 7;
  const hazePositions = new Float32Array(hazeCount * 3);
  for (let index = 0; index < hazeCount; index += 1) {
    const progress = hazeCount <= 1 ? 0.5 : index / (hazeCount - 1);
    hazePositions[index * 3] = (progress - 0.5) * 27 + Math.sin(index * 2.31) * 0.8;
    hazePositions[index * 3 + 1] = 0.45 + index % 5 * 0.46;
    hazePositions[index * 3 + 2] = -17.8 - index % 4 * 1.65;
  }
  const hazeGeometry = new THREE.BufferGeometry();
  hazeGeometry.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));
  const hazeMaterial = new THREE.PointsMaterial({
    color: 0xe8dcc5,
    size: quality === 'low' ? 0.14 : 0.18,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    sizeAttenuation: true,
    fog: true,
  });
  const haze = new THREE.Points(hazeGeometry, hazeMaterial);
  haze.name = 'ISLAND_12_FAR_HAZE_DRIFT_FIELD';
  root.add(haze);
  return { root, birds, haze, hazeMaterial };
}

function createSunkenSandsWorldSunAndGlint(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_WORLD_LOCKED_LATE_DAY_SUN';

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const halo = context.createRadialGradient(64, 64, 3, 64, 64, 62);
    halo.addColorStop(0, 'rgba(255,255,224,1)');
    halo.addColorStop(0.12, 'rgba(255,244,190,0.98)');
    halo.addColorStop(0.28, 'rgba(255,219,142,0.48)');
    halo.addColorStop(0.62, 'rgba(255,190,104,0.12)');
    halo.addColorStop(1, 'rgba(255,180,92,0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, 128, 128);
  }
  const sunTexture = new THREE.CanvasTexture(canvas);
  sunTexture.name = 'ISLAND_12_WORLD_SUN_HALO_TEXTURE';
  sunTexture.colorSpace = THREE.SRGBColorSpace;
  sunTexture.minFilter = THREE.LinearFilter;
  sunTexture.magFilter = THREE.LinearFilter;
  const sunMaterial = new THREE.SpriteMaterial({
    map: sunTexture,
    color: 0xfff2c2,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    fog: false,
  });
  const sun = new THREE.Sprite(sunMaterial);
  sun.name = 'ISLAND_12_WORLD_LOCKED_SUN_DISC';
  // The camera is pitched steeply down at the board, so a genuinely distant
  // world point projects high in the portrait sky even at modest world Y.
  // This stays fixed while OrbitControls moves around it.
  sun.position.set(6, 1.8, -44);
  sun.scale.set(4.8, 4.8, 1);
  root.add(sun);

  const glintCount = quality === 'high' ? 22 : quality === 'medium' ? 15 : 9;
  const glintMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdda0,
    transparent: true,
    opacity: quality === 'low' ? 0.2 : 0.27,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const glintGeometry = new THREE.PlaneGeometry(1, 1);
  glintGeometry.rotateX(-Math.PI / 2);
  const glints = new THREE.InstancedMesh(glintGeometry, glintMaterial, glintCount);
  glints.name = 'ISLAND_12_WORLD_LOCKED_OCEAN_SUN_GLINT_PATH';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < glintCount; index += 1) {
    const progress = glintCount <= 1 ? 0.5 : index / (glintCount - 1);
    const z = -31.5 + progress * 20.5;
    const x = 6.15 - progress * 0.72 + Math.sin(index * 2.17) * (0.16 + progress * 0.07);
    const width = 0.46 + progress * 0.82 + (index % 3) * 0.14;
    const length = 0.1 + progress * 0.22;
    quaternion.setFromEuler(new THREE.Euler(0, 0.1 + Math.sin(index * 1.3) * 0.16, 0));
    matrix.compose(position.set(x, -0.565, z), quaternion, scale.set(width, 1, length));
    glints.setMatrixAt(index, matrix);
  }
  glints.instanceMatrix.needsUpdate = true;
  glints.renderOrder = 2;
  root.add(glints);

  return root;
}

function createOceanWaveRibbonGeometry(segments: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const arc = Math.PI * 0.42;
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * arc;
    const ripple = Math.sin(index / segments * Math.PI) * 0.012;
    const innerRadius = 1 - 0.007 - ripple;
    const outerRadius = 1 + 0.007 + ripple;
    vertices.push(
      Math.cos(angle) * innerRadius, 0, Math.sin(angle) * innerRadius,
      Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius,
    );
    if (index < segments) {
      const base = index * 2;
      indices.push(base, base + 2, base + 3, base, base + 3, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIsland12OceanWaveField(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_12_ANIMATED_OCEAN_WAVE_FIELD';
  const bandCount = quality === 'high' ? 12 : quality === 'medium' ? 9 : 6;
  const bandsPerLayer = Math.ceil(bandCount / 3);
  const geometry = createOceanWaveRibbonGeometry(quality === 'high' ? 9 : 7);
  const layers: Array<{
    mesh: THREE.InstancedMesh;
    material: THREE.MeshBasicMaterial;
    phaseOffset: number;
    count: number;
  }> = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  for (let layerIndex = 0; layerIndex < 3; layerIndex += 1) {
    const count = Math.max(0, Math.min(bandsPerLayer, bandCount - layerIndex * bandsPerLayer));
    if (count === 0) continue;
    const material = new THREE.MeshBasicMaterial({
      color: layerIndex === 0 ? 0xd8fbf4 : layerIndex === 1 ? 0xa9e8e2 : 0x8dd8db,
      transparent: true,
      opacity: 0.11 - layerIndex * 0.018,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    material.name = `ISLAND_12_OCEAN_WAVE_LAYER_${layerIndex + 1}_MATERIAL`;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = `ISLAND_12_TRAVELING_OCEAN_WAVE_LAYER_${layerIndex + 1}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    root.add(mesh);
    layers.push({ mesh, material, phaseOffset: layerIndex / 3, count });
  }

  const animate = (elapsed: number) => {
    layers.forEach(({ mesh, material, phaseOffset, count }, layerIndex) => {
      for (let index = 0; index < count; index += 1) {
        const wavePhase = (elapsed * (0.026 + layerIndex * 0.004) + phaseOffset + index / count) % 1;
        const radius = 7.8 + wavePhase * 7.2;
        const angle = layerIndex * 1.72 + index * 2.399963 + Math.sin(elapsed * 0.08 + index) * 0.08;
        quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
        matrix.compose(
          position.set(0, -0.565 + Math.sin(elapsed * 0.42 + index * 0.9) * 0.008, 0),
          quaternion,
          scale.set(radius, radius * (0.94 + index % 2 * 0.055), 1),
        );
        mesh.setMatrixAt(index, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const fade = Math.sin(Math.PI * ((elapsed * 0.026 + phaseOffset) % 1));
      material.opacity = (0.145 - layerIndex * 0.022) * (0.28 + fade * 0.72);
    });
  };
  animate(0.01);
  return { root, animate };
}

export function createIsland12SunkenSandsLivingAmbience(
  scene: THREE.Scene,
  qualityProfile: Island3DQualityProfile,
  materials: Island12SunkenSandsMaterials,
  sharedWater: THREE.Mesh,
  buildLevel: BuildLevel = 3,
): Island12SunkenSandsAmbienceRuntime {
  const quality = qualityProfile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_12_SUNKEN_SANDS_WORLD_ROOT';
  const terrain = new THREE.Group();
  terrain.name = 'ISLAND_12_TERRAIN_NETWORK';
  addTerrainShelf(terrain, 0, 0, 2.75, 1.12, materials, quality);
  const satellitePositions = [[-5.25, -3.05], [-5.25, 3.05], [5.25, -3.05], [5.25, 3.05]];
  satellitePositions.forEach(([x, z], index) => addTerrainShelf(terrain, x, z, index % 2 ? 1.78 : 1.92, 0.82, materials, quality));
  addInterlockingTerrainMasses(terrain, materials, quality);
  terrain.add(createProductionOasisCityBase(materials, quality));
  terrain.add(createDrySurfaceIntegration(materials, quality));
  terrain.add(createTerrainSurfaceLife(materials, quality, buildLevel));
  terrain.add(createSandstoneSurfaceLanguage(materials, quality));
  compactIsland12StaticPresentationGeometry(terrain, 'ISLAND_12_TERRAIN_NETWORK');
  terrain.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('terrain-network', terrain, 'terrain'),
    registerIsland12RuntimePart('central-oasis-shelf', terrain, 'terrain'),
    registerIsland12RuntimePart('satellite-terrain-shelves', terrain, 'terrain'),
  ] };
  root.add(terrain);

  const waterNetwork = new THREE.Group();
  waterNetwork.name = 'ISLAND_12_WATER_NETWORK';
  const oasis = new THREE.Mesh(new THREE.CircleGeometry(2.18, radialSegments(quality) * 2), materials.waterShallow);
  oasis.rotation.x = -Math.PI / 2;
  oasis.position.y = 0.285;
  waterNetwork.add(oasis);
  const channelAngles = [-0.73, 0.73, Math.PI - 0.73, Math.PI + 0.73];
  const channels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(3.0, 0.025, 0.34),
    materials.waterShallow,
    channelAngles.length,
  );
  channels.name = 'ISLAND_12_WATER_CHANNEL_ARRAY';
  const channelMatrix = new THREE.Matrix4();
  const channelQuaternion = new THREE.Quaternion();
  const channelPosition = new THREE.Vector3();
  channelAngles.forEach((angle, index) => {
    channelQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    channelMatrix.compose(
      channelPosition.set(Math.cos(angle) * 3.55, 0.29, Math.sin(angle) * 3.55),
      channelQuaternion,
      new THREE.Vector3(1, 1, 1),
    );
    channels.setMatrixAt(index, channelMatrix);
  });
  channels.instanceMatrix.needsUpdate = true;
  waterNetwork.add(channels);
  const dropGeometry = new THREE.BoxGeometry(0.52, 0.88, 0.055);
  const drops = new THREE.InstancedMesh(dropGeometry, materials.waterShallow, channelAngles.length);
  const dropMatrix = new THREE.Matrix4();
  const dropQuaternion = new THREE.Quaternion();
  const dropScale = new THREE.Vector3(1, 1, 1);
  const dropPosition = new THREE.Vector3();
  channelAngles.forEach((angle, index) => {
    dropQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    dropMatrix.compose(
      dropPosition.set(Math.cos(angle) * 5.02, -0.15, Math.sin(angle) * 5.02),
      dropQuaternion,
      dropScale,
    );
    drops.setMatrixAt(index, dropMatrix);
  });
  drops.instanceMatrix.needsUpdate = true;
  waterNetwork.add(drops);
  const foamLips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.68, 0.055, 0.16), materials.foam, channelAngles.length);
  channelAngles.forEach((angle, index) => {
    dropQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    dropMatrix.compose(
      dropPosition.set(Math.cos(angle) * 4.72, 0.27, Math.sin(angle) * 4.72),
      dropQuaternion,
      dropScale,
    );
    foamLips.setMatrixAt(index, dropMatrix);
  });
  foamLips.instanceMatrix.needsUpdate = true;
  waterNetwork.add(foamLips);
  waterNetwork.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('water-network', waterNetwork, 'water'),
  ] };
  root.add(waterNetwork);
  root.add(createWatercourseBankNetwork(materials, quality, channelAngles));
  root.add(createForegroundOasisFrame(materials, quality));
  const waterDetails = createOasisWaterDetailNetwork(materials, quality, channelAngles);
  root.add(waterDetails.root);

  const paths = new THREE.Group();
  paths.name = 'ISLAND_12_DRY_PATH_NETWORK';
  const pathAngles = channelAngles.map((angle) => angle + Math.PI / 2);
  const pathInstances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.6, 0.06, 0.48),
    materials.sandstoneWorn,
    pathAngles.length,
  );
  pathInstances.name = 'ISLAND_12_DRY_PATH_ARRAY';
  pathAngles.forEach((angle, index) => {
    channelQuaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    channelMatrix.compose(
      channelPosition.set(Math.cos(angle) * 1.55, 0.35, Math.sin(angle) * 1.55),
      channelQuaternion,
      new THREE.Vector3(1, 1, 1),
    );
    pathInstances.setMatrixAt(index, channelMatrix);
  });
  pathInstances.instanceMatrix.needsUpdate = true;
  paths.add(pathInstances);
  paths.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('dry-path-network', paths, 'paths')] };
  root.add(paths);

  const horizon = new THREE.Group();
  horizon.name = 'ISLAND_12_DUNE_HORIZON';
  horizon.add(createContinentTipDepthSystem(materials, quality));
  horizon.add(createBuriedCrownEscarpment(materials, quality));
  horizon.add(createNearBackgroundLandscapeKit(materials, quality, buildLevel));
  horizon.add(createMiddleDistanceTransition(materials, quality));
  const duneCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 7;
  const duneGeometry = new THREE.SphereGeometry(1, quality === 'high' ? 9 : 8, 5);
  const lightDunes = new THREE.InstancedMesh(duneGeometry, materials.sandstone, Math.ceil(duneCount / 2));
  const shadowDunes = new THREE.InstancedMesh(duneGeometry, materials.sandstoneShadow, Math.floor(duneCount / 2));
  const duneMatrix = new THREE.Matrix4();
  const duneQuaternion = new THREE.Quaternion();
  const duneScale = new THREE.Vector3();
  const dunePosition = new THREE.Vector3();
  let lightIndex = 0;
  let shadowIndex = 0;
  for (let index = 0; index < duneCount; index += 1) {
    const progress = duneCount <= 1 ? 0.5 : index / (duneCount - 1);
    const radius = 1.25 + index % 3 * 0.28;
    const x = (progress - 0.5) * 19 + Math.sin(index * 1.7) * 0.55;
    const z = -9.4 - Math.abs(progress - 0.5) * 2.3 - index % 2 * 0.5;
    duneQuaternion.setFromEuler(new THREE.Euler(0, Math.sin(index * 0.63) * 0.28, 0));
    duneMatrix.compose(
      dunePosition.set(x, -0.82, z),
      duneQuaternion,
      duneScale.set(radius * 1.9, radius * 0.34, radius * 0.9),
    );
    if (index % 2) lightDunes.setMatrixAt(lightIndex++, duneMatrix);
    else shadowDunes.setMatrixAt(shadowIndex++, duneMatrix);
  }
  lightDunes.instanceMatrix.needsUpdate = true;
  shadowDunes.instanceMatrix.needsUpdate = true;
  lightDunes.receiveShadow = quality !== 'low';
  shadowDunes.receiveShadow = quality !== 'low';
  horizon.add(lightDunes, shadowDunes);

  const skylinePositions = [
    [-8.1, -9.5, 1.0], [-6.75, -8.95, 1.85], [-5.82, -9.65, 0.95],
    [-3.45, -9.35, 1.42], [-1.1, -8.9, 2.08], [1.7, -9.55, 1.08],
    [3.15, -8.92, 1.72], [5.62, -9.5, 0.92], [6.78, -8.88, 1.46], [8.12, -9.65, 0.88],
  ] as const;
  const skylineCount = quality === 'high' ? skylinePositions.length : quality === 'medium' ? 7 : 5;
  const skylineBodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1, 6), materials.sandstoneLight, skylineCount);
  const skylineCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 0.42, 6), materials.gold, skylineCount);
  skylineBodies.name = 'ISLAND_12_DISTANT_CITY_BODY_ARRAY';
  skylineCaps.name = 'ISLAND_12_DISTANT_CITY_CAP_ARRAY';
  for (let index = 0; index < skylineCount; index += 1) {
    const [x, z, height] = skylinePositions[index];
    const width = 0.8 + index % 3 * 0.18;
    duneQuaternion.setFromEuler(new THREE.Euler(0, index * 0.37, 0));
    duneMatrix.compose(dunePosition.set(x, -0.22 + height * 0.5, z), duneQuaternion, duneScale.set(width, height, width));
    skylineBodies.setMatrixAt(index, duneMatrix);
    duneMatrix.compose(dunePosition.set(x, -0.22 + height + 0.2, z), duneQuaternion, duneScale.set(1, 1, 1));
    skylineCaps.setMatrixAt(index, duneMatrix);
  }
  skylineBodies.instanceMatrix.needsUpdate = true;
  skylineCaps.instanceMatrix.needsUpdate = true;
  skylineBodies.castShadow = quality !== 'low';
  horizon.add(skylineBodies, skylineCaps);

  const skylineDistrictPositions = [
    [-7.35, -8.78, 0.62, 0.82], [-6.65, -8.46, 0.82, 1.04], [-5.9, -8.8, 0.58, 0.78],
    [-3.9, -8.7, 0.72, 0.9], [-3.1, -8.42, 0.92, 1.18], [-2.28, -8.75, 0.64, 0.84],
    [2.28, -8.76, 0.64, 0.84], [3.1, -8.42, 0.92, 1.18], [3.9, -8.7, 0.72, 0.9],
    [5.9, -8.8, 0.58, 0.78], [6.65, -8.46, 0.82, 1.04], [7.35, -8.78, 0.62, 0.82],
  ] as const;
  const skylineDistrictCount = quality === 'low' ? 6 : quality === 'medium' ? 9 : skylineDistrictPositions.length;
  const skylineDistrictBodies = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1, 8),
    materials.sandstoneShadow,
    skylineDistrictCount,
  );
  const skylineDistrictDomes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.46, quality === 'high' ? 10 : 7, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.turquoise,
    skylineDistrictCount,
  );
  skylineDistrictBodies.name = 'ISLAND_12_DISTANT_CITY_CLUSTER_BODY_ARRAY';
  skylineDistrictDomes.name = 'ISLAND_12_DISTANT_CITY_CLUSTER_DOME_ARRAY';
  for (let index = 0; index < skylineDistrictCount; index += 1) {
    const [x, z, width, height] = skylineDistrictPositions[index];
    duneQuaternion.setFromEuler(new THREE.Euler(0, index * 0.41, 0));
    duneMatrix.compose(dunePosition.set(x, -0.22 + height * 0.5, z), duneQuaternion, duneScale.set(width, height, width));
    skylineDistrictBodies.setMatrixAt(index, duneMatrix);
    duneMatrix.compose(
      dunePosition.set(x, -0.22 + height, z),
      duneQuaternion,
      duneScale.set(width * 0.84, 0.7 + index % 3 * 0.12, width * 0.84),
    );
    skylineDistrictDomes.setMatrixAt(index, duneMatrix);
  }
  skylineDistrictBodies.instanceMatrix.needsUpdate = true;
  skylineDistrictDomes.instanceMatrix.needsUpdate = true;
  skylineDistrictBodies.castShadow = quality !== 'low';
  horizon.add(skylineDistrictBodies, skylineDistrictDomes);
  compactIsland12StaticPresentationGeometry(horizon, 'ISLAND_12_DUNE_HORIZON');
  horizon.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('horizon-system', horizon, 'horizon')] };
  root.add(horizon);

  const atmosphericLife = createDepthAtmosphericLife(quality);
  root.add(atmosphericLife.root);
  root.add(createSunkenSandsWorldSunAndGlint(quality));
  const oceanWaves = createIsland12OceanWaveField(quality);
  root.add(oceanWaves.root);

  const palms = createPalmInstances(materials, quality, buildLevel);
  root.add(palms);
  addMarketProps(root, materials, quality);

  const dustCount = quality === 'high' ? 90 : quality === 'medium' ? 56 : 30;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.4 + (index % 17) * 0.42;
    dustPositions[index * 3] = Math.cos(angle) * radius;
    dustPositions[index * 3 + 1] = 0.7 + (index % 11) * 0.23;
    dustPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, materials.dust);
  dust.name = 'ISLAND_12_DUST_HEAT_FIELD';
  dust.userData.sculptRuntime = { parts: [registerIsland12RuntimePart('dust-heat-field', dust, 'particles')] };
  root.add(dust);

  root.userData.sculptRuntime = { parts: [
    registerIsland12RuntimePart('ambience-system', root, 'ambience'),
    registerIsland12RuntimePart('landmark-network', root, 'world-integration'),
  ] };
  scene.add(root);
  sharedWater.visible = true;
  sharedWater.position.y = -0.6;
  if (!Array.isArray(sharedWater.material) && sharedWater.material instanceof THREE.MeshPhysicalMaterial) {
    sharedWater.material.copy(materials.waterDeep);
    sharedWater.material.name = 'ISLAND_12_SHARED_DEEP_OASIS_WATER';
    sharedWater.material.opacity = 0.74;
  }

  let rewardRevealResolved = false;
  let rewardGlassHinges: THREE.Group[] = [];
  let rewardToken: THREE.Group | null = null;
  let rewardHalo: THREE.Mesh | null = null;
  let rewardSparkles: THREE.InstancedMesh | null = null;
  let rewardDomeRibs: THREE.InstancedMesh | null = null;
  const rewardOpenQuaternion = new THREE.Quaternion();
  const rewardHingeAxis = new THREE.Vector3(0, 0, 1);
  const resolveRewardRevealNodes = () => {
    if (rewardRevealResolved) return;
    rewardGlassHinges = Array.from({ length: 6 }, (_, index) => (
      scene.getObjectByName(`ISLAND_12_CITADEL_REWARD_GLASS_HINGE_${index + 1}`)
    )).filter((candidate): candidate is THREE.Group => candidate instanceof THREE.Group);
    rewardToken = scene.getObjectByName('ISLAND_12_CITADEL_PRESENTATION_ONLY_PLACEHOLDER_TOKEN') as THREE.Group | null;
    rewardHalo = scene.getObjectByName('ISLAND_12_CITADEL_REWARD_GLOW_HALO') as THREE.Mesh | null;
    rewardSparkles = scene.getObjectByName('ISLAND_12_CITADEL_REWARD_SPARKLE_ARRAY') as THREE.InstancedMesh | null;
    rewardDomeRibs = scene.getObjectByName('ISLAND_12_CITADEL_DOME_RIB_ARRAY') as THREE.InstancedMesh | null;
    rewardRevealResolved = rewardGlassHinges.length === 6 && Boolean(rewardToken && rewardHalo && rewardSparkles);
  };

  const animate = (elapsed: number) => {
    dust.rotation.y = elapsed * 0.018;
    dust.position.y = Math.sin(elapsed * 0.34) * 0.05;
    atmosphericLife.birds.position.x = Math.sin(elapsed * 0.055) * 0.72;
    atmosphericLife.birds.position.y = Math.sin(elapsed * 0.11) * 0.08;
    atmosphericLife.birds.rotation.y = Math.sin(elapsed * 0.04) * 0.06;
    atmosphericLife.haze.position.x = Math.sin(elapsed * 0.024) * 0.42;
    atmosphericLife.haze.position.y = Math.sin(elapsed * 0.035) * 0.04;
    atmosphericLife.hazeMaterial.opacity = 0.11 + Math.sin(elapsed * 0.075) * 0.02;
    oasis.material.emissiveIntensity = 0.14 + Math.sin(elapsed * 0.55) * 0.02;
    materials.water.map?.offset.set(elapsed * 0.006, elapsed * -0.004);
    materials.water.bumpMap?.offset.set(elapsed * -0.005, elapsed * 0.008);
    materials.waterDeep.map?.offset.set(elapsed * 0.004, elapsed * -0.003);
    materials.waterDeep.bumpMap?.offset.set(elapsed * -0.004, elapsed * 0.006);
    materials.waterShallow.map?.offset.set(elapsed * 0.008, elapsed * -0.005);
    materials.waterShallow.bumpMap?.offset.set(elapsed * -0.006, elapsed * 0.009);
    materials.waterCaustic.map?.offset.set(elapsed * 0.01, elapsed * -0.007);
    materials.waterCaustic.opacity = 0.052 + Math.sin(elapsed * 0.42) * 0.01;
    materials.foam.opacity = 0.52 + Math.sin(elapsed * 0.7) * 0.08;
    oceanWaves.animate(elapsed);
    waterDetails.animateShoreBreakers(elapsed);
    waterDetails.pads.rotation.y = Math.sin(elapsed * 0.12) * 0.025;
    waterDetails.reeds.rotation.z = Math.sin(elapsed * 0.34) * 0.018;
    resolveRewardRevealNodes();
    if (rewardRevealResolved && rewardToken && rewardHalo && rewardSparkles) {
      const rawReveal = THREE.MathUtils.clamp((elapsed - 1.1) / 2.6, 0, 1);
      const reveal = rawReveal * rawReveal * (3 - 2 * rawReveal);
      rewardGlassHinges.forEach((hinge, index) => {
        const closedQuaternion = hinge.userData.closedQuaternion as THREE.Quaternion;
        const openAngle = hinge.userData.openAngle as number;
        const staggeredReveal = THREE.MathUtils.smoothstep(
          rawReveal,
          index * 0.035,
          0.72 + index * 0.035,
        );
        rewardOpenQuaternion.setFromAxisAngle(rewardHingeAxis, staggeredReveal * openAngle);
        hinge.quaternion.copy(closedQuaternion).multiply(rewardOpenQuaternion);
      });
      if (rewardDomeRibs) rewardDomeRibs.visible = reveal < 0.72;
      rewardToken.visible = reveal > 0.08;
      rewardToken.rotation.y = elapsed * (0.72 + reveal * 0.42);
      rewardToken.position.y = 0.68 + reveal * 0.18 + Math.sin(elapsed * 1.4) * 0.035 * reveal;
      const tokenScale = 0.48 + reveal * 0.77;
      rewardToken.scale.setScalar(tokenScale);
      rewardHalo.rotation.y = elapsed * 0.38;
      rewardHalo.scale.setScalar(0.72 + reveal * 0.28 + Math.sin(elapsed * 1.8) * 0.04 * reveal);
      if (!Array.isArray(rewardHalo.material) && rewardHalo.material instanceof THREE.MeshBasicMaterial) {
        rewardHalo.material.opacity = 0.12 + reveal * (0.28 + Math.sin(elapsed * 1.65) * 0.08);
      }
      rewardSparkles.rotation.y = -elapsed * 0.31;
      rewardSparkles.position.y = Math.sin(elapsed * 0.9) * 0.035 * reveal;
      rewardSparkles.scale.setScalar(0.45 + reveal * 0.55);
    }
  };
  return { root, animate };
}
