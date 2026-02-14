# Level Worlds — Testing Guide

## Quick Start

1. **Build the project**:
   ```bash
   npm install
   npm run build
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open the app** in your browser

## Test Flow

### 1. Access Level Worlds
- Navigate to Daily Treats
- Open Lucky Roll board (Card 2)
- Look for the "🗺️ Campaign" button
- Click the Campaign button

**Expected**: Level Worlds Hub opens with Level 1 board

### 2. First Board (Level 1 - Tutorial)
**Expected State**:
- Title: One of "Whispering Woods", "Emerald Grove", etc.
- Theme: Forest (green gradient background)
- 3 nodes visible on winding path
- Node 1 (top): Active (glowing)
- Nodes 2-3: Locked (grayed out)
- Progress bar: 0/3 complete

### 3. Interact with Active Node
- Tap the first active node
- Bottom sheet slides up from bottom

**Expected**:
- Node emoji displayed large
- Node label and description
- Rewards preview (1❤️, 3🎲, 15🪙, 10 XP)
- Action button

### 4. Mini-Game Node
If first node is a mini-game:
- Click action button
- Mini-game launches (Task Tower, Pomodoro, Vision Quest, or Wheel of Wins)
- Complete the mini-game
- Return to Level Worlds

**Expected**:
- Node 1 shows checkmark (✓)
- Node 2 becomes active (glowing)
- Progress bar: 1/3 complete
- Currency balances increased

### 5. Non-Mini-Game Node
If node is habit/goal/journal/personality:
- Click action button
- Notification toast appears at bottom

**Expected**:
- Toast message: "Complete your [type] in the [section] section, then return here"
- Toast auto-dismisses after 5 seconds

### 6. Complete All Nodes
- Complete all 3 nodes on Level 1
- After last node completes

**Expected**:
- Board Complete overlay appears
- 🏆 trophy animation
- Shows all rewards earned (3❤️, 10🎲, 50🪙, 50 XP, 2🎟️)
- "Continue to Next World" button

### 7. Next Board
- Click "Continue to Next World"
- Level 2 board generates

**Expected**:
- New theme (Ocean - blue gradient)
- New title (e.g., "Crystal Cove")
- 3-4 nodes (depending on level)
- Different node positions
- First node active, rest locked
- Progress bar resets to 0/N

### 8. State Persistence
- Refresh the page
- Return to Level Worlds

**Expected**:
- Current level preserved
- Completed nodes remain completed
- Active node still active
- All progress maintained

### 9. Theme Progression
As you progress through levels:
- Level 1: Forest (green)
- Level 2: Ocean (blue)
- Level 3: Cosmic (purple)
- Level 4: Desert (sandy)
- Level 5: Mountain (light blue)
- Level 6: Village (brown)
- Level 7: Forest (repeats)

### 10. Difficulty Scaling

**Level 1-3** (Tutorial):
- 3 nodes each
- Simple objectives
- 1❤️ + 3🎲 + 15🪙 per node
- 3❤️ + 10🎲 + 50🪙 board completion

**Level 4-7** (Early):
- 4 nodes each
- Mixed objectives
- 1❤️ + 5🎲 + 25🪙 per node
- 5❤️ + 20🎲 + 100🪙 board completion

**Level 8-15** (Mid):
- 5 nodes each
- Complex objectives
- 2❤️ + 7🎲 + 40🪙 per node
- 8❤️ + 30🎲 + 200🪙 board completion

**Level 16+** (Late):
- 5-6 nodes each
- Boss nodes included
- 2❤️ + 10🎲 + 50🪙 per node
- 10❤️ + 50🎲 + 300🪙 + cosmetic board completion

## Edge Cases to Test

### Navigation
- [ ] Back button returns to Lucky Roll
- [ ] Currency balances sync correctly
- [ ] Can re-enter Level Worlds from Lucky Roll
- [ ] State persists across entries

### Node Interactions
- [ ] Can only click active nodes
- [ ] Locked nodes don't respond to clicks
- [ ] Completed nodes show checkmark
- [ ] Detail sheet closes on backdrop click
- [ ] Detail sheet closes on X button

### Mini-Games
- [ ] Task Tower launches correctly
- [ ] Pomodoro Sprint launches correctly
- [ ] Vision Quest launches correctly
- [ ] Wheel of Wins launches correctly
- [ ] Completing mini-game marks node complete
- [ ] Exiting mini-game without completing preserves state

### Responsive Design
- [ ] Mobile (320px): Readable and usable
- [ ] Tablet (768px): Properly scaled
- [ ] Desktop (1024px+): Centered layout
- [ ] Portrait orientation: Vertical scroll works
- [ ] Landscape orientation: Horizontal fits

### Performance
- [ ] Board renders quickly (<1s)
- [ ] Animations are smooth (60fps)
- [ ] No console errors
- [ ] No memory leaks
- [ ] localStorage writes don't block UI

## Debugging

### Check State
Open browser console and run:
```javascript
// View current state
const userId = 'your-user-id';
const state = JSON.parse(localStorage.getItem(`levelWorlds_${userId}`));
console.log(state);

// Reset state (start over)
localStorage.removeItem(`levelWorlds_${userId}`);
location.reload();
```

### Check Currency
```javascript
// View currency balances
const userId = 'your-user-id';
const currencies = JSON.parse(localStorage.getItem(`gol_game_currencies_${userId}`));
console.log(currencies);
```

### Common Issues

**Issue**: Level Worlds doesn't open
- **Check**: Campaign button exists on Lucky Roll
- **Fix**: Ensure LuckyRollBoard.tsx was updated

**Issue**: No nodes visible
- **Check**: Board generation succeeded
- **Fix**: Check console for errors in generator

**Issue**: Mini-game doesn't mark node complete
- **Check**: Mini-game completion callback fires
- **Fix**: Ensure onComplete prop is passed

**Issue**: State not persisting
- **Check**: localStorage is available
- **Fix**: Check browser privacy settings

**Issue**: Styling looks wrong
- **Check**: CSS file is imported
- **Fix**: Ensure LevelWorlds.css is in bundle

## Success Criteria

✅ All nodes unlock sequentially
✅ All themes display correctly
✅ All mini-games launch and complete properly
✅ Rewards are awarded correctly
✅ Board completion triggers celebration
✅ Next board generates with new theme
✅ State persists across page reloads
✅ Mobile responsive layout works
✅ No console errors
✅ No performance issues

## Screenshots to Take

For documentation/PR, capture:
1. Level Worlds hub with Level 1 board
2. Active node with glow effect
3. Node detail sheet open
4. Board with mix of locked/active/completed nodes
5. Board complete overlay
6. Different theme examples (forest, ocean, cosmic)
7. Campaign button on Lucky Roll
8. Mobile view (portrait)
9. Notification toast

## Reporting Issues

If you find bugs, report with:
- What you were doing
- What you expected
- What actually happened
- Browser and device info
- Console errors (if any)
- Screenshots

Example:
```
Bug: Node doesn't unlock after completion
Steps: 1) Opened Level Worlds, 2) Completed first mini-game, 3) Returned
Expected: Node 2 unlocks
Actual: Node 2 still locked
Browser: Chrome 120 on macOS
Console: No errors
```
