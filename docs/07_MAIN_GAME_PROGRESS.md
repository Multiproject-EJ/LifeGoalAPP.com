> [!WARNING]
> This document is no longer the primary authoritative gameplay source of truth.
>
> The canonical gameplay contract is now:
> `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
>
> This file may still contain useful supporting detail, implementation notes, or historical context, but it must not override the canonical gameplay contract.

# MAIN GAME PROGRESS — HabitGame Island Run

> **This document is the single source of truth** for canonical main-game rules and
> design.  All other docs under `docs/` are implementation references; if they conflict
> with anything here, this file wins.  See [Other docs and precedence](#other-docs-and-precedence).
>
> For the full island index see `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`.
> For the QA checklist see `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md`.

---

## Canonical Game Loop (120 islands)

The following rules define the **intended canonical design** and supersede any earlier or
conflicting description in the progress log entries below.

### Island progression

- **120 islands = 120 levels.** Islands are played in a fixed linear sequence
  (1 → 2 → … → 120 → 1 → …); the cycle index increments on each full lap.
  **The player progresses through islands in a fixed sequence and cannot skip or
  select specific islands.**
- **Each island has a 60-tile loop board** (Monopoly GO style) arranged around a pond.
  Tiles are a mix of currency, chest, hazard, egg_shard, encounter/event, and stop tiles.
- **Each island has exactly 5 required steps/stops** placed outside the 60-tile ring.
  **The Boss is always Step 5.**  Stop tiles on the board lead to these steps.
- **Step 1 must be completed before the player can roll dice** on a new island.
  This is the onboarding/orientation gate for each island.
- **Steps 2–4 vary per island** and commonly include mini-games, LifeGoal app actions
  (habits, goals, journal, check-ins), and utility actions (heart top-up, dice refill).
- **Island completion states:** not completed → partial → boss defeated → completed
  (everything collected/claimed).

### Shop

- **Shop is NOT one of the 5 steps.** The Shop is always accessible via a persistent
  button/tab, independent of island progress.
- After the boss (Step 5) is defeated, additional shop item tiers are unlocked.
- Egg selling in the shop is only enabled once an egg has hatched.
- The shop uses app-wide currencies (Coins, Diamonds, Hearts).

### Currencies

- **App-wide (persistent across all islands):**
  - **Coins** — general currency; primary tile and stop reward.
  - **Diamonds** — premium currency; 1 diamond = 1,000 coins.
  - **Hearts** — play energy; never reset; spent for dice conversion and sometimes for
    boss-attempt lives.  Starter conversion rate: **1 heart = 20 dice rolls** (scales
    to 30–50+ at later islands).
- **Island / mini-game currency (temporary):**
  - Earned on the board and via LifeGoal actions while on the active island.
  - Can only be spent within the currently active mini-game to buy a "go"/action.
  - **Lost when the player travels to a new island.**
- Rewards (tiles, stops, bosses, eggs) may award any of the above currencies; reward
  contents are revealed blind-box style.

### Eggs

- **One egg per island (one-time, permanent).** Each island has exactly one egg slot
  across **all cycles**.  Once an egg on that island has been sold or collected,
  **that island never provides a new egg again** — even when the player loops back
  on cycle 2+.
- Eggs have variety (color/tier) that affects hatch time and reward size.
- The egg timer starts when the island is **first visited**.  If the egg is not
  opened/sold before the island timer expires, the egg is left behind on that island.
  The player cannot travel back; on a later cycle they revisit the island and may
  collect/sell the already-hatched egg (second-pass advantage).

### Island timers

- The timer starts when the island is **first visited**.
- **Normal islands: 2 days.  Special islands: 3 days.**
- Timer expiry advances the player only when the **app is opened** (no background
  auto-advance).
- **Catch-up Rule A:** on resume, the player advances at most **one** island if the
  current island's timer has expired, regardless of how much real time has elapsed.
  (Named "Rule A" to distinguish it from potential future catch-up rules; no other
  catch-up rules are defined at this time.)

### Special islands

- There are **20 special islands** distributed within the 1–120 range.
- **Island 120 is always a special island.**
- At least one early island (**island 4 or 5**) is special, to introduce the concept.
- Special islands have higher rewards, harder bosses, and a **3-day timer** (vs 2 days
  for normal islands).

### Global mini-game calendar

- There are **5–10 mini-games**; only **one is globally active** at a time (the same
  active mini-game applies to all players).
- Each island's main mini-game maps to the currently active global mini-game.
- Mini-game entry becomes available after the relevant step unlocks it; the player can
  play anytime once unlocked, consuming earned island/mini-game currency (tickets).
- **Boss variety:** some bosses require reaching a sub-level in the current mini-game;
  approximately **25%** of bosses use alternate boss-game patterns for variety.

### Home Island (v0)

- Treat Home Island as a **UI hub / player menu overlay** using a chosen island
  background; it is not part of the 1–120 linear sequence.
- Used for managing equipment (e.g., shield), upgrades, and repeatable systems.
- Home hatchery is noted but not fully designed; keep it lightweight in v0.

### Timer / travel persistence

- The timer is based on a `started_at`/`expires_at` timestamp pair stored in Supabase.
- On expiry, the player advances to the next island; all per-island progress is
  frozen/committed before the new island starts.

---

## Data Model & Persistence Requirements

The following fields **must** be persisted (at minimum) in the Supabase game-state record.
Currently only a subset of these is fully persisted; gaps are noted in the "Known repo
reality" section.

| Field | Description |
|---|---|
| `island_number` | Current island/level pointer (1–120) |
| `cycle_index` | Full-lap counter (how many times the player has completed all 120 islands) |
| `token_index` | Current tile index on the 60-tile board (0–59) |
| `island_started_at` | ISO timestamp when the current island was entered |
| `island_expires_at` | ISO timestamp when the island timer expires and travel is forced |
| `hearts` | Current heart count |
| `dice` | Current dice count |
| `coins` | Current coin count |
| `diamonds` | Current diamond count (1 diamond = 1,000 coins) |
| `island_mini_game_currency` | Temporary per-island/mini-game currency balance (zeroed on island travel) |
| `steps_completed` | Per-island bitmask or array of which of steps 1–5 have been completed |
| `per_island_egg` | Per-island egg ledger: one entry per island, each with `tier`, `set_at`, `hatch_at`, `sold_at`/`collected_at`, and status |
| `shop_unlocks` | Global shop unlock state; which tiers are unlocked (post-boss unlocks) |
| `telemetry_markers` | Existing telemetry/debug event markers (keep as-is) |

---

## Other docs and precedence

`docs/07_MAIN_GAME_PROGRESS.md` (this file) is the **authoritative single source of
truth** for canonical main-game rules.  If any other document under `docs/` conflicts
with the rules stated here, **this file wins**.

The following docs provide implementation detail and context but are **not** canonical
overrides:

| Doc | Role |
|---|---|
| [`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md) | Earlier product-direction lock and economy rules — reference only; superseded here |
| [`docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`](./00_MAIN_GAME_120_ISLANDS_INDEX.md) | Island-system index, milestone tracker, and agent prompt entrypoint |
| [`docs/01_MAIN_GAME_AGENT_PROTOCOL.md`](./01_MAIN_GAME_AGENT_PROTOCOL.md) | AI agent execution rules and progress handoff format |
| [`docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md`](./02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md) | Database tables, migrations, and RLS policies |
| [`docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md`](./03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md) | Board renderer, tile coordinates, token movement, and QA |
| [`docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md`](./04_MAIN_GAME_EGGS_HATCHERY_HOME.md) | Egg lifecycle, stages, dormant carryover, hatchery rules |
| [`docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md`](./05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md) | Audio/haptics map, asset naming, and mini-game dev-plan template |
| [`docs/MAIN_GAME_120_ISLANDS_DOCSET_SUMMARY.md`](./MAIN_GAME_120_ISLANDS_DOCSET_SUMMARY.md) | High-level docset summary for external context |

---

## Known Repo Reality (as of 2026-03-02)

This section documents the **current implementation state** relative to the canonical design
so future developers have an accurate baseline.

- **`IslandRunBoardPrototype.tsx`** (`src/features/gamification/level-worlds/components/`)
  is the current primary implementation surface for the island run game loop.  All board
  rendering, tile resolution, stop modals, egg state, travel logic, and HUD live here.

- **`LevelWorldsHub.tsx`** (`src/features/gamification/level-worlds/`) routes between the
  legacy Level Worlds / `WorldBoard` flow and the Island Run prototype depending on the
  `islandRunPrototype` query param (default `true`; pass `islandRunDev=0` to reach the
  legacy board).

- **Persisted runtime markers (currently wired to Supabase):**
  `island_number`, `token_index`, `hearts`, `dice`, `coins`, `island_started_at`,
  `island_expires_at`, `egg_tier`, `egg_set_at`, `egg_hatch_at` (single global egg slot).
  Telemetry events are also written.

- **Not yet persisted:** Per-island egg ledger. The current implementation uses a single
  global `activeEgg` slot that carries across island travel (dormant egg carryover).
  Canonical design requires a separate ledger entry per island so eggs left behind on
  a prior island can be collected on a later cycle.

- **Market/Shop is currently modeled as a stop** (Stop 3 / tile 8 in the prototype stop
  plan). Per canonical design the shop should be separated from the 5-step plan and
  exposed as a persistent button always accessible from the HUD, with unlocks gated on
  boss completion.

- **Egg currently behaves as a single global `activeEgg` slot** and is carried forward
  (dormant) on island travel. Canonical design requires per-island egg tracking so the
  egg stays behind when the player travels and is recoverable on a later cycle.

- **Step 1 enforcement before dice** is not yet implemented. The player can roll at any
  time. Canonical design requires Step 1 completion as a gate before the first dice roll
  on each new island.

---

## Next Milestones

These milestones pick up after the current M1–M10 work (board foundation, movement, stop
modals, timer/travel, egg system, economy, encounter, home panel, audio/haptics) and drive
toward production readiness.

- **M11 — Per-island egg ledger (Supabase).** Implement a `per_island_eggs` table/jsonb
  ledger with one entry per island.  Replace the single global `activeEgg` slot.  Eggs
  left behind on travel are preserved; player can collect/sell on revisit (cycle index
  check).
- **M12 — Shop separation & unlock tiers.** Separate the Shop from the 5-stop plan.
  Add a persistent HUD Shop button always accessible.  Gate additional item tiers on
  boss (Step 5) completion.  Enable egg-selling only after an egg has hatched.
- **M13 — Step/stop enforcement UI.** Enforce Step 1 completion as a gate before the
  first dice roll on each new island.  Wire step progression tracking (steps 1–5) into
  the stop completion flow and persist per-island step state.
- **M14 — Real-time island timer (2–3 days).** Replace dev 45 s / 72 h static durations
  with a configurable `ISLAND_DURATION_DAYS` (default 2–3 days) derived from
  `started_at`/`expires_at`.  Handle hydration expiry (island already expired when app
  opens) and surface accurate time-remaining in the HUD.
- **M15 — Tile map service & per-tile resolution.** Extend `islandBoardTileMap.ts` to
  produce fully-typed per-tile payloads (currency amount, chest tier, hazard type,
  event/encounter pool) and wire them into `resolveTileLanding()` for realistic outcomes.
- **M16 — Mini-game integration into stop completion.** Wire real mini-games (e.g.
  ShooterBlitz) into step/stop completion results so stop success/fail outcomes gate
  progression and award canonical rewards.
- **M17 — 120-island cap & cycle loop.** Implement modulo-120 island number capping,
  cycle index increment on full-lap completion, and any cycle-dependent unlock logic
  (e.g. unlocking higher egg tiers on cycle 2+).

---

## Definition of Done (Main Game MVP)

The main game is considered **production-ready** when all of the following are true:

1. All 120 islands are reachable, each with a generated 60-tile board.
2. Step 1 is enforced as a gate before dice rolling on every new island.
3. Steps 2–4 vary per island and include at least one wired mini-game and one
   LifeGoal app action (habit/goal/journal/check-in).
4. Boss (Step 5) is implemented and awards canonical rewards on victory.
5. Shop is a persistent HUD button (not a stop), with post-boss tier unlocks and
   egg-selling enabled after hatch.
6. Per-island egg ledger is persisted in Supabase; eggs left behind are recoverable
   on the correct revisit cycle.
7. Real-time island timer (2–3 days) is implemented; expiry forces travel; hydration
   handles already-expired state correctly.
8. All game state (island pointer, timer, token, steps, eggs, shop unlocks, hearts,
   dice, coins) is fully persisted and restored across sessions.
9. 120-island loop/cycle logic is implemented with cycle index tracking.
10. Audio, haptics, and QA checklist pass for all core interaction events.

---

## Progress Log (newest first)

Date: 2026-03-07
Slice: M8-COMPLETE — Utility Stop + Shop Panel full production polish
Summary:
- Utility Stop (Stop 3) production-ready: replaced raw buttons with styled island-stop-modal__btn actions; heart refill hides when hearts already at MAX_HEARTS (10); timer extension option added (spend 3 💎 → +12h island timer); sound (utility_stop_complete), haptic, and telemetry fire on each action; Skip button completes stop without action.
- Shop panel production polish: Owned ✅ badges replace purchase buttons for already-owned Tier 1 (dice/heart bundle) and Tier 2 (heart boost bundle) items; insufficient-funds hint shows coin deficit inline; Tier 2 button wired to handleHeartBoostPurchase handler; shop open fires shop_open sound + telemetry; shop close fires telemetry; Escape key closes shop panel.
- Diamonds wallet currency added: initialized to 3 for new users, awarded from mythic egg opens (bundle.diamondsDelta), persisted to localStorage (island_run_diamonds_{userId}); 💎 HUD chip shown when > 0.
- marketOwnedBundles persisted to localStorage per user+island key (island_run_shop_owned_{userId}_island_{n}); restored on page reload; cleared on island travel.
- Added shop_open + utility_stop_complete to IslandRunSoundEvent; utility_stop_complete added to IslandRunHapticEvent with haptic pattern [20,35,20].
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build (zero errors; pre-existing chunk size warnings unrelated)
Next:
- M9-COMPLETE — Home island + hatchery slots production polish
Milestones closed: M8 ✅

Date: 2026-03-06
Slice: M1B-COMPLETE — Finish hybrid 3D board foundation for production
Summary:
- Added always-visible production HUD row (hearts, dice, coins, level, timer) to `IslandRunBoardPrototype.tsx`, outside the `isDevPanelOpen` gate so core game status is visible to all logged-in users without any URL flags
- Added CSS padding rule `.island-run-prototype__status-row--production` in `LevelWorlds.css` to match `always-controls` layout
- Confirmed board (17 anchor tiles, ring path canvas, background image, depth mask), token at starting position, and 5 outer stop markers already render unconditionally for any logged-in user — no additional rendering guards needed
- Confirmed `LevelWorldsHub.tsx` already routes to `IslandRunBoardPrototype` by default (`isIslandRunPrototype` defaults to `true`; only `?islandRunDev=0` switches to legacy board)
- Dev panel (`isDevPanelOpen`) remains collapsed by default; debug overlays (`showDebug`) remain off unless `?debugBoard=1`
Files changed: src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx, src/features/gamification/level-worlds/LevelWorlds.css, docs/00_MAIN_GAME_120_ISLANDS_INDEX.md, docs/07_MAIN_GAME_PROGRESS.md
Testing: npm run build (zero errors; pre-existing chunk size warnings unrelated)
Next: M2-COMPLETE — Finish dice movement + token animation production polish
Milestones closed: M1 ✅

Date: 2026-03-03
Slice: DESIGN — Collectible Progress Bar canonical design locked
Summary:
- New canonical doc docs/13_COLLECTIBLE_PROGRESS_BAR.md created covering the full shard sub-currency system
- 7 era-specific collectible types defined (Energy Cell, Bowl Token, Petal, Spark Shard, Memory Gem, Flux Orb, Prism Shard)
- Special island collectible: Star Fragment 🌟
- Repeating escalating milestone chain: T1(20)→T2(60)→T3(120)→T4(220)→T5(350)→T6(500)→T7+(+150/tier)
- Rewards are blind-box at claim time; app-wide and island-scoped currencies both in pool
- T5+ intentionally requires micro-transaction spend to reach within one island timer — primary monetisation lever
- Progress bar pill always visible: top of board view + Home Island overlay
- Island countdown timer relocated to sit below the pill in board view
- Build slices M16A–M16I defined; M16A (data model) is next build slice
- Data model: island_shards, shard_tier_index, shard_claim_count added to canonical requirements
Files changed:
- docs/13_COLLECTIBLE_PROGRESS_BAR.md (new)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- Docs-only; no build step required
Next:
- M16A: Data model — shard fields in Supabase + state types
Milestones closed: none (design doc only)

---

Date: 2026-03-06
Slice: M6-COMPLETE — Encounter tile (easy) + rewards production polish
Summary:
- Created `encounterService.ts` with 3 challenge types: quiz (7-item pool), breathing exercise (3-item pool, auto-completing countdown), and gratitude prompt (7-item pool). Seeded challenge selection varies by island + tile + 5-minute bucket.
- `rollEncounterReward()` rolls variable coin reward (5–15), 15% heart bonus, 25% wallet shard bonus. `formatEncounterRewardSummary()` builds human-readable reward string.
- Updated `islandBoardTileMap.ts`: replaced single `ENCOUNTER_INDEX` constant with `ENCOUNTER_INDICES` record by rarity — normal islands keep 1 encounter (index 6, day 2+ gate), seasonal islands get 2 encounters (indices 6 & 11), rare islands get 2 encounters (indices 6 & 11, always active).
- Replaced stub encounter modal with full challenge UI: quiz shows answer buttons (all answers complete), breathing shows pulsing orb + countdown (auto-completes via useEffect timer), gratitude shows textarea + Submit (disabled until non-empty input). Two-phase modal: 'challenge' → 'reward' with animated reward reveal.
- Replaced single `encounterResolved: boolean` with `completedEncounterIndices: Set<number>` for per-visit tile tracking. `activeEncounterTileIndex` tracks which tile opened the current modal.
- Landing on an already-completed encounter tile skips the modal and shows a brief status message.
- Encounter tiles show completed visual state (green glow + ✅ icon) after completion.
- `performIslandTravel` resets `completedEncounterIndices`, `activeEncounterTileIndex`, `currentEncounterChallenge`, `encounterStep`, and `encounterRewardData` — encounters are per-visit.
- Added Escape key handler for encounter modal (mirrors M3-COMPLETE stop modal pattern).
- Removed unused `ENCOUNTER_TILE_INDEX = 6` constant from IslandRunBoardPrototype.tsx.
- Added CSS: `.island-tile--encounter-completed` (green glow), `.island-stop-modal--encounter` sizing, challenge layout classes, breathing orb animation (`encounter-breathe`), reward reveal animation (`encounter-reward-pop`), gratitude textarea styles.
Files changed:
- src/features/gamification/level-worlds/services/encounterService.ts (new)
- src/features/gamification/level-worlds/services/islandBoardTileMap.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7-COMPLETE — Boss stop full production polish
Milestones closed: M6 ✅

---
Summary:
- Added islandStartedAtMs + islandExpiresAtMs to IslandRunRuntimeState, IslandRunGameStateRecord, and persistPatch contract
- getIslandDurationMs() helper: 48h for normal islands, 72h for special islands, 45s for devTimer mode
- performIslandTravel: sets and persists islandStartedAtMs + islandExpiresAtMs for each new island
- Hydration boot: restores timer from islandExpiresAtMs; Catch-up Rule A fires one advance if already expired
- Timer tick recomputed from islandExpiresAtMs on each second instead of simple decrement
- App.tsx overlay timer reads islandExpiresAtMs directly (simpler, no start-offset arithmetic)
- IslandRunBoardPrototype writes global summary key lifegoal_island_run_runtime_state for App.tsx overlay
- Migration 0170: island_started_at_ms + island_expires_at_ms columns on island_run_runtime_state
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/App.tsx
- supabase/migrations/0170_island_run_timer_columns.sql (new)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M16: Tile map service & per-tile resolution
Milestones closed: M15 ✅


Date: 2026-03-03
Slice: M13 — Per-island egg ledger (Supabase)
Summary:
- Added `per_island_eggs` JSONB column to `island_run_runtime_state` via migration 0169
- Added PerIslandEggEntry, PerIslandEggStatus, PerIslandEggsLedger types to islandRunGameStateStore.ts
- Added perIslandEggs to IslandRunRuntimeState and persistence patch type
- Read/write perIslandEggs in islandRunGameStateStore (Supabase upsert + localStorage fallback)
- Patch merge in islandRunRuntimeStateBackend merges at key level (preserves other islands' entries)
- handleSetEgg writes ledger entry for current island number on egg set
- handleOpenEgg marks ledger entry as 'collected' on open; clears global activeEgg slot
- islandEggSlotUsed computed from ledger; hatchery stop 'Set egg' button hidden when slot used
- On hydration: if ledger entry is incubating/ready for current island, restore activeEgg from it
- Global activeEgg slot retained for backward compat; new eggs tracked in per-island ledger
- Fixed pre-existing build error: added dice? to IslandRunMinigameReward in islandRunMinigameTypes.ts
Files changed:
- supabase/migrations/0169_island_run_per_island_eggs.sql (new)
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunMinigameTypes.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M14: Shop separation — persistent HUD Shop button, post-boss unlock tiers, egg-selling after hatch


Date: 2026-03-03
Slice: M11B — ShooterBlitz onComplete reward passthrough + dead stub cleanup
Summary:
- Verified and ensured onComplete reward fields (coins, dice, hearts, spinTokens) from ShooterBlitz are applied to board in-memory state before handleCompleteStopById('minigame') is called
- Removed dead ISLAND_RUN_MINIGAME_REGISTRY stub from islandRunMinigameService.ts (superseded by islandRunMinigameRegistry.ts component registry)
- Kept resolveMinigameForStop, IslandRunMinigameResult, IslandRunMinigameReward, IslandRunMinigameId exports intact
- Updated 00_MAIN_GAME_120_ISLANDS_INDEX.md: M11 marked complete, Next Slice set to M13
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunMinigameService.ts
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M13: Per-island egg ledger (Supabase)


Date: 2026-03-01
Batch: B3+B4+B5 — M3 Stop Modals + M4 Timer/Travel + M5 Egg System
Summary:
- B3-1: Hatchery stop egg tier costs (Common free, Rare 50c, Mythic 150c); Mythic gated to seasonal/rare islands
- B3-2: Minigame stop — real ShooterBlitz trigger via showShooterBlitzFromStop state
- B3-3: Market stop interaction gate (marketInteracted); Leave Market button added
- B3-4: Utility stop real content (heart top-up, dice refill, intention input)
- B3-5: Boss challenge library (10 challenges); getBossReward() scaled rewards; island clear celebration overlay
- B4-1: Production timer — ISLAND_DURATION_SEC=72h; devTimer=1 param for 45s dev mode; HH:MM format
- B4-2: Expiry detection on hydration boot; timer tick still drives travel on expiry
- B4-3: performIslandTravel() helper centralizes all travel reset state; both travel paths use it
- B4-4: dayIndex useEffect debug log; confirmed wired into generateTileMap()
- B5-1: IslandRunGameStateRecord extended with egg fields; Supabase read/write updated
- B5-2: IslandRunRuntimeState + backend patch extended with egg fields
- B5-3: handleSetEgg persists to Supabase; handleOpenEgg tier rewards + persist clear; hydration restores egg
- B5-4: Dormant egg carryover on travel; egg resets only when no active egg
- B5-5: Migration 0168 for egg state columns
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/LevelWorlds.css
- supabase/migrations/0168_island_run_egg_state_columns.sql (new)
- docs/07_MAIN_GAME_PROGRESS.md
Testing: npm run build
Next: B6–B9 (M6–M9)
Milestones closed: M3 ✅ M4 ✅ M5 ✅

Date: 2026-03-01
Batch: B1+B2 — M1 Board Foundation + M2 Movement Polish
Summary:
- B1-1: LevelWorldsHub production board renderer promoted; isIslandRunPrototype defaults true; legacy WorldBoard unreachable unless ?islandRunDev=0
- B1-2: New islandBoardTileMap.ts service with generateTileMap() returning 17 typed tiles per island run
- B1-3: IslandRunBoardPrototype wired to tileMap; tile type icons on board; encounter gated by rarity+dayIndex
- B1-4: HUD header cleaned; LEVEL X/120 chip; production 72h timer with HH:MM format
- B2-1: Spin token mechanic; spinTokens state; handleSpin handler; HUD Spin button
- B2-2: CSS out-cubic token transition; squash/stretch landing keyframe; zBand drop shadow variants
- B2-3: resolveTileLanding() for currency/chest/hazard/egg_shard/micro/event; awardGold for coin tiles
- B2-4: QA acceptance — all acceptance criteria for M1+M2 verified
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/services/islandBoardTileMap.ts (new)
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
Testing: npm run build
Next: B3–B9 (M3–M9)
Milestones closed: M1 ✅ M2 ✅

Date: 2026-03-01
Slice: M10E — Audio/haptics QA coverage checklist
Summary:
- Added section 15 to docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md covering market stop completion and island travel completion audio/haptic spot-checks.
- Documented full M10A–M10D audio/haptic event coverage table in QA checklist for reference.
- Added audio toggle verification steps to confirm haptic/sound gating works correctly.
Files changed:
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M11A: Minigame framework scaffold

Date: 2026-03-01
Slice: M10D — Wire market stop completion and island travel completion audio/haptics
Summary:
- Added `market_stop_complete` and `island_travel_complete` to IslandRunSoundEvent and IslandRunHapticEvent type unions in islandRunAudio.ts.
- Added haptic patterns: market_stop_complete [20, 30, 20]; island_travel_complete [30, 50, 30, 50, 30].
- Added sound asset map entries for both new events.
- Wired market_stop_complete sound + haptic in handleCompleteActiveStop for market stop branch.
- Wired island_travel_complete sound + haptic at the point where island travel resolves (new island state committed).
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10E: Audio/haptics QA coverage checklist


Date: 2026-03-01
Slice: M9G — Home Island hatchery telemetry + QA
Summary:
- Added `recordTelemetryEvent` (`economy_earn`) for `home_egg_set` and `home_egg_open` in Home Island panel handlers.
- Added `logIslandRunEntryDebug` debug markers for `home_egg_set` and `home_egg_open` for evidence-buffer triage.
- Captured `activeEgg.tier` into a local variable before clearing egg state in `handleOpenEgg` so tier is available in telemetry/debug payloads.
- Demo parity confirmed: telemetry fires in demo sessions via existing `recordTelemetryEvent` demo-safe path.
- Added section 14 to `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md` with console extraction commands for home hatchery event verification.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10D: Wire remaining audio/haptic triggers (market stop completion, island travel completion) and any uncovered sound events

Date: 2026-03-01
Slice: M9F — Home Island set/open egg actions wired to hatchery service
Summary:
- Added "Set egg" button in Home Island panel (visible when slot is empty); triggers `egg_set` sound + haptic and updates slot to 1/1.
- Added "Open egg" button in Home Island panel (visible when egg is at stage 4 / ready); triggers `egg_open` sound + haptic, clears egg, grants +1 heart.
- Added stage progress indicator ("🥚 Stage X — hatching…") shown when egg is hatching (stages 1–3), replacing the open button.
- Wired hatchery stop modal Open Egg button to reuse `handleOpenEgg` handler for consistent behavior.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9G: Home Island hatchery telemetry + QA

Date: 2026-03-01
Slice: M9E — Home Island hatchery slot real runtime state wiring
Summary:
- Replaced hardcoded `0/1` slot usage in Home Island panel with `activeEgg ? '1/1' : '0/1'` derived from real in-memory state.
- Replaced hardcoded `0` ready eggs count with `eggStage >= 4 ? 1 : 0` derived from real egg progress state.
- Status row is now reactive — updates automatically as egg state changes (egg set, hatches to ready, egg opened).
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9F: Wire Set egg + Open egg actions in Home Island panel

Date: 2026-03-01
Slice: M10C — Wire audio/haptic triggers for boss and encounter events
Summary:
- Added 5 new sound events to `IslandRunSoundEvent`: `boss_trial_start`, `boss_trial_resolve`, `boss_island_clear`, `encounter_trigger`, `encounter_resolve`.
- Added 3 new haptic events to `IslandRunHapticEvent`: `boss_trial_resolve`, `boss_island_clear`, `encounter_resolve` (with distinct vibration patterns).
- Wired `boss_trial_start` sound when boss stop modal opens; `boss_trial_resolve` sound + haptic in `handleResolveBossTrial` (replaces prior `reward_claim`); `boss_island_clear` sound + haptic in `handleCompleteActiveStop` on boss clear; `encounter_trigger` sound when encounter modal opens; `encounter_resolve` sound + haptic in `handleResolveEncounter` (replaces prior `reward_claim`).
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9E: Home Island hatchery slot real runtime state wiring

Date: 2026-03-01
Slice: M10B — Wire audio/haptic triggers for hatchery and market events
Summary:
- Added 6 new sound events to `IslandRunSoundEvent`: `egg_set`, `egg_ready`, `egg_open`, `market_purchase_attempt`, `market_purchase_success`, `market_insufficient_coins`.
- Added 3 new haptic events to `IslandRunHapticEvent`: `egg_set`, `egg_open`, `market_purchase_success` (with distinct vibration patterns).
- Wired `egg_set` sound + haptic in `handleSetEgg`; `egg_ready` sound via `useEffect` detecting stage 4 transition via `prevEggStageRef`; added `handleOpenEgg` with `egg_open` sound + haptic + +1 heart reward; `market_purchase_attempt` sound on purchase tap; `market_insufficient_coins` sound on failure; `market_purchase_success` sound + haptic on success — for both dice and heart bundles.
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10C: Wire audio/haptic triggers for boss and encounter events

Date: 2026-03-01
Slice: M10A — Audio + Haptics system foundation
Summary:
- Created `islandRunAudio.ts` service with typed `IslandRunSoundEvent` and `IslandRunHapticEvent` event IDs, `playIslandRunSound`, `triggerIslandRunHaptic`, `getIslandRunAudioEnabled`, and `setIslandRunAudioEnabled` exports.
- Wired roll sound + haptic, token_move sound, stop_land sound + haptic, island_travel sound + haptic, and reward_claim haptic at all correct call sites in `IslandRunBoardPrototype.tsx`.
- Added compact 🔊/🔇 audio toggle button to Island Run HUD, persisting the `islandRunAudioEnabled` preference to localStorage.
Files changed:
- src/features/gamification/level-worlds/services/islandRunAudio.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10B: Wire audio/haptic triggers for hatchery events (egg set, egg ready, egg open) and market events (purchase attempt, purchase success, insufficient coins).

Date: 2026-03-01
Slice: M12Z — Final visual polish cohesion audit (MVP polish gate completion)
Summary:
- Added `island-stop-modal--market` CSS rule to match onboarding modal max-width (480px) for consistent overlay sizing.
- Added `island-stop-modal--market h3` padding-bottom and `:not(:has(.island-stop-modal__context))` fallback rules to ensure bare-title modals have the same title-to-body spacing as context-block modals.
- Added `island-stop-modal .island-hatchery-card button` sizing rule so hatchery card buttons not using `__btn` class still meet minimum touch-target and weight standards.
- Added audio toggle button CSS (`.island-run-prototype__audio-toggle`) to design system so the M10A HUD control matches the M12 chip/button visual rhythm.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M10A: Audio + Haptics system foundation (audio service creation, 4 sound + 4 haptic events, HUD toggle).

Date: 2026-03-01
Slice: M12Y — Twenty-fifth visual polish pass for overlay action-row vertical anchoring
Summary:
- Added `island-stop-modal__cta--anchored` and `island-stop-modal__actions--anchored` CSS modifier (align-self: flex-start + margin-top: auto) to pin action rows to their natural top-of-area anchor regardless of how long body copy grows.
- Applied `--anchored` to all five CTA/action-row containers across onboarding, market, stop, and encounter modal variants.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Z: final visual polish cohesion audit pass (MVP polish gate completion).

Date: 2026-03-01
Slice: M12X — Twenty-fourth visual polish pass for overlay action-row alignment
Summary:
- Added a dedicated aligned action-row class to market/stop/encounter modal action rows so alignment behavior is explicitly shared.
- Tuned balanced action-row layout rules so multi-button rows remain evenly distributed while single-button rows are width-capped and centered.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Y apply twenty-fifth visual polish pass to overlay action-row vertical anchoring (top/center alignment consistency across modal variants).

Date: 2026-03-01
Slice: M12W — Twenty-third visual polish pass for overlay CTA spacing consistency
Summary:
- Added explicit balanced CTA/action-row classing so onboarding CTA and stop-modal action rows share a consistent spacing rhythm.
- Added balanced row sizing/alignment rules to reduce visual jump between one-button CTA areas and multi-button action rows.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12X apply twenty-fourth visual polish pass to overlay action-row alignment (single vs multi-button row balance).

Date: 2026-03-01
Slice: M12V — Twenty-second visual polish pass for modal headline spacing consistency
Summary:
- Added explicit headline class usage in overlay markup for onboarding/market/stop/encounter titles and travel headline text.
- Tuned eyebrow→title and title→body spacing rules so headline stacks feel consistently balanced across modal/travel overlays.
- Kept all changes presentation-only and preserved gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12W apply twenty-third visual polish pass to overlay CTA spacing consistency (button row rhythm under varied copy lengths).

Date: 2026-03-01
Slice: M12U — Twenty-first visual polish pass for long-copy readability wrap rhythm
Summary:
- Added a dedicated long-copy modal variant so overlay paragraph lines keep a stable readable measure (`ch`-bounded line length) on mobile.
- Applied pretty-wrap/overflow wrapping rules for modal and travel helper copy to reduce awkward breaks in longer text scenarios.
- Added explicit long-copy classing in overlay markup while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12V apply twenty-second visual polish pass to modal headline spacing consistency (eyebrow/title/body vertical rhythm).

Date: 2026-03-01
Slice: M12T — Twentieth visual polish pass for overlay copy-hierarchy contrast
Summary:
- Increased contrast separation between overlay eyebrow/title/body layers so headline priority reads faster on mobile.
- Tuned travel overlay text hierarchy similarly (eyebrow de-emphasis, title emphasis, helper-copy softening) for consistent scan order.
- Added lightweight semantic copy classes in onboarding/travel markup to keep hierarchy styling explicit without changing behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12U apply twenty-first visual polish pass to modal readability under long-copy scenarios (line-length + wrap rhythm).

Date: 2026-03-01
Slice: M12S — Nineteenth visual polish pass for overlay density balance
Summary:
- Added a dedicated dense-overlay variant to keep onboarding/stop/encounter modal content compact while preserving readability.
- Tightened context/action spacing rhythm in dense overlays (copy block + CTA divider spacing) for better mobile density balance.
- Slightly reduced travel card padding to harmonize overlay density with the updated modal rhythm, with no behavior/signature changes.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12T apply twentieth visual polish pass to overlay copy hierarchy contrast (eyebrow/title/body priority).

Date: 2026-03-01
Slice: M12R — Eighteenth visual polish pass for overlay interaction affordance accessibility
Summary:
- Added explicit action-affordance classing for overlay buttons to unify focus/tap behavior across onboarding and stop modals.
- Improved accessible interaction feedback with visible focus rings and touch-target clarity (tap highlight + larger action heights).
- Added active-state feedback for overlay actions while preserving existing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12S apply nineteenth visual polish pass to overlay density balance (compact copy blocks + action spacing harmony).

Date: 2026-03-01
Slice: M12Q — Seventeenth visual polish pass for overlay action-emphasis states
Summary:
- Added explicit action-state styling for onboarding CTA and stop-modal buttons so default/hover/focus/disabled feedback is more consistent.
- Tuned hover/focus emphasis with subtle lift/shadow and clearer border/brightness feedback to reinforce action affordance.
- Kept runtime behavior/signatures unchanged and limited this slice to presentation-only interaction feedback polish.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12R apply eighteenth visual polish pass to overlay interaction affordance accessibility (focus ring + tap clarity).

Date: 2026-03-01
Slice: M12P — Sixteenth visual polish pass for overlay CTA/context separation
Summary:
- Introduced explicit onboarding overlay structure (`context` + `cta` blocks) so guidance copy and primary action are visually separated.
- Added CTA-divider styling and full-width onboarding action treatment to reinforce action focus after context copy.
- Kept copy/content and gameplay behavior/signatures unchanged; this slice is presentation-only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12Q apply seventeenth visual polish pass to overlay action emphasis states (default/hover/disabled clarity).

Date: 2026-03-01
Slice: M12O — Fifteenth visual polish pass for onboarding/travel overlay clarity
Summary:
- Added lightweight overlay eyebrow labels to onboarding and travel overlays so headline/context hierarchy is easier to scan at a glance.
- Kept onboarding and travel messaging content unchanged while improving visual parsing between context label, headline, and helper copy.
- Preserved gameplay behavior/signatures and kept the slice presentation-only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12P apply sixteenth visual polish pass to overlay CTA/context separation (actions vs guidance emphasis).

Date: 2026-03-01
Slice: M12N — Fourteenth visual polish pass for modal-body readability rhythm
Summary:
- Tightened stop-modal body rhythm with refined title/body typography sizing and line-height to improve title/body scanability on mobile.
- Refined modal action-row spacing with a subtle divider and tighter gap so action areas read as a distinct, predictable section.
- Tuned travel overlay copy rhythm (title/subtitle spacing + line-height) for clearer quick-read feedback while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12O apply fifteenth visual polish pass to onboarding/travel overlay clarity (headline + helper-copy hierarchy).

Date: 2026-03-01
Slice: M12M — Thirteenth visual polish pass for button hierarchy consistency
Summary:
- Added an explicit roll CTA class so the primary gameplay action keeps stronger size/weight hierarchy versus secondary controls.
- Rebalanced button typography/sizing rhythm across scene/debug/booster controls, QA debug buttons, and modal action buttons for more consistent hierarchy.
- Kept all changes presentation-only and preserved gameplay behavior/signatures while tightening control density on mobile.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12N apply fourteenth visual polish pass to modal-body readability and spacing rhythm (title/body/list scanability).

Date: 2026-03-01
Slice: M12L — Twelfth visual polish pass for micro-typography and spacing consistency
Summary:
- Added a dedicated prototype title style and tuned text rhythm (font-size/line-height/letter-spacing) across HUD labels and landing text for cleaner mobile scanability.
- Tightened spacing consistency across HUD cards, status chips, controls wrap, and Home panel to align chip/label/button rhythm.
- Harmonized control typography sizing (scene/debug/roll/booster + QA note/label) so text hierarchy feels more consistent without changing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12M apply thirteenth visual polish pass to button hierarchy consistency (primary/secondary/debug sizing + rhythm).

Date: 2026-03-01
Slice: M12K — Eleventh visual polish pass for stop/tile readability contrast
Summary:
- Strengthened stop-label readability across scene variants with darker label surfaces, clearer border contrast, and slightly heavier shadow separation.
- Added explicit tile value and anchor-id text styling hooks to improve number/debug-id legibility against tile gradients.
- Slightly rebalanced back/front tile contrast filters so mid-board tile values remain easier to parse on mobile without changing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12L apply twelfth visual polish pass to micro-typography and spacing consistency (chip/label/button rhythm).

Date: 2026-03-01
Slice: M12J — Tenth visual polish pass for board focal hierarchy
Summary:
- Added an explicit board focus treatment layer so the board center reads as the main focal zone with softer edge falloff.
- Rebalanced board edge shading/highlight intensity to reduce edge noise while keeping depth cues from the framed board treatment.
- Slightly tuned center lap-chip surface contrast so it remains legible without overpowering stop/tile visuals.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12K apply eleventh visual polish pass to stop/tile readability contrast (mid-board clarity under all scenes).

Date: 2026-03-01
Slice: M12I — Ninth visual polish pass for board chrome/background framing
Summary:
- Refined board container framing with cleaner edge chrome (subtle border/glass insets + deeper external shadow) so the playfield reads as a distinct, polished surface.
- Added non-interactive board overlay layers (top highlight + bottom vignette + inner edge shading) to improve depth balance without affecting gameplay interactions.
- Slightly tuned per-scene board gradients to keep center readability while preserving stop/tile/token and movement behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12J apply tenth visual polish pass to board focal hierarchy (center emphasis + edge falloff balance).

Date: 2026-03-01
Slice: M12H — Eighth visual polish pass for debug/QA control de-emphasis
Summary:
- Grouped QA/debug controls into a dedicated tools container with a compact label so these controls are clearly separated from primary gameplay actions.
- Visually de-emphasized debug buttons (muted surface/border/weight) while preserving existing QA/debug gating and behavior.
- Kept Market debug helper hint available in QA mode and restyled it as a lower-priority QA note.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12I apply ninth visual polish pass to board chrome/background framing (container edges + depth balance).

Date: 2026-03-01
Slice: M12G — Seventh visual polish pass for control-state emphasis
Summary:
- Promoted the roll control as a clear primary CTA with dedicated visual treatment when dice are available.
- Added a distinct convert-state style for the roll button when the action shifts to heart-to-dice conversion.
- Strengthened disabled-state clarity across gameplay/modal actions (lower emphasis, no glow, explicit not-allowed cursor) while preserving existing behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12H apply eighth visual polish pass to debug/QA control de-emphasis in normal flow.

Date: 2026-03-01
Slice: M12F — Sixth visual polish pass for semantic color-token consistency
Summary:
- Added semantic color-token styling for key run-status chips (hearts/dice/coins/timer) to improve at-a-glance parsing.
- Added semantic landing-text variants (`info`, `plan`, `states`, `success`, `warn`) so status and guidance copy uses clearer visual meaning.
- Kept all changes presentation-only and preserved existing gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12G apply seventh visual polish pass to control-state emphasis (primary roll CTA + disabled clarity).

Date: 2026-03-01
Slice: M12E — Fifth visual polish pass for HUD density/scanability
Summary:
- Grouped header HUD into two compact sections (`Run status` and `Live feed`) to reduce scan noise and improve information hierarchy on mobile.
- Added explicit HUD section labels and panel containers so status chips and landing text are easier to parse at a glance.
- Tuned status-chip and landing-text readability (contrast/spacing/line-height) while preserving gameplay behavior and signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12F apply sixth visual polish pass to color-token consistency and semantic emphasis (success/warn/info tones).

Date: 2026-03-01
Slice: M12D — Fourth visual polish pass for modal surfaces and CTA hierarchy
Summary:
- Refined travel and stop modal surfaces with stronger backdrop/contrast, improved spacing rhythm, and clearer modal title/body hierarchy.
- Added explicit modal action-row styling with primary/secondary CTA variants and updated modal button group markup for clearer action emphasis on mobile.
- Enhanced travel overlay card messaging hierarchy with title/subtitle structure while preserving existing travel timing and gameplay behavior.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12E apply fifth visual polish pass to HUD density/scanability (status row + landing text grouping).

Date: 2026-03-01
Slice: M12C — Third visual polish pass for motion/feedback styling
Summary:
- Added stronger active-stop feedback with subtle pulse animation and selected-stop highlight styling for clearer focus during stop interactions.
- Added current-token tile emphasis (`island-tile--token-current`) and tuned token motion/shadow styling for clearer movement feedback.
- Added reduced-motion guardrails for motion polish effects while preserving gameplay behavior/signatures.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12D apply fourth visual polish pass to modal surfaces and CTA hierarchy (travel + stop modals).

Date: 2026-03-01
Slice: M12B — Second visual polish pass for board/chip readability
Summary:
- Improved board readability by increasing contrast/weight of the center lap chip and stop labels.
- Enhanced tile-chip legibility with stronger chip surface contrast, clearer number rendering, and refined depth/shadow treatment.
- Updated mobile behavior to keep compact stop labels visible (truncated) instead of fully hiding them, improving on-board orientation on phone screens.
Files changed:
- src/features/gamification/level-worlds/LevelWorlds.css
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12C apply third visual polish pass to motion/feedback styling (token + active stop emphasis).

Date: 2026-03-01
Slice: M12A — First visual polish pass for Island Run header/controls
Summary:
- Refined Island Run prototype header styling with improved hierarchy: larger title treatment, stronger panel surface, and clearer status-chip grouping.
- Added a dedicated Home hatchery summary panel container and tuned copy/readability spacing so informational rows are easier to scan on mobile.
- Updated control-button typography/spacing and landing text rhythm to move prototype UI toward production polish without changing gameplay logic.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12B apply second visual polish pass to board/chip readability (tile labels + stop labels + contrast).

Date: 2026-03-01
Slice: M9D — Home Island progression-hint row scaffold
Summary:
- Added a compact Home Island progression-hint row clarifying dormant/home egg flow behavior in prototype copy.
- Hint explains that ready uncollected island eggs can carry as dormant eggs and that dormant/home eggs are opened from hatchery surfaces when available.
- Updated index planning to make visual polish expectations explicit for MVP quality (`M12 is mandatory before MVP sign-off`) and set next slice to M12A visual polish pass.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M12A apply first visual polish pass to Island Run header/controls (spacing + typography + hierarchy).

Date: 2026-03-01
Slice: M9C — Home Island action-hint row scaffold
Summary:
- Added a compact Home Island action-hint row in the Island Run header that explains set/open behavior in prototype copy.
- Action hint clarifies that home eggs can be set when slot is empty and opened immediately from Home Island when ready, without movement requirements.
- Updated index planning to include an explicit UI beautification milestone track (M12) so roadmap now captures production polish work beyond prototype scaffolds.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9D add Home Island panel progression-hint row (dormant/home egg flow copy scaffold).

Date: 2026-03-01
Slice: M9B — Home Island slot/ready status row scaffold
Summary:
- Added a dedicated Home Island status row in the Island Run prototype header with explicit slot usage and ready-egg status copy.
- Status copy is intentionally scaffold-only (`0/1` slot usage, `0` ready eggs) to improve panel clarity without introducing new runtime state wiring in this slice.
- Preserved existing roll/stop/travel gameplay behavior and QA/debug helper behavior.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9C add Home Island panel action-hint row (set/open behavior copy scaffold).

Date: 2026-03-01
Slice: M9A — Home Island hatchery summary panel scaffold
Summary:
- Added a lightweight Home Island Hatchery summary note in the Island Run prototype header that states always-available behavior.
- Summary copy explicitly documents v1 expectations (single home egg slot and collect-anytime once ready) without adding new gameplay state changes.
- Preserved existing roll/stop/travel behavior and QA/debug controls; this slice is display-copy scaffold only.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9B add Home Island panel state row for slot/ready status (copy-only scaffold).

Date: 2026-03-01
Slice: M8J — In-UI Market debug helper discoverability note
Summary:
- Added a compact QA/debug-only helper hint note in the Island Run prototype controls to surface Market debug helper console commands in-product.
- Helper note lists export/reset/status-coverage helper calls and is gated behind existing `showDebug || showQaHooks` conditions, keeping non-debug runtime behavior unchanged.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M9A scaffold Home Island prototype panel with always-collect hatchery summary copy.

Date: 2026-03-01
Slice: M8I — Market status coverage assertion helper
Summary:
- Added `window.__islandRunMarketDebugAssertStatusCoverage(expectedStatuses?, limit?)` to return pass/fail Market marker status coverage reports.
- Helper evaluates expected statuses against compact exported marker rows and returns coverage/missing metadata with baseline context.
- Updated QA checklist with exact assertion-helper commands and expected report shape for deterministic coverage checks.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8J add Market marker helper section to inline dev controls/readme for faster operator discovery.

Date: 2026-03-01
Slice: M8H — Market marker reset helper for clean-slate QA sequencing
Summary:
- Added `window.__islandRunMarketDebugResetState()` (debug/QA gated) to clear Market local owned/feedback state and establish a new marker export baseline timestamp for the session.
- Updated Market marker export helper to respect baseline filtering and expose baseline metadata (`baselineApplied`, `baselineIso`) in snapshot output.
- Added QA checklist steps for reset-helper verification and post-reset clean-slate export expectations.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8I add compact Market marker assertion helper for expected status coverage checks.

Date: 2026-03-01
Slice: M8G — Compact Market marker export helper
Summary:
- Added `window.__islandRunMarketDebugExportMarkers(limit?)` in `IslandRunBoardPrototype` (debug/QA gated) to return compact snapshots of recent `island_run_market_purchase` events.
- Snapshot rows normalize key marker fields (`status`, `bundle`, cost/reward, coin deltas, owned snapshot flags, timestamp`) for copy/paste QA triage.
- Updated QA checklist with exact helper commands and expected output shape for compact marker exports.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8H add Market marker reset helper for deterministic clean-slate QA sequencing.

Date: 2026-03-01
Slice: M8F — Dev-only deterministic helper for `already_owned` marker verification
Summary:
- Added dev-only QA controls in `IslandRunBoardPrototype` to emit deterministic Market `already_owned` marker paths for both dice and heart bundles.
- Helper path pre-sets owned-state context and emits `island_run_market_purchase` debug/telemetry payloads without relying on repurchase timing.
- Updated QA checklist with explicit M8F helper steps and expected evidence additions for both bundle types.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8G add dedicated Market marker export helper for compact QA evidence snapshots.

Date: 2026-03-01
Slice: M8E — Market marker QA checklist commands
Summary:
- Added a dedicated Market QA checklist section with explicit console extraction commands for `island_run_market_purchase` evidence events.
- Documented marker verification steps/fields for `attempt`, `insufficient_coins`, `success`, and `already_owned` statuses plus owned-state payload context.
- Kept runtime behavior unchanged (docs-only slice) while making Market marker triage repeatable for QA handoffs.
Files changed:
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8F add dev-only Market marker QA helper for deterministic `already_owned` verification.

Date: 2026-03-01
Slice: M8D — Market repurchase-block telemetry/debug marker path
Summary:
- Added explicit `already_owned` Market purchase marker emission when users attempt to buy a bundle they already own in the current island session.
- Extended Market marker payload context to include owned-state snapshot fields (`owned_dice_bundle`, `owned_heart_bundle`) for debug/telemetry triage.
- Preserved no-repurchase UX and existing Market progression flow while making repurchase-block outcomes observable.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8E add Market QA checklist section with explicit `already_owned` marker verification commands.

Date: 2026-03-01
Slice: M8C — Market owned-state scaffold with no-repurchase UX
Summary:
- Added Market prototype owned-state tracking (`dice_bundle`, `heart_bundle`) in `IslandRunBoardPrototype`.
- Market purchase buttons now transition to owned/disabled state after a successful buy and display owned labels/context, preventing repurchase in the same island session.
- Preserved existing Market progression flow by resetting owned-state on market stop completion / island travel while keeping non-Market stop behavior unchanged.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8D add Market owned-state telemetry/debug markers (`already_owned` path + owned-state snapshot payloads).

Date: 2026-03-01
Slice: M8B — Market purchase telemetry + debug markers
Summary:
- Added explicit Market purchase marker emission in `IslandRunBoardPrototype` for `attempt`, `insufficient_coins`, and `success` outcomes.
- Wired markers to both `logIslandRunEntryDebug('island_run_market_purchase', ...)` and `recordTelemetryEvent(..., eventType: 'economy_earn')` with bundle/cost/reward/coin-balance context.
- Preserved Market modal and stop progression behavior from M8A while making purchase-path observability deterministic for QA triage.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8C add Market prototype inventory slot scaffold (owned-item state + disabled repurchase UX).

Date: 2026-03-01
Slice: M8A — Market stop prototype purchase modal stub
Summary:
- Added a dedicated Market stop prototype modal in `IslandRunBoardPrototype` so Market interactions are now separated from generic stop handling.
- Added mock purchase actions (`Dice Bundle`, `Heart Bundle`) with visible feedback and starter coin-cost checks while preserving existing non-Market stop flows.
- Kept stop-completion flow intact; Market can still be completed explicitly after trying purchases.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8B add Market stop telemetry + purchase event debug markers for prototype buy attempts/success.

Date: 2026-03-01
Slice: M7N — Run-filter resolution metadata for progression helpers
Summary:
- Added explicit run-filter resolution metadata to progression bundle/filter helper outputs: `filterApplied` and `filterMatched`.
- Kept existing helper signatures and assertion pass/fail behavior unchanged while making matched vs unmatched ref outcomes explicit.
- Updated progression QA checklist with exact commands to verify `filterApplied`/`filterMatched` for no-ref, matched-ref, and unmatched-ref paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M8A add Market stop interaction stub + prototype purchase modal wiring in Island Run board flow.

Date: 2026-03-01
Slice: M7M.1 — Scope normalization follow-up for unmatched run refs
Summary:
- Tightened `scope` derivation in progression filter/export helpers so `run_filtered` is emitted only when a provided ref resolves to a matched repro run window.
- Restored summary helper `summaryLine` format to preserve existing output string behavior while keeping new `scope` metadata available as a separate field.
- Updated QA checklist scope spot-check commands with matched vs unmatched run-ref expectations.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7N add explicit run-filter resolution metadata (`filterApplied` + `filterMatched`) to filter/bundle helper outputs.

Date: 2026-03-01
Slice: M7M — Explicit scope metadata for progression helper outputs
Summary:
- Added normalized `scope` metadata (`full_buffer` | `run_filtered`) to progression assertion report/summary models so helper outputs carry explicit evidence scope context.
- Updated progression summary/filter/bundle helpers to emit `scope` consistently while preserving existing call signatures and assertion pass/fail behavior.
- Expanded the progression QA checklist with exact scope-verification console commands for unfiltered and filtered helper paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7N add explicit run-filter resolution metadata (`filterApplied` + `filterMatched`) to filter/bundle helper outputs.

Date: 2026-03-01
Slice: M7L — Filter-aware export bundle support
Summary:
- Extended `window.__islandRunEntryDebugExportProgressionBundle(mode, ref?)` to optionally accept a run reference (`runId` or scenario label) while preserving the original one-argument call signature.
- When `ref` is provided, the bundle now scopes `evidence.events` to run-window progression events and returns filter metadata (`runFilterRef`, `matchedRunId`, `matchedScenario`, `filteredEventCount`) for explicit triage context.
- Updated progression QA checklist with side-by-side no-filter vs filtered bundle examples and expected metadata keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7M add normalized `scope` metadata across summary/filter/bundle outputs for unambiguous export interpretation.

Date: 2026-03-01
Slice: M7K — Run-scoped progression debug filter helper
Summary:
- Added `window.__islandRunEntryDebugFilterProgressionRun(ref, mode)` to isolate progression-relevant runtime-state events for a single repro run.
- Helper accepts either `runId` or scenario label, scopes to the matching `repro_run_started` window, and returns assertion-compatible output (`events` + `report`) for deterministic per-run triage.
- Updated progression QA checklist with run-start + run-filter examples and expected output keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7L add optional run-filter support to export bundle helper so one call can produce scoped summary+evidence payloads.

Date: 2026-03-01
Slice: M7J — QA export bundle helper for progression runs
Summary:
- Added `window.__islandRunEntryDebugExportProgressionBundle(mode)` to return both progression assertion summary and latest debug evidence in a single payload.
- Bundle helper reuses the existing assertion + summary paths and appends `collectDebugEvidence()` output so triage exports include both verdict and supporting events/network context.
- Updated progression QA checklist with explicit table/fallback bundle helper commands and expected output keys.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7K add run-scoped progression debug filter helper so exported assertions can be narrowed to a single repro run.

Date: 2026-03-01
Slice: M7I — Console-friendly progression assertion summary helper
Summary:
- Added `window.__islandRunEntryDebugAssertProgressionSummary(mode)` to print and return a compact pass/fail summary for progression assertions.
- Summary helper reuses the existing structured assertion report path and returns failed check names, counts, and a single-line `summaryLine` for fast triage copy/paste.
- Updated progression QA checklist with table/fallback summary helper commands and expected output shape.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7J add progression QA export bundle helper that returns assertion summary + evidence snapshot in one call.

Date: 2026-03-01
Slice: M7H — Parameterized assertion presets for table vs fallback environments
Summary:
- Updated progression assertion helper to accept mode presets: `window.__islandRunEntryDebugAssertProgressionSequence('table' | 'fallback')`.
- Table mode now requires `runtime_state_hydrate_query_success` marker evidence, while fallback mode requires fallback hydration stages with fallback marker payloads.
- Updated QA checklist docs with explicit invocation/examples for both presets so environment-specific verification is unambiguous.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7I add compact summary printer helper for assertion reports (single-line pass/fail + failed check names) to speed console triage.

Date: 2026-03-01
Slice: M7G — Dev-only automated assertion harness for progression-marker debug stages
Summary:
- Added `window.__islandRunEntryDebugAssertProgressionSequence()` in `islandRunEntryDebug` to deterministically validate reset→resolve→advance→refresh progression-marker evidence stages.
- Assertion report returns per-check pass/fail + matched event indices, reducing manual interpretation drift in QA triage.
- Updated progression QA checklist with an explicit final assertion-helper step and expected success shape.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7H add optional parameterized assertion presets (table-success vs fallback-mode) to support environment-specific verification without editing helper code.

Date: 2026-03-01
Slice: M7F — Progression-marker regression checklist + deterministic QA hooks
Summary:
- Added deterministic QA hook controls in `IslandRunBoardPrototype` (`QA: Mark boss resolved`, `QA: Advance island`, `QA: Reset progression`) behind debug/dev conditions to make marker-transition verification repeatable.
- Added dedicated QA checklist doc (`docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md`) that maps each transition step to expected debug evidence payload keys.
- Keeps production gameplay behavior unchanged while reducing ambiguity in progression-marker regression triage and manual verification runs.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual QA hooks verification)
Next:
- M7G add minimal automated assertion harness (dev-only) that validates expected progression-marker stage payloads from debug buffer.

Date: 2026-03-01
Slice: M7E — Progression-marker debug evidence instrumentation pass
Summary:
- Extended runtime-state debug events in `islandRunGameStateStore` to include progression marker payloads (`currentIslandNumber`, `bossTrialResolvedIslandNumber`) across hydrate/persist success, error, and fallback stages.
- Added fallback marker snapshots to hydration skip/no-row/error stages so exported evidence shows both attempted table state and active local fallback context.
- Keeps runtime behavior unchanged while making `window.__islandRunEntryDebugEvidence()` materially more actionable for progression persistence regressions.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7F add targeted regression checklist/assertions around progression marker transitions (boss resolve, boss clear, timer-expiry advance) for repeatable QA runs.

Date: 2026-03-01
Slice: M7D — Table-first persistence for Island Run progression markers
Summary:
- Added Supabase migration `0167_island_run_runtime_state_progression_markers.sql` to create/harden `island_run_runtime_state` with progression marker columns (`current_island_number`, `boss_trial_resolved_island_number`) and RLS policies.
- Updated runtime-state game-store table read/write paths to include progression marker columns in table selects/upserts, aligning M7C marker persistence with table-first behavior.
- Updated `database.types.ts` and product spec notes so typed Supabase contracts explicitly include Island Run runtime-state progression fields.
Files changed:
- supabase/migrations/0167_island_run_runtime_state_progression_markers.sql
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/lib/database.types.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
Next:
- M7E wire operator/debug evidence capture to show progression-marker hydration/persist values for fast regression triage.

Date: 2026-03-01
Slice: M7C — Persist boss-clear progression runtime markers
Summary:
- Extended Island Run runtime-state schema with `currentIslandNumber` and `bossTrialResolvedIslandNumber` so boss progression survives refresh.
- Wired `IslandRunBoardPrototype` to hydrate island/boss marker state from runtime-state and persist marker updates on boss resolve + island advance paths.
- Keeps existing M7A/M7B gameplay + telemetry behavior while preventing refresh resets from dropping boss progression context.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual refresh/persistence verification)
Next:
- M7D align persisted progression markers with table-first runtime-state columns/migration so cross-device continuity matches local refresh continuity.

Date: 2026-03-01
Slice: M7B — Boss stop telemetry + reward contract wiring
Summary:
- Wired boss trial rewards into shared reward/session rails by logging `awardHearts(..., 'shooter_blitz', ...)`, `awardGold(..., 'shooter_blitz', ...)`, and `logGameSession(...)` during boss resolve/clear.
- Added explicit telemetry payloads for `island_run_boss_trial_resolved` and `island_run_boss_island_cleared` using `economy_earn` so operator analytics can audit reward/clear stages.
- Preserved M7A gameplay gating behavior (boss clear still blocked until trial resolve) while adding instrumentation-only follow-through.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual boss-stop telemetry wiring verification)
Next:
- M7C persist per-island boss-clear progression/runtime markers so travel + unlock state survive refresh/session changes.

Date: 2026-03-01
Slice: M7A — Boss stop reward prototype (challenge resolve + clear gating)
Summary:
- Added a dedicated boss-stop challenge stub in `IslandRunBoardPrototype` with explicit resolve action before island clear can be claimed.
- Boss resolve now grants prototype reward feedback (`+2 hearts`, `+120 coins`) and surfaces a clear confirmation message before travel.
- Kept non-boss stop behavior unchanged (existing hatchery/encounter/standard stop completion flows preserved).
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual boss-stop flow verification)
Next:
- M7B wire boss-stop resolve + island-clear events into telemetry/reward logging contract for auditability.

Date: 2026-03-01
Slice: M7P.15 — Fleet-level legacy alias rollout gate helper
Summary:
- Added `getLegacyAliasSunsetRollup(userIds)` in `gameRewards` to aggregate per-user sunset scans into a single go/no-go payload.
- Rollup reports scanned user count, total legacy reward/session rows, and explicit `usersWithLegacyAliases` for targeted cleanup follow-up.
- Keeps existing runtime behavior unchanged while making staged alias-removal decisions scriptable across multiple operator-selected accounts.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.16 wire rollup summary into the operator diagnostics surface (or scripted export path) to capture baseline evidence before deleting residual legacy-read scaffolding.

Date: 2026-03-01
Slice: M7P.14 — Canonical-only game/source unions with legacy-read compatibility
Summary:
- Removed `pomodoro_sprint` from canonical game/source unions (`HabitGameId`, `GameSource`, `EconomySourceKey`) so new compile-time call sites only emit `shooter_blitz`.
- Preserved non-breaking compatibility for existing persisted legacy rows by widening storage-read normalizers in `gameRewards` to accept legacy aliases and self-heal to canonical IDs.
- Dropped legacy-only metadata/economy labels tied to `pomodoro_sprint` while keeping the sunset-readiness scanner intact for operator verification.
Files changed:
- src/types/habitGames.ts
- src/services/gameRewards.ts
- src/constants/economy.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.15 remove now-unused legacy scanner UI/actions after at-scale diagnostics confirm zero legacy alias rows for target accounts.

Date: 2026-03-01
Slice: M7P.13 — Operator/dev diagnostics wiring for alias sunset readiness
Summary:
- Wired legacy alias readiness into an operator-facing diagnostics surface inside Account → Developer & Analytics Tools.
- Added a “Run legacy alias scan” action that calls `getLegacyAliasSunsetReadiness(userId)` and displays reward/session legacy row counts plus readiness status.
- Enables baseline capture of real user/device alias counts before removing `pomodoro_sprint` compatibility entries.
Files changed:
- src/features/account/MyAccountPanel.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (manual visual verification)
Next:
- M7P.14 begin staged legacy alias removal (types/economy/source unions) once baseline scans show zero active legacy rows.

Date: 2026-03-01
Slice: M7P.12 — Legacy alias sunset-readiness scanner
Summary:
- Added `getLegacyAliasSunsetReadiness(userId)` in `gameRewards` to report legacy `pomodoro_sprint` usage counts in reward/session storage.
- The scanner returns per-user legacy row counts and an aggregate readiness boolean (`hasLegacyAliases`) to support telemetry-backed alias-removal decisions.
- Keeps runtime behavior unchanged while making the alias sunset checklist measurable instead of manual.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.13 wire the sunset-readiness summary into an operator/dev diagnostics surface and collect baseline counts before removing legacy aliases.

Date: 2026-03-01
Slice: M7P.11 — Self-healing legacy alias cleanup in history storage
Summary:
- Updated reward/session history readers in `gameRewards` to perform in-place cleanup of legacy `pomodoro_sprint` rows when encountered.
- When legacy aliases are found, normalized events are now persisted back to localStorage, reducing repeated legacy drift and preparing for eventual alias sunset.
- Kept write-path compatibility unchanged while adding shared event/session normalizers for cleaner canonicalization logic.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.12 draft and execute telemetry-backed criteria to safely remove legacy alias types/entries.

Date: 2026-03-01
Slice: M7P.10 — Centralized legacy game-id alias contract
Summary:
- Added shared legacy game-id alias contract in `types/habitGames.ts` via `LEGACY_HABIT_GAME_ID_ALIASES` and `normalizeHabitGameId(...)`.
- Updated reward/session history service to consume the shared normalizer, removing duplicated legacy game-id alias logic from `gameRewards.ts`.
- Keeps current compatibility behavior unchanged while tightening a single-source path for future `pomodoro_sprint` sunset steps.
Files changed:
- src/types/habitGames.ts
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.11 define and execute final `pomodoro_sprint` alias removal checklist once telemetry confirms no active legacy writes.

Date: 2026-03-01
Slice: M7P.9 — Legacy alias normalization in reward/session history rails
Summary:
- Added centralized legacy alias normalization in `gameRewards` so any incoming `pomodoro_sprint` source/game IDs are canonicalized to `shooter_blitz` before persistence.
- Updated history readers (`getRewardHistory`, `getGameSessionHistory`) to normalize existing legacy rows on read, preventing mixed legacy/current identifiers in analytics/UI consumers.
- Keeps compatibility safe for old callers while tightening post-migration data consistency without removing legacy type aliases yet.
Files changed:
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.10 evaluate formal sunset plan for `pomodoro_sprint` type/economy aliases after compatibility window and telemetry review.

Date: 2026-03-01
Slice: M7P.8 — Legacy Pomodoro stale-reference hardening pass
Summary:
- Extended Level Worlds legacy normalization so persisted `pomodoro_sprint` nodes now migrate not only objective IDs to `shooter_blitz`, but also stale node copy (`label`, `description`) and tomato emoji to shooter-aligned values.
- Keeps migration non-breaking for old localStorage boards while preventing mixed legacy naming in post-migration UI surfaces.
- Preserves the same load-time compatibility strategy: normalize once during `loadState(...)`, then persist upgraded state back to storage.
Files changed:
- src/features/gamification/level-worlds/services/levelWorldsState.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.9 audit remaining legacy `pomodoro_sprint` mentions in shared type/economy copy and decide whether to keep compatibility aliases or formally sunset them.

Date: 2026-03-01
Slice: M7P.7 — Shooter Blitz UX polish pass
Summary:
- Added mission-phase status messaging and a visible progress bar so Shooter Blitz runs communicate pacing and completion readiness more clearly.
- Added reward pill chips in the mission setup panel to make coin/dice/token payouts scannable before mission start.
- Kept gameplay/reward/session callback contracts unchanged (`onClose`, `onComplete`, existing reward grants + session events) while polishing presentation only.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/games/shooter-blitz/shooterBlitz.css
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (visual verification)
Next:
- M7P.8 run a post-migration stale-reference audit for `pomodoro_sprint` and narrow remaining legacy-only copy where safe.

Date: 2026-03-01
Slice: M7P.6 — Retire standalone Pomodoro Sprint runtime surface
Summary:
- Removed unused standalone Pomodoro Sprint component/runtime files now that Lucky Roll and Level Worlds both route mini-game tiles to Shooter Blitz.
- Added dedicated `shooterBlitz.css` and renamed Shooter Blitz CSS classes away from Pomodoro-prefixed class names.
- Updated economy source matrix to include Shooter Blitz as an earn source and mark Pomodoro copy as legacy-only.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/games/shooter-blitz/shooterBlitz.css
- src/features/gamification/games/pomodoro-sprint/PomodoroSprint.tsx (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprintState.ts (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprintTypes.ts (deleted)
- src/features/gamification/games/pomodoro-sprint/pomodoroSprint.css (deleted)
- src/constants/economy.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.7 run a quick UX polish pass on Shooter Blitz visuals/controls now that legacy Pomodoro styling debt is removed.

Date: 2026-03-01
Slice: M7P.5 — Lucky Roll mini-game tiles switched from Pomodoro Sprint to Shooter Blitz
Summary:
- Replaced Lucky Roll mini-game routing from `pomodoro_sprint` to `shooter_blitz` so both Level Worlds and Lucky Roll launch the same shooter replacement surface.
- Updated Lucky Roll board tile generation/types so mini-game tile metadata now emits/accepts `shooter_blitz` identifiers.
- Updated Lucky Roll UI labels/comments and launch state wiring to open `ShooterBlitz` instead of `PomodoroSprint` while preserving reward refresh flow.
Files changed:
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- src/features/gamification/daily-treats/luckyRollState.ts
- src/features/gamification/daily-treats/luckyRollTypes.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.6 evaluate removal/deprecation path for the standalone Pomodoro Sprint component files and legacy economy copy.

Date: 2026-03-01
Slice: M7P.4 — Legacy Pomodoro board-state migration to Shooter Blitz objective IDs
Summary:
- Added Level Worlds state-load normalization that migrates persisted legacy mini-game objectives from `pomodoro_sprint` to `shooter_blitz`.
- Migration runs during `loadState(...)`, returns normalized in-memory state, and persists upgraded state back to localStorage to avoid repeated remapping.
- Prevents stale pre-migration boards from failing Shooter Blitz routing expectations after the mini-game ID transition.
Files changed:
- src/features/gamification/level-worlds/services/levelWorldsState.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.5 complete Pomodoro runtime deprecation review and remove no-longer-referenced Pomodoro code paths where safe.

Date: 2026-03-01
Slice: M7P.3 — First-class `shooter_blitz` identifiers in reward/session rails
Summary:
- Promoted `shooter_blitz` to first-class game/source identifiers in shared reward/session typing (`HabitGameId`, `GameSource`) while keeping `pomodoro_sprint` as explicitly legacy for compatibility.
- Updated `ShooterBlitz` reward grants and session logs to emit `shooter_blitz` IDs instead of legacy `pomodoro_sprint` values.
- Updated shared game metadata/token/reward-priority config to include Shooter Blitz as the active pride/focus mini-game entry.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/types/habitGames.ts
- src/services/gameRewards.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.4 remove or retire remaining Pomodoro Sprint runtime route/surface paths after compatibility review.

Date: 2026-03-01
Slice: M7P.2 — Shooter Blitz reward/session parity pass
Summary:
- Upgraded `ShooterBlitz` from placeholder interaction to a rewarding mini-game loop with completion grant values (coins/dice/token).
- Added session logging parity (`enter`/`complete`/`exit`) through existing game reward/session telemetry rails so Shooter Blitz runs are observable.
- Added mission reward messaging and completion haptic feedback to align with existing mini-game UX expectations.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run dev -- --host 0.0.0.0 --port 4173 (visual verification)
Next:
- M7P.3 migrate legacy `pomodoro_sprint` identifiers in reward/session type unions to a first-class `shooter_blitz` ID.

Date: 2026-03-01
Slice: M7P.1 — Replace Pomodoro Sprint node route with Shooter Blitz mini-game surface
Summary:
- Added new `ShooterBlitz` mini-game surface for Level Worlds mini-game nodes with a simple mission loop (start, hit targets, complete/abort).
- Replaced `pomodoro_sprint` routing in `LevelWorldsHub` with `shooter_blitz` so mini-game node launches now align with Island Run shooter replacement direction.
- Updated Level Worlds mini-game typing/objective labeling and board generator mini-game pool to emit `shooter_blitz` instead of `pomodoro_sprint`.
Files changed:
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/types/levelWorlds.ts
- src/features/gamification/level-worlds/hooks/useNodeObjectives.ts
- src/features/gamification/level-worlds/services/levelWorldsGenerator.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7P.2 wire Shooter Blitz rewards/telemetry parity and replace remaining Pomodoro-specific naming/assets.

Date: 2026-03-01
Slice: M7O.16 — Guided repro run/checkpoint helpers for consistent evidence capture
Summary:
- Added structured repro helper APIs in Island Run debug tooling: `__islandRunEntryDebugStartRun(scenario)` and `__islandRunEntryDebugMarkCheckpoint(checkpoint, payload?)`.
- Standardized checkpoint vocabulary for login incident captures (`login_click`, `post_redirect_paint`, `session_established`, `island_run_entry_visible`, `blank_screen_observed`, `recovered`).
- Keeps debug-only behavior gated by `?islandRunEntryDebug=1` while reducing analyst variance in evidence traces.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.17 execute two guided repro runs using run/checkpoint helpers and append evidence payloads + conclusions to incident ledger.

Date: 2026-03-01
Slice: M7O.15 — Lifecycle + manual marker support for repro evidence capture
Summary:
- Updated `islandRunEntryDebug` to install helpers/listeners only when `?islandRunEntryDebug=1` is active, keeping non-debug sessions untouched.
- Added lifecycle breadcrumbs (`document_visibility_change`, `window_pageshow`, `window_pagehide`) and evidence metadata (`visibilityState`) to better explain apparent blank-screen windows.
- Added `window.__islandRunEntryDebugMark(label, payload?)` for reproducible manual checkpoints during repro runs (e.g., pre-login click, post-redirect paint).
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.16 run guided repro captures using `__islandRunEntryDebugMark(...)` and append resulting evidence payloads to incident log.

Date: 2026-03-01
Slice: M7O.14 — Capture global runtime failures in debug evidence stream
Summary:
- Extended `islandRunEntryDebug` to capture `window.error` and `unhandledrejection` events into the same buffered evidence stream.
- Global listeners install once and remain gated by `?islandRunEntryDebug=1`, so non-debug sessions remain unchanged.
- This makes blank-screen repro evidence include top-level runtime exceptions alongside bootstrap/mount/network diagnostics.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.15 execute repro sessions and append captured `window.__islandRunEntryDebugEvidence()` payloads (including any `window_error` / `window_unhandled_rejection` events) to incident ledger.

Date: 2026-03-01
Slice: M7O.13 — One-call debug evidence export (events + relevant network resources)
Summary:
- Extended the `islandRunEntryDebug` helper with `window.__islandRunEntryDebugEvidence()` to return a single structured evidence payload.
- Evidence payload now bundles location snapshot, buffered Island Run entry events, and filtered resource timing rows relevant to Supabase/runtime-state calls.
- Keeps debug-only behavior behind `?islandRunEntryDebug=1`; no gameplay or routing contract changes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.14 execute repro runs and paste `window.__islandRunEntryDebugEvidence()` output snapshots for both login paths into the incident ledger.

Date: 2026-03-01
Slice: M7O.12 — Debug evidence buffering + runtime-state network stage logs
Summary:
- Extended Island Run entry debug helper to persist an in-session event buffer and expose `window.__islandRunEntryDebugDump()` / `window.__islandRunEntryDebugClear()` for reproducible evidence export.
- Added runtime-state table query/persist stage logs in `islandRunGameStateStore` (query start/success/error/no-row, persist start/success/error, remote-skip reasons) under the same `islandRunEntryDebug=1` flag.
- Keeps product behavior unchanged while enabling concrete protocol evidence that links mount sequencing to runtime-state API outcomes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.13 run two login repro passes and paste `window.__islandRunEntryDebugDump()` output + network panel evidence into the incident ledger.

Date: 2026-03-01
Slice: M7O.11 — Mount-level evidence instrumentation for login blank-screen repro
Summary:
- Added shared `islandRunEntryDebug` helper for consistent opt-in debug detection/logging across Island Run entry surfaces.
- Added `[IslandRunEntryDebug]` mount/unmount instrumentation in `LevelWorldsHub` and `IslandRunBoardPrototype` to explicitly capture protocol step #5 (whether those trees mount).
- Added hydration result/error debug snapshots in `IslandRunBoardPrototype` to correlate runtime-state source/failure with entry sequencing evidence.
Files changed:
- src/features/gamification/level-worlds/services/islandRunEntryDebug.ts
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.12 execute the full login repro protocol and paste captured console/network evidence for both direct app login and `/level-worlds.html` sourced login.

Date: 2026-03-01
Slice: M7O.10 — Login repro instrumentation for Island Run entry bootstrap
Summary:
- Added opt-in dev instrumentation in `App.tsx` (`?islandRunEntryDebug=1`) to capture first-paint URL flags, bootstrap param consumption, and modal auto-open sequencing.
- Instrumentation emits structured `[IslandRunEntryDebug]` console snapshots aligned to the incident repro protocol (`openIslandRun*` presence, `shouldAutoOpenIslandRun`, and `showLevelWorldsFromEntry` transitions).
- Kept runtime behavior unchanged for non-debug sessions; this slice is diagnostics-only to support evidence-first regression verification.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
Testing:
- npm run build
Next:
- M7O.11 run login-path repro pass (with and without `/level-worlds.html` source) and attach captured console/network evidence before any further bootstrap behavior changes.

Date: 2026-02-27
Slice: M7O.9 — Incident debug ledger for login blank-screen regression
Summary:
- Added `docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md` as an append-only incident ledger for this recurring blank-screen issue.
- Documented suspect code zones, attempted fixes, ranked hypotheses, reproducible debug protocol, and gated decision rule.
- Establishes an evidence-first debugging workflow to avoid repeated blind patch loops.
Files changed:
- docs/10_ISLAND_RUN_LOGIN_BLANK_SCREEN_DEBUG_LOG.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O.10 execute repro protocol with instrumentation and collect concrete failure evidence before further routing changes.

Date: 2026-02-27
Slice: M7O.8 — Consume entry bootstrap flags on first paint to avoid login-path side effects
Summary:
- Added first-paint URL cleanup in `App.tsx` that removes `openIslandRun`/`openIslandRunSource` immediately when present.
- Scoped bootstrap detection to root path (`/`) + explicit source marker to reduce unintended activation after auth/login redirects.
- Kept intentional `/level-worlds.html` entry behavior while preventing stale bootstrap params from lingering through auth transitions.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.9 add integration coverage for bootstrap-param consume path across auth redirect scenarios.

Date: 2026-02-27
Slice: M7O.7 — Scope entry bootstrap to legacy level-worlds redirect source
Summary:
- Restricted auto-open bootstrap in `App.tsx` to require both `openIslandRun=1` and `openIslandRunSource=level-worlds`.
- Updated `/level-worlds.html` redirect shim to set `openIslandRunSource=level-worlds` so intentional entry still works.
- Removes accidental Level Worlds modal activation on unrelated login URLs that might include stale/partial params.
Files changed:
- public/level-worlds.html
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.8 add entry-source analytics on redirect handoff to confirm scoped trigger behavior.

Date: 2026-02-27
Slice: M7O.6 — Baseline alert thresholds + low-volume guardrail
Summary:
- Added shared default hydration alert thresholds in runtime telemetry constants (`fallbackRatio24h`, `failureCount24h`, `minHydrationEvents24h`).
- Updated SQL alert seed query to require minimum hydration volume before triggering fallback-ratio alerts (reduces low-traffic false positives).
- Updated telemetry playbook with explicit default threshold values and code/SQL alignment notes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- docs/09_ISLAND_RUN_RUNTIME_HYDRATION_ALERT_QUERIES.sql
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.7 wire threshold values into ops dashboard config and runbook ownership.

Date: 2026-02-27
Slice: M7O.5 — Backend alert query seeds for hydration fallback monitoring
Summary:
- Added SQL query seeds for hydration source distribution, fallback ratio, and failure trend monitoring.
- Added starter alert query logic for 24h fallback ratio/failure thresholds to accelerate ops rollout checks.
- Unified hydration source typing by reusing shared `IslandRunRuntimeHydrationSource` in game-state store type alias.
Files changed:
- docs/09_ISLAND_RUN_RUNTIME_HYDRATION_ALERT_QUERIES.sql
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.6 validate alert thresholds against production baseline and wire dashboards.

Date: 2026-02-27
Slice: M7O.4 — Hydration telemetry emission guardrails (dedupe)
Summary:
- Added client-side dedupe guard for runtime hydration telemetry to avoid repeated high-volume emits on repeated mounts.
- Dedupe key scopes by user/event/source/day (UTC) using sessionStorage so rollout dashboards retain signal quality.
- Kept hydration logic behavior unchanged; guard only impacts telemetry emission frequency.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.5 align backend alert thresholds with deduped client emission semantics.

Date: 2026-02-27
Slice: M7O.3 — Runtime hydration telemetry playbook + constantized stage/source contract
Summary:
- Added `docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md` with event taxonomy, source meanings, and monitoring guidance.
- Added shared Island Run runtime telemetry constants/type to avoid hard-coded hydration stage/source strings drifting across files.
- Refactored Island Run prototype/runtime-state boundary typings to consume shared hydration source type/constants.
Files changed:
- docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md
- src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.4 wire hydration-source observability into backend analytics queries/alerts.

Date: 2026-02-27
Slice: M7O.2 — Dedicated telemetry event taxonomy for runtime hydration lifecycle
Summary:
- Added dedicated telemetry event types for runtime hydration lifecycle (`runtime_state_hydrated`, `runtime_state_hydration_failed`) instead of overloading `onboarding_completed`.
- Updated Island Run hydration telemetry emissions to use dedicated event types while preserving existing stage/source/error metadata.
- Improves analytics clarity and avoids semantic ambiguity in onboarding funnels.
Files changed:
- src/services/telemetry.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.3 add telemetry query playbook/dashboard doc for fallback rate monitoring.

Date: 2026-02-27
Slice: M7O.1 — Hydration fallback UX + unexpected failure telemetry
Summary:
- Added lightweight UX messaging in Island Run prototype when runtime-state hydration falls back from table reads.
- Added telemetry for unexpected hydration exceptions (`stage: island_run_runtime_state_hydration_failed_unexpected`) with error metadata.
- Preserved table-first behavior and hydration guardrails while improving rollout diagnosability from client signals.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.2 align telemetry taxonomy for hydration lifecycle events (dedicated event type/stage map).

Date: 2026-02-27
Slice: M7O — Runtime-state hydration observability baseline
Summary:
- Added runtime-state hydration source reporting (`table` vs explicit fallback reasons) in the Island Run game-state store/runtime-state service boundary.
- Added `hydrateIslandRunRuntimeStateWithSource` API and backend passthrough so callers can observe hydration provenance without changing persistence behavior.
- Emitted hydration telemetry from `IslandRunBoardPrototype` (`stage: island_run_runtime_state_hydrated`) with source metadata for migration monitoring.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O.1 add backend-facing dashboards/alerts for hydration fallback rate spikes.

Date: 2026-02-27
Slice: M7N.7 — Make Island Run prototype the default Level Worlds surface
Summary:
- Switched `LevelWorldsHub` to default to `IslandRunBoardPrototype` instead of requiring `?islandRunDev=1`.
- Added explicit opt-out behavior (`?islandRunDev=0`) for temporary fallback access to legacy board UI.
- Aligns live user entry with migration intent so users no longer land on old 1/7 arc board by default.
Files changed:
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O remove legacy board code path after final validation window.

Date: 2026-02-27
Slice: M7N.6 — Remove obsolete Lucky Roll bridge prop after direct entry routing
Summary:
- Removed `openLevelWorldsOnMount` from `LuckyRollBoard` now that `openIslandRun` routes directly to `LevelWorldsHub` from `App.tsx`.
- Deleted corresponding reactive open-on-prop effect and reverted Lucky Roll Level Worlds state initialization to internal default.
- Reduced entry-path complexity and eliminated dead migration bridge code.
Files changed:
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O begin formal deprecation of remaining legacy `/level-worlds.html` shim once app-native routes are finalized.

Date: 2026-02-27
Slice: M7N.5 — Direct Level Worlds entry routing (skip Lucky Roll intermediary)
Summary:
- Updated `openIslandRun` bootstrap flow to open `LevelWorldsHub` directly from `App.tsx` instead of first opening `LuckyRollBoard`.
- Preserved one-time URL flag consumption (`openIslandRun`) while reducing modal-chain complexity and improving entry reliability.
- Kept existing Lucky Roll gameplay entry behavior unchanged for in-app usage.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
Testing:
- npm run build
Next:
- M7O consolidate legacy entrypoints and remove obsolete bridge props/routes.

Date: 2026-02-27
Slice: M7N.4 — Fix lost Level Worlds auto-open intent
Summary:
- Fixed a regression where `openIslandRun` was consumed before `LuckyRollBoard` received the `openLevelWorldsOnMount` intent, which could prevent Level Worlds from opening.
- Added dedicated `openLevelWorldsFromEntry` handoff state in `App.tsx` so entry intent survives URL-flag cleanup.
- Added reactive prop sync in `LuckyRollBoard` so late-arriving `openLevelWorldsOnMount` still opens Level Worlds hub.
Files changed:
- src/App.tsx
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O continue runtime-state observability and remove remaining legacy route assumptions.

Date: 2026-02-27
Slice: M7N.3 — One-time `/level-worlds.html` auto-open consumption
Summary:
- Fixed repeat auto-open behavior after `/level-worlds.html` redirect by consuming `openIslandRun=1` only once per page load.
- Removed `openIslandRun` query param from URL after auto-open using `history.replaceState` to prevent repeated modal re-open on later renders.
- Preserved `islandRunDev=1` and other query params while cleaning only the bootstrap flag.
Files changed:
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O continue runtime-state observability and legacy entrypoint retirement.

Date: 2026-02-27
Slice: M7N.2 — Activate Island Run surface for `/level-worlds.html`
Summary:
- Replaced legacy static `/level-worlds.html` 1/7 arc map with a redirect shim into the app runtime (`openIslandRun=1`) so users land on the current Island Run implementation.
- Added app bootstrap handling to auto-open Lucky Roll -> Level Worlds hub when `openIslandRun=1` is present.
- Added Lucky Roll prop-based auto-open path for Level Worlds so `islandRunDev=1` links now surface the 60-tile prototype instead of legacy dots UI.
Files changed:
- public/level-worlds.html
- src/App.tsx
- src/features/gamification/daily-treats/LuckyRollBoard.tsx
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O add runtime-state hydration observability + routing cleanup to retire remaining legacy entry points.

Date: 2026-02-27
Slice: M7N.1 — Runtime hydration guardrails + stale-merge prevention
Summary:
- Prevented first-run modal/telemetry false positives by waiting for runtime-state hydration completion before evaluating first-run gate conditions.
- Blocked daily-hearts claim actions until runtime-state hydration completes to avoid pre-hydration duplicate grants.
- Updated runtime-state patch persistence to merge against hydrated table-first state (when available) instead of local-only reads to reduce stale overwrite risk.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O add explicit runtime-state hydration observability (success/fallback/error telemetry) and API contract hardening.

Date: 2026-02-27
Slice: M7N — Supabase runtime-state read hydration (table-first)
Summary:
- Added explicit runtime-state hydration reads from `island_run_runtime_state` so first-run and daily-hearts markers prefer table/API data when available.
- Phased out auth-metadata fallback for runtime marker reads by defaulting to dedicated game-state storage fallback (`localStorage` + safe defaults).
- Kept non-breaking behavior for demo/no-Supabase environments and runtime-table read failures by retaining local fallback state.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7O align server/API contracts and telemetry for runtime-state hydration/error observability.

Date: 2026-02-27
Slice: M7M — Supabase-ready game-state store write path (with fallback)
Summary:
- Extended Island Run game-state store with a Supabase upsert write path targeting `island_run_runtime_state` (user_id keyed record).
- Kept local storage persistence as fallback so prototype behavior remains stable when table/backend is unavailable.
- Wired runtime backend persistence to use store write result and surface errors when Supabase write path fails.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7N add explicit read hydration from Supabase game-state table and phase out metadata fallback.

Date: 2026-02-27
Slice: M7L — Remove temporary metadata parity bridge for runtime markers
Summary:
- Updated Island Run runtime-state backend to persist runtime markers only in dedicated game-state storage service.
- Removed temporary auth-metadata write-through for first-run/daily marker fields while keeping onboarding completion metadata writes.
- Preserved runtime state read fallback behavior from metadata when no local game-state record exists.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7M implement Supabase-backed Island Run game-state table/API backend and replace browser storage store.

Date: 2026-02-27
Slice: M7K — Dedicated Island Run game-state storage backend (selector default)
Summary:
- Added `islandRunGameStateStore` as dedicated runtime marker storage for Island Run (first-run claim + daily hearts day key).
- Updated runtime-state backend selector default to use game-state storage backend instead of auth-metadata-only backend.
- Kept temporary auth metadata parity write-through in backend persistence while migration completes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7L replace temporary metadata parity bridge with dedicated Supabase game-state table/API and read path hydration.

Date: 2026-02-27
Slice: M7J — Runtime-state backend selector (table/API swap-ready)
Summary:
- Added `islandRunRuntimeStateBackend` with a formal backend interface and selector for runtime marker read/write.
- Moved auth-metadata runtime marker logic behind backend implementation so prototype components remain backend-agnostic.
- Kept current behavior unchanged while enabling future dedicated game-state table/API backend replacement with minimal surface changes.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7K implement dedicated Island Run game-state table backend and switch selector default from auth metadata.

Date: 2026-02-27
Slice: M7I — Runtime-state service boundary for Island Run markers
Summary:
- Added `islandRunRuntimeState` service to centralize read/write of Island Run runtime markers (first-run claim + daily hearts day key).
- Refactored Island Run prototype to use runtime-state service functions instead of reading/writing metadata fields inline.
- Kept current persistence backend unchanged (auth metadata + demo parity) while establishing a clean migration boundary for future game-state table/API work.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7J swap runtime-state backend from auth metadata to dedicated Island Run game-state storage.

Date: 2026-02-27
Slice: M7H — First-run claim marker moved to profile metadata
Summary:
- Replaced localStorage-based first-run claim marker usage with profile metadata field `island_run_first_run_claimed`.
- Updated shared Island Run profile persistence helper to write first-run claim state and kept demo parity mapping.
- Extended demo profile/session shape to expose first-run claim metadata in demo mode.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/services/islandRunProfile.ts
- src/services/demoData.ts
- src/services/demoSession.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7I migrate Island Run runtime markers from auth metadata into dedicated game-state table/API boundary.

Date: 2026-02-27
Slice: M7G — Shared Island Run profile metadata persistence helper
Summary:
- Added shared `persistIslandRunProfileMetadata` helper to centralize Island Run profile metadata writes for both live Supabase users and demo users.
- Refactored onboarding-complete persistence and daily-hearts claim persistence in the prototype to use the shared helper.
- Reduced duplicated `auth.updateUser` / demo profile branching in `IslandRunBoardPrototype` and standardized error handling paths.
Files changed:
- src/features/gamification/level-worlds/services/islandRunProfile.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7H move first-run claim marker + daily-hearts claim marker into server-backed game-state table (not auth metadata) for cleaner domain boundaries.

Date: 2026-02-27
Slice: M7F — Server-backed daily hearts claim persistence
Summary:
- Replaced local-only daily hearts claim persistence with profile-backed state using `island_run_daily_hearts_daykey` metadata.
- Added demo parity by storing daily hearts claim day key in demo profile and exposing it in demo session metadata.
- Added claim telemetry (`economy_earn`) for daily hearts with source/day key payload.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/services/demoData.ts
- src/services/demoSession.ts
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7G move daily-hearts metadata updates into shared reward/profile write service to reduce duplicated auth.updateUser calls.

Date: 2026-02-27
Slice: M7E — Morning hearts guarantee (spin/day hatch split)
Summary:
- Added deterministic daily reward planner that guarantees 1-3 hearts each UTC day for each user.
- Routed daily reward source to either Spin of the Day or Daily Hatch (one source per day), with one-time claim persisted in localStorage.
- Wired Island Run prototype UI to claim daily hearts from the correct source and reflect claim status.
Files changed:
- src/features/gamification/level-worlds/services/islandRunDailyRewards.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7F move daily reward claim persistence from localStorage to server-backed state for cross-device parity.

Date: 2026-02-27
Slice: M7D — Scene-aware stop markers + collision-safe label rules
Summary:
- Upgraded outer-orbit stop markers from text chips to icon-centric markers with per-stop icon mapping (hatchery/boss/dynamic kinds/shop).
- Added scene-aware visual treatment hooks for marker icons and introduced collision-safe label offsets (alternating top/bottom) with viewport clamp.
- Added responsive label behavior to hide orbit labels on smaller viewports to reduce overlap while keeping icon markers interactive.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7E add richer stop art assets and tuned anchor sets per island scene pack.

Date: 2026-02-27
Slice: M7C — Canonical anchored stop placement for outer orbit markers
Summary:
- Replaced computed arc stop-marker positioning with canonical board anchor coordinates for stable placement across viewport sizes.
- Added explicit `OUTER_STOP_ANCHORS` in board layout service to define Hatchery/3 dynamic stops/Boss and Shop marker positions.
- Kept tile-triggered gameplay logic unchanged while using anchored visuals to match intended outside-of-loop stop arrangement.
Files changed:
- src/features/gamification/level-worlds/services/islandBoardLayout.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7D replace text chips with scene-aware stop art assets and collision-safe label rules.

Date: 2026-02-27
Slice: M7B — 60-tile lap readability + outer-orbit stop markers (incl. shop)
Summary:
- Improved board readability so the 60-tile lap is visually explicit in the prototype (center lap label + stronger foreground layering).
- Added outer-orbit stop markers around the loop and included a Shop marker as a dedicated outside-of-loop destination marker.
- Kept gameplay triggers tile-based while making orbit markers clickable shortcuts for stop modal inspection during prototype balancing.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7C replace placeholder stop chips with art/anchors tied to final island scene composition system.

Date: 2026-02-27
Slice: M7A — Persist first-run completion to profile metadata (Supabase + demo parity)
Summary:
- Added first-run launch persistence so Island Run writes `onboarding_complete: true` when first-run launch is confirmed.
- Implemented environment parity: demo sessions update local demo profile, while live sessions update Supabase auth metadata.
- Added guarded failure handling so first-run modal stays open if persistence fails, with actionable landing text for retry.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7B move first-run profile persistence into shared onboarding completion utility (reduce duplicated updateUser paths).

Date: 2026-02-27
Slice: M6F — Metadata-gated first-run flow + telemetry milestones
Summary:
- Integrated first-run Island Run gate with real onboarding metadata (`onboarding_complete`) so celebration flow is skipped for already-onboarded users.
- Added telemetry milestones for first-run flow start, reward claim, and launch confirmation (tracked via `onboarding_completed` with stage metadata).
- Kept one-time local claim marker behavior and starter rewards while adding metadata-driven guardrails.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M7A connect first-run completion to persisted profile/onboarding state write path (Supabase + demo parity).

Date: 2026-02-27
Slice: M6E — First-run gate + celebration claim sequence (prototype)
Summary:
- Added first-run Island Run celebration gate in the prototype using a per-user localStorage claim marker.
- Added two-step first-run flow: starter gift claim then launch step.
- Wired starter grants in prototype state (+5 hearts, +250 coins, +1-heart equivalent dice boost) and blocked rolling until launch step is completed.
- Added prototype coin HUD readout for first-run reward visibility.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6F integrate first-run gate with real onboarding metadata + telemetry events.

Date: 2026-02-27
Slice: M6D — Stop progression states + boss unlock gating (prototype)
Summary:
- Added stop progression state model in Island Run prototype (`active`, `completed`, `locked`) derived from generated stop plans.
- Added boss gating rule: boss stop remains locked until all non-boss stops are completed.
- Added stop completion actions in stop modal and island-complete transition path when boss is completed.
- Exposed stop-state summary in HUD for QA visibility and balancing verification.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6E first-run game onboarding gate + celebration claim sequence wiring.

Date: 2026-02-27
Slice: M6C — Dynamic stop orchestration prototype
Summary:
- Added deterministic island stop generation service with fixed Hatchery/Boss stops and 3 weighted dynamic stops.
- Enforced rule that every island plan includes at least one real-life behavior stop (habit/action or check-in/reflection).
- Wired Island Run prototype to render and resolve active stop content from generated stop plans instead of static stop copy.
- Added stop-plan visibility in prototype HUD to help QA and balancing checks per island.
Files changed:
- src/features/gamification/level-worlds/services/islandRunStops.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6D stop objective state progression (pending/in-progress/completed) + boss unlock gating.

Date: 2026-02-27
Slice: M6B — Hearts-to-dice starter economy prototype wiring
Summary:
- Added Island Run economy helper service with deterministic heart-to-dice conversion tiers.
- Updated Island Run board prototype to use dice pool for rolls and convert hearts into dice when empty.
- Set starter prototype economy baseline to 5 hearts and 20 dice per heart at island 1 (with scaling tiers at higher islands).
Files changed:
- src/features/gamification/level-worlds/services/islandRunEconomy.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M6C stop orchestration rules (5 stops + boss) with dynamic stop pool constraints.

# PROGRESS LOG — HabitGame Main Loop

Date: 2026-02-24
Slice: M1A — Hybrid board renderer v1 + dev overlay
Summary:
- Added canonical 17-anchor board layout data with zBand/tangent/scale and locked stop mapping.
- Implemented a mobile-first Island Run prototype renderer (canvas ring path + tile anchors + stop markers + token + depth mask layer).
- Added dev overlay toggle for anchor indices, stop labels, zBand colors, and tangent arrows.
- Added three depth mask template PNGs and scene switch buttons for 3 background variants in dev mode.
- Wired prototype behind `?islandRunDev=1` in Level Worlds to keep existing flow intact.
Files changed:
- src/features/gamification/level-worlds/services/islandBoardLayout.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- public/assets/islands/depth/depth_mask_001.png
- public/assets/islands/depth/depth_mask_002.png
- public/assets/islands/depth/depth_mask_003.png
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run lint
Next:
- M1B token movement/actions and landing resolution scaffolding.

Date: 2026-02-24
Slice: M1B — Token movement v1 on 60 anchors
Summary:
- Added roll interaction to prototype board (`Roll (1 heart)`) using 1..3 dice outcomes.
- Implemented heart consumption, modulo-17 movement, and per-hop token animation over intermediate anchors.
- Added landing resolver message to indicate stop vs non-stop tile landings.
- Kept dev overlay and debug/tangent visualization fully compatible during movement.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M3A stop modal wiring for each stop tile type.

Date: 2026-02-24
Slice: M3A — Stop modal wiring on landing
Summary:
- Added stop-modal routing for stop tiles (0/12/24/36/59) using stop IDs from canonical stop mapping.
- Implemented five modal stubs (Hatchery, Minigame, Market, Utility, Boss) shown only when landing on stop tiles.
- Kept non-stop tile landings modal-free while preserving roll/hop movement behavior.
- Added modal styling and close action with lightweight dev-friendly presentation.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M4A timer + expiry/travel overlay simulation with state reset.

Date: 2026-02-24
Slice: M4A — Timer + expiry simulation + travel overlay
Summary:
- Added per-island countdown timer (dev duration 45s) to prototype HUD.
- Added expiry detection that triggers a travel overlay and island advancement simulation.
- Implemented reset-on-advance behavior for token position, hearts, roll state, and stop modal state.
- Preserved board stability and roll flow after travel transition completes.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M5A hatchery/egg scaffold in prototype.

Date: 2026-02-24
Slice: M5A — Hatchery/egg scaffold in prototype
Summary:
- Added single active-egg scaffold state to prototype (tier, set time, hatch time).
- Added hatchery stop panel with egg creation actions (common/rare/mythic).
- Added time-based stage progression (1..4) and ready-to-open state messaging.
- Defined expiry behavior in prototype as egg progress carryover across island travel reset.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M6A encounter tile prototype behavior.

Date: 2026-02-24
Slice: M5B-prep — Hearts-empty onboarding booster bridge
Summary:
- Wired Island Run dev prototype to accept session context so it can bridge into existing Game of Life onboarding progress state.
- Added hearts-empty booster action that opens Loop 1 (display-name) onboarding panel copy and interaction.
- On successful "Save name & continue", persisted onboarding display-name loop completion (`stepIndex >= 1`) in existing onboarding storage key and granted +1 heart reward.
- Added guard to prevent repeated booster claiming once the display-name loop has already been completed.
Files changed:
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- npm run lint
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M6A encounter tile prototype behavior.

Date: 2026-02-24
Slice: M6A — Encounter tile prototype behavior
Summary:
- Added a fixed encounter tile marker in the Island Run dev board so at least one encounter tile is clearly identifiable.
- Wired landing resolution so encounter tile landing opens an encounter challenge modal (non-stop, easy stub).
- Added encounter resolve action that grants prototype reward feedback (+1 heart) and updates landing status messaging.
- Preserved existing stop-tile modal behavior so non-encounter tiles and stop flow remain unaffected.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
- manual dev verification at /level-worlds.html?islandRunDev=1&debugBoard=1
Next:
- M7A boss stop reward prototype behavior.

---

## Canonical Design Additions (Topics 1 & 2)

> The rules below are locked design decisions and form part of the single source of truth
> for `docs/07_MAIN_GAME_PROGRESS.md`.  They supersede any earlier or conflicting
> description elsewhere in this document or in other docs under `docs/`.

---

### Global Mini-Game Calendar & Island Ticket Loop

#### Schedule cadence

- There are **5–10 mini-games** total.
- Only **one mini-game is active per player at a time**, tied to their current island timer
  (these durations match the island timer values defined in the island progression rules):
  - Normal island: active mini-game lasts **48 h** (same as island duration).
  - Special island: active mini-game lasts **72 h** (same as island duration).
- Schedule rotates **automatically** with equal weight across all mini-games by default.
- Analytics track which mini-game is played most vs least; rotation weights can be tuned
  over time based on data.
- Different players can be on different active mini-games simultaneously (the "corridor"
  overlap effect is expected and acceptable).
- If a player hasn't logged in for **3+ days**, they are guaranteed to land on a new island
  with a fresh mini-game on next open.
- Sub-level progress within a mini-game **persists across sessions** within the active
  window; resets when the island changes.
- Async multiplayer (attacking other players' snapshots) is noted as a future optional
  layer — not in scope now.

#### Mini-game stop placement (harmonised rule)

- If the **egg is NOT Step 1** → mini-game is **Step 1**.
- If the **egg IS Step 1** → mini-game is **Step 2**.
- Mini-game stop is always an **outer POI** (not a ring tile).
- Once accessible (after Step 1 completed), the mini-game stop can be visited **anytime**
  without re-landing on a tile.

#### Island mini-game ticket loop (Monopoly GO style)

1. Player rolls dice on the 60-tile ring.
2. Landing on certain tiles awards **island mini-game tickets** (temporary, island-scoped).
3. Completing LifeGoal actions (habits, journal entries, check-ins, goals) **also awards
   tickets** for the current island — even outside the game.
4. Player taps the mini-game stop (outer POI) and spends tickets to play.
5. Each ticket = one "go" or action in the mini-game.
6. Mini-game sessions award back **coins / diamonds / hearts** as rewards (blind-box style).
7. **All unspent tickets are lost when moving to the next island.**

#### Step unlocker tile

- There is one special **"step unlocker tile"** on the 60-tile ring — visually larger and
  distinct from other tiles.
- Flow:
  1. Player arrives on island → **Step 1 is automatically active** (no landing needed).
  2. Player completes **Step 1 challenge**.
  3. Completing Step 1 **activates the unlocker tile** (it glows/lights up).
  4. Player lands on the unlocker tile → player avatar visually moves from Step 1 to Step 2
     on the outer POI path → **Step 2 is now unlocked**.
  5. Unlocker tile **deactivates** — player must now complete Step 2's challenge.
  6. Completing Step 2 **reactivates** the unlocker tile.
  7. Player lands again → Step 3 unlocked. Repeat through Step 4 → Step 5 (Boss).
  8. The **path between outer step nodes glows** when the next transition is ready (visual
     affordance).
- The unlocker tile **randomly spawns a 3-D gift** 20 % of the time.
  - When landed on, the gift yields a blind-box reward.
  - Gift and unlocker can co-exist: landing resolves the gift reward **and** advances the
    step if the unlocker is active.

#### Double dice micro-tiles

- Each of the 17 main tiles has **2 smaller "dice circle" micro-tiles** on top of it.
- Rolling dice advances the player through micro-tiles; every 2 micro-tiles = 1 full main
  tile advance.
- This effectively makes movement feel like **34 micro-steps** across 17 main tiles.
- Visual: two small circles sit on/above each main tile.
- Purpose: makes dice rolls feel more frequent and satisfying without changing core board
  size.

---

### Boss Variety Model (Step 5)

#### Boss type assignment

- Boss is always **Step 5**.
- Boss type is **fixed per island** (deterministic, seeded by island number).
- Boss type never changes between cycles — if Island 34 has a fight boss, it always has a
  fight boss.
- Split: approximately **75 % milestone bosses / 25 % fight bosses** across the 120 islands.

#### Milestone boss

- Player must reach a **required sub-level** in the currently active mini-game to pass.
- Required sub-level **scales with island number** (e.g. early islands: sub-level 3;
  mid islands: sub-level 5; late islands: sub-level 7+).

#### Fight boss

- A **dedicated separate boss mini-game** (not the active calendar mini-game).
- Example formats: shooter, flappy-bird style, "reach the finish line", "shoot down the boss".
- Also scales in difficulty with island number.
- **Hearts = lives**: each attempt costs 1 heart; fail = lose a heart.
- **Instant retry** as long as the player has hearts.

#### Heart economy (cross-system, scales with island number)

| Heart source | Notes |
| --- | --- |
| Daily treat (PWA push/notification) | Gifted daily, outside the game; **amount scales with island number** (higher island = more daily hearts) |
| In-app LifeGoal actions | Completing habits, journal entries, check-ins awards a **limited daily heart budget** (daily cap; tied to actual real-life activity that day) |
| Micro-transaction (Stripe) | Buy hearts instantly with real cash if player doesn't want to wait |
| Board rewards / blind-box | Can be awarded as part of tile landing rewards or egg rewards |
| Hearts never reset | Hearts are global, persistent, earned and spent |

#### Scaling rationale

- As island number increases → daily gifted hearts increase → matches the fact that bosses
  get harder.
- Keeps the game fair without being pay-to-win: consistent habit completion = enough hearts
  to progress.

#### Core retention loop (real app integration)

- The main game reads from the real app's activity (habits completed, journals written,
  check-ins done) to determine daily heart awards.
- Daily cap prevents farming — tied to realistic daily habit completion.
- The daily treat (PWA notification) is the delivery mechanism for the base daily heart gift.
- Loop:
  - Do your habits → earn hearts → play more / attempt boss more → progress in game.
  - Don't do habits → fewer hearts → game harder → motivation to return to habits.
- This is the core differentiator from Monopoly GO: game difficulty and resource economy
  are tied to real-life behaviour, not just time or cash.

---

## Island Completion, Player Profile & Island Upgrades

### Island completion is permanent

- Completion states: not completed → partial → boss defeated → completed (100%).
- **100% completion is permanent forever** — it never resets across cycles/loops.
- `cycle_index` exists only as an analytics counter (how many full loops the player has
  done); it does NOT reset island completion states.

### Completed islands stay fully playable

"Completed" does NOT mean locked or dead. On every revisit to a completed island the
player can still:

- ✅ Roll dice on the ring (earn mini-game tickets + tile rewards)
- ✅ Visit and play the mini-game stop (spend tickets, earn coins/diamonds/hearts)
- ✅ Fight the boss again (repeatable; awards coins/diamonds each time)
- ✅ Earn currency for the global shop (coins/diamonds remain valuable indefinitely)
- ✅ Earn XP toward player level-up
- ✅ Interact with any island upgrades they have purchased

What the player CANNOT do again on a completed island:

- ❌ Set a new egg (one-time per island; Home Island is the repeatable exception because it
  functions as a persistent hub that supports continuous egg cycles)
- ❌ Re-collect one-time step rewards

### Player Profile / Player Score (new system)

Each player has a persistent profile (keyed by Supabase auth user ID / player ID)
tracking:

| Field | Source |
| --- | --- |
| Game level | XP earned from all game actions (boss defeats, mini-game sub-levels, tile rewards) |
| Habit status | Pulled from the real PWA outside the game (streak, completion rate, active habits count) |
| Islands completed (100%) | Count of permanently completed islands |
| Bosses defeated | Cumulative total (including repeat fights) |
| Mini-game personal best sub-levels | Per mini-game high-water mark |
| Lifetime coins/diamonds earned | Economy stats |

- Player ID is visible in the game as a profile card / HUD element.
- Player profile is the foundation for future async multiplayer (targeting other players'
  islands).

### Island Upgrades (keeps completed islands alive long-term)

- Once an island is 100% completed it becomes **eligible for upgrades**.
- Upgrades are purchased with coins/diamonds earned from gameplay (acts as a meaningful
  currency sink).
- **Upgrades are permanent (Option A)**: buy once, benefit forever on every revisit.
- Example upgrade categories:
  - **Buildings** (functional): e.g. lighthouse = extra daily hearts, market stall = shop
    discount, workshop = faster home egg hatch
  - **Decorations** (cosmetic): personalise the island visually
  - **Capacity upgrades**: better chest odds, more tile reward slots
- When a player visits an upgraded completed island on a later loop, upgrades provide
  **passive bonuses** for that island's duration.
- This creates a long-term meta-game ("which islands do I want to invest in?") and ties
  naturally into the Home Island hub.

---

## Topic 4: Home Island v0 & Equipment Integration

### Home Island v0 — `GameBoardOverlay.tsx` IS the Home Island

The existing `src/components/GameBoardOverlay.tsx` is repurposed as the Home Island hub
overlay. No new component needed for v0.

**Layout (confirmed by code audit):**

| Element | What it does | Status |
|---|---|---|
| Background | Island `.webp` art layered over existing black transparent backdrop. Black bg stays — island art may not be full-screen. | **Add: use one of the 7 existing island background `.webp` files as static placeholder** |
| Top bar | Player level + momentum bar | ✅ Exists |
| Left circle ① | Spin & Win → opens Daily Spin Wheel | ✅ Working |
| Left circle ② (middle) | **Home Egg Hatchery** — repurposed from `onDailyHatchClick` / `CountdownCalendarModal` | **To wire: repurpose to open Home Hatchery UI** |
| Left circle ③ | Hearts / Lucky Roll board | ✅ Working |
| Right ① BANK | Opens Score Tab → bank tab | ✅ Fixed (was opening `mobileGamificationOverlay` instead) |
| Right ② Diamonds | Opens Score Tab → garage tab | ✅ Fixed (was opening `mobileGamificationOverlay` instead) |
| Right ③ Gold/Coins | Opens Score Tab → shop tab | ✅ Fixed (was opening `mobileGamificationOverlay` instead) |
| PLAY button | Launches Island Run board (`/level-worlds.html`) | ✅ Working |

**Background implementation note for future agent:**
- Keep `game-board-overlay__backdrop` (black transparent layer) as-is.
- Add island `.webp` as a `background-image` on `game-board-overlay__content` or a new
  inner wrapper.
- Use one of the 7 existing island background webp files already in the repo as a
  placeholder (pick whichever looks most "home island"-like).
- Island art is intentionally not full-screen; black shows around edges — this is by
  design.

**Home Egg Hatchery wiring note for future agent:**
- `onDailyHatchClick` currently opens `CountdownCalendarModal`
  (`setShowCalendarPlaceholder(true)`).
- Repurpose this to open the Home Island Hatchery panel (wired to the existing home
  hatchery logic in `IslandRunBoardPrototype.tsx` M9A–M9G).
- The `CountdownCalendarModal` / calendar placeholder is considered outdated and can be
  removed once the hatchery is wired.

---

### Equipment & Customization → In-game Effects (locked v0 design)

The existing `src/features/avatar/avatarItemCatalog.ts` is the single source of truth
for all equipment items. Items are synced across three surfaces (same ownership state):

1. **In-app Equipment & Customization tab** (cosmetic display, existing)
2. **In-app Score Tab / Shop** (purchasable with Points, existing)
3. **In-game shop** (new game-specific UI, purchasable with Coins/Diamonds — to be built)

**Item rarity:** Ultra-rare boss drop items (`unlockCondition: 'boss_drop'`) can be
awarded approximately 2 times per year as a special boss victory reward. This field
needs to be added to the catalog type when implemented.

**In-game effects by category (v0 locked suggestions):**

| Category | Item example | Game effect |
|---|---|---|
| 🛠️ Tools | Telescope (Scholar's Telescope) | Reveal next tile type before rolling |
| 🛠️ Tools | Logic Engine | +1 to dice roll range (rolls 1–4 instead of 1–3) |
| 🛠️ Tools | Research Flask | Double island mini-game tickets earned for one session |
| 🍀 Charms | Phoenix Feather | 1 free boss retry per island (no heart cost) |
| 🍀 Charms | Lion's Mane Talisman | +10% coin reward from all tile landings |
| 🍀 Charms | Gladiator's Coin | +1 heart awarded on boss victory |
| 👗 Garments | War Boots | Timer countdown displays 10% more generously |
| 👗 Garments | Battle Crown | +15% XP from all boss defeats |

**Implementation note for future agent:**
- Effects are NOT yet implemented in code — this is the design spec.
- When implementing, read the player's owned items from the avatar inventory and apply
  effects at the relevant game event points (roll resolution, boss resolution, tile
  reward calculation).
- Only equipped/owned items apply. No equip slot limit defined for v0 — all owned
  items' effects are active simultaneously.

---

## Home Island v0 & Equipment Integration

### The GameBoardOverlay IS Home Island v0

The existing `src/components/GameBoardOverlay.tsx` serves as the Home Island hub overlay. No new component is needed for v0.

#### Layout (confirmed by code audit)

| Element | What it does | Status |
|---|---|---|
| Background | Island `.webp` art layered over existing black transparent backdrop. Black bg stays — island art may not be full-screen. | Add: use one of the 7 existing island background `.webp` files as static placeholder |
| Top bar | Player level + momentum bar | ✅ Exists |
| Left circle ① | Spin & Win → opens Daily Spin Wheel | ✅ Working |
| Left circle ② (middle) | **Home Egg Hatchery** — repurposed from `onDailyHatchClick` / `CountdownCalendarModal` | To wire: repurpose to open Home Hatchery UI |
| Left circle ③ | Hearts / Lucky Roll board | ✅ Working |
| Right ① BANK | Opens Score Tab → bank tab | ✅ Working (bug fixed in separate PR) |
| Right ② Diamonds | Opens Score Tab → garage tab | ✅ Working (bug fixed in separate PR) |
| Right ③ Gold/Coins | Opens Score Tab → shop tab | ✅ Working (bug fixed in separate PR) |
| PLAY button | Launches Island Run board (`/level-worlds.html`) | ✅ Working |

#### Background implementation note (for future agent)
- Keep `game-board-overlay__backdrop` (black transparent layer) as-is.
- Add island `.webp` as a `background-image` on `game-board-overlay__content` or a new inner wrapper.
- Use one of the 7 existing island background webp files already in the repo as a placeholder.
- Island art is intentionally not full-screen; black shows around edges — this is by design.

#### Home Egg Hatchery wiring note (for future agent)
- `onDailyHatchClick` currently opens `CountdownCalendarModal` (`setShowCalendarPlaceholder(true)`).
- Repurpose this to open the Home Island Hatchery panel (wired to the existing home hatchery logic in `IslandRunBoardPrototype.tsx` M9A–M9G).
- `CountdownCalendarModal` / calendar placeholder is considered outdated and can be removed once the hatchery is wired.

---

### Equipment & Customization → In-Game Effects (locked v0 design)

The existing `src/features/avatar/avatarItemCatalog.ts` is the single source of truth for all equipment items. Items are synced across three surfaces via the same ownership state:

1. **In-app Equipment & Customization tab** (cosmetic display, existing)
2. **In-app Score Tab / Shop** (purchasable with Points, existing)
3. **In-game shop** (new game-specific UI, purchasable with Coins/Diamonds — to be built)

**Ultra-rare boss drop items** (`unlockCondition: 'boss_drop'`) can be awarded approximately 2 times per year as a special boss victory reward. This field needs to be added to the catalog type when implemented.

#### In-game effects by category (v0 locked)

| Category | Item example | Game effect |
|---|---|---|
| 🛠️ Tools | Scholar's Telescope | Reveal next tile type before rolling |
| 🛠️ Tools | Logic Engine | +1 to dice roll range (rolls 1–4 instead of 1–3) |
| 🛠️ Tools | Research Flask | Double island mini-game tickets earned for one session |
| 🍀 Charms | Phoenix Feather | 1 free boss retry per island (no heart cost) |
| 🍀 Charms | Lion's Mane Talisman | +10% coin reward from all tile landings |
| 🍀 Charms | Gladiator's Coin | +1 heart awarded on boss victory |
| 👗 Garments | War Boots | Timer countdown displays 10% more generously |
| 👗 Garments | Battle Crown | +15% XP from all boss defeats |

#### Implementation note (for future agent)
- Effects are NOT yet implemented in code — this is the design spec.
- When implementing, read the player's owned items from the avatar inventory and apply effects at the relevant game event points (roll resolution, boss resolution, tile reward calculation).
- Only owned items apply. No equip slot limit in v0 — all owned items' effects are active simultaneously.

---

## In-Game Onboarding & Continuous Improvement

### Core design principle
> Onboarding is a **saviour, not a task list**. It appears when the player needs resources and rewards completing real-life actions with in-game currency. It never feels like forced setup.

---

### When onboarding triggers (in-game)

| Trigger | What happens |
|---|---|
| First ever session (new account, no PWA onboarding done) | Automatic first-run celebration → guided island onboarding pop-up |
| PWA onboarding already completed before entering game | Skip game onboarding entirely → auto-award the same reward |
| `dicePool < 1` AND `hearts < 1` (established player) | Continuous improvement pop-up appears as saviour: 1 habit suggestion from AI engine |
| Mini-game tickets = 0 AND Step 3 is unlocked | Soft nudge: "Do a habit to earn tickets" |

---

### Skip logic (no redundant onboarding)
- If the player has **already completed PWA onboarding** (habits set up, goals set, profile done) → skip game onboarding entirely → award the same reward automatically.
- Check against `isOnboardingComplete` flag (already exists in `IslandRunBoardPrototype.tsx`).
- Only trigger game onboarding if: account is new OR no habits exist yet OR PWA onboarding is not complete.

---

### In-game onboarding — custom UI (NOT the PWA onboarding UI)
- **Separate component** — does NOT reuse `GameOfLifeOnboarding.tsx` or `DayZeroOnboarding.tsx` UI.
- Game-native design: in-game pop-ups, island-themed visuals, matching game UI language and colour palette.
- Reuses **logic only** from existing systems:
  - Habit creation: `habitAiSuggestions.ts` → `generateHabitSuggestion()`
  - Habit saving: `createHabitV2()`
- Steps feel like "island quests", not task forms. Example copy:
  - "Before you can roll again, your island needs a champion habit 🏝️"
  - "Pick one life area to protect"
  - "What's the smallest thing you can do today?"
  - → Claim reward → back to rolling

### Reward on completion (same whether done in-game or in PWA)
- **+5 hearts + 250 coins** (already implemented in `IslandRunBoardPrototype.tsx` first-run flow)
- If completed in PWA before entering game → reward claimed automatically on first game session open

---

### Continuous Improvement (replaces onboarding for established players)

**Same trigger** (`dicePool < 1 && hearts < 1`) but now surfaces the **intelligent habit suggestion system** instead of onboarding.

#### How it works
1. Reads from `suggestionsEngine.ts` → `buildAllSuggestions()` — classifies every habit as `underperforming / stable / progressing`
2. In-game pop-up surfaces **1 specific habit suggestion** (highest-priority underperforming habit)
3. Player taps "Fix it" → opens the habit adjustment wizard (in-game styled, not full PWA UI)
4. Completing/applying the suggestion → **reward: +2–3 hearts + mini-game tickets**
5. Player returns to rolling

#### The retention loop
```
Out of hearts
  → game surfaces: "Your morning walk habit has been struggling"
  → player adjusts it (AI-suggested easier version)
  → earns hearts
  → keeps playing
  → real-life habit improves
```

This is the core differentiator: game difficulty and resource economy are tied to real-life behaviour.

#### Intelligence systems already built (just needs wiring)

| What's needed | Already exists |
|---|---|
| Classify which habits need attention | `src/features/habits/performanceClassifier.ts` + `buildAllSuggestions()` in `suggestionsEngine.ts` |
| Generate warm AI explanation copy | `buildEnhancedRationale()` in `src/features/habits/aiRationale.ts` |
| Apply the suggestion | `saveAndApplySuggestion()` in `src/services/habitAdjustments.ts` |
| Adherence data (7-day / 30-day) | `buildAdherenceSnapshots()` in `src/services/adherenceMetrics.ts` |
| Habit AI creation | `generateHabitSuggestion()` in `src/services/habitAiSuggestions.ts` |

---

### Summary table

| Phase | Trigger | What shows | Reward |
|---|---|---|---|
| First run (new account) | Auto on first game open | Island-themed onboarding pop-up (custom game UI, habit setup) | +5 hearts + 250 coins |
| Already onboarded in PWA | Auto on first game open | Skip → auto-claim reward | +5 hearts + 250 coins |
| Out of hearts/dice (established player) | `dicePool < 1 && hearts < 1` | Continuous improvement pop-up: 1 AI habit suggestion | +2–3 hearts + tickets |
| Out of tickets (established player) | `tickets < 1 && Step 3 unlocked` | Soft nudge: "complete a habit today to earn tickets" | +tickets |

---

Date: 2026-03-03
Slice: M11A — Minigame framework scaffold
Summary:
- Introduced IslandRunMinigame interface, IslandRunMinigameResult/Reward types, and ISLAND_RUN_MINIGAME_REGISTRY in new islandRunMinigameService.ts
- Added resolveMinigameForStop() helper (returns shooter_blitz for all stops; M11B will make this data-driven)
- Wired minigame stop CTA in IslandRunBoardPrototype through the registry — ad-hoc ShooterBlitz call now routes via launcher contract
- ShooterBlitz stub launcher fires onExit() until M11B wires reward passthrough; backward-compatible (setShowShooterBlitzFromStop still called)
Files changed:
- src/features/gamification/level-worlds/services/islandRunMinigameService.ts (new)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build
Next:
- M11B: Wire ShooterBlitz fully through the M11A framework — implement shooter_blitz launch() to open the component, pipe the real onComplete reward to the caller, and remove the setShowShooterBlitzFromStop bypass.

---

Date: 2026-03-03
Slice: M11B — Minigame framework: IslandRunMinigame interface, entry/exit contract, reward passthrough
Summary:
- Introduced IslandRunMinigameProps, IslandRunMinigameReward, IslandRunMinigameResult interfaces in islandRunMinigameTypes.ts
- Implemented islandRunMinigameRegistry.ts with registerMinigame/getMinigame/getAllMinigames
- Built IslandRunMinigameLauncher component that resolves any registered minigame by ID
- Adapted ShooterBlitz to accept onComplete callback (IslandRunMinigameProps compatible) while keeping onClose for backward compat; session now optional (falls back to SupabaseAuthProvider context)
- Replaced ad-hoc showShooterBlitzFromStop in IslandRunBoardPrototype with activeLaunchedMinigameId + IslandRunMinigameLauncher
- ShooterBlitzMinigameAdapter registered in LevelWorldsHub to bridge ShooterBlitz into the registry without changing its session requirement
- Fixed: LevelWorldsHub now renders as a fixed full-screen overlay in App.tsx (z-index 9999, body scroll locked) — prevents island board being visible by scrolling in other tabs
- Added back button (← Back) to LevelWorldsHub IslandRunBoardPrototype path
Files changed:
- src/features/gamification/level-worlds/services/islandRunMinigameTypes.ts (new)
- src/features/gamification/level-worlds/services/islandRunMinigameRegistry.ts (new)
- src/features/gamification/level-worlds/components/IslandRunMinigameLauncher.tsx (new)
- src/features/gamification/games/shooter-blitz/ShooterBlitz.tsx
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorldsHub.tsx
- src/App.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build
- Navigate to any app tab, scroll down — island board must NOT be visible
- Click PLAY on GameBoardOverlay — island board opens as full screen
- From island board, tap a minigame stop — ShooterBlitz launches via framework
- Completing ShooterBlitz calls onComplete and awards rewards; abandoning calls onComplete({ completed: false })
- Back button on LevelWorldsHub returns to main app
Next:
- M11C: per-island stop enforcement (gate boss behind completing all non-boss stops)

---

Date: 2026-03-03
Slice: M11C — Per-island stop enforcement: Step 1 gate, stop progress HUD chip, boss lock visual, completedStops persistence
Summary:
- handleRoll() and handleSpin() now gate behind Stop 1 completion: if Step 1 is not yet done, roll is blocked and landingText shows "Complete Stop 1 first" message
- HUD status row now renders a dynamic stop progress chip: "Complete Stop 1 to unlock dice 🔒" / "X/N stops done — unlock boss!" / "✅ All stops cleared"
- Boss orbit stop now shows 🔒 icon (instead of 👑) when stopStateMap returns 'locked' (all non-boss stops not yet complete)
- completedStops is now persisted per-island in localStorage under key island_run_stops_{userId}_island_{islandNumber}
- completedStops is restored from localStorage on hydration and whenever islandNumber changes
- performIslandTravel() clears the old island's localStorage key before travelling to the next island
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build passes
- On new island: Roll / Spin shows "Complete Stop 1 first" message and does not advance token
- After completing Stop 1: Roll / Spin works normally
- Boss orbit stop shows 🔒 until all non-boss stops are completed
- HUD chip shows correct progress state at each stage
- completedStops survives page refresh (localStorage per-island key)
- Travelling to new island clears old island's completedStops from localStorage
Next:
- M11D: completedStops Supabase persistence (add completed_stops column to island_run_runtime_state table; wire through readIslandRunGameStateRecord / writeIslandRunGameStateRecord / hydrateIslandRunGameStateRecordWithSource)

---

Date: 2026-03-03
Slice: M13-UX-POLISH — Collapse dev/prototype info panel behind toggle; board as primary visual
Summary:
- Added isDevPanelOpen state (default false) to IslandRunBoardPrototype
- Added "▼ Dev info / ▲ Hide dev info" toggle button next to h2 title
- Wrapped entire HUD grid, Home Hatchery panel, and Controls section in {isDevPanelOpen && <div id="island-run-dev-panel">}
- Added always-visible controls bar (island-run-prototype__always-controls) containing: Roll button, Spin button (when spinTokens > 0), audio toggle, Stop 1 enforcement message
- Removed Roll/Spin/audio toggle from dev panel controls section (they are now in always-controls)
- Added CSS classes: .island-run-prototype__dev-toggle and .island-run-prototype__always-controls to LevelWorlds.css
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/07_MAIN_GAME_PROGRESS.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
Testing:
- npm run build passes
- On load: only board + always-visible controls shown; header HUD/dev info hidden
- Clicking "▼ Dev info" expands full header panel
- Clicking "▲ Hide dev info" collapses it again
- Roll, Spin, audio toggle, Stop 1 message always visible regardless of panel state
Next:
- M11D: completedStops Supabase persistence

---

Date: 2026-03-03
Slice: M14 — Shop separation & unlock tiers
Summary:
- Removed market stop from generateIslandStopPlan(); 5 stops are now: hatchery, minigame, utility, dynamic, boss.
- Renamed IslandStopPlanEntry.stopId type: removed 'market', added 'dynamic'.
- Added persistent 🛍️ Shop HUD button always accessible from the Island Run header.
- Shop panel shows Tier 1 items (dice bundle, heart bundle) always; Tier 2 (heart boost bundle, 80 coins → +3 hearts) gated behind bossTrialResolved.
- Egg selling available in shop when eggStage >= 4; rewards: common=20 coins, rare=50 coins, mythic=120 coins.
- Market stop modal and related dead code paths (setActiveStopId('market'), market stop completion audio/haptic) removed.
- Shop orbit visual removed from orbitStopVisuals (shop is now a HUD button, not a board orbit stop).
Files changed:
- src/features/gamification/level-worlds/services/islandRunStops.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build passes (pre-existing IslandRunMinigameReward.dice TS error unrelated to M14)
- Island orbit stops show only 5 stops (hatchery, minigame, utility, dynamic, boss) — no market
- 🛍️ Shop button is visible in the HUD header at all times
- Shop opens with Tier 1 items (dice bundle + heart bundle)
- Tier 2 is locked before boss resolved, unlocked after
- Egg sell appears only when eggStage >= 4
Next:
- M15: Real island timer — replace ISLAND_DURATION_SEC dev constant with Supabase started_at/expires_at timestamps

---

Date: 2026-03-04
Slice: M16B — Shard earn logic
Summary: Created shardMilestoneEngine.ts (pure util — SHARD_EARN constants, SHARD_MILESTONE_THRESHOLDS, computeShardEarn); wired egg_shard tile, stop_complete, boss_defeat earn paths in IslandRunBoardPrototype; local shard state synced with Supabase via persistIslandRunRuntimeStatePatch; milestone crossing triggers landing text feedback; island travel resets shard state.
Files changed: src/features/gamification/level-worlds/services/shardMilestoneEngine.ts (new), src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (modified), docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (updated), docs/07_MAIN_GAME_PROGRESS.md (appended)
Testing: Landing on egg_shard tile → islandShards increments +1 and persists; completing any non-boss stop → +2 shards; boss defeat → +5 shards; shardTierIndex advances when threshold crossed; shardClaimCount increments on chain completion; island travel → all three fields reset to 0; npm run build passes.
Next: M16C — Collectible Progress Bar HUD pill (read-only display)

---

Date: 2026-03-04
Slice: M16C — Collectible Progress Bar HUD pill
Summary: Added read-only shard progress pill to the Island Run HUD, always visible outside the dev panel. Pill displays era emoji (derived from `shardTierIndex % 7`; 🌟 for special islands) + `islandShards / tier_threshold` where tier_threshold is the absolute shards needed for the current tier from `SHARD_MILESTONE_THRESHOLDS`. Added `ERA_EMOJIS`, `getShardEraEmoji`, and `getShardTierThreshold` helpers. Added pill CSS in LevelWorlds.css (amber-tinted pill, distinct from other HUD chips). Display choice: shows absolute tier threshold (e.g. `⚡ 5 / 20`) rather than remaining distance, for clearer player understanding.
Files changed: src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (helpers + pill JSX + SHARD_MILESTONE_THRESHOLDS import), src/features/gamification/level-worlds/LevelWorlds.css (pill styles), docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M16C shipped, Next Slice → M16D), docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing: Pill renders in HUD at all times (not gated by dev toggle); updates reactively as islandShards changes via tile/stop/boss earn paths (M16B); special island 5 shows 🌟; normal islands show ⚡ at tier 0; npm run build passes with zero new TS errors.
Next: M16D — Claim button + blind-box reward reveal

---

Date: 2026-03-04
Slice: M16D — Progress bar fill animation
Summary: Added fill animation to the shard progress pill. Pill now has an inner fill `<div>` whose `width` is driven by `islandShards / tier_threshold * 100%`. Smooth CSS `transition: width 0.4s ease-out` animates the bar as shards are earned. When the fill reaches 100% (milestone hit) the pill plays a brief glow pulse via `@keyframes shard-pill-milestone-pulse` (~0.6s). On island travel (`islandShards` resets to 0), a `useEffect` detects the reset and temporarily disables the transition for one animation frame so the bar snaps to 0 instantly. Pill text is layered above the fill via `position: relative; z-index: 1` on the content wrapper, ensuring readability at all fill levels.
Files changed: src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (prevShardsRef + shardFillNoTransition state + useEffect + updated pill JSX), src/features/gamification/level-worlds/LevelWorlds.css (fill bar styles + celebration keyframe), docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M16D shipped, Next Slice → M16E), docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing: Roll dice and land on egg_shard tile — fill bar animates from previous % to new %; earn shards to threshold — celebration pulse plays; travel to next island — fill bar snaps to 0% instantly; pill text readable at all fill levels (0%, 50%, 100%); npm run build passes with zero new TS errors.
Next: M16E — Claim button + blind-box reward reveal

---

Date: 2026-03-04
Slice: M16E — Claim button + blind-box collectible reveal
Summary: Added `resolveCollectibleForClaim(shardTierIndex)` helper to islandRunRuntimeState.ts (7 era collectibles cycling by tier index). Created ShardClaimModal.tsx: full-screen blind-box reveal modal with 0.5s shimmer animation before the collectible emoji pops in, plus a "Collect!" confirm button. Added `pendingClaimTierIndex` + `showClaimModal` state to IslandRunBoardPrototype; `awardShards` now captures the completed tier index and sets `pendingClaimTierIndex` when `milestonesReached > 0`. Shard pill gains a "Claim!" button (animated bounce) when `pendingClaimTierIndex !== null`; clicking opens the modal. On Collect!: `market_purchase_success` sound + `reward_claim` haptic fire, modal closes, pending claim is cleared. Island travel also clears both new state fields. CSS added: claim button bounce keyframe, shimmer placeholder, collectible pop-in keyframe, modal layout styles.
Files changed:
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts (resolveCollectibleForClaim + CollectibleInfo type)
- src/features/gamification/level-worlds/components/ShardClaimModal.tsx (new)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (pendingClaimTierIndex, showClaimModal, updated awardShards, Claim button, ShardClaimModal wire-up)
- src/features/gamification/level-worlds/LevelWorlds.css (claim button + modal + shimmer + pop-in styles)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M16 ✅ complete, Next Slice → M17A)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- Set islandShards to tier threshold in dev → "Claim!" button appears on pill
- Tap "Claim!" → blind-box modal opens with shimmer for ~0.5s then collectible reveals
- Tap "Collect!" → modal closes, audio + haptic fire, pendingClaim cleared
- Island travel clears pending claim state
- npm run build passes with zero new TypeScript errors
Next:
- M17A: Currencies & Shield — add shields + shards to wallet state and persistence

---

Date: 2026-03-04
Slice: M16B — Shard award logic wired (stops, boss, egg)
Summary:
- Added `egg_open: 2` to `SHARD_EARN` constant in shardMilestoneEngine.ts (egg open source was missing from the original M16B ship)
- Called `awardShards('egg_open')` inside `handleOpenEgg` in IslandRunBoardPrototype.tsx so shards are awarded when a player opens/hatches an egg
- All four shard earn sources are now wired: egg_shard_tile (+1), stop_complete (+2), boss_defeat (+5), egg_open (+2)
- `island_shards` increments and persists via `persistIslandRunRuntimeStatePatch` on egg open (same path as stops/boss)
Files changed:
- src/features/gamification/level-worlds/services/shardMilestoneEngine.ts (added egg_open source)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (awardShards('egg_open') in handleOpenEgg)
Testing:
- npm run build
Next:
- M16C: shard_tier_index advancement — milestone chain progression logic

---

Date: 2026-03-04
Slice: M16C — Shard tier index advancement + milestone chain progression
Summary:
- Exported `getShardTierThreshold(tierIndex: number): number` from `shardMilestoneEngine.ts` with correct cumulative threshold formula (T1–T5 fixed, T6+ = 500 + (n−5)×150 per canonical doc)
- Exported `SHARD_EXTENDED_BASE_THRESHOLD` and `SHARD_EXTENDED_TIER_INCREMENT` constants from `shardMilestoneEngine.ts`
- Updated `computeShardEarn` to return `shardMilestoneReached: boolean` instead of `milestonesReached: number`; engine no longer auto-advances `shardTierIndex` or subtracts shard counts (carry-forward model per canonical spec)
- Added `shardMilestoneReached: boolean` local state to `IslandRunBoardPrototype.tsx`
- `awardShards` now sets `shardMilestoneReached = true` (once) and `pendingClaimTierIndex` when threshold is crossed; tier index does NOT advance until player claims
- Hydration restores `shardMilestoneReached` + `pendingClaimTierIndex` from persisted state on app restart
- Island travel no longer resets `islandShards`, `shardTierIndex`, or `shardClaimCount` — they are lifetime-cumulative per canonical spec; claim modal is closed on travel but claim state persists
- `onCollect` in M16E claim modal now advances `shardTierIndex` + `shardClaimCount` and persists them (tier advancement is player-gated)
- Removed local `getShardTierThreshold`, `SHARD_EXTENDED_BASE_THRESHOLD`, `SHARD_EXTENDED_TIER_INCREMENT` from `IslandRunBoardPrototype.tsx` (now imported from engine)
- Shard pill milestone state now driven by `shardMilestoneReached` flag
Files changed:
- src/features/gamification/level-worlds/services/shardMilestoneEngine.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md
Testing:
- npm run build passes (zero new TypeScript errors)
Next:
- M16D: Collectible Progress Bar HUD pill (era emoji + shard count / threshold display)

---

Date: 2026-03-04
Slice: M17A — Shields wallet field + HUD display + Body habit shard award
Summary:
- Added `shields: number` (default 0) to `IslandRunRuntimeState` and `IslandRunGameStateRecord`
- Added `shields` to `getDefaultRecord()`, `toRecord()` validation, Supabase column query, hydration mapping, and `writeIslandRunGameStateRecord` upsert in `islandRunGameStateStore.ts`
- Added `shields?: number` to patch type in `persistIslandRunRuntimeStatePatch` (`islandRunRuntimeState.ts`) and to `IslandRunRuntimeStateBackend.persistPatch` interface + merge logic (`islandRunRuntimeStateBackend.ts`)
- Created `supabase/migrations/0172_island_run_shields_column.sql`: adds `shields int not null default 0` to `island_run_runtime_state`
- Added `shields` state + hydration to `IslandRunBoardPrototype.tsx`; shields chip `🛡️ {shields}` rendered in HUD header (hidden when shields = 0) using `island-run-prototype__stat-chip--shields` CSS class
- Added `body_habit: 1` to `SHARD_EARN` in `shardMilestoneEngine.ts` as a new `ShardEarnSource`
- Added "Simulate Body habit (+1 shard)" dev-mode button in the `▼ Dev info` panel in `IslandRunBoardPrototype.tsx` (calls `awardShards('body_habit')`)
- Added `island-run-prototype__stat-chip--shields` CSS rule to `LevelWorlds.css` (blue tint, matching HUD chip style)
- Updated `docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md`: column table updated to migration 0172; added `island_shards`, `shard_tier_index`, `shard_claim_count`, `shields` rows
Files changed:
- src/features/gamification/level-worlds/services/shardMilestoneEngine.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx
- src/features/gamification/level-worlds/LevelWorlds.css
- supabase/migrations/0172_island_run_shields_column.sql (new)
- docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build
Next:
- M17B: Shield earn — Body habit awards 1 Shield; Bank tab convert stub

---

Date: 2026-03-04
Slice: M17B — Shield earn: Body habit completion awards 1 Shield; Bank tab convert stub
Summary: Wired real Body habit → Shield earn path in UnifiedTodayView.handleMarkDone (domain_key === 'body' check; anti-double-award guard; localStorage-persisted via persistIslandRunRuntimeStatePatch). Added 🛡️ +1 badge on pending Body habit rows (faded ✓ after completion). Added "Shield Wallet" section to ScoreTab Bank tab: shows shields balance, 1 Shield = 65 Coins rate, and "Convert all → Coins" one-tap button with success feedback. Removed dev "Simulate Body habit (+1 shard)" button from IslandRunBoardPrototype dev panel.
Files changed: src/features/habits/UnifiedTodayView.tsx (shield earn + badge), src/features/habits/HabitsModule.css (shield badge CSS), src/features/gamification/ScoreTab.tsx (Bank tab Shield Wallet section), src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (remove simulate button), docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M17B shipped, Next Slice → M17C), docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing: Tag a habit as Body (domain_key = 'body'); complete it in Today tab; verify 🛡️ chip in Island Run HUD increments; open Bank tab and verify shield balance matches; tap Convert; verify shields → 0 and coins increase by (shields × 65); complete same habit again on same day — verify no second shield award; npm run build passes with zero new TS errors.
Next: M17C — Shards HUD display + persistent wallet balance

---

Date: 2026-03-04
Slice: M17B (completion) — Daily Shield cap enforcement + handleLogValue shield award + inline feedback
Summary: Completed M17B acceptance criteria. Added client-side daily cap helpers (`getShieldsDailyEarned`, `incrementShieldsDailyEarned`) using localStorage key `shields_earned_today_{userId}_{YYYY-MM-DD}` (UTC) with a cap of 3/day. Updated `handleMarkDone` to enforce the cap before awarding a Shield (skips silently and shows "Daily Shield limit reached" message if cap hit). Added equivalent Body habit Shield award logic to `handleLogValue` (for quantity/duration habits). Added `shieldFeedback` state with inline banner: blue "🛡️ +1 Body Habit Shield earned!" on success, amber "Daily Shield limit reached (3/day)." when capped; auto-dismisses after 4 seconds. Updated `handleLogValue` dependency array to include `todayLogs` (needed for anti-double-award guard).
Files changed:
- src/features/habits/UnifiedTodayView.tsx (daily cap helpers, handleLogValue shield award, inline feedback state + banner)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors)
- Complete a Body habit in Today tab → blue "🛡️ +1 Body Habit Shield earned!" banner appears and auto-dismisses
- Complete 3 Body habits in same UTC day → 4th completion shows amber "Daily Shield limit reached (3/day)." banner; shields balance unchanged
- Open Bank tab → Shield balance reflects all awarded shields
- Convert shields → coins → shields go to 0, confirmation message shows
Next: M17C — Shards HUD display + wallet integration

---

Date: 2026-03-04
Slice: M17C — Shards HUD display + wallet integration
Summary: Added persistent `shards` wallet currency field to `IslandRunGameStateRecord`, `IslandRunRuntimeState`, `IslandRunRuntimeStateBackend` (patch interface + merge logic), following the exact same pattern as `shields` from M17A. Added Supabase migration `0173_island_run_shards_wallet_column.sql` (`shards int not null default 0`). Updated Supabase SELECT column list and DB row hydration mapping to include `shards`. Added `shards` state and `setShards` in `IslandRunBoardPrototype.tsx`; hydrated from runtime state in the post-hydration useEffect; added `✨ {shards}` HUD chip after the `🛡️` shields chip (hidden when shards = 0). Added `island-run-prototype__stat-chip--shards` purple-tinted pill CSS to `LevelWorlds.css`. Added `shardsBalance` state in `ScoreTab.tsx`; hydrated alongside shields when Bank tab is active; added read-only "✨ Shards Wallet" section in Bank tab (no spend path — accumulates for future slices). `islandShards` (per-island Collectible Progress Bar sub-currency) is untouched — fully separate system.
Files changed:
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts (shards field: interface, default, toRecord, SELECT, hydration, upsert)
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts (shards to interface + patch type)
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts (shards to patch interface + merge logic)
- supabase/migrations/0173_island_run_shards_wallet_column.sql (NEW — adds shards column)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (shards state + HUD chip)
- src/features/gamification/level-worlds/LevelWorlds.css (--shards chip CSS)
- src/features/gamification/ScoreTab.tsx (shardsBalance state + Bank tab Shards Wallet section)
- docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md (column table updated to migration 0173 + shards row)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M17C shipped; Next Slice → M17D)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors)
- Open Island Run; observe no shards chip when shards = 0
- Manually set shards > 0 in localStorage; reload; observe ✨ N chip in HUD after shields chip
- Open Score → Bank tab; observe ✨ Shards: N balance row
- islandShards / shard progress pill unaffected — no regression
Next: M17D — Wire Shards earn paths (stops, boss defeats, eggs, shop purchases, special events)

---

Date: 2026-03-04
Slice: M17D — Wire Shards wallet earn paths (stops, boss, egg open, minigame)
Summary: Added `awardWalletShards(amount)` helper in `IslandRunBoardPrototype.tsx` that updates `shards` React state and persists via `persistIslandRunRuntimeStatePatch`. Wired earn paths per the §4 rewards matrix: non-boss stop completion (+1 wallet shard), boss defeat / island clear (+3 wallet shards), egg open (+2 wallet shards), minigame reward passthrough (+1 wallet shard). Added "Simulate wallet shards (+5)" button to the ▼ Dev info panel. The `awardShards` / `islandShards` Collectible Progress Bar system is untouched — no regressions.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (awardWalletShards helper + earn path wiring + dev simulate button)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M17D shipped; Next Slice → M17E)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors)
- Open Island Run in dev mode (?debugBoard=1); click "Simulate wallet shards (+5)" → ✨ 5 HUD chip appears
- Complete a non-boss stop → ✨ count increments by 1
- Resolve and claim boss → ✨ count increments by 3
- Open a hatched egg → ✨ count increments by 2
- Complete a minigame → ✨ count increments by 1
- Reload the page → shards balance persists
- Open Score → Bank tab → verify ✨ Shards: N balance matches HUD
- islandShards / shard progress pill unaffected — no regression
Next: M17E

---

Date: 2026-03-04
Slice: M17E — Complete Bank tab currency display (Coins, Diamonds, Hearts rows)
Summary: Extended the Bank tab in `ScoreTab.tsx` to show all 5 persistent wallet currencies in the canonical HUD order (Coins → Diamonds → Hearts → Shields → Shards). Added `heartsBalance` state variable hydrated from `loadCurrencyBalance(session.user.id).hearts` (localStorage currency store). Merged the former separate Shield Wallet and Shards Wallet ledger sections into a single "All currencies" ledger section containing all five rows. Coins and Diamonds values are derived from the existing `goldBreakdown` (goldRemainder / diamonds). Shields Convert action and Shards balance row are unchanged from M17B/M17C. M17 milestone marked [✅].
Files changed:
- src/features/gamification/ScoreTab.tsx (heartsBalance state + hydration + Coins/Diamonds/Hearts card rows; unified currency ledger section)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M17E shipped; M17 → [✅]; Next Slice → M18A)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors)
- Open Score → Bank tab; verify 5 currency rows appear: 🪙 Coins, 💎 Diamonds, ❤️ Hearts, 🛡️ Shields, ✨ Shards
- Coins + Diamonds values match the gold wallet label shown above
- Hearts balance reflects localStorage currency store value
- Convert Shields → Coins action still works; Coins balance updates on reload
- No regressions to existing Shields convert or Shards balance display
Next: M18A — Tickets currency stub

---

Date: 2026-03-05
Slice: M1 — Hybrid 3D Board Visual Foundation (complete closure)
Summary: Closed M1 from 🟡 Partial → ✅ Done by implementing all remaining visual foundation items. (1) Created 3 procedural SVG island background scenes (`public/assets/islands/backgrounds/bg_001.svg`, `bg_002.svg`, `bg_003.svg`) — Scene 1: tropical green/teal with pond and lush vegetation; Scene 2: coastal blue/olive with beach palms and sea inlet; Scene 3: mystical purple/teal with twilight glowing flora and crystal spires. (2) Wired background `<img>` into `IslandRunBoardPrototype.tsx` as first child of `.island-run-board` div at z-index 1; CSS gradient classes retained as fallback. (3) Upgraded all 3 depth mask SVGs from simple 3-ellipse placeholders to detailed foreground-occlusion assets featuring boulders, fallen logs, fern fronds, palm trunks with roots, canopy overhangs, hanging vines, and scene-appropriate crystal/mineral accents. Raised depth mask z-index from 3 → 7 (above tiles at 6) for real occlusion. (4) Upgraded tile disc visuals: added inner highlight layer at 32%/22%, deeper base shadow, bottom inset shadow, and radial inner glow for polished-stone/crystal appearance; added per-zBand box-shadow variants (back tiles lighter shadow, front tiles deeper shadow); added animated pulse on stop tiles. (5) Replaced plain 🚀 emoji token with styled CSS spaceship: gradient body (radial highlight + deep blue base), two angled fins, animated thruster flame (`@keyframes island-token-thruster`), porthole window, and pulsing aura (`::before`). (6) Upgraded tile-type visual differentiation from border-color-only to distinct radial-gradient background + inner glow per type (currency=gold, chest=amber, hazard=red, egg_shard=teal-green, micro=purple, event=yellow).
Files changed:
- public/assets/islands/backgrounds/bg_001.svg (NEW)
- public/assets/islands/backgrounds/bg_002.svg (NEW)
- public/assets/islands/backgrounds/bg_003.svg (NEW)
- public/assets/islands/depth/depth_mask_001.svg (upgraded)
- public/assets/islands/depth/depth_mask_002.svg (upgraded)
- public/assets/islands/depth/depth_mask_003.svg (upgraded)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (background img + styled token)
- src/features/gamification/level-worlds/LevelWorlds.css (bg z-index, depth mask z-index 7, tile 3D, token spaceship, tile-type gradients)
- docs/MAIN_GAME_120_LEVEL_STATUS.md (M1 → ✅ Done; assets section updated)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (pre-existing vite TS config errors unrelated to changes)
- Island Run board shows SVG background art for each of the 3 scene buttons
- Depth mask SVGs overlay foreground props above tiles (rocks/foliage visible over tile layer)
- Tile discs show pseudo-3D highlight and shadow; stop tiles animate pulsing ring
- Token renders as CSS spaceship with body/fins/thruster/window/aura instead of emoji
- Tile types show distinct gradient fills (currency=gold, hazard=red, egg_shard=teal, etc.)
- Dev overlay, stop modals, dice roll, token movement: no regressions
Next: M11A — Minigame framework scaffold

---

Date: 2026-03-06
Slice: M2-COMPLETE — Finish dice movement + token animation production polish
Summary: Completed all M2 production polish items. The token hop loop (handleRoll/handleSpin) already used setTokenIndex inside an async for-loop with wait(240ms) delays, giving the CSS transition (220ms out-cubic) time to animate each hop. The squash/stretch landing keyframe (islandTokenLand), zBand drop-shadow variants, and bob animation during movement were all already in place from M1. The only missing production-visible piece was the roll result and landing feedback: (1) Added a 🎯 roll-result chip (island-run-prototype__stat-chip--roll) to the production HUD status row, conditionally rendered when rollValue !== null; it shows the dice value (1–3 for dice, 1–5 for spin) with aria-live for accessibility. (2) Added a production landing-feed paragraph (island-run-prototype__landing-feed) below the HUD status row, rendering landingText with aria-live and role="status" so users always see roll outcome + tile landing messages without opening the dev panel. (3) Added CSS styles for both new elements in LevelWorlds.css after the existing spin chip. Roll/hop loop works for all logged-in users with no dev flags required. M2 marked ✅.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (roll result chip added to production HUD; landing-feed paragraph added below HUD)
- src/features/gamification/level-worlds/LevelWorlds.css (stat-chip--roll style; landing-feed style)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M2 → [✅]; Next Slice → M3-COMPLETE)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors; pre-existing chunk size warnings unchanged)
- Open Island Run as logged-in user; complete Stop 1; tap Roll — token hops tile-to-tile with 220ms CSS transition per hop; 🎯 roll chip appears in HUD showing the roll value; landing feed shows "Rolling N..." then tile outcome
- Spin button (🌀 Spin) appears when spinTokens > 0; produces 1–5 tile movement
- Token landing triggers squash/stretch animation (islandTokenLand keyframe)
- zBand shadow changes as token moves through back/mid/front bands
- resolveTileLanding fires on final tile; stop modals open on stop-trigger tiles
- No regressions to M3–M17 features
Next: M3-COMPLETE — Stop modals production polish
Milestones closed: M2 ✅

---

Date: 2026-03-06
Slice: M3-COMPLETE — Finish stop modals production polish
Summary: Completed all M3 production polish items. (1) Orbit-stop POI buttons now correctly prevent opening locked stops — the click handler guards against `state === 'locked'` and the button is disabled when locked. (2) Completed orbit stops now show ✅ icon instead of their default stop icon, giving players clear visual feedback that a stop is done. (3) Added Escape key handler (useEffect on `activeStopId`) to close the active stop modal — pressing Escape dismisses any open stop modal. (4) Added a dedicated Dynamic stop content block in the stop modal, showing kind-specific instructional copy for each dynamic stop variant: `habit_action` (✅), `checkin_reflection` (🧭), `utility_support` (🧰), `event_challenge` (⚡), and `mini_game` (🎮 with launch button). All 5 stop modals (Hatchery, Minigame, Utility, Dynamic, Boss) open on tile landing and via orbit-stop POI tap. Stop state (locked/active/completed) is visually reflected on orbit buttons. Stop 1 (Hatchery) continues to gate dice rolling. Boss locked until non-boss stops complete. All modals closeable via Close button and Escape key.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (Escape key handler; orbit button locked guard + disabled; ✅ completed icon; Dynamic stop content block)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M3 → [✅]; Next Slice → M4-COMPLETE)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero new TypeScript errors)
- Open Island Run as logged-in user; complete Stop 1; roll to each stop-trigger tile and verify modal opens; tap orbit-stop POI buttons — locked boss shows disabled button; completed stops show ✅ icon; Escape key closes open modal
Next: M4-COMPLETE — Island timer + expiry + travel overlay production polish
Milestones closed: M3 ✅

---

Date: 2026-03-06
Slice: M4-COMPLETE — Island timer + expiry + travel overlay production polish
Summary: Completed all M4 production polish items. (1) Island timer already counted down in real-time via a 1-second setInterval (shipped in M4A); confirmed 48h/72h durations for normal/special islands and 45s dev mode with ?devTimer=1 are correct. (2) Travel overlay already triggered on timer expiry; confirmed expiry is checked on app boot (hydration effect), on entering level screen (mount), and on every tick. (3) Catch-up Rule A (advance exactly one island on resume if expired) was already implemented in the hydration effect. (4) Added island 120 → island 1 wrap with cycle_index increment: performIslandTravel now computes resolvedIsland = rawNext > 120 ? ((rawNext-1) % 120) + 1 : rawNext and increments cycleIndex on each full-lap wrap. (5) Added cycleIndex to IslandRunGameStateRecord, IslandRunRuntimeState, and all persistence layers (localStorage + Supabase upsert with cycle_index column, gracefully falls back to 0 if column absent). (6) Travel overlay destination display fixed: shows correct island 1 when wrapping from island 120. (7) State reset on travel (token index, stops, per-island currency) was already correct. Egg dormant carryover on travel was already correct.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (cycleIndex state; performIslandTravel wrap logic; hydration restore; overlay destination fix; deps array update)
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts (cycleIndex field in record interface + default + toRecord + select + upsert)
- src/features/gamification/level-worlds/services/islandRunRuntimeState.ts (cycleIndex in state interface + patch type)
- src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts (cycleIndex in backend interface + persistPatch implementation)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M4 → [✅]; Next Slice → M5-COMPLETE)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- npm run build passes (zero TypeScript errors, zero new errors)
- Open Island Run as logged-in user; verify timer counts down; use ?devTimer=1 to test 45s expiry; confirm travel overlay shows and island number increments; verify state resets on new island; verify island 120 → 1 wrap increments cycleIndex
Next: M5-COMPLETE — Hatchery + egg stages + dormant carryover production polish
Milestones closed: M4 ✅

---

Date: 2026-03-06
Slice: M5-COMPLETE — Hatchery + egg stages + dormant carryover production polish
Summary: Completed all M5 production polish items. (1) Created new `eggService.ts` service with: `rollEggTierWeighted()` (common 70% / rare 25% / mythic 5% weighted random), `getRandomHatchDelayMs(devMode)` (random 24–72 h production / 15–30 s dev), `getEggStageName(stage)` (Smooth/Mostly Gold/Cracked/Ready to Open), `getEggStageEmoji(stage)`, and `rollEggRewards(eggTier, seed) -> RewardBundle` with full tier-based reward schedule (common: 1 heart + 5–19 coins + 25% spin; rare: 2 hearts + 20–49 coins + guaranteed spin; mythic: 3 hearts + 75–124 coins + 15% diamond + 2 spins + 30% cosmetic). (2) Updated `handleSetEgg` to no-arg: tier assigned randomly via `rollEggTierWeighted()`, hatch delay via `getRandomHatchDelayMs(IS_DEV_TIMER)` — no countdown shown to player, no tier picker in UI. (3) Updated the island hatchery ready state to collect the hatched animal first, then apply the reward bundle when that animal is sold in the Shop / Animal Market. (4) Updated the per-island ledger to support the newer animal lifecycle states (`animal_ready`, `animal_sold`) in addition to egg states. (5) Updated `PerIslandEggEntry` in `islandRunGameStateStore.ts`: added `location?: 'island' | 'home' | 'dormant'`, `openedAt?: number`, and later `animalCollectedAtMs?: number`. (6) Rewrote `performIslandTravel` egg handling: saves current island egg to perIslandEggs with `location='dormant'` (if ready) or `location='island'` (if incubating), clears `activeEgg`, and immediately restores the new island's egg from perIslandEggs — enabling multiple simultaneous dormant eggs across islands. (7) Rewrote hatchery stop modal with all 5 canonical states: (a) animal already collected and waiting for sale; (b) egg already completed on this island — permanent non-renewable message; (c) egg ready — collect animal CTA; (d) egg in progress — stage emoji + stage name + encouraging copy, NO countdown shown; (e) no egg set — single "🥚 Set Egg" button with Island 1 forced onboarding message. (8) Updated home panel to keep its separate direct-open reward flow with stage name/emoji display. (9) Added CSS classes for hatchery card state blocks (stage-emoji, headline, copy, state variants) to `LevelWorlds.css`.
Files changed:
- src/features/gamification/level-worlds/services/eggService.ts (NEW — rollEggRewards, rollEggTierWeighted, getRandomHatchDelayMs, getEggStageName, getEggStageEmoji)
- src/features/gamification/level-worlds/services/islandRunGameStateStore.ts (PerIslandEggEntry: location + openedAt fields; PerIslandEggLocation type)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (import eggService; remove fixed EGG_HATCH_MS_* / EGG_COST_* constants; handleSetEgg no-arg random; island hatchery collect-animal → market-sell flow; perIslandEggs animal statuses persist; performIslandTravel per-island save/restore; hatchery stop modal 5 states; home panel cleaned up)
- src/features/gamification/level-worlds/LevelWorlds.css (hatchery card state CSS: __state, __stage-emoji, __headline, __copy, state variants)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M5 → [✅]; Next Slice → M6-COMPLETE)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- tsc --noEmit passes (zero new TypeScript errors)
- Open Island Run on Island 1 via hatchery stop → "Set Egg" forced with onboarding copy; tier revealed after set
- Egg stage advances over time: Smooth → Mostly Gold → Cracked → Ready to Open; no countdown shown
- Travel to next island without collecting: old island egg saved to perIslandEggs with location='dormant'; new island starts with null activeEgg
- Return to original island: dormant egg restored, "Dormant egg ready" prompt shown
- Open egg → rollEggRewards bundle applied (hearts + coins + spins + optional cosmetic); perIslandEggs status='collected'
- Sell egg in shop → EGG_SELL_COINS reward; perIslandEggs status='sold'
- After collect/sell on any island: that island shows "Egg already collected — no new egg on this island" permanently
- Home Island hatchery: repeatable slot; no islandEggSlotUsed restriction
- Multiple dormant eggs can exist simultaneously across different islands in perIslandEggs
Next: M6-COMPLETE — Encounter tile production polish
Milestones closed: M5 ✅

---

Date: 2026-03-07
Slice: M7-COMPLETE — Boss stop full production polish
Summary: Completed all M7 production polish items for the boss stop (Stop 5). (1) Created new `bossService.ts` with deterministic boss type resolution (~75% Milestone Boss, ~25% Fight Boss, seeded by island number via `islandNumber % 4 === 3`), `getBossDifficulty(islandNumber)` scaling Easy→Very Hard over islands 1–120, `getBossTrialDurationSec(islandNumber)` countdown 60→30 seconds, `getBossScoreTarget(islandNumber)` target 5→15 taps, `getBossChallengeText()`, `getBossTypeColor()`, and `getBossTrialConfig()` aggregate. (2) Added boss trial flow state machine in `IslandRunBoardPrototype.tsx`: `bossTrialPhase` ('idle' | 'in_progress' | 'success' | 'failed'), `bossTrialTimeLeft`, `bossTrialScore`, `bossAttemptCount`. (3) Added useEffect timer countdown: decrements every 1s during 'in_progress' phase; on timeout evaluates score >= target → success (calls handleResolveBossTrial + sets phase 'success') or failure (deducts 1 heart, increments attempt count, sets phase 'failed', fires telemetry). (4) Added `handleStartBossTrial`, `handleBossTrialTap`, `handleBossTrialRetry` handlers with telemetry events for start/retry. (5) Reset boss trial phase on island travel and when modal closes during 'in_progress'. (6) Replaced basic boss modal content with production-ready 4-phase UI: idle (type badge, difficulty badge, challenge description, reward preview with +3 shards, lives=hearts note, Begin Boss Trial CTA), in_progress (live countdown timer with urgent pulse at ≤10s, score/target row, animated progress bar, tap button), success (reward summary, "Claim Island Clear" hint), failed (failure copy, hearts remaining, Retry button or no-hearts message). (7) Added IIFE render pattern for bossConfig variable scoping in JSX. (8) Enhanced island clear celebration: boss-themed card styling, confetti emoji animation, reward items row (hearts/coins/shards chips), Shop Tier 2 unlock message. (9) Fixed Shop Tier 2 unlock gate from `bossTrialResolved` to `completedStops.includes('boss')` for correct persistence across page reloads. (10) Added comprehensive boss trial CSS to `LevelWorlds.css`: badge row, type/difficulty badges, all 4 phase layouts, progress bar, tap button with active state, timer pulse animation, success/failed phase styling, enhanced celebration card. (11) Removed unused `BOSS_CHALLENGES` constant. (12) Updated `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`: M7 → [✅], Next Slice → M8-COMPLETE.
Files changed:
- src/features/gamification/level-worlds/services/bossService.ts (NEW — resolveBossType, getBossDifficulty, getBossTrialDurationSec, getBossScoreTarget, getBossTrialConfig, getBossChallengeText, getBossTypeColor)
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (import bossService; remove BOSS_CHALLENGES; add bossTrialPhase/TimeLeft/Score/AttemptCount state; add timer effect; add handleStartBossTrial/handleBossTrialTap/handleBossTrialRetry; replace boss modal with 4-phase UI; fix Shop Tier 2 unlock; enhance island clear celebration)
- src/features/gamification/level-worlds/LevelWorlds.css (boss trial CSS: badges, phases, timer, progress bar, tap button, celebration enhancements)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M7 → [✅]; Next Slice → M8-COMPLETE)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- tsc --noEmit passes (zero new TypeScript errors)
- npm run build passes
- Open Island Run; complete stops 1–4; open boss stop (orbit button or tile 16 landing)
- Boss stop modal shows type badge (Milestone/Fight), difficulty level, challenge description, reward preview (+hearts, +coins, +3 shards)
- Lives=Hearts note shows current heart count
- Click Begin Boss Trial: timer counts down, tap button increments score, progress bar animates
- When timer hits 0 with score >= target: phase transitions to 'success', reward granted, Claim Island Clear button enabled
- When timer hits 0 with score < target: phase transitions to 'failed', 1 heart deducted, Retry button shown (if hearts > 0)
- Claim Island Clear → island clear celebration shows with boss card styling, reward chips, "Shop Tier 2 unlocked"
- Shop Tier 2 (Heart Boost Bundle) correctly unlocks only after 'boss' in completedStops
- Travel to new island: all boss trial state reset (phase=idle, score=0, attemptCount=0)
- Page reload with already-resolved boss: modal opens in 'success' phase (synced from bossTrialResolved)
- Escape key closes boss modal (existing behavior, verified)
- Fight Boss islands (islandNumber % 4 === 3): badge shows '⚔️ Fight Boss'; others show '🏆 Milestone Boss'
Next: M8-COMPLETE — Market stop full production polish
Milestones closed: M7 ✅

---

Date: 2026-03-07
Slice: M9-COMPLETE — Home Island + Hatchery Slots production polish
Summary: Completed all M9 production polish items. (1) Added separate `homeEgg` state (`ActiveEgg | null`) in `IslandRunBoardPrototype.tsx`, persisted to localStorage under `island_run_home_egg_${userId}` independently of island travel — home egg survives island changes. (2) Added `showHomePanel` boolean state and `homeRewardReveal` state for reward reveal animation. (3) Added `homeEggStage` useMemo (same quartile formula as island egg stage, driven by `homeEgg` + `nowMs`). (4) Added effect to play `egg_ready` sound when home egg transitions to stage 4. (5) Added Escape key effect that closes the home panel and clears reward reveal. (6) Added localStorage persist effect for home egg. (7) Added `handleSetHomeEgg`: rolls `rollEggTierWeighted()` + `getRandomHatchDelayMs(IS_DEV_TIMER)`, fires `egg_set` sound + haptic, records `home_egg_set` telemetry + debug marker. (8) Added `handleOpenHomeEgg`: consumes home egg, applies `rollEggRewards` bundle (hearts/coins/diamonds/spinTokens), awards +2 wallet shards via `awardWalletShards(2)`, fires `egg_open` sound + haptic, records `home_egg_open` telemetry + debug marker, shows reward reveal animation (auto-dismisses after 3 s). (9) Added persistent 🏠 HUD button in `island-run-prototype__always-controls` with egg-state indicator (stage emoji inline; gold glow pulse when ready). (10) Replaced old inline `.island-run-prototype__home-panel` scaffolding with a proper overlay/modal using the `island-stop-modal-backdrop` + `island-stop-modal` pattern. Modal has: backdrop-click dismiss, Escape key dismiss, eyebrow label, 3 egg slot states (empty/incubating/ready), reward reveal animation, Close button. (11) Added CSS in `LevelWorlds.css`: `.island-run-prototype__home-btn` (blue pill, mirrors shop-btn pattern), `.island-run-prototype__home-btn--ready` (gold glow pulse animation `home-btn-ready-pulse`), `.island-home-panel-backdrop` (z-index 1200), `.island-home-panel__slot-label`, `.island-home-panel__reward-reveal` (pop-in animation `reward-reveal-pop`), `.island-home-panel__reward-emoji` (bounce animation `reward-emoji-bounce`), `.island-home-panel__reward-tier`, `.island-home-panel__reward-items`. (12) Updated `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`: M9 → [✅]; Next Slice → M18 integration/QA pass.
Files changed:
- src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx (homeEgg state + localStorage; showHomePanel; homeRewardReveal; homeEggStage useMemo; home egg ready sound effect; Escape key effect; localStorage persist effect; handleSetHomeEgg; handleOpenHomeEgg; 🏠 HUD button; remove inline home-panel; add Home Island overlay modal)
- src/features/gamification/level-worlds/LevelWorlds.css (Home Island HUD button styles + ready state animation; home panel overlay styles; reward reveal animation)
- docs/00_MAIN_GAME_120_ISLANDS_INDEX.md (M9 → [✅]; Next Slice → M18)
- docs/07_MAIN_GAME_PROGRESS.md (this entry)
Testing:
- tsc --noEmit passes (zero new TypeScript errors)
- npm run build passes
- 🏠 HUD button appears in always-controls row alongside Shop and audio toggle
- Tap 🏠 → Home Island panel opens as overlay modal
- Empty slot: shows "Set Home Egg" primary CTA
- Tap "Set Home Egg": egg appears with tier + stage 1 display; egg_set sound fires; home_egg_set telemetry fires; homeEgg persists to localStorage
- Egg stage advances over time (no countdown shown)
- When stage 4: panel shows "Ready to Open!" state; 🏠 button gets gold pulse animation
- Tap "Open Egg": reward reveal animation shown; rewards applied (+hearts/coins/+2 shards); egg_open sound fires; home_egg_open telemetry fires; slot resets to empty
- Page reload: home egg state restored from localStorage (stage preserved)
- Travel to different island: home egg state unaffected (independent of island number)
- Escape key closes home panel
- Clicking backdrop closes home panel
- Mobile: min-height 44px touch targets; modal fits within 90dvh
Milestones closed: M9 ✅
