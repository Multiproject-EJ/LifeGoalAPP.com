import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import {
  generateClientId,
  readReadFallbackCache,
  shouldQueueAfterFailure,
  toPostgrestError,
  writeReadFallbackCache,
} from './offlineWriteThrough';
import {
  getLocalHabitV2Record,
  listLocalHabitsV2ForUser,
  listPendingHabitV2Mutations,
  removeHabitV2Mutation,
  removeLocalHabitV2Record,
  upsertLocalHabitV2Record,
} from '../data/habitsV2OfflineRepo';
import {
  buildHabitLogKey,
  getLocalHabitLogRecord,
  listLocalHabitLogRecordsForUser,
  listPendingHabitLogMutations,
  removeHabitLogMutation,
  upsertLocalHabitLogRecord,
} from '../data/habitLogsOfflineRepo';
import { computeEnvironmentAudit } from '../features/environment/environmentAudit';
import { buildEnvironmentRecommendations } from '../features/environment/environmentRecommendations';
import {
  environmentContextToJson,
  normalizeEnvironmentContext,
} from '../features/environment/environmentSchema';
import { getISOWeekBounds } from '../features/habits/scheduleInterpreter';
import { insertEnvironmentAudit } from './environmentAudits';

export type HabitV2Row = Database['public']['Tables']['habits_v2']['Row'];
export type HabitLogV2Row = Database['public']['Tables']['habit_logs_v2']['Row'];
export type HabitStreakRow = Database['public']['Views']['v_habit_streaks']['Row'];
export type HabitLifecycleStatus = Database['public']['Enums']['habit_lifecycle_status'];

type HabitV2Insert = Database['public']['Tables']['habits_v2']['Insert'];
type HabitV2Update = Database['public']['Tables']['habits_v2']['Update'];
type HabitLogV2Insert = Database['public']['Tables']['habit_logs_v2']['Insert'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export type HabitV2QueueStatus = { pending: number; failed: number };
export type HabitLogV2QueueStatus = { pending: number; failed: number };

type HabitEnvironmentPatch = Pick<
  HabitV2Insert,
  'environment_context' | 'environment_score' | 'environment_risk_tags' | 'environment_last_audited_at'
>;

export const ACTIVE_HABIT_STATUSES: HabitLifecycleStatus[] = ['active'];
export const INACTIVE_HABIT_STATUSES: HabitLifecycleStatus[] = ['paused', 'deactivated', 'archived'];

export function getHabitLifecycleStatus(habit: Pick<HabitV2Row, 'status' | 'archived'>): HabitLifecycleStatus {
  if (habit.status) {
    return habit.status;
  }
  return habit.archived ? 'archived' : 'active';
}

export function isHabitLifecycleActive(habit: Pick<HabitV2Row, 'status' | 'archived'>): boolean {
  return getHabitLifecycleStatus(habit) === 'active';
}

const LOCAL_HABIT_PREFIX = 'local-habit-v2-';

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function habitsCacheKey(userId: string, includeInactive: boolean): string {
  return `habits_v2:${userId}:${includeInactive ? 'all' : 'active'}`;
}

function todayLogsCacheKey(userId: string, date: string): string {
  return `habit_logs_v2_today:${userId}:${date}`;
}

async function mergeLocalHabitsOverRemote(remote: HabitV2Row[], includeInactive: boolean): Promise<HabitV2Row[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return remote;
  const local = await listLocalHabitsV2ForUser(userId);
  if (!local.length) return remote;
  const byId = new Map(remote.map((habit) => [habit.id, habit] as const));
  for (const record of local) {
    if (record.sync_state === 'pending_archive' || record.row.archived) {
      byId.delete(record.id);
      if (record.server_id) byId.delete(record.server_id);
      continue;
    }
    if (!includeInactive && record.row.status !== 'active') {
      byId.delete(record.id);
      continue;
    }
    byId.set(record.row.id, record.row);
  }
  return Array.from(byId.values());
}

// ── Offline overlay & queueing (shared MutationQueue) ───────────────────────
// Local overlay stores keep offline-edited rows for merge reads; mutations
// converge on the shared queue (executors in offlineSyncExecutors.ts).
// Creates carry a client uuid so replays upsert idempotently.

async function queueLocalHabitCreate(payload: HabitV2Insert & { id: string }): Promise<HabitV2Row> {
  const now = new Date().toISOString();
  const localRow: HabitV2Row = {
    id: payload.id,
    user_id: payload.user_id,
    title: payload.title,
    emoji: payload.emoji ?? null,
    type: payload.type ?? 'boolean',
    target_num: payload.target_num ?? null,
    target_unit: payload.target_unit ?? null,
    allow_skip: payload.allow_skip ?? true,
    start_date: payload.start_date ?? null,
    done_ish_config: payload.done_ish_config ?? null,
    schedule: payload.schedule ?? { mode: 'daily' },
    autoprog: payload.autoprog ?? {},
    goal_id: payload.goal_id ?? null,
    archived: payload.archived ?? false,
    created_at: now,
    domain_key: payload.domain_key ?? null,
    status: payload.status ?? 'active',
    paused_at: payload.paused_at ?? null,
    paused_reason: payload.paused_reason ?? null,
    resume_on: payload.resume_on ?? null,
    deactivated_at: payload.deactivated_at ?? null,
    deactivated_reason: payload.deactivated_reason ?? null,
    habit_environment: payload.habit_environment ?? null,
    environment_context: payload.environment_context ?? null,
    environment_score: payload.environment_score ?? null,
    environment_risk_tags: payload.environment_risk_tags ?? [],
    environment_last_audited_at: payload.environment_last_audited_at ?? null,
    habit_intent: payload.habit_intent ?? null,
    duration_mode: payload.duration_mode ?? null,
    duration_value: payload.duration_value ?? null,
    duration_unit: payload.duration_unit ?? null,
    duration_start_at: payload.duration_start_at ?? null,
    duration_end_at: payload.duration_end_at ?? null,
    on_duration_end: payload.on_duration_end ?? null,
  };
  await upsertLocalHabitV2Record({
    id: payload.id,
    user_id: payload.user_id,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  await getMutationQueue().enqueue({
    feature: 'habits_v2',
    operation: 'habit_v2.create',
    payload,
    dedupeKey: payload.id,
  });
  return localRow;
}

async function queueLocalHabitUpdate(
  habitId: string,
  operation: 'update' | 'archive' | 'pause' | 'resume' | 'deactivate',
  patch: HabitV2Update,
  fallbackBase: HabitV2Row | null = null,
): Promise<HabitV2Row | null> {
  // The mutation always queues — even without a base row for the overlay —
  // so no offline change is ever silently dropped.
  await getMutationQueue().enqueue({
    feature: 'habits_v2',
    operation: 'habit_v2.update',
    // No dedupeKey: patches are partial, so queued updates replay in order.
    payload: { id: habitId, patch },
  });

  const local = await getLocalHabitV2Record(habitId);
  const base = local?.row ?? fallbackBase;
  if (!base) return null;
  const merged = { ...base, ...patch } as HabitV2Row;
  await upsertLocalHabitV2Record({
    id: habitId,
    user_id: merged.user_id,
    server_id: local?.sync_state === 'pending_create' ? null : habitId,
    row: merged,
    sync_state:
      operation === 'archive'
        ? 'pending_archive'
        : local?.sync_state === 'pending_create'
          ? 'pending_create'
          : 'pending_update',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  return merged;
}

async function queueLocalHabitLogUpsert(payload: HabitLogV2Insert): Promise<HabitLogV2Row> {
  const effectiveDate = payload.date ?? new Date().toISOString().slice(0, 10);
  const key = buildHabitLogKey(payload.user_id, payload.habit_id, effectiveDate);
  const row: HabitLogV2Row = {
    id: `local-habit-log-${key}`,
    habit_id: payload.habit_id,
    user_id: payload.user_id,
    ts: payload.ts ?? new Date(`${effectiveDate}T00:00:00Z`).toISOString(),
    date: effectiveDate,
    value: payload.value ?? null,
    done: payload.done ?? true,
    note: payload.note ?? null,
    mood: payload.mood ?? null,
    progress_state: payload.progress_state ?? null,
    completion_percentage: payload.completion_percentage ?? null,
    logged_stage: payload.logged_stage ?? null,
  };
  await upsertLocalHabitLogRecord({
    id: key,
    user_id: payload.user_id,
    habit_id: payload.habit_id,
    date: effectiveDate,
    row,
    sync_state: 'pending_upsert',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  await getMutationQueue().enqueue({
    feature: 'habit_logs_v2',
    operation: 'habit_log_v2.upsert',
    // A log upsert is the full state for (habit, date): latest edit wins.
    payload: { ...payload, date: effectiveDate },
    dedupeKey: `${payload.user_id}:${payload.habit_id}:${effectiveDate}`,
  });
  return row;
}

async function mergeLocalLogsOverRemote(userId: string, remoteLogs: HabitLogV2Row[]): Promise<HabitLogV2Row[]> {
  const local = await listLocalHabitLogRecordsForUser(userId);
  if (!local.length) return remoteLogs;
  const byKey = new Map(remoteLogs.map((log) => [buildHabitLogKey(userId, log.habit_id, log.date), log] as const));
  for (const record of local) {
    const key = buildHabitLogKey(userId, record.habit_id, record.date);
    if (record.sync_state === 'pending_delete') {
      byKey.delete(key);
      continue;
    }
    if (record.row) byKey.set(key, record.row);
  }
  return Array.from(byKey.values());
}

function buildHabitEnvironmentPatch(input: {
  environment_context?: HabitV2Insert['environment_context'] | null;
  environment_score?: number | null;
  environment_risk_tags?: string[] | null;
  environment_last_audited_at?: string | null;
  habit_environment?: string | null;
}): HabitEnvironmentPatch {
  if (input.environment_context === null) {
    return {
      environment_context: null,
      environment_score: null,
      environment_risk_tags: [],
      environment_last_audited_at: null,
    };
  }

  const normalizedContext = normalizeEnvironmentContext(input.environment_context ?? null, {
    fallbackText: input.habit_environment ?? null,
    source: 'edit',
  });

  if (!normalizedContext) {
    return {
      environment_context: null,
      environment_score: null,
      environment_risk_tags: input.environment_risk_tags ?? [],
      environment_last_audited_at: null,
    };
  }

  const audit = computeEnvironmentAudit(normalizedContext);
  const recommendations = buildEnvironmentRecommendations(normalizedContext);

  return {
    environment_context: environmentContextToJson(normalizedContext),
    environment_score: audit.score,
    environment_risk_tags: recommendations.riskTags,
    environment_last_audited_at: input.environment_last_audited_at ?? new Date().toISOString(),
  };
}

/**
 * List all habits for the current authenticated user.
 * Filters by user_id automatically via RLS policies.
 * Returns habits ordered by creation date (newest first).
 */
export async function listHabitsV2(params?: { includeInactive?: boolean }): Promise<ServiceResponse<HabitV2Row[]>> {
  const supabase = getSupabaseClient();
  const includeInactive = Boolean(params?.includeInactive);

  const result = await guardedCloudCall('database', async () => {
    let query = supabase
      .from('habits_v2')
      .select('*')
      .eq('archived', false);

    if (!includeInactive) {
      query = query.eq('status', 'active');
    }

    const response = await query
      .order('created_at', { ascending: false })
      .returns<HabitV2Row[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    // Outage: last successful list merged with offline edits keeps the core
    // habit checklist usable until sync returns.
    const userId = await getSessionUserId();
    const cached = userId
      ? readReadFallbackCache<HabitV2Row[]>(habitsCacheKey(userId, includeInactive))
      : null;
    if (cached) {
      const merged = await mergeLocalHabitsOverRemote(cached, includeInactive);
      return { data: merged, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  const userId = await getSessionUserId();
  if (userId) writeReadFallbackCache(habitsCacheKey(userId, includeInactive), result.data);
  const merged = await mergeLocalHabitsOverRemote(result.data, includeInactive);
  return { data: merged, error: null };
}

/**
 * List all habit logs for today filtered by the current authenticated user.
 * Uses the date field which is auto-generated from the timestamp.
 * 
 * @param userId - The user ID to filter logs by
 * @returns Promise with data array of habit logs and error
 */
export async function listTodayHabitLogsV2(
  userId: string,
): Promise<ServiceResponse<HabitLogV2Row[]>> {
  const supabase = getSupabaseClient();

  // Get today's date in UTC format (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .returns<HabitLogV2Row[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    // Outage: last successful read for today plus queued offline logs keeps
    // completion state visible.
    const cached = readReadFallbackCache<HabitLogV2Row[]>(todayLogsCacheKey(userId, today)) ?? [];
    const merged = await mergeLocalLogsOverRemote(userId, cached);
    return { data: merged.filter((log) => log.date === today), error: null };
  }

  writeReadFallbackCache(todayLogsCacheKey(userId, today), result.data);
  const merged = await mergeLocalLogsOverRemote(userId, result.data);
  return { data: merged, error: null };
}

/**
 * Create a new habit for the current authenticated user.
 * The user_id is provided separately and merged with the input.
 * 
 * @param input - Habit data without user_id
 * @param userId - The user ID to associate with the habit
 * @returns Promise with the created habit data and error
 */
export async function createHabitV2(
  input: Omit<HabitV2Insert, 'user_id'>,
  userId: string,
): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  
  const payload: HabitV2Insert & { id: string } = {
    ...input,
    id: generateClientId(),
    user_id: userId,
    status: input.status ?? 'active',
    paused_at: input.paused_at ?? null,
    paused_reason: input.paused_reason ?? null,
    resume_on: input.resume_on ?? null,
    deactivated_at: input.deactivated_at ?? null,
    deactivated_reason: input.deactivated_reason ?? null,
    ...buildHabitEnvironmentPatch(input),
  };

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('habits_v2').insert(payload).select().single<HabitV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      const queued = await queueLocalHabitCreate(payload);
      return { data: queued, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  const data = result.data;
  if (data) {
    const environment = normalizeEnvironmentContext(data.environment_context ?? null, {
      fallbackText: data.habit_environment,
    });

    if (environment) {
      const recommendations = buildEnvironmentRecommendations(environment);
      await insertEnvironmentAudit({
        userId: data.user_id,
        habitId: data.id,
        auditSource: 'setup',
        scoreBefore: null,
        scoreAfter: data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: null,
        afterState: environment,
      });
    }
  }

  return { data, error: null };
}

/**
 * Log a habit completion for the current authenticated user.
 * The user_id is provided separately and merged with the input.
 * The date field is auto-generated from the timestamp.
 * 
 * @param input - Habit log data without user_id
 * @param userId - The user ID to associate with the log
 * @returns Promise with the created habit log data and error
 */
export async function logHabitCompletionV2(
  input: Omit<HabitLogV2Insert, 'user_id'>,
  userId: string,
): Promise<ServiceResponse<HabitLogV2Row>> {
  const supabase = getSupabaseClient();
  
  const payload: HabitLogV2Insert = {
    ...input,
    user_id: userId,
  };

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('habit_logs_v2').insert(payload).select().single<HabitLogV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      const queued = await queueLocalHabitLogUpsert(payload);
      return { data: queued, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }
  return { data: result.data, error: null };
}

/**
 * List all habit streaks for the current authenticated user.
 * Joins the v_habit_streaks view with habits_v2 to filter by user_id.
 * Returns streaks ordered by current streak descending.
 * 
 * @param userId - The user ID to filter streaks by
 * @returns Promise with data array of habit streaks and error
 */
export async function listHabitStreaksV2(
  userId: string,
): Promise<ServiceResponse<HabitStreakRow[]>> {
  const supabase = getSupabaseClient();

  const result = await guardedCloudCall('database', async () => {
    // First, get the user's habit IDs
    const { data: userHabits, error: habitsError } = await supabase
      .from('habits_v2')
      .select('id')
      .eq('user_id', userId)
      .eq('archived', false)
      .eq('status', 'active');

    if (habitsError) throw habitsError;

    if (!userHabits || userHabits.length === 0) {
      return [] as HabitStreakRow[];
    }

    const habitIds = userHabits.map(h => h.id);

    // Query the streaks view filtered by the user's habit IDs
    const response = await supabase
      .from('v_habit_streaks')
      .select('*')
      .in('habit_id', habitIds)
      .order('current_streak', { ascending: false })
      .returns<HabitStreakRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

/**
 * List habit logs for a specific habit within a date range.
 * Used for generating insights and heatmap visualizations.
 * 
 * @param params - Query parameters with userId, habitId, and date range
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForRangeV2(params: {
  userId: string;
  habitId: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;   // ISO date (YYYY-MM-DD)
}): Promise<ServiceResponse<HabitLogV2Row[]>> {
  const supabase = getSupabaseClient();
  
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('user_id', params.userId)
      .eq('habit_id', params.habitId)
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .order('date', { ascending: true })
      .returns<HabitLogV2Row[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  const merged = await mergeLocalLogsOverRemote(params.userId, result.data);
  return {
    data: merged
      .filter((log) => log.habit_id === params.habitId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    error: null,
  };
}

/**
 * Quick add a daily boolean habit with minimal configuration.
 * Intended for use by the Dashboard quick form to create habits
 * that immediately appear in the habits_v2 unified checklist.
 * 
 * @param params - Habit configuration
 * @param params.title - The habit title/name
 * @param params.domainKey - Optional life wheel domain key
 * @param params.goalId - Optional goal ID to link the habit to
 * @param params.emoji - Optional emoji for the habit (defaults to null)
 * @param userId - The user ID to associate with the habit
 * @returns Promise with the created habit data and error
 */
export async function quickAddDailyHabit(params: {
  title: string;
  domainKey?: string | null;
  goalId?: string | null;
  emoji?: string | null;
  habit_intent?: string | null;
}, userId: string): Promise<ServiceResponse<HabitV2Row>> {
  const schedule = { mode: 'daily' };
  const habitInput: Omit<HabitV2Insert, 'user_id'> = {
    title: params.title,
    emoji: params.emoji ?? null,
    type: 'boolean',
    schedule,
    autoprog: {
      tier: 'standard',
      baseSchedule: schedule,
      baseTarget: null,
      lastShiftAt: null,
      lastShiftType: null,
    },
    domain_key: params.domainKey ?? null,
    goal_id: params.goalId ?? null,
    archived: false,
    status: 'active',
    paused_at: null,
    paused_reason: null,
    resume_on: null,
    deactivated_at: null,
    deactivated_reason: null,
    target_num: null,
    target_unit: null,
    habit_intent: params.habit_intent ?? null,
  };
  
  return createHabitV2(habitInput, userId);
}

/**
 * Archive a habit by setting its archived flag to true.
 * Archived habits will not appear in the active habits list.
 * 
 * @param habitId - The ID of the habit to archive
 * @returns Promise with data (null) and error
 */
export async function archiveHabitV2(habitId: string): Promise<ServiceResponse<null>> {
  const supabase = getSupabaseClient();
  const patch: HabitV2Update = {
    archived: true,
    status: 'archived',
    paused_at: null,
    paused_reason: null,
    resume_on: null,
    deactivated_at: null,
    deactivated_reason: null,
  };
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('habits_v2').update(patch).eq('id', habitId);
    if (response.error) throw response.error;
    return null;
  });
  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      await queueLocalHabitUpdate(habitId, 'archive', patch);
      return { data: null, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  return { data: null, error: null };
}

/**
 * List habit logs for the current ISO week (Monday-Sunday) for the provided habit IDs.
 * Used for times_per_week schedule mode to determine if weekly target has been met.
 * 
 * @param userId - The user ID to filter logs by
 * @param habitIds - Array of habit IDs to fetch logs for
 * @param referenceDate - Optional reference date for the week (defaults to today)
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForWeekV2(
  userId: string,
  habitIds: string[],
  referenceDate: Date = new Date(),
): Promise<ServiceResponse<HabitLogV2Row[]>> {
  if (!habitIds || habitIds.length === 0) {
    return { data: [], error: null };
  }
  
  const supabase = getSupabaseClient();
  const { monday, sunday } = getISOWeekBounds(referenceDate);
  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('user_id', userId)
      .in('habit_id', habitIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .returns<HabitLogV2Row[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  const merged = await mergeLocalLogsOverRemote(userId, result.data);
  return {
    data: merged
      .filter((log) => habitIds.includes(log.habit_id) && log.date >= startDate && log.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date)),
    error: null,
  };
}

/**
 * List habit logs for multiple habits within a date range.
 * Used for adherence calculations and analytics.
 * 
 * @param params - Query parameters with userId, habitIds, and date range
 * @returns Promise with data array of habit logs and error
 */
export async function listHabitLogsForRangeMultiV2(params: {
  userId: string;
  habitIds: string[];
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string;   // ISO date (YYYY-MM-DD)
}): Promise<ServiceResponse<HabitLogV2Row[]>> {
  if (!params.habitIds || params.habitIds.length === 0) {
    return { data: [], error: null };
  }
  
  const supabase = getSupabaseClient();

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habit_logs_v2')
      .select('*')
      .eq('user_id', params.userId)
      .in('habit_id', params.habitIds)
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .order('date', { ascending: true })
      .returns<HabitLogV2Row[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  const merged = await mergeLocalLogsOverRemote(params.userId, result.data);
  return {
    data: merged
      .filter((log) => params.habitIds.includes(log.habit_id) && log.date >= params.startDate && log.date <= params.endDate)
      .sort((a, b) => a.date.localeCompare(b.date)),
    error: null,
  };
}

/**
 * Update an existing habit with new schedule and/or target values.
 * Used when applying suggestions to modify habit configuration.
 * 
 * @param habitId - The ID of the habit to update
 * @param updates - Object containing fields to update (schedule, target_num)
 * @returns Promise with the updated habit data and error
 */
export async function updateHabitV2(
  habitId: string,
  updates: {
    schedule?: Database['public']['Tables']['habits_v2']['Row']['schedule'];
    target_num?: number | null;
    goal_id?: string | null;
    environment_context?: Database['public']['Tables']['habits_v2']['Row']['environment_context'];
    environment_score?: number | null;
    environment_risk_tags?: string[];
    environment_last_audited_at?: string | null;
    habit_environment?: string | null;
  }
): Promise<ServiceResponse<HabitV2Row>> {
  return updateHabitFullV2(habitId, updates);
}

/**
 * Update an existing habit with all editable fields.
 * Used when editing a habit through the HabitWizard.
 * 
 * @param habitId - The ID of the habit to update
 * @param updates - Object containing fields to update
 * @returns Promise with the updated habit data and error
 */
export async function updateHabitFullV2(
  habitId: string,
  updates: {
    title?: string;
    emoji?: string | null;
    type?: Database['public']['Enums']['habit_type'];
    target_num?: number | null;
    target_unit?: string | null;
    schedule?: Database['public']['Tables']['habits_v2']['Row']['schedule'];
    autoprog?: Database['public']['Tables']['habits_v2']['Row']['autoprog'];
    goal_id?: string | null;
    habit_environment?: string | null;
    environment_context?: Database['public']['Tables']['habits_v2']['Row']['environment_context'];
    environment_score?: number | null;
    environment_risk_tags?: string[];
    environment_last_audited_at?: string | null;
    habit_intent?: string | null;
    duration_mode?: string | null;
    duration_value?: number | null;
    duration_unit?: string | null;
    duration_start_at?: string | null;
    duration_end_at?: string | null;
    on_duration_end?: string | null;
  }
): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();

  const beforeResult = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habits_v2')
      .select('*')
      .eq('id', habitId)
      .maybeSingle<HabitV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });
  const beforeState = beforeResult.ok
    ? beforeResult.data
    : (await getLocalHabitV2Record(habitId))?.row ?? null;

  const updatePatch: HabitV2Update = {
    ...updates,
    ...buildHabitEnvironmentPatch({
      environment_context: updates.environment_context ?? beforeState?.environment_context ?? null,
      environment_score: updates.environment_score ?? beforeState?.environment_score ?? null,
      environment_risk_tags: updates.environment_risk_tags ?? beforeState?.environment_risk_tags ?? [],
      environment_last_audited_at:
        updates.environment_last_audited_at ?? beforeState?.environment_last_audited_at ?? null,
      habit_environment: updates.habit_environment ?? beforeState?.habit_environment ?? null,
    }),
  } as HabitV2Update;

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habits_v2')
      .update(updatePatch)
      .eq('id', habitId)
      .select()
      .single<HabitV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });

  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      const queued = await queueLocalHabitUpdate(habitId, 'update', updatePatch, beforeState);
      return { data: queued, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  const data = result.data;
  if (data) {
    const beforeEnvironment = normalizeEnvironmentContext(beforeState?.environment_context ?? null, {
      fallbackText: beforeState?.habit_environment ?? null,
    });
    const afterEnvironment = normalizeEnvironmentContext(data.environment_context ?? null, {
      fallbackText: data.habit_environment,
    });

    if (beforeEnvironment || afterEnvironment) {
      const recommendations = buildEnvironmentRecommendations(afterEnvironment);
      await insertEnvironmentAudit({
        userId: data.user_id,
        habitId: data.id,
        auditSource: 'manual_edit',
        scoreBefore: beforeState?.environment_score ?? null,
        scoreAfter: data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: beforeEnvironment,
        afterState: afterEnvironment,
      });
    }
  }

  return { data, error: null };
}

/**
 * Get a single habit by ID.
 * Used for fetching the current habit state before applying suggestions.
 * 
 * @param habitId - The ID of the habit to fetch
 * @returns Promise with the habit data and error
 */
export async function getHabitV2(habitId: string): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habits_v2')
      .select('*')
      .eq('id', habitId)
      .single<HabitV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });
  if (result.ok && result.data) return { data: result.data, error: null };
  const local = await getLocalHabitV2Record(habitId);
  if (local) return { data: local.row, error: null };
  return result.ok
    ? { data: null, error: null }
    : { data: null, error: toPostgrestError(result.error) };
}

/**
 * Check if a habit has already been completed today.
 * Used for idempotent completion checks.
 * 
 * @param habitId - The ID of the habit to check
 * @param userId - The user ID
 * @returns Promise with boolean indicating if completed today and any error
 */
export async function isHabitCompletedToday(
  habitId: string,
  userId: string,
): Promise<ServiceResponse<boolean>> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const result = await guardedCloudCall('database', async () => {
    const { data, error } = await supabase
      .from('habit_logs_v2')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('date', today)
      .eq('done', true)
      .limit(1);
    if (error) throw error;
    return data !== null && data.length > 0;
  });

  if (!result.ok) {
    // Outage: a queued local log for today still counts as completed.
    const local = await getLocalHabitLogRecord(buildHabitLogKey(userId, habitId, today));
    if (local?.row?.done) return { data: true, error: null };
    return { data: null, error: toPostgrestError(result.error) };
  }

  return { data: result.data, error: null };
}

/**
 * Record a habit completion with idempotency.
 * If the habit is already completed today, this function returns success without inserting.
 * 
 * @param habitId - The ID of the habit to complete
 * @param userId - The user ID
 * @returns Promise with result indicating if completion was newly inserted or already existed
 */
export async function recordHabitCompletion(
  habitId: string,
  userId: string,
): Promise<ServiceResponse<{ completed: boolean; wasAlreadyCompleted: boolean }>> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already completed today (falls back to queued local logs).
  const { data: isCompleted } = await isHabitCompletedToday(habitId, userId);

  if (isCompleted) {
    // Already completed, return success without inserting (idempotent)
    return { data: { completed: true, wasAlreadyCompleted: true }, error: null };
  }

  // Insert new completion through the write-through path (queues offline).
  const { error } = await logHabitCompletionV2(
    { habit_id: habitId, done: true, value: null, date: today },
    userId,
  );

  if (error) {
    return { data: null, error };
  }

  return { data: { completed: true, wasAlreadyCompleted: false }, error: null };
}

export async function pauseHabitV2(
  habitId: string,
  options?: { reason?: string | null; resumeOn?: string | null },
): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  const patch: HabitV2Update = {
    status: 'paused',
    paused_at: new Date().toISOString(),
    paused_reason: options?.reason ?? null,
    resume_on: options?.resumeOn ?? null,
    deactivated_at: null,
    deactivated_reason: null,
    archived: false,
  };
  return applyLifecyclePatch(supabase, habitId, 'pause', patch);
}

async function applyLifecyclePatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  habitId: string,
  operation: 'pause' | 'resume' | 'deactivate',
  patch: HabitV2Update,
): Promise<ServiceResponse<HabitV2Row>> {
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('habits_v2')
      .update(patch)
      .eq('id', habitId)
      .select()
      .single<HabitV2Row>();
    if (response.error) throw response.error;
    return response.data;
  });
  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      const queued = await queueLocalHabitUpdate(habitId, operation, patch);
      // The mutation is queued either way; the overlay row is best-effort.
      return { data: queued, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }
  return { data: result.data, error: null };
}

export async function resumeHabitV2(habitId: string): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  const patch: HabitV2Update = {
    status: 'active',
    paused_at: null,
    paused_reason: null,
    resume_on: null,
    deactivated_at: null,
    deactivated_reason: null,
    archived: false,
  };
  return applyLifecyclePatch(supabase, habitId, 'resume', patch);
}

export async function deactivateHabitV2(
  habitId: string,
  options?: { reason?: string | null },
): Promise<ServiceResponse<HabitV2Row>> {
  const supabase = getSupabaseClient();
  const patch: HabitV2Update = {
    status: 'deactivated',
    deactivated_at: new Date().toISOString(),
    deactivated_reason: options?.reason ?? null,
    paused_at: null,
    paused_reason: null,
    resume_on: null,
    archived: false,
  };
  return applyLifecyclePatch(supabase, habitId, 'deactivate', patch);
}

export async function reactivateHabitV2(habitId: string): Promise<ServiceResponse<HabitV2Row>> {
  return resumeHabitV2(habitId);
}

let legacyHabitQueuesMigrated = false;

/**
 * One-time convergence of the pre-framework habit + habit-log mutation queues
 * onto the shared MutationQueue. Pending entries survive the upgrade;
 * offline-created `local-habit-v2-…` ids are re-keyed to real client uuids.
 */
export async function migrateLegacyHabitQueues(userId: string): Promise<void> {
  if (legacyHabitQueuesMigrated) return;
  legacyHabitQueuesMigrated = true;

  try {
    const queue = getMutationQueue();

    for (const legacy of await listPendingHabitV2Mutations(userId)) {
      if (legacy.operation === 'create') {
        const payload = legacy.payload as HabitV2Insert | null;
        if (payload) {
          const id = legacy.habit_id.startsWith(LOCAL_HABIT_PREFIX)
            ? generateClientId()
            : legacy.habit_id;
          const record = await getLocalHabitV2Record(legacy.habit_id);
          if (record && legacy.habit_id.startsWith(LOCAL_HABIT_PREFIX)) {
            await removeLocalHabitV2Record(legacy.habit_id);
            await upsertLocalHabitV2Record({ ...record, id, row: { ...record.row, id } });
          }
          await queue.enqueue({
            feature: 'habits_v2',
            operation: 'habit_v2.create',
            payload: { ...payload, id },
            dedupeKey: id,
          });
        }
      } else {
        const id = legacy.server_id ?? legacy.habit_id;
        const patch =
          legacy.operation === 'archive'
            ? {
                archived: true,
                status: 'archived' as const,
                paused_at: null,
                paused_reason: null,
                resume_on: null,
                deactivated_at: null,
                deactivated_reason: null,
              }
            : (legacy.payload as HabitV2Update | null);
        if (patch) {
          await queue.enqueue({
            feature: 'habits_v2',
            operation: 'habit_v2.update',
            payload: { id, patch },
          });
        }
      }
      await removeHabitV2Mutation(legacy.id);
    }

    for (const legacy of await listPendingHabitLogMutations(userId)) {
      if (legacy.operation === 'upsert' && legacy.payload) {
        await queue.enqueue({
          feature: 'habit_logs_v2',
          operation: 'habit_log_v2.upsert',
          payload: { ...legacy.payload, date: legacy.date },
          dedupeKey: `${userId}:${legacy.habit_id}:${legacy.date}`,
        });
      } else if (legacy.operation === 'delete') {
        await queue.enqueue({
          feature: 'habit_logs_v2',
          operation: 'habit_log_v2.delete',
          payload: { userId, habitId: legacy.habit_id, date: legacy.date },
          dedupeKey: `${userId}:${legacy.habit_id}:${legacy.date}`,
        });
      }
      await removeHabitLogMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyHabitQueuesMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedHabitsV2Mutations(userId: string): Promise<void> {
  await migrateLegacyHabitQueues(userId);
  await getSyncEngine().syncNow();
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedHabitLogsV2Mutations(userId: string): Promise<void> {
  await migrateLegacyHabitQueues(userId);
  await getSyncEngine().syncNow();
}

async function countSharedQueueForFeature(feature: string): Promise<{ pending: number; failed: number }> {
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== feature) continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

export async function getHabitsV2QueueStatus(_userId: string): Promise<HabitV2QueueStatus> {
  return countSharedQueueForFeature('habits_v2');
}

export async function getHabitLogV2QueueStatus(_userId: string): Promise<HabitLogV2QueueStatus> {
  return countSharedQueueForFeature('habit_logs_v2');
}
