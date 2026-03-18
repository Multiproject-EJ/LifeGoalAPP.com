import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import type { EnvironmentRiskTag } from '../features/environment/environmentRecommendations';
import type { EnvironmentContextV1 } from '../features/environment/environmentSchema';
import { environmentContextToJson } from '../features/environment/environmentSchema';

export type EnvironmentAuditRow = Database['public']['Tables']['environment_audits']['Row'];
export type EnvironmentAuditInsert = Database['public']['Tables']['environment_audits']['Insert'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function insertEnvironmentAudit(input: {
  userId: string;
  goalId?: string | null;
  habitId?: string | null;
  auditSource?: EnvironmentAuditInsert['audit_source'];
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  riskTags?: EnvironmentRiskTag[];
  beforeState?: EnvironmentContextV1 | null;
  afterState?: EnvironmentContextV1 | null;
}): Promise<ServiceResponse<EnvironmentAuditRow>> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const payload: EnvironmentAuditInsert = {
    user_id: input.userId,
    goal_id: input.goalId ?? null,
    habit_id: input.habitId ?? null,
    entity_type: input.goalId ? 'goal' : 'habit',
    audit_source: input.auditSource ?? 'manual_edit',
    score_before: input.scoreBefore ?? null,
    score_after: input.scoreAfter ?? null,
    risk_tags: input.riskTags ?? [],
    before_state: environmentContextToJson(input.beforeState ?? null),
    after_state: environmentContextToJson(input.afterState ?? null),
  };

  return supabase
    .from('environment_audits')
    .insert(payload)
    .select()
    .single();
}

export async function listEnvironmentAuditsForEntity(input: {
  goalId?: string;
  habitId?: string;
}): Promise<ServiceResponse<EnvironmentAuditRow[]>> {
  if (!canUseSupabaseData()) {
    return { data: [], error: null };
  }

  const supabase = getSupabaseClient();
  let query = supabase.from('environment_audits').select('*').order('created_at', { ascending: false });

  if (input.goalId) {
    query = query.eq('goal_id', input.goalId);
  }

  if (input.habitId) {
    query = query.eq('habit_id', input.habitId);
  }

  return query.returns<EnvironmentAuditRow[]>();
}
