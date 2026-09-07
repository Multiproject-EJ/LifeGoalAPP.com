import * as THREE from 'three';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
  type Island3DQuality,
} from './island5ThreePilotContract';

export const ISLAND_19_SOURCE_LOFT_WORLD_NAME = 'Island 019 Coaster Carnival — Circuit D source loft blockout';
export const ISLAND_19_SOURCE_LOFT_PATH_OWNER = 'island19-circuit-d-source-section-table';
export const ISLAND_19_SOURCE_LOFT_PART_IDS = [
  'p01-continuous-rock-island',
  'p08-coaster-support-foundation',
  'p09-coaster-upper-crest',
  'p10-coaster-lower-circuit',
  'p11-momentum-station',
  'p14-ferris-wheel-foundation',
  'p18-drop-tower-foundation',
  'p21-carousel-platform',
  'p24-loopmaster-castle-portal',
] as const;

export type Island19SourceLoftPartId = typeof ISLAND_19_SOURCE_LOFT_PART_IDS[number];

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const SECTION_BOUNDARY_VERTICES = 8;
const OUTER_RUNNER_RADIUS = 0.082;
const INNER_RUNNER_RADIUS = 0.043;
const OUTER_RUNNER_HALF_SPAN = 0.34;
const INNER_RUNNER_HALF_SPAN = 0.22;
const TRAIN_HALF_WIDTH = 0.48;
const TRAIN_TOP = 0.7;
const TRAIN_BOTTOM = 0.25;
const ROUTE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
const ROUTE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export const ISLAND_19_SOURCE_LOFT_PORTAL = {
  centerX: 0,
  centerZ: 0,
  halfDepth: 1.28,
  clearHalfWidth: 0.9,
  clearBottomY: 0.18,
  clearTopY: 2.08,
  lintelBottomY: 2.16,
} as const;

export interface Island19SourceLoftMaterials {
  basalt: THREE.MeshStandardMaterial;
  terrace: THREE.MeshStandardMaterial;
  routeStone: THREE.MeshStandardMaterial;
  redRail: THREE.MeshPhysicalMaterial;
  ivoryRail: THREE.MeshStandardMaterial;
  goldSupport: THREE.MeshPhysicalMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  ivoryStone: THREE.MeshStandardMaterial;
  tealMetal: THREE.MeshPhysicalMaterial;
  carouselRed: THREE.MeshStandardMaterial;
}

export interface SourceLoftBoundary {
  outerLeft: readonly THREE.Vector3[];
  outerRight: readonly THREE.Vector3[];
  innerLeft: readonly THREE.Vector3[];
  innerRight: readonly THREE.Vector3[];
}

export interface SourceLoftStation {
  index: number;
  phase: 'portal-rear' | 'climb-crest' | 's-descent-right' | 'lower-foreground' | 'rear-return';
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  bankRadians: number;
  boundary: SourceLoftBoundary;
}

export interface Island19SourceLoftFrame {
  u: number;
  distance: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  bankRadians: number;
}

export interface Island19SourceLoftTrainPose extends Island19SourceLoftFrame {
  quaternion: THREE.Quaternion;
}

export interface Island19SourceLoftPartRecord {
  id: Island19SourceLoftPartId;
  nodeName: string;
  triangles: number;
}

export interface Island19SourceLoftDiagnostic {
  valid: boolean;
  stationCount: number;
  sectionBoundaryVertices: number;
  totalLength: number;
  maximumStationSpacing: number;
  seamDistance: number;
  seamTangentDot: number;
  nonManifoldEdges: number;
  rootSectorCount: number;
  rootRingCount: number;
  rootDepthToTopWidthRatio: number;
  portalSamples: number;
  portalSideMargin: number;
  portalTopMargin: number;
  portalBottomMargin: number;
  landmarkMinimumSeparation: number;
  routeViolations: string[];
  manifestValid: boolean;
  quaternionNorm: number;
  errors: string[];
}

export interface Island19SourceLoftWorldOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materials?: Island19SourceLoftMaterials;
}

export interface Island19SourceLoftWorldRuntime {
  root: THREE.Group;
  sectionTable: SourceLoftSectionTable;
  materials: Island19SourceLoftMaterials;
  parts: Island19SourceLoftPartRecord[];
  diagnostics: Island19SourceLoftDiagnostic;
  dataset: Record<string, string>;
  getTrainPose: (elapsedSeconds: number, speedWorldUnitsPerSecond?: number, distanceOffset?: number) => Island19SourceLoftTrainPose;
}

interface TracePhase {
  id: SourceLoftStation['phase'];
  samples: number;
  points: readonly THREE.Vector3[];
}

interface TerrainRing {
  id: 'terrace' | 'shoulder' | 'upper-cliff' | 'mid-cliff' | 'lower-cliff' | 'wet-foot' | 'underside';
  y: number;
  radiusX: number;
  radiusZ: number;
  offsetX: number;
  offsetZ: number;
  phase: number;
}

const TERRAIN_RINGS: readonly TerrainRing[] = [
  { id: 'terrace', y: 0.34, radiusX: 7.12, radiusZ: 5.86, offsetX: 0, offsetZ: 0.16, phase: 0.12 },
  { id: 'shoulder', y: 0.02, radiusX: 7.28, radiusZ: 6.02, offsetX: -0.03, offsetZ: 0.12, phase: 0.63 },
  { id: 'upper-cliff', y: -0.76, radiusX: 7.14, radiusZ: 5.94, offsetX: 0.04, offsetZ: 0.06, phase: 1.17 },
  { id: 'mid-cliff', y: -1.92, radiusX: 6.82, radiusZ: 5.62, offsetX: -0.06, offsetZ: -0.02, phase: 1.83 },
  { id: 'lower-cliff', y: -3.12, radiusX: 6.38, radiusZ: 5.24, offsetX: 0.05, offsetZ: -0.12, phase: 2.29 },
  { id: 'wet-foot', y: -4.66, radiusX: 5.72, radiusZ: 4.68, offsetX: 0, offsetZ: -0.2, phase: 2.88 },
  { id: 'underside', y: -5.86, radiusX: 3.92, radiusZ: 3.18, offsetX: 0.02, offsetZ: -0.24, phase: 3.41 },
] as const;

const qSectors = (quality: Island3DQuality) => quality === 'high' ? 80 : quality === 'medium' ? 64 : 48;
const qStationScale = (quality: Island3DQuality) => quality === 'low' ? 1.25 : quality === 'medium' ? 1.5 : 1.75;
const wrapDistance = (distance: number, total: number) => THREE.MathUtils.euclideanModulo(distance, total);

export function createIsland19SourceLoftMaterials(): Island19SourceLoftMaterials {
  return {
    basalt: new THREE.MeshStandardMaterial({ color: 0x3f4545, roughness: 0.92, metalness: 0.01 }),
    terrace: new THREE.MeshStandardMaterial({ color: 0x55743f, roughness: 0.86, metalness: 0.01 }),
    routeStone: new THREE.MeshStandardMaterial({ color: 0xd8c9a7, roughness: 0.76, metalness: 0.01 }),
    redRail: new THREE.MeshPhysicalMaterial({ color: 0xb73524, roughness: 0.3, metalness: 0.72, clearcoat: 0.28, clearcoatRoughness: 0.22 }),
    ivoryRail: new THREE.MeshStandardMaterial({ color: 0xead5aa, roughness: 0.44, metalness: 0.42 }),
    goldSupport: new THREE.MeshPhysicalMaterial({ color: 0xb67b2f, roughness: 0.38, metalness: 0.8, clearcoat: 0.12 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x29252a, roughness: 0.38, metalness: 0.82 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xa9573c, roughness: 0.7, metalness: 0.02 }),
    ivoryStone: new THREE.MeshStandardMaterial({ color: 0xe1cfab, roughness: 0.68, metalness: 0.02 }),
    tealMetal: new THREE.MeshPhysicalMaterial({ color: 0x287b79, roughness: 0.46, metalness: 0.58, clearcoat: 0.12 }),
    carouselRed: new THREE.MeshStandardMaterial({ color: 0xa94736, roughness: 0.55, metalness: 0.08 }),
  };
}

function terrainRadiusFactor(ring: TerrainRing, theta: number) {
  const front = Math.max(0, Math.sin(theta));
  const rear = Math.max(0, -Math.sin(theta));
  const side = Math.abs(Math.cos(theta));
  return 1
    + 0.045 * Math.sin(theta * 3 + ring.phase)
    + 0.026 * Math.cos(theta * 5 - ring.phase * 0.7)
    + front * (ring.id === 'terrace' || ring.id === 'shoulder' ? 0.065 : 0.025)
    - rear * (ring.id === 'underside' ? 0.06 : 0.012)
    + side * (ring.id === 'mid-cliff' ? 0.025 : 0);
}

export function createIsland19SourceLoftRootGeometry(sectors = 64) {
  const sectorCount = Math.max(48, Math.floor(sectors));
  const positions: number[] = [];
  for (const ring of TERRAIN_RINGS) {
    for (let i = 0; i < sectorCount; i += 1) {
      const theta = i / sectorCount * Math.PI * 2;
      const factor = terrainRadiusFactor(ring, theta);
      positions.push(
        ring.offsetX + Math.cos(theta) * ring.radiusX * factor,
        ring.y + 0.035 * Math.sin(theta * 4 + ring.phase),
        ring.offsetZ + Math.sin(theta) * ring.radiusZ * factor,
      );
    }
  }
  const topCenter = positions.length / 3;
  positions.push(0, TERRAIN_RINGS[0].y, 0.08);
  const bottomCenter = positions.length / 3;
  positions.push(0.02, -6.46, -0.24);
  const indices: number[] = [];
  for (let i = 0; i < sectorCount; i += 1) {
    const next = (i + 1) % sectorCount;
    indices.push(topCenter, i, next);
  }
  for (let ringIndex = 0; ringIndex < TERRAIN_RINGS.length - 1; ringIndex += 1) {
    const upper = ringIndex * sectorCount;
    const lower = (ringIndex + 1) * sectorCount;
    for (let i = 0; i < sectorCount; i += 1) {
      const next = (i + 1) % sectorCount;
      indices.push(upper + i, lower + i, lower + next, upper + i, lower + next, upper + next);
    }
  }
  const lastRing = (TERRAIN_RINGS.length - 1) * sectorCount;
  for (let i = 0; i < sectorCount; i += 1) {
    const next = (i + 1) % sectorCount;
    indices.push(lastRing + i, bottomCenter, lastRing + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'island19-source-loft-welded-root-geometry';
  geometry.userData = { sectors: sectorCount, rings: TERRAIN_RINGS.map((ring) => ring.id), weldedUnderside: true };
  return geometry;
}

function segmentLengths(points: readonly THREE.Vector3[]) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += points[i].distanceTo(points[i - 1]);
    lengths.push(total);
  }
  return { lengths, total };
}

function resampleTracePhase(phase: TracePhase) {
  const { lengths, total } = segmentLengths(phase.points);
  const result: Array<{ phase: SourceLoftStation['phase']; center: THREE.Vector3 }> = [];
  for (let sample = 0; sample < phase.samples; sample += 1) {
    const target = total * sample / phase.samples;
    let segment = lengths.findIndex((length) => length >= target);
    if (segment < 0) segment = lengths.length - 1;
    const startDistance = segment === 0 ? 0 : lengths[segment - 1];
    const segmentLength = Math.max(1e-6, lengths[segment] - startDistance);
    const t = (target - startDistance) / segmentLength;
    result.push({ phase: phase.id, center: phase.points[segment].clone().lerp(phase.points[segment + 1], t) });
  }
  return result;
}

function sourceTracePhases(scale: number): TracePhase[] {
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const samples = (base: number) => Math.max(base, Math.round(base * scale));
  return [
    {
      id: 'portal-rear', samples: samples(24), points: [
        p(0, 1.0, -4.3), p(0, 1.0, -3.25), p(0, 1.0, -1.2), p(0, 1.02, 1.2), p(-0.32, 1.04, 2.32),
      ],
    },
    {
      id: 'climb-crest', samples: samples(48), points: [
        p(-0.32, 1.04, 2.32), p(-2.65, 1.2, 2.72), p(-3.58, 3.55, 2.12), p(-4.22, 6.45, 1.02),
        p(-4.18, 7.95, 0.45), p(-3.72, 8.74, 0.08), p(-3.05, 9.08, -0.12), p(-2.25, 9.04, -0.18),
        p(-1.45, 8.72, -0.06), p(-0.62, 7.86, 0.18),
      ],
    },
    {
      id: 's-descent-right', samples: samples(40), points: [
        p(-0.62, 7.86, 0.18), p(0.28, 6.55, 0.34), p(-0.42, 5.12, 0.68), p(-0.82, 4.05, 0.72),
        p(-0.28, 3.25, 0.52), p(1.35, 2.54, 0.62), p(3.38, 2.0, 1.02), p(4.88, 1.55, 1.92),
      ],
    },
    {
      id: 'lower-foreground', samples: samples(56), points: [
        p(4.88, 1.55, 1.92), p(5.15, 1.04, 3.28), p(4.46, 0.94, 4.22), p(2.38, 0.88, 4.76),
        p(0, 0.86, 4.96), p(-2.55, 0.89, 4.74), p(-4.52, 0.96, 4.08), p(-5.08, 1.0, 2.62),
      ],
    },
    {
      id: 'rear-return', samples: samples(24), points: [
        p(-5.08, 1.0, 2.62), p(-5.22, 0.98, 0.44), p(-4.74, 0.98, -2.1), p(-3.18, 0.99, -3.72),
        p(-1.45, 1.0, -4.3), p(0, 1.0, -4.3),
      ],
    },
  ];
}

function makeBoundaryLoop(center: THREE.Vector3, side: THREE.Vector3, up: THREE.Vector3, lateral: number, radius: number) {
  const loop: THREE.Vector3[] = [];
  for (let vertex = 0; vertex < SECTION_BOUNDARY_VERTICES; vertex += 1) {
    const angle = vertex / SECTION_BOUNDARY_VERTICES * Math.PI * 2;
    loop.push(center.clone()
      .addScaledVector(side, lateral + Math.cos(angle) * radius)
      .addScaledVector(up, Math.sin(angle) * radius));
  }
  return loop;
}

function deriveStationBoundary(center: THREE.Vector3, tangent: THREE.Vector3, bankRadians: number): Omit<SourceLoftStation, 'index' | 'phase'> {
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize();
  if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
  const bank = new THREE.Quaternion().setFromAxisAngle(tangent, bankRadians);
  side.applyQuaternion(bank).normalize();
  up.applyQuaternion(bank).normalize();
  return {
    center: center.clone(), tangent: tangent.clone(), side, up, bankRadians,
    boundary: {
      outerLeft: makeBoundaryLoop(center, side, up, -OUTER_RUNNER_HALF_SPAN, OUTER_RUNNER_RADIUS),
      outerRight: makeBoundaryLoop(center, side, up, OUTER_RUNNER_HALF_SPAN, OUTER_RUNNER_RADIUS),
      innerLeft: makeBoundaryLoop(center, side, up, -INNER_RUNNER_HALF_SPAN, INNER_RUNNER_RADIUS),
      innerRight: makeBoundaryLoop(center, side, up, INNER_RUNNER_HALF_SPAN, INNER_RUNNER_RADIUS),
    },
  };
}

export class SourceLoftSectionTable {
  readonly stations: readonly SourceLoftStation[];
  readonly uniqueStationCount: number;
  readonly cumulativeLengths: readonly number[];
  readonly totalLength: number;
  readonly phaseRanges: Readonly<Record<SourceLoftStation['phase'], readonly [number, number]>>;

  constructor(quality: Island3DQuality = 'medium') {
    const samples = sourceTracePhases(qStationScale(quality)).flatMap(resampleTracePhase);
    const centers = samples.map((sample) => sample.center);
    const stations: SourceLoftStation[] = [];
    for (let i = 0; i < centers.length; i += 1) {
      const previous = centers[(i - 1 + centers.length) % centers.length];
      const next = centers[(i + 1) % centers.length];
      const tangent = next.clone().sub(previous).normalize();
      const bank = samples[i].phase === 'climb-crest' ? THREE.MathUtils.degToRad(-4) : samples[i].phase === 's-descent-right' ? THREE.MathUtils.degToRad(5) : 0;
      stations.push({ index: i, phase: samples[i].phase, ...deriveStationBoundary(centers[i], tangent, bank) });
    }
    stations.push({
      ...stations[0], index: stations.length, center: stations[0].center.clone(), tangent: stations[0].tangent.clone(),
      side: stations[0].side.clone(), up: stations[0].up.clone(),
      boundary: {
        outerLeft: stations[0].boundary.outerLeft.map((v) => v.clone()), outerRight: stations[0].boundary.outerRight.map((v) => v.clone()),
        innerLeft: stations[0].boundary.innerLeft.map((v) => v.clone()), innerRight: stations[0].boundary.innerRight.map((v) => v.clone()),
      },
    });
    this.stations = stations;
    this.uniqueStationCount = stations.length - 1;
    const cumulative = [0];
    for (let i = 1; i < stations.length; i += 1) cumulative.push(cumulative[i - 1] + stations[i].center.distanceTo(stations[i - 1].center));
    this.cumulativeLengths = cumulative;
    this.totalLength = cumulative[cumulative.length - 1];
    const ranges = {} as Record<SourceLoftStation['phase'], [number, number]>;
    for (const phase of ['portal-rear', 'climb-crest', 's-descent-right', 'lower-foreground', 'rear-return'] as const) {
      const first = samples.findIndex((sample) => sample.phase === phase);
      let last = first;
      for (let i = first; i < samples.length && samples[i].phase === phase; i += 1) last = i;
      ranges[phase] = [first, last];
    }
    this.phaseRanges = ranges;
  }

  getFrameAtDistance(distance: number): Island19SourceLoftFrame {
    const wrapped = wrapDistance(distance, this.totalLength);
    let high = 1;
    while (high < this.cumulativeLengths.length && this.cumulativeLengths[high] < wrapped) high += 1;
    high = Math.min(high, this.stations.length - 1);
    const low = Math.max(0, high - 1);
    const start = this.cumulativeLengths[low];
    const span = Math.max(1e-8, this.cumulativeLengths[high] - start);
    const alpha = (wrapped - start) / span;
    const position = this.stations[low].center.clone().lerp(this.stations[high].center, alpha);
    const tangent = this.stations[low].tangent.clone().lerp(this.stations[high].tangent, alpha).normalize();
    const side = this.stations[low].side.clone().lerp(this.stations[high].side, alpha).normalize();
    const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
    side.crossVectors(up, tangent).normalize();
    return { u: wrapped / this.totalLength, distance: wrapped, position, tangent, side, up, bankRadians: THREE.MathUtils.lerp(this.stations[low].bankRadians, this.stations[high].bankRadians, alpha) };
  }

  getFrameAtU(u: number) {
    return this.getFrameAtDistance(THREE.MathUtils.euclideanModulo(u, 1) * this.totalLength);
  }
}

export function createIsland19SourceLoftSectionTable(quality: Island3DQuality = 'medium') {
  return new SourceLoftSectionTable(quality);
}

function cappedLoftGeometry(stations: readonly SourceLoftStation[], indices: readonly number[], boundary: keyof SourceLoftBoundary) {
  const positions: number[] = [];
  for (const index of indices) for (const vertex of stations[index].boundary[boundary]) positions.push(vertex.x, vertex.y, vertex.z);
  const startCenter = positions.length / 3;
  const first = stations[indices[0]].boundary[boundary];
  const firstCenter = first.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / first.length);
  positions.push(firstCenter.x, firstCenter.y, firstCenter.z);
  const endCenter = positions.length / 3;
  const last = stations[indices[indices.length - 1]].boundary[boundary];
  const lastCenter = last.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / last.length);
  positions.push(lastCenter.x, lastCenter.y, lastCenter.z);
  const faces: number[] = [];
  for (let section = 0; section < indices.length - 1; section += 1) {
    for (let vertex = 0; vertex < SECTION_BOUNDARY_VERTICES; vertex += 1) {
      const next = (vertex + 1) % SECTION_BOUNDARY_VERTICES;
      const a = section * SECTION_BOUNDARY_VERTICES + vertex;
      const b = section * SECTION_BOUNDARY_VERTICES + next;
      const c = (section + 1) * SECTION_BOUNDARY_VERTICES + next;
      const d = (section + 1) * SECTION_BOUNDARY_VERTICES + vertex;
      faces.push(a, d, c, a, c, b);
    }
  }
  const lastBase = (indices.length - 1) * SECTION_BOUNDARY_VERTICES;
  for (let vertex = 0; vertex < SECTION_BOUNDARY_VERTICES; vertex += 1) {
    const next = (vertex + 1) % SECTION_BOUNDARY_VERTICES;
    faces.push(startCenter, next, vertex, endCenter, lastBase + vertex, lastBase + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

function indexRange(start: number, end: number, maximum: number) {
  const result: number[] = [];
  let index = start;
  while (true) {
    result.push(index);
    if (index === end) break;
    index = (index + 1) % maximum;
  }
  return result;
}

function addMesh(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, name: string, shadows: boolean) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  group.add(mesh);
  return mesh;
}

function addCylinderBetween(group: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, name: string, shadows: boolean) {
  const delta = b.clone().sub(a);
  if (delta.lengthSq() < 1e-7) return undefined;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(WORLD_UP, delta.normalize());
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  group.add(mesh);
  return mesh;
}

function markPart(group: THREE.Group, id: Island19SourceLoftPartId) {
  group.name = `island19-source-loft-${id}`;
  group.userData.partId = id;
  group.userData.sculptPartId = id;
  return group;
}

function createTrackParts(table: SourceLoftSectionTable, materials: Island19SourceLoftMaterials, shadows: boolean) {
  const upper = markPart(new THREE.Group(), 'p09-coaster-upper-crest');
  const lower = markPart(new THREE.Group(), 'p10-coaster-lower-circuit');
  const upperStart = table.phaseRanges['climb-crest'][0];
  const upperEnd = table.phaseRanges['s-descent-right'][1];
  const lowerStart = upperEnd;
  const lowerEnd = upperStart;
  const upperIndices = indexRange(upperStart, upperEnd, table.uniqueStationCount);
  const lowerIndices = indexRange(lowerStart, lowerEnd, table.uniqueStationCount);
  for (const boundary of ['outerLeft', 'outerRight'] as const) {
    addMesh(upper, cappedLoftGeometry(table.stations, upperIndices, boundary), materials.redRail, `upper-${boundary}`, shadows);
    addMesh(lower, cappedLoftGeometry(table.stations, lowerIndices, boundary), materials.redRail, `lower-${boundary}`, shadows);
  }
  for (const boundary of ['innerLeft', 'innerRight'] as const) {
    addMesh(upper, cappedLoftGeometry(table.stations, upperIndices, boundary), materials.ivoryRail, `upper-${boundary}`, shadows);
    addMesh(lower, cappedLoftGeometry(table.stations, lowerIndices, boundary), materials.ivoryRail, `lower-${boundary}`, shadows);
  }
  const tieEvery = Math.max(2, Math.round(table.uniqueStationCount / 90));
  for (let index = 0; index < table.uniqueStationCount; index += tieEvery) {
    const station = table.stations[index];
    const a = station.center.clone().addScaledVector(station.side, -0.46).addScaledVector(station.up, -0.035);
    const b = station.center.clone().addScaledVector(station.side, 0.46).addScaledVector(station.up, -0.035);
    const target = index >= upperStart && index <= upperEnd ? upper : lower;
    addCylinderBetween(target, a, b, 0.035, materials.goldSupport, `cross-tie-${index}`, shadows);
  }
  return { upper, lower };
}

function createSupportPart(table: SourceLoftSectionTable, materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p08-coaster-support-foundation');
  const stride = Math.max(7, Math.round(table.uniqueStationCount / 23));
  for (let index = 0; index < table.uniqueStationCount; index += stride) {
    const station = table.stations[index];
    if (station.center.y < 1.25 || Math.abs(station.center.z) < ISLAND_19_SOURCE_LOFT_PORTAL.halfDepth + 0.35) continue;
    for (const sideSign of [-1, 1]) {
      const rail = station.center.clone().addScaledVector(station.side, sideSign * 0.37).addScaledVector(station.up, -0.08);
      const foot = new THREE.Vector3(rail.x + sideSign * 0.16, 0.35, rail.z);
      const radial = Math.hypot(foot.x, foot.z);
      if (radial >= ROUTE_INNER_RADIUS && radial <= ROUTE_OUTER_RADIUS) {
        const safeRadius = radial < ISLAND_3D_ROUTE_RADIUS ? ROUTE_INNER_RADIUS - 0.12 : ROUTE_OUTER_RADIUS + 0.12;
        foot.multiplyScalar(safeRadius / Math.max(radial, 1e-6));
        foot.y = 0.35;
      }
      addCylinderBetween(group, foot, rail, 0.055, materials.goldSupport, `support-${index}-${sideSign}`, shadows);
      const footing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3), materials.darkSteel);
      footing.position.copy(foot).setY(0.28);
      footing.name = `footing-${index}-${sideSign}`;
      group.add(footing);
    }
  }
  group.userData.routeClearanceAnnulus = [ROUTE_INNER_RADIUS, ROUTE_OUTER_RADIUS];
  return group;
}

function createMomentumStation(materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p11-momentum-station');
  group.position.set(-4.85, 0.34, 3.15);
  addMesh(group, new THREE.BoxGeometry(1.35, 0.45, 1.0), materials.terracotta, 'station-plinth', shadows).position.y = 0.23;
  addMesh(group, new THREE.BoxGeometry(1.08, 1.22, 0.72), materials.tealMetal, 'station-house', shadows).position.y = 0.98;
  const roof = addMesh(group, new THREE.ConeGeometry(0.95, 0.62, 4), materials.terracotta, 'station-roof', shadows);
  roof.position.y = 1.9;
  roof.rotation.y = Math.PI / 4;
  return group;
}

function createFerrisFoundation(materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p14-ferris-wheel-foundation');
  group.position.set(-5.15, 0.36, -1.72);
  addMesh(group, new THREE.BoxGeometry(1.45, 0.3, 1.0), materials.terracotta, 'ferris-plinth', shadows).position.y = 0.15;
  const wheel = addMesh(group, new THREE.TorusGeometry(1.35, 0.1, 8, 32), materials.tealMetal, 'ferris-wheel-mass', shadows);
  wheel.position.y = 2.18;
  wheel.rotation.y = Math.PI / 2;
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2;
    addCylinderBetween(group, new THREE.Vector3(0, 2.18, 0), new THREE.Vector3(0, 2.18 + Math.sin(angle) * 1.28, Math.cos(angle) * 1.28), 0.025, materials.goldSupport, `ferris-spoke-${i}`, shadows);
  }
  addCylinderBetween(group, new THREE.Vector3(0, 0.3, -0.48), new THREE.Vector3(0, 2.18, 0), 0.07, materials.goldSupport, 'ferris-leg-a', shadows);
  addCylinderBetween(group, new THREE.Vector3(0, 0.3, 0.48), new THREE.Vector3(0, 2.18, 0), 0.07, materials.goldSupport, 'ferris-leg-b', shadows);
  return group;
}

function createDropFoundation(materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p18-drop-tower-foundation');
  group.position.set(4.92, 0.34, -1.82);
  addMesh(group, new THREE.BoxGeometry(1.05, 0.35, 1.05), materials.terracotta, 'drop-plinth', shadows).position.y = 0.18;
  addMesh(group, new THREE.BoxGeometry(0.42, 4.55, 0.42), materials.tealMetal, 'drop-spire', shadows).position.y = 2.48;
  addMesh(group, new THREE.BoxGeometry(1.12, 0.28, 1.12), materials.goldSupport, 'drop-car-mass', shadows).position.y = 3.42;
  return group;
}

function createCarouselPlatform(materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p21-carousel-platform');
  group.position.set(4.8, 0.33, 3.35);
  addMesh(group, new THREE.CylinderGeometry(1.28, 1.36, 0.34, 20), materials.ivoryStone, 'carousel-platform', shadows).position.y = 0.17;
  addMesh(group, new THREE.CylinderGeometry(0.11, 0.11, 1.62, 10), materials.goldSupport, 'carousel-mast', shadows).position.y = 1.1;
  addMesh(group, new THREE.ConeGeometry(1.3, 0.62, 20), materials.carouselRed, 'carousel-canopy', shadows).position.y = 1.88;
  return group;
}

function createCastlePortal(materials: Island19SourceLoftMaterials, shadows: boolean) {
  const group = markPart(new THREE.Group(), 'p24-loopmaster-castle-portal');
  const jambGeometry = new THREE.BoxGeometry(0.54, 2.3, 2.56);
  const left = addMesh(group, jambGeometry, materials.terracotta, 'portal-left-jamb', shadows);
  left.position.set(-1.2, 1.32, 0);
  const right = addMesh(group, jambGeometry, materials.terracotta, 'portal-right-jamb', shadows);
  right.position.set(1.2, 1.32, 0);
  const lintel = addMesh(group, new THREE.BoxGeometry(2.94, 0.48, 2.56), materials.ivoryStone, 'portal-lintel', shadows);
  lintel.position.set(0, 2.4, 0);
  for (const x of [-1.56, 1.56]) {
    const tower = addMesh(group, new THREE.CylinderGeometry(0.52, 0.58, 3.35, 12), materials.tealMetal, `castle-tower-${x}`, shadows);
    tower.position.set(x, 1.9, 0);
    const roof = addMesh(group, new THREE.ConeGeometry(0.7, 0.92, 12), materials.terracotta, `castle-roof-${x}`, shadows);
    roof.position.set(x, 4.02, 0);
  }
  group.userData.portal = { ...ISLAND_19_SOURCE_LOFT_PORTAL, physicallyOpen: true, frontToRear: true };
  return group;
}

function countTriangles(node: THREE.Object3D) {
  let triangles = 0;
  node.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
  });
  return Math.round(triangles);
}

function manifoldErrors(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex();
  if (!index) return 1;
  const edges = new Map<string, number>();
  for (let i = 0; i < index.count; i += 3) {
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  let invalid = 0;
  for (const count of edges.values()) if (count !== 2) invalid += 1;
  return invalid;
}

export function resolveIsland19SourceLoftTrainPose(table: SourceLoftSectionTable, elapsedSeconds: number, speedWorldUnitsPerSecond = 2.25, distanceOffset = 0): Island19SourceLoftTrainPose {
  const frame = table.getFrameAtDistance(elapsedSeconds * speedWorldUnitsPerSecond + distanceOffset);
  const basis = new THREE.Matrix4().makeBasis(frame.side, frame.up, frame.tangent);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis).normalize();
  return { ...frame, quaternion };
}

export function validateIsland19SourceLoftWorld(input: {
  root: THREE.Group;
  table: SourceLoftSectionTable;
  parts: readonly Island19SourceLoftPartRecord[];
  rootGeometry: THREE.BufferGeometry;
  loftGeometries: readonly THREE.BufferGeometry[];
}): Island19SourceLoftDiagnostic {
  const { root, table, parts, rootGeometry, loftGeometries } = input;
  const errors: string[] = [];
  let maximumStationSpacing = 0;
  for (let i = 1; i < table.stations.length; i += 1) maximumStationSpacing = Math.max(maximumStationSpacing, table.stations[i].center.distanceTo(table.stations[i - 1].center));
  const seamDistance = table.stations[0].center.distanceTo(table.stations[table.stations.length - 1].center);
  const seamTangentDot = table.stations[0].tangent.dot(table.stations[table.stations.length - 1].tangent);
  const nonManifoldEdges = manifoldErrors(rootGeometry) + loftGeometries.reduce((sum, geometry) => sum + manifoldErrors(geometry), 0);
  const portalStations = table.stations.filter((station) => (
    station.phase === 'portal-rear'
    && Math.abs(station.center.z) <= ISLAND_19_SOURCE_LOFT_PORTAL.halfDepth
  ));
  let portalSideMargin = Number.POSITIVE_INFINITY;
  let portalTopMargin = Number.POSITIVE_INFINITY;
  let portalBottomMargin = Number.POSITIVE_INFINITY;
  for (const station of portalStations) {
    portalSideMargin = Math.min(portalSideMargin, ISLAND_19_SOURCE_LOFT_PORTAL.clearHalfWidth - Math.abs(station.center.x) - TRAIN_HALF_WIDTH);
    portalTopMargin = Math.min(portalTopMargin, ISLAND_19_SOURCE_LOFT_PORTAL.clearTopY - (station.center.y + TRAIN_TOP));
    portalBottomMargin = Math.min(portalBottomMargin, station.center.y - TRAIN_BOTTOM - ISLAND_19_SOURCE_LOFT_PORTAL.clearBottomY);
  }
  const landmarkPositions = [
    new THREE.Vector3(-4.85, 0, 3.15), new THREE.Vector3(-5.15, 0, -1.72), new THREE.Vector3(4.92, 0, -1.82),
    new THREE.Vector3(4.8, 0, 3.35), new THREE.Vector3(0, 0, 0),
  ];
  let landmarkMinimumSeparation = Number.POSITIVE_INFINITY;
  for (let i = 0; i < landmarkPositions.length; i += 1) for (let j = i + 1; j < landmarkPositions.length; j += 1) landmarkMinimumSeparation = Math.min(landmarkMinimumSeparation, landmarkPositions[i].distanceTo(landmarkPositions[j]));
  const routeViolations: string[] = [];
  root.traverse((child) => {
    if (!child.name.startsWith('footing-')) return;
    const position = child.getWorldPosition(new THREE.Vector3());
    const radius = Math.hypot(position.x, position.z);
    if (radius >= ROUTE_INNER_RADIUS && radius <= ROUTE_OUTER_RADIUS) routeViolations.push(child.name);
  });
  const expected = new Set(ISLAND_19_SOURCE_LOFT_PART_IDS);
  const manifestValid = parts.length === expected.size && parts.every((part) => expected.has(part.id) && part.triangles > 0);
  const quaternionNorm = resolveIsland19SourceLoftTrainPose(table, 17.25).quaternion.length();
  const rootBox = rootGeometry.boundingBox ?? (rootGeometry.computeBoundingBox(), rootGeometry.boundingBox);
  const rootTopWidth = rootBox ? rootBox.max.x - rootBox.min.x : 0;
  const rootDepth = rootBox ? rootBox.max.y - rootBox.min.y : 0;
  const rootDepthToTopWidthRatio = rootTopWidth > 0 ? rootDepth / rootTopWidth : 0;
  if (table.uniqueStationCount < 56) errors.push('section table has fewer than 56 unique stations');
  if (maximumStationSpacing > 0.35) errors.push(`station spacing ${maximumStationSpacing.toFixed(4)} exceeds 0.35`);
  if (seamDistance > 0.001) errors.push(`seam distance ${seamDistance.toFixed(6)} exceeds 0.001`);
  if (seamTangentDot < 0.995) errors.push(`seam tangent dot ${seamTangentDot.toFixed(6)} is below 0.995`);
  if (nonManifoldEdges !== 0) errors.push(`${nonManifoldEdges} topology edges are not shared exactly twice`);
  if (TERRAIN_RINGS.length < 7) errors.push('root has fewer than seven authored rings');
  if (rootDepthToTopWidthRatio < 0.32) errors.push(`root depth ratio ${rootDepthToTopWidthRatio.toFixed(4)} is below 0.32`);
  if (portalStations.length === 0) errors.push('no portal route samples');
  if (portalSideMargin < 0.25) errors.push(`portal side margin ${portalSideMargin.toFixed(4)} is below 0.25`);
  if (portalTopMargin < 0.2) errors.push(`portal top margin ${portalTopMargin.toFixed(4)} is below 0.20`);
  if (portalBottomMargin < 0.2) errors.push(`portal bottom margin ${portalBottomMargin.toFixed(4)} is below 0.20`);
  if (routeViolations.length) errors.push(`${routeViolations.length} support footings enter the protected route annulus`);
  if (!manifestValid) errors.push('runtime part manifest is incomplete');
  if (Math.abs(quaternionNorm - 1) > 1e-6) errors.push(`train quaternion norm ${quaternionNorm.toFixed(8)} is not normalized`);
  return {
    valid: errors.length === 0,
    stationCount: table.uniqueStationCount,
    sectionBoundaryVertices: SECTION_BOUNDARY_VERTICES,
    totalLength: table.totalLength,
    maximumStationSpacing,
    seamDistance,
    seamTangentDot,
    nonManifoldEdges,
    rootSectorCount: Number(rootGeometry.userData.sectors ?? 0),
    rootRingCount: TERRAIN_RINGS.length,
    rootDepthToTopWidthRatio,
    portalSamples: portalStations.length,
    portalSideMargin,
    portalTopMargin,
    portalBottomMargin,
    landmarkMinimumSeparation,
    routeViolations,
    manifestValid,
    quaternionNorm,
    errors,
  };
}

export function createIsland19CoasterCarnivalSourceLoftWorld(options: Island19SourceLoftWorldOptions = {}): Island19SourceLoftWorldRuntime {
  const quality = options.quality ?? 'medium';
  const shadows = options.castShadow ?? quality === 'high';
  const materials = options.materials ?? createIsland19SourceLoftMaterials();
  const root = new THREE.Group();
  root.name = 'island19-coaster-carnival-source-loft-world';
  root.scale.y = 1.34;
  const rootGeometry = createIsland19SourceLoftRootGeometry(qSectors(quality));
  const terrainPart = markPart(new THREE.Group(), 'p01-continuous-rock-island');
  const terrain = addMesh(terrainPart, rootGeometry, materials.basalt, 'continuous-deep-welded-basalt-root', shadows);
  terrain.receiveShadow = options.receiveShadow ?? true;
  const terrace = addMesh(terrainPart, new THREE.CylinderGeometry(6.64, 6.86, 0.24, qSectors(quality)), materials.terrace, 'board-safe-inner-terrace', shadows);
  terrace.position.y = 0.42;
  root.add(terrainPart);
  const table = new SourceLoftSectionTable(quality);
  const track = createTrackParts(table, materials, shadows);
  root.add(createSupportPart(table, materials, shadows), track.upper, track.lower);
  root.add(createMomentumStation(materials, shadows));
  root.add(createFerrisFoundation(materials, shadows));
  root.add(createDropFoundation(materials, shadows));
  root.add(createCarouselPlatform(materials, shadows));
  root.add(createCastlePortal(materials, shadows));
  const partNodes = new Map<Island19SourceLoftPartId, THREE.Group>();
  for (const child of root.children) if (ISLAND_19_SOURCE_LOFT_PART_IDS.includes(child.userData.partId as Island19SourceLoftPartId)) partNodes.set(child.userData.partId, child as THREE.Group);
  const parts = ISLAND_19_SOURCE_LOFT_PART_IDS.map((id) => ({ id, nodeName: partNodes.get(id)?.name ?? '', triangles: partNodes.get(id) ? countTriangles(partNodes.get(id)!) : 0 }));
  const loftGeometries: THREE.BufferGeometry[] = [];
  track.upper.traverse((child) => { if (child instanceof THREE.Mesh && child.name.startsWith('upper-')) loftGeometries.push(child.geometry); });
  track.lower.traverse((child) => { if (child instanceof THREE.Mesh && child.name.startsWith('lower-')) loftGeometries.push(child.geometry); });
  root.updateMatrixWorld(true);
  const diagnostics = validateIsland19SourceLoftWorld({ root, table, parts, rootGeometry, loftGeometries });
  const dataset = {
    island19FullWorld: 'mounted',
    island19RepresentativeVariant: 'circuit-d-source-loft',
    island19PathOwner: ISLAND_19_SOURCE_LOFT_PATH_OWNER,
    island19CircuitClosed: String(diagnostics.seamDistance <= 0.001 && diagnostics.seamTangentDot >= 0.995),
    island19PortalClear: String(diagnostics.portalSideMargin >= 0.25 && diagnostics.portalTopMargin >= 0.2 && diagnostics.portalBottomMargin >= 0.2),
    island19ManifestValid: String(diagnostics.manifestValid),
    island19TopologyValid: String(diagnostics.nonManifoldEdges === 0),
    island19VerticalExaggeration: root.scale.y.toFixed(2),
  };
  root.userData.presentationOnly = true;
  root.userData.island19RepresentativeVariant = 'circuit-d-source-loft';
  root.userData.sourceLoftDiagnostics = diagnostics;
  root.userData.dataset = dataset;
  root.userData.sculptRuntime = {
    model: 'island-019-coaster-carnival-source-loft-world',
    variant: 'circuit-d-source-loft',
    pathOwner: ISLAND_19_SOURCE_LOFT_PATH_OWNER,
    presentationOnly: true,
    verticalExaggeration: root.scale.y,
    parts,
    sectionTable: {
      stationCount: table.uniqueStationCount,
      boundaryVerticesPerRunner: SECTION_BOUNDARY_VERTICES,
      cumulativeDistanceOwner: true,
      visualSilhouetteOwner: 'authored-section-boundary-loft',
    },
  };
  return {
    root, sectionTable: table, materials, parts, diagnostics, dataset,
    getTrainPose: (elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset) => resolveIsland19SourceLoftTrainPose(table, elapsedSeconds, speedWorldUnitsPerSecond, distanceOffset),
  };
}
