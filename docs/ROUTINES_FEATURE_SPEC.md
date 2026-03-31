# Routines Feature Spec (Docs Phase)

## Status
- **Phase:** Documentation / Product specification
- **Date:** 2026-03-31
- **Scope in this phase:** Capture product decisions, UX rules, data model intent, and rollout plan before implementation.

---

## Goals
Create a first-class **Routines** feature that:
1. Lets users bundle habits into meaningful sequences (e.g., Morning Routine, Cleaning Routine).
2. Keeps Today focused and uncluttered.
3. Uses a single source of truth for completion state across all UI surfaces.
4. Enables immersive execution via **Cinematic Routine Runs**.

---

## Decisions Captured

### 1) Routine composition model
- A routine is an orchestrator over existing habits.
- Routines are composed of **ordered steps** that point to habits.
- Habits remain reusable atomic units and can be used in multiple routines.

### 2) Single source of truth for completion
- If a habit appears both standalone and in one (or more) routines, checking it off in any surface updates all surfaces.
- Completion state is keyed by the same underlying habit log (habit + date), not duplicated per view.

### 3) Today screen interaction model (decluttered)
Use a two-lane Today experience:

1. **Routines Due Today**
   - Routine cards (e.g., Morning Routine 2/5)
   - Start / Continue / Complete actions
   - Expand to view steps

2. **Standalone Habits**
   - Habits not attached to routines, or explicitly set to show standalone
   - Collapsible with a minimal default view

### 4) Visibility controls for routine steps
Each habit-step relationship should support display rules:
- `inside_routine_only` (default for routine steps)
- `also_show_standalone`
- `standalone_only`

This ensures occasional/low-frequency routines do not clutter Today.

### 5) Routine cadence support
Routine visibility should leverage existing schedule logic principles:
- Daily
- Specific days
- Times per week
- Every N days

Occasional routines should surface only when due.

### 6) Navigation / information architecture
- Add a **Routines** entry in popup/menu navigation (near Goals/Habits).
- Keep **Today** as the execution surface for routine runs.
- Keep **Habits** as atomic habit management.

### 7) Cinematic Routine Runs
Routine execution mode should provide:
- Step-by-step guided flow
- Progress indicator
- Focused UI state
- Reward/celebration on completion

This should layer on top of existing habit logging and reward systems.

---

## Proposed Data Model (Implementation Target)

> Final SQL naming can be adjusted during implementation.

### `routines`
- `id`
- `user_id`
- `title`
- `description` (optional)
- `schedule` (JSON)
- `anchor_time` (optional)
- `domain_key` (optional)
- `is_active`
- `created_at`, `updated_at`

### `routine_steps`
- `id`
- `routine_id`
- `habit_id`
- `step_order`
- `required` (bool)
- `display_mode` (`inside_routine_only` | `also_show_standalone` | `standalone_only`)
- `fallback_step` (bool, optional)
- `created_at`, `updated_at`

### Optional `routine_logs` (if routine-level milestones are needed)
- `id`
- `routine_id`
- `user_id`
- `date`
- `completed`
- `completed_at`
- `mode` (`normal` | `fallback`)

---

## UX Flows

### A) Create routine
1. User opens **Routines** tab.
2. Creates routine shell (name, schedule, optional time anchor).
3. Adds existing habits as ordered steps.
4. Sets required/optional and display mode per step.
5. Saves routine.

### B) Run routine in Today
1. User sees due routine cards in Today.
2. Opens routine and checks steps.
3. Habit completion syncs instantly with any standalone habit surface.
4. Routine shows progress and completion celebration.

### C) Occasional routine behavior
- Routines with non-daily cadence appear only when due.
- Off-day routines remain out of the default Today feed.

---

## Non-Goals (for v1)
- Complex branching/conditional routines.
- Shared/team routines.
- AI-generated routine scripts beyond template generation.

---

## Rollout Plan

### Phase 1 — Data + wiring
- Add routine entities and joins.
- Add service layer for CRUD.
- Reuse habit logging for completion sync.

### Phase 2 — Routine management UI
- Add Routines tab in popup/menu.
- Build create/edit/reorder flow.

### Phase 3 — Today integration
- Add routine cards.
- Add standalone habit declutter rules.
- Ensure cross-surface sync.

### Phase 4 — Cinematic Routine Runs
- Guided sequence mode.
- Progress + reward moments.

---

## Acceptance Criteria (Docs-confirmed)
1. Users can create routines from existing habits.
2. A habit checked in routine view reflects as checked everywhere else for the day.
3. Routine steps can be hidden from standalone Today by default.
4. Occasional routines only appear when due.
5. Routines are manageable from dedicated navigation entry.
6. Today supports a cinematic run mode for routine execution.

---

## Open Questions for implementation kickoff
1. Should one habit be allowed in multiple routines in v1? (recommended: yes)
2. Should routine completion bonus be daily-capped?
3. Do we need explicit routine-level logs in v1, or can they be derived from habit logs?
4. Should fallback mode be per-routine, per-step, or both in v1?

