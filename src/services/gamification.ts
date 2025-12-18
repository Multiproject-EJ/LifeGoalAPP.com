// Core gamification service for XP, levels, achievements, and streaks
// Supports both demo mode (localStorage) and Supabase mode

import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import type {
  GamificationProfile,
  Achievement,
  AchievementWithProgress,
  LevelInfo,
  AwardXPResult,
  UpdateStreakResult,
  XPTransaction,
} from '../types/gamification';
import { XP_REWARDS, DEMO_PROFILE_KEY, DEMO_TRANSACTIONS_KEY, DEMO_ACHIEVEMENTS_KEY } from '../types/gamification';

// =====================================================
// LEVEL CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate XP required for a specific level
 * Formula: level^1.5 * 100
 */
export function calculateXPForLevel(level: number): number {
  return Math.floor(Math.pow(level, 1.5) * 100);
}

/**
 * Calculate current level from total XP
 */
export function calculateLevelFromXP(totalXP: number): number {
  let level = 1;
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Get detailed level info including progress to next level
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  const currentLevel = calculateLevelFromXP(totalXP);
  const xpForCurrentLevel = calculateXPForLevel(currentLevel);
  const xpForNextLevel = calculateXPForLevel(currentLevel + 1);
  const xpProgress = totalXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercentage = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

  return {
    currentLevel,
    currentXP: totalXP,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    progressPercentage,
  };
}

// =====================================================
// XP AWARD FUNCTION
// =====================================================

/**
 * Award XP to a user, handle level-ups, and check for achievements
 */
export async function awardXP(
  userId: string,
  xpAmount: number,
  sourceType: string,
  sourceId?: string,
  description?: string
): Promise<AwardXPResult> {
  try {
    // Demo mode
    if (!canUseSupabaseData()) {
      return await awardXPDemo(userId, xpAmount, sourceType, sourceId, description);
    }

    // Supabase mode
    const supabase = getSupabaseClient();

    // Get or create profile
    const { data: profile, error: profileError } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    let currentProfile = profile;
    if (!currentProfile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('gamification_profiles')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;
      currentProfile = newProfile;
    }

    const oldXP = currentProfile.total_xp;
    const newXP = oldXP + xpAmount;
    const oldLevel = currentProfile.current_level;
    const newLevel = calculateLevelFromXP(newXP);
    const leveledUp = newLevel > oldLevel;

    // Update profile
    const { error: updateError } = await supabase
      .from('gamification_profiles')
      .update({
        total_xp: newXP,
        current_level: newLevel,
        total_points: currentProfile.total_points + xpAmount,
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Log transaction
    await supabase.from('xp_transactions').insert({
      user_id: userId,
      xp_amount: xpAmount,
      source_type: sourceType,
      source_id: sourceId || null,
      description: description || null,
    });

    // Create level-up notification if needed
    if (leveledUp) {
      await supabase.from('gamification_notifications').insert({
        user_id: userId,
        notification_type: 'level_up',
        title: `Level ${newLevel} Reached! 🎉`,
        message: `You've reached level ${newLevel}! Keep up the great work!`,
        icon: '🆙',
        xp_reward: 0,
      });
    }

    // Check for achievement unlocks
    const achievementsUnlocked = await checkAchievements(userId);

    return {
      success: true,
      xpAwarded: xpAmount,
      newTotalXP: newXP,
      leveledUp,
      oldLevel,
      newLevel,
      achievementsUnlocked,
    };
  } catch (error) {
    console.error('Failed to award XP:', error);
    return {
      success: false,
      xpAwarded: 0,
      newTotalXP: 0,
      leveledUp: false,
      oldLevel: 1,
      newLevel: 1,
      achievementsUnlocked: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Demo mode version of awardXP
 */
async function awardXPDemo(
  userId: string,
  xpAmount: number,
  sourceType: string,
  sourceId?: string,
  description?: string
): Promise<AwardXPResult> {
  // Get current profile
  const profileJson = localStorage.getItem(DEMO_PROFILE_KEY);
  const profile = profileJson ? JSON.parse(profileJson) : {
    total_xp: 0,
    current_level: 1,
    total_points: 0,
  };

  const oldXP = profile.total_xp || 0;
  const newXP = oldXP + xpAmount;
  const oldLevel = profile.current_level || 1;
  const newLevel = calculateLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  // Update profile
  profile.total_xp = newXP;
  profile.current_level = newLevel;
  profile.total_points = (profile.total_points || 0) + xpAmount;
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));

  // Log transaction
  const transactions = JSON.parse(localStorage.getItem(DEMO_TRANSACTIONS_KEY) || '[]');
  transactions.push({
    id: `demo-${Date.now()}`,
    user_id: userId,
    xp_amount: xpAmount,
    source_type: sourceType,
    source_id: sourceId || null,
    description: description || null,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(transactions));

  return {
    success: true,
    xpAwarded: xpAmount,
    newTotalXP: newXP,
    leveledUp,
    oldLevel,
    newLevel,
    achievementsUnlocked: [],
  };
}

// =====================================================
// STREAK FUNCTIONS
// =====================================================

/**
 * Update user's streak based on daily activity
 */
export async function updateStreak(userId: string): Promise<UpdateStreakResult> {
  try {
    // Demo mode
    if (!canUseSupabaseData()) {
      return await updateStreakDemo(userId);
    }

    // Supabase mode
    const supabase = getSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error('Profile not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = profile.last_activity_date;

    // If already active today, no change
    if (lastActivityDate === today) {
      return {
        success: true,
        currentStreak: profile.current_streak,
        longestStreak: profile.longest_streak,
        streakMilestoneReached: false,
        xpAwarded: 0,
      };
    }

    // Calculate new streak
    let newStreak = 1;
    if (lastActivityDate) {
      const lastDate = new Date(lastActivityDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        newStreak = profile.current_streak + 1;
      }
      // If diffDays > 1, streak is broken, reset to 1
    }

    const newLongest = Math.max(newStreak, profile.longest_streak);
    let xpAwarded = 0;
    let streakMilestoneReached = false;

    // Check for streak milestones
    if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
      streakMilestoneReached = true;
      if (newStreak === 7) xpAwarded = XP_REWARDS.STREAK_7_DAYS;
      if (newStreak === 30) xpAwarded = XP_REWARDS.STREAK_30_DAYS;
      if (newStreak === 100) xpAwarded = XP_REWARDS.STREAK_100_DAYS;

      // Award XP
      await awardXP(userId, xpAwarded, 'streak_milestone', `${newStreak}_days`);

      // Create notification
      await supabase.from('gamification_notifications').insert({
        user_id: userId,
        notification_type: 'streak_milestone',
        title: `${newStreak}-Day Streak! 🔥`,
        message: `Amazing! You've maintained a ${newStreak}-day streak and earned ${xpAwarded} XP!`,
        icon: '🔥',
        xp_reward: xpAwarded,
      });
    }

    // Update profile
    await supabase
      .from('gamification_profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: today,
      })
      .eq('user_id', userId);

    return {
      success: true,
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakMilestoneReached,
      xpAwarded,
    };
  } catch (error) {
    console.error('Failed to update streak:', error);
    return {
      success: false,
      currentStreak: 0,
      longestStreak: 0,
      streakMilestoneReached: false,
      xpAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Demo mode version of updateStreak
 */
async function updateStreakDemo(userId: string): Promise<UpdateStreakResult> {
  const profileJson = localStorage.getItem(DEMO_PROFILE_KEY);
  const profile = profileJson ? JSON.parse(profileJson) : {
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
  };

  const today = new Date().toISOString().split('T')[0];
  const lastActivityDate = profile.last_activity_date;

  if (lastActivityDate === today) {
    return {
      success: true,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      streakMilestoneReached: false,
      xpAwarded: 0,
    };
  }

  let newStreak = 1;
  if (lastActivityDate) {
    const lastDate = new Date(lastActivityDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = (profile.current_streak || 0) + 1;
    }
  }

  const newLongest = Math.max(newStreak, profile.longest_streak || 0);

  profile.current_streak = newStreak;
  profile.longest_streak = newLongest;
  profile.last_activity_date = today;
  localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));

  return {
    success: true,
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakMilestoneReached: false,
    xpAwarded: 0,
  };
}

// =====================================================
// ACHIEVEMENT FUNCTIONS
// =====================================================

/**
 * Check and unlock achievements for a user
 */
export async function checkAchievements(userId: string): Promise<Achievement[]> {
  // For demo mode, return empty array (simplified)
  if (!canUseSupabaseData()) {
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    
    // This is a simplified version - in production, you'd check specific achievement criteria
    // based on user stats and unlock achievements accordingly
    
    return [];
  } catch (error) {
    console.error('Failed to check achievements:', error);
    return [];
  }
}

/**
 * Fetch all achievements with user progress
 */
export async function fetchAchievementsWithProgress(userId: string): Promise<{
  data: AchievementWithProgress[];
  error: Error | null;
}> {
  try {
    if (!canUseSupabaseData()) {
      // Demo mode: return empty array for now
      return { data: [], error: null };
    }

    const supabase = getSupabaseClient();

    // Fetch all achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('tier', { ascending: true });

    if (achievementsError) throw achievementsError;

    // Fetch user progress
    const { data: userAchievements, error: userError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (userError) throw userError;

    // Combine data
    const achievementsWithProgress: AchievementWithProgress[] = (achievements || []).map((achievement) => {
      const userAchievement = (userAchievements || []).find(
        (ua) => ua.achievement_id === achievement.id
      );

      return {
        ...achievement,
        progress: userAchievement?.progress || 0,
        unlocked: userAchievement?.unlocked || false,
        unlocked_at: userAchievement?.unlocked_at || null,
      };
    });

    return { data: achievementsWithProgress, error: null };
  } catch (error) {
    console.error('Failed to fetch achievements:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
