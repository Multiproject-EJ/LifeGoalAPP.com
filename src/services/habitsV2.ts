import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  buildLocalHabitV2Id,
  enqueueHabitV2Mutation,
  getHabitV2MutationCounts,
  getLocalHabitV2Record,
  listLocalHabitsV2ForUser,
  listPendingHabitV2Mutations,
  removeHabitV2Mutation,
  removeLocalHabitV2Record,
  updateHabitV2Mutation,
  upsertLocalHabitV2Record,
} from '../data/habitsV2OfflineRepo';
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

async function queueLocalHabitCreate(payload: HabitV2Insert): Promise<HabitV2Row> {
  const localId = buildLocalHabitV2Id();
  const now = new Date().toISOString();
  const localRow: HabitV2Row = {
    id: localId,
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
  const nowMs = Date.now();
  await upsertLocalHabitV2Record({
    id: localId,
    user_id: payload.user_id,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueHabitV2Mutation({
    id: `habit-v2-mut-${localId}`,
    user_id: payload.user_id,
    habit_id: localId,
    server_id: null,
    operation: 'create',
    payload,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });
  return localRow;
}

async function queueLocalHabitUpdate(
  habitId: string,
  operation: 'update' | 'archive' | 'pause' | 'resume' | 'deactivate',
  patch: HabitV2Update,
): Promise<HabitV2Row | null> {
  const local = await getLocalHabitV2Record(habitId);
  let base = local?.row ?? null;
  if (!base) {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('habits_v2').select('*').eq('id', habitId).maybeSingle<HabitV2Row>();
    base = data ?? null;
  }
  if (!base) return null;
  const merged = { ...base, ...patch } as HabitV2Row;
  const nowMs = Date.now();
  await upsertLocalHabitV2Record({
    id: habitId,
    user_id: merged.user_id,
    server_id: habitId,
    row: merged,
    sync_state: operation === 'archive' ? 'pending_archive' : 'pending_update',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueHabitV2Mutation({
    id: `habit-v2-mut-${habitId}`,
    user_id: merged.user_id,
    habit_id: habitId,
    server_id: habitId,
    operation,
    payload: patch,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
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
  const nowMs = Date.now();
  await upsertLocalHabitLogRecord({
    id: key,
    user_id: payload.user_id,
    habit_id: payload.habit_id,
    date: effectiveDate,
    row,
    sync_state: 'pending_upsert',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueHabitLogMutation({
    id: `habit-log-mut-${key}`,
    user_id: payload.user_id,
    habit_id: payload.habit_id,
    date: effectiveDate,
    operation: 'upsert',
    payload,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
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
  let query = supabase
    .from('habits_v2')
    .select('*')
    .eq('archived', false);

  if (!includeInactive) {
    query = query.eq('status', 'active');
  }

  const result = await query
    .order('created_at', { ascending: false })
    .returns<HabitV2Row[]>();
  if (result.error) return result;
  const merged = await mergeLocalHabitsOverRemote(result.data ?? [], includeInactive);
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
  
  const result = await supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .returns<HabitLogV2Row[]>();
  if (result.error) return result;
  const merged = await mergeLocalLogsOverRemote(userId, result.data ?? []);
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
  
  const payload: HabitV2Insert = {
    ...input,
    user_id: userId,
    status: input.status ?? 'active',
    paused_at: input.paused_at ?? null,
    paused_reason: input.paused_reason ?? null,
    resume_on: input.resume_on ?? null,
    deactivated_at: input.deactivated_at ?? null,
    deactivated_reason: input.deactivated_reason ?? null,
    ...buildHabitEnvironmentPatch(input),
  };

  const result = await supabase
    .from('habits_v2')
    .insert(payload)
    .select()
    .single();

  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitCreate(payload);
    return { data: queued, error: null };
  }

  if (result.data) {
    const environment = normalizeEnvironmentContext(result.data.environment_context ?? null, {
      fallbackText: result.data.habit_environment,
    });

    if (environment) {
      const recommendations = buildEnvironmentRecommendations(environment);
      await insertEnvironmentAudit({
        userId: result.data.user_id,
        habitId: result.data.id,
        auditSource: 'setup',
        scoreBefore: null,
        scoreAfter: result.data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: null,
        afterState: environment,
      });
    }
  }

  return result;
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
  
  const result = await supabase
    .from('habit_logs_v2')
    .insert(payload)
    .select()
    .single();
  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitLogUpsert(payload);
    return { data: queued, error: null };
  }
  return result;
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
  
  // First, get the user's habit IDs
  const { data: userHabits, error: habitsError } = await supabase
    .from('habits_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('archived', false)
    .eq('status', 'active');
  
  if (habitsError) {
    return { data: null, error: habitsError };
  }
  
  if (!userHabits || userHabits.length === 0) {
    return { data: [], error: null };
  }
  
  const habitIds = userHabits.map(h => h.id);
  
  // Query the streaks view filtered by the user's habit IDs
  const result = await supabase
    .from('v_habit_streaks')
    .select('*')
    .in('habit_id', habitIds)
    .order('current_streak', { ascending: false })
    .returns<HabitStreakRow[]>();
  
  return result;
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
  
  const result = await supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', params.userId)
    .eq('habit_id', params.habitId)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
  if (result.error) return result;
  const merged = await mergeLocalLogsOverRemote(params.userId, result.data ?? []);
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
  const { error } = await supabase
    .from('habits_v2')
    .update(patch)
    .eq('id', habitId);
  if (error && isNetworkLikeError(error)) {
    await queueLocalHabitUpdate(habitId, 'archive', patch);
    return { data: null, error: null };
  }
  
  return { data: null, error };
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
  
  const result = await supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', userId)
    .in('habit_id', habitIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
  if (result.error) return result;
  const merged = await mergeLocalLogsOverRemote(userId, result.data ?? []);
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
  
  const result = await supabase
    .from('habit_logs_v2')
    .select('*')
    .eq('user_id', params.userId)
    .in('habit_id', params.habitIds)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('date', { ascending: true })
    .returns<HabitLogV2Row[]>();
  if (result.error) return result;
  const merged = await mergeLocalLogsOverRemote(params.userId, result.data ?? []);
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

  const { data: beforeState } = await supabase
    .from('habits_v2')
    .select('*')
    .eq('id', habitId)
    .maybeSingle<HabitV2Row>();

  const result = await supabase
    .from('habits_v2')
    .update({
      ...updates,
      ...buildHabitEnvironmentPatch({
        environment_context: updates.environment_context ?? beforeState?.environment_context ?? null,
        environment_score: updates.environment_score ?? beforeState?.environment_score ?? null,
        environment_risk_tags: updates.environment_risk_tags ?? beforeState?.environment_risk_tags ?? [],
        environment_last_audited_at:
          updates.environment_last_audited_at ?? beforeState?.environment_last_audited_at ?? null,
        habit_environment: updates.habit_environment ?? beforeState?.habit_environment ?? null,
      }),
    })
    .eq('id', habitId)
    .select()
    .single();

  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitUpdate(
      habitId,
      'update',
      {
        ...updates,
        ...buildHabitEnvironmentPatch({
          environment_context: updates.environment_context ?? beforeState?.environment_context ?? null,
          environment_score: updates.environment_score ?? beforeState?.environment_score ?? null,
          environment_risk_tags: updates.environment_risk_tags ?? beforeState?.environment_risk_tags ?? [],
          environment_last_audited_at:
            updates.environment_last_audited_at ?? beforeState?.environment_last_audited_at ?? null,
          habit_environment: updates.habit_environment ?? beforeState?.habit_environment ?? null,
        }),
      } as HabitV2Update,
    );
    if (queued) return { data: queued, error: null };
  }

  if (result.data) {
    const beforeEnvironment = normalizeEnvironmentContext(beforeState?.environment_context ?? null, {
      fallbackText: beforeState?.habit_environment ?? null,
    });
    const afterEnvironment = normalizeEnvironmentContext(result.data.environment_context ?? null, {
      fallbackText: result.data.habit_environment,
    });

    if (beforeEnvironment || afterEnvironment) {
      const recommendations = buildEnvironmentRecommendations(afterEnvironment);
      await insertEnvironmentAudit({
        userId: result.data.user_id,
        habitId: result.data.id,
        auditSource: 'manual_edit',
        scoreBefore: beforeState?.environment_score ?? null,
        scoreAfter: result.data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: beforeEnvironment,
        afterState: afterEnvironment,
      });
    }
  }

  return result;
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
  const result = await supabase
    .from('habits_v2')
    .select('*')
    .eq('id', habitId)
    .single();
  if (result.data) return result;
  const local = await getLocalHabitV2Record(habitId);
  if (local) return { data: local.row, error: null };
  return result;
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
  
  const { data, error } = await supabase
    .from('habit_logs_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('date', today)
    .eq('done', true)
    .limit(1);
  
  if (error) {
    return { data: null, error };
  }
  
  return { data: data !== null && data.length > 0, error: null };
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
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already completed today
  const { data: isCompleted, error: checkError } = await isHabitCompletedToday(habitId, userId);
  
  if (checkError) {
    return { data: null, error: checkError };
  }
  
  if (isCompleted) {
    // Already completed, return success without inserting (idempotent)
    return { data: { completed: true, wasAlreadyCompleted: true }, error: null };
  }
  
  // Insert new completion
  const { error: insertError } = await supabase.from('habit_logs_v2').insert({
    habit_id: habitId,
    user_id: userId,
    done: true,
    value: null,
    date: today,
  });
  
  if (insertError) {
    return { data: null, error: insertError };
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
  const result = await supabase
    .from('habits_v2')
    .update(patch)
    .eq('id', habitId)
    .select()
    .single();
  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitUpdate(habitId, 'pause', patch);
    if (queued) return { data: queued, error: null };
  }
  return result;
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
  const result = await supabase
    .from('habits_v2')
    .update(patch)
    .eq('id', habitId)
    .select()
    .single();
  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitUpdate(habitId, 'resume', patch);
    if (queued) return { data: queued, error: null };
  }
  return result;
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
  const result = await supabase
    .from('habits_v2')
    .update(patch)
    .eq('id', habitId)
    .select()
    .single();
  if (result.error && isNetworkLikeError(result.error)) {
    const queued = await queueLocalHabitUpdate(habitId, 'deactivate', patch);
    if (queued) return { data: queued, error: null };
  }
  return result;
}

export async function reactivateHabitV2(habitId: string): Promise<ServiceResponse<HabitV2Row>> {
  return resumeHabitV2(habitId);
}

export async function syncQueuedHabitsV2Mutations(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const pending = await listPendingHabitV2Mutations(userId);
  for (const mutation of pending) {
    try {
      await updateHabitV2Mutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      if (mutation.operation === 'create') {
        const payload = mutation.payload as HabitV2Insert | null;
        if (!payload) {
          await removeHabitV2Mutation(mutation.id);
          continue;
        }
        const { error } = await supabase.from('habits_v2').insert(payload).select().single<HabitV2Row>();
        if (error) throw error;
      } else if (mutation.operation === 'archive') {
        const { error } = await supabase
          .from('habits_v2')
          .update({
            archived: true,
            status: 'archived',
            paused_at: null,
            paused_reason: null,
            resume_on: null,
            deactivated_at: null,
            deactivated_reason: null,
          })
          .eq('id', mutation.server_id ?? mutation.habit_id);
        if (error) throw error;
      } else {
        const payload = mutation.payload as HabitV2Update | null;
        if (!payload) {
          await removeHabitV2Mutation(mutation.id);
          continue;
        }
        const { error } = await supabase
          .from('habits_v2')
          .update(payload)
          .eq('id', mutation.server_id ?? mutation.habit_id);
        if (error) throw error;
      }
      await removeLocalHabitV2Record(mutation.habit_id);
      await removeHabitV2Mutation(mutation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateHabitV2Mutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: message,
      });
      const local = await getLocalHabitV2Record(mutation.habit_id);
      if (local) {
        await upsertLocalHabitV2Record({
          ...local,
          sync_state: 'failed',
          updated_at_ms: Date.now(),
          last_error: message,
        });
      }
    }
  }
}

export async function getHabitsV2QueueStatus(userId: string): Promise<HabitV2QueueStatus> {
  return getHabitV2MutationCounts(userId);
}

export async function syncQueuedHabitLogsV2Mutations(userId: string): Promise<void> {
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

export async function getHabitLogV2QueueStatus(userId: string): Promise<HabitLogV2QueueStatus> {
  return getHabitLogMutationCounts(userId);
}
