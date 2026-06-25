# Admin-only in-app alert system investigation

Date: 2026-06-25

## Short answer

Yes, the app already has most of the pieces needed to build an admin-only in-app alert/messaging indicator for:

1. newly submitted feedback/support cases, and
2. new signed-up users.

The safest first version is a small admin-only alert bubble near the existing floating quick-actions button, opening the existing admin inbox. This can be built without exposing alerts to non-admin users because the app already checks `admin_users` through `isAdminUser`, and Supabase RLS already limits the feedback/support inbox to active admins.

## What already exists

### Admin allowlist

- `public.admin_users` is the existing app-level admin allowlist.
- Client code checks it through `isAdminUser(userId)`.
- The table's RLS policy only allows an active admin user to read their own admin row, so regular users cannot discover the admin list.

### Feedback/support inbox

- User feedback and support requests already save to `case_threads` plus an initial `case_messages` row.
- Admin tooling already lists all case threads through `listAllCaseThreads()` and renders them in `AdminInboxPanel`.
- Admin read tracking already exists through `case_thread_reads`, and `AdminInboxPanel` marks selected threads read for the admin.
- This means an unread-count alert for new feedback/support can use existing case tables and read-tracking instead of inventing a parallel inbox.

### Realtime pattern

- The app already subscribes to Supabase realtime inserts for gamification notifications in `useGamification`.
- A similar admin-only realtime subscription can listen to `case_threads` inserts and/or `case_messages` inserts after admin access has been positively resolved.

### Existing floating UI anchor

- `QuickActionsFAB` is rendered app-wide for authenticated sessions.
- The existing floating button is fixed in the bottom-right corner and is 60px by 60px.
- Adding a same-sized admin alert circle immediately above it is a natural fit and matches the requested placement.

## Gap analysis

### Feedback/support alerts are straightforward

The database and UI already support the core workflow:

1. user submits feedback/support,
2. row appears in `case_threads`,
3. admin can read it in `AdminInboxPanel`, and
4. read state can be compared against `case_thread_reads`.

Recommended MVP behavior:

- Only render after `isAdminUser(session.user.id)` returns `true`.
- Show count of open/unread `case_threads` where the current admin has no read row, or `thread.updated_at > read.last_read_at`.
- Subscribe to `case_threads` inserts and updates, and refresh the count.
- Clicking the bubble opens a modal/panel containing `AdminInboxPanel`.
- Mark read using the existing inbox behavior when a case is selected.

### New-user alerts need one small backend addition

Regular client code should not query `auth.users` directly. Supabase auth users are not normally readable from the browser, and making them readable would be the wrong security boundary.

Recommended backend options:

- **Best option:** add a public, RLS-protected `admin_user_events` or `admin_notifications` table populated by a trigger/service-role path when a new auth user is created.
- **Good enough if workspace profile creation is guaranteed:** create admin notifications when `workspace_profiles` or `profiles` rows are inserted. This is simpler but can miss signups that do not complete profile creation.

A general `admin_notifications` table would support both signup and feedback/support alert types:

- `id uuid primary key`
- `event_type text` such as `new_user`, `new_case`, `new_case_message`
- `actor_user_id uuid null`
- `case_thread_id uuid null`
- `title text`
- `body text`
- `metadata jsonb`
- `created_at timestamptz`

Then add an `admin_notification_reads` table keyed by `(admin_user_id, notification_id)` so each admin has their own read state.

## Recommended MVP implementation plan

### Phase 1: feedback/support-only alert bubble

1. Add a service such as `src/services/adminAlerts.ts` that:
   - checks admin access with the existing admin role service,
   - lists unread case counts,
   - subscribes to case thread/message changes, and
   - exposes a refresh method.
2. Add a hook such as `src/hooks/useAdminAlertSummary.ts` that resolves admin status and owns realtime cleanup.
3. Add an admin-only floating button near `QuickActionsFAB`:
   - same `60px` circle size,
   - placed above the existing FAB,
   - hidden on small mobile screens if the FAB is hidden, unless we also add a mobile menu entry,
   - displays a badge count and accessible label.
4. Reuse `AdminInboxPanel` inside a viewport-fixed modal to satisfy the modal guardrail.

This phase is low risk and uses existing RLS-protected tables.

### Phase 2: new-user signup notifications

1. Add Supabase migrations for an admin notification/event table.
2. Add RLS policies:
   - active admins can select/update read state,
   - regular users cannot select admin notifications,
   - inserts happen from trusted database trigger/service-role code only.
3. Populate `new_user` notifications from a trigger on `auth.users`, if allowed in the Supabase project, or from a trusted server/edge-function path.
4. Extend the alert summary to include both unread case alerts and unread signup alerts.

### Phase 3: richer messaging system

After the alert bubble exists, it can evolve into an admin message center:

- filters for signups, feedback, support, and user replies,
- quick counts by urgency/status,
- optional sound/haptic cues for admins,
- direct deep-link to a selected case,
- mobile menu admin alert entry if mobile FAB remains hidden.

## Security notes

- Do not render the admin alert UI until admin status is positively resolved.
- Do not depend on client-only hiding for security; rely on RLS and the `admin_users` allowlist.
- Do not expose `auth.users` to the client for signup alerts.
- Prefer per-admin read state so one admin reading a notification does not clear it for another admin.
- Keep this feature separate from Island Run gameplay state; it should not introduce gameplay writes or runtime-state mirrors.

## Suggested UI copy

- Button label: `Admin alerts`
- Empty state: `No new admin alerts.`
- Badge examples:
  - `3` for unread alerts
  - `9+` if count exceeds 9
- Panel title: `Admin alerts`
- Sections:
  - `New feedback/support`
  - `New signups`

## Recommendation

Build Phase 1 first. It gives immediate value for feedback/support notifications, validates the floating alert UX, and reuses existing secure admin infrastructure. Then add the signup notification backend in Phase 2, because that part should be implemented with a trusted server/database event source rather than browser access to Supabase auth users.
