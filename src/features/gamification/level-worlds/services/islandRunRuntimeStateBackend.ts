import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { persistIslandRunProfileMetadata } from './islandRunProfile';
import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import {
  hydrateIslandRunGameStateRecord,
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  writeIslandRunGameStateRecord,
} from './islandRunGameStateStore';

export interface IslandRunRuntimeStateBackend {
  read(session: Session): IslandRunRuntimeState;
  hydrate(options: { session: Session; client: SupabaseClient | null }): Promise<IslandRunRuntimeState>;
  hydrateWithSource(options: {
    session: Session;
    client: SupabaseClient | null;
  }): Promise<{
    state: IslandRunRuntimeState;
    source: IslandRunRuntimeHydrationSource;
  }>;
  persistPatch(options: {
    session: Session;
    client: SupabaseClient | null;
    patch: {
      firstRunClaimed?: boolean;
      dailyHeartsClaimedDayKey?: string | null;
      onboardingComplete?: boolean;
      currentIslandNumber?: number;
      bossTrialResolvedIslandNumber?: number | null;
    };
  }): Promise<{ ok: true } | { ok: false; errorMessage: string }>;
}

const gameStateStorageBackend: IslandRunRuntimeStateBackend = {
  read(session) {
    return readIslandRunGameStateRecord(session);
  },

  async hydrate({ session, client }) {
    return hydrateIslandRunGameStateRecord({ session, client });
  },

  async hydrateWithSource({ session, client }) {
    const result = await hydrateIslandRunGameStateRecordWithSource({ session, client });
    return { state: result.record, source: result.source };
  },

  async persistPatch({ session, client, patch }) {
    const current = await hydrateIslandRunGameStateRecord({ session, client });
    const nextState: IslandRunRuntimeState = {
      firstRunClaimed: typeof patch.firstRunClaimed === 'boolean' ? patch.firstRunClaimed : current.firstRunClaimed,
      dailyHeartsClaimedDayKey:
        typeof patch.dailyHeartsClaimedDayKey === 'string' || patch.dailyHeartsClaimedDayKey === null
          ? patch.dailyHeartsClaimedDayKey
          : current.dailyHeartsClaimedDayKey,
      currentIslandNumber:
        typeof patch.currentIslandNumber === 'number' && Number.isFinite(patch.currentIslandNumber)
          ? Math.max(1, Math.floor(patch.currentIslandNumber))
          : current.currentIslandNumber,
      bossTrialResolvedIslandNumber:
        typeof patch.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(patch.bossTrialResolvedIslandNumber)
          ? Math.max(1, Math.floor(patch.bossTrialResolvedIslandNumber))
          : patch.bossTrialResolvedIslandNumber === null
            ? null
            : current.bossTrialResolvedIslandNumber,
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
