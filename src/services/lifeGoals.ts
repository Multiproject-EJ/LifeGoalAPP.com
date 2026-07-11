import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { guardedCloudCall } from './service-health';
import { getMutationQueue, getSyncEngine } from './offline-queue';
import {
  generateClientId,
  shouldQueueAfterFailure,
  toPostgrestError,
} from './offlineWriteThrough';
import {
  listPendingLifeGoalMutations,
  removeLifeGoalMutation,
} from '../data/lifeGoalsOfflineRepo';

type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];
type StepInsert = Database['public']['Tables']['life_goal_steps']['Insert'];
type StepUpdate = Database['public']['Tables']['life_goal_steps']['Update'];

type SubstepRow = Database['public']['Tables']['life_goal_substeps']['Row'];
type SubstepInsert = Database['public']['Tables']['life_goal_substeps']['Insert'];
type SubstepUpdate = Database['public']['Tables']['life_goal_substeps']['Update'];

type AlertRow = Database['public']['Tables']['life_goal_alerts']['Row'];
type AlertInsert = Database['public']['Tables']['life_goal_alerts']['Insert'];
type AlertUpdate = Database['public']['Tables']['life_goal_alerts']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Every queued life-goal mutation travels as one 'life_goal.write' operation
 * whose payload carries its kind — the executor in offlineSyncExecutors.ts
 * switches on it. Inserts carry client-generated ids so replays upsert
 * idempotently (legacy migrated payloads without ids fall back to insert).
 */
export type LifeGoalWritePayload =
  | { kind: 'insert_step'; insert: StepInsert }
  | { kind: 'update_step'; id: string; patch: StepUpdate }
  | { kind: 'delete_step'; id: string }
  | { kind: 'insert_substep'; insert: SubstepInsert }
  | { kind: 'update_substep'; id: string; patch: SubstepUpdate }
  | { kind: 'delete_substep'; id: string }
  | { kind: 'insert_alert'; insert: AlertInsert }
  | { kind: 'update_alert'; id: string; patch: AlertUpdate }
  | { kind: 'delete_alert'; id: string };

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

function canQueueWithServerParent(parentId: string | null | undefined): boolean {
  return Boolean(parentId && !parentId.startsWith('local-'));
}

function canQueueById(id: string): boolean {
  return !id.startsWith('local-');
}

/** Guarded write with queue fallback shared by all nine write functions. */
async function guardedLifeGoalWrite<T>(options: {
  payload: LifeGoalWritePayload;
  /** false when a legacy local- parent/id makes queueing unsafe. */
  canQueue: boolean;
  dedupeKey?: string;
  write: () => Promise<T>;
  optimistic: () => T | null;
}): Promise<ServiceResponse<T>> {
  const result = await guardedCloudCall('database', options.write);
  if (result.ok) {
    return { data: result.data, error: null };
  }
  if (options.canQueue && shouldQueueAfterFailure(result.error)) {
    await getMutationQueue().enqueue({
      feature: 'life_goals',
      operation: 'life_goal.write',
      payload: options.payload,
      dedupeKey: options.dedupeKey,
    });
    return { data: options.optimistic(), error: null };
  }
  return { data: null, error: toPostgrestError(result.error) };
}

export type LifeGoalQueueStatus = { pending: number; failed: number };

export async function getLifeGoalQueueStatus(): Promise<LifeGoalQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const mutations = await getMutationQueue().list();
  let pending = 0;
  let failed = 0;
  for (const mutation of mutations) {
    if (mutation.feature !== 'life_goals') continue;
    if (mutation.status === 'pending' || mutation.status === 'syncing') pending += 1;
    else if (mutation.status === 'failed' || mutation.status === 'blocked') failed += 1;
  }
  return { pending, failed };
}

let legacyLifeGoalQueueMigrated = false;

/**
 * One-time convergence of the pre-framework life-goal mutation queue onto the
 * shared MutationQueue. Payload shapes are identical, so entries transfer
 * directly.
 */
export async function migrateLegacyLifeGoalQueue(): Promise<void> {
  if (legacyLifeGoalQueueMigrated) return;
  legacyLifeGoalQueueMigrated = true;

  const userId = await getActiveUserId();
  if (!userId) {
    legacyLifeGoalQueueMigrated = false; // Retry once a session exists.
    return;
  }

  try {
    const queue = getMutationQueue();
    for (const legacy of await listPendingLifeGoalMutations(userId)) {
      await queue.enqueue({
        feature: 'life_goals',
        operation: 'life_goal.write',
        payload: legacy.payload,
      });
      await removeLifeGoalMutation(legacy.id);
    }
  } catch {
    // Migration is best-effort; legacy entries stay put for the next attempt.
    legacyLifeGoalQueueMigrated = false;
  }
}

/** Manual sync kick; the shared engine also auto-resyncs on reconnect. */
export async function syncQueuedLifeGoalMutations(): Promise<void> {
  if (!canUseSupabaseData()) return;
  await migrateLegacyLifeGoalQueue();
  await getSyncEngine().syncNow();
}

// =====================================================
// LIFE GOAL STEPS
// =====================================================

export async function fetchStepsForGoal(goalId: string): Promise<ServiceResponse<StepRow[]>> {
  if (!canUseSupabaseData()) {
    // Demo mode - return empty array for now
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('life_goal_steps')
      .select('*')
      .eq('goal_id', goalId)
      .order('step_order', { ascending: true })
      .returns<StepRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function insertStep(payload: StepInsert): Promise<ServiceResponse<StepRow>> {
  if (!canUseSupabaseData()) {
    // Demo mode - return mock data
    const mockStep: StepRow = {
      id: crypto.randomUUID(),
      goal_id: payload.goal_id,
      step_order: payload.step_order ?? 0,
      title: payload.title,
      description: payload.description ?? null,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      due_date: payload.due_date ?? null,
      created_at: new Date().toISOString(),
    };
    return { data: mockStep, error: null };
  }

  const supabase = getSupabaseClient();
  const insertPayload = { ...payload, id: payload.id ?? generateClientId() };
  return guardedLifeGoalWrite<StepRow>({
    payload: { kind: 'insert_step', insert: insertPayload },
    canQueue: canQueueWithServerParent(payload.goal_id),
    dedupeKey: insertPayload.id,
    write: async () => {
      const response = await supabase
        .from('life_goal_steps')
        .insert(insertPayload)
        .select()
        .returns<StepRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => ({
      id: insertPayload.id,
      goal_id: payload.goal_id,
      step_order: payload.step_order ?? 0,
      title: payload.title,
      description: payload.description ?? null,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      due_date: payload.due_date ?? null,
      created_at: nowIso(),
    }),
  });
}

export async function updateStep(id: string, payload: StepUpdate): Promise<ServiceResponse<StepRow>> {
  if (!canUseSupabaseData()) {
    // Demo mode - return mock data
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<StepRow | null>({
    payload: { kind: 'update_step', id, patch: payload },
    canQueue: true,
    write: async () => {
      const response = await supabase
        .from('life_goal_steps')
        .update(payload)
        .eq('id', id)
        .select()
        .returns<StepRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<StepRow>>;
}

export async function deleteStep(id: string): Promise<ServiceResponse<StepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<StepRow | null>({
    payload: { kind: 'delete_step', id },
    canQueue: true,
    dedupeKey: id,
    write: async () => {
      const response = await supabase
        .from('life_goal_steps')
        .delete()
        .eq('id', id)
        .select()
        .single<StepRow>();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<StepRow>>;
}

// =====================================================
// LIFE GOAL SUBSTEPS
// =====================================================

export async function fetchSubstepsForStep(stepId: string): Promise<ServiceResponse<SubstepRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('life_goal_substeps')
      .select('*')
      .eq('step_id', stepId)
      .order('substep_order', { ascending: true })
      .returns<SubstepRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function insertSubstep(payload: SubstepInsert): Promise<ServiceResponse<SubstepRow>> {
  if (!canUseSupabaseData()) {
    const mockSubstep: SubstepRow = {
      id: crypto.randomUUID(),
      step_id: payload.step_id,
      substep_order: payload.substep_order ?? 0,
      title: payload.title,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      created_at: new Date().toISOString(),
    };
    return { data: mockSubstep, error: null };
  }

  const supabase = getSupabaseClient();
  const insertPayload = { ...payload, id: payload.id ?? generateClientId() };
  return guardedLifeGoalWrite<SubstepRow>({
    payload: { kind: 'insert_substep', insert: insertPayload },
    canQueue: canQueueWithServerParent(payload.step_id),
    dedupeKey: insertPayload.id,
    write: async () => {
      const response = await supabase
        .from('life_goal_substeps')
        .insert(insertPayload)
        .select()
        .returns<SubstepRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => ({
      id: insertPayload.id,
      step_id: payload.step_id,
      substep_order: payload.substep_order ?? 0,
      title: payload.title,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      created_at: nowIso(),
    }),
  });
}

export async function updateSubstep(
  id: string,
  payload: SubstepUpdate
): Promise<ServiceResponse<SubstepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<SubstepRow | null>({
    payload: { kind: 'update_substep', id, patch: payload },
    canQueue: true,
    write: async () => {
      const response = await supabase
        .from('life_goal_substeps')
        .update(payload)
        .eq('id', id)
        .select()
        .returns<SubstepRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<SubstepRow>>;
}

export async function deleteSubstep(id: string): Promise<ServiceResponse<SubstepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<SubstepRow | null>({
    payload: { kind: 'delete_substep', id },
    canQueue: true,
    dedupeKey: id,
    write: async () => {
      const response = await supabase
        .from('life_goal_substeps')
        .delete()
        .eq('id', id)
        .select()
        .single<SubstepRow>();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<SubstepRow>>;
}

// =====================================================
// LIFE GOAL ALERTS
// =====================================================

export async function fetchAlertsForGoal(goalId: string): Promise<ServiceResponse<AlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('life_goal_alerts')
      .select('*')
      .eq('goal_id', goalId)
      .order('alert_time', { ascending: true })
      .returns<AlertRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function fetchAlertsForUser(userId: string): Promise<ServiceResponse<AlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall('database', async () => {
    const response = await supabase
      .from('life_goal_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)
      .order('alert_time', { ascending: true })
      .returns<AlertRow[]>();
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) return { data: null, error: toPostgrestError(result.error) };
  return { data: result.data, error: null };
}

export async function insertAlert(payload: AlertInsert): Promise<ServiceResponse<AlertRow>> {
  if (!canUseSupabaseData()) {
    const mockAlert: AlertRow = {
      id: crypto.randomUUID(),
      goal_id: payload.goal_id,
      user_id: payload.user_id,
      alert_type: payload.alert_type,
      alert_time: payload.alert_time,
      title: payload.title,
      message: payload.message ?? null,
      sent: payload.sent ?? false,
      sent_at: payload.sent_at ?? null,
      repeat_pattern: payload.repeat_pattern ?? null,
      enabled: payload.enabled ?? true,
      created_at: new Date().toISOString(),
    };
    return { data: mockAlert, error: null };
  }

  const supabase = getSupabaseClient();
  const insertPayload = { ...payload, id: payload.id ?? generateClientId() };
  return guardedLifeGoalWrite<AlertRow>({
    payload: { kind: 'insert_alert', insert: insertPayload },
    canQueue: canQueueWithServerParent(payload.goal_id),
    dedupeKey: insertPayload.id,
    write: async () => {
      const response = await supabase
        .from('life_goal_alerts')
        .insert(insertPayload)
        .select()
        .returns<AlertRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => ({
      id: insertPayload.id,
      goal_id: payload.goal_id,
      user_id: payload.user_id,
      alert_type: payload.alert_type,
      alert_time: payload.alert_time,
      title: payload.title,
      message: payload.message ?? null,
      sent: payload.sent ?? false,
      sent_at: payload.sent_at ?? null,
      repeat_pattern: payload.repeat_pattern ?? null,
      enabled: payload.enabled ?? true,
      created_at: nowIso(),
    }),
  });
}

export async function updateAlert(id: string, payload: AlertUpdate): Promise<ServiceResponse<AlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<AlertRow | null>({
    payload: { kind: 'update_alert', id, patch: payload },
    canQueue: true,
    write: async () => {
      const response = await supabase
        .from('life_goal_alerts')
        .update(payload)
        .eq('id', id)
        .select()
        .returns<AlertRow>()
        .single();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<AlertRow>>;
}

export async function deleteAlert(id: string): Promise<ServiceResponse<AlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  if (!canQueueById(id)) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return guardedLifeGoalWrite<AlertRow | null>({
    payload: { kind: 'delete_alert', id },
    canQueue: true,
    dedupeKey: id,
    write: async () => {
      const response = await supabase
        .from('life_goal_alerts')
        .delete()
        .eq('id', id)
        .select()
        .single<AlertRow>();
      if (response.error) throw response.error;
      return response.data;
    },
    optimistic: () => null,
  }) as Promise<ServiceResponse<AlertRow>>;
}
