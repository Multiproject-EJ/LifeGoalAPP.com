# AUDIO + HAPTICS + ASSETS + MINIGAME TEMPLATE

## Audio System
Two channels:
1) Ambient (loop, low volume)
2) SFX (short)

Per theme ambient:
`/public/assets/audio/ambience/amb_<themeId>.mp3`

Core SFX:
- sfx_dice_roll.mp3
- sfx_tile_land.mp3
- sfx_chest_open.mp3
- sfx_egg_stage_up.mp3
- sfx_egg_hatch.mp3
- sfx_market_buy.mp3
- sfx_boss_win.mp3
- sfx_hazard_hit.mp3
- sfx_spin.mp3

## Haptics Map (mobile)
- dice roll: light impact
- tile land: selection
- chest open: medium impact
- egg stage up: soft success
- egg hatch: success
- market buy: confirmation
- hazard: warning
- spin: rigid
- boss win: success

Implement via:
- iOS: UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
- Android: VibrationEffect (or web vibration API where available)

## Mobile UX constraints
- hit targets >= 44px (tiles prefer 52–64px)
- avoid rapid haptic spam (debounce tile land)
- audio respects silent mode settings where possible

---

# Asset Naming (mandatory)

## Island backgrounds
`/public/assets/islands/backgrounds/bg_001.webp` ... `bg_020.webp`

## Depth masks (for 3D-hybrid occlusion)
`/public/assets/islands/depth/depth_mask_001.png` ...

## Optional board color grading overlays
`/public/assets/islands/grade/board_grade_001.png` ...

## Custom islands (if any)
`/public/assets/islands/custom/island_001.webp` ...

## Tiles
`/public/assets/tiles/tile_currency.webp`
`tile_chest.webp`
`tile_event.webp`
`tile_hazard.webp`
`tile_micro.webp`
`tile_encounter.webp`
`tile_stop_hatchery.webp`
`tile_stop_habit.webp`
`tile_stop_mystery.webp`
`tile_stop_wisdom.webp`
`tile_stop_boss.webp`

## Token
`/public/assets/token/token_ship_default.webp`

## Travel overlay assets (if not lottie)
`/public/assets/travel/travel_starfield.webp`
`/public/assets/travel/travel_warp.webp`

---

# Mini-Game Dev Plan Requirement

Each minigame gets its own plan at:
`/docs/minigames/MINIGAME_<NAME>_DEVPLAN.md`

Each plan MUST include:

## 1) Purpose
What fun loop it adds and why it fits HabitGame.

## 2) Entry Point Contract
- Trigger: landing on Stop 2
- Cost: island currency (or ticket)
- Duration: 20–60s

## 3) Controls (mobile)
- one-handed
- tap/drag only
- no precision tiny targets

## 4) Rewards Contract
Return a RewardBundle:
- heartsDelta
- currencyDelta
- spinTokensDelta
- boosters[]
- cosmetics[] (optional)

## 5) Difficulty
- base easy
- late-cycle slightly harder (optional)
- rare island modifier (optional)

## 6) Audio/Haptics
Map key events to the standard system.

## 7) Implementation Plan
File list + components + state + tests.

---

# Template: MINIGAME_<NAME>_DEVPLAN.md

## MINIGAME: <NAME>
Parent: docs/00_MAIN_GAME_120_ISLANDS_INDEX.md

### Goal
### Player Loop
### Controls
### Entry & Cost
### Rewards Output Contract
### Difficulty Rules
### Audio & Haptics
### Files To Create/Modify
### Acceptance Tests
### Slice Plan (3–6 slices)
