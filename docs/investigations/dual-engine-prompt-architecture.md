# Dual Engine Prompt Architecture Investigation (Island Run)

Date: 2026-05-22  
Status: Investigation only (no code/migration/gameplay-economy changes)

## Executive Recommendation

**PASS (recommended to proceed)** with a deterministic-first Dual Engine architecture.

Why PASS:
- The current app already has durable settings categories where a default-on "Daily Life Upgrade" preference can fit without schema risk explosion.
- Core life data domains (goals, habits, check-ins, journal, profile-strength signals, AI access controls) already exist and are fetchable via stable service boundaries.
- Modal/popup patterns already exist in both game-adjacent and outside-game contexts; a new outside-game modal can follow existing architecture.
- AI settings/access are additive and can remain optional while deterministic routing handles critical prompt gating.

## Scope & Constraints Applied

- Hard constraints respected: report/investigation only.
- No gameplay mutation path changes proposed in this document.
- No migrations proposed in this document.
- No economy tuning proposed in this document.

---

## 1) Existing settings/preferences system

### Where settings live now

The repository uses a split model:
1. **Settings surface registry/config** for what appears in account settings (visibility taxonomy and section metadata).
2. **Domain-specific preference services** backed by Supabase rows and demo/local fallbacks.

Key evidence:
- `settingsVisibilityRegistry` already defines account sections including AI, gamification, telemetry, and recap-style toggles. This is the best insertion point for a new "Daily Life Upgrade" setting group or toggle.
- Existing preference services show a clear pattern:
  - Supabase `upsert`/`select` in normal mode.
  - localStorage/demo data fallback in demo/local mode.

### Can a default-on “Daily Life Upgrade” modal setting fit?

**Yes.** It fits naturally as:
- a new account setting id (e.g., `account.dailyLifeUpgrade`) in settings visibility, and
- a preference value persisted in either:
  - an existing user preference table (if one is already broad enough), or
  - a dedicated lightweight table/service following current patterns.

Default-on behavior is already consistent with existing preferences such as gamification enablement defaults.

### Where user preferences are stored

Current patterns observed:
- Supabase tables for category-specific preferences (notification, reminder, telemetry, AI settings/access, gamification profile flags).
- user metadata for some access controls (AI coach data access).
- localStorage/demo storage fallback for offline/demo usage.

---

## 2) Existing modal/popup systems

### Today screen and daily offer patterns

The Today/Habit surfaces are modal-heavy and already include "daily" offer/reward loops, recap/reminder behavior, and integrated action prompts. This means a Daily Life Upgrade modal can piggyback established UX conventions:
- Daily/recurring reminder windows
- One-shot-per-cycle display keys
- Existing close/deferral behavior patterns

### Profile strength modal/prompt ecosystem

Profile strength is implemented as a derived-signal system (not just UI copy) using cross-domain data; this is suitable as a destination for prompt outcomes ("profile signals" destination).

### AI coach prompts

AI coach is already surfaced in quick action flows and has dedicated access controls. This is a strong indicator that AI can remain a **secondary enhancer** rather than a required runtime dependency.

### Check-in popup/modal patterns

Life Wheel check-ins already provide scored, category-based question flows and trend deltas. This is a direct destination candidate for outside-game deeper prompts.

---

## 3) Existing data sources (fit assessment)

### Habits

- Mature V2 service surface with active/inactive lifecycle, offline mutation queueing, and domain-key metadata.
- Good destination for prompt outputs such as "habit adjustment", pause/resume nudges, and target refinement.

### Goals

- Goals service supports rich metadata (status, timing, quality, priority, environment context).
- Good destination for "goal refinement" and weekly review prompts.

### Life wheel / check-ins

- Structured category keys + score model + trend deltas already implemented.
- Good destination for rating/compare prompt answers and recurring reviews.

### Profile strength

- Already aggregates goals/habits/check-ins/journal/vision into coverage/quality/recency signals.
- Good destination for prompt-derived "profile signals" that do **not** alter gameplay state.

### Journal / reflection

- Journaling service supports privacy flags, tags, and offline queue.
- Has explicit helper to filter private entries from AI context.
- Good destination for optional tiny text (inside game) and deeper reflection (outside game).

### AI coach access

- Explicit access model exists (`ai_coach_access`) with normalization and user metadata persistence.
- Supports optional AI supercharger stage without blocking deterministic MVP.

---

## 4) Prompt Engine architecture (deterministic, non-AI-first)

## Proposed architecture shape

Introduce a new deterministic service layer (no gameplay writes, no AI dependency):

- `dualPromptPolicyEngine.ts` (pure rules)
  - Determines prompt type, priority, cooldown, context, required/skippable, format, destination.
- `dualPromptEligibility.ts`
  - Reads user preferences, recent prompt history, quiet hours, session context (`inside_game` vs `outside_game`).
- `dualPromptQueueStore.ts`
  - Stores scheduled/served/completed/skipped prompt records.
- `dualPromptDeliveryService.ts`
  - UI-facing adapter that returns next prompt payload for a context.
- `dualPromptOutcomeRouter.ts`
  - Routes answers to destination handlers (habit/goal/check-in/reflection/profile-signal).

AI optional layer (Slice E):
- `dualPromptAiSupercharger.ts`
  - Rewrites copy, clusters patterns, and suggests candidate prompts only.

## Deterministic decision contract (core)

Input dimensions:
- context: `inside_game | outside_game`
- prompt history: `last_shown_at`, `last_answered_at`, skip streak
- lifecycle markers: first run/day index/check-in staleness/goal-habit drift
- preferences: `daily_life_upgrade_enabled`, reminder windows, AI access
- data freshness: habits/goals/checkins/journal/profile-strength snapshots

Output contract:
- `promptType`
- `priorityScore` (deterministic integer)
- `cooldownMs`
- `context`
- `required` (boolean; rarely true and never gameplay-blocking)
- `answerFormat`: `yes_no | choice | rating | compare | text_optional`
- `destination`: `habit_update | goal_update | life_wheel_checkin | reflection | profile_signal`

---

## 5) Question principles

## Inside Island Run (micro prompts only)

Allowed formats:
- yes/no
- 1–5 rating
- pick one
- choose A vs B
- optional tiny text

Rules:
- 1 question max per injection point.
- 5-10 second completion target.
- never block roll/claim/stop-critical flow.
- default to skippable unless safety/compliance reason exists.

## Outside game / Daily Life Upgrade modal

Slightly deeper but still lightweight:
- goal refinement
- habit adjustment
- blocker/motivation checkpoint
- routine setup tune-up
- weekly review mini-flow

Rules:
- max 2-4 steps.
- concrete outputs only (update one goal field, one habit setting, one reflection note, etc.).
- avoid long free-text requirements.

---

## 6) AI policy (explicit)

AI may:
- suggest clearer wording variants,
- summarize patterns,
- rank better prompt candidates,
- suggest habit/goal upgrades.

AI must not:
- block gameplay,
- be required for prompt generation,
- be required for rewards,
- write gameplay state directly.

Implementation note: AI should only operate on a prompt-candidate layer and output "suggestion objects"; deterministic policy remains source of truth.

---

## 7) MVP roadmap (recommended slices)

### Slice A — Deterministic prompt engine service
- Build policy engine, eligibility, queue, and outcome router.
- Wire read-only domain signals (habits/goals/check-ins/journal/profile-strength).
- No UI rollout yet beyond debug/dev hooks.

### Slice B — Default-on Daily Life Upgrade modal setting
- Add account-level setting with default-on semantics.
- Respect quiet hours + reminder preference windows.

### Slice C — Outside-game Daily Life Upgrade modal
- Add non-game modal container and minimal flow renderer.
- Persist outcomes to destination services only.

### Slice D — Island Run prompt integration improvements
- Add inside-game micro-prompt injection points (non-blocking).
- Strictly no gameplay-state write path changes from prompt subsystem.

### Slice E — Optional AI supercharger
- Add AI rewrite/ranking/summarization as best-effort enhancer.
- Hard fallback to deterministic prompts when AI unavailable/disabled.

---

## Prompt priority rules (deterministic proposal)

Priority score formula (example):

`priority = baseType + recencyBoost + stalenessBoost + driftBoost - fatiguePenalty - recentSkipPenalty`

Suggested type base order:
1. overdue check-in refresh
2. goal at-risk clarification
3. habit friction/adjustment
4. weekly review checkpoint
5. optional reflection boost

Global guards:
- cooldown hard minimum between prompts per context.
- daily max exposures per context.
- suppress inside-game prompts during high-intensity states (e.g., immediate reward claim chains).

---

## Data model proposal

## Prompt definition
- `id`
- `type`
- `context`
- `answerFormat`
- `destination`
- `required`
- `cooldownMs`
- `priorityBase`
- `copyKey`
- `options[]` (if choice/compare)

## Prompt event log
- `promptId`
- `userId`
- `shownAt`
- `answeredAt`
- `skippedAt`
- `context`
- `answerPayload` (normalized JSON)
- `destinationWriteResult`

## Preference flag
- `dailyLifeUpgradeEnabled: boolean` (default true)
- optional: `dailyLifeUpgradeWindowStart/End`, `maxPromptsPerDay`

---

## Proposed service/file map

Suggested new files (proposal only):
- `src/features/prompts/dual-engine/dualPromptPolicyEngine.ts`
- `src/features/prompts/dual-engine/dualPromptEligibility.ts`
- `src/features/prompts/dual-engine/dualPromptQueueStore.ts`
- `src/features/prompts/dual-engine/dualPromptDeliveryService.ts`
- `src/features/prompts/dual-engine/dualPromptOutcomeRouter.ts`
- `src/features/prompts/dual-engine/dualPromptTypes.ts`
- `src/features/prompts/dual-engine/dualPromptAiSupercharger.ts` (optional Slice E)
- `src/services/dailyLifeUpgradePrefs.ts`
- `src/features/settings/DailyLifeUpgradeSettingsSection.tsx`
- `src/features/habits/DailyLifeUpgradeModal.tsx` (outside-game surface)

Integration touchpoints (proposal only):
- Today/home shell entry point
- Island Run UI injection boundary for non-blocking micro prompts
- Existing preference/settings panel

---

## Agent principles (for future implementation)

1. Deterministic-first: prompt selection must work with AI fully disabled.
2. Non-blocking gameplay: no prompt can hard-stop Island Run core loop.
3. Canonical writes only: destinations mutate via existing domain services/actions only.
4. Context-aware UX: short in-game, slightly deeper out-of-game.
5. Reversible slices: ship in small guarded flags with measurable outcomes.
6. Privacy-aware AI: respect AI access settings and private-journal exclusions.
7. No gameplay economy coupling: prompt rewards/answers cannot mutate economy contracts directly.

---

## Exact files inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/config/settingsVisibility.ts`
- `src/services/aiCoachAccess.ts`
- `src/services/aiSettings.ts`
- `src/services/gamificationPrefs.ts`
- `src/services/reminderPrefs.ts`
- `src/features/habits/DailyHabitTracker.tsx`
- `src/components/QuickActionsFAB.tsx`
- `src/features/profile-strength/profileStrengthData.ts`
- `src/services/habitsV2.ts`
- `src/services/goals.ts`
- `src/features/checkins/LifeWheelCheckins.tsx`
- `src/services/journal.ts`

## Validation commands run

- `rg --files -g 'AGENTS.md'`
- `cat AGENTS.md && cat docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md && cat docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md && cat docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `rg -n "settings|preferences|modal|popup|AI coach|check-in|life wheel|journal|reflection|profile strength|daily" src docs --glob '!**/node_modules/**'`
- `rg -n "useSettings|settingsStore|user preferences|preference|Preferences|AppSettings|settings" src/features src/services src/contexts src/config`
- `rg -n "Daily Life|life upgrade|check-in|AI coach|Profile Strength|profile strength|modal|popup" src/features src/components docs/gameplay`
- `cat`/`sed -n` inspections for the files listed above.
