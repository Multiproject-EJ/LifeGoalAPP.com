# Suggested Habit Intelligence Architecture Investigation

Date: 2026-05-22  
Scope: Investigation-only (no code/runtime/economy/schema changes)

## PASS/FAIL Recommendation

**PASS (with guardrails).**  
The current codebase already contains enough deterministic scaffolding (starter catalog, life-wheel mapping, habits_v2 metadata fields, goal/habit linking primitives, check-in/category signals, environment scaffolds, and optional AI helper services) to ship a safe non-AI MVP in incremental slices.

---

## 1) Existing Habit Model (habits_v2 + services + offline + UI)

### Canonical habit row fields found
From `habits_v2` row type:
- Identity/core: `id`, `user_id`, `title`, `emoji`, `type`, `created_at`.
- Cadence/frequency: `schedule`, `start_date`, `allow_skip`.
- Difficulty/target: `target_num`, `target_unit`, `done_ish_config`.
- Lifecycle: `status`, `archived`, `paused_at`, `paused_reason`, `resume_on`, `deactivated_at`, `deactivated_reason`.
- Goal/domain metadata: `domain_key`, `goal_id`, `autoprog`.
- Environment/context: `habit_environment`, `environment_context`, `environment_score`, `environment_risk_tags`, `environment_last_audited_at`.
- Intent/duration metadata: `habit_intent`, `duration_mode`, `duration_value`, `duration_unit`, `duration_start_at`, `duration_end_at`, `on_duration_end`.

From `habit_logs_v2` row type:
- Log/streak inputs: `habit_id`, `date`, `ts`, `done`, `value`, `note`, `mood`, `progress_state`, `completion_percentage`, `logged_stage`.

### Service behavior relevant to habit design intelligence
- `HabitV2Row`/`HabitLogV2Row` are exported and used as canonical app types.
- Habit create/update/offline queue already preserves lifecycle, goal/domain, and environment fields.
- Existing service already evaluates and stores environment score/risk tags context, making this a strong base for habit cue and blocker personalization later.

### Offline model
- `habits_v2_local` stores full `HabitV2Row` snapshot with sync state.
- Mutation queue supports operations: `create`, `update`, `archive`, `pause`, `resume`, `deactivate`.

### UI usage pattern signals
- Habit UI already renders status/lifecycle operations and environment review prompts.
- Starter picker already creates deterministic habits from a local catalog and mapped life-wheel domain.

---

## 2) Existing Goal Model (goals + services + offline + UI)

### Goal fields useful for habit linkage
From goals table usage in services/UI:
- Core: `id`, `user_id`, `title`, `description`.
- Category: `life_wheel_category` (in goal creation flow model and UI).
- Status/priority: `status_tag`, `priority_level`.
- Timing/deadline: `target_date`, `timing_notes`, `weekly_workload_target`.
- Motivation/why channel: `progress_notes` (used for friction tags/health inference).
- Quality/score: `plan_quality_score`.
- Environment/context: `environment_context`, `environment_score`, `environment_last_audited_at`.

### Linkage signals
- Habit rows include `goal_id` already (direct habit→goal link).
- Goals UI loads all habits for connection context.
- Vision images include `linked_goal_ids` and `linked_habit_ids` (adjacent graph signal).

### Offline goal model
- Offline goal repo persists: `title`, `description`, `status`, `target_date`, `goal_strategy_type` (+ dirty/deleted sync flags).

---

## 3) Existing profile/life-wheel/check-in signals available

### Life wheel and check-ins
- Canonical 8 category keys exist and are reused by habits starter catalog logic.
- Check-ins store score distributions and calculate deltas/trends by category.
- Average/total and per-category trend movement are already computed client-side.

### Habit coverage gaps / missing habits
- Existing `getLifeBuildSuggestion` detects active habits by `domain_key` and suggests missing life-wheel domain coverage.

### Stale goals / fragile goals
- Goal health evaluation combines step activity + friction text tags + plan quality + target date risk.
- Environment review prompt flags missing or stale environment setup.

### Profile strength gaps / workspace signals
- Workspace profile service exists (signal source) and check-in/category infrastructure is present.
- Journal service stores structured entries and links to `linked_habit_ids`; safe summarized usage is possible.

---

## 4) Suggested Habit Library Architecture (recommended)

### Phase 1 deterministic library (seeded in code)
- Create a dedicated deterministic library module (read-only catalog in code).
- Seed with popular/proven habits mapped to life-wheel keys and intent tags.
- Keep starter experience deterministic and versioned in repo.

### Phase 2 curated Supabase library
- Add optional server-side curated records (reviewed by product/content ops).
- Deterministic resolver order: `curated_remote_if_available -> local_seed_fallback`.

### Optional AI draft candidates (never authoritative)
- AI can generate candidate habits/variants into a draft review queue only.
- Human-reviewed promotion required before entering deterministic library.

### Library schema (conceptual)
- `suggestedHabitId`, `title`, `lifeWheelArea`, `goalIntentTags[]`, `difficultyTier`,
- `tinyVersion`, `normalVersion`, `stretchVersion`,
- `cueSuggestions[]`, `environmentHacks[]`, `blockerTags[]`, `variantByBlocker`.

---

## 5) Habit Design Engine Architecture (recommended)

### Responsibilities
1. Create starter habit from selected suggestion.
2. Schedule low-friction follow-up prompts after first logs/misses.
3. Link to chosen goal (`goal_id`) and persist motive summary.
4. Adjust difficulty tier and chosen variant (tiny/normal/stretch).
5. Capture cue/environment setup and restart plan.
6. Downgrade suggestion after misses, upgrade suggestion after consistency.

### Proposed file/service map
- `src/features/habits/suggestedHabitLibrary.ts` (deterministic read catalog + filters)
- `src/features/habits/suggestedHabitResolver.ts` (life-wheel + goal-intent matching)
- `src/services/habitDesignEngine.ts` (stateful adjustment rules, no gameplay writes)
- `src/services/habitDesignPrompts.ts` (question cadence + trigger gating)
- `src/features/habits/HabitDesignCheckinCard.tsx` (UI surface for micro-prompts)
- `src/services/habitDesignTelemetry.ts` (non-blocking analytics)

All should remain independent from Island Run gameplay state mutation paths.

---

## 6) Prompt/Question strategy

### Inside Island Run context (lightweight, non-blocking prompts)
- Pick suggested habit.
- Too easy / good / too hard.
- Did this fit your day?
- Choose cue.
- Choose tiny version.

### Outside Daily Life Upgrade context (deeper reflection prompts)
- Link to goal.
- Refine why/motivation.
- Choose environment design.
- Weekly habit review.
- Restart/repair plan.

### Cadence recommendation
- Keep in-flow prompts max 1 tap + optional detail.
- Defer heavy prompts to weekly review surface.
- Use deterministic trigger windows (e.g., after 3 misses or 7-day consistency).

---

## 7) Data model proposal (minimal habit intelligence fields)

### Proposed fields
- `suggestedHabitId`
- `source` (seed|curated|ai_draft_promoted)
- `lifeWheelArea`
- `linkedGoalId`
- `difficultyTier`
- `tinyVersion`
- `normalVersion`
- `stretchVersion`
- `cue`
- `environmentHack`
- `blocker`
- `restartPlan`
- `stickinessScore`
- `lastAdjustedAt`

### Fit vs future schema

**Can fit existing habits_v2 now (no schema):**
- `linkedGoalId` -> existing `goal_id`
- `lifeWheelArea` -> existing `domain_key`
- `cue/environmentHack/blocker` -> existing `environment_context` + `habit_environment` + `environment_risk_tags`
- motivation/intent signal -> existing `habit_intent`
- `lastAdjustedAt` (temporary) -> can be stored in `autoprog`/metadata JSON for MVP

**Needs future structured schema/table for clean scale:**
- `suggestedHabitId`, `source`, `difficultyTier`, `tinyVersion/normalVersion/stretchVersion`, `restartPlan`, `stickinessScore`, durable adjustment timeline.
- Recommendation: future `habit_design_profiles` table keyed by `habit_id`, with immutable adjustment event log table.

---

## 8) AI policy recommendation

### AI can
- Suggest new habit library candidates.
- Rewrite titles for clarity.
- Recommend personalized variants.
- Summarize adherence patterns.

### AI must not
- Be required for baseline feature flow.
- Auto-create unreviewed habits.
- Block gameplay or core UX path.
- Write Island Run gameplay state.

---

## 9) MVP roadmap (safe slices)

A. Investigate/report only ✅ (this document)  
B. Deterministic suggested habit library service  
C. Wire Habit Landmark (or equivalent habit entry) to choose from suggested library  
D. Add low-friction habit adjustment prompts  
E. Add explicit goal linking UX and micro-motivation prompt  
F. Add optional AI supercharger (drafts/summaries only)

### Recommended MVP Slice B prompt (exact)
"Add a deterministic Suggested Habit Library service with life-wheel mapping and tiny/normal/stretch variants, sourced from local code constants only. Do not add AI calls, DB migrations, gameplay economy changes, or Island Run runtime writes. Expose pure read APIs and unit tests."

---

## Risks / constraints

1. **Overloading habits_v2 metadata JSON** can produce brittle coupling if not formalized later.
2. **Prompt fatigue** if adjustment prompts trigger too often; enforce cooldowns.
3. **Goal-link ambiguity** when users have many active goals in same category; need deterministic disambiguation rules.
4. **Cross-surface drift** between Island Run mini-prompts and full habits module prompts; should share one prompt policy service.
5. **AI trust risk** if draft suggestions appear too “official” before review.

---

## Exact files inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/lib/database.types.ts`
- `src/services/habitsV2.ts`
- `src/data/habitsV2OfflineRepo.ts`
- `src/services/goals.ts`
- `src/data/goalsOfflineRepo.ts`
- `src/data/goalsRepo.ts`
- `src/features/goals/GoalWorkspace.tsx`
- `src/services/goalExecution.ts`
- `src/services/checkins.ts`
- `src/features/checkins/LifeWheelCheckins.tsx`
- `src/services/journal.ts`
- `src/data/journalOfflineRepo.ts`
- `src/services/workspaceProfile.ts`
- `src/features/habits/starterHabitCatalog.ts`
- `src/features/habits/StarterHabitPicker.tsx`
- `src/features/habits/useLifeBuildSuggestion.ts`
- `src/features/habits/HabitsModule.tsx`
- `src/features/habits/suggestionsEngine.ts`
- `src/services/habitAdjustments.ts`

---

## Validation commands run

- `rg --files | rg 'AGENTS.md|habits_v2|habit|goals|life_wheel|check-in|journal|reflection|offline|types|service|ui|ISLAND_RUN_ARCHITECTURE_CONTRACT|CANONICAL_GAMEPLAY_CONTRACT|ISLAND_RUN_GUARDRAILS'`
- `cat AGENTS.md`
- `sed -n '1,220p' docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `sed -n '1,220p' docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `sed -n '1,260p' docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `rg -n "export type Habit|interface Habit|HabitV2|habit" ...`
- `sed -n` inspections across the files listed above.

