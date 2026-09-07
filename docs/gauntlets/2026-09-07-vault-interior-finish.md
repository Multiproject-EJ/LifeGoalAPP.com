# Vault Interior Finish

Status: Bounded rear gallery/entry improvement accepted for main; whole interior unfinished

Continuation of the approved 18-unit interior contract and the user's 360-degree
extension. The interior is inferred architecture; the exterior source and the
user's two tall floors, visible dome, split stairs and luxury museum remain the
design authority. The previous Vault Rush restoration is the starting commit.

## Current Slice

- Rear atrium gallery: continuous annular stone slab, recessed enamel soffit,
  open gilded balusters and carved newels. Preserve its radius and two levels.
- Rear entrance: recessed blue panels, fine gold mouldings, framed amber
  lanterns, paired columns and a limestone threshold.
- Tour composition: preserve the accepted eye height and lens; align QA presets
  with the actual near-center pivot. Preserve
  complete geometry and unrestricted horizontal rotation.
- Still preview: redraw after resize so orientation changes cannot clear it.

Owned files: Blender interior generator, atrium GLB, interior model asset
reference and lab camera/resize code. No gameplay, exterior, treasure rewards,
casino or saved-state changes.

## Evidence And Gate

Baseline: `../visual-references/island-special-vault-treasure/gauntlet/qa/raw/2026-09-07-interior-finish/before-atrium-rear.png`.
Retain phone cardinal views, desktop survey and unchanged showcase view.
An independent read-only visual review must inspect the images before the
implementation narrative. No clipping, blank surface, intersecting balcony
edge, or lost entrance silhouette may pass. Run the Vault model/lab and
architecture checks and isolated production build before publishing.

The v045 production GLB in the parent commit is the rollback point. Limit this
finish family to one first pass and one bounded correction. Do not claim the
whole Vault is 10/10 on the basis of this slice.

## Results

- Independent reviewer Volta accepts the bounded rear gallery/entry improvement.
  Open balusters expose the crest, the slab edge is continuous, and the door
  panels have visible depth. The reported slab-foot and door-backing gaps were
  corrected before the accepted export.
- Original camera height and 58-degree lens retained after rejecting the
  lower-eye experiment. QA cardinal presets now use that same center and lens.
- Phone cardinal screenshots use `matched-atrium-*.png` in the evidence folder.
  `before-atrium-rear.png` and `matched-atrium-rear.png` share the camera settings.
  The front and resized screenshot exports include browser viewport white space;
  this limits their visual proof and is not treated as full-room approval.
- Interactive orbit ran past 630 frames, all 10 completion batches visible.
  Resize after three still frames redrew successfully at 390x740, with 8/8
  sampled points nonblank. Browser console reported no errors.
- Vault lab/model runtime and Island Run architecture checks passed. Full Vite
  production build passed, followed by an isolated Vault build after the final
  camera restoration. Existing bundle-size warnings remain.
- Original non-completion geometry: 270,960 triangles before and after.
  Completion geometry: 99,492 -> 123,676 triangles. Production GLB:
  19,523,748 -> 21,061,624 bytes. No other room, treasure, or casino asset changed.

Asset SHA-256: `e4d64c58252fb75aa63001c0ab261a50a23cd26376878b66440415fdb4a966cd`.
Blender source: `work/vault-island-interior/blender/vault-atrium-v046.blend`.
Rebuild only the modified shell with `VAULT_INTERIOR_ASSET=atrium-completion`;
the v045 Blender scene supplies the preserved architecture.

## Remaining Quality Work

Full 360-room approval is withheld. The front stair junction remains visually
broken and side elevations have crowded stair/column/ornament overlaps. Some
new horizontal door trim produces overly white highlights. Address these with
matched close-up and whole-room evidence before calling the interiors finished.
