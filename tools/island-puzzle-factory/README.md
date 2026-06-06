# Island Puzzle Factory

## Purpose

Island Puzzle Factory is a scaffold for producing repeatable 3x3 puzzle assets from one approved, completed master puzzle image.

The factory exists to standardize puzzle production for Island 001 without changing gameplay, Island Run economy, schema, telemetry, runtime state, or existing puzzle assets.

## Cloud-First Workflow

This project is cloud-first:

- GitHub `main` is the source of truth.
- Cloud Codex/Copilot pull requests are the normal workflow.
- Local work is temporary unless it is committed, pushed, reviewed, merged, and then reflected back from GitHub `main`.
- Do not treat unmerged local output as durable production state.

The expected workflow is:

1. Approve a completed master puzzle image.
2. Add or update a factory config for the puzzle slug.
3. Run the future factory script from a PR branch.
4. Review the generated manifest and reassembly check.
5. Merge only if the generated pieces exactly reassemble to the approved master geometry.

## V1 Production Pipeline

V1 will produce assets from a single completed master image:

1. Read the approved master image.
2. Divide the master into a 3x3 grid.
3. Generate nine full-canvas transparent overlay PNG pieces.
4. Emit a manifest describing the source image, grid, output paths, and checks.
5. Emit a reassembly check image proving that all nine overlays reconstruct the master.
6. Fail the run if geometry, canvas size, ordering, or reassembly differs from the approved master.

The slicing script is intentionally not included yet.

## Expected Input Master Image

The source master image must be the final approved completed puzzle artwork. It is the geometry authority for the generated pieces.

Requirements:

- One completed puzzle image per puzzle slug.
- Stable pixel dimensions before production.
- No geometry edits after master approval.
- Any required art changes must create a new approved master before pieces are regenerated.

## Full-Canvas Transparent Overlay Strategy

V1 puzzle pieces must be full-canvas transparent overlays.

Each generated piece has the same pixel width and height as the master image. Only that piece's collected 3x3 cell area is visible; every other pixel is transparent.

This lets the runtime render every collected piece with the same placement:

- `x = 0`
- `y = 0`
- `width = 100%`
- `height = 100%`

No manual per-piece positioning should be required in the app.

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
    reassembly-check.png
```

Do not overwrite existing files in `public/assets/puzzle`.

## Naming Convention

Pieces are numbered `01` through `09` from top-left to bottom-right:

```text
01 02 03
04 05 06
07 08 09
```

Each piece filename should be the two-digit piece number plus `.png`.

## Quality Gates

Every production run must pass these gates before assets are accepted:

- Generate a manifest.
- Generate a reassembly check.
- Confirm all piece canvases exactly match the master canvas size.
- Confirm visible piece regions match the approved 3x3 grid.
- Confirm transparent regions contain no stray pixels.
- Confirm the reassembled pieces exactly match the approved master.
- Fail on any geometry mismatch.
- Fail rather than overwrite existing `public/assets/puzzle` files.

## No Gameplay Changes

Island Puzzle Factory is an asset-production scaffold only.

Do not change gameplay, Island Run economy, database schema, telemetry, runtime state, canonical gameplay services, or existing puzzle assets as part of this workflow.
