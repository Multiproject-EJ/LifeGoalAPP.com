# Habits Module - SQL Patches and Setup Guide

This document provides the SQL patches you need to run in your Supabase SQL Editor to enable the comprehensive Habits module.

## 🆕 NEW: Push Notifications & Alerts

The habits module now includes **push notifications and alerts** for daily habit reminders! Users can:
- Receive notifications on their phone at scheduled times
- Mark habits as done or skip directly from notifications
- Set up to 3 reminder times per habit
- Get alerts even when the app is closed (PWA)

**See these guides for setup:**
- **Users**: See `/NOTIFICATIONS_QUICK_START.md` for 5-minute setup
- **Developers**: See `/DAILY_HABITS_ALERTS_GUIDE.md` for complete implementation details

## Overview

The Habits module adds:
- **Enhanced habit tracking** with boolean, quantity, and duration types
- **Web Push notifications** for habit reminders
- **Challenges & leaderboards** for social accountability
- **Auto-progression** to automatically increase difficulty
- **Comprehensive insights** with heatmaps, streaks, and success rates

## Prerequisites

1. A Supabase project (existing or new)
2. Access to your Supabase SQL Editor
3. The project URL and anon key

## SQL Migration Files

The migrations are located in `/supabase/migrations/`:

1. **0001_habits_core.sql** - Core habits schema (profiles, habits_v2, logs_v2, reminders, streaks view)
2. **0002_push.sql** - Web Push subscriptions table
3. **0003_challenges_autoprog.sql** - Challenges, members, and leaderboard view

## Installation Steps

### Step 1: Run Migration 0001 - Core Schema

Open your Supabase SQL Editor and run the contents of `supabase/migrations/0001_habits_core.sql`.

This migration creates:
- `profiles` table for user display names and timezones
- `habits_v2` table with enhanced fields (emoji, type, schedule, autoprog)
- `habit_logs_v2` table for logging completions
- `habit_reminders` table for notification scheduling
- `v_habit_streaks` view for calculating current and best streaks
- Row Level Security (RLS) policies for all tables

**Note:** This migration uses a `_v2` suffix to avoid conflicts with your existing `habits` and `habit_logs` tables. The new module will use these v2 tables.

### Step 2: Run Migration 0002 - Push Notifications

Run the contents of `supabase/migrations/0002_push.sql`.

This migration creates:
- `push_subscriptions` table for storing Web Push subscription endpoints
- RLS policies for push subscriptions

### Step 3: Run Migration 0003 - Challenges & Auto-Progression

Run the contents of `supabase/migrations/0003_challenges_autoprog.sql`.

This migration creates:
- `habit_challenges` table for creating habit challenges
- `habit_challenge_members` table for tracking challenge participants
- `v_challenge_scores` view for leaderboard data
- RLS policies for challenges

## Environment Variables

Add these environment variables to your project:

### For the Frontend (.env or .env.local)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### For Supabase Edge Functions

In your Supabase project settings → Edge Functions:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### Generating VAPID Keys

You can generate VAPID keys using the `web-push` npm package:

```bash
npx web-push generate-vapid-keys
```

Or use an online generator like [vapidkeys.com](https://vapidkeys.com/)

## Deploying Edge Functions

The Habits module includes two Supabase Edge Functions:

1. **send-reminders** - Handles Web Push subscriptions and reminder notifications
2. **auto-progression** - Runs daily to adjust habit difficulty automatically

### Deploy with Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy send-reminders
supabase functions deploy auto-progression
```

### Set up CRON jobs (optional)

For scheduled reminders and auto-progression:

1. Go to Supabase Dashboard → Edge Functions
2. Configure cron schedule for `auto-progression`: `0 2 * * *` (runs at 2 AM daily)
3. Configure cron schedule for `send-reminders`: `* * * * *` (runs every minute)

## Verification

After running the migrations, verify the setup:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('habits_v2', 'habit_logs_v2', 'habit_reminders', 'push_subscriptions', 'habit_challenges', 'habit_challenge_members', 'profiles');

-- Check views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('v_habit_streaks', 'v_challenge_scores');

-- Test RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Demo Data (Optional)

You can insert demo data to test the system:

```sql
-- Insert a test profile (replace with your user ID)
INSERT INTO public.profiles (user_id, display_name, tz)
VALUES ('your-user-id-here', 'Demo User', 'America/New_York');

-- Insert a test habit
INSERT INTO public.habits_v2 (user_id, title, emoji, type, schedule)
VALUES (
  'your-user-id-here',
  'Morning Exercise',
  '🏃',
  'boolean',
  '{"mode": "daily"}'::jsonb
);

-- Insert a test log
INSERT INTO public.habit_logs_v2 (habit_id, user_id, done)
VALUES (
  (SELECT id FROM habits_v2 WHERE title = 'Morning Exercise' LIMIT 1),
  'your-user-id-here',
  true
);

-- Insert a test challenge
INSERT INTO public.habit_challenges (owner_id, title, description, start_date, end_date, scoring)
VALUES (
  'your-user-id-here',
  '30-Day Fitness Challenge',
  'Complete your exercise habit for 30 days',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'count'
);
```

## Troubleshooting

### Migration Errors

**Error: relation already exists**
- The migration scripts use `IF NOT EXISTS` checks, but if you see this error, you may need to manually drop conflicting tables or use different table names.

**Error: permission denied**
- Ensure you're running the SQL as a database admin (not the anon key)
- RLS is enabled by default; make sure you're testing with a valid user session

### Edge Function Errors

**Error: function not found**
- Ensure you've deployed the functions using `supabase functions deploy`
- Check function logs in Supabase Dashboard

**Error: unauthorized**
- Verify your service role key is set in Edge Function secrets
- Check that the Authorization header is being passed correctly

## Next Steps

1. Run all three migrations in order
2. Set up environment variables
3. Deploy Edge Functions
4. Configure CRON schedules (optional)
5. Test the Habits UI in the "Set Up Habits" tab
6. Create your first habit using templates
7. Set up Web Push notifications (requires HTTPS)

## Support

For issues or questions:
- Check Supabase logs in Dashboard → Logs
- Review Edge Function logs
- Verify RLS policies are working correctly
- Ensure environment variables are set

## Architecture Notes

### Why _v2 Tables?

The migration creates `habits_v2` and `habit_logs_v2` tables to:
1. Avoid conflicts with existing `habits` and `habit_logs` tables
2. Allow gradual migration if needed
3. Preserve existing data

You can migrate data from old tables to new ones with:

```sql
-- Example migration from old to new habits table
INSERT INTO habits_v2 (id, user_id, title, type, schedule, created_at)
SELECT 
  id,
  (SELECT user_id FROM goals WHERE id = habits.goal_id LIMIT 1),
  name,
  'boolean'::habit_type,
  COALESCE(schedule, '{"mode": "daily"}'::jsonb),
  NOW()
FROM habits;
```

### Schedule JSON Format

The `schedule` column uses JSONB with these formats:

```json
// Daily
{"mode": "daily"}

// Specific days (0=Sun, 1=Mon, ..., 6=Sat)
{"mode": "specific_days", "days": [1, 3, 5]}

// Times per week
{"mode": "times_per_week", "value": 3}

// Every N days
{"mode": "every_n_days", "value": 2}
```

### Auto-Progression JSON Format

The `autoprog` column structure:

```json
{
  "mode": "times_per_week",
  "increase_by": 1,
  "every_weeks": 2,
  "max_value": 5,
  "min_success_rate": 0.75
}
```

## Files Reference

```
supabase/
├── migrations/
│   ├── 0001_habits_core.sql          # Core schema
│   ├── 0002_push.sql                 # Push notifications
│   └── 0003_challenges_autoprog.sql  # Challenges
└── functions/
    ├── send-reminders/
    │   └── index.ts                  # Push reminder handler
    └── auto-progression/
        └── index.ts                  # Auto-progression logic
```
