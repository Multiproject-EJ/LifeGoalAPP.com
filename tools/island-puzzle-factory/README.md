# Island Puzzle Factory

## Purpose

Island Puzzle Factory produces repeatable 3x3 puzzle assets from one approved, completed master puzzle image.

The factory exists to standardize puzzle production for Island 001 without changing gameplay, Island Run economy, schema, telemetry, runtime state, or existing puzzle assets.

## Cloud-First Workflow

This project is cloud-first:

- GitHub `main` is the source of truth.
- Cloud Codex/Copilot pull requests are the normal workflow.
- Local work is temporary unless it is committed, pushed, reviewed, merged, and then reflected back from GitHub `main`.
- Do not treat unmerged local output as durable production state.

The expected workflow is:

1. Approve a completed master puzzle image.
2. Approve nine full-canvas production masks for that exact master canvas.
3. Add or update a factory config for the puzzle slug.
4. Run the factory script from a PR branch.
5. Review the generated manifest, QC report, and reassembly check.
6. Merge only if QC passes and the generated pieces exactly reassemble to the approved masked master geometry.

## Modes

### `V1_RECTANGLE_PLACEHOLDER`

`V1_RECTANGLE_PLACEHOLDER` is a deterministic smoke-test mode only.

It divides the master into a 3x3 rectangle grid and creates nine full-canvas transparent overlays from those rectangle cells. This mode is useful for validating paths, manifests, output structure, and basic reassembly checks, but it is **not production-ready for real jigsaw fit** because it does not use exact jigsaw-piece geometry.

### `PRODUCTION_EXACT_JIGSAW`

`PRODUCTION_EXACT_JIGSAW` is the production mode for real puzzle pieces.

In this mode, the source of truth for piece geometry is a set of nine explicit full-canvas mask PNG files. The factory does not generate, infer, resize, crop, or AI-create masks in production mode. If masks are missing, are the wrong size, overlap, or leave uncovered non-transparent master pixels, QC fails.

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
- Masks are never generated from the master in production mode.
- Across all nine masks, every non-transparent master pixel must be covered exactly once.
- Any overlap or gap causes QC failure.

## Local Tooling Commands

Run from the repository root after placing an approved master image and, for production mode, approved masks at the paths in the config:

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

The source master image must be the final approved completed puzzle artwork. It is the art authority for the generated pieces, while production masks are the piece-geometry authority.

Requirements:

- One completed puzzle image per puzzle slug.
- Stable pixel dimensions before production.
- No geometry edits after master and mask approval.
- Any required art or geometry change must create a new approved master/mask set before pieces are regenerated.

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
