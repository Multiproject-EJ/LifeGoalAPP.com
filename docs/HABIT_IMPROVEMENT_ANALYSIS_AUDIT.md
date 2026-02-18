# Habit Improvement Analysis Audit (Repo Scan)

## Why this audit

You asked whether the app already has pieces of a step-by-step “habit improvement” flow (desire → cost → right-size range → loop map → protocol → 7-day experiment), and what upgrades are still missing.

## What is already up and running

### 1) Habit risk detection + review state machine (live)
- The app already classifies habits into `active`, `at_risk`, `stalled`, `in_review`.
- Current thresholds are implemented for 7-day adherence risk and stale-day windows.
- Auto-archive logic exists for unresolved `in_review` habits after a grace period.

Key sources:
- `src/features/habits/habitHealth.ts`
- `src/features/habits/autoProgression.ts`

### 2) Habit Review queue in Today UI (live)
- `in_review` habits are removed from normal checklist scoring pressure.
- A dedicated “Habit Review” queue exists with actions:
  - Pause
  - Redesign
  - Replace
  - Archive
- AI draft status and “Open in edit flow” handoff are already rendered in the queue.

Key source:
- `src/features/habits/DailyHabitTracker.tsx`

### 3) AI redesign support exists, but as lightweight suggestion generation
- Habit AI suggestion service exists and can generate a reworked habit draft.
- Supports OpenAI path and fallback logic.

Key source:
- `src/services/habitAiSuggestions.ts`

### 4) Adjustment persistence/auditing exists, but not “analysis session” persistence
- Existing `habit_adjustments` table stores suggestion previews/applied/reverted data.
- This is good for change auditing, but it is not a structured diagnostic model (desire/cost/range/protocol/day-by-day experiment).

Key sources:
- `src/services/habitAdjustments.ts`
- `supabase/migrations/0005_habit_adjustments.sql`
- `supabase/migrations/0006_habit_adjustments_rollbacks.sql`

### 5) Existing documented roadmap confirms review-focused Habit Intelligence has been shipped in parts
- Repo plan/progress notes indicate detection, review queue, auto-archive, AI redesign handoff, and risk-prioritized offers have been implemented incrementally.

Key source:
- `HABIT_INTELLIGENCE_INTEGRATION_PLAN.md`

## Major capability gaps vs your new “habit improvement analysis” concept

Your new concept is stronger than current implementation. The biggest missing capabilities are:

1. **No full multi-step diagnostic flow**
   - Missing explicit UX screens for:
     - Desire-underneath selection
     - Under-pain vs over-pain tagging
     - Subscription fee cost capture
     - U-curve right-size band
     - Loop mapping
     - Diagnosis mode (`under` / `over` / `swing`)

2. **No dedicated data model for analysis sessions**
   - No `habit_analysis_sessions`, `habit_desires`, `habit_costs`, `habit_right_size_ranges`, `habit_protocols`, `habit_experiment_days` tables currently exist.

3. **No first-class protocol builder (If-Then + friction/ease + guardrails)**
   - Review queue supports action choices, but not the executable protocol composer from your design.

4. **No readiness score / traffic-light gate**
   - There is no 5-factor readiness scoring layer before starting experiment mode.

5. **No structured 7-day experiment log tied to protocol quality**
   - Existing completion logs exist, but no dedicated per-day under/over-pain and net-effect experiment loop.

6. **No card-deck “analysis hand” UX**
   - Current UI has review actions and suggestions, but not the 5-card hand model (Primary Desire, Cost Warning, Range, Strategy, Protocol).

## Recommended upgrade path (lowest-risk sequence)

### Phase A — Data + API foundation (ship first)
1. Add session tables (Supabase migration):
   - `habit_analysis_sessions`
   - `habit_desires`
   - `habit_costs`
   - `habit_right_size_ranges`
   - `habit_loop_maps`
   - `habit_diagnoses`
   - `habit_protocols`
   - `habit_readiness_scores`
   - `habit_experiment_days`
2. Add a minimal service layer in `src/services/`.
3. Attach one active analysis session ID to habit detail/review queue for continuity.

### Phase B — Thin vertical slice UI (fast value)
1. Build only 4 screens first:
   - Desire
   - Cost (under/over/subscription)
   - Right-size range
   - Protocol (If-Then)
2. Start 7-day experiment logging from this protocol.
3. Keep diagnosis + loop mapping as optional fields initially.

### Phase C — Intelligence + polish
1. Add diagnosis inference (`under/over/swing`) from cost tags + recent behavior.
2. Add readiness traffic light (green/yellow/red).
3. Generate protocol suggestions automatically from:
   - selected desire
   - loop trigger
   - health state (`at_risk/stalled/in_review`)
4. Add card-deck visualization and “5-card hand” summary.

## Why this sequencing fits current architecture

- Reuses existing habit review queue instead of replacing it.
- Reuses existing AI suggestion service for “Upgrade/Substitute” drafts.
- Reuses existing adherence/health signals for diagnosis assist.
- Extends (doesn’t break) existing habit adjustment audit model.

## Concrete “missing upgrades” to prioritize now

If you want biggest impact with minimal complexity, prioritize this exact trio:

1. **Protocol Builder + 7-day experiment table** (behavior change engine)
2. **Desire/Cost capture** (insight engine)
3. **Right-size range slider** (self-regulation engine)

Those three unlock the full loop from philosophical insight → measurable behavior change.
