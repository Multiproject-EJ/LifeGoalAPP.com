import { getSupabaseClient } from '../lib/supabaseClient';

export type HabitAnalysisGoalType = 'reduce' | 'increase' | 'replace' | 'stabilize';
export type HabitAnalysisStatus = 'draft' | 'active' | 'completed' | 'archived';
export type HabitDiagnosis = 'under' | 'over' | 'swing';
export type TrafficLight = 'green' | 'yellow' | 'red';

export type HabitAnalysisSession = {
  id: string;
  user_id: string;
  habit_id: string;
  status: HabitAnalysisStatus;
  goal_type: HabitAnalysisGoalType;
  target_cadence: string | null;
  last_logged_day_index: number;
  current_step: number;
  created_at: string;
  updated_at: string;
};

export type HabitDesireInput = {
  desireKey: string;
  isPrimary: boolean;
  customLabel?: string | null;
};

export type HabitCostInput = {
  underPainTags: string[];
  overPainTags: string[];
  subscriptionFeeTags: string[];
  notes?: string;
};

export type HabitRangeInput = {
  unit: string;
  minValue?: number | null;
  maxValue?: number | null;
  tooLittleFeelsLike?: string;
  tooMuchCostsLike?: string;
};

export type HabitProtocolInput = {
  ifTrigger?: string;
  thenAction?: string;
  durationMinutes?: number | null;
  guardrail?: string;
  friction?: string;
  ease?: string;
  replacementReward?: string;
};

export type HabitReadinessInput = {
  desireMet: number;
  costReduced: number;
  badDayOk: number;
  reboundSafe: number;
  identityFit: number;
  trafficLight: TrafficLight;
};

export type HabitExperimentDayInput = {
  dayIndex: number;
  date: string;
  followedProtocol: boolean | null;
  underPain: number | null;
  overPain: number | null;
  netEffect: 'better' | 'same' | 'worse' | null;
  note?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || (error.message?.includes('does not exist') ?? false);
}

export async function getOrCreateHabitAnalysisSession(params: {
  userId: string;
  habitId: string;
  goalType?: HabitAnalysisGoalType;
}): Promise<{ session: HabitAnalysisSession | null; error: string | null; tableMissing?: boolean }> {
  const { userId, habitId, goalType = 'stabilize' } = params;
  const supabase = getUntypedSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('habit_analysis_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .in('status', ['draft', 'active'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    if (isMissingTableError(fetchError)) {
      return { session: null, error: null, tableMissing: true };
    }
    return { session: null, error: fetchError.message };
  }

  if (existing) {
    return { session: existing as HabitAnalysisSession, error: null };
  }

  const { data: created, error: createError } = await supabase
    .from('habit_analysis_sessions')
    .insert({
      user_id: userId,
      habit_id: habitId,
      goal_type: goalType,
      status: 'draft',
    })
    .select('*')
    .single();

  if (createError) {
    if (isMissingTableError(createError)) {
      return { session: null, error: null, tableMissing: true };
    }
    return { session: null, error: createError.message };
  }

  return { session: created as HabitAnalysisSession, error: null };
}

export async function saveHabitAnalysisDesires(sessionId: string, desires: HabitDesireInput[]): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const normalized = desires
    .map((entry) => ({
      session_id: sessionId,
      desire_key: entry.desireKey,
      is_primary: entry.isPrimary,
      custom_label: entry.customLabel ?? null,
    }))
    .slice(0, 2);

  const { error: deleteError } = await supabase
    .from('habit_desires')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (normalized.length === 0) {
    return { error: null };
  }

  const { error } = await supabase.from('habit_desires').insert(normalized);
  return { error: error?.message ?? null };
}

export async function saveHabitAnalysisCosts(sessionId: string, costs: HabitCostInput): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_costs').upsert(
    {
      session_id: sessionId,
      under_pain_tags: costs.underPainTags,
      over_pain_tags: costs.overPainTags,
      subscription_fee_tags: costs.subscriptionFeeTags,
      notes: costs.notes?.trim() || null,
    },
    { onConflict: 'session_id' },
  );

  return { error: error?.message ?? null };
}

export async function saveHabitAnalysisRange(sessionId: string, input: HabitRangeInput): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_right_size_ranges').upsert(
    {
      session_id: sessionId,
      unit: input.unit,
      min_value: input.minValue ?? null,
      max_value: input.maxValue ?? null,
      too_little_feels_like: input.tooLittleFeelsLike?.trim() || null,
      too_much_costs_like: input.tooMuchCostsLike?.trim() || null,
    },
    { onConflict: 'session_id' },
  );

  return { error: error?.message ?? null };
}

export async function saveHabitAnalysisProtocol(sessionId: string, input: HabitProtocolInput): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();

  const { error: deactivateError } = await supabase
    .from('habit_protocols')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  if (deactivateError) {
    return { error: deactivateError.message };
  }

  const { error } = await supabase.from('habit_protocols').insert({
    session_id: sessionId,
    if_trigger: input.ifTrigger?.trim() || null,
    then_action: input.thenAction?.trim() || null,
    duration_minutes: input.durationMinutes ?? null,
    guardrail: input.guardrail?.trim() || null,
    friction: input.friction?.trim() || null,
    ease: input.ease?.trim() || null,
    replacement_reward: input.replacementReward?.trim() || null,
    is_active: true,
  });

  return { error: error?.message ?? null };
}

export async function saveHabitDiagnosis(sessionId: string, diagnosis: HabitDiagnosis): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_diagnoses').upsert(
    {
      session_id: sessionId,
      diagnosis,
    },
    { onConflict: 'session_id' },
  );

  return { error: error?.message ?? null };
}

export async function saveHabitReadiness(sessionId: string, readiness: HabitReadinessInput): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_readiness_scores').upsert(
    {
      session_id: sessionId,
      desire_met: readiness.desireMet,
      cost_reduced: readiness.costReduced,
      bad_day_ok: readiness.badDayOk,
      rebound_safe: readiness.reboundSafe,
      identity_fit: readiness.identityFit,
      traffic_light: readiness.trafficLight,
    },
    { onConflict: 'session_id' },
  );

  return { error: error?.message ?? null };
}

export async function startHabitExperiment(sessionId: string): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();

  const startDate = new Date();
  const rows = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      session_id: sessionId,
      day_index: index + 1,
      date: date.toISOString().slice(0, 10),
    };
  });

  const { error: upsertError } = await supabase
    .from('habit_experiment_days')
    .upsert(rows, { onConflict: 'session_id,day_index' });

  if (upsertError) {
    return { error: upsertError.message };
  }

  const { error: statusError } = await supabase
    .from('habit_analysis_sessions')
    .update({ status: 'active', last_logged_day_index: 0 })
    .eq('id', sessionId);

  return { error: statusError?.message ?? null };
}

export async function logHabitExperimentDay(sessionId: string, input: HabitExperimentDayInput): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const safeDayIndex = clamp(Math.round(input.dayIndex), 1, 7);
  const safeUnderPain = input.underPain === null ? null : clamp(Math.round(input.underPain), 0, 3);
  const safeOverPain = input.overPain === null ? null : clamp(Math.round(input.overPain), 0, 3);

  const { error } = await supabase.from('habit_experiment_days').upsert(
    {
      session_id: sessionId,
      day_index: safeDayIndex,
      date: input.date,
      followed_protocol: input.followedProtocol,
      under_pain: safeUnderPain,
      over_pain: safeOverPain,
      net_effect: input.netEffect,
      note: input.note?.trim() || null,
    },
    { onConflict: 'session_id,day_index' },
  );

  if (error) {
    return { error: error.message };
  }

  const { error: sessionError } = await supabase
    .from('habit_analysis_sessions')
    .update({ last_logged_day_index: safeDayIndex })
    .eq('id', sessionId)
    .lt('last_logged_day_index', safeDayIndex);

  return { error: sessionError?.message ?? null };
}

export async function listHabitExperimentDays(sessionId: string): Promise<{ days: HabitExperimentDayInput[]; error: string | null }> {
  const supabase = getUntypedSupabase();

  const { data, error } = await supabase
    .from('habit_experiment_days')
    .select('day_index, date, followed_protocol, under_pain, over_pain, net_effect, note')
    .eq('session_id', sessionId)
    .order('day_index', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { days: [], error: null };
    }
    return { days: [], error: error.message };
  }

  return {
    days: ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
      dayIndex: Number(row.day_index ?? 0),
      date: String(row.date ?? ''),
      followedProtocol: typeof row.followed_protocol === 'boolean' ? row.followed_protocol : null,
      underPain: typeof row.under_pain === 'number' ? row.under_pain : null,
      overPain: typeof row.over_pain === 'number' ? row.over_pain : null,
      netEffect:
        row.net_effect === 'better' || row.net_effect === 'same' || row.net_effect === 'worse'
          ? row.net_effect
          : null,
      note: typeof row.note === 'string' ? row.note : undefined,
    })),
    error: null,
  };
}

export async function saveHabitAnalysisProgress(sessionId: string, step: number): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const safeStep = clamp(Math.round(step), 0, 4);

  const { error } = await supabase
    .from('habit_analysis_sessions')
    .update({ current_step: safeStep })
    .eq('id', sessionId);

  return { error: error?.message ?? null };
}
