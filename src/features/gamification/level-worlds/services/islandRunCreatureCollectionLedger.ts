import type { CreatureCollectionRuntimeEntry } from './islandRunGameStateStore';

export function addCreatureToRuntimeCollection(options: {
  collection: CreatureCollectionRuntimeEntry[];
  creatureId: string;
  islandNumber: number;
  collectedAtMs: number;
}): CreatureCollectionRuntimeEntry[] {
  const { collection, creatureId, islandNumber, collectedAtMs } = options;
  const existing = collection.find((entry) => entry.creatureId === creatureId);
  if (existing) {
    return collection.map((entry) => entry.creatureId === creatureId
      ? {
          ...entry,
          copies: entry.copies + 1,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
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
    },
    ...collection,
  ];
}
