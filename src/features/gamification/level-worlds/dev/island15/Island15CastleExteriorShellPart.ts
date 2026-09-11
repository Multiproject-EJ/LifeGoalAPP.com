import * as THREE from 'three';

export type Island15CastleExteriorShellLevel = 0 | 1 | 2 | 3;

export interface Island15CastleExteriorShellMaterials {
  castle: THREE.Material;
  castleShadow: THREE.Material;
  silver: THREE.Material;
  gold: THREE.Material;
  warmWindow: THREE.Material;
  midnight: THREE.Material;
  crystalGlow: THREE.Material;
  violetCrystal: THREE.Material;
  deepIce: THREE.Material;
}

type XYZ = readonly [number, number, number];

const PART_ID = 'castle-exterior-shell';
const PART_MODULE = 'island15/Island15CastleExteriorShellPart';
const MAX_CROWN_Y = 10.55;

// Floor Plan V3: exact frozen-throne-core local footprint.
const THRONE_FOOTPRINT_XZ = [
  [-1.25, -2.05],
  [1.25, -2.05],
  [1.6, -1.7],
  [1.6, 1.7],
  [1.25, 2.05],
  [-1.25, 2.05],
  [-1.6, 1.7],
  [-1.6, -1.7],
] as const;

function finishMesh<T extends THREE.Mesh>(mesh: T, name: string) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.partId = PART_ID;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  size: XYZ,
  position: XYZ,
  material: THREE.Material,
  rotation: XYZ = [0, 0, 0],
) {
  const mesh = finishMesh(new THREE.Mesh(new THREE.BoxGeometry(...size), material), name);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function makeFootprintGeometry(height: number, scale = 1) {
  const shape = new THREE.Shape();
  THRONE_FOOTPRINT_XZ.forEach(([x, z], index) => {
    const px = x * scale;
    // After the -90 degree X rotation below, Shape Y becomes world -Z.
    const py = -z * scale;
    if (index === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function addFootprintCourse(
  parent: THREE.Object3D,
  name: string,
  baseY: number,
  height: number,
  scale: number,
  material: THREE.Material,
) {
  const mesh = finishMesh(new THREE.Mesh(makeFootprintGeometry(height, scale), material), name);
  mesh.position.y = baseY;
  parent.add(mesh);
  return mesh;
}

function makeGabledRoofGeometry(width: number, depth: number, eaveY: number, ridgeY: number) {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const positions = new Float32Array([
    -halfW, eaveY, -halfD,
    halfW, eaveY, -halfD,
    0, ridgeY, -halfD,
    -halfW, eaveY, halfD,
    halfW, eaveY, halfD,
    0, ridgeY, halfD,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 1, 2,
    3, 5, 4,
    0, 3, 4, 0, 4, 1,
    1, 4, 5, 1, 5, 2,
    2, 5, 3, 2, 3, 0,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function addGabledRoof(
  parent: THREE.Object3D,
  name: string,
  width: number,
  depth: number,
  eaveY: number,
  ridgeY: number,
  positionXZ: readonly [number, number],
  material: THREE.Material,
  rotationY = 0,
) {
  const mesh = finishMesh(
    new THREE.Mesh(makeGabledRoofGeometry(width, depth, eaveY, ridgeY), material),
    name,
  );
  mesh.position.set(positionXZ[0], 0, positionXZ[1]);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

function makeLancetGeometry(
  width: number,
  height: number,
  depth: number,
  bevelEnabled = true,
  curveSegments = 8,
) {
  const shape = new THREE.Shape();
  const halfW = width * 0.5;
  shape.moveTo(-halfW, 0);
  shape.lineTo(-halfW, height * 0.55);
  shape.quadraticCurveTo(-halfW * 0.92, height * 0.77, 0, height);
  shape.quadraticCurveTo(halfW * 0.92, height * 0.77, halfW, height * 0.55);
  shape.lineTo(halfW, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled,
    bevelSegments: bevelEnabled ? 1 : 0,
    bevelSize: bevelEnabled ? Math.min(width * 0.035, 0.018) : 0,
    bevelThickness: bevelEnabled ? 0.012 : 0,
    curveSegments,
  });
  geometry.computeVertexNormals();
  return geometry;
}

function addLancet(
  parent: THREE.Object3D,
  name: string,
  width: number,
  height: number,
  position: XYZ,
  rotationY: number,
  casingMaterial: THREE.Material,
  glassMaterial: THREE.Material,
  revealMaterial: THREE.Material = casingMaterial,
) {
  // A dark, oversize stone reveal gives every aperture physical wall depth.
  // The luminous casing and glass are then stepped toward the exterior rather
  // than sitting as two coplanar decals on the nave skin.
  const outward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const reveal = finishMesh(
    new THREE.Mesh(makeLancetGeometry(width * 1.22, height * 1.08, 0.07, false, 3), revealMaterial),
    `${name}_RECESSED_STONE_REVEAL`,
  );
  reveal.position.set(position[0], position[1] - height * 0.025, position[2]);
  reveal.rotation.y = rotationY;
  parent.add(reveal);

  const frame = finishMesh(
    new THREE.Mesh(makeLancetGeometry(width, height, 0.055), casingMaterial),
    `${name}_SILVER_CASING`,
  );
  frame.position.set(...position);
  frame.position.add(outward.clone().multiplyScalar(0.025));
  frame.rotation.y = rotationY;
  parent.add(frame);

  const glass = finishMesh(
    new THREE.Mesh(makeLancetGeometry(width * 0.73, height * 0.82, 0.06), glassMaterial),
    `${name}_INHABITED_APERTURE`,
  );
  glass.position.set(position[0], position[1] + height * 0.04, position[2]);
  glass.position.add(outward.clone().multiplyScalar(0.052));
  glass.rotation.y = rotationY;
  parent.add(glass);
  return { reveal, frame, glass };
}

function addEngagedFacadeButtress(
  parent: THREE.Object3D,
  name: string,
  positionXZ: readonly [number, number],
  outwardAxis: 'x' | 'z',
  outwardSign: -1 | 1,
  materials: Island15CastleExteriorShellMaterials,
  crystalMaterial: THREE.Material,
) {
  const [x, z] = positionXZ;
  const depthSize: XYZ = outwardAxis === 'x' ? [0.2, 0.34, 0.28] : [0.28, 0.34, 0.2];
  const shaftSize: XYZ = outwardAxis === 'x' ? [0.13, 1.53, 0.19] : [0.19, 1.53, 0.13];
  const shoulderSize: XYZ = outwardAxis === 'x' ? [0.17, 0.25, 0.25] : [0.25, 0.25, 0.17];
  const upperSize: XYZ = outwardAxis === 'x' ? [0.12, 0.56, 0.16] : [0.16, 0.56, 0.12];
  const accentSize: XYZ = outwardAxis === 'x' ? [0.055, 0.82, 0.075] : [0.075, 0.82, 0.055];
  const exteriorOffset = outwardSign * 0.025;
  const exteriorX = outwardAxis === 'x' ? x + exteriorOffset : x;
  const exteriorZ = outwardAxis === 'z' ? z + exteriorOffset : z;

  addBox(parent, `${name}_BROAD_SEATED_FOOT`, depthSize, [exteriorX, 0.49, exteriorZ], materials.midnight);
  addBox(parent, `${name}_LOWER_ENGAGED_SHAFT`, shaftSize, [exteriorX, 1.16, exteriorZ], materials.castleShadow);
  addBox(parent, `${name}_LOWER_SILVER_WATER_TABLE`, shoulderSize, [exteriorX, 1.85, exteriorZ], materials.silver);
  addBox(parent, `${name}_UPPER_SETBACK_SHAFT`, upperSize, [exteriorX, 2.2, exteriorZ], materials.castle);
  addBox(parent, `${name}_GOLD_VERTICAL_INLAY`, accentSize, [
    outwardAxis === 'x' ? exteriorX + outwardSign * 0.055 : exteriorX,
    1.32,
    outwardAxis === 'z' ? exteriorZ + outwardSign * 0.055 : exteriorZ,
  ], materials.gold);
  addBox(parent, `${name}_UPPER_SILVER_SEAT`, shoulderSize, [exteriorX, 2.51, exteriorZ], materials.silver);

  const fin = finishMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), crystalMaterial),
    `${name}_SEATED_CRYSTAL_ARCHITECTURAL_FIN`,
  );
  fin.position.set(exteriorX, 2.88, exteriorZ);
  fin.scale.set(0.46, 1.72, 0.46);
  fin.rotation.y = Math.PI * 0.25;
  fin.userData.shellRole = 'intermediate-seated-facade-fin';
  parent.add(fin);

  const goldBoss = finishMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), materials.gold),
    `${name}_LUMINOUS_GOLD_BOSS`,
  );
  goldBoss.position.set(
    outwardAxis === 'x' ? exteriorX + outwardSign * 0.055 : exteriorX,
    2.13,
    outwardAxis === 'z' ? exteriorZ + outwardSign * 0.055 : exteriorZ,
  );
  goldBoss.scale.set(0.72, 1.34, 0.42);
  parent.add(goldBoss);
}

function addCourseBand(
  parent: THREE.Object3D,
  name: string,
  radius: number,
  height: number,
  y: number,
  material: THREE.Material,
) {
  const mesh = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8, 1, false), material),
    name,
  );
  mesh.position.y = y;
  mesh.rotation.y = Math.PI * 0.125;
  parent.add(mesh);
  return mesh;
}

function addBeamBetween(
  parent: THREE.Object3D,
  name: string,
  start: XYZ,
  end: XYZ,
  thickness: number,
  material: THREE.Material,
) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const delta = to.clone().sub(from);
  const mesh = finishMesh(
    new THREE.Mesh(new THREE.BoxGeometry(thickness, delta.length(), thickness), material),
    name,
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  parent.add(mesh);
  return mesh;
}

function addOctagonalButtressTower(
  parent: THREE.Object3D,
  name: string,
  center: readonly [number, number],
  materials: Island15CastleExteriorShellMaterials,
  glassMaterial: THREE.Material,
) {
  const [x, z] = center;
  const tower = new THREE.Group();
  tower.name = name;
  tower.userData.partId = PART_ID;
  tower.userData.shellRole = 'physically-attached-corner-buttress-tower';
  tower.userData.maximumY = 3.46;

  const addTowerCourse = (
    courseName: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    y: number,
    material: THREE.Material,
  ) => {
    const course = finishMesh(
      new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8, 1, false), material),
      `${name}_${courseName}`,
    );
    course.position.set(x, y, z);
    tower.add(course);
  };

  addTowerCourse('BROAD_BEARING_FOOT', 0.29, 0.34, 0.38, 0.48, materials.midnight);
  addTowerCourse('LOWER_SILVER_COURSE', 0.31, 0.31, 0.12, 0.73, materials.silver);
  addTowerCourse('SAPPHIRE_BUTTRESS_SHAFT', 0.23, 0.27, 1.72, 1.64, materials.castleShadow);
  addTowerCourse('FACETED_INNER_SKIN', 0.185, 0.215, 1.48, 1.68, materials.castle);
  addTowerCourse('UPPER_SILVER_COURSE', 0.27, 0.27, 0.13, 2.56, materials.silver);
  addTowerCourse('STEPPED_SHOULDER', 0.2, 0.27, 0.32, 2.79, materials.castleShadow);
  addTowerCourse('GOLD_CAP_BAND', 0.215, 0.215, 0.08, 2.99, materials.gold);

  const xSign = Math.sign(x) || 1;
  const zSign = Math.sign(z) || 1;
  addLancet(
    tower,
    `${name}_OUTWARD_SIDE_LANCET`,
    0.22,
    0.68,
    [x + xSign * 0.205, 1.32, z],
    xSign * Math.PI * 0.5,
    materials.silver,
    glassMaterial,
    materials.castleShadow,
  );
  addLancet(
    tower,
    `${name}_OUTWARD_END_LANCET`,
    0.22,
    0.68,
    [x, 1.32, z + zSign * 0.205],
    zSign > 0 ? 0 : Math.PI,
    materials.silver,
    glassMaterial,
    materials.castleShadow,
  );

  const crown = finishMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), glassMaterial),
    `${name}_LOW_CRYSTAL_BUTTRESS_FINIAL`,
  );
  crown.position.set(x, 3.19, z);
  crown.scale.set(0.76, 1.42, 0.76);
  tower.add(crown);

  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI * 0.5;
    const ribX = x + Math.sin(angle) * 0.245;
    const ribZ = z + Math.cos(angle) * 0.245;
    const rib = addBox(
      tower,
      `${name}_ENGAGED_BUTTRESS_RIB_${index + 1}`,
      [0.09, 1.92, 0.09],
      [ribX, 1.56, ribZ],
      index % 2 ? materials.silver : materials.castleShadow,
      [0, angle, 0],
    );
    rib.userData.physicallyAttached = true;
  }

  parent.add(tower);
  return tower;
}

function addStageZero(
  root: THREE.Group,
  materials: Island15CastleExteriorShellMaterials,
) {
  const stage = new THREE.Group();
  stage.name = 'ISLAND_15_CASTLE_SHELL_STAGE_0_FOUNDATIONS';
  stage.userData.buildStage = 0;

  addFootprintCourse(stage, 'ISLAND_15_CASTLE_EXACT_CHAMFERED_UNDERSIDE', -0.64, 0.28, 0.94, materials.midnight);
  addFootprintCourse(stage, 'ISLAND_15_CASTLE_EXACT_CHAMFERED_PLINTH', -0.36, 0.42, 1, materials.castleShadow);
  addFootprintCourse(stage, 'ISLAND_15_CASTLE_SILVER_FOUNDATION_COURSE', 0.06, 0.13, 0.975, materials.silver);
  addFootprintCourse(stage, 'ISLAND_15_CASTLE_INNER_BEARING_COURSE', 0.19, 0.19, 0.89, materials.castle);

  const footings: Array<readonly [number, number]> = [
    [-1.31, -1.69], [1.31, -1.69], [-1.31, 1.69], [1.31, 1.69],
    [-1.43, 0], [1.43, 0], [0, -1.89], [0, 1.89],
  ];
  footings.forEach(([x, z], index) => {
    const footing = finishMesh(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.62, 8), materials.deepIce),
      `ISLAND_15_CASTLE_UNDERSIDE_BEARING_${index + 1}`,
    );
    footing.position.set(x, -0.63, z);
    footing.rotation.y = Math.PI * 0.125;
    stage.add(footing);
  });

  root.add(stage);
}

function addStageOne(
  root: THREE.Group,
  materials: Island15CastleExteriorShellMaterials,
) {
  const stage = new THREE.Group();
  stage.name = 'ISLAND_15_CASTLE_SHELL_STAGE_1_NAVE';
  stage.userData.buildStage = 1;

  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_OCTAGONAL_NAVE_MASS',
    0.38,
    2.48,
    0.82,
    materials.castleShadow,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_OCTAGONAL_NAVE_ICE_SKIN',
    0.565,
    2.25,
    0.74,
    materials.castle,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_BROAD_LOWER_SHOULDER_COURSE',
    0.38,
    0.34,
    0.94,
    materials.castleShadow,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_LOWER_SHOULDER_SILVER_SETBACK',
    0.72,
    0.15,
    0.915,
    materials.silver,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_LOWER_SHOULDER_SAPPHIRE_RISER',
    0.87,
    0.26,
    0.875,
    materials.castle,
  );

  addBox(stage, 'ISLAND_15_CASTLE_SOUTH_PORTAL_HALL', [1.46, 2.16, 0.72], [0, 1.43, 1.66], materials.castleShadow);
  addBox(stage, 'ISLAND_15_CASTLE_SOUTH_PORTAL_HALL_SKIN', [1.25, 1.94, 0.62], [0, 1.48, 1.69], materials.castle);
  addBox(stage, 'ISLAND_15_CASTLE_NORTH_APSE', [1.36, 1.94, 0.58], [0, 1.37, -1.69], materials.castleShadow);
  addBox(stage, 'ISLAND_15_CASTLE_NORTH_APSE_SKIN', [1.15, 1.72, 0.5], [0, 1.42, -1.72], materials.castle);

  addGabledRoof(stage, 'ISLAND_15_CASTLE_SOUTH_PORTAL_GABLE', 1.5, 0.73, 2.51, 3.18, [0, 1.65], materials.deepIce);
  addGabledRoof(stage, 'ISLAND_15_CASTLE_NORTH_APSE_GABLE', 1.4, 0.6, 2.31, 2.91, [0, -1.68], materials.deepIce);

  addLancet(stage, 'ISLAND_15_CASTLE_GREAT_PORTAL', 0.82, 1.52, [0, 0.54, 1.925], 0, materials.gold, materials.warmWindow, materials.midnight);
  addLancet(stage, 'ISLAND_15_CASTLE_REAR_APSE_WINDOW', 0.48, 1.1, [0, 0.93, -1.925], Math.PI, materials.silver, materials.violetCrystal, materials.castleShadow);

  [-0.52, 0.52].forEach((x, index) => {
    addLancet(
      stage,
      `ISLAND_15_CASTLE_REAR_LOWER_BAY_LANCET_${index + 1}`,
      0.24,
      0.72,
      [x, 0.87, -1.965],
      Math.PI,
      materials.silver,
      index ? materials.crystalGlow : materials.violetCrystal,
      materials.castleShadow,
    );
    addBox(
      stage,
      `ISLAND_15_CASTLE_REAR_LOWER_BAY_PILASTER_${index + 1}`,
      [0.1, 1.72, 0.12],
      [x * 1.48, 1.24, -1.84],
      index ? materials.gold : materials.silver,
    );
  });

  const portalOculus = finishMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), materials.crystalGlow),
    'ISLAND_15_CASTLE_GREAT_PORTAL_CYAN_OCULUS',
  );
  portalOculus.position.set(0, 2.4, 2.015);
  portalOculus.scale.set(0.82, 1.3, 0.42);
  stage.add(portalOculus);
  addBox(stage, 'ISLAND_15_CASTLE_GREAT_PORTAL_GOLD_TRANSOM', [1.18, 0.09, 0.11], [0, 2.12, 1.96], materials.gold);

  [-0.76, 0.76].forEach((x, index) => {
    addBox(stage, `ISLAND_15_CASTLE_PORTAL_PIER_${index + 1}`, [0.17, 2.35, 0.25], [x, 1.4, 1.73], materials.midnight, [0, 0, x < 0 ? -0.035 : 0.035]);
    addBox(stage, `ISLAND_15_CASTLE_PORTAL_PIER_CAP_${index + 1}`, [0.27, 0.16, 0.32], [x, 2.56, 1.73], materials.silver);
  });

  [-1, 1].forEach((side, index) => {
    addBox(
      stage,
      `ISLAND_15_CASTLE_PORTAL_GOLD_VERTICAL_RELIEF_${index + 1}`,
      [0.07, 1.46, 0.09],
      [side * 0.54, 1.43, 2.015],
      materials.gold,
      [0, 0, side * 0.04],
    );
  });

  root.add(stage);
}

function addStageTwo(
  root: THREE.Group,
  materials: Island15CastleExteriorShellMaterials,
) {
  const stage = new THREE.Group();
  stage.name = 'ISLAND_15_CASTLE_SHELL_STAGE_2_GALLERIES';
  stage.userData.buildStage = 2;

  [-1, 1].forEach((side, sideIndex) => {
    const x = side * 1.18;
    addBox(stage, `ISLAND_15_CASTLE_TRANSEPT_${sideIndex + 1}`, [0.84, 2.28, 2.36], [x, 1.49, -0.05], materials.castleShadow);
    addBox(stage, `ISLAND_15_CASTLE_TRANSEPT_SKIN_${sideIndex + 1}`, [0.69, 2.02, 2.12], [x, 1.55, -0.05], materials.castle);
    addGabledRoof(
      stage,
      `ISLAND_15_CASTLE_TRANSEPT_ROOF_${sideIndex + 1}`,
      2.22,
      0.72,
      2.49,
      3.06,
      [x, -0.05],
      materials.deepIce,
      Math.PI * 0.5,
    );
    addLancet(
      stage,
      `ISLAND_15_CASTLE_TRANSEPT_OUTER_WINDOW_${sideIndex + 1}`,
      0.46,
      1.08,
      [side * 1.535, 0.93, -0.05],
      side * Math.PI * 0.5,
      materials.silver,
      sideIndex === 0 ? materials.violetCrystal : materials.crystalGlow,
      materials.castleShadow,
    );
    [-0.77, 0.7].forEach((z, windowIndex) => {
      addLancet(
        stage,
        `ISLAND_15_CASTLE_TRANSEPT_${sideIndex + 1}_SIDE_LANCET_${windowIndex + 1}`,
        0.31,
        0.88,
        [x, 1.02, z],
        z > 0 ? 0 : Math.PI,
        materials.silver,
        windowIndex === sideIndex ? materials.violetCrystal : materials.crystalGlow,
        materials.castleShadow,
      );
    });
  });

  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_MIDDLE_GOTHIC_SHOULDER',
    2.4,
    0.34,
    0.845,
    materials.castleShadow,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_MIDDLE_SHOULDER_SILVER_COURSE',
    2.74,
    0.14,
    0.825,
    materials.silver,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_UPPER_GALLERY_SAPPHIRE_RISER',
    2.88,
    0.3,
    0.72,
    materials.castle,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_LOWER_FACADE_SILVER_WATER_TABLE',
    1.02,
    0.09,
    0.885,
    materials.silver,
  );
  addFootprintCourse(
    stage,
    'ISLAND_15_CASTLE_MIDDLE_FACADE_GOLD_STRING_COURSE',
    2.12,
    0.075,
    0.86,
    materials.gold,
  );

  addGabledRoof(stage, 'ISLAND_15_CASTLE_MAIN_NAVE_ROOF', 2.25, 3.23, 2.78, 3.58, [0, -0.08], materials.deepIce);
  addBox(stage, 'ISLAND_15_CASTLE_FRONT_GALLERY_CORNICE', [2.58, 0.17, 0.2], [0, 2.67, 1.47], materials.silver);
  addBox(stage, 'ISLAND_15_CASTLE_REAR_GALLERY_CORNICE', [2.58, 0.17, 0.2], [0, 2.67, -1.63], materials.silver);
  addBox(stage, 'ISLAND_15_CASTLE_EAST_GALLERY_CORNICE', [0.2, 0.17, 2.72], [1.3, 2.67, -0.08], materials.silver);
  addBox(stage, 'ISLAND_15_CASTLE_WEST_GALLERY_CORNICE', [0.2, 0.17, 2.72], [-1.3, 2.67, -0.08], materials.silver);

  [-1, 1].forEach((side, sideIndex) => {
    [-0.68, 0.58].forEach((z, bayIndex) => {
      addBox(
        stage,
        `ISLAND_15_CASTLE_${side < 0 ? 'WEST' : 'EAST'}_BAY_PILASTER_${bayIndex + 1}`,
        [0.13, 2.18, 0.18],
        [side * 1.55, 1.54, z],
        bayIndex === sideIndex ? materials.gold : materials.silver,
      );
      const bayRelief = finishMesh(
        new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), bayIndex === sideIndex ? materials.violetCrystal : materials.crystalGlow),
        `ISLAND_15_CASTLE_${side < 0 ? 'WEST' : 'EAST'}_BAY_RELIEF_${bayIndex + 1}`,
      );
      bayRelief.position.set(side * 1.625, 2.28, z);
      bayRelief.scale.set(0.42, 1.35, 0.72);
      stage.add(bayRelief);
    });
  });

  [-0.52, 0.52].forEach((x, index) => {
    addLancet(
      stage,
      `ISLAND_15_CASTLE_REAR_CLERESTORY_LANCET_${index + 1}`,
      0.25,
      0.66,
      [x, 2.02, -1.98],
      Math.PI,
      materials.silver,
      index ? materials.violetCrystal : materials.crystalGlow,
      materials.castleShadow,
    );
    addLancet(
      stage,
      `ISLAND_15_CASTLE_FRONT_CLERESTORY_LANCET_${index + 1}`,
      0.23,
      0.62,
      [x, 2.03, 1.99],
      0,
      materials.gold,
      index ? materials.crystalGlow : materials.violetCrystal,
      materials.castleShadow,
    );
  });

  const tower = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.83, 1.02, 2.75, 8), materials.castleShadow),
    'ISLAND_15_CASTLE_CENTRAL_TOWER_STRUCTURAL_SHELL',
  );
  tower.position.set(0, 4.52, -0.1);
  tower.rotation.y = Math.PI * 0.125;
  stage.add(tower);
  const towerSkin = finishMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.89, 2.49, 8), materials.midnight),
    'ISLAND_15_CASTLE_CENTRAL_TOWER_SAPPHIRE_SKIN',
  );
  towerSkin.position.set(0, 4.55, -0.1);
  towerSkin.rotation.y = Math.PI * 0.125;
  stage.add(towerSkin);
  addCourseBand(stage, 'ISLAND_15_CASTLE_TOWER_BROAD_BEARING_DRUM', 1.08, 0.34, 3.2, materials.castleShadow).position.z = -0.1;
  addCourseBand(stage, 'ISLAND_15_CASTLE_TOWER_BEARING_DRUM_SILVER_LIP', 1.11, 0.11, 3.4, materials.silver).position.z = -0.1;
  addCourseBand(stage, 'ISLAND_15_CASTLE_TOWER_LOWER_SILVER_COURSE', 1.04, 0.16, 3.19, materials.silver).position.z = -0.1;
  addCourseBand(stage, 'ISLAND_15_CASTLE_TOWER_UPPER_SILVER_COURSE', 0.86, 0.16, 5.84, materials.silver).position.z = -0.1;

  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 0.25;
    const radius = 0.785;
    const material = index % 3 === 0 ? materials.violetCrystal : materials.crystalGlow;
    addLancet(
      stage,
      `ISLAND_15_CASTLE_TOWER_LANCET_${index + 1}`,
      0.29,
      0.91,
      [Math.sin(angle) * radius, 4.02, -0.1 + Math.cos(angle) * radius],
      angle,
      materials.silver,
      material,
      materials.castleShadow,
    );
  }

  root.add(stage);
}

function addStageThree(
  root: THREE.Group,
  materials: Island15CastleExteriorShellMaterials,
) {
  const stage = new THREE.Group();
  stage.name = 'ISLAND_15_CASTLE_SHELL_STAGE_3_RESTORED_CROWN_SHELL';
  stage.userData.buildStage = 3;

  const buttressTowerCenters = [
    [-1.32, -1.35],
    [1.32, -1.35],
    [1.32, 1.35],
    [-1.32, 1.35],
  ] as const;
  buttressTowerCenters.forEach((center, index) => {
    addOctagonalButtressTower(
      stage,
      `ISLAND_15_CASTLE_CORNER_BUTTRESS_TOWER_${index + 1}`,
      center,
      materials,
      index % 2 ? materials.crystalGlow : materials.violetCrystal,
    );
  });

  // Six deliberate, physically seated façade fins bridge the source's dense
  // crystalline-Gothic wall rhythm without becoming a free-standing cone
  // forest. Four articulate the true side elevations; two complete the rear.
  const engagedFacadeButtresses = [
    { position: [-1.535, -0.72] as const, axis: 'x' as const, sign: -1 as const },
    { position: [-1.535, 0.62] as const, axis: 'x' as const, sign: -1 as const },
    { position: [1.535, -0.72] as const, axis: 'x' as const, sign: 1 as const },
    { position: [1.535, 0.62] as const, axis: 'x' as const, sign: 1 as const },
    { position: [-0.78, -1.98] as const, axis: 'z' as const, sign: -1 as const },
    { position: [0.78, -1.98] as const, axis: 'z' as const, sign: -1 as const },
  ];
  engagedFacadeButtresses.forEach(({ position, axis, sign }, index) => {
    addEngagedFacadeButtress(
      stage,
      `ISLAND_15_CASTLE_ENGAGED_FACADE_BUTTRESS_${index + 1}`,
      position,
      axis,
      sign,
      materials,
      index % 2 ? materials.crystalGlow : materials.violetCrystal,
    );
  });

  const buttresses: ReadonlyArray<readonly [XYZ, XYZ]> = [
    [[-1.45, 0.34, 1.45], [-1.18, 2.62, 1.18]],
    [[1.45, 0.34, 1.45], [1.18, 2.62, 1.18]],
    [[-1.45, 0.34, -1.45], [-1.18, 2.62, -1.18]],
    [[1.45, 0.34, -1.45], [1.18, 2.62, -1.18]],
    [[-1.45, 0.34, 0], [-1.27, 2.56, 0]],
    [[1.45, 0.34, 0], [1.27, 2.56, 0]],
  ];
  buttresses.forEach(([start, end], index) => {
    addBeamBetween(stage, `ISLAND_15_CASTLE_FLYING_BUTTRESS_${index + 1}`, start, end, 0.18, materials.castleShadow);
    addBox(stage, `ISLAND_15_CASTLE_BUTTRESS_FOOT_${index + 1}`, [0.28, 0.5, 0.32], [start[0], 0.37, start[2]], materials.midnight);
    const finial = finishMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), index % 2 ? materials.gold : materials.silver),
      `ISLAND_15_CASTLE_BUTTRESS_FINIAL_${index + 1}`,
    );
    finial.position.set(start[0], 0.73, start[2]);
    finial.scale.y = 1.35;
    stage.add(finial);
  });

  // The roofline owns the broad aperture rim and the crown owns its collar/root
  // seats. This compact shell-owned drum stays inside the accepted aperture and
  // physically closes the 6.24 -> 6.66 bearing gap without moving either sibling.
  const socketDrumWall = addCourseBand(stage, 'ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_SAPPHIRE_WALL', 0.515, 0.4, 6.44, materials.castleShadow);
  socketDrumWall.position.z = -0.1;
  socketDrumWall.rotation.y = 0;
  const socketDrumBearing = addCourseBand(stage, 'ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_SILVER_BEARING', 0.535, 0.11, 6.285, materials.silver);
  socketDrumBearing.position.z = -0.1;
  socketDrumBearing.rotation.y = 0;
  const socketDrumLip = addCourseBand(stage, 'ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_GOLD_LIP', 0.525, 0.07, 6.615, materials.gold);
  socketDrumLip.position.z = -0.1;
  socketDrumLip.rotation.y = 0;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 0.25;
    const x = Math.sin(angle) * 0.485;
    const z = -0.1 + Math.cos(angle) * 0.485;
    addBox(
      stage,
      `ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_RIB_${index + 1}`,
      [0.085, 0.3, 0.085],
      [x, 6.445, z],
      index % 2 ? materials.silver : materials.castle,
      [0, angle, 0],
    );
    const goldBoss = finishMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), index % 2 ? materials.crystalGlow : materials.violetCrystal),
      `ISLAND_15_CASTLE_CROWN_SOCKET_DRUM_INSET_${index + 1}`,
    );
    goldBoss.position.set(Math.sin(angle) * 0.505, 6.46, -0.1 + Math.cos(angle) * 0.505);
    goldBoss.scale.set(0.62, 1.22, 0.42);
    stage.add(goldBoss);
  }

  const roofRidge = addBeamBetween(
    stage,
    'ISLAND_15_CASTLE_MAIN_ROOF_SILVER_RIDGE',
    [0, 3.59, -1.57],
    [0, 3.59, 1.42],
    0.09,
    materials.silver,
  );
  roofRidge.userData.supportedRoofRidge = true;

  const reliefSites: ReadonlyArray<readonly [number, number, number]> = [
    [-0.93, 1.63, 1.42], [0.93, 1.63, 1.42], [-0.93, 1.63, -1.56], [0.93, 1.63, -1.56],
    [-1.5, 1.57, -0.72], [-1.5, 1.57, 0.62], [1.5, 1.57, -0.72], [1.5, 1.57, 0.62],
  ];
  reliefSites.forEach(([x, y, z], index) => {
    const relief = finishMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), index % 3 === 0 ? materials.gold : materials.silver),
      `ISLAND_15_CASTLE_MASONRY_RELIEF_${index + 1}`,
    );
    relief.position.set(x, y, z);
    relief.scale.set(0.72, 1.45, 0.48);
    stage.add(relief);
  });

  const crownSocket = new THREE.Object3D();
  crownSocket.name = 'ISLAND_15_CASTLE_HERO_CROWN_SOCKET';
  crownSocket.position.set(0, 6.66, -0.1);
  crownSocket.userData.socketId = 'central-hero-crown';
  crownSocket.userData.socketOwner = PART_ID;
  crownSocket.userData.consumedBy = 'tower-crown-and-hero-crystal';
  stage.add(crownSocket);

  root.add(stage);
}

/**
 * Procedural, presentation-only exterior shell for the Island 015 central citadel.
 *
 * Levels are additive construction states. They are never interpreted as physical storeys,
 * gameplay progress, or stop completion. Interior rooms and all connector geometry are owned
 * by their dedicated parts.
 */
export function buildIsland15CastleExteriorShellPart(
  materials: Island15CastleExteriorShellMaterials,
  level: Island15CastleExteriorShellLevel,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ISLAND_15_CASTLE_EXTERIOR_SHELL_PART';
  root.userData.partId = PART_ID;
  root.userData.partKind = 'part';
  root.userData.partModule = PART_MODULE;
  root.userData.presentationOnly = true;
  root.userData.buildLevel = level;
  root.userData.buildStagesAreStoreys = false;
  root.userData.footprint = {
    authority: 'citadel-floor-plan.v3',
    shape: 'chamfered-octagonal-nave',
    width: 3.2,
    depth: 4.1,
    localPolygonXZ: THRONE_FOOTPRINT_XZ.map(([x, z]) => [x, z]),
  };
  root.userData.maximumCrownY = MAX_CROWN_Y;
  root.userData.maximumShellY = 6.65;
  root.userData.assemblySocket = 'central-throne';
  root.userData.ownedFeatures = [
    'walls-and-structural-drums',
    'front-side-and-rear-facades',
    'great-gate-envelope',
    'stepped-lower-wall-shoulders',
    'four-corner-buttress-towers',
    'recessed-lancet-stone-reveals',
    'six-engaged-facade-buttress-tiers',
    'six-intermediate-seated-crystal-fins',
    'silver-and-gold-facade-course-rhythm',
    'crown-socket-bearing-drum',
  ];
  root.userData.facadeDepthSystem = {
    recessedLancetRevealsAtL3: 30,
    engagedButtressStacksAtL3: 6,
    seatedArchitecturalFinsAtL3: 6,
    newContinuousFacadeCoursesAtL3: 2,
    rearAndSideConstruction: true,
  };
  root.userData.connectorSockets = [
    { id: 'rear-left-core', position: [-1.35, 0.68, -1.75], yawDegrees: -122.2, geometryOwner: 'castle-wing-connector-system' },
    { id: 'rear-right-core', position: [1.35, 0.68, -1.75], yawDegrees: 121.3, geometryOwner: 'castle-wing-connector-system' },
    { id: 'front-left-core', position: [-1.35, 0.68, 1.75], yawDegrees: -59.3, geometryOwner: 'castle-wing-connector-system' },
    { id: 'front-right-core', position: [1.35, 0.68, 1.75], yawDegrees: 59.4, geometryOwner: 'castle-wing-connector-system' },
  ];
  root.userData.exclusions = [
    'room-interiors',
    'connector-arms-and-risers',
    'terrain',
    'route',
    'atmosphere',
    'ui',
    'roofline-eaves-ribs-terraces-and-turretlets',
    'crown-collar-root-seats-needle-and-pinnacles',
  ];

  addStageZero(root, materials);
  if (level >= 1) addStageOne(root, materials);
  if (level >= 2) addStageTwo(root, materials);
  if (level >= 3) addStageThree(root, materials);

  root.traverse((object) => {
    if (object !== root && !object.userData.partId) {
      object.userData.partId = PART_ID;
      object.userData.explodeWithParent = true;
    }
  });
  return root;
}
