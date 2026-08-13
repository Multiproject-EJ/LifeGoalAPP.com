import type { CreatureCollectionRuntimeEntry } from './islandRunGameStateStore';
import { appendGrantId } from './islandRunGrantIdUtils';

function mergeNumberArray(left: number[] | undefined, right: number[] | undefined): number[] {
  return Array.from(new Set([...(left ?? []), ...(right ?? [])])).sort((a, b) => a - b);
}

function mergeStringArray(left: string[] | undefined, right: string[] | undefined): string[] {
  return Array.from(new Set([...(left ?? []), ...(right ?? [])])).sort((a, b) => a.localeCompare(b));
}

function normalizeOptionalNumberArray(value: number[] | undefined): number[] | undefined {
  const normalized = mergeNumberArray(value, []);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalStringArray(value: string[] | undefined): string[] | undefined {
  const normalized = mergeStringArray(value, []);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCreatureEntry(entry: CreatureCollectionRuntimeEntry): CreatureCollectionRuntimeEntry {
  const claimedFormRewards = normalizeOptionalNumberArray(entry.claimedFormRewards);
  const grantIds = normalizeOptionalStringArray(entry.grantIds);
  return {
    creatureId: entry.creatureId,
    copies: entry.copies,
    firstCollectedAtMs: entry.firstCollectedAtMs,
    lastCollectedAtMs: entry.lastCollectedAtMs,
    lastCollectedIslandNumber: entry.lastCollectedIslandNumber,
    bondXp: entry.bondXp,
    bondLevel: entry.bondLevel,
    lastFedAtMs: entry.lastFedAtMs,
    claimedBondMilestones: mergeNumberArray(entry.claimedBondMilestones, []),
    ...(typeof entry.formLevel === 'number' ? { formLevel: entry.formLevel } : {}),
    ...(claimedFormRewards ? { claimedFormRewards } : {}),
    ...(grantIds ? { grantIds } : {}),
  };
}

/**
 * Merges the canonical runtime collection with the legacy migration fallback
 * without dropping runtime-only audit fields such as `grantIds`.
 *
 * The result is deterministic so renderer hydration can compare it without
 * creating a write loop when optional empty arrays are present on only one side.
 */
export function mergeCreatureRuntimeCollections(
  primary: CreatureCollectionRuntimeEntry[],
  fallback: CreatureCollectionRuntimeEntry[],
): CreatureCollectionRuntimeEntry[] {
  const byId = new Map<string, CreatureCollectionRuntimeEntry>();
  [...fallback, ...primary].forEach((rawEntry) => {
    const entry = normalizeCreatureEntry(rawEntry);
    const existing = byId.get(entry.creatureId);
    if (!existing) {
      byId.set(entry.creatureId, entry);
      return;
    }
    const latest = entry.lastCollectedAtMs >= existing.lastCollectedAtMs ? entry : existing;
    const claimedFormRewards = normalizeOptionalNumberArray(
      mergeNumberArray(existing.claimedFormRewards, entry.claimedFormRewards),
    );
    const grantIds = normalizeOptionalStringArray(mergeStringArray(existing.grantIds, entry.grantIds));
    byId.set(entry.creatureId, normalizeCreatureEntry({
      creatureId: entry.creatureId,
      copies: Math.max(existing.copies, entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber: latest.lastCollectedIslandNumber,
      bondXp: Math.max(existing.bondXp, entry.bondXp),
      bondLevel: Math.max(existing.bondLevel, entry.bondLevel),
      lastFedAtMs: Math.max(existing.lastFedAtMs ?? 0, entry.lastFedAtMs ?? 0) || null,
      claimedBondMilestones: mergeNumberArray(existing.claimedBondMilestones, entry.claimedBondMilestones),
      ...(typeof existing.formLevel === 'number' || typeof entry.formLevel === 'number'
        ? { formLevel: Math.max(existing.formLevel ?? 1, entry.formLevel ?? 1) }
        : {}),
      ...(claimedFormRewards ? { claimedFormRewards } : {}),
      ...(grantIds ? { grantIds } : {}),
    }));
  });

  return Array.from(byId.values()).sort((a, b) =>
    b.lastCollectedAtMs - a.lastCollectedAtMs || a.creatureId.localeCompare(b.creatureId));
}

export function areCreatureRuntimeCollectionsEqual(
  left: CreatureCollectionRuntimeEntry[],
  right: CreatureCollectionRuntimeEntry[],
): boolean {
  return JSON.stringify(mergeCreatureRuntimeCollections(left, []))
    === JSON.stringify(mergeCreatureRuntimeCollections(right, []));
}

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
