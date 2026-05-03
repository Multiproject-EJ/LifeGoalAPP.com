# Level Progression Guide

## Overview

This game features **20 hand-designed levels** with structured difficulty progression. Each level is carefully crafted (not randomly generated) to provide a balanced challenge that introduces new mechanics gradually.

---

## Level Configuration Location

**All level configurations live in:**
```
src/data/levels.ts
```

**Object shape definitions live in:**
```
src/data/shapes.ts
```

---

## Progression Structure

### **Levels 1–4: Tutorial Phase**
**Board Size:** 4×4 to 5×5  
**Objects:** 1 simple object per level  
**Tile Types:** Normal tiles only  
**Shapes Used:** Simple lines (2-4 cells) and 2×2 squares

**Purpose:** Teach basic mechanics, build player confidence

| Level | Name | Board | Tools | Objects | Notes |
|-------|------|-------|-------|---------|-------|
| 1 | First Dig | 4×4 | 10 | Small Pin (2 cells) | Very first level, easy win |
| 2 | Easy Find | 4×4 | 11 | Iron Rod (3 cells) | Slightly longer shape |
| 3 | Long Bar | 5×5 | 13 | Silver Bar (4 cells) | Introduces longer objects |
| 4 | Square Coin | 5×5 | 14 | Gold Coin (2×2) | First non-linear shape |

---

### **Levels 5–8: Shape Complexity**
**Board Size:** 5×5 to 6×6  
**Objects:** 2 objects per level  
**Tile Types:** Normal tiles only  
**Shapes Used:** L-shapes, T-shapes, Plus shapes

**Purpose:** Introduce multi-object searching and complex shapes

| Level | Name | Board | Tools | Objects | Notes |
|-------|------|-------|-------|---------|-------|
| 5 | Hook Shape | 5×5 | 16 | L-shape + Pin | First 2-object level |
| 6 | Bronze Relics | 6×6 | 18 | Large L + Rod | Bigger board, more searching |
| 7 | T-Shaped Relic | 6×6 | 20 | T-shape + Square | Complex asymmetric shape |
| 8 | Plus Pattern | 6×6 | 22 | Plus + L-shape | Symmetric cross pattern |

---

### **Levels 9–12: Hard Tiles Introduced**
**Board Size:** 6×6 to 7×7  
**Objects:** 2 objects per level  
**Tile Types:** Normal + Hard (2-3 HP)  
**Shapes Used:** Z-shapes, Cross, Stairs, Serpent

**Purpose:** Introduce durability mechanic, require tool management

| Level | Name | Board | Tools | Objects | Hard Tiles | Notes |
|-------|------|-------|-------|---------|------------|-------|
| 9 | Zigzag | 6×6 | 24 | Z-shape + T | 2 tiles (2HP) | First hard tiles |
| 10 | Hard Ground | 6×6 | 26 | Big L + Line | 3 tiles (2HP) | More obstacles |
| 11 | Cross Hunt | 6×6 | 28 | Cross + Square | 1 tile (3HP) + 1 (2HP) | First 3HP tile |
| 12 | Serpent Path | 7×7 | 30 | Snake + Stairs | 1 tile (3HP) + 2 (2HP) | Larger board |

---

### **Levels 13–16: Multiple Objects + Blockers**
**Board Size:** 7×7 to 8×8  
**Objects:** 2-3 objects per level  
**Tile Types:** Normal + Hard + Blockers  
**Shapes Used:** Hook, Fork, Bottle, Key

**Purpose:** Test spatial reasoning with obstacles and multiple targets

| Level | Name | Board | Tools | Objects | Blockers | Hard Tiles | Notes |
|-------|------|-------|-------|---------|----------|------------|-------|
| 13 | Big Dig | 7×7 | 32 | Hook + Z + Line | 1 | 2 (2HP) | First blocker |
| 14 | Triple Hunt | 7×7 | 34 | Cross + L + Square | 1 | 2 (2HP) | Three objects |
| 15 | Ancient Fork | 7×7 | 36 | Fork + Plus | 2 | 1 (3HP) + 1 (2HP) | Fork object intro |
| 16 | Glass Vault | 8×8 | 40 | Bottle + L + Line | 2 | 1 (3HP) + 1 (2HP) | First 8×8 board |

---

### **Levels 17–20: Special Tiles + Full System**
**Board Size:** 8×8  
**Objects:** 2-3 objects per level  
**Tile Types:** All types (Bomb, Reveal, Bonus)  
**Shapes Used:** Key, Crown, Chest, advanced objects

**Purpose:** Master-level challenges with all mechanics active

| Level | Name | Board | Tools | Objects | Special Tiles | Notes |
|-------|------|-------|-------|---------|---------------|-------|
| 16 | Glass Vault | 8×8 | 40 | Bottle + L + Line | 1 Bomb (col) | First bomb tile |
| 17 | Golden Key | 8×8 | 42 | Key + Hook + Square | 1 Bomb (row) + 1 Reveal | Reveal tile intro |
| 18 | Triple Artifact | 8×8 | 44 | Fork + Bottle + Snake | 1 Bomb + 1 Reveal | Complex 3-object hunt |
| 19 | Royal Treasure | 8×8 | 46 | Chest + Crown | 2 Bombs + 1 Reveal + 1 Bonus | First bonus tile |
| 20 | Master Excavator | 8×8 | 48 | Chest + Crown + Key | 1 Bomb + 1 Reveal + 1 Bonus | Final challenge |

---

## Tile Types Reference

### Normal Tile
- 1 hit to break
- Most common tile type

### Hard Tile (2 HP)
- Requires 2 hits
- Shows cracked state after first hit
- Introduced in Level 9

### Hard Tile (3 HP)
- Requires 3 hits
- Shows progressive damage
- Introduced in Level 11

### Blocker Tile
- Cannot be dug
- Must navigate around it
- Introduced in Level 13

### Bomb Tile (Row)
- When dug, clears entire row
- Introduced in Level 16
- Strategic power-up

### Bomb Tile (Col)
- When dug, clears entire column
- Introduced in Level 16
- Strategic power-up

### Reveal Tile
- Automatically reveals nearby tiles
- Introduced in Level 17
- Reduces guesswork

### Bonus Tile
- Grants extra tools when revealed
- Introduced in Level 19
- Helps with tight tool economy

---

## How to Add New Levels

### 1. Add to `src/data/levels.ts`

```typescript
{
  id: 21,
  name: 'Your Level Name',
  boardSize: 7,  // 4, 5, 6, 7, or 8
  tools: 35,
  objects: [
    { shapeId: 'line_4', position: { row: 1, col: 2 } },
    { shapeId: 'fork', position: { row: 4, col: 4 } },
  ],
  blockers: [{ row: 0, col: 0 }],  // Optional
  hardTiles: [  // Optional
    { position: { row: 3, col: 3 }, hp: 2 },
    { position: { row: 5, col: 5 }, hp: 3 },
  ],
  bombTiles: [  // Optional
    { position: { row: 7, col: 2 }, direction: 'row' },
  ],
  revealTiles: [{ row: 1, col: 1 }],  // Optional
  bonusTiles: [{ row: 6, col: 6 }],  // Optional
}
```

### 2. Placement Rules

**CRITICAL:** All object cells must fit within board bounds.

For an object at position `{row: R, col: C}`:
- Check the object's pattern in `shapes.ts`
- Ensure `R + patternHeight <= boardSize`
- Ensure `C + patternWidth <= boardSize`

**Example:**
- Board size: 6×6 (rows 0-5, cols 0-5)
- Fork pattern: 3 rows × 3 cols
- Valid position: `{row: 0, col: 0}` to `{row: 3, col: 3}`
- Invalid: `{row: 4, col: 4}` (would extend to row 6, col 6)

### 3. Tool Count Formula

**Base formula:**
```
tools = (totalObjectCells × 1.5) + hardTileHP + (boardSize × 0.5)
```

**Recommended ranges:**
- 4×4 board: 10-12 tools
- 5×5 board: 13-16 tools
- 6×6 board: 18-26 tools
- 7×7 board: 28-36 tools
- 8×8 board: 40-50 tools

**Pro tip:** Playtest and adjust! These are starting points.

---

## Available Object Shapes

All shapes are defined in `src/data/shapes.ts`

### Tier 1: Simple (Levels 1-4)
- `line_2` - 2 cells horizontal
- `line_3` - 3 cells horizontal
- `line_4` - 4 cells horizontal
- `square_2x2` - 2×2 square

### Tier 2: L and T Shapes (Levels 5-8)
- `l_shape_3` - Small L (3 cells)
- `l_shape_4` - Medium L (4 cells)
- `t_shape` - T pattern
- `plus_shape` - Plus/Cross (5 cells)
- `z_shape` - Z pattern

### Tier 3: Advanced (Levels 9-15)
- `big_l_5` - Large L (5 cells)
- `cross_5` - Tall cross
- `stair_shape` - Diagonal stairs
- `hook_shape` - Hook pattern
- `offset_snake` - Serpent shape

### Tier 4: Objects (Levels 16-20)
- `fork` - Fork shape (7 cells)
- `bottle` - Bottle shape (8 cells)
- `key` - Key shape (6 cells)
- `chest_fragment` - Chest (12 cells)
- `crown_medium` - Crown (7 cells)
- `diamond_tiny` - Diamond (4 cells)

---

## Design Principles

### 1. Hand-Designed, Not Random
Every level is intentionally crafted. Object placement, tile types, and tool counts are all deliberate choices.

### 2. Gradual Introduction
New mechanics appear one at a time:
- Levels 1-8: Learn shapes
- Levels 9-12: Learn hard tiles
- Levels 13-16: Learn blockers and multiple objects
- Levels 17-20: Master special tiles

### 3. Balanced Challenge
- Early levels are generous with tools
- Later levels require strategic thinking
- Special tiles provide "aha!" moments, not frustration

### 4. Visual Clarity
Each object has a distinct visual identity:
- Colors: silver, bronze, gold, ruby, diamond
- Icons: From Phosphor Icons set
- Sprite maps show object fragments when revealed

---

## Testing Your Levels

### Checklist:
- [ ] All objects fit within board bounds
- [ ] No objects overlap
- [ ] Blockers don't cover object cells
- [ ] Tool count allows completion with some margin
- [ ] Special tiles are placed strategically
- [ ] Level feels fair, not lucky

### Playtest Questions:
1. Can I complete this without perfect play?
2. Do the special tiles feel helpful or annoying?
3. Is the difficulty appropriate for this level number?
4. Does it feel hand-designed or random?

---

## Quick Reference

**Files to edit for levels:**
- `src/data/levels.ts` - Level configurations
- `src/data/shapes.ts` - Object shape patterns

**Files that use level data:**
- `src/game/engine.ts` - Game logic
- `src/game/placement.ts` - Object placement validation
- `src/screens/TreasureDigFeature.tsx` - Main game screen
- `src/hooks/useTreasureDigGame.ts` - Game state management

**Do NOT edit:**
- `src/game/config.ts` - Board size constraints
- `src/game/winConditions.ts` - Win/lose logic (unless changing rules)

---

## Summary

The 20-level progression is structured as follows:

1. **Levels 1-4:** Small boards, simple shapes, normal tiles only
2. **Levels 5-8:** Introduce complex shapes (L, T, Plus, Z)
3. **Levels 9-12:** Introduce hard tiles (2-3 HP)
4. **Levels 13-16:** Larger boards, multiple objects, blockers
5. **Levels 17-20:** Special tiles (bombs, reveal, bonus)

This creates a smooth learning curve from tutorial to mastery, with each stage building on previous mechanics.
