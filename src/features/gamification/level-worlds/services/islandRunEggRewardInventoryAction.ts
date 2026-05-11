/**
 * islandRunEggRewardInventoryAction — canonical actions for Treasure Egg
 * vouchers stored in eggRewardInventory.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { selectCreatureForEgg } from './creatureCatalog';
import { withIslandRunActionLock } from './islandRunActionMutex';
import type {
  CreatureCollectionRuntimeEntry,
  EggRewardInventoryEntry,
  IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
} from './islandRunStateStore';

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
  eggRewardInventoryEntry: EggRewardInventoryEntry | null;
  openedCreatureId: string | null;
}

function addCreatureCollectionEntry(options: {
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

export async function openEggRewardInventoryEntry(
  options: OpenEggRewardInventoryEntryOptions,
): Promise<OpenEggRewardInventoryEntryResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, eggRewardId, nowMs = Date.now(), triggerSource } = options;
    const current = getIslandRunStateSnapshot(session);
    const entry = current.eggRewardInventory.find((candidate) => candidate.eggRewardId === eggRewardId) ?? null;
    if (!entry) {
      return {
        status: 'not_found',
        record: current,
        eggRewardInventoryEntry: null,
        openedCreatureId: null,
      };
    }

    if (entry.status === 'opened') {
      return {
        status: 'already_opened',
        record: current,
        eggRewardInventoryEntry: entry,
        openedCreatureId: entry.openedCreatureId ?? null,
      };
    }

    const openedAtMs = Math.max(0, Math.floor(nowMs));
    const creature = selectCreatureForEgg({
      eggTier: entry.eggTier,
      seed: entry.eggSeed,
      islandNumber: entry.targetIslandNumber,
    });
    const nextEntry: EggRewardInventoryEntry = {
      ...entry,
      status: 'opened',
      openedAtMs,
      openedCreatureId: creature.id,
    };
    const next: IslandRunGameStateRecord = {
      ...current,
      eggRewardInventory: current.eggRewardInventory.map((candidate) => (
        candidate.eggRewardId === eggRewardId ? nextEntry : candidate
      )),
      creatureCollection: addCreatureCollectionEntry({
        collection: current.creatureCollection,
        creatureId: creature.id,
        islandNumber: entry.targetIslandNumber,
        collectedAtMs: openedAtMs,
      }),
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
      eggRewardInventoryEntry: nextEntry,
      openedCreatureId: creature.id,
    };
  });
}
