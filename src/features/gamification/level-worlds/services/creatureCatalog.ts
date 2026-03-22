import type { EggTier } from './eggService';

export interface CreatureDefinition {
  id: string;
  name: string;
  tier: EggTier;
  habitat: string;
  affinity: string;
}

export interface CreatureCompanionBonus {
  effect: 'bonus_dice' | 'bonus_heart' | 'bonus_spin';
  amount: number;
  label: string;
  description: string;
}

const COMMON_CREATURES: CreatureDefinition[] = [
  { id: 'common-sproutling', name: 'Sproutling', tier: 'common', habitat: 'Zen Garden', affinity: 'Builder' },
  { id: 'common-pebble-spirit', name: 'Pebble Spirit', tier: 'common', habitat: 'Root Atrium', affinity: 'Grounded' },
  { id: 'common-mossling', name: 'Mossling', tier: 'common', habitat: 'Moss Gallery', affinity: 'Nurturer' },
  { id: 'common-glowtail', name: 'Glowtail', tier: 'common', habitat: 'Hydro Deck', affinity: 'Steady' },
  { id: 'common-drift-pup', name: 'Drift Pup', tier: 'common', habitat: 'Zen Garden', affinity: 'Explorer' },
  { id: 'common-bloom-mite', name: 'Bloom Mite', tier: 'common', habitat: 'Root Atrium', affinity: 'Caregiver' },
  { id: 'common-stone-hopper', name: 'Stone Hopper', tier: 'common', habitat: 'Moss Gallery', affinity: 'Builder' },
  { id: 'common-fern-fox', name: 'Fern Fox', tier: 'common', habitat: 'Hydro Deck', affinity: 'Mentor' },
  { id: 'common-dewling', name: 'Dewling', tier: 'common', habitat: 'Zen Garden', affinity: 'Peacemaker' },
  { id: 'common-root-whisp', name: 'Root Whisp', tier: 'common', habitat: 'Root Atrium', affinity: 'Steady' },
  { id: 'common-garden-puff', name: 'Garden Puff', tier: 'common', habitat: 'Moss Gallery', affinity: 'Nurturer' },
  { id: 'common-lichen-kit', name: 'Lichen Kit', tier: 'common', habitat: 'Hydro Deck', affinity: 'Grounded' },
  { id: 'common-twilight-seed', name: 'Twilight Seed', tier: 'common', habitat: 'Zen Garden', affinity: 'Dreamer' },
  { id: 'common-river-bud', name: 'River Bud', tier: 'common', habitat: 'Hydro Deck', affinity: 'Caregiver' },
  { id: 'common-petal-scout', name: 'Petal Scout', tier: 'common', habitat: 'Root Atrium', affinity: 'Explorer' },
];

const RARE_CREATURES: CreatureDefinition[] = [
  { id: 'rare-luma-hatchling', name: 'Luma Hatchling', tier: 'rare', habitat: 'Zen Garden', affinity: 'Visionary' },
  { id: 'rare-nebula-wisp', name: 'Nebula Wisp', tier: 'rare', habitat: 'Astral Dome', affinity: 'Explorer' },
  { id: 'rare-dewleaf-sprite', name: 'Dewleaf Sprite', tier: 'rare', habitat: 'Hydro Deck', affinity: 'Guardian' },
  { id: 'rare-aurora-finch', name: 'Aurora Finch', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Visionary' },
  { id: 'rare-ember-sprout', name: 'Ember Sprout', tier: 'rare', habitat: 'Ember Lab', affinity: 'Catalyst' },
  { id: 'rare-solar-pika', name: 'Solar Pika', tier: 'rare', habitat: 'Solar Orchard', affinity: 'Champion' },
  { id: 'rare-comet-cub', name: 'Comet Cub', tier: 'rare', habitat: 'Engine Wing', affinity: 'Strategist' },
  { id: 'rare-bloom-seraph', name: 'Bloom Seraph', tier: 'rare', habitat: 'Zen Garden', affinity: 'Mentor' },
  { id: 'rare-shard-marten', name: 'Shard Marten', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Architect' },
  { id: 'rare-cinder-mouse', name: 'Cinder Mouse', tier: 'rare', habitat: 'Ember Lab', affinity: 'Challenger' },
  { id: 'rare-tide-lantern', name: 'Tide Lantern', tier: 'rare', habitat: 'Hydro Deck', affinity: 'Peacemaker' },
  { id: 'rare-halo-staglet', name: 'Halo Staglet', tier: 'rare', habitat: 'Solar Orchard', affinity: 'Guardian' },
  { id: 'rare-gear-wing', name: 'Gear Wing', tier: 'rare', habitat: 'Engine Wing', affinity: 'Builder' },
  { id: 'rare-mirage-pup', name: 'Mirage Pup', tier: 'rare', habitat: 'Astral Dome', affinity: 'Creator' },
  { id: 'rare-crown-drifter', name: 'Crown Drifter', tier: 'rare', habitat: 'Sky Foundry', affinity: 'Explorer' },
];

const MYTHIC_CREATURES: CreatureDefinition[] = [
  { id: 'mythic-starhorn-seraph', name: 'Starhorn Seraph', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Oracle' },
  { id: 'mythic-voidlight-familiar', name: 'Voidlight Familiar', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Visionary' },
  { id: 'mythic-sunflare-kirin', name: 'Sunflare Kirin', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Radiant' },
  { id: 'mythic-dreamroot-ancient', name: 'Dreamroot Ancient', tier: 'mythic', habitat: 'Star Archive', affinity: 'Sage' },
  { id: 'mythic-celest-pup', name: 'Celest Pup', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Cosmic' },
  { id: 'mythic-lux-leviathan', name: 'Lux Leviathan', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Commander' },
  { id: 'mythic-orbit-vulpine', name: 'Orbit Vulpine', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Explorer' },
  { id: 'mythic-astral-titanet', name: 'Astral Titanet', tier: 'mythic', habitat: 'Star Archive', affinity: 'Architect' },
  { id: 'mythic-solstice-sylph', name: 'Solstice Sylph', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Creator' },
  { id: 'mythic-echo-phoenix', name: 'Echo Phoenix', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Champion' },
  { id: 'mythic-nightbloom-drake', name: 'Nightbloom Drake', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Rebel' },
  { id: 'mythic-prism-warden', name: 'Prism Warden', tier: 'mythic', habitat: 'Star Archive', affinity: 'Guardian' },
  { id: 'mythic-aurora-maned-cat', name: 'Aurora Maned Cat', tier: 'mythic', habitat: 'Aurora Bridge', affinity: 'Visionary' },
  { id: 'mythic-cosmos-songbird', name: 'Cosmos Songbird', tier: 'mythic', habitat: 'Dream Observatory', affinity: 'Sage' },
  { id: 'mythic-infinity-sprite', name: 'Infinity Sprite', tier: 'mythic', habitat: 'Astral Dome', affinity: 'Oracle' },
];

export const CREATURE_CATALOG: CreatureDefinition[] = [
  ...COMMON_CREATURES,
  ...RARE_CREATURES,
  ...MYTHIC_CREATURES,
];

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

export function getCompanionBonusForCreature(creature: CreatureDefinition): CreatureCompanionBonus {
  if (['Guardian', 'Caregiver', 'Mentor', 'Peacemaker'].includes(creature.affinity)) {
    return {
      effect: 'bonus_heart',
      amount: 1,
      label: '+1 Heart',
      description: 'Supportive companion — grants +1 heart at the start of each island.',
    };
  }
  if (['Explorer', 'Visionary', 'Creator', 'Catalyst'].includes(creature.affinity)) {
    return {
      effect: 'bonus_spin',
      amount: 1,
      label: '+1 Spin',
      description: 'Momentum companion — grants +1 spin token at the start of each island.',
    };
  }
  return {
    effect: 'bonus_dice',
    amount: 4,
    label: '+4 Dice',
    description: 'Steady companion — grants +4 dice at the start of each island.',
  };
}
