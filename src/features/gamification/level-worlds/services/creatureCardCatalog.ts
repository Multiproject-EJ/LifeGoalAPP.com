import { CREATURE_CATALOG, resolveShipZoneForCreature, type CreatureDefinition, type ShipZone } from './creatureCatalog';
import type { EggTier } from './eggService';

export type CreatureCardThemeTier = EggTier;

export interface CreatureCardMetadata {
  creatureId: string;
  displayName: string;
  shortTitle: string;
  rarityLabel: string;
  flavorQuote: string;
  passiveName: string;
  passiveText: string;
  powerLabel: string;
  statLine: string;
  theme: {
    tier: CreatureCardThemeTier;
    shipZone: ShipZone;
    accent: string;
    template: string;
  };
}

const RARITY_LABELS: Record<EggTier, string> = {
  common: 'Common',
  rare: 'Rare',
  mythic: 'Mythic',
};

const SHIP_ZONE_ACCENTS: Record<ShipZone, string> = {
  zen: 'Zen',
  energy: 'Energy',
  cosmic: 'Cosmic',
};

const CURATED_CREATURE_CARD_METADATA: Record<string, Omit<CreatureCardMetadata, 'theme'>> = {
  'common-sproutling': { creatureId: 'common-sproutling', displayName: 'Sproutling', shortTitle: 'Builder Companion', rarityLabel: 'Common', flavorQuote: 'Sproutling brings steady builder magic to your journey.', passiveName: 'Builder Spark', passiveText: 'Offers a short builder support prompt when you need momentum.', powerLabel: 'PWR 12', statLine: 'Builder · Zen Garden' },
  'common-pebble-spirit': { creatureId: 'common-pebble-spirit', displayName: 'Pebble Spirit', shortTitle: 'Grounded Companion', rarityLabel: 'Common', flavorQuote: 'Pebble Spirit brings steady grounded magic to your journey.', passiveName: 'Grounded Spark', passiveText: 'Offers a short grounded support prompt when you need momentum.', powerLabel: 'PWR 13', statLine: 'Grounded · Root Atrium' },
  'common-mossling': { creatureId: 'common-mossling', displayName: 'Mossling', shortTitle: 'Nurturer Companion', rarityLabel: 'Common', flavorQuote: 'Mossling brings steady nurturer magic to your journey.', passiveName: 'Nurturer Spark', passiveText: 'Offers a short nurturer support prompt when you need momentum.', powerLabel: 'PWR 14', statLine: 'Nurturer · Moss Gallery' },
  'common-glowtail': { creatureId: 'common-glowtail', displayName: 'Glowtail', shortTitle: 'Steady Companion', rarityLabel: 'Common', flavorQuote: 'Glowtail brings steady steady magic to your journey.', passiveName: 'Steady Spark', passiveText: 'Offers a short steady support prompt when you need momentum.', powerLabel: 'PWR 15', statLine: 'Steady · Hydro Deck' },
  'common-drift-pup': { creatureId: 'common-drift-pup', displayName: 'Drift Pup', shortTitle: 'Explorer Companion', rarityLabel: 'Common', flavorQuote: 'Drift Pup brings steady explorer magic to your journey.', passiveName: 'Explorer Spark', passiveText: 'Offers a short explorer support prompt when you need momentum.', powerLabel: 'PWR 16', statLine: 'Explorer · Zen Garden' },
  'common-bloom-mite': { creatureId: 'common-bloom-mite', displayName: 'Bloom Mite', shortTitle: 'Caregiver Companion', rarityLabel: 'Common', flavorQuote: 'Bloom Mite brings steady caregiver magic to your journey.', passiveName: 'Caregiver Spark', passiveText: 'Offers a short caregiver support prompt when you need momentum.', powerLabel: 'PWR 17', statLine: 'Caregiver · Root Atrium' },
  'common-stone-hopper': { creatureId: 'common-stone-hopper', displayName: 'Stone Hopper', shortTitle: 'Builder Companion', rarityLabel: 'Common', flavorQuote: 'Stone Hopper brings steady builder magic to your journey.', passiveName: 'Builder Spark', passiveText: 'Offers a short builder support prompt when you need momentum.', powerLabel: 'PWR 12', statLine: 'Builder · Moss Gallery' },
  'common-fern-fox': { creatureId: 'common-fern-fox', displayName: 'Fern Fox', shortTitle: 'Mentor Companion', rarityLabel: 'Common', flavorQuote: 'Fern Fox brings steady mentor magic to your journey.', passiveName: 'Mentor Spark', passiveText: 'Offers a short mentor support prompt when you need momentum.', powerLabel: 'PWR 13', statLine: 'Mentor · Hydro Deck' },
  'common-dewling': { creatureId: 'common-dewling', displayName: 'Dewling', shortTitle: 'Peacemaker Companion', rarityLabel: 'Common', flavorQuote: 'Dewling brings steady peacemaker magic to your journey.', passiveName: 'Peacemaker Spark', passiveText: 'Offers a short peacemaker support prompt when you need momentum.', powerLabel: 'PWR 14', statLine: 'Peacemaker · Zen Garden' },
  'common-root-whisp': { creatureId: 'common-root-whisp', displayName: 'Root Whisp', shortTitle: 'Steady Companion', rarityLabel: 'Common', flavorQuote: 'Root Whisp brings steady steady magic to your journey.', passiveName: 'Steady Spark', passiveText: 'Offers a short steady support prompt when you need momentum.', powerLabel: 'PWR 15', statLine: 'Steady · Root Atrium' },
  'common-garden-puff': { creatureId: 'common-garden-puff', displayName: 'Garden Puff', shortTitle: 'Nurturer Companion', rarityLabel: 'Common', flavorQuote: 'Garden Puff brings steady nurturer magic to your journey.', passiveName: 'Nurturer Spark', passiveText: 'Offers a short nurturer support prompt when you need momentum.', powerLabel: 'PWR 16', statLine: 'Nurturer · Moss Gallery' },
  'common-lichen-kit': { creatureId: 'common-lichen-kit', displayName: 'Lichen Kit', shortTitle: 'Grounded Companion', rarityLabel: 'Common', flavorQuote: 'Lichen Kit brings steady grounded magic to your journey.', passiveName: 'Grounded Spark', passiveText: 'Offers a short grounded support prompt when you need momentum.', powerLabel: 'PWR 17', statLine: 'Grounded · Hydro Deck' },
  'common-twilight-seed': { creatureId: 'common-twilight-seed', displayName: 'Twilight Seed', shortTitle: 'Dreamer Companion', rarityLabel: 'Common', flavorQuote: 'Twilight Seed brings steady dreamer magic to your journey.', passiveName: 'Dreamer Spark', passiveText: 'Offers a short dreamer support prompt when you need momentum.', powerLabel: 'PWR 12', statLine: 'Dreamer · Zen Garden' },
  'common-river-bud': { creatureId: 'common-river-bud', displayName: 'River Bud', shortTitle: 'Caregiver Companion', rarityLabel: 'Common', flavorQuote: 'River Bud brings steady caregiver magic to your journey.', passiveName: 'Caregiver Spark', passiveText: 'Offers a short caregiver support prompt when you need momentum.', powerLabel: 'PWR 13', statLine: 'Caregiver · Hydro Deck' },
  'common-petal-scout': { creatureId: 'common-petal-scout', displayName: 'Petal Scout', shortTitle: 'Explorer Companion', rarityLabel: 'Common', flavorQuote: 'Petal Scout brings steady explorer magic to your journey.', passiveName: 'Explorer Spark', passiveText: 'Offers a short explorer support prompt when you need momentum.', powerLabel: 'PWR 14', statLine: 'Explorer · Root Atrium' },
  'rare-luma-hatchling': { creatureId: 'rare-luma-hatchling', displayName: 'Luma Hatchling', shortTitle: 'Visionary Companion', rarityLabel: 'Rare', flavorQuote: 'Luma Hatchling brings steady visionary magic to your journey.', passiveName: 'Visionary Spark', passiveText: 'Offers a short visionary support prompt when you need momentum.', powerLabel: 'PWR 33', statLine: 'Visionary · Zen Garden' },
  'rare-nebula-wisp': { creatureId: 'rare-nebula-wisp', displayName: 'Nebula Wisp', shortTitle: 'Explorer Companion', rarityLabel: 'Rare', flavorQuote: 'Nebula Wisp brings steady explorer magic to your journey.', passiveName: 'Explorer Spark', passiveText: 'Offers a short explorer support prompt when you need momentum.', powerLabel: 'PWR 26', statLine: 'Explorer · Astral Dome' },
  'rare-dewleaf-sprite': { creatureId: 'rare-dewleaf-sprite', displayName: 'Dewleaf Sprite', shortTitle: 'Guardian Companion', rarityLabel: 'Rare', flavorQuote: 'Dewleaf Sprite brings steady guardian magic to your journey.', passiveName: 'Guardian Spark', passiveText: 'Offers a short guardian support prompt when you need momentum.', powerLabel: 'PWR 27', statLine: 'Guardian · Hydro Deck' },
  'rare-aurora-finch': { creatureId: 'rare-aurora-finch', displayName: 'Aurora Finch', shortTitle: 'Visionary Companion', rarityLabel: 'Rare', flavorQuote: 'Aurora Finch brings steady visionary magic to your journey.', passiveName: 'Visionary Spark', passiveText: 'Offers a short visionary support prompt when you need momentum.', powerLabel: 'PWR 28', statLine: 'Visionary · Sky Foundry' },
  'rare-ember-sprout': { creatureId: 'rare-ember-sprout', displayName: 'Ember Sprout', shortTitle: 'Catalyst Companion', rarityLabel: 'Rare', flavorQuote: 'Ember Sprout brings steady catalyst magic to your journey.', passiveName: 'Catalyst Spark', passiveText: 'Offers a short catalyst support prompt when you need momentum.', powerLabel: 'PWR 29', statLine: 'Catalyst · Ember Lab' },
  'rare-solar-pika': { creatureId: 'rare-solar-pika', displayName: 'Solar Pika', shortTitle: 'Champion Companion', rarityLabel: 'Rare', flavorQuote: 'Solar Pika brings steady champion magic to your journey.', passiveName: 'Champion Spark', passiveText: 'Offers a short champion support prompt when you need momentum.', powerLabel: 'PWR 30', statLine: 'Champion · Solar Orchard' },
  'rare-comet-cub': { creatureId: 'rare-comet-cub', displayName: 'Comet Cub', shortTitle: 'Strategist Companion', rarityLabel: 'Rare', flavorQuote: 'Comet Cub brings steady strategist magic to your journey.', passiveName: 'Strategist Spark', passiveText: 'Offers a short strategist support prompt when you need momentum.', powerLabel: 'PWR 31', statLine: 'Strategist · Engine Wing' },
  'rare-bloom-seraph': { creatureId: 'rare-bloom-seraph', displayName: 'Bloom Seraph', shortTitle: 'Mentor Companion', rarityLabel: 'Rare', flavorQuote: 'Bloom Seraph brings steady mentor magic to your journey.', passiveName: 'Mentor Spark', passiveText: 'Offers a short mentor support prompt when you need momentum.', powerLabel: 'PWR 32', statLine: 'Mentor · Zen Garden' },
  'rare-shard-marten': { creatureId: 'rare-shard-marten', displayName: 'Shard Marten', shortTitle: 'Architect Companion', rarityLabel: 'Rare', flavorQuote: 'Shard Marten brings steady architect magic to your journey.', passiveName: 'Architect Spark', passiveText: 'Offers a short architect support prompt when you need momentum.', powerLabel: 'PWR 33', statLine: 'Architect · Sky Foundry' },
  'rare-cinder-mouse': { creatureId: 'rare-cinder-mouse', displayName: 'Cinder Mouse', shortTitle: 'Challenger Companion', rarityLabel: 'Rare', flavorQuote: 'Cinder Mouse brings steady challenger magic to your journey.', passiveName: 'Challenger Spark', passiveText: 'Offers a short challenger support prompt when you need momentum.', powerLabel: 'PWR 26', statLine: 'Challenger · Ember Lab' },
  'rare-tide-lantern': { creatureId: 'rare-tide-lantern', displayName: 'Tide Lantern', shortTitle: 'Peacemaker Companion', rarityLabel: 'Rare', flavorQuote: 'Tide Lantern brings steady peacemaker magic to your journey.', passiveName: 'Peacemaker Spark', passiveText: 'Offers a short peacemaker support prompt when you need momentum.', powerLabel: 'PWR 27', statLine: 'Peacemaker · Hydro Deck' },
  'rare-halo-staglet': { creatureId: 'rare-halo-staglet', displayName: 'Halo Staglet', shortTitle: 'Guardian Companion', rarityLabel: 'Rare', flavorQuote: 'Halo Staglet brings steady guardian magic to your journey.', passiveName: 'Guardian Spark', passiveText: 'Offers a short guardian support prompt when you need momentum.', powerLabel: 'PWR 28', statLine: 'Guardian · Solar Orchard' },
  'rare-gear-wing': { creatureId: 'rare-gear-wing', displayName: 'Gear Wing', shortTitle: 'Builder Companion', rarityLabel: 'Rare', flavorQuote: 'Gear Wing brings steady builder magic to your journey.', passiveName: 'Builder Spark', passiveText: 'Offers a short builder support prompt when you need momentum.', powerLabel: 'PWR 29', statLine: 'Builder · Engine Wing' },
  'rare-mirage-pup': { creatureId: 'rare-mirage-pup', displayName: 'Mirage Pup', shortTitle: 'Creator Companion', rarityLabel: 'Rare', flavorQuote: 'Mirage Pup brings steady creator magic to your journey.', passiveName: 'Creator Spark', passiveText: 'Offers a short creator support prompt when you need momentum.', powerLabel: 'PWR 30', statLine: 'Creator · Astral Dome' },
  'rare-crown-drifter': { creatureId: 'rare-crown-drifter', displayName: 'Crown Drifter', shortTitle: 'Explorer Companion', rarityLabel: 'Rare', flavorQuote: 'Crown Drifter brings steady explorer magic to your journey.', passiveName: 'Explorer Spark', passiveText: 'Offers a short explorer support prompt when you need momentum.', powerLabel: 'PWR 31', statLine: 'Explorer · Sky Foundry' },
  'mythic-starhorn-seraph': { creatureId: 'mythic-starhorn-seraph', displayName: 'Starhorn Seraph', shortTitle: 'Oracle Companion', rarityLabel: 'Mythic', flavorQuote: 'Starhorn Seraph brings steady oracle magic to your journey.', passiveName: 'Oracle Spark', passiveText: 'Offers a short oracle support prompt when you need momentum.', powerLabel: 'PWR 44', statLine: 'Oracle · Astral Dome' },
  'mythic-voidlight-familiar': { creatureId: 'mythic-voidlight-familiar', displayName: 'Voidlight Familiar', shortTitle: 'Visionary Companion', rarityLabel: 'Mythic', flavorQuote: 'Voidlight Familiar brings steady visionary magic to your journey.', passiveName: 'Visionary Spark', passiveText: 'Offers a short visionary support prompt when you need momentum.', powerLabel: 'PWR 45', statLine: 'Visionary · Dream Observatory' },
  'mythic-sunflare-kirin': { creatureId: 'mythic-sunflare-kirin', displayName: 'Sunflare Kirin', shortTitle: 'Radiant Companion', rarityLabel: 'Mythic', flavorQuote: 'Sunflare Kirin brings steady radiant magic to your journey.', passiveName: 'Radiant Spark', passiveText: 'Offers a short radiant support prompt when you need momentum.', powerLabel: 'PWR 46', statLine: 'Radiant · Aurora Bridge' },
  'mythic-dreamroot-ancient': { creatureId: 'mythic-dreamroot-ancient', displayName: 'Dreamroot Ancient', shortTitle: 'Sage Companion', rarityLabel: 'Mythic', flavorQuote: 'Dreamroot Ancient brings steady sage magic to your journey.', passiveName: 'Sage Spark', passiveText: 'Offers a short sage support prompt when you need momentum.', powerLabel: 'PWR 47', statLine: 'Sage · Star Archive' },
  'mythic-celest-pup': { creatureId: 'mythic-celest-pup', displayName: 'Celest Pup', shortTitle: 'Cosmic Companion', rarityLabel: 'Mythic', flavorQuote: 'Celest Pup brings steady cosmic magic to your journey.', passiveName: 'Cosmic Spark', passiveText: 'Offers a short cosmic support prompt when you need momentum.', powerLabel: 'PWR 48', statLine: 'Cosmic · Astral Dome' },
  'mythic-lux-leviathan': { creatureId: 'mythic-lux-leviathan', displayName: 'Lux Leviathan', shortTitle: 'Commander Companion', rarityLabel: 'Mythic', flavorQuote: 'Lux Leviathan brings steady commander magic to your journey.', passiveName: 'Commander Spark', passiveText: 'Offers a short commander support prompt when you need momentum.', powerLabel: 'PWR 49', statLine: 'Commander · Aurora Bridge' },
  'mythic-orbit-vulpine': { creatureId: 'mythic-orbit-vulpine', displayName: 'Orbit Vulpine', shortTitle: 'Explorer Companion', rarityLabel: 'Mythic', flavorQuote: 'Orbit Vulpine brings steady explorer magic to your journey.', passiveName: 'Explorer Spark', passiveText: 'Offers a short explorer support prompt when you need momentum.', powerLabel: 'PWR 50', statLine: 'Explorer · Dream Observatory' },
  'mythic-astral-titanet': { creatureId: 'mythic-astral-titanet', displayName: 'Astral Titanet', shortTitle: 'Architect Companion', rarityLabel: 'Mythic', flavorQuote: 'Astral Titanet brings steady architect magic to your journey.', passiveName: 'Architect Spark', passiveText: 'Offers a short architect support prompt when you need momentum.', powerLabel: 'PWR 51', statLine: 'Architect · Star Archive' },
  'mythic-solstice-sylph': { creatureId: 'mythic-solstice-sylph', displayName: 'Solstice Sylph', shortTitle: 'Creator Companion', rarityLabel: 'Mythic', flavorQuote: 'Solstice Sylph brings steady creator magic to your journey.', passiveName: 'Creator Spark', passiveText: 'Offers a short creator support prompt when you need momentum.', powerLabel: 'PWR 52', statLine: 'Creator · Aurora Bridge' },
  'mythic-echo-phoenix': { creatureId: 'mythic-echo-phoenix', displayName: 'Echo Phoenix', shortTitle: 'Champion Companion', rarityLabel: 'Mythic', flavorQuote: 'Echo Phoenix brings steady champion magic to your journey.', passiveName: 'Champion Spark', passiveText: 'Offers a short champion support prompt when you need momentum.', powerLabel: 'PWR 53', statLine: 'Champion · Dream Observatory' },
  'mythic-nightbloom-drake': { creatureId: 'mythic-nightbloom-drake', displayName: 'Nightbloom Drake', shortTitle: 'Rebel Companion', rarityLabel: 'Mythic', flavorQuote: 'Nightbloom Drake brings steady rebel magic to your journey.', passiveName: 'Rebel Spark', passiveText: 'Offers a short rebel support prompt when you need momentum.', powerLabel: 'PWR 44', statLine: 'Rebel · Astral Dome' },
  'mythic-prism-warden': { creatureId: 'mythic-prism-warden', displayName: 'Prism Warden', shortTitle: 'Guardian Companion', rarityLabel: 'Mythic', flavorQuote: 'Prism Warden brings steady guardian magic to your journey.', passiveName: 'Guardian Spark', passiveText: 'Offers a short guardian support prompt when you need momentum.', powerLabel: 'PWR 45', statLine: 'Guardian · Star Archive' },
  'mythic-aurora-maned-cat': { creatureId: 'mythic-aurora-maned-cat', displayName: 'Aurora Maned Cat', shortTitle: 'Visionary Companion', rarityLabel: 'Mythic', flavorQuote: 'Aurora Maned Cat brings steady visionary magic to your journey.', passiveName: 'Visionary Spark', passiveText: 'Offers a short visionary support prompt when you need momentum.', powerLabel: 'PWR 46', statLine: 'Visionary · Aurora Bridge' },
  'mythic-cosmos-songbird': { creatureId: 'mythic-cosmos-songbird', displayName: 'Cosmos Songbird', shortTitle: 'Sage Companion', rarityLabel: 'Mythic', flavorQuote: 'Cosmos Songbird brings steady sage magic to your journey.', passiveName: 'Sage Spark', passiveText: 'Offers a short sage support prompt when you need momentum.', powerLabel: 'PWR 47', statLine: 'Sage · Dream Observatory' },
  'mythic-infinity-sprite': { creatureId: 'mythic-infinity-sprite', displayName: 'Infinity Sprite', shortTitle: 'Oracle Companion', rarityLabel: 'Mythic', flavorQuote: 'Infinity Sprite brings steady oracle magic to your journey.', passiveName: 'Oracle Spark', passiveText: 'Offers a short oracle support prompt when you need momentum.', powerLabel: 'PWR 48', statLine: 'Oracle · Astral Dome' },
};

function buildFallbackCardMetadata(creature: CreatureDefinition): CreatureCardMetadata {
  const shipZone = resolveShipZoneForCreature(creature);
  return {
    creatureId: creature.id,
    displayName: creature.name,
    shortTitle: `${creature.affinity} Companion`,
    rarityLabel: RARITY_LABELS[creature.tier],
    flavorQuote: `${creature.name} supports your journey from the ${creature.habitat}.`,
    passiveName: 'Companion Spark',
    passiveText: `Placeholder card passive for ${creature.affinity.toLowerCase()} support.`,
    powerLabel: 'PWR —',
    statLine: `${creature.affinity} · ${creature.habitat}`,
    theme: {
      tier: creature.tier,
      shipZone,
      accent: SHIP_ZONE_ACCENTS[shipZone],
      template: `${creature.tier}-${shipZone}`,
    },
  };
}

export function getCreatureCardMetadata(creature: CreatureDefinition): CreatureCardMetadata {
  const shipZone = resolveShipZoneForCreature(creature);
  const curated = CURATED_CREATURE_CARD_METADATA[creature.id];
  if (!curated) {
    return buildFallbackCardMetadata(creature);
  }

  return {
    ...curated,
    theme: {
      tier: creature.tier,
      shipZone,
      accent: SHIP_ZONE_ACCENTS[shipZone],
      template: `${creature.tier}-${shipZone}`,
    },
  };
}

export const CREATURE_CARD_CATALOG: CreatureCardMetadata[] = CREATURE_CATALOG.map(getCreatureCardMetadata);
