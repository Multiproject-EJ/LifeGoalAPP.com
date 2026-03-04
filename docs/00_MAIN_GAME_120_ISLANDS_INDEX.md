# HABITGAME — MAIN GAME 120 ISLANDS (INDEX)

> ⚠️ **Status update (2026-02-27):** This file is now secondary context.
> The canonical main-game implementation source is:
> **[`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md)**.
> 
> If any direction here conflicts with the canonical file, follow the canonical file.

Owner: EJ  
Product: habitgame.app / lifegoalapp.com  
Platform: Mobile-first PWA  
Build Mode: AI agent slices

## What this system is
A time-limited Island Run loop (**48 h for normal islands / 72 h for special islands**; Catch-up Rule A on resume) with:
- Fixed board coordinates reused across all islands (art swaps only)
- 17 tile anchors on a pond loop
- Token movement (Hearts = Dice)
- 5 Stops per island as **outer POIs** (Step 1 gates dice; Stop 5 is Boss); stops are not tiles on the ring — see `docs/07_MAIN_GAME_PROGRESS.md` for canonical rules
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



## Canonical doc set (for agent prompts)
Use these exact files as the HabitGame Main Loop source set:
- `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` (entrypoint + current milestone + Next Slice)
- `docs/01_MAIN_GAME_AGENT_PROTOCOL.md` (execution rules + handoff format)
- `docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md` (DB + RLS + migrations)
- `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` (board renderer + movement + QA)
- `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md` (egg lifecycle + hatchery rules)
- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md` (audio/haptics/assets + minigame template)
- `docs/06_MAIN_GAME_NEXT_SLICE_PROMPT_TEMPLATE.md` (copy/paste prompt for next implementation slice)
- `docs/07_MAIN_GAME_PROGRESS.md` (append-only progress log)
- `docs/12_MINIGAME_BOSS_ECONOMY_PLAYER_LEVEL_DESIGN.md` (canonical mini-game roster, boss system, heart economy, player level)
- `docs/13_COLLECTIBLE_PROGRESS_BAR.md` (canonical collectible progress bar design — shard sub-currency, milestone chain, HUD pill)
- `docs/17_CURRENCIES_AND_SHIELD.md` (canonical currency list: Coins/Diamonds/Hearts/Shards/Tickets/Shields; egg hatch timer surprise rules; HUD display order)

Naming convention is intentional:
- Numeric prefix controls read order and avoids ambiguity in generic prompts.
- `MAIN_GAME_120_ISLANDS_INDEX` is the source-of-truth entrypoint.
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
- [🟡] M1: Hybrid 3D board foundation (ring path + 17 anchors + depth masks) renders on top of island art (M1A shipped in dev mode)
- [🟡] M2: Dice movement + token animation along 17 anchors (M1B core roll/hop loop shipped in dev prototype)
- [🟡] M3: Stops (5) land-to-open modals wired (M3A stop modal stubs wired in prototype)
- [🟡] M4: Island timer + expiry -> travel overlay -> advance (M4A dev simulation shipped)
- [🟡] M5: Hatchery + egg stages + dormant carryover (M5A egg scaffold shipped in prototype)
- [🟡] M6: Encounter tile (easy) + rewards (M6A prototype shipped in dev mode)
- [🟡] M7: Boss stop (trial) + rewards (M7A resolve + reward feedback shipped; M7B telemetry/reward contract wiring shipped; M7C refresh persistence markers shipped; M7D table-first persistence wiring shipped; M7E debug evidence marker payloads shipped; M7F deterministic QA hooks/checklist shipped; M7G assertion harness shipped; M7H preset modes shipped; M7I summary helper shipped; M7J export bundle helper shipped; M7K run-scoped filter helper shipped; M7L filter-aware export bundle shipped; M7M explicit scope metadata shipped; M7M.1 unmatched-ref scope normalization shipped; M7N filter-resolution metadata shipped)
- [🟡] M8: Market stop + purchases (M8A market stop prototype purchase modal stub shipped; M8B market telemetry/debug markers shipped; M8C owned-state no-repurchase UX shipped; M8D repurchase-block telemetry/debug markers shipped; M8E market QA checklist commands shipped; M8F deterministic QA helper shipped; M8G marker export helper shipped; M8H marker reset helper shipped; M8I status assertion helper shipped; M8J in-UI helper hint shipped)
- [🟡] M9: Home island + hatchery slots + always collect (M9A home hatchery summary panel scaffold shipped; M9B slot/ready status row copy scaffold shipped; M9C action-hint row copy scaffold shipped; M9D progression-hint row copy scaffold shipped; M9E Home Island slot/ready values driven from real egg state shipped; M9F Set egg + Open egg actions wired in Home Island panel with audio/haptic + stage progress indicator shipped; M9G Home Island hatchery telemetry + QA shipped — home_egg_set/home_egg_open telemetry + debug markers + QA checklist section 14)
- [✅] M10: Audio + haptics system integrated (M10A audio/haptic service foundation shipped; 4 sound events + 4 haptic events wired; HUD audio toggle added; M10B hatchery + market audio/haptic events shipped — 6 new sound events + 3 haptic events; M10C boss + encounter audio/haptic events shipped — 5 new sound events + 3 haptic events; M10D market stop completion + island travel completion audio/haptic wired; M10E audio/haptic QA coverage checklist shipped — all audio/haptic events fully wired (M10A–M10E))
- [✅] M11: Minigame framework + first minigame stub (M11A minigame framework scaffold shipped — IslandRunMinigame interface, ISLAND_RUN_MINIGAME_REGISTRY, resolveMinigameForStop; stop CTA routed via registry; M11B minigame launcher + reward passthrough shipped; M11C per-island stop enforcement shipped — Step 1 gate, HUD progress chip, boss lock visual, completedStops localStorage persistence)
- [✅] M12: UI beautification + production polish pass (visual design system, spacing/typography cleanup, motion polish, mobile readability; M12A–M12X shipped; M12Y overlay action-row vertical anchoring shipped; M12Z final visual polish cohesion audit shipped — M12 MVP polish gate complete)
- [✅] M13-UX-POLISH: Collapse dev/prototype info panel behind toggle — board is primary visual on load; Roll/Spin/audio/Stop1 always visible; full HUD expandable via "▼ Dev info" toggle
- [✅] M14: Shop separation & unlock tiers — market stop removed from stop plan; 5 stops are hatchery/minigame/utility/dynamic/boss; persistent 🛍️ Shop HUD button added; Tier 1 always available; Tier 2 (heart boost bundle) gated on bossTrialResolved; egg selling in shop when eggStage >= 4
- [✅] M16: Collectible Progress Bar — shard sub-currency, repeating milestone chain, pill HUD component (design locked in docs/13_COLLECTIBLE_PROGRESS_BAR.md; build slices M16A–M16I); M16A shipped; M16B shard earn logic shipped; M16C shard tier index advancement + milestone chain progression shipped; M16D fill animation shipped; M16E Claim button + blind-box reveal shipped
- [🟡] M17: Currencies & Shield — add Shards + Shields to wallet state, HUD, Body habit award, Bank tab convert (design locked in docs/17_CURRENCIES_AND_SHIELD.md; build slices M17A–M17E; M17A shipped)

Support shipped:
- ✅ Hearts-empty fallback can launch existing Game of Life onboarding display-name loop as a booster in Island Run dev prototype (+1 heart on success, loop step persisted).

Quality direction:
- Add explicit UI beautification track (M12) so prototype scaffolds are followed by production-grade visual/interaction polish before MVP handoff.
- M12 is mandatory before MVP sign-off: target production-level visual quality (layout rhythm, typography scale, spacing consistency, control styling, motion feel).

---

# Next Slice (must always be filled)
**Objective:** M17B — Shield earn: Body habit completion awards 1 Shield (wired into real Body habit completion flow); Shield → Coin convert stub in Bank tab
**Files to touch:** Today tab habit completion handler, Bank tab component, `islandRunRuntimeState.ts` (if shields persist needs update), `IslandRunBoardPrototype.tsx` (remove dev simulate button once real flow is wired)
**Acceptance criteria:** Completing a Body-tagged habit in the Today tab awards 1 Shield and persists it; Bank tab shows Shield balance and has a "Convert Shields → Coins" stub action; `npm run build` passes.
**How to test:** tag a habit as Body in Today tab; complete it; observe 🛡️ chip appears in Island Run HUD and Bank tab shows balance; tap convert stub and observe coins increase.

---

# Notes / Decisions Locked
- Board tile positions are fixed across all islands (art only changes); stops are outer POIs accessible via stop trigger tiles on the ring
- 17 tile anchors (±1 tolerated later, but v1 = 17)
- Board visual style: **3D-hybrid** (2D art + pseudo-3D board layer + depth/occlusion masks)
- Movement: 1 Heart = 1 dice roll (1–3 tiles). Occasional Spin Move (1–5 tiles).
- Stops: 1 Hatchery, 2 Minigame, 3 Utility, 4 Dynamic, 5 Boss — **Shop is NOT a stop**; shop is a persistent HUD button always accessible
- Encounter tile: easy bonus challenge, not boss
- Special islands: exactly **20** in the 1–120 sequence — **5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120**; normal islands: **48 h** timer; special islands: **72 h** timer
- Eggs: **one per island total** (non-renewable after sold/claimed); Common/Rare/Mythic, 4 stages; hatch timer runs from first island visit regardless of player location; unclaimed hatched eggs are recoverable on cycle revisit; **hatch duration is a surprise (1–3 days) — no countdown shown to player**
- Collectible Progress Bar: repeating escalating milestone chain; 7 era-specific collectibles (⚡🎳🌸💡🔷🌀🌈) + 🌟 Star Fragment for special islands; shards earned from egg_shard tiles, stops, bosses; blind-box claim; pill always visible in HUD; full design in docs/13_COLLECTIBLE_PROGRESS_BAR.md
- Currencies: Coins, Diamonds, Hearts, Shards (app-wide persistent); Tickets (temporary per-island); Shields (Body habit bonus, 1 Shield = 65 Coins convertible in Bank tab); full design in docs/17_CURRENCIES_AND_SHIELD.md
- HUD currency order: Coins → Diamonds → Hearts → Shields → Shards → Dice