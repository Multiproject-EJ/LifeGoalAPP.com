# Island 007 V2 production release checkpoint — 2026-10-02

## Decision and scope

Eivind's 2026-10-02 request to fix the stale live PWA and installed Capacitor app authorizes the accepted Island 007 V2 presentation for production. This release also fixes the native root route so Capacitor enters the app instead of the public landing page, keeps mounted PWA sessions on `/app`, and bounds service-worker replacement reloads.

Gameplay ownership is unchanged. Island 007's V2 factories, terrain, fauna, landmarks, and loading state remain presentation-only and continue to read canonical Island Run state.

## Release gate

- Production build: pass (`tsc -b`, Vite production build).
- Island Run suite: 2,584 passed, 0 failed.
- Architecture guard: pass, with only the three pre-existing allowlisted migration warnings.
- Island art asset and render-wiring checks: pass.
- Island 007 construction compatibility: 45 cases passed, 0 browser errors.
- Deep-sea life and whale-route regressions: pass for High, Medium, and Low quality.
- Production phone composition: pass at 390×844 with the actual HUD. The final capture reports `island7Environment=world-space-geometry-v2` and `island7EnvironmentReady=true`.
- Voyage-map portrait: regenerated from the accepted runtime; fingerprint updated to `8d495742d9c78577`.
- Native bundle version: raised from stale project value `1` to `2027.1.0`, above the installed development build `2026.927.1`.

Final browser evidence:

- `qa/production-release-2026-10-02-final/production-island-007.png`
- `qa/production-release-2026-10-02-final/report.json`

## Release hardening included

- The loading overlay now remains until Island 007's asynchronous GLB terrain is actually ready.
- GLB load failure exposes the existing Retry 3D action instead of leaving a partial scene.
- `.glb` assets participate in the PWA's network-first runtime cache.
- The portrait capture utility now works from paths containing spaces and accepts explicit Playwright/browser locations.
- The production browser smoke accepts a requested island and verifies Island 007 V2 without development flags.

## Resource checkpoint

- Measured release-integration window: 18 minutes 29 seconds, from the retained V2 closeout commit at 01:42:56 CEST to the final production capture at 02:01:25 CEST. Earlier diagnosis time was not instrumented and is excluded.
- Workers: four bounded read-only diagnostic agents; release edits and acceptance remained with the primary agent.
- Paid image/model credits: 0.
- New visual generation: none. One runtime portrait was regenerated from the app itself.
- Full-frame production capture runs: 3; manual image inspections: 3.
- Review ceiling: below the six-review project ceiling. Remaining visual-review envelope before a new user checkpoint: 3.
- Persistent or open-ended work: none. Hard stop is live PWA verification plus direct installation/launch of this exact bundle on the connected iPhone.

## Known non-blocking follow-up

Island 007's embedded authored landmark data increases the lazy shared island renderer chunk to about 7.23 MB minified / 2.46 MB gzip. This does not block correctness or the current release, but an Island-7-only dynamic-load split should be evaluated separately so other islands do not pay that payload.

This checkpoint does not claim App Store/TestFlight submission. The connected development phone can receive a directly signed build; distribution credentials were not part of this release.
