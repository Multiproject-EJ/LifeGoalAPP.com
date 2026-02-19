-- Track daily stress level in habit improvement experiment logs and mobile drafts.

alter table public.habit_experiment_days
  add column if not exists stress_level int;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_stress_level_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_stress_level_check
  check (stress_level is null or stress_level between 1 and 5);

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_stress_level_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_stress_level_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'stressLevel') is false
    or (
      jsonb_typeof(mobile_draft->'stressLevel') = 'number'
      and ((mobile_draft->>'stressLevel')::int between 1 and 5)
    )
  );
