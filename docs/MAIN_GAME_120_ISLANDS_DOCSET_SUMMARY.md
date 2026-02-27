# MAIN GAME 120 ISLANDS — Docset Summary

> ⚠️ **Status update (2026-02-27):** This summary is now secondary.
> Use **[`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md)** as the single source of truth.

This file summarizes the canonical docset referenced by `00_MAIN_GAME_120_ISLANDS_INDEX.md`.

## Entrypoint
- `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md`
  - Defines the main loop vision, milestones, and current **Next Slice**.
  - Lists the canonical documents that must be used in order.

## Companion documents
- `docs/01_MAIN_GAME_AGENT_PROTOCOL.md`
  - Agent workflow rules: read repo first, work in small slices, keep docs updated, commit each slice.
- `docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md`
  - Baseline schema, RLS expectations, and migration naming for run state + eggs + ownership.
- `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md`
  - Fixed 17-anchor board system, pseudo-3D rendering, layers, movement rules, and QA checklist.
- `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md`
  - Egg lifecycle (tiers/stages), hatchery spawn behavior, dormant carryover, and reward contract.
- `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md`
  - Audio/haptics standards, mandatory asset naming conventions, and minigame devplan template.
- `docs/06_MAIN_GAME_NEXT_SLICE_PROMPT_TEMPLATE.md`
  - Reusable prompt template for implementing one slice at a time.
- `docs/07_MAIN_GAME_PROGRESS.md`
  - Append-only progress log for continuity between agents.

## Current state captured by index
- Milestones M1–M11 are currently unchecked.
- Current Next Slice is `M1A` (hybrid board renderer v1 + dev overlay).
