# Magical building follow-up

User selected glowing crystals, celestial ornaments and animated mechanisms. The four outer landmarks retain their established silhouettes and footprints, with restrained teal/violet emissive materials and gold celestial details.

- Habit lodge: turning gable sunwheels, levitating focus crystal and planted crystal boxes.
- Hatchery: egg guardian halo, orbiting stars and a canopy moon ornament.
- Archive: star clocks, floating open star atlas and roof planetary orrery.
- Oracle: moving globe and meridian, roof astrolabe and canopy stars.

L1 remains unchanged. L2 additions persist into L3; funded construction retention and envelope tests pass in both quality modes (`magic-construction-tests.log`). Shared opaque materials use the existing batching path without new point lights or bloom. Eleven articulated mechanisms are cached once per scene. Reduced motion resets them to their authored poses.

Independent review caught static compaction flattening the ornaments and leaving empty moving pivots. The settled building compaction predicate now preserves every tagged articulated mesh and its descendants for existing rigid animation batching. The stronger regression test first reproduced this failure (`magic-settled-before-fix.log`), then passed all eight actual settled-build cases with renderable world-matrix movement, deterministic replay and reduced-motion reset (`magic-settled-motion-tests.log`).

Final browser evidence is `magic-v002/`: nine views, stable source hashes, zero page/WebGL errors and all five real canvas landmark taps passing. Independent visual/integration approval is `review-magic-v002.json`. The earlier `magic-v001/` is diagnostic only: it used static ornaments and its source changed during capture. It is excluded from acceptance.

The existing High performance REVIEW from the living-ocean follow-up remains unresolved. These captures and motion checks do not establish a new frame-rate result or physical-phone acceptance. Browser diagnostics retain an unrelated unused landing-image preload warning. No gameplay rules changed in this follow-up.

TypeScript completed without diagnostics (`magic-typecheck.log`), and the final production build passed in 38.87 seconds (`magic-build.log`) with existing bundle-size warnings. `git diff --check` passes.
