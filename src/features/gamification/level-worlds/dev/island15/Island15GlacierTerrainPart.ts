import * as THREE from 'three';

export interface Island15GlacierTerrainMaterials {
  snow: THREE.Material;
  ice: THREE.Material;
  deepIce: THREE.Material;
  crystal: THREE.Material;
  violetCrystal: THREE.Material;
  castleShadow: THREE.Material;
}

export interface Island15GlacierTerrainProfile {
  id: 'low' | 'medium' | 'high';
  terrainSegments: number;
}

const TAU = Math.PI * 2;

interface GlacierRing {
  readonly radiusX: number;
  readonly radiusZ: number;
  readonly centerZ: number;
  readonly y: number;
  readonly phase: number;
  readonly irregularity: number;
  readonly ravineDepth: number;
}

interface GlacierPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface CitadelFoundationPad {
  readonly id: 'central-keep' | 'frost-nest' | 'ice-bastion' | 'oracle-library' | 'aurora-observatory';
  readonly center: readonly [number, number];
  readonly lowerSize: readonly [number, number];
  readonly upperSize: readonly [number, number];
}

const FLOOR_PLAN_VERSION = 17;
const LIVE_ROUTE_SURFACE_MINIMUM_Y = 0.25;
const CITADEL_FOUNDATION_MAXIMUM_Y = 0.16;

export const ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY = Object.freeze({
  id: 'island15-r17-glacier-foundation-v1',
  palaceBounds: Object.freeze({
    minimum: Object.freeze([-11, -0.3, -12] as const),
    maximum: Object.freeze([11, 15, 14] as const),
  }),
  seatCenterXZ: Object.freeze([0, 1] as const),
  upperSeatHalfExtentsXZ: Object.freeze([14, 16.5] as const),
  foundationBounds: Object.freeze({
    minimum: Object.freeze([-14.6, -0.32, -16.1] as const),
    maximum: Object.freeze([14.6, CITADEL_FOUNDATION_MAXIMUM_Y, 18.1] as const),
  }),
  foundationRadiusXZ: Object.freeze([14.6, 17.1] as const),
  // Conservative radial clearance at the rectangular palace corners. The
  // cardinal-axis margins are larger (3.0 west/east, 3.5 north/south).
  minimumScenicRim: 1.25,
  superellipsePower: 4.2,
} as const);

const CITADEL_FOUNDATION_PADS: readonly CitadelFoundationPad[] = [
  {
    id: 'central-keep',
    center: [0, 0],
    lowerSize: [8.9, 9.3],
    upperSize: [8.5, 8.9],
  },
  {
    id: 'frost-nest',
    center: [-7.75, -5.4],
    lowerSize: [6.4, 9.05],
    upperSize: [6, 8.65],
  },
  {
    id: 'ice-bastion',
    center: [7.75, 6.35],
    lowerSize: [6.4, 10.6],
    upperSize: [6, 10.2],
  },
  {
    id: 'oracle-library',
    center: [-7.725, 6.35],
    lowerSize: [6.25, 10.8],
    upperSize: [5.85, 10.4],
  },
  {
    id: 'aurora-observatory',
    center: [7.725, -5.4],
    lowerSize: [6.25, 8.85],
    upperSize: [5.85, 8.45],
  },
] as const;

const GLACIER_RINGS: readonly GlacierRing[] = [
  { radiusX: 16, radiusZ: 19, centerZ: 1, y: -0.08, phase: 0.16, irregularity: 0.038, ravineDepth: 0.15 },
  { radiusX: 15.78, radiusZ: 18.72, centerZ: 0.96, y: -0.72, phase: 0.26, irregularity: 0.048, ravineDepth: 0.18 },
  { radiusX: 16.25, radiusZ: 19.18, centerZ: 0.9, y: -0.84, phase: 0.31, irregularity: 0.055, ravineDepth: 0.15 },
  { radiusX: 15.38, radiusZ: 18.05, centerZ: 0.78, y: -1.58, phase: 0.47, irregularity: 0.065, ravineDepth: 0.2 },
  { radiusX: 14.36, radiusZ: 16.68, centerZ: 0.64, y: -1.72, phase: 0.61, irregularity: 0.072, ravineDepth: 0.14 },
  { radiusX: 13.42, radiusZ: 15.18, centerZ: 0.5, y: -2.55, phase: 0.78, irregularity: 0.078, ravineDepth: 0.1 },
  { radiusX: 11.65, radiusZ: 13.22, centerZ: 0.38, y: -3.34, phase: 0.93, irregularity: 0.085, ravineDepth: 0.06 },
  { radiusX: 9.2, radiusZ: 10.55, centerZ: 0.25, y: -4.12, phase: 1.08, irregularity: 0.09, ravineDepth: 0.03 },
  { radiusX: 5.5, radiusZ: 6.35, centerZ: 0.12, y: -4.82, phase: 1.21, irregularity: 0.08, ravineDepth: 0 },
] as const;

function angularDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function cleft(angle: number, center: number, width: number) {
  const distance = angularDistance(angle, center);
  return Math.exp(-(distance * distance) / (2 * width * width));
}

function ringPoint(ring: GlacierRing, angle: number, index: number): GlacierPoint {
  const superellipsePower = 2 / 3.35;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const baseX = Math.sign(cosine) * Math.pow(Math.abs(cosine), superellipsePower) * ring.radiusX;
  const baseZ = Math.sign(sine) * Math.pow(Math.abs(sine), superellipsePower) * ring.radiusZ;
  const naturalBreakup = 1
    + Math.sin(angle * 5 + ring.phase) * ring.irregularity
    + Math.sin(angle * 9 - ring.phase * 1.4) * ring.irregularity * 0.48
    + Math.sin(angle * 13 + 1.8) * ring.irregularity * 0.22;
  const frontGateway = cleft(angle, Math.PI / 2, 0.17) * ring.ravineDepth;
  const westCleft = cleft(angle, Math.PI * 0.96, 0.105) * ring.irregularity * 1.15;
  const eastCleft = cleft(angle, 0.08, 0.12) * ring.irregularity * 0.85;
  const rearCleft = cleft(angle, Math.PI * 1.53, 0.12) * ring.irregularity * 0.68;
  const radiusScale = naturalBreakup - frontGateway - westCleft - eastCleft - rearCleft;
  const verticalFacet = Math.sin(index * 2.17 + ring.phase) * 0.035;
  return { x: baseX * radiusScale, y: ring.y + verticalFacet, z: ring.centerZ + baseZ * radiusScale };
}

function createGlacierBodyGeometry(segments: number) {
  const positions: number[] = [];
  const indexBuckets: number[][] = [[], [], []];

  GLACIER_RINGS.forEach((ring) => {
    for (let index = 0; index < segments; index += 1) {
      const point = ringPoint(ring, index / segments * TAU, index);
      positions.push(point.x, point.y, point.z);
    }
  });

  const topCenter = positions.length / 3;
  positions.push(0, GLACIER_RINGS[0].y, GLACIER_RINGS[0].centerZ);
  for (let index = 0; index < segments; index += 1) {
    indexBuckets[0].push(topCenter, (index + 1) % segments, index);
  }

  for (let ringIndex = 0; ringIndex < GLACIER_RINGS.length - 1; ringIndex += 1) {
    const materialIndex = ringIndex < 2 ? 0 : ringIndex < 5 ? 1 : 2;
    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      const upperA = ringIndex * segments + index;
      const upperB = ringIndex * segments + next;
      const lowerA = (ringIndex + 1) * segments + index;
      const lowerB = (ringIndex + 1) * segments + next;
      const alternateSplit = (index + ringIndex) % 2 === 0;
      if (alternateSplit) {
        indexBuckets[materialIndex].push(upperA, lowerA, upperB, upperB, lowerA, lowerB);
      } else {
        indexBuckets[materialIndex].push(upperA, lowerA, lowerB, upperA, lowerB, upperB);
      }
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, -5.24, 0);
  const bottomRingOffset = (GLACIER_RINGS.length - 1) * segments;
  for (let index = 0; index < segments; index += 1) {
    indexBuckets[2].push(bottomCenter, bottomRingOffset + index, bottomRingOffset + (index + 1) % segments);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const indices = indexBuckets.flat();
  geometry.setIndex(indices);
  let groupStart = 0;
  indexBuckets.forEach((bucket, materialIndex) => {
    geometry.addGroup(groupStart, bucket.length, materialIndex);
    groupStart += bucket.length;
  });
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSnowCrownGeometry(segments: number) {
  const positions: number[] = [0, 0, GLACIER_RINGS[0].centerZ];
  const indices: number[] = [];
  const ring = GLACIER_RINGS[0];
  for (let index = 0; index < segments; index += 1) {
    const point = ringPoint(ring, index / segments * TAU, index);
    positions.push(point.x * 0.995, 0, point.z * 0.995);
  }
  for (let index = 0; index < segments; index += 1) {
    indices.push(0, (index + 1) % segments + 1, index + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createShelfSegmentGeometry(
  innerRadius: readonly [number, number],
  outerRadius: readonly [number, number],
  y: number,
  startAngle: number,
  endAngle: number,
  segments: number,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    const ripple = 1 + Math.sin(angle * 11 + startAngle * 3) * 0.035;
    positions.push(
      Math.cos(angle) * innerRadius[0] * ripple,
      y + Math.sin(index * 1.7) * 0.018,
      Math.sin(angle) * innerRadius[1] * ripple,
      Math.cos(angle) * outerRadius[0] * ripple,
      y - 0.035 + Math.cos(index * 1.3) * 0.02,
      Math.sin(angle) * outerRadius[1] * ripple,
    );
    if (index < segments) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createEmbeddedFacet(
  name: string,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation: readonly [number, number, number],
  material: THREE.Material,
) {
  const geometry = new THREE.OctahedronGeometry(1, 0);
  geometry.scale(scale[0], scale[1], scale[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.explodeWithParent = true;
  mesh.userData.terrainIntegral = true;
  return mesh;
}

function markTerrainMesh(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.explodeWithParent = true;
  mesh.userData.terrainIntegral = true;
  return mesh;
}

function createFoundationSuperellipseGeometry(
  radiusX: number,
  radiusZ: number,
  centerZ: number,
  bottomY: number,
  topY: number,
  segments = 32,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const exponent = 2 / ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.superellipsePower;
  for (const y of [bottomY, topY]) {
    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * TAU;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      positions.push(
        Math.sign(cosine) * Math.pow(Math.abs(cosine), exponent) * radiusX,
        y,
        centerZ + Math.sign(sine) * Math.pow(Math.abs(sine), exponent) * radiusZ,
      );
    }
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, bottomY, centerZ);
  const topCenter = positions.length / 3;
  positions.push(0, topY, centerZ);
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    indices.push(bottomCenter, index, next);
    indices.push(topCenter, segments + next, segments + index);
    indices.push(index, segments + index, next, next, segments + index, segments + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function addFoundationSeatStratum(
  parent: THREE.Group,
  name: string,
  radiusX: number,
  radiusZ: number,
  bottomY: number,
  topY: number,
  material: THREE.Material,
) {
  const seat = markTerrainMesh(new THREE.Mesh(
    createFoundationSuperellipseGeometry(
      radiusX,
      radiusZ,
      ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.seatCenterXZ[1],
      bottomY,
      topY,
    ),
    material,
  ));
  seat.name = name;
  seat.userData.foundationRole = 'r17-continuous-palace-seat';
  seat.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  seat.userData.presentationOnly = true;
  parent.add(seat);
  return seat;
}

function addFoundationTerrace(
  parent: THREE.Group,
  name: string,
  center: readonly [number, number],
  size: readonly [number, number],
  bottomY: number,
  topY: number,
  material: THREE.Material,
  rotationY = Math.PI / 8,
) {
  const height = topY - bottomY;
  const geometry = new THREE.CylinderGeometry(1, 1, height, 8, 1, false);
  geometry.scale(size[0] * 0.5, 1, size[1] * 0.5);
  const terrace = markTerrainMesh(new THREE.Mesh(geometry, material));
  terrace.name = name;
  terrace.position.set(center[0], bottomY + height * 0.5, center[1]);
  terrace.rotation.y = rotationY;
  terrace.userData.foundationRole = 'shared-citadel-bearing-terrace';
  terrace.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  terrace.userData.presentationOnly = true;
  parent.add(terrace);
  return terrace;
}

function addFoundationBeam(
  parent: THREE.Group,
  name: string,
  start: readonly [number, number],
  end: readonly [number, number],
  width: number,
  bottomY: number,
  topY: number,
  material: THREE.Material,
  role: 'radial-structural-rib' | 'faceted-precinct-bay' | 'crystal-channel',
) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  const height = topY - bottomY;
  const beam = markTerrainMesh(new THREE.Mesh(
    new THREE.BoxGeometry(width, height, length),
    material,
  ));
  beam.name = name;
  beam.position.set(
    (start[0] + end[0]) * 0.5,
    bottomY + height * 0.5,
    (start[1] + end[1]) * 0.5,
  );
  beam.rotation.y = Math.atan2(dx, dz);
  beam.userData.foundationRole = role;
  beam.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  beam.userData.presentationOnly = true;
  parent.add(beam);
  return beam;
}

function interpolateFoundationPoint(
  start: readonly [number, number],
  end: readonly [number, number],
  t: number,
): readonly [number, number] {
  return [
    THREE.MathUtils.lerp(start[0], end[0], t),
    THREE.MathUtils.lerp(start[1], end[1], t),
  ];
}

/**
 * A single low precinct foundation visually binds the five accepted V3 room
 * volumes without becoming a second route. Its highest surface remains below
 * the canonical live-tile undersides (Y=0.25), so the gameplay blocks stay
 * wholly visible and keep sole ownership of the playable ring.
 */
function buildCitadelMonumentalFoundation(
  materials: Island15GlacierTerrainMaterials,
) {
  const foundation = new THREE.Group();
  foundation.name = 'ISLAND_15_CITADEL_MONUMENTAL_GLACIER_FOUNDATION';
  foundation.userData.explodeWithParent = true;
  foundation.userData.terrainIntegral = true;
  foundation.userData.presentationOnly = true;
  foundation.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  foundation.userData.foundationMaximumY = CITADEL_FOUNDATION_MAXIMUM_Y;
  foundation.userData.liveRouteSurfaceMinimumY = LIVE_ROUTE_SURFACE_MINIMUM_Y;
  foundation.userData.liveRouteVerticalClearance = LIVE_ROUTE_SURFACE_MINIMUM_Y - CITADEL_FOUNDATION_MAXIMUM_Y;
  foundation.userData.ownsLiveTileGeometry = false;
  foundation.userData.roomTransformsPreserved = true;
  foundation.userData.connectorSpinesAndRisersPreserved = true;
  foundation.userData.authority = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.id;
  foundation.userData.palaceSeatBounds = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.palaceBounds;
  foundation.userData.foundationBounds = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationBounds;
  foundation.userData.foundationRadiusXZ = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationRadiusXZ;
  foundation.userData.minimumScenicRim = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.minimumScenicRim;

  addFoundationSeatStratum(
    foundation,
    'ISLAND_15_R17_CONTINUOUS_FOUNDATION_DEEP_ICE',
    14.6,
    17.1,
    -0.32,
    -0.12,
    materials.deepIce,
  );
  addFoundationSeatStratum(
    foundation,
    'ISLAND_15_R17_CONTINUOUS_FOUNDATION_BEARING_ICE',
    14.3,
    16.8,
    -0.12,
    0.05,
    materials.ice,
  );
  addFoundationSeatStratum(
    foundation,
    'ISLAND_15_R17_CONTINUOUS_FOUNDATION_SNOW_SEAT',
    ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.upperSeatHalfExtentsXZ[0],
    ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.upperSeatHalfExtentsXZ[1],
    0.05,
    0.105,
    materials.snow,
  );

  CITADEL_FOUNDATION_PADS.forEach((pad) => {
    const token = pad.id.toUpperCase().replace(/-/g, '_');
    addFoundationTerrace(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_${token}_LOWER_DEEP_ICE_TERRACE`,
      pad.center,
      pad.lowerSize,
      -0.2,
      -0.02,
      materials.deepIce,
    );
    addFoundationTerrace(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_${token}_UPPER_TRANSLUCENT_ICE_TERRACE`,
      pad.center,
      pad.upperSize,
      -0.02,
      0.105,
      materials.ice,
    );
  });

  const satellitePads = CITADEL_FOUNDATION_PADS.slice(1);
  satellitePads.forEach((pad, index) => {
    const token = pad.id.toUpperCase().replace(/-/g, '_');
    addFoundationBeam(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_${token}_RADIAL_STRUCTURAL_RIB`,
      [0, 0],
      pad.center,
      0.64,
      -0.105,
      0.075,
      materials.deepIce,
      'radial-structural-rib',
    );
    addFoundationBeam(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_${token}_CRYSTAL_INLAY_CHANNEL`,
      [0, 0],
      pad.center,
      0.12,
      0.075,
      index % 2 === 0 ? 0.145 : CITADEL_FOUNDATION_MAXIMUM_Y,
      index % 2 === 0 ? materials.crystal : materials.violetCrystal,
      'crystal-channel',
    );
  });

  const perimeterCorners = satellitePads.map((pad) => pad.center);
  const perimeterOrder = [0, 1, 3, 2, 0] as const;
  for (let index = 0; index < perimeterOrder.length - 1; index += 1) {
    const start = perimeterCorners[perimeterOrder[index]];
    const end = perimeterCorners[perimeterOrder[index + 1]];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const sideLength = Math.hypot(dx, dz);
    const sideYaw = Math.atan2(dx, dz);
    const outwardNormal: readonly [number, number] = [dz / sideLength, -dx / sideLength];

    ([0.27, 0.73] as const).forEach((t, massIndex) => {
      const center = interpolateFoundationPoint(start, end, t);
      const longAxis = massIndex === 0 ? 1.48 : 1.32;
      const crossAxis = massIndex === 0 ? 0.94 : 1.02;
      addFoundationTerrace(
        foundation,
        `ISLAND_15_CITADEL_FOUNDATION_BURIED_MASONRY_MASS_${index + 1}_${massIndex + 1}`,
        center,
        [crossAxis, longAxis],
        -0.15,
        0.005,
        materials.castleShadow,
        sideYaw + (massIndex === 0 ? -0.045 : 0.06),
      );
      addFoundationTerrace(
        foundation,
        `ISLAND_15_CITADEL_FOUNDATION_FACETED_ICE_TERRACE_${index + 1}_${massIndex + 1}`,
        center,
        [crossAxis * 0.82, longAxis * 0.82],
        0.005,
        massIndex === 0 ? 0.09 : 0.08,
        materials.ice,
        sideYaw + (massIndex === 0 ? -0.045 : 0.06),
      );
      addFoundationTerrace(
        foundation,
        `ISLAND_15_CITADEL_FOUNDATION_SNOW_CAP_${index + 1}_${massIndex + 1}`,
        center,
        [crossAxis * 0.64, longAxis * 0.62],
        massIndex === 0 ? 0.09 : 0.08,
        massIndex === 0 ? 0.135 : 0.12,
        materials.snow,
        sideYaw + (massIndex === 0 ? -0.045 : 0.06),
      );
    });

    const nodeDatum = interpolateFoundationPoint(start, end, index % 2 === 0 ? 0.54 : 0.46);
    const nodeCenter: readonly [number, number] = [
      nodeDatum[0] + outwardNormal[0] * (index % 2 === 0 ? 0.28 : 0.22),
      nodeDatum[1] + outwardNormal[1] * (index % 2 === 0 ? 0.28 : 0.22),
    ];
    addFoundationTerrace(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_IRREGULAR_BUTTRESS_${index + 1}_BURIED_FOOT`,
      nodeCenter,
      index % 2 === 0 ? [0.78, 0.62] : [0.64, 0.82],
      -0.08,
      0.045,
      materials.castleShadow,
      sideYaw + (index % 2 === 0 ? 0.24 : -0.19),
    );
    addFoundationTerrace(
      foundation,
      `ISLAND_15_CITADEL_FOUNDATION_IRREGULAR_BUTTRESS_${index + 1}_SNOWED_SHOULDER`,
      nodeCenter,
      index % 2 === 0 ? [0.56, 0.44] : [0.46, 0.58],
      0.045,
      index % 2 === 0 ? 0.125 : 0.115,
      index % 2 === 0 ? materials.ice : materials.snow,
      sideYaw + (index % 2 === 0 ? 0.24 : -0.19),
    );
  }

  foundation.userData.padCount = CITADEL_FOUNDATION_PADS.length;
  foundation.userData.continuousSeatStratumCount = 3;
  foundation.userData.radialRibCount = satellitePads.length;
  foundation.userData.radialChannelCount = satellitePads.length;
  foundation.userData.continuousBandSegmentCount = 0;
  foundation.userData.thinRailSegmentCount = 0;
  foundation.userData.luminousGemAccentCount = 0;
  foundation.userData.controlLikeSegmentCount = 0;
  foundation.userData.perimeterTerraceMassCount = (perimeterOrder.length - 1) * 2;
  foundation.userData.perimeterSnowGapCount = (perimeterOrder.length - 1) * 3;
  foundation.userData.irregularButtressNodeCount = perimeterOrder.length - 1;
  foundation.userData.meshCount = foundation.children.length;
  return foundation;
}

/**
 * Builds only Island 015's continuous floating glacier mass.
 *
 * The Y=0 crown is deliberately flat across the complete protected board ellipse
 * and all five construction bearing zones. All silhouette breakup, shelves and
 * clefts remain on the perimeter or below the terrain datum.
 */
export function buildIsland15GlacierTerrainPart(
  materials: Island15GlacierTerrainMaterials,
  profile: Island15GlacierTerrainProfile,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_GLACIER_TERRAIN_MASS';
  root.userData.partId = 'glacier-terrain-mass';
  root.userData.partKind = 'part';
  root.userData.partModule = 'terrain/glacier-terrain-mass';
  root.userData.r17FoundationAuthority = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.id;
  root.userData.r17PalaceSeatBounds = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.palaceBounds;
  root.userData.r17FoundationBounds = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationBounds;
  root.userData.r17FoundationRadiusXZ = ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationRadiusXZ;

  const radialSegments = Math.max(20, Math.min(profile.terrainSegments, profile.id === 'high' ? 48 : 36));
  const body = markTerrainMesh(new THREE.Mesh(
    createGlacierBodyGeometry(radialSegments),
    [materials.ice, materials.deepIce, materials.crystal],
  ));
  body.name = 'ISLAND_15_GLACIER_FACETED_BODY';
  root.add(body);

  const crown = markTerrainMesh(new THREE.Mesh(createSnowCrownGeometry(radialSegments), materials.snow));
  crown.name = 'ISLAND_15_GLACIER_FLAT_SNOW_CROWN';
  crown.receiveShadow = true;
  root.add(crown);

  const monumentalFoundation = buildCitadelMonumentalFoundation(materials);
  root.add(monumentalFoundation);

  const shelfDefinitions = [
    { name: 'FRONT_WEST', inner: [12.7, 14.8] as const, outer: [15.25, 17.75] as const, y: -0.76, start: 1.78, end: 2.52 },
    { name: 'FRONT_EAST', inner: [12.62, 14.72] as const, outer: [15.18, 17.68] as const, y: -0.78, start: 0.62, end: 1.34 },
    { name: 'WEST', inner: [12.42, 14.48] as const, outer: [14.98, 17.32] as const, y: -1.66, start: 2.72, end: 3.54 },
    { name: 'REAR', inner: [12.18, 14.12] as const, outer: [14.82, 17.08] as const, y: -1.69, start: 4.15, end: 5.18 },
    { name: 'EAST', inner: [12.5, 14.36] as const, outer: [15.08, 17.26] as const, y: -1.64, start: 5.72, end: 6.5 },
  ];
  shelfDefinitions.forEach((definition, index) => {
    const shelf = markTerrainMesh(new THREE.Mesh(
      createShelfSegmentGeometry(
        definition.inner,
        definition.outer,
        definition.y,
        definition.start,
        definition.end,
        Math.max(4, Math.floor(radialSegments / 7)),
      ),
      index < 2 ? materials.snow : materials.ice,
    ));
    shelf.name = `ISLAND_15_GLACIER_${definition.name}_TERRACE`;
    root.add(shelf);
  });

  const underside = new THREE.Group();
  underside.name = 'ISLAND_15_GLACIER_EMBEDDED_UNDERSIDE_ICE';
  underside.userData.explodeWithParent = true;
  underside.userData.terrainIntegral = true;
  const facetCount = profile.id === 'low' ? 7 : profile.id === 'medium' ? 10 : 14;
  for (let index = 0; index < facetCount; index += 1) {
    const angle = index / facetCount * TAU + Math.sin(index * 2.31) * 0.16;
    const radius = 6.4 + index % 3 * 1.15;
    const scaleY = 1.65 + index % 4 * 0.34;
    underside.add(createEmbeddedFacet(
      `ISLAND_15_GLACIER_UNDERSIDE_FACET_${String(index + 1).padStart(2, '0')}`,
      [Math.cos(angle) * radius, -4.18 - index % 3 * 0.18, Math.sin(angle) * radius * 0.82],
      [1.05 + index % 2 * 0.28, scaleY, 0.92 + (index + 1) % 3 * 0.2],
      [Math.sin(angle) * 0.12, angle * 0.38, Math.cos(angle) * 0.16],
      index % 4 === 0 ? materials.violetCrystal : index % 3 === 0 ? materials.crystal : materials.deepIce,
    ));
  }
  root.add(underside);

  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    terrainDatumY: 0,
    protectedBoardClearance: {
      radiusXZ: [4.06, 2.96],
      exteriorGutter: 0.2,
      surface: 'flat-unoccupied-snow',
    },
    constructionBearingCentersXZ: CITADEL_FOUNDATION_PADS.map((pad) => pad.center),
    monumentalFoundation: {
      floorPlanVersion: FLOOR_PLAN_VERSION,
      authority: ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.id,
      palaceSeatBounds: ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.palaceBounds,
      foundationBounds: ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationBounds,
      foundationRadiusXZ: ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.foundationRadiusXZ,
      minimumScenicRim: ISLAND_15_R17_GLACIER_FOUNDATION_AUTHORITY.minimumScenicRim,
      maximumY: CITADEL_FOUNDATION_MAXIMUM_Y,
      liveRouteSurfaceMinimumY: LIVE_ROUTE_SURFACE_MINIMUM_Y,
      verticalClearance: LIVE_ROUTE_SURFACE_MINIMUM_Y - CITADEL_FOUNDATION_MAXIMUM_Y,
      padCount: CITADEL_FOUNDATION_PADS.length,
      continuousSeatStratumCount: 3,
      radialRibCount: CITADEL_FOUNDATION_PADS.length - 1,
      continuousBandSegmentCount: 0,
      thinRailSegmentCount: 0,
      luminousGemAccentCount: 0,
      controlLikeSegmentCount: 0,
      perimeterTerraceMassCount: 8,
      perimeterSnowGapCount: 12,
      irregularButtressNodeCount: 4,
      ownsLiveTileGeometry: false,
    },
    meshNames: root.children.flatMap((child) => child.type === 'Group'
      ? child.children.map((nested) => nested.name)
      : [child.name]),
  };
  return root;
}
