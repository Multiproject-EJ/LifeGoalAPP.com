-- Add daily protocol difficulty signal to improve experiment analysis quality.
alter table public.habit_experiment_days
  add column if not exists protocol_difficulty int;

alter table public.habit_experiment_days
  drop constraint if exists habit_experiment_days_protocol_difficulty_check;

alter table public.habit_experiment_days
  add constraint habit_experiment_days_protocol_difficulty_check
  check (protocol_difficulty between 1 and 5);
