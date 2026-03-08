# Demo Mode Setup Guide

This guide explains how LifeGoalApp's demo mode works, what is mocked, what is real, and how to switch between demo and live (Supabase-backed) operation.

---

## Overview

Demo mode lets anyone explore LifeGoalApp with realistic data **without a Supabase account or any backend configuration**. All reads and writes are served from `src/services/demoData.ts` (in-memory seed data persisted to `localStorage`) rather than from Supabase.

Demo mode is detected and managed by `src/services/demoSession.ts`.

---

## What is mocked

The following are fully mocked in demo mode. No Supabase calls are made.

| Feature | Mock source | Persistence |
|---|---|---|
| **Habits** (CRUD + daily logs) | `demoData.ts` — `defaultState.habits` + `defaultState.habitLogs` | localStorage (`lifegoal:demo`) |
| **Goals** (CRUD) | `demoData.ts` — `defaultState.goals` | localStorage |
| **Journal entries** | `demoData.ts` — `defaultState.journalEntries` | localStorage |
| **Life wheel check-ins** | `demoData.ts` — `defaultState.checkins` | localStorage |
| **Vision board images** | `demoData.ts` — `defaultState.visionImages` | localStorage (no file upload) |
| **Goal reflections** | `demoData.ts` — `defaultState.goalReflections` | localStorage |
| **Notification preferences** | `demoData.ts` — `defaultState.notificationPreferences` | localStorage |
| **Gamification profile** (XP, level, streaks) | `gamificationPrefs.ts` — localStorage-backed profile | localStorage |
| **Daily spin wheel / power-ups** | `dailySpin.ts` / `powerUps.ts` — localStorage-backed state | localStorage |
| **Scheduled reminders** | `getDemoMockScheduledReminders()` — 5 pre-built mock reminders (habit_reminder × 2, streak_warning, checkin_nudge, coach_nudge) | In-memory |
| **Telemetry events** | `addDemoTelemetryEvent()` / `getDemoTelemetryEvents()` — appended to `demoState.telemetryEvents` | localStorage |
| **Holiday Treats Calendar** | `getDemoTreatCalendarData()` — Christmas Advent season, 25 doors, first 5 pre-opened | localStorage (`lifegoal:demo_treat_season`, `lifegoal:demo_treat_progress:*`) |
| **Island game state** | `islandRun*` services — localStorage-backed runtime state | localStorage |
| **User session** | `createDemoSession()` — mock Supabase Session with `DEMO_USER_ID` | In-memory (rehydrated on load) |
| **User profile** | `getDemoProfile()` — `displayName`, `onboardingComplete`, `aiCoachAccess` | localStorage |

---

## What is real (even in demo mode)

The following features require real infrastructure even in demo mode:

| Feature | What is real | Requirement |
|---|---|---|
| **AI Coach responses** | Actual OpenAI API call | `VITE_OPENAI_API_KEY` or `VITE_AI_GOAL_COACH_CHAT_URL` must be set |
| **Supabase Auth** | Auth state management is Supabase-backed when credentials are configured | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| **Vision board file upload** | Actual Supabase Storage upload | Supabase configured + storage bucket `vision-images-v2` created |

> **Note**: In pure demo mode (no `.env.local` configured), the AI Coach will render the input UI but API calls will fail or return an error. Set `VITE_OPENAI_API_KEY` (or deploy the `goal-coach-chat` edge function) to enable real AI responses.

---

## Known limitations of demo mode

1. **No real push notifications** — demo mode shows a schedule preview, but no actual web push is ever sent to the browser. The service worker push handler is not exercised.
2. **No server-side persistence** — all data lives in `localStorage`. Clearing browser storage or opening in a different browser/device resets everything to the seed state.
3. **No achievements** — `src/services/achievements.ts` has no demo fallback. The achievements page will not load correctly in demo mode.
4. **No meditation reminders** — `src/services/meditationReminders.ts` requires Supabase.
5. **No multi-device sync** — demo state is device-local.
6. **File upload not mocked** — uploading vision board images requires Supabase Storage; the upload path is not mocked in demo mode.
7. **Island game network calls** — some island game operations (egg hatching confirmation, shard sync) may require Supabase.

---

## Demo data seed

`src/services/demoData.ts` is the central demo data source. The `defaultState` export contains:

- **3 goals**: "Launch beta", "Design vision board", "Archive pilot insights"
- **25 habits** across 3 goals, each with realistic `habit_environment` and `done_ish_config` values
- **28 days of habit logs** with mixed `progress_state` values (`done`, `done-ish`, `skipped`, `missed`)
- **3 life wheel check-ins** with per-axis scores
- **5 journal entries** with moods and tags
- **4 actions** and 2 projects with tasks
- **5 telemetry events** pre-seeded (onboarding_completed, intervention_accepted × 2, balance_shift, micro_quest_completed)
- **Treat calendar**: Christmas Advent with 25 doors, first 5 pre-opened
- **Mock scheduled reminders**: 5 entries covering all 4 notification types

### Modifying demo data

To change the demo seed (e.g., add a new feature's demo state):
1. Edit `src/services/demoData.ts`.
2. Add your data to `defaultState` using the same TypeScript shape as the Supabase row type from `src/lib/database.types.ts`.
3. Add a `getDemo<Feature>()` helper function following the existing pattern.
4. In your service file, add a demo-mode branch: `if (!canUseSupabaseData()) { return getDemoMyFeature(); }`.

---

## Demo session detection

`src/services/demoSession.ts` exports two functions:

| Function | Description |
|---|---|
| `createDemoSession()` | Creates a mock Supabase `Session` object with `DEMO_USER_ID`, `'demo-access-token'`, and user metadata from `getDemoProfile()`. Role is `'authenticated'`. |
| `isDemoSession(session)` | Returns `true` if `session.user.id === DEMO_USER_ID`. Used throughout the app to branch demo vs. production code paths. |

The `canUseSupabaseData()` function in `src/lib/supabaseClient.ts` combines the session check with env-var availability to decide whether to use Supabase or demo data for each service call.

---

## How to toggle between demo and live mode

### Switching to live mode

1. Create a `.env.local` file in the project root (copy from `.env.example`):
   ```
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   VITE_SUPABASE_REDIRECT_URL="https://localhost:5173/auth/callback"
   VITE_VAPID_PUBLIC_KEY="your-vapid-public-key"
   VITE_OPENAI_API_KEY="your-openai-api-key"   # optional
   ```
2. Run all Supabase migrations: `supabase db push`.
3. Start the dev server: `npm run dev`.
4. Sign up with a real email address. The app will use Supabase instead of demo data.

### Switching back to demo mode

Demo mode activates automatically when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set, or when the user is not authenticated (and the app falls through to the demo session). To force demo mode during development:
1. Remove or comment out `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local`.
2. Restart the dev server.
3. The app will load with demo session and seed data.

### Inspecting demo state

All demo state is stored under the `lifegoal:demo` key in `localStorage`. You can inspect it in the browser DevTools:
```js
JSON.parse(localStorage.getItem('lifegoal:demo'))
```

To reset demo state to the seed defaults:
```js
localStorage.removeItem('lifegoal:demo')
// reload the page
```

---

## Reference

| File | Role |
|---|---|
| `src/services/demoData.ts` | Central demo data source: seed state, helpers (`getDemoHabits()`, `getDemoGoals()`, etc.), mock scheduled reminders, treat calendar demo data, telemetry demo events |
| `src/services/demoSession.ts` | Demo session creation (`createDemoSession()`) and detection (`isDemoSession()`) |
| `src/lib/supabaseClient.ts` | `canUseSupabaseData()` — the gate that routes every service call to Supabase or demo data |
| `src/lib/database.types.ts` | TypeScript types for all Supabase table rows; demo data shapes must match these types |
