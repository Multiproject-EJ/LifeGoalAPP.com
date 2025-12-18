import { getSupabaseClient } from '../lib/supabaseClient';
import type { Achievement, UserAchievement } from '../types/gamification';
import type { PostgrestError } from '@supabase/supabase-js';

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

/**
 * Fetch all achievements with user's progress
 */
export async function fetchAchievementsWithProgress(
  userId: string
): Promise<ServiceResponse<AchievementWithProgress[]>> {
  const supabase = getSupabaseClient();

  // Get all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: true });

  if (achievementsError) {
    return { data: null, error: achievementsError };
  }

  // Get user's achievement progress
  const { data: userAchievements, error: userError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (userError) {
    return { data: null, error: userError };
  }

  // Merge achievement data with user progress
  const achievementsWithProgress = (achievements || []).map(achievement => {
    const userProgress = userAchievements?.find(
      ua => ua.achievement_id === achievement.id
    );

    return {
      ...achievement,
      currentProgress: userProgress?.progress || 0,
      isUnlocked: userProgress?.unlocked || false,
      unlockedAt: userProgress?.unlocked_at || null,
      progressPercent: Math.min(
        100,
        Math.floor((userProgress?.progress || 0) / achievement.requirement_value * 100)
      ),
    };
  });

  return { data: achievementsWithProgress, error: null };
}

/**
 * Get achievement statistics for user
 */
export async function getAchievementStats(userId: string): Promise<ServiceResponse<AchievementStats>> {
  const { data: achievementsData, error } = await fetchAchievementsWithProgress(userId);

  if (error || !achievementsData) {
    return { data: null, error };
  }

  const total = achievementsData.length;
  const unlocked = achievementsData.filter(a => a.isUnlocked).length;
  const percentComplete = total > 0 ? Math.floor((unlocked / total) * 100) : 0;

  const tierCounts = {
    bronze: { total: 0, unlocked: 0 },
    silver: { total: 0, unlocked: 0 },
    gold: { total: 0, unlocked: 0 },
    diamond: { total: 0, unlocked: 0 },
  };

  achievementsData.forEach(achievement => {
    const tier = achievement.tier as keyof typeof tierCounts;
    tierCounts[tier].total++;
    if (achievement.isUnlocked) {
      tierCounts[tier].unlocked++;
    }
  });

  const totalXPEarned = achievementsData
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + a.xp_reward, 0);

  const totalPointsEarned = achievementsData
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + a.xp_reward, 0); // Use xp_reward as points since points_reward doesn't exist

  return {
    data: {
      total,
      unlocked,
      percentComplete,
      tierCounts,
      totalXPEarned,
      totalPointsEarned,
    },
    error: null,
  };
}

/**
 * Get next closest achievement to unlock
 */
export function getNextAchievement(achievements: AchievementWithProgress[]): AchievementWithProgress | null {
  const locked = achievements.filter(a => !a.isUnlocked);
  if (locked.length === 0) return null;

  // Sort by progress percent descending
  const sorted = locked.sort((a, b) => b.progressPercent - a.progressPercent);
  return sorted[0];
}

// Types
export interface AchievementWithProgress extends Achievement {
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progressPercent: number;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  percentComplete: number;
  tierCounts: {
    bronze: { total: number; unlocked: number };
    silver: { total: number; unlocked: number };
    gold: { total: number; unlocked: number };
    diamond: { total: number; unlocked: number };
  };
  totalXPEarned: number;
  totalPointsEarned: number;
}
