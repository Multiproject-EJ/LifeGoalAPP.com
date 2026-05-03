# Object Fragment Visual System

## Overview
This document explains how treasure objects are mapped to board tiles and rendered as connected fragments, creating the feeling of uncovering real objects piece by piece.

## How Object Shapes Map to Board Tiles

### 1. Shape Definition (data/shapes.ts)
Each treasure object is defined with:
- **Pattern**: A 2D array where `1` represents a cell that belongs to the object, and `0` represents empty space
- **ID**: Unique identifier (e.g., `'line_3'`, `'l_shape_4'`, `'plus_shape'`)
- **Color**: Visual theme (`'gold'`, `'diamond'`, `'ruby'`, `'silver'`, `'bronze'`)
- **Icon**: Phosphor icon for the preview

Example shape:
```typescript
{
  id: 'l_shape_4',
  name: 'Bronze L',
  icon: 'Cube',
  color: 'bronze',
  pattern: [
    [1, 0],  // row 0: left cell only
    [1, 0],  // row 1: left cell only
    [1, 1]   // row 2: both cells
  ]
}
```

### 2. Object Placement (game/engine.ts)
When a level starts, objects are placed on the board:
- Each object is positioned at a specific `(row, col)` coordinate
- The pattern is overlaid onto the board starting from that position
- Each cell marked with `1` in the pattern creates a tile with:
  - `objectId`: Links the tile to its parent object
  - `spritePosition`: The tile's position within the object's grid (e.g., `{row: 0, col: 1}`)
  - `objectColor`: The object's color theme

### 3. Fragment Rendering (components/TileCell.tsx)

#### Revealed Treasure Tiles
When a tile is revealed and contains treasure:
- The `getSpriteVisual()` function generates a unique fragment visual
- Each fragment uses the `spritePosition` to create variation:
  - Gradient angles shift based on position
  - Highlight positions vary per cell
  - Pattern rotations differ slightly
- All fragments share the same `objectColor` so they visually belong together

#### Visual Cohesion
Connected fragments feel like parts of a single object through:
- **Shared color palette**: All cells of the same object use the same base/light/dark colors
- **Consistent patterns**: The repeating diagonal stripe pattern unifies fragments
- **Position-based variation**: Subtle differences make each cell feel like a distinct piece
- **Lighting effects**: Radial gradients simulate material depth and curvature

### 4. Connection Visualization (components/TreasureBoard.tsx + TileCell.tsx)

#### Adjacent Treasure Detection
The board calculates which treasure tiles are adjacent:
```typescript
adjacentTreasureTiles={{
  top: boolean,     // Same-object tile above
  right: boolean,   // Same-object tile to the right
  bottom: boolean,  // Same-object tile below
  left: boolean     // Same-object tile to the left
}}
```

#### Connection Indicators
When adjacent tiles are revealed:
- Subtle glow lines appear between connected tiles
- Ring opacity increases on connected fragments
- Visual "bridges" help the player see the complete shape

### 5. Completion Moment (treasure-dig/effects/SpecialTileEffects.tsx)

When all tiles of an object are revealed:
- `ObjectCompletionGlow` effect triggers
- All tiles of the object pulse simultaneously
- A radial glow emphasizes the complete shape
- Border animations expand outward from each cell
- The preview at the top marks the object as complete

### 6. Preview Synchronization (components/ObjectSilhouette.tsx)

The preview at the top shows:
- **Before reveal**: Faded cells with subtle pattern hints
- **During reveal**: Cells fill in with matching fragments as they're discovered on the board
- **After completion**: Full object with completion animation and icon highlight

## Technical Flow

```
Level Start
  ↓
Generate Board (engine.ts)
  → Place objects at coordinates
  → Each pattern cell creates a board tile with objectId + spritePosition
  ↓
Player Clicks Tile
  ↓
Tile Breaks (useTreasureDigGame.ts)
  → Set renderState to 'revealedTreasure'
  → Mark cell as revealed in object's revealedCells set
  ↓
Render Fragment (TileCell.tsx)
  → getSpriteVisual() generates unique fragment based on spritePosition + color
  → Check adjacentTreasureTiles for connection indicators
  ↓
Check Completion (game/winConditions.ts)
  → If all cells revealed, mark object as collected
  → Trigger ObjectCompletionGlow effect
  ↓
Update Preview (ObjectSilhouette.tsx)
  → Fill in revealed cells
  → Show completion state
```

## Visual Design Principles

### Fragment Identity
Each tile fragment should:
- Feel like a piece of a larger whole
- Have enough variation to look intentional, not copy-pasted
- Share visual DNA with other fragments of the same object

### Connected Shape Feel
Multiple adjacent fragments should:
- Flow into each other visually
- Create an emergent complete shape
- Use subtle connection indicators without overwhelming the design

### Completion Reward
Completing an object should:
- Provide immediate visual feedback
- Highlight the entire shape momentarily
- Feel satisfying and celebratory

## Color Mapping

Each color theme has:
- **Base**: Primary material color
- **Light**: Highlight/shine color
- **Dark**: Shadow/depth color
- **Glow**: Semi-transparent glow color
- **Pattern**: Diagonal stripe overlay

Colors are stored as RGB strings in `SPRITE_COLORS` (TileCell.tsx) and `SHAPE_COLORS` (ObjectSilhouette.tsx).

## Future Enhancements (Not Yet Implemented)

- **PNG Assets**: Replace gradient-based fragments with actual sprite sheets
- **Unique Object Visuals**: Each object could have its own texture (fork, bottle, key, etc.)
- **Fragment Assembly Animation**: Pieces could visually "snap together" when adjacent tiles are revealed
- **Object-Specific Effects**: Different treasures could have unique completion animations
