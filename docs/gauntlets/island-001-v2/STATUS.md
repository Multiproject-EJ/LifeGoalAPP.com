# Island 001 V2 — implementation complete

All 24 approved production entries are implemented in the isolated `codex/island-001-assembly-upgrade-20260909` branch. The user’s “proceed” approved the whole-island workflow and superseded the old per-part retry/admission stop. No merge, push or deployment has occurred.

The approved original three images are unchanged and committed as `5c7acca3`. The four finished models are packaged at `public/assets/islands/island-001/models/`, with exact hashes and dependencies in `Island1V2AssetManifest.json`. Historical failed drafts remain evidence, not approved runtime assets.

## Implemented

- Continuous limestone island, planted terraces, connected landmark entrances, coast, spring bridge and animated waterfall.
- Complete Hatchery v01, Habit Oak v02, Archive v01 and Observatory v02 with additive L1–L3 and five construction stages per level.
- Deep General Assembly cavern, geological enclosure and structural ribs, 252 delegate places, broad central aisle, two connected galleries, monumental presidential dais and four animated glass lifts.
- Ten charges in 3 + 5 + 2 batches: circular chain blast, large main excavation with rising earth and water impacts, finishing blast, then robot construction and the finished Assembly reveal.
- Legacy progress migration, canonical action/mutex integration, repeatable presentation and reduced-motion behavior.

## Evidence and validation

- Latest complete Island Run regression: **2,043 passed, zero failed**.
- Architecture guards: zero violations, three existing allowlisted warnings.
- Island art assets, render wiring, template geometry and visual production brief checks: pass.
- All four deployed GLBs: footprint, material batching, five stages per level, retained funded geometry, and cache teardown/remount checks pass.
- Actual full-pilot browser: two complete mission replays, five landmark focus views, resize and reduced motion pass without browser errors.
- Public URL bytes and hashes match the manifest; 375×667 and 430×932 overview/hall spot checks pass. Primary viewport is 390×844.
- Final landmark evidence: 68 independently inspected views; construction evidence: 72 browser frames with no exceptions.
- Independent integrated review accepts the completed structure and corrected excavation-to-build handoff, with nonblocking visual residuals. Exact reviewed evidence: `qa/reviews/complete-v02-independent-final.json` and `qa/reviews/release-v2-landmark-survey.json`.
- Corrected full-project TypeScript check and production Vite build pass. All four built model hashes match the manifest, and production JavaScript references their public URLs. Vite reports its large-application-chunk warning. Consolidated results: `qa/reviews/release-validation.json`.

## Delivery and limits

Installed model pack: **4,863,456 bytes (4.64 MiB)**. Estimated gzip model transfer: **1,542,549 bytes (1.47 MiB)**. This is the opening-island hero pack; it shares procedural terrain/water/construction systems and does not add texture downloads. Only one copy of each GLB is deployed; sources and QA remain outside public assets.

The manifest owns content-hashed URLs. Sources are fetched together once per loaded application session, with a 20-second download timeout and existing retry surface. Instances own their cloned render resources so remounting does not destroy cached source geometry. Normal browser/host HTTP caching applies; there is no separate persistent pack cache introduced by this change.

Physical-phone testing is **unverified**. Desktop Chromium at phone dimensions proves framing and local behavior, not device thermal or GPU performance. Final measurements below supersede the earlier mixed-scene profiles. Draw-call/triangle targets remain over budget. The authored models remain visibly simpler than the concept art; perfect likeness or a “10/10” score is not claimed. Two unfinished upper shaft apertures are visible briefly before galleries/lifts cover them.

Before/after viewer: `qa/comparisons/island001-v2-before-after.html`. It contains six comparisons from actual rendered geometry and the completed Assembly hero. The original reference images are targets, not screenshots of implemented game content.


## Final desktop Chromium measurements

| Scene | Quality | Average FPS | P95 frame | Max calls | Max triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| Completed overview | High | 59.7 | 17.7 ms | 269 | 206k |
| Completed overview | Medium | 59.7 | 17.7 ms | 263 | 199k |
| Completed overview | Low | 57.4 | 17.7 ms | 234 | 185k |
| Full demolition and robot build | High | 59.2 | 18.5 ms | 317 | 207k |

Timing targets passed; the profiler remains **REVIEW** because geometry targets do not. The low-quality sample contained a roughly one-second worst-frame stall. These are local development-host measurements taken while TypeScript verification also ran; they are not physical-device or thermal certification. The final mission uses shaded dust lobes; its independent review confirms improved volume and no lingering or detached plume.
