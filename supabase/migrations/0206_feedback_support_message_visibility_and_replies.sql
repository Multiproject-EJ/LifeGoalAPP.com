-- M31B: Promote support messaging from MVP drafts to visible two-way replies.
-- Adds explicit user/admin reply types and tightens owner-visible message policy.

ALTER TABLE public.case_messages
  DROP CONSTRAINT IF EXISTS case_messages_message_type_check;

ALTER TABLE public.case_messages
  ADD CONSTRAINT case_messages_message_type_check
  CHECK (
    message_type IN (
      'submission',
      'user_reply',
      'admin_reply',
      'internal_note',
      'status_change',
      'reply_draft'
    )
  );

-- Owners should only see end-user-safe messages.
DROP POLICY IF EXISTS "case_messages_owner_select" ON public.case_messages;
CREATE POLICY "case_messages_owner_select"
  ON public.case_messages
  FOR SELECT
  USING (
    message_type IN ('submission', 'user_reply', 'admin_reply', 'status_change')
    AND EXISTS (
      SELECT 1
      FROM public.case_threads thread
      WHERE thread.id = case_messages.thread_id
        AND thread.user_id = auth.uid()
    )
  );

-- Owners can create initial submissions and follow-up replies only.
DROP POLICY IF EXISTS "case_messages_owner_insert_submission" ON public.case_messages;
CREATE POLICY "case_messages_owner_insert_submission"
  ON public.case_messages
  FOR INSERT
  WITH CHECK (
    author_role = 'user'
    AND author_user_id = auth.uid()
    AND message_type IN ('submission', 'user_reply')
    AND EXISTS (
      SELECT 1
      FROM public.case_threads thread
      WHERE thread.id = case_messages.thread_id
        AND thread.user_id = auth.uid()
    )
  );
