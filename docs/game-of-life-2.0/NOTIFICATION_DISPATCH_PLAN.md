# Game of Life 2.0 — Notification Dispatch Plan

This plan documents how push reminders and Game of Life Coach nudges are scheduled, dispatched, and surfaced in demo mode.

## Goals
- Deliver habit reminders inside user-configured time windows without spamming.
- Send life wheel check-in nudges and Game of Life Coach nudges at respectful cadence.
- Keep demo mode aligned with production scheduling logic using mock previews.

## Data sources (shared)
- `notification_preferences` (`src/services/notifications.ts`)
  - `habit_reminders_enabled`, `checkin_nudges_enabled`, `habit_reminder_time`, `timezone`, `subscription`.
- `user_reminder_prefs` (`src/services/reminderPrefs.ts`)
  - Reminder window start/end, quiet hours, weekend skipping, timezone.
- `habit_reminder_prefs` (per-habit overrides).
- `habit_logs_v2` (completion guardrails).

## Dispatch pipeline (reminders)
1. **Scheduler trigger**
   - Use a Supabase scheduled trigger (cron) to call the edge function every 15 minutes.
   - Target function: `supabase/functions/send-reminders/index.ts`.

2. **Eligibility checks**
   - Confirm `notification_preferences.habit_reminders_enabled` is true.
   - Verify subscription exists.
   - Confirm current local time falls in `user_reminder_prefs.window_start` → `window_end`.
   - Skip during quiet hours or weekends (if configured).
   - Confirm habit is scheduled for today and not already completed.

3. **Delivery + logging**
   - Send web push with action buttons (Done/Snooze).
   - Log action outcomes in `reminder_action_logs`.
   - Log failed deliveries in `reminder_delivery_failures`.

## Dispatch pipeline (check-in nudges)
1. **Scheduler trigger**
   - Reuse the same cron schedule as reminders (15-minute cadence).
   - Extend `send-reminders` or introduce a lightweight `send-checkin-nudges` edge function.

2. **Eligibility checks**
   - `notification_preferences.checkin_nudges_enabled` is true.
   - Subscription exists.
   - Current local time is inside reminder window and outside quiet hours.
   - Guardrail: send at most once per day (store last sent timestamp in a dedicated table or telemetry event).

3. **Payload**
   - Short prompt encouraging a life wheel check-in and balance snapshot update.

## Dispatch pipeline (Game of Life Coach nudges)
1. **Scheduler trigger**
   - Nightly dispatch (recommended 20:00 local) via a dedicated cron schedule.

2. **Eligibility checks**
   - Same subscription + quiet hour checks as above.
   - Evaluate recent signals (examples):
     - No coach session in 3+ days.
     - Balance status = `rebalancing` for consecutive snapshots.
     - Stalled habit streaks (from habit logs).
   - Guardrail: max 2 coach nudges per week.

3. **Payload**
   - Friendly nudge to open the Game of Life Coach with a short suggested focus.

## Demo-mode parity
- Demo mode does **not** send push notifications.
- `NotificationPreferences` and `NotificationSettingsSection` render a **Demo schedule preview** list that mirrors the reminder window, check-in nudge timing, and Game of Life Coach timing derived from the same fields.
- Keep demo schedule entries aligned with the cadence described above.

## Test notes
- Manual verification:
  - Update notification preferences and confirm the demo schedule preview updates.
  - In a configured Supabase project, invoke `send-reminders` to validate habit reminder dispatch.
  - For check-in/coach nudges, verify preference gating and frequency limits once the edge function is extended.
