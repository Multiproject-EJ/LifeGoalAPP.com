import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type HabitReminderPrefsRow = Database['public']['Tables']['habit_reminder_prefs']['Row'];
export type ReminderActionLogRow = Database['public']['Tables']['reminder_action_logs']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export type HabitWithReminderPref = {
  habit_id: string;
  title: string;
  emoji: string | null;
  enabled: boolean;
  preferred_time: string | null;
};

export type ReminderActionLogWithHabit = {
  id: string;
  habit_id: string;
  action: 'done' | 'snooze' | 'dismiss';
  payload: unknown | null;
  created_at: string | null;
  habits_v2: {
    title: string;
    emoji: string | null;
  };
};

// Demo mode storage
const DEMO_HABIT_PREFS_KEY = 'demo_habit_reminder_prefs';
const DEMO_ACTION_LOGS_KEY = 'demo_reminder_action_logs';

function getDemoHabitPrefs(): HabitWithReminderPref[] {
  try {
    const stored = localStorage.getItem(DEMO_HABIT_PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function setDemoHabitPrefs(prefs: HabitWithReminderPref[]): void {
  try {
    localStorage.setItem(DEMO_HABIT_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

function getDemoActionLogs(): ReminderActionLogWithHabit[] {
  try {
    const stored = localStorage.getItem(DEMO_ACTION_LOGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Fetch per-habit reminder preferences for all user's habits
 */
export async function fetchHabitReminderPrefs(): Promise<ServiceResponse<HabitWithReminderPref[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoHabitPrefs(), error: null };
  }

  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { data: null, error: sessionError || new Error('No session') };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/habit-prefs`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errorData.error || 'Failed to fetch habit prefs') };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update per-habit reminder preference
 */
export async function updateHabitReminderPref(
  habitId: string,
  updates: { enabled?: boolean; preferred_time?: string | null }
): Promise<ServiceResponse<HabitReminderPrefsRow>> {
  if (!canUseSupabaseData()) {
    // Demo mode - update local storage
    const prefs = getDemoHabitPrefs();
    const index = prefs.findIndex(p => p.habit_id === habitId);
    if (index >= 0) {
      if (updates.enabled !== undefined) prefs[index].enabled = updates.enabled;
      if (updates.preferred_time !== undefined) prefs[index].preferred_time = updates.preferred_time;
      setDemoHabitPrefs(prefs);
      return { 
        data: { 
          habit_id: habitId, 
          enabled: prefs[index].enabled,
          preferred_time: prefs[index].preferred_time,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, 
        error: null 
      };
    }
    return { data: null, error: new Error('Habit not found') };
  }

  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { data: null, error: sessionError || new Error('No session') };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/habit-prefs`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          habit_id: habitId,
          ...updates,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errorData.error || 'Failed to update habit pref') };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch recent reminder action logs for debugging
 */
export async function fetchReminderActionLogs(
  limit: number = 50
): Promise<ServiceResponse<ReminderActionLogWithHabit[]>> {
  if (!canUseSupabaseData()) {
    return { data: getDemoActionLogs(), error: null };
  }

  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { data: null, error: sessionError || new Error('No session') };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/action-logs?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errorData.error || 'Failed to fetch action logs') };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Format time for display (HH:MM)
 */
export function formatTimeForDisplay(time: string | null): string {
  if (!time) return '';
  // Match times with single or double digit hours/minutes, and optional seconds
  const match = time.match(/^(\d{1,2}):(\d{1,2})/);
  if (!match) return '';
  // Pad single digits with leading zeros
  const hours = match[1].padStart(2, '0');
  const minutes = match[2].padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format action for display
 */
export function formatActionLabel(action: string): string {
  switch (action) {
    case 'done':
      return '✓ Done';
    case 'snooze':
      return '💤 Snoozed';
    case 'dismiss':
      return '✕ Dismissed';
    default:
      return action;
  }
}
