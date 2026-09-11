# Island 001 V2 — implementation complete

All 24 approved production entries are implemented in the isolated `codex/island-001-assembly-upgrade-20260909` branch. The user’s “proceed” approved the whole-island workflow and superseded the old per-part retry/admission stop. The user has authorized release to main and the live site. Release checks and artifacts below describe the tested candidate; deployment status is available in the repository’s GitHub Pages workflow.

The approved original three images are unchanged and committed as `5c7acca3`. The four finished models are packaged at `public/assets/islands/island-001/models/`, with exact hashes and dependencies in `Island1V2AssetManifest.json`. Historical failed drafts remain evidence, not approved runtime assets.

## Implemented

- Continuous limestone island, planted terraces, connected landmark entrances, coast, spring bridge and animated waterfall.
- Complete Hatchery v01, Habit Oak v03, Archive v01 and Observatory v02 with additive L1–L3 and five construction stages per level.
- Deep General Assembly cavern, geological enclosure and structural ribs, 207 visible delegate stations with reserved aisles, broad central aisle, two connected galleries, monumental presidential dais and four animated glass lifts.
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

Installed model pack: **4,888,076 bytes (4.66 MiB)**. Estimated gzip model transfer: **1,553,533 bytes (1.48 MiB)**. This is the opening-island hero pack; it shares procedural terrain/water/construction systems and does not add texture downloads. Only one copy of each GLB is deployed; sources and QA remain outside public assets.

The manifest owns content-hashed URLs. Sources are fetched together once per loaded application session, with a 20-second download timeout and existing retry surface. Instances own their cloned render resources so remounting does not destroy cached source geometry. Normal browser/host HTTP caching applies; there is no separate persistent pack cache introduced by this change.

Physical-phone testing is **unverified**. Desktop Chromium at phone dimensions proves framing and local behavior, not device thermal or GPU performance. Final measurements below supersede the earlier mixed-scene profiles. The optimized full-mission profile passes the existing draw-call/triangle targets. A paired iPhone remains locked, so Safari automation could not establish a test session. The authored models remain visibly simpler than the concept art; perfect likeness or a “10/10” score is not claimed. Two unfinished upper shaft apertures are visible briefly before galleries/lifts cover them.

Before/after viewer: `qa/comparisons/island001-v2-before-after.html`. It contains six comparisons from actual rendered geometry and the completed Assembly hero. The original reference images are targets, not screenshots of implemented game content.


## Release optimization and final desktop measurements

Habit Oak v03 adds deeper green cores, layered irregular crown lobes and 320 attached leaf tips, while retaining the same 23,153 triangles and every non-canopy mesh. Its 17-view independent review and all 18 construction-stage captures pass.

Island001-only rigid surface batches retain authored transforms, ancestor visibility, original picking surfaces, model bounds, material animation and full shadow geometry. Back-facing triangles are removed from color submissions. Invisible aisle seating instances are no longer submitted, thin foam ribbons use one transparency pass, and small Assembly ribs/railings/emblem curves use lighter tessellation. Original landmark GLBs remain complete. Independent source review verified disposal of both color and shadow buffers and restored original meshes.

| Scene | Quality | Average FPS | P95 frame | Max calls | Max triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| Full demolition and robot build | High | 56.5 | 17.8 ms | 173 | 179k |

The final full-mission profile is **PASS** against unchanged limits of 175 calls and 180,000 triangles, down from317 calls and207k triangles. Its worst frame was134.4ms; this is desktop Chromium with compiler work running concurrently, not physical-device or thermal certification. See `qa/reviews/release-v3-final2-high-profile.json`.

All 2,043 service tests, full-project TypeScript, focused batching regression/type checks and the production Vite build pass. Final replay/focus/resize/reduced-motion checks include WebGL error inspection. Production GLB bytes, SHA-256 hashes and bundled URLs match the manifest. Vite retains its existing large-application-chunk warning.

Final independent reviews: `qa/reviews/release-v3-habit-independent.json`, `qa/reviews/release-v3-batching-independent.json`, and `qa/reviews/release-v3-final-visual-independent.json`. The hall remains complete after tessellation optimization; fine furnishings are intentionally small at phone scale.

Production target verified through GitHub Pages: **https://habitgame.app/**. Deployment runs automatically on a normal push to main. The unrelated root checkout remains untouched.

### Later overview samples and browser pacing

| Quality | Average FPS | Max calls | Max triangles | Raw profiler rating |
| --- | ---: | ---: | ---: | --- |
| High | 30.0 | 171 | 178k | FAIL (timing) |
| Medium | 30.0 | 165 | 173k | FAIL (timing) |
| Low | 30.0 | 153 | 162k | REVIEW (timing) |

All three geometry budgets pass. A separate150-frame control test measured30.01FPS on a blank page and30.00FPS on the island, both visible. The later host/browser environment is pacing even an empty page at30FPS; timing results remain recorded verbatim and are not treated as device certification. The earlier high mission sample passed56.5FPS. No profiler thresholds or device power settings were changed. Evidence: `qa/reviews/release-v3-frame-pacing-diagnostic.json`.
