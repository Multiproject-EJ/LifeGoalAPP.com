import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';

export interface IslandRunGameStateRecord {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
}

const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';

function getStorageKey(userId: string) {
  return `island_run_runtime_state_${userId}`;
}

export function readIslandRunGameStateRecord(session: Session): IslandRunGameStateRecord {
  const fallback: IslandRunGameStateRecord = {
    firstRunClaimed: Boolean(session.user.user_metadata?.island_run_first_run_claimed),
    dailyHeartsClaimedDayKey:
      typeof session.user.user_metadata?.island_run_daily_hearts_daykey === 'string'
        ? session.user.user_metadata.island_run_daily_hearts_daykey
        : null,
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(getStorageKey(session.user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
    return {
      firstRunClaimed: typeof parsed.firstRunClaimed === 'boolean' ? parsed.firstRunClaimed : fallback.firstRunClaimed,
      dailyHeartsClaimedDayKey:
        typeof parsed.dailyHeartsClaimedDayKey === 'string' || parsed.dailyHeartsClaimedDayKey === null
          ? parsed.dailyHeartsClaimedDayKey
          : fallback.dailyHeartsClaimedDayKey,
    };
  } catch {
    return fallback;
  }
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
    return { ok: true };
  }

  const { error } = await client.from(ISLAND_RUN_RUNTIME_STATE_TABLE).upsert(
    {
      user_id: session.user.id,
      first_run_claimed: record.firstRunClaimed,
      daily_hearts_claimed_day_key: record.dailyHeartsClaimedDayKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}
