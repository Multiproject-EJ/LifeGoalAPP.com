# Island Run — Open Issues & Feature Backlog

Status: Living document
Last updated: 2026-04-22 (session 13 — P0-5 closed; canonical docs refresh follow-up tracked)
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

**Stage C — Migrate renderer action-by-action — 🟡 In progress (C1 + C2 + C3 atomic-travel landed).**
C1 (roll/dice/token) landed session 8. C2 (essence-award/spend/reward-bar/drift)
landed session 11. C3 atomic-travel slice landed session 12 — `travelToNextIsland`
in `islandRunStateActions.ts` replaces the four separate
`persistIslandRunRuntimeStatePatch` calls in `performIslandTravel` with one
atomic commit (the named "atomic-travel refactor" risk from the Stage C spec).
7 new integration tests (236 total). Still pending: the smaller C3 sub-items
(`openStopTicket`, `completeStop`, `spendStopBuildEssence`, the
`completedStopsByIsland` sync useEffect, and the QA helper patches), plus
C4–C7 (egg/market/travel/boss/shard-claim/companion/onboarding). Each
remaining domain adds its action(s) to `islandRunStateActions.ts` and deletes
the matching `setRuntimeState` / `persistIslandRunRuntimeStatePatch` /
`writeIslandRunGameStateRecord` call-sites plus their per-field `useState` /
`useEffect` pairs from `IslandRunBoardPrototype.tsx`.

**Stage D — Retire legacy APIs — ⏳ Pending final cleanup PR.** Once Stage C
is complete and a grep confirms zero call-sites, delete
`islandRunRuntimeState.ts`, `islandRunRuntimeStateBackend.ts`, and the
`runtimeStateRef` / `hasCompletedInitialHydrationSyncRef` /
`lastAppliedRuntimeVersionRef` guard refs from the renderer. Those guards
exist purely to patch over the multi-writer race and become unnecessary.

### P0-3. Roll mutex scope is too narrow — releases before client commit and animations 🔴

**Confirmed in code — 2026-04-20 audit.**

`executeIslandRunRollAction` holds `withIslandRunActionLock` only around
`performRollAction` (the server write). The mutex unlocks as soon as
`writeIslandRunGameStateRecord` resolves (`islandRunRollAction.ts:169,~232`).
`handleRoll` in `IslandRunBoardPrototype.tsx` then runs ~2 s dice + ~3–6 s
hop animation, and only after the hop calls `applyRollResult(...)` +
`setRuntimeState(freshRecord)` + `setPendingHopSequence(null)` (~L3803–3810).

During that multi-second window:
- `localStorage` + Supabase already hold the new `tokenIndex` / `dicePool` /
  `runtimeVersion`.
- `runtimeStateRef.current.runtimeVersion` is still the pre-roll value.
- Any other action that reads `runtimeVersion` for its patch base (encounter
  resolve, tile reward from the **previous** hop, shop purchase, claim reward)
  can interleave and build a patch from a stale version, potentially overwriting
  freshly-persisted fields.

`isAnimatingRollRef` gates hydration only (~L1451–1458); it does not gate
other gameplay actions. This is the single largest architectural fragility in
the current loop.

**Recommended fix.** Either (a) extend the mutex to span the full
`applyRollResult` commit, or (b) introduce a `rollInFlight` barrier that all
other `withIslandRunActionLock` operations respect, similar to how
`isAnimatingRollRef` already gates hydration. Option (b) is lower-risk during
Stage C migration because it doesn't require holding the mutex across animation
duration.

**Files:**
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
  (~L169, ~L232 — mutex release point)
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L1451–1458 — `isAnimatingRollRef`; ~L3803–3810 — post-hop commit sequence)
- `src/features/gamification/level-worlds/services/islandRunActionMutex.ts`

---

### P0-4. Island completion contract diverges between legacy and Contract-V2 paths 🔴

**Confirmed in code — 2026-04-20 audit.**

The two completion definitions do not agree:

- **Contract-V2** (`islandRunContractV2StopResolver.ts:66–78`): island is
  "fully cleared" when all 5 stops have both `objectiveComplete` and
  `buildComplete: true`, AND the hatchery egg is resolved.
- **Legacy** (`IslandRunBoardPrototype.tsx:5569–5616`): clearing triggers on
  `activeStopId === 'boss'` completion — no build check, no egg check.

`ISLAND_RUN_CONTRACT_V2_ENABLED` is a runtime feature flag. If it changes
mid-run: a player who completed the boss legacy-style may become stuck (flag
flips ON, new contract sees missing build completions), or advance too early
(flag flips OFF mid-build). There is no migration or completion-state backfill
on flag change.

**Recommended fix.** Consolidate into a single `isIslandComplete(record,
islandNumber, flagEnabled)` helper that both the renderer and the V2 resolver
delegate to, so the definition is provably identical and the flag is one
if-branch inside it rather than two independent code paths.

**Files:**
- `src/features/gamification/level-worlds/services/islandRunContractV2StopResolver.ts`
  (L66–78)
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (L5569–5616)

---

### P0-5. `travelToNextIsland` has no mutex and is not idempotent — ✅ Closed (session 13)

**Resolution landed — 2026-04-22 (session 13).**

- `travelToNextIsland` is now async/await and no longer fire-and-forget.
- Renderer `performIslandTravel` now executes through `withIslandRunActionLock`.
- Added `isTravellingRef` re-entry guard so double taps cannot start overlapping travel commits.
- Travel action tests now await the Promise-returning action contract.

**Original issue (kept for traceability):**

`travelToNextIsland` (`islandRunStateActions.ts:457–605`) calls
`void commitIslandRunState(...)` (fire-and-forget) and returns synchronously.
`performIslandTravel` in the renderer (~L5236) invokes it **without**
acquiring `withIslandRunActionLock`.

Consequences:
- Two concurrent invocations (double-tap on the celebration CTA, or a travel
  triggered while a hop is landing on the last tile) each read the pre-travel
  snapshot, both save the current active egg into `perIslandEggs[oldKey]`,
  both increment `runtimeVersion`, both emit commits — the second overwrites
  the first's already-restored new-island egg with a second copy of the
  pre-travel egg, potentially destroying the active egg the player acquired
  on the arriving island.
- This is the most likely source of "lost egg on island boundary" field reports
  if any exist.

**Recommended fix.** Wrap `performIslandTravel` in `withIslandRunActionLock`
(same mutex as roll + tile-reward). Add a guard flag
(`isTravellingRef.current`) analogous to `isAnimatingRollRef` so the
celebration CTA is disabled while travel is in-flight. Then make
`travelToNextIsland` awaitable by awaiting the `commitIslandRunState` call.
Add an integration test: call `travelToNextIsland` twice back-to-back from the
same snapshot and assert `runtimeVersion` is strictly monotonic and
`perIslandEggs` / active egg are stable.

**Files:**
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  (L457–605 — `travelToNextIsland`, fire-and-forget commit)
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L5236 — `performIslandTravel`, no lock)
- `src/features/gamification/level-worlds/services/islandRunActionMutex.ts`

---

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

### P1-3. Glowing bonus tile with 9-hit accumulator — ✅ Logic + persistence layer closed (sessions 3 & 10)
The pure service (`islandRunBonusTile.ts`) + its 12-case unit suite + the
contract §5E spec merged in session 3. Session 10 added the runtime-state
field `bonusTileChargeByIsland` (migration 0230), wired sanitize/merge/patch
through the store + backend, and hooked `performIslandTravel` to clear the
ledger on island travel. The remaining follow-up is pure renderer surface:
the dot-lamp HUD, the released-burst animation, the 3D prop, and the
charge/release call-site inside the tile-landing handler. That PR rides
with P1-2's other new tile types.

**⚠️ 2026-04-20 audit note — `applyBonusTileCharge` call-site is confirmed
missing.** A grep across the full repo finds zero call sites for
`applyBonusTileCharge` outside the service itself and its tests. The bonus-tile
mechanic is live in the state model and persistence layer but produces no
in-game rewards because the tile-landing handler never increments the charge.
This is the most visible outstanding gap in the P1-3 follow-up PR. Priority
elevated: the renderer integration must ship alongside the HUD work, not after
it.

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

### P1-9. Fold tile-reward writes into a serialised service — ✅ Closed (session 11)
**Files:**
- `src/features/gamification/level-worlds/services/islandRunActionMutex.ts` (new)
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts` (new)
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts` (refactored to share the mutex)
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (`resolveTileLanding` rewired)
- `src/features/gamification/level-worlds/services/__tests__/islandRunTileRewardAction.test.ts` (6 new cases)

**Resolution.** Every tile landing previously fired TWO independent
`persistIslandRunRuntimeStatePatch` calls in the same React tick — one for
essence (via `awardContractV2Essence` / `deductContractV2Essence`) and one
for reward-bar progress. Each patch did its own async read-modify-write and
both hydrated the same pre-landing snapshot before writing a full record
through the commit coordinator, so the later write silently overwrote the
earlier write's delta. A tile reward fired in the same tick as a roll
commit was subject to the same race. Session 11 consolidates both halves
into `executeIslandRunTileRewardAction`, which hydrates once, computes the
combined next state, and persists a **single** patch with every affected
field. All gameplay actions (roll + tile-reward) now share the same
per-user async mutex via `withIslandRunActionLock`, so a tile-reward
commit can never interleave with an in-flight roll. The existing
`awardContractV2Essence` / `deductContractV2Essence` helpers are retained
for non-tile callers (story episode reward, stop ticket purchase, shop
purchase) that don't pair essence with reward-bar progress and thus don't
hit the two-write race. Regression test `islandRunTileRewardAction` fires
a roll and a tile-reward in parallel and asserts both deltas survive.

---

### P1-10. Encounter resolution must tick the reward bar — ✅ Closed (session 6)
See the Closed section below.

---

### P1-11. Stop status reporting ignores ticket-paid state — ✅ Closed (session 9)
See the Closed section below.

---

### P1-12. Essence drift threshold collapses at end-of-island — ✅ Closed (session 6)
See the Closed section below.

---

### P1-13. `performIslandTravel` cleanup for per-island state maps — ✅ Closed (session 10)
Ticket-map cleanup closed in session 6; session 10 landed the remaining
`bonusTileChargeByIsland` field (migration 0230 + store/backend/patch plumbing)
and wired `performIslandTravel` to clear the old island's bonus-tile charges
via an explicit-empty inner-map patch. Both per-island maps are now cleared
on island travel, so a cycle 120 → 1 wrap starts with a fresh ring and an
unfunded bonus accumulator. The same plumbing unblocks the remaining P1-3
renderer wiring (below) and the P1-2 bonus-tile renderer.

---

### P1-14. Hydration SELECT list is hand-maintained — new columns silently drop

**Files:**
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
  (~L1205 — explicit select string in `hydrateIslandRunGameStateRecordWithSource`)

The main Supabase hydration path uses an explicit ~57-column
`select('runtime_version, first_run_claimed, …')` string rather than
`select('*')`. If a new column is added to `IslandRunGameStateRecord` (and the
matching migration) without also editing that string, hydration silently
returns `undefined` for the new field — the sanitizer replaces it with the
type default and the Supabase value is invisible until a full record write
reconciles. The legacy `select('*')` fallback only fires on schema-mismatch
errors, so this truncation is never surfaced.

Every new persisted field is a trip hazard. Migration 0229 (`stop_tickets_paid_by_island`,
`last_essence_drift_lost`) and migration 0230 (`bonus_tile_charge_by_island`)
have already been caught manually; the pattern will recur.

**Recommended fix.** Either switch the primary hydration path to `select('*')`
with a schema-shape assertion after deserialise (so any shape drift is caught
at runtime rather than silently defaulted), or add a CI lint step that diffs
the column list against the `IslandRunGameStateRecord` field list and fails if
they diverge.

---

### P1-15. Patch-merge accumulates empty-value island keys indefinitely

**Files:**
- `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts`
  (~L241–302 — shallow-merge for `completedStopsByIsland`,
  `stopTicketsPaidByIsland`, `perIslandEggs`, `marketOwnedBundlesByIsland`,
  `bonusTileChargeByIsland`)

The patch-merge strategy for all `Record<string, …>` fields uses shallow
spread — it overlays new keys onto existing keys but **never removes a key**.
Clearing an island's entry requires patching `{ [key]: [] }` or `{ [key]: {} }`,
which leaves the outer key permanently in the object. Across 120 islands ×
multiple cycles the record accumulates empty-value keys. At high lap counts
this bloats both the Supabase row and localStorage, and slows every
`serialize` / `deserialize` call.

**Recommended fix.** Add a `pruneEmptyIslandKeys(record)` pass in either
`commitIslandRunState` or on hydrate (guarded by a configurable key-count
threshold so it only fires when the record is actually large). The pruner
drops any key whose value is `[]` or `{}`.

---

### P1-16. `cycleIndex` is unbounded; `effectiveIslandNumber` scaling has no endgame cap

**Files:**
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  (~L472–476 — `cycleIndex` increment, no cap)
- `effectiveIslandNumber = resolvedIsland + cycleIndex * 120` (~L380)

`travelToNextIsland` wraps island 121 → island 1 of cycle N+1 and increments
`cycleIndex` with no ceiling. `effectiveIslandNumber` drives essence costs,
rewards, stop ticket prices, and dice costs. There is no soft-cap, no
endgame state, and no sanity check against numeric overflow. Long-running
saves can reach regimes the economy tuning was never tested against (e.g.
cycle 100 → `effectiveIslandNumber = 12001`, which may break stop-ticket
curves, drift thresholds, or UI display).

**Recommended fix.** Document the intended maximum cycle in the canonical
contract and add a `Math.min(cycleIndex, MAX_CYCLE_INDEX)` cap (or a flat
`effectiveIslandNumber` cap) to prevent unbounded scaling. Add a test asserting
the economy functions remain in-range at the boundary.

---

### P1-17. Tile-reward double-fire risk — server-side idempotency window unknown

**Files:**
- `src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts`
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`

`executeIslandRunTileRewardAction` (P1-9, session 11) consolidates both
essence and reward-bar into one serialised patch per landing. However, there is
no per-tile, per-lap "already rewarded" ledger in the client record; any bug
that fires `resolveTileLanding` twice for a single landing (re-render while the
hop promise is in-flight, double-fire from `onHopSequenceComplete` — see
P1-18, or a landing triggered while P0-3's mutex window is open) awards the
reward twice.

The server-side `island_run_commit_action` RPC deduplicates by
`client_action_id` (migrations 0217/0228), but the dedup window is only as
long as the action-log retention. Rapid double-fire with different
`client_action_id` values could slip through.

**Recommended fix.** Confirm the action-log dedup window covers the full
session lifetime. If not, add a small `lastRewardedTileIndex + runtimeVersion`
guard in the tile-reward action so a second call with the same version is a
no-op.

---

### P1-18. `onHopSequenceComplete` callback can double-invoke on re-render

**Files:**
- `src/features/gamification/level-worlds/components/board/BoardStage.tsx`
  (L299–364 — animation effect, `lastHopSequenceRef` guard)
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L6930–6944 — `onHopSequenceComplete` handler)

The animation effect in `BoardStage.tsx` depends on
`[tokenIndex, anchors, pendingHopSequence]`. The `lastHopSequenceRef` guard
prevents the animation from re-running, but the `.then(() =>
onHopSequenceComplete?.())` callback from the first run is already enqueued; it
fires even if the effect re-runs in between. The current handler is tolerant
(nulls `hopSequenceResolverRef`, making a second call a no-op), but any future
addition to the callback — telemetry, audio, tile-landing trigger — will
double-fire. This interacts directly with P1-17.

**Recommended fix.** Lift the `lastHopSequenceRef` guard into the callback
itself (a one-shot flag keyed to the hop sequence ID) so double-fire is
structurally impossible, independent of what the callback body does.

---

### P1-19. Payment-without-completion UX trap in stop modals

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L2893–2947 `handlePayStopTicket`; ~L5443–5492 `handleCompleteActiveStop`;
  ~L7568 modal Close button)

`handlePayStopTicket` deducts essence and persists `stopTicketsPaidByIsland`.
`handleCompleteActiveStop` is the one that sets `objectiveComplete`.
The modal Close button does `setActiveStopId(null)` with no state rollback.

If a player pays the ticket then closes the modal without completing the stop:
essence is gone, the stop is still locked (objective not complete), and there
is no rollback. The player must re-open the modal and complete the stop to
progress. This is not an exploit but is a UX flow that will surface as "the
game took my essence".

**Recommended fix.** Either (a) show an explicit "You paid — tap here to begin
the stop" prompt so the player cannot accidentally dismiss without a clear
recovery path, or (b) unify "pay ticket" and "enter stop" into a single CTA
that opens the stop interaction immediately after payment.

---

### P1-20. Mystery stop fallback renders no completion affordance (soft-lock risk)

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L7320–7365 — mystery modal renderer)
- `src/features/gamification/level-worlds/services/islandRunStops.ts`
  (~L111 — `mysteryContentKind` seeded pool)

The mystery modal switch falls through to a bare
`<p>Complete this mystery stop to progress.</p>` paragraph with no button if
`mysteryContentKind` is `undefined` or an unrecognised value. `mysteryContentKind`
is seeded from a fixed pool so it should always be set — but any data migration,
older saved record, or new content kind added to the union without updating the
renderer switch silently soft-locks the player on that stop.

**Recommended fix.** Replace the no-button fallback with an explicit error UI
that surfaces the unrecognised kind value to the player (and fires a telemetry
beacon) and offers a "skip stop (no reward)" escape hatch so the player is never
hard-blocked.

---

### P1-21. Island travel is not guarded against in-flight roll animation

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L1459 — `isAnimatingRollRef` (gates hydration only);
  ~L5236 — `performIslandTravel` (no animation gate))

`isAnimatingRollRef` blocks hydration while a hop is playing, but does **not**
block `performIslandTravel`. A travel triggered while a hop is still animating
will reset `tokenIndex` to 0 mid-animation; when `applyRollResult` runs
afterward it re-reads from localStorage and the pawn snaps. The practical
trigger is landing on tile 40 (the boss tile) from a preceding hop that hasn't
resolved yet — unlikely in normal play but deterministic in fast-forward QA
paths.

**Recommended fix.** Gate `performIslandTravel` (and the celebration CTA that
calls it) behind `isAnimatingRollRef.current`. This is the same one-line guard
already used for hydration; applying it to travel closes the snap race with no
additional state.

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

### P2-11. `DiceRegenState.maxDice` is really a minimum floor — ✅ Closed (session 9)
See the Closed section below.

---

### P2-12. Hop-ordering invariant is vigilance-only — not encoded in a helper or test

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L3796–3825 — post-roll ordering comment + code)
- `src/features/gamification/level-worlds/components/board/BoardStage.tsx`
  (L298–356 — effect dependency on `pendingHopSequence`)

The required ordering `applyRollResult(…)` → `setRuntimeState(freshRecord)` →
`setPendingHopSequence(null)` (see stored memory "hop animation lifecycle") is
load-bearing: reversing the last two steps causes `BoardStage`'s effect to see
`pendingHopSequence === null` with a stale `tokenIndex` and animate the pawn
backward via the single-step fallback. The constraint is documented in a
comment 10 lines from the code — purely vigilance-based.

**Recommended fix.** Extract the three calls into a single `commitRollLanding(record, hopSequenceRef)`
helper that enforces the ordering structurally. Add a test that calls it with a
deliberate ordering violation and asserts the pawn position is correct.

---

### P2-13. Roll server-write failure is swallowed; no retry queue or failure telemetry

**Files:**
- `src/features/gamification/level-worlds/services/islandRunRollAction.ts`
  (~L231–238 — error swallowed with `warn + continue`)

`islandRunRollAction.ts` swallows remote write failures with a `console.warn`
and continues. `localStorage` is authoritative, `Supabase` is stale. Subsequent
local patches can slide the local `runtimeVersion` past Supabase without
re-attempting the failed commit (because `persistIslandRunRuntimeStatePatch`
does not bump `runtimeVersion`). The only recovery is a full re-hydration.
There is no retry queue, no `lastFailedClientActionId`, and no telemetry beacon
for persistent failure.

**Recommended fix.** On remote write failure, enqueue the failed record into
the existing `pending_write` localStorage queue (same mechanism that session 7
added for transient errors) and fire a telemetry event so the failure rate is
visible. A background flush on next successful online event (already partially
wired via `writeIslandRunGameStateRecord`'s `pending_write` path) should then
re-attempt.

---

### P2-14. Offline multi-device sync is last-write-wins — no per-field conflict resolution

**Files:**
- `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`
  (`writeIslandRunGameStateRecord`, `runtimeVersion` monotonic gate)

Two devices completing the same island offline then reconnecting rely on
`client_action_id` dedup in the action log for per-action idempotency, but
per-row commits are a straight `upsert` at the highest `runtimeVersion`.
`runtimeVersion` is monotonic per-device, not globally unique — two devices
diverging offline each increment from the same base, so the "winner" is
whichever device writes last. This is documented as a known limitation but not
explicitly tracked as an open issue.

**Note:** The session-7 `forceRemote: true` hydration fix closes the
"phone shows island 6, desktop shows island 1" presentation-layer symptom. The
underlying last-write-wins data layer remains.

---

### P2-15. `setRuntimeState(freshRecord)` after `applyRollResult` is redundant (dual source of truth)

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L3803–3810)

After Stage C1, `tokenIndex` / `dicePool` / `spinTokens` are store-derived via
`useIslandRunState`. The legacy `runtimeState` `useState` is still mirrored,
creating two simultaneous sources of truth. A 1-tick desync window exists
between the store mirror publishing and the React `setState` flushing. In
practice benign, but any future "remove the legacy mirror" refactor must audit
every `runtimeState.tokenIndex` read site. Track here as a cleanup target once
Stage C is complete.

---

### P2-16. Unmount during animation produces pawn teleport on re-mount

**Files:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
  (~L1001–1007 — cleanup effect clears `hopSequenceResolverRef`)

The cleanup effect on unmount clears `hopSequenceResolverRef` and sets
`isAnimatingRollRef.current = false`. If unmount happens mid-hop, the trailing
`applyRollResult` / `setPendingHopSequence(null)` run against an unmounted
component (React no-ops them). The server commit already happened, so the next
hydration corrects the display — but the user sees a pawn teleport with no
animation. Low probability in normal use; higher in tab-switch scenarios.

---

### P2-17. `marketOwnedBundlesByIsland` is not cleared on island travel — intent undocumented

**Files:**
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  (`travelToNextIsland` — clears `completedStopsByIsland`, `stopTicketsPaidByIsland`,
  `bonusTileChargeByIsland` on travel, but not `marketOwnedBundlesByIsland`)

Three of the four per-island maps are explicitly cleared when travelling to a
new island; `marketOwnedBundlesByIsland` is not. This asymmetry is not commented.
It may be intentional (shop purchases persist across cycle revisits) or an
oversight. Either way, no code comment documents the design decision.

**Recommended fix.** Add an inline comment in `travelToNextIsland` explicitly
stating whether `marketOwnedBundlesByIsland` is retained by design, to prevent
a future reader "fixing" what isn't broken.

---

### P2-18. Contract-V2 `stopStatesByIndex` default silently repairs V1-era records

**Files:**
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`
  (~L539–549 — writes a length-5 default array on every travel)

`travelToNextIsland` unconditionally writes a fresh length-5 default
`stopStatesByIndex` array. A record from the V1 era with
`stopStatesByIndex === undefined` is silently repaired here on travel — which
is probably the correct behaviour — but there is no explicit migration test for
the V1→V2 upgrade path. If the flag ever flips from V1 to V2 mid-run for an
existing user, the first travel call is the only place the repair occurs; if
the flag flips before any travel (e.g. on a fresh island), the repair never
runs and V2 resolver reads `undefined` as an empty array.

**Recommended fix.** Add a `sanitizeStopStatesByIndex` guard in the V2 resolver
that treats `undefined` as "all defaults" so it never reads a bare `undefined`,
and add a test covering the V1-era record → V2 resolver path.

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

## Closed in session 9 (2026-04-20)

### ✅ P1-11. Stop status reports `'ticket_required'` for ticket-gated active stops
`resolveIslandRunContractV2Stops` now accepts optional
`stopTicketsPaidByIsland` + `islandNumber` params. When supplied, the
first-incomplete stop whose ticket (index > 0) is unpaid is emitted as
`'ticket_required'` in `statusesByIndex`, so HUD and telemetry consumers can
tell a ticket-locked stop apart from a genuinely interactable active one
(the previous behaviour collapsed both to `'active'`). Hatchery (stop 0) is
implicitly free and never reports `'ticket_required'`. Omitting the params
preserves the legacy two-state `'active' | 'locked'` behaviour verbatim for
any caller that doesn't track tickets. The `IslandRunContractV2StopStatus`
union gains the `'ticket_required'` variant. The renderer's single UI
consumer (`stopStateMap` in `IslandRunBoardPrototype.tsx`) passes the new
params and maps `'ticket_required'` → `'active'` for visual UI parity —
ticket enforcement on stop-modal open is unchanged (still handled by
`doesStopRequireTicketPayment` + `isStopTicketPaid`). Six new resolver test
cases cover: ticket unpaid → `ticket_required`, ticket paid → `active`,
hatchery-first-incomplete is never `ticket_required`, omitted params
preserve legacy behaviour, per-island ledger scoping (island 2 ticket
doesn't unlock island 1), and all-complete final state reports five
`completed`.

### ✅ P2-11. `DiceRegenState.maxDice` documented as a floor (not a cap)
Added an explicit docblock on `DiceRegenState` clarifying that `maxDice` is
the **passive-regen ceiling / minimum-roll floor**, not an upper clamp on
the wallet. The pool can and does exceed `maxDice` via rewards, stops,
boss payouts, events, shop purchases, and `currency`/`chest` tile rewards
(contract §3 Dice: "no hard cap"). Explicit "do not clamp" warning for
future readers. Field is not renamed to `minRollFloor` because it is
persisted in both localStorage and the `island_run_runtime_state` row —
a rename would require a migration for zero functional gain since this
is purely a naming-hygiene issue.

---

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

---

## Audit notes — 2026-04-20 game-loop deep-dive (session 12)

A full audit of the game loop — dice roll → pawn hop → tile landing → stop
resolution → island completion → travel → persistence — was completed in
session 12. The items filed above as P0-3 through P2-18 originate from this
review. The following findings from that session were investigated and
confirmed to be **false positives** (not bugs):

- **`clearCreatureCollectionForUser` does not clear active companion** — it
  does, at `creatureCollectionService.ts:257`
  (`window.localStorage.removeItem(getActiveCompanionStorageKey(userId))`).
  Reset flow is correct.

- **Reward-bar discriminated union is inconsistent** — confirmed consistent
  across `islandRunContractV2RewardBar.ts`, tile-reward action, and encounter
  flow.

- **StopIds drift across islands** — they do not; `stopId` is stable and
  completion is keyed by `(islandNumber, stopId)`.

- **Boss is a tile on the 40-tile ring** — incorrect premise; the ring is pure
  traversal. All 5 stops (including boss) are orbit-HUD structures external to
  the ring, per the canonical gameplay contract.

**Architectural themes identified in the audit (context for future work):**

1. **Mutex covers server write but not the client commit / animation tail.**
   The critical mutex boundary should extend through `applyRollResult` (P0-3).
   Today the boundary ends when Supabase responds.

2. **Ordering invariants live in prose, not types or helpers.** The roll →
   hop-clear ordering, travel pre/post state, and "write `{oldKey: []}` to
   clear" idiom are described in comments only (P2-12).

3. **Stage C migration is partially complete.** Store-derived state + legacy
   mirrors coexist; some paths read from one, some from the other (P2-15).
   `persistIslandRunRuntimeStatePatch` does not bump `runtimeVersion`.

4. **No integration test covers the full roll → land → complete stop → roll
   again → finish island → travel loop on a 40-tile board crossing island
   boundaries.** Unit tests are strong per-module; the seams between modules
   are where the bugs sit.
