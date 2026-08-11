# Compass Book 3D Reference and Implementation Gauntlet

## Status

Four-image final-look reference pack approved. Eivind rated the first
hybrid-3D vertical slice at 4/10, so it was rejected as a finished visual and
rebuilt through a second evidence-backed img2threejs pass. The v2 lab is
locally verified; no production Compass Book UI has been replaced during this
stage.

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
   spread only. **Approved by Eivind and in active implementation on
   2026-08-11.**
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

## Vertical-slice checkpoint — 2026-08-11

Implemented an isolated `compass-book-3d-lab.html` with:

- a procedural Three.js leather cover, spine, page block, gilded hardware,
  raised cover compass, chapter tabs, and illuminated Reading compass;
- a skippable closed-cover to open-spread transition;
- real DOM Reading content, controls, headings, progress values, and page
  navigation layered over the physical book;
- a phone-specific readable focus: the book stays open while the camera/view
  glides between the Signals page and Summary page instead of shrinking both
  pages until the type becomes unreadable;
- High/Low quality tiers, reduced-motion behavior, and a CSS/DOM-readable
  fallback if WebGL fails.

Evidence is stored in
`docs/gauntlets/evidence/compass-book-3d-lab-v1/`.

QA record:

- 390x844 closed cover, Signals page, and Summary page proofs captured.
- High: 60 FPS, 100 render calls, approximately 10.6k rendered triangles.
- Low: 60 FPS, 40 render calls, approximately 2.3k rendered triangles.
- Reduced motion removes page-entry animation and resolves directly to the
  requested pose.
- No console errors.
- TypeScript, Compass Book tests, production Vite build, architecture guard,
  and `git diff --check` are required before checkpoint commit.

Next integration slice after visual approval: place this shell around the real
`CompassBookScreen` Reading data read-only, then connect existing page
navigation without moving persistence or answer authority into Three.js.

## Rebuild checkpoint v2 — 2026-08-11

The 4/10 pass failed mainly because it read as a thin decorated panel: the
cover crop, flat compass, shallow binding, sparse surface response, and tightly
cropped open spread did not carry the physical richness of the target. The v2
rebuild changes the object rather than merely relighting it:

- rounded independent front/back leather shells, a cylindrical ribbed spine,
  eighteen High-quality page leaves, warm page-edge variation, and a real
  opening hinge;
- layered gold cover frames, four sculpted corner assemblies, cover studs,
  a compass clasp, bookmark, title relief, and seven colored/lettered tabs;
- a multi-layer compass with shadow disk, dial, three bezels, tick geometry,
  four violet cardinal needles, four gold diagonal needles, smaller secondary
  blades, finials, center bezel, violet cabochon, and glow ring;
- independent procedural leather albedo, height/bump, and roughness response,
  with separate paper, gilt, dark metal, violet enamel, and tab materials;
- a full-spread phone composition first, followed by optional readable focus
  on Signals or Summary, instead of opening directly onto a cropped half-book;
- a darker illuminated Reading compass so the page reads as a jewel-set
  instrument rather than a flat pastel infographic;
- a map-stripped review route plus named runtime parts, six interaction
  sockets, a book collider, and binding/pages/interaction destruction groups.

Evidence is stored in
`docs/gauntlets/evidence/compass-book-3d-lab-v2/`. The closed and open
side-by-side sheets are `07-comparison-closed.jpg` and
`08-comparison-reading.jpg`.

Gauntlet record:

- Eivind's starting assessment: **4/10**.
- Current agent-vision estimate: **0.82 for the blockout/identity pass**. This
  clears the 0.70 pass gate but is not represented as 10/10.
- Strongest current areas: silhouette, physical book volume, compass identity,
  tab rail, and navy/violet/gold palette.
- Remaining mismatch: the target still has denser engraved filigree, sharper
  micro-relief, richer jewel facets, and more convincing printed-page depth.
- Tier-1 deterministic gate: pass; silhouette IoU 0.9943, aspect and scale
  deltas 0.0, symmetry error 0.0081. Color diagnostics are advisory because
  the screenshots are not isolated against a common background.
- Multi-angle gate: no degenerate planar collapse in either orbit proof.
- Assembly gate: 28 of 28 specified parts represented, zero errors, zero
  unnamed meshes. Three inventory naming warnings remain for material aliases
  (`cover-shell`, `paper`, and `gilded-metal`) and do not indicate missing
  geometry.
- Runtime phone proof: High 60 FPS / 543 calls / about 146.5k rendered
  triangles; Low 60 FPS / 134 calls / about 13.1k rendered triangles in the
  local browser proof. Device validation remains required before app
  integration.

The img2threejs state has advanced from blockout to structural-pass. The next
quality pass should spend its budget on the binding relief, cover filigree,
compass jewel facets, and page-to-cover physical alignment—not on adding more
screen content.
