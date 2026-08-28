import * as THREE from 'three';

export type Island22PremiumFishingQuality = 'low' | 'medium' | 'high';

/**
 * Presentation-only procedural actors for Island 016's in-world fishing scene.
 *
 * Reference authority:
 * - exact village source: 016-fishermans-village-approved-v004.png
 * - secondary construction study: fishing-character-rig-catch-family-v001.png
 *
 * The exported roots intentionally remain transform-stable. Runtime animation is
 * applied to named child pivots so the board/world integration remains the only
 * owner of placement, camera, mission state, and gameplay progression.
 */

export type Island22PremiumCatchKind = 'small' | 'medium' | 'large' | 'colossal';

export interface Island22PremiumFishingDetailProfile {
  radialSegments: number;
  sphereSegments: number;
  rodSegments: number;
  lineSegments: number;
  scaleRows: number;
  scaleColumns: number;
  coatHardware: boolean;
  fishFinRays: boolean;
}

export const ISLAND_22_PREMIUM_FISHING_DETAIL: Record<Island22PremiumFishingQuality, Island22PremiumFishingDetailProfile> = {
  low: {
    radialSegments: 7,
    sphereSegments: 9,
    rodSegments: 5,
    lineSegments: 6,
    scaleRows: 2,
    scaleColumns: 4,
    coatHardware: false,
    fishFinRays: false,
  },
  medium: {
    radialSegments: 10,
    sphereSegments: 13,
    rodSegments: 7,
    lineSegments: 9,
    scaleRows: 3,
    scaleColumns: 6,
    coatHardware: true,
    fishFinRays: false,
  },
  high: {
    radialSegments: 14,
    sphereSegments: 18,
    rodSegments: 9,
    lineSegments: 13,
    scaleRows: 4,
    scaleColumns: 8,
    coatHardware: true,
    fishFinRays: true,
  },
};

export interface Island22PremiumFishingMaterials {
  coat: THREE.MeshStandardMaterial;
  coatEdge: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  scarf: THREE.MeshStandardMaterial;
  trousers: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  leatherDark: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  blush: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eyeWhite: THREE.MeshStandardMaterial;
  eyeDark: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  rod: THREE.MeshStandardMaterial;
  line: THREE.MeshBasicMaterial;
  bobberRed: THREE.MeshStandardMaterial;
  bobberIvory: THREE.MeshStandardMaterial;
  fishGold: THREE.MeshPhysicalMaterial;
  fishSilver: THREE.MeshPhysicalMaterial;
  fishTeal: THREE.MeshPhysicalMaterial;
  fishDeepTeal: THREE.MeshPhysicalMaterial;
  fishBelly: THREE.MeshPhysicalMaterial;
  fishFinGold: THREE.MeshStandardMaterial;
  fishFinTeal: THREE.MeshStandardMaterial;
  fishMarking: THREE.MeshStandardMaterial;
  wetHighlight: THREE.MeshBasicMaterial;
}

export function createIsland22PremiumFishingMaterials(): Island22PremiumFishingMaterials {
  const wetFish = (color: number, roughness: number) => new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.04,
    clearcoat: 0.76,
    clearcoatRoughness: 0.16,
  });
  return {
    coat: new THREE.MeshStandardMaterial({ color: 0x285f63, roughness: 0.78 }),
    coatEdge: new THREE.MeshStandardMaterial({ color: 0x397d78, roughness: 0.72 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xe6d3aa, roughness: 0.86 }),
    scarf: new THREE.MeshStandardMaterial({ color: 0xb94731, roughness: 0.76 }),
    trousers: new THREE.MeshStandardMaterial({ color: 0x3a403d, roughness: 0.9 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x6b4425, roughness: 0.84 }),
    leatherDark: new THREE.MeshStandardMaterial({ color: 0x2a1b15, roughness: 0.92 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd99b68, roughness: 0.84 }),
    blush: new THREE.MeshStandardMaterial({ color: 0xd97660, roughness: 0.88 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x55311f, roughness: 0.94 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xfff7de, roughness: 0.62 }),
    eyeDark: new THREE.MeshStandardMaterial({ color: 0x16292a, roughness: 0.72 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9913d, roughness: 0.48, metalness: 0.34 }),
    rod: new THREE.MeshStandardMaterial({ color: 0x7b4b28, roughness: 0.72 }),
    line: new THREE.MeshBasicMaterial({ color: 0xe9fff5, transparent: true, opacity: 0.92, depthWrite: false }),
    bobberRed: new THREE.MeshStandardMaterial({ color: 0xd74332, roughness: 0.52 }),
    bobberIvory: new THREE.MeshStandardMaterial({ color: 0xf3ead0, roughness: 0.62 }),
    fishGold: wetFish(0xa6974f, 0.31),
    fishSilver: wetFish(0x9fc8bc, 0.25),
    fishTeal: wetFish(0x2fa8a5, 0.24),
    fishDeepTeal: wetFish(0x176b72, 0.27),
    fishBelly: wetFish(0xcbe2c7, 0.36),
    fishFinGold: new THREE.MeshStandardMaterial({ color: 0xd47635, roughness: 0.52, side: THREE.DoubleSide }),
    fishFinTeal: new THREE.MeshStandardMaterial({ color: 0x207e82, roughness: 0.48, side: THREE.DoubleSide }),
    fishMarking: new THREE.MeshStandardMaterial({ color: 0x244f51, roughness: 0.48, side: THREE.DoubleSide }),
    wetHighlight: new THREE.MeshBasicMaterial({ color: 0xf1fff4, transparent: true, opacity: 0.45, depthWrite: false }),
  };
}

function namedGroup(name: string) {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

function mesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}

function cylinderBetween(
  target: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  direction: THREE.Vector3,
) {
  direction.subVectors(end, start);
  const length = Math.max(0.001, direction.length());
  target.position.copy(start).add(end).multiplyScalar(0.5);
  target.quaternion.setFromUnitVectors(UP, direction.normalize());
  target.scale.set(1, length, 1);
}

function addSocket(parent: THREE.Object3D, name: string, position: readonly [number, number, number]) {
  const socket = namedGroup(name);
  socket.position.set(...position);
  parent.add(socket);
  return socket;
}

const UP = new THREE.Vector3(0, 1, 0);
const SCRATCH_A = new THREE.Vector3();
const SCRATCH_B = new THREE.Vector3();
const SCRATCH_C = new THREE.Vector3();

export interface Island22PremiumFishermanPose {
  cast: number;
  pull: number;
  tension: number;
  celebrate: number;
  panic: number;
  reelTurns: number;
}

export interface Island22PremiumFisherman {
  root: THREE.Group;
  motionRoot: THREE.Group;
  spinePivot: THREE.Group;
  headPivot: THREE.Group;
  leftShoulderPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  rodHandSocket: THREE.Group;
  reelHandSocket: THREE.Group;
  catchHandSocket: THREE.Group;
  update: (elapsed: number, pose: Partial<Island22PremiumFishermanPose>) => void;
}

function createBoot(
  parent: THREE.Object3D,
  name: string,
  side: number,
  materials: Island22PremiumFishingMaterials,
  profile: Island22PremiumFishingDetailProfile,
) {
  const boot = namedGroup(name);
  boot.position.set(side * 0.16, 0.12, 0.035);
  parent.add(boot);
  const sole = mesh(
    `${name}_SOLE`,
    new THREE.BoxGeometry(0.26, 0.12, 0.42),
    materials.leatherDark,
    boot,
  );
  sole.position.z = 0.055;
  const upper = mesh(
    `${name}_UPPER`,
    new THREE.CapsuleGeometry(0.12, 0.18, 2, profile.radialSegments),
    materials.leather,
    boot,
  );
  upper.position.set(0, 0.12, -0.045);
  upper.scale.set(1, 0.78, 1.15);
  return boot;
}

function createArm(
  parent: THREE.Object3D,
  name: string,
  side: number,
  materials: Island22PremiumFishingMaterials,
  profile: Island22PremiumFishingDetailProfile,
) {
  const shoulder = namedGroup(`${name}_SHOULDER_PIVOT`);
  shoulder.position.set(side * 0.34, 1.13, 0);
  parent.add(shoulder);
  const upper = mesh(
    `${name}_UPPER_ARM`,
    new THREE.CapsuleGeometry(0.095, 0.32, 2, profile.radialSegments),
    materials.coat,
    shoulder,
  );
  upper.position.y = -0.24;
  const elbow = namedGroup(`${name}_ELBOW_PIVOT`);
  elbow.position.y = -0.51;
  shoulder.add(elbow);
  const forearm = mesh(
    `${name}_FOREARM`,
    new THREE.CapsuleGeometry(0.085, 0.28, 2, profile.radialSegments),
    materials.coatEdge,
    elbow,
  );
  forearm.position.y = -0.22;
  const cuff = mesh(
    `${name}_CUFF`,
    new THREE.CylinderGeometry(0.1, 0.1, 0.09, profile.radialSegments),
    materials.leather,
    elbow,
  );
  cuff.position.y = -0.4;
  const hand = mesh(
    `${name}_HAND`,
    new THREE.SphereGeometry(0.105, profile.sphereSegments, Math.max(6, profile.sphereSegments - 3)),
    materials.skin,
    elbow,
  );
  hand.position.y = -0.5;
  hand.scale.set(0.88, 1.05, 0.86);
  const socket = addSocket(elbow, `${name}_HAND_SOCKET`, [0, -0.5, 0.04]);
  return { shoulder, elbow, socket };
}

export function createIsland22PremiumFisherman(
  quality: Island22PremiumFishingQuality = 'medium',
  sharedMaterials?: Island22PremiumFishingMaterials,
): Island22PremiumFisherman {
  const profile = ISLAND_22_PREMIUM_FISHING_DETAIL[quality];
  const materials = sharedMaterials ?? createIsland22PremiumFishingMaterials();
  const root = namedGroup('ISLAND_22_PREMIUM_FISHER_ROOT');
  root.userData.island22PremiumFishing = {
    partId: 'p22-hero-fisher-character-costume-face-and-body',
    frontAxis: '+z',
    quality,
    externalTransformOwner: true,
  };
  const motionRoot = namedGroup('ISLAND_22_PREMIUM_FISHER_MOTION_ROOT');
  root.add(motionRoot);

  createBoot(motionRoot, 'ISLAND_22_PREMIUM_FISHER_LEFT_BOOT', -1, materials, profile);
  createBoot(motionRoot, 'ISLAND_22_PREMIUM_FISHER_RIGHT_BOOT', 1, materials, profile);

  const leftHip = namedGroup('ISLAND_22_PREMIUM_FISHER_LEFT_HIP_PIVOT');
  const rightHip = namedGroup('ISLAND_22_PREMIUM_FISHER_RIGHT_HIP_PIVOT');
  leftHip.position.set(-0.16, 0.71, 0);
  rightHip.position.set(0.16, 0.71, 0);
  motionRoot.add(leftHip, rightHip);
  const legGeometry = new THREE.CapsuleGeometry(0.125, 0.37, 2, profile.radialSegments);
  const leftLeg = mesh('ISLAND_22_PREMIUM_FISHER_LEFT_LEG', legGeometry, materials.trousers, leftHip);
  const rightLeg = mesh('ISLAND_22_PREMIUM_FISHER_RIGHT_LEG', legGeometry, materials.trousers, rightHip);
  leftLeg.position.y = -0.32;
  rightLeg.position.y = -0.32;

  const spinePivot = namedGroup('ISLAND_22_PREMIUM_FISHER_SPINE_PIVOT');
  spinePivot.position.y = 0.66;
  motionRoot.add(spinePivot);
  const coatBody = mesh(
    'ISLAND_22_PREMIUM_FISHER_COAT_BODY',
    new THREE.CapsuleGeometry(0.37, 0.62, 3, profile.radialSegments),
    materials.coat,
    spinePivot,
  );
  coatBody.position.y = 0.43;
  coatBody.scale.set(1.08, 1, 0.76);
  const coatSkirt = mesh(
    'ISLAND_22_PREMIUM_FISHER_COAT_SKIRT',
    new THREE.CylinderGeometry(0.44, 0.51, 0.52, profile.radialSegments),
    materials.coat,
    spinePivot,
  );
  coatSkirt.position.y = 0.13;
  coatSkirt.scale.z = 0.73;
  const shirtFront = mesh(
    'ISLAND_22_PREMIUM_FISHER_SHIRT_FRONT',
    new THREE.SphereGeometry(0.3, profile.sphereSegments, Math.max(6, profile.sphereSegments - 3)),
    materials.shirt,
    spinePivot,
  );
  shirtFront.position.set(0, 0.52, 0.305);
  shirtFront.scale.set(0.58, 0.95, 0.12);
  const belt = mesh(
    'ISLAND_22_PREMIUM_FISHER_BELT',
    new THREE.TorusGeometry(0.4, 0.04, 5, profile.radialSegments + 3),
    materials.leather,
    spinePivot,
  );
  belt.position.y = 0.1;
  belt.rotation.x = Math.PI / 2;
  belt.scale.z = 0.74;
  const buckle = mesh(
    'ISLAND_22_PREMIUM_FISHER_BELT_BUCKLE',
    new THREE.BoxGeometry(0.14, 0.12, 0.055),
    materials.brass,
    spinePivot,
  );
  buckle.position.set(0, 0.1, 0.39);
  const scarf = mesh(
    'ISLAND_22_PREMIUM_FISHER_SCARF',
    new THREE.TorusGeometry(0.3, 0.065, 6, profile.radialSegments + 4),
    materials.scarf,
    spinePivot,
  );
  scarf.position.y = 0.92;
  scarf.rotation.x = Math.PI / 2;
  scarf.scale.z = 0.78;
  const scarfTail = mesh(
    'ISLAND_22_PREMIUM_FISHER_SCARF_TAIL',
    new THREE.ConeGeometry(0.105, 0.38, 4),
    materials.scarf,
    spinePivot,
  );
  scarfTail.position.set(0.16, 0.69, 0.34);
  scarfTail.rotation.z = -0.2;
  scarfTail.scale.z = 0.42;

  if (profile.coatHardware) {
    [-0.17, 0.17].forEach((x) => {
      [0.29, 0.51, 0.72].forEach((y) => {
        const button = mesh(
          `ISLAND_22_PREMIUM_FISHER_COAT_BUTTON_${x}_${y}`,
          new THREE.SphereGeometry(0.035, 7, 5),
          materials.brass,
          spinePivot,
        );
        button.position.set(x, y, 0.4);
        button.scale.z = 0.45;
      });
    });
    const pocket = mesh(
      'ISLAND_22_PREMIUM_FISHER_TACKLE_POCKET',
      new THREE.BoxGeometry(0.22, 0.19, 0.07),
      materials.leather,
      spinePivot,
    );
    pocket.position.set(-0.3, 0.18, 0.35);
    pocket.rotation.z = 0.08;
  }

  const headPivot = namedGroup('ISLAND_22_PREMIUM_FISHER_HEAD_PIVOT');
  headPivot.position.set(0, 1.05, 0);
  spinePivot.add(headPivot);
  const head = mesh(
    'ISLAND_22_PREMIUM_FISHER_HEAD',
    new THREE.SphereGeometry(0.29, profile.sphereSegments, Math.max(7, profile.sphereSegments - 4)),
    materials.skin,
    headPivot,
  );
  head.scale.set(0.92, 1.03, 0.9);
  const nose = mesh(
    'ISLAND_22_PREMIUM_FISHER_NOSE',
    new THREE.ConeGeometry(0.075, 0.17, profile.radialSegments),
    materials.skin,
    headPivot,
  );
  nose.position.set(0, 0.015, 0.27);
  nose.rotation.x = Math.PI / 2;
  const beard = mesh(
    'ISLAND_22_PREMIUM_FISHER_BEARD',
    new THREE.SphereGeometry(0.24, profile.sphereSegments, Math.max(6, profile.sphereSegments - 5)),
    materials.hair,
    headPivot,
  );
  beard.position.set(0, -0.15, 0.13);
  beard.scale.set(1.05, 0.72, 0.82);
  const moustacheLeft = mesh(
    'ISLAND_22_PREMIUM_FISHER_MOUSTACHE_LEFT',
    new THREE.CapsuleGeometry(0.035, 0.12, 2, 6),
    materials.hair,
    headPivot,
  );
  const moustacheRight = moustacheLeft.clone();
  moustacheRight.name = 'ISLAND_22_PREMIUM_FISHER_MOUSTACHE_RIGHT';
  headPivot.add(moustacheRight);
  moustacheLeft.position.set(-0.07, -0.065, 0.288);
  moustacheRight.position.set(0.07, -0.065, 0.288);
  moustacheLeft.rotation.z = Math.PI / 2 + 0.25;
  moustacheRight.rotation.z = Math.PI / 2 - 0.25;
  const smile = mesh(
    'ISLAND_22_PREMIUM_FISHER_SMILE',
    new THREE.TorusGeometry(0.075, 0.012, 5, 12, Math.PI),
    materials.eyeDark,
    headPivot,
  );
  smile.position.set(0, -0.15, 0.303);
  smile.rotation.z = Math.PI;
  const openMouth = mesh(
    'ISLAND_22_PREMIUM_FISHER_OPEN_MOUTH',
    new THREE.SphereGeometry(0.055, 8, 5),
    materials.eyeDark,
    headPivot,
  );
  openMouth.position.set(0, -0.15, 0.303);
  openMouth.scale.set(0.75, 1, 0.3);
  openMouth.visible = false;

  const eyeWhites: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const eyeWhite = mesh(
      `ISLAND_22_PREMIUM_FISHER_EYE_WHITE_${side}`,
      new THREE.SphereGeometry(0.052, 8, 6),
      materials.eyeWhite,
      headPivot,
    );
    eyeWhite.position.set(side * 0.095, 0.09, 0.258);
    eyeWhite.scale.z = 0.58;
    const pupil = mesh(
      `ISLAND_22_PREMIUM_FISHER_PUPIL_${side}`,
      new THREE.SphereGeometry(0.025, 7, 5),
      materials.eyeDark,
      headPivot,
    );
    pupil.position.set(side * 0.095, 0.088, 0.302);
    const brow = mesh(
      `ISLAND_22_PREMIUM_FISHER_BROW_${side}`,
      new THREE.BoxGeometry(0.13, 0.027, 0.025),
      materials.hair,
      headPivot,
    );
    brow.position.set(side * 0.095, 0.165, 0.285);
    brow.rotation.z = side * -0.12;
    const cheek = mesh(
      `ISLAND_22_PREMIUM_FISHER_CHEEK_${side}`,
      new THREE.SphereGeometry(0.068, 7, 5),
      materials.blush,
      headPivot,
    );
    cheek.position.set(side * 0.17, -0.015, 0.24);
    cheek.scale.set(1, 0.72, 0.35);
    eyeWhites.push(eyeWhite);
    pupils.push(pupil);
    brows.push(brow);
  });

  const hatBrim = mesh(
    'ISLAND_22_PREMIUM_FISHER_HAT_BRIM',
    new THREE.CylinderGeometry(0.48, 0.48, 0.065, profile.radialSegments + 4),
    materials.coatEdge,
    headPivot,
  );
  hatBrim.position.y = 0.27;
  hatBrim.scale.z = 0.84;
  const hatCrown = mesh(
    'ISLAND_22_PREMIUM_FISHER_HAT_CROWN',
    new THREE.CylinderGeometry(0.24, 0.33, 0.31, profile.radialSegments + 2),
    materials.coat,
    headPivot,
  );
  hatCrown.position.y = 0.43;
  hatCrown.scale.z = 0.88;
  const hatBand = mesh(
    'ISLAND_22_PREMIUM_FISHER_HAT_BAND',
    new THREE.TorusGeometry(0.31, 0.035, 5, profile.radialSegments + 4),
    materials.leather,
    headPivot,
  );
  hatBand.position.y = 0.31;
  hatBand.rotation.x = Math.PI / 2;
  hatBand.scale.z = 0.86;
  const hatFeather = mesh(
    'ISLAND_22_PREMIUM_FISHER_HAT_FEATHER',
    new THREE.CapsuleGeometry(0.035, 0.28, 2, 7),
    materials.fishFinGold,
    headPivot,
  );
  hatFeather.position.set(0.23, 0.53, 0.04);
  hatFeather.rotation.z = -0.58;
  hatFeather.scale.z = 0.5;

  const leftArm = createArm(spinePivot, 'ISLAND_22_PREMIUM_FISHER_LEFT', -1, materials, profile);
  const rightArm = createArm(spinePivot, 'ISLAND_22_PREMIUM_FISHER_RIGHT', 1, materials, profile);
  const catchHandSocket = addSocket(spinePivot, 'ISLAND_22_PREMIUM_FISHER_CATCH_HAND_SOCKET', [0.48, 0.52, 0.34]);

  const neutral: Island22PremiumFishermanPose = {
    cast: 0,
    pull: 0,
    tension: 0,
    celebrate: 0,
    panic: 0,
    reelTurns: 0,
  };
  const update = (elapsed: number, partialPose: Partial<Island22PremiumFishermanPose>) => {
    const pose = { ...neutral, ...partialPose };
    const cast = THREE.MathUtils.clamp(pose.cast, 0, 1);
    const pull = THREE.MathUtils.clamp(pose.pull, 0, 1);
    const tension = THREE.MathUtils.clamp(pose.tension, 0, 1);
    const celebrate = THREE.MathUtils.clamp(pose.celebrate, 0, 1);
    const panic = THREE.MathUtils.clamp(pose.panic, 0, 1);
    const struggle = Math.sin(elapsed * (5.4 + tension * 3.8)) * tension;
    const bounce = Math.abs(Math.sin(elapsed * 4.6)) * celebrate;
    motionRoot.position.y = bounce * 0.16;
    motionRoot.rotation.z = struggle * 0.025 + Math.sin(elapsed * 11) * panic * 0.035;
    spinePivot.rotation.x = cast * -0.16 + pull * 0.24 + panic * -0.08;
    spinePivot.rotation.z = struggle * -0.045;
    headPivot.rotation.x = pull * -0.12 + celebrate * -0.1;
    headPivot.rotation.y = Math.sin(elapsed * 1.25) * 0.035 + struggle * -0.06 + panic * Math.sin(elapsed * 7.2) * 0.2;
    leftArm.shoulder.rotation.x = -0.72 - cast * 0.52 - pull * 0.72 + celebrate * -1.25;
    rightArm.shoulder.rotation.x = -0.58 - cast * 0.6 - pull * 0.88 + celebrate * -0.82;
    leftArm.shoulder.rotation.z = -0.08 - pull * 0.12 - celebrate * 0.55;
    rightArm.shoulder.rotation.z = 0.1 + pull * 0.16 + celebrate * 0.75;
    leftArm.elbow.rotation.x = 0.48 - cast * 0.25 + pull * 0.7;
    rightArm.elbow.rotation.x = 0.36 - cast * 0.18 + pull * 0.84 + pose.reelTurns * 0.04;
    leftHip.rotation.x = pull * 0.18 + panic * Math.sin(elapsed * 12) * 0.12;
    rightHip.rotation.x = pull * -0.13 - panic * Math.sin(elapsed * 12) * 0.12;
    const blink = elapsed % 4.7 < 0.13 ? 0.12 : 1;
    eyeWhites.forEach((eye) => { eye.scale.y = blink; });
    pupils.forEach((pupil) => { pupil.scale.y = blink; });
    brows[0].rotation.z = -0.12 - tension * 0.28 + celebrate * 0.2;
    brows[1].rotation.z = 0.12 + tension * 0.28 - celebrate * 0.2;
    moustacheLeft.rotation.z = Math.PI / 2 + 0.25 + celebrate * 0.25;
    moustacheRight.rotation.z = Math.PI / 2 - 0.25 - celebrate * 0.25;
    smile.visible = panic < 0.25;
    smile.scale.setScalar(1 + celebrate * 0.35);
    openMouth.visible = panic >= 0.25;
    scarfTail.rotation.z = -0.2 + Math.sin(elapsed * 3.4) * 0.07 + pull * 0.12;
    hatFeather.rotation.z = -0.58 + Math.sin(elapsed * 2.8) * 0.06;
  };

  return {
    root,
    motionRoot,
    spinePivot,
    headPivot,
    leftShoulderPivot: leftArm.shoulder,
    rightShoulderPivot: rightArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightElbowPivot: rightArm.elbow,
    rodHandSocket: rightArm.socket,
    reelHandSocket: leftArm.socket,
    catchHandSocket,
    update,
  };
}

export interface Island22PremiumFishingRigUpdate {
  base: THREE.Vector3;
  control: THREE.Vector3;
  tip: THREE.Vector3;
  bobber: THREE.Vector3;
  hook?: THREE.Vector3;
  tension: number;
  reelTurns: number;
  elapsed: number;
  visible?: boolean;
}

export interface Island22PremiumFishingRig {
  root: THREE.Group;
  rodRoot: THREE.Group;
  reelRoot: THREE.Group;
  bobberRoot: THREE.Group;
  hookRoot: THREE.Group;
  update: (state: Island22PremiumFishingRigUpdate) => void;
}

function quadraticPoint(target: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number) {
  const inverse = 1 - t;
  target.set(0, 0, 0)
    .addScaledVector(a, inverse * inverse)
    .addScaledVector(b, 2 * inverse * t)
    .addScaledVector(c, t * t);
  return target;
}

export function createIsland22PremiumFishingRig(
  quality: Island22PremiumFishingQuality = 'medium',
  sharedMaterials?: Island22PremiumFishingMaterials,
): Island22PremiumFishingRig {
  const profile = ISLAND_22_PREMIUM_FISHING_DETAIL[quality];
  const materials = sharedMaterials ?? createIsland22PremiumFishingMaterials();
  const root = namedGroup('ISLAND_22_PREMIUM_FISHING_RIG_ROOT');
  root.userData.island22PremiumFishing = {
    partId: 'p23-fishing-rod-reel-line-bobber-hook-and-tension-rig',
    quality,
    externalTransformOwner: true,
  };
  const rodRoot = namedGroup('ISLAND_22_PREMIUM_FISHING_ROD_ROOT');
  const reelRoot = namedGroup('ISLAND_22_PREMIUM_FISHING_REEL_ROOT');
  const bobberRoot = namedGroup('ISLAND_22_PREMIUM_FISHING_BOBBER_ROOT');
  const hookRoot = namedGroup('ISLAND_22_PREMIUM_FISHING_HOOK_ROOT');
  const lineRoot = namedGroup('ISLAND_22_PREMIUM_FISHING_LINE_ROOT');
  root.add(rodRoot, reelRoot, bobberRoot, hookRoot, lineRoot);

  const rodGeometry = new THREE.CylinderGeometry(0.022, 0.031, 1, profile.radialSegments);
  const rodSegments = Array.from({ length: profile.rodSegments }, (_, index) => {
    const segment = mesh(`ISLAND_22_PREMIUM_FISHING_ROD_SEGMENT_${index + 1}`, rodGeometry, materials.rod, rodRoot);
    if (index >= profile.rodSegments - 2) segment.scale.x = segment.scale.z = 0.72;
    return segment;
  });
  const grip = mesh(
    'ISLAND_22_PREMIUM_FISHING_ROD_GRIP',
    new THREE.CylinderGeometry(0.052, 0.058, 0.42, profile.radialSegments),
    materials.leather,
    rodRoot,
  );
  const buttCap = mesh(
    'ISLAND_22_PREMIUM_FISHING_ROD_BUTT_CAP',
    new THREE.SphereGeometry(0.065, 8, 5),
    materials.brass,
    rodRoot,
  );
  const reelSpool = mesh(
    'ISLAND_22_PREMIUM_FISHING_REEL_SPOOL',
    new THREE.CylinderGeometry(0.13, 0.13, 0.13, profile.radialSegments + 2),
    materials.brass,
    reelRoot,
  );
  reelSpool.rotation.z = Math.PI / 2;
  const reelHub = mesh(
    'ISLAND_22_PREMIUM_FISHING_REEL_HUB',
    new THREE.CylinderGeometry(0.052, 0.052, 0.2, profile.radialSegments),
    materials.leatherDark,
    reelRoot,
  );
  reelHub.rotation.z = Math.PI / 2;
  const reelCrankPivot = namedGroup('ISLAND_22_PREMIUM_FISHING_REEL_CRANK_PIVOT');
  reelRoot.add(reelCrankPivot);
  const reelCrank = mesh(
    'ISLAND_22_PREMIUM_FISHING_REEL_CRANK',
    new THREE.BoxGeometry(0.04, 0.22, 0.04),
    materials.leatherDark,
    reelCrankPivot,
  );
  reelCrank.position.y = 0.09;
  const reelHandle = mesh(
    'ISLAND_22_PREMIUM_FISHING_REEL_HANDLE',
    new THREE.SphereGeometry(0.055, 8, 5),
    materials.leather,
    reelCrankPivot,
  );
  reelHandle.position.y = 0.22;

  const bobberTop = mesh(
    'ISLAND_22_PREMIUM_FISHING_BOBBER_RED',
    new THREE.SphereGeometry(0.105, profile.sphereSegments, Math.max(6, profile.sphereSegments - 4), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.bobberRed,
    bobberRoot,
  );
  const bobberBottom = mesh(
    'ISLAND_22_PREMIUM_FISHING_BOBBER_IVORY',
    new THREE.SphereGeometry(0.105, profile.sphereSegments, Math.max(6, profile.sphereSegments - 4), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    materials.bobberIvory,
    bobberRoot,
  );
  bobberTop.position.y = 0.002;
  bobberBottom.position.y = -0.002;
  const bobberStem = mesh(
    'ISLAND_22_PREMIUM_FISHING_BOBBER_STEM',
    new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6),
    materials.brass,
    bobberRoot,
  );
  bobberStem.position.y = 0.11;
  const hook = mesh(
    'ISLAND_22_PREMIUM_FISHING_HOOK',
    new THREE.TorusGeometry(0.058, 0.012, 5, 14, Math.PI * 1.45),
    materials.brass,
    hookRoot,
  );
  hook.rotation.z = -0.35;

  const lineGeometry = new THREE.CylinderGeometry(
    quality === 'low' ? 0.016 : 0.012,
    quality === 'low' ? 0.016 : 0.012,
    1,
    quality === 'high' ? 5 : 4,
  );
  const lineSegments = Array.from({ length: profile.lineSegments }, (_, index) => {
    const segment = mesh(`ISLAND_22_PREMIUM_FISHING_LINE_SEGMENT_${index + 1}`, lineGeometry, materials.line, lineRoot);
    segment.frustumCulled = false;
    return segment;
  });
  const rodPoints = Array.from({ length: profile.rodSegments + 1 }, () => new THREE.Vector3());
  const linePoints = Array.from({ length: profile.lineSegments + 1 }, () => new THREE.Vector3());
  const direction = new THREE.Vector3();

  const update = (state: Island22PremiumFishingRigUpdate) => {
    root.visible = state.visible ?? true;
    if (!root.visible) return;
    const tension = THREE.MathUtils.clamp(state.tension, 0, 1);
    const pullDirection = SCRATCH_A.subVectors(state.bobber, state.tip).normalize();
    const bendControl = SCRATCH_B.copy(state.control).addScaledVector(pullDirection, tension * 0.28);
    for (let index = 0; index < rodPoints.length; index += 1) {
      quadraticPoint(rodPoints[index], state.base, bendControl, state.tip, index / (rodPoints.length - 1));
    }
    rodSegments.forEach((segment, index) => {
      cylinderBetween(segment, rodPoints[index], rodPoints[index + 1], direction);
    });
    cylinderBetween(grip, state.base, SCRATCH_C.copy(state.base).lerp(rodPoints[1], 0.62), direction);
    buttCap.position.copy(state.base);
    reelRoot.position.copy(state.base).lerp(rodPoints[1], 0.34);
    reelRoot.quaternion.setFromUnitVectors(UP, direction.subVectors(rodPoints[1], state.base).normalize());
    reelCrankPivot.rotation.x = state.reelTurns * Math.PI * 2;
    bobberRoot.position.copy(state.bobber);
    bobberRoot.rotation.z = Math.sin(state.elapsed * 4.2) * 0.055 * (1 - tension);
    const hookPoint = state.hook ?? SCRATCH_C.copy(state.bobber).add(new THREE.Vector3(0, -0.28, 0));
    hookRoot.position.copy(hookPoint);
    hookRoot.visible = Boolean(state.hook);
    const sag = THREE.MathUtils.lerp(0.42, 0.035, tension);
    const lineControl = SCRATCH_A.copy(state.tip).lerp(hookPoint, 0.52);
    lineControl.y -= sag;
    for (let index = 0; index < linePoints.length; index += 1) {
      quadraticPoint(linePoints[index], state.tip, lineControl, hookPoint, index / (linePoints.length - 1));
    }
    lineSegments.forEach((segment, index) => {
      cylinderBetween(segment, linePoints[index], linePoints[index + 1], direction);
    });
  };

  return { root, rodRoot, reelRoot, bobberRoot, hookRoot, update };
}

interface FishSpec {
  label: string;
  nominalKg: number;
  length: number;
  height: number;
  depth: number;
  headScale: readonly [number, number, number];
  headX: number;
  bodyMaterial: keyof Pick<Island22PremiumFishingMaterials, 'fishGold' | 'fishSilver' | 'fishTeal' | 'fishDeepTeal'>;
  finMaterial: keyof Pick<Island22PremiumFishingMaterials, 'fishFinGold' | 'fishFinTeal'>;
  tailFork: number;
  dorsalHeight: number;
  eyeScale: number;
  mouthScale: number;
  scaleDensity: number;
  subtype: 'sprat' | 'mackerel' | 'cod' | 'grouper';
}

const FISH_SPECS: Record<Island22PremiumCatchKind, FishSpec> = {
  small: {
    label: 'Sunscale harbour sprat', nominalKg: 3, length: 0.82, height: 0.22, depth: 0.17,
    headScale: [0.18, 0.17, 0.15], headX: 0.3, bodyMaterial: 'fishGold', finMaterial: 'fishFinGold',
    tailFork: 0.18, dorsalHeight: 0.12, eyeScale: 0.027, mouthScale: 0.034, scaleDensity: 0.6, subtype: 'sprat',
  },
  medium: {
    label: 'Blueback village mackerel', nominalKg: 9, length: 1.14, height: 0.34, depth: 0.25,
    headScale: [0.25, 0.24, 0.22], headX: 0.42, bodyMaterial: 'fishSilver', finMaterial: 'fishFinGold',
    tailFork: 0.27, dorsalHeight: 0.2, eyeScale: 0.036, mouthScale: 0.05, scaleDensity: 0.9, subtype: 'mackerel',
  },
  large: {
    label: 'Lantern-belly sea cod', nominalKg: 22, length: 1.48, height: 0.52, depth: 0.37,
    headScale: [0.38, 0.38, 0.34], headX: 0.52, bodyMaterial: 'fishGold', finMaterial: 'fishFinGold',
    tailFork: 0.34, dorsalHeight: 0.28, eyeScale: 0.05, mouthScale: 0.075, scaleDensity: 1, subtype: 'cod',
  },
  colossal: {
    label: 'Old King teal grouper', nominalKg: 40, length: 2.08, height: 0.83, depth: 0.58,
    headScale: [0.65, 0.61, 0.55], headX: 0.67, bodyMaterial: 'fishTeal', finMaterial: 'fishFinTeal',
    tailFork: 0.48, dorsalHeight: 0.42, eyeScale: 0.082, mouthScale: 0.13, scaleDensity: 1.15, subtype: 'grouper',
  },
};

function finShape(length: number, height: number, rounded = false) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  if (rounded) {
    shape.bezierCurveTo(length * 0.22, height * 0.8, length * 0.76, height, length, height * 0.45);
    shape.bezierCurveTo(length * 0.78, height * 0.12, length * 0.25, 0.02, 0, 0);
  } else {
    shape.bezierCurveTo(length * 0.3, height * 0.95, length * 0.68, height, length, height * 0.15);
    shape.bezierCurveTo(length * 0.55, height * 0.03, length * 0.2, 0.02, 0, 0);
  }
  return shape;
}

function extrudedFinGeometry(length: number, height: number, quality: Island22PremiumFishingQuality, rounded = false) {
  return new THREE.ExtrudeGeometry(finShape(length, height, rounded), {
    depth: quality === 'high' ? 0.034 : 0.045,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: quality === 'high' ? 8 : quality === 'medium' ? 5 : 3,
  });
}

export interface Island22PremiumCatchFishAnimation {
  struggle: number;
  lift: number;
  celebrate: number;
}

export interface Island22PremiumCatchFish {
  kind: Island22PremiumCatchKind;
  root: THREE.Group;
  motionRoot: THREE.Group;
  tailPivot: THREE.Group;
  nearPectoralPivot: THREE.Group;
  farPectoralPivot: THREE.Group;
  jawPivot: THREE.Group;
  gillPivot: THREE.Group;
  hookSocket: THREE.Group;
  nominalKg: number;
  animate: (elapsed: number, state: Partial<Island22PremiumCatchFishAnimation>) => void;
}

function addFishScales(
  parent: THREE.Group,
  spec: FishSpec,
  profile: Island22PremiumFishingDetailProfile,
  quality: Island22PremiumFishingQuality,
  materials: Island22PremiumFishingMaterials,
) {
  const columns = Math.max(2, Math.round(profile.scaleColumns * spec.scaleDensity));
  const rows = profile.scaleRows;
  const count = columns * rows;
  const scaleGeometry = new THREE.CircleGeometry(spec.height * 0.07, quality === 'high' ? 8 : 6);
  const scaleMaterial = materials.fishMarking.clone();
  scaleMaterial.transparent = true;
  scaleMaterial.opacity = spec.subtype === 'grouper' ? 0.34 : 0.24;
  const near = new THREE.InstancedMesh(scaleGeometry, scaleMaterial, count);
  const far = new THREE.InstancedMesh(scaleGeometry, scaleMaterial, count);
  near.name = `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_NEAR_SCALES`;
  far.name = `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_FAR_SCALES`;
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    const y = THREE.MathUtils.lerp(-spec.height * 0.22, spec.height * 0.25, rows === 1 ? 0.5 : row / (rows - 1));
    for (let column = 0; column < columns; column += 1) {
      const x = THREE.MathUtils.lerp(-spec.length * 0.3, spec.length * 0.25, columns === 1 ? 0.5 : column / (columns - 1));
      const normalizedX = x / (spec.length * 0.52);
      const normalizedY = y / (spec.height * 0.56);
      const edge = Math.max(0.3, Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX - normalizedY * normalizedY)));
      const z = spec.depth * 0.5 * edge;
      const scale = 0.82 + (column % 2) * 0.12;
      matrix.compose(
        new THREE.Vector3(x + (row % 2) * spec.length * 0.018, y, z),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale * 0.82, 1),
      );
      near.setMatrixAt(index, matrix);
      matrix.compose(
        new THREE.Vector3(x + (row % 2) * spec.length * 0.018, y, -z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
        new THREE.Vector3(scale, scale * 0.82, 1),
      );
      far.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  near.instanceMatrix.needsUpdate = true;
  far.instanceMatrix.needsUpdate = true;
  near.castShadow = far.castShadow = false;
  parent.add(near, far);
}

function addFinRays(
  fin: THREE.Mesh,
  name: string,
  count: number,
  length: number,
  height: number,
  materials: Island22PremiumFishingMaterials,
) {
  const rayGeometry = new THREE.CylinderGeometry(0.006, 0.009, 1, 4);
  for (let index = 1; index <= count; index += 1) {
    const t = index / (count + 1);
    const ray = mesh(`${name}_RAY_${index}`, rayGeometry, materials.fishMarking, fin);
    const start = SCRATCH_A.set(length * t * 0.9, 0.02, 0.045);
    const end = SCRATCH_B.set(length * t, height * (1 - t * 0.45), 0.045);
    cylinderBetween(ray, start, end, SCRATCH_C);
  }
}

export function createIsland22PremiumCatchFish(
  kind: Island22PremiumCatchKind,
  quality: Island22PremiumFishingQuality = 'medium',
  sharedMaterials?: Island22PremiumFishingMaterials,
): Island22PremiumCatchFish {
  const profile = ISLAND_22_PREMIUM_FISHING_DETAIL[quality];
  const materials = sharedMaterials ?? createIsland22PremiumFishingMaterials();
  const spec = FISH_SPECS[kind];
  const bodyMaterial = materials[spec.bodyMaterial];
  const finMaterial = materials[spec.finMaterial];
  const root = namedGroup(`ISLAND_22_PREMIUM_CATCH_${kind.toUpperCase()}_ROOT`);
  root.userData.island22PremiumFishing = {
    partId: 'p24-small-medium-large-and-colossal-catch-fish-family',
    catchKind: kind,
    species: spec.label,
    nominalKg: spec.nominalKg,
    quality,
    externalTransformOwner: true,
  };
  const motionRoot = namedGroup(`ISLAND_22_PREMIUM_CATCH_${kind.toUpperCase()}_MOTION_ROOT`);
  root.add(motionRoot);

  const body = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_BODY`,
    new THREE.SphereGeometry(0.5, profile.sphereSegments + 2, Math.max(7, profile.sphereSegments - 3)),
    bodyMaterial,
    motionRoot,
  );
  body.scale.set(spec.length * 0.82, spec.height, spec.depth);
  body.position.x = -spec.length * (spec.subtype === 'grouper' ? 0.08 : 0.04);
  if (spec.subtype === 'sprat') body.scale.y *= 0.78;
  if (spec.subtype === 'cod') body.scale.y *= 1.08;

  const belly = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_BELLY`,
    new THREE.SphereGeometry(0.505, profile.sphereSegments, Math.max(7, profile.sphereSegments - 4), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    materials.fishBelly,
    motionRoot,
  );
  belly.scale.set(spec.length * 0.78, spec.height * (spec.subtype === 'cod' ? 1.02 : 0.94), spec.depth * 0.96);
  belly.position.set(body.position.x + spec.length * 0.01, -spec.height * 0.02, 0);

  const head = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_HEAD`,
    new THREE.SphereGeometry(0.5, profile.sphereSegments + 2, Math.max(7, profile.sphereSegments - 3)),
    bodyMaterial,
    motionRoot,
  );
  head.scale.set(...spec.headScale);
  head.position.x = spec.headX;
  if (spec.subtype === 'mackerel') head.rotation.z = -0.06;
  if (spec.subtype === 'grouper') head.position.y = spec.height * 0.06;

  const tailPivot = namedGroup(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_TAIL_PIVOT`);
  tailPivot.position.x = -spec.length * 0.48;
  motionRoot.add(tailPivot);
  const tailUpper = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_TAIL_UPPER`,
    extrudedFinGeometry(spec.tailFork, spec.tailFork * (spec.subtype === 'grouper' ? 0.72 : 1), quality, spec.subtype === 'grouper'),
    finMaterial,
    tailPivot,
  );
  tailUpper.rotation.z = Math.PI;
  tailUpper.position.z = -0.02;
  const tailLower = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_TAIL_LOWER`,
    extrudedFinGeometry(spec.tailFork, -spec.tailFork * (spec.subtype === 'grouper' ? 0.72 : 1), quality, spec.subtype === 'grouper'),
    finMaterial,
    tailPivot,
  );
  tailLower.rotation.z = Math.PI;
  tailLower.position.z = -0.02;

  const dorsal = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_DORSAL_FIN`,
    extrudedFinGeometry(spec.length * (spec.subtype === 'grouper' ? 0.48 : 0.34), spec.dorsalHeight, quality, spec.subtype === 'cod'),
    finMaterial,
    motionRoot,
  );
  dorsal.position.set(-spec.length * 0.2, spec.height * (spec.subtype === 'sprat' ? 0.35 : 0.45), -0.02);
  if (profile.fishFinRays) {
    addFinRays(dorsal, `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_DORSAL`, spec.subtype === 'grouper' ? 7 : 5, spec.length * 0.3, spec.dorsalHeight, materials);
  }

  const nearPectoralPivot = namedGroup(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_PECTORAL_NEAR_PIVOT`);
  const farPectoralPivot = namedGroup(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_PECTORAL_FAR_PIVOT`);
  nearPectoralPivot.position.set(spec.headX - spec.headScale[0] * 0.75, -spec.height * 0.02, spec.depth * 0.42);
  farPectoralPivot.position.set(spec.headX - spec.headScale[0] * 0.75, -spec.height * 0.02, -spec.depth * 0.42);
  motionRoot.add(nearPectoralPivot, farPectoralPivot);
  const pectoralGeometry = extrudedFinGeometry(spec.length * 0.24, spec.height * 0.46, quality, spec.subtype === 'cod' || spec.subtype === 'grouper');
  const nearPectoral = mesh(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_PECTORAL_NEAR`, pectoralGeometry, finMaterial, nearPectoralPivot);
  const farPectoral = mesh(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_PECTORAL_FAR`, pectoralGeometry, finMaterial, farPectoralPivot);
  nearPectoral.rotation.set(0.2, 0.1, -0.55);
  farPectoral.rotation.set(-0.2, Math.PI, 0.55);

  const gillPivot = namedGroup(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_GILL_PIVOT`);
  gillPivot.position.x = spec.headX - spec.headScale[0] * 0.48;
  motionRoot.add(gillPivot);
  [-1, 1].forEach((side) => {
    const gill = mesh(
      `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_GILL_${side}`,
      new THREE.TorusGeometry(spec.height * 0.23, Math.max(0.009, spec.height * 0.027), 5, profile.radialSegments + 3, Math.PI * 1.28),
      materials.fishMarking,
      gillPivot,
    );
    gill.position.z = side * spec.depth * 0.48;
    gill.rotation.set(0, side < 0 ? Math.PI : 0, -0.5);
  });

  const eyeWhiteMaterial = materials.eyeWhite;
  [-1, 1].forEach((side) => {
    const eyeWhite = mesh(
      `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_EYE_WHITE_${side}`,
      new THREE.SphereGeometry(spec.eyeScale, 8, 6),
      eyeWhiteMaterial,
      motionRoot,
    );
    eyeWhite.position.set(spec.headX + spec.headScale[0] * 0.46, spec.height * 0.16, side * spec.headScale[2] * 0.82);
    const pupil = mesh(
      `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_PUPIL_${side}`,
      new THREE.SphereGeometry(spec.eyeScale * 0.46, 7, 5),
      materials.eyeDark,
      motionRoot,
    );
    pupil.position.copy(eyeWhite.position);
    pupil.position.x += spec.eyeScale * 0.48;
    pupil.position.z += side * spec.eyeScale * 0.28;
  });

  const jawPivot = namedGroup(`ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_JAW_PIVOT`);
  jawPivot.position.set(spec.headX + spec.headScale[0] * 0.72, -spec.height * 0.08, 0);
  motionRoot.add(jawPivot);
  const mouth = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_MOUTH`,
    new THREE.TorusGeometry(spec.mouthScale, Math.max(0.009, spec.mouthScale * 0.2), 5, profile.radialSegments + 3, Math.PI),
    materials.fishMarking,
    jawPivot,
  );
  mouth.rotation.set(0, Math.PI / 2, Math.PI / 2);
  if (spec.subtype === 'grouper') mouth.scale.set(1.2, 1.55, 1);
  if (spec.subtype === 'cod') {
    const chinBarbel = mesh(
      'ISLAND_22_PREMIUM_COD_CHIN_BARBEL',
      new THREE.CapsuleGeometry(0.012, 0.11, 2, 5),
      materials.fishMarking,
      jawPivot,
    );
    chinBarbel.position.set(-0.025, -0.1, 0);
    chinBarbel.rotation.z = 0.18;
  }

  if (spec.subtype === 'mackerel') {
    [-0.34, -0.19, -0.04, 0.11].forEach((x, index) => {
      const stripe = mesh(
        `ISLAND_22_PREMIUM_MACKEREL_STRIPE_${index + 1}`,
        new THREE.TorusGeometry(spec.height * (0.42 - index * 0.025), 0.015, 5, profile.radialSegments + 3, Math.PI * 1.15),
        materials.fishMarking,
        motionRoot,
      );
      stripe.position.x = x;
      stripe.rotation.set(Math.PI / 2, 0, -0.55);
    });
  }
  if (spec.subtype === 'grouper') {
    const brow = mesh(
      'ISLAND_22_PREMIUM_GROUPER_BROW_RIDGE',
      new THREE.CapsuleGeometry(0.055, 0.34, 2, profile.radialSegments),
      materials.fishDeepTeal,
      motionRoot,
    );
    brow.position.set(spec.headX + 0.1, spec.height * 0.29, 0);
    brow.rotation.z = Math.PI / 2;
    brow.scale.z = 0.8;
  }

  addFishScales(motionRoot, spec, profile, quality, materials);
  const highlight = mesh(
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_WET_HIGHLIGHT`,
    new THREE.SphereGeometry(0.08, 8, 5),
    materials.wetHighlight,
    motionRoot,
  );
  highlight.position.set(-spec.length * 0.08, spec.height * 0.32, spec.depth * 0.43);
  highlight.scale.set(spec.length * 1.6, 0.22, 0.16);
  highlight.castShadow = false;
  const hookSocket = addSocket(
    motionRoot,
    `ISLAND_22_PREMIUM_${spec.subtype.toUpperCase()}_HOOK_SOCKET`,
    [spec.headX + spec.headScale[0] * 0.82, -spec.height * 0.08, 0],
  );

  const neutral: Island22PremiumCatchFishAnimation = { struggle: 0, lift: 0, celebrate: 0 };
  const animate = (elapsed: number, partial: Partial<Island22PremiumCatchFishAnimation>) => {
    const state = { ...neutral, ...partial };
    const struggle = THREE.MathUtils.clamp(state.struggle, 0, 1);
    const lift = THREE.MathUtils.clamp(state.lift, 0, 1);
    const celebrate = THREE.MathUtils.clamp(state.celebrate, 0, 1);
    const cadence = spec.subtype === 'sprat' ? 12.8 : spec.subtype === 'grouper' ? 6.6 : 9.2;
    motionRoot.rotation.z = Math.sin(elapsed * cadence) * 0.18 * struggle + Math.sin(elapsed * 3.2) * 0.05 * celebrate;
    motionRoot.rotation.x = Math.cos(elapsed * cadence * 0.7) * 0.09 * struggle;
    motionRoot.position.y = Math.sin(elapsed * 5.1) * 0.025 * lift;
    tailPivot.rotation.y = Math.sin(elapsed * cadence * 1.35) * (0.24 + struggle * 0.58);
    nearPectoralPivot.rotation.x = Math.sin(elapsed * cadence * 0.82) * 0.22 * (0.3 + struggle);
    farPectoralPivot.rotation.x = -nearPectoralPivot.rotation.x;
    jawPivot.rotation.z = -0.06 - Math.abs(Math.sin(elapsed * cadence * 0.42)) * 0.13 * struggle;
    gillPivot.scale.y = 1 + Math.sin(elapsed * 4.8) * 0.055 * (0.3 + struggle);
    dorsal.rotation.z = Math.sin(elapsed * cadence * 0.55) * 0.05 * struggle;
  };

  return {
    kind,
    root,
    motionRoot,
    tailPivot,
    nearPectoralPivot,
    farPectoralPivot,
    jawPivot,
    gillPivot,
    hookSocket,
    nominalKg: spec.nominalKg,
    animate,
  };
}

export interface Island22PremiumFishingActors {
  root: THREE.Group;
  fisherman: Island22PremiumFisherman;
  rig: Island22PremiumFishingRig;
  catches: Record<Island22PremiumCatchKind, Island22PremiumCatchFish>;
  setCatchKind: (kind: Island22PremiumCatchKind | null) => void;
}

export function createIsland22PremiumFishingActors(
  quality: Island22PremiumFishingQuality = 'medium',
): Island22PremiumFishingActors {
  const materials = createIsland22PremiumFishingMaterials();
  const root = namedGroup('ISLAND_22_PREMIUM_FISHING_ACTORS_ROOT');
  root.userData.island22PremiumFishing = {
    partIds: ['p22-hero-fisher-character-costume-face-and-body', 'p23-fishing-rig', 'p24-catch-family'],
    quality,
    sourceReferenceSha256: '37ef7edb1c106a6e4407adce5a936dd395d8e7b885d55200814497e2975552ae',
    presentationOnly: true,
  };
  const fisherman = createIsland22PremiumFisherman(quality, materials);
  const rig = createIsland22PremiumFishingRig(quality, materials);
  const catches = {
    small: createIsland22PremiumCatchFish('small', quality, materials),
    medium: createIsland22PremiumCatchFish('medium', quality, materials),
    large: createIsland22PremiumCatchFish('large', quality, materials),
    colossal: createIsland22PremiumCatchFish('colossal', quality, materials),
  };
  root.add(fisherman.root, rig.root, ...Object.values(catches).map((catchFish) => catchFish.root));
  const setCatchKind = (activeKind: Island22PremiumCatchKind | null) => {
    (Object.entries(catches) as [Island22PremiumCatchKind, Island22PremiumCatchFish][]).forEach(([kind, catchFish]) => {
      catchFish.root.visible = kind === activeKind;
    });
  };
  setCatchKind(null);
  return { root, fisherman, rig, catches, setCatchKind };
}

export function disposeIsland22PremiumFishingActors(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
