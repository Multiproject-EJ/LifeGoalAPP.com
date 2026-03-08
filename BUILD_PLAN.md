# BUILD_PLAN.md — Game of Life 2.0 Remaining Work

> **Source of Truth**: [`DEV_PLAN.md`](./DEV_PLAN.md) is the single source of truth for milestone definitions, acceptance criteria, and overall project direction. This document is a structured execution companion — it maps remaining work to specific files, gives complexity estimates, and records cross-item dependencies. **When items here complete, update the Status Snapshot table in DEV_PLAN.md first**, then mark this checklist accordingly.

---

## Status Dashboard

| Milestone / Feature | Status | Remaining |
|---|---|---|
| M0. Repo audit + integration map | ✅ Complete | — |
| M1. Onboarding (3 slices) | ✅ Complete | — |
| M2. Balance / Harmony scoring v1 | ✅ Complete | — |
| M3. Rationality micro-system v1 | ✅ Complete | — |
| M4. Auto-progress ladder v1 | 🟡 In Progress | Skipped/missed UI (M4-A, M4-B); demo fixture verification (M4-C); telemetry audit (M4-D); coach context panel verification (M4-E) |
| M5. Vision Board 2.0 metadata + review loop | ✅ Complete | — |
| M6. AI Coach instruction system | ✅ Complete | — |
| M7. AI Coach interventions v1 | ✅ Complete | — |
| M8. Micro-quests + retention loop v1 | ✅ Complete | — |
| M9. Push notification dispatch plan | ✅ Complete | Schedule preferences UI wire-up; manual test path documentation (M9-C) |
| Training / Exercise Tab | ✅ Complete | — |
| Actions Feature (Phases 0–6) | ✅ Complete | — |
| Island Game System (M1B–M9) | ✅ Complete | — |
| Monthly Treat Calendar | 🟡 In Progress | Phase 4 backend: Supabase tables + RLS + edge functions (TREAT-A) |
| HabitGame Core Games | 🟡 In Progress | Pomodoro Session 2 timer launcher (GAME-A) |
| Goals Tab Redesign | 🟡 In Progress | Phases 2–4 not started (GOALS-A) |
| Vision Star | 🟡 In Progress | Real AI generation endpoint + server-side persistence |
| M10. Analytics & telemetry | ⛔ Not Started | All items (M10-A through M10-D) |
| M11. QA + a11y + responsive polish | ⛔ Not Started | All items (M11-A through M11-C) |
| M12. Documentation refresh + release checklist | ⛔ Not Started | All items (M12-A through M12-C) |

---

## Prioritized Build Order

### Phase 1 — Critical Path: Finish M4 Auto-Progress Ladder

**Goal**: Close the remaining acceptance criteria so daily check-ins properly classify skipped / missed / done-ish days and auto-progression tier transitions fire.

| ID | Task | Files to Modify | Complexity | Depends On |
|---|---|---|---|---|
| M4-A | Record `progress_state` + `completion_percentage` via classification buttons in daily check-in | `src/features/habits/DailyHabitTracker.tsx`, `src/features/habits/HabitsModule.tsx`, `src/features/habits/progressGrading.ts` | M | — |
| M4-B | Add explicit "Skipped" / "Missed" / "Done-ish ✨" buttons to daily check-in UI (replace binary done/not-done) | `src/features/habits/DailyHabitTracker.tsx`, `src/index.css`, `src/features/habits/progressGrading.css` | M | M4-A |
| M4-C | Verify all demo habits have `habit_environment` + `done_ish_config`; ensure at least one partial-completion log and one environment coaching feedback example exist | `src/services/demoData.ts` | S | — |
| M4-D | Audit and wire telemetry: confirm `habit_environment_updated` and coach-adjustment events fire; `habit_done_ish_completed` already exists | `src/features/habits/DailyHabitTracker.tsx`, `src/features/habits/HabitsModule.tsx`, `src/services/analytics.ts` (or equivalent telemetry module) | S | M4-A |
| M4-E | Verify coach context panel displays environment notes (PR #1153 may have addressed this via `loadAiCoachInstructions()`); close or implement | `src/features/ai-coach/AiCoach.tsx`, `src/services/aiCoachInstructions.ts` | S | — |

**Acceptance criteria (from DEV_PLAN.md M4)**:
- Users can mark a habit day as done / done-ish / skipped / missed from the daily check-in UI.
- `progress_state` and `completion_percentage` are persisted to `habit_logs_v2` for every check-in.
- Done-ish partial credit (0.7) flows into streak and XP calculations.
- Coach context receives `habit_environment` notes via `loadAiCoachInstructions()`.
- All demo habits carry realistic `habit_environment` and `done_ish_config` values.

---

### Phase 2 — Backend Gaps: Push Notifications + Monthly Treat Calendar

**Goal**: Close server-side gaps so notifications dispatch reliably and treat calendar data persists beyond the client.

| ID | Task | Files to Modify | Complexity | Depends On |
|---|---|---|---|---|
| M9-A | Verify `scheduleHabitReminders()` / `getScheduledReminders()` / `cancelReminder()` are fully wired; complete any stub logic in `habitAlertNotifications.ts` | `src/services/habitAlertNotifications.ts`, `supabase/functions/send-reminders/index.ts` | M | — |
| M9-B | Confirm demo mock schedule data in `getDemoMockScheduledReminders()` covers all reminder types (habit, streak, check-in, coach nudge) | `src/services/demoData.ts` | S | — |
| M9-C | Write manual test path documentation for live notification send (test account setup, trigger steps, expected payloads) | `docs/game-of-life-2.0/NOTIFICATION_DISPATCH_PLAN.md` | S | M9-A |
| TREAT-A | Phase 4 backend: Create Supabase migration for treat tables + RLS policies; add edge function for treat persistence and retrieval | `supabase/migrations/` (new file), `supabase/functions/` (new edge function), `src/features/` treat calendar files | L | — |

**Acceptance criteria**:
- Push reminders fire at scheduled times for real users (via `send-reminders` edge function cron).
- Demo mode returns a realistic mock schedule without any Supabase calls.
- Monthly treat calendar data (scratch state, reward metadata) is persisted server-side per user.
- RLS policies restrict treat data to the owning user.

---

### Phase 3 — Feature Completion: HabitGame Pomodoro + Goals Tab

**Goal**: Finish the two in-progress feature areas that have clear next slices defined.

| ID | Task | Files to Modify | Complexity | Depends On |
|---|---|---|---|---|
| GAME-A | Pomodoro Session 2: add timer launcher state selector (`idle \| active \| alert`) + stale (>24 h) handling on the Actions tab Timer path | `src/features/actions/` (Timer-related files), `src/features/timer/` | M | — |
| GOALS-A-P2 | Goals Tab Redesign Phase 2: goal detail / edit view + progress tracking within `GoalWorkspace.tsx` | `src/features/goals/GoalWorkspace.tsx`, `src/features/goals/` supporting files | M | — |
| GOALS-A-P3 | Goals Tab Redesign Phase 3: goal connection to habits, vision board, and balance axes | `src/features/goals/GoalWorkspace.tsx`, `src/features/habits/`, `src/features/vision-board/` | L | GOALS-A-P2 |
| GOALS-A-P4 | Goals Tab Redesign Phase 4: AI coach goal context + milestone celebration | `src/features/goals/`, `src/features/ai-coach/AiCoach.tsx`, `src/services/aiCoachInstructions.ts` | M | GOALS-A-P3 |

**Acceptance criteria (from GOALS_TAB_REDESIGN_PLAN.md and HABITGAME_CORE_GAMES_DEV_PLAN.md)**:
- Pomodoro timer on Actions tab supports idle → active → alert state transitions; stale sessions (>24 h) are detected and handled gracefully.
- Goals tab Phase 2–4: users can view/edit goal details, see progress, connect goals to habits, and receive AI coach suggestions about goals.

---

### Phase 4 — Platform Quality: Analytics/Telemetry + QA/A11y

**Goal**: Add the adaptation-loop telemetry layer and validate platform quality across key user flows.

| ID | Task | Files to Modify | Complexity | Depends On |
|---|---|---|---|---|
| M10-A | Define minimal event list: onboarding completion, balance shift, intervention accepted, quest completion | `src/services/analytics.ts` (or new `src/services/telemetry.ts`), `docs/` | S | — |
| M10-B | Add opt-in/privacy-respecting telemetry toggle to account/settings UI | `src/features/account/` settings files, `src/contexts/` | S | M10-A |
| M10-C | Emit defined events at call sites; wire events to difficulty adjustment recommendations in AI coach | `src/features/habits/DailyHabitTracker.tsx`, `src/features/ai-coach/AiCoach.tsx`, `src/features/gamification/`, `src/features/onboarding/` | M | M10-A, M10-B |
| M10-D | Store demo data events in `localStorage` mock telemetry store; verify coach uses event history for adaptation | `src/services/demoData.ts`, telemetry service | S | M10-C |
| M11-A | Keyboard navigation audit on key screens (onboarding, coach, dashboard); fix focus order and missing `aria-` attributes | `src/features/onboarding/`, `src/features/ai-coach/`, `src/features/dashboard/` | M | — |
| M11-B | Mobile layout validation: onboarding, coach, and dashboard on ≤375 px viewports; fix overflow and tap target issues | Same files as M11-A + any component with layout issues found | M | — |
| M11-C | Document and resolve common errors found during audit; update `docs/` | `docs/`, targeted component files | S | M11-A, M11-B |

**Acceptance criteria (from DEV_PLAN.md M10, M11)**:
- Telemetry events fire for each item in the minimal list when the user performs the action, respecting the opt-in toggle.
- Demo mode stores events locally; coach uses stored history to adjust difficulty recommendations.
- Key screens pass WCAG AA contrast (4.5:1 minimum) and support keyboard-only navigation.
- Dashboard, onboarding, and coach render without horizontal overflow on 375 px width.

---

### Phase 5 — Ship: Documentation + Release Checklist

**Goal**: Bring docs to parity with the shipped feature set and produce a release checklist with migration steps.

| ID | Task | Files to Modify | Complexity | Depends On |
|---|---|---|---|---|
| M12-A | Refresh feature docs for AI coach, interventions, quests, balance scoring, and push notifications | `docs/game-of-life-2.0/`, `README.md` (if present) | M | Phases 1–4 complete |
| M12-B | Write release checklist including Supabase migration steps (`0008_m4_autoprog_ladder_v1.sql` and any Phase 2 migrations), demo parity notes, and feature flags | New file: `docs/RELEASE_CHECKLIST.md` | M | M12-A |
| M12-C | Add links to AI coach personality spec and architecture docs; write demo mode setup guide | `docs/game-of-life-2.0/`, `DEV_PLAN.md` Linked Feature Plans | S | M12-A |

**Acceptance criteria (from DEV_PLAN.md M12)**:
- Docs accurately describe shipped features with no references to unimplemented behavior.
- Release checklist covers every Supabase migration needed and notes which are safe to run idempotently.
- Demo mode setup guide explains what is mocked, what is real, and any known limitations.

---

## Cross-Cutting Notes

- **Demo-mode parity**: Every feature must have a demo-mode path (localStorage or in-memory mock). See existing patterns in `src/services/demoData.ts`.
- **TypeScript**: All new files must compile with `tsc --noEmit` (zero new errors). Run `npm run build` to verify.
- **No test runner**: The project has no jest/vitest configured. Validate changes via the dev server (`npm run dev`) and manual walkthrough.
- **Telemetry pattern**: Follow the existing `analytics.ts` pattern (or equivalent) for event emission. New events must be gated by the user opt-in toggle added in M10-B.
- **Supabase migrations**: New migrations go in `supabase/migrations/` with sequential numbering. Include `IF NOT EXISTS` guards where possible.

---

## Linkback

This document is an execution companion to [`DEV_PLAN.md`](./DEV_PLAN.md).

**After completing any item above:**
1. Update the Status Snapshot table in `DEV_PLAN.md` (change `🟡` → `✅`, update the Next Task cell).
2. Add a Progress Log entry in `DEV_PLAN.md` following the `Date / Slice / What changed / What's next` format.
3. Mark the corresponding checkbox in this document as `- [x]`.

`DEV_PLAN.md` remains the single source of truth for milestone definitions and acceptance criteria. This file tracks execution state.
