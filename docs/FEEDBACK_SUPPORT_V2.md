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

## Schema / policy updates

Migration: `0206_feedback_support_message_visibility_and_replies.sql`

- Expands `case_messages.message_type` check constraint:
  - `submission`, `user_reply`, `admin_reply`, `internal_note`, `status_change`, `reply_draft`
- Owner SELECT policy now allows only:
  - `submission`, `user_reply`, `admin_reply`, `status_change`
- Owner INSERT policy now allows only:
  - `submission`, `user_reply`

## Next recommended milestones

1. **Assignment + SLA fields**
   - Add `priority`, `assignee_admin_user_id`, `first_response_at`, `resolved_at`.
2. **Inbox filters and bulk actions**
   - Filter by status, category, feature area, age.
3. **Notifications**
   - Notify user on admin reply, notify admin on new case.
4. **Attachments**
   - Add screenshot uploads to case messages.
