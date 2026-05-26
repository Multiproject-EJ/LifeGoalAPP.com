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

export async function createTodayTodo(
  userId: string,
  input: { dateISO: string; title: string; notes?: string | null; orderIndex?: number }
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
    })
    .select('*')
    .single();
}

export async function updateTodayTodo(
  id: string,
  patch: Partial<Pick<TodayTodo, 'title' | 'notes' | 'completed' | 'order_index'>>
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
