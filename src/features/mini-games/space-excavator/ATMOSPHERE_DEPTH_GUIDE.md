# Atmospheric Depth & Fog-of-War Treatment

This document explains the subtle atmospheric depth effects added to the Treasure Dig Bingo game board and tiles to enhance visual immersion while preserving gameplay clarity.

## Overview

The atmospheric depth system adds three-dimensional visual treatment to make the board feel more alive and immersive:

1. **Board-level depth** - Subtle shadows, vignette, and glow effects around the entire board
2. **Tile-level depth** - Embedded appearance for hidden/damaged tiles with layered shadows and highlights
3. **Theme-adaptive atmosphere** - Different visual treatments for standard vs. neon themes

## Implementation Details

### Board Depth Styling

**Location**: `src/components/TreasureBoard.tsx`

The board container now includes:

- **Box Shadow**: Creates depth beneath the board
  - Standard themes: `0 12px 40px -8px rgba(0, 0, 0, 0.15)` (soft dark shadow)
  - Neon themes: `0 12px 40px -8px ${theme.accent}25` (colored glow)
  
- **Inset Shadow**: Subtle inner shadow for embedded feel
  - Standard themes: `inset 0 0 60px -10px rgba(0, 0, 0, 0.08)` (very subtle darkening)
  - Neon themes: `inset 0 0 60px -10px ${theme.accent}15` (subtle accent glow)

- **Vignette Overlay**: Radial gradient that slightly darkens/softens outer edges
  - Standard themes: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.06) 100%)`
  - Neon themes: `radial-gradient(ellipse at center, transparent 35%, ${theme.accent}08 100%)`

**Theme Detection Logic**:
```typescript
const isNeonTheme = theme.id === 'neon_transition' || theme.id === 'neon_peak'
```

### Tile Depth Treatment

**Location**: `src/components/TileCell.tsx`

Hidden and damaged tiles now have enhanced depth through:

#### 1. Inset Shadows & Highlights
Applied via `getTileBackgroundStyle()`:

**Standard Themes**:
```css
box-shadow: 
  inset 0 2px 6px rgba(0, 0, 0, 0.15),     /* Top shadow - embedded feel */
  inset 0 -1px 3px rgba(255, 255, 255, 0.15), /* Bottom highlight - dimensional edge */
  0 1px 2px rgba(0, 0, 0, 0.1)              /* Outer shadow - lift slightly */
```

**Neon Themes**:
```css
box-shadow: 
  inset 0 2px 6px rgba(0, 0, 0, 0.2),      /* Stronger shadow for contrast */
  inset 0 -1px 3px rgba(255, 255, 255, 0.1), /* Subtle highlight */
  0 1px 2px ${theme.accent}30               /* Colored outer glow */
```

#### 2. Layered Surface Gradient
Applied via `getMilestoneOverlayStyle()`:

Combines two gradients for a multi-dimensional surface:

1. **Depth Gradient**: Creates light-to-dark sweep
   ```css
   linear-gradient(135deg, 
     rgba(255, 255, 255, 0.12) 0%,    /* Top-left highlight */
     transparent 45%,                  /* Fade to neutral */
     rgba(0, 0, 0, 0.1) 100%          /* Bottom-right shadow */
   )
   ```

2. **Texture Pattern**: Diagonal stripe overlay (existing milestone system)
   ```css
   repeating-linear-gradient(45deg,
     transparent,
     transparent 10px,
     rgba(255, 255, 255, ${intensity}) 10px,
     rgba(255, 255, 255, ${intensity}) 11px
   )
   ```

Both gradients are layered: `backgroundImage: ${depthGradient}, ${baseGradient}`

### Theme Adaptation System

The depth treatment automatically adapts to the 5 level theme groups:

| Theme Group | Level Range | Depth Treatment |
|-------------|-------------|-----------------|
| **Soft Sand** | 1-5 | Subtle warm shadows, minimal depth |
| **Warm Rich** | 6-10 | Moderate shadows, earthy feel |
| **Deep Stone** | 11-15 | Stronger depth, cool shadows |
| **Neon Transition** | 16-20 | Accent-colored glow, moderate depth |
| **Neon Peak** | 21-25 | Strong accent glow, vibrant atmosphere |

**Neon Theme Enhancements**:
- Outer board shadows use theme accent color instead of black
- Vignette uses colored glow instead of darkening
- Tile outer shadows have subtle accent tint
- Atmosphere feels more "energetic" while maintaining readability

## Gameplay Clarity Preservation

### Design Principles Applied

1. **Subtlety First**: All effects use low opacity (0.06-0.2 range)
2. **Edge-Only Treatment**: Vignette affects outer 60-65% of board, keeping center clear
3. **Contrast Maintenance**: Shadows and highlights enhance existing tile colors, never obscure them
4. **Revealed Tiles Unaffected**: Depth treatment only applies to hidden/damaged tiles
5. **Special Tiles Stand Out**: Chain, bomb, reveal, and bonus tiles retain their distinctive rings and icons

### Readability Safeguards

- **Hidden tiles**: Still clearly scannable with distinct color and embedded appearance
- **Damaged/cracked tiles**: Crack overlays remain highly visible over depth treatment
- **Revealed treasure**: Bright sprite visuals with accent rings cut through atmosphere
- **Revealed empty**: Clean, minimal background maintains distinction
- **Tile state transitions**: Depth effects animate smoothly during reveals

### Testing Checklist

When verifying the implementation:

- [ ] Hidden tiles are easy to identify at a glance
- [ ] Cracked tiles with different HP levels are visually distinct
- [ ] Revealed treasure stands out strongly against hidden tiles
- [ ] Special tile indicators (lightning, eye, gift icons) are clearly visible
- [ ] Board edges are slightly softened but not obscured
- [ ] Neon levels feel more atmospheric without losing clarity
- [ ] Animation transitions (breaking, revealing) work smoothly with depth effects

## Performance Considerations

All depth effects use:
- **CSS gradients and box-shadows** - Hardware accelerated
- **No additional DOM elements** for atmosphere (uses existing overlays)
- **Static styles** - No animation on depth layers (only on content)
- **Minimal repaints** - Effects are applied once per tile state

## Future Enhancement Opportunities

Potential refinements that could be added:

1. **Parallax depth**: Subtle tile movement on board tilt (mobile gyroscope)
2. **Progressive fog**: Outer edges get slightly more atmospheric as level progresses
3. **Dynamic lighting**: Subtle light source shift based on time of day
4. **Treasure glow bleed**: Revealed treasure could cast subtle glow on adjacent tiles
5. **Milestone-based atmosphere**: Different depth intensity per milestone stage

## Code Reference

Key files modified:
- `src/components/TreasureBoard.tsx` - Board container depth and vignette
- `src/components/TileCell.tsx` - Individual tile depth treatment
- `src/game/themes.ts` - Theme definitions (existing, read-only)
- `src/game/ThemeProvider.tsx` - Theme context (existing, read-only)

No configuration files were added - the system adapts automatically to existing theme data.
