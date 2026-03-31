import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getActiveSupabaseSession, getSupabaseClient } from '../lib/supabaseClient';
import type {
  CreateRoutineInput,
  CreateRoutineStepInput,
  Routine,
  RoutineLog,
  RoutineStep,
  UpdateRoutineInput,
  UpdateRoutineStepInput,
} from '../types/routines';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

const DEMO_ROUTINES_KEY = 'lifegoal-demo-routines-v1';
const DEMO_ROUTINE_STEPS_KEY = 'lifegoal-demo-routine-steps-v1';

function buildMockPostgrestError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: 'PGRST000',
  };
}

function readLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function localId(prefix: string): string {
  return `local-${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function getSessionUserId(): string | null {
  return getActiveSupabaseSession()?.user?.id ?? null;
}

export async function listRoutines(includeInactive = true): Promise<ServiceResponse<Routine[]>> {
  const sessionUserId = getSessionUserId();

  if (!canUseSupabaseData()) {
    if (!sessionUserId) {
      return { data: [], error: null };
    }
    const rows = readLocal<Routine>(DEMO_ROUTINES_KEY)
      .filter((row) => row.user_id === sessionUserId)
      .filter((row) => (includeInactive ? true : row.is_active))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { data: rows, error: null };
  }

  const supabase = getSupabaseClient();
  let query = (supabase as any)
    .from('routines')
    .select('*')
    .order('created_at', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createRoutine(input: CreateRoutineInput): Promise<ServiceResponse<Routine>> {
  const sessionUserId = getSessionUserId();
  if (!sessionUserId) {
    return { data: null, error: buildMockPostgrestError('No active user session.') };
  }

  if (!canUseSupabaseData()) {
    const now = new Date().toISOString();
    const row: Routine = {
      id: localId('routine'),
      user_id: sessionUserId,
      title: input.title,
      description: input.description ?? null,
      schedule: input.schedule ?? { mode: 'daily' },
      anchor_time: input.anchor_time ?? null,
      domain_key: input.domain_key ?? null,
      is_active: input.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    const existing = readLocal<Routine>(DEMO_ROUTINES_KEY);
    writeLocal(DEMO_ROUTINES_KEY, [...existing, row]);
    return { data: row, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routines')
    .insert({
      user_id: sessionUserId,
      title: input.title,
      description: input.description ?? null,
      schedule: input.schedule ?? { mode: 'daily' },
      anchor_time: input.anchor_time ?? null,
      domain_key: input.domain_key ?? null,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();

  return { data, error };
}

export async function updateRoutine(id: string, input: UpdateRoutineInput): Promise<ServiceResponse<Routine>> {
  if (!canUseSupabaseData()) {
    const rows = readLocal<Routine>(DEMO_ROUTINES_KEY);
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) {
      return { data: null, error: buildMockPostgrestError('Routine not found.') };
    }
    const updated: Routine = {
      ...rows[idx],
      ...input,
      updated_at: new Date().toISOString(),
    };
    rows[idx] = updated;
    writeLocal(DEMO_ROUTINES_KEY, rows);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routines')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  return { data, error };
}

export async function deleteRoutine(id: string): Promise<ServiceResponse<Routine>> {
  if (!canUseSupabaseData()) {
    const rows = readLocal<Routine>(DEMO_ROUTINES_KEY);
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) {
      return { data: null, error: buildMockPostgrestError('Routine not found.') };
    }
    const [removed] = rows.splice(idx, 1);
    writeLocal(DEMO_ROUTINES_KEY, rows);

    const stepRows = readLocal<RoutineStep>(DEMO_ROUTINE_STEPS_KEY).filter((step) => step.routine_id !== id);
    writeLocal(DEMO_ROUTINE_STEPS_KEY, stepRows);
    return { data: removed, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routines')
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  return { data, error };
}

export async function listRoutineSteps(routineId: string): Promise<ServiceResponse<RoutineStep[]>> {
  if (!canUseSupabaseData()) {
    const rows = readLocal<RoutineStep>(DEMO_ROUTINE_STEPS_KEY)
      .filter((row) => row.routine_id === routineId)
      .sort((a, b) => a.step_order - b.step_order);
    return { data: rows, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routine_steps')
    .select('*')
    .eq('routine_id', routineId)
    .order('step_order', { ascending: true });

  return { data, error };
}

export async function createRoutineStep(input: CreateRoutineStepInput): Promise<ServiceResponse<RoutineStep>> {
  if (!canUseSupabaseData()) {
    const now = new Date().toISOString();
    const row: RoutineStep = {
      id: localId('routine-step'),
      routine_id: input.routine_id,
      habit_id: input.habit_id,
      step_order: input.step_order ?? 0,
      required: input.required ?? true,
      display_mode: input.display_mode ?? 'inside_routine_only',
      fallback_step: input.fallback_step ?? false,
      created_at: now,
      updated_at: now,
    };

    const rows = readLocal<RoutineStep>(DEMO_ROUTINE_STEPS_KEY);
    writeLocal(DEMO_ROUTINE_STEPS_KEY, [...rows, row]);
    return { data: row, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routine_steps')
    .insert({
      routine_id: input.routine_id,
      habit_id: input.habit_id,
      step_order: input.step_order ?? 0,
      required: input.required ?? true,
      display_mode: input.display_mode ?? 'inside_routine_only',
      fallback_step: input.fallback_step ?? false,
    })
    .select('*')
    .single();

  return { data, error };
}

export async function updateRoutineStep(id: string, input: UpdateRoutineStepInput): Promise<ServiceResponse<RoutineStep>> {
  if (!canUseSupabaseData()) {
    const rows = readLocal<RoutineStep>(DEMO_ROUTINE_STEPS_KEY);
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) {
      return { data: null, error: buildMockPostgrestError('Routine step not found.') };
    }

    const updated: RoutineStep = {
      ...rows[idx],
      ...input,
      updated_at: new Date().toISOString(),
    };
    rows[idx] = updated;
    writeLocal(DEMO_ROUTINE_STEPS_KEY, rows);
    return { data: updated, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routine_steps')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  return { data, error };
}

export async function deleteRoutineStep(id: string): Promise<ServiceResponse<RoutineStep>> {
  if (!canUseSupabaseData()) {
    const rows = readLocal<RoutineStep>(DEMO_ROUTINE_STEPS_KEY);
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) {
      return { data: null, error: buildMockPostgrestError('Routine step not found.') };
    }
    const [removed] = rows.splice(idx, 1);
    writeLocal(DEMO_ROUTINE_STEPS_KEY, rows);
    return { data: removed, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routine_steps')
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  return { data, error };
}

export async function upsertRoutineLog(input: {
  routineId: string;
  date: string;
  completed: boolean;
  mode?: RoutineLog['mode'];
}): Promise<ServiceResponse<RoutineLog>> {
  const sessionUserId = getSessionUserId();
  if (!sessionUserId) {
    return { data: null, error: buildMockPostgrestError('No active user session.') };
  }

  if (!canUseSupabaseData()) {
    // We intentionally skip local routine log persistence for now.
    // Routine completion can be derived from step completion in demo mode.
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const payload = {
    routine_id: input.routineId,
    user_id: sessionUserId,
    date: input.date,
    completed: input.completed,
    completed_at: input.completed ? new Date().toISOString() : null,
    mode: input.mode ?? 'normal',
  };

  const { data, error } = await (supabase as any)
    .from('routine_logs')
    .upsert(payload, { onConflict: 'routine_id,user_id,date' })
    .select('*')
    .single();

  return { data, error };
}

export async function listRoutineLogsForRange(input: {
  dateFrom: string;
  dateTo: string;
}): Promise<ServiceResponse<RoutineLog[]>> {
  const sessionUserId = getSessionUserId();
  if (!sessionUserId) {
    return { data: [], error: null };
  }

  if (!canUseSupabaseData()) {
    // Demo-mode routine logs are not persisted yet.
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('routine_logs')
    .select('*')
    .eq('user_id', sessionUserId)
    .gte('date', input.dateFrom)
    .lte('date', input.dateTo)
    .order('date', { ascending: true });

  return { data, error };
}
