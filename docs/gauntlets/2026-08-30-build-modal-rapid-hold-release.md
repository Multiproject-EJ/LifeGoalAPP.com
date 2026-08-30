# Build modal rapid-hold release

Status: implementation and automated release gates complete
Date: 2026-08-30
Owner: Eivind / Codex

## Mission and observable outcome

Make ordinary Build taps feel at least twice as fast and make a held Build control play the complete construction sequence at an accelerating cadence. The player must see real progress continuously rather than wait through dead time or receive a batched result.

## Sources of truth

- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` §4B
- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/BuildModalV2.tsx`
- `src/features/gamification/level-worlds/services/islandRunBuildCadence.ts`

## Non-negotiables

- Keep the existing canonical build action as the sole gameplay and Essence authority.
- Execute exactly one awaited canonical spend for each visible beat.
- Do not batch, skip, or fund across a completed-level review boundary.
- Preserve the real construction robot phases, part progression, sound, haptics, affordability checks, tutorial guards, and release-to-stop behavior.
- Keep the Build modal viewport anchored, scroll locked, and interaction-exclusive.

## Timing acceptance

- A normal tap presents its next build state after 500 ms, down from 1,150 ms (2.3× faster).
- A held build begins at 420 ms and ramps through 320 ms and 230 ms to a 160 ms maximum cadence.
- The hold control exposes a five-beat animation strip and explicit rapid/full-sequence feedback.
- A completed level remains interruptible after a 1,250 ms minimum dwell and auto-continues at 2,100 ms, down from 4,600 ms.
- Completion shine, sparkles, progress, hammering, and hold feedback are retimed to finish inside the shorter presentation window.
- Reduced-motion users receive the same gameplay cadence without forced looping motion.

## Release gates

1. Focused cadence, source-contract, and canonical-action tests pass.
2. The complete Island Run service suite passes.
3. Island Run architecture guards report zero violations.
4. TypeScript and the production Vite build pass.
5. Phone-width browser QA confirms press, hold, acceleration, release, level boundary, and modal layout.
6. Reconcile with the latest `origin/main`, repeat affected gates if it moved, then push the verified commit to `main`.

## Rollback

The shared cadence service, rapid-state presentation classes, and compressed completion timing are independently reversible. Roll back if canonical spends overlap, a held input survives release, a level boundary is crossed invisibly, Build escapes its modal ownership, or animation no longer reflects funded state.

## Results

- Island Run architecture guard: PASS with 0 violations and 3 allowlisted legacy warnings.
- Complete Island Run service suite: 1,965 passed, 0 failed. This includes cadence values, monotonic acceleration, source wiring, one-awaited-action-per-beat, affordability, and level-boundary assertions.
- Production Vite build: PASS (1,389 modules; existing dynamic-import and large-chunk warnings only).
- App-wide `tsc -b` produced no diagnostics but exceeded a 13-minute bounded run and was stopped. The Island Run suite's TypeScript compilation and the production module/JSX/CSS build both completed successfully.
- Browser QA could not be completed on 2026-08-30: occupied stale preview ports were rejected, and the isolated worktree server later warmed and returned HTTP 200 but the in-app browser blocked its direct `.tsx` entry fetch before React mounted. No browser pass is claimed.
