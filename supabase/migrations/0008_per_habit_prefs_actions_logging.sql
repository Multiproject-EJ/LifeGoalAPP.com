-- ========================================================
-- PER-HABIT REMINDER PREFS, ACTION LOGS, AND DELIVERY FAILURES
-- Migration 0008: Actionable notifications, per-habit controls, delivery reliability
-- ========================================================

-- HABIT REMINDER PREFS TABLE
-- Stores per-habit reminder preferences (enable/disable, preferred time)
CREATE TABLE IF NOT EXISTS public.habit_reminder_prefs (
  habit_id UUID PRIMARY KEY REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_time TIME NULL, -- optional per-habit preferred reminder time
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- REMINDER ACTION LOGS TABLE
-- Logs notification interactions (done, snooze, dismiss)
CREATE TABLE IF NOT EXISTS public.reminder_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('done', 'snooze', 'dismiss')),
  payload JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REMINDER DELIVERY FAILURES TABLE (Dead-letter queue)
-- Logs persistent push notification delivery failures
CREATE TABLE IF NOT EXISTS public.reminder_delivery_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits_v2(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  error TEXT NOT NULL,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
-- habit_reminder_prefs indexes
CREATE INDEX IF NOT EXISTS idx_habit_reminder_prefs_habit_id
  ON public.habit_reminder_prefs(habit_id);

-- reminder_action_logs indexes
CREATE INDEX IF NOT EXISTS idx_reminder_action_logs_user_id
  ON public.reminder_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_action_logs_habit_id
  ON public.reminder_action_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_reminder_action_logs_created_at
  ON public.reminder_action_logs(created_at);

-- reminder_delivery_failures indexes
CREATE INDEX IF NOT EXISTS idx_reminder_delivery_failures_user_id
  ON public.reminder_delivery_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_delivery_failures_created_at
  ON public.reminder_delivery_failures(created_at);

-- ROW LEVEL SECURITY
ALTER TABLE public.habit_reminder_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_delivery_failures ENABLE ROW LEVEL SECURITY;

-- HABIT REMINDER PREFS POLICIES
-- Users can read/write per-habit prefs for habits they own
DROP POLICY IF EXISTS "own_habit_reminder_prefs" ON public.habit_reminder_prefs;
CREATE POLICY "own_habit_reminder_prefs" ON public.habit_reminder_prefs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.habits_v2 WHERE id = habit_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.habits_v2 WHERE id = habit_id AND user_id = auth.uid())
  );

-- REMINDER ACTION LOGS POLICIES
-- Users can read their own logs; inserts allowed via service role or own user
DROP POLICY IF EXISTS "own_reminder_action_logs_select" ON public.reminder_action_logs;
CREATE POLICY "own_reminder_action_logs_select" ON public.reminder_action_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_reminder_action_logs_insert" ON public.reminder_action_logs;
CREATE POLICY "own_reminder_action_logs_insert" ON public.reminder_action_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REMINDER DELIVERY FAILURES POLICIES
-- Users can read their own failure logs; inserts are service-role only
DROP POLICY IF EXISTS "own_reminder_delivery_failures_select" ON public.reminder_delivery_failures;
CREATE POLICY "own_reminder_delivery_failures_select" ON public.reminder_delivery_failures
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass for inserts (service role has full access by default)
-- No additional policy needed for service role inserts

-- UPDATED_AT TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_habit_reminder_prefs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS habit_reminder_prefs_updated_at ON public.habit_reminder_prefs;
CREATE TRIGGER habit_reminder_prefs_updated_at
  BEFORE UPDATE ON public.habit_reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_habit_reminder_prefs_updated_at();
