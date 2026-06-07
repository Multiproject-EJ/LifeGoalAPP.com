# Creature Companion Wisdom Stop Investigation

Date: 2026-06-07  
Scope: Investigation only. No gameplay, economy, reward, schema, AI, movement, dice, ticket, or telemetry-authority changes were implemented.

## Executive summary

- **PASS for MVP without schema changes.**
- The current Wisdom Stop is already a self-contained encounter branch inside Island Run, and completion already routes through shared stop-complete logic.
- Creature ownership and active companion state already exist in authoritative Island Run runtime state.
- Sanctuary metadata already exists in code and is rich enough for a static/template creature encounter.
- The safest MVP is a **render-time swap inside the existing Wisdom Stop path**:
  - if no active companion: keep current `WisdomTreeCardEncounter`
  - if active companion exists: render a new `CreatureWisdomEncounter`
  - keep completion and rewards on the existing `handleCompleteActiveStop` path

## 1) Where the current Wisdom Stop encounter is implemented

- Stop definition lives in `src/features/gamification/level-worlds/services/islandRunStops.ts:149-154`.
  - `stopId: 'wisdom'`
  - title: `📖 Wisdom Landmark`
  - kind: `fixed_wisdom`
- Island-specific Wisdom card content lives in `src/features/gamification/level-worlds/services/wisdomTreeCards.ts:1-186`.
  - `WISDOM_TREE_CARDS` is static/authored content.
  - `getWisdomTreeCardForIsland(islandNumber)` chooses the card by deterministic modulo.
- The current encounter component lives in `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx:1-68`.
  - It is fully local UI state:
    - select choice
    - reveal response
    - call `onComplete(...)`
- The board render path lives in `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:10873-10909`.
  - When `activeStopId === 'wisdom'`, the board renders:
    - `WisdomTreeCardEncounter`
    - the optional Wisdom diamond-to-essence bonus CTA

## 2) How Wisdom Stop completion and rewards are triggered

### Completion trigger

- `WisdomTreeCardEncounter` calls `onComplete(selectedChoice.response)` in `src/features/gamification/level-worlds/components/WisdomTreeCardEncounter.tsx:55-61`.
- The board receives that in `IslandRunBoardPrototype.tsx:10876-10882`, sets landing text, then calls `handleCompleteActiveStop()`.

### Shared stop-complete path

- `handleCompleteActiveStop` lives in `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:7841-8008`.
- It handles:
  - completion blocking (`getStopCompletionBlockReason`)
  - contract-v2 active-stop enforcement
  - canonical objective progression through `applyStopObjectiveProgress(...)`
  - completed-stop syncing
  - modal close / landing text updates

### Rewards

- Shared non-boss stop completion currently awards:
  - `awardShards('stop_complete')`
  - `awardWalletShards(1)`
- This happens in the contract-v2 path at `IslandRunBoardPrototype.tsx:7903-7906` and in the non-v2 path at `7999-8005`.
- Wisdom-specific extra CTA:
  - `WISDOM_ESSENCE_BONUS_COST_DIAMONDS = 3`
  - `WISDOM_ESSENCE_BONUS_AMOUNT = 15`
  - wired in `IslandRunBoardPrototype.tsx:10884-10903`

### Important implementation constraint

- Wisdom completion is already safely attached to the shared stop-complete path.
- MVP should preserve that and should **not** introduce new reward or progression logic.

## 3) Where creature collection state and active companion state are stored/read

### Authoritative runtime state

- `IslandRunGameStateRecord` includes:
  - `creatureCollection`
  - `activeCompanionId`
- Defined in `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:257-259`.
- Default values are in `islandRunGameStateStore.ts:649-651`.

### Persistence

- Runtime serialization writes:
  - `creature_collection`
  - `active_companion_id`
- See `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1765-1767`.
- Supabase schema columns already exist:
  - `supabase/migrations/0191_island_run_creature_collection_sync.sql:3-13`

### Reads in board/UI

- `IslandRunBoardPrototype` mirrors `runtimeState.activeCompanionId` into local UI state (`src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:1996,2635`).
- Sanctuary/gallery shaping reads runtime creature collection through:
  - `creatureSanctuaryAdapter.ts`
  - board-level `collectedCreatures` / `activeCompanion`
- Legacy fallback also exists in `src/features/gamification/level-worlds/services/creatureCollectionService.ts:4-10,257-275`, but that file explicitly says it is **non-authoritative** and retained for migration/UI fallback only.

## 4) Whether `activeCompanionId` already exists and how it is used

**Yes. It already exists and is actively used.**

### Canonical selection/write path

- `setActiveCompanionId` / `clearActiveCompanionId` live in `src/features/gamification/level-worlds/services/islandRunStateActions.ts:2314-2359`.
- Selection is validated through `resolveActiveCompanionCommitTarget(...)` in `2300-2312`.
- It only allows owned catalog companions.

### Current usages

- Sanctuary selection UI commits active companion in `IslandRunBoardPrototype.tsx:8927-8942`.
- Sanctuary card/galleries mark active creature in `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts:140-188`.
- Board cleans up stale/unowned active companions in `IslandRunBoardPrototype.tsx:2905-2920`.
- Companion regen modifier reads `activeCompanionId` + `creatureCollection` in `src/features/gamification/level-worlds/services/companionRegenModifier.ts:65-194`.
- Start-of-island companion bonus also keys off the active companion in `IslandRunBoardPrototype.tsx:6528-6591`.

### Conclusion

- `activeCompanionId` is already the right gate for “show creature encounter instead of generic Wisdom Tree.”
- No new persistence field is needed for MVP gating.

## 5) Where Sanctuary / creature card metadata lives

### Core creature metadata

- `src/features/gamification/level-worlds/services/creatureCatalog.ts:5-13`
- Each creature already has:
  - `id`
  - `imageKey`
  - `name`
  - `tier`
  - `habitat`
  - `affinity`
  - `shipZone`

### Sanctuary card shaping

- `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts:9-188`
- It turns catalog + runtime state into read-only card models such as:
  - rarity label
  - stars
  - habitat
  - affinity
  - active-companion marker
  - collection/bond display state

### Archetype / blind-factor-adjacent metadata

- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts:3-88`
- Existing mappings already connect creature affinity to:
  - archetype ids
  - weakness support tags
  - preferred ship zones

### User archetype metadata already available in board

- `IslandRunBoardPrototype` extracts archetype ids from `session.user.user_metadata.archetype_hand` in `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:628-666,6186-6196`.

### Conclusion

- There is already enough metadata for static/template creature dialogue without touching schema.
- The only missing piece is a dedicated resolver for encounter copy.

## 6) Best place to add a `CreatureWisdomEncounter` component

### Best render insertion point

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- Specifically the existing Wisdom branch at `10873-10909`.

### Best component location

- `src/features/gamification/level-worlds/components/CreatureWisdomEncounter.tsx`
- Rationale:
  - same folder as `WisdomTreeCardEncounter`
  - same stop-modal rendering context
  - easy to keep visual changes scoped to Wisdom Stop only

### Best content/resolver location

- New display-only service under:
  - `src/features/gamification/level-worlds/services/creatureWisdomEncounterContent.ts`
  - or `creatureWisdomEncounterResolver.ts`

That service should own:

- per-island encounter type selection
- static/template dialogue selection
- creature-affinity/personality copy resolution
- fallback behavior when archetype metadata is missing

### Best style location

- `src/features/gamification/level-worlds/LevelWorlds.css`
- Reuse Wisdom Stop-local class scoping like the existing `wisdom-tree-card` styles.

## 7) Whether MVP can be implemented with static/template dialogue and no schema change

**Yes.**

### Why MVP can work with existing data

- Active companion already exists (`activeCompanionId`).
- Owned creature metadata already exists (`creatureCollection` + `creatureCatalog`).
- User archetype metadata is already accessible from `session.user.user_metadata.archetype_hand`.
- Wisdom completion already uses a shared stop-complete flow.
- No new persistence is required just to:
  - choose creature encounter vs generic Wisdom Tree
  - render one static/template encounter
  - complete the stop using existing reward logic

### Safe MVP interpretation of the three encounter types

- **Tower Question**
  - static multiple-choice prompt
  - answer only changes the immediate follow-up copy in the same encounter
  - no persistent “learning” yet
- **Companion Guidance**
  - one short authored next-step suggestion
  - derived from creature affinity / ship zone / island type
- **Companion View**
  - one short reflection from the creature’s POV
  - optionally flavored by archetype hand / shadow-style framing if metadata exists

### Important caveat

- If product later wants the creature to actually remember user answers across islands and change future guidance from those answers, that will likely need new persistence.
- But the requested MVP can proceed without it.

## 8) What files would likely need editing for MVP

Most likely:

1. `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - switch Wisdom Stop render path based on active companion presence
   - pass current island, active companion, and optional archetype metadata into the new encounter

2. `src/features/gamification/level-worlds/components/CreatureWisdomEncounter.tsx`
   - new encounter UI component

3. `src/features/gamification/level-worlds/services/creatureWisdomEncounterContent.ts`
   - new static/template resolver for encounter models

4. `src/features/gamification/level-worlds/LevelWorlds.css`
   - scoped styling for the new creature encounter inside the Wisdom Stop path only

Possible but optional:

5. `src/features/gamification/level-worlds/services/creatureCatalog.ts`
   - only if authored dialogue needs additional code-level creature metadata
   - not required if current `affinity`, `habitat`, `tier`, and `shipZone` are enough

6. `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts`
   - only if stronger static “Companion View” mapping needs extra code-level weakness/blind-spot labels

Files that should **not** need editing for MVP:

- Supabase migrations / schema
- reward-value definitions
- dice/ticket/telemetry authority services
- island movement / roll / reward bar logic
- `islandRunStateActions.ts` for new gameplay writes

## 9) What tests should be added

This repo’s Island Run service coverage runs through `npm run test:island-run` (`package.json:23`), so the safest MVP tests are service-first.

### Recommended tests

1. **New resolver unit test**
   - file: `src/features/gamification/level-worlds/services/__tests__/creatureWisdomEncounterContent.test.ts`
   - cover:
     - deterministic encounter-type selection by island
     - fallback behavior when no archetype metadata exists
     - different output for Tower Question / Guidance / Companion View
     - stable output for same inputs

2. **Board fallback behavior test or source-guard**
   - verify:
     - no active companion => current `WisdomTreeCardEncounter` path remains
     - active companion => creature encounter path renders
   - if no good component harness exists, a source-guard style test is acceptable because this codebase already has source-guard patterns for board wiring

3. **Reward/completion regression coverage**
   - verify the new creature encounter still completes through the existing stop-complete path
   - no change to shard/wallet shard rewards
   - no change to Wisdom bonus values

4. **Optional static copy metadata test**
   - if new template mapping uses creature affinity/archetype tags, add a small unit test for that mapping so authored content stays deterministic and safe

### Tests that are not required for MVP

- schema tests
- AI tests
- new telemetry tests if telemetry behavior is intentionally unchanged

## 10) Risks / blockers

### Risk 1: `IslandRunBoardPrototype.tsx` is a migration-heavy file

- The file starts with an explicit warning not to add new gameplay-state write paths (`src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:1-18`).
- This is manageable if the change is only:
  - render branching
  - prop passing
  - existing completion callback reuse

### Risk 2: Current Wisdom bonus path is already split-authority

- The optional diamond-to-essence CTA uses direct component state mutation before completing the stop (`IslandRunBoardPrototype.tsx:10884-10903`).
- MVP should avoid touching that path.

### Risk 3: Active companion data has legacy fallback noise

- Runtime state is authoritative, but legacy localStorage creature helpers still exist for migration/UI compatibility.
- New creature Wisdom logic should read authoritative runtime-backed companion data, not local fallback helpers.

### Risk 4: “Blind-factor archetype” is not a single existing canonical field

- The repo has:
  - archetype hand metadata
  - affinity-to-archetype mappings
  - weakness support tags
- But there is no clearly named persisted “blind factor” field in the Island Run runtime model.
- MVP can still ship by using:
  - shadow/archetype-hand-derived flavor when available
  - creature-affinity fallback when not

### Risk 5: Persistent “the answer helps the creature guide better” is not truly implemented in MVP

- Without schema or AI, that learning can only be immediate/session-local/template-local.
- This is acceptable for MVP if product agrees that future persistent learning is deferred.

### Risk 6: Limited component-test infrastructure around the board

- Most existing coverage in this area is service-oriented.
- That argues for putting as much logic as possible into a pure resolver/service instead of the board component.

## Recommended MVP scope

- Keep all existing Wisdom Stop completion and reward behavior unchanged.
- Add a render-time branch inside the current Wisdom Stop:
  - no active companion -> existing `WisdomTreeCardEncounter`
  - active companion -> new `CreatureWisdomEncounter`
- Use static/template-authored dialogue only.
- Assign one encounter mode per island deterministically.
- Do not persist encounter answers.
- Do not change economy logic, reward values, schema, movement, roll logic, reward bar, dice spending, tickets, or telemetry authority.
- Keep all visual changes scoped to the Wisdom Stop / creature encounter path.

## Proposed PR sequence

1. **PR 1 — Resolver + tests**
   - add pure creature Wisdom encounter content resolver
   - add deterministic tests

2. **PR 2 — Wisdom Stop render swap**
   - add `CreatureWisdomEncounter`
   - wire the Wisdom branch in `IslandRunBoardPrototype`
   - preserve existing completion callback and Wisdom bonus CTA

3. **PR 3 — Optional authored metadata polish**
   - only if needed, add richer code-level creature dialogue metadata in catalog/bridge files
   - no schema changes

4. **Later PR (explicitly out of MVP)**
   - persistent answer memory
   - AI-guided creature dialogue
   - deeper personality/blind-factor personalization if product wants stronger continuity

## PASS/FAIL on whether implementation can proceed without schema changes

**PASS**

Implementation can proceed without schema changes **for the requested MVP**, as long as:

- encounter selection stays deterministic and display-driven
- answers are not persisted
- completion continues to use the existing Wisdom Stop completion path
- reward/economy behavior remains unchanged
