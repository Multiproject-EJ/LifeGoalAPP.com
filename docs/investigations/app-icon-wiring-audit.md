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
- **Active PWA icon wiring now uses `app-icon-192.png` + `app-icon-512.png`** (migrated from SVG in the implementation PR).
- `app-icon-1024.png` is present as the master source asset and is **not wired to runtime paths**.
- `icon-192x192.svg` and `icon-512x512.svg` are byte-identical duplicates of the old active SVGs and remain **not referenced by active runtime code**.
- Old SVG icons (`app-icon-192.svg`, `app-icon-512.svg`) are retained as legacy files; no deletion in this PR.
- There is **no explicit splash image generation pipeline** (no `apple-touch-startup-image`, no PWA icon generator plugin).
- Vite does not use `vite-plugin-pwa`; the app relies on static `public/` assets + manual service worker registration.

## Exact file reference map

### 1) `public/icons/app-icon-192.png` (ACTIVE — migrated from SVG)
Referenced by:
- `index.html:31` (`<link rel="icon" type="image/png" href="/icons/app-icon-192.png">`) → favicon path
- `index.html:32` (`<link rel="apple-touch-icon" href="/icons/app-icon-192.png">`) → iOS home icon
- `public/manifest.webmanifest:13` (`icons[].src`) → Android/PWA install icon set
- `public/sw.js:6` (precache app shell)
- `public/sw.js:471`, `public/sw.js:472`, `public/sw.js:541`, `public/sw.js:542` (notification icon/badge defaults)

### 2) `public/icons/app-icon-512.png` (ACTIVE — migrated from SVG)
Referenced by:
- `public/manifest.webmanifest:19`
- `public/sw.js:7` (precache app shell)

### 3) `public/icons/app-icon-1024.png` (MASTER SOURCE — not wired to runtime)
- Present as the full-quality source asset for the crest icon family.
- Not referenced by manifest, index.html, or SW.

### 4) `public/icons/app-icon-192.svg` (LEGACY — retained, no active runtime references)
Previously referenced by all paths above; now superseded by `app-icon-192.png`.
Still referenced by:
- `public/manifest.json` (duplicate manifest, not linked by `index.html`)
- `public/service-worker.js` (alternate push SW, used only by optional `register-push.js` helper)
- `src/features/notifications/PushNotificationTestPanel.tsx:11` (dev test panel constant)
- `app/habits/notifications.js:201`, `:202` (local notification helper)
- `supabase/functions/send-reminders/index.ts:598`, `:599` (server push payload)
- `scripts/send-push-node.js:136`, `:137` (CLI push script)

### 5) `public/icons/app-icon-512.svg` (LEGACY — retained)
- `public/manifest.json` (duplicate manifest, not linked)
- `public/service-worker.js:66`, `:67` (alternate push SW only)

### 6) `public/icons/icon-192x192.svg` (LEGACY/UNUSED at runtime)
Referenced by:
- `docs/WEB_PUSH_REMINDERS.md:390`, `:391` (documentation only)
- `examples/notifications-demo.html:221`, `:222`, `:251`, `:252` (example/demo only)

### 7) `public/icons/icon-512x512.svg` (DEAD/UNUSED)
- **No references found** in runtime code, config, scripts, docs, or examples.

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
- Current icon file: `/icons/app-icon-192.png`

### Android/PWA install icon
- Primary source: `public/manifest.webmanifest` `icons[]` entries (linked from `index.html:30`)
- Current icon files:
  - `/icons/app-icon-192.png`
  - `/icons/app-icon-512.png`
- App install prompt flow is triggered in:
  - `src/main.tsx` (`beforeinstallprompt` capture)
  - `src/world/useInstallState.ts`
  - `src/world/WorldHome.tsx`

### favicon
- Primary source: `index.html:31` (`rel="icon" type="image/png"`)
- Current icon file: `/icons/app-icon-192.png`

### splash screens
- No explicit splash asset tags found (`apple-touch-startup-image` absent).
- No Vite/PWA plugin-based splash generation found.
- Effective splash behavior is platform-derived from manifest/theme metadata and OS defaults, not a custom splash image pipeline.

## 1024 master icon wiring status
- `public/icons/app-icon-1024.png` is the master source asset for the crest icon family.
- It is **not wired to any runtime paths** (manifest, index.html, SW); retained as generation source only.
- A separate 1024 PNG pipeline also exists:
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

## PASS/FAIL recommendation table (updated after migration)

| Check | Result | Evidence | Status |
|---|---|---|---|
| Active app icon references are identifiable | PASS | `index.html`, `manifest.webmanifest`, `sw.js`, notification paths | ✅ Complete |
| Legacy/dead icon assets can be identified | PASS | No active runtime refs for SVG icons; docs/examples retain old paths | ✅ Legacy SVGs retained, cleanup deferred |
| SVGs are true vectors vs raster wrappers | PASS | SVG markup is primitive shapes/text; no bitmap embed | ✅ Informational only |
| PNG replacement wired safely | PASS | All active runtime paths now point to `.png` files | ✅ Migrated |
| 1024 master icon status | PASS | Present as source asset; not wired to runtime | ✅ Source-only, as intended |
| Splash generation system exists | NOTE | No splash generator plugin/tags found | ℹ️ Platform-derived behavior; no action needed |
| Redundant icon systems exist | NOTE | Duplicate legacy SVGs, duplicate manifest.json, dual SW paths | ℹ️ Cleanup deferred to follow-up PR |

## Migration outcome: before / after reference map

| Location | Before | After |
|---|---|---|
| `index.html:31` favicon | `image/svg+xml` `/icons/app-icon-192.svg` | `image/png` `/icons/app-icon-192.png` |
| `index.html:32` apple-touch-icon | `/icons/app-icon-192.svg` | `/icons/app-icon-192.png` |
| `manifest.webmanifest` icon 192 | `image/svg+xml` `/icons/app-icon-192.svg` | `image/png` `/icons/app-icon-192.png` |
| `manifest.webmanifest` icon 512 | `image/svg+xml` `/icons/app-icon-512.svg` | `image/png` `/icons/app-icon-512.png` |
| `sw.js` precache (192) | `/icons/app-icon-192.svg` | `/icons/app-icon-192.png` |
| `sw.js` precache (512) | `/icons/app-icon-512.svg` | `/icons/app-icon-512.png` |
| `sw.js` push notification icon/badge defaults | `/icons/app-icon-192.svg` | `/icons/app-icon-192.png` |

## Direct answers to requested questions
1. **Which files are actually referenced (post-migration)?**
   - Active runtime: `app-icon-192.png`, `app-icon-512.png`.
   - Full before/after map in the section above.
2. **Which are dead/unused legacy assets?**
   - Legacy (no active runtime refs, SVG files retained): `app-icon-192.svg`, `app-icon-512.svg`, `icon-512x512.svg`.
   - Legacy/docs-demo only: `icon-192x192.svg`.
   - Master source asset (not wired to runtime): `app-icon-1024.png`.
3. **Are the SVG files true vectors or raster wrappers?**
   - True vectors (shape/text SVG), not raster wrappers.
4. **Can PNG replacements safely be used instead?**
   - Yes — migration completed in this PR.
5. **Which exact files determine iOS icon / Android install icon / favicon / splash?**
   - iOS: `index.html` apple-touch-icon → `/icons/app-icon-192.png`.
   - Android/PWA install: `public/manifest.webmanifest` `icons[]` → `app-icon-192.png` + `app-icon-512.png`.
   - favicon: `index.html` `rel="icon"` → `/icons/app-icon-192.png`.
   - splash: no explicit asset pipeline; OS/platform-derived behavior.
6. **Is a 1024 master icon currently wired anywhere?**
   - No runtime wiring. `app-icon-1024.png` is present as the master source asset only.
7. **What is the safest migration path from SVG to PNG?**
   - Completed: one coordinated PR updating index/manifest/SW, validating build + tests.
8. **Are there duplicated or redundant icon systems?**
   - Yes: duplicate legacy SVG icon files, duplicate `manifest.json` file (not linked), two SW tracks. Cleanup deferred to follow-up PR.
