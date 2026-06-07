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
