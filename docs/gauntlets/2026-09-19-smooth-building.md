# Smooth building loop — execution contract

Authority: Eivind's 2026-09-19 request supersedes the old per-beat/no-cross-level product restriction. Canonical state, affordability, tutorial and island-completion gates remain authoritative.

Outcome: hold-first construction, fewer interruptions, no full Three.js scene teardown at each level; affordable orange full-landmark and blue full-construction actions with exact displayed prices; roughly one-second fast reveal; centered title, large front-facing modal crew, colorful fireworks and dice flight.

Economy: keep existing total Money curve and discounts. Larger actions spend larger displayed totals rather than silently increasing all prices. Add one dice per newly completed construction level, committed with progress; no retroactive grants or replay rewards. Fast actions are atomic and revalidate current visit, discount, target, cost and tutorial eligibility. Island 1 Assembly is excluded. Activities/eggs/finales are never completed by construction.

Architecture: pure quotes/transitions, canonical store action, per-user action mutex, presentation-only animation. Existing progress survives. No new database schema, payment flow or external messages.

Gates: focused behavior tests for exact prices, stale quotes, insufficient funds, repeated activation, tutorial, Island 1, preserved objectives, rewards; architecture guards; type/build checks; real browser play at phone and desktop, reduced motion and input cancellation. Measure renderer stability rather than claiming physical-phone performance from desktop.

Budget/stop: inspect first; isolate worktree; do not touch unrelated WIP. Bounded tests and local builds, retry only actionable failures. Rollback by reverting task commits; no destructive migration. Keep Crystal Miners lane readability/midgame/boss-effect improvements queued behind this priority.

## Implementation and verification

Shared implementation covers all islands and L1–L3. Price simulation uses the same per-step discount rounding as ordinary building. New full-build action is locked per user and rejects stale visit/progress/expiry or insufficient balance without partial spending. Normal build batch now also uses that mutex. Level delta grants and economy telemetry use `construction_level_dice`.

Renderer findings: most authored worlds recreated their WebGL scene on each level change. Scene build-level and tile-map dependencies are now held stable during construction; additive preview still reads live canonical levels. Progress interpolates at frame cadence. Overview synchronizes on exit. Browser/device performance is not yet measured.

Input review caught hold restart races, post-blur fast-animation persistence, and tutorial hold becoming disabled after its first part. These are fixed. Modal uses the shared reference-counted scroll lock. Dice flight targets the actual counter rectangle. The crew uses existing low-quality 3D family assets in a modal canvas, with bounded DPR and reduced motion; no new raster assets.

Passed: 227 focused tests (build actions, quotes across 120 islands and 3 starting levels/cycles, duplicate actions, local hydration, mutex, sequential behavior, cost math, modal view model and board guards); scoped TypeScript diagnostics 0 for modal/action entry points; bundled edited board/renderer compile; architecture guard 0 violations; whitespace check.

Not passed/claimed: full-repository semantic check, full service suite and full Vite production build were interrupted during expensive unrelated graph/model work. Focused suite and edited-entry compilation were used to establish local correctness; full release checks remain pending. Browser automation repeatedly timed out even on inventory/reconnection calls, so screenshots, interactive play, frame stability and phone/reduced-motion visual QA remain unverified. The release validation gate remains open; this work has not been deployed. Keep local preview on 5194 for review and resume browser QA before release.

## Follow-up: 3D preview correction and tighter controls

The user correctly identified that the supplied art-preview URL still defaulted to the retired 2D board. Authored islands now use the same 3D renderer in preview and gameplay without an extra URL flag. Preview landmarks read the same per-building levels instead of silently appearing fully built. The existing explicit landmark-level art override remains. Orange/blue controls use a compact two-row layout; hold text explains release-to-stop.

Validation: expanded focused suite passes 233/233, including authored-world routing and construction renderer source contracts. The earlier production Vite bundle completed successfully (24m10s, public asset copy disabled for this diagnostic build). Full TypeScript remains pending. A browser test on the earlier 2D preview charged the exact 520 Money quote, finished L1-L3, granted 3 dice, and retained activity locks; this is economy evidence only, not 3D animation approval. Browser DOM subsequently verified Interactive 3D Island 2 (Celestial Sky Kingdom); a screenshot of the isolated real-game route verifies 3D Island 1.

Open: user is interacting with/closing preview tabs during testing, so further clicks paused pending a brief testing handoff. No completed 3D modal/mobile animation QA claim. Runtime Island 17 and 21-120 have no assigned authored 3D route; asked whether those should be unavailable or reuse a temporary 3D world. Do not silently assign duplicate worlds or claim all 120 have authored art. Release remains local and unapproved by validation.

## Assembly Crater v2 and opening-tip removal — 2026-09-20

User supplied a clipped, text-heavy Island 001 dynamite screenshot and authorized replacement. Removed the initial landmark, first-roll, keep-rolling and first-build coachmark markup and obsolete landmark-tip storage hooks. Canonical tutorial/progression state remains intact.

Replaced the mixed legacy mission markup with IslandAssemblyCraterModal and isolated CSS: fixed viewport portal, safe-area padding, bounded grid height, a transparent window over the existing 3D crater, compact 3/5/2-stage rail, supplies/progress, close plus one context-sensitive CTA. Insufficient charges returns to the board; ready detonates using the same canonical handler; completion opens the existing Assembly mandate. Added focus containment, Escape/restore, reduced-motion progress, and safe action-error feedback/telemetry. No extra renderer or gameplay persistence.

Verified: edited board/renderer bundling passes; modal scoped TypeScript diagnostics 0; architecture guards pass (0 violations, 3 legacy warnings); 233 focused regression tests pass; whitespace clean. Live DOM/screenshot confirmed opening tips removed, but HMR closed the old modal. Subsequent browser-control calls repeatedly timed out, so the v2 modal's visual framing and phone/short-screen sizing have NOT been visually approved. No deployment. The previous broad TypeScript process was stopped after an extended run; no full-repository pass is claimed.
