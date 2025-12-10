-- SQL Patch: Extended Life Goals with Steps, Substeps, and Alerts
-- Version: 003
-- Description: Adds support for detailed life goals with steps, substeps, timing, and PWA notification alerts
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Navigate to your Supabase project SQL Editor
-- 3. Paste and execute the SQL
-- 4. Verify all tables and policies are created successfully

-- =====================================================
-- TABLES
-- =====================================================

-- Table: life_goal_steps
-- Purpose: Break down goals into actionable steps
create table if not exists public.life_goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  step_order int not null default 0,
  title text not null,
  description text,
  completed boolean not null default false,
  completed_at timestamptz,
  due_date date,
  created_at timestamptz not null default timezone('utc', now())
);

-- Table: life_goal_substeps
-- Purpose: Further break down steps into smaller actionable items
create table if not exists public.life_goal_substeps (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.life_goal_steps (id) on delete cascade,
  substep_order int not null default 0,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- Table: life_goal_alerts
-- Purpose: Schedule alerts and notifications for goals (PWA compatible)
create table if not exists public.life_goal_alerts (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_type text not null, -- 'milestone', 'deadline', 'reminder', 'custom'
  alert_time timestamptz not null,
  title text not null,
  message text,
  sent boolean not null default false,
  sent_at timestamptz,
  repeat_pattern text, -- 'once', 'daily', 'weekly', 'monthly'
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

-- =====================================================
-- EXTEND EXISTING GOALS TABLE
-- =====================================================

-- Add new columns to goals table for extended life goal features
alter table public.goals
  add column if not exists life_wheel_category text,
  add column if not exists start_date date,
  add column if not exists timing_notes text,
  add column if not exists estimated_duration_days int;

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists life_goal_steps_goal_id_idx on public.life_goal_steps (goal_id);
create index if not exists life_goal_substeps_step_id_idx on public.life_goal_substeps (step_id);
create index if not exists life_goal_alerts_goal_id_idx on public.life_goal_alerts (goal_id);
create index if not exists life_goal_alerts_user_id_idx on public.life_goal_alerts (user_id);
create index if not exists life_goal_alerts_alert_time_idx on public.life_goal_alerts (alert_time);
create index if not exists goals_life_wheel_category_idx on public.goals (life_wheel_category);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
alter table public.life_goal_steps enable row level security;
alter table public.life_goal_substeps enable row level security;
alter table public.life_goal_alerts enable row level security;

-- Policies for life_goal_steps
drop policy if exists "Users can view steps for their own goals" on public.life_goal_steps;
create policy "Users can view steps for their own goals"
  on public.life_goal_steps for select
  using (
    exists (
      select 1 from public.goals
      where goals.id = life_goal_steps.goal_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert steps for their own goals" on public.life_goal_steps;
create policy "Users can insert steps for their own goals"
  on public.life_goal_steps for insert
  with check (
    exists (
      select 1 from public.goals
      where goals.id = life_goal_steps.goal_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update steps for their own goals" on public.life_goal_steps;
create policy "Users can update steps for their own goals"
  on public.life_goal_steps for update
  using (
    exists (
      select 1 from public.goals
      where goals.id = life_goal_steps.goal_id
      and goals.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.goals
      where goals.id = life_goal_steps.goal_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete steps for their own goals" on public.life_goal_steps;
create policy "Users can delete steps for their own goals"
  on public.life_goal_steps for delete
  using (
    exists (
      select 1 from public.goals
      where goals.id = life_goal_steps.goal_id
      and goals.user_id = auth.uid()
    )
  );

-- Policies for life_goal_substeps
drop policy if exists "Users can view substeps for their own goals" on public.life_goal_substeps;
create policy "Users can view substeps for their own goals"
  on public.life_goal_substeps for select
  using (
    exists (
      select 1 from public.life_goal_steps
      join public.goals on goals.id = life_goal_steps.goal_id
      where life_goal_steps.id = life_goal_substeps.step_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert substeps for their own goals" on public.life_goal_substeps;
create policy "Users can insert substeps for their own goals"
  on public.life_goal_substeps for insert
  with check (
    exists (
      select 1 from public.life_goal_steps
      join public.goals on goals.id = life_goal_steps.goal_id
      where life_goal_steps.id = life_goal_substeps.step_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update substeps for their own goals" on public.life_goal_substeps;
create policy "Users can update substeps for their own goals"
  on public.life_goal_substeps for update
  using (
    exists (
      select 1 from public.life_goal_steps
      join public.goals on goals.id = life_goal_steps.goal_id
      where life_goal_steps.id = life_goal_substeps.step_id
      and goals.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.life_goal_steps
      join public.goals on goals.id = life_goal_steps.goal_id
      where life_goal_steps.id = life_goal_substeps.step_id
      and goals.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete substeps for their own goals" on public.life_goal_substeps;
create policy "Users can delete substeps for their own goals"
  on public.life_goal_substeps for delete
  using (
    exists (
      select 1 from public.life_goal_steps
      join public.goals on goals.id = life_goal_steps.goal_id
      where life_goal_steps.id = life_goal_substeps.step_id
      and goals.user_id = auth.uid()
    )
  );

-- Policies for life_goal_alerts
drop policy if exists "Users can view their own goal alerts" on public.life_goal_alerts;
create policy "Users can view their own goal alerts"
  on public.life_goal_alerts for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own goal alerts" on public.life_goal_alerts;
create policy "Users can insert their own goal alerts"
  on public.life_goal_alerts for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own goal alerts" on public.life_goal_alerts;
create policy "Users can update their own goal alerts"
  on public.life_goal_alerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own goal alerts" on public.life_goal_alerts;
create policy "Users can delete their own goal alerts"
  on public.life_goal_alerts for delete
  using (user_id = auth.uid());

-- =====================================================
-- DOCUMENTATION
-- =====================================================

comment on table public.life_goal_steps is 'Steps for breaking down life goals into actionable tasks';
comment on table public.life_goal_substeps is 'Substeps for further breaking down goal steps';
comment on table public.life_goal_alerts is 'Alert and notification schedules for life goals (PWA compatible)';
comment on column public.goals.life_wheel_category is 'Links goal to a life wheel category (spirituality_community, finance_wealth, love_relations, fun_creativity, career_development, health_fitness, family_friends, living_spaces)';
comment on column public.goals.start_date is 'When the user plans to start working on this goal';
comment on column public.goals.timing_notes is 'Detailed timing and schedule notes for the goal';
comment on column public.goals.estimated_duration_days is 'Estimated number of days to complete this goal';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:
--
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('life_goal_steps', 'life_goal_substeps', 'life_goal_alerts');
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'goals' 
-- AND column_name IN ('life_wheel_category', 'start_date', 'timing_notes', 'estimated_duration_days');
