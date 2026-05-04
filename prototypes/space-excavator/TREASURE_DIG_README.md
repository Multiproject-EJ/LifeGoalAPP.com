# Treasure Dig Bingo - Feature Module

A mobile-first excavation puzzle mini-game built as a reusable React feature module.

**📦 NEW:** See [PWA_MIGRATION_GUIDE.md](./PWA_MIGRATION_GUIDE.md) for comprehensive guide on transplanting this feature into an existing HabitGame-style PWA.

## Project Overview

Treasure Dig is an isomorphic minigame built to be easily integrated into larger PWA applications. Players use limited tools to break tiles on a grid, revealing hidden treasures underneath. The game features multiple levels with increasing difficulty, power-ups, and blockers.

---

## Integration into Parent App

### Quick Start

```tsx
import { TreasureDigFeature } from './treasure-dig'

function ParentApp() {
  return (
    <TreasureDigFeature 
      callbacks={{
        onLevelComplete: (result) => {
          console.log('Level complete!', result)
        },
        onRewardEarned: (reward) => {
          console.log('Reward earned:', reward)
        },
        onGameExit: () => {
          console.log('User exited game')
        }
      }}
    />
  )
}
```

### Advanced Integration

```tsx
import { TreasureDigFeature } from './treasure-dig'
import { myCustomLevels } from './myLevels'

function HabitGameIntegration() {
  const handleLevelComplete = async (result: LevelResult) => {
    await saveToSupabase(result)
    await awardHabitCoins(result.score)
  }

  const customTheme = {
    colors: {
      tileHidden: 'bg-gradient-to-br from-purple-400 to-purple-500',
      tileObject: 'bg-gradient-to-br from-gold-200 to-yellow-300',
    }
  }

  return (
    <TreasureDigFeature
      initialLevel={getUserProgress()}
      customLevels={myCustomLevels}
      theme={customTheme}
      callbacks={{
        onLevelComplete: handleLevelComplete,
        onProgressSync: async (state) => {
          await supabase.from('game_progress').upsert({
            user_id: currentUser.id,
            treasure_dig_state: state
          })
        }
      }}
    />
  )
}
```

---

## Architecture

### Directory Structure

```
src/treasure-dig/
├── adapters/          # Backend integration layer
│   └── backend.ts     # Mock adapter for future backend syncing
├── components/        # React presentation components
│   ├── TreasureDigGame.tsx      # Main game orchestrator
│   ├── TreasureDigFeature.tsx   # Top-level export component
│   └── game/
│       ├── Board.tsx             # Presentation-only board
│       ├── HUD.tsx               # Game UI header
│       └── Tile.tsx              # Individual tile component
├── data/              # Game content & configuration
│   ├── constants.ts   # Animation durations, scoring, colors
│   ├── levels.ts      # All level definitions
│   └── objects.ts     # Hidable treasure shapes
├── engine/            # Pure game logic (NO React)
│   └── GameEngine.ts  # State management & rules engine
├── game/              # Legacy board generator
│   └── boardGenerator.ts
├── hooks/             # React integration hooks
│   └── useGameEngine.ts
├── types/             # TypeScript definitions
│   └── game.types.ts  # All strongly-typed interfaces
└── utils/             # Helper functions
    ├── objectDetector.ts
    ├── placement.ts
    ├── rewards.ts
    └── validator.ts
```

### Core Separation of Concerns

1. **Pure Game Engine (`engine/GameEngine.ts`)**
   - Zero React dependencies
   - Handles all game state transitions
   - Can be unit tested in isolation
   - Returns immutable state snapshots

2. **Presentation Layer (`components/`)**
   - React components receive props, render UI
   - No business logic
   - Fully theme-able via props

3. **Data Layer (`data/`)**
   - Level configurations
   - Treasure object definitions
   - Visual constants

4. **Adapter Layer (`adapters/`)**
   - Mock implementation for local development
   - Easy to swap for real backend integration
   - Defined interface for consistency

---

## Strongly-Typed Interfaces

### LevelConfig
Defines a single game level.

```typescript
interface LevelConfig {
  readonly id: number
  readonly name: string
  readonly boardSize: 5 | 6 | 7
  readonly tools: number
  readonly objects: ReadonlyArray<{
    readonly shapeId: string
    readonly position: Position
  }>
  readonly blockers?: ReadonlyArray<Position>
}
```

### TileState
Represents the state of a single board tile.

```typescript
interface TileState {
  position: Position
  status: TileStatus  // 'hidden' | 'breaking' | 'revealed-empty' | 'revealed-object' | 'revealed-blocker'
  objectId?: string
  isBlocker?: boolean
}
```

### HiddenObject
Treasure shape definition using a pattern grid.

```typescript
interface HiddenObject {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly color: string
  readonly pattern: ReadonlyArray<ReadonlyArray<0 | 1>>
}
```

### Reward
Represents rewards earned from completing levels.

```typescript
interface Reward {
  readonly type: 'coins' | 'unlock' | 'milestone'
  readonly amount?: number
  readonly unlockId?: string
  readonly message: string
}
```

### LevelResult
Output data when a level is completed or failed.

```typescript
interface LevelResult {
  readonly levelId: number
  readonly completed: boolean
  readonly toolsLeft: number
  readonly score: number
  readonly objectsFound: number
  readonly totalObjects: number
  readonly timestamp: number
}
```

---

## Mock Adapter Layer

The `adapters/backend.ts` file provides a clean interface for future backend integration. Currently uses a mock implementation that logs to console.

### Interface

```typescript
interface BackendAdapter {
  syncGameState(state: GameState): Promise<void>
  loadGameState(userId: string): Promise<GameState | null>
  submitLevelResult(result: LevelResult): Promise<void>
  awardReward(userId: string, amount: number, type: string): Promise<void>
}
```

### Future Integration

To connect to a real backend:

1. Create a new class implementing `BackendAdapter`
2. Replace `MockBackendAdapter` with your implementation
3. Wire up calls to Supabase, Firebase, or custom API

**Example:**

```typescript
class SupabaseAdapter implements BackendAdapter {
  async syncGameState(state: GameState): Promise<void> {
    await supabase
      .from('game_states')
      .upsert({ user_id: currentUser.id, state })
  }
  
  // ... implement other methods
}
```

---

## Theme Configuration

Colors and visual styles can be customized via the `theme` prop:

```typescript
const customTheme: TreasureDigTheme = {
  colors: {
    tileHidden: 'bg-gradient-to-br from-blue-400 to-blue-500',
    tileBreaking: 'bg-gradient-to-br from-orange-300 to-orange-400',
    tileEmpty: 'bg-gradient-to-br from-gray-50 to-gray-100',
    tileObject: 'bg-gradient-to-br from-green-200 to-emerald-300',
    tileBlocker: 'bg-gradient-to-br from-red-300 to-red-400',
  },
  icons: {
    tool: 'Hammer'  // Phosphor icon name
  }
}

<TreasureDigFeature theme={customTheme} />
```

---

## Developer Handoff

### Adding New Levels

**File:** `src/treasure-dig/data/levels.ts`

Add a new level configuration to the `levels` array:

```typescript
{
  id: 7,
  name: 'My Custom Level',
  boardSize: 6,
  tools: 25,
  objects: [
    { shapeId: 'coin_small', position: { row: 1, col: 1 } },
    { shapeId: 'diamond_big', position: { row: 3, col: 3 } }
  ],
  blockers: [
    { row: 0, col: 0 },
    { row: 5, col: 5 }
  ]
}
```

### Creating New Treasure Shapes

**File:** `src/treasure-dig/data/objects.ts`

Define a new `HiddenObject`:

```typescript
{
  id: 'my_treasure',
  name: 'My Treasure',
  icon: 'Star',  // Phosphor icon
  color: 'gold',
  pattern: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ]
}
```

The pattern is a 2D grid where:
- `1` = part of the treasure
- `0` = empty space

### Adjusting Game Rules

**File:** `src/treasure-dig/data/constants.ts`

```typescript
export const GAME_CONSTANTS = {
  SCORING: {
    PER_OBJECT: 100,      // Points per treasure found
    TOOL_BONUS: 10,       // Bonus per unused tool
    LEVEL_COMPLETE_BONUS: 50  // Flat bonus for completion
  },
  ANIMATION_DURATION: {
    TILE_BREAK: 200,      // ms for tile break animation
    // ... etc
  }
}
```

### Customizing UI Styling

**Files:**
- `src/treasure-dig/data/constants.ts` - Tile colors
- `src/treasure-dig/components/game/*.tsx` - Component layouts
- `src/index.css` - Theme variables (colors, fonts, radii)

### Replacing Placeholder Art

Currently using:
- Tailwind gradient backgrounds for tiles
- Phosphor icons for treasures
- Simple color blocks for visual feedback

To replace:
1. Add image assets to `src/assets/images/`
2. Import in component files
3. Replace `className` gradients with `<img src={...} />`

---

## Data Persistence

The game uses Spark's `useKV` hook for persistent state:

```typescript
const [gameState, setGameState] = useKV('treasure-dig-state', initialState)
```

This automatically syncs to browser storage. To integrate with a backend:

1. Keep `useKV` for offline-first experience
2. Add `onProgressSync` callback to sync to server
3. Load initial state from server via `initialLevel` prop

---

## Callbacks

### onLevelComplete

Called when a level is successfully completed.

```typescript
(result: LevelResult) => void
```

### onRewardEarned

Called when rewards are awarded (level completion, milestones).

```typescript
(reward: Reward) => void
```

### onGameExit

Called when the user exits the game.

```typescript
() => void
```

### onProgressSync

Optional callback for syncing state to a backend.

```typescript
(state: GameState) => Promise<void>
```

---

## Testing Strategy

### Unit Tests
- Test `GameEngine` class in isolation
- Validate level configurations with `validator.ts`
- Test reward calculation logic

### Integration Tests
- Test React hooks with `@testing-library/react`
- Verify state transitions
- Test callback invocations

### E2E Tests
- Full gameplay scenarios
- Level progression
- Win/loss conditions

---

## Performance Considerations

- **Animations:** Kept minimal (200-400ms) for snappy feel
- **State Updates:** Immutable patterns prevent unnecessary re-renders
- **Board Rendering:** Single-pass tile mapping
- **Event Handlers:** Memoized with `useCallback`

---

## Future Enhancements

- [ ] Power-ups (extra tools, reveal hints)
- [ ] Leaderboards
- [ ] Daily challenges
- [ ] Sound effects & haptic feedback
- [ ] Multi-player mode
- [ ] Custom level editor
- [ ] Achievement system integration

---

## Dependencies

**Runtime:**
- React 19
- Framer Motion (animations)
- Phosphor Icons
- Shadcn UI components
- Tailwind CSS

**Dev:**
- TypeScript
- Vite

**Spark SDK:**
- `@github/spark/hooks` for `useKV`

---

## License

Part of the Spark Template project.
