# Island Run live-board Build mode Gauntlet

Date: 2026-08-09
Status: active implementation contract
Representative slice: Island 5, actual 3D, 390×844 phone viewport

## Mission and user outcome

Turn Build from a nearly full-screen standalone landmark preview into a compact,
transparent construction mode over the real island. The player should watch the
authored landmark on the board while funding it, remain oriented in the world,
and continue building through lightweight completion celebrations.

## Sources of truth

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`, especially §4B.
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`.
- `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`.
- `src/features/gamification/level-worlds/services/islandRunStateActions.ts`.
- `src/features/gamification/level-worlds/services/islandRunSequentialBuild.ts`.
- The live Island 5 scene and camera presets in `Island5ThreePilot.tsx` and
  `island5ThreePilotContract.ts`.

## Non-negotiables and forbidden shortcuts

- The existing canonical build action remains the only gameplay mutation path.
- Build mode creates no gameplay-state mirror and no persistence call.
- The real board landmark is the visual authority; no duplicate standalone
  Island 5 model or raster hero may cover it.
- The board, top HUD and landmark context remain visible on a portrait phone.
- Build controls remain reachable, legible and safe-area aware.
- Completion feedback never blocks the next build action and requires no button.
- Reduced-motion mode removes camera/celebration flourish without removing
  information.

## Scope

### Included now

- Compact transparent Build header and five-part funding tray.
- Live-board focus on the active sequential landmark.
- Fast camera handoff when the sequence advances to a different landmark.
- Non-blocking, auto-dismiss level/restoration celebration.
- Island 5 actual-3D implementation plus the existing 2D camera-focus fallback.
- Phone visual QA, architecture/test/build gates and refreshed Capacitor install.

### Deferred

- New building models for Islands 1–4 or 6–120.
- Changes to build costs, order, part count, discounts or island-clear rules.
- New authored audio, video or generated raster assets.
- A broader redesign of the controller or top reward HUD.

## Authority and safety boundary

The implementation may change presentation state, camera choreography, CSS,
accessibility semantics, source-contract tests and Gauntlet documentation. It
may not change currencies, costs, rewards, sequential build authority, server
writes, publishing, deployment or island production assets.

## Milestones and evidence

### M1 — transparent construction mode

- Opening Build keeps the real island visible.
- No standalone Island 5 preview renderer or large opaque hero remains.
- The compact header names island, landmark, level and wallet.
- The progress bar, level rail and five part controls fit at 390×844.

### M2 — camera choreography

- Build open focuses the current landmark on the live scene.
- L1→L2 and L2→L3 stay on the same landmark without camera churn.
- Completing L3 and advancing to another landmark triggers one quicker,
  professional camera handoff.
- Closing Build returns to the normal overview once.

### M3 — continuous celebration

- A completed level produces a compact transparent banner with custom ornate
  header treatment, particles/glow and concise level information.
- It auto-dismisses and has no confirmation button.
- Build controls remain usable while it is visible.
- Repeated completions replace/refresh the banner safely instead of stacking.

### M4 — verification and device gate

- TypeScript, Build-mode source contracts, the full Island Run suite,
  architecture guards and production build pass at the established baseline.
- True 390×844 screenshots cover open, partial funding, level completion and
  landmark handoff.
- The refreshed signed Capacitor build installs and launches on Eivind's iPhone.

## Performance and visual budgets

- No second WebGL renderer inside Build mode.
- No new runtime image payload.
- Camera focus is a single existing-scene transition.
- Build overlay occupies at most the compact header and lower control tray;
  transparent space between them must reveal the board.
- Celebration dwell target: about 2.4 seconds, with no input lock.

## Rollback and recovery

- Presentation changes remain isolated to Build components, board camera props,
  CSS and tests.
- If controlled 3D focus destabilizes gameplay movement, remove only the new
  camera request prop and retain the compact overlay.
- If phone readability fails, adjust overlay geometry without changing actions.
- Preserve the previous commit as the rollback point.

## Stop conditions

Stop and request a decision only if the compact controls cannot coexist with
the current controller at 390×844, or if supporting all legacy 2D islands would
require changing canonical build sequencing. Otherwise continue through the
representative Island 5 slice and its verification gates.

## Handoff

Another worker should read this file, the four project contracts required by
`AGENTS.md`, then inspect the current diff and the latest 390×844 evidence before
editing. Do not recreate a second landmark preview or add a UI gameplay writer.
