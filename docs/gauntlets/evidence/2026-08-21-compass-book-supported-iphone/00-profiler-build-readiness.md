# Compass Book physical-iPhone profiler readiness

**Date:** 2026-08-21
**Result:** BUILD READY; DEVICE RUN NOT STARTED
**Performance gate:** OPEN

## Verified

- Xcode 26.6 (`17F113`) is installed and selected.
- The paired target resolves as **Eivind sin iPhone**, **iPhone 16 Pro (`iPhone17,1`)**, with Developer Mode enabled.
- `vite build --mode compass-book-profiler` passed.
- Capacitor copied and synchronized the flagged internal profiler bundle.
- A generic physical-iOS Debug build passed and was signed with the existing Apple Development identity and provisioning profile.
- The signed internal artifact was produced at `/private/tmp/habitgame-compass-profiler-derived/Build/Products/Debug-iphoneos/App.app`.

## Installation blocker

The device was present in the paired-device registry but had no active CoreDevice tunnel or DDI service. The last recorded connection was 2026-08-17. Installation therefore stopped before changing the phone:

```text
CoreDeviceService was unable to locate a device matching the requested device identifier.
```

No 30-second trace was started. No High or Low FPS result exists, and no performance conclusion may be inferred from this readiness build.

## Production restoration

After the unsuccessful installation attempt, the normal production Vite bundle was rebuilt and synchronized back into the Capacitor project. The restored native web assets contain the production service worker and do not contain the profiler-route chunk. The tracked worktree was returned to its pre-build state before this evidence note was added.

## Resume

1. Put the iPhone near the Mac, unlock it, and accept any **Trust This Computer** or developer-services prompt.
2. Confirm Xcode reports an active connection/tunnel.
3. Install the already-built signed internal `.app`, or rebuild it if `/private/tmp` has been cleared.
4. Run the required uninterrupted 30-second High and Low traces from `COMPASS_BOOK_SUPPORTED_IPHONE_PROFILING.md`.
5. Preserve both JSON reports and screenshots, then restore the normal production bundle again.
