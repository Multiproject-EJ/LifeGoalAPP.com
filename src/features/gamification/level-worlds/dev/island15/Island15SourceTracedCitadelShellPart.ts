import * as THREE from 'three';

export interface Island15SourceTracedCitadelShellMaterials {
  castle: THREE.Material;
  castleShadow: THREE.Material;
  deepIce: THREE.Material;
  heroCrystal: THREE.Material;
}

type Point2 = readonly [number, number];
type Point3 = readonly [number, number, number];

interface V4RoomClearance {
  readonly id: string;
  readonly canonicalStopId: 'hatchery' | 'habit' | 'wisdom' | 'event' | 'boss';
  readonly storey: 'ground-floor' | 'upper-floor' | 'crown-room-floor';
  readonly centerXYZ: Point3;
  readonly minimum: Point3;
  readonly maximum: Point3;
  readonly facadeFocusSocket: Point3;
}

const PART_ID = 'source-traced-citadel-shell';
const PART_MODULE = 'island15/Island15SourceTracedCitadelShellPart';
const EXPECTED_MESH_COUNT = 51;
const MAXIMUM_TRIANGLE_COUNT = 1_200;
const WALL_THICKNESS = 0.06;
const CONNECTIVITY_EPSILON = 0.018;
const CLEARANCE_EPSILON = 0.004;

const CITADEL_ENVELOPE = {
  minimum: [-1.6, -0.2, -2.05] as Point3,
  maximum: [1.6, 10.55, 2.05] as Point3,
};

const HEIGHT_BANDS = {
  ground: [0.35, 2.2] as const,
  upper: [2.2, 4.3] as const,
  throne: [4.3, 6.4] as const,
  roofBelfry: [6.4, 8.33] as const,
  heroCrystal: [8.33, 10.55] as const,
};

const OUTER_FOOTPRINT_XZ: readonly Point2[] = [
  [-1.25, -2.05], [1.25, -2.05], [1.6, -1.7], [1.6, 1.7],
  [1.25, 2.05], [-1.25, 2.05], [-1.6, 1.7], [-1.6, -1.7],
];

const THRONE_FOOTPRINT_XZ: readonly Point2[] = [
  [-1.28, -1.65], [1.28, -1.65], [1.36, -1.57], [1.36, 1.77],
  [1.28, 1.85], [-1.28, 1.85], [-1.36, 1.77], [-1.36, -1.57],
];

const CROWN_BEARING_XZ: readonly Point2[] = [
  [-0.64, -1.56], [0.64, -1.56], [0.64, -0.78], [1.32, -0.78],
  [1.32, 0.72], [0.68, 0.72], [0.68, 1.56], [-0.68, 1.56],
  [-0.68, 0.72], [-1.32, 0.72], [-1.32, -0.78], [-0.64, -0.78],
];

const BELFRY_CRUCIFORM_XZ: readonly Point2[] = [
  [-0.44, -0.92], [0.44, -0.92], [0.44, -0.48], [0.82, -0.48],
  [0.82, 0.42], [0.46, 0.42], [0.46, 0.88], [-0.46, 0.88],
  [-0.46, 0.42], [-0.82, 0.42], [-0.82, -0.48], [-0.44, -0.48],
];

const UPPER_BELFRY_XZ: readonly Point2[] = [
  [-0.38, -0.58], [0.38, -0.58], [0.56, -0.4], [0.56, 0.4],
  [0.38, 0.58], [-0.38, 0.58], [-0.56, 0.4], [-0.56, -0.4],
];

const V4_ROOM_CLEARANCES: readonly V4RoomClearance[] = [
  { id: 'frost-nest-room', canonicalStopId: 'hatchery', storey: 'ground-floor', centerXYZ: [-0.82, 1.25, -0.62], minimum: [-1.48, 0.42, -1.45], maximum: [-0.28, 2.08, 0.18], facadeFocusSocket: [-0.92, 1.22, 1.93] },
  { id: 'ice-bastion-room', canonicalStopId: 'habit', storey: 'ground-floor', centerXYZ: [0.82, 1.25, -0.62], minimum: [0.28, 0.42, -1.45], maximum: [1.48, 2.08, 0.18], facadeFocusSocket: [0.92, 1.22, 1.93] },
  { id: 'crystal-oracle-room', canonicalStopId: 'wisdom', storey: 'upper-floor', centerXYZ: [-0.78, 3.18, 0.02], minimum: [-1.48, 2.32, -1.2], maximum: [-0.28, 4.16, 1.28], facadeFocusSocket: [-0.78, 3.22, 1.78] },
  { id: 'aurora-observatory-room', canonicalStopId: 'event', storey: 'upper-floor', centerXYZ: [0.78, 3.18, 0.02], minimum: [0.28, 2.32, -1.2], maximum: [1.48, 4.16, 1.28], facadeFocusSocket: [0.78, 3.22, 1.78] },
  { id: 'frozen-throne-room', canonicalStopId: 'boss', storey: 'crown-room-floor', centerXYZ: [0, 5.25, -0.15], minimum: [-1.26, 4.42, -1.52], maximum: [1.26, 6.26, 1.32], facadeFocusSocket: [0, 5.28, 1.38] },
];

function finishMesh<T extends THREE.Mesh>(mesh: T, name: string, role: string) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.partId = PART_ID;
  mesh.userData.explodeWithParent = true;
  mesh.userData.shellRole = role;
  return mesh;
}

function createPolygonPrism(points: readonly Point2[], bottomY: number, topY: number) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: topY - bottomY, steps: 1, bevelEnabled: false });
  geometry.rotateX(-Math.PI * 0.5);
  geometry.translate(0, bottomY, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function addPolygonMass(parent: THREE.Object3D, name: string, role: string, footprint: readonly Point2[], bottomY: number, topY: number, material: THREE.Material) {
  const mesh = finishMesh(new THREE.Mesh(createPolygonPrism(footprint, bottomY, topY), material), name, role);
  parent.add(mesh);
  return mesh;
}

function addWallCourse(parent: THREE.Object3D, prefix: string, footprint: readonly Point2[], bottomY: number, topY: number, material: THREE.Material) {
  footprint.forEach((start, index) => {
    const end = footprint[(index + 1) % footprint.length];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const inwardX = -dz / length;
    const inwardZ = dx / length;
    const mesh = finishMesh(new THREE.Mesh(new THREE.BoxGeometry(length, topY - bottomY, WALL_THICKNESS), material), `${prefix}_WALL_${index + 1}`, 'hollow-perimeter-wall-course');
    mesh.position.set((start[0] + end[0]) * 0.5 + inwardX * WALL_THICKNESS * 0.5, (bottomY + topY) * 0.5, (start[1] + end[1]) * 0.5 + inwardZ * WALL_THICKNESS * 0.5);
    mesh.rotation.y = Math.atan2(-dz, dx);
    mesh.userData.wallCourse = prefix;
    parent.add(mesh);
  });
}

function addBox(parent: THREE.Object3D, name: string, role: string, size: Point3, position: Point3, material: THREE.Material, rotationZ = 0) {
  const mesh = finishMesh(new THREE.Mesh(new THREE.BoxGeometry(...size), material), name, role);
  mesh.position.set(...position);
  mesh.rotation.z = rotationZ;
  parent.add(mesh);
  return mesh;
}

function addTaperedButtress(parent: THREE.Object3D, name: string, centerXZ: Point2, topY: number, material: THREE.Material) {
  const height = topY - 0.2;
  const mesh = finishMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, height, 6, 1, false), material), name, 'authority-placed-attached-buttress');
  mesh.position.set(centerXZ[0], 0.2 + height * 0.5, centerXZ[1]);
  mesh.rotation.y = Math.PI / 6;
  mesh.userData.authorityCenterXZ = [...centerXZ];
  mesh.userData.authorityTopY = topY;
  parent.add(mesh);
  return mesh;
}

function addCrystalProxy(parent: THREE.Object3D, name: string, centerXZ: Point2, baseY: number, tipY: number, halfWidth: number, material: THREE.Material, role: string) {
  const mesh = finishMesh(new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), material), name, role);
  mesh.position.set(centerXZ[0], (baseY + tipY) * 0.5, centerXZ[1]);
  mesh.scale.set(halfWidth, (tipY - baseY) * 0.5, halfWidth);
  mesh.userData.authorityCenterXZ = [...centerXZ];
  mesh.userData.authorityBaseY = baseY;
  mesh.userData.authorityTipY = tipY;
  parent.add(mesh);
  return mesh;
}

function countGeometry(root: THREE.Object3D) {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    triangleCount += object.geometry.index ? object.geometry.index.count / 3 : object.geometry.getAttribute('position').count / 3;
  });
  return { meshCount, triangleCount };
}

function collectMeshBounds(root: THREE.Object3D) {
  const entries: Array<{ mesh: THREE.Mesh; bounds: THREE.Box3 }> = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) entries.push({ mesh: object, bounds: new THREE.Box3().setFromObject(object) });
  });
  return entries;
}

function measureConnectivity(entries: Array<{ mesh: THREE.Mesh; bounds: THREE.Box3 }>) {
  const expanded = entries.map(({ bounds }) => bounds.clone().expandByScalar(CONNECTIVITY_EPSILON));
  const visited = new Set<number>();
  const components: number[][] = [];
  for (let start = 0; start < entries.length; start += 1) {
    if (visited.has(start)) continue;
    const component: number[] = [];
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      expanded.forEach((box, candidate) => {
        if (visited.has(candidate) || !expanded[current].intersectsBox(box)) return;
        visited.add(candidate);
        queue.push(candidate);
      });
    }
    components.push(component);
  }
  return { connectedComponentCount: components.length, detachedMeshCount: components.filter((component) => component.length === 1).length };
}

function insetBox(minimum: Point3, maximum: Point3) {
  return new THREE.Box3(new THREE.Vector3(...minimum).addScalar(CLEARANCE_EPSILON), new THREE.Vector3(...maximum).addScalar(-CLEARANCE_EPSILON));
}

function roundedPoint(point: THREE.Vector3): [number, number, number] {
  return point.toArray().map((value) => Number(value.toFixed(4))) as [number, number, number];
}

function assertContract(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Island 015 source-traced shell contract: ${message}`);
}

/** One continuous low-poly Gothic palace shell with real V4 interior voids. */
export function buildIsland15SourceTracedCitadelShellPart(materials: Island15SourceTracedCitadelShellMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_SOURCE_TRACED_CITADEL_SHELL_PART';
  root.userData.partId = PART_ID;
  root.userData.partKind = 'part';
  root.userData.partModule = PART_MODULE;
  root.userData.presentationOnly = true;
  root.userData.floorPlanVersion = 4;
  root.userData.geometryFamily = 'source-traced-hollow-continuous-gothic-palace';
  root.userData.authoritativeGoal = '.img2threejs/island-015-crystal-glacier/gauntlet/goals/exact/015-source.png';
  root.userData.secondaryMoodReference = '.img2threejs/island-015-crystal-glacier/gauntlet/goals/secondary/island-015-crystal-material-mood-turnaround-v1.png';
  root.userData.secondaryMoodReferenceIsGeometryAuthority = false;
  root.userData.buildingCount = 1;
  root.userData.externalLandmarkBuildingCount = 0;
  root.userData.externalConnectorCount = 0;
  root.userData.usesRoomAabbGeometry = false;
  root.userData.citadelEnvelope = { minimum: [...CITADEL_ENVELOPE.minimum], maximum: [...CITADEL_ENVELOPE.maximum], widthDepthRatio: Number((3.2 / 4.1).toFixed(4)) };
  root.userData.heightBands = {
    ground: [...HEIGHT_BANDS.ground], upper: [...HEIGHT_BANDS.upper], throne: [...HEIGHT_BANDS.throne], roofBelfry: [...HEIGHT_BANDS.roofBelfry], heroCrystal: [...HEIGHT_BANDS.heroCrystal],
    normalized: { ground: [0.033, 0.209], upper: [0.209, 0.408], throne: [0.408, 0.607], roofBelfry: [0.607, 0.79], heroCrystal: [0.79, 1] },
  };
  root.userData.interiorClearances = V4_ROOM_CLEARANCES.map((room) => ({ id: room.id, canonicalStopId: room.canonicalStopId, storey: room.storey, centerXYZ: [...room.centerXYZ], minimum: [...room.minimum], maximum: [...room.maximum], facadeFocusSocket: [...room.facadeFocusSocket] }));
  root.userData.centralAtriumClearance = { minimum: [-0.28, 0.35, -1.55], maximum: [0.28, 4.42, 1.72], throneStairInterfaceBounds: { minimum: [-0.28, 4.42, 0.65], maximum: [0.28, 4.58, 0.99] }, isGeometry: false };
  root.userData.authorityPlacements = {
    groundFrontButtressCentersXZ: [[-1.28, 1.558], [1.28, 1.558]], groundFrontButtressMaximumY: 3.587,
    rearApseButtressCentersXZ: [[-0.864, -1.804], [0.864, -1.804]], rearApseButtressMaximumY: 4.853,
    midShoulderCrystalCentersX: [-1.216, 1.216], midShoulderCrystalTipsY: [7.9125, 8.3345],
    upperShoulderCrystalCentersX: [-0.992, 0.992], lowerShoulderCrystalCentersX: [-1.408, 1.408],
    fourPinnacleCentersXZ: [[-0.544, -0.533], [0.544, -0.533], [-0.544, 0.533], [0.544, 0.533]],
  };
  root.userData.exclusions = ['room-meshes', 'room-aabb-boxes', 'windows', 'doors', 'snow', 'material-polish', 'bridges', 'connectors', 'detached-towers', 'route', 'terrain', 'lights', 'ui', 'gameplay'];

  addPolygonMass(root, 'ISLAND_15_SOURCE_TRACED_CONTINUOUS_PLINTH', 'continuous-bearing-plinth', OUTER_FOOTPRINT_XZ, -0.2, 0.28, materials.deepIce);
  addWallCourse(root, 'ISLAND_15_SOURCE_TRACED_GROUND', OUTER_FOOTPRINT_XZ, 0.28, 2.2, materials.castleShadow);
  addWallCourse(root, 'ISLAND_15_SOURCE_TRACED_UPPER', OUTER_FOOTPRINT_XZ, 2.2, 4.3, materials.castle);
  addWallCourse(root, 'ISLAND_15_SOURCE_TRACED_THRONE', THRONE_FOOTPRINT_XZ, 4.3, 6.4, materials.castleShadow);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_WEST_THRONE_BEARING', 'side-bearing-corbelling', [0.28, 0.22, 0.24], [-1.45, 4.29, 0], materials.castleShadow);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_EAST_THRONE_BEARING', 'side-bearing-corbelling', [0.28, 0.22, 0.24], [1.45, 4.29, 0], materials.castleShadow);

  addBox(root, 'ISLAND_15_SOURCE_TRACED_GATEHOUSE_WEST_PIER', 'attached-front-gatehouse-pier', [0.2, 3.18, 0.18], [-0.48, 1.79, 1.94], materials.castle);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_GATEHOUSE_EAST_PIER', 'attached-front-gatehouse-pier', [0.2, 3.18, 0.18], [0.48, 1.79, 1.94], materials.castle);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_GATEHOUSE_WEST_GABLE', 'open-supported-front-gable', [0.12, 1.42, 0.12], [-0.31, 3.38, 1.94], materials.deepIce, -0.47);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_GATEHOUSE_EAST_GABLE', 'open-supported-front-gable', [0.12, 1.42, 0.12], [0.31, 3.38, 1.94], materials.deepIce, 0.47);

  addTaperedButtress(root, 'ISLAND_15_SOURCE_TRACED_FRONT_WEST_BUTTRESS', [-1.28, 1.558], 3.587, materials.castle);
  addTaperedButtress(root, 'ISLAND_15_SOURCE_TRACED_FRONT_EAST_BUTTRESS', [1.28, 1.558], 3.587, materials.castle);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_FRONT_WEST_BUTTRESS_BRACE', 'attached-front-buttress-brace', [0.18, 1.9, 0.46], [-1.28, 1.2, 1.79], materials.castleShadow);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_FRONT_EAST_BUTTRESS_BRACE', 'attached-front-buttress-brace', [0.18, 1.9, 0.46], [1.28, 1.2, 1.79], materials.castleShadow);

  addTaperedButtress(root, 'ISLAND_15_SOURCE_TRACED_REAR_WEST_APSE_BUTTRESS', [-0.864, -1.804], 4.853, materials.castle);
  addTaperedButtress(root, 'ISLAND_15_SOURCE_TRACED_REAR_EAST_APSE_BUTTRESS', [0.864, -1.804], 4.853, materials.castle);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_REAR_WEST_APSE_GABLE', 'authored-rear-apse-gable', [0.12, 1.52, 0.12], [-0.31, 4.22, -1.97], materials.deepIce, -0.42);
  addBox(root, 'ISLAND_15_SOURCE_TRACED_REAR_EAST_APSE_GABLE', 'authored-rear-apse-gable', [0.12, 1.52, 0.12], [0.31, 4.22, -1.97], materials.deepIce, 0.42);

  addPolygonMass(root, 'ISLAND_15_SOURCE_TRACED_CROWN_BEARING_ROOF', 'supported-cruciform-crown-bearing', CROWN_BEARING_XZ, 6.27, 6.5, materials.deepIce);
  addPolygonMass(root, 'ISLAND_15_SOURCE_TRACED_LOWER_BELFRY', 'enclosed-cruciform-lower-belfry', BELFRY_CRUCIFORM_XZ, 6.4, 7.38, materials.castleShadow);
  addPolygonMass(root, 'ISLAND_15_SOURCE_TRACED_UPPER_BELFRY', 'enclosed-chamfered-upper-belfry', UPPER_BELFRY_XZ, 7.28, 8.33, materials.castle);

  addCrystalProxy(root, 'ISLAND_15_SOURCE_TRACED_MID_WEST_SHOULDER_CRYSTAL', [-1.216, 0], 6.4, 7.9125, 0.2, materials.heroCrystal, 'authority-mid-shoulder-crystal');
  addCrystalProxy(root, 'ISLAND_15_SOURCE_TRACED_MID_EAST_SHOULDER_CRYSTAL', [1.216, 0], 6.4, 8.3345, 0.2, materials.heroCrystal, 'authority-mid-shoulder-crystal');
  addCrystalProxy(root, 'ISLAND_15_SOURCE_TRACED_LOWER_WEST_SHOULDER_CRYSTAL', [-1.408, 0.42], 6.4, 7.28, 0.17, materials.heroCrystal, 'authority-lower-shoulder-crystal');
  addCrystalProxy(root, 'ISLAND_15_SOURCE_TRACED_LOWER_EAST_SHOULDER_CRYSTAL', [1.408, 0.42], 6.4, 7.28, 0.17, materials.heroCrystal, 'authority-lower-shoulder-crystal');
  ([[-0.544, -0.533], [0.544, -0.533], [-0.544, 0.533], [0.544, 0.533]] as const).forEach((centerXZ, index) => {
    addCrystalProxy(root, `ISLAND_15_SOURCE_TRACED_CROWN_PINNACLE_${index + 1}`, centerXZ, 7.28, 8.33, 0.14, materials.heroCrystal, 'authority-crown-pinnacle');
  });
  addCrystalProxy(root, 'ISLAND_15_SOURCE_TRACED_HERO_CRYSTAL', [0, -0.1], 8.33, 10.55, 0.256, materials.heroCrystal, 'authority-hero-crystal');

  root.updateMatrixWorld(true);
  const counts = countGeometry(root);
  const meshBounds = collectMeshBounds(root);
  const bounds = new THREE.Box3().setFromObject(root);
  const connectivity = measureConnectivity(meshBounds);
  const protectedVolumes = [
    ...V4_ROOM_CLEARANCES.map((room) => ({ id: room.id, bounds: insetBox(room.minimum, room.maximum) })),
    { id: 'central-atrium', bounds: insetBox([-0.28, 0.35, -1.55], [0.28, 4.42, 1.72]) },
    { id: 'throne-stair-interface', bounds: insetBox([-0.28, 4.42, 0.65], [0.28, 4.58, 0.99]) },
    ...V4_ROOM_CLEARANCES.map((room) => ({ id: `${room.id}-focus-access`, bounds: new THREE.Box3(new THREE.Vector3(room.facadeFocusSocket[0] - 0.04, room.facadeFocusSocket[1] - 0.08, room.facadeFocusSocket[2] - 0.04), new THREE.Vector3(room.facadeFocusSocket[0] + 0.04, room.facadeFocusSocket[1] + 0.08, room.facadeFocusSocket[2] + 0.04)) })),
  ];
  const clearanceIntersections = protectedVolumes.flatMap((volume) => meshBounds.filter(({ bounds: meshBox }) => meshBox.intersectsBox(volume.bounds)).map(({ mesh }) => ({ protectedVolume: volume.id, meshName: mesh.name })));

  root.userData.meshCount = counts.meshCount;
  root.userData.triangleCount = counts.triangleCount;
  root.userData.maximumTriangleCount = MAXIMUM_TRIANGLE_COUNT;
  root.userData.bounds = { minimum: roundedPoint(bounds.min), maximum: roundedPoint(bounds.max) };
  root.userData.connectivity = connectivity;
  root.userData.clearanceChecks = {
    protectedVolumeCount: protectedVolumes.length, intersectionCount: clearanceIntersections.length, intersections: clearanceIntersections,
    allFiveRoomAabbsClear: clearanceIntersections.every(({ protectedVolume }) => !protectedVolume.endsWith('-room')),
    atriumClear: !clearanceIntersections.some(({ protectedVolume }) => protectedVolume === 'central-atrium'),
    throneInterfaceClear: !clearanceIntersections.some(({ protectedVolume }) => protectedVolume === 'throne-stair-interface'),
    allFiveFocusAccessesClear: !clearanceIntersections.some(({ protectedVolume }) => protectedVolume.endsWith('-focus-access')),
  };
  root.userData.sourceAuthorityRatios = {
    widthDepth: Number((3.2 / 4.1).toFixed(4)), fullHeight: Number((bounds.max.y - bounds.min.y).toFixed(4)),
    heroCrystalHeightFractionOfMaximumY: Number(((10.55 - 8.33) / 10.55).toFixed(4)), belfryTopFractionOfMaximumY: Number((8.33 / 10.55).toFixed(4)),
  };

  assertContract(counts.meshCount === EXPECTED_MESH_COUNT, `expected ${EXPECTED_MESH_COUNT} meshes, received ${counts.meshCount}`);
  assertContract(counts.triangleCount <= MAXIMUM_TRIANGLE_COUNT, `triangle budget ${counts.triangleCount}/${MAXIMUM_TRIANGLE_COUNT}`);
  assertContract(bounds.min.x >= CITADEL_ENVELOPE.minimum[0] - 0.0001 && bounds.max.x <= CITADEL_ENVELOPE.maximum[0] + 0.0001, 'X bounds leave the V4 envelope');
  assertContract(bounds.min.z >= CITADEL_ENVELOPE.minimum[2] - 0.0001 && bounds.max.z <= CITADEL_ENVELOPE.maximum[2] + 0.0001, 'Z bounds leave the V4 envelope');
  assertContract(Math.abs(bounds.max.y - 10.55) <= 0.0001, `hero tip must end at Y 10.55, received ${bounds.max.y}`);
  assertContract(connectivity.connectedComponentCount === 1, `expected one connected component, received ${connectivity.connectedComponentCount}`);
  assertContract(connectivity.detachedMeshCount === 0, `found ${connectivity.detachedMeshCount} detached meshes`);
  assertContract(clearanceIntersections.length === 0, `protected-volume intersections: ${JSON.stringify(clearanceIntersections)}`);
  assertContract(Math.abs(root.userData.sourceAuthorityRatios.widthDepth - 0.7805) <= 0.0001, 'width/depth ratio drifted from source authority');
  assertContract(Math.abs(root.userData.sourceAuthorityRatios.heroCrystalHeightFractionOfMaximumY - 0.2104) <= 0.0001, 'hero crystal is not approximately 21% of maximum Y');
  assertContract(Math.abs(root.userData.sourceAuthorityRatios.belfryTopFractionOfMaximumY - 0.7896) <= 0.0001, 'belfry top drifted from normalized 0.79 authority');
  return root;
}
