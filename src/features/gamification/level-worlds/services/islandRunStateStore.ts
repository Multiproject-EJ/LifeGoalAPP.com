/**
 * islandRunStateStore — the single authoritative in-memory mirror of
 * {@link IslandRunGameStateRecord}, with subscribe/commit/hydrate/reset.
 *
 * This module is introduced by the Island Run state-architecture refactor
 * (Apr 2026). It is the *target* authority on which all gameplay actions
 * will eventually converge:
 *
 * - **Reads** come from {@link getIslandRunStateSnapshot} (or via the
 *   `useIslandRunState` React hook). The snapshot is a stable reference —
 *   consecutive calls with no mutation return the same object, which makes
 *   it safe for `useSyncExternalStore`.
 * - **Mutations** flow through {@link commitIslandRunState}, which delegates
 *   to the existing low-level writer {@link writeIslandRunGameStateRecord}
 *   (single-flight coordinator, conflict merge, pending-write queue,
 *   Supabase RPC, localStorage sync). The store mirror is updated *before*
 *   the remote write is awaited so subscribers see the new value immediately
 *   and the UI does not have to wait on the network round-trip.
 * - **Hydration** flows through {@link hydrateIslandRunState}, which delegates
 *   to {@link hydrateIslandRunGameStateRecordWithSource} and then notifies
 *   subscribers. Hydration always overwrites the mirror (it is the "truth
 *   from the server or localStorage") and never loses a pending local
 *   mutation, because the mirror already reflects any commit issued against
 *   it — the hydration result will have been merged through the commit
 *   coordinator if a write was in flight.
 *
 * Concurrency invariants (preserved from the underlying store):
 *  - A `commitIslandRunState` call is serialised through the existing
 *    single-flight coordinator. Callers that need strict ordering
 *    (e.g. gameplay actions) should additionally hold a per-action mutex
 *    so they `read → compute → commit` on consistent state. The roll
 *    service's `rollActionMutexes` is the canonical example.
 *  - A `hydrateIslandRunState` call is safe to run concurrently with
 *    commits; the coordinator already handles the overlap.
 *
 * Out of scope for this file: gameplay logic. Actions live in
 * `islandRunRollAction.ts` and (in later refactor stages) in
 * `islandRunStateActions.ts`. This module is purely the observer +
 * delegate layer on top of the existing record store.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateHydrationSource,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';

// ── per-user mirror + listener registry ──────────────────────────────────────

interface UserSlot {
  /** Last known record for this user. Stable reference until `publish()` runs. */
  snapshot: IslandRunGameStateRecord;
  /** Set of subscribers waiting for snapshot changes. */
  listeners: Set<() => void>;
}

const slotsByUser = new Map<string, UserSlot>();

function getSlot(session: Session): UserSlot {
  const userId = session.user.id;
  let slot = slotsByUser.get(userId);
  if (!slot) {
    slot = {
      snapshot: readIslandRunGameStateRecord(session),
      listeners: new Set(),
    };
    slotsByUser.set(userId, slot);
  }
  return slot;
}

function publish(slot: UserSlot, next: IslandRunGameStateRecord): void {
  if (slot.snapshot === next) return;
  slot.snapshot = next;
  // Snapshot listeners into an array so a listener that unsubscribes during
  // notification (common with React effects) does not perturb the iteration.
  for (const listener of Array.from(slot.listeners)) {
    try {
      listener();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[IslandRunStateStore] subscriber threw:', err);
    }
  }
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current in-memory snapshot for the session's user.
 *
 * Guaranteed to return the *same object reference* between publications, so
 * `useSyncExternalStore` can use referential equality to decide whether to
 * re-render. On the very first call for a user, the mirror is lazily
 * initialised from localStorage via {@link readIslandRunGameStateRecord}.
 */
export function getIslandRunStateSnapshot(session: Session): IslandRunGameStateRecord {
  return getSlot(session).snapshot;
}

/**
 * Subscribes to snapshot changes for the session's user. The listener is
 * invoked after the in-memory mirror has been updated (i.e. the next
 * `getIslandRunStateSnapshot` call is guaranteed to return the new value).
 *
 * Returns an unsubscribe function. Safe to unsubscribe from inside the
 * listener itself.
 */
export function subscribeIslandRunState(
  session: Session,
  listener: () => void,
): () => void {
  const slot = getSlot(session);
  slot.listeners.add(listener);
  return () => {
    slot.listeners.delete(listener);
  };
}

export interface CommitIslandRunStateOptions {
  session: Session;
  client: SupabaseClient | null;
  /** The full next record to commit. Should already carry an incremented `runtimeVersion`. */
  record: IslandRunGameStateRecord;
  /**
   * Tag for telemetry / debug log correlation. Forwarded to the underlying
   * writer via its `triggerSource` parameter.
   */
  triggerSource?: string;
}

export type CommitIslandRunStateResult =
  | { ok: true }
  | { ok: false; errorMessage: string };

/**
 * Commits a full record for the session's user.
 *
 * Semantics:
 *  1. The in-memory mirror is updated synchronously and subscribers are
 *     notified, so the UI reflects the new state without waiting for the
 *     remote round-trip. This matches the existing writer's behaviour,
 *     which updates localStorage synchronously at the top of its body.
 *  2. The existing {@link writeIslandRunGameStateRecord} is invoked to
 *     perform the Supabase commit (with single-flight coordination,
 *     conflict merge, pending-write queue, backoff). The promise resolves
 *     once the remote write has completed (or been parked).
 *
 * Callers that need `read → compute → commit` atomicity (the roll service
 * is the archetype) must hold their own per-action mutex — the store does
 * not serialise multiple concurrent commit calls against the same record,
 * only against the remote write.
 */
export async function commitIslandRunState(
  options: CommitIslandRunStateOptions,
): Promise<CommitIslandRunStateResult> {
  const { session, client, record, triggerSource } = options;
  const slot = getSlot(session);

  // 1. Update the in-memory mirror before awaiting the remote write so
  //    subscribers (UI) do not block on the network. The underlying writer
  //    also updates localStorage synchronously, so the two authoritative
  //    client-side mirrors stay in lockstep.
  publish(slot, record);

  // 2. Delegate persistence to the existing writer (owns single-flight +
  //    conflict merge + pending-write queue + backoff).
  return writeIslandRunGameStateRecord({
    session,
    client,
    record,
    triggerSource: triggerSource ?? 'state_store_commit',
  });
}

export interface HydrateIslandRunStateOptions {
  session: Session;
  client: SupabaseClient | null;
  forceRemote?: boolean;
}

export interface HydrateIslandRunStateResult {
  record: IslandRunGameStateRecord;
  source: IslandRunGameStateHydrationSource;
}

/**
 * Hydrates the in-memory mirror from the canonical hydration path
 * ({@link hydrateIslandRunGameStateRecordWithSource}) and notifies
 * subscribers. Returns the hydrated record and its source for telemetry.
 */
export async function hydrateIslandRunState(
  options: HydrateIslandRunStateOptions,
): Promise<HydrateIslandRunStateResult> {
  const { session, client, forceRemote } = options;
  const slot = getSlot(session);
  const result = await hydrateIslandRunGameStateRecordWithSource({ session, client, forceRemote });
  publish(slot, result.record);
  return result;
}

/**
 * Resets the in-memory mirror for a user to a supplied record and notifies
 * subscribers. Used by progress-reset flows and by tests — no remote write
 * is performed.
 */
export function resetIslandRunStateSnapshot(
  session: Session,
  record: IslandRunGameStateRecord,
): void {
  publish(getSlot(session), record);
}

// ── mirror sync helpers (C1) ────────────────────────────────────────────────

/**
 * Reads the current localStorage record for the session's user and
 * publishes it as the in-memory mirror. Subscribers are notified if the
 * record differs from the current snapshot.
 *
 * **No remote write is performed.** This is designed for use after an
 * external writer (e.g. the roll-action service) has already committed to
 * localStorage — the mirror just needs to catch up.
 */
export function refreshIslandRunStateFromLocal(session: Session): void {
  const slot = getSlot(session);
  const fresh = readIslandRunGameStateRecord(session);
  publish(slot, fresh);
}

/**
 * Applies a shallow patch to the in-memory mirror and publishes the
 * result. **No persistence (localStorage / Supabase) is performed.**
 *
 * Intended for shim setters during the Stage-C migration: the caller
 * updates the store mirror immediately so `useSyncExternalStore` triggers
 * a re-render, and an existing `persistIslandRunRuntimeStatePatch` call at
 * the same call-site handles durable storage.
 */
export function patchIslandRunStateSnapshot(
  session: Session,
  patch: Partial<IslandRunGameStateRecord>,
): void {
  const slot = getSlot(session);
  publish(slot, { ...slot.snapshot, ...patch });
}

// ── test hooks ───────────────────────────────────────────────────────────────

/**
 * @internal
 * Clears all per-user slots. Used by test harness to ensure hermetic runs.
 * Not exported from any barrel.
 */
export function __resetIslandRunStateStoreForTests(): void {
  slotsByUser.clear();
}

/**
 * @internal
 * Returns the number of active subscribers for a session. Test-only helper
 * to verify hook cleanup semantics.
 */
export function __getIslandRunStateSubscriberCountForTests(session: Session): number {
  return slotsByUser.get(session.user.id)?.listeners.size ?? 0;
}
