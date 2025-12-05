# Web Push Notifications - PWA Setup Guide

This guide explains how to set up Web Push notifications for LifeGoal App, with specific support for iOS Safari 16.4+ when the app is added to the Home Screen.

## Overview

Web Push allows your app to send notifications to users even when the browser isn't open. This is especially useful for:

- **Habit reminders** - Notify users when it's time for their daily habits
- **Goal milestones** - Celebrate when users reach progress milestones
- **Daily summaries** - Send end-of-day progress reports

### iOS Safari Requirements

For Web Push to work on iOS:

1. **iOS 16.4 or later** is required
2. The app must be **added to the Home Screen** (Add to Home Screen from Safari)
3. The app must have a valid **web app manifest** with `display: "standalone"`
4. User must **grant notification permission** through a user gesture (button click)

## Quick Start

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push authentication.

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys
```

This outputs something like:

```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls

=======================================
```

**Important:** Keep your private key secret! Never commit it to version control.

### 2. Configure Environment Variables

**Client-side** (`.env` or `.env.local`):
```env
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
```

**Server-side** (environment variables or secrets manager):
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
VAPID_CONTACT_EMAIL=mailto:your-email@example.com
```

For **Supabase Edge Functions**:
```bash
supabase secrets set VAPID_PUBLIC_KEY="your_public_key"
supabase secrets set VAPID_PRIVATE_KEY="your_private_key"
supabase secrets set VAPID_CONTACT_EMAIL="mailto:your@email.com"
```

### 3. Implement Subscription Storage

You need a server endpoint to store push subscriptions. Here's an example using Supabase:

**Database table:**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

**API endpoint** (`/api/save-subscription`):
```javascript
// Example Express.js endpoint
app.post('/api/save-subscription', async (req, res) => {
  const subscription = req.body;
  const userId = req.user.id; // From your auth middleware
  
  await db.query(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = $3, auth = $4, updated_at = now()
  `, [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
  
  res.json({ success: true });
});
```

### 4. Update index.html

The manifest link should already be in your `index.html`. Add Apple-specific meta tags:

```html
<head>
  <!-- Web App Manifest -->
  <link rel="manifest" href="/manifest.json" />
  
  <!-- iOS Home Screen support -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="LifeGoals" />
</head>
```

### 5. Subscribe Users to Push

**Using the vanilla JS script:**
```html
<script src="/register-push.js"></script>
<script>
  document.getElementById('enable-notifications').addEventListener('click', async () => {
    try {
      const subscription = await window.subscribeToPush('YOUR_VAPID_PUBLIC_KEY');
      console.log('Subscribed:', subscription);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  });
</script>
```

**Using TypeScript:**
```typescript
import { subscribeToPush } from './push-subscribe';

async function enableNotifications() {
  try {
    const subscription = await subscribeToPush(
      import.meta.env.VITE_VAPID_PUBLIC_KEY
    );
    console.log('Subscribed:', subscription);
  } catch (error) {
    console.error('Failed to subscribe:', error);
  }
}
```

### 6. Send Push Notifications

Use the provided Node.js script:

```javascript
const { sendHabitReminder } = require('./scripts/send-push-node');

// Get subscription from your database
const subscription = await getSubscription(userId);

// Send a habit reminder
await sendHabitReminder(
  subscription,
  'habit-123',
  'Morning Run',
  '🏃'
);
```

## Scheduling Reminders

For habit reminders, you need a scheduler to send notifications at the right time.

### Option 1: Cron Job

```bash
# Run every 15 minutes
*/15 * * * * node /path/to/send-scheduled-reminders.js
```

### Option 2: Bull Queue (Node.js)

```javascript
const Queue = require('bull');
const { sendHabitReminder } = require('./send-push-node');

const reminderQueue = new Queue('habit-reminders');

reminderQueue.process(async (job) => {
  const { subscription, habitId, habitTitle, habitEmoji } = job.data;
  await sendHabitReminder(subscription, habitId, habitTitle, habitEmoji);
});

// Schedule a reminder
reminderQueue.add({
  subscription,
  habitId: 'habit-123',
  habitTitle: 'Morning Run',
  habitEmoji: '🏃'
}, {
  delay: calculateDelay(reminderTime) // ms until reminder time
});
```

### Option 3: AWS EventBridge/CloudWatch

Create a rule to trigger a Lambda function:

```yaml
# serverless.yml
functions:
  sendReminders:
    handler: handlers.sendReminders
    events:
      - schedule: rate(15 minutes)
```

### Option 4: Supabase Edge Functions + pg_cron

```sql
-- Schedule function to run every 15 minutes
SELECT cron.schedule(
  'send-habit-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-reminders/cron',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  );
  $$
);
```

## Testing

### Test on Desktop

1. Open your app in Chrome or Firefox
2. Open Developer Tools → Console
3. Run:
   ```javascript
   await window.subscribeToPush('YOUR_VAPID_PUBLIC_KEY');
   ```
4. Allow the notification permission when prompted
5. Send a test push using the Node.js script

### Test on iOS (Add to Home Screen)

1. Open Safari on iOS 16.4+
2. Navigate to your app
3. Tap Share → Add to Home Screen
4. Open the app from the Home Screen
5. Tap a button that calls `subscribeToPush()`
6. Allow notifications when prompted
7. Send a test push using the Node.js script
8. The notification should appear on the device

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Push is not supported" | Check iOS version is 16.4+, app is opened from Home Screen |
| Permission denied | User declined notifications, can't re-prompt (must go to Settings) |
| Notification not showing | Check service worker is registered, check console for errors |
| "VAPID key error" | Ensure key is base64 URL-safe encoded, check for typos |
| Server error on save | Check your `/api/save-subscription` endpoint |

## File Reference

| File | Description |
|------|-------------|
| `public/manifest.json` | Web app manifest for PWA support |
| `public/service-worker.js` | Service worker for receiving push events |
| `public/register-push.js` | Vanilla JS for subscribing to push |
| `src/push-subscribe.ts` | TypeScript version for dev integration |
| `scripts/send-push-node.js` | Node.js script for sending push notifications |
| `api/vapid-public.js` | (Dev) Serverless endpoint to fetch VAPID public key |
| `api/save-subscription.js` | (Dev) Serverless endpoint to save subscriptions locally |
| `scripts/test-send.js` | (Dev) Script to send test notifications |

## Development-Only Endpoints & Test Script

> ⚠️ **WARNING**: The endpoints and script described in this section are for **local development and testing only**. Do NOT use them in production environments.

For quick end-to-end testing of Web Push without building a full backend, we provide three dev-only helpers:

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vapid-public` | GET | Returns the VAPID public key from `VAPID_PUBLIC` env var |
| `/api/save-subscription` | POST | Saves a PushSubscription to `.data/subscriptions.json` |

### Test Send Script

`scripts/test-send.js` reads stored subscriptions and sends a test notification to each.

### Quick Start Commands

```bash
# 1. Install web-push (one-time)
npm install web-push

# 2. Generate VAPID keys (one-time)
npx web-push generate-vapid-keys

# 3. Set environment variables (copy from step 2 output)
export VAPID_PUBLIC="your_public_key_here"
export VAPID_PRIVATE="your_private_key_here"

# 4. Start your dev server (make sure it serves /api routes)
npm run dev

# 5. In your app, subscribe to push (this saves to .data/subscriptions.json)
#    The app should POST the subscription to /api/save-subscription

# 6. Send test notifications
node scripts/test-send.js

# Or specify a custom subscriptions file:
node scripts/test-send.js /path/to/subscriptions.json
```

### Why These Are Dev-Only

- **`api/save-subscription.js`**: Uses local filesystem storage. Serverless platforms have ephemeral filesystems - files won't persist between invocations in production.
- **`scripts/test-send.js`**: Reads from local file, no authentication, uses hardcoded mailto contact.
- **No authentication**: These endpoints don't verify user identity.

For production, use:
- A proper database (Supabase, PostgreSQL, DynamoDB, etc.)
- Authenticated endpoints with user association
- A production-ready notification service or queue

## Security Considerations

1. **Never expose your VAPID private key** - Keep it server-side only
2. **Validate subscriptions** - Only allow authenticated users to save subscriptions
3. **Clean up old subscriptions** - Remove subscriptions when users log out or tokens expire
4. **Rate limit notifications** - Don't spam users with too many notifications
5. **Handle subscription changes** - Listen for `pushsubscriptionchange` events

## Related Documentation

- [HABITS_SETUP_GUIDE.md](../HABITS_SETUP_GUIDE.md) - Setting up habits
- [docs/WEB_PUSH_REMINDERS.md](./WEB_PUSH_REMINDERS.md) - Existing Web Push implementation details
- [Web Push MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Apple Web Push Documentation](https://developer.apple.com/documentation/usernotifications/sending_web_push_notifications_in_safari)
