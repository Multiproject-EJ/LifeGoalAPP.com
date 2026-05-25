# Island Run audio-control split proposal (music vs sound effects)

Date: 2026-05-25

## Short answer
Yes — we can split today's single audio toggle into separate **Music** and **SFX** preferences with low migration risk.

## What exists today
- Runtime/game-state uses a single `audioEnabled` boolean preference.
- `islandRunAudio.ts` gates both sound effects and haptics behind that same boolean.
- `IslandRunBoardPrototype` uses the same `audioEnabled` value to decide whether to play/pause music tracks.
- The board HUD shows a single mute/unmute control for "audio and haptics".

## Why split now
- UX clarity: users can keep ambient music off while still hearing gameplay feedback.
- Better accessibility fit: haptics already has an app-level mode; decoupling SFX avoids overloading one toggle.
- Architecture compatibility: current services are already separated (`islandRunMusic.ts` vs `islandRunAudio.ts`).

## Recommended target model
Add new runtime fields:
- `musicEnabled: boolean` (default `true`)
- `sfxEnabled: boolean` (default `true`)

Keep temporary compatibility:
- Preserve `audioEnabled` as legacy read fallback only during migration.
- New writes should go through canonical actions and write `musicEnabled` / `sfxEnabled`.

## Behavior contract after split
- **Music toggle** controls `playIslandRunMusic` / `stopIslandRunMusic` only.
- **SFX toggle** controls `playIslandRunSound` and Island Run haptic triggers only.
- Haptic mode in My Account (`off/subtle/balanced`) remains a second gate for haptics.

## Safe migration sequence
1. **State schema extension**
   - Extend runtime state type(s), hydration mapping, backend patch merge, and defaults with `musicEnabled` and `sfxEnabled`.
   - Fallback rule on read: if either field missing, derive from legacy `audioEnabled`.

2. **Canonical actions**
   - Add dedicated action(s) to set audio preferences (music and/or sfx) via `islandRunStateActions`.
   - Avoid direct gameplay writes in React component logic.

3. **Service gating**
   - `islandRunAudio.ts`: replace single in-memory gate with SFX-specific gate (and keep haptics gated by SFX + existing haptic mode checks).
   - `IslandRunBoardPrototype` effects: switch music playback conditions from `audioEnabled` to `musicEnabled`.

4. **UI controls**
   - Replace single speaker button with two compact controls (e.g., 🎵 music + 🔔 sfx), or a tiny popover with two toggles.
   - Keep labels explicit for accessibility (`aria-label`: "Mute music", "Mute sound effects").

5. **Compatibility & cleanup**
   - Persist both new flags.
   - Keep legacy fallback for one release window; later remove legacy `audioEnabled` after data backfill confidence.

6. **Tests**
   - Add/update tests for:
     - fallback derivation from legacy `audioEnabled`
     - canonical action writes for each toggle
     - music-only mute keeps SFX active
     - SFX-only mute stops sound/haptics but leaves music active

## Risk notes
- Main risk is preference drift during migration if UI local state and canonical state diverge.
- Mitigation: source-of-truth stays in canonical runtime state; UI only reflects and dispatches actions.

## Scope estimate
- Small-to-medium slice (roughly 1–2 focused PRs):
  - PR A: state + action + service plumbing + tests
  - PR B: HUD/UI split + integration checks
