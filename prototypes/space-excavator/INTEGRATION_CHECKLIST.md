# Treasure Dig - PWA Integration Checklist

## 🚀 Quick Start (5 Minutes)

### Step 1: Copy Files
```bash
cp -r src/treasure-dig your-app/src/features/
```

### Step 2: Install Dependencies
```bash
npm install framer-motion @phosphor-icons/react
```

### Step 3: Basic Usage
```tsx
import { TreasureDigFeature } from '@/features/treasure-dig'

<TreasureDigFeature
  callbacks={{
    onExitFeature: () => router.back()
  }}
/>
```

---

## 📦 What Gets Copied

```
treasure-dig/
├── adapters/       # Backend sync patterns (modify for your DB)
├── components/     # React UI components
├── data/           # Level configs, constants, object shapes
├── engine/         # Pure game logic (no React)
├── hooks/          # useGameEngine, useGameState
├── types/          # TypeScript interfaces
├── utils/          # Helper functions
└── index.ts        # Main export
```

**File count:** ~20 files  
**Bundle size:** ~40KB minified  
**Dependencies:** framer-motion, @phosphor-icons/react, shadcn (button, dialog, card)

---

## 🎮 Integration Patterns

### Pattern A: Standalone Game
```tsx
<TreasureDigFeature />
```
✅ Self-contained  
✅ Auto-saves progress  
✅ Full-screen layout  

---

### Pattern B: Parent-Controlled State
```tsx
const [tools, setTools] = useState(user.hammers)
const [level, setLevel] = useState(user.level)

<TreasureDigFeature
  wrapperProps={{
    playerToolCount: tools,
    currentLevel: level
  }}
  callbacks={{
    onSpendTool: (remaining) => {
      setTools(remaining)
      updateDB('hammers', remaining)
    },
    onFinishLevel: (levelId, success) => {
      if (success) {
        setLevel(levelId + 1)
        updateDB('level', levelId + 1)
      }
    }
  }}
/>
```
✅ Syncs to your database  
✅ Uses parent app's resources  
✅ Integrates with currency system  

---

### Pattern C: Compact Embedded Mode
```tsx
<div className="h-[600px]">
  <TreasureDigFeature
    layoutConfig={{
      compactMode: true,
      maxHeight: '600px',
      showDefaultToolbar: false
    }}
    customToolbar={<YourAppFooter />}
  />
</div>
```
✅ Fits in modals/drawers  
✅ Responsive sizing  
✅ Custom UI components  

---

## 🔌 Props Reference (Quick)

### `wrapperProps`
| Prop | Type | Purpose |
|------|------|---------|
| `playerToolCount` | `number` | Override tool count from parent |
| `currentLevel` | `number` | Set starting level |
| `rewardTheme` | `string` | Match your currency ('coins', 'gems') |
| `islandTheme` | `string` | Visual theme ('tropical', 'desert') |

### `layoutConfig`
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `compactMode` | `boolean` | `false` | Mobile-optimized spacing |
| `showDefaultHUD` | `boolean` | `true` | Show top header |
| `showDefaultToolbar` | `boolean` | `true` | Show bottom footer |
| `maxWidth` | `string` | `'100%'` | CSS max-width |
| `maxHeight` | `string` | `'100vh'` | CSS max-height |

### `callbacks`
| Callback | Signature | When Called |
|----------|-----------|-------------|
| `onSpendTool` | `(remaining: number) => void` | Each tool spent |
| `onFinishLevel` | `(levelId: number, success: boolean) => void` | Level complete/fail |
| `onExitFeature` | `() => void` | Exit button clicked |
| `onLevelComplete` | `(result: LevelResult) => void` | Level won |
| `onRewardEarned` | `(reward: Reward) => void` | Reward given |

---

## 🎨 Theming

### Match Your App Colors
```css
/* your-app/globals.css */
:root {
  --primary: oklch(0.50 0.15 180);    /* Your brand color */
  --accent: oklch(0.75 0.18 85);      /* Your accent */
}
```

Game auto-inherits Tailwind theme variables.

---

## 🗄️ Backend Integration

### Supabase Pattern
```tsx
const handleSpendTool = async (remaining: number) => {
  await supabase
    .from('user_resources')
    .update({ hammers: remaining })
    .eq('user_id', userId)
}

const handleFinishLevel = async (levelId: number, success: boolean) => {
  if (success) {
    await supabase
      .from('user_progress')
      .update({ treasure_dig_level: levelId + 1 })
      .eq('user_id', userId)
  }
}
```

### Firebase Pattern
```tsx
const handleFinishLevel = async (levelId: number, success: boolean) => {
  const docRef = doc(db, 'users', userId, 'progress', 'games')
  await setDoc(docRef, {
    treasureDigLevel: success ? levelId + 1 : levelId,
    lastPlayed: serverTimestamp()
  }, { merge: true })
}
```

---

## ⚡ Common Use Cases

### 1. Modal/Drawer
```tsx
<Drawer.Content className="h-[90vh]">
  <TreasureDigFeature
    layoutConfig={{ compactMode: true, maxHeight: '90vh' }}
    callbacks={{ onExitFeature: closeDrawer }}
  />
</Drawer.Content>
```

### 2. Tab in Main App
```tsx
<Tabs.Content value="minigame">
  <TreasureDigFeature
    layoutConfig={{ compactMode: true }}
    customToolbar={<AppBottomNav />}
  />
</Tabs.Content>
```

### 3. Full-Screen Route
```tsx
// app/games/treasure-dig/page.tsx
export default function GamePage() {
  return (
    <main className="h-screen">
      <TreasureDigFeature
        callbacks={{
          onExitFeature: () => router.push('/dashboard')
        }}
      />
    </main>
  )
}
```

---

## ✅ Testing Checklist

After integration, verify:

- [ ] Game renders without console errors
- [ ] Tools decrement on tile click
- [ ] Level completion shows dialog
- [ ] Exit button navigates correctly
- [ ] Compact mode fits container
- [ ] Custom HUD/toolbar render
- [ ] Backend sync calls execute
- [ ] Rewards are distributed
- [ ] Progress persists on reload
- [ ] Mobile viewport works

---

## 🐛 Common Issues

### Issue: Tools don't decrement
**Cause:** Provided `onSpendTool` but no `playerToolCount`  
**Fix:** Pass both together
```tsx
wrapperProps={{ playerToolCount: tools }}
callbacks={{ onSpendTool: setTools }}
```

### Issue: Game takes full screen in modal
**Cause:** Missing layout constraints  
**Fix:** Add `layoutConfig`
```tsx
layoutConfig={{
  compactMode: true,
  maxHeight: '80vh'
}}
```

### Issue: Exit button doesn't show
**Cause:** No exit callback provided  
**Fix:** Add callback
```tsx
callbacks={{
  onExitFeature: () => router.back()
}}
```

---

## 📚 Full Documentation

- **PWA_MIGRATION_GUIDE.md** - Complete integration guide
- **TREASURE_DIG_README.md** - Feature documentation
- **TREASURE_DIG_QUICK_REF.md** - Developer reference
- **src/treasure-dig/types/game.types.ts** - TypeScript definitions

---

## 🎯 Next Steps

1. Copy files ✓
2. Test standalone ✓
3. Add wrapper props ✓
4. Connect callbacks ✓
5. Style to match ✓
6. Deploy 🚀

**Estimated integration time:** 30-60 minutes for full setup
