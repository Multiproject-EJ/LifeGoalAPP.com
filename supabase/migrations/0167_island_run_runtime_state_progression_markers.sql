-- M7D: Island Run runtime-state table-first progression markers
-- Adds canonical table columns for cross-device persistence of island/boss progression markers.

CREATE TABLE IF NOT EXISTS public.island_run_runtime_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_run_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  daily_hearts_claimed_day_key TEXT,
  current_island_number INT NOT NULL DEFAULT 1,
  boss_trial_resolved_island_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT island_run_runtime_state_current_island_number_check CHECK (current_island_number >= 1),
  CONSTRAINT island_run_runtime_state_boss_trial_island_number_check CHECK (
    boss_trial_resolved_island_number IS NULL OR boss_trial_resolved_island_number >= 1
  )
);

ALTER TABLE public.island_run_runtime_state
  ADD COLUMN IF NOT EXISTS first_run_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS daily_hearts_claimed_day_key TEXT,
  ADD COLUMN IF NOT EXISTS current_island_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS boss_trial_resolved_island_number INT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.island_run_runtime_state
  DROP CONSTRAINT IF EXISTS island_run_runtime_state_current_island_number_check;

ALTER TABLE public.island_run_runtime_state
  ADD CONSTRAINT island_run_runtime_state_current_island_number_check CHECK (current_island_number >= 1);

ALTER TABLE public.island_run_runtime_state
  DROP CONSTRAINT IF EXISTS island_run_runtime_state_boss_trial_island_number_check;

ALTER TABLE public.island_run_runtime_state
  ADD CONSTRAINT island_run_runtime_state_boss_trial_island_number_check CHECK (
    boss_trial_resolved_island_number IS NULL OR boss_trial_resolved_island_number >= 1
  );

ALTER TABLE public.island_run_runtime_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'island_run_runtime_state'
      AND policyname = 'Users can view their own island run runtime state'
  ) THEN
    CREATE POLICY "Users can view their own island run runtime state"
      ON public.island_run_runtime_state
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'island_run_runtime_state'
      AND policyname = 'Users can insert their own island run runtime state'
  ) THEN
    CREATE POLICY "Users can insert their own island run runtime state"
      ON public.island_run_runtime_state
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'island_run_runtime_state'
      AND policyname = 'Users can update their own island run runtime state'
  ) THEN
    CREATE POLICY "Users can update their own island run runtime state"
      ON public.island_run_runtime_state
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_island_run_runtime_state_user_id
  ON public.island_run_runtime_state(user_id);
