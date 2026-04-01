-- M31A: Lock down case thread owner updates so status/closure remain admin-controlled.

-- Owners should not update case_threads directly in MVP.
-- This prevents tampering with admin-managed lifecycle fields such as status/closed_at.
DROP POLICY IF EXISTS "case_threads_owner_update" ON public.case_threads;
