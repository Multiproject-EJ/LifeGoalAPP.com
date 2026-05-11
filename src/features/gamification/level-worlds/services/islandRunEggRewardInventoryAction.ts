import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  readIslandRunGameStateRecord,
  type CreatureCollectionRuntimeEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { selectCreatureForEgg } from './creatureCatalog';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState } from './islandRunStateStore';

export interface OpenEggRewardInventoryEntryOptions {
  session: Session;
  client: SupabaseClient | null;
  eggRewardId: string;
  nowMs?: number;
  triggerSource?: string;
}

export interface OpenEggRewardInventoryEntryResult {
  status: 'opened' | 'already_opened' | 'not_found';
  record: IslandRunGameStateRecord;
  eggRewardId: string;
  openedCreatureId: string | null;
}

function normalizeNowMs(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function addCreatureToCollection(options: {
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

export function openEggRewardInventoryEntry(
  options: OpenEggRewardInventoryEntryOptions,
): Promise<OpenEggRewardInventoryEntryResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, eggRewardId, triggerSource } = options;
    const normalizedEggRewardId = eggRewardId.trim();
    const current = readIslandRunGameStateRecord(session);
    const inventoryIndex = current.eggRewardInventory.findIndex((entry) => entry.eggRewardId === normalizedEggRewardId);
    if (inventoryIndex < 0) {
      return {
        status: 'not_found',
        record: current,
        eggRewardId: normalizedEggRewardId,
        openedCreatureId: null,
      };
    }

    const inventoryEntry = current.eggRewardInventory[inventoryIndex];
    if (inventoryEntry.status === 'opened') {
      return {
        status: 'already_opened',
        record: current,
        eggRewardId: normalizedEggRewardId,
        openedCreatureId: inventoryEntry.openedCreatureId ?? null,
      };
    }

    const openedAtMs = normalizeNowMs(options.nowMs);
    const creature = selectCreatureForEgg({
      eggTier: inventoryEntry.eggTier,
      seed: inventoryEntry.eggSeed,
      islandNumber: inventoryEntry.targetIslandNumber,
    });
    const nextEggRewardInventory = current.eggRewardInventory.map((entry, index) => index === inventoryIndex
      ? {
          ...entry,
          status: 'opened' as const,
          openedAtMs,
          openedCreatureId: creature.id,
        }
      : entry);
    const nextCreatureCollection = addCreatureToCollection({
      collection: current.creatureCollection,
      creatureId: creature.id,
      islandNumber: inventoryEntry.targetIslandNumber,
      collectedAtMs: openedAtMs,
    });
    const next: IslandRunGameStateRecord = {
      ...current,
      eggRewardInventory: nextEggRewardInventory,
      creatureCollection: nextCreatureCollection,
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'open_egg_reward_inventory_entry',
    });

    return {
      status: 'opened',
      record: next,
      eggRewardId: normalizedEggRewardId,
      openedCreatureId: creature.id,
    };
  });
}
