-- ========================================================
-- REMINDERS MODULE - USER PREFERENCES AND STATE
-- Migration 0007: Daily Reminder Scheduling
-- ========================================================

-- USER REMINDER PREFERENCES TABLE
-- Stores per-user settings for daily reminder scheduling
CREATE TABLE IF NOT EXISTS public.user_reminder_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  window_start time NOT NULL DEFAULT '08:00:00',
  window_end time NOT NULL DEFAULT '10:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HABIT REMINDER STATE TABLE
-- Tracks reminder delivery state for idempotent sending
CREATE TABLE IF NOT EXISTS public.habit_reminder_state (
  habit_id uuid PRIMARY KEY REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  last_reminder_sent_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_reminder_prefs_user_id 
  ON public.user_reminder_prefs(user_id);

CREATE INDEX IF NOT EXISTS idx_habit_reminder_state_last_sent 
  ON public.habit_reminder_state(last_reminder_sent_at);

-- RLS POLICIES
ALTER TABLE public.user_reminder_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_reminder_state ENABLE ROW LEVEL SECURITY;

-- User reminder prefs policies (users can only manage their own preferences)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_reminder_prefs'
      AND policyname = 'own reminder prefs'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "own reminder prefs" ON public.user_reminder_prefs
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    $pol$;
  END IF;
END$$ LANGUAGE plpgsql;

-- Habit reminder state policies (users can only manage state for their own habits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'habit_reminder_state'
      AND policyname = 'own habit reminder state'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "own habit reminder state" ON public.habit_reminder_state
        FOR ALL USING (
          EXISTS (SELECT 1 FROM habits_v2 WHERE id = habit_id AND user_id = auth.uid())
        ) 
        WITH CHECK (
          EXISTS (SELECT 1 FROM habits_v2 WHERE id = habit_id AND user_id = auth.uid())
        );
    $pol$;
  END IF;
END$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_reminder_prefs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_reminder_prefs_updated_at ON public.user_reminder_prefs;
CREATE TRIGGER user_reminder_prefs_updated_at
  BEFORE UPDATE ON public.user_reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_reminder_prefs_updated_at();

DROP TRIGGER IF EXISTS habit_reminder_state_updated_at ON public.habit_reminder_state;
CREATE TRIGGER habit_reminder_state_updated_at
  BEFORE UPDATE ON public.habit_reminder_state
  FOR EACH ROW EXECUTE FUNCTION public.update_reminder_prefs_updated_at();
