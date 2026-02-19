-- Add energy signal to 7-day experiment logs for mobile trend quality.

alter table public.habit_experiment_days
  add column if not exists energy_level int;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_energy_level_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_energy_level_check
  check (energy_level is null or energy_level between 1 and 5);

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_energy_level_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_energy_level_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'energyLevel') is false
    or (
      jsonb_typeof(mobile_draft->'energyLevel') = 'number'
      and ((mobile_draft->>'energyLevel')::int between 1 and 5)
    )
  );
