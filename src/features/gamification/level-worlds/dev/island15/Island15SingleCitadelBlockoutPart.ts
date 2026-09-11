import * as THREE from 'three';

export interface Island15SingleCitadelBlockoutMaterials {
  deepIce: THREE.Material;
  castleShadow: THREE.Material;
  silver: THREE.Material;
  heroCrystal: THREE.Material;
}

type Point3 = readonly [number, number, number];

interface RoomVolumeSpec {
  readonly id: string;
  readonly canonicalStopId: 'hatchery' | 'habit' | 'wisdom' | 'event' | 'boss';
  readonly storey: 'ground-floor' | 'upper-floor' | 'crown-room-floor';
  readonly centerXYZ: Point3;
  readonly minimum: Point3;
  readonly maximum: Point3;
  readonly facadeFocusSocket: Point3;
  readonly color: number;
}

const PART_ID = 'single-citadel-blockout';
const PART_MODULE = 'island15/Island15SingleCitadelBlockoutPart';
const MAXIMUM_MESH_COUNT = 14;
const MAXIMUM_TRIANGLE_COUNT = 400;

const CITADEL_FOOTPRINT_XZ = [
  [-1.18, -2.05],
  [1.18, -2.05],
  [1.18, -1.72],
  [1.6, -1.72],
  [1.6, 1.46],
  [1.16, 1.46],
  [1.16, 1.76],
  [0.52, 1.76],
  [0.52, 2.05],
  [-0.52, 2.05],
  [-0.52, 1.76],
  [-1.16, 1.76],
  [-1.16, 1.46],
  [-1.6, 1.46],
  [-1.6, -1.72],
  [-1.18, -1.72],
] as const;

const ROOM_VOLUMES: readonly RoomVolumeSpec[] = [
  {
    id: 'frost-nest-room',
    canonicalStopId: 'hatchery',
    storey: 'ground-floor',
    centerXYZ: [-0.82, 1.25, -0.62],
    minimum: [-1.48, 0.42, -1.45],
    maximum: [-0.28, 2.08, 0.18],
    facadeFocusSocket: [-0.92, 1.22, 1.93],
    color: 0x58dfff,
  },
  {
    id: 'ice-bastion-room',
    canonicalStopId: 'habit',
    storey: 'ground-floor',
    centerXYZ: [0.82, 1.25, -0.62],
    minimum: [0.28, 0.42, -1.45],
    maximum: [1.48, 2.08, 0.18],
    facadeFocusSocket: [0.92, 1.22, 1.93],
    color: 0x4f8dff,
  },
  {
    id: 'crystal-oracle-room',
    canonicalStopId: 'wisdom',
    storey: 'upper-floor',
    centerXYZ: [-0.78, 3.18, 0.02],
    minimum: [-1.48, 2.32, -1.2],
    maximum: [-0.28, 4.16, 1.28],
    facadeFocusSocket: [-0.78, 3.22, 1.78],
    color: 0x9c70ff,
  },
  {
    id: 'aurora-observatory-room',
    canonicalStopId: 'event',
    storey: 'upper-floor',
    centerXYZ: [0.78, 3.18, 0.02],
    minimum: [0.28, 2.32, -1.2],
    maximum: [1.48, 4.16, 1.28],
    facadeFocusSocket: [0.78, 3.22, 1.78],
    color: 0x45f3cf,
  },
  {
    id: 'frozen-throne-room',
    canonicalStopId: 'boss',
    storey: 'crown-room-floor',
    centerXYZ: [0, 5.25, -0.15],
    minimum: [-1.26, 4.42, -1.52],
    maximum: [1.26, 6.26, 1.32],
    facadeFocusSocket: [0, 5.28, 1.38],
    color: 0xffc972,
  },
] as const;

function createFootprintPrism(height: number, bottomY: number, scale: number) {
  const shape = new THREE.Shape();
  CITADEL_FOOTPRINT_XZ.forEach(([x, z], index) => {
    const px = x * scale;
    const py = -z * scale;
    if (index === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI * 0.5);
  geometry.translate(0, bottomY, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function finishMesh<T extends THREE.Mesh>(mesh: T, name: string) {
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.partId = PART_ID;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function addFootprintMesh(
  parent: THREE.Object3D,
  name: string,
  bottomY: number,
  topY: number,
  scale: number,
  material: THREE.Material,
) {
  const mesh = finishMesh(
    new THREE.Mesh(createFootprintPrism(topY - bottomY, bottomY, scale), material),
    name,
  );
  parent.add(mesh);
  return mesh;
}

function addBlockoutBox(
  parent: THREE.Object3D,
  name: string,
  size: Point3,
  position: Point3,
  material: THREE.Material,
) {
  const mesh = finishMesh(
    new THREE.Mesh(new THREE.BoxGeometry(...size), material),
    name,
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function countGeometry(root: THREE.Object3D) {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    triangleCount += object.geometry.index
      ? object.geometry.index.count / 3
      : object.geometry.getAttribute('position').count / 3;
  });
  return { meshCount, triangleCount };
}

function roundTuple(point: THREE.Vector3): [number, number, number] {
  return [point.x, point.y, point.z].map((value) => Number(value.toFixed(4))) as [number, number, number];
}

/**
 * Naked Floor Plan V4 macro proof. This part deliberately owns no final shell,
 * room mechanism, light, cutaway, route or gameplay behavior.
 */
export function buildIsland15SingleCitadelBlockoutPart(
  materials: Island15SingleCitadelBlockoutMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_SINGLE_CITADEL_BLOCKOUT_PART';
  root.userData.partId = PART_ID;
  root.userData.partKind = 'part';
  root.userData.partModule = PART_MODULE;
  root.userData.presentationOnly = true;
  root.userData.floorPlanVersion = 4;
  root.userData.layoutAuthority = 'citadel-floor-plan.v4';
  root.userData.buildingCount = 1;
  root.userData.externalLandmarkBuildingCount = 0;
  root.userData.externalConnectorCount = 0;
  root.userData.roomCount = ROOM_VOLUMES.length;
  root.userData.storeyCount = 3;
  root.userData.maximumMeshCount = MAXIMUM_MESH_COUNT;
  root.userData.maximumTriangleCount = MAXIMUM_TRIANGLE_COUNT;
  root.userData.routeAndTileClearancePreserved = true;
  root.userData.gameplayAuthority = false;
  root.userData.citadelEnvelope = {
    minimum: [-1.6, -0.2, -2.05],
    maximum: [1.6, 10.55, 2.05],
    footprintXZ: CITADEL_FOOTPRINT_XZ.map(([x, z]) => [x, z]),
  };
  root.userData.circulationVoid = {
    id: 'central-atrium-and-grand-stair',
    minimum: [-0.28, 0.35, -1.55],
    maximum: [0.28, 4.42, 1.72],
    throneStairInterfaceBounds: {
      minimum: [-0.28, 4.42, 0.65],
      maximum: [0.28, 4.58, 0.99],
    },
    isGeometry: false,
  };
  root.userData.roomVolumes = ROOM_VOLUMES.map((room) => ({
    id: room.id,
    canonicalStopId: room.canonicalStopId,
    storey: room.storey,
    centerXYZ: [...room.centerXYZ],
    interiorBounds: { minimum: [...room.minimum], maximum: [...room.maximum] },
    facadeFocusSocket: [...room.facadeFocusSocket],
  }));
  root.userData.retiredLiveSystems = [
    'castle-wing-connector-system',
    'shared-interior-circulation',
    'five-pad-monumental-foundation',
    'four-standalone-room-shells',
  ];

  addFootprintMesh(root, 'ISLAND_15_V4_CENTRAL_BEARING_PLINTH', -0.2, 0.25, 1, materials.deepIce);

  [
    { name: 'GROUND', bottomY: 0.24, topY: 2.2, scale: 1, material: materials.deepIce },
    { name: 'UPPER', bottomY: 2.14, topY: 4.34, scale: 0.82, material: materials.castleShadow },
    { name: 'CROWN_ROOM', bottomY: 4.28, topY: 6.34, scale: 0.59, material: materials.deepIce },
  ].forEach((tier) => {
    const mesh = addFootprintMesh(
      root,
      `ISLAND_15_V4_${tier.name}_STOREY_TIER`,
      tier.bottomY,
      tier.topY,
      tier.scale,
      tier.material,
    );
    mesh.userData.storeyTier = tier.name.toLowerCase();
    mesh.userData.connectedOccupiedShell = true;
  });

  const westShoulder = addBlockoutBox(
    root,
    'ISLAND_15_V4_ATTACHED_WEST_OCCUPIED_SHOULDER',
    [0.58, 2.76, 2.68],
    [-1.31, 1.63, -0.02],
    materials.castleShadow,
  );
  westShoulder.userData.attachedMacroMass = 'ground-west';
  const eastShoulder = addBlockoutBox(
    root,
    'ISLAND_15_V4_ATTACHED_EAST_OCCUPIED_SHOULDER',
    [0.58, 2.76, 2.68],
    [1.31, 1.63, -0.02],
    materials.castleShadow,
  );
  eastShoulder.userData.attachedMacroMass = 'ground-east';
  const gatehouse = addBlockoutBox(
    root,
    'ISLAND_15_V4_ATTACHED_SOUTH_GRAND_GATEHOUSE',
    [1.04, 2.62, 0.54],
    [0, 1.55, 1.78],
    materials.silver,
  );
  gatehouse.userData.attachedMacroMass = 'south-gatehouse';
  const rearApse = addBlockoutBox(
    root,
    'ISLAND_15_V4_ATTACHED_REAR_ATRIUM_APSE',
    [1.12, 2.36, 0.52],
    [0, 1.43, -1.79],
    materials.silver,
  );
  rearApse.userData.attachedMacroMass = 'rear-apse';

  ROOM_VOLUMES.forEach((room) => {
    const size = new THREE.Vector3(
      room.maximum[0] - room.minimum[0],
      room.maximum[1] - room.minimum[1],
      room.maximum[2] - room.minimum[2],
    );
    const roomMaterial = new THREE.MeshBasicMaterial({
      name: `ISLAND_15_V4_${room.id.toUpperCase().replace(/-/g, '_')}_BLOCKOUT_MATERIAL`,
      color: room.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = finishMesh(
      new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), roomMaterial),
      `ISLAND_15_V4_${room.id.toUpperCase().replace(/-/g, '_')}_VOLUME`,
    );
    mesh.position.set(
      (room.minimum[0] + room.maximum[0]) * 0.5,
      (room.minimum[1] + room.maximum[1]) * 0.5,
      (room.minimum[2] + room.maximum[2]) * 0.5,
    );
    mesh.userData.semanticRoomVolume = true;
    mesh.userData.roomId = room.id;
    mesh.userData.landmarkId = room.canonicalStopId;
    mesh.userData.canonicalStopId = room.canonicalStopId;
    mesh.userData.storey = room.storey;
    mesh.userData.centerXYZ = [...room.centerXYZ];
    mesh.userData.interiorBounds = { minimum: [...room.minimum], maximum: [...room.maximum] };
    mesh.userData.facadeFocusSocket = [...room.facadeFocusSocket];
    mesh.userData.semanticBoundsOnly = true;
    root.add(mesh);
  });

  const crownPlaceholder = finishMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), materials.heroCrystal),
    'ISLAND_15_V4_CROWN_BAND_PLACEHOLDER',
  );
  crownPlaceholder.position.set(0, 6.91, -0.08);
  crownPlaceholder.scale.set(0.42, 0.57, 0.42);
  crownPlaceholder.userData.nonRoomCrownBand = true;
  crownPlaceholder.userData.seatedOnOccupiedCrownRoom = true;
  root.add(crownPlaceholder);

  root.updateMatrixWorld(true);
  const geometryCounts = countGeometry(root);
  const bounds = new THREE.Box3().setFromObject(root);
  root.userData.meshCount = geometryCounts.meshCount;
  root.userData.triangleCount = geometryCounts.triangleCount;
  root.userData.bounds = {
    minimum: roundTuple(bounds.min),
    maximum: roundTuple(bounds.max),
  };

  return root;
}
