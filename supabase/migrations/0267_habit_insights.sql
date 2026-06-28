-- Habit insights — quick "what got in the way?" / "what triggered it?" captures.
-- Logged from the Today screen when the user skips (or acts on) a struggling
-- habit. Each row records the cue tags they tapped and an optional note. These
-- feed the "Tip of the Day — AI Coach" reshape variation so its advice is based
-- on the user's own reported cues, not just adherence numbers.

create table if not exists public.habit_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits_v2(id) on delete cascade,
  -- Local calendar date (YYYY-MM-DD) the insight was captured.
  captured_on date not null,
  -- One-tap cue chips, e.g. {'tired','scrolling'}.
  cue_tags text[] not null default '{}',
  -- Optional free-text insight in the user's own words.
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_insights_user_id_idx on public.habit_insights(user_id);
create index if not exists habit_insights_habit_id_idx on public.habit_insights(habit_id);
create index if not exists habit_insights_habit_captured_idx
  on public.habit_insights(habit_id, captured_on desc);

-- Reuse the shared touch trigger from 0148_habit_improvement_analysis.sql.
drop trigger if exists trg_touch_habit_insights on public.habit_insights;
create trigger trg_touch_habit_insights
before update on public.habit_insights
for each row execute function public.touch_habit_analysis_updated_at();

alter table public.habit_insights enable row level security;

create policy "habit insights owned by user"
on public.habit_insights
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
