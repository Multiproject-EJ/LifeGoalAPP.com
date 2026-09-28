# Island 006 — first V2 iteration

Review: [before/after gallery](review/index.html). This is implemented procedural Three.js, with generated concepts clearly separated from runtime screenshots. Final V2 acceptance remains open.

## Verification
- Production Vite build passes (existing large-chunk warning).
- TypeScript no-emit check passes. Subsequent filename normalization and fish-eye/cloud numeric corrections also compile in the final production build and service-suite compilation.
- Architecture guard passes: zero violations, three existing allowlisted warnings.
- All 45 combinations of five landmarks × L1/L2/L3 × low/medium/high build with nonempty finite geometry and transforms in Chromium.
- Five fishing/dragon progression tests pass, including disaster trigger, phase order, pond clearance and repair/completion sequence.
- Final service suite: 2411 pass / 27 fail. Clean starting-source comparison: exactly the same 2411 pass / 27 fail; no new failures. See test-delta.json and logs.
- Final detail captures: 15 frames, zero page errors, source stable throughout. Final full-board captures: nine frames including reverse views and clay, zero page errors, source stable throughout.
- No gameplay state/service mutation paths added. Route, landmarks and construction tiers retained.

## Performance and limits
High-tier desktop-hosted 390×844 canvas, DPR2: baseline overview 999 draws / 193k triangles / reported 60 FPS; final 1055 / 225k / reported 52 FPS. Reverse overview 60 FPS. These are renderer overlay samples, not controlled benchmark results, p95 timings or physical-phone acceptance. Geometry increased 16.6%; mobile performance remains an open gate. First attempt reached 259k; reducing cloud tessellation brought it to 225k. The existing baseline is already over the playbook draw budget.

## Evidence caveats
The square comparison images use the existing world-factory lab without the gameplay board. The tall board comparisons use the real workbench with canonical tiles. Before fisherman close-up was occluded inside the Guild Hall; it is excluded as an invalid matched comparison. Fishing presentation camera is corrected in this iteration. Baseline clay capture failed on a pre-existing traffic-lamp ShaderMaterial color access; guarded update now permits a clean final clay capture.

Final detail source paths originally used Island6* helper names; they were renamed to stable source022 names without rendering changes before final board captures. Generated concept targets are proposed secondary references, never runtime images or approved final art. Generic img2threejs tracker was only initialized; full reconstruction pipeline completion is not claimed.

## Portrait
Only island006 voyage portrait and its manifest entry were refreshed. The standard celebration-route capture stalled; final canonical workbench canvas was used instead, with the same 96%-square center crop and 256px WebP output. Correct fingerprint passes the voyage portrait test.

## Remaining artistic work
Independent reviewer approves presentation as iteration one only. Clouds need a more organic silhouette; paving and foundation edges remain coarse; dragon torso, wing-root seams and underside head transition need further sculpting. Compare against generated target before calling this V2 complete.

## Isolation
Branch codex/island-006-v2-20260928, dedicated worktree. Claude's shared checkout was not edited. No merge or deployment. Local Vite preview on port5186 remains available for review.
