/**
 * Legacy Habits Adapter
 * 
 * This adapter provides backward compatibility for code that still uses
 * the legacy habits.ts service signatures. Internally, it redirects calls
 * to the habitsV2.ts service helpers.
 * 
 * @deprecated This adapter is temporary during the migration period.
 * New code should use habitsV2.ts directly.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import type { Database, Json } from '../lib/database.types';
import { buildDefaultAutoProgressState } from '../features/habits/autoProgression';
import {
  listHabitsV2,
  createHabitV2,
  logHabitCompletionV2,
  listTodayHabitLogsV2,
  listHabitLogsForRangeMultiV2,
  archiveHabitV2,
  type HabitV2Row,
  type HabitLogV2Row,
} from '../services/habitsV2';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import {
  buildHabitLogKey,
  enqueueHabitLogMutation,
  getHabitLogMutationCounts,
  getLocalHabitLogRecord,
  listLocalHabitLogRecordsForUser,
  listPendingHabitLogMutations,
  removeHabitLogMutation,
  removeLocalHabitLogRecord,
  updateHabitLogMutation,
  upsertLocalHabitLogRecord,
} from '../data/habitLogsOfflineRepo';

// Legacy type definitions for compatibility
type LegacyHabitRow = Database['public']['Tables']['habits']['Row'];
type LegacyHabitInsert = Database['public']['Tables']['habits']['Insert'];
type LegacyHabitUpdate = Database['public']['Tables']['habits']['Update'];
type LegacyHabitLogRow = Database['public']['Tables']['habit_logs']['Row'] & {
  progress_state?: string | null;
  completion_percentage?: number | null;
  logged_stage?: string | null;
};
type LegacyHabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'] & {
  progress_state?: string | null;
  completion_percentage?: number | null;
  logged_stage?: string | null;
  value?: number | null;
  note?: string | null;
};

export type LegacyHabitWithGoal = LegacyHabitRow & {
  emoji?: string | null;
  type?: Database['public']['Enums']['habit_type'];
  target_num?: number | null;
  target_unit?: string | null;
  domain_key?: string | null;
  status?: Database['public']['Enums']['habit_lifecycle_status'] | null;
  archived?: boolean | null;
  autoprog?: Json | null;
  habit_environment?: string | null;
  goal: {
    id: string;
    title: string;
    target_date: string | null;
  } | null;
};

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export type HabitLogQueueStatus = { pending: number; failed: number };

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

function nowIso(): string {
  return new Date().toISOString();
}

function buildLocalHabitLogRow(userId: string, payload: LegacyHabitLogInsert): HabitLogV2Row {
  return {
    id: `local-habit-log-${buildHabitLogKey(userId, payload.habit_id, payload.date)}`,
    user_id: userId,
    habit_id: payload.habit_id,
    done: payload.completed ?? true,
    value: payload.value ?? null,
    note: payload.note ?? null,
    mood: null,
    date: payload.date,
    progress_state: payload.progress_state ?? null,
    completion_percentage: payload.completion_percentage ?? null,
    logged_stage: payload.logged_stage ?? null,
    ts: payload.date ? new Date(`${payload.date}T00:00:00Z`).toISOString() : nowIso(),
  } as HabitLogV2Row;
}

async function queueLocalHabitLogUpsert(payload: LegacyHabitLogInsert, userId: string): Promise<LegacyHabitLogRow> {
  const key = buildHabitLogKey(userId, payload.habit_id, payload.date);
  const row = buildLocalHabitLogRow(userId, payload);
  const nowMs = Date.now();
  await upsertLocalHabitLogRecord({
    id: key,
    user_id: userId,
    habit_id: payload.habit_id,
    date: payload.date,
    row,
    sync_state: 'pending_upsert',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueHabitLogMutation({
    id: `habit-log-mut-${key}`,
    user_id: userId,
    habit_id: payload.habit_id,
    date: payload.date,
    operation: 'upsert',
    payload: {
      habit_id: payload.habit_id,
      user_id: userId,
      done: payload.completed ?? true,
      value: payload.value ?? null,
      note: payload.note ?? null,
      date: payload.date,
      progress_state: payload.progress_state ?? null,
      completion_percentage: payload.completion_percentage ?? null,
      logged_stage: payload.logged_stage ?? null,
      ts: payload.date ? new Date(`${payload.date}T00:00:00Z`).toISOString() : undefined,
    },
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });

  return toLegacyLog(row);
}

async function queueLocalHabitLogDelete(habitId: string, date: string, userId: string): Promise<void> {
  const key = buildHabitLogKey(userId, habitId, date);
  const existing = await getLocalHabitLogRecord(key);
  const nowMs = Date.now();
  await upsertLocalHabitLogRecord({
    id: key,
    user_id: userId,
    habit_id: habitId,
    date,
    row: existing?.row ?? null,
    sync_state: 'pending_delete',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueHabitLogMutation({
    id: `habit-log-mut-${key}`,
    user_id: userId,
    habit_id: habitId,
    date,
    operation: 'delete',
    payload: null,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });
}

/**
 * Log deprecation warning (only in development mode)
 */
function logDeprecationWarning(functionName: string): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[DEPRECATED] ${functionName} from legacyHabitsAdapter.ts is deprecated. ` +
      'Please migrate to habitsV2.ts functions. This adapter will be removed in a future release.'
    );
  }
}

/**
 * Convert v2 habit to legacy habit format
 */
function tolegacyHabit(v2Habit: HabitV2Row): LegacyHabitRow {
  return {
    id: v2Habit.id,
    goal_id: v2Habit.goal_id || '', // Legacy requires goal_id, provide empty string if null
    name: v2Habit.title,
    frequency: deriveFrequencyFromSchedule(v2Habit.schedule),
    schedule: v2Habit.schedule as Json,
  };
}

/**
 * Convert v2 habit to legacy habit with goal format
 */
function toLegacyHabitWithGoal(v2Habit: HabitV2Row): LegacyHabitWithGoal {
  return {
    ...tolegacyHabit(v2Habit),
    emoji: v2Habit.emoji ?? null,
    type: v2Habit.type,
    target_num: v2Habit.target_num ?? null,
    target_unit: v2Habit.target_unit ?? null,
    domain_key: v2Habit.domain_key ?? null,
    status: v2Habit.status ?? null,
    archived: v2Habit.archived ?? null,
    autoprog: v2Habit.autoprog ?? null,
    habit_environment: v2Habit.habit_environment ?? null,
    goal: v2Habit.goal_id ? {
      id: v2Habit.goal_id,
      title: '', // Goal title not available from v2 habit directly
      target_date: null,
    } : null,
  };
}

/**
 * Convert v2 log to legacy log format
 */
function toLegacyLog(v2Log: HabitLogV2Row): LegacyHabitLogRow {
  return {
    id: v2Log.id,
    habit_id: v2Log.habit_id,
    date: v2Log.date,
    completed: v2Log.done,
    progress_state: v2Log.progress_state,
    completion_percentage: v2Log.completion_percentage,
    logged_stage: v2Log.logged_stage,
  };
}

/**
 * Derive frequency string from v2 schedule JSON
 */
function deriveFrequencyFromSchedule(schedule: Json): string {
  if (!schedule || typeof schedule !== 'object') {
    return 'daily';
  }
  
  const scheduleObj = schedule as Record<string, Json>;
  const mode = scheduleObj.mode;
  
  if (mode === 'daily') return 'daily';
  if (mode === 'specific_days') return 'weekly';
  if (mode === 'times_per_week') return 'weekly';
  if (mode === 'every_n_days') return 'custom';
  
  return 'daily';
}

/**
 * Fetch habits by goal ID
 * @deprecated Use listHabitsV2() and filter by goal_id instead
 */
export async function fetchHabitsByGoal(goalId: string): Promise<ServiceResponse<LegacyHabitRow[]>> {
  logDeprecationWarning('fetchHabitsByGoal');
  
  const { data, error } = await listHabitsV2();
  
  if (error) {
    return { data: null, error };
  }
  
  const filteredHabits = (data || [])
    .filter(habit => habit.goal_id === goalId)
    .map(tolegacyHabit);
  
  return { data: filteredHabits, error: null };
}

/**
 * Fetch all habits for a user
 * @deprecated Use listHabitsV2() instead
 */
export async function fetchHabitsForUser(userId: string): Promise<ServiceResponse<LegacyHabitWithGoal[]>> {
  logDeprecationWarning('fetchHabitsForUser');
  
  const { data, error } = await listHabitsV2();
  
  if (error) {
    return { data: null, error };
  }
  
  // If goal information is needed, we need to fetch it separately
  // For now, return habits with minimal goal info
  const habitsWithGoal = (data || []).map(toLegacyHabitWithGoal);
  
  return { data: habitsWithGoal, error: null };
}

/**
 * Create or update a habit
 * @deprecated Use createHabitV2() for new habits
 */
export async function upsertHabit(
  payload: LegacyHabitInsert | LegacyHabitUpdate,
  userId?: string
): Promise<ServiceResponse<LegacyHabitRow>> {
  logDeprecationWarning('upsertHabit');
  
  if (!userId) {
    // Try to get user from session
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided and not authenticated' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  // Determine schedule from legacy format
  const schedule = payload.schedule || { mode: 'daily' };
  
  const v2Payload = {
    title: payload.name || '',
    emoji: null,
    type: 'boolean' as const,
    schedule: schedule as Json,
    autoprog: buildDefaultAutoProgressState({
      schedule: schedule as Json,
      target: null,
    }) as Database['public']['Tables']['habits_v2']['Insert']['autoprog'],
    goal_id: payload.goal_id || null,
    archived: false,
  };
  
  const { data, error } = await createHabitV2(v2Payload, userId);
  
  if (error) {
    return { data: null, error };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: tolegacyHabit(data), error: null };
}

/**
 * Delete a habit
 * @deprecated Use archiveHabitV2() instead (soft delete)
 */
export async function deleteHabit(id: string): Promise<ServiceResponse<LegacyHabitRow>> {
  logDeprecationWarning('deleteHabit');
  
  // In v2, we archive instead of delete
  const { error } = await archiveHabitV2(id);
  
  if (error) {
    return { data: null, error };
  }
  
  // Return a placeholder since we can't get the deleted data
  return { 
    data: { id, goal_id: '', name: '', frequency: '', schedule: null }, 
    error: null 
  };
}

/**
 * Log a habit completion
 * @deprecated Use logHabitCompletionV2() instead
 */
export async function logHabitCompletion(
  payload: LegacyHabitLogInsert,
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow>> {
  logDeprecationWarning('logHabitCompletion');
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided and not authenticated' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  const v2Payload = {
    habit_id: payload.habit_id,
    done: payload.completed ?? true,
    value: payload.value ?? null,
    note: payload.note ?? null,
    date: payload.date,
    progress_state: payload.progress_state ?? undefined,
    completion_percentage: payload.completion_percentage ?? undefined,
    logged_stage: payload.logged_stage ?? undefined,
    // Set timestamp to midnight UTC for the target date to ensure the trigger sets the correct date
    // The database trigger converts ts to UTC timezone before extracting the date
    ts: payload.date ? new Date(payload.date + 'T00:00:00Z').toISOString() : undefined,
  };
  
  const { data, error } = await logHabitCompletionV2(v2Payload, userId);
  if (error && !isNetworkLikeError(error)) {
    return { data: null, error };
  }
  if (error) {
    const queued = await queueLocalHabitLogUpsert(payload, userId);
    return { data: queued, error: null };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: toLegacyLog(data), error: null };
}

/**
 * Clear a habit completion
 * @deprecated Consider using v2 approach with done=false or deleting the log
 */
export async function clearHabitCompletion(
  habitId: string,
  date: string
): Promise<ServiceResponse<LegacyHabitLogRow>> {
  logDeprecationWarning('clearHabitCompletion');
  
  if (!canUseSupabaseData()) {
    return { data: null, error: { message: 'Not in Supabase mode' } as PostgrestError };
  }
  
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
  }
  
  // Delete the v2 log entry
  const { data, error } = await supabase
    .from('habit_logs_v2')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', session.user.id)
    .eq('date', date)
    .select()
    .single();
  
  if (error && !isNetworkLikeError(error)) {
    return { data: null, error };
  }
  if (error) {
    await queueLocalHabitLogDelete(habitId, date, session.user.id);
    return { data: null, error: null };
  }
  
  if (!data) {
    return { data: null, error: null };
  }
  
  return { data: toLegacyLog(data as HabitLogV2Row), error: null };
}

/**
 * Build schedule payload
 * @deprecated Use v2 schedule format directly
 */
export function buildSchedulePayload(schedule: Record<string, Json>): Json {
  logDeprecationWarning('buildSchedulePayload');
  return schedule as Json;
}

/**
 * Fetch habit logs for a specific date
 * @deprecated Use listTodayHabitLogsV2() instead
 */
export async function fetchHabitLogsForDate(
  date: string,
  habitIds: string[],
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow[]>> {
  logDeprecationWarning('fetchHabitLogsForDate');
  
  if (!habitIds.length) {
    return { data: [], error: null };
  }
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  // Use v2 service to get today's logs, then filter by habitIds
  const { data, error } = await listTodayHabitLogsV2(userId);
  
  if (error) {
    return { data: null, error };
  }
  
  const mergedLogs = await mergeLocalHabitLogsOverRemote(userId, data || []);
  const filteredLogs = mergedLogs
    .filter(log => habitIds.includes(log.habit_id) && log.date === date)
    .map(toLegacyLog);
  
  return { data: filteredLogs, error: null };
}

/**
 * Fetch habit logs for a date range
 * @deprecated Use listHabitLogsForRangeMultiV2() instead
 */
export async function fetchHabitLogsForRange(
  habitIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ServiceResponse<LegacyHabitLogRow[]>> {
  logDeprecationWarning('fetchHabitLogsForRange');
  
  if (!habitIds.length) {
    return { data: [], error: null };
  }
  
  if (!userId) {
    if (!canUseSupabaseData()) {
      return { data: null, error: { message: 'No user ID provided' } as PostgrestError };
    }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { data: null, error: { message: 'Not authenticated' } as PostgrestError };
    }
    userId = session.user.id;
  }
  
  const { data, error } = await listHabitLogsForRangeMultiV2({
    userId,
    habitIds,
    startDate,
    endDate,
  });
  
  if (error) {
    return { data: null, error };
  }
  
  const mergedLogs = await mergeLocalHabitLogsOverRemote(userId, data || []);
  const legacyLogs = mergedLogs.map(toLegacyLog);
  
  return { data: legacyLogs, error: null };
}

async function mergeLocalHabitLogsOverRemote(userId: string, remoteLogs: HabitLogV2Row[]): Promise<HabitLogV2Row[]> {
  const localRecords = await listLocalHabitLogRecordsForUser(userId);
  if (!localRecords.length) return remoteLogs;

  const byKey = new Map(remoteLogs.map((log) => [buildHabitLogKey(userId, log.habit_id, log.date), log] as const));
  for (const local of localRecords) {
    const key = buildHabitLogKey(userId, local.habit_id, local.date);
    if (local.sync_state === 'pending_delete') {
      byKey.delete(key);
      continue;
    }
    if (local.row) {
      byKey.set(key, local.row);
    }
  }
  return Array.from(byKey.values());
}

export async function syncQueuedHabitLogs(userId: string): Promise<void> {
  if (!canUseSupabaseData()) return;
  const supabase = getSupabaseClient();
  const pending = await listPendingHabitLogMutations(userId);

  for (const mutation of pending) {
    const key = buildHabitLogKey(userId, mutation.habit_id, mutation.date);
    try {
      await updateHabitLogMutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      if (mutation.operation === 'upsert') {
        const payload = mutation.payload;
        if (!payload) {
          await removeHabitLogMutation(mutation.id);
          continue;
        }
        const { error } = await supabase
          .from('habit_logs_v2')
          .upsert(payload, { onConflict: 'user_id,habit_id,date' })
          .select()
          .single();
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habit_logs_v2')
          .delete()
          .eq('user_id', userId)
          .eq('habit_id', mutation.habit_id)
          .eq('date', mutation.date);
        if (error) throw error;
      }
      await removeLocalHabitLogRecord(key);
      await removeHabitLogMutation(mutation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateHabitLogMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: message,
      });
      const local = await getLocalHabitLogRecord(key);
      if (local) {
        await upsertLocalHabitLogRecord({
          ...local,
          sync_state: 'failed',
          updated_at_ms: Date.now(),
          last_error: message,
        });
      }
    }
  }
}

export async function getHabitLogQueueStatus(userId: string): Promise<HabitLogQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  return getHabitLogMutationCounts(userId);
}
