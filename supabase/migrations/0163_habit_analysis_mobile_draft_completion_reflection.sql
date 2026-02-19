-- Persist day-7 completion reflection draft fields inside mobile_draft for recovery on mobile.

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_completion_biggest_win_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_completion_biggest_win_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'completionBiggestWin') is false
    or (
      jsonb_typeof(mobile_draft->'completionBiggestWin') = 'string'
      and char_length(mobile_draft->>'completionBiggestWin') <= 160
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_completion_hardest_moment_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_completion_hardest_moment_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'completionHardestMoment') is false
    or (
      jsonb_typeof(mobile_draft->'completionHardestMoment') = 'string'
      and char_length(mobile_draft->>'completionHardestMoment') <= 240
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_completion_next_tweak_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_completion_next_tweak_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'completionNextTweak') is false
    or (
      jsonb_typeof(mobile_draft->'completionNextTweak') = 'string'
      and char_length(mobile_draft->>'completionNextTweak') <= 160
    )
  );
