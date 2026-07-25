# Mini-game rendering kit

**Status:** Active
**Applies to:** `src/features/gamification/games/`

The shared "game feel" layer for the event mini-games. Introduced in the
Companion Feast upgrade (PR #3204) by extracting the language the Fortune
Engine rebuild established, so each remaining game does not re-derive it.

## Where things live

The kit is split along the **testability** line — this split is the point, so
keep new helpers on the correct side:

| Module | Contains | Tested? |
| --- | --- | --- |
| `level-worlds/services/minigameJuice.ts` | Deterministic maths: particle bursts + stepping, screen shake, number tweening, combo/chain escalation, easing/pop scaling | Yes — `__tests__/minigameJuice.test.ts`, via the Island Run suite |
| `games/_shared/minigameCanvasKit.ts` | Pixel-facing helpers needing a `CanvasRenderingContext2D`: canvas setup, colour shading, scoped glow, the glossy lit orb, particle/sparkle/score-pop drawing, reduced-motion probe | No — verified by looking at it |

Anything that can be expressed as maths belongs in `minigameJuice.ts` so the
suite can pin it. Only put a helper in the canvas kit if it genuinely needs a
drawing context.

## House rules

- Randomness is threaded through an explicit xorshift `rngState`, matching
  `rollCompanionFeastDropTier` / `rollFortuneWheelSlot`. No `Math.random()` in
  game logic — it makes runs untestable.
- Simulation steps take `dtMs` and return new objects. Never mutate input.
- `dtMs` is clamped (64ms) so a backgrounded tab resuming does not teleport
  bodies or particles.
- Key light comes from the **upper-left** (`MINIGAME_LIGHT_DIR`), per
  `ISLAND_VISUAL_PRODUCTION_CONTRACT.md`. Contact shadow beneath.
- Glow always goes through `withGlow`, which restores shadow state. A bare
  `ctx.shadowBlur = n` leaks into every later draw — an easy and ugly bug.
- **Reduced motion is a caller concern.** Renderers check
  `prefersReducedMotion()` and skip *spawning* shake/particles. The kit does
  not silently no-op, and reduced-motion players get the same game without the
  effects — never a degraded one.

## Pitfalls found the hard way

These cost real debugging time. Read before touching the kit.

### Non-square canvases stretch every circle

`prepareMinigameCanvas` originally scaled both axes by
`canvas.height / logicalSize`. On a square canvas that is correct and
invisible. On a **taller-than-wide** canvas it applies a larger vertical
factor than horizontal, turning every `ctx.arc()` into an ellipse.

Fortune Engine's canvas is 480×480, so this never showed there. Companion
Feast's bowl is 360×520 — every fruit rendered as an egg, and **all 1518 tests
passed** with the bug live. It was caught only by rendering the kit in a
browser and looking at the output.

`prepareMinigameCanvas(canvas, logicalWidth, logicalHeight?)` now takes an
explicit logical height. **Always pass both for non-square surfaces.**

The general lesson: geometry bugs are invisible to unit tests. Any change to
drawing code needs a visual check — see below.

### Flat-stroked rim light leaves a hard seam

Drawing bounce light as a plain `ctx.arc()` stroke produces a crescent that
stops abruptly at both ends, reading as a seam or notch cut across the sphere.
Stroke it with a linear gradient that fades to transparent at both ends
instead.

### Hard-edged speculars read as blobs

A solid-fill ellipse highlight looks like a sticker at larger radii. Use a
radial gradient with a soft falloff.

## Verifying rendering changes

Unit tests cannot see pixels. To check drawing code, stand up a throwaway
Vite page that imports the kit directly and screenshot it:

1. Create a scratch directory with an `index.html` (a `<canvas>`) and a
   `main.ts` that imports from the kit and draws a representative scene —
   cover the **full palette and size range**, not one example.
2. `npx vite --port <port> --strictPort <dir>`
3. Screenshot with Playwright. `playwright-core` is not a project dependency;
   install it outside the repo and point `executablePath` at
   `/opt/pw-browsers/chromium`.
4. Assert the canvas is not blank (sample `getImageData` for non-background
   pixels) **and look at the image** — the ellipse bug passed every numeric
   check.
5. Delete the scratch directory.

A useful companion for canvas-fed simulations: assert over a long simulated
run that every coordinate stays finite and in bounds. A single `NaN` silently
corrupts the whole frame, and that failure mode *is* unit-testable — see the
1500-frame test in `companionFeastGame.test.ts`.

## Consumers

| Game | Uses the kit? |
| --- | --- |
| Companion Feast | Yes — canvas kit + juice |
| Space Excavator | Juice, via a canvas FX overlay above its DOM tile grid |
| Island Workshop | Not yet |
| Fortune Engine | **No — deliberately.** It shipped recently with its own private equivalents and has no rendering test coverage; migrating it would risk the newest game for no user-visible gain. Migrate only alongside a real visual QA pass. |
