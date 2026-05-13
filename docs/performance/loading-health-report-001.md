# Loading Health Report 001

Date: 2026-05-13
Repo: `Multiproject-EJ/LifeGoalAPP.com`

## Executive summary

- **Biggest current loading cost is JavaScript/CSS startup payload**, not a single image:
  - `dist/assets/main-*.js`: **3,130.64 kB** minified (**824.81 kB gzip**)
  - `dist/assets/index-*.css`: **596.64 kB**
  - `dist/assets/main-*.css`: **577.90 kB**
- `public/` contains many heavy media files. The largest are mostly **Island Run backgrounds/audio** and **Holiday calendar art**.
- `public/` assets are copied into `dist/` whether used or not; this increases deployment payload and cache footprint.
- Most heavy Island Run and Holiday images are **not preloaded globally**; they are usually requested when overlays/modals are opened.
- There are clear quick wins: convert top heavy WebP files further (or AVIF variants), right-size dimensions, remove/verify orphan assets, and reduce eager code imports in `App.tsx`.

## Asset inventory (`public/`)

### Counts by threshold
- Files >250KB: **12**
- Files >500KB: **7**
- Files >1MB: **3**

### File type distribution in `public/`
- `webp`: 80
- `svg`: 14
- `mp3`: 2
- other (css/html/js/json/md/webmanifest/gitkeep): small

### Large files by type threshold
- >250KB: `webp` 10, `mp3` 2
- >500KB: `webp` 6, `mp3` 1
- >1MB: `webp` 2, `mp3` 1

## Top 10 largest assets in `public/`

| Rank | File | Size | Type | Likely feature ownership |
|---|---|---:|---|---|
| 1 | `public/assets/audio/music/luxury-reward-loop-v1.mp3` | 1,454,550 B (1.39 MB) | mp3 | Island Run luxury reward music (`islandRunMusic.ts`) |
| 2 | `public/assets/islands/backgrounds/level-bg-06.webp` | 1,086,398 B (1.04 MB) | webp | Island Run background (dynamic `getIslandBackgroundImageSrc`) |
| 3 | `public/assets/islands/backgrounds/level-bg-05.webp` | 1,055,346 B (1.01 MB) | webp | Island Run background |
| 4 | `public/assets/islands/backgrounds/level-bg-07.webp` | 1,048,184 B (1.00 MB) | webp | Island Run background |
| 5 | `public/assets/islands/backgrounds/level-bg-04.webp` | 1,017,726 B (0.97 MB) | webp | Island Run background |
| 6 | `public/assets/islands/backgrounds/level-bg-03.webp` | 987,998 B (0.94 MB) | webp | Island Run background |
| 7 | `public/Holiday Themes/calendarBG_HalloweenNight.webp` | 674,014 B (0.64 MB) | webp | Holiday calendar modal background |
| 8 | `public/assets/audio/music/luxury-reward-loop-v12.mp3` | 384,984 B (0.37 MB) | mp3 | No runtime reference found (verify/orphan candidate) |
| 9 | `public/assets/Eggs/Egg_mystery_lv4.webp` | 323,648 B (0.31 MB) | webp | Island Run hatchery/sanctuary egg stage art (`getEggStageArtSrc`) |
| 10 | `public/assets/Eggs/Egg_common_lv4.webp` | 288,114 B (0.27 MB) | webp | Island Run hatchery/sanctuary egg stage art |

## Runtime loading analysis

## Likely loaded on initial startup

1. `index.html` preloads `/landing-page-assets/world-bg-main.webp` (very small placeholder file currently).
2. `src/bootstrap.ts` loads global CSS (`index.css`, `themes.css`, `workspace.css`) before importing `main.tsx`.
3. `main.tsx` imports `App.tsx` eagerly; `App.tsx` statically imports many feature modules.
4. Result: large monolithic startup JS/CSS payload regardless of which app surface user first sees.

## Route-/feature-specific (usually deferred until UI open)

- **Island Run backgrounds** (`/assets/islands/backgrounds/level-bg-*.webp`): selected dynamically by island number.
- **Egg stage art** (`/assets/Eggs/Egg_*_lv*.webp`): loaded in hatchery/sanctuary flows.
- **Holiday images** (`/Holiday Themes/*.webp`): loaded in HolidaySeasonDialog/CountdownCalendarModal when opened.
- **Zen Garden heavy art** (`src/assets/Zen_shopV2.webp`, `zengardenplot*.webp`): rendered when Zen Garden opens.

## Preload checks for requested surfaces

- **Island Run**: no global preload of heavy backgrounds; however, `IslandRunBoardPrototype` calls `preloadThemeAssets(...)` for theme overlays after mount.
- **Today**: no explicit heavyweight image preloading found beyond targeted `new Image()` for selected vision reward image.
- **Breathing Space**: no explicit preload; uses `/icons/Energy/*.webp` in rendered `<img>`.
- **Creature Sanctuary**: uses egg/creature art via Island Run component paths; not globally preloaded.
- **Players Hand**: no heavy static image preload detected.

## Build output findings (`npm run build`)

### Largest JS/CSS chunks
- `dist/assets/main-*.js`: **3,130.64 kB** (gzip 824.81 kB) ⚠️
- `dist/assets/index-*.css`: **596.64 kB**
- `dist/assets/main-*.css`: **577.90 kB**

### Large generated image assets from `src/assets` (fingerprinted)
- `Zen_shopV2-*.webp`: 865.78 kB
- `zengardenplotlight-*.webp`: 609.16 kB
- `zengardenplotdark-*.webp`: 519.90 kB
- `Visiontabdark-*.webp`: 514.83 kB

### Copied vs bundled
- **Copied from `public/`**: preserved paths in `dist/` (e.g., `dist/assets/islands/backgrounds/...`, `dist/Holiday Themes/...`, `dist/icons/...`).
- **Bundled from `src/assets` imports**: fingerprinted files in `dist/assets/*-hash.webp`.
- Current `dist` folder includes large copied media regardless of startup route.

## Image usage audit

### Patterns found
- `<img>` used extensively across app modules.
- Many `<img>` instances do not specify `loading="lazy"` and/or `decoding="async"`.
- CSS `background-image: url(...)` includes large assets (notably in `src/index.css` and feature CSS).

### High-impact candidate areas
- `GameBoardOverlay.tsx`, `ScoreTab.tsx`, `ActionsTab.tsx`, `BreathingSpace.tsx`, `DailyHabitTracker.tsx`, `IslandRunBoardPrototype.tsx` contain multiple `<img>` without lazy/async attributes.
- `src/index.css` references large tab/controller art (up to ~515 KB) through CSS URLs.

## Route/feature ownership map (high-cost assets)

- **Island Run / Level Worlds**
  - `/assets/islands/backgrounds/level-bg-*.webp`
  - `/assets/Eggs/Egg_*_lv*.webp`
  - `/assets/audio/music/luxury-reward-loop-v1.mp3`
- **Holiday / Daily Treats**
  - `/Holiday Themes/calendarBG_HalloweenNight.webp` and other holiday images
- **Score / Zen Garden / Overlay UI (`src/assets`)**
  - `Zen_shopV2.webp`, `zengardenplot*.webp`, `Score_*.webp`, `Visiontab*.webp`
- **Breathing Space / Conflict**
  - `/icons/Energy/*.webp`

## Quick wins (prioritized)

1. **Compress top Island Run backgrounds (`level-bg-03..07`)** and add target dimensions per device class.
2. **Add AVIF variants** (with WebP fallback) for largest background art and holiday hero images.
3. **Apply `loading="lazy" decoding="async"`** to non-critical below-the-fold `<img>` in overlay/modal-heavy components.
4. **Code-split major app sections from `App.tsx`** (workspace nav surfaces) to shrink initial `main` chunk.
5. **Verify and remove or archive unused large assets** (e.g., `luxury-reward-loop-v12.mp3` if confirmed unreferenced).
6. **Deduplicate identical island files** (same-byte duplicates found in `public/assets/islands/...`).

## Risky optimizations to avoid

- Over-compressing gameplay-critical UI art to the point of unreadability (token/board affordances).
- Removing assets based only on static grep when runtime dynamic path generation is used.
- Converting transparent assets to lossy formats that break visual layering.
- Switching to aggressive lazy loading for images that must be visible immediately in active modals/screens.
- Architecture rewrites of gameplay loading flow in a single PR; prefer small, reversible slices.

## Recommended compression/resizing targets

- **>1MB assets**: target **<=350KB** each (65–75% reduction), provide AVIF + WebP fallback.
- **500KB–1MB assets**: target **<=250KB**.
- **250KB–500KB assets**: target **<=150KB**.
- **Audio >1MB**: target **<=700KB** using modern bitrate strategy (or opus alternative if pipeline supports it).

## Proposed PR sequence

1. **PR-1 (safe, highest impact): Island Run background optimization**
   - Re-encode `level-bg-03..07` (and `level-bg-012` if used frequently) with visual QA.
   - Add size guard script/check for max per-asset thresholds.
2. **PR-2: Startup bundle split for workspace surfaces**
   - Lazy-load major nav sections from `App.tsx`.
   - Keep behavior identical.
3. **PR-3: Non-critical image lazy/async pass**
   - Add `loading`/`decoding` where safe in overlays, score/actions panels, and modal-only surfaces.
4. **PR-4: Holiday and ZenGarden art optimization**
   - Re-encode biggest seasonal and zen assets, add fallback strategy.
5. **PR-5: Asset hygiene**
   - Deduplicate identical island files and remove confirmed-orphan media.

## Recommended first optimization PR

**Start with PR-1: optimize Island Run `level-bg-03..07` background images.**

Reason: this cluster dominates the largest static assets, has clear measurable byte savings, low behavior risk, and immediate benefit for Island Run users without requiring architecture changes.
