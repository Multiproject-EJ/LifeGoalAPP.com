import type { PostgrestError } from '@supabase/supabase-js';
import { isValidUuid } from '../lib/isValidUuid';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { loadPersonalityTestHistory } from '../data/personalityTestRepo';
import { putPersonalityTest, type PersonalityTestValue } from '../data/localDb';
import {
  clearPersonalityTestMutationsForUser,
  listPendingPersonalityTestMutations,
  removePersonalityTestMutation,
} from '../data/personalityTestOfflineRepo';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import { toPostgrestError } from './offlineWriteThrough';
import { recordOfflineSyncEvent } from './offlineSyncTelemetry';

export type PersonalityTestRow = Database['public']['Tables']['personality_tests']['Row'];
export type PersonalityTestInsert = Database['public']['Tables']['personality_tests']['Insert'];
export type PersonalityProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type PersonalityProfileRow = Database['public']['Tables']['profiles']['Row'];

export type PersonalityProfileResponse = {
  data: PersonalityProfileRow | null;
  error: PostgrestError | null;
};
export type PersonalityTestQueueStatus = { pending: number; failed: number };

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeJsonRecord(value: unknown): Record<string, number> {
  if (!isJsonRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, Number(entry)]),
  );
}

function normalizeSupabasePersonalityTest(
  row: PersonalityTestRow,
): PersonalityTestValue | null {
  if (!row.taken_at) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    taken_at: row.taken_at,
    traits: normalizeJsonRecord(row.traits),
    axes: normalizeJsonRecord(row.axes),
    answers: normalizeJsonRecord(row.answers),
    version: row.version ?? 'v1',
    archetype_hand: row.archetype_hand ?? undefined,
    _dirty: false,
  };
}

function mergePersonalityTests(
  localRecords: PersonalityTestValue[],
  remoteRecords: PersonalityTestValue[],
): PersonalityTestValue[] {
  const merged = new Map<string, PersonalityTestValue>();

  for (const record of localRecords) {
    merged.set(record.id, record);
  }

  for (const record of remoteRecords) {
    const existing = merged.get(record.id);
    if (!existing || !existing._dirty) {
      merged.set(record.id, record);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
}

function canQueryPersonalityData(userId: string | null | undefined): userId is string {
  if (!isValidUuid(userId)) {
    return false;
  }
  const normalized = userId.toLowerCase();
  return !normalized.startsWith('demo-') && !normalized.startsWith('fake-');
}

export async function upsertPersonalityProfile(
  payload: PersonalityProfileInsert,
): Promise<PersonalityProfileResponse> {
  if (!canUseSupabaseData() || !canQueryPersonalityData(payload.user_id ?? null)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle<PersonalityProfileRow>();
    if (error) throw error;
    return data;
  });

  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function fetchPersonalityProfile(
  userId: string,
): Promise<PersonalityProfileResponse> {
  if (!canUseSupabaseData() || !canQueryPersonalityData(userId)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<PersonalityProfileRow>();
    if (error) throw error;
    return data;
  });

  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function fetchPersonalityTestsFromSupabase(
  userId: string,
): Promise<PersonalityTestValue[]> {
  if (!canUseSupabaseData() || !canQueryPersonalityData(userId)) {
    return [];
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('personality_tests')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  if (!result.ok) {
    // Callers merge with local history, so an outage degrades to local data.
    return [];
  }

  const normalized = result.data
    .map((row) => normalizeSupabasePersonalityTest(row))
    .filter((row): row is PersonalityTestValue => Boolean(row));

  await Promise.all(
    normalized.map((record) =>
      putPersonalityTest({
        ...record,
        _dirty: false,
      }),
    ),
  );

  return normalized;
}

export async function loadPersonalityTestHistoryWithSupabase(
  userId: string,
): Promise<PersonalityTestValue[]> {
  const localRecords = await loadPersonalityTestHistory(userId);

  if (!canUseSupabaseData() || !canQueryPersonalityData(userId)) {
    return localRecords;
  }

  try {
    const remoteRecords = await fetchPersonalityTestsFromSupabase(userId);
    return mergePersonalityTests(localRecords, remoteRecords);
  } catch {
    return localRecords;
  }
}

let legacyPersonalityQueueMigrated = false;

/**
 * One-time convergence of the pre-framework personality-test queue onto the
 * shared MutationQueue. Pending results survive the upgrade.
 */
export async function migrateLegacyPersonalityTestQueue(userId: string): Promise<void> {
  if (legacyPersonalityQueueMigrated) return;
  legacyPersonalityQueueMigrated = true;

  try {
    const queue = getMutationQueue();
    for (const legacy of await listPendingPersonalityTestMutations(userId)) {
      await queue.enqueue({
        feature: 'personality_test',
        operation: 'personality_test.upsert',
        payload: legacy.payload,
        dedupeKey: legacy.payload.id ?? legacy.test_id,
      });
      await removePersonalityTestMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyPersonalityQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncPersonalityTestsWithSupabase(userId: string): Promise<void> {
  if (!canUseSupabaseData() || !canQueryPersonalityData(userId)) {
    return;
  }

  await migrateLegacyPersonalityTestQueue(userId);
  recordOfflineSyncEvent({
    feature: 'personality_test',
    event: 'sync_started',
    userId,
  });
  await getSyncEngine().syncNow();
}

export async function getPersonalityTestQueueStatus(_userId: string): Promise<PersonalityTestQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'personality_test') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

export async function clearQueuedPersonalityTestMutations(userId: string): Promise<void> {
  await clearPersonalityTestMutationsForUser(userId);
  recordOfflineSyncEvent({
    feature: 'personality_test',
    event: 'queue_cleared',
    userId,
  });
}

export async function retryFailedPersonalityTestMutations(userId: string): Promise<void> {
  await getMutationQueue().retryFailed();
  recordOfflineSyncEvent({
    feature: 'personality_test',
    event: 'queue_retry_requested',
    userId,
  });
}
