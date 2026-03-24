import type { PostgrestError } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  buildLocalJournalId,
  enqueueJournalMutation,
  getLocalJournalRecord,
  listLocalJournalRecordsForUser,
  listPendingJournalMutations,
  removeJournalMutation,
  removeLocalJournalRecord,
  updateJournalMutation,
  upsertLocalJournalRecord,
  type JournalEntryInsert as LocalJournalInsert,
  type JournalEntryRow as LocalJournalRow,
  type JournalEntryUpdate as LocalJournalUpdate,
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

function isNetworkLikeError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('offline') ||
    normalized.includes('load failed')
  );
}

function makeLocalRowFromInsert(payload: JournalEntryInsert, localId: string): JournalEntry {
  const createdAt = nowIso();
  return {
    id: localId,
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

function maybeLocalJournalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

async function queueLocalCreate(payload: JournalEntryInsert): Promise<JournalEntry> {
  const localId = buildLocalJournalId();
  const localRow = makeLocalRowFromInsert(payload, localId);
  const nowMs = Date.now();

  await upsertLocalJournalRecord({
    id: localId,
    user_id: payload.user_id,
    server_id: null,
    row: localRow as LocalJournalRow,
    sync_state: 'pending_create',
    updated_at_ms: nowMs,
    last_error: null,
  });

  await enqueueJournalMutation({
    id: `mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: payload.user_id,
    entry_id: localId,
    server_id: null,
    operation: 'create',
    payload: payload as LocalJournalInsert,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });

  return localRow;
}

async function queueLocalUpdate(id: string, payload: JournalEntryUpdate): Promise<JournalEntry | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;
  const nowMs = Date.now();

  const existingLocal = await getLocalJournalRecord(id);
  let base: JournalEntry | null = existingLocal?.row ?? null;

  if (!base && !maybeLocalJournalId(id)) {
    const remote = await getJournalEntry(id);
    if (remote.data) {
      base = remote.data;
    }
  }

  if (!base) {
    return null;
  }

  const merged = mergeRowWithUpdate(base, payload);
  await upsertLocalJournalRecord({
    id,
    user_id: userId,
    server_id: maybeLocalJournalId(id) ? null : id,
    row: merged as LocalJournalRow,
    sync_state: maybeLocalJournalId(id) ? 'pending_create' : 'pending_update',
    updated_at_ms: nowMs,
    last_error: null,
  });

  if (!maybeLocalJournalId(id)) {
    await enqueueJournalMutation({
      id: `mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      entry_id: id,
      server_id: id,
      operation: 'update',
      payload: payload as LocalJournalUpdate,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
  }

  return merged;
}

async function queueLocalDelete(id: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  const nowMs = Date.now();

  if (maybeLocalJournalId(id)) {
    await removeLocalJournalRecord(id);
    return;
  }

  const existing = await getLocalJournalRecord(id);
  if (existing) {
    await upsertLocalJournalRecord({
      ...existing,
      sync_state: 'pending_delete',
      updated_at_ms: nowMs,
      last_error: null,
    });
  }

  await enqueueJournalMutation({
    id: `mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    entry_id: id,
    server_id: id,
    operation: 'delete',
    payload: null,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });
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

export async function syncQueuedJournalEntries(): Promise<void> {
  if (!canUseSupabaseData()) return;

  const userId = await getActiveUserId();
  if (!userId) return;

  const supabase = getSupabaseClient();
  const pending = await listPendingJournalMutations(userId);

  for (const mutation of pending) {
    try {
      await updateJournalMutation(mutation.id, {
        status: 'processing',
        updated_at_ms: Date.now(),
      });

      if (mutation.operation === 'create') {
        const payload = mutation.payload as JournalEntryInsert | null;
        if (!payload) {
          await removeJournalMutation(mutation.id);
          continue;
        }
        const { data, error } = await supabase.from('journal_entries').insert(payload).select().single<JournalEntry>();
        if (error) throw error;
        await removeLocalJournalRecord(mutation.entry_id);
        void data;
        await removeJournalMutation(mutation.id);
        continue;
      }

      if (mutation.operation === 'update') {
        const payload = mutation.payload as JournalEntryUpdate | null;
        if (!payload || !mutation.server_id) {
          await removeJournalMutation(mutation.id);
          continue;
        }
        const { error } = await supabase
          .from('journal_entries')
          .update(payload)
          .eq('id', mutation.server_id)
          .select()
          .single<JournalEntry>();
        if (error) throw error;
        await removeLocalJournalRecord(mutation.entry_id);
        await removeJournalMutation(mutation.id);
        continue;
      }

      if (mutation.operation === 'delete') {
        if (!mutation.server_id) {
          await removeJournalMutation(mutation.id);
          continue;
        }
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', mutation.server_id)
          .select()
          .single<JournalEntry>();
        if (error) throw error;
        await removeLocalJournalRecord(mutation.entry_id);
        await removeJournalMutation(mutation.id);
      }
    } catch (error) {
      await updateJournalMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: error instanceof Error ? error.message : String(error),
      });
      const local = await getLocalJournalRecord(mutation.entry_id);
      if (local) {
        await upsertLocalJournalRecord({
          ...local,
          last_error: error instanceof Error ? error.message : String(error),
          sync_state:
            local.sync_state === 'pending_delete'
              ? 'pending_delete'
              : local.sync_state === 'pending_update'
                ? 'pending_update'
                : 'failed',
          updated_at_ms: Date.now(),
        });
      }
    }
  }
}

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
  const remoteEntries = response.data ?? [];
  const merged = await mergeLocalJournalOverRemote(remoteEntries);
  return { data: merged, error: response.error };
}

export async function getJournalEntry(id: string): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    const entry = getDemoJournalEntries(DEMO_USER_ID).find((item) => item.id === id) ?? null;
    return { data: entry, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle<JournalEntry>();
  return { data: response.data, error: response.error };
}

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
  const result = await supabase.from('journal_entries').insert(payload).select().single();
  if (!result.error || !isNetworkLikeError(result.error)) {
    return result;
  }

  const localRow = await queueLocalCreate(payload);
  return { data: localRow, error: null };
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
  const result = await supabase.from('journal_entries').update(payload).eq('id', id).select().single();
  if (!result.error || !isNetworkLikeError(result.error)) {
    return result;
  }

  const localRow = await queueLocalUpdate(id, payload);
  if (localRow) {
    return { data: localRow, error: null };
  }

  return result;
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
  const result = await supabase.from('journal_entries').delete().eq('id', id).select().single();
  if (!result.error || !isNetworkLikeError(result.error)) {
    return result;
  }

  await queueLocalDelete(id);
  return { data: null, error: null };
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
  return { data: response.data, error: response.error };
}
