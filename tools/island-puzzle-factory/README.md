# Island Puzzle Factory

## Purpose

Island Puzzle Factory produces repeatable 3x3 puzzle assets from one approved, completed master puzzle artwork image.

OpenAI ImageGen / the newest OpenAI image model creates the beautiful completed puzzle artwork. The approved master image is the artwork authority; it is not the only geometry authority. The canonical SVG template plus its exported full-canvas masks are the puzzle-piece geometry authority. The SVG/mask system does not create the artwork and does not replace ImageGen; it only supplies deterministic cutting geometry so pieces fit exactly.

The factory exists to standardize puzzle production for Island 001 without changing gameplay, Island Run economy, schema, telemetry, runtime state, or existing puzzle assets. It deterministically cuts the approved master artwork using the approved masks, exports pieces, and produces QC evidence.

## Cloud-First Workflow

This project is cloud-first:

- GitHub `main` is the source of truth.
- Cloud Codex/Copilot pull requests are the normal workflow.
- Local work is temporary unless it is committed, pushed, reviewed, merged, and then reflected back from GitHub `main`.
- Do not treat unmerged local output as durable production state.

The scalable production workflow is:

1. Generate completed puzzle artwork with ImageGen / the newest OpenAI image model.
2. Approve the master artwork as the artwork authority.
3. Use approved canonical SVG/masks as the fixed puzzle geometry authority.
4. Run the `PRODUCTION_EXACT_JIGSAW` factory from a PR branch.
5. Review `manifest.json`, `qc_report.md`, and `qa/reassembled_check.png`.
6. Only then promote approved generated assets in a future explicit runtime asset PR.

## Modes

### `V1_RECTANGLE_PLACEHOLDER`

`V1_RECTANGLE_PLACEHOLDER` is a deterministic smoke-test mode only.

It divides the master artwork into a 3x3 rectangle grid and creates nine full-canvas transparent overlays from those rectangle cells. This mode is useful for validating paths, manifests, output structure, and basic reassembly checks, but it is **not production-ready for real jigsaw fit** because it does not use exact jigsaw-piece geometry. Do not promote placeholder output as production puzzle assets.

### `PRODUCTION_EXACT_JIGSAW`

`PRODUCTION_EXACT_JIGSAW` is the only production-acceptable mode for real jigsaw fit.

In this mode, the source of truth for piece geometry is the approved canonical SVG template and its exported set of nine explicit full-canvas mask PNG files. The approved master image remains the artwork authority. The factory does not generate artwork, replace ImageGen, infer geometry, resize, crop, or AI-create masks in production mode; it cuts the approved ImageGen-created master artwork using the approved masks. If masks are missing, are the wrong size, overlap, or leave uncovered non-transparent master pixels, QC fails.

## Production Mask Requirements

Provide exactly these nine PNG masks in `masksDir`:

```text
mask_01_top_left.png
mask_02_top_center.png
mask_03_top_right.png
mask_04_middle_left.png
mask_05_middle_center.png
mask_06_middle_right.png
mask_07_bottom_left.png
mask_08_bottom_center.png
mask_09_bottom_right.png
```

Each mask must follow these rules:

- The mask canvas must exactly match the master image width and height.
- White/opaque pixels are visible for that piece.
- Black or transparent pixels are hidden for that piece.
- Masks must already be aligned to the master canvas.
- Masks are never silently resized by production mode.
- Masks are never generated from the master artwork in production mode; they are exported from the approved canonical SVG geometry.
- Across all nine masks, every non-transparent master pixel must be covered exactly once.
- Any overlap or gap causes QC failure.


## Canonical SVG Template And Mask Export

The canonical SVG template is the source of truth for puzzle-piece geometry. The approved master image remains the source of truth for artwork. The SVG-to-mask exporter does not use AI generation, does not create artwork, and does not reinterpret the approved master image; it deterministically renders the approved SVG geometry into the nine full-canvas PNG masks required by `PRODUCTION_EXACT_JIGSAW`.

A valid v1 canonical SVG template must:

- Define the final mask canvas with the SVG `viewBox`.
- Contain exactly nine piece elements or layers.
- Use these exact piece ids:
  - `piece_01_top_left`
  - `piece_02_top_center`
  - `piece_03_top_right`
  - `piece_04_middle_left`
  - `piece_05_middle_center`
  - `piece_06_middle_right`
  - `piece_07_bottom_left`
  - `piece_08_bottom_center`
  - `piece_09_bottom_right`
- Partition the approved puzzle area exactly once, with no overlapping piece pixels and no uncovered pixels.
- For non-rectangular production boards, include a named coverage silhouette so mask export QC can prove the nine pieces partition that approved silhouette exactly once.
- Avoid transforms on unnamed ancestor layers; put final geometry on the identified piece element/layer so export does not depend on editor-only structure.

The committed example template is smoke-test geometry only:

```text
tools/island-puzzle-factory/templates/canonical-3x3-jigsaw-template.example.svg
```

The committed production geometry template is:

```text
tools/island-puzzle-factory/templates/canonical-3x3-jigsaw-template.production.svg
```

Export production masks from it with:

```sh
node tools/island-puzzle-factory/src/svg-to-masks.mjs --config tools/island-puzzle-factory/config/svg-mask-export.production.json
```

The production template uses a 900x900 full-canvas, pixel-locked 3x3 jigsaw layout with a soft rounded `puzzle_silhouette` coverage element. The exported masks must pass exact single-coverage QC for that approved puzzle silhouette. Use approved ImageGen-created master artwork at the same 900x900 canvas size, with transparency outside the approved rounded silhouette, then point a `PRODUCTION_EXACT_JIGSAW` factory config at the exported masks directory.

Export masks from an approved SVG template with:

```sh
node tools/island-puzzle-factory/src/svg-to-masks.mjs --config tools/island-puzzle-factory/config/svg-mask-export.example.json
```

The export config supports:

- `inputSvg`: canonical SVG template path.
- `outputMasksDir`: destination for exported masks and `mask_export_report.md`; it must stay under `tools/island-puzzle-factory/output/` or `tools/island-puzzle-factory/tmp/`.
- `canvas.width` and `canvas.height`: optional explicit canvas dimensions; when provided, they must match the SVG `viewBox` width and height so pieces are never silently resized.
- `expectedPieces`: must be `9` for v1.
- `puzzleId` and `templateId`: report identifiers for review and traceability.
- `coverageElementId`: optional named silhouette element for non-rectangular templates; production uses `puzzle_silhouette`.

The exporter writes exactly these mask files and a `mask_export_report.md` into `outputMasksDir`. It binarizes rendered masks so white/opaque pixels are visible piece area and transparent pixels are hidden area, then runs mask QC to confirm shared canvas size, binary alpha, no overlaps, and full-canvas coverage.

Run the SVG exporter smoke test with:

```sh
cd tools/island-puzzle-factory && npm run smoke:svg
```

The smoke test exports masks from the example SVG, creates a deterministic synthetic master image, runs `PRODUCTION_EXACT_JIGSAW` with those masks, and requires factory QC PASS.

## Running Production After Masks Exist

After a real visual jigsaw SVG template has been approved and exported:

1. Put the approved completed master artwork path in the factory config as `inputMaster`.
2. Point `masksDir` at the reviewed exported mask directory.
3. Set `mode` and `expectedMode` to `PRODUCTION_EXACT_JIGSAW`.
4. Keep `outputRoot` under `tools/island-puzzle-factory/output/` for this tooling stage.
5. Run:

```sh
node tools/island-puzzle-factory/src/cli.mjs --config tools/island-puzzle-factory/config/island-001.example.json
```

Review the SVG `mask_export_report.md`, factory `manifest.json`, factory `qc_report.md`, and `qa/reassembled_check.png` before any future explicit runtime asset PR promotes generated output.

This makes future island puzzle production scalable because each new puzzle can reuse the same deterministic cutter/exporter/QC flow: ImageGen/newest OpenAI image model creates the artwork, humans approve the master artwork and canonical SVG geometry, the exporter creates exact masks, and the production factory cuts full-canvas overlay pieces with repeatable QC evidence.

## Local Tooling Commands

Run from the repository root after placing an approved ImageGen-created master artwork image and, for production mode, approved masks exported from the canonical SVG template at the paths in the config:

```sh
node tools/island-puzzle-factory/src/cli.mjs --config tools/island-puzzle-factory/config/island-001.example.json
```

Run deterministic smoke validation for both supported modes:

```sh
cd tools/island-puzzle-factory && npm run smoke
```

The smoke command creates synthetic master/mask fixtures under `tools/island-puzzle-factory/tmp/` and generated output under `tools/island-puzzle-factory/output/`. Both directories are local scratch space and are gitignored.

For this tooling stage, configs must write only to `tools/island-puzzle-factory/output/`. Do not point `outputRoot` at `public/assets/puzzle` until a future runtime-asset PR explicitly approves that move.

The config supports:

- `mode`: `V1_RECTANGLE_PLACEHOLDER` or `PRODUCTION_EXACT_JIGSAW`.
- `expectedMode`: optional guard; when present, it must match `mode`.
- `masksDir`: required for `PRODUCTION_EXACT_JIGSAW`; ignored by placeholder mode.
- `inputMaster`
- `outputRoot`
- `islandNumber`
- `puzzleId`
- `grid.rows` and `grid.columns` (v1 requires `3` and `3`).
- `placementMode: "full_canvas_overlay"`
- `outputFormat: "png"` or `"webp"`

## Expected Input Master Image

The source master image must be the final approved completed puzzle artwork generated with ImageGen / the newest OpenAI image model. It is the artwork authority for the generated pieces, while the approved canonical SVG template and exported production masks are the piece-geometry authority. SVG/masks do not create the artwork and do not replace ImageGen.

Requirements:

- One completed puzzle image per puzzle slug.
- Stable pixel dimensions before production.
- No artwork edits after master artwork approval.
- No geometry edits after canonical SVG/mask approval.
- Any required art change must create a new approved master artwork before pieces are regenerated.
- Any required geometry change must create a new approved canonical SVG/mask set before pieces are regenerated.

## Full-Canvas Transparent Overlay Strategy

Every generated piece is a full-canvas transparent overlay with the same pixel width and height as the master image. Only the collected piece area is visible; every other pixel is transparent.

This avoids manual per-piece positioning because every piece is already aligned to the master canvas. The runtime should not need to know each jigsaw shape's local bounding box or x/y offset.

The later app rendering model is:

1. Render an empty board layer.
2. Render each collected piece overlay at the same origin:
   - `x = 0`
   - `y = 0`
   - `width = 100%`
   - `height = 100%`
3. Stack all collected overlays above the empty board layer.

No per-piece manual positioning should be required in the app.

## Output Structure

Future generated runtime output belongs under:

```text
public/assets/puzzle/island_001/<puzzle_slug>/
  manifest.json
  pieces/
    01.png
    02.png
    03.png
    04.png
    05.png
    06.png
    07.png
    08.png
    09.png
  qa/
    reassembled_check.png
```

Do not overwrite existing files in `public/assets/puzzle`. Current factory runs are intentionally constrained to `tools/island-puzzle-factory/output/`.

## Naming Convention

Pieces are numbered `01` through `09` from top-left to bottom-right:

```text
01 02 03
04 05 06
07 08 09
```

Each piece filename is the two-digit piece number plus the configured output extension.

## Quality Gates

Every production run must pass these gates before assets are accepted:

- Generate a manifest.
- Generate a QC report.
- Generate a reassembly check by stacking all nine full-canvas overlays at `x=0`, `y=0`.
- Confirm all piece canvases exactly match the master canvas size.
- Confirm every production mask exists and exactly matches the master canvas size.
- Confirm every production mask has visible pixels.
- Confirm production masks do not overlap.
- Confirm production masks do not leave gaps over non-transparent master pixels.
- Confirm the reassembled pieces exactly match the masked master area.
- Fail rather than overwrite existing `public/assets/puzzle` files.

## No Gameplay Changes

Island Puzzle Factory is an asset-production scaffold only.

Do not change gameplay, Island Run economy, database schema, telemetry, runtime state, canonical gameplay services, roll logic, reward logic, or existing puzzle assets as part of this workflow.
