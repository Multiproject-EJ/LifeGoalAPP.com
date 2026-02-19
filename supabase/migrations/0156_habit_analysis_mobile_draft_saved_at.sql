-- Add draft save timestamp + stricter mobile draft shape guards for habit analysis.

alter table public.habit_analysis_sessions
  add column if not exists mobile_draft_saved_at timestamptz;

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_saved_at_presence_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_saved_at_presence_check
  check (
    (mobile_draft is null and mobile_draft_saved_at is null)
    or (mobile_draft is not null and mobile_draft_saved_at is not null)
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_day_index_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_day_index_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'dayIndex') is false
    or (
      jsonb_typeof(mobile_draft->'dayIndex') = 'number'
      and ((mobile_draft->>'dayIndex')::int between 1 and 7)
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_under_pain_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_under_pain_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'underPain') is false
    or (
      jsonb_typeof(mobile_draft->'underPain') = 'number'
      and ((mobile_draft->>'underPain')::int between 0 and 3)
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_over_pain_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_over_pain_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'overPain') is false
    or (
      jsonb_typeof(mobile_draft->'overPain') = 'number'
      and ((mobile_draft->>'overPain')::int between 0 and 3)
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_note_length_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_note_length_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'note') is false
    or (
      jsonb_typeof(mobile_draft->'note') = 'string'
      and char_length(mobile_draft->>'note') <= 240
    )
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_win_note_length_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_win_note_length_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'winNote') is false
    or (
      jsonb_typeof(mobile_draft->'winNote') = 'string'
      and char_length(mobile_draft->>'winNote') <= 160
    )
  );

create index if not exists habit_analysis_sessions_mobile_draft_saved_at_idx
  on public.habit_analysis_sessions(mobile_draft_saved_at)
  where mobile_draft_saved_at is not null;
