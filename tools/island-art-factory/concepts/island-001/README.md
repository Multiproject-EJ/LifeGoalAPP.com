# Island 001 integration concepts

This folder records the selected environment-integration direction and the real
phone UI used to judge it. These images are production references, not runtime
art exports.

## Selected concepts

- `selected/island-001-l0-background-integration-v001-selected.webp` checks the
  island before any landmark building is constructed.
- `selected/island-001-l3-background-integration-v001-selected.webp` checks the
  same environment with all four landmarks at level 3 and the boss visible.
- `source/` contains the exact real 390×844 UI captures supplied to the image
  generator for those two studies.
- `runtime-review/` contains the later real UI captures with the approved
  landmark nameplate plus compact front-centred status-pill treatment.
- `runtime-review/island-001-l0-shared-circle-plane-phone.webp` and its L3
  counterpart record the first pass where the inner green circle, outer island
  circle, and live Spark36 route use the same transformed board plane.
- `scenery/moon-arena/` records the two center-arena directions and the selected
  final-camera correction. Its corresponding hidden-boss and idle-boss phone
  checks are stored in `runtime-review/island-001-moon-arena-final-camera-v2-*`.

The generated studies are environmental/contact references only. They may not
replace, repaint, resize, rotate, or reinterpret the real Spark36 tiles,
landmarks, caretaker, controls, text, or phone layout. Generator-made UI drift
inside either study is explicitly rejected; the `runtime-review/` captures are
the UI truth.

## Accepted environment direction

- Darken the water directly below the cliff wall with contact occlusion.
- Break the shoreline with a thin, irregular foam trace; never use a uniform
  glowing halo.
- Add local splash and mist only where waterfalls physically meet the sea.
- Continue the island into the water with subtle submerged rock and reef shelves.
- Increase fine water texture and restrained reflection close to the island so
  the foreground and environment share one lighting model.

The first runtime application of this direction is
`background/ambient-background-v4.webp`. It preserves the open lagoon while
using irregular submerged shelves and local water-depth changes around the
aligned board footprint; no visible placement ring or generated UI is present.
The corresponding real-phone approval captures are
`runtime-review/island-001-l0-background-v4-phone.webp` and
`runtime-review/island-001-l3-background-v4-phone.webp`.

## Mandatory two-state gate

Every island environment pass must be reviewed at both endpoints before its
background is approved:

1. L0: all landmark plots remain empty and the boss is hidden.
2. L3: all four landmarks are fully built and the boss is visible.

Use the exact viewport and invariants in `quality-gate.json`. A concept passes
only when the environment feels physically connected in both states and the
live board UI remains unchanged.
