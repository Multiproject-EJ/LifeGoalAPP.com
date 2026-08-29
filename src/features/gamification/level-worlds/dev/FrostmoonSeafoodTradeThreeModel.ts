import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island3FrostmoonMaterials } from './Island3FrostmoonThreeWorld';

export const FROSTMOON_FREIGHT_CART_POSITION = Object.freeze({ x: -6.4, y: 0.3, z: -6.15 });
export const FROSTMOON_FREIGHT_CART_CLEARANCE_RADIUS = 2.85;
export const FROSTMOON_LOADING_YARD_POSITION = Object.freeze({ x: -4.1, y: 0.24, z: -7.1 });
export const FROSTMOON_LOADING_YARD_CLEARANCE_RADIUS = 1.32;
export const FROSTMOON_KITE_COURIER_POSITION = Object.freeze({ x: -7.2, y: 0.3, z: -4.1 });
export const FROSTMOON_KITE_COURIER_CLEARANCE_RADIUS = 2.15;
export const FROSTMOON_PUPPY_HOMES = Object.freeze([
  Object.freeze({ x: -4.9, y: 0.3, z: 2.1 }),
  Object.freeze({ x: 4.9, y: 0.3, z: 2.2 }),
  Object.freeze({ x: 0.6, y: 0.3, z: 5.45 }),
]);

const FROSTMOON_PROTECTED_ROUTE_OUTER_RADIUS = 4.05;

export interface FrostmoonSeafoodTradeRuntime {
  root: THREE.Group;
  freightCart: THREE.Group;
  loadingYard: THREE.Group;
  kiteCourier: THREE.Group;
  puppyPack: THREE.Group;
  backgroundTraffic: THREE.Group;
  setFishingActive: (active: boolean) => void;
  animate: (elapsed: number, blizzardStrength?: number) => void;
}

const FROSTMOON_FREIGHT_DOCK_ROTATION = -0.08;
const FROSTMOON_FREIGHT_DEPARTURE_HEADING = 2.38;
const FROSTMOON_FREIGHT_DEPARTURE_DELAY_SECONDS = 2.4;
const FROSTMOON_FREIGHT_DEPARTURE_TURN_SECONDS = 2.6;
const FROSTMOON_FREIGHT_DEPARTURE_TRAVEL_SECONDS = 11.5;

interface FrostmoonBackgroundSkimmerRig {
  root: THREE.Group;
  sailPivot: THREE.Group;
  phaseSeconds: number;
  periodSeconds: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export function isFrostmoonSeafoodTradeRouteClear(x: number, z: number, radius: number) {
  return Math.hypot(x, z) - radius >= FROSTMOON_PROTECTED_ROUTE_OUTER_RADIUS;
}

function box(width: number, height: number, depth: number, material: THREE.Material, name: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  return mesh;
}

function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments: number,
  name: string,
) {
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), segments), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function curveTube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  tubularSegments: number,
  name: string,
) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), tubularSegments, radius, 6, false),
    material,
  );
  mesh.name = name;
  return mesh;
}

function createRunner(
  side: 'left' | 'right',
  materials: Island3FrostmoonMaterials,
  copper: THREE.Material,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-2.32, 0.04);
  shape.quadraticCurveTo(-2.25, 0.34, -1.93, 0.43);
  shape.lineTo(1.88, 0.16);
  shape.quadraticCurveTo(2.22, 0.2, 2.35, 0.45);
  shape.lineTo(2.42, 0.3);
  shape.quadraticCurveTo(2.2, 0.02, 1.86, 0.02);
  shape.lineTo(-1.96, -0.13);
  shape.quadraticCurveTo(-2.25, -0.12, -2.32, 0.04);
  const runner = new THREE.Group();
  runner.name = `FROSTMOON_FREIGHT_${side.toUpperCase()}_RUNNER`;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 2 }),
    materials.timberDark,
  );
  body.name = `FROSTMOON_FREIGHT_${side.toUpperCase()}_RUNNER_BODY`;
  body.position.z = -0.055;
  runner.add(body);

  const copperShoe = curveTube(
    [
      new THREE.Vector3(-2.25, 0.02, 0.07),
      new THREE.Vector3(-1.85, -0.1, 0.07),
      new THREE.Vector3(0.2, -0.11, 0.07),
      new THREE.Vector3(1.9, 0.03, 0.07),
      new THREE.Vector3(2.3, 0.3, 0.07),
    ],
    0.035,
    copper,
    26,
    `FROSTMOON_FREIGHT_${side.toUpperCase()}_COPPER_SHOE`,
  );
  runner.add(copperShoe);
  return runner;
}

function createWheel(
  id: string,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.Material,
) {
  const wheel = new THREE.Group();
  wheel.name = `FROSTMOON_FREIGHT_WHEEL_${id}`;
  wheel.userData.animationPivot = 'wheel';
  const segments = quality === 'high' ? 28 : quality === 'medium' ? 20 : 14;
  const timberRim = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.125, 8, segments), materials.timberDark);
  timberRim.name = `FROSTMOON_FREIGHT_WHEEL_${id}_TIMBER_RIM`;
  const copperRim = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.052, 6, segments), copper);
  copperRim.name = `FROSTMOON_FREIGHT_WHEEL_${id}_COPPER_BAND`;
  wheel.add(timberRim, copperRim);

  const spokeCount = quality === 'low' ? 6 : 8;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = index / spokeCount * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.88, 7),
      materials.timber,
    );
    spoke.name = `FROSTMOON_FREIGHT_WHEEL_${id}_SPOKE_${index + 1}`;
    spoke.rotation.z = angle;
    wheel.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, segments), copper);
  hub.name = `FROSTMOON_FREIGHT_WHEEL_${id}_HUB`;
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  if (quality !== 'low') {
    const rivetCount = quality === 'high' ? 12 : 8;
    for (let index = 0; index < rivetCount; index += 1) {
      const angle = index / rivetCount * Math.PI * 2;
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), copper);
      rivet.name = `FROSTMOON_FREIGHT_WHEEL_${id}_RIVET_${index + 1}`;
      rivet.position.set(Math.cos(angle) * 0.59, Math.sin(angle) * 0.59, 0.1);
      wheel.add(rivet);
    }
  }
  return wheel;
}

function createFish(material: THREE.Material, scale = 1) {
  const fish = new THREE.Group();
  fish.name = 'FROSTMOON_PREMIUM_SILVER_FISH';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 9, 7), material);
  body.name = 'FROSTMOON_PREMIUM_SILVER_FISH_BODY';
  body.scale.set(1.72, 0.72, 0.72);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 3), material);
  tail.name = 'FROSTMOON_PREMIUM_SILVER_FISH_TAIL';
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.16;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: 0x15202a }));
  eye.position.set(0.1, 0.035, 0.065);
  fish.add(body, tail, eye);
  fish.scale.setScalar(scale);
  return fish;
}

function createIceCrate(
  id: string,
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.Material,
  fishMaterial: THREE.Material,
) {
  const crate = new THREE.Group();
  crate.name = `FROSTMOON_INSULATED_FISH_CRATE_${id}`;
  const shell = box(0.68, 0.35, 0.52, materials.timber, `FROSTMOON_FISH_CRATE_${id}_SHELL`);
  shell.position.y = 0.18;
  crate.add(shell);
  const ice = box(0.58, 0.09, 0.42, materials.snowShadow, `FROSTMOON_FISH_CRATE_${id}_PACKED_ICE`);
  ice.position.y = 0.39;
  crate.add(ice);
  [-0.27, 0.27].forEach((x, index) => {
    const band = box(0.04, 0.38, 0.55, copper, `FROSTMOON_FISH_CRATE_${id}_COPPER_BAND_${index + 1}`);
    band.position.set(x, 0.19, 0);
    crate.add(band);
  });
  const fishCount = quality === 'low' ? 1 : 2;
  for (let index = 0; index < fishCount; index += 1) {
    const fish = createFish(fishMaterial, 0.88);
    fish.position.set((index - (fishCount - 1) / 2) * 0.24, 0.49, index % 2 ? -0.08 : 0.07);
    fish.rotation.y = index % 2 ? Math.PI : 0;
    crate.add(fish);
  }
  return crate;
}

function createSeafoodBasket(
  id: string,
  materials: Island3FrostmoonMaterials,
  copper: THREE.Material,
  fishMaterial: THREE.Material,
) {
  const basket = new THREE.Group();
  basket.name = `FROSTMOON_PREMIUM_SEAFOOD_BASKET_${id}`;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.25, 10, 1, true), materials.timber);
  body.name = `FROSTMOON_PREMIUM_SEAFOOD_BASKET_${id}_WOVEN_BODY`;
  body.position.y = 0.13;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 12), copper);
  rim.name = `FROSTMOON_PREMIUM_SEAFOOD_BASKET_${id}_COPPER_RIM`;
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.27;
  basket.add(body, rim);
  [-0.08, 0.08].forEach((x, index) => {
    const fish = createFish(fishMaterial, 0.72);
    fish.name = `FROSTMOON_PREMIUM_SEAFOOD_BASKET_${id}_FISH_${index + 1}`;
    fish.position.set(x, 0.34, index ? -0.045 : 0.045);
    fish.rotation.y = index ? Math.PI : 0;
    basket.add(fish);
  });
  return basket;
}

interface FrostmoonWolfRig {
  root: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  legPivots: THREE.Group[];
}

function createWolfDog(
  id: string,
  scale: number,
  grey: THREE.Material,
  cream: THREE.Material,
  dark: THREE.Material,
  copper: THREE.Material,
) : FrostmoonWolfRig {
  const root = new THREE.Group();
  root.name = `FROSTMOON_WOLF_${id}`;
  root.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 9), grey);
  body.name = `FROSTMOON_WOLF_${id}_BODY`;
  body.scale.set(1.25, 0.76, 0.72);
  body.position.y = 0.58;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), cream);
  chest.name = `FROSTMOON_WOLF_${id}_CREAM_CHEST`;
  chest.scale.set(0.72, 1.1, 0.75);
  chest.position.set(-0.42, 0.55, 0);
  root.add(chest);

  const headPivot = new THREE.Group();
  headPivot.name = `FROSTMOON_WOLF_${id}_HEAD_PIVOT`;
  headPivot.position.set(-0.62, 0.78, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 9), grey);
  head.name = `FROSTMOON_WOLF_${id}_HEAD`;
  head.scale.set(0.95, 1.05, 0.92);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), cream);
  muzzle.name = `FROSTMOON_WOLF_${id}_MUZZLE`;
  muzzle.scale.set(1.22, 0.7, 0.86);
  muzzle.position.set(-0.25, -0.05, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), dark);
  nose.name = `FROSTMOON_WOLF_${id}_NOSE`;
  nose.position.set(-0.44, -0.02, 0);
  headPivot.add(head, muzzle, nose);
  [-0.15, 0.15].forEach((z, index) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 6), grey);
    ear.name = `FROSTMOON_WOLF_${id}_EAR_${index + 1}`;
    ear.position.set(-0.02, 0.34, z);
    ear.rotation.z = index ? -0.08 : 0.08;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), dark);
    eye.name = `FROSTMOON_WOLF_${id}_EYE_${index + 1}`;
    eye.position.set(-0.28, 0.08, z * 0.82);
    headPivot.add(ear, eye);
  });
  root.add(headPivot);

  const legPivots: THREE.Group[] = [];
  [[-0.34, -0.25], [-0.34, 0.25], [0.34, -0.25], [0.34, 0.25]].forEach(([x, z], index) => {
    const pivot = new THREE.Group();
    pivot.name = `FROSTMOON_WOLF_${id}_LEG_PIVOT_${index + 1}`;
    pivot.position.set(x, 0.39, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.43, 7), cream);
    leg.name = `FROSTMOON_WOLF_${id}_LEG_${index + 1}`;
    leg.position.y = -0.2;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cream);
    paw.name = `FROSTMOON_WOLF_${id}_PAW_${index + 1}`;
    paw.scale.set(1.3, 0.55, 1.05);
    paw.position.set(-0.035, -0.43, 0);
    pivot.add(leg, paw);
    root.add(pivot);
    legPivots.push(pivot);
  });

  const tailPivot = new THREE.Group();
  tailPivot.name = `FROSTMOON_WOLF_${id}_TAIL_PIVOT`;
  tailPivot.position.set(0.58, 0.68, 0);
  const tail = curveTube(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.28, 0.16, 0), new THREE.Vector3(0.48, 0.4, 0)],
    0.12,
    grey,
    10,
    `FROSTMOON_WOLF_${id}_TAIL`,
  );
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), cream);
  tailTip.name = `FROSTMOON_WOLF_${id}_TAIL_TIP`;
  tailTip.position.set(0.49, 0.41, 0);
  tailPivot.add(tail, tailTip);
  root.add(tailPivot);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 12), copper);
  collar.name = `FROSTMOON_WOLF_${id}_COPPER_COLLAR`;
  collar.rotation.y = Math.PI / 2;
  collar.position.set(-0.47, 0.72, 0);
  root.add(collar);
  return { root, headPivot, tailPivot, legPivots };
}

function createFreightCart(
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.MeshStandardMaterial,
  sailCloth: THREE.MeshPhysicalMaterial,
  rope: THREE.MeshStandardMaterial,
  fishMaterial: THREE.MeshStandardMaterial,
  lanternGlow: THREE.MeshStandardMaterial,
) {
  const cart = new THREE.Group();
  cart.name = 'FROSTMOON_LONG_HAUL_WIND_SAIL_FREIGHT_CART';
  cart.position.set(FROSTMOON_FREIGHT_CART_POSITION.x, FROSTMOON_FREIGHT_CART_POSITION.y, FROSTMOON_FREIGHT_CART_POSITION.z);
  cart.rotation.y = -0.08;
  cart.scale.setScalar(0.9);
  cart.userData.clearanceRadius = FROSTMOON_FREIGHT_CART_CLEARANCE_RADIUS;

  const suspension = new THREE.Group();
  suspension.name = 'FROSTMOON_FREIGHT_SUSPENSION_PIVOT';
  suspension.position.y = 0.12;
  cart.add(suspension);

  const deck = box(3.38, 0.32, 1.18, materials.timberDark, 'FROSTMOON_FREIGHT_DECK');
  deck.position.y = 0.84;
  suspension.add(deck);
  [-1.45, -0.52, 0.52, 1.45].forEach((x, index) => {
    const rail = box(0.1, 0.5, 1.28, index % 2 ? materials.timber : copper, `FROSTMOON_FREIGHT_TRANSVERSE_FRAME_${index + 1}`);
    rail.position.set(x, 0.65, 0);
    suspension.add(rail);
  });
  [-0.57, 0.57].forEach((z, sideIndex) => {
    const sideRail = box(3.55, 0.14, 0.1, materials.timber, `FROSTMOON_FREIGHT_CARGO_RAIL_${sideIndex + 1}`);
    sideRail.position.set(0, 1.06, z);
    suspension.add(sideRail);
  });

  const leftRunner = createRunner('left', materials, copper);
  leftRunner.position.set(0, 0.13, -0.69);
  const rightRunner = createRunner('right', materials, copper);
  rightRunner.position.set(0, 0.13, 0.58);
  cart.add(leftRunner, rightRunner);

  const wheelPivots: THREE.Group[] = [];
  const wheelLocations: Array<[number, number, string]> = [
    [-1.22, -0.67, 'FRONT_LEFT'],
    [-1.22, 0.67, 'FRONT_RIGHT'],
    [1.25, -0.67, 'REAR_LEFT'],
    [1.25, 0.67, 'REAR_RIGHT'],
  ];
  wheelLocations.forEach(([x, z, id]) => {
    const wheel = createWheel(id, quality, materials, copper);
    wheel.position.set(x, 0.68, z);
    cart.add(wheel);
    wheelPivots.push(wheel);
    const strut = cylinderBetween(
      new THREE.Vector3(x, 0.48, z * 0.82),
      new THREE.Vector3(x, 0.78, z * 0.78),
      0.055,
      copper,
      8,
      `FROSTMOON_FREIGHT_${id}_SUSPENSION_STRUT`,
    );
    cart.add(strut);
  });

  const mastPivot = new THREE.Group();
  mastPivot.name = 'FROSTMOON_FREIGHT_SAIL_PIVOT';
  mastPivot.position.set(-1.05, 1, 0);
  cart.add(mastPivot);
  const mast = cylinderBetween(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 3.08, 0),
    0.095,
    materials.timberDark,
    quality === 'low' ? 8 : 12,
    'FROSTMOON_FREIGHT_TIMBER_MAST',
  );
  mastPivot.add(mast);
  [0.4, 1.02, 1.67, 2.32, 2.98].slice(0, quality === 'low' ? 3 : 5).forEach((y, index) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 5, 12), copper);
    band.name = `FROSTMOON_FREIGHT_MAST_COPPER_BAND_${index + 1}`;
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    mastPivot.add(band);
  });

  const sailShape = new THREE.Shape();
  sailShape.moveTo(0.12, 0.42);
  sailShape.lineTo(0.12, 2.96);
  sailShape.lineTo(2.62, 0.68);
  sailShape.closePath();
  const sail = new THREE.Mesh(
    new THREE.ExtrudeGeometry(sailShape, { depth: 0.065, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }),
    sailCloth,
  );
  sail.name = 'FROSTMOON_FREIGHT_DOUBLE_SIDED_CREAM_SAIL';
  sail.position.z = -0.0325;
  sail.userData.explodeWithParent = true;
  mastPivot.add(sail);
  const upperBoom = cylinderBetween(
    new THREE.Vector3(0.1, 3.01, 0.04),
    new THREE.Vector3(2.67, 0.66, 0.04),
    0.045,
    copper,
    8,
    'FROSTMOON_FREIGHT_UPPER_COPPER_BOOM',
  );
  const lowerBoom = cylinderBetween(
    new THREE.Vector3(0.1, 0.38, 0.04),
    new THREE.Vector3(2.67, 0.66, 0.04),
    0.04,
    copper,
    8,
    'FROSTMOON_FREIGHT_LOWER_COPPER_BOOM',
  );
  mastPivot.add(upperBoom, lowerBoom);

  const forestay = curveTube(
    [new THREE.Vector3(-1.05, 4.02, -0.04), new THREE.Vector3(-1.7, 2.42, -0.05), new THREE.Vector3(-1.77, 1.05, -0.05)],
    0.018,
    rope,
    quality === 'high' ? 20 : 12,
    'FROSTMOON_FREIGHT_FORESTAY',
  );
  const mainsheet = curveTube(
    [new THREE.Vector3(1.15, 1.68, 0.05), new THREE.Vector3(1.55, 1.35, 0.08), new THREE.Vector3(1.62, 1.0, 0.1)],
    0.018,
    rope,
    quality === 'high' ? 18 : 10,
    'FROSTMOON_FREIGHT_MAIN_SHEET',
  );
  cart.add(forestay, mainsheet);

  const cargoCount = quality === 'low' ? 3 : quality === 'medium' ? 4 : 5;
  const cargoLayout: Array<[number, number, number]> = [
    [-0.45, 1.03, -0.27], [0.3, 1.03, -0.27], [1.05, 1.03, -0.27],
    [0.02, 1.03, 0.29], [0.82, 1.03, 0.29],
  ];
  cargoLayout.slice(0, cargoCount).forEach(([x, y, z], index) => {
    const crate = createIceCrate(String(index + 1).padStart(2, '0'), quality, materials, copper, fishMaterial);
    crate.scale.setScalar(1.06);
    crate.position.set(x, y, z);
    crate.rotation.y = index % 2 ? 0.025 : -0.02;
    suspension.add(crate);
  });
  const frontBasket = createSeafoodBasket('FRONT', materials, copper, fishMaterial);
  frontBasket.position.set(-1.45, 1.03, 0.32);
  const rearBasket = createSeafoodBasket('REAR', materials, copper, fishMaterial);
  rearBasket.position.set(1.43, 1.03, -0.32);
  suspension.add(frontBasket, rearBasket);

  const frontGuard = box(0.18, 0.78, 1.12, materials.timberDark, 'FROSTMOON_FREIGHT_FRONT_GUARD');
  frontGuard.position.set(-1.75, 0.98, 0);
  frontGuard.rotation.z = -0.1;
  const rearGate = box(0.12, 0.78, 1.12, materials.timberDark, 'FROSTMOON_FREIGHT_REAR_LOADING_GATE');
  rearGate.position.set(1.75, 0.96, 0);
  suspension.add(frontGuard, rearGate);
  [-0.43, 0.43].forEach((z, index) => {
    const rearHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), copper);
    rearHinge.name = `FROSTMOON_FREIGHT_REAR_GATE_HINGE_${index + 1}`;
    rearHinge.rotation.x = Math.PI / 2;
    rearHinge.position.set(1.8, 0.67, z);
    suspension.add(rearHinge);
  });

  const lantern = new THREE.Group();
  lantern.name = 'FROSTMOON_FREIGHT_WARM_EXPORT_LANTERN';
  lantern.position.set(1.86, 1.36, 0.42);
  const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), lanternGlow);
  lanternBody.name = 'FROSTMOON_FREIGHT_LANTERN_GLOW';
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 8), copper);
  lanternCap.position.y = 0.16;
  lantern.add(lanternBody, lanternCap);
  cart.add(lantern);

  cart.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts: ['chassis', 'running-gear', 'sail-rig', 'rigging', 'cargo', 'seafood-baskets', 'front-service', 'rear-service', 'lantern'],
    sockets: {
      loading: 'FROSTMOON_FREIGHT_LOADING_SOCKET',
      route: 'FROSTMOON_FREIGHT_ROUTE_SOCKET',
      mast: 'FROSTMOON_FREIGHT_SAIL_PIVOT',
    },
    approximation: 'stylized fixed dual-contact wheel-and-ski system',
  };
  const loadingSocket = new THREE.Object3D();
  loadingSocket.name = 'FROSTMOON_FREIGHT_LOADING_SOCKET';
  loadingSocket.position.set(0.55, 1.45, 0);
  const routeSocket = new THREE.Object3D();
  routeSocket.name = 'FROSTMOON_FREIGHT_ROUTE_SOCKET';
  routeSocket.position.set(0, 0.12, 0);
  cart.add(loadingSocket, routeSocket);
  return { cart, suspension, mastPivot, sail, wheelPivots, lanternBody };
}

function createLoadingYard(
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.Material,
  fishMaterial: THREE.Material,
  lanternGlow: THREE.Material,
) {
  const yard = new THREE.Group();
  yard.name = 'FROSTMOON_PREMIUM_SEAFOOD_LOADING_YARD';
  yard.position.set(FROSTMOON_LOADING_YARD_POSITION.x, FROSTMOON_LOADING_YARD_POSITION.y, FROSTMOON_LOADING_YARD_POSITION.z);
  yard.rotation.y = 0.08;
  yard.userData.clearanceRadius = FROSTMOON_LOADING_YARD_CLEARANCE_RADIUS;
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.28, 0.22, quality === 'low' ? 10 : 16), materials.frostRockDark);
  platform.name = 'FROSTMOON_LOADING_YARD_STONE_PLATFORM';
  platform.position.y = 0.12;
  platform.scale.z = 0.7;
  const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.17, 0.12, quality === 'low' ? 10 : 16), materials.snow);
  snowCap.name = 'FROSTMOON_LOADING_YARD_SNOW_CAP';
  snowCap.position.y = 0.28;
  snowCap.scale.z = 0.68;
  yard.add(platform, snowCap);

  const loadingTable = box(1.35, 0.14, 0.62, materials.timberDark, 'FROSTMOON_LOADING_YARD_ICE_TABLE');
  loadingTable.position.set(0, 0.72, 0.02);
  yard.add(loadingTable);
  [-0.52, 0.52].forEach((x, index) => {
    const leg = box(0.13, 0.62, 0.48, materials.timber, `FROSTMOON_LOADING_YARD_TABLE_LEG_${index + 1}`);
    leg.position.set(x, 0.46, 0.02);
    yard.add(leg);
  });
  const crateCount = quality === 'low' ? 1 : 2;
  for (let index = 0; index < crateCount; index += 1) {
    const crate = createIceCrate(`YARD_${index + 1}`, quality, materials, copper, fishMaterial);
    crate.scale.setScalar(0.82);
    crate.position.set(-0.38 + index * 0.76, 0.83, 0.01);
    yard.add(crate);
  }

  [-0.9, 0.9].forEach((x, index) => {
    const post = box(0.08, 1.1, 0.08, copper, `FROSTMOON_LOADING_YARD_LANTERN_POST_${index + 1}`);
    post.position.set(x, 0.83, -0.42);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), lanternGlow);
    lamp.name = `FROSTMOON_LOADING_YARD_WARM_LANTERN_${index + 1}`;
    lamp.position.set(x, 1.39, -0.42);
    yard.add(post, lamp);
  });
  yard.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts: ['platform', 'ice-table', 'crate-bays', 'lantern-posts'],
    sockets: { cartDock: 'FROSTMOON_LOADING_YARD_CART_DOCK' },
  };
  const dock = new THREE.Object3D();
  dock.name = 'FROSTMOON_LOADING_YARD_CART_DOCK';
  dock.position.set(1.2, 0.3, 0);
  yard.add(dock);
  return yard;
}

function createTradeIceSpur(quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const spur = new THREE.Group();
  spur.name = 'FROSTMOON_SEAFOOD_TRADE_ICE_SPUR';
  spur.position.set(-5.35, 0, -6.55);
  spur.rotation.y = -0.22;
  const segments = quality === 'low' ? 12 : 18;
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.9, 0.28, segments), materials.frostRockDark);
  rock.name = 'FROSTMOON_SEAFOOD_TRADE_ICE_SPUR_ROCK';
  rock.position.y = 0.14;
  rock.scale.z = 0.54;
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(2.66, 2.74, 0.12, segments), materials.snow);
  snow.name = 'FROSTMOON_SEAFOOD_TRADE_ICE_SPUR_SNOW';
  snow.position.y = 0.31;
  snow.scale.z = 0.52;
  spur.add(rock, snow);
  return spur;
}

function createCourierIceLane(quality: Island3DQuality, materials: Island3FrostmoonMaterials) {
  const lane = new THREE.Group();
  lane.name = 'FROSTMOON_KITE_COURIER_ICE_LANE';
  lane.position.set(-6.75, 0, -4.75);
  lane.rotation.y = 0.28;
  const segments = quality === 'low' ? 10 : 16;
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(1.96, 2.08, 0.23, segments), materials.frostRockDark);
  rock.name = 'FROSTMOON_KITE_COURIER_ICE_LANE_ROCK';
  rock.position.y = 0.12;
  rock.scale.z = 0.52;
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.98, 0.1, segments), materials.snow);
  snow.name = 'FROSTMOON_KITE_COURIER_ICE_LANE_SNOW';
  snow.position.y = 0.27;
  snow.scale.z = 0.5;
  lane.add(rock, snow);
  return lane;
}

function createKiteCourier(
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.MeshStandardMaterial,
  sailCloth: THREE.MeshPhysicalMaterial,
  rope: THREE.MeshStandardMaterial,
  fishMaterial: THREE.MeshStandardMaterial,
  wolfGrey: THREE.MeshStandardMaterial,
  wolfCream: THREE.MeshStandardMaterial,
  wolfDark: THREE.MeshStandardMaterial,
) {
  const courier = new THREE.Group();
  courier.name = 'FROSTMOON_KITE_DOG_SEAFOOD_COURIER';
  courier.position.set(FROSTMOON_KITE_COURIER_POSITION.x, FROSTMOON_KITE_COURIER_POSITION.y, FROSTMOON_KITE_COURIER_POSITION.z);
  courier.rotation.y = -0.42;
  courier.scale.setScalar(0.66);
  courier.userData.clearanceRadius = FROSTMOON_KITE_COURIER_CLEARANCE_RADIUS;

  const sled = new THREE.Group();
  sled.name = 'FROSTMOON_KITE_COURIER_SLED';
  sled.position.x = 0.55;
  const deck = box(1.75, 0.22, 0.94, materials.timberDark, 'FROSTMOON_KITE_COURIER_DECK');
  deck.position.y = 0.56;
  sled.add(deck);
  [-0.46, 0.46].forEach((z, index) => {
    const runner = curveTube(
      [
        new THREE.Vector3(-1.04, 0.22, z),
        new THREE.Vector3(-0.82, 0.08, z),
        new THREE.Vector3(0.72, 0.08, z),
        new THREE.Vector3(1.05, 0.31, z),
      ],
      0.07,
      index ? materials.timber : copper,
      quality === 'high' ? 18 : 12,
      `FROSTMOON_KITE_COURIER_RUNNER_${index + 1}`,
    );
    sled.add(runner);
  });
  [-0.48, 0.32].forEach((x, index) => {
    const crate = createIceCrate(`COURIER_${index + 1}`, quality, materials, copper, fishMaterial);
    crate.scale.setScalar(0.78);
    crate.position.set(x, 0.69, index ? 0.14 : -0.13);
    sled.add(crate);
  });
  courier.add(sled);

  const mast = cylinderBetween(
    new THREE.Vector3(0.15, 0.65, 0),
    new THREE.Vector3(0.15, 1.65, 0),
    0.055,
    materials.timberDark,
    9,
    'FROSTMOON_KITE_COURIER_TOW_MAST',
  );
  courier.add(mast);
  const kitePivot = new THREE.Group();
  kitePivot.name = 'FROSTMOON_KITE_COURIER_KITE_PIVOT';
  kitePivot.position.set(-0.3, 3.45, 0);
  const kiteShape = new THREE.Shape();
  kiteShape.moveTo(-1.15, 0);
  kiteShape.quadraticCurveTo(0, 0.72, 1.15, 0);
  kiteShape.quadraticCurveTo(0.58, -0.16, 0, -0.6);
  kiteShape.quadraticCurveTo(-0.58, -0.16, -1.15, 0);
  const kite = new THREE.Mesh(
    new THREE.ExtrudeGeometry(kiteShape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.016, bevelThickness: 0.016, bevelSegments: 2 }),
    sailCloth,
  );
  kite.name = 'FROSTMOON_KITE_COURIER_CREAM_WIND_KITE';
  kite.position.z = -0.028;
  kitePivot.add(kite);
  const kiteFrame = curveTube(
    [new THREE.Vector3(-1.12, 0.02, 0.04), new THREE.Vector3(0, 0.68, 0.04), new THREE.Vector3(1.12, 0.02, 0.04)],
    0.035,
    copper,
    quality === 'high' ? 18 : 12,
    'FROSTMOON_KITE_COURIER_COPPER_KITE_FRAME',
  );
  kitePivot.add(kiteFrame);
  courier.add(kitePivot);
  [-0.75, 0.75].forEach((x, index) => {
    const line = curveTube(
      [new THREE.Vector3(0.15, 1.65, index ? 0.08 : -0.08), new THREE.Vector3(-0.25, 2.35, 0), new THREE.Vector3(x - 0.3, 3.45, 0)],
      0.014,
      rope,
      12,
      `FROSTMOON_KITE_COURIER_LINE_${index + 1}`,
    );
    courier.add(line);
  });

  const adultDogs: FrostmoonWolfRig[] = [];
  [-0.28, 0.28].forEach((z, index) => {
    const dog = createWolfDog(`COURIER_${index + 1}`, 0.92, wolfGrey, wolfCream, wolfDark, copper);
    dog.root.position.set(-1.52, 0.16, z);
    adultDogs.push(dog);
    courier.add(dog.root);
    const harness = curveTube(
      [new THREE.Vector3(-1.12, 0.66, z), new THREE.Vector3(-0.58, 0.69, z), new THREE.Vector3(-0.24, 0.66, z)],
      0.018,
      rope,
      10,
      `FROSTMOON_KITE_COURIER_HARNESS_LINE_${index + 1}`,
    );
    courier.add(harness);
  });
  courier.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts: ['kite', 'tow-rig', 'sled', 'seafood-cargo', 'dog-team'],
    sockets: { route: 'FROSTMOON_KITE_COURIER_ROUTE_SOCKET' },
  };
  const routeSocket = new THREE.Object3D();
  routeSocket.name = 'FROSTMOON_KITE_COURIER_ROUTE_SOCKET';
  courier.add(routeSocket);
  return { courier, kitePivot, adultDogs };
}

function createPuppyPack(
  wolfGrey: THREE.MeshStandardMaterial,
  wolfCream: THREE.MeshStandardMaterial,
  wolfDark: THREE.MeshStandardMaterial,
  copper: THREE.MeshStandardMaterial,
) {
  const pack = new THREE.Group();
  pack.name = 'FROSTMOON_PLAYFUL_WOLF_PUPPY_PACK';
  const puppies = FROSTMOON_PUPPY_HOMES.map((home, index) => {
    const dog = createWolfDog(`PUPPY_${index + 1}`, 0.48, wolfGrey, wolfCream, wolfDark, copper);
    dog.root.position.set(home.x, home.y, home.z);
    dog.root.rotation.y = index * 2.05;
    pack.add(dog.root);
    return { dog, home, phase: index * 2.1 };
  });
  pack.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts: puppies.map((_, index) => `wolf-puppy-${index + 1}`),
    visualOnly: true,
  };
  return { pack, puppies };
}

function createBackgroundWindSkimmers(
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
  copper: THREE.MeshStandardMaterial,
  sailCloth: THREE.MeshPhysicalMaterial,
) {
  const traffic = new THREE.Group();
  traffic.name = 'FROSTMOON_DISTANT_WIND_ICE_TRADE_TRAFFIC';
  const count = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
  const routes = [
    { start: new THREE.Vector3(-25, 0.5, -15.5), end: new THREE.Vector3(24, 0.5, -18.5), phase: 5, period: 43 },
    { start: new THREE.Vector3(23, 0.46, -22), end: new THREE.Vector3(-26, 0.46, -17), phase: 23, period: 57 },
    { start: new THREE.Vector3(-29, 0.42, -25), end: new THREE.Vector3(27, 0.42, -23), phase: 39, period: 71 },
  ];
  const rigs: FrostmoonBackgroundSkimmerRig[] = [];
  routes.slice(0, count).forEach((route, index) => {
    const skimmer = new THREE.Group();
    skimmer.name = `FROSTMOON_DISTANT_WIND_ICE_SKIMMER_${index + 1}`;
    skimmer.visible = false;
    skimmer.scale.setScalar(0.46 - index * 0.055);

    const deck = box(2.25, 0.24, 0.82, materials.timberDark, `FROSTMOON_DISTANT_SKIMMER_${index + 1}_DECK`);
    deck.position.y = 0.5;
    skimmer.add(deck);
    [-0.38, 0.38].forEach((z, runnerIndex) => {
      skimmer.add(curveTube(
        [
          new THREE.Vector3(-1.25, 0.18, z),
          new THREE.Vector3(-0.92, 0.06, z),
          new THREE.Vector3(0.9, 0.06, z),
          new THREE.Vector3(1.24, 0.25, z),
        ],
        0.055,
        runnerIndex === 0 ? copper : materials.timber,
        quality === 'low' ? 8 : 12,
        `FROSTMOON_DISTANT_SKIMMER_${index + 1}_RUNNER_${runnerIndex + 1}`,
      ));
    });
    [-0.2, 0.42].forEach((x, cargoIndex) => {
      const cargo = box(0.5, 0.38, 0.48, materials.snowShadow, `FROSTMOON_DISTANT_SKIMMER_${index + 1}_FISH_CRATE_${cargoIndex + 1}`);
      cargo.position.set(x, 0.79, cargoIndex === 0 ? -0.12 : 0.13);
      skimmer.add(cargo);
    });

    const sailPivot = new THREE.Group();
    sailPivot.name = `FROSTMOON_DISTANT_SKIMMER_${index + 1}_SAIL_PIVOT`;
    sailPivot.position.set(-0.62, 0.58, 0);
    const mast = cylinderBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 2.08, 0),
      0.06,
      materials.timberDark,
      8,
      `FROSTMOON_DISTANT_SKIMMER_${index + 1}_MAST`,
    );
    sailPivot.add(mast);
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0.08, 0.35);
    sailShape.lineTo(0.08, 2.02);
    sailShape.lineTo(1.72, 0.5);
    sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sailShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }),
      sailCloth,
    );
    sail.name = `FROSTMOON_DISTANT_SKIMMER_${index + 1}_CREAM_SAIL`;
    sail.position.z = -0.0225;
    sailPivot.add(sail);
    skimmer.add(sailPivot);
    traffic.add(skimmer);
    rigs.push({
      root: skimmer,
      sailPivot,
      phaseSeconds: route.phase,
      periodSeconds: route.period,
      start: route.start,
      end: route.end,
    });
  });
  traffic.userData.sculptRuntime = {
    visualOnly: true,
    ambient: true,
    parts: rigs.map((_, index) => `wind-ice-skimmer-${index + 1}`),
  };
  return { traffic, rigs };
}

export function createFrostmoonSeafoodTrade(
  quality: Island3DQuality,
  materials: Island3FrostmoonMaterials,
): FrostmoonSeafoodTradeRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_3_FROSTMOON_SEAFOOD_TRADE_LAYER';
  const copper = new THREE.MeshStandardMaterial({ color: 0xc06c3d, roughness: 0.4, metalness: 0.72 });
  const sailCloth = new THREE.MeshPhysicalMaterial({
    color: 0xf0e6cf,
    roughness: 0.76,
    metalness: 0,
    sheen: 0.28,
    sheenColor: new THREE.Color(0xfff5df),
    side: THREE.DoubleSide,
  });
  const rope = new THREE.MeshStandardMaterial({ color: 0x594431, roughness: 0.92 });
  const fishMaterial = new THREE.MeshStandardMaterial({ color: 0x8d9ba3, roughness: 0.46, metalness: 0.08 });
  const wolfGrey = new THREE.MeshStandardMaterial({ color: 0x626970, roughness: 0.88, metalness: 0 });
  const wolfCream = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9, metalness: 0 });
  const wolfDark = new THREE.MeshStandardMaterial({ color: 0x171b20, roughness: 0.72, metalness: 0.02 });
  const lanternGlow = materials.windowGlow.clone();
  lanternGlow.name = 'FROSTMOON_TRADE_LANTERN_MATERIAL';

  const freight = createFreightCart(quality, materials, copper, sailCloth, rope, fishMaterial, lanternGlow);
  const loadingYard = createLoadingYard(quality, materials, copper, fishMaterial, lanternGlow);
  const iceSpur = createTradeIceSpur(quality, materials);
  const courierIceLane = createCourierIceLane(quality, materials);
  const kiteCourier = createKiteCourier(
    quality,
    materials,
    copper,
    sailCloth,
    rope,
    fishMaterial,
    wolfGrey,
    wolfCream,
    wolfDark,
  );
  const puppyPack = createPuppyPack(wolfGrey, wolfCream, wolfDark, copper);
  const backgroundTraffic = createBackgroundWindSkimmers(quality, materials, copper, sailCloth);
  root.add(
    iceSpur,
    courierIceLane,
    freight.cart,
    loadingYard,
    kiteCourier.courier,
    puppyPack.pack,
    backgroundTraffic.traffic,
  );
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-003-frostmoon',
    visualOnly: true,
    parts: [
      'trade-ice-spur',
      'premium-seafood-loading-yard',
      'large-wind-freight-family',
      'kite-dog-courier',
      'wolf-puppy-pack',
      'distant-wind-ice-traffic',
    ],
    routeClearance: {
      cart: isFrostmoonSeafoodTradeRouteClear(
        FROSTMOON_FREIGHT_CART_POSITION.x,
        FROSTMOON_FREIGHT_CART_POSITION.z,
        FROSTMOON_FREIGHT_CART_CLEARANCE_RADIUS,
      ),
      loadingYard: isFrostmoonSeafoodTradeRouteClear(
        FROSTMOON_LOADING_YARD_POSITION.x,
        FROSTMOON_LOADING_YARD_POSITION.z,
        FROSTMOON_LOADING_YARD_CLEARANCE_RADIUS,
      ),
      kiteCourier: isFrostmoonSeafoodTradeRouteClear(
        FROSTMOON_KITE_COURIER_POSITION.x,
        FROSTMOON_KITE_COURIER_POSITION.z,
        FROSTMOON_KITE_COURIER_CLEARANCE_RADIUS,
      ),
      puppies: FROSTMOON_PUPPY_HOMES.every((home) => isFrostmoonSeafoodTradeRouteClear(home.x, home.z, 0.68)),
    },
  };
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = quality !== 'low';
      object.receiveShadow = true;
    }
  });
  backgroundTraffic.traffic.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });

  let fishingActive = false;
  let departureStartedAt: number | null = null;
  const departureX = -18.2;
  const departureZ = -14.8;

  return {
    root,
    freightCart: freight.cart,
    loadingYard,
    kiteCourier: kiteCourier.courier,
    puppyPack: puppyPack.pack,
    backgroundTraffic: backgroundTraffic.traffic,
    setFishingActive: (active) => {
      if (fishingActive === active) return;
      fishingActive = active;
      departureStartedAt = null;
      if (!active) {
        freight.cart.visible = true;
        freight.cart.position.set(
          FROSTMOON_FREIGHT_CART_POSITION.x,
          FROSTMOON_FREIGHT_CART_POSITION.y,
          FROSTMOON_FREIGHT_CART_POSITION.z,
        );
        freight.cart.rotation.y = FROSTMOON_FREIGHT_DOCK_ROTATION;
        freight.cart.scale.setScalar(0.9);
      }
      backgroundTraffic.rigs.forEach((rig) => { rig.root.visible = false; });
    },
    animate: (elapsed, blizzardStrength = 0) => {
      const gust = 0.012 + THREE.MathUtils.clamp(blizzardStrength, 0, 1) * 0.045;
      let departureTravel = 0;
      if (fishingActive) {
        if (departureStartedAt === null) departureStartedAt = elapsed;
        const departureElapsed = Math.max(0, elapsed - departureStartedAt);
        const turnRaw = THREE.MathUtils.clamp(
          (departureElapsed - FROSTMOON_FREIGHT_DEPARTURE_DELAY_SECONDS) / FROSTMOON_FREIGHT_DEPARTURE_TURN_SECONDS,
          0,
          1,
        );
        const turn = THREE.MathUtils.smoothstep(turnRaw, 0, 1);
        const travelRaw = THREE.MathUtils.clamp(
          (
            departureElapsed
            - FROSTMOON_FREIGHT_DEPARTURE_DELAY_SECONDS
            - FROSTMOON_FREIGHT_DEPARTURE_TURN_SECONDS
          ) / FROSTMOON_FREIGHT_DEPARTURE_TRAVEL_SECONDS,
          0,
          1,
        );
        departureTravel = THREE.MathUtils.smoothstep(travelRaw, 0, 1);
        freight.cart.visible = travelRaw < 1;
        freight.cart.rotation.y = THREE.MathUtils.lerp(
          FROSTMOON_FREIGHT_DOCK_ROTATION,
          FROSTMOON_FREIGHT_DEPARTURE_HEADING,
          turn,
        );
        freight.cart.position.set(
          FROSTMOON_FREIGHT_CART_POSITION.x + departureX * departureTravel,
          FROSTMOON_FREIGHT_CART_POSITION.y + Math.sin(departureTravel * Math.PI) * 0.08,
          FROSTMOON_FREIGHT_CART_POSITION.z
            + departureZ * departureTravel
            + Math.sin(departureTravel * Math.PI) * 1.45,
        );
        freight.cart.scale.setScalar(THREE.MathUtils.lerp(0.9, 0.64, departureTravel));
      } else {
        freight.cart.visible = true;
        freight.cart.position.set(
          FROSTMOON_FREIGHT_CART_POSITION.x,
          FROSTMOON_FREIGHT_CART_POSITION.y,
          FROSTMOON_FREIGHT_CART_POSITION.z,
        );
        freight.cart.rotation.y = FROSTMOON_FREIGHT_DOCK_ROTATION;
        freight.cart.scale.setScalar(0.9);
      }
      freight.mastPivot.rotation.z = Math.sin(elapsed * (0.52 + blizzardStrength * 0.75)) * gust;
      freight.sail.scale.z = 1 + Math.sin(elapsed * 0.85) * (0.018 + blizzardStrength * 0.045);
      freight.suspension.position.y = 0.12 + Math.sin(elapsed * 0.72) * (0.012 + blizzardStrength * 0.008);
      freight.wheelPivots.forEach((wheel, index) => {
        wheel.rotation.z = departureTravel * 24 + Math.sin(elapsed * 0.34 + index * 0.8) * 0.018;
      });
      backgroundTraffic.rigs.forEach((rig, index) => {
        const activeSeconds = 12 + index * 1.5;
        const windowSeconds = ((elapsed + rig.phaseSeconds) % rig.periodSeconds + rig.periodSeconds) % rig.periodSeconds;
        const active = fishingActive && windowSeconds < activeSeconds;
        rig.root.visible = active;
        if (!active) return;
        const progress = THREE.MathUtils.smoothstep(windowSeconds / activeSeconds, 0, 1);
        rig.root.position.lerpVectors(rig.start, rig.end, progress);
        rig.root.position.y += Math.sin(elapsed * 1.2 + index) * 0.035;
        rig.root.rotation.y = Math.atan2(-(rig.end.z - rig.start.z), rig.end.x - rig.start.x);
        rig.sailPivot.rotation.z = Math.sin(elapsed * 0.82 + index * 1.7) * (0.035 + gust * 0.5);
      });
      kiteCourier.kitePivot.rotation.z = Math.sin(elapsed * (0.74 + blizzardStrength * 0.55)) * (0.04 + blizzardStrength * 0.08);
      kiteCourier.courier.position.y = FROSTMOON_KITE_COURIER_POSITION.y + Math.sin(elapsed * 1.5) * 0.018;
      kiteCourier.adultDogs.forEach((dog, dogIndex) => {
        dog.headPivot.rotation.z = Math.sin(elapsed * 1.1 + dogIndex) * 0.035;
        dog.tailPivot.rotation.z = Math.sin(elapsed * 2.4 + dogIndex) * 0.18;
        dog.legPivots.forEach((leg, legIndex) => {
          leg.rotation.z = Math.sin(elapsed * 3.2 + legIndex * Math.PI + dogIndex * 0.4) * 0.24;
        });
      });
      puppyPack.puppies.forEach(({ dog, home, phase }, index) => {
        const stride = elapsed * (0.62 + index * 0.07) + phase;
        dog.root.position.set(
          home.x + Math.cos(stride) * 0.22,
          home.y + Math.abs(Math.sin(stride * 2)) * 0.045,
          home.z + Math.sin(stride) * 0.16,
        );
        dog.root.rotation.y = -stride - Math.PI / 2;
        dog.headPivot.rotation.z = Math.sin(stride * 1.7) * 0.08;
        dog.tailPivot.rotation.z = Math.sin(stride * 3.4) * 0.32;
        dog.legPivots.forEach((leg, legIndex) => {
          leg.rotation.z = Math.sin(stride * 4.2 + legIndex * Math.PI) * 0.34;
        });
      });
      lanternGlow.emissiveIntensity = 0.55 + Math.sin(elapsed * 2.1) * 0.08;
    },
  };
}
