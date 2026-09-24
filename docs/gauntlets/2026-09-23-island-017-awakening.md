# Island 017 — The Titan's Last Thought

User-approved scope: extend the eight-section spine mission with a free potion
puzzle, a 3D skull summoning, eye-ring / tooth-channel / lens puzzles and spirit
release. Approval: “great, implement it please”, following the player-loop proposal.

The centrally hovering skull is the existing `titan-skull-boss-v027.glb`, named
rear Titan in code. Reuse this original shipped model; no new external assets.

## Execution and evidence

1. Canonical cycle-scoped puzzle state, sanitization and monotonic conflict merge.
   Preserve completed legacy spine missions; no additional currency/rewards.
2. Free, resumable, phone-sized controls and a viewport-portal dialog with scroll
   lock, focus handling, optional hints and reduced-motion presentation.
3. Shared 3D reveal/mechanisms in world and inspection view. Empty well before
   summoning; solved geometry and spirit persist. Replay is presentation-only.
4. Service tests for ordering, stale/concurrent input, hydration, cycle isolation,
   legacy completion and wallet invariance; renderer motion tests; typecheck,
   build, architecture guard, gameplay suite and honest browser captures.

No deployment, unrelated scenery rebuild, new economy, external assets or
physical-phone approval. Existing landmark activities and rewards remain canonical.
New saves require release; legacy already-completed spine saves may play the
extension optionally. Incomplete legacy saves keep all eight-stage progress.
Use the existing JSON mission ledger; no database migration.

Rollback: revert this scoped change; the original spine fields remain compatible.
Stop only for an unresolvable blocker or a material change to the approved loop.
Phone performance and aesthetic acceptance are reported separately from tests.

## Implementation checkpoint — September 24

Implemented the cycle-scoped extension, canonical action with visit/revision
checks, monotonic hydration/merge, phone/departure integration and first-throw
briefing. Added a shared 3D sculpt mechanism, potion/pour, hinged jaw/crown,
constellation and persistent spirit. The inspection dialog uses a viewport
portal, scroll lock, focus trap, keyboard alternatives, free hints and reduced
motion. Background Island 017 rendering pauses while the inspection owns the
screen. No new creative assets, currency awards or deployment.

Developer preview: `/titan-awakening-preview.html` (DEV only, isolated local
`demo-island017-awakening-preview` record). The existing template kit also has
**Play skull puzzle** and **Reset puzzle preview** controls for Island 017.
The latter resets only that isolated fixture. Production actions always use the
real canonical session and require all eight existing spine sections.

Confirmed so far: 6 new awakening tests, 53 signature-mission regressions and
11 completion regressions passed through the bundled TypeScript test runner.
The new UI and Three.js modules pass a focused TypeScript check. Architecture
guard: zero violations and three existing allowlisted warnings. Full-project
checks were exceptionally slow; do not infer a full-suite pass from these results.

Browser verification is blocked: repeated automation timeouts ended in
`Sky Computer Use native pipe startup failed`. No new screenshots were captured;
no claim of rendered phone quality, loaded-scene performance or final art
acceptance is made. The original v027 sculpt is retained and reused, but its
hinged cut surfaces and face/mechanism alignment require visual inspection.

Resume visual QA at 390×844: brew Bone → Ember → Mist, pour, turn left eye right
and right eye left, align teeth to 2/0/1, lens to 4, release. Check wrong attempts,
close/reopen, reload between puzzles, keyboard controls, reduced motion, replay,
return to island and all-buildings-complete departure. Save overview/left/right/
rear evidence after opening the crown. Do not deploy without explicit authority.

Final local checkpoint: all 75 targeted tests passed (6 awakening, 53 signature
mission, 11 completion, 5 Island 017 scene tests). Final scene tests include
rigid-mesh batching and instanced teeth and pass the existing mobile draw-call
budget. Focused UI/renderer TypeScript check passed. A subsequent small GLTF
bind-pose fix uses authored hinge pivots when assets load after saved animation
state has been applied; browser inspection of this remains outstanding.
Production Vite build completed successfully with chunk-size warnings, but its
snapshot predates the final renderer optimization; it is not validation of the
exact final tree. The broader import-graph TypeScript run was stopped after
prolonged execution without diagnostics; whole-project type acceptance remains
unconfirmed. Browser/phone visual acceptance remains blocked as described above.

## September 24 tactile eye-to-jaw revision

User review rejected the abstract controls and hidden solutions. Authorized
scope for this pass: prove a discoverable eye-to-jaw sequence before extending
that approach to the remaining puzzles. The inspector now offers orbit/zoom,
front-facing eye/jaw picking and an explicit accessible inspection entry.
Interactive SVG close-ups show brass eye rings, moving beams, carved sun
receivers, their routes to the jaw latch, a downward pull handle and sliding
teeth with continuous channel geometry. Light propagates only to the first
broken groove. Pointer drags commit through the existing canonical action;
keyboard controls share that path. Camera, inspection and gesture drafts are
presentation-only. No saved schema, currency or completion-rule changes.

Verification: focused modal/renderer TypeScript check passed; 8 awakening tests
passed, including all 16 eye combinations and all 27 tooth combinations against
the canonical latch gates. Architecture guard passed with the same 3 legacy
allowlisted warnings. Browser verification now works: inspected eye and tooth
layouts at 390x844, tested locked jaw, solved both mechanisms with keyboard,
reloaded a partially positioned tooth and verified persistence, continued
through the existing constellation to spirit release. Temporary viewport reset.
A development hot-reload duplicate-createRoot warning was found and the preview
entry updated to reuse its React root across HMR.

This is NOT live-ready acceptance. Close-ups are SVG mechanisms, not a seamless
3D manipulation camera. Direct pointer drags, pinch/orbit, 3D picking, physical
phone performance and real-board entry/departure still need end-to-end checks.
Potion and constellation exploration redesigns remain outside this first slice.
The earlier whole-project build/typecheck gap is still open. No deployment.

## September 24 object-clue completion pass

The remaining abstract controls were replaced after the same user review. The
potion now starts from the whole vessel: the player opens a bowl inspection,
brushes ash from three numbered rim carvings and matches their visible glyph
order to shuffled bottle seals. Ingredient names remain accessible, but the
object supplies the answer. The constellation is now a two-sided crown disk.
Its front deliberately lacks a guide; turning it over reveals a faint seven-star
etching that the player traces, then carries back as a ghost outline while
rotating the front lens. The status reports how many stars overlap and enables
the center only at the canonical alignment. Eye rings and the lens accept both
angular taps and drags; tooth tracks accept level taps and drags; keyboard
alternatives still use the same canonical actions.

Verification on the isolated local record: complete no-hint keyboard
playthrough from concealed potion carvings through spirit release at a 390x844
browser viewport; refreshed and resumed saved state; captured phone-size potion,
constellation and sanctuary views. Nine focused awakening tests pass, including
all eye/tooth/lens gate combinations and pointer-detent mapping. Focused
TypeScript passes, `git diff --check` passes, and the architecture guard remains
at zero violations with three existing allowlisted warnings. The preview HMR
root is reused across reloads.

Live readiness is still gated on direct touch/drag and pinch testing on a
physical phone, entry and departure from the real Island Run board, and a build
from the exact final tree. The final sanctuary sculpt also needs subjective art
approval: its opened jaw/crown silhouette reads more mechanical than skeletal
in the current phone capture. No deployment.

Exact-tree follow-up: the production Vite bundle completed successfully in
48.28 seconds with the repository's existing large-chunk and mixed-import
warnings. The full Island Run service suite then completed with 2,294 passing
tests and zero failures. Browser viewport was restored after 390x844 review and
the isolated preview was reset to the unopened bowl for the next reviewer.
The remaining live gates are physical-device gestures, real-board entry and
departure, and subjective final-sculpt approval; build and service regression
gates are now green.

## Live-release authority — September 24

Eivind explicitly instructed: “finish it and push to live when done.” This
authorizes integrating the completed Island 017 awakening work onto the latest
`origin/main` and allowing the repository's GitHub Pages workflow to publish it
to LifeGoalAPP.com. The final presentation pass replaced the rectangular mouth
cavity with an oval recess, tapered the three interactive teeth and lets the jaw
and crown settle toward a more skull-like sanctuary pose after the spirit's
flight. Release still preserves legacy completion, awards no extra currency,
uses no new third-party asset, and introduces no database migration.

Required release evidence on the integrated latest-main tree: full Island Run
suite, architecture and audio guards, full `npm run build`, then successful
GitHub Pages deployment and a live-site asset/behavior smoke check. The user has
authorized publication; no further publish confirmation is required.
