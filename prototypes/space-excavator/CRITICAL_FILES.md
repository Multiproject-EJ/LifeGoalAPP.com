# Critical Files Reference

This document identifies the most important files in the Treasure Dig feature and their purposes.

## 🎯 Integration Entry Point

### `src/screens/TreasureDigFeature.tsx` 
**Purpose:** Main component to import into parent app  
**Responsibility:** Orchestrates feature, handles callbacks, layout modes  
**Modify when:** Adding new props, changing layout behavior  
**Import this:** When integrating into parent app

---

## 🧠 Core Game Logic (React-Independent)

### `src/game/config.ts` ⭐ **MOST IMPORTANT FOR TUNING**
**Purpose:** Single source of truth for all constants  
**Contains:**
- Animation timings
- Scoring rules  
- UI dimensions
- Validation thresholds

**Modify when:** Changing game behavior, tuning difficulty, adjusting UX feel

### `src/game/engine.ts`
**Purpose:** Board generation and tile logic  
**Contains:**
- `generateBoard()` - Creates board from level config
- `canBreakTile()` - Validates tile can be clicked
- `getTileStatus()` - Determines reveal state

**Modify when:** Changing board generation rules

### `src/game/scoring.ts`
**Purpose:** All score calculations  
**Contains:**
- `calculateObjectScore()`
- `calculateToolBonus()`
- `calculateLevelCompleteBonus()`
- `calculateTotalScore()`

**Modify when:** Changing how scores are calculated

### `src/game/winConditions.ts`
**Purpose:** Object completion detection  
**Contains:**
- `checkObjectCompletion()` - Detects when treasure is fully revealed

**Modify when:** Changing win condition logic

### `src/game/placement.ts`
**Purpose:** Object placement validation  
**Contains:**
- `placeObject()` - Places object on board
- `isValidPlacement()` - Validates placement rules

**Modify when:** Adding placement constraints

---

## 📊 Data & Configuration

### `src/data/levels.ts` ⭐ **MODIFY FOR NEW LEVELS**
**Purpose:** Level definitions  
**Contains:** Array of level configs

**Modify when:** Adding new levels, adjusting existing ones

### `src/data/shapes.ts` ⭐ **MODIFY FOR NEW TREASURES**
**Purpose:** Treasure shape patterns  
**Contains:** Array of object shapes

**Modify when:** Adding new treasure types

---

## 🔗 React Integration

### `src/hooks/useTreasureDigGame.ts`
**Purpose:** Main game state management hook  
**Responsibility:** State orchestration, action handlers  
**Contains:**
- `breakTile()` - Handle tile click
- `restartLevel()` - Reset level
- `nextLevel()` - Advance to next level
- `getLevelResult()` - Get completion data

**Modify when:** Adding new game actions, changing state flow

---

## 🎨 UI Components

### `src/components/TreasureBoard.tsx`
**Purpose:** Renders tile grid  
**Modify when:** Changing board layout, spacing, responsive behavior

### `src/components/TileCell.tsx`
**Purpose:** Individual tile with animations  
**Modify when:** Changing tile appearance, animations, states

### `src/components/TopProgressHud.tsx`
**Purpose:** Level progress display  
**Modify when:** Changing HUD layout, adding metrics

### `src/components/ToolBar.tsx`
**Purpose:** Bottom controls  
**Modify when:** Changing toolbar content, actions

### `src/components/RewardModal.tsx`
**Purpose:** Level completion dialog  
**Modify when:** Changing reward display

---

## 📝 Type Definitions

### `src/types/game.ts` ⭐ **REFERENCE FOR INTEGRATION**
**Purpose:** Complete type system  
**Contains:**
- `LevelConfig` - Level structure
- `LevelResult` - Completion data
- `TreasureDigGameProps` - Main component props
- `Tile`, `Board`, `HiddenObject` - Core game types

**Modify when:** Adding new data structures, extending APIs

---

## 📄 Documentation

### `EMBEDDING_GUIDE.md` ⭐ **READ FIRST FOR INTEGRATION**
**Purpose:** Complete integration guide  
**Use when:** Transplanting to parent app

### `PRODUCTION_IMPROVEMENTS.md`
**Purpose:** Changelog of improvements  
**Use when:** Understanding what changed and why

### `CRITICAL_FILES.md` (this file)
**Purpose:** Quick reference for file purposes  
**Use when:** Need to quickly find where to make changes

---

## Quick Decision Matrix

### "I want to..."

**...add a new level**
→ Edit `src/data/levels.ts`

**...change scoring**
→ Edit `src/game/config.ts` (constants)  
→ Edit `src/game/scoring.ts` (logic)

**...change animations**
→ Edit `src/game/config.ts` (timing)  
→ Edit `src/components/TileCell.tsx` (visuals)

**...integrate into my app**
→ Read `EMBEDDING_GUIDE.md`  
→ Import `src/screens/TreasureDigFeature.tsx`

**...add a new treasure type**
→ Edit `src/data/shapes.ts`

**...change tile appearance**
→ Edit `src/components/TileCell.tsx`

**...change board layout**
→ Edit `src/components/TreasureBoard.tsx`  
→ Adjust `src/game/config.ts` for spacing

**...change win conditions**
→ Edit `src/game/winConditions.ts`

**...understand types**
→ Read `src/types/game.ts`

**...change spacing/mobile layout**
→ Edit `src/game/config.ts` (constants)  
→ Edit components for responsive classes

---

## Files You Should NOT Modify

❌ `src/main.tsx` - Standalone app bootstrapper  
❌ `src/App.tsx` - Standalone app wrapper  
❌ `src/components/ui/*` - Shadcn components  
❌ `src/lib/utils.ts` - Shared utilities  
❌ `vite.config.ts` - Build config  
❌ `tailwind.config.js` - Style config

These are either framework files or should come from your parent app.

---

## Files by Modification Frequency

### Change Often
1. `src/data/levels.ts` - Adding levels
2. `src/data/shapes.ts` - Adding treasures  
3. `src/game/config.ts` - Tuning behavior

### Change Sometimes
4. `src/components/TileCell.tsx` - Visual polish
5. `src/components/TreasureBoard.tsx` - Layout adjustments
6. `src/game/scoring.ts` - Scoring adjustments

### Change Rarely
7. `src/game/engine.ts` - Core logic is stable
8. `src/types/game.ts` - Types are comprehensive
9. `src/hooks/useTreasureDigGame.ts` - State flow is solid

### Never Change (In Parent App)
10. Framework files listed above

---

## Integration Checklist

When copying to parent app:

1. ✅ Copy these directories:
   - `src/components/` (excluding ui/)
   - `src/game/`
   - `src/data/`
   - `src/hooks/`
   - `src/types/`
   - `src/screens/`

2. ✅ Ensure dependencies installed:
   - `framer-motion`
   - `@phosphor-icons/react`
   - shadcn components

3. ✅ Import in parent:
   ```typescript
   import { TreasureDigFeature } from './screens/TreasureDigFeature'
   ```

4. ✅ Reference types:
   ```typescript
   import type { LevelResult, TreasureDigGameProps } from './types/game'
   ```

5. ✅ Done!
