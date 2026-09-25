# Optical HUD — approved B / B2 direction

## Second-pass release contract

User authorized a second visual pass, live-main release, iOS update, then the next
unfinished requested item. Preserve canonical gameplay and concurrent main work;
never force-push. Inspect current render against approved B/B2, reduce foggy tube
appearance, improve edge geometry and physical materials, and verify at phone
widths. Run TypeScript, build, architecture guard and gameplay tests before release.
Verify hosted deployment separately from native build/install. Device absence or
signing failure must be reported, not described as successful installation.
Rollback is a new reverting commit, never resetting user work. Next slice is
unfinished input-progress/reward coverage; no invented reward amounts.

User approved implementation on 2026-09-24 after three image-comparison rounds.
Default Day/Dark use original B (continuous floating glass); special editions use
B2 (defined capsule recesses). Light follows the B glass family. Themes continue
to derive from the controller, never the OS colour scheme. Canonical rank controls
the portrait ring independently. Existing wallet assets and handlers are retained.

Scope: DOM/CSS presentation only; no wallet, unlock, shop or gameplay changes.
The reference images are design targets, not runtime assets or proof of parity.
Layered rims, pearl caps, inset glass, reduced-motion-safe seam pulse, festive
lights and a matte wood treatment replace the prior flat themed strip.

Review fixture: `/work/controller-release-check/topbar.html`, widths 320–430,
all eight current theme keys. Uses production CSS and money/shard assets, with
inert sample amounts and presentation-only test buttons. Actual game controls
remain in IslandRunBoardPrototype.

Acceptance: phone readability, clear tappable controls, no wallet overflow, theme
match, independent rank frame, no reward-bar/menu collision, reduced motion.
Browser verification is pending: computer-use timed out twice during this pass.
Do not describe this as visually approved or deployed until verified.

Checks: fixture JS/CSS esbuild bundle passed (public `/assets/*` retained as
runtime URLs); architecture guard passed with zero violations and three existing
allowlisted warnings; `git diff --check` passed. Full release build and visual
phone QA remain pending. No deployment performed in this design implementation.

## Second-pass evidence

Browser access recovered. Compared the first pass screenshot with the approved
B/B2 sheet: hazy tube, narrow cap strips and blurred edges were the main failures.
Replaced the housing with a small scalable SVG with authored cap profiles, optical
edge paths and themeable gradients; retained accessible DOM text and controls.
Inspected all eight themes at 390px and the compact 320px fixture. Found and fixed
clipped wallet values at 320px by using container-relative type and narrower icon
slots. Inspected the actual Island003 scene with its matching controller; opened
and closed the board menu and opened the audio menu successfully. This is an
improvement pass, not a claim of pixel-identical concept art or final user approval.

## Release verified

- Published main commit `2036552840e076f5b09bd1064af2af3bb20ab8f3`, including prior
  `f33d2aba` controller/egg/progress work. No concurrent main commits were overwritten.
- TypeScript passed; final Vite build passed; 2,303 Island Run tests passed, zero
  failed; architecture zero violations (three existing allowlisted warnings).
- Pages run `36049218023`: build and deploy succeeded. Live lazy-loaded
  `main-DQgGVl0C.js` / `main-BIOwMNpG.css` contain the optical housing, compact
  `3.5cqw` wallet fix and mission-visibility hook. The app entry chunk alone does
  not contain these features: verify the lazy game chunk, not just index.html.
- Capacitor final copy and signed Debug iOS build succeeded. Signed app entrypoint
  and its three entry assets hash-match final dist. First device install failed
  on an interrupted connection; same in-place retry succeeded on paired iPhone.
  Device launch was denied because the phone is locked. User must unlock/open
  HabitGame; on-device visual/interaction sign-off remains pending.
- Next encounter-progress slice is separate local work, not part of this release.
