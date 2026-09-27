-- The Today experience still records completions through three supported
-- storage paths while migration to habits_v2 is in progress. The bonus RPC
-- previously checked only habit_completions, so legitimate completions in
-- habit_logs or habit_logs_v2 were rejected with P0001 and users could miss
-- their once-daily spin.

create or replace function public.claim_daily_spin_habit_bonus(
  p_claim_date date default current_date
)
returns table(claimed boolean, spins_available integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_inserted boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_claim_date is null or p_claim_date <> current_date then
    raise exception 'claim_date must be today';
  end if;

  if not (
    exists (
      select 1
      from public.habit_completions as completion
      where completion.user_id = v_user_id
        and completion.completed_date = p_claim_date
        and completion.completed = true
    )
    or exists (
      select 1
      from public.habit_logs_v2 as completion_v2
      where completion_v2.user_id = v_user_id
        and completion_v2.date = p_claim_date
        and completion_v2.done = true
    )
    or exists (
      select 1
      from public.habit_logs as legacy_completion
      join public.habits as legacy_habit
        on legacy_habit.id = legacy_completion.habit_id
      join public.goals as legacy_goal
        on legacy_goal.id = legacy_habit.goal_id
      where legacy_goal.user_id = v_user_id
        and legacy_completion.date = p_claim_date
        and legacy_completion.completed = true
    )
  ) then
    raise exception 'Complete a habit today before claiming the bonus spin';
  end if;

  insert into public.daily_spin_habit_bonus_claims (user_id, claim_date, spins_awarded)
  values (v_user_id, p_claim_date, 1)
  on conflict (user_id, claim_date) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) then
    insert into public.daily_spin_state (user_id, spins_available, total_spins_used)
    values (v_user_id, 1, 0)
    on conflict (user_id) do update
      set spins_available = least(
            2,
            (case
              when (public.daily_spin_state.updated_at at time zone 'UTC')::date <> p_claim_date
                then 1
              else public.daily_spin_state.spins_available
            end) + 1
          ),
          updated_at = now()
    returning public.daily_spin_state.spins_available into spins_available;

    return query select true, spins_available;
    return;
  end if;

  select state.spins_available
    into spins_available
    from public.daily_spin_state as state
    where state.user_id = v_user_id;

  return query select false, coalesce(spins_available, 0);
end;
$$;

revoke execute on function public.claim_daily_spin_habit_bonus(date)
  from public, anon;
grant execute on function public.claim_daily_spin_habit_bonus(date)
  to authenticated, service_role;
