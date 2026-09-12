-- Public launch waitlist for the sales landing page.
-- Anonymous visitors may insert an email, but no public role can read,
-- update, or delete waitlist rows.

CREATE TABLE IF NOT EXISTS public.public_launch_waitlist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  source TEXT NOT NULL DEFAULT 'world_home',
  landing_variant TEXT NOT NULL DEFAULT 'split_light_dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT public_launch_waitlist_email_length
    CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT public_launch_waitlist_email_shape
    CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  CONSTRAINT public_launch_waitlist_source
    CHECK (source = 'world_home'),
  CONSTRAINT public_launch_waitlist_variant
    CHECK (landing_variant = 'split_light_dark'),
  CONSTRAINT public_launch_waitlist_email_unique UNIQUE (email_normalized)
);

ALTER TABLE public.public_launch_waitlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_launch_waitlist FROM anon, authenticated;
GRANT INSERT ON TABLE public.public_launch_waitlist TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_launch_waitlist TO service_role;

REVOKE ALL ON SEQUENCE public.public_launch_waitlist_id_seq FROM anon, authenticated;
GRANT USAGE ON SEQUENCE public.public_launch_waitlist_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.public_launch_waitlist_id_seq TO service_role;

DROP POLICY IF EXISTS "public_launch_waitlist_insert" ON public.public_launch_waitlist;
CREATE POLICY "public_launch_waitlist_insert"
  ON public.public_launch_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source = 'world_home'
    AND landing_variant = 'split_light_dark'
    AND char_length(email) BETWEEN 3 AND 320
  );

COMMENT ON TABLE public.public_launch_waitlist IS
  'Email-only launch waitlist submitted from the public HabitGame sales landing page.';
