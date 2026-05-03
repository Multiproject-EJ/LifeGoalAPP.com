# Treasure Dig Bingo - Clean Structure for Transplanting

This repository contains a fully playable Treasure Dig Bingo mini-game built with React and TypeScript. The codebase has been structured specifically to make it easy to transplant into a larger PWA like HabitGame.

## 📁 Repository Structure

```
src/
  components/         ← UI Components (pure presentation)
    TreasureBoard.tsx
    TileCell.tsx
    TopProgressHud.tsx
    ToolBar.tsx
    RewardModal.tsx
  
  game/              ← Game engine logic (React-independent)
    engine.ts
    placement.ts
    winConditions.ts
  
  data/              ← Level configuration and shapes
    levels.ts
    shapes.ts
  
  types/             ← TypeScript interfaces
    game.ts
  
  hooks/             ← React hooks
    useTreasureDigGame.ts
  
  screens/           ← Top-level feature component
    TreasureDigFeature.tsx
  
  utils/ (optional)  ← Helper utilities (if needed)
```

## 🚀 Transplanting into HabitGame

When you're ready to import this game into your larger PWA, follow these steps:

### Step 1: Copy These Folders

Copy the following directories from this repo into your HabitGame codebase:

```
src/components/  → HabitGame/src/features/treasure-dig/components/
src/game/        → HabitGame/src/features/treasure-dig/game/
src/data/        → HabitGame/src/features/treasure-dig/data/
src/types/       → HabitGame/src/features/treasure-dig/types/
src/hooks/       → HabitGame/src/features/treasure-dig/hooks/
src/screens/     → HabitGame/src/features/treasure-dig/
```

### Step 2: Import the Feature

In your HabitGame routing or feature management:

```tsx
import { TreasureDigFeature } from '@/features/treasure-dig/screens/TreasureDigFeature'

// Use it in your app
<TreasureDigFeature />
```

### Step 3: Wire Up Callbacks

Connect the game to your app's state management:

```tsx
<TreasureDigFeature
  callbacks={{
    onSpendTool: () => {
      // Deduct a tool from player inventory
    },
    onFinishLevel: (result) => {
      // Save level completion to database
      // Award currency/rewards
    },
    onExitFeature: () => {
      // Navigate back to main app
    },
    onRewardEarned: (reward) => {
      // Update player currency
    }
  }}
  wrapperProps={{
    playerToolCount: playerInventory.tools,
    currentLevel: playerProgress.treasureDigLevel,
  }}
  layoutConfig={{
    compactMode: true,  // If embedded in a smaller view
    showDefaultHUD: true,
    showDefaultToolbar: true,
  }}
/>
```

## 🎮 Game Architecture

### Pure Game Logic (`/game`)

These files contain zero React dependencies and can be unit tested independently:
- **engine.ts**: Board generation and initialization
- **placement.ts**: Object placement validation
- **winConditions.ts**: Check if objects are complete

###React Layer (`/hooks` & `/components`)

- **useTreasureDigGame.ts**: Main game state hook that wraps the pure engine
- **TreasureBoard.tsx**, **TileCell.tsx**: Presentation components
- **TopProgressHud.tsx**, **ToolBar.tsx**: UI chrome
- **RewardModal.tsx**: Victory/defeat dialog

### Data Layer (`/data`)

- **levels.ts**: Level configurations (board size, tools, objects, blockers)
- **shapes.ts**: Treasure shape patterns

### Entry Point (`/screens`)

- **TreasureDigFeature.tsx**: Top-level component with all wiring

## 🎨 Customization

### Adding New Levels

Edit `src/data/levels.ts`:

```ts
{
  id: 7,
  name: 'My New Level',
  boardSize: 6,
  tools: 25,
  objects: [
    { shapeId: 'coin_small', position: { row: 1, col: 1 } },
  ],
  blockers: [{ row: 0, col: 0 }],
}
```

### Adding New Treasure Shapes

Edit `src/data/shapes.ts`:

```ts
{
  id: 'my_shape',
  name: 'My Treasure',
  icon: 'Star',
  color: 'gold',
  pattern: [
    [0, 1, 0],
    [1, 1, 1],
  ],
}
```

### Custom UI

Override default HUD or Toolbar:

```tsx
const CustomHUD = ({ levelNumber, toolsRemaining, ... }) => (
  <div>My custom header!</div>
)

<TreasureDigFeature
  customHUD={CustomHUD}
  layoutConfig={{ showDefaultHUD: false }}
/>
```

## 📦 Dependencies

This feature uses:
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Shadcn UI components (Button, Card, Dialog, Badge)
- Phosphor Icons

All dependencies are already included in the Spark template.

## 🧪 Testing the Game

Run the development server:

```bash
npm run dev
```

The game should load automatically at `http://localhost:5173/`

## 💡 Key Design Decisions

1. **Self-contained state**: Game doesn't depend on external state management
2. **Callback-based integration**: Easy to wire into any parent app
3. **Prop-driven theming**: Colors/styles can match parent app
4. **Compact mode support**: Can render in constrained viewports
5. **Replaceable UI**: HUD and Toolbar can be swapped for custom components

## 📝 File Manifest for Transplanting

**Must copy** (core functionality):
- `src/components/*`
- `src/game/*`
- `src/data/*`
- `src/types/*`
- `src/hooks/*`
- `src/screens/TreasureDigFeature.tsx`

**Optional** (can be customized in target app):
- Theme/styling (use parent app's theme)
- Icons (swap Phosphor for parent app's icon library)

## 🔧 Future Enhancements

Potential additions for HabitGame integration:
- Persist progress to Supabase
- Daily challenges with special rewards
- Power-ups purchasable with in-app currency
- Leaderboards/multiplayer
- Seasonal themes and limited-time treasures

---

**Ready to transplant!** Simply copy the listed directories into your HabitGame feature folder and wire up the callbacks.
