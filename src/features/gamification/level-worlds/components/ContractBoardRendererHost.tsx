/**
 * ContractBoardRendererHost — thin PWA adapter host for the ContractBoardRenderer.
 *
 * Responsibilities:
 *  1. Reads live IslandRunRuntimeState from the canonical PWA source (readIslandRunRuntimeState).
 *  2. Re-reads on a polling interval, cross-tab `storage` events, and `visibilitychange` to
 *     stay synchronized with gameplay changes written by the active IslandRunBoardPrototype.
 *  3. Derives a BoardRendererContractV1 snapshot via selectBoardRendererContractV1 (the PWA adapter).
 *  4. Passes the contract snapshot to <ContractBoardRenderer> for pure presentation.
 *  5. Routes `roll_requested` intents to the PWA roll-action pipeline (executeIslandRunRollAction).
 *  6. Keeps all other intents (claim, openStop, spendEssence, etc.) as no-op/logged — they are
 *     intentionally unwired in this slice and will be enabled in future stages.
 *
 * Architecture:
 *  - The renderer emits intents; this host resolves them via PWA services.
 *  - Renderer never owns or generates gameplay truth (dice, movement, rewards, state).
 *  - Roll outcomes (random numbers, token position) are produced entirely in
 *    executeIslandRunRollAction — never in the renderer component.
 *
 * This host must NOT:
 *  - let the renderer decide dice values or token movement
 *  - replicate fixture/demo data
 *
 * Feature flag: island_run_contract_renderer (default OFF).
 * Toggle: ?island_run_contract_renderer=1  OR  localStorage feature_flag_island_run_contract_renderer=1
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import { readIslandRunRuntimeState, type IslandRunRuntimeState } from '../services/islandRunRuntimeState';
import { selectBoardRendererContractV1 } from '../services/islandRunBoardRendererAdapterV1';
import type { BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';
import { executeIslandRunRollAction } from '../services/islandRunRollAction';
import { ContractBoardRenderer } from './ContractBoardRenderer';

export interface ContractBoardRendererHostProps {
  session: Session;
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
  // ── Supabase client (for remote state persistence on roll) ────────────────
  // Mirrors the pattern used by IslandRunBoardPrototype.
  const { client } = useSupabaseAuth();

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

  // ── roll busy guard ────────────────────────────────────────────────────────
  // Prevents concurrent roll dispatches and surfaces the busy state to the
  // renderer via the contract's ui.busy.roll flag.
  const [busyRoll, setBusyRoll] = useState(false);

  // ── intent handler ─────────────────────────────────────────────────────────
  /**
   * Routes renderer intents to PWA gameplay actions.
   *
   * Only `roll_requested` is wired in this slice; all other intents are
   * intentionally no-op/logged and will be connected in future stages.
   *
   * Architecture note: the renderer emits intent signals only — it never
   * generates gameplay outcomes (dice values, token movement, rewards).
   * Those always originate in PWA services (executeIslandRunRollAction).
   */
  const handleIntent = useCallback((intent: BoardRendererContractV1Intent) => {
    if (intent.type === 'roll_requested') {
      if (busyRoll) {
        if (import.meta.env.DEV) {
          console.log('[ContractBoardRendererHost] roll already in progress, ignoring duplicate intent');
        }
        return;
      }

      setBusyRoll(true);
      void executeIslandRunRollAction({ session, client })
        .then((result) => {
          if (import.meta.env.DEV) {
            console.log('[ContractBoardRendererHost] roll result:', result);
          }
          // Refresh state from localStorage now that the roll has been persisted.
          // (Same-tab writes do not trigger the storage event, so we refresh manually.)
          refreshFromStorage();
        })
        .catch((err: unknown) => {
          if (import.meta.env.DEV) {
            console.error('[ContractBoardRendererHost] roll error:', err);
          }
        })
        .finally(() => {
          setBusyRoll(false);
        });
      return;
    }

    // All other intents remain no-op in this slice.
    // They will be wired in future integration stages.
    if (import.meta.env.DEV) {
      console.log('[ContractBoardRendererHost] intent (no-op — not yet wired):', intent);
    }
  }, [busyRoll, client, refreshFromStorage, session]);

  // ── derive renderer contract ───────────────────────────────────────────────
  // Pass the live busy.roll flag so the renderer can disable the button
  // during the async roll and re-enable it when done.
  const contract = useMemo(
    () =>
      selectBoardRendererContractV1({
        runtimeState,
        islandNumber: runtimeState.currentIslandNumber,
        nowMs: Date.now(),
        busy: { roll: busyRoll },
      }),
    [runtimeState, busyRoll],
  );

  return (
    <ContractBoardRenderer
      contract={contract}
      onIntent={handleIntent}
      islandNumber={runtimeState.currentIslandNumber}
    />
  );
}
