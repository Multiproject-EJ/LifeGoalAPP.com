# Theme System Implementation Summary

## Overview
A clean, configuration-driven level-based theme system has been implemented. Each level now has a distinct visual identity controlled by a centralized theme configuration.

## Architecture

### 1. Theme Configuration (`src/game/themes.ts`)

**Location**: `/workspaces/spark-template/src/game/themes.ts`

**What it does**:
- Defines the `LevelTheme` interface with:
  - `tiles.hidden`: Color for unrevealed tiles
  - `tiles.damaged`: Color for cracked/damaged tiles  
  - `tiles.revealed`: Color for revealed empty tiles
  - `background`: Overall background tone for the level
  - `accent`: Color used for HUD elements and progress bar

- Contains `LEVEL_THEMES` object with 5 predefined themes:
  - `soft_sand` - Warm sandy tones (levels 1-5)
  - `warm_rich` - Rich earthy browns (levels 6-10)
  - `deep_stone` - Cool stone grays (levels 11-15)
  - `neon_transition` - Vibrant purples (levels 16-20)
  - `neon_peak` - Intense magentas (levels 21-25)

- Provides `getThemeForLevel(levelId)` function that maps level numbers to themes

**All color values use OKLCH format** for consistent, perceptually uniform color representation.

### 2. Theme Provider (`src/game/ThemeProvider.tsx`)

**Location**: `/workspaces/spark-template/src/game/ThemeProvider.tsx`

**What it does**:
- React Context provider that makes the current theme available to all child components
- Exports `useTheme()` hook for consuming the theme in components
- Ensures theme is accessible without prop drilling

### 3. Level → Theme Mapping

**How levels select themes**:

```typescript
// In TreasureDigFeature.tsx
const theme = getThemeForLevel(currentLevel)

// The mapping logic in themes.ts:
if (levelId >= 1 && levelId <= 5) return LEVEL_THEMES.soft_sand
if (levelId >= 6 && levelId <= 10) return LEVEL_THEMES.warm_rich
if (levelId >= 11 && levelId <= 15) return LEVEL_THEMES.deep_stone
if (levelId >= 16 && levelId <= 20) return LEVEL_THEMES.neon_transition
if (levelId >= 21 && levelId <= 25) return LEVEL_THEMES.neon_peak
```

The theme automatically updates when `currentLevel` changes, triggering a visual transition.

### 4. Theme Consumption

**How tiles consume theme values**:

**TileCell component** (`src/components/TileCell.tsx`):
```typescript
const theme = useTheme()

const getTileBackgroundStyle = () => {
  if (isHidden) return { backgroundColor: theme.tiles.hidden }
  if (isDamaged) return { backgroundColor: theme.tiles.damaged }
  if (isTreasure) return { backgroundColor: `${theme.accent}20` }
  return { backgroundColor: theme.tiles.revealed }
}

// Applied as inline style:
<motion.button style={getTileBackgroundStyle()} />
```

**ProgressionBar component** (`src/components/ProgressionBar.tsx`):
```typescript
const theme = useTheme()

// Progress bar gradient uses theme colors:
<motion.div 
  style={{ 
    background: `linear-gradient(to right, ${theme.tiles.hidden}, ${theme.accent})` 
  }}
/>
```

**TreasureDigFeature component** (`src/screens/TreasureDigFeature.tsx`):
```typescript
const theme = getThemeForLevel(currentLevel)

// Wraps entire feature in ThemeProvider:
<ThemeProvider theme={theme}>
  <div style={{ backgroundColor: theme.background }}>
    {/* All child components */}
  </div>
</ThemeProvider>
```

## Key Design Decisions

### ✅ No Randomness
All colors are deterministic - same level always gets same colors.

### ✅ No Inline Styles (Except for Theme Colors)
Theme colors are applied via inline styles, but all other styling uses Tailwind classes. This keeps theme values dynamic while maintaining clean code.

### ✅ Configuration-Driven
Adding a new theme requires:
1. Add theme definition to `LEVEL_THEMES` in `themes.ts`
2. Update `getThemeForLevel()` mapping
3. No component changes needed

### ✅ Clean Separation
- **Theme Config**: `src/game/themes.ts`
- **Theme Distribution**: `src/game/ThemeProvider.tsx`
- **Theme Consumption**: Individual components via `useTheme()`

## Example: Adding a New Theme

```typescript
// In src/game/themes.ts

export const LEVEL_THEMES: Record<string, LevelTheme> = {
  // ... existing themes ...
  
  ice_cave: {
    id: 'ice_cave',
    name: 'Ice Cave',
    tiles: {
      hidden: 'oklch(0.85 0.04 240)',
      damaged: 'oklch(0.78 0.06 235)',
      revealed: 'oklch(0.92 0.02 245)',
    },
    background: 'oklch(0.95 0.01 240)',
    accent: 'oklch(0.70 0.14 235)',
  },
}

// Update mapping:
export function getThemeForLevel(levelId: number): LevelTheme {
  // ... existing mappings ...
  if (levelId >= 26 && levelId <= 30) {
    return LEVEL_THEMES.ice_cave
  }
  return LEVEL_THEMES.soft_sand
}
```

No component code needs to change - the new theme automatically applies to levels 26-30.
