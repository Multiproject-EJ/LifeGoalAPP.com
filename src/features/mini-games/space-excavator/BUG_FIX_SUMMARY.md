# Hard Tile Bug Fix Summary

## The Problem
Hard tiles (tiles with durability > 1) were only allowing one dig instead of multiple clicks based on their HP value.

## Root Cause
The bug was in the click handler logic in `src/hooks/useTreasureDigGame.ts`. The original code had this structure:

```typescript
if (tile.hp && tile.hp > 1) {
  // Decrement HP and set to cracked state
  // ...
}

// Otherwise, fully reveal the tile
```

### The Issue
The condition `if (tile.hp && tile.hp > 1)` was ONLY true when HP was **greater than 1**. This meant:

- **First click on a tile with HP=2**: 
  - Condition is TRUE (2 > 1)
  - HP decrements to 1
  - Status becomes 'cracked'
  
- **Second click on the same tile (now HP=1)**:
  - Condition is FALSE (1 is NOT > 1)
  - BUT the tile still had durability remaining!
  - Code incorrectly proceeded to fully reveal the tile

This violated the core rule: **A tile should only be fully revealed when durability reaches 0**.

## The Fix
The logic was rewritten to:

1. **ALWAYS decrement HP first** regardless of current value
2. **Check the NEW HP value** after decrement
3. **Only reveal if HP === 0**, otherwise set to 'cracked' state

New flow:
```typescript
const currentHP = tile.hp || 1
const newHP = currentHP - 1
updatedTile.hp = newHP

if (newHP > 0) {
  // Tile still has durability - set to cracked, allow future clicks
} else {
  // HP reached 0 - fully reveal the tile
}
```

### Correct Behavior After Fix

**Hard tile with HP=2:**
- Click 1: HP 2→1, status='cracked', state='damaged' ✓ Can click again
- Click 2: HP 1→0, fully revealed ✓ Complete

**Hard tile with HP=3:**
- Click 1: HP 3→2, status='cracked', state='damaged' ✓ Can click again  
- Click 2: HP 2→1, status='cracked', state='damaged' ✓ Can click again
- Click 3: HP 1→0, fully revealed ✓ Complete

## Files Modified
- `src/hooks/useTreasureDigGame.ts` - Fixed the `breakTile` function click handler

## Debug Logging
Enhanced console logging was added to trace:
- Tile position
- HP before and after each click
- Status transitions
- Final reveal state

This helps verify the fix is working correctly and diagnose any future issues.
