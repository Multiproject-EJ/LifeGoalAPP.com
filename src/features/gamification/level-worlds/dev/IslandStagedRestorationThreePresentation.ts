import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import type { Island3DQuality } from './island5ThreePilotContract';

export interface IslandStagedRestorationPresentation {
  islandNumber: 4 | 6 | 7 | 8 | 9 | 18 | 19 | 20;
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

const PALETTES: Record<4 | 6 | 7 | 8 | 9 | 18 | 19, Palette> = {
  4: { primary: 0xf5d083, secondary: 0xb88340, glow: 0xffe9a3, dark: 0x382716 },
  6: { primary: 0xdad8ff, secondary: 0x7d70df, glow: 0xb9f4ff, dark: 0x171237 },
  7: { primary: 0x8df4ff, secondary: 0x3aa8cc, glow: 0xd5ffff, dark: 0x082a3a },
  8: { primary: 0x6e8466, secondary: 0xb78b35, glow: 0x54f5a0, dark: 0x172c20 },
  9: { primary: 0xffa126, secondary: 0xb83d18, glow: 0xffee8a, dark: 0x341008 },
  18: { primary: 0xff8fda, secondary: 0x71d276, glow: 0xfff0a8, dark: 0x17361c },
  19: { primary: 0xf4bd3b, secondary: 0xb73825, glow: 0xfff0a0, dark: 0x25203f },
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

/** The restored promenade stays entirely OUTSIDE the canonical tile corridor. */
export const ISLAND_4_CAUSEWAY_POINTS = [
  [-3.1, 0.3, 4.85], [-1.05, 0.3, 6.35], [1.05, 0.3, 6.35], [3.1, 0.3, 4.85],
] as const;

function createCausewayStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  const start = new THREE.Vector3(...ISLAND_4_CAUSEWAY_POINTS[index]!);
  const end = new THREE.Vector3(...ISLAND_4_CAUSEWAY_POINTS[index + 1]!);
  const length = start.distanceTo(end);
  group.position.copy(start).add(end).multiplyScalar(.5);
  group.rotation.y = Math.atan2(end.x-start.x,end.z-start.z);
  group.userData.sculptRuntime={clickable:true,explodable:true,part:`causeway-span-${index+1}`,presentationOnly:true};
  const assembly = new THREE.Group();
  for (let stone = 0; stone < 9; stone += 1) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(.74,.16,length/9-.014),materials.primary);
    block.name=`CAUSEWAY_SPAN_${index+1}_DECK_STONE_${stone+1}`;
    block.position.set(0,.1,-length/2+(stone+.5)*length/9);
    assembly.add(block);
  }
  for(const side of [-1,1]) {
    for(let i=0;i<7;i++) {
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.027,.037,.36,6),materials.secondary);
      post.position.set(side*.34,.3,-length/2+i*length/6);assembly.add(post);
    }
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.045,.055,length),materials.secondary);
    rail.position.set(side*.34,.49,0);assembly.add(rail);
    // An actual arched supporting wall, including its open underside.
    const shape=new THREE.Shape();shape.moveTo(-length/2,.03);shape.lineTo(length/2,.03);shape.lineTo(length/2,-.75);
    shape.lineTo(length*.4,-.75);shape.quadraticCurveTo(0,.0,-length*.4,-.75);shape.lineTo(-length/2,-.75);shape.closePath();
    const arch=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:12}),materials.primary);
    arch.rotation.y=Math.PI/2;arch.position.set(side*.3,0,0);assembly.add(arch);
  }
  assembly.traverse(n=>{if(n instanceof THREE.Mesh){n.castShadow=true;n.receiveShadow=true;}});
  compactStaticGeometry(assembly,`ISLAND_4_CAUSEWAY_SPAN_${index+1}`);group.add(assembly);
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

function createWonderCircuitStage(index: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  group.name = `ISLAND_19_WONDER_CIRCUIT_SYSTEM_${index + 1}`;

  if (index === 0) {
    // System one recommissions the dispatch station at the castle throat.
    group.name = 'ISLAND_19_WONDER_CIRCUIT_DISPATCH_STATION';
    const semanticRoot = new THREE.Object3D();
    semanticRoot.name = group.name;
    group.add(semanticRoot);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 1.15), materials.primary);
    platform.position.set(0, 0.62, -4.28);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.13, 0.9), materials.secondary);
    canopy.position.set(0, 1.78, -4.28);
    group.add(platform, canopy);
    for (const x of [-1, 1]) {
      const post = cylinderBetween(
        new THREE.Vector3(x, 0.7, -4.28),
        new THREE.Vector3(x, 1.76, -4.28),
        0.07,
        materials.secondary,
      );
      group.add(post);
    }
    const dispatchStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 1), materials.glow);
    dispatchStar.position.set(0, 2.02, -4.28);
    dispatchStar.userData.wonderCircuitPulse = 0;
    group.add(dispatchStar);
    return group;
  }

  if (index === 1) {
    // System two powers the lift hill. Three luminous traction relays trace
    // the climb without adding a second railway or changing route ownership.
    group.name = 'ISLAND_19_WONDER_CIRCUIT_LIFT_HILL_POWER';
    const semanticRoot = new THREE.Object3D();
    semanticRoot.name = group.name;
    group.add(semanticRoot);
    const relays = [
      new THREE.Vector3(-3.7, 2.0, 2.18),
      new THREE.Vector3(-4.15, 4.65, 1.42),
      new THREE.Vector3(-3.35, 7.35, 0.54),
    ];
    relays.forEach((position, relayIndex) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.085, 7, 18), materials.secondary);
      ring.position.copy(position);
      ring.rotation.y = 0.34;
      ring.userData.wonderCircuitRelay = relayIndex;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), materials.glow);
      core.position.copy(position);
      core.userData.wonderCircuitPulse = relayIndex * 0.8;
      group.add(ring, core);
      if (relayIndex > 0) group.add(cylinderBetween(relays[relayIndex - 1], position, 0.035, materials.glow));
    });
    return group;
  }

  // System three arms the launch coils that throw the train through the
  // surface S and toward the underground plunge.
  group.name = 'ISLAND_19_WONDER_CIRCUIT_LOOP_LAUNCH';
  const semanticRoot = new THREE.Object3D();
  semanticRoot.name = group.name;
  group.add(semanticRoot);
  const launchCentre = new THREE.Vector3(5.18, 1.58, 2.0);
  for (let coil = 0; coil < 3; coil += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58 + coil * 0.18, 0.08, 8, 24), coil === 1 ? materials.primary : materials.secondary);
    ring.position.copy(launchCentre).add(new THREE.Vector3(0, coil * 0.07, 0));
    ring.rotation.x = Math.PI / 2;
    ring.userData.wonderCircuitLaunchCoil = coil;
    group.add(ring);
  }
  const launchCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 1), materials.glow);
  launchCore.position.copy(launchCentre).add(new THREE.Vector3(0, 0.18, 0));
  launchCore.userData.wonderCircuitPulse = 1.6;
  group.add(launchCore);
  return group;
}

export function createIslandStagedRestorationThreePresentation(options: {
  islandNumber: 4 | 6 | 7 | 8 | 9 | 18 | 19;
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
  // Runtime Island 008 owns its complete stage/finale sculpture inside the
  // authored Jungle Expedition source pack. Retain this runtime only as the
  // canonical mission hit target so generic markers do not duplicate it.
  const usesAuthoredWorldPresentation = options.islandNumber === 8;
  const stageGroups = Array.from({ length: usesAuthoredWorldPresentation ? 0 : options.stageCount }, (_, index) => {
    const stage = options.islandNumber === 4
      ? createCausewayStage(index, materials)
      : options.islandNumber === 6
        ? createMoonMirrorStage(index, materials)
        : options.islandNumber === 7
          ? createBreathlineStage(index, materials)
          : options.islandNumber === 8
            ? createLivingCompassStage(index, materials)
          : options.islandNumber === 18
            ? createPollinationStage(index, materials)
            : options.islandNumber === 19
              ? createWonderCircuitStage(index, materials)
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
  if (options.islandNumber === 4) {
    finale.position.set(0, -.55, 6.35);
    finale.scale.setScalar(.4);
  }
  if (options.islandNumber === 19) {
    finale.name = 'ISLAND_19_WONDER_EXPRESS_VICTORY_RIDE_BEACON';
    finale.position.set(7.35, -0.25, -0.78);
  }
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
  if(options.islandNumber===4) {missionHitTarget.position.set(0,.5,5.9);missionHitTarget.scale.set(.65,.45,.65);}
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
    if (immediate) finale.scale.setScalar(options.islandNumber === 4 ? .4 : 1);
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
    robots.visible = activeTransition && (options.islandNumber === 4 || presentation.activatedStages < options.stageCount);
    if (activeTransition && presentation.activatedStages > 0) {
      const t = Math.min(1, transitionAge / 0.72);
      const pop = 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI * 3) * (1 - t) * 0.18;
      stageGroups[presentation.activatedStages - 1]?.scale.setScalar(Math.max(0.04, pop));
      robots.children.forEach((robot, index) => {
        robot.rotation.y = elapsed * (index % 2 === 0 ? 1.4 : -1.2);
        robot.position.y = 0.55 + Math.abs(Math.sin(elapsed * 5 + index)) * 0.12;
      });
      if(options.islandNumber===4) {
        const worksite=stageGroups[presentation.activatedStages-1];
        if(worksite){robots.position.copy(worksite.position);robots.position.y-=.2;flashPoints.position.copy(worksite.position);flashPoints.scale.setScalar(.35);}
      }
      if (options.islandNumber === 19) {
        const wonderWorksites = [
          new THREE.Vector3(0, 0, -4.28),
          new THREE.Vector3(-3.72, 0.28, 1.58),
          new THREE.Vector3(5.18, 0, 2.0),
        ] as const;
        robots.position.copy(wonderWorksites[Math.max(0, Math.min(2, presentation.activatedStages - 1))]);
      }
    }
    flashPoints.children.forEach((flash) => {
      const phase = Number(flash.userData.phase ?? 0);
      const pulse = activeTransition ? 0.3 + Math.abs(Math.sin(elapsed * 8 + phase)) * 1.25 : 0;
      flash.scale.setScalar(pulse);
      flash.rotation.y = elapsed * 2 + phase;
    });
    stageGroups.forEach((group, index) => {
      if (!group.visible) return;
      if (options.islandNumber === 4 && !activeTransition) group.scale.setScalar(1);
      group.traverse((child) => {
        if (typeof child.userData.bubblePhase === 'number') {
          child.position.y += reducedMotion ? 0 : Math.sin(elapsed * 1.9 + child.userData.bubblePhase) * 0.0025;
        }
      });
      if (options.islandNumber === 9) group.rotation.y = reducedMotion ? 0 : Math.sin(elapsed * 0.42 + index) * 0.025;
      if (options.islandNumber === 19 && !reducedMotion) {
        group.traverse((child) => {
          if (typeof child.userData.wonderCircuitPulse === 'number') {
            const pulse = 0.82 + Math.sin(elapsed * 4.1 + child.userData.wonderCircuitPulse) * 0.18;
            child.scale.setScalar(pulse);
          }
          if (typeof child.userData.wonderCircuitLaunchCoil === 'number') {
            child.rotation.z = elapsed * (0.28 + child.userData.wonderCircuitLaunchCoil * 0.12);
          }
        });
      }
    });
    if (finale.visible) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.2) * 0.12;
      finaleCore.scale.setScalar(pulse);
      finaleRing.rotation.z = reducedMotion ? 0 : elapsed * 0.5;
      const finaleScale = options.islandNumber === 4 ? .32 : 1;
      if (activeTransition) finale.scale.setScalar(finaleScale * Math.min(1, Math.max(0.05, transitionAge / 0.9)));
      else finale.scale.setScalar(finaleScale);
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
