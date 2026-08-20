# Compass Book inner quality Gauntlet

**Priority set by Eivind:** the inner Compass Book is more important than further cover polish.

## Goal-image authority

ImageGen goal images are art-direction contracts, not product data or UI assets:

- `evidence/compass-book-inner-goals-2026-08-20/01-desktop-reading-goal.png`
- `evidence/compass-book-inner-goals-2026-08-20/02-phone-chapter-goal.png`

The real DOM remains authoritative for text, answers, progress, controls, focus, and persistence. Generated words or values must never enter canonical Compass data.

## Baseline assessment

The current implementation is functionally strong but visually split: the procedural left-page compass and the DOM right page read as adjacent layers rather than one open book. On phone, readability is preserved, but the physical-book identity recedes too far after opening.

Ranked issues:

1. **Spread coherence:** align physical left page, spine, DOM right page, and fore-edge tabs as one object.
2. **Inner-page identity:** the left Reading page needs signal geometry and parchment framing around the compass, not a floating mechanism on a largely blank plane.
3. **Wide reading composition:** keep the entire left page visible while giving the DOM page a comfortable readable width.
4. **Phone chapter framing:** retain a single readable page, but make its leather/brass perimeter and tab rail feel physical without putting WebGL behind text.
5. **App chrome:** reduce the visual weight of the top bar and demo controls inside the book.
6. **Page transitions:** preserve direct navigation while making the physical leaf and DOM page turn read as the same event.

## Correction loop

Each loop changes one bounded issue, then captures desktop Reading and phone chapter evidence, critiques against the goal image, and chooses exactly one of `continue`, `refine-code`, `refine-spec`, `request-input`, or `stop`.

### Loop 1 — spread coherence and inner signal structure

- Widen and align the wide-screen physical/DOM page split.
- Add four five-point geometric signal scales around the Reading compass; keep labels and values DOM-owned.
- Add a stronger shared-gutter treatment and reduce wide top-bar weight.

Acceptance: the Reading view reads as one book before fine ornament is considered; no content, persistence, accessibility, or Island Run write path changes.

### Loop 1 review — `refine-code`

Evidence: `07-loop1-inner-3d.jpg`.

The inner spread improved materially: parchment, shared gutter, compass, signal scales, Reading hierarchy, progress summary, direct tabs, and action all read in one frame. The remaining highest-impact defect is exterior relief leaking around the opened left page; it makes the inner compass look doubled.

### Loop 2 — exterior-relief occlusion and phone page framing

- Hide the exterior cover compass and spine medallion once the hinge carries them face-down.
- Keep phone WebGL fully behind the opaque DOM page after opening, while preserving the production 3D cover launch.
- Add a restrained indigo-leather/brass perimeter to the phone parchment page.

Acceptance: no duplicate compass relief around the open spread; phone content remains a single high-contrast, scrollable page with no canvas interference.

### Loop 3 — chapter semantic correctness

- Reading alone uses the current two-page hybrid and its four-signal compass.
- Chapter and Quest Ledger pages hide the Reading relief and use the complete centered DOM page until their own approved physical relief exists.
- The active canonical page ID is exposed only as a presentation attribute; it does not create another state owner.

Acceptance: no chapter can display a visually impressive but semantically wrong Reading compass. Chapter-specific relief production becomes an explicit later slice rather than hidden prototype debt.
