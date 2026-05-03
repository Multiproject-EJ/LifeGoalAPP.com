# Tile Visual States Reference

This document explains how the four distinct tile visual states work in the Treasure Dig game.

## Overview

The game uses **4 clearly distinct visual states** to communicate tile status to the player:

1. **HIDDEN TILE** - Undug ground
2. **PARTIALLY DUG TILE** - Cracked but not fully broken
3. **REVEALED MISS** - Empty ground (nothing found)
4. **REVEALED HIT** - Treasure fragment found

---

## 1. HIDDEN TILE

**Status:** `hidden`

**Visual Characteristics:**
- Dark dirt gradient (`from-primary to-primary/80`)
- Solid appearance with subtle shimmer animation
- No cracks or breaks
- Hover effect brightens slightly
- Box shadow for depth

**Code Location:**
- `TileCell.tsx` - Line 15 in `TILE_COLORS` object
- `TileCell.tsx` - Lines 376-383 (shimmer animation overlay)

**CSS:**
```css
bg-gradient-to-br from-primary to-primary/80 
hover:from-primary/90 hover:to-primary/70 
shadow-lg
```

---

## 2. PARTIALLY DUG TILE (Breaking State)

**Status:** `breaking`

**Visual Characteristics:**
- Lighter dirt color (`from-primary/70 to-primary/50`)
- Animated crack overlay appears
- Dust particle burst
- Tile shakes slightly
- **Does NOT show what's underneath yet**

**Code Location:**
- `TileCell.tsx` - Line 16 in `TILE_COLORS` object
- `TileCell.tsx` - Lines 131-186 (`CrackOverlay` component)
- `TileCell.tsx` - Lines 84-129 (`DustParticles` component)
- `TileCell.tsx` - Line 332 (crack overlay rendering)

**Animation Details:**
- Crack lines draw in progressively (SVG path animation)
- 12 dust particles burst outward radially
- Tile scales to 0.95 and shakes
- Duration: ~150ms

**Use Cases:**
- Temporary state during dig animation
- Future: multi-hit tiles showing progressive damage
- Hard tiles that require 2-3 hits

---

## 3. REVEALED MISS (Empty)

**Status:** `revealed-empty`

**Visual Characteristics:**
- Light, flat background (`from-secondary/60 to-secondary/40`)
- Subtle border (`border border-border`)
- Full-tile subtle gradient overlay
- **No glow, no sparkle, no bright colors**
- Clearly "nothing here"

**Code Location:**
- `TileCell.tsx` - Line 17 in `TILE_COLORS` object
- `TileCell.tsx` - Lines 362-370 (empty tile content)

**CSS:**
```css
/* Tile background */
bg-gradient-to-br from-secondary/60 to-secondary/40 
border border-border

/* Inner content */
bg-gradient-to-br from-muted/10 to-muted/5
```

**Visual Goal:**
- Player immediately recognizes "wasted dig"
- Flat, dull, uninspiring
- Contrasts strongly with hit tiles

---

## 4. REVEALED HIT (Treasure Fragment)

**Status:** `revealed-object`

**Visual Characteristics:**
- Light background base (`from-accent/20 to-accent/10`)
- **Bright, colorful treasure sprite fills the tile**
- Thick colored border matching treasure type (3px)
- Permanent subtle glow/shadow
- Sparkle animation on reveal
- Strong visual contrast from all other states

**Code Location:**
- `TileCell.tsx` - Line 18 in `TILE_COLORS` object
- `TileCell.tsx` - Lines 32-53 (`SPRITE_COLORS` object - defines treasure colors)
- `TileCell.tsx` - Lines 55-82 (`getSpriteVisual` function - renders treasure)
- `TileCell.tsx` - Lines 336-349 (revealed object rendering with glow)
- `TileCell.tsx` - Lines 188-227 (`SparkleParticles` component)
- `TileCell.tsx` - Lines 229-246 (`GlowPulse` component)

**Treasure Color Variants:**
- **Gold:** `from-yellow-400 via-yellow-500 to-yellow-600`
- **Diamond:** `from-cyan-300 via-blue-400 to-blue-500`
- **Ruby:** `from-red-400 via-pink-500 to-red-600`
- **Silver:** `from-gray-300 via-gray-400 to-gray-500`
- **Bronze:** `from-orange-400 via-amber-500 to-orange-600`

**Animation on Reveal:**
1. Initial glow pulse (0-600ms)
2. 6 sparkle particles appear at different positions (0-800ms)
3. Treasure sprite scales and rotates in
4. Permanent ring glow remains (`ring-2 ring-accent/40`)

**Visual Goal:**
- Player INSTANTLY knows they found treasure
- Rewarding, satisfying feedback
- Clear visual distinction from cracked tiles
- Never looks like a "partial dig"

---

## Key Files

### Primary File
**`src/components/TileCell.tsx`**
- Contains all tile rendering logic
- Defines all 4 visual states
- Handles animations and transitions

### Type Definitions
**`src/types/game.ts`**
- Line 1: `TileStatus` type (defines valid statuses)
- Lines 10-20: `Tile` interface

### Game Configuration
**`src/game/config.ts`**
- Animation timing constants
- Tile break duration
- Shake frames

---

## How Tile States are Determined

The tile status is set by the game engine, not the UI:

1. **Initial State:** All tiles start as `hidden`
2. **On Click:** Tile becomes `breaking` (temporary, ~150ms)
3. **After Animation:** Engine determines what was underneath:
   - Empty cell → `revealed-empty`
   - Object cell → `revealed-object`
   - Blocker cell → `revealed-blocker`

**Engine Logic Location:**
- `src/game/engine.ts` - `digTile()` function
- `src/hooks/useTreasureDigGame.ts` - handles dig action

---

## Visual Hierarchy (Brightness/Attention)

From most to least visually prominent:

1. **REVEALED HIT** ⭐ - Bright, glowing, colorful
2. **HIDDEN TILE** 🟫 - Dark, solid, noticeable
3. **PARTIALLY DUG** 💥 - Medium, animated, transitional
4. **REVEALED MISS** 💤 - Dull, flat, de-emphasized

This hierarchy ensures:
- Hits are ALWAYS most prominent
- Player's eye drawn to found treasure
- Empty tiles fade into background
- Hidden tiles invite exploration

---

## Future Enhancements

### Multi-Hit Hard Tiles
Currently planned but not fully implemented:
- Tiles with `hp > 1` show crack overlay
- Each hit increases crack severity
- Final hit reveals what's underneath

**Implementation Note:**
The `breaking` state and `CrackOverlay` were designed with this in mind. You can reuse the crack visual for progressive damage states.

---

## Troubleshooting

### "Hits look like misses"
- Check that `revealed-object` tiles have `spritePosition` and `objectColor` properties
- Verify `getSpriteVisual()` is rendering
- Confirm accent color is distinct in `index.css`

### "Can't tell if tile is broken or not"
- Ensure `breaking` state only lasts 100-150ms
- Check that crack overlay only shows during `breaking`
- Verify revealed states don't show cracks

### "Treasures don't stand out"
- Increase border thickness in `getSpriteVisual` (line 67)
- Boost sprite opacity (line 63)
- Add more contrast to sprite colors (lines 32-53)
- Increase permanent glow intensity (line 343)

---

## Summary

| State | Background | Overlay | Animation | Purpose |
|-------|-----------|---------|-----------|---------|
| **Hidden** | Dark dirt gradient | Shimmer | Pulse | Undiscovered |
| **Breaking** | Medium dirt | Cracks + dust | Shake + burst | Digging in progress |
| **Miss** | Light flat | None | Fade in | Nothing found |
| **Hit** | Light base | Bright sprite + glow | Sparkle + spin | Treasure found! |

The key principle: **A player must NEVER confuse a treasure hit with a partial dig or miss.**
