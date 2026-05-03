# Row/Column Explosion Tile Fix - Summary

## Problem Identified
The explosion tile mechanics were not working because the active `src/treasure-dig/` implementation was simplified and missing critical features:
- No special tile types (bomb-row, bomb-col, chain-row) in the type system
- Board generator only created hidden tiles, objects, and blockers
- Game engine only resolved the clicked tile, never processing row/column clears
- Board state was not being updated for affected tiles

## Solution Implemented

### 1. TYPE SYSTEM UPDATES
**File:** `src/treasure-dig/types/game.types.ts`

Added special tile support:
```typescript
export type SpecialTileType = 'bomb-row' | 'bomb-col' | 'chain-row'

export interface TileState {
  position: Position
  status: TileStatus
  objectId?: string
  isBlocker?: boolean
  specialType?: SpecialTileType  // NEW
}

export interface LevelConfig {
  // ... existing fields
  readonly specialTiles?: ReadonlyArray<{
    readonly position: Position
    readonly type: SpecialTileType
  }>  // NEW
}
```

### 2. BOARD GENERATION
**File:** `src/treasure-dig/game/boardGenerator.ts`

Extended board generator to assign special tile types during level initialization:
```typescript
if (level.specialTiles) {
  level.specialTiles.forEach(special => {
    if (tiles[special.position.row] && tiles[special.position.row][special.position.col]) {
      tiles[special.position.row][special.position.col].specialType = special.type
    }
  })
}
```

**Where special tiles are generated:** In `generateBoard()` function, after placing objects and blockers, the special tiles from level config are assigned to their designated positions.

### 3. TILE CLICK RESOLUTION
**File:** `src/treasure-dig/hooks/useGameEngine.ts`

Completely rewrote the `breakTile` function to handle row/column explosions:

**Key Changes:**
- Check if revealed tile has a `specialType`
- Build a `tilesToReveal` array that includes:
  - The clicked tile
  - All tiles in the affected row (for bomb-row/chain-row)
  - All tiles in the affected column (for bomb-col)
- Process all affected tiles in a single state update
- Each tile is properly resolved to its final state:
  - `isBlocker` → `revealed-blocker`
  - `objectId` → `revealed-object` (with object completion check)
  - Empty → `revealed-empty`

**Where row/column reveal is applied:** Inside the delayed `setLevelState` callback, after the tile break animation completes. The special tile type is checked and the appropriate row or column is added to `tilesToReveal`.

**How affected tiles are resolved visually:** Every tile in `tilesToReveal` array is iterated and its status is updated based on its content:
```typescript
tilesToReveal.forEach(pos => {
  const tileToReveal = current.board.tiles[pos.row]?.[pos.col]
  if (!tileToReveal || tileToReveal.status !== 'hidden') return
  
  if (tileToReveal.isBlocker) {
    tileToReveal.status = 'revealed-blocker'
  } else if (tileToReveal.objectId) {
    tileToReveal.status = 'revealed-object'
    // ... object completion logic
  } else {
    tileToReveal.status = 'revealed-empty'
  }
})
```

### 4. LEVEL DATA
**File:** `src/treasure-dig/data/levels.ts`

Added special tiles to levels 4, 5, and 6 to introduce the mechanics progressively:
- **Level 4:** Added 1 `bomb-row` tile at position (4, 2)
- **Level 5:** Added 1 `bomb-col` tile at position (2, 5)
- **Level 6:** Added 1 `chain-row` tile at position (2, 3)

## Safety Measures Implemented
1. **Boundary checking:** Only processes tiles within board bounds
2. **Status checking:** Skips already revealed tiles (`if (tileToReveal.status !== 'hidden')`)
3. **Single update:** All affected tiles are resolved in the same `setLevelState` call
4. **Object counting:** Properly updates object completion when row/column reveals object tiles
5. **Score calculation:** Objects found via explosion correctly contribute to score and level completion

## Testing Checklist
To verify the fix works:
1. ✅ Special tiles are generated at level start
2. ✅ Clicking a special tile reveals the clicked tile
3. ✅ The entire row or column is visually cleared
4. ✅ Blockers in the affected row/column show as revealed-blocker
5. ✅ Objects in the affected row/column show as revealed-object
6. ✅ Empty tiles in the affected row/column show as revealed-empty
7. ✅ Object completion works correctly when objects are revealed via explosion
8. ✅ Level completes when all objects found (including via explosion)
9. ✅ No tiles outside the affected row/column are changed
10. ✅ Already revealed tiles are not affected again

## Implementation Path
**Active Implementation:** `src/treasure-dig/...`
- Types: `src/treasure-dig/types/game.types.ts`
- Generator: `src/treasure-dig/game/boardGenerator.ts`
- Engine: `src/treasure-dig/hooks/useGameEngine.ts`
- Data: `src/treasure-dig/data/levels.ts`

All changes were made to the active implementation path only.
