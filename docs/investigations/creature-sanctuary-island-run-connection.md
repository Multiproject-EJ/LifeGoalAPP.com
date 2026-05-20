# Creature Sanctuary ↔ Island Run creature system investigation

Date: 2026-05-20

## Scope

Investigate how Score Hub → Creature Sanctuary should connect to the existing Island Run creature, egg, and companion system without implementing it yet.

Hard constraints from the investigation request:

- Do not create a second creature inventory.
- Do not change Island Run rewards, dice, essence, travel, boss, or island completion logic.
- Do not add Supabase migrations unless absolutely required.
- Prefer a read-only adapter first.
- Preserve existing feature gating/demo status and gameplay behavior.

## Executive recommendation

Implement Score Hub → Creature Sanctuary as a read-only gallery adapter over the existing Island Run runtime creature collection first.

There is already an Island Run runtime source of truth for cross-device creature collection and active companion state:

- `IslandRunGameStateRecord.creatureCollection`
- `IslandRunGameStateRecord.activeCompanionId`
- `IslandRunGameStateRecord.perIslandEggs`
- `IslandRunGameStateRecord.creatureTreatInventory`
- `IslandRunGameStateRecord.perfectCompanionIds`
- `IslandRunGameStateRecord.perfectCompanionReasons`

The existing board-level “SPACESHIP SANCTUARY” UI is not purely hardcoded; it renders real collected creatures, active companion state, egg/collection counts, filters, bond progress, and companion actions. However, it is currently embedded in `IslandRunBoardPrototype.tsx` and still uses legacy localStorage-backed helper services as UI convenience/fallback. Score Hub currently shows only a demo/preview card and does not open the real sanctuary gallery.

The safest path is to extract or create a read-only adapter that accepts an `IslandRunGameStateRecord` snapshot and maps it to sanctuary gallery cards. The adapter should not write gameplay state, spend currencies, feed creatures, claim bond rewards, or set active companions in Phase 1.

## Answers to the investigation questions

### 1. Where is the current Creature Sanctuary UI implemented?

There are two relevant surfaces:

1. **Score Hub entry card**
   - `src/features/gamification/ScoreTab.tsx`
   - The `Creature Sanctuary` card is rendered in the Score Hub Collections tab and calls `handleHubCardClick('score.creatureSanctuary', 'Creature Sanctuary')`.
   - Because `score.creatureSanctuary` is configured as `status: 'demo'` and `publicAccess: 'previewOnly'`, non-admin users see the shared future-feature overlay rather than a real gallery.

2. **Existing Island Run sanctuary panel**
   - `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
   - The in-game panel is controlled by `showSanctuaryPanel`.
   - Its dialog is labelled `Creature Sanctuary`, displays the title `SPACESHIP SANCTUARY`, and renders:
     - discovered count
     - active companion
     - collection/inventory/quest/rooms/filter menus
     - visible creature cards
     - locked placeholder cards
     - selected creature details
     - companion/bond actions

Supporting visual component:

- `src/features/gamification/level-worlds/components/CreatureGridCard.tsx`
  - Displays creature art, rarity stars, locked state, selected state, and active companion marker.

### 2. Where is the Island Run creature/egg/companion data stored and read?

Canonical runtime storage is on `IslandRunGameStateRecord` in:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`

Relevant fields include:

- `perIslandEggs`
- `eggRewardInventory`
- `creatureTreatInventory`
- `creatureCollection`
- `activeCompanionId`
- `perfectCompanionIds`
- `perfectCompanionReasons`
- `perfectCompanionComputedAtMs`
- `perfectCompanionModelVersion`
- `perfectCompanionComputedCycleIndex`

Canonical React read path:

- `src/features/gamification/level-worlds/hooks/useIslandRunState.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`

The architecture contract says gameplay reads should use `useIslandRunState(...)` or store snapshot/selectors, and gameplay writes must use canonical action services rather than UI-level direct persistence.

Supabase persistence already exists on `public.island_run_runtime_state`:

- `supabase/migrations/0191_island_run_creature_collection_sync.sql`
  - Adds `creature_collection jsonb`
  - Adds `active_companion_id text`
- `supabase/migrations/0195_island_run_perfect_companion_sync.sql`
  - Adds perfect companion fields
- `supabase/migrations/0217_island_run_commit_action_rpc.sql`
  - Commits runtime snapshots through `island_run_commit_action(...)`

Legacy/local helper reads still exist:

- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
  - localStorage collection fallback/convenience service
  - explicitly notes it is **non-authoritative** and retained for migration/UI convenience
- `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts`
  - localStorage treat fallback/convenience service
  - explicitly notes runtime/Supabase state is authoritative for reward-impacting balances

### 3. Is there already a canonical collection/inventory source of truth?

Yes, for the target architecture: `IslandRunGameStateRecord` is the canonical gameplay record.

The canonical gameplay contract states that the complete Island Run gameplay state is one object, `IslandRunGameStateRecord`, and that fields such as `perIslandEggs` live on this record and nowhere else.

For creatures specifically:

- `creatureCollection` and `activeCompanionId` are present on `IslandRunGameStateRecord`.
- Supabase migrations already added `creature_collection` and `active_companion_id`.
- The localStorage `creatureCollectionService` is explicitly documented as non-authoritative.

Important nuance: the current `IslandRunBoardPrototype.tsx` still reads and mutates a local `creatureCollection` React state initialized from localStorage helpers, then merges runtime `creatureCollection` when present. That means the desired source of truth exists, but the current board sanctuary UI still has migration-era split-authority risk.

### 4. How are discovered, locked, rarity/star, active companion, egg, and companion states represented?

#### Discovered

Discovered/owned creatures are entries in `CreatureCollectionRuntimeEntry` / `CreatureCollectionEntry`:

- `creatureId`
- `copies`
- `firstCollectedAtMs`
- `lastCollectedAtMs`
- `lastCollectedIslandNumber`
- `bondXp`
- `bondLevel`
- `lastFedAtMs`
- `claimedBondMilestones`

The board currently derives `collectedCreatures` from `getCreatureManifestEntries(session.user.id)`, which maps collection entries to `CreatureDefinition` records from `CREATURE_CATALOG`.

#### Locked

Locked gallery slots are currently visual-only placeholders in the board sanctuary UI:

- Owned cards render with `locked={false}`.
- Remaining slots render from `CREATURE_CATALOG.length - collectedCreatures.length` with `locked`.

There is no separate locked-inventory record. Locking is derived from “not present in collection.”

#### Rarity and stars

Creature rarity is `CreatureDefinition.tier`:

- `common`
- `rare`
- `mythic`

`CreatureGridCard.tsx` maps rarity to stars:

- common: `★☆☆☆☆`
- rare: `★★★☆☆`
- mythic: `★★★★★`

The detail sheet currently hardcodes `★★★★★` for selected full cards, which is a UI inconsistency to fix during gallery extraction/polish.

#### Active companion

Canonical target field:

- `IslandRunGameStateRecord.activeCompanionId`

Current board UI field:

- local React state `activeCompanionId`, initialized from `fetchActiveCompanionId(session.user.id)`
- saved via `saveActiveCompanionId(...)` localStorage helper

This should not be copied into Score Hub as another write path. Phase 1 should display the active companion from the runtime snapshot. Phase 2 can add active companion actions only through a canonical Island Run action service.

#### Egg state

Egg state is represented in runtime state as:

- active egg fields:
  - `activeEggTier`
  - `activeEggSetAtMs`
  - `activeEggHatchDurationMs`
  - `activeEggIsDormant`
- per-island ledger:
  - `perIslandEggs: Record<string, PerIslandEggEntry>`
  - each entry has `tier`, `setAtMs`, `hatchAtMs`, `status`, `location`, `openedAt`, `animalCollectedAtMs`
- egg reward inventory:
  - `eggRewardInventory`

`PerIslandEggStatus` is:

- `incubating`
- `ready`
- `collected`
- `sold`

The gameplay contract says Hatchery egg set-to-hatch unlocks Stop 2; egg collected/sold is not the stop unlock objective, but is a separate island-clear condition. Score Hub must not reinterpret or mutate this lifecycle.

#### Companion/perfect companion state

Companion-related state includes:

- active companion:
  - `activeCompanionId`
- bond:
  - `bondXp`
  - `bondLevel`
  - `lastFedAtMs`
  - `claimedBondMilestones`
- perfect companion:
  - `perfectCompanionIds`
  - `perfectCompanionReasons`
  - `perfectCompanionComputedAtMs`
  - `perfectCompanionModelVersion`
  - `perfectCompanionComputedCycleIndex`

Companion bonuses and specialties are derived from catalog/fit services:

- `getCompanionBonusForCreature(...)`
- `getCreatureSpecialtyForCompanion(...)`
- `rankCreatureFitsForPlayer(...)`
- `selectPerfectCompanions(...)`

### 5. Is the current “Spaceship Sanctuary” hardcoded/demo-only, or connected to real game data?

It is connected to real game data, but with migration-era caveats.

Connected to real data:

- It renders collected creatures from the collection service/runtime merge.
- It uses the real `CREATURE_CATALOG`.
- It uses real creature art via `resolveCreatureArtManifest(...)`.
- It displays active companion state.
- It displays bond XP/level, copies, last fed time, claimed/unclaimed milestones.
- It can set active companion, feed creatures, claim bond rewards, buy treats/upgrades, and handle companion quests.

Demo/hardcoded aspects:

- It lives only inside `IslandRunBoardPrototype.tsx`, not Score Hub.
- Score Hub’s Creature Sanctuary card is still feature-gated as demo/preview.
- Some sanctuary copy and room/capacity progression is UI-authored in the board component.
- Locked slots are placeholders derived from catalog size.
- Selected full-card stars are hardcoded as five stars even for non-mythic creatures.
- Several actions still use localStorage helper services or local state rather than canonical action services.

Conclusion: the existing “Spaceship Sanctuary” is not fake, but Score Hub is currently only a preview entry. Reusing the board UI logic directly would risk carrying over write paths and split authority; a read-only adapter is safer.

### 6. What is the safest adapter/service layer to map real game data into sanctuary gallery cards?

Create a read-only adapter under the Island Run services/component boundary, for example:

- `src/features/gamification/level-worlds/services/creatureSanctuaryGalleryAdapter.ts`

Recommended adapter input:

- `IslandRunGameStateRecord`
- `CREATURE_CATALOG`
- optional presentation options, such as selected filter/sort/zone

Recommended adapter output:

- summary:
  - total species count
  - discovered species count
  - copies count
  - active companion name/id
  - unclaimed ready eggs count
- cards:
  - `creatureId`
  - `name`
  - `rarity`
  - `starLabel`
  - `locked`
  - `active`
  - `copies`
  - `bondLevel`
  - `bondXp`
  - `lastCollectedIslandNumber`
  - `habitat`
  - `affinity`
  - `shipZone`
  - `art` manifest or `imageKey`
- egg status rows/badges:
  - ready/incubating/collected/sold counts from `perIslandEggs`

Important boundaries:

- The adapter should be pure/read-only.
- It should not read or write localStorage.
- It should not call Supabase.
- It should not dispatch gameplay actions.
- It should not import React.
- It should derive locked cards from catalog minus `record.creatureCollection`.

Score Hub can then render a gallery from this adapter using `useIslandRunState(session, client)` or a safe store snapshot path.

Do not reuse `creatureCollectionService.fetchCreatureCollection(...)` as the primary Score Hub data source. That service says it is non-authoritative.

### 7. What files would need to change for a minimal implementation?

Phase 1 minimal read-only implementation:

1. Add adapter:
   - `src/features/gamification/level-worlds/services/creatureSanctuaryGalleryAdapter.ts`

2. Add read-only gallery component:
   - `src/features/gamification/level-worlds/components/CreatureSanctuaryGallery.tsx`
   - Or place under Score Hub if preferred:
     - `src/features/gamification/components/CreatureSanctuaryGallery.tsx`
   - Recommendation: keep it near Island Run components because it uses Island Run catalog/art/card components.

3. Update Score Hub routing/rendering:
   - `src/features/gamification/ScoreTab.tsx`
   - Replace only the `score.creatureSanctuary` open path for allowed access with the real read-only gallery.
   - Preserve preview overlay for users where feature access resolves to `previewOnly`.

4. Potentially update shared feature metadata only if product wants it open:
   - `src/config/featureAvailability.ts`
   - To preserve current demo status, do **not** change this in Phase 1 unless explicitly requested. Admin/open access can be used for internal validation while public users remain preview-only.

5. Optional style reuse:
   - `src/features/gamification/level-worlds/LevelWorlds.css`
   - Existing `.island-run-sanctuary-*` styles can be reused if the component is mounted in a compatible context. Otherwise add minimal Score Hub-specific wrapper styles.

6. Optional tests:
   - `src/features/gamification/level-worlds/services/__tests__/creatureSanctuaryGalleryAdapter.test.ts`
   - Test discovered/locked/active/rarity/star derivation from a sample `IslandRunGameStateRecord`.

Do **not** change in Phase 1:

- `islandRunStateActions.ts`
- `islandRunRollAction.ts`
- `islandRunTileRewardAction.ts`
- egg reward/terminal transition services
- dice/travel/boss/island completion logic
- Supabase migrations

### 8. What risks exist around duplicated state, Supabase persistence, offline state, migrations, and Island Run gameplay state?

#### Duplicated state risk

Highest risk is accidentally creating a second Score Hub creature inventory. Avoid:

- new localStorage keys for Score Hub sanctuary
- new Supabase tables for sanctuary inventory
- copying creature entries into Score Hub-specific state
- adding UI-level mutation paths for creature collection, eggs, or active companion

Use runtime `creatureCollection` as the source and derive all card state.

#### Existing split-authority risk

The board currently still mixes:

- runtime `creatureCollection`
- localStorage `creatureCollectionService`
- local React state

The service itself says localStorage is non-authoritative. Score Hub should not expand this pattern. A read-only runtime adapter can reduce future coupling.

#### Supabase persistence risk

No migration appears necessary for Phase 1 because `creature_collection`, `active_companion_id`, and perfect companion columns already exist.

Adding a new table or migration would increase migration/backfill/RLS risk and violate the “no second inventory” constraint unless a future requirement proves current runtime columns are insufficient.

#### Offline/hydration risk

`islandRunStateStore` hydrates from localStorage + Supabase and publishes a runtime snapshot. A read-only Score Hub gallery should tolerate:

- empty/default runtime state before hydration
- local-only/offline latest state
- Supabase conflict/hydration updates
- missing or malformed older `creatureCollection` entries

The adapter should normalize defensively and render empty/locked states without writing fallback data.

#### Migration risk

Existing localStorage migration helper `migrateLegacyEggLedgerToCollection(...)` can write to the localStorage creature collection from `perIslandEggs`. Do not call this from Score Hub Phase 1. If legacy migration/backfill is still needed, keep it in Island Run-owned migration paths or make it an explicit canonical action later.

#### Gameplay state risk

Creature Sanctuary currently has actions that can affect rewards/economy:

- feed creatures
- claim bond rewards
- buy treats/upgrades with shards
- award bond XP
- set/remove active companion, if active companion bonuses are gameplay-affecting

The architecture contract forbids UI/components from adding direct runtime persistence for gameplay fields and requires canonical actions for writes. Score Hub should not expose these actions until Phase 2 has a safe action-service design.

#### Feature-gating risk

`score.creatureSanctuary` is currently `demo` and `previewOnly` for public users. Phase 1 should preserve that unless product explicitly changes access. A real gallery can be wired only for admin/open access or behind existing feature access checks.

### 9. Should this be UI-only first, or does it require data model changes?

It should be UI-only first, with a read-only adapter.

No data model change is required for Phase 1 because:

- creature collection runtime fields already exist
- active companion runtime field already exists
- perfect companion fields already exist
- egg ledger and egg reward inventory fields already exist
- Supabase columns already exist

Data model changes should be deferred unless Phase 2 discovers that active companion writes, long-term collection permanence, or cross-feature collection sharing cannot safely use `IslandRunGameStateRecord`. Based on current code, a new model is not justified for a read-only gallery.

## Recommended implementation phases

### Phase 1: read-only adapter + real sanctuary gallery

Goal: Score Hub shows a visual gallery over real Island Run collection data without writes.

Recommended work:

1. Add a pure adapter that maps `IslandRunGameStateRecord` + `CREATURE_CATALOG` to gallery summary/cards.
2. Add tests for adapter mapping:
   - discovered vs locked
   - active companion
   - rarity/star labels
   - copies/bond fields
   - ready egg count from `perIslandEggs`
3. Add a read-only gallery component using existing creature art/card components where practical.
4. In `ScoreTab.tsx`, keep existing feature access behavior:
   - preview-only users still see the `FeaturePreviewOverlay`
   - allowed/admin access can open the read-only gallery
5. Do not expose feed, claim, shop, active companion, travel, egg, reward, or boss actions.

Acceptance criteria:

- Score Hub gallery reflects `runtimeState.creatureCollection`.
- No new inventory state exists.
- No Supabase migration exists.
- No gameplay behavior changes.
- Public demo/preview gating is preserved.

### Phase 2: active companion actions, if safe

Goal: Allow setting/removing active companion only if it can be done through a canonical action service.

Recommended work:

1. Add or extend a canonical Island Run action service for active companion updates.
2. Use the action mutex/commit path consistent with Island Run gameplay writes.
3. Persist `activeCompanionId` on `IslandRunGameStateRecord` through `commitIslandRunState`.
4. Add tests covering:
   - cannot set an unowned creature active
   - active companion persists in runtime state
   - localStorage fallback is not the authority
   - no duplicate collection entries are created
5. Only then wire Score Hub “Set active companion” actions.

Do not include in Phase 2 unless separately designed:

- feeding
- bond rewards
- shard shop purchases
- companion bonus economy changes

### Phase 3: polish/animations/details

Goal: Improve visual presentation without changing gameplay.

Recommended work:

1. Fix rarity stars in selected full-card/detail views so common/rare/mythic are consistent.
2. Add gallery filtering/sorting if not included in Phase 1.
3. Add improved empty states:
   - no creatures collected
   - eggs ready to resolve in Island Run
   - feature gated preview copy
4. Add animation/polish using existing CSS classes where possible.
5. Optionally extract shared sanctuary CSS from `LevelWorlds.css` if Score Hub needs independent styling.

## Final recommendation

Proceed with Phase 1 as a read-only Score Hub gallery over `IslandRunGameStateRecord.creatureCollection`.

Do not add migrations or a second inventory. Do not wire active companion, feeding, shard shop, bond rewards, or egg resolution into Score Hub until those writes are available through canonical Island Run action services. Preserve the existing demo/preview gate unless product explicitly decides to open the feature.
