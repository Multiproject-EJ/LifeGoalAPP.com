# September 13 refinement validation

Scope: Frostfire Archive interior-first construction, shared standard construction framing/scale continuity, and mission-phone upgrade/activity counts. This is not whole-island V2 or release acceptance.

## Passing checks

- Full Island Run service/contract suite: 2,090 passed, 0 failed. The earlier run retained one now-corrected obsolete L1 roof-crest expectation.
- TypeScript: `tsc -b --pretty false`, exit 0.
- Architecture guard: zero violations; three existing allowlisted warnings.
- Production Vite build: exit 0. Existing large-chunk warnings remain; no performance waiver.
- Archive focused checks: funded mesh geometry/transforms retained across levels, hollow room, table-book contact, interior stages, roof/crest/stack stage 5.
- Independent Archive macro and furnished phone reviews: each minimum 0.85. See the versioned `.img2threejs/island-003-v2/frostfire-interior/` reviews.
- `shared-continuity-v009/capture.json`: four successful source-stable standard phone cases, Island 003 Boss/Wisdom, Island 001 Hatchery, Island 002 Habit reduced motion. Settled finale width ratios all 1.000. The run later failed on Island 015; the run as a whole is incomplete.
- `shared-continuity-v010/capture.json`: Island 003 desktop ratio 1.000, plus phone objective reachability, untruncated labels, non-overlapping footer and scroll-to-footer checks at 390×844, 360×640 and 844×390. Use `*-scrolled.png` as settled phone evidence. The initial landscape screenshot captured the opening frame before content painted; it is excluded from visual acceptance.

## Preserved failures and limits

- v001: hidden developer-control locator; v002: canvas disappeared during reload. Neither establishes a pass.
- v003: earlier first-case continuity pass and early phone layout; superseded by the corrected responsive layout.
- v004/v005 phone: portrait readable; independent review rejected landscape truncation/insufficient footer evidence. Superseded by v010 settled frames.
- v006: developer reopen control timed out. No complete records.
- v007: boss passed; Archive ratio 1.0266 exceeded 1.025. Diagnosis: developer review unlocked the camera while canonical review locks it. The fixture now mirrors the production lock; v009 passes both exactly.
- v009 Island 015: specialized direct palace preview emitted a NaN bounding-sphere warning and timed out before construction evidence. Read-only comparison finds the same early fallback-room/cache initialization in HEAD; this suggests a pre-existing preview initialization issue. HEAD was not browser-reproduced, and the exact warning origin is not proven. No Island 015 pass or universal specialized-camera claim.
- v011: Chromium launch timed out before creating a page. No additional runtime changes or acceptance evidence. The capture script now waits for the actual open phase and painted content on future runs.
- The phone service fixtures do not inspect the user's private save. No physical target phone or whole-island performance acceptance was performed. Keep/ocean/Frostwell/Moonwell V2 scope remains open.
