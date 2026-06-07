# Island Puzzle Factory Agent Rules

## Cloud-First Source Of Truth

- GitHub `main` is the source of truth.
- Cloud Codex/Copilot pull requests are the normal workflow.
- Local work is temporary only unless committed, pushed, reviewed, merged, and reflected back from GitHub `main`.
- Do not treat unmerged local files or generated output as durable production state.

## Artwork And Geometry Authority

- OpenAI ImageGen / the newest OpenAI image model creates the completed puzzle artwork.
- The approved source master image is the artwork authority for generated pieces.
- The SVG/mask system does not create artwork and does not replace ImageGen; it only provides deterministic cutting geometry so pieces fit exactly.
- The approved canonical SVG template and exported full-canvas masks are the puzzle-piece geometry authority.
- Never invent new puzzle geometry after canonical SVG/mask approval.
- Do not resize, crop, pad, offset, or reinterpret puzzle geometry unless a new canonical SVG/mask set has been approved.
- Any geometry mismatch is FAIL.

## Production Requirements

- Puzzle pieces must be full-canvas transparent overlays for v1.
- Each piece must share the exact same canvas size as the master image.
- Only the collected piece area may be visible; all other pixels must be transparent.
- Piece numbering must be `01` through `09`, top-left to bottom-right.
- Every run must create a manifest.
- Every run must create a reassembly check.
- `PRODUCTION_EXACT_JIGSAW` is the only production-acceptable mode for real jigsaw fit.
- `V1_RECTANGLE_PLACEHOLDER` is smoke-test only and must never be promoted as production puzzle geometry.

## Boundaries

- Do not touch gameplay.
- Do not touch Island Run economy.
- Do not touch schema or migrations.
- Do not touch telemetry.
- Do not touch runtime state.
- Do not overwrite existing `public/assets/puzzle` files.
- Do not move, delete, or regenerate existing puzzle assets unless explicitly requested in a future PR.
