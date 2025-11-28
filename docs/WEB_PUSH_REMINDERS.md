# Web Push Habit Reminders

This guide explains how to set up and use Web Push notifications for habit reminders in LifeGoal App.

## Overview

LifeGoal App supports Web Push notifications to remind users when it's time to complete their habits. The system consists of:

1. **Edge Function (`send-reminders`)** - Backend service that handles subscription storage and sends push notifications
2. **Service Worker (`sw.js`)** - Client-side handler for receiving and displaying push notifications
3. **Client Subscription Helper** - JavaScript utilities to subscribe to push notifications
4. **Test Panel UI** - Developer tools to test the push notification pipeline

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser/PWA   │────▶│  Edge Function  │────▶│  Push Service   │
│   (sw.js)       │◀────│ (send-reminders)│◀────│  (FCM/APNs)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Local Storage  │     │    Supabase     │
│  (IndexedDB)    │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘
```

## Setup

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push. Generate them using the `web-push` library:

```bash
npx web-push generate-vapid-keys
```

This outputs:
- **Public Key** - Used in the client to subscribe to push
- **Private Key** - Used in the Edge Function to send notifications

### 2. Configure Environment Variables

**Client (`.env` or `.env.local`):**
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

**Supabase Edge Function Secrets:**
```bash
supabase secrets set VAPID_PUBLIC_KEY=your_public_key_here
supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
```

### 3. Database Migration

Ensure the `push_subscriptions` table exists in your Supabase project:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
```

## Edge Function Endpoints

### `GET /health`

Health check endpoint to verify the Edge Function is running.

**Response:**
```json
{ "ok": true }
```

### `GET /prefs`

Get the current user's reminder preferences (timezone, reminder window).

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response (Success):**
```json
{
  "success": true,
  "prefs": {
    "user_id": "uuid",
    "timezone": "America/New_York",
    "window_start": "08:00:00",
    "window_end": "10:00:00",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### `POST /prefs`

Update the current user's reminder preferences.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "timezone": "America/New_York",
  "window_start": "09:00",
  "window_end": "11:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "prefs": {
    "user_id": "uuid",
    "timezone": "America/New_York",
    "window_start": "09:00:00",
    "window_end": "11:00:00"
  }
}
```

### `POST /subscribe`

Register a push subscription for the authenticated user.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRd...",
    "auth": "tBH..."
  }
}
```

**Response (Success):**
```json
{ "success": true }
```

**Response (Error):**
```json
{ "error": "Missing subscription fields" }
```

### `POST /log`

Log a habit completion from a notification action.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "habit_id": "uuid",
  "done": true,
  "value": 1
}
```

### `POST /cron`

Trigger the reminder sending job (typically called by a CRON scheduler). The endpoint implements idempotent delivery using the `habit_reminder_state` table to prevent duplicate notifications.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response (Success):**
```json
{
  "success": true,
  "message": "Sent 5 notifications, skipped 2",
  "reminders": 7,
  "sent": 5,
  "skipped": 2
}
```

**Features:**
- Respects per-user reminder window (only sends during configured hours)
- Idempotent delivery (won't send same reminder twice in one day)
- Respects snooze settings per habit
- Automatically cleans up invalid push subscriptions

## Database Tables

### `user_reminder_prefs`

Stores per-user reminder scheduling preferences.

```sql
CREATE TABLE public.user_reminder_prefs (
  user_id uuid PRIMARY KEY,
  timezone text NOT NULL DEFAULT 'UTC',
  window_start time NOT NULL DEFAULT '08:00:00',
  window_end time NOT NULL DEFAULT '10:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### `habit_reminder_state`

Tracks reminder delivery state for idempotent sending.

```sql
CREATE TABLE public.habit_reminder_state (
  habit_id uuid PRIMARY KEY,
  last_reminder_sent_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Client Usage

### Check Push Support

```typescript
import { isPushSupported } from '@/services/pushNotifications';

if (isPushSupported()) {
  console.log('Push notifications are supported!');
}
```

### Subscribe to Push Notifications

```typescript
import { 
  subscribeToPush, 
  sendSubscriptionToServer 
} from '@/services/pushNotifications';
import { getSupabaseClient } from '@/lib/supabaseClient';

async function enablePushNotifications(session) {
  // 1. Create browser subscription
  const subscription = await subscribeToPush();
  
  // 2. Register with server
  const client = getSupabaseClient();
  await sendSubscriptionToServer(
    subscription,
    client.supabaseUrl,
    session.access_token
  );
  
  console.log('Push notifications enabled!');
}
```

### Get Existing Subscription

```typescript
import { getExistingSubscription } from '@/services/pushNotifications';

const subscription = await getExistingSubscription();
if (subscription) {
  console.log('Already subscribed:', subscription.endpoint);
}
```

### Unsubscribe

```typescript
import { unsubscribeFromPush } from '@/services/pushNotifications';

const success = await unsubscribeFromPush();
if (success) {
  console.log('Unsubscribed from push notifications');
}
```

## Service Worker

The service worker (`public/sw.js`) handles:

1. **Push Event** - Receives and displays notifications
2. **Notification Click** - Opens the app or navigates to a specific page
3. **Notification Actions** - Handles "Mark Done" and "Skip" actions for habit reminders

### Notification Payload Format

```json
{
  "title": "Time for: 🏃 Morning Run",
  "body": "Mark it complete in LifeGoal App",
  "icon": "/icons/icon-192x192.svg",
  "badge": "/icons/icon-192x192.svg",
  "tag": "habit-uuid",
  "data": {
    "habit_id": "uuid",
    "url": "/#habits"
  },
  "actions": [
    { "action": "done", "title": "Mark Done" },
    { "action": "skip", "title": "Skip" }
  ]
}
```

## Test Panel UI

The Push Notification Test Panel is available in the Account settings under "Developer tools". It provides:

1. **Browser Support Check** - Verify push notifications work in the current browser
2. **Subscription Management** - Create and inspect push subscriptions
3. **Health Check** - Test the Edge Function is responding
4. **Server Registration** - Send subscription to the Edge Function
5. **Test Notification** - Send a local test notification

To access:
1. Navigate to Account settings
2. Scroll to "Push Notification Test Panel"
3. Use the buttons to test each step of the pipeline

## Reminder Schedule Settings

The Reminder Schedule Settings panel (also in Account settings) allows users to configure:

1. **Timezone** - IANA timezone identifier (e.g., `America/New_York`, `Europe/London`)
2. **Window Start** - Earliest time to receive reminders each day
3. **Window End** - Latest time to receive reminders each day

### Features:
- **Auto-detect timezone** - Click "Detect" to use browser's detected timezone
- **Test Scheduler** - Manually trigger the CRON job to test your configuration

### Usage:

```typescript
import { 
  fetchReminderPrefs, 
  updateReminderPrefs,
  triggerReminderCron 
} from '@/services/reminderPrefs';

// Fetch current preferences
const { data: prefs } = await fetchReminderPrefs(session.access_token);

// Update preferences
await updateReminderPrefs(session.access_token, {
  timezone: 'America/New_York',
  windowStart: '09:00',
  windowEnd: '11:00',
});

// Test the scheduler
const result = await triggerReminderCron(session.access_token);
console.log(result.message); // "Sent 3 notifications, skipped 1"
```

## Troubleshooting

### "VITE_VAPID_PUBLIC_KEY is not configured"

Ensure you have set the environment variable in your `.env` file:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### Notifications not showing

1. Check browser notification permissions
2. Verify the service worker is registered (check DevTools → Application → Service Workers)
3. Use the Test Panel to send a test notification

### "Unauthorized" error on /subscribe

Ensure you're passing a valid JWT access token in the Authorization header.

### Push notifications work locally but not in production

1. Verify VAPID keys are set in Supabase secrets
2. Check the Edge Function logs in Supabase dashboard
3. Ensure the service worker is served over HTTPS

## Related Documentation

- [HABITS_SETUP_GUIDE.md](./HABITS_SETUP_GUIDE.md) - Setting up habits
- [NOTIFICATIONS_QUICK_START.md](./NOTIFICATIONS_QUICK_START.md) - Quick start for notifications
- [HABIT_ALERTS_GUIDE.md](./HABIT_ALERTS_GUIDE.md) - Habit alerts configuration
