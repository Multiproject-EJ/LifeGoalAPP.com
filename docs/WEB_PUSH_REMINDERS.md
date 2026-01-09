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

### 3. Set CRON Secret

The CRON endpoint uses a custom header to avoid Supabase Authorization conflicts.

**Generate CRON Secret:**
```bash
# Generate a strong random secret
openssl rand -hex 32
```

**Set in Supabase:**
```bash
supabase secrets set CRON_SECRET="your_generated_secret_here"
```

Or via Supabase Dashboard:
1. Go to Edge Functions → send-reminders → Secrets
2. Click "Add another"
3. Name: `CRON_SECRET`
4. Value: (paste your generated secret)
5. Click "Save"

**Important:** Keep this secret secure! Anyone with this secret can trigger reminders.

### 4. Database Migration

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

### 4. Configure CRON Job

To send automated reminders, you need to configure a CRON job that triggers the Edge Function every minute.

#### Step 1: Verify Edge Function Deployment

```bash
supabase functions list
# Should show: send-reminders (deployed)
```

#### Step 2: Set VAPID Keys as Secrets

If you haven't already set the VAPID keys:

```bash
# Generate keys if you haven't
npx web-push generate-vapid-keys

# Set as Supabase secrets
supabase secrets set VAPID_PUBLIC_KEY="your_public_key"
supabase secrets set VAPID_PRIVATE_KEY="your_private_key"
```

#### Step 3: Configure CRON Job in Supabase

**Important:** The CRON endpoint now uses a custom `x-cron-secret` header instead of Authorization to avoid Supabase header conflicts.

**Option A: Supabase Dashboard (Recommended)**

1. Go to **Edge Functions** → **send-reminders** in your Supabase dashboard
2. Click on **Settings** or **Invocations** tab
3. Look for **CRON Schedule** or **Scheduled Jobs** section
4. Add a new schedule:
   - **Schedule:** `* * * * *` (every minute)
   - **Path:** `/cron`
   - **Method:** POST
   - **Headers:** Add `x-cron-secret: YOUR_CRON_SECRET` (from Step 3 above)
5. Save the configuration

**Option B: Using pg_cron (Advanced)**

If you have access to pg_cron (Pro tier and above):

```sql
SELECT cron.schedule(
  'send-habit-reminders',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/send-reminders/cron',
    headers := jsonb_build_object(
      'x-cron-secret', 'YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

Replace:
- `YOUR_SUPABASE_URL` with your project URL
- `YOUR_CRON_SECRET` with the secret you generated in Step 3

**Option C: External CRON Service**

Use services like:
- **Cron-job.org** (free, simple)
- **EasyCron** (free tier available)
- **AWS EventBridge** (pay per use)
- **GitHub Actions** (free for public repos)

Configure to POST to:
```
https://YOUR_SUPABASE_URL/functions/v1/send-reminders/cron
```

With header:
```
x-cron-secret: YOUR_CRON_SECRET
```

#### Step 4: Test CRON Configuration

1. Go to **Account** → **Push Notification Test Panel** in the app
2. Click **"Check Configuration"** - should show ✅ VAPID Keys configured
3. Click **"Trigger CRON Now"** - should execute successfully
4. Check Edge Function logs for execution details

#### Step 5: Monitor CRON Execution

Monitor your CRON job execution:

1. **Supabase Dashboard:**
   - Go to Edge Functions → send-reminders
   - Check invocation logs for errors
   - Monitor execution times

2. **Test Panel:**
   - Use the diagnostic tools in the Push Notification Test Panel
   - Check reminder configuration
   - View user preferences

3. **Database Logs:**
   ```sql
   -- Check recent reminder logs
   SELECT * FROM reminder_logs
   ORDER BY created_at DESC
   LIMIT 20;
   
   -- Check reminder state
   SELECT * FROM habit_reminder_state
   ORDER BY last_reminder_sent_at DESC
   LIMIT 20;
   ```

#### Troubleshooting CRON

**CRON not triggering:**
- Verify CRON schedule is configured correctly
- Check Edge Function is deployed
- Verify VAPID keys are set as secrets
- Check service role key has correct permissions

**CRON triggering but no notifications:**
- Check users have push subscriptions
- Verify habits have reminder times configured
- Ensure users are within reminder time windows
- Check Edge Function logs for errors

**CRON timing out:**
- See [Push Notifications Scaling Guide](./PUSH_NOTIFICATIONS_SCALING_GUIDE.md)
- Consider implementing batch processing for 1,000+ users
- Check database query performance

## Edge Function Endpoints

### `GET /health`

Health check endpoint to verify the Edge Function is running and VAPID keys are configured.

**Response:**
```json
{
  "ok": true,
  "vapid_configured": true,
  "message": "Edge Function is healthy and ready to send notifications"
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

Trigger the reminder sending job (typically called by a CRON scheduler).

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
