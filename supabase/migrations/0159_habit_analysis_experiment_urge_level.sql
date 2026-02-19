-- Track urge intensity during 7-day habit experiment check-ins.

alter table public.habit_experiment_days
  add column if not exists urge_level int;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_urge_level_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_urge_level_check
  check (urge_level is null or urge_level between 1 and 5);

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_urge_level_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_urge_level_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'urgeLevel') is false
    or (
      jsonb_typeof(mobile_draft->'urgeLevel') = 'number'
      and ((mobile_draft->>'urgeLevel')::int between 1 and 5)
    )
  );
