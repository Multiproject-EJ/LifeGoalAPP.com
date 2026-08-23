import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type ExpeditionShipPose = 'docked' | 'expedition' | 'flight';
export type ExpeditionShipQuality = 'low' | 'high';

export interface ExpeditionShipEnvironmentSignal {
  origin: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
  strength: number;
  phase: number;
}

export interface ExpeditionShipUpdateOptions {
  timeSeconds: number;
  pose: ExpeditionShipPose;
  poseProgress?: number | null;
  thrust?: number;
  boost?: number;
  hover?: number;
  walk?: number;
  stabilize?: number;
  reducedMotion?: boolean;
}

export interface ExpeditionShipThreeModel {
  root: THREE.Group;
  metrics: {triangles: number; meshCount: number; materials: number};
  update: (options: ExpeditionShipUpdateOptions) => ExpeditionShipEnvironmentSignal;
  dispose: () => void;
}

interface ShipMaterials {
  shell: THREE.MeshPhysicalMaterial;
  shellInset: THREE.MeshPhysicalMaterial;
  frame: THREE.MeshPhysicalMaterial;
  frameLight: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  shield: THREE.MeshPhysicalMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  power: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  foliageLight: THREE.MeshStandardMaterial;
  habitatFloor: THREE.MeshPhysicalMaterial;
  habitatFabric: THREE.MeshStandardMaterial;
  workshopSurface: THREE.MeshPhysicalMaterial;
  workshopBronze: THREE.MeshPhysicalMaterial;
  water: THREE.MeshPhysicalMaterial;
  thrust: THREE.MeshBasicMaterial;
  hover: THREE.MeshBasicMaterial;
  ripple: THREE.MeshBasicMaterial;
}

const POSE_PROGRESS: Record<ExpeditionShipPose, number> = {
  docked: 0,
  expedition: 0.5,
  flight: 1,
};

function smoothstep(value: number, min: number, max: number) {
  const t = THREE.MathUtils.clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function poseLerp(progress: number, docked: number, expedition: number, flight: number) {
  if (progress <= 0.5) return THREE.MathUtils.lerp(docked, expedition, smoothstep(progress, 0, 0.5));
  return THREE.MathUtils.lerp(expedition, flight, smoothstep(progress, 0.5, 1));
}

function makeRoundedExtrudeGeometry(width: number, height: number, depth: number, radius: number, bevelSegments: number) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const clampedRadius = Math.min(radius, halfWidth - 0.01, halfHeight - 0.01);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + clampedRadius, -halfHeight);
  shape.lineTo(halfWidth - clampedRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + clampedRadius);
  shape.lineTo(halfWidth, halfHeight - clampedRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - clampedRadius, halfHeight);
  shape.lineTo(-halfWidth + clampedRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - clampedRadius);
  shape.lineTo(-halfWidth, -halfHeight + clampedRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + clampedRadius, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: Math.min(0.12, depth * 0.12),
    bevelThickness: Math.min(0.1, depth * 0.1),
    curveSegments: bevelSegments + 3,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeSurfaceGridGeometry(
  uSegments: number,
  vSegments: number,
  sample: (u: number, v: number) => THREE.Vector3,
  reverseWinding = false,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let vIndex = 0; vIndex <= vSegments; vIndex += 1) {
    for (let uIndex = 0; uIndex <= uSegments; uIndex += 1) {
      const point = sample(uIndex / uSegments, vIndex / vSegments);
      positions.push(point.x, point.y, point.z);
      uvs.push(uIndex / uSegments, vIndex / vSegments);
    }
  }
  const row = uSegments + 1;
  for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
    for (let uIndex = 0; uIndex < uSegments; uIndex += 1) {
      const a = vIndex * row + uIndex;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      if (reverseWinding) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function workshopCanopyY(x: number, z: number) {
  const edge = Math.abs(x) / 1.6;
  return -0.145 - 0.215 * edge * edge - 0.018 * Math.cos(z * Math.PI * 0.72);
}

function makeWorkshopCurvedCanopyGeometry(quality: ExpeditionShipQuality) {
  return makeSurfaceGridGeometry(
    quality === 'high' ? 12 : 8,
    quality === 'high' ? 4 : 3,
    (u, v) => {
      const x = THREE.MathUtils.lerp(-1.6, 1.6, u);
      const z = THREE.MathUtils.lerp(-1.05, 0.95, v);
      return new THREE.Vector3(x, workshopCanopyY(x, z), z);
    },
  );
}

function makeWorkshopCurvedPressureCheekGeometry(side: -1 | 1, quality: ExpeditionShipQuality) {
  return makeSurfaceGridGeometry(
    quality === 'high' ? 8 : 6,
    2,
    (u, v) => {
      const z = THREE.MathUtils.lerp(-1.05, 0.95, u);
      const zNormalized = (z + 0.05) / 1;
      const inwardBow = 0.12 * Math.max(0, 1 - zNormalized * zNormalized);
      return new THREE.Vector3(side * (1.56 - inwardBow), THREE.MathUtils.lerp(-0.82, -0.18, v), z);
    },
    side < 0,
  );
}

function makeWorkshopPanoramicFrontGlassGeometry(quality: ExpeditionShipQuality) {
  // One continuous bowed surface closes the fabrication room's forward
  // boundary. Keep the grid deliberately sparse: transparency and the shared
  // canopy/cheek silhouette carry the form, while the saved triangles protect
  // the High-tier 72k ceiling.
  return makeSurfaceGridGeometry(
    quality === 'high' ? 8 : 6,
    2,
    (u, v) => {
      const x = THREE.MathUtils.lerp(-1.5, 1.5, u);
      const normalizedX = x / 1.5;
      const z = 0.92 + 0.08 * Math.max(0, 1 - normalizedX * normalizedX);
      const lowerY = -0.79;
      // Overlap the glazing into the canopy by 0.035 units. A transparent
      // surface ending below the liner reads as an open ventilation slot.
      const upperY = workshopCanopyY(x, z) + 0.035;
      return new THREE.Vector3(x, THREE.MathUtils.lerp(lowerY, upperY, v), z);
    },
    true,
  );
}

function makeWorkshopPanoramicHeaderGeometry(quality: ExpeditionShipQuality) {
  // A real pressure member now carries the glass into the bowed canopy. The
  // triangular tube is deliberately low-sided: its continuous curved
  // silhouette reads as one engineered header while staying inside the hard
  // complete-ship triangle ceiling.
  const points = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((x) => {
    const normalizedX = x / 1.5;
    const z = 0.92 + 0.08 * Math.max(0, 1 - normalizedX * normalizedX);
    return new THREE.Vector3(x, workshopCanopyY(x, z) + 0.012, z + 0.006);
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    quality === 'high' ? 6 : 5,
    0.042,
    3,
    false,
  );
}

function makeWorkshopPanoramicFrameGeometry() {
  // A single line object describes only the sparse vertical glass seams. The
  // upper pressure header and lower sill are real solid geometry.
  const points: number[] = [];
  const appendSegment = (a: THREE.Vector3, b: THREE.Vector3) => {
    points.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };
  const pointAt = (x: number, v: number) => {
    const normalizedX = x / 1.5;
    const z = 0.922 + 0.082 * Math.max(0, 1 - normalizedX * normalizedX);
    const y = THREE.MathUtils.lerp(-0.785, workshopCanopyY(x, z) + 0.018, v);
    return new THREE.Vector3(x, y, z + 0.006);
  };

  for (const x of [-0.9, -0.3, 0.3, 0.9]) appendSegment(pointAt(x, 0.02), pointAt(x, 0.98));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function makeWorkshopPressureArchGeometry(z: number, quality: ExpeditionShipQuality) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.53, -0.52, z),
    new THREE.Vector3(-1.12, -0.27, z),
    new THREE.Vector3(0, -0.13, z),
    new THREE.Vector3(1.12, -0.27, z),
    new THREE.Vector3(1.53, -0.52, z),
  ], false, 'centripetal');
  return new THREE.TubeGeometry(curve, quality === 'high' ? 8 : 6, 0.022, 3, false);
}

function makeWorkshopCanopyEdgeGeometry(side: -1 | 1, quality: ExpeditionShipQuality) {
  const curve = new THREE.CatmullRomCurve3(
    [-1.02, -0.54, -0.05, 0.44, 0.92].map((z) =>
      new THREE.Vector3(side * 1.54, workshopCanopyY(side * 1.54, z) - 0.018, z),
    ),
    false,
    'centripetal',
  );
  return new THREE.TubeGeometry(curve, quality === 'high' ? 10 : 8, 0.026, 3, false);
}

function makeHavenSemiCircularTerraceGeometry(side: -1 | 1, bevelSegments: number) {
  // A large D-shaped garden balcony: straight where it docks to the hull and
  // broad/rounded on the outside. The port copy is mirrored from the same
  // mechanical cassette so both can roll into matching shell bays.
  const shape = new THREE.Shape();
  shape.moveTo(-0.74, -0.82);
  shape.lineTo(-0.06, -0.82);
  shape.bezierCurveTo(0.76, -0.82, 1.14, -0.46, 1.14, 0);
  shape.bezierCurveTo(1.14, 0.46, 0.76, 0.82, -0.06, 0.82);
  shape.lineTo(-0.74, 0.82);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.045,
    bevelThickness: 0.035,
    curveSegments: bevelSegments + 5,
    steps: 1,
  });
  geometry.translate(0, 0, -0.07);
  geometry.rotateX(Math.PI * 0.5);
  if (side < 0) geometry.rotateY(Math.PI);
  geometry.computeVertexNormals();
  return geometry;
}

function makeCurvedAtriumBalconyGeometry(depth: number, bevelSegments: number) {
  // Haven must remain visually open toward the panoramic front glazing. Use a
  // U-shaped gallery (rear bridge plus two side arms), never a full balcony
  // ring that cages the tree behind a circular office facade.
  const rear = makeRoundedExtrudeGeometry(3.7, 0.46, depth, 0.16, bevelSegments);
  rear.rotateX(Math.PI * 0.5);
  rear.translate(0, 0, -0.76);
  const left = makeRoundedExtrudeGeometry(0.48, 1.62, depth, 0.15, bevelSegments);
  left.rotateX(Math.PI * 0.5);
  left.translate(-1.61, 0, 0.03);
  const right = left.clone();
  right.translate(3.22, 0, 0);
  const merged = mergeGeometries([rear, left, right], false);
  rear.dispose();
  left.dispose();
  right.dispose();
  if (!merged) throw new Error('Unable to merge open atrium gallery geometry');
  merged.computeVertexNormals();
  return merged;
}

function makeCurvedAtriumRailGeometry(quality: ExpeditionShipQuality) {
  const railThickness = quality === 'high' ? 0.018 : 0.022;
  const geometries: THREE.BufferGeometry[] = [];
  const samples = quality === 'high' ? 30 : 20;
  const pathPoints = (y: number) => [
    new THREE.Vector3(-1.36, y, 0.66),
    new THREE.Vector3(-1.38, y, 0.14),
    new THREE.Vector3(-1.34, y, -0.62),
    new THREE.Vector3(-0.72, y, -0.78),
    new THREE.Vector3(0, y, -0.8),
    new THREE.Vector3(0.72, y, -0.78),
    new THREE.Vector3(1.34, y, -0.62),
    new THREE.Vector3(1.38, y, 0.14),
    new THREE.Vector3(1.36, y, 0.66),
  ];
  // Compact six-storey galleries need a lower balustrade rhythm than the
  // earlier three oversized office levels. The rail still reads clearly from
  // the atrium, but leaves visible headroom below the next occupied floor.
  for (const y of [0.1, 0.21]) {
    const curve = new THREE.CatmullRomCurve3(pathPoints(y), false, 'centripetal');
    geometries.push(new THREE.TubeGeometry(curve, samples, railThickness, quality === 'high' ? 5 : 4, false));
  }
  const postCurve = new THREE.CatmullRomCurve3(pathPoints(0), false, 'centripetal');
  for (let index = 0; index < 14; index += 1) {
    const point = postCurve.getPoint(index / 13);
    const post = new THREE.CylinderGeometry(railThickness, railThickness, 0.22, quality === 'high' ? 6 : 4);
    post.translate(point.x, 0.11, point.z);
    geometries.push(post);
  }
  const merged = mergeGeometries(geometries, false);
  geometries.forEach(geometry => geometry.dispose());
  if (!merged) throw new Error('Unable to merge curved atrium rail geometry');
  merged.computeVertexNormals();
  return merged;
}

function makeRoomPortalFrameGeometry(width: number, height: number, depth: number) {
  const sideWidth = 0.055;
  const headerHeight = 0.05;
  const geometries = [
    new THREE.BoxGeometry(sideWidth, height, depth).translate(-width * 0.5 + sideWidth * 0.5, 0, 0),
    new THREE.BoxGeometry(sideWidth, height, depth).translate(width * 0.5 - sideWidth * 0.5, 0, 0),
    new THREE.BoxGeometry(width, headerHeight, depth).translate(0, height * 0.5 - headerHeight * 0.5, 0),
    new THREE.BoxGeometry(width, headerHeight, depth).translate(0, -height * 0.5 + headerHeight * 0.5, 0),
  ];
  const merged = mergeGeometries(geometries, false);
  geometries.forEach(geometry => geometry.dispose());
  if (!merged) throw new Error('Unable to merge atrium room portal geometry');
  merged.computeVertexNormals();
  return merged;
}

function makeInhabitedAmenityFrontageGeometry() {
  const parts = [
    // Each instance is a tiny but complete inhabited bay rather than a flat
    // glowing rectangle: panoramic window, ceiling/sill, low sofa, dining or
    // work table, paired seats and a planted corner. At atrium scale these
    // silhouettes are what make the perimeter read as a neighbourhood.
    makeRoundedExtrudeGeometry(0.34, 0.22, 0.045, 0.055, 1),
    new THREE.BoxGeometry(0.36, 0.014, 0.08).translate(0, 0.132, -0.018),
    new THREE.BoxGeometry(0.36, 0.014, 0.08).translate(0, -0.132, -0.018),
    new THREE.BoxGeometry(0.028, 0.27, 0.075).translate(-0.184, 0, -0.02),
    new THREE.BoxGeometry(0.028, 0.27, 0.075).translate(0.184, 0, -0.02),
    new THREE.BoxGeometry(0.24, 0.025, 0.13).translate(0, -0.065, -0.085),
    new THREE.BoxGeometry(0.075, 0.065, 0.07).translate(-0.095, -0.11, -0.08),
    new THREE.BoxGeometry(0.075, 0.065, 0.07).translate(0.095, -0.11, -0.08),
    makeRoundedExtrudeGeometry(0.13, 0.055, 0.09, 0.018, 1).translate(-0.105, -0.085, -0.145),
    new THREE.CylinderGeometry(0.012, 0.015, 0.12, 5).translate(0.12, -0.05, -0.12),
    new THREE.IcosahedronGeometry(0.055, 0).translate(0.12, 0.025, -0.12),
  ];
  const compatible = parts.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry);
  const merged = mergeGeometries(compatible, false);
  compatible.forEach((geometry, index) => {
    if (geometry !== parts[index]) geometry.dispose();
    parts[index].dispose();
  });
  if (!merged) throw new Error('Unable to merge inhabited amenity frontage geometry');
  merged.computeVertexNormals();
  return merged;
}

function makeShoulderSuiteDeckGeometry(thickness: number) {
  // A shoulder room follows the controller fairing: narrower at its protected
  // inboard/service edge and softly bowed toward the panoramic outer window.
  // This removes the office-box footprint while preserving useful floor area.
  const plan = new THREE.Shape();
  plan.moveTo(-0.42, 0.7);
  plan.bezierCurveTo(-0.24, 0.82, 0.24, 0.82, 0.42, 0.7);
  plan.lineTo(0.6, 0.18);
  plan.lineTo(0.52, -0.68);
  plan.lineTo(-0.52, -0.68);
  plan.lineTo(-0.6, 0.18);
  plan.closePath();
  const geometry = new THREE.ExtrudeGeometry(plan, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 5,
    steps: 1,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.rotateX(Math.PI * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeCommandSuiteAssemblyGeometries(quality: ExpeditionShipQuality) {
  type SuiteMaterialKey = 'shell' | 'glass' | 'frame' | 'power' | 'warm';
  const buckets: Record<SuiteMaterialKey, THREE.BufferGeometry[]> = {
    shell: [], glass: [], frame: [], power: [], warm: [],
  };
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const addPart = (
    key: SuiteMaterialKey,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    quaternion.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    buckets[key].push(geometry);
  };

  // Three occupied levels, with a double-height principal deck between the
  // middle and upper slabs. The slabs and glass bow with the controller
  // shoulder instead of describing a rectangular building inside the garden.
  for (const [index, floorY] of [-0.52, -0.12, 0.54, 0.8].entries()) {
    addPart('frame', makeShoulderSuiteDeckGeometry(0.032), [0, floorY, index === 3 ? -0.015 : 0.03]);
  }
  addPart('frame', new THREE.BoxGeometry(0.035, 1.3, 1.12), [-0.565, 0.14, -0.04], [0, 0.08, 0]);
  addPart('frame', new THREE.BoxGeometry(0.035, 1.3, 1.12), [0.565, 0.14, -0.04], [0, -0.08, 0]);
  addPart('shell', makeRoundedExtrudeGeometry(0.34, 1.28, 0.055, 0.12, quality === 'high' ? 3 : 2), [0, 0.14, -0.67]);
  addPart('shell', makeRoundedExtrudeGeometry(0.92, 0.12, 0.36, 0.055, 2), [0, 0.82, -0.47]);
  addPart(
    'glass',
    makeBulgedPressurePanelGeometry(1.08, 1.18, 0.15, quality === 'high' ? 8 : 7, quality === 'high' ? 6 : 5),
    [0, 0.14, 0.7],
  );
  addPart('glass', new THREE.PlaneGeometry(1.14, 1.18, 1, 1), [-0.57, 0.14, -0.01], [0, -Math.PI * 0.5, 0]);
  addPart('glass', new THREE.PlaneGeometry(1.14, 1.18, 1, 1), [0.57, 0.14, -0.01], [0, Math.PI * 0.5, 0]);
  addPart(
    'frame',
    makeRoundedExtrudeGeometry(0.48, 0.065, 0.14, 0.028, quality === 'high' ? 2 : 1),
    [0, 0.01, 0.62],
  );
  addPart('frame', makeRoundedExtrudeGeometry(0.22, 0.04, 0.2, 0.025, 1), [-0.4, -0.015, 0.52], [0, -0.18, 0]);
  addPart('frame', makeRoundedExtrudeGeometry(0.22, 0.04, 0.2, 0.025, 1), [0.4, -0.015, 0.52], [0, 0.18, 0]);
  // Keep the panoramic aperture unobstructed. Status lighting belongs in the
  // sill; the role-specific furniture owns the actual helm/admin instruments.
  addPart('power', new THREE.BoxGeometry(0.36, 0.016, 0.012), [0, 0.035, 0.686]);
  addPart('power', new THREE.BoxGeometry(0.11, 0.012, 0.012), [-0.4, 0.02, 0.61], [0, -0.18, 0]);
  addPart('power', new THREE.BoxGeometry(0.11, 0.012, 0.012), [0.4, 0.02, 0.61], [0, 0.18, 0]);
  addPart('warm', new THREE.BoxGeometry(0.94, 0.022, 0.035), [0, 0.49, 0.2]);
  addPart('warm', new THREE.BoxGeometry(0.28, 0.08, 0.2), [0, -0.24, -0.08]);

  const mergeBucket = (key: SuiteMaterialKey) => {
    const sources = buckets[key];
    const compatibleSources = sources.map((geometry) => geometry.index ? geometry.toNonIndexed() : geometry);
    const merged = mergeGeometries(compatibleSources, false);
    compatibleSources.forEach((geometry, index) => {
      if (geometry !== sources[index]) geometry.dispose();
      sources[index].dispose();
    });
    if (!merged) throw new Error(`Unable to merge ${key} command-suite geometry`);
    merged.computeVertexNormals();
    return merged;
  };
  return {
    shell: mergeBucket('shell'),
    glass: mergeBucket('glass'),
    frame: mergeBucket('frame'),
    power: mergeBucket('power'),
    warm: mergeBucket('warm'),
  };
}

function makeCommandSuiteFurnitureGeometries(role: 'steering' | 'administration') {
  type FurnitureMaterialKey = 'frame' | 'power' | 'warm';
  const buckets: Record<FurnitureMaterialKey, THREE.BufferGeometry[]> = {
    frame: [], power: [], warm: [],
  };
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const addPart = (
    key: FurnitureMaterialKey,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    quaternion.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    buckets[key].push(geometry);
  };

  // A shallow illuminated arch replaces the office-like rectangular ceiling
  // grid and frames the panoramic glass with one continuous yacht cove.
  addPart('warm', new THREE.TorusGeometry(0.46, 0.015, 4, 12, Math.PI), [0, 0.2, 0.55]);

  if (role === 'steering') {
    // A low, yacht-like helm preserves the panoramic sightline while the
    // paired side stations and floating cyan panes make this a command room.
    addPart('frame', makeChamferedPanelGeometry(0.58, 0.22, 0.085, 0.065), [0, -0.1, 0.48], [-Math.PI * 0.5, 0, 0]);
    addPart('frame', new THREE.BoxGeometry(0.2, 0.11, 0.3), [-0.39, -0.08, 0.4], [-0.08, -0.18, 0]);
    addPart('frame', new THREE.BoxGeometry(0.2, 0.11, 0.3), [0.39, -0.08, 0.4], [-0.08, 0.18, 0]);
    addPart('frame', new THREE.BoxGeometry(0.18, 0.36, 0.18), [-0.2, -0.25, -0.04], [0, -0.12, 0]);
    addPart('frame', new THREE.BoxGeometry(0.18, 0.36, 0.18), [0.2, -0.25, -0.04], [0, 0.12, 0]);
    addPart('power', new THREE.PlaneGeometry(0.28, 0.12), [0, -0.05, 0.49], [-Math.PI * 0.5, 0, 0]);
    addPart('power', new THREE.PlaneGeometry(0.12, 0.065), [-0.38, 0, 0.48], [-1.18, -0.22, 0]);
    addPart('power', new THREE.PlaneGeometry(0.12, 0.065), [0.38, 0, 0.48], [-1.18, 0.22, 0]);
    addPart('warm', new THREE.BoxGeometry(0.5, 0.018, 0.025), [0, -0.045, 0.59]);
    addPart('warm', new THREE.BoxGeometry(0.15, 0.018, 0.025), [-0.39, -0.015, 0.52], [0, -0.18, 0]);
    addPart('warm', new THREE.BoxGeometry(0.15, 0.018, 0.025), [0.39, -0.015, 0.52], [0, 0.18, 0]);
    addPart('warm', new THREE.BoxGeometry(0.34, 0.15, 0.18), [-0.38, -0.31, -0.28]);
    addPart('warm', new THREE.BoxGeometry(0.34, 0.15, 0.18), [0.38, -0.31, -0.28]);
  } else {
    // Administration reads as a compact strategy salon: central table,
    // opposing seats, illuminated archive wall and a restrained planning pane.
    addPart('frame', makeChamferedPanelGeometry(0.58, 0.38, 0.075, 0.07), [0, -0.12, 0.18], [-Math.PI * 0.5, 0, 0]);
    addPart('frame', new THREE.BoxGeometry(0.12, 0.24, 0.12), [0, -0.28, 0.18]);
    for (const x of [-0.3, 0.3]) {
      addPart('frame', new THREE.BoxGeometry(0.18, 0.32, 0.16), [x, -0.26, -0.12]);
      addPart('frame', new THREE.BoxGeometry(0.18, 0.32, 0.16), [x, -0.26, 0.48], [0, Math.PI, 0]);
    }
    addPart('frame', new THREE.BoxGeometry(0.07, 0.48, 0.72), [-0.51, 0.1, -0.04]);
    addPart('warm', new THREE.BoxGeometry(0.025, 0.035, 0.62), [-0.468, 0.22, -0.04]);
    addPart('warm', new THREE.BoxGeometry(0.025, 0.035, 0.62), [-0.468, 0.04, -0.04]);
    addPart('power', new THREE.PlaneGeometry(0.34, 0.18), [0, -0.073, 0.19], [-Math.PI * 0.5, 0, 0]);
    addPart('power', new THREE.PlaneGeometry(0.1, 0.07), [-0.468, 0.16, -0.22], [0, Math.PI * 0.5, 0]);
    addPart('power', new THREE.PlaneGeometry(0.1, 0.07), [-0.468, 0.16, 0.16], [0, Math.PI * 0.5, 0]);
    addPart('warm', new THREE.BoxGeometry(0.48, 0.018, 0.025), [0, -0.07, 0.39]);
  }

  const mergeBucket = (key: FurnitureMaterialKey) => {
    const sources = buckets[key];
    const compatibleSources = sources.map((geometry) => geometry.index ? geometry.toNonIndexed() : geometry);
    const merged = mergeGeometries(compatibleSources, false);
    compatibleSources.forEach((geometry, index) => {
      if (geometry !== sources[index]) geometry.dispose();
      sources[index].dispose();
    });
    if (!merged) throw new Error(`Unable to merge ${key} command-suite furniture geometry`);
    merged.computeVertexNormals();
    return merged;
  };
  return {
    frame: mergeBucket('frame'),
    power: mergeBucket('power'),
    warm: mergeBucket('warm'),
  };
}

function makeBulgedPressurePanelGeometry(
  width: number,
  height: number,
  bulge: number,
  widthSegments: number,
  heightSegments: number,
) {
  const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  for (let index = 0; index < positions.count; index += 1) {
    const normalizedX = positions.getX(index) / halfWidth;
    const normalizedY = positions.getY(index) / halfHeight;
    const edgeFalloff = Math.max(0, (1 - normalizedX * normalizedX) * (1 - normalizedY * normalizedY));
    positions.setZ(index, bulge * edgeFalloff);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function makeHavenWraparoundGlazingGeometry() {
  // One continuous material system wraps the sanctuary sides, roof and rear.
  // Sparse shell arches carry the load; decorative mullion grids are excluded.
  const leftSide = new THREE.PlaneGeometry(2.48, 2.28, 1, 1);
  leftSide.rotateY(Math.PI * 0.5);
  leftSide.translate(-2.08, 0.34, -0.2);
  const rightSide = new THREE.PlaneGeometry(2.48, 2.28, 1, 1);
  rightSide.rotateY(-Math.PI * 0.5);
  rightSide.translate(2.08, 0.34, -0.2);
  const rear = new THREE.PlaneGeometry(3.82, 2.24, 1, 1);
  rear.rotateY(Math.PI);
  rear.translate(0, 0.36, -1.44);
  const roof = new THREE.PlaneGeometry(3.78, 2.48, 1, 1);
  roof.rotateX(Math.PI * 0.5);
  roof.translate(0, 1.72, -0.2);
  const merged = mergeGeometries([leftSide, rightSide, rear, roof], false);
  leftSide.dispose();
  rightSide.dispose();
  rear.dispose();
  roof.dispose();
  if (!merged) throw new Error('Unable to merge Haven wraparound glazing');
  merged.computeVertexNormals();
  return merged;
}

function makeTaperedExtrudeGeometry(
  topWidth: number,
  bottomWidth: number,
  height: number,
  depth: number,
  bevelSegments: number,
) {
  const halfHeight = height * 0.5;
  const topHalf = topWidth * 0.5;
  const bottomHalf = bottomWidth * 0.5;
  const corner = Math.min(0.14, topHalf * 0.3, bottomHalf * 0.3, halfHeight * 0.2);
  const shape = new THREE.Shape();
  shape.moveTo(-bottomHalf + corner, -halfHeight);
  shape.lineTo(bottomHalf - corner, -halfHeight);
  shape.quadraticCurveTo(bottomHalf, -halfHeight, bottomHalf + corner * 0.24, -halfHeight + corner);
  shape.lineTo(topHalf - corner * 0.24, halfHeight - corner);
  shape.quadraticCurveTo(topHalf, halfHeight, topHalf - corner, halfHeight);
  shape.lineTo(-topHalf + corner, halfHeight);
  shape.quadraticCurveTo(-topHalf, halfHeight, -topHalf + corner * 0.24, halfHeight - corner);
  shape.lineTo(-bottomHalf - corner * 0.24, -halfHeight + corner);
  shape.quadraticCurveTo(-bottomHalf, -halfHeight, -bottomHalf + corner, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: Math.min(0.09, depth * 0.1),
    bevelThickness: Math.min(0.08, depth * 0.09),
    curveSegments: bevelSegments + 2,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeChamferedPanelGeometry(width: number, height: number, depth: number, chamfer: number) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const corner = Math.min(chamfer, halfWidth * 0.45, halfHeight * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + corner, -halfHeight);
  shape.lineTo(halfWidth - corner, -halfHeight);
  shape.lineTo(halfWidth, -halfHeight + corner);
  shape.lineTo(halfWidth, halfHeight - corner);
  shape.lineTo(halfWidth - corner, halfHeight);
  shape.lineTo(-halfWidth + corner, halfHeight);
  shape.lineTo(-halfWidth, halfHeight - corner);
  shape.lineTo(-halfWidth, -halfHeight + corner);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTaperedArmorFrameGeometry(
  topWidth: number,
  bottomWidth: number,
  height: number,
  depth: number,
  openingWidth: number,
  openingHeight: number,
  bevelSegments: number,
) {
  const halfHeight = height * 0.5;
  const outer = new THREE.Shape();
  outer.moveTo(-bottomWidth * 0.5, -halfHeight);
  outer.lineTo(bottomWidth * 0.5, -halfHeight);
  outer.lineTo(topWidth * 0.5, halfHeight);
  outer.lineTo(-topWidth * 0.5, halfHeight);
  outer.closePath();

  const opening = new THREE.Path();
  const openingHalfWidth = openingWidth * 0.5;
  const openingHalfHeight = openingHeight * 0.5;
  const radius = Math.min(0.11, openingHalfWidth * 0.45, openingHalfHeight * 0.2);
  opening.moveTo(-openingHalfWidth + radius, -openingHalfHeight);
  opening.lineTo(openingHalfWidth - radius, -openingHalfHeight);
  opening.quadraticCurveTo(openingHalfWidth, -openingHalfHeight, openingHalfWidth, -openingHalfHeight + radius);
  opening.lineTo(openingHalfWidth, openingHalfHeight - radius);
  opening.quadraticCurveTo(openingHalfWidth, openingHalfHeight, openingHalfWidth - radius, openingHalfHeight);
  opening.lineTo(-openingHalfWidth + radius, openingHalfHeight);
  opening.quadraticCurveTo(-openingHalfWidth, openingHalfHeight, -openingHalfWidth, openingHalfHeight - radius);
  opening.lineTo(-openingHalfWidth, -openingHalfHeight + radius);
  opening.quadraticCurveTo(-openingHalfWidth, -openingHalfHeight, -openingHalfWidth + radius, -openingHalfHeight);
  outer.holes.push(opening);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: Math.min(0.055, depth * 0.16),
    bevelThickness: Math.min(0.045, depth * 0.14),
    curveSegments: bevelSegments + 3,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeControllerBridgeGeometry(depth: number, bevelSegments: number) {
  const outer = new THREE.Shape();
  outer.moveTo(-2.34, -0.9);
  outer.bezierCurveTo(-2.7, -0.5, -2.7, 0.58, -2.22, 1.12);
  outer.bezierCurveTo(-1.78, 1.54, -1.18, 1.68, -0.54, 1.64);
  outer.lineTo(0.54, 1.64);
  outer.bezierCurveTo(1.18, 1.68, 1.78, 1.54, 2.22, 1.12);
  outer.bezierCurveTo(2.7, 0.58, 2.7, -0.5, 2.34, -0.9);
  outer.bezierCurveTo(1.9, -1.14, 1.42, -1.18, 0.94, -1.1);
  outer.bezierCurveTo(0.42, -1.02, -0.42, -1.02, -0.94, -1.1);
  outer.bezierCurveTo(-1.42, -1.18, -1.9, -1.14, -2.34, -0.9);

  const aperture = new THREE.Path();
  aperture.moveTo(-2.04, -0.74);
  aperture.bezierCurveTo(-2.25, -0.3, -2.2, 0.58, -1.72, 1.08);
  aperture.bezierCurveTo(-1.32, 1.42, -0.58, 1.47, 0, 1.44);
  aperture.bezierCurveTo(0.58, 1.47, 1.32, 1.42, 1.72, 1.08);
  aperture.bezierCurveTo(2.2, 0.58, 2.25, -0.3, 2.04, -0.74);
  aperture.bezierCurveTo(1.58, -0.94, 0.76, -0.9, 0.32, -0.84);
  aperture.bezierCurveTo(-0.32, -0.76, -1.58, -0.94, -2.04, -0.74);
  outer.holes.push(aperture);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    curveSegments: bevelSegments + 4,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeGameControllerSpeedCoreGeometry(depth: number, bevelSegments: number) {
  // The closed travel body follows the same smooth dark centre mass as the
  // controller image used by the game. It deliberately masks the blockout's
  // rectangular pressure frame once the outer shell has sealed.
  const core = new THREE.Shape();
  core.moveTo(-2.06, 0.72);
  core.bezierCurveTo(-1.68, 1.24, -0.94, 1.43, -0.34, 1.36);
  core.bezierCurveTo(-0.12, 1.33, 0.12, 1.33, 0.34, 1.36);
  core.bezierCurveTo(0.94, 1.43, 1.68, 1.24, 2.06, 0.72);
  core.bezierCurveTo(2.18, 0.43, 2.08, 0.03, 1.76, -0.2);
  core.bezierCurveTo(1.48, -0.54, 1.2, -0.69, 0.96, -0.58);
  core.bezierCurveTo(0.8, -0.39, 0.62, -0.19, 0.4, -0.12);
  core.lineTo(-0.4, -0.12);
  core.bezierCurveTo(-0.62, -0.19, -0.8, -0.39, -0.96, -0.58);
  core.bezierCurveTo(-1.2, -0.69, -1.48, -0.54, -1.76, -0.2);
  core.bezierCurveTo(-2.08, 0.03, -2.18, 0.43, -2.06, 0.72);
  const geometry = new THREE.ExtrudeGeometry(core, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: Math.min(0.12, depth * 0.12),
    bevelThickness: Math.min(0.1, depth * 0.1),
    curveSegments: bevelSegments + 6,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makePressureHabitatFrameGeometry(depth: number, bevelSegments: number) {
  const makeRoundedPath = (width: number, height: number, radius: number) => {
    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;
    const path = new THREE.Path();
    path.moveTo(-halfWidth + radius, -halfHeight);
    path.lineTo(halfWidth - radius, -halfHeight);
    path.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
    path.lineTo(halfWidth, halfHeight - radius);
    path.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
    path.lineTo(-halfWidth + radius, halfHeight);
    path.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
    path.lineTo(-halfWidth, -halfHeight + radius);
    path.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
    return path;
  };

  const outerPath = makeRoundedPath(4.92, 2.94, 0.58);
  const outer = new THREE.Shape(outerPath.getPoints(bevelSegments + 12));
  outer.holes.push(makeRoundedPath(4.5, 2.58, 0.48));
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.075,
    bevelThickness: 0.065,
    curveSegments: bevelSegments + 5,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  // The pressure frame begins at the sanctuary threshold and carries its load
  // rearward into the controller shoulders. Flare the rear half outward so the
  // two dark side rails never read as giant walls converging on the Great Tree.
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const rearward = THREE.MathUtils.clamp(-z / Math.max(0.001, depth) + 0.5, 0, 1);
    const sideWeight = THREE.MathUtils.smoothstep(Math.abs(x), 1.45, 2.55);
    positions.setX(index, x + Math.sign(x) * rearward * sideWeight * 0.44);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function makeControllerWingGeometry(side: -1 | 1, depth: number, bevelSegments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.62, 1.16);
  shape.bezierCurveTo(-0.12, 1.42, 0.48, 1.3, 0.76, 0.88);
  shape.bezierCurveTo(1.04, 0.44, 1.01, -0.38, 0.88, -1.04);
  shape.bezierCurveTo(0.74, -1.72, 0.42, -2.18, 0.05, -2.2);
  shape.bezierCurveTo(-0.34, -2.2, -0.5, -1.72, -0.5, -1.08);
  shape.bezierCurveTo(-0.5, -0.46, -0.78, 0.18, -0.75, 0.72);
  shape.bezierCurveTo(-0.74, 0.94, -0.69, 1.08, -0.62, 1.16);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.09,
    bevelThickness: 0.07,
    curveSegments: bevelSegments + 4,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  if (side < 0) geometry.rotateY(Math.PI);
  geometry.computeVertexNormals();
  return geometry;
}

function makeControllerShellGeometry(side: -1 | 1, depth: number, bevelSegments: number) {
  // Walker-mode shoulder rail. It terminates at the hip instead of tracing a
  // full controller grip; the deployed leg continues the same load path.
  const shell = new THREE.Shape();
  shell.moveTo(-0.9, 1.02);
  shell.bezierCurveTo(-0.24, 1.55, 0.54, 1.48, 0.94, 0.96);
  shell.bezierCurveTo(1.25, 0.54, 1.28, -0.18, 1.05, -0.82);
  shell.bezierCurveTo(0.91, -1.19, 0.62, -1.4, 0.27, -1.32);
  shell.lineTo(0.02, -0.72);
  shell.bezierCurveTo(0.4, -0.62, 0.58, -0.18, 0.5, 0.3);
  shell.bezierCurveTo(0.43, 0.68, 0.08, 0.88, -0.34, 0.76);
  shell.lineTo(-0.62, 0.62);
  shell.bezierCurveTo(-0.72, 0.8, -0.82, 0.94, -0.9, 1.02);

  const geometry = new THREE.ExtrudeGeometry(shell, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.085,
    bevelThickness: 0.065,
    curveSegments: bevelSegments + 4,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  if (side < 0) geometry.rotateY(Math.PI);
  geometry.computeVertexNormals();
  return geometry;
}

function makeShoulderCrownGeometry(side: -1 | 1, depth: number, bevelSegments: number) {
  // A low crescent crown overlaps the tall outer shell so the white structure
  // reads as one load-bearing arch instead of a separate shoulder box.
  const crown = new THREE.Shape();
  crown.moveTo(-0.78, -0.18);
  crown.bezierCurveTo(-0.7, 0.24, -0.42, 0.48, 0.02, 0.54);
  crown.bezierCurveTo(0.42, 0.58, 0.72, 0.34, 0.8, 0.02);
  crown.bezierCurveTo(0.73, -0.22, 0.5, -0.32, 0.2, -0.27);
  crown.bezierCurveTo(-0.18, -0.2, -0.5, -0.34, -0.78, -0.18);
  const geometry = new THREE.ExtrudeGeometry(crown, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    curveSegments: bevelSegments + 5,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  if (side < 0) geometry.rotateY(Math.PI);
  geometry.computeVertexNormals();
  return geometry;
}

function makeAtriumCrownGeometry(depth: number, bevelSegments: number, frameOnly: boolean) {
  // The goal images show a shallow glazed barrel crown tying both controller
  // shoulders together. Keeping this as a real extruded arch (rather than a
  // flat roof box) preserves the curved silhouette from front and orbit views.
  const crown = new THREE.Shape();
  crown.moveTo(-2.12, -0.22);
  crown.bezierCurveTo(-1.76, 0.32, -1.08, 0.64, 0, 0.68);
  crown.bezierCurveTo(1.08, 0.64, 1.76, 0.32, 2.12, -0.22);
  crown.lineTo(1.82, -0.34);
  crown.bezierCurveTo(1.42, 0.08, 0.88, 0.3, 0, 0.33);
  crown.bezierCurveTo(-0.88, 0.3, -1.42, 0.08, -1.82, -0.34);
  crown.closePath();

  if (frameOnly) {
    const opening = new THREE.Path();
    opening.moveTo(-1.7, -0.18);
    opening.bezierCurveTo(-1.35, 0.16, -0.8, 0.39, 0, 0.42);
    opening.bezierCurveTo(0.8, 0.39, 1.35, 0.16, 1.7, -0.18);
    opening.lineTo(1.48, -0.24);
    opening.bezierCurveTo(1.14, 0.01, 0.68, 0.18, 0, 0.2);
    opening.bezierCurveTo(-0.68, 0.18, -1.14, 0.01, -1.48, -0.24);
    opening.closePath();
    crown.holes.push(opening);
  }

  const geometry = new THREE.ExtrudeGeometry(crown, {
    depth,
    bevelEnabled: true,
    bevelSegments,
    bevelSize: Math.min(0.075, depth * 0.06),
    bevelThickness: Math.min(0.06, depth * 0.05),
    curveSegments: bevelSegments + 6,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeMaterials(): ShipMaterials {
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: '#ece9e2', roughness: 0.21, metalness: 0.16,
      clearcoat: 0.9, clearcoatRoughness: 0.1,
      sheen: 0.12, sheenColor: '#fff7ec', sheenRoughness: 0.3,
      envMapIntensity: 1.28,
    }),
    shellInset: new THREE.MeshPhysicalMaterial({
      color: '#66727c', roughness: 0.4, metalness: 0.68,
      clearcoat: 0.18, clearcoatRoughness: 0.26, envMapIntensity: 1.12,
    }),
    frame: new THREE.MeshPhysicalMaterial({
      color: '#0a1118', roughness: 0.35, metalness: 0.9,
      clearcoat: 0.16, clearcoatRoughness: 0.22, envMapIntensity: 1.38,
    }),
    frameLight: new THREE.MeshPhysicalMaterial({
      color: '#263945', roughness: 0.38, metalness: 0.78,
      emissive: '#07131a', emissiveIntensity: 0.34,
      clearcoat: 0.14, clearcoatRoughness: 0.24, envMapIntensity: 1.24,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#16303a', roughness: 0.045, metalness: 0.02,
      transmission: 0.58, transparent: true, opacity: 0.42,
      ior: 1.46, thickness: 0.24,
      side: THREE.DoubleSide, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 1.22,
    }),
    shield: new THREE.MeshPhysicalMaterial({
      color: '#63c6d5', roughness: 0.08, metalness: 0,
      transmission: 0.7, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.03,
    }),
    warmWindow: new THREE.MeshStandardMaterial({
      color: '#3b2215', roughness: 0.18, metalness: 0.03,
      emissive: '#ff9148', emissiveIntensity: 1.58,
    }),
    power: new THREE.MeshStandardMaterial({
      color: '#12577d', roughness: 0.16, metalness: 0.22,
      emissive: '#29b8ff', emissiveIntensity: 1.72,
      side: THREE.DoubleSide,
    }),
    bark: new THREE.MeshStandardMaterial({color: '#69462f', roughness: 0.9, metalness: 0}),
    foliage: new THREE.MeshStandardMaterial({
      color: '#3f7643', roughness: 0.8, metalness: 0,
      emissive: '#0d2f18', emissiveIntensity: 0.16,
    }),
    foliageLight: new THREE.MeshStandardMaterial({
      color: '#88ad52', roughness: 0.76, metalness: 0,
      emissive: '#29491b', emissiveIntensity: 0.18,
    }),
    habitatFloor: new THREE.MeshPhysicalMaterial({
      color: '#49372c', roughness: 0.68, metalness: 0.02,
      emissive: '#160d08', emissiveIntensity: 0.1,
      clearcoat: 0.18, clearcoatRoughness: 0.42, envMapIntensity: 0.68,
    }),
    habitatFabric: new THREE.MeshPhysicalMaterial({
      color: '#345f43', roughness: 0.82, metalness: 0,
      emissive: '#0a2515', emissiveIntensity: 0.12,
      sheen: 0.72, sheenColor: new THREE.Color('#87b58a'), sheenRoughness: 0.7,
      clearcoat: 0.04, clearcoatRoughness: 0.8,
    }),
    workshopSurface: new THREE.MeshPhysicalMaterial({
      color: '#40545b', roughness: 0.26, metalness: 0.52,
      emissive: '#16282d', emissiveIntensity: 0.54,
      clearcoat: 0.56, clearcoatRoughness: 0.18, envMapIntensity: 1.38,
    }),
    workshopBronze: new THREE.MeshPhysicalMaterial({
      color: '#a06b43', roughness: 0.27, metalness: 0.62,
      emissive: '#211207', emissiveIntensity: 0.08,
      clearcoat: 0.38, clearcoatRoughness: 0.22, envMapIntensity: 1.16,
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: '#36b8c5', roughness: 0.05, metalness: 0,
      transmission: 0.46, transparent: true, opacity: 0.72,
      clearcoat: 1, clearcoatRoughness: 0.03,
      emissive: '#074b59', emissiveIntensity: 0.62,
    }),
    thrust: new THREE.MeshBasicMaterial({color: '#67ddff', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false}),
    hover: new THREE.MeshBasicMaterial({color: '#70e6ff', transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false}),
    ripple: new THREE.MeshBasicMaterial({color: '#8be8ff', transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false}),
  };
}

function addMesh(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = /OUTER_SHELL|UNDERFRAME|CENTRE_|great-tree-trunk|engine-shell|garage-volume|keel-column/.test(name);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

interface GroupedMeshPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

function makeGroupedGeometry(parts: GroupedMeshPart[]) {
  const transformedGeometries = parts.map((part) => {
    // Extrusions are non-indexed while efficient primitive helpers are
    // indexed. Normalise before merging so a lift ring, furniture and floor
    // can remain one batched selectable part.
    const sourceGeometry = part.geometry;
    const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry;
    if (geometry !== sourceGeometry) sourceGeometry.dispose();
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(...(part.position ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rotation ?? [0, 0, 0]))),
      new THREE.Vector3(...(part.scale ?? [1, 1, 1])),
    );
    geometry.applyMatrix4(transform);
    return geometry;
  });
  const geometry = mergeGeometries(transformedGeometries, true);
  if (!geometry) throw new Error('Unable to merge grouped ship geometry');
  transformedGeometries.forEach((sourceGeometry) => sourceGeometry.dispose());
  return geometry;
}

function addGroupedMesh(
  parent: THREE.Object3D,
  name: string,
  parts: GroupedMeshPart[],
) {
  const geometry = makeGroupedGeometry(parts);
  const mesh = new THREE.Mesh(geometry, parts.map((part) => part.material));
  mesh.name = name;
  mesh.userData.componentNames = parts.map((_, index) => `${name}-${index + 1}`);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWindowBand(parent: THREE.Object3D, side: -1 | 1, materials: ShipMaterials, quality: ExpeditionShipQuality) {
  const windowRoot = new THREE.Group();
  windowRoot.name = side < 0 ? 'LEFT_OCCUPIED_DECK_WINDOWS' : 'RIGHT_OCCUPIED_DECK_WINDOWS';
  // Pull the inhabited bands toward the centreline so the dark grip core reads
  // as usable ship volume instead of a blank circular void.
  windowRoot.position.x = side * -0.35;
  windowRoot.position.z = 0.34;
  const facadeMaterial = materials.glass.clone();
  facadeMaterial.color.set('#102b37');
  facadeMaterial.opacity = 0.9;
  addMesh(
    windowRoot,
    'inhabited-deck-facade',
    makeRoundedExtrudeGeometry(1.68, 1.5, 0.14, 0.28, quality === 'high' ? 4 : 2),
    facadeMaterial,
    [side * 0.62, 0.02, 0.61],
  );
  const deckDefinitions = [
    {x: 0.42, y: 0.44, width: 1.18, depth: 1.08, cant: 0.045, columns: quality === 'high' ? 5 : 4},
    {x: 0.64, y: 0.02, width: 0.7, depth: 1.2, cant: -0.075, columns: quality === 'high' ? 3 : 2},
    {x: 0.38, y: -0.43, width: 1.3, depth: 0.92, cant: 0.03, columns: quality === 'high' ? 4 : 3},
  ];
  const geometry = makeRoundedExtrudeGeometry(0.18, 0.075, 0.055, 0.022, 1);
  const windowCount = deckDefinitions.reduce((total, definition) => total + definition.columns, 0);
  const windows = new THREE.InstancedMesh(geometry, materials.warmWindow, windowCount);
  windows.name = 'deck-window-instances';
  windows.castShadow = false;
  windows.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let instance = 0;
  const deckQuaternion = new THREE.Quaternion();
  for (let deck = 0; deck < deckDefinitions.length; deck += 1) {
    const definition = deckDefinitions[deck];
    for (let column = 0; column < definition.columns; column += 1) {
      const columnOffset = (column - (definition.columns - 1) * 0.5) * (deck === 1 ? 0.22 : 0.235);
      const x = side * (definition.x + columnOffset);
      deckQuaternion.setFromEuler(new THREE.Euler(0, 0, side * definition.cant));
      matrix.compose(
        new THREE.Vector3(x, definition.y + 0.13, 0.74 + (column % 2) * 0.018),
        deckQuaternion,
        new THREE.Vector3(deck === 1 ? 0.84 : 1, 1, 1),
      );
      windows.setMatrixAt(instance, matrix);
      instance += 1;
    }
  }
  windows.instanceMatrix.needsUpdate = true;
  windowRoot.add(windows);

  const deckGeometry = makeRoundedExtrudeGeometry(0.88, 0.1, 0.34, 0.045, 1);
  const deckSlabs = new THREE.InstancedMesh(deckGeometry, materials.frameLight, deckDefinitions.length);
  deckSlabs.name = 'occupied-deck-slab-instances';
  for (let deck = 0; deck < deckDefinitions.length; deck += 1) {
    const definition = deckDefinitions[deck];
    deckQuaternion.setFromEuler(new THREE.Euler(0, 0, side * definition.cant));
    matrix.compose(
      new THREE.Vector3(side * definition.x, definition.y, 0.65),
      deckQuaternion,
      new THREE.Vector3(definition.width, 1, definition.depth),
    );
    deckSlabs.setMatrixAt(deck, matrix);
  }
  deckSlabs.instanceMatrix.needsUpdate = true;
  deckSlabs.castShadow = true;
  deckSlabs.receiveShadow = true;
  windowRoot.add(deckSlabs);
  parent.add(windowRoot);
  return windowRoot;
}

function addWingStructuralRibs(
  parent: THREE.Object3D,
  side: -1 | 1,
  materials: ShipMaterials,
  quality: ExpeditionShipQuality,
) {
  // The goal shell is a ceramic armor assembly, not a blank white blob. Keep
  // the seams shallow and batched on the animated shell so they retain their
  // relationship through every controller transformation.
  const ribGeometry = makeRoundedExtrudeGeometry(
    0.055,
    0.72,
    0.065,
    0.022,
    quality === 'high' ? 2 : 1,
  );
  const definitions: Array<{
    position: [number, number, number];
    rotation: number;
    scale: [number, number, number];
  }> = [
    {position: [side * -0.5, 0.68, 0.64], rotation: side * -0.22, scale: [1, 0.92, 1]},
    {position: [side * -0.22, 0.42, 0.655], rotation: side * 0.18, scale: [1, 0.88, 1]},
    {position: [side * 0.08, 0.14, 0.665], rotation: side * -0.15, scale: [1, 0.94, 1]},
    {position: [side * 0.31, -0.2, 0.66], rotation: side * 0.12, scale: [1, 0.88, 1]},
    {position: [side * 0.44, -0.58, 0.64], rotation: side * -0.1, scale: [1, 0.8, 1]},
    {position: [side * 0.34, -0.9, 0.615], rotation: side * 0.08, scale: [1, 0.62, 1]},
    {position: [side * -0.11, 0.86, 0.65], rotation: Math.PI * 0.5, scale: [1, 0.88, 1]},
    {position: [side * 0.22, 0.54, 0.67], rotation: Math.PI * 0.5, scale: [1, 0.82, 1]},
    {position: [side * 0.34, 0.18, 0.68], rotation: Math.PI * 0.5, scale: [1, 0.74, 1]},
    {position: [side * 0.4, -0.46, 0.66], rotation: Math.PI * 0.5, scale: [1, 0.7, 1]},
    // A darker inner-edge stack preserves the observed shoulder-to-roof load
    // path without the former oversized criss-cross bars.
    {position: [side * -0.6, 0.98, 0.645], rotation: side * -0.42, scale: [2.1, 0.92, 1.15]},
    {position: [side * -0.48, 1.28, 0.64], rotation: Math.PI * 0.5, scale: [1.8, 0.82, 1.12]},
  ];
  const ribs = new THREE.InstancedMesh(ribGeometry, materials.frameLight, definitions.length);
  ribs.name = side < 0 ? 'PORT_SHELL_TRUSS_INSTANCES' : 'STARBOARD_SHELL_TRUSS_INSTANCES';
  const matrix = new THREE.Matrix4();
  definitions.forEach((definition, index) => {
    matrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, definition.rotation)),
      new THREE.Vector3(...definition.scale),
    );
    ribs.setMatrixAt(index, matrix);
  });
  ribs.instanceMatrix.needsUpdate = true;
  ribs.castShadow = true;
  ribs.receiveShadow = true;
  parent.add(ribs);
  return ribs;
}

function makeWing(
  root: THREE.Group,
  side: -1 | 1,
  materials: ShipMaterials,
  quality: ExpeditionShipQuality,
) {
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'LEFT_WING_PIVOT' : 'RIGHT_WING_PIVOT';
  root.add(pivot);

  const sideHabitat = addMesh(
    pivot,
    side < 0 ? 'PORT_INHABITED_SHOULDER_POD' : 'STARBOARD_INHABITED_SHOULDER_POD',
    makeRoundedExtrudeGeometry(1.48, 2.18, 1.42, 0.36, quality === 'high' ? 5 : 3),
    materials.glass,
    [side * 0.18, 0.18, -0.18],
    [1, 1, 1],
    [0, 0, side * -0.11],
  );
  sideHabitat.renderOrder = 1;
  sideHabitat.userData.collider = {type: 'box', role: 'inhabited-shoulder-pressure-volume'};
  sideHabitat.userData.structure = {
    gesture: 'cants-and-loads-outward',
    destination: side < 0 ? 'port-controller-shoulder' : 'starboard-controller-shoulder',
    sanctuaryClearance: 'does-not-converge-on-great-tree',
  };
  const shoulderGlazing = materials.glass.clone();
  shoulderGlazing.opacity = 0.58;
  shoulderGlazing.transmission = 0.34;
  addMesh(
    sideHabitat,
    side < 0 ? 'PORT_SHOULDER_POD_GLAZING' : 'STARBOARD_SHOULDER_POD_GLAZING',
    makeRoundedExtrudeGeometry(1.22, 1.7, 0.055, 0.3, quality === 'high' ? 4 : 2),
    shoulderGlazing,
    [0, 0.08, 0.94],
  );

  const gripMass = addMesh(
    pivot,
    side < 0 ? 'PORT_GRIP_NACELLE_MASS' : 'STARBOARD_GRIP_NACELLE_MASS',
    makeControllerWingGeometry(side, 1.08, quality === 'high' ? 5 : 3),
    materials.frame,
    [side * 0.26, -0.18, -0.28],
    [0.92, 0.96, 0.9],
    [0.018, 0, side * -0.025],
  );
  gripMass.userData.collider = {type: 'capsule', role: 'grip-drive-front-leg-chassis'};
  gripMass.visible = false;

  const underframe = addMesh(
    pivot,
    side < 0 ? 'LEFT_UNDERFRAME' : 'RIGHT_UNDERFRAME',
    makeControllerWingGeometry(side, 1.12, quality === 'high' ? 5 : 3),
    materials.frame,
    [side * 0.28, -0.14, -0.1],
    [0.98, 0.98, 0.94],
    [0.025, 0, side * -0.035],
  );
  underframe.visible = false;

  const shell = addMesh(
    pivot,
    side < 0 ? 'LEFT_OUTER_SHELL' : 'RIGHT_OUTER_SHELL',
    makeControllerShellGeometry(side, 1, quality === 'high' ? 5 : 3),
    materials.shell,
    [side * 0.02, 0.08, 0.52],
    [0.92, 1.18, 1.06],
    [0.025, 0, side * -0.035],
  );

  addWingStructuralRibs(shell, side, materials, quality);

  const shoulderYoke = addMesh(
    pivot,
    side < 0 ? 'PORT_GRIP_SHOULDER_YOKE' : 'STARBOARD_GRIP_SHOULDER_YOKE',
    makeShoulderCrownGeometry(side, 1.12, quality === 'high' ? 5 : 3),
    materials.shell,
    [side * 0.06, 1.34, 0.72],
    [1.3, 0.86, 1.13],
    [0, 0, side * -0.11],
  );
  const shoulderWindowGeometry = makeRoundedExtrudeGeometry(0.86, 0.15, 0.09, 0.055, quality === 'high' ? 3 : 2);
  const shoulderSeamDefinitions = [
    {position: [side * -0.42, 0, 0.64] as [number, number, number], rotation: side * -0.08, scale: 0.62},
    {position: [0, -0.03, 0.645] as [number, number, number], rotation: 0, scale: 0.72},
    {position: [side * 0.42, 0, 0.64] as [number, number, number], rotation: side * 0.08, scale: 0.62},
    {position: [side * 0.02, -0.2, 0.65] as [number, number, number], rotation: Math.PI * 0.5, scale: 1.18},
  ];
  const shoulderDetails = new THREE.InstancedMesh(
    shoulderWindowGeometry,
    materials.glass,
    shoulderSeamDefinitions.length + 2,
  );
  shoulderDetails.name = side < 0
    ? 'PORT_SHOULDER_GLAZING_AND_SEAM_INSTANCES'
    : 'STARBOARD_SHOULDER_GLAZING_AND_SEAM_INSTANCES';
  const shoulderDetailMatrix = new THREE.Matrix4();
  shoulderDetailMatrix.makeTranslation(side * 0.06, 0.1, 0.63);
  shoulderDetails.setMatrixAt(0, shoulderDetailMatrix);
  shoulderDetails.setColorAt(0, new THREE.Color('#ffffff'));
  shoulderDetailMatrix.compose(
    new THREE.Vector3(side * -0.28, 0.36, 0.615),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * -0.08)),
    new THREE.Vector3(0.36, 0.68, 0.92),
  );
  shoulderDetails.setMatrixAt(1, shoulderDetailMatrix);
  shoulderDetails.setColorAt(1, new THREE.Color('#ffffff'));
  shoulderSeamDefinitions.forEach((definition, index) => {
    shoulderDetailMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, definition.rotation)),
      new THREE.Vector3(0.015, definition.scale * 3.33, 0.267),
    );
    shoulderDetails.setMatrixAt(index + 2, shoulderDetailMatrix);
    shoulderDetails.setColorAt(index + 2, new THREE.Color('#71808a'));
  });
  shoulderDetails.instanceMatrix.needsUpdate = true;
  if (shoulderDetails.instanceColor) shoulderDetails.instanceColor.needsUpdate = true;
  shoulderDetails.receiveShadow = true;
  shoulderYoke.add(shoulderDetails);

  const travelGripFairing = addMesh(
    pivot,
    side < 0 ? 'PORT_TRAVEL_GRIP_FAIRING' : 'STARBOARD_TRAVEL_GRIP_FAIRING',
    makeControllerWingGeometry(side, 1.18, quality === 'high' ? 5 : 3),
    materials.shell,
    [side * 0.16, -0.12, 0.18],
    [1.34, 1.12, 1.08],
    [0.02, 0, side * -0.035],
  );
  travelGripFairing.visible = false;
  travelGripFairing.userData.clearance = {role: 'travel-mode-controller-envelope'};

  const occupiedDeckWindows = addWindowBand(pivot, side, materials, quality);

  const hinge = new THREE.Group();
  hinge.name = side < 0 ? 'LEFT_HINGE_COLLAR' : 'RIGHT_HINGE_COLLAR';
  hinge.position.set(side * -0.1, 0.78, 0.05);
  pivot.add(hinge);
  addMesh(hinge, 'hinge-outer', new THREE.TorusGeometry(0.34, 0.09, 6, 16), materials.frameLight, [0, 0, 0], [1, 1, 1], [0, 0, 0]);
  addMesh(hinge, 'hinge-power-node', new THREE.SphereGeometry(0.16, quality === 'high' ? 18 : 12, quality === 'high' ? 12 : 8), materials.power, [0, 0, 0.06]);

  const engineHousing = new THREE.Group();
  engineHousing.name = side < 0 ? 'LEFT_ENGINE_HOUSING' : 'RIGHT_ENGINE_HOUSING';
  engineHousing.position.set(side * 0.5, -1.94, -0.42);
  pivot.add(engineHousing);
  addMesh(engineHousing, 'engine-shell', new THREE.CylinderGeometry(0.42, 0.34, 0.92, quality === 'high' ? 20 : 12), materials.frame, [0, 0, 0], [1.15, 1, 0.9], [Math.PI / 2, 0, 0]);

  const thrusterEffects: THREE.Mesh[] = [];
  addMesh(
    engineHousing,
    side < 0 ? 'LEFT_MAIN_ENGINE_SOCKET' : 'RIGHT_MAIN_ENGINE_SOCKET',
    new THREE.TorusGeometry(0.24, 0.065, 8, quality === 'high' ? 28 : 16),
    materials.frameLight,
    [0, 0, -0.49],
  );
  const effect = addMesh(
    engineHousing,
    side < 0 ? 'LEFT_MAIN_ENGINE_THRUST' : 'RIGHT_MAIN_ENGINE_THRUST',
    new THREE.ConeGeometry(0.2, 1.22, quality === 'high' ? 22 : 12, 1, true),
    materials.thrust,
    [0, 0, -1.08],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  effect.visible = false;
  thrusterEffects.push(effect);

  underframe.userData.collider = {type: 'capsule', role: 'wing-compound-proxy'};
  shell.userData.clearance = {role: 'outer-transform-envelope'};
  return {
    pivot,
    engineHousing,
    thrusterEffects,
    gripMass,
    underframe,
    travelGripFairing,
    sideHabitat,
    shell,
    shoulderYoke,
    occupiedDeckWindows,
  };
}

function makeTree(parent: THREE.Object3D, materials: ShipMaterials, quality: ExpeditionShipQuality) {
  const tree = new THREE.Group();
  tree.name = 'GREAT_TREE';
  tree.position.set(0, -0.3, -0.04);
  // The habitat frame is compacted relative to the outer controller shell, but
  // the Great Tree grows within that frame and remains the dominant landmark.
  tree.scale.setScalar(1.12);
  parent.add(tree);
  const trunkProfile = [
    new THREE.Vector2(0.3, -0.75),
    new THREE.Vector2(0.25, -0.48),
    new THREE.Vector2(0.22, -0.05),
    new THREE.Vector2(0.16, 0.42),
    new THREE.Vector2(0.12, 0.74),
  ];
  addMesh(
    tree,
    'great-tree-trunk',
    new THREE.LatheGeometry(trunkProfile, quality === 'high' ? 16 : 10),
    materials.bark,
    [0, 0.4, 0],
    [1, 1, 0.92],
  );

  const branchSegments: Array<{start: THREE.Vector3; end: THREE.Vector3; radius: number}> = [
    {start: new THREE.Vector3(-0.08, -0.22, 0), end: new THREE.Vector3(-0.72, -0.58, 0.3), radius: 1.72},
    {start: new THREE.Vector3(0.08, -0.22, 0), end: new THREE.Vector3(0.72, -0.58, 0.28), radius: 1.72},
    {start: new THREE.Vector3(-0.04, -0.18, -0.06), end: new THREE.Vector3(-0.5, -0.56, -0.5), radius: 1.48},
    {start: new THREE.Vector3(0.04, -0.18, -0.06), end: new THREE.Vector3(0.5, -0.56, -0.5), radius: 1.48},
    {start: new THREE.Vector3(0, 0.7, 0), end: new THREE.Vector3(-0.48, 1.12, 0.02), radius: 1.25},
    {start: new THREE.Vector3(0, 0.74, 0), end: new THREE.Vector3(0.48, 1.14, -0.02), radius: 1.25},
    {start: new THREE.Vector3(-0.22, 0.94, 0.01), end: new THREE.Vector3(-0.76, 1.25, 0.03), radius: 0.82},
    {start: new THREE.Vector3(0.22, 0.96, -0.01), end: new THREE.Vector3(0.76, 1.27, 0), radius: 0.82},
    {start: new THREE.Vector3(-0.12, 1.03, 0), end: new THREE.Vector3(-0.3, 1.48, 0.1), radius: 0.72},
    {start: new THREE.Vector3(0.12, 1.04, 0), end: new THREE.Vector3(0.3, 1.49, 0.08), radius: 0.72},
    {start: new THREE.Vector3(-0.48, 1.12, 0.02), end: new THREE.Vector3(-0.9, 1.36, 0.12), radius: 0.55},
    {start: new THREE.Vector3(0.48, 1.14, -0.02), end: new THREE.Vector3(0.9, 1.37, 0.1), radius: 0.55},
    {start: new THREE.Vector3(-0.3, 1.22, 0.04), end: new THREE.Vector3(-0.56, 1.53, -0.12), radius: 0.5},
    {start: new THREE.Vector3(0.3, 1.23, 0.02), end: new THREE.Vector3(0.57, 1.54, -0.1), radius: 0.5},
    {start: new THREE.Vector3(-0.08, 0.9, 0.02), end: new THREE.Vector3(-0.42, 1.3, 0.48), radius: 0.55},
    {start: new THREE.Vector3(0.08, 0.92, 0), end: new THREE.Vector3(0.46, 1.32, -0.46), radius: 0.55},
    {start: new THREE.Vector3(-0.42, 1.3, 0.48), end: new THREE.Vector3(-0.76, 1.5, 0.58), radius: 0.4},
    {start: new THREE.Vector3(0.46, 1.32, -0.46), end: new THREE.Vector3(0.8, 1.52, -0.56), radius: 0.4},
    {start: new THREE.Vector3(-0.76, 1.25, 0.03), end: new THREE.Vector3(-1.04, 1.42, -0.22), radius: 0.34},
    {start: new THREE.Vector3(0.76, 1.27, 0), end: new THREE.Vector3(1.04, 1.44, -0.2), radius: 0.34},
    {start: new THREE.Vector3(-0.56, 1.53, -0.12), end: new THREE.Vector3(-0.82, 1.7, -0.34), radius: 0.28},
    {start: new THREE.Vector3(0.57, 1.54, -0.1), end: new THREE.Vector3(0.84, 1.71, -0.32), radius: 0.28},
  ];
  const branchGeometry = new THREE.CylinderGeometry(0.065, 0.105, 1, quality === 'high' ? 9 : 6);
  const branches = new THREE.InstancedMesh(branchGeometry, materials.bark, branchSegments.length);
  branches.name = 'great-tree-branch-network';
  const up = new THREE.Vector3(0, 1, 0);
  const branchMatrix = new THREE.Matrix4();
  branchSegments.forEach((segment, index) => {
    const direction = segment.end.clone().sub(segment.start);
    const midpoint = segment.start.clone().add(segment.end).multiplyScalar(0.5);
    const rotation = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    branchMatrix.compose(midpoint, rotation, new THREE.Vector3(segment.radius, direction.length(), segment.radius));
    branches.setMatrixAt(index, branchMatrix);
  });
  branches.instanceMatrix.needsUpdate = true;
  branches.castShadow = true;
  tree.add(branches);

  const crownGeometry = new THREE.IcosahedronGeometry(0.11, 1);
  const crownDefinitions: Array<{position: [number, number, number]; scale: [number, number, number]; light: boolean}> = [];
  const crownRings = [
    {count: quality === 'high' ? 42 : 26, radiusX: 1.18, radiusZ: 0.64, y: 1.43},
    {count: quality === 'high' ? 34 : 21, radiusX: 0.86, radiusZ: 0.76, y: 1.63},
    {count: quality === 'high' ? 24 : 15, radiusX: 0.52, radiusZ: 0.5, y: 1.83},
  ];
  crownRings.forEach((ring, ringIndex) => {
    for (let index = 0; index < ring.count; index += 1) {
      const angle = index / ring.count * Math.PI * 2 + ringIndex * 0.41;
      const ripple = Math.sin(index * 2.17 + ringIndex) * 0.055;
      crownDefinitions.push({
        position: [
          Math.cos(angle) * (ring.radiusX + ripple),
          ring.y + Math.sin(index * 1.73) * 0.055,
          Math.sin(angle) * (ring.radiusZ + ripple * 0.6),
        ],
        scale: [1.15 + (index % 3) * 0.12, 0.72 + (index % 2) * 0.12, 0.95 + ((index + 1) % 3) * 0.1],
        light: (index + ringIndex) % 3 === 0,
      });
    }
  });
  // From the garden floor the tree-house terrace should feel nested in a
  // living canopy, not like an exposed slab. A sparse ring of broad, hanging
  // foliage masks most of its underside while retaining glimpses of the warm
  // pavilion and a clear route around the trunk.
  const underCanopyCount = quality === 'high' ? 26 : 20;
  for (let index = 0; index < underCanopyCount; index += 1) {
    const angle = index * 2.399963 + 0.24;
    const canopyRadius = Math.sqrt((index + 0.75) / underCanopyCount) * 0.82;
    crownDefinitions.push({
      position: [
        Math.cos(angle) * canopyRadius,
        1.08 + Math.sin(index * 1.91) * 0.045,
        Math.sin(angle) * canopyRadius * 0.8,
      ],
      scale: [2.08 + (index % 3) * 0.14, 1.32 + (index % 2) * 0.16, 1.82 + ((index + 1) % 3) * 0.12],
      light: index % 3 === 1,
    });
  }
  for (const light of [false, true]) {
    const definitions = crownDefinitions.filter((definition) => definition.light === light);
    const crowns = new THREE.InstancedMesh(crownGeometry, light ? materials.foliageLight : materials.foliage, definitions.length);
    crowns.name = light ? 'great-tree-crown-light' : 'great-tree-crown-dark';
    definitions.forEach((definition, index) => {
      branchMatrix.compose(new THREE.Vector3(...definition.position), new THREE.Quaternion(), new THREE.Vector3(...definition.scale));
      crowns.setMatrixAt(index, branchMatrix);
    });
    crowns.instanceMatrix.needsUpdate = true;
    crowns.castShadow = true;
    tree.add(crowns);
  }

  // A low garden understorey adds the inhabited depth seen in the goal image,
  // while leaving the Great Tree's central circulation volume unobstructed.
  const undergrowthDefinitions: Array<{
    position: [number, number, number];
    scale: [number, number, number];
    light: boolean;
  }> = [];
  const undergrowthCount = quality === 'high' ? 28 : 18;
  for (let index = 0; index < undergrowthCount; index += 1) {
    const angle = index / undergrowthCount * Math.PI * 2;
    const radius = index % 2 === 0 ? 0.91 : 0.68;
    undergrowthDefinitions.push({
      position: [Math.cos(angle) * radius, -0.39 + (index % 3) * 0.045, Math.sin(angle) * radius * 0.62],
      scale: [0.92 + (index % 4) * 0.08, 0.62 + (index % 3) * 0.08, 0.88 + ((index + 2) % 4) * 0.08],
      light: index % 3 === 0,
    });
  }
  const undergrowthGeometry = new THREE.IcosahedronGeometry(0.105, quality === 'high' ? 1 : 0);
  for (const light of [false, true]) {
    const definitions = undergrowthDefinitions.filter((definition) => definition.light === light);
    const undergrowth = new THREE.InstancedMesh(
      undergrowthGeometry,
      light ? materials.foliageLight : materials.foliage,
      definitions.length,
    );
    undergrowth.name = light ? 'sanctuary-undergrowth-light' : 'sanctuary-undergrowth-dark';
    definitions.forEach((definition, index) => {
      branchMatrix.compose(
        new THREE.Vector3(...definition.position),
        new THREE.Quaternion(),
        new THREE.Vector3(...definition.scale),
      );
      undergrowth.setMatrixAt(index, branchMatrix);
    });
    undergrowth.instanceMatrix.needsUpdate = true;
    undergrowth.castShadow = true;
    tree.add(undergrowth);
  }

  const treeTerraceParts: THREE.BufferGeometry[] = [];
  const treeTerraceDeck = new THREE.CylinderGeometry(0.8, 0.84, 0.075, quality === 'high' ? 24 : 16);
  treeTerraceDeck.translate(0, 1.21, -0.02);
  treeTerraceParts.push(treeTerraceDeck);
  const treeHouseBody = makeRoundedExtrudeGeometry(0.58, 0.3, 0.42, 0.09, 2);
  treeHouseBody.translate(0.36, 1.43, -0.15);
  treeTerraceParts.push(treeHouseBody);
  const treeHouseRoof = new THREE.ConeGeometry(0.46, 0.18, 4);
  treeHouseRoof.rotateY(Math.PI * 0.25);
  treeHouseRoof.translate(0.36, 1.68, -0.15);
  treeTerraceParts.push(treeHouseRoof);
  const mergeReadyTreeTerraceParts = treeTerraceParts.map((geometry) => {
    if (!geometry.index) return geometry;
    const nonIndexed = geometry.toNonIndexed();
    geometry.dispose();
    return nonIndexed;
  });
  const treeTerraceGeometry = mergeGeometries(mergeReadyTreeTerraceParts, false);
  if (!treeTerraceGeometry) throw new Error('Unable to merge Great Tree terrace and pavilion');
  mergeReadyTreeTerraceParts.forEach((geometry) => geometry.dispose());
  addMesh(tree, 'GREAT_TREE_CROWN_TERRACE_AND_PAVILION', treeTerraceGeometry, materials.bark, [0, 0, 0]);

  const treeLoungeDefinitions: Array<{position: [number, number, number]; rotation: number}> = [
    {position: [-0.48, 1.3, 0.2], rotation: -0.45},
    {position: [-0.18, 1.3, 0.38], rotation: -0.12},
    {position: [0.18, 1.3, 0.38], rotation: 0.12},
    {position: [0.5, 1.3, 0.18], rotation: 0.45},
    {position: [-0.5, 1.3, -0.26], rotation: -0.65},
    {position: [0.02, 1.3, -0.46], rotation: 0},
  ];
  const treeLounges = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.085, 0.19, quality === 'high' ? 3 : 2, quality === 'high' ? 7 : 5),
    materials.warmWindow,
    treeLoungeDefinitions.length,
  );
  treeLounges.name = 'tree-top-observatory-lounge-instances';
  treeLoungeDefinitions.forEach((definition, index) => {
    branchMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, definition.rotation)),
      new THREE.Vector3(1.3, 0.72, 1),
    );
    treeLounges.setMatrixAt(index, branchMatrix);
  });
  treeLounges.instanceMatrix.needsUpdate = true;
  tree.add(treeLounges);
  return tree;
}

interface WalkerLegRig {
  root: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
  trimEffects: THREE.Mesh[];
  side: -1 | 1;
  foreAft: -1 | 1;
  role: 'powered-grip-front' | 'rear-stabilizer';
  restY: number;
  phase: number;
}

function makeWalkerLeg(
  parent: THREE.Object3D,
  side: -1 | 1,
  foreAft: -1 | 1,
  materials: ShipMaterials,
  quality: ExpeditionShipQuality,
): WalkerLegRig {
  const role = foreAft < 0 ? 'powered-grip-front' : 'rear-stabilizer';
  const leg = new THREE.Group();
  leg.name = foreAft < 0
    ? `POWERED_GRIP_FRONT_LEG_${side < 0 ? 'LEFT' : 'RIGHT'}`
    : `REAR_STABILIZER_LEG_${side < 0 ? 'LEFT' : 'RIGHT'}`;
  const restY = foreAft < 0 ? -1.14 : -0.82;
  if (foreAft < 0) leg.position.set(side * 0.55, restY, 0.08);
  else leg.position.set(side * 2.02, restY, -0.72);
  // The front chain counters the wing's controller-fold angle, opening from
  // the hip before the knee brings the foot back under the load envelope.
  leg.rotation.z = side * (foreAft < 0 ? 0.34 : 0.16);
  leg.userData.mobilityRole = role;
  parent.add(leg);

  addGroupedMesh(leg, 'walker-hip-mechanism', [
    {
      geometry: new THREE.SphereGeometry(foreAft < 0 ? 0.46 : 0.42, quality === 'high' ? 18 : 11, quality === 'high' ? 13 : 8),
      material: materials.frameLight,
      scale: foreAft < 0 ? [1.48, 1.14, 1.28] : [1.3, 1.1, 1.2],
    },
    {
      geometry: new THREE.TorusGeometry(
        foreAft < 0 ? 0.42 : 0.37,
        foreAft < 0 ? 0.095 : 0.08,
        quality === 'high' ? 8 : 6,
        quality === 'high' ? 20 : 16,
      ),
      // A blue-black metallic pressure floor keeps the industrial deck dark
      // without collapsing into the featureless black void seen in the last
      // interior review.
      material: materials.frameLight,
      position: [0, 0, foreAft < 0 ? 0.48 : 0.42],
    },
    {
      geometry: new THREE.SphereGeometry(foreAft < 0 ? 0.17 : 0.145, quality === 'high' ? 12 : 10, quality === 'high' ? 8 : 7),
      material: materials.power,
      position: [0, 0, foreAft < 0 ? 0.57 : 0.5],
      scale: [1, 1, 0.42],
    },
  ]);
  addMesh(
    leg,
    'walker-upper-leg',
    foreAft < 0
      ? makeTaperedExtrudeGeometry(1.12, 0.76, 1.72, 0.92, quality === 'high' ? 3 : 2)
      : makeTaperedArmorFrameGeometry(0.92, 0.68, 1.48, 0.86, 0.5, 1.04, quality === 'high' ? 3 : 2),
    materials.frame,
    [side * 0.04, -0.52, 0],
    foreAft < 0 ? [1.34, 1.18, 1.18] : [1.16, 1.1, 1.1],
    [foreAft * 0.08, 0, side * 0.01],
  );
  if (foreAft < 0) {
    addMesh(
      leg,
      side < 0 ? 'PORT_POWERED_GRIP_LEG_FAIRING' : 'STARBOARD_POWERED_GRIP_LEG_FAIRING',
      makeTaperedArmorFrameGeometry(1.28, 0.84, 1.9, 0.27, 0.54, 1.28, quality === 'high' ? 4 : 2),
      materials.shell,
      [side * -0.06, -0.46, 0.56],
      [1, 1, 1],
      [0.08, 0, side * -0.035],
    );
  }
  addMesh(
    leg,
    'walker-upper-armour',
    foreAft < 0
      ? makeTaperedExtrudeGeometry(0.46, 0.32, 1.08, 0.13, quality === 'high' ? 3 : 2)
      : makeTaperedArmorFrameGeometry(0.72, 0.52, 1.12, 0.18, 0.36, 0.78, 2),
    foreAft < 0 ? materials.shellInset : materials.shell,
    [side * 0.08, foreAft < 0 ? -0.48 : -0.52, foreAft < 0 ? 0.66 : 0.58],
    foreAft < 0 ? [1.08, 1.05, 1.06] : [0.96, 0.98, 0.96],
    [foreAft * 0.08, 0, side * 0.01],
  );

  const upperActuatorGeometry = new THREE.CylinderGeometry(
    0.055,
    0.072,
    foreAft < 0 ? 1.18 : 1.02,
    quality === 'high' ? 10 : 7,
  );
  const upperActuators = new THREE.InstancedMesh(upperActuatorGeometry, materials.shellInset, 2);
  upperActuators.name = 'walker-upper-actuator-pair';
  const upperActuatorMatrix = new THREE.Matrix4();
  const upperActuatorQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, 0, side * -0.09));
  [-0.29, 0.29].forEach((actuatorX, index) => {
    upperActuatorMatrix.compose(
      new THREE.Vector3(actuatorX, foreAft < 0 ? -0.66 : -0.58, 0.61 + index * 0.035),
      upperActuatorQuaternion,
      new THREE.Vector3(1, 1, 1),
    );
    upperActuators.setMatrixAt(index, upperActuatorMatrix);
  });
  upperActuators.instanceMatrix.needsUpdate = true;
  upperActuators.castShadow = true;
  leg.add(upperActuators);

  const knee = new THREE.Group();
  knee.name = 'WALKER_KNEE_PIVOT';
  knee.position.set(side * 0.08, foreAft < 0 ? -1.44 : -1.2, 0);
  knee.rotation.z = side * (foreAft < 0 ? -0.08 : -0.04);
  leg.add(knee);
  const kneeMechanismParts: GroupedMeshPart[] = [
    {
      geometry: new THREE.CylinderGeometry(
        foreAft < 0 ? 0.46 : 0.41,
        foreAft < 0 ? 0.46 : 0.41,
        foreAft < 0 ? 0.94 : 0.76,
        quality === 'high' ? 16 : 10,
      ),
      material: foreAft < 0 ? materials.frameLight : materials.power,
      position: [0, 0, foreAft < 0 ? 0.28 : 0],
      scale: foreAft < 0 ? [1.15, 1, 1] : [0.98, 0.94, 0.96],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new THREE.TorusGeometry(
        foreAft < 0 ? 0.37 : 0.33,
        foreAft < 0 ? 0.085 : 0.07,
        quality === 'high' ? 7 : 6,
        quality === 'high' ? 18 : 15,
      ),
      material: materials.frameLight,
      position: [0, 0, foreAft < 0 ? 0.77 : 0.57],
    },
    {
      geometry: new THREE.SphereGeometry(foreAft < 0 ? 0.15 : 0.13, quality === 'high' ? 12 : 9, quality === 'high' ? 8 : 7),
      material: materials.power,
      position: [0, 0, foreAft < 0 ? 0.86 : 0.66],
      scale: [1, 1, 0.42],
    },
  ];
  if (foreAft < 0) {
    kneeMechanismParts.push({
      geometry: new THREE.TorusGeometry(0.21, 0.045, quality === 'high' ? 6 : 5, quality === 'high' ? 18 : 14),
      material: materials.power,
      position: [0, 0, 0.65],
    });
  }
  addGroupedMesh(knee, 'walker-knee-mechanism', kneeMechanismParts);
  addMesh(
    knee,
    'walker-lower-leg',
    foreAft < 0
      ? makeTaperedExtrudeGeometry(0.76, 0.5, 1.4, 0.72, quality === 'high' ? 3 : 2)
      : makeTaperedArmorFrameGeometry(0.78, 0.58, 1.34, 0.78, 0.42, 0.9, quality === 'high' ? 3 : 2),
    materials.frame,
    [side * -0.06, -0.52, 0],
    foreAft < 0 ? [1.24, 1.15, 1.14] : [1.13, 1.1, 1.08],
    [foreAft * -0.06, 0, side * 0.1],
  );
  addMesh(
    knee,
    'walker-lower-armour',
    foreAft < 0
      ? makeTaperedExtrudeGeometry(0.88, 0.66, 1.44, 0.2, quality === 'high' ? 3 : 2)
      : makeTaperedArmorFrameGeometry(0.66, 0.48, 1.02, 0.18, 0.32, 0.7, 2),
    foreAft < 0 ? materials.shell : materials.shellInset,
    [side * -0.045, -0.54, foreAft < 0 ? 0.58 : 0.56],
    foreAft < 0 ? [1.05, 1.05, 1.04] : [0.94, 0.98, 0.96],
    [foreAft * -0.06, 0, side * 0.08],
  );

  const ankle = new THREE.Group();
  ankle.name = 'WALKER_ANKLE_PIVOT';
  ankle.position.set(side * -0.1, foreAft < 0 ? -1.34 : -1.16, 0);
  knee.add(ankle);
  addMesh(
    ankle,
    'walker-ankle-joint',
    new THREE.SphereGeometry(0.23, quality === 'high' ? 14 : 9, quality === 'high' ? 10 : 7),
    materials.frameLight,
    [0, 0.02, 0],
  );
  if (foreAft < 0) {
    const hydraulicGeometry = new THREE.CylinderGeometry(0.045, 0.058, 1.04, quality === 'high' ? 10 : 7);
    const hydraulicOffsets = [-0.27, -0.17, -0.06, 0.06, 0.17, 0.27];
    const hydraulicRails = new THREE.InstancedMesh(hydraulicGeometry, materials.shellInset, hydraulicOffsets.length);
    hydraulicRails.name = 'walker-shin-hydraulic-rail-instances';
    const hydraulicMatrix = new THREE.Matrix4();
    hydraulicOffsets.forEach((railX, index) => {
      const innerRail = index > 0 && index < hydraulicOffsets.length - 1;
      hydraulicMatrix.compose(
        new THREE.Vector3(railX, -0.54 + (index % 2) * 0.025, innerRail ? 0.79 : 0.75),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (index - 2.5) * 0.012)),
        new THREE.Vector3(innerRail ? 0.66 : 1, 0.98 + (index % 2) * 0.05, innerRail ? 0.66 : 1),
      );
      hydraulicRails.setMatrixAt(index, hydraulicMatrix);
    });
    hydraulicRails.instanceMatrix.needsUpdate = true;
    hydraulicRails.castShadow = true;
    knee.add(hydraulicRails);

    const shinPanelGeometry = makeRoundedExtrudeGeometry(0.36, 0.18, 0.08, 0.04, 1);
    const shinPanelLevels = [-0.94, -0.75, -0.56, -0.37, -0.18];
    const shinPanels = new THREE.InstancedMesh(shinPanelGeometry, materials.shellInset, shinPanelLevels.length);
    shinPanels.name = 'walker-shin-service-panel-instances';
    const shinPanelMatrix = new THREE.Matrix4();
    shinPanelLevels.forEach((panelY, index) => {
      shinPanelMatrix.compose(
        new THREE.Vector3(side * ((index % 2) * 0.045 - 0.02), panelY, 0.8 + (index % 2) * 0.012),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * (index % 2 === 0 ? -0.018 : 0.018))),
        new THREE.Vector3(index === 0 || index === shinPanelLevels.length - 1 ? 0.92 : 1, 0.82, 1),
      );
      shinPanels.setMatrixAt(index, shinPanelMatrix);
    });
    shinPanels.instanceMatrix.needsUpdate = true;
    knee.add(shinPanels);
  }
  addMesh(
    ankle,
    'walker-adaptive-foot',
    makeRoundedExtrudeGeometry(1.02, 0.28, 1.28, 0.14, quality === 'high' ? 3 : 2),
    materials.frame,
    [side * 0.1, -0.19, foreAft < 0 ? 0.24 : -0.12],
    foreAft < 0 ? [1.32, 1.05, 1.28] : [1.08, 1.02, 1.08],
  );

  const footDetailGeometry = foreAft < 0
    ? makeRoundedExtrudeGeometry(0.2, 0.085, 0.34, 0.045, 1)
    : new THREE.CylinderGeometry(0.04, 0.055, 1.06, quality === 'high' ? 9 : 6);
  const footDetailCount = foreAft < 0 ? 5 : 6;
  const footDetails = new THREE.InstancedMesh(footDetailGeometry, materials.shellInset, footDetailCount);
  footDetails.name = foreAft < 0
    ? 'walker-foot-toe-plate-instances'
    : 'rear-shin-actuator-rail-instances';
  const footDetailMatrix = new THREE.Matrix4();
  if (foreAft < 0) {
    for (let toeIndex = 0; toeIndex < footDetailCount; toeIndex += 1) {
      footDetailMatrix.compose(
        new THREE.Vector3((toeIndex - 2) * 0.19, -0.17, 0.5 + foreAft * 0.05 + Math.abs(toeIndex - 2) * -0.018),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (toeIndex - 2) * -0.035, 0)),
        new THREE.Vector3(toeIndex === 0 || toeIndex === 4 ? 0.76 : 1, 1, 1),
      );
      footDetails.setMatrixAt(toeIndex, footDetailMatrix);
    }
  } else {
    const railQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, side * -0.08));
    [-0.26, -0.16, -0.05, 0.05, 0.16, 0.26].forEach((railX, index) => {
      footDetailMatrix.compose(
        new THREE.Vector3(railX, 0.42, 0.48 + (index % 2) * 0.045),
        railQuaternion,
        new THREE.Vector3(index === 0 || index === 5 ? 1 : 0.72, 1, index === 0 || index === 5 ? 1 : 0.72),
      );
      footDetails.setMatrixAt(index, footDetailMatrix);
    });
  }
  footDetails.instanceMatrix.needsUpdate = true;
  footDetails.castShadow = true;
  footDetails.receiveShadow = true;
  ankle.add(footDetails);

  const trimRocketGeometry = new THREE.ConeGeometry(0.052, 0.42, quality === 'high' ? 12 : 7, 1, true);
  const trimRocketPair = new THREE.InstancedMesh(trimRocketGeometry, materials.hover, 2);
  trimRocketPair.name = 'walker-trim-rocket-effect-pair';
  const trimRocketMatrix = new THREE.Matrix4();
  const trimRocketQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI));
  [-0.19, 0.19].forEach((offset, index) => {
    trimRocketMatrix.compose(
      new THREE.Vector3(offset, -0.42, foreAft * 0.16),
      trimRocketQuaternion,
      new THREE.Vector3(1, 1, 1),
    );
    trimRocketPair.setMatrixAt(index, trimRocketMatrix);
  });
  trimRocketPair.instanceMatrix.needsUpdate = true;
  trimRocketPair.visible = false;
  ankle.add(trimRocketPair);
  const trimEffects: THREE.Mesh[] = [trimRocketPair];

  return {
    root: leg,
    knee,
    ankle,
    trimEffects,
    side,
    foreAft,
    role,
    restY,
    // A cautious four-beat crawl keeps three feet planted while the fourth unloads.
    phase: foreAft < 0
      ? (side < 0 ? 0 : Math.PI)
      : (side < 0 ? Math.PI * 1.5 : Math.PI * 0.5),
  };
}

export function createExpeditionShipThreeModel(quality: ExpeditionShipQuality = 'high'): ExpeditionShipThreeModel {
  const materials = makeMaterials();
  const root = new THREE.Group();
  root.name = 'EXPEDITION_SHIP_ROOT';

  const stabilizedHull = new THREE.Group();
  stabilizedHull.name = 'STABILIZED_INHABITED_HULL';
  root.add(stabilizedHull);

  const centreSpine = new THREE.Group();
  centreSpine.name = 'CENTER_SPINE';
  stabilizedHull.add(centreSpine);

  // Keep the heavy pressure ring behind the garden threshold. The separate
  // slim piers and crown carry the visible front opening; this deeper frame now
  // recedes and flares into the shoulders instead of projecting toward the tree.
  const centreFrame = new THREE.Group();
  centreFrame.name = 'CENTRE_REAR_PRESSURE_CLEARANCE';
  centreSpine.add(centreFrame);
  centreFrame.userData.structure = {
    role: 'open-rear-pressure-clearance-between-shoulder-load-paths',
    gesture: 'load-bypasses-glazing-through-controller-shoulders',
    sanctuaryClearance: 'keeps-front-and-tree-centre-open',
  };
  const centreTopArch = addMesh(
    centreSpine,
    'CENTRE_SHELL_TOP_ARCH',
    makeAtriumCrownGeometry(2.18, 3, true),
    materials.frameLight,
    [0, 1.86, -0.02],
  );
  const centreLeftPier = addMesh(
    centreSpine,
    'CENTRE_SHELL_LEFT_OUTWARD_BRACE',
    makeRoundedExtrudeGeometry(0.22, 2.42, 0.72, 0.1, quality === 'high' ? 5 : 3),
    materials.frameLight,
    [-1.94, 0.43, -0.42],
    [1, 1, 1],
    [0, 0, 0.13],
  );
  const centreRightPier = addMesh(
    centreSpine,
    'CENTRE_SHELL_RIGHT_OUTWARD_BRACE',
    makeRoundedExtrudeGeometry(0.22, 2.42, 0.72, 0.1, quality === 'high' ? 5 : 3),
    materials.frameLight,
    [1.94, 0.43, -0.42],
    [1, 1, 1],
    [0, 0, -0.13],
  );
  centreLeftPier.userData.structure = {gesture: 'leans-outward', destination: 'left-controller-shoulder'};
  centreRightPier.userData.structure = {gesture: 'leans-outward', destination: 'right-controller-shoulder'};
  const centreLowerSill = addMesh(centreSpine, 'CENTRE_SHELL_LOWER_SILL', makeRoundedExtrudeGeometry(3.82, 0.24, 1.9, 0.1, quality === 'high' ? 4 : 2), materials.frameLight, [0, -0.88, 0.02]);
  const bridgeVisor = addMesh(centreSpine, 'BRIDGE_VISOR', makeTaperedExtrudeGeometry(2.82, 2.42, 0.22, 0.18, quality === 'high' ? 4 : 2), materials.glass, [0, 1.78, 1.12]);
  const centreRoofObservatory = addMesh(
    centreSpine,
    'CENTRE_ROOF_OBSERVATORY',
    makeAtriumCrownGeometry(1.94, quality === 'high' ? 5 : 3, false),
    materials.glass,
    [0, 1.84, 0.04],
    [0.88, 0.84, 1],
  );

  const speedShellMaterial = materials.frameLight.clone();
  speedShellMaterial.color.set('#0b2941');
  speedShellMaterial.roughness = 0.18;
  speedShellMaterial.metalness = 0.54;
  speedShellMaterial.clearcoat = 0.92;
  speedShellMaterial.clearcoatRoughness = 0.1;
  const speedTouchpadMaterial = materials.glass.clone();
  speedTouchpadMaterial.color.set('#147ba8');
  speedTouchpadMaterial.emissive.set('#093b5b');
  speedTouchpadMaterial.emissiveIntensity = 0.46;
  speedTouchpadMaterial.transmission = 0.12;
  speedTouchpadMaterial.opacity = 0.92;
  const speedControllerCore = addMesh(
    centreSpine,
    'SPEED_CONTROLLER_GAME_SHELL_CORE',
    makeGameControllerSpeedCoreGeometry(0.52, quality === 'high' ? 3 : 2),
    speedShellMaterial,
    [0, 0.24, 1.2],
    [1.04, 1.02, 1],
  );
  speedControllerCore.visible = false;
  speedControllerCore.userData.shapeAuthority = 'src/assets/Blue_darkcontroller.webp';
  const havenCentreStructures = [
    centreFrame,
    centreTopArch,
    centreLeftPier,
    centreRightPier,
    centreLowerSill,
    centreRoofObservatory,
  ];

  const occupiedAtriumDecks = new THREE.Group();
  occupiedAtriumDecks.name = 'ATRIUM_OCCUPIED_DECKS';
  occupiedAtriumDecks.scale.setScalar(0.84);
  centreSpine.add(occupiedAtriumDecks);
  // Six compact inhabited storeys now occupy the same protected perimeter
  // envelope that previously held only three oversized office-like levels.
  // The Great Tree and open garden void keep their scale; only the repeated
  // apartment/amenity architecture becomes denser and more plausibly urban.
  const atriumDeckLevels = [-0.52, -0.18, 0.16, 0.5, 0.84, 1.18];
  // The ring silhouette is broad and architectural; one bevel band is enough
  // at both LODs and keeps the new walkable volume inside the mobile budget.
  const atriumDeckGeometry = makeCurvedAtriumBalconyGeometry(0.1, 1);
  const atriumDeckMaterial = materials.shellInset.clone();
  atriumDeckMaterial.color.set('#46545b');
  atriumDeckMaterial.emissive.set('#17110d');
  atriumDeckMaterial.emissiveIntensity = 0.22;
  atriumDeckMaterial.side = THREE.DoubleSide;
  const atriumDeckSlabs = new THREE.InstancedMesh(atriumDeckGeometry, atriumDeckMaterial, atriumDeckLevels.length);
  atriumDeckSlabs.name = 'atrium-curved-wraparound-balcony-deck-instances';
  const atriumMatrix = new THREE.Matrix4();
  atriumDeckLevels.forEach((deckY, deckIndex) => {
    atriumMatrix.makeTranslation(0, deckY, 0);
    atriumDeckSlabs.setMatrixAt(deckIndex, atriumMatrix);
  });
  atriumDeckSlabs.instanceMatrix.needsUpdate = true;
  atriumDeckSlabs.castShadow = true;
  atriumDeckSlabs.receiveShadow = true;
  occupiedAtriumDecks.add(atriumDeckSlabs);

  // The sanctuary is the civic heart, not a painted backdrop: six occupied
  // levels wrap it while leaving the protected pressure volume unobstructed.
  const inhabitedInterior = new THREE.Group();
  inhabitedInterior.name = 'INHABITED_INTERIOR_ARCHITECTURE';
  inhabitedInterior.scale.setScalar(0.84);
  centreSpine.add(inhabitedInterior);
  const interiorMatrix = new THREE.Matrix4();
  const interiorQuaternion = new THREE.Quaternion();

  // The atrium is a vertical neighbourhood, not a repeated office facade.
  // These named program decks make the user's intended sequence legible while
  // keeping all occupied volumes fixed inside one compact pressure frame.
  const inhabitedDeckProgram = new THREE.Group();
  inhabitedDeckProgram.name = 'INHABITED_DECK_PROGRAM';
  inhabitedInterior.add(inhabitedDeckProgram);

  const fabricationDeck = new THREE.Group();
  fabricationDeck.name = 'DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE';
  fabricationDeck.position.set(0, -0.68, 0.34);
  fabricationDeck.userData.program = {
    level: 0,
    role: 'retractable-garage-machine-workbench',
    motion: 'extends-in-haven-retracts-before-travel-shell-closure',
    dedicatedFullWidthDeck: true,
    clearHeightClass: 'industrial-double-height',
    garageBays: ['empty-rover-service-bay', 'engine-pod-rotary-lift', 'clean-fabrication-bench-line'],
    floorSystems: ['twin-service-trenches', 'magnetic-wheel-clamps', 'overhead-handling-gantry', 'retractable-vehicle-lift'],
    futureVehicleCapacity: 'two-rovers-or-one-medium-transformer-module',
  };
  inhabitedDeckProgram.add(fabricationDeck);
  const workshopPanoramicGlass = materials.glass.clone();
  workshopPanoramicGlass.name = 'fabrication-panoramic-low-reflection-glass';
  workshopPanoramicGlass.color.set('#6b9399');
  workshopPanoramicGlass.roughness = 0.11;
  workshopPanoramicGlass.transmission = 0.9;
  workshopPanoramicGlass.opacity = 0.18;
  workshopPanoramicGlass.thickness = 0.08;
  workshopPanoramicGlass.clearcoat = 0.42;
  workshopPanoramicGlass.clearcoatRoughness = 0.08;
  workshopPanoramicGlass.envMapIntensity = 0.48;
  const fabricationFloorParts: GroupedMeshPart[] = [
    {
      // Extend the protected service floor toward the viewer so the true POV
      // can stand inside a vehicle-scale aisle instead of on its front lip.
      geometry: makeRoundedExtrudeGeometry(3.48, 0.12, 2, 0.1, 2),
      material: materials.workshopSurface,
      position: [0, -0.88, -0.05],
    },
    {
      // One continuous bowed liner replaces the flat black ceiling slab. Its
      // edges descend into the pressure cheeks so the workshop reads as a
      // machined yacht interior rather than a room assembled from boxes.
      geometry: makeWorkshopCurvedCanopyGeometry(quality),
      material: materials.workshopSurface,
      position: [0, 0, 0],
    },
    ...([-0.92, 0, 0.92] as const).map((x, index): GroupedMeshPart => ({
      // Short luminous service coves break the ceiling into work zones without
      // turning it into another office grid.
      geometry: new THREE.BoxGeometry(0.34, 0.012, 0.12),
      material: index === 1 ? materials.power : materials.warmWindow,
      position: [x, workshopCanopyY(x, -0.17) - 0.012, -0.17],
    })),
    ...([-1.18, 1.18] as const).map((x): GroupedMeshPart => ({
      // Long warm coves reveal the canopy's fore-aft continuity from the true
      // interior POV and establish a yacht-like edge hierarchy.
      geometry: new THREE.BoxGeometry(0.028, 0.014, 1.68),
      material: materials.warmWindow,
      position: [x, workshopCanopyY(x, -0.05) - 0.018, -0.05],
    })),
    ...([-1, 1] as const).map((side): GroupedMeshPart => ({
      // Continuous edge rails replace the floating ring/X lattice. They make
      // the canopy read as a pressure shell with thickness rather than a thin
      // sampled sheet and join visually to the curved glass cheeks.
      geometry: makeWorkshopCanopyEdgeGeometry(side, quality),
      material: materials.workshopBronze,
      position: [0, 0, 0],
    })),
    {
      geometry: new THREE.BoxGeometry(0.024, 0.012, 1.7),
      material: materials.workshopBronze,
      position: [0, workshopCanopyY(0, -0.05) - 0.018, -0.05],
    },
    {
      // Flush rotating service lift: large enough for a rover or engine pod,
      // but still one part of the retractable floor cassette.
      geometry: new THREE.CylinderGeometry(0.48, 0.48, 0.035, quality === 'high' ? 14 : 12),
      material: materials.frameLight,
      position: [0, -0.805, -0.45],
    },
    {
      geometry: new THREE.TorusGeometry(0.47, 0.025, 4, quality === 'high' ? 10 : 9),
      material: materials.warmWindow,
      position: [0, -0.78, -0.45],
      rotation: [Math.PI * 0.5, 0, 0],
    },
    ...([-1, 1] as const).map((side): GroupedMeshPart => ({
      geometry: new THREE.BoxGeometry(0.055, 0.035, 0.92),
      material: materials.power,
      position: [side * 0.78, -0.795, -0.42],
    })),
    ...([-1, 1] as const).map((side): GroupedMeshPart => ({
      // Two raised vehicle guidance rails now run through the visible floor
      // instead of six stripes hiding behind the camera horizon.
      geometry: new THREE.BoxGeometry(0.026, 0.012, 0.82),
      material: materials.workshopBronze,
      position: [side * 0.56, -0.705, -0.42],
    })),
    ...([-0.64, -0.38, -0.12, 0.14] as const).map((z): GroupedMeshPart => ({
      geometry: new THREE.BoxGeometry(1.16, 0.01, 0.022),
      material: materials.workshopBronze,
      position: [0, -0.707, z],
    })),
    // Starboard stays visibly empty as a true vehicle-scale service bay. Twin
    // trench rails, four magnetic clamps and a centre guidance strip describe
    // what can dock here without prematurely placing a rover in the scene.
    ...([0.62, 1.08] as const).map((x): GroupedMeshPart => ({
      geometry: new THREE.BoxGeometry(0.045, 0.018, 0.72),
      material: materials.workshopBronze,
      position: [x, -0.788, -0.42],
    })),
    ...([0.62, 1.08] as const).flatMap((x): GroupedMeshPart[] =>
      [-0.68, -0.16].map((z): GroupedMeshPart => ({
        geometry: new THREE.BoxGeometry(0.16, 0.035, 0.09),
        material: materials.power,
        position: [x, -0.765, z],
        rotation: [0, x < 0.8 ? 0.18 : -0.18, 0],
      })),
    ),
    {
      geometry: new THREE.BoxGeometry(0.035, 0.012, 0.76),
      material: materials.warmWindow,
      position: [0.85, -0.77, -0.42],
    },
    // Continuous bench and side cabinetry replace the previous row of
    // isolated office-like stations. The central service floor remains open.
    {
      geometry: makeRoundedExtrudeGeometry(3.02, 0.2, 0.2, 0.055, 1),
      material: materials.shellInset,
      position: [0, -0.69, -0.75],
    },
    {
      geometry: makeRoundedExtrudeGeometry(3.12, 0.3, 0.035, 0.065, 1),
      material: materials.workshopBronze,
      position: [0, -0.575, -0.72],
      rotation: [Math.PI * 0.5, 0, 0],
    },
      ...([-1, 1] as const).flatMap((side): GroupedMeshPart[] => [
      {
        // Carry the side cabinets to the front pressure threshold so yawed
        // views remain inside an authored room instead of exposing white hull
        // fragments beyond a short workbench.
        geometry: makeRoundedExtrudeGeometry(0.24, 1.62, 0.19, 0.055, 1),
        material: materials.shellInset,
        position: [side * 1.43, -0.69, -0.08],
        rotation: [0, Math.PI * 0.5, 0],
      },
      {
        geometry: new THREE.BoxGeometry(0.27, 0.035, 1.62),
        material: materials.workshopBronze,
        position: [side * 1.43, -0.575, -0.08],
      },
      {
        // The entire side is now one bowed pressure-glass surface. The canopy
        // and cabinet sill contain it; bronze mullions express its structure.
        geometry: makeWorkshopCurvedPressureCheekGeometry(side, quality),
        material: materials.glass,
        position: [0, 0, 0],
      },
      ...([-0.91, -0.33, 0.25, 0.83] as const).map((z): GroupedMeshPart => ({
        geometry: new THREE.BoxGeometry(0.035, 0.58, 0.035),
        material: materials.workshopBronze,
        position: [side * (1.56 - 0.12 * Math.max(0, 1 - ((z + 0.05) / 1) ** 2)), -0.49, z],
      })),
    ]),
    {
      // The fabrication deck is pressurised even while docked: the former
      // camera-side opening is now a single full-width panoramic smart-glass
      // boundary, bowed outward and socketed between the existing cheeks.
      geometry: makeWorkshopPanoramicFrontGlassGeometry(quality),
      material: workshopPanoramicGlass,
      position: [0, 0, 0],
    },
    {
      // Continuous load-bearing header: unlike the former zero-thickness line,
      // this member has a physical cross-section and follows both the glass
      // bow and the canopy crown.
      geometry: makeWorkshopPanoramicHeaderGeometry(quality),
      material: materials.workshopBronze,
      position: [0, 0, 0],
    },
    {
      // Physical sill: the glass disappears into this retractable structural
      // member instead of ending as an unsealed transparent plane.
      // The sill is viewed edge-on and gains its soft read from the bronze
      // material and bowed glass above; a 12-triangle solid bar preserves the
      // attachment while returning the rounded-extrude budget.
      geometry: new THREE.BoxGeometry(3.08, 0.11, 0.08),
      material: materials.workshopBronze,
      position: [0, -0.79, 0.94],
    },
    {
      // The machine wall now owns a real rear pressure boundary instead of
      // floating in front of the exterior void exposed by a camera turn.
      geometry: new THREE.BoxGeometry(3.14, 0.58, 0.055),
      material: materials.shellInset,
      position: [0, -0.45, -0.93],
    },
    ...([-0.66, -0.18, 0.3] as const).map((z): GroupedMeshPart => ({
      // These continuous pressure arches join the side glass to the bowed
      // canopy and replace the old transverse rectangular bars.
      geometry: makeWorkshopPressureArchGeometry(z, quality),
      material: materials.workshopBronze,
      position: [0, 0, 0],
    })),
    ...([-0.665, -0.33] as const).map((y, index): GroupedMeshPart => ({
      // Continuous fascia rails visually bind the drawer banks and diagnostic
      // modules into one engineered rear tool wall.
      geometry: new THREE.BoxGeometry(2.82, 0.024, 0.024),
      material: index === 0 ? materials.workshopBronze : materials.warmWindow,
      position: [0, y, -0.895],
    })),
    // One fixed ceiling gantry and a dense back-wall tool spine make the
    // industrial deck read as a deliberate engineering bay. These parts are
    // merged into the existing floor cassette, so the detail costs no extra
    // scene-graph meshes and retracts with the workshop.
    {
      geometry: new THREE.BoxGeometry(2.92, 0.045, 0.055),
      material: materials.frameLight,
      position: [0, -0.245, -0.82],
    },
    ...([-1, 1] as const).map((side): GroupedMeshPart => ({
      geometry: new THREE.BoxGeometry(0.05, 0.05, 0.72),
      material: materials.power,
      position: [side * 1.35, -0.255, -0.56],
    })),
    {
      // A travelling gantry carriage and folded hook make the ceiling rail
      // useful at vehicle scale rather than decorative workshop lighting.
      geometry: new THREE.BoxGeometry(0.34, 0.08, 0.14),
      material: materials.shellInset,
      position: [0.86, -0.255, -0.58],
    },
    {
      geometry: new THREE.BoxGeometry(0.04, 0.2, 0.04),
      material: materials.frameLight,
      position: [0.86, -0.39, -0.58],
    },
    {
      geometry: new THREE.BoxGeometry(0.12, 0.035, 0.08),
      material: materials.power,
      position: [0.86, -0.5, -0.58],
    },
    ...([-0.7, 0, 0.7] as const).flatMap((x, index): GroupedMeshPart[] => [
      {
        // Suspended machine umbilicals give the workshop a second equipment
        // layer above the benches while remaining part of one batched mesh.
        geometry: new THREE.BoxGeometry(0.035, 0.18, 0.035),
        material: materials.frameLight,
        position: [x, -0.49, -0.43],
      },
      {
        geometry: new THREE.BoxGeometry(0.18, 0.055, 0.11),
        material: index === 1 ? materials.warmWindow : materials.power,
        position: [x, -0.59, -0.43],
      },
    ]),
    ...[-1.25, -0.75, -0.25, 0.25, 0.75, 1.25].flatMap((x, index): GroupedMeshPart[] => [
      {
        geometry: makeRoundedExtrudeGeometry(0.42, 0.44, 0.055, 0.035, 1),
        material: materials.shellInset,
        position: [x, -0.47, -0.855],
      },
      {
        geometry: new THREE.BoxGeometry(0.23, 0.085, 0.014),
        material: index % 2 === 0 ? materials.power : materials.warmWindow,
        position: [x, -0.49, -0.865],
      },
    ]),
    ...[-1.25, -0.75, -0.25, 0.25, 0.75, 1.25].flatMap((x, column): GroupedMeshPart[] => [
      {
        // Staggered drawer banks fill the formerly blank lower machine wall.
        // They remain batched with the retractable deck rather than becoming
        // dozens of independent draw calls.
        geometry: new THREE.BoxGeometry(0.34, 0.052, 0.022),
        material: column % 2 === 0 ? materials.frameLight : materials.shellInset,
        position: [x, -0.62, -0.892],
      },
      {
        geometry: new THREE.BoxGeometry(0.34, 0.052, 0.022),
        material: column % 2 === 0 ? materials.shellInset : materials.frameLight,
        position: [x, -0.555, -0.892],
      },
      {
        geometry: new THREE.BoxGeometry(0.045, 0.12, 0.024),
        material: column % 3 === 0 ? materials.power : materials.workshopBronze,
        position: [x + 0.145, -0.585, -0.906],
      },
    ]),
    {
      // A transparent diagnostic volume establishes the central engineering
      // bay identity from across the room. It is intentionally shallow and
      // remains part of the existing retractable workshop batch.
      geometry: new THREE.BoxGeometry(0.48, 0.28, 0.012),
      material: materials.glass,
      position: [0.5, -0.45, -0.525],
    },
    {
      // A compact tri-drive booster gives the bay one unmistakable service
      // subject instead of leaving the articulated rigs working on empty air.
      geometry: new THREE.CylinderGeometry(0.115, 0.115, 0.5, quality === 'high' ? 10 : 8),
      material: materials.frameLight,
      position: [0, -0.69, -0.56],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new THREE.CylinderGeometry(0.052, 0.052, 0.54, 8),
      material: materials.power,
      position: [0, -0.69, -0.56],
      rotation: [0, 0, Math.PI / 2],
    },
    ...([-0.18, 0.18] as const).map((x): GroupedMeshPart => ({
      geometry: new THREE.TorusGeometry(0.13, 0.018, 3, quality === 'high' ? 10 : 8),
      material: materials.workshopBronze,
      position: [x, -0.69, -0.56],
      rotation: [0, Math.PI / 2, 0],
    })),
    ...([-0.27, 0.27] as const).map((x): GroupedMeshPart => ({
      geometry: new THREE.BoxGeometry(0.08, 0.08, 0.16),
      material: materials.shellInset,
      position: [x, -0.74, -0.56],
    })),
    ...([-1, 1] as const).flatMap((side): GroupedMeshPart[] => [
      {
        // A paired articulated service rig gives the rotary lift one hero
        // engineering operation instead of a collection of unrelated props.
        geometry: new THREE.BoxGeometry(0.14, 0.11, 0.14),
        material: materials.shellInset,
        position: [side * 0.31, -0.7, -0.56],
      },
      {
        geometry: new THREE.DodecahedronGeometry(0.055, 0),
        material: materials.power,
        position: [side * 0.31, -0.615, -0.56],
      },
      {
        geometry: new THREE.CylinderGeometry(0.03, 0.037, 0.18, 5),
        material: materials.frameLight,
        position: [side * 0.28, -0.515, -0.56],
        rotation: [0, 0, side * 0.28],
      },
      {
        geometry: new THREE.DodecahedronGeometry(0.045, 0),
        material: materials.workshopBronze,
        position: [side * 0.245, -0.425, -0.56],
      },
      {
        geometry: new THREE.CylinderGeometry(0.024, 0.031, 0.13, 5),
        material: materials.frameLight,
        position: [side * 0.195, -0.37, -0.56],
        rotation: [0, 0, side * 0.68],
      },
      {
        geometry: new THREE.BoxGeometry(0.11, 0.05, 0.09),
        material: side < 0 ? materials.warmWindow : materials.power,
        position: [side * 0.135, -0.325, -0.56],
      },
      {
        geometry: new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.31, -0.6, -0.535),
            new THREE.Vector3(side * 0.27, -0.5, -0.52),
            new THREE.Vector3(side * 0.19, -0.37, -0.535),
            new THREE.Vector3(side * 0.13, -0.325, -0.56),
          ]),
          3,
          0.009,
          3,
          false,
        ),
        material: side < 0 ? materials.warmWindow : materials.power,
        position: [0, 0, 0],
      },
      ...([-1, 1] as const).map((jaw): GroupedMeshPart => ({
        geometry: new THREE.BoxGeometry(0.02, 0.065, 0.024),
        material: materials.frameLight,
        position: [side * 0.085, -0.29, -0.56 + jaw * 0.034],
        rotation: [jaw * 0.22, 0, side * 0.28],
      })),
    ]),
  ];
  addGroupedMesh(
    fabricationDeck,
    'RETRACTABLE_FABRICATION_GARAGE_DECK',
    fabricationFloorParts,
  );
  const panoramicFrameMaterial = new THREE.LineBasicMaterial({
    color: '#b89462',
    transparent: true,
    opacity: 0.72,
    toneMapped: true,
  });
  const panoramicFrame = new THREE.LineSegments(
    makeWorkshopPanoramicFrameGeometry(),
    panoramicFrameMaterial,
  );
  panoramicFrame.name = 'FABRICATION_PANORAMIC_GLASS_SPARSE_LOAD_FRAME';
  fabricationDeck.add(panoramicFrame);
  const fabricationModuleDefinitions: Array<{
    position: [number, number, number];
    scale: [number, number, number];
    rotation: [number, number, number];
  }> = [];
  for (const x of [-1.16, -0.72, -0.28, 0.28, 0.72, 1.16]) {
    fabricationModuleDefinitions.push({
      position: [x, -0.61, -0.68],
      scale: [x === -0.28 || x === 0.28 ? 1.35 : 1.05, 0.9, 0.86],
      rotation: [0, x * -0.07, 0],
    });
  }
  for (const side of [-1, 1] as const) {
    for (const z of [-0.34, 0.02]) {
      fabricationModuleDefinitions.push({
        position: [side * 1.24, -0.62, z],
        scale: [1, 0.82, 0.9],
        rotation: [0, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0],
      });
    }
  }
  // A compact second equipment tier turns the rear bench into a continuous
  // machine wall. Reuse the articulated workstation assembly so this adds
  // diagnostic arms and tool heads without another mesh or material.
  for (const x of [-1.04, -0.52, 0, 0.52, 1.04]) {
    fabricationModuleDefinitions.push({
      position: [x, -0.47, -0.79],
      scale: [0.82, 0.54, 0.62],
      rotation: [0, x * -0.055, 0],
    });
  }
  const fabricationModuleParts: GroupedMeshPart[] = [
    {
      // A recessed cabinet replaces the cone/stool plinth that dominated the
      // last comparison. Rectangular industrial modules also return enough
      // triangles to fund the denser tool anatomy below.
      geometry: new THREE.BoxGeometry(0.27, 0.12, 0.18),
      material: materials.shellInset,
      position: [0, -0.04, 0],
    },
    {
      geometry: new THREE.BoxGeometry(0.3, 0.026, 0.205),
      material: materials.workshopBronze,
      position: [0, 0.035, 0],
    },
    {
      geometry: makeRoundedExtrudeGeometry(0.28, 0.22, 0.028, 0.045, 1),
      material: materials.frameLight,
      position: [0, 0.155, -0.105],
    },
    {
      geometry: new THREE.BoxGeometry(0.145, 0.085, 0.014),
      material: materials.power,
      position: [-0.045, 0.175, -0.124],
    },
    {
      geometry: new THREE.BoxGeometry(0.09, 0.018, 0.11),
      material: materials.warmWindow,
      position: [0.09, 0.065, 0.02],
      rotation: [0, -0.2, 0],
    },
    {
      // Compact folded rectangular links replace the repeated diagonal rods.
      // The arm now parks against the tool wall and opens the vehicle aisle.
      geometry: new THREE.BoxGeometry(0.045, 0.145, 0.045),
      material: materials.frameLight,
      position: [-0.08, 0.105, 0.015],
      rotation: [0, 0, -0.92],
    },
    {
      geometry: new THREE.BoxGeometry(0.04, 0.105, 0.04),
      material: materials.frameLight,
      position: [-0.145, 0.19, 0.015],
      rotation: [0, 0, 0.96],
    },
    {
      geometry: new THREE.DodecahedronGeometry(0.032, 0),
      material: materials.power,
      position: [-0.1, 0.245, 0.015],
    },
    {
      geometry: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.08, 0.055, 0.045),
          new THREE.Vector3(-0.15, 0.135, 0.055),
          new THREE.Vector3(-0.1, 0.24, 0.025),
        ]),
        3,
        0.007,
        3,
        false,
      ),
      material: materials.power,
      position: [0, 0, 0],
    },
    {
      // A narrow lit tool shelf visually joins adjacent instances into one
      // continuous service wall instead of a row of unrelated stations.
      geometry: new THREE.BoxGeometry(0.29, 0.018, 0.04),
      material: materials.warmWindow,
      position: [0, 0.265, -0.115],
    },
    {
      geometry: new THREE.BoxGeometry(0.025, 0.2, 0.025),
      material: materials.workshopBronze,
      position: [0.115, 0.17, -0.09],
    },
  ];
  const fabricationModules = new THREE.InstancedMesh(
    makeGroupedGeometry(fabricationModuleParts),
    fabricationModuleParts.map((part) => part.material),
    fabricationModuleDefinitions.length,
  );
  fabricationModules.name = 'fabrication-machine-and-workbench-instances';
  fabricationModules.userData.program = {
    modules: fabricationModuleDefinitions.length,
    equipment: ['curved-machine-bench', 'tool-wall', 'diagnostic-screen', 'robot-service-cradle', 'articulated-robot-service-cradle', 'tri-drive-booster-service-subject'],
    centralLift: 'RETRACTABLE_FABRICATION_GARAGE_DECK',
    vehicleBay: 'empty-starboard-rover-service-bay',
    vehicleHandling: ['magnetic-wheel-clamps', 'twin-service-trenches', 'travelling-gantry-hook'],
  };
  fabricationModuleDefinitions.forEach((definition, index) => {
    interiorQuaternion.setFromEuler(new THREE.Euler(...definition.rotation));
    interiorMatrix.compose(
      new THREE.Vector3(...definition.position),
      interiorQuaternion,
      new THREE.Vector3(...definition.scale),
    );
    fabricationModules.setMatrixAt(index, interiorMatrix);
  });
  fabricationModules.instanceMatrix.needsUpdate = true;
  fabricationModules.castShadow = true;
  fabricationDeck.add(fabricationModules);

  const creatureHabitatDeck = new THREE.Group();
  creatureHabitatDeck.name = 'DECK_01_PREMIUM_CREATURE_HABITAT';
  creatureHabitatDeck.position.y = -0.52;
  creatureHabitatDeck.userData.program = {
    level: 1,
    role: 'multispecies-premium-sanctuary-commons',
    amenities: ['soft-nests', 'social-coves', 'warm-bathing', 'garden-overlook', 'climbing-perches', 'thermal-stones', 'burrow-dens', 'open-foraging-floor'],
    habitatZones: ['amphibious-bathing-rill', 'moss-burrow-den', 'warm-sunning-stones', 'elevated-perch-grove', 'quiet-soft-nest-coves', 'open-social-foraging-floor'],
    residenceScaleClasses: ['small-nest', 'medium-cove', 'large-family-den'],
    noCreaturesAuthoredYet: true,
    dedicatedFullWidthDeck: true,
    separatedFromWorkshop: true,
  };
  inhabitedDeckProgram.add(creatureHabitatDeck);
  const creatureComfortDefinitions: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }> = [];
  for (const side of [-1, 1] as const) {
    for (const [index, z] of [-0.72, -0.34, 0.04].entries()) {
      creatureComfortDefinitions.push({
        position: [side * (1.18 + index * 0.08), -0.3 + index * 0.035, z],
        rotation: [0, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side * 0.04],
        scale: [1.22 - index * 0.08, 0.76, 1],
      });
    }
  }
  // Keep the rear centre transparent. Creature residences occupy the protected
  // corner bays rather than forming a low wall across the panoramic glazing.
  for (const x of [-0.92, 0.92]) {
    creatureComfortDefinitions.push({
      position: [x, -0.27, -0.86],
      rotation: [0, 0, 0],
      scale: [1.15, 0.72, 1],
    });
  }
  // A second, deliberately non-uniform residence scale gives future small,
  // social and larger creatures plausible homes without adding occupants yet.
  for (const side of [-1, 1] as const) {
    creatureComfortDefinitions.push(
      {
        position: [side * 0.92, -0.31, 0.18],
        rotation: [0, side < 0 ? 0.3 : -0.3, 0],
        scale: [0.72, 0.58, 0.72],
      },
      {
        position: [side * 1.32, -0.26, -0.55],
        rotation: [0, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0],
        scale: [1.48, 0.86, 1.22],
      },
    );
  }
  // Low social nests occupy the otherwise empty near commons while a pair of
  // smaller perch coves establishes a second vertical habitat band. They are
  // deliberately unoccupied until creature assets are authored.
  for (const [index, x] of [-0.72, -0.24, 0.28, 0.78].entries()) {
    creatureComfortDefinitions.push({
      position: [x, -0.32, 0.12 + (index % 2) * 0.06],
      rotation: [0, index % 2 === 0 ? 0.18 : -0.18, 0],
      scale: [0.58, 0.52, 0.62],
    });
  }
  for (const side of [-1, 1] as const) {
    creatureComfortDefinitions.push({
      position: [side * 0.52, -0.18, -0.76],
      rotation: [0, side * -0.16, 0],
      scale: [0.52, 0.48, 0.54],
    });
  }
  const creaturePodParts: GroupedMeshPart[] = [
    {
      geometry: new THREE.SphereGeometry(0.12, quality === 'high' ? 8 : 6, quality === 'high' ? 4 : 3),
      // Moss-green upholstery separates the soft nests from the warm metal
      // guidance lights and dark pressure structure at a glance.
      material: materials.habitatFabric,
      position: [0, 0.01, 0.015],
      scale: [1.35, 0.48, 1],
    },
    {
      // A half-ring privacy cove wraps the nest instead of presenting another
      // rectangular office-like backrest.
      geometry: new THREE.TorusGeometry(0.14, 0.022, 3, quality === 'high' ? 8 : 6, Math.PI),
      material: materials.frameLight,
      position: [0, 0.035, -0.09],
    },
    {
      geometry: new THREE.CylinderGeometry(0.032, 0.038, 0.025, 6),
      material: materials.water,
      position: [0.15, 0.025, 0.04],
    },
    {
      geometry: new THREE.DodecahedronGeometry(0.045, 0),
      material: materials.foliage,
      position: [-0.14, 0.07, -0.06],
      scale: [1.2, 1, 0.9],
    },
  ];
  const creatureComfortPods = new THREE.InstancedMesh(
    makeGroupedGeometry(creaturePodParts),
    creaturePodParts.map((part) => part.material),
    creatureComfortDefinitions.length,
  );
  creatureComfortPods.name = 'premium-creature-comfort-pod-instances';
  creatureComfortPods.userData.program = {
    pods: creatureComfortDefinitions.length,
    amenities: ['soft-nest', 'curved-privacy-cove', 'water-bowl', 'living-plant'],
    residenceScaleClasses: ['small-nest', 'medium-cove', 'large-family-den'],
    occupantsPresent: false,
  };
  creatureComfortDefinitions.forEach((definition, index) => {
    interiorMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...definition.rotation)),
      new THREE.Vector3(...definition.scale),
    );
    creatureComfortPods.setMatrixAt(index, interiorMatrix);
  });
  creatureComfortPods.instanceMatrix.needsUpdate = true;
  creatureHabitatDeck.add(creatureComfortPods);

  const creatureBathingStream = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, -0.385, -0.02),
    new THREE.Vector3(-0.28, -0.378, -0.22),
    new THREE.Vector3(0.08, -0.382, -0.38),
    new THREE.Vector3(0.56, -0.385, -0.58),
  ]);
  const creatureHabitatLandscape = addGroupedMesh(
    creatureHabitatDeck,
    'CREATURE_GREEN_BATHING_STREAM_AND_COVE',
    [
      {
        // The habitat owns a warm wood-toned pressure floor. Previously the
        // inspection camera borrowed the lowest apartment slab, which made the
        // room read as a beige interstitial ledge instead of a finished home.
        geometry: new THREE.BoxGeometry(3.18, 0.035, 1.55),
        material: materials.habitatFloor,
        position: [0, -0.4, -0.2],
      },
      // Low continuous planted banks make the sanctuary read as terrain
      // rather than loose props sitting on a featureless rectangular floor.
      ...([-1, 1] as const).map((side): GroupedMeshPart => ({
        geometry: new THREE.SphereGeometry(0.24, quality === 'high' ? 7 : 6, 3),
        material: side < 0 ? materials.foliage : materials.foliageLight,
        position: [side * 1.18, -0.34, -0.34],
        scale: [1.52, 0.46, 2.18],
      })),
      {
        geometry: makeRoundedExtrudeGeometry(2.18, 0.22, 0.12, 0.08, 1),
        material: materials.foliage,
        position: [0, -0.34, -0.79],
      },
      ...([
        [-1.3, -0.27, 0.05, 1.25, 0.72, 0.95],
        [-0.68, -0.3, 0.16, 0.72, 0.62, 0.74],
        [-0.28, -0.31, -0.72, 0.78, 0.7, 0.8],
        [0.68, -0.29, 0.12, 0.78, 0.64, 0.82],
        [1.3, -0.27, 0.03, 1.18, 0.74, 0.92],
      ] as const).map(([x, y, z, sx, sy, sz], index): GroupedMeshPart => ({
        geometry: new THREE.DodecahedronGeometry(0.065, 0),
        material: index % 3 === 0 ? materials.foliageLight : materials.foliage,
        position: [x, y, z],
        scale: [sx, sy, sz],
        rotation: [0, index * 0.37, index % 2 === 0 ? 0.08 : -0.08],
      })),
      ...([
        [-1.28, -0.26, -0.72, 1.15],
        [-0.88, -0.245, -0.76, 0.86],
        [-0.44, -0.255, -0.73, 1.05],
        [0, -0.235, -0.77, 0.78],
        [0.44, -0.25, -0.73, 1.12],
        [0.88, -0.24, -0.76, 0.9],
        [1.28, -0.255, -0.72, 1.08],
      ] as const).map(([x, y, z, scale], index): GroupedMeshPart => ({
        // An irregular planted ridge breaks the former straight green wall
        // and creates a layered habitat horizon behind the bathing pools.
        geometry: new THREE.DodecahedronGeometry(0.075, 0),
        material: index % 3 === 0 ? materials.foliageLight : materials.foliage,
        position: [x, y, z],
        scale: [scale * 1.35, scale, scale * 0.9],
        rotation: [0, index * 0.43, index % 2 === 0 ? 0.12 : -0.08],
      })),
      {
        // A dedicated pressure ceiling prevents the creature deck from
        // reading as an open basement beneath the apartment galleries when
        // the Zen commons is sectioned for the inspection camera.
        geometry: makeRoundedExtrudeGeometry(3.2, 1.55, 0.05, 0.2, 1),
        material: materials.habitatFloor,
        position: [0, 0.05, -0.2],
        rotation: [Math.PI * 0.5, 0, 0],
      },
      ...([-0.82, 0, 0.82] as const).map((x, index): GroupedMeshPart => ({
        // Warm/cyan cove islands replace the single broad ceiling hotspot and
        // identify the bathing, commons and den zones from a standing POV.
        geometry: new THREE.BoxGeometry(0.46, 0.018, 0.3),
        material: index === 1 ? materials.power : materials.warmWindow,
        position: [x, 0.025, -0.16],
      })),
      {
        geometry: new THREE.BoxGeometry(2.62, 0.018, 0.032),
        material: materials.warmWindow,
        position: [0, 0.018, 0.12],
      },
      {
        // Panoramic pressure glass keeps the habitat physically contained
        // while preserving its overlook toward the one central Zen garden.
        geometry: new THREE.BoxGeometry(3.02, 0.55, 0.025),
        material: materials.glass,
        position: [0, -0.315, -0.94],
      },
      ...([-1, 1] as const).map((side): GroupedMeshPart => ({
        geometry: new THREE.BoxGeometry(0.04, 0.5, 0.05),
        material: materials.frameLight,
        position: [side * 1.48, -0.315, -0.925],
      })),
      ...([-1, 1] as const).map((side): GroupedMeshPart => ({
        // Side pressure walls complete the habitat room when the resident
        // turns away from its panoramic garden window.
        geometry: new THREE.BoxGeometry(0.05, 0.68, 1.62),
        material: materials.frameLight,
        position: [side * 1.57, -0.27, -0.18],
      })),
      {
        geometry: new THREE.TubeGeometry(creatureBathingStream, quality === 'high' ? 10 : 7, 0.065, 3, false),
        material: materials.water,
      },
      {
        // A broad, shallow bathing basin makes the water habitat legible from
        // inside the room; the narrow rill above now reads as its feeder.
        geometry: new THREE.CylinderGeometry(0.34, 0.38, 0.018, quality === 'high' ? 9 : 7),
        material: materials.water,
        position: [-0.16, -0.37, -0.4],
        scale: [1.42, 1, 0.78],
      },
      {
        geometry: new THREE.CylinderGeometry(0.24, 0.27, 0.016, 6),
        material: materials.water,
        position: [-0.69, -0.372, -0.2],
        scale: [1.25, 1, 0.7],
      },
      {
        geometry: new THREE.CylinderGeometry(0.2, 0.23, 0.016, 6),
        material: materials.water,
        position: [0.46, -0.372, -0.6],
        scale: [1.35, 1, 0.72],
      },
      {
        geometry: new THREE.TorusGeometry(0.48, 0.075, 3, quality === 'high' ? 8 : 6, Math.PI * 0.82),
        material: materials.habitatFabric,
        position: [0.02, -0.37, -0.53],
        rotation: [Math.PI * 0.5, 0, 0],
      },
      // Distinct multispecies zones share one batched landscape mesh: a low
      // moss burrow, warm sunning stones, a shallow access ramp, and an
      // elevated perch grove. Their silhouettes remain empty until creature
      // assets exist, so this pass establishes ecology rather than decoration.
      {
        geometry: new THREE.TorusGeometry(0.16, 0.035, 3, quality === 'high' ? 7 : 5, Math.PI),
        material: materials.bark,
        position: [-0.82, -0.34, -0.56],
        rotation: [0, 0, Math.PI],
        scale: [1.25, 0.82, 1],
      },
      {
        geometry: new THREE.BoxGeometry(0.34, 0.025, 0.2),
        material: materials.foliage,
        position: [-0.82, -0.37, -0.56],
        rotation: [0, -0.18, 0],
      },
      ...[
        [0.74, -0.352, -0.24, 1.3],
        [0.94, -0.35, -0.34, 0.92],
        [0.86, -0.346, -0.08, 0.72],
      ].map(([x, y, z, scale]): GroupedMeshPart => ({
        geometry: new THREE.DodecahedronGeometry(0.07, 0),
        material: materials.bark,
        position: [x, y, z],
        scale: [scale * 1.35, scale * 0.58, scale],
      })),
      {
        geometry: new THREE.BoxGeometry(0.18, 0.025, 0.34),
        material: materials.bark,
        position: [0.36, -0.357, -0.42],
        rotation: [0, -0.46, 0.1],
      },
      ...([
        [-0.58, -0.31, -0.18, 0.38, -0.16],
        [-0.25, -0.285, -0.31, 0.34, 0.22],
        [0.05, -0.29, -0.43, 0.32, -0.12],
        [0.33, -0.315, -0.54, 0.3, 0.18],
      ] as const).map(([x, y, z, length, angle]): GroupedMeshPart => ({
        // A segmented living-root bridge crosses the pool system and creates
        // a usable multispecies route with a softer, overlapping silhouette.
        geometry: new THREE.BoxGeometry(length, 0.055, 0.09),
        material: materials.bark,
        position: [x, y, z],
        rotation: [0, angle, x * 0.08],
      })),
      ...([
        [-0.93, -0.27, -0.16, -0.12],
        [-0.82, -0.26, -0.08, 0.08],
        [-0.7, -0.275, -0.12, -0.04],
        [0.66, -0.27, -0.5, 0.1],
        [0.78, -0.255, -0.56, -0.08],
        [0.9, -0.27, -0.48, 0.04],
      ] as const).map(([x, y, z, tilt]): GroupedMeshPart => ({
        geometry: new THREE.PlaneGeometry(0.035, 0.2),
        material: materials.foliageLight,
        position: [x, y, z],
        rotation: [0, x * 0.42, tilt],
      })),
      ...([-1, 1] as const).map((side): GroupedMeshPart => ({
        // Low upholstered resting islands make the sanctuary feel inhabited
        // without introducing creatures before their own authored pass.
        geometry: new THREE.DodecahedronGeometry(0.085, 0),
        material: materials.habitatFabric,
        position: [side * 0.98, -0.335, 0.03],
        scale: [1.7, 0.45, 1.15],
        rotation: [0, side * 0.28, 0],
      })),
      {
        geometry: new THREE.BoxGeometry(0.045, 0.36, 0.045),
        material: materials.bark,
        position: [0.98, -0.2, -0.68],
        rotation: [0, 0, -0.18],
      },
      {
        geometry: new THREE.BoxGeometry(0.42, 0.035, 0.16),
        material: materials.bark,
        position: [0.92, -0.05, -0.67],
        rotation: [0, 0.12, 0],
      },
      {
        geometry: new THREE.BoxGeometry(0.32, 0.03, 0.12),
        material: materials.bark,
        position: [1.08, 0.04, -0.63],
        rotation: [0.1, -0.24, 0.12],
      },
      ...[
        [-0.58, -0.345, -0.06, 1.15],
        [-0.2, -0.342, -0.3, 0.92],
        [0.48, -0.345, -0.56, 1.08],
        [0.12, -0.344, -0.68, 0.86],
        [0.66, -0.343, -0.3, 0.82],
      ].map(([x, y, z, scale]): GroupedMeshPart => ({
        geometry: new THREE.DodecahedronGeometry(0.055, 0),
        material: materials.foliage,
        position: [x, y, z],
        scale: [scale, scale * 1.12, scale],
      })),
    ],
  );
  creatureHabitatLandscape.userData.program = {
    role: 'multispecies-green-sanctuary-and-curved-social-cove',
    fixedInsidePressureDeck: true,
    pressureCeiling: 'integrated-warm-lit-ceiling-cassette',
    panoramicGardenGlass: true,
    relation: 'overlooks-one-true-zen-garden-without-duplicating-it',
    habitatZones: ['amphibious-bathing-rill', 'moss-burrow-den', 'warm-sunning-stones', 'elevated-perch-grove', 'quiet-soft-nest-coves', 'open-social-foraging-floor'],
    accessPrinciple: 'low-gradient-water-entry-and-unobstructed-mixed-size-circulation',
    occupantsPresent: false,
  };

  const mixedUseRing = new THREE.Group();
  mixedUseRing.name = 'DECK_03_MIXED_USE_RESIDENTIAL_RING';
  mixedUseRing.userData.program = {
    level: 3,
    apartments: 'many',
    storeys: atriumDeckLevels.length,
    moduleScale: 0.72,
    residentialCapacityClass: 'hundreds-of-compact-suites',
    amenities: ['panoramic-restaurant', 'cinema', 'gym', 'wellness', 'chill-zone', 'stores', 'tea-room', 'community-lounges'],
  };
  inhabitedDeckProgram.add(mixedUseRing);
  const facilityZoneDefinitions = [
    {name: 'RESIDENTIAL_APARTMENT_CLUSTER_PORT', position: [-1.7, -0.39, -0.35], capacity: 96},
    {name: 'RESIDENTIAL_APARTMENT_CLUSTER_STARBOARD', position: [1.7, -0.05, -0.35], capacity: 96},
    {name: 'MARKET_STORES_AND_TEA_GALLERY', position: [-1.72, 0.29, 0.46], capacity: 64},
    {name: 'FAMILY_AND_COMMUNITY_LOUNGE', position: [1.72, 0.29, 0.38], capacity: 72},
    {name: 'CINEMA_AND_MEDIA_LOUNGE', position: [1.72, 0.63, -0.24], capacity: 54},
    {name: 'LIBRARY_LEARNING_AND_REFLECTION', position: [-1.72, 0.63, -0.22], capacity: 68},
    {name: 'GYM_WELLNESS_AND_RECOVERY', position: [1.72, 0.97, 0.38], capacity: 48},
    {name: 'MEDICAL_AND_RECOVERY_SUITE', position: [-1.72, 0.97, 0.32], capacity: 36},
    {name: 'PANORAMIC_RESTAURANT_AND_KITCHEN', position: [-1.72, 1.31, 0.2], capacity: 112},
  ] as const;
  facilityZoneDefinitions.forEach((definition) => {
    const zone = new THREE.Group();
    zone.name = definition.name;
    zone.position.set(definition.position[0], definition.position[1], definition.position[2]);
    zone.userData.program = {capacity: definition.capacity, status: 'spatial-zone-established'};
    mixedUseRing.add(zone);
  });
  const amenityDefinitions: Array<{
    position: [number, number, number];
    rotationY: number;
    scale: [number, number, number];
    color: string;
  }> = [];
  const amenityColors = ['#ff9c56', '#ffd28e', '#8dd9e8', '#b59be8', '#f0bf72'];
  for (const [levelIndex, deckY] of atriumDeckLevels.entries()) {
    const y = deckY + 0.13;
    const rearAmenityXs = [-1.52, -1.18, 1.18, 1.52];
    for (const [index, x] of rearAmenityXs.entries()) {
      amenityDefinitions.push({
        position: [x, y, -0.94],
        rotationY: 0,
        scale: [index % 3 === 0 ? 0.88 : 0.72, 0.68, 0.86],
        color: amenityColors[(index + levelIndex * 2) % amenityColors.length],
      });
    }
    for (const side of [-1, 1] as const) {
      for (const [index, z] of [-0.56, -0.28, 0, 0.28, 0.56].entries()) {
        amenityDefinitions.push({
          position: [side * 1.7, y, z],
          rotationY: side * Math.PI * 0.5,
          scale: [index === 2 ? 0.9 : 0.72, 0.68, 0.86],
          color: amenityColors[(index + (side > 0 ? 2 : 0) + levelIndex) % amenityColors.length],
        });
      }
    }
  }
  const amenityWindows = new THREE.InstancedMesh(
    makeInhabitedAmenityFrontageGeometry(),
    materials.warmWindow,
    amenityDefinitions.length,
  );
  amenityWindows.name = 'apartment-cinema-gym-store-chill-suite-instances';
  amenityDefinitions.forEach((definition, index) => {
    interiorMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, definition.rotationY, 0)),
      new THREE.Vector3(...definition.scale),
    );
    amenityWindows.setMatrixAt(index, interiorMatrix);
    amenityWindows.setColorAt(index, new THREE.Color(definition.color));
  });
  amenityWindows.instanceMatrix.needsUpdate = true;
  if (amenityWindows.instanceColor) amenityWindows.instanceColor.needsUpdate = true;
  amenityWindows.userData.programZones = facilityZoneDefinitions.map(definition => definition.name);
  amenityWindows.userData.furnishing = 'window-table-two-seats-and-warm-cornice';
  amenityWindows.userData.storeys = atriumDeckLevels.length;
  amenityWindows.userData.compactModuleScale = 0.72;
  amenityWindows.userData.visibleSuiteFrontages = amenityDefinitions.length;
  mixedUseRing.add(amenityWindows);

  const crownProgram = new THREE.Group();
  crownProgram.name = 'CROWN_COMMAND_AND_ADMINISTRATION';
  crownProgram.userData.program = {
    shoulderFrontBays: 'two-three-floor-steering-houses',
    shoulderRearBays: 'two-three-floor-administration-offices',
  };
  inhabitedDeckProgram.add(crownProgram);
  const commandSuitePracticalLights = new THREE.Group();
  commandSuitePracticalLights.name = 'COMMAND_AND_ADMINISTRATION_PRACTICAL_LIGHTS';
  for (const x of [-3.05, 3.05]) {
    for (const z of [-1, 1]) {
      const practical = new THREE.PointLight('#ffbd82', quality === 'high' ? 2.2 : 1.7, 2.85, 1.38);
      practical.position.set(x, 1.62, z - Math.sign(z) * 0.08);
      commandSuitePracticalLights.add(practical);
    }
  }
  crownProgram.add(commandSuitePracticalLights);
  const commandSuiteGeometries = makeCommandSuiteAssemblyGeometries(quality);
  const steeringFurniture = makeCommandSuiteFurnitureGeometries('steering');
  const administrationFurniture = makeCommandSuiteFurnitureGeometries('administration');
  const frontSuiteMatrix = new THREE.Matrix4().makeTranslation(0, 0, 1);
  const rearSuiteMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0, -1),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  const makePairedFurnitureLayer = (
    steeringDetail: THREE.BufferGeometry,
    administrationDetail: THREE.BufferGeometry,
  ) => {
    const sources = [
      steeringDetail.clone().applyMatrix4(frontSuiteMatrix),
      administrationDetail.clone().applyMatrix4(rearSuiteMatrix),
    ];
    const merged = mergeGeometries(sources, false);
    sources.forEach(geometry => geometry.dispose());
    if (!merged) throw new Error('Unable to merge paired command-suite furniture layer');
    merged.computeVertexNormals();
    return merged;
  };
  const commandSuiteParts = [
    commandSuiteGeometries.shell,
    commandSuiteGeometries.glass,
    commandSuiteGeometries.frame,
    commandSuiteGeometries.power,
    commandSuiteGeometries.warm,
  ];
  const commandSuiteGeometry = mergeGeometries(commandSuiteParts, true);
  if (!commandSuiteGeometry) throw new Error('Unable to merge grouped command-suite geometry');
  commandSuiteParts.forEach(geometry => geometry.dispose());
  const commandSuiteShellMaterial = materials.shell.clone();
  commandSuiteShellMaterial.color.set('#d8c7ad');
  commandSuiteShellMaterial.roughness = 0.34;
  commandSuiteShellMaterial.metalness = 0.08;
  commandSuiteShellMaterial.emissive.set('#271a10');
  commandSuiteShellMaterial.emissiveIntensity = 0.28;
  commandSuiteShellMaterial.side = THREE.DoubleSide;
  const commandSuiteGlassMaterial = materials.glass.clone();
  commandSuiteGlassMaterial.color.set('#9bd4d9');
  commandSuiteGlassMaterial.roughness = 0.09;
  commandSuiteGlassMaterial.transmission = 0.9;
  commandSuiteGlassMaterial.opacity = 0.18;
  commandSuiteGlassMaterial.thickness = 0.08;
  commandSuiteGlassMaterial.envMapIntensity = 0.5;
  const commandSuiteFrameMaterial = materials.frameLight.clone();
  commandSuiteFrameMaterial.color.set('#4b4540');
  commandSuiteFrameMaterial.metalness = 0.4;
  commandSuiteFrameMaterial.roughness = 0.44;
  commandSuiteFrameMaterial.side = THREE.DoubleSide;
  const commandSuiteMaterials = [
    commandSuiteShellMaterial,
    commandSuiteGlassMaterial,
    commandSuiteFrameMaterial,
    materials.power,
    materials.warmWindow,
  ];
  const commandSuiteInstances = [
    {position: new THREE.Vector3(-3.05, 1.28, 1), yaw: 0},
    {position: new THREE.Vector3(3.05, 1.28, 1), yaw: 0},
    {position: new THREE.Vector3(-3.05, 1.28, -1), yaw: Math.PI},
    {position: new THREE.Vector3(3.05, 1.28, -1), yaw: Math.PI},
  ];
  const crownRooms = new THREE.InstancedMesh(commandSuiteGeometry, commandSuiteMaterials, commandSuiteInstances.length);
  crownRooms.name = 'SEALED_THREE_LEVEL_STEERING_AND_ADMINISTRATION_SUITES';
  const commandSuiteMatrix = new THREE.Matrix4();
  commandSuiteInstances.forEach((suite, index) => {
    commandSuiteMatrix.compose(
      suite.position,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, suite.yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    crownRooms.setMatrixAt(index, commandSuiteMatrix);
  });
  crownRooms.instanceMatrix.needsUpdate = true;
  crownRooms.castShadow = true;
  crownRooms.receiveShadow = true;
  crownProgram.add(crownRooms);
  crownRooms.userData.program = {
    steering: 'two-forward-sealed-three-level-panoramic-command-suites',
    administration: 'two-rear-sealed-three-level-panoramic-office-suites',
    interior: ['mega-yacht-shells', 'helm-consoles', 'holographic-displays', 'warm-ceiling-strips'],
  };
  const commandFurnitureParts = [
    makePairedFurnitureLayer(steeringFurniture.frame, administrationFurniture.frame),
    makePairedFurnitureLayer(steeringFurniture.power, administrationFurniture.power),
    makePairedFurnitureLayer(steeringFurniture.warm, administrationFurniture.warm),
  ];
  const commandFurnitureGeometry = mergeGeometries(commandFurnitureParts, true);
  if (!commandFurnitureGeometry) throw new Error('Unable to merge grouped command-suite furniture geometry');
  commandFurnitureParts.forEach(geometry => geometry.dispose());
  Object.values(steeringFurniture).forEach(geometry => geometry.dispose());
  Object.values(administrationFurniture).forEach(geometry => geometry.dispose());
  const commandInteriorMaterial = materials.frameLight.clone();
  commandInteriorMaterial.color.set('#7a6654');
  commandInteriorMaterial.metalness = 0.24;
  commandInteriorMaterial.roughness = 0.42;
  commandInteriorMaterial.emissive.set('#2f1b0f');
  commandInteriorMaterial.emissiveIntensity = 0.32;
  const commandHologramMaterial = new THREE.MeshBasicMaterial({
    color: '#007fae',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const commandFurniture = new THREE.InstancedMesh(
    commandFurnitureGeometry,
    [commandInteriorMaterial, commandHologramMaterial, materials.warmWindow],
    2,
  );
  commandFurniture.name = 'DISTINCT_STEERING_AND_ADMINISTRATION_INTERIORS';
  for (const [index, x] of [-3.05, 3.05].entries()) {
    commandSuiteMatrix.makeTranslation(x, 1.28, 0);
    commandFurniture.setMatrixAt(index, commandSuiteMatrix);
  }
  commandFurniture.instanceMatrix.needsUpdate = true;
  commandFurniture.castShadow = true;
  commandFurniture.receiveShadow = true;
  commandFurniture.userData.program = {
    forward: 'paired-helm-seats-and-holographic-command-table',
    aft: 'strategy-table-archive-wall-and-planning-displays',
  };
  crownProgram.add(commandFurniture);

  // The old interior used closed boxes just behind the front glazing. These
  // portal frames sit around a two-unit-deep atrium instead, with their warm
  // back walls offset into the perimeter so the room openings have real depth.
  const roomPortalDefinitions: Array<{
    position: [number, number, number];
    rotationY: number;
    backPosition: [number, number, number];
  }> = [];
  for (const deckY of atriumDeckLevels) {
    const portalY = deckY + 0.13;
    const rearPortalXs = [-1.72, -1.38, -1.04, 1.04, 1.38, 1.72];
    for (const x of rearPortalXs) {
      roomPortalDefinitions.push({
        position: [x, portalY, -0.76],
        rotationY: 0,
        backPosition: [x, portalY, -1.055],
      });
    }
    for (const side of [-1, 1] as const) {
      for (const z of [-0.64, -0.38, -0.12, 0.14, 0.4, 0.66]) {
        roomPortalDefinitions.push({
          position: [side * 1.58, portalY, z],
          rotationY: side * Math.PI * 0.5,
          backPosition: [side * 2.035, portalY, z],
        });
      }
    }
  }
  const roomPortals = new THREE.InstancedMesh(
    makeRoomPortalFrameGeometry(0.42, 0.25, 0.055),
    materials.frameLight,
    roomPortalDefinitions.length,
  );
  roomPortals.name = 'interior-open-room-portal-frame-instances';
  roomPortals.userData.program = {
    storeys: atriumDeckLevels.length,
    compactResidentialDoorCount: roomPortalDefinitions.length,
    protectedOpenGardenCentre: true,
  };
  const roomBacklights = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.31, 0.145, 0.02),
    materials.warmWindow,
    roomPortalDefinitions.length,
  );
  roomBacklights.name = 'interior-recessed-room-backlight-instances';
  roomPortalDefinitions.forEach((definition, index) => {
    interiorQuaternion.setFromEuler(new THREE.Euler(0, definition.rotationY, 0));
    interiorMatrix.compose(new THREE.Vector3(...definition.position), interiorQuaternion, new THREE.Vector3(1, 1, 1));
    roomPortals.setMatrixAt(index, interiorMatrix);
    interiorMatrix.compose(new THREE.Vector3(...definition.backPosition), interiorQuaternion, new THREE.Vector3(1, 1, 1));
    roomBacklights.setMatrixAt(index, interiorMatrix);
  });
  roomPortals.instanceMatrix.needsUpdate = true;
  roomPortals.castShadow = true;
  roomPortals.receiveShadow = true;
  roomBacklights.instanceMatrix.needsUpdate = true;

  const pressureBulkheads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.shellInset, 4);
  pressureBulkheads.name = 'interior-pressure-bulkhead-instances';
  const bulkheadDefinitions = [
    {position: [0, -0.82, -1.1] as [number, number, number], scale: [4.18, 0.12, 0.07] as [number, number, number]},
    {position: [-2.12, -0.59, 0] as [number, number, number], scale: [0.07, 0.5, 2.12] as [number, number, number]},
    {position: [2.12, -0.59, 0] as [number, number, number], scale: [0.07, 0.5, 2.12] as [number, number, number]},
    // Dedicated creature level between the industrial workshop below and the
    // Zen-garden commons above. Sharing this existing instanced structural
    // batch preserves the 159-mesh mobile ceiling.
    {position: [0, -0.93, -0.08] as [number, number, number], scale: [3.42, 0.08, 1.24] as [number, number, number]},
  ];
  bulkheadDefinitions.forEach((definition, index) => {
    interiorMatrix.compose(new THREE.Vector3(...definition.position), new THREE.Quaternion(), new THREE.Vector3(...definition.scale));
    pressureBulkheads.setMatrixAt(index, interiorMatrix);
  });
  pressureBulkheads.instanceMatrix.needsUpdate = true;
  pressureBulkheads.receiveShadow = true;

  const starPoints = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.014, quality === 'high' ? 6 : 4, quality === 'high' ? 4 : 3),
    materials.power,
    quality === 'high' ? 44 : 28,
  );
  starPoints.name = 'interior-star-canopy-light-instances';
  const starCount = quality === 'high' ? 44 : 28;
  for (let index = 0; index < starCount; index += 1) {
    const angle = index * 2.399963;
    const radius = Math.sqrt((index + 0.5) / starCount);
    interiorMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius * 1.88, 1.718, Math.sin(angle) * radius * 0.96 - 0.02),
      new THREE.Quaternion(),
      new THREE.Vector3(0.7 + (index % 3) * 0.22, 0.7 + (index % 2) * 0.22, 0.7 + ((index + 1) % 3) * 0.22),
    );
    starPoints.setMatrixAt(index, interiorMatrix);
    starPoints.setColorAt(index, new THREE.Color(index % 5 === 0 ? '#ffd7a3' : '#88d9ff'));
  }
  starPoints.instanceMatrix.needsUpdate = true;
  if (starPoints.instanceColor) starPoints.instanceColor.needsUpdate = true;
  const balconyRails = new THREE.InstancedMesh(
    makeCurvedAtriumRailGeometry(quality),
    materials.glass,
    atriumDeckLevels.length,
  );
  balconyRails.name = 'interior-curved-wraparound-balcony-rail-instances';
  atriumDeckLevels.forEach((deckY, railIndex) => {
    interiorMatrix.makeTranslation(0, deckY + 0.12, 0);
    balconyRails.setMatrixAt(railIndex, interiorMatrix);
  });
  balconyRails.instanceMatrix.needsUpdate = true;

  const liftShafts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 2.5, 0.27),
    materials.glass,
    2,
  );
  liftShafts.name = 'interior-panorama-lift-shaft-instances';
  [-1.82, 1.82].forEach((x, index) => {
    interiorMatrix.makeTranslation(x, 0.25, -0.72);
    liftShafts.setMatrixAt(index, interiorMatrix);
  });
  liftShafts.instanceMatrix.needsUpdate = true;

  const stairStepsPerFlight = 3;
  const stairFlightCount = 2 * (atriumDeckLevels.length - 1) * stairStepsPerFlight;
  const stairFlights = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.4, 0.04, 0.18),
    materials.frameLight,
    stairFlightCount,
  );
  stairFlights.name = 'interior-atrium-stair-flight-instances';
  let stairIndex = 0;
  for (const side of [-1, 1] as const) {
    for (let levelIndex = 0; levelIndex < atriumDeckLevels.length - 1; levelIndex += 1) {
      const lowerY = atriumDeckLevels[levelIndex];
      const upperY = atriumDeckLevels[levelIndex + 1];
      const direction = levelIndex % 2 === 0 ? 1 : -1;
      for (let step = 0; step < stairStepsPerFlight; step += 1) {
        const progress = (step + 1) / (stairStepsPerFlight + 1);
        interiorMatrix.makeTranslation(
          side * 1.32,
          THREE.MathUtils.lerp(lowerY, upperY, progress) + 0.025,
          -0.34 + direction * (progress - 0.5) * 0.24,
        );
        stairFlights.setMatrixAt(stairIndex, interiorMatrix);
        stairIndex += 1;
      }
    }
  }
  stairFlights.instanceMatrix.needsUpdate = true;
  stairFlights.receiveShadow = true;

  const ceilingLights = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.3, 0.026, 0.026),
    materials.warmWindow,
    atriumDeckLevels.length * 4,
  );
  ceilingLights.name = 'interior-ceiling-wayfinding-light-instances';
  let lightIndex = 0;
  for (const deckY of atriumDeckLevels) {
    const y = deckY + 0.28;
    for (const x of [-1.38, -0.46, 0.46, 1.38]) {
      interiorMatrix.makeTranslation(x, y, -0.82);
      ceilingLights.setMatrixAt(lightIndex, interiorMatrix);
      lightIndex += 1;
    }
  }
  ceilingLights.instanceMatrix.needsUpdate = true;

  const loungePods = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.072, 0.12, quality === 'high' ? 3 : 2, quality === 'high' ? 7 : 5),
    materials.shellInset,
    atriumDeckLevels.length * 4,
  );
  loungePods.name = 'interior-zen-and-amenity-lounge-pod-instances';
  loungePods.userData.program = {
    uses: ['zen-garden-seating', 'apartment-lounge', 'cinema-waiting', 'chill-zone'],
  };
  let loungeIndex = 0;
  for (const deckY of atriumDeckLevels) {
    const y = deckY + 0.1;
    for (const x of [-1.62, -0.95, 0.95, 1.62]) {
      interiorQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, x < 0 ? -0.12 : 0.12));
      interiorMatrix.compose(
        new THREE.Vector3(x, y, -0.91),
        interiorQuaternion,
        new THREE.Vector3(1.08, 0.62, 0.9),
      );
      loungePods.setMatrixAt(loungeIndex, interiorMatrix);
      loungeIndex += 1;
    }
  }
  loungePods.instanceMatrix.needsUpdate = true;
  inhabitedInterior.add(
    roomPortals,
    roomBacklights,
    pressureBulkheads,
    balconyRails,
    liftShafts,
    stairFlights,
    ceilingLights,
    loungePods,
    starPoints,
  );
  const interiorPracticalLights = new THREE.Group();
  interiorPracticalLights.name = 'INTERIOR_PRACTICAL_LIGHTS';
  const interiorLightPositions: Array<[number, number, number]> = [
    [-1.02, -0.96, -0.52], [1.02, -0.96, -0.52],
    [-0.92, -0.7, -0.5], [0.92, -0.7, -0.5],
    [-1.32, -0.24, 0.12], [1.32, -0.24, 0.12],
    [-1.34, 0.58, -0.2], [1.34, 0.58, -0.2],
    [0, 1.48, -0.08],
  ];
  for (const [index, position] of interiorLightPositions.entries()) {
    const practicalColor = index < 2 ? '#8edcff' : index < 8 ? '#ffb66f' : '#8ed9ff';
    const practical = new THREE.PointLight(practicalColor, quality === 'high' ? 5.2 : 3.4, 5.2, 1.45);
    practical.name = `INTERIOR_PRACTICAL_${index + 1}`;
    practical.position.set(...position);
    interiorPracticalLights.add(practical);
  }
  inhabitedInterior.add(interiorPracticalLights);

  const garden = new THREE.Group();
  garden.name = 'GARDEN_ATRIUM';
  garden.position.set(0, 0.16, 0);
  garden.scale.setScalar(0.84);
  centreSpine.add(garden);
  const sanctuaryGlow = new THREE.PointLight('#ffad63', quality === 'high' ? 3.2 : 2.25, 5.6, 1.72);
  sanctuaryGlow.name = 'SANCTUARY_WARM_INTERIOR_LIGHT';
  sanctuaryGlow.position.set(0, 0.22, 0.18);
  garden.add(sanctuaryGlow);
  const treeUplight = new THREE.PointLight('#b7d978', quality === 'high' ? 4.4 : 2.8, 3.2, 1.45);
  treeUplight.name = 'GREAT_TREE_UPLIGHT';
  treeUplight.position.set(0, -0.46, 0.08);
  garden.add(treeUplight);
  const zenCommons = new THREE.Group();
  zenCommons.name = 'DECK_02_ZEN_GARDEN_COMMONS';
  // Raise the civic garden to the lowest gallery datum. This preserves the
  // apparent Haven atrium while giving the creature deck beneath it a real
  // inhabited pressure volume instead of a paper-thin interstitial gap.
  zenCommons.position.y = 0.22;
  zenCommons.userData.program = {
    level: 2,
    role: 'inviting-majestic-tree-water-garden',
    amenities: ['running-water', 'reflection-pool', 'seating', 'tea', 'tree-stair', 'quiet-coves'],
  };
  garden.add(zenCommons);
  addGroupedMesh(zenCommons, 'GARDEN_FLOOR_AND_REFLECTION_POOL', [
    {
      geometry: new THREE.CylinderGeometry(0.96, 0.96, 0.12, quality === 'high' ? 32 : 18),
      material: materials.foliage,
      position: [0, -0.65, 0],
      scale: [1.25, 1, 0.75],
    },
    {
      geometry: new THREE.CircleGeometry(0.38, quality === 'high' ? 24 : 14),
      material: materials.water,
      position: [0.48, -0.575, 0.08],
      scale: [1.28, 1, 0.72],
      rotation: [-Math.PI / 2, 0, 0.22],
    },
  ]);
  const zenWaterSegments = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.18, 0.018, 0.3),
    materials.water,
    7,
  );
  zenWaterSegments.name = 'zen-garden-running-water-segment-instances';
  zenWaterSegments.userData.program = {
    deck: 'DECK_02_ZEN_GARDEN_COMMONS',
    flow: 'tree-spring-to-reflection-pool',
  };
  const zenWaterMatrix = new THREE.Matrix4();
  for (let index = 0; index < 7; index += 1) {
    const progress = index / 6;
    zenWaterMatrix.compose(
      new THREE.Vector3(-0.58 + progress * 0.94, -0.57, -0.32 + progress * 0.31 + Math.sin(progress * Math.PI * 2) * 0.05),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.18 - progress * 0.4, 0)),
      new THREE.Vector3(0.9 + (index % 2) * 0.2, 1, 1),
    );
    zenWaterSegments.setMatrixAt(index, zenWaterMatrix);
  }
  zenWaterSegments.instanceMatrix.needsUpdate = true;
  zenCommons.add(zenWaterSegments);
  makeTree(zenCommons, materials, quality);

  const gardenPathStones = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.075, 0.09, 0.035, 8),
    materials.frameLight,
    13,
  );
  gardenPathStones.name = 'sanctuary-garden-path-stone-instances';
  const gardenPathMatrix = new THREE.Matrix4();
  for (let index = 0; index < 13; index += 1) {
    const progress = index / 12;
    gardenPathMatrix.makeTranslation(
      -0.82 + progress * 1.64,
      -0.56,
      0.34 + Math.sin(progress * Math.PI) * 0.16,
    );
    gardenPathStones.setMatrixAt(index, gardenPathMatrix);
  }
  gardenPathStones.instanceMatrix.needsUpdate = true;
  zenCommons.add(gardenPathStones);

  const sanctuaryClearance = new THREE.Group();
  sanctuaryClearance.name = 'SANCTUARY_CLEARANCE_VOLUME';
  sanctuaryClearance.userData.clearance = {
    shape: 'rounded-pressure-volume',
    immutable: true,
    localDimensions: {width: 2.48, height: 2.18, depth: 1.46},
  };
  garden.add(sanctuaryClearance);

  const pressureWindowMaterial = materials.glass.clone();
  const havenPressureGlassColor = new THREE.Color('#35515b');
  const walkerPressureGlassColor = new THREE.Color('#78b8c6');
  pressureWindowMaterial.color.copy(havenPressureGlassColor);
  pressureWindowMaterial.opacity = 0.38;
  pressureWindowMaterial.transmission = 0.34;
  pressureWindowMaterial.roughness = 0.045;
  pressureWindowMaterial.side = THREE.DoubleSide;
  pressureWindowMaterial.depthWrite = false;
  const permanentPressureWindow = addMesh(
    garden,
    'PERMANENT_PRESSURE_WINDOW',
    makeBulgedPressurePanelGeometry(4.4, 2.5, 0.42, quality === 'high' ? 24 : 14, quality === 'high' ? 14 : 8),
    pressureWindowMaterial,
    [0, 0.22, 1.08],
  );
  const wraparoundGlazing = addMesh(
    garden,
    'HAVEN_WRAPAROUND_GLASS_CORRIDOR',
    makeHavenWraparoundGlazingGeometry(),
    pressureWindowMaterial,
    [0, 0, 0],
  );
  wraparoundGlazing.renderOrder = 2;

  const armorSystem = new THREE.Group();
  armorSystem.name = 'RETRACTABLE_WINDOW_ARMOR';
  garden.add(armorSystem);
  const armorSeamBackstop = addMesh(
    armorSystem,
    'WINDOW_ARMOR_SEAM_BACKSTOP',
    makeRoundedExtrudeGeometry(3.72, 2.22, 0.12, 0.4, quality === 'high' ? 4 : 2),
    materials.frame,
    [0, 0.1, 0.86],
  );
  armorSeamBackstop.userData.clearance = {role: 'sealed-window-armor-seam-backstop'};
  armorSeamBackstop.visible = false;
  const armorLeaves: Array<{
    mesh: THREE.Mesh;
    open: THREE.Vector3;
    closed: THREE.Vector3;
    openRotation: THREE.Euler;
    closedRotation: THREE.Euler;
  }> = [];
  const addArmorLeaf = (
    name: string,
    width: number,
    height: number,
    open: [number, number, number],
    closed: [number, number, number],
    openRotation: [number, number, number],
  ) => {
    const mesh = addMesh(
      armorSystem,
      name,
      makeRoundedExtrudeGeometry(width, height, 0.14, Math.min(width, height) * 0.22, quality === 'high' ? 4 : 2),
      materials.frameLight,
      open,
    );
    mesh.userData.clearance = {role: 'attached-window-armor-leaf', parked: open, locked: closed};
    armorLeaves.push({
      mesh,
      open: new THREE.Vector3(...open),
      closed: new THREE.Vector3(...closed),
      openRotation: new THREE.Euler(...openRotation),
      closedRotation: new THREE.Euler(0, 0, 0),
    });
  };
  addArmorLeaf('WINDOW_ARMOR_LEAF_LEFT', 2.02, 2.58, [-2.92, 0.1, 1.04], [-0.96, 0.1, 1.04], [0, -0.82, -0.08]);
  addArmorLeaf('WINDOW_ARMOR_LEAF_RIGHT', 2.02, 2.58, [2.92, 0.1, 1.04], [0.96, 0.1, 1.04], [0, 0.82, 0.08]);
  addArmorLeaf('WINDOW_ARMOR_LEAF_UPPER', 4.04, 1.22, [0, 2.54, 1], [0, 0.94, 1], [-0.72, 0, 0]);
  addArmorLeaf('WINDOW_ARMOR_LEAF_LOWER', 4.04, 1.12, [0, -1.92, 1], [0, -0.84, 1], [0.72, 0, 0]);
  const wrapArmorDefinitions: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [];
  for (const side of [-1, 1] as const) {
    for (const y of [-0.28, 0.4, 1.08]) {
      for (const z of [-0.56, 0.18, 0.72]) {
        wrapArmorDefinitions.push({
          position: [side * 2.1, y, z],
          rotation: [0, side * Math.PI * 0.5, 0],
        });
      }
    }
  }
  for (const x of [-1.34, -0.45, 0.45, 1.34]) {
    wrapArmorDefinitions.push({position: [x, 1.75, -0.02], rotation: [-Math.PI * 0.5, 0, 0]});
  }
  for (const x of [-1.34, -0.45, 0.45, 1.34]) {
    wrapArmorDefinitions.push({position: [x, 0.4, -1.08], rotation: [0, Math.PI, 0]});
  }
  const wrapArmorScales = new THREE.InstancedMesh(
    // These are 26 hand-sized transforming plates, so a clean tapered panel
    // reads better than spending thousands of triangles on invisible corner
    // curvature. The deployment choreography supplies the Iron-Man character.
    makeChamferedPanelGeometry(0.7, 0.58, 0.1, 0.1),
    materials.frameLight,
    wrapArmorDefinitions.length,
  );
  wrapArmorScales.name = 'WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES';
  const wrapArmorMatrix = new THREE.Matrix4();
  wrapArmorDefinitions.forEach((definition, index) => {
    wrapArmorMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...definition.rotation)),
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
    wrapArmorScales.setMatrixAt(index, wrapArmorMatrix);
  });
  wrapArmorScales.instanceMatrix.needsUpdate = true;
  wrapArmorScales.visible = false;
  armorSystem.add(wrapArmorScales);
  const transformationWarningMaterial = materials.warmWindow.clone();
  transformationWarningMaterial.color.set('#ff7b21');
  transformationWarningMaterial.emissive.set('#ff3d00');
  transformationWarningMaterial.emissiveIntensity = 2.4;
  const transformationWarningPositions = [
    [-2.62, 0.96, 1.18], [2.62, 0.96, 1.18],
    [-1.28, 1.76, 0.54], [1.28, 1.76, 0.54],
    [-2.28, -0.62, 0.9], [2.28, -0.62, 0.9],
  ] as const;
  const transformationWarningBeacons = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.065, quality === 'high' ? 10 : 7, quality === 'high' ? 7 : 5),
    transformationWarningMaterial,
    transformationWarningPositions.length,
  );
  transformationWarningBeacons.name = 'TRANSFORMATION_WARNING_BEACON_INSTANCES';
  const transformationWarningMatrix = new THREE.Matrix4();
  transformationWarningPositions.forEach((position, index) => {
    transformationWarningMatrix.makeTranslation(position[0], position[1], position[2]);
    transformationWarningBeacons.setMatrixAt(index, transformationWarningMatrix);
  });
  transformationWarningBeacons.instanceMatrix.needsUpdate = true;
  transformationWarningBeacons.visible = false;
  armorSystem.add(transformationWarningBeacons);

  const shieldEmitters = new THREE.Group();
  shieldEmitters.name = 'CONFORMAL_SHIELD_EMITTERS';
  stabilizedHull.add(shieldEmitters);
  const shieldEmitterDefinitions = [
    [-2.64, 0.48, 0.94], [2.64, 0.48, 0.94], [-2.1, -0.62, 0.94], [2.1, -0.62, 0.94],
    [-1.08, 1.5, 0.94], [1.08, 1.5, 0.94], [-1.02, -0.86, 0.94], [1.02, -0.86, 0.94],
  ] as const;
  const shieldEmitterVanes = new THREE.InstancedMesh(
    makeRoundedExtrudeGeometry(0.12, 0.44, 0.08, 0.04, 1),
    materials.power,
    shieldEmitterDefinitions.length,
  );
  shieldEmitterVanes.name = 'CONFORMAL_EMITTER_VANE_INSTANCES';
  const shieldEmitterMatrix = new THREE.Matrix4();
  shieldEmitterDefinitions.forEach((position, index) => {
    shieldEmitterMatrix.compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, index % 2 === 0 ? -0.45 : 0.45)),
      new THREE.Vector3(1, 1, 1),
    );
    shieldEmitterVanes.setMatrixAt(index, shieldEmitterMatrix);
  });
  shieldEmitterVanes.instanceMatrix.needsUpdate = true;
  shieldEmitters.add(shieldEmitterVanes);

  const conformalField = new THREE.Group();
  conformalField.name = 'CONFORMAL_SHIELD_FIELD';
  stabilizedHull.add(conformalField);
  const conformalMaterial = materials.shield.clone();
  conformalMaterial.opacity = 0;
  const conformalEnvelopeParts = [
    {
      // The shield field is a transparent runtime effect rather than a visible
      // pressure surface. One fewer bevel subdivision funds inhabited-room
      // silhouettes while preserving the same controller-shaped envelope.
      geometry: makeControllerBridgeGeometry(1.96, 1),
      matrix: new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0.08, -0.02),
        new THREE.Quaternion(),
        new THREE.Vector3(1.04, 1.04, 1.04),
      ),
    },
    {
      geometry: makeControllerWingGeometry(-1, 1.36, 1),
      matrix: new THREE.Matrix4().compose(
        new THREE.Vector3(-2.08, -0.12, -0.06),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12)),
        new THREE.Vector3(1.34, 1.06, 1.04),
      ),
    },
    {
      geometry: makeControllerWingGeometry(1, 1.36, 1),
      matrix: new THREE.Matrix4().compose(
        new THREE.Vector3(2.08, -0.12, -0.06),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.12)),
        new THREE.Vector3(1.34, 1.06, 1.04),
      ),
    },
  ];
  conformalEnvelopeParts.forEach(({geometry, matrix}) => geometry.applyMatrix4(matrix));
  const conformalEnvelopeGeometry = mergeGeometries(conformalEnvelopeParts.map(({geometry}) => geometry), false);
  if (!conformalEnvelopeGeometry) throw new Error('Unable to merge conformal shield envelope geometry');
  conformalEnvelopeParts.forEach(({geometry}) => geometry.dispose());
  const conformalFieldMeshes = [
    addMesh(conformalField, 'conformal-field-controller-envelope', conformalEnvelopeGeometry, conformalMaterial, [0, 0, 0]),
  ];
  conformalFieldMeshes.forEach((mesh) => { mesh.visible = false; });

  const livingTerraces = new THREE.Group();
  livingTerraces.name = 'LIVING_MODE_SIDE_TERRACES';
  stabilizedHull.add(livingTerraces);
  const terraceGlass = materials.shield.clone();
  terraceGlass.opacity = 0.28;
  terraceGlass.color.set('#82b8c2');
  const rearPromenade = addGroupedMesh(
    livingTerraces,
    'HAVEN_REAR_TOP_WALKING_PROMENADE',
    [
      {
        geometry: makeRoundedExtrudeGeometry(3.64, 0.54, 0.11, 0.11, quality === 'high' ? 3 : 2),
        material: materials.frameLight,
        position: [0, 1.12, -1.17],
        rotation: [Math.PI * 0.5, 0, 0],
      },
      {
        geometry: makeRoundedExtrudeGeometry(3.5, 0.34, 0.055, 0.08, quality === 'high' ? 3 : 2),
        material: terraceGlass,
        position: [0, 1.34, -1.45],
      },
      {
        geometry: makeRoundedExtrudeGeometry(3.5, 0.34, 0.055, 0.08, quality === 'high' ? 3 : 2),
        material: terraceGlass,
        position: [0, 1.34, -0.89],
      },
      {
        geometry: makeRoundedExtrudeGeometry(3.22, 0.035, 0.04, 0.014, 1),
        material: materials.warmWindow,
        position: [0, 1.15, -1.455],
      },
      {
        geometry: makeRoundedExtrudeGeometry(3.22, 0.035, 0.04, 0.014, 1),
        material: materials.warmWindow,
        position: [0, 1.15, -0.885],
      },
    ],
  );
  rearPromenade.userData.program = {
    role: 'haven-only-rear-panorama-walk',
    enclosure: 'extended-wraparound-pressure-glass',
    retraction: 'folds-with-living-terrace-cassettes-before-walker-motion',
  };
  const livingTerraceRailMeshes: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    addMesh(
      livingTerraces,
      side < 0 ? 'PORT_LIVING_TERRACE_DECK' : 'STARBOARD_LIVING_TERRACE_DECK',
      makeHavenSemiCircularTerraceGeometry(side, quality === 'high' ? 3 : 2),
      materials.frameLight,
      [side * 3.36, -0.28, 0.38],
    );
    livingTerraceRailMeshes.push(addMesh(
      livingTerraces,
      side < 0 ? 'PORT_LIVING_TERRACE_FRONT_RAIL' : 'STARBOARD_LIVING_TERRACE_FRONT_RAIL',
      makeRoundedExtrudeGeometry(1.64, 0.34, 0.055, 0.08, quality === 'high' ? 3 : 2),
      terraceGlass,
      [side * 3.62, 0.02, 1.05],
    ));
    livingTerraceRailMeshes.push(addMesh(
      livingTerraces,
      side < 0 ? 'PORT_LIVING_TERRACE_OUTER_RAIL' : 'STARBOARD_LIVING_TERRACE_OUTER_RAIL',
      makeRoundedExtrudeGeometry(0.06, 0.34, 1.12, 0.025, quality === 'high' ? 2 : 1),
      terraceGlass,
      [side * 4.46, 0.02, 0.38],
    ));
    addMesh(
      livingTerraces,
      side < 0 ? 'PORT_TERRACE_PLANTER' : 'STARBOARD_TERRACE_PLANTER',
      makeRoundedExtrudeGeometry(0.42, 0.18, 0.52, 0.06, 2),
      materials.frame,
      [side * 3.9, -0.12, 0.34],
    );
  }

  const terraceFurnitureDefinitions: Array<{
    position: [number, number, number];
    scale: [number, number, number];
    rotation: number;
  }> = [];
  const terracePlantDefinitions: Array<{
    position: [number, number, number];
    scale: [number, number, number];
  }> = [];
  for (const side of [-1, 1] as const) {
    terraceFurnitureDefinitions.push(
      {position: [side * 3.18, -0.08, 0.02], scale: [1.9, 0.82, 1], rotation: 0},
      {position: [side * 3.58, -0.08, 0.73], scale: [1.1, 0.62, 0.92], rotation: side * 0.22},
      {position: [side * 3.82, -0.08, 0.28], scale: [1.08, 0.62, 0.92], rotation: side * 0.48},
      {position: [side * 4.03, -0.08, -0.18], scale: [1.08, 0.62, 0.92], rotation: side * 0.7},
      {position: [side * 3.16, -0.02, 0.95], scale: [0.72, 1.28, 0.72], rotation: 0},
    );
    terracePlantDefinitions.push(
      {position: [side * 3.28, 0.12, 0.14], scale: [1.15, 0.72, 1]},
      {position: [side * 3.72, 0.16, -0.34], scale: [1.36, 0.86, 1.12]},
      {position: [side * 4.12, 0.12, 0.52], scale: [1.04, 0.68, 0.94]},
      {position: [side * 4.32, 0.1, 0.02], scale: [0.9, 0.62, 0.86]},
    );
  }
  for (const [index, x] of [-1.3, -0.44, 0.44, 1.3].entries()) {
    terraceFurnitureDefinitions.push({
      position: [x, 1.21, -1.16],
      scale: [1.12, 0.58, 0.82],
      rotation: index % 2 === 0 ? 0.08 : -0.08,
    });
    terracePlantDefinitions.push({
      position: [x + (x < 0 ? -0.18 : 0.18), 1.27, -1.18],
      scale: [0.72 + (index % 2) * 0.12, 0.54, 0.72],
    });
  }
  const terraceFurniture = new THREE.InstancedMesh(
    makeRoundedExtrudeGeometry(0.34, 0.18, 0.28, 0.055, 2),
    materials.warmWindow,
    terraceFurnitureDefinitions.length,
  );
  terraceFurniture.name = 'haven-luxury-bar-seating-and-lantern-instances';
  const terraceFurnitureMatrix = new THREE.Matrix4();
  terraceFurnitureDefinitions.forEach((definition, index) => {
    terraceFurnitureMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, definition.rotation, 0)),
      new THREE.Vector3(...definition.scale),
    );
    terraceFurniture.setMatrixAt(index, terraceFurnitureMatrix);
  });
  terraceFurniture.instanceMatrix.needsUpdate = true;
  livingTerraces.add(terraceFurniture);
  const terracePlants = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.24, quality === 'high' ? 1 : 0),
    materials.foliage,
    terracePlantDefinitions.length,
  );
  terracePlants.name = 'haven-luxury-terrace-plant-instances';
  terracePlantDefinitions.forEach((definition, index) => {
    terraceFurnitureMatrix.compose(
      new THREE.Vector3(...definition.position),
      new THREE.Quaternion(),
      new THREE.Vector3(...definition.scale),
    );
    terracePlants.setMatrixAt(index, terraceFurnitureMatrix);
  });
  terracePlants.instanceMatrix.needsUpdate = true;
  livingTerraces.add(terracePlants);

  const {
    pivot: leftWing,
    engineHousing: leftGripDrive,
    thrusterEffects: leftThrust,
    gripMass: leftTravelGripMass,
    underframe: leftTravelUnderframe,
    travelGripFairing: leftTravelFairing,
    sideHabitat: leftWalkerHabitat,
    shell: leftWalkerShell,
    shoulderYoke: leftWalkerYoke,
    occupiedDeckWindows: leftWalkerDecks,
  } = makeWing(stabilizedHull, -1, materials, quality);
  const {
    pivot: rightWing,
    engineHousing: rightGripDrive,
    thrusterEffects: rightThrust,
    gripMass: rightTravelGripMass,
    underframe: rightTravelUnderframe,
    travelGripFairing: rightTravelFairing,
    sideHabitat: rightWalkerHabitat,
    shell: rightWalkerShell,
    shoulderYoke: rightWalkerYoke,
    occupiedDeckWindows: rightWalkerDecks,
  } = makeWing(stabilizedHull, 1, materials, quality);

  const towers = new THREE.Group();
  towers.name = 'POWER_TOWERS';
  stabilizedHull.add(towers);
  for (const side of [-1, 1] as const) {
    const tower = new THREE.Group();
    tower.name = side < 0 ? 'LEFT_POWER_TOWER' : 'RIGHT_POWER_TOWER';
    tower.position.set(side * 1.68, 1.42, -0.02);
    towers.add(tower);
    addMesh(
      tower,
      'tower-shoulder-base',
      makeRoundedExtrudeGeometry(0.94, 0.38, 1.12, 0.12, quality === 'high' ? 3 : 2),
      materials.shell,
      [0, 0.04, 0],
    );
    addMesh(
      tower,
      'tower-core',
      makeTaperedExtrudeGeometry(0.62, 0.84, 1.62, 0.72, quality === 'high' ? 4 : 2),
      materials.glass,
      [0, 0.76, 0],
    );
    const towerCollarGeometry = makeRoundedExtrudeGeometry(0.56, 0.09, 0.54, 0.04, 2);
    const towerCollars = new THREE.InstancedMesh(towerCollarGeometry, materials.frameLight, 7);
    towerCollars.name = 'tower-collar-instances';
    const towerCollarMatrix = new THREE.Matrix4();
    for (let collar = 0; collar < 3; collar += 1) {
      towerCollarMatrix.compose(
        new THREE.Vector3(0, 0.08 + collar * 0.56, 0),
        new THREE.Quaternion(),
        new THREE.Vector3(1 - collar * 0.1, 1, 1),
      );
      towerCollars.setMatrixAt(collar, towerCollarMatrix);
    }
    const braceDefinitions: Array<{
      position: [number, number, number];
      rotation: number;
      scale: [number, number, number];
    }> = [
      {position: [side * -0.38, 0.2, 0.12], rotation: side * -0.58, scale: [1.18, 0.82, 0.9]},
      {position: [side * 0.38, 0.2, 0.12], rotation: side * 0.58, scale: [1.18, 0.82, 0.9]},
      {position: [side * -0.28, 0.62, 0.08], rotation: side * -0.42, scale: [0.96, 0.72, 0.84]},
      {position: [side * 0.28, 0.62, 0.08], rotation: side * 0.42, scale: [0.96, 0.72, 0.84]},
    ];
    braceDefinitions.forEach((brace, index) => {
      towerCollarMatrix.compose(
        new THREE.Vector3(...brace.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, brace.rotation)),
        new THREE.Vector3(...brace.scale),
      );
      towerCollars.setMatrixAt(index + 3, towerCollarMatrix);
    });
    towerCollars.instanceMatrix.needsUpdate = true;
    tower.add(towerCollars);
    addMesh(tower, 'tower-observation-light', makeRoundedExtrudeGeometry(0.36, 1.14, 0.075, 0.11, 2), materials.warmWindow, [0, 0.78, 0.41]);
    addMesh(tower, 'tower-power-cap', makeRoundedExtrudeGeometry(0.62, 0.18, 0.7, 0.085, 2), materials.frame, [0, 1.66, 0]);
  }

  const keel = new THREE.Group();
  keel.name = 'LANDING_KEEL';
  stabilizedHull.add(keel);
  const keelServiceCore = addGroupedMesh(keel, 'keel-column', [
    {
      // The former solid black cylinder dominated both lower-deck cameras.
      // A transparent pressure sleeve around a slimmer powered spine reads as
      // an intentional engine/lift core while preserving the same telescope.
      geometry: new THREE.CylinderGeometry(0.27, 0.34, 2.3, quality === 'high' ? 10 : 8),
      material: materials.glass,
      position: [0, -1.3, -0.12],
    },
    {
      geometry: new THREE.CylinderGeometry(0.12, 0.16, 2.12, quality === 'high' ? 6 : 6),
      material: materials.shellInset,
      position: [0, -1.3, -0.12],
    },
    ...[-0.35, -1.2, -2.05].map((y, index): GroupedMeshPart => ({
      geometry: new THREE.TorusGeometry(index === 0 ? 0.35 : 0.29, index === 0 ? 0.055 : 0.025, quality === 'high' ? 3 : 3, quality === 'high' ? 10 : 8),
      material: index === 0 ? materials.power : materials.frameLight,
      position: [0, y, -0.12],
      rotation: [Math.PI * 0.5, 0, 0],
    })),
  ]);
  keelServiceCore.userData.program = {
    role: 'telescoping-engine-lift-service-core',
    pressureSleeve: 'transparent',
    retractsDownward: true,
    occupiedDeckIntrusion: 'bounded-to-flush-service-lift',
  };
  addMesh(keel, 'keel-foot', new THREE.CylinderGeometry(0.72, 0.94, 0.22, quality === 'high' ? 18 : 14), materials.frameLight, [0, -2.48, -0.12]);

  const garage = new THREE.Group();
  garage.name = 'GARAGE_BELLY';
  garage.position.set(0, -0.94, 0.24);
  garage.userData.program = {
    linkedInteriorDeck: 'DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE',
    access: 'retractable-vehicle-and-machine-service-bay',
  };
  stabilizedHull.add(garage);
  addMesh(garage, 'garage-volume', makeRoundedExtrudeGeometry(1.82, 0.62, 1.22, 0.18, quality === 'high' ? 4 : 2), materials.frame, [0, 0, 0]);
  addMesh(garage, 'garage-door', makeRoundedExtrudeGeometry(1.28, 0.38, 0.08, 0.1, 2), materials.shellInset, [0, -0.03, 0.66]);

  const walkerLegs: WalkerLegRig[] = [];
  walkerLegs.push(makeWalkerLeg(leftWing, -1, -1, materials, quality));
  walkerLegs.push(makeWalkerLeg(rightWing, 1, -1, materials, quality));
  walkerLegs.push(makeWalkerLeg(root, -1, 1, materials, quality));
  walkerLegs.push(makeWalkerLeg(root, 1, 1, materials, quality));

  const centralKeelDrive = new THREE.Group();
  centralKeelDrive.name = 'CENTRAL_KEEL_DRIVE';
  centralKeelDrive.position.set(0, -1.38, -0.1);
  stabilizedHull.add(centralKeelDrive);
  addMesh(
    centralKeelDrive,
    'CENTRAL_KEEL_DRIVE_SOCKET',
    new THREE.TorusGeometry(0.46, 0.1, quality === 'high' ? 8 : 7, quality === 'high' ? 20 : 18),
    materials.frameLight,
    [0, 0, 0],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  addMesh(centralKeelDrive, 'central-keel-drive-core', new THREE.CylinderGeometry(0.32, 0.4, 0.32, quality === 'high' ? 16 : 12), materials.power, [0, -0.04, 0]);
  const centralDriveEffect = addMesh(
    centralKeelDrive,
    'CENTRAL_KEEL_DRIVE_THRUST',
    new THREE.ConeGeometry(0.28, 1.38, quality === 'high' ? 16 : 12, 1, true),
    materials.hover,
    [0, -0.84, 0],
    [1, 1, 1],
    [0, 0, Math.PI],
  );
  centralDriveEffect.visible = false;
  const primaryDriveEffects = [...leftThrust, ...rightThrust, centralDriveEffect];

  const environmentPreview = new THREE.Group();
  environmentPreview.name = 'ENVIRONMENT_DOWNWASH_PREVIEW';
  environmentPreview.position.set(0, -3, 0);
  root.add(environmentPreview);
  const rippleMaterial = materials.ripple.clone();
  const rippleMesh = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.5, 0.025, quality === 'high' ? 4 : 5, quality === 'high' ? 16 : 20),
    rippleMaterial,
    4,
  );
  rippleMesh.name = 'water-downwash-ripple-instances';
  rippleMesh.visible = false;
  environmentPreview.add(rippleMesh);
  const rippleMatrix = new THREE.Matrix4();
  const rippleQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

  const cameraAnchors = new THREE.Group();
  cameraAnchors.name = 'CAMERA_ANCHORS';
  stabilizedHull.add(cameraAnchors);
  for (const [name, position] of [
    ['ENTRY_POV', new THREE.Vector3(0, -1.1, 1.3)],
    ['GARDEN_REVEAL', new THREE.Vector3(0, 0.2, 2.2)],
    ['SKY_TERRACE_REVEAL', new THREE.Vector3(0, 1.15, 1.6)],
    ['SANCTUARY_FLOOR_POV', new THREE.Vector3(0.98, -0.16, 0.42)],
    ['SANCTUARY_FLOOR_LOOK', new THREE.Vector3(0, 0.66, -0.06)],
    ['SANCTUARY_CANOPY_POV', new THREE.Vector3(0, 1.14, 0.26)],
    ['SANCTUARY_CANOPY_LOOK', new THREE.Vector3(0, 1.28, 3)],
    ['UPPER_BALCONY_DOWN_POV', new THREE.Vector3(-1.05, 1.36, 0.9)],
    ['UPPER_BALCONY_DOWN_LOOK', new THREE.Vector3(0, -0.3, 0)],
    ['UPPER_BALCONY_ACROSS_POV', new THREE.Vector3(1.1, 1.28, 0.95)],
    ['UPPER_BALCONY_ACROSS_LOOK', new THREE.Vector3(-1.1, 0.86, -0.3)],
    ['PORT_HAVEN_BALCONY_POV', new THREE.Vector3(-3.55, 0.18, 0.45)],
    ['PORT_HAVEN_BALCONY_LOOK', new THREE.Vector3(-0.3, 0.3, -0.04)],
    ['STARBOARD_HAVEN_BALCONY_POV', new THREE.Vector3(3.55, 0.18, 0.45)],
    ['STARBOARD_HAVEN_BALCONY_LOOK', new THREE.Vector3(0.3, 0.3, -0.04)],
    ['FABRICATION_DECK_POV', new THREE.Vector3(-0.62, -0.95, 0.74)],
    ['FABRICATION_DECK_LOOK', new THREE.Vector3(0.12, -1.2, -0.52)],
    ['FABRICATION_WINDOW_POV', new THREE.Vector3(0.12, -0.96, 0.58)],
    ['FABRICATION_WINDOW_LOOK', new THREE.Vector3(0.12, -0.9, 2.8)],
    ['CREATURE_HABITAT_POV', new THREE.Vector3(0.12, -0.54, 0.58)],
    ['CREATURE_HABITAT_LOOK', new THREE.Vector3(0.16, -0.68, -0.66)],
    ['STEERING_HOUSE_POV', new THREE.Vector3(2.56, 1.25, 0.9)],
    ['STEERING_HOUSE_LOOK', new THREE.Vector3(2.56, 1.18, 2.5)],
    ['ADMINISTRATION_POV', new THREE.Vector3(-2.46, 1.25, -0.9)],
    ['ADMINISTRATION_LOOK', new THREE.Vector3(-2.62, 1.17, -2.5)],
    ['TRANSFORM_HERO', new THREE.Vector3(0, 1.2, 8.5)],
    ['TRAVEL_POV', new THREE.Vector3(0, 0.9, 0.95)],
    ['ISLAND_APPROACH_HANDOFF', new THREE.Vector3(0, 1.3, 7.2)],
  ] as const) {
    const anchor = new THREE.Object3D();
    anchor.name = name;
    anchor.position.copy(position);
    cameraAnchors.add(anchor);
  }

  const downwashSignal: ExpeditionShipEnvironmentSignal = {
    origin: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    radius: 0,
    strength: 0,
    phase: 0,
  };
  let currentPoseProgress = POSE_PROGRESS.expedition;
  let previousUpdateTime = 0;

  root.userData.sculptRuntime = {
    targetId: 'habitgame-expedition-ship',
    schema: 'expedition-ship-runtime-v2',
    poses: ['docked', 'expedition', 'flight'],
    modeFamilies: ['haven', 'terrain-walker', 'hover-jump', 'ocean', 'comfort-atmosphere', 'fast-space', 'hyperseed'],
    scaleMetres: {
      living: {width: 150, depth: 90, hullHeight: 52, standingHeight: 78},
      hypersonic: {width: 128, depth: 78, hullHeight: 48},
    },
    protectedSanctuary: {
      node: 'SANCTUARY_CLEARANCE_VOLUME',
      immutableLocalScale: true,
      immutableLocalOrientation: true,
      dimensions: {width: 2.48, height: 2.18, depth: 1.46},
    },
    inhabitedInterior: {
      node: 'INHABITED_INTERIOR_ARCHITECTURE',
      visualScale: 0.84,
      pressureEnvelopeDepth: 2.2,
      galleryDeckLevels: atriumDeckLevels,
      occupiedStoreys: atriumDeckLevels.length,
      compactModuleScale: 0.72,
      dedicatedLowerDecks: ['fabrication-and-garage', 'premium-creature-habitat'],
      openGardenVoid: {width: 2.68, depth: 1.52},
      cameraClearanceRadius: 0.18,
      cameraAnchors: [
        'FABRICATION_DECK_POV',
        'CREATURE_HABITAT_POV',
        'SANCTUARY_FLOOR_POV',
        'UPPER_BALCONY_DOWN_POV',
        'UPPER_BALCONY_ACROSS_POV',
        'PORT_HAVEN_BALCONY_POV',
        'STARBOARD_HAVEN_BALCONY_POV',
        'STEERING_HOUSE_POV',
        'ADMINISTRATION_POV',
      ],
      circulation: ['open-u-shaped-atrium-galleries', 'interior-atrium-stair-flight-instances', 'interior-panorama-lift-shaft-instances'],
      havenGlazing: 'HAVEN_WRAPAROUND_GLASS_CORRIDOR',
      frontGalleryClosure: 'open',
    },
    interiorProgram: {
      order: [
        'DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE',
        'DECK_01_PREMIUM_CREATURE_HABITAT',
        'DECK_02_ZEN_GARDEN_COMMONS',
        'DECK_03_MIXED_USE_RESIDENTIAL_RING',
        'CROWN_COMMAND_AND_ADMINISTRATION',
      ],
      fabrication: {
        node: 'DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE',
        retractable: true,
        dedicatedFullWidthDeck: true,
        includes: ['garage', 'machine-workbench', 'fabrication-machines', 'forward-panoramic-pressure-glass'],
        garageBays: ['empty-rover-service-bay', 'engine-pod-rotary-lift', 'clean-fabrication-bench-line'],
        floorSystems: ['twin-service-trenches', 'magnetic-wheel-clamps', 'overhead-handling-gantry', 'retractable-vehicle-lift'],
        forwardPressureWindow: {
          node: 'FABRICATION_PANORAMIC_GLASS_SPARSE_LOAD_FRAME',
          glazing: 'continuous-bowed-smart-glass',
          viewAnchor: 'FABRICATION_WINDOW_POV',
          closure: 'sealed-in-docked-walker-and-flight-modes',
        },
      },
      creatureHabitat: {
        node: 'DECK_01_PREMIUM_CREATURE_HABITAT',
        character: 'creative-multispecies-premium-sanctuary',
        dedicatedFullWidthDeck: true,
        amenities: ['soft-nests', 'social-coves', 'warm-bathing', 'garden-overlook', 'climbing-perches', 'thermal-stones', 'burrow-dens', 'open-foraging-floor'],
        habitatZones: ['amphibious-bathing-rill', 'moss-burrow-den', 'warm-sunning-stones', 'elevated-perch-grove', 'quiet-soft-nest-coves', 'open-social-foraging-floor'],
        residenceScaleClasses: ['small-nest', 'medium-cove', 'large-family-den'],
        noCreaturesAuthoredYet: true,
      },
      zenGarden: {
        node: 'DECK_02_ZEN_GARDEN_COMMONS',
        features: ['majestic-tree', 'running-water', 'reflection-pool', 'seating', 'tree-stair'],
      },
      mixedUseRing: {
        node: 'DECK_03_MIXED_USE_RESIDENTIAL_RING',
        apartments: 'many',
        storeys: atriumDeckLevels.length,
        compactModuleScale: 0.72,
        estimatedSuiteCount: 240,
        amenities: ['panoramic-restaurant', 'cinema', 'gym', 'wellness', 'chill-zone', 'stores', 'tea-room', 'community-lounges'],
        spatialZones: facilityZoneDefinitions.map(definition => definition.name),
      },
      crown: {
        node: 'CROWN_COMMAND_AND_ADMINISTRATION',
        steeringHouses: 'two-forward-shoulder-three-floor-bridges',
        administration: 'two-rear-shoulder-three-floor-suites',
      },
    },
    speedShell: {
      node: 'SPEED_CONTROLLER_GAME_SHELL_CORE',
      shapeAuthority: 'src/assets/Blue_darkcontroller.webp',
      designLanguage: 'smooth-exact-game-controller',
    },
    occupiedVolumes: [
      'SANCTUARY_CLEARANCE_VOLUME',
      'GARDEN_ATRIUM',
      'INHABITED_INTERIOR_ARCHITECTURE',
      'DECK_00_RETRACTABLE_FABRICATION_AND_GARAGE',
      'DECK_01_PREMIUM_CREATURE_HABITAT',
      'DECK_02_ZEN_GARDEN_COMMONS',
      'DECK_03_MIXED_USE_RESIDENTIAL_RING',
      'CROWN_COMMAND_AND_ADMINISTRATION',
      'GARAGE_BELLY',
      'LEFT_OCCUPIED_DECKS',
      'RIGHT_OCCUPIED_DECKS',
    ],
    effectSockets: [
      'port-grip-drive', 'starboard-grip-drive', 'central-keel-drive',
      'walker-leg-trim-rockets', 'downwash-origin', 'conformal-shield-emitters',
    ],
    locomotion: {
      legs: 4,
      gait: 'diagonal-four-beat-terrain-walk',
      poweredFrontLegs: ['POWERED_GRIP_FRONT_LEG_LEFT', 'POWERED_GRIP_FRONT_LEG_RIGHT'],
      rearStabilizers: ['REAR_STABILIZER_LEG_LEFT', 'REAR_STABILIZER_LEG_RIGHT'],
      primaryHoverLift: 'CENTRAL_KEEL_DRIVE',
      gripMobilityAssist: ['LEFT_ENGINE_HOUSING', 'RIGHT_ENGINE_HOUSING'],
      trimStabilization: 'walker-leg-trim-rockets',
      stabilizedPayload: 'STABILIZED_INHABITED_HULL',
    },
    propulsion: {
      layout: 'tri-drive',
      primaryDrives: ['CENTRAL_KEEL_DRIVE', 'LEFT_ENGINE_HOUSING', 'RIGHT_ENGINE_HOUSING'],
      vectors: ['rearward-cruise', 'downward-hover-jump'],
    },
    protection: {
      pressureWindow: 'PERMANENT_PRESSURE_WINDOW',
      wraparoundGlass: 'HAVEN_WRAPAROUND_GLASS_CORRIDOR',
      physicalArmor: ['WINDOW_ARMOR_LEAF_LEFT', 'WINDOW_ARMOR_LEAF_RIGHT', 'WINDOW_ARMOR_LEAF_UPPER', 'WINDOW_ARMOR_LEAF_LOWER'],
      armorScales: 'WRAPAROUND_GLASS_ARMOR_SCALE_INSTANCES',
      seamProtection: 'WINDOW_ARMOR_SEAM_BACKSTOP',
      conformalEmitters: 'CONFORMAL_SHIELD_EMITTERS',
      conformalField: 'CONFORMAL_SHIELD_FIELD',
    },
    environmentSignal: downwashSignal,
  };

  const update = ({timeSeconds, pose, poseProgress = null, thrust = 0, boost = 0, hover = 0, walk = 0, stabilize = 0, reducedMotion = false}: ExpeditionShipUpdateOptions) => {
    const targetProgress = poseProgress === null
      ? POSE_PROGRESS[pose]
      : THREE.MathUtils.clamp(poseProgress, 0, 1);
    const deltaSeconds = previousUpdateTime > 0 ? THREE.MathUtils.clamp(timeSeconds - previousUpdateTime, 0, 0.05) : 0;
    previousUpdateTime = timeSeconds;
    if (reducedMotion || deltaSeconds === 0) currentPoseProgress = targetProgress;
    else currentPoseProgress = THREE.MathUtils.damp(currentPoseProgress, targetProgress, 2.25, deltaSeconds);
    const progress = currentPoseProgress;

    const wingFold = smoothstep(progress, 0.34, 0.96);
    const wingX = THREE.MathUtils.lerp(2.12, 2.02, wingFold);
    const wingY = THREE.MathUtils.lerp(0.54, 0.26, smoothstep(progress, 0.12, 0.88));
    const wingZ = THREE.MathUtils.lerp(-0.08, -0.12, wingFold);
    const wingRotation = THREE.MathUtils.lerp(0.13, 0.09, smoothstep(progress, 0.18, 0.92));
    leftWing.position.set(-wingX, wingY, wingZ);
    rightWing.position.set(wingX, wingY, wingZ);
    leftWing.rotation.set(0, poseLerp(progress, -0.08, 0, -0.2), wingRotation);
    rightWing.rotation.set(0, poseLerp(progress, 0.08, 0, 0.2), -wingRotation);

    // Walker uses short shoulder arches and deployed legs. Only the late
    // travel transformation encloses those systems in full controller grips.
    const travelEnvelope = smoothstep(progress, 0.58, 0.9);
    fabricationDeck.position.set(
      0,
      THREE.MathUtils.lerp(-0.68, -0.82, travelEnvelope),
      THREE.MathUtils.lerp(0.34, -0.46, travelEnvelope),
    );
    fabricationDeck.scale.set(
      1,
      1,
      THREE.MathUtils.lerp(1, 0.9, travelEnvelope),
    );
    // The smooth speed skin is the final locking layer. Keep it parked until
    // the mechanical leaves and warning-light phase have been visible, rather
    // than letting one large black surface hide the transformation story.
    const speedShellDeployment = smoothstep(progress, 0.82, 0.985);
    speedControllerCore.visible = speedShellDeployment > 0.015;
    speedControllerCore.scale.set(
      1.22 * (0.82 + speedShellDeployment * 0.18),
      1.12 * (0.82 + speedShellDeployment * 0.18),
      1.1 * (0.72 + speedShellDeployment * 0.28),
    );
    bridgeVisor.material = travelEnvelope > 0.52 ? speedTouchpadMaterial : materials.glass;
    bridgeVisor.visible = true;
    bridgeVisor.position.set(
      0,
      THREE.MathUtils.lerp(1.78, 1.15, travelEnvelope),
      THREE.MathUtils.lerp(1.12, 1.51, travelEnvelope),
    );
    bridgeVisor.scale.set(
      THREE.MathUtils.lerp(1, 0.92, travelEnvelope),
      THREE.MathUtils.lerp(1, 2.78, travelEnvelope),
      THREE.MathUtils.lerp(1, 1.28, travelEnvelope),
    );
    havenCentreStructures.forEach((object) => { object.visible = travelEnvelope < 0.9; });
    occupiedAtriumDecks.visible = travelEnvelope < 0.94;
    inhabitedInterior.visible = travelEnvelope < 0.94;
    garden.visible = travelEnvelope < 0.94;
    [leftTravelGripMass, rightTravelGripMass, leftTravelUnderframe, rightTravelUnderframe]
      .forEach((mesh) => { mesh.visible = travelEnvelope > 0.18; });
    const fairingDeployment = smoothstep(progress, 0.48, 0.9);
    [leftTravelFairing, rightTravelFairing].forEach((mesh) => {
      mesh.visible = fairingDeployment > 0.015;
      mesh.scale.set(
        1.34 * (0.72 + fairingDeployment * 0.28),
        1.12 * (0.72 + fairingDeployment * 0.28),
        1.08 * (0.72 + fairingDeployment * 0.28),
      );
    });
    [
      leftWalkerHabitat, rightWalkerHabitat,
      leftWalkerShell, rightWalkerShell,
      leftWalkerYoke, rightWalkerYoke,
      leftWalkerDecks, rightWalkerDecks,
    ].forEach((object) => { object.visible = travelEnvelope < 0.72; });

    const towerDeployment = 1 - smoothstep(progress, 0.62, 0.96);
    towers.scale.y = 0.28 + towerDeployment * 0.72;
    towers.position.y = THREE.MathUtils.lerp(0, -0.64, smoothstep(progress, 0.62, 0.96));
    // The large luxury garden terraces belong only to Haven. Their transparent
    // rails telescope into the deck, the furniture rolls into hull cassettes,
    // and the support frame closes before Walker begins moving.
    const terraceDeployment = 1 - smoothstep(progress, 0.04, 0.26);
    livingTerraces.visible = terraceDeployment > 0.03;
    livingTerraces.scale.set(
      0.28 + terraceDeployment * 0.72,
      0.35 + terraceDeployment * 0.65,
      0.22 + terraceDeployment * 0.78,
    );
    // Haven grows a shallow glazed rear conservatory around the top walk.
    // Before mobile motion, its rear and roof panes telescope back into the
    // permanent Walker pressure envelope while the promenade cassette folds.
    wraparoundGlazing.scale.z = THREE.MathUtils.lerp(0.78, 1, terraceDeployment);
    livingTerraceRailMeshes.forEach((rail) => {
      rail.position.y = THREE.MathUtils.lerp(-0.15, 0.02, terraceDeployment);
      rail.scale.y = 0.04 + terraceDeployment * 0.96;
    });
    const keelRetraction = smoothstep(progress, 0.04, 0.5);
    // The service column telescopes downward into the belly cassette. It never
    // rises through the garden or shares volume with the Great Tree.
    keel.position.y = THREE.MathUtils.lerp(0, -0.72, keelRetraction);
    keel.scale.y = THREE.MathUtils.lerp(1, 0.22, keelRetraction);
    garage.position.z = THREE.MathUtils.lerp(0.24, -0.2, travelEnvelope);
    garage.scale.set(
      THREE.MathUtils.lerp(1, 0.88, travelEnvelope),
      THREE.MathUtils.lerp(1, 0.44, travelEnvelope),
      THREE.MathUtils.lerp(1, 0.78, travelEnvelope),
    );
    // Walker is sealed by the permanent transparent pressure glass while its
    // physical armor remains parked. Armor commits only for fast-space.
    const walkerGlassSeal = smoothstep(progress, 0.08, 0.44) * (1 - smoothstep(progress, 0.62, 0.96));
    permanentPressureWindow.visible = true;
    wraparoundGlazing.visible = true;
    pressureWindowMaterial.color.lerpColors(havenPressureGlassColor, walkerPressureGlassColor, walkerGlassSeal);
    pressureWindowMaterial.opacity = THREE.MathUtils.lerp(0.3, 0.56, walkerGlassSeal);
    pressureWindowMaterial.transmission = THREE.MathUtils.lerp(0.34, 0.14, walkerGlassSeal);
    pressureWindowMaterial.roughness = THREE.MathUtils.lerp(0.045, 0.075, walkerGlassSeal);
    const armorClosure = smoothstep(progress, 0.62, 0.96);
    armorLeaves.forEach(({mesh, open, closed, openRotation, closedRotation}, index) => {
      const leafClosure = smoothstep(armorClosure, index < 2 ? 0.02 : 0.22, index < 2 ? 0.7 : 0.94);
      mesh.position.lerpVectors(open, closed, leafClosure);
      mesh.rotation.set(
        THREE.MathUtils.lerp(openRotation.x, closedRotation.x, leafClosure),
        THREE.MathUtils.lerp(openRotation.y, closedRotation.y, leafClosure),
        THREE.MathUtils.lerp(openRotation.z, closedRotation.z, leafClosure),
      );
      mesh.visible = armorClosure > (index < 2 ? 0.015 : 0.18);
      mesh.scale.setScalar(0.9 + leafClosure * 0.1);
    });
    wrapArmorScales.visible = armorClosure > 0.025;
    wrapArmorDefinitions.forEach((definition, index) => {
      const sequence = index / Math.max(1, wrapArmorDefinitions.length - 1);
      const plateClosure = smoothstep(armorClosure, sequence * 0.34, 0.5 + sequence * 0.34);
      const parkedOffset = 1 - plateClosure;
      const animatedPosition = new THREE.Vector3(...definition.position);
      if (index < 18) animatedPosition.x += Math.sign(animatedPosition.x) * parkedOffset * 0.32;
      else if (index < 22) animatedPosition.y += parkedOffset * 0.28;
      else animatedPosition.z -= parkedOffset * 0.3;
      const animatedRotation = new THREE.Euler(...definition.rotation);
      animatedRotation.z += (index % 2 === 0 ? -1 : 1) * parkedOffset * 0.42;
      wrapArmorMatrix.compose(
        animatedPosition,
        new THREE.Quaternion().setFromEuler(animatedRotation),
        new THREE.Vector3(0.08 + plateClosure * 0.92, 0.08 + plateClosure * 0.92, 0.2 + plateClosure * 0.8),
      );
      wrapArmorScales.setMatrixAt(index, wrapArmorMatrix);
    });
    wrapArmorScales.instanceMatrix.needsUpdate = true;
    armorSeamBackstop.visible = armorClosure > 0.58;
    const warningActivity = smoothstep(progress, 0.48, 0.62) * (1 - smoothstep(progress, 0.94, 1));
    transformationWarningBeacons.visible = warningActivity > 0.02;
    transformationWarningMaterial.emissiveIntensity = 1.4 + warningActivity * (1.8 + Math.sin(timeSeconds * 9) * 0.8);
    transformationWarningPositions.forEach((position, index) => {
      const pulse = 0.72 + warningActivity * (0.3 + Math.sin(timeSeconds * 10 + index * 1.37) * 0.18);
      transformationWarningMatrix.compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion(),
        new THREE.Vector3(pulse, pulse, pulse),
      );
      transformationWarningBeacons.setMatrixAt(index, transformationWarningMatrix);
    });
    transformationWarningBeacons.instanceMatrix.needsUpdate = true;
    shieldEmitters.scale.setScalar(0.18 + armorClosure * 0.82);
    shieldEmitters.visible = armorClosure > 0.12;
    conformalFieldMeshes.forEach((mesh) => { mesh.visible = armorClosure > 0.88; });
    conformalMaterial.opacity = THREE.MathUtils.lerp(0, 0.16, smoothstep(armorClosure, 0.86, 1));

    // Walker is the fully deployed terrain configuration. Retraction belongs
    // to the late flight transition, not the Haven-to-Walker transition.
    const legDeployment = 1 - smoothstep(progress, 0.62, 0.96);
    const gaitStrength = reducedMotion ? 0 : THREE.MathUtils.clamp(walk, 0, 1) * (1 - smoothstep(progress, 0.48, 0.86));
    const stabilizationStrength = reducedMotion ? 0 : THREE.MathUtils.clamp(stabilize + hover * 0.72, 0, 1);
    const gaitClock = timeSeconds * (0.7 + gaitStrength * 0.8);
    const residualHullMotion = 1 - stabilizationStrength * 0.9;
    stabilizedHull.rotation.x = Math.sin(gaitClock + Math.PI * 0.5) * gaitStrength * 0.018 * residualHullMotion;
    stabilizedHull.rotation.z = Math.sin(gaitClock) * gaitStrength * 0.026 * residualHullMotion;
    stabilizedHull.position.y = Math.abs(Math.sin(gaitClock * 0.5)) * gaitStrength * 0.025 * residualHullMotion;
    walkerLegs.forEach((leg, index) => {
      const gaitPhase = gaitClock + leg.phase;
      const stride = Math.sin(gaitPhase) * gaitStrength;
      const lift = Math.max(0, Math.sin(gaitPhase)) * gaitStrength;
      leg.root.position.y = leg.restY + (1 - legDeployment) * 1.82 + lift * (leg.role === 'powered-grip-front' ? 0.25 : 0.18);
      const stowedCrossSection = leg.role === 'powered-grip-front' ? 0.34 : 0.24;
      leg.root.scale.set(
        stowedCrossSection + legDeployment * (1 - stowedCrossSection),
        0.14 + legDeployment * 0.86,
        stowedCrossSection + legDeployment * (1 - stowedCrossSection),
      );
      leg.root.rotation.x = leg.foreAft * stride * 0.18;
      const stanceAngle = leg.role === 'powered-grip-front' ? 0.38 : 0.18;
      leg.root.rotation.z = leg.side * (stanceAngle + stride * 0.045);
      leg.knee.rotation.x = leg.foreAft * (-stride * 0.27 + lift * 0.11);
      leg.ankle.rotation.x = leg.foreAft * (stride * 0.14 - lift * 0.08);
      leg.ankle.rotation.z = leg.side * -stride * 0.025;
      leg.trimEffects.forEach((effect, nozzleIndex) => {
        const correctivePulse = 0.72 + Math.sin(timeSeconds * 8.2 + index * 1.7 + nozzleIndex) * 0.18;
        effect.visible = stabilizationStrength > 0.02 && legDeployment > 0.18;
        effect.scale.set(0.78, 0.38 + stabilizationStrength * correctivePulse, 0.78);
        (effect.material as THREE.MeshBasicMaterial).opacity = 0.16 + stabilizationStrength * 0.55;
      });
    });

    const hoverStrength = THREE.MathUtils.clamp(hover, 0, 1);
    const thrustStrength = THREE.MathUtils.clamp(thrust + boost * 0.65, 0, 1);
    const driveStrength = Math.max(hoverStrength, thrustStrength);
    const downwardVector = THREE.MathUtils.clamp(hoverStrength * (1 - progress * 0.72), 0, 1);
    leftGripDrive.rotation.x = -Math.PI * 0.5 * downwardVector;
    rightGripDrive.rotation.x = -Math.PI * 0.5 * downwardVector;
    centralKeelDrive.rotation.x = Math.PI * 0.5 * THREE.MathUtils.clamp(thrustStrength * progress, 0, 1);
    primaryDriveEffects.forEach((effect, index) => {
      const pulse = reducedMotion ? 1 : 0.88 + Math.sin(timeSeconds * (5.8 + boost * 3) + index * 0.7) * 0.12;
      effect.visible = driveStrength > 0.015;
      effect.scale.set(0.84 + boost * 0.3, 0.52 + driveStrength * 1.86 * pulse, 0.84 + boost * 0.3);
      (effect.material as THREE.MeshBasicMaterial).opacity = 0.2 + driveStrength * 0.65;
    });

    rippleMesh.visible = hoverStrength > 0.02;
    for (let index = 0; index < rippleMesh.count; index += 1) {
      const phase = (timeSeconds * 0.36 + index / rippleMesh.count) % 1;
      const rippleScale = 0.55 + phase * (2.4 + hoverStrength * 0.8);
      rippleMatrix.compose(
        new THREE.Vector3(0, 0, 0),
        rippleQuaternion,
        new THREE.Vector3(rippleScale, rippleScale, rippleScale),
      );
      rippleMesh.setMatrixAt(index, rippleMatrix);
    }
    rippleMesh.instanceMatrix.needsUpdate = true;
    rippleMaterial.opacity = hoverStrength * 0.34;

    centralKeelDrive.getWorldPosition(downwashSignal.origin);
    downwashSignal.origin.y = environmentPreview.getWorldPosition(new THREE.Vector3()).y;
    downwashSignal.normal.set(0, 1, 0).transformDirection(root.matrixWorld);
    downwashSignal.radius = 2.2 + hoverStrength * 2.4;
    downwashSignal.strength = hoverStrength;
    downwashSignal.phase = reducedMotion ? 0 : (timeSeconds * 0.36) % 1;
    environmentPreview.visible = hoverStrength > 0.02;

    const flightPitch = pose === 'flight' && !reducedMotion ? Math.sin(timeSeconds * 0.45) * 0.012 : 0;
    root.rotation.x = flightPitch;
    root.position.y = hoverStrength > 0 && !reducedMotion ? Math.sin(timeSeconds * 1.15) * 0.035 : 0;
    return downwashSignal;
  };

  const dispose = () => {
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!disposedGeometries.has(object.geometry)) {
        object.geometry.dispose();
        disposedGeometries.add(object.geometry);
      }
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        if (!disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      });
    });
  };

  let triangles = 0;
  let meshCount = 0;
  const metricMaterials = new Set<string>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = object.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => metricMaterials.add(material.uuid));
  });
  const metrics = {triangles: Math.round(triangles), meshCount, materials: metricMaterials.size};

  update({timeSeconds: 0, pose: 'expedition'});
  return {root, metrics, update, dispose};
}
