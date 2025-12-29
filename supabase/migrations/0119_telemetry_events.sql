-- ========================================================
-- TELEMETRY EVENTS + PREFERENCES
-- Migration 0119: Opt-in telemetry for adaptation loops
-- ========================================================

CREATE TABLE IF NOT EXISTS public.telemetry_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telemetry_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_preferences_user_id ON public.telemetry_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON public.telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON public.telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_occurred_at ON public.telemetry_events(occurred_at DESC);

ALTER TABLE public.telemetry_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own telemetry preferences" ON public.telemetry_preferences;
CREATE POLICY "Users can view their own telemetry preferences"
  ON public.telemetry_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own telemetry preferences" ON public.telemetry_preferences;
CREATE POLICY "Users can insert their own telemetry preferences"
  ON public.telemetry_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own telemetry preferences" ON public.telemetry_preferences;
CREATE POLICY "Users can update their own telemetry preferences"
  ON public.telemetry_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own telemetry events" ON public.telemetry_events;
CREATE POLICY "Users can view their own telemetry events"
  ON public.telemetry_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own telemetry events" ON public.telemetry_events;
CREATE POLICY "Users can insert their own telemetry events"
  ON public.telemetry_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_telemetry_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_telemetry_preferences_updated_at
  BEFORE UPDATE ON public.telemetry_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_telemetry_preferences_updated_at();

COMMENT ON TABLE public.telemetry_preferences IS 'Opt-in telemetry preferences for adaptation loops.';
COMMENT ON TABLE public.telemetry_events IS 'Minimal telemetry events used for adaptive recommendations.';
