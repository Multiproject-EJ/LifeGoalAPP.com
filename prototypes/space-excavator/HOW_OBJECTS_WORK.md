# Treasure Dig Game - Complete System Documentation

## 🎮 Game Overview

This is now a **proper puzzle excavation game** where players search for specific multi-tile treasure objects. The key difference from before: **players always know what they're digging for** via silhouettes shown at the top of the screen.

---

## 🎯 How Objects Work

### Object Definition

Objects are defined in `/src/data/shapes.ts` with this structure:

```typescript
{
  id: 'coin_small',           // Unique ID (used in level configs)
  name: 'Gold Coin',          // Display name (for UI)
  icon: 'Coin',               // Phosphor icon component name
  color: 'gold',              // Color theme
  pattern: [[1, 1], [1, 1]],  // Shape as 2D grid
}
```

### Pattern System

The `pattern` is a 2D array representing the object's shape:
- `1` = part of the object (will be a tile on the board)
- `0` = empty space (won't occupy a tile)

**Examples:**

```typescript
// 2x2 Square (4 tiles)
[[1, 1],
 [1, 1]]

// L-Shape (5 tiles)
[[1, 0],
 [1, 0],
 [1, 1]]

// Cross/Plus (5 tiles)
[[0, 1, 0],
 [1, 1, 1],
 [0, 1, 0]]

// Diamond (5 tiles)
[[0, 1, 0],
 [1, 1, 1],
 [0, 1, 0]]

// Large Diamond (8 tiles)
[[0, 1, 1, 0],
 [1, 1, 1, 1],
 [0, 1, 1, 0]]

// Horizontal Bar (3 tiles)
[[1, 1, 1]]

// T-Shape (4 tiles)
[[1, 1, 1],
 [0, 1, 0]]
```

The pattern is **read from top-left**, so a pattern like:
```typescript
[[0, 1],
 [1, 1]]
```
Creates this shape:
```
. X
X X
```

### Available Objects

| ID | Name | Tiles | Shape |
|----|------|-------|-------|
| `coin_small` | Gold Coin | 4 | 2×2 square |
| `diamond_tiny` | Diamond Shard | 5 | Small diamond |
| `crown_medium` | Ancient Crown | 6 | Crown shape |
| `treasure_large` | Treasure Chest | 9 | 3×3 square |
| `ruby_cross` | Ruby Cross | 5 | Plus/cross |
| `silver_bar` | Silver Bar | 3 | Horizontal line |
| `bronze_l` | Bronze Relic | 5 | L-shape |
| `diamond_big` | Large Diamond | 8 | Wide diamond |

---

## 📍 How Shapes Are Placed

### Level Configuration

In `/src/data/levels.ts`, objects are placed like this:

```typescript
{
  id: 1,
  name: 'Tutorial Dig',
  boardSize: 5,              // 5×5 grid
  tools: 12,                 // Number of digs allowed
  objects: [
    { 
      shapeId: 'coin_small',      // Which object
      position: { row: 1, col: 1 } // Where to place it
    }
  ]
}
```

### Position = Top-Left Anchor

The `position` is the **top-left corner** of the pattern's bounding box.

Example:
```typescript
// Pattern:
[[1, 1],
 [1, 1]]

// Position: {row: 1, col: 1}

// Board Result:
Row 0: [ ][ ][ ][ ][ ]
Row 1: [ ][X][X][ ][ ]  ← Row 1, Col 1 is anchor
Row 2: [ ][X][X][ ][ ]
Row 3: [ ][ ][ ][ ][ ]
Row 4: [ ][ ][ ][ ][ ]
```

### Placement Engine Logic

The engine (`/src/game/placement.ts`) does this:

1. **Read the pattern** and find all `1` cells
2. **Calculate absolute positions** by adding pattern offsets to anchor position
3. **Validate placement**:
   - All tiles fit within board boundaries
   - No overlap with other objects
   - No overlap with blockers
4. **Create PlacedObject** with all tile coordinates

### Multiple Objects Example

```typescript
objects: [
  { shapeId: 'coin_small', position: { row: 0, col: 0 } },
  { shapeId: 'silver_bar', position: { row: 3, col: 2 } }
]
```

On a 5×5 board:
```
[X][X][ ][ ][ ]  ← coin_small at (0,0)
[X][X][ ][ ][ ]
[ ][ ][ ][ ][ ]
[ ][ ][B][B][B]  ← silver_bar at (3,2)
[ ][ ][ ][ ][ ]
```

---

## 🎨 How Objects Are Displayed

### Silhouette Component

The `ObjectSilhouette` component shows:

1. **Grid Pattern**: Recreates the object's shape
   - Gray cells = not yet discovered
   - Colored cells = revealed on board

2. **Icon**: Below the grid
   - Outline when incomplete
   - Filled when complete

3. **Animations**:
   - Cells scale/rotate when revealed
   - Border glows on completion
   - Sparkle effects celebrate success

### Color Mapping

```typescript
const SHAPE_COLORS = {
  gold: 'from-yellow-300 to-yellow-500',
  diamond: 'from-cyan-300 to-blue-500',
  ruby: 'from-red-400 to-pink-500',
  silver: 'from-gray-300 to-gray-500',
  bronze: 'from-orange-400 to-amber-600',
}
```

Each object's `color` property maps to these gradient classes.

---

## 🔍 Discovery & Tracking

### How the Game Tracks Progress

Each placed object has this structure:

```typescript
{
  id: 'obj-1-0',              // Runtime ID (level-instance)
  shapeId: 'coin_small',      // Reference to shape definition
  position: {row: 1, col: 1}, // Anchor on board
  
  cells: [                    // All tiles that are part of this object
    {row: 1, col: 1},
    {row: 1, col: 2},
    {row: 2, col: 1},
    {row: 2, col: 2}
  ],
  
  revealedCells: Set([        // Which tiles have been dug
    "1,1",                    // Format: "row,col"
    "1,2"                     // 2 out of 4 found
  ]),
  
  isCollected: false          // true when all cells revealed
}
```

### Dig Flow

```
1. Player clicks tile at (1, 1)
2. Engine checks: does this tile have an objectId?
3. If yes, find the PlacedObject by ID
4. Add "1,1" to object.revealedCells
5. Check: revealedCells.size === cells.length?
6. If yes: object.isCollected = true
7. Silhouette animates the newly revealed cell
8. If object complete, silhouette celebrates
```

### Win Condition

```typescript
// Level complete when all objects collected
const allCollected = Array.from(board.objects.values())
  .every(obj => obj.isCollected)
```

---

## ✨ Animation System

### Tile Dig Sequence

**Timeline:**
```
0ms   → Click (scale to 90%)
100ms → Breaking state starts
        - Crack overlay fades in
        - Tile shakes
        - Dust particles spawn
200ms → Breaking state ends
        - Crack overlay fades out
        - Tile reveals final state
300ms → Reveal complete
        - Object tile: gold sparkle + glow
        - Empty tile: simple reveal
        - Blocker: red warning
```

### Key Components

**CrackOverlay** (`/src/components/TileCell.tsx`):
```tsx
<svg>
  <path d="..." /> {/* Crack line 1 */}
  <path d="..." /> {/* Crack line 2 */}
  <path d="..." /> {/* Crack line 3 */}
</svg>
```
Paths animate via `pathLength: 0 → 1`

**DustParticles**:
- 6 small circles spawn at tile center
- Each moves in random direction
- Fade out + scale down
- Duration: 400-700ms (randomized)

**Sparkle Effects** (Object tiles):
- Main sparkle rotates continuously
- Star particles burst out on reveal
- Gold glow pulses

### Silhouette Animations

**Cell Reveal:**
```typescript
animate={{
  scale: [1, 1.2, 1],    // Pop out and back
  rotate: [0, 5, 0]       // Slight twist
}}
transition={{ duration: 0.3 }}
```

**Object Complete:**
```typescript
// Border expands
animate={{
  opacity: [0, 1, 0],
  scale: [0.8, 1.2, 1.4]
}}

// Icon fills
weight="fill"
className="text-accent"
```

---

## 🎮 Level Progression

### Design Principles

1. **Gentle Introduction**: Level 1 is super simple (1 object, generous tools)
2. **Gradual Complexity**: Each level adds something new
3. **Strategic Depth**: Later levels require planning
4. **Fair Challenge**: Tools = ~1.5× minimum needed

### Current Levels

| # | Name | Size | Objects | Tools | Challenge |
|---|------|------|---------|-------|-----------|
| 1 | Tutorial Dig | 5×5 | 1 small | 12 | Learn basics |
| 2 | Double Find | 5×5 | 2 small | 16 | Multiple targets |
| 3 | Gem Hunt | 5×5 | 2 medium | 18 | First blocker |
| 4 | Triple Treasure | 6×6 | 3 mixed | 22 | Larger board |
| 5 | Royal Vault | 6×6 | 2 large | 24 | Complex shapes |
| 6 | Deep Excavation | 7×7 | 2 mixed | 28 | Maximum board |
| 7 | Diamond Mine | 7×7 | 3 mixed | 32 | Strategic digging |
| 8 | Ancient Trove | 7×7 | 3 large | 35 | Expert challenge |

### Tool Calculation

**Formula:**
```
MinTools = Sum(object.tiles) for all objects
ProvidedTools = MinTools × 1.3 to 1.8
```

Example (Level 2):
- coin_small = 4 tiles
- silver_bar = 3 tiles
- Minimum = 7 tools
- Provided = 16 tools (2.3× minimum)
- Allows for 9 mistakes

---

## 🛠️ Adding Content

### Create a New Object

**Step 1:** Design the shape (on paper or mentally)
```
  X
X X X    = "arrow" shape
  X
```

**Step 2:** Convert to pattern
```typescript
[
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0]
]
```

**Step 3:** Add to `/src/data/shapes.ts`
```typescript
{
  id: 'arrow_magic',
  name: 'Magic Arrow',
  icon: 'ArrowUp',        // Browse: phosphoricons.com
  color: 'diamond',
  pattern: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ]
}
```

**Step 4:** Use in levels
```typescript
objects: [
  { shapeId: 'arrow_magic', position: { row: 2, col: 1 } }
]
```

### Create a New Level

**Step 1:** Choose parameters
- Board size (5/6/7)
- Number of objects (1-4)
- Object types (variety is good)
- Tool budget

**Step 2:** Plan layout (mentally or sketch)
```
5×5 board, 2 objects:
[ ][ ][ ][ ][ ]
[ ][A][A][ ][ ]  ← Object A at (1,1)
[ ][ ][ ][ ][ ]
[ ][ ][B][B][ ]  ← Object B at (3,2)
[ ][ ][B][ ][ ]
```

**Step 3:** Add to `/src/data/levels.ts`
```typescript
{
  id: 9,
  name: 'My Custom Level',
  boardSize: 5,
  tools: 20,
  objects: [
    { shapeId: 'coin_small', position: { row: 1, col: 1 } },
    { shapeId: 'bronze_l', position: { row: 3, col: 2 } }
  ],
  blockers: []  // Optional
}
```

**Step 4:** Test
- Does everything fit?
- Are tools fair?
- Is it fun?

---

## 🎨 Customization

### Change Silhouette Colors

Edit `/src/components/ObjectSilhouette.tsx`:

```typescript
const SHAPE_COLORS = {
  gold: 'from-yellow-300 to-yellow-500',
  mystic: 'from-purple-400 to-pink-500',  // Add new
}
```

Then use in shapes:
```typescript
{ color: 'mystic', ... }
```

### Change Animation Speed

Edit `/src/game/config.ts`:

```typescript
ANIMATION: {
  TILE_BREAK_DURATION: 300,    // Slower breaking
  TILE_REVEAL_DELAY: 100,      // Faster reveal
}
```

### Add New Icons

1. Browse [Phosphor Icons](https://phosphoricons.com/)
2. Use exact component name:
```typescript
icon: 'Lighthouse'   // Must match exactly
icon: 'GlobeHemisphereEast'
icon: 'Umbrella'
```

---

## 📊 Summary

### Object System
- Defined in `/src/data/shapes.ts`
- Pattern = 2D array of 0s and 1s
- Position = top-left anchor
- Validation = automatic collision detection

### Discovery
- Each object tracks revealed tiles
- Complete when all tiles found
- Silhouettes show real-time progress

### Animations
- Crack + dust on dig
- Sparkle on treasure
- Celebration on complete

### Content Creation
- New object = add to shapes.ts
- New level = add to levels.ts
- No code changes needed!

---

**For complete visual examples and tutorials, see [GAME_GUIDE.md](./GAME_GUIDE.md)**
