# Environment Hack / Audit Feature Dev Plan

## Why this feature should exist

A lot of goal and habit failure in this app’s domain is not motivation failure — it is **environment mismatch** (phone nearby, missing cue, no prep, wrong time/place, friction too high). The repo already has pieces we can build on:

- Goals already support strategy types including `friction_removal` and have a health/adaptation engine. 
- Habits already capture `habit_environment` and track adherence/risk.
- There is existing telemetry + AI-assist infrastructure to coach users with contextual suggestions.

This plan proposes an integrated **Environment Hack / Audit** layer that plugs directly into:
1. Goal setup (LifeGoalInputDialog/GoalWorkspace), and
2. Habit setup + optimization (HabitWizard/HabitsModule).

---

## Current repo audit (implementation baseline)

## 1) Goal setup and quality engine already exist
- Goal creation flow starts in `GoalWorkspace` and saves via `insertGoal` plus optional steps/alerts. 
- Plan quality is computed deterministically in `computePlanQuality` and stored on `goals.plan_quality_score` + `plan_quality_breakdown`.
- Goal health uses 14-day signals + friction keywords (`stuck`, `unclear`, `overwhelmed`) and returns recommended adaptation actions.

**Implication:** Environment audit can be modeled as another deterministic quality/health signal, not a separate disconnected system.

## 2) Habit setup already captures environment context
- Habit wizard already includes `habitEnvironment` with minimum-length validation and persists it to `habits_v2.habit_environment`.
- Habit creation/update already emits telemetry events (`habit_environment_set`, `habit_environment_updated`).

**Implication:** We can extend existing fields + telemetry instead of inventing a parallel “habit setup v3.”

## 3) Existing strategy + adaptation framework is environment-ready
- Goal strategies include `friction_removal` (explicitly intended for blocker elimination).
- Goal adaptation pipeline supports traceable updates and snapshots.

**Implication:** Environment interventions can re-use strategy switching + adaptation logging patterns.

## 4) Data model already has audit-style tables for goals
- `goal_health_snapshots` and `goal_adaptations` are already typed and persisted.

**Implication:** We should add environment audit artifacts adjacent to these (same auditability philosophy).

---

## Product concept: “Environment Hack / Audit”

## Core user promise
When creating or strengthening a goal/habit, users should leave with:
1. A **specific environment setup** (“where, when, with what cue”),
2. A **friction removal plan** (“what could block me + pre-commit fix”),
3. A **fallback mode** (“minimum viable action if day goes off track”),
4. A trackable **environment score** and audit history.

## UX principle
Environment planning must stay lightweight (60–120 seconds), not become another heavy form.

## Access model (important)
This feature should be intentionally dual-path:

1. **All users (non-AI baseline):** deterministic scoring, practical environment templates, friction checklists, and static hack recommendations.
2. **Premium/optional AI:** “Ask AI for environment ideas” that personalizes hacks using the user’s goal/habit context and recent signals.

AI is an enhancement, not a requirement. Every user should still get high-quality guidance without AI.

---

## MVP scope (recommended)

## A) Goal setup: “Environment Audit Card”
Add an optional-but-prominent card in goal creation/edit flow:
- **Primary context**: Where will this happen most often?
- **Trigger/cue**: What starts this behavior?
- **Friction blocker**: Biggest likely obstacle?
- **Hack plan**: If blocker appears, what exact workaround?
- **Fallback floor**: 2-minute minimum version.

Output:
- `goal_environment_score` (0–5),
- structured environment fields,
- one recommended strategy (`friction_removal` when score is low).

## B) Habit wizard: “Environment Strength Check”
Enhance step 3 (targets/reminders) with:
- cue selector (time / location / event / person),
- friction checklist chips,
- one-tap anti-friction hacks (prep night before, remove distraction, visual cue, etc.),
- fallback tier quick-fill (auto-derive seed stage from environment risk).

Output:
- `habit_environment_score` (0–5),
- optional `environment_risk_tags[]`,
- recommended adjustment only when score <=2.

## C) Ongoing audit loop
In daily/weekly review surfaces:
- show “environment drift” warnings (e.g., environment note stale for 30+ days + low adherence),
- suggest a 1-minute re-audit,
- record all changes as auditable events.

## D) Built-in non-AI “Hack Library” (all users)
Ship a curated, high-signal set of practical hacks available without AI:
- **Cue hacks:** stack onto existing routines, visual trigger placement, alarm label scripts.
- **Friction hacks:** prep environment night before, remove app distractions, one-click start setup.
- **Fallback hacks:** 2-minute minimum action, reduced reps/time, “never zero” rules.
- **Recovery hacks:** missed-day restart script, weekend reset checklist.

Selection UX:
- one-tap chips per blocker type,
- top 3 recommended hacks by deterministic rules,
- users can save preferred hacks into environment context.

---

## Data model proposal

## New columns (fast path)

### `goals`
- `environment_context` `jsonb` nullable
- `environment_score` `int` nullable (0–5)
- `environment_last_audited_at` `timestamptz` nullable

### `habits_v2`
- `environment_context` `jsonb` nullable
- `environment_score` `int` nullable (0–5)
- `environment_risk_tags` `text[]` nullable
- `environment_last_audited_at` `timestamptz` nullable

## New audit table
### `environment_audits`
- `id uuid pk`
- `user_id uuid`
- `entity_type text check in ('goal','habit')`
- `entity_id uuid`
- `audit_source text` (`setup`, `weekly_review`, `ai_prompt`, `manual_edit`)
- `score_before int null`
- `score_after int null`
- `risk_tags text[] null`
- `before_state jsonb null`
- `after_state jsonb null`
- `created_at timestamptz default now()`

RLS: mirror existing user-owned patterns used in goals/habits tables.

---

## Scoring model (deterministic v1)

Compute `environment_score` as 0–5 with 1 point each:
1. **Specific place** exists (>= 3 words).
2. **Clear cue/trigger** exists.
3. **Known blocker identified**.
4. **If-then hack written** (`If <blocker>, then <action>` shape heuristic).
5. **Fallback floor defined** (<= 10 min / clearly smaller).

Banding:
- 0–2: Fragile setup (show intervention)
- 3: Usable but risky
- 4–5: Strong environment design

This should live in pure utility helpers (parallel to `planQuality.ts`) so it is testable and AI-optional.

## Deterministic recommendation engine (all users)
Alongside score, return a lightweight non-AI recommendation object:
- `primaryRiskTag`
- `topHackSuggestions[]` (from built-in hack library)
- `fallbackSuggestion`

This gives all users immediate actionable advice even if AI is disabled, unavailable, or not subscribed.

---

## Integration plan by layer

## 1) Frontend (goals)

### Files to extend
- `src/components/LifeGoalInputDialog.tsx`
- `src/features/goals/GoalWorkspace.tsx`

### Changes
- Add `environment` subsection to `LifeGoalFormData`.
- Add UI fields/chips in guided/basic tab.
- Live-calculate and render environment score badge near strategy picker.
- On save, include environment payload in goal insert/update.
- If score <=2, prompt: “Use Friction Removal strategy?” one-tap switch.

## 2) Frontend (habits)

### Files to extend
- `src/features/habits/HabitWizard.tsx`
- `src/features/habits/HabitsModule.tsx`

### Changes
- Extend `HabitWizardDraft` with structured environment audit fields.
- Keep existing `habitEnvironment` text for backward compatibility; map richer fields into JSON context.
- Add risk-tag chips + quick hacks.
- Persist environment score and metadata on create/update.

## 3) Shared domain logic

### New module(s)
- `src/features/goals/environmentAudit.ts` (or shared `src/features/execution/environmentAudit.ts`)

### Responsibilities
- scoring function,
- normalization,
- risk tag inference,
- recommendation helper (`friction_removal`, `reduce_workload`, etc. bridge).

## 4) Services / persistence

### Files to extend
- `src/services/goals.ts`
- `src/services/habitsV2.ts`
- new `src/services/environmentAudits.ts`

### Changes
- include score/context fields in insert/update payloads,
- write audit events on each meaningful environment update,
- keep demo-mode compatibility by extending `src/services/demoData.ts`.

## 5) Database typing + migrations
- add migration(s) for new columns/table,
- regenerate/update `src/lib/database.types.ts`.

---

## AI assist opportunities (phase 2, optional)

Use existing AI infrastructure for suggestions, but keep deterministic fallback:
- “Improve my environment plan” button in goal/habit setup,
- returns 3 hack options based on blocker + schedule type,
- user must confirm before write (auditable).

Important: AI should **not** be required to compute score or save.

## Premium AI mode details (optional)
Because AI is already wired into the app/PWA, add an explicit premium/optional path:
- CTA: **“Ask AI for environment ideas”** shown after deterministic recommendations.
- AI prompt context: goal/habit title, schedule type, blocker tags, current environment score, recent adherence trend.
- AI output shape: 3 ranked hacks, each with `why`, `setup steps`, and `fallback version`.
- User controls: apply one suggestion, edit before save, or dismiss and keep non-AI defaults.

Failure handling:
- If AI request fails, fall back to deterministic hack suggestions with no dead end.
- If user is not premium, keep CTA hidden and show full non-AI guidance.

---

## Rollout phases

## Phase 1 — Foundations (DB + deterministic scoring)
- migrations + types,
- scoring utilities + unit tests,
- service layer write/read support.

## Phase 2 — Setup UI integration
- goal dialog environment card,
- habit wizard strength check,
- low-score intervention prompts.

## Phase 3 — Audit + coaching loop
- `environment_audits` writes,
- weekly re-audit prompts,
- telemetry dashboard hooks.

## Phase 4 — AI enhancement (optional)
- contextual hack generation,
- smarter risk-tag inference from behavior trends.

## Phase 5 — Premium packaging + experiments
- Feature-flag AI CTA by access tier.
- A/B test placement: inline under score vs separate button row.
- Measure conversion and utility without degrading free-user value.

---

## Telemetry additions (recommended)

Add events:
- `goal_environment_audit_completed`
- `habit_environment_audit_completed`
- `environment_hack_applied`
- `environment_reaudit_prompt_shown`
- `environment_reaudit_prompt_accepted`
- `environment_ai_ideas_requested`
- `environment_ai_ideas_applied`
- `environment_non_ai_hack_applied`

Metadata examples:
- `entityType`, `entityId`, `scoreBefore`, `scoreAfter`, `riskTags`, `source`, `usedAi`.
- `accessTier` (`free` | `premium`)
- `suggestionSource` (`deterministic` | `ai`)

---

## QA checklist (MVP)

1. Goal can be created without environment section (nullable safety).
2. Goal with environment fields persists + score is stable on reload.
3. Low-score goal shows friction-removal recommendation.
4. Habit wizard supports existing simple environment text and enhanced structured fields.
5. Editing habit preserves prior environment data.
6. Audit row is written on each environment change.
7. Demo mode does not crash when new fields exist.
8. RLS blocks cross-user audit reads/writes.
9. Free users still receive deterministic hack suggestions (no AI dependency).
10. Premium users can request AI ideas and apply them.
11. AI failure path gracefully falls back to non-AI recommendations.

---

## Risks & mitigations

- **Form bloat risk:** Keep fields compact with chips + progressive disclosure.
- **Data fragmentation:** Use one canonical JSON schema for environment context across goals/habits.
- **Migration complexity:** Ship nullable columns first; backfill later.
- **AI reliability variance:** deterministic scoring remains source of truth.

---

## Suggested initial implementation ticket breakdown

1. **ENV-1**: Add DB columns + `environment_audits` table + RLS.
2. **ENV-2**: Add `environmentAudit` scoring utility + tests.
3. **ENV-3**: Extend goal form/types/save path for environment fields.
4. **ENV-4**: Extend habit wizard/types/save path for structured environment context.
5. **ENV-5**: Persist audit events + telemetry.
6. **ENV-6**: Weekly re-audit prompt in habit/goal review surfaces.
7. **ENV-7 (optional)**: AI hack suggestions + acceptance UX.

---

## Definition of done (MVP)

- Users can define environment context in both goal and habit setup.
- System computes and displays environment score deterministically.
- Low-score setups trigger concrete friction-removal guidance.
- All environment changes are auditable via DB events.
- No regressions in demo mode or existing setup flows.
