# Training / Exercise Tab (PWA) — Dev Plan (Mobile-First)

## Goal
Design and build a **mobile-first Training / Exercise tab** that makes it easy to **track workouts, set simple strategy-based goals, and see progress at a glance**. The core focus is **tracking** with optional deeper planning.

## Principles
- **Mobile-first UI**: large touch targets, minimal typing, quick logging.
- **Tracking-first**: the fastest path is logging what you did.
- **Strategy-based**: users pick a simple strategy (duration, weekly, monthly, rolling, focus muscles, etc.).
- **Clarity over complexity**: if progress makes goal impossible, show that plainly.

---

## User Outcomes
- I can log a set in seconds.
- I can see how I’m doing vs. my chosen strategy.
- I understand whether I’m on track, behind, or unlikely to hit the target.
- I can switch strategies or add a new one without losing data.

---

## Core Data Model (MVP)
- **Exercise Log**
  - Date/time
  - Exercise name
  - Muscle group(s)
  - Reps / Sets / Weight (optional fields)
  - Duration (optional)
  - Notes (optional)
- **Strategy**
  - Type (weekly, monthly, rolling, duration-based, focus muscle, etc.)
  - Goal target (e.g., 100 squats/week)
  - Time window (week/month/rolling X days)
  - Focus muscles (optional)

---

## Strategy Ideas (Simple + Trackable)

### 1) Weekly Target Strategy
**Example:** 100 squats per week.
- Shows: `done 14 / 100` and predicts if goal is unreachable.
- Show “pace” (e.g., 14 by Wednesday → behind).

### 2) Monthly Target Strategy
**Example:** 2,000 pushups per month.
- Uses month-to-date totals and forecast.

### 3) Rolling Window Strategy
**Example:** 200 reps every 7 days rolling.
- Shows progress based on last X days.

### 4) Duration Strategy
**Example:** 150 active minutes per week.
- Focuses on total time instead of reps.

### 5) Focus Muscle Strategy (User-requested)
**Example:** Focus shoulders + glutes for 30 days.
- Log exercises with muscle tags.
- Show totals and goal (e.g., 100 shoulder reps, 100 glute reps).
- Forecast: “At current pace, you’ll finish ~40% by end.”

### 6) Streak Strategy
**Example:** 4 workout days per week.
- Tracks streak and weekly completion.

### 7) Variety Strategy
**Example:** 3 different exercise types per week.
- Encourages diversity (e.g., cardio, strength, mobility).

### 8) Progressive Load Strategy
**Example:** Increase total lifted weight weekly.
- Shows last week vs this week total load.

### 9) Micro-Goal Strategy (Daily)
**Example:** 20 squats per day.
- Easy check-in; roll-up to weekly progress.

### 10) Recovery Strategy
**Example:** 2 mobility sessions per week.
- Complements strength strategies.

---

## Key Screens (Mobile-first)

### 1) Training Tab Home
- **Quick Log** button (primary).
- **Today’s summary** (last log, total reps/time today).
- **Active Strategies list** (progress bars + forecast).
- **“On track / At risk / Unreachable” badge**.

### 2) Quick Log
- Select exercise or type new.
- Reps/sets/weight/duration (optional).
- Muscle tags (multi-select).
- Save in <10 seconds.

### 3) Strategy Detail
- Goal and progress timeline.
- Daily/weekly breakdown.
- Forecast indicator (likely vs unlikely).

### 4) Strategy Setup Wizard
- Choose strategy type.
- Pick timeframe + goal.
- Optional: focus muscles.

---

## UX Highlights
- **Minimal logging flow**: 2–3 taps max for common workouts.
- **Predictive feedback**: show if progress is insufficient to hit target.
- **Smart defaults**: suggests muscles based on exercise.

---

## MVP Deliverables
- Training tab with **Quick Log** and **Active Strategies list**.
- Weekly, monthly, rolling, focus muscle strategies.
- Progress bars + forecast label.
- Basic stats view (total reps/time).

---

## Stretch Features
- AI suggestions for strategy changes.
- Import from wearable data.
- Social/competition mode.
- Adaptive goal tuning.

---

## Implementation Phases

### Phase 1 — Design + Data
- Wireframes (mobile-first).
- Define data schema for logs + strategies.

### Phase 2 — Logging + Progress
- Quick log flow.
- Progress calculator (weekly/monthly/rolling).

### Phase 3 — Strategy Manager
- Setup wizard.
- Strategy details + edit.

### Phase 4 — Polish
- Forecast/insight indicators.
- Visual progress patterns.

---

## Notes
- Tracking is the key: the UI should always prioritize logging and progress visibility.
- Strategy logic should be modular so users can mix and match.
