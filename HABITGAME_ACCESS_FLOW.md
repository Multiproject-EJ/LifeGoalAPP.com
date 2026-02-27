# HabitGame Core Games — User Access Flow

> ⚠️ **Status update (2026-02-27):** This file contains legacy Lucky Roll-first flow details.
> Canonical gameplay flow now lives in:
> **[`docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md`](./docs/MAIN_GAME_SINGLE_SOURCE_OF_TRUTH.md)**.

## Overview

This document explains how users access and navigate the 5-game HabitGame system integrated into the Daily Treats feature.

---

## Access Point: Daily Treats Menu

### Location
Users access Daily Treats through multiple entry points:
- **Mobile**: Bottom navigation → 🍬 Daily Treats button
- **Desktop**: Top navigation → Score/Gamification tab → Daily Treats section
- **Quick Access**: Gamification overlay → "Daily Treats" stat button

### The 3-Card System

When users open Daily Treats, they see **3 interactive cards**:

```
┌─────────────────────────────────────────────────┐
│         DAILY TREATS MENU (3 Cards)             │
├─────────────┬─────────────────┬─────────────────┤
│   CARD 1    │    CARD 2       │    CARD 3       │
│  Spin Wheel │  Hearts/League  │    Calendar     │
│     🎰      │      ❤️         │      📅        │
│   [SPIN]    │    [PLAY]       │    [OPEN]       │
└─────────────┴─────────────────┴─────────────────┘
```

#### Card 1: Spin Wheel (Left)
- **Status**: ✅ Fully implemented
- **Action**: Opens daily spin wheel for random rewards
- **Frequency**: 1 spin per day
- **Current behavior**: Working as expected

#### Card 2: Hearts/League (Middle) ⭐ **THIS IS WHERE GAMES LIVE**
- **Status**: 🚧 Placeholder → Will become Lucky Roll in Phase 1
- **Action**: Currently shows "League Game - Challenge mode is loading" placeholder
- **Future**: Opens Lucky Roll board game (hub for all 5 games)
- **Frequency**: Multiple times per day (spend dice to play)

#### Card 3: Calendar (Right)
- **Status**: ✅ Implemented
- **Action**: Opens countdown calendar with daily hatches
- **Frequency**: 1 hatch per day
- **Current behavior**: Working as expected

---

## Game Access Flow (Phase 1+)

### Step 1: Earn Hearts
Users earn hearts (❤️) from:
- Daily Treats first-visit reward
- Completing habits
- Unlocking achievements

### Step 2: Purchase Dice Packs
```
Daily Treats → Middle Card (❤️) → Dice Pack Shop
```

Users spend hearts to buy dice packs:
- **Starter Pack**: 2❤️ → 15🎲 + 4🎟️
- **Value Pack**: 4❤️ → 35🎲 + 10🎟️
- **Power Pack**: 6❤️ → 50🎲 + 18🎟️
- **Mystery Box**: 3❤️ → 5-750🎲 + 1-500🎟️ (random with pity timer)

### Step 3: Play Lucky Roll
```
Daily Treats → Middle Card → Lucky Roll Board
```

- Spend 1 dice (🎲) per roll
- Move on 30-tile board
- Land on different tile types (coins, bonuses, mini-game triggers)

### Step 4: Access Mini-Games
```
Lucky Roll → Land on Special Tiles → Mini-Games
```

Mini-games are triggered by landing on specific Lucky Roll tiles:
- **Tile 7 & 22**: Task Tower (requires 1🎟️)
- **Tile 12 & 27**: Pomodoro Sprint (requires 1🎟️)
- **Tile 15**: Vision Quest (free, passive bonuses)
- **Tile 20**: Wheel of Wins (requires 1🎟️)

---

## Navigation Hierarchy

```
App Home
  └─ Daily Treats Button (🍬)
      └─ Daily Treats Menu (3 cards)
          ├─ Card 1: Spin Wheel → Daily spin rewards
          │
          ├─ Card 2: Hearts/League → [GAME SYSTEM ENTRY]
          │   └─ Lucky Roll (Phase 1)
          │       ├─ Dice Pack Shop (spend hearts)
          │       ├─ Board Game (spend dice)
          │       └─ Mini-Game Triggers
          │           ├─ Task Tower (🗼 tiles 7, 22)
          │           ├─ Pomodoro Sprint (🍅 tiles 12, 27)
          │           ├─ Vision Quest (🔮 tile 15)
          │           └─ Wheel of Wins (🎡 tile 20)
          │
          └─ Card 3: Calendar → Countdown calendar
```

---

## Current Implementation Status

### ✅ Phase 0 — Complete
- [x] Shared infrastructure (services, types, economy)
- [x] Currency system (hearts, dice, game tokens)
- [x] Dice pack definitions
- [x] Mystery box with pity timer
- [x] Event logging scaffold

### 🚧 Phase 1 — Next Up (Lucky Roll Core)
- [ ] Replace league placeholder with Lucky Roll entry
- [ ] Dice pack shop UI
- [ ] 30-tile board prototype
- [ ] Dice roll mechanics
- [ ] Basic tile effects

### 🔮 Future Phases
- Phase 2: Lucky Roll tile effects & mini-game triggers
- Phase 3: Task Tower implementation
- Phase 4: Pomodoro Sprint implementation
- Phase 5: Vision Quest implementation
- Phase 6: Wheel of Wins implementation

---

## Code References

### Entry Point (Current)
**File**: `src/App.tsx`  
**Lines**: 2968-2993

```typescript
// Middle card (hearts) - currently opens league placeholder
<button
  onClick={() => {
    setShowDailyTreatsMenu(false);
    setShowLeaguePlaceholder(true); // ← Will become setShowLuckyRoll(true)
  }}
>
  <img src={dailyTreatsHearts} alt="" />
  <span>{dailyTreatsInventory.heartsRemaining}</span>
</button>
```

### Placeholder Modal (To Replace)
**File**: `src/App.tsx`  
**Lines**: 3120-3151

```typescript
// This entire modal will be replaced with Lucky Roll in Phase 1
const leaguePlaceholderModal = showLeaguePlaceholder ? (
  <div className="daily-treats-placeholder">
    <p>League Game</p>
    <h3>Challenge mode is loading</h3>
  </div>
) : null;
```

---

## User Journey Example

### First-Time User
1. **Complete onboarding** → Earn 2 hearts from achievements
2. **Open Daily Treats** → See 3 cards with indicators
3. **Click middle card (hearts)** → See dice pack shop
4. **Purchase Starter Pack** (2❤️) → Receive 15🎲 + 4🎟️
5. **Click "Roll Dice"** → Move on Lucky Roll board
6. **Land on tile 15** → Enter Vision Quest (free)
7. **Continue rolling** → Eventually land on tile 7
8. **Spend 1🎟️** → Play Task Tower mini-game
9. **Complete tower** → Earn coins and XP
10. **Return to board** → Continue with remaining dice

### Daily Player Loop
1. **Morning**: Complete 3 habits → Earn 3 hearts
2. **Open Daily Treats**: Spin wheel (card 1) → Earn bonus hearts
3. **Buy dice pack** (card 2 middle) → Get dice for session
4. **Play Lucky Roll** → Move through board, trigger mini-games
5. **Lunch break**: Open Pomodoro Sprint tile → 25-min focus session
6. **Evening**: Finish remaining dice → Plan next session

---

## Design Philosophy

### Why This Flow?

1. **Hearts as master currency**: Creates meaningful decision-making
2. **Dice as consumable**: Encourages session-based play
3. **Lucky Roll as hub**: Single navigation point, no feature bloat
4. **Mini-games as rewards**: Earned through gameplay, not direct access
5. **No parallel menus**: Everything flows through Daily Treats → Lucky Roll

### Constitutional Rules
- Users NEVER access mini-games directly from main menu
- Lucky Roll is the ONLY board (no separate game boards)
- Hearts inventory is visible but dice/tokens are "in-session"
- All games respect the reward hierarchy (meaning > excitement)

---

## FAQ

### Q: Can users access Task Tower directly?
**A**: No. Users must play Lucky Roll and land on tiles 7 or 22 to access Task Tower.

### Q: What happens if users run out of dice mid-session?
**A**: They can purchase more dice packs with hearts, or exit and return later.

### Q: Do hearts expire?
**A**: No. Hearts persist and can be saved for future sessions.

### Q: Can users play mini-games without Lucky Roll?
**A**: Vision Quest is an exception—it provides passive bonuses and can be accessed for reflection, but the best way to engage with it is still through Lucky Roll tile 15.

### Q: How many times per day can users play?
**A**: Unlimited, as long as they have dice. Typical session: 15-50 rolls depending on pack size.

### Q: Will there be a direct "Games" menu?
**A**: No. The design intentionally keeps games as a reward within the Daily Treats → Lucky Roll flow to maintain engagement and avoid overwhelming users with too many top-level navigation options.

---

## Summary

**Access Pattern**: Daily Treats (🍬) → Middle Card (❤️) → Lucky Roll (🎲) → Mini-Games (🎟️)

**Current Status**: Middle card shows placeholder. Phase 1 will replace it with Lucky Roll.

**Key Principle**: All games flow through Lucky Roll. No direct access from main menu.
