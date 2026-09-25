# Controller showcase and movement visibility — 2026-09-24

## Execution contract
- Outcome: Island 009 showcases free Default Dark; special premium controller catalogue is discoverable; clearer pawn tracking and fading tile footsteps.
- Scope: presentation only. No dice, tile progression, rewards, purchase ledger or mission-state writes.
- Camera: audit islands 001–020; use actual mounted obstacle bounds rather than assigning dramatic motion indiscriminately. Preserve authored mission/construction cameras and reduced-motion behaviour.
- Trail: bounded reusable visuals, final landing distinctly brighter, no tile material mutation, dispose with scene.
- Gates: deterministic policy tests, TypeScript, architecture guard, browser inspection. Record incomplete visual coverage honestly; do not deploy unreviewed camera changes.
- Confirmed during work: every paid controller finish is 29 NOK; localized checkout desired. Intended stylized cowboy treatment remains unclear (the reply instead described the Compass Book finale).

## Initial findings
Every rolling island uses the same world-space [0, 8.4, 10.8] camera offset. Existing central-building transparency only protects landmark inspections, not moving pawns. Tile impacts animate geometry but do not leave a luminous trail.

## Implemented locally
- Island 009 free Default Dark showcase, independent of OS appearance.
- Premium showcase Shop popup, real 3D finish preview, all-finish catalogue, free default selection. Shop includes controller collection entry. Top-level portal and scroll lock. Paid 29 NOK buttons explicitly disabled; no counterfeit ownership or charge path.
- Adaptive rolling camera tests mounted landmark bounds, then solid mesh intersections (not sprites). Samples candidates once per hop, preserves clear headings, interpolates around targets with bounded angular speed. Reduced-motion and paused/construction presentation do not use this motion.
- Existing central-building occlusion relief now also covers moving/settling pawn.
- One reusable halo per tile, 1.25s fading trail, 2.2s brighter landing, reduced-motion brief landing only. Completed-hop catch-up avoids dropped-frame gaps. Disposed with scene; no tile material or gameplay mutation.

## Mounted-scene endpoint audit
Actual low-quality, build-level-3 renderer at `/work/controller-release-check/pawn.html`, 36 canonical endpoints each. These are **landmark-mesh endpoint checks**, NOT proof of unobstructed intermediate frames, whole-scene collision coverage, or device performance. Screenshots additionally inspected for 001, 008, 009, 010, 011, 014, 015, 017, 019. Browser batch timeout results were discarded and missing cases rerun individually.

| Island | Blocked candidate endpoints | Largest requested heading change (radians) |
|---|---:|---:|
|001|0/36|0|
|002|0/36|0.52|
|003|0/36|0.52|
|004|0/36|1.05|
|005|0/36|0|
|006|0/36|0.52|
|007|0/36|0.52|
|008|0/36|2.62|
|009|0/36|0.52|
|010|0/36|0.52|
|011|0/36|0|
|012|0/36|0.52|
|013|0/36|1.05|
|014|0/36|1.05|
|015|Not accepted: shell absent from room-root audit|Adaptive follow excluded|
|016|0/36|0|
|017|0/36|1.05|
|018|0/36|0.52|
|019|0/36; coaster scenery not fully represented by landmarks|0|
|020|0/36; special navigation remains separate|0|

## Failed gate / remaining work — not live
- Island 015 visual review exposes palace shell over route. Tried authored playable-overview, which still did not expose route; reverted that experiment. Previous follow retained. Needs a semantic route cutaway, respecting permanent palace architecture.
- Intermediate-frame obstruction and low-end/mobile GPU profiling remain. Island 008 has a large candidate-heading jump; angular velocity is capped but needs a slower, representative roll review. Island 019 track scenery needs specific occlusion coverage.
- Checkout endpoint currently handles creature app themes only, with creature-eligibility rules and a separate webhook allowlist. Controller SKUs, 29 NOK Stripe prices, verified entitlement fulfilment, refund/duplicate handling, native purchasing policy, and owned premium-default selection remain unimplemented. No backend writes, deployments or live charges performed.
- User's staff → summoned Compass Book → stairs → throw → zoom/unfold idea is for Island 008. Existing caretaker availability and book receipt already begin on 008 (`islandRunFeatureAccess.ts`, `compass-book/logic/journey.ts`). New cinematic not implemented; do not move progression to 002.
- Cowboy hat unchanged pending actual visual direction.

## Verification
- Pawn pure tests: tower clearance across 36 angles, broad-box false-positive override, shortest-angle wrap, fade/landing contrast, dropped-frame hop catch-up.
- Controller theme/MAX guard, personality and real Three pill tests pass.
- Island Run service suite: 2,302 passed, 0 failed.
- Architecture guard: zero violations, three existing allowlisted warnings.
- Final production build passed (4m53s); latest TypeScript rerun pending at this log update (prior full check passed).
- Shop preview visually verified with real Gold controller. Actual Island 003 Shop click opens Snow & Gold; close returns to Supply Dock collection entry. Nested scroll lock stays hidden until both modals close, then restores the original empty inline overflow. No checkout claimed.
