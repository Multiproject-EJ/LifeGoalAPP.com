# Game of Life 2.0 — Shipped Features Reference

This document describes all shipped features of the Game of Life 2.0 layer. It is updated as of M12 (2026-03-08) and covers milestones M1–M11.

> **Architecture note**: Every feature has a demo-mode path. See [`DEMO_MODE_SETUP.md`](./DEMO_MODE_SETUP.md) for how demo and live modes differ.
>
> **Product philosophy note**: For app-level wisdom design principles (micro-insights, discovery over instruction, Socratic guidance), see [`../WISDOM_ENGINE_PRINCIPLES.md`](../WISDOM_ENGINE_PRINCIPLES.md).

---

## 1. AI Coach

**Key file**: `src/features/ai-coach/AiCoach.tsx` (867+ lines), `src/services/aiCoachInstructions.ts`

### Instruction system

`loadAiCoachInstructions()` builds the AI coach system prompt at runtime. It composes:

- `BASE_INSTRUCTIONS` — static personality rules from [`AI_COACH_PERSONALITY.md`](./AI_COACH_PERSONALITY.md).
- Per-user data access scoping — the caller passes a `dataAccess` map (goals, habits, journal, reflections, vision board). If a source is disabled, it is excluded from the prompt.
- **Habit environment notes** — optional `HabitEnvironmentContext[]` (one entry per habit carrying `habit_environment` text). When provided, the coach receives a bullet list of where/how each habit is performed.
- **Active goals context** — optional `GoalCoachContext[]` (goal title, status, life wheel category, progress notes). Added in M12/GOALS-A-P4 so the coach can tailor advice to open goals.
- **Telemetry difficulty adjustment** — `getTelemetryDifficultyAdjustment(userId)` returns a `minProgressStreak` number (default 14 days). When elevated, a coaching note is appended indicating the user has a strong track record and can be challenged with higher difficulty suggestions.

### Intervention types (4 triggers)

All four intervention types fire inside `AiCoach.tsx` via `handleInterventionAction()`:

| Trigger | Detection | Intervention copy |
|---|---|---|
| **Imbalance** | One balance axis is high while another is low | Offers a small rebalance quest for the low axis |
| **Habit struggle** | Habit streaks low or friction signals high | Proposes Seed/Minimum/Standard tier selection |
| **Overconfidence** | High-certainty language patterns detected | Runs a 30-second "red team" counter-reason exercise |
| **Fixation** | One domain dominates over consecutive sessions | Invites an open-options version of the current goal |

Firing an intervention emits a `intervention_accepted` telemetry event (respects opt-in toggle).

### Strategy assistant

`AiCoach.tsx` also hosts a topic-driven strategy assistant composed from `src/features/assistant`. Users can open a topic (e.g., "Balance review") and receive a guided Q&A flow. The coach session reuses the same system-prompt builder.

### Difficulty adjustment via telemetry

When `getTelemetryDifficultyAdjustment(userId)` returns a streak above the 14-day baseline (i.e., the user has many consistent completions), the AI coach system prompt receives an additional note: "This user has a strong recent streak — you can propose slightly higher-difficulty challenges." This adapts suggestions without requiring manual configuration.

---

## 2. Balance / Harmony Scoring

**Key files**: `src/services/balanceScore.ts`, `src/features/dashboard/ProgressDashboard.tsx`

### Axes

Four core life axes, each scored 0–100 from recent activity signals:

| Axis | Signal sources |
|---|---|
| **Agency** | Habit completions, actions completed, goal progress |
| **Awareness** | Journal entries, meditation sessions, life wheel check-ins |
| **Rationality** | Rationality prompts answered, belief updates logged |
| **Vitality** | Mood scores from journal/check-ins, meditation streaks |

Optional fifth axis: **Connection/Contribution** (community actions, gratitude entries).

### Thresholds

- **Green (Balanced)**: all axes ≥ 50 and no single axis deviates > 30 from the median.
- **Yellow (Rebalancing)**: one or more axes between 30–50 or a deviation > 30.
- **Red (Imbalanced)**: any axis < 30 or a deviation > 50.

### Dashboard panel

`ProgressDashboard.tsx` renders the balance widget: a radar/wheel diagram with per-axis scores, a colour-coded overall status badge (Balanced / Rebalancing / Imbalanced), and a trend arrow comparing today's snapshot to the last 7-day average.

### Harmony bonus XP

When the user's balance status is **Balanced**, daily habit completions award a **+20% harmony bonus** on top of base XP. The bonus is calculated in `src/services/gamification.ts` by reading the current balance snapshot before awarding XP.

---

## 3. Micro-quests

**Key file**: `src/features/dashboard/ProgressDashboard.tsx` (micro-quest generation and display)

### Daily quest generation

Three quest sources generate quests each day (generated fresh on dashboard load):

| Source | Example quest |
|---|---|
| **Balance source** | "Do 5 min of journaling to boost Awareness" |
| **Habit source** | "Complete your Morning Ritual habit today" |
| **Focus source** | "Spend 20 min on your top goal: Launch Beta" |

A **harmony bonus** applies to any quest completed while the user's balance status is Balanced: +25 bonus XP on top of the quest's base reward.

Completing a quest emits a `micro_quest_completed` telemetry event.

---

## 4. Push Notifications

**Key files**: `src/services/habitAlertNotifications.ts`, `src/services/demoData.ts` (`getDemoMockScheduledReminders`), `supabase/functions/send-reminders/index.ts`

See [`NOTIFICATION_DISPATCH_PLAN.md`](./NOTIFICATION_DISPATCH_PLAN.md) for the full dispatch pipeline.

### Core scheduling functions

| Function | Description |
|---|---|
| `scheduleHabitReminders(userId)` | Builds an upcoming reminder schedule from per-habit prefs; adds coach nudge at 20:30 and check-in nudge at 18:00; adds streak warning at 17:00 for the first enabled habit; upserts rows to `scheduled_reminders` in production |
| `getScheduledReminders(userId)` | Returns pending reminders from the `scheduled_reminders` Supabase table (production) or from the in-memory/localStorage cache (demo) |
| `cancelReminder(reminderId)` | Marks a reminder `cancelled` in the `scheduled_reminders` table (production) or in localStorage (demo) |

### Notification types dispatched

- `habit_reminder` — at the user's preferred reminder time for each enabled habit
- `streak_warning` — at 17:00 for the first enabled habit (guards against streak breaks)
- `checkin_nudge` — at 18:00 daily
- `coach_nudge` — at 20:30 nightly

### Edge function cron (`send-reminders`)

`supabase/functions/send-reminders/index.ts` is triggered on a 15-minute cron. It:
1. Queries `scheduled_reminders` for rows with `status = 'pending'` and `scheduled_at <= now()`.
2. Performs eligibility checks (subscription exists, quiet hours, weekend skipping, habit not already complete).
3. Sends the web push payload and updates `status` to `sent` or `failed`.

### Demo mock schedule

`getDemoMockScheduledReminders()` in `src/services/demoData.ts` returns 5 pre-built mock reminders covering all four notification types, providing a realistic preview without any Supabase calls. The demo Notification Preferences panel renders this list as a **Demo schedule preview**.

---

## 5. Auto-Progress Ladder (M4)

**Key files**: `src/features/habits/DailyHabitTracker.tsx`, `src/features/habits/progressGrading.ts`, `src/services/autoProgression.ts`

### Progress state classification

Each daily habit log carries a `progress_state` field (stored in `habit_logs_v2`):

| State | Meaning | Completion % |
|---|---|---|
| `done` | Fully completed | 100 |
| `done-ish` | Partial completion (chose "Done-ish ✨") | 70 |
| `skipped` | Intentional skip ("⏭️ Skip — intentional") | 0 |
| `missed` | Unintentional miss ("❌ Missed — unintentional") | 0 |

The `completion_percentage` field (0–100) is also persisted to `habit_logs_v2` alongside `progress_state`.

### Partial credit (0.7)

Done-ish days count as **0.7** toward streak and XP calculations:
- Streaks count done-ish days as partial credit (streak does not break).
- Weekly success-rate metrics weight done-ish completions by 0.7.
- Harmony bonus XP is still awarded on done-ish days.

### Tiers (Seed / Minimum / Standard)

Habits have a tier that determines the expected effort level:

| Tier | Daily target | Auto-upgrade trigger |
|---|---|---|
| Seed | 1 minute / minimal effort | 7+ consecutive done/done-ish days |
| Minimum | 5 minutes / partial target | 14+ days ≥ 70% weekly success rate |
| Standard | Full intended target | 21+ days ≥ 85% weekly success rate |

Tier downgrades happen when the success rate drops below the threshold for 3+ consecutive days.

### `progress_state` persistence

`logHabitCompletion()` in `src/services/habitsV2.ts` accepts `progress_state` and `completion_percentage` and writes them to `habit_logs_v2`. The UI in `DailyHabitTracker.tsx` passes these values from the classification button the user tapped.

### Coach environment notes

Each habit can carry a `habit_environment` text field (e.g., "Morning, kitchen, before coffee"). `loadAiCoachInstructions()` accepts an optional `habitEnvironments` parameter; when provided, environment notes appear in the coach system prompt under a "Habit Environments" section.

---

## 6. Telemetry System (M10)

**Key file**: `src/services/telemetry.ts`

### Minimal event list (always emitted)

| Event | Fired when |
|---|---|
| `onboarding_completed` | User finishes `GameOfLifeOnboarding` flow |
| `balance_shift` | Balance status changes (with deduplication guard) |
| `intervention_accepted` | User acts on a coach intervention |
| `micro_quest_completed` | User completes a daily micro-quest |
| `habit_done_ish_completed` | User marks a habit as done-ish |
| `habit_skipped` | User marks a habit as skipped |
| `habit_missed` | User marks a habit as missed |
| `habit_environment_updated` | User saves an updated `habit_environment` value |

All events respect the **opt-in toggle** set in Account → Settings → Telemetry.

### Opt-in toggle

`TelemetrySettingsSection` in account settings renders a toggle that calls `upsertTelemetryPreference(userId, enabled)`. `isTelemetryEnabled(userId)` is cached in memory after the first call and gates every `recordTelemetryEvent()` invocation.

### Difficulty adjustment wiring

`getTelemetryDifficultyAdjustment(userId)` queries recent `habit_done_ish_completed`, `habit_skipped`, and `habit_missed` events over the last 30 days. If the user has fewer than 3 missed days in 30 days, the function returns an elevated `minProgressStreak` value that flows into the AI coach system prompt (see Section 1).

### Demo-mode localStorage store

In demo mode, `recordTelemetryEvent()` calls `addDemoTelemetryEvent()` which appends to a `demoState.telemetryEvents` array in localStorage (capped at 100 entries). `getDemoTelemetryEvents()` reads these back. The demo state in `demoData.ts` is pre-seeded with 5 realistic events so the coach has history from first launch.

---

## 7. Holiday Treats Calendar

**Key files**: `src/services/treatCalendarService.ts`, `src/features/gamification/daily-treats/CountdownCalendarModal.tsx`, `supabase/functions/treat-calendar/index.ts`

See [`HOLIDAY_TREATS_CALENDAR_PLAN.md`](../../HOLIDAY_TREATS_CALENDAR_PLAN.md) for the full design spec.

### Redesign: from monthly rolling calendar to holiday advent

The original plan was a generic monthly calendar. The shipped feature is a **holiday-specific advent/countdown calendar** tied to the user's Holiday Preferences (set in account settings).

### Supported holidays

| Holiday | Door count | Window |
|---|---|---|
| Christmas | 25 | Dec 1–25 |
| Halloween | 31 | Oct 1–31 |
| Easter | ~30 | Mar 18 – Apr 25 |
| Valentine's Day | 3 | Feb 12–14 |
| New Year | 7 | Dec 26 – Jan 1 |
| Thanksgiving | ~28 | Nov 1–28 |
| Hanukkah | 9 | Dec 14–22 |
| St. Patrick's Day | 8 | Mar 10–17 |

### Key functions

| Function | Description |
|---|---|
| `getActiveAdventMeta(enabledHolidays?)` | Returns the currently-active holiday window (or null outside all windows) |
| `getAdventDoorCount(meta)` | Returns total advent doors for the given holiday |
| `fetchCurrentSeason(userId, holidayKey?)` | Fetches active season + hatches + progress (Supabase or demo) |
| `openTodayHatch(userId, seasonId, dayIndex)` | Claims today's advent door and returns reward payload |

### Demo data

`getDemoTreatCalendarData()` in `demoData.ts` returns a Christmas Advent season with 25 doors, holiday emojis, varied reward payloads, and the first 5 days pre-opened to show a realistic partial state.

### Database migration

- `0135_monthly_treat_calendar.sql` — `daily_calendar_seasons`, `daily_calendar_hatches`, `daily_calendar_progress`, `daily_calendar_rewards` tables with RLS.
- `0177_advent_calendar_holiday_key.sql` — adds `holiday_key` column to `daily_calendar_seasons`.

---

## 8. Timer / Pomodoro

**Key files**: `src/features/timer/timerSession.ts`, `src/App.tsx`, `src/features/gamification/daily-treats/`

### Timer launcher states

The timer button on the footer/Actions tab transitions through three states:

| State | Condition | UX |
|---|---|---|
| `idle` | No active session | Shows "Start timer" |
| `active` | Session started, age < 24h | Shows countdown + pause/stop |
| `alert` | Session started > 24h ago (stale) | Shows warning + clean-up option |

`deriveTimerLauncherState(session)` computes the current state from the stored session object.

### Stale session handling

`normalizeTimerSession(session)` is called on every app tick. If `session.startedAt` is more than 24 hours ago, the session is marked stale and the user is prompted to either archive it or discard it. This prevents phantom "active" sessions after forgetting to stop a session.

### Source types

Timer sessions carry a `sourceType` field indicating what triggered them:
- `manual` — user tapped "Start" directly
- `pomodoro` — launched from the Pomodoro Sprint game
- `habit` — linked to a specific habit

### Session preferences

Users can configure default Pomodoro duration (25 min default), short-break duration (5 min), and long-break interval (every 4 Pomodoros) in the timer preferences panel.

### Session plan mode

The timer supports a **session plan**: an ordered list of work/break blocks. The user can set up a session plan in the Actions tab and the timer will auto-advance through the blocks.

---

## 9. Goals Tab

**Key files**: `src/features/goals/GoalWorkspace.tsx`, `src/features/goals/goalStatus.ts`

### Workspace layout

The Goals tab (`GoalWorkspace.tsx`) is a workspace with:
- **Life goal input dialog** — a step-by-step modal for entering a new goal (title, description, target date, life wheel category, status tag).
- **Goal cards** — each card shows title, life wheel category, status badge, goal strength stars (0–5), and a completion % progress bar.
- **Keyboard navigation** — ← / → arrow keys move between goals.
- **"X of Y goals" counter** — header showing the current index in the goal list.

### Goal status tracking

Goal status uses a `status_tag` field:

| `status_tag` | Meaning | Completion % |
|---|---|---|
| `on_track` | Making steady progress | 50% |
| `at_risk` | Some friction or slowdown | 25% |
| `off_track` | Stalled or blocked | 10% |
| `achieved` | Goal completed | 100% |

`goalStatusToCompletionPct()` in `src/features/goals/goalStatus.ts` maps status to percentage.

### Goal strength

`computeGoalStrength(goal)` returns a 0–5 score based on: description length, target date set, life wheel category set, progress notes present, and status not `off_track`.

### Edit / delete

Goals can be edited inline on the card (title, description, dates, status) or deleted via a context menu.

### Life wheel category filters

The goal list can be filtered by life wheel category (agency, awareness, rationality, vitality, connection).

### AI coach goal context

When `dataAccess.goals` is enabled, `AiCoach.tsx` loads the active goals list and passes them as `GoalCoachContext[]` to `loadAiCoachInstructions()`. The coach's system prompt then includes a goals summary, enabling advice tailored to open goals.

The "Ask Coach" button on each goal card pre-fills the AI coach input with the goal title and current status, making it one-tap to get focused coaching.

### Linked habits and vision board

Each goal card displays:
- **Linked Habits** — habits with matching `goal_id` (fetched from `habits_v2`)
- **Vision Board items** — vision images with this goal in `linked_goal_ids` (fetched from `vision_images`)
- **Balance axis** — the life wheel category label mapped to a balance axis

### Celebration animation

When a goal is marked `achieved`, a `CelebrationAnimation` fires (confetti-style particle effect) alongside the XP award.

---

## 10. Island Game System

**Key area**: `src/features/gamification/level-worlds/`

The Island Game System (milestones M1B–M9) is the primary gamification metagame. It includes:
- HUD and navigation across 120 named islands
- Dice roll progression and stop-based encounters
- Egg hatchery, egg tiers, and hatching delays
- Boss encounters, shop, home island, and island run timer
- Shard/shield economy and wallet management
- Per-island egg state and progression markers

**Status**: ✅ Complete as of commit `6df53f9` (2026-03-07). See `docs/07_MAIN_GAME_PROGRESS.md` and `docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md` for detailed spec.

---

## Cross-cutting patterns

- **Demo mode**: every feature reads from `src/services/demoData.ts` when Supabase is not configured. See [`DEMO_MODE_SETUP.md`](./DEMO_MODE_SETUP.md).
- **Telemetry**: all user-action events are gated by `isTelemetryEnabled()`. Do not bypass this gate.
- **TypeScript**: all services use strict types from `src/lib/database.types.ts`. Adding a new column requires updating both the migration and the types file.
- **Integration map**: see [`INTEGRATION_MAP.md`](./INTEGRATION_MAP.md) for entry-point and data-flow details.
