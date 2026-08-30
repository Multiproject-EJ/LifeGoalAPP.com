import * as THREE from 'three';
import { createVaultTreasureIslandModelV2 } from './VaultTreasureIslandModelV2';
import type { VaultIslandPerimeterStyle } from '../services/islandRunVaultCustomization';

export type VaultIslandQuality = 'low' | 'medium' | 'high';

export interface VaultTreasureIslandOptions {
  quality?: VaultIslandQuality;
  animated?: boolean;
  perimeterStyle?: VaultIslandPerimeterStyle;
  exteriorFill?: number;
  gigaCharmFill?: number;
}

export interface VaultTreasureIslandRuntime {
  root: THREE.Group;
  update: (elapsedSeconds: number) => void;
  setPerimeterStyle?: (style: VaultIslandPerimeterStyle) => void;
  setExteriorFill?: (value: number) => void;
  setGigaCharmFill?: (value: number) => void;
  dispose: () => void;
}

type VaultMaterials = ReturnType<typeof createVaultMaterials>;

const CLIFF_TOP_Y = 1.46;
const GARDEN_TERRACE_Y = 1.68;
const PALACE_BASE_Y = 1.98;

function segmentCount(quality: VaultIslandQuality, low: number, medium: number, high: number) {
  if (quality === 'low') return low;
  if (quality === 'medium') return medium;
  return high;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], name?: string) {
  const output = new THREE.Mesh(geometry, material);
  if (name) output.name = name;
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function createVaultMaterials() {
  return {
    ocean: new THREE.MeshPhysicalMaterial({
      color: '#0c5f8d',
      roughness: 0.26,
      metalness: 0,
      transmission: 0.08,
      thickness: 0.2,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    }),
    seaFoam: new THREE.MeshBasicMaterial({
      color: '#d8fbff',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    distantIsland: new THREE.MeshStandardMaterial({ color: '#557d66', roughness: 0.82, metalness: 0 }),
    limestone: new THREE.MeshStandardMaterial({ color: '#f2ede1', roughness: 0.52, metalness: 0 }),
    limestoneShade: new THREE.MeshStandardMaterial({ color: '#cfc5af', roughness: 0.7, metalness: 0 }),
    marbleLight: new THREE.MeshStandardMaterial({ color: '#fff8e9', roughness: 0.36, metalness: 0 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#d99b20', roughness: 0.19, metalness: 0.72, clearcoat: 0.72, clearcoatRoughness: 0.08, emissive: '#542000', emissiveIntensity: 0.1, envMapIntensity: 1.38 }),
    darkGold: new THREE.MeshPhysicalMaterial({ color: '#8e651e', roughness: 0.3, metalness: 0.76, clearcoat: 0.4, clearcoatRoughness: 0.16, envMapIntensity: 1.25 }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#e9f1f7', roughness: 0.15, metalness: 0.86, clearcoat: 0.72, clearcoatRoughness: 0.07, envMapIntensity: 1.6 }),
    enamelBlue: new THREE.MeshPhysicalMaterial({ color: '#102e5f', roughness: 0.28, metalness: 0.05, clearcoat: 0.8 }),
    enamelViolet: new THREE.MeshPhysicalMaterial({ color: '#6530c8', roughness: 0.2, metalness: 0, clearcoat: 0.9 }),
    glassCyan: new THREE.MeshPhysicalMaterial({
      color: '#75f1ff',
      roughness: 0.05,
      metalness: 0,
      transmission: 0.62,
      thickness: 0.5,
      clearcoat: 1,
      emissive: '#104c65',
      emissiveIntensity: 0.35,
    }),
    gemPurple: new THREE.MeshPhysicalMaterial({
      color: '#8e4cff',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.2,
      thickness: 0.35,
      clearcoat: 1,
      emissive: '#40117a',
      emissiveIntensity: 0.4,
    }),
    emerald: new THREE.MeshPhysicalMaterial({
      color: '#18bf86',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.16,
      thickness: 0.32,
      clearcoat: 1,
      emissive: '#064b35',
      emissiveIntensity: 0.28,
    }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: '#ff4c72',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.12,
      thickness: 0.3,
      clearcoat: 1,
      emissive: '#741026',
      emissiveIntensity: 0.3,
    }),
    waterVeil: new THREE.MeshPhysicalMaterial({
      color: '#9df5ff',
      roughness: 0.12,
      metalness: 0,
      transmission: 0.54,
      thickness: 0.15,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
    warmGlow: new THREE.MeshBasicMaterial({
      color: '#ffd977',
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    window: new THREE.MeshStandardMaterial({ color: '#071626', roughness: 0.3, metalness: 0.1, emissive: '#061b34', emissiveIntensity: 0.4 }),
    palaceWindow: new THREE.MeshPhysicalMaterial({
      color: '#18365d',
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 0.78,
      clearcoatRoughness: 0.12,
      emissive: '#bd7220',
      emissiveIntensity: 0.52,
      envMapIntensity: 1.1,
    }),
    sail: new THREE.MeshStandardMaterial({ color: '#fff7e8', roughness: 0.48, metalness: 0, side: THREE.DoubleSide }),
  };
}

function createCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
  name?: string,
) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, name);
}

function createGoldBand(radius: number, tube: number, material: THREE.Material, quality: VaultIslandQuality, name: string) {
  const torus = mesh(
    new THREE.TorusGeometry(radius, tube, segmentCount(quality, 6, 8, 10), segmentCount(quality, 56, 80, 112)),
    material,
    name,
  );
  torus.rotation.x = Math.PI / 2;
  return torus;
}

function createArchedPanelGeometry(width: number, sideHeight: number, depth: number) {
  const radius = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, sideHeight);
  shape.absarc(0, sideHeight, radius, 0, Math.PI, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createPalaceShellGeometry(depth: number) {
  const shape = new THREE.Shape();
  const outline = [
    [-1.42, 0],
    [-1.42, 1.02],
    [-1.18, 1.02],
    [-1.18, 1.42],
    [-0.92, 1.42],
    [-0.92, 1.72],
    [-0.72, 1.72],
    [-0.72, 1.98],
    [0.72, 1.98],
    [0.72, 1.72],
    [0.92, 1.72],
    [0.92, 1.42],
    [1.18, 1.42],
    [1.18, 1.02],
    [1.42, 1.02],
    [1.42, 0],
  ] as const;
  shape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  const portalRadius = 0.4;
  const portalSideHeight = 0.94;
  const portal = new THREE.Path();
  portal.moveTo(-portalRadius, 0.01);
  portal.lineTo(portalRadius, 0.01);
  portal.lineTo(portalRadius, portalSideHeight);
  portal.absarc(0, portalSideHeight, portalRadius, 0, Math.PI, false);
  portal.lineTo(-portalRadius, 0.01);
  portal.closePath();
  shape.holes.push(portal);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    bevelSegments: 2,
    curveSegments: 20,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function addDome(parent: THREE.Group, materials: VaultMaterials, x: number, y: number, z: number, radius: number, quality: VaultIslandQuality) {
  const dome = mesh(
    new THREE.SphereGeometry(radius, segmentCount(quality, 12, 18, 24), segmentCount(quality, 6, 8, 12), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.enamelBlue,
    'vault-palace-blue-dome',
  );
  dome.scale.y = radius > 0.6 ? 1.02 : 0.76;
  dome.position.set(x, y, z);
  parent.add(dome);

  const rim = createGoldBand(radius * 0.96, radius * 0.035, materials.gold, quality, 'vault-palace-dome-rim');
  rim.position.set(x, y - 0.01, z);
  parent.add(rim);

  const finial = mesh(new THREE.OctahedronGeometry(radius * 0.16, 0), materials.gold, 'vault-palace-gold-finial');
  finial.position.set(x, y + radius * 0.55, z);
  parent.add(finial);

  if (quality !== 'low') {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const rib = mesh(new THREE.BoxGeometry(radius * 0.028, radius * 0.45, radius * 0.03), materials.gold, 'vault-palace-dome-gold-rib');
      rib.position.set(x + Math.sin(angle) * radius * 0.5, y + radius * 0.16, z + Math.cos(angle) * radius * 0.5);
      rib.rotation.set(Math.cos(angle) * 0.32, angle, Math.sin(angle) * -0.32);
      parent.add(rib);
    }
  }
}

function addTower(
  parent: THREE.Group,
  materials: VaultMaterials,
  x: number,
  z: number,
  baseY: number,
  height: number,
  radius: number,
  quality: VaultIslandQuality,
) {
  const segments = segmentCount(quality, 8, 12, 16);
  const body = createCylinder(radius, radius * 1.05, height, segments, materials.marbleLight, 'vault-palace-tower');
  body.position.set(x, baseY + height / 2, z);
  parent.add(body);

  const collar = createGoldBand(radius * 1.02, radius * 0.055, materials.gold, quality, 'vault-palace-tower-collar');
  collar.position.set(x, baseY + height, z);
  parent.add(collar);

  addDome(parent, materials, x, baseY + height + 0.02, z, radius * 1.12, quality);

  if (quality !== 'low') {
    for (const floorY of [baseY + height * 0.3, baseY + height * 0.7]) {
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2;
        const windowPanel = mesh(new THREE.BoxGeometry(radius * 0.34, height * 0.16, 0.026), materials.window, 'vault-palace-tower-window');
        windowPanel.position.set(
          x + Math.sin(angle) * (radius + 0.008),
          floorY,
          z + Math.cos(angle) * (radius + 0.008),
        );
        windowPanel.rotation.y = angle;
        parent.add(windowPanel);
      }
    }
  }
}

function addPalaceSplitStair(parent: THREE.Group, materials: VaultMaterials, side: -1 | 1) {
  const stair = new THREE.Group();
  stair.name = side < 0 ? 'vault-palace-left-split-stair-to-garden' : 'vault-palace-right-split-stair-to-garden';
  stair.rotation.y = side * -0.32;

  for (let index = 0; index < 10; index += 1) {
    const t = index / 9;
    const step = mesh(new THREE.BoxGeometry(0.5 + t * 0.18, 0.055, 0.2), materials.marbleLight, 'vault-palace-split-stair-tall-step');
    step.position.set(side * (0.24 + t * 0.86), PALACE_BASE_Y + 0.16 - t * 0.4, 0.92 + t * 0.66);
    stair.add(step);

    if (index % 2 === 0) {
      const jewel = mesh(new THREE.OctahedronGeometry(0.035, 0), index % 4 === 0 ? materials.ruby : materials.glassCyan, 'vault-palace-stair-set-jewel');
      jewel.position.set(side * (0.5 + t * 0.78), PALACE_BASE_Y + 0.25 - t * 0.4, 0.94 + t * 0.64);
      stair.add(jewel);
    }
  }

  for (let index = 0; index < 5; index += 1) {
    const t = index / 4;
    const post = createCylinder(0.01, 0.014, 0.24, 5, materials.gold, 'vault-palace-split-stair-small-gold-post');
    post.position.set(side * (0.48 + t * 0.82), PALACE_BASE_Y + 0.17 - t * 0.34, 1.02 + t * 0.5);
    stair.add(post);
  }

  parent.add(stair);
}

function addPalaceAtriumEntry(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const atrium = new THREE.Group();
  atrium.name = 'vault-palace-empty-dome-atrium-entry';

  const landing = mesh(new THREE.BoxGeometry(1.18, 0.14, 0.72), materials.marbleLight, 'vault-palace-upper-entry-landing');
  landing.position.set(0, PALACE_BASE_Y + 0.04, 1.02);
  atrium.add(landing);

  const darkMouth = mesh(createArchedPanelGeometry(1.24, 1.16, 0.08), materials.window, 'vault-palace-empty-atrium-dark-mouth');
  darkMouth.position.set(0, PALACE_BASE_Y + 0.02, -0.6);
  atrium.add(darkMouth);

  const arch = mesh(new THREE.TorusGeometry(0.43, 0.045, 8, segmentCount(quality, 36, 56, 80), Math.PI), materials.gold, 'vault-palace-upper-entry-gold-arch');
  arch.position.set(0, PALACE_BASE_Y + 0.94, 0.73);
  atrium.add(arch);

  const innerCeiling = mesh(new THREE.BoxGeometry(0.76, 0.08, 0.72), materials.limestoneShade, 'vault-palace-atrium-inner-ceiling');
  innerCeiling.position.set(0, PALACE_BASE_Y + 1.3, 0.04);
  atrium.add(innerCeiling);

  for (const side of [-1, 1] as const) {
    const innerWall = mesh(new THREE.BoxGeometry(0.08, 1.12, 0.72), materials.limestoneShade, 'vault-palace-atrium-inner-side-wall');
    innerWall.position.set(side * 0.37, PALACE_BASE_Y + 0.58, 0.04);
    atrium.add(innerWall);

    const lamp = mesh(new THREE.OctahedronGeometry(0.07, 0), materials.warmGlow, 'vault-palace-atrium-warm-lamp');
    lamp.position.set(side * 0.25, PALACE_BASE_Y + 0.52, -0.42);
    atrium.add(lamp);
  }

  for (const side of [-1, 1] as const) {
    const jamb = mesh(new THREE.BoxGeometry(0.075, 0.98, 0.1), materials.gold, 'vault-palace-entry-gold-jamb');
    jamb.position.set(side * 0.43, PALACE_BASE_Y + 0.5, 0.73);
    atrium.add(jamb);
  }

  for (let index = 0; index < 7; index += 1) {
    const step = mesh(new THREE.BoxGeometry(0.7 - index * 0.025, 0.06, 0.2), materials.marbleLight, 'vault-palace-visible-inner-vault-step');
    step.position.set(0, PALACE_BASE_Y + 0.17 - index * 0.065, 0.64 - index * 0.15);
    atrium.add(step);
  }

  for (const side of [-1, 1] as const) {
    const column = createCylinder(0.05, 0.07, 1.24, 8, materials.gold, 'vault-palace-upper-entry-tall-gold-column');
    column.position.set(side * 0.58, PALACE_BASE_Y + 0.64, 0.73);
    atrium.add(column);
    addPalaceSplitStair(atrium, materials, side);
  }

  parent.add(atrium);
}

function addPalaceArchedWindow(
  parent: THREE.Group,
  materials: VaultMaterials,
  quality: VaultIslandQuality,
  x: number,
  bottomY: number,
  z: number,
  width: number,
  sideHeight: number,
  name: string,
) {
  const window = new THREE.Group();
  window.name = name;
  window.position.set(x, bottomY, z);
  const recess = mesh(createArchedPanelGeometry(width, sideHeight, 0.035), materials.palaceWindow, `${name}-warm-glazed-recess`);
  window.add(recess);
  const radius = width / 2;
  const arch = mesh(new THREE.TorusGeometry(radius, width * 0.055, 7, segmentCount(quality, 24, 36, 52), Math.PI), materials.gold, `${name}-gold-arch`);
  arch.position.set(0, sideHeight, 0.035);
  window.add(arch);
  for (const side of [-1, 1] as const) {
    const jamb = createCylinder(width * 0.035, width * 0.045, sideHeight, 6, materials.gold, `${name}-gold-jamb`);
    jamb.position.set(side * radius, sideHeight / 2, 0.035);
    window.add(jamb);
  }
  const gem = mesh(new THREE.OctahedronGeometry(width * 0.11, 0), x < 0 ? materials.gemPurple : materials.glassCyan, `${name}-keystone-gem`);
  gem.position.set(0, sideHeight + radius * 0.92, 0.065);
  window.add(gem);
  parent.add(window);
}

function addPalaceCrownTurrets(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const turrets = [
    [-0.68, 0.18, 0.78, 0.15],
    [0.68, 0.18, 0.78, 0.15],
    [-0.5, -0.48, 0.68, 0.13],
    [0.5, -0.48, 0.68, 0.13],
  ] as const;
  turrets.forEach(([x, z, height, radius]) => {
    addTower(parent, materials, x, z, PALACE_BASE_Y + 1.94, height, radius, quality);
  });

  const lantern = createCylinder(0.13, 0.17, 0.44, 12, materials.marbleLight, 'vault-palace-main-dome-lantern');
  lantern.position.set(0, PALACE_BASE_Y + 3.13, -0.08);
  parent.add(lantern);
  const lanternBand = createGoldBand(0.15, 0.018, materials.gold, quality, 'vault-palace-main-dome-lantern-band');
  lanternBand.position.set(0, PALACE_BASE_Y + 3.34, -0.08);
  parent.add(lanternBand);
  const spire = createCylinder(0.018, 0.055, 0.42, 8, materials.gold, 'vault-palace-main-dome-tall-spire');
  spire.position.set(0, PALACE_BASE_Y + 3.56, -0.08);
  parent.add(spire);
  const crownGem = mesh(new THREE.OctahedronGeometry(0.08, 0), materials.glassCyan, 'vault-palace-main-dome-crown-gem');
  crownGem.position.set(0, PALACE_BASE_Y + 3.81, -0.08);
  parent.add(crownGem);
}

function addPalaceCeremonialFacade(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const facade = new THREE.Group();
  facade.name = 'vault-palace-jeweled-ceremonial-facade';

  const arch = mesh(
    new THREE.TorusGeometry(0.52, 0.055, 8, segmentCount(quality, 42, 60, 84), Math.PI),
    materials.gold,
    'vault-palace-monumental-entry-outer-gold-arch',
  );
  arch.position.set(0, PALACE_BASE_Y + 1.02, 0.77);
  facade.add(arch);

  for (const side of [-1, 1] as const) {
    const jamb = createCylinder(0.038, 0.06, 1.03, 8, materials.gold, 'vault-palace-monumental-entry-gold-jamb');
    jamb.position.set(side * 0.52, PALACE_BASE_Y + 0.52, 0.77);
    facade.add(jamb);

    const shoulderGem = mesh(
      new THREE.OctahedronGeometry(0.075, 0),
      side < 0 ? materials.gemPurple : materials.glassCyan,
      'vault-palace-entry-shoulder-gem',
    );
    shoulderGem.position.set(side * 0.52, PALACE_BASE_Y + 1.08, 0.82);
    facade.add(shoulderGem);
  }

  const plaque = mesh(new THREE.BoxGeometry(0.72, 0.18, 0.07), materials.enamelBlue, 'vault-palace-entry-blue-crest-plaque');
  plaque.position.set(0, PALACE_BASE_Y + 1.55, 0.77);
  facade.add(plaque);
  const plaqueFrame = mesh(new THREE.TorusGeometry(0.14, 0.026, 7, 32), materials.gold, 'vault-palace-entry-crest-gold-ring');
  plaqueFrame.position.set(0, PALACE_BASE_Y + 1.55, 0.815);
  facade.add(plaqueFrame);
  const plaqueGem = mesh(new THREE.OctahedronGeometry(0.085, 0), materials.glassCyan, 'vault-palace-entry-crest-cyan-gem');
  plaqueGem.position.set(0, PALACE_BASE_Y + 1.55, 0.855);
  facade.add(plaqueGem);

  const balcony = mesh(new THREE.BoxGeometry(1.52, 0.08, 0.28), materials.marbleLight, 'vault-palace-upper-gallery-balcony');
  balcony.position.set(0, PALACE_BASE_Y + 1.13, 0.81);
  facade.add(balcony);
  const balconyRail = mesh(new THREE.BoxGeometry(1.58, 0.045, 0.045), materials.gold, 'vault-palace-upper-gallery-gold-rail');
  balconyRail.position.set(0, PALACE_BASE_Y + 1.36, 0.94);
  facade.add(balconyRail);
  for (const x of [-0.72, -0.48, -0.24, 0.24, 0.48, 0.72]) {
    const baluster = createCylinder(0.015, 0.02, 0.24, 6, materials.gold, 'vault-palace-upper-gallery-gold-baluster');
    baluster.position.set(x, PALACE_BASE_Y + 1.24, 0.94);
    facade.add(baluster);
  }

  parent.add(facade);
}

function addPalaceGardenApproach(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const approach = new THREE.Group();
  approach.name = 'vault-palace-grand-stair-to-garden';

  for (let index = 0; index < 11; index += 1) {
    const t = index / 10;
    const step = mesh(
      new THREE.BoxGeometry(0.9 + t * 0.5, 0.055, 0.18),
      materials.marbleLight,
      'vault-palace-grand-garden-marble-step',
    );
    step.position.set(0, PALACE_BASE_Y - 0.035 - t * 0.25, 1.0 + t * 0.88);
    approach.add(step);
  }

  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 6; index += 1) {
      const t = index / 5;
      const post = createCylinder(0.014, 0.022, 0.26, 6, materials.gold, 'vault-palace-grand-garden-stair-gold-post');
      post.position.set(side * (0.5 + t * 0.23), PALACE_BASE_Y + 0.07 - t * 0.22, 1.03 + t * 0.82);
      approach.add(post);
      const jewel = mesh(new THREE.OctahedronGeometry(0.034, 0), index % 2 === 0 ? materials.glassCyan : materials.gemPurple, 'vault-palace-grand-garden-stair-jewel');
      jewel.position.set(side * (0.5 + t * 0.23), PALACE_BASE_Y + 0.23 - t * 0.22, 1.03 + t * 0.82);
      approach.add(jewel);
    }

    const rail = mesh(new THREE.BoxGeometry(0.025, 0.025, 1.08), materials.gold, 'vault-palace-grand-garden-stair-gold-rail');
    rail.position.set(side * 0.62, PALACE_BASE_Y + 0.17, 1.44);
    rail.rotation.x = -0.27;
    rail.rotation.y = side * -0.16;
    approach.add(rail);
  }

  parent.add(approach);
}

function addPalace(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const palace = new THREE.Group();
  palace.name = 'vault-palace';

  const shell = mesh(createPalaceShellGeometry(1.36), [materials.marbleLight, materials.window], 'vault-palace-continuous-stepped-shell');
  shell.position.set(0, PALACE_BASE_Y, -0.02);
  palace.add(shell);

  for (const side of [-1, 1] as const) {
    const floorCornice = mesh(new THREE.BoxGeometry(0.92, 0.11, 1.52), materials.limestone, 'vault-palace-floor-separation-cornice');
    floorCornice.position.set(side * 0.93, PALACE_BASE_Y + 1.04, -0.02);
    palace.add(floorCornice);

    const goldLip = mesh(new THREE.BoxGeometry(0.94, 0.045, 0.055), materials.gold, 'vault-palace-floor-separation-gold-lip');
    goldLip.position.set(side * 0.93, PALACE_BASE_Y + 1.06, 0.76);
    palace.add(goldLip);

    const wing = mesh(new THREE.BoxGeometry(0.44, 0.9, 1.04), materials.marbleLight, 'vault-palace-attached-side-wing');
    wing.position.set(side * 1.44, PALACE_BASE_Y + 0.46, -0.04);
    palace.add(wing);
  }

  const crownRoof = mesh(new THREE.BoxGeometry(1.62, 0.12, 1.48), materials.marbleLight, 'vault-palace-upper-keep-gold-trim');
  crownRoof.position.set(0, PALACE_BASE_Y + 2.02, -0.08);
  palace.add(crownRoof);

  const crownGoldLip = mesh(new THREE.BoxGeometry(1.66, 0.05, 0.055), materials.gold, 'vault-palace-upper-roof-front-gold-lip');
  crownGoldLip.position.set(0, PALACE_BASE_Y + 2.04, 0.67);
  palace.add(crownGoldLip);

  const domeDrum = createCylinder(0.72, 0.78, 0.34, segmentCount(quality, 16, 24, 36), materials.marbleLight, 'vault-palace-main-dome-drum');
  domeDrum.position.set(0, PALACE_BASE_Y + 2.18, -0.08);
  palace.add(domeDrum);
  const domeDrumBand = createGoldBand(0.75, 0.028, materials.gold, quality, 'vault-palace-main-dome-drum-gold-band');
  domeDrumBand.position.set(0, PALACE_BASE_Y + 2.34, -0.08);
  palace.add(domeDrumBand);

  addDome(palace, materials, 0, PALACE_BASE_Y + 2.37, -0.08, 0.82, quality);
  addTower(palace, materials, -1.2, -0.38, PALACE_BASE_Y, 2.08, 0.34, quality);
  addTower(palace, materials, 1.2, -0.38, PALACE_BASE_Y, 2.08, 0.34, quality);
  addTower(palace, materials, -1.28, 0.42, PALACE_BASE_Y, 1.88, 0.32, quality);
  addTower(palace, materials, 1.28, 0.42, PALACE_BASE_Y, 1.88, 0.32, quality);
  addTower(palace, materials, -0.7, 0.3, PALACE_BASE_Y + 1.02, 1.04, 0.17, quality);
  addTower(palace, materials, 0.7, 0.3, PALACE_BASE_Y + 1.02, 1.04, 0.17, quality);
  addPalaceCrownTurrets(palace, materials, quality);
  addPalaceAtriumEntry(palace, materials, quality);
  addPalaceCeremonialFacade(palace, materials, quality);
  addPalaceGardenApproach(palace, materials, quality);

  const windowRows = [
    { y: PALACE_BASE_Y + 0.26, count: 7, spacing: 0.35, width: 0.22, sideHeight: 0.34 },
    { y: PALACE_BASE_Y + 1.2, count: 7, spacing: 0.31, width: 0.19, sideHeight: 0.3 },
  ];
  windowRows.forEach((row, rowIndex) => {
    for (let index = 0; index < row.count; index += 1) {
      const x = (index - (row.count - 1) / 2) * row.spacing;
      if (Math.abs(x) < 0.42) continue;
      addPalaceArchedWindow(
        palace,
        materials,
        quality,
        x,
        row.y,
        0.695,
        row.width,
        row.sideHeight,
        rowIndex === 0 ? 'vault-palace-lower-arched-window' : 'vault-palace-upper-arched-window',
      );
    }
  });

  for (const side of [-1, 1] as const) {
    addPalaceArchedWindow(palace, materials, quality, side * 1.46, PALACE_BASE_Y + 0.28, 0.49, 0.17, 0.28, 'vault-palace-wing-arched-window');
  }

  for (const x of [-1.08, -0.82, 0.82, 1.08]) {
    const buttress = createCylinder(0.04, 0.065, 0.86, 6, materials.gold, 'vault-palace-lower-facade-buttress');
    buttress.position.set(x, PALACE_BASE_Y + 0.46, 0.72);
    palace.add(buttress);
  }

  for (const x of [-0.65, -0.43, 0.43, 0.65]) {
    const buttress = createCylinder(0.03, 0.048, 0.72, 6, materials.gold, 'vault-palace-upper-facade-buttress');
    buttress.position.set(x, PALACE_BASE_Y + 1.47, 0.72);
    palace.add(buttress);
  }

  for (const x of [-0.82, -0.55, -0.28, 0, 0.28, 0.55, 0.82]) {
    const finial = mesh(new THREE.OctahedronGeometry(0.055, 0), x === 0 ? materials.glassCyan : materials.gold, 'vault-palace-roofline-finial');
    finial.position.set(x, PALACE_BASE_Y + 2.13, 0.62);
    palace.add(finial);
  }

  for (let index = 0; index < 10; index += 1) {
    const x = -1.34 + index * (2.68 / 9);
    if (Math.abs(x) < 0.46) continue;
    const column = createCylinder(0.02, 0.03, 0.34, 6, materials.gold, 'vault-palace-balcony-gold-column');
    column.position.set(x, PALACE_BASE_Y + 1.19, 0.79);
    palace.add(column);
  }

  parent.add(palace);
}

function addBraceletRing(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const ring = new THREE.Group();
  ring.name = 'vault-bracelet-ring';
  ring.position.y = 1.96;
  ring.add(createGoldBand(2.4, 0.13, materials.silver, quality, 'vault-bracelet-polished-silver-core'));
  const upperRail = createGoldBand(2.4, 0.045, materials.gold, quality, 'vault-bracelet-upper-gold-rail');
  upperRail.position.y = 0.19;
  ring.add(upperRail);
  const lowerRail = createGoldBand(2.4, 0.045, materials.gold, quality, 'vault-bracelet-lower-gold-rail');
  lowerRail.position.y = -0.19;
  ring.add(lowerRail);

  const panels = quality === 'low' ? 18 : quality === 'medium' ? 28 : 40;
  for (let index = 0; index < panels; index += 1) {
    const angle = (index / panels) * Math.PI * 2;
    const isGem = index % 7 === 0;
    const isBlue = index % 3 === 0;
    const panel = mesh(
      new THREE.BoxGeometry(0.34, 0.34, 0.13),
      isGem ? (isBlue ? materials.glassCyan : materials.gemPurple) : materials.silver,
      isGem ? 'vault-bracelet-gem-node' : 'vault-bracelet-white-lattice-panel',
    );
    panel.position.set(Math.sin(angle) * 2.38, 0, Math.cos(angle) * 2.38);
    panel.rotation.y = angle;
    panel.rotation.z = index % 2 === 0 ? 0.12 : -0.12;
    ring.add(panel);

    if (quality === 'high' && !isGem) {
      const slash = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.14), materials.gold, 'vault-bracelet-diagonal-lattice');
      slash.position.copy(panel.position);
      slash.rotation.set(0, angle, index % 2 === 0 ? 0.72 : -0.72);
      ring.add(slash);
      const crossSlash = slash.clone();
      crossSlash.name = 'vault-bracelet-cross-diagonal-lattice';
      crossSlash.rotation.set(0, angle, index % 2 === 0 ? -0.72 : 0.72);
      ring.add(crossSlash);
    }
  }

  for (let index = 0; index < 13; index += 1) {
    const angle = -Math.PI * 0.29 + (index / 12) * Math.PI * 0.58;
    const x = Math.sin(angle) * 2.5;
    const z = Math.cos(angle) * 2.5;
    const chain = createCylinder(0.012, 0.012, 0.55 + (index % 3) * 0.08, 6, materials.gold, 'vault-hanging-charm-chain');
    chain.position.set(x, -0.34, z);
    chain.rotation.z = 0;
    ring.add(chain);

    const charmMaterial = index % 3 === 0 ? materials.gemPurple : index % 3 === 1 ? materials.glassCyan : materials.gold;
    const charm = mesh(new THREE.OctahedronGeometry(0.12 + (index % 2) * 0.035, 0), charmMaterial, 'vault-hanging-gem-charm');
    charm.position.set(x, -0.68 - (index % 3) * 0.08, z);
    ring.add(charm);

    if (index % 3 === 0) {
      const medallion = mesh(new THREE.TorusGeometry(0.17, 0.028, 7, 32), materials.gold, 'vault-hanging-charm-medallion-frame');
      medallion.position.set(x, -0.68 - (index % 3) * 0.08, z + 0.015);
      medallion.rotation.y = angle;
      ring.add(medallion);
    }
  }

  parent.add(ring);
}

function addVaultFacade(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const facade = new THREE.Group();
  facade.name = 'vault-front-facade';
  facade.position.set(0, 0.03, 2.34);

  const frontWall = mesh(new THREE.BoxGeometry(1.94, 1.28, 0.22), materials.marbleLight, 'vault-front-white-stone-wall');
  frontWall.position.y = 0.66;
  facade.add(frontWall);

  const blueInset = mesh(new THREE.BoxGeometry(1.62, 1.02, 0.045), materials.enamelBlue, 'vault-front-blue-enamel-inset');
  blueInset.position.set(0, 0.64, 0.12);
  facade.add(blueInset);

  const arch = mesh(new THREE.TorusGeometry(0.52, 0.04, 8, segmentCount(quality, 36, 54, 72), Math.PI), materials.gold, 'vault-front-gold-arch');
  arch.position.set(0, 0.88, 0.18);
  facade.add(arch);

  const door = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, segmentCount(quality, 18, 28, 40)), materials.darkGold, 'vault-front-round-door');
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.58, 0.15);
  facade.add(door);

  const doorGlow = mesh(new THREE.CircleGeometry(0.31, segmentCount(quality, 18, 28, 40)), materials.warmGlow, 'vault-front-interior-gold-glow');
  doorGlow.position.set(0, 0.58, 0.202);
  facade.add(doorGlow);

  const dial = mesh(new THREE.TorusGeometry(0.2, 0.025, 6, segmentCount(quality, 18, 24, 32)), materials.gold, 'vault-front-radial-dial');
  dial.position.set(0, 0.58, 0.205);
  facade.add(dial);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.018, 0.18, 0.012), materials.gold, 'vault-front-dial-spoke');
    spoke.position.set(Math.cos(angle) * 0.09, 0.58 + Math.sin(angle) * 0.09, 0.215);
    spoke.rotation.z = angle;
    facade.add(spoke);
  }

  for (const side of [-1, 1]) {
    const caseBaseX = side * 0.55;
    for (let row = 0; row < 2; row += 1) {
      const plinth = mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), materials.gold, 'vault-front-treasure-plinth');
      plinth.position.set(caseBaseX, 0.22 + row * 0.48, 0.17);
      const gem = mesh(new THREE.OctahedronGeometry(0.09, 0), row % 2 === 0 ? materials.glassCyan : materials.gemPurple, 'vault-front-display-gem');
      gem.position.set(caseBaseX, 0.35 + row * 0.48, 0.21);
      facade.add(plinth, gem);
    }

    const column = createCylinder(0.035, 0.05, 0.84, 8, materials.gold, 'vault-front-fluted-gold-column');
    column.position.set(side * 0.88, 0.66, 0.17);
    facade.add(column);
  }

  const cornice = mesh(new THREE.BoxGeometry(2.1, 0.1, 0.32), materials.gold, 'vault-front-upper-cornice');
  cornice.position.set(0, 1.28, 0.08);
  facade.add(cornice);

  parent.add(facade);
}

function addLuxuryArcade(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const arcade = new THREE.Group();
  arcade.name = 'vault-terrace-luxury-arcade';
  const count = quality === 'low' ? 7 : quality === 'medium' ? 9 : 11;

  for (const rowY of [0.38, 0.98]) {
    for (let index = 0; index < count; index += 1) {
      const angle = -1.28 + (index / (count - 1)) * 2.56;
      const radius = 2.4;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const bay = new THREE.Group();
      bay.name = 'vault-arcade-gold-and-shadow-bay';
      bay.position.set(x, rowY, z);
      bay.rotation.y = angle;

      const shadow = mesh(new THREE.BoxGeometry(0.3, 0.42, 0.045), materials.window, 'vault-arcade-deep-treasure-recess');
      shadow.position.set(0, 0.08, 0.02);
      const glow = mesh(new THREE.CircleGeometry(0.12, segmentCount(quality, 12, 18, 24)), materials.warmGlow, 'vault-arcade-treasure-case-warm-glow');
      glow.position.set(0, 0.08, 0.052);
      const arch = mesh(new THREE.TorusGeometry(0.15, 0.018, 6, segmentCount(quality, 18, 28, 36), Math.PI), materials.gold, 'vault-arcade-gold-arch');
      arch.position.set(0, 0.29, 0.06);
      const lintel = mesh(new THREE.BoxGeometry(0.34, 0.045, 0.06), materials.gold, 'vault-arcade-gold-lintel');
      lintel.position.set(0, 0.29, 0.04);
      const left = createCylinder(0.014, 0.02, 0.4, 6, materials.gold, 'vault-arcade-gold-column');
      left.position.set(-0.16, 0.08, 0.06);
      const right = createCylinder(0.014, 0.02, 0.4, 6, materials.gold, 'vault-arcade-gold-column');
      right.position.set(0.16, 0.08, 0.06);
      const plinth = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.07), materials.gold, 'vault-arcade-treasure-plinth');
      plinth.position.set(0, -0.08, 0.075);
      const treasure = mesh(
        new THREE.OctahedronGeometry(index % 3 === 0 ? 0.075 : 0.055, 0),
        index % 3 === 0 ? materials.gemPurple : index % 3 === 1 ? materials.glassCyan : materials.ruby,
        'vault-arcade-visible-treasure-relic',
      );
      treasure.position.set(0, 0.02, 0.09);
      bay.add(shadow, glow, arch, lintel, left, right, plinth, treasure);
      arcade.add(bay);
    }
  }

  parent.add(arcade);
}

function addTerraceJewelwork(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const jewelwork = new THREE.Group();
  jewelwork.name = 'vault-terrace-jewel-mosaic-and-coin-fields';
  const radialCount = quality === 'low' ? 12 : quality === 'medium' ? 18 : 28;

  for (let index = 0; index < radialCount; index += 1) {
    const angle = (index / radialCount) * Math.PI * 2;
    const spoke = mesh(new THREE.BoxGeometry(0.035, 0.018, 0.62), index % 3 === 0 ? materials.darkGold : materials.gold, 'vault-terrace-radial-gold-inlay');
    spoke.position.set(Math.sin(angle) * 1.18, GARDEN_TERRACE_Y + 0.015, Math.cos(angle) * 1.18);
    spoke.rotation.y = angle;
    jewelwork.add(spoke);
  }

  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2 + 0.05;
    const radius = index % 2 === 0 ? 1.76 : 1.94;
    const gem = mesh(
      new THREE.OctahedronGeometry(index % 5 === 0 ? 0.055 : 0.035, 0),
      index % 4 === 0 ? materials.ruby : index % 4 === 1 ? materials.glassCyan : index % 4 === 2 ? materials.emerald : materials.gemPurple,
      'vault-terrace-set-jewel',
    );
    gem.position.set(Math.sin(angle) * radius, GARDEN_TERRACE_Y + 0.05, Math.cos(angle) * radius);
    jewelwork.add(gem);
  }

  for (let index = 0; index < 38; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const coin = createCylinder(0.036, 0.036, 0.012, segmentCount(quality, 8, 10, 14), index % 7 === 0 ? materials.darkGold : materials.gold, 'vault-terrace-loose-gold-coin');
    coin.position.set(side * (0.52 + (index % 8) * 0.08), GARDEN_TERRACE_Y + 0.03 + (index % 4) * 0.012, 1.0 + Math.floor(index / 8) * 0.13);
    coin.rotation.set(Math.PI / 2 + (index % 3) * 0.05, index * 0.37, 0);
    jewelwork.add(coin);
  }

  parent.add(jewelwork);
}

function addCrystalWaterfalls(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const falls = new THREE.Group();
  falls.name = 'vault-front-crystal-waterfall-veils';
  const fallsData = [
    [-1.32, 2.18, 1.08],
    [1.32, 2.18, 1.08],
    [0, 2.46, 0.94],
  ] as const;

  fallsData.forEach(([x, z, height], index) => {
    const fall = mesh(new THREE.BoxGeometry(0.18 + index * 0.04, height, 0.025), materials.waterVeil, 'vault-front-cyan-waterfall-veil');
    fall.position.set(x, CLIFF_TOP_Y - height / 2, z);
    fall.rotation.x = -0.12;
    falls.add(fall);

    const foam = mesh(new THREE.RingGeometry(0.16, 0.29, segmentCount(quality, 18, 24, 32)), materials.seaFoam, 'vault-front-waterfall-foam-ring');
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(x, 0.05, z + 0.12);
    falls.add(foam);
  });

  parent.add(falls);
}

function addMiniCrown(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const crown = new THREE.Group();
  crown.name = 'vault-museum-mini-crown';
  const band = createGoldBand(0.14, 0.018, materials.gold, quality, 'vault-museum-crown-band');
  band.position.y = 0.19;
  crown.add(band);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const spike = createCylinder(0.008, 0.014, index % 2 === 0 ? 0.22 : 0.16, 5, materials.gold, 'vault-museum-crown-spike');
    spike.position.set(Math.sin(angle) * 0.13, 0.29, Math.cos(angle) * 0.13);
    crown.add(spike);
    const gem = mesh(
      new THREE.OctahedronGeometry(index % 2 === 0 ? 0.032 : 0.024, 0),
      index % 2 === 0 ? materials.gemPurple : materials.glassCyan,
      'vault-museum-crown-gem',
    );
    gem.position.set(Math.sin(angle) * 0.13, index % 2 === 0 ? 0.43 : 0.36, Math.cos(angle) * 0.13);
    crown.add(gem);
  }
  parent.add(crown);
}

function addMiniCoinPile(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const pile = new THREE.Group();
  pile.name = 'vault-museum-mini-coin-pile';
  for (let index = 0; index < 11; index += 1) {
    const coin = createCylinder(0.054, 0.054, 0.014, segmentCount(quality, 10, 14, 18), index % 5 === 0 ? materials.darkGold : materials.gold, 'vault-museum-stacked-coin');
    coin.position.set(((index % 4) - 1.5) * 0.045, 0.17 + Math.floor(index / 4) * 0.017, (Math.floor(index / 2) % 3 - 1) * 0.04);
    coin.rotation.y = index * 0.4;
    pile.add(coin);
  }
  const gem = mesh(new THREE.OctahedronGeometry(0.045, 0), materials.emerald, 'vault-museum-coin-pile-emerald');
  gem.position.set(0.05, 0.26, 0.04);
  pile.add(gem);
  parent.add(pile);
}

function addMiniCrystal(parent: THREE.Group, materials: VaultMaterials) {
  const crystal = mesh(new THREE.ConeGeometry(0.09, 0.34, 6), materials.glassCyan, 'vault-museum-mini-crystal-spire');
  crystal.position.y = 0.3;
  const base = createCylinder(0.1, 0.13, 0.08, 6, materials.gold, 'vault-museum-crystal-base');
  base.position.y = 0.16;
  parent.add(base, crystal);
}

function addMiniEgg(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const egg = mesh(new THREE.SphereGeometry(0.095, segmentCount(quality, 14, 18, 24), segmentCount(quality, 10, 14, 16)), materials.gemPurple, 'vault-museum-mini-jeweled-egg');
  egg.scale.set(0.82, 1.24, 0.82);
  egg.position.y = 0.25;
  const cage = createGoldBand(0.085, 0.008, materials.gold, quality, 'vault-museum-egg-gold-cage');
  cage.position.y = 0.25;
  parent.add(egg, cage);
}

function addMuseumDisplays(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const museum = new THREE.Group();
  museum.name = 'vault-open-air-museum-displays';
  museum.userData.sculptRuntime = {
    futureGameplayRole: 'treasure-placement-sockets',
    supportedTreasureTypes: ['relic', 'charm', 'currency-pile', 'riddle-prize'],
  };

  const displays = [
    { angle: -0.95, kind: 'crown' },
    { angle: -0.42, kind: 'coins' },
    { angle: 0.42, kind: 'crystal' },
    { angle: 0.95, kind: 'egg' },
  ] as const;

  displays.forEach((display) => {
    const socket = new THREE.Group();
    socket.name = `vault-museum-socket-${display.kind}`;
    socket.position.set(Math.sin(display.angle) * 1.46, GARDEN_TERRACE_Y - 0.04, Math.cos(display.angle) * 1.46);
    socket.rotation.y = display.angle;

    const pedestal = createCylinder(0.18, 0.23, 0.24, segmentCount(quality, 10, 14, 18), materials.marbleLight, 'vault-museum-display-pedestal');
    pedestal.position.y = 0.06;
    const trim = createGoldBand(0.18, 0.012, materials.gold, quality, 'vault-museum-display-gold-rim');
    trim.position.y = 0.18;
    const spotlight = mesh(new THREE.CircleGeometry(0.28, segmentCount(quality, 18, 24, 32)), materials.warmGlow, 'vault-museum-display-glow-disc');
    spotlight.rotation.x = -Math.PI / 2;
    spotlight.position.y = 0.195;
    socket.add(pedestal, trim, spotlight);

    if (display.kind === 'crown') addMiniCrown(socket, materials, quality);
    if (display.kind === 'coins') addMiniCoinPile(socket, materials, quality);
    if (display.kind === 'crystal') addMiniCrystal(socket, materials);
    if (display.kind === 'egg') addMiniEgg(socket, materials, quality);
    museum.add(socket);
  });

  parent.add(museum);
}

function addGrandCliffVaultEntry(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const entry = new THREE.Group();
  entry.name = 'vault-cliff-grand-entry';
  entry.position.set(0, 0.32, 2.55);

  const shadowPocket = mesh(new THREE.CircleGeometry(0.5, segmentCount(quality, 24, 36, 52)), materials.window, 'vault-cliff-entry-dark-pocket');
  shadowPocket.position.set(0, 0.2, 0.035);
  entry.add(shadowPocket);

  const ring = mesh(new THREE.TorusGeometry(0.5, 0.055, 8, segmentCount(quality, 40, 64, 88)), materials.gold, 'vault-cliff-entry-huge-gold-ring');
  ring.position.set(0, 0.2, 0.075);
  entry.add(ring);

  const innerDoor = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.055, segmentCount(quality, 24, 36, 52)), materials.enamelBlue, 'vault-cliff-entry-blue-round-door');
  innerDoor.rotation.x = Math.PI / 2;
  innerDoor.position.set(0, 0.2, 0.08);
  entry.add(innerDoor);

  const glow = mesh(new THREE.CircleGeometry(0.28, segmentCount(quality, 18, 28, 40)), materials.warmGlow, 'vault-cliff-entry-open-gold-glow');
  glow.position.set(0, 0.2, 0.112);
  entry.add(glow);

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const bolt = mesh(new THREE.BoxGeometry(0.04, 0.11, 0.026), index % 4 === 0 ? materials.glassCyan : materials.gold, 'vault-cliff-entry-radial-bolt');
    bolt.position.set(Math.sin(angle) * 0.38, 0.2 + Math.cos(angle) * 0.38, 0.13);
    bolt.rotation.z = -angle;
    entry.add(bolt);
  }

  for (const side of [-1, 1]) {
    const column = createCylinder(0.042, 0.06, 0.9, 8, materials.gold, 'vault-cliff-entry-gold-column');
    column.position.set(side * 0.68, 0.22, 0.08);
    entry.add(column);
    const flame = mesh(new THREE.OctahedronGeometry(0.11, 0), side < 0 ? materials.ruby : materials.glassCyan, 'vault-cliff-entry-jewel-flame');
    flame.position.set(side * 0.68, 0.72, 0.12);
    entry.add(flame);
  }

  parent.add(entry);
}

function addStairsAndGate(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const approach = new THREE.Group();
  approach.name = 'vault-marina-approach';
  const causeway = mesh(new THREE.BoxGeometry(0.72, 0.08, 1.35), materials.marbleLight, 'vault-front-marble-causeway');
  causeway.position.set(0, 0.11, 3.22);
  approach.add(causeway);

  for (let index = 0; index < 8; index += 1) {
    const angle = index % 2 === 0 ? -0.22 : 0.22;
    const rail = createCylinder(0.018, 0.024, 0.46, 6, materials.gold, 'vault-front-causeway-gold-post');
    rail.position.set(index % 2 === 0 ? -0.46 : 0.46, 0.32, 2.78 + Math.floor(index / 2) * 0.26);
    approach.add(rail);
    const gem = mesh(new THREE.OctahedronGeometry(0.045, 0), index % 3 === 0 ? materials.ruby : materials.glassCyan, 'vault-front-causeway-post-gem');
    gem.position.set(index % 2 === 0 ? -0.46 : 0.46, 0.58, 2.78 + Math.floor(index / 2) * 0.26);
    gem.rotation.y = angle;
    approach.add(gem);
  }

  for (let index = 0; index < 10; index += 1) {
    const step = mesh(new THREE.BoxGeometry(0.92 + index * 0.09, 0.065, 0.18), materials.marbleLight, 'vault-front-stair-step');
    step.position.set(0, 0.08 + index * 0.055, 2.5 + index * 0.1);
    approach.add(step);
  }

  const gateBar = mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), materials.gold, 'vault-marina-gate-bar');
  gateBar.position.set(0, 0.34, 3.26);
  approach.add(gateBar);
  for (const x of [-0.9, -0.45, 0, 0.45, 0.9]) {
    const picket = createCylinder(0.025, 0.025, 0.52, 6, materials.gold, 'vault-marina-gate-picket');
    picket.position.set(x, 0.34, 3.26);
    approach.add(picket);
  }
  const crest = mesh(new THREE.OctahedronGeometry(0.13, 0), materials.enamelBlue, 'vault-marina-gate-star-crest');
  crest.position.set(0, 0.45, 3.2);
  approach.add(crest);
  parent.add(approach);
}

function addCliffAshlarMasonry(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const masonry = new THREE.Group();
  masonry.name = 'vault-cliff-staggered-cut-ashlar-masonry';
  const courseYs = [0.18, 0.4, 0.62, 0.84, 1.06, 1.28];
  const jointCount = segmentCount(quality, 18, 24, 32);

  courseYs.forEach((courseY, rowIndex) => {
    const courseLine = createGoldBand(2.545, 0.012, materials.limestoneShade, quality, 'vault-cliff-ashlar-horizontal-course');
    courseLine.position.y = courseY + 0.1;
    masonry.add(courseLine);

    for (let index = 0; index < jointCount; index += 1) {
      const angle = ((index + (rowIndex % 2) * 0.5) / jointCount) * Math.PI * 2;
      const joint = mesh(new THREE.BoxGeometry(0.018, 0.18, 0.03), materials.limestoneShade, 'vault-cliff-ashlar-staggered-joint');
      joint.position.set(Math.sin(angle) * 2.555, courseY, Math.cos(angle) * 2.555);
      joint.rotation.y = angle;
      masonry.add(joint);
    }
  });

  parent.add(masonry);
}

function addIslandBase(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const segments = segmentCount(quality, 40, 64, 96);
  const base = createCylinder(2.3, 2.55, 1.38, segments, materials.limestoneShade, 'vault-circular-stone-base');
  base.position.y = 0.63;
  parent.add(base);

  const lowerFloorBand = createGoldBand(2.43, 0.025, materials.gold, quality, 'vault-cliff-lower-floor-gold-band');
  lowerFloorBand.position.y = 0.69;
  parent.add(lowerFloorBand);

  const upperFloorBand = createGoldBand(2.35, 0.032, materials.gold, quality, 'vault-cliff-upper-floor-gold-band');
  upperFloorBand.position.y = 1.28;
  parent.add(upperFloorBand);

  const terrace = createCylinder(2.12, 2.28, 0.24, segments, materials.marbleLight, 'vault-upper-terrace');
  terrace.position.y = 1.48;
  parent.add(terrace);

  const middleTerrace = createCylinder(1.78, 1.94, 0.16, segments, materials.limestone, 'vault-middle-stepped-terrace');
  middleTerrace.position.y = 1.61;
  parent.add(middleTerrace);

  const garden = createCylinder(1.54, 1.6, 0.08, segments, materials.distantIsland, 'vault-inner-garden-ring');
  garden.position.y = GARDEN_TERRACE_Y;
  parent.add(garden);

  parent.add(createGoldBand(2.08, 0.035, materials.gold, quality, 'vault-terrace-gold-trim'));
  parent.children[parent.children.length - 1].position.y = 1.57;

  const innerTrim = createGoldBand(1.58, 0.024, materials.gold, quality, 'vault-inner-garden-gold-trim');
  innerTrim.position.y = GARDEN_TERRACE_Y + 0.05;
  parent.add(innerTrim);

  addLuxuryArcade(parent, materials, quality);
  addCliffAshlarMasonry(parent, materials, quality);
  addTerraceJewelwork(parent, materials, quality);
  addCrystalWaterfalls(parent, materials, quality);
}

function addBoat(parent: THREE.Group, materials: VaultMaterials, x: number, z: number, scale: number, rotation: number) {
  const boat = new THREE.Group();
  boat.name = 'vault-ocean-sailboat';
  boat.position.set(x, 0.02, z);
  boat.rotation.y = rotation;
  boat.scale.setScalar(scale);

  const hull = mesh(new THREE.BoxGeometry(0.46, 0.11, 0.18), materials.darkGold, 'vault-boat-hull');
  hull.position.y = 0.04;
  const mast = createCylinder(0.01, 0.012, 0.52, 5, materials.gold, 'vault-boat-mast');
  mast.position.y = 0.34;
  const sail = mesh(new THREE.ConeGeometry(0.22, 0.48, 3), materials.sail, 'vault-boat-triangle-sail');
  sail.position.set(0.12, 0.36, 0);
  sail.rotation.z = Math.PI * 0.5;
  boat.add(hull, mast, sail);
  parent.add(boat);
}

function addEnvironment(parent: THREE.Group, materials: VaultMaterials, quality: VaultIslandQuality) {
  const ocean = mesh(new THREE.CircleGeometry(8.5, segmentCount(quality, 48, 80, 112)), materials.ocean, 'vault-ocean-disc');
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.03;
  ocean.receiveShadow = true;
  ocean.castShadow = false;
  parent.add(ocean);

  for (let index = 0; index < 6; index += 1) {
    const wake = mesh(new THREE.RingGeometry(2.9 + index * 0.58, 2.92 + index * 0.58, segmentCount(quality, 48, 72, 96)), materials.seaFoam, 'vault-ocean-soft-foam-ring');
    wake.rotation.x = -Math.PI / 2;
    wake.position.y = -0.018 + index * 0.001;
    wake.rotation.z = index * 0.41;
    parent.add(wake);
  }

  for (const [x, z, s] of [[-4.2, -2.8, 0.52], [3.8, -2.35, 0.44], [4.6, 1.2, 0.36], [-3.6, 1.7, 0.3]] as const) {
    const island = createCylinder(0.44 * s, 0.52 * s, 0.1, 14, materials.distantIsland, 'vault-distant-island');
    island.position.set(x, 0.02, z);
    parent.add(island);
  }

  addBoat(parent, materials, -3.35, 3.25, 0.95, -0.7);
  addBoat(parent, materials, 3.2, 2.8, 0.62, 0.82);
  addBoat(parent, materials, -2.8, -1.65, 0.5, 0.2);
}

export function createVaultTreasureIslandModel(options: VaultTreasureIslandOptions = {}): VaultTreasureIslandRuntime {
  // The rejected v025 family remains below as an immediate recovery path while the lab uses v2.
  const useSourceLedV2 = true;
  if (useSourceLedV2) return createVaultTreasureIslandModelV2(options);
  const quality = options.quality ?? 'medium';
  const materials = createVaultMaterials();
  const root = new THREE.Group();
  root.name = 'vault-treasure-island-lab-model';
  root.userData.sculptRuntime = {
    id: 'vault-treasure-island-lab',
    sourceSha256: '5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57',
    status: 'exterior-source-detail-family-003-correction-001',
    hiddenGeometryConfidence: 'inferred-from-single-front-view',
  };

  addEnvironment(root, materials, quality);
  addIslandBase(root, materials, quality);
  addBraceletRing(root, materials, quality);
  addMuseumDisplays(root, materials, quality);
  addPalace(root, materials, quality);
  addVaultFacade(root, materials, quality);
  addStairsAndGate(root, materials, quality);

  const waveTarget = root.getObjectByName('vault-ocean-disc');
  const bracelet = root.getObjectByName('vault-bracelet-ring');
  const charms: THREE.Object3D[] = [];
  const museumObjects: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child.name === 'vault-hanging-gem-charm') {
      child.userData.baseY = child.position.y;
      charms.push(child);
    }
    if (child.name.startsWith('vault-museum-mini-') || child.name === 'vault-museum-crown-gem') {
      child.userData.baseY = child.position.y;
      museumObjects.push(child);
    }
  });

  return {
    root,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      if (waveTarget) waveTarget.rotation.z = Math.sin(elapsedSeconds * 0.18) * 0.018;
      if (bracelet) bracelet.rotation.y = Math.sin(elapsedSeconds * 0.32) * 0.018;
      charms.forEach((charm, index) => {
        charm.position.y = Number(charm.userData.baseY) + Math.sin(elapsedSeconds * 1.4 + index) * 0.035;
        charm.rotation.y += 0.008;
      });
      museumObjects.forEach((object, index) => {
        object.rotation.y += 0.003 + (index % 3) * 0.0015;
      });
    },
    dispose: () => {
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
