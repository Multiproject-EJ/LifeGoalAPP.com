# Island 003 V2 — independent integrated visual review

Reviewed 2026-09-13 by the independent `build_modal_review` agent. Runtime was not modified and no browser or compiler was launched for this review.

**Current action: approve the bounded integrated visual slice.** The corrected world finish and final focus presentation pass. Physical-phone performance and the 175-call High ceiling remain open release gates. This approval does not reopen the approved landmark macro families or reset their correction counts.

## Final v003 correction review

Inspected `runtime-v2-final-v003/overview.png`, `hatchery.png`, `habit.png` and `wisdom.png` after the single focus-opacity correction. The central Keep is fully restored in ordinary overview and the translucent faceted foreground is absent in all three corrected focus views. Entrances, egg nests, court and Archive approach are unobstructed. Scores: overview **0.86**, hatchery **0.88**, habit **0.87**, wisdom **0.88**. The previously worst view gains **0.10**; no scored regression is observed. The other eight v002 views retain their prior bounded acceptance; final combined required-view minimum is **0.85**.

Verified every one of the eleven v003 PNG hashes against `runtime-v2-final-v003/capture.json`. Its 133 source hashes match start/end and disk at review time, with no changed sources or failures. The only source difference from v002 is `Island5ThreePilot.tsx`, containing the focus-opacity cleanup. The four correction views were visually reinspected; this does not claim a second pixel review of all eleven v003 PNGs. The original failed scores below are retained as audit history.

## Evidence and provenance

Inspected all eleven full-resolution PNGs in `docs/gauntlets/island-003-v2/runtime-v2-final-v002/`: overview, keep, hatchery, habit, wisdom, event, left, right, survey, night and frostwell. Compared the corrected world against `docs/gauntlets/island-003-v2/concepts/02-frostmoon-frozen-ocean-goal.png` and the prior rejected finish in `runtime-v2-final-v001/overview.png` and `keep.png`.

The v002 manifest records High quality, a 390×844 CSS viewport at DPR 2, branch `codex/island-003-v2-20260912`, HEAD `721504a403375f03f5e1adf9e5c65bc5c0e4d2b5`, and no failures or changed sources. All eleven PNG SHA-256 values were independently verified. All 133 source hashes matched start versus end and current disk at review time. Capture status is correctly `captured-unreviewed`, with visualAcceptance false.

## Required-view scores

Scores judge source identity, supported contact, frozen-world state and usable presentation within the approved procedural style. They are not image-IoU scores or an assertion of photorealistic equivalence.

| View | Score | Finding |
| --- | ---: | --- |
| overview | 0.86 | Keep dominates; five landmarks, route, fir banks and deep connected ice shelf read together. |
| keep | 0.87 | Layered gables, paired turrets and supported ridge rings remain clear; irregular roof drifts replace repeated plates. |
| hatchery | 0.78 | Eggs, entrance and corrected nest contacts are visible, but a large translucent faceted Keep crosses the lower foreground. |
| habit | 0.80 | Gate, exercise rings and court are readable; translucent Keep overlaps the approach and bottom of the gate. |
| wisdom | 0.82 | Closed roof, crest and inspection action are clear; translucent Keep still crosses the lower-left foreground. |
| event | 0.87 | Front approach, arch/crown connections and opaque cold basin are readable. |
| left | 0.85 | Keep remains dominant in three-quarter view; shelf depth and connected snow banks remain coherent. |
| right | 0.85 | Side wing and turret support read; Moonwell and court stay distinct from central mass. |
| survey | 0.85 | Whole island hierarchy and continuous frozen surroundings remain legible at distance. |
| night | 0.85 | Warm occupied landmarks contrast with frozen terrain; route and main silhouettes remain visible. |
| frostwell | 0.86 | Engineered deep section, auger, reservoir, lift and lower fishery read as one supported system. |

Worst view is **0.78**, below the required 0.85. Do not average the failed focus views into a pass.

## Correction and accepted finish

Hide the occluding central Keep fully while these front outer focus cameras are active, preserving its normal overview appearance and restoring it when focus ends. Recapture the affected three focus views and an ordinary overview under stable source hashes. No landmark geometry change is necessary.

The prior finish blockers are resolved: the broad uninterrupted dark upper belt is gone; connected faceted blue ice now communicates substantial depth; the distant crag has connected snow shoulders instead of detached cap disks; Keep snow uses irregular drifts. The finish correction improved the weakest prior appearance dimension from about 0.60 to 0.85. The regular shelf bands and sparse ocean-surface relief remain a simplified interpretation of the richer concept, not a claim of identical detail. No new structural contact or state-readability veto was observed in the other eight views.

## Limits and release gates

- These are development phone-viewport stills, not physical-phone captures, and do not establish animation smoothness or authenticated gameplay behavior.
- Snapshot metrics range from 84 to 306 calls and 11k to 77k triangles. Overview is 306 calls; night is 304. These exceed the contract's 175-call High starting ceiling. No performance budget or physical-device gate is waived; a lower triangle count or reported 52–60 FPS does not make the call ceiling pass.
- Frostwell's full timed sequence, all fifteen construction states, thermal half/hot animation, Archive open/roof-last sequence and shared modal/mission-phone behavior retain their separate evidence and limitations. A static final world cannot replace those checks.
- Whole-world material/style review does not certify vehicle clearance, payload size, reduced motion, low-quality behavior or final publication readiness. Previously scoped geometry-preservation checks remain authoritative, including the explicitly approved narrow Snowfeather L3 rail/spot exception.

The v003 correction evidence closes the bounded integrated visual gate. It does not close the performance, physical-device, motion, gameplay or publication gates listed above.

## Final controller/state evidence supplement

`qa/all-fifteen-builds-final-v002/capture.json` reports all fifteen Island 003 L1/L2/L3 cases passing, each with finaleWidthRatio exactly 1, plus three phone layouts and no errors. All recorded source hashes agree across cases and match disk. Independently spot-checked the Archive L3 review/celebration PNG pair: roof closed, pose/size stable, no finale jump. The settled 360×640 and 844×390 phone PNGs show distinct Build Landmarks 5/5 versus Complete Landmarks 0/5, with the 33% footer reachable and readable. This is a spot-check plus manifest review, not a claim to have visually replayed all fifteen builds or verified the peak pulse from stills.

Inspected all seven `qa/frostwell-mission-v2-final-v002` PNGs. Launch, close drilling view, startup, completion, inspect and reduced completion states are readable and viewport-contained at the primary phone size. Readability scores: launch 0.90, drilling close-up 0.88, startup 0.86, completion/reduced 0.90, inspect 0.87. Manifest source start/end and current source match; errors are empty and reopenComplete, escapeCloses and reducedSettled are true. The 360×640/844×390 layout assertions are metadata, not additional inspected screenshots.

**Timing evidence remains limited:** `02-spin.png` already depicts drilling, and `03-descent.png` already depicts startup. Their filenames must not be used to claim exact phase timing or a visually reviewed wheel spin. Phase-locked replacement keyframes are pending. The recorded WebM has not been independently played by this reviewer; state-readability approval does not certify temporal smoothness.

### Correctly identified Frostwell keyframes

`qa/frostwell-keyframes-v002` supersedes the mislabeled phase stills for gallery use. Independently inspected all four PNGs and verified their hashes: launch “What lies 500 metres below?” (0.90), descent “Into the blue” (0.88), startup “The iceworks awaken” (0.85), and complete “Life beneath the ice” (0.90). Manifest phase headings match visible content, source start/end agree, current source hashes match, and errors are empty. **Approve this bounded keyframe/state-readability slice; worst 0.85.**

The descent auger tip and illuminated target stay above the bottom tray. Startup clearly shows the reservoir, outlet, supports and depth section; the upper rig crown is cropped during this close transitional view and the lower business is partly behind the tray. Later full-system inspect evidence is therefore still necessary and is supplied separately by `frostwell-mission-v2-final-v002/06-inspect.png`. Completion actions and result remain clear.

These four images freeze Playwright's clock. They establish accurate phase-specific composition, not live pacing, wheel-spin motion, or frame-time smoothness. The earlier live WebM is a distinct artifact and has not been independently played by this reviewer. Physical performance remains open.

### Restoration focus closure

`qa/restorations-focus-v004` closes the separately discovered Snow Hare obstruction in open Archive inspection and Moonwell thaw. All six corrected PNGs were independently viewed and hash-verified, with source start/end/current matches, no errors and restored Archive enclosure. Scores are 0.86–0.90; worst improvement is +0.11. See `RESTORATIONS-INDEPENDENT-REVIEW.md` for exact state and evidence limits. The mid-thaw composition uses a paused clock at recorded progress 0.458, with successful interruption to 1.000; it is not represented as live-motion proof. No visual or state-readability blocker remains in these bounded reviewed slices. Release/performance and unreviewed live timing gates remain open.
