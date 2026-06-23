# Habit Understanding & Experiment System — Investigation

**Status:** Investigation only — no implementation.
**Date:** 2026-06-23
**Scope:** Optional "Understand & Improve" area behind the expanded habit on the Today screen: guided analyses (Hidden Layers), small experiments, experiment review, and (later) chain-reaction mapping.

---

## 1. Executive summary

HabitGame already contains a **substantial, working "Deep Fix" habit-analysis and experiment engine** that is the right foundation for this feature. It should be **reused and extended, not rebuilt**. Building a second analysis/experiment system would directly violate the "no competing system" constraint and duplicate schema, lifecycle logic, and UI.

What exists today:

- A normalized, RLS-scoped schema rooted at `public.habit_analysis_sessions` with eight child tables, including a **7-day experiment loop** (`habit_experiment_days`) and completion reflection (migrations `0148`–`0163`).
- A 707-line service (`src/services/habitImprovementAnalysis.ts`) implementing a one-step-at-a-time guided flow with offline-friendly mobile draft saving.
- A 1,248-line modal (`src/features/habits/HabitImprovementAnalysisModal.tsx`) — a 5-step guided wizard.
- A canonical AI stack: OpenAI-backed Supabase edge functions (`ai-coach-chat`, `goal-coach-chat`, `suggest-goal`), client entitlement/quota/routing services, and habit-context assembly that already reads `habits_v2` + `habit_logs_v2`.

What is **missing** relative to this product brief, and is the actual work:

1. **Entry point.** The engine is only reachable from the **Habit Review Queue** ("Deep Fix", for habits flagged as needing attention). The brief requires an optional **"Understand & Improve"** affordance inside the **expanded habit** for *any* habit, framed as curiosity, not remediation.
2. **Conceptual framing.** The current flow is organized around an under/over/swing **diagnosis** + readiness traffic-light (a clinical-adjacent frame the brief explicitly wants to avoid). The brief wants named, exploratory **Hidden Layers** analyses (cue / inner state / hidden need / routine / reward / friction) and experiment-driven language.
3. **AI as guided investigator.** Today's flow is **deterministic** (no model call inside the wizard). The brief wants AI to *propose possible patterns* with uncertainty, validated against a structured schema before rendering.
4. **Evidence typing.** No explicit distinction between user observation, user-confirmed insight, AI hypothesis, data-supported association, active experiment, completed result.
5. **Chain-reaction analysis** does not exist in any form.

**Recommended MVP: a hybrid of MVP A + MVP B** — guided observation → AI "possible pattern" (validated) → save labelled insight → one small experiment → review → adapt — delivered as a **new lightweight entry inside the expanded habit that reuses the existing `habit_analysis_sessions` engine**, with a thin "lens"/insight layer added on top and the diagnosis/readiness framing made optional. Chain-reaction (MVP C) and data-supported associations are **deferred** to later phases.

**Readiness verdict: PASS, with named open decisions** (Section 11). No blocking infrastructure gaps; the reuse path means schema additions are additive and small.

---

## 2. Current system map

### 2.1 Today screen & habit expansion

| Concern | Location |
| --- | --- |
| Primary Today habit surface | `src/features/habits/DailyHabitTracker.tsx` (~9.5k lines) |
| Compact/mobile Today surface | `src/features/habits/MobileHabitHome.tsx`, `src/features/habits/UnifiedTodayView.tsx` |
| Expanded-habit state | `expandedHabits: Record<string, boolean>` — `DailyHabitTracker.tsx:1350`; toggled at `:6112` (`toggleExpanded`, single-open behaviour) |
| Expanded detail panel render | `DailyHabitTracker.tsx:7954` (`habit-checklist__details-panel`), containing detail-blocks: **Coach** (`:7961`), **Info** (`:7993`), **Progress / stage actions** (`:8046+`) |
| Existing AI-coach affordance in expanded habit | `onOpenAiCoach(coachCard.aiPrompt)` button inside the Coach block (`:7980`) |
| Swipe complete/skip | `swipeOffsetByHabitId` / `swipeArmedByHabitId` (`:1408`+), helpers in `src/features/habits/todoSwipeHelpers.ts` |
| Deterministic struggling-habit coach | `src/features/habits/habitCoach.ts` (+ `habitHealth.ts`) |
| **Existing analysis entry (review queue only)** | "Deep Fix" button `DailyHabitTracker.tsx:7160` → `setAnalysisHabitId(habit.id)`; modal mounted at `:9460` |

### 2.2 Existing "Deep Fix" analysis & experiment engine (the reuse target)

| Layer | Location |
| --- | --- |
| Modal (5-step wizard) | `src/features/habits/HabitImprovementAnalysisModal.tsx` (`step` state `:87`, steps 0–4, 7-day experiment logging at step 4) |
| Service | `src/services/habitImprovementAnalysis.ts` (session CRUD, desires/costs/loop/diagnosis/protocol/readiness, `startHabitExperiment`, `logHabitExperimentDay`, mobile-draft save/restore, completion reflection/summary) |
| Base schema | `supabase/migrations/0148_habit_improvement_analysis.sql` |
| Incremental schema | `0149`–`0163` (experiment progress, difficulty, energy, urge/stress level, win notes, mobile draft, completion state/reflection/summary) |

### 2.3 Schema as it exists today

Root: `habit_analysis_sessions(id, user_id, habit_id → habits_v2, status[draft|active|completed|archived], goal_type[reduce|increase|replace|stabilize], target_cadence, last_logged_day_index, current_step, …, created_at, updated_at)`

Children (all FK `session_id`, all RLS-scoped through the session owner):

- `habit_desires` (desire_key, is_primary, custom_label) — *what the user is seeking*
- `habit_costs` (under/over pain tags, subscription-fee tags, notes)
- `habit_right_size_ranges` (min/max cadence, too-little/too-much feels-like)
- `habit_loop_maps` (**trigger / action / immediate_reward / delayed_cost**) — *already a cue→routine→reward→cost loop*
- `habit_diagnoses` (under | over | swing)
- `habit_protocols` (**if_trigger / then_action / friction / ease / replacement_reward / guardrail / duration_minutes / is_active**) — *already an experiment definition*
- `habit_readiness_scores` (5 Likert dims + traffic_light)
- `habit_experiment_days` (day_index 1–7, date, followed_protocol, under/over pain, net_effect[better|same|worse], note, + energy/urge/stress/confidence/win-note columns)

**Key reuse insight:** `habit_loop_maps` already captures cue/routine/reward/cost, and `habit_protocols` already captures an if-then experiment with friction/ease/replacement-reward and an `is_active` flag. The Hidden Layers analyses map almost 1:1 onto fields that already exist. The 7-day `habit_experiment_days` loop is the experiment lifecycle the brief describes.

### 2.4 Canonical habit data model

| Concern | Location |
| --- | --- |
| Habit table | `public.habits_v2` (`database.types.ts:724`). Columns include `domain_key` (**Life Wheel**), `goal_id` (**Compass/goal link**), `habit_environment` + `environment_context` jsonb (cue/where-&-how), `habit_intent`, `schedule`/`autoprog`/`done_ish_config` jsonb, lifecycle (`status`, `paused_at`, `resume_on`, `deactivated_at`, `archived`). |
| Completion log | `public.habit_logs_v2` (`id, habit_id, user_id, ts, date, value, done, note, mood, progress_state, completion_percentage, logged_stage`) — **already has per-completion `note` + `mood`.** |
| Streak view | `v_habit_streaks` |
| Service | `src/services/habitsV2.ts` (with offline repos `data/habitsV2OfflineRepo.ts`, `data/habitLogsOfflineRepo.ts`) |

**Habit-level metadata already uses jsonb** (`environment_context`, `autoprog`, `done_ish_config`), so JSON metadata is an established pattern. Per-completion notes/mood already exist on `habit_logs_v2`. A **new habit-level free-notes table is unnecessary**; observations should live in the analysis-session graph (or `habit_logs_v2.note` for in-the-moment logging).

### 2.5 AI infrastructure

| Concern | Location |
| --- | --- |
| Conversational coach edge fn | `supabase/functions/ai-coach-chat/index.ts` (OpenAI, `gpt-5-nano` default, CORS, turn/char caps, **habit + journal + reflection context assembly** with per-user access gating; reads `habits_v2`, `habit_logs_v2.note/mood`, `goals`, `goal_snapshots`) |
| Goal coach / structured suggest | `supabase/functions/goal-coach-chat/index.ts`, `supabase/functions/suggest-goal/index.ts` (structured-output precedent), `supabase/functions/compass-help/index.ts` |
| Structured client suggestion (with validated shape + deterministic fallback) | `src/services/habitAiSuggestions.ts` |
| Entitlement / quota / routing | `src/services/aiEntitlementService.ts` (`resolveAiEntitlement` → premium/free_quota/fallback), `aiQuotaService.ts` (`getQuotaSnapshot`/`consumeQuota`), `aiTaskRouting.ts` (`AiTaskKey` registry, cost levels, model resolution), `aiCoachAccess.ts`, `aiTelemetry.ts` |
| Reflection prompt generation | `src/services/reflectionPrompts.ts` (`generateFollowUpPrompts`) |
| Access toggles | `aiCoachAccess.ts` (`AiCoachDataAccess`: goals/habits/journaling/reflections/visionBoard/lifeStage) |

The AI stack already supports: structured responses (with validation + deterministic fallback), habit-specific context assembly, per-task model routing, entitlement/quota gating, and access toggles. **No new AI infrastructure is required** — only a new `AiTaskKey` (e.g. `habit_lens_hypothesis`) and a small structured-output endpoint or reuse of an existing edge function.

### 2.6 Existing reflection / journal / insight systems (avoid duplication)

| System | Location | Reuse decision |
| --- | --- | --- |
| Journal entries | `src/services/journal.ts` (`journal_entries`, offline queue, AI-context filter) | **Keep separate.** General journaling, not habit-scoped. Do not route habit observations here. |
| Goal reflections | `src/services/goalReflections.ts` (`goal_reflections`) | Separate (goal-scoped). Mirror its CRUD style. |
| Per-completion note/mood | `habit_logs_v2.note`, `.mood` | **Reuse** for in-the-moment "log what happened before" observations. |
| Habit AI suggestions | `src/services/habitAiSuggestions.ts` | **Reuse pattern** (structured + validated + fallback) for the new lens endpoint. |
| Habit coach (deterministic) | `src/features/habits/habitCoach.ts` | **Reuse** as the offline/AI-unavailable fallback for lens hypotheses. |
| Deep Fix analysis sessions | `habit_analysis_sessions` graph | **Reuse & extend** — the core of this feature. |

---

## 3. UX insertion point

**Where:** a new **secondary detail-block** inside the expanded-habit detail panel (`DailyHabitTracker.tsx:7954`, alongside the Coach / Info / Progress blocks). Label: **"Understand & Improve"**.

**Why here:**

- It is *behind* expansion, so the collapsed row and primary completion/swipe interactions are untouched.
- It sits with the existing Coach block, which already exposes an AI affordance — consistent placement, no Today redesign.
- It is reachable for *any* habit (not only review-flagged ones), satisfying "understand an existing habit after it has been used."
- It does not touch habit creation (`HabitWizard.tsx`) at all.

**Visual rule:** one quiet secondary affordance — a single row/pill that opens a menu — **not** seven buttons and **not** a dashboard. It must read as lower priority than Complete. If an experiment is active, show a single compact "active experiment" chip in this block (one active experiment prominent at a time).

**Reused shell:** the existing `HabitImprovementAnalysisModal` modal/backdrop pattern (`habit-analysis-modal*`) is the canonical container; the new flow renders inside the same modal shell with a new, lighter step set. The current "Deep Fix" entry from the review queue stays as-is (or later converges on the same engine).

---

## 4. Proposed user flow

```
Expanded habit (Today)
        │  primary actions unchanged: Complete · Skip/Pause · (Add note) · Start focus
        ▼
[ Understand & Improve ]   ← new secondary detail-block
        │
        ▼
Analysis menu (few choices, one screen)
   • Find my cue        • Discover the reward
   • Find the friction  • Change the routine
   • Explore ripple effects (Phase 3)
        │  pick one  → opens analysis modal (reused shell)
        ▼
1. NOTICE     "For the next 3 times, notice what happened just before."  → optional "Log what happened before"
2. UNDERSTAND one short question per screen → AI proposes 1–3 *possible patterns* + uncertainty
        │  "Does this feel accurate?"  [Yes, fits] [Partly] [No] [Keep observing]
        ▼  (Yes/Partly → save user-confirmed insight; No/observe → save AI hypothesis or nothing)
3. CHOOSE     [Keep observing] [Build a cue] [Strengthen reward] [Change routine] [Remove friction] [Leave as is]
        │  if an experiment is chosen →
        ▼
4. EXPERIMENT one small change, fixed short window (default 7 days, reuses habit_experiment_days)
        │  becomes the single active experiment for this habit
        ▼  (active experiment chip shows in expanded habit: what · start · review date · progress)
5. REVIEW     on/after review date: "Did this help / satisfy the same need?" [Yes] [Partly] [No] [Unsure]
        ▼
6. ADAPT      [Keep it] [Adjust it] [Stop it] [Try something else] [Return to observation]
```

### Component flow diagram

```
DailyHabitTracker
 └─ habit row (collapsed) ──tap──▶ expandedHabits[id]=true
     └─ habit-checklist__details-panel
         ├─ Coach block (existing)
         ├─ Info block (existing)
         ├─ Progress / stage block (existing)
         └─ ★ UnderstandImproveBlock (NEW)
              ├─ if active experiment → <ActiveExperimentChip/>
              └─ "Understand & Improve" ──▶ setLensSessionHabitId(id)
                                              │
                 HabitLensModal (NEW, reuses habit-analysis-modal shell)
                  ├─ AnalysisMenu
                  ├─ NoticeStep      → habit_logs_v2.note (observation) / observations row
                  ├─ UnderstandStep  → calls lens AI (validated) → possible patterns
                  ├─ ChooseStep
                  ├─ ExperimentStep  → startHabitExperiment() (existing service)
                  └─ ReviewStep      → completion reflection/summary (existing service)
                       │
                 services/habitImprovementAnalysis.ts  (EXTENDED, not replaced)
                 services/habitLensAi.ts (NEW thin client: structured + validated + fallback)
                       │
                 Supabase: habit_analysis_sessions graph (+ small additive tables)
                 Edge fn: reuse ai-coach-chat OR new habit-lens structured endpoint
```

---

## 5. Proposed data model

Legend: **[reuse]** existing · **[add]** proposed MVP addition · **[later]** deferred phase.

### Sessions & analyses
- **[reuse]** `habit_analysis_sessions` as the per-habit case-file root (one row per habit "investigation"; add `analysis_kind` to distinguish lens vs. deep-fix).
- **[add]** `analysis_kind text` on `habit_analysis_sessions` — `'deep_fix' | 'lens'` (default `'deep_fix'` for back-compat). Optional: `lens_type text` — `'cue' | 'inner_state' | 'hidden_need' | 'routine' | 'reward' | 'friction'`.
- **[reuse]** `habit_loop_maps` for cue / routine / immediate_reward / delayed_cost.
- **[reuse]** `habit_protocols` as the experiment definition (if-then, friction, ease, replacement-reward, `is_active`).
- **[reuse]** `habit_experiment_days` as the experiment lifecycle log (rename in copy to "review window", keep 1–7 default).

### Insights & evidence (the thin new layer)
- **[add]** `habit_insights` — the labelled "case file" entries:
  - `id, session_id → habit_analysis_sessions, habit_id → habits_v2, user_id`
  - `lens_type text` (cue/inner_state/hidden_need/routine/reward/friction/ripple)
  - `statement text` (the possible pattern, in product voice)
  - `evidence_type text` — **`'user_observation' | 'user_confirmed' | 'ai_hypothesis' | 'data_association' | 'active_experiment' | 'completed_experiment'`**
  - `confidence text` — `'low' | 'medium' | 'high'` (always shown as uncertainty language, never a %)
  - `source text` — `'guided' | 'ai' | 'user'`
  - `user_response text null` — `'fits' | 'partly' | 'no' | 'observing'`
  - `status text` — `'active' | 'dismissed' | 'archived'`
  - `created_at, updated_at`
- **[add]** `habit_observations` (optional; or reuse `habit_logs_v2.note`) — lightweight "log what happened before" entries: `session_id, habit_id, observed_at, cue_category text null, felt text null, note text`.

### Chain reaction (later)
- **[later]** `habit_links` — user-asserted/AI-suggested edges: `from_habit_id, to_habit_id (nullable), life_area domain_key null, direction 'positive'|'negative', strength, consistency, evidence_type, status`.

### Status / lifecycle values
- Session: `draft → active → completed → archived` (existing).
- Experiment (via `habit_protocols.is_active` + `habit_experiment_days`): `proposed → active → in_review → kept | adjusted | stopped | returned_to_observation`.
- Insight: `active → (dismissed | archived)`.

### Relationships
```
habits_v2 (1) ──< habit_analysis_sessions (1) ──< habit_insights
                                       │           └─ evidence_type, confidence
                                       ├──< habit_loop_maps   [reuse]
                                       ├──< habit_protocols   [reuse]  (the experiment)
                                       └──< habit_experiment_days [reuse] (review window)
habits_v2 ──< habit_links (later, chain reaction)
habit_logs_v2.note/mood  ──  in-the-moment observations [reuse]
```

All new tables follow the **existing RLS convention**: own-row policy on session-rooted tables via `exists(select 1 from habit_analysis_sessions s where s.id = session_id and s.user_id = auth.uid())`, and `user_id = auth.uid()` where a direct user column exists. `on delete cascade` from `habits_v2`/sessions preserves deletion behaviour.

**Do not** add a generic habit-notes/journal table — per-completion notes (`habit_logs_v2.note`) and the session graph cover MVP needs.

---

## 6. AI integration design

**Reuse** the existing stack. Add one `AiTaskKey` (`habit_lens_hypothesis`, level_1) in `aiTaskRouting.ts`, route through `resolveAiEntitlement` + quota, and either (a) reuse `ai-coach-chat` with a lens system prompt, or (b) add a small structured-output edge function mirroring `suggest-goal`. Prefer a structured endpoint so output is JSON-validated before save/render.

### Context sent to AI (minimal, habit-scoped)
- Habit: `title`, `type`, `domain_key` (life area), `habit_intent`, `habit_environment` (cue), recent 7–14 `habit_logs_v2` (`date, done, note, mood`), current streak/adherence.
- The chosen `lens_type` and the user's short answers so far (one-at-a-time).
- **Never** raw model prompts to the client; **never** other users' data.

### Expected structured output (validated before use)
```jsonc
{
  "analysis_type": "cue | inner_state | hidden_need | routine | reward | friction",
  "possible_patterns": [
    { "statement": "string (product voice, no diagnosis)", "confidence": "low|medium|high" }
  ],            // 1–3 items; multiple when uncertain
  "evidence_summary": "string — separates what the user SAID from inference",
  "uncertainty_level": "low | medium | high",
  "follow_up_question": "string | null (one short question)",
  "suggested_experiment": {            // optional, small only
    "what": "string", "duration_days": 1-7, "if_then": "string | null"
  } | null,
  "safety_note_if_needed": "string | null"
}
```
Mirror `habitAiSuggestions.ts`: validate shape, clamp lengths, reject on parse failure, and **fall back to the deterministic `habitCoach.ts` tips** when AI is unavailable/offline/over-quota.

### Uncertainty & safety rules (enforced in app, not trusted from model)
- Always render hypotheses as "**Possible pattern**", never as fact; require user confirmation to upgrade `evidence_type` to `user_confirmed`.
- Strip/booklet any diagnostic or causal phrasing; never claim causation from correlation.
- Offer 1–3 interpretations when `uncertainty_level` ≥ medium; allow **"Keep observing"** and **"Not enough information yet"** at every step.
- Route sensitive content through the same moderation/safety handling already applied in `ai-coach-chat`.

### Saving behaviour
- Only persist what the user keeps. AI output saved as `evidence_type='ai_hypothesis'`; on "Yes/Partly" → `user_confirmed`; "No" → dismissable; never auto-activate an experiment or auto-edit the habit.

---

## 7. Chain-reaction feasibility

**Now (user-reported only):** the user names habits/life areas they feel get easier/harder after this habit, marks each positive/negative, and optionally confirms AI-*suggested* links. Stored in `habit_links` with `evidence_type='user_confirmed'` or `'ai_hypothesis'`. Language: *"This habit may make these behaviours easier,"* *"On days you complete this, these appear more likely."*

**Later (data-supported associations):** `habit_logs_v2` does contain per-day `done` across habits, so same-day co-occurrence is *computable*. But for honest MVP it is **not reliable enough** (sparse history, confounds, no causation). Defer until a habit has sufficient history; surface only as `evidence_type='data_association'` with explicit "appears more likely" language, never "causes."

**Verdict:** ship user-reported + AI-suggested links in Phase 3; gate data-supported associations behind a minimum-data threshold in a later phase.

---

## 8. Phased implementation plan (small, reviewable PRs)

| Phase | PR | Scope |
| --- | --- | --- |
| **P0** | PR-1 | Additive migration: `analysis_kind`/`lens_type` on sessions, `habit_insights` table (+RLS, +indexes). No UI. |
| **P0** | PR-2 | Service layer: extend `habitImprovementAnalysis.ts` (or `habitLens.ts`) with insight CRUD + evidence-type helpers; unit tests for lifecycle transitions + one-active-experiment enforcement. |
| **P1 (MVP A)** | PR-3 | Expanded-habit **"Understand & Improve"** detail-block + analysis menu; `HabitLensModal` shell (reused) with Notice + Understand (guided, deterministic fallback) + save insight. No AI yet. |
| **P1 (MVP A)** | PR-4 | AI lens endpoint (`habit_lens_hypothesis` task + structured validation + fallback); wire Understand step to AI with uncertainty UI and evidence labels. |
| **P2 (MVP B)** | PR-5 | Choose → Experiment (reuse `startHabitExperiment`/`habit_experiment_days`) → active-experiment chip → Review → Adapt. One active experiment per habit enforced. |
| **P3 (MVP C)** | PR-6 | Chain-reaction: user-reported + AI-suggested `habit_links`, simple positive/negative ripple visual. |
| **Later** | PR-7 | Data-supported associations behind min-data threshold; telemetry. |

**Smallest version that feels complete:** P1+P2 (MVP A+B) — notice → understand → confirm/keep-observing → one small experiment → review → adapt. This is the recommended target.

---

## 9. Risks & edge cases

| Risk | Handling |
| --- | --- |
| Abandoned experiments | `habit_protocols.is_active` + review date; surface gentle "still testing?" not failure; allow stop/return-to-observation. |
| Deleted habit | `on delete cascade` from `habits_v2` already removes sessions/children; new tables FK the same way. Add test. |
| Paused/deactivated habit | Lens read-only or hidden for non-active lifecycle states; do not start experiments on paused habits. Add test. |
| Multiple devices | Reuse existing offline draft + mutation-queue pattern (`habitsV2OfflineRepo`, mobile-draft columns); last-write-wins on `updated_at`. |
| Offline / failed AI request | Deterministic `habitCoach.ts` fallback; never block the flow on the model; show "AI unavailable, keep observing." |
| Sparse data | "Not enough information yet" state; no data-association claims below threshold. |
| AI hallucination | App-side schema validation, length clamps, parse-fail rejection, evidence-type labelling, user confirmation required. |
| Conflicting user answers | Treat latest as current; keep prior observations; never assert a single truth. |
| Sensitive / mental-health language | Reuse `ai-coach-chat` moderation/safety; ban diagnostic/causal vocabulary; non-clinical tone enforced in copy. |
| User overload | One question per screen, few choices, one active experiment, secondary placement, no dashboard. |
| Competing systems | Reuse `habit_analysis_sessions`; route observations to `habit_logs_v2.note`, not a new journal. |

---

## 10. Validation plan

**Automated:** type-check + lint; unit tests for insight/experiment **lifecycle transitions**, **one-active-experiment enforcement**, **AI response validation** (valid/invalid/partial JSON, length clamps, fallback), **RLS/ownership** (cross-user denial), **deleted/paused habit** behaviour, evidence-type upgrade rules.

**Manual (iPhone-sized):** expanded habit with no analysis; with a saved insight; with an active experiment; review due; AI unavailable; offline/failed request; long habit names; large-text/accessibility sizing; dark/light.

**Database:** migration up/down clean; RLS policies present on every new table; cascade deletes verified.

**AI:** prompts never exposed client-side; structured output rejected when malformed; uncertainty rendered as language not %; no causal/diagnostic strings.

**Accessibility:** large tap targets, focus order, `aria-expanded`/labels on the new block and modal steps, back/exit controls.

**Regression (must be unchanged):** habit creation (`HabitWizard`), completion, swipe complete, Today todos, unrelated modals, review-queue "Deep Fix", Island Run, dice/rewards economy, quests, Compass curriculum, goals, telemetry, feature availability.

---

## 11. Open decisions

1. **Converge entry points or keep two?**
   - *Recommended default:* keep the review-queue "Deep Fix" as-is for now; add the new lighter "Understand & Improve" lens flow alongside it, sharing the schema. *Alternative:* unify both on the new lens shell immediately. *Trade-off:* convergence is cleaner long-term but enlarges the first PR and risks regressing a working flow.
2. **New `habit_insights` table vs. jsonb on sessions?**
   - *Recommended default:* a small dedicated `habit_insights` table (queryable, RLS-clean, evidence typing). *Alternative:* a jsonb column on `habit_analysis_sessions` (precedent exists with `environment_context`). *Trade-off:* table = better querying/labelling; jsonb = fewer migrations.
3. **AI delivery: reuse `ai-coach-chat` vs. new structured endpoint?**
   - *Recommended default:* new small structured endpoint (mirrors `suggest-goal`) for clean JSON validation. *Alternative:* reuse `ai-coach-chat` with a lens prompt. *Trade-off:* new endpoint = stricter contract; reuse = zero new functions.
4. **Default experiment window.**
   - *Recommended default:* reuse the existing 7-day `habit_experiment_days` loop. *Alternative:* allow 3-day "micro" windows. *Trade-off:* 7 days is built; 3 days lowers commitment but adds config.
5. **Observations storage: `habit_logs_v2.note` vs. new `habit_observations`.**
   - *Recommended default:* start with `habit_logs_v2.note` (no schema), add `habit_observations` only if structured cue-category capture is needed. *Trade-off:* reuse = simpler; new table = richer "log what happened before."

---

## 12. Implementation readiness verdict

**PASS — ready for implementation**, with the Section 11 decisions resolved at kickoff (each has a recommended default, so none are hard blockers).

No missing infrastructure: schema root, experiment loop, RLS convention, AI entitlement/quota/routing, habit-context assembly, deterministic fallback, offline draft pattern, and a reusable modal shell all already exist. The work is additive (one small migration, a thin insight/evidence layer, a new expanded-habit entry point, one AI task key) and is explicitly scoped to **reuse, not rebuild**, satisfying the no-competing-system constraint.

---

## Wireframes (low-fidelity)

```
Expanded habit (Today)                Analysis menu
┌───────────────────────────┐         ┌───────────────────────────┐
│ ☑ Morning walk        ▴   │         │ Understand & Improve      │
│ ── Coach ───────────────  │         │                           │
│ ── Info ────────────────  │         │ ◇ Find my cue             │
│ ── Progress ────────────  │         │ ◇ Find the friction       │
│ ── Understand & Improve ──│  tap →  │ ◇ Discover the reward     │
│   ▸ Understand & Improve  │         │ ◇ Change the routine      │
│   (or active-exp chip)    │         │ ◇ Explore ripple effects  │
└───────────────────────────┘         └───────────────────────────┘

Understand step (one Q)               Insight result
┌───────────────────────────┐         ┌───────────────────────────┐
│ ← Find my cue        ✕    │         │ Possible pattern          │
│                           │         │ "More likely when you end │
│ What usually happens just │         │  work feeling overloaded."│
│ before?                   │         │ ◌ AI hypothesis · low conf│
│ [ Time ] [ Place ]        │         │ Does this feel accurate?  │
│ [ Mood ] [ After… ]       │         │ [Yes][Partly][No]         │
│ [ Keep observing ]        │         │ [Keep observing]          │
│              ‹ Back  Next›│         │ [Try an experiment]       │
└───────────────────────────┘         └───────────────────────────┘

Active experiment                     Experiment review
┌───────────────────────────┐         ┌───────────────────────────┐
│ Active experiment         │         │ Did this help?            │
│ 5-min walk before scroll  │         │ [Yes] [Partly] [No] [?]   │
│ Started Jun 23 · review   │         │ Then:                     │
│ Jun 30 · ▓▓▓░░ 3/7        │         │ [Keep it] [Adjust it]     │
│ [ Review ]                │         │ [Stop it] [Try something] │
└───────────────────────────┘         │ [Return to observation]   │
                                       └───────────────────────────┘
```
