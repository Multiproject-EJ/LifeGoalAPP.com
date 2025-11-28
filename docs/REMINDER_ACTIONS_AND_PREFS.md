# Reminder Actions and Per-Habit Preferences

This guide documents the actionable notifications (Done/Snooze), per-habit reminder controls, and delivery reliability enhancements for LifeGoal App.

## Overview

The reminder system now supports:

- **Actionable notifications**: Done and Snooze buttons on push notifications
- **Per-habit reminder preferences**: Enable/disable reminders per habit with optional preferred time
- **Delivery reliability**: Retry logic with exponential backoff and dead-letter logging

## Database Schema

### habit_reminder_prefs

Stores per-habit reminder preferences.

| Column | Type | Description |
|--------|------|-------------|
| habit_id | UUID (PK) | Foreign key to habits_v2 |
| enabled | BOOLEAN | Whether reminders are enabled for this habit (default: true) |
| preferred_time | TIME | Optional preferred time for this habit's reminder |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### reminder_action_logs

Logs notification interactions for auditing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| user_id | UUID | Foreign key to auth.users |
| habit_id | UUID | Foreign key to habits_v2 |
| action | TEXT | One of: 'done', 'snooze', 'dismiss' |
| payload | JSONB | Optional additional data |
| created_at | TIMESTAMPTZ | When the action occurred |

### reminder_delivery_failures

Dead-letter queue for persistent push notification failures.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| user_id | UUID | Foreign key to auth.users |
| habit_id | UUID | Foreign key to habits_v2 |
| endpoint | TEXT | Push subscription endpoint that failed |
| error | TEXT | Error message |
| retry_count | INT | Number of delivery attempts |
| created_at | TIMESTAMPTZ | When the failure was logged |

## Notification Actions

Push notifications now include two action buttons:

- **Done**: Marks the habit as completed for today
- **Snooze**: Delays reminders for this habit by 1 day

### Service Worker Handling

The service worker (`public/sw.js`) handles notification clicks:

```javascript
// Handle notification actions
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'done' || event.action === 'snooze' || event.action === 'dismiss') {
    // Log action to server
    // For 'done': also log habit completion
    // For 'snooze': set snooze_until to now + 1 day
  }
});
```

### Action Flow

1. User receives push notification with Done/Snooze buttons
2. User clicks an action button
3. Service worker sends POST to `/send-reminders/log`
4. Server logs action to `reminder_action_logs`
5. If 'done': creates habit completion log
6. If 'snooze': sets `snooze_until` in `habit_reminder_state`

## Edge Function Endpoints

### POST /send-reminders/log

Log a notification action.

**Request Body:**
```json
{
  "habit_id": "uuid",
  "action": "done|snooze|dismiss",
  "payload": {} // optional
}
```

**Response:**
```json
{
  "success": true,
  "action": "done"
}
```

### GET /send-reminders/habit-prefs

Get per-habit reminder preferences for all user's habits.

**Response:**
```json
[
  {
    "habit_id": "uuid",
    "title": "Morning meditation",
    "emoji": "🧘",
    "enabled": true,
    "preferred_time": "08:00:00"
  }
]
```

### PUT /send-reminders/habit-prefs

Update per-habit reminder preference.

**Request Body:**
```json
{
  "habit_id": "uuid",
  "enabled": true,
  "preferred_time": "09:00" // or null to clear
}
```

**Response:**
```json
{
  "habit_id": "uuid",
  "enabled": true,
  "preferred_time": "09:00:00",
  "created_at": "...",
  "updated_at": "..."
}
```

### GET /send-reminders/action-logs

Get recent reminder action logs for debugging.

**Query Parameters:**
- `limit`: Max number of logs (default: 50, max: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "habit_id": "uuid",
    "action": "done",
    "payload": null,
    "created_at": "2024-01-15T09:30:00Z",
    "habits_v2": {
      "title": "Morning meditation",
      "emoji": "🧘"
    }
  }
]
```

## Delivery Reliability

### Retry Logic

Push notification delivery uses exponential backoff:

1. First attempt: immediate
2. Second attempt: after 500ms
3. Third attempt: after 2000ms

### Dead-Letter Logging

If all retry attempts fail:

1. Error logged to `reminder_delivery_failures` table
2. Includes user_id, habit_id, endpoint, error message, retry count
3. Invalid subscriptions (410 Gone, 404 Not Found) are automatically removed

### CRON Processing

The `/send-reminders/cron` endpoint:

1. Checks per-habit `enabled` flag - skips disabled habits
2. Checks `preferred_time` if set - only sends after that time
3. Respects existing snooze and idempotency logic
4. Uses retry logic for each notification
5. Logs persistent failures to dead-letter queue

## Frontend Components

### PerHabitReminderPrefs

Located at `src/features/notifications/PerHabitReminderPrefs.tsx`

Displays a list of user's habits with:
- Toggle to enable/disable reminders
- Optional preferred time input

### ReminderActionDebugPanel

Located at `src/features/notifications/ReminderActionDebugPanel.tsx`

Debug panel showing recent notification actions:
- Expandable panel in My Account
- Shows last 50 actions with habit info
- Displays action type and timestamp

## RLS Policies

### habit_reminder_prefs

- Users can read/write preferences for habits they own

### reminder_action_logs

- Users can read their own logs
- Users can insert their own logs

### reminder_delivery_failures

- Users can read their own failure logs
- Inserts require service role (automatic via Edge Functions)

## Testing

### Testing Notification Actions

1. Enable push notifications in browser
2. Trigger a test notification or wait for CRON
3. Click "Done" or "Snooze" on the notification
4. Check the action logs in My Account > Reminder Action Logs

### Testing Per-Habit Preferences

1. Go to My Account > Individual Habit Reminder Settings
2. Toggle reminder on/off for specific habits
3. Set preferred time for a habit
4. Wait for next CRON run to verify:
   - Disabled habits don't send notifications
   - Preferred time is respected within user window

### Testing Delivery Reliability

1. Simulate failures by temporarily blocking the push endpoint
2. Check Edge Function logs for retry attempts
3. Verify failures are logged to `reminder_delivery_failures`
4. Confirm invalid subscriptions are cleaned up

## Related Documentation

- [DAILY_REMINDER_SCHEDULING.md](./DAILY_REMINDER_SCHEDULING.md) - User preferences and scheduling
- [WEB_PUSH_REMINDERS.md](./WEB_PUSH_REMINDERS.md) - Web Push setup
- [NOTIFICATIONS_QUICK_START.md](../NOTIFICATIONS_QUICK_START.md) - Quick start guide
