-- Persist in-progress mobile check-in input so users can recover after accidental closes.

alter table public.habit_analysis_sessions
  add column if not exists mobile_draft jsonb;

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_object_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_object_check
  check (
    mobile_draft is null
    or jsonb_typeof(mobile_draft) = 'object'
  );
