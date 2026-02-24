# FIXED BOARD + UI + MOVEMENT (MOBILE)

## Core Rule
**All islands reuse the same board coordinates.**
Only the background image changes.

The board layer includes:
- 17 tile anchors (positions)
- 5 stop anchors (subset of tile anchors)
- token path animation between anchors
- touch hitboxes

---

## Visual Direction (Locked): 3D-Hybrid Board Around Pond
Board must feel embedded into island art (like a stone/boardwalk ring around water), not floating UI dots.

Use a **hybrid composition** per island:
1) Painted background island art (`bg_xxx.webp`)
2) Shared board spline + tile anchor geometry (fixed layout)
3) Tile discs with pseudo-3D lighting + shadow contact
4) Foreground occlusion mask so some path segments/tokens pass “behind” props

This gives a 3D look while staying performant in mobile web.

---

## Rendering Architecture (must implement)

### Option A (recommended for v1): DOM/CSS + Canvas hybrid
- Background: `<img>`
- Board path glow + soft trail: `<canvas>`
- Tiles + token + stop markers: absolutely positioned DOM nodes
- Occlusion: CSS mask layer / alpha PNG overlay above token+tiles

### Option B (v2 upgrade): PixiJS scene graph
- If richer effects needed later, migrate renderer to PixiJS while keeping same layout data contracts.

v1 MUST ship with Option A unless there is a blocker.

---

## Art Pipeline Contract (per island)
For each island art, provide:
- `bg_<id>.webp` — base island image
- `depth_mask_<id>.png` — transparent alpha mask for foreground objects that should sit above board/token
- `board_grade_<id>.png` (optional) — subtle color grade to blend board with local lighting

Naming proposal:
- `/public/assets/islands/backgrounds/bg_001.webp`
- `/public/assets/islands/depth/depth_mask_001.png`
- `/public/assets/islands/grade/board_grade_001.png`

Rules:
- Board anchors never move.
- Only masks/grades vary by island to improve integration.

---

## Coordinate System
Define a canonical board space:
- width = 1000
- height = 1000

In the UI:
- render island background to fit container
- render board overlay on top
- transform canonical coords -> screen coords (scale + translate)

Add 1 extra normalized value per anchor:
- `zBand: 'back' | 'mid' | 'front'`

Purpose:
- controls draw order and shadow intensity
- helps create believable depth around curved pond ring

---

## Data: boardLayout.ts
Create a single file that exports:

- `TILE_ANCHORS: {id, x, y}[]` length 17
- `STOP_TILES: { stopId, tileIndex }[]` (5 entries)
- `TOKEN_START_TILE_INDEX` (0)

Extend anchor schema to:
`{ id, x, y, zBand, tangentDeg, scale }`

- `tangentDeg`: orientation of tile ring/path direction for effects and token facing
- `scale`: slight perspective compensation (e.g., far side 0.92, near side 1.08)

Example stop mapping:
- stop_hatchery -> tile 0
- stop_minigame -> tile 4
- stop_market -> tile 8
- stop_utility -> tile 12
- stop_boss -> tile 16

(Exact indices can be adjusted once and then never changed.)

---

## Rendering Layers (mobile)
1) Background image (island art)
2) Board path layer (ring trail around pond)
3) Tile glow/base layer (17 anchors)
4) Stop markers (5 special markers)
5) Token layer (spaceship)
6) Foreground depth mask (occlusion for 3D illusion)
7) HUD (hearts, timer, currency)
8) Modals (stop content)

Depth mask must be able to hide token/tile portions in selected regions.

---

## Dev Mode Overlay (required)
Implement a dev toggle:
- shows all 17 anchors
- shows indices
- shows stop labels
- shows zBand color coding (back=blue, mid=yellow, front=magenta)
- shows path spline and tangent arrows
This is essential for QA and future islands.

---

## Movement Algorithm
Inputs:
- currentTileIndex
- hearts
- spinTokens

Actions:
- ROLL_DICE (cost 1 heart): steps = rand 1..3
- USE_SPIN (cost 1 spin token): steps = rand 1..5

Advance:
- nextIndex = (currentIndex + steps) % 17

Animate:
- token moves through intermediate anchors (for juice)
- triggers tile land on final tile

Animation quality requirements:
- 60fps target on modern mobile, graceful degrade to 30fps
- easing on each hop (out cubic)
- token squash/stretch micro animation on land
- dynamic shadow follows zBand (lighter on back band, stronger on front)

On landing:
- resolve tile type + stop open if stop tile

---

## Tile Type Assignment
Because board positions are fixed, tile *types* must be data-driven per island run.

Create `generateTileMap(islandNumber, rarity, themeId, dayIndex)`:
- returns array length 17:
  - tileType: 'currency'|'chest'|'event'|'hazard'|'egg_shard'|'micro'|'encounter'|'stop'
  - stopId if stop

Stop tiles override whatever else.

Encounter tile spawns based on:
- rarity rules
- time rules (after Day 2 for seasonal/normal; always for rare)

---

## Time & Day Index
Compute:
- dayIndex = floor((now - startedAt) / 24h)  // 0,1,2
Used to unlock encounter spawn timing and “late-cycle juice”.

---

## Island Expiry & Travel
Expiry triggers in 3 places:
1) On app boot
2) On entering Level screen
3) Timer tick (e.g. 30s)

If expired:
- show TravelOverlay
- advance island_number
- reset run state (hearts, currency, token index, stops)
- handle eggs: convert ready island egg to dormant if not collected
- load next background
- hide overlay

---

## UI Screen Specs (mobile)
### IslandRunScreen
- top-left: LEVEL x / 120
- top-right: close
- top-mid/small: ends in HH:MM
- bottom HUD: hearts, currency, spin tokens
- tap primary CTA: “Roll” (large button)
- secondary CTA: “Spin” appears if spinTokens>0

### Stop Modals
- Hatchery modal
- Minigame modal (stub)
- Market modal
- Utility modal (stub)
- Boss modal (stub)

---

## Acceptance Tests
- token moves exactly between fixed anchors
- anchors align across multiple backgrounds
- board ring appears integrated with pond (not floating)
- depth mask correctly occludes token/tile in defined zones
- stop tiles open only on landing
- dice consumes hearts
- spin consumes spin token
- expiry advances island and plays overlay
- dev overlay shows anchors & indices

---

## Visual QA Checklist (new, mandatory)
- Tile readability at small screens (360x780)
- Contrast pass on bright and dark island arts
- No tile clipping on safe-area notches
- Path never crosses major landmarks (house/lighthouse/etc.)
- Foreground occlusion edges are feathered (no harsh cut)
- Token remains visually traceable at all zBands
