import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getIslandRunRuntimeStateBackend } from './islandRunRuntimeStateBackend';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import type { PerIslandEggsLedger } from './islandRunGameStateStore';

export interface IslandRunRuntimeState {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  currentIslandNumber: number;
  bossTrialResolvedIslandNumber: number | null;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
  perIslandEggs: PerIslandEggsLedger;
}

export function readIslandRunRuntimeState(session: Session): IslandRunRuntimeState {
  return getIslandRunRuntimeStateBackend().read(session);
}

export async function hydrateIslandRunRuntimeState(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<IslandRunRuntimeState> {
  const { session, client } = options;
  return getIslandRunRuntimeStateBackend().hydrate({ session, client });
}

export async function hydrateIslandRunRuntimeStateWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<{
  state: IslandRunRuntimeState;
  source: IslandRunRuntimeHydrationSource;
}> {
  const { session, client } = options;
  return getIslandRunRuntimeStateBackend().hydrateWithSource({ session, client });
}

export async function persistIslandRunRuntimeStatePatch(options: {
  session: Session;
  client: SupabaseClient | null;
  patch: {
    firstRunClaimed?: boolean;
    dailyHeartsClaimedDayKey?: string | null;
    onboardingComplete?: boolean;
    currentIslandNumber?: number;
    bossTrialResolvedIslandNumber?: number | null;
    activeEggTier?: 'common' | 'rare' | 'mythic' | null;
    activeEggSetAtMs?: number | null;
    activeEggHatchDurationMs?: number | null;
    activeEggIsDormant?: boolean;
    perIslandEggs?: PerIslandEggsLedger;
  };
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, patch } = options;
  return getIslandRunRuntimeStateBackend().persistPatch({ session, client, patch });
}
