import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { resolveIslandRunTravelState } from './islandRunStateActions';
import { resolveIslandRunCompletion } from './islandRunCompletion';
import {
  getExpansionIslandNumber,
  getExpansionPack,
  isExpansionPackId,
  resolveExpansionIsland,
  type ExpansionPackId,
  type ExpansionVoyageId,
} from './islandRunExpansionPacks';
import { applyVoyagePath, pickVoyagePathSnapshot } from './islandRunExpansionVoyage';

/**
 * Canonical expansion-pack actions. DEV ONLY until production ready: the UI
 * must gate every entry point on `isExpansionPacksEnabled`.
 */

interface VoyageActionContext {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
}

export type GrantExpansionPackResult = { status: 'ok' | 'already_owned' } | { status: 'unknown_pack' };

/** Dev grant (stands in for the future shop purchase / feature unlock). */
export function devGrantExpansionPack(options: VoyageActionContext & { packId: string }): Promise<GrantExpansionPackResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    if (!isExpansionPackId(options.packId)) return { status: 'unknown_pack' };
    const state = getIslandRunStateSnapshot(options.session);
    const voyage = state.expansionVoyageState;
    if (voyage.ownedPackIds.includes(options.packId)) return { status: 'already_owned' };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        expansionVoyageState: {
          ...voyage,
          ownedPackIds: [...voyage.ownedPackIds, options.packId],
          updatedAtMs: options.nowMs ?? Date.now(),
        },
      },
      triggerSource: 'expansion_pack_dev_grant',
    });
    return { status: 'ok' };
  });
}

/** Pure: the record after leaving the active voyage and entering `voyageId`. */
export function resolveVoyageSwitchRecord(options: {
  current: IslandRunGameStateRecord;
  voyageId: ExpansionVoyageId;
  nowMs: number;
  getIslandDurationMs: (islandNumber: number) => number;
  islandRunContractV2Enabled: boolean;
  /** Packs finished on this switch (pack completion → back to main). */
  completePackId?: ExpansionPackId;
}): IslandRunGameStateRecord | null {
  const { current, voyageId, nowMs } = options;
  const voyage = current.expansionVoyageState;
  if (voyageId === voyage.activeVoyageId) return null;
  if (voyageId !== 'main' && !voyage.ownedPackIds.includes(voyageId)) return null;

  // 1. Stash where the leaving voyage is. A finished pack keeps no stash.
  const leaving = voyage.activeVoyageId;
  const stashed = { ...voyage.stashedPathsByVoyage };
  if (options.completePackId === leaving) delete stashed[leaving];
  else stashed[leaving] = pickVoyagePathSnapshot(current);

  // 2. Restore the arriving voyage, or start a pack at its first island.
  const arriving = stashed[voyageId];
  delete stashed[voyageId];
  let next: IslandRunGameStateRecord;
  if (arriving) {
    next = applyVoyagePath(current, arriving);
  } else if (voyageId === 'main') {
    return null; // Main is always stashed while a pack is active.
  } else {
    // A fresh pack: enter its first island like a normal arrival, but with
    // the leaving island's egg already stashed (not left on that island).
    const fresh = {
      ...current,
      cycleIndex: 0,
      activeEggTier: null,
      activeEggSetAtMs: null,
      activeEggHatchDurationMs: null,
      activeEggIsDormant: false,
    } satisfies IslandRunGameStateRecord;
    next = resolveIslandRunTravelState({
      current: fresh,
      nextIsland: getExpansionIslandNumber(voyageId, 1),
      startTimer: true,
      nowMs,
      getIslandDurationMs: options.getIslandDurationMs,
      islandRunContractV2Enabled: options.islandRunContractV2Enabled,
    }).record;
  }
  const completedPackIds = options.completePackId && !voyage.completedPackIds.includes(options.completePackId)
    ? [...voyage.completedPackIds, options.completePackId]
    : voyage.completedPackIds;
  return {
    ...next,
    runtimeVersion: current.runtimeVersion + 1,
    expansionVoyageState: {
      ...voyage,
      activeVoyageId: voyageId,
      completedPackIds,
      stashedPathsByVoyage: stashed,
      updatedAtMs: nowMs,
    },
  };
}

export type SwitchVoyageResult = { status: 'ok' } | { status: 'already_active' | 'not_owned' | 'unavailable' };

/** Switch to the main path or an owned pack; each keeps its own position. */
export function switchExpansionVoyage(options: VoyageActionContext & {
  voyageId: string;
  getIslandDurationMs: (islandNumber: number) => number;
  islandRunContractV2Enabled: boolean;
}): Promise<SwitchVoyageResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const voyageId = options.voyageId === 'main' ? 'main' : isExpansionPackId(options.voyageId) ? options.voyageId : null;
    if (!voyageId) return { status: 'not_owned' };
    const state = getIslandRunStateSnapshot(options.session);
    if (state.expansionVoyageState.activeVoyageId === voyageId) return { status: 'already_active' };
    if (voyageId !== 'main' && !state.expansionVoyageState.ownedPackIds.includes(voyageId)) return { status: 'not_owned' };
    const record = resolveVoyageSwitchRecord({
      current: state,
      voyageId,
      nowMs: options.nowMs ?? Date.now(),
      getIslandDurationMs: options.getIslandDurationMs,
      islandRunContractV2Enabled: options.islandRunContractV2Enabled,
    });
    if (!record) return { status: 'unavailable' };
    await commitIslandRunState({ session: options.session, client: options.client, record, triggerSource: 'expansion_voyage_switch' });
    return { status: 'ok' };
  });
}

export type CompletePackResult = { status: 'ok'; packId: ExpansionPackId } | { status: 'not_in_pack' | 'not_last_island' | 'island_incomplete' };

/** Finishing a pack's last island marks it complete and returns to the main path. */
export function completeExpansionPackVoyage(options: VoyageActionContext & {
  getIslandDurationMs: (islandNumber: number) => number;
  islandRunContractV2Enabled: boolean;
}): Promise<CompletePackResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const ref = resolveExpansionIsland(state.currentIslandNumber);
    const activePack = getExpansionPack(state.expansionVoyageState.activeVoyageId);
    if (!ref || !activePack || ref.pack.id !== activePack.id) return { status: 'not_in_pack' };
    if (ref.localIndex < ref.pack.islandCount) return { status: 'not_last_island' };
    if (!resolveIslandRunCompletion(state).complete) return { status: 'island_incomplete' };
    const record = resolveVoyageSwitchRecord({
      current: state,
      voyageId: 'main',
      nowMs: options.nowMs ?? Date.now(),
      getIslandDurationMs: options.getIslandDurationMs,
      islandRunContractV2Enabled: options.islandRunContractV2Enabled,
      completePackId: ref.pack.id,
    });
    if (!record) return { status: 'not_in_pack' };
    await commitIslandRunState({ session: options.session, client: options.client, record, triggerSource: 'expansion_pack_complete' });
    return { status: 'ok', packId: ref.pack.id };
  });
}
