import type { CreatureDefinition } from './creatureCatalog';
import type {
  CreatureCollectionRuntimeEntry,
  EggRewardInventoryEntry,
  IslandRunGameStateRecord,
  PerIslandEggEntry,
} from './islandRunGameStateStore';

export interface CreatureSanctuaryCard {
  creatureId: string;
  name: string;
  tier: CreatureDefinition['tier'];
  rarityLabel: string;
  starLabel: string;
  starCount: number;
  habitat: string;
  affinity: string;
  shipZone: CreatureDefinition['shipZone'];
  discovered: boolean;
  copies: number;
  bondLevel: number | null;
  bondXp: number;
  lastCollectedIslandNumber: number | null;
  isActiveCompanion: boolean;
}

export interface CreatureSanctuaryEggSummary {
  activeEggs: number;
  readyEggs: number;
  dormantEggs: number;
  collectedEggs: number;
  soldEggs: number;
  rewardEggsUnopened: number;
  rewardEggsOpened: number;
}

export interface CreatureSanctuaryGallerySummary {
  totalCreatures: number;
  discoveredCreatures: number;
  lockedCreatures: number;
  commonDiscovered: number;
  rareDiscovered: number;
  mythicDiscovered: number;
  activeCompanion: CreatureSanctuaryCard | null;
  eggSummary: CreatureSanctuaryEggSummary;
}

export interface CreatureSanctuaryGalleryModel {
  summary: CreatureSanctuaryGallerySummary;
  cards: CreatureSanctuaryCard[];
}

const RARITY_LABELS: Record<CreatureDefinition['tier'], string> = {
  common: 'Common',
  rare: 'Rare',
  mythic: 'Mythic',
};

const RARITY_STARS: Record<CreatureDefinition['tier'], number> = {
  common: 1,
  rare: 2,
  mythic: 3,
};

function sanitizePositiveInteger(value: number | undefined | null, fallback = 0): number {
  if (!Number.isFinite(value) || value === null || value === undefined) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function getRarityStarLabel(tier: CreatureDefinition['tier']): string {
  return '★'.repeat(RARITY_STARS[tier]);
}

function summarizeEggs(
  perIslandEggs: Record<string, PerIslandEggEntry> | undefined,
  eggRewardInventory: EggRewardInventoryEntry[] | undefined,
): CreatureSanctuaryEggSummary {
  const eggEntries = Object.values(perIslandEggs ?? {});
  const activeEggs = eggEntries.filter((egg) => egg.status === 'incubating').length;
  const readyEggs = eggEntries.filter((egg) => egg.status === 'ready').length;
  const dormantEggs = eggEntries.filter((egg) => egg.location === 'dormant').length;
  const collectedEggs = eggEntries.filter((egg) => egg.status === 'collected').length;
  const soldEggs = eggEntries.filter((egg) => egg.status === 'sold').length;
  const rewardEggsUnopened = (eggRewardInventory ?? []).filter((egg) => egg.status === 'unopened').length;
  const rewardEggsOpened = (eggRewardInventory ?? []).filter((egg) => egg.status === 'opened').length;

  return {
    activeEggs,
    readyEggs,
    dormantEggs,
    collectedEggs,
    soldEggs,
    rewardEggsUnopened,
    rewardEggsOpened,
  };
}

function indexCollectionEntries(
  entries: CreatureCollectionRuntimeEntry[],
): Map<string, CreatureCollectionRuntimeEntry> {
  return entries.reduce((index, entry) => {
    const existing = index.get(entry.creatureId);
    if (!existing) {
      index.set(entry.creatureId, entry);
      return index;
    }

    index.set(entry.creatureId, {
      ...existing,
      copies: sanitizePositiveInteger(existing.copies) + sanitizePositiveInteger(entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber: Math.max(
        sanitizePositiveInteger(existing.lastCollectedIslandNumber),
        sanitizePositiveInteger(entry.lastCollectedIslandNumber),
      ),
      bondXp: Math.max(sanitizePositiveInteger(existing.bondXp), sanitizePositiveInteger(entry.bondXp)),
      bondLevel: Math.max(sanitizePositiveInteger(existing.bondLevel, 1), sanitizePositiveInteger(entry.bondLevel, 1)),
      lastFedAtMs: existing.lastFedAtMs ?? entry.lastFedAtMs,
      claimedBondMilestones: Array.from(
        new Set([...existing.claimedBondMilestones, ...entry.claimedBondMilestones]),
      ).sort((a, b) => a - b),
    });
    return index;
  }, new Map<string, CreatureCollectionRuntimeEntry>());
}

export function buildCreatureSanctuaryGalleryModel(
  state: IslandRunGameStateRecord,
  catalog: CreatureDefinition[],
): CreatureSanctuaryGalleryModel {
  const collectionById = indexCollectionEntries(state.creatureCollection ?? []);
  const cards = catalog.map((creature) => {
    const collectionEntry = collectionById.get(creature.id) ?? null;
    const copies = sanitizePositiveInteger(collectionEntry?.copies);
    const discovered = copies > 0;
    const starCount = RARITY_STARS[creature.tier];

    return {
      creatureId: creature.id,
      name: creature.name,
      tier: creature.tier,
      rarityLabel: RARITY_LABELS[creature.tier],
      starLabel: getRarityStarLabel(creature.tier),
      starCount,
      habitat: creature.habitat,
      affinity: creature.affinity,
      shipZone: creature.shipZone,
      discovered,
      copies,
      bondLevel: discovered ? sanitizePositiveInteger(collectionEntry?.bondLevel, 1) : null,
      bondXp: discovered ? sanitizePositiveInteger(collectionEntry?.bondXp) : 0,
      lastCollectedIslandNumber: discovered
        ? sanitizePositiveInteger(collectionEntry?.lastCollectedIslandNumber, 1)
        : null,
      isActiveCompanion: discovered && state.activeCompanionId === creature.id,
    };
  });

  const discoveredCards = cards.filter((card) => card.discovered);
  const activeCompanion = cards.find((card) => card.isActiveCompanion) ?? null;

  return {
    summary: {
      totalCreatures: cards.length,
      discoveredCreatures: discoveredCards.length,
      lockedCreatures: cards.length - discoveredCards.length,
      commonDiscovered: discoveredCards.filter((card) => card.tier === 'common').length,
      rareDiscovered: discoveredCards.filter((card) => card.tier === 'rare').length,
      mythicDiscovered: discoveredCards.filter((card) => card.tier === 'mythic').length,
      activeCompanion,
      eggSummary: summarizeEggs(state.perIslandEggs, state.eggRewardInventory),
    },
    cards,
  };
}
