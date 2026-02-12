# Training/Exercise Feature - Complete Implementation

## Overview

A mobile-first Training/Exercise tracking feature that enables users to quickly log workouts and track progress toward strategy-based fitness goals. Built with React 18, TypeScript, and Supabase.

## Features

### Quick Exercise Logging
- **Fast input**: 2-3 taps to log a workout
- **Autocomplete**: 30 common exercises with smart muscle group suggestions
- **Flexible tracking**: Log reps, sets, weight, duration, and notes
- **Muscle groups**: Track 11 muscle groups (chest, back, shoulders, biceps, triceps, legs, glutes, core, cardio, flexibility, other)

### 10 Strategy Types

1. **Weekly Target**: Hit a rep/set target each week (e.g., 100 push-ups/week)
2. **Monthly Target**: Achieve a monthly goal (e.g., 2,000 squats/month)
3. **Rolling Window**: Track progress over last N days
4. **Duration Goal**: Track active minutes instead of reps
5. **Focus Muscle**: Target specific muscle groups (e.g., shoulders + glutes for 30 days)
6. **Workout Streak**: Maintain consistent workout days per week
7. **Exercise Variety**: Try different exercise types each week
8. **Progressive Load**: Increase total weight lifted weekly
9. **Daily Micro Goal**: Small daily targets (e.g., 20 squats/day)
10. **Recovery Sessions**: Track mobility and recovery work

### Progress Tracking
- **Real-time status**: On Track / At Risk / Unreachable
- **Smart forecasting**: Calculates if current pace will reach the goal
- **Visual progress**: Progress bars with color-coded status
- **Daily breakdown**: See activity patterns and trends
- **Today's summary**: Total exercises, reps, and duration

## Component Architecture

```
src/features/training/
├── index.ts                  # Main export
├── types.ts                  # TypeScript interfaces
├── constants.ts              # Muscle groups, exercises, strategy types
├── strategyEngine.ts         # Progress calculation logic
├── trainingService.ts        # Supabase CRUD operations
├── useTraining.ts            # React hook for state management
├── TrainingTab.tsx           # Main tab component
├── QuickLogModal.tsx         # Quick log interface
├── StrategyCard.tsx          # Strategy progress card
├── StrategySetupWizard.tsx   # Multi-step strategy creation
├── StrategyDetail.tsx        # Detailed strategy view
└── training.css              # Feature-specific styles
```

## Database Schema

### `exercise_logs` Table
- `id`, `user_id`, `exercise_name`
- `muscle_groups` (array), `reps`, `sets`, `weight_kg`, `duration_minutes`
- `notes`, `logged_at`, `created_at`

### `training_strategies` Table
- `id`, `user_id`, `name`, `strategy_type`
- `exercise_name`, `target_value`, `target_unit`, `time_window_days`
- `focus_muscles` (array), `is_active`, `created_at`

Both tables have RLS policies ensuring users can only access their own data.

## Usage

### Import the component
```tsx
import TrainingTab from './features/training';

// Use in your app
<TrainingTab />
```

### Using the hook directly
```tsx
import { useTraining } from './features/training';

function MyComponent() {
  const {
    logs,
    strategies,
    strategyProgress,
    todaySummary,
    addLog,
    addStrategy,
    loading
  } = useTraining();

  // Your component logic
}
```

## Strategy Engine

The `strategyEngine.ts` module contains pure functions that calculate progress for each strategy type:

```typescript
calculateProgress(strategy, logs) → {
  current: number,
  target: number,
  percentage: number,
  status: 'on_track' | 'at_risk' | 'unreachable',
  forecastMessage: string
}
```

**Status logic:**
- **On Track**: Pace ≥ 100% of expected progress
- **At Risk**: Pace between 50-99% of expected
- **Unreachable**: Pace < 50% of expected

## Design System

Uses the existing glassmorphic design system with:
- `card glass` - Glassmorphic cards
- `btn btn--primary` / `btn btn--ghost` - Buttons
- `badge badge--success/warn/error` - Status badges
- `modal` - Modal overlays
- CSS variables: `--accent`, `--success`, `--warn`, `--error`, `--surface`, `--text`

## Mobile-First Design
- **Touch targets**: Minimum 44px for all interactive elements
- **Single column**: Mobile layout, 2 columns on tablet+
- **Large buttons**: Primary action button is large and sticky
- **Quick actions**: Minimal taps to complete common tasks
- **Autocomplete**: Reduce typing with smart suggestions

## Future Enhancements
- AI suggestions for strategy adjustments
- Import from wearable data
- Social/competition mode
- Adaptive goal tuning based on performance
- Exercise form videos and tips
- Custom exercise creation
- Workout templates and programs
