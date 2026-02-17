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

### 2026-02-16 — Phase 3 / Step: Recovery + relaunch gamification hooks

Implemented:
- Added explicit XP hooks for the planned recovery loop events using the existing gamification pipeline:
  - `habit_review_completed`
  - `habit_relaunch_started`
  - `habit_relaunch_7day_success`
- Wired **Habit Review** actions (`pause`, `redesign`, `replace`, `archive`) to award one-time review-completion XP per review cycle.
- Wired habit edit save flow to award relaunch-start XP when a reviewed habit (`redesign`/`replace`) is actually saved in the existing edit flow.
- Wired today completion flow to award relaunch 7-day success XP when a reviewed relaunch reaches a 7-day streak.
- Added localStorage de-duplication keys so each recovery reward is granted once per habit per review cycle.

Still deferred:
- Risk-prioritized time-limited offer input (replace random-first behavior).

### 2026-02-16 — Phase 3 / Step: Risk-prioritized time-limited offer input

Implemented:
- Updated Today time-limited offer habit selection to prioritize non-completed `stalled` and `at_risk` habits before default candidates.
- Added a deterministic risk-ranking pass that orders candidates by health state severity, then by lower adherence percentage, then by habit name for stable ordering.
- Kept fallback behavior intact by reverting to the existing sorted habit selection when no risk-prioritized candidate is available.
- Preserved existing offer window timing and reward multiplier behavior (selection input only changed).

Still deferred:
- None in the current Habit Intelligence integration plan scope.

### 2026-02-16 — Phase 3 / Step: Offer resilience for risk-prioritized selection

Implemented:
- Added validity checks for stored time-limited offer picks so stale offer targets are automatically recalculated when habits are completed, archived, or moved to `in_review`.
- Ensured existing same-day offer schedule persistence is still reused when both `nextHabitId` and optional `badHabitId` remain eligible.
- Preserved current risk-prioritized ranking/fallback behavior while preventing outdated cached picks from surfacing in Today.

Still deferred:
- None in the current Habit Intelligence integration plan scope.

### 2026-02-16 — Phase 3 / Step: Offer selection hardening extraction

Implemented:
- Extracted risk-prioritized offer ranking into a dedicated helper (`rankHabitsForTimeLimitedOffer`) so selection rules are centralized and reusable.
- Extracted stored-offer eligibility checks into a shared helper (`isEligibleTimeLimitedOfferHabit`) to keep recalculation/validation behavior consistent.
- Updated `DailyHabitTracker` to use both helpers without changing selection outcomes, preserving current ranking, fallback, and in-review exclusion behavior.

Still deferred:
- None in the current Habit Intelligence integration plan scope.


### 2026-02-17 — Phase 3 / Step: Offer selection telemetry instrumentation

Implemented:
- Added a dedicated telemetry event (`habit_time_limited_offer_scheduled`) for Today time-limited offer scheduling decisions.
- Instrumented both valid stored-offer reuse and recalculated offer assignment paths so we can measure selection stability versus recalculation churn.
- Included metadata for offer date, source (`stored` vs `recalculated`), selected habit IDs, window availability, and whether the selected target came from risk-prioritized ranking.
- Added local in-session de-duplication so identical schedule decisions do not emit duplicate telemetry events on re-renders.

Still deferred:
- None in the current Habit Intelligence integration plan scope.

### 2026-02-17 — Phase 3 / Step: Offer telemetry metadata enrichment

Implemented:
- Expanded `habit_time_limited_offer_scheduled` metadata so each scheduled offer now captures selected habit quality signals for analysis:
  - `nextHabitHealthState`
  - `nextHabitAdherencePct`
  - `badHabitHealthState`
  - `badHabitAdherencePct`
- Kept existing scheduling metadata (`source`, offer IDs, window availability, risk-prioritized flag) unchanged so dashboards remain backward compatible.
- Reused existing in-memory adherence + health maps in `DailyHabitTracker` and defaulted unknown habits to `active` / `100%` to avoid null-driven telemetry gaps.

Still deferred:
- None in the current Habit Intelligence integration plan scope.


### 2026-02-17 — Phase 3 / Step: Offer claim telemetry instrumentation

Implemented:
- Added a dedicated telemetry event (`habit_time_limited_offer_claimed`) so completed offer habits can be analyzed separately from scheduling decisions.
- Instrumented Today habit completion flow to emit claim telemetry whenever a time-limited offer bonus is actually awarded.
- Included claim metadata for offer date, habit identity, offer reward values, health/adherence quality signals, and whether the claimed habit was the primary or bad-habit offer target.

Still deferred:
- None in the current Habit Intelligence integration plan scope.

### 2026-02-17 — Phase 3 / Step: Offer expiry telemetry instrumentation

Implemented:
- Added a dedicated telemetry event (`habit_time_limited_offer_expired`) for ended time-limited offer windows.
- Instrumented Today offer lifecycle to emit expiry telemetry once per offer schedule after `windowEnd` passes.
- Included expiry metadata for offer date/window, targeted habit IDs, which offered habits were already completed, and an explicit `wasClaimed` flag with unclaimed IDs.
- Added in-session de-duplication so the same expired offer does not emit repeated events on re-renders.

Still deferred:
- None in the current Habit Intelligence integration plan scope.

### 2026-02-17 — Phase 3 / Step: Integration completion audit + recap

Implemented:
- Performed an end-to-end checklist audit against the original Product Goal and Rollout Plan sections to confirm all scoped Phase 1–3 integration items are now shipped.
- Verified no remaining `Still deferred` items exist for the Habit Intelligence integration scope in this plan.
- Captured a concise done-vs-missing recap so the next work can move to optimization/analytics follow-ups instead of core integration.

Completion check (expected vs actual):
- Detection/state machine (`active` / `at_risk` / `stalled` / `in_review`) — ✅ done.
- Review queue actions + score pressure exclusion for `in_review` — ✅ done.
- Auto-archive after review grace window — ✅ done.
- AI-assisted redesign handoff from review flow — ✅ done.
- Recovery/relaunch gamification XP hooks — ✅ done.
- Risk-prioritized time-limited offer selection — ✅ done.
- Offer selection resilience/hardening — ✅ done.
- Offer telemetry (scheduled / claimed / expired) — ✅ done.

Still deferred:
- None in the current Habit Intelligence integration plan scope.

Out-of-scope / optional next improvements (not required for plan completion):
- Promote JSON `autoprog` health state persistence from UI/session computation to a scheduled/background write path for stronger server-side analytics consistency.
- Add analytics dashboards/alerts over newly emitted offer telemetry to monitor risk-prioritized impact and claim-rate lift.
- Consider `habit_health_events` normalized table (Option B) if historical state-transition analysis becomes a product requirement.

### 2026-02-17 — Architecture analysis: central orchestration vs scattered logic

Question addressed:
- Should the app introduce a central “master game engine/brain” that orchestrates timing/rules (AI suggestion timing, day labels like Saturday behavior, auto-clear/reset windows, etc.), or keep logic distributed across feature modules?

Short answer:
- Best practice for this codebase is a **hybrid model**:
  - keep domain logic in focused modules (habits, offers, AI suggestion builders, scoring rules),
  - add a thin **central orchestration layer** that decides *when* and *in what order* those modules execute.
- A fully monolithic “brain” would likely become brittle and slow down iteration; today’s fully scattered approach risks duplication and timing drift.

Recommended target architecture (incremental, low-risk):
1. Add a small `GameOrchestrator` (or `HabitIntelligenceOrchestrator`) service owning:
   - daily tick lifecycle (`startOfDay`, `inSession`, `endOfDay`),
   - event routing (`habit_completed`, `offer_scheduled`, `offer_claimed`, `offer_expired`, `review_action_taken`),
   - idempotency/de-dup checks for once-per-window actions.
2. Keep existing engines/helpers as pure rule providers:
   - health state computation,
   - risk ranking,
   - AI rationale/suggestion generation,
   - XP hook mapping.
3. Move timing policy to central config:
   - local day-boundary rules (incl. Saturday label strategy/timezone behavior),
   - review grace/auto-archive windows,
   - cadence caps for AI suggestion generation (cooldowns, max per day/week),
   - auto-clear windows for stale ephemeral UI state.
4. Emit unified orchestration telemetry:
   - `orchestrator_tick_started`, `orchestrator_action_enqueued`, `orchestrator_action_skipped`, `orchestrator_action_succeeded/failed`.

Why this is feasible (and not a rewrite):
- Current implementation already has reusable building blocks (state machine, offer ranking, telemetry, AI hooks).
- The orchestrator can be introduced as a coordinator over existing functions/components first, then gradually absorb duplicated timing checks.
- This keeps product behavior stable while improving consistency and observability.

Migration shape (recommended):
- Phase A: Introduce orchestrator interface + wire only time-limited offer scheduling/expiry decisions through it.
- Phase B: Route review grace auto-archive and relaunch reward timing through the same orchestrator tick.
- Phase C: Route AI redesign suggestion timing/cooldowns via orchestrator policy gates.
- Phase D: Add centralized calendar/day-label policy (e.g., Saturday handling) and reset/auto-clear policy bundle.

Decision guidance:
- If goal is speed for one feature only: keep local module logic.
- If goal is cross-feature consistency, easier debugging, and cleaner timing control: adopt the hybrid orchestrator now.
- Given current trajectory (multiple timed behaviors + telemetry + rewards), the hybrid orchestrator is the better long-term tradeoff.

Status impact:
- This is an architecture recommendation and does not change the previously completed Habit Intelligence scope.

### 2026-02-17 — Plan hardening: orchestrator implementation blueprint (v1.1)

Objective:
- Make the orchestration recommendation immediately executable by defining boundaries, contracts, rollout guardrails, and clear acceptance criteria.

Guiding principles:
- Keep **business rules pure** and reusable; orchestrator only coordinates timing/order.
- Make every orchestrated action **idempotent** and safe on retries.
- Prefer **policy-driven config** over hardcoded timing constants in UI modules.
- Preserve current UX behavior by default; new orchestration paths launch behind feature flags.

Proposed module boundaries:
- `src/features/habits/orchestration/HabitIntelligenceOrchestrator.ts`
  - owns tick execution, action routing, and de-dup state.
- `src/features/habits/orchestration/policies.ts`
  - central timing/config policy (cooldowns, grace windows, day-boundary, reset windows).
- `src/features/habits/orchestration/types.ts`
  - canonical event/action/result contracts.
- Existing modules remain rule providers (health computation, ranking, AI suggestion generation, XP mapping).

Canonical contracts (minimum):
- `OrchestratorEvent`
  - `day_started`, `habit_completed`, `review_action_taken`, `offer_window_expired`, `session_resumed`.
- `OrchestratorAction`
  - `schedule_offer`, `expire_offer`, `auto_archive_reviewed_habit`, `queue_ai_redesign`, `grant_recovery_xp`, `clear_ephemeral_state`.
- `OrchestratorResult`
  - `applied`, `skipped` (with reason), `failed` (with recoverable/non-recoverable classification).

Policy bundle (initial defaults):
- Day boundary source of truth: user-local timezone with deterministic date key generation.
- Saturday labeling rule: calendar-policy function (single source used by Today + telemetry).
- AI redesign cadence: max N suggestions per day/week + per-habit cooldown.
- Review auto-archive: existing `review_due_at + graceDays` policy reused.
- Auto-clear: clear stale ephemeral offer/review UI state at day rollover.

Feature flag rollout controls:
- `orchestrator_enabled`
- `orchestrator_offer_lifecycle_enabled`
- `orchestrator_review_archive_enabled`
- `orchestrator_ai_cadence_enabled`
- `orchestrator_calendar_policy_enabled`

Acceptance criteria (definition of done for orchestrator adoption):
1. No behavior regressions in existing offer selection/claim/expiry logic when orchestrator is enabled.
2. All orchestrated actions emit telemetry with `action`, `source_event`, `result`, and `reason` (when skipped/failed).
3. Duplicate re-renders or repeated app resumes do not double-apply one-time actions.
4. Disabling flags cleanly returns control to existing local module paths.
5. Saturday/day-label and day-reset behavior is consistent across Today UI and telemetry payloads.

Risk register + mitigations:
- Risk: hidden double-execution from multiple React effects.
  - Mitigation: idempotency key strategy (`action + habitId + dateKey`) and in-memory/session guard.
- Risk: timezone edge cases around midnight.
  - Mitigation: centralized date-key helper + synthetic tests for DST transitions.
- Risk: AI over-triggering due to noisy events.
  - Mitigation: central cooldown/cap policy and explicit skip telemetry reasons.

Suggested next implementation step:
- Implement Phase A only (`schedule_offer` + `expire_offer`) behind `orchestrator_offer_lifecycle_enabled`, then compare telemetry parity against current path before expanding scope.

Status impact:
- This strengthens execution clarity for the architecture recommendation and prepares engineering handoff without expanding current feature scope.
