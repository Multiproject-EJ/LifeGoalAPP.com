import type { PerIslandEggsLedger } from './islandRunGameStateStore';
import { getCreatureById, selectCreatureForEgg, type CreatureDefinition } from './creatureCatalog';

export interface CreatureCollectionEntry {
  creatureId: string;
  copies: number;
  firstCollectedAtMs: number;
  lastCollectedAtMs: number;
  lastCollectedIslandNumber: number;
  bondXp: number;
  bondLevel: number;
  lastFedAtMs: number | null;
  claimedBondMilestones: number[];
}

export const CREATURE_BOND_XP_PER_LEVEL = 3;
export const CREATURE_BOND_MILESTONE_LEVELS = [3, 5, 8, 10] as const;

function getStorageKey(userId: string): string {
  return `island_run_creature_collection_${userId}`;
}

function getActiveCompanionStorageKey(userId: string): string {
  return `island_run_active_companion_${userId}`;
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
  const bondXp = typeof value.bondXp === 'number' && Number.isFinite(value.bondXp)
    ? Math.max(0, Math.floor(value.bondXp))
    : 0;
  const derivedBondLevel = Math.floor(bondXp / CREATURE_BOND_XP_PER_LEVEL) + 1;
  const bondLevel = typeof value.bondLevel === 'number' && Number.isFinite(value.bondLevel)
    ? Math.max(1, Math.floor(value.bondLevel), derivedBondLevel)
    : derivedBondLevel;
  const lastFedAtMs = typeof value.lastFedAtMs === 'number' && Number.isFinite(value.lastFedAtMs)
    ? value.lastFedAtMs
    : null;
  const claimedBondMilestones = Array.isArray(value.claimedBondMilestones)
    ? Array.from(new Set(value.claimedBondMilestones
      .filter((milestone): milestone is number => typeof milestone === 'number' && Number.isFinite(milestone))
      .map((milestone) => Math.max(1, Math.floor(milestone)))))
        .sort((a, b) => a - b)
    : [];
  return { creatureId: value.creatureId, copies, firstCollectedAtMs, lastCollectedAtMs, lastCollectedIslandNumber, bondXp, bondLevel, lastFedAtMs, claimedBondMilestones };
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
          bondXp: entry.bondXp,
          bondLevel: entry.bondLevel,
          lastFedAtMs: entry.lastFedAtMs,
          claimedBondMilestones: entry.claimedBondMilestones,
        }
      : entry)
    : [
        {
          creatureId: creature.id,
          copies: 1,
          firstCollectedAtMs: collectedAtMs,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
          bondXp: 0,
          bondLevel: 1,
          lastFedAtMs: null,
          claimedBondMilestones: [],
        },
        ...current,
      ];
  return writeCreatureCollection(userId, next);
}


export function feedCreatureForUser(options: {
  userId: string;
  creatureId: string;
  fedAtMs: number;
  xpGain?: number;
}): CreatureCollectionEntry[] {
  const { userId, creatureId, fedAtMs, xpGain = 1 } = options;
  const safeXpGain = Math.max(1, Math.floor(xpGain));
  const current = fetchCreatureCollection(userId);
  const next = current.map((entry) => {
    if (entry.creatureId !== creatureId) return entry;
    const bondXp = entry.bondXp + safeXpGain;
    return {
      ...entry,
      bondXp,
      bondLevel: Math.floor(bondXp / CREATURE_BOND_XP_PER_LEVEL) + 1,
      lastFedAtMs: fedAtMs,
    };
  });
  return writeCreatureCollection(userId, next);
}


export function getUnclaimedBondMilestones(entry: Pick<CreatureCollectionEntry, 'bondLevel' | 'claimedBondMilestones'>): number[] {
  const claimed = new Set(entry.claimedBondMilestones);
  return CREATURE_BOND_MILESTONE_LEVELS.filter((milestone) => milestone <= entry.bondLevel && !claimed.has(milestone));
}

export function claimCreatureBondMilestoneForUser(options: {
  userId: string;
  creatureId: string;
  milestoneLevel: number;
}): CreatureCollectionEntry[] {
  const { userId, creatureId, milestoneLevel } = options;
  const current = fetchCreatureCollection(userId);
  const next = current.map((entry) => {
    if (entry.creatureId !== creatureId) return entry;
    if (milestoneLevel > entry.bondLevel || entry.claimedBondMilestones.includes(milestoneLevel)) {
      return entry;
    }
    return {
      ...entry,
      claimedBondMilestones: [...entry.claimedBondMilestones, milestoneLevel].sort((a, b) => a - b),
    };
  });
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
    if (entry.status !== 'collected') return;
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
      bondXp: 0,
      bondLevel: 1,
      lastFedAtMs: null,
      claimedBondMilestones: [],
    });
    didChange = true;
  });

  const collection = Array.from(byCreatureId.values()).sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
  if (didChange) {
    writeCreatureCollection(userId, collection);
  }
  return { didChange, collection };
}

export function fetchActiveCompanionId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(getActiveCompanionStorageKey(userId));
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function saveActiveCompanionId(userId: string, creatureId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getActiveCompanionStorageKey(userId);
    if (!creatureId) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, creatureId);
  } catch {
    // ignore storage failures for now
  }
}

/**
 * Clears the persisted creature collection AND active companion for the
 * given user. Used by {@link resetIslandRunProgress} so a fresh-start run
 * doesn't carry over animals collected on later islands.
 *
 * The runtime-state record's own `creatureCollection` field is reset
 * separately by `buildFreshIslandRunRecord`; this function clears the
 * parallel localStorage source-of-truth that the sanctuary UI reads from
 * (`island_run_creature_collection_${userId}`).
 */
export function clearCreatureCollectionForUser(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStorageKey(userId));
    window.localStorage.removeItem(getActiveCompanionStorageKey(userId));
  } catch {
    // ignore storage failures for now
  }
}
