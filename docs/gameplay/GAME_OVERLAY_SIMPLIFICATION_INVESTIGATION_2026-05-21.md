# Game Overlay Simplification Investigation (2026-05-21)

PASS recommendation with a strictly presentational change in `GameBoardOverlay.tsx` (overlay-only), preserving PLAY handler and mobile footer behavior.

## Findings
- Overlay renderer: `src/components/GameBoardOverlay.tsx`.
- It currently renders: top bar, reward/event strip, island progress row, side icon stacks, debug fallback text, and central PLAY button.
- Footer is outside this component in `src/App.tsx` and remains independently mounted.

## Safe implementation plan
1. In `GameBoardOverlay.tsx`, gate or remove HUD and side-icon render blocks from overlay view only.
2. Keep:
   - island background scene image
   - PLAY button and `onPlayClick`
   - container/backdrop/animation wrappers
3. Do not modify action handlers, state stores, reward systems, or persistence paths.
4. Optional hardening: add an overlay-variant prop (`mode='minimal'`) defaulting to current behavior to reduce regression risk.

## Risks
- Footer overlap/safe-area if center layout depends on removed HUD top padding.
- Accessibility regressions if hidden controls remain focusable (prefer conditional render, not CSS-only opacity).
- Reopen flow side effects if any external UX expects spin/creature/garage entry points from overlay.

## Validation
- `npm run build`
- `git diff --check`
