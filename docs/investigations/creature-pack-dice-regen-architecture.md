# Paired Creature + Dice Regen Architecture Investigation

Status: investigation only. No gameplay, economy, Supabase, migration, UI, Market, or Stripe implementation changes are included in this report.

## 1. Corrected terminology

- **Paired Creature / Active Companion** means one selected creature, stored through the existing `activeCompanionId` path.
- **Creature Card Pack / Creature Pack** means a bundle of creature cards that can be opened, earned, bought, or granted.
- A Creature Pack is not an active selected team, does not imply multiple active slots, and should not be modeled as selected Pack members.

## 2. Summary recommendation

Future creature-related roll regeneration should be based on the existing Active Companion model, not on a new active Pack/team model.

Recommended future shape:

- Keep `activeCompanionId: string | null` as the selected creature source.
- Require the Active Companion to be owned in `creatureCollection`.
- Use archetype/personality fit and creature metadata as inputs when the regen design is approved.
- Do not add `activePackCreatureIds`.
- Do not add Pack slots, active Pack selection, or a multi-creature active team.
- Keep Creature Pack terminology only for card bundles, such as onboarding rewards, pack-opening prototypes, purchase concepts, and admin/dev pack grants.

This keeps the product model clear: Pack opening adds creature cards to the collection; pairing chooses one companion from the collection.

## 3. Current dice regen location

Current dice regen math lives in `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`.

Key functions:

- `resolveDiceRegenConfig(playerLevel)` chooses a level-band `maxDice` and `regenIntervalMinutes`.
- `applyDiceRegeneration(...)` grants one die per full elapsed interval.
- `resolveNextRollEtaMs(...)` and `resolveFullRefillEtaMs(...)` provide UI-safe ETA math.

The runtime wrapper is `resolveRuntimeDiceRegenUpdate` in `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`. The canonical action entry point is `applyPassiveDiceRegenTick` in `src/features/gamification/level-worlds/services/islandRunStateActions.ts`.

Future companion regen work should reuse this service-authoritative tick/offline catch-up path. React components may request a tick, but services must decide whether anything is grantable and persist gameplay changes.

## 4. Current creature and companion state

Runtime creature ownership and companion state already exist in `IslandRunGameStateRecord`.

Relevant fields:

- `creatureCollection: CreatureCollectionRuntimeEntry[]`
- `activeCompanionId: string | null`
- `perfectCompanionIds: string[]`
- `perfectCompanionReasons`
- `diceRegenState`

The current first-session creature pack action is still correctly named because it opens/grants a card bundle. It runs under `withIslandRunActionLock`, checks tutorial eligibility, updates `creatureCollection`, grants dice, advances tutorial state, and commits one runtime record.

## 5. Active Companion representation

Represent the paired creature with the existing companion field:

```ts
activeCompanionId: string | null;
```

Semantics:

- Exactly one selected creature, or `null`.
- The selected ID must exist in `creatureCollection` with `copies > 0`.
- The field can be used later as the source for approved roll-regeneration boosts.
- Empty/null means no paired creature boost.
- This field must not be overloaded with Pack/card-bundle inventory semantics.

Persistence recommendation:

- Continue using the existing runtime/Supabase `active_companion_id` mapping.
- No migration is required for this corrected model.
- Do not add a new selected-Pack field.

## 6. Where future companion regen should be added safely

Do not add companion regen in UI components.

Safe future service path:

1. Add a pure companion boost resolver beside the dice regen service.
2. Input the current `IslandRunGameStateRecord`, catalog metadata, and approved archetype/personality fit context.
3. Sanitize `activeCompanionId` against owned creatures.
4. Extend `resolveRuntimeDiceRegenUpdate` or create a successor wrapper that passes companion-derived modifiers into dice regen math.
5. Keep `applyPassiveDiceRegenTick` as the canonical commit action, or create a successor action if the result shape needs richer telemetry.

This keeps companion effects service-authoritative and avoids split gameplay authority.

## 7. Recommended future formula direction

Any future companion boost should be conservative and cap-first.

Recommended constraints:

- The Active Companion modifies passive regen interval/rate only.
- It does not grant flat dice.
- It does not raise the passive refill floor in the first implementation.
- It does not create daily/hourly claim stacking.
- Archetype/personality matching may improve the boost after the privacy/design model is approved.

## 8. Tests and guards required for any future implementation

Unit tests:

- Active Companion sanitizer:
  - rejects unowned IDs.
  - handles `null` as no boost.
  - preserves valid `activeCompanionId`.
- Companion boost resolver:
  - no Active Companion equals base regen.
  - owned non-active creatures do not affect boost.
  - rarity/bond/archetype fit produce capped expected boost.
- Dice regen integration:
  - offline catch-up uses the effective interval.
  - no regen at or above cap.
  - overflow dice are preserved.
  - clock rollback grants no extra dice.

Architecture guards:

- Do not let UI components compute or persist dice rewards.
- Do not introduce `activePackCreatureIds` or localStorage authority for active selection.
- Do not iterate all owned creatures for passive dice grants.

Regression commands:

- `npm run test:island-run`
- `npm run check:island-run-architecture-guards`
- `npm run build`

## 9. Remaining valid Creature Pack references

Pack terminology remains correct for bundle/card-pack concepts:

- First-session Creature Pack onboarding reward.
- Creature Pack opening prototype UI.
- Future fixed Creature Card Pack product investigations.
- Admin/dev grant tooling that grants creature/card/egg packs for test/support workflows.

Those references should not be renamed to Active Companion because they are about opening or granting bundles, not selecting a paired creature.

## 10. Direct answers

- **Where is current dice regen calculated?** `islandRunDiceRegeneration.ts`, wrapped by `islandRunRuntimeRegen.ts`, committed by `applyPassiveDiceRegenTick`.
- **How does offline catch-up work?** It calculates full elapsed intervals since `lastRegenAtMs`, grants at most the deficit to `maxDice`, and advances the anchor by granted intervals.
- **Where should creature regen be added safely?** In pure services and canonical Island Run actions, not UI components.
- **Daily, hourly, or per regen tick?** Per regen tick if the future design is approved.
- **How should the active selected creature be represented?** Existing `activeCompanionId`.
- **What new Pack state field is needed?** None; do not add `activePackCreatureIds`.
- **How should caps prevent dice inflation?** Use one Active Companion, cap the boost percentage, require owned creatures, and keep the first implementation under the existing passive floor.
- **How should rarity/bond/archetype match affect regen?** Small capped interval modifiers only, with archetype/personality match derived from approved metadata.
