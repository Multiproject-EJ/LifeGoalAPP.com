import * as THREE from 'three';
import wonderRoute from './island19WonderRoute.json';
import { createWonderRidePacing } from './island19WonderRidePacing';
import { createIsland19SkyAmbience } from './Island19SkyAmbience';
import { createIsland19ParkDetails } from './Island19ParkDetails';
import grottoConfig from './island19WonderGrotto.json';
import { createGrandTreasureGrotto, createSeabedOutsideGrandGrotto, grandGrottoNorm, trimGrottoIntersection } from './Island19GrandTreasureGrotto';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
  type Island3DQuality,
} from './island5ThreePilotContract';
import {
  createIsland19CoasterCarnivalCircuitGBoardPlaza,
  type Island19CircuitGBoardRuntime,
} from './Island19CoasterCarnivalCircuitGBoardPlaza';
import { createIsland19CoasterCarnivalCircuitGCliffRoot } from './Island19CoasterCarnivalCircuitGCliffRoot';
import { createIsland19CoasterCarnivalAtlasExterior } from './Island19CoasterCarnivalAtlasExterior';

export const ISLAND_19_CIRCUIT_F_WORLD_NAME = 'Island 019 Coaster Carnival — Circuit F Wonder Express';
export const ISLAND_19_CIRCUIT_F_PATH_OWNER = 'island19-circuit-f-explicit-bezier-section-chain';
export const ISLAND_19_CIRCUIT_F_REPRESENTATIVE_PART_IDS = [
  'p01-oversized-continuous-island-root',
  'p02-canonical-36-tile-board-contract',
  'p03-center-fountain-plaza',
  'p09-support-load-path-network',
  'p10-source-crest-and-inward-s',
  'p11-lower-circuit-and-castle-throughpass',
  'p16-open-plunge-portal',
  'p17-underground-descent',
  'p18-traversable-cavern-shell',
  'p23-open-sea-cave-breach',
  'p24-supported-overwater-sweep',
  'p31-loopmaster-castle-macro',
] as const;

export type Island19CircuitFRepresentativePartId = typeof ISLAND_19_CIRCUIT_F_REPRESENTATIVE_PART_IDS[number];
export type Island19CircuitFWagon = 'front' | 'middle';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ROUTE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.28;
const ROUTE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.28;
const TRACK_HALF_GAUGE = 0.34;
const RUNNING_HALF_GAUGE = 0.22;
const TRACK_RAIL_RADIUS = 0.075;
const RUNNING_RAIL_RADIUS = 0.038;
const TRAIN_HALF_WIDTH = 0.5;
const TRAIN_HALF_HEIGHT = 0.58;
const ISLAND_19_CIRCUIT_G_OCEAN_LEVEL = -5.05;
const ISLAND_19_CIRCUIT_G_SHORE_FOAM_LEVEL = -4.96;
const ISLAND_19_CIRCUIT_G_OCEAN_VISTA_DROP = -3.87;
const TRAIN_CARRIAGE_LENGTH = 0.92;
const SEA_CAVE_ANGLE = -0.1;

export interface Island19CircuitFMaterials {
  basalt: THREE.MeshStandardMaterial;
  wetBasalt: THREE.MeshPhysicalMaterial;
  terrace: THREE.MeshStandardMaterial;
  plazaStone: THREE.MeshStandardMaterial;
  garden: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  foam: THREE.MeshBasicMaterial;
  redRail: THREE.MeshPhysicalMaterial;
  ivoryRail: THREE.MeshStandardMaterial;
  gold: THREE.MeshPhysicalMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  teal: THREE.MeshPhysicalMaterial;
  terracotta: THREE.MeshStandardMaterial;
  ivoryStone: THREE.MeshStandardMaterial;
  cavern: THREE.MeshStandardMaterial;
  diamond: THREE.MeshPhysicalMaterial;
  glassTube: THREE.MeshPhysicalMaterial;
  clay: THREE.MeshStandardMaterial;
}

export interface Island19CircuitFFrame {
  u: number;
  distance: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  side: THREE.Vector3;
  up: THREE.Vector3;
  quaternion: THREE.Quaternion;
  phase: Island19CircuitFRidePhase;
}

export type Island19CircuitFRidePhase =
  | 'dispatch'
  | 'source-crest'
  | 'surface-s'
  | 'plunge'
  | 'gold-vault'
  | 'grand-vault'
  | 'diamond-gallery'
  | 'sea-cave'
  | 'ocean-reveal'
  | 'return';

export interface Island19CircuitFDiagnostics {
  valid: boolean;
  pathOwner: string;
  pathLength: number;
  rootSectorCount: number;
  rootRingCount: number;
  rootWidth: number;
  rootDepth: number;
  rootScaleAgainstStandard: number;
  openSeaCaveFaceCount: number;
  portalSideMargin: number;
  portalTopMargin: number;
  minimumSupportContactGap: number;
  boardRouteViolations: string[];
  phaseCoverage: Island19CircuitFRidePhase[];
  errors: string[];
}

export interface Island19CircuitFWorldOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  receiveShadow?: boolean;
  clay?: boolean;
  cutaway?: boolean;
  reducedMotion?: boolean;
}

export interface Island19CircuitFWorldRuntime {
  root: THREE.Group;
  world: THREE.Group;
  train: THREE.Group;
  cavern: THREE.Group;
  board: Island19CircuitGBoardRuntime;
  materials: Island19CircuitFMaterials;
  path: THREE.CurvePath<THREE.Vector3>;
  diagnostics: Island19CircuitFDiagnostics;
  dataset: Record<string, string>;
  getRideFrame: (progress: number, wagon?: Island19CircuitFWagon) => Island19CircuitFFrame;
  getRiderCameraPosition: (progress: number, wagon?: Island19CircuitFWagon) => THREE.Vector3;
  getRidePhaseStops: () => number[];
  getScenicFocus: (progress: number) => { point: THREE.Vector3; weight: number };
  pacing: ReturnType<typeof createWonderRidePacing>;
  setRiderPovActive: (wagon: Island19CircuitFWagon | null) => void;
  setTrainProgress: (progress: number) => void;
  setRidePhaseVisibility: (phase: Island19CircuitFRidePhase | null) => void;
  animate: (elapsedSeconds: number) => void;
  setCutaway: (enabled: boolean) => void;
  setClay: (enabled: boolean) => void;
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
  { id: 'park-terrace', y: 0.24, radiusX: 8.55, radiusZ: 7.08, offsetX: -0.12, offsetZ: 0.22, phase: 0.1 },
  { id: 'green-shoulder', y: -0.08, radiusX: 8.78, radiusZ: 7.24, offsetX: -0.08, offsetZ: 0.16, phase: 0.7 },
  { id: 'upper-cliff', y: -0.9, radiusX: 8.58, radiusZ: 7.05, offsetX: 0.02, offsetZ: 0.08, phase: 1.25 },
  { id: 'fractured-mid-cliff', y: -2.12, radiusX: 8.12, radiusZ: 6.62, offsetX: -0.1, offsetZ: -0.04, phase: 1.9 },
  { id: 'deep-cliff', y: -3.5, radiusX: 7.42, radiusZ: 6.04, offsetX: 0.06, offsetZ: -0.14, phase: 2.5 },
  { id: 'wet-foot', y: -4.85, radiusX: 6.52, radiusZ: 5.24, offsetX: 0.12, offsetZ: -0.22, phase: 3.0 },
  { id: 'root-taper', y: -7.15, radiusX: 5.2, radiusZ: 4.16, offsetX: -0.02, offsetZ: -0.3, phase: 3.55 },
  { id: 'underside', y: -8.55, radiusX: 3.4, radiusZ: 2.72, offsetX: 0.08, offsetZ: -0.34, phase: 4.05 },
] as const;

const qualitySegments = (quality: Island3DQuality) => quality === 'high' ? 420 : quality === 'medium' ? 320 : 240;
const qualityRadial = (quality: Island3DQuality) => quality === 'high' ? 8 : quality === 'medium' ? 7 : 6;
const qualitySectors = (quality: Island3DQuality) => quality === 'high' ? 112 : quality === 'medium' ? 88 : 64;

function angularDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function terrainRadiusFactor(ring: TerrainRing, theta: number) {
  const frontWeight = Math.max(0, Math.sin(theta));
  const sideWeight = Math.abs(Math.cos(theta));
  const jagged = 0.052 * Math.sin(theta * 3 + ring.phase)
    + 0.034 * Math.cos(theta * 7 - ring.phase * 0.8)
    + 0.018 * Math.sin(theta * 13 + ring.phase * 1.7);
  const frontApron = frontWeight * (ring.id === 'park-terrace' || ring.id === 'green-shoulder' ? 0.09 : 0.035);
  const sideButtress = sideWeight * (ring.id.includes('cliff') ? 0.028 : 0.012);
  return 1 + jagged + frontApron + sideButtress;
}

export function createIsland19CircuitFRootGeometry(sectors = 88) {
  const sectorCount = Math.max(64, Math.floor(sectors));
  const positions: number[] = [];
  for (const ring of TERRAIN_RINGS) {
    for (let index = 0; index < sectorCount; index += 1) {
      const theta = index / sectorCount * Math.PI * 2;
      const factor = terrainRadiusFactor(ring, theta);
      positions.push(
        ring.offsetX + Math.cos(theta) * ring.radiusX * factor,
        ring.y + 0.055 * Math.sin(theta * 9 + ring.phase),
        ring.offsetZ + Math.sin(theta) * ring.radiusZ * factor,
      );
    }
  }
  const topCenter = positions.length / 3;
  positions.push(-0.08, TERRAIN_RINGS[0].y, 0.14);
  const bottomCenter = positions.length / 3;
  positions.push(0.04, -7.52, -0.34);
  const indices: number[] = [];
  let openSeaCaveFaceCount = 0;
  for (let index = 0; index < sectorCount; index += 1) {
    const next = (index + 1) % sectorCount;
    indices.push(topCenter, index, next);
  }
  for (let ringIndex = 0; ringIndex < TERRAIN_RINGS.length - 1; ringIndex += 1) {
    const upper = ringIndex * sectorCount;
    const lower = (ringIndex + 1) * sectorCount;
    for (let index = 0; index < sectorCount; index += 1) {
      const next = (index + 1) % sectorCount;
      const theta = (index + 0.5) / sectorCount * Math.PI * 2;
      const isSeaCaveAperture = angularDistance(theta, SEA_CAVE_ANGLE) < 0.14 && ringIndex >= 1 && ringIndex <= 4;
      if (isSeaCaveAperture) {
        openSeaCaveFaceCount += 2;
        continue;
      }
      indices.push(upper + index, lower + index, lower + next, upper + index, lower + next, upper + next);
    }
  }
  const lastRing = (TERRAIN_RINGS.length - 1) * sectorCount;
  for (let index = 0; index < sectorCount; index += 1) {
    const next = (index + 1) % sectorCount;
    indices.push(lastRing + index, bottomCenter, lastRing + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'island19-circuit-f-oversized-open-sea-cave-root-geometry';
  geometry.userData = {
    sectors: sectorCount,
    rings: TERRAIN_RINGS.map((ring) => ring.id),
    openSeaCaveFaceCount,
    footprintScale: 1.35,
  };
  return geometry;
}

function v(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

function addBezier(
  path: THREE.CurvePath<THREE.Vector3>,
  start: THREE.Vector3,
  control1: THREE.Vector3,
  control2: THREE.Vector3,
  end: THREE.Vector3,
) {
  path.add(new THREE.CubicBezierCurve3(start, control1, control2, end));
}

export function createIsland19CircuitFRoutePath() {
  const path = new THREE.CurvePath<THREE.Vector3>();
  // Blender's tunnel cutter consumes this same knot file and handle rule.
  // Equal handles at each knot give C1 continuity, including the station seam.
  const points = wonderRoute.knots.map((knot) => new THREE.Vector3(...knot.position as [number, number, number]));
  const handles = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const authored = wonderRoute.knots[index].tangent;
    const direction = authored
      ? new THREE.Vector3(...authored as [number, number, number]).normalize()
      : next.clone().sub(previous).normalize();
    return direction.multiplyScalar(Math.min(point.distanceTo(previous), point.distanceTo(next)) * wonderRoute.knots[index].handleScale);
  });
  points.forEach((point, index) => {
    const next = (index + 1) % points.length;
    addBezier(path, point, point.clone().add(handles[index]), points[next].clone().sub(handles[next]), points[next]);
  });
  path.autoClose = true;
  // CurvePath.getPoint already maps arc distance across its child curves.
  // Avoid a second, coarsely sampled arc-length remapping in getPointAt.
  path.getPointAt = (u: number) => path.getPoint(u);
  // Use the child's analytic derivative at exactly the same distance mapping
  // as getPoint. Finite-differencing across arc-table cells introduces wobble.
  path.getTangent = (u: number, target = new THREE.Vector3()) => {
    const distance = THREE.MathUtils.clamp(u, 0, 1) * path.getLength();
    const lengths = path.getCurveLengths();
    const index = Math.max(0, lengths.findIndex(length => length >= distance));
    const curve = path.curves[index];
    const fraction = 1 - (lengths[index] - distance) / curve.getLength();
    return curve.getTangentAt(THREE.MathUtils.clamp(fraction, 0, 1), target);
  };
  path.getTangentAt = (u: number, target?: THREE.Vector3) => path.getTangent(u, target);
  return path;
}

function createOceanWithRideApertures(path: THREE.CurvePath<THREE.Vector3>) {
  const outline = new THREE.Shape();
  outline.absarc(0, 0, 22, 0, Math.PI * 2, false);
  const level = ISLAND_19_CIRCUIT_G_OCEAN_LEVEL;
  for (let index = 1; index <= 600; index += 1) {
    let low = (index - 1) / 600;
    let high = index / 600;
    const below = path.getPoint(low).y < level;
    if ((path.getPoint(high).y < level) === below) continue;
    for (let step = 0; step < 18; step += 1) {
      const mid = (low + high) / 2;
      if ((path.getPoint(mid).y < level) === below) low = mid;
      else high = mid;
    }
    const frame = frameAt(path, (low + high) / 2);
    const along = new THREE.Vector2(frame.tangent.x, frame.tangent.z).normalize();
    const across = new THREE.Vector2(-along.y, along.x);
    const hole = new THREE.Path();
    // The water plane has real apertures around the pressure shell; it never
    // renders across a rider's eyes while the train crosses sea level.
    for (let sample = 0; sample <= 64; sample += 1) {
      const angle = -sample / 64 * Math.PI * 2;
      const offset = along.clone().multiplyScalar(Math.cos(angle) * 1.7 / Math.abs(frame.tangent.y))
        .addScaledVector(across, Math.sin(angle) * 1.7);
      const x = frame.position.x + offset.x;
      const y = -frame.position.z - offset.y;
      if (sample === 0) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    outline.holes.push(hole);
  }
  const geometry = new THREE.ShapeGeometry(outline, 96);
  geometry.userData.rideApertureCount = outline.holes.length;
  return geometry;
}

function phaseAt(path: THREE.CurvePath<THREE.Vector3>, progress: number): Island19CircuitFRidePhase {
  const u = THREE.MathUtils.euclideanModulo(progress, 1);
  const lengths = path.getCurveLengths();
  const index = lengths.findIndex((length) => u * lengths[lengths.length - 1] < length);
  return wonderRoute.knots[Math.max(0, index)].phase as Island19CircuitFRidePhase;
}

function routeAnchor(path: THREE.CurvePath<THREE.Vector3>, id: string) {
  const index = wonderRoute.knots.findIndex((knot) => knot.id === id);
  const lengths = path.getCurveLengths();
  return index <= 0 ? 0 : lengths[index - 1] / lengths[lengths.length - 1];
}

function frameAt(path: THREE.CurvePath<THREE.Vector3>, progress: number): Island19CircuitFFrame {
  const u = THREE.MathUtils.euclideanModulo(progress, 1);
  const position = path.getPointAt(u);
  const tangent = path.getTangentAt(u).normalize();
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
  const basis = new THREE.Matrix4().makeBasis(side, up, tangent);
  return {
    u,
    distance: path.getLength() * u,
    position,
    tangent,
    side,
    up,
    quaternion: new THREE.Quaternion().setFromRotationMatrix(basis),
    phase: phaseAt(path, u),
  };
}

function sampledOffsetCurve(path: THREE.CurvePath<THREE.Vector3>, offset: number, samples: number) {
  class RailCurve extends THREE.Curve<THREE.Vector3> {
    constructor() { super(); }
    getPoint(t: number, target = new THREE.Vector3()) {
      const frame = frameAt(path, t);
      return target.copy(frame.position).addScaledVector(frame.side, offset).addScaledVector(frame.up, 0.072);
    }
  }
  const curve = new RailCurve();
  curve.arcLengthDivisions = samples * 2;
  return curve;
}

function exactRouteSlice(path: THREE.CurvePath<THREE.Vector3>, start: number, end: number) {
  class RouteSlice extends THREE.Curve<THREE.Vector3> {
    constructor() { super(); }
    getPoint(t: number, target = new THREE.Vector3()) {
      return target.copy(path.getPoint(start + t * (end - start)));
    }
    getPointAt(t: number, target = new THREE.Vector3()) { return this.getPoint(t, target); }
  }
  return new RouteSlice();
}

function createRail(
  path: THREE.CurvePath<THREE.Vector3>,
  offset: number,
  radius: number,
  material: THREE.Material,
  segments: number,
  radialSegments: number,
  name: string,
) {
  const curve = sampledOffsetCurve(path, offset, segments);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, radialSegments, true), material);
  mesh.name = name;
  return mesh;
}

function createTrackTies(path: THREE.CurvePath<THREE.Vector3>, material: THREE.Material, count: number) {
  const geometry = new THREE.BoxGeometry(0.92, 0.075, 0.105);
  const ties = new THREE.InstancedMesh(geometry, material, count);
  ties.name = 'ISLAND_19_CIRCUIT_F_TRACK_TIES';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const frame = frameAt(path, index / count);
    matrix.compose(frame.position, frame.quaternion, new THREE.Vector3(1, 1, 1));
    ties.setMatrixAt(index, matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  return ties;
}

function createTrackFasteners(path: THREE.CurvePath<THREE.Vector3>, material: THREE.Material, count: number) {
  // A single instanced draw supplies the visible rail shoes at every sleeper.
  // Keeping them separate from both the ties and runners makes the load path
  // legible in wagon POV without turning the mobile track into micro-mesh soup.
  const geometry = new THREE.BoxGeometry(0.16, 0.052, 0.14);
  geometry.translate(0, 0.045, 0);
  const fasteners = new THREE.InstancedMesh(geometry, material, count * 2);
  fasteners.name = 'ISLAND_19_CIRCUIT_F_INSTANCED_RAIL_FASTENERS';
  const matrix = new THREE.Matrix4();
  let instance = 0;
  for (let index = 0; index < count; index += 1) {
    const frame = frameAt(path, index / count);
    for (const offset of [-TRACK_HALF_GAUGE, TRACK_HALF_GAUGE]) {
      const position = frame.position.clone().addScaledVector(frame.side, offset);
      matrix.compose(position, frame.quaternion, new THREE.Vector3(1, 1, 1));
      fasteners.setMatrixAt(instance, matrix);
      instance += 1;
    }
  }
  fasteners.instanceMatrix.needsUpdate = true;
  return fasteners;
}

function createTrackSupports(path: THREE.CurvePath<THREE.Vector3>, material: THREE.Material, count: number) {
  const clearanceFrames = Array.from({ length: 1200 }, (_, i) => frameAt(path, i / 1200));
  const geometry = new THREE.CylinderGeometry(0.055, 0.075, 1, 7, 1, false);
  const supports = new THREE.InstancedMesh(geometry, material, count * 2);
  supports.name = 'ISLAND_19_CIRCUIT_F_LOAD_PATH_SUPPORTS';
  const matrix = new THREE.Matrix4();
  let instance = 0;
  for (let index = 0; index < count; index += 1) {
    const u = (index + 0.5) / count;
    const frame = frameAt(path, u);
    const isUnderground = frame.phase === 'plunge' || frame.phase === 'gold-vault' || frame.phase === 'grand-vault' || frame.phase === 'diamond-gallery';
    if (isUnderground) continue;
    const radial = Math.hypot(frame.position.x, frame.position.z);
    if (frame.position.y > 0 && (radial < 1.95 || (radial > ROUTE_INNER_RADIUS - 0.4 && radial < ROUTE_OUTER_RADIUS + 0.4))) continue;
    const baseY = frame.position.y < 0.22 || radial > 7.5
      ? -8.58
      : 0.22;
    const height = Math.max(0.35, frame.position.y - baseY);
    for (const offset of [-TRACK_HALF_GAUGE, TRACK_HALF_GAUGE]) {
      const position = frame.position.clone().addScaledVector(frame.side, offset);
      // A support for an upper rail must not pierce a different lower pass.
      // Ignore its own local rail attachment; test the full vertical rod
      // against the displaced rider envelope elsewhere on the route.
      const obstructsOtherPass = clearanceFrames.some(other => {
        const routeDistance = Math.abs(other.u - u) * path.getLength();
        if (Math.min(routeDistance, path.getLength() - routeDistance) < 2.2) return false;
        const eye = other.position.clone().addScaledVector(other.up, .6);
        return Math.hypot(eye.x-position.x, eye.z-position.z) < .85
          && eye.y + .75 > baseY && eye.y - .75 < frame.position.y;
      });
      if (obstructsOtherPass) continue;
      position.y = baseY + height / 2;
      matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(1, height, 1));
      supports.setMatrixAt(instance, matrix);
      instance += 1;
    }
  }
  supports.count = instance;
  supports.instanceMatrix.needsUpdate = true;
  return supports;
}

function createInstancedRodSystem(
  name: string,
  segments: readonly (readonly [THREE.Vector3, THREE.Vector3])[],
  radius: number,
  material: THREE.Material,
) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 6, 1, false);
  const rods = new THREE.InstancedMesh(geometry, material, segments.length);
  rods.name = name;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const midpoint = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const scale = new THREE.Vector3();
  segments.forEach(([start, end], index) => {
    delta.copy(end).sub(start);
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    quaternion.setFromUnitVectors(WORLD_UP, delta.clone().normalize());
    scale.set(1, delta.length(), 1);
    matrix.compose(midpoint, quaternion, scale);
    rods.setMatrixAt(index, matrix);
  });
  rods.instanceMatrix.needsUpdate = true;
  rods.userData = {
    actionReadyPart: 'i04-coaster-load-lattice',
    attachment: 'embedded into the frozen Circuit H terrace and paired rail bed',
    gameplayAuthority: false,
  };
  return rods;
}

function createTrackSupportLattice(
  path: THREE.CurvePath<THREE.Vector3>,
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const lattice = new THREE.Group();
  lattice.name = 'ISLAND_19_CIRCUIT_I_SOURCE_CREST_SUPPORT_LATTICE';
  const towerCount = quality === 'high' ? 18 : quality === 'medium' ? 14 : 10;
  const towers = Array.from({ length: towerCount }, (_, index) => {
    const start = routeAnchor(path, 'lift-base');
    const end = routeAnchor(path, 'east-turn');
    const u = start + index / Math.max(1, towerCount - 1) * (end - start);
    const frame = frameAt(path, u);
    const leftTop = frame.position.clone().addScaledVector(frame.side, -TRACK_HALF_GAUGE);
    const rightTop = frame.position.clone().addScaledVector(frame.side, TRACK_HALF_GAUGE);
    const leftBase = leftTop.clone();
    const rightBase = rightTop.clone();
    leftBase.y = 0.28;
    rightBase.y = 0.28;
    return { frame, leftTop, rightTop, leftBase, rightBase };
  }).filter((tower) => {
    const radial = Math.hypot(tower.frame.position.x, tower.frame.position.z);
    return tower.frame.position.y > 1.7 && radial > 1.95
      && (radial < ROUTE_INNER_RADIUS - 0.4 || radial > ROUTE_OUTER_RADIUS + 0.4);
  });
  const mainSegments: Array<readonly [THREE.Vector3, THREE.Vector3]> = [];
  const braceSegments: Array<readonly [THREE.Vector3, THREE.Vector3]> = [];
  towers.forEach((tower, index) => {
    mainSegments.push([tower.leftBase, tower.leftTop], [tower.rightBase, tower.rightTop]);
    const crossHeight = Math.max(0.58, tower.frame.position.y * 0.62);
    braceSegments.push([
      tower.leftBase.clone().setY(crossHeight),
      tower.rightBase.clone().setY(crossHeight),
    ]);
    if (index === 0) return;
    const previous = towers[index - 1];
    braceSegments.push(
      [previous.leftBase, tower.leftTop],
      [previous.leftTop, tower.leftBase],
      [previous.rightBase, tower.rightTop],
      [previous.rightTop, tower.rightBase],
    );
  });
  lattice.add(
    createInstancedRodSystem('ISLAND_19_CIRCUIT_I_CREST_LOAD_TOWERS', mainSegments, 0.052, material),
    createInstancedRodSystem('ISLAND_19_CIRCUIT_I_CREST_DIAGONAL_BRACES', braceSegments, 0.031, material),
  );
  lattice.userData = {
    partIds: ['i01', 'i02', 'i03', 'i04'],
    frozenPath: ISLAND_19_CIRCUIT_F_PATH_OWNER,
    sourceIdentity: 'broad rounded crest with fine gold vertical/diagonal load rhythm',
  };
  return lattice;
}

function createArchShape(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const opening = new THREE.Path();
  const halfOpening = width * 0.27;
  opening.moveTo(-halfOpening, 0);
  opening.lineTo(-halfOpening, height * 0.45);
  opening.absarc(0, height * 0.45, halfOpening, Math.PI, 0, true);
  opening.lineTo(halfOpening, 0);
  opening.closePath();
  shape.holes.push(opening);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 2 });
}

function createCastleStarGeometry(outerRadius: number, innerRadius: number, depth: number) {
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
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: depth * 0.25,
    bevelThickness: depth * 0.2,
    bevelSegments: 2,
  });
}

function createCastleMacro(materials: Island19CircuitFMaterials) {
  const castle = new THREE.Group();
  castle.name = 'ISLAND_19_CIRCUIT_F_LOOPMASTER_CASTLE_MACRO';
  const portal = new THREE.Mesh(createArchShape(3.2, 3.5, 2.0), materials.ivoryStone);
  portal.position.set(0, 0.24, -1);
  portal.castShadow = true;
  portal.receiveShadow = true;
  castle.add(portal);
  // Keep the track opening physically empty. Two hinged leaves frame the
  // aperture without placing a decorative plane through the train envelope.
  for (const side of [-1, 1]) {
    const gateLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.72, 0.08), materials.darkSteel);
    gateLeaf.name = `ISLAND_19_CIRCUIT_I_CASTLE_OPEN_GATE_${side < 0 ? 'LEFT' : 'RIGHT'}`;
    gateLeaf.position.set(side * 0.66, 1.08, 0.98);
    gateLeaf.rotation.y = side * 0.52;
    gateLeaf.userData = { purposeBuiltRailPortal: true, blocksTrack: false, decisionId: 'd017' };
    castle.add(gateLeaf);
  }
  const towerGeometry = new THREE.CylinderGeometry(0.64, 0.78, 3.9, 12);
  const domeGeometry = new THREE.SphereGeometry(0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  for (const x of [-1.48, 1.48]) {
    const tower = new THREE.Mesh(towerGeometry, materials.terracotta);
    tower.position.set(x, 2.1, 0);
    tower.castShadow = true;
    castle.add(tower);
    const dome = new THREE.Mesh(domeGeometry, materials.teal);
    dome.position.set(x, 4.02, 0);
    dome.castShadow = true;
    castle.add(dome);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 7), materials.gold);
    finial.position.set(x, 4.74, 0);
    castle.add(finial);
    for (const y of [0.66, 2.05, 3.45]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(y === 2.05 ? 0.69 : 0.7, 0.055, 7, 18), materials.gold);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y, 0);
      castle.add(band);
    }
    for (const y of [1.42, 2.62]) {
      const window = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), materials.darkSteel);
      window.name = `ISLAND_19_CIRCUIT_F_CASTLE_SIDE_TOWER_WINDOW_${x < 0 ? 'LEFT' : 'RIGHT'}_${y}`;
      window.scale.set(0.68, 1.25, 0.16);
      window.position.set(x, y, 0.705);
      castle.add(window);
      const windowCrown = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.035, 6, 12, Math.PI), materials.gold);
      windowCrown.position.set(x, y + 0.17, 0.735);
      windowCrown.rotation.z = Math.PI;
      castle.add(windowCrown);
    }
  }
  // The upper keep starts above the extruded arch rather than plugging the
  // opening with a full-height cylinder.
  const keep = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.08, 2.4, 12), materials.ivoryStone);
  keep.name = 'ISLAND_19_CIRCUIT_I_CASTLE_UPPER_KEEP_CLEAR_OF_TRACK';
  keep.position.set(0, 4.05, 0.2);
  keep.castShadow = true;
  castle.add(keep);
  const keepDome = new THREE.Mesh(new THREE.SphereGeometry(1.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), materials.teal);
  keepDome.position.set(0, 5.0, 0.2);
  keepDome.castShadow = true;
  castle.add(keepDome);
  for (const y of [0.65, 2.35, 4.38]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(y === 4.38 ? 1.01 : 1.04, 0.075, 8, 22), materials.gold);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, y, 0.2);
    castle.add(band);
  }
  for (const [x, y] of [[-0.42, 1.76], [0.42, 1.76], [-0.42, 3.12], [0.42, 3.12]] as const) {
    const window = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), materials.teal);
    window.name = `ISLAND_19_CIRCUIT_F_CASTLE_KEEP_WINDOW_${x}_${y}`;
    window.scale.set(0.68, 1.3, 0.14);
    window.position.set(x, y, 1.16);
    castle.add(window);
  }
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 0.48), materials.terracotta);
  balcony.name = 'ISLAND_19_CIRCUIT_F_CASTLE_CEREMONIAL_BALCONY';
  balcony.position.set(0, 3.84, 1.12);
  castle.add(balcony);
  for (let postIndex = 0; postIndex < 7; postIndex += 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 7), materials.gold);
    post.position.set(-0.66 + postIndex * 0.22, 4.08, 1.28);
    castle.add(post);
  }
  const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), materials.gold);
  balconyRail.position.set(0, 4.26, 1.28);
  castle.add(balconyRail);
  const crest = new THREE.Mesh(createCastleStarGeometry(0.34, 0.15, 0.07), materials.gold);
  crest.name = 'ISLAND_19_CIRCUIT_F_CASTLE_LOOPMASTER_CREST';
  crest.position.set(0, 4.66, 1.18);
  castle.add(crest);
  const centralFinial = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), materials.gold);
  centralFinial.position.set(0, 6.02, 0.2);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 7), materials.gold);
  flagPole.position.set(0, 6.52, 0.2);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.74, -0.12);
  flagShape.lineTo(0, -0.38);
  flagShape.closePath();
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), materials.terracotta);
  flag.name = 'ISLAND_19_CIRCUIT_F_CASTLE_CROWN_FLAG';
  flag.position.set(0.02, 6.92, 0.22);
  castle.add(centralFinial, flagPole, flag);
  castle.userData = {
    purposeBuiltRailPortal: true,
    portalClearWidth: 1.72,
    portalClearHeight: 2.44,
    portalDepth: 2,
    decisionId: 'd017',
  };
  return castle;
}

function createRodBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
  const delta = end.clone().sub(start);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(WORLD_UP, delta.normalize());
  return rod;
}

function createCarnivalLandmarks(materials: Island19CircuitFMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_F_ANIMATED_CARNIVAL_LANDMARKS';

  const ferris = new THREE.Group();
  ferris.name = 'ISLAND_19_CIRCUIT_F_FERRIS_WHEEL_PIVOT';
  ferris.position.set(-5.72, 2.46, -3.0);
  const ferrisStructure = new THREE.Group();
  ferrisStructure.name = 'ISLAND_19_CIRCUIT_H_FERRIS_STATIC_STRUCTURE';
  const ferrisSegments = quality === 'high' ? 32 : quality === 'medium' ? 24 : 18;
  for (const z of [-0.18, 0.18]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.085, 7, ferrisSegments), materials.teal);
    rim.position.z = z;
    ferrisStructure.add(rim);
    const goldRim = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.034, 6, ferrisSegments), materials.gold);
    goldRim.position.z = z * 1.05;
    ferrisStructure.add(goldRim);
  }
  const spokeCount = quality === 'low' ? 10 : quality === 'medium' ? 14 : 16;
  const gondolaPositions: THREE.Vector3[] = [];
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = index / spokeCount * Math.PI * 2;
    const outer = new THREE.Vector3(Math.cos(angle) * 1.91, Math.sin(angle) * 1.91, 0);
    const spoke = createRodBetween(new THREE.Vector3(), outer, 0.025, materials.gold);
    ferrisStructure.add(spoke);
    gondolaPositions.push(outer);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.66, 14), materials.gold);
  axle.rotation.x = Math.PI / 2;
  ferrisStructure.add(axle);
  for (const z of [-0.35, 0.35]) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.07, 18), materials.terracotta);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = z;
    ferrisStructure.add(hub);
    const hubCrest = new THREE.Mesh(createCastleStarGeometry(0.24, 0.1, 0.045), materials.gold);
    hubCrest.position.z = z + Math.sign(z) * 0.055;
    hubCrest.rotation.y = z < 0 ? Math.PI : 0;
    ferrisStructure.add(hubCrest);
  }
  ferris.add(batchStaticGroupByMaterial(ferrisStructure, 'ISLAND_19_CIRCUIT_H_FERRIS_STRUCTURE_BATCH'));
  const gondolaCabinGeometry = new THREE.CapsuleGeometry(0.17, 0.24, 4, 8);
  gondolaCabinGeometry.rotateZ(Math.PI / 2);
  const gondolaRoofGeometry = new THREE.ConeGeometry(0.29, 0.22, 8);
  const gondolaCabins = [materials.terracotta, materials.ivoryStone].map((material, index) => {
    const batch = new THREE.InstancedMesh(gondolaCabinGeometry, material, Math.ceil((spokeCount - index) / 2));
    batch.name = `ISLAND_19_CIRCUIT_H_FERRIS_GONDOLA_CABINS_${index}`;
    ferris.add(batch);
    return batch;
  });
  const gondolaHangers = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.32, 7),
    materials.darkSteel,
    spokeCount,
  );
  gondolaHangers.name = 'ISLAND_19_CIRCUIT_H_FERRIS_GONDOLA_HANGERS';
  const gondolaRoofs = new THREE.InstancedMesh(gondolaRoofGeometry, materials.gold, spokeCount);
  gondolaRoofs.name = 'ISLAND_19_CIRCUIT_I_FERRIS_GONDOLA_ROOFS';
  ferris.add(gondolaHangers, gondolaRoofs);
  const syncGondolas = (rotation: number) => {
    const counterRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rotation);
    const cabinCursors = [0, 0];
    gondolaPositions.forEach((outer, index) => {
      const cabinOffset = new THREE.Vector3(0, -0.2, 0).applyQuaternion(counterRotation);
      const hangerOffset = new THREE.Vector3(0, 0.03, 0).applyQuaternion(counterRotation);
      const cabinBatchIndex = index % 2;
      gondolaCabins[cabinBatchIndex].setMatrixAt(cabinCursors[cabinBatchIndex], new THREE.Matrix4().compose(
        outer.clone().add(cabinOffset),
        counterRotation,
        new THREE.Vector3(1, 1, 1),
      ));
      cabinCursors[cabinBatchIndex] += 1;
      gondolaHangers.setMatrixAt(index, new THREE.Matrix4().compose(
        outer.clone().add(hangerOffset),
        counterRotation,
        new THREE.Vector3(1, 1, 1),
      ));
      gondolaRoofs.setMatrixAt(index, new THREE.Matrix4().compose(
        outer.clone().add(new THREE.Vector3(0, 0.02, 0).applyQuaternion(counterRotation)),
        counterRotation,
        new THREE.Vector3(1, 1, 1),
      ));
    });
    gondolaCabins.forEach((batch) => { batch.instanceMatrix.needsUpdate = true; });
    gondolaHangers.instanceMatrix.needsUpdate = true;
    gondolaRoofs.instanceMatrix.needsUpdate = true;
  };
  syncGondolas(0);
  root.add(ferris);
  const ferrisSupports = new THREE.Group();
  for (const x of [-6.68, -4.76]) {
    ferrisSupports.add(createRodBetween(new THREE.Vector3(x, 0.46, -3.0), new THREE.Vector3(-5.72, 2.46, -3.0), 0.095, materials.gold));
    ferrisSupports.add(createRodBetween(new THREE.Vector3(x, 0.46, -3.34), new THREE.Vector3(-5.72, 2.46, -3.0), 0.055, materials.teal));
  }
  root.add(batchStaticGroupByMaterial(ferrisSupports, 'ISLAND_19_CIRCUIT_H_FERRIS_SUPPORT_BATCH'));

  const dropTower = new THREE.Group();
  dropTower.name = 'ISLAND_19_CIRCUIT_F_DROP_TOWER';
  dropTower.position.set(5.5, 0.42, -1.2);
  const dropStatic = new THREE.Group();
  const dropSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 6.8, 12), materials.teal);
  dropSpire.position.y = 3.4;
  dropStatic.add(dropSpire);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 6.56, 7), materials.gold);
    rail.position.set(Math.cos(angle) * 0.34, 3.42, Math.sin(angle) * 0.34);
    dropStatic.add(rail);
  }
  for (let band = 0; band < 7; band += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 14), band % 2 === 0 ? materials.gold : materials.terracotta);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.75 + band * 0.88;
    dropStatic.add(ring);
  }
  const observationCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.42, 14), materials.terracotta);
  observationCrown.position.y = 6.82;
  dropStatic.add(observationCrown);
  const dropCrown = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.88, 12), materials.gold);
  dropCrown.position.y = 7.46;
  dropStatic.add(dropCrown);
  const crownFlagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.76, 6), materials.gold);
  crownFlagPole.position.y = 8.18;
  dropStatic.add(crownFlagPole);
  dropTower.add(batchStaticGroupByMaterial(dropStatic, 'ISLAND_19_CIRCUIT_I_DROP_TOWER_STATIC_BATCH'));
  const dropCarriage = new THREE.Group();
  dropCarriage.name = 'ISLAND_19_CIRCUIT_F_DROP_CARRIAGE_PIVOT';
  dropCarriage.position.y = 3.1;
  const carriageDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 0.34, 16), materials.terracotta);
  const carriageRail = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 7, 20), materials.gold);
  carriageRail.rotation.x = Math.PI / 2;
  carriageRail.position.y = 0.22;
  const carriageUnderside = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 0.22, 16), materials.darkSteel);
  carriageUnderside.position.y = -0.22;
  dropCarriage.add(carriageDeck, carriageRail, carriageUnderside);
  const seatGeometry = new THREE.BoxGeometry(0.22, 0.32, 0.16);
  const seats = new THREE.InstancedMesh(seatGeometry, materials.ivoryStone, 12);
  const seatMatrix = new THREE.Matrix4();
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    seatMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 0.7, 0.16, Math.sin(angle) * 0.7),
      new THREE.Quaternion().setFromAxisAngle(WORLD_UP, -angle),
      new THREE.Vector3(1, 1, 1),
    );
    seats.setMatrixAt(index, seatMatrix);
  }
  seats.instanceMatrix.needsUpdate = true;
  seats.name = 'ISLAND_19_CIRCUIT_I_DROP_CARRIAGE_SEATS';
  dropCarriage.add(seats);
  dropTower.add(dropCarriage);
  root.add(dropTower);

  const carousel = new THREE.Group();
  carousel.name = 'ISLAND_19_CIRCUIT_F_CAROUSEL';
  carousel.position.set(6.7, 0.4, 4.3);
  const carouselStatic = new THREE.Group();
  const carouselBase = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.72, 0.42, 28), materials.ivoryStone);
  carouselBase.position.y = 0.21;
  const carouselBaseBand = new THREE.Mesh(new THREE.TorusGeometry(1.64, 0.1, 7, 28), materials.gold);
  carouselBaseBand.rotation.x = Math.PI / 2;
  carouselBaseBand.position.y = 0.39;
  carouselStatic.add(carouselBase, carouselBaseBand);
  carousel.add(batchStaticGroupByMaterial(carouselStatic, 'ISLAND_19_CIRCUIT_I_CAROUSEL_STATIC_BATCH'));
  const carouselPivot = new THREE.Group();
  carouselPivot.name = 'ISLAND_19_CIRCUIT_F_CAROUSEL_PIVOT';
  const carouselMast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 2.56, 12), materials.gold);
  carouselMast.position.y = 1.52;
  carouselPivot.add(carouselMast);
  const canopyLower = new THREE.Mesh(new THREE.ConeGeometry(1.86, 0.74, 32), materials.terracotta);
  canopyLower.position.y = 2.7;
  carouselPivot.add(canopyLower);
  const canopyUpper = new THREE.Mesh(new THREE.ConeGeometry(1.02, 0.72, 24), materials.ivoryStone);
  canopyUpper.position.y = 3.15;
  carouselPivot.add(canopyUpper);
  const canopyRing = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.09, 7, 32), materials.gold);
  canopyRing.rotation.x = Math.PI / 2;
  canopyRing.position.y = 2.36;
  carouselPivot.add(canopyRing);
  const carouselCrown = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), materials.gold);
  carouselCrown.scale.y = 1.35;
  carouselCrown.position.y = 3.72;
  carouselPivot.add(carouselCrown);
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const radius = index % 2 === 0 ? 1.12 : 0.78;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.72, 7), materials.gold);
    pole.position.set(Math.cos(angle) * radius, 1.36, Math.sin(angle) * radius);
    const mount = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.28, 3, 7), index % 3 === 0 ? materials.teal : index % 3 === 1 ? materials.ivoryStone : materials.terracotta);
    body.rotation.z = Math.PI / 2;
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 2, 6), materials.gold);
    neck.rotation.z = -0.42;
    neck.position.set(0.18, 0.13, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 5), materials.ivoryStone);
    head.position.set(0.27, 0.24, 0);
    mount.add(body, neck, head);
    mount.position.set(Math.cos(angle) * radius, 0.91 + index % 2 * 0.18, Math.sin(angle) * radius);
    mount.rotation.y = -angle;
    carouselPivot.add(pole, mount);
  }
  batchStaticGroupByMaterial(carouselPivot, 'ISLAND_19_CIRCUIT_H_CAROUSEL_ROTATING_BATCH');
  carousel.add(carouselPivot);
  root.add(carousel);

  const ticketPavilion = new THREE.Group();
  ticketPavilion.name = 'ISLAND_19_CIRCUIT_F_TICKET_PAVILION';
  ticketPavilion.position.set(-4.5, 0.42, 5.9);
  const booth = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.18, 1.12), materials.terracotta);
  booth.position.y = 0.65;
  // Keep the existing pavilion roof silhouette, but make the awning readable
  // from above as well as from its counter: alternating carnival fabric panels.
  const ticketRoofGeometry = new THREE.ConeGeometry(1.18, 0.68, 8).toNonIndexed();
  const ticketRoofPositions = ticketRoofGeometry.getAttribute('position');
  const ticketRoofColors = new Float32Array(ticketRoofPositions.count * 3);
  for (let i = 0; i < ticketRoofPositions.count; i += 3) {
    let x = 0, z = 0;
    for (let v = 0; v < 3; v++) { x += ticketRoofPositions.getX(i + v); z += ticketRoofPositions.getZ(i + v); }
    const panel = Math.floor((Math.atan2(x, z) + Math.PI * 2) / (Math.PI / 4));
    const color = new THREE.Color(panel % 2 ? 0xffe0a6 : 0xc33f4f);
    for (let v = 0; v < 3; v++) color.toArray(ticketRoofColors, (i + v) * 3);
  }
  ticketRoofGeometry.setAttribute('color', new THREE.BufferAttribute(ticketRoofColors, 3));
  const ticketRoofMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78 });
  const awning = new THREE.Mesh(ticketRoofGeometry, ticketRoofMaterial);
  awning.name = 'ISLAND_19_D021_STRIPED_TICKET_PAVILION_ROOF';
  awning.position.y = 1.56;
  awning.rotation.y = Math.PI / 4;
  const ticketSign = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.34, 0.1), materials.gold);
  ticketSign.name = 'ISLAND_19_CIRCUIT_F_TICKETS_SIGN';
  ticketSign.position.set(0, 1.22, 0.62);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.16, 0.22), materials.ivoryStone);
  counter.position.set(0, 0.7, 0.68);
  const signCrest = new THREE.Mesh(createCastleStarGeometry(0.2, 0.08, 0.04), materials.terracotta);
  signCrest.position.set(0, 1.22, 0.69);
  ticketPavilion.add(booth, awning, ticketSign, counter, signCrest);
  root.add(ticketPavilion);

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = true;
  });
  return { root, ferris, carouselPivot, dropCarriage, syncGondolas };
}

function createParkDressing(materials: Island19CircuitFMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_F_CARNIVAL_GARDENS_AND_LIGHTS';
  const treeCount = quality === 'high' ? 38 : quality === 'medium' ? 30 : 22;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.055, 0.08, 0.68, 6),
    materials.gold,
    treeCount,
  );
  trunks.name = 'ISLAND_19_CIRCUIT_F_INSTANCED_PARK_TREE_TRUNKS';
  const crowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.34, 0.88, 7),
    materials.garden,
    treeCount,
  );
  crowns.name = 'ISLAND_19_CIRCUIT_F_INSTANCED_PARK_TREE_CROWNS';
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index / treeCount * Math.PI * 2 + 0.08 * Math.sin(index * 2.2);
    const radius = index % 3 === 0 ? 6.75 : index % 3 === 1 ? 7.35 : 5.92;
    const scale = 0.72 + index % 5 * 0.08;
    const x = Math.cos(angle) * radius - 0.08;
    const z = Math.sin(angle) * radius + 0.18;
    matrix.compose(
      new THREE.Vector3(x, 0.77, z),
      new THREE.Quaternion().setFromAxisAngle(WORLD_UP, angle),
      new THREE.Vector3(scale, scale, scale),
    );
    trunks.setMatrixAt(index, matrix);
    matrix.compose(
      new THREE.Vector3(x, 1.35, z),
      new THREE.Quaternion().setFromAxisAngle(WORLD_UP, angle + 0.2),
      new THREE.Vector3(scale, scale, scale),
    );
    crowns.setMatrixAt(index, matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  trunks.receiveShadow = true;
  crowns.receiveShadow = true;
  root.add(trunks, crowns);

  const lanternCount = quality === 'low' ? 18 : 28;
  const lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 7, 5), materials.gold, lanternCount);
  lanterns.name = 'ISLAND_19_CIRCUIT_F_INSTANCED_CARNIVAL_LANTERNS';
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = index / lanternCount * Math.PI * 2;
    const radius = index % 2 === 0 ? 4.35 : 7.7;
    matrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius, 1.02 + index % 3 * 0.08, Math.sin(angle) * radius),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    );
    lanterns.setMatrixAt(index, matrix);
  }
  lanterns.instanceMatrix.needsUpdate = true;
  root.add(lanterns);
  return root;
}

function createCenterPlaza(materials: Island19CircuitFMaterials) {
  const plaza = new THREE.Group();
  plaza.name = 'ISLAND_19_CIRCUIT_F_CENTER_BOARD_PLAZA';
  const paving = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.45, 0.16, 48), materials.plazaStone);
  paving.position.y = 0.34;
  paving.receiveShadow = true;
  plaza.add(paving);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.0, 0.3, 28), materials.ivoryStone);
  basin.position.y = 0.58;
  basin.castShadow = true;
  basin.receiveShadow = true;
  plaza.add(basin);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.055, 28), materials.water);
  pool.name = 'ISLAND_19_CIRCUIT_F_FOUNTAIN_WATER';
  pool.position.y = 0.755;
  plaza.add(pool);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.85, 10), materials.gold);
  fountain.position.y = 1.12;
  plaza.add(fountain);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.48), materials.garden);
    bed.position.set(Math.cos(angle) * 2.45, 0.52, Math.sin(angle) * 2.45);
    bed.rotation.y = -angle;
    bed.castShadow = true;
    plaza.add(bed);
  }
  return plaza;
}

function createCavernMacro(path: THREE.CurvePath<THREE.Vector3>, materials: Island19CircuitFMaterials, quality: Island3DQuality) {
  const cavern = new THREE.Group();
  cavern.name = 'ISLAND_19_CIRCUIT_F_TRAVERSABLE_TREASURE_CAVERN';
  const tunnelSampleCount = quality === 'high' ? 56 : quality === 'medium' ? 42 : 32;
  const tunnelCurve = exactRouteSlice(path, routeAnchor(path, 'plunge-mouth'), routeAnchor(path, 'undersea-entry'));
  const tunnelMaterial = materials.cavern.clone();
  tunnelMaterial.color.setHex(0x241b20);
  tunnelMaterial.roughness = 1;
  tunnelMaterial.side = THREE.DoubleSide;
  const tunnelShell = new THREE.Mesh(
    trimGrottoIntersection(new THREE.TubeGeometry(tunnelCurve, tunnelSampleCount * 6, wonderRoute.radius, quality === 'high' ? 24 : 18, false),
      point => grandGrottoNorm(point) < 1.01),
    tunnelMaterial,
  );
  tunnelShell.name = 'ISLAND_19_CIRCUIT_F_CAVERN_INTERIOR_SHELL';
  tunnelShell.receiveShadow = true;
  cavern.add(tunnelShell);
  const ribCount = quality === 'high' ? 9 : quality === 'medium' ? 7 : 5;
  for (let index = 0; index < ribCount; index += 1) {
    const start = routeAnchor(path, 'gold-vault');
    const end = routeAnchor(path, 'undersea-entry');
    const u = start + index / Math.max(1, ribCount - 1) * (end - start) * 0.93;
    const frame = frameAt(path, u);
    if (grandGrottoNorm(frame.position) < 1.05) continue;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.05, 6, 32), materials.wetBasalt);
    arch.name = `ISLAND_19_CIRCUIT_F_CAVERN_RIB_${index + 1}`;
    arch.position.copy(frame.position);
    arch.quaternion.copy(frame.quaternion);
    arch.castShadow = true;
    cavern.add(arch);
    const isDiamond = u > routeAnchor(path, 'diamond-gallery') + 0.02;
    const clusterGeometry = isDiamond
      ? new THREE.OctahedronGeometry(index % 3 === 0 ? 0.68 : 0.46, 0)
      : new THREE.DodecahedronGeometry(index % 4 === 0 ? 0.62 : 0.42, 0);
    for (const side of [-1, 1]) {
      const cluster = new THREE.Mesh(clusterGeometry, isDiamond ? materials.diamond : materials.gold);
      cluster.name = `ISLAND_19_CIRCUIT_F_${isDiamond ? 'DIAMOND' : 'GOLD'}_TREASURE_RIB_${index + 1}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
      cluster.position.copy(frame.position)
        .addScaledVector(frame.side, side * 1.38)
        .addScaledVector(frame.up, isDiamond ? -0.2 + (index % 3) * 0.32 : 0.65 + (index % 3) * 0.14);
      cluster.rotation.set(index * 0.31, index * 0.53, side * 0.2);
      cavern.add(cluster);
    }
  }
  // Dense treasure banks make both wagon viewpoints read as a deliberate
  // gold vault followed by a cool diamond gallery, not a few isolated gems.
  const treasureGeometry = new THREE.CylinderGeometry(0.21, 0.24, 0.09, 12);
  for (let bank = 0; bank < (quality === 'high' ? 120 : quality === 'medium' ? 80 : 48); bank += 1) {
    const start = routeAnchor(path, 'gold-vault');
    const end = routeAnchor(path, 'undersea-entry');
    const u = start + (bank % 30) / 30 * (end - start) * 0.94;
    const frame = frameAt(path, u);
    const isDiamond = u > routeAnchor(path, 'diamond-gallery') + 0.02;
    const side = bank % 2 === 0 ? -1 : 1;
    if (grandGrottoNorm(frame.position) < 1.05) continue;
    const treasure = new THREE.Mesh(
      isDiamond ? new THREE.OctahedronGeometry(0.19 + bank % 4 * 0.045, 0) : treasureGeometry,
      isDiamond ? materials.diamond : materials.gold,
    );
    treasure.name = `ISLAND_19_CIRCUIT_F_${isDiamond ? 'DIAMOND' : 'GOLD'}_TREASURE_${bank + 1}`;
    treasure.position.copy(frame.position)
      .addScaledVector(frame.side, side * (isDiamond ? 1.08 + bank % 3 * 0.09 : 1.0 + bank % 3 * 0.06))
      .addScaledVector(frame.up, isDiamond ? -0.6 + bank % 6 * 0.16 : 0.6 + bank % 6 * 0.1)
      .addScaledVector(frame.tangent, (bank % 7 - 3) * 0.055);
    treasure.rotation.set(bank * 0.37, bank * 0.61, side * 0.22);
    cavern.add(treasure);
  }
  const treasureLights: THREE.PointLight[] = [];
  [
    [routeAnchor(path, 'gold-vault'), 0xffb13c, 5.4],
    [routeAnchor(path, 'gold-vault') + 0.02, 0xffd56c, 4.1],
    [routeAnchor(path, 'diamond-gallery'), 0x69e8ff, 5.5],
    [routeAnchor(path, 'undersea-entry') - 0.02, 0xb8f7ff, 4.2],
  ].forEach(([u, color, intensity], index) => {
    const frame = frameAt(path, Number(u));
    const light = new THREE.PointLight(Number(color), Number(intensity), 5.2, 1.6);
    light.name = `ISLAND_19_CIRCUIT_F_TREASURE_LIGHT_${index + 1}`;
    light.position.copy(frame.position).addScaledVector(frame.up, 0.45);
    treasureLights.push(light);
  });
  const seaCaveRim = new THREE.Group();
  seaCaveRim.name = 'ISLAND_19_CIRCUIT_F_OPEN_SEA_CAVE_RIM';
  const mouthFrame = frameAt(path, routeAnchor(path, 'undersea-entry'));
  seaCaveRim.position.copy(mouthFrame.position);
  seaCaveRim.quaternion.copy(mouthFrame.quaternion);
  const portalWall = new THREE.Mesh(createArchShape(5.4, 4.35, 0.92), materials.wetBasalt);
  portalWall.name = 'ISLAND_19_CIRCUIT_F_CONTINUOUS_CARVED_SEA_CAVE_APERTURE';
  portalWall.position.set(0, -0.96, -0.38);
  portalWall.castShadow = true;
  portalWall.receiveShadow = true;
  seaCaveRim.add(portalWall);
  const mouthRockGeometry = new THREE.DodecahedronGeometry(0.64, 0);
  [
    [-2.42, 0.02, 0.18, 1.0, 1.7, 0.68],
    [2.42, 0.02, 0.18, 1.0, 1.7, 0.68],
    [-2.05, 2.68, 0.08, 1.0, 0.78, 0.62],
    [0, 3.16, 0.02, 1.2, 0.66, 0.62],
    [2.05, 2.68, 0.08, 1.0, 0.78, 0.62],
  ].forEach(([x, y, z, sx, sy, sz], index) => {
    const rock = new THREE.Mesh(mouthRockGeometry, materials.wetBasalt);
    rock.name = `ISLAND_19_CIRCUIT_F_SEA_CAVE_MOUTH_ROCK_${index + 1}`;
    rock.position.set(x, y, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(index * 0.22, index * 0.41, index % 2 === 0 ? -0.16 : 0.18);
    rock.castShadow = true;
    seaCaveRim.add(rock);
  });
  for (let sprayIndex = 0; sprayIndex < 11; sprayIndex += 1) {
    const spray = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + sprayIndex % 3 * 0.025, 7, 5),
      materials.foam,
    );
    spray.name = `ISLAND_19_CIRCUIT_F_SEA_CAVE_SPRAY_${sprayIndex + 1}`;
    spray.position.set(-1.2 + sprayIndex * 0.24, -0.82 + (sprayIndex % 3) * 0.09, 0.15 + (sprayIndex % 2) * 0.12);
    spray.scale.y = 1.5 + sprayIndex % 4 * 0.25;
    seaCaveRim.add(spray);
  }
  batchStaticGroupByMaterial(cavern, 'ISLAND_19_CONTINUOUS_CAVERN_BATCH');
  cavern.add(seaCaveRim, ...treasureLights);
  return cavern;
}

function createUnderseaGlassTube(
  path: THREE.CurvePath<THREE.Vector3>,
  materials: Island19CircuitFMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_I_DEEP_UNDERSEA_GLASS_TUBE';
  const tubeSampleCount = quality === 'high' ? 64 : quality === 'medium' ? 48 : 36;
  const tubeStart = routeAnchor(path, 'undersea-entry');
  const tubeEnd = 0.9999;
  const curve = exactRouteSlice(path, tubeStart, tubeEnd);
  const glass = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubeSampleCount * 2, 1.48, quality === 'high' ? 18 : 14, false),
    materials.glassTube,
  );
  glass.name = 'ISLAND_19_CIRCUIT_I_TRANSPARENT_UNDERSEA_PRESSURE_SHELL';
  glass.renderOrder = 8;
  glass.userData = {
    decisionId: 'd017',
    pressureShell: true,
    belowSeaLevel: true,
    gameplayAuthority: false,
  };
  root.add(glass);

  const ringCount = quality === 'high' ? 20 : quality === 'medium' ? 16 : 12;
  const ringGeometry = new THREE.TorusGeometry(1.49, 0.045, 7, quality === 'high' ? 24 : 18);
  const rings = new THREE.InstancedMesh(ringGeometry, materials.gold, ringCount);
  rings.name = 'ISLAND_19_CIRCUIT_I_INSTANCED_UNDERSEA_PRESSURE_RINGS';
  const matrix = new THREE.Matrix4();
  const supportSegments: Array<readonly [THREE.Vector3, THREE.Vector3]> = [];
  for (let index = 0; index < ringCount; index += 1) {
    const u = tubeStart + index / Math.max(1, ringCount - 1) * (tubeEnd - tubeStart);
    const frame = frameAt(path, u);
    matrix.compose(frame.position, frame.quaternion, new THREE.Vector3(1, 1, 1));
    rings.setMatrixAt(index, matrix);
    if (frame.position.y < ISLAND_19_CIRCUIT_G_OCEAN_LEVEL + 0.2 && index % 2 === 0) {
      const leftTop = frame.position.clone().addScaledVector(frame.side, -1.08).addScaledVector(frame.up, -0.62);
      const rightTop = frame.position.clone().addScaledVector(frame.side, 1.08).addScaledVector(frame.up, -0.62);
      const leftFoot = leftTop.clone().setY(-8.62);
      const rightFoot = rightTop.clone().setY(-8.62);
      supportSegments.push([leftFoot, leftTop], [rightFoot, rightTop], [leftFoot, rightTop], [rightFoot, leftTop]);
    }
  }
  rings.instanceMatrix.needsUpdate = true;
  rings.userData = { decisionId: 'd017', actionReadyPart: 'undersea-pressure-ring-system' };
  root.add(rings);
  if (supportSegments.length > 0) {
    root.add(createInstancedRodSystem(
      'ISLAND_19_CIRCUIT_I_UNDERSEA_TUBE_SEAFLOOR_SUPPORTS',
      supportSegments,
      0.055,
      materials.gold,
    ));
  }

  const seaFloor = new THREE.Mesh(createSeabedOutsideGrandGrotto(-8.62, 3.8, -2.9),
    new THREE.MeshStandardMaterial({ color: 0x729b96, roughness: 0.96, emissive: 0x123e47, emissiveIntensity: 0.3 }));
  seaFloor.name = 'ISLAND_19_CIRCUIT_I_UNDERSEA_VISIBLE_SEABED';
  seaFloor.rotation.x = -Math.PI / 2;
  seaFloor.position.set(3.8, -8.62, -2.9);
  seaFloor.receiveShadow = true;
  root.add(seaFloor);
  const reefCount = quality === 'low' ? 28 : 56;
  const reefRocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.46, 0), materials.terracotta, reefCount);
  reefRocks.name = 'ISLAND_19_CIRCUIT_I_INSTANCED_UNDERSEA_REEF_GARDEN';
  for (let index = 0; index < reefCount; index += 1) {
    const angle = index / reefCount * Math.PI * 2 + 0.28 * Math.sin(index * 1.7);
    const frame = frameAt(path, tubeStart + index / reefCount * (routeAnchor(path, 'ascent-foot') - tubeStart));
    const position = frame.position.clone().addScaledVector(frame.side, (index % 2 === 0 ? -1 : 1) * (2.4 + index % 5 * 0.46));
    position.y = -8.18 + index % 3 * 0.09;
    const scale = 0.66 + index % 4 * 0.19;
    matrix.compose(
      position,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(index * 0.19, angle, index % 2 === 0 ? 0.15 : -0.12)),
      new THREE.Vector3(scale, 0.72 + index % 3 * 0.16, scale),
    );
    reefRocks.setMatrixAt(index, matrix);
  }
  reefRocks.instanceMatrix.needsUpdate = true;
  root.add(reefRocks);

  const seaGrassCount = quality === 'low' ? 18 : 32;
  const seaGrass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.82, 6), materials.teal, seaGrassCount);
  seaGrass.name = 'ISLAND_19_CIRCUIT_I_INSTANCED_UNDERSEA_SEA_GRASS';
  for (let index = 0; index < seaGrassCount; index += 1) {
    const angle = index / seaGrassCount * Math.PI * 2;
    const frame = frameAt(path, tubeStart + index / seaGrassCount * (routeAnchor(path, 'ascent-foot') - tubeStart));
    const position = frame.position.clone().addScaledVector(frame.side, (index % 2 === 0 ? -1 : 1) * (2.1 + index % 7 * 0.37));
    position.y = -8.12;
    matrix.compose(
      position,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08 * Math.sin(index), angle, 0.13 * Math.cos(index * 1.7))),
      new THREE.Vector3(0.8 + index % 3 * 0.2, 0.7 + index % 4 * 0.16, 0.8 + index % 3 * 0.2),
    );
    seaGrass.setMatrixAt(index, matrix);
  }
  seaGrass.instanceMatrix.needsUpdate = true;
  root.add(seaGrass);

  // A small, batched school and bubble field keeps the transparent tube from
  // reading as a cyan tunnel painted onto a flat backdrop.
  const fishCount = quality === 'low' ? 12 : 20;
  const fishGeometry = new THREE.IcosahedronGeometry(0.28, 0);
  fishGeometry.scale(1.65, 0.62, 0.42);
  const fish = new THREE.InstancedMesh(fishGeometry, materials.teal, fishCount);
  fish.name = 'ISLAND_19_CIRCUIT_I_UNDERSEA_FISH_SCHOOL';
  for (let index = 0; index < fishCount; index += 1) {
    const u = tubeStart + (index % 10) / 10 * (routeAnchor(path, 'ascent-foot') - tubeStart);
    const frame = frameAt(path, u);
    const sideDistance = (index % 2 === 0 ? -1 : 1) * (2.05 + index % 4 * 0.28);
    const position = frame.position.clone()
      .addScaledVector(frame.side, sideDistance)
      .addScaledVector(frame.up, -0.25 + index % 5 * 0.32)
      .addScaledVector(frame.tangent, (index % 3 - 1) * 0.4);
    const quaternion = frame.quaternion.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(WORLD_UP, index % 2 === 0 ? 0 : Math.PI),
    );
    const scale = 0.7 + index % 3 * 0.16;
    matrix.compose(position, quaternion, new THREE.Vector3(scale, scale, scale));
    fish.setMatrixAt(index, matrix);
  }
  fish.instanceMatrix.needsUpdate = true;
  root.add(fish);

  const bubbleCount = quality === 'low' ? 18 : 32;
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 7, 5), materials.foam, bubbleCount);
  bubbles.name = 'ISLAND_19_CIRCUIT_I_UNDERSEA_BUBBLE_FIELD';
  for (let index = 0; index < bubbleCount; index += 1) {
    const u = tubeStart + (index % 16) / 16 * (routeAnchor(path, 'ascent-foot') - tubeStart);
    const frame = frameAt(path, u);
    const position = frame.position.clone()
      .addScaledVector(frame.side, (index % 2 === 0 ? -1 : 1) * (1.72 + index % 5 * 0.19))
      .addScaledVector(frame.up, -0.72 + index % 7 * 0.29);
    const scale = 0.55 + index % 4 * 0.17;
    matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
    bubbles.setMatrixAt(index, matrix);
  }
  bubbles.instanceMatrix.needsUpdate = true;
  root.add(bubbles);

  root.userData = {
    decisionId: 'd017',
    tubeStart,
    tubeEnd,
    oceanLevel: ISLAND_19_CIRCUIT_G_OCEAN_LEVEL,
    structuralRingCount: ringCount,
    purpose: 'deep undersea glass-tube journey and authored return ascent',
    gameplayAuthority: false,
  };
  return root;
}

function batchStaticGroupByMaterial(root: THREE.Group, batchPrefix: string) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const geometriesByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    object.updateWorldMatrix(true, false);
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
    const geometries = geometriesByMaterial.get(object.material) ?? [];
    geometries.push(geometry);
    geometriesByMaterial.set(object.material, geometries);
  });
  root.clear();
  let batchIndex = 0;
  geometriesByMaterial.forEach((geometries, material) => {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error(`${batchPrefix} could not merge material batch ${batchIndex}.`);
    const batch = new THREE.Mesh(merged, material);
    batch.name = `${batchPrefix}_${String(batchIndex).padStart(2, '0')}`;
    batch.userData = { staticPresentationBatch: true, sourceMeshCount: geometries.length };
    root.add(batch);
    geometries.forEach((geometry) => geometry.dispose());
    batchIndex += 1;
  });
  root.userData.staticBatchCount = batchIndex;
  return root;
}

function createOceanVista(materials: Island19CircuitFMaterials, quality: Island3DQuality) {
  const vista = new THREE.Group();
  vista.name = 'ISLAND_19_CIRCUIT_F_MARVELOUS_OCEAN_VISTA';
  const islets = [
    [-0.65, -1.08, -13.9, 1.18],
    [4.2, -1.08, -16.4, 0.84],
    [-5.1, -1.1, -17.8, 0.76],
    [0.9, -1.11, -20.4, 0.58],
  ] as const;
  islets.forEach(([x, y, z, scale], index) => {
    const rockCluster = new THREE.Group();
    rockCluster.name = `ISLAND_19_CIRCUIT_F_OCEAN_ISLET_${index + 1}`;
    rockCluster.position.set(x, y, z);
    rockCluster.scale.setScalar(scale);
    for (let rockIndex = 0; rockIndex < (index === 0 ? 5 : 3); rockIndex += 1) {
      const angle = rockIndex / (index === 0 ? 5 : 3) * Math.PI * 2 + index * 0.41;
      const radius = rockIndex === 0 ? 0 : 0.62;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rockIndex === 0 ? 0.92 : 0.68, 0),
        materials.wetBasalt,
      );
      rock.position.set(Math.cos(angle) * radius, 0.48 + (rockIndex % 2) * 0.1, Math.sin(angle) * radius * 0.72);
      rock.scale.set(1.05, 0.92 + (rockIndex % 3) * 0.14, 0.88);
      rock.rotation.set(rockIndex * 0.19, angle, rockIndex % 2 === 0 ? 0.12 : -0.1);
      rockCluster.add(rock);
    }
    const green = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.34, 0.24, 12), materials.terrace);
    green.name = `ISLAND_19_CIRCUIT_F_OCEAN_ISLET_GREEN_${index + 1}`;
    green.position.y = 1.03;
    rockCluster.add(green);
    vista.add(rockCluster);
    const treeCount = index === 0 ? 3 : 2;
    for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.52, 6), materials.gold);
      trunk.position.set(x + (treeIndex - 1) * 0.42 * scale, y + 1.34 * scale, z + Math.sin(treeIndex * 2.1) * 0.24 * scale);
      trunk.scale.setScalar(scale);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 7), materials.terrace);
      crown.position.copy(trunk.position);
      crown.position.y += 0.38 * scale;
      crown.scale.setScalar(scale);
      vista.add(trunk, crown);
    }
    if (index === 0) {
      const lighthouse = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 1.45, 12), materials.ivoryStone);
      lighthouse.name = 'ISLAND_19_CIRCUIT_F_OCEAN_LIGHTHOUSE';
      lighthouse.position.set(x + 0.58, y + 1.82 * scale, z - 0.16);
      const lighthouseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.2, 0.23, 12), materials.terracotta);
      lighthouseBand.position.copy(lighthouse.position);
      lighthouseBand.position.y += 0.22;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), materials.gold);
      beacon.position.copy(lighthouse.position);
      beacon.position.y += 0.87;
      const lighthouseRoof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 12), materials.teal);
      lighthouseRoof.position.copy(beacon.position);
      lighthouseRoof.position.y += 0.27;
      vista.add(lighthouse, lighthouseBand, beacon, lighthouseRoof);
    }
  });

  const sailPositions = [
    [-3.2, -1.03, -10.9, 1.0, 0.1],
    [3.25, -1.04, -12.35, 0.86, -0.34],
    [-5.45, -1.06, -14.9, 0.66, 0.26],
    [5.6, -1.07, -17.5, 0.6, -0.2],
    [1.55, -1.09, -18.7, 0.52, 0.18],
  ] as const;
  const sailCount = quality === 'low' ? 3 : sailPositions.length;
  for (let index = 0; index < sailCount; index += 1) {
    const [x, y, z, scale, rotation] = sailPositions[index];
    const boat = new THREE.Group();
    boat.name = `ISLAND_19_CIRCUIT_F_OCEAN_SAILBOAT_${index + 1}`;
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 7),
      index % 2 === 0 ? materials.terracotta : materials.teal,
    );
    hull.scale.set(1.45, 0.28, 0.48);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.26), materials.ivoryStone);
    deck.position.y = 0.11;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.08, 7), materials.darkSteel);
    mast.position.set(0, 0.62, 0);
    const mainSailShape = new THREE.Shape();
    mainSailShape.moveTo(0.02, 0.06);
    mainSailShape.lineTo(0.02, 0.94);
    mainSailShape.lineTo(0.58, 0.1);
    mainSailShape.closePath();
    const mainSail = new THREE.Mesh(new THREE.ShapeGeometry(mainSailShape), materials.ivoryStone);
    mainSail.position.set(0.035, 0.2, 0.03);
    const accentSailShape = new THREE.Shape();
    accentSailShape.moveTo(-0.02, 0.08);
    accentSailShape.lineTo(-0.02, 0.72);
    accentSailShape.lineTo(-0.42, 0.12);
    accentSailShape.closePath();
    const accentSail = new THREE.Mesh(
      new THREE.ShapeGeometry(accentSailShape),
      index % 2 === 0 ? materials.teal : materials.terracotta,
    );
    accentSail.position.set(-0.035, 0.22, 0.025);
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.05), materials.foam);
    wake.name = `ISLAND_19_CIRCUIT_F_OCEAN_BOAT_WAKE_${index + 1}`;
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(-0.9, -0.06, 0);
    boat.add(hull, deck, mast, mainSail, accentSail, wake);
    boat.position.set(x, y, z);
    boat.rotation.y = rotation;
    boat.scale.setScalar(scale);
    vista.add(boat);
  }
  for (let streak = 0; streak < 9; streak += 1) {
    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 1.2 + streak * 0.16), materials.foam);
    glint.name = `ISLAND_19_CIRCUIT_F_OCEAN_SUN_GLINT_${streak + 1}`;
    glint.position.set(4.8 - streak * 0.36, -1.145, -6.8 - streak * 0.72);
    glint.rotation.y = 0.2;
    vista.add(glint);
  }
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe7a1 }),
  );
  sun.name = 'ISLAND_19_CIRCUIT_F_OCEAN_REVEAL_SUN';
  sun.position.set(-2.4, 7.8, -20.5);
  vista.add(sun);
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.92 });
  for (let cloudIndex = 0; cloudIndex < 5; cloudIndex += 1) {
    const cloud = new THREE.Group();
    cloud.name = `ISLAND_19_CIRCUIT_F_OCEAN_CLOUD_${cloudIndex + 1}`;
    for (let puff = 0; puff < 4; puff += 1) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5 + (puff % 2) * 0.18, 10, 7), cloudMaterial);
      sphere.position.set((puff - 1.5) * 0.62, puff % 2 * 0.24, Math.sin(puff) * 0.18);
      cloud.add(sphere);
    }
    cloud.position.set(-7 + cloudIndex * 3.5, 5.3 + (cloudIndex % 2) * 1.15, -15.5 - cloudIndex * 1.1);
    cloud.scale.setScalar(0.7 + (cloudIndex % 3) * 0.18);
    vista.add(cloud);
  }
  for (let balloonIndex = 0; balloonIndex < 2; balloonIndex += 1) {
    const balloon = new THREE.Group();
    balloon.name = `ISLAND_19_CIRCUIT_F_OCEAN_BALLOON_${balloonIndex + 1}`;
    const envelope = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 9),
      balloonIndex === 0 ? materials.terracotta : materials.teal,
    );
    envelope.scale.y = 1.28;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.16), materials.gold);
    basket.position.y = -0.72;
    balloon.add(envelope, basket);
    balloon.position.set(balloonIndex === 0 ? 2.2 : -5.4, balloonIndex === 0 ? 4.0 : 3.1, -13.2 - balloonIndex * 2.8);
    vista.add(balloon);
  }
  return batchStaticGroupByMaterial(vista, 'ISLAND_19_CIRCUIT_H_OCEAN_VISTA_BATCH');
}

function createTrain(materials: Island19CircuitFMaterials) {
  const train = new THREE.Group();
  train.name = 'ISLAND_19_CIRCUIT_F_WONDER_EXPRESS_TRAIN';
  for (let carriage = 0; carriage < 4; carriage += 1) {
    const car = new THREE.Group();
    car.name = `ISLAND_19_CIRCUIT_F_CARRIAGE_${carriage + 1}`;
    const bodyHeight = carriage === 0 ? 0.34 : 0.54;
    const bodyGeometry = new THREE.SphereGeometry(.5, 20, 12);
    bodyGeometry.scale(.86, bodyHeight, TRAIN_CARRIAGE_LENGTH);
    const body = new THREE.Mesh(bodyGeometry, materials.teal);
    body.position.y = carriage === 0 ? 0.2 : 0.3;
    body.castShadow = true;
    car.add(body);
    const cushionMaterial = new THREE.MeshStandardMaterial({color:0x642626,roughness:.8});
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(.64,.12,.46),cushionMaterial);
    cushion.position.set(0,.35,-.05);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(.72,.3,.10),cushionMaterial);
    backrest.position.set(0,.54,-.32);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(.76,.15,.10),materials.teal);
    nose.position.set(0,.34,.40);
    car.add(cushion,backrest,nose);
    for(const side of [-1,1]){
      const panel=new THREE.Mesh(new THREE.BoxGeometry(.055,.14,.72),materials.teal);
      panel.position.set(side*.395,.31,0);
      car.add(panel);
      const trimPoints=[new THREE.Vector3(side*.426,.32,-.35),new THREE.Vector3(side*.426,.38,-.24),new THREE.Vector3(side*.426,.38,.24),new THREE.Vector3(side*.426,.42,.4)];
      car.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trimPoints),18,.013,6,false),materials.gold));
      for(let rivet=0;rivet<6;rivet++){
        const stud=new THREE.Mesh(new THREE.SphereGeometry(.018,6,4),materials.gold);
        stud.position.set(side*.43,.35,.30-rivet*.12);
        car.add(stud);
      }
    }
    const noseCrest = new THREE.Mesh(createCastleStarGeometry(.095,.044,.012),materials.gold);
    noseCrest.position.set(0,.33,.458);
    car.add(noseCrest);
    const noseTrim=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.76,8),materials.gold);
    noseTrim.rotation.z=Math.PI/2;
    noseTrim.position.set(0,.43,.43);
    car.add(noseTrim);
    const restraint = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 16, Math.PI), materials.darkSteel);
    restraint.position.set(0, 0.44, -0.10);
    restraint.rotation.x = Math.PI / 2;
    car.add(restraint);
    const undercarriage = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.66), materials.darkSteel);
    undercarriage.name = `ISLAND_19_CIRCUIT_F_CARRIAGE_${carriage + 1}_UNDERCARRIAGE`;
    undercarriage.position.y = -0.01;
    car.add(undercarriage);
    for (const axleZ of [-0.25, 0.25]) {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.86, 8), materials.gold);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, -0.08, axleZ);
      car.add(axle);
      for (const side of [-1, 1]) {
        const wheelPivot = new THREE.Group();
        wheelPivot.name = `ISLAND_19_CIRCUIT_F_CARRIAGE_${carriage + 1}_WHEEL_PIVOT_${axleZ < 0 ? 'REAR' : 'FRONT'}_${side < 0 ? 'LEFT' : 'RIGHT'}`;
        wheelPivot.position.set(side * 0.39, -0.08, axleZ);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.085, 12), materials.darkSteel);
        wheel.rotation.z = Math.PI / 2;
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.026, 12), materials.gold);
        flange.rotation.z = Math.PI / 2;
        flange.position.x = side * 0.045;
        wheelPivot.add(wheel, flange);
        car.add(wheelPivot);
      }
    }
    // Wheels remain separate live geometry; batching them into the body would
    // leave empty pivots that spin without rotating any visible wheel.
    const liveWheels=car.children.filter(child=>child.name.includes('_WHEEL_PIVOT_'));
    liveWheels.forEach(wheel=>car.remove(wheel));
    batchStaticGroupByMaterial(car, `ISLAND_19_CIRCUIT_H_CARRIAGE_${carriage + 1}_BATCH`);
    car.add(...liveWheels);
    const undercarriageSocket = new THREE.Object3D();
    undercarriageSocket.name = `ISLAND_19_CIRCUIT_F_CARRIAGE_${carriage + 1}_UNDERCARRIAGE`;
    undercarriageSocket.position.y = -0.01;
    undercarriageSocket.userData = { semanticAnimationSocket: true, renderedByCarriageBatch: true };
    car.add(undercarriageSocket);
    if (carriage === 0 || carriage === 2) {
      const riderSocket = new THREE.Object3D();
      riderSocket.name = carriage === 0
        ? 'ISLAND_19_CIRCUIT_I_FRONT_CAR_RIDER_CAMERA_SOCKET'
        : 'ISLAND_19_CIRCUIT_I_MIDDLE_CAR_RIDER_CAMERA_SOCKET';
      riderSocket.position.set(0, carriage === 0 ? 1.2 : 1.16, 0.1);
      riderSocket.userData = {
        semanticCameraSocket: true,
        physicalCarriageIndex: carriage,
        decisionId: 'd017',
        seesCarNose: true,
      };
      car.add(riderSocket);
    }
    train.add(car);
  }
  train.userData = {
    decisionId: 'd017',
    cameraAttachment: 'named carriage-seat sockets',
    remainsVisibleDuringRide: true,
  };
  return train;
}

export function createIsland19CircuitFMaterials(): Island19CircuitFMaterials {
  return {
    basalt: new THREE.MeshStandardMaterial({ color: 0x34383a, roughness: 0.94, metalness: 0.01, flatShading: true }),
    wetBasalt: new THREE.MeshPhysicalMaterial({ color: 0x182b32, roughness: 0.26, metalness: 0.08, clearcoat: 0.72, clearcoatRoughness: 0.2 }),
    terrace: new THREE.MeshStandardMaterial({ color: 0x3d6d3d, roughness: 0.9, metalness: 0.01 }),
    plazaStone: new THREE.MeshStandardMaterial({ color: 0xd9c7a4, roughness: 0.78, metalness: 0.01 }),
    garden: new THREE.MeshStandardMaterial({ color: 0x2d6a3c, roughness: 0.9 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x087eb5, roughness: 0.18, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.16, side: THREE.DoubleSide }),
    foam: new THREE.MeshBasicMaterial({ color: 0xdaf7ff, transparent: true, opacity: 0.78 }),
    redRail: new THREE.MeshPhysicalMaterial({ color: 0xa91f16, roughness: 0.14, metalness: 0.8, clearcoat: 0.92, clearcoatRoughness: 0.08, emissive: 0x2a0402, emissiveIntensity: 0.16, envMapIntensity: 1.35 }),
    ivoryRail: new THREE.MeshStandardMaterial({ color: 0xe9c889, roughness: 0.24, metalness: 0.68, emissive: 0x2d1c07, emissiveIntensity: 0.1, envMapIntensity: 1.15 }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xe4aa38, roughness: 0.2, metalness: 0.92, clearcoat: 0.36, clearcoatRoughness: 0.1, emissive: 0x6d3505, emissiveIntensity: 0.34 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x282329, roughness: 0.4, metalness: 0.85 }),
    teal: new THREE.MeshPhysicalMaterial({ color: 0x247b78, roughness: 0.43, metalness: 0.58, clearcoat: 0.2 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xa54b39, roughness: 0.68, metalness: 0.03 }),
    ivoryStone: new THREE.MeshStandardMaterial({ color: 0xe5d2ad, roughness: 0.7, metalness: 0.02 }),
    cavern: new THREE.MeshStandardMaterial({ color: 0x4b403e, roughness: 0.96, metalness: 0.01, flatShading: true, side: THREE.DoubleSide }),
    diamond: new THREE.MeshPhysicalMaterial({ color: 0xbaf7ff, roughness: 0.08, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03, emissive: 0x3ccde1, emissiveIntensity: 0.2 }),
    glassTube: new THREE.MeshPhysicalMaterial({ color: 0x72dff4, roughness: 0.08, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, emissive: 0x0c6884, emissiveIntensity: 0.13 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xb9b1a4, roughness: 0.86, metalness: 0.02 }),
  };
}

function applyMaterialMode(root: THREE.Object3D, clay: boolean, clayMaterial: THREE.Material) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.InstancedMesh)) return;
    const mesh = object as THREE.Mesh;
    if (!mesh.userData.circuitFOriginalMaterial) mesh.userData.circuitFOriginalMaterial = mesh.material;
    mesh.material = clay ? clayMaterial : mesh.userData.circuitFOriginalMaterial as THREE.Material;
  });
}

function createDiagnostics(path: THREE.CurvePath<THREE.Vector3>, rootGeometry: THREE.BufferGeometry): Island19CircuitFDiagnostics {
  const boardRouteViolations: string[] = [];
  for (let index = 0; index < 240; index += 1) {
    const frame = frameAt(path, index / 240);
    const radial = Math.hypot(frame.position.x, frame.position.z);
    const withinBoardCorridor = radial >= ROUTE_INNER_RADIUS && radial <= ROUTE_OUTER_RADIUS;
    const overlapsBoardHeight = frame.position.y + TRAIN_HALF_HEIGHT > 0.48
      && frame.position.y - TRAIN_HALF_HEIGHT < 0.72;
    if (withinBoardCorridor && overlapsBoardHeight) {
      boardRouteViolations.push(`u=${frame.u.toFixed(4)} radial=${radial.toFixed(3)} y=${frame.position.y.toFixed(3)}`);
    }
  }
  const openSeaCaveFaceCount = Number(rootGeometry.userData.openSeaCaveFaceCount ?? 0);
  const phases = Array.from(new Set(Array.from({ length: 360 }, (_, index) => phaseAt(path, index / 360))));
  const portalSideMargin = 1.12 - TRAIN_HALF_WIDTH;
  const portalTopMargin = 2.28 - TRAIN_HALF_HEIGHT * 2;
  const errors: string[] = [];
  if (openSeaCaveFaceCount < 4) errors.push('sea cave is not topologically open');
  if (portalSideMargin < 0.25 || portalTopMargin < 0.25) errors.push('train portal clearance below contract');
  if (phases.length !== 10) errors.push('ride phase coverage incomplete');
  if (boardRouteViolations.length > 0) errors.push('ride route intersects the canonical board corridor at board height');
  return {
    valid: errors.length === 0,
    pathOwner: ISLAND_19_CIRCUIT_F_PATH_OWNER,
    pathLength: path.getLength(),
    rootSectorCount: Number(rootGeometry.userData.sectors ?? 0),
    rootRingCount: Number(rootGeometry.userData.rings?.length ?? TERRAIN_RINGS.length),
    rootWidth: Number(rootGeometry.userData.width ?? 17.56),
    rootDepth: Number(rootGeometry.userData.depth ?? 14.48),
    rootScaleAgainstStandard: 1.35,
    openSeaCaveFaceCount,
    portalSideMargin,
    portalTopMargin,
    minimumSupportContactGap: 0,
    boardRouteViolations,
    phaseCoverage: phases,
    errors,
  };
}

export function createIsland19CoasterCarnivalCircuitFWorld(
  options: Island19CircuitFWorldOptions = {},
): Island19CircuitFWorldRuntime {
  const quality = options.quality ?? 'medium';
  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;
  const root = new THREE.Group();
  root.name = 'ISLAND_19_CIRCUIT_F_ROOT';
  const world = new THREE.Group();
  world.name = 'ISLAND_19_CIRCUIT_F_WORLD';
  root.add(world);
  const materials = createIsland19CircuitFMaterials();
  const path = createIsland19CircuitFRoutePath();
  const pacing = createWonderRidePacing(path, (u) => phaseAt(path, u));
  const cliffRoot = createIsland19CoasterCarnivalCircuitGCliffRoot({
    quality,
    materials,
    castShadow,
    receiveShadow,
    clay: options.clay,
    cutaway: options.cutaway,
    reducedMotion: options.reducedMotion,
  });
  world.add(cliffRoot.root);
  const ocean = new THREE.Mesh(createOceanWithRideApertures(path), materials.water);
  ocean.name = 'ISLAND_19_CIRCUIT_F_OCEAN';
  ocean.rotation.x = -Math.PI / 2;
  // The source island is a deep rock monolith, not a shallow turf puck. The
  // shoreline meets the sea-cave sill so the full faceted cliff remains
  // readable while the elevated exit rail earns its ocean-reveal moment.
  ocean.position.y = ISLAND_19_CIRCUIT_G_OCEAN_LEVEL;
  ocean.receiveShadow = receiveShadow;
  world.add(ocean);
  const foam = new THREE.Mesh(new THREE.RingGeometry(6.65, 8.95, qualitySectors(quality)), materials.foam);
  foam.name = 'ISLAND_19_CIRCUIT_F_SHORE_FOAM';
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-0.1, ISLAND_19_CIRCUIT_G_SHORE_FOAM_LEVEL, 0.2);
  world.add(foam);
  const carnivalLandmarks = createCarnivalLandmarks(materials, quality);
  world.add(carnivalLandmarks.root);
  const parkDressing = createParkDressing(materials, quality);
  world.add(parkDressing);
  // Circuit G is the approved canonical board implementation. The earlier
  // placeholder plaza made the island look like a coaster model with a disc
  // in its centre; mounting the real 36-tile garden/fountain assembly makes
  // the gameplay board and the ride world one coherent place.
  const board = createIsland19CoasterCarnivalCircuitGBoardPlaza({
    quality,
    castShadow,
    receiveShadow,
    reducedMotion: options.reducedMotion,
    clay: options.clay,
  });
  board.root.name = 'ISLAND_19_CIRCUIT_F_APPROVED_CIRCUIT_G_CENTER_BOARD';
  board.root.position.y = 0.03;
  world.add(board.root);
  const castle = createCastleMacro(materials);
  world.add(castle);
  let refreshWorldVisibility: () => void = () => undefined;
  const atlasExterior = createIsland19CoasterCarnivalAtlasExterior({
    castShadow,
    receiveShadow,
    onReady: () => refreshWorldVisibility(),
  });
  world.add(atlasExterior.root);
  const parkDetails = createIsland19ParkDetails(path, quality);
  world.add(parkDetails);
  const segments = qualitySegments(quality);
  const rails = new THREE.Group();
  rails.name = 'ISLAND_19_CIRCUIT_F_WONDER_CIRCUIT_RAILWAY';
  rails.add(
    createRail(path, -TRACK_HALF_GAUGE, TRACK_RAIL_RADIUS, materials.redRail, segments, qualityRadial(quality), 'ISLAND_19_CIRCUIT_F_LEFT_OUTER_RAIL'),
    createRail(path, TRACK_HALF_GAUGE, TRACK_RAIL_RADIUS, materials.redRail, segments, qualityRadial(quality), 'ISLAND_19_CIRCUIT_F_RIGHT_OUTER_RAIL'),
    createRail(path, -RUNNING_HALF_GAUGE, RUNNING_RAIL_RADIUS, materials.ivoryRail, segments, qualityRadial(quality), 'ISLAND_19_CIRCUIT_F_LEFT_RUNNING_RAIL'),
    createRail(path, RUNNING_HALF_GAUGE, RUNNING_RAIL_RADIUS, materials.ivoryRail, segments, qualityRadial(quality), 'ISLAND_19_CIRCUIT_F_RIGHT_RUNNING_RAIL'),
    createTrackTies(path, materials.darkSteel, Math.round(segments * 0.92)),
    createTrackFasteners(path, materials.gold, Math.round(segments * 0.92)),
    createTrackSupports(path, materials.gold, quality === 'high' ? 78 : quality === 'medium' ? 58 : 42),
    createTrackSupportLattice(path, materials.gold, quality),
  );
  const railSupports = rails.getObjectByName('ISLAND_19_CIRCUIT_F_LOAD_PATH_SUPPORTS');
  rails.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.InstancedMesh)) return;
    object.castShadow = castShadow;
    object.receiveShadow = receiveShadow;
  });
  world.add(rails);
  const cavern = createCavernMacro(path, materials, quality);
  world.add(cavern);
  const grandGrotto = createGrandTreasureGrotto(path, materials, quality);
  world.add(grandGrotto);
  const underseaGlassTube = createUnderseaGlassTube(path, materials, quality);
  world.add(underseaGlassTube);
  const cavernShell = cavern.getObjectByName('ISLAND_19_CIRCUIT_F_CAVERN_INTERIOR_SHELL');
  const cavernRibs: THREE.Object3D[] = [];
  const goldTreasures: THREE.Object3D[] = [];
  const diamondTreasures: THREE.Object3D[] = [];
  cavern.traverse((object) => {
    if (object.name.startsWith('ISLAND_19_CIRCUIT_F_CAVERN_RIB_')) cavernRibs.push(object);
    if (object.name.startsWith('ISLAND_19_CIRCUIT_F_GOLD_TREASURE_')) goldTreasures.push(object);
    if (object.name.startsWith('ISLAND_19_CIRCUIT_F_DIAMOND_TREASURE_')) diamondTreasures.push(object);
  });
  const seaCaveRim = cavern.getObjectByName('ISLAND_19_CIRCUIT_F_OPEN_SEA_CAVE_RIM');
  const oceanVista = createOceanVista(materials, quality);
  oceanVista.position.y = ISLAND_19_CIRCUIT_G_OCEAN_VISTA_DROP;
  world.add(oceanVista);
  const skyAmbience = createIsland19SkyAmbience(options.reducedMotion ?? false);
  world.add(skyAmbience.root);
  const train = createTrain(materials);
  world.add(train);
  const diagnostics = createDiagnostics(path, cliffRoot.outerShell.geometry);
  const tempPosition = new THREE.Vector3();
  const getRideFrame = (progress: number, wagon: Island19CircuitFWagon = 'front') => {
    const wagonOffset = wagon === 'front' ? 0 : -TRAIN_CARRIAGE_LENGTH * 2 / diagnostics.pathLength;
    return frameAt(path, progress + wagonOffset);
  };
  const setTrainProgress = (progress: number) => {
    for (let carriage = 0; carriage < train.children.length; carriage += 1) {
      const frame = frameAt(path, progress - carriage * TRAIN_CARRIAGE_LENGTH / diagnostics.pathLength);
      tempPosition.copy(frame.position).addScaledVector(frame.up, 0.12);
      train.children[carriage].position.copy(tempPosition);
      train.children[carriage].quaternion.copy(frame.quaternion);
      const wheelSpin = -(frame.distance / 0.12);
      train.children[carriage].traverse((object) => {
        if (object.name.includes('_WHEEL_PIVOT_')) object.rotation.x = wheelSpin;
      });
    }
    train.updateWorldMatrix(true, true);
  };
  const getRidePhaseStops = () => {
    const lengths = path.getCurveLengths();
    const stops = new Map<string, number>();
    wonderRoute.knots.forEach((knot, index) => {
      if (!stops.has(knot.phase)) stops.set(knot.phase, ((lengths[index - 1] ?? 0) + lengths[index]) / 2 / path.getLength());
    });
    return [...stops.values()];
  };
  const getScenicFocus = (progress: number) => {
    const start = routeAnchor(path, 'grotto-west-balcony');
    const end = routeAnchor(path, 'diamond-gallery');
    const weight = THREE.MathUtils.smoothstep(progress, start, start + .016)
      * (1 - THREE.MathUtils.smoothstep(progress, end - .016, end));
    return { point: new THREE.Vector3(...grottoConfig.treasureFocus as [number, number, number]), weight };
  };
  const getRiderCameraPosition = (progress: number, wagon: Island19CircuitFWagon = 'front') => {
    setTrainProgress(progress);
    const socketName = wagon === 'front'
      ? 'ISLAND_19_CIRCUIT_I_FRONT_CAR_RIDER_CAMERA_SOCKET'
      : 'ISLAND_19_CIRCUIT_I_MIDDLE_CAR_RIDER_CAMERA_SOCKET';
    const socket = train.getObjectByName(socketName);
    if (!socket) {
      const frame = getRideFrame(progress, wagon);
      return frame.position.clone().addScaledVector(frame.up, 0.9).addScaledVector(frame.tangent, -0.12);
    }
    return socket.getWorldPosition(new THREE.Vector3());
  };
  let riderPovActive = false;
  let lastAnimationSeconds = 0;
  let idleRideOriginSeconds = 0;
  const setRiderPovActive = (wagon: Island19CircuitFWagon | null) => {
    riderPovActive = wagon !== null;
    if (!riderPovActive) idleRideOriginSeconds = lastAnimationSeconds;
    train.visible = true;
    train.children.forEach((carriage, index) => {
      carriage.visible = wagon === null
        || (wagon === 'front' ? index === 0 : index <= 2);
    });
    train.userData.activeRiderPov = wagon ?? 'none';
  };
  setTrainProgress(0.18);
  let cutawayEnabled = options.cutaway ?? false;
  let ridePhase: Island19CircuitFRidePhase | null = null;
  const applyWorldVisibility = () => {
    const isRideInterior = ridePhase === 'plunge'
      || ridePhase === 'gold-vault'
      || ridePhase === 'grand-vault'
      || ridePhase === 'diamond-gallery'
      || ridePhase === 'sea-cave';
    // d018: the train travels through the same island. Only the explicit
    // diagnostic cutaway may hide its exterior; ride phases never swap worlds.
    const hideSurface = cutawayEnabled;
    const atlasReady = atlasExterior.root.userData.ready === true;
    // Circuit H replaces only the static exterior render mesh.  Keep the g02
    // root alive for its elapsed-time waterfall ribbons and frozen sockets.
    cliffRoot.root.visible = true;
    cliffRoot.setCutaway(cutawayEnabled);
    if (atlasReady) {
      cliffRoot.outerShell.visible = false;
      cliffRoot.cliffColumns.visible = false;
      cliffRoot.terrace.visible = false;
      cliffRoot.cavernShell.visible = false;
      cliffRoot.seaCaveRim.visible = false;
      cliffRoot.entranceGateway.visible = false;
    }
    ocean.visible = !hideSurface;
    foam.visible = !hideSurface;
    board.root.visible = !hideSurface;
    // Island5ThreePilot already renders and animates the canonical 36 gameplay
    // tiles. The g01 copy exists for its standalone assembly preview, but
    // showing it again here creates 36 z-fighting duplicate tile stacks and
    // triples their visual submissions. Keep only the presentation foundation,
    // gardens, fountain and frozen sockets in the assembled Circuit H world.
    board.tileRoot.visible = false;
    castle.visible = !hideSurface && !atlasReady;
    carnivalLandmarks.root.visible = !hideSurface;
    parkDressing.visible = !hideSurface && !atlasReady;
    parkDetails.visible = !hideSurface && atlasReady;
    atlasExterior.root.visible = !hideSurface;
    oceanVista.visible = !hideSurface;
    underseaGlassTube.visible = true;
    if (railSupports) {
      railSupports.visible = true;
    }
    cavern.visible = true;
    grandGrotto.visible = true;
    // The lining and treasure remain actual scene geometry in every phase.
    if (cavernShell) cavernShell.visible = true;
    cavernRibs.forEach((rib) => { rib.visible = true; });
    if (seaCaveRim) seaCaveRim.visible = true;
    goldTreasures.forEach((treasure) => {
      treasure.visible = true;
    });
    diamondTreasures.forEach((treasure) => {
      treasure.visible = true;
    });
    root.userData.circuitFRideInterior = isRideInterior;
  };
  refreshWorldVisibility = applyWorldVisibility;
  const setCutaway = (enabled: boolean) => {
    cutawayEnabled = enabled;
    applyWorldVisibility();
    root.userData.circuitFCutaway = enabled;
  };
  const setRidePhaseVisibility = (phase: Island19CircuitFRidePhase | null) => {
    ridePhase = phase;
    applyWorldVisibility();
  };
  const setClay = (enabled: boolean) => applyMaterialMode(world, enabled, materials.clay);
  setCutaway(cutawayEnabled);
  setClay(options.clay ?? false);
  const reducedMotion = options.reducedMotion ?? false;
  const animate = (elapsedSeconds: number) => {
    skyAmbience.animate(elapsedSeconds);
    lastAnimationSeconds = elapsedSeconds;
    if (!reducedMotion && !riderPovActive) {
      const rideSeconds = THREE.MathUtils.euclideanModulo(elapsedSeconds - idleRideOriginSeconds, pacing.durationSeconds);
      setTrainProgress(pacing.sampleAtTime(rideSeconds).progress);
    }
    carnivalLandmarks.ferris.rotation.z = reducedMotion ? -0.16 : -elapsedSeconds * 0.12;
    carnivalLandmarks.syncGondolas(carnivalLandmarks.ferris.rotation.z);
    carnivalLandmarks.carouselPivot.rotation.y = reducedMotion ? 0.24 : elapsedSeconds * 0.32;
    carnivalLandmarks.dropCarriage.position.y = reducedMotion
      ? 4.35
      : 2.05 + (Math.sin(elapsedSeconds * 0.78 - Math.PI / 2) * 0.5 + 0.5) * 3.75;
    board.animate(elapsedSeconds);
    cliffRoot.animate(elapsedSeconds);
  };
  const dataset = {
    island19CircuitFWorld: 'mounted',
    island19RepresentativeVariant: 'circuit-i-source-identity-exterior-with-deep-undersea-wonder-express',
    island19CircuitHDecision: 'd015',
    island19CircuitHAsset: String(atlasExterior.root.userData.asset),
    island19CircuitHStaticBudget: '60000-triangles,3-draw-calls',
    island19CircuitHBoardDecorationBatching: 'instanced-paths-gardens-parapets-bollards',
    island19CircuitHDuplicateBoardRouteVisible: 'false',
    island19PathOwner: diagnostics.pathOwner,
    island19CircuitLength: diagnostics.pathLength.toFixed(5),
    island19RootScale: diagnostics.rootScaleAgainstStandard.toFixed(2),
    island19RootSectors: String(diagnostics.rootSectorCount),
    island19RootRings: String(diagnostics.rootRingCount),
    island19SeaCaveOpenFaces: String(diagnostics.openSeaCaveFaceCount),
    island19CircuitGOceanLevel: ISLAND_19_CIRCUIT_G_OCEAN_LEVEL.toFixed(2),
    island19PortalSideMargin: diagnostics.portalSideMargin.toFixed(4),
    island19PortalTopMargin: diagnostics.portalTopMargin.toFixed(4),
    island19BoardRouteViolations: String(diagnostics.boardRouteViolations.length),
    island19RidePhases: diagnostics.phaseCoverage.join(','),
    island19CircuitFValid: String(diagnostics.valid),
    island19WagonViews: 'front,middle',
    island19CircuitIDecisions: 'd016,d017',
    island19PurposeBuiltCastlePortal: 'true',
    island19UnderseaGlassTube: 'deep-below-y--5.05-with-pressure-rings-and-seafloor-supports',
    island19RiderCameraAttachment: 'named-front-and-middle-carriage-seat-sockets',
    ...cliffRoot.dataset,
  };
  Object.assign(root.userData, {
    dataset,
    diagnostics,
    representativePartIds: ISLAND_19_CIRCUIT_F_REPRESENTATIVE_PART_IDS,
    atlasExterior,
  });
  return { root, world, train, cavern, board, materials, path, pacing, diagnostics, dataset, getRideFrame, getRidePhaseStops, getScenicFocus, getRiderCameraPosition, setRiderPovActive, setTrainProgress, setRidePhaseVisibility, animate, setCutaway, setClay };
}
