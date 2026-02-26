import type { PostgrestError } from '@supabase/supabase-js';
import type { GoalRecommendedAction } from '../features/goals/executionTypes';
import { computeGoalHealth, type GoalHealthResult } from '../features/goals/goalHealth';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { updateGoal } from './goals';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];
type GoalHealthSnapshotRow = Database['public']['Tables']['goal_health_snapshots']['Row'];
type GoalAdaptationRow = Database['public']['Tables']['goal_adaptations']['Row'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

function buildFrictionTagsFromGoal(goal: GoalRow): string[] {
  const notes = (goal.progress_notes ?? '').toLowerCase();
  return ['stuck', 'unclear', 'overwhelmed'].filter((tag) => notes.includes(tag));
}

function buildGoalEffortSignals(steps: StepRow[]): { effortEventsLast14Days: number; outcomeUpdatesLast14Days: number } {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const outcomeUpdatesLast14Days = steps.filter((step) => {
    if (!step.completed_at) {
      return false;
    }

    const completedTime = new Date(step.completed_at).valueOf();
    return Number.isFinite(completedTime) && completedTime >= fourteenDaysAgo;
  }).length;

  const effortEventsLast14Days = steps.filter((step) => {
    const createdTime = new Date(step.created_at).valueOf();
    if (Number.isFinite(createdTime) && createdTime >= fourteenDaysAgo) {
      return true;
    }

    if (!step.completed_at) {
      return false;
    }

    const completedTime = new Date(step.completed_at).valueOf();
    return Number.isFinite(completedTime) && completedTime >= fourteenDaysAgo;
  }).length;

  return {
    effortEventsLast14Days,
    outcomeUpdatesLast14Days,
  };
}

export function evaluateGoalHealthFromSignals(goal: GoalRow, steps: StepRow[]): GoalHealthResult {
  const signals = buildGoalEffortSignals(steps);

  return computeGoalHealth({
    ...signals,
    frictionTagsLast14Days: buildFrictionTagsFromGoal(goal),
    planQualityScore: goal.plan_quality_score,
    targetDate: goal.target_date,
  });
}

export async function recordGoalHealthSnapshot(
  goal: GoalRow,
  health: GoalHealthResult,
): Promise<ServiceResponse<GoalHealthSnapshotRow>> {
  const payload: Database['public']['Tables']['goal_health_snapshots']['Insert'] = {
    goal_id: goal.id,
    user_id: goal.user_id,
    health_state: health.healthState,
    risk_reason: health.primaryRiskReason,
    recommended_action: health.recommendedNextAction,
    signals: health.explainSignals,
  };

  if (!canUseSupabaseData()) {
    const mock: GoalHealthSnapshotRow = {
      id: crypto.randomUUID(),
      goal_id: payload.goal_id,
      user_id: payload.user_id,
      captured_at: new Date().toISOString(),
      health_state: payload.health_state,
      risk_reason: payload.risk_reason ?? null,
      recommended_action: payload.recommended_action ?? null,
      signals: payload.signals ?? null,
    };

    return { data: mock, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goal_health_snapshots')
    .insert(payload)
    .select('*')
    .single<GoalHealthSnapshotRow>();

  return { data: data ?? null, error };
}

function appendTimingNote(existing: string | null, addition: string): string {
  if (!existing || existing.trim().length === 0) {
    return addition;
  }

  return `${existing.trim()} • ${addition}`;
}

function buildAdaptationPatch(goal: GoalRow, action: GoalRecommendedAction): Database['public']['Tables']['goals']['Update'] {
  switch (action) {
    case 'scale_scope':
      return {
        timing_notes: appendTimingNote(goal.timing_notes, 'Adaptation: scaled scope to restore momentum.'),
      };
    case 'reduce_workload':
      return {
        weekly_workload_target: Math.max(1, (goal.weekly_workload_target ?? 2) - 1),
        timing_notes: appendTimingNote(goal.timing_notes, 'Adaptation: reduced weekly workload target.'),
      };
    case 'switch_to_planning_habit':
      return {
        priority_level: 'later',
        status_tag: 'at_risk',
        timing_notes: appendTimingNote(goal.timing_notes, 'Adaptation: switched to planning habit for reactivation.'),
      };
    case 'defer_priority':
      return {
        priority_level: 'later',
        timing_notes: appendTimingNote(goal.timing_notes, 'Adaptation: deferred priority to reduce pressure.'),
      };
    case 'clarify_success_metric':
      return {
        progress_notes: `${goal.progress_notes ? `${goal.progress_notes}\n` : ''}Clarify success metric: add a measurable weekly indicator.`,
      };
    case 'keep_plan':
    default:
      return {};
  }
}

export async function applyGoalAdaptation(params: {
  goal: GoalRow;
  action: GoalRecommendedAction;
  source?: 'ai_recommendation' | 'manual';
}): Promise<ServiceResponse<{ adaptation: GoalAdaptationRow; updatedGoal: GoalRow }>> {
  const { goal, action, source = 'manual' } = params;
  const patch = buildAdaptationPatch(goal, action);
  const { data: updatedGoal, error: updateError } = await updateGoal(goal.id, patch);

  if (updateError || !updatedGoal) {
    return { data: null, error: updateError ?? new Error('Failed to update goal during adaptation') };
  }

  const adaptationInsert: Database['public']['Tables']['goal_adaptations']['Insert'] = {
    goal_id: goal.id,
    user_id: goal.user_id,
    action_type: action,
    before_state: goal,
    after_state: updatedGoal,
    source,
  };

  if (!canUseSupabaseData()) {
    const mockAdaptation: GoalAdaptationRow = {
      id: crypto.randomUUID(),
      goal_id: goal.id,
      user_id: goal.user_id,
      action_type: action,
      before_state: goal,
      after_state: updatedGoal,
      source,
      created_at: new Date().toISOString(),
    };

    return { data: { adaptation: mockAdaptation, updatedGoal }, error: null };
  }

  const supabase = getSupabaseClient();
  const { data: adaptation, error: adaptationError } = await supabase
    .from('goal_adaptations')
    .insert(adaptationInsert)
    .select('*')
    .single<GoalAdaptationRow>();

  if (adaptationError || !adaptation) {
    return { data: null, error: adaptationError ?? new Error('Failed to record adaptation') };
  }

  return { data: { adaptation, updatedGoal }, error: null };
}
