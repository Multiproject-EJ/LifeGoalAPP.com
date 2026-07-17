-- Migration ledger version 01640001
-- Goal snapshots track how goals evolve over time so adaptation is treated as growth, not failure.

CREATE TABLE IF NOT EXISTS public.goal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('created', 'updated', 'deleted', 'status_changed', 'retitled', 'timeline_shifted', 'evolved')),
  summary text NULL,
  before_state jsonb NULL,
  after_state jsonb NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal_id_created_at
  ON public.goal_snapshots(goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_user_id_created_at
  ON public.goal_snapshots(user_id, created_at DESC);

ALTER TABLE public.goal_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own goal snapshots" ON public.goal_snapshots;
CREATE POLICY "Users can view their own goal snapshots"
  ON public.goal_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goal snapshots" ON public.goal_snapshots;
CREATE POLICY "Users can insert their own goal snapshots"
  ON public.goal_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.goal_snapshots IS 'Historical snapshots of goal evolution so progress and adaptation are both preserved.';
COMMENT ON COLUMN public.goal_snapshots.snapshot_type IS 'Type of change event for the goal lifecycle.';
COMMENT ON COLUMN public.goal_snapshots.before_state IS 'Goal shape before mutation (if available).';
COMMENT ON COLUMN public.goal_snapshots.after_state IS 'Goal shape after mutation (if available).';

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 01640002
-- Keystone / chain-reaction habit links.
-- Records the user's (or an AI hypothesis's) belief that one habit tends to make
-- another habit — or a Life Wheel area — easier or harder. Association, not causation.

create table if not exists public.habit_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_habit_id uuid not null references public.habits_v2(id) on delete cascade,
  -- Exactly one ripple target: another habit OR a Life Wheel area.
  target_habit_id uuid references public.habits_v2(id) on delete cascade,
  life_area text,
  direction text not null check (direction in ('positive', 'negative')),
  strength text not null default 'medium' check (strength in ('weak', 'medium', 'strong')),
  consistency text not null default 'sometimes' check (consistency in ('rare', 'sometimes', 'often')),
  evidence_type text not null default 'user_confirmed' check (evidence_type in ('user_confirmed', 'ai_hypothesis')),
  status text not null default 'active' check (status in ('active', 'dismissed', 'archived')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One of target_habit_id / life_area must be present, but not both.
  constraint habit_links_one_target check (
    (target_habit_id is not null and life_area is null)
    or (target_habit_id is null and life_area is not null)
  ),
  -- A source habit cannot ripple into itself.
  constraint habit_links_no_self check (source_habit_id is distinct from target_habit_id)
);

create index if not exists habit_links_source_habit_id_idx on public.habit_links(source_habit_id);
create index if not exists habit_links_user_id_idx on public.habit_links(user_id);
create index if not exists habit_links_target_habit_id_idx on public.habit_links(target_habit_id);

-- Avoid duplicate active links to the same target (per source + direction).
create unique index if not exists habit_links_unique_habit_target_idx
  on public.habit_links(source_habit_id, target_habit_id, direction)
  where target_habit_id is not null and status = 'active';
create unique index if not exists habit_links_unique_area_target_idx
  on public.habit_links(source_habit_id, life_area, direction)
  where life_area is not null and status = 'active';

-- Reuse the shared touch trigger from 0148_habit_improvement_analysis.sql.
drop trigger if exists trg_touch_habit_links on public.habit_links;
create trigger trg_touch_habit_links
before update on public.habit_links
for each row execute function public.touch_habit_analysis_updated_at();

alter table public.habit_links enable row level security;

create policy "habit links owned by user"
on public.habit_links
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
