import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
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

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
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

function normalizeSearchTerm(search?: string | null): string | null {
  if (!search) return null;
  const trimmed = search.trim();
  if (!trimmed) return null;
  return `%${trimmed.replace(/%/g, '\\%')}%`;
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
  return { data: response.data, error: response.error };
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

  const supabase = getSupabaseClient();
  
  // Ensure we have a valid session before attempting the insert
  // This prevents RLS policy violations due to expired or missing auth tokens
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return {
      data: null,
      error: {
        message: 'Please sign in again to save journal entries.',
        details: sessionError?.message || 'No active session',
        hint: 'Your session may have expired',
        code: 'PGRST301',
      } as unknown as PostgrestError,
    };
  }
  
  // Verify the user_id in the payload matches the authenticated user
  // This prevents accidental permission issues
  if (payload.user_id !== session.user.id) {
    return {
      data: null,
      error: {
        message: 'Authentication mismatch. Please refresh the page and try again.',
        details: `Payload user_id (${payload.user_id}) does not match session user id (${session.user.id})`,
        hint: 'This may indicate a stale session',
        code: 'PGRST301',
      } as unknown as PostgrestError,
    };
  }
  
  return supabase.from('journal_entries').insert(payload).select().single();
}

export async function updateJournalEntry(
  id: string,
  payload: JournalEntryUpdate,
): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    return { data: updateDemoJournalEntry(id, payload), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase.from('journal_entries').update(payload).eq('id', id).select().single();
}

export async function deleteJournalEntry(id: string): Promise<ServiceResponse<JournalEntry>> {
  if (!canUseSupabaseData()) {
    return { data: removeDemoJournalEntry(id), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase.from('journal_entries').delete().eq('id', id).select().single();
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
