# Daily Habits Alerts & Push Notifications Setup Guide

## Overview

This guide explains how to set up and use push notifications and alerts for daily habits in the LifeGoal App PWA. Users can receive timely reminders on their phones to check off habits at scheduled times.

## Features

### What's Included

✅ **Push Notifications**: Receive notifications on your phone even when the app is closed  
✅ **Scheduled Reminders**: Set up to 3 reminder times per habit  
✅ **Quick Actions**: Mark habits as done or skip directly from notifications  
✅ **Day-Based Scheduling**: Reminders respect your habit schedule (daily, specific days, etc.)  
✅ **PWA Support**: Works on iOS and Android when installed as a PWA  
✅ **Offline Capability**: Notification settings are saved and sync when online  

## User Guide

### Enabling Push Notifications

1. **Open the Habits Tab**: Navigate to "Set Up Habits" in the app
2. **Create or Edit a Habit**: Go to Step 3 (Targets & Reminders)
3. **Enable Notifications**: Click the "Enable Push Notifications" button
4. **Grant Permission**: Allow notifications when your browser asks
5. **Set Reminder Times**: Enter up to 3 times when you want reminders (e.g., 08:00, 12:00, 18:00)
6. **Save Your Habit**: Complete the wizard

### Testing Notifications

After enabling notifications, you can test them:

1. **Click "Test Notification"**: In Step 3 of the habit wizard
2. **Check your device**: You should see a test notification appear
3. **Verify sound/vibration**: Ensure your device notification settings are correct

### Using Notification Actions

When you receive a habit reminder notification:

- **Mark Done**: Tap this to immediately log the habit as complete
- **Skip**: Tap this to skip the habit for today
- **Open App**: Tap the notification body to open the app to the habits page

### Managing Notifications

**To disable notifications**:
1. Go to your browser settings
2. Find the LifeGoal App site
3. Block notifications

**To change reminder times**:
1. Navigate to the habit in the app
2. Edit the reminder times
3. Save changes

## Developer Setup Guide

### Prerequisites

- A Supabase project
- VAPID keys for Web Push
- HTTPS domain (required for PWA and push notifications)

### Step 1: Generate VAPID Keys

VAPID keys are required for sending push notifications:

```bash
# Install web-push globally
npm install -g web-push

# Generate keys
web-push generate-vapid-keys

# Output:
# Public Key: BNxxx...
# Private Key: xxx...
```

Save both keys securely.

### Step 2: Configure Environment Variables

#### Frontend (.env or .env.local)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

#### Supabase Edge Functions

In your Supabase Dashboard → Edge Functions → Secrets:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### Step 3: Database Setup

The required tables should already exist if you ran the migrations:

- `habits_v2`: Stores habit information
- `habit_reminders`: Stores reminder times for habits
- `habit_logs_v2`: Logs habit completions
- `push_subscriptions`: Stores user push subscription endpoints

Verify with:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('habits_v2', 'habit_reminders', 'push_subscriptions');
```

### Step 4: Deploy Edge Function

Deploy the send-reminders edge function:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy send-reminders
```

### Step 5: Set Up CRON Job

To send reminders automatically:

1. Go to Supabase Dashboard → Edge Functions
2. Find the `send-reminders` function
3. Click "Configure" → "CRON Schedules"
4. Add schedule: `* * * * *` (runs every minute)
5. Set the endpoint path: `/cron`
6. Save

Alternatively, use Supabase SQL Editor:

```sql
-- This will call the edge function every minute
SELECT cron.schedule(
  'send-habit-reminders',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-reminders/cron',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Step 6: PWA Manifest Configuration

Ensure your `manifest.webmanifest` includes:

```json
{
  "name": "LifeGoalApp",
  "short_name": "LifeGoals",
  "display": "standalone",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

**Note on Icon Formats:**
While SVG icons work well for PWAs, some browsers have better notification support with PNG icons. For production deployments, consider adding PNG versions:

```json
{
  "src": "/icons/icon-192x192.png",
  "sizes": "192x192",
  "type": "image/png"
}
```

### Step 7: Service Worker Registration

The service worker should be registered in your app. Verify in `index.html` or main app file:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
```

## Testing

### Local Testing

1. **Enable notifications** in the app
2. **Create a test habit** with a reminder time 1-2 minutes in the future
3. **Wait for the reminder** - you should receive a notification
4. **Test notification actions** - try "Mark Done" and "Skip"

### Debugging

Check the browser console for:
- Service worker registration status
- Push subscription status
- Notification permission status

Check Supabase logs for:
- Edge function execution
- Database queries
- Push notification sending

### Common Issues

**Notifications not appearing**:
- Verify VAPID keys are correctly configured
- Check browser notification permissions
- Ensure HTTPS is enabled
- Verify service worker is registered

**CRON not running**:
- Check Supabase Edge Function logs
- Verify CRON schedule is configured
- Test the `/cron` endpoint manually

**Subscription fails**:
- Check VAPID public key format
- Verify service worker is active
- Check browser compatibility

## Browser Support

Push notifications work on:
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (iOS 16.4+, macOS)
- ✅ Samsung Internet
- ❌ iOS Safari (before 16.4)
- ❌ Opera Mini

## Mobile Installation

For the best experience:

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Allow notifications when prompted

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home Screen"
4. Allow notifications when prompted

## Architecture

### Flow Diagram

```
User Sets Reminder Time
        ↓
Stored in habit_reminders table
        ↓
Push subscription stored in push_subscriptions table
        ↓
CRON job runs every minute (send-reminders/cron)
        ↓
Queries due reminders
        ↓
Sends Web Push notifications
        ↓
User receives notification
        ↓
User taps action (Done/Skip)
        ↓
Service worker handles action
        ↓
Updates habit_logs_v2 table
        ↓
UI refreshes
```

### Components

1. **Frontend (habits.js, notifications.js)**
   - UI for managing notifications
   - Subscription management
   - Permission requests

2. **Service Worker (sw.js)**
   - Receives push notifications
   - Handles notification clicks
   - Manages notification actions

3. **Edge Function (send-reminders)**
   - CRON endpoint for scheduled sending
   - Web Push API integration
   - Subscription management

4. **Database**
   - habit_reminders: Reminder schedules
   - push_subscriptions: User endpoints
   - habit_logs_v2: Completion tracking

## Security & Privacy

- Push subscriptions are encrypted end-to-end
- Only the user can access their own subscriptions (RLS)
- Notifications are user-initiated and can be disabled anytime
- VAPID keys authenticate the server
- No sensitive data is sent in notifications

## Performance

- CRON runs every minute (minimal resource usage)
- Only sends to users with due reminders
- Invalid subscriptions are automatically cleaned up
- Batched operations for efficiency

## Future Enhancements

Potential improvements:
- Smart notification timing based on completion patterns
- Notification templates
- Rich media notifications
- Grouped notifications for multiple habits
- Custom notification sounds
- Location-based reminders

## Support

For issues:
1. Check browser console for errors
2. Verify VAPID keys are configured
3. Check Supabase Edge Function logs
4. Ensure HTTPS is enabled
5. Test with a simple notification first

## References

- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID](https://datatracker.ietf.org/doc/html/rfc8292)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

---

**Last Updated**: 2024-11-22  
**Version**: 1.0.0
