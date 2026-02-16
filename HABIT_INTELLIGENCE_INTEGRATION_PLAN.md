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

## Progress notes

### 2026-02-15 — Phase 1 / Step: Detection layer (state machine + thresholds)

Implemented (smallest shippable slice):
- Added a reusable habit health state classifier (`active`, `at_risk`, `stalled`, `in_review`) based on existing adherence snapshots + last-completed data, with thresholds from this plan (7-day adherence <40%, 14 days stale, 30 days in-review).
- Extended the existing `autoprog` state shape to support the proposed health metadata keys (`health_state`, `last_completed_at`, `review_due_at`, `review_reason`, `relaunch_from_habit_id`) while keeping backwards compatibility.
- Preserved those health metadata keys during auto-progress downshift/upgrade updates so existing updates do not wipe health state once we begin persisting it.
- Surfaced a lightweight status chip in Today checklist rows for non-active habits (`At risk`, `Stalled`, `Needs review`) without changing completion/scoring behavior.

Deferred to next step:
- Persisting computed health state back into `habits_v2.autoprog` on a schedule.
- Review queue entry point and actions (`pause`, `redesign`, `replace`, `archive`).
- Excluding `in_review` habits from score pressure.
- Auto-archive grace window handling.


### 2026-02-16 — Phase 1 / Step: Review queue entry point + remove in-review score pressure

Implemented:
- Added a **Habit Review** queue card in Today view for habits currently assessed as `in_review`, with first-pass actions: `pause`, `redesign`, `replace`, and `archive`.
- Wired review actions to existing persistence paths:
  - `pause` / `redesign` / `replace` now persist `autoprog.review_reason` via `updateHabitFullV2`.
  - `archive` uses existing `archiveHabitV2` and removes the habit from active UI immediately.
- Updated compact score math so `in_review` habits are excluded from today scoring pressure (`total`/`scheduled`/`completed` counts).
- Kept the normal checklist focused on active habits by removing `in_review` habits from the main actionable list once they enter the review queue.

Still deferred:
- Auto-archive after grace window (e.g., 14 days with no review action).
- AI-assisted redesign wizard handoff from the new review queue actions.

### 2026-02-16 — Phase 1 / Step: Auto-archive after review grace window

Implemented:
- Added an explicit auto-archive grace threshold (`autoArchiveGraceDaysAfterReviewDue = 14`) to the habit health rules.
- Added a reusable `shouldAutoArchiveHabitFromReview(...)` helper so review grace-window decisions are consistent and testable in one place.
- Wired an automatic cleanup effect in `DailyHabitTracker` that:
  - scans `in_review` habits,
  - checks `review_due_at` + grace threshold,
  - skips habits that already have a user review decision (`review_reason`),
  - archives expired habits via existing `archiveHabitV2`,
  - removes archived habits from local Today/completion state immediately.

Still deferred:
- AI-assisted redesign wizard handoff from review queue actions.
- Recovery/relaunch gamification hooks (`habit_review_completed`, `habit_relaunch_started`, `habit_relaunch_7day_success`).
- Risk-prioritized time-limited offer input (replace random-first behavior).


### 2026-02-16 — Phase 2 / Step: AI-assisted redesign handoff from review queue

Implemented:
- Wired `redesign` and `replace` review actions to generate an AI redesign draft using existing `generateHabitSuggestion(...)` with review-context prompts (habit name, health state, adherence, streak).
- Added rationale generation for the redesign draft via existing `buildEnhancedRationale(...)`, preserving fallback behavior when AI is unavailable.
- Surfaced the generated draft directly inside the Habit Review queue (suggested relaunch title + rationale) with an **Open in edit flow** CTA.
- Connected the CTA to existing habit edit UI so users can review and save the AI draft without introducing a new create/edit stack.

Still deferred:
- Recovery/relaunch gamification hooks (`habit_review_completed`, `habit_relaunch_started`, `habit_relaunch_7day_success`).
- Risk-prioritized time-limited offer input (replace random-first behavior).
