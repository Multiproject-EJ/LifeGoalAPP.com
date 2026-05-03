# Hard Tile Durability System - Bug Fix Summary

## What Was the Bug?

The hard tile durability system had a critical state management bug where tiles with multiple hit points (HP) were not properly transitioning through damage states and revealing their final results.

### Specific Issues:
1. **Incorrect render state logic**: The `getTileRenderState()` function in `engine.ts` was checking `if (tile.hp && tile.hp > 0)` without first checking if the tile was still hidden, causing even tiles with `hp = 0` to sometimes render as damaged instead of fully revealed.

2. **Missing state check**: The function didn't verify the tile's current status before determining render state, leading to confusion between "partially damaged but still hidden" vs "fully broken and revealed".

3. **Visual clarity**: Hard tiles used a small number badge that didn't convey the physical damage progression clearly enough.

## What Changed?

### 1. Fixed `getTileRenderState()` in `/src/game/engine.ts`

**Old code:**
```typescript
export function getTileRenderState(tile: Tile): TileRenderState {
  if (tile.hp && tile.hp > 0) {
    return 'damaged'
  }
  
  if (tile.isBlocker) {
    return 'revealedBlocker'
  }
  
  if (tile.objectId) {
    return 'revealedTreasure'
  }
  
  return 'revealedEmpty'
}
```

**New code:**
```typescript
export function getTileRenderState(tile: Tile): TileRenderState {
  // Check if tile is still hidden first
  if (tile.status === 'hidden') {
    return 'hidden'
  }
  
  // Check if tile is damaged but not fully broken
  if (tile.status === 'cracked' || (tile.hp !== undefined && tile.hp > 0)) {
    return 'damaged'
  }
  
  // Tile is fully revealed - determine what's underneath
  if (tile.isBlocker) {
    return 'revealedBlocker'
  }
  
  if (tile.objectId) {
    return 'revealedTreasure'
  }
  
  return 'revealedEmpty'
}
```

**Why this fixes it:**
- Now checks `tile.status === 'hidden'` first to handle undamaged tiles
- Only returns 'damaged' if tile is in 'cracked' status OR has hp > 0
- Once hp reaches 0, the tile is fully revealed and shows the appropriate result (treasure/empty/blocker)

### 2. Improved Hard Tile Visuals in `/src/components/TileCell.tsx`

**Removed:**
- Number badge showing remaining HP (lines 609-613 in old version)

**Added:**
- Thicker orange ring for hard tiles: `ring-4 ring-orange-600/70 ring-inset shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]`
- Reinforced visual overlay for undamaged hard tiles (lines 588-600):
  - Dark orange gradient overlay
  - Diagonal stripe pattern
  - Inner border ring
  - Makes it visually obvious this is a tougher tile

**Enhanced:**
- Damaged tile background color is now more distinct: `from-primary/70 to-primary/60` (lighter than hidden)
- Crack intensity function `getCrackIntensity()` now properly maps HP to visual states:
  - `hp === maxHp`: light cracks
  - `hp === 1`: heavy cracks  
  - Middle values: medium cracks

### 3. Enhanced Console Logging in `/src/hooks/useTreasureDigGame.ts`

Added detailed debugging output (lines 44-89):
```typescript
console.log(`[TILE DIG] Position: (${position.row}, ${position.col})`)
console.log(`[TILE DIG] Contains treasure: ${!!tile.objectId}`)
console.log(`[TILE DIG] Durability before: ${tile.hp || 1}`)
// ... after hit ...
console.log(`[TILE DIG] Durability after: ${tile.hp}`)
console.log(`[TILE DIG] Render state: damaged (tile still has HP)`)
// ... or on final break ...
console.log(`[TILE DIG] Final status: ${finalStatus}`)
console.log(`[TILE DIG] Final render state: ${finalRenderState}`)
```

## How It Works Now

### Normal Tile (HP = 1):
1. **First hit**: 
   - HP: 1 → 0 (final break)
   - Status: 'hidden' → 'breaking' → 'revealed-object' or 'revealed-empty'
   - Render state: 'hidden' → 'revealedTreasure' or 'revealedEmpty'
   - **Result**: Immediate reveal of contents

### Hard Tile (HP = 2):
1. **First hit**:
   - HP: 2 → 1
   - Status: 'hidden' → 'breaking' → 'cracked'
   - Render state: 'hidden' → 'damaged'
   - **Result**: Tile shows light/medium cracks, remains interactable

2. **Second hit** (final break):
   - HP: 1 → 0
   - Status: 'cracked' → 'breaking' → 'revealed-object' or 'revealed-empty'
   - Render state: 'damaged' → 'revealedTreasure' or 'revealedEmpty'
   - **Result**: Tile fully breaks, reveals treasure or empty ground

### Very Hard Tile (HP = 3):
1. **First hit**:
   - HP: 3 → 2
   - Status: 'hidden' → 'breaking' → 'cracked'
   - Render state: 'hidden' → 'damaged'
   - **Result**: Light cracks appear

2. **Second hit**:
   - HP: 2 → 1  
   - Status: 'cracked' (remains)
   - Render state: 'damaged' (remains)
   - **Result**: Heavy cracks appear

3. **Third hit** (final break):
   - HP: 1 → 0
   - Status: 'cracked' → 'breaking' → 'revealed-object' or 'revealed-empty'
   - Render state: 'damaged' → 'revealedTreasure' or 'revealedEmpty'
   - **Result**: Tile fully breaks, reveals contents

## Key Files Modified

1. **`/src/game/engine.ts`** (line 137-155)
   - Owns: Tile render state logic
   - Fixed: State determination now checks tile status first

2. **`/src/hooks/useTreasureDigGame.ts`** (line 32-180)
   - Owns: Game state management and tile click handling
   - Fixed: Added comprehensive logging
   - Note: HP decrement logic was already correct

3. **`/src/components/TileCell.tsx`** (line 21-610)
   - Owns: Tile visual rendering
   - Fixed: Removed number badge, added reinforced hard tile visuals, improved damage progression

## Visual Readability

Players can now instantly identify:

✅ **Undamaged hard tile**: 
- Thick orange ring
- Dark reinforced overlay with diagonal stripes
- Visibly different from normal tiles

✅ **Partially damaged tile**:
- Visible cracks (light/medium/heavy based on remaining HP)
- Still has the tile surface texture
- Clearly not fully revealed yet

✅ **Fully revealed treasure**:
- Crack overlay disappears completely
- Shows treasure fragment with glow
- No confusion with damaged state

✅ **Fully revealed empty**:
- Flat, muted background
- No cracks, no glow
- Obviously "nothing here"

## Testing Checklist

To verify the fix works:

1. ✅ Click a normal tile (HP=1) → should break immediately and reveal contents
2. ✅ Click a hard tile (HP=2) once → should show cracks but NOT reveal contents  
3. ✅ Click that same hard tile again → should fully break and reveal treasure/empty
4. ✅ Click a very hard tile (HP=3) three times → should show light cracks, then heavy cracks, then reveal
5. ✅ Check console logs → should show HP decrementing correctly
6. ✅ Visual check → hard tiles should look reinforced, damaged tiles should show cracks, revealed tiles should show contents clearly

## What Was Wrong Before?

The old `getTileRenderState()` function would check `if (tile.hp && tile.hp > 0)` without considering the tile's status. This meant:
- Even when a tile had `status = 'hidden'`, it might return 'damaged' if it had HP
- When HP reached 0, if the `hp` property still existed on the object, edge cases could occur
- The logic didn't cleanly separate "still hidden" from "partially damaged" from "fully revealed"

The fix ensures render state is determined by examining tile status first, then HP, creating a clear state machine flow.
