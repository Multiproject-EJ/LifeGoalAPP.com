# App icon wiring audit (HabitGame/LifeGoal PWA)

## Scope
Investigation-only audit of app icon wiring and active icon references across:
- manifest files
- `index.html` head tags
- Apple touch icon wiring
- favicon wiring
- PWA install flow
- splash/icon generation paths
- Vite/static pipeline references

Targeted assets:
- `public/icons/app-icon-192.svg`
- `public/icons/app-icon-512.svg`
- `public/icons/icon-192x192.svg`
- `public/icons/icon-512x512.svg`
- `public/icons/app-icon-1024.png`

## Validation steps run
- repo-wide `rg` searches for icon and manifest references
- direct inspection of:
  - `index.html`
  - `public/manifest.webmanifest`
  - `public/manifest.json`
  - `public/sw.js`
  - `src/registerServiceWorker.ts`
  - `src/main.tsx`, `src/world/useInstallState.ts`, `src/world/WorldHome.tsx`
  - push notification paths in app/client/server helpers
  - `vite.config.ts`
  - `scripts/copy-app-icon.mjs`
- file-type/hash check for target icons

## Executive summary
- **Active PWA icon wiring uses `app-icon-192.svg` + `app-icon-512.svg` only.**
- `icon-192x192.svg` and `icon-512x512.svg` are byte-identical duplicates of the active SVGs and are **not referenced by active runtime code**.
- `app-icon-1024.png` exists but is **not referenced anywhere**.
- The active SVG icons are **true vector SVG markup** (`<rect>`, `<circle>`, `<text>`), not raster wrappers (`<image>` embeds).
- There is **no explicit splash image generation pipeline** (no `apple-touch-startup-image`, no PWA icon generator plugin).
- Vite does not use `vite-plugin-pwa`; the app relies on static `public/` assets + manual service worker registration.

## Exact file reference map

### 1) `public/icons/app-icon-192.svg` (ACTIVE)
Referenced by:
- `index.html:31` (`<link rel="icon" ... href="/icons/app-icon-192.svg">`) → favicon path
- `index.html:32` (`<link rel="apple-touch-icon" href="/icons/app-icon-192.svg">`) → iOS home icon
- `public/manifest.webmanifest:13` (`icons[].src`) → Android/PWA install icon set
- `public/manifest.json:13` (duplicate manifest file)
- `public/sw.js:6` (precache app shell)
- `public/sw.js:471`, `public/sw.js:472`, `public/sw.js:541`, `public/sw.js:542` (notification icon/badge defaults)
- `public/service-worker.js:66`, `public/service-worker.js:67` (alternate SW default icon/badge)
- `src/features/notifications/PushNotificationTestPanel.tsx:11` (test notification icon constant)
- `app/habits/notifications.js:201`, `app/habits/notifications.js:202` (local notification icon/badge)
- `supabase/functions/send-reminders/index.ts:598`, `supabase/functions/send-reminders/index.ts:599` (server push payload icon/badge)
- `scripts/send-push-node.js:136`, `scripts/send-push-node.js:137` (CLI push payload defaults)

### 2) `public/icons/app-icon-512.svg` (ACTIVE for manifest/install, otherwise limited)
Referenced by:
- `public/manifest.webmanifest:19`
- `public/manifest.json:19`
- `public/sw.js:7` (precache app shell)

### 3) `public/icons/icon-192x192.svg` (LEGACY/UNUSED at runtime)
Referenced by:
- `docs/WEB_PUSH_REMINDERS.md:390`, `docs/WEB_PUSH_REMINDERS.md:391` (documentation only)
- `examples/notifications-demo.html:221`, `:222`, `:251`, `:252` (example/demo only)

### 4) `public/icons/icon-512x512.svg` (DEAD/UNUSED)
- **No references found** in runtime code, config, scripts, docs, or examples.

### 5) `public/icons/app-icon-1024.png` (DEAD/UNUSED)
- **No references found**.

## Asset characteristics (vector vs raster)
- `app-icon-192.svg` and `icon-192x192.svg` are identical (same hash).
- `app-icon-512.svg` and `icon-512x512.svg` are identical (same hash).
- SVG contents are vector primitives + text emoji; no embedded bitmap payload.

Observed file metadata:
- `app-icon-192.svg` — SVG, 382 bytes
- `icon-192x192.svg` — SVG, 382 bytes (duplicate)
- `app-icon-512.svg` — SVG, 388 bytes
- `icon-512x512.svg` — SVG, 388 bytes (duplicate)
- `app-icon-1024.png` — PNG, 1024x1024, 950,253 bytes

## Platform ownership: which files determine what

### iOS home icon
- Primary source: `index.html:32` (`rel="apple-touch-icon"`)
- Current icon file: `/icons/app-icon-192.svg`

### Android/PWA install icon
- Primary source: `public/manifest.webmanifest` `icons[]` entries (linked from `index.html:30`)
- Current icon files:
  - `/icons/app-icon-192.svg`
  - `/icons/app-icon-512.svg`
- App install prompt flow is triggered in:
  - `src/main.tsx` (`beforeinstallprompt` capture)
  - `src/world/useInstallState.ts`
  - `src/world/WorldHome.tsx`

### favicon
- Primary source: `index.html:31` (`rel="icon" type="image/svg+xml"`)
- Current icon file: `/icons/app-icon-192.svg`

### splash screens
- No explicit splash asset tags found (`apple-touch-startup-image` absent).
- No Vite/PWA plugin-based splash generation found.
- Effective splash behavior is platform-derived from manifest/theme metadata and OS defaults, not a custom splash image pipeline.

## 1024 master icon wiring status
- `public/icons/app-icon-1024.png` is **not wired** anywhere.
- A separate 1024 PNG pipeline exists:
  - `scripts/copy-app-icon.mjs` copies `src/assets/V2_app_icon_large_dark.png` (1024x1024) into `public/icons/V2_app_icon_large_dark.png` during `predev`/`prebuild`.
  - This copied file is gitignored (`.gitignore:19`) and also **not wired** by manifest/index/SW.

## Vite/static asset pipeline findings
- `vite.config.ts` uses only `@vitejs/plugin-react`; no PWA plugin.
- PWA behavior is manually wired through:
  - static public assets (`public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`)
  - manual registration in `src/registerServiceWorker.ts` + `src/main.tsx`.

## Duplicate/redundant icon systems identified
1. Duplicate icon pairs:
   - `app-icon-192.svg` == `icon-192x192.svg`
   - `app-icon-512.svg` == `icon-512x512.svg`
2. Duplicate manifest files with same icon config:
   - `public/manifest.webmanifest` (active)
   - `public/manifest.json` (present but not linked by `index.html`)
3. Two service-worker tracks:
   - active app SW: `/sw.js` (registered by app)
   - alternate push SW: `/service-worker.js` (used by optional `register-push.js`/`push-subscribe.ts` helpers)

## PASS/FAIL recommendation table

| Check | Result | Evidence | Recommendation |
|---|---|---|---|
| Active app icon references are identifiable | PASS | `index.html`, `manifest.webmanifest`, `sw.js`, notification paths | Keep a single canonical icon set and map all app/runtime references to it |
| Legacy/dead icon assets can be identified | PASS | No refs for `app-icon-1024.png` and `icon-512x512.svg`; docs/examples-only refs for `icon-192x192.svg` | Mark these as legacy candidates; remove only in a separate cleanup PR |
| SVGs are true vectors vs raster wrappers | PASS | SVG markup is primitive shapes/text; no bitmap embed | Safe to render at multiple sizes, but emoji glyph can vary by platform |
| PNG replacement can be introduced safely | PASS (with controlled migration) | Current wiring is centralized and explicit | Replace references in one sweep (index + manifest + SW defaults), then verify install + notification flows |
| 1024 master icon is currently wired | FAIL | No runtime/config references found | If desired, explicitly wire it as source-of-truth generation input, not direct runtime icon |
| Splash generation system exists | FAIL | No splash generator plugin/tags found | Decide whether to keep OS-derived splash behavior or introduce explicit generation tooling |
| Redundant icon systems exist | PASS (redundancy confirmed) | Duplicate icons, duplicate manifest, dual SW paths | Consolidate to one canonical icon naming/system and one documented SW strategy |

## Safest migration path from SVG to PNG (no changes applied yet)
1. Establish one canonical icon family in `public/icons` (PNG 192 + PNG 512; optional 1024 master as source only).
2. Keep current filenames initially (or add parallel PNG files) to reduce blast radius.
3. Update all active runtime references in one controlled PR:
   - `index.html` (`rel="icon"`, `apple-touch-icon`)
   - `public/manifest.webmanifest` (icons + MIME types)
   - `public/sw.js` notification defaults/precache list
   - any active client/server notification payload defaults currently pointing to `.svg`
4. Leave docs/examples updates to same PR or immediate follow-up to avoid drift.
5. Validate on-device/platform behaviors:
   - Android install prompt + installed icon
   - iOS Add to Home Screen icon
   - favicon in browser tab
   - push notification icon/badge rendering
6. After validation window, remove redundant legacy assets/references in cleanup PR.

## Direct answers to requested questions
1. **Which files are actually referenced?**
   - Active runtime: `app-icon-192.svg`, `app-icon-512.svg`.
   - Full map listed above.
2. **Which are dead/unused legacy assets?**
   - Dead: `app-icon-1024.png`, `icon-512x512.svg`.
   - Legacy/docs-demo only: `icon-192x192.svg`.
3. **Are the SVG files true vectors or raster wrappers?**
   - True vectors (shape/text SVG), not raster wrappers.
4. **Can PNG replacements safely be used instead?**
   - Yes, with a coordinated reference update across index/manifest/SW/notification defaults.
5. **Which exact files determine iOS icon / Android install icon / favicon / splash?**
   - iOS: `index.html` apple-touch-icon.
   - Android/PWA install: `public/manifest.webmanifest` (linked by `index.html`).
   - favicon: `index.html` rel=icon.
   - splash: no explicit asset pipeline; OS/platform-derived behavior.
6. **Is a 1024 master icon currently wired anywhere?**
   - No.
7. **What is the safest migration path from SVG to PNG?**
   - Use one canonical PNG set, update all active runtime references in one PR, validate on iOS/Android/browser, then clean legacy files.
8. **Are there duplicated or redundant icon systems?**
   - Yes: duplicate icon files, duplicate manifest files, and two SW tracks.
