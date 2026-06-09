-- ========================================================
-- DEMO WAITLIST
-- Migration 0253: captures email sign-ups from players who
-- reach the end of the demo (island 3) and opt in to be
-- notified when more islands unlock.
-- One row per user (upsert on conflict).
-- ========================================================

CREATE TABLE IF NOT EXISTS public.demo_waitlist (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  channel    TEXT        NOT NULL DEFAULT 'email',  -- 'email' | 'push'
  source     TEXT        NOT NULL DEFAULT 'island_3_gate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_waitlist ENABLE ROW LEVEL SECURITY;

-- Users can insert/update their own row.
DROP POLICY IF EXISTS "own_demo_waitlist_insert" ON public.demo_waitlist;
CREATE POLICY "own_demo_waitlist_insert" ON public.demo_waitlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_demo_waitlist_update" ON public.demo_waitlist;
CREATE POLICY "own_demo_waitlist_update" ON public.demo_waitlist
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_demo_waitlist_select" ON public.demo_waitlist;
CREATE POLICY "own_demo_waitlist_select" ON public.demo_waitlist
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all rows (for exporting the list).
DROP POLICY IF EXISTS "admin_demo_waitlist_select" ON public.demo_waitlist;
CREATE POLICY "admin_demo_waitlist_select" ON public.demo_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.active = true
    )
  );
