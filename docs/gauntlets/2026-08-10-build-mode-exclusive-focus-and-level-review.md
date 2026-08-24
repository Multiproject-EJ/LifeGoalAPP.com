# Build mode exclusive focus and level review

Status: complete
Date: 2026-08-10
Owner: Eivind / Codex

## Mission and observable outcome

Make the live-board Build experience the sole interaction owner while it is open. The island remains visible, but the board, landmarks, caretaker, camera gestures, footer, and unrelated modals cannot interrupt construction. Each completed building level remains visibly framed for one and a half seconds, with a half-second minimum dwell and an optional queued/manual advance.

## Sources of truth

- `docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md`
- `docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md`
- `docs/gameplay/ISLAND_RUN_GUARDRAILS_AND_CONFLICT_MATRIX_2026-04-24.md`
- `src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx`
- `src/features/gamification/level-worlds/components/BuildModalV2.tsx`
- `src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx`

## Non-negotiables

- Keep all building funding and level advancement in the existing canonical action path.
- Add only transient presentation state for dwell, queued advance, camera focus, and modal ownership.
- Do not hide the island; Build continues to use the real board and actual 3D landmark.
- No board or landmark action may open behind Build.
- Autonomous modal flags may queue, but their surfaces must not render until Build closes.
- Build camera focus may pan quickly to the next landmark only after review ends; it must never return to overview while Build remains open.

## Level-review timing contract

1. The completed level and its real board landmark appear immediately.
2. Minimum dwell is 500 ms.
3. A tap during that first half-second queues advance and turns the advance control blue; advance occurs when the minimum dwell completes.
4. A tap after half a second advances immediately without the queued-blue state.
5. Without a tap, review auto-advances after 1,500 ms.
6. Pre-completion rapid taps are discarded at the level boundary and cannot fund the next landmark invisibly.

## Milestones and evidence

1. **Exclusive ownership:** transparent overlay absorbs pointer input; live 3D landmark/caretaker callbacks are guarded; non-Build modal surfaces are suppressed while Build is open.
2. **Camera lock:** completed landmark remains the focus through review; no overview transition occurs until Build closes.
3. **Review state:** real level change stays visible for the timing contract above; early tap queues blue, later tap advances, no tap auto-advances.
4. **Regression gate:** focused contract tests, TypeScript, architecture guard, production build, and 390×844 interaction QA.

## Rollback

The review state, exclusivity styling, and 3D callback guards are independently reversible. Roll back if Build funding authority changes, the close control becomes unreachable, queued modals are lost rather than deferred, or the real landmark becomes obscured.

## Handoff

Implemented and verified on the live Island 001 actual-3D board at a 390×844 phone aspect ratio.

## Results

The August 10 measurements below are the original acceptance evidence. The
timing values were superseded on 2026-08-23 by the fast-builder adjustment in
the contract above. Current phone QA at 390×844 measured a 178 px control dock,
all five part controls fully inside the viewport, a locked page scroll, a
500 ms manual-advance gate, and automatic continuation at 1,500 ms.

- Transparent Build space resolves to `.bm2-build-mode` with `pointer-events: auto`; the board carries `inert` for the full session and body scrolling is locked.
- A coordinate tap on a visible board landmark and a drag through the island both left Build open, opened no stop modal, and preserved the `hatchery` camera preset.
- Other mounted overlay surfaces resolve hidden while Build is open. Egg-ready presentation is explicitly deferred until Build closes.
- Early advance was captured at 678 ms with `isAdvanceQueued=true`, blue feedback, and no ready state. The review cleared at the one-second boundary.
- A late manual state was captured at 1,135 ms with `isAdvanceReady=true`, no queued styling, and the completed Hatchery still framed.
- The untouched review auto-advanced to the next landmark at three seconds and panned directly to `habit`; it did not visit overview.
- The old first-session Hatchery exception was removed after phone QA exposed that it bypassed the review contract.
- TypeScript and production Vite build pass. Island Run architecture guard passes with zero violations.
- Island Run suite: 1,693 pass; the same three pre-existing Island 001 manifest/scene-anchor assertions remain outside this Build scope.

Phone evidence: `docs/gauntlets/evidence/build-mode-exclusive-v1/phone/01-build-focus-390x844.jpg`.
