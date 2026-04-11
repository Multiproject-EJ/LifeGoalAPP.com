# 120 Island Run vs Canonical Contract — Board Alignment Audit (2026-04-11)

## Scope
This audit compares board-specific implementation in the app code against:
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` (authoritative).
- `docs/03_MAIN_GAME_FIXED_BOARD_UI_AND_MOVEMENT.md` (supporting/legacy board UX spec).

## Verdict (board-focused)
**Partially aligned.**

The code matches the canonical direction on variable topology support, profile-derived wrapping, external stop markers, and the visual rendering stack. However, there are material behavior mismatches depending on whether Contract-v2 is enabled, plus naming/model drift in stop identities and tile stop IDs.

## What is aligned

1. **Topology is profile-driven (not hardcoded to 17).**
   - `spark60_preview` is modeled as the production topology profile and uses profile-derived `tileCount` + stop indices.
   - Wrapping uses supplied `tileCount` instead of hardcoded `% 60`.

2. **Board rendering follows the hybrid board model.**
   - Island background image + canvas path + DOM tiles/token + depth mask are all present.
   - Dev/debug overlay includes anchor circles, zBand coloring, tile indices, stop labels, and tangent vectors.

3. **Step 1 gate exists before roll.**
   - Roll entry checks Step 1 completion and auto-opens stop 1 when incomplete.

4. **Contract-v2 path removes timer-driven progression side effects.**
   - Hydration/tick helpers explicitly bypass timer auto-advance in v2 mode.

## Key misalignments

1. **Legacy stop accessibility conflicts with sequential-only progression in canonical contract.**
   - In legacy mode, all non-boss stops are marked `active` in parallel; only boss is conditionally locked.
   - This conflicts with canonical rule: "Only one stop is active at a time" and sequential unlock.

2. **Stop progression still tied to landing-on-stop tiles in legacy gameplay path.**
   - Roll/spin handlers open stops from landed tile index mapping.
   - Canonical contract says stops are external structures and progression must not depend on landing specific tile indices.

3. **Stop identity mismatch between canonical and runtime stop plan.**
   - Canonical stop sequence is Hatchery/Habit/Breathing/Wisdom/Boss.
   - Runtime stop plan still uses Hatchery + dynamic rotating stop definitions under `minigame/utility/dynamic` stop IDs.

4. **Stop ID naming drift in tile map/layout.**
   - Tile map still includes `market` stop ID in stop-index mapping.
   - This does not match the canonical stop taxonomy.

5. **Energy model historically mixed in legacy mode (dice + heart conversion).**
   - Canonical says dice is the only board energy.
   - Hearts should be treated as legacy compatibility data only (not a core board-loop HUD/control input).

## Practical conclusion
- If **Contract-v2 is ON** and used as primary runtime path, board behavior is substantially closer to canonical.
- If **legacy path remains active for users**, canonical compliance is not yet complete for board/progression semantics.

## Recommended next actions
1. Make Contract-v2 the enforced default path for Island Run board logic.
2. Remove or hard-disable legacy landing-coupled stop progression logic.
3. Unify stop IDs and stop labels to canonical names (or formally update canonical contract if product direction changed).
4. Remove legacy heart→dice conversion from movement energy model (and keep hearts non-core/hidden in board HUD).
5. Add an explicit board compliance test matrix for both topology profiles (`spark60_preview`, plus any future profiles) and stop progression invariants.
