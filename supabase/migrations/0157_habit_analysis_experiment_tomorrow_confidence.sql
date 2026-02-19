-- Capture confidence for tomorrow in daily experiment logs to surface momentum on mobile.

alter table public.habit_experiment_days
  add column if not exists confidence_tomorrow int;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_confidence_tomorrow_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_confidence_tomorrow_check
  check (confidence_tomorrow is null or confidence_tomorrow between 1 and 5);

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_confidence_tomorrow_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_confidence_tomorrow_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'confidenceTomorrow') is false
    or (
      jsonb_typeof(mobile_draft->'confidenceTomorrow') = 'number'
      and ((mobile_draft->>'confidenceTomorrow')::int between 1 and 5)
    )
  );
