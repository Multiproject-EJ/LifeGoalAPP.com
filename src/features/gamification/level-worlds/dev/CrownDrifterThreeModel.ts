import * as THREE from 'three';

export type CrownDrifterLod = 'board' | 'arena';
export type CrownDrifterQuality = 'low' | 'medium' | 'high';

export interface CrownDrifterModelOptions {
  lod: CrownDrifterLod;
  quality: CrownDrifterQuality;
}

export interface CrownDrifterModel {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  finPivots: THREE.Group[];
  lanternPivots: THREE.Group[];
  crownPivot: THREE.Group;
  update: (
    elapsedSeconds: number,
    deltaSeconds: number,
    reducedMotion: boolean,
    emergenceProgress?: number,
  ) => void;
  dispose: () => void;
}

interface CrownDrifterMaterials {
  stone: THREE.MeshStandardMaterial;
  stoneShade: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  bronzeDark: THREE.MeshStandardMaterial;
  membrane: THREE.MeshPhysicalMaterial;
  eye: THREE.MeshPhysicalMaterial;
  pupil: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  moss: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  lantern: THREE.MeshPhysicalMaterial;
  shadow: THREE.MeshBasicMaterial;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function createMaterials(lod: CrownDrifterLod, quality: CrownDrifterQuality): CrownDrifterMaterials {
  const physical = lod === 'arena' && quality !== 'low';
  const transmission = physical ? 0.34 : 0;
  return {
    stone: new THREE.MeshStandardMaterial({
      color: 0x746f61,
      roughness: 0.83,
      metalness: 0.02,
      flatShading: true,
    }),
    stoneShade: new THREE.MeshStandardMaterial({ color: 0x4b4d43, roughness: 0.91, metalness: 0.01, flatShading: true }),
    bronze: new THREE.MeshStandardMaterial({
      color: 0xa56d35,
      roughness: 0.39,
      metalness: 0.68,
      emissive: 0x241206,
      emissiveIntensity: 0.12,
    }),
    bronzeDark: new THREE.MeshStandardMaterial({ color: 0x57351f, roughness: 0.54, metalness: 0.58 }),
    membrane: new THREE.MeshPhysicalMaterial({
      color: 0x176f73,
      roughness: 0.22,
      metalness: 0.02,
      transparent: true,
      opacity: physical ? 0.88 : 0.93,
      transmission: transmission * 0.2,
      thickness: physical ? 0.22 : 0,
      clearcoat: physical ? 0.55 : 0.18,
      clearcoatRoughness: 0.22,
      side: THREE.DoubleSide,
      depthWrite: !physical,
      emissive: 0x073f42,
      emissiveIntensity: 0.26,
    }),
    eye: new THREE.MeshPhysicalMaterial({
      color: 0x69e86c,
      roughness: 0.09,
      metalness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: 0x2da642,
      emissiveIntensity: 0.92,
    }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x0b2817, roughness: 0.08, metalness: 0.08 }),
    glow: new THREE.MeshStandardMaterial({
      color: 0xaaffae,
      roughness: 0.12,
      emissive: 0x63f26e,
      emissiveIntensity: 1.35,
    }),
    moss: new THREE.MeshStandardMaterial({ color: 0x4d6e32, roughness: 0.97, metalness: 0, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: 0x5b3d27, roughness: 0.92, metalness: 0.01 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x66833c, roughness: 0.87, metalness: 0 }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0x75f5e7,
      roughness: 0.08,
      metalness: 0.02,
      transparent: true,
      opacity: physical ? 0.82 : 0.94,
      transmission: physical ? 0.28 : 0,
      thickness: 0.38,
      emissive: 0x20a89f,
      emissiveIntensity: 0.72,
    }),
    lantern: new THREE.MeshPhysicalMaterial({
      color: 0xffe18e,
      roughness: 0.2,
      metalness: 0.03,
      transparent: true,
      opacity: 0.92,
      transmission: physical ? 0.18 : 0,
      emissive: 0xd7902f,
      emissiveIntensity: 1.18,
    }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x0c2730, transparent: true, opacity: 0.26, depthWrite: false }),
  };
}

function setModelIdentity(object: THREE.Object3D) {
  let unnamedPartIndex = 0;
  object.traverse((child) => {
    child.userData.arenaCreatureId = 'crown-drifter';
    if ((child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) && !child.name) {
      unnamedPartIndex += 1;
      child.name = `CROWN_DRIFTER_DETAIL_PART_${String(unnamedPartIndex).padStart(3, '0')}`;
      child.userData.explodeWithParent = true;
    }
  });
}

function addShadowFlags(object: THREE.Object3D, castShadow: boolean) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = true;
    }
  });
}

function createCylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments: number,
): THREE.Mesh {
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius, Math.max(0.001, direction.length()), segments),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  return mesh;
}

function createWingShape(side: -1 | 1): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(side * 0.3, 0.26, side * 0.88, 0.9, side * 1.58, 1.22);
  shape.bezierCurveTo(side * 1.86, 1.32, side * 1.92, 1.05, side * 1.78, 0.78);
  shape.bezierCurveTo(side * 1.48, 0.24, side * 0.82, -0.12, 0, 0);
  return shape;
}

function addWing(
  side: -1 | 1,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  lod: CrownDrifterLod,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'CROWN_DRIFTER_LEFT_WING_PIVOT' : 'CROWN_DRIFTER_RIGHT_WING_PIVOT';
  pivot.position.set(side * 0.94, 0.27, 0.05);

  const wingShape = createWingShape(side);
  const membrane = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wingShape, {
      depth: lod === 'arena' ? 0.075 : 0.045,
      bevelEnabled: quality !== 'low',
      bevelSegments: quality === 'high' ? 2 : 1,
      bevelSize: 0.025,
      bevelThickness: 0.022,
      curveSegments: quality === 'high' && lod === 'arena' ? 18 : 10,
      steps: 1,
    }),
    materials.membrane,
  );
  membrane.name = side < 0 ? 'CROWN_DRIFTER_LEFT_WING_MEMBRANE' : 'CROWN_DRIFTER_RIGHT_WING_MEMBRANE';
  membrane.position.z = lod === 'arena' ? -0.075 : -0.045;
  pivot.add(membrane);

  const ribCount = lod === 'arena' && quality === 'high' ? 5 : quality === 'low' ? 2 : 3;
  for (let index = 0; index < ribCount; index += 1) {
    const ratio = (index + 1) / (ribCount + 1);
    const outer = new THREE.Vector3(
      side * (0.5 + ratio * 1.18),
      0.12 + Math.sin(ratio * Math.PI) * 0.88,
      0.015,
    );
    pivot.add(createCylinderBetween(new THREE.Vector3(0.03 * side, 0.02, 0.015), outer, 0.036, materials.bronze, quality === 'low' ? 5 : 7));
  }
  const rootRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 7, quality === 'high' ? 18 : 12), materials.bronze);
  rootRing.position.set(side * 0.08, 0.04, 0.02);
  pivot.add(rootRing);
  const insignia = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 7, 18), materials.glow);
  insignia.position.set(side * 1.18, 0.7, 0.03);
  pivot.add(insignia);
  return pivot;
}

function addEye(
  body: THREE.Group,
  side: -1 | 1,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
) {
  const segments = quality === 'low' ? 12 : quality === 'medium' ? 18 : 24;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.31, segments, Math.max(8, segments / 2)), materials.eye);
  eye.name = side < 0 ? 'CROWN_DRIFTER_LEFT_EYE' : 'CROWN_DRIFTER_RIGHT_EYE';
  eye.scale.set(0.82, 1.08, 0.36);
  eye.position.set(side * 0.43, 0.02, 0.96);
  body.add(eye);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.14, segments, 8), materials.pupil);
  pupil.scale.set(0.78, 1.08, 0.25);
  pupil.position.set(side * 0.43, 0.02, 1.055);
  body.add(pupil);

  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.043, 8, 6), materials.glow);
  glint.position.set(side * 0.385, 0.115, 1.105);
  body.add(glint);
}

function addForeheadSigil(body: THREE.Group, materials: CrownDrifterMaterials, quality: CrownDrifterQuality) {
  const segments = quality === 'low' ? 14 : 24;
  for (const [radius, tube, material] of [
    [0.24, 0.055, materials.bronze],
    [0.125, 0.033, materials.glow],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 7, segments), material);
    ring.position.set(0, 0.57, 0.92);
    body.add(ring);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), materials.crystal);
  gem.position.set(0, 0.86, 0.87);
  body.add(gem);
}

function addShellRelief(
  body: THREE.Group,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  lod: CrownDrifterLod,
) {
  const reliefAnchors: readonly (readonly [number, number, number, number])[] = [
    [-0.72, 0.5, 0.73, 0.19],
    [-0.35, 0.72, 0.72, 0.16],
    [0.33, 0.73, 0.72, 0.17],
    [0.72, 0.48, 0.72, 0.2],
    [-0.88, 0.23, 0.58, 0.13],
    [0.88, 0.22, 0.58, 0.13],
    [-0.64, -0.31, 0.77, 0.11],
    [0.63, -0.32, 0.77, 0.11],
  ];
  const visibleAnchors = lod === 'arena' && quality === 'high'
    ? reliefAnchors
    : reliefAnchors.slice(0, quality === 'low' ? 4 : 6);
  visibleAnchors.forEach(([x, y, z, radius], index) => {
    const patch = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      index % 3 === 0 ? materials.moss : materials.stoneShade,
    );
    patch.name = `CROWN_DRIFTER_SHELL_RELIEF_${index + 1}`;
    patch.position.set(x, y, z);
    patch.scale.set(1.42, 0.58, 0.34);
    patch.rotation.z = index * 0.61;
    patch.userData.explodeWithParent = true;
    body.add(patch);
  });
}

function addRearShellAssembly(
  body: THREE.Group,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  lod: CrownDrifterLod,
) {
  const segments = quality === 'high' ? 24 : 14;
  const rearHousing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.065, 8, segments), materials.bronze);
  rearHousing.name = 'CROWN_DRIFTER_REAR_POWER_HOUSING';
  rearHousing.position.set(0, 0.1, -0.93);
  body.add(rearHousing);
  const rearCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), materials.crystal);
  rearCore.name = 'CROWN_DRIFTER_REAR_POWER_CORE';
  rearCore.position.set(0, 0.1, -1.01);
  body.add(rearCore);

  const plateCount = lod === 'arena' && quality === 'high' ? 5 : 3;
  for (let index = 0; index < plateCount; index += 1) {
    const angle = (index / Math.max(1, plateCount - 1) - 0.5) * 1.25;
    const plate = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 0), index % 2 === 0 ? materials.stoneShade : materials.moss);
    plate.name = `CROWN_DRIFTER_REAR_ARMOR_PLATE_${index + 1}`;
    plate.position.set(Math.sin(angle) * 0.72, 0.48 - Math.abs(angle) * 0.16, -0.8 - Math.cos(angle) * 0.12);
    plate.scale.set(1.5, 0.56, 0.34);
    plate.rotation.z = angle * 0.62;
    plate.userData.explodeWithParent = true;
    body.add(plate);
  }

  for (const side of [-1, 1] as const) {
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 1), materials.crystal);
    node.name = side < 0 ? 'CROWN_DRIFTER_REAR_LEFT_CRYSTAL' : 'CROWN_DRIFTER_REAR_RIGHT_CRYSTAL';
    node.scale.y = 1.55;
    node.position.set(side * 0.57, -0.25, -0.83);
    body.add(node);
    const rail = createCylinderBetween(
      new THREE.Vector3(side * 0.12, 0.1, -0.95),
      new THREE.Vector3(side * 0.57, -0.25, -0.83),
      0.034,
      materials.bronze,
      quality === 'low' ? 5 : 8,
    );
    rail.name = side < 0 ? 'CROWN_DRIFTER_REAR_LEFT_RAIL' : 'CROWN_DRIFTER_REAR_RIGHT_RAIL';
    body.add(rail);
  }
}

function addShellBands(body: THREE.Group, materials: CrownDrifterMaterials, quality: CrownDrifterQuality, lod: CrownDrifterLod) {
  const segments = quality === 'high' ? 36 : quality === 'medium' ? 26 : 18;
  const horizontal = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.055, 7, segments), materials.bronze);
  horizontal.scale.set(1, 0.82, 1);
  horizontal.rotation.x = Math.PI / 2;
  horizontal.position.y = 0.37;
  body.add(horizontal);

  for (const side of [-1, 1] as const) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, segments), materials.bronze);
    housing.position.set(side * 1.05, 0.12, 0.05);
    housing.rotation.z = Math.PI / 2;
    body.add(housing);
    const core = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 7, segments), materials.glow);
    core.position.set(side * 1.16, 0.12, 0.05);
    core.rotation.y = Math.PI / 2;
    body.add(core);
  }

  const rivetCount = lod === 'arena' ? quality === 'high' ? 22 : 14 : 8;
  for (let index = 0; index < rivetCount; index += 1) {
    const angle = (index / rivetCount) * Math.PI * 2;
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), materials.bronze);
    rivet.position.set(Math.cos(angle) * 1.04, 0.38, Math.sin(angle) * 0.88);
    body.add(rivet);
  }
}

function addForwardAppendage(
  body: THREE.Group,
  side: -1 | 1,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
) {
  const segments = quality === 'low' ? 7 : 11;
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'CROWN_DRIFTER_LEFT_STEERING_APPENDAGE' : 'CROWN_DRIFTER_RIGHT_STEERING_APPENDAGE';
  pivot.position.set(side * 0.61, -0.38, 0.66);
  pivot.rotation.z = side * -0.38;
  const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.62, 4, segments), materials.stone);
  shaft.rotation.z = side * 0.04;
  shaft.position.set(side * 0.05, -0.3, 0.18);
  pivot.add(shaft);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.055, 7, segments + 4), materials.bronze);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.set(side * 0.08, -0.67, 0.22);
  pivot.add(cuff);
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.29, quality === 'low' ? 0 : 1), materials.membrane);
  tip.scale.set(0.78, 1.5, 0.62);
  tip.position.set(side * 0.1, -0.98, 0.24);
  pivot.add(tip);
  body.add(pivot);
}

function addLowerFins(
  body: THREE.Group,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
): THREE.Group[] {
  const finPivots: THREE.Group[] = [];
  const segments = quality === 'low' ? 5 : 7;
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.name = `CROWN_DRIFTER_LOWER_FIN_${index + 1}`;
    pivot.position.set(Math.cos(angle) * 0.82, -0.76, Math.sin(angle) * 0.73);
    pivot.rotation.y = -angle;
    pivot.rotation.z = Math.cos(angle) * 0.24;
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.95, segments), materials.membrane);
    fin.position.y = -0.38;
    fin.scale.z = 0.46;
    pivot.add(fin);
    if (index % 2 === 0) {
      const speck = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), materials.crystal);
      speck.position.set(0, -0.2, 0.14);
      pivot.add(speck);
    }
    body.add(pivot);
    finPivots.push(pivot);
  }
  return finPivots;
}

function addChain(
  pivot: THREE.Group,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  length: number,
) {
  const links = quality === 'high' ? 5 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < links; index += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 5, 8), materials.bronzeDark);
    link.position.y = -(index + 1) * (length / (links + 1));
    link.rotation.y = index % 2 === 0 ? 0 : Math.PI / 2;
    pivot.add(link);
  }
}

function addLantern(
  body: THREE.Group,
  side: -1 | 1,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  lod: CrownDrifterLod,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'CROWN_DRIFTER_LEFT_LANTERN_PIVOT' : 'CROWN_DRIFTER_RIGHT_LANTERN_PIVOT';
  pivot.position.set(side * 1.55, 0.02, -0.03);
  addChain(pivot, materials, quality, 0.82);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, quality === 'low' ? 10 : 16, 8), materials.lantern);
  globe.scale.y = 1.15;
  globe.position.y = -0.98;
  pivot.add(globe);
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const cage = createCylinderBetween(
      new THREE.Vector3(Math.cos(angle) * 0.16, -0.78, Math.sin(angle) * 0.16),
      new THREE.Vector3(Math.cos(angle) * 0.16, -1.18, Math.sin(angle) * 0.16),
      0.018,
      materials.bronze,
      5,
    );
    pivot.add(cage);
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, quality === 'low' ? 7 : 10), materials.bronze);
  cap.position.y = -0.71;
  pivot.add(cap);
  const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), materials.crystal);
  drop.position.y = -1.3;
  pivot.add(drop);
  if (lod === 'arena' && quality === 'high') {
    const light = new THREE.PointLight(0xffd37a, 0.44, 2.4, 2);
    light.position.y = -0.98;
    pivot.add(light);
  }
  body.add(pivot);
  return pivot;
}

function addCenterCharm(body: THREE.Group, materials: CrownDrifterMaterials, quality: CrownDrifterQuality) {
  const pivot = new THREE.Group();
  pivot.name = 'CROWN_DRIFTER_CENTER_CHARM_PIVOT';
  pivot.position.set(0, -0.82, -0.1);
  addChain(pivot, materials, quality, 0.66);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), materials.eye);
  orb.position.y = -0.72;
  pivot.add(orb);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), materials.crystal);
  crystal.scale.y = 1.75;
  crystal.position.y = -1.08;
  pivot.add(crystal);
  body.add(pivot);
}

function addCrownEcosystem(
  body: THREE.Group,
  materials: CrownDrifterMaterials,
  quality: CrownDrifterQuality,
  lod: CrownDrifterLod,
): THREE.Group {
  const crown = new THREE.Group();
  crown.name = 'CROWN_DRIFTER_BONSAI_CROWN_PIVOT';
  crown.position.y = 0.8;
  body.add(crown);

  const terraceCount = lod === 'arena' && quality === 'high' ? 9 : quality === 'low' ? 4 : 6;
  for (let index = 0; index < terraceCount; index += 1) {
    const angle = (index / terraceCount) * Math.PI * 2 + 0.24;
    const terrace = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (index % 3) * 0.06, 0), index % 2 === 0 ? materials.moss : materials.stoneShade);
    terrace.scale.y = 0.48;
    terrace.position.set(Math.cos(angle) * (0.46 + (index % 2) * 0.22), 0.05 + (index % 3) * 0.025, Math.sin(angle) * 0.48);
    crown.add(terrace);
  }
  const retainingBand = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 7, quality === 'high' ? 28 : 18), materials.bronze);
  retainingBand.rotation.x = Math.PI / 2;
  retainingBand.position.y = -0.04;
  crown.add(retainingBand);

  const crystalCount = lod === 'arena' && quality === 'high' ? 7 : 4;
  for (let index = 0; index < crystalCount; index += 1) {
    const angle = (index / crystalCount) * Math.PI * 2 + 0.5;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 + (index % 2) * 0.035), materials.crystal);
    crystal.scale.y = 1.65;
    crystal.position.set(Math.cos(angle) * 0.72, 0.3 + (index % 3) * 0.06, Math.sin(angle) * 0.58);
    crown.add(crystal);
  }

  const trunkPoints = [
    new THREE.Vector3(0.04, 0.12, 0),
    new THREE.Vector3(-0.18, 0.72, 0.02),
    new THREE.Vector3(0.12, 1.18, -0.04),
    new THREE.Vector3(-0.04, 1.62, 0.02),
  ];
  for (let index = 0; index < trunkPoints.length - 1; index += 1) {
    crown.add(createCylinderBetween(trunkPoints[index], trunkPoints[index + 1], 0.12 - index * 0.018, materials.bark, quality === 'low' ? 7 : 10));
  }
  const branchEnds = [
    new THREE.Vector3(-0.8, 1.25, 0.02),
    new THREE.Vector3(0.72, 1.45, -0.05),
    new THREE.Vector3(-0.34, 1.78, 0.04),
  ];
  branchEnds.forEach((end, index) => {
    const start = trunkPoints[Math.min(trunkPoints.length - 1, index + 1)];
    crown.add(createCylinderBetween(start, end, 0.065, materials.bark, quality === 'low' ? 6 : 9));
  });

  const canopyCount = lod === 'arena' && quality === 'high' ? 16 : quality === 'low' ? 7 : 11;
  const canopyAnchors = [
    new THREE.Vector3(-0.72, 1.34, 0.02),
    new THREE.Vector3(0.66, 1.5, -0.03),
    new THREE.Vector3(-0.24, 1.83, 0.02),
  ];
  for (let index = 0; index < canopyCount; index += 1) {
    const anchor = canopyAnchors[index % canopyAnchors.length];
    const layer = Math.floor(index / canopyAnchors.length);
    const angle = index * 2.39996;
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.27 + (index % 3) * 0.035, 0), materials.leaf);
    leaf.scale.set(1.35, 0.5, 0.92);
    leaf.position.set(
      anchor.x + Math.cos(angle) * (0.16 + layer * 0.025),
      anchor.y + Math.sin(angle * 0.7) * 0.09,
      anchor.z + Math.sin(angle) * (0.13 + layer * 0.02),
    );
    crown.add(leaf);
  }
  return crown;
}

export function createCrownDrifterModel(options: CrownDrifterModelOptions): CrownDrifterModel {
  const { lod, quality } = options;
  const materials = createMaterials(lod, quality);
  const root = new THREE.Group();
  root.name = lod === 'arena' ? 'CROWN_DRIFTER_ARENA_LOD' : 'CROWN_DRIFTER_BOARD_LOD';
  root.userData.arenaCreatureId = 'crown-drifter';
  root.userData.sculptRuntime = {
    modelId: 'crown-drifter',
    lod,
    quality,
    clickable: true,
    explodable: true,
    pivots: [
      'CROWN_DRIFTER_BODY_FLOAT_PIVOT',
      'CROWN_DRIFTER_LEFT_WING_PIVOT',
      'CROWN_DRIFTER_RIGHT_WING_PIVOT',
      'CROWN_DRIFTER_BONSAI_CROWN_PIVOT',
    ],
    sockets: {
      arenaOrigin: [0, -1.25, 0],
      crown: [0, 0.72, 0],
      leftWing: [-0.94, 0.27, 0.05],
      rightWing: [0.94, 0.27, 0.05],
    },
  };

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.92, quality === 'low' ? 16 : 28), materials.shadow);
  shadow.name = 'CROWN_DRIFTER_CONTACT_SHADOW';
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.62;
  shadow.position.y = -1.25;
  root.add(shadow);

  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'CROWN_DRIFTER_BODY_FLOAT_PIVOT';
  root.add(bodyPivot);

  const bodySegments = quality === 'low' ? 1 : quality === 'medium' ? 2 : 3;
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.06, bodySegments), materials.stone);
  shell.name = 'CROWN_DRIFTER_FACETED_BODY_SHELL';
  shell.scale.set(1.12, 0.82, 0.94);
  bodyPivot.add(shell);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.9, quality === 'low' ? 14 : 24, quality === 'low' ? 9 : 14), materials.stone);
  face.name = 'CROWN_DRIFTER_INSET_FACE_SHELL';
  face.scale.set(1.02, 0.64, 0.34);
  face.position.set(0, -0.06, 0.74);
  bodyPivot.add(face);

  addEye(bodyPivot, -1, materials, quality);
  addEye(bodyPivot, 1, materials, quality);
  addForeheadSigil(bodyPivot, materials, quality);
  addShellBands(bodyPivot, materials, quality, lod);
  addShellRelief(bodyPivot, materials, quality, lod);
  addRearShellAssembly(bodyPivot, materials, quality, lod);
  addForwardAppendage(bodyPivot, -1, materials, quality);
  addForwardAppendage(bodyPivot, 1, materials, quality);

  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.48, -0.38, 1.01),
    new THREE.Vector3(0, -0.47, 1.07),
    new THREE.Vector3(0.48, -0.38, 1.01),
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, quality === 'low' ? 8 : 14, 0.025, 5, false), materials.bronzeDark);
  mouth.name = 'CROWN_DRIFTER_MOUTH_SEAM';
  bodyPivot.add(mouth);

  const leftWingPivot = addWing(-1, materials, quality, lod);
  const rightWingPivot = addWing(1, materials, quality, lod);
  bodyPivot.add(leftWingPivot, rightWingPivot);
  const finPivots = addLowerFins(bodyPivot, materials, quality);
  const lanternPivots = [
    addLantern(bodyPivot, -1, materials, quality, lod),
    addLantern(bodyPivot, 1, materials, quality, lod),
  ];
  addCenterCharm(bodyPivot, materials, quality);
  const crownPivot = addCrownEcosystem(bodyPivot, materials, quality, lod);

  setModelIdentity(root);
  addShadowFlags(root, quality !== 'low');
  shadow.castShadow = false;
  shadow.receiveShadow = false;

  const update = (
    elapsedSeconds: number,
    _deltaSeconds: number,
    reducedMotion: boolean,
    emergenceProgress = 1,
  ) => {
    const motionScale = reducedMotion ? 0 : 1;
    bodyPivot.position.y = Math.sin(elapsedSeconds * 1.22) * 0.075 * motionScale;
    bodyPivot.rotation.z = Math.sin(elapsedSeconds * 0.48) * 0.025 * motionScale;
    const wingBeat = Math.sin(elapsedSeconds * 2.9) * 0.13 * motionScale;
    leftWingPivot.rotation.z = -0.12 - wingBeat;
    rightWingPivot.rotation.z = 0.12 + wingBeat;
    leftWingPivot.rotation.y = -0.08 - wingBeat * 0.18;
    rightWingPivot.rotation.y = 0.08 + wingBeat * 0.18;
    finPivots.forEach((fin, index) => {
      const pulse = Math.sin(elapsedSeconds * 2.15 + index * 0.46) * 0.055 * motionScale;
      fin.rotation.x = pulse;
      fin.scale.y = 1 + pulse * 0.7;
    });
    lanternPivots.forEach((lantern, index) => {
      lantern.rotation.z = Math.sin(elapsedSeconds * 1.35 + index * Math.PI) * 0.09 * motionScale;
      lantern.rotation.x = Math.cos(elapsedSeconds * 1.02 + index) * 0.035 * motionScale;
    });
    crownPivot.rotation.z = Math.sin(elapsedSeconds * 0.72) * 0.022 * motionScale;
    crownPivot.rotation.x = Math.cos(elapsedSeconds * 0.58) * 0.014 * motionScale;
    materials.eye.emissiveIntensity = 0.9 + Math.sin(elapsedSeconds * 1.6) * 0.13 * motionScale;
    materials.crystal.emissiveIntensity = 0.68 + Math.sin(elapsedSeconds * 1.3 + 0.8) * 0.12 * motionScale;
    const revealScale = 0.62 + Math.max(0, Math.min(1, emergenceProgress)) * 0.38;
    root.scale.setScalar(revealScale);
    shadow.material.opacity = 0.12 + emergenceProgress * 0.14;
    shadow.scale.set(0.78 + emergenceProgress * 0.22, 0.48 + emergenceProgress * 0.14, 1);
  };

  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const disposableMaterials = new Set<THREE.Material>();
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh)) return;
      geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => disposableMaterials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    disposableMaterials.forEach((material) => material.dispose());
  };

  return {
    root,
    bodyPivot,
    leftWingPivot,
    rightWingPivot,
    finPivots,
    lanternPivots,
    crownPivot,
    update,
    dispose,
  };
}
