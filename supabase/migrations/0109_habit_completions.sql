-- ========================================================
-- HABIT COMPLETIONS TABLE
-- Migration 0109: Per-day habit completion tracking (Path B)
-- ========================================================

-- Create habit_completions table
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits_v2(id) on delete cascade,
  completed_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, completed_date)
);

-- Create indexes for better query performance
create index if not exists idx_habit_completions_user_id on public.habit_completions(user_id);
create index if not exists idx_habit_completions_habit_id on public.habit_completions(habit_id);
create index if not exists idx_habit_completions_date on public.habit_completions(completed_date);
create index if not exists idx_habit_completions_user_habit on public.habit_completions(user_id, habit_id);

-- Enable Row Level Security
alter table public.habit_completions enable row level security;

-- RLS Policy: Users can only access their own habit completions
drop policy if exists "own habit completions" on public.habit_completions;
create policy "own habit completions" on public.habit_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
