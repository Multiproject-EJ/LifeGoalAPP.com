# Island 1 First Creature Pack Reward Investigation

Status: investigation only. No gameplay, UI, or schema changes are implemented by this report.

## 1. Summary of findings

Island Run already has canonical runtime state for dice, current island, creature collection, egg reward inventory, and active companion state. It also has a mutex-protected pattern for idempotent reward claims through service actions. The safest way to add a first-time Island 1 Creature Pack reward is to make it part of the future persisted tutorial/onboarding state, then claim it through one canonical Island Run action that grants both creature cards and +100 dice in a single committed state transition.

The first pack should not be fully unrestricted random. The recommended first-session experience is a 4-card controlled-random pack with a guaranteed curated common creature, guarded rarity weights for the remaining cards, duplicate-safe collection updates, and +100 dice displayed as a separate bonus reward line.

Recommended product placement: after the first guided Hatchery L1 build, when the player has rolled down to a low dice threshold during Island 1 onboarding. This avoids competing with the first roll/essence/build tutorial beats while introducing creatures at a moment when the dice rescue feels useful.

## 2. Relevant files inspected

- Architecture contracts:
  - `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
  - `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
  - `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- Island Run runtime state and actions:
  - `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
  - `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
  - `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  - `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
  - `src/features/gamification/level-worlds/services/islandRunActionMutex.ts`
  - `src/features/gamification/level-worlds/services/islandRunEconomy.ts`
- Board UI and existing low-dice prompt:
  - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - `src/features/gamification/level-worlds/components/OutOfDiceRegenStatus.tsx`
- Creature catalog, collection, and egg reward paths:
  - `src/features/gamification/level-worlds/services/creatureCatalog.ts`
  - `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
  - `src/features/gamification/level-worlds/services/eggService.ts`
  - `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts`
  - `src/features/gamification/level-worlds/services/islandRunTreasurePathEggReward.ts`
- Creature UI:
  - `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
  - `src/features/gamification/level-worlds/components/CreatureGridCard.tsx`
  - `src/features/gamification/level-worlds/LevelWorlds.css`
- Supabase migrations:
  - `supabase/migrations/0167_island_run_runtime_state_progression_markers.sql`
  - `supabase/migrations/0188_island_run_dice_pool_column.sql`
  - `supabase/migrations/0191_island_run_creature_collection_sync.sql`
  - `supabase/migrations/0225_fix_dice_pool_default.sql`
  - `supabase/migrations/0236_add_egg_reward_inventory.sql`
- Tests:
  - `src/features/gamification/level-worlds/services/__tests__/islandRunStateActions.test.ts`
  - `src/features/gamification/level-worlds/services/__tests__/islandRunEggRewardInventoryAction.test.ts`
  - `src/features/gamification/level-worlds/services/__tests__/creatureCollectionService.test.ts`
  - `src/features/gamification/level-worlds/services/__tests__/creatureCatalog.test.ts`

## 3. Current dice state/action path

Current dice count is stored as `dicePool` on `IslandRunGameStateRecord` in `islandRunGameStateStore.ts`. The field is defined with the runtime record and defaults to `ISLAND_RUN_DEFAULT_STARTING_DICE`, currently 30:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:144-167`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:546-570`
- `src/features/gamification/level-worlds/services/islandRunEconomy.ts:12-28`

Canonical roll spending happens in `executeIslandRunRollAction`, under `withIslandRunActionLock`, after reading the latest runtime state and checking `state.dicePool < diceCost`:

- `src/features/gamification/level-worlds/services/islandRunRollAction.ts:158-232`

Canonical reward-style dice deltas can be applied through `applyTokenHopRewards`, which commits through `commitIslandRunState` and bumps `runtimeVersion`:

- `src/features/gamification/level-worlds/services/islandRunStateActions.ts:508-546`

There is a dev-only dice grant helper, but it should not be reused for production first-pack logic:

- `src/features/gamification/level-worlds/services/islandRunStateActions.ts:629-654`

Supabase stores dice in `island_run_runtime_state.dice_pool`:

- `supabase/migrations/0188_island_run_dice_pool_column.sql`
- `supabase/migrations/0225_fix_dice_pool_default.sql`

## 4. Current Island 1/onboarding state path

Current island is stored as `currentIslandNumber` on `IslandRunGameStateRecord`, defaulting to 1:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:151`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:555`
- `supabase/migrations/0167_island_run_runtime_state_progression_markers.sql`

Partial onboarding flags already exist:

- `firstRunClaimed`
- `onboardingDisplayNameLoopCompleted`
- `storyPrologueSeen`

These are stored in the Island Run runtime record:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:144-151`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:546-554`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1592-1597`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1718-1739`

The current state shape is not granular enough for multi-step tutorial sequencing. The first creature pack should not overload `firstRunClaimed`, because that would couple an unrelated reward claim to a broad first-run marker and make it harder to reason about refresh, replay, partial tutorial completion, and future onboarding milestones. It should be modeled as part of a dedicated persisted tutorial state field.

## 5. Current creature collection grant path

The target authoritative creature collection field is `creatureCollection` on `IslandRunGameStateRecord`:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:198`
- `supabase/migrations/0191_island_run_creature_collection_sync.sql`

The older `creatureCollectionService.ts` still contains localStorage helpers such as `collectCreatureForUser`, but the file explicitly documents that localStorage is non-authoritative during migration:

- `src/features/gamification/level-worlds/services/creatureCollectionService.ts:4-10`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts:91-128`

The current hatchery UI path still uses `collectCreatureForUser` after resolving a ready egg terminal transition:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:5677-5724`

However, the more architecture-consistent pattern for future pack rewards is the canonical egg reward inventory action. `openEggRewardInventoryEntry`:

- runs under `withIslandRunActionLock`
- reads the latest Island Run state
- marks the voucher opened
- adds a creature to `creatureCollection`
- preserves duplicate copy semantics
- commits the whole record through `commitIslandRunState`
- returns `already_opened` without regranting on repeat calls

Relevant file:

- `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts:67-135`

This is the closest reusable action pattern for first-pack claiming, though the first pack should likely use a new pack-specific action rather than modifying egg terminal transition logic.

## 6. Current egg/reveal/card UI that can be reused

Reusable UI primitives exist, but there is no dedicated multi-card creature pack modal yet.

Reusable components:

- `CreatureHatchRevealModal` for a single revealed creature:
  - `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx:22-56`
- `CreatureGridCard` for creature card/grid presentation:
  - `src/features/gamification/level-worlds/components/CreatureGridCard.tsx:23-64`
- Sanctuary grid/card CSS and rarity frames:
  - `src/features/gamification/level-worlds/LevelWorlds.css:4381-4498`
- Hatch reveal CSS:
  - `src/features/gamification/level-worlds/LevelWorlds.css:4718-4765`

Recommendation: create a new pack-specific modal later, using these card/art helpers rather than stretching the single-creature hatch modal.

## 7. Whether low-dice/out-of-dice logic already exists

There is an existing out-of-dice prompt, not a low-dice reward flow. It opens when the player cannot afford the next roll:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:4308`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:4424-4447`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:4659-4668`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:9327-9366`

This prompt is shop/Stripe-oriented and should not be repurposed as the first creature pack reward. The first-pack trigger should fire before the out-of-dice prompt, while the player still has a few dice left.

## 8. Recommended trigger condition for the first creature pack

Recommended trigger: evaluate after a roll resolves and all immediate roll/tile reward state has settled.

Suggested eligibility gates:

- `currentIslandNumber === 1`
- `cycleIndex === 0`
- tutorial state indicates the player is in the first-session Island 1 onboarding flow
- first creature pack has not been granted/opened/claimed
- first guided hatchery L1 build is complete
- player has reached low dice, e.g. `dicePool <= 3`
- player is not currently rolling or in another blocking modal/reward reveal
- current state is read from the canonical Island Run store, not a stale component mirror

The trigger should not be based only on low dice. It should require tutorial milestones, especially first essence reward and first Hatchery L1 build, to avoid showing creature collection too early or to returning players.

## 9. Recommended pack composition

Recommended first pack:

- 4 cards, not 6
- controlled-random with onboarding guardrails
- at least 1 guaranteed curated common creature
- remaining 3 cards resolved from weighted rarity pools
- avoid duplicate creature IDs within the first pack where possible
- duplicate-safe collection grant if the player already owns one of the selected creatures
- +100 dice as a separate bonus reward line

Suggested first-pack rarity approach:

- guaranteed slot: curated common, preferably an Island 1 friendly creature such as `common-sproutling`
- remaining slots:
  - common: 85-90%
  - rare: 10-15%
  - mythic: 0% for the first onboarding pack

Existing broader egg tier weights are common 70%, rare 25%, mythic 5%:

- `src/features/gamification/level-worlds/services/eggService.ts:24-33`

Existing early featured-pool logic already biases early islands toward curated creatures:

- `src/features/gamification/level-worlds/services/creatureCatalog.ts:153-229`

No separate shiny rarity system was found. Do not add a shiny chance to the first pack until a real shiny system exists. If product requires a rare possibility, keep it small and controlled through the pack resolver rather than using unrestricted catalog randomness.

## 10. Where to persist `firstCreaturePackClaimed`

Persist this inside Island Run runtime state as part of a broader tutorial state object, not as a standalone UI flag and not by overloading `firstRunClaimed`.

Recommended future shape concept:

- `tutorialState.firstCreaturePack.status`
  - `locked`
  - `eligible`
  - `opening`
  - `opened`
  - `claimed`
- `tutorialState.firstCreaturePack.packId`
- `tutorialState.firstCreaturePack.creatureIds`
- `tutorialState.firstCreaturePack.diceAwarded`
- `tutorialState.firstCreaturePack.eligibleAtMs`
- `tutorialState.firstCreaturePack.openedAtMs`
- `tutorialState.firstCreaturePack.claimedAtMs`

Persistence target:

- `IslandRunGameStateRecord`
- local fallback/hydration in `islandRunGameStateStore.ts`
- Supabase `island_run_runtime_state`, preferably as a JSONB tutorial state column in the same future migration that adds the granular tutorial state machine

Do not store the authoritative one-time claim only in creature collection state, player profile, or localStorage. The reward affects Island Run dice and creature collection together, so the one-time ledger should live with the Island Run runtime record and be committed atomically with the reward.

## 11. Safest canonical action boundary for claiming the pack

Add a new canonical action later, for example:

- `openFirstCreaturePackReward`
- or a generic `openCreaturePackReward` with a `source: 'island_1_onboarding_first_pack'`

The action should be a service-level boundary, not modal logic. It should:

- run under `withIslandRunActionLock`
- read the latest Island Run state from the canonical store
- check tutorial eligibility and current claim/open status
- generate deterministic pack contents from stable seed material
- persist pack contents before reveal, or in the same commit as opening
- add selected creatures to `creatureCollection`
- add `+100` to `dicePool`
- mark first pack opened/claimed in the tutorial state
- bump `runtimeVersion`
- commit once through `commitIslandRunState`
- return a status such as `opened`, `already_opened`, `not_eligible`, or `blocked`

The existing `openEggRewardInventoryEntry` service is the best implementation pattern to follow:

- `src/features/gamification/level-worlds/services/islandRunEggRewardInventoryAction.ts:67-135`

Do not modify `resolveReadyEggTerminalTransition` unless the implementation later decides this is truly an egg reward. The product concept is a pack, not a hatchery egg terminal transition.

## 12. Recommended UI/module structure

Future UI should be read-only with respect to gameplay state and should dispatch only the canonical action.

Suggested component state machine:

1. `unopened`
   - modal title: "You found your first Creature Pack!"
   - CTA: "Open Pack"
   - no gameplay writes
2. `opening`
   - short pack-opening animation
   - button disabled
   - action either already completed or in flight
3. `revealed`
   - display creature cards in a 2-by-2 grid
   - show creature names and rarity
   - show `+100 dice` as a separate bonus reward line
4. `complete`
   - CTA: "Continue"
   - optional secondary CTA to open Sanctuary/Creature Collection

For a 6-card pack in the future, the module can reuse the same pack component with a larger grid, but the first onboarding pack should use the simpler 4-card 2-by-2 layout.

## 13. Suggested tests

Add service/action tests before or with implementation:

- first pack is eligible only on Island 1, cycle 0, after required tutorial milestones
- low dice alone does not trigger the pack for returning or non-onboarding players
- pack opening grants +100 dice exactly once
- pack opening grants creature cards exactly once
- double-click/open twice returns `already_opened` and does not duplicate dice or creature copies
- refresh/reopen returns stored pack contents and does not re-roll
- deterministic seed produces stable card contents
- pack has exactly 4 cards for first onboarding pack
- pack guarantees at least one curated common
- pack avoids duplicate IDs within the pack where possible
- duplicate owned creatures increment copies only through canonical duplicate handling
- action does not use `window.localStorage`, `collectCreatureForUser`, or `fetchCreatureCollection`
- action commits `dicePool`, `creatureCollection`, and tutorial state in the same record update

Add UI/component tests when a modal is implemented:

- unopened state renders "Open Pack"
- opening state disables repeated open attempts
- revealed state renders a 2-by-2 grid for 4 cards
- +100 dice renders as a separate bonus line
- continue closes the modal without regranting

Relevant existing tests to extend or mirror:

- `src/features/gamification/level-worlds/services/__tests__/islandRunStateActions.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunEggRewardInventoryAction.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/creatureCollectionService.test.ts`
- `src/features/gamification/level-worlds/services/__tests__/creatureCatalog.test.ts`

## 14. Risks and architecture guardrails

Primary risks:

- duplicate +100 dice from double-click, modal reopen, refresh, or stale UI state
- duplicate creature grants if the modal writes collection entries directly
- random pack contents changing after refresh if contents are not persisted
- split authority between Supabase, runtime state, and localStorage
- conflict with existing out-of-dice shop prompt if the trigger fires too late
- tutorial sequencing conflicts if the pack appears before first essence/build guidance
- accidental reuse of dev-only dice grant paths
- accidental coupling to hatchery egg terminal transitions when this is a pack reward

Guardrails:

- no gameplay writes directly inside React UI components
- no UI calls to `persistIslandRunRuntimeStatePatch` for gameplay fields
- no new local component mirrors for authoritative tutorial/reward state
- no localStorage creature collection writes as the canonical grant path
- no new reward path that bypasses `commitIslandRunState`
- claim/open action must run under `withIslandRunActionLock`
- dice, creatures, and first-pack tutorial status must commit atomically
- normal creature pack economy should remain separate and reusable later
- do not touch Stripe, purchases, or unrelated shop systems
- do not modify egg terminal transition logic unless later implementation proves this is the correct reusable boundary
