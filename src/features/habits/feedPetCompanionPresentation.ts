import type { IslandRunGameStateRecord } from '../gamification/level-worlds/services/islandRunGameStateStore';
import { getCreatureById, type CreatureDefinition } from '../gamification/level-worlds/services/creatureCatalog';
import { resolveCreatureArtManifest } from '../gamification/level-worlds/services/creatureImageManifest';

export interface FeedPetCompanionPresentation {
  creatureId: string;
  name: string;
  affinity: string;
  tier: CreatureDefinition['tier'];
  rarityLabel: string;
  bondLevel: number;
  bondXp: number;
  cutoutSrc: string;
  cutoutPngSrc: string;
  silhouetteSrc: string;
  emojiFallback: string;
}

function formatRarityLabel(tier: CreatureDefinition['tier']): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Resolves Feed Pet presentation from canonical Island Run state.
 *
 * A selected id is only presented when the creature is both catalogued and
 * owned. Stale, unknown, or unowned ids safely fall back to the generic
 * sanctuary presentation in the UI.
 */
export function resolveFeedPetCompanionPresentation(
  record: Pick<IslandRunGameStateRecord, 'activeCompanionId' | 'creatureCollection'>,
): FeedPetCompanionPresentation | null {
  const activeCompanionId = typeof record.activeCompanionId === 'string'
    ? record.activeCompanionId.trim()
    : '';
  if (!activeCompanionId) return null;

  const collectionEntry = record.creatureCollection.find((entry) =>
    entry.creatureId === activeCompanionId
    && Number.isFinite(entry.copies)
    && entry.copies > 0,
  );
  if (!collectionEntry) return null;

  const creature = getCreatureById(activeCompanionId);
  if (!creature) return null;

  const art = resolveCreatureArtManifest(creature);
  return {
    creatureId: creature.id,
    name: creature.name,
    affinity: creature.affinity,
    tier: creature.tier,
    rarityLabel: formatRarityLabel(creature.tier),
    bondLevel: Math.max(1, Math.floor(collectionEntry.bondLevel || 1)),
    bondXp: Math.max(0, Math.floor(collectionEntry.bondXp || 0)),
    cutoutSrc: art.cutoutSrc,
    cutoutPngSrc: art.cutoutPngSrc,
    silhouetteSrc: art.silhouetteSrc,
    emojiFallback: art.emojiFallback,
  };
}
