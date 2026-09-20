# Opening-show implementation — local, not released

The user chose to continue the full approved experience, not a palace-only
partial release. No additional scope-choice question is needed.

Final local validation: full TypeScript check passed; all **2,165 service tests
passed**, zero failed; production Vite build completed. The first full run
had four stale source-string assertions for the old camera/routing/reward
expressions. Those assertions now check the new cohort/show conditions while
retaining the old-path guarantees; the rerun is clean. Large-chunk advisory
warnings remain. See `local-validation-20260920.json`. This is not live acceptance.

## Implemented

- Twelve-second, skippable in-world sequence: welcome, beacon ignition, warm
  palace windows, two restrained offshore particle bursts, reward-channel
  introduction. The corrected show uses three drawables, fewer than 500 mesh
  triangles and 96 tapered spark trails. It owns no event clock, gameplay
  ledger or reward grants.
- Existing canonical `light-beacon` action saves first; only then does the
  presentation run. Reward bar and First Game launcher stay hidden during the
  show and reveal afterwards. Skipping merely finishes presentation.
- Quiet 1.8-second reduced-motion equivalent: steady beacon, no fireworks,
  no camera movement. Caption and explicit Continue remain available.
- If the palace exists, the beacon uses its supported lower balcony. Palace
  completion is not a mission prerequisite: before L1, the funded Event Arena
  hosts the beacon instead. The camera starts at that venue, then widens for
  the offshore celebration. No structure or board route is moved.
- Portal-owned viewport captions, focus trap, Escape/Skip, scroll lock,
  autoroll pause and narrative/modal arbitration. Window materials restore
  their original emission when the show finishes, is skipped or unmounts.
- Explicit new-campaign records now route 3D source 004 to ordinal 002 and
  source 002 to ordinal 004. Unmarked legacy and explicit art previews retain
  existing visual sources. This does not migrate saves or enable enrolment.
- The inaugural-game button glows without continually moving. Its reward-bar
  introduction uses a light fade instead of the legacy four-spin animation.

## Evidence and limits

- `scripts/check-opening-show.mjs`: 11 passing timeline/runtime tests, including
  all phases, finite geometry, bounded cost, quiet mode, L0 arena fallback and
  restoration on skip/finish/disposal and portrait burst framing.
- `scripts/check-island-feature-introductions.mjs`: 410 passed, zero failed,
  including the subsequent Island001 orientation and early-ticket-boost guards.
- Architecture guard: zero violations; three existing allowlisted warnings.
- The earlier corrected welcome-fixture full typecheck (session 73830) passed.
  It predates final show integration. Show integration typecheck session53509
  subsequently passed with exit0; the later orientation has its own typecheck.
- `opening-show-ui-v001` is **failed evidence**, not approval. The beacon and
  skip/reveal flow worked without page errors, but the legacy first-game button
  bounced continuously and failed the normal-motion click stability check.
  Its early screenshot also exposed the empty-plot camera at palace L0.
  Those two issues were corrected. v002 then failed on the guided Signal Path's
  continuously scaling tap target. Only the introductory target now uses a
  stationary glow; ordinary puzzle animation is unchanged.
- `opening-show-ui-v003` passed the actual normal-motion mobile flow, zero
  page errors: preparation, show/skip, reveal, cancellation without grant,
  reload/resume, actual guided game, exactly three tickets and no reload replay.
  This is desktop-hosted offline QA, not a physical phone.
- Root visual inspection found v003's fireworks outside the phone framing.
  The two burst centres moved from x=±8 to ±3.6 without moving the camera/board;
  particle size increased from .075 to .14 for phone readability. A projection
  regression now covers four sampled times. v004 failed waiting for celebration
  during concurrent source edits/slow execution, with no page error; preserve
  it as a failed attempt. v005 also missed the transient phase and failed.
- `opening-show-frames-v001` uses controlled Date.now with the actual renderer
  and real RAF/timers to capture the short phases reliably. Automatic reveal
  passed. Independent review rejected the weak flame (.62) and fireworks (.58).
  One correction made the flame tapered cream/orange and sparks saturated
  colored trails. No camera, board, palace or effect position changed.
- Corrected `opening-show-frames-v003` passed automatic reveal and independent
  still-frame review: lowest applicable .86, flame .87. v002 failed before the
  show because it measured the mission phone during its entry animation; the
  test now waits for the viewport bounds. Base contact, continuous motion and
  physical-device performance are not established by these still frames.
- `opening-show-quiet-v001` passed the reduced-motion, unbuilt-palace variant
  and automatic reveal with no reward grant. It predates the flame-only visual
  correction; the final quiet runtime contract remains covered by unit tests.
- Island001 orientation: `orientation-ui-v003` passed actual 3D venue tap,
  viewport portal/scroll lock, wrong answer, cancel/reload, completion/reload
  and unchanged currencies/eggs/tickets. It is a returning-player fixture with
  old narrative beats marked seen, not fresh-session narrative acceptance.
  v001 used a hidden 2D button and failed; v002 reached the new dialog but a
  queued legacy narrative intercepted reopening. Both failures are preserved.
- Full orientation typecheck (session39676) passed. Final visual/title edits
  have a subsequent validation run; do not confuse earlier passes with final.

This is the core animation, not a completed festival environment. Audience and
flag dressing, boat arrivals/the royal ship, continuous coast and integrated
gardens are still outstanding. No floating mega-arena has been built. No
physical-device performance, final release build, deployment or archive is
claimed. New-campaign enrolment, full narrative/content routing and remaining
early-progression release gates must still be completed before rollout.
