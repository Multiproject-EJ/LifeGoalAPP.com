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
A time-limited Island Run loop (72h default) with:
- Fixed board coordinates reused across all islands (art swaps only)
- 17 tile anchors on a pond loop
- Token movement (Hearts = Dice)
- 5 Stops per island (Stop 5 is Boss)
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
- [🟡] M7: Boss stop (trial) + rewards (M7A resolve + reward feedback shipped; M7B telemetry/reward contract wiring shipped; M7C refresh persistence markers shipped; M7D table-first persistence wiring shipped; M7E debug evidence marker payloads shipped; M7F deterministic QA hooks/checklist shipped; M7G assertion harness shipped; M7H preset modes shipped; M7I summary helper shipped; M7J export bundle helper shipped; M7K run-scoped filter helper shipped; M7L filter-aware export bundle shipped)
- [ ] M8: Market stop + purchases
- [ ] M9: Home island + hatchery slots + always collect
- [ ] M10: Audio + haptics system integrated
- [ ] M11: Minigame framework + first minigame stub

Support shipped:
- ✅ Hearts-empty fallback can launch existing Game of Life onboarding display-name loop as a booster in Island Run dev prototype (+1 heart on success, loop step persisted).

---

# Next Slice (must always be filled)
**Objective:** M7M: Add explicit `scope` metadata to progression bundle/report helpers  
**Files to touch:** `src/features/gamification/level-worlds/services/islandRunEntryDebug.ts`, `docs/11_ISLAND_RUN_PROGRESSION_MARKER_QA_CHECKLIST.md`, `docs/07_MAIN_GAME_PROGRESS.md`, `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`  
**Acceptance criteria:** summary/filter/bundle outputs include normalized `scope` (`full_buffer` vs `run_filtered`) for unambiguous triage exports without changing existing assertions  
**How to test:** run helpers with/without run filter refs and verify `scope` fields and counts align with the selected mode

---

# Notes / Decisions Locked
- Board + stop + tile positions are fixed across all islands (art only changes)
- 17 tile anchors (±1 tolerated later, but v1 = 17)
- Board visual style: **3D-hybrid** (2D art + pseudo-3D board layer + depth/occlusion masks)
- Movement: 1 Heart = 1 dice roll (1–3 tiles). Occasional Spin Move (1–5 tiles).
- Stops: 1 Hatchery, 2 Minigame, 3 Market, 4 Utility (stub), 5 Boss
- Encounter tile: easy bonus challenge, not boss
- Hatchery spawn varies by island rarity (Normal/Seasonal/Rare)
- Eggs: Common/Rare/Mythic, 4 stages, dormant carryover
