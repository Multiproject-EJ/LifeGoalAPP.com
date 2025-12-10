-- Migration: Add habit alerts/notifications support to the habits table
-- Original path: sql/005_habit_alerts.sql
-- Original commit: bbcd9421a1dc27f7bee231a5568d24c458943c7a (2025-12-10 11:57:36 +0000)
-- This extends the habits_v2 table with notification scheduling
-- NOTE: Updated to reference habits_v2 instead of legacy habits table

-- Create habit_alerts table for scheduling reminders on habits_v2 table
create table if not exists public.habit_alerts (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits_v2 (id) on delete cascade,
  alert_time time not null,
  -- days of week: 0=Sunday, 1=Monday, ..., 6=Saturday
  -- null means every day
  days_of_week int[] default null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Create index for faster queries
create index if not exists habit_alerts_habit_id_idx on public.habit_alerts (habit_id);
create index if not exists habit_alerts_enabled_idx on public.habit_alerts (enabled);

-- Add RLS policies for habit_alerts
alter table public.habit_alerts enable row level security;

drop policy if exists "Users can view alerts for their own habits" on public.habit_alerts;
create policy "Users can view alerts for their own habits"
  on public.habit_alerts for select
  using (
    exists (
      select 1 from public.habits_v2 h
      where h.id = habit_alerts.habit_id
      and h.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert alerts for their own habits" on public.habit_alerts;
create policy "Users can insert alerts for their own habits"
  on public.habit_alerts for insert
  with check (
    exists (
      select 1 from public.habits_v2 h
      where h.id = habit_alerts.habit_id
      and h.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update alerts for their own habits" on public.habit_alerts;
create policy "Users can update alerts for their own habits"
  on public.habit_alerts for update
  using (
    exists (
      select 1 from public.habits_v2 h
      where h.id = habit_alerts.habit_id
      and h.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete alerts for their own habits" on public.habit_alerts;
create policy "Users can delete alerts for their own habits"
  on public.habit_alerts for delete
  using (
    exists (
      select 1 from public.habits_v2 h
      where h.id = habit_alerts.habit_id
      and h.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
drop trigger if exists set_habit_alerts_updated_at on public.habit_alerts;
drop function if exists public.set_habit_alerts_updated_at();

create function public.set_habit_alerts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger set_habit_alerts_updated_at
before update on public.habit_alerts
for each row execute function public.set_habit_alerts_updated_at();

-- Add comments for documentation
comment on table public.habit_alerts is 'Alert and notification schedules for habits (PWA compatible)';
comment on column public.habit_alerts.alert_time is 'Time of day to send the alert (in user local time)';
comment on column public.habit_alerts.days_of_week is 'Array of days (0-6, where 0=Sunday). NULL means every day.';
comment on column public.habit_alerts.enabled is 'Whether this alert is currently active';
