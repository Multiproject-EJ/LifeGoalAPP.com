-- Persist wizard progress so mobile users can resume habit analysis drafts.

alter table public.habit_analysis_sessions
add column if not exists current_step int not null default 0;

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_current_step_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_current_step_check
  check (current_step between 0 and 4);

create index if not exists habit_analysis_sessions_current_step_idx
  on public.habit_analysis_sessions(current_step);
