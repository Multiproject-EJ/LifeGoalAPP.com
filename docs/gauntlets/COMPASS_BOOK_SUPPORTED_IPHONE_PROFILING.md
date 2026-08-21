# Compass Book supported-iPhone profiling

**Date:** 2026-08-21
**Purpose:** close the remaining production-3D performance gate with reproducible physical-device evidence.
**Evidence schema:** `compass-book-3d-device-v1`

## What counts as proof

Run the real production `CompassBookScreen` + `CompassBookThreeShell` on a supported physical iPhone, with the Chapter IV Ikigai Map visible. Collect one uninterrupted 30-second foreground report at each forced tier:

- **High:** average at least **50 FPS**.
- **Low:** average at least **55 FPS**.

The report must say `rating: "pass"`, contain a nonzero renderer resolution and workload, identify `page: "ikigai_map"`, and show the requested `quality`. Browser automation, desktop emulation, a hidden/background tab, or the lab's rolling FPS label cannot close this gate.

## Preferred proof: internal Capacitor build

From the Compass Book worktree:

```bash
npm run cap:sync:ios:compass-profiler
npm run cap:open:ios
```

In Xcode, choose a supported physical iPhone and run the app. This internal build opens directly into the real Compass Book with demo content and the proof panel. It does not require an account and cannot write Island Run state.

For each tier:

1. Tap **High** or **Low**. The app reloads the same production book at that forced tier.
2. Wait until the Chapter IV book relief is visibly settled.
3. Enter the exact iPhone model.
4. Tap **Run 30s profile** and keep the app visible and untouched.
5. Capture a screenshot of the result and tap **Copy report**.
6. Save the screenshot and JSON under `docs/gauntlets/evidence/2026-08-21-compass-book-supported-iphone/` with `high` or `low` in the filename.

The profiler cancels if the app leaves the foreground. Empty traces cannot pass.

### Restore production assets afterward

The profiler bundle is internal evidence tooling and must never be submitted or left as the release candidate. Restore the normal app bundle immediately after profiling:

```bash
npm run cap:sync:ios
```

Open the restored app once and verify that the physical-device proof panel is absent.

## Secondary proof: iPhone Safari / PWA path

This is useful WebKit evidence in addition to the native run, but it does not replace the preferred Capacitor-wrapper proof.

Start the dev server on the Mac:

```bash
npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
```

On an iPhone on the same network, replace `<MAC-LAN-IP>` in these URLs:

```text
http://<MAC-LAN-IP>:5174/compass-preview.html?demo=1&chapter=ikigai_map&presentation=3d&context=island_run&profile=1&compass3dQuality=high
http://<MAC-LAN-IP>:5174/compass-preview.html?demo=1&chapter=ikigai_map&presentation=3d&context=island_run&profile=1&compass3dQuality=low
```

Use the same 30-second procedure and retain the JSON/screenshot beside the native evidence, clearly labeled `safari`.

## Report review

Check these fields before accepting a run:

- `profileSchema` is `compass-book-3d-device-v1`.
- `deviceLabel` names the actual phone.
- `quality` and `targetFps` match the intended tier.
- `sampleCount` represents the full uninterrupted run.
- `renderer.width`, `renderer.height`, `maxCalls`, and `maxRenderedTriangles` are nonzero.
- `page` is `ikigai_map`.
- `rating` is `pass`.

If either tier misses, preserve the report, profile the same tier once more to rule out warmup/noise, then return to the optimization pass with the failing workload as the authority. Do not lower the approved FPS target to make the report pass.
