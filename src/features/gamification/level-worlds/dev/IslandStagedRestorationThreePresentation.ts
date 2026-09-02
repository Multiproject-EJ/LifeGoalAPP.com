import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

export interface IslandStagedRestorationPresentation {
  islandNumber: 4 | 6 | 7 | 8 | 9 | 18;
  activatedStages: number;
  stageCount: number;
  constructionSequence?: number;
  claimedPickupTileIndices?: readonly number[];
}

export interface IslandStagedRestorationThreeRuntime {
  root: THREE.Group;
  missionHitTarget: THREE.Object3D;
  update: (presentation: IslandStagedRestorationPresentation, immediate?: boolean) => void;
  animate: (elapsed: number, reducedMotion: boolean) => void;
}

type Palette = { primary: number; secondary: number; glow: number; dark: number };

const PALETTES: Record<4 | 6 | 7 | 8 | 9 | 18, Palette> = {
  4: { primary: 0xf5d083, secondary: 0xb88340, glow: 0xffe9a3, dark: 0x382716 },
  6: { primary: 0xdad8ff, secondary: 0x7d70df, glow: 0xb9f4ff, dark: 0x171237 },
  7: { primary: 0x8df4ff, secondary: 0x3aa8cc, glow: 0xd5ffff, dark: 0x082a3a },
  8: { primary: 0xff8fda, secondary: 0x71d276, glow: 0xfff0a8, dark: 0x17361c },
  9: { primary: 0xffa126, secondary: 0xb83d18, glow: 0xffee8a, dark: 0x341008 },
  18: { primary: 0x6e8466, secondary: 0xb78b35, glow: 0x54f5a0, dark: 0x172c20 },
};

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function makeRobot(materials: { metal: THREE.Material; glow: THREE.Material }, index: number) {
  const root = new THREE.Group();
  root.name = `ISLAND_MISSION_CONSTRUCTION_ROBOT_${index + 1}`;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.17, 3, 7), materials.metal);
  body.position.y = 0.23;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), materials.glow);
  eye.position.set(0, 0.34, 0.105);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), materials.metal);
  arm.position.set(0.14, 0.24, 0);
  arm.rotation.z = -0.62;
  root.add(body, eye, arm);
  return root;
}

function createCausewayStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angles = [-0.78, 0, 0.78];
  const angle = angles[index] ?? 0;
  const start = new THREE.Vector3(Math.sin(angle) * 2.45, 0.52, Math.cos(angle) * 2.45);
  const end = new THREE.Vector3(Math.sin(angle) * 5.25, 0.62, Math.cos(angle) * 5.25);
  const deck = cylinderBetween(start, end, 0.34, materials.primary);
  deck.scale.z = 0.52;
  group.add(deck);
  for (let stone = -2; stone <= 2; stone += 1) {
    const t = (stone + 2) / 4;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.72), materials.secondary);
    block.position.lerpVectors(start, end, t);
    block.rotation.y = angle;
    group.add(block);
  }
  return group;
}

function createMoonMirrorStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angle = index / 5 * Math.PI * 2;
  const position = new THREE.Vector3(Math.sin(angle) * 4.35, 1.25, Math.cos(angle) * 4.35);
  const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 18), materials.primary);
  mirror.rotation.x = Math.PI / 2;
  mirror.rotation.z = -angle;
  mirror.position.copy(position);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.07, 7, 20), materials.secondary);
  rim.position.copy(position);
  rim.rotation.y = angle;
  const beam = cylinderBetween(position, new THREE.Vector3(0, 2.2, 0), 0.035, materials.glow);
  group.add(mirror, rim, beam);
  return group;
}

function createBreathlineStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
  const start = new THREE.Vector3(0, 0.48, 0);
  const end = new THREE.Vector3(Math.sin(angle) * 5.1, 0.72, Math.cos(angle) * 5.1);
  const pipe = cylinderBetween(start, end, 0.12, materials.secondary);
  group.add(pipe);
  for (let bubbleIndex = 0; bubbleIndex < 7; bubbleIndex += 1) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.09 + bubbleIndex % 2 * 0.035, 8, 6), materials.glow);
    bubble.position.lerpVectors(start, end, (bubbleIndex + 1) / 8);
    bubble.userData.bubblePhase = bubbleIndex * 0.8 + index;
    group.add(bubble);
  }
  return group;
}

function createPollinationStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angle = index / 5 * Math.PI * 2;
  const centre = new THREE.Vector3(Math.sin(angle) * 4.2, 0.75, Math.cos(angle) * 4.2);
  const petalMaterial = index % 2 === 0 ? materials.primary : materials.secondary;
  for (let petal = 0; petal < 7; petal += 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 6), petalMaterial);
    const petalAngle = petal / 7 * Math.PI * 2;
    mesh.scale.set(0.72, 0.25, 1.38);
    mesh.position.copy(centre).add(new THREE.Vector3(Math.sin(petalAngle) * 0.48, 0.06, Math.cos(petalAngle) * 0.48));
    mesh.rotation.y = petalAngle;
    group.add(mesh);
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 7), materials.glow);
  heart.position.copy(centre).add(new THREE.Vector3(0, 0.12, 0));
  group.add(heart);
  return group;
}

function createIgnitionStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angle = index / 8 * Math.PI * 2;
  const position = new THREE.Vector3(Math.sin(angle) * (3.4 + index % 2 * 1.1), 0.8, Math.cos(angle) * (3.4 + index % 2 * 1.1));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.12, 8, 16), materials.secondary);
  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), materials.glow);
  core.position.copy(position);
  const link = cylinderBetween(position, new THREE.Vector3(0, 1.35, 0), 0.045, materials.glow);
  group.add(ring, core, link);
  return group;
}

function createLivingCompassStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const angle = index / 5 * Math.PI * 2 - Math.PI / 2;
  const radius = index === 4 ? 2.1 : 4.55;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.24, 7), materials.dark);
  base.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 22), materials.secondary);
  ring.position.copy(base.position).add(new THREE.Vector3(0, 0.58, 0));
  ring.rotation.y = -angle;
  const glyph = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.055, 6), materials.glow);
  glyph.position.copy(ring.position);
  glyph.rotation.x = Math.PI / 2;
  glyph.rotation.z = angle;
  group.add(base, ring, glyph);
  return group;
}

export function createIslandStagedRestorationThreePresentation(options: {
  islandNumber: 4 | 6 | 7 | 8 | 9 | 18;
  stageCount: number;
  quality: Island3DQuality;
}): IslandStagedRestorationThreeRuntime {
  const palette = PALETTES[options.islandNumber];
  const root = new THREE.Group();
  root.name = `ISLAND_${options.islandNumber}_STAGED_RESTORATION_PRESENTATION`;
  root.userData.presentationOnly = true;
  const materials = {
    primary: new THREE.MeshPhysicalMaterial({ color: palette.primary, roughness: 0.22, metalness: 0.38, clearcoat: 0.72, clearcoatRoughness: 0.16 }),
    secondary: new THREE.MeshStandardMaterial({ color: palette.secondary, roughness: 0.38, metalness: 0.48, emissive: palette.dark, emissiveIntensity: 0.25 }),
    glow: new THREE.MeshBasicMaterial({ color: palette.glow, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }),
    dark: new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 0.44, metalness: 0.58 }),
  };
  // Island 018 owns its complete stage/finale sculpture inside the authored
  // Jungle Expedition world. Retain this runtime only as the canonical mission
  // hit target so the generic markers do not duplicate the Living Compass.
  const usesAuthoredWorldPresentation = options.islandNumber === 18;
  const stageGroups = Array.from({ length: usesAuthoredWorldPresentation ? 0 : options.stageCount }, (_, index) => {
    const stage = options.islandNumber === 4
      ? createCausewayStage(index, materials)
      : options.islandNumber === 6
        ? createMoonMirrorStage(index, materials)
        : options.islandNumber === 7
          ? createBreathlineStage(index, materials)
          : options.islandNumber === 8
            ? createPollinationStage(index, materials)
          : options.islandNumber === 18
            ? createLivingCompassStage(index, materials)
            : createIgnitionStage(index, materials);
    stage.name = `ISLAND_${options.islandNumber}_MISSION_STAGE_${index + 1}`;
    stage.visible = false;
    root.add(stage);
    return stage;
  });

  const finale = new THREE.Group();
  finale.name = `ISLAND_${options.islandNumber}_MISSION_FINALE`;
  const finaleCore = new THREE.Mesh(new THREE.IcosahedronGeometry(options.islandNumber === 8 ? 0.8 : 0.62, 2), materials.glow);
  finaleCore.position.y = options.islandNumber === 6 ? 2.4 : options.islandNumber === 18 ? 7.05 : 1.45;
  const finaleRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.075, 8, 28), materials.glow);
  finaleRing.position.copy(finaleCore.position);
  finaleRing.rotation.x = Math.PI / 2;
  finale.add(finaleCore, finaleRing);
  finale.visible = false;
  if (!usesAuthoredWorldPresentation) root.add(finale);

  const flashPoints = new THREE.Group();
  for (let i = 0; i < (options.quality === 'high' ? 24 : 12); i += 1) {
    const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.055 + (i % 3) * 0.02, 0), materials.glow);
    const angle = i / 24 * Math.PI * 2;
    flash.position.set(Math.sin(angle) * (1.2 + i % 4 * 0.42), 0.8 + (i % 5) * 0.3, Math.cos(angle) * (1.2 + i % 4 * 0.42));
    flash.userData.phase = i * 0.53;
    flashPoints.add(flash);
  }
  flashPoints.visible = false;
  if (!usesAuthoredWorldPresentation) root.add(flashPoints);

  const robots = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const robot = makeRobot({ metal: materials.dark, glow: materials.glow }, i);
    const angle = i / 3 * Math.PI * 2;
    robot.position.set(Math.sin(angle) * 1.2, 0.55, Math.cos(angle) * 1.2);
    robots.add(robot);
  }
  robots.visible = false;
  if (!usesAuthoredWorldPresentation) root.add(robots);

  const missionHitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  missionHitTarget.name = `ISLAND_${options.islandNumber}_STAGED_RESTORATION_MISSION_HIT_TARGET`;
  missionHitTarget.position.y = 1.15;
  root.add(missionHitTarget);

  let presentation: IslandStagedRestorationPresentation = {
    islandNumber: options.islandNumber,
    activatedStages: 0,
    stageCount: options.stageCount,
    constructionSequence: 0,
  };
  let previousStage = 0;
  let previousSequence = 0;
  let transitionStartedAt = Number.NEGATIVE_INFINITY;
  let transitionPending = false;

  const update = (next: IslandStagedRestorationPresentation, immediate = false) => {
    const stage = Math.max(0, Math.min(options.stageCount, Math.floor(next.activatedStages)));
    const sequence = Math.max(0, Math.floor(next.constructionSequence ?? 0));
    const changed = stage !== previousStage || sequence !== previousSequence;
    presentation = { ...next, activatedStages: stage };
    stageGroups.forEach((group, index) => {
      group.visible = index < stage;
      if (group.visible && (immediate || !changed || index < stage - 1)) group.scale.setScalar(1);
    });
    finale.visible = stage >= options.stageCount;
    if (immediate) finale.scale.setScalar(1);
    if (changed && !immediate) transitionPending = true;
    previousStage = stage;
    previousSequence = sequence;
  };

  const animate = (elapsed: number, reducedMotion: boolean) => {
    if (transitionPending) {
      transitionStartedAt = elapsed;
      transitionPending = false;
    }
    const transitionAge = elapsed - transitionStartedAt;
    const activeTransition = !reducedMotion && transitionAge >= 0 && transitionAge < 2.5;
    flashPoints.visible = activeTransition;
    robots.visible = activeTransition && presentation.activatedStages < options.stageCount;
    if (activeTransition && presentation.activatedStages > 0) {
      const t = Math.min(1, transitionAge / 0.72);
      const pop = 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI * 3) * (1 - t) * 0.18;
      stageGroups[presentation.activatedStages - 1]?.scale.setScalar(Math.max(0.04, pop));
      robots.children.forEach((robot, index) => {
        robot.rotation.y = elapsed * (index % 2 === 0 ? 1.4 : -1.2);
        robot.position.y = 0.55 + Math.abs(Math.sin(elapsed * 5 + index)) * 0.12;
      });
    }
    flashPoints.children.forEach((flash) => {
      const phase = Number(flash.userData.phase ?? 0);
      const pulse = activeTransition ? 0.3 + Math.abs(Math.sin(elapsed * 8 + phase)) * 1.25 : 0;
      flash.scale.setScalar(pulse);
      flash.rotation.y = elapsed * 2 + phase;
    });
    stageGroups.forEach((group, index) => {
      if (!group.visible) return;
      group.traverse((child) => {
        if (typeof child.userData.bubblePhase === 'number') {
          child.position.y += reducedMotion ? 0 : Math.sin(elapsed * 1.9 + child.userData.bubblePhase) * 0.0025;
        }
      });
      if (options.islandNumber === 9) group.rotation.y = reducedMotion ? 0 : Math.sin(elapsed * 0.42 + index) * 0.025;
    });
    if (finale.visible) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.2) * 0.12;
      finaleCore.scale.setScalar(pulse);
      finaleRing.rotation.z = reducedMotion ? 0 : elapsed * 0.5;
      if (activeTransition) finale.scale.setScalar(Math.min(1, Math.max(0.05, transitionAge / 0.9)));
      else finale.scale.setScalar(1);
    }
  };

  update(presentation, true);
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = options.quality === 'high' && child !== missionHitTarget;
    child.receiveShadow = child !== missionHitTarget;
  });
  return { root, missionHitTarget, update, animate };
}
