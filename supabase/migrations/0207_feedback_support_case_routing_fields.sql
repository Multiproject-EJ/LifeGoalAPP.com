-- M31C: Add routing/ops fields for support case assignment and SLA tracking.

ALTER TABLE public.case_threads
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE public.case_threads
  ADD COLUMN IF NOT EXISTS assignee_admin_user_id uuid
    REFERENCES public.admin_users(user_id) ON DELETE SET NULL;

ALTER TABLE public.case_threads
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE INDEX IF NOT EXISTS case_threads_priority_status_idx
  ON public.case_threads(priority, status, created_at DESC);

CREATE INDEX IF NOT EXISTS case_threads_assignee_idx
  ON public.case_threads(assignee_admin_user_id, status, created_at DESC);
