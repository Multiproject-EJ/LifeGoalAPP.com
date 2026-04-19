# Island Run — Open Issues & Feature Backlog

Status: Living document
Last updated: 2026-04-19
Owner: Gameplay System

This document tracks every unresolved issue, bug, inconsistency, or scoped
feature request uncovered in the 2026-04-19 in-depth review of the 40-tile
ring / 120-island game loop. Items are grouped by priority; each entry links
to the canonical file(s) that must change.

Items already **closed** in the same review session are kept at the bottom
for traceability.

---

## P0 — Must-fix (correctness / trust)

### P0-1. Single authoritative roll path + no Supabase row drift
**Files:**
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
- `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`

**Problem.** `executeIslandRunRollAction` advertises itself as *"the single
authoritative bookkeeping path for dice deduction"*, but:
1. The Supabase persist is fire-and-forget (`writeIslandRunGameStateRecord(...).catch(...)`).
2. The renderer applies tile-reward deltas (essence, reward-bar progress,
   hazard deductions, etc.) in a separate write on top of `runtimeVersion + 1`.
3. There is no mutex; the module disclaims concurrency in its own docstring.

If the two remote writes land out of order, optimistic-concurrency can drop
one side's delta. LocalStorage masks the divergence locally but the Supabase
row drifts from the client's truth.

**Target shape.**
1. One service function — `executeIslandRunRollAction` — becomes the **only**
   path that mutates `dicePool`, `tokenIndex`, essence deltas from tile
   landings, reward-bar progress from tile landings, bonus-tile accumulator
   state, and hazard deductions for the roll's landed tile.
2. Persist **synchronously** (await the write). Renderer only starts the token
   animation after the write resolves OR after a short timeout that treats
   the local-storage write as the source of truth and schedules a reconcile
   on the next hydration.
3. Add an in-module async mutex (per `session.user.id`) so concurrent calls
   serialise instead of racing. The renderer must already guard with a
   busy flag but defense-in-depth matters.
4. Remove any other code paths that write `dicePool` on roll. Audit:
   - `IslandRunBoardPrototype.tsx` — any local `setDicePool(prev - 2)` inside
     roll handlers must be deleted and replaced with a UI sync from the
     service result.
   - Any tile-reward handlers that call `writeIslandRunGameStateRecord` on
     their own must be folded into the service or routed through a new
     `executeIslandRunTileRewardAction` that takes the same mutex.
5. Bump `runtimeVersion` exactly once per user-visible turn (roll + its
   landing resolution + any bonus triggers) rather than per sub-action.

**Acceptance.**
- Grep for `writeIslandRunGameStateRecord` shows only service-layer callers.
- Grep for `setDicePool(` in the renderer shows no arithmetic (only hydration
  sync from service results).
- A new test in `__tests__/islandRunRollAction.test.ts` simulates two rolls
  fired 5ms apart and asserts the final state equals sequential application.

---

### P0-2. Essence drift — (closed, see bottom)

---

## P1 — Contract mismatches / feature parity

### P1-1. Drop `event` tile type, rename mini-games → "events"
**Files:**
- `src/features/gamification/level-worlds/services/islandBoardTileMap.ts`
- `src/features/gamification/level-worlds/services/islandRunContractV2EssenceBuild.ts` (`ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE`)
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` §5D, §6
- Renderer / landing-effect handlers in `IslandRunBoardPrototype.tsx`

**Reasoning (from user feedback).** The ring-tile type called `event` has no
clean purpose distinct from `micro`, and the name collides with the timed
mini-games ("feeding_frenzy", "lucky_spin", etc.) which should own the
terminology. Mini-games become "events"; the board loses a confusing tile
type.

**Change.**
- Remove `'event'` from `IslandTileType` and `TILE_POOL`.
- Remove its `ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE` row.
- Update renderer to route old `'event'` tiles to `'micro'` or
  `'currency'` during hydration so old seeds don't crash.
- Rename "timed mini-games" → "events" in doc + UI copy. Active event is
  accessed from its own HUD button; entry tickets/tokens come from the
  reward bar and landmark completions (not from an `event` tile).

---

### P1-2. Tile pool redesign — new Monopoly-GO-style ring tiles
**Files:**
- `src/features/gamification/level-worlds/services/islandBoardTileMap.ts`
- `ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE`
- Landing-effect handlers in `IslandRunBoardPrototype.tsx`
- Canonical contract §5D
- Tile 3D props (see P2-4)

**New tile taxonomy (all regular board tiles — NOT events/mini-games):**

| Tile | On-land effect |
|---|---|
| `currency` | Award essence (primary income). |
| `chest` | Larger essence burst + reward-bar progress. |
| `micro` | Small essence drip + reward-bar progress. Most common. |
| `hazard` | Deduct essence (wallet-clamped). |
| `encounter` | Open encounter modal (once per island; see P2-5 for glossary). |
| `bonus` ⭐ | Charging accumulator tile — full spec in **P1-3**. |
| `coin_flip` | 50/50: double the most recent on-land essence reward, or lose it. |
| `bank_heist` | Trigger a short bank-heist sequence; awards a large essence windfall against an "island bank" that fills from passive play. |
| `shutdown` | Temporarily locks one of the player's building stops; unlock with a small essence bribe or after a cooldown. |

Balance note: `coin_flip`, `bank_heist`, and `shutdown` should each occupy
1–2 slots in the rarity-weighted pool so encounters remain the dramatic
beats and most tiles stay feeding-type.

**Acceptance.**
- `TILE_POOL` reshuffled with documented weights.
- Each new type has a renderer handler with a dedicated on-land animation
  and a clear HUD feedback string.
- Tests updated in `islandBoardTileMap.test.ts`.
- Contract §5D rewritten with the full taxonomy.

---

### P1-3. Glowing bonus tile with 9-hit accumulator
**Files:**
- `islandBoardTileMap.ts` (new `'bonus'` tile type)
- `islandRunRuntimeState.ts` / `islandRunGameStateStore.ts` (new persistent field)
- Landing handler in `IslandRunBoardPrototype.tsx`
- Canonical contract §5D
- New migration if we persist tile state to Supabase

**Mechanic (from user spec).**
- When the player lands on the bonus tile, increment a tile-local counter.
- UI lights one more dot per landing (1/8, 2/8, …).
- At 8/8 the entire tile glows ("primed").
- The **next** landing (the 9th) releases the accumulated bonus and resets
  the counter to 0.
- Bonus payload: large essence burst + dice kicker + reward-bar surge
  (exact numbers TBD during tuning pass).

**State shape.**
```ts
// In IslandRunGameStateRecord
bonusTileChargeByIsland: Record<string, Record<number, number>>;
// key = islandNumber, inner key = tileIndex, value = charge count (0..8)
```
Reset to `{}` on island travel (same pattern as `stopTicketsPaidByIsland`).

**Acceptance.**
- Pure service function `applyBonusTileCharge(state, tileIndex, islandNumber)`
  returns `{ state, released: boolean, payout: BonusPayout | null }`.
- Renderer reads the map to drive the dot lamps; no game logic in the renderer.
- Unit tests cover: 1st→8th landing increments; 9th releases; release resets;
  island travel resets.
- Contract §5D rewritten to cover the mechanic.

---

### P1-4. Reward-bar payout set vs. contract
**File:** `src/features/gamification/level-worlds/services/islandRunContractV2RewardBar.ts`
Contract §5 lists payout types as `{ tokens, dice, stickers }`, but
`RewardBarRewardKind` also includes `'essence'`. Either widen §5 to admit
essence (probably correct — essence reward bar ticks are useful) or remove
the essence branch from the rotation.

---

### P1-5. Dice multiplier plumbed but outlawed by the contract
**File:** `islandRunRollAction.ts` (`diceMultiplier` param)
Contract §2A/§8: roll cost is always flat 2. Either delete the parameter or
update the contract to allow an opt-in "burn more dice for amplified tile
rewards" mode.

---

### P1-6. Hatchery dual source of truth
**Files:**
- `islandRunContractV2StopResolver.ts:73-85`
- Renderer egg-lifecycle code in `IslandRunBoardPrototype.tsx`

`resolveIslandRunStep1CompleteForProgression` accepts **either**
`stopStatesByIndex[0].objectiveComplete` **or** a derived
`hatcheryEffectivelyComplete`. Any code path that only reads the former can
disagree with UI that uses this helper. Reconcile by having the egg-set
action write `stopStatesByIndex[0].objectiveComplete = true` immediately, so
`hatcheryEffectivelyComplete` becomes dead code that can be deleted.

---

### P1-7. Stop-ticket sanitization vs. lookup agree on index 0
**File:** `islandRunStopTickets.ts`
`sanitizeStopTicketsPaidByIsland` drops `idx <= 0`; `getStopTicketsPaidForIsland`
keeps `idx >= 0`. Malformed payloads containing a `0` return different
"paid" sets between the two code paths. Both should forbid 0 (Hatchery is
implicitly paid).

---

### P1-8. `payStopTicket({stopIndex: 0})` return shape
**File:** `islandRunStopTickets.ts:142`
Hatchery being free is a no-op, not a failure. Callers wired to treat
`ok:false` as an error will flash toasts on legitimate clicks. Either return
`ok:true, cost:0` or add a dedicated `already_free` success branch.

---

## P2 — Tuning / polish / terminology

### P2-1. Per-island essence math
Island 1 total = ~5,333 essence (450 tickets + ~4,883 builds). Average
board lap yields ~60–120 essence of raw tile income. The April 2026
ticket-curve steepening was not paired with a build-cost rebalance — run a
math sanity pass on expected minutes-per-island and either soften the build
curve, raise per-tile essence, or accept the longer pacing and document it.

### P2-2. `TILE_POOL` weighting vs. doc
Contract calls `micro` "most common tile" but the pool is `currency:3,
chest:2, micro:2, event:2, hazard:1`. Reconcile once the P1-1/P1-2 redesign
lands.

### P2-3. Day-gated encounters on normal islands
`generateTileMap` suppresses encounters on normal islands while
`dayIndex < 2`. This is undocumented in the canonical contract. Either
document the gate or remove it.

### P2-4. Tile 3D prop audit
User feedback: confirm every tile type renders a recognisable 3D prop (chest
for `chest`, essence coin for `currency`, thorny/glowing-red for `hazard`,
heist bag for `bank_heist`, coin disc for `coin_flip`, padlock for
`shutdown`, glowing orb for `bonus`). Audit tile-prop asset sheet and the
per-type render branch in `BoardStage.tsx`. File missing-asset tickets for
each.

### P2-5. Glossary — "encounter modal"
**Definition (for the doc + in-game help):**
> **Encounter modal.** A one-shot side-quest popup that opens when the
> player lands on an `encounter` tile. Content is drawn from
> `encounterService.ts` (Quiz / Breathing / Gratitude prompts —
> intentionally easy, near-guaranteed completion). Rewards: essence +
> reward-bar progress + optional sticker chance. Once completed the
> encounter tile goes inert for the rest of that island.

### P2-6. Mystery-stop typing
`IslandStopPlanEntry.kind` unions `'fixed_*'` with the three Mystery content
variants. Consumers that switch on `kind` must enumerate five rotating
variants. Introduce a `'fixed_mystery'` discriminator and surface the
rotating content variant on a sibling `mysteryContentKind?: MysteryStopContentKind`
field.

### P2-7. `ISLAND_RUN_DEFAULT_STARTING_DICE` naming
The constant equals the level-1 regen floor. Rename to
`ISLAND_RUN_LEVEL1_DICE_FLOOR` (or add a doc-block that explicitly states
"equals `resolveDiceRegenMinDice(1)`") so the XP-level relationship is
obvious. Starting dice is NOT an independent tunable: it is a derived
constant.

### P2-8. Stale docstrings
`islandRunRollAction.ts` header lists *"coins, essence, shards"* in its
"intentionally not in scope" comment. Coins are retired. Clean up.

### P2-9. Encounter tile position collisions
Seasonal/rare encounters at fractions `0.275` / `0.775` land on tile indices
`11` and `31` on a 40-tile ring — adjacent to the removed landmark anchors.
Cosmetically fine now that anchors are gone, but re-evaluate once P1-2 adds
more tile types and we want an even spread.

---

## Closed in this review (2026-04-19)

### ✅ Remove `landmarkOrbitAnchors` and `tileIndex`
`IslandBoardProfile.landmarkOrbitAnchors` and
`IslandStopPlanEntry.tileIndex` have been removed. Landmarks are now fully
decoupled from ring tile indices. HUD positioning of the 5 landmark buttons
lives solely in `OUTER_STOP_ANCHORS` (`islandBoardLayout.ts`). The tile-map
generator continues to populate every ring index (0..39) as a normal
movement tile; the four former anchor indices (0/10/20/30/39) are now
ordinary tiles drawn from the pool just like the rest.

### ✅ Essence drift: compound → linear decay
`applyEssenceDrift` now applies `lost = excess × rate × hours` (linear),
matching contract §4B. Compound `Math.pow(1 - rate, hours)` is gone.

### ✅ Essence drift threshold: TOTAL → REMAINING
The drift threshold is computed from `getRemainingIslandBuildCost(...)` (new
helper), so once most of the island is built the hoard threshold contracts
and drift nudges the player to spend. Falls back to
`getIslandTotalEssenceCost(islandNumber)` if `remainingIslandCost` is not
supplied (legacy callers).

### ✅ Stale tile-index comments in `islandBoardLayout.ts`
Comments that claimed tile indices 0/10/20/30/39 resolved landmarks have
been removed in favour of the new "no tile index is reserved for a
landmark" wording.
