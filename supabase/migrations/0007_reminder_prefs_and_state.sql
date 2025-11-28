-- ========================================================
-- DAILY REMINDER SCHEDULING - USER PREFERENCES & STATE
-- Migration 0007: Per-user reminder preferences and habit reminder state
-- ========================================================

-- USER REMINDER PREFERENCES TABLE
-- Stores per-user timezone and daily reminder window settings
CREATE TABLE IF NOT EXISTS public.user_reminder_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  window_start TIME NOT NULL DEFAULT '08:00:00',
  window_end TIME NOT NULL DEFAULT '10:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HABIT REMINDER STATE TABLE
-- Tracks idempotent delivery to prevent duplicate reminders
CREATE TABLE IF NOT EXISTS public.habit_reminder_state (
  habit_id UUID PRIMARY KEY REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  last_reminder_sent_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
-- Index on user_id for fast lookups in user_reminder_prefs
CREATE INDEX IF NOT EXISTS idx_user_reminder_prefs_user_id 
  ON public.user_reminder_prefs(user_id);

-- Index on last_reminder_sent_at for efficient filtering of recently-reminded habits
CREATE INDEX IF NOT EXISTS idx_habit_reminder_state_last_sent 
  ON public.habit_reminder_state(last_reminder_sent_at);

-- Index on snooze_until for filtering snoozed habits
CREATE INDEX IF NOT EXISTS idx_habit_reminder_state_snooze 
  ON public.habit_reminder_state(snooze_until);

-- ROW LEVEL SECURITY
ALTER TABLE public.user_reminder_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_reminder_state ENABLE ROW LEVEL SECURITY;

-- USER REMINDER PREFS POLICIES
-- Users can only access and modify their own reminder preferences
DROP POLICY IF EXISTS "own_reminder_prefs" ON public.user_reminder_prefs;
CREATE POLICY "own_reminder_prefs" ON public.user_reminder_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HABIT REMINDER STATE POLICIES
-- Users can only access reminder state for habits they own
DROP POLICY IF EXISTS "own_habit_reminder_state" ON public.habit_reminder_state;
CREATE POLICY "own_habit_reminder_state" ON public.habit_reminder_state
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.habits_v2 WHERE id = habit_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.habits_v2 WHERE id = habit_id AND user_id = auth.uid())
  );

-- UPDATED_AT TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_user_reminder_prefs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_habit_reminder_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS user_reminder_prefs_updated_at ON public.user_reminder_prefs;
CREATE TRIGGER user_reminder_prefs_updated_at
  BEFORE UPDATE ON public.user_reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_user_reminder_prefs_updated_at();

DROP TRIGGER IF EXISTS habit_reminder_state_updated_at ON public.habit_reminder_state;
CREATE TRIGGER habit_reminder_state_updated_at
  BEFORE UPDATE ON public.habit_reminder_state
  FOR EACH ROW EXECUTE FUNCTION public.set_habit_reminder_state_updated_at();
