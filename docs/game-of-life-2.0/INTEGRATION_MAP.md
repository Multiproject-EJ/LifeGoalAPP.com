# Game of Life 2.0 — Integration Map

## Overview
Game of Life 2.0 features are composed in `src/App.tsx`, which wires the main workspace navigation to feature entry points and supplies the current Supabase session (or demo session) to each feature module. Data access lives in `src/services/*` and is mediated by `src/lib/supabaseClient.ts`, which decides whether to use Supabase or demo data based on credentials + active session.

## Feature entry points (UI)
The primary UI surface is `src/App.tsx` (workspace navigation, routing-like switching). Key feature entry components:

- Dashboard: `src/features/dashboard/ProgressDashboard.tsx`
- Goals: `src/features/goals/GoalWorkspace.tsx`
- Habits: `src/features/habits/HabitsModule.tsx`, `src/features/habits/DailyHabitTracker.tsx`, `src/features/habits/UnifiedTodayView.tsx`
- Check-ins: `src/features/checkins/LifeWheelCheckins.tsx`
- Journal: `src/features/journal/Journal.tsx`
- Vision Board: `src/features/vision-board/VisionBoard.tsx`
- Meditation: `src/features/meditation/BreathingSpace.tsx`
- AI Coach: `src/features/ai-coach/AiCoach.tsx` (uses `src/features/assistant`)
- Achievements: `src/features/achievements/AchievementsPage.tsx`
- Power-ups: `src/features/power-ups/PowerUpsStore.tsx`
- Notifications: `src/features/notifications/NotificationPreferences.tsx`

## Data access + services
Services wrap all reads/writes and provide demo fallbacks. Most services follow the pattern: if `canUseSupabaseData()` then use Supabase; otherwise read/write demo state in `src/services/demoData.ts`.

- Goals: `src/services/goals.ts` → `goals` table; demo: `demoData.ts` (goals array)
- Habits + logs: `src/services/habitsV2.ts`, `src/services/habitMonthlyQueries.ts` → `habits_v2`, `habit_logs_v2`; demo: `demoData.ts` (habits + habitLogs)
- Journal: `src/services/journal.ts` → `journal_entries`; demo: `demoData.ts` (journalEntries)
- Check-ins: `src/services/checkins.ts` → `checkins`; demo: `demoData.ts` (checkins)
- Vision board: `src/services/visionBoard.ts` → `vision_images`; demo: `demoData.ts` (visionImages)
- Notifications prefs: `src/services/notifications.ts` / `src/services/reminderPrefs.ts` → `notification_preferences`; demo: `demoData.ts` (notificationPreferences)
- Gamification: `src/services/gamification.ts`, `src/services/gamificationPrefs.ts` → `gamification_profiles`, `gamification_notifications`; demo: localStorage-backed profile state, notifications are Supabase-only
- Achievements: `src/services/achievements.ts` → `achievements`, `user_achievements`; demo: Supabase required (no demo fallback in service)
- Power-ups + daily spin: `src/services/powerUps.ts`, `src/services/dailySpin.ts` → `power_ups`, `daily_spin_state`; demo: localStorage-backed state
- AI settings: `src/services/aiSettings.ts` → `ai_settings`; demo: local config
- Meditation: `src/services/meditation.ts`, `src/services/meditationReminders.ts` → `meditation_sessions`, `meditation_reminders`; demo: local state

## Demo-mode parity notes (data shape mirroring)
- Demo data definitions in `src/services/demoData.ts` use `Database` types from `src/lib/database.types.ts`, ensuring the demo data structures mirror Supabase row shapes.
- The `canUseSupabaseData()` gate in `src/lib/supabaseClient.ts` ensures parity by routing all service access through the same API signature (Supabase or demo).
- `src/services/demoSession.ts` creates a Supabase-like `Session` object with `user_metadata` so UI components behave the same in demo mode.

**Parity requirements to preserve in future milestones**
- When adding new fields to Supabase tables, update `demoData.ts` seed objects to include the same fields (or safe defaults) so demo mode mirrors Supabase data shape.
- When adding new services, include a demo fallback path using `canUseSupabaseData()` and demo helpers (e.g., `addDemoX`, `getDemoX`).

## Cross-feature dependencies (data flow map)
- **Gamification ↔ Core features**: `useGamification` is called from goals, habits, journal, check-ins, vision board, and quick actions to award XP and update streaks. Service layer lives in `src/services/gamification.ts` / `src/services/gamificationPrefs.ts`.
- **AI Coach ↔ Assistant**: `src/features/ai-coach/AiCoach.tsx` composes `src/features/assistant` for topic-driven coaching flows.
- **Goals ↔ Habits**: Habits reference goal IDs; habit seeds in demo data are linked to demo goals (`demoData.ts`).
- **Habits ↔ Vision Board**: Habit completions can trigger vision board activity and XP tracking (`DailyHabitTracker.tsx` uses `useGamification`).
- **Check-ins ↔ Dashboard**: Wellbeing wheel check-ins inform dashboard summaries (`ProgressDashboard.tsx` reads check-in data via services).
- **Notifications ↔ Habits/Journal**: Reminder preferences in `src/services/reminderPrefs.ts` influence habit/journal reminder UI and scheduling.

## Data flow sketch (high level)
1. `src/App.tsx` obtains session from `src/features/auth/SupabaseAuthProvider.tsx` or `src/services/demoSession.ts`.
2. Feature components call domain services (e.g., `src/services/goals.ts`).
3. Services choose Supabase or demo data based on `canUseSupabaseData()`.
4. UI updates are driven by returned data and shared hooks (e.g., `useGamification`).

## Reference files
- Supabase client + auth gating: `src/lib/supabaseClient.ts`
- Demo session + demo data: `src/services/demoSession.ts`, `src/services/demoData.ts`
- Supabase schema types: `src/lib/database.types.ts`
