-- M31D: SLA timestamps for support lifecycle tracking.

ALTER TABLE public.case_threads
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS case_threads_sla_idx
  ON public.case_threads(first_response_at, resolved_at, status, created_at DESC);
