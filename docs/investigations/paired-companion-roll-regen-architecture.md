# Paired Companion Roll Regeneration Architecture Investigation

Date: 2026-05-20  
Status: Investigation only — no gameplay/economy changes, migrations, Stripe/Market changes, or implementation included.

## Executive recommendation

Use the existing one-creature pairing source, `activeCompanionId`, as the only future Paired Creature input for roll regeneration. Do not add `activePackCreatureIds` or any multi-creature active pack/team state.

The safest Phase 1 is a service-authoritative, capped passive regen speed modifier:

- no UI-authoritative math;
- no direct gameplay writes from React components;
- no max-roll/floor increase in Phase 1;
- no flat daily dice grant in Phase 1;
- no bonus unless `activeCompanionId` points to an owned creature;
- no archetype/personality match bonus unless the latest personality questionnaire is complete and has a usable archetype hand;
- hard cap the effective companion speed boost to **10% in Phase 1**, with an absolute future design ceiling of **15%** unless economy is rebalanced.

Recommended Phase 1 output shape:

```text
effectiveRegenIntervalMs = baseRegenIntervalMs * (1 - min(companionBoostPct, 0.10))
```

The boost should affect elapsed-interval catch-up math only. It should not increase wallet cap/floor, grant passive dice above the floor, or create a separate claimable reward before a later economy review.

## Files inspected

Architecture and contracts:

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `docs/investigations/creature-pack-dice-regen-architecture.md`
- `docs/investigations/creature-sanctuary-companion-regen-investigation.md`

Roll/dice regeneration:

- `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/__tests__/islandRunDiceRegeneration.test.ts`

Creature/companion state:

- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunStateStore.ts`
- `src/features/gamification/level-worlds/services/creatureCollectionService.ts`
- `src/features/gamification/level-worlds/services/creatureCatalog.ts`
- `src/features/gamification/level-worlds/services/creatureSanctuaryAdapter.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
- `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx`

Archetype/personality:

- `src/features/identity/PersonalityTest.tsx`
- `src/features/identity/personalityTestData.ts`
- `src/features/identity/archetypes/archetypeHandBuilder.ts`
- `src/features/gamification/level-worlds/services/creatureArchetypeBridge.ts`
- `src/features/gamification/level-worlds/services/creatureFitEngine.ts`
- `src/features/gamification/level-worlds/services/perfectCompanionConfig.ts`
- `src/data/personalityTestRepo.ts`
- `src/data/localDb.ts`
- `src/services/personalityTest.ts`
- `src/App.tsx`

## 1. Where current roll/dice regeneration is calculated

Roll spending and passive regeneration are separate.

### Roll spending

`src/features/gamification/level-worlds/services/islandRunRollAction.ts` is the authoritative roll execution service. It reads current Island Run state, validates `dicePool >= diceCost`, deducts `DICE_PER_ROLL * diceMultiplier`, moves the token, and writes the updated game state.

Important current semantics:

- `DICE_PER_ROLL` is `1`.
- The multiplier scales cost and rewards, not movement distance.
- The service is serialized through the shared Island Run action mutex.

### Passive dice regeneration

The pure regen math is in `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`.

Key functions:

- `resolveDiceRegenConfig(playerLevel)` selects a level band with `maxDice` and `regenIntervalMinutes`.
- `applyDiceRegeneration(...)` applies elapsed interval catch-up.
- `resolveNextRollEtaMs(...)` and `resolveFullRefillEtaMs(...)` drive countdown UI.

Runtime integration:

- `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts` wraps the pure math in `resolveRuntimeDiceRegenUpdate(...)`.
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts` exposes `applyPassiveDiceRegenTick(...)`, which reads canonical state, computes regen, and commits `dicePool` / `diceRegenState`.
- `IslandRunBoardPrototype.tsx` uses the ETA helper for display, but should not own future bonus math.

## 2. What “max rolls / floor / regen interval” currently means

Current implementation uses `DiceRegenConfig`:

```text
{ maxDice, regenIntervalMinutes }
```

Despite the `maxDice` name, this is best understood as a **passive regeneration floor / refill target**, not a hard wallet cap:

- Passive regen only runs while `dicePool < maxDice`.
- It grants `+1` die per full interval.
- It stops once the pool reaches `maxDice`.
- Rewards, purchases, and other explicit grants may exceed `maxDice`.
- Overflow is preserved; regen does not clamp the wallet down.

Current level bands in code:

| Minimum player level | Passive floor (`maxDice`) | Interval |
| ---: | ---: | ---: |
| 1 | 30 | 8 min |
| 5 | 50 | 10 min |
| 10 | 75 | 10 min |
| 20 | 100 | 10 min |
| 40 | 125 | 9 min |
| 75 | 150 | 8 min |
| 125 | 200 | 7 min |

Important note: `CANONICAL_GAMEPLAY_CONTRACT.md` describes a continuous logarithmic minimum-roll formula and a 2-hour full refill concept, while implementation currently uses discrete level bands and fixed intervals. Before changing the economy, product/design should explicitly reconcile contract vs implementation.

## 3. How offline catch-up works

`applyDiceRegeneration(...)` stores an anchor in `diceRegenState.lastRegenAtMs`.

Catch-up flow:

1. Sanitize current pool, level, and `nowMs`.
2. Resolve current level-band floor and interval.
3. If no regen state exists, initialize it without granting dice.
4. If `dicePool >= maxDice`, grant nothing and update the regen shape/anchor.
5. Otherwise compute:
   - `elapsedMs = nowMs - lastRegenAtMs`
   - `fullTicks = floor(elapsedMs / intervalMs)`
   - `deficit = maxDice - dicePool`
   - `diceAdded = min(deficit, fullTicks)`
6. Advance the anchor by granted intervals:
   - `nextLastRegenAtMs = lastRegenAtMs + diceAdded * intervalMs`

This means offline/background time grants exactly one die per elapsed full interval, capped by the remaining deficit to the passive floor.

## 4. How `activeCompanionId` should be read safely

Future regen should read companion state from the canonical Island Run record, not from UI local state and not from the legacy localStorage helper.

Safe read requirements:

1. Read the current `IslandRunGameStateRecord` inside a canonical service/action path.
2. Use `record.activeCompanionId ?? null`.
3. Treat `null`, empty, malformed, or unknown IDs as no boost.
4. Verify the ID exists in `record.creatureCollection` with `copies > 0`.
5. Resolve static creature metadata from `CREATURE_CATALOG` / `getCreatureById`.
6. Use the owned runtime entry’s `bondLevel` / `bondXp`.
7. Do not trust `fetchActiveCompanionId(...)` for reward-bearing logic because that helper reads legacy localStorage.

Recommended helper responsibility:

```text
resolveActiveCompanionForRegen(record, catalog) -> null | {
  creature,
  collectionEntry,
  activeCompanionId
}
```

It should be pure, deterministic, and test-covered.

## 5. Recommended companion bonus formula

### Inputs

Use only data that already exists, with optional future inputs ignored until they exist canonically:

- creature rarity/tier: `common | rare | mythic`;
- bond level: `CreatureCollectionRuntimeEntry.bondLevel`;
- creature level: not currently available as a separate field, so Phase 1 should treat it as absent and contribute `0`;
- archetype/personality match: derived from a complete latest personality result / archetype hand, not starter fallback metadata;
- questionnaire completeness: latest answer set must include every ID from `PERSONALITY_QUESTION_BANK` and have a valid `archetype_hand`.

### Phase 1 formula

Recommended uncapped boost:

```text
rarityPct:
  common = 0.02
  rare   = 0.03
  mythic = 0.04

bondPct:
  min(0.03, floor((bondLevel - 1) / 5) * 0.01)

creatureLevelPct:
  0.00 in Phase 1 because no separate canonical creature level exists

matchPct:
  0.00 if questionnaire/archetype hand is incomplete
  0.02 if creature affinity matches dominant archetype
  0.015 if it matches secondary archetype
  0.01 if it matches a support archetype
  0.005 if it only matches a weakness support tag

rawBoostPct = rarityPct + bondPct + creatureLevelPct + matchPct
companionBoostPct = min(rawBoostPct, 0.10)
```

Apply:

```text
effectiveIntervalMs = baseIntervalMs * (1 - companionBoostPct)
```

### Recommended cap

- **Phase 1 hard cap:** 10% interval reduction.
- **Future absolute cap without economy rebalance:** 15% interval reduction.
- **No boost before questionnaire completion beyond rarity/bond?** Recommended stricter answer: no match boost before completion; product can decide whether rarity/bond alone is allowed. To prevent early unintended acceleration, Phase 1 should either:
  - require complete questionnaire for any boost, or
  - allow only a tiny owned-companion baseline capped at 2%.

The safest economy answer is **0% until questionnaire completion** if the feature is positioned as personality-paired regeneration.

## 6. Where archetype/personality completion lives

Question definitions live in:

- `src/features/identity/personalityTestData.ts`
  - `PERSONALITY_QUESTION_BANK`
  - `AnswerValue`

Quiz completion UI flow lives in:

- `src/features/identity/PersonalityTest.tsx`
  - `answers` state is keyed by question ID.
  - Next button is disabled until the current question is answered.
  - Reaching the final question and pressing “View results” sets `step = 'results'`.
  - Results are saved via `queuePersonalityTestResult(...)`.

Persistence:

- `src/data/personalityTestRepo.ts` stores local records with `answers`, `scores`, and optional `archetype_hand`.
- `src/data/localDb.ts` stores them in IndexedDB `personality_tests`.
- `src/services/personalityTest.ts` syncs to/from Supabase `personality_tests`, including `archetype_hand`.
- `src/App.tsx` loads profile/personality history and computes `archetypeHand` for app-level surfaces.

Current caveat:

- `IslandRunBoardPrototype.tsx` currently extracts `archetype_hand` from `session.user.user_metadata` for Perfect Companion starter/fallback behavior. That is not sufficient authority for economy-bearing regen.

Recommended completion predicate:

```text
isQuestionnaireComplete(record):
  answers has every PERSONALITY_QUESTION_BANK id
  every answer is 1..5
  archetype_hand has dominant, secondary, two supports, and shadow
```

## 7. Preventing large boosts before archetype questions are complete

Guard in the service, not the UI:

- Do not use starter fallback archetypes for regen.
- Do not use `session.user.user_metadata` as economy authority.
- Do not grant match bonuses unless the latest personality record is complete.
- Treat partial, missing, stale, malformed, or unsynced questionnaire state as “no match boost.”
- Consider requiring the questionnaire completion gate for the entire companion regen boost in Phase 1.
- Add telemetry/debug reason codes such as `no_active_companion`, `unowned_companion`, `missing_personality_completion`, `boost_capped`.

## 8. What the companion bonus should increase

Recommended Phase 1: **regen speed only**.

| Option | Recommendation | Reason |
| --- | --- | --- |
| Max roll cap / passive floor | No in Phase 1 | Raising the refill target increases total free dice and changes scarcity more than a speed modifier. |
| Regen speed | Yes | Conservative, easy to cap, compatible with existing elapsed-interval catch-up. |
| Passive roll floor | No in Phase 1 | Same risk as max cap/floor increase. |
| Daily bonus | No | Adds claim/idempotency/day-boundary complexity and resembles a flat grant. |
| Separate bonus pool | Not Phase 1 | Safer long-term for design flexibility, but requires new state and likely migration/idempotency design. |

## 9. Existing “Set as Companion” flow after hatching/opening

### Where it is implemented

The post-hatch reveal button is in:

- `src/features/gamification/level-worlds/components/CreatureHatchRevealModal.tsx`
  - prop: `onSetCompanion`
  - button copy: “Set as Companion”

The modal is rendered by:

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - `onSetCompanion={() => { sanctuaryHandlers.setActiveCompanion(hatchReveal.creatureId); setHatchReveal(null); }}`

The general Sanctuary “Set as Companion” button also calls:

- `sanctuaryHandlers.setActiveCompanion(selectedSanctuaryCreature.creatureId)`

The dev/prototype multi-card pack opening modal:

- `src/features/gamification/level-worlds/components/CreaturePackOpeningPrototypeModal.tsx`
  - does not expose a Set as Companion button in the inspected file.

### Whether it writes to `activeCompanionId`

Yes, but indirectly and with split authority:

1. `sanctuaryHandlers.setActiveCompanion(...)` immediately updates React local state:
   - `setActiveCompanionId(creatureId)`
2. It also writes legacy localStorage:
   - `saveActiveCompanionId(session.user.id, creatureId)`
3. A later `useEffect` compares local `activeCompanionId` to `runtimeState.activeCompanionId` and calls:
   - `applyActiveCompanion({ activeCompanionId, triggerSource: 'sync_active_companion_effect' })`
4. `applyActiveCompanion(...)` commits `activeCompanionId` through the canonical store path.

So the flow does eventually persist to runtime `activeCompanionId`, but the initial click path still uses a local mirror and legacy localStorage helper.

### Whether it uses canonical services or legacy/localStorage helper services

It uses both:

- Canonical service exists and is used by a sync effect:
  - `applyActiveCompanion(...)` in `islandRunStateActions.ts`
- Legacy helper is still called directly from UI:
  - `saveActiveCompanionId(...)` in `creatureCollectionService.ts`
  - `fetchActiveCompanionId(...)` during initial local state setup/fallback

This is migration-era split authority. It is acceptable as existing legacy behavior, but future regen must not rely on the localStorage helper.

### Whether it is safe as the Paired Creature source for future regen

`activeCompanionId` itself is the right source, but only after reading it from canonical runtime state and validating ownership.

The current UI flow is not clean enough to be used as-is for reward-bearing regen because:

- local state can temporarily differ from runtime state;
- localStorage companion ID can differ from runtime `activeCompanionId`;
- the cleanup effect clears localStorage when a creature is not owned locally, but reward logic should validate against runtime `creatureCollection`;
- the button handler does not directly commit through `applyActiveCompanion`.

Future regen should use only canonical `record.activeCompanionId` and `record.creatureCollection`.

### Cleanup needed before regen reads `activeCompanionId`

Recommended cleanup before implementation:

1. Change Set as Companion handlers to call `applyActiveCompanion(...)` directly from an action/service path, then update UI from canonical state.
2. Stop calling `saveActiveCompanionId(...)` for reward-bearing active selection.
3. Keep `fetchActiveCompanionId(...)` only as a one-time migration/fallback read if needed, never as authority.
4. Add a service sanitizer that clears or ignores unowned `activeCompanionId`.
5. Prefer canonical `useIslandRunState`/store-derived state for Sanctuary active markers.
6. Add tests around `applyActiveCompanion` rejecting or ignoring unowned IDs before regen consumes it, or put the ownership guard in the regen resolver.

## 10. Tests and guards needed

### Pure unit tests

Add tests for a future companion regen resolver:

- `null` active companion gives base interval.
- unowned `activeCompanionId` gives base interval.
- unknown catalog ID gives base interval.
- owned common/rare/mythic companion produces expected rarity boost.
- bond level scales in small capped steps.
- missing creature level contributes `0`.
- incomplete questionnaire gives no match boost.
- complete questionnaire with dominant/secondary/support affinity match produces expected match boost.
- total boost never exceeds 10% in Phase 1.

### Regen integration tests

Extend dice regen tests:

- offline catch-up uses effective interval.
- no regen at or above passive floor.
- overflow dice are preserved.
- clock rollback grants no dice.
- ETA helpers use the same effective interval as tick math.

### Action/store tests

Extend Island Run action tests:

- `applyPassiveDiceRegenTick` remains the single commit path for passive dice updates.
- companion boost reads canonical state only.
- invalid active companion does not write extra dice.
- active companion changes do not trigger dice grants by themselves.

### Architecture guards

- No React component computes or persists companion regen.
- No `persistIslandRunRuntimeStatePatch` calls for new regen fields.
- No direct localStorage helper reads for reward-bearing companion state.
- No `activePackCreatureIds`.
- No Stripe/Market coupling.
- No migration in Phase 1 unless a later separate bonus pool is chosen.

Suggested validation commands when implementation happens:

- `npm run test:island-run`
- `npm run check:island-run-architecture-guards`
- `npm run build`

## 11. Safest Phase 1 implementation plan

No implementation in this investigation. Recommended future sequence:

1. Reconcile the gameplay contract vs current banded dice regen implementation.
2. Clean up active companion selection so canonical `activeCompanionId` is the direct action result, not a localStorage-first mirror.
3. Add a pure `resolveActiveCompanionForRegen(...)` sanitizer.
4. Add a pure `resolveCompanionRegenBoost(...)` with a Phase 1 10% cap.
5. Add completion gating from latest personality test history; malformed/incomplete data returns no match boost.
6. Integrate effective interval into `applyDiceRegeneration(...)` or a successor wrapper without changing wallet/floor semantics.
7. Keep `applyPassiveDiceRegenTick(...)` as the single commit path.
8. Add tests before enabling the boost.
9. Hide behind a feature flag or config defaulting off.
10. Roll out with telemetry reason codes and compare base vs effective interval.

## Risk list

- **Economy inflation:** even small interval reductions compound over offline catch-up.
- **Contract mismatch:** docs describe a continuous formula while code uses level bands.
- **Split authority:** current Set as Companion UI still writes legacy localStorage before canonical sync.
- **Unowned companion IDs:** stale IDs could grant boosts unless sanitized.
- **Starter archetype fallback abuse:** current Perfect Companion fallback behavior should not drive economy boosts.
- **Privacy/consent expectations:** personality-derived boosts should be transparent and based on user-completed data.
- **Clock manipulation:** existing elapsed-time math must continue to clamp negative elapsed time and cap by deficit.
- **UI drift:** countdown ETA and tick math must share the same effective interval.
- **Monetization tension:** raising passive floor or adding daily dice grants could undercut dice pack scarcity.
- **Migration creep:** separate bonus pools or persisted bonus state should be deferred until explicitly designed.

