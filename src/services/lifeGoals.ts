import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import {
  enqueueLifeGoalMutation,
  getLifeGoalMutationCounts,
  listPendingLifeGoalMutations,
  removeLifeGoalMutation,
  updateLifeGoalMutation,
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

function buildLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function canQueueWithServerParent(parentId: string | null | undefined): boolean {
  return Boolean(parentId && !parentId.startsWith('local-'));
}

export type LifeGoalQueueStatus = { pending: number; failed: number };

export async function getLifeGoalQueueStatus(): Promise<LifeGoalQueueStatus> {
  if (!canUseSupabaseData()) return { pending: 0, failed: 0 };
  const userId = await getActiveUserId();
  if (!userId) return { pending: 0, failed: 0 };
  return getLifeGoalMutationCounts(userId);
}

export async function syncQueuedLifeGoalMutations(): Promise<void> {
  if (!canUseSupabaseData()) return;
  const userId = await getActiveUserId();
  if (!userId) return;
  const supabase = getSupabaseClient();
  const pending = await listPendingLifeGoalMutations(userId);

  for (const mutation of pending) {
    try {
      await updateLifeGoalMutation(mutation.id, { status: 'processing', updated_at_ms: Date.now() });
      if (mutation.operation === 'insert_step') {
        const { error } = await supabase.from('life_goal_steps').insert(mutation.payload as StepInsert);
        if (error) throw error;
      } else if (mutation.operation === 'insert_substep') {
        const { error } = await supabase.from('life_goal_substeps').insert(mutation.payload as SubstepInsert);
        if (error) throw error;
      } else if (mutation.operation === 'insert_alert') {
        const { error } = await supabase.from('life_goal_alerts').insert(mutation.payload as AlertInsert);
        if (error) throw error;
      }
      await removeLifeGoalMutation(mutation.id);
    } catch (error) {
      await updateLifeGoalMutation(mutation.id, {
        status: 'failed',
        attempt_count: mutation.attempt_count + 1,
        updated_at_ms: Date.now(),
        last_error: error instanceof Error ? error.message : String(error),
      });
    }
  }
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
  return supabase
    .from('life_goal_steps')
    .select('*')
    .eq('goal_id', goalId)
    .order('step_order', { ascending: true })
    .returns<StepRow[]>();
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
  const result = await supabase
    .from('life_goal_steps')
    .insert(payload)
    .select()
    .returns<StepRow>()
    .single();
  if (!result.error || !isNetworkLikeError(result.error) || !canQueueWithServerParent(payload.goal_id)) {
    return result;
  }

  const userId = await getActiveUserId();
  if (userId) {
    const nowMs = Date.now();
    await enqueueLifeGoalMutation({
      id: `lg-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      operation: 'insert_step',
      payload,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
  }
  return {
    data: {
      id: buildLocalId('local-step'),
      goal_id: payload.goal_id,
      step_order: payload.step_order ?? 0,
      title: payload.title,
      description: payload.description ?? null,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      due_date: payload.due_date ?? null,
      created_at: nowIso(),
    },
    error: null,
  };
}

export async function updateStep(id: string, payload: StepUpdate): Promise<ServiceResponse<StepRow>> {
  if (!canUseSupabaseData()) {
    // Demo mode - return mock data
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_steps')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<StepRow>()
    .single();
}

export async function deleteStep(id: string): Promise<ServiceResponse<StepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_steps')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

// =====================================================
// LIFE GOAL SUBSTEPS
// =====================================================

export async function fetchSubstepsForStep(stepId: string): Promise<ServiceResponse<SubstepRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_substeps')
    .select('*')
    .eq('step_id', stepId)
    .order('substep_order', { ascending: true })
    .returns<SubstepRow[]>();
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
  const result = await supabase
    .from('life_goal_substeps')
    .insert(payload)
    .select()
    .returns<SubstepRow>()
    .single();
  if (!result.error || !isNetworkLikeError(result.error) || !canQueueWithServerParent(payload.step_id)) {
    return result;
  }

  const userId = await getActiveUserId();
  if (userId) {
    const nowMs = Date.now();
    await enqueueLifeGoalMutation({
      id: `lg-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      operation: 'insert_substep',
      payload,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
  }
  return {
    data: {
      id: buildLocalId('local-substep'),
      step_id: payload.step_id,
      substep_order: payload.substep_order ?? 0,
      title: payload.title,
      completed: payload.completed ?? false,
      completed_at: payload.completed_at ?? null,
      created_at: nowIso(),
    },
    error: null,
  };
}

export async function updateSubstep(
  id: string,
  payload: SubstepUpdate
): Promise<ServiceResponse<SubstepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_substeps')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<SubstepRow>()
    .single();
}

export async function deleteSubstep(id: string): Promise<ServiceResponse<SubstepRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_substeps')
    .delete()
    .eq('id', id)
    .select()
    .single();
}

// =====================================================
// LIFE GOAL ALERTS
// =====================================================

export async function fetchAlertsForGoal(goalId: string): Promise<ServiceResponse<AlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_alerts')
    .select('*')
    .eq('goal_id', goalId)
    .order('alert_time', { ascending: true })
    .returns<AlertRow[]>();
}

export async function fetchAlertsForUser(userId: string): Promise<ServiceResponse<AlertRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('alert_time', { ascending: true })
    .returns<AlertRow[]>();
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
  const result = await supabase
    .from('life_goal_alerts')
    .insert(payload)
    .select()
    .returns<AlertRow>()
    .single();
  if (!result.error || !isNetworkLikeError(result.error) || !canQueueWithServerParent(payload.goal_id)) {
    return result;
  }

  const userId = await getActiveUserId();
  if (userId) {
    const nowMs = Date.now();
    await enqueueLifeGoalMutation({
      id: `lg-mut-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      operation: 'insert_alert',
      payload,
      status: 'pending',
      attempt_count: 0,
      created_at_ms: nowMs,
      updated_at_ms: nowMs,
      last_error: null,
    });
  }
  return {
    data: {
      id: buildLocalId('local-alert'),
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
    },
    error: null,
  };
}

export async function updateAlert(id: string, payload: AlertUpdate): Promise<ServiceResponse<AlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_alerts')
    .update(payload)
    .eq('id', id)
    .select()
    .returns<AlertRow>()
    .single();
}

export async function deleteAlert(id: string): Promise<ServiceResponse<AlertRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('life_goal_alerts')
    .delete()
    .eq('id', id)
    .select()
    .single();
}
