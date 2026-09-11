# Family 2 final bounded correction: b04

Status: frozen candidate will require the fourth and final authorized Blender-route independent review. Mechanical verification does not approve likeness.

## Hypothesis and controls

The b03 review's worst category was 0.70; no hard veto. Its principal defect was a large open crown surrounded by wall-like pointed bays. The approved original crop instead shows an inward-vaulted shelter, a dominant central crown, lower lateral tips, narrower rooted lower arches and a broader middle span.

This single correction reprofiles the existing seven-bay envelope. Three principal glazing vaults now overlap inward and terminate at one crown directly over the egg. Four lower side petals retain their own lateral pointed tips. This should close the open crown and change the pointed-wall reading into a layered shelter in top, front, profile and three-quarter views. The lower roots narrow, the middle sweeps outward, and the upper glass returns inward. The front entrance remains a geometric opening, including with opaque replacement materials.

The original approved crop and overview remain authority. The inferred clay study only helped interpret architectural rooted arches. No camera, lighting, palette, threshold, gameplay, socket, root transform or footprint setting changed. No decorative cross-ribs, foliage, furniture or finish textures were added.

## Exact geometry changes

- Replace the three level-1 glazing bay surfaces with overlapping pointed vault fans spanning 128 degrees each, arranged at 0 and ±120 degrees. The three principal vaults meet at `[0, 2.46, -0.20]`, above the existing egg socket.
- Reprofile their radial section from a 0.48 root radius through an outward middle swell to zero radius at the crown. The surface boundaries have a lower transverse vault profile, retaining a three-lobed structural envelope rather than a uniform rotational cap.
- Cut no mesh with a Boolean: the front vault's surface domain begins along a 76-degree entrance arch. Its centre clearance is approximately 1.96; no glass plate seals the egg entrance.
- Reprofile the four level-2 side petals at ±58 and ±126 degrees. Roots have a 0.22 half-width; middle half-width is 0.36. Lower tips reach 2.23 and 2.30, at radius 0.43, visibly subordinate to the central 2.46 crown.
- Retain the main structural root-to-crown edges and front entrance frame. Omit continuous full-width sills from the revised shell.
- Preserve all existing nursery room floors, positive piers/spandrels, occupied roofs, pools, stairs, egg and cradle. Add one localized occupied west roof shoulder at 1.115, plus approach treads at 1.035 and 1.075, on the retained 0.995 roof. This breaks the continuous roof band without changing either stair endpoint. Five rays verify support by the retained roof. Existing binary geometry is compared with b03; where the new shoulder shares a material batch, the original triangle multiset must remain a subset.

## Evidence

`family02-correction-b04-shelter-checks.json` records downward ray intersections with actual principal glass at 37 samples over the egg and surrounding 0.28-radius disk. This checks that a roof physically extends over the egg; it is not a silhouette or quality score.

`family02-correction-b04-support-checks.json` repeats all 57 roof-pier contacts. `family02-correction-b04-export-checks.json` checks the binary GLB's attributes, indices, bounds, named owners, stages and additive levels. `family02-correction-b04-preservation-checks.json` compares all non-conservatory binary mesh signatures with frozen b03.

The b03 binary, source snapshot, `.blend`, diagnostics and captures remain unchanged. The builder will freeze before browser capture and will not self-review or modify geometry after delivery. Passing requires all scores at least 0.85, worst-score improvement at least 0.10, and no critical regression over 0.05 in the root's unchanged views.
