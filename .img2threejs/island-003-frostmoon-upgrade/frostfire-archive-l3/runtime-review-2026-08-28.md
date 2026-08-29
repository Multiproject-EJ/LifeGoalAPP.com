# Frostfire Archive L3 runtime review — 2026-08-28

## Decision

Accepted for the Island 003 production runtime as a stylized phone-scale landmark. The result is recognizably an octagonal public archive rather than the former brown silo: it has a low warm-copper radial roof, central open frostfire cage, book crest, reading frontage, amber night lighting and a working rear furnace/service elevation. No blue roof, aurora, purple magic, tent, dome or telescope language remains.

## Evidence

- Approved goal: `docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-goals/003-frostfire-archive-l3-goal-v001.png`
- Goal/runtime comparison: `.img2threejs/island-003-frostmoon-upgrade/frostfire-archive-l3/comparison-goal-vs-runtime.png`
- Day front, left, right and rear plus night front: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-28-frostfire/`
- Semantic build: `src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts`
- Assembly map: `.img2threejs/island-003-frostmoon-upgrade/frostfire-archive-l3/runtime-parts-manifest-2026-08-28.json`

## Visual gate

| Category | Score | Finding |
| --- | ---: | --- |
| silhouette and volume | 0.88 | Compact octagonal mass, low roof and lantern stack survive all recorded angles. |
| identity | 0.86 | Frostfire cage, copper roof, book crest and reading frontage establish archive use. |
| attachment | 0.90 | Foundation, shell, roof, stack, entry and rear service work read as one grounded construction. |
| cross-view coherence | 0.88 | Rear furnace, side windows/alcove and front entry remain structurally coherent around the octagon. |
| assembly | 0.90 | Clickable/explodable semantic groups, door/flame/furnace sockets and named flame subtree are present. |
| phone readability | 0.85 | Warm stack and roof ribs read immediately; the book crest and shelf micro-detail are deliberately simplified. |

Worst gate: **0.85 — pass** against the Island 003 production threshold.

## Honest remaining gap

The real-time version carries fewer individual stone blocks, copper plates, books and tiny fasteners than the concept sheet, and the canonical island camera includes some foreground board/scenery. Those are conscious phone-scale simplifications rather than missing landmark identity. The largest future polish opportunity is a clearer sculpted open-book crest at very small screen size.

## Deterministic diagnostics

The three orbit comparisons show no silhouette collapse, confirming a genuine volume rather than a facade. Literal studio-sheet IoU and isolated-background turntable segmentation are advisory failures because the approved reference is a four-view sheet and the runtime evidence is an embedded phone-world crop. Details and exact values are recorded in `deterministic-review-2026-08-28.json`; this limitation is not promoted as a deterministic pass.

## Verification

- TypeScript Island Run test project: pass.
- Island Run service suite: 1850 passed, 0 failed.
- Island Run architecture guard: 0 violations, 3 pre-existing allowlisted warnings.
- Strict sculpt spec: pass.
- Git diff check for the Frostfire files: pass.
