# Creature Pack + Dice Regen Architecture Investigation

Status: investigation only. No gameplay, economy, Supabase, migration, UI, or service implementation changes are included in this report.

## 1. Summary recommendation

Owned creatures should not generate dice by default. Add a small, explicit **active Pack** of selected owned creature IDs, and let only those Pack creatures modify the existing passive dice regeneration service.

Recommended first implementation shape:

- Add one canonical Island Run runtime field: `activePackCreatureIds: string[]`.
- Cap Pack size in service/config, initially `3`.
- Require every Pack ID to be owned in `creatureCollection`.
- Do not let React components calculate dice awards or act as authority.
- Do not grant separate uncapped creature dice.
- Keep the existing dice floor semantics: passive regen only fills while `dicePool < diceRegenState.maxDice`.
- Make Pack creatures reduce the effective regen interval by a capped percentage, rather than adding dice above the passive floor.
- Run Pack regen through the same service-authoritative tick/offline catch-up path as existing dice regen.

This keeps the feature meaningful while limiting inflation: Pack creatures help players refill faster when below the passive floor, but they do not create a second unlimited dice faucet.

## 2. Current dice regen location

Current dice regen math lives in `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`.

Key functions:

- `resolveDiceRegenConfig(playerLevel)` chooses a level-band `maxDice` and `regenIntervalMinutes`.
- `applyDiceRegeneration(...)` grants one die per full elapsed interval.
- `resolveNextRollEtaMs(...)` and `resolveFullRefillEtaMs(...)` provide UI-safe ETA math.

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:19-47`
- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:74-145`
- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:147-188`

The runtime wrapper is `resolveRuntimeDiceRegenUpdate` in `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`. It delegates to `applyDiceRegeneration` and returns `null` when there is no meaningful state change to persist.

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts:17-62`

The canonical action entry point is `applyPassiveDiceRegenTick` in `src/features/gamification/level-worlds/services/islandRunStateActions.ts`. It reads `getIslandRunStateSnapshot`, computes the regen update, writes `dicePool` and `diceRegenState`, bumps `runtimeVersion`, and commits through `commitIslandRunState`.

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunStateActions.ts:641-674`

The board currently triggers this action on startup, interval, focus, visibility, and pre-roll paths. The UI is still the trigger, but the math and commit are in services.

Relevant code:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:1933-2019`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx:2953-2978`

## 3. Current offline catch-up behavior

Offline/background catch-up is already built into `applyDiceRegeneration`.

Current behavior:

1. Read `dicePool`, `diceRegenState.lastRegenAtMs`, player level, and `nowMs`.
2. Resolve level-band config.
3. If `dicePool >= maxDice`, grant nothing and move the regen anchor to `nowMs`.
4. Otherwise compute `fullTicks = floor(elapsedMs / intervalMs)`.
5. Grant `min(maxDice - dicePool, fullTicks)` dice.
6. Advance `lastRegenAtMs` by `diceAdded * intervalMs`.
7. Preserve overflow dice; reward dice above `maxDice` are not clamped.

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts:103-145`
- `src/features/gamification/level-worlds/services/__tests__/islandRunDiceRegeneration.test.ts:116-141`

The same elapsed-time model should be reused for Creature Pack regen. Do not create a daily streak grant or independent hourly batch faucet that can diverge from the canonical regen anchor.

## 4. Existing creature and Pack-related state

Runtime creature ownership already exists in `IslandRunGameStateRecord`.

Relevant fields:

- `creatureCollection: CreatureCollectionRuntimeEntry[]`
- `activeCompanionId: string | null`
- `perfectCompanionIds: string[]`
- `perfectCompanionReasons`
- `diceRegenState`

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:71-81`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:187-248`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:271-275`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts:591-650`

The current first-session creature pack action already shows the right authority pattern: it runs under `withIslandRunActionLock`, checks tutorial eligibility, updates `creatureCollection`, grants dice, advances tutorial state, and commits one runtime record.

Relevant code:

- `src/features/gamification/level-worlds/services/islandRunFirstSessionCreaturePackAction.ts:178-253`
- `src/features/gamification/level-worlds/services/__tests__/islandRunFirstSessionCreaturePackAction.test.ts:61-206`

That first-session reward is a one-time grant. It should not be confused with the future active Pack mechanic.

## 5. Pack slot representation

Represent Pack slots as selected creature IDs, not copied creature records.

Recommended canonical runtime field:

```ts
activePackCreatureIds: string[];
```

Semantics:

- Ordered array. Order is UI-relevant and stable.
- Max length controlled by service config, initially `3`.
- IDs must be unique.
- IDs must exist in `creatureCollection` with `copies > 0`.
- Empty array means no Pack and no creature regen contribution.
- This field is distinct from `activeCompanionId`; the active companion can be shown as a highlighted Pack member later, but it should not be overloaded as a multi-slot Pack.

Persistence recommendation:

- For production cross-device behavior, this field needs to persist with `IslandRunGameStateRecord`.
- Because the runtime row currently maps explicit top-level fields to `island_run_runtime_state` columns, implementation will likely require a Supabase migration for an `active_pack_creature_ids` JSON/text-array column, plus serializer, hydrator, sanitizer, conflict merge, and generated type updates.
- Do not add the migration until implementation starts and the state shape is approved.

Conflict merge recommendation:

- Prefer local explicit Pack selection when local `runtimeVersion` wins, but sanitize after merge.
- If both remote and local changed Pack selection concurrently, use the newer runtime record's ordered selection after filtering to owned IDs.
- Never union Pack arrays; union could silently exceed slot caps and let more creatures generate regen.

## 6. Where creature regen should be added safely

Do not add Pack regen in UI components.

Safe service path:

1. Add a pure Pack bonus resolver beside the dice regen service, for example:
   - `islandRunCreaturePackRegen.ts`
   - input: current `IslandRunGameStateRecord`, catalog, optional player archetype context
   - output: sanitized selected Pack, boost breakdown, capped effective boost
2. Extend `resolveRuntimeDiceRegenUpdate` or create a successor wrapper that passes Pack-derived modifiers into dice regen math.
3. Keep `applyPassiveDiceRegenTick` as the canonical commit action, or create a successor action if the result shape needs richer telemetry.
4. Add a separate Pack-selection action, for example `applyActiveCreaturePackSelection`, that:
   - runs under `withIslandRunActionLock`
   - reads canonical state
   - applies any pending regen using the old Pack before changing slots
   - validates/sanitizes requested IDs
   - commits `activePackCreatureIds` atomically

This keeps Pack changes and regen ticks service-authoritative and prevents swap-timing exploits.

## 7. Daily, hourly, or per regen tick?

Recommended: **per regen tick**.

Rationale:

- Current regen already works as elapsed interval ticks and has offline catch-up.
- Tick-based math naturally supports “next dice in MM:SS”.
- Daily grants would be a new economy faucet and would not feel like passive regen.
- Hourly grants are coarser and create awkward rounding/offline edge cases.
- Per-tick interval modification lets creatures contribute without adding dice above the existing cap.

The Pack should modify the effective interval/rate used by passive regen, not create an independent daily claim.

## 8. Recommended formula

Phase 1 formula should be conservative and cap-first.

Definitions:

- `baseConfig = resolveDiceRegenConfig(playerLevel)`
- `baseIntervalMs = baseConfig.regenIntervalMinutes * 60_000`
- `baseMaxDice = baseConfig.maxDice`
- `pack = sanitized activePackCreatureIds, max 3, owned only`
- `boostCap = 0.20`

Per Pack creature boost:

| Input | Recommendation |
|---|---:|
| Common rarity | `+0.01` |
| Rare rarity | `+0.02` |
| Mythic rarity | `+0.03` |
| Bond/level | `min(0.04, floor((bondLevel - 1) / 5) * 0.01)` |
| Archetype/fit match | `+0.02` for strong fit, `+0.01` for moderate fit, `+0` otherwise |

Pack synergy boost:

| Condition | Recommendation |
|---|---:|
| 2+ Pack creatures share a `shipZone` | `+0.01` |
| 3 Pack creatures cover all three zones (`zen`, `energy`, `cosmic`) | `+0.01` |
| Total synergy cap | `+0.02` |

Effective boost:

```text
rawBoost =
  sum(perCreatureRarityBoost + perCreatureBondBoost + perCreatureArchetypeBoost)
  + synergyBoost

effectiveBoost = min(rawBoost, 0.20)
effectiveIntervalMs = ceil(baseIntervalMs / (1 + effectiveBoost))
effectiveMaxDice = baseMaxDice
```

Grant rule:

```text
if dicePool >= effectiveMaxDice:
  diceAdded = 0
else:
  fullTicks = floor((nowMs - lastRegenAtMs) / effectiveIntervalMs)
  diceAdded = min(effectiveMaxDice - dicePool, fullTicks)
```

Important: `effectiveMaxDice` should remain equal to the base max in Phase 1. The Pack speeds refill but does not raise the passive floor. A later economy-approved phase could add a tiny floor increase or reserve, but that should be a separate review.

## 9. Rarity, level, bond, archetype match, and synergy

Rarity:

- Use rarity as a small boost only.
- Mythic should feel better but must not dominate the economy.
- Do not grant flat dice per mythic creature.

Level/bond:

- Current runtime entries have `bondLevel` and `bondXp`, not a separate creature level.
- Treat `bondLevel` as the progression input for Phase 1.
- If a future `creatureLevel` is introduced, it should become an input to the resolver, not a UI-only stat.

Archetype match:

- Existing `creatureFitEngine.ts` can score fit using dominant archetypes, secondary archetypes, weakness support, zone match, and rarity.
- Existing `creatureArchetypeBridge.ts` maps creature affinity to archetype IDs and weakness support tags.
- Use a derived fit band for Pack regen, not raw profile text in the dice service.

Relevant code:

- `src/features/gamification/level-worlds/services/creatureFitEngine.ts:8-43`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts:59-110`
- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts:11-88`

Synergy:

- Keep synergy data-driven and capped.
- Avoid pair-specific hardcoded bonuses such as “creature A + creature B = +10 dice”.
- Start with simple zone composition rules, then move to catalog tag intersections if content grows.

## 10. Caps that prevent dice inflation

Required caps:

1. **Pack size cap:** only first `N` validated IDs count; recommend `N = 3`.
2. **Owned-only cap:** unowned IDs are ignored/rejected.
3. **Unique-ID cap:** duplicates do not stack.
4. **Boost cap:** total Pack boost cannot exceed `20%`.
5. **Passive floor cap:** `effectiveMaxDice = baseMaxDice` in Phase 1.
6. **Overflow preservation:** reward dice above the floor remain, but passive regen halts while `dicePool >= maxDice`.
7. **Swap safety:** applying a new Pack must first settle pending regen under the old Pack or reset the anchor safely.
8. **No all-owned aggregation:** resolver must never iterate all owned creatures for reward value; it must iterate only sanitized Pack IDs.
9. **No daily/claim stacking:** do not add daily Pack dice on top of passive tick boost in Phase 1.

Optional later cap:

- If product wants visible creature-generated dice outside the base floor, use a separate tiny claimable reserve, e.g. max `3-5` dice, with its own anchor and claim action. Do not mix this into Phase 1.

## 11. Needed services/actions

Recommended future services:

- `islandRunCreaturePackConfig.ts`
  - Pack slot cap, boost caps, rarity boost table, synergy caps.
- `islandRunCreaturePackSelection.ts`
  - sanitize requested Pack IDs against `creatureCollection`.
  - enforce unique IDs and max slot count.
- `islandRunCreaturePackRegen.ts`
  - pure resolver for Pack boost and readable breakdown.
  - accepts canonical state and catalog/config only.
- `islandRunRuntimeRegen.ts` successor or extension
  - combines base dice regen config with Pack modifier.
  - preserves offline catch-up semantics.

Recommended future actions:

- `applyActiveCreaturePackSelection`
  - mutex-protected.
  - applies pending regen before changing Pack.
  - commits `activePackCreatureIds`.
  - returns sanitized selection and rejected IDs/reasons.
- `applyPassiveDiceRegenTick` extension
  - uses Pack resolver internally.
  - persists `dicePool`, `diceRegenState`, and any future Pack regen anchor atomically.
- Optional later `claimCreatureRegenReserve`
  - only if a separate reserve model is approved.
  - must be idempotent and capped.

UI responsibilities:

- Read canonical state via `useIslandRunState`.
- Display Pack slots and regen breakdown.
- Emit selection intents to action services.
- Never compute or persist dice rewards.

## 12. Tests and guards required

Unit tests:

- Pack selection sanitizer:
  - rejects unowned IDs.
  - removes duplicates.
  - caps at max slots.
  - preserves order.
- Pack regen resolver:
  - empty Pack equals base regen.
  - owned non-Pack creatures do not affect boost.
  - rarity/bond/archetype/synergy produce expected boost.
  - boost cap clamps high-value Packs.
- Dice regen integration:
  - offline catch-up uses effective interval.
  - no regen at or above cap.
  - overflow dice are preserved.
  - Pack swap settles old-Pack elapsed time safely.
  - clock rollback grants no extra dice.
- Action tests:
  - Pack selection commits one runtime update.
  - repeated identical Pack selection is a no-op.
  - invalid IDs do not commit reward changes.
  - cross-device merge does not union Pack arrays beyond cap.

Architecture guards:

- Extend `check-island-run-architecture-guards` if needed to reject:
  - UI imports of Pack regen math for reward mutation.
  - direct UI writes to `activePackCreatureIds`.
  - new localStorage creature Pack authority.
  - iteration over `creatureCollection` for passive dice grants except inside approved Pack resolver.

Regression commands:

- `npm run test:island-run`
- `npm run check:island-run-architecture-guards`
- `npm run build`

## 13. Phased implementation plan

### Phase 0 — Decision and contract update

- Decide that Pack regen modifies interval only, not max dice or a separate reserve.
- Update gameplay/architecture docs to state only active Pack creatures can affect passive regen.
- Confirm Pack size and boost caps.

### Phase 1 — State shape and migration plan

- Add `activePackCreatureIds` to `IslandRunGameStateRecord`.
- Add sanitizer/default/remote mapping/conflict merge rules.
- Add Supabase migration only when implementation begins, because persistent Pack selection is required for cross-device production behavior.

### Phase 2 — Pure services

- Add Pack selection sanitizer.
- Add Pack regen resolver and formula tests.
- Add integration path to dice regen without UI wiring.

### Phase 3 — Canonical actions

- Add `applyActiveCreaturePackSelection`.
- Extend `applyPassiveDiceRegenTick` to use Pack modifiers.
- Add idempotency, conflict, offline, and swap tests.

### Phase 4 — Read-only UI

- Add Pack slots to Sanctuary/Score Hub or Island Run surfaces as read-only canonical state plus intent buttons.
- Display a small “Pack regen boost” explanation.
- Keep UI as an intent emitter only.

### Phase 5 — Economy review and expansion

- Monitor dice source telemetry.
- Consider a tiny claimable reserve only if interval-only boost is too invisible.
- Add richer catalog tags/synergy only after the capped base system is stable.

## 14. Risk list

- **Dice inflation:** uncapped per-creature grants or all-owned aggregation would create a large passive faucet.
- **Split authority:** calculating dice in UI components would violate Island Run architecture rules.
- **LocalStorage authority regression:** legacy creature services must not become Pack/dice authority.
- **Pack swap exploit:** players could wait offline then switch to the strongest Pack before catch-up unless selection applies pending regen or resets anchors.
- **Cross-device merge risk:** unioning Pack arrays could exceed slot caps.
- **Contract mismatch:** current gameplay contract describes a logarithmic regen floor, while implementation uses level bands; resolve before tuning large bonuses.
- **Telemetry ambiguity:** without source attribution, base regen and Pack regen inflation would be hard to debug.
- **Early-game imbalance:** first-session creature pack already grants +100 dice, so early Pack regen must be small and capped.
- **Archetype privacy/design drift:** archetype matching should use stable derived IDs, not raw sensitive profile text in economy math.

## 15. Direct answers

- **Where is current dice regen calculated?** `islandRunDiceRegeneration.ts`, wrapped by `islandRunRuntimeRegen.ts`, committed by `applyPassiveDiceRegenTick`.
- **How does offline catch-up work?** It calculates full elapsed intervals since `lastRegenAtMs`, grants at most the deficit to `maxDice`, and advances the anchor by granted intervals.
- **Where should creature regen be added safely?** In pure services and canonical Island Run actions, not UI components.
- **Daily, hourly, or per regen tick?** Per regen tick.
- **How should Pack slots be represented?** Ordered `activePackCreatureIds: string[]`, owned-only, unique, service-capped.
- **What canonical state field is needed?** `activePackCreatureIds`.
- **How should caps prevent dice inflation?** Cap Pack size, boost percentage, owned IDs, duplicate IDs, and keep Phase 1 refill under the existing passive floor.
- **How should rarity/level/bond/archetype/synergy affect regen?** Small additive boost percentages that reduce interval, capped globally; no flat dice grants.
- **What services/actions are needed?** Pack config, Pack selection sanitizer/action, Pack regen resolver, dice regen integration, optional later reserve claim action.
- **What tests/guards are required?** Resolver/action/offline/cap/swap/merge tests plus architecture guards against UI/localStorage authority and all-owned aggregation.
