# Island 006 V2 — Capacitor iOS release evidence

Date: 2026-09-28

Source PWA commit: `ae8b7d432e544748ff82ab7b676ff48bb3d0142e`

## Result

- TypeScript project build: PASS.
- Vite production build: PASS.
- Capacitor iOS sync: PASS; seven plugins detected.
- Embedded `dist` and `ios/App/App/public` differ only by Capacitor's expected `cordova.js` and `cordova_plugins.js` bridge files.
- Unsigned Debug build for the generic iOS Simulator: PASS (`BUILD SUCCEEDED`).
- App icon has no alpha channel.

## Island runtime identity

The Island Run bundle is `Island5ThreePilot-CYks77Jt.js`.

SHA-256 in all three locations:

`01f1d01683299664eeac50e1e94aa46dfd6fc2f3c2ec5d7d498daf28afb85604`

Verified locations:

- `dist/assets/Island5ThreePilot-CYks77Jt.js`
- `ios/App/App/public/assets/Island5ThreePilot-CYks77Jt.js`
- built simulator `App.app/public/assets/Island5ThreePilot-CYks77Jt.js`

The generated native web bundle remains ignored by Git according to `ios/.gitignore`; Capacitor recreates it from the tracked PWA source during release builds.

