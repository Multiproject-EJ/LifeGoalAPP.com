// Types for the new daily spin wheel feature

export type SpinWheelPrizeType = 
  | 'EMPTY' 
  | 'CASH' 
  | 'XP' 
  | 'FEATURE_UNLOCK' 
  | 'TASK_BONUS' 
  | 'GAME_LIVES';

export interface SpinWheelPrize {
  id: string;
  name: string;
  type: SpinWheelPrizeType;
  value: number;
  icon: string;
  color: string;
  probability: number;
}

// Prize configuration based on user's sketch
export const DAILY_SPIN_PRIZES: SpinWheelPrize[] = [
  {
    id: 'empty',
    name: 'Better luck tomorrow!',
    type: 'EMPTY',
    value: 0,
    icon: '😔',
    color: '#6b7280',
    probability: 30,
  },
  {
    id: 'xp_50',
    name: '50 XP',
    type: 'XP',
    value: 50,
    icon: '✨',
    color: '#8b5cf6',
    probability: 25,
  },
  {
    id: 'cash_8m',
    name: '8 Million Cash',
    type: 'CASH',
    value: 8000000,
    icon: '💰',
    color: '#f59e0b',
    probability: 2,
  },
  {
    id: 'cash_2_8m',
    name: '2.8 Million Cash',
    type: 'CASH',
    value: 2800000,
    icon: '💵',
    color: '#10b981',
    probability: 8,
  },
  {
    id: 'minigym',
    name: 'Mini Gym Access',
    type: 'FEATURE_UNLOCK',
    value: 1,
    icon: '🏋️',
    color: '#ef4444',
    probability: 5,
  },
  {
    id: 'task_bonus',
    name: 'Task Bonus',
    type: 'TASK_BONUS',
    value: 1,
    icon: '🎯',
    color: '#3b82f6',
    probability: 10,
  },
  {
    id: 'game_8',
    name: '8 Game Lives',
    type: 'GAME_LIVES',
    value: 8,
    icon: '❤️',
    color: '#ec4899',
    probability: 20,
  },
];

// Database record types
export interface DailySpinRecord {
  id: string;
  user_id: string;
  spin_date: string; // DATE format YYYY-MM-DD
  prize_id: string;
  prize_type: string;
  prize_value: number;
  claimed: boolean;
  created_at: string;
}

export interface SpinAvailability {
  available: boolean;
  lastSpinDate: string | null;
  todaysSpin: DailySpinRecord | null;
}
