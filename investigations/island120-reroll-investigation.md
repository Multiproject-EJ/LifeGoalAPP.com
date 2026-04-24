# Island 120 (40-tile ring) reroll/dice regen investigation

Date: 2026-04-24

## Scope reviewed
- Island Run board runtime (`IslandRunBoardPrototype.tsx`)
- Dice regeneration service (`islandRunDiceRegeneration.ts`)
- Runtime state initialization/persistence (`islandRunGameStateStore.ts`)
- Roll authority service (`islandRunRollAction.ts`)
- Out-of-dice UI (`OutOfDiceRegenStatus.tsx`)
- 40-tile board profile/layout (`islandBoardProfiles.ts`, `islandBoardLayout.ts`)

## Intended behavior (from code/contracts)
1. **40-tile board topology is always active** via `spark40_ring`.
2. **Rolls are dice-gated energy** (cost per roll with multiplier).
3. **Passive regen should replenish dice up to a level-based floor** over 2 hours.
4. **Countdown should be visible when out of rolls** (footer and out-of-dice modal).

## What is actually happening
- `diceRegenState` is initialized as `null` in baseline runtime state.
- Countdown logic in board/footer requires non-null `runtimeState.diceRegenState`.
- Out-of-dice modal also requires non-null `regenState` to show ETA/progress.
- The function that actually computes/applies regen (`applyDiceRegeneration`) is present but not wired into runtime flow.

Result: no regen state bootstrap + no regen tick/apply path = no refill and no countdown.

## Primary bug findings

### 1) Regen engine exists but is never integrated into runtime writes
`applyDiceRegeneration` is implemented and tested, but no gameplay service/component calls it during hydration, focus/resume, interval ticks, roll attempts, or state writes.

### 2) Regen state defaults to null and stays null
Initial game state sets `diceRegenState: null`, and reset paths preserve null, so UI always sees “regen not ready”.

### 3) Countdown UI is conditional on regen state that never appears
Both footer countdown and out-of-dice modal depend on `runtimeState.diceRegenState`; with null state they hide ETA and only show fallback text.

## Secondary inconsistencies (not root cause, but confusing)

1. **Dice cost constant mismatch in docs/comments:**
   - `islandRunEconomy.ts` exports `ISLAND_RUN_DICE_PER_ROLL = 2` (unused/stale)
   - Roll authority uses `DICE_PER_ROLL = 1` and comments say this was softened on 2026-04-19.

2. **Debug panel shows wrong player level source:**
   - `playerLevel` passed to debug panel is `islandNumber`, not user XP level.
   - This can mislead regen diagnostics because regen is level-based.

## Practical fix direction
1. Bootstrap `diceRegenState` once from player level when absent.
2. Apply `applyDiceRegeneration(...)` at deterministic points (hydrate, app focus/visibility, before roll precheck, and periodic lightweight tick if needed).
3. Persist resulting `{ dicePool, diceRegenState }` via the same runtime state write path.
4. Keep countdown as pure UI over persisted regen state (already implemented).
5. Remove or align stale `ISLAND_RUN_DICE_PER_ROLL` constant and fix debug panel `playerLevel` wiring.

