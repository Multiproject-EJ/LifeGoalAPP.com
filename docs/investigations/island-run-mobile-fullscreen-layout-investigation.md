# Island Run Mobile Fullscreen Layout Investigation

## Executive summary

- The fullscreen chain works through the app shell and game overlay background; the outer layers do reach full viewport bounds (`position: fixed; inset: 0; min-height: 100dvh`).
- The first meaningful shrink for **playable board geometry** happens inside `BoardStage`: gameplay coordinates are forced into a canonical square (1000×1000) and scaled via `Math.min(width/1000, height/1000)`. On tall iPhone portrait viewports, that preserves square geometry by fitting to width, leaving vertical remainder (`offsetY`) above and below the board geometry.
- Separately, Island Run UI reserves vertical zones with absolute overlays:
  - HUD header with max-height cap + safe-area top offset.
  - Footer controller shell with large min-height (220–238px) anchored at bottom.
- Result: perceived “letterboxing” is a combined effect of (1) square-preserved board stage centering and (2) top/bottom overlay reservations. The overlay background still appears fullscreen because it is on a different layer (`.island-run-board__bg` / overlay scene image) and uses `object-fit: cover`.

## Component tree / container chain

### Render chain (mobile app shell → game)
1. App overlay mount: `GameBoardOverlay` (open/close shell).
2. Island gameplay host: `LevelWorldsHub` renders `level-worlds-island-run-shell` and `IslandRunBoardPrototype`.
3. Gameplay root: `section.island-run-prototype`.
4. Play area: `div.island-run-board` (`ref={boardRef}`) contains background, HUD, reward bar, and `BoardStage`.
5. Playable stage internals: `BoardStage` → `.island-run-board__stage-wrapper` → `.island-run-board__art-camera-stage` + `.island-run-board__camera-stage` + tile/path/token layers.

### Which pieces do what
- Fullscreen overlay background image (pre-play overlay): `.game-board-overlay__island-scene-img` in `GameBoardOverlay`.
- In-game fullscreen board background image: `.island-run-board__bg` / `__bg--v2-ambient` in `IslandRunBoardPrototype`.
- Actual playable board geometry: `BoardStage` coordinate transform + tile/path/token layers.

### First container that becomes effectively smaller
- Not via CSS width/height shrink at the wrapper level; the key shrink is **logical geometry shrink** in `BoardStage` transform math:
  - `uniformScale = min(boardWidth/1000, boardHeight/1000)`
  - `offsetY = (boardHeight - 1000*uniformScale)/2`
- This yields centered square gameplay inside a taller rectangle.

## Background vs playable content comparison

### A) Normal PWA shell
- The shell and Island Run shell both use fixed/inset + `min-height: 100dvh` patterns and are not the main constraint.

### B) Game overlay background layer
- Overlay content is fixed + inset 0 with `height/min-height: 100dvh`.
- Background image layers use cover-like behavior (`object-fit: cover`), so they visually fill full screen.

### C) Playable content layer
- Board wrapper fills available area, but gameplay anchors/tile map remain square-preserved via `BoardStage` math.
- Top/bottom strips are the leftover vertical area from square fit plus areas visually dominated by top HUD/footer overlays.

## CSS/layout findings table

| Area | File / selector | Rule | Effect |
|---|---|---|---|
| Island shell | `LevelWorlds.css` `.level-worlds-island-run-shell` | `position: fixed; inset:0; min-height:100dvh; padding-top safe-area + 0.9rem; side safe-area padding` | Fullscreen container, but inner content starts below top safe-area padding. |
| Game board root | `LevelWorlds.css` `.island-run-board` | `position:absolute; inset:0; overflow:hidden;` | Board fills prototype area and clips children to board box. |
| Header HUD | `LevelWorlds.css` `.island-run-prototype__header` | `position:absolute; top:safe-area; max-height:min(42dvh, calc(100dvh - ...)); overflow-y:auto` | Occupies top visual real estate; contributes top strip feel. |
| Footer shell | `LevelWorlds.css` `.island-run-prototype__footer` + `__footer-controller-shell` | `position:absolute; bottom: calc(safe-area * -1)`; controller min-height 238px (220px <=720px) | Large bottom reservation/overlay presence; contributes bottom strip feeling. |
| Stage wrapper | `LevelWorlds.css` `.island-run-board__stage-wrapper` | `width:100%; height:100%; flex:1; overflow:visible; perspective` | Stage takes full board box but geometry still constrained by square fit logic. |
| Background image | `LevelWorlds.css` `.island-run-board__bg` | `position:absolute; inset:0; width/height:100%; object-fit:cover` | Fills full board area, so background looks fullscreen. |
| Pre-play overlay | `game-board-overlay.css` `.game-board-overlay__content` | `position:fixed; inset:0; height/min-height:100dvh` | Fullscreen overlay container works. |

## Aspect-ratio findings

- No direct `aspect-ratio` on `.island-run-board`/stage wrappers drives the main issue.
- The **effective aspect lock** is in TS math (square canonical board): `CANONICAL_BOARD_SIZE 1000×1000` + `Math.min(...)` scaling in `BoardStage`.
- This is likely intentional for tile geometry/hitbox consistency; changing it to stretch risks token path/hit alignment.

## Safe-area findings

- Safe-area is applied at shell level and HUD/footer controls.
- Safe-area usage protects interaction targets (good), but current layering means visuals and interactions are partially grouped, so safe-area treatment indirectly affects perceived playable height.
- Notch/home indicator protection appears intentional; issue is more about shared container strategy than safe-area usage alone.

## Overflow / clipping findings

- `.island-run-board { overflow: hidden; }` clips any bleed outside board box.
- Because board is already inset by shell padding and overlays, clipping reinforces “inner box” feel.
- `BoardStage` itself uses overflow visible, but parent clipping wins.

## Z-index / layering map (simplified)

1. App shell / overlay host.
2. `game-board-overlay` backdrop/content (pre-play).
3. `level-worlds-island-run-shell`.
4. `island-run-board__bg` (decorative background, full board area).
5. `BoardStage` art/camera/tile/token layers (playable geometry square-centered).
6. Top HUD (`island-run-prototype__header`, `island-run-board__topbar`, rewardbar).
7. Bottom controller/footer (`island-run-prototype__footer`).
8. Modal layers (higher z-index overlays).

## Responsive/mobile breakpoint findings

- `@media (max-width: 640px)` increases shell top padding.
- `@media (max-width: 720px)` footer controller still large (`min-height: 220px`).
- This keeps control targets large but materially reduces perceived free vertical gameplay area on small iPhones.

## Root cause ranking

1. **High confidence:** BoardStage canonical square scaling (`Math.min`) centers gameplay in square inside tall viewport (top+bottom remainder).
2. **High confidence:** Large absolute footer controller shell min-height (220–238px) visually reserves bottom zone and compresses immersive feel.
3. **Medium-high confidence:** Absolute HUD header with safe-area top + max-height contributes top strip/boxed perception.
4. **Medium confidence:** Parent clipping (`.island-run-board overflow:hidden`) prevents decorative gameplay layers from bleeding beyond inner box.

## Recommended fix path

### Safest first PR recommendation
**Option A (lowest risk): edge-to-edge visual layer + keep ratio-preserved gameplay geometry + keep safe controls.**

Why:
- Board math/tile geometry currently assumes square-preserved canonical coordinates.
- Can improve immersion without touching gameplay movement/hitboxes.
- Aligns with “visual layer edge-to-edge, control layer safe-area aware.”

## Implementation options

### Option A — Fullscreen visual shell/background only (recommended first)
- Keep BoardStage square math unchanged.
- Decouple decorative background/atmosphere from safe-area constrained wrappers and allow visual bleed edge-to-edge.
- Keep HUD/footer safe-area anchored.
- Risk: low (CSS/layout only).

### Option B — Visual fullscreen + larger playable stage
- Increase effective stage footprint (reduce top/bottom reserved zones, tune footer/header heights on narrow heights).
- Keep canonical coordinate mapping, but let stage occupy more of viewport.
- Risk: medium (touch overlap checks needed).

### Option C — True immersive game mode
- Separate 3 layers explicitly: fullscreen visual canvas, gameplay stage, safe controls overlay.
- Potentially alter clipping and stage scaling behavior.
- Risk: higher (camera/gesture/modal overlap regressions).

## Recommended target architecture fit check

Current code is **partially** separated but not fully:
- Decorative and interactive elements are mixed under shared board/shell constraints.
- Controls are correctly safe-area aware.
- Playable stage is ratio-preserved, but currently coexists with large overlays in one viewport composition, causing the boxed look.

## Specific implementation plan for safest first PR

1. Keep `BoardStage` geometry transform unchanged (no gameplay coordinate risk).
2. Introduce/adjust a dedicated fullscreen decorative layer behind board controls and stage.
3. Reduce perceived letterboxing by tuning only visual/spacing CSS on small-height iPhones:
   - header max-height/compact mode,
   - footer controller vertical footprint,
   - preserve tap target sizes.
4. Keep safe-area padding for controls; do not apply control-safe-area padding to purely decorative backgrounds.

## Manual iPhone test checklist

- Devices: iPhone SE-size, iPhone 13/14/15, notch + dynamic island variants.
- Install as PWA and run in standalone.
- Validate:
  - overlay background remains edge-to-edge;
  - playable board retains correct token/tile alignment after multiple rolls;
  - no clipped footer buttons near home indicator;
  - top controls avoid notch;
  - reward bar, modals, and minigame launcher remain tappable;
  - landscape fallback still usable.

## Open questions / uncertainties

- Exact visual expectation for board itself: keep strict square or allow controlled crop/bleed.
- Whether product accepts a smaller footer art shell on shortest devices.
- Whether some perceived strips are intentionally reserved to preserve controller skin composition.

