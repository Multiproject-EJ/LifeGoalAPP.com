# Island Art Factory

This folder contains machine-readable production briefs. The first five briefs are the pilot set for the future 120-island art workflow.

## Workflow

1. Read `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`.
2. Select one brief from `briefs/island-NNN.json`.
3. Generate or edit one asset family at a time: scene, board plate, one landmark progression, boss states, then scenery.
4. Composite every selected asset with a current 390×844 portrait screenshot of the real `spark36_ring` UI in its opening overview.
5. Keep versioned masters in the external source library using the brief's `sourceNamingExample` pattern.
6. Export only approved optimized assets to the brief's `runtimeRoot` with stable filenames.
7. Update `island-art.json` only after the actual export exists.
8. Run `npm run check:island-visual-production`, `npm run check:island-art-assets`, and `npm run check:island-art-render-wiring`.

## Shared generation scaffold

Use case: `stylized-concept` for new assets or `compositing` for board-fit previews.

- Asset type: polished mobile game island layer
- Style: stylized 3D, clean premium mobile-game render, readable at phone scale
- Camera: orthographic three-quarter view matching a 47° board plane, north receding upward
- Composition: preserve the 1000×1000 playable board inside the 1400×1600 scene; keep the live tile corridor clear; fit the complete route between the phone HUD and controller
- Lighting: upper-left/front-left key light with island-specific atmosphere
- Constraints: no text, no logo, no watermark, no HUD, no token, no fake tiles, no continuous backing ring, no tile icons
- Identity inputs: use the selected brief's `identity`, `palette`, `materials`, `motifs`, and `restorationChange`

For a board-fit preview, label the inputs explicitly:

- Image 1: edit target — current board screenshot; all UI and the exact 36 tiles are invariants
- Image 2: composition/style reference — never copy its painted board tiles over Image 1

For a runtime landmark review, open the dev PWA with
`/dev/island-art-preview?phonePreview=1&islandVisualPreview=1&islandVisualIsland={1..120}&islandVisualLandmark={hatchery|habit|mystery|wisdom|all}&islandVisualBuildLevel={0|1|2|3}&islandVisualBossState={idle|defeated|hidden}`.
The override is presentation-only: it selects art layers without mutating gameplay or persisted build state.

The 36 live tiles must form one seamless connected circular route while every tile remains an individually readable 3D block through fine seams, visible side walls, shared physical thickness, and one perspective-correct lighting model. Do not add a separate backing ring beneath them. The board caretaker must use its premium 3D cutout and stand behind the start edge on a grounded footplate; never use the retro sprite in approval composites.

Inner board circles and outer island-circle plates are ground-plane art. Render
them through the exact live tile-plane camera, never through an independent CSS
tilt. For source art with baked perspective, measure its circular outline and
set `boardPlateImageVerticalScale` or `boardOuterCircleImageVerticalScale` to
restore a true circle before the live transform. This keeps every concentric
shape symmetric at all phone sizes and camera zooms.

For an island background to pass, capture and review both progression endpoints:
an L0 phone view with empty landmark plots and hidden boss, and an L3 phone view
with all landmarks fully built and the boss visible. Island 001's recorded example
and reusable gate live in `concepts/island-001/`.

## Pilot deliverable order

Use this order to catch expensive composition mistakes early:

1. one integrated board-fit preview
2. ambient background
3. center boss arena and boss states
4. board plate / larger island circle beneath the real route
5. four persistent landmark terrain plots (visual L0 foundations)
6. middle terrain/scenery fill if the island still reads too thin
7. all four landmark L1→L3 progressions
8. responsive runtime screenshots and final adjustment pass

After each added runtime image, inspect the actual 390×844 PWA composition and adjust before continuing. Do not start the full island set until its integrated preview is selected.
