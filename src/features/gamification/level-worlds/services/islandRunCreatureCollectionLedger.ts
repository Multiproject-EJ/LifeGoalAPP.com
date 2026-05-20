import type { CreatureCollectionRuntimeEntry } from './islandRunGameStateStore';
import { appendGrantId } from './islandRunGrantIdUtils';

export function addCreatureToRuntimeCollection(options: {
  collection: CreatureCollectionRuntimeEntry[];
  creatureId: string;
  islandNumber: number;
  collectedAtMs: number;
  grantId?: string;
}): CreatureCollectionRuntimeEntry[] {
  const { collection, creatureId, islandNumber, collectedAtMs, grantId } = options;
  const normalizedGrantId = typeof grantId === 'string' && grantId.trim().length > 0
    ? grantId.trim()
    : null;
  const existing = collection.find((entry) => entry.creatureId === creatureId);
  if (existing) {
    return collection.map((entry) => entry.creatureId === creatureId
      ? {
          ...entry,
          copies: entry.copies + 1,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
          ...(normalizedGrantId
            ? { grantIds: appendGrantId(entry.grantIds, normalizedGrantId) }
            : {}),
        }
      : entry);
  }

  return [
    {
      creatureId,
      copies: 1,
      firstCollectedAtMs: collectedAtMs,
      lastCollectedAtMs: collectedAtMs,
      lastCollectedIslandNumber: islandNumber,
      bondXp: 0,
      bondLevel: 1,
      lastFedAtMs: null,
      claimedBondMilestones: [],
      ...(normalizedGrantId ? { grantIds: [normalizedGrantId] } : {}),
    },
    ...collection,
  ];
}
