import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { canUseSupabaseData, getActiveSupabaseSession, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
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

type RoutinesDatabaseExtension = Omit<Database, 'public'> & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      routines: {
        Row: Routine;
        Insert: Omit<Routine, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Routine, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_steps: {
        Row: RoutineStep;
        Insert: Omit<RoutineStep, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<RoutineStep, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<RoutineStep, 'id' | 'routine_id' | 'habit_id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_logs: {
        Row: RoutineLog;
        Insert: Omit<RoutineLog, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<RoutineLog, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<RoutineLog, 'id' | 'routine_id' | 'user_id' | 'date' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
};

type RoutinesSupabaseClient = SupabaseClient<Database & RoutinesDatabaseExtension>;

function getRoutinesSupabaseClient(): RoutinesSupabaseClient {
  return getSupabaseClient() as unknown as RoutinesSupabaseClient;
}

const DEMO_ROUTINES_KEY = 'lifegoal-demo-routines-v1';
const DEMO_ROUTINE_STEPS_KEY = 'lifegoal-demo-routine-steps-v1';
const DEMO_ROUTINE_LOGS_KEY = 'lifegoal-demo-routine-logs-v1';

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

  const supabase = getRoutinesSupabaseClient();
  let query = supabase
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
    .from('routines')
    .insert({
      user_id: sessionUserId,
      title: input.title,
      description: input.description ?? null,
      schedule: input.schedule ?? { mode: 'daily' },
      anchor_time: input.anchor_time ?? null,
      domain_key: input.domain_key ?? null,
      is_active: input.is_active ?? true,
    } as unknown as never)
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
    .from('routines')
    .update(input as unknown as never)
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
    .from('routine_steps')
    .insert({
      routine_id: input.routine_id,
      habit_id: input.habit_id,
      step_order: input.step_order ?? 0,
      required: input.required ?? true,
      display_mode: input.display_mode ?? 'inside_routine_only',
      fallback_step: input.fallback_step ?? false,
    } as unknown as never)
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
    .from('routine_steps')
    .update(input as unknown as never)
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

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
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
    const existing = readLocal<RoutineLog>(DEMO_ROUTINE_LOGS_KEY);
    const idx = existing.findIndex(
      (row) =>
        row.routine_id === input.routineId &&
        row.user_id === sessionUserId &&
        row.date === input.date,
    );
    const nextRow: RoutineLog = {
      id: idx >= 0 ? existing[idx].id : localId('routine-log'),
      routine_id: input.routineId,
      user_id: sessionUserId,
      date: input.date,
      completed: input.completed,
      completed_at: input.completed ? new Date().toISOString() : null,
      mode: input.mode ?? 'normal',
      created_at: idx >= 0 ? existing[idx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) {
      existing[idx] = nextRow;
    } else {
      existing.push(nextRow);
    }
    writeLocal(DEMO_ROUTINE_LOGS_KEY, existing);
    return { data: nextRow, error: null };
  }

  const supabase = getRoutinesSupabaseClient();
  const payload = {
    routine_id: input.routineId,
    user_id: sessionUserId,
    date: input.date,
    completed: input.completed,
    completed_at: input.completed ? new Date().toISOString() : null,
    mode: input.mode ?? 'normal',
  };

  const { data, error } = await supabase
    .from('routine_logs')
    .upsert(payload as unknown as never, { onConflict: 'routine_id,user_id,date' })
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
    const rows = readLocal<RoutineLog>(DEMO_ROUTINE_LOGS_KEY)
      .filter((row) => row.user_id === sessionUserId)
      .filter((row) => row.date >= input.dateFrom && row.date <= input.dateTo)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { data: rows, error: null };
  }

  const supabase = getRoutinesSupabaseClient();
  const { data, error } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', sessionUserId)
    .gte('date', input.dateFrom)
    .lte('date', input.dateTo)
    .order('date', { ascending: true });

  return { data, error };
}
