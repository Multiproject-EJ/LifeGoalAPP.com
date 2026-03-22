import type { PerIslandEggsLedger } from './islandRunGameStateStore';
import { getCreatureById, selectCreatureForEgg, type CreatureDefinition } from './creatureCatalog';

export interface CreatureCollectionEntry {
  creatureId: string;
  copies: number;
  firstCollectedAtMs: number;
  lastCollectedAtMs: number;
  lastCollectedIslandNumber: number;
}

function getStorageKey(userId: string): string {
  return `island_run_creature_collection_${userId}`;
}

function normalizeCollectionEntry(value: Partial<CreatureCollectionEntry>): CreatureCollectionEntry | null {
  if (typeof value.creatureId !== 'string' || !value.creatureId) return null;
  const copies = typeof value.copies === 'number' && Number.isFinite(value.copies) ? Math.max(1, Math.floor(value.copies)) : 1;
  const firstCollectedAtMs = typeof value.firstCollectedAtMs === 'number' && Number.isFinite(value.firstCollectedAtMs)
    ? value.firstCollectedAtMs
    : Date.now();
  const lastCollectedAtMs = typeof value.lastCollectedAtMs === 'number' && Number.isFinite(value.lastCollectedAtMs)
    ? value.lastCollectedAtMs
    : firstCollectedAtMs;
  const lastCollectedIslandNumber = typeof value.lastCollectedIslandNumber === 'number' && Number.isFinite(value.lastCollectedIslandNumber)
    ? Math.max(1, Math.floor(value.lastCollectedIslandNumber))
    : 1;
  return { creatureId: value.creatureId, copies, firstCollectedAtMs, lastCollectedAtMs, lastCollectedIslandNumber };
}

export function fetchCreatureCollection(userId: string): CreatureCollectionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CreatureCollectionEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeCollectionEntry(entry))
      .filter((entry): entry is CreatureCollectionEntry => entry !== null);
  } catch {
    return [];
  }
}

function writeCreatureCollection(userId: string, collection: CreatureCollectionEntry[]): CreatureCollectionEntry[] {
  if (typeof window === 'undefined') return collection;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(collection));
  } catch {
    // ignore local persistence errors for now
  }
  return collection;
}

export function collectCreatureForUser(options: {
  userId: string;
  creature: CreatureDefinition;
  islandNumber: number;
  collectedAtMs: number;
}): CreatureCollectionEntry[] {
  const { userId, creature, islandNumber, collectedAtMs } = options;
  const current = fetchCreatureCollection(userId);
  const existing = current.find((entry) => entry.creatureId === creature.id);
  const next = existing
    ? current.map((entry) => entry.creatureId === creature.id
      ? {
          ...entry,
          copies: entry.copies + 1,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
        }
      : entry)
    : [
        {
          creatureId: creature.id,
          copies: 1,
          firstCollectedAtMs: collectedAtMs,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
        },
        ...current,
      ];
  return writeCreatureCollection(userId, next);
}

export function getCreatureManifestEntries(userId: string): Array<CreatureCollectionEntry & { creature: CreatureDefinition }> {
  return fetchCreatureCollection(userId)
    .map((entry) => {
      const creature = getCreatureById(entry.creatureId);
      if (!creature) return null;
      return { ...entry, creature };
    })
    .filter((entry): entry is CreatureCollectionEntry & { creature: CreatureDefinition } => entry !== null)
    .sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
}

export function migrateLegacyEggLedgerToCollection(options: {
  userId: string;
  perIslandEggs: PerIslandEggsLedger;
}): { didChange: boolean; collection: CreatureCollectionEntry[] } {
  const { userId, perIslandEggs } = options;
  const current = fetchCreatureCollection(userId);
  const byCreatureId = new Map(current.map((entry) => [entry.creatureId, entry]));
  let didChange = false;

  Object.entries(perIslandEggs ?? {}).forEach(([islandKey, entry]) => {
    if (entry.status !== 'collected' && entry.status !== 'animal_ready') return;
    const islandNumber = Math.max(1, Number(islandKey) || 1);
    const creature = selectCreatureForEgg({ eggTier: entry.tier, seed: entry.setAtMs, islandNumber });
    const collectedAtMs = entry.openedAt ?? entry.animalCollectedAtMs ?? entry.hatchAtMs;
    const existing = byCreatureId.get(creature.id);
    if (existing) return;
    byCreatureId.set(creature.id, {
      creatureId: creature.id,
      copies: 1,
      firstCollectedAtMs: collectedAtMs,
      lastCollectedAtMs: collectedAtMs,
      lastCollectedIslandNumber: islandNumber,
    });
    didChange = true;
  });

  const collection = Array.from(byCreatureId.values()).sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
  if (didChange) {
    writeCreatureCollection(userId, collection);
  }
  return { didChange, collection };
}
