-- Track completion metadata for 7-day habit improvement experiments.

alter table public.habit_analysis_sessions
  add column if not exists completed_at timestamptz;

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_completed_at_status_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_completed_at_status_check
  check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  );

create index if not exists habit_analysis_sessions_completed_at_idx
  on public.habit_analysis_sessions(completed_at)
  where completed_at is not null;
