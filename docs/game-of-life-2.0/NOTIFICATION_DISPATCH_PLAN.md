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

## Manual Testing: Live Notification Send

### Prerequisites
1. A Supabase project with the `send-reminders` edge function deployed
2. Web Push VAPID keys configured in Supabase edge function environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
3. A test user account with at least one habit that has reminders enabled

### Test Setup
1. Create or use a test account (e.g., `test@lifegoalapp.com`)
2. Add a habit with a reminder time set to ~5 minutes from now
3. Ensure the browser has granted notification permission
4. Verify a push subscription exists in the `push_subscriptions` table

### Trigger Steps
1. Wait for the `send-reminders` cron to fire (every 15 minutes), OR
2. Manually invoke the edge function: `supabase functions invoke send-reminders`
3. Check the `scheduled_reminders` table — the reminder's `status` should change from `pending` to `sent`

### Expected Payloads
- **habit_reminder**: `{ title: "Habit Reminder", body: "Time to work on: [habit name]", data: { type: "habit_reminder", habit_id: "..." } }`
- **coach_nudge**: `{ title: "Game of Life Coach", body: "Your coach has a message for you", data: { type: "coach_nudge" } }`
- **checkin_nudge**: `{ title: "Life Wheel Check-in", body: "How was your day across each life area?", data: { type: "checkin_nudge" } }`
- **streak_warning**: `{ title: "Streak Alert", body: "Don't break your streak on [habit name]!", data: { type: "streak_warning", habit_id: "..." } }`

### Trigger Steps Per Notification Type

| Type | How to trigger |
|------|---------------|
| `habit_reminder` | Set a habit reminder time 5 minutes in the future; wait for the cron to fire or manually invoke `send-reminders`. |
| `streak_warning` | The `send-reminders` function emits a streak warning for the first enabled habit at 17:00 (local time). Fast-path: invoke the edge function while the current time is within 15 minutes of 17:00 or manually insert a `scheduled_reminders` row with `notification_type = 'streak_warning'`. |
| `checkin_nudge` | Trigger fires at 18:00 (local time). Invoke `send-reminders` near that time or insert a test row with `notification_type = 'checkin_nudge'`. |
| `coach_nudge` | Trigger fires at 20:30 (local time). Invoke `send-reminders` near that time or insert a test row with `notification_type = 'coach_nudge'`. |

### Verification
- A push notification appears on the test device
- The `scheduled_reminders` row is updated to `status: 'sent'`
- No errors in the edge function logs (`supabase functions logs send-reminders`)

## Demo Mode Testing

Demo mode does **not** send real push notifications. Use the schedule preview UI to verify without a live push subscription.

### Setup
1. Open the app without a valid Supabase session (or with `VITE_DEMO_MODE=true` if supported).
2. Navigate to **Settings → Notifications**.
3. Confirm the **Demo schedule preview** list renders upcoming reminders.

### Verifying all four reminder types
Run the following in the browser console (or in the app's developer panel) to inspect the mock schedule:
```js
import('/src/services/demoData.js').then(m => console.table(m.getDemoMockScheduledReminders()))
```
Expected output: 6 rows covering `habit_reminder` (×3), `streak_warning` (×1), `checkin_nudge` (×1), `coach_nudge` (×1).

### Verifying scheduleHabitReminders() in demo mode
```js
import('/src/services/habitAlertNotifications.js').then(m =>
  m.scheduleHabitReminders('demo-user').then(r => console.table(r))
)
```
Expected output: One or more `habit_reminder` rows, one `streak_warning` row, one `checkin_nudge` row, and one `coach_nudge` row — all with `status: 'pending'`.

### Persisted demo schedule
After calling `scheduleHabitReminders()` in demo mode, inspect `localStorage`:
```js
JSON.parse(localStorage.getItem('demo_scheduled_reminders') || '[]')
```
The array should match the rows returned by the function above.

## Troubleshooting

### Notifications do not appear
- **Browser permission denied**: Check `Notification.permission` in the console. If `'denied'`, re-enable via browser site settings (lock icon → Site Permissions → Notifications).
- **Service worker not registered**: Open DevTools → Application → Service Workers and confirm the SW status is `activated and running`.
- **No push subscription**: Check the `push_subscriptions` table in Supabase for your user ID. If missing, click the in-app "Enable push notifications" button again.
- **VAPID keys missing**: Verify `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` are set in the Supabase edge function environment.

### Reminder fires but no badge/sound
- **Focus / Do Not Disturb**: Disable system Focus or DND modes on the test device.
- **Silent push policy**: Some browsers require a recent user interaction. Reload the page and try again.

### iOS Safari limitations
- Web Push on iOS requires **iOS 16.4+** with the app installed to the Home Screen as a PWA.
- Push subscriptions are tied to the PWA instance; uninstalling and reinstalling resets the subscription. Re-subscribe after reinstalling.
- Background push delivery may be delayed when the device is in low-power mode.
- Confirm the manifest `display` field is `"standalone"` or `"fullscreen"` — Push API is not available in browser tabs on iOS.

### Edge function returns 401
- The Supabase JWT may have expired. Sign out and sign in again to refresh the session token.

### Reminders not rescheduled after cancellation
- After cancelling reminders via `cancelReminder()` or `cancelHabitNotifications()`, call `scheduleHabitReminders(userId)` to generate fresh pending rows.
- In demo mode, call `scheduleHabitReminders('demo-user')` in the console to repopulate `localStorage`.
