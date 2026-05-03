# Treasure Dig PWA Migration Guide

## Overview

This document explains how to transplant the Treasure Dig feature module into an existing HabitGame-style PWA or any React-based progressive web app.

---

## What's New in This Version

### Wrapper Prop Model
The feature now supports external control through wrapper props:
- `playerToolCount` - Override tool count from parent app
- `currentLevel` - Set initial level from parent state
- `rewardTheme` - Theme rewards to match your app's currency system
- `islandTheme` - Visual theme customization for island aesthetics

### New Callbacks
- `onSpendTool(toolsRemaining)` - Called each time a tool is spent
- `onFinishLevel(levelId, success)` - Called when level ends (win or lose)
- `onExitFeature()` - Called when user exits the game

### Layout Flexibility
- **Compact Mode** - Optimized for constrained mobile viewports
- **Custom HUD** - Replace the default header with your own
- **Custom Toolbar** - Replace the default bottom toolbar with your app's footer
- **Constrained Rendering** - Works within fixed-height parent containers

---

## Quick Integration

### Option 1: Standalone Full-Screen Mode

```tsx
import { TreasureDigFeature } from './treasure-dig'

function MyApp() {
  return (
    <TreasureDigFeature
      callbacks={{
        onExitFeature: () => {
          // Navigate back to main app
          router.push('/dashboard')
        }
      }}
    />
  )
}
```

### Option 2: Embedded with Parent App State

```tsx
import { TreasureDigFeature } from './treasure-dig'

function HabitGameMiniGame() {
  const { user } = useAuth()
  const [userTools, setUserTools] = useState(user.toolCount)
  const [currentLevel, setCurrentLevel] = useState(user.progress.treasureDigLevel)

  const handleSpendTool = async (remaining: number) => {
    setUserTools(remaining)
    await supabase
      .from('user_resources')
      .update({ tool_count: remaining })
      .eq('user_id', user.id)
  }

  const handleFinishLevel = async (levelId: number, success: boolean) => {
    if (success) {
      setCurrentLevel(levelId + 1)
      await supabase
        .from('user_progress')
        .update({ treasure_dig_level: levelId + 1 })
        .eq('user_id', user.id)
    }
  }

  return (
    <TreasureDigFeature
      wrapperProps={{
        playerToolCount: userTools,
        currentLevel,
        rewardTheme: 'coins',
        islandTheme: 'tropical'
      }}
      callbacks={{
        onSpendTool: handleSpendTool,
        onFinishLevel: handleFinishLevel,
        onExitFeature: () => router.back()
      }}
    />
  )
}
```

### Option 3: Compact Mode in Tab/Modal

```tsx
import { TreasureDigFeature } from './treasure-dig'

function MiniGameModal({ isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-[90vh] p-0">
        <TreasureDigFeature
          layoutConfig={{
            compactMode: true,
            maxHeight: '90vh',
            maxWidth: '100%'
          }}
          callbacks={{
            onExitFeature: onClose
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
```

### Option 4: Custom HUD and Footer

```tsx
import { TreasureDigFeature } from './treasure-dig'

function CustomizedGame() {
  return (
    <TreasureDigFeature
      layoutConfig={{
        showDefaultHUD: false,
        showDefaultToolbar: false
      }}
      customHUD={
        <MyAppHeader>
          <BackButton />
          <ToolCounter />
          <CoinDisplay />
        </MyAppHeader>
      }
      customToolbar={
        <MyAppFooter>
          <NavigationTabs />
        </MyAppFooter>
      }
    />
  )
}
```

---

## Files to Move

### Core Feature Module

Copy the entire `/src/treasure-dig` directory to your project:

```
your-app/
├── src/
│   ├── features/           # Your existing features directory
│   │   └── treasure-dig/   # ← Paste here
│   │       ├── adapters/
│   │       ├── components/
│   │       ├── data/
│   │       ├── engine/
│   │       ├── game/
│   │       ├── hooks/
│   │       ├── types/
│   │       ├── utils/
│   │       └── index.ts
```

### Dependencies

Ensure you have these packages installed:

```bash
npm install framer-motion @phosphor-icons/react
```

If your project doesn't have these shadcn components, install them:

```bash
npx shadcn-ui@latest add button card dialog badge
```

### Import Path Updates

After copying, update imports in `treasure-dig/index.ts` if your project structure differs:

```typescript
// Change this:
import { Button } from '@/components/ui/button'

// To match your structure:
import { Button } from '@/components/ui/button' // or wherever yours live
```

---

## PropInterface Reference

### `TreasureDigFeatureProps`

```typescript
interface TreasureDigFeatureProps {
  // Wrapper props for parent app integration
  wrapperProps?: {
    playerToolCount?: number      // Override tool count
    currentLevel?: number          // Set starting level
    rewardTheme?: string           // 'coins' | 'gems' | 'stars' | custom
    islandTheme?: string           // 'tropical' | 'desert' | 'forest' | custom
  }

  // Layout configuration
  layoutConfig?: {
    compactMode?: boolean          // Mobile-optimized compact layout
    showDefaultHUD?: boolean       // Show/hide default header
    showDefaultToolbar?: boolean   // Show/hide default footer
    maxWidth?: string              // CSS max-width value
    maxHeight?: string             // CSS max-height value
  }

  // Custom component overrides
  customHUD?: React.ReactNode      // Replace default HUD
  customToolbar?: React.ReactNode  // Replace default toolbar

  // Callbacks for parent app
  callbacks?: {
    onSpendTool?: (toolsRemaining: number) => void
    onFinishLevel?: (levelId: number, success: boolean) => void
    onExitFeature?: () => void
    onLevelComplete?: (result: LevelResult) => void
    onRewardEarned?: (reward: Reward) => void
    onGameExit?: () => void
    onProgressSync?: (state: GameState) => Promise<void>
  }

  // Game configuration (existing props)
  initialLevel?: number
  customLevels?: ReadonlyArray<LevelConfig>
  theme?: TreasureDigTheme
  mockMode?: boolean
}
```

---

## State Management Options

### Option A: Self-Contained (Default)

The feature manages its own state internally using Spark's `useKV` hook.

```tsx
<TreasureDigFeature />
```

State is persisted automatically between sessions.

### Option B: Parent-Controlled Tools

Parent app controls tool count, feature notifies on changes:

```tsx
const [tools, setTools] = useState(10)

<TreasureDigFeature
  wrapperProps={{ playerToolCount: tools }}
  callbacks={{
    onSpendTool: (remaining) => {
      setTools(remaining)
      // Sync to backend
    }
  }}
/>
```

### Option C: Full External State

Parent app controls both tools AND level progression:

```tsx
const { userProgress, updateProgress } = useUserProgress()

<TreasureDigFeature
  wrapperProps={{
    playerToolCount: userProgress.tools,
    currentLevel: userProgress.level
  }}
  callbacks={{
    onSpendTool: async (remaining) => {
      await updateProgress({ tools: remaining })
    },
    onFinishLevel: async (levelId, success) => {
      if (success) {
        await updateProgress({ level: levelId + 1 })
      }
    }
  }}
/>
```

---

## Theming and Styling

### Matching Your App's Design System

The feature uses Tailwind CSS custom properties. Override these in your global CSS:

```css
/* your-app/globals.css */
:root {
  /* Treasure Dig will inherit these */
  --primary: oklch(0.50 0.15 180);        /* Your brand color */
  --accent: oklch(0.75 0.18 85);          /* Your accent color */
  --destructive: oklch(0.55 0.20 25);     /* Your error color */
  
  /* Or scope to a specific container */
}

.treasure-dig-container {
  --primary: oklch(0.48 0.12 35);
  --accent: oklch(0.75 0.15 85);
}
```

### Custom Island Themes

Pass a theme object to customize visuals:

```tsx
<TreasureDigFeature
  wrapperProps={{
    islandTheme: 'volcanic'
  }}
  theme={{
    colors: {
      tileHidden: 'bg-gradient-to-br from-gray-700 to-gray-800',
      tileObject: 'bg-gradient-to-br from-orange-400 to-red-500',
      tileBlocker: 'bg-gradient-to-br from-black to-gray-900'
    }
  }}
/>
```

---

## Reward System Integration

### Mapping to Your Currency System

```tsx
const handleRewardEarned = async (reward: Reward) => {
  switch (reward.type) {
    case 'coins':
      await addUserCoins(reward.amount || 0)
      break
    case 'unlock':
      await unlockFeature(reward.unlockId!)
      break
    case 'milestone':
      await trackAchievement('treasure_dig_milestone', reward.message)
      break
  }
}

<TreasureDigFeature
  wrapperProps={{ rewardTheme: 'coins' }}
  callbacks={{ onRewardEarned: handleRewardEarned }}
/>
```

---

## Backend Sync Patterns

### Supabase Example

```tsx
const handleProgressSync = async (state: GameState) => {
  const { data, error } = await supabase
    .from('game_progress')
    .upsert({
      user_id: user.id,
      feature: 'treasure_dig',
      current_level: state.currentLevel,
      completed_levels: state.completedLevels,
      total_score: state.totalScore,
      high_scores: state.highScores,
      updated_at: new Date().toISOString()
    })
  
  if (error) console.error('Sync failed:', error)
}

<TreasureDigFeature
  callbacks={{ onProgressSync: handleProgressSync }}
/>
```

### Firebase Example

```tsx
const handleProgressSync = async (state: GameState) => {
  const docRef = doc(db, 'users', user.uid, 'games', 'treasure_dig')
  await setDoc(docRef, {
    ...state,
    lastPlayed: serverTimestamp()
  }, { merge: true })
}
```

---

## Mobile & Responsive Considerations

### Full-Screen Mobile

```tsx
<div className="fixed inset-0 bg-background">
  <TreasureDigFeature
    layoutConfig={{
      maxWidth: '100vw',
      maxHeight: '100vh'
    }}
  />
</div>
```

### Embedded in Scrollable Page

```tsx
<div className="container mx-auto py-8">
  <h1>Mini Games</h1>
  <div className="h-[600px] border rounded-lg overflow-hidden">
    <TreasureDigFeature
      layoutConfig={{
        compactMode: true,
        maxHeight: '600px'
      }}
    />
  </div>
</div>
```

### Bottom Sheet / Drawer

```tsx
import { Drawer } from 'vaul'

<Drawer.Root>
  <Drawer.Content className="h-[85vh]">
    <TreasureDigFeature
      layoutConfig={{
        compactMode: true,
        maxHeight: '85vh',
        showDefaultToolbar: false
      }}
      customToolbar={
        <div className="p-4 border-t">
          <Button onClick={closeDrawer}>Close</Button>
        </div>
      }
    />
  </Drawer.Content>
</Drawer.Root>
```

---

## Asset Replacement

### Current Assets

All visual assets are currently CSS gradients and icon fonts (Phosphor Icons). No image files are required.

### To Add Custom Graphics

1. Create an `assets/` directory in `treasure-dig/`
2. Import images in components:

```tsx
// treasure-dig/components/game/Tile.tsx
import tileHiddenBg from '../assets/tile-hidden.png'
import treasureIcon from '../assets/treasure.png'

<div 
  className="tile" 
  style={{ backgroundImage: `url(${tileHiddenBg})` }}
>
  <img src={treasureIcon} alt="treasure" />
</div>
```

3. Update theme colors to transparent if using images

---

## Testing After Migration

### Checklist

- [ ] Feature renders without errors
- [ ] Tool spending decrements correctly
- [ ] Level completion triggers callback
- [ ] Exit button navigates back to app
- [ ] Compact mode fits in container
- [ ] Custom HUD/toolbar render correctly
- [ ] Backend sync calls are made
- [ ] Rewards are awarded to user account
- [ ] State persists between sessions
- [ ] Mobile viewport works correctly

### Test Component

```tsx
function TreasureDigTest() {
  const [tools, setTools] = useState(15)
  const [level, setLevel] = useState(1)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div>
        <TreasureDigFeature
          wrapperProps={{
            playerToolCount: tools,
            currentLevel: level
          }}
          layoutConfig={{
            compactMode: true,
            maxHeight: '600px'
          }}
          callbacks={{
            onSpendTool: (remaining) => {
              setTools(remaining)
              addLog(`Tool spent, ${remaining} remaining`)
            },
            onFinishLevel: (levelId, success) => {
              addLog(`Level ${levelId} ${success ? 'completed' : 'failed'}`)
              if (success) setLevel(levelId + 1)
            },
            onExitFeature: () => addLog('Exit clicked')
          }}
        />
      </div>
      <div className="space-y-2">
        <h3 className="font-bold">Test Console</h3>
        <div className="p-2 bg-muted rounded">
          <div>Tools: {tools}</div>
          <div>Level: {level}</div>
        </div>
        <div className="h-[400px] overflow-auto bg-black text-green-400 p-2 rounded font-mono text-xs">
          {log.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
        <Button onClick={() => setTools(10)}>Reset Tools</Button>
        <Button onClick={() => setLevel(1)}>Reset Level</Button>
      </div>
    </div>
  )
}
```

---

## Common Pitfalls

### ❌ Don't: Mutate Props

```tsx
// BAD
const handleSpendTool = (remaining) => {
  wrapperProps.playerToolCount = remaining  // ❌
}
```

```tsx
// GOOD
const handleSpendTool = (remaining) => {
  setToolCount(remaining)  // ✅
}
```

### ❌ Don't: Block Default Behavior

If you provide `onSpendTool`, the feature will NOT automatically decrement internal tools. You must update `wrapperProps.playerToolCount`.

```tsx
// BAD - tools won't decrement
<TreasureDigFeature
  callbacks={{
    onSpendTool: () => console.log('spent')  // ❌ No state update
  }}
/>
```

```tsx
// GOOD
const [tools, setTools] = useState(10)
<TreasureDigFeature
  wrapperProps={{ playerToolCount: tools }}
  callbacks={{
    onSpendTool: (remaining) => setTools(remaining)  // ✅
  }}
/>
```

### ❌ Don't: Forget Exit Handler

Always provide an exit callback if embedding in your app:

```tsx
<TreasureDigFeature
  callbacks={{
    onExitFeature: () => {
      // Navigate somewhere or close modal
      router.back()
    }
  }}
/>
```

---

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react'

const TreasureDigFeature = lazy(() => 
  import('./features/treasure-dig').then(m => ({ 
    default: m.TreasureDigFeature 
  }))
)

function App() {
  return (
    <Suspense fallback={<GameLoadingSpinner />}>
      <TreasureDigFeature />
    </Suspense>
  )
}
```

### Code Splitting by Route

```tsx
// app/minigames/treasure-dig/page.tsx
export default function TreasureDigPage() {
  return <TreasureDigFeature />
}
```

---

## Migration Checklist

- [ ] Copy `/src/treasure-dig` folder to your project
- [ ] Install dependencies (`framer-motion`, `@phosphor-icons/react`)
- [ ] Install required shadcn components
- [ ] Update import paths if needed
- [ ] Test standalone rendering
- [ ] Integrate wrapper props
- [ ] Connect callbacks to your backend
- [ ] Implement reward distribution
- [ ] Test compact mode
- [ ] Add custom HUD/toolbar if desired
- [ ] Apply your app's theme
- [ ] Test on mobile devices
- [ ] Update routing/navigation
- [ ] Add analytics tracking
- [ ] Document for your team

---

## Support & Customization

### Modifying Game Rules

See `TREASURE_DIG_README.md` sections:
- Adding New Levels
- Creating New Treasure Shapes
- Adjusting Game Rules

### Customizing UI Components

All UI components are in `treasure-dig/components/game/`:
- `HUD.tsx` - Top header
- `Board.tsx` - Game board container
- `Tile.tsx` - Individual tile rendering

Modify these directly or pass `customHUD` / `customToolbar` to replace them.

---

## Example: Complete HabitGame Integration

```tsx
// app/games/treasure-dig/page.tsx
'use client'

import { TreasureDigFeature } from '@/features/treasure-dig'
import { useUserProgress } from '@/hooks/useUserProgress'
import { useUserResources } from '@/hooks/useUserResources'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function TreasureDigGame() {
  const router = useRouter()
  const { progress, updateProgress } = useUserProgress()
  const { resources, spendResource, addResource } = useUserResources()

  const handleSpendTool = async (remaining: number) => {
    await spendResource('hammer', 1)
    toast.info(`${remaining} tools remaining`)
  }

  const handleFinishLevel = async (levelId: number, success: boolean) => {
    if (success) {
      await updateProgress({ treasureDigLevel: levelId + 1 })
      await addResource('coins', levelId * 100)
      toast.success(`Level ${levelId} complete! +${levelId * 100} coins`)
    } else {
      toast.error('Out of tools! Try again?')
    }
  }

  const handleExit = () => {
    router.push('/dashboard')
  }

  return (
    <main className="h-screen">
      <TreasureDigFeature
        wrapperProps={{
          playerToolCount: resources.hammer,
          currentLevel: progress.treasureDigLevel || 1,
          rewardTheme: 'coins',
          islandTheme: 'tropical'
        }}
        callbacks={{
          onSpendTool: handleSpendTool,
          onFinishLevel: handleFinishLevel,
          onExitFeature: handleExit,
          onProgressSync: async (state) => {
            await updateProgress({ 
              treasureDigState: state 
            })
          }
        }}
        layoutConfig={{
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      />
    </main>
  )
}
```

---

## Summary

This feature is designed to drop into any React PWA with minimal friction:

1. **Copy the folder** - Self-contained module
2. **Pass props** - Control from parent app
3. **Handle callbacks** - React to game events
4. **Style to match** - CSS custom properties
5. **Ship it** - Works on mobile and desktop

For questions or advanced customization needs, refer to the inline TypeScript types and component source code.
