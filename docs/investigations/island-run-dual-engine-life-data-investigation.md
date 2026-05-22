# Island Run Dual Engine + Life Data Investigation

Date: 2026-05-22  
Scope: Investigation only (no gameplay/economy/runtime mutations, no migration proposal execution)

## Executive Summary

**Recommendation: PASS (with guardrails)** for MVP Slice 1.

Reason: The current architecture already has:
- A canonical Island Run gameplay read/write path (`useIslandRunState` + `islandRunStateActions`/action services).
- Existing stop/landmark modal surfaces where tiny life prompts can be inserted without touching dice/movement/reward logic.
- Existing habit/goal/profile-strength data services and offline queue infrastructure that can support non-blocking life-data capture.

The safest path is to add a **small Island Run life-intake service** (separate from gameplay state), wire it into the **Habit stop UI flow only**, and keep rewards deterministic regardless of AI availability.

---

## 1) Existing architecture

## 1.1 Island Run gameplay state/actions

Authoritative gameplay model and persistence:
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`

Findings:
- Canonical store model exists and is documented as single-authority.
- `islandRunRuntimeState.ts` remains compatibility bridge and should not be used for new gameplay writes from UI.

## 1.2 Landmarks/stops/build modals

Primary UI host:
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

Related routing/state helpers:
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTapRouting.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`
- `src/features/gamification/level-worlds/components/board/BoardOrbitStops.tsx`

Findings:
- Habit stop currently uses a placeholder modal path.
- Wisdom stop already has a dedicated encounter component and callback completion path.
- Ticket-locked and sequence-locked landmark modal prompts already exist and are non-gameplay-core surfaces.

## 1.3 Habits storage/create/update

Core service/offline repos:
- `src/services/habitsV2.ts`
- `src/data/habitsV2OfflineRepo.ts`
- `src/data/habitLogsOfflineRepo.ts`

Findings:
- Habits use `habits_v2` and `habit_logs_v2` service layer with local queueing/fallback.
- Create/update/archive/pause/resume flows already consolidated in habits services.

## 1.4 Goals/life wheel/profile strength data

Goals:
- `src/services/goals.ts`
- `src/data/goalsOfflineRepo.ts`

Life wheel/check-ins:
- `src/features/checkins/LifeWheelCheckins.tsx`
- `src/services/checkins.ts` (referenced indirectly by profile/coach)

Profile strength aggregation:
- `src/features/profile-strength/profileStrengthData.ts`
- `src/features/profile-strength/scoreProfileStrength.ts`

Findings:
- Goals include `life_wheel_category` and rich metadata fields.
- Profile-strength already reads goals/habits/journal/check-ins/vision data as a consolidated signal layer.

## 1.5 AI Coach/profile knowledge access

Primary coach surface:
- `src/features/ai-coach/AiCoach.tsx`

Coach instruction/access services:
- `src/services/aiCoachAccess.ts`
- `src/services/aiCoachInstructions.ts`

Findings:
- AI coach already consumes habits/goals/journal/check-ins snapshots.
- Existing pattern supports contextual AI suggestions without being required for baseline functionality.

## 1.6 Offline queues/persistence

Island Run runtime:
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts`

Habits/goals queues:
- `src/data/habitsV2OfflineRepo.ts`
- `src/data/habitLogsOfflineRepo.ts`
- `src/data/goalsOfflineRepo.ts`

Cross-cutting telemetry:
- `src/services/offlineSyncTelemetry.ts`

Findings:
- Both gameplay and life-data domains already implement offline-friendly queue/persist mechanisms.
- This lowers risk for non-blocking life prompts.

## 1.7 Feature availability/gating

- `src/config/featureAvailability.ts`
- `src/services/featureAccess.ts`
- `src/config/islandRunFeatureFlags.ts`

Findings:
- Feature gating infrastructure exists by surface and actor access.
- New dual-engine life prompts can be feature-flagged without touching economy logic.

---

## 2) Current integration points (safe candidates)

Most-safe candidate points for tiny life prompts that do not alter movement/reward determinism:

1. **After landing on landmark**  
   Trigger in stop-open flow (post open-request, pre-completion) for optional question card.

2. **When building/upgrading landmark**  
   Attach optional prompt in build modal confirmation moment (non-blocking skip).

3. **After reward bar claim**  
   Optional “micro reflection” card after reward presentation (never gates claim).

4. **After island completion**  
   End-of-island reflection prompt while showing progression summary.

5. **Daily login / first play**  
   Optional one-question kickoff prompt.

6. **Wisdom/reflection landmark**  
   Strong thematic fit; reuse existing reflection encounter pattern.

7. **Habit landmark**  
   Best MVP insertion point because current stop is placeholder-safe and naturally maps to habit capture.

Priority safety ranking (best first):
1) Habit landmark  
2) Wisdom landmark  
3) Island completion summary  
4) Daily first-play card  
5) Reward bar post-claim  
6) Build/upgrade touchpoints

---

## 3) Data collection model (minimal)

Recommended minimal life-intake record schema (Island Run scoped):

- `id`
- `userId`
- `createdAt`, `updatedAt`
- `source` = `'island_run'`
- `promptContext` = `'habit_landmark' | 'wisdom_landmark' | 'post_island_clear' | ...`
- `lifeWheelArea` (enum/string)
- `goalText` (nullable)
- `selectedGoalPreset` (nullable)
- `habitText` (nullable)
- `selectedHabitPreset` (nullable)
- `successCondition` (nullable)
- `timing` (nullable)
- `blocker` (nullable)
- `motivation` (nullable)
- `reflectionNote` (nullable)
- `aiGenerated` (boolean)
- `state` = `'accepted' | 'completed' | 'skipped'`
- `linkedHabitId` (nullable)
- `linkedGoalId` (nullable)

### Can existing tables/services support this?

- **Habits/goals tables can store final outputs** (created habits/goals), but not ideal for storing every micro-prompt attempt/skip.
- Best architecture: **new service/table** for life-intake prompts/events.
- If avoiding new DB table in MVP, interim local-only + telemetry event logging is possible, but less queryable for long-term product learning.

Given constraints for this task (no migrations now), recommendation is architectural only:
- Plan for new table/service in later implementation slice.
- MVP Slice 1 can still function by creating/updating habits through existing `habitsV2` services and storing minimal prompt state locally in UI/session state (non-authoritative).

---

## 4) AI + non-AI architecture (must not block gameplay)

Design principle: **AI enriches, never gates**.

## Deterministic baseline (required)

- Prompt templates/presets shipped in code.
- Default options for life-wheel area, goals, habits, timing, blockers, motivations.
- User can always select preset + continue.
- Rewards and stop completion are resolved independent of AI call outcomes.

## AI optional enhancement

- If AI available, request suggestion variants for goal/habit wording.
- AI results rendered as optional alternatives (“Try this wording”).
- If AI fails/offline/timeout: fall back immediately to deterministic templates.

## Failure handling requirements

- No spinner that blocks stop completion.
- No reward dependency on AI response.
- Graceful downgrade path in <300ms UI transition (show presets first, hydrate AI suggestions asynchronously).

---

## 5) MVP playable slice recommendation

## MVP Slice 1 (safest)

**Behavior**: Habit landmark asks one tiny question → user selects preset (or skip) → create/improve one habit via existing service → grant existing small feedback/reward path.

### Exact files to change (future implementation planning)

Primary UI insertion:
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

New isolated helper UI/service files (recommended additions):
- `src/features/gamification/level-worlds/components/IslandRunLifePromptCard.tsx` (new)
- `src/features/gamification/level-worlds/services/islandRunLifePromptTemplates.ts` (new)
- `src/features/gamification/level-worlds/services/islandRunLifeIntakeService.ts` (new)

Existing life services integration (read/use only):
- `src/services/habitsV2.ts`
- optionally `src/services/goals.ts` (if goal preset chosen)

### Exact files not to touch (MVP safety)

Do not modify gameplay economy/movement core in Slice 1:
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`

Do not add new gameplay writes through compatibility bridge:
- `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`

### Safest UI location

- Habit stop modal block in `IslandRunBoardPrototype.tsx` where placeholder currently exists.
- This is already an explicitly placeholder-safe content surface.

### Safest service/action location

- New `islandRunLifeIntakeService` for life prompt data and habit creation orchestration.
- Use existing `habitsV2` service APIs for create/update.
- Keep gameplay completion call (`handleCompleteActiveStop`) independent and deterministic.

### Validation commands (for implementation phase)

- `npm run test -- src/features/gamification/level-worlds/services/__tests__/islandRunStateActions.test.ts`
- `npm run test -- src/features/gamification/level-worlds/services/__tests__/islandRunStopCompletion.test.ts`
- `npm run test -- src/features/gamification/level-worlds/services/__tests__/islandRunStopTapRouting.test.ts`
- `npm run test -- src/features/habits/__tests__/dailyOfferClaim.test.ts`
- `npm run lint`
- `npm run typecheck`

---

## 6) Question priority and UX policy

Recommended order:
1. Life Wheel area
2. One goal
3. One tiny habit
4. Success condition
5. Timing
6. Blocker
7. Motivation
8. Wisdom/reflection

Required/optional/skippable policy:

- **Required in Slice 1**: `lifeWheelArea`, and one of (`habitText` or `selectedHabitPreset`).
- **Optional**: `goalText/selectedGoalPreset`, `successCondition`, `timing`.
- **Skippable anytime**: `blocker`, `motivation`, `reflectionNote`.
- **Delayed (Slice 2/3)**: deeper reflection/wisdom capture unless user opts in.

Rationale:
- Keeps first prompt under ~10–20 seconds.
- Captures minimum actionable payload to create/improve habit.
- Prevents friction in game loop and preserves “AI never blocks.”

---

## 7) Risk analysis

## 7.1 Direct gameplay state mutation from UI

Risk level: **High** in current board file due to legacy mixed patterns.
Mitigation:
- Keep life prompt state UI-local only.
- Use canonical gameplay action services for gameplay outcomes.
- Do not introduce new `persistIslandRunRuntimeStatePatch` gameplay writes from UI.

## 7.2 Duplicate habit creation paths

Risk level: **Medium**.
Mitigation:
- Funnel all habit create/update through `habitsV2` service.
- Create a single Island Run life-intake orchestration function.

## 7.3 Profile data fragmentation

Risk level: **Medium**.
Mitigation:
- Define one `source='island_run'` life-intake schema.
- Link resulting habits/goals by IDs.

## 7.4 Reward exploits

Risk level: **Medium**.
Mitigation:
- Cap prompt reward to one grant per eligible stop/island/day key.
- Make reward deterministic and independent from number/quality of text entries.

## 7.5 Offline sync issues

Risk level: **Medium-Low** (existing queues help).
Mitigation:
- Reuse existing habits/goals queue services.
- Queue life-intake records similarly if/when persisted server-side.

## 7.6 AI dependency risk

Risk level: **High if poorly designed**, **Low with fallback-first design**.
Mitigation:
- Render deterministic presets immediately.
- AI suggestions async-only enhancement.

## 7.7 Privacy / AI Coach access concerns

Risk level: **Medium**.
Mitigation:
- Tag Island Run life-intake entries clearly by source/context.
- Respect existing AI access gating.
- Avoid exposing sensitive free text to AI without explicit user path.

---

## PASS/FAIL recommendation

**PASS for starting MVP Slice 1** under these conditions:
1. No gameplay/economy logic changes.
2. No AI dependency for progress/reward.
3. Habit stop only for first slice.
4. Deterministic templates first, AI optional.
5. Use existing habits services and canonical gameplay action boundaries.

---

## Proposed roadmap

## Slice 1 (MVP)
- Habit landmark one-question flow.
- Preset-first selections.
- Optional skip.
- Create/improve one habit via `habitsV2`.
- Stop completes + existing small feedback reward.

## Slice 2
- Wisdom landmark optional reflection capture.
- Add blocker/motivation prompts.
- Add lightweight source-tagged intake persistence layer.

## Slice 3
- AI suggestion overlay for better habit/goal wording.
- Personalized prompt ordering based on prior profile signals.
- Coach follow-up cards (still non-blocking and deterministic-first).

---

## Architecture diagram (text)

```text
[Island Run Gameplay Engine]
  - canonical state/actions (dice/progression/reward)
  - unaffected by AI availability

        | optional UI touchpoint (Habit landmark modal)
        v
[Island Run Life Prompt UI]
  - deterministic template prompts
  - skip/accept states
  - optional async AI suggestion panel

        | writes through service only
        v
[Life Intake Service]
  - validates minimal fields
  - source='island_run'
  - routes to habits/goals services
  - queues offline if needed

        +----> [Habits V2 / Goals services + offline repos]
        |
        +----> [Optional future life_intake table/service]

[AI Coach]
  - can read aggregated/source-tagged outputs later
  - never required for gameplay completion
```

---

## Exact files inspected

- `AGENTS.md`
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/level-worlds/LevelWorldsHub.tsx`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx`
- `src/features/gamification/level-worlds/components/IslandRunReflectionComposer.tsx`
- `src/features/gamification/level-worlds/components/board/BoardOrbitStops.tsx`
- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTickets.ts`
- `src/features/gamification/level-worlds/services/islandRunStopTapRouting.ts`
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
- `src/config/islandRunFeatureFlags.ts`
- `src/config/featureAvailability.ts`
- `src/services/featureAccess.ts`
- `src/services/habitsV2.ts`
- `src/data/habitsV2OfflineRepo.ts`
- `src/data/habitLogsOfflineRepo.ts`
- `src/services/goals.ts`
- `src/data/goalsOfflineRepo.ts`
- `src/features/checkins/LifeWheelCheckins.tsx`
- `src/features/profile-strength/profileStrengthData.ts`
- `src/features/ai-coach/AiCoach.tsx`
- `src/services/aiCoachAccess.ts`
- `src/services/aiCoachInstructions.ts`
- `src/services/offlineSyncTelemetry.ts`

---

## Validation commands run (investigation phase)

- `rg --files -g 'AGENTS.md'`
- `cat AGENTS.md`
- `cat docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `cat docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `cat docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `rg --files src | rg 'IslandRun|islandRun|habit|goal|life.?wheel|profile|coach|offline|queue|feature|gating|modal|landmark|stop'`
- `rg -n "useIslandRunState|islandRunStateActions|IslandRunBoardPrototype|BoardOrbitStops|landmark|stop|Build Panel|Habit|Wisdom|modal" src/features/gamification/level-worlds`
- `sed -n ...` targeted reads for listed files.

