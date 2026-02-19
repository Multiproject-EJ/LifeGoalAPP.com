-- Persist completion analytics snapshot for habit improvement experiment wrap-up.

alter table public.habit_analysis_sessions
  add column if not exists completion_summary jsonb;

comment on column public.habit_analysis_sessions.completion_summary is
  'Computed week summary captured when finishing a habit improvement experiment.';
