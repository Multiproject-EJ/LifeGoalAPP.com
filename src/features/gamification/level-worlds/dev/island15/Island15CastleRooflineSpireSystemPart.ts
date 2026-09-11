import * as THREE from 'three';

export interface Island15CastleRooflineSpireSystemMaterials {
  castle: THREE.Material;
  castleShadow: THREE.Material;
  deepIce: THREE.Material;
  silver: THREE.Material;
  gold: THREE.Material;
  crystalGlow: THREE.Material;
  violetCrystal: THREE.Material;
}

type XZ = readonly [number, number];
type XYZ = readonly [number, number, number];

const PART_ID = 'castle-roofline-spire-system-v2';
const PART_MODULE = 'island15/Island15CastleRooflineSpireSystemPart';
const GEOMETRY_SOURCE_SHA256 = '7c5874eb6873470ddd330d23dc740ee86ffe1986fc62f2b0f99007936d216443';
const GEOMETRY_MANIFEST_SHA256 = '4afe3f7534d8ce8b3c1201d983b9cfb5d97797f63c471e6b720cdfdac07b5472';
const PRESERVED_BASELINE_SOURCE_SHA256 = '9eb0f93124233655864a6efdf4e13f55392d23deebeb820032da848b1d05e409';
const EXPECTED_MESH_COUNT = 372;
const EXPECTED_TRIANGLE_COUNT = 6704;
const EXPECTED_PROTECTED_V5_MESH_COUNT = 100;
const EXPECTED_INVALIDATED_V5_CENTRAL_MESH_COUNT = 116;
const EXPECTED_V6_CENTRAL_MESH_COUNT = 272;

const FOOTPRINT_XZ: readonly XZ[] = [
  [-1.25, -2.05],
  [1.25, -2.05],
  [1.6, -1.7],
  [1.6, 1.7],
  [1.25, 2.05],
  [-1.25, 2.05],
  [-1.6, 1.7],
  [-1.6, -1.7],
] as const;

const APERTURE_XZ: readonly XZ[] = [
  [-0.575, -0.65],
  [0.575, -0.65],
  [0.7, -0.525],
  [0.7, 0.325],
  [0.575, 0.5],
  [-0.575, 0.5],
  [-0.7, 0.325],
  [-0.7, -0.525],
] as const;

const CROWN_KEEPOUT = {
  socket: 'central-hero-crown',
  parentLocalPosition: [0, 6.66, -0.1] as XYZ,
  centerXZ: [0, -0.1] as XZ,
  sizeXZ: [1.15, 1] as XZ,
};

const V6_TIER_RINGS = {
  eaveBottom: { y: 3.55, footprintScale: 0.96 },
  eaveTop: { y: 3.70, footprintScale: 0.96 },
  lowerSlopeTop: { y: 4.25, footprintScale: 0.84 },
  lowerTerraceInner: { y: 4.25, footprintScale: 0.72 },
  clerestoryTop: { y: 4.82, footprintScale: 0.72 },
  clerestoryCorniceOuter: { y: 4.86, footprintScale: 0.74 },
  secondSlopeBase: { y: 4.86, footprintScale: 0.72 },
  secondSlopeTop: { y: 5.38, footprintScale: 0.58 },
  upperTerraceInner: { y: 5.38, footprintScale: 0.50 },
  upperDrumTop: { y: 5.88, footprintScale: 0.50 },
  apertureLower: { y: 6.18, apertureScale: 1.03 },
  apertureTop: { y: 6.24, apertureScale: 1.00 },
} as const;

const TRANSEPT_SHOULDERS = {
  north: { center: [0, 4.485, -1.22] as XYZ, size: [0.98, 0.47, 0.50] as XYZ, outwardNormalXZ: [0, -1] as XZ },
  east: { center: [1.22, 4.485, 0] as XYZ, size: [0.50, 0.47, 0.98] as XYZ, outwardNormalXZ: [1, 0] as XZ },
  south: { center: [0, 4.485, 1.22] as XYZ, size: [0.98, 0.47, 0.50] as XYZ, outwardNormalXZ: [0, 1] as XZ },
  west: { center: [-1.22, 4.485, 0] as XYZ, size: [0.50, 0.47, 0.98] as XYZ, outwardNormalXZ: [-1, 0] as XZ },
} as const;

const RIDGE_CRYSTALS = {
  'ridge-crystal-a': {
    position: [-0.72, 6.3, -0.3] as XYZ,
    baseY: 6.24,
    tipY: 6.82,
    radius: 0.105,
    material: 'cyan' as const,
  },
  'ridge-crystal-b': {
    position: [0.72, 6.28, 0.14] as XYZ,
    baseY: 6.22,
    tipY: 6.7,
    radius: 0.095,
    material: 'violet' as const,
  },
};

const PROMOTED_TOWER_LOCAL_FOOTPRINT_XZ: readonly XZ[] = [
  [0.14, 0.14],
  [0.22, -0.08],
  [0.1, -0.46],
  [-0.38, -0.46],
  [-0.52, -0.18],
  [-0.48, 0.1],
  [-0.12, 0.22],
] as const;

const TURRETLETS = [
  { id: 'T1', name: 'turret-north-west', position: [-1.15, 3.78, -1.82] as XYZ, baseY: 3.56, drumTopY: 4.82, capY: 5.7, material: 'violet' as const },
  { id: 'T2', name: 'turret-north-east', position: [1.15, 3.78, -1.82] as XYZ, baseY: 3.56, drumTopY: 4.82, capY: 5.66, material: 'cyan' as const },
  { id: 'T3', name: 'turret-south-east', position: [1.15, 3.78, 1.82] as XYZ, baseY: 3.56, drumTopY: 4.82, capY: 5.7, material: 'violet' as const },
  { id: 'T4', name: 'turret-south-west', position: [-1.15, 3.78, 1.82] as XYZ, baseY: 3.56, drumTopY: 4.82, capY: 5.66, material: 'cyan' as const },
] as const;

type PromotedTowerSpec = (typeof TURRETLETS)[number];

interface CrystalSpec {
  readonly position: XYZ;
  readonly baseY: number;
  readonly tipY: number;
  readonly radius: number;
}

interface RooflineMaterialSet {
  sapphireDark: THREE.Material;
  sapphire: THREE.Material;
  sapphireLight: THREE.Material;
  silverDark: THREE.Material;
  silver: THREE.Material;
  gold: THREE.Material;
  cyan: THREE.Material;
  violet: THREE.Material;
}

interface V6CentralMaterialSet extends RooflineMaterialSet {
  sapphireDeep: THREE.Material;
}

function cloneOpaqueDoubleSide(source: THREE.Material, name: string) {
  const material = source.clone();
  material.name = name;
  material.side = THREE.DoubleSide;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.needsUpdate = true;
  return material;
}

function createRooflineMaterials(materials: Island15CastleRooflineSpireSystemMaterials): RooflineMaterialSet {
  return {
    sapphireDark: cloneOpaqueDoubleSide(materials.castleShadow, 'ISLAND_15_ROOFLINE_SAPPHIRE_DARK_OPAQUE'),
    sapphire: cloneOpaqueDoubleSide(materials.castle, 'ISLAND_15_ROOFLINE_SAPPHIRE_OPAQUE'),
    sapphireLight: cloneOpaqueDoubleSide(materials.deepIce, 'ISLAND_15_ROOFLINE_SAPPHIRE_LIGHT_OPAQUE'),
    silverDark: cloneOpaqueDoubleSide(materials.castleShadow, 'ISLAND_15_ROOFLINE_SILVER_DARK_OPAQUE'),
    silver: cloneOpaqueDoubleSide(materials.silver, 'ISLAND_15_ROOFLINE_SILVER_OPAQUE'),
    gold: cloneOpaqueDoubleSide(materials.gold, 'ISLAND_15_ROOFLINE_GOLD_OPAQUE'),
    cyan: cloneOpaqueDoubleSide(materials.crystalGlow, 'ISLAND_15_ROOFLINE_CYAN_OPAQUE'),
    violet: cloneOpaqueDoubleSide(materials.violetCrystal, 'ISLAND_15_ROOFLINE_VIOLET_OPAQUE'),
  };
}

function createV6CentralMaterial(
  color: number,
  options: {
    roughness: number;
    metalness: number;
    emissive?: number;
    emissiveIntensity?: number;
  },
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness,
    metalness: options.metalness,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
    flatShading: true,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function createV6CentralMaterials(): V6CentralMaterialSet {
  return {
    sapphireDeep: createV6CentralMaterial(0x061d50, { roughness: 0.31, metalness: 0.10 }),
    sapphireDark: createV6CentralMaterial(0x0c2f70, { roughness: 0.30, metalness: 0.12 }),
    sapphire: createV6CentralMaterial(0x145fbd, { roughness: 0.28, metalness: 0.10 }),
    sapphireLight: createV6CentralMaterial(0x2c8fdd, { roughness: 0.25, metalness: 0.08 }),
    silverDark: createV6CentralMaterial(0x526e94, { roughness: 0.27, metalness: 0.72 }),
    silver: createV6CentralMaterial(0xb4cee7, { roughness: 0.22, metalness: 0.78 }),
    gold: createV6CentralMaterial(0xd9a340, { roughness: 0.23, metalness: 0.72 }),
    cyan: createV6CentralMaterial(0x1bdcff, {
      roughness: 0.18,
      metalness: 0.10,
      emissive: 0x075466,
      emissiveIntensity: 0.82,
    }),
    violet: createV6CentralMaterial(0x974dff, {
      roughness: 0.18,
      metalness: 0.10,
      emissive: 0x2e0a62,
      emissiveIntensity: 0.82,
    }),
  };
}

function point(xz: XZ, y: number, scale = 1) {
  return new THREE.Vector3(xz[0] * scale, y, xz[1] * scale);
}

function ring(source: readonly XZ[], y: number, scale = 1) {
  return source.map((xz) => point(xz, y, scale));
}

function quadGeometry(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    a.x, a.y, a.z,
    b.x, b.y, b.z,
    c.x, c.y, c.z,
    a.x, a.y, a.z,
    c.x, c.y, c.z,
    d.x, d.y, d.z,
  ], 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function finishMesh<T extends THREE.Mesh>(mesh: T, name: string, family: string) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.partId = PART_ID;
  mesh.userData.family = family;
  mesh.userData.opaque = true;
  mesh.userData.doubleSide = true;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function addRingPanels(
  group: THREE.Group,
  lower: readonly THREE.Vector3[],
  upper: readonly THREE.Vector3[],
  panelMaterials: readonly THREE.Material[],
  family: string,
  tier: string,
) {
  for (let index = 0; index < lower.length; index += 1) {
    const next = (index + 1) % lower.length;
    const mesh = finishMesh(
      new THREE.Mesh(quadGeometry(lower[index], lower[next], upper[next], upper[index]), panelMaterials[index % panelMaterials.length]),
      `${family}-panel-${index + 1}`,
      family,
    );
    mesh.userData.panelIndex = index + 1;
    mesh.userData.tier = tier;
    mesh.userData.seamRule = 'shared edge plus overlapping seam rail';
    group.add(mesh);
  }
}

function cylinderBetween(
  start: XYZ,
  end: XYZ,
  radius: number,
  material: THREE.Material,
  name: string,
  radialSegments = 8,
) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = new THREE.Vector3().subVectors(b, a);
  const mesh = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments, 1, false), material),
    name,
    'connector-rail-or-rib',
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.userData.start = [...start];
  mesh.userData.end = [...end];
  mesh.userData.radius = radius;
  return mesh;
}

function verticalCylinder(
  x: number,
  z: number,
  bottomY: number,
  topY: number,
  radius: number,
  material: THREE.Material,
  name: string,
  radialSegments = 8,
) {
  const mesh = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, topY - bottomY, radialSegments, 1, false), material),
    name,
    'seat-or-node',
  );
  mesh.position.set(x, (bottomY + topY) * 0.5, z);
  mesh.userData.contactRangeY = [bottomY, topY];
  return mesh;
}

function addCrystal(group: THREE.Group, spec: CrystalSpec, material: THREE.Material, name: string) {
  const [x, , z] = spec.position;
  const height = spec.tipY - spec.baseY;
  const bodyHeight = height * 0.56;
  const body = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(spec.radius * 0.72, spec.radius, bodyHeight, 6, 1, false), material),
    `${name}-body`,
    'crystal',
  );
  body.position.set(x, spec.baseY + bodyHeight * 0.5, z);
  body.rotation.y = 0.12;
  body.userData.crystalId = name;
  group.add(body);

  const tipHeight = height - bodyHeight + 0.015;
  const tip = finishMesh(
    new THREE.Mesh(new THREE.ConeGeometry(spec.radius * 0.73, tipHeight, 6, 1, false), material),
    `${name}-tip`,
    'crystal',
  );
  tip.position.set(x, spec.baseY + bodyHeight + tipHeight * 0.5 - 0.015, z);
  tip.rotation.y = 0.12;
  tip.userData.crystalId = name;
  group.add(tip);
}

function towerFootprintPoints(spec: PromotedTowerSpec, scale: number, y: number) {
  const [x, , z] = spec.position;
  const signX = Math.sign(x);
  const signZ = Math.sign(z);
  return PROMOTED_TOWER_LOCAL_FOOTPRINT_XZ.map(([outwardX, outwardZ]) => new THREE.Vector3(
    x + outwardX * signX * scale,
    y,
    z + outwardZ * signZ * scale,
  ));
}

function prismGeometry(bottomPoints: readonly THREE.Vector3[], topPoints: readonly THREE.Vector3[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const count = bottomPoints.length;
  for (const prismPoint of [...bottomPoints, ...topPoints]) positions.push(prismPoint.x, prismPoint.y, prismPoint.z);
  const bottomCenter = bottomPoints.reduce((sum, prismPoint) => sum.add(prismPoint), new THREE.Vector3()).multiplyScalar(1 / count);
  const topCenter = topPoints.reduce((sum, prismPoint) => sum.add(prismPoint), new THREE.Vector3()).multiplyScalar(1 / count);
  positions.push(bottomCenter.x, bottomCenter.y, bottomCenter.z, topCenter.x, topCenter.y, topCenter.z);
  const bottomCenterIndex = count * 2;
  const topCenterIndex = count * 2 + 1;
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    indices.push(index, next, count + next, index, count + next, count + index);
    indices.push(bottomCenterIndex, next, index);
    indices.push(topCenterIndex, count + index, count + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function addTowerPrism(
  group: THREE.Group,
  spec: PromotedTowerSpec,
  bottomY: number,
  topY: number,
  bottomScale: number,
  topScale: number,
  material: THREE.Material,
  name: string,
  family: string,
) {
  const mesh = finishMesh(
    new THREE.Mesh(
      prismGeometry(towerFootprintPoints(spec, bottomScale, bottomY), towerFootprintPoints(spec, topScale, topY)),
      material,
    ),
    name,
    family,
  );
  mesh.userData.turretletId = spec.id;
  mesh.userData.socket = [...spec.position];
  mesh.userData.bottomY = bottomY;
  mesh.userData.topY = topY;
  mesh.userData.bottomScale = bottomScale;
  mesh.userData.topScale = topScale;
  group.add(mesh);
}

function lancetGeometry(width: number, height: number) {
  const halfWidth = width * 0.5;
  const shoulderY = height * 0.18;
  const bottomY = -height * 0.5;
  const points = [
    [-halfWidth, bottomY],
    [halfWidth, bottomY],
    [halfWidth, shoulderY],
    [0, height * 0.5],
    [-halfWidth, shoulderY],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(([x, y]) => [x, y, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function addInhabitedLancet(
  group: THREE.Group,
  spec: PromotedTowerSpec,
  glassMaterial: THREE.Material,
  silverMaterial: THREE.Material,
  name: string,
  normalXZ: XZ,
  positionXZ: XZ,
) {
  const angleY = Math.atan2(normalXZ[0], normalXZ[1]);
  const frame = finishMesh(
    new THREE.Mesh(lancetGeometry(0.205, 0.46), silverMaterial),
    `${name}-silver-frame`,
    'promoted-shoulder-tower-inhabited-lancet-frame',
  );
  frame.position.set(positionXZ[0], 4.34, positionXZ[1]);
  frame.rotation.y = angleY;
  frame.userData.turretletId = spec.id;
  frame.userData.socket = [...spec.position];
  frame.userData.ownership = 'roofline-upper-shoulder-tower-only';
  frame.userData.outwardNormalXZ = [...normalXZ];
  group.add(frame);

  const glass = finishMesh(
    new THREE.Mesh(lancetGeometry(0.135, 0.35), glassMaterial),
    `${name}-glowing-glass`,
    'promoted-shoulder-tower-inhabited-lancet-glass',
  );
  glass.position.set(
    positionXZ[0] + normalXZ[0] * 0.006,
    4.34,
    positionXZ[1] + normalXZ[1] * 0.006,
  );
  glass.rotation.y = angleY;
  glass.userData.turretletId = spec.id;
  glass.userData.socket = [...spec.position];
  glass.userData.ownership = 'roofline-upper-shoulder-tower-only';
  glass.userData.outwardNormalXZ = [...normalXZ];
  glass.userData.inhabitedRead = 'warmly lit crystalline lancet window';
  group.add(glass);
}

function markTowerMesh(mesh: THREE.Mesh, spec: PromotedTowerSpec, family?: string) {
  mesh.userData.turretletId = spec.id;
  mesh.userData.socket = [...spec.position];
  mesh.userData.ownership = 'roofline-upper-shoulder-tower-only';
  if (family) mesh.userData.family = family;
  return mesh;
}

function addPromotedShoulderTower(root: THREE.Group, spec: PromotedTowerSpec, mat: RooflineMaterialSet) {
  const [x, , z] = spec.position;
  const signX = Math.sign(x);
  const signZ = Math.sign(z);
  const capMaterial = spec.material === 'cyan' ? mat.cyan : mat.violet;
  const alternateMaterial = spec.material === 'cyan' ? mat.violet : mat.cyan;

  addTowerPrism(root, spec, spec.baseY, 3.84, 1, 0.92, mat.silverDark, `${spec.name}-v5-stepped-bearing-plinth`, 'promoted-shoulder-tower-bearing-seat');
  addTowerPrism(root, spec, 3.78, 4.02, 0.9, 0.84, mat.silver, `${spec.name}-v5-stepped-upper-shoulder`, 'promoted-shoulder-tower-stepped-shoulder');
  addTowerPrism(root, spec, 3.88, spec.drumTopY, 0.82, 0.7, mat.sapphireDark, `${spec.name}-v5-broad-sapphire-drum`, 'promoted-shoulder-tower-drum');
  addTowerPrism(root, spec, 3.91, 3.99, 0.855, 0.82, mat.gold, `${spec.name}-v5-gold-band-lower`, 'promoted-shoulder-tower-gold-band');
  addTowerPrism(root, spec, 4.54, 4.62, 0.75, 0.73, mat.gold, `${spec.name}-v5-gold-band-upper`, 'promoted-shoulder-tower-gold-band');

  const ribIndices = [0, 1, 2, 3, 4, 6];
  const ribBottom = towerFootprintPoints(spec, 0.8, 3.9);
  const ribTop = towerFootprintPoints(spec, 0.68, spec.drumTopY);
  ribIndices.forEach((pointIndex, ribIndex) => {
    root.add(markTowerMesh(cylinderBetween(
      vectorArray(ribBottom[pointIndex]),
      vectorArray(ribTop[pointIndex]),
      0.026,
      mat.silver,
      `${spec.name}-v5-silver-rib-${ribIndex + 1}`,
      6,
    ), spec, 'promoted-shoulder-tower-silver-rib'));
  });

  const diagonal: XZ = [signX / Math.sqrt(2), signZ / Math.sqrt(2)];
  addInhabitedLancet(root, spec, capMaterial, mat.silver, `${spec.name}-v5-inhabited-lancet-diagonal`, diagonal, [x + signX * 0.13, z + signZ * 0.13]);
  addInhabitedLancet(root, spec, alternateMaterial, mat.silver, `${spec.name}-v5-inhabited-lancet-side`, [signX, 0], [x + signX * 0.185, z - signZ * 0.055]);

  const capRootSeat = verticalCylinder(x, z, 4.66, 4.9, 0.235, mat.silver, `${spec.name}-v5-cap-root-seat`);
  capRootSeat.scale.z = 0.88;
  root.add(markTowerMesh(capRootSeat, spec, 'promoted-shoulder-tower-cap-seat'));
  const capGoldBand = verticalCylinder(x, z, 4.76, 4.84, 0.26, mat.gold, `${spec.name}-v5-cap-gold-band`);
  capGoldBand.scale.z = 0.88;
  root.add(markTowerMesh(capGoldBand, spec, 'promoted-shoulder-tower-gold-band'));

  const braceTargets: XYZ[] = [
    [x - 0.24, 4.64, z - 0.15],
    [x + 0.24, 4.64, z - 0.15],
    [x + 0.24, 4.64, z + 0.15],
    [x - 0.24, 4.64, z + 0.15],
  ];
  braceTargets.forEach((start, braceIndex) => {
    root.add(markTowerMesh(cylinderBetween(
      start,
      [x, 4.91, z],
      0.028,
      mat.silver,
      `${spec.name}-v5-cap-cradle-${braceIndex + 1}`,
      6,
    ), spec, 'promoted-shoulder-tower-cap-cradle'));
  });

  addCrystal(root, {
    position: [x, 4.84, z],
    baseY: 4.84,
    tipY: spec.capY,
    radius: 0.19,
  }, capMaterial, `${spec.name}-v5-medium-crystal-cap`);
  markTowerMesh(root.getObjectByName(`${spec.name}-v5-medium-crystal-cap-body`) as THREE.Mesh, spec, 'promoted-shoulder-tower-medium-cap');
  markTowerMesh(root.getObjectByName(`${spec.name}-v5-medium-crystal-cap-tip`) as THREE.Mesh, spec, 'promoted-shoulder-tower-medium-cap');
}

function vectorArray(vector: THREE.Vector3): XYZ {
  return [vector.x, vector.y, vector.z];
}

function addV6RingPanels(
  group: THREE.Group,
  lower: readonly THREE.Vector3[],
  upper: readonly THREE.Vector3[],
  panelMaterials: readonly THREE.Material[],
  family: string,
  tier: string,
) {
  for (let index = 0; index < lower.length; index += 1) {
    const next = (index + 1) % lower.length;
    const mesh = finishMesh(
      new THREE.Mesh(
        quadGeometry(lower[index], lower[next], upper[next], upper[index]),
        panelMaterials[index % panelMaterials.length],
      ),
      `${family}-panel-${index + 1}`,
      family,
    );
    mesh.userData.panelIndex = index + 1;
    mesh.userData.tier = tier;
    mesh.userData.seamRule = 'shared edges plus overlapping architectural rails';
    mesh.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
    group.add(mesh);
  }
}

function v6CylinderBetween(
  start: XYZ,
  end: XYZ,
  radius: number,
  material: THREE.Material,
  name: string,
  family = 'v6-architectural-rail',
  radialSegments = 8,
) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = new THREE.Vector3().subVectors(b, a);
  const mesh = finishMesh(
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments, 1, false),
      material,
    ),
    name,
    family,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.userData.start = [...start];
  mesh.userData.end = [...end];
  mesh.userData.radius = radius;
  mesh.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  return mesh;
}

function addV6ClosedRail(
  group: THREE.Group,
  points: readonly THREE.Vector3[],
  yOffset: number,
  radius: number,
  material: THREE.Material,
  family: string,
) {
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    const start = points[index].clone();
    const end = points[next].clone();
    start.y += yOffset;
    end.y += yOffset;
    group.add(v6CylinderBetween(
      vectorArray(start),
      vectorArray(end),
      radius,
      material,
      `${family}-${index + 1}`,
      family,
    ));
  }
}

function addV6Lancet(
  group: THREE.Group,
  center: XYZ,
  normalXZ: XZ,
  width: number,
  height: number,
  glassMaterial: THREE.Material,
  materials: V6CentralMaterialSet,
  name: string,
  tier: string,
) {
  const angleY = Math.atan2(normalXZ[0], normalXZ[1]);
  const frame = finishMesh(
    new THREE.Mesh(lancetGeometry(width, height), materials.silver),
    `${name}-silver-frame`,
    'v6-inhabited-lancet-frame',
  );
  frame.position.set(...center);
  frame.rotation.y = angleY;
  frame.userData.tier = tier;
  frame.userData.outwardNormalXZ = [...normalXZ];
  frame.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  group.add(frame);

  const glass = finishMesh(
    new THREE.Mesh(lancetGeometry(width * 0.66, height * 0.76), glassMaterial),
    `${name}-glowing-glass`,
    'v6-inhabited-lancet-glass',
  );
  glass.position.set(
    center[0] + normalXZ[0] * 0.007,
    center[1],
    center[2] + normalXZ[1] * 0.007,
  );
  glass.rotation.y = angleY;
  glass.userData.tier = tier;
  glass.userData.outwardNormalXZ = [...normalXZ];
  glass.userData.inhabitedRead = 'framed luminous occupied-window cue';
  glass.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  group.add(glass);
}

function addV6RingLancets(
  group: THREE.Group,
  wallRing: readonly THREE.Vector3[],
  y: number,
  width: number,
  height: number,
  materials: V6CentralMaterialSet,
  tier: string,
) {
  for (let index = 0; index < wallRing.length; index += 1) {
    const next = (index + 1) % wallRing.length;
    const a = wallRing[index];
    const b = wallRing[next];
    const edgeX = b.x - a.x;
    const edgeZ = b.z - a.z;
    const length = Math.hypot(edgeX, edgeZ);
    const normalXZ: XZ = [edgeZ / length, -edgeX / length];
    const center: XYZ = [
      (a.x + b.x) * 0.5 + normalXZ[0] * 0.012,
      y,
      (a.z + b.z) * 0.5 + normalXZ[1] * 0.012,
    ];
    addV6Lancet(
      group,
      center,
      normalXZ,
      width,
      height,
      index % 2 === 0 ? materials.cyan : materials.violet,
      materials,
      `${tier}-lancet-${index + 1}`,
      tier,
    );
  }
}

function addV6TierRibs(
  group: THREE.Group,
  ringSequence: readonly (readonly THREE.Vector3[])[],
  materials: V6CentralMaterialSet,
) {
  for (let index = 0; index < 8; index += 1) {
    for (let tier = 0; tier < ringSequence.length - 1; tier += 1) {
      const start = ringSequence[tier][index].clone();
      const end = ringSequence[tier + 1][index].clone();
      start.y += 0.018;
      end.y += 0.018;
      group.add(v6CylinderBetween(
        vectorArray(start),
        vectorArray(end),
        0.035,
        materials.silver,
        `v6-cascade-rib-${index + 1}-segment-${tier + 1}`,
        'v6-cascading-tier-rib',
        8,
      ));
    }
  }
}

function addV6TranseptShoulder(
  group: THREE.Group,
  shoulderId: string,
  spec: (typeof TRANSEPT_SHOULDERS)[keyof typeof TRANSEPT_SHOULDERS],
  materials: V6CentralMaterialSet,
  index: number,
) {
  const body = finishMesh(
    new THREE.Mesh(new THREE.BoxGeometry(...spec.size), materials.sapphireDeep),
    `v6-transept-${shoulderId}-occupied-body`,
    'v6-transept-occupied-shoulder',
  );
  body.position.set(...spec.center);
  body.userData.shoulderId = shoulderId;
  body.userData.center = [...spec.center];
  body.userData.size = [...spec.size];
  body.userData.contactRangeY = [4.25, 4.72];
  body.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  group.add(body);

  const cap = finishMesh(
    new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.22, 4, 1, false), materials.sapphire),
    `v6-transept-${shoulderId}-faceted-cap`,
    'v6-transept-shoulder-cap',
  );
  cap.position.set(spec.center[0], 4.82, spec.center[2]);
  cap.rotation.y = Math.PI * 0.25;
  cap.userData.shoulderId = shoulderId;
  cap.userData.baseY = 4.71;
  cap.userData.tipY = 4.93;
  cap.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  group.add(cap);

  const [normalX, normalZ] = spec.outwardNormalXZ;
  addV6Lancet(
    group,
    [
      spec.center[0] + normalX * (spec.size[0] * 0.5 + 0.006),
      4.48,
      spec.center[2] + normalZ * (spec.size[2] * 0.5 + 0.006),
    ],
    spec.outwardNormalXZ,
    0.22,
    0.34,
    index % 2 === 0 ? materials.violet : materials.cyan,
    materials,
    `v6-transept-${shoulderId}-inhabited-lancet`,
    'transept-shoulder',
  );
}

function addV6TowerShoulderWeb(
  group: THREE.Group,
  towerName: string,
  spec: PromotedTowerSpec,
  materials: V6CentralMaterialSet,
) {
  const [x, , z] = spec.position;
  const start = new THREE.Vector3(x, 4.46, z);
  const end = new THREE.Vector3(x * 0.69, 4.46, z * 0.69);
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = Math.hypot(delta.x, delta.z) + 0.16;
  const web = finishMesh(
    new THREE.Mesh(new THREE.BoxGeometry(0.60, 1.82, length), materials.sapphireDark),
    `v6-${towerName}-inhabited-shoulder-web`,
    'v6-tower-shoulder-integration-web',
  );
  web.position.copy(start).add(end).multiplyScalar(0.5);
  web.rotation.y = Math.atan2(delta.x, delta.z);
  web.userData.towerName = towerName;
  web.userData.protectedTowerSocket = [...spec.position];
  web.userData.contactRangeY = [3.55, 5.37];
  web.userData.purpose = 'opaque roof-owned buttress web that physically seats the preserved tower into the cascading keep';
  web.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
  group.add(web);

  group.add(v6CylinderBetween(
    [start.x, 5.36, start.z],
    [end.x, 5.36, end.z],
    0.046,
    materials.silver,
    `v6-${towerName}-shoulder-web-crown-rail`,
    'v6-tower-shoulder-integration-rail',
    8,
  ));

  [start, end].forEach((point, nodeIndex) => {
    const node = finishMesh(
      new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), materials.silverDark),
      `v6-${towerName}-shoulder-web-crown-node-${nodeIndex + 1}`,
      'v6-tower-shoulder-integration-node',
    );
    node.position.set(point.x, 5.36, point.z);
    node.userData.towerName = towerName;
    node.userData.junctionRole = nodeIndex === 0 ? 'protected-tower-seat' : 'cascading-keep-seat';
    node.userData.ownership = 'roofline-cascading-inhabited-upper-keep-only';
    group.add(node);
  });
}

function recordGeometryMetadata(root: THREE.Group) {
  let meshCount = 0;
  let triangleCount = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const position = object.geometry.getAttribute('position');
    const meshTriangles = object.geometry.index ? object.geometry.index.count / 3 : position.count / 3;
    triangleCount += meshTriangles;
    object.userData.triangleCount = meshTriangles;
  });
  const bounds = new THREE.Box3().setFromObject(root);
  root.userData.meshCount = meshCount;
  root.userData.triangleCount = triangleCount;
  root.userData.bounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
  root.userData.geometryContract = {
    expectedMeshCount: EXPECTED_MESH_COUNT,
    expectedTriangleCount: EXPECTED_TRIANGLE_COUNT,
    expectedBounds: { min: [-1.58600000469765, 3.549999952316284, -2.048799991607666], max: [1.58600000469765, 6.82000000705719, 2.048799991607666] },
  };
}

/**
 * Builds the accepted Floor Plan V3 roofline assembly in central-throne coordinates.
 * The central-hero-crown aperture remains physical and empty for its separately owned crown.
 */
export function buildIsland15CastleRooflineSpireSystemPart(
  materials: Island15CastleRooflineSpireSystemMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_CASTLE_ROOFLINE_SPIRE_SYSTEM_V2_PART';
  root.userData.partId = PART_ID;
  root.userData.partKind = 'part';
  root.userData.partModule = PART_MODULE;
  root.userData.presentationOnly = true;
  root.userData.floorPlanVersion = 3;
  root.userData.sourcePacketVersion = 6;
  root.userData.geometrySourceVersion = 6;
  root.userData.geometrySourceSha256 = GEOMETRY_SOURCE_SHA256;
  root.userData.geometryManifestSha256 = GEOMETRY_MANIFEST_SHA256;
  root.userData.preservedBaselineSourceSha256 = PRESERVED_BASELINE_SOURCE_SHA256;
  root.userData.protectedV5MeshCount = EXPECTED_PROTECTED_V5_MESH_COUNT;
  root.userData.invalidatedV5CentralMeshCount = EXPECTED_INVALIDATED_V5_CENTRAL_MESH_COUNT;
  root.userData.v6CentralMeshCount = EXPECTED_V6_CENTRAL_MESH_COUNT;
  root.userData.protectedV5FingerprintStatus = 'unchanged-from-runtime-v5';
  root.userData.assemblySocket = 'central-throne';
  root.userData.hideDuringBossFocus = true;
  root.userData.intentionalOpeningCount = 1;
  root.userData.crownPassThrough = {
    socket: CROWN_KEEPOUT.socket,
    parentLocalPosition: [...CROWN_KEEPOUT.parentLocalPosition],
    centerXZ: [...CROWN_KEEPOUT.centerXZ],
    sizeXZ: [...CROWN_KEEPOUT.sizeXZ],
  };
  root.userData.ownedFeatures = [
    'cascading-inhabited-upper-keep',
    'two-physical-terraces',
    'two-occupied-lancet-drums',
    'four-transept-shoulders',
    'four-tower-integration-webs',
    'modest-lower-and-second-roof-slopes',
    'ridge-crystals-a-and-b',
    'promoted-upper-shoulder-towers-t1-through-t4',
  ];
  root.userData.exclusions = [
    'hero-needle',
    'four-crown-pinnacles',
    'crown-collar-and-root-seats',
    'shell-walls-and-drums',
    'rooms',
    'wing-roofs',
    'connectors',
    'terrain',
    'route',
    'atmosphere',
    'lights',
    'ui',
    'gameplay',
  ];
  root.userData.turretlets = TURRETLETS.map(({ id, name, position, baseY, drumTopY, capY }) => ({
    id,
    name,
    position: [...position],
    baseY,
    drumTopY,
    capY,
    steppedPlinthEnvelopeXZ: [0.74, 0.68],
    broadDrumEnvelopeXZ: [0.6068, 0.5576],
  }));

  const mat = createRooflineMaterials(materials);
  const v6Mat = createV6CentralMaterials();
  const eaveBottom = ring(FOOTPRINT_XZ, V6_TIER_RINGS.eaveBottom.y, V6_TIER_RINGS.eaveBottom.footprintScale);
  const eaveTop = ring(FOOTPRINT_XZ, V6_TIER_RINGS.eaveTop.y, V6_TIER_RINGS.eaveTop.footprintScale);
  const lowerSlopeTop = ring(FOOTPRINT_XZ, V6_TIER_RINGS.lowerSlopeTop.y, V6_TIER_RINGS.lowerSlopeTop.footprintScale);
  const clerestoryBottom = ring(FOOTPRINT_XZ, V6_TIER_RINGS.lowerTerraceInner.y, V6_TIER_RINGS.lowerTerraceInner.footprintScale);
  const clerestoryTop = ring(FOOTPRINT_XZ, V6_TIER_RINGS.clerestoryTop.y, V6_TIER_RINGS.clerestoryTop.footprintScale);
  const clerestoryCorniceOuter = ring(FOOTPRINT_XZ, V6_TIER_RINGS.clerestoryCorniceOuter.y, V6_TIER_RINGS.clerestoryCorniceOuter.footprintScale);
  const secondSlopeBase = ring(FOOTPRINT_XZ, V6_TIER_RINGS.secondSlopeBase.y, V6_TIER_RINGS.secondSlopeBase.footprintScale);
  const secondSlopeTop = ring(FOOTPRINT_XZ, V6_TIER_RINGS.secondSlopeTop.y, V6_TIER_RINGS.secondSlopeTop.footprintScale);
  const upperDrumBottom = ring(FOOTPRINT_XZ, V6_TIER_RINGS.upperTerraceInner.y, V6_TIER_RINGS.upperTerraceInner.footprintScale);
  const upperDrumTop = ring(FOOTPRINT_XZ, V6_TIER_RINGS.upperDrumTop.y, V6_TIER_RINGS.upperDrumTop.footprintScale);
  const upperTerraceBackingOuter = ring(FOOTPRINT_XZ, 5.365, 0.595);
  const upperTerraceBackingInner = ring(FOOTPRINT_XZ, 5.365, 0.485);
  const upperDrumBackingOuter = ring(FOOTPRINT_XZ, 5.865, 0.515);
  const upperDrumBackingInner = ring(FOOTPRINT_XZ, 5.865, 0.47);
  const apertureLower = ring(APERTURE_XZ, V6_TIER_RINGS.apertureLower.y, V6_TIER_RINGS.apertureLower.apertureScale);
  const apertureTop = ring(APERTURE_XZ, V6_TIER_RINGS.apertureTop.y, V6_TIER_RINGS.apertureTop.apertureScale);

  addV6RingPanels(root, eaveBottom, eaveTop, [v6Mat.silverDark, v6Mat.silver], 'v6-eave-skirt', 'eave');
  addV6RingPanels(root, eaveTop, lowerSlopeTop, [v6Mat.sapphireDark, v6Mat.sapphire, v6Mat.sapphireLight], 'v6-modest-lower-slope', 'lower-slope');
  addV6RingPanels(root, clerestoryBottom, lowerSlopeTop, [v6Mat.sapphireLight, v6Mat.sapphire], 'v6-lower-physical-terrace', 'lower-terrace');
  addV6RingPanels(root, clerestoryBottom, clerestoryTop, [v6Mat.sapphireDeep, v6Mat.sapphireDark], 'v6-lower-clerestory-drum', 'lower-occupied-drum');
  addV6RingPanels(root, clerestoryTop, clerestoryCorniceOuter, [v6Mat.silverDark, v6Mat.silver], 'v6-clerestory-cornice', 'clerestory-cornice');
  addV6RingPanels(root, secondSlopeBase, clerestoryCorniceOuter, [v6Mat.sapphireLight, v6Mat.sapphire], 'v6-clerestory-cornice-terrace', 'clerestory-cornice-terrace');
  addV6RingPanels(root, secondSlopeBase, secondSlopeTop, [v6Mat.sapphire, v6Mat.sapphireDark, v6Mat.sapphireLight], 'v6-smaller-second-slope', 'second-slope');
  addV6RingPanels(root, upperDrumBottom, secondSlopeTop, [v6Mat.sapphireLight, v6Mat.sapphire], 'v6-upper-physical-terrace', 'upper-terrace');
  addV6RingPanels(root, upperTerraceBackingInner, upperTerraceBackingOuter, [v6Mat.sapphireDark], 'v6-upper-terrace-opaque-backing', 'upper-terrace-backing');
  addV6RingPanels(root, upperDrumBottom, upperDrumTop, [v6Mat.sapphireDeep, v6Mat.sapphireDark], 'v6-upper-occupied-drum', 'upper-occupied-drum');
  addV6RingPanels(root, upperDrumBackingInner, upperDrumBackingOuter, [v6Mat.sapphireDark], 'v6-upper-drum-crown-opaque-backing', 'upper-drum-crown-backing');
  addV6RingPanels(root, upperDrumTop, apertureLower, [v6Mat.sapphire, v6Mat.sapphireLight, v6Mat.sapphireDark], 'v6-aperture-shoulder-roof', 'aperture-shoulder');
  addV6RingPanels(root, apertureLower, apertureTop, [v6Mat.silverDark, v6Mat.silver], 'v6-aperture-wall', 'aperture-wall');

  addV6ClosedRail(root, eaveTop, 0.025, 0.050, v6Mat.silver, 'v6-eave-seam-rail');
  addV6ClosedRail(root, lowerSlopeTop, 0.035, 0.044, v6Mat.gold, 'v6-lower-terrace-outer-rail');
  addV6ClosedRail(root, clerestoryBottom, 0.028, 0.040, v6Mat.silver, 'v6-lower-clerestory-base-rail');
  addV6ClosedRail(root, clerestoryTop, 0.030, 0.040, v6Mat.gold, 'v6-lower-clerestory-crown-rail');
  addV6ClosedRail(root, secondSlopeTop, 0.030, 0.037, v6Mat.silver, 'v6-upper-terrace-outer-rail');
  addV6ClosedRail(root, upperDrumBottom, 0.025, 0.035, v6Mat.gold, 'v6-upper-drum-base-rail');
  addV6ClosedRail(root, upperDrumTop, 0.025, 0.035, v6Mat.silver, 'v6-upper-drum-crown-rail');
  addV6ClosedRail(root, apertureTop, 0.025, 0.044, v6Mat.silver, 'v6-aperture-seam-rail');

  addV6TierRibs(root, [eaveTop, lowerSlopeTop, clerestoryTop, secondSlopeTop, upperDrumTop, apertureLower], v6Mat);
  addV6RingLancets(root, clerestoryBottom, 4.53, 0.22, 0.36, v6Mat, 'v6-lower-clerestory');
  addV6RingLancets(root, upperDrumBottom, 5.63, 0.16, 0.30, v6Mat, 'v6-upper-drum');
  Object.entries(TRANSEPT_SHOULDERS).forEach(([shoulderId, spec], index) => {
    addV6TranseptShoulder(root, shoulderId, spec, v6Mat, index);
  });
  TURRETLETS.forEach((spec) => addV6TowerShoulderWeb(root, spec.name, spec, v6Mat));

  TURRETLETS.forEach((spec) => addPromotedShoulderTower(root, spec, mat));

  Object.entries(RIDGE_CRYSTALS).forEach(([name, spec]) => {
    const [x, , z] = spec.position;
    const crystalMaterial = spec.material === 'cyan' ? mat.cyan : mat.violet;
    root.add(verticalCylinder(x, z, spec.baseY - 0.1, spec.baseY + 0.07, spec.radius * 1.18, mat.silver, `${name}-root-seat`));
    const keepoutCenterZ = CROWN_KEEPOUT.centerXZ[1];
    const outward: XYZ = [x * 1.16, spec.baseY - 0.08, keepoutCenterZ + (z - keepoutCenterZ) * 1.16];
    root.add(cylinderBetween([x, spec.baseY, z], outward, 0.028, mat.gold, `${name}-outward-root-brace`, 6));
    addCrystal(root, spec, crystalMaterial, name);
  });

  recordGeometryMetadata(root);
  return root;
}
