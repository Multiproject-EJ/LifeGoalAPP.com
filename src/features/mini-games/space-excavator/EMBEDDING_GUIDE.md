# Treasure Dig Mini-Game - Integration Guide

## Overview
Production-ready treasure excavation mini-game built for easy integration into React TypeScript PWAs.

## Architecture

### Core Principles
1. **Separation of Concerns**: Game logic is fully decoupled from UI components
2. **Configuration-Driven**: All constants, scoring rules, and UI parameters are centralized
3. **Type-Safe**: Strongly typed interfaces throughout
4. **Portable**: Self-contained feature with minimal dependencies

### Directory Structure

```
src/
├── components/           # Presentational components
│   ├── TreasureBoard.tsx      # Board grid renderer
│   ├── TileCell.tsx           # Individual tile with animations
│   ├── TopProgressHud.tsx     # Level progress display
│   ├── ToolBar.tsx            # Bottom controls
│   └── RewardModal.tsx        # Completion dialog
├── game/                 # Pure game logic (React-independent)
│   ├── config.ts              # Centralized constants
│   ├── engine.ts              # Board generation and tile validation
│   ├── placement.ts           # Object placement algorithms
│   ├── winConditions.ts       # Completion detection
│   └── scoring.ts             # Score calculation
├── data/                 # Level definitions
│   ├── levels.ts              # Level configurations
│   └── shapes.ts              # Treasure shape patterns
├── hooks/                # React hooks
│   └── useTreasureDigGame.ts  # Main game state hook
├── types/                # TypeScript interfaces
│   └── game.ts                # All type definitions
├── screens/              # Feature entry point
│   └── TreasureDigFeature.tsx # Top-level component
└── utils/                # (Optional) Utilities
    └── (future helpers)
```

## Key Files

### 1. Core Entry Point
**`src/screens/TreasureDigFeature.tsx`**
- Main component to import into your app
- Accepts props for customization and callbacks
- Handles layout modes and custom components

### 2. Game Engine
**`src/game/engine.ts`**
- Pure functions for board generation
- Tile state validation
- No React dependencies

### 3. Configuration
**`src/game/config.ts`**
- `GAME_CONFIG`: Centralized constants for:
  - Animation timings
  - Scoring rules
  - UI dimensions
  - Validation rules

### 4. Type Definitions
**`src/types/game.ts`**
- Complete type system for the feature
- Essential for integration

### 5. Level Data
**`src/data/levels.ts`**
- Level definitions
- Easy to extend with new levels

## Integration into Parent App

### Minimal Integration

```typescript
import { TreasureDigFeature } from './screens/TreasureDigFeature'

function App() {
  return <TreasureDigFeature />
}
```

### Full Integration with Callbacks

```typescript
import { TreasureDigFeature } from './screens/TreasureDigFeature'
import type { LevelResult, Reward } from './types/game'

function ParentApp() {
  const handleLevelComplete = (result: LevelResult) => {
    console.log('Level completed:', result)
    // Award coins, update player progress, etc.
  }

  const handleToolSpend = () => {
    console.log('Player spent a tool')
    // Track analytics, update counters, etc.
  }

  const handleExit = () => {
    console.log('Player exited game')
    // Navigate back to main app
  }

  const handleReward = (reward: Reward) => {
    console.log('Reward earned:', reward)
    // Update player wallet, unlock features, etc.
  }

  return (
    <TreasureDigFeature
      initialLevel={1}
      callbacks={{
        onFinishLevel: handleLevelComplete,
        onSpendTool: handleToolSpend,
        onExitFeature: handleExit,
        onRewardEarned: handleReward,
      }}
      layoutConfig={{
        compactMode: false,
        showDefaultHUD: true,
        showDefaultToolbar: true,
      }}
    />
  )
}
```

### Custom UI Integration

```typescript
import { TreasureDigFeature } from './screens/TreasureDigFeature'
import type { HUDProps, ToolbarProps } from './types/game'
import { MyCustomHUD, MyCustomToolbar } from './components'

function ParentApp() {
  return (
    <TreasureDigFeature
      customHUD={MyCustomHUD}
      customToolbar={MyCustomToolbar}
      layoutConfig={{
        compactMode: true,
        showDefaultHUD: false,
        showDefaultToolbar: false,
      }}
    />
  )
}
```

### Custom Levels

```typescript
import { TreasureDigFeature } from './screens/TreasureDigFeature'
import type { LevelConfig } from './types/game'

const myCustomLevels: LevelConfig[] = [
  {
    id: 1,
    name: 'Tutorial',
    boardSize: 5,
    tools: 10,
    objects: [
      { shapeId: 'coin_small', position: { row: 1, col: 1 } },
    ],
  },
  // ... more levels
]

function ParentApp() {
  return <TreasureDigFeature customLevels={myCustomLevels} />
}
```

## API Reference

### TreasureDigGameProps

```typescript
interface TreasureDigGameProps {
  // Callback handlers
  callbacks?: {
    onSpendTool?: () => void
    onFinishLevel?: (result: LevelResult) => void
    onExitFeature?: () => void
    onRewardEarned?: (reward: Reward) => void
  }
  
  // Starting level
  initialLevel?: number
  
  // Custom level data
  customLevels?: LevelConfig[]
  
  // Parent app integration props
  wrapperProps?: {
    playerToolCount?: number
    currentLevel?: number
    rewardTheme?: string
    islandTheme?: string
  }
  
  // Layout configuration
  layoutConfig?: {
    compactMode?: boolean
    showDefaultHUD?: boolean
    showDefaultToolbar?: boolean
    maxWidth?: string
    maxHeight?: string
  }
  
  // Custom component overrides
  customHUD?: React.ComponentType<HUDProps>
  customToolbar?: React.ComponentType<ToolbarProps>
}
```

### LevelResult

```typescript
interface LevelResult {
  levelId: number
  completed: boolean
  toolsLeft: number
  score: number
  objectsFound: number
  totalObjects: number
  timestamp: number
}
```

## Files to Copy

When transplanting to another app, copy these directories:

```
src/
├── components/         ✅ Copy
│   ├── TreasureBoard.tsx
│   ├── TileCell.tsx
│   ├── TopProgressHud.tsx
│   ├── ToolBar.tsx
│   └── RewardModal.tsx
├── game/              ✅ Copy
│   ├── config.ts
│   ├── engine.ts
│   ├── placement.ts
│   ├── winConditions.ts
│   └── scoring.ts
├── data/              ✅ Copy
│   ├── levels.ts
│   └── shapes.ts
├── hooks/             ✅ Copy
│   └── useTreasureDigGame.ts
├── types/             ✅ Copy
│   └── game.ts
└── screens/           ✅ Copy
    └── TreasureDigFeature.tsx
```

**Do NOT copy:**
- `src/components/ui/` (use parent app's shadcn components)
- `src/lib/` (use parent app's utilities)
- `src/main.tsx`, `src/App.tsx` (standalone app files)

## Dependencies

Required packages (should already be in parent app):
- `react` >= 19.x
- `@phosphor-icons/react`
- `framer-motion`
- `shadcn` components (Button, Card, Badge, Dialog)
- `tailwindcss`

## Configuration Customization

### Modify Game Rules

Edit `src/game/config.ts`:

```typescript
export const GAME_CONFIG = {
  SCORING: {
    PER_OBJECT: 100,        // Points per treasure
    TOOL_BONUS: 10,         // Bonus per tool remaining
    LEVEL_COMPLETE_BONUS: 500,  // Completion bonus
  },
  
  ANIMATION: {
    TILE_BREAK_DURATION: 200,   // ms
    TILE_REVEAL_DELAY: 200,     // ms
  },
  
  UI: {
    LOW_TOOLS_THRESHOLD: 2,     // When to show warning
  },
}
```

### Add New Levels

Edit `src/data/levels.ts`:

```typescript
export const levels: LevelConfig[] = [
  {
    id: 7,
    name: 'Your Level',
    boardSize: 6,
    tools: 20,
    objects: [
      { shapeId: 'treasure_large', position: { row: 2, col: 2 } },
    ],
    blockers: [{ row: 0, col: 0 }],
  },
]
```

### Add New Treasure Shapes

Edit `src/data/shapes.ts`:

```typescript
export const objectShapes: HiddenObject[] = [
  {
    id: 'my_shape',
    name: 'My Treasure',
    icon: 'Star',
    color: 'gold',
    pattern: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
]
```

## Testing the Feature

### Standalone Mode
Run the feature independently:
```bash
npm run dev
```

### In Parent App
Import and use as shown in integration examples above.

## Best Practices

1. **Don't Mutate Config**: Treat `GAME_CONFIG` as read-only
2. **Use Type Guards**: Leverage TypeScript for safety
3. **Centralize Constants**: Add new constants to `config.ts`, not inline
4. **Keep Logic Pure**: Game logic functions should have no side effects
5. **Test Levels**: Validate level configs before adding

## Future Improvements

Items that should be addressed before production:
- Add unit tests for game logic
- Add level validation on load
- Consider adding level editor tool
- Add sound effects (using Web Audio API)
- Add haptic feedback for mobile
- Optimize animations for low-end devices
- Add accessibility improvements (keyboard navigation, screen readers)
- Consider adding multiplayer support
- Add analytics hooks
