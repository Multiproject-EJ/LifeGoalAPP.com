# Frostwell and forest refinement — September 13

User authority: improve the Iceworks itself because it looked unchanged, and make the island's trees more interesting and higher quality. This reopens only those parts of the previous local V2.

## Changed

- Frostwell: four braced gantry faces, enclosed operator crown, folded-roof winter workshop, insulated reservoir with access ring, and an open-front processing room with sorting bench and fish beside the deep water. Existing drill, lifts, net, water flow, mission state and commissioning remain on their original runtime roots.
- Its completed inspection camera now fits the taller crown above the deep section. Live cutter-following camera remains unchanged.
- Both older cone pines and the first V2 firs use one shared tree family: open bough volumes, uneven branch heights, exposed leaning trunks, three silhouette variants and rounded, supported snow loads. Static planting stays material-batched and wind-driven trees retain their original animated roots.

## Evidence

[Before / after the refinement](before-after.html) compares the previous V2 with this revision. The original V1/V2 comparison is retained separately.

The initial candidate is preserved at `runtime-v001`. Independent review required one correction for repeated snow chevrons, a clipped operator crown and the unchanged lower hut. The corrected eleven-view set is `runtime-v002`: independent minimum 0.85, governing improvement 0.74 → 0.85. See `INDEPENDENT-REVIEW.md`. No landmark, board or terrain edits.

`model-checks-v002.json` passes the existing Frostwell/Frostmoon presentation tests and all three quality tiers: finite geometry, grounded height/footprint bounds, per-tree topology bounds and economical static material batching. Supplemental side/rear facility capture V002 hit a screenshot timeout and its saved frame had the wrong camera. V003 was stopped after that finding. V004 explicitly selects and verifies the Frostwell inspection preset: all three views pass independent contact review (minimum 0.85), with stable source and image hashes. Failed/aborted evidence is retained.

The first refinement overview used about 111k triangles. The corrected overview uses about 87k, versus about 77k in the previous V2. Snapshot frame rates do not prove a performance improvement. The 175-call ceiling and physical-phone acceptance remain open and unwaived. The five-view before/after gallery passes its image-loading and 390px layout checks (`gallery-check.json`). The final repository-wide TypeScript check passes. `delivery-receipt.json` records the checks and final source hashes.

## Final local profile

The isolated 30-second High run has stable source hashes and no page errors: 50.2 FPS, p95 33.4 ms, 18.7% slow frames, 311 peak calls and 87966 peak triangles. This remains a local diagnostic, not physical-phone acceptance. The 175-call ceiling, p95 ≤29ms and slow-frame ≤15% targets remain unmet; no release waiver is claimed.

## Production publication

The user subsequently instructed “okay push to live.” This refinement and the complete Island003 V2 shipped in commit `918799c2` through successful GitHub Pages run34767872141. Hosted compiled assets were verified. See `../qa/release-20260913/deployment.json` and `live-verification.json`. This publication exception does not turn open performance or physical-phone checks into passes.
