# Island Puzzle Factory Production Jigsaw Mask Workflow Investigation

Date: 2026-06-06

## Scope

Investigate how to create the nine full-canvas mask PNGs required by `PRODUCTION_EXACT_JIGSAW` for the approved completed puzzle image.

This investigation is intentionally limited to workflow and source-file planning. It does not change gameplay code, does not write runtime assets, and does not touch `public/assets/puzzle`.

## Existing factory contract

The current factory already treats `PRODUCTION_EXACT_JIGSAW` masks as explicit production inputs. In this mode, the factory does not infer, resize, crop, or generate masks. Missing masks, wrong-size masks, overlap, or uncovered visible master pixels fail QC.

The required mask names are:

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

Each mask must match the master canvas exactly. Opaque/white pixels select the piece; black/transparent pixels hide all other pixels. Across the nine masks, each visible master pixel must be covered exactly once.

## Options investigated

### 1. Manual mask creation in an image editor

**Workflow:** Open the approved master canvas in Photoshop, Affinity Photo, Photopea, or GIMP; draw nine jigsaw-shaped selections by hand; export one full-canvas black/white or alpha PNG per piece.

**Strengths**

- Fastest path if an artist already owns the approved look.
- Allows hand-tuned rounded outer shape and organic tabs/holes.
- No code required before first production attempt.

**Risks**

- Highest chance of tiny overlaps, antialias seams, off-by-one pixels, hidden gaps, or accidental canvas-size drift.
- Hard to regenerate exactly if the master changes.
- Hard to audit source-of-truth geometry because the real source may be editor layer state, not a deterministic file.
- Human export mistakes are likely unless the factory QC is run after every export.

**Verdict:** Acceptable only as an emergency prototype path. Not the safest v1 production path.

### 2. Semi-automated extraction from an empty board image

**Workflow:** Create or obtain an empty board image where the nine piece regions are visually separated, then use thresholding/flood-fill/connected-components to extract each piece silhouette as a full-canvas mask.

**Strengths**

- Can work if there is already a high-quality empty board render that perfectly matches the approved completed puzzle geometry.
- Potentially faster than hand-exporting nine masks.
- Can automate validation and connected-component extraction.

**Risks**

- Extraction quality depends on raster colors, antialiasing, shadows, borders, compression, and layer effects.
- If the empty board is only a visual guide, it becomes an indirect geometry authority and may not exactly match the completed master.
- Thresholding can create accidental gaps or overlaps along antialiased seams.
- Debugging failures can become image-processing work rather than controlled geometry work.

**Verdict:** Useful as a QA visualization aid, but not the safest geometry source for v1 masks.

### 3. SVG/vector canonical puzzle template converted into masks

**Workflow:** Author one canonical vector template at the exact master canvas size. The template contains nine closed paths, one per piece, with a rounded outer silhouette and complementary jigsaw tabs/holes. Export/rasterize each path to the required full-canvas PNG mask names. The factory then consumes those PNGs in `PRODUCTION_EXACT_JIGSAW`.

**Strengths**

- Best balance of safety, reviewability, and production control for v1.
- Human-readable source geometry can be reviewed in a PR before PNG masks are generated.
- Shared internal edges can be defined once and reused by adjacent pieces, reducing mismatch risk.
- Rasterization can be scripted, deterministic, and pinned to the exact master dimensions.
- Still gives art direction control over rounded outside corners and jigsaw tab/hole style.

**Risks**

- Requires a small template authoring and export tool before final masks are produced.
- SVG path winding/fill rules must be handled carefully for holes and complementary edges.
- Antialiasing policy must be deliberate; for exact no-gap/no-overlap QC, the export should include a deterministic ownership rule for boundary pixels.

**Verdict:** Safest v1 path. Use vector as canonical source, script the raster mask export, and rely on existing factory QC to prove the masks fit the master canvas.

### 4. Fully scripted deterministic jigsaw geometry

**Workflow:** Generate all nine piece polygons/paths from parameters: rows, columns, tab radius, tab depth, neck width, jitter seed, outer corner radius, and canvas dimensions. Rasterize masks directly from generated geometry.

**Strengths**

- Fully repeatable and scalable beyond the first puzzle.
- No manual geometry editing required once the generator is approved.
- Can enforce complementary tab/hole edges in code.

**Risks**

- More engineering upfront than needed for one approved 3x3 puzzle.
- Generated shapes may look too mechanical unless tuned.
- Geometry bugs are harder to spot because there is no artist-approved canonical template unless the generated SVG is separately reviewed and approved.
- It can accidentally become a second geometry authority if generated masks are edited later.

**Verdict:** Good future direction, but overbuilt for v1 unless many puzzles are imminent.

## Recommended v1 workflow

Use **Option 3: SVG/vector canonical puzzle template converted into masks**, with deterministic export and QC.

The canonical source should be a single SVG template committed under the factory input/source area, not under runtime assets. The generated PNG masks should remain factory inputs for the production run and should not be placed in `public/assets/puzzle` until a later runtime-asset PR explicitly approves that move.

### Recommended source files

For the first production puzzle slug, use this source layout:

```text
tools/island-puzzle-factory/input/island_001/<puzzle_slug>/
  master.png
  geometry/
    jigsaw_template.svg
    jigsaw_template.metadata.json
  masks/
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

Add a config for the real puzzle slug:

```text
tools/island-puzzle-factory/config/island-001.<puzzle_slug>.json
```

For source-only review artifacts generated by the mask exporter, use:

```text
tools/island-puzzle-factory/output/island_001/<puzzle_slug>/qa/
  mask_contact_sheet.png
  mask_coverage_debug.png
```

Do not write these files to `public/assets/puzzle` in the mask-creation PR.

### Exact naming

Mask filenames must remain exactly:

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

The numbering is row-major: `01 02 03 / 04 05 06 / 07 08 09`.

### SVG template rules

The SVG template should:

1. Use `width`, `height`, and `viewBox` equal to the approved `master.png` dimensions.
2. Contain one top-level group for the final piece paths, for example `id="piece-masks"`.
3. Contain exactly nine closed paths with IDs matching the piece IDs:
   - `piece_01_top_left`
   - `piece_02_top_center`
   - `piece_03_top_right`
   - `piece_04_middle_left`
   - `piece_05_middle_center`
   - `piece_06_middle_right`
   - `piece_07_bottom_left`
   - `piece_08_bottom_center`
   - `piece_09_bottom_right`
4. Use a rounded outer silhouette.
5. Use complementary jigsaw tabs/holes on shared internal edges.
6. Avoid strokes as mask geometry; fill paths are the source of truth.
7. Keep guide layers separate from production paths.

### Export workflow

1. Verify the approved master dimensions.
2. Author or update `geometry/jigsaw_template.svg` at those exact dimensions.
3. Run a deterministic exporter that rasterizes each SVG path into one full-canvas PNG mask.
4. Run a mask QA script before the full factory:
   - all expected files exist,
   - all masks match master dimensions,
   - each mask has visible pixels,
   - no pixel is assigned to more than one piece,
   - all visible master pixels are assigned to a piece,
   - optional contact sheet/debug coverage image is written under factory `output/` only.
5. Run `PRODUCTION_EXACT_JIGSAW` factory mode.
6. Review `manifest.json`, `qc_report.md`, and `qa/reassembled_check.png` from the factory output.

## Can this be fully automated?

Yes, but there are two levels of automation:

- **Safe v1 automation:** automate raster export and QA from an approved SVG template. This is recommended now.
- **Full geometry automation:** generate the SVG/template paths from deterministic jigsaw parameters. This is possible, but should be a later step after v1 proves the visual style and QA gates.

For v1, Codex should not attempt to infer masks from the completed artwork. The approved master image is the art authority, and the approved SVG template should be the geometry authority. The PNG masks are deterministic build artifacts consumed by the existing factory.

## What Codex should build next

1. Add a small SVG-to-mask exporter under the factory tooling, for example:

   ```text
   tools/island-puzzle-factory/scripts/export-svg-masks.mjs
   ```

   The script should accept:

   ```sh
   node tools/island-puzzle-factory/scripts/export-svg-masks.mjs \
     --master tools/island-puzzle-factory/input/island_001/<puzzle_slug>/master.png \
     --template tools/island-puzzle-factory/input/island_001/<puzzle_slug>/geometry/jigsaw_template.svg \
     --out tools/island-puzzle-factory/input/island_001/<puzzle_slug>/masks
   ```

2. Add source-level mask validation, either inside the exporter or as a separate script:

   ```text
   tools/island-puzzle-factory/scripts/validate-masks.mjs
   ```

3. Add a real production config template:

   ```text
   tools/island-puzzle-factory/config/island-001.<puzzle_slug>.json
   ```

   It should use:

   ```json
   {
     "mode": "PRODUCTION_EXACT_JIGSAW",
     "expectedMode": "PRODUCTION_EXACT_JIGSAW",
     "placementMode": "full_canvas_overlay",
     "outputFormat": "png"
   }
   ```

4. Add a reviewed `jigsaw_template.svg` and metadata file only after the approved master dimensions are final.
5. Generate the nine masks into the factory input `masks/` directory, run the factory, and commit only reviewed source inputs/configs plus approved generated factory-output artifacts when the follow-up PR explicitly requests production asset generation.

## Recommended decision

Proceed with a **canonical SVG template plus deterministic PNG mask export** for v1.

Do not use manual-only masks as the production source of truth. Do not use empty-board extraction as the geometry authority. Defer fully scripted jigsaw geometry generation until after one production puzzle proves the template, exporter, and QC workflow.
