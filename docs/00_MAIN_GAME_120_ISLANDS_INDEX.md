> [!WARNING]
> This document is no longer the primary authoritative gameplay source of truth.
>
> The canonical gameplay contract is now:
> `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
>
> This file may still contain useful supporting detail, implementation notes, or historical context, but it must not override the canonical gameplay contract.

# HABITGAME — MAIN GAME 120 ISLANDS (INDEX)

> ⚠️ **Status update (2026-02-27):** This file is now secondary context.
> This file is an index/navigation aid for the legacy main-game doc set.
> For gameplay-rule authority, follow:
> **`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`**.

Owner: EJ  
Product: habitgame.app / lifegoalapp.com  
Platform: Mobile-first PWA  
Build Mode: AI agent slices

## What this system is
A time-limited Island Run loop (**48 h for normal islands / 72 h for special islands**; Catch-up Rule A on resume) with:
- Fixed board coordinates reused across all islands (art swaps only)
- 60 tile anchors on a continuous ring loop
- Token movement (Hearts = Dice)
- 5 Stops per island as **outer POIs** (Step 1 gates dice; Stop 5 is Boss); stops are not tiles on the ring — see `docs/07_MAIN_GAME_PROGRESS.md` for additional legacy implementation detail
- Hatchery + Egg lifecycle + Dormant egg carryover
- Home Island always-collect hatchery
- Encounter tile (easy bonus challenge)
- Market and main minigame entry
- Audio + haptics on mobile

## Files that define the system
- `01_MAIN_GAME_AGENT_PROTOCOL.md` — How the AI must work + progress rules
- `02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md` — tables, migrations, RLS
- `03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` — coordinates, tiles, token, screens
- `04_MAIN_GAME_EGGS_HATCHERY_HOME.md` — eggs, stages, dormant, selling, spawn rules
- `05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` — sound/haptic map, asset naming, minigame devplan template
- `06_MAIN_GAME_NEXT_SLICE_PROMPT_TEMPLATE.md` — reusable copy/paste prompt to execute the next slice



## Legacy doc set (for agent prompts)
Use these files as a navigation set for HabitGame Main Loop planning/history:
- `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` (entrypoint + current milestone + Next Slice)
- `docs/01_MAIN_GAME_AGENT_PROTOCOL.md` (execution rules + handoff format)
- `docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md` (DB + RLS + migrations)
- `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` (board renderer + movement + QA)
- `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md` (egg lifecycle + hatchery rules)
- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` (audio/haptics/assets + minigame template)
- `docs/06_MAIN_GAME_NEXT_SLICE_PROMPT_TEMPLATE.md` (copy/paste prompt for next implementation slice)
- `docs/07_MAIN_GAME_PROGRESS.md` (append-only progress log)
- `docs/ISLAND_RUN_120_ISLAND_NAMES_CANONICAL.md` (canonical 1–120 island name roster)
- `docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md` (legacy mini-game roster, boss system, heart economy, player level notes)
- `docs/13_COLLECTIBLE_PROGRESS_BAR.md` (legacy collectible progress bar design — shard sub-currency, milestone chain, HUD pill)
- `docs/17_CURRENCIES_AND_SHIELD.md` (legacy currency list notes: Coins/Diamonds/Hearts/Shards/Tickets/Shields; egg hatch timer surprise rules; HUD display order)

Naming convention is intentional:
- Numeric prefix controls read order and avoids ambiguity in generic prompts.
- `MAIN_GAME_120_ISLANDS_INDEX` is the index/navigation entrypoint.
- `07_MAIN_GAME_PROGRESS.md` is append-only and never replaced.

---

## Generic agent prompt mode (recommended)
If you want to run future slices with one reusable prompt, use `docs/06_MAIN_GAME_NEXT_SLICE_PROMPT_TEMPLATE.md`.
It forces the agent to:
1) start from `00_MAIN_GAME_120_ISLANDS_INDEX.md`
2) pull only relevant linked docs
3) implement the current Next Slice
4) update `00_MAIN_GAME_120_ISLANDS_INDEX.md` + `07_MAIN_GAME_PROGRESS.md` at the end

---

# Current Progress (keep updated)
Legend: ✅ Done | 🟡 Partial | ⛔ Blocked

## Milestones
- [✅] M1: Hybrid 3D board foundation (ring path + 60 anchors + depth masks) renders on top of island art (M1A shipped in dev mode; M1B-COMPLETE — board renders for all logged-in users without dev flags)
- [✅] M2: Dice movement + token animation along 60 anchors (M2-COMPLETE — token hops tile-to-tile with CSS transitions, squash/stretch on land, zBand shadow depth, roll result chip + landing feed in production HUD)
- [✅] M3: Stops (5) land-to-open modals wired (M3A stop modal stubs wired in prototype; M3-COMPLETE — all 5 stop modals open on tile landing + orbit-stop POI tap; stop state locked/active/completed reflected on orbit buttons with ✅/🔒 icons; Escape key closes modals; Dynamic stop kind-specific content blocks added)
- [✅] M4: Island timer + expiry -> travel overlay -> advance (M4A dev simulation shipped; M4-COMPLETE — production-grade timer for all users; travel overlay triggers on expiry; island advance with correct state reset; Catch-up Rule A; island 120 → 1 wrap with cycle_index increment)
- [✅] M5: Hatchery + egg stages + dormant carryover (M5A egg scaffold shipped in prototype; M5-COMPLETE — random tier assignment weighted (common 70%/rare 25%/mythic 5%), random hatch delay 24–72 h, no countdown shown to player, stage names (Smooth/Mostly Gold/Cracked/Ready to Open) with emoji visuals, all 5 hatchery modal states production-ready, Island 1 forced egg set onboarding, per-island egg persistence with location flag (island/dormant), dormant carryover on travel, new eggService.ts with rollEggRewards/rollEggTierWeighted/getRandomHatchDelayMs/stage helpers)
- [✅] M6: Encounter tile (easy) + rewards (M6A prototype shipped in dev mode; M6-COMPLETE — production polish: encounterService.ts with 3 challenge types (quiz/breathing/gratitude), rollEncounterReward (5–15 coins, 15% heart, 25% shard), per-visit completedEncounterIndices tracking, completed tile visual state, reward reveal animation, Escape key, mobile-friendly touch targets, multiple encounter tiles for seasonal/rare islands, island travel resets encounters)
- [✅] M7: Boss stop (trial) + rewards (M7A resolve + reward feedback shipped; M7B telemetry/reward contract wiring shipped; M7C refresh persistence markers shipped; M7D table-first persistence wiring shipped; M7E debug evidence marker payloads shipped; M7F deterministic QA hooks/checklist shipped; M7G assertion harness shipped; M7H preset modes shipped; M7I summary helper shipped; M7J export bundle helper shipped; M7K run-scoped filter helper shipped; M7L filter-aware export bundle shipped; M7M explicit scope metadata shipped; M7M.1 unmatched-ref scope normalization shipped; M7N filter-resolution metadata shipped; M7-COMPLETE — boss stop production polish: bossService.ts with deterministic boss type ~75% Milestone/~25% Fight, difficulty scaling by island range, timer-based boss trial flow with Lives=Hearts mechanic (failed attempt costs 1 heart), success/failure states, Begin Boss Trial CTA, score progress bar, +3 shards on boss defeat, enhanced island clear celebration with reward reveal, Shop Tier 2 correct unlock state, orbit stop ✅ icon on completion, Escape key, mobile-friendly)
- [✅] M8: Market stop + purchases (M8A market stop prototype purchase modal stub shipped; M8B market telemetry/debug markers shipped; M8C owned-state no-repurchase UX shipped; M8D repurchase-block telemetry/debug markers shipped; M8E market QA checklist commands shipped; M8F deterministic QA helper shipped; M8G marker export helper shipped; M8H marker reset helper shipped; M8I status assertion helper shipped; M8J in-UI helper hint shipped; M8-COMPLETE — Utility Stop (Stop 3) production polish: heart refill/dice bonus/timer extension actions with sound+haptic+telemetry; hearts-full guard; styled buttons; Shop panel production polish: Owned ✅ badges for Tier 1+2 items; Tier 2 wired to handler; shop open/close sound+telemetry; Escape key closes shop; diamonds wallet state (localStorage-persisted, earned from mythic egg opens); marketOwnedBundles persist to localStorage per island; `npm run build` passes)
- [✅] M9: Hatchery HUD summary + always-collect recovery flow (M9A home hatchery summary panel scaffold shipped; M9B slot/ready status row copy scaffold shipped; M9C action-hint row copy scaffold shipped; M9D progression-hint row copy scaffold shipped; M9E Home Island slot/ready values driven from real egg state shipped; M9F Set egg + Open egg actions wired in Home Island panel with audio/haptic + stage progress indicator shipped; M9G Home Island hatchery telemetry + QA shipped — home_egg_set/home_egg_open telemetry + debug markers + QA checklist section 14; M9-COMPLETE — Home Island panel production polish: persistent 🏠 HUD button; overlay/modal with backdrop-dismiss + Escape key; separate homeEgg state persisted in localStorage independently of island travel; Set Egg action with random tier (common 70%/rare 25%/mythic 5%) + random hatch delay (24–72h); egg stage display (Smooth/Mostly Gold/Cracked/Ready to Open) — no countdown shown; Open Egg action at stage 4 with reward reveal animation + +2 wallet shards; repeatable slot; audio/haptic on set+open; home_egg_set/home_egg_open telemetry; mobile-friendly touch targets; `npm run build` passes)
- [✅] M10: Audio + haptics system integrated (M10A audio/haptic service foundation shipped; 4 sound events + 4 haptic events wired; HUD audio toggle added; M10B hatchery + market audio/haptic events shipped — 6 new sound events + 3 haptic events; M10C boss + encounter audio/haptic events shipped — 5 new sound events + 3 haptic events; M10D market stop completion + island travel completion audio/haptic wired; M10E audio/haptic QA coverage checklist shipped — all audio/haptic events fully wired (M10A–M10E))
- [✅] M11: Minigame framework + first minigame stub (M11A minigame framework scaffold shipped — IslandRunMinigame interface, ISLAND_RUN_MINIGAME_REGISTRY, resolveMinigameForStop; stop CTA routed via registry; M11B minigame launcher + reward passthrough shipped; M11C per-island stop enforcement shipped — Step 1 gate, HUD progress chip, boss lock visual, completedStops localStorage persistence)
- [✅] M12: UI beautification + production polish pass (visual design system, spacing/typography cleanup, motion polish, mobile readability; M12A–M12X shipped; M12Y overlay action-row vertical anchoring shipped; M12Z final visual polish cohesion audit shipped — M12 MVP polish gate complete)
- [✅] M13-UX-POLISH: Collapse dev/prototype info panel behind toggle — board is primary visual on load; Roll/Spin/audio/Stop1 always visible; full HUD expandable via "▼ Dev info" toggle
- [✅] M14: Shop separation & unlock tiers — market stop removed from stop plan; 5 stops are hatchery/minigame/utility/dynamic/boss; persistent 🛍️ Shop HUD button added; Tier 1 always available; Tier 2 (heart boost bundle) gated on bossTrialResolved; egg selling in shop when eggStage >= 4
- [✅] M16: Collectible Progress Bar — shard sub-currency, repeating milestone chain, pill HUD component (design locked in docs/13_COLLECTIBLE_PROGRESS_BAR.md; build slices M16A–M16I); M16A shipped; M16B shard earn logic shipped; M16C shard tier index advancement + milestone chain progression shipped; M16D fill animation shipped; M16E Claim button + blind-box reveal shipped
- [✅] M17: Currencies & Shield — add Shards + Shields to wallet state, HUD, Body habit award, Bank tab convert (design locked in docs/17_CURRENCIES_AND_SHIELD.md; build slices M17A–M17E); M17A shipped; M17B Body habit shield earn + Bank tab convert stub shipped; M17C Shards HUD chip + wallet field + Bank tab balance shipped; M17D Shards earn paths wired (stops +1, boss +3, egg open +2, minigame +1) + dev simulate button shipped; M17E Bank tab Coins/Diamonds/Hearts rows added — all 5 persistent wallet currencies visible in canonical HUD order; M17D shipped; M17E close-out complete


## Island timer semantics
- **Shipped behavior:** when an island timer expires, the run now advances to the next island instead of retrying the same one.
- **Deferred start rule:** expiry unlocks the next island immediately, but that next island's timer stays paused until the player opens Island Run and starts the island.
- **Today-tab support:** the circular offers row can show an active Island Run countdown while a timer is live, then switch to an `Open` state once the next island is ready to start.
- **Why this matters:** it avoids background timer burn on unopened islands, makes expiry less punitive, and gives the player a clear “new island ready” return point.
- **UI timer format:** island countdowns use compact adaptive labels such as `1d 8h`, `17h 57m`, `43m 32s`, or `52s`.

Support shipped:
- ✅ Hearts-empty fallback can launch existing Game of Life onboarding display-name loop as a booster in Island Run dev prototype (+1 heart on success, loop step persisted).

Quality direction:
- Add explicit UI beautification track (M12) so prototype scaffolds are followed by production-grade visual/interaction polish before MVP handoff.
- M12 is mandatory before MVP sign-off: target production-level visual quality (layout rhythm, typography scale, spacing consistency, control styling, motion feel).

---

# Next Slice (must always be filled)
**Objective:** M18 — Integration + QA pass: end-to-end island run integration testing, cross-milestone regression verification, telemetry audit, and performance profiling. Verify M1–M17 + M9-COMPLETE all work together in a production build; identify and fix any integration regressions.
**Files to touch:** `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`, telemetry services, any regressions found.
**Acceptance criteria:** All M1–M17 + M9-COMPLETE acceptance criteria pass; no TypeScript errors; `npm run build` passes; telemetry events fire correctly in production.
**How to test:** Open Island Run as a logged-in user; exercise all stops (hatchery, encounter, utility, boss, minigame, shop); travel between islands; open Home Island panel; verify all rewards, sounds, and telemetry fire correctly.

---

# Notes / Decisions Locked
- Board tile positions are fixed across all islands (art only changes); stops are outer POIs accessible via stop trigger tiles on the ring
- 60 tile anchors (production board standard)
- Board visual style: **3D-hybrid** (2D art + pseudo-3D board layer + depth/occlusion masks)
- Movement: 1 Heart converts into dice pool; each move consumes a **2-dice pair** (each die 1–3, total move 2–6 tiles). Occasional Spin Move (1–5 tiles).
- Stops: 1 Hatchery, 2 Minigame, 3 Utility, 4 Dynamic, 5 Boss — **Shop is NOT a stop**; shop is a persistent HUD button always accessible
- Dynamic Stop expansion (planned): include an occasional **Community Quiz** stop variant where players answer one of a 100-question bank (player-style/archetype prompts), then immediately see aggregate community result percentages (cohort-scoped or global). Detailed implementation is deferred to a later build slice.
- Encounter tile: easy bonus challenge, not boss
- Special islands: exactly **20** in the 1–120 sequence — **5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120**; normal islands: **48 h** timer; special islands: **72 h** timer
- Eggs: **one per island total** (non-renewable after sold/claimed); Common/Rare/Mythic, 4 stages; hatch timer runs from first island visit regardless of player location; unclaimed hatched eggs are recoverable on cycle revisit; **hatch duration is a surprise (1–3 days) — no countdown shown to player**
- Collectible Progress Bar: repeating escalating milestone chain; 7 era-specific collectibles (⚡🎳🌸💡🔷🌀🌈) + 🌟 Star Fragment for special islands; shards earned from egg_shard tiles, stops, bosses; blind-box claim; pill always visible in HUD; full design in docs/13_COLLECTIBLE_PROGRESS_BAR.md
- Currencies: Coins, Diamonds, Hearts, Shards (app-wide persistent); Tickets (temporary per-island); Shields (Body habit bonus, 1 Shield = 65 Coins convertible in Bank tab); full design in docs/17_CURRENCIES_AND_SHIELD.md
- HUD currency order: Coins → Diamonds → Hearts → Shields → Shards → Dice
