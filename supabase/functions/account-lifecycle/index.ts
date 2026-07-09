import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AccountLifecycleAction = 'reset' | 'delete';

type ResetTarget = {
  table: string;
  column: string;
};

const RESET_TARGETS: ResetTarget[] = [
  { table: 'ai_coach_messages', column: 'user_id' },
  { table: 'ai_coach_threads', column: 'user_id' },
  { table: 'ai_settings', column: 'user_id' },
  { table: 'annual_reviews', column: 'user_id' },
  { table: 'billing_customers', column: 'user_id' },
  { table: 'billing_entitlements', column: 'user_id' },
  { table: 'billing_subscriptions', column: 'user_id' },
  { table: 'billing_webhook_events', column: 'user_id' },
  { table: 'campaign_live_events', column: 'user_id' },
  { table: 'campaign_participants', column: 'user_id' },
  { table: 'campaigns', column: 'owner_id' },
  { table: 'case_messages', column: 'author_user_id' },
  { table: 'case_thread_reads', column: 'user_id' },
  { table: 'case_threads', column: 'user_id' },
  { table: 'combined_journey_reward_baseline', column: 'user_id' },
  { table: 'combined_journey_reward_claims', column: 'user_id' },
  { table: 'commitment_contract_evaluations', column: 'user_id' },
  { table: 'commitment_contracts', column: 'user_id' },
  { table: 'compass_books', column: 'user_id' },
  { table: 'compass_chapter_states', column: 'user_id' },
  { table: 'compass_state', column: 'user_id' },
  { table: 'conflict_ai_artifacts', column: 'created_by_user_id' },
  { table: 'conflict_ai_messages', column: 'created_by_user_id' },
  { table: 'conflict_ai_runs', column: 'created_by_user_id' },
  { table: 'conflict_invites', column: 'created_by_user_id' },
  { table: 'conflict_invites', column: 'redeemed_by_user_id' },
  { table: 'conflict_participants', column: 'user_id' },
  { table: 'conflict_sessions', column: 'owner_user_id' },
  { table: 'conflict_shared_summaries', column: 'created_by' },
  { table: 'daily_calendar_progress', column: 'user_id' },
  { table: 'daily_calendar_rewards', column: 'user_id' },
  { table: 'daily_challenges', column: 'user_id' },
  { table: 'daily_spin_habit_bonus_claims', column: 'user_id' },
  { table: 'daily_spin_state', column: 'user_id' },
  { table: 'demo_waitlist', column: 'user_id' },
  { table: 'environment_audits', column: 'user_id' },
  { table: 'exercise_logs', column: 'user_id' },
  { table: 'feature_votes', column: 'user_id' },
  { table: 'game_life_intake', column: 'user_id' },
  { table: 'gamification_notifications', column: 'user_id' },
  { table: 'gamification_profiles', column: 'user_id' },
  { table: 'goal_adaptations', column: 'user_id' },
  { table: 'goal_health_snapshots', column: 'user_id' },
  { table: 'goal_snapshots', column: 'user_id' },
  { table: 'habit_analysis_sessions', column: 'user_id' },
  { table: 'habit_challenge_members', column: 'user_id' },
  { table: 'habit_challenges', column: 'owner_id' },
  { table: 'habit_completions', column: 'user_id' },
  { table: 'habit_insights', column: 'user_id' },
  { table: 'habit_links', column: 'user_id' },
  { table: 'habit_logs_v2', column: 'user_id' },
  { table: 'habit_reminders', column: 'user_id' },
  { table: 'habits_v2', column: 'user_id' },
  { table: 'holiday_preferences', column: 'user_id' },
  { table: 'island_run_action_log', column: 'user_id' },
  { table: 'island_run_active_sessions', column: 'user_id' },
  { table: 'island_run_runtime_state', column: 'user_id' },
  { table: 'journal_entries', column: 'user_id' },
  { table: 'life_goal_alerts', column: 'user_id' },
  { table: 'meditation_goals', column: 'user_id' },
  { table: 'meditation_reminders', column: 'user_id' },
  { table: 'meditation_sessions', column: 'user_id' },
  { table: 'personal_records', column: 'user_id' },
  { table: 'personality_tests', column: 'user_id' },
  { table: 'power_up_transactions', column: 'user_id' },
  { table: 'profiles', column: 'user_id' },
  { table: 'project_tasks', column: 'user_id' },
  { table: 'projects', column: 'user_id' },
  { table: 'push_subscriptions', column: 'user_id' },
  { table: 'reminder_action_logs', column: 'user_id' },
  { table: 'reminder_delivery_failures', column: 'user_id' },
  { table: 'routine_logs', column: 'user_id' },
  { table: 'routines', column: 'user_id' },
  { table: 'scheduled_reminders', column: 'user_id' },
  { table: 'spin_history', column: 'user_id' },
  { table: 'telemetry_events', column: 'user_id' },
  { table: 'telemetry_preferences', column: 'user_id' },
  { table: 'theme_cosmetic_entitlements', column: 'user_id' },
  { table: 'tip_of_day_log', column: 'user_id' },
  { table: 'today_todos', column: 'user_id' },
  { table: 'training_strategies', column: 'user_id' },
  { table: 'user_achievements', column: 'user_id' },
  { table: 'user_cosmetic_entitlements', column: 'user_id' },
  { table: 'user_power_ups', column: 'user_id' },
  { table: 'user_quest_habits', column: 'user_id' },
  { table: 'user_reminder_prefs', column: 'user_id' },
  { table: 'user_reputation_scores', column: 'user_id' },
  { table: 'user_skills', column: 'user_id' },
  { table: 'user_wallets', column: 'user_id' },
  { table: 'vb_boards', column: 'user_id' },
  { table: 'vb_cards', column: 'user_id' },
  { table: 'vb_checkins', column: 'user_id' },
  { table: 'vb_shares', column: 'owner_id' },
  { table: 'vision_board_daily_items', column: 'user_id' },
  { table: 'vision_board_daily_sessions', column: 'user_id' },
  { table: 'vision_board_image_tags', column: 'user_id' },
  { table: 'workout_sessions', column: 'user_id' },
  { table: 'workspace_profiles', column: 'user_id' },
  { table: 'xp_transactions', column: 'user_id' },
  { table: 'zen_garden_inventory', column: 'user_id' },
];

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseAction(value: unknown): AccountLifecycleAction | null {
  return value === 'reset' || value === 'delete' ? value : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const action = parseAction((payload as Record<string, unknown>).action);
    if (!action) {
      return jsonResponse({ error: 'Invalid account lifecycle action.' }, 400);
    }

    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    if (action === 'delete') {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        throw new Error(`Failed to delete auth user: ${deleteError.message}`);
      }

      return jsonResponse({ success: true, action });
    }

    let deletedRows = 0;
    let deletedTables = 0;
    const skippedTargets: string[] = [];

    for (const target of RESET_TARGETS) {
      const { data, error } = await supabaseAdmin
        .from(target.table)
        .delete()
        .eq(target.column, user.id)
        .select(target.column);

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('does not exist') || message.includes('could not find')) {
          skippedTargets.push(`${target.table}.${target.column}`);
          continue;
        }
        throw new Error(`Failed to reset ${target.table}.${target.column}: ${error.message}`);
      }

      const count = Array.isArray(data) ? data.length : 0;
      deletedRows += count;
      if (count > 0) deletedTables += 1;
    }

    return jsonResponse({
      success: true,
      action,
      deletedRows,
      deletedTables,
      skippedTargets,
    });
  } catch (error) {
    console.error('[account-lifecycle] failed', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected account lifecycle error.',
    }, 500);
  }
});
