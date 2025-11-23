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
