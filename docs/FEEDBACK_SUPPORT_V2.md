# Feedback & Support V2 (Post-MVP)

This document tracks the transition from MVP case intake to a full support workflow.

## What shipped in V2

1. **Feature-area tagging at intake**
   - Users choose one feature area per request in `CaseSubmissionModal`.
   - Stored in `case_threads.metadata.feature_area` for triage grouping.

2. **Dedicated Admin Inbox entry point**
   - Account panel now has a direct **Open admin inbox** action for admins.
   - Advanced tools naming separated from admin inbox naming to reduce confusion.

3. **User-visible request timeline**
   - Added a **My feedback & support requests** panel in Account.
   - Users can view request threads and visible case messages.
   - Users can send follow-up replies on an existing case.

4. **Admin in-app replies**
   - Admin inbox now supports **Send reply** (visible to end user in timeline).
   - Private drafts remain available for internal drafting.

5. **Admin inbox filtering/search (triage speed-up)**
   - Added filters for status, case type, and feature area.
   - Added free-text search over subject/category/feature area/reference.
   - Added match counts and one-click clear filters.

6. **Message visibility hardening**
   - Added explicit `user_reply` and `admin_reply` message types.
   - Updated owner select policy so users cannot view `internal_note` or `reply_draft` messages.

7. **Routing controls (priority + assignee)**
   - Added priority and assignee controls in Admin Inbox.
   - Admin can save routing directly from selected thread detail.
   - Routing changes are recorded as system timeline events.

8. **SLA timestamps automation**
   - Added `resolved_at` column and SLA index support.
   - First admin reply now auto-stamps `first_response_at` and can move `new/triaged` to `waiting_on_user`.
   - Resolving/closing a case now stamps `resolved_at`.

9. **Unread indicators (in-app)**
   - Added per-thread read state storage for users/admins.
   - User and admin inbox lists now show a lightweight **New** indicator when thread activity is newer than last read time.

## Schema / policy updates

Migration: `0206_feedback_support_message_visibility_and_replies.sql`

- Expands `case_messages.message_type` check constraint:
  - `submission`, `user_reply`, `admin_reply`, `internal_note`, `status_change`, `reply_draft`
- Owner SELECT policy now allows only:
  - `submission`, `user_reply`, `admin_reply`, `status_change`
- Owner INSERT policy now allows only:
  - `submission`, `user_reply`

Migration: `0207_feedback_support_case_routing_fields.sql`

- Adds `case_threads.priority` (`low|normal|high|urgent`)
- Adds `case_threads.assignee_admin_user_id` (FK to `admin_users`)
- Adds `case_threads.first_response_at`
- Adds routing indexes for `(priority, status, created_at)` and `(assignee_admin_user_id, status, created_at)`

Migration: `0208_feedback_support_sla_timestamps.sql`

- Adds `case_threads.resolved_at`
- Adds SLA index over `first_response_at`, `resolved_at`, `status`, `created_at`

Migration: `0209_feedback_support_thread_reads.sql`

- Adds `case_thread_reads` table with per-user/per-role `last_read_at`
- Adds RLS for user/admin scoped read-state access
- Enables unread indicators in both inbox experiences

## Next recommended milestones

1. **SLA breach indicators**
   - Add thresholds + warning states for slow first response / resolution.
2. **Bulk triage actions**
   - Batch assignment/status/priority updates from the inbox list.
3. **Push/email notifications**
   - Notify user on admin reply, notify admin on new case.
4. **Attachments**
   - Add screenshot uploads to case messages.
