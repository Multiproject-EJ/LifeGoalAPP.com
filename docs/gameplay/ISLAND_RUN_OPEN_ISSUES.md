# Island Run — Open Issues & Feature Backlog

Status: Living document
Last updated: 2026-04-20 (session 8 — state architecture refactor stages A+B+E)
Owner: Gameplay System

This document tracks every unresolved issue, bug, inconsistency, or scoped
feature request uncovered in the 2026-04-19 in-depth review of the 40-tile
ring / 120-island game loop. Items are grouped by priority; each entry links
to the canonical file(s) that must change.

Items already **closed** in the same review session are kept at the bottom
for traceability.

---

## P0 — Must-fix (correctness / trust)

### P0-2. Single authoritative gameplay state (state architecture refactor) — 🟡 In progress (session 8)

Session 7 landed tactical fixes for the cross-device / dice-oscillation /
token-rollback bugs. Root cause diagnosis in session 8: Island Run has
three co-equal state representations competing for truth — the low-level
record store, the renderer's `runtimeState` React mirror, and ~130 per-field
`useState` mirrors — with four write paths and three hydrate paths. Every
gameplay mutation is a 3-legged write (useState + runtimeState + store)
issued from the renderer with no ordering guarantee. All session-7 bugs are
instances of the three legs disagreeing.

**Target architecture (accepted session 8).** One authoritative in-memory
record, one mutation path via actions → `commit`, one persistence path via
the existing low-level writer. UI state (useState) is presentation-only:
modals, animations, form inputs. Gameplay fields (`dicePool`, `tokenIndex`,
`essence`, `islandNumber`, `completedStopsByIsland`, …) live **only** in the
store and are read via the `useIslandRunState` hook.

**Stage A — Unify the state type — ✅ Closed (session 8).**
`IslandRunRuntimeState` is now a type alias of `IslandRunGameStateRecord`
(they were structurally identical). Single source of truth for the shape.

**Stage B — Subscribable store + React hook — ✅ Closed (session 8).**
- New module: `islandRunStateStore.ts` (`getIslandRunStateSnapshot`,
  `subscribeIslandRunState`, `commitIslandRunState`, `hydrateIslandRunState`,
  `resetIslandRunStateSnapshot`). In-memory mirror of
  `IslandRunGameStateRecord`, delegating persistence to the existing
  `writeIslandRunGameStateRecord` (single-flight, conflict merge, pending
  queue, backoff — all preserved).
- New hook: `hooks/useIslandRunState.ts` using `useSyncExternalStore` so
  React strict-mode double-invocation / concurrent rendering are safe by
  construction (no "effect mirrors store" race).
- Coverage: 8 new `islandRunStateStore` cases covering snapshot stability,
  subscribe/unsubscribe, synchronous publish before remote resolve,
  hydrate-notifies-subscribers, in-flight unsubscribe safety.

**Stage C — Migrate renderer action-by-action — ⏳ Pending follow-up PR(s).**
The remaining domains (tile-reward, encounter, stop-completion, stop-ticket,
egg, market, travel, boss, shard-claim, reward-bar, essence-drift, companion,
onboarding) should be bundled into as few PRs as possible — prefer landing
multiple domains together when they compile clean and the tests stay green.
Each domain adds its action(s) to `islandRunStateActions.ts` and deletes the
matching `setRuntimeState` / `persistIslandRunRuntimeStatePatch` /
`writeIslandRunGameStateRecord` call-sites plus their per-field
`useState`/`useEffect` pairs from `IslandRunBoardPrototype.tsx`.

**Stage D — Retire legacy APIs — ⏳ Pending final cleanup PR.** Once Stage C
is complete and a grep confirms zero call-sites, delete
`islandRunRuntimeState.ts`, `islandRunRuntimeStateBackend.ts`, and the
`runtimeStateRef` / `hasCompletedInitialHydrationSyncRef` /
`lastAppliedRuntimeVersionRef` guard refs from the renderer. Those guards
exist purely to patch over the multi-writer race and become unnecessary.

### P0-1. Single authoritative roll path + no Supabase row drift — ✅ Closed (session 4, follow-ups session 7)

Implementation landed in session 4 — see the Closed section below. The roll
service now owns a per-user async mutex, awaits the persist inside the mutex,
and returns `newDicePool` / `newRuntimeVersion` so the renderer can sync from
the service's truth (via a functional updater that no longer clobbers
mid-animation reward deltas). Concurrency regression test added.

**Session 7 follow-ups (cross-device sync & roll drift) — ✅ Closed:**
- **Hydration-sync regression guard** — `IslandRunBoardPrototype.tsx` now
  tracks `lastAppliedRuntimeVersionRef`. If a later `runtimeState` update
  carries an older runtimeVersion (e.g. from a conflict-recovery merge that
  pulled an older Supabase row), the React mirrors (`tokenIndex`, `dicePool`,
  `spinTokens`, …) are no longer snapped back to that stale value. This fixes
  the "player piece jumps back to an older tile and keeps playing from there"
  symptom.
- **Persist-effect base = fresh localStorage record** — the dicePool/tokenIndex/
  spinTokens persist effect now spreads `readIslandRunGameStateRecord(session)`
  instead of `runtimeStateRef.current`, so it piggy-backs on the roll service's
  freshly-written runtimeVersion rather than racing it. Eliminates the
  conflict-storm that caused the dice count to oscillate between two values on
  every reward after a roll.
- **Force remote hydrate on login/entry** — the initial hydrate in
  `IslandRunBoardPrototype.tsx` now passes `forceRemote: true` so a stale local
  `island_run_remote_backoff_…` blob can no longer pin a device to its own
  local fallback (the cause of "phone shows island 6 but desktop shows island 1"
  even though the user is the same).
- **Parked writes no longer dropped on commit failure** —
  `writeIslandRunGameStateRecord` now enqueues single-flight parked snapshots
  into the `pending_write` localStorage queue at the time of park (not only on
  successful resume), and also enqueues on non-backoff commit errors. This
  eliminates the data-loss window where a transient Supabase error between two
  rolls could silently lose the first roll's delta.
- **Null-safe `current_island_number` hydrate** — both hydrate branches now
  fall back to the local record's `currentIslandNumber` instead of silently
  clamping to default 1 if the Supabase column is ever NULL.

Coverage: `islandRunRuntimeStateIntegration` adds two new cases:
`writeIslandRunGameStateRecord enqueues parked single-flight snapshot into
pending_write queue` and `writeIslandRunGameStateRecord enqueues pending_write
on non-backoff commit error`.

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

### P1-5. Dice multiplier plumbed but outlawed by the contract — ✅ Closed (session 3, formula softened in session 5)
Contract §2A + §2E now document the dice multiplier as an **opt-in amplifier**
(×1/×2/×3/×5/×10/×20/×50/×100/×200) with per-tier dice-pool unlock gates.
Cost per roll = `1 × N` (softened from `2 × N` in session 5). Movement is
unchanged; only cost and reward amplification scale.

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

### P1-9. Fold tile-reward writes into a serialised service
**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (`awardContractV2Essence`, `deductContractV2Essence`, `resolveTileLanding`,
  reward-bar apply path)
- Proposed new `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`

**Why.** Session 5 patched the most visible clobber by switching essence
writes from full-record `writeIslandRunGameStateRecord` spreads to
`persistIslandRunRuntimeStatePatch` so disjoint fields no longer overwrite
each other. That closes the cross-field clobber but still performs two
independent async read-modify-writes when a single landing awards essence
AND reward-bar progress. A proper fix is a dedicated
`executeIslandRunTileRewardAction` service that takes the whole landing
(essence delta, reward-bar progress delta, optional sticker / bonus-tile
effects) and runs it under the same per-user mutex as `executeIslandRunRollAction`.
Acceptance: all landing-effect writes chain through the mutex; a
`tile-reward-interleaves-with-roll` regression test exists mirroring the
existing 5-parallel-rolls case.

---

### P1-10. Encounter resolution must tick the reward bar — ✅ Closed (session 6)
See the Closed section below.

---

### P1-11. Stop status reporting ignores ticket-paid state
**Files:**
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
  (`resolveIslandRunContractV2Stops.statusesByIndex`)

**Why.** `statusesByIndex` returns `'active'` for the first index whose
`objectiveComplete` is false, ignoring `stopTicketsPaidByIsland`. The modal
open-path separately enforces `isStopTicketPaid`, so this is not exploitable
today — but every telemetry/HUD consumer that reads `statusesByIndex`
misreports "active" for a ticket-locked stop. Fix: pass
`stopTicketsPaidByIsland` + current island key into the resolver and emit a
new `'ticket_required'` status for the first-incomplete stop whose ticket
hasn't been paid.

---

### P1-12. Essence drift threshold collapses at end-of-island — ✅ Closed (session 6)
See the Closed section below.

---

### P1-13. `performIslandTravel` cleanup for per-island state maps — ✅ Closed (session 6, ticket map only)
Ticket-map cleanup closed. The bonus-tile field does not land until P1-3's
renderer wiring ships, so the sanitizer call in `performIslandTravel` will
be added alongside that PR. See Closed section below for the ticket
cleanup.

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

### P2-10. `seededRandom(0)` corner case — ✅ Closed (session 6)
See Closed section below.

### P2-11. `DiceRegenState.maxDice` is really a minimum floor
**Files:** `src/features/gamification/level-worlds/services/islandRunDiceRegeneration.ts`

**Why.** Contract §3B says "no hard cap" on dice regen, and `applyDiceRegeneration`
treats `minDice` as a minimum-roll floor (regen never exceeds it, but the player
can hoard arbitrarily above it). The persisted field is named `maxDice`, which
invites future readers to add an incorrect upper clamp. Either rename
the runtime field to `minRollFloor` (with a migration to copy the stored
value) or add an explicit docblock on the `DiceRegenState` type saying the
name is historical and the value is a floor, not a cap.

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

## Closed in session 6 (2026-04-19)

### ✅ P1-12. Essence drift no longer collapses at end-of-island
`applyEssenceDrift` now short-circuits to zero loss when the caller
explicitly reports `remainingIslandCost <= 0`. Previously the
`Math.max(1, Math.floor(remainingRaw))` clamp turned a zero remaining
cost into a threshold of `⌊1 × 1.5⌋ = 1`, and every essence unit above 1
was counted as "excess" and drifted away — the inverse of the contract's
"nothing left to build → no drift" semantics. This reliably bit the
L3/L3/L3/L3/L3 window where all 5 buildings are fully funded but the
`isIslandComplete` flag hasn't flipped yet (still waiting on objectives,
egg hatch, or boss). The fallback-path clamp (when `remainingIslandCost`
is omitted) is preserved so legacy callers don't regress. Two new
regression tests cover the `remainingIslandCost: 0` case and the
defensive `remainingIslandCost: -42` case; total essence-build suite
gains 2 cases.

### ✅ P1-10. Encounter completion ticks the reward bar
A new `RewardBarProgressSource` variant `{ kind: 'encounter_resolve' }`
contributes `ENCOUNTER_REWARD_BAR_PROGRESS = 3` (above chest's 2 because
encounters are once-per-island + gated by an interactive mini-task, below
a creature-feed's 4). `resolveIslandRunContractV2RewardBarProgressDelta`
returns `{ progressDelta: 3, feedingActionDelta: 1 }` for the new kind so
the active timed-event feeding counter ticks alongside the bar.
`applyEncounterReward` in `IslandRunBoardPrototype.tsx` calls
`applyIslandRunContractV2RewardBarProgress` with the active
`effectiveMultiplier`, matching the dice-multiplier amplification rule
for feeding tiles (§2E). If the encounter tick pushes the bar past its
threshold, the same auto-claim cascade as the feeding-tile path fires
with a 500 ms settle delay. Two reward-bar test cases added (progress =
3 at ×1, progress = 15 at ×5).

### ✅ P1-13. `performIslandTravel` clears stale paid stop tickets
`performIslandTravel` now writes `stopTicketsPaidByIsland[oldIslandKey] = []`
alongside the existing `completedStopsByIsland[oldIslandKey] = []` clear.
Without this, a cycle wrap from island 120 → 1 would leave the previous
cycle's paid tickets in the ledger and unlock stops 2–5 for free on the
next visit to that island number (the map is keyed by `String(islandNumber)`
with no cycle suffix). The persist-patch layer merges record fields by
shallow spread (never deletes keys), so we explicitly overwrite the entry
with an empty array rather than trying to `delete` the key — same pattern
the completed-stops clear uses. The bonus-tile cleanup half of the original
P1-13 scope defers to P1-3's renderer-wiring PR where the runtime field
actually lands.

### ✅ P2-10. `seededRandom(0)` no longer collapses the tile pool
`seededRandom` in `islandBoardTileMap.ts` now normalises seed=0 via
`s = (seed | 0) || 1`. The xorshift operations on a starting state of 0
stayed at 0, which made the downstream `Math.floor(rand * TILE_POOL.length)`
pick `TILE_POOL[0]` (`currency`) for every non-encounter tile — a silent
all-currency degenerate board any time `islandNumber = 0` reached the
helper. Production callers pass island numbers ≥ 1, but dev/QA paths
could hit it. A regression test in `islandBoardTopology.test.ts` asserts
the seed-0 tile map yields ≥ 3 distinct tile types.

---

## Closed in session 5 (2026-04-19)

### ✅ Roll cost softened from `2 × N` to `1 × N` dice per roll
Playtest feedback: the ×1 default (2 dice per roll) burned fresh-session
pools too quickly. `DICE_PER_ROLL` in `islandRunRollAction.ts` and
`BASE_DICE_PER_ROLL` in `islandRunContractV2RewardBar.ts` both drop to **1**.
`resolveDiceCostForMultiplier` and `clampMultiplierToPool` are unchanged
(they derive from `BASE_DICE_PER_ROLL`). Canonical contract §2A, §2E (tier
table), §3 Dice, and the §8 "Note on roll cost" block all updated to the
new formula. Test suite (`islandRunRollAction.test.ts`,
`islandRunContractV2RewardBar.test.ts`) re-anchored to the new cost:
`×1 = 1`, `×3 = 3`, `×5 = 5`, 5-parallel-rolls drains `100 → 95`.

### ✅ `performIslandTravel` dice-pool desync
`setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE)` is removed from
`performIslandTravel`. Hoarded dice now carry over across island travel
(including the `120 → 1` cycle wrap), matching contract §3 Dice: "dice are
only sourced from reward bar, stops, boss, events, shop, and passive regen
— never implicitly clobbered." This eliminates the previous desync where
the UI reset to 30 but the persist patch omitted `dicePool`, so the
Supabase/localStorage record retained the pre-travel value and snapped back
on the next hydration. The QA helpers `handleQaAdvanceIsland` and
`handleQaResetProgression` keep their explicit resets but now pass
`dicePool` and `tokenIndex` into their `persistIslandRunRuntimeStatePatch`
patches so their resets stay in sync with storage too. Contract §3 Dice
carries an explicit "dice pool is never implicitly reset" clause.

### ✅ Tile-reward write cross-field clobber
`awardContractV2Essence` and `deductContractV2Essence` in
`IslandRunBoardPrototype.tsx` switched from
`writeIslandRunGameStateRecord({record: {...runtimeStateRef.current, essence}})`
— which overwrote **every** runtime field with whatever ref snapshot the
caller held — to `persistIslandRunRuntimeStatePatch({patch: {essence, essenceLifetime*}})`.
The patch path does a read-modify-write at the storage layer, so when a
tile landing fires an essence award and a reward-bar apply in the same
React tick the two persists no longer clobber each other's disjoint
fields. The functional `setRuntimeState` updaters are preserved so
in-memory state also composes correctly. A fully serialised landing
service (rolling tile rewards into the same mutex as `executeIslandRunRollAction`)
remains P1-9 above.

### ✅ Landing RNG mis-seeded from stale `tokenIndex`
`resolveTileLanding` in `IslandRunBoardPrototype.tsx` now takes an explicit
`landingTileIndex` parameter (passed `currentIndex` by the only call site)
instead of reading the React `tokenIndex` state via closure. The previous
code seeded `landingSeed = island × 10k + tokenIndex × 100 + rollIndex`
**before** the `setTokenIndex(currentIndex)` call flushed, so the seed was
keyed to the tile the token left rather than the tile it actually settled
on — and the "Landed on tile #N" fallback toast printed the same wrong
index. Both now use the post-movement tile index, restoring the
"same landing on reload → same outcome" determinism the seed is designed
to provide.

---

## Closed in session 4 (2026-04-19)

### ✅ P0-1. Roll action: per-user mutex + synchronous persist + no renderer dice arithmetic
`executeIslandRunRollAction` now owns an in-module `Map<userId, Promise>`
mutex (`rollActionMutexes`, with a `__resetIslandRunRollActionMutexesForTests`
hook). Two rolls fired in parallel for the same session chain through that
mutex so the second roll's `readIslandRunGameStateRecord` always observes
the first roll's commit. The remote write is **awaited inside the mutex**
(the previous fire-and-forget `writeIslandRunGameStateRecord(...).catch(...)`
is gone) so Supabase writes serialise even when the UI queues multiple
intents back-to-back — `writeIslandRunGameStateRecord` still writes
localStorage synchronously at the top of its body, so the client remains
authoritative if the remote write fails. The action result now carries
`newDicePool` and `newRuntimeVersion` fields, and the renderer's post-roll
sync at `IslandRunBoardPrototype.tsx:3669` switched from a stale-closure
`dicePool - diceCostApplied` subtract to a functional-updater form
(`setDicePool((c) => Math.max(0, c - diceCostApplied))` + the matching
`setRuntimeState` functional updater), so mid-animation reward-bar payouts,
regen ticks, and encounter rewards are preserved rather than clobbered. The
stale "Each roll costs exactly 2 dice (flat, never varies)" docstring at the
top of `islandRunRollAction.ts` has been replaced with the canonical
`DICE_PER_ROLL × N` / §2E reference. New `islandRunRollAction.test.ts` adds
5 cases covering single-roll correctness, ×3 cost scaling, `insufficient_dice`
guard, the 2-rolls-in-parallel acceptance case
(verifying `runtimeVersion` bumps 10→11→12 and pool 30→28→26 rather than
dropping a delta), and a 5-rolls-in-parallel stress case proving the mutex
serialises arbitrary burst depth.

> **Out of scope for this PR (tracked elsewhere):** Folding tile-reward
> writes into the same mutex (requires a new
> `executeIslandRunTileRewardAction` service) and auditing every `setDicePool`
> arithmetic call site in the renderer. Those remain viable follow-ups once
> the rest of the roll-result surface (tile rewards, bonus-tile releases,
> stop payouts) needs the same serialisation guarantee — today the mutex
> already closes the `dicePool` + `tokenIndex` race which was the
> user-visible drift source.

---

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
the full multiplier tier ladder, the `1 × N` cost formula (softened from
`2 × N` in session 5), per-tier unlock gates, the auto-downgrade rule
(via `clampMultiplierToPool`), and the fact that hazards are amplified
too (so high multiplier = real risk). §3 Dice was updated to reference
§2E instead of claiming a flat cost.

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

