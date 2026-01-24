# Profile Strength → Guided Help (Agent-Optimized Draft Plan)

This version explicitly optimizes for:
- **mobile UI first**,
- **small, safe UI changes only** (badges + profile strength card),
- **agent-friendly chunking** to avoid timeouts,
- an **alive dev plan** that tracks progress and next steps.

---

## 1) Product intent (unchanged, clarified)
Profile Strength becomes the **central guidance engine** that:

1. Measures how well each profile area is “charged” (0–10).
2. Surfaces the *single best next improvement*.
3. Makes it easy to complete that improvement (with or without AI).
4. Awards XP when a concrete improvement is completed.

This turns a passive score into a practical “do this next” loop.

---

## 2) Hard constraints (must not be violated)
These constraints should drive every task and review.

### 2.1 Mobile UI first
- Design and test for mobile first.
- Desktop can follow, but mobile behaviors are the source of truth.

### 2.2 UI scope control (keep it small)
We should NOT add broad new UI surfaces in v1.

**Allowed v1 UI changes:**
1. Replace the current hardcoded Profile Strength card content in the profile popup menu with real data and better guidance.
2. Add per-area score badges (0–10) on the icons in the profile menu.
3. Add a press-and-hold gesture on those icons to open “Improve this area.”

**Not allowed in v1:**
- Large new dashboards.
- New persistent panels across many tabs.
- Major navigation changes.

### 2.3 Do not break anything
- All work must be additive or behind guards.
- If data is missing, the UI must degrade gracefully.
- The default experience should remain functional without AI.

---

## 3) Profile Strength contract (make agent execution fast + safe)
This is the strict output shape the scoring layer should produce. It reduces ambiguity and UI risk.

### 3.1 Contract shape (conceptual)

```ts
type AreaKey =
  | 'goals'
  | 'habits'
  | 'journal'
  | 'vision_board'
  | 'life_wheel'
  | 'identity';

type ReasonCode =
  | 'no_data'
  | 'low_coverage'
  | 'low_recency'
  | 'low_quality'
  | 'needs_review'
  | 'stale_snapshot'
  | 'error_fallback';

type NextTask = {
  id: string;
  area: AreaKey;
  title: string;
  description: string;
  etaMinutes: 1 | 2 | 3 | 5;
  xpReward: number;
  reasonCodes: ReasonCode[];
  action: {
    type: 'navigate' | 'open_modal' | 'start_flow';
    target: string;
    payload?: Record<string, unknown>;
  };
};

type ProfileStrengthResult = {
  areaScores: Record<AreaKey, number | null>; // 0..10 when known
  overallPercent: number | null; // 0..100 when computable
  reasonsByArea: Record<AreaKey, ReasonCode[]>;
  nextTasksByArea: Record<AreaKey, NextTask[]>;
  globalNextTask: NextTask | null;
  meta: {
    computedAt: string;
    usedFallbackData: boolean;
  };
};
```

### 3.2 Contract rules
- Scores are always **clamped** to 0–10.
- `null` means “unknown/unavailable,” not zero.
- `globalNextTask` must be one of the tasks already present in `nextTasksByArea`.
- The scoring engine must never throw; it should return a safe fallback with `usedFallbackData: true`.

---

## 4) Working definition and score model

### 4.1 Per-area strength (0–10)
We treat each major profile surface as a **template** that can be filled out to improve advice quality.

- **0** = user has done essentially nothing in that area.
- **10** = the area is meaningfully complete and useful.

### 4.2 Overall strength (0–100%)
Start simple and transparent:

```text
overall_percent = round((sum(area_scores) / (area_count * 10)) * 100)
```

Equal weighting is fine for v1.

---

## 5) Scored areas (v1 scope)
These align with your intent and existing features.

1. **Goals**
2. **Habits**
3. **Journal**
4. **Vision Board**
5. **Life Wheel Check-ins**
6. **Personality / Identity**

Optional later: Projects, Body, Coach readiness.

---

## 6) Missing data policy (must be explicit)
This removes ambiguity and prevents UI breakage.

### 6.1 Policy table
- **Unavailable data (query error / permissions / offline):**
  - score = `null`
  - reasons include `error_fallback`
  - UI shows neutral badge state
  - use last-known values when safely available
- **Never used / empty template:**
  - score = `0`
  - reasons include `no_data`
- **Partial but valid data:**
  - compute normally
  - include specific reason codes for gaps

### 6.2 UI interpretation rules
- `null` is not shown as `0`.
- `0` should be visible (it is useful guidance).
- If overall cannot be computed safely, show a neutral state rather than a misleading percent.

---

## 7) Score stability rules (prevent badge thrash)
Badges should feel stable and trustworthy.

### 7.1 Stability guardrails
- Recompute no more than once per menu-open (or on clear state transitions).
- If live recompute is needed, throttle it (e.g., every 15–60 seconds max).
- Clamp per-refresh movement (e.g., max ±2) unless a major event occurs.
- Prefer last-known-good values over flicker when data is temporarily missing.

### 7.2 State transition priority
If a user completes an improvement, it is acceptable for the score to jump immediately.
That is a “major event.”

---

## 8) Draft scoring heuristics per area (0–10)
We want explainable math that drives good next tasks (not perfect math).

### 8.1 Goals score (0–10)
Key idea: goals should cover the life wheel and be actionable.

Draft signals:
- Coverage: number of life wheel categories with ≥1 active goal.
- Depth: categories with ≥2 goals.
- Quality: goals include success metrics / next actions / time horizon.
- Health: goals are not all stalled/archived.

### 8.2 Habits score (0–10)
Key idea: the user needs a stable weekly system.

Draft signals:
- Habits exist and are scheduled.
- Habits span multiple life wheel areas.
- User has recent completions.
- Habit list is maintained (not overloaded).

### 8.3 Journal score (0–10)
Key idea: journaling provides reflection data for the coach.

Draft signals:
- Recency window.
- Entries per week.
- Some depth/structure.
- Structured modes when relevant.

### 8.4 Vision Board score (0–10)
Key idea: vision boards encode direction and motivation.

Draft signals:
- Board/items exist.
- Items tagged to life wheel areas.
- Maintenance/recency.

### 8.5 Life Wheel Check-ins score (0–10)
Key idea: check-ins help prioritize what to fix next.

Draft signals:
- Has at least one check-in.
- Recency.
- Consistency.

### 8.6 Personality / Identity score (0–10)
Key idea: identity/personality data personalizes coaching.

Draft signals:
- Personality test completed.
- Results saved.
- Supporting fields filled.
- Occasional confirmation/refresh.

---

## 9) The “simple next task hierarchy” (decision logic)
This is the core behavioral engine.

### 9.1 Hierarchy principle
Always choose the **smallest meaningful action** that:
1. Increases a score.
2. Improves advice quality.
3. Can be finished quickly on mobile.

### 9.2 Decision order (draft)
1. Identify the lowest-scoring area.
2. Within that area, identify the highest-leverage missing requirement.
3. Propose 1 primary task (1–3 minutes) and 1–2 alternates.
4. Prefer actions that improve life wheel coverage and reduce empty templates.

---

## 10) Menu badges (0–10) + minimal UI plan

### 10.1 UX requirement
Each icon in the profile menu shows a small badge with that area’s strength score (0–10).

Rules:
- Show `0` when empty (it is useful feedback).
- Use a neutral loading state when unknown.
- Badge should be readable but subtle.

### 10.2 UI safety constraints
- Badge must not shift layout significantly.
- Badge rendering must be resilient to missing data.
- Badge colors should be derived from existing theme tokens where possible.
- Badges must respect the missing data policy and stability rules.

---

## 11) New interaction: press-and-hold to “Improve this area”
This is the new feature you requested and it fits the minimal-UI constraint.

### 11.1 Interaction concept
- **Tap**: normal navigation.
- **Press and hold (~1 second)**: open a small “Improve this area” suggestion surface.

This gives fast access to micro-improvements without cluttering the UI.

### 11.2 Mobile-first gesture requirements
- Hold threshold: ~900–1100ms.
- Cancel hold if the finger moves beyond a small slop radius.
- On hold success, prevent the normal tap navigation.

### 11.3 Gesture safety details (important for real devices)
Use pointer events and explicitly handle cancellations.

Recommended event model:
1. `pointerdown`: start hold timer and capture starting position.
2. `pointermove`: if movement exceeds slop radius, cancel hold.
3. `pointerup`: if hold not triggered, allow normal tap.
4. `pointercancel` / `pointerleave`: cancel hold.
5. On hold success:
   - fire the improve action,
   - call `preventDefault()` where appropriate,
   - suppress the subsequent click/tap navigation.

Also cancel hold when the menu scrolls or closes.

### 11.4 Very important: prevent native text selection on hold
On phones, long-press can trigger text selection / OS UI overlays. We must avoid this.

Requirements for menu buttons/icons:
1. Apply `user-select: none;` to the pressable surface and its children.
2. Prefer rendering badge numbers via non-selectable elements.
3. Avoid exposing selectable text nodes on the pressable icon surface.
4. If any label text must be visible, ensure it is also non-selectable.

### 11.5 Minimal anti-selection CSS recipe
This is the smallest reliable recipe for mobile long-press surfaces:

```css
.profile-menu-button,
.profile-menu-button * {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

---

## 12) Guided Help flow (with and without AI)
Guided Help must remain optional and must work without AI.

### 12.1 Flow stages
**A — Diagnose**: what is low and why.

**B — Propose**: one recommended micro-task + alternatives.

**C — Assist**:
- AI mode: suggestions/edits/examples.
- Non-AI mode: templates/checklists/examples.

**D — Commit**: user saves a concrete improvement.

**E — Reward + next**: XP, updated score, next suggestion.

---

## 13) XP design for improvements
XP is the reinforcement loop. Reward completion, not exploration.

### 13.1 XP layers (draft)
A) Base XP per improvement task.

B) Quality XP bonuses for better completion.

C) Coverage bonuses (excellent for momentum):
- All life wheel categories have ≥1 goal: +100 XP
- All life wheel categories have ≥2 habits: +250 XP

### 13.2 XP integrity rules (prevent farming / duplication bugs)
- XP triggers on **state transitions** (unmet → met), not on page loads.
- Coverage bonuses must be recorded as earned so they do not repeat.
- If scoring runs multiple times, XP should not re-fire unless a new transition occurs.

---

## 14) Agent-optimized development plan (chunked, safe, alive)
This section is the most important update: it restructures the plan so an AI agent can execute it reliably without timeouts and with minimal risk.

### 14.1 Execution principles (agent rules)
1. Each task must be completable in a single small PR-sized chunk.
2. Each chunk must include:
   - scope,
   - change list,
   - acceptance criteria,
   - rollback plan.
3. Prefer read-only computation before UI wiring.
4. Gate risky behavior behind feature flags or safe fallbacks.
5. Update this doc after every chunk (alive plan).

### 14.2 Recommended chunk sequence (mobile-first, minimal UI)

#### Chunk 0 — Repo orientation + guardrails
Goal: reduce risk before changes.

Deliverables:
- Identify source-of-truth data for goals, habits, journal, vision board, check-ins, identity.
- Identify where the profile menu icons and profile strength card live.
- Define a single config file for weights/thresholds (even if static).

Acceptance criteria:
- Clear map of data inputs and UI touchpoints.
- No UI changes yet.

Chunk 0 findings (repo orientation):
- Data inputs (current sources):
  - Goals: `src/services/goals.ts` (Supabase + demo) and `src/data/goalsRepo.ts` (offline-first cache). 
  - Habits: `src/services/habitsV2.ts` (habits, logs, streaks).
  - Journal: `src/services/journal.ts` (entries + demo fallback).
  - Vision Board: `src/services/visionBoard.ts` (vision_images + demo fallback).
  - Life Wheel Check-ins: `src/services/checkins.ts` (checkins + demo fallback).
  - Identity/Personality: `src/services/personalityTest.ts` and `src/data/personalityTestRepo.ts` (local storage sync).
- UI touchpoints (v1 scope):
  - Mobile profile menu list + icons: `src/App.tsx` (mobile menu overlay list items).
  - Profile Strength summary card + modal: `src/App.tsx` (profile strength card + modal content).
- Constants seed file for thresholds/weights: `src/constants/profileStrength.ts`.

#### Chunk 0.5 — Dev-only debug view / telemetry hooks
Goal: verify scoring safely before UI changes.

Deliverables:
- A dev-only debug output (console summary or small debug panel behind a flag).
- It should show:
  - per-area scores,
  - reason codes,
  - selected global next task,
  - whether fallback data was used.

Acceptance criteria:
- Scoring can be validated without changing end-user UI.
- Debug output is gated and not shown in production.

#### Chunk 1 — Strength scoring engine (no UI changes)
Goal: compute scores safely and deterministically.

Deliverables:
- A pure scoring module that returns the contract shape in Section 3.
- Outputs include:
  - per-area scores (0–10),
  - overall percent,
  - reason codes / missing requirements,
  - suggested next tasks (data only).
- All outputs must degrade gracefully when data is missing.

Acceptance criteria:
- Module can run with partial data and never throws.
- Scores are explainable via reason codes.

#### Chunk 2 — Wire real data into scoring (still minimal UI impact)
Goal: feed the scoring engine from existing services.

Deliverables:
- Data aggregation layer that gathers the needed counts/signals.
- Safe defaults when queries fail or data is absent.

Acceptance criteria:
- Scoring engine works from real user data.
- No regressions to existing tabs.

#### Chunk 3 — Replace hardcoded Profile Strength card
Goal: small, visible, controlled UI change.

Deliverables:
- Replace hardcoded “84% charged” with computed values.
- Add a minimal breakdown: top 1–2 gaps + one suggested task.
- Keep layout very close to current UI.

Acceptance criteria:
- Card works on mobile first.
- Card renders even when data is missing.

#### Chunk 4 — Add menu icon badges (0–10)
Goal: the second and last major UI change in v1.

Deliverables:
- Add per-area score badges to profile menu icons.
- Badges are non-selectable on mobile.
- No layout breakage.

Acceptance criteria:
- Tap navigation still works exactly as before.
- Scores are visible and stable.

#### Chunk 5 — Press-and-hold gesture → “Improve this area”
Goal: new power feature without adding lots of UI.

Deliverables:
- Implement press-and-hold detection on mobile menu icons.
- On hold success, open a small suggestion surface.
- Ensure text selection / callout does not appear.

Acceptance criteria:
- Tap still navigates.
- Hold opens improvement suggestion.
- No native text selection on hold.

#### Chunk 6 — XP hooks for improvements (behind guards)
Goal: reward completed improvements safely.

Deliverables:
- Emit XP events only when a concrete improvement is saved.
- Add coverage bonuses with clear criteria checks.
- Apply the XP integrity rules in Section 13.2.

Acceptance criteria:
- XP only fires once per completed action.
- Bonuses fire only when criteria transition from unmet → met.

---

## 15) Alive plan tracker (must be updated every chunk)
This is the minimal structure an agent should maintain to avoid losing context.

### 15.1 Status snapshot
- Current phase: Profile Strength v1
- Current chunk: Chunk 7 — Heuristic spec tables + constants (next)
- Branch: work
- Last updated: 2026-01-24

### 15.2 Completed chunks
- [x] Chunk 0 — Repo orientation + guardrails
- [x] Chunk 0.5 — Dev-only debug view / telemetry hooks
- [x] Chunk 1 — Strength scoring engine
- [x] Chunk 2 — Wire real data into scoring
- [x] Chunk 3 — Replace hardcoded strength card
- [x] Chunk 4 — Add menu icon badges
- [x] Chunk 5 — Press-and-hold gesture
- [x] Chunk 6 — XP hooks + bonuses

### 15.3 Next chunk plan (fill before coding)
- Goal: Convert heuristics into per-area spec tables and consolidate constants (Section 17).
- Files likely touched: docs/PROFILE_STRENGTH_GUIDED_HELP_DRAFT.md, constants seed list references.
- Risks: Low; documentation-only update.
- Acceptance checks: Tables cover signals, thresholds, reason codes, next-task templates, and XP triggers.
- Rollback plan: Revert doc edits.

### 15.4 After-chunk notes (fill after coding)
- What changed: Added XP hooks for completed profile strength improvements, plus coverage bonuses with state-transition guards.
- What was validated: npm run build.
- Follow-ups: Convert heuristics into per-area spec tables + consolidate constants.

---

## 16) Acceptance criteria for v1 (definition of done)
We are done with v1 when all of the following are true:

1. Profile Strength card shows real computed data on mobile.
2. Each profile menu icon shows a stable 0–10 badge.
3. Press-and-hold opens a small “Improve this area” suggestion.
4. Hold does not trigger native text selection or callouts.
5. Scores follow the missing data policy and stability rules.
6. XP triggers follow the integrity rules (state transitions only).
7. No existing core flows are broken.
8. The doc tracker above has been kept up to date.

---

## 17) What else is still needed (strongly recommended next step)
Yes — one more step will make this dramatically faster to implement:

### 17.1 Convert heuristics into per-area spec tables
For each area, define:
- signals,
- thresholds,
- score mapping rules,
- reason codes,
- next-task templates,
- XP events,
- “minimum viable improvement” definition.

This will reduce interpretation risk and make each chunk more deterministic.

### 17.2 Keep “one source of truth” for constants
Even at planning stage, list the constants we expect:
- hold duration,
- slop radius,
- recency windows,
- coverage thresholds,
- XP values.

That keeps future edits safe and consistent.
