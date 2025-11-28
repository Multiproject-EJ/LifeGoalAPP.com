import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type UserReminderPrefsRow = Database['public']['Tables']['user_reminder_prefs']['Row'];
export type UserReminderPrefsInsert = Database['public']['Tables']['user_reminder_prefs']['Insert'];
export type UserReminderPrefsUpdate = Database['public']['Tables']['user_reminder_prefs']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export type ReminderPrefsPayload = {
  timezone: string;
  windowStart: string;
  windowEnd: string;
};

const DEFAULT_PREFS: Omit<UserReminderPrefsRow, 'user_id'> = {
  timezone: 'UTC',
  window_start: '08:00:00',
  window_end: '10:00:00',
  created_at: null,
  updated_at: null,
};

// Demo mode storage
const DEMO_STORAGE_KEY = 'demo_reminder_prefs';

function getDemoPrefs(userId: string): UserReminderPrefsRow {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.user_id === userId) {
        return data;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { user_id: userId, ...DEFAULT_PREFS };
}

function setDemoPrefs(prefs: UserReminderPrefsRow): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch reminder preferences for a user
 */
export async function fetchReminderPrefs(userId: string): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoPrefs(userId), error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_reminder_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserReminderPrefsRow>();

  if (error) {
    return { data: null, error };
  }

  // Return defaults if no prefs exist
  return {
    data: data || { user_id: userId, ...DEFAULT_PREFS },
    error: null,
  };
}

/**
 * Update reminder preferences for a user
 */
export async function updateReminderPrefs(
  userId: string,
  payload: Partial<ReminderPrefsPayload>
): Promise<ServiceResponse<UserReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    const existing = getDemoPrefs(userId);
    const updated: UserReminderPrefsRow = {
      ...existing,
      timezone: payload.timezone ?? existing.timezone,
      window_start: payload.windowStart ? normalizeTime(payload.windowStart) : existing.window_start,
      window_end: payload.windowEnd ? normalizeTime(payload.windowEnd) : existing.window_end,
      updated_at: new Date().toISOString(),
    };
    setDemoPrefs(updated);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  const updateData: UserReminderPrefsInsert = {
    user_id: userId,
  };

  if (payload.timezone !== undefined) {
    updateData.timezone = payload.timezone;
  }
  if (payload.windowStart !== undefined) {
    updateData.window_start = normalizeTime(payload.windowStart);
  }
  if (payload.windowEnd !== undefined) {
    updateData.window_end = normalizeTime(payload.windowEnd);
  }

  const { data, error } = await supabase
    .from('user_reminder_prefs')
    .upsert(updateData, { onConflict: 'user_id' })
    .select()
    .single<UserReminderPrefsRow>();

  return { data, error };
}

/**
 * Normalize time to HH:MM:SS format
 */
function normalizeTime(time: string): string {
  // If already has seconds, return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  // If HH:MM format (two-digit hour), add :00
  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }
  // If H:MM format (single-digit hour like "8:00"), pad hour and add seconds
  if (/^\d:\d{2}$/.test(time)) {
    return `0${time}:00`;
  }
  // If H:MM:SS format (single-digit hour with seconds), pad hour
  if (/^\d:\d{2}:\d{2}$/.test(time)) {
    return `0${time}`;
  }
  return time;
}

/**
 * Format time for display (HH:MM)
 */
export function formatTimeForDisplay(time: string | null): string {
  if (!time) return '08:00';
  // Remove seconds if present
  const match = time.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '08:00';
}

/**
 * Get browser's detected timezone
 */
export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Common timezone options for select dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Perth', label: 'Perth' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];
