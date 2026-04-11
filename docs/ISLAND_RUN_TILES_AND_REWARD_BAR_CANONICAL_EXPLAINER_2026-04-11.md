# Island Run — Canonical tile function + reward-bar tie-in (2026-04-11)

## What canonical says tiles are for
From `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`:
1. Tiles are the movement surface for dice-based traversal.
2. Stops are external structures (not tiles).
3. Feeding tiles are the central reward-driver during board play.
4. Feeding tile interactions fill the reward bar.
5. Reward bar payouts are minigame tokens, occasional dice, and stickers.

## Tile function in the loop (canonical intent)
- You spend dice to land on tiles.
- Tile landings (especially feeding tiles) generate short-loop progress.
- That progress fills reward bar milestones.
- Reward bar claims reinforce the loop with tokens/dice/sticker progression.
- In parallel, stop progression and Essence/build systems gate island completion.

## How current code ties tiles to reward bar
In `IslandRunBoardPrototype.tsx`, non-stop/non-encounter tile landings call reward-bar progression in contract-v2 mode:
- `applyIslandRunContractV2RewardBarProgress({ source: { kind: 'tile', tileType } ... })`

In `islandRunContractV2RewardBar.ts`:
- Feeding tiles currently defined as:
  - `egg_shard` -> progress +4, feedingAction +1
- Some non-feeding tiles still contribute lightly:
  - `chest` -> +1 progress
  - `micro` -> +1 progress
- Claim payout types are:
  - minigame tokens
  - occasional dice
  - sticker fragments/stickers

This is mostly aligned with canonical reward-bar outputs and feeding-tile emphasis.

## Important nuance / gap to keep in mind
Canonical says feeding tiles are the **primary** input; implementation currently still allows a smaller contribution from selected non-feeding tiles (`chest`, `micro`).

This is acceptable if treated as tuning, but if stricter canonical interpretation is desired, progress deltas can be restricted to feeding-only tile categories.

## Essence wiring status (game earnings -> top bar)
Yes — Essence is wired into earnings and visible UI wallet displays in contract-v2 mode:

1. Tile landings resolve an Essence earn amount via tile type (`resolveIslandRunContractV2EssenceEarnForTile`).
2. Landing handler awards Essence (`awardContractV2Essence`) and persists runtime state.
3. Top bar renders `runtimeState.essence` in the wallet chip.
4. Footer/HUD also renders Essence when contract-v2 is enabled.

So when the player lands on qualifying earning tiles, Essence increments and the top bar wallet value updates from the same runtime state source.
