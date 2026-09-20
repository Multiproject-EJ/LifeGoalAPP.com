# Bounded tessellation candidate — visual preservation approved

2026-09-20 result: `palace-tessellation-v003` captured all fifteen required
views from stable sources with zero page errors. Independent read-only review
approved preservation, lowest score 0.86; see `qc-review.v1.json` in that folder.
Fourteen geometry and 37 production/construction checks passed. High-quality
palace triangles reduced from 80,844 to 52,332, with named parts and dimensions
retained. Whole island remains over budget at 176 draws / approximately 182k
triangles (limit175 / 180k). Neither performance nor full-island release is approved.

Scope: performance correction only on the accepted compact palace. This is not
a new shape family and does not reset exhausted macro/facade correction budgets.
No curve control points, dimensions, transforms, named ornaments, sockets,
materials, camera, board or neighbouring landmarks change. Garden bays are frozen.

Hypothesis: small gold trim is over-tessellated at the intended phone scale.
Use four-sided trim sections, 24 longitudinal arch samples, eight volute/roof-rib
samples and twelve dome-scroll samples. Masonry/glazing arc samples use eight
curve segments. Main radial rings use 48 rather than 64 samples on medium/high;
low retains 32. Crown ribs, dome profile and large rail shapes stay unchanged.

One candidate; preserve the accepted pre-change captures in
`planting-assembly-v001` and `compact-ornate-facade-v007`. Required acceptance:
all named surfaces/stages retained, exact funded-level retention, height/route
guards unchanged, runtime full-world triangle/draw accounting, same-camera
nine-view comparison plus front/rear clay, and independent read-only visual
regression review before promotion. A numerical reduction alone is not approval.

No physical-device performance or release acceptance is claimed.
