import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

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

export async function fetchTodayTodos(dateISO: string): Promise<ServiceResponse<TodayTodo[]>> {
  if (!canUseSupabaseData()) return { data: [], error: null };
  const supabase = getSupabaseClient();
  return supabase
    .from('today_todos')
    .select('*')
    .eq('todo_date', dateISO)
    .order('completed', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
}

/**
 * Fetch undone todos dated strictly before `beforeDateISO` (typically "today"),
 * optionally bounded to dates on/after `sinceDateISO` to avoid surfacing very old
 * items. Used by the day-change cleanup prompt so it can catch up undone todos from
 * any recent past day, not just the immediately preceding day.
 */
export async function fetchUndonePastTodos(
  beforeDateISO: string,
  sinceDateISO?: string,
): Promise<ServiceResponse<TodayTodo[]>> {
  if (!canUseSupabaseData()) return { data: [], error: null };
  const supabase = getSupabaseClient();
  let query = supabase
    .from('today_todos')
    .select('*')
    .lt('todo_date', beforeDateISO)
    .eq('completed', false);
  if (sinceDateISO) {
    query = query.gte('todo_date', sinceDateISO);
  }
  return query
    .order('todo_date', { ascending: false })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
}

export async function createTodayTodo(
  userId: string,
  input: { dateISO: string; title: string; notes?: string | null; orderIndex?: number; estimatedMinutes?: number | null; isFocus?: boolean }
): Promise<ServiceResponse<TodayTodo>> {
  if (!canUseSupabaseData()) return { data: null, error: authRequiredError() };
  const supabase = getSupabaseClient();
  return supabase
    .from('today_todos')
    .insert({
      user_id: userId,
      todo_date: input.dateISO,
      title: input.title,
      notes: input.notes ?? null,
      order_index: input.orderIndex ?? 0,
      estimated_minutes: input.estimatedMinutes ?? null,
      is_focus: input.isFocus ?? false,
    })
    .select('*')
    .single();
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
  return supabase
    .from('today_todos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
}


export async function deleteTodayTodo(id: string): Promise<ServiceResponse<null>> {
  if (!canUseSupabaseData()) return { data: null, error: authRequiredError() };
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('today_todos')
    .delete()
    .eq('id', id);
  return { data: null, error };
}
