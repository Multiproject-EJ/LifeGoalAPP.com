# Aurora Keep L3 runtime review — 2026-08-28

## Decision

Accepted for the Island 003 production runtime as a stylized phone-scale civic keep. It now reads as one inhabited winter stronghold rather than a generic ring of blue-roof turrets: a tall great hall, projecting gatehouse, paired round guard towers, upper watch gallery, stepped side wings, warm raw-copper roofs, two supported signal rings and a functional rear service elevation.

## Evidence

- Approved turnaround: `docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-turnarounds/003-aurora-keep-turnaround-v001.png`
- Approved night proof: `docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-turnarounds/003-aurora-keep-night-proof-v001.png`
- Goal/runtime comparison: `.img2threejs/island-003-frostmoon-upgrade/aurora-keep-l3/comparison-front-v002.png`
- L1, L2, day front, right, rear and night evidence: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-28-aurora-keep/`
- Semantic build: `src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts`
- Assembly map: `.img2threejs/island-003-frostmoon-upgrade/aurora-keep-l3/runtime-parts-manifest-2026-08-28.json`

## Visual gate

| Category | Score | Finding |
| --- | ---: | --- |
| silhouette and volume | 0.86 | Tall gable, paired dominant towers, wings and stepped rear survive the recorded angles. |
| identity | 0.86 | Gatehouse, gallery, warm copper and two engineered ridge rings establish the civic keep. |
| attachment | 0.90 | The corrected projecting gatehouse roof, exposed side wings and supported ring pivots read as intentional construction. |
| cross-view coherence | 0.85 | The side massing and authored service rear remain structurally coherent around the great hall. |
| assembly | 0.90 | Named clickable/explodable groups and presentation-only door, ring, smoke and shipment sockets are present. |
| phone readability | 0.85 | The keep hierarchy and inhabited windows are immediate; micro masonry and roof embossing are deliberately simplified. |

Worst gate: **0.85 — pass** against the Island 003 production threshold.

## Level progression

- L1: compact hall, protected door and one completed guard tower.
- L2: paired guard towers, inhabited upper gallery, side wings and first signal ring.
- L3: full wings and rear service work, chimneys, shipment dressing, roof finish and the second signal ring.

## Honest remaining gap

The runtime version carries fewer individual copper plates, masonry joints, carved braces and rear-yard props than the studio concept. At the canonical phone camera, those are controlled simplifications; the landmark silhouette, construction logic, warm material identity and night habitation are preserved. The largest future polish opportunity is denser roof-plate and timber relief if the landmark ever receives a dedicated close-up camera.

## Deterministic diagnostics

Right and rear orbit captures show no silhouette-area collapse, confirming genuine 3D volume rather than a facade. Literal studio-sheet IoU remains advisory because the runtime evidence is embedded inside the island scene. Exact values and the limitation are recorded in `deterministic-review-2026-08-28.json`.
