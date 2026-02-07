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
  freeze_bank_capacity: number;
  total_points: number;
  zen_tokens?: number;
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

export interface ZenTokenTransaction {
  id: string;
  user_id: string;
  token_amount: number;
  action: 'earn' | 'spend';
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

export interface TrophyItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trophy' | 'plaque' | 'medal';
  costDiamonds: number;
  requiredTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export interface UserTrophy {
  id: string;
  userId: string;
  trophyId: string;
  purchasedAt: string;
  trophy: TrophyItem;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  costGold: number;
  createdAt: string;
  redemptionCount: number;
  lastRedeemedAt: string | null;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  costGold: number;
  redeemedAt: string;
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
  INTENTIONS_MET: 5, // Completing today's intention from yesterday's note
  
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

  // Meditation rewards
  MEDITATION_SESSION: 15, // Per meditation session
  MEDITATION_LONG_SESSION: 10, // Bonus for 10+ minutes
  BREATHING_SESSION: 10, // Per breathing session
  BODY_SESSION: 10, // Per body practice session
  MEDITATION_GOAL_DAY: 20, // Per day completed towards goal
  MEDITATION_GOAL_COMPLETE: 100, // Completing a meditation goal
  DAILY_CHALLENGE_COMPLETE: 50, // Completing daily challenge
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
  | 'balance_week'
  | 'meditation_session'
  | 'breathing_session'
  | 'body_session'
  | 'meditation_goal_complete'
  | 'daily_challenge'
  | 'profile_strength_improvement'
  | 'profile_strength_bonus';

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
  max_lives: number;
  streak_freezes: number;
  freeze_bank_capacity: number;
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
export type PrizeType = 'gold' | 'treasure_chest';

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
  wheelSize?: 'small' | 'medium' | 'large';
  wheelWeight?: number;
}

export interface SpinResult {
  prize: SpinPrize;
  spinsRemaining: number;
}

// Prize configuration
export const SPIN_PRIZES: SpinPrize[] = [
  { type: 'gold', value: 10, label: '10 Gold', icon: '🪙', wheelSize: 'small', wheelWeight: 1 },
  { type: 'gold', value: 20, label: '20 Gold', icon: '🪙', wheelSize: 'small', wheelWeight: 1 },
  { type: 'gold', value: 30, label: '30 Gold', icon: '🪙', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'gold', value: 40, label: '40 Gold', icon: '🪙', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'gold', value: 50, label: '50 Gold', icon: '🪙', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'gold', value: 60, label: '60 Gold', icon: '🪙', wheelSize: 'large', wheelWeight: 3 },
  { type: 'gold', value: 75, label: '75 Gold', icon: '🪙', wheelSize: 'large', wheelWeight: 3 },
  { type: 'gold', value: 90, label: '90 Gold', icon: '🪙', wheelSize: 'large', wheelWeight: 3 },
  { type: 'treasure_chest', value: 50, label: 'Small Treasury Chest (50)', icon: '🧰', wheelSize: 'small', wheelWeight: 1 },
  { type: 'treasure_chest', value: 80, label: 'Small Treasury Chest (80)', icon: '🧰', wheelSize: 'small', wheelWeight: 1 },
  { type: 'treasure_chest', value: 120, label: 'Medium Treasury Chest (120)', icon: '🧰', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'treasure_chest', value: 150, label: 'Medium Treasury Chest (150)', icon: '🧰', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'treasure_chest', value: 180, label: 'Medium Treasury Chest (180)', icon: '🧰', wheelSize: 'medium', wheelWeight: 2 },
  { type: 'treasure_chest', value: 220, label: 'Large Treasury Chest (220)', icon: '🧰', wheelSize: 'large', wheelWeight: 3 },
  { type: 'treasure_chest', value: 260, label: 'Large Treasury Chest (260)', icon: '🧰', wheelSize: 'large', wheelWeight: 3 },
  { type: 'treasure_chest', value: 320, label: 'Large Treasury Chest (320)', icon: '🧰', wheelSize: 'large', wheelWeight: 3 },
];

// Weighted prize probabilities (must sum to 100)
export const PRIZE_WEIGHTS: Record<number, number> = {
  0: 6,  // 10 Gold
  1: 6,  // 20 Gold
  2: 8,  // 30 Gold
  3: 8,  // 40 Gold
  4: 8,  // 50 Gold
  5: 9,  // 60 Gold
  6: 9,  // 75 Gold
  7: 9,  // 90 Gold
  8: 6,  // Small Chest (50)
  9: 6,  // Small Chest (80)
  10: 8, // Medium Chest (120)
  11: 8, // Medium Chest (150)
  12: 8, // Medium Chest (180)
  13: 9, // Large Chest (220)
  14: 9, // Large Chest (260)
  15: 9, // Large Chest (320)
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
  | 'mystery'
  | 'max_lives_increase'
  | 'freeze_bank_increase'
  | 'daily_spin_increase';

export type PowerUpType = 'temporary' | 'permanent';
export type PowerUpCategory = 'boosts' | 'protection' | 'upgrades';

export interface PowerUp {
  id: string;
  powerUpKey: string;
  name: string;
  description: string;
  icon: string;
  type: PowerUpType;
  costGold: number;
  effectType: PowerUpEffectType;
  effectValue: number;
  durationMinutes: number | null;
  category: PowerUpCategory;
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
  goldSpent: number;
  createdAt: string;
}

export interface PurchaseResult {
  success: boolean;
  userPowerUp?: UserPowerUp;
  newGoldBalance: number;
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
