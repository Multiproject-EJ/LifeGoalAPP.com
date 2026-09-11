# Island 002 V2 release

The user approved the before/after and authorized publishing when complete. The candidate is based on main `86e76895214ffdde3a8fdebef63bbb69e74c00ef`, preserving Island 015. Implementation commit `9072d06c` is followed by the final optimization/evidence commit containing this record. **Released to main and deployed successfully as `e24cc58fdacdfa70833fa40f9fe7060169099e8b`.**

## Visuals and implementation

All five landmark macro designs passed their independent gates (minimum .85). The landscape correction passed at .85; Gate plant-attachment correction V004 passed .87–.89. Focused Court floor material views passed .89. Final production-source nine-view captures are in `qa/release-orbit-v2`; independent final review approved all nine views, minimum .85, with evidence recorded alongside them. Seven responsive/level/reduced-motion/undocked views passed .86–.88 in `qa/release-responsive-v1` before the final floor material and static local-matrix cache changes.

`before-after.html` now shows final actual V2 overview and Palace renders alongside actual V1. Concept artwork remains separately labelled. The user accepted the current faceted foliage and waterfall style.

Canonical 36-tile gameplay and the 20-roll docking progression remain unchanged. Plant instances and rigid surfaces are consolidated without replacing their authored geometry. Gate foliage no longer crosses the landing. Water remains attached to the terrain. Construction/shadow and parent-motion behavior have focused coverage.

## Completed validation

- Final focused suite: 33/33 passed, source stable.
- Integrated Island Run suite: 2089 passed, zero failed. Subsequent floor-only material and static local-matrix caching changes passed the focused suite, final TypeScript and production build.
- Final TypeScript, normal production build and profiler build passed.
- Architecture guard, art manifests, render wiring, audio assets, template camera checks and visual briefs passed. Existing allowlisted architecture and placeholder-audio warnings remain.
- Final nine-view capture has no source changes, console errors or failed requests. Capture snapshots are visual evidence, not continuous performance acceptance.
- Historical failed tests/traces are preserved with subsequent fixes; no failures have been overwritten.

## Unresolved release gates

The **final** desktop High/DPR2 30-second trace (`release-profile-high-dpr2-v3`) failed timing: 26.7 FPS, p95 50.2 ms, 95.1% slow frames. Static geometry met the ceiling at 175 calls / 179896 triangles. Earlier High v2 reached 55.6 FPS but p95 33.3 ms still required review. Medium docking replay timing passed but real shadow-inclusive peaks reached 252 calls / 368538 triangles; its timed window did not cover all 20 rolls. Low reduced-motion trace passed.

A subsequent short stationary same-host A/B/A diagnostic showed comparable prior/final performance (56.2 / 55.4 / 58.1 FPS). It suggests measurement variability but does not attribute or clear the failed full trace. Desktop phone-sized Chromium is not physical-phone evidence.

The paired iPhone 16 Pro reported passcode required; the user was asked to unlock it. A Safari launch acquired a device tunnel but timed out. No physical-phone validation or new native-app installation is claimed.

Per `docs/gameplay/ISLAND_ACTUAL_3D_PRODUCTION_PLAYBOOK.md` (mobile optimization and completion definition), physical-device and static budgets must pass or have an explicit review/waiver. General publishing permission does not waive those validation gates. The subsequent user instruction “great stuff, push live”, directly following disclosure of these unresolved checks and the waiver option, authorizes publishing this candidate with a validation waiver. The failed/missing checks remain recorded honestly. Next: push normally and verify the exact-SHA Pages deployment and live scene.

## Evidence and delivery

`qa/release-20260911` contains final build/typecheck/focused/full-suite logs, validators, phone attempt, same-host diagnostic and payload accounting. The world is bundled procedural Three.js with one runtime roof JSON; concept images, Blender masters and QA media remain documentation, not public runtime assets. Shared production bundle sizes are recorded in `delivery.json`; no separately attributable island compressed chunk is claimed.

Historical checkpoints remain in `IMPLEMENTATION-HISTORY.md`. Earlier requests for general publishing permission are superseded by the user's explicit conditional authorization.

## Latest release authority

The user explicitly instructed “great stuff, push live” after being told the performance and physical-device gates were unresolved. This supersedes the earlier conditional hold for this release only. Main was refreshed and remains `86e76895214ffdde3a8fdebef63bbb69e74c00ef`; no integration change or repeated source tests are necessary. Runtime source is unchanged from the reviewed candidate.

## Deployment verified

GitHub Actions run `34653063429` completed build and Pages deployment successfully for `e24cc58fdacdfa70833fa40f9fe7060169099e8b`. Fresh-browser `https://habitgame.app/` returned 200 with no page errors or failed requests. The production `Island5ThreePilot-DIyw5L96.js` contains the final V2 runtime; its code matches the reviewed local build after generated dependency filenames/import aliases are normalized. This verifies deployment and homepage startup, not signed-in gameplay or physical-phone performance. Receipts: `qa/release-20260911/deployment.json` and `live-smoke.json`. The validation waiver remains in force; failed/missing checks remain unresolved.
