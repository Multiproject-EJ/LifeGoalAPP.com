# Habit Wizard v2 Upgrade Spec

## Goal
Improve habit creation completion and clarity by keeping the core flow guided, moving advanced controls out of the critical path, and adding support for "break a bad behavior" and time-bound habit programs.

## Implementation Status (living notes)
- [x] Wizard expanded to 5 steps in UI (`Basics`, `Schedule + Program Length`, `Environment`, `Reminders`, `Summary`).
- [x] Added intent selection to basics (`build` / `break`).
- [x] Replaced X/week free typing with plus/minus stepper controls in schedule step.
- [x] Added time-bound duration controls in wizard draft (duration mode, value/unit, end behavior).
- [x] Moved Done-ish + stage controls behind optional advanced panel on the summary step.
- [x] Stored draft intent/duration metadata into `autoprog.creation_context` on create/edit save paths (temporary persistence before schema migration).
- [x] Persist reminder settings from wizard into reminder preference backend on create/edit.
- [x] Hide mobile footer nav while wizard is active to keep full focus on flow.
- [ ] Add DB migration for first-class intent/duration columns.
- [x] Implement app-load duration end evaluator (pause/deactivate when end date reached).

### Latest implementation notes
- Wizard create/edit now syncs reminder preference via `updateHabitReminderPref(...)` immediately after successful save.
- If reminders are enabled in wizard, the flow updates preferred time and schedules notifications.
- If reminders are disabled in wizard, the flow disables reminder preference and cancels scheduled notifications.
- On habits module load, active fixed-window habits now auto-pause/deactivate if their program window has elapsed (based on `created_at + duration`).
- Remaining work for duration automation: scheduled/background evaluator (cron/edge) so it still applies without opening the app.
- Wizard now adds a `habit-wizard-open` body class while mounted; mobile footer nav is hidden in that mode.

## Current Constraints (from code)
- Habit creation/edit currently runs through `HabitsModule` + `HabitWizard`.
- Wizard has 3 steps; step 3 currently combines targets, environment, reminders, and advanced settings.
- Schedule `x_per_week` uses a numeric input that is clamped on change.
- Template schedules include `every_n_days`, but this is currently mapped to `every_day` in wizard mapping.
- Reminder controls exist in the wizard draft, but create/update payload path does not persist those values in the same save call.

## Proposed UX: 5-Step Flow

### Step 1 — Basics
- Emoji (optional)
- Title (required)
- Type (`boolean`, `quantity`, `duration`)
- **Intent** (new):
  - Build good behavior
  - Break/reduce bad behavior
- Keep AI suggestion assist in this step

### Step 2 — Schedule + Program Length
- Schedule options:
  - Every day
  - Specific days
  - X times/week
- Replace free numeric typing for X/week with stepper controls (`-` / `+`), clamped 1–7
- **Program length** (new):
  - Active for N [days | weeks | months]
  - On completion: [Pause habit | Deactivate habit]

### Step 3 — Environment
- Environment setup card
- Environment notes
- No reminders or advanced controls shown here

### Step 4 — Reminders
- Reminder enabled toggle
- Time picker
- Keep this simple and focused

### Step 5 — Summary + Create
- Review cards for Basics, Schedule/Length, Environment, Reminder
- Primary CTA: **Create habit** / **Save changes**
- Secondary CTA: **Continue with advanced settings**
  - Done-ish thresholds
  - Habit stage labels and percentages

## Information Architecture
- Default flow: Steps 1–5 above
- Advanced flow: optional branch from step 5
- Reduces cognitive load while preserving power-user functionality

## Data Model Proposal

### New Habit Fields
- `habit_intent`: `'build' | 'break'`
- `duration_mode`: `'none' | 'fixed_window'`
- `duration_value`: `number | null`
- `duration_unit`: `'days' | 'weeks' | 'months' | null`
- `duration_start_at`: `timestamp | null`
- `duration_end_at`: `timestamp | null`
- `on_duration_end`: `'pause' | 'deactivate' | null`
- `wizard_version`: `'v2'` (optional analytics/debug)

### Draft Model Additions
- `intent?: 'build' | 'break'`
- `duration?: {
    mode: 'none' | 'fixed_window';
    value?: number;
    unit?: 'days' | 'weeks' | 'months';
    onEnd?: 'pause' | 'deactivate';
  }`

### Backward Compatibility
For existing habits:
- `habit_intent = 'build'`
- `duration_mode = 'none'`
- `on_duration_end = null`

## Engineering Plan

### Phase 0 — Quick UX improvements (no DB migration)
1. Replace X/week typing with stepper controls
2. Split existing Step 3 into Environment and Reminders
3. Add Step 5 summary page
4. Hide/minimize workspace footer/menu while wizard is active
5. Keep advanced settings behind optional CTA

### Phase 1 — Schema + Types
1. Add new DB fields for intent and duration
2. Regenerate `database.types`
3. Add migration defaults

### Phase 2 — Save Pipeline
1. Extend `HabitWizardDraft`
2. Update `handleCompleteDraft` create/update payload assembly
3. Persist new fields via existing create/update service path

### Phase 3 — Duration End Automation
1. Implement evaluator (daily job and/or app-open check)
2. If `duration_end_at` is reached, apply `on_duration_end`
3. Reuse existing lifecycle operations (`pause` / `deactivate`)

### Phase 4 — Reminder Persistence Alignment
1. Ensure Step 4 reminder values are persisted to reminder prefs/config
2. Refresh scheduling after create/edit
3. Keep lifecycle-triggered scheduling/cancel behavior intact

### Phase 5 — Telemetry + Validation
Track:
- Step drop-off by step index
- Create completion rate before/after
- Intent selection distribution
- Duration feature adoption
- Advanced-settings usage

## Acceptance Criteria (Product)
- Users can create a habit in under 60 seconds without touching advanced settings
- Step 3 no longer contains reminders or done-ish/stage controls
- Users can create a "break bad habit" intent habit
- Users can define a habit program length and end action
- X/week scheduling no longer relies on free-form numeric typing

## Risks and Mitigations
- **Risk**: Duration logic conflicts with lifecycle states
  - **Mitigation**: enforce precedence: archived > deactivated > paused > active
- **Risk**: Reminder UX mismatch with persistence backend
  - **Mitigation**: complete reminder write path during Phase 4 before broad rollout
- **Risk**: Migration complexity
  - **Mitigation**: default values + non-breaking nullable columns

## Out of Scope (v2 initial)
- Multi-reminder per habit in wizard
- Habit-specific timezone override
- Full anti-habit analytics dashboards

## Suggested Ticket Breakdown
1. UX split + stepper controls
2. Summary step and advanced branch
3. Intent schema + UI
4. Duration schema + UI + end-action behavior
5. Reminder write-path completion
6. Telemetry instrumentation
