# Treasure Dig Bingo

A mobile-first casual excavation mini-game built with React + TypeScript. Players break tiles to reveal hidden treasures using limited tools, progressing through increasingly challenging levels.

**📦 PWA Integration Ready:** This feature module is designed for easy transplantation into existing React/PWA apps. See documentation below.

## 🎮 Game Overview

- **Genre**: Casual puzzle/excavation
- **Platform**: Mobile-first web (PWA-ready)
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Architecture**: Reusable feature module designed for embedding

## 📚 Documentation

- **[PWA_MIGRATION_GUIDE.md](./PWA_MIGRATION_GUIDE.md)** - Complete guide for integrating into HabitGame-style PWAs
- **[TREASURE_DIG_QUICK_REF.md](./TREASURE_DIG_QUICK_REF.md)** - Quick reference card for common patterns
- **[TREASURE_DIG_README.md](./TREASURE_DIG_README.md)** - Architecture and developer handoff guide

## 🚀 Quick Start

This game is already integrated into the Spark template. Simply run:

```bash
npm install
npm run dev
```

The game automatically loads at the root route.

## 📁 Project Structure

```
src/
├── treasure-dig/              # Main game module (portable)
│   ├── components/            # UI components
│   │   ├── game/              # Game-specific components
│   │   │   ├── Board.tsx      # Main tile grid
│   │   │   ├── Tile.tsx       # Individual tile component
│   │   │   ├── HUD.tsx        # Top header display
│   │   │   ├── ToolCounter.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ObjectDisplay.tsx
│   │   ├── screens/           # Full-screen views
│   │   │   ├── GameScreen.tsx
│   │   │   ├── LevelComplete.tsx
│   │   │   ├── GameOver.tsx
│   │   │   └── RewardPopup.tsx
│   │   └── TreasureDigGame.tsx # Main export component
│   ├── game/                  # Game engine (logic only)
│   │   ├── engine.ts          # Core game state management
│   │   ├── boardGenerator.ts  # Board creation logic
│   │   ├── objectDetector.ts  # Shape completion detection
│   │   └── validator.ts       # Level config validation
│   ├── data/                  # Configuration data
│   │   ├── levels.ts          # All level definitions
│   │   ├── objects.ts         # Shape pattern library
│   │   └── constants.ts       # Game constants
│   ├── types/                 # TypeScript definitions
│   │   ├── game.types.ts      # Core game types
│   │   └── level.types.ts     # Level config types
│   ├── hooks/                 # React hooks
│   │   ├── useGameState.ts    # Main game state hook
│   │   └── useAnimations.ts   # Animation helpers
│   └── utils/                 # Helper functions
│       ├── placement.ts       # Object placement logic
│       └── rewards.ts         # Reward calculations
├── App.tsx                    # App entry point
└── index.css                  # Theme and styles
```

## 🎯 Embedding in Another App

The game is designed as a standalone module. To embed it in your existing React app:

### Installation

1. Copy the entire `src/treasure-dig/` folder to your project
2. Ensure these dependencies are installed:
   ```json
   {
     "react": "^19.0.0",
     "framer-motion": "^12.0.0",
     "@phosphor-icons/react": "^2.0.0",
     "tailwindcss": "^4.0.0"
   }
   ```

### Basic Usage

```tsx
import { TreasureDigGame } from './treasure-dig/components/TreasureDigGame'

function App() {
  return (
    <div className="app">
      <TreasureDigGame />
    </div>
  )
}
```

### Advanced Usage with Callbacks

```tsx
import { TreasureDigGame } from './treasure-dig/components/TreasureDigGame'
import type { LevelResult, Reward } from './treasure-dig/types/game.types'

function App() {
  const handleLevelComplete = (result: LevelResult) => {
    console.log('Level completed:', result)
    // Send to analytics, update database, etc.
  }

  const handleRewardEarned = (reward: Reward) => {
    console.log('Reward earned:', reward)
    // Update user currency, unlock features, etc.
  }

  const handleGameExit = () => {
    console.log('Player exited game')
    // Navigate back to main app
  }

  return (
    <TreasureDigGame
      onLevelComplete={handleLevelComplete}
      onRewardEarned={handleRewardEarned}
      onGameExit={handleGameExit}
    />
  )
}
```

### Props API

```typescript
interface TreasureDigGameProps {
  onLevelComplete?: (result: LevelResult) => void
  onRewardEarned?: (reward: Reward) => void
  onGameExit?: () => void
  initialLevel?: number  // Start at specific level (default: 1)
  customLevels?: Level[] // Provide custom level data
}
```

## 🛠️ Developer Handoff

### What Controls Game Rules

| File | Purpose |
|------|---------|
| `data/levels.ts` | All level configurations (board size, objects, tools) |
| `data/objects.ts` | Shape pattern library (treasure types and their grid layouts) |
| `data/constants.ts` | Global game settings (animations, scoring, milestones) |
| `game/engine.ts` | Core game logic (state transitions, win/lose conditions) |
| `game/validator.ts` | Level validation rules (ensure levels are solvable) |

### What Controls UI & Styling

| File | Purpose |
|------|---------|
| `src/index.css` | Theme colors, fonts, CSS variables |
| `components/game/Tile.tsx` | Tile appearance and animations |
| `components/game/HUD.tsx` | Top header layout and styling |
| `components/screens/*.tsx` | Popup and screen layouts |
| `hooks/useAnimations.ts` | Animation timing and effects |

### How to Add New Levels

Edit `src/treasure-dig/data/levels.ts`:

```typescript
export const levels: Level[] = [
  // ... existing levels
  {
    id: 6,
    name: "Deep Cavern",
    boardSize: 7,
    tools: 30,
    objects: [
      {
        shapeId: "treasure_large",
        position: { row: 1, col: 2 }
      }
    ],
    blockers: [
      { row: 3, col: 3 }
    ]
  }
]
```

**Key Rules:**
- `boardSize`: 5, 6, or 7 (square grids only)
- `tools`: Must be ≥ number of non-empty tiles for level to be winnable
- `objects`: Reference shapes from `objects.ts`
- `position`: Top-left corner of shape (0-indexed)
- Validator will warn if level is impossible or invalid

### How to Add New Object Shapes

Edit `src/treasure-dig/data/objects.ts`:

```typescript
export const objectShapes: ObjectShape[] = [
  // ... existing shapes
  {
    id: "my_custom_shape",
    name: "Custom Treasure",
    icon: "Crown", // Any Phosphor icon name
    color: "gold",
    pattern: [
      [1, 1],
      [1, 0],
    ]
  }
]
```

**Pattern Format:**
- 2D array where `1` = part of object, `0` = empty space
- Minimum size: 2 cells
- Maximum size: fits in smallest board (5x5)
- Patterns are placed top-left aligned from `position`

### How to Replace Placeholder Art

The game currently uses:
- Color blocks for tiles (defined in `Tile.tsx`)
- Phosphor icons for treasures
- CSS gradients for backgrounds

**To upgrade to custom art:**

1. **Tile Textures**:
   - Edit `components/game/Tile.tsx`
   - Replace `bg-gradient-to-br` classes with `<img>` or SVG
   - Add texture images to `src/assets/images/`

2. **Treasure Icons**:
   - Edit `data/objects.ts`
   - Add `imageUrl` field to each `ObjectShape`
   - Update `ObjectDisplay.tsx` to render images instead of icons

3. **Backgrounds**:
   - Edit `components/screens/GameScreen.tsx`
   - Replace background classes with custom images
   - Consider parallax layers for depth

4. **Animations**:
   - Edit `hooks/useAnimations.ts`
   - Replace Framer Motion variants with sprite sheets or Lottie animations

### Game State Persistence

The game uses Spark's `useKV` hook for automatic persistence:

```typescript
// In useGameState.ts
const [gameState, setGameState] = useKV('treasure-dig-state', initialState)
```

**To integrate with your backend:**

1. Replace `useKV` with your state management solution
2. Sync `gameState` to your database on changes
3. Load initial state from user profile on mount

**Current state structure:**
```typescript
{
  currentLevel: number
  completedLevels: number[]
  totalScore: number
  highScores: Record<number, number>
}
```

### Extending for PWA Integration

**Recommended additions for production PWA:**

1. **Currency Integration**:
   ```typescript
   // In onRewardEarned callback
   const handleRewardEarned = async (reward) => {
     await updateUserCurrency(userId, reward.coins)
     await unlockFeature(reward.unlockId)
   }
   ```

2. **Analytics Events**:
   ```typescript
   // In onLevelComplete callback
   analytics.track('level_completed', {
     level: result.levelId,
     tools_remaining: result.toolsLeft,
     time_spent: result.duration
   })
   ```

3. **Daily Challenges**:
   - Add `customLevels` prop with procedurally generated boards
   - Use seed-based generation for consistent daily levels
   - Track daily streaks in parent app

4. **Social Features**:
   - Export replay data from game state
   - Share completion screenshots
   - Leaderboards for speed/efficiency

## 🎨 Theme Customization

The game respects your app's theme. Colors are defined as CSS variables in `index.css`:

```css
:root {
  --treasure-primary: oklch(0.48 0.12 35);
  --treasure-accent: oklch(0.75 0.15 85);
  /* ... more variables */
}
```

Override these in your app's global CSS to match your brand.

## 📱 Mobile Optimization

- **Portrait-first design**: Optimized for 375px-428px width phones
- **Touch targets**: All interactive elements ≥48px
- **Performance**: Animations use CSS transforms for 60fps
- **Responsive grid**: Tiles scale to fit any screen size
- **Safe areas**: Respects notches and home indicators

## 🧪 Testing Checklist

Before deploying changes:

- [ ] All levels are completable (run validator)
- [ ] Tool counts are sufficient for each level
- [ ] Objects don't overlap or go out of bounds
- [ ] Animations perform smoothly on low-end devices
- [ ] Touch targets meet accessibility standards
- [ ] State persists across page refreshes
- [ ] Works in portrait and landscape
- [ ] Tested on iOS Safari and Chrome Android

## 🔧 Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📄 License

Part of the Spark template project. See LICENSE file for details.

## 🤝 Contributing

When adding features:
1. Keep game logic separate from UI components
2. Add TypeScript types for new data structures
3. Update this README with new capabilities
4. Validate levels with the built-in validator
5. Test on real mobile devices

---

**Questions?** Check the inline code comments or review the PRD.md for design decisions.
