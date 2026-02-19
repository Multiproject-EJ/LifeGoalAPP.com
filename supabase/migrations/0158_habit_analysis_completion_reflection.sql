-- Store a compact post-experiment reflection for mobile habit improvement analysis.

alter table public.habit_analysis_sessions
  add column if not exists completion_reflection jsonb;

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_completion_reflection_object_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_completion_reflection_object_check
  check (
    completion_reflection is null
    or jsonb_typeof(completion_reflection) = 'object'
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_completion_reflection_biggest_win_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_completion_reflection_biggest_win_check
  check (
    completion_reflection is null
    or (completion_reflection ? 'biggestWin') is false
    or (
      jsonb_typeof(completion_reflection->'biggestWin') = 'string'
      and char_length(completion_reflection->>'biggestWin') <= 160
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_completion_reflection_hardest_moment_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_completion_reflection_hardest_moment_check
  check (
    completion_reflection is null
    or (completion_reflection ? 'hardestMoment') is false
    or (
      jsonb_typeof(completion_reflection->'hardestMoment') = 'string'
      and char_length(completion_reflection->>'hardestMoment') <= 240
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_completion_reflection_next_tweak_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_completion_reflection_next_tweak_check
  check (
    completion_reflection is null
    or (
      (completion_reflection ? 'nextTweak') is true
      and jsonb_typeof(completion_reflection->'nextTweak') = 'string'
      and char_length(btrim(completion_reflection->>'nextTweak')) between 1 and 160
    )
  );
