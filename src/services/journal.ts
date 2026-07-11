import type { PostgrestError } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import {
  generateClientId,
  shouldQueueAfterFailure,
  toPostgrestError,
} from './offlineWriteThrough';
import {
  getLocalJournalRecord,
  listLocalJournalRecordsForUser,
  listPendingJournalMutations,
  removeJournalMutation,
  removeLocalJournalRecord,
  upsertLocalJournalRecord,
  type JournalEntryRow as LocalJournalRow,
} from '../data/journalOfflineRepo';
import {
  DEMO_USER_ID,
  addDemoJournalEntry,
  getDemoJournalEntries,
  removeDemoJournalEntry,
  updateDemoJournalEntry,
} from './demoData';

export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update'];

type AuthError = {
  message: string;
  details: string;
  hint: string;
  code: string;
};

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | AuthError | null;
};

type SessionValidationResult = {
  session: Session | null;
  error: AuthError | null;
};

export type JournalListFilters = {
  search?: string;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIST_LIMIT = 200;
const LOCAL_ID_PREFIX = 'local-';

/**
 * Filters journal entries for AI/context usage.
 * Private entries remain visible in Journal UI but are excluded from AI context.
 */
export function filterJournalEntriesForAiContext(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => entry.is_private !== true);
}

/**
 * Validates that a Supabase session is active before performing database operations.
 * This prevents RLS policy violations due to expired or missing auth tokens.
 *
 * @param operation - The operation being performed (for error messages)
 * @returns An object containing either the session or an error
 */
async function validateSession(operation: string): Promise<SessionValidationResult> {
  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      session: null,
      error: {
        message: `Please sign in again to ${operation} journal entries.`,
        details: sessionError?.message || 'No active session',
        hint: 'Your session may have expired',
        code: 'AUTH_SESSION_MISSING',
      },
    };
  }

  return { session, error: null };
}

function normalizeSearchTerm(search?: string | null): string | null {
  if (!search) return null;
  const trimmed = search.trim();
  if (!trimmed) return null;
  return `%${trimmed.replace(/%/g, '\\%')}%`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeLocalRowFromInsert(payload: JournalEntryInsert, id: string): JournalEntry {
  const createdAt = nowIso();
  return {
    id,
    user_id: payload.user_id,
    created_at: createdAt,
    updated_at: createdAt,
    entry_date: payload.entry_date ?? createdAt.slice(0, 10),
    title: payload.title ?? null,
    content: payload.content,
    mood: payload.mood ?? null,
    tags: payload.tags ?? [],
    is_private: payload.is_private ?? true,
    attachments: payload.attachments ?? null,
    linked_goal_ids: payload.linked_goal_ids ?? [],
    linked_habit_ids: payload.linked_habit_ids ?? [],
    type: payload.type ?? 'quick',
    mood_score: payload.mood_score ?? null,
    category: payload.category ?? null,
    unlock_date: payload.unlock_date ?? null,
    goal_id: payload.goal_id ?? null,
    irrational_fears: payload.irrational_fears ?? null,
    training_solutions: payload.training_solutions ?? null,
    concrete_steps: payload.concrete_steps ?? null,
  } as JournalEntry;
}

function mergeRowWithUpdate(base: JournalEntry, patch: JournalEntryUpdate): JournalEntry {
  return {
    ...base,
    ...patch,
    id: base.id,
    user_id: base.user_id,
    updated_at: nowIso(),
  } as JournalEntry;
}

async function getActiveUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Offline overlay ─────────────────────────────────────────────────────────
// journalOfflineRepo's journal_local store keeps rows edited while offline so
// list reads can merge them over remote data. Mutation queueing itself has
// converged on the shared MutationQueue (executors in offlineSyncExecutors);
// the repo's legacy journal_mutations store is drained by
// migrateLegacyJournalQueue below.

async function recordLocalCreate(row: JournalEntry): Promise<void> {
  await upsertLocalJournalRecord({
    id: row.id,
    user_id: row.user_id,
    server_id: null,
    row: row as LocalJournalRow,
    sync_state: 'pending_create',
    updated_at_ms: Date.now(),
    last_error: null,
  });
}

async function recordLocalUpdate(id: string, patch: JournalEntryUpdate): Promise<JournalEntry | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;

  const existingLocal = await getLocalJournalRecord(id);
  let base: JournalEntry | null = existingLocal?.row ?? null;

  if (!base) {
    const remote = await getJournalEntry(id);
    if (remote.data) {
      base = remote.data;
    }
  }

  if (!base) return null;

  const merged = mergeRowWithUpdate(base, patch);
  await upsertLocalJournalRecord({
    id,
    user_id: userId,
    server_id: existingLocal?.sync_state === 'pending_create' ? null : id,
    row: merged as LocalJournalRow,
    sync_state: existingLocal?.sync_state === 'pending_create' ? 'pending_create' : 'pending_update',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  return merged;
}

async function recordLocalDelete(id: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  const existing = await getLocalJournalRecord(id);
  if (existing) {
    await upsertLocalJournalRecord({
      ...existing,
      sync_state: 'pending_delete',
      updated_at_ms: Date.now(),
      last_error: null,
    });
  }
}

async function mergeLocalJournalOverRemote(remoteEntries: JournalEntry[]): Promise<JournalEntry[]> {
  const userId = await getActiveUserId();
  if (!userId) {
    return remoteEntries;
  }

  const localRecords = await listLocalJournalRecordsForUser(userId);
  if (!localRecords.length) {
    return remoteEntries;
  }

  const mergedById = new Map(remoteEntries.map((entry) => [entry.id, entry] as const));
  for (const localRecord of localRecords) {
    if (localRecord.sync_state === 'pending_delete') {
      mergedById.delete(localRecord.id);
      if (localRecord.server_id) {
        mergedById.delete(localRecord.server_id);
      }
      continue;
    }
    mergedById.set(localRecord.row.id, localRecord.row as JournalEntry);
  }

  return Array.from(mergedById.values());
}

// ── Legacy queue migration ──────────────────────────────────────────────────

let legacyQueueMigrated = false;

/**
 * One-time convergence of the pre-framework journal mutation queue onto the
 * shared MutationQueue. Pending entries survive the upgrade; entries created
 * offline under the old `local-…` id scheme get a real client uuid so the
 * executor can upsert them idempotently.
 */
export async function migrateLegacyJournalQueue(): Promise<void> {
  if (legacyQueueMigrated) return;
  legacyQueueMigrated = true;

  const userId = await getActiveUserId();
  if (!userId) {
    legacyQueueMigrated = false; // Retry once a session exists.
    return;
  }

  try {
    const pending = await listPendingJournalMutations(userId);
    const queue = getMutationQueue();

    for (const legacy of pending) {
      if (legacy.operation === 'create') {
        const payload = legacy.payload as JournalEntryInsert | null;
        if (payload) {
          const id = legacy.entry_id.startsWith(LOCAL_ID_PREFIX) ? generateClientId() : legacy.entry_id;
          const record = await getLocalJournalRecord(legacy.entry_id);
          if (record && legacy.entry_id.startsWith(LOCAL_ID_PREFIX)) {
            await removeLocalJournalRecord(legacy.entry_id);
            await upsertLocalJournalRecord({ ...record, id, row: { ...record.row, id } });
          }
          await queue.enqueue({
            feature: 'journal',
            operation: 'journal.create',
            payload: { ...payload, id },
            dedupeKey: id,
          });
        }
      } else if (legacy.operation === 'update' && legacy.server_id) {
        await queue.enqueue({
          feature: 'journal',
          operation: 'journal.update',
          payload: { id: legacy.server_id, patch: legacy.payload ?? {} },
        });
      } else if (legacy.operation === 'delete' && legacy.server_id) {
        await queue.enqueue({
          feature: 'journal',
          operation: 'journal.delete',
          payload: { id: legacy.server_id },
          dedupeKey: legacy.server_id,
        });
      }
      await removeJournalMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyQueueMigrated = false;
  }
}

/**
 * Kick a sync of queued journal work. The shared SyncEngine also resyncs
 * automatically on reconnect; this exists for the Journal screen's manual
 * refresh path.
 */
export async function syncQueuedJournalEntries(): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyJournalQueue();
  await getSyncEngine().syncNow();
}

export type JournalQueueStatus = {
  pending: number;
  failed: number;
};

export async function getJournalQueueStatus(): Promise<JournalQueueStatus> {
  if (!canUseSupabaseData()) {
    return { pending: 0, failed: 0 };
  }

  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'journal') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listJournalEntries(
  filters: JournalListFilters = {},
): Promise<ServiceResponse<JournalEntry[]>> {
  if (!canUseSupabaseData()) {
    let entries = getDemoJournalEntries(DEMO_USER_ID);
    const searchTerm = normalizeSearchTerm(filters.search);
    if (searchTerm) {
      const raw = searchTerm.slice(1, -1).toLowerCase();
      entries = entries.filter((entry) => {
        const title = entry.title?.toLowerCase() ?? '';
        const content = entry.content.toLowerCase();
        return title.includes(raw) || content.includes(raw);
      });
    }
    if (filters.tag) {
      entries = entries.filter((entry) => entry.tags?.includes(filters.tag ?? '') ?? false);
    }
    if (filters.fromDate) {
      entries = entries.filter((entry) => entry.entry_date >= filters.fromDate!);
    }
    if (filters.toDate) {
      entries = entries.filter((entry) => entry.entry_date <= filters.toDate!);
    }
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? entries.length;
    return { data: entries.slice(offset, offset + limit), error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.fromDate) {
      query = query.gte('entry_date', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('entry_date', filters.toDate);
    }
    const searchTerm = normalizeSearchTerm(filters.search);
    if (searchTerm) {
      query = query.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }
    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }

    const limit = filters.limit ?? DEFAULT_LIST_LIMIT;
    if (typeof filters.offset === 'number') {
      const start = filters.offset;
      const end = start + limit - 1;
      query = query.range(start, end);
    } else {
      query = query.limit(limit);
    }

    const response = await query.returns<JournalEntry[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    // Outage: surface offline-drafted entries with a translated error so the
    // screen can explain the situation without losing local work.
    const merged = await mergeLocalJournalOverRemote([]);
    return { data: merged, error: toPostgrestError(result.error) };
  }

  const merged = await mergeLocalJournalOverRemote(result.data);
  return { data: merged, error: null };
}

export async function getJournalEntry(id: string): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    const entry = getDemoJournalEntries(DEMO_USER_ID).find((item) => item.id === id) ?? null;
    return { data: entry, error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle<JournalEntry>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (!result.ok) {
    const local = await getLocalJournalRecord(id);
    if (local && local.sync_state !== 'pending_delete') {
      return { data: local.row as JournalEntry, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }
  return { data: result.data, error: null };
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function createJournalEntry(
  payload: JournalEntryInsert,
): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    return { data: addDemoJournalEntry(payload), error: null };
  }

  // Validate session before attempting the insert
  const { session, error: authError } = await validateSession('save');
  if (authError) {
    return { data: null, error: authError };
  }

  // At this point, session is guaranteed to be non-null
  // Verify the user_id in the payload matches the authenticated user
  // This prevents accidental permission issues
  if (payload.user_id !== session!.user.id) {
    return {
      data: null,
      error: {
        message: 'Authentication mismatch. Please refresh the page and try again.',
        details: `Payload user_id (${payload.user_id}) does not match session user id (${session!.user.id})`,
        hint: 'This may indicate a stale session',
        code: 'AUTH_USER_MISMATCH',
      },
    };
  }

  const supabase = getSupabaseClient();
  const id = generateClientId();
  const insertPayload = { ...payload, id };

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('journal_entries').insert(insertPayload).select().single<JournalEntry>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (result.ok) {
    return { data: result.data, error: null };
  }

  if (shouldQueueAfterFailure(result.error)) {
    const localRow = makeLocalRowFromInsert(payload, id);
    await recordLocalCreate(localRow);
    await getMutationQueue().enqueue({
      feature: 'journal',
      operation: 'journal.create',
      payload: insertPayload,
      dedupeKey: id,
    });
    return { data: localRow, error: null };
  }

  return { data: null, error: toPostgrestError(result.error) };
}

export async function updateJournalEntry(
  id: string,
  payload: JournalEntryUpdate,
): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    return { data: updateDemoJournalEntry(id, payload), error: null };
  }

  // Validate session before attempting the update
  const { error: authError } = await validateSession('update');
  if (authError) {
    return { data: null, error: authError };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('journal_entries')
      .update(payload)
      .eq('id', id)
      .select()
      .single<JournalEntry>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (result.ok) {
    return { data: result.data, error: null };
  }

  if (shouldQueueAfterFailure(result.error)) {
    const localRow = await recordLocalUpdate(id, payload);
    if (localRow) {
      await getMutationQueue().enqueue({
        feature: 'journal',
        operation: 'journal.update',
        // No dedupeKey: patches are partial, so queued updates replay in order.
        payload: { id, patch: payload },
      });
      return { data: localRow, error: null };
    }
  }

  return { data: null, error: toPostgrestError(result.error) };
}

export async function deleteJournalEntry(id: string): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    return { data: removeDemoJournalEntry(id), error: null };
  }

  // Validate session before attempting the delete
  const { error: authError } = await validateSession('delete');
  if (authError) {
    return { data: null, error: authError };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('journal_entries').delete().eq('id', id).select().single<JournalEntry>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (result.ok) {
    return { data: null, error: null };
  }

  if (shouldQueueAfterFailure(result.error)) {
    await recordLocalDelete(id);
    await getMutationQueue().enqueue({
      feature: 'journal',
      operation: 'journal.delete',
      payload: { id },
      dedupeKey: id,
    });
    return { data: null, error: null };
  }

  return { data: null, error: toPostgrestError(result.error) };
}

/**
 * List journal entries filtered by mode/type for analytics and dashboards.
 * Supports filtering by journal type, life wheel category, and goal ID.
 *
 * @param params - Filter parameters
 * @param params.type - Journal mode/type (e.g., 'quick', 'deep', 'life_wheel', 'goal')
 * @param params.category - Life wheel category (used with type='life_wheel')
 * @param params.goalId - Goal ID (used with type='goal')
 * @param params.limit - Maximum number of entries to return (defaults to 250)
 * @returns Promise with data array of journal entries and error
 */
export async function listJournalEntriesByMode(params: {
  type?: Database['public']['Tables']['journal_entries']['Row']['type'];
  category?: string | null;
  goalId?: string | null;
  limit?: number;
}): Promise<ServiceResponse<JournalEntry[]>> {
  if (!canUseSupabaseData()) {
    let entries = getDemoJournalEntries(DEMO_USER_ID);

    // Apply filters to demo data
    if (params.type) {
      entries = entries.filter((entry) => entry.type === params.type);
    }
    if (params.category) {
      entries = entries.filter((entry) => entry.category === params.category);
    }
    if (params.goalId) {
      entries = entries.filter((entry) => entry.goal_id === params.goalId);
    }

    const limit = params.limit ?? 250;
    return { data: entries.slice(0, limit), error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    let query = supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.type) {
      query = query.eq('type', params.type);
    }
    if (params.category) {
      query = query.eq('category', params.category);
    }
    if (params.goalId) {
      query = query.eq('goal_id', params.goalId);
    }

    const limit = params.limit ?? 250;
    query = query.limit(limit);

    const response = await query.returns<JournalEntry[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    return { data: [], error: toPostgrestError(result.error) };
  }
  return { data: result.data, error: null };
}
