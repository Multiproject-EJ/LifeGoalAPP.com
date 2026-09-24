# Approved island-wide polish and retracting arena

User approved the whole-island critique and requested the arena rods rest at roughly 30% height, rise for boss battle and sink afterwards. This is additive follow-up to the existing approved V2 contract.

Scope: retracting arena crown (poles, arches, ropes and ornaments), connected landmark paths/clearings, broken coastline bands, clustered planting/taller flowers, varied neighbour trees/huts, roof/frame/archive details, smaller wildlife and stronger water depth cues. Preserve canonical route, landmark footprints, funded construction geometry and authoritative gameplay services. Read the existing arenaBattlePresentation active flag only; preview controls are local presentation state. No merge/deploy.

Milestones: first prove reversible arena motion and construction retention; then scenery polish; finally browser overview/orbits, preview rise/return and reduced motion, scoped tests and production compilation. Previous High performance REVIEW remains open until reprofiled; no physical-phone claim. Keep static material batching and shared materials, avoid new render passes or lights. Save diagnostic failures alongside corrected evidence. Rollback is limited to this follow-up's changes; earlier V2 and user work stay intact.

## Verification in progress

Arena regression `arena-retraction-tests-v003.log` passes all six Low/High L1–3 cases: compacted renderables retained, smooth rise/sink, reversal without position jumps and reduced-motion targets. Earlier v001/v002 test failures were harness expectations (JavaScript negative zero; checking 1.4 seconds into a 1.5-second return), retained as diagnostics. Vite test-server websocket port warning is recorded.

`polish-construction-tests.log` passes opening arena, authored construction, funded mesh retention, growth and envelopes. The broader suite's mergeGeometries attribute warning also exists verbatim in the earlier `magic-construction-tests.log`; this follow-up does not claim warning-free global geometry.

Actual preview-button capture `arena-v001/` passes with stable arena source, 272 timeline samples, raised/resting stills, a complete automatic return and reduced-motion checks; zero browser errors. This proves the presentation control, not a paid gameplay encounter. The real encounter uses the existing battle-active prop. These stills exposed sand cap overlap; the final landscape restricts elevation variation to exposed side rings/uncapped strata. Use final polish-v004 for scenery acceptance, not arena-v001. Initial polish-v001 timed out before the canvas loaded and is excluded.

polish-v002 also timed out before the canvas loaded. polish-v003 retained the corrected overview and hatchery, then timed out waiting for screenshot stability; scoped independent review is review-polish-arena-v003.json. Final capture uses canvas-bound viewport screenshots and longer load allowances. The build was temporarily paused to reduce local contention while capturing.

`polish-v004/` completed nine views, stable source hashes, zero browser errors and all five real canvas landmark taps passing. Its independent review identified overlapping same-height stepping stones. The bounded fix samples each path more finely and only places a stone at least .64 units from its predecessor; top-face diameter is .572 units or less. `polish-paths-v005/` captures the final overview and affected Habit/Oracle views with zero browser errors. All arena and building source is unchanged from the full v004 capture. Root inspected the corrected path surfaces.

The earlier production build was paused, then terminated because the final path correction requires a fresh source-consistent build. Two elevated launch attempts timed out in automatic approval review; normal-sandbox bounded build was then launched successfully. No safety rejection or user permission is inferred from the review timeouts. Final build result is recorded separately in polish-final-build.log. Prior project-wide TypeScript and High performance limitations remain open; visual evidence is not physical-phone or FPS acceptance.

Final scoped visual/integration approval: `review-polish-paths-v005.json`. The reviewer confirmed separated stone tops with no striped overlap, stable source and zero browser errors; v004→v005 changes are limited to Landscape path placement and the capture helper. Earlier arena/building/tap evidence remains applicable. `git diff --check` passes.

Final production build exited 124 after its 240-second limit while transforming modules. This is incomplete validation, not a successful build or a diagnosed source error. No further build retries were launched. Browser compilation/rendering, all five interactions, arena motion tests and construction checks passed as recorded above; full TypeScript/build and High performance acceptance remain open.

Later verification: the complete current production build PASSED during the traffic/clearance follow-up (`traffic-clearance-build.log`, 2m18s). This supersedes the incomplete build result above. Existing bundle-size warnings remain.
