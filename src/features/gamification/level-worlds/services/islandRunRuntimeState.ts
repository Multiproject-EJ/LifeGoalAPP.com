import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getIslandRunRuntimeStateBackend } from './islandRunRuntimeStateBackend';

export interface IslandRunRuntimeState {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
}

export function readIslandRunRuntimeState(session: Session): IslandRunRuntimeState {
  return getIslandRunRuntimeStateBackend().read(session);
}

export async function persistIslandRunRuntimeStatePatch(options: {
  session: Session;
  client: SupabaseClient | null;
  patch: {
    firstRunClaimed?: boolean;
    dailyHeartsClaimedDayKey?: string | null;
    onboardingComplete?: boolean;
  };
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, patch } = options;
  return getIslandRunRuntimeStateBackend().persistPatch({ session, client, patch });
}
