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
5. Delivers a **mobile-first, world-class visual experience** that feels fun, elegant, and fast.

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

### 8) Mobile-first product quality bar (non-negotiable)
- The routine UX must be designed for mobile first, then enhanced for larger screens.
- The interface should feel premium: smooth transitions, clear hierarchy, and playful-but-calm delight moments.
- Routine interactions must be one-thumb friendly and fast enough for in-motion use (morning, commute, quick resets).

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

### Supporting migration artifacts (implementation requirement)
- `00xx_create_routines.sql`:
  - Create `routines` and `routine_steps`
  - Add RLS policies for user isolation
  - Add indexes for `user_id`, `routine_id`, `habit_id`, and schedule lookups
- `00xy_create_routine_logs.sql` (optional):
  - Create `routine_logs` table if routine-level completion milestones are stored explicitly
- `00xz_backfill_routine_membership.sql` (optional):
  - Helper migration for importing curated starter routine templates or migrating legacy presets
- All migrations must be idempotent/safe for replay in non-prod environments.

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

## Integration Plan With Existing Systems (must-do, not optional)

This feature is intended to **compose** existing systems, not replace them.

### Existing habits/logging
- Reuse current habit entities as routine steps.
- Reuse existing habit logging path as source of truth for completion.
- Do not create duplicate completion storage for standalone vs routine surfaces.

### Today experience
- Extend existing Today rendering with routine cards, then standalone lane.
- Preserve current fast check-off interactions and optimistic updates.

### Notifications/reminders
- Reuse habit reminder infrastructure for step-level reminders.
- Add optional routine-level reminder only after step-level parity is stable.

### Gamification/rewards
- Keep existing per-habit rewards.
- Add routine-level bonuses as additive events (without double-awarding habit completions).

### Offline/sync
- Reuse existing offline queue strategy for routine CRUD and step reordering mutations.
- Ensure routine/habit completion consistency in offline-first scenarios.

### Accessibility/theming
- Reuse global theme tokens/components wherever possible.
- Enforce accessibility requirements on new routine surfaces from day one.

---

## Mobile UI / UX Spec (Second-Pass Additions)

## Design Principles
1. **One-thumb first**: primary actions in easy thumb reach.
2. **Zero clutter by default**: collapsed secondary content, progressive disclosure.
3. **Momentum over management**: emphasize completion flow over settings.
4. **Beautiful + legible**: strong contrast, clean spacing, premium motion.
5. **Fast feedback**: immediate visual state updates and micro-celebrations.

## Information Architecture (Mobile)

### Today Screen hierarchy
1. Greeting + day context
2. **Routines Due Today** (primary lane)
3. Standalone Habits (secondary lane, collapsed by default)
4. Optional “Show all” / “Manage routines” links

### Popup / menu structure
- Add **Routines** entry near Goals and Habits.
- Keep Today as execution entry point.
- Keep Habits as atomic setup/editing workspace.

## Routine Card (Mobile) — Default
Each routine card should show:
- Icon/emoji + title
- Completion status (`2/5`)
- Time context (`Morning`, `Tonight`, or anchored time range)
- Primary CTA:
  - `Start` (not started)
  - `Continue` (in progress)
  - `Done` (completed; tappable for recap)
- Expand chevron for steps preview

### Card states
- **Idle**: not started, neutral accent
- **In progress**: gradient/progress accent, subtle pulse
- **Complete**: satisfied visual state, sparkle/confetti micro-feedback
- **Skipped / Snoozed** (optional v1.1): muted state with undo affordance

## Cinematic Routine Runs — Interaction Blueprint
When user taps `Start`:
1. Enter focused “run” surface (full-screen sheet or dedicated route).
2. Show current step with a single dominant action.
3. Provide next-step preview + routine progress bar.
4. Offer quick fallback actions:
   - `Mark done`
   - `Done-ish`
   - `Skip`
5. End-of-run celebration with reward summary and optional reflection prompt.

### Motion language
- Transition-in: 220–320ms, ease-out
- Step advance: 160–220ms
- Completion celebration: short, non-blocking (<1.2s)
- Respect reduced motion preference (disable decorative transitions).

## Visual System Notes (Premium Feel)
- Glassmorphic cards with clear depth layering, but keep readability first.
- Clean typography scale:
  - Routine title: high emphasis
  - Progress and metadata: medium
  - Secondary info: low emphasis
- Color usage:
  - Distinct state colors (idle / active / complete)
  - Avoid over-saturated noise in dense screens
- Maintain a calm aesthetic aligned with wellness/productivity tone.

## Accessibility & Inclusivity Requirements
- Tap targets: minimum 44x44px.
- Color contrast: WCAG AA minimum.
- Screen reader labels for progress and state changes.
- Haptics/sound optional and user-controllable.
- All motion effects must degrade gracefully in reduced-motion mode.

## Performance Requirements (Mobile)
- Routine card render target: smooth at 60fps on modern mobile.
- First interactive routine action under ~100ms perceived response.
- Optimistic UI updates for check-offs; network sync can finalize in background.
- Keep Today initial render lightweight (lazy-load expanded details when needed).

## Anti-Clutter Rules (Explicit)
1. Routine steps default to `inside_routine_only`.
2. Standalone lane starts collapsed when routine count > 0.
3. Off-schedule routines are hidden by default.
4. Avoid duplicate display unless `also_show_standalone` is explicitly enabled.
5. Keep “Manage” controls out of the primary completion path.

---

## Non-Goals (for v1)
- Complex branching/conditional routines.
- Shared/team routines.
- AI-generated routine scripts beyond template generation.
- Fully custom visual theme editor for routines.

---

## Rollout Plan

### Phase 1 — Data + wiring
- Add routine entities and joins.
- Add service layer for CRUD.
- Reuse habit logging for completion sync.
- Ship foundational migrations (`create_routines`, optional `create_routine_logs`).

### Phase 2 — Routine management UI
- Add Routines tab in popup/menu.
- Build create/edit/reorder flow.
- Validate mobile IA and one-thumb interaction map.
- Add routine CRUD integration tests and migration smoke checks.

### Phase 3 — Today integration
- Add routine cards.
- Add standalone habit declutter rules.
- Ensure cross-surface sync.
- Ship polished mobile card states (idle/in-progress/completed).
- Validate no duplicate rewards and no completion desync between surfaces.

### Phase 4 — Cinematic Routine Runs
- Guided sequence mode.
- Progress + reward moments.
- Add premium animation/haptics pass with reduced-motion fallback.
- Gate rollout behind feature flag and monitor stability metrics.

---

## Acceptance Criteria (Docs-confirmed)
1. Users can create routines from existing habits.
2. A habit checked in routine view reflects as checked everywhere else for the day.
3. Routine steps can be hidden from standalone Today by default.
4. Occasional routines only appear when due.
5. Routines are manageable from dedicated navigation entry.
6. Today supports a cinematic run mode for routine execution.
7. Mobile UX is one-thumb friendly with strong visual hierarchy and minimal clutter.
8. Routine interactions feel premium (smooth motion, clear feedback, fast response).
9. Accessibility requirements are met (tap targets, contrast, reduced motion compatibility).

---

## Open Questions for implementation kickoff
1. Should one habit be allowed in multiple routines in v1? (recommended: yes)
2. Should routine completion bonus be daily-capped?
3. Do we need explicit routine-level logs in v1, or can they be derived from habit logs?
4. Should fallback mode be per-routine, per-step, or both in v1?
5. Should cinematic run open as full-screen route or bottom sheet on mobile?
6. Should “Done-ish” be enabled for all routine steps or only compatible habit types?
7. Should we auto-sort routines by anchor time, recency, or user pinning?
8. Do we enable optional `routine_logs` in v1, or defer until routine-level analytics requires it?

---

## Implementation Checklist (Pre-build Gate)
- [ ] Product sign-off on IA: Today vs Routines vs Habits responsibilities
- [ ] UX sign-off on mobile wireframes + state map
- [ ] Visual sign-off on routine cards + cinematic run flow
- [ ] Engineering sign-off on data model and sync semantics
- [ ] Accessibility pass criteria approved before UI build starts
- [ ] Migration plan reviewed (up/down, rollback, seed/backfill strategy)
- [ ] Integration checklist confirmed (habits, today, rewards, reminders, offline sync)

---

## Migration + Integration Delivery Notes
- We have now documented migration and integration expectations in this spec.
- Detailed SQL and implementation code will still be produced during build phases.
- Rule of thumb:
  - **Spec phase:** define constraints and contracts.
  - **Build phase:** implement migrations/services/UI/tests according to this spec.
