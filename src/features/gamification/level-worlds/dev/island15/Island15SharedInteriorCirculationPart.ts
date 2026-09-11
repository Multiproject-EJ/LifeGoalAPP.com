import * as THREE from 'three';

export interface Island15SharedInteriorCirculationMaterials {
  midnight: THREE.Material;
  castleShadow: THREE.Material;
  silver: THREE.Material;
  gold: THREE.Material;
  crystalGlow: THREE.Material;
}

type Point3 = readonly [number, number, number];

const PART_ID = 'shared-interior-circulation';
const FLOOR_PLAN_VERSION = 3;
const BRANCH_ID = 'front-left-return';
const ORACLE_SOCKET: Point3 = [-3.12, 3.45, 2.92];
const ORACLE_RISER_BOTTOM: Point3 = [-3.12, -0.78, 2.92];
const ORACLE_YAW_DEGREES = 126.7;
const CORE_SOCKET: Point3 = [-1.15, 3.45, 1.45];
const CORE_RISER_BOTTOM: Point3 = [-1.15, -0.78, 1.45];
const CORE_YAW_DEGREES = -53.3;
const OUTER_WIDTH = 0.82;
const OUTER_DEPTH = 0.66;
const CLEAR_WIDTH = 0.55;
const COLLAR_OVERLAP = 0.16;
const MAXIMUM_ASSEMBLY_GAP = 0.01;
const SPINE_CENTER_Y = -0.78;
const SPINE_TOP_MAXIMUM_Y = -0.56;
const SPINE_BOTTOM_Y = -1;
const TOWER_TOP_Y = 3.45;
const PLANNED_MESH_COUNT = 49;
const MAXIMUM_MESH_COUNT = 52;
const MAXIMUM_TRIANGLE_COUNT = 2_200;

function markMesh(mesh: THREE.Mesh, role: string) {
  mesh.castShadow = role !== 'buried-service-return';
  mesh.receiveShadow = true;
  mesh.userData.partId = PART_ID;
  mesh.userData.partOwner = PART_ID;
  mesh.userData.branchId = BRANCH_ID;
  mesh.userData.returnRole = role;
  mesh.userData.presentationOnly = true;
  return mesh;
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  position: Point3,
  material: THREE.Material,
  role: string,
) {
  const mesh = markMesh(new THREE.Mesh(new THREE.BoxGeometry(...size), material), role);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function chamferedOutline(width: number, depth: number, chamfer: number) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  return [
    [-halfWidth + chamfer, -halfDepth],
    [halfWidth - chamfer, -halfDepth],
    [halfWidth, -halfDepth + chamfer],
    [halfWidth, halfDepth - chamfer],
    [halfWidth - chamfer, halfDepth],
    [-halfWidth + chamfer, halfDepth],
    [-halfWidth, halfDepth - chamfer],
    [-halfWidth, -halfDepth + chamfer],
  ] as const;
}

function createChamferedRingGeometry(
  outerWidth: number,
  outerDepth: number,
  wallThickness: number,
  height: number,
) {
  const shape = new THREE.Shape();
  const outer = chamferedOutline(outerWidth, outerDepth, Math.min(outerWidth, outerDepth) * 0.14);
  shape.moveTo(...outer[0]);
  outer.slice(1).forEach((point) => shape.lineTo(...point));
  shape.closePath();

  const innerWidth = outerWidth - wallThickness * 2;
  const innerDepth = outerDepth - wallThickness * 2;
  const inner = [...chamferedOutline(
    innerWidth,
    innerDepth,
    Math.min(innerWidth, innerDepth) * 0.12,
  )].reverse();
  const hole = new THREE.Path();
  hole.moveTo(...inner[0]);
  inner.slice(1).forEach((point) => hole.lineTo(...point));
  hole.closePath();
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addChamferedRing(
  parent: THREE.Object3D,
  name: string,
  width: number,
  depth: number,
  wallThickness: number,
  bottomY: number,
  height: number,
  material: THREE.Material,
  role: string,
) {
  const geometry = createChamferedRingGeometry(width, depth, wallThickness, height);
  geometry.translate(0, bottomY, 0);
  const mesh = markMesh(new THREE.Mesh(geometry, material), role);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addLancetFrame(
  parent: THREE.Object3D,
  name: string,
  centerX: number,
  facadeZ: number,
  halfSpan: number,
  baseY: number,
  shoulderY: number,
  crownY: number,
  material: THREE.Material,
  role: string,
) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(centerX - halfSpan, baseY, facadeZ),
    new THREE.Vector3(centerX - halfSpan, shoulderY, facadeZ),
    new THREE.Vector3(centerX, crownY, facadeZ),
    new THREE.Vector3(centerX + halfSpan, shoulderY, facadeZ),
    new THREE.Vector3(centerX + halfSpan, baseY, facadeZ),
  ], false, 'centripetal');
  const mesh = markMesh(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.022, 4, false), material),
    role,
  );
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function createGabledCapGeometry(width: number, depth: number) {
  const halfWidth = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, 0.08);
  shape.lineTo(0, 0.2);
  shape.lineTo(-halfWidth, 0.08);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function buildBuriedServiceReturn(materials: Island15SharedInteriorCirculationMaterials) {
  const start = new THREE.Vector3(...ORACLE_RISER_BOTTOM);
  const end = new THREE.Vector3(...CORE_RISER_BOTTOM);
  const length = start.distanceTo(end) + COLLAR_OVERLAP * 2;
  const spine = new THREE.Group();
  spine.name = 'ISLAND_15_FRONT_LEFT_ARCHITECTURAL_RETURN_BURIED_SPINE';
  spine.position.copy(start).add(end).multiplyScalar(0.5);
  spine.position.y = 0;
  spine.rotation.y = THREE.MathUtils.degToRad(ORACLE_YAW_DEGREES);
  spine.userData.partId = PART_ID;
  spine.userData.branchId = BRANCH_ID;
  spine.userData.role = 'fully-buried-service-return';
  spine.userData.start = [...ORACLE_RISER_BOTTOM];
  spine.userData.end = [...CORE_RISER_BOTTOM];
  spine.userData.yawDegrees = ORACLE_YAW_DEGREES;
  spine.userData.topMaximumY = SPINE_TOP_MAXIMUM_Y;

  addBox(spine, `${spine.name}_FLOOR`, [OUTER_WIDTH, 0.1, length], [0, -0.95, 0], materials.castleShadow, 'buried-service-return');
  addBox(spine, `${spine.name}_ROOF`, [OUTER_WIDTH, 0.08, length], [0, -0.6, 0], materials.castleShadow, 'buried-service-return');
  addBox(spine, `${spine.name}_LEFT_WALL`, [0.135, 0.34, length], [-0.3425, SPINE_CENTER_Y, 0], materials.midnight, 'buried-service-return');
  addBox(spine, `${spine.name}_RIGHT_WALL`, [0.135, 0.34, length], [0.3425, SPINE_CENTER_Y, 0], materials.midnight, 'buried-service-return');
  addBox(spine, `${spine.name}_LEFT_COLD_CONDUIT`, [0.035, 0.035, length], [-0.16, -0.58, 0], materials.crystalGlow, 'buried-service-return');
  addBox(spine, `${spine.name}_RIGHT_COLD_CONDUIT`, [0.035, 0.035, length], [0.16, -0.58, 0], materials.crystalGlow, 'buried-service-return');
  addBox(spine, `${spine.name}_GOLD_DATUM`, [0.045, 0.025, length], [0, -0.575, 0], materials.gold, 'buried-service-return');
  return spine;
}

function buildOccupiedServiceTower(
  role: 'oracle' | 'core',
  socket: Point3,
  bottom: Point3,
  yawDegrees: number,
  materials: Island15SharedInteriorCirculationMaterials,
) {
  const token = role.toUpperCase();
  const tower = new THREE.Group();
  tower.name = `ISLAND_15_FRONT_LEFT_RETURN_${token}_SERVICE_TOWER`;
  tower.position.set(bottom[0], 0, bottom[2]);
  tower.rotation.y = THREE.MathUtils.degToRad(yawDegrees);
  tower.userData.partId = PART_ID;
  tower.userData.partOwner = PART_ID;
  tower.userData.branchId = BRANCH_ID;
  tower.userData.endpointRole = role;
  tower.userData.socket = [...socket];
  tower.userData.bottom = [...bottom];
  tower.userData.yawDegrees = yawDegrees;
  tower.userData.outerWidth = OUTER_WIDTH;
  tower.userData.outerDepth = OUTER_DEPTH;
  tower.userData.clearWidth = CLEAR_WIDTH;
  tower.userData.shellCollarOverlap = COLLAR_OVERLAP;
  tower.userData.localEnvelope = {
    min: [-0.41, -0.78, -0.49],
    max: [0.41, 3.45, 0.33],
  };
  tower.userData.presentationOnly = true;

  const lowerOccupiedTier = addChamferedRing(
    tower,
    `${tower.name}_LOWER_OCCUPIED_TIER`,
    OUTER_WIDTH,
    OUTER_DEPTH,
    (OUTER_WIDTH - CLEAR_WIDTH) * 0.5,
    -0.63,
    1.68,
    materials.midnight,
    'occupied-service-tower',
  );
  lowerOccupiedTier.userData.tierIndex = 1;
  const middleOccupiedTier = addChamferedRing(
    tower,
    `${tower.name}_MIDDLE_SETBACK_OCCUPIED_TIER`,
    0.72,
    0.58,
    0.12,
    1.05,
    1.45,
    materials.midnight,
    'occupied-service-tower',
  );
  middleOccupiedTier.position.z = -0.04;
  middleOccupiedTier.userData.tierIndex = 2;
  middleOccupiedTier.userData.setbackIntoHost = 0.04;
  const upperOccupiedTier = addChamferedRing(
    tower,
    `${tower.name}_UPPER_POROUS_OCCUPIED_TIER`,
    0.56,
    0.46,
    0.095,
    2.5,
    0.77,
    materials.midnight,
    'occupied-service-tower',
  );
  upperOccupiedTier.position.z = -0.09;
  upperOccupiedTier.userData.tierIndex = 3;
  upperOccupiedTier.userData.setbackIntoHost = 0.09;
  addChamferedRing(tower, `${tower.name}_BOTTOM_COLLAR`, OUTER_WIDTH, OUTER_DEPTH, 0.16, -0.78, 0.15, materials.castleShadow, 'occupied-service-tower');
  addChamferedRing(tower, `${tower.name}_TOP_COLLAR`, OUTER_WIDTH, OUTER_DEPTH, 0.15, 3.27, 0.13, materials.silver, 'occupied-service-tower');

  ([-1, 1] as const).forEach((side) => {
    const sideName = side < 0 ? 'LEFT' : 'RIGHT';
    const lowerShoulder = addBox(tower, `${tower.name}_${sideName}_LOWER_SEATED_SHOULDER`, [0.28, 1.16, 0.22], [side * 0.27, 0.61, -0.38], materials.castleShadow, 'occupied-service-tower');
    lowerShoulder.userData.expansionDirection = 'local-x-across-host-foundation';
    lowerShoulder.userData.routeFacingMaximumZ = -0.27;
    const upperShoulder = addBox(tower, `${tower.name}_${sideName}_UPPER_SEATED_SHOULDER`, [0.22, 1.04, 0.18], [side * 0.3, 1.74, -0.38], materials.castleShadow, 'occupied-service-tower');
    upperShoulder.userData.expansionDirection = 'local-x-across-host-foundation';
    upperShoulder.userData.routeFacingMaximumZ = -0.29;
    addBox(tower, `${tower.name}_${sideName}_GOLD_VERTICAL_RIB`, [0.026, 2.9, 0.04], [side * 0.397, 1.88, -0.08], materials.gold, 'occupied-service-tower');
  });

  const occupiedBays = [
    {
      id: 'LOWER_PORTAL',
      x: 0,
      facadeZ: 0.327,
      paneZ: 0.29,
      halfSpan: 0.13,
      baseY: 0,
      shoulderY: 0.72,
      crownY: 0.98,
      paneY: 0.46,
      paneHeight: 0.78,
      paneWidth: 0.22,
    },
    {
      id: 'MIDDLE_LEFT',
      x: -0.17,
      facadeZ: 0.252,
      paneZ: 0.218,
      halfSpan: 0.065,
      baseY: 1.26,
      shoulderY: 2.08,
      crownY: 2.32,
      paneY: 1.7,
      paneHeight: 0.7,
      paneWidth: 0.11,
    },
    {
      id: 'MIDDLE_RIGHT',
      x: 0.17,
      facadeZ: 0.252,
      paneZ: 0.218,
      halfSpan: 0.065,
      baseY: 1.26,
      shoulderY: 2.08,
      crownY: 2.32,
      paneY: 1.7,
      paneHeight: 0.7,
      paneWidth: 0.11,
    },
    {
      id: 'UPPER_RISE',
      x: 0,
      facadeZ: 0.142,
      paneZ: 0.11,
      halfSpan: 0.075,
      baseY: 2.58,
      shoulderY: 3.02,
      crownY: 3.19,
      paneY: 2.84,
      paneHeight: 0.42,
      paneWidth: 0.13,
    },
  ] as const;
  occupiedBays.forEach((bay) => {
    addLancetFrame(
      tower,
      `${tower.name}_${bay.id}_RECESSED_LANCET_FRAME`,
      bay.x,
      bay.facadeZ,
      bay.halfSpan,
      bay.baseY,
      bay.shoulderY,
      bay.crownY,
      materials.silver,
      'occupied-service-tower',
    );
    addBox(
      tower,
      `${tower.name}_${bay.id}_BRIGHT_COLD_PANE`,
      [bay.paneWidth, bay.paneHeight, 0.018],
      [bay.x, bay.paneY, bay.paneZ],
      materials.crystalGlow,
      'occupied-service-tower',
    );
  });

  addChamferedRing(tower, `${tower.name}_GALLERY_BELT`, OUTER_WIDTH, OUTER_DEPTH, 0.055, 2.69, 0.075, materials.gold, 'occupied-service-tower');

  const cap = markMesh(
    new THREE.Mesh(createGabledCapGeometry(OUTER_WIDTH, OUTER_DEPTH), materials.silver),
    'occupied-service-tower',
  );
  cap.name = `${tower.name}_SILVER_SNOW_CAPPED_GABLE`;
  cap.position.y = 3.25;
  cap.userData.snowCapped = true;
  tower.add(cap);

  tower.userData.occupiedTierCount = 3;
  tower.userData.recessedLancetBayCount = occupiedBays.length;
  tower.userData.upperRiseSetback = 0.09;
  tower.userData.shouldersExpandTowardRoute = false;

  return tower;
}

function countGeometry(root: THREE.Object3D) {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = object.geometry;
    triangleCount += geometry.index
      ? geometry.index.count / 3
      : geometry.getAttribute('position').count / 3;
  });
  return { meshCount, triangleCount };
}

function boxToTuple(box: THREE.Box3) {
  return {
    min: box.min.toArray(),
    max: box.max.toArray(),
  };
}

/**
 * Representative Floor Plan V3 front-left architectural return only.
 *
 * The service spine is fully buried. Only its exact Oracle and keep service
 * risers emerge, as a facing pair of occupied Gothic towers. This module owns
 * no route, terrain, room shell, primary connector, roofline, crown, cutaway,
 * lighting, UI, or gameplay behavior.
 */
export function buildIsland15SharedInteriorCirculationPart(
  materials: Island15SharedInteriorCirculationMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_SHARED_INTERIOR_CIRCULATION_PART';
  root.userData.partId = PART_ID;
  root.userData.partKind = 'part';
  root.userData.partModule = 'island15/Island15SharedInteriorCirculationPart';
  root.userData.partFamily = 'architectural-return-system';
  root.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  root.userData.branchId = BRANCH_ID;
  root.userData.returnBranchCount = 1;
  root.userData.expansionBranchCount = 0;
  root.userData.presentationOnly = true;
  root.userData.minimumClearWidth = CLEAR_WIDTH;
  root.userData.minimumSocketOverlap = COLLAR_OVERLAP;
  root.userData.maximumAssemblyGap = MAXIMUM_ASSEMBLY_GAP;
  root.userData.buriedSpineTopMaximumY = SPINE_TOP_MAXIMUM_Y;
  root.userData.maximumVisibleY = TOWER_TOP_Y;
  root.userData.plannedMeshCount = PLANNED_MESH_COUNT;
  root.userData.maximumMeshCount = MAXIMUM_MESH_COUNT;
  root.userData.maximumTriangleCount = MAXIMUM_TRIANGLE_COUNT;
  root.userData.gameplayAuthority = false;
  root.userData.routeAndTileClearancePreserved = true;
  root.userData.cutawayVisibilityWrites = 0;
  root.userData.exclusions = [
    'route',
    'terrain',
    'room-shells',
    'primary-connectors',
    'castle-shell',
    'crown-v3',
    'roofline-v6',
    'cutaway-visibility',
    'lighting',
    'ui',
    'gameplay',
  ];

  const buriedSpine = buildBuriedServiceReturn(materials);
  const oracleTower = buildOccupiedServiceTower(
    'oracle',
    ORACLE_SOCKET,
    ORACLE_RISER_BOTTOM,
    ORACLE_YAW_DEGREES,
    materials,
  );
  const coreTower = buildOccupiedServiceTower(
    'core',
    CORE_SOCKET,
    CORE_RISER_BOTTOM,
    CORE_YAW_DEGREES,
    materials,
  );
  root.add(buriedSpine, oracleTower, coreTower);
  root.updateMatrixWorld(true);

  const geometryCounts = countGeometry(root);
  root.userData.meshCount = geometryCounts.meshCount;
  root.userData.triangleCount = geometryCounts.triangleCount;
  root.userData.bounds = boxToTuple(new THREE.Box3().setFromObject(root));
  root.userData.buriedSpineBounds = boxToTuple(new THREE.Box3().setFromObject(buriedSpine));
  root.userData.oracleTowerBounds = boxToTuple(new THREE.Box3().setFromObject(oracleTower));
  root.userData.coreTowerBounds = boxToTuple(new THREE.Box3().setFromObject(coreTower));
  root.userData.sockets = {
    oracle: [...ORACLE_SOCKET],
    core: [...CORE_SOCKET],
  };

  return root;
}
