-- Provision one Personal Quest season per authenticated user/week without
-- emitting a unique-violation error when two devices start concurrently.

begin;

create or replace function public.ensure_personal_quest_season(
  p_theme_name text,
  p_starts_on date,
  p_ends_on date
)
returns public.daily_calendar_seasons
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_season public.daily_calendar_seasons;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if nullif(btrim(p_theme_name), '') is null or length(p_theme_name) > 120 then
    raise exception 'Invalid Personal Quest theme.' using errcode = '22023';
  end if;

  if p_ends_on <> p_starts_on + 6 then
    raise exception 'Personal Quest seasons must span exactly seven days.' using errcode = '22023';
  end if;

  insert into public.daily_calendar_seasons (
    theme_name,
    starts_on,
    ends_on,
    status,
    holiday_key,
    season_type,
    user_id_owner
  ) values (
    btrim(p_theme_name),
    p_starts_on,
    p_ends_on,
    'active',
    null,
    'personal_quest',
    v_user_id
  )
  on conflict (user_id_owner, starts_on)
    where season_type = 'personal_quest' and user_id_owner is not null
  do update set
    theme_name = excluded.theme_name,
    ends_on = excluded.ends_on,
    status = 'active',
    holiday_key = null
  returning * into v_season;

  return v_season;
end;
$$;

revoke all on function public.ensure_personal_quest_season(text, date, date)
  from public, anon;
grant execute on function public.ensure_personal_quest_season(text, date, date)
  to authenticated, service_role;

comment on function public.ensure_personal_quest_season(text, date, date) is
  'Atomically returns the authenticated user personal-quest season for a seven-day week.';

commit;
