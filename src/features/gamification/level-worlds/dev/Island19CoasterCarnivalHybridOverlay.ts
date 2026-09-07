import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island19SourceLoftTrainPose } from './Island19CoasterCarnivalSourceLoftWorld';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export const ISLAND_19_HYBRID_WORLD_NAME = 'Island 019 — Coaster Carnival';
export const ISLAND_19_HYBRID_PHONE_PLATE = '/assets/islands/island-019/hero-matte-clean-phone-v003.webp';
export const ISLAND_19_WONDER_GOLD_VAULT_BACKDROP = '/assets/islands/island-019/wonder-express-gold-vault-v001.jpg';
export const ISLAND_19_WONDER_DIAMOND_GALLERY_BACKDROP = '/assets/islands/island-019/wonder-express-diamond-gallery-v001.jpg';
export const ISLAND_19_WONDER_SEA_CAVE_BACKDROP = '/assets/islands/island-019/wonder-express-sea-cave-v001.jpg';

export interface Island19HybridOverlayOptions {
  quality?: Island3DQuality;
  castShadow?: boolean;
  buildLevels?: Readonly<Record<string, number>>;
  getTrainPose: (
    elapsedSeconds: number,
    speedWorldUnitsPerSecond?: number,
    distanceOffset?: number,
  ) => Island19SourceLoftTrainPose;
}

export interface Island19HybridOverlayRuntime {
  root: THREE.Group;
  animate: (elapsedSeconds: number, reducedMotion?: boolean) => void;
  dataset: Record<string, string>;
}

function createRod(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 7,
) {
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function markOverlayPart<T extends THREE.Object3D>(node: T, id: string) {
  node.name = `island19-hybrid-${id}`;
  node.userData.partId = id;
  node.userData.explodeWithParent = true;
  return node;
}

function createFerrisOverlay(materials: {
  gold: THREE.Material;
  accent: THREE.Material;
  teal: THREE.Material;
  warm: THREE.Material;
}, quality: Island3DQuality) {
  const root = markOverlayPart(new THREE.Group(), 'ferris-wheel-motion');
  root.position.set(-4.85, 3.12, 2.8);
  const wheel = new THREE.Group();
  wheel.name = 'island19-hybrid-ferris-wheel-pivot';
  const radius = 1.34;
  wheel.add(new THREE.Mesh(
    new THREE.TorusGeometry(radius, quality === 'low' ? 0.022 : 0.032, 6, quality === 'high' ? 56 : 36),
    materials.accent,
  ));
  const spokeCount = quality === 'low' ? 8 : 12;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = index / spokeCount * Math.PI * 2;
    wheel.add(createRod(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
      0.014,
      materials.accent,
      6,
    ));
    const gondola = new THREE.Group();
    gondola.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.06);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), index % 2 ? materials.warm : materials.teal);
    bulb.scale.set(1.15, 0.72, 0.72);
    gondola.add(bulb);
    wheel.add(gondola);
  }
  compactStaticGeometry(wheel, 'ISLAND_19_HYBRID_FERRIS');
  root.add(wheel);
  return { root, wheel };
}

function createDropOverlay(materials: { accent: THREE.Material; warm: THREE.Material }) {
  const root = markOverlayPart(new THREE.Group(), 'drop-carriage-motion');
  root.position.set(4.92, 0, -1.68);
  const carriage = new THREE.Group();
  carriage.name = 'island19-hybrid-drop-carriage-pivot';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 7, 28), materials.accent);
  ring.rotation.x = Math.PI / 2;
  carriage.add(ring);
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), materials.warm);
    lamp.position.set(Math.cos(angle) * 0.52, 0, Math.sin(angle) * 0.52);
    carriage.add(lamp);
  }
  compactStaticGeometry(carriage, 'ISLAND_19_HYBRID_DROP');
  root.add(carriage);
  return { root, carriage };
}

function createCarouselOverlay(materials: { accent: THREE.Material; warm: THREE.Material; red: THREE.Material }) {
  const root = markOverlayPart(new THREE.Group(), 'carousel-motion');
  root.position.set(4.72, 1.02, 3.18);
  const pivot = new THREE.Group();
  pivot.name = 'island19-hybrid-carousel-pivot';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 7, 36), materials.accent);
  ring.rotation.x = Math.PI / 2;
  pivot.add(ring);
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2;
    const pole = createRod(
      new THREE.Vector3(Math.cos(angle) * 0.84, 0.06, Math.sin(angle) * 0.84),
      new THREE.Vector3(Math.cos(angle) * 0.84, 0.72, Math.sin(angle) * 0.84),
      0.018,
      materials.accent,
      6,
    );
    const lamp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07),
      index % 2 ? materials.warm : materials.red,
    );
    lamp.position.set(Math.cos(angle) * 0.84, 0.35, Math.sin(angle) * 0.84);
    pivot.add(pole, lamp);
  }
  compactStaticGeometry(pivot, 'ISLAND_19_HYBRID_CAROUSEL');
  root.add(pivot);
  return { root, pivot };
}

function createFountainOverlay(materials: { water: THREE.Material; warm: THREE.Material }, quality: Island3DQuality) {
  const root = markOverlayPart(new THREE.Group(), 'fountain-motion');
  root.position.set(0, 0.82, 3.45);
  const droplets: THREE.Mesh[] = [];
  const count = quality === 'low' ? 6 : quality === 'medium' ? 10 : 14;
  for (let index = 0; index < count; index += 1) {
    const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), materials.water);
    droplet.scale.set(0.72, 1.55, 0.72);
    droplet.userData.phase = index / count;
    droplets.push(droplet);
    root.add(droplet);
  }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 6, 30), materials.warm);
  crown.rotation.x = Math.PI / 2;
  root.add(crown);
  return { root, droplets };
}

function createTrainOverlay(materials: { red: THREE.Material; gold: THREE.Material }) {
  const root = markOverlayPart(new THREE.Group(), 'wonder-train-motion');
  const cars: THREE.Group[] = [];
  for (let index = 0; index < 4; index += 1) {
    const car = new THREE.Group();
    car.name = `island19-hybrid-train-car-${index}`;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.46), materials.red);
    body.position.y = 0.11;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.49), materials.gold);
    trim.position.y = 0.21;
    car.add(body, trim);
    cars.push(car);
    root.add(car);
  }
  return { root, cars };
}

function createBuildStageOverlay(
  id: string,
  position: readonly [number, number, number],
  level: number,
  materials: { accent: THREE.Material; gold: THREE.Material; teal: THREE.Material; warm: THREE.Material },
) {
  const root = markOverlayPart(new THREE.Group(), `build-anchor-${id}`);
  root.position.set(...position);
  root.userData.landmarkId = id;
  root.userData.buildLevel = level;
  if (level >= 1) {
    const foundation = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 22), materials.accent);
    foundation.rotation.x = Math.PI / 2;
    foundation.name = `island19-hybrid-${id}-l1-foundation`;
    root.add(foundation);
  }
  if (level >= 2) {
    for (const x of [-0.28, 0.28]) {
      const beam = createRod(
        new THREE.Vector3(x, 0.04, 0),
        new THREE.Vector3(x, 0.68, 0),
        0.024,
        materials.teal,
        6,
      );
      beam.name = `island19-hybrid-${id}-l2-beam`;
      root.add(beam);
    }
    const commissioningRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.022, 6, 20), materials.gold);
    commissioningRing.name = `island19-hybrid-${id}-l2-commissioning-ring`;
    commissioningRing.position.y = 0.7;
    root.add(commissioningRing);
  }
  let crown: THREE.Mesh | null = null;
  if (level >= 3) {
    crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), materials.warm);
    crown.name = `island19-hybrid-${id}-l3-crown`;
    crown.position.y = 0.94;
    root.add(crown);
  }
  return { root, crown };
}

export function createIsland19CoasterCarnivalHybridOverlay(
  options: Island19HybridOverlayOptions,
): Island19HybridOverlayRuntime {
  const quality = options.quality ?? 'medium';
  const root = new THREE.Group();
  root.name = 'island19-coaster-carnival-hybrid-overlay';
  root.scale.y = 1.34;

  const shared = {
    gold: new THREE.MeshPhysicalMaterial({
      color: 0xffc55b,
      emissive: 0xf28b22,
      emissiveIntensity: 1.35,
      roughness: 0.28,
      metalness: 0.68,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
    accent: new THREE.MeshBasicMaterial({
      color: 0xffd66b,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      depthTest: false,
    }),
    warm: new THREE.MeshBasicMaterial({
      color: 0xffe7a1,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    }),
    teal: new THREE.MeshPhysicalMaterial({
      color: 0x49d9d0,
      emissive: 0x147e83,
      emissiveIntensity: 0.75,
      roughness: 0.34,
      metalness: 0.45,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
    red: new THREE.MeshPhysicalMaterial({
      color: 0xd84c31,
      emissive: 0x6f160d,
      emissiveIntensity: 0.38,
      roughness: 0.34,
      metalness: 0.45,
    }),
    water: new THREE.MeshPhysicalMaterial({
      color: 0xa7f5ff,
      emissive: 0x2cacc8,
      emissiveIntensity: 0.8,
      roughness: 0.08,
      transmission: 0.12,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  };

  const ferris = createFerrisOverlay(shared, quality);
  const drop = createDropOverlay(shared);
  const carousel = createCarouselOverlay(shared);
  const fountain = createFountainOverlay(shared, quality);
  const train = createTrainOverlay(shared);
  root.add(ferris.root, drop.root, carousel.root, fountain.root, train.root);
  const buildAnchors = [
    ['hatchery', [-4.85, 0.72, 2.8]],
    ['habit', [-5.15, 0.62, -1.72]],
    ['event', [4.92, 0.7, -1.68]],
    ['wisdom', [4.72, 0.72, 3.18]],
    ['boss', [0, 0.72, 0]],
  ] as const;
  const buildStages = buildAnchors.map(([id, position]) => createBuildStageOverlay(
    id,
    position,
    THREE.MathUtils.clamp(Math.floor(options.buildLevels?.[id] ?? 3), 0, 3),
    shared,
  ));
  buildStages.forEach((stage) => root.add(stage.root));

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = options.castShadow ?? false;
    child.receiveShadow = false;
    child.renderOrder = 8;
  });

  const dataset = {
    island19HybridOverlay: 'mounted',
    island19HybridPlate: ISLAND_19_HYBRID_PHONE_PLATE,
    island19HybridGeometryProof: 'available',
    island19HybridAnimatedSystems: 'train,ferris,drop,carousel,fountain',
    island19HybridBuildAnchors: String(buildStages.length),
    island19HybridRepresentationHonest: 'true',
  };
  root.userData.presentationOnly = true;
  root.userData.island19RepresentativeVariant = 'circuit-e-source-locked-hybrid';
  root.userData.dataset = dataset;
  root.userData.sculptRuntime = {
    model: 'island-019-coaster-carnival-hybrid-overlay',
    variant: 'circuit-e-source-locked-hybrid',
    presentationOnly: true,
    sourceFacingSilhouetteOwner: 'secondary-inferred-clean-hero-plate',
    dynamicOwners: ['wonder-train-motion', 'ferris-wheel-motion', 'drop-carriage-motion', 'carousel-motion', 'fountain-motion'],
    buildOwners: buildStages.map((stage) => stage.root.name),
  };

  const animate = (elapsedSeconds: number, reducedMotion = false) => {
    const time = reducedMotion ? 0.8 : elapsedSeconds;
    ferris.wheel.rotation.z = reducedMotion ? -0.18 : -time * 0.14;
    carousel.pivot.rotation.y = reducedMotion ? 0.24 : time * 0.34;
    drop.carriage.position.y = reducedMotion
      ? 4.1
      : 2.2 + (Math.sin(time * 0.72 - Math.PI / 2) * 0.5 + 0.5) * 4.3;
    fountain.droplets.forEach((droplet) => {
      const phase = Number(droplet.userData.phase ?? 0);
      const progress = reducedMotion ? phase : THREE.MathUtils.euclideanModulo(time * 0.42 + phase, 1);
      const angle = phase * Math.PI * 2;
      droplet.position.set(
        Math.cos(angle) * (0.12 + progress * 0.48),
        0.12 + Math.sin(progress * Math.PI) * 1.05,
        Math.sin(angle) * (0.12 + progress * 0.48),
      );
      droplet.scale.y = 1.1 + Math.sin(progress * Math.PI) * 0.8;
    });
    train.cars.forEach((car, index) => {
      const pose = options.getTrainPose(time, reducedMotion ? 0 : 1.52, -index * 0.76);
      car.position.copy(pose.position);
      car.quaternion.copy(pose.quaternion);
    });
    buildStages.forEach((stage, index) => {
      if (!stage.crown) return;
      stage.crown.rotation.y = reducedMotion ? index * 0.4 : time * 0.55 + index * 0.4;
      const pulse = reducedMotion ? 1 : 0.9 + Math.sin(time * 2.1 + index) * 0.1;
      stage.crown.scale.setScalar(pulse);
    });
    shared.warm.opacity = reducedMotion ? 0.72 : 0.7 + Math.sin(time * 2.4) * 0.16;
  };

  return { root, animate, dataset };
}
