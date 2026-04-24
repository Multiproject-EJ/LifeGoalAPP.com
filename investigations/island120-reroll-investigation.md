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

## Implementation progress (2026-04-24)

### ✅ Completed in this branch
1. **Integrated passive dice regen into board runtime**:
   - Added `applyPassiveDiceRegen(...)` in `IslandRunBoardPrototype.tsx`.
   - Bootstraps regen state when missing and applies elapsed-time refill logic.
   - Persists `dicePool` + `diceRegenState` via `persistIslandRunRuntimeStatePatch`.
2. **Added deterministic trigger points**:
   - Startup boot pass after hydration.
   - 30s periodic interval pass while board is open.
   - Focus / visibility resume pass.
   - Pre-roll pass before insufficient-dice check.
3. **Fixed dice-per-roll mismatch**:
   - `ISLAND_RUN_DICE_PER_ROLL` changed from `2` → `1` to match roll authority.
4. **Fixed debug panel player level wiring**:
   - Replaced `playerLevel: islandNumber` with actual player level (`playerLevelInfo.currentLevel`, fallback `1`).

### 🔜 Remaining follow-up to consider
1. Consider centralizing dice regen into a shared state action helper so roll/board/runtime all use one integration point.

## Additional progress (2026-04-24, follow-up pass)

### ✅ Completed
1. Added a dedicated runtime regen integration helper service:
   - `src/features/gamification/level-worlds/services/islandRunRuntimeRegen.ts`
   - Exposes `resolveRuntimeDiceRegenUpdate(...)` for deterministic runtime writes and no-op suppression.
2. Refactored `IslandRunBoardPrototype.tsx` to use `resolveRuntimeDiceRegenUpdate(...)` instead of in-component ad hoc regen diff logic.
3. Added new tests:
   - `src/features/gamification/level-worlds/services/__tests__/islandRunRuntimeRegen.test.ts`
   - Covers bootstrap, no-op suppression, elapsed-time dice gain, and level-change regen-shape updates.
4. Registered the new test suite in `runIslandRunServiceTests.ts`.

## Closure assessment (2026-04-24)

### Status for the reported issue
**✅ Functionally resolved in code.**

The originally reported defect was:
1. Passive reroll/dice regen not replenishing the pool.
2. No visible regen countdown.

Both are now addressed by:
- Runtime regen bootstrap/apply integration (`startup`, `interval`, `focus`, `visibility`, `pre_roll`).
- Persisting `dicePool` + `diceRegenState` for UI countdown consumers.
- Extracted, test-covered runtime regen helper used by board runtime.

### Is a new AI session needed?
**No, not required for this issue.** A new session is only needed if product/QA finds a new edge case not covered here.

### What (if anything) is still left?
1. **Recommended QA verification pass in app UI** (non-code): run through out-of-dice -> wait -> countdown appears -> roll becomes available.
2. **Unrelated baseline test debt remains** in minigame consolidation suites (known pre-existing failures), but this does not block closing this regen issue.

## Alignment Plan: Monopoly-GO-style regen parity (step-by-step)

Date: 2026-04-24
Goal: align the current implementation to the requested baseline/scaling spec.

### Current gap summary (why alignment is needed)
1. Current model uses a logarithmic floor + “full refill in 2h” rate model.
2. Current grant logic can batch multiple dice in one apply pass.
3. Out-of-dice UI currently shows both next-dice ETA and full-refill ETA.

### Step plan

#### Step 1 — Planning/doc update (this commit) ✅
- Record the exact target behavior and migration sequence before changing runtime logic.
- Freeze target scope to avoid mixing balancing changes with UI changes mid-flight.

#### Step 2 — Regen config model swap (pending)
- Replace logarithmic resolver with explicit level-band config:
  - 1–4: 30 @ 8m
  - 5–9: 50 @ 10m
  - 10–19: 75 @ 10m
  - 20–39: 100 @ 10m
  - 40–74: 125 @ 9m
  - 75–124: 150 @ 8m
  - 125+: 200 @ 7m
- Expose `maxDice` + `regenIntervalMs` as canonical runtime config.

#### Step 3 — Grant semantics swap to strict +1 ticks (pending)
- Remove batch grant behavior.
- Regen grant rule becomes: add exactly +1 when elapsed >= interval; loop in single-die increments if catch-up is needed while preserving deterministic timer carry.
- Keep “no regen when current_dice >= max_dice”.

#### Step 4 — UI contract update (pending)
- Show only: “Next dice in MM:SS”.
- Remove full-refill ETA from out-of-dice modal.
- Keep existing accessibility/live-region behavior.

#### Step 5 — Test realignment (pending)
- Update/add tests for:
  - level-band config mapping,
  - strict +1 semantics,
  - no-regen-at-cap,
  - countdown copy contract (“Next dice in …” only),
  - overflow behavior (reward dice can exceed passive regen cap).

#### Step 6 — QA validation checklist (pending)
- Fresh user at level 1: verify 8m per die cadence.
- Mid-level and high-level users: verify band transitions.
- Out-of-dice flow: verify countdown visibility and roll unlock.
- Resume/focus/reopen behavior: timer continuity and no duplicate grants.

## Implementation pass: broad alignment update (2026-04-24)

### ✅ Completed in this pass
1. **Step 2 implemented**:
   - Replaced logarithmic regen config with explicit level-band mapping:
     - 1–4: 30 @ 8m
     - 5–9: 50 @ 10m
     - 10–19: 75 @ 10m
     - 20–39: 100 @ 10m
     - 40–74: 125 @ 9m
     - 75–124: 150 @ 8m
     - 125+: 200 @ 7m
2. **Step 3 implemented**:
   - `applyDiceRegeneration` now runs on interval-tick semantics derived from `regenIntervalMinutes`.
   - Regen grants accumulate one die per elapsed interval on resume/re-entry (catch-up), capped at `maxDice`.
   - Runtime apply cadence now checks every second while Island Run is open so grants land at/near countdown completion instead of waiting up to 30s.
3. **Step 4 implemented**:
   - Out-of-dice UI now shows only next-dice countdown copy.
   - Full-refill line removed from modal UI.
   - Out-of-dice modal now previews the expected dice count at countdown end.
4. **Step 5 implemented**:
   - Updated regen tests for level-band config + interval semantics + ETA behavior.
   - Updated runtime regen integration tests to the new level-band expectations.
   - Added a canonical UI label constant test to lock the “Next dice in …” contract text.

### ⏳ Still pending
1. **Step 6 QA checklist**: manual product QA run-through in-app is still required.
2. Optional balancing iteration after QA telemetry:
   - revisit level-band intervals if economy pressure feels too harsh/lenient.
