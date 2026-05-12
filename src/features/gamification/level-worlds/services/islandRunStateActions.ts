/**
 * islandRunStateActions — pure action functions that mutate Island Run
 * gameplay state through the store ({@link islandRunStateStore}).
 *
 * Stage C1 introduced:
 * - {@link applyRollResult} — absorbs the result of
 *   `executeIslandRunRollAction` and syncs the store mirror with the
 *   roll-service's authoritative localStorage write.
 * - {@link applyTokenHopRewards} — applies per-hop dice/spinToken/essence
 *   deltas (reward-bar claims, minigame payouts) through the store's
 *   commit path.
 *
 * Stage C2 adds (tile/encounter reward + reward-bar + drift):
 * - {@link applyEssenceAward} — credit essence to the wallet.
 * - {@link applyEssenceDeduct} — withdraw essence (hazard / ticket / build).
 * - {@link applyRewardBarState} — commit the full reward-bar + timed-event +
 *   sticker snapshot.
 * - {@link applyEssenceDriftTick} — 5-minute essence drift interval.
 *
 * Stage C3 adds (stop progress + island travel):
 * - {@link travelToNextIsland} — single atomic commit that replaces the four
 *   separate `persistIslandRunRuntimeStatePatch` calls that `performIslandTravel`
 *   used to make (old-island clears, egg save/restore, contract-v2 stop/build
 *   reset, island-number + timer update). This is the "atomic-travel refactor"
 *   risk called out in the Stage C spec.
 *
 * These functions replace the renderer-side `useEffect` + inlined
 * `persistIslandRunRuntimeStatePatch` calls that raced with the roll
 * service and with each other (the multi-writer drift vectors documented
 * in `STAGE_C_STATE_ARCHITECTURE_MIGRATION.md`).
 *
 * Lifecycle:
 * - All Stage-C actions update the in-memory store mirror synchronously
 *   (via {@link commitIslandRunState}'s `publish`), so the next
 *   `useSyncExternalStore` render cycle sees the new state.
 * - `applyRollResult` does NOT issue a remote write — the roll service
 *   already committed to localStorage + Supabase. Every other action
 *   commits the full record (mirror + localStorage + Supabase) via
 *   {@link commitIslandRunState}.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type {
  IslandRunGameStateRecord,
  IslandRunLuckyRollSession,
  PerIslandEggEntry,
  SpaceExcavatorProgressEntry,
} from './islandRunGameStateStore';
import { getIslandRunLuckyRollSessionKey } from './islandRunGameStateStore';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
} from './islandRunStateStore';
import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';
import { persistIslandRunProfileMetadata } from './islandRunProfile';
import {
  applyEssenceDrift,
  awardIslandRunContractV2Essence,
  deductIslandRunContractV2Essence,
  getRemainingIslandBuildCost,
  initStopBuildStatesForIsland,
  spendIslandRunContractV2EssenceOnStopBuild,
} from './islandRunContractV2EssenceBuild';
import { isIslandRunFullyClearedV2 } from './islandRunContractV2StopResolver';
import { resolveRuntimeDiceRegenUpdate } from './islandRunRuntimeRegen';
import { resolveIslandRunPreIslandLuckyRollGate } from './islandRunPreIslandLuckyRollGate';
import {
  chooseSpaceExcavatorObjectShape,
  placeSpaceExcavatorObjectShape,
} from './spaceExcavatorObjects';


export interface ApplySpaceExcavatorDigResult {
  record: IslandRunGameStateRecord;
  ok: boolean;
  ticketsRemaining: number;
  progress: SpaceExcavatorProgressEntry | null;
  boardComplete: boolean;
  canAdvanceBoard: boolean;
}

export interface AdvanceSpaceExcavatorBoardResult {
  record: IslandRunGameStateRecord;
  ok: boolean;
  ticketsRemaining: number;
  progress: SpaceExcavatorProgressEntry | null;
}

export const SPACE_EXCAVATOR_TOTAL_BOARDS = 10; // Tuning placeholder until rewards/finale UX is added.

function buildSpaceExcavatorProgress(eventId: string, boardIndex: number, nowMs: number, completedBoardCount = boardIndex): SpaceExcavatorProgressEntry {
  const boardSize = 5;
  const objectShape = chooseSpaceExcavatorObjectShape(eventId, boardIndex);
  const objectTileIds = placeSpaceExcavatorObjectShape({ eventId, boardIndex, boardSize, shape: objectShape });
  return {
    eventId,
    boardIndex,
    boardSize,
    treasureCount: objectTileIds.length,
    treasureTileIds: objectTileIds,
    objectId: objectShape.objectId,
    objectName: objectShape.name,
    objectTier: objectShape.tier,
    objectIcon: objectShape.icon,
    objectTileIds,
    revealedObjectTileIds: [],
    dugTileIds: [],
    foundTreasureTileIds: [],
    completedBoardCount,
    status: 'active',
    updatedAtMs: nowMs,
  };
}

export function initSpaceExcavatorProgressForEvent(options: { session: Session; client: SupabaseClient | null; eventId: string; triggerSource?: string; }): IslandRunGameStateRecord {
  const { session, client, eventId, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (!eventId) return current;
  if (current.spaceExcavatorProgressByEvent?.[eventId]) return current;
  const next = { ...current, runtimeVersion: current.runtimeVersion + 1, spaceExcavatorProgressByEvent: { ...current.spaceExcavatorProgressByEvent, [eventId]: buildSpaceExcavatorProgress(eventId, 0, Date.now()) } };
  void commitIslandRunState({ session, client, record: next, triggerSource: triggerSource ?? 'init_space_excavator_progress' });
  return next;
}

export function applySpaceExcavatorDig(options: { session: Session; client: SupabaseClient | null; eventId: string; tileId: number; triggerSource?: string; }): ApplySpaceExcavatorDigResult {
  const { session, client, eventId, tileId, triggerSource } = options;
  const current = initSpaceExcavatorProgressForEvent({ session, client: null, eventId, triggerSource });
  const progress = current.spaceExcavatorProgressByEvent?.[eventId] ?? null;
  const available = Math.max(0, Math.floor(current.minigameTicketsByEvent?.[eventId] ?? 0));
  const alreadyComplete = progress?.status === 'board_complete' || progress?.status === 'completed';
  if (!progress || available < 1 || alreadyComplete) {
    const boardComplete = progress?.status === 'board_complete';
    const canAdvanceBoard = boardComplete && progress.boardIndex + 1 < SPACE_EXCAVATOR_TOTAL_BOARDS;
    return { record: current, ok: false, ticketsRemaining: available, progress, boardComplete, canAdvanceBoard };
  }
  const normalizedTile = Math.max(0, Math.floor(tileId));
  const tileCount = progress.boardSize * progress.boardSize;
  if (normalizedTile >= tileCount || progress.dugTileIds.includes(normalizedTile)) return { record: current, ok: false, ticketsRemaining: available, progress, boardComplete: false, canAdvanceBoard: false };
  const dugTileIds = Array.from(new Set([...progress.dugTileIds, normalizedTile])).sort((a,b)=>a-b);
  const objectTileIds = progress.objectTileIds.length > 0 ? progress.objectTileIds : progress.treasureTileIds;
  const revealedObjectTileIds = objectTileIds.includes(normalizedTile) ? Array.from(new Set([...progress.revealedObjectTileIds, normalizedTile])).sort((a,b)=>a-b) : progress.revealedObjectTileIds;
  const foundTreasureTileIds = objectTileIds.includes(normalizedTile) ? Array.from(new Set([...progress.foundTreasureTileIds, normalizedTile])).sort((a,b)=>a-b) : progress.foundTreasureTileIds;
  let nextProgress: SpaceExcavatorProgressEntry = { ...progress, dugTileIds, revealedObjectTileIds, foundTreasureTileIds, updatedAtMs: Date.now() };
  const boardComplete = objectTileIds.length > 0 && objectTileIds.every((objectTileId) => revealedObjectTileIds.includes(objectTileId));
  if (boardComplete && progress.status !== 'board_complete') {
    nextProgress = {
      ...nextProgress,
      completedBoardCount: Math.max(progress.completedBoardCount, progress.boardIndex + 1),
      status: progress.boardIndex + 1 >= SPACE_EXCAVATOR_TOTAL_BOARDS ? 'completed' : 'board_complete',
    };
  }
  const next = { ...current, runtimeVersion: current.runtimeVersion + 1, minigameTicketsByEvent: { ...current.minigameTicketsByEvent, [eventId]: available - 1 }, spaceExcavatorProgressByEvent: { ...current.spaceExcavatorProgressByEvent, [eventId]: nextProgress } };
  void commitIslandRunState({ session, client, record: next, triggerSource: triggerSource ?? 'apply_space_excavator_dig' });
  return { record: next, ok: true, ticketsRemaining: available - 1, progress: nextProgress, boardComplete: nextProgress.status === 'board_complete' || nextProgress.status === 'completed', canAdvanceBoard: nextProgress.status === 'board_complete' };
}

export function advanceSpaceExcavatorBoard(options: { session: Session; client: SupabaseClient | null; eventId: string; triggerSource?: string; }): AdvanceSpaceExcavatorBoardResult {
  const { session, client, eventId, triggerSource } = options;
  const current = initSpaceExcavatorProgressForEvent({ session, client: null, eventId, triggerSource });
  const progress = current.spaceExcavatorProgressByEvent?.[eventId] ?? null;
  const available = Math.max(0, Math.floor(current.minigameTicketsByEvent?.[eventId] ?? 0));
  if (!progress || progress.status !== 'board_complete') return { record: current, ok: false, ticketsRemaining: available, progress };
  const nextCompletedBoardCount = Math.max(progress.completedBoardCount, progress.boardIndex + 1);
  if (progress.boardIndex + 1 >= SPACE_EXCAVATOR_TOTAL_BOARDS) {
    const completedProgress = { ...progress, completedBoardCount: nextCompletedBoardCount, status: 'completed' as const, updatedAtMs: Date.now() };
    const next = { ...current, runtimeVersion: current.runtimeVersion + 1, spaceExcavatorProgressByEvent: { ...current.spaceExcavatorProgressByEvent, [eventId]: completedProgress } };
    void commitIslandRunState({ session, client, record: next, triggerSource: triggerSource ?? 'advance_space_excavator_board' });
    return { record: next, ok: true, ticketsRemaining: available, progress: completedProgress };
  }
  const nextProgress = buildSpaceExcavatorProgress(eventId, progress.boardIndex + 1, Date.now(), nextCompletedBoardCount);
  const next = { ...current, runtimeVersion: current.runtimeVersion + 1, spaceExcavatorProgressByEvent: { ...current.spaceExcavatorProgressByEvent, [eventId]: nextProgress } };
  void commitIslandRunState({ session, client, record: next, triggerSource: triggerSource ?? 'advance_space_excavator_board' });
  return { record: next, ok: true, ticketsRemaining: available, progress: nextProgress };
}
// ── applyRollResult ──────────────────────────────────────────────────────────

/**
 * Syncs the store mirror with the roll service's authoritative
 * localStorage write. Call this once after the roll + hop animation
 * sequence completes.
 *
 * Returns the refreshed record so the renderer can forward it to
 * `setRuntimeState` (the legacy in-memory mirror that other effects still
 * depend on during the Stage-C migration).
 *
 * **No remote write** — the roll service's `writeIslandRunGameStateRecord`
 * already committed to Supabase.
 */
export function applyRollResult(options: {
  session: Session;
}): IslandRunGameStateRecord {
  const before = getIslandRunStateSnapshot(options.session);
  logIslandRunEntryDebug('applyRollResult_before', {
    userId: options.session.user.id,
    runtimeVersion: before.runtimeVersion,
    tokenIndex: before.tokenIndex,
    dicePool: before.dicePool,
    spinTokens: before.spinTokens,
  });
  refreshIslandRunStateFromLocal(options.session);
  const after = getIslandRunStateSnapshot(options.session);
  logIslandRunEntryDebug('applyRollResult_after', {
    userId: options.session.user.id,
    runtimeVersion: after.runtimeVersion,
    tokenIndex: after.tokenIndex,
    dicePool: after.dicePool,
    spinTokens: after.spinTokens,
    tokenIndexChanged: before.tokenIndex !== after.tokenIndex,
    dicePoolChanged: before.dicePool !== after.dicePool,
  });
  return after;
}

// ── applyTokenHopRewards ─────────────────────────────────────────────────────

export interface TokenHopRewardsDeltas {
  /** Spin / minigame tokens delta (positive = earned, negative = spent). */
  spinTokens?: number;
  /** Dice delta (positive = earned). */
  dicePool?: number;
  /** Essence delta (positive = earned). */
  essence?: number;
}

export interface ApplyTimedEventTicketSpendOptions {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  ticketsToSpend: number;
  triggerSource?: string;
}

export interface ApplyTimedEventTicketSpendResult {
  record: IslandRunGameStateRecord;
  spent: number;
}

export interface ApplyPassiveDiceRegenTickOptions {
  session: Session;
  client: SupabaseClient | null;
  playerLevel: number;
  nowMs: number;
  triggerSource?: string;
}

export interface ApplyPassiveDiceRegenTickResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
  diceAdded: number;
}

export interface ApplyDevGrantDiceOptions {
  session: Session;
  client: SupabaseClient | null;
  amount: number;
  triggerSource?: string;
}

export interface ApplyDevGrantDiceResult {
  record: IslandRunGameStateRecord;
  applied: number;
}

export interface ApplyDevGrantEssenceOptions {
  session: Session;
  client: SupabaseClient | null;
  amount: number;
  triggerSource?: string;
}

export interface ApplyDevGrantEssenceResult {
  record: IslandRunGameStateRecord;
  applied: number;
}
export interface ApplyDevGrantTimedEventTicketsOptions {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  amount: number;
  triggerSource?: string;
}
export interface ApplyDevGrantTimedEventTicketsResult {
  record: IslandRunGameStateRecord;
  applied: number;
  eventId: string;
}

export interface ApplyDevSpeedHatchEggOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  nowMs?: number;
  triggerSource?: string;
}

export interface ApplyDevSpeedHatchEggResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

export interface ApplyDevBuildAllToL3Options {
  session: Session;
  client: SupabaseClient | null;
  effectiveIslandNumber: number;
  triggerSource?: string;
}

export interface ApplyDevBuildAllToL3Result {
  record: IslandRunGameStateRecord;
  changed: boolean;
  stopsCompleted: number;
  totalStepsApplied: number;
}

/**
 * Applies per-hop or per-claim currency deltas to the authoritative store.
 *
 * Reads the latest store snapshot, merges the deltas, commits the full
 * record (mirror + localStorage + Supabase). The mirror is updated
 * synchronously so the next render cycle sees the change.
 *
 * Returns the committed record for forwarding to `setRuntimeState`.
 */
export function applyTokenHopRewards(options: {
  session: Session;
  client: SupabaseClient | null;
  deltas: TokenHopRewardsDeltas;
  dualWriteMinigameTicketsEventId?: string | null;
  triggerSource?: string;
}): IslandRunGameStateRecord {
  const { session, client, deltas, dualWriteMinigameTicketsEventId, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const clamp0 = (v: number) => Math.max(0, v);
  const spinTokenDelta = deltas.spinTokens ?? 0;
  const shouldDualWriteMinigameTickets = spinTokenDelta > 0
    && typeof dualWriteMinigameTicketsEventId === 'string'
    && dualWriteMinigameTicketsEventId.length > 0;
  const nextMinigameTicketsByEvent = shouldDualWriteMinigameTickets
    ? {
        ...current.minigameTicketsByEvent,
        [dualWriteMinigameTicketsEventId]: clamp0(
          (current.minigameTicketsByEvent?.[dualWriteMinigameTicketsEventId] ?? 0) + spinTokenDelta,
        ),
      }
    : current.minigameTicketsByEvent;
  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    spinTokens: clamp0(current.spinTokens + spinTokenDelta),
    dicePool: clamp0(current.dicePool + (deltas.dicePool ?? 0)),
    essence: clamp0(current.essence + (deltas.essence ?? 0)),
    minigameTicketsByEvent: nextMinigameTicketsByEvent,
  };
  // Synchronous mirror update + async persist (fire-and-forget).
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_token_hop_rewards',
  });
  return next;
}

/**
 * Deducts event-scoped minigame tickets through the canonical commit path.
 *
 * Phase-3 event-ticket migration:
 * - Spend authority for timed-event launches now lives on
 *   `minigameTicketsByEvent[eventId]`.
 * - Legacy `spinTokens` is intentionally left unchanged by this action.
 */
export function applyTimedEventTicketSpend(
  options: ApplyTimedEventTicketSpendOptions,
): ApplyTimedEventTicketSpendResult {
  const { session, client, eventId, ticketsToSpend, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const canonicalEventId = typeof eventId === 'string' ? eventId.trim() : '';
  const requested = Number.isFinite(ticketsToSpend) ? Math.max(0, Math.floor(ticketsToSpend)) : 0;
  if (!canonicalEventId || requested < 1) return { record: current, spent: 0 };
  const available = Math.max(0, Math.floor(current.minigameTicketsByEvent?.[canonicalEventId] ?? 0));
  if (available < requested) return { record: current, spent: 0 };

  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    minigameTicketsByEvent: {
      ...current.minigameTicketsByEvent,
      [canonicalEventId]: Math.max(0, available - requested),
    },
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_timed_event_ticket_spend',
  });
  return { record: next, spent: requested };
}

/**
 * Applies one deterministic passive dice-regen tick through the canonical
 * store commit path.
 */
export function applyPassiveDiceRegenTick(
  options: ApplyPassiveDiceRegenTickOptions,
): ApplyPassiveDiceRegenTickResult {
  const { session, client, playerLevel, nowMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const regenUpdate = resolveRuntimeDiceRegenUpdate({
    snapshot: {
      dicePool: current.dicePool,
      diceRegenState: current.diceRegenState ?? null,
    },
    playerLevel,
    nowMs,
  });
  if (!regenUpdate) {
    return { record: current, changed: false, diceAdded: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    dicePool: regenUpdate.dicePool,
    diceRegenState: regenUpdate.diceRegenState,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_passive_dice_regen_tick',
  });
  return {
    record: next,
    changed: true,
    diceAdded: regenUpdate.diceAdded,
  };
}

/**
 * DEV-ONLY helper action: grant dice through the canonical commit path.
 *
 * This intentionally avoids direct renderer state writes so dev testing still
 * exercises the single-flight coordinator and runtimeVersion bump semantics.
 */
export function applyDevGrantDice(options: ApplyDevGrantDiceOptions): ApplyDevGrantDiceResult {
  const { session, client, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const applied = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  if (applied < 1) return { record: current, applied: 0 };
  const next: IslandRunGameStateRecord = {
    ...current,
    dicePool: Math.max(0, current.dicePool + applied),
    runtimeVersion: current.runtimeVersion + 1,
  };
  logIslandRunEntryDebug('dev_grant_dice', {
    userId: session.user.id,
    applied,
    beforeDicePool: current.dicePool,
    afterDicePool: next.dicePool,
    runtimeVersionBefore: current.runtimeVersion,
    runtimeVersionAfter: next.runtimeVersion,
  });
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'dev_grant_dice',
  });
  return { record: next, applied };
}

/**
 * DEV-ONLY helper action: grant essence through the canonical commit path.
 */
export function applyDevGrantEssence(options: ApplyDevGrantEssenceOptions): ApplyDevGrantEssenceResult {
  const { session, client, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const applied = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  if (applied < 1) return { record: current, applied: 0 };
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: Math.max(0, current.essence + applied),
    essenceLifetimeEarned: Math.max(0, current.essenceLifetimeEarned + applied),
    runtimeVersion: current.runtimeVersion + 1,
  };
  logIslandRunEntryDebug('dev_grant_essence', {
    userId: session.user.id,
    applied,
    beforeEssence: current.essence,
    afterEssence: next.essence,
    runtimeVersionBefore: current.runtimeVersion,
    runtimeVersionAfter: next.runtimeVersion,
  });
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'dev_grant_essence',
  });
  return { record: next, applied };
}

/**
 * DEV-ONLY helper action: grant event-scoped minigame tickets to a specific
 * timed-event bucket through the canonical commit path.
 */
export function applyDevGrantTimedEventTickets(
  options: ApplyDevGrantTimedEventTicketsOptions,
): ApplyDevGrantTimedEventTicketsResult {
  const { session, client, eventId, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const canonicalEventId = typeof eventId === 'string' ? eventId.trim() : '';
  const applied = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  if (!canonicalEventId || applied < 1) {
    return { record: current, applied: 0, eventId: canonicalEventId };
  }
  const currentBucket = Math.max(0, Math.floor(current.minigameTicketsByEvent?.[canonicalEventId] ?? 0));
  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    minigameTicketsByEvent: {
      ...current.minigameTicketsByEvent,
      [canonicalEventId]: Math.max(0, currentBucket + applied),
    },
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'dev_grant_timed_event_tickets',
  });
  return { record: next, applied, eventId: canonicalEventId };
}

/**
 * DEV-ONLY helper action: force the active island egg into a hatch-ready state.
 *
 * This keeps all mutations on the canonical store commit path and intentionally
 * avoids any renderer-side runtime mirror writes.
 */
export function applyDevSpeedHatchEgg(options: ApplyDevSpeedHatchEggOptions): ApplyDevSpeedHatchEggResult {
  const { session, client, islandNumber, nowMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(Math.max(1, Math.trunc(islandNumber)));
  const entry = current.perIslandEggs?.[islandKey];
  if (!entry || entry.status === 'collected' || entry.status === 'sold') {
    return { record: current, changed: false };
  }

  const resolvedNowMs = Number.isFinite(nowMs) ? Math.max(0, Math.trunc(nowMs ?? 0)) : Date.now();
  const readySetAtMs = Number.isFinite(entry.setAtMs) ? entry.setAtMs : resolvedNowMs;
  const readyHatchAtMs = readySetAtMs;
  const hasActiveEgg = current.activeEggTier !== null;
  const next: IslandRunGameStateRecord = {
    ...current,
    activeEggSetAtMs: hasActiveEgg ? readySetAtMs : current.activeEggSetAtMs,
    activeEggHatchDurationMs: hasActiveEgg ? 0 : current.activeEggHatchDurationMs,
    perIslandEggs: {
      ...current.perIslandEggs,
      [islandKey]: {
        ...entry,
        hatchAtMs: readyHatchAtMs,
        status: 'ready',
      },
    },
    runtimeVersion: current.runtimeVersion + 1,
  };
  logIslandRunEntryDebug('dev_speed_hatch_egg', {
    userId: session.user.id,
    islandNumber: islandKey,
    hadActiveEgg: hasActiveEgg,
    runtimeVersionBefore: current.runtimeVersion,
    runtimeVersionAfter: next.runtimeVersion,
  });
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'dev_speed_hatch_egg',
  });
  return { record: next, changed: true };
}

/**
 * DEV-ONLY helper action: fully build every landmark to L3 through canonical
 * build spend semantics and one atomic commit.
 */
export async function applyDevBuildAllToL3(
  options: ApplyDevBuildAllToL3Options,
): Promise<ApplyDevBuildAllToL3Result> {
  const { session, client, effectiveIslandNumber, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  let workingRecord = current;
  let totalStepsApplied = 0;
  let stopsCompleted = 0;

  for (let stopIndex = 0; stopIndex < workingRecord.stopBuildStateByIndex.length; stopIndex += 1) {
    const buildState = workingRecord.stopBuildStateByIndex[stopIndex];
    if (!buildState) continue;
    if (buildState.buildLevel >= 3) {
      stopsCompleted += 1;
      continue;
    }
    const maxStepsToL3 = 1000;
    const batchResult = await applyStopBuildSpendBatch({
      session,
      client,
      stopIndex,
      effectiveIslandNumber,
      maxSteps: maxStepsToL3,
      triggerSource: triggerSource ?? 'dev_build_all_to_l3',
    });
    workingRecord = batchResult.record;
    totalStepsApplied += batchResult.stepsApplied;
    const nextBuild = workingRecord.stopBuildStateByIndex[stopIndex];
    if (nextBuild && nextBuild.buildLevel >= 3) {
      stopsCompleted += 1;
    }
  }

  return {
    record: workingRecord,
    changed: totalStepsApplied > 0,
    stopsCompleted,
    totalStepsApplied,
  };
}

// ── C2: Essence award / spend / reward-bar / drift ───────────────────────────

export interface ApplyEssenceAwardOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Contract-V2 feature flag; forwarded to `awardIslandRunContractV2Essence`. */
  islandRunContractV2Enabled: boolean;
  /** Raw award amount requested (pre-clamp). Negative / non-integer values are ignored. */
  amount: number;
  /** Tag for telemetry / writer `triggerSource`. */
  triggerSource?: string;
}

export interface ApplyEssenceAwardResult {
  /** The committed record (mirror + localStorage; Supabase fire-and-forget). */
  record: IslandRunGameStateRecord;
  /** Amount actually credited after contract-v2 clamping. Zero when the flag is off or the amount rounds below 1. */
  earned: number;
}

/**
 * Awards essence to the wallet through the store commit path.
 *
 * Replaces the renderer-side `persistIslandRunRuntimeStatePatch({ essence, essenceLifetimeEarned })` +
 * paired `setRuntimeState` that used to race the roll service's commit. The
 * previous read-modify-write happened through `runtimeStateRef.current`; the
 * store snapshot is now the authoritative source so concurrent awards on
 * disjoint fields no longer silently drop data.
 *
 * No-op (returns the current snapshot and `earned: 0`) when the contract-v2
 * flag is off or the requested amount rounds below 1.
 */
export function applyEssenceAward(options: ApplyEssenceAwardOptions): ApplyEssenceAwardResult {
  const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const result = awardIslandRunContractV2Essence({
    islandRunContractV2Enabled,
    essence: current.essence,
    essenceLifetimeEarned: current.essenceLifetimeEarned,
    amount,
  });
  if (result.earned < 1) {
    return { record: current, earned: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: result.essence,
    essenceLifetimeEarned: result.essenceLifetimeEarned,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_award',
  });
  return { record: next, earned: result.earned };
}

export interface ApplyEssenceDeductOptions {
  session: Session;
  client: SupabaseClient | null;
  islandRunContractV2Enabled: boolean;
  /** Amount to withdraw (pre-clamp). Wallet is clamped at 0 — callers may deduct less than requested. */
  amount: number;
  triggerSource?: string;
}

export interface ApplyEssenceDeductResult {
  record: IslandRunGameStateRecord;
  /** Amount actually debited (may be less than requested when the wallet was short). */
  spent: number;
}

export interface ApplyWalletShardsDeltaOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Positive = earn, negative = spend. */
  delta: number;
  triggerSource?: string;
}

export interface ApplyWalletShardsDeltaResult {
  record: IslandRunGameStateRecord;
  /** Actual change applied after clamp/no-op guards. */
  appliedDelta: number;
}

export interface ApplyWalletDiamondsSetOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Absolute diamonds wallet target. Clamped to integer >= 0. */
  nextDiamonds: number;
  triggerSource?: string;
}

export interface ApplyWalletDiamondsSetResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

export interface ApplyWalletDiamondsDeltaOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Positive = earn, negative = spend. */
  delta: number;
  triggerSource?: string;
}

export interface ApplyWalletDiamondsDeltaResult {
  record: IslandRunGameStateRecord;
  appliedDelta: number;
}

export interface ApplyMarketOwnedBundleMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  diceBundleOwned: boolean;
  triggerSource?: string;
}

export interface ApplyIslandShardsSetOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Absolute cumulative island-shards value. Clamped to integer >= 0. */
  nextIslandShards: number;
  triggerSource?: string;
}

export interface ApplyIslandShardsSetResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

export interface ApplyShardClaimProgressMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Absolute shard tier index marker. Clamped to integer >= 0. */
  nextShardTierIndex: number;
  /** Absolute shard claim count marker. Clamped to integer >= 0. */
  nextShardClaimCount: number;
  triggerSource?: string;
}

export interface ApplyWalletShieldsSetOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Absolute shields wallet target. Clamped to integer >= 0. */
  nextShields: number;
  triggerSource?: string;
}

export interface ApplyWalletShieldsSetResult {
  record: IslandRunGameStateRecord;
  /** True when a commit was issued. */
  changed: boolean;
}

export interface ApplyWalletShieldsDeltaOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Positive = earn, negative = spend. */
  delta: number;
  triggerSource?: string;
}

export interface ApplyWalletShieldsDeltaResult {
  record: IslandRunGameStateRecord;
  /** Actual change applied after clamp/no-op guards. */
  appliedDelta: number;
}

export interface ApplyBossTrialResolvedMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  triggerSource?: string;
}

export interface ApplyQaProgressionSnapshotOptions {
  session: Session;
  client: SupabaseClient | null;
  currentIslandNumber: number;
  bossTrialResolvedIslandNumber: number | null;
  dicePool: number;
  tokenIndex: number;
  triggerSource?: string;
}

export interface ApplyFirstRunStarterRewardsOptions {
  session: Session;
  client: SupabaseClient | null;
  essenceBonus: number;
  diceBonus: number;
  triggerSource?: string;
}

export interface ApplyOnboardingCompleteMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  triggerSource?: string;
}

export interface ApplyOnboardingCompleteMarkerResult {
  ok: boolean;
  changed: boolean;
  errorMessage?: string;
}

export interface ApplyCreatureTreatInventoryOptions {
  session: Session;
  client: SupabaseClient | null;
  creatureTreatInventory: IslandRunGameStateRecord['creatureTreatInventory'];
  triggerSource?: string;
}

export interface ApplyCreatureCollectionOptions {
  session: Session;
  client: SupabaseClient | null;
  creatureCollection: IslandRunGameStateRecord['creatureCollection'];
  triggerSource?: string;
}

export interface ApplyActiveCompanionOptions {
  session: Session;
  client: SupabaseClient | null;
  activeCompanionId: IslandRunGameStateRecord['activeCompanionId'];
  triggerSource?: string;
}

export interface ApplyOnboardingDisplayNameLoopMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  completed: boolean;
  triggerSource?: string;
}

export interface ApplyAudioEnabledMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  audioEnabled: boolean;
  triggerSource?: string;
}

export interface ApplyStoryPrologueSeenMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  storyPrologueSeen: boolean;
  triggerSource?: string;
}

export interface ApplyCompanionBonusLastVisitKeyMarkerOptions {
  session: Session;
  client: SupabaseClient | null;
  visitKey: string;
  triggerSource?: string;
}

export interface ApplyPerfectCompanionSnapshotOptions {
  session: Session;
  client: SupabaseClient | null;
  perfectCompanionIds: string[];
  perfectCompanionReasons: IslandRunGameStateRecord['perfectCompanionReasons'];
  perfectCompanionComputedAtMs: number;
  perfectCompanionModelVersion: string;
  perfectCompanionComputedCycleIndex: number;
  triggerSource?: string;
}

export interface ApplyPerfectCompanionSnapshotResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

/**
 * Withdraws essence from the wallet through the store commit path.
 *
 * Replaces the renderer-side patch+setRuntimeState pair used by hazard-tile
 * penalties, stop-ticket purchases, and any other essence spend — same
 * rationale as {@link applyEssenceAward} but in the spend direction.
 * `essenceLifetimeEarned` is left unchanged (drift / hazard losses are not
 * lifetime unearnings).
 */
export function applyEssenceDeduct(options: ApplyEssenceDeductOptions): ApplyEssenceDeductResult {
  const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const result = deductIslandRunContractV2Essence({
    islandRunContractV2Enabled,
    essence: current.essence,
    essenceLifetimeSpent: current.essenceLifetimeSpent,
    amount,
  });
  if (result.spent < 1) {
    return { record: current, spent: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: result.essence,
    essenceLifetimeSpent: result.essenceLifetimeSpent,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_deduct',
  });
  return { record: next, spent: result.spent };
}

/**
 * Applies a wallet shard delta through the canonical store commit path.
 *
 * Replaces renderer-side `setRuntimeState(...shards...)` +
 * `persistIslandRunRuntimeStatePatch({ shards })` pairs used by stop rewards
 * and shard-shop spends, so shard mutations no longer bypass the coordinator.
 */
export function applyWalletShardsDelta(options: ApplyWalletShardsDeltaOptions): ApplyWalletShardsDeltaResult {
  const { session, client, delta, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsedDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  if (parsedDelta === 0) return { record: current, appliedDelta: 0 };
  const nextShards = Math.max(0, current.shards + parsedDelta);
  const appliedDelta = nextShards - current.shards;
  if (appliedDelta === 0) return { record: current, appliedDelta: 0 };
  const next: IslandRunGameStateRecord = {
    ...current,
    shards: nextShards,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_wallet_shards_delta',
  });
  return { record: next, appliedDelta };
}

/**
 * Sets the diamonds wallet to an absolute value through the canonical store path.
 */
export function applyWalletDiamondsSet(options: ApplyWalletDiamondsSetOptions): ApplyWalletDiamondsSetResult {
  const { session, client, nextDiamonds, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsed = Number.isFinite(nextDiamonds) ? Math.max(0, Math.trunc(nextDiamonds)) : current.diamonds;
  if (parsed === current.diamonds) return { record: current, changed: false };
  const next: IslandRunGameStateRecord = {
    ...current,
    diamonds: parsed,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_wallet_diamonds_set',
  });
  return { record: next, changed: true };
}

/**
 * Applies a diamonds wallet delta through the canonical store path.
 */
export function applyWalletDiamondsDelta(options: ApplyWalletDiamondsDeltaOptions): ApplyWalletDiamondsDeltaResult {
  const { session, client, delta, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsedDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  if (parsedDelta === 0) return { record: current, appliedDelta: 0 };
  const nextDiamonds = Math.max(0, current.diamonds + parsedDelta);
  const appliedDelta = nextDiamonds - current.diamonds;
  if (appliedDelta === 0) return { record: current, appliedDelta: 0 };
  const next: IslandRunGameStateRecord = {
    ...current,
    diamonds: nextDiamonds,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_wallet_diamonds_delta',
  });
  return { record: next, appliedDelta };
}

/**
 * Commits current-island market bundle ownership marker through the canonical
 * store path.
 *
 * Preserves the existing board semantics:
 * - updates only the current island key,
 * - mirrors `dice_bundle` ownership,
 * - pins `heart_bundle` and `heart_boost_bundle` false.
 */
export function applyMarketOwnedBundleMarker(options: ApplyMarketOwnedBundleMarkerOptions): IslandRunGameStateRecord {
  const { session, client, islandNumber, diceBundleOwned, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(Math.max(1, Math.trunc(islandNumber)));
  const currentEntry = current.marketOwnedBundlesByIsland[islandKey];
  const nextEntry = {
    dice_bundle: Boolean(diceBundleOwned),
    heart_bundle: false,
    heart_boost_bundle: false,
  };
  if (
    currentEntry
    && currentEntry.dice_bundle === nextEntry.dice_bundle
    && currentEntry.heart_bundle === nextEntry.heart_bundle
    && currentEntry.heart_boost_bundle === nextEntry.heart_boost_bundle
  ) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    marketOwnedBundlesByIsland: {
      ...current.marketOwnedBundlesByIsland,
      [islandKey]: nextEntry,
    },
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_market_owned_bundle_marker',
  });
  return next;
}

/**
 * Sets the cumulative island-shards value through the canonical store path.
 */
export function applyIslandShardsSet(options: ApplyIslandShardsSetOptions): ApplyIslandShardsSetResult {
  const { session, client, nextIslandShards, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsed = Number.isFinite(nextIslandShards) ? Math.max(0, Math.trunc(nextIslandShards)) : current.islandShards;
  if (parsed === current.islandShards) return { record: current, changed: false };
  const next: IslandRunGameStateRecord = {
    ...current,
    islandShards: parsed,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_island_shards_set',
  });
  return { record: next, changed: true };
}

/**
 * Commits shard claim marker fields (`shardTierIndex`, `shardClaimCount`)
 * through the canonical store path.
 */
export function applyShardClaimProgressMarker(options: ApplyShardClaimProgressMarkerOptions): IslandRunGameStateRecord {
  const { session, client, nextShardTierIndex, nextShardClaimCount, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsedTierIndex = Number.isFinite(nextShardTierIndex) ? Math.max(0, Math.trunc(nextShardTierIndex)) : current.shardTierIndex;
  const parsedClaimCount = Number.isFinite(nextShardClaimCount) ? Math.max(0, Math.trunc(nextShardClaimCount)) : current.shardClaimCount;
  if (parsedTierIndex === current.shardTierIndex && parsedClaimCount === current.shardClaimCount) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    shardTierIndex: parsedTierIndex,
    shardClaimCount: parsedClaimCount,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_shard_claim_progress_marker',
  });
  return next;
}

/**
 * Sets the shields wallet to an absolute value through the canonical store path.
 *
 * Used by non-board surfaces (e.g., ScoreTab conversion flow) so shield wallet
 * writes no longer bypass action/store coordination via direct runtime patches.
 */
export function applyWalletShieldsSet(options: ApplyWalletShieldsSetOptions): ApplyWalletShieldsSetResult {
  const { session, client, nextShields, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsed = Number.isFinite(nextShields) ? Math.max(0, Math.trunc(nextShields)) : current.shields;
  if (parsed === current.shields) return { record: current, changed: false };
  const next: IslandRunGameStateRecord = {
    ...current,
    shields: parsed,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_wallet_shields_set',
  });
  return { record: next, changed: true };
}

/**
 * Applies a shields wallet delta through the canonical store commit path.
 *
 * Used by non-board gameplay surfaces (e.g., habit shield rewards) so wallet
 * updates no longer route through direct runtime patch writes in UI components.
 */
export function applyWalletShieldsDelta(options: ApplyWalletShieldsDeltaOptions): ApplyWalletShieldsDeltaResult {
  const { session, client, delta, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsedDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  if (parsedDelta === 0) return { record: current, appliedDelta: 0 };
  const nextShields = Math.max(0, current.shields + parsedDelta);
  const appliedDelta = nextShields - current.shields;
  if (appliedDelta === 0) return { record: current, appliedDelta: 0 };
  const next: IslandRunGameStateRecord = {
    ...current,
    shields: nextShields,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_wallet_shields_delta',
  });
  return { record: next, appliedDelta };
}

/**
 * Commits boss-trial resolution marker fields through the canonical store path.
 *
 * Replaces renderer-side direct `persistIslandRunRuntimeStatePatch` writes for
 * `{ currentIslandNumber, bossTrialResolvedIslandNumber }` so boss clear marker
 * updates no longer bypass the state commit coordinator.
 */
export function applyBossTrialResolvedMarker(options: ApplyBossTrialResolvedMarkerOptions): IslandRunGameStateRecord {
  const { session, client, islandNumber, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (
    current.currentIslandNumber === islandNumber
    && current.bossTrialResolvedIslandNumber === islandNumber
  ) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    currentIslandNumber: islandNumber,
    bossTrialResolvedIslandNumber: islandNumber,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_boss_trial_resolved_marker',
  });
  return next;
}

/**
 * Commits QA progression marker snapshot fields through the canonical store path.
 *
 * Replaces renderer-side patch + setRuntimeState pairs in QA helpers so island
 * marker, dice, and token reset snapshots no longer bypass the coordinator.
 */
export function applyQaProgressionSnapshot(options: ApplyQaProgressionSnapshotOptions): IslandRunGameStateRecord {
  const {
    session,
    client,
    currentIslandNumber,
    bossTrialResolvedIslandNumber,
    dicePool,
    tokenIndex,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    currentIslandNumber,
    bossTrialResolvedIslandNumber,
    dicePool: Math.max(0, Math.trunc(dicePool)),
    tokenIndex: Math.max(0, Math.trunc(tokenIndex)),
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_qa_progression_snapshot',
  });
  return next;
}

/**
 * Commits first-run starter rewards through the canonical store path.
 *
 * Replaces renderer-side local-only `setRuntimeState` currency writes so
 * essence + dice grants persist as one coordinated state update.
 */
export function applyFirstRunStarterRewards(options: ApplyFirstRunStarterRewardsOptions): IslandRunGameStateRecord {
  const { session, client, essenceBonus, diceBonus, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const parsedEssenceBonus = Number.isFinite(essenceBonus) ? Math.max(0, Math.trunc(essenceBonus)) : 0;
  const parsedDiceBonus = Number.isFinite(diceBonus) ? Math.max(0, Math.trunc(diceBonus)) : 0;
  if (parsedEssenceBonus < 1 && parsedDiceBonus < 1) return current;
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: current.essence + parsedEssenceBonus,
    essenceLifetimeEarned: current.essenceLifetimeEarned + parsedEssenceBonus,
    dicePool: current.dicePool + parsedDiceBonus,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_first_run_starter_rewards',
  });
  return next;
}

/**
 * Commits the first-run claim marker through the canonical store path.
 *
 * Keeps `firstRunClaimed` ownership in the game-state coordinator while
 * allowing legacy runtime-state onboarding booleans to persist separately.
 */
export function applyFirstRunClaimed(options: {
  session: Session;
  client: SupabaseClient | null;
  triggerSource?: string;
}): IslandRunGameStateRecord {
  const { session, client, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.firstRunClaimed) return current;
  const next: IslandRunGameStateRecord = {
    ...current,
    firstRunClaimed: true,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_first_run_claimed',
  });
  return next;
}

/**
 * Commits the profile-level onboarding_complete marker.
 *
 * This is intentionally separate from `firstRunClaimed`:
 * - `firstRunClaimed` lives on Island Run game-state record,
 * - `onboarding_complete` lives in auth profile metadata.
 */
export async function applyOnboardingCompleteMarker(
  options: ApplyOnboardingCompleteMarkerOptions,
): Promise<ApplyOnboardingCompleteMarkerResult> {
  const { session, client } = options;
  if (session.user.user_metadata?.onboarding_complete === true) {
    return { ok: true, changed: false };
  }
  const persisted = await persistIslandRunProfileMetadata({
    session,
    client,
    metadataPatch: { onboarding_complete: true },
  });
  if (!persisted.ok) {
    return { ok: false, changed: false, errorMessage: persisted.errorMessage };
  }
  return { ok: true, changed: true };
}

/**
 * Commits creature treat inventory through the canonical store path.
 *
 * Replaces renderer-side patch writes in treat inventory sync effects so
 * collection-adjacent progression writes do not bypass the coordinator.
 */
export function applyCreatureTreatInventory(options: ApplyCreatureTreatInventoryOptions): IslandRunGameStateRecord {
  const { session, client, creatureTreatInventory, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const currentInventory = current.creatureTreatInventory;
  if (
    currentInventory.basic === creatureTreatInventory.basic
    && currentInventory.favorite === creatureTreatInventory.favorite
    && currentInventory.rare === creatureTreatInventory.rare
  ) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    creatureTreatInventory,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_creature_treat_inventory',
  });
  return next;
}

/**
 * Commits creature collection ledger through the canonical store path.
 */
export function applyCreatureCollection(options: ApplyCreatureCollectionOptions): IslandRunGameStateRecord {
  const { session, client, creatureCollection, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (JSON.stringify(current.creatureCollection ?? []) === JSON.stringify(creatureCollection ?? [])) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    creatureCollection,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_creature_collection',
  });
  return next;
}

/**
 * Commits active companion selection through the canonical store path.
 */
export function applyActiveCompanion(options: ApplyActiveCompanionOptions): IslandRunGameStateRecord {
  const { session, client, activeCompanionId, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const normalizedActiveCompanionId = activeCompanionId ?? null;
  if ((current.activeCompanionId ?? null) === normalizedActiveCompanionId) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    activeCompanionId: normalizedActiveCompanionId,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_active_companion',
  });
  return next;
}

/**
 * Commits onboarding display-loop completion marker through the canonical
 * store path.
 */
export function applyOnboardingDisplayNameLoopMarker(
  options: ApplyOnboardingDisplayNameLoopMarkerOptions,
): IslandRunGameStateRecord {
  const { session, client, completed, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.onboardingDisplayNameLoopCompleted === completed) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    onboardingDisplayNameLoopCompleted: completed,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_onboarding_display_name_loop_marker',
  });
  return next;
}

/**
 * Commits audio-enabled marker through the canonical store path.
 */
export function applyAudioEnabledMarker(options: ApplyAudioEnabledMarkerOptions): IslandRunGameStateRecord {
  const { session, client, audioEnabled, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.audioEnabled === audioEnabled) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    audioEnabled,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_audio_enabled_marker',
  });
  return next;
}

/**
 * Commits story-prologue seen marker through the canonical store path.
 */
export function applyStoryPrologueSeenMarker(options: ApplyStoryPrologueSeenMarkerOptions): IslandRunGameStateRecord {
  const { session, client, storyPrologueSeen, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.storyPrologueSeen === storyPrologueSeen) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    storyPrologueSeen,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_story_prologue_seen_marker',
  });
  return next;
}

/**
 * Commits companion-bonus visit marker through the canonical store path.
 */
export function applyCompanionBonusLastVisitKeyMarker(
  options: ApplyCompanionBonusLastVisitKeyMarkerOptions,
): IslandRunGameStateRecord {
  const { session, client, visitKey, triggerSource } = options;
  const normalizedVisitKey = visitKey.trim();
  if (!normalizedVisitKey) {
    return getIslandRunStateSnapshot(session);
  }
  const current = getIslandRunStateSnapshot(session);
  if (current.companionBonusLastVisitKey === normalizedVisitKey) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    companionBonusLastVisitKey: normalizedVisitKey,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_companion_bonus_last_visit_key_marker',
  });
  return next;
}

/**
 * Commits perfect-companion snapshot fields through the canonical store path.
 */
export function applyPerfectCompanionSnapshot(
  options: ApplyPerfectCompanionSnapshotOptions,
): ApplyPerfectCompanionSnapshotResult {
  const {
    session,
    client,
    perfectCompanionIds,
    perfectCompanionReasons,
    perfectCompanionComputedAtMs,
    perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const normalizedIds = Array.isArray(perfectCompanionIds)
    ? perfectCompanionIds.filter((id): id is string => typeof id === 'string')
    : [];
  const normalizedReasons = perfectCompanionReasons ?? {};
  const normalizedComputedAtMs =
    Number.isFinite(perfectCompanionComputedAtMs) && perfectCompanionComputedAtMs > 0
      ? Math.trunc(perfectCompanionComputedAtMs)
      : current.perfectCompanionComputedAtMs;
  const normalizedCycleIndex = Number.isFinite(perfectCompanionComputedCycleIndex)
    ? Math.max(0, Math.trunc(perfectCompanionComputedCycleIndex))
    : current.perfectCompanionComputedCycleIndex ?? 0;
  const normalizedModelVersion = String(perfectCompanionModelVersion ?? '').trim();
  const idsSame = JSON.stringify(current.perfectCompanionIds ?? []) === JSON.stringify(normalizedIds);
  const reasonsSame =
    JSON.stringify(current.perfectCompanionReasons ?? {}) === JSON.stringify(normalizedReasons ?? {});
  const computedAtSame = (current.perfectCompanionComputedAtMs ?? null) === (normalizedComputedAtMs ?? null);
  const modelVersionSame = (current.perfectCompanionModelVersion ?? null) === (normalizedModelVersion || null);
  const cycleSame = (current.perfectCompanionComputedCycleIndex ?? null) === normalizedCycleIndex;
  if (idsSame && reasonsSame && computedAtSame && modelVersionSame && cycleSame) {
    return { record: current, changed: false };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    perfectCompanionIds: normalizedIds,
    perfectCompanionReasons: normalizedReasons,
    perfectCompanionComputedAtMs: normalizedComputedAtMs,
    perfectCompanionModelVersion: normalizedModelVersion || null,
    perfectCompanionComputedCycleIndex: normalizedCycleIndex,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_perfect_companion_snapshot',
  });
  return { record: next, changed: true };
}

export interface RewardBarRuntimeState {
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarClaimCountInEvent: number;
  rewardBarEscalationTier: number;
  rewardBarLastClaimAtMs: number | null;
  rewardBarBoundEventId: string | null;
  rewardBarLadderId: string | null;
  activeTimedEvent: IslandRunGameStateRecord['activeTimedEvent'];
  activeTimedEventProgress: IslandRunGameStateRecord['activeTimedEventProgress'];
  stickerProgress: IslandRunGameStateRecord['stickerProgress'];
  stickerInventory: IslandRunGameStateRecord['stickerInventory'];
}

export interface ApplyRewardBarStateOptions {
  session: Session;
  client: SupabaseClient | null;
  nextState: RewardBarRuntimeState;
  triggerSource?: string;
}

/**
 * Commits a full reward-bar / timed-event / sticker snapshot through the
 * store.
 *
 * Replaces the renderer's `applyContractV2RewardBarRuntimeState` inlined
 * `persistIslandRunRuntimeStatePatch` + paired `setRuntimeState`. The
 * reward-bar cascade is the highest-contention non-roll write (fires on
 * every reward-earning tile landing + every claim), so routing it through
 * the commit coordinator removes a class of overlap bugs where a tile
 * landing's bar progress could race an auto-claim's bar reset.
 */
export function applyRewardBarState(options: ApplyRewardBarStateOptions): IslandRunGameStateRecord {
  const { session, client, nextState, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    rewardBarProgress: nextState.rewardBarProgress,
    rewardBarThreshold: nextState.rewardBarThreshold,
    rewardBarClaimCountInEvent: nextState.rewardBarClaimCountInEvent,
    rewardBarEscalationTier: nextState.rewardBarEscalationTier,
    rewardBarLastClaimAtMs: nextState.rewardBarLastClaimAtMs,
    rewardBarBoundEventId: nextState.rewardBarBoundEventId,
    rewardBarLadderId: nextState.rewardBarLadderId,
    activeTimedEvent: nextState.activeTimedEvent,
    activeTimedEventProgress: nextState.activeTimedEventProgress,
    stickerProgress: nextState.stickerProgress,
    stickerInventory: nextState.stickerInventory,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_reward_bar_state',
  });
  return next;
}

export interface ApplyEssenceDriftTickOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Effective island number to price drift against (usually = currentIslandNumber). */
  effectiveIslandNumber: number;
  /** ms since the previous drift tick (may be larger than the 5-minute interval after sleep/suspend). */
  elapsedMs: number;
  triggerSource?: string;
}

export interface ApplyEssenceDriftTickResult {
  record: IslandRunGameStateRecord;
  /** Essence lost to drift on this tick. Zero when the island is built-out or the wallet is below threshold. */
  driftLost: number;
}

/**
 * Applies the 5-minute essence-drift interval tick through the store.
 *
 * Reads the live store snapshot for the wallet, stop states, and egg
 * ledger; computes drift via the pure {@link applyEssenceDrift} helper;
 * commits `{ essence, lastEssenceDriftLost }` only when drift actually
 * fires. When no essence was lost this is a cheap no-op — no commit, no
 * subscriber notification.
 *
 * Replaces the renderer's drift `useEffect` inlined `setRuntimeState` +
 * `persistIslandRunRuntimeStatePatch`. The `runtimeStateRef.current` reads
 * are replaced by a single store snapshot read so the drift computation
 * always sees a consistent view.
 */
export function applyEssenceDriftTick(options: ApplyEssenceDriftTickOptions): ApplyEssenceDriftTickResult {
  const { session, client, effectiveIslandNumber, elapsedMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  if (current.essence <= 0 || elapsedMs <= 0) {
    return { record: current, driftLost: 0 };
  }
  const islandKey = String(current.currentIslandNumber);
  const eggEntry = current.perIslandEggs?.[islandKey];
  const eggResolved = eggEntry?.status === 'collected' || eggEntry?.status === 'sold';
  const islandComplete = isIslandRunFullyClearedV2({
    stopStatesByIndex: current.stopStatesByIndex,
    stopBuildStateByIndex: current.stopBuildStateByIndex,
    hatcheryEggResolved: eggResolved,
  });
  const driftResult = applyEssenceDrift({
    essence: current.essence,
    islandNumber: effectiveIslandNumber,
    elapsedMs,
    isIslandComplete: islandComplete,
    remainingIslandCost: getRemainingIslandBuildCost({
      effectiveIslandNumber,
      stopBuildStateByIndex: current.stopBuildStateByIndex,
    }),
  });
  if (driftResult.driftLost <= 0) {
    return { record: current, driftLost: 0 };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    essence: driftResult.essence,
    lastEssenceDriftLost: driftResult.driftLost,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_essence_drift_tick',
  });
  return { record: next, driftLost: driftResult.driftLost };
}

// ── C4: Stop progress + ticket payment commits ──────────────────────────────

export interface SyncCompletedStopsForIslandOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  completedStops: string[];
  triggerSource?: string;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

const COMPLETED_STOP_CANONICAL_ORDER = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'] as const;

function normalizeCompletedStopsForSync(stops: string[]): string[] {
  const deduped = Array.from(new Set(
    stops
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ));
  return deduped.sort((a, b) => {
    const aIdx = COMPLETED_STOP_CANONICAL_ORDER.indexOf(a as (typeof COMPLETED_STOP_CANONICAL_ORDER)[number]);
    const bIdx = COMPLETED_STOP_CANONICAL_ORDER.indexOf(b as (typeof COMPLETED_STOP_CANONICAL_ORDER)[number]);
    const aKnown = aIdx >= 0;
    const bKnown = bIdx >= 0;
    if (aKnown && bKnown) return aIdx - bIdx;
    if (aKnown) return -1;
    if (bKnown) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Commits `completedStopsByIsland[islandNumber]` through the store path.
 *
 * Replaces renderer-side direct `writeIslandRunGameStateRecord` + paired
 * `setRuntimeState` writes so stop-completion updates no longer bypass the
 * commit coordinator.
 */
export function syncCompletedStopsForIsland(options: SyncCompletedStopsForIslandOptions): IslandRunGameStateRecord {
  const { session, client, islandNumber, completedStops, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(islandNumber);
  const currentStops = normalizeCompletedStopsForSync(current.completedStopsByIsland?.[islandKey] ?? []);
  const normalizedCompletedStops = normalizeCompletedStopsForSync(completedStops);
  if (areStringArraysEqual(currentStops, normalizedCompletedStops)) {
    return current;
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [islandKey]: normalizedCompletedStops,
    },
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'sync_completed_stops_for_island',
  });
  return next;
}

export interface ApplyStopTicketPaymentOptions {
  session: Session;
  client: SupabaseClient | null;
  essence: number;
  essenceLifetimeSpent: number;
  stopTicketsPaidByIsland: IslandRunGameStateRecord['stopTicketsPaidByIsland'];
  triggerSource?: string;
}

/**
 * Commits a successful stop-ticket purchase through the store path.
 */
export function applyStopTicketPayment(options: ApplyStopTicketPaymentOptions): IslandRunGameStateRecord {
  const { session, client, essence, essenceLifetimeSpent, stopTicketsPaidByIsland, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    essence,
    essenceLifetimeSpent,
    stopTicketsPaidByIsland,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_stop_ticket_payment',
  });
  return next;
}

export interface ApplyStopBuildSpendOptions {
  session: Session;
  client: SupabaseClient | null;
  essence: number;
  essenceLifetimeSpent: number;
  stopBuildStateByIndex: IslandRunGameStateRecord['stopBuildStateByIndex'];
  stopStatesByIndex: IslandRunGameStateRecord['stopStatesByIndex'];
  triggerSource?: string;
}

export interface ApplyStopBuildSpendBatchOptions {
  session: Session;
  client: SupabaseClient | null;
  stopIndex: number;
  effectiveIslandNumber: number;
  maxSteps: number;
  spendAmount?: number;
  triggerSource?: string;
}

export interface ApplyStopBuildSpendBatchResult {
  record: IslandRunGameStateRecord;
  stepsApplied: number;
}

export interface ApplyStopObjectiveProgressOptions {
  session: Session;
  client: SupabaseClient | null;
  stopStatesByIndex: IslandRunGameStateRecord['stopStatesByIndex'];
  activeStopIndex: IslandRunGameStateRecord['activeStopIndex'];
  activeStopType: IslandRunGameStateRecord['activeStopType'];
  triggerSource?: string;
}

/**
 * Commits contract-v2 stop objective progress through the store path.
 *
 * Replaces renderer-side patch writes used by hatchery objective completion.
 */
export function applyStopObjectiveProgress(options: ApplyStopObjectiveProgressOptions): IslandRunGameStateRecord {
  const {
    session,
    client,
    stopStatesByIndex,
    activeStopIndex,
    activeStopType,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    stopStatesByIndex,
    activeStopIndex,
    activeStopType,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_stop_objective_progress',
  });
  return next;
}

export interface ApplyEggPlacementOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  activeEggTier: NonNullable<IslandRunGameStateRecord['activeEggTier']>;
  activeEggSetAtMs: number;
  activeEggHatchDurationMs: number;
  perIslandEggEntry: PerIslandEggEntry;
  completedStops: string[];
  triggerSource?: string;
}

export interface ApplyHydrationEggReadyTransitionOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  hatchNowMs: number;
  triggerSource?: string;
}

export interface ApplyHydrationEggReadyTransitionResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

export interface ApplyEggResolutionOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  perIslandEggEntry: PerIslandEggEntry;
  completedStops: string[];
  essence?: number;
  essenceLifetimeEarned?: number;
  triggerSource?: string;
}

export interface ResolveReadyEggTerminalTransitionOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  terminalStatus: 'collected' | 'sold';
  openedAtMs: number;
  location?: PerIslandEggEntry['location'];
  completedStops: string[];
  rewardDeltas?: {
    essence?: number;
    essenceLifetimeEarned?: number;
    dicePool?: number;
    spinTokens?: number;
    shards?: number;
    diamonds?: number;
  };
  triggerSource?: string;
}

export interface ResolveReadyEggTerminalTransitionResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
  reason: 'resolved' | 'already_terminal' | 'not_ready' | 'missing_ledger_entry';
}

/**
 * Commits hatchery egg placement + completed-stop sync through the store path.
 *
 * Replaces renderer-side `persistIslandRunRuntimeStatePatch` writes from
 * `handleSetEgg` so egg lifecycle state and completed-stop ledger updates are
 * committed atomically through the store coordinator.
 */
export function applyEggPlacement(options: ApplyEggPlacementOptions): IslandRunGameStateRecord {
  const {
    session,
    client,
    islandNumber,
    activeEggTier,
    activeEggSetAtMs,
    activeEggHatchDurationMs,
    perIslandEggEntry,
    completedStops,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(islandNumber);
  const next: IslandRunGameStateRecord = {
    ...current,
    activeEggTier,
    activeEggSetAtMs,
    activeEggHatchDurationMs,
    activeEggIsDormant: false,
    perIslandEggs: { ...current.perIslandEggs, [islandKey]: perIslandEggEntry },
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [islandKey]: completedStops,
    },
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_egg_placement',
  });
  return next;
}

/**
 * Commits hydration-time incubating → ready egg-ledger transitions through the
 * canonical store path.
 *
 * This is intentionally narrow: it only updates one per-island egg ledger
 * entry when (a) that island has an egg entry, (b) the status is `incubating`,
 * and (c) `hatchNowMs >= hatchAtMs`.
 */
export function applyHydrationEggReadyTransition(
  options: ApplyHydrationEggReadyTransitionOptions,
): ApplyHydrationEggReadyTransitionResult {
  const { session, client, islandNumber, hatchNowMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(islandNumber);
  const ledgerEntry = current.perIslandEggs?.[islandKey];
  if (!ledgerEntry || ledgerEntry.status !== 'incubating') {
    return { record: current, changed: false };
  }
  if (!Number.isFinite(hatchNowMs) || hatchNowMs < ledgerEntry.hatchAtMs) {
    return { record: current, changed: false };
  }
  const next: IslandRunGameStateRecord = {
    ...current,
    perIslandEggs: {
      ...current.perIslandEggs,
      [islandKey]: {
        ...ledgerEntry,
        status: 'ready',
      },
    },
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_hydration_egg_ready_transition',
  });
  return { record: next, changed: true };
}

/**
 * Commits hatchery egg resolution (collect/sell) through the store path.
 *
 * Replaces renderer-side `persistIslandRunRuntimeStatePatch` + `setRuntimeState`
 * pairs in collect/sell handlers so active-egg clear + per-island egg ledger +
 * completed-stop ledger updates stay on one canonical commit path.
 */
export function applyEggResolution(options: ApplyEggResolutionOptions): IslandRunGameStateRecord {
  const {
    session,
    client,
    islandNumber,
    perIslandEggEntry,
    completedStops,
    essence,
    essenceLifetimeEarned,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(islandNumber);
  const next: IslandRunGameStateRecord = {
    ...current,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: { ...current.perIslandEggs, [islandKey]: perIslandEggEntry },
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [islandKey]: completedStops,
    },
    essence: essence ?? current.essence,
    essenceLifetimeEarned: essenceLifetimeEarned ?? current.essenceLifetimeEarned,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_egg_resolution',
  });
  return next;
}

/**
 * Canonical, idempotent hatchery terminal transition.
 *
 * Enforces `ready -> collected|sold` as the only reward-bearing path.
 * Any repeated call on a terminal egg is a no-op (`changed: false`).
 */
export function resolveReadyEggTerminalTransition(
  options: ResolveReadyEggTerminalTransitionOptions,
): ResolveReadyEggTerminalTransitionResult {
  const {
    session,
    client,
    islandNumber,
    terminalStatus,
    openedAtMs,
    location = 'island',
    completedStops,
    rewardDeltas,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const islandKey = String(islandNumber);
  const currentEntry = current.perIslandEggs?.[islandKey];
  if (!currentEntry) {
    return { record: current, changed: false, reason: 'missing_ledger_entry' };
  }
  if (currentEntry.status === 'collected' || currentEntry.status === 'sold') {
    return { record: current, changed: false, reason: 'already_terminal' };
  }
  if (currentEntry.status !== 'ready') {
    return { record: current, changed: false, reason: 'not_ready' };
  }

  const next: IslandRunGameStateRecord = {
    ...current,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {
      ...current.perIslandEggs,
      [islandKey]: {
        ...currentEntry,
        status: terminalStatus,
        openedAt: openedAtMs,
        location,
      },
    },
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [islandKey]: completedStops,
    },
    essence: Math.max(0, current.essence + (rewardDeltas?.essence ?? 0)),
    essenceLifetimeEarned: Math.max(0, current.essenceLifetimeEarned + (rewardDeltas?.essenceLifetimeEarned ?? 0)),
    dicePool: Math.max(0, current.dicePool + (rewardDeltas?.dicePool ?? 0)),
    spinTokens: Math.max(0, current.spinTokens + (rewardDeltas?.spinTokens ?? 0)),
    shards: Math.max(0, current.shards + (rewardDeltas?.shards ?? 0)),
    diamonds: Math.max(0, current.diamonds + (rewardDeltas?.diamonds ?? 0)),
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'resolve_ready_egg_terminal_transition',
  });
  return { record: next, changed: true, reason: 'resolved' };
}

/**
 * Commits a successful stop-build spend through the store path.
 *
 * Replaces renderer-side direct `writeIslandRunGameStateRecord` + paired
 * `setRuntimeState` writes for contract-v2 stop-build progression.
 */
export async function applyStopBuildSpend(options: ApplyStopBuildSpendOptions): Promise<IslandRunGameStateRecord> {
  const {
    session,
    client,
    essence,
    essenceLifetimeSpent,
    stopBuildStateByIndex,
    stopStatesByIndex,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  const next: IslandRunGameStateRecord = {
    ...current,
    essence,
    essenceLifetimeSpent,
    stopBuildStateByIndex,
    stopStatesByIndex,
    runtimeVersion: current.runtimeVersion + 1,
  };
  await commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_stop_build_spend',
  });
  return next;
}

/**
 * Applies up to `maxSteps` build spends atomically through one canonical commit.
 *
 * The per-step build spend math/rules are unchanged: this helper simply repeats
 * the existing `spendIslandRunContractV2EssenceOnStopBuild` operation in-memory
 * and commits once with the final valid result.
 */
export async function applyStopBuildSpendBatch(
  options: ApplyStopBuildSpendBatchOptions,
): Promise<ApplyStopBuildSpendBatchResult> {
  const {
    session,
    client,
    stopIndex,
    effectiveIslandNumber,
    maxSteps,
    spendAmount = 10,
    triggerSource,
  } = options;
  const current = getIslandRunStateSnapshot(session);
  if (stopIndex < 0 || stopIndex >= current.stopBuildStateByIndex.length) {
    return { record: current, stepsApplied: 0 };
  }

  const safeMaxSteps = Math.max(1, Math.floor(maxSteps));
  let nextEssence = current.essence;
  let nextEssenceLifetimeSpent = current.essenceLifetimeSpent;
  let nextStopBuildStateByIndex = current.stopBuildStateByIndex;
  let nextStopStatesByIndex = current.stopStatesByIndex;
  let stepsApplied = 0;

  for (let stepIndex = 0; stepIndex < safeMaxSteps; stepIndex += 1) {
    const spendResult = spendIslandRunContractV2EssenceOnStopBuild({
      islandRunContractV2Enabled: true,
      stopIndex,
      spendAmount,
      essence: nextEssence,
      essenceLifetimeSpent: nextEssenceLifetimeSpent,
      stopBuildStateByIndex: nextStopBuildStateByIndex,
      stopStatesByIndex: nextStopStatesByIndex,
      effectiveIslandNumber,
    });
    if (spendResult.spent < 1) break;
    nextEssence = spendResult.essence;
    nextEssenceLifetimeSpent = spendResult.essenceLifetimeSpent;
    nextStopBuildStateByIndex = spendResult.stopBuildStateByIndex;
    nextStopStatesByIndex = spendResult.stopStatesByIndex;
    stepsApplied += 1;
  }

  if (stepsApplied < 1) {
    return { record: current, stepsApplied: 0 };
  }

  const next: IslandRunGameStateRecord = {
    ...current,
    essence: nextEssence,
    essenceLifetimeSpent: nextEssenceLifetimeSpent,
    stopBuildStateByIndex: nextStopBuildStateByIndex,
    stopStatesByIndex: nextStopStatesByIndex,
    runtimeVersion: current.runtimeVersion + 1,
  };
  await commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_stop_build_spend_batch',
  });
  return { record: next, stepsApplied };
}

// ── C3: Island travel ────────────────────────────────────────────────────────

/** Maximum island number before the cycle wraps back to 1. Mirrors the
 *  constant inlined in `performIslandTravel` in the renderer. Update here if
 *  the game ever ships more islands. */
export const ISLAND_RUN_MAX_ISLAND = 120;

/** Effective island number = resolvedIsland + cycleIndex * 120. Mirrors the
 *  renderer helper; kept private to the action so callers don't have to
 *  thread it through. */
function effectiveIslandNumber(resolvedIsland: number, cycleIndex: number): number {
  return resolvedIsland + cycleIndex * ISLAND_RUN_MAX_ISLAND;
}

function buildTravelLuckyRollRunId(sessionKey: string, nowMs: number): string {
  const randomSuffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `island-run-lucky-roll:${sessionKey}:${nowMs}:${randomSuffix}`;
}

export interface TravelToNextIslandOptions {
  session: Session;
  client: SupabaseClient | null;
  /** The raw requested island number. May exceed {@link ISLAND_RUN_MAX_ISLAND};
   *  the action wraps it to `[1, 120]` and bumps `cycleIndex` on wrap. */
  nextIsland: number;
  /** When true (the normal case) the per-island timer starts immediately; when
   *  false the timer is left pending (`islandStartedAtMs/Expires = 0`) so the
   *  UI can start it on an explicit "Begin" tap. Matches the legacy
   *  `performIslandTravel({ startTimer })` option. */
  startTimer: boolean;
  /** Current wall-clock ms. Injected rather than read inside the action so
   *  tests can drive deterministic timing. */
  nowMs: number;
  /** Per-island timer duration in ms. Kept as a caller-supplied function so
   *  the renderer can own the duration curve without importing it into the
   *  service layer. */
  getIslandDurationMs: (islandNumber: number) => number;
  /** Contract-V2 feature flag. When enabled, the action resets `stopStatesByIndex`,
   *  `stopBuildStateByIndex`, `activeStopIndex`, and `activeStopType` for the
   *  new island. When false these fields are left untouched. */
  islandRunContractV2Enabled: boolean;
  triggerSource?: string;
}

export interface ApplyActivateCurrentIslandTimerOptions {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  cycleIndex: number;
  nowMs: number;
  durationMs: number;
  triggerSource?: string;
}

export interface ApplyActivateCurrentIslandTimerResult {
  record: IslandRunGameStateRecord;
  changed: boolean;
}

export interface TravelToNextIslandResult {
  /** The committed record. */
  record: IslandRunGameStateRecord;
  /** Island number the player arrived on after cycle-wrap resolution (1…120). */
  resolvedIsland: number;
  /** Cycle index after possible 120→1 wrap. */
  nextCycleIndex: number;
  /** The egg to show as "active" on the new island, or `null` when the slot
   *  should be empty. `null` is returned in three cases: (a) no egg was ever
   *  placed on the new island, (b) the previously-placed egg on the new
   *  island has since been collected / sold / converted to a ready animal
   *  (i.e. `perIslandEggs[newKey].status ∉ {'incubating','ready'}`), or (c)
   *  no `perIslandEggs[newKey]` entry exists at all. The renderer feeds
   *  this into its `setActiveEgg` React state. */
  restoredActiveEgg:
    | { tier: 'common' | 'rare' | 'mythic'; setAtMs: number; hatchAtMs: number; isDormant: boolean }
    | null;
}

export interface ResolveIslandRunTravelStateOptions {
  current: IslandRunGameStateRecord;
  nextIsland: number;
  startTimer: boolean;
  nowMs: number;
  getIslandDurationMs: (islandNumber: number) => number;
  islandRunContractV2Enabled: boolean;
}

/**
 * Commits "start current island timer" through the canonical store path.
 *
 * This models the pending-start CTA flow ("Start Island") where island
 * bookkeeping fields are already known locally and only the timer should move
 * from pending (`0/0`) to started (`nowMs` / `nowMs + durationMs`).
 *
 * Idempotency/no-op rule: if the current record already has a started timer
 * (`islandStartedAtMs > 0 && islandExpiresAtMs > 0`), this helper does
 * nothing and returns the current snapshot.
 */
export function applyActivateCurrentIslandTimer(
  options: ApplyActivateCurrentIslandTimerOptions,
): ApplyActivateCurrentIslandTimerResult {
  const { session, client, islandNumber, cycleIndex, nowMs, durationMs, triggerSource } = options;
  const current = getIslandRunStateSnapshot(session);

  if (current.islandStartedAtMs > 0 && current.islandExpiresAtMs > 0) {
    return { record: current, changed: false };
  }

  const normalizedNowMs = Number.isFinite(nowMs) ? Math.max(0, Math.trunc(nowMs)) : 0;
  const normalizedDurationMs = Number.isFinite(durationMs) ? Math.max(0, Math.trunc(durationMs)) : 0;
  const islandStartedAtMs = normalizedNowMs;
  const islandExpiresAtMs = normalizedNowMs + normalizedDurationMs;
  const nextIslandNumber = Number.isFinite(islandNumber) ? Math.max(1, Math.trunc(islandNumber)) : current.currentIslandNumber;
  const nextCycleIndex = Number.isFinite(cycleIndex) ? Math.max(0, Math.trunc(cycleIndex)) : current.cycleIndex;

  const next: IslandRunGameStateRecord = {
    ...current,
    currentIslandNumber: nextIslandNumber,
    cycleIndex: nextCycleIndex,
    islandStartedAtMs,
    islandExpiresAtMs,
    runtimeVersion: current.runtimeVersion + 1,
  };
  void commitIslandRunState({
    session,
    client,
    record: next,
    triggerSource: triggerSource ?? 'apply_activate_current_island_timer',
  });
  return { record: next, changed: true };
}

/**
 * Atomic island travel — THE named "atomic-travel refactor" risk from the Stage C spec.
 *
 * The legacy `performIslandTravel` in `IslandRunBoardPrototype.tsx` issued
 * four separate `persistIslandRunRuntimeStatePatch` calls in sequence:
 *   1. clear old-island maps (`completedStopsByIsland`, `stopTicketsPaidByIsland`,
 *      `bonusTileChargeByIsland`)
 *   2. save the old island's egg + restore the new island's egg (`perIslandEggs`,
 *      `activeEgg*`)
 *   3. [contract-v2] reset stop + build states (`stopStatesByIndex`,
 *      `stopBuildStateByIndex`, `activeStopIndex`, `activeStopType`)
 *   4. bump island bookkeeping (`currentIslandNumber`, `cycleIndex`,
 *      `bossTrialResolvedIslandNumber`, timer)
 *
 * Each patch went through `persistIslandRunRuntimeStatePatch`, which shallow-
 * merges against a fresh read of the record. If any of the four failed, or if
 * another writer (e.g. the roll service, reward bar) landed between two of
 * them, the travel ended up in a half-applied state: an old-island's
 * completedStops cleared but the new island's timer not started, or a new
 * cycle's egg ledger partially restored.
 *
 * This action collects every field that travel needs to mutate, applies them
 * to a single snapshot, and commits ONCE through {@link commitIslandRunState}.
 * The result: travel is either fully visible or not visible at all to
 * subscribers. `runtimeVersion` bumps exactly once.
 *
 * The action does NOT manage UI-only React state (e.g. `setRollValue(null)`,
 * timer ticker, feedback toasts) — the renderer still owns those and should
 * call them immediately after `travelToNextIsland`.
 */
export async function travelToNextIsland(options: TravelToNextIslandOptions): Promise<TravelToNextIslandResult> {
  const {
    session,
    client,
    nextIsland,
    startTimer,
    nowMs,
    getIslandDurationMs,
    islandRunContractV2Enabled,
    triggerSource,
  } = options;

  const current = getIslandRunStateSnapshot(session);
  const travelState = resolveIslandRunTravelState({
    current,
    nextIsland,
    startTimer,
    nowMs,
    getIslandDurationMs,
    islandRunContractV2Enabled,
  });

  await commitIslandRunState({
    session,
    client,
    record: travelState.record,
    triggerSource: triggerSource ?? 'travel_to_next_island',
  });

  return travelState;
}

export function resolveIslandRunTravelState(options: ResolveIslandRunTravelStateOptions): TravelToNextIslandResult {
  const {
    current,
    nextIsland,
    startTimer,
    nowMs,
    getIslandDurationMs,
    islandRunContractV2Enabled,
  } = options;

  // Cycle-wrap resolution (120 → 1 bumps cycleIndex).
  const wraps = nextIsland > ISLAND_RUN_MAX_ISLAND;
  const resolvedIsland = wraps
    ? ((nextIsland - 1) % ISLAND_RUN_MAX_ISLAND) + 1
    : Math.max(1, nextIsland);
  const nextCycleIndex = wraps ? current.cycleIndex + 1 : current.cycleIndex;

  const oldIslandKey = String(current.currentIslandNumber);
  const newIslandKey = String(resolvedIsland);

  // ── Egg save/restore ────────────────────────────────────────────────────
  // Save the old island's active egg (if any) into perIslandEggs, then check
  // whether the new island has a previously-placed egg to restore.
  const currentPerIslandEggs = current.perIslandEggs ?? {};
  const updatedPerIslandEggs: Record<string, PerIslandEggEntry> = { ...currentPerIslandEggs };

  const hasActiveEgg = current.activeEggTier !== null
    && current.activeEggSetAtMs !== null
    && current.activeEggHatchDurationMs !== null;

  if (hasActiveEgg) {
    const setAtMs = current.activeEggSetAtMs as number;
    const hatchAtMs = setAtMs + (current.activeEggHatchDurationMs as number);
    const isReady = nowMs >= hatchAtMs;
    updatedPerIslandEggs[oldIslandKey] = {
      tier: current.activeEggTier as 'common' | 'rare' | 'mythic',
      setAtMs,
      hatchAtMs,
      status: isReady ? 'ready' : 'incubating',
      location: isReady ? 'dormant' : 'island',
    };
  }

  // Restore the new island's egg only when it's still incubating or ready.
  // Collected/sold eggs stay in the ledger but must not repopulate the slot.
  const newIslandEntry = updatedPerIslandEggs[newIslandKey];
  let restoredActiveEgg: TravelToNextIslandResult['restoredActiveEgg'] = null;
  let nextActiveEggTier: IslandRunGameStateRecord['activeEggTier'] = null;
  let nextActiveEggSetAtMs: IslandRunGameStateRecord['activeEggSetAtMs'] = null;
  let nextActiveEggHatchDurationMs: IslandRunGameStateRecord['activeEggHatchDurationMs'] = null;
  let nextActiveEggIsDormant = false;

  if (
    newIslandEntry
    && (newIslandEntry.status === 'incubating' || newIslandEntry.status === 'ready')
  ) {
    const isNowReady = nowMs >= newIslandEntry.hatchAtMs;
    const isDormant = isNowReady || newIslandEntry.location === 'dormant';
    restoredActiveEgg = {
      tier: newIslandEntry.tier,
      setAtMs: newIslandEntry.setAtMs,
      hatchAtMs: newIslandEntry.hatchAtMs,
      isDormant,
    };
    nextActiveEggTier = newIslandEntry.tier;
    nextActiveEggSetAtMs = newIslandEntry.setAtMs;
    nextActiveEggHatchDurationMs = newIslandEntry.hatchAtMs - newIslandEntry.setAtMs;
    nextActiveEggIsDormant = isDormant;
  }

  // ── Contract-V2 stop/build reset ───────────────────────────────────────
  // Fresh stop objective + build states for the new island. When the flag is
  // off these fields are left untouched.
  let nextStopStatesByIndex = current.stopStatesByIndex;
  let nextStopBuildStateByIndex = current.stopBuildStateByIndex;
  let nextActiveStopIndex = current.activeStopIndex;
  let nextActiveStopType = current.activeStopType;

  if (islandRunContractV2Enabled) {
    nextStopStatesByIndex = Array.from({ length: 5 }, () => ({
      objectiveComplete: false,
      buildComplete: false,
    }));
    nextStopBuildStateByIndex = initStopBuildStatesForIsland(
      effectiveIslandNumber(resolvedIsland, nextCycleIndex),
    );
    nextActiveStopIndex = 0;
    nextActiveStopType = 'hatchery';
  }

  // ── Timer ─────────────────────────────────────────────────────────────
  const preIslandLuckyRollGate = resolveIslandRunPreIslandLuckyRollGate({
    featureEnabled: isIslandRunFeatureEnabled('islandRunPreIslandLuckyRollEnabled'),
    islandNumber: resolvedIsland,
    cycleIndex: nextCycleIndex,
    luckyRollSessionsByMilestone: current.luckyRollSessionsByMilestone,
  });
  const shouldCreatePreIslandLuckyRollSession = preIslandLuckyRollGate.status === 'required_missing_session'
    && preIslandLuckyRollGate.sessionKey !== null;
  const nextLuckyRollSessionsByMilestone = shouldCreatePreIslandLuckyRollSession
    ? {
        ...current.luckyRollSessionsByMilestone,
        [preIslandLuckyRollGate.sessionKey as string]: {
          status: 'active',
          runId: buildTravelLuckyRollRunId(preIslandLuckyRollGate.sessionKey as string, nowMs),
          targetIslandNumber: resolvedIsland,
          cycleIndex: nextCycleIndex,
          position: 0,
          rollsUsed: 0,
          claimedTileIds: [],
          pendingRewards: [],
          bankedRewards: [],
          startedAtMs: nowMs,
          bankedAtMs: null,
          updatedAtMs: nowMs,
        } satisfies IslandRunLuckyRollSession,
      }
    : current.luckyRollSessionsByMilestone;
  const shouldKeepTimerPendingForPreIslandLuckyRoll = preIslandLuckyRollGate.blocksIslandStart;
  const effectiveStartTimer = startTimer && !shouldKeepTimerPendingForPreIslandLuckyRoll;
  const durationMs = getIslandDurationMs(resolvedIsland);
  const islandStartedAtMs = effectiveStartTimer ? nowMs : 0;
  const islandExpiresAtMs = effectiveStartTimer ? nowMs + durationMs : 0;

  // ── Single atomic commit ──────────────────────────────────────────────
  // Shallow-overlay the three per-island Record maps so the old island's
  // entries are explicitly cleared but other islands' entries are preserved.
  // This mirrors the patch-merge semantics of `persistIslandRunRuntimeStatePatch`
  // while consolidating into one commit.
  const next: IslandRunGameStateRecord = {
    ...current,
    completedStopsByIsland: {
      ...current.completedStopsByIsland,
      [oldIslandKey]: [],
    },
    stopTicketsPaidByIsland: {
      ...(current.stopTicketsPaidByIsland ?? {}),
      [oldIslandKey]: [],
    },
    bonusTileChargeByIsland: {
      ...(current.bonusTileChargeByIsland ?? {}),
      [oldIslandKey]: {},
    },
    perIslandEggs: updatedPerIslandEggs,
    activeEggTier: nextActiveEggTier,
    activeEggSetAtMs: nextActiveEggSetAtMs,
    activeEggHatchDurationMs: nextActiveEggHatchDurationMs,
    activeEggIsDormant: nextActiveEggIsDormant,
    stopStatesByIndex: nextStopStatesByIndex,
    stopBuildStateByIndex: nextStopBuildStateByIndex,
    activeStopIndex: nextActiveStopIndex,
    activeStopType: nextActiveStopType,
    luckyRollSessionsByMilestone: nextLuckyRollSessionsByMilestone,
    currentIslandNumber: resolvedIsland,
    cycleIndex: nextCycleIndex,
    bossTrialResolvedIslandNumber: null,
    islandStartedAtMs,
    islandExpiresAtMs,
    runtimeVersion: current.runtimeVersion + 1,
  };

  return {
    record: next,
    resolvedIsland,
    nextCycleIndex,
    restoredActiveEgg,
  };
}
