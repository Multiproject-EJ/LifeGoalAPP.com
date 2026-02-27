import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { persistIslandRunProfileMetadata } from './islandRunProfile';
import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import {
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';

export interface IslandRunRuntimeStateBackend {
  read(session: Session): IslandRunRuntimeState;
  persistPatch(options: {
    session: Session;
    client: SupabaseClient | null;
    patch: {
      firstRunClaimed?: boolean;
      dailyHeartsClaimedDayKey?: string | null;
      onboardingComplete?: boolean;
    };
  }): Promise<{ ok: true } | { ok: false; errorMessage: string }>;
}

const gameStateStorageBackend: IslandRunRuntimeStateBackend = {
  read(session) {
    return readIslandRunGameStateRecord(session);
  },

  async persistPatch({ session, client, patch }) {
    const current = readIslandRunGameStateRecord(session);
    const nextState: IslandRunRuntimeState = {
      firstRunClaimed: typeof patch.firstRunClaimed === 'boolean' ? patch.firstRunClaimed : current.firstRunClaimed,
      dailyHeartsClaimedDayKey:
        typeof patch.dailyHeartsClaimedDayKey === 'string' || patch.dailyHeartsClaimedDayKey === null
          ? patch.dailyHeartsClaimedDayKey
          : current.dailyHeartsClaimedDayKey,
    };

    const gameStatePersistResult = await writeIslandRunGameStateRecord({
      session,
      client,
      record: nextState,
    });

    if (!gameStatePersistResult.ok) {
      return gameStatePersistResult;
    }

    if (typeof patch.onboardingComplete === 'boolean') {
      return persistIslandRunProfileMetadata({
        session,
        client,
        metadataPatch: {
          onboarding_complete: patch.onboardingComplete,
        },
      });
    }

    return { ok: true };
  },
};

export function getIslandRunRuntimeStateBackend(): IslandRunRuntimeStateBackend {
  return gameStateStorageBackend;
}
