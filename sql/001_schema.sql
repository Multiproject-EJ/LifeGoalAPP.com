-- Schema for LifeGoal Supabase project
-- Run this file in the SQL editor for project muanayogiboxooftkyny

create extension if not exists "pgcrypto";

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  target_date date,
  progress_notes text,
  status_tag text
);

create table if not exists public.goal_reflections (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  confidence numeric,
  highlight text,
  challenge text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  name text not null,
  frequency text not null,
  schedule jsonb
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  constraint habit_logs_unique_per_day unique (habit_id, date)
);

create table if not exists public.vision_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text not null,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  scores jsonb not null,
  constraint checkins_unique_per_day unique (user_id, date)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  habit_reminders_enabled boolean not null default true,
  habit_reminder_time text,
  checkin_nudges_enabled boolean not null default true,
  timezone text,
  subscription jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
drop function if exists public.set_notification_preferences_updated_at();

create function public.set_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute procedure public.set_notification_preferences_updated_at();
