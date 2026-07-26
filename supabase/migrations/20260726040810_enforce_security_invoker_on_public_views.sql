-- Make public API views obey the caller's permissions and the RLS policies on
-- their source tables. Without security_invoker, these views execute with the
-- postgres owner's privileges and can bypass those row filters.
--
-- The source tables for every view below have RLS enabled in production.

begin;

alter view if exists public.v_habit_streaks
  set (security_invoker = true);

alter view if exists public.v_challenge_scores
  set (security_invoker = true);

alter view if exists public.vb_board_stats
  set (security_invoker = true);

alter view if exists public.reminder_actions_daily
  set (security_invoker = true);

alter view if exists public.reminder_sends_daily
  set (security_invoker = true);

alter view if exists public.reminder_failures_daily
  set (security_invoker = true);

alter view if exists public.v_users_with_active_reminders
  set (security_invoker = true);

-- Materialized views cannot enforce RLS. Keep the per-user aggregate behind
-- the authenticated analytics RPCs instead of exposing it through PostgREST.
revoke all on table public.reminder_metrics_aggregate_30d
  from anon, authenticated;

-- Keep every flagged routine on a deterministic, non-user-controlled path.
-- API roles cannot CREATE in public, so this preserves existing unqualified
-- relation references while excluding caller and temporary schemas.
alter function public.set_meditation_reminders_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_telemetry_preferences_updated_at()
  set search_path = pg_catalog, public;
alter function public.increment_meditation_goal_days(uuid)
  set search_path = pg_catalog, public;
alter function public.get_users_with_active_reminders()
  set search_path = pg_catalog, public;
alter function public.update_actions_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_holiday_preferences_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_gamification_updated_at()
  set search_path = pg_catalog, public;
alter function public.touch_routines_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_reputation_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_case_thread_reads_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_habit_logs_v2_date()
  set search_path = pg_catalog, public;
alter function public.apply_permanent_upgrade(uuid, text, integer)
  set search_path = pg_catalog, public;
alter function public.apply_permanent_upgrade(uuid, text, integer)
  security invoker;
alter function public.update_case_threads_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_current_timestamp_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_journal_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_user_reminder_prefs_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_habit_reminder_state_updated_at()
  set search_path = pg_catalog, public;
alter function public.touch_habit_analysis_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_habit_reminder_prefs_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_feature_votes_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_today_todos_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_notification_preferences_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_campaigns_updated_at()
  set search_path = pg_catalog, public;
alter function public.update_ai_coach_threads_updated_at()
  set search_path = pg_catalog, public;

-- The reminder aggregate is intentionally service-only. Its deprecated
-- direct RPC and maintenance/rollup functions must not inherit API access.
revoke execute on function public.get_users_with_active_reminders()
  from anon, authenticated;
grant execute on function public.get_users_with_active_reminders()
  to service_role;
revoke execute on function public.rollup_telemetry_daily(integer)
  from anon, authenticated;
revoke execute on function public.rollup_telemetry_user_activity(integer)
  from anon, authenticated;
revoke execute on function public.increment_user_dice_rolls(uuid, integer)
  from anon, authenticated;
revoke execute on function public.evaluate_due_commitment_contracts_sweep(integer, integer)
  from anon, authenticated;

-- User-facing SECURITY DEFINER RPCs require an authenticated JWT. Anonymous
-- Supabase Auth users use the authenticated database role, not `anon`.
revoke execute on function public.apply_permanent_upgrade(uuid, text, integer) from anon;
revoke execute on function public.claim_birthday_gift() from anon;
revoke execute on function public.claim_combined_journey_reward(integer) from anon;
revoke execute on function public.claim_daily_spin_habit_bonus(date) from anon;
revoke execute on function public.claim_island_120_theme_entitlement() from anon;
revoke execute on function public.ensure_combined_journey_baseline(integer) from anon;
revoke execute on function public.evaluate_due_commitment_contracts(integer) from anon;
revoke execute on function public.evaluate_due_commitment_contracts(uuid, integer) from anon;
revoke execute on function public.get_admin_telemetry_insights(integer) from anon;
revoke execute on function public.get_commitment_contract_sweep_health() from anon;
revoke execute on function public.get_reminder_analytics_daily(integer) from anon;
revoke execute on function public.get_reminder_analytics_summary(integer) from anon;
revoke execute on function public.get_year_in_review_stats(integer) from anon;
revoke execute on function public.island_run_claim_active_session(text, boolean, text, jsonb, integer) from anon;
revoke execute on function public.island_run_heartbeat_session(text, integer) from anon;
revoke execute on function public.island_run_release_active_session(text) from anon;
revoke execute on function public.island_run_reset_progress(text, bigint, jsonb, text) from anon;
revoke execute on function public.island_run_validate_session_owner(text) from anon;

-- Match the admin condition on both sides of UPDATE. The former WITH CHECK
-- (true) was safe only because USING was restrictive, but was linted and made
-- the policy harder to reason about.
drop policy if exists "case_threads_admin_update_all" on public.case_threads;
create policy "case_threads_admin_update_all"
  on public.case_threads
  for update
  using (
    exists (
      select 1
      from public.admin_users as admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users as admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  );

commit;
