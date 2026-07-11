import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import {
  generateClientId,
  readReadFallbackCache,
  toPostgrestError,
  writeReadFallbackCache,
  writeThroughWithQueue,
} from './offlineWriteThrough';

export type TodayTodo = Database['public']['Tables']['today_todos']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

function authRequiredError(): PostgrestError {
  return {
    name: 'PostgrestError',
    code: 'AUTH_REQUIRED',
    details: 'No active authenticated Supabase session.',
    hint: 'Sign in to access today todos.',
    message: 'Authentication required.',
  };
}

// ── Offline fallback cache ───────────────────────────────────────────────────
// One bounded entry: rows for the most recently viewed dates. Successful reads
// refresh it; queued writes patch it so offline edits stay visible until sync.

const TODOS_CACHE_KEY = 'today_todos_by_date';
const TODOS_CACHE_MAX_DATES = 7;

type TodosCache = Record<string, TodayTodo[]>;

function readTodosCache(): TodosCache {
  return readReadFallbackCache<TodosCache>(TODOS_CACHE_KEY) ?? {};
}

function writeTodosCache(cache: TodosCache): void {
  const dates = Object.keys(cache).sort().slice(-TODOS_CACHE_MAX_DATES);
  const pruned: TodosCache = {};
  for (const date of dates) pruned[date] = cache[date];
  writeReadFallbackCache(TODOS_CACHE_KEY, pruned);
}

function cacheReplaceDate(dateISO: string, rows: TodayTodo[]): void {
  const cache = readTodosCache();
  cache[dateISO] = rows;
  writeTodosCache(cache);
}

function cacheUpsertTodo(row: TodayTodo): void {
  const cache = readTodosCache();
  for (const date of Object.keys(cache)) {
    cache[date] = cache[date].filter((todo) => todo.id !== row.id);
  }
  cache[row.todo_date] = [...(cache[row.todo_date] ?? []), row];
  writeTodosCache(cache);
}

function cachePatchTodo(id: string, patch: Record<string, unknown>): void {
  const cache = readTodosCache();
  for (const date of Object.keys(cache)) {
    const match = cache[date].find((todo) => todo.id === id);
    if (!match) continue;
    const updated = { ...match, ...patch } as TodayTodo;
    cache[date] = cache[date].filter((todo) => todo.id !== id);
    cache[updated.todo_date] = [...(cache[updated.todo_date] ?? []), updated];
    break;
  }
  writeTodosCache(cache);
}

function cacheRemoveTodo(id: string): void {
  const cache = readTodosCache();
  for (const date of Object.keys(cache)) {
    cache[date] = cache[date].filter((todo) => todo.id !== id);
  }
  writeTodosCache(cache);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function fetchTodayTodos(dateISO: string): Promise<ServiceResponse<TodayTodo[]>> {
  if (!canUseSupabaseData()) return { data: [], error: null };
  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('today_todos')
      .select('*')
      .eq('todo_date', dateISO)
      .order('completed', { ascending: true })
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

  if (!result.ok) {
    // Outage: serve the last known rows for this day (including any queued
    // offline edits) so the list stays usable until sync returns.
    const cached = readTodosCache()[dateISO];
    if (cached) return { data: cached, error: null };
    return { data: null, error: toPostgrestError(result.error) };
  }

  cacheReplaceDate(dateISO, result.data);
  return { data: result.data, error: null };
}

// ── Writes (apply locally, queue on outage) ─────────────────────────────────

export async function createTodayTodo(
  userId: string,
  input: { dateISO: string; title: string; notes?: string | null; orderIndex?: number; estimatedMinutes?: number | null; isFocus?: boolean }
): Promise<ServiceResponse<TodayTodo>> {
  if (!canUseSupabaseData()) return { data: null, error: authRequiredError() };
  const supabase = getSupabaseClient();

  const id = generateClientId();
  const nowIso = new Date().toISOString();
  const payload = {
    id,
    user_id: userId,
    todo_date: input.dateISO,
    title: input.title,
    notes: input.notes ?? null,
    order_index: input.orderIndex ?? 0,
    estimated_minutes: input.estimatedMinutes ?? null,
    is_focus: input.isFocus ?? false,
  };

  const outcome = await writeThroughWithQueue<TodayTodo>({
    feature: 'todos',
    operation: 'today_todo.create',
    payload,
    dedupeKey: id,
    write: async () => {
      const { data, error } = await supabase.from('today_todos').insert(payload).select('*').single();
      if (error) throw error;
      return data;
    },
    optimistic: () => ({
      ...payload,
      completed: false,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }),
  });

  if (outcome.error) return { data: null, error: toPostgrestError(outcome.error) };
  if (outcome.queued) cacheUpsertTodo(outcome.data);
  return { data: outcome.data, error: null };
}

export async function updateTodayTodo(
  id: string,
  patch: Partial<Pick<TodayTodo, 'title' | 'notes' | 'completed' | 'order_index' | 'todo_date' | 'estimated_minutes' | 'is_focus'>>
): Promise<ServiceResponse<TodayTodo>> {
  if (!canUseSupabaseData()) return { data: null, error: authRequiredError() };
  const supabase = getSupabaseClient();
  const payload: Record<string, unknown> = { ...patch };
  if (patch.completed === true) payload.completed_at = new Date().toISOString();
  if (patch.completed === false) payload.completed_at = null;

  const outcome = await writeThroughWithQueue<TodayTodo | null>({
    feature: 'todos',
    operation: 'today_todo.update',
    // No dedupeKey: patches are partial, so each queued update replays in order.
    payload: { id, patch: payload },
    write: async () => {
      const { data, error } = await supabase
        .from('today_todos')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    optimistic: () => null,
  });

  if (outcome.error) return { data: null, error: toPostgrestError(outcome.error) };
  if (outcome.queued) {
    cachePatchTodo(id, payload);
    const cached = Object.values(readTodosCache())
      .flat()
      .find((todo) => todo.id === id);
    return { data: cached ?? null, error: null };
  }
  return { data: outcome.data, error: null };
}

export async function deleteTodayTodo(id: string): Promise<ServiceResponse<null>> {
  if (!canUseSupabaseData()) return { data: null, error: authRequiredError() };
  const supabase = getSupabaseClient();

  const outcome = await writeThroughWithQueue<null>({
    feature: 'todos',
    operation: 'today_todo.delete',
    payload: { id },
    dedupeKey: id,
    write: async () => {
      const { error } = await supabase.from('today_todos').delete().eq('id', id);
      if (error) throw error;
      return null;
    },
    optimistic: () => null,
  });

  if (outcome.error) return { data: null, error: toPostgrestError(outcome.error) };
  if (outcome.queued) cacheRemoveTodo(id);
  return { data: null, error: null };
}
