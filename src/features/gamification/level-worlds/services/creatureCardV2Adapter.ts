import { CREATURE_CATALOG, type CreatureDefinition } from './creatureCatalog';
import { getCreatureCardMetadata, type CreatureCardMetadata } from './creatureCardCatalog';
import { resolveCreatureArtManifest } from './creatureImageManifest';
import type {
  CreatureCardBackView,
  CreatureCardFullView,
  CreatureCardSimpleView,
  CreatureCardV2Record,
} from './creatureCardV2Types';

export interface CreatureCardCollectionProgressInput {
  discovered?: boolean;
  active?: boolean;
  ownedCopies?: number;
  progressLabel?: string;
}

function resolveProgressLabel(progress?: CreatureCardCollectionProgressInput): string {
  if (progress?.progressLabel && progress.progressLabel.trim().length > 0) {
    return progress.progressLabel.trim();
  }
  const copies = Math.max(0, progress?.ownedCopies ?? 0);
  return `${copies} owned`;
}

export function buildCreatureCardSimpleView(
  creature: CreatureDefinition,
  metadata: CreatureCardMetadata = getCreatureCardMetadata(creature),
  progress?: CreatureCardCollectionProgressInput,
): CreatureCardSimpleView {
  const art = resolveCreatureArtManifest(creature);
  const ownedCopies = Math.max(0, progress?.ownedCopies ?? 0);
  const discovered = progress?.discovered ?? ownedCopies > 0;

  return {
    creatureId: creature.id,
    displayName: metadata.displayName || creature.name,
    rarity: creature.tier,
    rarityLabel: metadata.rarityLabel,
    starLabel: metadata.rarityLabel,
    image: {
      cutoutSrc: art.cutoutSrc,
      silhouetteSrc: art.silhouetteSrc,
      fallbackEmoji: art.emojiFallback,
    },
    state: {
      discovered,
      locked: !discovered,
      active: progress?.active ?? false,
    },
    collection: {
      ownedCopies,
      progressLabel: resolveProgressLabel(progress),
    },
  };
}

export function buildCreatureCardFullView(
  creature: CreatureDefinition,
  metadata: CreatureCardMetadata = getCreatureCardMetadata(creature),
  progress?: CreatureCardCollectionProgressInput,
): CreatureCardFullView {
  const art = resolveCreatureArtManifest(creature);

  return {
    creatureId: creature.id,
    header: {
      displayName: metadata.displayName || creature.name,
      creatureNumberLabel: undefined,
      typeIconSrc: undefined,
      rarityLabel: metadata.rarityLabel,
      classLabel: creature.habitat,
      affinityLabel: creature.affinity,
      progressLabel: resolveProgressLabel(progress),
    },
    art: {
      heroSrc: art.cutoutSrc,
      frameSrc: art.frameSrc,
      backgroundSrc: art.backgroundSrc,
    },
    passive: {
      name: metadata.passiveName,
      description: metadata.passiveText,
    },
    abilities: [],
    tags: {
      strengths: [],
      weaknesses: [],
    },
    flavorQuote: metadata.flavorQuote,
  };
}

export function buildCreatureCardBackView(
  creature: CreatureDefinition,
  _metadata: CreatureCardMetadata = getCreatureCardMetadata(creature),
): CreatureCardBackView {
  return {
    creatureId: creature.id,
    originLore: undefined,
    unlockSource: undefined,
    favoriteFoods: [],
    bond: {
      currentLevel: 1,
      currentXp: 0,
      nextMilestoneLevel: undefined,
      notes: [],
    },
    habitatStory: undefined,
    synergyTags: [],
    eventHistory: [],
    stageEvolutionNotes: [],
  };
}

export function buildCreatureCardV2RecordFromExistingCatalog(
  creature: CreatureDefinition,
  metadata: CreatureCardMetadata = getCreatureCardMetadata(creature),
): CreatureCardV2Record {
  return {
    creatureId: creature.id,
    version: 2,
    identity: {
      dexNumber: undefined,
      displayName: metadata.displayName || creature.name,
      rarity: creature.tier,
      classLabel: creature.habitat,
      affinityLabel: creature.affinity,
      typeIconKey: undefined,
    },
    frontSimple: {
      title: metadata.shortTitle,
      subtitle: metadata.shortTitle,
      rarityBadgeMode: 'label',
    },
    frontFull: {
      header: {
        creatureNumberLabel: undefined,
        rarityLabel: metadata.rarityLabel,
        classLabel: creature.habitat,
        affinityLabel: creature.affinity,
      },
      art: {
        artKey: creature.imageKey,
      },
      passive: {
        name: metadata.passiveName,
        description: metadata.passiveText,
      },
      abilities: [],
      tags: {
        strengths: [],
        weaknesses: [],
      },
      flavor: {
        quote: metadata.flavorQuote,
      },
    },
    backside: {
      favoriteFoods: [],
      synergyTags: [],
      eventHistory: [],
      stageEvolutionNotes: [],
    },
    variants: [],
  };
}

export function buildCreatureCardV2CatalogRecordsFromExistingCatalog(): CreatureCardV2Record[] {
  return CREATURE_CATALOG.map((creature) => buildCreatureCardV2RecordFromExistingCatalog(creature));
}
