-- Require a quick win note whenever a day's net effect is marked as better.

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_better_requires_win_note_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_better_requires_win_note_check
  check (
    net_effect is distinct from 'better'
    or char_length(trim(coalesce(win_note, ''))) > 0
  );

alter table public.habit_analysis_sessions
  drop constraint if exists habit_analysis_sessions_mobile_draft_better_requires_win_note_check;

alter table public.habit_analysis_sessions
  add constraint habit_analysis_sessions_mobile_draft_better_requires_win_note_check
  check (
    mobile_draft is null
    or (mobile_draft ? 'netEffect') is false
    or (mobile_draft->>'netEffect') is distinct from 'better'
    or char_length(trim(coalesce(mobile_draft->>'winNote', ''))) > 0
  );
