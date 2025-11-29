# Daily Reminder Scheduling

This guide explains the daily reminder scheduling system with per-user preferences and idempotent delivery for LifeGoal App.

## Overview

The daily reminder scheduling system sends push notifications for habits within a user-defined time window. It supports:

- **Per-user timezone preferences**: Users can set their local timezone for accurate scheduling
- **Customizable reminder windows**: Define start and end times for daily reminders
- **Quiet hours**: Define periods when no reminders should be sent (supports overnight ranges like 22:00–06:00)
- **Weekend skip**: Optionally disable reminders on Saturday and Sunday
- **Idempotent delivery**: Prevents duplicate reminders - each habit is reminded at most once per day
- **Snooze support**: Temporarily delay reminders for specific habits

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser/PWA   │────▶│  Edge Function  │────▶│  Push Service   │
│  (DailyReminder │◀────│ (send-reminders)│◀────│  (FCM/APNs)     │
│   Preferences)  │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │    Supabase     │
                        │  - user_reminder│
                        │    _prefs       │
                        │  - habit_reminder│
                        │    _state       │
                        └─────────────────┘
```

## Database Schema

### user_reminder_prefs

Stores per-user timezone and reminder window preferences.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK) | Foreign key to auth.users |
| timezone | TEXT | User's timezone (e.g., 'America/New_York') |
| window_start | TIME | Start of daily reminder window (default: 08:00:00) |
| window_end | TIME | End of daily reminder window (default: 10:00:00) |
| quiet_hours_start | TIME | Start of quiet period (null if not set) |
| quiet_hours_end | TIME | End of quiet period (null if not set) |
| skip_weekends | BOOLEAN | When true, skip reminders on Sat/Sun (default: false) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### habit_reminder_state

Tracks reminder delivery state for idempotency.

| Column | Type | Description |
|--------|------|-------------|
| habit_id | UUID (PK) | Foreign key to habits_v2 |
| last_reminder_sent_at | TIMESTAMPTZ | When the last reminder was sent |
| snooze_until | TIMESTAMPTZ | Snooze reminders until this time |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Edge Function Endpoints

### GET /prefs

Returns the current user's reminder preferences.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response:**
```json
{
  "user_id": "uuid",
  "timezone": "America/New_York",
  "window_start": "08:00:00",
  "window_end": "10:00:00",
  "quiet_hours_start": "22:00:00",
  "quiet_hours_end": "06:00:00",
  "skip_weekends": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### PUT /prefs

Update the current user's reminder preferences.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "timezone": "America/Los_Angeles",
  "window_start": "09:00",
  "window_end": "11:00",
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "06:00",
  "skip_weekends": true
}
```

All fields are optional. Only provided fields will be updated.
Note: `quiet_hours_start` and `quiet_hours_end` must both be set or both be null.

**Response:**
```json
{
  "user_id": "uuid",
  "timezone": "America/Los_Angeles",
  "window_start": "09:00:00",
  "window_end": "11:00:00",
  "quiet_hours_start": "22:00:00",
  "quiet_hours_end": "06:00:00",
  "skip_weekends": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

### POST /cron

Triggers the daily reminder scheduler. This endpoint is designed to be called periodically (e.g., every 5 minutes) by a CRON job or scheduler.

**Flow:**
1. Queries all users with push subscriptions
2. Filters users whose local time is within their reminder window
3. **NEW**: Filters out users with skip_weekends=true on Saturday/Sunday
4. **NEW**: Filters out users currently within their quiet hours
5. Queries active habits for eligible users
6. Filters out habits that were already reminded today (idempotency)
7. Filters out snoozed habits
8. Sends push notifications
7. Updates reminder state to prevent duplicates

**Response:**
```json
{
  "success": true,
  "message": "Sent 5 notifications",
  "habits": 5,
  "sent": 5
}
```

## Frontend Usage

### DailyReminderPreferences Component

The `DailyReminderPreferences` component provides a UI for users to manage their reminder preferences.

```tsx
import { DailyReminderPreferences } from '@/features/notifications';

function Settings({ session }) {
  return (
    <div>
      <h1>Settings</h1>
      <DailyReminderPreferences session={session} />
    </div>
  );
}
```

### Reminder Preferences Service

The `reminderPrefs` service provides programmatic access to reminder preferences.

```typescript
import {
  fetchReminderPrefs,
  updateReminderPrefs,
  getDetectedTimezone,
  COMMON_TIMEZONES,
} from '@/services/reminderPrefs';

// Fetch current preferences
const { data, error } = await fetchReminderPrefs(userId);

// Update preferences
await updateReminderPrefs(userId, {
  timezone: 'America/New_York',
  windowStart: '09:00',
  windowEnd: '11:00',
});

// Get browser's detected timezone
const detectedTz = getDetectedTimezone();
```

## CRON Setup

To enable automatic reminder delivery, configure a CRON job to call the `/cron` endpoint. Recommended frequency: every 5 minutes.

### Using Supabase CRON (pg_cron)

```sql
SELECT cron.schedule(
  'send-daily-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := '<supabase_url>/functions/v1/send-reminders/cron',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);
```

### Using External Scheduler

Configure your scheduler to make HTTP POST requests:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-reminders/cron \
  -H "Authorization: Bearer <service_role_key>"
```

## Idempotency

The system ensures each habit is reminded at most once per day per user:

1. When a reminder is sent, `habit_reminder_state.last_reminder_sent_at` is updated
2. Before sending, the system checks if `last_reminder_sent_at` is today in the user's timezone
3. If already reminded today, the habit is skipped

This design is safe for CRON jobs that run frequently (e.g., every minute).

## Timezone Handling

Reminders respect each user's configured timezone:

1. User sets their timezone (e.g., "America/New_York")
2. User sets their reminder window (e.g., 08:00 to 10:00)
3. When CRON runs, server calculates each user's local time
4. Users whose local time is within their window are eligible for reminders

### Supported Timezones

The UI provides common timezone options, but any IANA timezone identifier is supported:
- UTC
- America/New_York
- America/Los_Angeles
- Europe/London
- Asia/Tokyo
- etc.

## Snooze Feature

Habits can be snoozed to temporarily delay reminders:

```sql
-- Snooze habit for 2 hours
UPDATE habit_reminder_state
SET snooze_until = now() + interval '2 hours'
WHERE habit_id = 'habit-uuid';

-- Clear snooze
UPDATE habit_reminder_state
SET snooze_until = NULL
WHERE habit_id = 'habit-uuid';
```

Snoozed habits are skipped until `snooze_until` has passed.

## Troubleshooting

### Reminders not being sent

1. Verify push subscription exists in `push_subscriptions` table
2. Check user's timezone is valid (use Intl.supportedValuesOf('timeZone'))
3. Verify VAPID keys are configured in Edge Function secrets
4. Check Edge Function logs for errors

### Duplicate reminders

1. Verify `habit_reminder_state` table exists
2. Check RLS policies allow service role to update state
3. Ensure CRON job has proper authorization

### Wrong timezone

1. User can click "Detect" to auto-detect browser timezone
2. Verify timezone string is a valid IANA identifier
3. Check if reminder window crosses midnight (supported)

## Wiring "Done" to Completion

The "Done" notification action records a real habit completion with idempotency and UI feedback.

### Flow

1. **User clicks "Done"** on push notification
2. **Service Worker** sends POST to `/send-reminders/log` with `action=done` and `habit_id`
3. **Edge Function** checks if habit is already completed today (idempotency guard)
4. **If not completed**: Inserts into `habit_logs_v2` with `done=true`
5. **Returns response** with `{ ok: true, completed: true, was_already_completed: false }`
6. **Service Worker** broadcasts message to all open app windows
7. **HabitsModule** receives message, reloads logs, shows toast

### Idempotency

The system ensures only one completion per habit per day:

```typescript
// Edge Function helper
async function isHabitCompletedToday(supabase, userId, habitId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('habit_logs_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('date', today)
    .eq('done', true)
    .limit(1);
  return data?.length > 0;
}
```

### Response Format

```json
{
  "ok": true,
  "action": "done",
  "completed": true,
  "was_already_completed": false
}
```

### Action Logging

All notification actions are logged to `reminder_action_logs` with:
- `action`: "done", "snooze", or "dismiss"
- `payload`: `{ via: "push_action", already_completed: boolean }`

### UI Feedback

When a completion is recorded from a notification:
1. `HabitsModule` listens for `HABIT_ACTION_FROM_NOTIFICATION` messages
2. Reloads today's logs to update the checklist
3. Shows toast: "✓ Marked 'Habit Name' as done!" or "already completed today"

### Frontend Service

The `recordHabitCompletion` function in `src/services/habitsV2.ts` provides the same idempotent behavior for in-app completion:

```typescript
const { data, error } = await recordHabitCompletion(habitId, userId);
// data: { completed: true, wasAlreadyCompleted: boolean }
```

## Timezone Conversion Approach

The system uses the native `Intl.DateTimeFormat` API for robust timezone conversion, which:

- Automatically handles daylight saving time (DST) transitions
- Works with any valid IANA timezone identifier
- Provides accurate local time calculation on the server

### How it Works

```typescript
function getLocalTimeInTimezone(timezone: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  // Extract hours, minutes, and day of week
}
```

### DST Handling

When a user is in a timezone that observes DST:
- During the spring forward transition, the hour 2:00-2:59 AM doesn't exist
- During the fall back transition, the hour 1:00-1:59 AM occurs twice
- The `Intl` API handles these edge cases correctly by returning the actual local time

## Quiet Hours Behavior

Quiet hours define a period during which no reminders will be sent.

### Normal Range (e.g., 09:00–17:00)

Reminders are blocked when: `start <= current_time < end`

### Overnight Range (e.g., 22:00–06:00)

Overnight ranges (where start > end) are fully supported:
- Reminders are blocked when: `current_time >= start` OR `current_time < end`
- Example: 22:00–06:00 blocks reminders from 10 PM to 6 AM

### Clearing Quiet Hours

Set both `quiet_hours_start` and `quiet_hours_end` to `null` to disable quiet hours.

## Weekend Skip Rules

When `skip_weekends` is enabled:
- No reminders are sent on Saturday (day 6) or Sunday (day 0)
- The check uses the user's local timezone to determine the day

## Testing Guidance

### Simulating CRON Across Boundaries

1. **Test timezone conversion**:
   - Create users in different timezones
   - Trigger the CRON endpoint
   - Verify only users in their window receive reminders

2. **Test quiet hours**:
   - Set quiet hours for a user (e.g., 22:00–06:00)
   - Test at times inside and outside quiet hours
   - Verify reminders are blocked during quiet hours

3. **Test overnight quiet hours**:
   - Configure overnight range (start > end)
   - Test at 23:00 (should be blocked)
   - Test at 05:00 (should be blocked)
   - Test at 07:00 (should send)

4. **Test weekend skip**:
   - Enable `skip_weekends` for a user
   - Test on Saturday/Sunday (should be skipped)
   - Test on weekdays (should send normally)

### Verifying Analytics

After testing, verify that:
- Analytics send counts reflect the quiet hours filtering
- Weekend skips reduce the expected send count appropriately

### Edge Cases to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| DST spring forward (2:00 AM doesn't exist) | System uses actual local time |
| DST fall back (2:00 AM occurs twice) | System uses the standard time |
| Quiet hours same as window (e.g., 08:00–10:00) | No reminders sent |
| Window crosses midnight | Reminder sent if inside window |
| Quiet hours overlap with window partially | Reminders blocked during overlap |

## System Consolidation Note

The reminder system now operates **exclusively with Habits V2** (`habits_v2` table). The legacy `habit_alerts` table has been consolidated:

### Migration from Legacy Alerts

If your deployment previously used `habit_alerts`:

1. Run migration 0011 which translates `habit_alerts` → `habit_reminder_prefs`
2. Legacy `alert_time` → V2 `preferred_time`
3. Legacy `enabled` → V2 `enabled`
4. Legacy `days_of_week` → Embedded in habit's V2 schedule JSON

### Updated Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser/PWA   │────▶│  Edge Function   │────▶│  Push Service   │
│  (Per-Habit     │◀────│ (send-reminders) │◀────│  (FCM/APNs)     │
│   Preferences)  │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │  - habits_v2     │
                        │  - habit_reminder│
                        │    _prefs        │
                        │  - user_reminder │
                        │    _prefs        │
                        └──────────────────┘
```

### Service Updates

| Legacy Service | V2 Service |
|----------------|------------|
| `habitAlerts.ts` | `habitReminderPrefs.ts` |
| `fetchHabitAlerts()` | `fetchHabitReminderPrefs()` |
| `upsertHabitAlert()` | `updateHabitReminderPref()` |

For temporary compatibility, use `src/compat/legacyAlertsAdapter.ts`.

See [docs/MERGE_HABITS_SYSTEMS.md](MERGE_HABITS_SYSTEMS.md) for full migration guide.

## Related Documentation

- [WEB_PUSH_REMINDERS.md](./WEB_PUSH_REMINDERS.md) - Web Push setup
- [NOTIFICATIONS_QUICK_START.md](../NOTIFICATIONS_QUICK_START.md) - Quick start guide
- [MERGE_HABITS_SYSTEMS.md](MERGE_HABITS_SYSTEMS.md) - System consolidation guide
