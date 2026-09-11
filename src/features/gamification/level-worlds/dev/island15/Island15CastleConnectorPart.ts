import * as THREE from 'three';

export interface Island15CastleConnectorMaterials {
  midnight: THREE.Material;
  castleShadow: THREE.Material;
  silver: THREE.Material;
  gold: THREE.Material;
  crystalGlow: THREE.Material;
}

type Point3 = readonly [number, number, number];

interface ConnectorBranchSpec {
  id: 'north-west-bridge' | 'north-east-bridge' | 'south-west-bridge' | 'south-east-bridge';
  assemblySocket: 'rear-left-wing' | 'rear-right-wing' | 'front-left-wing' | 'front-right-wing';
  spineStart: Point3;
  spineEnd: Point3;
  spineYawDegrees: number;
  fromRiserYawDegrees: number;
  toRiserYawDegrees: number;
  outerWidth: number;
  outerDepth: number;
  clearWidth: number;
}

const FLOOR_PLAN_VERSION = 3;
const SPINE_CENTER_Y = -0.52;
const SPINE_TOP_MAXIMUM_Y = -0.25;
const RISER_BOTTOM_Y = -0.52;
const RISER_TOP_Y = 0.68;
const COLLAR_EXTENT = 0.18;
const MINIMUM_SOCKET_OVERLAP = 0.16;
const MAXIMUM_ASSEMBLY_GAP = 0.01;

const CONNECTOR_BRANCHES: readonly ConnectorBranchSpec[] = [
  {
    id: 'north-west-bridge',
    assemblySocket: 'rear-left-wing',
    spineStart: [-1.35, SPINE_CENTER_Y, -1.75],
    spineEnd: [-2.86, SPINE_CENTER_Y, -2.7],
    spineYawDegrees: -122.2,
    fromRiserYawDegrees: -122.2,
    toRiserYawDegrees: 57.8,
    outerWidth: 1.02,
    outerDepth: 0.82,
    clearWidth: 0.72,
  },
  {
    id: 'north-east-bridge',
    assemblySocket: 'rear-right-wing',
    spineStart: [1.35, SPINE_CENTER_Y, -1.75],
    spineEnd: [2.91, SPINE_CENTER_Y, -2.7],
    spineYawDegrees: 121.3,
    fromRiserYawDegrees: 121.3,
    toRiserYawDegrees: -58.7,
    outerWidth: 1.12,
    outerDepth: 0.9,
    clearWidth: 0.82,
  },
  {
    id: 'south-west-bridge',
    assemblySocket: 'front-left-wing',
    spineStart: [-1.35, SPINE_CENTER_Y, 1.75],
    spineEnd: [-2.95, SPINE_CENTER_Y, 2.7],
    spineYawDegrees: -59.3,
    fromRiserYawDegrees: -59.3,
    toRiserYawDegrees: 120.7,
    outerWidth: 1.04,
    outerDepth: 0.84,
    clearWidth: 0.74,
  },
  {
    id: 'south-east-bridge',
    assemblySocket: 'front-right-wing',
    spineStart: [1.35, SPINE_CENTER_Y, 1.75],
    spineEnd: [2.96, SPINE_CENTER_Y, 2.7],
    spineYawDegrees: 59.4,
    fromRiserYawDegrees: 59.4,
    toRiserYawDegrees: -120.6,
    outerWidth: 1.04,
    outerDepth: 0.84,
    clearWidth: 0.74,
  },
] as const;

function markMesh(mesh: THREE.Mesh, explodeParent: string) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.explodeWithParent = true;
  mesh.userData.explodeParent = explodeParent;
  return mesh;
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  position: Point3,
  material: THREE.Material,
  explodeParent: string,
) {
  const mesh = markMesh(new THREE.Mesh(new THREE.BoxGeometry(...size), material), explodeParent);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addBeamBetween(
  parent: THREE.Object3D,
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = markMesh(
    new THREE.Mesh(new THREE.BoxGeometry(thickness, length, thickness), material),
    explodeParent,
  );
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function addTube(
  parent: THREE.Object3D,
  name: string,
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const mesh = markMesh(
    new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 4), radius, 5, false), material),
    explodeParent,
  );
  mesh.name = name;
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
  chamfer: number,
) {
  const shape = new THREE.Shape();
  const outer = chamferedOutline(outerWidth, outerDepth, chamfer);
  shape.moveTo(...outer[0]);
  outer.slice(1).forEach((point) => shape.lineTo(...point));
  shape.closePath();

  const innerWidth = Math.max(0.18, outerWidth - wallThickness * 2);
  const innerDepth = Math.max(0.18, outerDepth - wallThickness * 2);
  const inner = [...chamferedOutline(
    innerWidth,
    innerDepth,
    Math.max(0.025, chamfer - wallThickness * 0.35),
  )].reverse();
  const hole = new THREE.Path();
  hole.moveTo(...inner[0]);
  inner.slice(1).forEach((point) => hole.lineTo(...point));
  hole.closePath();
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    // V3 owns exact collar heights. Separate trim bands provide the bevel read
    // without allowing extrusion bevels to grow past the contracted Y limits.
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addChamferedRing(
  parent: THREE.Object3D,
  name: string,
  outerWidth: number,
  outerDepth: number,
  wallThickness: number,
  bottomY: number,
  height: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const geometry = createChamferedRingGeometry(
    outerWidth,
    outerDepth,
    wallThickness,
    height,
    Math.min(outerWidth, outerDepth) * 0.16,
  );
  geometry.translate(0, bottomY, 0);
  const mesh = markMesh(new THREE.Mesh(geometry, material), explodeParent);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function createChamferedSlabGeometry(
  width: number,
  depth: number,
  height: number,
  chamfer: number,
) {
  const shape = new THREE.Shape();
  const outline = chamferedOutline(width, depth, chamfer);
  shape.moveTo(...outline[0]);
  outline.slice(1).forEach((point) => shape.lineTo(...point));
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addChamferedSlab(
  parent: THREE.Object3D,
  name: string,
  width: number,
  depth: number,
  bottomY: number,
  height: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const geometry = createChamferedSlabGeometry(
    width,
    depth,
    height,
    Math.min(width, depth) * 0.14,
  );
  geometry.translate(0, bottomY, 0);
  const mesh = markMesh(new THREE.Mesh(geometry, material), explodeParent);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addEndpointPortalArch(
  parent: THREE.Object3D,
  name: string,
  z: number,
  clearWidth: number,
  material: THREE.Material,
  radius: number,
  explodeParent: string,
) {
  const halfWidth = clearWidth * 0.5;
  return addTube(parent, name, [
    new THREE.Vector3(-halfWidth, 0.1, z),
    new THREE.Vector3(-halfWidth, 0.42, z),
    new THREE.Vector3(0, 0.635, z),
    new THREE.Vector3(halfWidth, 0.42, z),
    new THREE.Vector3(halfWidth, 0.1, z),
  ], radius, material, explodeParent);
}

function createGabledEmergenceBayGeometry(
  width: number,
  depth: number,
  shoulderHeight: number,
  peakHeight: number,
) {
  const halfWidth = width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, shoulderHeight);
  shape.lineTo(0, peakHeight);
  shape.lineTo(-halfWidth, shoulderHeight);
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

function addGabledEmergenceBay(
  parent: THREE.Object3D,
  name: string,
  width: number,
  depth: number,
  bottomY: number,
  shoulderHeight: number,
  peakHeight: number,
  centerZ: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const mesh = markMesh(
    new THREE.Mesh(
      createGabledEmergenceBayGeometry(width, depth, shoulderHeight, peakHeight),
      material,
    ),
    explodeParent,
  );
  mesh.name = name;
  mesh.position.set(0, bottomY, centerZ);
  parent.add(mesh);
  return mesh;
}

function addSideGothicArch(
  parent: THREE.Object3D,
  name: string,
  sideX: number,
  centerZ: number,
  span: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const baseY = -0.61;
  const shoulderY = -0.43;
  const crownY = -0.295;
  const halfSpan = span * 0.5;
  return addTube(parent, name, [
    new THREE.Vector3(sideX, baseY, centerZ - halfSpan),
    new THREE.Vector3(sideX, shoulderY, centerZ - halfSpan),
    new THREE.Vector3(sideX, crownY, centerZ),
    new THREE.Vector3(sideX, shoulderY, centerZ + halfSpan),
    new THREE.Vector3(sideX, baseY, centerZ + halfSpan),
  ], 0.022, material, explodeParent);
}

function addTransverseGothicArch(
  parent: THREE.Object3D,
  name: string,
  z: number,
  clearWidth: number,
  material: THREE.Material,
  explodeParent: string,
) {
  const halfWidth = clearWidth * 0.5;
  return addTube(parent, name, [
    new THREE.Vector3(-halfWidth, -0.62, z),
    new THREE.Vector3(-halfWidth, -0.43, z),
    new THREE.Vector3(0, -0.285, z),
    new THREE.Vector3(halfWidth, -0.43, z),
    new THREE.Vector3(halfWidth, -0.62, z),
  ], 0.026, material, explodeParent);
}

function buildCorridorSpan(
  spec: ConnectorBranchSpec,
  materials: Island15CastleConnectorMaterials,
) {
  const span = new THREE.Group();
  span.name = `ISLAND_15_CONNECTOR_${spec.id.toUpperCase().replace(/-/g, '_')}_SPINE`;
  const dx = spec.spineEnd[0] - spec.spineStart[0];
  const dz = spec.spineEnd[2] - spec.spineStart[2];
  const length = Math.hypot(dx, dz) + COLLAR_EXTENT * 2;
  const centerX = (spec.spineStart[0] + spec.spineEnd[0]) * 0.5;
  const centerZ = (spec.spineStart[2] + spec.spineEnd[2]) * 0.5;
  span.position.set(centerX, 0, centerZ);
  span.rotation.y = THREE.MathUtils.degToRad(spec.spineYawDegrees);

  const branchName = spec.id;
  const halfWidth = spec.outerWidth * 0.5;
  const sideX = halfWidth - 0.055;
  addBox(span, `${span.name}_UNDERSIDE`, [spec.outerWidth, 0.14, length], [0, -0.705, 0], materials.castleShadow, branchName);
  addBox(span, `${span.name}_DECK`, [spec.outerWidth - 0.12, 0.09, length], [0, -0.625, 0], materials.midnight, branchName);
  addBox(span, `${span.name}_LEFT_WALL`, [0.11, 0.34, length], [-sideX, -0.46, 0], materials.midnight, branchName);
  addBox(span, `${span.name}_RIGHT_WALL`, [0.11, 0.34, length], [sideX, -0.46, 0], materials.midnight, branchName);
  addBox(span, `${span.name}_ROOF_DECK`, [spec.outerWidth - 0.12, 0.08, length], [0, -0.315, 0], materials.castleShadow, branchName);
  addBox(span, `${span.name}_LEFT_PARAPET`, [0.11, 0.055, length + 0.04], [-sideX, -0.2825, 0], materials.silver, branchName);
  addBox(span, `${span.name}_RIGHT_PARAPET`, [0.11, 0.055, length + 0.04], [sideX, -0.2825, 0], materials.silver, branchName);
  addBox(span, `${span.name}_CENTER_SILVER_RIDGE`, [0.055, 0.018, length + 0.04], [0, -0.259, 0], materials.silver, branchName);
  addBox(span, `${span.name}_LEFT_SAPPHIRE_CONDUIT`, [0.032, 0.024, length], [-spec.clearWidth * 0.28, -0.267, 0], materials.crystalGlow, branchName);
  addBox(span, `${span.name}_RIGHT_SAPPHIRE_CONDUIT`, [0.032, 0.024, length], [spec.clearWidth * 0.28, -0.267, 0], materials.crystalGlow, branchName);
  addBox(span, `${span.name}_LEFT_GOLD_RIB`, [0.035, 0.035, length], [-sideX - 0.012, -0.385, 0], materials.gold, branchName);
  addBox(span, `${span.name}_RIGHT_GOLD_RIB`, [0.035, 0.035, length], [sideX + 0.012, -0.385, 0], materials.gold, branchName);
  addBox(span, `${span.name}_LEFT_SILVER_STRINGER`, [0.04, 0.04, length], [-sideX - 0.012, -0.56, 0], materials.silver, branchName);
  addBox(span, `${span.name}_RIGHT_SILVER_STRINGER`, [0.04, 0.04, length], [sideX + 0.012, -0.56, 0], materials.silver, branchName);

  const stationCount = 4;
  for (let index = 0; index < stationCount; index += 1) {
    const t = (index + 1) / (stationCount + 1);
    const z = THREE.MathUtils.lerp(-length * 0.5, length * 0.5, t);
    const station = `${span.name}_STATION_${index + 1}`;
    addBox(span, `${station}_UNDERBEAM`, [spec.outerWidth + 0.04, 0.07, 0.11], [0, -0.735, z], materials.castleShadow, branchName);
    addBox(span, `${station}_LEFT_BUTTRESS`, [0.08, 0.31, 0.12], [-halfWidth - 0.01, -0.46, z], materials.castleShadow, branchName);
    addBox(span, `${station}_RIGHT_BUTTRESS`, [0.08, 0.31, 0.12], [halfWidth + 0.01, -0.46, z], materials.castleShadow, branchName);
    addBox(span, `${station}_ROOF_RIB`, [spec.outerWidth + 0.055, 0.04, 0.09], [0, -0.27, z], materials.silver, branchName);
    addTransverseGothicArch(span, `${station}_INNER_ARCH`, z, spec.clearWidth, materials.silver, branchName);
    addSideGothicArch(span, `${station}_LEFT_ARCH`, -halfWidth - 0.012, z, Math.min(0.34, length * 0.18), materials.gold, branchName);
    addSideGothicArch(span, `${station}_RIGHT_ARCH`, halfWidth + 0.012, z, Math.min(0.34, length * 0.18), materials.gold, branchName);
  }

  span.userData.circulationId = spec.id;
  span.userData.spineStart = [...spec.spineStart];
  span.userData.spineEnd = [...spec.spineEnd];
  span.userData.spineYawDegrees = spec.spineYawDegrees;
  span.userData.topMaximumY = SPINE_TOP_MAXIMUM_Y;
  span.userData.coveredGallery = true;
  span.userData.sapphireConduitCount = 2;
  span.userData.transverseArchCount = stationCount;
  return span;
}

function addEndpointPortalDetails(
  group: THREE.Group,
  spec: ConnectorBranchSpec,
  label: string,
  materials: Island15CastleConnectorMaterials,
) {
  const wallThickness = (spec.outerWidth - spec.clearWidth) * 0.5;

  // The buried galleries are intentionally invisible beneath the protected
  // route. Their eight legal emergence footprints therefore carry a shared,
  // readable foundation language that visually welds every satellite room to
  // the same citadel without growing a bridge into route space.
  addChamferedSlab(
    group,
    `${group.name}_LOWER_FOUNDATION_PLINTH`,
    spec.outerWidth + 0.22,
    spec.outerDepth + 0.24,
    -0.16,
    0.12,
    materials.castleShadow,
    spec.id,
  );
  addChamferedSlab(
    group,
    `${group.name}_SILVER_ICE_SHELF`,
    spec.outerWidth + 0.14,
    spec.outerDepth + 0.16,
    -0.04,
    0.08,
    materials.silver,
    spec.id,
  );
  addChamferedSlab(
    group,
    `${group.name}_MIDNIGHT_THRESHOLD_PLINTH`,
    spec.outerWidth + 0.06,
    spec.outerDepth + 0.1,
    0.04,
    0.055,
    materials.midnight,
    spec.id,
  );
  addChamferedRing(
    group,
    `${group.name}_FOUNDATION_GOLD_PERIMETER_RIB`,
    spec.outerWidth + 0.16,
    spec.outerDepth + 0.18,
    0.04,
    0.04,
    0.035,
    materials.gold,
    spec.id,
  );
  addChamferedRing(
    group,
    `${group.name}_FOUNDATION_CRYSTAL_PERIMETER_RIB`,
    spec.outerWidth + 0.08,
    spec.outerDepth + 0.1,
    0.03,
    0.075,
    0.03,
    materials.crystalGlow,
    spec.id,
  );

  const shellCollar = addChamferedRing(
    group,
    `${group.name}_MASONRY_SHELL_COLLAR`,
    spec.outerWidth + 0.12,
    spec.outerDepth + COLLAR_EXTENT,
    wallThickness + 0.045,
    0.43,
    0.15,
    materials.castleShadow,
    spec.id,
  );
  shellCollar.position.z = -COLLAR_EXTENT * 0.5;
  shellCollar.userData.overlapDirection = 'local-negative-z-into-shell';
  shellCollar.userData.overlap = COLLAR_EXTENT;

  const spineCollar = addChamferedRing(
    group,
    `${group.name}_MASONRY_SPINE_COLLAR`,
    spec.outerWidth + 0.1,
    spec.outerDepth + COLLAR_EXTENT,
    wallThickness + 0.04,
    RISER_BOTTOM_Y,
    0.12,
    materials.castleShadow,
    spec.id,
  );
  spineCollar.position.z = COLLAR_EXTENT * 0.5;
  spineCollar.userData.overlapDirection = 'local-positive-z-into-spine';
  spineCollar.userData.overlap = COLLAR_EXTENT;

  const halfWidth = spec.outerWidth * 0.5;
  const halfDepth = spec.outerDepth * 0.5;
  const conduitHeight = 0.82;
  const conduitY = 0.11;
  const conduitOffset = 0.018;
  addBox(group, `${group.name}_LEFT_SAPPHIRE_RISER_CONDUIT`, [0.04, conduitHeight, 0.04], [-halfWidth - conduitOffset, conduitY, 0], materials.crystalGlow, spec.id);
  addBox(group, `${group.name}_RIGHT_SAPPHIRE_RISER_CONDUIT`, [0.04, conduitHeight, 0.04], [halfWidth + conduitOffset, conduitY, 0], materials.crystalGlow, spec.id);
  addBox(group, `${group.name}_FRONT_SAPPHIRE_RISER_CONDUIT`, [0.04, conduitHeight, 0.04], [0, conduitY, halfDepth + conduitOffset], materials.crystalGlow, spec.id);
  addBox(group, `${group.name}_REAR_SAPPHIRE_RISER_CONDUIT`, [0.04, conduitHeight, 0.04], [0, conduitY, -halfDepth - conduitOffset], materials.crystalGlow, spec.id);

  const buttressBottomY = -0.42;
  const buttressTopY = 0.5;
  const buttressSpread = 0.065;
  const buttressInset = 0.018;
  const buttresses = [
    {
      id: 'LEFT',
      start: new THREE.Vector3(-halfWidth - buttressSpread, buttressBottomY, 0),
      end: new THREE.Vector3(-halfWidth + buttressInset, buttressTopY, 0),
    },
    {
      id: 'RIGHT',
      start: new THREE.Vector3(halfWidth + buttressSpread, buttressBottomY, 0),
      end: new THREE.Vector3(halfWidth - buttressInset, buttressTopY, 0),
    },
    {
      id: 'FRONT',
      start: new THREE.Vector3(0, buttressBottomY, halfDepth + buttressSpread),
      end: new THREE.Vector3(0, buttressTopY, halfDepth - buttressInset),
    },
    {
      id: 'REAR',
      start: new THREE.Vector3(0, buttressBottomY, -halfDepth - buttressSpread),
      end: new THREE.Vector3(0, buttressTopY, -halfDepth + buttressInset),
    },
  ] as const;
  buttresses.forEach((buttress) => {
    addBeamBetween(
      group,
      `${group.name}_${buttress.id}_SILVER_FLYING_BUTTRESS`,
      buttress.start,
      buttress.end,
      0.075,
      materials.silver,
      spec.id,
    );
    addBeamBetween(
      group,
      `${group.name}_${buttress.id}_GOLD_BUTTRESS_INLAY`,
      buttress.start.clone().lerp(buttress.end, 0.08),
      buttress.end.clone().lerp(buttress.start, 0.08),
      0.022,
      materials.gold,
      spec.id,
    );
  });

  addBox(group, `${group.name}_FRONT_SILVER_PORTAL_LINTEL`, [spec.clearWidth, 0.055, 0.075], [0, 0.565, halfDepth + 0.025], materials.silver, spec.id);
  addBox(group, `${group.name}_REAR_SILVER_PORTAL_LINTEL`, [spec.clearWidth, 0.055, 0.075], [0, 0.565, -halfDepth - 0.025], materials.silver, spec.id);
  addBox(group, `${group.name}_LEFT_GOLD_PORTAL_CORNICE`, [0.075, 0.045, spec.outerDepth], [-halfWidth - 0.025, 0.59, 0], materials.gold, spec.id);
  addBox(group, `${group.name}_RIGHT_GOLD_PORTAL_CORNICE`, [0.075, 0.045, spec.outerDepth], [halfWidth + 0.025, 0.59, 0], materials.gold, spec.id);

  const portalFaces = [
    { id: 'FRONT', z: halfDepth + 0.03 },
    { id: 'REAR', z: -halfDepth - 0.03 },
  ] as const;
  portalFaces.forEach((face) => {
    addEndpointPortalArch(
      group,
      `${group.name}_${face.id}_SILVER_FOUNDATION_GATE_ARCH`,
      face.z,
      spec.clearWidth,
      materials.silver,
      0.028,
      spec.id,
    );
    addEndpointPortalArch(
      group,
      `${group.name}_${face.id}_GOLD_FOUNDATION_GATE_INLAY`,
      face.z + (face.id === 'FRONT' ? 0.012 : -0.012),
      spec.clearWidth * 0.82,
      materials.gold,
      0.014,
      spec.id,
    );
  });

  // A short roofed bay makes the vertical riser read as a seated gatehouse
  // rather than a decorative post beside the room. It extends only through
  // the contracted endpoint collar toward the receiving shell; no geometry is
  // added along the protected-board bridge span.
  const emergenceBayDepth = spec.outerDepth + COLLAR_EXTENT;
  const emergenceBayCenterZ = -COLLAR_EXTENT * 0.5;
  addGabledEmergenceBay(
    group,
    `${group.name}_COVERED_EMERGENCE_BAY`,
    spec.outerWidth + 0.1,
    emergenceBayDepth,
    0.5,
    0.075,
    0.16,
    emergenceBayCenterZ,
    materials.midnight,
    spec.id,
  );
  addGabledEmergenceBay(
    group,
    `${group.name}_FRONT_SILVER_GABLE_FASCIA`,
    spec.outerWidth + 0.14,
    0.035,
    0.5,
    0.075,
    0.16,
    emergenceBayCenterZ + emergenceBayDepth * 0.5 + 0.02,
    materials.silver,
    spec.id,
  );
  addGabledEmergenceBay(
    group,
    `${group.name}_REAR_GOLD_GABLE_FASCIA`,
    spec.outerWidth + 0.12,
    0.035,
    0.5,
    0.075,
    0.16,
    emergenceBayCenterZ - emergenceBayDepth * 0.5 - 0.02,
    materials.gold,
    spec.id,
  );
  addBox(
    group,
    `${group.name}_CRYSTAL_EMERGENCE_KEYSTONE`,
    [0.12, 0.05, 0.16],
    [0, 0.625, emergenceBayCenterZ + emergenceBayDepth * 0.5 + 0.055],
    materials.crystalGlow,
    spec.id,
  );

  const bearingPylonX = halfWidth - 0.04;
  ([-1, 1] as const).forEach((side) => {
    const sideName = side < 0 ? 'LEFT' : 'RIGHT';
    addBox(
      group,
      `${group.name}_${sideName}_FOUNDATION_GATE_BEARING`,
      [0.24, 0.58, 0.3],
      [bearingPylonX * side, 0.35, emergenceBayCenterZ],
      materials.castleShadow,
      spec.id,
    );
    addBox(
      group,
      `${group.name}_${sideName}_FOUNDATION_GATE_GOLD_RIB`,
      [0.035, 0.38, 0.315],
      [(bearingPylonX + 0.138) * side, 0.37, emergenceBayCenterZ],
      materials.gold,
      spec.id,
    );
    addBox(
      group,
      `${group.name}_${sideName}_FOUNDATION_GATE_SILVER_CAP`,
      [0.3, 0.06, 0.36],
      [bearingPylonX * side, 0.64, emergenceBayCenterZ],
      materials.silver,
      spec.id,
    );
  });

  group.userData.portalDetailFamily = label;
  group.userData.foundationPlinthTierCount = 3;
  group.userData.foundationPerimeterRibCount = 2;
  group.userData.foundationGateArchCount = portalFaces.length * 2;
  group.userData.foundationGateBearingCount = 2;
  group.userData.coveredEmergenceBayMeshCount = 4;
  group.userData.masonryCollarCount = 2;
  group.userData.sapphireConduitCount = 4;
  group.userData.silverButtressCount = buttresses.length;
  group.userData.goldButtressInlayCount = buttresses.length;
  group.userData.maximumVisibleY = RISER_TOP_Y;
}

function buildEndpointRiser(
  spec: ConnectorBranchSpec,
  endpoint: 'from' | 'to',
  materials: Island15CastleConnectorMaterials,
) {
  const point = endpoint === 'from' ? spec.spineStart : spec.spineEnd;
  const yawDegrees = endpoint === 'from' ? spec.fromRiserYawDegrees : spec.toRiserYawDegrees;
  const label = `${spec.id.toUpperCase().replace(/-/g, '_')}_${endpoint.toUpperCase()}_RISER`;
  const group = new THREE.Group();
  group.name = `ISLAND_15_CONNECTOR_${label}`;
  group.position.set(point[0], 0, point[2]);
  group.rotation.y = THREE.MathUtils.degToRad(yawDegrees);
  group.userData.circulationId = spec.id;
  group.userData.endpointRole = endpoint;
  group.userData.owner = 'castle-wing-connector-system';
  group.userData.bottom = [point[0], RISER_BOTTOM_Y, point[2]];
  group.userData.top = [point[0], RISER_TOP_Y, point[2]];
  group.userData.yawDegrees = yawDegrees;
  group.userData.pitchDegrees = 90;
  group.userData.outerWidth = spec.outerWidth;
  group.userData.outerDepth = spec.outerDepth;
  group.userData.clearWidth = spec.clearWidth;
  group.userData.topCollarExtentIntoShell = COLLAR_EXTENT;
  group.userData.bottomCollarExtentIntoSpine = COLLAR_EXTENT;

  const wallThickness = (spec.outerWidth - spec.clearWidth) * 0.5;
  const riserHeight = RISER_TOP_Y - RISER_BOTTOM_Y;
  addChamferedRing(
    group,
    `${group.name}_HOLLOW_SHAFT`,
    spec.outerWidth,
    spec.outerDepth,
    wallThickness,
    RISER_BOTTOM_Y,
    riserHeight,
    materials.midnight,
    spec.id,
  );
  addChamferedRing(
    group,
    `${group.name}_BOTTOM_COLLAR`,
    spec.outerWidth + 0.1,
    spec.outerDepth + 0.1,
    wallThickness + 0.035,
    RISER_BOTTOM_Y,
    0.11,
    materials.castleShadow,
    spec.id,
  );
  addChamferedRing(
    group,
    `${group.name}_MID_BAND`,
    spec.outerWidth + 0.055,
    spec.outerDepth + 0.055,
    wallThickness + 0.02,
    0.02,
    0.075,
    materials.gold,
    spec.id,
  );
  addChamferedRing(
    group,
    `${group.name}_OPEN_RECEIVING_COLLAR`,
    spec.outerWidth + 0.16,
    spec.outerDepth + 0.16,
    wallThickness + 0.055,
    RISER_TOP_Y - 0.14,
    0.14,
    materials.silver,
    spec.id,
  );

  addEndpointPortalDetails(group, spec, label, materials);

  const trimY = 0.31;
  const trimHeight = 0.48;
  addBox(group, `${group.name}_FRONT_TRIM`, [0.055, trimHeight, 0.045], [0, trimY, spec.outerDepth * 0.5 + 0.02], materials.gold, spec.id);
  addBox(group, `${group.name}_REAR_TRIM`, [0.055, trimHeight, 0.045], [0, trimY, -spec.outerDepth * 0.5 - 0.02], materials.gold, spec.id);
  addBox(group, `${group.name}_LEFT_TRIM`, [0.045, trimHeight, 0.055], [-spec.outerWidth * 0.5 - 0.02, trimY, 0], materials.gold, spec.id);
  addBox(group, `${group.name}_RIGHT_TRIM`, [0.045, trimHeight, 0.055], [spec.outerWidth * 0.5 + 0.02, trimY, 0], materials.gold, spec.id);
  return group;
}

function addManifoldFeed(
  parent: THREE.Object3D,
  name: string,
  end: Point3,
  width: number,
  materials: Island15CastleConnectorMaterials,
) {
  const dx = end[0];
  const dz = end[2];
  const length = Math.hypot(dx, dz) - 0.46;
  const group = new THREE.Group();
  group.name = name;
  group.position.set(dx * 0.5, 0, dz * 0.5);
  group.rotation.y = Math.atan2(dx, dz);
  group.userData.manifoldFeed = true;
  addBox(group, `${name}_BODY`, [width, 0.48, length], [0, -0.52, 0], materials.castleShadow, 'central-manifold');
  addBox(group, `${name}_TOP_RIB`, [width + 0.045, 0.035, length], [0, -0.2725, 0], materials.silver, 'central-manifold');
  parent.add(group);
}

function buildCentralManifold(
  materials: Island15CastleConnectorMaterials,
) {
  const manifold = new THREE.Group();
  manifold.name = 'ISLAND_15_CONNECTOR_COMPACT_CENTRAL_MANIFOLD';
  manifold.userData.partRole = 'central-manifold';
  manifold.userData.presentationOnly = true;

  const body = markMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.52, 8, 1, false), materials.midnight),
    'central-manifold',
  );
  body.name = 'ISLAND_15_CONNECTOR_MANIFOLD_OCTAGONAL_BODY';
  body.position.y = -0.515;
  manifold.add(body);

  const underside = markMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.72, 0.12, 8), materials.castleShadow),
    'central-manifold',
  );
  underside.name = 'ISLAND_15_CONNECTOR_MANIFOLD_UNDERSIDE';
  underside.position.y = -0.745;
  manifold.add(underside);

  const rim = markMesh(
    new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.045, 5, 8), materials.silver),
    'central-manifold',
  );
  rim.name = 'ISLAND_15_CONNECTOR_MANIFOLD_OPEN_RIM';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.3;
  manifold.add(rim);

  const crystalInset = markMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.035, 8), materials.crystalGlow),
    'central-manifold',
  );
  crystalInset.name = 'ISLAND_15_CONNECTOR_MANIFOLD_CRYSTAL_DATUM';
  crystalInset.position.y = -0.2725;
  manifold.add(crystalInset);

  CONNECTOR_BRANCHES.forEach((spec, index) => {
    addManifoldFeed(
      manifold,
      `ISLAND_15_CONNECTOR_MANIFOLD_FEED_${index + 1}`,
      spec.spineStart,
      Math.max(0.46, spec.clearWidth * 0.68),
      materials,
    );
  });
  return manifold;
}

/**
 * Approved V3 representative-slice connector asset for Island 015.
 *
 * This factory owns only the four primary connector branches, their exact
 * spines/risers/collars, and the compact buried manifold. It intentionally has
 * no rooms, castle shell, terrain, route, lights, atmosphere, UI, or gallery
 * return network.
 */
export function buildIsland15CastleConnectorPart(
  materials: Island15CastleConnectorMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_CASTLE_WING_CONNECTOR_SYSTEM';
  root.userData.partId = 'castle-wing-connector-system';
  root.userData.partKind = 'part';
  root.userData.partModule = 'island15/Island15CastleConnectorPart';
  root.userData.presentationOnly = true;
  root.userData.floorPlanVersion = FLOOR_PLAN_VERSION;
  root.userData.primaryBranchCount = CONNECTOR_BRANCHES.length;
  root.userData.connectorOwner = 'castle-wing-connector-system';
  root.userData.excludedNetworkOwner = 'shared-interior-circulation';
  root.userData.buriedConnectorTopMaximumY = SPINE_TOP_MAXIMUM_Y;
  root.userData.minimumSocketOverlap = MINIMUM_SOCKET_OVERLAP;
  root.userData.maximumAssemblyGap = MAXIMUM_ASSEMBLY_GAP;
  root.userData.endpointPortalCount = CONNECTOR_BRANCHES.length * 2;
  root.userData.endpointFoundationSystemCount = CONNECTOR_BRANCHES.length * 2;
  root.userData.foundationPlinthTierCount = CONNECTOR_BRANCHES.length * 2 * 3;
  root.userData.foundationPerimeterRibCount = CONNECTOR_BRANCHES.length * 2 * 2;
  root.userData.foundationGateArchCount = CONNECTOR_BRANCHES.length * 2 * 4;
  root.userData.foundationGateBearingCount = CONNECTOR_BRANCHES.length * 2 * 2;
  root.userData.coveredEmergenceBayMeshCount = CONNECTOR_BRANCHES.length * 2 * 4;
  root.userData.returnBranchCount = 0;
  root.userData.routeAndTileClearancePreserved = true;
  root.userData.roomAndBossTransformsPreserved = true;
  root.userData.coveredGalleryVisualLanguage = 'midnight-masonry-sapphire-silver-gold';
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    partIds: ['central-manifold', ...CONNECTOR_BRANCHES.map((branch) => branch.id)],
    sockets: CONNECTOR_BRANCHES.map((branch) => branch.assemblySocket),
  };

  root.add(buildCentralManifold(materials));
  CONNECTOR_BRANCHES.forEach((spec) => {
    const branch = new THREE.Group();
    branch.name = `ISLAND_15_CONNECTOR_BRANCH_${spec.id.toUpperCase().replace(/-/g, '_')}`;
    branch.userData.partRole = 'primary-connector-branch';
    branch.userData.circulationId = spec.id;
    branch.userData.assemblySocket = spec.assemblySocket;
    branch.userData.owner = 'castle-wing-connector-system';
    branch.userData.minimumClearWidth = spec.clearWidth;
    branch.userData.endCollarExtent = COLLAR_EXTENT;
    branch.userData.endpointPortalCount = 2;
    branch.userData.returnBranchCount = 0;
    branch.userData.buriedSpineCoordinatesPreserved = true;
    branch.add(
      buildCorridorSpan(spec, materials),
      buildEndpointRiser(spec, 'from', materials),
      buildEndpointRiser(spec, 'to', materials),
    );
    root.add(branch);
  });

  return root;
}
