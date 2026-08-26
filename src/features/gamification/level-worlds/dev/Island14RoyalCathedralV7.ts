import * as THREE from 'three';

export type Island14RoyalCathedralV7Level = 1 | 2 | 3;

/**
 * This intentionally names a structural subset of Island 014's world
 * materials. The existing Island14HoneycombMaterials object satisfies this
 * interface without the palace factory importing or owning the world module.
 */
export interface Island14RoyalCathedralV7Materials {
  honeyRock: THREE.Material;
  waxCream: THREE.Material;
  warmGold: THREE.Material;
  paleGold: THREE.Material;
  darkBronze: THREE.Material;
  royalPurple: THREE.Material;
  honeyGlass: THREE.Material;
  honeyLiquid: THREE.Material;
  honeyHighlight: THREE.Material;
  warmWindow: THREE.Material;
}

type ConstructionStage = 1 | 2 | 3 | 4 | 5;
type SemanticRole =
  | 'foundation'
  | 'cathedral-body'
  | 'royal-entrance'
  | 'tower-bay'
  | 'central-lantern'
  | 'civic-tracery'
  | 'authored-elevation'
  | 'honey-finish';

interface RuntimePart {
  id: string;
  object: THREE.Group;
  role: SemanticRole;
}

const tagGroup = (group: THREE.Group, id: string, role: SemanticRole) => {
  group.name = `ISLAND_14_CATHEDRAL_V7_${id.toUpperCase().replace(/-/g, '_')}`;
  group.userData.partId = id;
  group.userData.semanticRole = role;
  group.userData.selectablePartId = id;
  return group;
};

const addMesh = (
  target: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  partId: string,
  semanticRole: SemanticRole,
  stage: ConstructionStage,
  explodeWithParent = false,
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.partId = partId;
  mesh.userData.selectablePartId = partId;
  mesh.userData.semanticRole = semanticRole;
  mesh.userData.constructionStage = stage;
  mesh.userData.explodeWithParent = explodeWithParent;
  target.add(mesh);
  return mesh;
};

const addBox = (
  target: THREE.Group,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
  explodeWithParent = false,
) => {
  const mesh = addMesh(
    target,
    new THREE.BoxGeometry(...size),
    material,
    name,
    partId,
    role,
    stage,
    explodeWithParent,
  );
  mesh.position.set(...position);
  return mesh;
};

const addCylinder = (
  target: THREE.Group,
  radii: readonly [number, number],
  height: number,
  position: readonly [number, number, number],
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
  segments = 8,
  explodeWithParent = false,
) => {
  const mesh = addMesh(
    target,
    new THREE.CylinderGeometry(radii[0], radii[1], height, segments),
    material,
    name,
    partId,
    role,
    stage,
    explodeWithParent,
  );
  mesh.position.set(...position);
  return mesh;
};

const addBeamBetween = (
  target: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
  explodeWithParent = true,
) => {
  const direction = end.clone().sub(start);
  const beam = addCylinder(
    target,
    [radius, radius],
    direction.length(),
    [0, 0, 0],
    material,
    name,
    partId,
    role,
    stage,
    8,
    explodeWithParent,
  );
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
};

const addSphere = (
  target: THREE.Group,
  radius: number,
  scale: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
  explodeWithParent = false,
) => {
  const mesh = addMesh(
    target,
    new THREE.SphereGeometry(radius, 14, 10),
    material,
    name,
    partId,
    role,
    stage,
    explodeWithParent,
  );
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  return mesh;
};

const regularPolygon = (radius: number, sides: number, rotation = Math.PI / 6) => (
  Array.from({ length: sides }, (_, index) => {
    const angle = rotation + index / sides * Math.PI * 2;
    return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  })
);

const pointedArch = (width: number, height: number, springY: number, baseY = 0) => [
  new THREE.Vector2(-width / 2, baseY),
  new THREE.Vector2(width / 2, baseY),
  new THREE.Vector2(width / 2, springY),
  new THREE.Vector2(width * 0.35, springY + (height - springY) * 0.25),
  new THREE.Vector2(0, height),
  new THREE.Vector2(-width * 0.35, springY + (height - springY) * 0.25),
  new THREE.Vector2(-width / 2, springY),
];

const createShape = (points: THREE.Vector2[], holes: THREE.Vector2[][] = []) => {
  const shape = new THREE.Shape(points);
  holes.forEach((holePoints) => {
    shape.holes.push(new THREE.Path([...holePoints].reverse()));
  });
  return shape;
};

const addExtrusion = (
  target: THREE.Group,
  shape: THREE.Shape,
  depth: number,
  position: readonly [number, number, number],
  rotationY: number,
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
  explodeWithParent = false,
  bevel = 0.025,
) => {
  const mesh = addMesh(
    target,
    new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      bevelEnabled: bevel > 0,
      bevelSegments: bevel > 0 ? 2 : 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 2,
    }),
    material,
    name,
    partId,
    role,
    stage,
    explodeWithParent,
  );
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  return mesh;
};

const addHexCell = (
  target: THREE.Group,
  options: {
    prefix: string;
    partId: string;
    position: readonly [number, number, number];
    radius: number;
    rotationY: number;
    frame: THREE.Material;
    inset: THREE.Material;
    stage: ConstructionStage;
    confidence?: 'exact-visible' | 'secondary-inferred';
    frameDepth?: number;
    burialDepth?: number;
  },
) => {
  const { prefix, partId, position, radius, rotationY, frame, inset, stage } = options;
  const frameDepth = options.frameDepth ?? 0.09;
  const burialDepth = options.burialDepth ?? 0.014;
  const outwardNormal = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const buriedPosition = new THREE.Vector3(...position).addScaledVector(outwardNormal, -burialDepth);
  const backing = addExtrusion(
    target,
    createShape(regularPolygon(radius * 0.79, 6)),
    Math.max(0.055, frameDepth * 0.52),
    buriedPosition.toArray() as [number, number, number],
    rotationY,
    inset,
    `${prefix}_OCCUPIED_CELL`,
    partId,
    'civic-tracery',
    stage,
    true,
    0.008,
  );
  const frameMesh = addExtrusion(
    target,
    createShape(regularPolygon(radius, 6), [regularPolygon(radius * 0.70, 6)]),
    frameDepth,
    buriedPosition.toArray() as [number, number, number],
    rotationY,
    frame,
    `${prefix}_CONNECTED_FRAME`,
    partId,
    'civic-tracery',
    stage,
    true,
    0.008,
  );
  backing.userData.sourceConfidence = options.confidence ?? 'exact-visible';
  frameMesh.userData.sourceConfidence = options.confidence ?? 'exact-visible';
};

const addFacetedDome = (
  target: THREE.Group,
  radius: number,
  height: number,
  position: readonly [number, number, number],
  material: THREE.Material,
  name: string,
  partId: string,
  role: SemanticRole,
  stage: ConstructionStage,
) => {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(radius * 0.84, 0),
    new THREE.Vector2(radius, height * 0.18),
    new THREE.Vector2(radius * 0.88, height * 0.43),
    new THREE.Vector2(radius * 0.58, height * 0.72),
    new THREE.Vector2(radius * 0.24, height * 0.92),
    new THREE.Vector2(0, height),
  ];
  const dome = addMesh(
    target,
    new THREE.LatheGeometry(profile, 12),
    material,
    name,
    partId,
    role,
    stage,
  );
  dome.position.set(...position);
  return dome;
};

const addSocket = (
  target: THREE.Group,
  name: string,
  position: readonly [number, number, number],
  socketType: string,
) => {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  socket.userData.socketType = socketType;
  target.add(socket);
  return socket;
};

const addBeeEmblem = (
  target: THREE.Group,
  materials: Island14RoyalCathedralV7Materials,
  partId: string,
  position: readonly [number, number, number],
  scale: number,
) => {
  const emblem = tagGroup(new THREE.Group(), `${partId}-bee-emblem`, 'royal-entrance');
  emblem.position.set(...position);
  emblem.scale.setScalar(scale);
  const body = addSphere(
    emblem,
    0.16,
    [0.72, 1.35, 0.58],
    [0, 0, 0.02],
    materials.warmGold,
    'ISLAND_14_CATHEDRAL_V7_BEE_BODY',
    partId,
    'royal-entrance',
    3,
    true,
  );
  body.rotation.z = 0.05;
  [-1, 1].forEach((side) => {
    const wing = addSphere(
      emblem,
      0.12,
      [1.25, 0.50, 0.20],
      [side * 0.17, 0.02, 0],
      materials.honeyHighlight,
      `ISLAND_14_CATHEDRAL_V7_BEE_WING_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      partId,
      'royal-entrance',
      3,
      true,
    );
    wing.rotation.z = side * 0.45;
  });
  target.add(emblem);
};

const addPalaceLamp = (
  target: THREE.Group,
  materials: Island14RoyalCathedralV7Materials,
  partId: string,
  position: readonly [number, number, number],
  rotationY: number,
  index: number,
) => {
  const outward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const center = new THREE.Vector3(...position);
  const bracketStart = center.clone().addScaledVector(outward, -0.08);
  const bracketEnd = center.clone().addScaledVector(outward, 0.16).add(new THREE.Vector3(0, 0.10, 0));
  addBeamBetween(
    target,
    bracketStart,
    bracketEnd,
    0.035,
    materials.darkBronze,
    `ISLAND_14_CATHEDRAL_V7_ORNAMENT_LAMP_BRACKET_${index}`,
    partId,
    'civic-tracery',
    4,
  );
  addCylinder(
    target,
    [0.075, 0.10],
    0.09,
    bracketEnd.clone().add(new THREE.Vector3(0, -0.035, 0)).toArray() as [number, number, number],
    materials.paleGold,
    `ISLAND_14_CATHEDRAL_V7_ORNAMENT_LAMP_CROWN_${index}`,
    partId,
    'civic-tracery',
    4,
    8,
    true,
  );
  addSphere(
    target,
    0.11,
    [0.78, 1.18, 0.78],
    bracketEnd.clone().add(new THREE.Vector3(0, -0.15, 0)).toArray() as [number, number, number],
    materials.honeyHighlight,
    `ISLAND_14_CATHEDRAL_V7_ORNAMENT_WARM_LAMP_${index}`,
    partId,
    'civic-tracery',
    4,
    true,
  );
};

const addSeatedDomeRibs = (
  target: THREE.Group,
  materials: Island14RoyalCathedralV7Materials,
  options: {
    prefix: string;
    partId: string;
    center: readonly [number, number, number];
    radius: number;
    height: number;
    ribCount: number;
    ribRadius: number;
    collarFraction: number;
    stage: ConstructionStage;
  },
) => {
  const { prefix, partId, center, radius, height, ribCount, ribRadius, collarFraction, stage } = options;
  const profile = [
    { radial: radius * 0.84, y: height * 0.015 },
    { radial: radius * 0.98, y: height * 0.18 },
    { radial: radius * 0.86, y: height * 0.43 },
    { radial: radius * 0.57, y: height * 0.72 },
    { radial: radius * 0.22, y: height * 0.92 },
    { radial: radius * 0.05, y: height * 0.985 },
  ];
  for (let ribIndex = 0; ribIndex < ribCount; ribIndex += 1) {
    const angle = ribIndex / ribCount * Math.PI * 2;
    for (let segmentIndex = 0; segmentIndex < profile.length - 1; segmentIndex += 1) {
      const startProfile = profile[segmentIndex];
      const endProfile = profile[segmentIndex + 1];
      const point = (sample: { radial: number; y: number }) => new THREE.Vector3(
        center[0] + Math.sin(angle) * sample.radial,
        center[1] + sample.y,
        center[2] + Math.cos(angle) * sample.radial,
      );
      addBeamBetween(
        target,
        point(startProfile),
        point(endProfile),
        ribRadius,
        materials.paleGold,
        `${prefix}_SEATED_RIB_${ribIndex + 1}_${segmentIndex + 1}`,
        partId,
        'civic-tracery',
        stage,
      );
    }
  }
  const collarY = center[1] + height * collarFraction;
  const collarRadius = radius * (collarFraction < 0.30 ? 0.96 : 0.78);
  const collar = addMesh(
    target,
    new THREE.TorusGeometry(collarRadius, ribRadius * 0.88, 7, 36),
    materials.paleGold,
    `${prefix}_SEATED_LATITUDE_COLLAR`,
    partId,
    'civic-tracery',
    stage,
    true,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(center[0], collarY, center[2]);
};

const addHoneyCurtain = (
  target: THREE.Group,
  materials: Island14RoyalCathedralV7Materials,
  options: {
    prefix: string;
    partId: string;
    position: readonly [number, number, number];
    rotationY: number;
    width: number;
    drop: number;
  },
) => {
  const { prefix, partId, position, rotationY, width, drop } = options;
  const shape = createShape([
    new THREE.Vector2(-width / 2, 0.04),
    new THREE.Vector2(width / 2, 0.04),
    new THREE.Vector2(width / 2, -drop * 0.32),
    new THREE.Vector2(width * 0.30, -drop * 0.43),
    new THREE.Vector2(width * 0.16, -drop * 0.82),
    new THREE.Vector2(0, -drop),
    new THREE.Vector2(-width * 0.16, -drop * 0.82),
    new THREE.Vector2(-width * 0.30, -drop * 0.43),
    new THREE.Vector2(-width / 2, -drop * 0.32),
  ]);
  addExtrusion(
    target,
    shape,
    0.18,
    position,
    rotationY,
    materials.honeyLiquid,
    `${prefix}_THICK_SAGGING_CURTAIN`,
    partId,
    'honey-finish',
    5,
    true,
    0.035,
  );
  const localDropCenters = [-0.28, 0.02, 0.29];
  localDropCenters.forEach((localX, index) => {
    const worldX = position[0] + Math.cos(rotationY) * localX * width;
    const worldZ = position[2] - Math.sin(rotationY) * localX * width;
    const length = drop * (index === 1 ? 0.78 : 0.50);
    addCylinder(
      target,
      [0.045, 0.075],
      length,
      [worldX, position[1] - drop * 0.38 - length / 2, worldZ + Math.cos(rotationY) * 0.10],
      materials.honeyLiquid,
      `${prefix}_VOLUMETRIC_STREAM_${index + 1}`,
      partId,
      'honey-finish',
      5,
      10,
      true,
    );
    addSphere(
      target,
      0.09,
      [0.82, 1.35, 0.82],
      [worldX, position[1] - drop * 0.38 - length - 0.06, worldZ + Math.cos(rotationY) * 0.10],
      materials.honeyLiquid,
      `${prefix}_WEIGHTED_DROP_${index + 1}`,
      partId,
      'honey-finish',
      5,
      true,
    );
  });
};

/**
 * Builds a new, broad cathedral construction family for Island 014.
 * Front is +Z and the palace is bottom-anchored at Y=0.
 */
export function createIsland14RoyalCathedralV7(
  level: Island14RoyalCathedralV7Level,
  materials: Island14RoyalCathedralV7Materials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_14_ROYAL_CATHEDRAL_V7';
  const runtimeParts: RuntimePart[] = [];

  const createPart = (id: string, role: SemanticRole) => {
    const part = tagGroup(new THREE.Group(), id, role);
    root.add(part);
    runtimeParts.push({ id, object: part, role });
    return part;
  };

  const foundation = createPart('foundation-and-terraces', 'foundation');
  addCylinder(
    foundation,
    [2.18, 2.36],
    0.34,
    [0, 0.17, 0],
    materials.honeyRock,
    'ISLAND_14_CATHEDRAL_V7_ROYAL_COURT',
    'foundation-and-terraces',
    'foundation',
    1,
    12,
  );
  addCylinder(
    foundation,
    [2.08, 2.18],
    0.15,
    [0, 0.415, 0],
    materials.warmGold,
    'ISLAND_14_CATHEDRAL_V7_COURT_CAP',
    'foundation-and-terraces',
    'foundation',
    1,
    12,
  );
  for (let index = 0; index < 8; index += 1) {
    const width = 1.90 - index * 0.06;
    addBox(
      foundation,
      [width, 0.10, 0.34],
      [0, 0.11 + index * 0.075, 2.10 - index * 0.14],
      index % 2 === 0 ? materials.paleGold : materials.warmGold,
      `ISLAND_14_CATHEDRAL_V7_ROYAL_STAIR_${index + 1}`,
      'foundation-and-terraces',
      'foundation',
      1,
    );
  }
  addBox(
    foundation,
    [1.82, 0.15, 0.60],
    [0, 0.61, 1.56],
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_PROCESSIONAL_LANDING',
    'foundation-and-terraces',
    'foundation',
    1,
    true,
  );
  [-1, 1].forEach((side) => {
    addBox(
      foundation,
      [0.34, 0.30, 1.22],
      [side * 1.47, 0.60, 1.14],
      materials.warmGold,
      `ISLAND_14_CATHEDRAL_V7_FRONT_TERRACE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      'foundation-and-terraces',
      'foundation',
      1,
    );
  });

  const body = createPart('broad-gabled-cathedral-body', 'cathedral-body');
  addBox(
    body,
    [3.70, 0.34, 2.70],
    [0, 0.67, 0],
    materials.honeyRock,
    'ISLAND_14_CATHEDRAL_V7_DEEP_PLINTH',
    'broad-gabled-cathedral-body',
    'cathedral-body',
    2,
  );
  const naveProfile = createShape([
    new THREE.Vector2(-1.58, 0),
    new THREE.Vector2(1.58, 0),
    new THREE.Vector2(1.58, 1.16),
    new THREE.Vector2(0.92, 1.16),
    new THREE.Vector2(0, 2.03),
    new THREE.Vector2(-0.92, 1.16),
    new THREE.Vector2(-1.58, 1.16),
  ]);
  addExtrusion(
    body,
    naveProfile,
    2.42,
    [0, 0.68, -1.21],
    0,
    materials.waxCream,
    'ISLAND_14_CATHEDRAL_V7_CONTINUOUS_GABLED_NAVE',
    'broad-gabled-cathedral-body',
    'cathedral-body',
    2,
    false,
    0.055,
  );
  addBox(
    body,
    [4.08, 0.92, 1.58],
    [0, 1.23, -0.06],
    materials.warmGold,
    'ISLAND_14_CATHEDRAL_V7_INTERSECTING_TRANSEPT',
    'broad-gabled-cathedral-body',
    'cathedral-body',
    2,
  );
  addBox(
    body,
    [3.36, 0.10, 0.14],
    [0, 1.79, 1.26],
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_FRONT_CONTINUOUS_EAVE',
    'broad-gabled-cathedral-body',
    'cathedral-body',
    2,
    true,
  );
  addBox(
    body,
    [3.36, 0.10, 0.14],
    [0, 1.79, -1.26],
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_REAR_CONTINUOUS_EAVE',
    'broad-gabled-cathedral-body',
    'cathedral-body',
    2,
    true,
  );
  [-1, 1].forEach((side) => {
    addBox(
      body,
      [0.14, 0.10, 2.40],
      [side * 1.63, 1.79, 0],
      materials.paleGold,
      `ISLAND_14_CATHEDRAL_V7_${side < 0 ? 'LEFT' : 'RIGHT'}_CONTINUOUS_EAVE`,
      'broad-gabled-cathedral-body',
      'cathedral-body',
      2,
      true,
    );
    addBox(
      body,
      [0.20, 1.26, 0.36],
      [side * 1.72, 1.18, 0.78],
      materials.warmGold,
      `ISLAND_14_CATHEDRAL_V7_FRONT_BUTTRESS_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      'broad-gabled-cathedral-body',
      'cathedral-body',
      2,
      true,
    );
    addBox(
      body,
      [0.20, 1.10, 0.36],
      [side * 1.72, 1.10, -0.78],
      materials.warmGold,
      `ISLAND_14_CATHEDRAL_V7_REAR_BUTTRESS_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      'broad-gabled-cathedral-body',
      'cathedral-body',
      2,
      true,
    );
  });

  const entrance = createPart('deep-royal-entrance', 'royal-entrance');
  addExtrusion(
    entrance,
    createShape(pointedArch(1.42, 1.78, 0.98), [pointedArch(1.14, 1.53, 0.88, 0.08)]),
    0.22,
    [0, 0.66, 1.18],
    0,
    materials.warmGold,
    'ISLAND_14_CATHEDRAL_V7_PROCESSIONAL_OUTER_PORTAL',
    'deep-royal-entrance',
    'royal-entrance',
    2,
    false,
    0.035,
  );
  addExtrusion(
    entrance,
    createShape(pointedArch(1.10, 1.48, 0.82), [pointedArch(0.78, 1.20, 0.70, 0.10)]),
    0.30,
    [0, 0.69, 1.19],
    0,
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_DEEP_POINTED_PORTAL',
    'deep-royal-entrance',
    'royal-entrance',
    2,
    false,
    0.035,
  );
  addExtrusion(
    entrance,
    createShape(pointedArch(0.76, 1.17, 0.68, 0.10)),
    0.08,
    [0, 0.70, 1.41],
    0,
    materials.darkBronze,
    'ISLAND_14_CATHEDRAL_V7_PORTAL_RECESS',
    'deep-royal-entrance',
    'royal-entrance',
    2,
  );
  addExtrusion(
    entrance,
    createShape(pointedArch(0.62, 0.94, 0.60)),
    0.07,
    [0, 0.79, 1.49],
    0,
    materials.royalPurple,
    'ISLAND_14_CATHEDRAL_V7_PURPLE_DOUBLE_DOOR',
    'deep-royal-entrance',
    'royal-entrance',
    2,
    false,
    0.018,
  );
  addBox(
    entrance,
    [0.025, 0.72, 0.055],
    [0, 1.15, 1.585],
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_DOOR_CENTER_SEAM',
    'deep-royal-entrance',
    'royal-entrance',
    3,
    true,
  );
  [-1, 1].forEach((side) => {
    addCylinder(
      entrance,
      [0.10, 0.13],
      1.20,
      [side * 0.66, 1.30, 1.42],
      materials.paleGold,
      `ISLAND_14_CATHEDRAL_V7_PORTAL_COLUMN_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      'deep-royal-entrance',
      'royal-entrance',
      3,
      8,
      true,
    );
    addSphere(
      entrance,
      0.042,
      [1, 1, 0.75],
      [side * 0.09, 1.10, 1.62],
      materials.honeyHighlight,
      `ISLAND_14_CATHEDRAL_V7_DOOR_HANDLE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      'deep-royal-entrance',
      'royal-entrance',
      3,
      true,
    );
  });
  addBeeEmblem(entrance, materials, 'deep-royal-entrance', [0, 1.47, 1.64], 0.92);
  addSocket(entrance, 'ISLAND_14_CATHEDRAL_V7_FRONT_DOOR_SOCKET', [0, 1.05, 1.72], 'landmark-entry');

  const facadeTracery = createPart('front-honeycomb-civic-tracery', 'civic-tracery');
  const facadeRows = [
    { y: 1.08, xs: [-1.28, -0.94, 0.94, 1.28] },
    { y: 1.38, xs: [-1.12, -0.78, 0.78, 1.12] },
    { y: 1.68, xs: [-1.27, -0.93, -0.59, 0.59, 0.93, 1.27] },
    { y: 1.98, xs: [-0.86, -0.52, -0.18, 0.18, 0.52, 0.86] },
    { y: 2.27, xs: [-0.50, -0.17, 0.17, 0.50] },
  ];
  const includedFacadeRows = level === 1 ? facadeRows.slice(0, 3) : facadeRows;
  includedFacadeRows.forEach((row, rowIndex) => {
    row.xs.forEach((x, cellIndex) => {
      addHexCell(facadeTracery, {
        prefix: `ISLAND_14_CATHEDRAL_V7_FRONT_CELL_R${rowIndex + 1}_C${cellIndex + 1}`,
        partId: 'front-honeycomb-civic-tracery',
        // Start the relief inside the nave's +Z face (1.21) so every cell is
        // visibly welded to the cathedral instead of hovering as a badge.
        position: [x, row.y, 1.205],
        radius: 0.19,
        rotationY: 0,
        frame: materials.paleGold,
        inset: (rowIndex + cellIndex) % 3 === 0 ? materials.honeyGlass : materials.darkBronze,
        stage: rowIndex < 3 ? 3 : 4,
      });
    });
  });
  [1.24, 1.72].forEach((y, bandIndex) => {
    addBox(
      facadeTracery,
      [3.06 - bandIndex * 0.34, 0.055, 0.10],
      [0, y, 1.255],
      materials.warmGold,
      `ISLAND_14_CATHEDRAL_V7_FRONT_CONNECTED_CIVIC_BAND_${bandIndex + 1}`,
      'front-honeycomb-civic-tracery',
      'civic-tracery',
      3,
      true,
    );
  });
  addBeamBetween(
    facadeTracery,
    new THREE.Vector3(-0.92, 1.84, 1.285),
    new THREE.Vector3(0, 2.71, 1.285),
    0.045,
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_FRONT_GABLE_RIB_LEFT',
    'front-honeycomb-civic-tracery',
    'civic-tracery',
    4,
  );
  addBeamBetween(
    facadeTracery,
    new THREE.Vector3(0, 2.71, 1.285),
    new THREE.Vector3(0.92, 1.84, 1.285),
    0.045,
    materials.paleGold,
    'ISLAND_14_CATHEDRAL_V7_FRONT_GABLE_RIB_RIGHT',
    'front-honeycomb-civic-tracery',
    'civic-tracery',
    4,
  );

  if (level >= 2) {
    const ornamentSystem = createPart('palace-ornament-system', 'civic-tracery');
    const towerAssembly = createPart('four-integrated-tower-bays', 'tower-bay');
    const towerSites = [
      { x: -1.48, z: 0.70, label: 'FRONT_LEFT' },
      { x: 1.48, z: 0.70, label: 'FRONT_RIGHT' },
      { x: -1.48, z: -0.70, label: 'REAR_LEFT' },
      { x: 1.48, z: -0.70, label: 'REAR_RIGHT' },
    ];
    towerSites.forEach(({ x, z, label }, index) => {
      addCylinder(
        towerAssembly,
        [0.43, 0.51],
        0.24,
        [x, 0.76, z],
        materials.honeyRock,
        `ISLAND_14_CATHEDRAL_V7_${label}_BAY_BASE`,
        'four-integrated-tower-bays',
        'tower-bay',
        3,
        8,
      );
      addCylinder(
        towerAssembly,
        [0.34, 0.40],
        1.14,
        [x, 1.42, z],
        index % 2 === 0 ? materials.warmGold : materials.waxCream,
        `ISLAND_14_CATHEDRAL_V7_${label}_VERTICAL_BAY_BODY`,
        'four-integrated-tower-bays',
        'tower-bay',
        3,
        8,
      );
      addCylinder(
        towerAssembly,
        [0.41, 0.41],
        0.10,
        [x, 2.02, z],
        materials.paleGold,
        `ISLAND_14_CATHEDRAL_V7_${label}_DOME_COLLAR`,
        'four-integrated-tower-bays',
        'tower-bay',
        3,
        8,
        true,
      );
      addFacetedDome(
        towerAssembly,
        0.42,
        0.43,
        [x, 2.04, z],
        materials.honeyGlass,
        `ISLAND_14_CATHEDRAL_V7_${label}_SOLID_FACETED_DOME`,
        'four-integrated-tower-bays',
        'tower-bay',
        4,
      );
      addSeatedDomeRibs(ornamentSystem, materials, {
        prefix: `ISLAND_14_CATHEDRAL_V7_${label}_DOME`,
        partId: 'palace-ornament-system',
        center: [x, 2.04, z],
        radius: 0.42,
        height: 0.43,
        ribCount: 4,
        ribRadius: 0.020,
        collarFraction: 0.25,
        stage: 4,
      });
      const frontDirection = z > 0 ? 0 : Math.PI;
      addHexCell(towerAssembly, {
        prefix: `ISLAND_14_CATHEDRAL_V7_${label}_OUTER_CELL`,
        partId: 'four-integrated-tower-bays',
        position: [x, 1.48, z + Math.sign(z) * 0.39],
        radius: 0.22,
        rotationY: frontDirection,
        frame: materials.paleGold,
        inset: materials.warmWindow,
        stage: 4,
        confidence: z > 0 ? 'exact-visible' : 'secondary-inferred',
        frameDepth: 0.14,
        burialDepth: 0.035,
      });
      addHexCell(towerAssembly, {
        prefix: `ISLAND_14_CATHEDRAL_V7_${label}_SIDE_CELL`,
        partId: 'four-integrated-tower-bays',
        position: [x + Math.sign(x) * 0.39, 1.43, z],
        radius: 0.19,
        rotationY: Math.sign(x) * Math.PI / 2,
        frame: materials.paleGold,
        inset: materials.darkBronze,
        stage: 4,
        confidence: 'secondary-inferred',
        frameDepth: 0.13,
        burialDepth: 0.035,
      });
    });

    const lantern = createPart('central-glazed-hex-cell-lantern', 'central-lantern');
    addCylinder(
      lantern,
      [0.78, 0.90],
      0.28,
      [0, 2.34, -0.02],
      materials.warmGold,
      'ISLAND_14_CATHEDRAL_V7_LANTERN_BURIED_BASE',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      3,
      8,
    );
    addCylinder(
      lantern,
      [0.66, 0.76],
      1.26,
      [0, 3.08, -0.02],
      materials.darkBronze,
      'ISLAND_14_CATHEDRAL_V7_TALL_HEX_LANTERN_BODY',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      3,
      6,
    );
    addCylinder(
      lantern,
      [0.88, 0.88],
      0.10,
      [0, 3.69, -0.02],
      materials.warmGold,
      'ISLAND_14_CATHEDRAL_V7_LANTERN_ROYAL_GALLERY',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      4,
      12,
      true,
    );
    addCylinder(
      lantern,
      [0.82, 0.82],
      0.055,
      [0, 3.755, -0.02],
      materials.paleGold,
      'ISLAND_14_CATHEDRAL_V7_LANTERN_GALLERY_GLAZED_RIM',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      4,
      12,
      true,
    );
    for (let buttressIndex = 0; buttressIndex < 6; buttressIndex += 1) {
      const angle = buttressIndex / 6 * Math.PI * 2;
      addBeamBetween(
        lantern,
        new THREE.Vector3(Math.sin(angle) * 0.91, 2.36, -0.02 + Math.cos(angle) * 0.91),
        new THREE.Vector3(Math.sin(angle) * 0.68, 2.68, -0.02 + Math.cos(angle) * 0.68),
        0.055,
        materials.warmGold,
        `ISLAND_14_CATHEDRAL_V7_LANTERN_RADIAL_BUTTRESS_${buttressIndex + 1}`,
        'central-glazed-hex-cell-lantern',
        'central-lantern',
        4,
      );
    }
    // Turn the lantern into a civic honeycomb tower rather than a blank drum:
    // six structural corner ribs and two continuous collars keep the gold
    // lattice readable between every window from front, profile and rear.
    for (let ribIndex = 0; ribIndex < 6; ribIndex += 1) {
      const angle = ribIndex / 6 * Math.PI * 2 + Math.PI / 6;
      addCylinder(
        lantern,
        [0.055, 0.065],
        1.22,
        [Math.sin(angle) * 0.70, 3.08, -0.02 + Math.cos(angle) * 0.70],
        materials.paleGold,
        `ISLAND_14_CATHEDRAL_V7_LANTERN_CORNER_RIB_${ribIndex + 1}`,
        'central-glazed-hex-cell-lantern',
        'central-lantern',
        4,
        8,
        true,
      );
    }
    [2.55, 3.64].forEach((y, bandIndex) => {
      const collar = addMesh(
        lantern,
        new THREE.TorusGeometry(0.72, 0.035, 7, 30),
        materials.paleGold,
        `ISLAND_14_CATHEDRAL_V7_LANTERN_TRACERY_COLLAR_${bandIndex + 1}`,
        'central-glazed-hex-cell-lantern',
        'central-lantern',
        4,
        true,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, y, -0.02);
    });
    [2.76, 3.20, 3.50].forEach((y, rowIndex) => {
      for (let face = 0; face < 6; face += 1) {
        const angle = face / 6 * Math.PI * 2;
        addHexCell(lantern, {
          prefix: `ISLAND_14_CATHEDRAL_V7_LANTERN_R${rowIndex + 1}_F${face + 1}`,
          partId: 'central-glazed-hex-cell-lantern',
          position: [Math.sin(angle) * 0.69, y, -0.02 + Math.cos(angle) * 0.69],
          radius: rowIndex === 1 ? 0.30 : 0.25,
          rotationY: angle,
          frame: materials.paleGold,
          inset: rowIndex === 1 ? materials.honeyGlass : materials.warmWindow,
          stage: 4,
          confidence: face < 2 || face === 5 ? 'exact-visible' : 'secondary-inferred',
          frameDepth: 0.20,
          burialDepth: 0.055,
        });
      }
    });
    addCylinder(
      lantern,
      [0.73, 0.73],
      0.11,
      [0, 3.75, -0.02],
      materials.paleGold,
      'ISLAND_14_CATHEDRAL_V7_LANTERN_DOME_COLLAR',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      4,
      12,
      true,
    );
    addFacetedDome(
      lantern,
      0.74,
      0.64,
      [0, 3.77, -0.02],
      materials.honeyGlass,
      'ISLAND_14_CATHEDRAL_V7_SOLID_AMBER_HERO_DOME',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      4,
    );
    addSeatedDomeRibs(ornamentSystem, materials, {
      prefix: 'ISLAND_14_CATHEDRAL_V7_HERO_DOME',
      partId: 'palace-ornament-system',
      center: [0, 3.77, -0.02],
      radius: 0.74,
      height: 0.64,
      ribCount: 8,
      ribRadius: 0.026,
      collarFraction: 0.25,
      stage: 4,
    });
    for (let face = 0; face < 6; face += 1) {
      const angle = face / 6 * Math.PI * 2;
      addHexCell(ornamentSystem, {
        prefix: `ISLAND_14_CATHEDRAL_V7_GALLERY_TRIM_CELL_${face + 1}`,
        partId: 'palace-ornament-system',
        position: [Math.sin(angle) * 0.83, 3.72, -0.02 + Math.cos(angle) * 0.83],
        radius: 0.09,
        rotationY: angle,
        frame: materials.paleGold,
        inset: materials.honeyGlass,
        stage: 4,
        confidence: face < 2 || face === 5 ? 'exact-visible' : 'secondary-inferred',
        frameDepth: 0.11,
        burialDepth: 0.025,
      });
    }
    addCylinder(
      lantern,
      [0.08, 0.13],
      0.30,
      [0, 4.53, -0.02],
      materials.paleGold,
      'ISLAND_14_CATHEDRAL_V7_CROWN_FINIAL',
      'central-glazed-hex-cell-lantern',
      'central-lantern',
      5,
      8,
    );
    addBeeEmblem(
      ornamentSystem,
      materials,
      'palace-ornament-system',
      [0, 3.19, 0.72],
      1.34,
    );
    [
      { position: [-1.83, 1.48, 1.31] as const, rotationY: 0 },
      { position: [1.83, 1.48, 1.31] as const, rotationY: 0 },
      { position: [-2.08, 1.40, 0.38] as const, rotationY: -Math.PI / 2 },
      { position: [2.08, 1.40, 0.38] as const, rotationY: Math.PI / 2 },
    ].forEach(({ position, rotationY }, index) => {
      addPalaceLamp(
        ornamentSystem,
        materials,
        'palace-ornament-system',
        position,
        rotationY,
        index + 1,
      );
    });
    addSocket(lantern, 'ISLAND_14_CATHEDRAL_V7_CROWN_FX_SOCKET', [0, 4.92, -0.02], 'commissioning-fx');

    const elevations = createPart('authored-side-and-rear-elevations', 'authored-elevation');
    [-1, 1].forEach((side) => {
      const label = side < 0 ? 'LEFT' : 'RIGHT';
      addExtrusion(
        elevations,
        createShape([
          new THREE.Vector2(-0.74, 0),
          new THREE.Vector2(0.74, 0),
          new THREE.Vector2(0.74, 0.82),
          new THREE.Vector2(0, 1.45),
          new THREE.Vector2(-0.74, 0.82),
        ]),
        0.72,
        [side * 1.72, 0.72, 0],
        side * Math.PI / 2,
        materials.waxCream,
        `ISLAND_14_CATHEDRAL_V7_${label}_INTERSECTING_GABLED_CHAPEL`,
        'authored-side-and-rear-elevations',
        'authored-elevation',
        3,
        false,
        0.04,
      );
      addBeamBetween(
        elevations,
        new THREE.Vector3(side * 2.455, 1.54, -0.74),
        new THREE.Vector3(side * 2.455, 2.17, 0),
        0.045,
        materials.paleGold,
        `ISLAND_14_CATHEDRAL_V7_${label}_GABLE_RIB_REAR`,
        'authored-side-and-rear-elevations',
        'authored-elevation',
        4,
      );
      addBeamBetween(
        elevations,
        new THREE.Vector3(side * 2.455, 2.17, 0),
        new THREE.Vector3(side * 2.455, 1.54, 0.74),
        0.045,
        materials.paleGold,
        `ISLAND_14_CATHEDRAL_V7_${label}_GABLE_RIB_FRONT`,
        'authored-side-and-rear-elevations',
        'authored-elevation',
        4,
      );
      addBeamBetween(
        elevations,
        new THREE.Vector3(side * 2.455, 1.54, -0.74),
        new THREE.Vector3(side * 2.455, 1.54, 0.74),
        0.04,
        materials.warmGold,
        `ISLAND_14_CATHEDRAL_V7_${label}_CONNECTED_EAVE_RIB`,
        'authored-side-and-rear-elevations',
        'authored-elevation',
        4,
      );
      [-0.62, -0.31, 0, 0.31, 0.62].forEach((z, index) => {
        addHexCell(elevations, {
          prefix: `ISLAND_14_CATHEDRAL_V7_${label}_ELEVATION_CELL_${index + 1}`,
          partId: 'authored-side-and-rear-elevations',
          position: [side * 2.405, 1.26 + (index % 2) * 0.30, z],
          radius: 0.18,
          rotationY: side * Math.PI / 2,
          frame: materials.paleGold,
          inset: index % 2 === 0 ? materials.darkBronze : materials.warmWindow,
          stage: 4,
          confidence: 'secondary-inferred',
          frameDepth: 0.14,
          burialDepth: 0.035,
        });
      });
      addHexCell(elevations, {
        prefix: `ISLAND_14_CATHEDRAL_V7_${label}_OCCUPIED_ROYAL_BAY`,
        partId: 'authored-side-and-rear-elevations',
        position: [side * 2.40, 1.90, 0],
        radius: 0.27,
        rotationY: side * Math.PI / 2,
        frame: materials.warmGold,
        inset: materials.honeyGlass,
        stage: 4,
        confidence: 'secondary-inferred',
        frameDepth: 0.19,
        burialDepth: 0.055,
      });
    });
    addExtrusion(
      elevations,
      createShape([
        new THREE.Vector2(-0.76, 0),
        new THREE.Vector2(0.76, 0),
        new THREE.Vector2(0.76, 0.84),
        new THREE.Vector2(0, 1.50),
        new THREE.Vector2(-0.76, 0.84),
      ]),
      0.68,
      [0, 0.72, -0.98],
      Math.PI,
      materials.waxCream,
      'ISLAND_14_CATHEDRAL_V7_REAR_GABLED_APSE',
      'authored-side-and-rear-elevations',
      'authored-elevation',
      3,
      false,
      0.04,
    );
    addBeamBetween(
      elevations,
      new THREE.Vector3(-0.76, 1.56, -1.675),
      new THREE.Vector3(0, 2.22, -1.675),
      0.045,
      materials.paleGold,
      'ISLAND_14_CATHEDRAL_V7_REAR_GABLE_RIB_LEFT',
      'authored-side-and-rear-elevations',
      'authored-elevation',
      4,
    );
    addBeamBetween(
      elevations,
      new THREE.Vector3(0, 2.22, -1.675),
      new THREE.Vector3(0.76, 1.56, -1.675),
      0.045,
      materials.paleGold,
      'ISLAND_14_CATHEDRAL_V7_REAR_GABLE_RIB_RIGHT',
      'authored-side-and-rear-elevations',
      'authored-elevation',
      4,
    );
    [-1, 1].forEach((side) => {
      addBox(
        elevations,
        [0.18, 1.02, 0.24],
        [side * 0.84, 1.22, -1.55],
        materials.warmGold,
        `ISLAND_14_CATHEDRAL_V7_REAR_APSE_BUTTRESS_${side < 0 ? 'LEFT' : 'RIGHT'}`,
        'authored-side-and-rear-elevations',
        'authored-elevation',
        4,
        true,
      );
    });
    [-0.48, 0, 0.48].forEach((x, index) => {
      addHexCell(elevations, {
        prefix: `ISLAND_14_CATHEDRAL_V7_REAR_APSE_CELL_${index + 1}`,
        partId: 'authored-side-and-rear-elevations',
        position: [x, index === 1 ? 1.92 : 1.60, -1.625],
        radius: index === 1 ? 0.25 : 0.19,
        rotationY: Math.PI,
        frame: materials.paleGold,
        inset: index === 1 ? materials.honeyGlass : materials.darkBronze,
        stage: 4,
        confidence: 'secondary-inferred',
        frameDepth: 0.17,
        burialDepth: 0.045,
      });
    });
    const rearRows = [
      { y: 1.12, xs: [-1.22, -0.82, -0.42, 0.42, 0.82, 1.22] },
      { y: 1.50, xs: [-1.02, -0.62, -0.22, 0.22, 0.62, 1.02] },
    ];
    rearRows.forEach((row, rowIndex) => {
      row.xs.forEach((x, index) => {
        addHexCell(elevations, {
          prefix: `ISLAND_14_CATHEDRAL_V7_REAR_CELL_R${rowIndex + 1}_C${index + 1}`,
          partId: 'authored-side-and-rear-elevations',
          position: [x, row.y, -1.205],
          radius: 0.18,
          rotationY: Math.PI,
          frame: materials.paleGold,
          inset: (rowIndex + index) % 2 === 0 ? materials.darkBronze : materials.warmWindow,
          stage: 4,
          confidence: 'secondary-inferred',
        });
      });
    });
    addExtrusion(
      elevations,
      createShape(pointedArch(0.54, 0.82, 0.50)),
      0.10,
      [0, 0.76, -1.70],
      Math.PI,
      materials.royalPurple,
      'ISLAND_14_CATHEDRAL_V7_REAR_SERVICE_DOOR',
      'authored-side-and-rear-elevations',
      'authored-elevation',
      4,
      false,
      0.02,
    );
  }

  if (level >= 3) {
    const honey = createPart('attached-volumetric-honey-finish', 'honey-finish');
    addHoneyCurtain(honey, materials, {
      prefix: 'ISLAND_14_CATHEDRAL_V7_FRONT_HONEY_LEFT',
      partId: 'attached-volumetric-honey-finish',
      position: [-1.10, 1.82, 1.31],
      rotationY: 0,
      width: 0.62,
      drop: 0.48,
    });
    addHoneyCurtain(honey, materials, {
      prefix: 'ISLAND_14_CATHEDRAL_V7_FRONT_HONEY_RIGHT',
      partId: 'attached-volumetric-honey-finish',
      position: [1.12, 1.82, 1.31],
      rotationY: 0,
      width: 0.56,
      drop: 0.42,
    });
    addHoneyCurtain(honey, materials, {
      prefix: 'ISLAND_14_CATHEDRAL_V7_LEFT_HONEY',
      partId: 'attached-volumetric-honey-finish',
      position: [-2.48, 1.72, 0.24],
      rotationY: -Math.PI / 2,
      width: 0.62,
      drop: 0.50,
    });
    addHoneyCurtain(honey, materials, {
      prefix: 'ISLAND_14_CATHEDRAL_V7_REAR_HONEY',
      partId: 'attached-volumetric-honey-finish',
      position: [0.52, 1.72, -1.72],
      rotationY: Math.PI,
      width: 0.58,
      drop: 0.46,
    });
    [
      [-1.11, 0.47, 1.48, 0.34, 0.17],
      [1.12, 0.47, 1.47, 0.31, 0.16],
      [-2.52, 0.47, 0.24, 0.28, 0.18],
      [0.52, 0.47, -1.82, 0.32, 0.16],
    ].forEach(([x, y, z, radiusX, radiusZ], index) => {
      const pool = addCylinder(
        honey,
        [1, 1],
        0.055,
        [x, y, z],
        materials.honeyLiquid,
        `ISLAND_14_CATHEDRAL_V7_ATTACHED_HONEY_POOL_${index + 1}`,
        'attached-volumetric-honey-finish',
        'honey-finish',
        5,
        16,
        true,
      );
      pool.scale.set(radiusX, 1, radiusZ);
      addSphere(
        honey,
        0.07,
        [1.4, 0.32, 0.72],
        [x + radiusX * 0.22, y + 0.04, z],
        materials.honeyHighlight,
        `ISLAND_14_CATHEDRAL_V7_POOL_GLINT_${index + 1}`,
        'attached-volumetric-honey-finish',
        'honey-finish',
        5,
        true,
      );
    });
    addSocket(honey, 'ISLAND_14_CATHEDRAL_V7_HONEY_SPARKLE_SOCKET', [0, 1.88, 1.36], 'honey-sparkles');
  }

  const runtimeNodes = Object.fromEntries(runtimeParts.map(({ id, object }) => [id, object]));
  root.userData.royalCathedralV7 = {
    constructionFamily: 'threejs-broad-gabled-glazed-hex-cell-royal-cathedral',
    boundedQualityRefinement: 'v9-phone-readable-inhabited-cells+seated-dome-ribs+royal-bee-crest+four-warm-lamps',
    buildLevel: level,
    facadeWidth: 4.08,
    footprintDepth: 2.70,
    totalHeight: level >= 2 ? 4.92 : 2.72,
    frontDominantBayCount: level >= 2 ? 4 : 0,
    continuousFrontCellCount: includedFacadeRows.reduce((sum, row) => sum + row.xs.length, 0),
    authoredElevations: level >= 2 ? ['front', 'left', 'right', 'rear'] : ['front'],
    attachedHoneyConstruction: level >= 3 ? 'thick-sagging-curtain+volumetric-stream+weighted-drop+grounded-pool' : 'none',
    prohibitedArchetypesAvoided: [
      'egg-lobe-hive-mound',
      'blank-drum',
      'floating-hex-badges',
      'card-facade',
      'cage-stick-roof',
      'thin-awning-honey',
    ],
  };
  root.userData.sculptRuntime = {
    parts: runtimeParts,
    nodes: runtimeNodes,
    destructionGroups: {
      foundation: ['foundation-and-terraces'],
      cathedralShell: ['broad-gabled-cathedral-body', 'deep-royal-entrance', 'front-honeycomb-civic-tracery'],
      towers: level >= 2 ? ['four-integrated-tower-bays', 'central-glazed-hex-cell-lantern', 'palace-ornament-system'] : [],
      elevations: level >= 2 ? ['authored-side-and-rear-elevations'] : [],
      finish: level >= 3 ? ['attached-volumetric-honey-finish'] : [],
    },
    colliders: [
      { id: 'cathedral-base', type: 'box', center: [0, 1.34, 0], size: [4.08, 2.68, 2.70] },
      ...(level >= 2 ? [{ id: 'central-lantern', type: 'cylinder', center: [0, 3.08, -0.02], radius: 0.90, height: 3.16 }] : []),
    ],
  };
  return root;
}
