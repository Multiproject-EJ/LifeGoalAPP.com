# Island Run Legacy17 Removal — Full Rewire Analysis (2026-04-11)

## Ask
Analyze all places that would have passed `legacy17` and define how they now route through the only supported profile (`spark60_preview`, 60 tiles).

## Current truth after removal
- `IslandBoardProfileId` now only allows `'spark60_preview'`.
- The board profile registry contains only `spark60_preview`.
- Default profile resolves to `spark60_preview`.

## Compile-time impact analysis (what would fail)
Any code that tries to pass `'legacy17'` into any API typed with `IslandBoardProfileId` now fails type-check immediately.

Affected API surfaces:
1. `resolveIslandBoardProfile(profileId?: IslandBoardProfileId)`
2. `generateTileMap(..., options?: { profileId?: IslandBoardProfileId })`
3. `generateIslandStopPlan(..., options?: { profileId?: IslandBoardProfileId })`
4. `executeIslandRunRollAction({ boardProfileId?: IslandBoardProfileId })`
5. Any wrapper/component helper that returns `IslandBoardProfileId` values.

## Runtime behavior impact analysis (what changed)
1. **URL/query fallback behavior changed**
   - Before: `?boardProfile=legacy17` could route to 17-tile profile.
   - Now: only `spark60` / `spark60_preview` is recognized; all other values normalize to `spark60_preview`.
2. **Board loops and stop mapping are profile-derived from 60-tile profile only**
   - Tile count: 60.
   - Stop trigger indices: `[0, 12, 24, 36, 59]`.
3. **Roll action execution defaults to 60 profile**
   - If caller omits `boardProfileId`, roll resolution and stop landing checks use `spark60_preview`.

## Rewire status by subsystem
### A) Board renderer / board entry
- `IslandRunBoardPrototype` now resolves active profile exclusively to `spark60_preview`.
- Telemetry profile exposure emits 60-tile profile metadata.

### B) Movement + wrapping
- Movement wrapping remains topology-derived (`tileCount`), now effectively always 60 under default flow.

### C) Tile-map generation
- `generateTileMap` reads profile tile count/stop indices from resolved profile.
- Default generation now returns 60 entries with stop indices at `0/12/24/36/59`.

### D) Stop plan
- `generateIslandStopPlan` reads stop tile indices from resolved profile.
- Existing stop sequencing logic now aligns with the 60-stop-index geometry.

### E) Roll action service
- `executeIslandRunRollAction` defaulted to `spark60_preview` and no longer references legacy profile assumptions.

## External/non-TypeScript risk surfaces to monitor
1. **Old deep links/bookmarks**
   - Links carrying `?boardProfile=legacy17` will silently normalize to 60 profile.
2. **Cached UI expectations**
   - Any QA scripts expecting 17-step laps must be updated to 60-step lap semantics.
3. **Out-of-repo clients**
   - Any external tooling that serialized `'legacy17'` into requests/config will now fail compile (if typed) or be ignored/normalized (if untyped URL/query).

## Rewire checklist (to ensure everything passes through 60)
- [x] Remove `legacy17` from profile type union.
- [x] Remove `legacy17` from profile registry/default.
- [x] Remove query fallback path for `legacy17`.
- [x] Update roll-action default profile.
- [x] Update topology tests to assert 60 as default.
- [x] Update foundation stop-index test to `0/12/24/36/59`.
- [ ] (Optional) Add telemetry warning event when unknown `boardProfile` query is supplied.
- [ ] (Optional) Add redirect/URL cleanup to strip unsupported `boardProfile` values from the browser URL.

## Bottom line
The codebase is now rewired so all in-repo typed profile flows pass through `spark60_preview` only. Remaining risk is mostly external (old links/scripts), not internal compile-time paths.
