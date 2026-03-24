import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { loadPersonalityTestHistory } from '../data/personalityTestRepo';
import { putPersonalityTest, type PersonalityTestValue } from '../data/localDb';
import {
  getPersonalityTestMutationCounts,
  listPendingPersonalityTestMutations,
  removePersonalityTestMutation,
  updatePersonalityTestMutation,
} from '../data/personalityTestOfflineRepo';
import { buildTopTraitSummary } from '../features/identity/personalitySummary';

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

export async function upsertPersonalityProfile(
  payload: PersonalityProfileInsert,
): Promise<PersonalityProfileResponse> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle<PersonalityProfileRow>();

  return { data, error };
}

export async function fetchPersonalityProfile(
  userId: string,
): Promise<PersonalityProfileResponse> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<PersonalityProfileRow>();

  return { data, error };
}

export async function fetchPersonalityTestsFromSupabase(
  userId: string,
): Promise<PersonalityTestValue[]> {
  if (!canUseSupabaseData()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('personality_tests')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  const normalized = data
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

  if (!canUseSupabaseData()) {
    return localRecords;
  }

  try {
    const remoteRecords = await fetchPersonalityTestsFromSupabase(userId);
    return mergePersonalityTests(localRecords, remoteRecords);
  } catch {
    return localRecords;
  }
}

export async function syncPersonalityTestsWithSupabase(userId: string): Promise<void> {
  if (!canUseSupabaseData()) {
    return;
  }

  const supabase = getSupabaseClient();
  const pendingMutations = await listPendingPersonalityTestMutations(userId);
  let latestSynced: PersonalityTestValue | null = null;

  for (const mutation of pendingMutations) {
    try {
      await updatePersonalityTestMutation(mutation.id, {
        status: 'processing',
        updated_at_ms: Date.now(),
      });
      const { error } = await supabase.from('personality_tests').upsert(mutation.payload, { onConflict: 'id' });

      if (error) throw error;

      const syncedRecord: PersonalityTestValue = {
        id: mutation.payload.id ?? mutation.test_id,
        user_id: mutation.payload.user_id,
        taken_at: mutation.payload.taken_at ?? new Date().toISOString(),
        traits: (mutation.payload.traits ?? {}) as Record<string, number>,
        axes: (mutation.payload.axes ?? {}) as Record<string, number>,
        answers: (mutation.payload.answers ?? {}) as Record<string, number>,
        version: mutation.payload.version ?? 'v1',
        archetype_hand: mutation.payload.archetype_hand ?? undefined,
        _dirty: false,
      };

      await putPersonalityTest(syncedRecord);
      await removePersonalityTestMutation(mutation.id);

      if (!latestSynced || syncedRecord.taken_at > latestSynced.taken_at) {
        latestSynced = syncedRecord;
      }
    } catch (error) {
      await updatePersonalityTestMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (latestSynced) {
    const personalitySummary = buildTopTraitSummary(latestSynced.traits);
    await upsertPersonalityProfile({
      user_id: userId,
      personality_traits: latestSynced.traits,
      personality_axes: latestSynced.axes,
      personality_summary: personalitySummary,
      personality_last_tested_at: latestSynced.taken_at,
    });
  }
}

export async function getPersonalityTestQueueStatus(userId: string): Promise<PersonalityTestQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  return getPersonalityTestMutationCounts(userId);
}
