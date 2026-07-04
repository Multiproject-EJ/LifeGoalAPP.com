-- ========================================================
-- PERSONAL QUEST CALENDAR CROSS-DEVICE SYNC
-- Migration 0271: Let authenticated clients provision their own
-- Personal Quest (Daily Momentum) season + hatches in Supabase so
-- "today" is a single server-backed truth on every device, instead
-- of falling back to per-device localStorage demo seasons.
-- ========================================================

-- 1. Allow 'dice' as a reward currency. Personal Quest doors award dice
--    directly (the client previously had to abuse the legacy 'diamond'
--    value and re-map it locally).
ALTER TABLE public.daily_calendar_hatches
  DROP CONSTRAINT IF EXISTS daily_calendar_hatches_reward_currency_check;
ALTER TABLE public.daily_calendar_hatches
  ADD CONSTRAINT daily_calendar_hatches_reward_currency_check
    CHECK (reward_currency IN ('gold', 'diamond', 'dice') OR reward_currency IS NULL);

-- 2. One Personal Quest season per user per week. Two devices provisioning
--    concurrently race on insert; the loser re-selects the winner's row.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_personal_quest_season_per_user_week
  ON public.daily_calendar_seasons (user_id_owner, starts_on)
  WHERE season_type = 'personal_quest' AND user_id_owner IS NOT NULL;

-- 3. Users may insert hatches only for seasons they own (personal quest /
--    birthday). Admin-seeded holiday seasons (user_id_owner IS NULL) remain
--    read-only for regular users.
DROP POLICY IF EXISTS "Users can insert hatches for their own seasons" ON public.daily_calendar_hatches;
CREATE POLICY "Users can insert hatches for their own seasons"
  ON public.daily_calendar_hatches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_calendar_seasons s
      WHERE s.id = season_id
        AND s.user_id_owner = auth.uid()
    )
  );

COMMENT ON INDEX public.uniq_personal_quest_season_per_user_week IS
  'Guarantees a single Supabase-backed Personal Quest season per user per ISO week so all devices share one "today".';

-- 4. Persist the consecutive-day streak server-side. Previously the streak
--    only existed in per-device localStorage, so it desynced across devices.
ALTER TABLE public.daily_calendar_progress
  ADD COLUMN IF NOT EXISTS streak_count integer;

COMMENT ON COLUMN public.daily_calendar_progress.streak_count IS
  'Consecutive-day open streak. Incremented when the previous open was yesterday, kept on same-day opens, reset to 1 after a missed day. Maintained by the treat-calendar edge function.';
