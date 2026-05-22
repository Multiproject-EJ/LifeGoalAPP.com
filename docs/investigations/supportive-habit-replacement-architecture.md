# Supportive Habit Replacement / Alternative-Path Architecture (Investigation)

Date: 2026-05-22  
Status: Investigation-only (no code changes, no migrations, no UI changes)

## PASS/FAIL recommendation

**PASS — proceed with a deterministic MVP first, then optional AI personalization.**

Rationale:
- The codebase already has core deterministic building blocks: habit design signals, recommendation scaffolding, and a rich suggested-habit library with life-wheel area, intent tags, difficulty tiers, cue suggestions, environment hacks, and tiny/normal/stretch variants.
- Existing habit and habit-log data already supports shame-free detection of friction/mismatch patterns without requiring behavioral labels like “failure.”
- Existing Daily Life Upgrade pipeline is a natural integration point for a new “replacement recommendation” type.

## 1) Existing data available

## Habit fields and logs usable now

From `habits_v2` + `habit_logs_v2` (already typed and used in services):
- Lifecycle and active state: `status`, `archived`, `paused_at`, `paused_reason`, `resume_on`, `deactivated_at`, `deactivated_reason`.
- Goal/domain linkage: `goal_id`, `domain_key`.
- Intent and motivation proxy: `habit_intent`.
- Environment friction signals: `environment_context`, `environment_score`, `environment_risk_tags`, `environment_last_audited_at`.
- Daily performance signals: habit logs contain `done`, `completion_percentage`, and `progress_state` (supports done-ish/skipped/missed distinction where provided by logging flows).

This is sufficient for deterministic “supportive mismatch” detection and alternatives ranking without schema changes.

## Goal fields usable now

The goal ecosystem already tracks meaningful goal metadata in app services and repo patterns (goal category/priority/target fields are used throughout goals services and UI modules). Minimum deterministic linkage for this feature can rely on:
- `goal_id` on habit.
- `domain_key` as life-wheel proxy.
- goal title + metadata fields in current goal services for motivational framing.

Recommendation for MVP: treat goal linkage as **best-effort** and never block suggestion generation if goal metadata is missing.

## Suggested habit library (already strong fit)

`src/features/habits/suggestedHabitLibrary.ts` already provides exactly the fields needed for alternatives:
- `lifeWheelArea`
- `goalIntentTags[]`
- `difficultyTier` (`tiny`/`easy`/`medium`)
- `tinyVersion`, `normalVersion`, `stretchVersion`
- `cueSuggestions[]`
- `environmentHacks[]`
- `blockerTags[]`
- `defaultTiming`

This is enough to build a deterministic resolver without AI.

## Existing engines/services and integration seam

- `habitDesignEngine` wraps signal analysis + recommendation logic.
- `habitDesignSignals` already computes `riskScore`, `staleScore`, `environmentRiskScore`, and states such as `too_hard`, `fragile`, `stale`.
- `dailyLifeUpgradeCandidate` already ranks intervention candidates and outputs modal-ready recommendation payload.

**Plug-in point:** add a new recommendation subtype (design-level) that routes to an alternative-habit resolver when the signal profile indicates mismatch (too hard/friction/stale/restart loop).

## 2) Failure detection without shame (deterministic)

Use neutral “fit” and “friction” labels rather than failure labels.

Proposed reason tags (deterministic):
- `habit_too_hard`
- `friction_too_high`
- `environment_mismatch`
- `timing_mismatch`
- `habit_stale`
- `motivation_unclear`
- `restart_relapse_pattern`

### Deterministic signal rules

1. **Habit too hard**
- `completionRate < 0.35` over 14-day window AND `missesLast14 >= 6`, OR state already `too_hard`.

2. **Too much friction**
- high misses + skips despite logs existing (not just no data):
  - `(missesLast14 + 0.6*skipsLast14) >= 7`
  - and `logsLast14 >= 6`.

3. **Wrong environment**
- `environment_risk_tags.length >= 2` OR `environmentRiskScore >= 0.34` + repeated misses.

4. **Wrong timing**
- `timingAdherenceRate < 0.55` OR clustered misses on scheduled windows (if timing detail available).

5. **Stale habit**
- existing stale pattern from design signals (`staleScore >= 0.8` and low completion).

6. **No underlying motivation signal**
- missing `goal_id` AND empty/null `habit_intent` AND weak `domain_key`/area mapping.

7. **Repeated misses after restart**
- if `resume_on`/recent resume marker exists and misses spike within 7 days after resume:
  - `missesAfterResume7 >= 3`.

All tags should be auditable and explainable from deterministic inputs.

## 3) Underlying desire model

Core principle: **Preserve desire, swap method.**

Data model abstraction (no migration required; service-level structure):
- `desireAnchor`:
  - `lifeWheelArea` (from `domain_key` or mapped area)
  - `linkedGoalId` (if present)
  - `habitIntent` (from `habit_intent`)
  - `desiredOutcomeText` (goal title/intent phrasing fallback)
  - `motivationHint` (derived from intent tags or goal copy)
- `currentMethod`:
  - habit id/title
  - friction reason tags

Method-vs-desire distinction:
- “Go to gym” = method.
- “Improve fitness + energy” = desire.
- Resolver always locks to desire anchor first, then proposes method variants.

## 4) Alternative habit resolver (deterministic)

Input:
- habit row + recent logs/signals + optional goal metadata
- suggested habit library

Filter pipeline (in order):
1. same `lifeWheelArea`
2. tag overlap with `goalIntentTags` (from habit_intent/goal signals)
3. exclude current habit id/title (and near-title duplicates)
4. remove archived/deprecated library entries (if introduced later)

Ranking (stable deterministic):
- Score components (descending):
  1. `areaMatch` (required; else excluded)
  2. `intentOverlapCount`
  3. `difficultyPreference` (tiny first when risk high; easy next; medium last)
  4. `environmentComplement` (candidate blocker/cue differs from current friction tags)
  5. `timingCompatibility` (candidate `defaultTiming` aligns to observed adherence windows)
  6. lexical tiebreakers: `title ASC`, `suggestedHabitId ASC`

Difficulty policy:
- if mismatch/friction tags present => force first recommendation from `tiny` tier.
- second recommendation from `easy` tier.
- medium only as optional stretch suggestion.

Output:
- top 3 alternatives (tiny-first), each with:
  - supportive reason tag
  - tiny variant wording
  - one cue suggestion
  - one environment hack

## 5) Supportive copy principles

Tone contract:
- Never use “failed”, “you didn’t”, “not disciplined enough.”
- Use fit language: “may not fit your life right now.”
- Preserve identity/desire explicitly.
- Offer experiments, not corrections.
- Keep user agency explicit (“You choose what to try”).

Example copy snippets:
- “Your goal still matters. This version may be too heavy for this season.”
- “This quest may not fit your life right now — want a smaller path with the same outcome?”
- “You’re still building fitness. Let’s test a 2-minute version first.”
- CTA ideas: “Try smaller path”, “Experiment with this”, “Keep my current habit”.

## 6) AI + non-AI behavior

## Without AI (required baseline)
- Deterministic reason tags + ranking only.
- Canned supportive templates keyed by reason tag.
- Deterministic top-N alternatives from library.

## With AI (optional supercharger)
- Rewrite deterministic alternatives in personalized voice.
- Offer additional creative variants that remain within same desire anchor.
- Gently summarize observed pattern.

Hard rules even with AI:
- Never auto-change/delete current habit.
- Never mutate habit without explicit user action.
- Always show deterministic fallback options if AI unavailable.

## 7) MVP roadmap (safe slices)

A. **Investigation report** (this doc) ✅  
B. **Alternative habit resolver service** (deterministic, read-only selection)  
C. **habitDesignEngine extension** for `replacement_recommendation` type  
D. **Daily Life Upgrade integration path** to present “Try a smaller path” recommendation type  
E. **Optional AI supercharger** behind capability flag

Rollout guardrails:
- no auto mutation
- no schema migration in MVP
- telemetry on suggestion shown/accepted/ignored only

## 8) Data model needs

## Can this use existing fields now?
**Yes** for MVP.

Existing fields already cover:
- adherence + misses/skips (`habit_logs_v2`)
- pause/resume lifecycle
- environment friction tags
- intent/goal/domain anchors
- suggestion catalog metadata

## Future fields that would help (later)
- `habit_method_family` (e.g., “gym”, “walk”, “mobility”) to prevent close duplicates.
- `replacement_reason_history[]` per habit.
- `replacement_acceptance_events` table for learning ranking quality.
- optional explicit `desired_outcome` text on habit.

## Need SQL now or later?
- **Now:** no SQL required.
- **Later:** optional analytics/event table(s) only when measuring acceptance and long-term efficacy.

## Proposed service/file map (design only)

- `src/services/habitAlternativeResolver.ts`
  - deterministic filter/rank resolver over `suggestedHabitLibrary`
- `src/services/habitReplacementSignals.ts`
  - reason-tag derivation from existing signal inputs
- `src/services/habitDesignEngine.ts`
  - add recommendation branch for replacement pathway
- `src/services/dailyLifeUpgradeCandidate.ts`
  - include new candidate type mapping + priority
- `src/features/habits/suggestedHabitLibrary.ts`
  - consume as read-only source for alternatives

## Deterministic ranking rules (exact)

Given candidate `c` and context `x`, sort by:
1. `intentOverlapCount(c, x)` DESC
2. `difficultyRank(c, x)` ASC where tiny=0,easy=1,medium=2 (when mismatch detected), else easy/tiny parity allowed
3. `environmentComplementScore(c, x)` DESC
4. `timingCompatibilityScore(c, x)` DESC
5. `title` ASC
6. `suggestedHabitId` ASC

Exclude any candidate where:
- `c.title` equals normalized current habit title, OR
- `c.suggestedHabitId` maps to same canonical method family (future enhancement), OR
- `c.lifeWheelArea` != target area.

## Supportive copy examples (ready for template mapping)

- **too_hard**: “Your intention is strong — this version may be too heavy right now. Want a 2-minute path toward the same goal?”
- **environment_mismatch**: “The environment seems to be fighting this habit. Want an option that fits your current setting better?”
- **timing_mismatch**: “Your goal still fits. The timing may not. Want a version that works at a different time of day?”
- **habit_stale**: “This habit may have gone stale. Want a fresh, lighter way to keep the same progress?”
- **restart_relapse_pattern**: “You keep coming back to this goal — that matters. Let’s try a gentler restart path.”

## Exact files inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/services/habitDesignEngine.ts`
- `src/services/habitDesignSignals.ts`
- `src/services/habitAdjustmentRecommendations.ts`
- `src/services/dailyLifeUpgradeCandidate.ts`
- `src/features/habits/suggestedHabitLibrary.ts`
- `src/services/habitsV2.ts`
- `src/lib/database.types.ts`
- `src/features/habits/DailyHabitTracker.tsx`
- `docs/investigations/suggested-habit-intelligence-architecture.md`

## Validation commands run

- `pwd; rg --files | head; find .. -name AGENTS.md`
- `cat AGENTS.md`
- `sed -n '1,220p' docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `sed -n '1,220p' docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `sed -n '1,240p' docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `rg -n "habitDesignEngine|dailyLifeUpgradeCandidate|suggestedHabitLibrary|habit_intent|goal_id|domain_key|pause|resume|completion|skip|miss|risk|intent|lifeWheel|goalIntentTags" src docs --glob '!node_modules'`
- `rg -n "suggestedHabitLibrary|SuggestedHabit|goalIntentTags|habit_intent|dailyLifeUpgrade" src docs`
- `nl -ba ...` inspections for relevant files (see shell history)
