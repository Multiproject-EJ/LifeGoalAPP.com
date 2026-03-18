# Environment Hack / Audit Feature Dev Plan

## Why this feature should exist

A lot of goal and habit failure in this app’s domain is not motivation failure — it is **environment mismatch** (phone nearby, missing cue, no prep, wrong time/place, friction too high). The repo already has pieces we can build on:

- Goals already support strategy types including `friction_removal` and have a health/adaptation engine.
- Habits already capture `habit_environment` and track adherence/risk.
- There is existing telemetry + AI-assist infrastructure to coach users with contextual suggestions.

This plan proposes an integrated **Environment Hack / Audit** layer that plugs directly into:
1. Goal setup (`LifeGoalInputDialog` / `GoalWorkspace`), and
2. Habit setup + optimization (`HabitWizard` / `HabitsModule`).

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

## Experience principles
- **Optional, not blocking:** creation must always succeed without environment data.
- **Prominent, not hidden:** frame the feature as a success-strengthening upgrade card.
- **Mobile-first:** one decision at a time, stacked cards/bottom sheet, large touch targets, low typing.
- **Visual and fun:** chips, iconography, subtle progress animation, positive language.
- **Private and trustworthy:** show “private to you,” make AI preview-only until confirmed, preserve editability.

## Access model (important)
This feature should be intentionally dual-path:

1. **All users (non-AI baseline):** deterministic scoring, practical environment templates, friction checklists, and static hack recommendations.
2. **Premium/optional AI:** “Ask AI for environment ideas” that personalizes hacks using the user’s goal/habit context and recent signals.

AI is an enhancement, not a requirement. Every user should still get high-quality guidance without AI.

---

## Mobile-first UX / UI direction

### Positioning
Do **not** present this as compliance or extra paperwork. Position it as:
- **Strengthen this goal**
- **Make this habit easier**
- **Build your success setup**
- **Boost follow-through**

### Interaction model
Use a two-path pattern in both flows:
- **Primary CTA:** save goal / create habit
- **Secondary upgrade CTA:** strengthen with environment audit
- **Secondary dismissal:** skip for now

### Visual language
- Use a **5-step strength meter** instead of a raw score.
- Use chips + icons for cue, blocker, hack, and fallback selection.
- Use supportive copy such as “What usually gets in the way?” instead of shame-heavy phrasing.
- Reveal one section at a time to keep the flow lightweight on smaller screens.

### Emotional design
- Celebrate “minimum version” as a resilience move, not a compromise.
- Show “fragile / usable / strong” only as coaching labels beneath the meter.
- Reward completion with subtle motion and an immediate practical suggestion.

---

## MVP scope (recommended)

## A) Goal setup: “Environment Audit Card”
Add an optional-but-prominent card in goal creation/edit flow:
- **Primary context:** Where will this happen most often?
- **Trigger/cue:** What starts this behavior?
- **Friction blocker:** Biggest likely obstacle?
- **Hack plan:** If blocker appears, what exact workaround?
- **Fallback floor:** 2-minute minimum version.

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

## Concrete mobile wireframe spec

## Shared component anatomy: `EnvironmentStrengthCard`
- Title: **Make this easier to follow**
- Subtitle: “Optional setup that improves success odds”
- 5-dot or segmented **strength meter**
- Four tappable sections: **Place**, **Cue**, **Blocker**, **Fallback**
- Suggested hacks row
- Footer actions: **Save setup** and **Skip for now**

## Goal flow wireframe
### Collapsed state
- Header row with title + `0/5` strength indicator
- Supporting text: “Add a cue, blocker plan, and backup version”
- Actions: `Start`, `Skip for now`

### Expanded mobile state
Present as a bottom sheet or full-height card stack:
1. **Where will this happen most often?**
   - suggested chips: Home, Desk, Gym, Commute, Custom
2. **What will trigger it?**
   - chips: After coffee, At 7:00 AM, After work, When I open laptop, Custom
3. **What usually gets in the way?**
   - chips: Phone, Low energy, No time, Forgetting, Clutter, Custom
4. **Choose a fix + minimum version**
   - quick hacks + editable fallback field

### Completion state
- Meter updates to `4/5 Strong setup`
- Suggested copy: “Recommended strategy: Friction Removal” when score <= 2
- Show top 3 deterministic hack chips with one-tap save

## Habit flow wireframe
Integrate in the reminder/target area as an optional section:
- Section label: **Make this habit easier (optional)**
- Inline chips for cue type + blocker type
- Quick hack carousel under the selected blocker
- Auto-suggest “bad day version” based on habit type
- Persist legacy `habitEnvironment` free text in a collapsible “notes” field for continuity

## Accessibility / mobile constraints
- Touch targets at least 44px high.
- Never require more than one text field per screen.
- Respect reduced-motion settings for success animations.
- Keep critical actions visible above the keyboard on small screens.

---

## Component architecture proposal

## New UI building blocks
- `src/features/environment/components/EnvironmentStrengthCard.tsx`
- `src/features/environment/components/EnvironmentAuditSheet.tsx`
- `src/features/environment/components/EnvironmentMeter.tsx`
- `src/features/environment/components/EnvironmentHackChips.tsx`
- `src/features/environment/components/FallbackTierPicker.tsx`

## Shared state / domain layer
- `src/features/environment/environmentAudit.ts`
- `src/features/environment/environmentSchema.ts`
- `src/features/environment/environmentRecommendations.ts`
- `src/features/environment/environmentTelemetry.ts`

## Responsibilities
### `environmentSchema.ts`
- canonical TypeScript shape for `environment_context`
- normalization helpers for goals and habits
- backwards-compatible mapping from `habitEnvironment` text

### `environmentAudit.ts`
- deterministic score calculation
- label/banding helper (`fragile`, `usable`, `strong`)
- completeness helpers for meter rendering
- pure functions only for easy testing

### `environmentRecommendations.ts`
- risk tag inference
- non-AI hack lookup
- “recommended goal strategy” bridge (`friction_removal`, `reduce_workload`, etc.)

### Container integration
- `LifeGoalInputDialog` should mount the shared card in a goal-specific wrapper.
- `GoalWorkspace` should read/write `environment_context`, `environment_score`, and recommendation state.
- `HabitWizard` should mount the shared card with habit-specific presets and preserve `habitEnvironment` text.
- `HabitsModule` should surface re-audit prompts and edit affordances.

## Suggested data shape (`environment_context`)
```ts
export interface EnvironmentContextV1 {
  version: 1;
  place?: string;
  cue?: {
    type?: 'time' | 'location' | 'event' | 'person' | 'custom';
    label?: string;
  };
  blocker?: {
    label?: string;
    tags?: string[];
  };
  hackPlan?: {
    summary?: string;
    selectedHackIds?: string[];
  };
  fallback?: {
    label?: string;
    durationMinutes?: number | null;
  };
  source?: 'setup' | 'edit' | 'weekly_review' | 'ai';
  updatedAt?: string;
}
```

This JSON shape should stay intentionally compact so it is:
- easy to version,
- shared by goals and habits,
- safe to render in mobile UI,
- and flexible enough for deterministic plus AI-assisted suggestions.

---

## Data model proposal

## Preferred persistence strategy
Use a **hybrid storage model**:
1. **Fast-path nullable columns** on `goals` and `habits_v2` for current score / current context.
2. **Dedicated `environment_audits` table** for append-only history.

This is the best fit for the current repo because it keeps reads simple for core UI while preserving auditability and re-audit history.

## New columns (fast path)

### `goals`
- `environment_context jsonb` nullable
- `environment_score int` nullable (`CHECK BETWEEN 0 AND 5`)
- `environment_last_audited_at timestamptz` nullable

### `habits_v2`
- `environment_context jsonb` nullable
- `environment_score int` nullable (`CHECK BETWEEN 0 AND 5`)
- `environment_risk_tags text[]` nullable default `'{}'::text[]`
- `environment_last_audited_at timestamptz` nullable

## New audit table
### `environment_audits`
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `goal_id uuid null references goals(id) on delete cascade`
- `habit_id uuid null references habits_v2(id) on delete cascade`
- `entity_type text generated or checked to be ('goal','habit')`
- `audit_source text` (`setup`, `weekly_review`, `ai_prompt`, `manual_edit`)
- `score_before int null`
- `score_after int null`
- `risk_tags text[] not null default '{}'::text[]`
- `before_state jsonb null`
- `after_state jsonb null`
- `created_at timestamptz default now()`

### Integrity rules
- exactly one of `goal_id` / `habit_id` must be non-null,
- `entity_type` must match the populated foreign key,
- scores should stay within 0–5,
- index by `(goal_id, created_at desc)`, `(habit_id, created_at desc)`, and `(user_id, created_at desc)`.

### RLS
Mirror existing user-owned patterns used in goals/habits tables:
- select only own rows,
- insert only rows with own `user_id`,
- no cross-user reads/writes.

---

## Supabase migration plan (recommended implementation)

Create a dedicated migration such as `supabase/migrations/0185_environment_audit_foundations.sql` with the following structure:

1. **Alter `public.goals`**
   - add `environment_context jsonb`
   - add `environment_score integer check (environment_score between 0 and 5)`
   - add `environment_last_audited_at timestamptz`

2. **Alter `public.habits_v2`**
   - add `environment_context jsonb`
   - add `environment_score integer check (environment_score between 0 and 5)`
   - add `environment_risk_tags text[] not null default '{}'::text[]`
   - add `environment_last_audited_at timestamptz`

3. **Create `public.environment_audits`**
   - include `goal_id` + `habit_id` nullable foreign keys
   - enforce exclusive ownership with a `CHECK`
   - use `audit_source` check for known sources
   - use `score_before` / `score_after` checks for 0–5

4. **Add comments**
   - document each new column and table for maintainability

5. **Add indexes**
   - `idx_environment_audits_goal_id_created_at`
   - `idx_environment_audits_habit_id_created_at`
   - `idx_environment_audits_user_id_created_at`
   - optional GIN indexes later only if JSON querying becomes real product need

6. **Enable RLS + policies**
   - `SELECT` own rows
   - `INSERT` own rows
   - defer update/delete policies unless product truly needs mutable history; prefer append-only audit semantics

7. **Backfill (light touch only)**
   - set `habits_v2.environment_context` from legacy `habit_environment` only if/when needed in app code, not necessarily in SQL
   - do **not** force a risky mass backfill in the migration; keep rollout nullable-first

8. **Regenerate DB types**
   - update `src/lib/database.types.ts` after applying migration locally

## Why this is the best migration approach
- It preserves existing goal/habit reads without forcing joins.
- It keeps environment history append-only and auditable.
- It remains safe for phased rollout because every new field is nullable or defaulted.
- It avoids over-engineering with a separate “environment profile” table before product usage is proven.

---

## Scoring model (deterministic v1)

Compute `environment_score` as 0–5 with 1 point each:
1. **Specific place** exists (>= 3 words or selected structured place + optional detail).
2. **Clear cue/trigger** exists.
3. **Known blocker identified**.
4. **If-then hack written** (`If <blocker>, then <action>` shape heuristic or selected deterministic hack).
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
- `recommendedStrategy` (`friction_removal` when environment risk is dominant)

This gives all users immediate actionable advice even if AI is disabled, unavailable, or not subscribed.

---

## Integration plan by layer

## 1) Frontend (goals)

### Files to extend
- `src/components/LifeGoalInputDialog.tsx`
- `src/features/goals/GoalWorkspace.tsx`

### Changes
- Add `environment` subsection to `LifeGoalFormData`.
- Mount `EnvironmentStrengthCard` in guided/basic tab.
- Live-calculate and render environment meter near strategy picker.
- On save, include environment payload in goal insert/update.
- If score <= 2, prompt: “Use Friction Removal strategy?” one-tap switch.

## 2) Frontend (habits)

### Files to extend
- `src/features/habits/HabitWizard.tsx`
- `src/features/habits/HabitsModule.tsx`

### Changes
- Extend `HabitWizardDraft` with structured environment audit fields.
- Keep existing `habitEnvironment` text for backward compatibility; map richer fields into JSON context.
- Add risk-tag chips + quick hacks.
- Persist environment score and metadata on create/update.
- Add a lightweight “re-audit” entry point in edit/review surfaces.

## 3) Shared domain logic

### New module(s)
- `src/features/environment/environmentAudit.ts`
- `src/features/environment/environmentSchema.ts`
- `src/features/environment/environmentRecommendations.ts`

### Responsibilities
- scoring function,
- normalization,
- risk tag inference,
- recommendation helper,
- low-score strategy bridging.

## 4) Services / persistence

### Files to extend
- `src/services/goals.ts`
- `src/services/habitsV2.ts`
- `src/services/environmentAudits.ts`
- `src/services/demoData.ts`

### Changes
- include score/context fields in insert/update payloads,
- write audit events on each meaningful environment update,
- keep demo-mode compatibility,
- keep save flows resilient when environment data is omitted.

## 5) Database typing + migrations
- add migration(s) for new columns/table,
- regenerate/update `src/lib/database.types.ts`,
- add unit coverage around serialization / normalization helpers.

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
- service layer write/read support,
- shared schema module.

## Phase 2 — Setup UI integration
- goal dialog environment card,
- habit wizard strength check,
- low-score intervention prompts,
- mobile bottom-sheet/card-stack UX.

## Phase 3 — Audit + coaching loop
- `environment_audits` writes,
- weekly re-audit prompts,
- telemetry dashboard hooks,
- stale environment nudges.

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
- `entityType`, `entityId`, `scoreBefore`, `scoreAfter`, `riskTags`, `source`, `usedAi`
- `accessTier` (`free` | `premium`)
- `suggestionSource` (`deterministic` | `ai`)
- `surface` (`goal_create`, `goal_edit`, `habit_create`, `weekly_review`)

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
12. Mobile layout keeps primary actions visible on 320–390px widths.
13. Reduced-motion mode still communicates score changes accessibly.

---

## Risks & mitigations

- **Form bloat risk:** Keep fields compact with chips + progressive disclosure.
- **Data fragmentation:** Use one canonical JSON schema for environment context across goals/habits.
- **Migration complexity:** Ship nullable columns first; backfill later only if justified.
- **AI reliability variance:** deterministic scoring remains source of truth.
- **Mobile clutter:** use bottom sheet / one-card-at-a-time UX and cap visible choices.
- **Over-collection risk:** keep environment data practical and optional; avoid sensitive surveillance-style prompts.

---

## Suggested initial implementation ticket breakdown

1. **ENV-1**: Add DB columns + `environment_audits` table + RLS.
2. **ENV-2**: Add `environmentAudit` scoring utility + tests.
3. **ENV-3**: Build shared `EnvironmentStrengthCard` + meter + hack chips.
4. **ENV-4**: Extend goal form/types/save path for environment fields.
5. **ENV-5**: Extend habit wizard/types/save path for structured environment context.
6. **ENV-6**: Persist audit events + telemetry.
7. **ENV-7**: Weekly re-audit prompt in habit/goal review surfaces.
8. **ENV-8 (optional)**: AI hack suggestions + acceptance UX.

---

## Definition of done (MVP)

- Users can define environment context in both goal and habit setup.
- System computes and displays environment score deterministically.
- Low-score setups trigger concrete friction-removal guidance.
- All environment changes are auditable via DB events.
- The feature feels optional, visual, and mobile-friendly rather than like a long form.
- No regressions in demo mode or existing setup flows.
