# Creature Sanctuary + Companion Regen System Investigation

Status: investigation only. No gameplay, economy, schema, Supabase, migration, or UI rewrite changes are implemented by this report.

## 1. Executive summary

The repository already contains a meaningful Creature/Sanctuary foundation: a deterministic creature catalog, runtime-backed creature collection state, active companion state, bond progression fields, first-session creature pack reward flow, hatch reveal/card UI primitives, and a Perfect Companion recommendation layer. Island Run also has a mature passive dice regeneration service with offline catch-up semantics and runtime/Supabase synchronization patterns.

The safest future direction is to extend Island Run through service-authoritative, mutex-protected action services and canonical runtime state. A future Creature Emotional Companion + Dice Regen system should not calculate bonuses in React UI components, should not rely on localStorage creature services for reward-bearing state, and should not add direct Supabase/table writes outside the existing commit/store architecture.

High-level finding:

- **PASS:** Creature identity, collection, active companion, bond fields, art manifest, and passive dice regen primitives exist.
- **RISK:** Sanctuary UI and some companion bonus effects still have migration-era split authority or placeholder/demo surfaces.
- **BLOCKER:** Passive creature regen should wait for a canonical action/state design, schema constraints, idempotency, and explicit economy caps before implementation.

## 1A. Terminology used in this report

- **Dice floor / passive floor:** the passive regeneration target represented in code by `diceRegenState.maxDice`. It is not a hard wallet cap; reward sources can push `dicePool` above this floor, and base passive regen stops while the player is at or above it.
- **Reserve:** a future separate capped bucket that could hold companion-generated dice before transfer/claim into the main dice pool.
- **Claimable bucket:** a reserve-like model where elapsed passive progress is not automatically applied and instead requires a canonical claim action.

## 2. Relevant files inspected

Architecture contracts:

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`

Creature and sanctuary systems:

- `src/features/gamification/level-worlds/services/creatureCatalog.ts`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
- `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts`
- `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts`
- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts`
- `src/features/gamification/level-worlds/components/CreatureGridCard.tsx`
- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx`
- `src/features/gamification/ScoreTab.tsx`

Island Run runtime/economy/passive systems:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`
- `src/features/gamification/level-worlds/services/islandRunCommitActionService.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/OutOfDiceRegenStatus.tsx`

Supabase persistence references:

- `supabase/migrations/0191_island_run_creature_collection_sync.sql`
- `supabase/migrations/0194_island_run_treat_inventory_and_companion_visit_sync.sql`
- `supabase/migrations/0217_island_run_commit_action_rpc.sql`
- `supabase/migrations/0228_island_run_action_log_client_action_id_to_text.sql`

## 3. Identified canonical systems

### PASS: Canonical Island Run read/write contract exists

The active architecture contract says gameplay reads should use `useIslandRunState` / `islandRunStateStore`, and gameplay writes should go through `islandRunStateActions`, `islandRunRollAction`, `islandRunTileRewardAction`, or other mutex-protected services. It explicitly forbids new UI calls to `persistIslandRunRuntimeStatePatch`, new runtime mirrors, duplicated dice/token/reward logic in components, and stop progression coupled to board tile indices.

Relevant references:

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md:10-29`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md:23-54`

### PASS: Canonical gameplay economy contract exists

The canonical contract identifies dice as the only board energy and states that dice can come from reward bar payouts, boss/stop/island completion, daily treats, lucky spin, shop purchases, and passive regeneration. It also states tiles do not award dice directly and dice should preserve scarcity/monetization tension.

Relevant references:

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md:99-116`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md:148-190`

### RISK: Dice regen contract and implementation should be reconciled before creature regen

The contract describes a continuous logarithmic minimum dice threshold with no hard cap. The implementation currently uses discrete level bands with `maxDice` values and interval minutes in `islandRunDiceRegeneration.ts`.

The practical difference: the contract implies a formula-derived floor that can grow smoothly for any player level, while the implementation chooses from fixed bands such as level 1, 5, 10, 20, 40, 75, and 125. That affects future creature regen because a companion bonus could be modeled as a formula modifier, a band modifier, or a separate reserve, and those options have different economy impact.

Relevant references:

- Contract: `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md:172-208`
- Implementation: `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:19-47`

This does not block investigation, but future creature regen should not copy ambiguous rules until product/design confirms the intended source of truth.

## 4. Creature system mapping

### PASS: Creature catalog is deterministic and data-driven enough for current needs

`CreatureDefinition` currently includes `id`, `imageKey`, `name`, `tier`, `habitat`, `affinity`, and `shipZone`. The catalog contains common, rare, and mythic creature arrays, then exports a combined `CREATURE_CATALOG`. Hatching uses deterministic selection by egg tier, seed, and island number, with an early featured pool feature for Islands 1-5.

Relevant references:

- `src/features/gamification/level-worlds/services/creatureCatalog.ts:5-13`
- `src/features/gamification/level-worlds/services/creatureCatalog.ts:48-106`
- `src/features/gamification/level-worlds/services/creatureCatalog.ts:142-151`
- `src/features/gamification/level-worlds/services/creatureCatalog.ts:153-229`

### PASS: Current metadata supports rarity, habitat, affinity, and ship-zone theming

The catalog already has the first layer of symbolic metadata: habitat, affinity, tier, and ship zone. `creatureArchetypeBridge.ts` maps affinity names to archetype IDs and weakness support tags. `creatureFitEngine.ts` scores creature fit using strength match, healing match, zone match, and rarity bonus.

Relevant references:

- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts:11-35`
- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts:37-88`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts:16-43`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts:59-110`

### PASS: Runtime creature ownership model exists

Runtime creature collection entries include `creatureId`, duplicate `copies`, collection timestamps, last collection island, bond XP, bond level, last fed timestamp, and claimed bond milestones. These are part of `IslandRunGameStateRecord`, along with `activeCompanionId`, Perfect Companion IDs/reasons, and companion bonus dedupe marker.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:71-81`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:217-248`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:621-637`
- `supabase/migrations/0191_island_run_creature_collection_sync.sql:3-13`
- `supabase/migrations/0194_island_run_treat_inventory_and_companion_visit_sync.sql:3-13`

### PASS: Duplicate creature semantics are explicit

The runtime helper `addCreatureToRuntimeCollection` increments `copies` for existing creature IDs and creates new entries for first-time creatures.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunCreatureCollectionLedger.ts:3-36`

### RISK: Legacy localStorage creature and treat services remain available

`creatureCollectionService.ts` and `creatureTreatInventoryService.ts` explicitly say they are non-authoritative and retained for migration/fallback UI compatibility. They still expose collection, feeding, milestone, active companion, and treat mutation helpers that write localStorage.

Relevant references:

- `src/features/gamification/level-worlds/services/creatureCollectionService.ts:1-10`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts:91-177`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts:241-263`
- `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts:3-9`
- `src/features/gamification/level-worlds/services/creatureTreatInventoryService.ts:56-77`

Future reward-bearing creature systems should not use these helpers as authority.

### RISK: Active companion bonus effect is currently partly UI-applied

`applyCompanionBonusLastVisitKeyMarker` commits only the visit marker through the store path. In `IslandRunBoardPrototype`, after marking the visit key, the component applies essence/spin/dice effects via React state setters (`setRuntimeState`, `setSpinTokens`, `setDicePool`). This is a split-authority risk for any future economy-sensitive companion effect.

Relevant references:

- Marker service: `src/features/gamification/level-worlds/services/islandRunStateActions.ts:1961-1988`
- UI application: `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:5752-5792`

Future passive dice regen should not extend this pattern. It should move all claim/grant math into a canonical action service that persists the marker and resource delta atomically.

### RISK: Hatchery collection still uses localStorage collection helper for UI state

The hatchery collect path resolves the egg terminal transition through canonical state, then calls `collectCreatureForUser` and sets local UI collection state. The canonical terminal transition does not appear to add the creature to runtime `creatureCollection` in this path.

Relevant references:

- UI collection path: `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:5868-5914`
- Terminal transition fields: `src/features/gamification/level-worlds/services/islandRunStateActions.ts:2540-2600`

This is a migration risk for future sanctuary features because collection visibility and reward-bearing creature ownership can diverge unless future grants use runtime collection services.

### PASS: First-session creature pack uses the stronger runtime pattern

The first-session pack action is mutex-protected, checks tutorial eligibility, builds deterministic cards, adds creatures through the runtime collection ledger, grants dice, and commits through `commitIslandRunState`.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts:15-39`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts:116-171`
- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts:178-220`

This is the preferred model for future creature pack and companion reward claims.

## 5. Sanctuary architecture

### PASS: Sanctuary rendering primitives exist

Creature UI primitives include a minimal creature grid card, a single-creature hatch reveal modal, and a first-session multi-card pack modal. These components are already mobile-friendly in structure and rely on art manifest/fallback flows rather than hardcoded external images.

Relevant references:

- `src/features/gamification/level-worlds/components/CreatureGridCard.tsx:4-64`
- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx:4-56`
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx:7-144`

### PASS: Board-level sanctuary logic is substantial

`IslandRunBoardPrototype` has filtering/sorting logic for collected creatures by active, rarity, reward-ready, bond, and zone. It also derives top Perfect Companion entries and reason payloads from runtime state.

Relevant references:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:5628-5675`

### RISK: Score tab sanctuary entry is placeholder/future-feature oriented

`ScoreTab` shows a Creature Sanctuary feature card and a Garage/Ship companion section that links to “Open Companions Sanctuary,” but the collections tab card is gated through feature availability/future-feature UI and the garage section is mostly a navigation stub.

Relevant references:

- `src/features/gamification/ScoreTab.tsx:1241-1262`
- `src/features/gamification/ScoreTab.tsx:1641-1663`
- `src/config/featureAvailability.ts:15-23`

### RISK: Sanctuary is not yet a clean standalone production surface

The strongest companion/sanctuary behavior is embedded inside the large Island Run board component, while the broader Score/Collections entry is partly future-feature/placeholder. Future systems should extend canonical state/actions first, then expose a sanctuary shell that reads canonical state. A full rebuild is not required immediately, but the UI should be migrated out of board-local assumptions in phases.

## 6. Passive/offline progression architecture

### PASS: Existing passive dice regen is pure and reusable as a pattern

`applyDiceRegeneration` is deterministic. It sanitizes pool and timestamps, grants one die per full elapsed interval, fills only up to `maxDice`, preserves overflow dice from rewards by stopping regen when the pool is at/above max, and returns the updated regen state.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:74-145`
- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:147-188`

### PASS: Runtime regen wrapper avoids unnecessary persistence churn

`resolveRuntimeDiceRegenUpdate` wraps dice regen and returns `null` when no dice or meaningful regen-state delta needs to be persisted.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts:17-62`

### PASS: Out-of-dice UI uses the pure ETA service

`OutOfDiceRegenStatus` renders the current dice pool, progress, and next-die countdown using `resolveNextRollEtaMs`, while limiting its interval to mounted/needed states.

Relevant references:

- `src/features/gamification/level-worlds/components/OutOfDiceRegenStatus.tsx:9-22`
- `src/features/gamification/level-worlds/components/OutOfDiceRegenStatus.tsx:40-113`

### PASS: Runtime persistence has remote sync, local fallback, merge, and sanitization patterns

`IslandRunGameStateRecord` defaults include dice, dice regen state, creature collection, active companion, treat inventory, timed events, and minigame tickets. Hydration has local fallback, remote backoff, and field normalization. Remote serialization writes canonical runtime fields including creature and dice regen fields.

Relevant references:

- Defaults: `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:591-672`
- Creature normalization: `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:675-715`
- Merge examples: `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1583-1630`
- Remote row mapping: `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1646-1715`
- Hydration entry: `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:1718-1765`

### PASS: Commit RPC supports optimistic versioning and idempotency

The current `island_run_commit_action` RPC uses expected runtime version checks and `client_action_id` to dedupe repeated actions through `island_run_action_log`.

Relevant references:

- `supabase/migrations/0228_island_run_action_log_client_action_id_to_text.sql:27-93`
- `supabase/migrations/0228_island_run_action_log_client_action_id_to_text.sql:95-160`
- `src/features/gamification/level-worlds/services/islandRunCommitActionService.ts:19-70`

### RISK: Some action services are still migration-era fire-and-forget store commits

Several canonical action helpers call `commitIslandRunState` asynchronously and return local next state immediately. This can be valid during migration, but future offline/passive economy claims should favor an action result shape that acknowledges conflict/duplicate/error states where player rewards are involved.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunStateActions.ts:1842-1887`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts:1961-1988`

## 7. Island Run economy integration

### PASS: Roll spending is service-authoritative

`executeIslandRunRollAction` runs behind the shared Island Run action mutex, reads current state, checks dice affordability, generates dice results in the service, and returns authoritative new dice pool/movement values.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunRollAction.ts:184-225`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts:227-260`

### PASS: Reward-bar claims centralize payout math

`executeIslandRunClaimRewardAction` reads state, validates claimability, computes reward-bar payout through canonical logic, applies resource deltas, and persists the full record.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts:1-23`
- `src/features/gamification/level-worlds/services/islandRunClaimRewardAction.ts:62-126`

### PASS: Active economy-sensitive fields are already grouped in Island Run runtime state

Dice, essence, shards, diamonds, spin tokens, minigame tickets, reward bar state, timed events, stickers, creature collection, active companion, and treat inventory all live together in `IslandRunGameStateRecord`.

Relevant references:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:187-248`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:264-316`

### RISK: Passive creature regen can inflate dice if it bypasses the existing dice-floor semantics

Current dice regen fills only when `dicePool < maxDice`; reward dice may exceed that dice floor and regen stops at/above the floor. Future creature regen must decide whether it:

1. raises the existing dice regen floor, meaning active companions increase the `maxDice` target that base passive regen fills toward,
2. contributes a separate capped reserve, meaning companion dice accumulate in a distinct bucket with its own maximum,
3. reduces interval time, meaning companions speed up the existing per-die timer without changing the floor,
4. creates a claimable but capped reserve bucket, meaning elapsed companion regen becomes an explicit claim action rather than silently changing `dicePool`, or
5. grants uncapped dice.

Option 5 is the highest inflation risk and should be avoided unless intentionally monetized and tightly capped.

### RISK: Companion startup bonuses already grant dice/essence/spin-like value

The current companion system defines startup bonuses by affinity: supportive companions grant essence, momentum companions grant spin tokens, and steady companions grant dice. Perfect Companion can add a configured startup bonus.

Relevant references:

- `src/features/gamification/level-worlds/services/creatureCatalog.ts:231-263`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:5775-5792`

Future passive regen must account for these existing start-of-island bonuses to avoid stacking too many passive sources.

## 8. Future-safe metadata architecture proposal

### Recommended data model direction

Keep the base creature catalog data-driven and compositional. Add metadata as arrays/objects rather than hardcoded pair logic:

- `tags`: broad descriptors such as `calm`, `growth`, `reflection`, `cozy`, `courage`, `routine`, `exploration`.
- `emotionalTraits`: user-facing emotional support traits such as `grounding`, `encouraging`, `soothing`, `curious`, `brave`, `reflective`.
- `archetypeSynergy`: references to existing archetype IDs, not bespoke UI strings.
- `supportTags`: maps to weakness/support tags such as `stress_fragility`, `low_consistency`, `low_momentum`.
- `sanctuaryResonance`: data-driven categories such as `zen`, `energy`, `cosmic`, or future room/aura IDs.
- `passiveBonusProfile`: non-authoritative profile IDs such as `dice_floor_plus_small`, `reserve_plus_small`, `regen_interval_small`, not raw freeform reward math in UI.
- `bondMilestoneProfile`: profile IDs for unlocks/visuals/trait evolution by bond level.
- `pairSynergyTags`: tags used by a resolver to compute pair resonance; avoid hardcoded creature A + creature B special cases.

### Recommended runtime state direction

For future implementation, prefer a dedicated runtime slice under Island Run state, for example conceptually:

- active companion slots: selected creature IDs, capped by account/progression rules.
- per-creature bond state: continue using runtime `creatureCollection` for bond XP/level unless it becomes too large.
- passive regen ledger: per-user or per-active-companion timestamp state with last claim/anchor time.
- bonus claim history: idempotency markers keyed by day/island/cycle/action, not UI booleans.

Do not store derived emotional labels in runtime state. Store stable IDs and recompute display copy from catalog/config.

### PASS: Existing affinity/archetype bridge can evolve into this model

The current affinity-to-archetype and weakness-support mappings are a good starting point. They should be converted from a hardcoded bridge into data/config only when content volume grows.

Relevant references:

- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts:11-88`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts:59-110`

## 9. Recommended integration points

### Safest future service locations

Recommended home for future service logic:

- Passive creature regen math: `src/features/gamification/level-worlds/services/` beside `islandRunDiceRegeneration.ts`.
- Claim/apply action: an Island Run action service using `withIslandRunActionLock`, canonical state read, deterministic math, and `commitIslandRunState`/commit RPC path.
- UI display: `OutOfDiceRegenStatus`-style pure read-only countdown component or a sanctuary companion status component that reads canonical state only.

### Required integration rules

- Compute creature passive dice in a service, not inside React render/effects.
- Persist resource delta and regen anchor/claim marker atomically.
- Include idempotent `client_action_id` for claim-like actions.
- Use server/runtime hydration time patterns consistently; never trust an arbitrary UI timestamp as authority for rewards.
- Sanitize all hydrated numeric/timestamp fields.
- Keep active companion slot limits in service/config, not only disabled UI buttons.
- Use existing dice floor semantics unless product intentionally defines a new capped reserve.

## 10. Economy safety considerations

### Recommended guardrails

1. Treat creature regen as a floor/reserve modifier, not unlimited dice printing.
2. Cap reserve capacity separately if a reserve bucket is introduced.
3. Do not let passive creature regen fill above the active dice floor (`diceRegenState.maxDice`) unless explicitly using a capped reserve.
4. Keep start-of-island companion bonuses and passive regen budgets in the same economy balance table.
5. Use per-action idempotency and expected runtime version for claim actions.
6. Require tests for offline catch-up, cap enforcement, duplicate claim, clock rollback, active companion changes, and cross-device conflict.
7. Avoid raw `amount` values directly on creature catalog entries if those values can drift economy balance; prefer profile IDs resolved by a balance config.
8. Add telemetry for dice source attribution: base regen, creature regen, companion startup, rewards, shop, events.

### Inflation-sensitive areas

- Dice pool can exceed passive floor from reward sources; creature regen should not blindly add on top.
- First-session creature pack already grants a large dice bonus, so early creature passive regen should be delayed or small.
- Perfect Companion startup bonuses can stack with base companion bonuses.
- Treat inventory and feeding can become an exploit vector if feeding triggers regen acceleration without capped inputs.
- Offline catch-up should grant at most the eligible capped deficit/reserve, not elapsed time multiplied by all active creatures without a ceiling.

## 11. UI/UX integration recommendations

### PASS: Existing UI has good cozy primitives

Current creature surfaces already use friendly language, rarity stars, cozy pack/hatch presentation, and “Added to Sanctuary” confirmation.

Relevant references:

- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx:26-52`
- `src/features/gamification/level-worlds/components/FirstSessionCreaturePackModal.tsx:49-144`

### Recommended mobile-first UX additions later

- Today screen: one small “Companion mood” card, one active companion portrait, and one low-cognitive-load benefit line.
- Island Run HUD: compact active companion chip near dice with passive regen/reserve contribution, not a complex stat panel.
- Sanctuary: bottom-sheet creature detail with bond, emotional traits, active status, and one primary action.
- Passive regen display: “Companion reserve: +X ready” or “Next companion dice in MM:SS,” using the same countdown language as dice regen.
- Emotional readability: show traits as words/icons (`Calm`, `Growth`, `Reflection`) rather than numeric combat stats.
- Cozy ambient feedback: subtle idle animation, glow, mood badge, or sanctuary aura; avoid combat language.
- Accessibility: text labels for trait icons, deterministic ordering, and no critical state conveyed only by color/glow.

### Avoid

- Multiple competing meters on the board HUD.
- Combat/PvP vocabulary such as attack/defense/DPS.
- UI-only calculations of reward amounts.
- Hardcoded pair bonuses hidden in components.

## 12. Risk analysis

### PASS

- Canonical Island Run architecture contract exists and is explicit.
- Creature catalog, rarity, habitat, affinity, and ship-zone metadata exist.
- Runtime creature collection and active companion fields exist.
- Supabase columns for creature collection, active companion, treat inventory, and companion visit marker exist.
- Perfect Companion recommendation engine exists and aligns with emotional/archetype direction.
- Passive dice regen service is pure and supports offline catch-up.
- Commit RPC supports optimistic versioning and action idempotency.

### RISK

- Sanctuary is split between substantial board-local implementation and future-feature/placeholder Score surfaces.
- Legacy localStorage creature/treat services remain callable and should not power future reward-bearing systems.
- Current active companion bonus resource deltas are applied in UI state after only the visit marker is committed.
- Hatchery collect flow still updates localStorage collection for UI while canonical terminal transition handles egg status.
- Dice regen contract/implementation mismatch should be resolved before adding creature regen.
- Fire-and-forget commits may be insufficient for future claim actions that need duplicate/conflict feedback.

### BLOCKER

Do not implement passive creature dice regen until these are resolved:

- Canonical state shape for creature regen/reserve is approved.
- Economy design chooses and documents one of the patterns defined in section 7, “RISK: Passive creature regen can inflate dice if it bypasses the existing dice-floor semantics”: floor raise, interval reduction, separate capped reserve, or claimable capped reserve.
- Runtime/Supabase schema constraints and hydration sanitizers are defined.
- Action service persists resource deltas and claim markers atomically.
- Duplicate/offline/cross-device claim idempotency is tested.
- UI components are read-only displays/intent emitters for gameplay state.

## 13. Suggested phased implementation roadmap

### Phase 0 — Architecture cleanup before new economy

- Reconcile dice regen contract vs implementation.
- Document companion bonus authority rules in the Island Run architecture contract.
- Identify and reduce localStorage creature collection reads/writes in reward-bearing paths.
- Move existing active companion startup bonus resource deltas into a canonical action service.

### Phase 1 — Metadata expansion without economy impact

- Add data-driven emotional tags/traits/archetype metadata to creature definitions or adjacent catalog config.
- Keep metadata display-only.
- Add sanctuary detail UI that reads canonical creature/trait/bond state.
- Add tests for metadata resolvers and no hardcoded pair logic.

### Phase 2 — Active companion slots and sanctuary UX

- Define active companion slot limits in service/config.
- Build a sanctuary shell/detail bottom sheet using canonical state.
- Use `applyActiveCompanion` or successor action for companion selection.
- Add Today and Island Run HUD read-only active companion chips.

### Phase 3 — Non-economy bond/mood progression

- Add bond/mood state transitions as canonical actions.
- Keep rewards cosmetic or explanatory first.
- Add telemetry for trait engagement, companion selection, and sanctuary visits.

### Phase 4 — Passive regen prototype behind guardrails

- Add a service-only passive creature regen resolver using capped floor/reserve semantics.
- Add runtime state and Supabase migration only after schema review.
- Add offline catch-up/idempotency tests before any UI claim surface.
- Show passive regen as a small companion reserve/countdown, not as a second full economy system.

### Phase 5 — Economy tuning and expansion

- Tune bonuses by profiles, not per-creature hardcoded amounts.
- Gate larger bonuses behind bond milestones and clear caps.
- Add pair resonance using tag intersections and profile IDs.
- Monitor telemetry for dice inflation, return-loop impact, and reserve hoarding.

## 14. Final recommendation

Proceed with a future Creature Emotional Companion + Dice Regen system only after an architecture-cleanup slice. The strongest safe path is: canonical metadata first, sanctuary UX second, bond/mood progression third, then passive regen as a capped service-authoritative extension of the existing dice regen architecture.

Do not build creature regen inside the current UI-level companion bonus effect. The economy-safe integration point is a dedicated Island Run action service that reads canonical runtime state, computes capped deltas in a pure resolver, commits through the existing store/RPC path with idempotency, and exposes only read-only status to the UI.
