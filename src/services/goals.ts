import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  buildLocalGoalId,
  enqueueGoalMutation,
  getGoalMutationCounts,
  getLocalGoalRecord,
  listLocalGoalsForUser,
  listPendingGoalMutations,
  removeGoalMutation,
  removeLocalGoalRecord,
  updateGoalMutation,
  upsertLocalGoalRecord,
} from '../data/goalsOfflineRepo';
import {
  computePlanQuality,
  toPlanQualityBreakdownJson,
} from '../features/goals/planQuality';
import { computeEnvironmentAudit } from '../features/environment/environmentAudit';
import { buildEnvironmentRecommendations } from '../features/environment/environmentRecommendations';
import {
  environmentContextToJson,
  normalizeEnvironmentContext,
} from '../features/environment/environmentSchema';
import {
  buildSnapshotSummary,
  createGoalSnapshot,
  inferSnapshotType,
} from './goalSnapshots';
import { insertEnvironmentAudit } from './environmentAudits';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

function authRequiredError(): PostgrestError {
  return {
    name: 'PostgrestError',
    code: 'AUTH_REQUIRED',
    details: 'No active authenticated Supabase session.',
    hint: 'Sign in to manage goals.',
    message: 'Authentication required.',
  };
}

const LOCAL_GOAL_PREFIX = 'local-goal-';

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

async function getActiveUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function isLocalGoalId(id: string): boolean {
  return id.startsWith(LOCAL_GOAL_PREFIX);
}

function makeLocalGoalFromInsert(payload: GoalInsert, localId: string): GoalRow {
  const draft = payload as unknown as Partial<GoalRow>;
  return {
    id: localId,
    user_id: payload.user_id,
    created_at: nowIso(),
    updated_at: nowIso(),
    title: payload.title,
    description: draft.description ?? null,
    target_date: draft.target_date ?? null,
    progress_notes: draft.progress_notes ?? null,
    status_tag: draft.status_tag ?? 'on_track',
    life_wheel_category: draft.life_wheel_category ?? null,
    start_date: draft.start_date ?? null,
    estimated_duration_days: draft.estimated_duration_days ?? null,
    timing_notes: draft.timing_notes ?? null,
    why_it_matters: draft.why_it_matters ?? null,
    plan_quality_score: draft.plan_quality_score ?? null,
    plan_quality_breakdown: draft.plan_quality_breakdown ?? null,
    weekly_workload_target: draft.weekly_workload_target ?? null,
    priority_level: draft.priority_level ?? null,
    environment_context: draft.environment_context ?? null,
    environment_score: draft.environment_score ?? null,
    environment_last_audited_at: draft.environment_last_audited_at ?? null,
  } as GoalRow;
}

function mergeGoalWithUpdate(base: GoalRow, payload: GoalUpdate): GoalRow {
  return {
    ...base,
    ...payload,
    updated_at: nowIso(),
  } as GoalRow;
}

async function queueLocalGoalCreate(payload: GoalInsert): Promise<GoalRow> {
  const localId = buildLocalGoalId();
  const localRow = makeLocalGoalFromInsert(payload, localId);
  const nowMs = Date.now();
  await upsertLocalGoalRecord({
    id: localId,
    user_id: payload.user_id,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: nowMs,
    last_error: null,
  });
  await enqueueGoalMutation({
    id: `goal-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: payload.user_id,
    goal_id: localId,
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

async function queueLocalGoalUpdate(id: string, payload: GoalUpdate): Promise<GoalRow | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;
  const nowMs = Date.now();
  const existingLocal = await getLocalGoalRecord(id);
  let base = existingLocal?.row ?? null;
  if (!base && !isLocalGoalId(id)) {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('goals').select('*').eq('id', id).maybeSingle<GoalRow>();
    base = data ?? null;
  }
  if (!base) return null;

  const merged = mergeGoalWithUpdate(base, payload);
  await upsertLocalGoalRecord({
    id,
    user_id: userId,
    server_id: isLocalGoalId(id) ? null : id,
    row: merged,
    sync_state: isLocalGoalId(id) ? 'pending_create' : 'pending_update',
    updated_at_ms: nowMs,
    last_error: null,
  });

  if (!isLocalGoalId(id)) {
    await enqueueGoalMutation({
      id: `goal-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      goal_id: id,
      server_id: id,
      operation: 'update',
      payload,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
  }
  return merged;
}

async function queueLocalGoalDelete(id: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  const nowMs = Date.now();
  if (isLocalGoalId(id)) {
    await removeLocalGoalRecord(id);
    return;
  }

  const existing = await getLocalGoalRecord(id);
  if (existing) {
    await upsertLocalGoalRecord({
      ...existing,
      sync_state: 'pending_delete',
      updated_at_ms: nowMs,
      last_error: null,
    });
  }

  await enqueueGoalMutation({
    id: `goal-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    goal_id: id,
    server_id: id,
    operation: 'delete',
    payload: null,
    status: 'pending',
    attempt_count: 0,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
    last_error: null,
  });
}

async function mergeLocalGoalsOverRemote(remoteGoals: GoalRow[]): Promise<GoalRow[]> {
  const userId = await getActiveUserId();
  if (!userId) return remoteGoals;
  const local = await listLocalGoalsForUser(userId);
  if (!local.length) return remoteGoals;

  const byId = new Map(remoteGoals.map((goal) => [goal.id, goal] as const));
  for (const record of local) {
    if (record.sync_state === 'pending_delete') {
      byId.delete(record.id);
      if (record.server_id) byId.delete(record.server_id);
      continue;
    }
    byId.set(record.row.id, record.row);
  }
  return Array.from(byId.values());
}

export type GoalQueueStatus = { pending: number; failed: number };

export async function getGoalQueueStatus(): Promise<GoalQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const userId = await getActiveUserId();
  if (!userId) return { pending: 0, failed: 0 };
  return getGoalMutationCounts(userId);
}

export async function syncQueuedGoals(): Promise<void> {
  if (!canUseSupabaseData()) return;
  const userId = await getActiveUserId();
  if (!userId) return;
  const supabase = getSupabaseClient();
  const pending = await listPendingGoalMutations(userId);

  for (const mutation of pending) {
    try {
      await updateGoalMutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      if (mutation.operation === 'create') {
        const payload = mutation.payload as GoalInsert | null;
        if (!payload) {
          await removeGoalMutation(mutation.id);
          continue;
        }
        const { error } = await supabase.from('goals').insert(payload).select().single<GoalRow>();
        if (error) throw error;
        await removeLocalGoalRecord(mutation.goal_id);
        await removeGoalMutation(mutation.id);
        continue;
      }
      if (mutation.operation === 'update') {
        const payload = mutation.payload as GoalUpdate | null;
        if (!payload || !mutation.server_id) {
          await removeGoalMutation(mutation.id);
          continue;
        }
        const { error } = await supabase.from('goals').update(payload).eq('id', mutation.server_id);
        if (error) throw error;
        await removeLocalGoalRecord(mutation.goal_id);
        await removeGoalMutation(mutation.id);
        continue;
      }
      if (mutation.operation === 'delete') {
        if (!mutation.server_id) {
          await removeGoalMutation(mutation.id);
          continue;
        }
        const { error } = await supabase.from('goals').delete().eq('id', mutation.server_id);
        if (error) throw error;
        await removeLocalGoalRecord(mutation.goal_id);
        await removeGoalMutation(mutation.id);
      }
    } catch (error) {
      await updateGoalMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}


function buildPlanQualityPatch(goal: GoalInsert | GoalUpdate): Pick<GoalUpdate, 'plan_quality_score' | 'plan_quality_breakdown'> {
  const result = computePlanQuality({
    goalOutcomeStatement: ('title' in goal ? goal.title : null) ?? null,
    successMetric: ('description' in goal ? goal.description : null) ?? null,
    targetDate: ('target_date' in goal ? goal.target_date : null) ?? null,
    firstAction: ('timing_notes' in goal ? goal.timing_notes : null) ?? null,
    weeklyWorkloadTarget: ('weekly_workload_target' in goal ? goal.weekly_workload_target : null) ?? null,
    priorityLevel: ('priority_level' in goal ? goal.priority_level : null) ?? null,
  });

  return {
    plan_quality_score: result.score,
    plan_quality_breakdown: toPlanQualityBreakdownJson(result.breakdown),
  };
}

function hasEnvironmentFields(goal: GoalInsert | GoalUpdate): boolean {
  return 'environment_context' in goal || 'environment_score' in goal || 'environment_last_audited_at' in goal;
}

function buildGoalEnvironmentPatch(
  goal: GoalInsert | GoalUpdate,
): Pick<GoalUpdate, 'environment_context' | 'environment_score' | 'environment_last_audited_at'> {
  if (!hasEnvironmentFields(goal)) {
    return {};
  }

  if (goal.environment_context === null) {
    return {
      environment_context: null,
      environment_score: null,
      environment_last_audited_at: null,
    };
  }

  const normalizedContext = normalizeEnvironmentContext(goal.environment_context ?? null, {
    source: 'edit',
  });

  if (!normalizedContext) {
    return {
      environment_context: null,
      environment_score: null,
      environment_last_audited_at: null,
    };
  }

  const audit = computeEnvironmentAudit(normalizedContext);

  return {
    environment_context: environmentContextToJson(normalizedContext),
    environment_score: audit.score,
    environment_last_audited_at: goal.environment_last_audited_at ?? new Date().toISOString(),
  };
}

export async function fetchGoals(): Promise<ServiceResponse<GoalRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  await syncQueuedGoals();
  const supabase = getSupabaseClient();
  const response = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<GoalRow[]>();
  if (response.error) {
    return { data: null, error: response.error };
  }

  const merged = await mergeLocalGoalsOverRemote(response.data ?? []);
  return { data: merged, error: null };
}

export async function insertGoal(payload: GoalInsert): Promise<ServiceResponse<GoalRow>> {
  const payloadWithQuality = {
    ...payload,
    ...buildPlanQualityPatch(payload),
    ...buildGoalEnvironmentPatch(payload),
  };

  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goals')
    .insert(payloadWithQuality)
    .select()
    .single<GoalRow>();

  if (data) {
    const afterEnvironment = normalizeEnvironmentContext(data.environment_context ?? null);
    const recommendations = buildEnvironmentRecommendations(afterEnvironment);

    const snapshotType = inferSnapshotType(null, data);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: null,
      after_state: data,
      metadata: {
        source: 'goals.insert',
      },
    });

    if (afterEnvironment) {
      await insertEnvironmentAudit({
        userId: data.user_id,
        goalId: data.id,
        auditSource: 'setup',
        scoreBefore: null,
        scoreAfter: data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: null,
        afterState: afterEnvironment,
      });
    }
  }

  if (error && isNetworkLikeError(error)) {
    const queued = await queueLocalGoalCreate(payloadWithQuality);
    return { data: queued, error: null };
  }

  return { data: data ?? null, error };
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();

  const { data: beforeState } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .maybeSingle<GoalRow>();

  const mergedGoalForScoring = {
    ...beforeState,
    ...payload,
  } as GoalRow;

  const { data, error } = await supabase
    .from('goals')
    .update({
      ...payload,
      ...buildPlanQualityPatch(mergedGoalForScoring),
      ...buildGoalEnvironmentPatch(mergedGoalForScoring),
    })
    .eq('id', id)
    .select()
    .single<GoalRow>();

  if (data) {
    const beforeEnvironment = normalizeEnvironmentContext(beforeState?.environment_context ?? null);
    const afterEnvironment = normalizeEnvironmentContext(data.environment_context ?? null);
    const recommendations = buildEnvironmentRecommendations(afterEnvironment);

    const snapshotType = inferSnapshotType(beforeState ?? null, data);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: beforeState,
      after_state: data,
      metadata: {
        source: 'goals.update',
      },
    });

    if (beforeEnvironment || afterEnvironment) {
      await insertEnvironmentAudit({
        userId: data.user_id,
        goalId: data.id,
        auditSource: 'manual_edit',
        scoreBefore: beforeState?.environment_score ?? null,
        scoreAfter: data.environment_score,
        riskTags: recommendations.riskTags,
        beforeState: beforeEnvironment,
        afterState: afterEnvironment,
      });
    }
  }

  if (error && isNetworkLikeError(error)) {
    const queued = await queueLocalGoalUpdate(id, payload);
    if (queued) {
      return { data: queued, error: null };
    }
  }

  return { data: data ?? null, error };
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  const { data: beforeState } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .maybeSingle<GoalRow>();

  const { data, error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .select()
    .single<GoalRow>();

  if (data) {
    const snapshotType = inferSnapshotType(beforeState ?? null, null);
    await createGoalSnapshot({
      goal_id: data.id,
      user_id: data.user_id,
      snapshot_type: snapshotType,
      summary: buildSnapshotSummary(snapshotType),
      before_state: beforeState,
      after_state: null,
      metadata: {
        source: 'goals.delete',
      },
    });
  }

  if (error && isNetworkLikeError(error)) {
    await queueLocalGoalDelete(id);
    return { data: null, error: null };
  }

  return { data: data ?? null, error };
}
