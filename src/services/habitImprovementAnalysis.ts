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
  completed_at: string | null;
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
  protocolDifficulty: number | null;
  urgeLevel: number | null;
  energyLevel: number | null;
  confidenceTomorrow: number | null;
  stressLevel: number | null;
  underPain: number | null;
  overPain: number | null;
  netEffect: 'better' | 'same' | 'worse' | null;
  winNote?: string;
  note?: string;
};


export type HabitAnalysisMobileDraft = {
  dayIndex: number;
  followedProtocol: boolean | null;
  protocolDifficulty: number | null;
  urgeLevel: number | null;
  energyLevel: number | null;
  confidenceTomorrow: number | null;
  stressLevel: number | null;
  underPain: number;
  overPain: number;
  netEffect: 'better' | 'same' | 'worse';
  winNote: string;
  note: string;
};

export type HabitAnalysisMobileDraftState = {
  draft: HabitAnalysisMobileDraft | null;
  savedAt: string | null;
};

export type HabitAnalysisCompletionReflection = {
  biggestWin: string;
  hardestMoment: string;
  nextTweak: string;
};

export type HabitAnalysisCompletionSummary = {
  adherenceRate: number;
  betterDays: number;
  sameDays: number;
  worseDays: number;
  averageStressLevel: number | null;
  averageConfidenceTomorrow: number | null;
  averageUrgeLevel: number | null;
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

function normalizeNetEffect(value: unknown): 'better' | 'same' | 'worse' {
  return value === 'better' || value === 'same' || value === 'worse' ? value : 'same';
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
  const safeProtocolDifficulty =
    input.protocolDifficulty === null ? null : clamp(Math.round(input.protocolDifficulty), 1, 5);
  const safeEnergyLevel =
    input.energyLevel === null ? null : clamp(Math.round(input.energyLevel), 1, 5);
  const safeConfidenceTomorrow =
    input.confidenceTomorrow === null ? null : clamp(Math.round(input.confidenceTomorrow), 1, 5);
  const safeStressLevel =
    input.stressLevel === null ? null : clamp(Math.round(input.stressLevel), 1, 5);
  const safeUnderPain = input.underPain === null ? null : clamp(Math.round(input.underPain), 0, 3);
  const safeOverPain = input.overPain === null ? null : clamp(Math.round(input.overPain), 0, 3);
  const safeNetEffect = normalizeNetEffect(input.netEffect);
  const safeWinNote = input.winNote?.trim().slice(0, 160) ?? '';

  if (safeNetEffect === 'better' && !safeWinNote) {
    return { error: 'Add a quick win when net effect is better.' };
  }

  const { error } = await supabase.from('habit_experiment_days').upsert(
    {
      session_id: sessionId,
      day_index: safeDayIndex,
      date: input.date,
      followed_protocol: input.followedProtocol,
      protocol_difficulty: safeProtocolDifficulty,
      urge_level: input.urgeLevel === null ? null : clamp(Math.round(input.urgeLevel), 1, 5),
      energy_level: safeEnergyLevel,
      confidence_tomorrow: safeConfidenceTomorrow,
      stress_level: safeStressLevel,
      under_pain: safeUnderPain,
      over_pain: safeOverPain,
      net_effect: safeNetEffect,
      win_note: safeWinNote || null,
      note: input.note?.trim() || null,
    },
    { onConflict: 'session_id,day_index' },
  );

  if (error) {
    return { error: error.message };
  }

  const isCompletionDay = safeDayIndex === 7;
  const sessionUpdate: Record<string, unknown> = {
    last_logged_day_index: safeDayIndex,
  };

  if (isCompletionDay) {
    sessionUpdate.status = 'completed';
    sessionUpdate.completed_at = new Date().toISOString();
    sessionUpdate.mobile_draft = null;
  }

  const { error: sessionError } = await supabase
    .from('habit_analysis_sessions')
    .update(sessionUpdate)
    .eq('id', sessionId)
    .lt('last_logged_day_index', safeDayIndex);

  return { error: sessionError?.message ?? null };
}

export async function listHabitExperimentDays(sessionId: string): Promise<{ days: HabitExperimentDayInput[]; error: string | null }> {
  const supabase = getUntypedSupabase();

  const { data, error } = await supabase
    .from('habit_experiment_days')
    .select('day_index, date, followed_protocol, protocol_difficulty, urge_level, energy_level, confidence_tomorrow, stress_level, under_pain, over_pain, net_effect, win_note, note')
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
      protocolDifficulty: typeof row.protocol_difficulty === 'number' ? row.protocol_difficulty : null,
      urgeLevel: typeof row.urge_level === 'number' ? row.urge_level : null,
      energyLevel: typeof row.energy_level === 'number' ? row.energy_level : null,
      confidenceTomorrow: typeof row.confidence_tomorrow === 'number' ? row.confidence_tomorrow : null,
      stressLevel: typeof row.stress_level === 'number' ? row.stress_level : null,
      underPain: typeof row.under_pain === 'number' ? row.under_pain : null,
      overPain: typeof row.over_pain === 'number' ? row.over_pain : null,
      netEffect:
        row.net_effect === 'better' || row.net_effect === 'same' || row.net_effect === 'worse'
          ? row.net_effect
          : null,
      winNote: typeof row.win_note === 'string' ? row.win_note : undefined,
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

export async function getHabitAnalysisMobileDraft(sessionId: string): Promise<{ state: HabitAnalysisMobileDraftState; error: string | null }> {
  const supabase = getUntypedSupabase();

  const { data, error } = await supabase
    .from('habit_analysis_sessions')
    .select('mobile_draft, mobile_draft_saved_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { state: { draft: null, savedAt: null }, error: null };
    }
    return { state: { draft: null, savedAt: null }, error: error.message };
  }

  const rowData = (data as { mobile_draft?: unknown; mobile_draft_saved_at?: unknown } | null) ?? null;
  const rawDraft = rowData?.mobile_draft;
  const savedAt = typeof rowData?.mobile_draft_saved_at === 'string' ? rowData.mobile_draft_saved_at : null;
  if (!rawDraft || typeof rawDraft !== 'object' || Array.isArray(rawDraft)) {
    return { state: { draft: null, savedAt: null }, error: null };
  }

  const row = rawDraft as Record<string, unknown>;
  const dayIndex = clamp(Math.round(Number(row.dayIndex ?? 1)), 1, 7);
  const protocolDifficulty =
    row.protocolDifficulty === null || row.protocolDifficulty === undefined
      ? null
      : clamp(Math.round(Number(row.protocolDifficulty)), 1, 5);
  const energyLevel =
    row.energyLevel === null || row.energyLevel === undefined
      ? null
      : clamp(Math.round(Number(row.energyLevel)), 1, 5);
  const urgeLevel =
    row.urgeLevel === null || row.urgeLevel === undefined
      ? null
      : clamp(Math.round(Number(row.urgeLevel)), 1, 5);
  const confidenceTomorrow =
    row.confidenceTomorrow === null || row.confidenceTomorrow === undefined
      ? null
      : clamp(Math.round(Number(row.confidenceTomorrow)), 1, 5);
  const stressLevel =
    row.stressLevel === null || row.stressLevel === undefined
      ? null
      : clamp(Math.round(Number(row.stressLevel)), 1, 5);

  const netEffect = normalizeNetEffect(row.netEffect);

  return {
    state: {
      savedAt,
      draft: {
      dayIndex,
      followedProtocol: typeof row.followedProtocol === 'boolean' ? row.followedProtocol : null,
      protocolDifficulty: Number.isFinite(protocolDifficulty) ? protocolDifficulty : null,
      urgeLevel: Number.isFinite(urgeLevel) ? urgeLevel : null,
      energyLevel: Number.isFinite(energyLevel) ? energyLevel : null,
      confidenceTomorrow: Number.isFinite(confidenceTomorrow) ? confidenceTomorrow : null,
      stressLevel: Number.isFinite(stressLevel) ? stressLevel : null,
      underPain: clamp(Math.round(Number(row.underPain ?? 0)), 0, 3),
      overPain: clamp(Math.round(Number(row.overPain ?? 0)), 0, 3),
      netEffect,
      winNote: typeof row.winNote === 'string' ? row.winNote.slice(0, 160) : '',
      note: typeof row.note === 'string' ? row.note.slice(0, 240) : '',
      },
    },
    error: null,
  };
}

export async function saveHabitAnalysisMobileDraft(
  sessionId: string,
  draft: HabitAnalysisMobileDraft | null,
): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();

  if (draft && !Number.isFinite(draft.dayIndex)) {
    return { error: 'Draft day is invalid. Pick a day between 1 and 7.' };
  }

  if (draft) {
    const { data: sessionData, error: sessionError } = await supabase
      .from('habit_analysis_sessions')
      .select('last_logged_day_index')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      return { error: sessionError.message };
    }

    const lastLoggedDayIndex = Number((sessionData as { last_logged_day_index?: unknown } | null)?.last_logged_day_index ?? 0);
    if (draft.dayIndex > Math.min(lastLoggedDayIndex + 1, 7)) {
      return { error: 'Please finish earlier experiment days before saving this draft.' };
    }
  }

  const normalizedDraft =
    draft === null
      ? null
      : {
          dayIndex: clamp(Math.round(draft.dayIndex), 1, 7),
          followedProtocol: draft.followedProtocol,
          protocolDifficulty:
            draft.protocolDifficulty === null ? null : clamp(Math.round(draft.protocolDifficulty), 1, 5),
          urgeLevel:
            draft.urgeLevel === null ? null : clamp(Math.round(draft.urgeLevel), 1, 5),
          energyLevel:
            draft.energyLevel === null ? null : clamp(Math.round(draft.energyLevel), 1, 5),
          confidenceTomorrow:
            draft.confidenceTomorrow === null ? null : clamp(Math.round(draft.confidenceTomorrow), 1, 5),
          stressLevel:
            draft.stressLevel === null ? null : clamp(Math.round(draft.stressLevel), 1, 5),
          underPain: clamp(Math.round(draft.underPain), 0, 3),
          overPain: clamp(Math.round(draft.overPain), 0, 3),
          netEffect: normalizeNetEffect(draft.netEffect),
          winNote: draft.winNote.trim().slice(0, 160),
          note: draft.note.trim().slice(0, 240),
        };

  if (normalizedDraft && normalizedDraft.netEffect === 'better' && !normalizedDraft.winNote) {
    return { error: 'Add a quick win before saving a better-day draft.' };
  }

  const { error } = await supabase
    .from('habit_analysis_sessions')
    .update({
      mobile_draft: normalizedDraft,
      mobile_draft_saved_at: normalizedDraft ? new Date().toISOString() : null,
    })
    .eq('id', sessionId);

  return { error: error?.message ?? null };
}

export async function getHabitAnalysisCompletionReflection(
  sessionId: string,
): Promise<{ reflection: HabitAnalysisCompletionReflection | null; error: string | null }> {
  const supabase = getUntypedSupabase();

  const { data, error } = await supabase
    .from('habit_analysis_sessions')
    .select('completion_reflection')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { reflection: null, error: null };
    }
    return { reflection: null, error: error.message };
  }

  const reflection = (data as { completion_reflection?: unknown } | null)?.completion_reflection;
  if (!reflection || typeof reflection !== 'object' || Array.isArray(reflection)) {
    return { reflection: null, error: null };
  }

  const parsedReflection = reflection as Record<string, unknown>;
  return {
    reflection: {
      biggestWin:
        typeof parsedReflection.biggestWin === 'string'
          ? parsedReflection.biggestWin.slice(0, 160)
          : '',
      hardestMoment:
        typeof parsedReflection.hardestMoment === 'string'
          ? parsedReflection.hardestMoment.slice(0, 240)
          : '',
      nextTweak:
        typeof parsedReflection.nextTweak === 'string'
          ? parsedReflection.nextTweak.slice(0, 160)
          : '',
    },
    error: null,
  };
}

export async function saveHabitAnalysisCompletionReflection(
  sessionId: string,
  reflection: HabitAnalysisCompletionReflection,
): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();
  const nextTweak = reflection.nextTweak.trim();

  if (!nextTweak) {
    return { error: 'Add one next tweak before finishing your 7-day experiment.' };
  }

  const { error } = await supabase
    .from('habit_analysis_sessions')
    .update({
      completion_reflection: {
        biggestWin: reflection.biggestWin.trim().slice(0, 160),
        hardestMoment: reflection.hardestMoment.trim().slice(0, 240),
        nextTweak: nextTweak.slice(0, 160),
      },
    })
    .eq('id', sessionId);

  return { error: error?.message ?? null };
}

export async function saveHabitAnalysisCompletionSummary(
  sessionId: string,
  summary: HabitAnalysisCompletionSummary,
): Promise<{ error: string | null }> {
  const supabase = getUntypedSupabase();

  const adherenceRate = clamp(Number(summary.adherenceRate) || 0, 0, 100);
  const betterDays = clamp(Math.round(Number(summary.betterDays) || 0), 0, 7);
  const sameDays = clamp(Math.round(Number(summary.sameDays) || 0), 0, 7);
  const worseDays = clamp(Math.round(Number(summary.worseDays) || 0), 0, 7);
  const effectDays = betterDays + sameDays + worseDays;

  if (effectDays === 0) {
    return { error: 'Complete at least one daily check-in before saving completion summary.' };
  }

  if (effectDays > 7) {
    return { error: 'Completion summary is invalid: too many logged days.' };
  }

  const normalizeAverage = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return clamp(Number(value.toFixed(2)), 1, 5);
  };

  const { error } = await supabase
    .from('habit_analysis_sessions')
    .update({
      completion_summary: {
        adherenceRate: Number(adherenceRate.toFixed(1)),
        betterDays,
        sameDays,
        worseDays,
        averageStressLevel: normalizeAverage(summary.averageStressLevel),
        averageConfidenceTomorrow: normalizeAverage(summary.averageConfidenceTomorrow),
        averageUrgeLevel: normalizeAverage(summary.averageUrgeLevel),
      },
    })
    .eq('id', sessionId);

  return { error: error?.message ?? null };
}
