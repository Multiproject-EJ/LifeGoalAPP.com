-- Tip of the Day — AI Coach.
-- One row per user per local day records which "Tip of the Day" variation was
-- shown, which habit it was about, the generated card deck (for history /
-- future personalisation), and any action the user took. The unique
-- (user_id, shown_on) index enforces "one tip per day".

create table if not exists public.tip_of_day_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Local calendar date (YYYY-MM-DD) the tip was shown to the user.
  shown_on date not null,
  variation text not null check (variation in ('reshape_struggling', 'habit_science', 'environment_cue')),
  -- The habit the tip focused on, when applicable.
  habit_id uuid references public.habits_v2(id) on delete set null,
  -- The full generated card deck, kept for history and future tuning.
  payload jsonb not null default '{}'::jsonb,
  -- Whether the deck came from the AI or the deterministic fallback.
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  -- What the user did with the tip: 'applied', 'captured', 'dismissed', null = unseen action.
  action_taken text check (action_taken in ('applied', 'captured', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tip_of_day_log_user_id_idx on public.tip_of_day_log(user_id);
create index if not exists tip_of_day_log_habit_id_idx on public.tip_of_day_log(habit_id);

-- One tip per user per day.
create unique index if not exists tip_of_day_log_user_day_idx
  on public.tip_of_day_log(user_id, shown_on);

-- Reuse the shared touch trigger from 0148_habit_improvement_analysis.sql.
drop trigger if exists trg_touch_tip_of_day_log on public.tip_of_day_log;
create trigger trg_touch_tip_of_day_log
before update on public.tip_of_day_log
for each row execute function public.touch_habit_analysis_updated_at();

alter table public.tip_of_day_log enable row level security;

create policy "tip of day log owned by user"
on public.tip_of_day_log
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
