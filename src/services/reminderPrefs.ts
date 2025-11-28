import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient, getSupabaseUrl } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { DEMO_USER_ID } from './demoData';

export type UserReminderPrefsRow = Database['public']['Tables']['user_reminder_prefs']['Row'];
export type UserReminderPrefsInsert = Database['public']['Tables']['user_reminder_prefs']['Insert'];
export type UserReminderPrefsUpdate = Database['public']['Tables']['user_reminder_prefs']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export type ReminderPrefsPayload = {
  timezone?: string;
  windowStart?: string;
  windowEnd?: string;
};

// Demo mode storage for reminder preferences
// Using Map for better performance with frequent lookups and to avoid prototype pollution
const demoReminderPrefs = new Map<string, UserReminderPrefsRow>();

function getDemoReminderPrefs(userId: string): UserReminderPrefsRow | null {
  return demoReminderPrefs.get(userId) || null;
}

function upsertDemoReminderPrefs(userId: string, prefs: Partial<UserReminderPrefsRow>): UserReminderPrefsRow {
  const existing = demoReminderPrefs.get(userId);
  const now = new Date().toISOString();
  
  const newPrefs: UserReminderPrefsRow = {
    user_id: userId,
    timezone: prefs.timezone ?? existing?.timezone ?? 'UTC',
    window_start: prefs.window_start ?? existing?.window_start ?? '08:00:00',
    window_end: prefs.window_end ?? existing?.window_end ?? '10:00:00',
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  
  demoReminderPrefs.set(userId, newPrefs);
  return newPrefs;
}

/**
 * Fetches reminder preferences for the current user.
 * Uses the Edge Function /prefs endpoint.
 */
export async function fetchReminderPrefs(
  accessToken: string,
): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoReminderPrefs(DEMO_USER_ID), error: null };
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      return { data: null, error: new Error('Supabase URL not configured') };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/prefs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { data: null, error: new Error(errorData.error || `Failed: ${response.status}`) };
    }

    const result = await response.json();
    return { data: result.prefs, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to fetch reminder preferences'),
    };
  }
}

/**
 * Updates reminder preferences for the current user.
 * Uses the Edge Function /prefs endpoint.
 */
export async function updateReminderPrefs(
  accessToken: string,
  payload: ReminderPrefsPayload,
): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    const prefs = upsertDemoReminderPrefs(DEMO_USER_ID, {
      timezone: payload.timezone,
      window_start: payload.windowStart,
      window_end: payload.windowEnd,
    });
    return { data: prefs, error: null };
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      return { data: null, error: new Error('Supabase URL not configured') };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/prefs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timezone: payload.timezone,
        window_start: payload.windowStart,
        window_end: payload.windowEnd,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { data: null, error: new Error(errorData.error || `Failed: ${response.status}`) };
    }

    const result = await response.json();
    return { data: result.prefs, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to update reminder preferences'),
    };
  }
}

/**
 * Fetches reminder preferences directly from Supabase (for use in components).
 */
export async function fetchReminderPrefsFromDB(
  userId: string,
): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoReminderPrefs(userId || DEMO_USER_ID), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('user_reminder_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserReminderPrefsRow>();
}

/**
 * Upserts reminder preferences directly to Supabase.
 */
export async function upsertReminderPrefsInDB(
  userId: string,
  payload: ReminderPrefsPayload,
): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    const prefs = upsertDemoReminderPrefs(userId || DEMO_USER_ID, {
      timezone: payload.timezone,
      window_start: payload.windowStart,
      window_end: payload.windowEnd,
    });
    return { data: prefs, error: null };
  }

  const supabase = getSupabaseClient();
  
  const record: UserReminderPrefsInsert = {
    user_id: userId,
    timezone: payload.timezone ?? 'UTC',
    window_start: payload.windowStart ?? '08:00:00',
    window_end: payload.windowEnd ?? '10:00:00',
  };

  return supabase
    .from('user_reminder_prefs')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single<UserReminderPrefsRow>();
}

/**
 * Triggers the reminder CRON job manually (for testing).
 * Returns the result of the CRON execution.
 */
export async function triggerReminderCron(
  accessToken: string,
): Promise<{ success: boolean; message?: string; sent?: number; error?: string }> {
  try {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase URL not configured' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-reminders/cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to trigger CRON',
    };
  }
}
