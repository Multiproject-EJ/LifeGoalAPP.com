-- Add estimated_minutes and is_focus columns to today_todos
ALTER TABLE public.today_todos
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS is_focus boolean NOT NULL DEFAULT false;

-- Enforce only one focus todo per user per date
CREATE UNIQUE INDEX IF NOT EXISTS today_todos_one_focus_per_user_date
  ON public.today_todos (user_id, todo_date)
  WHERE is_focus = true AND completed = false;
