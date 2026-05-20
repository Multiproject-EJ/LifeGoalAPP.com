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
  'common-sproutling': {
    creatureId: 'common-sproutling',
    displayName: 'Sproutling',
    shortTitle: 'Tiny Habit Seed',
    rarityLabel: 'Common',
    flavorQuote: 'Small roots hold big dreams.',
    passiveName: 'Small Roots',
    passiveText: 'Offers a gentle routine prompt or first-step reminder.',
    powerLabel: 'PWR 12',
    statLine: 'Conscientiousness · low_consistency',
  },
  'common-pebble-spirit': {
    creatureId: 'common-pebble-spirit',
    displayName: 'Pebble Spirit',
    shortTitle: 'Grounded Patience',
    rarityLabel: 'Common',
    flavorQuote: 'Pause. Then choose.',
    passiveName: 'Grounding Stone',
    passiveText: 'Supports a one-breath reset before stressful actions.',
    powerLabel: 'PWR 14',
    statLine: 'Stress Response · stress_fragility',
  },
  'common-mossling': {
    creatureId: 'common-mossling',
    displayName: 'Mossling',
    shortTitle: 'Gentle Recovery',
    rarityLabel: 'Common',
    flavorQuote: 'Growth can be quiet.',
    passiveName: 'Soft Recovery',
    passiveText: 'Offers a kind recovery prompt after a missed habit.',
    powerLabel: 'PWR 13',
    statLine: 'Self-kindness · low_confidence',
  },
  'common-glowtail': {
    creatureId: 'common-glowtail',
    displayName: 'Glowtail',
    shortTitle: 'Rhythm Guide',
    rarityLabel: 'Common',
    flavorQuote: 'One clear step is enough.',
    passiveName: 'Guiding Rhythm',
    passiveText: 'Highlights a simple next action when choices feel noisy.',
    powerLabel: 'PWR 15',
    statLine: 'Regulation Style · decision_confusion',
  },
  'rare-ember-sprout': {
    creatureId: 'rare-ember-sprout',
    displayName: 'Ember Sprout',
    shortTitle: 'Activation Spark',
    rarityLabel: 'Rare',
    flavorQuote: 'Start warm. Burn steady.',
    passiveName: 'Activation Spark',
    passiveText: 'Gives a small start-now nudge without demanding perfection.',
    powerLabel: 'PWR 27',
    statLine: 'Action Energy · low_momentum',
  },
  'rare-aurora-finch': {
    creatureId: 'rare-aurora-finch',
    displayName: 'Aurora Finch',
    shortTitle: 'Inspired Messenger',
    rarityLabel: 'Rare',
    flavorQuote: 'Sing the next horizon.',
    passiveName: 'Horizon Call',
    passiveText: 'Turns a big idea into a shareable intention.',
    powerLabel: 'PWR 29',
    statLine: 'Openness · low_momentum',
  },
  'rare-nebula-wisp': {
    creatureId: 'rare-nebula-wisp',
    displayName: 'Nebula Wisp',
    shortTitle: 'Uncertainty Explorer',
    rarityLabel: 'Rare',
    flavorQuote: 'Unknown does not mean unsafe.',
    passiveName: 'Unknown Map',
    passiveText: 'Reframes unclear choices as safe experiments.',
    powerLabel: 'PWR 31',
    statLine: 'Openness · decision_confusion',
  },
  'mythic-starhorn-seraph': {
    creatureId: 'mythic-starhorn-seraph',
    displayName: 'Starhorn Seraph',
    shortTitle: 'Oracle Guardian',
    rarityLabel: 'Mythic',
    flavorQuote: 'The pattern is kinder than the fear.',
    passiveName: 'Pattern Mercy',
    passiveText: 'Offers a reflective prompt that finds a kind pattern in uncertainty.',
    powerLabel: 'PWR 48',
    statLine: 'Cognitive Entry · decision_confusion',
  },
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
    powerLabel: creature.tier === 'mythic' ? 'PWR —' : creature.tier === 'rare' ? 'PWR —' : 'PWR —',
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
