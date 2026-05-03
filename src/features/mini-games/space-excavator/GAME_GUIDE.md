# Treasure Dig Game - Object-Based Puzzle System

## Overview

This is a **puzzle-based excavation game** where players know exactly what they're digging for. Unlike the previous random tile reveal system, players now search for specific multi-tile objects shown as silhouettes at the top of the screen.

## Key Features

### ✅ Object-Based Gameplay
- Players always know what they're digging for
- Objects are multi-tile shapes (2x2, L-shapes, crosses, etc.)
- Silhouettes show at the top and gradually fill as tiles are revealed
- Visual feedback when objects are completed

### ✅ Enhanced Animations
- **Crack animation** when breaking tiles
- **Dust particle burst** on tile reveal
- **Sparkle effects** when hitting treasure tiles
- **Completion glow** when objects are fully discovered
- **Silhouette fill animation** showing progress

### ✅ Progression System
- **Level 1**: 5x5 board, 1 object, 12 tools (tutorial)
- **Levels 2-4**: 5-6x6 boards, 2-3 objects, increasing difficulty
- **Levels 5+**: 6-7x7 boards, multiple objects, strategic blockers

---

## How It Works

### Object Definition System

Objects are defined in `/src/data/shapes.ts`:

```typescript
{
  id: 'coin_small',           // Unique identifier
  name: 'Gold Coin',          // Display name
  icon: 'Coin',               // Phosphor icon component name
  color: 'gold',              // Color theme (gold, diamond, ruby, silver, bronze)
  pattern: [[1, 1], [1, 1]],  // 2D grid: 1 = object part, 0 = empty
}
```

**Available Shapes:**
- `coin_small` - 2x2 square
- `diamond_tiny` - Small diamond (3 tiles)
- `crown_medium` - Crown shape (6 tiles)
- `treasure_large` - 3x3 chest
- `ruby_cross` - Plus/cross shape (5 tiles)
- `silver_bar` - 1x3 horizontal line
- `bronze_l` - L-shaped relic (5 tiles)
- `diamond_big` - Large diamond (8 tiles)

### Object Placement

Objects are placed in level configs (`/src/data/levels.ts`):

```typescript
{
  id: 1,
  name: 'Tutorial Dig',
  boardSize: 5,
  tools: 12,
  objects: [
    { shapeId: 'coin_small', position: { row: 1, col: 1 } }
  ],
  blockers: [{ row: 0, col: 4 }]  // Optional obstacles
}
```

The `position` is the **top-left anchor** of the object's pattern.

### How Shapes Are Placed

The placement engine (`/src/game/placement.ts`) converts patterns to board positions:

1. **Pattern Reading**: Reads the 2D pattern array
2. **Position Calculation**: For each `1` in the pattern, calculates actual board coordinates
3. **Collision Detection**: Ensures objects don't overlap with each other or blockers
4. **Boundary Checking**: Validates objects fit within board boundaries

Example:
```typescript
// Shape with pattern: [[1, 1], [1, 1]]
// Placed at position {row: 1, col: 1}
// Results in tiles at:
// - {row: 1, col: 1}
// - {row: 1, col: 2}
// - {row: 2, col: 1}
// - {row: 2, col: 2}
```

### Discovery & Completion Tracking

Objects track revealed tiles using the `PlacedObject` type:

```typescript
{
  id: 'obj-1-0',              // Unique runtime ID
  shapeId: 'coin_small',      // Reference to shape definition
  position: {row: 1, col: 1}, // Anchor position
  cells: [                    // All tile positions
    {row: 1, col: 1},
    {row: 1, col: 2},
    {row: 2, col: 1},
    {row: 2, col: 2}
  ],
  revealedCells: Set<string>, // Set of "row,col" keys for revealed tiles
  isCollected: boolean        // True when all cells revealed
}
```

When a tile is broken:
1. Check if tile has an `objectId`
2. Find the corresponding `PlacedObject`
3. Add tile position to `revealedCells` set
4. Check if `revealedCells.size === cells.length`
5. If complete, mark `isCollected = true`

### Silhouette Preview System

The `ObjectSilhouette` component (`/src/components/ObjectSilhouette.tsx`):

- Renders the object's pattern as a grid
- Each cell is either filled (if revealed) or grayed out (if hidden)
- Shows the object's icon below the pattern
- Animates when cells are revealed
- Glows and celebrates when object is completed

---

## Adding New Content

### Adding a New Object Shape

1. Open `/src/data/shapes.ts`
2. Add a new object to the `objectShapes` array:

```typescript
{
  id: 'emerald_triangle',
  name: 'Emerald Triangle',
  icon: 'Triangle',  // Must be a valid Phosphor icon name
  color: 'diamond',  // or 'gold', 'ruby', 'silver', 'bronze'
  pattern: [
    [0, 1, 0],
    [1, 1, 1]
  ]
}
```

3. The shape is now available to use in levels

### Adding a New Level

1. Open `/src/data/levels.ts`
2. Add a new level config to the `levels` array:

```typescript
{
  id: 9,                    // Sequential ID
  name: 'Emerald Cavern',   // Display name
  boardSize: 7,             // 5, 6, or 7
  tools: 30,                // Number of digs allowed
  objects: [
    { shapeId: 'emerald_triangle', position: { row: 2, col: 2 } },
    { shapeId: 'coin_small', position: { row: 5, col: 5 } }
  ],
  blockers: [               // Optional
    { row: 0, col: 0 },
    { row: 0, col: 6 }
  ]
}
```

**Level Design Tips:**
- Start simple (1 object, small board, generous tools)
- Gradually increase complexity
- Tool count should be ~1.5x the minimum needed
- Use blockers to create strategic challenge
- Place objects to encourage pattern recognition

### Creating Custom Shapes

Shapes use a 2D array where:
- `1` = part of the object
- `0` = empty space

Examples:

```typescript
// T-shape
pattern: [
  [1, 1, 1],
  [0, 1, 0]
]

// Z-shape
pattern: [
  [1, 1, 0],
  [0, 1, 1]
]

// Arrow
pattern: [
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0],
  [0, 1, 0]
]

// House
pattern: [
  [0, 1, 0],
  [1, 1, 1],
  [1, 0, 1]
]
```

---

## File Structure

### Core Game Files

```
src/
├── components/
│   ├── ObjectSilhouette.tsx       # NEW: Shows object discovery progress
│   ├── TileCell.tsx                # Enhanced with dig animations
│   ├── TopProgressHud.tsx          # Updated to show silhouettes
│   ├── TreasureBoard.tsx           # Board rendering
│   ├── ToolBar.tsx                 # Tool counter and controls
│   └── RewardModal.tsx             # Level complete modal
├── data/
│   ├── shapes.ts                   # ⭐ Object definitions
│   └── levels.ts                   # ⭐ Level configurations
├── game/
│   ├── engine.ts                   # Board generation logic
│   ├── placement.ts                # Object placement system
│   ├── winConditions.ts            # Completion checking
│   └── scoring.ts                  # Score calculation
├── hooks/
│   └── useTreasureDigGame.ts       # Main game state hook
├── types/
│   └── game.ts                     # TypeScript definitions
└── screens/
    └── TreasureDigFeature.tsx      # Top-level feature component
```

### Key Files for Content Creation

1. **`/src/data/shapes.ts`** - Add new objects here
2. **`/src/data/levels.ts`** - Add new levels here
3. **`/src/components/ObjectSilhouette.tsx`** - Customize silhouette appearance

---

## Animation System

### Tile Dig Sequence

1. **Click** → Tile scale down (tap feedback)
2. **Breaking State** → Shake + crack overlay appears
3. **Dust Particles** → 6 particles burst outward
4. **Delay (200ms)** → Suspenseful pause
5. **Reveal** → Tile shows final state (empty/object/blocker)

### Object Discovery Feedback

- **Hit Object Tile** → Gold sparkle + glow effect
- **Silhouette Cell Fill** → Cell animates from gray to colored
- **Complete Object** → Silhouette border glows, icon fills, celebration animation

### Configuration

Animation timings in `/src/game/config.ts`:

```typescript
ANIMATION: {
  TILE_BREAK_DURATION: 200,    // Crack/shake duration
  TILE_REVEAL_DELAY: 200,      // Delay before showing result
  TILE_SCALE_SPRING: {...},    // Spring physics for reveals
}
```

---

## Game Loop

```
1. Player sees silhouettes of hidden objects
2. Player taps a tile
3. Crack animation + dust particles
4. Tile reveals (empty / object part / blocker)
5. If object tile → Add to object's revealedCells
6. If object complete → Silhouette celebrates
7. If all objects found → Level complete
8. If tools reach 0 before complete → Game over
```

---

## Testing New Levels

1. Add your level to `/src/data/levels.ts`
2. Reload the game
3. Progress through levels or temporarily change `initialLevel` prop
4. Verify:
   - Objects fit on the board
   - No overlap with blockers
   - Tool count is appropriate
   - Silhouettes display correctly

---

## Advanced Customization

### Custom Object Colors

Add new color schemes in `/src/components/ObjectSilhouette.tsx`:

```typescript
const SHAPE_COLORS: Record<string, string> = {
  gold: 'from-yellow-300 to-yellow-500',
  emerald: 'from-emerald-300 to-emerald-600',  // New color
}
```

### Custom Icons

Objects use Phosphor icons. Browse available icons:
https://phosphoricons.com/

Then use the exact component name in your shape definition:
```typescript
icon: 'Lighthouse'  // Must match Phosphor icon component name
```

---

## Summary

### What Changed
- ✅ Replaced random tile reveal with deterministic object placement
- ✅ Added object silhouette preview system
- ✅ Enhanced dig animations (cracks, dust, sparkles)
- ✅ Improved level progression (8 levels with gradual difficulty)
- ✅ Player always knows what they're searching for

### What Stayed the Same
- ✅ Core component structure unchanged
- ✅ Tool-based resource management
- ✅ Grid-based board system
- ✅ Blocker/hazard mechanics
- ✅ Score and reward system

### Game Feel Improvements
- 🎯 **Intentional Search** - Players hunt for specific objects
- 🔍 **Pattern Recognition** - Visual silhouettes guide discovery
- ✨ **Satisfying Feedback** - Enhanced animations make every dig feel impactful
- 📈 **Progressive Challenge** - Smooth difficulty curve across 8 levels
