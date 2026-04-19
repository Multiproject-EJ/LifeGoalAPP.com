# Island Run — Open Issues & Feature Backlog

Status: Living document
Last updated: 2026-04-19 (session 3)
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

### P1-1. Drop `event` tile type — ✅ Closed (session 3)

### P1-2. Tile pool redesign — new Monopoly-GO-style ring tiles
**Files:**
- `src/features/gamification/level-worlds/services/islandBoardTileMap.ts`
- `ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE`
- Landing-effect handlers in `IslandRunBoardPrototype.tsx`
- Canonical contract §5D
- Tile 3D props (see P2-4)

**Status note (session 3).** The `bonus` tile logic layer is now shipped
(see P1-3, closed) so all that remains for this item is the three remaining
new types — `coin_flip`, `bank_heist`, `shutdown` — plus their renderer
handlers and 3D props.

**New tile taxonomy (all regular board tiles — NOT events/mini-games):**

| Tile | On-land effect |
|---|---|
| `currency` | Award essence (primary income). |
| `chest` | Larger essence burst + reward-bar progress. |
| `micro` | Small essence drip + reward-bar progress. Most common. |
| `hazard` | Deduct essence (wallet-clamped). |
| `encounter` | Open encounter modal (once per island; see contract §5D glossary). |
| `bonus` ⭐ | Charging accumulator tile — logic layer live (see P1-3 closed). Renderer wiring + 3D prop still pending. |
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

### P1-3. Glowing bonus tile with 9-hit accumulator — ✅ Logic layer closed (session 3)
The pure service (`islandRunBonusTile.ts`) + its 12-case unit suite + the
contract §5E spec are merged. The renderer wiring (dot lamps, released
burst animation, 3D prop) + the runtime-state field + Supabase migration
are the remaining follow-up and ride with P1-2's other new tile types.

---

### P1-4. Reward-bar payout set vs. contract — ✅ Closed (session 3)
Contract §5 now explicitly lists `essence` alongside tokens, dice, and
sticker fragments as a reward-bar payout kind (matches the shipping
`RewardBarRewardKind` union and the `REWARD_ROTATION` table).

---

### P1-5. Dice multiplier plumbed but outlawed by the contract — ✅ Closed (session 3)
Contract §2A + §2E now document the dice multiplier as an **opt-in amplifier**
(×1/×2/×3/×5/×10/×20/×50/×100/×200) with per-tier dice-pool unlock gates.
Cost per roll = `2 × N`. Movement is unchanged; only cost and reward
amplification scale.

---

### P1-6. Hatchery dual source of truth — ✅ Closed (session 3)
`hatcheryEffectivelyComplete` is removed from
`resolveIslandRunStop1CompleteForProgression`'s signature (zero production
callers). The V2 path now reads `stopStatesByIndex[0].objectiveComplete`
only. The renderer already flips that flag on egg-set, so there is no
longer a dual source of truth.

---

### P1-7. Stop-ticket sanitization vs. lookup agree on index 0
**Status:** ✅ Closed in session 2 — see Closed section below.

---

### P1-8. `payStopTicket({stopIndex: 0})` return shape
**Status:** ✅ Closed in session 2 — see Closed section below.

---

## P2 — Tuning / polish / terminology

### P2-1. Per-island essence math
Island 1 total = ~5,333 essence (450 tickets + ~4,883 builds). Average
board lap yields ~60–120 essence of raw tile income. The April 2026
ticket-curve steepening was not paired with a build-cost rebalance — run a
math sanity pass on expected minutes-per-island and either soften the build
curve, raise per-tile essence, or accept the longer pacing and document it.

### P2-2. `TILE_POOL` weighting vs. doc — ✅ Closed (session 3)
Contract §5D now mirrors the live weighting (`currency:3, chest:2,
micro:4, hazard:1` post-`event`-retirement) and explicitly calls `micro` the
most common tile on the ring.

### P2-3. Day-gated encounters on normal islands — ✅ Closed (session 3)
Day-gate documented in contract §5F (`Encounter tile placement`). Normal
islands surface their single encounter only once `dayIndex >= 2`; seasonal
and rare islands have no gate. The fractional positions `{0.15}` /
`{0.275, 0.775}` are published so any future board profile inherits the
same spread.

### P2-4. Tile 3D prop audit
User feedback: confirm every tile type renders a recognisable 3D prop (chest
for `chest`, essence coin for `currency`, thorny/glowing-red for `hazard`,
heist bag for `bank_heist`, coin disc for `coin_flip`, padlock for
`shutdown`, glowing orb for `bonus`). Audit tile-prop asset sheet and the
per-type render branch in `BoardStage.tsx`. File missing-asset tickets for
each.

### P2-5. Glossary — "encounter modal" — ✅ Closed (session 3)
Glossary entry folded into contract §5D directly below the tile catalogue
(same location a consumer would reach for it).

### P2-6. Mystery-stop typing — ✅ Closed (session 3)
`IslandStopPlanEntry.kind` is now a stable 5-value discriminator
(`fixed_hatchery` / `fixed_habit` / `fixed_mystery` / `fixed_wisdom` /
`fixed_boss`). The rotating variant lives on a sibling
`mysteryContentKind?: MysteryStopContentKind` field (only set when
`kind === 'fixed_mystery'`). `getStopIcon` and the mystery-stop modal
switches were updated to read `mysteryContentKind` directly.

### P2-7. `ISLAND_RUN_DEFAULT_STARTING_DICE` naming
**Status:** ✅ Closed in session 2 — see Closed section below.

### P2-8. Stale docstrings
**Status:** ✅ Closed in session 2 — see Closed section below.

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

## Closed in session 2 (2026-04-19)

### ✅ P1-7. Stop-ticket sanitization vs. lookup agree on index 0
`getStopTicketsPaidForIsland` now also rejects `idx <= 0` (previously only
rejected `idx < 0`), matching `sanitizeStopTicketsPaidByIsland`. Hatchery
(index 0) is implicitly always paid and must never appear in the persisted
list; both helpers now drop it uniformly so a malformed payload containing
a `0` returns the same "paid" set no matter which helper reads it.

### ✅ P1-8. `payStopTicket({stopIndex: 0})` return shape
Hatchery payment is now a **no-op success**: `payStopTicket({stopIndex: 0})`
returns `ok: true, cost: 0, alreadyFree: true` with wallet fields
unchanged. Removed the `'hatchery_free'` failure reason. The `PayStopTicketResult`
success branch gained an optional `alreadyFree?: boolean` flag so callers
can differentiate "paid now" from "already free" (skipping telemetry +
toast copy for the no-op case). `handlePayStopTicket` in
`IslandRunBoardPrototype.tsx` now guards the `economy_spend` telemetry and
"N 🟣 paid" landing toast behind `!result.alreadyFree` so a defensive
hatchery click produces no spurious event.

### ✅ P2-7. `ISLAND_RUN_DEFAULT_STARTING_DICE` documented, not renamed
Left the constant name in place (rename would ripple through ~10 callers
and a serialization-stable default) but added an explicit docblock stating
it **equals the level-1 dice-regen floor**
(`resolveDiceRegenMinDice(1) = 30 + ⌊20 × ln(1)⌋ = 30`). Starting dice is
therefore a *derived* value from the XP-level curve, not an independent
tunable — the comment now makes that relationship explicit for the next
reader.

### ✅ P2-8. Stale `islandRunRollAction.ts` docstring
Removed the reference to **coins** from the "intentionally not in scope"
list in `islandRunRollAction.ts` (coins are retired) and refreshed the
tile-reward example list to mention the live currencies + bonus-tile
charge.

## Closed in session 3 (2026-04-19)

### ✅ P1-1. Drop `event` tile type
`'event'` is removed from `IslandTileType`, `TILE_POOL`, and
`ISLAND_RUN_CONTRACT_V2_ESSENCE_EARN_BY_TILE`. The tile generator now
reshuffles the pool as `currency:3, chest:2, micro:4, hazard:1`, making
`micro` the most common ring tile (matches the contract's "most common
tile" wording). The renderer's `case 'event':` branch, its `EVENT_MESSAGES`
copy, and the `event` entries in `TILE_TYPE_ICONS` + `SPARK60_TILE_COLOR`
are all deleted. The word "event" is now reserved solely for the timed
minigame rotation (feeding_frenzy / lucky_spin / space_excavator /
companion_feast). Foundations test + contract §5D updated.

### ✅ P1-3. Bonus tile 9-hit accumulator — game-logic layer
New pure service `services/islandRunBonusTile.ts` exporting
`applyBonusTileCharge`, `getBonusTileCharge`,
`resetBonusTileChargeForIsland`, `sanitizeBonusTileChargeByIsland`, plus
the canonical `BONUS_CHARGE_TARGET = 8`, `BONUS_CYCLE_LENGTH = 9`, and
`BONUS_BASE_RELEASE_PAYOUT` constants. 12-case unit test suite covers:
single-increment per landing, 8-then-release cycle, release-resets-to-0,
two consecutive cycles = two releases, immutable-input guarantee,
per-(island, tileIndex) independence, invalid-index no-op,
`resetBonusTileChargeForIsland` preserves other islands, and
`sanitize...` drops malformed entries / clamps overshoots. Payload
baseline is `{ essence: 80, dice: 4, rewardBarProgress: 5 }` — the island
essence multiplier is applied by the renderer caller when it eventually
wires up, matching how the rest of the economy scales. Contract §5E
documents the mechanic, payout, state shape, and invariants.

### ✅ P1-4. Reward-bar payout set matches code
Contract §5 now lists `Essence / Dice / Minigame tokens / Sticker
fragments` as the rotating payout kinds, pointing at `REWARD_ROTATION`
in `islandRunContractV2RewardBar.ts` as the source of truth.

### ✅ P1-5. Dice multiplier is documented
Contract §2A keeps the 2–12 movement invariant; the new §2E documents
the full multiplier tier ladder, the `2 × N` cost formula, per-tier
unlock gates, the auto-downgrade rule (via `clampMultiplierToPool`),
and the fact that hazards are amplified too (so high multiplier = real
risk). §3 Dice was updated to reference §2E instead of claiming a flat
cost.

### ✅ P1-6. Hatchery dual source of truth removed
`hatcheryEffectivelyComplete` parameter is dropped from
`resolveIslandRunStep1CompleteForProgression`. Its V2 implementation now
reads only `stopStatesByIndex[0].objectiveComplete`. The egg-set action
in `IslandRunBoardPrototype.tsx` already writes that flag synchronously,
so there is no longer a separate "effectively complete" bridge. Test
suite `islandRunContractV2StopResolver.test.ts` was simplified to match
the new signature.

### ✅ P2-2. Tile pool weighting reconciled
Pool weighting is documented inline in `islandBoardTileMap.ts` and
mirrored in contract §5D (`currency:3, chest:2, micro:4, hazard:1`).
`micro` is now genuinely the most common tile, matching the contract's
long-standing claim.

### ✅ P2-3. Day-gated encounters documented
Contract §5F (`Encounter tile placement`) publishes the normal-island
day-gate (`dayIndex >= 2`) alongside the seasonal/rare "always on"
behaviour and the fractional positions used on every board profile.

### ✅ P2-5. Encounter modal glossary
Folded the glossary entry into contract §5D directly below the tile
catalogue.

### ✅ P2-6. Mystery-stop typing discriminator
`IslandStopPlanEntry.kind` now has exactly 5 discriminants (one per
stopId). The Mystery stop's rotating content variant moved to the new
sibling field `mysteryContentKind?: MysteryStopContentKind`, which is
only populated when `kind === 'fixed_mystery'`. `getStopIcon` in
`IslandRunBoardPrototype.tsx` was refactored to take the stop object and
branch on `mysteryContentKind` explicitly. The mystery-stop modal's
switch chain now also reads from `mysteryContentKind`. Dead `kind`
checks in the generic complete-stop footer branch were cleaned up as
part of the edit (the outer `stopId !== 'mystery'` guard already
dominated the check).

