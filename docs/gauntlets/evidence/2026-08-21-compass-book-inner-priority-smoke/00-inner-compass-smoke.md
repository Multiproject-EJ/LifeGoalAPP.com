# Inner Compass priority smoke — 2026-08-21

Status: **PASS after two fixes**

Surface under test: production Compass Book preview at `1280 × 720`, Chapter II (`inner_compass`), with demo answers filling all 20 fragments.

## Coverage

- Island Run `auto` presentation resolved to the production 3D hybrid book.
- PWA `2d` presentation resolved to the complete readable 2D book with no 3D shell.
- The chapter sheet stayed inside the viewport and the document did not gain page overflow.
- The completed chapter exposed its question, five output fields, Guardian Boundary, compass statement, sealed state, and all 20 activities.
- The first activity opened as a centered, readable guided-flow surface while body scrolling remained locked.

## Defect 1 — chart-label collision

The initial render placed the East value (`Exploring somewhere`) and West value (`People-pleasing`) through the same horizontal hub lane. This made the most important Inner Compass summary harder to scan.

Fix:

- East now occupies the upper hub lane and West the lower hub lane.
- Both values received a subtle parchment outline so colored compass arms cannot reduce their contrast.
- Stable `data-direction` hooks and launch-contract assertions protect the two lanes.

Post-fix browser geometry:

- East: top `512.6`, bottom `525.6`, left `932.4`, right `1056.6`.
- West: top `556.2`, bottom `569.2`, left `807.95`, right `901.8`.
- Rectangle overlap: `false`.

Evidence:

- `inner-compass-production-hybrid.png` — initial hybrid collision.
- `inner-compass-production-2d.png` — initial 2D collision.
- `inner-compass-production-hybrid-fixed.png` — corrected hybrid chapter.
- `inner-compass-production-2d-fixed.png` — corrected 2D chapter.

## Defect 2 — guided-flow focus return

Leaving `Most alive moment` initially returned keyboard focus to `BODY`. The screen changed correctly, but keyboard and assistive-technology users lost their place.

Fix:

- Chapter activity buttons and the chapter primary action now expose stable focus-return keys.
- The book remembers the precise control that opened a guided flow.
- Returning to the chapter focuses that remounted control on the next animation frame.

Post-fix browser result:

```text
tag: BUTTON
aria-label: Most alive moment — done
data-compass-flow-trigger: inner_compass.a01
body overflow: hidden
```

Evidence:

- `inner-compass-fragment-modal.png` — centered guided-flow view.
- `inner-compass-focus-restored.png` — the originating activity has the visible keyboard focus ring after return.

## Gate result

The Inner Compass Chapter II priority slice is readable in both presentation modes, its chart labels do not collide, its guided flow stays viewport-contained, background scrolling remains locked, and focus returns to the initiating activity. The physical-iPhone 3D performance gate is tracked separately and remains open until the paired phone is live and unlocked.
