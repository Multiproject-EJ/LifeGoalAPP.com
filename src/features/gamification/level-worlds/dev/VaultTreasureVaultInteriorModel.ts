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
import { createVaultTreasureIslandScenicEnvironment } from './VaultTreasureIslandModelV2';
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
const VAULT_MUSEUM_DISPLAY_LAYOUT = [
  { id: 'crown', x: 0, y: 0.18, z: -4.7, rotationY: 0, scale: 0.92 },
  { id: 'egg', x: -1.58, y: 0.18, z: -4.74, rotationY: -0.08, scale: 0.76 },
  { id: 'hourglass', x: 1.58, y: 0.18, z: -4.74, rotationY: 0.08, scale: 0.78 },
  { id: 'key', x: -3.32, y: 0.18, z: -1.62, rotationY: -0.48, scale: 0.82 },
  { id: 'medallion', x: 3.32, y: 0.18, z: -1.62, rotationY: 0.48, scale: 0.8 },
  { id: 'compass', x: -1.36, y: 4.49, z: -5.18, rotationY: -0.08, scale: 0.7 },
  { id: 'obelisk', x: 0, y: 4.49, z: -5.28, rotationY: 0, scale: 0.72 },
  { id: 'chalice', x: 1.36, y: 4.49, z: -5.18, rotationY: 0.08, scale: 0.7 },
] as const satisfies ReadonlyArray<{
  id: VaultTreasureId;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
}>;

const VAULT_BLENDER_TREASURE_ASSETS: Readonly<Record<VaultTreasureId, string>> = {
  crown: '/assets/islands/special/vault-island/treasures/crown.glb?v=002',
  compass: '/assets/islands/special/vault-island/treasures/compass.glb?v=001',
  obelisk: '/assets/islands/special/vault-island/treasures/obelisk.glb?v=001',
  egg: '/assets/islands/special/vault-island/treasures/egg.glb?v=001',
  hourglass: '/assets/islands/special/vault-island/treasures/hourglass.glb?v=001',
  key: '/assets/islands/special/vault-island/treasures/key.glb?v=001',
  medallion: '/assets/islands/special/vault-island/treasures/medallion.glb?v=001',
  chalice: '/assets/islands/special/vault-island/treasures/chalice.glb?v=001',
};

function tuneBlenderInteriorMaterials(root: THREE.Object3D, lookdev: VaultInteriorMaterials) {
  root.traverse((child) => {
    if (
      child.name.includes('vault-interior-museum-display-base-')
      || child.name.includes('vault-interior-museum-display-gold-ring-')
      || child.name.includes('vault-interior-museum-display-blue-plinth-')
      || child.name.includes('vault-interior-museum-display-crown-light-')
      || child.name.includes('vault-interior-museum-relic-plaque-')
    ) {
      child.visible = false;
      return;
    }
    if (child.name.includes('deep-roof-return') || child.name.includes('continuous-coffered-cloister-roof')) {
      child.visible = false;
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
    if (!(child instanceof THREE.Mesh)) return;
    const isInteriorDomeShell = child.name === 'vault-interior-coffered-rotunda-vault'
      || child.name === 'vault-palace-atrium-visible-main-dome-underside';
    const isRetiredGardenHorizon = child.name.includes('coastal-horizon-real-animated-sea-water-mesh')
      || child.name.includes('distant-atmospheric-ridge');
    if (isRetiredGardenHorizon) {
      child.visible = false;
      return;
    }
    if (isInteriorDomeShell) {
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const name = material.name.toLowerCase();
      material.envMapIntensity = name.includes('gold') || name.includes('silver') ? 2.45 : 1.28;
      material.side = isInteriorDomeShell
        ? THREE.FrontSide
        : name.includes('dome') || name.includes('enamel')
          ? THREE.DoubleSide
          : THREE.FrontSide;
      if (name.includes('garden honed palace limestone') || name.includes('garden carved ivory limestone')) {
        material.color.set(name.includes('carved ivory') ? '#c7ae7c' : '#9f8258');
        material.map = null;
        material.bumpMap = lookdev.masonryPattern;
        material.bumpScale = name.includes('carved ivory') ? 0.016 : 0.024;
        material.roughness = name.includes('carved ivory') ? 0.46 : 0.56;
        material.envMapIntensity = 0.82;
      } else if (name.includes('garden polished blue marble') || name.includes('garden veined royal blue marble')) {
        material.color.set(name.includes('veined') ? '#15548c' : '#082c62');
        material.map = null;
        material.bumpMap = lookdev.marblePattern;
        material.bumpScale = 0.004;
        material.roughness = 0.2;
        material.envMapIntensity = 1.25;
      } else if (name.includes('garden polished honeycomb gold') || name.includes('garden architectural antique gold')) {
        material.color.set(name.includes('antique') ? '#694317' : '#ad741a');
        material.map = null;
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = name.includes('antique') ? 0.008 : 0.004;
        material.metalness = 1;
        material.roughness = name.includes('antique') ? 0.3 : 0.21;
        material.envMapIntensity = name.includes('antique') ? 2.4 : 3.15;
      } else if (name.includes('garden deep sapphire enamel') || name.includes('garden sapphire arcade reveal')) {
        material.color.set(name.includes('arcade') ? '#073b72' : '#031b54');
        material.map = null;
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.003;
        material.roughness = 0.1;
        material.envMapIntensity = 2.05;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.05;
        }
      } else if (name.includes('garden crystal blue-green reflecting water')) {
        material.color.set('#075e68');
        material.roughness = 0.03;
        material.envMapIntensity = 2.2;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0.64;
          material.thickness = 0.46;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.04;
        }
      } else if (name.includes('orchard honey limestone') || name.includes('orchard sunlit warm limestone') || name.includes('orchard pale carved limestone')) {
        material.color.set(name.includes('pale carved') ? '#d2bd91' : name.includes('sunlit warm') ? '#b99a66' : '#8f7046');
        material.map = null;
        material.bumpMap = lookdev.masonryPattern;
        material.bumpScale = name.includes('pale carved') ? 0.014 : 0.022;
        material.roughness = name.includes('pale carved') ? 0.28 : name.includes('sunlit warm') ? 0.36 : 0.48;
        material.envMapIntensity = name.includes('pale carved') ? 1.34 : 1.08;
      } else if (name.includes('orchard deep limestone reveal')) {
        material.color.set('#453522');
        material.map = null;
        material.bumpMap = lookdev.masonryPattern;
        material.bumpScale = 0.018;
        material.roughness = 0.58;
        material.envMapIntensity = 0.62;
      } else if (name.includes('orchard weathered coastal limestone') || name.includes('orchard weathered cliff shadow')) {
        material.color.set(name.includes('shadow') ? '#514330' : '#9e855f');
        material.map = null;
        material.bumpMap = lookdev.masonryPattern;
        material.bumpScale = name.includes('shadow') ? 0.036 : 0.048;
        material.roughness = name.includes('shadow') ? 0.72 : 0.64;
        material.envMapIntensity = name.includes('shadow') ? 0.48 : 0.68;
      } else if (name.includes('sunset cliff palace volumetric warm cloud') || name.includes('sunset cliff palace volumetric pearl cloud')) {
        material.color.set(name.includes('warm') ? '#e8aa61' : '#f0d5ad');
        material.roughness = 0.92;
        material.metalness = 0;
        material.fog = true;
        material.envMapIntensity = 0.35;
        material.emissive.set(name.includes('warm') ? '#6b2909' : '#4a2612');
        material.emissiveIntensity = name.includes('warm') ? 0.34 : 0.2;
      } else if (name.includes('orchard polished pearl marble') || name.includes('orchard deep blue marble') || name.includes('orchard veined sapphire marble')) {
        material.color.set(name.includes('pearl') ? '#cfc1a4' : name.includes('veined') ? '#135486' : '#062655');
        material.map = null;
        material.bumpMap = lookdev.marblePattern;
        material.bumpScale = name.includes('pearl') ? 0.003 : 0.005;
        material.roughness = name.includes('pearl') ? 0.17 : 0.11;
        material.envMapIntensity = name.includes('pearl') ? 1.42 : 1.86;
      } else if (name.includes('orchard restrained polished gold') || name.includes('orchard deep antique gold')) {
        material.color.set(name.includes('antique') ? '#684316' : '#c78917');
        material.map = null;
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = name.includes('antique') ? 0.008 : 0.004;
        material.metalness = 1;
        material.roughness = name.includes('antique') ? 0.23 : 0.105;
        material.envMapIntensity = name.includes('antique') ? 2.76 : 4.0;
      } else if (name.includes('orchard sapphire architectural accent') || name.includes('orchard polished dark water reveal')) {
        material.color.set(name.includes('water reveal') ? '#06141b' : '#062a67');
        material.map = null;
        material.roughness = name.includes('water reveal') ? 0.14 : 0.11;
        material.envMapIntensity = name.includes('water reveal') ? 1.28 : 2.08;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.04;
        }
      } else if (name.includes('orchard dark transmissive blue-green water')) {
        material.color.set('#087783');
        material.roughness = 0.025;
        material.transparent = true;
        material.opacity = 0.86;
        material.depthWrite = false;
        material.envMapIntensity = 2.6;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0.7;
          material.thickness = 0.38;
          material.ior = 1.34;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.025;
        }
      } else if (name.includes('orchard deep open crystalline sea')) {
        material.color.set('#087b9c');
        material.roughness = 0.11;
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.envMapIntensity = 2.1;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0.16;
          material.thickness = 0.58;
          material.ior = 1.333;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.075;
        }
      } else if (name.includes('orchard cut ruby gemstone') || name.includes('orchard cut amethyst gemstone') || name.includes('orchard cut aquamarine gemstone') || name.includes('orchard cut emerald gemstone')) {
        material.color.set(name.includes('ruby') ? '#d51239' : name.includes('amethyst') ? '#7426c9' : name.includes('aquamarine') ? '#16c6e5' : '#0b9a5b');
        material.roughness = 0.045;
        material.envMapIntensity = 2.25;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0.48;
          material.thickness = 0.32;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.025;
        }
      } else if (name.includes('orchard faceted clear crystal')) {
        material.color.set('#d9fbff');
        material.roughness = 0.025;
        material.transparent = true;
        material.opacity = 0.82;
        material.envMapIntensity = 2.8;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0.72;
          material.thickness = 0.42;
          material.ior = 1.52;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.018;
        }
      } else if (name.includes('orchard sculpted cypress emerald') || name.includes('orchard clipped emerald foliage') || name.includes('orchard sunlit topiary foliage')) {
        material.color.set(name.includes('cypress') ? '#063d24' : name.includes('sunlit') ? '#277d37' : '#0d642f');
        material.roughness = 0.5;
        material.envMapIntensity = 0.9;
      } else if (name.includes('white-marble')) {
        material.color.set('#b9a27c');
        material.map = null;
        material.bumpMap = null;
        material.roughness = 0.48;
      } else if (name.includes('pearl-marble')) {
        material.color.set('#cfbd9b');
        material.map = null;
        material.bumpMap = null;
        material.roughness = 0.4;
      } else if (name.includes('shadow-marble')) {
        material.color.set('#665d50');
        material.map = null;
        material.bumpMap = null;
        material.roughness = 0.44;
      } else if (name.includes('polished-gold')) {
        material.color.set('#d39216');
        material.map = null;
        material.bumpMap = null;
        material.metalness = 1;
        material.roughness = 0.17;
        material.envMapIntensity = 2.45;
      } else if (name.includes('antique-gold') || name.includes('polished-silver')) {
        material.map = null;
        material.bumpMap = null;
        if (name.includes('antique-gold')) {
          material.color.set('#74501b');
          material.roughness = 0.25;
          material.envMapIntensity = 2.1;
        }
      } else if (name.includes('midnight-enamel')) {
        material.color.set('#072d68');
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.005;
        material.roughness = 0.11;
      } else if (name.includes('sapphire-enamel')) {
        material.color.set('#0d6f9f');
        material.bumpMap = lookdev.metalPattern;
        material.bumpScale = 0.005;
        material.roughness = 0.1;
      } else if (name.includes('emerald-gem')) {
        material.color.set('#07572f');
        material.roughness = 0.2;
        material.emissive.set('#002d16');
        material.emissiveIntensity = 0.18;
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
  onLoaded?: (loaded: THREE.Object3D) => void,
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
      onLoaded?.(loaded);
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

function loadBlenderTreasureAsset(
  model: VaultTreasureModel,
  treasureId: VaultTreasureId,
  assetPath: string,
  isUnlocked: boolean,
  lookdev: VaultInteriorMaterials,
) {
  let loaded: THREE.Object3D | null = null;
  if (typeof window === 'undefined') return () => undefined;
  const proceduralChildren = [...model.root.children];
  const loader = new GLTFLoader();
  loader.load(
    assetPath,
    (gltf) => {
      loaded = gltf.scene;
      loaded.name = `vault-treasure-${treasureId}-handcrafted-blender`;
      loaded.visible = isUnlocked;
      loaded.userData.treasureId = treasureId;
      tuneBlenderInteriorMaterials(loaded, lookdev);
      loaded.traverse((child) => {
        child.userData.treasureId = treasureId;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      proceduralChildren.forEach((child) => {
        child.visible = false;
      });
      model.root.add(loaded);
      model.root.userData.blenderTreasureReady = true;
      model.root.userData.blenderTreasureAsset = assetPath;
    },
    undefined,
    (error) => {
      model.root.userData.blenderTreasureReady = false;
      model.root.userData.blenderTreasureLoadError = error instanceof Error ? error.message : String(error);
      proceduralChildren.forEach((child) => {
        child.visible = child === model.treasure ? isUnlocked : true;
      });
    },
  );
  return () => {
    if (loaded) model.root.remove(loaded);
    loaded = null;
  };
}

function addAtriumArchitecturalLights(root: THREE.Group, quality: VaultIslandQuality) {
  const entryLight = new THREE.PointLight('#ffc77a', quality === 'low' ? 1.3 : 2.15, 8.2, 2);
  entryLight.name = 'vault-palace-atrium-royal-entry-light';
  entryLight.position.set(0, 7.15, -4.72);
  root.add(entryLight);

  const descentLight = new THREE.PointLight('#42dcff', quality === 'low' ? 1.4 : 2.8, 5.2, 2);
  descentLight.name = 'vault-palace-atrium-descent-oculus-light';
  descentLight.position.set(0, 0.68, 1.1);
  root.add(descentLight);

  const domeLight = new THREE.PointLight('#ffd99a', quality === 'low' ? 1.1 : 2.35, 9.2, 2);
  domeLight.name = 'vault-palace-atrium-dome-oculus-warm-light';
  domeLight.position.set(0, 9.2, -0.35);
  root.add(domeLight);

  for (const level of [2.15, 5.85]) {
    for (const angle of [-0.92, -0.46, 0, 0.46, 0.92]) {
      if (quality === 'low' && Math.abs(angle) === 0.46) continue;
      const galleryLight = new THREE.PointLight('#ffbd67', quality === 'high' ? 0.92 : 0.68, 4.2, 2);
      galleryLight.name = 'vault-palace-atrium-gallery-cove-light';
      galleryLight.position.set(Math.sin(angle) * 4.3, level, -Math.cos(angle) * 4.3);
      root.add(galleryLight);
    }
  }

  for (const side of [-1, 1]) {
    const gardenLight = new THREE.PointLight('#ffb65c', quality === 'low' ? 1.1 : 2.15, 4.8, 2);
    gardenLight.name = side < 0
      ? 'vault-palace-atrium-left-garden-portal-light'
      : 'vault-palace-atrium-right-garden-portal-light';
    gardenLight.position.set(side * 4.08, 1.72, -2.82);
    root.add(gardenLight);
  }
}

function addVaultMuseumLights(root: THREE.Group, quality: VaultIslandQuality) {
  const colors = ['#ffd28b', '#8deeff', '#ff879d'] as const;
  VAULT_MUSEUM_DISPLAY_LAYOUT.forEach((display, index) => {
    if (quality === 'low' && index % 2 === 1) return;
    const light = new THREE.PointLight(colors[index % colors.length], quality === 'high' ? 1.55 : 1, 3.7, 2);
    light.name = `vault-interior-museum-display-light-${String(index).padStart(2, '0')}`;
    light.position.set(display.x, display.y + 1.55, display.z + 0.7);
    root.add(light);
  });

  const ceilingGlow = new THREE.PointLight('#ffd18a', quality === 'low' ? 1.5 : 3.15, 11.5, 2);
  ceilingGlow.name = 'vault-interior-coffered-ceiling-warm-fill';
  ceilingGlow.position.set(0, 7.0, -0.4);
  root.add(ceilingGlow);

  const rearWallWash = new THREE.PointLight('#ffc56f', quality === 'low' ? 1.1 : 2.4, 8.5, 2);
  rearWallWash.name = 'vault-interior-rear-architecture-warm-wall-wash';
  rearWallWash.position.set(0, 4.05, -3.72);
  root.add(rearWallWash);

  for (const side of [-1, 1]) {
    const reserveLight = new THREE.PointLight('#ffb75d', quality === 'low' ? 0.8 : 1.7, 4.5, 2);
    reserveLight.name = 'vault-interior-wealth-gallery-warm-light';
    reserveLight.position.set(side * 4.45, 2.25, -1.2);
    root.add(reserveLight);
  }
}

function addMuseumRearRelief(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const relief = new THREE.Group();
  relief.name = 'vault-interior-sovereign-rear-wall-relief';
  relief.position.set(0, 3.12, -4.68);

  const backing = mesh(
    new THREE.CircleGeometry(1.18, segmentCount(quality, 40, 64, 96)),
    materials.onyx,
    'vault-interior-sovereign-relief-onyx-backing',
  );
  relief.add(backing);

  for (const [radius, tube, material, z] of [
    [1.12, 0.075, materials.darkGold, 0.025],
    [0.92, 0.035, materials.silver, 0.04],
    [0.72, 0.055, materials.gold, 0.055],
  ] as const) {
    const ring = mesh(
      new THREE.TorusGeometry(radius, tube, 10, segmentCount(quality, 40, 64, 88)),
      material,
      'vault-interior-sovereign-relief-layered-metal-ring',
    );
    ring.position.z = z;
    relief.add(ring);
  }

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const ray = mesh(
      new THREE.BoxGeometry(index % 2 === 0 ? 0.055 : 0.035, index % 2 === 0 ? 0.46 : 0.34, 0.035),
      index % 4 === 0 ? materials.silver : materials.gold,
      'vault-interior-sovereign-relief-sun-ray',
    );
    ray.position.set(Math.sin(angle) * 0.46, Math.cos(angle) * 0.46, 0.07);
    ray.rotation.z = -angle;
    relief.add(ray);
  }

  const centerGem = mesh(
    new THREE.OctahedronGeometry(0.23, 0),
    materials.cyanGem,
    'vault-interior-sovereign-relief-center-gem',
  );
  centerGem.position.z = 0.16;
  centerGem.rotation.z = Math.PI / 4;
  relief.add(centerGem);

  parent.add(relief);
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
    floor: new THREE.MeshPhysicalMaterial({ color: '#e2d3b8', roughness: 0.42, metalness: 0, clearcoat: 0.26, clearcoatRoughness: 0.3, envMapIntensity: 0.9 }),
    floorShade: new THREE.MeshPhysicalMaterial({ color: '#17365a', roughness: 0.2, metalness: 0.06, clearcoat: 0.82, clearcoatRoughness: 0.12, envMapIntensity: 1.05 }),
    wall: new THREE.MeshStandardMaterial({ color: '#c8b691', roughness: 0.54, metalness: 0.01, envMapIntensity: 0.78, side: THREE.DoubleSide }),
    wallTrim: new THREE.MeshPhysicalMaterial({ color: '#152c4b', roughness: 0.22, metalness: 0.18, clearcoat: 0.72, clearcoatRoughness: 0.14, envMapIntensity: 1.05 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#d99a1b', roughness: 0.17, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.12, emissive: '#321000', emissiveIntensity: 0.035, envMapIntensity: 2.36 }),
    darkGold: new THREE.MeshPhysicalMaterial({ color: '#76501a', roughness: 0.29, metalness: 0.94, clearcoat: 0.2, clearcoatRoughness: 0.2, envMapIntensity: 1.82 }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#d8e3ea', roughness: 0.16, metalness: 1, clearcoat: 0.28, clearcoatRoughness: 0.1, envMapIntensity: 2.08 }),
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
    onyx: new THREE.MeshPhysicalMaterial({
      color: '#102b4a',
      roughness: 0.2,
      metalness: 0.12,
      clearcoat: 0.94,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.34,
    }),
    velvet: new THREE.MeshPhysicalMaterial({
      color: '#1a467e',
      roughness: 0.68,
      metalness: 0,
      sheen: 0.82,
      sheenColor: new THREE.Color('#74a7df'),
      sheenRoughness: 0.72,
      envMapIntensity: 0.52,
    }),
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

function addGardenCoastalTerminus(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
) {
  const terminus = new THREE.Group();
  terminus.name = 'vault-garden-layered-royal-coastal-terminus';

  const coveTerrace = mesh(
    new THREE.RingGeometry(3.18, 4.42, segmentCount(quality, 36, 56, 80), 2, 0, Math.PI),
    materials.wall,
    'vault-garden-curved-limestone-cove-terrace',
  );
  coveTerrace.rotation.x = -Math.PI / 2;
  coveTerrace.position.set(0, -0.03, -11.35);
  terminus.add(coveTerrace);

  const coveGoldEdge = mesh(
    new THREE.TorusGeometry(3.78, 0.055, 10, segmentCount(quality, 42, 64, 88), Math.PI),
    materials.gold,
    'vault-garden-curved-cove-solid-gold-water-edge',
  );
  coveGoldEdge.rotation.x = -Math.PI / 2;
  coveGoldEdge.position.set(0, 0.04, -11.35);
  terminus.add(coveGoldEdge);

  const coveWaterShape = new THREE.Shape();
  coveWaterShape.moveTo(-2.72, 0);
  coveWaterShape.bezierCurveTo(-4.3, 1.2, -5.1, 4.5, -4.35, 7.2);
  coveWaterShape.bezierCurveTo(-2.1, 8.15, 2.1, 8.15, 4.35, 7.2);
  coveWaterShape.bezierCurveTo(5.1, 4.5, 4.3, 1.2, 2.72, 0);
  coveWaterShape.closePath();
  const coveWaterMaterial = new THREE.MeshPhysicalMaterial({
    color: '#39c7c3',
    roughness: 0.055,
    metalness: 0,
    transmission: 0.46,
    thickness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    envMapIntensity: 1.9,
    side: THREE.DoubleSide,
  });
  const coveWater = mesh(
    new THREE.ShapeGeometry(coveWaterShape, segmentCount(quality, 3, 5, 7)),
    coveWaterMaterial,
    'vault-garden-wide-concave-crystalline-shallow-water-cove',
  );
  coveWater.rotation.x = -Math.PI / 2;
  coveWater.position.set(0, 0.12, -10.08);
  coveWater.renderOrder = 3;
  terminus.add(coveWater);
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: '#e6ffff',
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const side of [-1, 1] as const) {
    const foam = mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 2.7, 0.145, -10.12),
          new THREE.Vector3(side * 3.75, 0.12, -11.75),
          new THREE.Vector3(side * 4.2, 0.085, -14.1),
          new THREE.Vector3(side * 3.7, 0.045, -16.3),
        ]),
        segmentCount(quality, 20, 32, 46),
        0.028,
        7,
        false,
      ),
      foamMaterial,
      'vault-garden-curved-crystalline-cove-shoreline-foam',
    );
    foam.renderOrder = 4;
    terminus.add(foam);
  }

  for (let rockIndex = 0; rockIndex < 17; rockIndex += 1) {
    const angle = rockIndex / 16 * Math.PI;
    const radius = 4.45 + (rockIndex % 3) * 0.14;
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.23 + (rockIndex % 4) * 0.035, quality === 'high' ? 1 : 0),
      rockIndex % 4 === 0 ? materials.darkGold : materials.wall,
      'vault-garden-layered-natural-cove-rock',
    );
    rock.position.set(
      Math.cos(angle) * radius,
      -0.16 + (rockIndex % 3) * 0.04,
      -11.35 - Math.sin(angle) * radius * 0.6,
    );
    rock.rotation.set(rockIndex * 0.31, angle, rockIndex * 0.17);
    rock.scale.set(1.18, 0.62 + (rockIndex % 2) * 0.16, 0.92);
    terminus.add(rock);
  }

  for (let causewayIndex = 0; causewayIndex < 7; causewayIndex += 1) {
    const z = -12.35 - causewayIndex * 0.92;
    const landing = mesh(
      new RoundedBoxGeometry(0.82 + causewayIndex * 0.025, 0.14, 0.66, 3, 0.08),
      causewayIndex % 2 === 0 ? materials.floor : materials.wall,
      'vault-garden-offshore-pavilion-ceremonial-causeway-landing',
    );
    landing.position.set(Math.sin(causewayIndex * 0.8) * 0.08, -0.04, z);
    const landingInlay = mesh(
      new RoundedBoxGeometry(0.58, 0.035, 0.46, 2, 0.045),
      causewayIndex % 2 === 0 ? materials.gold : materials.floorShade,
      'vault-garden-offshore-pavilion-causeway-gold-and-sapphire-inlay',
    );
    landingInlay.position.set(landing.position.x, 0.045, z);
    terminus.add(landing, landingInlay);
  }

  for (const [x, z, scale] of [[-4.8, -16.5, 1.15], [4.95, -17.2, 1.24]] as const) {
    const islet = mesh(
      new THREE.DodecahedronGeometry(1.15, quality === 'high' ? 1 : 0),
      materials.wall,
      'vault-garden-mid-distance-dimensional-coastal-islet',
    );
    islet.position.set(x, -0.42, z);
    islet.scale.set(scale * 1.45, scale * 0.38, scale);
    terminus.add(islet);
    for (let treeIndex = 0; treeIndex < 3; treeIndex += 1) {
      const tree = mesh(
        new THREE.ConeGeometry(0.18 + treeIndex * 0.025, 0.82 + treeIndex * 0.12, 12),
        materials.emeraldGem,
        'vault-garden-mid-distance-islet-cypress',
      );
      tree.position.set(x + (treeIndex - 1) * 0.42, 0.2 + treeIndex * 0.06, z - 0.1);
      terminus.add(tree);
    }
  }

  for (const [side, x, z, scale] of [[-1, -4.65, -27.0, 0.72], [1, 4.85, -28.6, 0.78]] as const) {
    const coast = new THREE.Group();
    coast.name = 'vault-garden-real-three-dimensional-horizon-villa-island';
    coast.position.set(x, 0, z);
    const coastBase = mesh(
      new THREE.DodecahedronGeometry(0.86, quality === 'high' ? 1 : 0),
      materials.wallTrim,
      'vault-garden-horizon-island-faceted-coastal-rock',
    );
    coastBase.position.y = -0.04;
    coastBase.scale.set(1.75 * scale, 0.38 * scale, 1.12 * scale);
    coast.add(coastBase);
    for (let peakIndex = 0; peakIndex < 3; peakIndex += 1) {
      const peak = mesh(
        new THREE.DodecahedronGeometry(0.34 + peakIndex * 0.055, quality === 'high' ? 1 : 0),
        materials.wallTrim,
        'vault-garden-horizon-island-dimensional-mountain-peak',
      );
      peak.position.set((peakIndex - 1) * 0.38, 0.32 + peakIndex * 0.12, (peakIndex % 2) * -0.16);
      peak.scale.set(1.05, 1.18 + peakIndex * 0.1, 0.92);
      coast.add(peak);
      const cypress = mesh(
        new THREE.ConeGeometry(0.09, 0.48, 10),
        materials.emeraldGem,
        'vault-garden-horizon-island-sculptural-cypress',
      );
      cypress.position.set((peakIndex - 1) * 0.3, 0.54 + peakIndex * 0.09, 0.34);
      coast.add(cypress);
    }
    for (let villaIndex = 0; villaIndex < 3; villaIndex += 1) {
      const villaX = (villaIndex - 1) * 0.3 + side * 0.06;
      const villa = mesh(
        new RoundedBoxGeometry(0.22, 0.2, 0.18, 2, 0.025),
        materials.floor,
        'vault-garden-horizon-island-miniature-limestone-villa',
      );
      villa.position.set(villaX, 0.36 + villaIndex * 0.04, -0.28);
      const roof = mesh(
        new THREE.ConeGeometry(0.18, 0.14, 8),
        villaIndex % 2 === 0 ? materials.gold : materials.enamel,
        'vault-garden-horizon-island-miniature-gold-and-enamel-roof',
      );
      roof.position.set(villaX, villa.position.y + 0.17, villa.position.z);
      coast.add(villa, roof);
    }
    terminus.add(coast);
  }

  const pavilion = new THREE.Group();
  pavilion.name = 'vault-garden-offshore-sovereign-destination-pavilion';
  pavilion.position.set(0, 0.34, -19.6);
  pavilion.scale.set(1.32, 1.48, 1.32);
  const pavilionIsland = mesh(
    new THREE.DodecahedronGeometry(1.68, quality === 'high' ? 1 : 0),
    materials.wall,
    'vault-garden-offshore-pavilion-volumetric-island',
  );
  pavilionIsland.position.y = -0.56;
  pavilionIsland.scale.set(1.5, 0.34, 1.08);
  const lowerCourt = cylinder(1.52, 1.72, 0.24, segmentCount(quality, 32, 48, 64), materials.wall, 'vault-garden-offshore-pavilion-limestone-court');
  lowerCourt.position.y = -0.08;
  const courtRing = goldRing(1.53, 0.07, materials, quality, 'vault-garden-offshore-pavilion-solid-gold-court-ring');
  courtRing.position.y = 0.08;
  pavilion.add(pavilionIsland, lowerCourt, courtRing);
  for (let columnIndex = 0; columnIndex < 8; columnIndex += 1) {
    const angle = columnIndex / 8 * Math.PI * 2;
    const column = cylinder(0.095, 0.125, 2.1, segmentCount(quality, 12, 18, 24), materials.floor, 'vault-garden-offshore-pavilion-pearl-column');
    column.position.set(Math.sin(angle) * 1.03, 1.15, Math.cos(angle) * 1.03);
    const capital = cylinder(0.17, 0.14, 0.13, 18, materials.gold, 'vault-garden-offshore-pavilion-gold-capital');
    capital.position.set(column.position.x, 2.23, column.position.z);
    pavilion.add(column, capital);
  }
  const crownRing = goldRing(1.15, 0.08, materials, quality, 'vault-garden-offshore-pavilion-royal-gold-crown-ring');
  crownRing.position.y = 2.34;
  const pavilionDome = mesh(
    new THREE.SphereGeometry(1.17, segmentCount(quality, 24, 36, 48), segmentCount(quality, 12, 18, 24), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.enamel,
    'vault-garden-offshore-pavilion-deep-sapphire-dome',
  );
  pavilionDome.position.y = 2.34;
  pavilionDome.scale.y = 0.62;
  const beacon = mesh(new THREE.OctahedronGeometry(0.22, 2), materials.cyanGem, 'vault-garden-offshore-pavilion-aquamarine-beacon');
  beacon.position.y = 3.34;
  beacon.userData.waterPhase = 8.2;
  pavilion.add(crownRing, pavilionDome, beacon);
  const pavilionLight = new THREE.PointLight('#ffd078', quality === 'high' ? 1.2 : 0.8, 7, 2);
  pavilionLight.position.set(0, 2.2, 0.6);
  pavilion.add(pavilionLight);
  terminus.add(pavilion);

  parent.add(terminus);
}

function curvedGalleryRail(
  radius: number,
  y: number,
  tube: number,
  material: THREE.Material,
  name: string,
  start = -1.38,
  end = 1.38,
) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 40; index += 1) {
    const angle = start + (index / 40) * (end - start);
    points.push(new THREE.Vector3(Math.sin(angle) * radius, y, -Math.cos(angle) * radius));
  }
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, tube, 8, false), material, name);
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
  const releaseBlenderTreasureAssets: Array<() => void> = [];
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
    const proceduralPedestal = model.root.getObjectByName(`treasure-${definition.id}-pedestal`);
    if (proceduralPedestal) proceduralPedestal.visible = false;
    const layout = VAULT_MUSEUM_DISPLAY_LAYOUT.find((candidate) => candidate.id === definition.id)
      ?? VAULT_MUSEUM_DISPLAY_LAYOUT[index]
      ?? VAULT_MUSEUM_DISPLAY_LAYOUT[0];
    model.root.name = socket?.sceneNodeName ?? `vault-interior-display-${definition.id}`;
    model.root.position.set(layout.x, layout.y, layout.z);
    model.root.rotation.y = layout.rotationY;
    model.root.scale.setScalar(layout.scale);
    model.treasure.visible = isUnlocked;
    model.root.userData.vaultInteriorDisplay = isUnlocked;
    model.root.userData.vaultInteriorLocked = !isUnlocked;
    model.treasure.userData.vaultInteriorHeroTreasure = true;
    if (!isUnlocked) {
      model.root.traverse((child) => {
        delete child.userData.treasureId;
      });
    }
    displays.add(model.root);

    releaseBlenderTreasureAssets.push(loadBlenderTreasureAsset(
      model,
      definition.id,
      VAULT_BLENDER_TREASURE_ASSETS[definition.id],
      isUnlocked,
      materials,
    ));

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

  });

  displays.userData.treasureModels = treasureModels;
  displays.userData.releaseBlenderTreasureAssets = releaseBlenderTreasureAssets;
  parent.add(displays);
}

function addSpotlightBeams(parent: THREE.Group, materials: VaultInteriorMaterials, quality: VaultIslandQuality) {
  const beams = new THREE.Group();
  beams.name = 'vault-interior-collection-light-beams';
  VAULT_MUSEUM_DISPLAY_LAYOUT.forEach((display, index) => {
    const cone = mesh(new THREE.ConeGeometry(0.11 + (index % 3) * 0.015, 1.05, segmentCount(quality, 18, 24, 32), 1, true), materials.cyanGlow, 'vault-interior-soft-spotlight-cone');
    cone.position.set(display.x, display.y + 1.65, display.z + 0.08);
    cone.rotation.x = Math.PI;
    cone.scale.z = 0.28;
    beams.add(cone);
  });
  parent.add(beams);
}

function addMuseumLuxuryGalleryLayer(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
) {
  const gallery = new THREE.Group();
  gallery.name = 'vault-interior-royal-relic-gallery-layer';
  VAULT_MUSEUM_DISPLAY_LAYOUT.forEach((display, index) => {
    const alcove = new THREE.Group();
    alcove.name = `vault-interior-${display.id}-authored-relic-bay`;
    const isUpperHero = display.id === 'obelisk';
    const isWideBay = display.id === 'crown' || display.id === 'key' || display.id === 'chalice';
    const bayWidth = isUpperHero ? 1.42 : isWideBay ? 1.12 : 0.92;
    const bayHeight = isUpperHero ? 2.35 : display.id === 'medallion' ? 1.32 : 1.72;
    alcove.position.set(display.x, display.y + (isUpperHero ? 1.25 : 1.08), display.z - 0.38);
    alcove.rotation.y = display.rotationY;

    const backing = mesh(
      new RoundedBoxGeometry(bayWidth, bayHeight, 0.12, quality === 'high' ? 4 : 2, 0.055),
      index % 3 === 0 ? materials.velvet : index % 3 === 1 ? materials.wallTrim : materials.onyx,
      `vault-interior-${display.id}-relic-bay-backing`,
    );
    const inset = mesh(
      new RoundedBoxGeometry(bayWidth - 0.18, bayHeight - 0.2, 0.055, quality === 'high' ? 4 : 2, 0.04),
      index % 2 === 0 ? materials.onyx : materials.velvet,
      `vault-interior-${display.id}-relic-bay-inset`,
    );
    inset.position.z = 0.06;
    alcove.add(backing, inset);

    for (const side of [-1, 1] as const) {
      const pilaster = mesh(
        new RoundedBoxGeometry(0.055, bayHeight - 0.26, 0.05, 2, 0.014),
        materials.gold,
        'vault-interior-relic-alcove-gold-pilaster',
      );
      pilaster.position.set(side * (bayWidth * 0.5 - 0.07), -0.02, 0.105);
      alcove.add(pilaster);
    }

    if (index % 2 === 0) {
      const arch = mesh(
        new THREE.TorusGeometry(
          bayWidth * 0.43,
          0.035,
          segmentCount(quality, 8, 10, 12),
          segmentCount(quality, 22, 34, 46),
          Math.PI,
        ),
        materials.gold,
        `vault-interior-${display.id}-relic-bay-crowned-gold-arch`,
      );
      arch.position.set(0, bayHeight * 0.42, 0.11);
      alcove.add(arch);
    } else {
      const lintel = mesh(
        new RoundedBoxGeometry(bayWidth - 0.08, 0.07, 0.055, 2, 0.015),
        materials.silver,
        `vault-interior-${display.id}-relic-bay-silver-lintel`,
      );
      lintel.position.set(0, bayHeight * 0.46, 0.11);
      alcove.add(lintel);
    }

    const plaqueFrame = mesh(
      new RoundedBoxGeometry(0.48, 0.13, 0.065, 3, 0.025),
      materials.gold,
      'vault-interior-relic-alcove-accession-plaque-frame',
    );
    plaqueFrame.position.set(0, -bayHeight * 0.43, 0.11);
    const plaqueFace = mesh(
      new RoundedBoxGeometry(0.4, 0.075, 0.045, 3, 0.018),
      materials.onyx,
      'vault-interior-relic-alcove-accession-plaque-face',
    );
    plaqueFace.position.set(0, -bayHeight * 0.43, 0.15);
    alcove.add(plaqueFrame, plaqueFace);

    const crownGem = mesh(
      new THREE.OctahedronGeometry(index % 3 === 0 ? 0.075 : 0.06, quality === 'high' ? 1 : 0),
      index % 3 === 0 ? materials.violetGem : index % 3 === 1 ? materials.cyanGem : materials.emeraldGem,
      'vault-interior-relic-alcove-crown-gem',
    );
    crownGem.position.set(0, bayHeight * 0.52, 0.13);
    alcove.add(crownGem);
    gallery.add(alcove);
  });

  const lowerCornice = curvedGalleryRail(3.92, 0.54, 0.05, materials.darkGold, 'vault-interior-gallery-lower-gold-cornice');
  const upperCornice = curvedGalleryRail(3.93, 2.48, 0.06, materials.gold, 'vault-interior-gallery-upper-gold-cornice');
  gallery.add(lowerCornice, upperCornice);
  parent.add(gallery);
}

function addAtriumLuxuryDetails(
  parent: THREE.Group,
  materials: VaultInteriorMaterials,
  quality: VaultIslandQuality,
) {
  const details = new THREE.Group();
  details.name = 'vault-palace-atrium-royal-luxury-details';

  for (const side of [-1, 1] as const) {
    const newel = cylinder(
      0.1,
      0.15,
      0.76,
      segmentCount(quality, 12, 16, 20),
      materials.floor,
      'vault-palace-atrium-royal-stair-newel',
    );
    newel.position.set(side * 3.3, 0.68, 1.02);
    const newelCollar = goldRing(0.14, 0.025, materials, quality, 'vault-palace-atrium-newel-gold-collar');
    newelCollar.position.copy(newel.position);
    newelCollar.position.y += 0.25;
    const newelGem = mesh(
      new THREE.OctahedronGeometry(0.115, quality === 'high' ? 1 : 0),
      side < 0 ? materials.cyanGem : materials.violetGem,
      'vault-palace-atrium-newel-crown-gem',
    );
    newelGem.position.copy(newel.position);
    newelGem.position.y += 0.48;
    details.add(newel, newelCollar, newelGem);
  }

  const descentHalo = goldRing(1.64, 0.045, materials, quality, 'vault-palace-atrium-descent-double-gold-halo');
  descentHalo.position.set(0, 0.245, 0.28);
  const descentSilverHalo = goldRing(1.5, 0.018, materials, quality, 'vault-palace-atrium-descent-silver-halo');
  descentSilverHalo.material = materials.silver;
  descentSilverHalo.position.set(0, 0.255, 0.28);
  details.add(descentHalo, descentSilverHalo);

  const domeRosetteAngles = [-0.92, -0.46, 0, 0.46, 0.92];
  domeRosetteAngles.forEach((phi, index) => {
    const theta = index % 2 === 0 ? 0.58 : 0.82;
    const radius = 4.05;
    const rosette = mesh(
      new THREE.OctahedronGeometry(index === 2 ? 0.13 : 0.09, quality === 'high' ? 1 : 0),
      index % 2 === 0 ? materials.gold : materials.cyanGem,
      'vault-palace-atrium-dome-jewel-rosette',
    );
    rosette.position.set(
      Math.sin(theta) * radius * Math.sin(phi),
      8.1 + Math.cos(theta) * radius * 0.64 - 0.04,
      -Math.sin(theta) * radius * Math.cos(phi) + 0.05,
    );
    details.add(rosette);
  });

  parent.add(details);
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
    '/assets/islands/special/vault-island/vault-atrium.glb?v=028',
    'vault-palace-atrium-blender-architecture-v028',
    materials,
  );
  addAtriumLuxuryDetails(root, materials, quality);
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

function createVaultTreasureGardenGalleryModelFamilyA(options: VaultTreasureVaultInteriorOptions = {}): VaultTreasureIslandRuntime {
  const quality = options.quality ?? 'medium';
  const materials = createVaultInteriorMaterials();
  const root = new THREE.Group();
  root.name = 'vault-treasure-garden-gallery-model';
  root.userData.architectureReady = true;
  root.userData.sculptRuntime = {
    id: 'vault-treasure-garden-gallery',
    status: 'phone-lab-navigable-palace-garden-destination',
    futureGameplayRole: 'customizable-vault-island-garden-and-ceremonial-route',
  };

  const foliage = new THREE.MeshPhysicalMaterial({
    color: '#0b5139', roughness: 0.58, clearcoat: 0.22, clearcoatRoughness: 0.34, envMapIntensity: 0.72,
  });
  const foliageLight = new THREE.MeshPhysicalMaterial({
    color: '#236846', roughness: 0.56, clearcoat: 0.22, clearcoatRoughness: 0.34, envMapIntensity: 0.74,
  });
  const soil = new THREE.MeshStandardMaterial({ color: '#38251d', roughness: 0.86 });
  const water = new THREE.MeshPhysicalMaterial({
    color: '#38cfd1', roughness: 0.035, metalness: 0.02, transmission: 0.32, thickness: 0.32,
    clearcoat: 1, clearcoatRoughness: 0.035, transparent: true, opacity: 0.86, envMapIntensity: 1.7,
  });
  const flowerMaterials = [materials.ruby, materials.violetGem, materials.cyanGem, materials.gold] as const;
  const architecture = new THREE.Group();
  architecture.name = 'vault-garden-gallery-long-processional-architecture';

  const skyGeometry = new THREE.SphereGeometry(34, segmentCount(quality, 28, 40, 56), segmentCount(quality, 16, 22, 30));
  const skyPositions = skyGeometry.getAttribute('position');
  const skyColors = new Float32Array(skyPositions.count * 3);
  const horizonColor = new THREE.Color('#f1bc69');
  const amberColor = new THREE.Color('#bd6c39');
  const zenithColor = new THREE.Color('#68445b');
  const skyColor = new THREE.Color();
  for (let index = 0; index < skyPositions.count; index += 1) {
    const normalizedY = THREE.MathUtils.clamp((skyPositions.getY(index) + 7) / 31, 0, 1);
    if (normalizedY < 0.46) skyColor.copy(horizonColor).lerp(amberColor, normalizedY / 0.46);
    else skyColor.copy(amberColor).lerp(zenithColor, (normalizedY - 0.46) / 0.54);
    skyColors[index * 3] = skyColor.r;
    skyColors[index * 3 + 1] = skyColor.g;
    skyColors[index * 3 + 2] = skyColor.b;
  }
  skyGeometry.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const skyMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
  skyDome.name = 'vault-garden-gallery-actual-three-dimensional-golden-hour-sky-dome';
  skyDome.position.set(0, -3.5, -3);
  skyDome.renderOrder = -10;
  root.add(skyDome);

  const foundation = mesh(new RoundedBoxGeometry(7.7, 0.28, 14.8, 4, 0.08), materials.wall, 'vault-garden-gallery-limestone-foundation');
  foundation.position.set(0, -0.12, -1.75);
  architecture.add(foundation);
  const marbleFloor = mesh(new RoundedBoxGeometry(7.3, 0.12, 14.4, 4, 0.06), materials.floor, 'vault-garden-gallery-polished-marble-floor');
  marbleFloor.position.set(0, 0.08, -1.75);
  architecture.add(marbleFloor);

  const processionalPath = mesh(new RoundedBoxGeometry(1.74, 0.06, 13.5, 4, 0.045), materials.floorShade, 'vault-garden-gallery-midnight-processional-path');
  processionalPath.position.set(0, 0.17, -1.58);
  architecture.add(processionalPath);
  for (const side of [-1, 1] as const) {
    const border = mesh(new RoundedBoxGeometry(0.09, 0.035, 13.54, 3, 0.025), materials.gold, 'vault-garden-gallery-solid-gold-path-border');
    border.position.set(side * 0.91, 0.215, -1.58);
    architecture.add(border);
    const channelBed = mesh(new RoundedBoxGeometry(0.52, 0.11, 11.9, 4, 0.08), materials.onyx, 'vault-garden-gallery-reflecting-channel-bed');
    channelBed.position.set(side * 1.26, 0.18, -1.92);
    const channelWater = mesh(new RoundedBoxGeometry(0.42, 0.045, 11.68, 4, 0.065), water, 'vault-garden-gallery-crystal-water-channel');
    channelWater.position.set(side * 1.26, 0.255, -1.92);
    channelWater.userData.waterPhase = side < 0 ? 0 : Math.PI;
    architecture.add(channelBed, channelWater);
  }

  const bayZ = [2.95, 1.15, -0.65, -2.45, -4.25, -6.05];
  bayZ.forEach((z, bayIndex) => {
    for (const side of [-1, 1] as const) {
      const column = cylinder(0.18, 0.24, 4.65, segmentCount(quality, 16, 24, 32), materials.floor, 'vault-garden-gallery-monumental-limestone-column');
      column.position.set(side * 2.8, 2.48, z);
      architecture.add(column);
      for (const [y, radius, height, material, name] of [
        [0.31, 0.36, 0.18, materials.wall, 'vault-garden-gallery-column-stepped-base'],
        [4.73, 0.34, 0.16, materials.gold, 'vault-garden-gallery-column-gold-capital'],
        [4.91, 0.42, 0.16, materials.darkGold, 'vault-garden-gallery-column-entablature-block'],
      ] as const) {
        const trim = cylinder(radius, radius, height, segmentCount(quality, 16, 24, 32), material, name);
        trim.position.set(side * 2.8, y, z);
        architecture.add(trim);
      }

      if (bayIndex < bayZ.length - 1) {
        const planter = mesh(new RoundedBoxGeometry(0.74, 0.5, 1.28, 4, 0.11), materials.wall, 'vault-garden-gallery-limestone-parterre-planter');
        planter.position.set(side * 2.08, 0.39, z - 0.9);
        const planterSoil = mesh(new RoundedBoxGeometry(0.62, 0.05, 1.08, 3, 0.07), soil, 'vault-garden-gallery-rich-parterre-soil');
        planterSoil.position.set(side * 2.08, 0.66, z - 0.9);
        architecture.add(planter, planterSoil);
        for (let plantIndex = 0; plantIndex < 5; plantIndex += 1) {
          const px = side * (1.94 + (plantIndex % 2) * 0.26);
          const pz = z - 0.56 - Math.floor(plantIndex / 2) * 0.34;
          const shrub = mesh(
            new THREE.IcosahedronGeometry(0.2 + (plantIndex % 3) * 0.025, quality === 'high' ? 2 : 1),
            plantIndex % 2 === 0 ? foliage : foliageLight,
            'vault-garden-gallery-sculpted-evergreen-shrub',
          );
          shrub.position.set(px, 0.89 + (plantIndex % 2) * 0.04, pz);
          shrub.scale.set(1, 1.24, 0.92);
          architecture.add(shrub);
          const flower = mesh(
            new THREE.OctahedronGeometry(0.07, quality === 'high' ? 1 : 0),
            flowerMaterials[(plantIndex + bayIndex) % flowerMaterials.length],
            'vault-garden-gallery-jewel-flower',
          );
          flower.position.set(px, 1.16 + (plantIndex % 2) * 0.04, pz);
          flower.rotation.y = plantIndex * 0.72;
          architecture.add(flower);
        }
      }
    }

    const arch = mesh(
      new THREE.TorusGeometry(2.8, 0.085, segmentCount(quality, 8, 10, 12), segmentCount(quality, 36, 52, 72), Math.PI),
      bayIndex % 2 === 0 ? materials.gold : materials.darkGold,
      'vault-garden-gallery-open-gold-canopy-rib',
    );
    arch.position.set(0, 4.72, z);
    architecture.add(arch);
  });

  bayZ.forEach((z, bayIndex) => {
    for (const side of [-1, 1] as const) {
      const lanternBracket = mesh(new RoundedBoxGeometry(0.18, 0.06, 0.32, 3, 0.02), materials.darkGold, 'vault-garden-gallery-column-lantern-bracket');
      lanternBracket.position.set(side * 2.62, 2.55, z + 0.12);
      lanternBracket.rotation.y = side * 0.2;
      const lantern = mesh(new THREE.OctahedronGeometry(0.105, 1), materials.warmGlow, 'vault-garden-gallery-warm-lantern-jewel');
      lantern.position.set(side * 2.48, 2.43, z + 0.22);
      architecture.add(lanternBracket, lantern);
      if (quality === 'high' && bayIndex % 2 === 0) {
        const lanternLight = new THREE.PointLight('#ffc065', 0.58, 2.7, 2);
        lanternLight.name = 'vault-garden-gallery-warm-column-lantern-light';
        lanternLight.position.copy(lantern.position);
        root.add(lanternLight);
      }
    }
  });

  for (let moteIndex = 0; moteIndex < (quality === 'low' ? 12 : 24); moteIndex += 1) {
    const side = moteIndex % 2 === 0 ? -1 : 1;
    const mote = mesh(
      new THREE.OctahedronGeometry(0.025 + (moteIndex % 3) * 0.007, 0),
      moteIndex % 5 === 0 ? materials.cyanGem : materials.warmGlow,
      'vault-garden-gallery-floating-lantern-mote-jewel',
    );
    mote.position.set(side * (1.72 + (moteIndex % 4) * 0.22), 1.08 + (moteIndex % 7) * 0.31, 3.0 - Math.floor(moteIndex / 2) * 0.78);
    mote.userData.waterPhase = moteIndex * 0.47;
    architecture.add(mote);
  }

  for (const [topiaryIndex, z] of [2.05, -1.55, -5.15].entries()) {
    for (const side of [-1, 1] as const) {
      const trunk = cylinder(0.105, 0.14, 1.42, 14, materials.darkGold, 'vault-garden-gallery-gilded-topiary-trunk');
      trunk.position.set(side * 2.12, 1.24, z);
      architecture.add(trunk);
      for (let tier = 0; tier < 3; tier += 1) {
        const crownGeometry = topiaryIndex === 1
          ? new THREE.DodecahedronGeometry(0.5 - tier * 0.075, quality === 'high' ? 2 : 1)
          : topiaryIndex === 2
            ? new THREE.ConeGeometry(0.5 - tier * 0.06, 0.78 - tier * 0.08, segmentCount(quality, 14, 20, 28))
            : new THREE.IcosahedronGeometry(0.5 - tier * 0.075, quality === 'high' ? 2 : 1);
        const crown = mesh(
          crownGeometry,
          tier % 2 === 0 ? foliage : foliageLight,
          'vault-garden-gallery-royal-tiered-topiary-crown',
        );
        crown.position.set(side * 2.12, 1.62 + tier * (topiaryIndex === 2 ? 0.48 : 0.42), z);
        crown.rotation.y = side * (topiaryIndex * 0.18 + tier * 0.22);
        crown.scale.set(topiaryIndex === 1 ? 0.92 : 0.86, topiaryIndex === 2 ? 1.28 : 1.16, topiaryIndex === 1 ? 0.8 : 0.86);
        architecture.add(crown);
      }
      const topiaryFinial = mesh(new THREE.OctahedronGeometry(0.105, 1), materials.gold, 'vault-garden-gallery-topiary-gold-finial');
      topiaryFinial.position.set(side * 2.12, 2.78, z);
      architecture.add(topiaryFinial);
    }
  }

  for (const side of [-1, 1] as const) {
    const entablature = mesh(new RoundedBoxGeometry(0.3, 0.28, 13.1, 3, 0.06), materials.gold, 'vault-garden-gallery-continuous-gold-entablature');
    entablature.position.set(side * 2.8, 5.02, -1.56);
    architecture.add(entablature);
    const outerWall = mesh(new RoundedBoxGeometry(0.22, 3.0, 13.5, 3, 0.05), materials.wall, 'vault-garden-gallery-open-arcade-limestone-plinth-wall');
    outerWall.position.set(side * 3.74, 1.62, -1.6);
    architecture.add(outerWall);
    for (let panel = 0; panel < 6; panel += 1) {
      const lattice = mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32), materials.gold, 'vault-garden-gallery-ornamental-gold-lattice-medallion');
      lattice.position.set(side * 3.84, 3.54, 2.75 - panel * 1.86);
      lattice.rotation.y = Math.PI / 2;
      architecture.add(lattice);
    }
  }

  for (const [index, z] of [3.1, 1.15, -0.8, -2.75, -4.7].entries()) {
    const medallion = mesh(
      new THREE.TorusGeometry(0.19, 0.025, 8, segmentCount(quality, 24, 36, 48)),
      materials.gold,
      'vault-garden-gallery-processional-gold-sun-medallion',
    );
    medallion.rotation.x = -Math.PI / 2;
    medallion.position.set(0, 0.235, z);
    const medallionGem = mesh(
      new THREE.OctahedronGeometry(0.065, quality === 'high' ? 1 : 0),
      flowerMaterials[index % flowerMaterials.length],
      'vault-garden-gallery-processional-medallion-gem',
    );
    medallionGem.position.set(0, 0.27, z);
    medallionGem.scale.y = 0.35;
    architecture.add(medallion, medallionGem);
  }

  const fountainCourt = mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.16, segmentCount(quality, 40, 64, 88)), materials.floor, 'vault-garden-gallery-terminal-fountain-court');
  fountainCourt.position.set(0, 0.19, -7.28);
  architecture.add(fountainCourt);
  const basin = cylinder(1.15, 1.28, 0.42, segmentCount(quality, 40, 64, 88), materials.wall, 'vault-garden-gallery-grand-fountain-basin');
  basin.position.set(0, 0.43, -7.28);
  const basinWater = cylinder(1.03, 1.03, 0.08, segmentCount(quality, 40, 64, 88), water, 'vault-garden-gallery-grand-fountain-water');
  basinWater.position.set(0, 0.68, -7.28);
  const fountainStem = cylinder(0.19, 0.28, 1.72, 24, materials.gold, 'vault-garden-gallery-gilded-fountain-stem');
  fountainStem.position.set(0, 1.28, -7.28);
  const fountainCrown = mesh(new THREE.OctahedronGeometry(0.42, 0), materials.cyanGem, 'vault-garden-gallery-faceted-fountain-crown-jewel');
  fountainCrown.position.set(0, 2.2, -7.28);
  fountainCrown.scale.y = 1.22;
  architecture.add(basin, basinWater, fountainStem, fountainCrown);
  for (let petalIndex = 0; petalIndex < 8; petalIndex += 1) {
    const angle = (petalIndex / 8) * Math.PI * 2;
    const petal = mesh(
      new THREE.ConeGeometry(0.13, 0.5, 5),
      petalIndex % 2 === 0 ? materials.gold : materials.silver,
      'vault-garden-gallery-crystal-lotus-metal-petal',
    );
    petal.position.set(Math.sin(angle) * 0.32, 1.88, -7.28 + Math.cos(angle) * 0.32);
    petal.rotation.set(Math.cos(angle) * 0.78, angle, Math.sin(angle) * -0.78);
    architecture.add(petal);
  }
  const lotusHeart = mesh(new THREE.OctahedronGeometry(0.18, 0), materials.violetGem, 'vault-garden-gallery-crystal-lotus-heart-jewel');
  lotusHeart.position.set(0, 2.72, -7.28);
  architecture.add(lotusHeart);
  for (let streamIndex = 0; streamIndex < 8; streamIndex += 1) {
    const angle = (streamIndex / 8) * Math.PI * 2;
    const points = [
      new THREE.Vector3(Math.sin(angle) * 0.08, 2.08, -7.28 + Math.cos(angle) * 0.08),
      new THREE.Vector3(Math.sin(angle) * 0.58, 1.66, -7.28 + Math.cos(angle) * 0.58),
      new THREE.Vector3(Math.sin(angle) * 0.9, 0.78, -7.28 + Math.cos(angle) * 0.9),
    ];
    const stream = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.022, 6, false), water, 'vault-garden-gallery-animated-fountain-stream');
    stream.userData.waterPhase = streamIndex * 0.7;
    architecture.add(stream);
  }

  const sunsetLoggia = new THREE.Group();
  sunsetLoggia.name = 'vault-garden-gallery-open-sunset-loggia-destination';
  for (const side of [-1, 1] as const) {
    const sapphireWing = mesh(new RoundedBoxGeometry(1.55, 5.45, 0.3, 4, 0.08), materials.wallTrim, 'vault-garden-gallery-sapphire-loggia-wing');
    sapphireWing.position.set(side * 2.18, 2.72, -8.62);
    sunsetLoggia.add(sapphireWing);
    for (const x of [side * 1.42, side * 2.92]) {
      const pilaster = cylinder(0.11, 0.16, 5.05, 18, materials.floor, 'vault-garden-gallery-loggia-limestone-pilaster');
      pilaster.position.set(x, 2.58, -8.39);
      const capital = cylinder(0.21, 0.21, 0.16, 18, materials.gold, 'vault-garden-gallery-loggia-gold-capital');
      capital.position.set(x, 5.08, -8.39);
      sunsetLoggia.add(pilaster, capital);
    }
    const branchPath = mesh(new RoundedBoxGeometry(0.78, 0.08, 3.35, 4, 0.05), materials.floorShade, 'vault-garden-gallery-branching-sunset-terrace-path');
    branchPath.position.set(side * 1.16, 0.26, -8.62);
    branchPath.rotation.y = side * -0.36;
    sunsetLoggia.add(branchPath);
  }
  const terrace = mesh(new RoundedBoxGeometry(5.6, 0.16, 2.6, 4, 0.07), materials.floor, 'vault-garden-gallery-sunset-belvedere-terrace');
  terrace.position.set(0, 0.16, -9.68);
  sunsetLoggia.add(terrace);
  for (const [radius, tube, material] of [[1.46, 0.105, materials.gold], [1.25, 0.04, materials.silver]] as const) {
    const portalArch = mesh(new THREE.TorusGeometry(radius, tube, 12, 72, Math.PI), material, 'vault-garden-gallery-layered-destination-arch');
    portalArch.position.set(0, 3.2, -8.38);
    sunsetLoggia.add(portalArch);
  }
  const destinationGem = mesh(new THREE.OctahedronGeometry(0.3, 0), materials.violetGem, 'vault-garden-gallery-destination-violet-jewel');
  destinationGem.position.set(0, 4.84, -8.3);
  sunsetLoggia.add(destinationGem);

  for (const side of [-1, 1] as const) {
    const pavilion = new THREE.Group();
    pavilion.name = 'vault-garden-gallery-distant-domed-palace-pavilion';
    pavilion.position.set(side * 1.92, 1.65, -11.55);
    const tower = cylinder(0.58, 0.68, 2.75, 24, materials.wall, 'vault-garden-gallery-distant-pavilion-limestone-tower');
    tower.position.y = 1.55;
    const towerBand = cylinder(0.72, 0.72, 0.14, 24, materials.gold, 'vault-garden-gallery-distant-pavilion-gold-cornice');
    towerBand.position.y = 2.92;
    const dome = mesh(
      new THREE.SphereGeometry(0.76, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.gold,
      'vault-garden-gallery-distant-pavilion-gold-dome',
    );
    dome.position.y = 3.0;
    dome.scale.y = 0.72;
    const pavilionFinial = mesh(new THREE.OctahedronGeometry(0.13, 0), materials.cyanGem, 'vault-garden-gallery-distant-pavilion-jewel-finial');
    pavilionFinial.position.y = 3.68;
    pavilion.add(tower, towerBand, dome, pavilionFinial);
    sunsetLoggia.add(pavilion);
  }

  const balustradeRail = mesh(new RoundedBoxGeometry(5.2, 0.11, 0.12, 3, 0.025), materials.gold, 'vault-garden-gallery-belvedere-gold-balustrade-rail');
  balustradeRail.position.set(0, 1.02, -10.82);
  sunsetLoggia.add(balustradeRail);
  for (let index = 0; index < 13; index += 1) {
    const x = -2.4 + index * 0.4;
    const baluster = cylinder(0.035, 0.055, 0.78, 10, index % 3 === 0 ? materials.floor : materials.gold, 'vault-garden-gallery-belvedere-baluster');
    baluster.position.set(x, 0.64, -10.82);
    sunsetLoggia.add(baluster);
  }
  const sunMaterial = new THREE.MeshBasicMaterial({ color: '#ffd37a', toneMapped: false });
  const sunsetSun = mesh(new THREE.SphereGeometry(0.86, 32, 20), sunMaterial, 'vault-garden-gallery-three-dimensional-setting-sun');
  sunsetSun.position.set(0, 3.35, -12.4);
  sunsetLoggia.add(sunsetSun);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#ffd9bd', roughness: 0.92, emissive: '#8a3e22', emissiveIntensity: 0.08 });
  for (const side of [-1, 1] as const) {
    const cloudBank = new THREE.Group();
    cloudBank.name = 'vault-garden-gallery-three-dimensional-sunset-cloud-bank';
    cloudBank.position.set(side * 2.65, 3.85 + (side > 0 ? 0.35 : 0), -11.7);
    for (let puff = 0; puff < 5; puff += 1) {
      const cloud = mesh(new THREE.SphereGeometry(0.34 + (puff % 3) * 0.11, 18, 12), cloudMaterial, 'vault-garden-gallery-sunset-cloud-volume');
      cloud.position.set((puff - 2) * 0.38, Math.sin(puff * 1.7) * 0.12, (puff % 2) * 0.08);
      cloud.scale.y = 0.58;
      cloudBank.add(cloud);
    }
    sunsetLoggia.add(cloudBank);
  }
  for (const side of [-1, 1] as const) {
    const cypressTrunk = cylinder(0.08, 0.12, 1.2, 12, materials.darkGold, 'vault-garden-gallery-belvedere-cypress-trunk');
    cypressTrunk.position.set(side * 2.08, 0.85, -9.72);
    const cypress = mesh(new THREE.ConeGeometry(0.48, 2.5, 18), foliage, 'vault-garden-gallery-belvedere-cypress-crown');
    cypress.position.set(side * 2.08, 2.02, -9.72);
    sunsetLoggia.add(cypressTrunk, cypress);
  }
  architecture.add(sunsetLoggia);
  root.add(architecture);

  const warmLight = new THREE.DirectionalLight('#ffc46a', quality === 'low' ? 1.3 : 2.2);
  warmLight.position.set(-4.5, 8.5, 5.2);
  const fountainLight = new THREE.PointLight('#7ef3ff', quality === 'low' ? 1.2 : 2.8, 8.5, 2);
  fountainLight.position.set(0, 2.35, -7.0);
  root.add(warmLight, fountainLight);
  bayZ.forEach((z, index) => {
    if (quality === 'low' && index % 2 === 1) return;
    const cove = new THREE.PointLight(index % 2 === 0 ? '#ffd18c' : '#9cecff', quality === 'high' ? 1.15 : 0.78, 4.8, 2);
    cove.position.set(0, 4.42, z);
    root.add(cove);
  });

  const animatedWater: THREE.Object3D[] = [];
  root.traverse((child) => {
    if (child.userData.waterPhase !== undefined || child.name.includes('jewel')) {
      child.userData.baseGardenY = child.position.y;
      animatedWater.push(child);
    }
  });
  return {
    root,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      animatedWater.forEach((object, index) => {
        const phase = Number(object.userData.waterPhase) || index * 0.5;
        if (object instanceof THREE.Mesh && object.material === water) {
          object.material = water;
          object.scale.y = 1 + Math.sin(elapsedSeconds * 1.6 + phase) * 0.012;
        } else {
          object.rotation.y += 0.004 + (index % 3) * 0.001;
          object.position.y = Number(object.userData.baseGardenY) + Math.sin(elapsedSeconds * 1.2 + phase) * 0.012;
        }
      });
    },
    dispose: () => {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        childMaterials.forEach((material) => material.dispose());
      });
      Object.values(materials).forEach((resource) => resource.dispose());
      foliage.dispose();
      foliageLight.dispose();
      soil.dispose();
      water.dispose();
      sunMaterial.dispose();
      cloudMaterial.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
    },
  };
}

export function createVaultTreasureGardenGalleryModel(options: VaultTreasureVaultInteriorOptions = {}): VaultTreasureIslandRuntime {
  const quality = options.quality ?? 'medium';
  const materials = createVaultInteriorMaterials();
  const root = new THREE.Group();
  const animatedObjects: THREE.Object3D[] = [];
  root.name = 'vault-treasure-garden-gallery-family-b';
  root.userData.architectureReady = true;
  root.userData.sculptRuntime = {
    id: 'vault-treasure-garden-gallery-family-b',
    status: 'phone-lab-volumetric-palace-garden-route',
    futureGameplayRole: 'customizable-vault-island-garden-and-ceremonial-route',
  };

  const limestone = new THREE.MeshStandardMaterial({ color: '#d4c29f', roughness: 0.58, metalness: 0.01 });
  const limestoneLight = new THREE.MeshStandardMaterial({ color: '#eadbc0', roughness: 0.5, metalness: 0.01 });
  const foliageDark = new THREE.MeshPhysicalMaterial({ color: '#164b34', roughness: 0.66, clearcoat: 0.12, envMapIntensity: 0.62 });
  const foliageMid = new THREE.MeshPhysicalMaterial({ color: '#2e6b45', roughness: 0.62, clearcoat: 0.14, envMapIntensity: 0.68 });
  const foliageLight = new THREE.MeshPhysicalMaterial({ color: '#5a8652', roughness: 0.64, clearcoat: 0.1, envMapIntensity: 0.62 });
  const soil = new THREE.MeshStandardMaterial({ color: '#30261d', roughness: 0.92 });
  const water = new THREE.MeshPhysicalMaterial({
    color: '#55d7d5', roughness: 0.035, metalness: 0, transmission: 0.48, thickness: 0.46,
    clearcoat: 1, clearcoatRoughness: 0.025, transparent: true, opacity: 0.82, ior: 1.34, envMapIntensity: 1.8,
  });
  const scenicEnvironment = createVaultTreasureIslandScenicEnvironment({ quality, animated: options.animated });
  scenicEnvironment.root.name = 'vault-garden-reused-real-three-dimensional-coastal-environment';
  const scenicOcean = scenicEnvironment.root.getObjectByName('vault-v2-ocean');
  if (scenicOcean instanceof THREE.Mesh && scenicOcean.material instanceof THREE.ShaderMaterial) {
    const oceanUniforms = scenicOcean.material.uniforms;
    (oceanUniforms.waterColor?.value as THREE.Color | undefined)?.set('#24b9b6');
    (oceanUniforms.sunColor?.value as THREE.Color | undefined)?.set('#ffd17c');
    if (oceanUniforms.alpha) oceanUniforms.alpha.value = 0.82;
  }
  const scenicSun = scenicEnvironment.root.getObjectByName('vault-v2-three-dimensional-sunset-sun');
  const scenicHalo = scenicEnvironment.root.getObjectByName('vault-v2-three-dimensional-sunset-halo');
  scenicSun?.position.set(-4.7, 6.2, -20);
  scenicSun?.scale.setScalar(1.38);
  scenicHalo?.position.set(-4.7, 6.2, -20);
  scenicHalo?.scale.setScalar(1.22);
  scenicEnvironment.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.name.includes('horizon-cliff-island')) {
      object.position.y += 0.72;
      object.scale.y *= 1.7;
    } else if (object.name.includes('horizon-mountain-peak')) {
      object.position.y += 0.9;
      object.scale.multiplyScalar(1.18);
    } else if (object.name.includes('horizon-cypress')) {
      object.position.y += 1.0;
      object.scale.multiplyScalar(1.2);
    } else if (object.name.includes('horizon-island-limestone-villa') || object.name.includes('horizon-island-blue-villa-roof')) {
      object.position.y += 0.82;
      object.scale.multiplyScalar(1.16);
    } else if (object.name.includes('distant-island')) {
      object.position.y += 0.36;
      object.scale.y *= 1.45;
    } else if (object.name.includes('distant-tree')) {
      object.position.y += 0.52;
      object.scale.multiplyScalar(1.12);
    }
    if (!(object.material instanceof THREE.MeshStandardMaterial)) return;
    if (object.name.includes('horizon-cliff-island') || object.name.includes('distant-island')) {
      object.material = object.material.clone();
      object.material.color.set('#316c62');
      object.material.emissive.set('#163f37');
      object.material.emissiveIntensity = 0.16;
    }
  });
  root.add(scenicEnvironment.root);
  addGardenCoastalTerminus(root, materials, quality);

  const architecture = new THREE.Group();
  architecture.name = 'vault-garden-family-b-volumetric-palace-garden-architecture';
  const foundation = mesh(new RoundedBoxGeometry(8.2, 0.32, 16.8, 4, 0.08), limestone, 'vault-garden-family-b-deep-limestone-foundation');
  foundation.position.set(0, -0.16, -2.2);
  architecture.add(foundation);
  const arrivalCourt = mesh(new RoundedBoxGeometry(6.9, 0.12, 3.0, 4, 0.06), limestoneLight, 'vault-garden-family-b-broad-arrival-court');
  arrivalCourt.position.set(0, 0.08, 3.55);
  architecture.add(arrivalCourt);

  const poolBed = mesh(new RoundedBoxGeometry(1.5, 0.16, 7.4, 4, 0.09), materials.onyx, 'vault-garden-family-b-central-reflecting-pool-bed');
  poolBed.position.set(0, 0.12, -0.48);
  const poolWater = mesh(new RoundedBoxGeometry(1.28, 0.07, 7.18, 4, 0.08), water, 'vault-garden-family-b-central-reflecting-water');
  poolWater.position.set(0, 0.24, -0.48);
  poolWater.userData.waterPhase = 0.4;
  architecture.add(poolBed, poolWater);

  for (const side of [-1, 1] as const) {
    const pathBase = mesh(new RoundedBoxGeometry(1.62, 0.1, 9.1, 4, 0.055), materials.floorShade, 'vault-garden-family-b-broad-branching-blue-marble-walk');
    pathBase.position.set(side * 1.68, 0.17, -0.78);
    architecture.add(pathBase);
    for (let tileIndex = 0; tileIndex < 10; tileIndex += 1) {
      const joint = mesh(new THREE.BoxGeometry(1.48, 0.022, 0.026), materials.darkGold, 'vault-garden-family-b-visible-blue-tile-joint');
      joint.position.set(side * 1.68, 0.23, 3.1 - tileIndex * 0.86);
      architecture.add(joint);
    }
    for (const edge of [-1, 1] as const) {
      const border = mesh(new RoundedBoxGeometry(0.055, 0.035, 9.18, 2, 0.012), edge === side ? materials.gold : materials.silver, 'vault-garden-family-b-controlled-metal-path-border');
      border.position.set(side * 1.68 + edge * 0.79, 0.245, -0.78);
      architecture.add(border);
    }
  }

  const columnZ = [3.18, 1.15, -0.88, -2.91, -4.94];
  columnZ.forEach((z, index) => {
    for (const side of [-1, 1] as const) {
      const base = cylinder(0.34, 0.39, 0.22, segmentCount(quality, 18, 26, 34), limestone, 'vault-garden-family-b-column-stepped-base');
      base.position.set(side * 3.25, 0.26, z);
      const shaft = cylinder(0.19, 0.23, 4.55, segmentCount(quality, 18, 28, 38), index % 2 === 0 ? limestoneLight : limestone, 'vault-garden-family-b-monumental-colonnade-shaft');
      shaft.position.set(side * 3.25, 2.6, z);
      const capital = cylinder(0.34, 0.27, 0.24, segmentCount(quality, 18, 26, 34), materials.gold, 'vault-garden-family-b-column-carved-gold-capital');
      capital.position.set(side * 3.25, 4.92, z);
      architecture.add(base, shaft, capital);
    }
    const rib = mesh(new THREE.TorusGeometry(3.25, 0.085, segmentCount(quality, 8, 10, 12), segmentCount(quality, 40, 58, 76), Math.PI), index % 2 === 0 ? materials.gold : materials.silver, 'vault-garden-family-b-open-vaulted-canopy-rib');
    rib.position.set(0, 4.92, z);
    architecture.add(rib);
  });
  for (const side of [-1, 1] as const) {
    const entablature = mesh(new RoundedBoxGeometry(0.34, 0.3, 10.2, 3, 0.055), limestoneLight, 'vault-garden-family-b-substantial-limestone-entablature');
    entablature.position.set(side * 3.25, 5.03, -0.88);
    const goldBand = mesh(new RoundedBoxGeometry(0.37, 0.065, 10.28, 2, 0.018), materials.gold, 'vault-garden-family-b-entablature-gold-band');
    goldBand.position.set(side * 3.25, 5.2, -0.88);
    architecture.add(entablature, goldBand);
  }

  const plantingZ = [2.18, 0.14, -1.9, -3.94];
  plantingZ.forEach((z, plantingIndex) => {
    for (const side of [-1, 1] as const) {
      const bed = mesh(new RoundedBoxGeometry(0.96, 0.5, 1.55, 4, 0.1), limestone, 'vault-garden-family-b-layered-planting-bed');
      bed.position.set(side * 2.72, 0.36, z);
      const earth = mesh(new RoundedBoxGeometry(0.82, 0.06, 1.36, 3, 0.06), soil, 'vault-garden-family-b-rich-planting-soil');
      earth.position.set(side * 2.72, 0.64, z);
      architecture.add(bed, earth);

      const trunk = cylinder(0.075, 0.12, 1.25 + (plantingIndex % 2) * 0.28, 12, materials.darkGold, 'vault-garden-family-b-natural-gilded-tree-trunk');
      trunk.position.set(side * 2.72, 1.27, z);
      architecture.add(trunk);
      const leafMaterials = [foliageDark, foliageMid, foliageLight] as const;
      const clusterCount = 4 + (plantingIndex % 3);
      for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
        const theta = (clusterIndex / clusterCount) * Math.PI * 2 + plantingIndex * 0.47;
        const crown = mesh(
          new THREE.DodecahedronGeometry(0.34 + (clusterIndex % 2) * 0.08, quality === 'high' ? 1 : 0),
          leafMaterials[(clusterIndex + plantingIndex) % leafMaterials.length],
          'vault-garden-family-b-varied-botanical-leaf-cluster',
        );
        crown.position.set(side * 2.72 + Math.sin(theta) * 0.32, 1.92 + (clusterIndex % 3) * 0.28, z + Math.cos(theta) * 0.3);
        crown.scale.set(1.0, 1.12 + (clusterIndex % 2) * 0.18, 0.9);
        architecture.add(crown);
        const blossom = mesh(new THREE.OctahedronGeometry(0.055, 0), (clusterIndex + plantingIndex) % 2 === 0 ? materials.ruby : materials.violetGem, 'vault-garden-family-b-jewel-blossom');
        blossom.position.copy(crown.position);
        blossom.position.y += 0.34;
        blossom.userData.waterPhase = clusterIndex + plantingIndex * 0.6;
        architecture.add(blossom);
      }
    }
  });

  const rotunda = new THREE.Group();
  rotunda.name = 'vault-garden-family-b-deep-domed-prosperity-rotunda-destination';
  rotunda.position.z = -7.72;
  const rotundaCourt = cylinder(2.32, 2.5, 0.28, segmentCount(quality, 48, 72, 96), limestoneLight, 'vault-garden-family-b-destination-rotunda-court');
  rotundaCourt.position.y = 0.22;
  const rotundaInlay = cylinder(1.92, 1.92, 0.06, segmentCount(quality, 48, 72, 96), materials.floorShade, 'vault-garden-family-b-rotunda-blue-marble-inlay');
  rotundaInlay.position.y = 0.4;
  rotunda.add(rotundaCourt, rotundaInlay);
  for (let columnIndex = 0; columnIndex < 6; columnIndex += 1) {
    const angle = (columnIndex / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.sin(angle) * 1.72;
    const z = Math.cos(angle) * 1.72;
    const column = cylinder(0.15, 0.2, 3.42, segmentCount(quality, 16, 24, 32), limestoneLight, 'vault-garden-family-b-rotunda-limestone-column');
    column.position.set(x, 2.08, z);
    const capital = cylinder(0.26, 0.22, 0.18, 20, materials.gold, 'vault-garden-family-b-rotunda-gold-capital');
    capital.position.set(x, 3.82, z);
    rotunda.add(column, capital);
  }
  const rotundaCornice = goldRing(1.86, 0.09, materials, quality, 'vault-garden-family-b-rotunda-solid-gold-cornice');
  rotundaCornice.position.y = 3.94;
  const dome = mesh(new THREE.SphereGeometry(1.88, segmentCount(quality, 28, 42, 58), segmentCount(quality, 14, 20, 28), 0, Math.PI * 2, 0, Math.PI / 2), materials.enamel, 'vault-garden-family-b-rotunda-deep-sapphire-dome');
  dome.position.y = 3.96;
  rotunda.add(rotundaCornice, dome);
  for (let ribIndex = 0; ribIndex < 8; ribIndex += 1) {
    const rib = mesh(new THREE.TorusGeometry(1.88, 0.035, 8, 48, Math.PI), materials.gold, 'vault-garden-family-b-dome-articulated-gold-rib');
    rib.position.y = 3.96;
    rib.rotation.y = (ribIndex / 8) * Math.PI;
    rib.rotation.x = Math.PI / 2;
    rotunda.add(rib);
  }

  const fountainBasin = cylinder(0.9, 1.05, 0.34, segmentCount(quality, 36, 54, 72), limestone, 'vault-garden-family-b-prosperity-tree-fountain-basin');
  fountainBasin.position.y = 0.58;
  const fountainWater = cylinder(0.82, 0.82, 0.07, segmentCount(quality, 36, 54, 72), water, 'vault-garden-family-b-prosperity-tree-fountain-water');
  fountainWater.position.y = 0.78;
  fountainWater.userData.waterPhase = 1.4;
  const treeTrunk = cylinder(0.14, 0.24, 2.58, 18, materials.gold, 'vault-garden-family-b-prosperity-tree-sculptural-gold-trunk');
  treeTrunk.position.y = 1.82;
  rotunda.add(fountainBasin, fountainWater, treeTrunk);
  const branchTips = [
    [-0.88, 2.72, 0.14], [-0.58, 3.18, -0.12], [-0.2, 3.48, 0.08],
    [0.22, 3.42, -0.08], [0.64, 3.12, 0.1], [0.92, 2.68, -0.08],
  ] as const;
  branchTips.forEach(([x, y, z], index) => {
    const branch = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.1, 0),
      new THREE.Vector3(x * 0.5, y - 0.3, z * 0.5),
      new THREE.Vector3(x, y, z),
    ]), 18, 0.045, 7, false), materials.gold, 'vault-garden-family-b-prosperity-tree-gold-branch');
    const leaf = mesh(new THREE.OctahedronGeometry(0.16 + (index % 2) * 0.035, 1), index % 3 === 0 ? materials.cyanGem : index % 3 === 1 ? materials.violetGem : materials.ruby, 'vault-garden-family-b-prosperity-tree-cut-jewel-leaf');
    leaf.position.set(x, y, z);
    leaf.scale.y = 1.35;
    leaf.userData.waterPhase = index * 0.7;
    rotunda.add(branch, leaf);
  });
  const treeHeart = mesh(new THREE.OctahedronGeometry(0.24, 1), materials.violetGem, 'vault-garden-family-b-prosperity-tree-heart-jewel');
  treeHeart.position.y = 3.68;
  treeHeart.scale.set(1.18, 1.35, 1.18);
  treeHeart.userData.waterPhase = 2.8;
  rotunda.add(treeHeart);
  architecture.add(rotunda);

  for (const side of [-1, 1] as const) {
    const branchPath = mesh(new RoundedBoxGeometry(1.18, 0.1, 4.25, 4, 0.055), materials.floorShade, 'vault-garden-family-b-rotunda-branching-side-court-path');
    branchPath.position.set(side * 1.78, 0.2, -6.15);
    branchPath.rotation.y = side * 0.34;
    architecture.add(branchPath);
    const distantPavilion = new THREE.Group();
    distantPavilion.name = 'vault-garden-family-b-distant-palace-pavilion';
    distantPavilion.position.set(side * 3.72, 0, -11.8);
    const palaceWing = mesh(new RoundedBoxGeometry(2.2, 2.6, 0.5, 4, 0.08), limestone, 'vault-garden-family-b-distant-pavilion-palace-wing');
    palaceWing.position.set(-side * 0.34, 1.42, 0.2);
    const sapphireInset = mesh(new RoundedBoxGeometry(1.55, 1.9, 0.08, 4, 0.05), materials.wallTrim, 'vault-garden-family-b-distant-pavilion-sapphire-arcade-inset');
    sapphireInset.position.set(-side * 0.34, 1.48, 0.48);
    const tower = cylinder(0.58, 0.7, 3.2, 24, limestone, 'vault-garden-family-b-distant-pavilion-tower');
    tower.position.y = 1.7;
    const towerBand = cylinder(0.74, 0.74, 0.14, 24, materials.gold, 'vault-garden-family-b-distant-pavilion-gold-band');
    towerBand.position.y = 3.24;
    const pavilionDome = mesh(new THREE.SphereGeometry(0.78, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), materials.gold, 'vault-garden-family-b-distant-pavilion-gold-dome');
    pavilionDome.position.y = 3.32;
    pavilionDome.scale.y = 0.72;
    const finial = mesh(new THREE.OctahedronGeometry(0.13, 0), side < 0 ? materials.cyanGem : materials.violetGem, 'vault-garden-family-b-distant-pavilion-jewel-finial');
    finial.position.y = 4.08;
    distantPavilion.add(palaceWing, sapphireInset, tower, towerBand, pavilionDome, finial);
    architecture.add(distantPavilion);
  }
  const horizonTerrace = mesh(new RoundedBoxGeometry(11.8, 0.6, 2.1, 4, 0.09), limestone, 'vault-garden-family-b-layered-palace-horizon-terrace');
  horizonTerrace.position.set(0, 0.22, -12.2);
  const horizonGoldBand = mesh(new RoundedBoxGeometry(11.9, 0.1, 2.18, 3, 0.025), materials.gold, 'vault-garden-family-b-horizon-terrace-gold-band');
  horizonGoldBand.position.set(0, 0.56, -12.2);
  architecture.add(horizonTerrace, horizonGoldBand);
  root.add(architecture);
  const releaseBlenderArchitecture = loadBlenderInteriorArchitecture(
    root,
    architecture,
    '/assets/islands/special/vault-island/vault-garden-gallery.glb?v=008',
    'vault-garden-sunset-cliff-palace-gardens-blender-v008',
    materials,
    (loaded) => {
      loaded.traverse((child) => {
        const isWater = child.name.includes('water-mesh')
          || child.name.includes('water-basin-mesh')
          || child.name.includes('basin-water')
          || child.name.includes('water-jet');
        const isJewel = child.name.includes('jewel-leaf') || child.name.includes('heart-jewel');
        if (!isWater && !isJewel) return;
        child.userData.waterPhase = animatedObjects.length * 0.47;
        child.userData.baseGardenY = child.position.y;
        animatedObjects.push(child);
      });
    },
  );

  const sunlight = new THREE.DirectionalLight('#ff963d', quality === 'low' ? 1.08 : 1.68);
  sunlight.position.set(-7.5, 4.4, 5.2);
  const coastalFill = new THREE.HemisphereLight('#ffe8bd', '#126f78', quality === 'low' ? 0.18 : 0.28);
  coastalFill.name = 'vault-garden-golden-sky-and-turquoise-sea-material-separation-fill';
  const rotundaLight = new THREE.PointLight('#ffbd68', quality === 'low' ? 0.48 : 0.68, 9, 2);
  rotundaLight.position.set(0, 3.2, -7.4);
  const waterLight = new THREE.PointLight('#53e0df', quality === 'low' ? 0.38 : 0.56, 8, 2);
  waterLight.position.set(0, 1.1, -1.2);
  root.add(sunlight, coastalFill, rotundaLight, waterLight);

  root.traverse((child) => {
    if (child.userData.waterPhase !== undefined) {
      child.userData.baseGardenY = child.position.y;
      animatedObjects.push(child);
    }
  });
  return {
    root,
    update: (elapsedSeconds: number) => {
      if (!options.animated) return;
      scenicEnvironment.update(elapsedSeconds);
      animatedObjects.forEach((object, index) => {
        const phase = Number(object.userData.waterPhase) || index * 0.5;
        if (object instanceof THREE.Mesh && (object.material === water || object.name.includes('water'))) {
          object.scale.y = 1 + Math.sin(elapsedSeconds * 1.4 + phase) * 0.012;
        } else {
          object.rotation.y += 0.003 + (index % 3) * 0.001;
          object.position.y = Number(object.userData.baseGardenY) + Math.sin(elapsedSeconds * 1.15 + phase) * 0.016;
        }
      });
    },
    dispose: () => {
      root.remove(scenicEnvironment.root);
      scenicEnvironment.dispose();
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        childMaterials.forEach((material) => material.dispose());
      });
      releaseBlenderArchitecture();
      Object.values(materials).forEach((resource) => resource.dispose());
      limestone.dispose();
      limestoneLight.dispose();
      foliageDark.dispose();
      foliageMid.dispose();
      foliageLight.dispose();
      soil.dispose();
      water.dispose();
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
  addMuseumLuxuryGalleryLayer(fallbackArchitecture, materials, quality);
  root.add(fallbackArchitecture);
  const releaseBlenderArchitecture = loadBlenderInteriorArchitecture(
    root,
    fallbackArchitecture,
    '/assets/islands/special/vault-island/vault-museum.glb?v=041',
    'vault-interior-royal-hydraulic-lift-cloister-v041',
    materials,
  );
  addMuseumRearRelief(root, materials, quality);
  const reliefKey = new THREE.PointLight('#8deeff', quality === 'high' ? 1.45 : 0.95, 4.2, 2);
  reliefKey.name = 'vault-interior-sovereign-relief-aquamarine-key-light';
  reliefKey.position.set(-1.15, 3.35, -3.65);
  const reliefGold = new THREE.PointLight('#ffc04f', quality === 'high' ? 1.75 : 1.1, 4.6, 2);
  reliefGold.name = 'vault-interior-sovereign-relief-gold-rim-light';
  reliefGold.position.set(1.25, 3.05, -3.55);
  root.add(reliefKey, reliefGold);
  addVaultMuseumLights(root, quality);
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
      const releaseBlenderTreasureAssets = displayGroup?.userData.releaseBlenderTreasureAssets as Array<() => void> | undefined;
      releaseBlenderTreasureAssets?.forEach((release) => release());
      treasureModels?.forEach((model) => model.dispose());
    },
  };
}
