# Island Run max multiplier button state investigation

## Goal

Add a special visual state to the Island Run multiplier button when the currently selected multiplier is the highest available multiplier. This should only be a UX signal so the player knows they have reached the max multiplier while cycling through options.

This investigation does not recommend changing multiplier math, dice spending, rewards, gameplay authority, persistence, or roll logic.

## Files inspected

- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  - Lines ~1594-1608: local multiplier state, available tier derivation, effective multiplier, effective dice cost, and auto-clamp.
  - Lines ~4673-4678: `effectiveMultiplier` passed into the roll action.
  - Lines ~8449-8465: footer multiplier button render, cycling handler, button title, visible label, and cost sublabel.
- `src/features/gamification/level-worlds/LevelWorlds.css`
  - Lines ~856-866: base `.island-run-prototype__footer-multiplier-btn` styles.
  - Lines ~868-874: active `.island-run-prototype__footer-multiplier-btn--active` styles.
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
  - Lines ~158-188: canonical roll action accepts `diceMultiplier`, computes dice cost, and blocks insufficient dice.
- `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
  - Lines ~188-198: canonical `MULTIPLIER_TIERS` ladder.
  - Lines ~216-222: `resolveAvailableMultiplierTiers(dicePool)`.
  - Lines ~229-245: `resolveMaxMultiplierForPool(dicePool, eventBoostMax?)`.
  - Lines ~251-283: dice cost and clamp helpers.
- `src/features/gamification/level-worlds/services/__tests__/islandRunContractV2RewardBar.test.ts`
  - Lines ~319-412: coverage for tier availability, max multiplier, dice cost, and clamping.
- `src/features/gamification/level-worlds/services/__tests__/islandRunRollAction.test.ts`
  - Lines ~73-105: coverage for multiplier-scaled roll cost and insufficient-dice behavior.

## Current multiplier flow

The multiplier button is rendered in `IslandRunBoardPrototype.tsx` inside the footer dice group. The visible label is `×{effectiveMultiplier}`. When the multiplier is above ×1, the button also renders a cost sublabel using `.island-run-prototype__footer-nav-btn-cost`, for example `(-5)`. The button title already exposes both the current roll cost and the max unlocked multiplier.

The current selected multiplier is local React UI state:

- `diceMultiplier` is initialized with `useState(1)`.
- `setDiceMultiplier` is called by the multiplier button when cycling.

The effective multiplier is derived from local selection plus the current dice pool:

- `multiplierTiers = resolveAvailableMultiplierTiers(dicePool)`.
- `effectiveMultiplier = clampMultiplierToPool(diceMultiplier, dicePool)`.
- `effectiveDiceCost = resolveDiceCostForMultiplier(effectiveMultiplier)`.

Available multiplier tiers are resolved in `islandRunContractV2RewardBar.ts` from the canonical `MULTIPLIER_TIERS` ladder. Each tier has a `multiplier` and `minDice`; `resolveAvailableMultiplierTiers(dicePool)` returns the full tier list with an `unlocked` flag.

Cycling works by filtering unlocked tiers in the button click handler, finding the index of `effectiveMultiplier`, and advancing to the next unlocked tier with wraparound. If only one tier is unlocked, the click exits without changing state.

The max available multiplier can be derived safely from existing data because the button already computes the unlocked tier list and uses its last unlocked multiplier in the title. The implementation can either reuse that same filtered list or call the existing helper `resolveMaxMultiplierForPool(dicePool)`. Reusing the already-derived unlocked tier list keeps the change local to the UI presentation and avoids touching gameplay services.

## Recommended implementation

Use the smallest visual-only implementation path:

1. Derive a boolean in `IslandRunBoardPrototype.tsx`, near the existing multiplier derivations:
   - `isAtMaxAvailableMultiplier`
   - Compare `effectiveMultiplier` against the highest unlocked multiplier from `multiplierTiers`.
   - Prefer gating the visual state with `maxAvailableMultiplier > 1` so baseline ×1 does not look special when no higher tier is available.
2. Add only a presentation hook to the existing multiplier button:
   - `data-max-multiplier="true"`, or
   - an additive class such as `island-run-prototype__footer-multiplier-btn--max` or `is-max-multiplier`.
3. Style only that button state in `LevelWorlds.css`.
4. Leave the existing normal and active multiplier colors unchanged unless the max-state class is present.
5. Do not change:
   - multiplier tier math,
   - dice cost logic,
   - roll action behavior,
   - reward or economy logic,
   - persistence,
   - runtime state shape,
   - gameplay state authority.

## Suggested visual treatment

A safe visual treatment would be additive and limited to the existing multiplier button:

- Gold or premium border when selected multiplier equals the highest unlocked multiplier.
- Slight gold glow or stronger focus ring.
- Optional small `MAX` micro-label inside the button.
- Keep all normal multiplier states unchanged.
- Keep the existing active state for non-max multipliers unchanged.

The visual state should not imply a new reward tier or gameplay bonus. It should only tell the player they have cycled to the current highest available multiplier.

## Tests

Existing service tests already cover the gameplay-relevant multiplier behavior:

- `islandRunContractV2RewardBar.test.ts`
  - Multiplier tier resolution.
  - Progressive unlocking by dice pool.
  - Max multiplier resolution.
  - Dice cost scaling.
  - Clamping when the dice pool drops.
- `islandRunRollAction.test.ts`
  - Roll cost scaling by multiplier.
  - Insufficient-dice blocking.
  - Roll persistence behavior through the canonical roll action.

I did not find an existing React component test for rendering the Island Run footer multiplier button. Because the proposed change is presentation-only, broad UI test infrastructure should not be added solely for this feature.

If there is an obvious existing source/guard-style test location in a future implementation PR, a small test could assert that the multiplier button has a max-state class or data attribute when `effectiveMultiplier` equals the highest unlocked tier. Otherwise, manual UI verification plus existing multiplier service tests should be enough.

## Guardrails

- No gameplay logic changes.
- No economy, reward, multiplier math, or dice cost changes.
- No direct patch writes from UI.
- No persistence changes.
- No new Island Run runtime state fields or gameplay mirrors.
- No broad Island Run footer redesign.
- No changes to roll mutex behavior or action services.
- No changes to `islandRunRollAction.ts` beyond reading it for context.
- No changes to `islandRunContractV2RewardBar.ts` unless a future implementation discovers a reusable presentation helper is truly needed.

## Next PR recommendation

This should be one small implementation PR after this investigation doc is merged.

The implementation PR should only add the derived max-state boolean, the button class or data attribute, CSS styling for that state, and minimal test coverage if there is an obvious existing place. It should not implement gameplay, economy, persistence, reward, roll-action, or footer redesign changes.
