"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertEnvironmentAudit = insertEnvironmentAudit;
exports.listEnvironmentAuditsForEntity = listEnvironmentAuditsForEntity;
const supabaseClient_1 = require("../lib/supabaseClient");
const environmentSchema_1 = require("../features/environment/environmentSchema");
async function insertEnvironmentAudit(input) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: null, error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    const payload = {
        user_id: input.userId,
        goal_id: input.goalId ?? null,
        habit_id: input.habitId ?? null,
        entity_type: input.goalId ? 'goal' : 'habit',
        audit_source: input.auditSource ?? 'manual_edit',
        score_before: input.scoreBefore ?? null,
        score_after: input.scoreAfter ?? null,
        risk_tags: input.riskTags ?? [],
        before_state: (0, environmentSchema_1.environmentContextToJson)(input.beforeState ?? null),
        after_state: (0, environmentSchema_1.environmentContextToJson)(input.afterState ?? null),
    };
    return supabase
        .from('environment_audits')
        .insert(payload)
        .select()
        .single();
}
async function listEnvironmentAuditsForEntity(input) {
    if (!(0, supabaseClient_1.canUseSupabaseData)()) {
        return { data: [], error: null };
    }
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    let query = supabase.from('environment_audits').select('*').order('created_at', { ascending: false });
    if (input.goalId) {
        query = query.eq('goal_id', input.goalId);
    }
    if (input.habitId) {
        query = query.eq('habit_id', input.habitId);
    }
    return query.returns();
}
