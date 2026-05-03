# ⚠️ LEGACY IMPLEMENTATION - DO NOT USE

## Status: INACTIVE

This directory contains a **simplified, legacy implementation** of the Treasure Dig game that **should not be used** for active development.

## Why This Implementation Is Inactive

This implementation was created early in development but lacks critical features:

### Missing Features
- ❌ **Hard tiles with HP** - No durability system
- ❌ **Bomb tiles** (row/column clear) - Not implemented
- ❌ **Chain reaction tiles** - Not implemented  
- ❌ **Reveal tiles** (neighbor reveal) - Not implemented
- ❌ **Bonus tiles** (extra tools) - Not implemented
- ❌ **Render state system** - No visual state management
- ❌ **HP/MaxHP tracking** - Not tracked on tiles
- ❌ **Proper placement validation** - Limited validation

### What This Implementation Has
- ✅ Basic board generation
- ✅ Simple object placement
- ✅ Blocker placement
- ✅ Hidden/revealed tile states only

## Active Implementation Path

**Use this instead:**

```
src/
├── hooks/
│   └── useTreasureDigGame.ts          ✅ ACTIVE - Rich game logic hook
├── game/
│   ├── engine.ts                      ✅ ACTIVE - Full tile system
│   ├── placement.ts                   ✅ ACTIVE - Validated placement
│   ├── config.ts                      ✅ ACTIVE - Game config
│   ├── themes.ts                      ✅ ACTIVE - Theme system
│   ├── scoring.ts                     ✅ ACTIVE - Scoring logic
│   └── winConditions.ts               ✅ ACTIVE - Win logic
├── components/
│   ├── TileCell.tsx                   ✅ ACTIVE - Rich tile rendering
│   ├── TreasureBoard.tsx              ✅ ACTIVE - Board component
│   ├── TopProgressHud.tsx             ✅ ACTIVE - HUD component
│   └── ...                            ✅ ACTIVE - UI components
├── screens/
│   └── TreasureDigFeature.tsx         ✅ ACTIVE - Main screen
└── data/
    ├── levels.ts                      ✅ ACTIVE - Level definitions
    └── shapes.ts                      ✅ ACTIVE - Object shapes
```

## Files in This Legacy Directory

```
src/treasure-dig/                      ❌ LEGACY - DO NOT USE
├── game/
│   └── boardGenerator.ts              ❌ Simplified, missing features
├── components/
│   └── TreasureDigGame.tsx            ❌ Uses legacy engine
├── hooks/
│   └── useGameEngine.ts               ❌ Simplified logic
├── types/
│   └── game.types.ts                  ❌ Incomplete type definitions
├── utils/
│   └── placement.ts                   ❌ Basic placement only
├── data/
│   ├── levels.ts                      ❌ Duplicate of active levels
│   └── objects.ts                     ❌ Duplicate of active shapes
└── index.ts                           ❌ Legacy exports
```

## Migration Complete

The active implementation (`src/screens/TreasureDigFeature.tsx`) is already using the **richer top-level path** with full feature support.

## Future Actions

These files are kept for reference but should be deleted once confirmed unnecessary:
- Review any unique logic that might need preservation
- Confirm no external dependencies on `src/treasure-dig/*`
- Delete entire `src/treasure-dig/` directory

## Current Status Summary

✅ **Active Path**: Top-level `src/` implementation  
✅ **Features**: All advanced mechanics working  
✅ **Screen**: `src/screens/TreasureDigFeature.tsx`  
✅ **Hook**: `src/hooks/useTreasureDigGame.ts`  
✅ **Engine**: `src/game/engine.ts`  

❌ **Legacy Path**: `src/treasure-dig/` (inactive)  
❌ **Do Not Use**: Any imports from `../treasure-dig/`  

---

**Last Updated**: Current iteration  
**Reason for Legacy Status**: Simplified implementation missing critical game mechanics
