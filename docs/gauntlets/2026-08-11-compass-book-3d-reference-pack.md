# Compass Book 3D Reference and Implementation Gauntlet

## Status

Four-image final-look reference pack complete and awaiting visual approval.
No production Compass Book UI has been replaced during this stage.

## Product truth to preserve

- The Book contains The Reading, six chapters of twenty island fragments, and
  the Quest Ledger.
- The four kind illumination signals are **Know**, **Choose**, **Act**, and
  **Sustain**. Their 0-4 values measure clarity/completion, never human worth.
- Existing answers, chapter states, source references, accessibility semantics,
  Supabase/local persistence, and Island unlock logic remain authoritative.
- Readable content and controls must remain real DOM, not text baked into a
  WebGL texture.

## Recommended form: a hybrid living book

The 3D layer owns the physical object: cover, spine, page block, page curl,
gilded corners, compass mechanism, light, shadow, and page-turn depth. The
existing React Compass Book owns page typography, answer controls, focus,
scrolling, screen-reader structure, and persistence. Page content is composed
over calibrated page planes so it looks printed on the object without becoming
unreadable or inaccessible.

This gives the premium tactile result while avoiding the largest risks of an
all-WebGL UI: blurry text, difficult keyboard/screen-reader support, oversized
textures, duplicated state, and fragile hit testing.

## Final-look reference pack

### 01 — Closed cover and opening pose

- Phone portrait, three-quarter top view.
- Deep midnight-indigo leather, warm ivory page edges, aged gold hardware.
- A real raised four-signal compass mechanism at the center.
- Six chapter tabs and one Quest Ledger tab visible along the fore-edge.
- Establishes silhouette, materials, spine construction, scale, and opening
  camera.

### 02 — The Reading spread

- The main everyday view after opening.
- Left page: four-signal illumination compass with five restrained states per
  direction (0-4), labels Know / Choose / Act / Sustain, and kind wording such
  as “Open potential” and “Strong signal.”
- Right page: current focus, fragments written, chapters sealed, islands
  travelled, and concise “what you know so far” summaries.
- Establishes page margins, DOM-safe zones, tabs, and the camera used for
  reading and tapping.

### 03 — Chapter relief and answer mode

- Open Chapter I / Living Wheel example.
- A restrained 3D relief/diorama rises from the upper page while the lower page
  remains a crisp interactive answer surface.
- Shows how an unlocked stage grows from Reveal to Direction without turning
  every question into a slow cinematic.

### 04 — Page turn and Quest Ledger

- Oblique side view during a page turn.
- Proves page thickness, shadow, tab attachment, and safe transition to the
  existing Quest Ledger.
- Generated only after references 01-03 establish the approved object.

The completed references are stored in
`docs/gauntlets/evidence/compass-book-3d-reference-v1/` as optimized JPEGs.

## Interaction contract

- Opening: 650-900 ms cover swing; tap skips; reduced motion cuts directly to
  the readable spread.
- Page turn: 420-620 ms depending on distance; no input loss and no state write.
- Illumination: selection lights the relevant compass direction in under 300 ms.
- The Reading opens first. Chapter tabs remain direct navigation, not a forced
  cinematic.
- 3D decoration never covers answer fields, CTA buttons, close/back controls,
  or the fore-edge tab rail.

## Quality tiers

- Low: static 3D cover/page block, baked-style lighting, simple page turn, no
  particle dust, DOM content unchanged.
- Medium: dynamic page curl, compass rotation/light, contact shadows.
- High: richer leather/paper response, gilded detail, subtle page-edge depth,
  chapter relief, restrained dust motes.
- If WebGL is unavailable, the existing flat book is the exact functional
  fallback.

## Implementation slices after visual approval

1. Build an isolated `CompassBookThreeLab` with the closed cover and Reading
   spread only.
2. Calibrate a phone camera and DOM page-plane layout against reference 02.
3. Connect the existing `CompassBookScreen` view/page-turn state read-only.
4. Add quality tiers, reduced motion, resize/orientation, and fallback.
5. Add Chapter I relief as the first reusable chapter-graphic contract.
6. Run accessibility, touch, performance, persistence, and live-shell gates.

## Stop conditions

- The book makes content harder to read or answer.
- The 3D layer becomes a second source of Compass state.
- A page turn can swallow input or block close/back navigation.
- High sustains below 50 FPS or Low below 55 FPS on the iPhone proof.
