import type { EggTier } from './eggService';

/**
 * Canonical v2 card rarity keyed to egg-tier rarity taxonomy.
 *
 * NOTE: This is a type-only contract. No runtime catalog migration is performed
 * in this slice.
 */
export type CreatureCardV2Rarity = EggTier;

/**
 * Future-facing edition bucket for visual/lore variants.
 */
export type CreatureCardEditionType = 'base' | 'event' | 'seasonal' | 'anniversary' | 'promo';

/**
 * Optional ability kind for richer full-card formatting.
 */
export type CreatureCardAbilityKind = 'move' | 'skill' | 'aura' | 'utility';

/**
 * Front-of-card variant art overrides. Keys are manifest-oriented, not direct URLs.
 */
export interface CreatureCardV2VariantArtOverrides {
  artKey?: string;
  frameKey?: string;
  backgroundKey?: string;
  badgeKey?: string;
}

/**
 * Variant text overrides to support limited editions without duplicating base records.
 */
export interface CreatureCardV2VariantTextOverrides {
  flavorQuote?: string;
  passiveName?: string;
  passiveDescription?: string;
}

/**
 * Availability window/source metadata for variants.
 */
export interface CreatureCardV2VariantAvailability {
  startAtIso?: string;
  endAtIso?: string;
  sourceLabel?: string;
}

/**
 * Overlay variant contract for stage/event/edition customization.
 */
export interface CreatureCardV2VariantRecord {
  variantId: string;
  editionType: CreatureCardEditionType;
  stageKey?: string;
  artOverrides?: CreatureCardV2VariantArtOverrides;
  textOverrides?: CreatureCardV2VariantTextOverrides;
  availability?: CreatureCardV2VariantAvailability;
}

export interface CreatureCardV2Identity {
  dexNumber?: number;
  displayName: string;
  rarity: CreatureCardV2Rarity;
  classLabel?: string;
  affinityLabel: string;
  typeIconKey?: string;
}

export interface CreatureCardV2FrontSimple {
  title?: string;
  subtitle?: string;
  rarityBadgeMode?: 'stars' | 'label';
}

export interface CreatureCardV2FrontFullHeader {
  creatureNumberLabel?: string;
  rarityLabel: string;
  classLabel?: string;
  affinityLabel: string;
}

export interface CreatureCardV2FrontFullArt {
  artKey?: string;
  frameKey?: string;
  backgroundKey?: string;
  stageKey?: string;
}

export interface CreatureCardV2PassiveAbility {
  name: string;
  description: string;
}

export interface CreatureCardV2Ability {
  id: string;
  name: string;
  description: string;
  valueBadge?: string;
  kind?: CreatureCardAbilityKind;
}

export interface CreatureCardV2TagSet {
  strengths?: string[];
  weaknesses?: string[];
}

export interface CreatureCardV2Flavor {
  quote?: string;
}

export interface CreatureCardV2FrontFull {
  header: CreatureCardV2FrontFullHeader;
  art: CreatureCardV2FrontFullArt;
  passive?: CreatureCardV2PassiveAbility;
  abilities?: CreatureCardV2Ability[];
  tags?: CreatureCardV2TagSet;
  flavor?: CreatureCardV2Flavor;
}

export interface CreatureCardV2EventHistoryEntry {
  eventId: string;
  label: string;
  note?: string;
  seasonKey?: string;
}

export interface CreatureCardV2Backside {
  originLore?: string;
  unlockSource?: string;
  favoriteFoods?: string[];
  habitatStory?: string;
  synergyTags?: string[];
  eventHistory?: CreatureCardV2EventHistoryEntry[];
  stageEvolutionNotes?: string[];
}

/**
 * Type-only v2 metadata record for collectible creature cards.
 */
export interface CreatureCardV2Record {
  creatureId: string;
  version: 2;
  identity: CreatureCardV2Identity;
  frontSimple: CreatureCardV2FrontSimple;
  frontFull: CreatureCardV2FrontFull;
  backside?: CreatureCardV2Backside;
  variants?: CreatureCardV2VariantRecord[];
}

/**
 * Simple/front-lite view contract for sanctuary grid and compact surfaces.
 *
 * NOTE: Collection and state fields are runtime-derived projections (view-only),
 * not static catalog metadata.
 */
export interface CreatureCardSimpleView {
  creatureId: string;
  displayName: string;
  rarity: CreatureCardV2Rarity;
  rarityLabel: string;
  starLabel: string;
  image: {
    cutoutSrc: string;
    silhouetteSrc: string;
    fallbackEmoji: string;
  };
  state: {
    discovered: boolean;
    locked: boolean;
    active: boolean;
  };
  collection: {
    ownedCopies: number;
    progressLabel: string;
  };
}

/**
 * Full front-card detail view contract for premium card presentation.
 */
export interface CreatureCardFullView {
  creatureId: string;
  header: {
    displayName: string;
    creatureNumberLabel?: string;
    typeIconSrc?: string;
    rarityLabel: string;
    classLabel?: string;
    affinityLabel: string;
    progressLabel: string;
  };
  art: {
    heroSrc: string;
    frameSrc?: string;
    backgroundSrc?: string;
  };
  passive?: CreatureCardV2PassiveAbility;
  abilities: Array<{
    name: string;
    description: string;
    valueBadge?: string;
  }>;
  tags: {
    strengths: string[];
    weaknesses: string[];
  };
  flavorQuote?: string;
}

/**
 * Backside/deep-profile view contract.
 *
 * NOTE: Bond fields are runtime-derived projections.
 */
export interface CreatureCardBackView {
  creatureId: string;
  originLore?: string;
  unlockSource?: string;
  favoriteFoods: string[];
  bond: {
    currentLevel: number;
    currentXp: number;
    nextMilestoneLevel?: number;
    notes?: string[];
  };
  habitatStory?: string;
  synergyTags: string[];
  eventHistory: Array<{
    label: string;
    note?: string;
  }>;
  stageEvolutionNotes: string[];
}
