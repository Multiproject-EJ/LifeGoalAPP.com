-- Track experiment progress at session level for quicker mobile resume UX.

alter table public.habit_analysis_sessions
add column if not exists last_logged_day_index int not null default 0
check (last_logged_day_index between 0 and 7);

create index if not exists habit_analysis_sessions_last_logged_day_index_idx
  on public.habit_analysis_sessions(last_logged_day_index);
