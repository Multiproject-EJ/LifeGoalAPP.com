do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'habit_lifecycle_status'
  ) then
    create type public.habit_lifecycle_status as enum ('active', 'paused', 'deactivated', 'archived');
  end if;
end $$;

alter table public.habits_v2
  add column if not exists status public.habit_lifecycle_status not null default 'active',
  add column if not exists paused_at timestamptz,
  add column if not exists paused_reason text,
  add column if not exists resume_on date,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_reason text;

update public.habits_v2
set
  status = case
    when coalesce(archived, false) then 'archived'::public.habit_lifecycle_status
    else 'active'::public.habit_lifecycle_status
  end,
  paused_at = null,
  paused_reason = null,
  resume_on = null,
  deactivated_at = null,
  deactivated_reason = null
where status is distinct from case
  when coalesce(archived, false) then 'archived'::public.habit_lifecycle_status
  else 'active'::public.habit_lifecycle_status
end
or paused_at is not null
or paused_reason is not null
or resume_on is not null
or deactivated_at is not null
or deactivated_reason is not null;

create index if not exists habits_v2_status_idx on public.habits_v2(status);
create index if not exists habits_v2_status_archived_idx on public.habits_v2(status, archived);
