# Quick Start Guide: Using Supabase with LifeGoalAPP

## TL;DR - You're Ready! ✅

Your LifeGoalAPP can **save, store, edit, and retrieve data** from Supabase right now for all core features.

## Setup in 3 Steps

### 1. Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
VITE_SUPABASE_REDIRECT_URL="https://www.lifegoalapp.com/auth/callback"
VITE_VAPID_PUBLIC_KEY="your-web-push-public-key"
```

### 2. Run Migrations

Apply all database migrations to your Supabase project:

```bash
# Using Supabase CLI
npx supabase db push

# Or manually run each migration file in order from supabase/migrations/
# in your Supabase SQL Editor
```

**Migration Files (run in order):**
1. `0001_habits_core.sql`
2. `0002_push.sql`
3. `0003_challenges_autoprog.sql`
4. `0101_vision_core.sql`
5. `0102_sharing_push.sql`
6. `0103_gratitude_mood.sql`
7. `0104_life_goals_extended.sql`
8. `0105_vision_images_url_support.sql`
9. ... (run all migrations in supabase/migrations/ folder in order)
10. `0124_vision_board_storage_bucket.sql` - **Required for Vision Board image uploads**

> **Important:** The `0124_vision_board_storage_bucket.sql` migration creates the storage bucket required for uploading images to the Vision Board. Without this migration, you will see a "Bucket Not found" error when trying to upload images (URL-based images will still work).

### 3. Start Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` - you're connected to Supabase!

## What You Can Do Immediately

### ✅ Goals & Planning
```typescript
import { fetchGoals, insertGoal, updateGoal, deleteGoal } from './services/goals';

// Create a new goal
const { data, error } = await insertGoal({
  user_id: userId,
  title: "Learn TypeScript",
  description: "Master advanced TypeScript concepts",
  target_date: "2025-12-31",
  life_wheel_category: "career"
});

// Fetch all goals
const { data: goals } = await fetchGoals();

// Update a goal
await updateGoal(goalId, { 
  progress_notes: "Completed 5 tutorials this week" 
});
```

### ✅ Goal Reflections
```typescript
import { insertReflection, fetchReflections } from './services/goalReflections';

// Add a reflection
await insertReflection({
  goal_id: goalId,
  user_id: userId,
  entry_date: "2025-11-15",
  confidence: 8,
  highlight: "Made great progress on TypeScript generics",
  challenge: "Still struggling with advanced mapped types"
});

// View reflections
const { data: reflections } = await fetchReflections(goalId);
```

### ✅ Life Wheel Check-ins
```typescript
import { insertCheckin, fetchCheckinsForUser } from './services/checkins';

// Create a check-in
await insertCheckin({
  user_id: userId,
  date: "2025-11-15",
  scores: {
    health: 8,
    career: 7,
    relationships: 9,
    finance: 6,
    personal_growth: 8,
    fun: 7,
    environment: 8,
    spirituality: 6
  }
});

// Fetch recent check-ins
const { data: checkins } = await fetchCheckinsForUser(userId, 12);
```

### ✅ Life Goal Steps & Alerts
```typescript
import { 
  insertStep, 
  fetchStepsForGoal, 
  insertAlert 
} from './services/lifeGoals';

// Add a step to a goal
await insertStep({
  goal_id: goalId,
  step_order: 1,
  title: "Complete TypeScript basics course",
  due_date: "2025-12-01"
});

// Create an alert
await insertAlert({
  goal_id: goalId,
  user_id: userId,
  alert_type: "deadline",
  alert_time: "2025-12-01T09:00:00Z",
  title: "Course deadline approaching",
  message: "Only 2 weeks left!",
  repeat_pattern: "once"
});
```

### ✅ Vision Board (Legacy)
```typescript
import { 
  uploadVisionImage, 
  fetchVisionImages,
  deleteVisionImage 
} from './services/visionBoard';

// Upload an image
const file = fileInput.files[0];
await uploadVisionImage(userId, file, "My dream home");

// Fetch all vision images
const { data: images } = await fetchVisionImages(userId);

// Delete an image
await deleteVisionImage(imageId);
```

### ✅ Notifications
```typescript
import { 
  fetchNotificationPreferences,
  updateNotificationPreferences 
} from './services/notifications';

// Get preferences
const { data: prefs } = await fetchNotificationPreferences(userId);

// Update preferences
await updateNotificationPreferences(userId, {
  habit_reminders_enabled: true,
  checkin_nudges_enabled: true,
  timezone: "America/New_York"
});
```

## Testing Your Connection

The app includes a built-in connection tester:

1. Sign in to your app
2. Navigate to Account/Settings
3. Look for "Supabase Connection Test"
4. Run the test to verify:
   - ✅ Read access to all tables
   - ✅ Write operations work correctly
   - ✅ Authentication is functioning
   - ✅ RLS policies are properly configured

## Demo Mode (No Supabase Required)

If you don't set up Supabase credentials, the app automatically runs in demo mode:

- ✅ All features work using `localStorage`
- ✅ Sample data is automatically seeded
- ✅ Perfect for development and testing
- ✅ Switch to real Supabase anytime by adding credentials

## Common Patterns

### Error Handling
```typescript
const { data, error } = await fetchGoals();
if (error) {
  console.error('Failed to fetch goals:', error.message);
  // Show user-friendly error message
} else {
  // Use data
  setGoals(data);
}
```

### Type Safety
```typescript
import type { Database } from './lib/database.types';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];
```

### Checking Supabase Availability
```typescript
import { 
  canUseSupabaseData, 
  hasSupabaseCredentials,
  hasActiveSupabaseSession 
} from './lib/supabaseClient';

if (canUseSupabaseData()) {
  // Use Supabase
  const { data } = await fetchGoals();
} else {
  // Use demo mode
  const data = getDemoGoals(DEMO_USER_ID);
}
```

## File Structure

```
src/
├── lib/
│   ├── supabaseClient.ts      # Supabase client setup
│   └── database.types.ts      # TypeScript types (generated)
├── services/                   # Data access layer
│   ├── goals.ts               # Goals CRUD
│   ├── goalReflections.ts     # Reflections CRUD
│   ├── checkins.ts            # Check-ins CRUD
│   ├── habits.ts              # Legacy habits CRUD
│   ├── lifeGoals.ts           # Steps/Substeps/Alerts CRUD
│   ├── visionBoard.ts         # Vision board CRUD
│   ├── notifications.ts       # Notification prefs
│   ├── pushNotifications.ts   # Push subscriptions
│   └── demoData.ts            # Demo mode fallbacks
└── features/                   # UI components
    └── account/
        └── SupabaseConnectionTest.tsx  # Connection tester
```

## Need Help?

1. **Check the full report**: See `SUPABASE_READINESS_REPORT.md` for complete details
2. **Review migrations**: Check `supabase/migrations/` for database schema
3. **Examine service examples**: Look at `src/services/goals.ts` for patterns
4. **Run the connection test**: Use the built-in tester in the app
5. **Check demo mode**: Review `src/services/demoData.ts` for expected data structure

## Advanced Features (Not Yet Implemented)

These features have database tables and TypeScript types but need service layer code:

- ⚠️ **Habits V2**: Enhanced habits with quantity/duration tracking
- ⚠️ **Habit Challenges**: Social challenges with leaderboards
- ⚠️ **Vision Board V2**: Multi-board support with sections and sharing (see [docs/VISION_BOARD_PLAN.md](./docs/VISION_BOARD_PLAN.md))

See `SUPABASE_READINESS_REPORT.md` for implementation guidance.

## Summary

✅ **You can save, store, edit, and retrieve data** for:
- Goals and goal reflections
- Life goal steps, substeps, and alerts
- Life wheel check-ins
- Legacy habits and habit logs
- Vision board images
- Notification preferences
- User profiles and workspace settings

✅ **Your app is production-ready** for all core features!

Happy coding! 🚀
