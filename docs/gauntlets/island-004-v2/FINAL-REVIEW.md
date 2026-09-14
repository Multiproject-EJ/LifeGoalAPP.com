# Island 004 V2 — implementation checkpoint, not 100% acceptance

The local Three.js upgrade preserves the existing five-landmark island and its canonical 36-tile route. It implements the selected purple/coral/teal/terracotta palette, rounded citadel roof, new furnishings and archive inspection cutaway, planting and water changes, and three staged causeway spans. No gameplay ledger or event-launcher logic was replaced. No deployment, merge, signing or phone installation was performed.

## Verified locally

- TypeScript build: passed. Production Vite build: passed.
- Island 004 focused checks: 23 passed across low/medium/high, all five landmarks L1–L3, finite geometry, unchanged anchors, roof-stage metadata, reduced-motion settling and canonical mission tests.
- Wider Island Run suite: 2,102 passed, one pre-existing Island 001 source-string assertion failed. The expected literal is absent from the unchanged base board; see `validation-v002/validation.json`. The same result was confirmed in `validation-v002/island-run-services-final.log` after tightening the camera-evidence regression assertion. The suite is not all green.
- Final `current-v005` capture: 23 checkpoint views, no collected page/WebGL errors, source unchanged throughout capture.
- Actual 30-second overview profile: 60 FPS average, 18.6 ms P95, 0% slow frames, 170 maximum draw calls, approximately 118k triangles. Desktop Chromium 149, embedded canvas 376×830 CSS pixels / 752×1660 rendered pixels. Not physical-phone evidence.
- Archive inspection visibly exposes the bookshelves, open reading book, table and benches. Mission 0–3 fixtures display the three causeway spans outside the route. Canonical mission remains six Masonry Sparks, two per span, separate from the Event Arena launcher.

## Independent visual review

The skill-required read-only Quality Lord reviewed the original candidate, replacement family and bounded correction. Final decision: **stop; art-family ceiling reached; visual approval withheld**. Required minimum is 0.85 in every required category/view. These subjective scores are review evidence, not a completion percentage.

| View | Identity | Palette/material | Setting |
| --- | ---: | ---: | ---: |
| Overview | 0.87 | 0.87 | 0.69 |
| Citadel | 0.83 | 0.87 | 0.69 |
| Hatchery | 0.87 | 0.86 | 0.71 |
| Habit hall | 0.89 | 0.88 | 0.71 |
| Archive exterior | 0.87 | 0.87 | 0.68 |
| Arena | 0.86 | 0.79 | 0.68 |

Remaining art blockers:

1. Coast remains a layered slab with sparse attached rocks. Gardens and vegetation still read as repeated primitives. Sky, water finish and lighting are flatter than the selected illustration.
2. Citadel dome is curved, but too tall relative to its raised crown cage. Balcony, windows and entrance remain simplified.
3. Construction/interior storytelling is not fully accepted. Separate evidence scores: archive cutaway 0.86; archive roof pair 0.82; hatchery/habit 0.78; citadel 0.70; arena 0.80; completed causeway 0.83. Still images and metadata tests do not prove the full animated sequence or every interior's visibility.

## Evidence and assembly limitations

- `current-v005/left.png`, `right.png` and `survey.png` failed to establish different camera views. They are retained as failed evidence, not accepted orbit coverage. Eight explicit azimuths were subsequently captured in `angles-v006`, with stable source hashes and no collected runtime errors. These reveal further defects, including the finite ocean plane's edge and harsh water highlights from the rear. They establish three-dimensional geometry but do not change the failed visual decision. This separate capture's canvas is 390×844 CSS pixels / 780×1688 rendered pixels; see its own report.
- `clay.png` is the app's material-free **normal-color geometry proof**, not neutral gray clay. Tier1 diagnostics passed but warned that ocean/background dominate masks. The 0.952 IoU and previous multi-angle mask metrics do not establish island fidelity.
- `runtime-landmark-parts.json` dumps real high-quality L3 landmark factory groups, not a complete scene export. `part-coverage.json` failed: citadel towers and arena bowl/flags are not independently named as promised; terrain/ocean/ambience are outside this dump. Five unnamed root marker meshes are reported. Do not interpret those missing environment exports as absent rendered terrain.
- Semantic roof/interior/shell groups survive local building compaction, but a complete selectable/explodable assembly certificate and action-ready gate have not passed.
- Construction snapshots exceed the overview draw-call budget (roughly 311–391 calls). The passing overview profile is not a construction performance certificate.
- Full gameplay-event launcher interaction and end-to-end construction animation were not browser-tested. Existing canonical callback paths remain unchanged; service tests are narrower evidence.
- Physical iOS/Android validation remains outstanding. It was not waived or substituted with desktop timing.

## Safe next route

The 3d-asset-gauntlet bounded art loop is stopped, not silently extended. At the user checkpoint, propose a focused new route: rebuild the coast/gardens as structured environment assets, correct the citadel dome/crown proportions, and make all construction interiors visibly staged. Preserve canonical anchors and runtime budgets; require fresh independent multi-angle and construction review, complete part coverage, and device acceptance before saying “100% done.”

Portable evidence: `gallery.html`, approved source packet, `baseline-v007`, `current-v005`, `comparison-v005.png`, validation reports and runtime part audit. Failed earlier captures remain local and ignored rather than deleted.
