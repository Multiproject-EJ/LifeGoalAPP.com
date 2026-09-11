# Whole-island iteration

User approved this workflow in whole-island-iteration-proposal.md. All 24 parts remain in scope; prior rejected drafts are not approved assets.

## Earlier integrated drafts (historical)

- Hatchery b04: unfinished and canopy correction still required.
- Habit Oak v01: complete additive levels/stages, runtime loader tests pass; visual correction required to broaden/lower the canopy, soften foliage cluster silhouettes, compact the gallery stack and improve inhabited entry details.
- Archive v01 and Observatory v01: integrated; GLB additive stages and owned cache lifecycle checks pass. Observatory opening refinement remains in assembled visual review.

## Rendering iteration

Actual desktop Chromium at390x844, high: old mixed scene max967calls/339k submitted tris,49.4FPS,p95 33.4ms. After001-only tinted glass, cloud/garden batches, compact moving rewards and split near/far instanced route: Oak v01 mixed scene max407calls/218k,60FPS,p95 17.1ms. Source qa/reviews/whole-oak-02-profile.json. Not physical-phone proof or final V2 performance approval.

Startup waterfall bug found in browser: a slightly negative initial Timer sample sent CatmullRomCurve3 outside its domain. Guard added; check-island001-v2-runtime.mjs validates negative,nonfinite,zero,normal,long-session times at all qualities.

Independent audit identified the instanced route cutaway visibility regression; fixed by six material/near-far batches. Shared Island011 defaults unchanged.

## Integrated environment pass

V2 limestone terrain, connected plots, cypress and gardens; domed brass/blue glass lifts; broad central aisle; larger presidential backdrop and globe/laurel; cavern shell and ribs integrated. Actual frames whole-terrain-v02 and whole-hero-v01. These remain drafts. The lower centered camera reveals a compressed chamber: next geometry pass deepens it to6.6 from4.72, preserves all locked radii and canonical gameplay, coordinates galleries/lift elevations, shortens the finished oculus collar, and replaces the exposed navy foundation disc.

Original wrapper turned all models toward center, exposing the Archive's narrow side in overview. V2 now uses explicit yaw0 to show authored +Z facades and consumes the lift sockets with the same yaw. Canonical centers and radius checks unchanged.

Harness-only water intersection fixed: review sea now uses actual Pilot's existing annular geometry. Actual Pilot was already masked. Legacy thick cut faces hidden after the thin cavern shell replaced their function.

## Deep chamber milestone

whole-deep-v01 raw surface, hall and centered hero captures record the6.6-depth chamber, shared gallery/lift heights, expanded presidential backdrop, gardens and spring bridge. Independent review confirms room scale improved, but identifies missing inward-facing enclosure, incomplete side concourse to front lift stations, and stair landing radial gaps. These are queued for the next root geometry turn. Carver exclusively owns Hatchery completion meanwhile.

TypeScript passed after depth changes. Waterfall robustness check and architecture guards passed (zero violations, three legacy warnings). Full-pilot profile whole-deep-v01 did not produce a measurement: initial page/quality control load timed out with no browser exception. Retry underway; do not treat this as performance evidence.


## Completed whole-island implementation

The user-approved whole-island workflow superseded the earlier representative-part stop. All 24 entries are now mapped in assembly-manifest.v1.json. Final models are Hatchery v01, Habit Oak v02, Archive v01 and Observatory v02, copied unchanged into the public Island001 model pack and referenced only through Island1V2AssetManifest.json. Installed model bytes: 4,863,456; gzip estimate: 1,542,549. The source GLBs, Blender scenes and failed prior evidence remain in the documentation tree, outside deployed assets.

Final environment includes a continuous limestone coast, planted civic terraces, connected landmark approaches, spring bridge and waterfall, a 6.6-deep cavern, inward-facing rock enclosure and structural ribs, two connected gallery levels, 252 delegate places, a wide central aisle, presidential dais with globe/laurel and walnut acoustic panel, and four independently animated glass lifts. Canonical route transforms and landmark plot centers are retained.

The mission uses ten charges in batches 3 + 5 + 2. Circular chain blasts, the main dust plume and water impacts lead to a finishing blast and eight-second robot construction. Two replay bugs were fixed: presentation rewind now resets the sequence baseline, and delayed canonical completion queues construction even when the animation sequence number is unchanged. Reduced motion snaps directly to the correct state.

Final independent construction review: qa/reviews/complete-v02-independent-final.json. The excavation funnel clears at build start; full-size geology supports emerging structure; shoreline rocks now meet the exterior cliff. No blocking issue in the reviewed frames. Minor unfinished-state shaft apertures and the simplified reference likeness remain explicit visual limitations.

Final model evidence: release-v2-* has 17 views per model; release-stages-v2-* has 18 frames per model (L1–L3 at stage zero and all five reveal stages). All four public copies pass geometry, additive levels, five-stage transitions, material batching, footprint, and owned-cache teardown/remount checks. Runtime exception and replay regressions are checked by check-island001-v2-runtime.mjs. Final consolidated engineering results live in STATUS.md and qa/reviews/release-validation.json.


Final validation completed: 2,043 service tests pass; full-project TypeScript and production Vite build pass. The full-project checker caught two review-harness boolean options; they now use the typed target/current values (equivalent truthiness at runtime). Final dust shading uses a rough Standard material; independent review accepts the improved lobes/stem and verifies timely clearing. Focused runtime checks pass after those final edits. All four built GLB hashes and production bundle URLs match the manifest. All six comparison tabs and the final demolition-image section load without browser errors. See release-validation.json for timing, geometry-budget and physical-device limits.

## September 11 release pass

User authorized finishing optimization and pushing live, then requested richer tree greenery. Habit v03 updates the canopy only, keeps23,153triangles and preserves non-canopy geometry. Root integrated the hash-addressed public model and received independent17-view acceptance. Runtime batching, invisible-seat compaction, single-pass foam and smaller Assembly curve tessellation bring the high mission within175calls/180ktriangles. Independent review found and root fixed controller bounds and two cleanup ownership issues before final browser validation. Physical iPhone remains locked; no physical-phone claim is made.
