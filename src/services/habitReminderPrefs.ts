import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import { shouldQueueAfterFailure } from './offlineWriteThrough';
import {
  buildReminderPrefKey,
  getLocalReminderPrefRecord,
  listLocalReminderPrefRecordsForUser,
  listPendingReminderPrefMutations,
  removeReminderPrefMutation,
  removeLocalReminderPrefRecord,
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

  const result = await guardedCloudCall('edgeFunctions', async () => {
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
      throw { status: response.status, message: `Reminder preference request failed (${response.status})` };
    }
    return (await response.json()) as HabitWithReminderPref[];
  });

  if (!result.ok) {
    // Outage: local pending preferences keep the settings screen usable.
    const merged = await mergeLocalReminderPrefs(session.user.id, []);
    return { data: merged, error: null };
  }

  const merged = await mergeLocalReminderPrefs(session.user.id, result.data);
  return { data: merged, error: null };
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

  const result = await guardedCloudCall('edgeFunctions', async () => {
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
      throw { status: response.status, message: `Reminder preference update failed (${response.status})` };
    }
    return (await response.json()) as HabitReminderPrefsRow;
  });

  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      const queued = await queueLocalReminderPrefUpdate(session.user.id, habitId, updates);
      return { data: queued, error: null };
    }
    return { data: null, error: new Error(result.error.explanation) };
  }

  await removeLocalReminderPrefRecord(buildReminderPrefKey(session.user.id, habitId));
  return { data: result.data, error: null };
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
  // The queued payload carries the merged full state for this habit, so
  // deduping on the pref key is safe: the latest local edit wins.
  await getMutationQueue().enqueue({
    feature: 'habit_reminders',
    operation: 'habit_reminder_pref.update',
    payload: {
      userId,
      habitId,
      updates: { enabled: nextEnabled, preferred_time: nextTime },
    },
    dedupeKey: key,
  });

  return {
    habit_id: habitId,
    enabled: nextEnabled,
    preferred_time: nextTime,
    created_at: new Date(nowMs).toISOString(),
    updated_at: new Date(nowMs).toISOString(),
  } as HabitReminderPrefsRow;
}

let legacyReminderQueueMigrated = false;

/**
 * One-time convergence of the pre-framework reminder-pref queue onto the
 * shared MutationQueue. Pending preference edits survive the upgrade.
 */
export async function migrateLegacyReminderPrefQueue(userId: string): Promise<void> {
  if (legacyReminderQueueMigrated) return;
  legacyReminderQueueMigrated = true;

  try {
    const queue = getMutationQueue();
    for (const legacy of await listPendingReminderPrefMutations(userId)) {
      await queue.enqueue({
        feature: 'habit_reminders',
        operation: 'habit_reminder_pref.update',
        payload: { userId, habitId: legacy.habit_id, updates: legacy.updates },
        dedupeKey: buildReminderPrefKey(userId, legacy.habit_id),
      });
      await removeReminderPrefMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyReminderQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedHabitReminderPrefs(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyReminderPrefQueue(userId);
  await getSyncEngine().syncNow();
}

export async function getHabitReminderQueueStatus(_userId: string): Promise<HabitReminderQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'habit_reminders') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
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

  const result = await guardedCloudCall('edgeFunctions', async () => {
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
      throw { status: response.status, message: `Reminder action log request failed (${response.status})` };
    }
    return (await response.json()) as ReminderActionLogWithHabit[];
  });

  if (!result.ok) {
    return { data: null, error: new Error(result.error.explanation) };
  }
  return { data: result.data, error: null };
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
