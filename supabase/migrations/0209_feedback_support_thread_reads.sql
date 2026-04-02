-- M31E: Per-viewer read state for support thread unread indicators.

CREATE TABLE IF NOT EXISTS public.case_thread_reads (
  thread_id uuid NOT NULL REFERENCES public.case_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_role text NOT NULL CHECK (viewer_role IN ('user', 'admin')),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id, viewer_role)
);

CREATE INDEX IF NOT EXISTS case_thread_reads_user_role_idx
  ON public.case_thread_reads(user_id, viewer_role, updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_case_thread_reads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_thread_reads_updated_at ON public.case_thread_reads;
CREATE TRIGGER trg_case_thread_reads_updated_at
BEFORE UPDATE ON public.case_thread_reads
FOR EACH ROW EXECUTE FUNCTION public.update_case_thread_reads_updated_at();

ALTER TABLE public.case_thread_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_thread_reads_owner_select" ON public.case_thread_reads;
CREATE POLICY "case_thread_reads_owner_select"
  ON public.case_thread_reads
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND viewer_role = 'user'
    AND EXISTS (
      SELECT 1
      FROM public.case_threads thread
      WHERE thread.id = case_thread_reads.thread_id
        AND thread.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "case_thread_reads_owner_upsert" ON public.case_thread_reads;
CREATE POLICY "case_thread_reads_owner_upsert"
  ON public.case_thread_reads
  FOR ALL
  USING (user_id = auth.uid() AND viewer_role = 'user')
  WITH CHECK (
    user_id = auth.uid()
    AND viewer_role = 'user'
    AND EXISTS (
      SELECT 1
      FROM public.case_threads thread
      WHERE thread.id = case_thread_reads.thread_id
        AND thread.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "case_thread_reads_admin_select" ON public.case_thread_reads;
CREATE POLICY "case_thread_reads_admin_select"
  ON public.case_thread_reads
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND viewer_role = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users admin_row
      WHERE admin_row.user_id = auth.uid()
        AND admin_row.active = true
    )
  );

DROP POLICY IF EXISTS "case_thread_reads_admin_upsert" ON public.case_thread_reads;
CREATE POLICY "case_thread_reads_admin_upsert"
  ON public.case_thread_reads
  FOR ALL
  USING (user_id = auth.uid() AND viewer_role = 'admin')
  WITH CHECK (
    user_id = auth.uid()
    AND viewer_role = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users admin_row
      WHERE admin_row.user_id = auth.uid()
        AND admin_row.active = true
    )
  );
