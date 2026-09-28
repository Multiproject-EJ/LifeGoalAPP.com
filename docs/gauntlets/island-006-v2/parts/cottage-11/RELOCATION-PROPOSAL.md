# Cottage11 measured relocation proposal

Recommend **[-10, .65, 3.7], yaw1.88, uniform scale.86**, with a new supported quay. This is a proposal, not a final assembly gate.

Read original world-blockout-v001/135 and180: left annex collides with boatwright hull/workyard and foreground conifer. A read-only fresh scene recreated actual medium geometry and all five landmarks. Tested original, [-9.6,3.7], [-10,3.7], [-9.6,4.2]. No production source edited.

## Measured evidence
- Candidate [-9.6,3.7] still intersects boatwright's full mesh-derived world AABB. [-9.6,4.2] also intersects.
- Candidate [-10,3.7] has **zero world AABB intersections** against all five landmarks and named cottage roots. Conservative AABB clearance is stronger than merely no sampled ray hits.
- New cottage10 is present in the live scene at its relocated plot; no intersection with candidate.
- Candidate mesh bounds: min[-10.903985684,.426400008,2.660047063], max[-8.730663652,3.343949943,5.318409251].
- Eighteen front-facing door rays from both door widths, at local heights.3/.6/.9, length1.2 found no neighboring building hits.
- Nine downward terrain samples beneath terrace returned **no terrain support**. Do not move the house without its new foundation.
- Full numbers: qa/relocation-proposal-final.json. Actual pixels: qa/relocation-proposal-final.png. Screenshot shows present floating terrace deliberately, before proposed quay; alternate diagnostic lighting/overview is not a beauty acceptance image.

## Quay and landing proposal
Keep current cottage terrace and support it with a dedicated root-local stone quay. Initial local footprint x[-1.80,1.03], z[-.90,1.10], top no higher than cottage local-.26 (world.4264) so it meets existing terrace underside. Extend courses/piles below waterline; do not place a shallow slab hovering over sea. Stepped lower courses may widen slightly. Recheck boatwright clearance after adding quay because only the house bounds were tested.

The front direction is [+.952576,0,-.304300]: east-southeast/inland in world coordinates. A landing from local center x≈-.4,z1 toward z3 points world[-9.0761,3.7660]→[-7.4377,3.2426]. This should connect toward the existing village promenade north of boatwright's workyard. Start with a narrow supported landing (.65–.80 world units clear width), deck level near house terrace top world.7145; resolve shore terrain difference with one or two steps. The landing is only directional guidance: its full geometry must receive ray/bounds and screenshot clearance checks; current 1.2-unit door rays do not certify the entire proposed bridge.

Main and annex front door sample centers world[-9.4980,3.2507] and[-9.0832,4.5492]. Keep a connected apron serving both doors rather than a landing to only the main threshold.

## Foliage / diagnostics limitations
The outboard house itself leaves the former conifers inland. Do not blanket-delete coastal trees. Fit vegetation only against actual new quay/landing and front-door corridors; remove/move intersecting grass/shrub instances after those instances exist. Original conifer at the former plot must not be mistaken for a collision after relocation.

Use final six-camera world packet including elevated45/135 and real production materials/light. The diagnostic scene includes weather overlays from ambience and is intentionally not a color-quality reference. Mesh AABB and sampled-door clearance certify this candidate versus measured buildings only; they do not certify unbuilt quay, walkway, boats, foliage or cinematic motion.

Diagnostic script: scripts/inspect-cottage11-relocation.mjs. Read-only runtime transforms in disposable browser scene; no Island22 source edits.
