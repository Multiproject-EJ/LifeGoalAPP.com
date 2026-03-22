# Main Game 120-Level Status Report

> **Purpose:** Concise scan of what is built, what is in progress, and what is missing for the
> 120-level main game — covering both the legacy Level Worlds campaign surface and the current
> Island Run prototype that has replaced it as the production path.
>
> **Last updated:** 2026-03-02  
> **Canonical product source:** [`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md)  
> **Progress log (append-only):** [`docs/07_MAIN_GAME_PROGRESS.md`](./07_MAIN_GAME_PROGRESS.md)

---

## 1. Entry Surface

| Query param | Renders |
|---|---|
| _(none / any value except `0`)_ | `IslandRunBoardPrototype` — **production path** |
| `?islandRunDev=0` | Legacy `WorldBoard` campaign — unreachable in production |

**Source:** [`src/features/gamification/level-worlds/LevelWorldsHub.tsx`](../src/features/gamification/level-worlds/LevelWorldsHub.tsx)

---

## 2. Level Worlds Campaign Mode (Legacy `WorldBoard`)

> This surface is **deprecated as the primary loop** (see canonical doc). It is kept in the repo
> for reference and is only reachable via `?islandRunDev=0`.

### 2a. What Is Built

- [x] Procedural board generator — rotates across 6 themes (forest / ocean / cosmic / desert / mountain / village), scales node count by level, selects node types (habit / mini-game / goal / personality / journal / boss)  
  → [`src/features/gamification/level-worlds/services/levelWorldsGenerator.ts`](../src/features/gamification/level-worlds/services/levelWorldsGenerator.ts)
- [x] Board state persistence via `localStorage` with serialised `LevelWorldsState`  
  → [`src/features/gamification/level-worlds/services/levelWorldsState.ts`](../src/features/gamification/level-worlds/services/levelWorldsState.ts)
- [x] `useLevelWorlds` hook — loads state, exposes `completeNode` / `completeBoard`, auto-generates the next board after completion  
  → [`src/features/gamification/level-worlds/hooks/useLevelWorlds.ts`](../src/features/gamification/level-worlds/hooks/useLevelWorlds.ts)
- [x] `useWorldProgress` hook — derives current level + completed-board counts from state  
  → [`src/features/gamification/level-worlds/hooks/useWorldProgress.ts`](../src/features/gamification/level-worlds/hooks/useWorldProgress.ts)
- [x] `WorldBoard` / `WorldNode` / `WorldPath` UI components (winding path, node icons, status colours)  
  → [`src/features/gamification/level-worlds/components/WorldBoard.tsx`](../src/features/gamification/level-worlds/components/WorldBoard.tsx)
- [x] `NodeDetailSheet` — side sheet with objective details and action buttons  
  → [`src/features/gamification/level-worlds/components/NodeDetailSheet.tsx`](../src/features/gamification/level-worlds/components/NodeDetailSheet.tsx)
- [x] `BoardCompleteOverlay` — celebration overlay on board completion  
  → [`src/features/gamification/level-worlds/components/BoardCompleteOverlay.tsx`](../src/features/gamification/level-worlds/components/BoardCompleteOverlay.tsx)
- [x] Reward service — node rewards + board completion rewards, `awardNodeReward` / `awardBoardCompletionReward` wired  
  → [`src/features/gamification/level-worlds/services/levelWorldsRewards.ts`](../src/features/gamification/level-worlds/services/levelWorldsRewards.ts)
- [x] Mini-game launching from node objectives (`TaskTower`, `ShooterBlitz`, `VisionQuest`, `WheelOfWins`)  
  → [`src/features/gamification/level-worlds/LevelWorldsHub.tsx`](../src/features/gamification/level-worlds/LevelWorldsHub.tsx)

### 2b. What Is Missing / Not Wired

- [ ] **No backend persistence** — all board + node progress lives only in `localStorage`; there is no Supabase table for `world_boards` progress
- [ ] **Node objective verification is passive** — habit / goal / journal / personality nodes show an instruction message and require the user to act elsewhere; there is no real-time cross-feature completion check
- [ ] **Level cap / 120-level progression gating** — generator can produce unlimited boards; there is no concept of "level 120 = game complete"
- [ ] **Balancing / difficulty curve beyond node count** — no scaling of required completions, reward multipliers, or unlock rules across 120 levels
- [ ] **Analytics / telemetry** — no events fired for node completion, board completion, or mini-game launches from this surface
- [ ] **Tests** — no automated tests for generator, state service, or hooks

---

## 3. Island Run (Production Prototype)

> Island Run is the **current production surface** for the main game. It is a time-limited loop
> (**48 h for normal islands, 72 h for special islands**) with a fixed 17-tile board that reuses
> board geometry across all 120 islands (art only changes).  See `docs/07_MAIN_GAME_PROGRESS.md`
> for canonical timer and special-island rules.
>
> Spec overview: [`docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md`](./03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md)  
> Component: [`src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`](../src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx)

### 3a. What Is Built ✅

#### Board + Movement
- [x] **M1 hybrid 3D board renderer** — core ring/anchor layout, canvas path glow, dev overlay, background art (3 procedural SVG scenes), production-quality foreground depth-mask SVGs (rocks/foliage/trunks), pseudo-3D tile disc lighting, styled CSS spaceship token, tile-type visual differentiation  
  → [`src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`](../src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx), [`src/features/gamification/level-worlds/LevelWorlds.css`](../src/features/gamification/level-worlds/LevelWorlds.css), [`public/assets/islands/`](../public/assets/islands/)
- [x] Fixed 17-tile anchor layout with `zBand` (back / mid / front), `tangentDeg`, and `scale` per anchor  
  → [`src/features/gamification/level-worlds/services/islandBoardLayout.ts`](../src/features/gamification/level-worlds/services/islandBoardLayout.ts)
- [x] 5 outer stop POIs (Steps 1–5) accessible from the board; the 17-tile ring is for movement and resource earning. **Stops are not tiles on the ring** — they are POIs around the island unlocked by completing prior steps. Boss is always Step 5; Step 1 gates dice. Current implementation uses ring tile indices (0, 4, 8, 12, 16) as stop trigger points — to be refactored to the canonical outer-POI model; see `docs/07_MAIN_GAME_PROGRESS.md`.
- [x] Token movement: paired 2-dice roll (each die 1–3, total 2–6 tiles, costs 2 dice from pool) and spin move (1–5 tiles, costs 1 spin token), modulo-17 wraparound
- [x] Per-island tile-type map (`generateTileMap`) — deterministic seeded assignment of `currency / chest / event / hazard / egg_shard / micro / encounter / stop` to non-stop tiles  
  → [`src/features/gamification/level-worlds/services/islandBoardTileMap.ts`](../src/features/gamification/level-worlds/services/islandBoardTileMap.ts)
- [x] Island type schedule — `normal` (default) and `special`; the canonical 20 special islands are: **5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120** (see `docs/07_MAIN_GAME_PROGRESS.md`). *(The legacy every-5th = seasonal / every-10th = rare heuristic is deprecated and must not be used.)*
- [x] Encounter tile logic — spawns at tile 6 when island is special OR `dayIndex >= 2` (time-based unlock)

#### Stop Plan + Stops
- [x] Dynamic stop plan generator (`generateIslandStopPlan`) — 3 dynamic stop slots drawn from seeded pool; ensures at least one real-life behaviour stop per island  
  → [`src/features/gamification/level-worlds/services/islandRunStops.ts`](../src/features/gamification/level-worlds/services/islandRunStops.ts)
- [x] Hatchery stop — set egg (common free / rare 50c / mythic 150c), stage progress display, dormant carryover on island travel
- [x] Market stop prototype — dice bundle (30c → +6 dice) and heart bundle (40c) purchase modals; owned-state no-repurchase guard; repurchase-block telemetry
- [x] Boss stop trial — 10-prompt challenge pool; scaled reward by island tier (`hearts + coins + spinTokens`); resolve + reward feedback
- [x] Encounter tile — stub award (+coins) wired, telemetry fired on trigger and resolve
- [x] Utility stop — production recovery actions wired (heart refill, dice bonus, timer extension) with spend telemetry, sound, and haptics
- [x] Minigame stop — framework launcher wired through `resolveMinigameForStop`; completing a run clears the stop and passes rewards back into Island Run

#### Egg / Hatchery System
- [x] Three egg tiers: common (0c, 24h hatch), rare (50c, 36h), mythic (150c, 48h); dev-timer mode (15/20/30s)
- [x] Egg stage progression indicator in hatchery stop
- [x] Dormant egg carryover: egg converts to dormant on island travel if not yet collected
- [x] Home island hatchery summary panel scaffold (M9A–M9G)  
  → referenced in `IslandRunBoardPrototype.tsx`

#### Runtime State / Persistence
- [x] `IslandRunRuntimeState` interface — `firstRunClaimed`, `dailyHeartsClaimedDayKey`, `currentIslandNumber`, `bossTrialResolvedIslandNumber`, `activeEgg*`  
  → [`src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`](../src/features/gamification/level-worlds/services/islandRunRuntimeState.ts)
- [x] Dual-layer persistence: `localStorage` (fast read on boot) + Supabase `island_run_runtime_state` table upsert  
  → [`src/features/gamification/level-worlds/services/islandRunGameStateStore.ts`](../src/features/gamification/level-worlds/services/islandRunGameStateStore.ts)
- [x] Runtime hydration with source tracking (`table` / `fallback_no_row` / `fallback_query_error` / `fallback_demo_or_no_client`)  
  → [`src/features/gamification/level-worlds/services/islandRunRuntimeState.ts`](../src/features/gamification/level-worlds/services/islandRunRuntimeState.ts)
- [x] `persistIslandRunRuntimeStatePatch` — partial upsert for targeted field updates

#### Economy
- [x] Heart → dice pool conversion (`convertHeartToDicePool`, `getDicePerHeartForIsland`) scaling by island number  
  → [`src/features/gamification/level-worlds/services/islandRunEconomy.ts`](../src/features/gamification/level-worlds/services/islandRunEconomy.ts)
- [x] Daily heart reward plan (`planDailyHeartReward`)  
  → [`src/features/gamification/level-worlds/services/islandRunDailyRewards.ts`](../src/features/gamification/level-worlds/services/islandRunDailyRewards.ts)
- [x] First-run heart claim and daily claim deduplication (`dailyHeartsClaimedDayKey`)

#### Island Timer + Travel
- [x] Island expiry timer: **48 h** for normal islands, **72 h** for special islands (dev: 45 s with `?devTimer=1`); on resume the player advances at most **one** island regardless of elapsed time (Catch-up Rule A)
- [x] Travel overlay on island expiry: advances `currentIslandNumber`, resets per-run state (hearts, currency, token index, stops), handles dormant egg
- [x] Three expiry check points: on mount, on re-enter, on 30-second tick

#### Audio / Haptics
- [x] `islandRunAudio.ts` — typed `IslandRunSoundEvent` (17 events) and `IslandRunHapticEvent` (14 events) with full haptic pattern map  
  → [`src/features/gamification/level-worlds/services/islandRunAudio.ts`](../src/features/gamification/level-worlds/services/islandRunAudio.ts)
- [x] `playIslandRunSound` + `triggerIslandRunHaptic` wired at: roll, token move, stop land, island travel, egg set/open, market purchase, boss trial, encounter trigger/resolve (M10A–M10E)
- [x] HUD audio toggle (`islandRunAudioEnabled` localStorage pref)
- [x] **Sound playback is a placeholder** — asset paths mapped in `SOUND_ASSET_MAP` but no `.mp3` files exist yet

#### Telemetry + Debug
- [x] `islandRunRuntimeTelemetry.ts` — `ISLAND_RUN_RUNTIME_HYDRATION_STAGE` / `ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE` markers
- [x] `islandRunEntryDebug.ts` — `logIslandRunEntryDebug` emits to console / Supabase debug table in dev mode
- [x] M7B–M7N telemetry / reward-contract / filter / export helpers for boss stop
- [x] M8B–M8J market telemetry / QA checklist / deterministic QA helpers
- [x] M9G home hatchery telemetry markers

#### Visual Polish (M12)
- [x] M12A–M12Z visual/interaction polish pass completed; M12 MVP gate signed off  
  → milestone log in [`docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`](./00_MAIN_GAME_120_ISLANDS_INDEX.md)

---

### 3b. What Is In Progress 🟡

- [~] **M2 token animation** — basic hop loop shipped; 60 fps easing, squash/stretch micro-animation, and dynamic shadow by `zBand` not yet production-grade
- [x] **M3 stop modals** — hatchery, minigame, utility, dynamic, and boss flows all open from the board; utility has production actions and minigame launches through the registry-backed stop flow
- [~] **M4 travel overlay** — dev simulation working; production-grade "next island" art swap and visual continuity not yet polished
- [~] **M5 hatchery egg stages** — scaffold shipped; stage progress indicator present; full stage-unlock animation and dormant visual not yet production-grade
- [~] **M6 encounter tile** — stub award wired; encounter content (mini-challenge, real reward table, rarity weighting) not yet implemented
- [~] **M7 boss stop** — resolve + reward + telemetry + persistence markers shipped (M7A–M7N); real-life habit/action verification behind boss not yet wired
- [~] **M8 market stop** — purchase modals + telemetry + QA helpers shipped (M8A–M8J); market item catalogue is hard-coded to two bundles; dynamic item pool and island-specific market content not yet built
- [~] **M9 home island hatchery** — summary panel scaffold and slot/action rows shipped (M9A–M9G); home island as a distinct persistent surface (separate from run islands) not yet fully built

---

### 3c. What Is Missing ❌

#### Game Completeness
- [ ] **Data-driven tile map per island** — `generateTileMap` uses seeded random but all 120 islands share the same pool; no per-island theme content, named events, or curated tile sequences
- [ ] **Real stop objectives** — stop modals show static copy; no wiring to live habit completion, real check-in data, or goal progress for habit/action/check-in stops
- [ ] **Progression gating** — islands 2–120 are accessible by incrementing `currentIslandNumber`; there is no gate that requires clearing all stops (incl. boss) before advancing
- [ ] **Minigame framework (M11)** — no `IslandRunMinigame` interface, entry/exit contract, or reward-passthrough shape; `ShooterBlitz` is launched ad-hoc rather than via a framework  
  → Next slice: **M11A**
- [ ] **120-level narrative / world differentiation** — no per-island copy, art, named events, or difficulty ramp across the full 120-island arc
- [ ] **Boss real-life objective verification** — boss challenge prompts are flavour text only; no backend check that the player actually completed a habit/goal before claiming the boss reward

#### Assets
- [x] **Island background art** — 3 procedural SVG scenes in `/public/assets/islands/backgrounds/bg_00{1,2,3}.svg`; wired into board renderer as `<img>` at z-index 1; CSS gradients retained as fallback
- [x] **Depth mask art** — production-quality foreground SVGs in `/public/assets/islands/depth/depth_mask_00{1,2,3}.svg`; features rocks, foliage, trunks, crystal spires per scene; z-index 7 (above tiles) for real occlusion
- [x] **Token art** — styled CSS spaceship token (body, fins, thruster flame, porthole window, pulsing aura) replaces plain 🚀 emoji
- [x] **Tile disc visual** — pseudo-3D lighting (inner highlight, base shadow, radial glow); per-type gradient background for currency/chest/hazard/egg_shard/micro/event tiles
- [ ] **Audio files** — 17 sound events mapped to `/assets/audio/sfx/sfx_*.mp3` paths; none of those files exist; all `playIslandRunSound` calls are currently no-ops
- [ ] **Stop icon art** — custom stop icon art not yet present

#### Backend / Data
- [~] **Full per-run state persistence** — stop flags, token index, hearts/coins/spin tokens, and dice pool now persist in runtime-state storage; broader integration verification and live-schema confirmation still remain
- [ ] **`island_run_runtime_state` migration** — table schema needs to be confirmed applied (migration file lives in `sql/` or `supabase/`); no automated migration CI check
- [ ] **Backend tables for stop objectives** — no Supabase tables for stop-level completion records, encounter outcomes, or market purchase history beyond the prototype markers
- [ ] **RLS policies** — `island_run_runtime_state` RLS is specified in docs but needs explicit verification against the live schema
- [ ] **Analytics / telemetry backend** — debug markers log to console or a local debug table; no production analytics pipeline (event schema, BigQuery/Amplitude/PostHog routing)

#### Quality / Testing
- [~] **Automated tests** — service-level coverage now exists for tile-map generation, stop-plan generation, economy helpers, progression rules, creature services, and runtime-state hydration/persistence via `npm run test:island-run`; component/UI automation is still missing
- [ ] **QA checklist automation** — acceptance tests in `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` and `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md` are manual-only
- [ ] **Cross-device / accessibility testing** — no recorded test results for 360 × 780 viewport, safe-area notches, or keyboard navigation
- [ ] **Balancing** — no economy simulation; heart drain rate, coin earn rate, encounter frequency, and egg hatch costs have not been validated against a 72-hour play session

#### Progression / Meta
- [ ] **Unlock gating across 120 islands** — no "world map" view showing which islands are completed vs locked; all islands are procedurally accessible
- [ ] **Special islands** — canonical list of 20 special islands (5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120) has no content differentiation yet; existing implementation uses the deprecated every-5th/every-10th heuristic and must be updated
- [ ] **Cross-island carry-over rewards** — dormant egg carryover is wired, but coin/item carry-over rules, streak bonuses, and island completion medals are not implemented
- [ ] **Notifications** — no push notification for egg-ready, island expiry warning, or daily heart availability tied to Island Run

---

## 4. Next Slices

> Ordered by priority to reach a shippable 120-level campaign. Slice IDs follow existing `M*` naming.

| # | Slice ID | Goal | Key files |
|---|---|---|---|
| 1 | **M6B** | Encounter tile — deepen the mini-challenge content/reward table beyond the current easy challenge pool and rarity rules | `IslandRunBoardPrototype.tsx`, `encounterService.ts`, `islandBoardTileMap.ts` |
| 2 | **M13A** | Full per-run state persistence — storage/runtime wiring has landed; finish integration verification, remote schema validation, and any remaining edge-case fixes | `IslandRunBoardPrototype.tsx`, `islandRunRuntimeState.ts`, `islandRunGameStateStore.ts`, migrations |
| 3 | **M14A** | Island background art pipeline — extend beyond the current placeholder/procedural set with final asset coverage and depth-mask pairing | `public/assets/islands/`, `IslandRunBoardPrototype.tsx` |
| 4 | **M15A** | Audio files — add real SFX assets for the mapped sound events so `playIslandRunSound` is no longer placeholder-only | `public/assets/audio/sfx/`, `islandRunAudio.ts` |
| 5 | **M16A** | Real stop objectives for habit / check-in stops — query live habit completion data; unlock stop clear only when criteria met | `islandRunStops.ts`, habits feature API |
| 6 | **M17A** | 120-island progression gate — add explicit island-completion records / locked-map progression beyond the current expiry gating | `IslandRunBoardPrototype.tsx`, `islandRunGameStateStore.ts` |
| 7 | **M18A** | Test suite — add component/UI automation and broader regression coverage on top of the current service-level test runner | new `*.test.ts` files, board test harness |

---

## 5. File Reference Index

| Path | What it does |
|---|---|
| `src/features/gamification/level-worlds/LevelWorldsHub.tsx` | Entry point — switches between `IslandRunBoardPrototype` (production) and legacy `WorldBoard` |
| `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx` | Main Island Run game loop component |
| `src/features/gamification/level-worlds/components/WorldBoard.tsx` | Legacy campaign board (deprecated primary loop) |
| `src/features/gamification/level-worlds/services/islandBoardLayout.ts` | Fixed 17-anchor coordinates, stop tile assignments, `zBand` / `tangentDeg` / `scale` |
| `src/features/gamification/level-worlds/services/islandBoardTileMap.ts` | `generateTileMap` — 17-tile type assignment per island |
| `src/features/gamification/level-worlds/services/islandRunStops.ts` | `generateIslandStopPlan` — dynamic stop pool with behaviour-stop constraint |
| `src/features/gamification/level-worlds/services/islandRunEconomy.ts` | Heart → dice conversion, `getDicePerHeartForIsland` |
| `src/features/gamification/level-worlds/services/islandRunDailyRewards.ts` | `planDailyHeartReward` — daily heart grant schedule |
| `src/features/gamification/level-worlds/services/islandRunAudio.ts` | Sound event + haptic event types, `playIslandRunSound`, `triggerIslandRunHaptic` |
| `src/features/gamification/level-worlds/services/islandRunRuntimeState.ts` | `IslandRunRuntimeState` interface, `hydrateIslandRunRuntimeStateWithSource`, `persistIslandRunRuntimeStatePatch` |
| `src/features/gamification/level-worlds/services/islandRunRuntimeStateBackend.ts` | Backend implementation (localStorage + Supabase dual layer) |
| `src/features/gamification/level-worlds/services/islandRunGameStateStore.ts` | `IslandRunGameStateRecord` — read / hydrate / write helpers |
| `src/features/gamification/level-worlds/services/islandRunRuntimeTelemetry.ts` | Hydration stage markers + telemetry helpers |
| `src/features/gamification/level-worlds/services/islandRunEntryDebug.ts` | `logIslandRunEntryDebug` — dev-mode console + debug-table logger |
| `src/features/gamification/level-worlds/services/levelWorldsGenerator.ts` | Legacy campaign board generator |
| `src/features/gamification/level-worlds/services/levelWorldsState.ts` | Legacy campaign state (localStorage) |
| `src/features/gamification/level-worlds/hooks/useLevelWorlds.ts` | Legacy campaign React hook |
| `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` | Milestone tracker + current Next Slice |
| `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` | Board spec: coordinates, rendering layers, movement algorithm, QA checklist |
| `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md` | Egg lifecycle spec |
| `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` | Audio/haptics standards + minigame template |
| `docs/07_MAIN_GAME_PROGRESS.md` | Append-only agent progress log |
| `docs/08_ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PLAYBOOK.md` | Hydration + telemetry playbook |
| `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md` | Manual QA checklist for progression markers |
| `docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md` | Canonical product direction doc (supersedes older index files) |
