# Habit Intelligence Integration Plan (Reuse-First)

This plan is based on a repo scan and intentionally reuses existing habit, AI, and gamification systems.

## Current building blocks already in the app

- **Habit adherence snapshots (7/30 day)** are already computed and used in the app.
  - `src/services/adherenceMetrics.ts`
  - `src/features/habits/HabitsModule.tsx`
- **Habit classification + suggestions engine** already exists (`underperforming`, `stable`, etc.), including previewed schedule/target changes.
  - `src/features/habits/performanceClassifier.ts`
  - `src/features/habits/suggestionsEngine.ts`
- **AI rationale enhancement for habit suggestions** already exists with timeout + fallback.
  - `src/features/habits/aiRationale.ts`
- **Habit AI creation helper** already exists for generating habit templates from user intent.
  - `src/services/habitAiSuggestions.ts`
- **AI coach permissions and instruction system** already exists.
  - `src/services/aiCoachAccess.ts`
  - `src/services/aiCoachInstructions.ts`
  - `src/features/ai-coach/AiCoach.tsx`
- **Time-limited offer logic on Today/mobile view** is already in place.
  - `src/features/habits/DailyHabitTracker.tsx`
- **Archiving habits** already exists and can be reused for stale habit cleanup.
  - `src/services/habitsV2.ts`
- **Adjustment persistence / audit table support** already exists (`habit_adjustments`).
  - `src/services/habitAdjustments.ts`

## Product goal

Move from passive tracking to an active "Habit Intelligence" loop:

1. Detect drop-off and stale habits.
2. Remove stale habits from active scoring pressure.
3. Force a quick review flow ("What's wrong with this habit?").
4. Use existing AI systems to generate redesign options.
5. Reward recovery/relaunch in existing game loops.

## Proposed v1 architecture (no new AI stack required)

### 1) Detection layer (reuse adherence + logs)

Use existing adherence snapshots and streaks to compute state per habit daily:

- `active`: healthy adherence.
- `at_risk`: low 7-day adherence (e.g. <40%).
- `stalled`: 14 days without completion.
- `in_review`: 30+ days without completion.

Implementation notes:

- Read data from existing services:
  - `buildAdherenceSnapshots` in `src/services/adherenceMetrics.ts`
  - daily/week/month logs already loaded in `HabitsModule`/`DailyHabitTracker`
- Persist state in a small JSON object on habit row (recommended in `habits_v2.autoprog` extension), or a dedicated table in a follow-up migration.

### 2) Review queue and stale cleanup

When habit enters `in_review`:

- remove from the active Today score calculations,
- push to "Habit Review" queue,
- present user options: `pause`, `redesign`, `replace`, `archive`.

If no action after review grace period (e.g. 14 days), auto-archive using existing `archiveHabitV2`.

### 3) AI-assisted redesign (reuse existing AI modules)

Use existing AI modules rather than adding a new provider path:

- For explanation copy: `buildEnhancedRationale(...)` from `aiRationale.ts`.
- For redesigned version draft: call `generateHabitSuggestion(...)` in `habitAiSuggestions.ts` with contextual prompt:
  - original habit,
  - adherence profile,
  - failure reason selected by user,
  - requested downsizing style (Seed/Minimum/Standard).
- For broader context coaching and tone consistency: keep guidance aligned with `aiCoachInstructions.ts`.

### 4) Connect with existing Today time-limited offer

Current time-limited offer can be smarter by prioritizing `at_risk` habits over random picks:

- Replace random selection input with ranking from detection layer:
  - highest priority: `stalled`/`at_risk` non-completed habits,
  - fallback to current random behavior.
- Keep reward multiplier logic intact for fast rollout.

### 5) Gamification hooks (reuse existing XP/challenge events)

Add reward events without changing core progression economy:

- `habit_review_completed`
- `habit_relaunch_started`
- `habit_relaunch_7day_success`

These can map to existing XP/challenge pipelines already used on completion events in habits screens.

## Data model proposal (incremental)

### Option A (fastest): extend `autoprog` JSON in `habits_v2`

Add keys:

- `health_state`: `active | at_risk | stalled | in_review`
- `last_completed_at`
- `review_due_at`
- `review_reason`
- `relaunch_from_habit_id` (on new relaunch habits)

### Option B (cleaner): new `habit_health_events` table

Track state transitions and review decisions for analytics and future AI training.

## UX flow proposal

1. Habit crosses threshold -> status chip appears (`At risk` / `Needs review`).
2. Tap opens 60-90 second review wizard:
   - still meaningful?
   - too hard?
   - wrong time/cue?
   - environment friction?
   - wrong season of life?
3. User selects one action:
   - shrink,
   - retime,
   - replace,
   - pause/archive.
4. If redesign selected, show AI-assisted draft prefilled in existing habit edit/create UI.

## Rollout plan

### Phase 1 (rules only)

- Add state machine + thresholds.
- Add review queue UI entry point.
- Remove `in_review` habits from daily score pressure.
- Keep all AI optional.

### Phase 2 (AI redesign)

- Wire AI rationale + redesign drafts.
- Save suggested redesigns via existing `habit_adjustments` persistence.

### Phase 3 (gamified recovery)

- Add dedicated recovery XP hooks and challenge triggers.
- Upgrade time-limited offer selection to use risk ranking by default.

## Why this matches the current codebase

- Uses existing adherence/classification/suggestion logic instead of rewriting.
- Uses existing AI modules with fallback behavior already built.
- Uses existing archive functionality for stale cleanup.
- Uses existing gamification event pathways.
- Minimizes migration risk by allowing JSON-first storage.
