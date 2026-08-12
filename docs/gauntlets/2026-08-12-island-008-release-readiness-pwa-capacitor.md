# Island 008 release-readiness — PWA and Capacitor iOS

Date: 2026-08-12
Branch: `codex/island-008-everblossom-kingdom`
Scope: Island 008 implementation and its integration into the existing PWA and Capacitor iOS shells.
Authority boundary: validation, a scoped local commit, and a paired-device release-candidate smoke are authorised; no merge, push, PWA deployment, TestFlight upload, or App Store submission.

## Decision

Island 008 is build-safe for inclusion in a release candidate on both the PWA and Capacitor iOS targets. It is not yet enough evidence to call the whole application ready for an App Store production submission.

The remaining blockers are either release-process gates (scoped commit, clean release branch, physical-device smoke) or pre-existing whole-app policy/backend gates documented in `docs/app-store/IOS_RELEASE_READINESS_AUDIT_2026-07-13.md`. No Island 008-specific native compile or PWA cache failure was found.

## Evidence completed

- TypeScript project build: PASS.
- Production Vite build: PASS. Existing dynamic-import and large-chunk warnings remain.
- Island Run architecture guard: PASS with zero violations and three existing allowlisted warnings.
- Island camera-template validator: PASS.
- Island visual-production brief validator: PASS.
- Island art asset and render-wiring validators: PASS.
- Mobile runtime image validator: PASS; 16 release-relevant assets remain within the 550 KB budget.
- Full Island Run suite: 1,729 passed and the same three pre-existing Island 001 visual-contract failures remained. Island 008's contract passed.
- Production PWA browser boot: PASS with no online warning or error logs.
- PWA offline shell/navigation: PASS. After stopping the production preview server, a new `/privacy` navigation loaded from the service-worker cache. The subsequent service-worker update error was expected while the server was deliberately offline.
- Capacitor iOS sync: PASS with seven plugins detected.
- `dist/index.html` and `ios/App/App/public/index.html` SHA-256: identical.
- `dist/assets/Island5ThreePilot-DRc16yKF.js` and its Capacitor copy SHA-256: identical. This lazy chunk contains the Island 008 runtime integration.
- `Info.plist`: PASS (`plutil -lint`).
- iOS icon: 1024 × 1024 RGB PNG without alpha.
- iOS launch asset: 2732 × 2732 RGB PNG without alpha.
- Unsigned iOS Simulator Debug build, iOS 15 deployment target: PASS (`BUILD SUCCEEDED`).
- `git diff --check`: PASS.

## Island 008 residual risks

- High-quality desktop-browser overview evidence reported approximately 46 FPS, 655 draw calls and 178k triangles. Adaptive quality remains enabled, but the draw-call count is above the playbook's ideal target.
- The img2threejs silhouette diagnostic is strong (`0.9264` IoU), but the material-color gate remains open: maximum Delta E `48.55` versus the `20` threshold. Both reference and render are non-isolated images, so the diagnostic includes background/UI pixels; do not record the material pass as complete.
- Final acceptance still requires several representative rolls, landmark focuses, background/foreground transitions and a return to overview on a physical iPhone using the synchronized release candidate.

## Whole-app blockers that Island 008 does not resolve

These do not prevent reviewing or merging the Island 008 code, but they prevent claiming the entire app is ready for App Review:

- External Stripe/digital-goods checkout must be hidden in the iOS release build or replaced with Apple In-App Purchase.
- Production Supabase auth, session restoration, account deletion, RLS and storage deletion require live end-to-end verification.
- App Privacy answers, AI feature scope, age rating, public URLs and reviewer access remain release gates.
- Native reminder behavior must be fully tested or omitted from release claims.
- Internal TestFlight and physical-device lifecycle/offline/reconnection testing remain required.

## Safe promotion sequence

1. Create one scoped Island 008 commit from the intended source, tests, img2threejs state and final evidence only. Exclude redundant intermediate/raw evidence unless it is deliberately wanted in repository history.
2. Rebase or merge through the normal review path onto a clean release branch; rerun TypeScript, Vite, Island Run, architecture and visual validators.
3. Rebuild and run `cap sync ios`; verify the production chunk hashes again.
4. Install the signed candidate on a representative iPhone and run the Island 008 smoke described above.
5. PWA deployment may proceed after the clean-branch smoke and rollback point are confirmed.
6. Do not submit the iOS build to App Review until the whole-app blockers in the iOS release audit are closed.

## Rollback

Island 008 is isolated behind the existing visual-world routing seam. If a device-only failure is found, revert the scoped Island 008 integration commit or route Island 008 back to the previous supported visual source while preserving canonical gameplay state and the 36-tile board.
