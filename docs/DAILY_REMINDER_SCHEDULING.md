# Daily Reminder Scheduling

This guide explains the daily reminder scheduling system with per-user preferences and idempotent delivery for LifeGoal App.

## Overview

The daily reminder scheduling system sends push notifications for habits within a user-defined time window. It supports:

- **Per-user timezone preferences**: Users can set their local timezone for accurate scheduling
- **Customizable reminder windows**: Define start and end times for daily reminders
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
  "window_end": "11:00"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "user_id": "uuid",
  "timezone": "America/Los_Angeles",
  "window_start": "09:00:00",
  "window_end": "11:00:00",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

### POST /cron

Triggers the daily reminder scheduler. This endpoint is designed to be called periodically (e.g., every 5 minutes) by a CRON job or scheduler.

**Flow:**
1. Queries all users with push subscriptions
2. Filters users whose local time is within their reminder window
3. Queries active habits for eligible users
4. Filters out habits that were already reminded today (idempotency)
5. Filters out snoozed habits
6. Sends push notifications
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

## Related Documentation

- [WEB_PUSH_REMINDERS.md](./WEB_PUSH_REMINDERS.md) - Web Push setup
- [NOTIFICATIONS_QUICK_START.md](../NOTIFICATIONS_QUICK_START.md) - Quick start guide
