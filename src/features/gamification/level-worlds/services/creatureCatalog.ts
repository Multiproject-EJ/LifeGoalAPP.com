import type { EggTier } from './eggService';

export type ShipZone = 'zen' | 'energy' | 'cosmic';

export interface CreatureDefinition {
  id: string;
  imageKey: string;
  name: string;
  tier: EggTier;
  habitat: string;
  affinity: string;
  shipZone: ShipZone;
}

export interface CreatureCompanionBonus {
  effect: 'bonus_dice' | 'bonus_essence' | 'bonus_spin';
  amount: number;
  label: string;
  description: string;
  bondLevel: number;
  nextBondMilestoneLevel: number;
}

export interface CreatureSpecialtyBonus {
  effect: 'sell_bonus_essence' | 'encounter_bonus_essence';
  amount: number;
  label: string;
  description: string;
  bondLevel: number;
}


function getSafeBondLevel(bondLevel: number): number {
  return Math.max(1, Math.floor(bondLevel));
}

function getScaledBonusAmount(baseAmount: number, bondLevel: number, growthStep: number): number {
  const safeBondLevel = getSafeBondLevel(bondLevel);
  const bonusSteps = Math.floor((safeBondLevel - 1) / growthStep);
  return baseAmount + bonusSteps;
}

function getNextBondMilestoneLevel(bondLevel: number, growthStep: number): number {
  const safeBondLevel = getSafeBondLevel(bondLevel);
  return Math.floor((safeBondLevel - 1) / growthStep) * growthStep + growthStep + 1;
}

const COMMON_CREATURES: CreatureDefinition[] = [
  { id: 'common-sproutling', imageKey: 'common-sproutling', name: 'Sproutling', tier: 'common', habitat: 'Zen Garden', affinity: 'Builder', shipZone: 'zen' },
  { id: 'common-pebble-spirit', imageKey: 'common-pebble-spirit', name: 'Pebble Spirit', tier: 'common', habitat: 'Root Atrium', affinity: 'Grounded', shipZone: 'zen' },
  { id: 'common-mossling', imageKey: 'common-mossling', name: 'Mossling', tier: 'common', habitat: 'Moss Gallery', affinity: 'Nurturer', shipZone: 'zen' },
  { id: 'common-glowtail', imageKey: 'common-glowtail', name: 'Glowtail', tier: 'common', habitat: 'Hydro Deck', affinity: 'Steady', shipZone: 'zen' },
  { id: 'common-drift-pup', imageKey: 'common-drift-pup', name: 'Drift Pup', tier: 'common', habitat: 'Zen Garden', affinity: 'Explorer', shipZone: 'zen' },
  { id: 'common-bloom-mite', imageKey: 'common-bloom-mite', name: 'Bloom Mite', tier: 'common', habitat: 'Root Atrium', affinity: 'Caregiver', shipZone: 'zen' },
  { id: 'common-stone-hopper', imageKey: 'common-stone-hopper', name: 'Stone Hopper', tier: 'common', habitat: 'Moss Gallery', affinity: 'Builder', shipZone: 'zen' },
  { id: 'common-fern-fox', imageKey: 'common-fern-fox', name: 'Fern Fox', tier: 'common', habitat: 'Hydro Deck', affinity: 'Mentor', shipZone: 'zen' },
  { id: 'common-dewling', imageKey: 'common-dewling', name: 'Dewling', tier: 'common', habitat: 'Zen Garden', affinity: 'Peacemaker', shipZone: 'zen' },
  { id: 'common-root-whisp', imageKey: 'common-root-whisp', name: 'Root Whisp', tier: 'common', habitat: 'Root Atrium', affinity: 'Steady', shipZone: 'zen' },
  { id: 'common-garden-puff', imageKey: 'common-garden-puff', name: 'Garden Puff', tier: 'common', habitat: 'Moss Gallery', affinity: 'Nurturer', shipZone: 'zen' },
  { id: 'common-lichen-kit', imageKey: 'common-lichen-kit', name: 'Lichen Kit', tier: 'common', habitat: 'Hydro Deck', affinity: 'Grounded', shipZone: 'zen' },
  { id: 'common-twilight-seed', imageKey: 'common-twilight-seed', name: 'Twilight Seed', tier: 'common', habitat: 'Zen Garden', affinity: 'Dreamer', shipZone: 'zen' },
  { id: 'common-river-bud', imageKey: 'common-river-bud', name: 'River Bud', tier: 'common', habitat: 'Hydro Deck', affinity: 'Caregiver', shipZone: 'zen' },
  { id: 'common-petal-scout', imageKey: 'common-petal-scout', name: 'Petal Scout', tier: 'common', habitat: 'Root Atrium', affinity: 'Explorer', shipZone: 'zen' },
];

const RARE_CREATURES: CreatureDefinition[] = [
  { id: 'rare-luma-hatchling', imageKey: 'rare-luma-hatchling', name: 'Luma Hatchling', tier: 'rare', habitat: 'Zen Garden', affinity: 'Visionary', shipZone: 'zen' },
  { id: 'rare-nebula-wisp', imageKey: 'rare-nebula-wisp', name: 'Nebula Wisp', tier: 'rare', habitat: 'Astral Dome', affinity: 'Explorer', shipZone: 'cosmic' },
  { id: 'rare-dewleaf-sprite', imageKey: 'rare-dewleaf-sprite', name: 'Dewleaf Sprite', tier: 'rare', habitat: 'Hydro Deck', affinity: 'Guardian', shipZone: 'zen' },
  { id: 'rare-aurora-finch', imageKey: 'rare-aurora-finch', name: 'Aurora Finch', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Visionary', shipZone: 'energy' },
  { id: 'rare-ember-sprout', imageKey: 'rare-ember-sprout', name: 'Ember Sprout', tier: 'rare', habitat: 'Ember Lab', affinity: 'Catalyst', shipZone: 'energy' },
  { id: 'rare-solar-pika', imageKey: 'rare-solar-pika', name: 'Solar Pika', tier: 'rare', habitat: 'Solar Orchard', affinity: 'Champion', shipZone: 'energy' },
  { id: 'rare-comet-cub', imageKey: 'rare-comet-cub', name: 'Comet Cub', tier: 'rare', habitat: 'Engine Wing', affinity: 'Strategist', shipZone: 'energy' },
  { id: 'rare-bloom-seraph', imageKey: 'rare-bloom-seraph', name: 'Bloom Seraph', tier: 'rare', habitat: 'Zen Garden', affinity: 'Mentor', shipZone: 'zen' },
  { id: 'rare-shard-marten', imageKey: 'rare-shard-marten', name: 'Shard Marten', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Architect', shipZone: 'energy' },
  { id: 'rare-cinder-mouse', imageKey: 'rare-cinder-mouse', name: 'Cinder Mouse', tier: 'rare', habitat: 'Ember Lab', affinity: 'Challenger', shipZone: 'energy' },
  { id: 'rare-tide-lantern', imageKey: 'rare-tide-lantern', name: 'Tide Lantern', tier: 'rare', habitat: 'Hydro Deck', affinity: 'Peacemaker', shipZone: 'zen' },
  { id: 'rare-halo-staglet', imageKey: 'rare-halo-staglet', name: 'Halo Staglet', tier: 'rare', habitat: 'Solar Orchard', affinity: 'Guardian', shipZone: 'energy' },
  { id: 'rare-gear-wing', imageKey: 'rare-gear-wing', name: 'Gear Wing', tier: 'rare', habitat: 'Engine Wing', affinity: 'Builder', shipZone: 'energy' },
  { id: 'rare-mirage-pup', imageKey: 'rare-mirage-pup', name: 'Mirage Pup', tier: 'rare', habitat: 'Astral Dome', affinity: 'Creator', shipZone: 'cosmic' },
  { id: 'rare-crown-drifter', imageKey: 'rare-crown-drifter', name: 'Crown Drifter', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Explorer', shipZone: 'energy' },
];

const MYTHIC_CREATURES: CreatureDefinition[] = [
  { id: 'mythic-starhorn-seraph', imageKey: 'mythic-starhorn-seraph', name: 'Starhorn Seraph', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Oracle', shipZone: 'cosmic' },
  { id: 'mythic-voidlight-familiar', imageKey: 'mythic-voidlight-familiar', name: 'Voidlight Familiar', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Visionary', shipZone: 'cosmic' },
  { id: 'mythic-sunflare-kirin', imageKey: 'mythic-sunflare-kirin', name: 'Sunflare Kirin', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Radiant', shipZone: 'cosmic' },
  { id: 'mythic-dreamroot-ancient', imageKey: 'mythic-dreamroot-ancient', name: 'Dreamroot Ancient', tier: 'mythic', habitat: 'Star Archive', affinity: 'Sage', shipZone: 'cosmic' },
  { id: 'mythic-celest-pup', imageKey: 'mythic-celest-pup', name: 'Celest Pup', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Cosmic', shipZone: 'cosmic' },
  { id: 'mythic-lux-leviathan', imageKey: 'mythic-lux-leviathan', name: 'Lux Leviathan', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Commander', shipZone: 'cosmic' },
  { id: 'mythic-orbit-vulpine', imageKey: 'mythic-orbit-vulpine', name: 'Orbit Vulpine', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Explorer', shipZone: 'cosmic' },
  { id: 'mythic-astral-titanet', imageKey: 'mythic-astral-titanet', name: 'Astral Titanet', tier: 'mythic', habitat: 'Star Archive', affinity: 'Architect', shipZone: 'cosmic' },
  { id: 'mythic-solstice-sylph', imageKey: 'mythic-solstice-sylph', name: 'Solstice Sylph', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Creator', shipZone: 'cosmic' },
  { id: 'mythic-echo-phoenix', imageKey: 'mythic-echo-phoenix', name: 'Echo Phoenix', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Champion', shipZone: 'cosmic' },
  { id: 'mythic-nightbloom-drake', imageKey: 'mythic-nightbloom-drake', name: 'Nightbloom Drake', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Rebel', shipZone: 'cosmic' },
  { id: 'mythic-prism-warden', imageKey: 'mythic-prism-warden', name: 'Prism Warden', tier: 'mythic', habitat: 'Star Archive', affinity: 'Guardian', shipZone: 'cosmic' },
  { id: 'mythic-aurora-maned-cat', imageKey: 'mythic-aurora-maned-cat', name: 'Aurora Maned Cat', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Visionary', shipZone: 'cosmic' },
  { id: 'mythic-cosmos-songbird', imageKey: 'mythic-cosmos-songbird', name: 'Cosmos Songbird', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Sage', shipZone: 'cosmic' },
  { id: 'mythic-infinity-sprite', imageKey: 'mythic-infinity-sprite', name: 'Infinity Sprite', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Oracle', shipZone: 'cosmic' },
];

export const CREATURE_CATALOG: CreatureDefinition[] = [
  ...COMMON_CREATURES,
  ...RARE_CREATURES,
  ...MYTHIC_CREATURES,
];


const HABITAT_TO_SHIP_ZONE: Record<string, ShipZone> = {
  'Zen Garden': 'zen',
  'Root Atrium': 'zen',
  'Moss Gallery': 'zen',
  'Hydro Deck': 'zen',
  'Ember Lab': 'energy',
  'Solar Orchard': 'energy',
  'Engine Wing': 'energy',
  'Sky Foundry': 'energy',
  'Astral Dome': 'cosmic',
  'Dream Observatory': 'cosmic',
  'Aurora Bridge': 'cosmic',
  'Star Archive': 'cosmic',
};

export function resolveShipZoneFromHabitat(habitat: string): ShipZone {
  return HABITAT_TO_SHIP_ZONE[habitat] ?? 'zen';
}

export function resolveShipZoneForCreature(creature: Pick<CreatureDefinition, 'shipZone' | 'habitat'>): ShipZone {
  return creature.shipZone ?? resolveShipZoneFromHabitat(creature.habitat);
}

const CREATURES_BY_TIER: Record<EggTier, CreatureDefinition[]> = {
  common: COMMON_CREATURES,
  rare: RARE_CREATURES,
  mythic: MYTHIC_CREATURES,
};

export function getCreatureById(creatureId: string): CreatureDefinition | null {
  return CREATURE_CATALOG.find((creature) => creature.id === creatureId) ?? null;
}

export function selectCreatureForEgg(options: {
  eggTier: EggTier;
  seed: number;
  islandNumber: number;
}): CreatureDefinition {
  const { eggTier, seed, islandNumber } = options;
  const pool = CREATURES_BY_TIER[eggTier];
  const index = Math.abs((seed * 17) + (islandNumber * 31)) % pool.length;
  return pool[index] ?? pool[0];
}

export interface EarlyFeaturedCreaturePoolOptions {
  enabled: boolean;
  featuredWeightPercent?: number;
}

const EARLY_FEATURED_ISLAND_MAX = 5;
const DEFAULT_FEATURED_WEIGHT_PERCENT = 70;

const EARLY_FEATURED_CREATURES_BY_ISLAND: Record<number, Record<EggTier, string[]>> = {
  1: {
    common: ['common-sproutling'],
    rare: ['rare-ember-sprout', 'rare-aurora-finch'],
    mythic: ['mythic-starhorn-seraph'],
  },
  2: {
    common: ['common-sproutling'],
    rare: ['rare-aurora-finch', 'rare-ember-sprout'],
    mythic: ['mythic-starhorn-seraph'],
  },
  3: {
    common: ['common-sproutling'],
    rare: ['rare-nebula-wisp', 'rare-aurora-finch'],
    mythic: ['mythic-starhorn-seraph'],
  },
  4: {
    common: ['common-sproutling'],
    rare: ['rare-ember-sprout', 'rare-nebula-wisp'],
    mythic: ['mythic-starhorn-seraph'],
  },
  5: {
    common: ['common-sproutling'],
    rare: ['rare-aurora-finch', 'rare-nebula-wisp', 'rare-ember-sprout'],
    mythic: ['mythic-starhorn-seraph'],
  },
};

function normalizeFeaturedWeightPercent(weightPercent: number | undefined): number {
  if (!Number.isFinite(weightPercent)) return DEFAULT_FEATURED_WEIGHT_PERCENT;
  return Math.max(0, Math.min(100, Math.floor(weightPercent as number)));
}

function getFeaturedCreaturePoolForIsland(options: { islandNumber: number; eggTier: EggTier }): CreatureDefinition[] {
  const { islandNumber, eggTier } = options;
  if (islandNumber < 1 || islandNumber > EARLY_FEATURED_ISLAND_MAX) return [];
  const ids = EARLY_FEATURED_CREATURES_BY_ISLAND[islandNumber]?.[eggTier] ?? [];
  if (ids.length === 0) return [];
  return ids
    .map((id) => getCreatureById(id))
    .filter((creature): creature is CreatureDefinition => Boolean(creature && creature.tier === eggTier));
}

/**
 * Feature-flagged resolver used to bias early-island hatch species toward
 * production-art creatures while preserving tier constraints and deterministic
 * behavior from `eggTier + seed + islandNumber`.
 */
export function selectCreatureForEggWithEarlyFeaturedPool(options: {
  eggTier: EggTier;
  seed: number;
  islandNumber: number;
  earlyFeaturedPool: EarlyFeaturedCreaturePoolOptions;
}): CreatureDefinition {
  const { eggTier, seed, islandNumber, earlyFeaturedPool } = options;
  const baseline = selectCreatureForEgg({ eggTier, seed, islandNumber });
  if (!earlyFeaturedPool.enabled) return baseline;
  if (islandNumber < 1 || islandNumber > EARLY_FEATURED_ISLAND_MAX) return baseline;

  const featuredPool = getFeaturedCreaturePoolForIsland({ islandNumber, eggTier });
  if (featuredPool.length === 0) return baseline;

  const featuredWeightPercent = normalizeFeaturedWeightPercent(earlyFeaturedPool.featuredWeightPercent);
  const shouldUseFeaturedPool = Math.abs((seed * 29) + (islandNumber * 13) + (eggTier.length * 7)) % 100 < featuredWeightPercent;
  if (!shouldUseFeaturedPool) return baseline;

  const featuredIndex = Math.abs((seed * 19) + (islandNumber * 37) + (eggTier.length * 11)) % featuredPool.length;
  return featuredPool[featuredIndex] ?? baseline;
}

export function getCompanionBonusForCreature(creature: CreatureDefinition, bondLevel = 1): CreatureCompanionBonus {
  if (['Guardian', 'Caregiver', 'Mentor', 'Peacemaker'].includes(creature.affinity)) {
    const amount = getScaledBonusAmount(1, bondLevel, 5);
    return {
      effect: 'bonus_essence',
      amount: amount * 5, // hearts retired → convert to meaningful essence amounts
      label: `+${amount * 5} Essence`,
      description: `Supportive companion — grants +${amount * 5} essence at the start of each island. Grows every 5 bond levels.`,
      bondLevel: getSafeBondLevel(bondLevel),
      nextBondMilestoneLevel: getNextBondMilestoneLevel(bondLevel, 5),
    };
  }
  if (['Explorer', 'Visionary', 'Creator', 'Catalyst'].includes(creature.affinity)) {
    const amount = getScaledBonusAmount(1, bondLevel, 5);
    return {
      effect: 'bonus_spin',
      amount,
      label: `+${amount} Spin${amount === 1 ? '' : 's'}`,
      description: `Momentum companion — grants +${amount} spin token${amount === 1 ? '' : 's'} at the start of each island. Grows every 5 bond levels.`,
      bondLevel: getSafeBondLevel(bondLevel),
      nextBondMilestoneLevel: getNextBondMilestoneLevel(bondLevel, 5),
    };
  }
  const amount = 4 + (Math.floor((getSafeBondLevel(bondLevel) - 1) / 3) * 2);
  return {
    effect: 'bonus_dice',
    amount,
    label: `+${amount} Dice`,
    description: `Steady companion — grants +${amount} dice at the start of each island. Grows by +2 every 3 bond levels.`,
    bondLevel: getSafeBondLevel(bondLevel),
    nextBondMilestoneLevel: getNextBondMilestoneLevel(bondLevel, 3),
  };
}

export function getCreatureSpecialtyForCompanion(creature: CreatureDefinition, bondLevel = 1): CreatureSpecialtyBonus {
  const safeBondLevel = getSafeBondLevel(bondLevel);

  if (['Builder', 'Grounded', 'Steady', 'Architect', 'Strategist', 'Commander', 'Champion'].includes(creature.affinity)) {
    const amount = 15 + (Math.floor((safeBondLevel - 1) / 4) * 5);
    return {
      effect: 'sell_bonus_essence',
      amount,
      label: `Hatchery Negotiator +${amount}%`,
      description: `When you sell a hatched creature, gain +${amount}% bonus essence.`,
      bondLevel: safeBondLevel,
    };
  }

  const amount = 5 + (Math.floor((safeBondLevel - 1) / 4) * 3);
  return {
    effect: 'encounter_bonus_essence',
    amount,
    label: `Fortune Scout +${amount} essence`,
    description: `On successful encounters, gain +${amount} extra essence.`,
    bondLevel: safeBondLevel,
  };
}
