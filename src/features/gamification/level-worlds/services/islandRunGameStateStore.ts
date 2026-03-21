import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';

export type PerIslandEggStatus = 'incubating' | 'ready' | 'animal_ready' | 'collected' | 'sold' | 'animal_sold';

/** Where an egg lives: on a specific island, on the Home Island, or dormant (hatched but uncollected). */
export type PerIslandEggLocation = 'island' | 'home' | 'dormant';

export interface PerIslandEggEntry {
  tier: 'common' | 'rare' | 'mythic';
  setAtMs: number;
  hatchAtMs: number;
  status: PerIslandEggStatus;
  /** Location flag for dormant/carryover tracking. */
  location?: PerIslandEggLocation;
  /** Unix ms timestamp when the egg was collected or sold. */
  openedAt?: number;
  /** Unix ms timestamp when the hatched animal was collected from the egg. */
  animalCollectedAtMs?: number;
}

/** Key = island number (as string), value = egg entry */
export type PerIslandEggsLedger = Record<string, PerIslandEggEntry>;

export interface IslandRunGameStateRecord {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  currentIslandNumber: number;
  cycleIndex: number;
  bossTrialResolvedIslandNumber: number | null;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
  perIslandEggs: PerIslandEggsLedger;
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  islandShards: number;
  shardTierIndex: number;
  shardClaimCount: number;
  shields: number;
  shards: number;
  completedStopsByIsland: Record<string, string[]>;
}

const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';
const ISLAND_RUN_REMOTE_BACKOFF_MS = 60 * 1000;

function getStorageKey(userId: string) {
  return `island_run_runtime_state_${userId}`;
}

function getRemoteBackoffStorageKey(userId: string) {
  return `${getStorageKey(userId)}_remote_backoff_until`;
}

function isTransportLikeRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  if (!error) return false;

  const normalizedMessage = typeof error.message === 'string' ? error.message.trim().toLowerCase() : '';
  const normalizedCode = typeof error.code === 'string' ? error.code.trim().toLowerCase() : '';

  if (!normalizedMessage && !normalizedCode) return true;

  return [
    normalizedMessage === 'load failed',
    normalizedMessage === 'failed to fetch',
    normalizedMessage.includes('networkerror'),
    normalizedMessage.includes('network request failed'),
    normalizedMessage.includes('fetch failed'),
    normalizedMessage.includes('load failed'),
    normalizedCode === 'failed_to_fetch',
    normalizedCode === 'network_error',
  ].some(Boolean);
}

function getRemoteBackoffUntil(userId: string): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getRemoteBackoffStorageKey(userId));
    if (!raw) return null;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(getRemoteBackoffStorageKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setRemoteBackoffUntil(userId: string, backoffUntil: number | null) {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getRemoteBackoffStorageKey(userId);
    if (backoffUntil === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(backoffUntil));
  } catch {
    // ignore local persistence failures in prototype mode
  }
}

function activateRemoteBackoff(userId: string): number {
  const backoffUntil = Date.now() + ISLAND_RUN_REMOTE_BACKOFF_MS;
  setRemoteBackoffUntil(userId, backoffUntil);
  return backoffUntil;
}

function getDefaultRecord(): IslandRunGameStateRecord {
  const nowMs = Date.now();
  return {
    firstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    islandStartedAtMs: nowMs,
    islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1000,
    islandShards: 0,
    shardTierIndex: 0,
    shardClaimCount: 0,
    shields: 0,
    shards: 0,
    completedStopsByIsland: {},
  };
}

function toRecord(value: Partial<IslandRunGameStateRecord>, fallback: IslandRunGameStateRecord): IslandRunGameStateRecord {
  const eggTierRaw = value.activeEggTier;
  const activeEggTier: 'common' | 'rare' | 'mythic' | null =
    eggTierRaw === 'common' || eggTierRaw === 'rare' || eggTierRaw === 'mythic' ? eggTierRaw : fallback.activeEggTier;
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
    cycleIndex:
      typeof value.cycleIndex === 'number' && Number.isFinite(value.cycleIndex)
        ? Math.max(0, Math.floor(value.cycleIndex))
        : fallback.cycleIndex,
    bossTrialResolvedIslandNumber:
      typeof value.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(value.bossTrialResolvedIslandNumber)
        ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber))
        : value.bossTrialResolvedIslandNumber === null
          ? null
          : fallback.bossTrialResolvedIslandNumber,
    activeEggTier,
    activeEggSetAtMs:
      typeof value.activeEggSetAtMs === 'number' && Number.isFinite(value.activeEggSetAtMs)
        ? value.activeEggSetAtMs
        : value.activeEggSetAtMs === null
          ? null
          : fallback.activeEggSetAtMs,
    activeEggHatchDurationMs:
      typeof value.activeEggHatchDurationMs === 'number' && Number.isFinite(value.activeEggHatchDurationMs)
        ? value.activeEggHatchDurationMs
        : value.activeEggHatchDurationMs === null
          ? null
          : fallback.activeEggHatchDurationMs,
    activeEggIsDormant: typeof value.activeEggIsDormant === 'boolean' ? value.activeEggIsDormant : fallback.activeEggIsDormant,
    perIslandEggs: value.perIslandEggs !== null && typeof value.perIslandEggs === 'object' && !Array.isArray(value.perIslandEggs)
      ? (value.perIslandEggs as PerIslandEggsLedger)
      : fallback.perIslandEggs,
    islandStartedAtMs:
      typeof value.islandStartedAtMs === 'number' && Number.isFinite(value.islandStartedAtMs)
        ? value.islandStartedAtMs
        : fallback.islandStartedAtMs,
    islandExpiresAtMs:
      typeof value.islandExpiresAtMs === 'number' && Number.isFinite(value.islandExpiresAtMs)
        ? value.islandExpiresAtMs
        : fallback.islandExpiresAtMs,
    islandShards:
      typeof value.islandShards === 'number' && Number.isFinite(value.islandShards)
        ? Math.max(0, Math.floor(value.islandShards))
        : fallback.islandShards,
    shardTierIndex:
      typeof value.shardTierIndex === 'number' && Number.isFinite(value.shardTierIndex)
        ? Math.max(0, Math.floor(value.shardTierIndex))
        : fallback.shardTierIndex,
    shardClaimCount:
      typeof value.shardClaimCount === 'number' && Number.isFinite(value.shardClaimCount)
        ? Math.max(0, Math.floor(value.shardClaimCount))
        : fallback.shardClaimCount,
    shields:
      typeof value.shields === 'number' && Number.isFinite(value.shields)
        ? Math.max(0, Math.floor(value.shields))
        : fallback.shields,
    shards:
      typeof value.shards === 'number' && Number.isFinite(value.shards)
        ? Math.max(0, Math.floor(value.shards))
        : fallback.shards,
    completedStopsByIsland:
      value.completedStopsByIsland !== null && typeof value.completedStopsByIsland === 'object' && !Array.isArray(value.completedStopsByIsland)
        ? Object.fromEntries(
            Object.entries(value.completedStopsByIsland).map(([islandKey, stops]) => [
              islandKey,
              Array.isArray(stops) ? stops.filter((stop): stop is string => typeof stop === 'string') : [],
            ]),
          )
        : fallback.completedStopsByIsland,
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

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (remoteBackoffUntil !== null) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_query_error' };
  }

  logIslandRunEntryDebug('runtime_state_hydrate_query_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    fallbackCurrentIslandNumber: fallback.currentIslandNumber,
    fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
  });

  const { data, error } = await client
    .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
    .select('first_run_claimed,daily_hearts_claimed_day_key,current_island_number,cycle_index,boss_trial_resolved_island_number,active_egg_tier,active_egg_set_at_ms,active_egg_hatch_duration_ms,active_egg_is_dormant,per_island_eggs,island_started_at_ms,island_expires_at_ms,island_shards,shard_tier_index,shard_claim_count,shields,shards,completed_stops_by_island')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;

    logIslandRunEntryDebug('runtime_state_hydrate_query_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
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
      cycleIndex: data.cycle_index ?? 0,
      bossTrialResolvedIslandNumber: data.boss_trial_resolved_island_number,
      activeEggTier: data.active_egg_tier,
      activeEggSetAtMs: data.active_egg_set_at_ms,
      activeEggHatchDurationMs: data.active_egg_hatch_duration_ms,
      activeEggIsDormant: data.active_egg_is_dormant,
      perIslandEggs: data.per_island_eggs ?? {},
      islandStartedAtMs: data.island_started_at_ms,
      islandExpiresAtMs: data.island_expires_at_ms,
      islandShards: data.island_shards ?? 0,
      shardTierIndex: data.shard_tier_index ?? 0,
      shardClaimCount: data.shard_claim_count ?? 0,
      shields: data.shields ?? 0,
      shards: data.shards ?? 0,
      completedStopsByIsland: data.completed_stops_by_island ?? {},
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

  setRemoteBackoffUntil(session.user.id, null);

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

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (remoteBackoffUntil !== null) {
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
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
      cycle_index: record.cycleIndex,
      boss_trial_resolved_island_number: record.bossTrialResolvedIslandNumber,
      active_egg_tier: record.activeEggTier,
      active_egg_set_at_ms: record.activeEggSetAtMs,
      active_egg_hatch_duration_ms: record.activeEggHatchDurationMs,
      active_egg_is_dormant: record.activeEggIsDormant,
      per_island_eggs: record.perIslandEggs,
      island_started_at_ms: record.islandStartedAtMs,
      island_expires_at_ms: record.islandExpiresAtMs,
      island_shards: record.islandShards,
      shard_tier_index: record.shardTierIndex,
      shard_claim_count: record.shardClaimCount,
      shields: record.shields,
      shards: record.shards,
      completed_stops_by_island: record.completedStopsByIsland,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;

    logIslandRunEntryDebug('runtime_state_persist_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
      currentIslandNumber: record.currentIslandNumber,
      bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    });

    if (remoteBackoffTriggered) {
      return { ok: true };
    }

    return { ok: false, errorMessage: error.message };
  }

  setRemoteBackoffUntil(session.user.id, null);

  logIslandRunEntryDebug('runtime_state_persist_success', {
    userId: session.user.id,
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
  });

  return { ok: true };
}
