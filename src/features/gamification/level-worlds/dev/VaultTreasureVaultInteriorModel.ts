import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createVaultTreasureModel,
  VAULT_TREASURE_DEFINITIONS,
  type VaultTreasureId,
  type VaultTreasureModel,
} from './VaultTreasureModels';
import { VAULT_TREASURE_PLACEMENT_SOCKETS } from './VaultIslandLabContract';
import { createVaultSurfacePatternTexture } from './VaultPremiumLookdev';
import type { VaultIslandQuality, VaultTreasureIslandRuntime } from './VaultTreasureIslandModel';
import { createVaultPalaceAtriumArchitectureV3 } from './VaultTreasureInteriorArchitectureV3';
import {
  resolveVaultIslandWealthDisplay,
  type VaultIslandWealthDisplay,
} from '../services/islandRunVaultCollection';

export interface VaultTreasureVaultInteriorOptions {
  quality?: VaultIslandQuality;
  animated?: boolean;
  unlockedTreasureIds?: readonly VaultTreasureId[];
  holdingsValue?: number;
}

type VaultInteriorMaterials = ReturnType<typeof createVaultInteriorMaterials>;

function tuneBlenderInteriorMaterials(root: THREE.Object3D, lookdev: VaultInteriorMaterials) {
  root.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const name = material.name.toLowerCase();
      material.envMapIntensity = name.includes('gold') || name.includes('silver') ? 2.1 : 1.28;
      material.side = name.includes('dome') || name.includes('enamel') ? THREE.DoubleSide : THREE.FrontSide;
      if (name.includes('white-marble') || name.includes('pearl-marble')) {
        material.color.set('#e8dfcd');
        material.bumpMap = lookdev.marblePattern;
        material.bumpScale = 0.012;
        material.roughness = 0.24;
      } else if (name.includes('shadow-marble')) {
        material.color.set('#8e897e');
        material.bumpMap = lookdev.masonryPattern;
        material.bumpScale = 0.016;
        material.roughness = 0.3;
      } else if (name.includes('polished-gold')) {
        material.color.set('#e0a426');
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.018;
        material.metalness = 1;
        material.roughness = 0.095;
      } else if (name.includes('antique-gold') || name.includes('polished-silver')) {
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.014;
      } else if (name.includes('midnight-enamel')) {
        material.color.set('#072d68');
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.005;
        material.roughness = 0.11;
      } else if (name.includes('sapphire-enamel')) {
        material.color.set('#0b5b8b');
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.005;
        material.roughness = 0.1;
      }
      material.needsUpdate = true;
    });
  });
}

function loadBlenderInteriorArchitecture(
  root: THREE.Group,
  fallback: THREE.Object3D,
  assetPath: string,
  sceneName: string,
  lookdev: VaultInteriorMaterials,
) {
  let loaded: THREE.Object3D | null = null;
  if (typeof window === 'undefined') return () => undefined;
  const loader = new GLTFLoader();
  loader.load(
    assetPath,
    (gltf) => {
      loaded = gltf.scene;
      loaded.name = sceneName;
      // Blender's authored front is -Y; the glTF Y-up conversion maps it to +Z.
      loaded.rotation.y = Math.PI;
      tuneBlenderInteriorMaterials(loaded, lookdev);
      root.add(loaded);
      fallback.visible = false;
      root.userData.architectureReady = true;
      root.userData.architectureAsset = assetPath;
    },
    undefined,
    (error) => {
      root.userData.architectureReady = false;
      root.userData.architectureLoadError = error instanceof Error ? error.message : String(error);
      fallback.visible = true;
    },
  );
  return () => {
    if (loaded) root.remove(loaded);
    loaded = null;
  };
}

function addAtriumArchitecturalLights(root: THREE.Group, quality: VaultIslandQuality) {
  const entryLight = new THREE.PointLight('#ffd1a0', quality === 'low' ? 2.2 : 3.8, 7.2, 2);
  entryLight.name = 'vault-palace-atrium-royal-entry-light';
  entryLight.position.set(0, 4.9, -3.72);
  root.add(entryLight);

  const descentLight = new THREE.PointLight('#46dfff', quality === 'low' ? 1.2 : 2.5, 4.2, 2);
  descentLight.name = 'vault-palace-atrium-descent-oculus-light';
  descentLight.position.set(0, 0.62, 0.72);
  root.add(descentLight);

  for (const side of [-1, 1]) {
    const gardenLight = new THREE.PointLight('#ffb65c', quality === 'low' ? 1.1 : 2.15, 4.8, 2);
    gardenLight.name = side < 0
      ? 'vault-palace-atrium-left-garden-portal-light'
      : 'vault-palace-atrium-right-garden-portal-light';
    gardenLight.position.set(side * 3.08, 1.42, -2.62);
    root.add(gardenLight);
  }
}

function addVaultMuseumLights(root: THREE.Group, quality: VaultIslandQuality) {
  const colors = ['#ffd28b', '#8deeff', '#ff879d'] as const;
  const angles = [-1.28, -0.92, -0.58, -0.2, 0.2, 0.58, 0.92, 1.28];
  angles.forEach((angle, index) => {
    if (quality === 'low' && index % 2 === 1) return;
    const light = new THREE.PointLight(colors[index % colors.length], quality === 'high' ? 1.05 : 0.78, 2.65, 2);
    light.name = `vault-interior-museum-display-light-${String(index).padStart(2, '0')}`;
    light.position.set(-Math.sin(angle) * 3.08, 2.14, -Math.cos(angle) * 3.08);
    root.add(light);
  });
}

function segmentCount(quality: VaultIslandQuality, low: number, medium: number, high: number) {
  if (quality === 'low') return low;
  if (quality === 'medium') return medium;
  return high;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
  const output = new THREE.Mesh(geometry, material);
  output.name = name;
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function createVaultInteriorMaterials() {
  const marblePattern = createVaultSurfacePatternTexture('VAULT_INTERIOR_MARBLE_VEIN', 'marble-vein', 3.2);
  const masonryPattern = createVaultSurfacePatternTexture('VAULT_INTERIOR_CUT_STONE', 'cut-stone', 4.5, 7.2);
  const metalPattern = createVaultSurfacePatternTexture('VAULT_INTERIOR_HAMMERED_METAL', 'hammered-metal', 5.2);
  return {
    marblePattern,
    masonryPattern,
    metalPattern,
    floor: new THREE.MeshPhysicalMaterial({ color: '#f3ead6', map: marblePattern, bumpMap: marblePattern, bumpScale: 0.028, roughness: 0.2, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.12, envMapIntensity: 0.9 }),
    floorShade: new THREE.MeshPhysicalMaterial({ color: '#17365a', map: marblePattern, bumpMap: marblePattern, bumpScale: 0.02, roughness: 0.18, metalness: 0.06, clearcoat: 0.92, clearcoatRoughness: 0.08, envMapIntensity: 1.05 }),
    wall: new THREE.MeshStandardMaterial({ color: '#d5c9b4', map: masonryPattern, bumpMap: masonryPattern, bumpScale: 0.035, roughness: 0.38, metalness: 0.01, envMapIntensity: 0.82, side: THREE.DoubleSide }),
    wallTrim: new THREE.MeshPhysicalMaterial({ color: '#152c4b', roughness: 0.22, metalness: 0.18, clearcoat: 0.72, clearcoatRoughness: 0.14, envMapIntensity: 1.05 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#f3b72e', map: metalPattern, bumpMap: metalPattern, bumpScale: 0.055, roughness: 0.16, metalness: 0.8, clearcoat: 0.7, clearcoatRoughness: 0.08, emissive: '#5f2300', emissiveIntensity: 0.1, envMapIntensity: 1.62 }),
    darkGold: new THREE.MeshPhysicalMaterial({ color: '#946019', map: metalPattern, bumpMap: metalPattern, bumpScale: 0.04, roughness: 0.28, metalness: 0.76, clearcoat: 0.45, envMapIntensity: 1.28 }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#e8f2ff', map: metalPattern, bumpMap: metalPattern, bumpScale: 0.032, roughness: 0.13, metalness: 0.88, clearcoat: 0.78, clearcoatRoughness: 0.06, envMapIntensity: 1.68 }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: '#ff4f73',
      roughness: 0.07,
      metalness: 0,
      transmission: 0.1,
      thickness: 0.28,
      clearcoat: 1,
      emissive: '#681024',
      emissiveIntensity: 0.26,
      envMapIntensity: 1.45,
    }),
    enamel: new THREE.MeshPhysicalMaterial({ color: '#0e2c60', roughness: 0.18, metalness: 0.1, clearcoat: 0.95, clearcoatRoughness: 0.08, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#bff8ff',
      roughness: 0.04,
      metalness: 0,
      transmission: 0.72,
      thickness: 0.3,
      clearcoat: 1,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      ior: 1.46,
      envMapIntensity: 1.6,
    }),
    cyanGem: new THREE.MeshPhysicalMaterial({
      color: '#7df5ff',
      roughness: 0.04,
      metalness: 0,
      transmission: 0.56,
      thickness: 0.46,
      clearcoat: 1,
      emissive: '#14596d',
      emissiveIntensity: 0.36,
      envMapIntensity: 1.55,
    }),
    violetGem: new THREE.MeshPhysicalMaterial({
      color: '#914aff',
      roughness: 0.06,
      metalness: 0,
      transmission: 0.18,
      thickness: 0.34,
      clearcoat: 1,
      emissive: '#3a1471',
      emissiveIntensity: 0.42,
      envMapIntensity: 1.5,
    }),
    emeraldGem: new THREE.MeshPhysicalMaterial({
      color: '#1cc58b',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.14,
      thickness: 0.32,
      clearcoat: 1,
      emissive: '#064a34',
      emissiveIntensity: 0.3,
      envMapIntensity: 1.5,
    }),
    warmGlow: new THREE.MeshBasicMaterial({
      color: '#ffdf8a',
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    cyanGlow: new THREE.MeshBasicMaterial({
      color: '#83f5ff',
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
  name: string,
) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, name);
}

function goldRing(radius: number, tube: number, materials: VaultInteriorMaterials, quality: VaultIslandQuality, name: string) {
  const ring = mesh(
    new THREE.TorusGeometry(radius, tube, segmentCount(quality, 8, 10, 12), segmentCount(quality, 48, 72, 96)),
    materials.gold,
    name,
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function addGlazedRadialFloorTiles(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
) {
  const tiles = new THREE.Group();
  tiles.name = 'vault-interior-glazed-marble-and-enamel-floor-tiles';
  const segmentTotal = quality === 'low' ? 16 : quality === 'medium' ? 20 : 24;
  const rings = [
    { inner: 0.2, outer: 0.82 },
    { inner: 0.86, outer: 1.54 },
    { inner: 1.58, outer: 2.34 },
  ];
  rings.forEach((ring, ringIndex) => {
    for (let index = 0; index < segmentTotal; index += 1) {
      const thetaLength = Math.PI * 2 / segmentTotal - 0.018;
      const tile = mesh(
        new THREE.RingGeometry(ring.inner, ring.outer, 4, 1, index * Math.PI * 2 / segmentTotal + 0.009, thetaLength),
        (index + ringIndex) % 3 === 0 ? materials.floorShade : materials.floor,
        (index + ringIndex) % 3 === 0
          ? 'vault-interior-midnight-enamel-radial-tile'
          : 'vault-interior-polished-marble-radial-tile',
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.y = 0.172 + ringIndex * 0.002;
      tile.receiveShadow = true;
      tiles.add(tile);
    }
  });
  parent.add(tiles);
}

function addCurvedAshlarMasonry(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const masonry = new THREE.Group();
  masonry.name = 'vault-interior-curved-cut-ashlar-masonry';
  const rows = quality === 'low' ? 5 : 7;
  const columns = quality === 'low' ? 9 : quality === 'medium' ? 11 : 13;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const angle = -0.93 + ((column + (row % 2) * 0.5) / Math.max(1, columns - 1)) * 1.86;
      const radius = 2.75;
      const block = mesh(
        new RoundedBoxGeometry(0.39, 0.27, 0.11, 2, 0.022),
        row % 3 === 1 && column % 4 === 0 ? materials.wallTrim : materials.wall,
        'vault-interior-individual-beveled-ashlar-block',
      );
      block.position.set(Math.sin(angle) * radius, 0.48 + row * 0.39, -Math.cos(angle) * radius);
      block.rotation.y = -angle;
      block.scale.x = 0.92 + ((row + column) % 3) * 0.035;
      masonry.add(block);
    }
  }
  parent.add(masonry);
}

function addChamberShell(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const shell = new THREE.Group();
  shell.name = 'vault-interior-chamber-shell';

  const floor = cylinder(2.75, 2.95, 0.16, segmentCount(quality, 48, 72, 96), materials.floor, 'vault-interior-polished-floor');
  floor.position.y = 0;
  shell.add(floor);

  const inset = cylinder(1.95, 2.08, 0.04, segmentCount(quality, 40, 64, 88), materials.floorShade, 'vault-interior-floor-inset');
  inset.position.y = 0.11;
  shell.add(inset);

  const outerRing = goldRing(2.12, 0.035, materials, quality, 'vault-interior-floor-gold-ring');
  outerRing.position.y = 0.145;
  shell.add(outerRing);

  const innerRing = goldRing(0.92, 0.022, materials, quality, 'vault-interior-floor-inner-gold-ring');
  innerRing.position.y = 0.17;
  shell.add(innerRing);

  addGlazedRadialFloorTiles(shell, materials, quality);

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const ray = mesh(new THREE.BoxGeometry(0.035, 0.012, 0.72), index % 3 === 0 ? materials.silver : materials.gold, 'vault-interior-floor-sunburst-inlay');
    ray.position.set(Math.sin(angle) * 0.54, 0.185, Math.cos(angle) * 0.54);
    ray.rotation.y = angle;
    shell.add(ray);
  }

  const rearWall = mesh(new THREE.CylinderGeometry(2.82, 2.82, 3.45, segmentCount(quality, 40, 64, 88), 1, true, Math.PI * 0.2, Math.PI * 0.6), materials.wall, 'vault-interior-curved-rear-wall');
  rearWall.position.y = 1.7;
  rearWall.receiveShadow = true;
  shell.add(rearWall);
  addCurvedAshlarMasonry(shell, materials, quality);

  for (let index = 0; index < 9; index += 1) {
    const angle = Math.PI * 0.22 + (index / 8) * Math.PI * 0.56;
    const rib = cylinder(0.025, 0.038, 3.36, 8, materials.gold, 'vault-interior-wall-gold-rib');
    rib.position.set(Math.sin(angle) * 2.72, 1.72, Math.cos(angle) * 2.72);
    rib.rotation.z = Math.sin(angle) * 0.22;
    rib.rotation.x = Math.PI * 0.02;
    shell.add(rib);
  }

  for (const level of [
    { y: 1.36, radius: 2.32, name: 'vault-interior-first-tall-floor-balcony' },
    { y: 2.34, radius: 2.06, name: 'vault-interior-second-tall-floor-balcony' },
  ]) {
    const balcony = goldRing(level.radius, 0.028, materials, quality, level.name);
    balcony.position.y = level.y;
    shell.add(balcony);
    for (let index = 0; index < 18; index += 1) {
      const angle = Math.PI * 0.2 + (index / 17) * Math.PI * 0.6;
      const post = cylinder(0.012, 0.016, 0.34, 5, materials.gold, 'vault-interior-balcony-gold-post');
      post.position.set(Math.sin(angle) * level.radius, level.y - 0.12, Math.cos(angle) * level.radius);
      shell.add(post);
    }
  }

  for (const side of [-1, 1]) {
    for (let column = 0; column < 3; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        const box = mesh(new THREE.BoxGeometry(0.22, 0.13, 0.035), materials.wallTrim, 'vault-interior-safe-deposit-box');
        box.position.set(side * (1.35 + column * 0.28), 0.76 + row * 0.23, -1.96 + column * 0.06);
        box.rotation.y = side * -0.42;
        const knob = mesh(new THREE.OctahedronGeometry(0.025, 0), (row + column) % 3 === 0 ? materials.gold : materials.silver, 'vault-interior-safe-box-knob');
        knob.position.set(box.position.x - side * 0.045, box.position.y, box.position.z + 0.035);
        knob.rotation.y = box.rotation.y;
        shell.add(box, knob);
      }
    }
  }

  parent.add(shell);
}

function addDomeUnderside(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const dome = new THREE.Group();
  dome.name = 'vault-interior-visible-palace-dome-underside';
  dome.position.set(0, 3.12, -0.28);

  const underside = mesh(
    new THREE.SphereGeometry(1.68, segmentCount(quality, 24, 36, 52), segmentCount(quality, 10, 14, 18), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.enamel,
    'vault-interior-blue-dome-underside',
  );
  underside.scale.y = -0.52;
  underside.rotation.x = Math.PI;
  dome.add(underside);

  const oculus = goldRing(0.46, 0.024, materials, quality, 'vault-interior-dome-oculus-gold-ring');
  oculus.position.y = -0.42;
  dome.add(oculus);

  const oculusGlow = mesh(new THREE.CircleGeometry(0.42, segmentCount(quality, 18, 28, 40)), materials.warmGlow, 'vault-interior-dome-oculus-warm-glow');
  oculusGlow.rotation.x = -Math.PI / 2;
  oculusGlow.position.y = -0.43;
  dome.add(oculusGlow);

  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const rib = mesh(new THREE.BoxGeometry(0.024, 0.5, 0.026), materials.gold, 'vault-interior-dome-gold-rib');
    rib.position.set(Math.sin(angle) * 0.86, -0.28, Math.cos(angle) * 0.86);
    rib.rotation.set(Math.cos(angle) * 0.34, angle, Math.sin(angle) * -0.34);
    dome.add(rib);
  }

  parent.add(dome);
}

function addSplitStaircaseDownFromPalace(parent: THREE.Group, materials: VaultInteriorMaterials) {
  const stairs = new THREE.Group();
  stairs.name = 'vault-interior-palace-entry-split-staircase';
  stairs.userData.sculptRuntime = {
    futureGameplayRole: 'palace-entry-to-vault-descent',
  };

  const upperLanding = cylinder(0.5, 0.58, 0.1, 24, materials.floor, 'vault-interior-upper-stair-landing');
  upperLanding.position.set(0, 2.22, -1.72);
  stairs.add(upperLanding);

  const entryGlow = mesh(new THREE.CircleGeometry(0.38, 32), materials.warmGlow, 'vault-interior-palace-entry-glow');
  entryGlow.position.set(0, 2.35, -1.96);
  stairs.add(entryGlow);

  for (const side of [-1, 1] as const) {
    const rail = mesh(new THREE.BoxGeometry(0.035, 0.055, 1.76), materials.gold, 'vault-interior-split-stair-gold-rail');
    rail.position.set(side * 0.72, 1.66, -1.08);
    rail.rotation.set(-0.38, side * 0.45, 0);
    stairs.add(rail);

    for (let index = 0; index < 10; index += 1) {
      const t = index / 9;
      const step = mesh(new THREE.BoxGeometry(0.5 + t * 0.12, 0.05, 0.18), materials.floor, 'vault-interior-split-stair-marble-step');
      step.position.set(side * (0.16 + t * 0.95), 2.1 - t * 0.92, -1.58 + t * 0.98);
      step.rotation.y = side * 0.44;
      stairs.add(step);

      if (index % 3 === 1) {
        const lamp = cylinder(0.012, 0.018, 0.28, 5, materials.gold, 'vault-interior-stair-tiny-gold-lamp-post');
        lamp.position.set(side * (0.38 + t * 0.9), 2.18 - t * 0.92, -1.55 + t * 0.98);
        const jewel = mesh(new THREE.OctahedronGeometry(0.042, 0), side < 0 ? materials.cyanGem : materials.ruby, 'vault-interior-stair-lamp-jewel');
        jewel.position.set(lamp.position.x, lamp.position.y + 0.17, lamp.position.z);
        stairs.add(lamp, jewel);
      }
    }
  }

  parent.add(stairs);
}

function addChandelier(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const chandelier = new THREE.Group();
  chandelier.name = 'vault-interior-gem-chandelier';
  chandelier.position.set(0, 2.58, -0.2);

  const crownRing = goldRing(0.48, 0.018, materials, quality, 'vault-interior-chandelier-gold-ring');
  chandelier.add(crownRing);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const chain = cylinder(0.006, 0.007, 0.34 + (index % 2) * 0.08, 5, materials.gold, 'vault-interior-chandelier-chain');
    chain.position.set(Math.sin(angle) * 0.42, -0.18, Math.cos(angle) * 0.42);
    const drop = mesh(
      new THREE.OctahedronGeometry(0.065, 0),
      index % 4 === 0 ? materials.ruby : index % 4 === 1 ? materials.cyanGem : index % 4 === 2 ? materials.violetGem : materials.emeraldGem,
      'vault-interior-chandelier-hanging-gem',
    );
    drop.position.set(Math.sin(angle) * 0.42, -0.4 - (index % 2) * 0.08, Math.cos(angle) * 0.42);
    chandelier.add(chain, drop);
  }

  const glow = mesh(new THREE.SphereGeometry(0.38, segmentCount(quality, 16, 22, 28), segmentCount(quality, 8, 12, 16)), materials.warmGlow, 'vault-interior-chandelier-warm-glow');
  glow.scale.y = 0.5;
  glow.position.y = -0.22;
  chandelier.add(glow);
  parent.add(chandelier);
}

function addRoundVaultDoor(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const door = new THREE.Group();
  door.name = 'vault-interior-grand-round-door';
  door.position.set(0, 1.28, -2.2);

  const frame = mesh(new THREE.TorusGeometry(0.9, 0.09, 10, segmentCount(quality, 48, 72, 96)), materials.gold, 'vault-interior-door-gold-frame');
  const slab = cylinder(0.74, 0.74, 0.12, segmentCount(quality, 32, 48, 64), materials.enamel, 'vault-interior-blue-vault-door');
  slab.rotation.x = Math.PI / 2;
  slab.position.z = 0.02;
  const innerRing = mesh(new THREE.TorusGeometry(0.46, 0.035, 8, segmentCount(quality, 32, 48, 64)), materials.darkGold, 'vault-interior-door-inner-lock-ring');
  innerRing.position.z = 0.1;
  door.add(frame, slab, innerRing);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const bolt = mesh(new THREE.BoxGeometry(0.045, 0.18, 0.035), index % 3 === 0 ? materials.silver : materials.gold, 'vault-interior-door-radial-bolt');
    bolt.position.set(Math.sin(angle) * 0.56, Math.cos(angle) * 0.56, 0.13);
    bolt.rotation.z = -angle;
    door.add(bolt);
  }

  const dial = mesh(new THREE.OctahedronGeometry(0.16, 0), materials.cyanGem, 'vault-interior-door-center-gem-dial');
  dial.position.z = 0.16;
  door.add(dial);
  parent.add(door);
}

function addEssenceIngots(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
  wealthDisplay: VaultIslandWealthDisplay,
) {
  const stack = new THREE.Group();
  stack.name = 'vault-interior-essence-ingot-stack';
  stack.userData.sculptRuntime = {
    futureGameplayRole: 'wealth-visualizer',
    currencyKind: 'essence-and-diamonds',
    holdingsValue: wealthDisplay.holdingsValue,
    wealthTier: wealthDisplay.tier,
  };

  const reserveTray = mesh(
    new RoundedBoxGeometry(1.04, 0.1, 0.54, 4, 0.055),
    materials.wallTrim,
    'vault-interior-wealth-reserve-tray',
  );
  reserveTray.position.y = 0.02;
  const reserveTrayInlay = mesh(
    new RoundedBoxGeometry(0.92, 0.035, 0.42, 4, 0.045),
    materials.darkGold,
    'vault-interior-wealth-reserve-tray-gold-inlay',
  );
  reserveTrayInlay.position.y = 0.085;
  stack.add(reserveTray, reserveTrayInlay);

  for (let index = 0; index < wealthDisplay.ingotsPerStack; index += 1) {
    const ingot = mesh(
      new RoundedBoxGeometry(0.34, 0.075, 0.18, 3, 0.025),
      index % 5 === 0 ? materials.darkGold : materials.gold,
      'vault-interior-stacked-essence-ingot',
    );
    ingot.position.set(
      ((index % 4) - 1.5) * 0.2,
      0.13 + Math.floor(index / 4) * 0.078,
      (Math.floor(index / 4) % 2 - 0.5) * 0.14,
    );
    ingot.rotation.y = (index % 2 === 0 ? 0.1 : -0.1) + index * 0.018;
    stack.add(ingot);
  }

  for (let index = 0; index < wealthDisplay.stackGemCount; index += 1) {
    const gem = mesh(
      new THREE.OctahedronGeometry(0.065 + (index % 2) * 0.02, 0),
      index % 3 === 0 ? materials.violetGem : index % 3 === 1 ? materials.cyanGem : materials.emeraldGem,
      'vault-interior-loose-premium-gem',
    );
    gem.position.set(-0.48 + index * 0.16, 0.73 + (index % 3) * 0.045, 0.18 - (index % 2) * 0.14);
    stack.add(gem);
  }

  stack.position.set(-1.38, 0.19, 0.62);
  stack.rotation.y = -0.08;
  stack.scale.setScalar(0.82);
  parent.add(stack);

  const mirror = stack.clone();
  mirror.name = 'vault-interior-essence-ingot-stack-mirror';
  mirror.position.set(1.38, 0.19, 0.62);
  mirror.rotation.y = 0.08;
  parent.add(mirror);
}

function addTreasureOverflow(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
  wealthDisplay: VaultIslandWealthDisplay,
) {
  const overflow = new THREE.Group();
  overflow.name = 'vault-interior-loose-treasure-overflow';
  overflow.userData.sculptRuntime = {
    futureGameplayRole: 'holding-value-celebration-pile',
    holdingsValue: wealthDisplay.holdingsValue,
    wealthTier: wealthDisplay.tier,
  };

  for (let index = 0; index < wealthDisplay.looseCoinCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const localIndex = Math.floor(index / 2);
    const column = localIndex % 4;
    const row = Math.floor(localIndex / 4) % 4;
    const layer = Math.floor(localIndex / 16);
    const coin = cylinder(0.07, 0.07, 0.022, segmentCount(quality, 10, 14, 18), index % 9 === 0 ? materials.darkGold : materials.gold, 'vault-interior-floor-loose-coin');
    coin.position.set(
      side * (1.2 + column * 0.105),
      0.2 + layer * 0.025 + ((column + row) % 2) * 0.01,
      1.18 + row * 0.105,
    );
    coin.rotation.y = index * 0.41;
    overflow.add(coin);
  }

  for (let index = 0; index < wealthDisplay.looseGemCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const localIndex = Math.floor(index / 2);
    const gem = mesh(
      new THREE.OctahedronGeometry(index % 4 === 0 ? 0.105 : 0.075, 0),
      index % 4 === 0 ? materials.ruby : index % 4 === 1 ? materials.cyanGem : index % 4 === 2 ? materials.violetGem : materials.emeraldGem,
      'vault-interior-floor-loose-cut-gem',
    );
    gem.position.set(
      side * (1.2 + (localIndex % 3) * 0.15),
      0.26 + (localIndex % 2) * 0.045,
      1.62 + Math.floor(localIndex / 3) * 0.14,
    );
    overflow.add(gem);
  }

  parent.add(overflow);
}

function addStickerRelicFrames(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const frames = new THREE.Group();
  frames.name = 'vault-interior-sticker-relic-wall';
  frames.userData.sculptRuntime = {
    futureGameplayRole: 'sticker-and-charm-collection-wall',
  };

  for (let index = 0; index < 8; index += 1) {
    const side = index < 4 ? -1 : 1;
    const local = index % 4;
    const frame = new THREE.Group();
    frame.name = 'vault-interior-sticker-relic-frame';
    frame.position.set(side * 3.7, 1.1 + local * 0.34, -2.34 + local * 0.06);
    frame.rotation.y = side * -0.42;

    const backing = mesh(new THREE.BoxGeometry(0.34, 0.2, 0.035), materials.wallTrim, 'vault-interior-relic-frame-backing');
    const trim = mesh(new THREE.BoxGeometry(0.4, 0.25, 0.025), materials.gold, 'vault-interior-relic-frame-gold-trim');
    trim.position.z = -0.012;
    const symbol = mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      local % 3 === 0 ? materials.cyanGem : local % 3 === 1 ? materials.violetGem : materials.emeraldGem,
      'vault-interior-relic-frame-symbol',
    );
    symbol.position.z = 0.04;
    frame.add(trim, backing, symbol);
    frames.add(frame);
  }

  parent.add(frames);
}

function addTreasurePedestals(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
  unlockedTreasureIds?: readonly VaultTreasureId[],
) {
  const displays = new THREE.Group();
  displays.name = 'vault-interior-main-treasure-displays';
  displays.userData.sculptRuntime = {
    futureGameplayRole: 'clickable-treasure-museum',
    placementSockets: VAULT_TREASURE_DEFINITIONS.map((treasure) => treasure.id),
  };

  const treasureModels: VaultTreasureModel[] = [];
  const unlockedTreasureSet = unlockedTreasureIds === undefined
    ? null
    : new Set<VaultTreasureId>(unlockedTreasureIds);
  VAULT_TREASURE_DEFINITIONS.forEach((definition, index) => {
    const model = createVaultTreasureModel(definition.id);
    const isUnlocked = unlockedTreasureSet?.has(definition.id) ?? true;
    const socket = VAULT_TREASURE_PLACEMENT_SOCKETS.find((candidate) => (
      candidate.futureRuntimeRole === 'collection-display' &&
      candidate.acceptedTreasureIds.includes(definition.id as VaultTreasureId)
    ));
    treasureModels.push(model);
    const angles = [-1.28, -0.92, -0.58, -0.2, 0.2, 0.58, 0.92, 1.28];
    const angle = angles[index] ?? 0;
    model.root.name = socket?.sceneNodeName ?? `vault-interior-display-${definition.id}`;
    model.root.position.set(Math.sin(angle) * 3.08, 0.66, -Math.cos(angle) * 3.08);
    model.root.rotation.y = -angle;
    model.root.scale.setScalar(definition.id === 'obelisk' || definition.id === 'hourglass' ? 0.44 : 0.48);
    model.treasure.visible = isUnlocked;
    model.root.userData.vaultInteriorDisplay = isUnlocked;
    model.root.userData.vaultInteriorLocked = !isUnlocked;
    if (!isUnlocked) {
      model.root.traverse((child) => {
        delete child.userData.treasureId;
      });
    }
    displays.add(model.root);

    if (!isUnlocked) {
      const lockedSeal = new THREE.Group();
      lockedSeal.name = `vault-interior-${definition.id}-locked-case-seal`;
      lockedSeal.position.copy(model.root.position);
      lockedSeal.position.y = 0.82;
      lockedSeal.rotation.y = model.root.rotation.y;
      const lockBody = mesh(
        new RoundedBoxGeometry(0.22, 0.16, 0.065, quality === 'high' ? 4 : 2, 0.025),
        materials.darkGold,
        'vault-interior-locked-case-seal-body',
      );
      const lockShackle = mesh(
        new THREE.TorusGeometry(0.072, 0.018, segmentCount(quality, 6, 8, 10), segmentCount(quality, 18, 24, 32), Math.PI),
        materials.gold,
        'vault-interior-locked-case-seal-shackle',
      );
      lockShackle.position.y = 0.08;
      const sealGem = mesh(
        new THREE.OctahedronGeometry(0.038, quality === 'high' ? 1 : 0),
        materials.cyanGem,
        'vault-interior-locked-case-jewel-keyway',
      );
      sealGem.position.z = 0.045;
      lockedSeal.add(lockBody, lockShackle, sealGem);
      displays.add(lockedSeal);
    }

    if (quality !== 'low') {
      const caseDome = mesh(
        new THREE.SphereGeometry(0.5, segmentCount(quality, 16, 22, 30), segmentCount(quality, 8, 12, 16), 0, Math.PI * 2, 0, Math.PI / 2),
        materials.glass,
        `vault-interior-${definition.id}-glass-display-dome`,
      );
      caseDome.scale.y = 1.1;
      caseDome.position.copy(model.root.position);
      caseDome.position.y = 1.18;
      caseDome.rotation.y = model.root.rotation.y;
      displays.add(caseDome);
    }
  });

  displays.userData.treasureModels = treasureModels;
  parent.add(displays);
}

function addSpotlightBeams(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const beams = new THREE.Group();
  beams.name = 'vault-interior-collection-light-beams';
  for (let index = 0; index < 8; index += 1) {
    const angles = [-1.28, -0.92, -0.58, -0.2, 0.2, 0.58, 0.92, 1.28];
    const angle = angles[index] ?? 0;
    const cone = mesh(new THREE.ConeGeometry(0.12 + (index % 3) * 0.018, 1.35, segmentCount(quality, 18, 24, 32), 1, true), materials.cyanGlow, 'vault-interior-soft-spotlight-cone');
    cone.position.set(Math.sin(angle) * 3.08, 1.96, -Math.cos(angle) * 3.08);
    cone.rotation.x = Math.PI;
    cone.scale.z = 0.34;
    beams.add(cone);
  }
  parent.add(beams);
}

function addPalaceAtriumArchitecture(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const architecture = new THREE.Group();
  architecture.name = 'vault-palace-atrium-monumental-two-floor-shell';

  const floor = cylinder(3.2, 3.38, 0.18, segmentCount(quality, 48, 72, 96), materials.floor, 'vault-palace-atrium-polished-marble-floor');
  floor.position.y = 0;
  architecture.add(floor);
  addGlazedRadialFloorTiles(architecture, materials, quality);
  const tiledFloor = architecture.getObjectByName('vault-interior-glazed-marble-and-enamel-floor-tiles');
  tiledFloor?.scale.setScalar(1.18);

  const rearWall = mesh(
    new THREE.CylinderGeometry(3.22, 3.22, 5.25, segmentCount(quality, 48, 72, 96), 1, true, Math.PI * 0.19, Math.PI * 0.62),
    materials.wall,
    'vault-palace-atrium-five-storey-height-curved-wall',
  );
  rearWall.position.y = 2.6;
  architecture.add(rearWall);
  addCurvedAshlarMasonry(architecture, materials, quality);
  const lowerMasonry = architecture.getObjectByName('vault-interior-curved-cut-ashlar-masonry');
  if (lowerMasonry) {
    lowerMasonry.name = 'vault-palace-atrium-lower-floor-ashlar-masonry';
    lowerMasonry.scale.setScalar(1.12);
    const upperMasonry = lowerMasonry.clone();
    upperMasonry.name = 'vault-palace-atrium-upper-floor-ashlar-masonry';
    upperMasonry.position.y = 2.35;
    architecture.add(upperMasonry);
  }

  for (const level of [2.15, 3.78]) {
    const balcony = goldRing(level === 2.15 ? 2.72 : 2.46, 0.045, materials, quality, level === 2.15 ? 'vault-palace-atrium-first-tall-floor-gallery' : 'vault-palace-atrium-second-tall-floor-gallery');
    balcony.position.y = level;
    architecture.add(balcony);
    for (let index = 0; index < 18; index += 1) {
      const angle = -1.06 + (index / 17) * 2.12;
      const radius = level === 2.15 ? 2.72 : 2.46;
      const post = cylinder(0.018, 0.022, 0.54, 7, materials.gold, 'vault-palace-atrium-gallery-baluster');
      post.position.set(Math.sin(angle) * radius, level - 0.23, -Math.cos(angle) * radius);
      architecture.add(post);
    }
  }

  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 3; index += 1) {
      const column = cylinder(0.13, 0.17, 4.45, 18, index === 1 ? materials.floorShade : materials.floor, 'vault-palace-atrium-monumental-marble-column');
      column.position.set(side * (2.34 - index * 0.46), 2.26, -2.05 + index * 0.19);
      architecture.add(column);
      const capital = mesh(new THREE.BoxGeometry(0.42, 0.14, 0.38), materials.gold, 'vault-palace-atrium-column-gold-capital');
      capital.position.set(column.position.x, 4.5, column.position.z);
      architecture.add(capital);
    }
  }

  const descentVoid = cylinder(0.88, 1.05, 0.22, segmentCount(quality, 32, 48, 64), materials.wallTrim, 'vault-palace-atrium-central-vault-descent-void');
  descentVoid.position.set(0, 0.07, 0.48);
  const descentRim = goldRing(0.98, 0.045, materials, quality, 'vault-palace-atrium-descent-void-gold-rim');
  descentRim.position.set(0, 0.2, 0.48);
  const descentGlow = mesh(new THREE.CircleGeometry(0.84, 48), materials.cyanGlow, 'vault-palace-atrium-blue-vault-glow-below');
  descentGlow.rotation.x = -Math.PI / 2;
  descentGlow.position.set(0, 0.205, 0.48);
  architecture.add(descentVoid, descentRim, descentGlow);

  const upperLanding = mesh(new THREE.BoxGeometry(1.18, 0.14, 0.72), materials.floor, 'vault-palace-atrium-entry-landing');
  upperLanding.position.set(0, 3.72, -2.32);
  architecture.add(upperLanding);
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 17; index += 1) {
      const t = index / 16;
      const step = mesh(new THREE.BoxGeometry(0.72 + t * 0.1, 0.09, 0.26), materials.floor, 'vault-palace-atrium-split-descent-marble-step');
      step.position.set(side * (0.34 + t * 1.52), 3.55 - t * 2.28, -2.02 + t * 1.3);
      step.rotation.y = side * (0.12 + t * 0.5);
      architecture.add(step);
      if (index % 2 === 0) {
        const railPost = cylinder(0.018, 0.024, 0.46, 7, materials.gold, 'vault-palace-atrium-stair-gold-baluster');
        railPost.position.set(side * (0.72 + t * 1.45), step.position.y + 0.25, step.position.z + 0.04);
        architecture.add(railPost);
      }
    }

    const gardenPortal = new THREE.Group();
    gardenPortal.name = side < 0 ? 'vault-palace-atrium-left-garden-door' : 'vault-palace-atrium-right-garden-door';
    gardenPortal.position.set(side * 2.6, 1.08, -1.12);
    gardenPortal.rotation.y = side * -0.42;
    const portalGlow = mesh(new THREE.CircleGeometry(0.45, 32), materials.warmGlow, 'vault-palace-atrium-garden-door-warm-light');
    portalGlow.scale.y = 1.35;
    const portalArch = mesh(new THREE.TorusGeometry(0.5, 0.055, 9, 48, Math.PI), materials.gold, 'vault-palace-atrium-garden-door-gold-arch');
    portalArch.position.y = 0.42;
    portalArch.rotation.z = Math.PI;
    const threshold = mesh(new THREE.BoxGeometry(1.04, 0.1, 0.42), materials.floor, 'vault-palace-atrium-garden-door-threshold');
    threshold.position.y = -0.5;
    gardenPortal.add(portalGlow, portalArch, threshold);
    architecture.add(gardenPortal);
  }

  parent.add(architecture);
}

export function createVaultTreasurePalaceAtriumModel(options: VaultTreasureVaultInteriorOptions = {}): VaultTreasureIslandRuntime {
  const quality = options.quality ?? 'medium';
  const materials = createVaultInteriorMaterials();
  const root = new THREE.Group();
  root.name = 'vault-treasure-palace-atrium-model';
  root.userData.sculptRuntime = {
    id: 'vault-treasure-palace-atrium',
    status: 'phone-lab-palace-to-vault-journey-slice',
    futureGameplayRole: 'empty-palace-entry-and-split-stair-vault-descent',
  };
  const fallbackArchitecture = createVaultPalaceAtriumArchitectureV3(materials, quality);
  fallbackArchitecture.name = 'vault-palace-atrium-procedural-fallback';
  root.add(fallbackArchitecture);
  const releaseBlenderArchitecture = loadBlenderInteriorArchitecture(
    root,
    fallbackArchitecture,
    '/assets/islands/special/vault-island/vault-atrium.glb',
    'vault-palace-atrium-blender-architecture-v001',
    materials,
  );
  addAtriumArchitecturalLights(root, quality);

  const animatedObjects: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child.name.includes('glow') || child.name.includes('oculus')) animatedObjects.push(child);
  });

  return {
    root,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      animatedObjects.forEach((object, index) => {
        object.scale.setScalar(0.98 + Math.sin(elapsedSeconds * 1.2 + index) * 0.025);
      });
    },
    dispose: () => {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        childMaterials.forEach((material) => material.dispose());
      });
      releaseBlenderArchitecture();
      Object.values(materials).forEach((resource) => resource.dispose());
    },
  };
}

export function createVaultTreasureVaultInteriorModel(options: VaultTreasureVaultInteriorOptions = {}): VaultTreasureIslandRuntime {
  const quality = options.quality ?? 'medium';
  const wealthDisplay = resolveVaultIslandWealthDisplay(options.holdingsValue ?? 89_200);
  const materials = createVaultInteriorMaterials();
  const root = new THREE.Group();
  root.name = 'vault-treasure-island-interior-model';
  root.userData.sculptRuntime = {
    id: 'vault-treasure-island-interior',
    sourceSha256: '5f2841dcf97303c7e8cf8091d0c02a0c22f24904eeea41044df68ab4a583fa57',
    status: 'phone-lab-interior-vault-slice',
    hiddenGeometryConfidence: 'inferred-from-source-and-generated-reference-sheets',
    futureGameplayRole: 'special-island-treasure-collection-room',
    holdingsValue: wealthDisplay.holdingsValue,
    wealthTier: wealthDisplay.tier,
  };

  const fallbackArchitecture = new THREE.Group();
  fallbackArchitecture.name = 'vault-interior-procedural-fallback';
  addChamberShell(fallbackArchitecture, materials, quality);
  addDomeUnderside(fallbackArchitecture, materials, quality);
  addSplitStaircaseDownFromPalace(fallbackArchitecture, materials);
  addRoundVaultDoor(fallbackArchitecture, materials, quality);
  addChandelier(fallbackArchitecture, materials, quality);
  root.add(fallbackArchitecture);
  const releaseBlenderArchitecture = loadBlenderInteriorArchitecture(
    root,
    fallbackArchitecture,
    '/assets/islands/special/vault-island/vault-museum.glb',
    'vault-interior-blender-museum-v001',
    materials,
  );
  addVaultMuseumLights(root, quality);
  addSpotlightBeams(root, materials, quality);
  addEssenceIngots(root, materials, quality, wealthDisplay);
  addTreasureOverflow(root, materials, quality, wealthDisplay);
  addStickerRelicFrames(root, materials, quality);
  addTreasurePedestals(root, materials, quality, options.unlockedTreasureIds);

  const animatedObjects: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (
      child.name.includes('gem') ||
      child.name.includes('display-') ||
      child.name === 'vault-interior-door-center-gem-dial'
    ) {
      child.userData.baseY = child.position.y;
      child.userData.baseRotationY = child.rotation.y;
      animatedObjects.push(child);
    }
  });

  return {
    root,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      animatedObjects.forEach((object, index) => {
        object.position.y = Number(object.userData.baseY) + Math.sin(elapsedSeconds * 1.35 + index * 0.7) * 0.018;
        const baseRotationY = Number(object.userData.baseRotationY) || 0;
        object.rotation.y = object.userData.vaultInteriorDisplay
          ? baseRotationY + Math.sin(elapsedSeconds * 0.7 + index) * 0.08
          : object.rotation.y + 0.005 + (index % 4) * 0.001;
      });
    },
    dispose: () => {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        childMaterials.forEach((material) => material.dispose());
      });
      releaseBlenderArchitecture();
      Object.values(materials).forEach((material) => material.dispose());
      const displayGroup = root.getObjectByName('vault-interior-main-treasure-displays');
      const treasureModels = displayGroup?.userData.treasureModels as VaultTreasureModel[] | undefined;
      treasureModels?.forEach((model) => model.dispose());
    },
  };
}
