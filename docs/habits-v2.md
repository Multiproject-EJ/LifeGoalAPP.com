# Habits V2 Documentation

This document describes the React-integrated habits system that uses the `habits_v2`, `habit_logs_v2`, and `v_habit_streaks` database entities.

## Overview

The habits feature enables users to create, track, and monitor habits that support their goals. The system uses:

- **`habits_v2`** – Habit definitions with emoji, title, type, schedule, and targets
- **`habit_logs_v2`** – Per-day/per-event completion logs
- **`v_habit_streaks`** – Computed streak data (current and best streaks)

The original vanilla implementation still exists at `/app/habits` as a reference, but the React-based feature is now the primary implementation for the application.

## Database Entities

### `habits_v2`
Stores habit definitions with the following key fields:
- `emoji` – Visual identifier for the habit
- `title` – Name of the habit
- `type` – One of: `boolean` (yes/no), `quantity` (numeric count), or `duration` (time-based)
- `schedule` – JSON object defining when the habit should be tracked (daily, specific days, x times per week)
- `target_num` – Target value for quantity/duration habits
- `target_unit` – Unit label (e.g., "glasses", "minutes")
- `archived` – Flag to soft-delete habits

### `habit_logs_v2`
Records individual completion events:
- `habit_id` – Reference to the parent habit
- `date` – Auto-generated date from timestamp
- `done` – Boolean completion flag
- `value` – Numeric value for quantity/duration habits (null for boolean habits)

### `v_habit_streaks`
Materialized or computed view providing streak analytics:
- `habit_id` – Reference to the habit
- `current_streak` – Number of consecutive days with completions
- `best_streak` – Highest streak achieved for this habit

## Key React Components

### `src/features/habits/HabitsModule.tsx`
Main container component that orchestrates the entire habits feature:
- Loads habits, logs, and streaks on mount
- Renders four main sections:
  - **Templates gallery** – Predefined habit templates from `/app/habits/templates.json`
  - **Habit wizard** – 3-step creation flow
  - **"Your habits"** – List of all active habits with metadata
  - **"Today's checklist"** – Daily completion tracking UI
- Integrates **Streaks** summary and **HabitsInsights** component
- Manages state for logging in-flight habit completions

### `src/features/habits/HabitWizard.tsx`
3-step wizard for creating new habits:
- **Step 1: Basics** – Emoji, title, and type selection
- **Step 2: Schedule** – Frequency configuration (every day, specific days, x per week)
- **Step 3: Targets & Reminders** – Target values, units, and optional reminder times
- Exports `HabitWizardDraft` type for passing data between components

### `src/features/habits/habitTemplates.ts`
Type definitions and loader for habit templates:
- `HabitTemplate` type matches `/app/habits/templates.json` structure
- `loadHabitTemplates()` fetches and validates template data
- Templates support pre-filled wizard initialization

### `src/features/habits/HabitsInsights.tsx`
Displays progress visualization for a selected habit:
- **31-day completion heatmap** – Visual grid showing logged days
- **Completion stats** – Total completions and success rate over 31 days
- Uses `listHabitLogsForRangeV2` to fetch historical data

### `src/services/habitsV2.ts`
Supabase service layer with TypeScript helpers:
- `listHabitsV2()` – Fetch all active habits for current user
- `createHabitV2()` – Create new habit
- `logHabitCompletionV2()` – Record a completion event
- `listTodayHabitLogsV2()` – Get today's completion status
- `listHabitStreaksV2()` – Fetch streak data for all habits
- `listHabitLogsForRangeV2()` – Query logs within a date range for insights

## Main User Flows

### Creating a Habit

**Via template:**
1. User clicks a template from the gallery
2. Wizard opens pre-filled with template data
3. User reviews/edits emoji, title, type, schedule, targets, and reminders
4. Wizard calls `createHabitV2()` → inserts into `habits_v2`
5. New habit appears in "Your habits" list

**From scratch:**
1. User clicks "+ New habit" button
2. Wizard opens with empty form
3. User completes all 3 steps
4. Wizard calls `createHabitV2()` → inserts into `habits_v2`

### Logging Completions

**Boolean habits:**
- User clicks "Mark done" button
- System calls `logHabitCompletionV2()` with `done: true`, `value: null`
- Entry saved to `habit_logs_v2`
- UI updates to show "Done" status

**Quantity/duration habits:**
- User enters numeric value in input field
- User clicks "Log" or "Log min" button
- System calls `logHabitCompletionV2()` with `done: true`, `value: <number>`
- Entry saved to `habit_logs_v2`
- UI shows completion with logged value

### Viewing Progress

**Streaks summary:**
- Displayed in dedicated "Streaks" section
- Shows current and best streak for each habit
- Data fetched from `v_habit_streaks` view via `listHabitStreaksV2()`

**31-day heatmap:**
- User selects a habit from dropdown in "Habit Insights"
- System queries logs via `listHabitLogsForRangeV2()` for last 31 days
- Heatmap renders with green squares for completed days, gray for incomplete
- Stats show total completions and success rate percentage

## Adding New Habit Capabilities

To extend the habits system with new features:

1. **Update database schema:**
   - Add new columns to `habits_v2` or `habit_logs_v2` tables
   - Run migrations in Supabase or add to `/supabase/migrations/`

2. **Update TypeScript types:**
   - Regenerate `src/lib/database.types.ts` from Supabase schema
   - Update `HabitV2Row` and `HabitLogV2Row` exports in `src/services/habitsV2.ts`

3. **Extend wizard:**
   - Add new fields to `HabitWizardDraft` interface in `HabitWizard.tsx`
   - Add UI inputs to appropriate wizard step
   - Update `handleCompleteDraft()` in `HabitsModule.tsx` to include new fields in insert payload

4. **Update logging UI:**
   - Modify checklist rendering in `HabitsModule.tsx` to display new fields
   - Add handlers for new logging interactions if needed
   - Update `logHabitCompletionV2()` calls with additional data

5. **Add service functions:**
   - Create new query helpers in `src/services/habitsV2.ts` if custom data access is required
   - Follow existing patterns for error handling and type safety

## Applying Suggestions

The habits system supports AI-driven performance suggestions that can be applied to adjust habit schedules and targets. This feature requires:

1. **Environment variable:** Set `VITE_ENABLE_HABIT_SUGGESTIONS=1` to enable the Apply button in the UI.
2. **Database migration:** Run `supabase/migrations/0005_habit_adjustments.sql` to create the `habit_adjustments` table for auditing.

### How It Works

1. **Classification:** When viewing Adherence metrics, each habit is classified based on 7-day and 30-day adherence percentages and current streak:
   - **Underperforming:** Low adherence (< 45%) or broken streak → suggests "ease" (reduce frequency/targets)
   - **High performer:** Strong adherence (>= 85%) with sustained streak → suggests "progress" (increase frequency/targets)
   - **Stable:** Moderate adherence (45-80%) → suggests "maintain" (no changes)
   - **Observe:** Borderline cases → suggests monitoring before changes

2. **Preview Changes:** For "ease" and "progress" suggestions, a preview of the proposed change is shown:
   - Schedule changes: Adjust `timesPerWeek` or `intervalDays`
   - Target changes: Adjust `target_num` for quantity/duration habits

3. **Guardrails:** All changes are clamped to safe values:
   - `timesPerWeek`: 1–7
   - `intervalDays`: 1–30
   - `target_num`: Minimum 0.5 for quantity/duration habits; `null` for boolean habits

4. **Auditing:** When a suggestion is applied:
   - The `habit_adjustments` table records the suggestion with `applied=true`
   - Before/after values for schedule and target are stored
   - The habit is updated in `habits_v2`

### UI Behavior

- The **Apply** button appears in the Adherence table's Actions column when:
  - `VITE_ENABLE_HABIT_SUGGESTIONS=1` is set
  - The suggestion has a `previewChange` (not for "maintain" or "observe")
  - The suggestion has not already been applied

- After clicking Apply:
  - The habit is updated with the clamped new values
  - A success toast is displayed
  - The button changes to "✓ Applied"

### Testing Instructions

1. Ensure you have the migration applied:
   ```sql
   -- Run in Supabase SQL editor or via CLI
   SELECT * FROM habit_adjustments;
   ```
   If this errors, apply `supabase/migrations/0005_habit_adjustments.sql`.

2. Set the environment variable:
   ```
   VITE_ENABLE_HABIT_SUGGESTIONS=1
   ```

3. Create a few test habits with different schedules (times_per_week, every_n_days) and types (boolean, quantity, duration).

4. Log completions to build up adherence data (at least 7 days of history helps).

5. In the Habits module, click "Show 7d/30d metrics" to view adherence.

6. Look for habits with "ease" or "progress" suggestions that have a Preview description.

7. Click "Apply" and verify:
   - The habit's schedule/target is updated correctly
   - The `habit_adjustments` table has a new row with `applied=true`
   - The before/after values match expectations

## Rollback

The habits system supports safe rollback of applied suggestions. After applying a suggestion, you can revert to the previous schedule/target if the change doesn't work for you.

### Requirements

1. **Migration:** Apply `supabase/migrations/0006_habit_adjustments_rollbacks.sql` to add rollback audit columns.
2. **Environment:** The `VITE_ENABLE_HABIT_SUGGESTIONS=1` environment variable must be set.

### How Rollback Works

1. **Revert Button:** When viewing Adherence metrics, applied suggestions show a "Revert" button.
2. **Confirmation Dialog:** Clicking "Revert" opens a dialog to confirm and optionally provide a rationale.
3. **Restore Values:** The habit's schedule and/or target_num are restored from `old_schedule` and `old_target_num`.
4. **Guardrails:** Restored values are clamped to safe ranges (same guardrails as apply):
   - `timesPerWeek`: 1–7
   - `intervalDays`: 1–30
   - `target_num`: minimum 0.5 for quantity/duration habits

### Audit Fields

When a suggestion is reverted, the following fields are updated in `habit_adjustments`:
- `reverted`: Set to `true`
- `reverted_at`: Timestamp when the revert occurred
- `revert_rationale`: Optional user-provided reason for reverting
- `applied_at`: Backfilled with current time if it was null (for pre-migration rows)

### Testing Rollback

1. Apply a suggestion to a habit (creates a row in `habit_adjustments` with `applied=true`).
2. Verify the habit's schedule/target was updated.
3. Click "Revert" in the Actions column.
4. Enter an optional rationale and confirm.
5. Verify:
   - The habit's schedule/target is restored to previous values
   - The `habit_adjustments` row has `reverted=true`, `reverted_at`, and optionally `revert_rationale`
   - The Revert button is no longer shown for this suggestion

## AI Rationale (Optional)

The habits system supports AI-enhanced rationale text for suggestions. When enabled, an AI model generates a more personalized 2-3 sentence explanation of the recommendation.

### Requirements

1. **Environment Variable:** Set `VITE_OPENAI_API_KEY` with a valid OpenAI API key.
2. **Model:** Uses `gpt-4o-mini` for fast, cost-effective responses.

### How It Works

1. **Automatic Enhancement:** When loading adherence data, rationale text is enhanced in the background (non-blocking).
2. **Fallback:** If the API call fails or times out (3 seconds), the baseline classifier rationale is shown.
3. **Session Caching:** Enhanced rationales are cached per session to avoid repeated API calls.
4. **UI Indicator:** An "AI" badge appears next to AI-enhanced rationales.

### Configuration

```bash
# Add to .env or environment
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_ENABLE_HABIT_SUGGESTIONS=1
```

### UI Behavior

- **Expandable Details:** Click "View rationale" to expand and see the full AI-enhanced text.
- **AI Badge:** A small "AI" badge indicates when rationale was AI-generated vs. baseline.
- **Graceful Degradation:** Without the API key, baseline rationale from the classifier is shown.

### Testing AI Rationale

1. Set the `VITE_OPENAI_API_KEY` environment variable.
2. Enable suggestions with `VITE_ENABLE_HABIT_SUGGESTIONS=1`.
3. Open the Adherence metrics section.
4. Click "View rationale" next to a suggestion.
5. Verify:
   - The rationale text is shown in an expandable panel
   - AI-enhanced rationales show an "AI" badge
   - If the API is unavailable, baseline text is displayed without the badge

## System Consolidation

The Habits V2 system is now the **single, unified habit tracking implementation** for the application. Legacy habits systems have been consolidated as follows:

### Migration from Legacy System

If your deployment previously used the legacy `/app/habits` system with `habits`, `habit_logs`, and `habit_alerts` tables:

1. **Run Migration 0011**: `supabase/migrations/0011_merge_legacy_habits_into_v2.sql`
   - Migrates all legacy habit data to V2 tables
   - Creates mapping between old and new habit IDs
   - Translates alert settings to reminder preferences

2. **Enable Read-Only Mode**: After verification, enable read-only lock on legacy tables for a shadow period

3. **Run Migration 0012**: `supabase/migrations/0012_archive_and_drop_legacy_habits.sql`
   - Archives and removes legacy tables

See [docs/MERGE_HABITS_SYSTEMS.md](MERGE_HABITS_SYSTEMS.md) for detailed migration steps.

### Compatibility Adapters

For code that still uses legacy service signatures during transition:

```typescript
// Instead of:
import { fetchHabitsForUser } from '../services/habits';

// Use the compatibility adapter:
import { fetchHabitsForUser } from '../compat/legacyHabitsAdapter';

// Or migrate to V2 directly (recommended):
import { listHabitsV2 } from '../services/habitsV2';
```

Adapters available:
- `src/compat/legacyHabitsAdapter.ts` - Wraps legacy habits.ts functions
- `src/compat/legacyAlertsAdapter.ts` - Wraps legacy habitAlerts.ts functions

**Note:** These adapters are deprecated and will be removed in a future release. Migrate to V2 services directly when possible.

### UnifiedTodayView Component

For embedding the Today checklist in other views:

```tsx
import { UnifiedTodayView } from '../features/habits/UnifiedTodayView';

// Full variant (default)
<UnifiedTodayView session={session} />

// Compact variant for sidebars
<UnifiedTodayView session={session} variant="compact" />

// Minimal variant for widgets
<UnifiedTodayView 
  session={session} 
  variant="minimal" 
  maxHabitsInMinimal={3} 
/>
```

### CI Guardrails

The `.github/workflows/legacy-refs-check.yml` workflow prevents accidental reintroduction of legacy table references after migration is complete
