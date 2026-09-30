# Island 001 Venetian market marina

Status: approved concept implemented locally; validation passed.

## Mission

Replace the two innermost berth bands with a spacious hospitality market,
occasional Venetian stepped bridges, food/drink/snack and exhibitor stalls,
seating, planting, warm lamps and strolling visitors. Relocate the fleet
outward and preserve the first ship landing / disembarkation / Assembly story.

## Authority and source

Approved source: ../visual-references/island-001-venetian-marina-20260930/001-source.png.
SHA-256: a1d957bf9d90bb61df9d80804417ac19ba6547f74fde41717f8ceb0baab2769d.
Source provenance and exact prompt live beside the image. Existing island,
Assembly, ship families and gameplay remain authoritative, including the new
main-branch Departure Day changes. Dedicated branch starts at 680e0b09.

This is a presentation extension of the existing procedural model. Use its
Three.js geometry batching and deterministic clock. No account, wallet,
reward, progression, save, board tile or stop logic changes. No deploy/merge,
device install or external publication is included.

## Slices and evidence

1. Layout: shared ring, canal, bridge and berth coordinates; actual rendered
   overview and orbit. Bridge endpoints must land on solid decks.
2. Architecture: kiosks, awnings, stone balustrades, furniture, plants, lamps.
   Reference comparison and close views; preserve unobstructed routes.
3. Life and arrival: ambient walkers/seated visitors plus existing delegation.
   Retarget landing camera, ramp, route and timings. Deterministic checks for
   walkable surface heights, no prop crossings, complete entry and seating.
4. Integration: replay, rewind, reduced motion, phone view, full TypeScript,
   build, relevant runtime/service tests and architecture guard. Record known
   baseline failures separately.

## Layout specification

The existing island stays fixed. Expand market from radius 10.0 to 20.8,
moving the first berth from 13.8 to 24.2 (two pitches of 5.2).
Five narrow canal cuts leave a connected inner promenade. Five low stepped
stone arch bridges connect adjacent market sections at radius 17.5. Ten
radial arrival paths stay clear; market props stay outside these corridors.
Keep 220 berth sockets, 216 High craft, 50 families and the 95/5 mix.

Dimensions are construction interpretations of the approved concept, not
measurements recovered from generated pixels. Hidden sides repeat the same
modular language. Generated impossible stair landings are corrected to solid
connected surfaces.

## Quality and runtime

Preserve the current board composition and all original landmark identities.
New repeated elements use merged geometry/instancing and quality tiers.
Measure baseline and added cost; aim for <=15 additional visible batches and
<=45k added High triangles. Existing whole-island 175 draw/180k triangle
targets remain review constraints; do not claim physical-device performance
from a desktop screenshot. Physical-device acceptance remains unverified
unless measured on an available device.

## Recovery

Keep changes confined to marina modules, review controls, tests and this
reference/evidence packet. Each stage is reversible on the dedicated branch.
Stop expansion if passengers cross voids, props block entry, scene costs grow
without bounds, or gameplay state ownership changes. Fix the failing slice.
No claiming visual approval from a passing typecheck.

## Handoff

See island-001-venetian-marina/REVIEW.md and evidence/ for the implemented
layout, animation, browser captures and validation. The isolated-object
factory workflow was found inapplicable; its scope decision is retained in
.img2threejs/island-001-venetian-marina/workflow-scope.json. Implementation is
a scene extension using the existing game factory, not a passing object-factory run.
