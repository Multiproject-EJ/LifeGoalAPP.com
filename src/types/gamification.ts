// TypeScript types for the gamification system

// =====================================================
// DATABASE ROW TYPES
// =====================================================

export interface GamificationProfile {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  lives: number;
  max_lives: number;
  last_life_refill: string | null;
  streak_freezes: number;
  total_points: number;
  gamification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  category: 'streak' | 'habit' | 'goal' | 'journal' | 'general';
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  xp_amount: number;
  source_type: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export interface GamificationNotification {
  id: string;
  user_id: string;
  notification_type: 'level_up' | 'achievement_unlock' | 'streak_milestone' | 'life_refill';
  title: string;
  message: string;
  icon: string | null;
  xp_reward: number | null;
  achievement_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// =====================================================
// XP REWARDS CONSTANTS
// =====================================================

export const XP_REWARDS = {
  // Habit completion rewards
  HABIT_COMPLETE: 10,
  HABIT_COMPLETE_EARLY: 15, // Total XP if completed before 9am
  ALL_DAILY_HABITS: 25, // Bonus for completing all daily habits
  YESTERDAY_RECAP_COLLECT: 50, // Bonus for collecting a missed-day recap

  // Goal rewards
  GOAL_MILESTONE: 50,
  GOAL_MILESTONE_EARLY: 25, // Bonus if ahead of schedule
  GOAL_COMPLETE: 200,
  GOAL_COMPLETE_EARLY: 100, // Bonus if completed early
  
  // Journal rewards
  JOURNAL_ENTRY: 15,
  JOURNAL_LONG_ENTRY: 10, // Bonus for 500+ words
  
  // Check-in rewards
  CHECKIN: 20,
  CHECKIN_IMPROVEMENT: 5, // Per improved category
  
  // Vision board rewards
  VISION_BOARD: 10,
  VISION_BOARD_CAPTION: 5, // Bonus with caption
  VISION_BOARD_STAR: 5,
  
  // Streak milestone rewards
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  STREAK_100_DAYS: 1500,

  // Balance rewards
  BALANCE_WEEK: 75,

  // Rationality rewards
  RATIONALITY_CHECKIN: 20,
  RATIONALITY_STREAK: 10,

  // Micro-quest rewards
  MICRO_QUEST: 25,
  MICRO_QUEST_BONUS: 50,
} as const;

// =====================================================
// TIER COLORS AND LABELS
// =====================================================

export const TIER_COLORS = {
  bronze: {
    border: '#CD7F32',
    background: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
    glow: 'rgba(205, 127, 50, 0.3)',
  },
  silver: {
    border: '#C0C0C0',
    background: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    glow: 'rgba(192, 192, 192, 0.3)',
  },
  gold: {
    border: '#FFD700',
    background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
    glow: 'rgba(255, 215, 0, 0.3)',
  },
  diamond: {
    border: '#B9F2FF',
    background: 'linear-gradient(135deg, #B9F2FF 0%, #81D4FA 100%)',
    glow: 'rgba(185, 242, 255, 0.3)',
  },
} as const;

export const TIER_LABELS = {
  bronze: '🥉 Bronze',
  silver: '🥈 Silver',
  gold: '🥇 Gold',
  diamond: '💎 Diamond',
} as const;

// =====================================================
// LEVEL CALCULATION TYPES
// =====================================================

export interface LevelInfo {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number; // XP earned in current level
  progressPercentage: number; // Percentage to next level (0-100)
}

// =====================================================
// RESULT TYPES
// =====================================================

export interface AwardXPResult {
  success: boolean;
  xpAwarded: number;
  newTotalXP: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  achievementsUnlocked: Achievement[];
  error?: string;
}

export interface UpdateStreakResult {
  success: boolean;
  currentStreak: number;
  longestStreak: number;
  streakMilestoneReached: boolean;
  xpAwarded: number;
  error?: string;
}

// =====================================================
// ACHIEVEMENT TYPES
// =====================================================

export interface AchievementWithProgress extends Achievement {
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
  progressPercent?: number; // Optional: Percentage of progress (0-100)
}

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type RequirementType = 
  | 'streak' 
  | 'habits_completed' 
  | 'goals_achieved'
  | 'journal_entries'
  | 'journal_long_entries'
  | 'checkins_completed'
  | 'vision_uploads'
  | 'spins_used'
  | 'mystery_wins'
  | 'powerups_purchased'
  | 'triple_boost_used'
  | 'mystery_chests'
  | 'challenge_won';

export type XPSource =
  | 'habit_complete'
  | 'goal_achieve'
  | 'goal_milestone'
  | 'streak_milestone'
  | 'journal_entry'
  | 'checkin_complete'
  | 'vision_board_upload'
  | 'achievement'
  | 'challenge_complete'
  | 'daily_login'
  | 'balance_week';

// =====================================================
// DEMO MODE TYPES
// =====================================================

export interface DemoGamificationProfile {
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  lives: number;
  streak_freezes: number;
  total_points: number;
  gamification_enabled: boolean;
}

export const DEMO_PROFILE_KEY = 'lifegoal_demo_gamification_profile';
export const DEMO_ENABLED_KEY = 'lifegoal_demo_gamification_enabled';
export const DEMO_TRANSACTIONS_KEY = 'lifegoal_demo_xp_transactions';
export const DEMO_ACHIEVEMENTS_KEY = 'lifegoal_demo_user_achievements';

// =====================================================
// DAILY SPIN WHEEL TYPES
// =====================================================

// Daily Spin types
export type PrizeType = 'xp' | 'points' | 'streak_freeze' | 'life' | 'mystery';

export interface DailySpinState {
  userId: string;
  lastSpinDate: string | null;
  spinsAvailable: number;
  totalSpinsUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpinHistoryEntry {
  id: string;
  userId: string;
  prizeType: PrizeType;
  prizeValue: number;
  prizeDetails: Record<string, unknown>;
  spunAt: string;
}

export interface SpinPrize {
  type: PrizeType;
  value: number;
  label: string;
  icon: string;
  details?: Record<string, unknown>;
}

export interface SpinResult {
  prize: SpinPrize;
  spinsRemaining: number;
}

// Prize configuration
export const SPIN_PRIZES: SpinPrize[] = [
  { type: 'xp', value: 50, label: '50 XP', icon: '💰' },
  { type: 'xp', value: 100, label: '100 XP', icon: '💰' },
  { type: 'xp', value: 200, label: '200 XP', icon: '💰' },
  { type: 'points', value: 25, label: '25 Points', icon: '💎' },
  { type: 'points', value: 50, label: '50 Points', icon: '💎' },
  { type: 'streak_freeze', value: 1, label: 'Streak Freeze', icon: '🛡️' },
  { type: 'life', value: 1, label: 'Extra Life', icon: '❤️' },
  { type: 'mystery', value: 0, label: 'Mystery Box', icon: '🎁' },
];

// Weighted prize probabilities (must sum to 100)
export const PRIZE_WEIGHTS: Record<number, number> = {
  0: 30,  // 50 XP - 30%
  1: 25,  // 100 XP - 25%
  2: 10,  // 200 XP - 10%
  3: 20,  // 25 Points - 20%
  4: 8,   // 50 Points - 8%
  5: 4,   // Streak Freeze - 4%
  6: 2,   // Extra Life - 2%
  7: 1,   // Mystery - 1%
};

// =====================================================
// POWER-UPS STORE TYPES
// =====================================================

// Power-up types
export type PowerUpEffectType = 
  | 'xp_multiplier' 
  | 'streak_freeze' 
  | 'instant_xp' 
  | 'extra_life' 
  | 'spin_token' 
  | 'mystery';

export interface PowerUp {
  id: string;
  powerUpKey: string;
  name: string;
  description: string;
  icon: string;
  costPoints: number;
  effectType: PowerUpEffectType;
  effectValue: number;
  durationMinutes: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface UserPowerUp {
  id: string;
  userId: string;
  powerUpId: string;
  purchasedAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  isConsumed: boolean;
  createdAt: string;
  powerUp?: PowerUp; // Joined data
}

export interface PowerUpTransaction {
  id: string;
  userId: string;
  powerUpId: string;
  action: 'purchase' | 'activate' | 'expire' | 'consume';
  pointsSpent: number;
  createdAt: string;
}

export interface PurchaseResult {
  success: boolean;
  userPowerUp?: UserPowerUp;
  newPointsBalance: number;
  effectApplied?: string; // Description of what happened
}

export interface ActiveBoost {
  id: string;
  name: string;
  icon: string;
  effectType: PowerUpEffectType;
  effectValue: number;
  expiresAt: string | null;
  minutesRemaining: number | null;
}
