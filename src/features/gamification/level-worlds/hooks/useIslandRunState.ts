/**
 * useIslandRunState — the single React entry point to the authoritative
 * Island Run gameplay state.
 *
 * Consumers receive the current {@link IslandRunGameStateRecord} and a set
 * of commit helpers. The hook uses `useSyncExternalStore` so it is safe
 * under React strict-mode double-invocation and concurrent rendering —
 * no tearing, no "effect mirrors store" race.
 *
 * Usage (target renderer, post stage-C migration):
 *   const { state, commit, hydrate } = useIslandRunState(session, client);
 *   // Read state.dicePool directly — do NOT mirror into a local useState.
 *
 * During stages B–C of the refactor, call-sites inside the renderer may
 * still hold legacy `useState` mirrors; new code must use this hook
 * exclusively for gameplay-state reads.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from '../services/islandRunGameStateStore';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
  hydrateIslandRunState,
  subscribeIslandRunState,
  type CommitIslandRunStateResult,
  type HydrateIslandRunStateResult,
} from '../services/islandRunStateStore';

export interface UseIslandRunStateBindings {
  /** Current authoritative record for the session's user. Stable between mutations. */
  state: IslandRunGameStateRecord;
  /**
   * Commits a new full record to the store. Prefer to build `nextRecord`
   * from a `read → compute` pair held inside an action service (see
   * {@link executeIslandRunRollAction}) rather than building it inline in a
   * component — actions need a per-action mutex for correctness.
   */
  commit: (nextRecord: IslandRunGameStateRecord, triggerSource?: string) => Promise<CommitIslandRunStateResult>;
  /**
   * Triggers a hydration from localStorage + Supabase. Call on mount and
   * on window focus / visibility change. Always safe to call concurrently
   * with in-flight commits; the coordinator handles overlap.
   */
  hydrate: (opts?: { forceRemote?: boolean }) => Promise<HydrateIslandRunStateResult>;
}

/**
 * React hook binding a component to the Island Run state store for the
 * given session.
 */
export function useIslandRunState(
  session: Session,
  client: SupabaseClient | null,
): UseIslandRunStateBindings {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeIslandRunState(session, onStoreChange),
    [session],
  );
  const getSnapshot = useCallback(() => getIslandRunStateSnapshot(session), [session]);

  // SSR getServerSnapshot: return the same snapshot; the underlying
  // `readIslandRunGameStateRecord` already returns the default record when
  // there is no `window`, so this is safe.
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const commit = useCallback(
    (nextRecord: IslandRunGameStateRecord, triggerSource?: string) =>
      commitIslandRunState({ session, client, record: nextRecord, triggerSource }),
    [session, client],
  );

  const hydrate = useCallback(
    (opts?: { forceRemote?: boolean }) =>
      hydrateIslandRunState({ session, client, forceRemote: opts?.forceRemote }),
    [session, client],
  );

  return { state, commit, hydrate };
}
