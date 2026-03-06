# Gamification Integration Guide

## Overview

This guide shows developers how to integrate the gamification system into various features of the LifeGoal app. The gamification system includes XP rewards, levels, achievements, streaks, and progress tracking.

## Quick Start

### 1. Import the Hook

```typescript
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
```

### 2. Use in Your Component

```typescript
function MyFeature({ session }) {
  const { earnXP, recordActivity, enabled } = useGamification(session);

  const handleAction = async () => {
    // Award XP for the action
    if (enabled) {
      await earnXP(
        XP_REWARDS.HABIT_COMPLETE,
        'habit_complete',
        habitId,
        'Completed morning meditation'
      );

      // Update streak
      await recordActivity();
    }
  };

  return <div>...</div>;
}
```

## XP Reward Reference

### Habits
- **Complete habit**: 10 XP
- **Complete habit early** (before 9am): +5 XP bonus
- **Complete all daily habits**: +25 XP bonus

### Goals
- **Reach milestone**: 50 XP
- **Reach milestone early**: +25 XP bonus
- **Complete goal**: 200 XP
- **Complete goal early**: +100 XP bonus

### Journal
- **Write entry**: 15 XP
- **Write long entry** (500+ words): +10 XP bonus

### Check-ins
- **Complete check-in**: 20 XP
- **Improve category**: +5 XP per improved category

### Vision Board
- **Add vision board item**: 10 XP
- **Add caption**: +5 XP bonus

### Streaks
- **7-day streak**: 100 XP
- **30-day streak**: 500 XP
- **100-day streak**: 1500 XP

## Example Integrations

### Habit Completion

```typescript
// In HabitTracker component
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';

export function HabitTracker({ session }) {
  const { earnXP, recordActivity } = useGamification(session);

  const completeHabit = async (habitId: string) => {
    // Mark habit as complete in database
    await markHabitComplete(habitId);

    // Award XP
    const now = new Date();
    const isEarly = now.getHours() < 9;
    const xpAmount = isEarly 
      ? XP_REWARDS.HABIT_COMPLETE + XP_REWARDS.HABIT_COMPLETE_EARLY
      : XP_REWARDS.HABIT_COMPLETE;

    await earnXP(xpAmount, 'habit_complete', habitId);
    await recordActivity(); // Update streak
  };

  return <div>...</div>;
}
```

### Goal Milestone

```typescript
// In GoalProgress component
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';

export function GoalProgress({ session, goal }) {
  const { earnXP } = useGamification(session);

  const reachMilestone = async (milestoneId: string, isEarly: boolean) => {
    // Mark milestone as reached
    await markMilestoneComplete(milestoneId);

    // Award XP
    const xpAmount = isEarly
      ? XP_REWARDS.GOAL_MILESTONE + XP_REWARDS.GOAL_MILESTONE_EARLY
      : XP_REWARDS.GOAL_MILESTONE;

    await earnXP(
      xpAmount,
      'goal_milestone',
      milestoneId,
      `Reached milestone: ${milestone.title}`
    );
  };

  return <div>...</div>;
}
```

### Journal Entry

```typescript
// In Journal component
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';

export function Journal({ session }) {
  const { earnXP } = useGamification(session);

  const saveJournalEntry = async (content: string) => {
    // Save entry to database
    const entry = await saveEntry(content);

    // Award XP
    const wordCount = content.trim().split(/\s+/).length;
    const isLong = wordCount >= 500;
    const xpAmount = isLong
      ? XP_REWARDS.JOURNAL_ENTRY + XP_REWARDS.JOURNAL_LONG_ENTRY
      : XP_REWARDS.JOURNAL_ENTRY;

    await earnXP(
      xpAmount,
      'journal_entry',
      entry.id,
      `Journal entry (${wordCount} words)`
    );
  };

  return <div>...</div>;
}
```

### Life Wheel Check-in

```typescript
// In LifeWheelCheckins component
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';

export function LifeWheelCheckins({ session }) {
  const { earnXP, recordActivity } = useGamification(session);

  const submitCheckin = async (scores: CategoryScores, previousScores: CategoryScores) => {
    // Save check-in
    const checkin = await saveCheckin(scores);

    // Calculate improvements
    const improvements = Object.keys(scores).filter(
      (category) => scores[category] > (previousScores[category] || 0)
    ).length;

    // Award XP
    const xpAmount = XP_REWARDS.CHECKIN + (improvements * XP_REWARDS.CHECKIN_IMPROVEMENT);

    await earnXP(
      xpAmount,
      'checkin',
      checkin.id,
      `Life wheel check-in (${improvements} improvements)`
    );

    await recordActivity(); // Update streak
  };

  return <div>...</div>;
}
```

## Level Progression

The level system uses an exponential curve to keep progression challenging:

```typescript
calculateXPForLevel(level) = level^1.5 * 100
```

**Example levels:**
- Level 1 → 2: 100 XP
- Level 2 → 3: 283 XP
- Level 3 → 4: 520 XP
- Level 5 → 6: 1,118 XP
- Level 10 → 11: 3,162 XP
- Level 20 → 21: 8,944 XP

## Starter Achievements

The system includes 10 starter achievements:

### Streak-Based
1. **Week Warrior** 🔥 - 7-day streak (Bronze, 100 XP)
2. **Fortnight Fighter** 💪 - 14-day streak (Bronze, 200 XP)
3. **Consistency King** 👑 - 30-day streak (Gold, 500 XP)
4. **Century Streak** 💯 - 100-day streak (Diamond, 1000 XP)

### Habit-Based
5. **Getting Started** ✅ - Complete 1 habit (Bronze, 10 XP)
6. **Habit Builder** 📋 - Complete 10 habits (Bronze, 50 XP)
7. **Consistency Pro** ⭐ - Complete 50 habits (Silver, 150 XP)
8. **Century Club** 💯 - Complete 100 habits (Silver, 300 XP)

### Goal-Based
9. **Visionary** 🎯 - Achieve 1 goal (Bronze, 50 XP)
10. **Goal Crusher** 🏆 - Achieve 5 goals (Gold, 400 XP)

## UI Components

### Displaying the Gamification Header

```typescript
// In your main app layout
import { useGamification } from './hooks/useGamification';
import { GamificationHeader } from './components/GamificationHeader';

function App() {
  const { enabled, profile, levelInfo } = useGamification(session);

  return (
    <div>
      {enabled && profile && levelInfo && (
        <GamificationHeader profile={profile} levelInfo={levelInfo} />
      )}
      {/* Rest of app */}
    </div>
  );
}
```

### Displaying Achievement Toasts

```typescript
// In your main app layout
import { AchievementToast } from './components/AchievementToast';

function App() {
  const { notifications, dismissNotification } = useGamification(session);

  return (
    <div>
      {/* App content */}
      
      {/* Achievement toasts */}
      {notifications.map((notification) => (
        <AchievementToast
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}
```

## Troubleshooting

### XP not being awarded

**Check:**
1. Is gamification enabled for the user?
2. Is the session valid?
3. Are you calling `earnXP` with the correct parameters?
4. Check browser console for errors

### Notifications not appearing

**Check:**
1. Are you subscribed to real-time updates?
2. Is Supabase mode enabled (not demo mode)?
3. Check if notifications are being dismissed too quickly

### Streak not updating

**Check:**
1. Is `recordActivity()` being called?
2. Is the user's timezone correctly set?
3. Check the `last_activity_date` in the database

### Demo mode vs Supabase mode

The system automatically detects whether to use demo mode (localStorage) or Supabase mode:
- **Demo mode**: Data stored locally, no real-time updates
- **Supabase mode**: Data stored in database, real-time updates enabled

## Future Roadmap

### Phase 2 (Coming Soon)
- Daily spin wheel for random rewards
- Power-ups (2x XP, streak freeze)
- Leaderboards
- Friend challenges

### Phase 3
- Avatar/pet system
- Social features
- Team challenges
- Achievement sharing

### Phase 4
- Seasonal events
- Limited-time achievements
- Cosmetic rewards
- Profile customization

## Best Practices

1. **Always check if gamification is enabled** before showing UI or awarding XP
2. **Use descriptive source_type and description** for XP transactions
3. **Update streaks** when users complete daily activities
4. **Keep XP amounts consistent** with the XP_REWARDS constants
5. **Test in both demo and Supabase modes**
6. **Consider mobile responsive design** when showing gamification UI

## Support

For questions or issues:
- Check this guide first
- Review the TypeScript types in `src/types/gamification.ts`
- Look at existing integrations for examples
- Test in demo mode before deploying

---

**Happy coding! 🎮**

---

## Contract System Integration

The Contract Engine 2.0 lets developers programmatically create, activate, and evaluate commitment contracts. Below is a reference for integrating with the contract system.

### TypeScript Imports

```typescript
import type {
  CommitmentContract,
  ContractType,
  ContractCadence,
  ContractStakeType,
  ContractTargetType,
  ContractStage,
  ContractTier,
  ReputationScore,
  ReputationTier,
} from '../../types/gamification';

import {
  createContract,
  activateContract,
  evaluateContract,
  fetchActiveContracts,
  fetchReputationScore,
  generateRedemptionQuest,
  completeRedemptionQuest,
  failRedemptionQuest,
  deriveContractTier,
  MAX_ACTIVE_CONTRACTS,
  type ContractInput,
} from '../../services/commitmentContracts';

import {
  checkSameContractCooldown,
  checkSacredContractLimit,
  escalationLevelToMultiplier,
  calculateReliabilityRating,
  SAME_CONTRACT_COOLDOWN_MS,
  MAX_ESCALATION_LEVEL,
  SACRED_CONTRACTS_PER_YEAR,
} from '../../lib/contractIntegrity';
```

---

### Creating a Contract Programmatically

```typescript
const input: ContractInput = {
  title: 'Run every morning',
  targetType: 'habit',
  targetId: habitId,
  cadence: 'daily',
  targetCount: 1,
  stakeType: 'gold',
  stakeAmount: 50,
  contractType: 'classic',
  graceDays: 1,
};

const { data: contract, error } = await createContract(userId, input);
if (error || !contract) {
  console.error('Failed to create contract:', error?.message);
  return;
}

// Activate immediately (deducts stake)
const { error: activateError } = await activateContract(userId, contract.id);
```

For specialised types, include the additional fields:

```typescript
// Identity contract
const identityInput: ContractInput = {
  ...baseInput,
  contractType: 'identity',
  identityStatement: 'I am someone who exercises before breakfast.',
  endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day min
};

// Future Self contract
const futureInput: ContractInput = {
  ...baseInput,
  contractType: 'future_self',
  futureMessage: 'If you are reading this, you did it. Be proud.',
};

// Narrative contract
const narrativeInput: ContractInput = {
  ...baseInput,
  contractType: 'narrative',
  narrativeTheme: 'warrior',
};

// Sacred contract
const sacredInput: ContractInput = {
  ...baseInput,
  contractType: 'sacred',
  isSacred: true,
  stakeAmount: 300, // Always Legendary/Sacred tier
};

// Multi-Stage contract
const multiStageInput: ContractInput = {
  ...baseInput,
  contractType: 'multi_stage',
  stages: [
    { id: 'stage_1', title: 'Foundation', description: 'Get started', targetCount: 7, sealEmoji: '🏁', completed: false, completedAt: null },
    { id: 'stage_2', title: 'Momentum', description: 'Build consistency', targetCount: 14, sealEmoji: '🌟', completed: false, completedAt: null },
    { id: 'stage_3', title: 'Mastery', description: 'Solidify the habit', targetCount: 30, sealEmoji: '🏆', completed: false, completedAt: null },
  ],
};
```

---

### Evaluating a Contract

Evaluation is normally handled by the server-side cron sweep, but can also be triggered client-side:

```typescript
const { data: evaluation, error } = await evaluateContract(userId, contract.id);
if (evaluation?.result === 'success') {
  console.log('Contract window completed!');
} else if (evaluation?.result === 'miss') {
  console.log('Window missed. Stakes forfeited.');
}
```

---

### Reading Reputation Scores

```typescript
const { data: reputation, error } = await fetchReputationScore(userId);
if (reputation) {
  console.log(`Reliability: ${(reputation.reliabilityRating * 100).toFixed(1)}%`);
  console.log(`Tier: ${reputation.reliabilityTier}`); // e.g. 'dependable'
}
```

---

### Contract Types Reference

| Type | `contractType` value | When to use |
|------|---------------------|-------------|
| Classic | `'classic'` | Simple stake on a habit/goal. Default choice. |
| Identity | `'identity'` | Long-term identity transformation (≥30 days). |
| Escalation | `'escalation'` | High-accountability habit where growing stakes motivate recovery. |
| Redemption | `'redemption'` | Forgiving format — miss triggers a quest instead of forfeit. |
| Reputation | `'reputation'` | User wants to build their public reliability track record explicitly. |
| Reverse | `'reverse'` | Breaking a bad habit or avoidance goal. |
| Multi-Stage | `'multi_stage'` | Large project broken into checkpoints. |
| Future Self | `'future_self'` | Deeply personal emotional stakes (sealed letter). |
| Narrative | `'narrative'` | Gamification-heavy users who enjoy RPG themes. |
| Sacred | `'sacred'` | Maximum commitment ceremonies. Reserve for rare, major life goals. |
| Cascading | `'cascading'` | Sequential habit chains where order matters. |

---

### Checking Integrity Constraints

Always validate before allowing contract creation:

```typescript
import { checkSameContractCooldown, checkSacredContractLimit } from '../../lib/contractIntegrity';

// 48-hour cooldown check
const cooldown = checkSameContractCooldown(existingContracts, 'classic', targetHabitId);
if (!cooldown.allowed) {
  showError(`Too soon. You can create this contract again after ${cooldown.availableAt}.`);
  return;
}

// Sacred yearly limit
const reputation = await fetchReputationScore(userId);
const sacredCheck = checkSacredContractLimit(reputation.data!);
if (!sacredCheck.allowed) {
  showError(`You have already used both Sacred contracts this year.`);
  return;
}
```

---

### Configuration Constants

```typescript
import { MAX_ACTIVE_CONTRACTS } from '../../services/commitmentContracts';
import {
  SAME_CONTRACT_COOLDOWN_MS,
  MAX_ESCALATION_LEVEL,
  SACRED_CONTRACTS_PER_YEAR,
} from '../../lib/contractIntegrity';

// MAX_ACTIVE_CONTRACTS = 3
// SAME_CONTRACT_COOLDOWN_MS = 172_800_000 (48 h)
// MAX_ESCALATION_LEVEL = 4
// SACRED_CONTRACTS_PER_YEAR = 2
```

---

### Further Reading

See `docs/CONTRACT_ENGINE.md` for the full technical reference including all contract type evaluation rules, the reputation system, database schema, and known limitations.
