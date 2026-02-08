# Game of Life 2.0 — Development Plan

## Project Status & How to Resume

Use this section first when returning to the plan.

### Status Snapshot (update as work progresses)

> **Note:** Keep this section additive. Do not overwrite milestone details below—only update status markers and next tasks here so the plan itself remains the single source of truth.

| Milestone | Status | Next Task |
|-----------|--------|-----------|
| M0. Repo audit + integration map | ✅ Complete | Move to M1 onboarding discovery (inventory existing onboarding/intro flows). |
| M1. Onboarding | 🟡 In progress | Validate onboarding routing and demo parity updates after flow map draft. |
| M2. Balance / Harmony scoring v1 | ☐ Not started | |
| M3. Rationality micro-system v1 | ☐ Not started | |
| M4. Auto-progress ladder v1 | ☐ Not started | |
| M5. Vision Board 2.0 metadata + review loop | ✅ Complete | Shift focus to Vision Board V2 Phase 0 bootstrap + Phase 7 polish items in docs/VISION_BOARD_PLAN.md |
| M6. AI Coach instruction system | ☐ Not started | |
| M7. AI Coach interventions v1 | ☐ Not started | |
| M8. Micro-quests + retention loop v1 | ☐ Not started | |
| M9. Push notification dispatch plan | ☐ Not started | |

### First Step (always)
1. **Determine current build status** by checking recent commits and the app for any progress on the milestones above.
2. Update the Status Snapshot table with ✅/🟡/⛔ and note the next task.
3. Resume from the first unchecked milestone or the documented next task.

This plan lays out the milestone skeleton required for Game of Life 2.0 delivery. Each milestone includes reuse targets, acceptance criteria, demo-mode parity requirements, and test notes. Order is fixed as requested.

## Linked Feature Plans (standalone docs to fold into this master plan)

Use this section to ensure standalone feature plans are tracked and eventually scheduled into the milestones above. When a standalone plan ships or is superseded, mark it complete here and reference the milestone where it landed.

**Maintenance step (recurring):** At the start of any milestone work or once per sprint, review this list to (1) add new standalone plans, (2) add a one-line summary of scope if missing, and (3) note which milestone will absorb it (or mark ✅ complete with the milestone link).

- [ACTIONS_FEATURE_DEV_PLAN.md](./ACTIONS_FEATURE_DEV_PLAN.md) — Actions system planning.
- [GOALS_TAB_REDESIGN_PLAN.md](./GOALS_TAB_REDESIGN_PLAN.md) — Goals tab UX overhaul.
- [MONTHLY_TREAT_CALENDAR_DEV_PLAN.md](./MONTHLY_TREAT_CALENDAR_DEV_PLAN.md) — Monthly treats calendar feature.
- [DAILY_TREATS_COUNTDOWN_CALENDAR_PLAN.md](./DAILY_TREATS_COUNTDOWN_CALENDAR_PLAN.md) — Daily treats countdown calendar.
- [TRAINING_EXERCISE_DEV_PLAN.md](./TRAINING_EXERCISE_DEV_PLAN.md) — Training exercise feature plan.
- [NEW_YEARS_MANIFEST_DEV_PLAN.md](./NEW_YEARS_MANIFEST_DEV_PLAN.md) — New Year’s manifest feature plan.
- [COMPETITION_KILLER_DEV_PLAN.md](./COMPETITION_KILLER_DEV_PLAN.md) — Strategic roadmap (tie steps to milestones when actioned).
- [GUIDED_MEDITATION_FEATURE.md](./GUIDED_MEDITATION_FEATURE.md) — Guided meditation feature scope.
- [AI_LIFE_COACH_FEATURE.md](./AI_LIFE_COACH_FEATURE.md) — AI life coach feature scope.

---

## M0. Repo audit + integration map (where features live, patterns, data flows)

**Reuse from existing code**
- `src/features/ai-coach`, `src/features/assistant`
- `src/features/gamification`, `src/features/power-ups`, `src/features/achievements`
- `src/features/habits`, `src/features/journal`, `src/features/vision-board`
- `src/services`, `src/lib`, `src/contexts`
- Supabase schemas and utilities under `supabase/`, `sql/`

**Acceptance criteria**
- Integration map doc identifies feature entry points, key services, and data flows.
- Lists demo data sources vs Supabase-backed sources.
- Identifies cross-feature dependencies (coach ↔ habits ↔ gamification ↔ vision board).

**Demo-mode parity requirement**
- All integration notes include where demo data should mirror Supabase fields.

**Test notes**
- No automated tests required; verify by code inspection and documented references.

---

## M1. “Game of Life 2.0” onboarding (copy + screens + routing + demo compatibility)

**Reuse from existing code**
- `src/features/dashboard`, `src/features/ai-coach`, `src/features/assistant`
- `src/components`, `src/contexts`
- Existing onboarding or intro flows (if present) under `src/features` or `src/components`

**Acceptance criteria**
- New onboarding screens introduce “Game of Life 2.0” framing and key axes.
- Routing connects onboarding to the main app dashboard and coach.
- Demo mode can complete onboarding without Supabase.

**Demo-mode parity requirement**
- Onboarding state stored in demo data and mirrored in Supabase.

**Test notes**
- Manual walkthrough for new routes; verify no console errors.

### Slice checklist
- [x] Slice 1: Audit onboarding entry points and add a local progress snapshot in account onboarding tools.
- [x] Slice 2: Draft onboarding flow map (entry points + routing) with demo parity notes.
- [ ] Slice 3: Validate onboarding routing, demo parity storage, and any missing entry points.

### Draft onboarding flow map (entry points + routing)

**Entry points**
1. **Dashboard start card** → `GameOfLifeOnboarding` modal (button: “Start Game of Life onboarding”).  
2. **Dashboard nudge** → `GameOfLifeOnboarding` modal (button: “Continue Game of Life onboarding”).  
3. **My Account → Onboarding tools** → launch or restart `GameOfLifeOnboarding` (reset optional).  
4. **Day Zero quick start** → `DayZeroOnboarding` modal (quick start) then return to dashboard.  

**Routing outcomes**
- Close `GameOfLifeOnboarding` → return to dashboard, keep local loop progress.  
- Finish `GameOfLifeOnboarding` → choose **Dashboard** or **AI Coach** destination; set `onboarding_complete` and clear local loop storage.  
- Finish/close `DayZeroOnboarding` → return to dashboard; set `onboarding_complete` and clear quick-start storage.  

**Demo parity notes**
- Demo mode stores profile + `onboardingComplete` in demo data while Supabase writes `full_name` + `onboarding_complete` metadata.  
- Local loop progress is tracked in `localStorage` (`gol_onboarding_{userId}` / `day_zero_onboarding_{userId}`) for both demo + Supabase paths.  
- Telemetry uses `onboarding_completed` for both demo + Supabase sessions.  

---

## M2. Balance / Harmony scoring v1 (axes, thresholds, dashboard panel, affects gamification)

**Reuse from existing code**
- `src/features/dashboard`
- `src/features/gamification` and `src/features/achievements`
- `src/features/habits`, `src/features/journal`, `src/features/meditation`

**Acceptance criteria**
- Define axes (Agency, Awareness, Rationality, Vitality) and thresholds.
- Dashboard panel shows balance status and trends.
- Gamification uses balance status (e.g., bonus XP for balanced weeks).

**Demo-mode parity requirement**
- Demo dataset includes balance fields and shows consistent scoring.

**Test notes**
- Spot check with sample demo data; verify score changes update dashboard panel.

---

## M3. Rationality micro-system v1 (daily “might I be wrong?”, XP reward rules, UI placement)

**Reuse from existing code**
- `src/features/journal` or `src/features/checkins`
- `src/features/gamification`
- `src/components` for cards/modals

**Acceptance criteria**
- Daily prompt: “What might I be wrong about?” with response capture.
- XP rules reward completion and consistency.
- UI placement defined (dashboard widget or coach feed).

**Demo-mode parity requirement**
- Responses stored in demo data with identical shape to Supabase schema.

**Test notes**
- Manual entry validates XP increment and UI rendering.

---

## M4. Auto-progress ladder v1 (tiers, downshift UX, re-upgrade rules, data model)

**Reuse from existing code**
- `src/features/habits` and `src/features/checkins`
- `src/features/ai-coach` for coaching language
- `src/lib` or `src/services` for scoring logic

**Acceptance criteria**
- Tiers defined (Seed, Minimum, Standard).
- Downshift UX preserves streaks and updates difficulty.
- Re-upgrade rules documented and enforced.
- “Done-ish” progress support for habits with partial completion thresholds (e.g., 80% of target still counts as meaningful progress).
- Habit creation/editing requires a **Habit Environment** field (mandatory comment) to capture the context/conditions needed for success.
- Habit environment and “done-ish” settings are surfaced in habit detail views and reporting.
- Habit success metrics distinguish **done**, **done-ish**, **skipped**, and **missed** so analytics and streaks remain honest.
- Auto-progression uses “done-ish” as partial credit with configurable weighting (e.g., 0.5–0.8) and logs adjustments.
- Completion rules handle each habit type (boolean/quantity/duration) with clear thresholds and edge-case behavior.
- Users can tune “done-ish” boundaries but are guided by smart defaults and coach tips.

**Todos to add for this milestone**
- [ ] Define a **progress grading model** (done / done-ish / skipped / missed) and how each state affects streaks, XP, and auto-progression.
- [ ] Add per-habit “done-ish” threshold schema (percentage or rule) with defaults by habit type:
  - Boolean: allow a “partial” toggle (e.g., *did some*).
  - Quantity: percent of target (e.g., 80%).
  - Duration: minimum minutes or percent of target.
- [ ] Update habit completion logic to record progress state plus numeric completion percentage.
- [ ] Update streak and success-rate calculations to include partial credit while avoiding inflated streaks.
- [ ] Add UI copy and visual affordances for “done-ish” (progressful) completion in daily check-ins.
- [ ] Add mandatory “Habit Environment” textarea to habit setup/edit flows with validation and helper prompts.
- [ ] Add “Habit Environment” summary in habit detail + coach context panels.
- [ ] Store environment notes and “done-ish” settings in the habit schema and include them in demo-mode data fixtures.
- [ ] Add telemetry events for “done-ish” usage and coach adjustments (for later tuning).

**Demo-mode parity requirement**
- Tier state and transitions stored in demo data with Supabase mirror.
- Done-ish thresholds and Habit Environment notes mirrored in demo data and Supabase schema.
- Demo data includes at least one habit with partial completion logs and one with environment coaching feedback.

**Test notes**
- Manual test downshift then re-upgrade with demo habits.
- Manual test partial completion (e.g., 80% target) appears as “done-ish” and is reflected in streak/progress math.
- Manual validation that Habit Environment is required in the creation flow and persists on edit.
- Manual test for each habit type (boolean/quantity/duration) to confirm “done-ish” logic and visuals.
- Manual check: success-rate analytics include partial credit but do not claim full completion.

---

## M5. Vision Board 2.0 metadata + review loop (types, review interval, orphan detection)

> **Vision Board master plan:** See [docs/VISION_BOARD_PLAN.md](./docs/VISION_BOARD_PLAN.md) for shipped scope vs remaining gaps.

**Reuse from existing code**
- `src/features/vision-board`
- `src/features/visionBoardDailyGame`
- `src/components`

**Acceptance criteria**
- Vision items include type metadata and review interval.
- Review loop surfaces due items and prompts updates.
- Orphan detection flags items without linked goals/habits.

**Demo-mode parity requirement**
- Demo vision board items include metadata and review schedules.

**Test notes**
- Manual check: due items list, orphan flagging, and updates.

---

## M6. AI Coach instruction system (privacy toggles, what AI can read, instruction loading)

**Reuse from existing code**
- `src/features/ai-coach`, `src/features/assistant`
- `src/contexts` for user preferences
- `src/services` for instruction loading

**Acceptance criteria**
- Privacy toggles for goals, habits, journaling, reflections, vision board.
- Instruction payload loader supports environment and demo config.
- Coach respects data access rules in prompts.

**Demo-mode parity requirement**
- Demo mode uses the same toggles and instruction loading path.

**Test notes**
- Manual toggle test: confirm blocked data is not referenced.

---

## M7. AI Coach interventions v1 (imbalance/fixation/overconfidence/habit struggle)

**Reuse from existing code**
- `src/features/ai-coach`
- `src/features/dashboard`
- `src/features/habits` and `src/features/journal`

**Acceptance criteria**
- Intervention triggers for imbalance, fixation, overconfidence, and habit struggle.
- Templates aligned with AI coach personality spec.
- Interventions appear in coach UI and optionally dashboard.
- Coach suggests “done-ish” adjustments when habit goals are unrealistic (e.g., recommend 80% targets) and references Habit Environment context in guidance.
- Coach can propose environment tweaks (time, place, tools, social support, obstacles) and updates Habit Environment notes when user agrees.

**Demo-mode parity requirement**
- Demo data can trigger each intervention type.

**Test notes**
- Manual: simulate each trigger with demo data.

---

## M8. Micro-quests + “Monopoly GO”-style retention loop v1 (aligned rewards only)

**Reuse from existing code**
- `src/features/gamification`
- `src/features/power-ups`
- `src/features/achievements`

**Acceptance criteria**
- Micro-quests generated from balance gaps and habits.
- Rewards aligned with balance and non-compulsive engagement.
- Retention loop documented and constrained by guardrails.

**Demo-mode parity requirement**
- Demo mode can generate and complete micro-quests with rewards.

**Test notes**
- Manual: complete quest, verify reward and balance update.

---

## M9. Push notification dispatch plan + backend scheduling (document + implement if feasible)

**Reuse from existing code**
- `src/features/notifications`
- `src/push-subscribe.ts`
- `supabase/` edge functions or scheduling scripts

**Acceptance criteria**
- Written dispatch plan for reminders and coach nudges.
- Backend scheduling approach chosen and documented.
- If implemented: notifications send based on schedule preferences.

**Demo-mode parity requirement**
- Demo mode shows scheduled notifications via mock schedule data.

**Test notes**
- Documented manual test path; for live send, use a controlled test account.

---

## M10. Analytics & telemetry for adaptation loops (simple events, no creepiness)

**Reuse from existing code**
- `src/services` analytics utilities
- `src/features/gamification`, `src/features/ai-coach`
- `supabase/` event storage

**Acceptance criteria**
- Minimal event list: onboarding completion, balance shift, intervention accepted, quest completion.
- Opt-in or privacy-respecting telemetry settings.
- Events used to adjust difficulty recommendations.

**Demo-mode parity requirement**
- Demo data records events in local storage or mock telemetry store.

**Test notes**
- Manual: trigger events and verify storage or logging.

---

## M11. QA + accessibility + responsive polish pass (mobile-first)

**Reuse from existing code**
- `src/components`, `src/styles`, `src/index.css`, `src/themes.css`
- `src/features/dashboard`, `src/features/ai-coach`

**Acceptance criteria**
- Key screens pass keyboard navigation and contrast checks.
- Mobile layouts validated for onboarding, coach, and dashboard.
- Common errors documented or resolved.

**Demo-mode parity requirement**
- Demo mode renders identical layouts and components.

**Test notes**
- Manual responsive checks and basic a11y scan (no automated tooling required).

---

## M12. Documentation refresh + release checklist

**Reuse from existing code**
- `README.md`, `docs/`, existing implementation summaries

**Acceptance criteria**
- Updated docs for Game of Life 2.0 features.
- Release checklist includes data migration steps and demo parity notes.
- Links to AI coach personality and architecture documents.

**Demo-mode parity requirement**
- Documentation includes demo mode setup and limitations.

**Test notes**
- Documentation review only.

---

## Progress Log (Living Changelog)

> **Format**  
> - **Date**:  
> - **Slice**:  
> - **What changed**:  
> - **What’s next**:  

- **2026-02-08**  
  - **Slice**: M1 Slice 1 — Audit onboarding entry points + local progress snapshot.  
  - **What changed**: Added an onboarding progress snapshot to the account onboarding tools and documented the completed slice in M1.  
  - **What’s next**: Draft the onboarding flow map and demo parity notes for Game of Life 2.0 onboarding.
- **2026-02-08**  
  - **Slice**: M1 Slice 2 — Draft onboarding flow map + demo parity notes.  
  - **What changed**: Documented onboarding entry points, routing outcomes, and demo parity notes; captured the flow map in config for future reference.  
  - **What’s next**: Validate routing + demo parity storage and confirm any missing entry points.
