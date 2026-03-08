-- ========================================================
-- SCHEDULED REMINDERS TABLE
-- Migration 0176: Server-side reminder scheduling for the
-- send-reminders edge function cron dispatcher.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid,
  habit_title text,
  notification_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index used by the send-reminders cron query: fetch pending reminders due now
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status_scheduled_at
  ON public.scheduled_reminders (status, scheduled_at);

-- Index for per-user lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_user_id
  ON public.scheduled_reminders (user_id);

-- Row Level Security
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can view their own scheduled reminders"
  ON public.scheduled_reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can insert their own scheduled reminders"
  ON public.scheduled_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can update their own scheduled reminders"
  ON public.scheduled_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Users can delete their own scheduled reminders"
  ON public.scheduled_reminders FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.scheduled_reminders IS 'Upcoming push notification reminders written by the client and dispatched by the send-reminders edge function cron (every 15 minutes).';
