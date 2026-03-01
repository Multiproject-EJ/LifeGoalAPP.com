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
- [🟡] M7: Boss stop (trial) + rewards (M7A resolve + reward feedback shipped; M7B telemetry/reward contract wiring shipped; M7C refresh persistence markers shipped; M7D table-first persistence wiring shipped; M7E debug evidence marker payloads shipped; M7F deterministic QA hooks/checklist shipped; M7G assertion harness shipped; M7H preset modes shipped; M7I summary helper shipped; M7J export bundle helper shipped; M7K run-scoped filter helper shipped; M7L filter-aware export bundle shipped; M7M explicit scope metadata shipped; M7M.1 unmatched-ref scope normalization shipped; M7N filter-resolution metadata shipped)
- [🟡] M8: Market stop + purchases (M8A market stop prototype purchase modal stub shipped; M8B market telemetry/debug markers shipped; M8C owned-state no-repurchase UX shipped; M8D repurchase-block telemetry/debug markers shipped; M8E market QA checklist commands shipped; M8F deterministic QA helper shipped; M8G marker export helper shipped; M8H marker reset helper shipped; M8I status assertion helper shipped; M8J in-UI helper hint shipped)
- [🟡] M9: Home island + hatchery slots + always collect (M9A home hatchery summary panel scaffold shipped; M9B slot/ready status row copy scaffold shipped; M9C action-hint row copy scaffold shipped; M9D progression-hint row copy scaffold shipped)
- [ ] M10: Audio + haptics system integrated
- [ ] M11: Minigame framework + first minigame stub
- [🟡] M12: UI beautification + production polish pass (visual design system, spacing/typography cleanup, motion polish, mobile readability; M12A header/control polish shipped; M12B board/chip readability polish shipped; M12C motion/feedback polish shipped; M12D modal/CTA polish shipped; M12E HUD scanability polish shipped; M12F semantic color-token polish shipped; M12G control-state emphasis polish shipped; M12H debug/QA de-emphasis polish shipped; M12I board chrome/background framing polish shipped; M12J board focal hierarchy polish shipped; M12K stop/tile readability contrast polish shipped; M12L micro-typography/spacing consistency polish shipped; M12M button hierarchy consistency polish shipped; M12N modal-body readability rhythm polish shipped; M12O onboarding/travel overlay clarity polish shipped; M12P overlay CTA/context separation polish shipped; M12Q overlay action-emphasis state polish shipped; M12R overlay interaction affordance accessibility polish shipped; M12S overlay density balance polish shipped; M12T overlay copy-hierarchy contrast polish shipped; M12U long-copy readability wrap-rhythm polish shipped; M12V headline-spacing consistency polish shipped; M12W overlay CTA-spacing consistency polish shipped; M12X overlay action-row alignment polish shipped)

Support shipped:
- ✅ Hearts-empty fallback can launch existing Game of Life onboarding display-name loop as a booster in Island Run dev prototype (+1 heart on success, loop step persisted).

Quality direction:
- Add explicit UI beautification track (M12) so prototype scaffolds are followed by production-grade visual/interaction polish before MVP handoff.
- M12 is mandatory before MVP sign-off: target production-level visual quality (layout rhythm, typography scale, spacing consistency, control styling, motion feel).

---

# Next Slice (must always be filled)
**Objective:** M12Y: Apply twenty-fifth visual polish pass to overlay action-row vertical anchoring (top/center alignment consistency across modal variants)  
**Files to touch:** `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`, `src/features/gamification/level-worlds/LevelWorlds.css`, `docs/07_MAIN_GAME_PROGRESS.md`, `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`  
**Acceptance criteria:** overlay CTA/action rows keep consistent vertical anchor behavior across onboarding/market/stop/encounter modal variants while preserving gameplay behavior/signatures  
**How to test:** open Island Run view in normal mode and trigger onboarding/market/stop/encounter overlays, comparing action-row vertical anchoring under short vs long body copy; verify roll/stop/travel behavior is unchanged

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
