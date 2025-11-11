import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

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
  return supabase
    .from('life_goal_steps')
    .insert(payload)
    .select()
    .returns<StepRow>()
    .single();
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
  return supabase
    .from('life_goal_substeps')
    .insert(payload)
    .select()
    .returns<SubstepRow>()
    .single();
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
  return supabase
    .from('life_goal_alerts')
    .insert(payload)
    .select()
    .returns<AlertRow>()
    .single();
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
