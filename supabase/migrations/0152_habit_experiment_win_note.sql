-- Add a compact wins field to daily habit experiment logs.
-- Keeps reflections scannable in mobile while preserving optional free-form note.

alter table public.habit_experiment_days
  add column if not exists win_note text;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_win_note_length_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_win_note_length_check
  check (win_note is null or char_length(win_note) <= 160);
