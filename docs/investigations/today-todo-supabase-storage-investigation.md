# Today Todo Supabase Storage Investigation (Follow-up)

Date: 2026-05-26  
Type: Investigation only (no runtime changes, no migration created)

## Scope & requirements recap

This follow-up evaluates persistence architecture for the Today Todo feature against these product requirements:

1. Today todos do **not** transfer automatically to the next day.
2. Completed today todos appear in completed view **alongside completed habits**.
3. Decide whether localStorage is enough or whether Supabase persistence/migration is warranted.
4. Today todos are day-scoped, lightweight, rendered above habits, and are **not** normal habits.
5. Todo expanded state remains todo-specific (no habit-control leakage).

## Current state findings

### Relevant existing Supabase schema

- `habits_v2` stores habit definitions and lifecycle metadata; it is identity-level behavior, not day-scoped ad hoc todo data.
- `habit_completions` stores per-user, per-habit, per-date completion records with uniqueness `(user_id, habit_id, completed_date)`.
- `habit_logs_v2` stores logs keyed by habit/date/time, also habit-centric.
- `actions` is modeled as a “simple 3-day rolling todo list” with category enum, `completed_at`, and default `expires_at = now + 3 days`.
- `project_tasks` is project-subtask oriented and not a lightweight Today-only construct.
- No dedicated `today_todos` table currently exists.

### Existing client/domain behavior relevant to this decision

- In `DailyHabitTracker`, completed habits are currently derived from habit completion state and toggled into the list as “completed / skipped habits” (habit-specific UI derivation).
- `useActions` currently loads active actions only (`fetchActiveActions`), while `actions` service does expose `fetchCompletedActionsForDate(dateISO)`.

## Can an existing table safely store daily todos without schema changes?

Short answer: **partially via `actions`, but not cleanly**.

- `actions` can store rows immediately.
- But category constraints, 3-day default lifecycle, and cross-feature semantics make it a leaky fit for strict day-scoped Today todos.

## Can Actions domain represent this cleanly?

**Usable, but not clean.**

- Pros: existing completion timestamps, Supabase sync, existing CRUD.
- Cons: non-day-native semantics, category coupling, cleanup/XP/cross-tab side effects.

## Option comparison

### A) localStorage only

**Pros**
- Fastest delivery, no migration.
- Low coupling with habits/actions domain.
- Easy date-keyed enforcement of non-transfer semantics.

**Cons**
- No cross-device sync.
- Local data loss risk.
- Weak analytics/history portability.

**Implementation complexity:** Low  
**Sync/cross-device:** None  
**Risk of polluting habits/actions logic:** Low  
**Completed view:** Merge local completed todos into completed section as separate todo row type.  
**Supports “does not transfer to next day”:** Yes.

### B) reuse existing Actions/Tasks domain

**Pros**
- No new table migration.
- Cross-device sync available.
- Completed-history possible via `completed_at` and date queries.

**Cons**
- Domain mismatch with strict Today-only todo semantics.
- 3-day rolling defaults conflict with non-transfer semantics.
- Elevated risk of polluting Actions behavior and reports.

**Implementation complexity:** Medium  
**Sync/cross-device:** Good  
**Risk of polluting habits/actions logic:** Medium-High  
**Completed view:** Compose completed habits + completed actions-for-date, rendered as distinct item types.  
**Supports “does not transfer to next day”:** Only with additional business-rule filtering.

### C) new Supabase table (`today_todos`)

**Pros**
- Clean domain boundary.
- Native day-scoped semantics.
- Strong cross-device support.
- Low contamination risk to habits/actions.

**Cons**
- Requires migration and service wiring.

**Implementation complexity:** Medium  
**Sync/cross-device:** Strong  
**Risk of polluting habits/actions logic:** Low  
**Completed view:** Query completed todos by selected day and merge in completed section as todo-specific rows.  
**Supports “does not transfer to next day”:** Yes, intrinsically.

## Recommendation

Recommend **Option C** for durable architecture, with **Option A fallback** for offline/temporary local buffering.

## Proposed Supabase design (if approved)

### Table name
- `public.today_todos`

### Columns
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `todo_date date not null`
- `title text not null`
- `notes text null`
- `completed boolean not null default false`
- `completed_at timestamptz null`
- `order_index integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null` (optional)

### RLS policy shape
- Enable RLS.
- Allow `SELECT/INSERT/UPDATE/DELETE` only when `auth.uid() = user_id`.
- Use `WITH CHECK (auth.uid() = user_id)` for writes.

### Indexes
- `(user_id, todo_date)`
- `(user_id, todo_date, completed)`
- Optional `(user_id, updated_at desc)`

### TypeScript service shape
- `fetchTodayTodos(dateISO)`
- `fetchCompletedTodayTodosForDate(dateISO)`
- `createTodayTodo({ title, notes?, dateISO, orderIndex? })`
- `updateTodayTodo(id, patch)`
- `deleteTodayTodo(id)`
- `reorderTodayTodos(dateISO, orderedIds)`

### Migration filename suggestion
- `supabase/migrations/0242_today_todos_foundation.sql`

### Backward-compatible rollout
1. Add table/services behind feature flag.
2. Dual-read (Supabase first, local fallback).
3. One-time hydration from local day keys for signed-in users.
4. Write-through Supabase + local offline cache.
5. Retire legacy local-only path after telemetry confidence.

### Offline/local fallback
- Keep local queue/cache; sync on reconnect.
- Use client UUIDs and upsert.
- Resolve conflicts via last-write-wins on `updated_at`.

## Completed view approach without pretending todos are habits

- Keep habit completion pipeline as-is.
- Add composed completed view model that merges:
  - `completedHabits` (habit-derived)
  - `completedTodos` (today_todos-derived)
- Render with separate row components/state maps so todo expansion/actions stay todo-specific.

## Files reviewed

- Supabase migrations for habits, completions, actions, and project tasks.
- `DailyHabitTracker` completed toggle/list derivation.
- Actions service/hook/types behavior.
