/**
 * ContractBoardRendererHost — thin PWA adapter host for the read-only ContractBoardRenderer.
 *
 * Responsibilities:
 *  1. Reads live IslandRunRuntimeState from the canonical PWA source (readIslandRunRuntimeState).
 *  2. Derives a BoardRendererContractV1 snapshot via selectBoardRendererContractV1 (the PWA adapter).
 *  3. Passes the contract snapshot to <ContractBoardRenderer> for pure presentation.
 *  4. Supplies no-op intent handlers — all intents are console-logged only; no gameplay mutations.
 *
 * This host must NOT:
 *  - mutate gameplay state
 *  - own progression rules or dice logic
 *  - replicate fixture/demo data
 *
 * Feature flag: island_run_contract_renderer (default OFF).
 * Toggle: ?island_run_contract_renderer=1  OR  localStorage feature_flag_island_run_contract_renderer=1
 */

import { useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { readIslandRunRuntimeState } from '../services/islandRunRuntimeState';
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

export function ContractBoardRendererHost({ session }: ContractBoardRendererHostProps) {
  // Read canonical PWA runtime state — this is the authoritative gameplay truth source.
  // Runtime state is keyed by user ID in localStorage, so session.user.id is the
  // correct dependency. Session token/metadata changes do not affect state storage.
  // Live subscription to runtime state changes is intentionally deferred to a future slice.
  const runtimeState = useMemo(
    () => readIslandRunRuntimeState(session),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.user.id],
  );

  // Derive the renderer contract from PWA state via the canonical adapter.
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
