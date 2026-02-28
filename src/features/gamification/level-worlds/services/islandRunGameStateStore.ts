import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';

export interface IslandRunGameStateRecord {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  currentIslandNumber: number;
  bossTrialResolvedIslandNumber: number | null;
}

const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';

function getStorageKey(userId: string) {
  return `island_run_runtime_state_${userId}`;
}

function getDefaultRecord(): IslandRunGameStateRecord {
  return {
    firstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    currentIslandNumber: 1,
    bossTrialResolvedIslandNumber: null,
  };
}

function toRecord(value: Partial<IslandRunGameStateRecord>, fallback: IslandRunGameStateRecord): IslandRunGameStateRecord {
  return {
    firstRunClaimed: typeof value.firstRunClaimed === 'boolean' ? value.firstRunClaimed : fallback.firstRunClaimed,
    dailyHeartsClaimedDayKey:
      typeof value.dailyHeartsClaimedDayKey === 'string' || value.dailyHeartsClaimedDayKey === null
        ? value.dailyHeartsClaimedDayKey
        : fallback.dailyHeartsClaimedDayKey,
    currentIslandNumber:
      typeof value.currentIslandNumber === 'number' && Number.isFinite(value.currentIslandNumber)
        ? Math.max(1, Math.floor(value.currentIslandNumber))
        : fallback.currentIslandNumber,
    bossTrialResolvedIslandNumber:
      typeof value.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(value.bossTrialResolvedIslandNumber)
        ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber))
        : value.bossTrialResolvedIslandNumber === null
          ? null
          : fallback.bossTrialResolvedIslandNumber,
  };
}

export function readIslandRunGameStateRecord(session: Session): IslandRunGameStateRecord {
  const fallback = getDefaultRecord();

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(getStorageKey(session.user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
    return toRecord(parsed, fallback);
  } catch {
    return fallback;
  }
}

export type IslandRunGameStateHydrationSource = IslandRunRuntimeHydrationSource;

export async function hydrateIslandRunGameStateRecordWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<{ record: IslandRunGameStateRecord; source: IslandRunGameStateHydrationSource }> {
  const { session, client } = options;
  const fallback = readIslandRunGameStateRecord(session);

  if (isDemoSession(session) || !client) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_demo_or_no_client' };
  }

  logIslandRunEntryDebug('runtime_state_hydrate_query_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    fallbackCurrentIslandNumber: fallback.currentIslandNumber,
    fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
  });

  const { data, error } = await client
    .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
    .select('first_run_claimed,daily_hearts_claimed_day_key,current_island_number,boss_trial_resolved_island_number')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    logIslandRunEntryDebug('runtime_state_hydrate_query_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_query_error' };
  }

  if (!data) {
    logIslandRunEntryDebug('runtime_state_hydrate_no_row', {
      userId: session.user.id,
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_no_row' };
  }

  const hydratedRecord = toRecord(
    {
      firstRunClaimed: data.first_run_claimed,
      dailyHeartsClaimedDayKey: data.daily_hearts_claimed_day_key,
      currentIslandNumber: data.current_island_number,
      bossTrialResolvedIslandNumber: data.boss_trial_resolved_island_number,
    },
    fallback,
  );

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(hydratedRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  logIslandRunEntryDebug('runtime_state_hydrate_query_success', {
    userId: session.user.id,
    source: 'table',
    currentIslandNumber: hydratedRecord.currentIslandNumber,
    bossTrialResolvedIslandNumber: hydratedRecord.bossTrialResolvedIslandNumber,
  });

  return { record: hydratedRecord, source: 'table' };
}

export async function hydrateIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<IslandRunGameStateRecord> {
  const result = await hydrateIslandRunGameStateRecordWithSource(options);
  return result.record;
}

export async function writeIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
  record: IslandRunGameStateRecord;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, record } = options;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(record));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  if (isDemoSession(session) || !client) {
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      currentIslandNumber: record.currentIslandNumber,
      bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    });
    return { ok: true };
  }

  logIslandRunEntryDebug('runtime_state_persist_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
  });

  const { error } = await client.from(ISLAND_RUN_RUNTIME_STATE_TABLE).upsert(
    {
      user_id: session.user.id,
      first_run_claimed: record.firstRunClaimed,
      daily_hearts_claimed_day_key: record.dailyHeartsClaimedDayKey,
      current_island_number: record.currentIslandNumber,
      boss_trial_resolved_island_number: record.bossTrialResolvedIslandNumber,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    logIslandRunEntryDebug('runtime_state_persist_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      currentIslandNumber: record.currentIslandNumber,
      bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    });
    return { ok: false, errorMessage: error.message };
  }

  logIslandRunEntryDebug('runtime_state_persist_success', {
    userId: session.user.id,
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
  });

  return { ok: true };
}

