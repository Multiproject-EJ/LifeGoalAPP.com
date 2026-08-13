# Island 009 visual review — v1

Date: 2026-08-13

Decision: `refine-code` completed; conditional pass for the first playable Island 009 implementation. This is a strong authored island, not a claimed 10/10 final likeness.

Evidence:

- `phone-overview.jpg`
- `phone-left-orbit.jpg`
- `phone-right-orbit.jpg`
- `map-stripped-overview.jpg`
- deterministic map-stripped route: `/dev/island-template-kit?mode=3d&island=9&level=3&guides=0&island3dQuality=high&island3dMapStripped=1`

What changed during review:

- Raised basalt/steel albedo and exposure after the first phone render collapsed into black.
- Rotated the three gantry roots so their local booms point inward over the shaft instead of outward behind the caldera.
- Added descending shaft plates, 18 vertical heat ribs, alternating depth rings, interior glow, and a small low magma heart.
- Increased external landmark scale and boss vertical emphasis while preserving fixed plot positions and the route corridor.
- Added phase-linked orange, teal, and violet practical lights to the four external mechanisms.
- Reduced the Island 009 authored world to 83 visible renderable leaves through compatible material batching and instancing. The complete shared workbench still reports 448 calls / 97k triangles / 60 FPS at High; map-stripped reports 299 calls / 54k triangles / 60 FPS.

Review scores (single illustrated reference; practical real-time reconstruction scale):

- Global fidelity: 0.76
- Macro composition: 0.86
- Five-landmark separation: 0.84
- Heartshaft and gantry identity: 0.8
- Route readability: 0.94
- Material/palette match: 0.73
- Hidden-side/orbit consistency: 0.82
- Micro-detail match: 0.65

What still differs:

- The concept uses a much larger, more cinematic crater-to-island ratio and denser micro-machinery than the locked gameplay layout can safely support.
- The source's shaft appears nearly bottomless; the procedural implementation uses readable stepped depth cues because a fully black hole fails the phone camera.
- The shared pilot's fixed board/reward/Caretaker/debug overhead remains above the 175-call playbook target even at Island 009 L0. Island 009 itself is significantly batched, but the complete shell needs a separate shared-renderer optimization slice before final device sign-off.
- The source is a single baked-light illustration, so physically exact materials and hidden geometry cannot be claimed.

The result preserves the selected idea: landlocked lava caldera, open central Heartshaft, three asymmetric steel/copper gantries, a suspended open ignition ring, four mechanically distinct external landmarks, no ocean, no floating island, no arena floor, and a clear canonical 36-tile route.
