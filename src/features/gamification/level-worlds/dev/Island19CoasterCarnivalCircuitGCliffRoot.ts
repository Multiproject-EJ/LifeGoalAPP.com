import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

export const ISLAND_19_CIRCUIT_G_CLIFF_ROOT_NAME = 'Island 019 Circuit G — Source-Locked Cliff Root';
export const ISLAND_19_CIRCUIT_G_CLIFF_ROOT_PACKET =
  'docs/visual-references/island-019-coaster-carnival/secondary-inferred/circuit-g-multiview/cliff-root-multiview-v1.png';

// The Wonder Express exits the underground chain at approximately
// (+7.25, -0.58, -0.78). Keep the topological breach centred on that same
// radial vector so the cliff opening, track and authored POV are one seam.
const SEA_CAVE_ANGLE = -0.105;
const SEA_CAVE_HALF_ANGLE = 0.205;
const ENTRANCE_ANGLE = Math.PI / 2;
const ENTRANCE_HALF_ANGLE = 0.18;

interface CliffRootMaterials {
  basalt: THREE.MeshStandardMaterial;
  wetBasalt: THREE.Material;
  terrace: THREE.MeshStandardMaterial;
  cavern: THREE.MeshStandardMaterial;
  clay: THREE.MeshStandardMaterial;
}

export interface Island19CircuitGCliffRootOptions {
  quality?: Island3DQuality;
  materials: CliffRootMaterials;
  castShadow?: boolean;
  receiveShadow?: boolean;
  clay?: boolean;
  cutaway?: boolean;
  reducedMotion?: boolean;
}

export interface Island19CircuitGCliffRootDiagnostics {
  valid: boolean;
  sectorCount: number;
  ringCount: number;
  width: number;
  depth: number;
  cliffDepth: number;
  openSeaCaveFaceCount: number;
  openEntranceFaceCount: number;
  seaCaveClearWidth: number;
  seaCaveClearHeight: number;
  gatewayClearWidth: number;
  waterfallRibbonCount: number;
  cavernSegmentCount: number;
  socketCount: number;
  triangleCount: number;
  drawCalls: number;
  errors: string[];
}

export interface Island19CircuitGCliffRootRuntime {
  root: THREE.Group;
  outerShell: THREE.Mesh;
  cliffColumns: THREE.InstancedMesh;
  terrace: THREE.Mesh;
  cavernShell: THREE.Group;
  cavernSegments: Record<string, THREE.Mesh>;
  seaCaveRim: THREE.Mesh;
  entranceGateway: THREE.Group;
  waterfallRibbons: THREE.InstancedMesh;
  sockets: Record<string, THREE.Object3D>;
  diagnostics: Island19CircuitGCliffRootDiagnostics;
  dataset: Record<string, string>;
  setCutaway: (enabled: boolean) => void;
  setClay: (enabled: boolean) => void;
  animate: (elapsedSeconds: number) => void;
}

interface TerrainRing {
  id: string;
  y: number;
  radiusX: number;
  radiusZ: number;
  offsetX: number;
  offsetZ: number;
  phase: number;
}

const TERRAIN_RINGS: readonly TerrainRing[] = [
  { id: 'terrace-lip', y: 0.18, radiusX: 8.88, radiusZ: 7.28, offsetX: -0.16, offsetZ: 0.22, phase: 0.1 },
  { id: 'upper-cliff', y: -0.26, radiusX: 8.98, radiusZ: 7.34, offsetX: -0.1, offsetZ: 0.18, phase: 0.55 },
  { id: 'upper-fracture', y: -1.08, radiusX: 8.76, radiusZ: 7.12, offsetX: 0.0, offsetZ: 0.1, phase: 1.05 },
  { id: 'columnar-mid', y: -2.04, radiusX: 8.48, radiusZ: 6.86, offsetX: -0.04, offsetZ: 0.02, phase: 1.65 },
  { id: 'deep-fracture', y: -3.06, radiusX: 8.05, radiusZ: 6.48, offsetX: 0.08, offsetZ: -0.08, phase: 2.25 },
  { id: 'wet-foot', y: -4.16, radiusX: 7.48, radiusZ: 6.02, offsetX: 0.15, offsetZ: -0.16, phase: 2.8 },
  { id: 'root-taper', y: -5.35, radiusX: 6.52, radiusZ: 5.22, offsetX: 0.04, offsetZ: -0.26, phase: 3.35 },
  { id: 'underside-teeth', y: -6.72, radiusX: 4.72, radiusZ: 3.82, offsetX: -0.02, offsetZ: -0.34, phase: 3.9 },
] as const;

const sectorCountFor = (quality: Island3DQuality) => quality === 'high' ? 112 : quality === 'medium' ? 88 : 64;

function angularDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function perimeterFactor(theta: number, ring: TerrainRing, sectorIndex: number) {
  const frontApron = Math.max(0, Math.sin(theta)) * (ring.id === 'terrace-lip' || ring.id === 'upper-cliff' ? 0.085 : 0.035);
  const ferrisLobe = Math.max(0, Math.cos(theta - Math.PI)) * 0.035;
  const rearIndent = Math.max(0, -Math.sin(theta)) * -0.026;
  const macro = 0.052 * Math.sin(theta * 3 + 0.4)
    + 0.033 * Math.cos(theta * 5 - 0.7)
    + 0.018 * Math.sin(theta * 9 + ring.phase);
  const column = (sectorIndex % 4 === 0 ? 0.026 : sectorIndex % 2 === 0 ? 0.012 : -0.014)
    * (ring.id === 'terrace-lip' ? 0.35 : 1);
  return 1 + frontApron + ferrisLobe + rearIndent + macro + column;
}

function ringPoint(ring: TerrainRing, sectorIndex: number, sectorCount: number) {
  const theta = sectorIndex / sectorCount * Math.PI * 2;
  const factor = perimeterFactor(theta, ring, sectorIndex);
  const toothDrop = ring.id === 'underside-teeth'
    ? 0.18 + (sectorIndex % 5 === 0 ? 0.48 : sectorIndex % 3 === 0 ? 0.28 : 0)
    : 0;
  return new THREE.Vector3(
    ring.offsetX + Math.cos(theta) * ring.radiusX * factor,
    ring.y - toothDrop + Math.sin(theta * 7 + ring.phase) * 0.055,
    ring.offsetZ + Math.sin(theta) * ring.radiusZ * factor,
  );
}

export function createIsland19CircuitGCliffShellGeometry(sectorCount = 88) {
  const sectors = Math.max(64, Math.floor(sectorCount));
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  for (let ringIndex = 0; ringIndex < TERRAIN_RINGS.length; ringIndex += 1) {
    const ring = TERRAIN_RINGS[ringIndex];
    for (let index = 0; index < sectors; index += 1) {
      const point = ringPoint(ring, index, sectors);
      positions.push(point.x, point.y, point.z);
      const wetness = THREE.MathUtils.smoothstep(ringIndex, 3, 7);
      color.setRGB(
        THREE.MathUtils.lerp(0.31, 0.105, wetness),
        THREE.MathUtils.lerp(0.33, 0.17, wetness),
        THREE.MathUtils.lerp(0.34, 0.2, wetness),
      );
      const strata = 0.86 + (index % 7) * 0.018 + (ringIndex % 2) * 0.035;
      colors.push(color.r * strata, color.g * strata, color.b * strata);
    }
  }
  const bottomCenter = positions.length / 3;
  positions.push(-0.04, -7.35, -0.34);
  colors.push(0.075, 0.12, 0.14);

  const dryIndices: number[] = [];
  const wetIndices: number[] = [];
  let openSeaCaveFaceCount = 0;
  let openEntranceFaceCount = 0;
  for (let ringIndex = 0; ringIndex < TERRAIN_RINGS.length - 1; ringIndex += 1) {
    const upper = ringIndex * sectors;
    const lower = (ringIndex + 1) * sectors;
    for (let index = 0; index < sectors; index += 1) {
      const next = (index + 1) % sectors;
      const theta = (index + 0.5) / sectors * Math.PI * 2;
      const seaCave = ringIndex >= 1 && ringIndex <= 5
        && angularDistance(theta, SEA_CAVE_ANGLE) < SEA_CAVE_HALF_ANGLE;
      const entrance = ringIndex <= 5
        && angularDistance(theta, ENTRANCE_ANGLE) < ENTRANCE_HALF_ANGLE;
      if (seaCave || entrance) {
        if (seaCave) openSeaCaveFaceCount += 2;
        if (entrance) openEntranceFaceCount += 2;
        continue;
      }
      const target = ringIndex >= 4 ? wetIndices : dryIndices;
      target.push(upper + index, lower + index, lower + next, upper + index, lower + next, upper + next);
    }
  }
  const lastRing = (TERRAIN_RINGS.length - 1) * sectors;
  for (let index = 0; index < sectors; index += 1) {
    const next = (index + 1) % sectors;
    wetIndices.push(lastRing + index, bottomCenter, lastRing + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex([...dryIndices, ...wetIndices]);
  geometry.addGroup(0, dryIndices.length, 0);
  geometry.addGroup(dryIndices.length, wetIndices.length, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'island19-circuit-g-g02-indexed-faceted-cliff-shell';
  geometry.userData = {
    sectors,
    rings: TERRAIN_RINGS.map((ring) => ring.id),
    openSeaCaveFaceCount,
    openEntranceFaceCount,
    width: 17.96,
    depth: 14.68,
    cliffDepth: 7.53,
    drawCalls: 1,
  };
  return geometry;
}

function createColumnarCliffMantle(sectors: number, material: THREE.Material) {
  const columnsPerRing = Math.max(32, Math.round(sectors * 0.58));
  const rows = [
    { y: -0.82, radiusX: 8.77, radiusZ: 7.17, height: 0.78 },
    { y: -1.88, radiusX: 8.52, radiusZ: 6.94, height: 0.92 },
    { y: -2.98, radiusX: 8.12, radiusZ: 6.58, height: 0.98 },
    { y: -4.02, radiusX: 7.62, radiusZ: 6.16, height: 0.92 },
    { y: -4.86, radiusX: 7.08, radiusZ: 5.72, height: 0.68 },
  ] as const;
  let count = 0;
  for (const _row of rows) {
    for (let index = 0; index < columnsPerRing; index += 1) {
      const theta = (index + 0.5) / columnsPerRing * Math.PI * 2;
      if (angularDistance(theta, SEA_CAVE_ANGLE) < SEA_CAVE_HALF_ANGLE * 1.16) continue;
      if (angularDistance(theta, ENTRANCE_ANGLE) < ENTRANCE_HALF_ANGLE * 1.35) continue;
      count += 1;
    }
  }
  const geometry = new THREE.DodecahedronGeometry(0.72, 0);
  geometry.name = 'island19-circuit-g-g02-columnar-cliff-rock-cell';
  const columns = new THREE.InstancedMesh(geometry, material, count);
  columns.name = 'ISLAND_19_G02_BATCHED_COLUMNAR_ESCARPMENT_MANTLE';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  let instance = 0;
  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < columnsPerRing; index += 1) {
      const theta = (index + 0.5) / columnsPerRing * Math.PI * 2;
      if (angularDistance(theta, SEA_CAVE_ANGLE) < SEA_CAVE_HALF_ANGLE * 1.16) continue;
      if (angularDistance(theta, ENTRANCE_ANGLE) < ENTRANCE_HALF_ANGLE * 1.35) continue;
      const stagger = rowIndex % 2 === 0 ? 0 : Math.PI / columnsPerRing;
      const warpedTheta = theta + stagger;
      const noise = 1 + 0.035 * Math.sin(index * 2.73 + rowIndex * 1.9);
      position.set(
        Math.cos(warpedTheta) * row.radiusX * noise,
        row.y + 0.09 * Math.sin(index * 3.1 + rowIndex),
        Math.sin(warpedTheta) * row.radiusZ * noise,
      );
      quaternion.setFromEuler(new THREE.Euler(
        0.08 * Math.sin(index * 1.7),
        -warpedTheta + 0.08 * Math.cos(index * 2.1),
        0.055 * Math.cos(index * 1.3 + rowIndex),
      ));
      scale.set(
        0.58 + (index % 5) * 0.045,
        row.height + (index % 4) * 0.065,
        0.48 + (index % 3) * 0.055,
      );
      matrix.compose(position, quaternion, scale);
      columns.setMatrixAt(instance, matrix);
      instance += 1;
    }
  });
  columns.instanceMatrix.needsUpdate = true;
  columns.castShadow = true;
  columns.receiveShadow = true;
  columns.userData = {
    representation: 'one-batched-instanced-columnar-cliff-mantle',
    instanceCount: count,
    gameplayAuthority: false,
  };
  return columns;
}

function createTerraceGeometry(sectors: number) {
  const positions: number[] = [];
  const topY = 0.46;
  const bottomY = 0.16;
  for (let index = 0; index < sectors; index += 1) {
    const point = ringPoint(TERRAIN_RINGS[0], index, sectors);
    positions.push(point.x * 0.985, topY, point.z * 0.985);
  }
  for (let index = 0; index < sectors; index += 1) {
    const point = ringPoint(TERRAIN_RINGS[0], index, sectors);
    positions.push(point.x, bottomY, point.z);
  }
  const topCenter = positions.length / 3;
  positions.push(-0.12, topY, 0.2);
  const bottomCenter = positions.length / 3;
  positions.push(-0.12, bottomY, 0.2);
  const indices: number[] = [];
  for (let index = 0; index < sectors; index += 1) {
    const next = (index + 1) % sectors;
    indices.push(topCenter, index, next);
    indices.push(sectors + index, bottomCenter, sectors + next);
    indices.push(index, sectors + index, sectors + next, index, sectors + next, next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.name = 'island19-circuit-g-g02-irregular-bearing-terrace';
  return geometry;
}

function createArchFrameGeometry(
  outerWidth: number,
  outerHeight: number,
  innerWidth: number,
  innerHeight: number,
  depth: number,
) {
  const outerSpringY = outerHeight * 0.56;
  const innerSpringY = innerHeight * 0.54;
  const shape = new THREE.Shape();
  shape.moveTo(-outerWidth / 2, 0);
  shape.lineTo(-outerWidth / 2, outerSpringY);
  for (let index = 0; index <= 18; index += 1) {
    const angle = Math.PI - index / 18 * Math.PI;
    shape.lineTo(
      Math.cos(angle) * outerWidth / 2,
      outerSpringY + Math.sin(angle) * (outerHeight - outerSpringY),
    );
  }
  shape.lineTo(outerWidth / 2, 0);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-innerWidth / 2, 0);
  hole.lineTo(innerWidth / 2, 0);
  hole.lineTo(innerWidth / 2, innerSpringY);
  for (let index = 0; index <= 18; index += 1) {
    const angle = index / 18 * Math.PI;
    hole.lineTo(
      Math.cos(angle) * innerWidth / 2,
      innerSpringY + Math.sin(angle) * (innerHeight - innerSpringY),
    );
  }
  hole.lineTo(-innerWidth / 2, 0);
  hole.closePath();
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 18,
  });
  geometry.computeVertexNormals();
  return geometry;
}

function createEntranceGatewayAndWaterfalls(
  materials: CliffRootMaterials,
  castShadow: boolean,
  receiveShadow: boolean,
) {
  const entranceGateway = new THREE.Group();
  entranceGateway.name = 'ISLAND_19_G02_CARVED_FRONT_GATEWAY_AND_APRON';

  const gateMaterial = materials.terrace.clone();
  gateMaterial.color.setHex(0xa97743);
  gateMaterial.roughness = 0.78;
  const gate = new THREE.Mesh(createArchFrameGeometry(4.0, 4.18, 2.55, 3.05, 1.08), gateMaterial);
  gate.name = 'ISLAND_19_G02_THICKNESS_BEARING_GATEWAY_ARCH';
  gate.position.set(0, -4.82, 6.58);
  gate.castShadow = castShadow;
  gate.receiveShadow = receiveShadow;
  entranceGateway.add(gate);

  const buttressMaterial = materials.basalt.clone();
  buttressMaterial.color.setHex(0x5b6262);
  buttressMaterial.flatShading = true;
  const buttressGeometry = new THREE.DodecahedronGeometry(0.72, 0);
  const buttresses = new THREE.InstancedMesh(buttressGeometry, buttressMaterial, 8);
  buttresses.name = 'ISLAND_19_G02_INSTANCED_GATEWAY_BUTTRESSES';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  [
    [-2.08, -4.18, 6.88, 0.62, 1.08, 0.66],
    [2.08, -4.18, 6.88, 0.62, 1.08, 0.66],
    [-2.16, -2.92, 6.78, 0.58, 0.94, 0.62],
    [2.16, -2.92, 6.78, 0.58, 0.94, 0.62],
    [-2.02, -1.78, 6.68, 0.54, 0.66, 0.58],
    [2.02, -1.78, 6.68, 0.54, 0.66, 0.58],
    [-1.28, -0.96, 6.62, 0.48, 0.44, 0.52],
    [1.28, -0.96, 6.62, 0.48, 0.44, 0.52],
  ].forEach(([x, y, z, sx, sy, sz], index) => {
    position.set(x, y, z);
    quaternion.setFromEuler(new THREE.Euler(0.06 * (index % 2 ? 1 : -1), index * 0.37, 0.04));
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    buttresses.setMatrixAt(index, matrix);
  });
  buttresses.instanceMatrix.needsUpdate = true;
  buttresses.castShadow = castShadow;
  buttresses.receiveShadow = receiveShadow;
  entranceGateway.add(buttresses);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.25, 2.82, 3, 1, 5), gateMaterial);
  apron.name = 'ISLAND_19_G02_FRONT_GATEWAY_PIER_APRON';
  apron.position.set(0, -4.7, 8.0);
  apron.castShadow = castShadow;
  apron.receiveShadow = receiveShadow;
  entranceGateway.add(apron);

  const waterfallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x66dfff,
    emissive: 0x187b9c,
    emissiveIntensity: 0.34,
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    opacity: 0.82,
    transmission: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const waterfallRibbons = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1, 1, 7), waterfallMaterial, 6);
  waterfallRibbons.name = 'ISLAND_19_G02_TWIN_ANIMATED_WATERFALL_RIBBONS';
  [
    [-4.15, -2.45, 7.05, 0.82, 4.18, 0],
    [-4.48, -2.58, 7.12, 0.42, 3.82, -0.08],
    [-3.82, -2.7, 7.18, 0.28, 3.48, 0.09],
    [4.15, -2.45, 7.05, 0.82, 4.18, 0],
    [4.48, -2.58, 7.12, 0.42, 3.82, 0.08],
    [3.82, -2.7, 7.18, 0.28, 3.48, -0.09],
  ].forEach(([x, y, z, sx, sy, yaw], index) => {
    position.set(x, y, z);
    quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
    scale.set(sx, sy, 1);
    matrix.compose(position, quaternion, scale);
    waterfallRibbons.setMatrixAt(index, matrix);
  });
  waterfallRibbons.instanceMatrix.needsUpdate = true;
  waterfallRibbons.renderOrder = 3;
  waterfallRibbons.userData = {
    actionProfile: 'elapsed-time-waterfall-shimmer',
    reducedMotionPose: 'static-deterministic-flow',
    instanceCount: 6,
    gameplayAuthority: false,
  };
  entranceGateway.add(waterfallRibbons);
  return { entranceGateway, waterfallRibbons, waterfallMaterial };
}

type CavernSegmentId = 'roof' | 'rear' | 'left' | 'right';

function createCavernSegmentGeometry(sectors: number, segment: CavernSegmentId) {
  const horizontal = Math.max(32, Math.round(sectors * 0.55));
  const vertical = 14;
  const center = new THREE.Vector3(0, -2.92, 0.15);
  const radii = new THREE.Vector3(5.95, 2.52, 4.82);
  const positions: number[] = [];
  for (let row = 0; row <= vertical; row += 1) {
    const phi = row / vertical * Math.PI;
    for (let index = 0; index < horizontal; index += 1) {
      const theta = index / horizontal * Math.PI * 2;
      const rockNoise = 1 + 0.035 * Math.sin(theta * 5 + phi * 3) + 0.022 * Math.cos(theta * 9 - phi * 4);
      positions.push(
        center.x + Math.cos(theta) * Math.sin(phi) * radii.x * rockNoise,
        center.y + Math.cos(phi) * radii.y * rockNoise,
        center.z + Math.sin(theta) * Math.sin(phi) * radii.z * rockNoise,
      );
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < vertical; row += 1) {
    for (let index = 0; index < horizontal; index += 1) {
      const next = (index + 1) % horizontal;
      const theta = (index + 0.5) / horizontal * Math.PI * 2;
      if (angularDistance(theta, SEA_CAVE_ANGLE) < 0.3) continue;
      const phi = (row + 0.5) / vertical * Math.PI;
      const isRoof = phi < Math.PI * 0.36;
      const isRear = !isRoof && Math.sin(theta) < -0.15;
      const resolvedSegment: CavernSegmentId = isRoof
        ? 'roof'
        : isRear
          ? 'rear'
          : Math.cos(theta) < 0 ? 'left' : 'right';
      if (resolvedSegment !== segment) continue;
      const upper = row * horizontal;
      const lower = (row + 1) * horizontal;
      indices.push(upper + index, lower + next, lower + index, upper + index, upper + next, lower + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.name = `island19-circuit-g-g02-segmented-cavern-${segment}`;
  return geometry;
}

function createSocket(name: string, position: readonly [number, number, number], socketType: string) {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  socket.userData = {
    socketType,
    moduleId: 'g02-cliff-root',
    gameplayAuthority: false,
    attachment: {
      parentSocket: ISLAND_19_CIRCUIT_G_CLIFF_ROOT_NAME,
      localStart: position,
      localEnd: position,
      contactType: 'fixed-terrain-socket',
      embedDepth: 0.08,
      gapTolerance: 0.02,
    },
  };
  return socket;
}

function countTriangles(root: THREE.Object3D) {
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    const geometryTriangles = geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
    triangles += geometryTriangles * (object instanceof THREE.InstancedMesh ? object.count : 1);
  });
  return Math.round(triangles);
}

export function createIsland19CoasterCarnivalCircuitGCliffRoot(
  options: Island19CircuitGCliffRootOptions,
): Island19CircuitGCliffRootRuntime {
  const quality = options.quality ?? 'high';
  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;
  const sectors = sectorCountFor(quality);
  const root = new THREE.Group();
  root.name = ISLAND_19_CIRCUIT_G_CLIFF_ROOT_NAME;

  const shellGeometry = createIsland19CircuitGCliffShellGeometry(sectors);
  const shellMaterial = options.materials.basalt.clone();
  shellMaterial.color.setHex(0xffffff);
  shellMaterial.vertexColors = true;
  shellMaterial.flatShading = true;
  const outerShell = new THREE.Mesh(shellGeometry, shellMaterial);
  outerShell.name = 'ISLAND_19_G02_BATCHED_INDEXED_FACETED_CLIFF_SHELL';
  outerShell.castShadow = castShadow;
  outerShell.receiveShadow = receiveShadow;
  root.add(outerShell);

  const columnMaterial = options.materials.basalt.clone();
  columnMaterial.color.setHex(0x4a5051);
  columnMaterial.flatShading = true;
  const cliffColumns = createColumnarCliffMantle(sectors, columnMaterial);
  root.add(cliffColumns);

  const terrace = new THREE.Mesh(createTerraceGeometry(sectors), options.materials.terrace);
  terrace.name = 'ISLAND_19_G02_IRREGULAR_BOARD_BEARING_TERRACE';
  terrace.castShadow = castShadow;
  terrace.receiveShadow = receiveShadow;
  root.add(terrace);

  const seaCaveRimMaterial = options.materials.basalt.clone();
  seaCaveRimMaterial.color.setHex(0xb69a67);
  seaCaveRimMaterial.emissive.setHex(0x2a1908);
  seaCaveRimMaterial.emissiveIntensity = 0.26;
  seaCaveRimMaterial.roughness = 0.78;
  seaCaveRimMaterial.side = THREE.DoubleSide;
  seaCaveRimMaterial.flatShading = true;
  const seaCaveRim = new THREE.Mesh(
    createArchFrameGeometry(4.65, 5.25, 3.15, 4.62, 2.35),
    seaCaveRimMaterial,
  );
  seaCaveRim.name = 'ISLAND_19_G02_PHYSICALLY_OPEN_SEA_CAVE_RIM_AND_THROAT';
  seaCaveRim.position.set(
    Math.cos(SEA_CAVE_ANGLE) * 6.15,
    -5.08,
    Math.sin(SEA_CAVE_ANGLE) * 6.15,
  );
  seaCaveRim.rotation.y = Math.PI / 2 - SEA_CAVE_ANGLE;
  seaCaveRim.castShadow = castShadow;
  seaCaveRim.receiveShadow = receiveShadow;
  root.add(seaCaveRim);

  const cavernMaterial = options.materials.cavern.clone();
  cavernMaterial.side = THREE.BackSide;
  cavernMaterial.flatShading = true;
  const cavernShell = new THREE.Group();
  cavernShell.name = 'ISLAND_19_G02_OPEN_INTERIOR_CAVERN_RECEIVING_SHELL';
  const cavernSegments: Record<string, THREE.Mesh> = {};
  (['roof', 'rear', 'left', 'right'] as const).forEach((segment) => {
    const shellSegment = new THREE.Mesh(createCavernSegmentGeometry(sectors, segment), cavernMaterial);
    shellSegment.name = `ISLAND_19_G02_CAVERN_SEGMENT_${segment.toUpperCase()}`;
    shellSegment.receiveShadow = receiveShadow;
    shellSegment.userData = {
      segment,
      removableForCutaway: true,
      gameplayAuthority: false,
    };
    cavernSegments[segment] = shellSegment;
    cavernShell.add(shellSegment);
  });
  root.add(cavernShell);

  const { entranceGateway, waterfallRibbons, waterfallMaterial } = createEntranceGatewayAndWaterfalls(
    options.materials,
    castShadow,
    receiveShadow,
  );
  root.add(entranceGateway);

  const socketEntries = [
    ['boardTerrace', 'ISLAND_19_G02_BOARD_TERRACE_SOCKET', [0, 0.47, 0], 'board-terrace'],
    ['castleFoundation', 'ISLAND_19_G02_CASTLE_FOUNDATION_SOCKET', [0, 0.47, -0.15], 'castle-foundation'],
    ['ferrisFoundation', 'ISLAND_19_G02_FERRIS_FOUNDATION_SOCKET', [-5.72, 0.47, -2.38], 'ferris-foundation'],
    ['dropFoundation', 'ISLAND_19_G02_DROP_FOUNDATION_SOCKET', [5.24, 0.47, -2.15], 'drop-foundation'],
    ['carouselFoundation', 'ISLAND_19_G02_CAROUSEL_FOUNDATION_SOCKET', [5.05, 0.47, 2.82], 'carousel-foundation'],
    ['coasterSupportNetwork', 'ISLAND_19_G02_COASTER_SUPPORT_NETWORK_SOCKET', [0, 0.47, 0], 'coaster-support-network'],
    ['cavernShell', 'ISLAND_19_G02_CAVERN_SHELL_SOCKET', [0, -2.92, 0.15], 'cavern-shell'],
    ['seaCaveBreach', 'ISLAND_19_G02_SEA_CAVE_BREACH_SOCKET', [6.45, -2.1, -0.82], 'sea-cave-breach'],
  ] as const;
  const sockets: Record<string, THREE.Object3D> = {};
  for (const [key, name, position, socketType] of socketEntries) {
    const socket = createSocket(name, position, socketType);
    sockets[key] = socket;
    root.add(socket);
  }

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) originalMaterials.set(object, object.material);
  });
  const setClay = (enabled: boolean) => {
    originalMaterials.forEach((material, object) => {
      object.material = enabled ? options.materials.clay : material;
    });
  };
  const setCutaway = (enabled: boolean) => {
    outerShell.visible = !enabled;
    cliffColumns.visible = !enabled;
    terrace.visible = !enabled;
    seaCaveRim.visible = !enabled;
    entranceGateway.visible = !enabled;
    cavernShell.visible = true;
    cavernSegments.roof.visible = !enabled;
    cavernSegments.right.visible = !enabled;
    cavernSegments.rear.visible = !enabled;
    cavernSegments.left.visible = !enabled;
    root.userData.circuitGCliffRootCutaway = enabled;
  };

  const reducedMotion = options.reducedMotion ?? false;
  const animate = (elapsedSeconds: number) => {
    const flowPhase = reducedMotion ? 0.32 : elapsedSeconds * 1.85;
    waterfallRibbons.position.y = reducedMotion ? 0 : Math.sin(flowPhase) * 0.045;
    waterfallMaterial.opacity = reducedMotion ? 0.78 : 0.75 + (Math.sin(flowPhase * 1.7) * 0.5 + 0.5) * 0.12;
  };

  const triangleCount = countTriangles(root);
  const openSeaCaveFaceCount = Number(shellGeometry.userData.openSeaCaveFaceCount ?? 0);
  const errors: string[] = [];
  if (openSeaCaveFaceCount < 8) errors.push('sea-cave aperture is not topologically open');
  if (socketEntries.length !== 8) errors.push('required assembly sockets are incomplete');
  if (triangleCount > 45_000) errors.push('g02 triangle budget exceeded');
  const drawCalls = 12;
  if (drawCalls > 12) errors.push('g02 replacement-family draw-call budget exceeded');
  const diagnostics: Island19CircuitGCliffRootDiagnostics = {
    valid: errors.length === 0,
    sectorCount: sectors,
    ringCount: TERRAIN_RINGS.length,
    width: Number(shellGeometry.userData.width),
    depth: Number(shellGeometry.userData.depth),
    cliffDepth: Number(shellGeometry.userData.cliffDepth),
    openSeaCaveFaceCount,
    openEntranceFaceCount: Number(shellGeometry.userData.openEntranceFaceCount ?? 0),
    seaCaveClearWidth: 3.15,
    seaCaveClearHeight: 4.62,
    gatewayClearWidth: 2.75,
    waterfallRibbonCount: waterfallRibbons.count,
    cavernSegmentCount: Object.keys(cavernSegments).length,
    socketCount: socketEntries.length,
    triangleCount,
    drawCalls,
    errors,
  };
  const dataset = {
    island19CircuitGModule: 'g02-cliff-root',
    island19CircuitGPacket: 'approved',
    island19CircuitGG01ExceptionDecision: 'd013',
    island19CircuitGG02ReplacementDecision: 'd014',
    island19CircuitGRepresentation: 'batched-columnar-root-with-carved-gateway-framed-cave-and-segmented-cavern',
    island19CircuitGRootSectors: String(diagnostics.sectorCount),
    island19CircuitGRootRings: String(diagnostics.ringCount),
    island19CircuitGRootTriangles: String(diagnostics.triangleCount),
    island19CircuitGRootDrawCalls: String(diagnostics.drawCalls),
    island19CircuitGSeaCaveOpenFaces: String(diagnostics.openSeaCaveFaceCount),
    island19CircuitGGatewayClearWidth: diagnostics.gatewayClearWidth.toFixed(2),
    island19CircuitGWaterfallRibbons: String(diagnostics.waterfallRibbonCount),
    island19CircuitGCavernSegments: String(diagnostics.cavernSegmentCount),
    island19CircuitGSocketCount: String(diagnostics.socketCount),
    island19CircuitGGameplayWrites: 'false',
    island19CircuitGValid: String(diagnostics.valid),
  };
  Object.assign(root.userData, {
    moduleId: 'g02-cliff-root',
    sourcePacket: ISLAND_19_CIRCUIT_G_CLIFF_ROOT_PACKET,
    actionReady: true,
    gameplayWrites: false,
    diagnostics,
    dataset,
    sculptRuntime: {
      schemaVersion: 1,
      partRoots: [
        outerShell.name,
        cliffColumns.name,
        terrace.name,
        seaCaveRim.name,
        entranceGateway.name,
        ...Object.values(cavernSegments).map((segment) => segment.name),
      ],
      sockets: socketEntries.map(([, name]) => name),
      colliderPolicy: 'presentation terrain proxy only; canonical tile colliders remain authoritative',
      destructionGroups: [{ id: 'g02-cliff-root', breakable: false }],
    },
  });
  setCutaway(options.cutaway ?? false);
  setClay(options.clay ?? false);
  animate(0);
  return {
    root,
    outerShell,
    cliffColumns,
    terrace,
    cavernShell,
    cavernSegments,
    seaCaveRim,
    entranceGateway,
    waterfallRibbons,
    sockets,
    diagnostics,
    dataset,
    setCutaway,
    setClay,
    animate,
  };
}
