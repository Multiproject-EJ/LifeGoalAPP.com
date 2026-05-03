# Treasure Dig Upgrade Summary

## What Was Changed

### 🎯 Core Gameplay Transformation
**Before**: Random tile reveal with colored tiles  
**After**: Puzzle-based excavation with known objects

### ✨ New Features

1. **Object Silhouette System** (`/src/components/ObjectSilhouette.tsx`)
   - Shows all objects to find at the top of screen
   - Gradually fills in as tiles are revealed
   - Celebrates when objects are completed

2. **Enhanced Dig Animations** (`/src/components/TileCell.tsx`)
   - Crack overlay animation when breaking tiles
   - Dust particle burst on reveal
   - Sparkle effects for treasure tiles
   - Star particles when discovering objects

3. **Improved Level Progression** (`/src/data/levels.ts`)
   - 8 levels instead of 6
   - Better difficulty curve
   - Level 1 is now a simple tutorial (1 object, 12 tools)
   - Gradual introduction of mechanics

4. **Updated HUD** (`/src/components/TopProgressHud.tsx`)
   - Displays object silhouettes prominently
   - Shows both compact and full modes
   - Real-time progress tracking

### 📁 Modified Files

| File | Changes |
|------|---------|
| `/src/components/ObjectSilhouette.tsx` | ✅ NEW - Silhouette preview component |
| `/src/components/TileCell.tsx` | 🔄 Added crack animation, dust particles, sparkle effects |
| `/src/components/TopProgressHud.tsx` | 🔄 Added object silhouette display row |
| `/src/data/levels.ts` | 🔄 Rebalanced 6 levels, added 2 new levels (8 total) |
| `/src/types/game.ts` | 🔄 Added `objects` prop to `HUDProps` |
| `/src/screens/TreasureDigFeature.tsx` | 🔄 Pass objects data to HUD components |

### 🎨 Animation Enhancements

**Tile Breaking Sequence:**
```
Click → Scale down (90%) → Breaking state → Crack overlay → 
Dust particles → 200ms delay → Reveal (scale up + rotate)
```

**Object Discovery:**
```
Hit object tile → Gold sparkle → Silhouette cell fills → 
All cells found → Border glow → Icon fills → Celebration
```

**Silhouette Animations:**
- Cells animate when revealed (scale + rotate)
- Completed objects pulse and glow
- Border expands on completion
- Icon changes from outline to filled

---

## How to Use

### For Players
1. Look at the silhouettes at the top
2. Those show ALL objects hidden in the board
3. Dig strategically to find them
4. Watch silhouettes fill in as you discover tiles
5. Complete all objects before running out of tools

### For Developers

#### Add a New Object
```typescript
// In /src/data/shapes.ts
{
  id: 'my_object',
  name: 'My Treasure',
  icon: 'Star',  // Phosphor icon name
  color: 'gold',
  pattern: [
    [1, 1],
    [1, 1]
  ]
}
```

#### Add a New Level
```typescript
// In /src/data/levels.ts
{
  id: 9,
  name: 'My Level',
  boardSize: 6,
  tools: 25,
  objects: [
    { shapeId: 'my_object', position: { row: 2, col: 3 } }
  ],
  blockers: [{ row: 0, col: 0 }]
}
```

---

## Technical Details

### Object Shape System
Objects are defined as 2D patterns:
- `1` = object tile
- `0` = empty space

Example:
```typescript
pattern: [
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0]
]
```
Creates a cross/plus shape (5 tiles).

### Placement System
- Objects placed via top-left anchor position
- Engine converts pattern to absolute board coordinates
- Validates no overlap with other objects or blockers
- Tracks revealed cells per object

### Discovery Tracking
```typescript
PlacedObject {
  cells: Position[]           // All tile positions
  revealedCells: Set<string>  // Revealed tile keys ("row,col")
  isCollected: boolean        // True when all found
}
```

---

## Game Progression

| Level | Board | Objects | Tools | Difficulty |
|-------|-------|---------|-------|------------|
| 1 | 5×5 | 1 | 12 | Tutorial |
| 2 | 5×5 | 2 | 16 | Easy |
| 3 | 5×5 | 2 | 18 | Easy |
| 4 | 6×6 | 3 | 22 | Medium |
| 5 | 6×6 | 2 | 24 | Medium |
| 6 | 7×7 | 2 | 28 | Hard |
| 7 | 7×7 | 3 | 32 | Hard |
| 8 | 7×7 | 3 | 35 | Expert |

---

## Design Philosophy

### Before (Random System)
- ❌ Player didn't know what to look for
- ❌ No strategic planning possible
- ❌ Felt like pure luck
- ❌ No sense of progression

### After (Puzzle System)
- ✅ Player always knows the goal
- ✅ Strategic digging encouraged
- ✅ Pattern recognition rewarded
- ✅ Clear progress feedback
- ✅ Satisfying "aha!" moments

---

## Visual Improvements

### Silhouettes
- Clean grid showing object shape
- Gray cells = not yet found
- Colored cells = discovered
- Icon below showing object type
- Responsive to compact mode

### Tile Effects
- **Hidden**: Subtle shimmer
- **Breaking**: Crack lines + shake
- **Empty**: Muted with border
- **Object**: Gold gradient + sparkle
- **Blocker**: Red gradient + warning icon

### Feedback
- Immediate visual response to every action
- Smooth spring animations
- Particle effects for delight
- Color coding for clarity

---

## Performance Notes

- All animations use `framer-motion` for GPU acceleration
- Silhouettes re-render only when object progress changes
- Dust particles are lightweight SVG elements
- No performance impact on larger boards

---

## Future Expansion Ideas

1. **More Objects**: Add rare/epic treasures
2. **Special Tiles**: Power-ups, hints, extra tools
3. **Daily Challenges**: Pre-designed puzzle levels
4. **Achievements**: "Find all diamonds", "Perfect dig"
5. **Time Trials**: Complete levels quickly for bonuses
6. **Custom Levels**: Player-created puzzles

---

## Quick Reference

**Object Colors:**
- `gold` = Yellow gradients
- `diamond` = Cyan/blue gradients
- `ruby` = Red/pink gradients
- `silver` = Gray gradients
- `bronze` = Orange/amber gradients

**Board Sizes:**
- Small: 5×5 (25 tiles)
- Medium: 6×6 (36 tiles)
- Large: 7×7 (49 tiles)

**Available Shapes:**
- `coin_small` (4 tiles)
- `diamond_tiny` (5 tiles)
- `crown_medium` (6 tiles)
- `treasure_large` (9 tiles)
- `ruby_cross` (5 tiles)
- `silver_bar` (3 tiles)
- `bronze_l` (5 tiles)
- `diamond_big` (8 tiles)

---

For complete documentation, see [GAME_GUIDE.md](./GAME_GUIDE.md)
