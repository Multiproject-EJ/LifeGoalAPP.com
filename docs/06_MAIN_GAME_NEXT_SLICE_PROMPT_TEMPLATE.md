# NEXT SLICE PROMPT TEMPLATE — HABITGAME MAIN LOOP

Use this exact prompt to continue implementation with minimal drift.

---

## Copy/Paste Prompt

You are continuing HabitGame Main Loop implementation.

Follow these rules strictly:
1) Read `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` first.
2) Implement only the current **Next Slice** from that file.
3) Load only the docs needed for that slice from:
   - `docs/01_MAIN_GAME_AGENT_PROTOCOL.md`
   - `docs/02_MAIN_GAME_DATA_MODEL_AND_SUPABASE.md`
   - `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md`
   - `docs/04_MAIN_GAME_EGGS_HATCHERY_HOME.md`
   - `docs/05_MAIN_GAME_AUDIO_HAPTICS_ASSETS_MINIGAME_TEMPLATE.md`
4) Keep changes small and PR-sized.
5) If unfinished, guard behind feature flag/dev path.
6) If DB changes are required, add migration + RLS checks.
7) At end of slice, you MUST:
   - update `docs/00_MAIN_GAME_120_ISLANDS_INDEX.md` (progress + new Next Slice)
   - append `docs/07_MAIN_GAME_PROGRESS.md` using protocol format
   - run relevant tests/checks
   - commit changes

Output format:
- Slice title
- What changed
- Files changed
- Testing performed
- Risks/known gaps
- Updated Next Slice

---

## Operator Note
If you want to force a specific milestone (e.g., M2), replace “Implement only current Next Slice” with:
“Set Next Slice to M2 first, then implement it and update docs accordingly.”
