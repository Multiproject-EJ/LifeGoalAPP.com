# Independent shared-fixes review

Reviewer: `build_modal_review`. Verdict: **accept the bounded standard-preview continuity and settled mission-phone layout fixes**, with the exclusions below. No production publishing or whole-island approval.

## Accepted evidence

- `shared-continuity-v009`: Island 003 Boss and Wisdom, Island 001 Hatchery, and Island 002 Habit with reduced motion, at 390×844. All four recorded review-to-celebration projected-width ratios are exactly **1**. Preview remains visible, board source stays hidden, stage Y remains zero, and grounding error is zero.
- `shared-continuity-v010`: Island 003 Boss in the 1280×800 desktop-hosted template, also with projected-width ratio **1**. The template still embeds a portrait game viewport; this is not a full-width desktop gameplay-layout test.
- `shared-continuity-v010/mission-phone-390x844-scrolled.png`, `mission-phone-360x640-scrolled.png`, and `mission-phone-844x390-scrolled.png`: independent pixel inspection confirms readable Build Landmarks **5/5**, separate Complete Landmarks **0/5**, and the **33%** footer. Landscape labels and counts now stack without truncation; scrolling reaches the footer (recorded scrollTop 80, clientHeight 304, scrollHeight 384).
- Recomputed hashes for every recorded construction and phone source match current files. Both evidence manifests report no page errors. Only the successful listed records are accepted; an empty error array does not establish completion of an interrupted run.

## Source findings

The shared renderer prepares the preview before acquiring its work camera lock, preserves the centered preview through the finale, removes the second whole-stage jump/scale animation, and applies one bounded additive commissioning beat. Frostmoon hare masking runs after ambience animation and restores the appropriate visibility on exit. The tracker separately counts funded L3 buildings and completed activities, preserving the requirement for both before final completion.

The change provides approximately **20% closer framing** and a source-defined **4% additive overshoot**, without compounding level geometry. It does not promise 20% geometric growth after each upgrade.

## Explicit limits and excluded evidence

- All captured commissioning samples in v009/v010 equal 1. These runs prove settled continuity, not observation of the pulse peak. Peak bounds are supported by the helper implementation/tests, not these screenshots.
- Construction evidence uses developer presentation fixtures, not actual paid gameplay actions or the full live build-modal controls. Island 001's foreground board symbol partially occludes its screenshot; universal composition quality is not approved here.
- The initial v010 landscape phone frame is excluded because it preceded open-state paint. The settled scrolled frame is accepted.
- Root reports v011 Chromium launch timed out before page creation. It supplies no additional browser evidence; no retry was undertaken by this reviewer.
- **Island 015 is unverified and has no pass.** The direct construction fixture timed out without publishing construction evidence and emitted a NaN bounding-sphere warning. Read-only source comparison found a pre-existing initialization path: construction initializes before palace binding; non-boss fallback room anchors contain zero renderable leaves; cached preview keys omit runtime/source identity and are not invalidated after binding. Empty bounds can feed invalid transforms. The same order/cache logic exists in prior HEAD; ready-runtime additive tests do not cover this mount path. This is a strong source diagnosis, not a browser reproduction against prior HEAD or proof of every warning's origin.
- No physical iOS/Android device, performance budget, full island visual, or release-check waiver is granted.

Archive furnished-interior acceptance is separately recorded in `.img2threejs/island-003-v2/frostfire-interior/interior-final-modal-v004/independent-review.json`.
