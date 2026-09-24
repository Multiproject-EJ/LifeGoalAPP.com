# Living ocean follow-up — 2026-09-23

User requested exotic fish, larger sharks, octopuses and varied sea life that appears at different times, in different places and groups, without an obvious short repeating scene. They also requested removal of the sharp square ocean horizon.

The follow-up replaces the former fixed circular fish/turtle loops with a pooled 80-animal High / 24-animal Low population. High contains eight schools of eight reef fish, three sharks, three rays, three turtles, two octopuses and five jellyfish. Low retains all six species. This is the total pool; only a changing subset visits the visible water at once.

Independent encounter clocks span approximately 71–154 seconds. Each visit receives new seeded route, direction and distance choices, separated by quiet intervals. Groups enter from distant water, arc outside the shoreline and depart; the complete scene has no shared reset. Schools use unequal spacing and gentle individual drift. Heading follows the actual position derivative through arrival/departure as well as curved travel. Tails, flippers, arms and bells animate independently. Sharks deliberately cruise with their dorsal fins near/above the surface; octopus mantles stay submerged. Reduced motion retains initialized static animal poses.

The ocean plane expands from 68 to 360 units while retaining its existing grid budget. Caustic texture scale is preserved in world units. Distant water fades gradually to the scene sky before the plane edge or far clipping plane is visible. Gameplay, landmark transforms and route remain untouched.

## Validation

- `scripts/check-island005-sealife.mjs`: six simulated minutes for High and Low; all species visit visible water; changing population; continuous near-shore travel; no 30-second global reset; deterministic elapsed-time poses; minimum center clearance 8.63 units.
- `sealife-v001`: four runtime views, zero page errors, 60 FPS snapshots; 176 overview draw calls, 136k triangles. Superseded by the formation/heading/depth corrections in V002.
- `sealife-v002`: final actual-time timeline at 0, 23, 51 and 83 seconds, production-camera 30-second profile and Low/reduced-motion image. See its capture.json for authoritative results and stable source hashes.
- Independent follow-up review records are separate from the original V2 reconstruction state. Prior V2 captures retain their old hashes and are not relabeled as new-delta acceptance.

These are procedural stylized animals. Browser evidence is desktop Chromium, not a physical-phone GPU test.

## Final follow-up status

Visual/integration review approved (`review-sealife-v002.json`); TypeScript and production build pass (`sealife-typecheck.log`, `sealife-production-build.log`). Motion tests pass for both qualities (`sealife-motion-tests.log`).

High timing is **REVIEW, not PASS**: V002 measured39FPS/p9549.2ms during concurrent compilation; V003 after our compiler/build completed measured45.1FPS/p9534.2ms, max183calls/136ktris. Other substantial system activity was observed, but its exact contribution is unproven. Both captures have zero errors and stable source hashes. V003 Low/reduced-motion snapshot is60FPS/135calls/52ktris; this snapshot is not a30-second Low profile. Clean-machine and physical-device High timing remain outstanding. No prior60FPS result is transferred to this final delta.
