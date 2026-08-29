# Island 003 — Frostwell working fishery and lift extension

## Outcome

The completed Frostwell cutaway now resolves into a functioning vertical seafood operation. The fishery is built beside the freshwater lens at the bottom of the ice, while a surface lift headhouse connects it to Frostmoon above. People and wet catch use separate full-depth cages, and an under-ice winch repeatedly lowers and retrieves a fishing net beside a moving fish school.

This is a visual extension of the established signature mission. Canonical mission progress still owns completion; the Three.js presentation only reads that state and animates the completed facility.

## Runtime structure

- `FROSTWELL_SURFACE_LIFT_HEADHOUSE` identifies the former surface fishery shell as the upper logistics station.
- `FROSTWELL_DEEP_FISHERY_PROCESSING_HALL` is the warm, copper-roofed lower facility at water level.
- `FROSTWELL_PEOPLE_LIFT_SHAFT` and `FROSTWELL_PEOPLE_LIFT_CAGE` carry a visible worker.
- `FROSTWELL_FISH_CARGO_LIFT_SHAFT` and `FROSTWELL_FISH_CARGO_LIFT_CAGE` carry wet fish baskets.
- `FROSTWELL_UNDERICE_FISHING_WINCH`, `FROSTWELL_UNDERICE_FISHING_NET`, and `FROSTWELL_UNDERICE_FISH_SCHOOL` make the bottom operation legible.

The two lift cages counter-travel on a smooth bounded cycle. Shaft wheels rotate in opposite directions, the fishing drum turns, the net dips and recovers with a small swing, and the fish school orbits close to the water. Reduced-motion mode retains the facility while freezing optional ambience.

## Presentation and inspection

The lower fishery remains hidden during the ordinary island-board overview so the geological cutaway does not intrude on the playable map. Entering the explicit Frostwell inspection preset reveals the full built structure. A dev-only `frostwellBuilt=1` query flag supports deterministic completed-state capture without changing saved gameplay.

## Evidence

- Completed front view: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-lifts/frostwell-deep-fishery-final.png`
- Counter-travel view: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-lifts/frostwell-lifts-in-transit.png`
- Three-quarter depth view: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-lifts/frostwell-deep-fishery-left.png`
- Rear geological shell view: `docs/visual-references/island-003-frostmoon-upgrade/runtime-evidence/2026-08-29-frostwell-lifts/frostwell-deep-fishery-rear.png`

## Quality gates

- Extension part coverage: 19 specified components, 41 named runtime parts, 0 errors, 0 warnings.
- Architecture guard: 0 violations; 3 existing allowlisted warnings.
- Island art render wiring: pass.
- Island template kit camera lock: pass.
- Island visual production briefs: pass.
- Frostwell sculpt specification: strict-quality pass.
- Contract coverage verifies inspection visibility, distinct lift cages, counter-travel, and fishing-net motion.
- Full Island Run suite: 1,850 passed, 0 failed.
- Production Vite build: pass (existing chunk-size and mixed-import warnings remain).

## Honest constraint

The fixed proof frames establish the composition, named hierarchy, true side depth, and changed operating positions. They are not a frame-by-frame animation export. Runtime device profiling should continue to be treated as a separate optimization gate because the evidence page renders the whole Island 003 world, not Frostwell in isolation.
