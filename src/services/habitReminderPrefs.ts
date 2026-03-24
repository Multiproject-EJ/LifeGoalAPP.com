import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  buildReminderPrefKey,
  enqueueReminderPrefMutation,
  getLocalReminderPrefRecord,
  getReminderPrefMutationCounts,
  listLocalReminderPrefRecordsForUser,
  listPendingReminderPrefMutations,
  removeReminderPrefMutation,
  removeLocalReminderPrefRecord,
  updateReminderPrefMutation,
  upsertLocalReminderPrefRecord,
} from '../data/habitReminderPrefsOfflineRepo';

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

export type HabitReminderQueueStatus = { pending: number; failed: number };

// Demo mode storage
const DEMO_HABIT_PREFS_KEY = 'demo_habit_reminder_prefs';
const DEMO_ACTION_LOGS_KEY = 'demo_reminder_action_logs';

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

async function getActiveSession() {
  const supabase = getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

async function mergeLocalReminderPrefs(
  userId: string,
  remotePrefs: HabitWithReminderPref[],
): Promise<HabitWithReminderPref[]> {
  const local = await listLocalReminderPrefRecordsForUser(userId);
  if (!local.length) return remotePrefs;
  const byId = new Map(remotePrefs.map((pref) => [pref.habit_id, pref] as const));
  for (const record of local) {
    byId.set(record.habit_id, record.pref);
  }
  return Array.from(byId.values());
}

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

  const { session, error: sessionError } = await getActiveSession();
  
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

    const data = (await response.json()) as HabitWithReminderPref[];
    const merged = await mergeLocalReminderPrefs(session.user.id, data);
    return { data: merged, error: null };
  } catch (err) {
    if (isNetworkLikeError(err)) {
      const merged = await mergeLocalReminderPrefs(session.user.id, []);
      return { data: merged, error: null };
    }
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

  const { session, error: sessionError } = await getActiveSession();
  
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
      const err = new Error(errorData.error || 'Failed to update habit pref');
      if (!isNetworkLikeError(err)) {
        return { data: null, error: err };
      }
      const queued = await queueLocalReminderPrefUpdate(session.user.id, habitId, updates);
      return { data: queued, error: null };
    }

    const data = await response.json();
    await removeLocalReminderPrefRecord(buildReminderPrefKey(session.user.id, habitId));
    await removeReminderPrefMutation(`habit-reminder-mut-${buildReminderPrefKey(session.user.id, habitId)}`);
    return { data, error: null };
  } catch (err) {
    if (isNetworkLikeError(err)) {
      const queued = await queueLocalReminderPrefUpdate(session.user.id, habitId, updates);
      return { data: queued, error: null };
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

async function queueLocalReminderPrefUpdate(
  userId: string,
  habitId: string,
  updates: { enabled?: boolean; preferred_time?: string | null },
): Promise<HabitReminderPrefsRow> {
  const key = buildReminderPrefKey(userId, habitId);
  const existing = await getLocalReminderPrefRecord(key);
  const nowMs = Date.now();
  const nextEnabled = updates.enabled ?? existing?.pref.enabled ?? false;
  const nextTime = updates.preferred_time !== undefined ? updates.preferred_time : existing?.pref.preferred_time ?? null;
  const pref: HabitWithReminderPref = {
    habit_id: habitId,
    title: existing?.pref.title ?? 'Habit',
    emoji: existing?.pref.emoji ?? null,
    enabled: nextEnabled,
    preferred_time: nextTime,
  };

  await upsertLocalReminderPrefRecord({
    id: key,
    user_id: userId,
    habit_id: habitId,
    pref,
    sync_state: 'pending_upsert',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueReminderPrefMutation({
    id: `habit-reminder-mut-${key}`,
    user_id: userId,
    habit_id: habitId,
    updates,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });

  return {
    habit_id: habitId,
    enabled: nextEnabled,
    preferred_time: nextTime,
    created_at: new Date(nowMs).toISOString(),
    updated_at: new Date(nowMs).toISOString(),
  } as HabitReminderPrefsRow;
}

export async function syncQueuedHabitReminderPrefs(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  const { session, error } = await getActiveSession();
  if (error || !session) return;
  const pending = await listPendingReminderPrefMutations(userId);

  for (const mutation of pending) {
    const key = buildReminderPrefKey(userId, mutation.habit_id);
    try {
      await updateReminderPrefMutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminders/habit-prefs`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            habit_id: mutation.habit_id,
            ...mutation.updates,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync queued reminder preference');
      }

      await removeLocalReminderPrefRecord(key);
      await removeReminderPrefMutation(mutation.id);
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : String(syncError);
      await updateReminderPrefMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: message,
      });
      const local = await getLocalReminderPrefRecord(key);
      if (local) {
        await upsertLocalReminderPrefRecord({
          ...local,
          sync_state: 'failed',
          updated_at_ms: Date.now(),
          last_error: message,
        });
      }
    }
  }
}

export async function getHabitReminderQueueStatus(userId: string): Promise<HabitReminderQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  return getReminderPrefMutationCounts(userId);
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
