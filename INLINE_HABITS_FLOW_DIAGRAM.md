# User Flow Diagram: Inline Habits Submenu

## Before Implementation
```
User on Dashboard
    ↓
Click ✅ Button
    ↓
Navigate to "Today's Habits & Routines" Page
    ↓
Check off habits
    ↓
Navigate back to Dashboard
```

## After Implementation
```
User on Dashboard
    ↓
Click ✅ Button
    ↓
Inline Submenu Appears
    ├─ Loading State (while fetching)
    │   └─ Shows spinner (⏳)
    │
    ├─ Empty State (no habits)
    │   └─ Shows helpful message
    │
    └─ Populated State (has habits)
        ├─ Habit 1 [☐/✅] + Name
        ├─ Habit 2 [☐/✅] + Name
        └─ Habit N [☐/✅] + Name
    ↓
User clicks habit checkbox
    ↓
Optimistic UI update (immediate feedback)
    ↓
Database sync (background)
    ↓
Click outside submenu to close
    ↓
Still on Dashboard (no navigation!)
```

## Component Architecture

```
QuickActionsFAB
│
├─ Main FAB Button (✨)
│   └─ onClick: toggles menu open/close
│
├─ Action Buttons (fan out when open)
│   ├─ Check Habit Button (✅)
│   │   └─ onClick: toggles habits submenu
│   │       └─ Habits Submenu
│   │           ├─ Loading State
│   │           ├─ Empty State
│   │           └─ Habits List
│   │               └─ Habit Items
│   │                   ├─ Checkbox (☐/✅/⏳)
│   │                   └─ Name
│   │
│   ├─ Journal Button (📔)
│   │   └─ onClick: toggles journal types submenu
│   │       └─ Journal Types Submenu
│   │
│   └─ Life Coach Button (🤖)
│       └─ onClick: opens Life Coach modal
│
└─ Life Coach Modal
```

## State Flow

```
Initial State
    ↓
isOpen: false
showHabitsSubmenu: false
habits: []
loadingHabits: false
    ↓
User clicks Main FAB (✨)
    ↓
isOpen: true (actions fan out)
    ↓
User clicks Check Habit (✅)
    ↓
showHabitsSubmenu: true
loadingHabits: true (if first time)
    ↓
loadHabits() called
    ├─ fetchHabitsForUser()
    └─ fetchHabitLogsForRange()
    ↓
habits: [...loaded habits]
habitCompletions: {...completion states}
loadingHabits: false
    ↓
User clicks habit item
    ↓
savingHabitId: habitId
    ↓
toggleHabitCompletion(habitId)
    ├─ Optimistic UI update
    ├─ logHabitCompletion() or clearHabitCompletion()
    └─ Update habitCompletions state
    ↓
savingHabitId: null
    ↓
User clicks outside
    ↓
isOpen: false
showHabitsSubmenu: false
```

## API Integration

```
QuickActionsFAB Component
    ↓
Uses Legacy Habits Adapter
    ↓
legacyHabitsAdapter.ts
    ├─ fetchHabitsForUser(userId)
    │   └─ Returns: habits with goal info
    │
    ├─ fetchHabitLogsForRange(habitIds, startDate, endDate)
    │   └─ Returns: completion logs
    │
    ├─ logHabitCompletion({ habit_id, date, completed })
    │   └─ Creates completion record
    │
    └─ clearHabitCompletion(habitId, date)
        └─ Deletes completion record
    ↓
Internally delegates to
    ↓
habitsV2.ts (new habits table)
    ├─ habits_v2 table
    └─ habit_logs_v2 table
```

## CSS Class Structure

```
.quick-actions-fab
    ├─ .quick-actions-fab__main (main button)
    ├─ .quick-actions-fab__actions (action buttons container)
    │   └─ .quick-actions-fab__action
    │       ├─ .quick-actions-fab__action-btn
    │       ├─ .quick-actions-fab__action-label
    │       └─ .quick-actions-fab__submenu
    │           └─ .quick-actions-fab__submenu--habits
    │               ├─ .quick-actions-fab__submenu-title
    │               ├─ .quick-actions-fab__submenu-loading
    │               ├─ .quick-actions-fab__submenu-empty
    │               └─ .quick-actions-fab__submenu-habits
    │                   └─ .quick-actions-fab__habit-item
    │                       ├─ .quick-actions-fab__habit-item--completed
    │                       ├─ .quick-actions-fab__habit-checkbox
    │                       └─ .quick-actions-fab__habit-name
    └─ .life-coach-modal
```

## Animation Timeline

```
Click ✅ Button
    ↓
submenu opacity: 0 → 1 (200ms)
submenu translateX: 10px → 0 (200ms)
    ↓
Habits appear with staggered animation
    ↓
Hover over habit
    ↓
border-color: transparent → primary (200ms)
transform: translateX(0) → translateX(-2px) (200ms)
    ↓
Click habit checkbox
    ↓
checkbox: ☐ → ⏳ (immediate)
background: default → saving (immediate)
    ↓
Save completes
    ↓
checkbox: ⏳ → ✅ (immediate)
background: saving → completed gradient (200ms)
```

## Error Handling

```
API Call Fails
    ↓
catch block in loadHabits() or toggleHabitCompletion()
    ↓
console.error() (logged for debugging)
    ↓
User sees:
    ├─ Loading state ends
    ├─ Previous state restored
    └─ No visual error (graceful degradation)
```

## Browser Compatibility

```
Supported Features:
✅ CSS Variables
✅ CSS Grid
✅ Flexbox
✅ CSS Animations
✅ Backdrop Blur
✅ Async/Await
✅ ES6+ JavaScript
```

## Performance Considerations

```
Optimization Strategies:
✅ Lazy loading (habits loaded on-demand)
✅ Duplicate call prevention
✅ Optimistic UI updates
✅ Efficient re-renders (proper state updates)
✅ CSS transitions (GPU-accelerated)
✅ Minimal DOM manipulation
```
