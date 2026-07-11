import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
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
  getLocalGoalRecord,
  listLocalGoalsForUser,
  listPendingGoalMutations,
  removeGoalMutation,
  removeLocalGoalRecord,
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
    secondary_life_wheel_categories: draft.secondary_life_wheel_categories ?? [],
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

// ── Offline overlay & queueing (shared MutationQueue) ───────────────────────
// The goals_local overlay store keeps rows edited offline for merging over
// remote reads; mutations themselves converge on the shared queue (executors
// in offlineSyncExecutors.ts). Creates carry a client uuid so replays upsert
// idempotently and no local→server id remapping is needed.

async function queueLocalGoalCreate(payload: GoalInsert & { id: string }): Promise<GoalRow> {
  const localRow = makeLocalGoalFromInsert(payload, payload.id);
  await upsertLocalGoalRecord({
    id: payload.id,
    user_id: payload.user_id,
    server_id: null,
    row: localRow,
    sync_state: 'pending_create',
    updated_at_ms: Date.now(),
    last_error: null,
  });
  await getMutationQueue().enqueue({
    feature: 'goals',
    operation: 'goal.create',
    payload,
    dedupeKey: payload.id,
  });
  return localRow;
}

async function queueLocalGoalUpdate(
  id: string,
  payload: GoalUpdate,
  fallbackBase: GoalRow | null = null,
): Promise<GoalRow | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;
  const existingLocal = await getLocalGoalRecord(id);
  const base = existingLocal?.row ?? fallbackBase;
  if (!base) return null;

  const merged = mergeGoalWithUpdate(base, payload);
  await upsertLocalGoalRecord({
    id,
    user_id: userId,
    server_id: existingLocal?.sync_state === 'pending_create' ? null : id,
    row: merged,
    sync_state: existingLocal?.sync_state === 'pending_create' ? 'pending_create' : 'pending_update',
    updated_at_ms: Date.now(),
    last_error: null,
  });

  await getMutationQueue().enqueue({
    feature: 'goals',
    operation: 'goal.update',
    // No dedupeKey: patches are partial, so queued updates replay in order.
    payload: { id, patch: payload },
  });
  return merged;
}

async function queueLocalGoalDelete(id: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;

  const existing = await getLocalGoalRecord(id);
  if (existing) {
    await upsertLocalGoalRecord({
      ...existing,
      sync_state: 'pending_delete',
      updated_at_ms: Date.now(),
      last_error: null,
    });
  }

  await getMutationQueue().enqueue({
    feature: 'goals',
    operation: 'goal.delete',
    payload: { id },
    dedupeKey: id,
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
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'goals') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

let legacyGoalQueueMigrated = false;

/**
 * One-time convergence of the pre-framework goal mutation queue onto the
 * shared MutationQueue. Pending entries survive the upgrade; offline-created
 * `local-goal-…` ids are re-keyed to real client uuids.
 */
export async function migrateLegacyGoalQueue(): Promise<void> {
  if (legacyGoalQueueMigrated) return;
  legacyGoalQueueMigrated = true;

  const userId = await getActiveUserId();
  if (!userId) {
    legacyGoalQueueMigrated = false; // Retry once a session exists.
    return;
  }

  try {
    const pending = await listPendingGoalMutations(userId);
    const queue = getMutationQueue();

    for (const legacy of pending) {
      if (legacy.operation === 'create') {
        const payload = legacy.payload as GoalInsert | null;
        if (payload) {
          const id = isLocalGoalId(legacy.goal_id) ? generateClientId() : legacy.goal_id;
          const record = await getLocalGoalRecord(legacy.goal_id);
          if (record && isLocalGoalId(legacy.goal_id)) {
            await removeLocalGoalRecord(legacy.goal_id);
            await upsertLocalGoalRecord({ ...record, id, row: { ...record.row, id } });
          }
          await queue.enqueue({
            feature: 'goals',
            operation: 'goal.create',
            payload: { ...payload, id },
            dedupeKey: id,
          });
        }
      } else if (legacy.operation === 'update' && legacy.server_id) {
        await queue.enqueue({
          feature: 'goals',
          operation: 'goal.update',
          payload: { id: legacy.server_id, patch: legacy.payload ?? {} },
        });
      } else if (legacy.operation === 'delete' && legacy.server_id) {
        await queue.enqueue({
          feature: 'goals',
          operation: 'goal.delete',
          payload: { id: legacy.server_id },
          dedupeKey: legacy.server_id,
        });
      }
      await removeGoalMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyGoalQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedGoals(): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyGoalQueue();
  await getSyncEngine().syncNow();
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

function goalsCacheKey(userId: string): string {
  return `goals:${userId}`;
}

export async function fetchGoals(): Promise<ServiceResponse<GoalRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  await syncQueuedGoals();
  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<GoalRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });

  if (!result.ok) {
    // Outage: last successful list merged with offline edits keeps the
    // Goals screen usable until sync returns.
    const userId = await getActiveUserId();
    const cached = userId ? readReadFallbackCache<GoalRow[]>(goalsCacheKey(userId)) : null;
    if (cached) {
      const merged = await mergeLocalGoalsOverRemote(cached);
      return { data: merged, error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }

  const userId = await getActiveUserId();
  if (userId) writeReadFallbackCache(goalsCacheKey(userId), result.data);
  const merged = await mergeLocalGoalsOverRemote(result.data);
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
  const id = generateClientId();
  const insertPayload = { ...payloadWithQuality, id };
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('goals').insert(insertPayload).select().single<GoalRow>();
    if (response.error) throw response.error;
    return response.data;
  });
  const data = result.ok ? result.data : null;

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

  if (!result.ok && shouldQueueAfterFailure(result.error)) {
    const queued = await queueLocalGoalCreate(insertPayload);
    return { data: queued, error: null };
  }

  return { data: data ?? null, error: result.ok ? null : toPostgrestError(result.error) };
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();

  const beforeResult = await guardedCloudCall('database', async () => {
    const response = await supabase.from('goals').select('*').eq('id', id).maybeSingle<GoalRow>();
    if (response.error) throw response.error;
    return response.data;
  });
  const beforeState = beforeResult.ok ? beforeResult.data : (await getLocalGoalRecord(id))?.row ?? null;

  const mergedGoalForScoring = {
    ...beforeState,
    ...payload,
  } as GoalRow;

  const updatePatch = {
    ...payload,
    ...buildPlanQualityPatch(mergedGoalForScoring),
    ...buildGoalEnvironmentPatch(mergedGoalForScoring),
  };

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('goals')
      .update(updatePatch)
      .eq('id', id)
      .select()
      .single<GoalRow>();
    if (response.error) throw response.error;
    return response.data;
  });
  const data = result.ok ? result.data : null;

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

  if (!result.ok && shouldQueueAfterFailure(result.error)) {
    const queued = await queueLocalGoalUpdate(id, updatePatch, beforeState);
    if (queued) {
      return { data: queued, error: null };
    }
  }

  return { data: data ?? null, error: result.ok ? null : toPostgrestError(result.error) };
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: authRequiredError() };
  }

  const supabase = getSupabaseClient();
  const beforeResult = await guardedCloudCall('database', async () => {
    const response = await supabase.from('goals').select('*').eq('id', id).maybeSingle<GoalRow>();
    if (response.error) throw response.error;
    return response.data;
  });
  const beforeState = beforeResult.ok ? beforeResult.data : null;

  const result = await guardedCloudCall('database', async () => {
    const response = await supabase.from('goals').delete().eq('id', id).select().single<GoalRow>();
    if (response.error) throw response.error;
    return response.data;
  });
  const data = result.ok ? result.data : null;

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

  if (!result.ok && shouldQueueAfterFailure(result.error)) {
    await queueLocalGoalDelete(id);
    return { data: null, error: null };
  }

  return { data: data ?? null, error: result.ok ? null : toPostgrestError(result.error) };
}
