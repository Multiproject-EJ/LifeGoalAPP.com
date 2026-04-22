# Island Run — Next TODO PR List

**Last updated:** 2026-04-22 (end of PR 13 batch)
**Context:** Continuation of the Island Run polish sweep on branch `copilot/investigate-120-island-game-again`. Hand this doc to the next agent session with a prompt like "do PR 12" or "do PR 12 and PR 13 together."

---

## ✅ Recap — what's already merged in this sweep

| PR  | Theme                     | Summary                                                                                                |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Foundation cleanup        | Hearts/coins retired + migration 0227; `EVENT_BANNER_META` de-duped; landmark vocabulary; ticket curve `[0,30,70,130,220]` |
| 2   | HUD + UX                  | Player level chip; attention dot on affordable landmarks; gated island-clear modal; 120-cycle capstone |
| 5   | Feel & juice              | Reward-bar rarity colors + snap; essence drift numbers; haptics a11y + throttle                        |
| 6   | Clarity & accessibility   | Dice regen ETA service; out-of-dice modal; roll-btn a11y; sticker "one away" nudge                     |
| 7   | Economy polish            | `resolveShopItemAffordability` service; `<ShopItemCostLine />`; HUD level-up flash                      |
| 8   | Build-panel parity         | Build panel now uses shared affordability readout, full-build chip, and next-cheapest highlight          |
| 9   | Egg-sell clarity            | Added egg-sell advisor with recommended badge/reason + tests for shards/dice choice heuristics           |
| 10  | Boss shortfall forecast     | Added boss-ticket shortfall projection service + HUD warning banner + tests                               |
| 11  | HUD progress chip            | Replaced misleading "island streak" with clear cumulative "islands cleared" topbar counter + increment animation |

Test suite baseline remains green via `npm run test:island-run` (see latest run in this PR).

---

## 📋 Next PR queue (suggested order)

Each entry is sized to be a single focused PR. Items are ordered by impact × risk; items in the same tier can be done in any order.

### ✅ PR 8 — Build-panel affordability parity (merged)
**Why:** The Build panel still uses bespoke "need X more" math while the Market panel uses the new shared service. Unifying them makes future currency tuning trivial.
- [x] Reuse `<ShopItemCostLine />` on each Building card for the "spend step vs. remaining essence" readout
- [x] Add a "Full build: N 🟣" chip per building so players see the total commitment before starting a hold
- [x] Highlight the next-cheapest-to-finish building with a soft ring so players have a clear "go here next" nudge
- [x] Extend `islandRunShopAffordability` (or add a sibling) to return a `nextCheapestIndex` helper; add unit tests

**Files to touch:**
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` (build panel JSX around line 7823+)
- `src/features/gamification/level-worlds/services/islandRunShopAffordability.ts` (extend) OR new `islandRunBuildPanelPlanner.ts`
- New test file under `services/__tests__/`

---

### ✅ PR 9 — Egg-sell reward preview clarity (merged)
**Why:** `getEggSellRewardOptions` returns tier-scaled (shards|dice) options but the modal doesn't currently show a side-by-side "which is better for you right now?" comparison.
- [x] New pure service `islandRunEggSellAdvisor.ts` that, given `{ tier, shardsBalance, diceBalance, nextStickerShardCost }`, returns `{ recommendedChoice: 'shards'|'dice', reason: string }`
- [x] Extend the sell modal in `IslandRunBoardPrototype.tsx` (around `handleSellEggForChoice`) to render a small "Recommended" badge on one option
- [x] Unit tests: near-sticker-completion prefers shards; fresh/empty dice prefers dice; tie → prefer shards (long-term progression)

**Files to touch:**
- `src/features/gamification/level-worlds/services/eggService.ts` (read-only reference for options)
- New `services/islandRunEggSellAdvisor.ts` + tests
- `components/IslandRunBoardPrototype.tsx` egg-sell modal JSX (~4272-4330)

---

### ✅ PR 10 — Boss-ticket shortfall forecast banner (merged)
**Why:** Boss ticket costs 220 essence scaled by island; players often reach the boss landmark with insufficient essence and have to grind. A forecast banner would close the loop.
- [x] Pure service: `projectBossEssenceShortfall({ essence, completedStops, avgEssencePerTile, tilesRemaining })` → `{ onTrack, shortfall, tilesNeeded }`
- [x] Show a subtle amber banner at the top of the HUD when boss is the only remaining unpaid landmark AND shortfall > 0
- [x] Dismiss logic: hide once affordable; re-show if balance drops back below
- [x] Unit tests for on-track, short, and already-paid cases

**Files to touch:**
- New `services/islandRunBossForecast.ts` + tests
- `components/IslandRunBoardPrototype.tsx` HUD top bar region

---

### ✅ PR 11 — Island-clears HUD progress chip (merged)
**Why:** The old copy implied a "perfect streak" even though normal progression already requires island clears before travel. This PR replaced that framing with a transparent cumulative progress counter.
- [x] Added a topbar progress chip near level/wallet with cumulative islands-cleared count
- [x] Added increment animation + `prefers-reduced-motion` guard
- [x] Introduced pure compute service + unit tests for cycle-wrap math
- [x] Clarified semantics in UI copy (progress counter, not a gated/perfect streak)

**Files to touch:**
- `services/islandRunGameStateStore.ts` (verify or add streak field)
- `components/IslandRunBoardPrototype.tsx` HUD
- `LevelWorlds.css` (extend `@keyframes island-run-level-chip-levelup` or add sibling)

---

### ✅ PR 12 — Creature manifest quick-access (merged)
**Why:** Hatched creatures go into the Hatchery manifest, but nothing in the HUD hints at whether unclaimed creatures are sitting there. Adds a small manifest badge.
- [x] Query `creatureCollectionService` for unclaimed count
- [x] Add a 🥚 badge with count next to the Shop button when > 0
- [x] Tapping opens the Hatchery directly

**Files to touch:**
- `services/creatureCollectionService.ts` (add `countUnclaimed` if absent)
- `components/IslandRunBoardPrototype.tsx` top-bar button cluster (~6140)

---

### ✅ PR 13 — Performance: memoize orbit-stop visuals (merged)
**Why:** `stopVisuals` in `BoardOrbitStops` is re-derived on every render; on lower-end devices this can cause ~2-3ms jitter during token travel. Stable memoization should cut that.
- [x] Wrap the derivation in `useMemo` keyed on `completedStops`, `stopTicketsPaidByIsland[islandKey]`, `essence`, `activeStopId`
- [ ] Profile before/after with the Performance tab on a throttled CPU (4×) to confirm
- [x] No behavioral change; purely perf

**Files to touch:**
- `components/IslandRunBoardPrototype.tsx` stopVisuals derivation
- `components/board/BoardOrbitStops.tsx` (already `memo`; verify prop stability)

---

### PR 14 — Canonical contract doc refresh
**Why:** `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` references pre-PR5 rarity colors and the old "30/60/100/150" ticket curve. Refresh it so agents and humans have one source of truth.
- [ ] Update §3 currencies (confirm hearts/coins retired)
- [ ] Update §Stop unlock rules with the steepened `[0, 30, 70, 130, 220]` curve
- [ ] Document the landmark orbit anchors + attention-hint affordability dot
- [ ] Document `<ShopItemCostLine />` as the canonical cost-readout component
- [ ] Document the dice regen ETA service contract
- [ ] Documentation only — no code changes, no tests

---

## 🧭 Bigger-picture candidates (multi-PR arcs)

If the small-PR queue feels well-handled, these are the next substantive feature arcs:

1. **Island theme variety**: the 40-tile ring currently reuses one background per island modulo theme. Add 3-4 distinct tile-art sets cycled by `effectiveIslandNumber % N`.
2. **Boss fight minigame**: the boss is currently a tap-to-resolve landmark. Design doc (no code) → 2-phase interaction → scope as a separate arc.
3. **Daily contract**: a per-day optional side quest (e.g. "complete 3 habit stops today") that grants essence/diamonds. Requires a new persistence table.
4. **Social/leaderboard hook**: optional opt-in weekly essence leaderboard. Needs RLS migration + edge function.

Each of these is a multi-PR arc — start it by writing a design doc PR (docs only) first so the agent can break it down.

---

## 🛠️ Conventions & gotchas for the next agent

- **Always use absolute paths** when editing files (the repo is at `/home/runner/work/LifeGoalAPP.com/LifeGoalAPP.com`).
- **Run `npm install` first** if `node_modules` is missing — the env has no prewarmed deps.
- **Test command:** `npm run test:island-run`. Current baseline: **154/154 passing**. Keep that number going up, never down.
- **Type-check:** `./node_modules/.bin/tsc -p tsconfig.json --noEmit`.
- **Commit via `report_progress`** only — `git push` is sandboxed.
- **Currency list** (active): dice, essence, shards, diamonds, spin tokens. No hearts, no coins.
- **Board profile:** `spark40_ring` (40 ring tiles + 5 landmark orbit buttons).
- **Stop taxonomy:** `hatchery | habit | mystery | wisdom | boss`.
- **Two `EVENT_BANNER_META` copies** exist (`IslandRunBoardPrototype.tsx` and `GameBoardOverlay.tsx`) — keep them in sync.
- **`prefers-reduced-motion`** guard is mandatory for any new keyframe animation.
- **Pure services + tests first, UI wiring second** — this sweep's pattern. It keeps diffs small and tests green.

---

## 🚦 Recommended next prompt

> "Do PR 12 (creature manifest quick-access) from `docs/gameplay/NEXT_TODO_PR_LIST.md`."

or, for a batch:

> "Do PR 12 and PR 13 from the next-todo list, each as its own commit."
