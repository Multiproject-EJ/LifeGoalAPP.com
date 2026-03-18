import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
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
  DEMO_USER_ID,
  addDemoGoal,
  getDemoGoals,
  removeDemoGoal,
  updateDemoGoal,
} from './demoData';
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
    return { data: getDemoGoals(DEMO_USER_ID), error: null };
  }

  const supabase = getSupabaseClient();
  return supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<GoalRow[]>();
}

export async function insertGoal(payload: GoalInsert): Promise<ServiceResponse<GoalRow>> {
  const payloadWithQuality = {
    ...payload,
    ...buildPlanQualityPatch(payload),
    ...buildGoalEnvironmentPatch(payload),
  };

  if (!canUseSupabaseData()) {
    return { data: addDemoGoal(payloadWithQuality), error: null };
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

  return { data: data ?? null, error };
}

export async function updateGoal(id: string, payload: GoalUpdate): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const existingGoal = getDemoGoals(DEMO_USER_ID).find((goal) => goal.id === id);
    const mergedGoalForScoring = {
      ...existingGoal,
      ...payload,
    } as GoalRow;

    const record = updateDemoGoal(id, {
      ...payload,
      ...buildPlanQualityPatch(mergedGoalForScoring),
      ...buildGoalEnvironmentPatch(mergedGoalForScoring),
    });
    return { data: record, error: null };
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

  return { data: data ?? null, error };
}

export async function deleteGoal(id: string): Promise<ServiceResponse<GoalRow>> {
  if (!canUseSupabaseData()) {
    const removed = removeDemoGoal(id);
    return { data: removed, error: null };
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

  return { data: data ?? null, error };
}
