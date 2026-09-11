# Island 001 V2 — approved-image reconstruction

Status: full 24-part plan approved; first representative gate stopped after four failed reviews. Eivind subsequently approved the authored Blender/GLB route; implementation resumed. See `island-001-v2/STATUS.md`.

## Outcome and authority

Eivind approved all three images and requested committing them and rebuilding Island 001 as V2. Reference commit: `5c7acca3`. Goal hashes and exact generation prompts are preserved in `docs/visual-references/island-001-reimagined-20260910/`. No additional image-selection approval is needed.

The scope is the whole Island 001 presentation, with the existing 3 + 5 + 2 mission, four lift connections and canonical board retained. All work remains on `codex/island-001-assembly-upgrade-20260909`. No push, merge or deployment is included. Preserve the existing uncommitted V1 implementation as rollback; do not touch the original root checkout's unrelated work.

## Proposed production breakdown: 24 parts

| Group | Parts | Visible result |
|---|---:|---|
| Terrain | 4 | Sculpted island mass, coastal cliffs/water, clear route apron, grouped gardens |
| Hatchery | 4 | Stepped terraces, nursery wings, lotus conservatory, sheltered egg |
| Habit Oak | 4 | Continuous roots/trunk/branches, broad canopy, timber galleries, sweeping stairs |
| Wisdom Archive | 3 | Crescent library, reading terraces, celestial globe |
| Observatory | 3 | Curving wings, split blue dome, open armillary |
| Assembly | 4 | Cavern/vault, delegate desks, presidential and interpreter areas, public concourse |
| Shared systems | 2 | Integrated lifts; excavation and robotic commissioning |

The exact ownership, dependencies, exclusions, views and cues are in `island-001-v2/part-inventory.v1.json`.

## First slice and order

Start with the complete hatchery and its lift on the canonical footprint. Its curved wings, lotus glass structure, stairs and landscaping test the new art language before committing every family to it. Review the plain geometry from both three-quarter views, front/side/rear/top and a nine-angle orbit. Only then proceed through terrain, oak, archive, observatory, Assembly, and the integrated build animation.

Use one serialized geometry writer per group and a separate read-only visual reviewer. Root owns manifests, assembly, commits and the final review. Do not add detail around failed proportions. A reviewer must see the pixels before builder claims or metrics.

## Constraints and assumptions

- Retain the live 36-tile route and existing gameplay actions/store. No replacement tiles painted into generated art.
- Keep the four canonical landmark locations and stable L1–L3 footprints. Fit new architectural silhouettes within those constraints; do not enlarge the board to fit a concept image.
- Keep the calibrated 2.72 opening, 6.25 crown and 6.95 underground radius. Reference camera/perspective differences require explicit verification.
- The approved images govern visible identity. Hidden elevations and L1/L2 progression are inferred; make them additive, coherent and reversible.
- Reuse rendering, interaction, focus, quality levels and gameplay plumbing. New model code is Island 001-specific; Island 011 retains its original First Light implementation.
- Use real 3D geometry with pivots, sockets and contact surfaces. No flat image billboards masquerading as reconstructed landmarks.
- Retain reduced motion and bounded quality-tier particle/foliage budgets.

## Evidence and stop conditions

The worst required macro view must score at least 0.85 in the independent review. A detached interface, disappearing form, camera-dependent flatness or protected-route occlusion vetoes advancement. One blockout and one correction per construction family; at most two families/four reviews per group. Preserve failures and stop when the family's ceiling is reached rather than endlessly decorating it.

Require raw browser geometry/clay and beauty captures, reference comparisons, integrated phone viewport, animation/reduced-motion verification, appropriate runtime tests, TypeScript, production build, architecture checks and asset/render wiring checks. Offline Blender exports can aid geometry diagnosis but do not satisfy the browser gate. Previous browser automation timed out; verify the capture path before claiming an accepted production slice. Physical-device performance is a separate gate.

## Admission checkpoint

The 3D Asset Gauntlet skill explicitly requires approval after presenting the decomposition and before geometry workers or isolated studies. This checkpoint concerns the staged production breakdown above, not re-approval of the images. After approval, append it to `island-001-v2/user-decisions.v1.jsonl`, then resume the local sculpt state and create the first group's isolation packet and strict quality spec.

Eivind subsequently approved the entire plan and requested before/after images and completion. No further admission approval is needed.
