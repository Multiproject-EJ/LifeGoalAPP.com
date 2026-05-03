# Treasure Dig - Quick Reference Card

## 🚀 Installation

```bash
# 1. Copy folder
cp -r src/treasure-dig your-app/src/features/

# 2. Install dependencies
npm install framer-motion @phosphor-icons/react

# 3. Install shadcn components (if needed)
npx shadcn-ui@latest add button card dialog badge
```

## 📝 Basic Usage

```tsx
import { TreasureDigFeature } from './features/treasure-dig'

<TreasureDigFeature />
```

## 🎛️ Props Overview

### Wrapper Props (Parent App Integration)
```tsx
wrapperProps={{
  playerToolCount: number,      // Override tool count
  currentLevel: number,          // Set current level
  rewardTheme: string,           // 'coins' | 'gems' | 'stars'
  islandTheme: string            // 'tropical' | 'desert' | etc.
}}
```

### Layout Config (Viewport Control)
```tsx
layoutConfig={{
  compactMode: boolean,          // Mobile-optimized layout
  showDefaultHUD: boolean,       // Show/hide top header
  showDefaultToolbar: boolean,   // Show/hide bottom bar
  maxWidth: string,              // CSS max-width
  maxHeight: string              // CSS max-height
}}
```

### Callbacks (Event Handlers)
```tsx
callbacks={{
  onSpendTool: (remaining) => {},           // Tool spent
  onFinishLevel: (id, success) => {},       // Level ended
  onExitFeature: () => {},                  // User clicked exit
  onLevelComplete: (result) => {},          // Level completed
  onRewardEarned: (reward) => {},           // Reward awarded
  onProgressSync: async (state) => {}       // Sync to backend
}}
```

### Custom Components
```tsx
customHUD={<YourHeader />}          // Replace top HUD
customToolbar={<YourFooter />}      // Replace bottom toolbar
```

## 💡 Common Patterns

### Full-Screen Game
```tsx
<div className="h-screen">
  <TreasureDigFeature
    callbacks={{ onExitFeature: () => router.back() }}
  />
</div>
```

### Embedded Compact Mode
```tsx
<div className="h-[600px] border rounded">
  <TreasureDigFeature
    layoutConfig={{
      compactMode: true,
      maxHeight: '600px'
    }}
  />
</div>
```

### Parent-Controlled State
```tsx
const [tools, setTools] = useState(10)
const [level, setLevel] = useState(1)

<TreasureDigFeature
  wrapperProps={{
    playerToolCount: tools,
    currentLevel: level
  }}
  callbacks={{
    onSpendTool: setTools,
    onFinishLevel: (id, success) => {
      if (success) setLevel(id + 1)
    }
  }}
/>
```

### Backend Sync (Supabase)
```tsx
<TreasureDigFeature
  callbacks={{
    onProgressSync: async (state) => {
      await supabase
        .from('game_progress')
        .upsert({
          user_id: user.id,
          treasure_dig_state: state
        })
    }
  }}
/>
```

### Custom Theme
```tsx
<TreasureDigFeature
  theme={{
    colors: {
      tileHidden: 'bg-gradient-to-br from-purple-500 to-pink-500',
      tileObject: 'bg-gradient-to-br from-yellow-300 to-orange-400'
    }
  }}
/>
```

## 🎨 Styling

Uses Tailwind CSS custom properties. Override in your global CSS:

```css
:root {
  --primary: oklch(0.50 0.15 180);
  --accent: oklch(0.75 0.18 85);
  --destructive: oklch(0.55 0.20 25);
}
```

## 📂 File Structure

```
treasure-dig/
├── components/        # React UI components
├── data/             # Levels, objects, constants
├── hooks/            # React hooks
├── types/            # TypeScript definitions
├── utils/            # Helper functions
├── adapters/         # Backend adapters
├── engine/           # Pure game logic
└── index.ts          # Public exports
```

## 🔗 TypeScript Types

```typescript
import type {
  TreasureDigFeatureProps,
  LevelConfig,
  LevelResult,
  Reward,
  GameState,
  WrapperProps,
  LayoutConfig
} from './features/treasure-dig'
```

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `data/levels.ts` | Level definitions |
| `data/objects.ts` | Treasure shapes |
| `data/constants.ts` | Game rules, scoring, colors |

## 🧪 Testing

```tsx
import { TreasureDigFeature } from './features/treasure-dig'

function TestHarness() {
  const [log, setLog] = useState([])
  
  return (
    <div className="grid grid-cols-2">
      <TreasureDigFeature
        layoutConfig={{ compactMode: true }}
        callbacks={{
          onSpendTool: (n) => setLog(prev => [...prev, `Tool: ${n}`]),
          onFinishLevel: (id, success) => setLog(prev => 
            [...prev, `Level ${id}: ${success}`]
          )
        }}
      />
      <div className="p-4 bg-black text-green-400 font-mono">
        {log.map((entry, i) => <div key={i}>{entry}</div>)}
      </div>
    </div>
  )
}
```

## 📖 Full Documentation

- [PWA_MIGRATION_GUIDE.md](./PWA_MIGRATION_GUIDE.md) - Complete migration guide
- [TREASURE_DIG_README.md](./TREASURE_DIG_README.md) - Architecture & developer handoff

## 🆘 Common Issues

### Tools not decrementing?
You must update `wrapperProps.playerToolCount` when handling `onSpendTool`:
```tsx
// ❌ Wrong
callbacks={{ onSpendTool: () => console.log('spent') }}

// ✅ Correct
const [tools, setTools] = useState(10)
<TreasureDigFeature
  wrapperProps={{ playerToolCount: tools }}
  callbacks={{ onSpendTool: setTools }}
/>
```

### Game not exiting?
Always provide an exit callback:
```tsx
callbacks={{
  onExitFeature: () => router.back()  // or navigate somewhere
}}
```

### Not fitting in container?
Use layout config:
```tsx
layoutConfig={{
  maxHeight: '600px',
  compactMode: true
}}
```

---

**Version:** 2.0  
**Last Updated:** 2025  
**License:** Part of Spark Template project
