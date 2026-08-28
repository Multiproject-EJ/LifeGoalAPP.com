import * as THREE from 'three';

export type Island22WaterDragonPartQuality = 'low' | 'medium' | 'high';

export type Island22WaterDragonElectricStage =
  | 'idle'
  | 'charging'
  | 'primed'
  | 'release'
  | 'cooldown';

export interface Island22WaterDragonAttackPresentation {
  elapsedSeconds: number;
  charge01: number;
  release01: number;
  streamDirection?: THREE.Vector3;
  reducedMotion?: boolean;
}

export interface Island22IconicWaterDragonPartsOptions {
  quality?: Island22WaterDragonPartQuality;
  bodyColor?: THREE.ColorRepresentation;
  bodyDarkColor?: THREE.ColorRepresentation;
  bellyColor?: THREE.ColorRepresentation;
  shellColor?: THREE.ColorRepresentation;
  membraneColor?: THREE.ColorRepresentation;
  electricColor?: THREE.ColorRepresentation;
  eyeColor?: THREE.ColorRepresentation;
}

export interface Island22IconicWaterDragonPartsRuntime {
  root: THREE.Group;
  headPivot: THREE.Group;
  jawPivot: THREE.Group;
  crownPivot: THREE.Group;
  gillPivots: readonly [THREE.Group, THREE.Group];
  whiskerPivots: readonly [THREE.Group, THREE.Group];
  ramShieldPivot: THREE.Group;
  waterStreamPivot: THREE.Group;
  sockets: {
    body: THREE.Object3D;
    neck: THREE.Object3D;
    throat: THREE.Object3D;
    ramImpact: THREE.Object3D;
    streamTip: THREE.Object3D;
    eyeAim: THREE.Object3D;
  };
  setStreamDirection: (direction: THREE.Vector3) => void;
  updateAttack: (presentation: Island22WaterDragonAttackPresentation) => Island22WaterDragonElectricStage;
  setJawOpen: (open01: number) => void;
  dispose: () => void;
}

interface DragonMaterials {
  body: THREE.MeshPhysicalMaterial;
  bodyDark: THREE.MeshPhysicalMaterial;
  belly: THREE.MeshPhysicalMaterial;
  shell: THREE.MeshPhysicalMaterial;
  shellEdge: THREE.MeshPhysicalMaterial;
  membrane: THREE.MeshPhysicalMaterial;
  ivory: THREE.MeshStandardMaterial;
  mouth: THREE.MeshStandardMaterial;
  eye: THREE.MeshPhysicalMaterial;
  pupil: THREE.MeshStandardMaterial;
  gillCavity: THREE.MeshStandardMaterial;
  electric: THREE.MeshPhysicalMaterial;
  water: THREE.MeshPhysicalMaterial;
  waterCore: THREE.MeshBasicMaterial;
}

const FORWARD = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smooth01 = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function qualitySegments(quality: Island22WaterDragonPartQuality) {
  if (quality === 'low') return { radial: 8, sphereWidth: 12, sphereHeight: 8, tube: 5 };
  if (quality === 'high') return { radial: 16, sphereWidth: 24, sphereHeight: 16, tube: 9 };
  return { radial: 12, sphereWidth: 18, sphereHeight: 12, tube: 7 };
}

function createMaterials(options: Island22IconicWaterDragonPartsOptions): DragonMaterials {
  const bodyColor = options.bodyColor ?? 0x138d9a;
  const bodyDarkColor = options.bodyDarkColor ?? 0x075f76;
  const bellyColor = options.bellyColor ?? 0xa8e4d8;
  const shellColor = options.shellColor ?? 0x287f8a;
  const membraneColor = options.membraneColor ?? 0x36c6c8;
  const electricColor = options.electricColor ?? 0x73f7ff;
  const eyeColor = options.eyeColor ?? 0xffae20;

  const materials: DragonMaterials = {
    body: new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.3,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
    }),
    bodyDark: new THREE.MeshPhysicalMaterial({
      color: bodyDarkColor,
      roughness: 0.34,
      clearcoat: 0.5,
      clearcoatRoughness: 0.22,
    }),
    belly: new THREE.MeshPhysicalMaterial({
      color: bellyColor,
      roughness: 0.43,
      clearcoat: 0.38,
      clearcoatRoughness: 0.3,
    }),
    shell: new THREE.MeshPhysicalMaterial({
      color: shellColor,
      roughness: 0.22,
      clearcoat: 0.9,
      clearcoatRoughness: 0.11,
    }),
    shellEdge: new THREE.MeshPhysicalMaterial({
      color: 0xc9fff2,
      roughness: 0.25,
      clearcoat: 0.78,
      clearcoatRoughness: 0.14,
    }),
    membrane: new THREE.MeshPhysicalMaterial({
      color: membraneColor,
      roughness: 0.28,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xfff1c8, roughness: 0.42 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x481623, roughness: 0.62, side: THREE.DoubleSide }),
    eye: new THREE.MeshPhysicalMaterial({
      color: eyeColor,
      emissive: 0x6b2100,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      clearcoat: 1,
    }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x04151e, roughness: 0.2 }),
    gillCavity: new THREE.MeshStandardMaterial({
      color: 0xc12e43,
      emissive: 0x4a0712,
      emissiveIntensity: 0.9,
      roughness: 0.54,
    }),
    electric: new THREE.MeshPhysicalMaterial({
      color: electricColor,
      emissive: electricColor,
      emissiveIntensity: 0,
      roughness: 0.12,
      clearcoat: 0.84,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: 0x7eefff,
      emissive: 0x0a7e9a,
      emissiveIntensity: 0.5,
      roughness: 0.08,
      transmission: 0.12,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
    waterCore: new THREE.MeshBasicMaterial({
      color: electricColor,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  };
  // Creature-generated light and water must stay vivid through the island fog.
  materials.electric.fog = false;
  materials.water.fog = false;
  materials.waterCore.fog = false;
  materials.electric.toneMapped = false;
  materials.waterCore.toneMapped = false;
  return materials;
}

function namedMesh<T extends THREE.BufferGeometry, M extends THREE.Material>(
  name: string,
  geometry: T,
  material: M,
  explodeWithParent = false,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = !material.transparent;
  mesh.receiveShadow = !material.transparent;
  if (explodeWithParent) mesh.userData.explodeWithParent = true;
  return mesh;
}

function addSocket(parent: THREE.Object3D, name: string, position: THREE.Vector3) {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.copy(position);
  parent.add(socket);
  return socket;
}

function createBeam(
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  startRadius: number,
  endRadius: number,
  radialSegments: number,
  material: THREE.Material,
  explodeWithParent = false,
) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = namedMesh(
    name,
    new THREE.CylinderGeometry(endRadius, startRadius, Math.max(0.001, delta.length()), radialSegments),
    material,
    explodeWithParent,
  );
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
  return mesh;
}

function createFinGeometry(width: number, height: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.bezierCurveTo(-width * 0.24, height * 0.82, width * 0.12, height, width * 0.5, height * 0.2);
  shape.bezierCurveTo(width * 0.18, height * 0.12, -width * 0.12, height * 0.04, -width * 0.5, 0);
  return new THREE.ShapeGeometry(shape, 6);
}

function createMembraneTriangle(
  name: string,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  material: THREE.Material,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray()], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return namedMesh(name, geometry, material, true);
}

function createWhisker(
  name: string,
  side: -1 | 1,
  verticalOffset: number,
  tubeSegments: number,
  material: THREE.Material,
) {
  const pivot = new THREE.Group();
  pivot.name = `${name}_PIVOT`;
  pivot.position.set(side * 0.34, -0.12 + verticalOffset, 0.93);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * 0.42, -0.02, 0.36),
    new THREE.Vector3(side * 0.72, -0.12, 0.76),
    new THREE.Vector3(side * 1.03, -0.2, 1.1),
  ]);
  const whisker = namedMesh(
    name,
    new THREE.TubeGeometry(curve, 18, 0.018, tubeSegments, false),
    material,
    true,
  );
  pivot.add(whisker);
  return pivot;
}

export function createIsland22InterlockingSharkTeeth(
  quality: Island22WaterDragonPartQuality = 'medium',
  material = new THREE.MeshStandardMaterial({ color: 0xfff1c8, roughness: 0.42 }),
) {
  const group = new THREE.Group();
  group.name = 'ISLAND_22_DRAGON_INTERLOCKING_SHARK_TEETH';
  const radial = qualitySegments(quality).radial;
  const count = quality === 'low' ? 7 : 11;
  const rowOffset = 0.044;

  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index < count; index += 1) {
      const normalized = index / Math.max(1, count - 1) * 2 - 1;
      const sizeBias = 1 - Math.abs(normalized) * 0.26;
      const x = normalized * 0.62 + (row === 1 ? rowOffset : -rowOffset);
      const z = 0.69 - normalized * normalized * 0.17 - row * 0.075;
      const tooth = namedMesh(
        `ISLAND_22_DRAGON_UPPER_SHARK_TOOTH_R${row + 1}_${index + 1}`,
        new THREE.ConeGeometry((0.071 - row * 0.01) * sizeBias, (0.36 - row * 0.065) * sizeBias, Math.max(3, radial / 2)),
        material,
        true,
      );
      tooth.position.set(x, -0.14 - row * 0.015, z);
      tooth.rotation.set(Math.PI, 0, normalized * 0.14);
      group.add(tooth);
    }
  }
  group.userData.toothPattern = { upperRows: 2, lowerRows: 0, interlocking: true };
  return group;
}

function createLowerSharkTeeth(
  quality: Island22WaterDragonPartQuality,
  material: THREE.Material,
) {
  const group = new THREE.Group();
  group.name = 'ISLAND_22_DRAGON_LOWER_INTERLOCKING_SHARK_TEETH';
  const radial = qualitySegments(quality).radial;
  const count = quality === 'low' ? 6 : 10;
  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index < count; index += 1) {
      const normalized = index / Math.max(1, count - 1) * 2 - 1;
      const sizeBias = 1 - Math.abs(normalized) * 0.24;
      const x = normalized * 0.58 + (row === 1 ? -0.03 : 0.035);
      const z = 0.72 - normalized * normalized * 0.16 - row * 0.07;
      const tooth = namedMesh(
        `ISLAND_22_DRAGON_LOWER_SHARK_TOOTH_R${row + 1}_${index + 1}`,
        new THREE.ConeGeometry((0.066 - row * 0.009) * sizeBias, (0.32 - row * 0.055) * sizeBias, Math.max(3, radial / 2)),
        material,
        true,
      );
      tooth.position.set(x, 0.05 + row * 0.01, z);
      tooth.rotation.z = normalized * -0.13;
      group.add(tooth);
    }
  }
  group.userData.toothPattern = { upperRows: 0, lowerRows: 2, interlocking: true };
  return group;
}

function createGillBank(
  side: -1 | 1,
  segments: ReturnType<typeof qualitySegments>,
  materials: DragonMaterials,
) {
  const pivot = new THREE.Group();
  pivot.name = `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_GILL_PIVOT`;
  pivot.position.set(side * 0.72, -0.02, -0.1);

  const frill = namedMesh(
    `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_GILL_FRILL`,
    createFinGeometry(0.94, 0.78),
    materials.membrane,
    true,
  );
  frill.rotation.set(0, side * Math.PI * 0.5, side * 0.13);
  frill.scale.x = side;
  pivot.add(frill);

  // Broad overlapping operculum plates make the gills read as aquatic anatomy
  // at phone scale instead of three detached red marks on a smooth cheek.
  for (let index = 0; index < 3; index += 1) {
    const plate = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_GILL_ARMOR_PLATE_${index + 1}`,
      new THREE.SphereGeometry(0.36, segments.sphereWidth, segments.sphereHeight),
      index === 0 ? materials.shellEdge : materials.shell,
      true,
    );
    plate.scale.set(0.2, 0.78 - index * 0.1, 0.78 - index * 0.08);
    plate.position.set(side * (0.015 + index * 0.022), 0.13 - index * 0.16, 0.18 - index * 0.18);
    plate.rotation.z = side * (0.12 + index * 0.05);
    pivot.add(plate);
  }

  for (let index = 0; index < 3; index += 1) {
    const z = 0.18 - index * 0.2;
    const slitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.012, 0.19 - index * 0.04, z),
      new THREE.Vector3(side * 0.045, 0.02 - index * 0.035, z - 0.025),
      new THREE.Vector3(side * 0.018, -0.17 - index * 0.025, z - 0.055),
    ]);
    const slit = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_GILL_SLIT_${index + 1}`,
      new THREE.TubeGeometry(slitCurve, 8, 0.082, Math.max(4, segments.tube - 1), false),
      materials.gillCavity,
      true,
    );
    pivot.add(slit);
  }

  const gillCharge = namedMesh(
    `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_GILL_CHARGE_ORGAN`,
    new THREE.SphereGeometry(0.16, segments.sphereWidth, segments.sphereHeight),
    materials.electric,
    true,
  );
  gillCharge.scale.set(0.32, 1.38, 0.74);
  gillCharge.position.set(side * 0.045, 0.02, -0.02);
  pivot.add(gillCharge);
  return { pivot, chargeOrgan: gillCharge };
}

function createCrown(
  segments: ReturnType<typeof qualitySegments>,
  materials: DragonMaterials,
) {
  const crown = new THREE.Group();
  crown.name = 'ISLAND_22_DRAGON_ICONIC_CROWN_PIVOT';
  crown.position.set(0, 0.46, -0.24);

  const spines = [
    { x: 0, y: 1.58, z: -0.22, radius: 0.14 },
    { x: -0.36, y: 1.26, z: -0.14, radius: 0.122 },
    { x: 0.36, y: 1.26, z: -0.14, radius: 0.122 },
    { x: -0.7, y: 0.86, z: -0.02, radius: 0.105 },
    { x: 0.7, y: 0.86, z: -0.02, radius: 0.105 },
  ];
  spines.forEach((spine, index) => {
    const start = new THREE.Vector3(spine.x * 0.22, 0, index === 0 ? 0.04 : -0.02);
    const end = new THREE.Vector3(spine.x, spine.y, spine.z);
    crown.add(createBeam(
      `ISLAND_22_DRAGON_CROWN_HORN_${index + 1}`,
      start,
      end,
      spine.radius,
      0.018,
      segments.radial,
      index === 0 ? materials.shellEdge : materials.bodyDark,
      true,
    ));
  });

  for (let index = 0; index < spines.length - 1; index += 1) {
    const a = new THREE.Vector3(spines[index].x * 0.2, 0.04, -0.03);
    const b = new THREE.Vector3(spines[index].x, spines[index].y * 0.88, spines[index].z);
    const c = new THREE.Vector3(spines[index + 1].x, spines[index + 1].y * 0.88, spines[index + 1].z);
    crown.add(createMembraneTriangle(`ISLAND_22_DRAGON_CROWN_MEMBRANE_${index + 1}`, a, b, c, materials.bodyDark));
  }
  return crown;
}

function createRamShield(
  segments: ReturnType<typeof qualitySegments>,
  materials: DragonMaterials,
) {
  const pivot = new THREE.Group();
  pivot.name = 'ISLAND_22_DRAGON_RAM_SHIELD_PIVOT';
  pivot.position.set(0, -0.53, -0.34);

  const carrier = namedMesh(
    'ISLAND_22_DRAGON_RAM_SHIELD_CONTINUOUS_SHELL',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.shell,
  );
  carrier.scale.set(1.02, 0.38, 1.86);
  carrier.position.set(0, -0.03, -1.18);
  pivot.add(carrier);

  const prow = namedMesh(
    'ISLAND_22_DRAGON_RAM_SHIELD_HAMMER_PROW',
    new THREE.ConeGeometry(0.82, 1.38, Math.max(6, segments.radial)),
    materials.shellEdge,
  );
  prow.rotation.x = Math.PI * 0.5;
  prow.scale.set(1, 0.68, 0.78);
  prow.position.set(0, -0.02, 0.44);
  pivot.add(prow);

  for (let index = 0; index < 7; index += 1) {
    const t = index / 6;
    const plate = namedMesh(
      `ISLAND_22_DRAGON_RAM_SHIELD_OVERLAP_PLATE_${index + 1}`,
      new THREE.SphereGeometry(0.5, segments.sphereWidth, segments.sphereHeight),
      index % 2 === 0 ? materials.shellEdge : materials.shell,
      true,
    );
    plate.scale.set(1.34 - t * 0.34, 0.17, 0.76);
    plate.position.set(0, 0.1 - t * 0.07, 0.05 - t * 0.48);
    plate.rotation.x = -0.04 - t * 0.08;
    pivot.add(plate);
  }
  pivot.userData.attachment = {
    parentSocket: 'ISLAND_22_DRAGON_NECK_SOCKET',
    contactType: 'overlap',
    embedDepth: 0.18,
    gapTolerance: 0.02,
  };
  return pivot;
}

function createChargeChannel(
  name: string,
  points: THREE.Vector3[],
  segments: ReturnType<typeof qualitySegments>,
  material: THREE.Material,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = namedMesh(
    name,
    new THREE.TubeGeometry(curve, 28, 0.024, Math.max(4, segments.tube - 1), false),
    material,
    true,
  );
  mesh.userData.chargeCurve = curve;
  return { mesh, curve };
}

function createWaterStream(
  segments: ReturnType<typeof qualitySegments>,
  materials: DragonMaterials,
) {
  const pivot = new THREE.Group();
  pivot.name = 'ISLAND_22_DRAGON_DIRECTIONAL_WATER_STREAM_PIVOT';
  pivot.position.set(0, -0.18, 0.82);
  pivot.visible = false;

  const length = 8.6;
  const stream = namedMesh(
    'ISLAND_22_DRAGON_DIRECTIONAL_WATER_STREAM_SHELL',
    new THREE.CylinderGeometry(0.22, 0.46, length, segments.radial, 5, true),
    materials.water,
  );
  stream.rotation.x = Math.PI * 0.5;
  stream.position.z = length * 0.5;
  pivot.add(stream);

  const core = namedMesh(
    'ISLAND_22_DRAGON_ELECTRIC_WATER_STREAM_CORE',
    new THREE.CylinderGeometry(0.075, 0.16, length, Math.max(6, segments.radial - 2), 3, true),
    materials.waterCore,
  );
  core.rotation.x = Math.PI * 0.5;
  core.position.z = length * 0.5;
  pivot.add(core);

  const pulseRings: THREE.Mesh[] = [];
  for (let index = 0; index < 7; index += 1) {
    const ring = namedMesh(
      `ISLAND_22_DRAGON_ELECTRIC_WATER_PULSE_${index + 1}`,
      new THREE.TorusGeometry(0.16, 0.026, Math.max(4, segments.tube - 2), segments.radial),
      materials.electric,
      true,
    );
    ring.position.z = 0.4 + index * 1.08;
    pivot.add(ring);
    pulseRings.push(ring);
  }

  const electricArcs: THREE.Mesh[] = [];
  for (let arcIndex = 0; arcIndex < 2; arcIndex += 1) {
    const points = Array.from({ length: 13 }, (_, index) => {
      const t = index / 12;
      const phase = arcIndex * Math.PI + index * 2.35;
      const radius = 0.22 + Math.sin(t * Math.PI) * 0.16;
      return new THREE.Vector3(
        Math.cos(phase) * radius,
        Math.sin(phase) * radius,
        0.24 + t * (length - 0.48),
      );
    });
    const arc = namedMesh(
      `ISLAND_22_DRAGON_ELECTRIC_WATER_ARC_${arcIndex + 1}`,
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.045, Math.max(4, segments.tube - 2), false),
      materials.electric,
      true,
    );
    pivot.add(arc);
    electricArcs.push(arc);
  }

  const tip = addSocket(pivot, 'ISLAND_22_DRAGON_WATER_STREAM_TIP_SOCKET', new THREE.Vector3(0, 0, length));
  return { pivot, stream, core, pulseRings, electricArcs, tip, length };
}

export function resolveIsland22WaterDragonElectricStage(
  charge01: number,
  release01: number,
): Island22WaterDragonElectricStage {
  const charge = clamp01(charge01);
  const release = clamp01(release01);
  if (release >= 0.92) return 'cooldown';
  if (release > 0.015) return 'release';
  if (charge >= 0.98) return 'primed';
  if (charge > 0.015) return 'charging';
  return 'idle';
}

export function createIsland22IconicWaterDragonParts(
  options: Island22IconicWaterDragonPartsOptions = {},
): Island22IconicWaterDragonPartsRuntime {
  const quality = options.quality ?? 'medium';
  const segments = qualitySegments(quality);
  const materials = createMaterials(options);
  // Identity accents must survive the deliberately heavy high-altitude fog.
  // The body and wings retain fog so the creature still belongs to the scene.
  materials.eye.fog = false;
  materials.eye.toneMapped = false;
  materials.pupil.fog = false;
  materials.ivory.fog = false;
  materials.gillCavity.fog = false;
  materials.bodyDark.fog = false;
  const root = new THREE.Group();
  root.name = 'ISLAND_22_ICONIC_WATER_DRAGON_PARTS_ROOT';

  const headPivot = new THREE.Group();
  headPivot.name = 'ISLAND_22_DRAGON_ICONIC_HEAD_PIVOT';
  root.add(headPivot);

  const skull = namedMesh(
    'ISLAND_22_DRAGON_ICONIC_SKULL',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.body,
  );
  skull.scale.set(0.84, 0.66, 1.02);
  skull.position.set(0, 0.14, 0.04);
  headPivot.add(skull);

  const muzzle = namedMesh(
    'ISLAND_22_DRAGON_AQUATIC_SHARK_MUZZLE',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.body,
  );
  muzzle.scale.set(0.78, 0.38, 0.9);
  muzzle.position.set(0, -0.08, 0.69);
  headPivot.add(muzzle);
  const sharkNoseBridge = namedMesh(
    'ISLAND_22_DRAGON_ICONIC_SHARK_NOSE_BRIDGE',
    new THREE.BoxGeometry(0.86, 0.18, 0.76, 2, 1, 2),
    materials.bodyDark,
    true,
  );
  sharkNoseBridge.position.set(0, 0.08, 0.93);
  sharkNoseBridge.rotation.x = -0.08;
  headPivot.add(sharkNoseBridge);
  ([-1, 1] as const).forEach((side) => {
    const nostril = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_SHARK_NOSTRIL`,
      new THREE.SphereGeometry(0.078, segments.sphereWidth, segments.sphereHeight),
      materials.pupil,
      true,
    );
    nostril.position.set(side * 0.2, -0.06, 1.43);
    nostril.scale.set(0.72, 0.42, 0.28);
    headPivot.add(nostril);
  });

  const upperMouth = namedMesh(
    'ISLAND_22_DRAGON_UPPER_MOUTH_CAVITY',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.mouth,
    true,
  );
  upperMouth.scale.set(0.65, 0.075, 0.72);
  upperMouth.position.set(0, -0.27, 0.7);
  headPivot.add(upperMouth);

  const upperTeeth = createIsland22InterlockingSharkTeeth(quality, materials.ivory);
  upperTeeth.position.y = -0.19;
  headPivot.add(upperTeeth);

  const jawPivot = new THREE.Group();
  jawPivot.name = 'ISLAND_22_DRAGON_SHARK_JAW_HINGE_PIVOT';
  jawPivot.position.set(0, -0.24, 0.08);
  const lowerJaw = namedMesh(
    'ISLAND_22_DRAGON_POWERFUL_LOWER_JAW',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.belly,
  );
  lowerJaw.scale.set(0.69, 0.19, 0.83);
  lowerJaw.position.set(0, -0.08, 0.55);
  const lowerMouth = namedMesh(
    'ISLAND_22_DRAGON_LOWER_MOUTH_CAVITY',
    new THREE.SphereGeometry(1, segments.sphereWidth, segments.sphereHeight),
    materials.mouth,
    true,
  );
  lowerMouth.scale.set(0.62, 0.07, 0.7);
  lowerMouth.position.set(0, 0.03, 0.61);
  const lowerTeeth = createLowerSharkTeeth(quality, materials.ivory);
  lowerTeeth.position.set(0, 0.08, -0.02);
  jawPivot.add(lowerJaw, lowerMouth, lowerTeeth);
  headPivot.add(jawPivot);

  // The frontal rows above establish the interlock. A second lateral set is
  // deliberately larger so the great-white silhouette survives the required
  // profile and wide-flight phone shots rather than collapsing into one beige
  // pixel cluster inside the mouth.
  ([-1, 1] as const).forEach((side) => {
    [0.48, 0.68, 0.88, 1.08].forEach((z, index) => {
      const upperProfileTooth = namedMesh(
        `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_UPPER_PROFILE_TOOTH_${index + 1}`,
        new THREE.ConeGeometry(0.075 - index * 0.006, 0.3 - index * 0.018, Math.max(5, segments.radial / 2)),
        materials.ivory,
        true,
      );
      upperProfileTooth.position.set(side * 0.57, -0.3, z);
      upperProfileTooth.rotation.z = Math.PI;
      upperProfileTooth.rotation.x = -0.08;
      headPivot.add(upperProfileTooth);

      const lowerProfileTooth = namedMesh(
        `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_LOWER_PROFILE_TOOTH_${index + 1}`,
        new THREE.ConeGeometry(0.068 - index * 0.005, 0.27 - index * 0.016, Math.max(5, segments.radial / 2)),
        materials.ivory,
        true,
      );
      lowerProfileTooth.position.set(side * 0.55, 0.09, z);
      lowerProfileTooth.rotation.x = 0.08;
      jawPivot.add(lowerProfileTooth);
    });
  });

  const crownPivot = createCrown(segments, materials);
  headPivot.add(crownPivot);

  const neckCollar = namedMesh(
    'ISLAND_22_DRAGON_CONTINUOUS_NECK_COLLAR',
    new THREE.CapsuleGeometry(0.76, 2.36, Math.max(4, segments.tube), segments.radial),
    materials.body,
  );
  neckCollar.rotation.x = Math.PI * 0.5;
  neckCollar.position.set(0, -0.02, -1.86);
  neckCollar.scale.set(1.02, 0.96, 1);
  root.add(neckCollar);

  const eyes: THREE.Mesh[] = [];
  ([-1, 1] as const).forEach((side) => {
    const brow = createBeam(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_EXPRESSIVE_BROW`,
      new THREE.Vector3(side * 0.18, 0.51, 0.34),
      new THREE.Vector3(side * 0.61, 0.37, 0.23),
      0.11,
      0.045,
      segments.radial,
      materials.bodyDark,
      true,
    );
    const eyeSocket = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_EYE_SOCKET`,
      new THREE.SphereGeometry(0.3, segments.sphereWidth, segments.sphereHeight),
      materials.bodyDark,
      true,
    );
    eyeSocket.position.set(side * 0.54, 0.25, 0.56);
    eyeSocket.scale.set(0.58, 1.08, 1.02);
    const eye = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_AMBER_EYE`,
      new THREE.SphereGeometry(0.215, segments.sphereWidth, segments.sphereHeight),
      materials.eye,
      true,
    );
    eye.position.set(side * 0.67, 0.25, 0.59);
    eye.scale.set(0.62, 1.02, 0.92);
    const pupil = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_VERTICAL_PUPIL`,
      new THREE.SphereGeometry(0.108, segments.sphereWidth, segments.sphereHeight),
      materials.pupil,
      true,
    );
    pupil.position.set(side * 0.79, 0.25, 0.61);
    pupil.scale.set(0.36, 1.08, 0.72);
    headPivot.add(brow, eyeSocket, eye, pupil);
    eyes.push(eye);
  });

  const leftGill = createGillBank(-1, segments, materials);
  const rightGill = createGillBank(1, segments, materials);
  headPivot.add(leftGill.pivot, rightGill.pivot);

  const leftWhisker = createWhisker('ISLAND_22_DRAGON_LEFT_ICONIC_WHISKER', -1, 0.02, segments.tube, materials.membrane);
  const rightWhisker = createWhisker('ISLAND_22_DRAGON_RIGHT_ICONIC_WHISKER', 1, 0.02, segments.tube, materials.membrane);
  headPivot.add(leftWhisker, rightWhisker);

  ([-1, 1] as const).forEach((side) => {
    const cheekFin = namedMesh(
      `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_CHEEK_FIN_FRILL`,
      createFinGeometry(0.65, 0.54),
      materials.membrane,
      true,
    );
    cheekFin.position.set(side * 0.68, 0.17, 0.2);
    cheekFin.rotation.set(0, side * Math.PI * 0.5, side * 0.18);
    cheekFin.scale.x = side;
    headPivot.add(cheekFin);
  });

  const ramShieldPivot = createRamShield(segments, materials);
  root.add(ramShieldPivot);

  const chargeChannels: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3 }> = [];
  ([-1, 1] as const).forEach((side) => {
    [-0.12, 0.08, 0.28].forEach((yOffset, channelIndex) => {
      const channel = createChargeChannel(
        `ISLAND_22_DRAGON_${side < 0 ? 'LEFT' : 'RIGHT'}_ELECTRIC_ORGAN_CHANNEL_${channelIndex + 1}`,
        [
          new THREE.Vector3(side * 0.66, -0.34 + yOffset, -2.78),
          new THREE.Vector3(side * 0.73, -0.28 + yOffset, -1.74),
          new THREE.Vector3(side * 0.62, -0.2 + yOffset * 0.7, -0.72),
          new THREE.Vector3(side * 0.28, -0.14 + yOffset * 0.35, 0.14),
          new THREE.Vector3(side * 0.08, -0.18, 0.78),
        ],
        segments,
        materials.electric,
      );
      root.add(channel.mesh);
      chargeChannels.push(channel);
    });
  });

  const chargeBeads = chargeChannels.map(({ curve }, index) => {
    const bead = namedMesh(
      `ISLAND_22_DRAGON_ELECTRIC_ORGAN_PULSE_${index + 1}`,
      new THREE.SphereGeometry(0.075, segments.sphereWidth, segments.sphereHeight),
      materials.electric,
      true,
    );
    bead.userData.chargeCurve = curve;
    bead.visible = false;
    root.add(bead);
    return bead;
  });

  const waterStream = createWaterStream(segments, materials);
  headPivot.add(waterStream.pivot);

  const bodySocket = addSocket(root, 'ISLAND_22_DRAGON_BODY_SOCKET', new THREE.Vector3(0, -0.02, -3.72));
  const neckSocket = addSocket(root, 'ISLAND_22_DRAGON_NECK_SOCKET', new THREE.Vector3(0, -0.04, -2.82));
  const throatSocket = addSocket(headPivot, 'ISLAND_22_DRAGON_THROAT_SOCKET', new THREE.Vector3(0, -0.18, 0.82));
  const ramImpactSocket = addSocket(ramShieldPivot, 'ISLAND_22_DRAGON_RAM_IMPACT_SOCKET', new THREE.Vector3(0, -0.02, 1.05));
  const eyeAimSocket = addSocket(headPivot, 'ISLAND_22_DRAGON_EYE_AIM_SOCKET', new THREE.Vector3(0, 0.22, 3));

  root.userData.sculptRuntime = {
    axis: { forward: '+z', up: '+y' },
    partIds: [
      'iconic-head',
      'continuous-neck-collar',
      'crown-horn-fan',
      'interlocking-shark-jaw',
      'gill-banks',
      'whiskers',
      'ram-shield-shell',
      'electric-organs',
      'directional-water-stream',
    ],
    pivots: {
      head: headPivot.name,
      jaw: jawPivot.name,
      crown: crownPivot.name,
      leftGill: leftGill.pivot.name,
      rightGill: rightGill.pivot.name,
      ramShield: ramShieldPivot.name,
      waterStream: waterStream.pivot.name,
    },
    sockets: {
      body: bodySocket.name,
      neck: neckSocket.name,
      throat: throatSocket.name,
      ramImpact: ramImpactSocket.name,
      streamTip: waterStream.tip.name,
      eyeAim: eyeAimSocket.name,
    },
    colliders: [
      { id: 'head', shape: 'ellipsoid', center: [0, 0.1, 0.2], radii: [0.88, 0.7, 1.12] },
      { id: 'ram-shield', shape: 'capsule', start: [0, -0.58, 0.54], end: [0, -0.58, -2.65], radius: 0.82 },
    ],
    destructionGroups: {
      anatomy: ['iconic-head', 'gill-banks', 'ram-shield-shell'],
      attack: ['electric-organs', 'directional-water-stream'],
    },
  };

  let jawOpen01 = 0;
  const setJawOpen = (open01: number) => {
    jawOpen01 = clamp01(open01);
    jawPivot.rotation.x = jawOpen01 * 0.72;
  };

  const streamQuaternion = new THREE.Quaternion();
  const normalizedDirection = new THREE.Vector3();
  const setStreamDirection = (direction: THREE.Vector3) => {
    normalizedDirection.copy(direction);
    if (normalizedDirection.lengthSq() < 1e-8) normalizedDirection.copy(FORWARD);
    normalizedDirection.normalize();
    streamQuaternion.setFromUnitVectors(FORWARD, normalizedDirection);
    waterStream.pivot.quaternion.copy(streamQuaternion);
  };

  const updateAttack = (presentation: Island22WaterDragonAttackPresentation) => {
    const elapsed = Math.max(0, presentation.elapsedSeconds);
    const charge = clamp01(presentation.charge01);
    const release = clamp01(presentation.release01);
    const stage = resolveIsland22WaterDragonElectricStage(charge, release);
    if (presentation.streamDirection) setStreamDirection(presentation.streamDirection);

    const reducedMotion = Boolean(presentation.reducedMotion);
    const chargeEnvelope = stage === 'cooldown' ? 1 - smooth01((release - 0.92) / 0.08) : charge;
    const organicPulse = reducedMotion ? 1 : 0.82 + Math.sin(elapsed * (2.2 + charge * 2.8)) * 0.18;
    const visibleCharge = clamp01(chargeEnvelope * organicPulse);
    materials.electric.opacity = visibleCharge * 0.92;
    materials.electric.emissiveIntensity = 0.2 + visibleCharge * 4.8;
    materials.eye.emissiveIntensity = 0.65 + visibleCharge * 1.65;

    chargeChannels.forEach(({ mesh }, index) => {
      mesh.visible = visibleCharge > 0.015;
      const stagger = clamp01(charge * 1.24 - index * 0.045);
      mesh.scale.setScalar(0.7 + stagger * 0.45);
    });
    chargeBeads.forEach((bead, index) => {
      const curve = bead.userData.chargeCurve as THREE.CatmullRomCurve3;
      const staggered = (elapsed * (0.22 + charge * 0.55) + index / chargeBeads.length) % 1;
      const travel = reducedMotion ? charge : staggered;
      bead.visible = visibleCharge > 0.08;
      bead.position.copy(curve.getPointAt(travel));
      bead.scale.setScalar(0.68 + visibleCharge * 1.25);
    });

    const gillFlare = smooth01(charge * 1.3) * (stage === 'release' ? 1 : 0.72);
    leftGill.pivot.rotation.z = -gillFlare * 0.24;
    rightGill.pivot.rotation.z = gillFlare * 0.24;
    leftGill.chargeOrgan.scale.x = 0.32 + visibleCharge * 0.18;
    rightGill.chargeOrgan.scale.x = 0.32 + visibleCharge * 0.18;

    crownPivot.scale.set(1, 1 + visibleCharge * 0.055, 1 + visibleCharge * 0.03);
    setJawOpen(0.28 + smooth01(charge * 1.18 - 0.52) * 0.22 + smooth01(release * 2.4) * 0.46);

    const releasing = stage === 'release';
    waterStream.pivot.visible = releasing;
    const releaseEnvelope = releasing ? Math.sin(clamp01(release) * Math.PI) : 0;
    waterStream.stream.scale.set(0.9 + releaseEnvelope * 0.22, 0.9 + releaseEnvelope * 0.22, 0.84 + releaseEnvelope * 0.24);
    waterStream.core.scale.set(0.78 + releaseEnvelope * 0.38, 0.78 + releaseEnvelope * 0.38, 0.9 + releaseEnvelope * 0.18);
    materials.water.opacity = releasing ? 0.78 + releaseEnvelope * 0.2 : 0;
    materials.waterCore.opacity = releasing ? 0.74 + releaseEnvelope * 0.24 : 0;
    waterStream.pulseRings.forEach((ring, index) => {
      const travel = reducedMotion
        ? index / waterStream.pulseRings.length
        : (elapsed * 1.8 + index / waterStream.pulseRings.length) % 1;
      ring.position.z = 0.34 + travel * (waterStream.length - 0.68);
      ring.scale.setScalar(0.42 + releaseEnvelope * 0.28);
      ring.visible = releasing && index % 2 === 0;
    });
    waterStream.electricArcs.forEach((arc, index) => {
      arc.visible = releasing;
      arc.rotation.z = reducedMotion ? index * Math.PI : elapsed * (index === 0 ? 2.4 : -2.1);
      arc.scale.setScalar(0.9 + releaseEnvelope * 0.16);
    });
    return stage;
  };

  const dispose = () => {
    const ownedMaterials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => ownedMaterials.add(material));
    });
    ownedMaterials.forEach((material) => material.dispose());
  };

  setStreamDirection(FORWARD);
  setJawOpen(0.08);

  return {
    root,
    headPivot,
    jawPivot,
    crownPivot,
    gillPivots: [leftGill.pivot, rightGill.pivot],
    whiskerPivots: [leftWhisker, rightWhisker],
    ramShieldPivot,
    waterStreamPivot: waterStream.pivot,
    sockets: {
      body: bodySocket,
      neck: neckSocket,
      throat: throatSocket,
      ramImpact: ramImpactSocket,
      streamTip: waterStream.tip,
      eyeAim: eyeAimSocket,
    },
    setStreamDirection,
    updateAttack,
    setJawOpen,
    dispose,
  };
}
