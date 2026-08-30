import * as THREE from 'three';
import { createVaultSurfacePatternTexture } from './VaultPremiumLookdev';
import type { VaultIslandCollectionTreasureId } from '../services/islandRunVaultCollection';

export type VaultTreasureId = VaultIslandCollectionTreasureId;

export interface VaultTreasureDefinition {
  id: VaultTreasureId;
  name: string;
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  value: number;
  origin: string;
  materialStory: string;
}

export interface VaultTreasureModel {
  root: THREE.Group;
  treasure: THREE.Group;
  dispose: () => void;
}

type TreasureMaterials = ReturnType<typeof createTreasureMaterials>;

export const VAULT_TREASURE_DEFINITIONS: VaultTreasureDefinition[] = [
  {
    id: 'crown',
    name: 'Sovereign Crown',
    rarity: 'mythic',
    value: 12800,
    origin: 'Vault Island',
    materialStory: 'Polished gold, white marble, blue enamel, and a deep amethyst heart stone.',
  },
  {
    id: 'compass',
    name: 'Sapphire Astrolabe',
    rarity: 'legendary',
    value: 9200,
    origin: 'Ocean route set',
    materialStory: 'Brushed silver rings, gold needles, sapphire bearings, and an enamel star dial.',
  },
  {
    id: 'obelisk',
    name: 'Wisdom Crystal',
    rarity: 'epic',
    value: 7400,
    origin: 'Riddle chamber',
    materialStory: 'Clear cyan crystal held by gold claws on a marble-and-enamel plinth.',
  },
  {
    id: 'egg',
    name: 'Jeweled Creature Egg',
    rarity: 'legendary',
    value: 10100,
    origin: 'Rare hatchery vault',
    materialStory: 'Faceted amethyst shell with sapphire panels and a delicate gold cage.',
  },
  {
    id: 'hourglass',
    name: 'Hourglass of Plenty',
    rarity: 'legendary',
    value: 11300,
    origin: 'Great Honeyfall embassy',
    materialStory: 'Hammered royal gold, crystal glass, and luminous amber essence sand.',
  },
  {
    id: 'key',
    name: 'Celestial Vault Key',
    rarity: 'mythic',
    value: 14600,
    origin: 'Hidden palace stair',
    materialStory: 'Polished silver, warm gold filigree, blue enamel, and a star-cut sapphire seal.',
  },
  {
    id: 'medallion',
    name: 'Sun Treasury Medallion',
    rarity: 'epic',
    value: 8100,
    origin: 'Garden riddle route',
    materialStory: 'Brushed gold relief with a ruby sun, pearl rays, and midnight enamel.',
  },
  {
    id: 'chalice',
    name: 'Prosperity Chalice',
    rarity: 'mythic',
    value: 15700,
    origin: 'Royal mission reward',
    materialStory: 'Mirror-polished gold, sapphire handles, ruby cabochons, and amethyst essence.',
  },
];

export function getVaultTreasureDefinition(id: VaultTreasureId) {
  return VAULT_TREASURE_DEFINITIONS.find((treasure) => treasure.id === id) ?? VAULT_TREASURE_DEFINITIONS[0];
}

function createTreasureMaterials() {
  const metalPattern = createVaultSurfacePatternTexture('VAULT_TREASURE_HAMMERED_METAL', 'hammered-metal', 4.8);
  const marblePattern = createVaultSurfacePatternTexture('VAULT_TREASURE_MARBLE_VEIN', 'marble-vein', 2.4);
  return {
    metalPattern,
    marblePattern,
    marble: new THREE.MeshPhysicalMaterial({ color: '#eee2ca', roughness: 0.42, metalness: 0, clearcoat: 0.24, clearcoatRoughness: 0.3, envMapIntensity: 0.82 }),
    marbleShade: new THREE.MeshStandardMaterial({ color: '#b9aa91', roughness: 0.54, metalness: 0, envMapIntensity: 0.7 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#d99a1a', roughness: 0.17, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.12, emissive: '#321200', emissiveIntensity: 0.04, envMapIntensity: 2.25 }),
    darkGold: new THREE.MeshPhysicalMaterial({ color: '#76501a', roughness: 0.28, metalness: 0.94, clearcoat: 0.2, clearcoatRoughness: 0.2, envMapIntensity: 1.85 }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#d8e2e9', roughness: 0.16, metalness: 1, clearcoat: 0.28, clearcoatRoughness: 0.1, envMapIntensity: 2.2 }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: '#ff4d72',
      roughness: 0.07,
      metalness: 0,
      transmission: 0.1,
      thickness: 0.32,
      clearcoat: 1,
      emissive: '#6f1025',
      emissiveIntensity: 0.28,
      ior: 1.52,
      envMapIntensity: 1.45,
    }),
    amber: new THREE.MeshPhysicalMaterial({
      color: '#ff9f18',
      roughness: 0.035,
      metalness: 0,
      transmission: 0.3,
      thickness: 1.4,
      ior: 1.47,
      attenuationColor: new THREE.Color('#ff6200'),
      attenuationDistance: 1.8,
      clearcoat: 1,
      clearcoatRoughness: 0.015,
      emissive: '#9f2f00',
      emissiveIntensity: 0.22,
      envMapIntensity: 1.75,
    }),
    enamelBlue: new THREE.MeshPhysicalMaterial({ color: '#102f68', roughness: 0.18, metalness: 0.12, clearcoat: 0.95, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
    velvetBlue: new THREE.MeshStandardMaterial({ color: '#071b49', roughness: 0.72, metalness: 0 }),
    amethyst: new THREE.MeshPhysicalMaterial({
      color: '#8b38ff',
      roughness: 0.06,
      metalness: 0,
      transmission: 0.18,
      thickness: 0.42,
      clearcoat: 1,
      emissive: '#35105d',
      emissiveIntensity: 0.38,
      ior: 1.5,
      envMapIntensity: 1.55,
    }),
    sapphire: new THREE.MeshPhysicalMaterial({
      color: '#1b6eff',
      roughness: 0.07,
      metalness: 0,
      transmission: 0.14,
      thickness: 0.38,
      clearcoat: 1,
      emissive: '#082a68',
      emissiveIntensity: 0.35,
      ior: 1.52,
      envMapIntensity: 1.6,
    }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: '#9ff5ff',
      roughness: 0.02,
      metalness: 0,
      transmission: 0.68,
      thickness: 0.78,
      clearcoat: 1,
      emissive: '#0e6375',
      emissiveIntensity: 0.32,
      ior: 1.46,
      envMapIntensity: 1.7,
    }),
    pearl: new THREE.MeshPhysicalMaterial({ color: '#fff3d6', roughness: 0.18, metalness: 0, clearcoat: 1, sheen: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#c6fbff',
      roughness: 0.03,
      metalness: 0,
      transmission: 0.66,
      thickness: 0.24,
      clearcoat: 1,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
    glow: new THREE.MeshBasicMaterial({ color: '#fff1a8', transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

function disposeMaterialSet(materials: TreasureMaterials) {
  Object.values(materials).forEach((resource) => resource.dispose());
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
  const output = new THREE.Mesh(geometry, material);
  output.name = name;
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, segments: number, material: THREE.Material, name: string) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, name);
}

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, name: string) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, radius, 8, false), material, name);
}

function addPedestal(root: THREE.Group, materials: TreasureMaterials, id: VaultTreasureId) {
  const pedestal = new THREE.Group();
  pedestal.name = `treasure-${id}-pedestal`;
  const sidesByTreasure: Record<VaultTreasureId, number> = {
    crown: 8,
    compass: 48,
    obelisk: 6,
    egg: 10,
    hourglass: 12,
    key: 4,
    medallion: 16,
    chalice: 24,
  };
  const sides = sidesByTreasure[id];
  const baseRadius = id === 'crown' ? 0.86 : id === 'key' ? 0.78 : id === 'medallion' ? 0.68 : 0.74;
  const topRadius = id === 'crown' ? 0.7 : id === 'key' ? 0.66 : 0.62;
  const base = cylinder(baseRadius * 0.92, baseRadius, 0.2, sides, materials.marbleShade, `treasure-${id}-distinct-marble-base`);
  base.position.y = 0.09;
  const riserMaterial = id === 'compass' || id === 'key' ? materials.silver : id === 'egg' ? materials.darkGold : materials.enamelBlue;
  const riser = cylinder(topRadius, topRadius * 1.05, 0.17, sides, riserMaterial, `treasure-${id}-distinct-riser`);
  riser.position.y = 0.25;
  const top = cylinder(topRadius, topRadius * 1.04, 0.13, sides, materials.marble, `treasure-${id}-polished-display-top`);
  top.position.y = 0.4;
  const goldTrim = mesh(new THREE.TorusGeometry(topRadius, 0.025, 8, Math.max(24, sides * 2)), materials.gold, `treasure-${id}-pedestal-gold-trim`);
  goldTrim.rotation.x = Math.PI / 2;
  goldTrim.position.y = 0.47;
  const glow = mesh(new THREE.RingGeometry(topRadius * 0.68, topRadius * 1.04, Math.max(24, sides * 2)), materials.glow, 'treasure-selection-glow');
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.485;
  pedestal.add(base, riser, top, goldTrim, glow);
  root.add(pedestal);
}

function addGem(parent: THREE.Group, material: THREE.Material, position: THREE.Vector3, scale: number, name: string) {
  const gem = mesh(new THREE.OctahedronGeometry(scale, 1), material, name);
  gem.position.copy(position);
  parent.add(gem);
  return gem;
}

function createCrownTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-crown-model';
  const band = mesh(new THREE.TorusGeometry(0.5, 0.075, 10, 72), materials.gold, 'crown-substantial-open-gold-circlet');
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.68;
  const enamel = mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 64), materials.enamelBlue, 'crown-blue-enamel-band');
  enamel.rotation.x = Math.PI / 2;
  enamel.position.y = 0.74;
  group.add(band, enamel);

  const velvetCap = mesh(new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.velvetBlue, 'crown-deep-blue-velvet-cap');
  velvetCap.scale.y = 0.72;
  velvetCap.position.y = 0.73;
  group.add(velvetCap);

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const isCardinal = index % 2 === 0;
    const point = mesh(new THREE.ConeGeometry(isCardinal ? 0.13 : 0.09, isCardinal ? 0.66 : 0.42, 5), index % 3 === 0 ? materials.silver : materials.gold, 'crown-distinct-open-fleur-spire');
    point.position.set(Math.sin(angle) * 0.47, isCardinal ? 1.08 : 0.94, Math.cos(angle) * 0.47);
    point.rotation.z = Math.sin(angle) * -0.12;
    point.rotation.x = Math.cos(angle) * 0.12;
    group.add(point);
    addGem(
      group,
      index % 3 === 0 ? materials.ruby : index % 2 === 0 ? materials.amethyst : materials.sapphire,
      new THREE.Vector3(Math.sin(angle) * 0.46, 0.78, Math.cos(angle) * 0.46),
      0.058,
      'crown-fleur-set-gem',
    );
  }

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const pearl = addGem(group, index % 4 === 0 ? materials.sapphire : materials.pearl, new THREE.Vector3(Math.sin(angle) * 0.49, 0.7, Math.cos(angle) * 0.49), 0.04, 'crown-band-set-stone');
    pearl.scale.y = index % 4 === 0 ? 1.15 : 0.72;
  }

  const frontFleur = mesh(new THREE.ConeGeometry(0.19, 0.82, 5), materials.gold, 'crown-central-front-fleur-silhouette');
  frontFleur.position.set(0, 1.15, 0.47);
  group.add(frontFleur);
  const crownOrb = addGem(group, materials.amethyst, new THREE.Vector3(0, 1.54, 0.47), 0.11, 'crown-front-amethyst-orb');
  const crossStem = mesh(new THREE.BoxGeometry(0.045, 0.28, 0.045), materials.gold, 'crown-apex-cross-stem');
  crossStem.position.set(0, 1.75, 0.47);
  const crossBar = mesh(new THREE.BoxGeometry(0.2, 0.045, 0.045), materials.gold, 'crown-apex-cross-bar');
  crossBar.position.set(0, 1.79, 0.47);
  group.add(crossStem, crossBar);
  addGem(group, materials.amethyst, new THREE.Vector3(0, 0.88, 0.48), 0.16, 'crown-central-amethyst');
  addGem(group, materials.sapphire, new THREE.Vector3(-0.28, 0.78, 0.44), 0.08, 'crown-side-sapphire');
  addGem(group, materials.sapphire, new THREE.Vector3(0.28, 0.78, 0.44), 0.08, 'crown-side-sapphire');
  return group;
}

function createCompassTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-compass-model';
  group.rotation.x = -0.12;
  const outer = mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 72), materials.silver, 'compass-outer-silver-ring');
  const inner = mesh(new THREE.TorusGeometry(0.31, 0.022, 8, 64), materials.gold, 'compass-inner-gold-ring');
  outer.position.y = 0.92;
  inner.position.y = 0.92;
  group.add(outer, inner);

  const tiltedOrbitA = mesh(new THREE.TorusGeometry(0.52, 0.014, 6, 72), materials.silver, 'compass-tilted-silver-orbit-ring');
  tiltedOrbitA.position.y = 0.92;
  tiltedOrbitA.rotation.y = 0.72;
  const tiltedOrbitB = mesh(new THREE.TorusGeometry(0.52, 0.012, 6, 72), materials.gold, 'compass-cross-gold-orbit-ring');
  tiltedOrbitB.position.y = 0.92;
  tiltedOrbitB.rotation.y = -0.74;
  group.add(tiltedOrbitA, tiltedOrbitB);

  const dial = cylinder(0.34, 0.34, 0.035, 48, materials.enamelBlue, 'compass-blue-enamel-dial');
  dial.rotation.x = Math.PI / 2;
  dial.position.y = 0.92;
  group.add(dial);

  const glass = mesh(new THREE.CircleGeometry(0.32, 48), materials.glass, 'compass-polished-glass-face');
  glass.position.set(0, 0.92, 0.04);
  group.add(glass);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const needle = mesh(new THREE.BoxGeometry(index % 2 === 0 ? 0.045 : 0.026, index % 2 === 0 ? 0.46 : 0.34, 0.018), index % 4 === 0 ? materials.silver : materials.gold, 'compass-gold-star-needle');
    needle.position.set(0, 0.92, 0.07);
    needle.rotation.z = -angle;
    group.add(needle);
  }

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const tick = mesh(new THREE.BoxGeometry(0.015, index % 4 === 0 ? 0.09 : 0.052, 0.012), materials.gold, 'compass-face-minute-gold-tick');
    tick.position.set(Math.sin(angle) * 0.26, 0.92 + Math.cos(angle) * 0.26, 0.085);
    tick.rotation.z = -angle;
    group.add(tick);
  }

  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2 + 0.16;
    addGem(group, materials.sapphire, new THREE.Vector3(Math.sin(angle) * 0.5, 0.92 + Math.cos(angle) * 0.5, 0.08), 0.065, 'compass-sapphire-bearing');
  }
  return group;
}

function createObeliskTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-obelisk-model';
  const base = cylinder(0.32, 0.44, 0.28, 6, materials.enamelBlue, 'wisdom-crystal-blue-enamel-cradle');
  base.position.y = 0.65;
  const trim = mesh(new THREE.TorusGeometry(0.36, 0.028, 6, 36), materials.gold, 'wisdom-crystal-cradle-gold-trim');
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.8;
  const crystal = mesh(new THREE.OctahedronGeometry(0.42, 0), materials.crystal, 'wisdom-crystal-large-faceted-hero-stone');
  crystal.position.y = 1.38;
  crystal.scale.set(0.78, 2.1, 0.78);
  group.add(base, trim, crystal);

  const core = mesh(new THREE.OctahedronGeometry(0.17, 0), materials.sapphire, 'wisdom-crystal-inner-sapphire-heart');
  core.position.y = 1.38;
  core.scale.set(0.72, 2.0, 0.72);
  group.add(core);

  addGem(group, materials.amethyst, new THREE.Vector3(0, 2.34, 0), 0.11, 'wisdom-crystal-apex-amethyst-star');

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const claw = cylinder(0.025, 0.04, 0.62, 6, materials.gold, 'wisdom-crystal-substantial-gold-claw');
    claw.position.set(Math.sin(angle) * 0.28, 0.96, Math.cos(angle) * 0.28);
    claw.rotation.x = Math.cos(angle) * 0.38;
    claw.rotation.z = -Math.sin(angle) * 0.38;
    group.add(claw);
  }

  for (let index = 0; index < 3; index += 1) {
    const shard = mesh(new THREE.OctahedronGeometry(0.14 - index * 0.015, 0), index % 2 === 0 ? materials.crystal : materials.sapphire, 'wisdom-crystal-attendant-faceted-shard');
    shard.position.set(-0.3 + index * 0.3, 0.8 + (index % 2) * 0.08, 0.28);
    shard.scale.y = 1.65;
    shard.rotation.z = -0.22 + index * 0.22;
    group.add(shard);
  }

  addGem(group, materials.sapphire, new THREE.Vector3(0, 0.84, 0.38), 0.085, 'wisdom-crystal-front-sapphire-seal');
  return group;
}

function createEggTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-egg-model';
  const egg = mesh(new THREE.SphereGeometry(0.36, 32, 22), materials.amethyst, 'egg-faceted-amethyst-shell');
  egg.scale.set(0.88, 1.28, 0.88);
  egg.position.y = 0.98;
  group.add(egg);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const rib = cylinder(0.014, 0.02, 0.92, 5, materials.gold, 'egg-gold-cage-rib');
    rib.position.set(Math.sin(angle) * 0.33, 0.98, Math.cos(angle) * 0.33);
    rib.rotation.x = Math.cos(angle) * 0.26;
    rib.rotation.z = -Math.sin(angle) * 0.26;
    group.add(rib);
  }
  const equator = mesh(new THREE.TorusGeometry(0.34, 0.018, 6, 48), materials.gold, 'egg-gold-equator-band');
  equator.rotation.x = Math.PI / 2;
  equator.position.y = 0.98;
  group.add(equator);

  for (let index = 0; index < 4; index += 1) {
    const meridian = mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 48), materials.gold, 'egg-gold-meridian-band');
    meridian.position.y = 0.98;
    meridian.scale.y = 1.28;
    meridian.rotation.y = (index / 4) * Math.PI;
    group.add(meridian);
  }

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const y = 0.86 + (index % 3) * 0.17;
    addGem(
      group,
      index % 3 === 0 ? materials.ruby : index % 3 === 1 ? materials.sapphire : materials.pearl,
      new THREE.Vector3(Math.sin(angle) * 0.31, y, Math.cos(angle) * 0.31),
      0.045,
      'egg-cage-set-jewel',
    );
  }

  addGem(group, materials.sapphire, new THREE.Vector3(0, 1.18, 0.34), 0.09, 'egg-front-sapphire-panel');
  addGem(group, materials.pearl, new THREE.Vector3(0, 1.48, 0), 0.075, 'egg-top-pearl');
  return group;
}

function createHourglassTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-hourglass-model';
  const lower = cylinder(0.34, 0.4, 0.1, 40, materials.darkGold, 'hourglass-lower-gold-foot');
  const upper = cylinder(0.4, 0.34, 0.1, 40, materials.gold, 'hourglass-upper-gold-crown');
  lower.position.y = 0.54;
  upper.position.y = 1.52;
  group.add(lower, upper);

  const lowerTrim = mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 48), materials.gold, 'hourglass-lower-polished-trim');
  lowerTrim.rotation.x = Math.PI / 2;
  lowerTrim.position.y = 0.59;
  const upperTrim = mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 48), materials.silver, 'hourglass-upper-polished-trim');
  upperTrim.rotation.x = Math.PI / 2;
  upperTrim.position.y = 1.47;
  group.add(lowerTrim, upperTrim);

  const lowerGlass = mesh(new THREE.ConeGeometry(0.3, 0.48, 32, 1, true), materials.glass, 'hourglass-lower-crystal-bulb');
  lowerGlass.position.y = 0.86;
  const upperGlass = mesh(new THREE.ConeGeometry(0.3, 0.48, 32, 1, true), materials.glass, 'hourglass-upper-crystal-bulb');
  upperGlass.rotation.z = Math.PI;
  upperGlass.position.y = 1.2;
  group.add(lowerGlass, upperGlass);

  const lowerSand = mesh(new THREE.ConeGeometry(0.21, 0.23, 28), materials.amber, 'hourglass-amber-essence-sand-lower');
  lowerSand.position.y = 0.67;
  const upperSand = mesh(new THREE.ConeGeometry(0.17, 0.18, 28), materials.amber, 'hourglass-amber-essence-sand-upper');
  upperSand.rotation.z = Math.PI;
  upperSand.position.y = 1.39;
  const stream = cylinder(0.018, 0.014, 0.42, 10, materials.amber, 'hourglass-falling-essence-stream');
  stream.position.y = 1.04;
  const waist = mesh(new THREE.TorusGeometry(0.085, 0.016, 7, 32), materials.gold, 'hourglass-gold-waist-ring');
  waist.rotation.x = Math.PI / 2;
  waist.position.y = 1.04;
  group.add(lowerSand, upperSand, stream, waist);

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const pillar = cylinder(0.022, 0.032, 0.9, 8, index % 2 === 0 ? materials.gold : materials.silver, 'hourglass-filigree-support');
    pillar.position.set(Math.sin(angle) * 0.35, 1.03, Math.cos(angle) * 0.35);
    group.add(pillar);
    addGem(group, index % 2 === 0 ? materials.ruby : materials.sapphire, new THREE.Vector3(Math.sin(angle) * 0.38, 1.54, Math.cos(angle) * 0.38), 0.045, 'hourglass-crown-jewel');
  }
  return group;
}

function createKeyTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-key-model';
  group.rotation.z = -0.22;
  const bowOuter = mesh(new THREE.TorusGeometry(0.34, 0.055, 10, 64), materials.silver, 'key-celestial-silver-bow');
  bowOuter.position.set(-0.28, 1.22, 0);
  const bowInner = mesh(new THREE.TorusGeometry(0.2, 0.026, 8, 56), materials.gold, 'key-inner-gold-filigree-ring');
  bowInner.position.copy(bowOuter.position);
  const seal = addGem(group, materials.sapphire, new THREE.Vector3(-0.28, 1.22, 0.055), 0.16, 'key-star-cut-sapphire-seal');
  seal.scale.z = 0.5;
  group.add(bowOuter, bowInner);

  const shaft = cylinder(0.055, 0.07, 1.15, 12, materials.gold, 'key-hammered-gold-shaft');
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0.36, 1.02, 0);
  group.add(shaft);
  for (let index = 0; index < 3; index += 1) {
    const collar = mesh(new THREE.TorusGeometry(0.085, 0.018, 7, 28), index === 1 ? materials.enamelBlue : materials.silver, 'key-shaft-jewel-collar');
    collar.rotation.y = Math.PI / 2;
    collar.position.set(0.04 + index * 0.28, 1.02, 0);
    group.add(collar);
  }
  for (let index = 0; index < 3; index += 1) {
    const tooth = mesh(new THREE.BoxGeometry(0.18 + index * 0.035, 0.16 + index * 0.045, 0.09), index === 1 ? materials.silver : materials.gold, 'key-royal-lock-tooth');
    tooth.position.set(0.85 + index * 0.07, 0.9 - index * 0.09, 0);
    group.add(tooth);
  }
  return group;
}

function createMedallionTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-medallion-model';
  const coin = cylinder(0.5, 0.5, 0.12, 64, materials.gold, 'medallion-brushed-gold-disc');
  coin.rotation.x = Math.PI / 2;
  coin.position.y = 1.03;
  const enamel = cylinder(0.38, 0.38, 0.135, 56, materials.enamelBlue, 'medallion-midnight-enamel-field');
  enamel.rotation.x = Math.PI / 2;
  enamel.position.set(0, 1.03, 0.025);
  const rim = mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 64), materials.darkGold, 'medallion-deep-gold-rim');
  rim.position.y = 1.03;
  group.add(coin, enamel, rim);
  addGem(group, materials.ruby, new THREE.Vector3(0, 1.03, 0.1), 0.18, 'medallion-ruby-sun-heart').scale.z = 0.5;
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const ray = mesh(new THREE.BoxGeometry(index % 2 === 0 ? 0.055 : 0.035, 0.25, 0.035), index % 3 === 0 ? materials.pearl : materials.gold, 'medallion-sun-relief-ray');
    ray.position.set(Math.sin(angle) * 0.27, 1.03 + Math.cos(angle) * 0.27, 0.11);
    ray.rotation.z = -angle;
    group.add(ray);
  }
  const loop = mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 40), materials.silver, 'medallion-silver-chain-loop');
  loop.position.y = 1.6;
  group.add(loop);
  return group;
}

function createChaliceTreasure(materials: TreasureMaterials) {
  const group = new THREE.Group();
  group.name = 'treasure-chalice-model';
  const profile = [
    new THREE.Vector2(0.12, 0),
    new THREE.Vector2(0.27, 0.08),
    new THREE.Vector2(0.13, 0.16),
    new THREE.Vector2(0.08, 0.52),
    new THREE.Vector2(0.32, 0.64),
    new THREE.Vector2(0.44, 0.86),
    new THREE.Vector2(0.47, 1.02),
    new THREE.Vector2(0.4, 1.08),
  ];
  const cup = mesh(new THREE.LatheGeometry(profile, 56), materials.gold, 'chalice-lathed-polished-gold-body');
  cup.position.y = 0.48;
  group.add(cup);
  const essence = cylinder(0.31, 0.31, 0.025, 48, materials.amethyst, 'chalice-recessed-amethyst-essence-surface');
  essence.position.y = 1.535;
  const rim = mesh(new THREE.TorusGeometry(0.4, 0.045, 10, 64), materials.gold, 'chalice-thick-polished-gold-rim');
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.565;
  const innerRim = mesh(new THREE.TorusGeometry(0.32, 0.018, 8, 56), materials.silver, 'chalice-silver-inner-rim');
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = 1.56;
  group.add(essence, rim, innerRim);
  for (const side of [-1, 1] as const) {
    const handle = mesh(new THREE.TorusGeometry(0.34, 0.035, 9, 48, Math.PI * 1.45), side < 0 ? materials.silver : materials.gold, 'chalice-royal-scroll-handle');
    handle.position.set(side * 0.42, 1.18, 0);
    handle.rotation.y = side < 0 ? -0.2 : Math.PI + 0.2;
    handle.scale.x = 0.72;
    group.add(handle);
    addGem(group, materials.sapphire, new THREE.Vector3(side * 0.43, 1.28, 0.08), 0.07, 'chalice-handle-sapphire');
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    addGem(group, index % 2 === 0 ? materials.ruby : materials.sapphire, new THREE.Vector3(Math.sin(angle) * 0.42, 1.46, Math.cos(angle) * 0.42), 0.055, 'chalice-rim-set-jewel');
  }
  return group;
}

const TREASURE_BUILDERS: Record<VaultTreasureId, (materials: TreasureMaterials) => THREE.Group> = {
  crown: createCrownTreasure,
  compass: createCompassTreasure,
  obelisk: createObeliskTreasure,
  egg: createEggTreasure,
  hourglass: createHourglassTreasure,
  key: createKeyTreasure,
  medallion: createMedallionTreasure,
  chalice: createChaliceTreasure,
};

export function createVaultTreasureModel(id: VaultTreasureId): VaultTreasureModel {
  const materials = createTreasureMaterials();
  const root = new THREE.Group();
  root.name = `vault-treasure-${id}`;
  root.userData.treasureId = id;
  root.userData.sculptRuntime = {
    id: `treasure-${id}`,
    clickable: true,
    futurePlacementSocket: 'vault-museum-pedestal',
    revealAnchor: 'pedestal-top',
  };
  addPedestal(root, materials, id);

  const treasure = TREASURE_BUILDERS[id](materials);
  treasure.userData.treasureId = id;
  treasure.position.y = 0.03;
  root.add(treasure);
  root.traverse((child) => {
    child.userData.treasureId = id;
  });

  return {
    root,
    treasure,
    dispose: () => {
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      disposeMaterialSet(materials);
    },
  };
}
