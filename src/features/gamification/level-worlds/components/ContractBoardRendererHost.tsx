/**
 * ContractBoardRendererHost — thin PWA adapter host for the read-only ContractBoardRenderer.
 *
 * Responsibilities:
 *  1. Reads live IslandRunRuntimeState from the canonical PWA source (readIslandRunRuntimeState).
 *  2. Re-reads on a polling interval, cross-tab `storage` events, and `visibilitychange` to
 *     stay synchronized with gameplay changes written by the active IslandRunBoardPrototype.
 *  3. Derives a BoardRendererContractV1 snapshot via selectBoardRendererContractV1 (the PWA adapter).
 *  4. Passes the contract snapshot to <ContractBoardRenderer> for pure presentation.
 *  5. Supplies no-op intent handlers — all intents are console-logged only; no gameplay mutations.
 *
 * This host must NOT:
 *  - mutate gameplay state
 *  - own progression rules or dice logic
 *  - replicate fixture/demo data
 *
 * Feature flag: island_run_contract_renderer (default OFF).
 * Toggle: ?island_run_contract_renderer=1  OR  localStorage feature_flag_island_run_contract_renderer=1
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { readIslandRunRuntimeState, type IslandRunRuntimeState } from '../services/islandRunRuntimeState';
import { selectBoardRendererContractV1 } from '../services/islandRunBoardRendererAdapterV1';
import type { BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';
import { ContractBoardRenderer } from './ContractBoardRenderer';

export interface ContractBoardRendererHostProps {
  session: Session;
}

/**
 * No-op intent handler: logs the intent for debugging but performs no gameplay mutations.
 * Replace with real PWA action dispatch in a future slice when intent wiring is ready.
 */
function handleIntentNoOp(intent: BoardRendererContractV1Intent): void {
  if (import.meta.env.DEV) {
    console.log('[ContractBoardRendererHost] intent (read-only, no-op):', intent);
  }
}

/** Polling interval for re-reading runtime state from localStorage (ms). */
const LIVE_POLL_INTERVAL_MS = 2_000;

/** localStorage key prefix used by the game state store — must match islandRunGameStateStore. */
const STORAGE_KEY_PREFIX = 'island_run_runtime_state_';

/**
 * Shallow-compare two IslandRunRuntimeState snapshots by a fast proxy:
 * runtimeVersion, tokenIndex, essence, currentIslandNumber, rewardBarProgress,
 * dicePool, and activeStopIndex. A full deep-equal would be wasteful; these
 * seven fields change on every meaningful mutation.
 */
function hasRuntimeStateChanged(prev: IslandRunRuntimeState, next: IslandRunRuntimeState): boolean {
  return (
    prev.runtimeVersion !== next.runtimeVersion ||
    prev.tokenIndex !== next.tokenIndex ||
    prev.essence !== next.essence ||
    prev.currentIslandNumber !== next.currentIslandNumber ||
    prev.rewardBarProgress !== next.rewardBarProgress ||
    prev.dicePool !== next.dicePool ||
    prev.activeStopIndex !== next.activeStopIndex
  );
}

export function ContractBoardRendererHost({ session }: ContractBoardRendererHostProps) {
  // ── live runtime state ─────────────────────────────────────────────────────
  // Initialize from the canonical PWA localStorage source, then keep in sync
  // via polling + storage events + visibilitychange — strictly read-only.
  const [runtimeState, setRuntimeState] = useState<IslandRunRuntimeState>(
    () => readIslandRunRuntimeState(session),
  );
  const runtimeStateRef = useRef(runtimeState);
  useEffect(() => { runtimeStateRef.current = runtimeState; }, [runtimeState]);

  /** Re-read localStorage and update React state only when meaningful fields changed. */
  const refreshFromStorage = useCallback(() => {
    const next = readIslandRunRuntimeState(session);
    if (hasRuntimeStateChanged(runtimeStateRef.current, next)) {
      setRuntimeState(next);
      if (import.meta.env.DEV) {
        console.log('[ContractBoardRendererHost] runtime state refreshed', {
          prevVersion: runtimeStateRef.current.runtimeVersion,
          nextVersion: next.runtimeVersion,
        });
      }
    }
  }, [session]);

  useEffect(() => {
    // 1. Polling interval — picks up in-tab mutations persisted by the prototype.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshFromStorage();
      }
    }, LIVE_POLL_INTERVAL_MS);

    // 2. Cross-tab storage event — fires when another tab writes to localStorage.
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(STORAGE_KEY_PREFIX)) {
        refreshFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. Visibility change — re-read when user returns to this tab.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromStorage();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // 4. Window focus — re-read on focus return (covers PWA alt-tab).
    const onFocus = () => { refreshFromStorage(); };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshFromStorage]);

  // ── derive renderer contract ───────────────────────────────────────────────
  const contract = useMemo(
    () =>
      selectBoardRendererContractV1({
        runtimeState,
        islandNumber: runtimeState.currentIslandNumber,
        nowMs: Date.now(),
      }),
    [runtimeState],
  );

  return (
    <ContractBoardRenderer
      contract={contract}
      onIntent={handleIntentNoOp}
      islandNumber={runtimeState.currentIslandNumber}
    />
  );
}
