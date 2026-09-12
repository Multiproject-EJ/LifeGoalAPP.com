-- Remove inherited PUBLIC execute rights that keep these RPCs reachable by
-- unauthenticated API callers even after role-specific revokes.
--
-- Authenticated Supabase users (including anonymous-auth sessions) and the
-- service role already have explicit EXECUTE grants where intended.

begin;

revoke execute on function public.get_users_with_active_reminders()
  from public;

revoke execute on function public.apply_permanent_upgrade(uuid, text, integer)
  from public;
revoke execute on function public.claim_birthday_gift()
  from public;
revoke execute on function public.claim_island_120_theme_entitlement()
  from public;
revoke execute on function public.get_reminder_analytics_daily(integer)
  from public;
revoke execute on function public.get_reminder_analytics_summary(integer)
  from public;
revoke execute on function public.get_year_in_review_stats(integer)
  from public;

commit;
