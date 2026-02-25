# Goal & Habit Execution System — AI-Optimized Development Plan

## Project Intent
Build a coaching-first execution layer that helps users:
1. clearly identify each goal,
2. create a realistic plan with timing and workload,
3. detect early when a goal is unrealistic or under-specified,
4. adapt safely (scale down, switch to planning habit, or re-prioritize) instead of feeling like they failed.

This plan is intentionally AI-optimized so implementation can be delegated in small, verifiable increments.

---

## Why This Matters
Current goal systems often track completion but fail to detect goal quality issues early. We want the app to coach users toward realistic execution by combining:
- **Plan quality signals** (is this goal executable?),
- **Effort signals** (is work actually happening?),
- **Outcome signals** (is progress moving?), and
- **Adaptive interventions** (what should change next?).

---

## Product Scope (MVP)

### Core capabilities
- **Goal Identification Card**
  - Goal title, life area, why-it-matters, active priority, first-win date.
- **Plan Quality Score (Stars)**
  - 0–5 star score generated from plan completeness and realism.
- **Execution Diagnostics**
  - Effort vs outcome trend checks with coaching flags.
- **Adaptive Coach Actions**
  - 1-click options: Scale Scope, Scale Effort, Switch to Planning Habit, Re-prioritize.
- **Daily Journal Quick Reflection**
  - 1-click AI suggested reflections + short note/keyword input.

### Out of scope (MVP)
- Full predictive forecasting model.
- Cross-user benchmarking.
- Multi-language localization (defer until copy stabilizes).

---

## AI-Optimized Architecture

## 1) Goal Plan Quality Model
Define deterministic scoring first (simple and auditable).

### Input fields
- `goal_outcome_statement`
- `success_metric`
- `target_date`
- `first_action`
- `weekly_workload_target`
- `priority_level`

### Scoring rubric (v1)
Each criterion = 1 point, total 0–5:
1. Outcome statement is specific.
2. Success metric is measurable.
3. Target date exists and is in future.
4. First action is actionable and <= 30 minutes.
5. Weekly workload target exists and is realistic for priority.

Translate to stars:
- 0–1 points: ★☆☆☆☆
- 2 points: ★★☆☆☆
- 3 points: ★★★☆☆
- 4 points: ★★★★☆
- 5 points: ★★★★★

## 2) Execution Health Model
Use lightweight rule engine before any ML.

### Inputs
- Last 14 days effort events (habit logs / action completions / time blocks)
- Last 14 days outcome updates (goal progress notes, metric updates)
- Journal friction tags (stuck, unclear, overwhelmed)

### Heuristics
- **High effort + flat outcomes** => strategy mismatch risk
- **Low effort + flat outcomes** => overload or low priority risk
- **No effort events after goal creation** => activation risk
- **Plan score <= 2** => under-defined goal risk

### Output
- `health_state`: `on_track | caution | at_risk`
- `primary_risk_reason`
- `recommended_next_action`

## 3) Adaptive Coaching Actions
For each risk reason, return explicit next actions:
- `scale_scope`
- `reduce_workload`
- `switch_to_planning_habit`
- `defer_priority`
- `clarify_success_metric`

All actions should generate a traceable plan update event.

---

## Data Model Additions (Proposed)

## Tables / fields (suggested)
- `goals`
  - `why_it_matters` (text)
  - `priority_level` (enum: now/later)
  - `weekly_workload_target` (integer)
  - `plan_quality_score` (integer 0–5)
  - `plan_quality_breakdown` (jsonb)
- `goal_health_snapshots`
  - `goal_id`, `captured_at`, `health_state`, `risk_reason`, `recommended_action`, `signals` (jsonb)
- `goal_adaptations`
  - `goal_id`, `action_type`, `before_state` (jsonb), `after_state` (jsonb), `created_at`
- `journal_entries` (reuse existing journal modes)
  - add optional `friction_tag` and `ai_suggested_prompt_id`

---

## UX Flow (MVP)

## A. Goal Creation / Edit
1. User creates or edits goal.
2. System calculates plan quality stars immediately.
3. If stars <= 2, show inline coaching: “Make this executable in 1 minute.”
4. User accepts 1-click AI improvements or edits manually.

## B. Daily Use
1. User opens daily view.
2. Sees one active goal card + health badge.
3. If risk exists, user gets one primary recommended action.
4. User can accept action in one click.

## C. Journal Quick Reflection
1. AI suggests top 3 likely reflections.
2. User taps one suggestion.
3. Adds optional keyword/note.
4. Save in <20 seconds.

---

## Mobile-First Experience Principles (Required)

Design every core interaction for thumbs-first mobile use before desktop expansion.

### Mobile-first UX constraints
- One primary action per screen state.
- Tap targets >= 44px.
- Core “daily check-in” and “adapt my plan” flows should complete in <= 3 taps.
- Keep important content above the fold on common device heights.

### Visual language
- Sleek, modern card surfaces and soft depth.
- Clear color hierarchy: encouragement, caution, and risk.
- Motion should communicate state change (not decoration only).

### Tone system
- **Positive + real**: supportive language that still names risk clearly.
- Every caution message must include one concrete next action.
- Avoid shame-based wording (e.g., use “adapt” instead of “failed”).

---

## Interactive Input/Output Spec (AI + UI)

The system should feel conversational, visual, and controllable.

## Input patterns
- Guided chips (quick choices) for most decisions.
- Lightweight free-text field for nuance.
- Voice-input-ready architecture (deferred implementation, keep extensible API shape).

## Output patterns
- Visual health badge + star quality score always visible.
- One “Most likely next best step” card from AI.
- Expandable “why this suggestion” panel with evidence signals.

## Feedback loops
- Immediate UI acknowledgment on tap/selection.
- Inline micro-summary after each adaptation (what changed + expected impact).

---

## Motion, Sound, and Haptics Strategy

These are product features, not polish extras, and should be configurable in Settings.

## Motion
- Use short, smooth transitions (150–280ms) for card state changes and step transitions.
- Use progress-linked motion for goal quality/health updates.
- Respect reduced-motion preferences and provide graceful fallbacks.

## Sound
- Optional micro-sounds for key moments (completed step, adaptation confirmed, daily reflection saved).
- Default to subtle volume and avoid repetitive/annoying loops.
- Include full mute and “minimal sounds” modes.

## Haptics
- Light haptic tick for selection and confirmation on supported devices.
- Distinct soft pattern for caution/risk prompts.
- Respect platform capabilities and accessibility settings.

---

## Emotional Coaching Framework: Positive but Real

Each AI response should combine:
1. **Validation** (“You’re showing up consistently.”)
2. **Reality signal** (“Outcome trend is flat for 10 days.”)
3. **Action** (“Reduce scope this week to restore momentum.”)

### Response template
- `encouragement_line`
- `reality_observation`
- `recommended_action`
- `one_tap_options[]`

This keeps coaching honest while preserving motivation.

---

## Visual System Spec (Mobile First)

## Primary screens
1. **Today Focus Screen**
   - Top: Goal identity strip (title, star score, health badge).
   - Middle: “Most likely next best step” card.
   - Bottom: 3 one-tap actions and journal quick-reflection chip row.
2. **Goal Quality Sheet**
   - Shows 5-point rubric with pass/miss states.
   - “Fix this in 60 seconds” inline AI rewrite CTA.
3. **Adaptation Confirm Sheet**
   - Before/after comparison cards.
   - Expected impact and reversible toggle.
4. **Journal Quick Reflection Sheet**
   - 3 AI chips, optional keyword field, mood/friction pickers.

## Component interaction states
- `default`
- `loading_ai`
- `recommendation_ready`
- `caution_visible`
- `at_risk_visible`
- `action_applied`
- `undo_window_open`

Every state should have explicit empty/error fallback copy.

## Visual hierarchy rules
- Never show more than one warning banner at once.
- Max 3 CTAs per panel.
- Always anchor AI recommendations to a visible signal (“because effort dropped 40% this week”).

---

## Animation Token & Sensory Contract

## Motion tokens
- `motion-fast`: 150ms (chip selection)
- `motion-base`: 220ms (card transitions)
- `motion-slow`: 320ms (sheet entrances)
- `ease-standard`: cubic-bezier(0.2, 0.8, 0.2, 1)

## Animation map
- Score changes: count-up + subtle glow pulse once.
- Health state shifts: badge color transition + icon morph.
- Adaptation applied: before card scales down, after card slides in.

## Haptic map
- Selection: light tap.
- Confirmation: double light tap.
- Caution: soft long pulse.
- At-risk: medium pulse, once only.

## Sound map
- `success_soft` for action saved.
- `nudge_soft` for caution reveal.
- `reflection_done` for journal submission.

All sensory outputs must support per-channel toggles: `motion`, `haptics`, `sound`.

---

## API Contracts (Concrete JSON)

## Plan quality endpoint
`POST /api/goal/plan-quality/evaluate`

Request:
```json
{
  "goalId": "uuid",
  "goalOutcomeStatement": "Run a 5k in under 30 minutes",
  "successMetric": "5k <= 30:00",
  "targetDate": "2026-07-01",
  "firstAction": "Walk-run 20 minutes on Monday",
  "weeklyWorkloadTarget": 4,
  "priorityLevel": "now"
}
```

Response:
```json
{
  "score": 4,
  "stars": "★★★★☆",
  "breakdown": {
    "outcomeSpecific": true,
    "metricMeasurable": true,
    "targetDateValid": true,
    "firstActionActionable": true,
    "workloadRealistic": false
  },
  "missingCriteria": ["workloadRealistic"],
  "nextBestFix": "Reduce weekly target to 3 runs or shorten each run to 15 minutes"
}
```

## Goal health endpoint
`POST /api/goal/health/evaluate`

Response fields (minimum):
- `healthState`
- `riskReason`
- `confidence`
- `primaryRecommendation`
- `explainSignals[]`

## Adaptation apply endpoint
`POST /api/goal/adapt`

Request must include:
- `adaptationType`
- `beforeState`
- `afterState`
- `source` (`ai_recommendation` | `manual`)

---

## Accessibility and Performance Guardrails

## Accessibility
- Minimum contrast 4.5:1 on all text layers.
- Haptic/sound must never be the sole feedback channel.
- Full keyboard and screen-reader support for sheets and chips.
- Respect `prefers-reduced-motion` and persist user sensory settings.

## Performance budgets (mobile)
- Initial Today Focus render <= 1.8s on mid-tier device.
- AI recommendation card load <= 1.2s after screen open (cached path).
- Interaction latency target <= 100ms for tap-to-feedback.
- Keep animation on transform/opacity to avoid jank.

---

## Agent Execution Packets (for rapid implementation)

### Packet A — Plan Quality Engine + UI Surface
- Deliver scoring function + unit tests.
- Render star score and missing criteria in goal card.
- Add “improve in 60 seconds” CTA and AI rewrite flow.

### Packet B — Health Engine + Explainability
- Compute health state from 14-day signals.
- Show health badge and one recommendation.
- Add expandable “why” panel with evidence signals.

### Packet C — Adaptation One-Tap Flow
- Implement adaptation sheet with before/after diff.
- Persist adaptation event and offer undo for 10 seconds.
- Track adaptation acceptance analytics.

### Packet D — Journal Micro-Flow
- Add 3 suggestion chips + keyword note.
- Save friction tag and link to goal health input.
- Validate median completion time < 20s with telemetry.

### Packet E — Motion/Sensory + Settings
- Add motion tokens and haptic/sound maps.
- Build settings controls and reduced-motion path.
- Verify no regressions on low-end devices.

---

## Delivery Phases (AI-Agent Friendly)

## Phase 0 — Planning & Contracts
- Finalize scoring rubric and risk heuristic constants.
- Define types/interfaces for `PlanQualityResult` and `GoalHealthSnapshot`.
- Write acceptance tests for pure functions.

**Exit criteria**
- Deterministic scoring and risk engine pass tests.

## Phase 1 — Backend Foundations
- Add migration(s) for new fields and snapshot/adaptation tables.
- Build service functions for:
  - computing plan quality,
  - generating health snapshots,
  - recording adaptation actions.

**Exit criteria**
- CRUD + compute paths work in both Supabase and demo mode.

## Phase 2 — Goal UI Integration
- Add Goal Identification Card fields to create/edit UI.
- Show star score and plan quality breakdown in single-goal view.
- Add health badge + risk reason + one primary suggested action.

**Exit criteria**
- Users can see score and risk state for at least one goal end-to-end.

## Phase 3 — Adaptive Action UX
- Implement 1-click adaptation buttons.
- Persist adaptation events and update goal fields.
- Add lightweight “before/after” confirmation UI.

**Exit criteria**
- At-risk goal can be adapted in <= 2 taps.

## Phase 4 — Journal Quick Reflection
- Add AI suggestion chips for daily journal prompt selection.
- Add short keyword/note input and friction tagging.
- Feed friction tags into health snapshot inputs.

**Exit criteria**
- Daily reflection capture completes in <20 seconds median.

## Phase 5 — Coaching Quality & Iteration
- Tune heuristics based on real usage telemetry.
- Improve recommendation ordering quality.
- Add safeguards to avoid repetitive advice.

**Exit criteria**
- Reduction in stale goals and increase in adapted (not abandoned) goals.

## Phase 6 — Mobile Motion/Sensory Layer
- Implement production motion presets for key flow transitions.
- Add settings toggles for sounds and haptics.
- Add reduced-motion and sensory-safe defaults.

**Exit criteria**
- Motion/sound/haptics are user-configurable, accessible, and performance-safe on mobile.

---

## AI Prompting Contracts (Implementation Guidance)

## Plan-quality assistant prompt contract
Inputs:
- goal statement, metric, target date, first action, workload, priority
Outputs (strict JSON):
- `suggested_rewrite`
- `quality_issues[]`
- `improved_first_action`
- `confidence` (0–1)

## Daily reflection suggestion contract
Inputs:
- active goals, recent effort, recent journal entries
Outputs (strict JSON):
- `suggestions[]` (3 short selectable reflections)
- `most_likely_friction_tag`

## Daily coaching card contract
Inputs:
- plan quality score, health snapshot, recent adaptations, user tone preference
Outputs (strict JSON):
- `encouragement_line`
- `reality_observation`
- `recommended_action`
- `one_tap_options[]`
- `confidence`

All model outputs must be validated and normalized before UI use.

---

## Metrics & Success Criteria

### Product metrics
- % active goals with plan score >= 4
- % at-risk goals adapted within 7 days
- Daily reflection completion rate
- Median time to log daily reflection

### Behavior metrics
- Reduced “no activity after creation” goals
- Increased planned workload consistency
- Increased goal continuation after risk detection

### MVP success threshold
- +20% improvement in weekly active goal follow-through among users with at least 2 active goals.

---

## Risks & Mitigations
- **Risk:** Advice feels repetitive.
  - **Mitigation:** Rotate recommendation templates + track recent suggestion history.
- **Risk:** False positive “at risk” flags.
  - **Mitigation:** Make heuristics transparent and user-overridable.
- **Risk:** Extra UI complexity.
  - **Mitigation:** Keep one primary action visible; hide advanced details behind expanders.

---

## Execution Checklist (Copy/Paste for Agent Runs)
- [ ] Add DB migration for goal quality + health snapshot fields.
- [ ] Implement `computePlanQuality(goal)` with tests.
- [ ] Implement `computeGoalHealth(signals)` with tests.
- [ ] Surface stars + risk badge in single-goal card.
- [ ] Add 1-click adaptation actions and persistence.
- [ ] Add daily journal suggestion chips + note field.
- [ ] Add daily coaching card with positive+real response template.
- [ ] Implement motion tokens and reduced-motion support.
- [ ] Add optional sound/haptic feedback with settings controls.
- [ ] Track events for score changes and adaptation outcomes.

---

## Recommended First Build Ticket
**Ticket:** “Plan Quality Scoring v1 + Goal Card Display”

### Scope
- Add missing goal fields to model.
- Implement deterministic score function.
- Show star score + missing criteria list in UI.

### Done when
- User can create/edit goal and instantly see score.
- Low-score goals get one-click “Improve this goal” suggestions.
