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
  HABIT_COMPLETE_EARLY: 5, // Bonus if completed before 9am
  ALL_DAILY_HABITS: 25, // Bonus for completing all daily habits
  
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
  
  // Streak milestone rewards
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  STREAK_100_DAYS: 1500,
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
  | 'daily_login';

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
