import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import type { Achievement, UserAchievement, AchievementWithProgress } from '../types/gamification';
import { DEMO_ACHIEVEMENTS_KEY } from '../types/gamification';
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
  // Demo mode
  if (!canUseSupabaseData()) {
    return fetchAchievementsWithProgressDemo(userId);
  }

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
  const achievementsWithProgress: AchievementWithProgress[] = (achievements as Achievement[] || []).map((achievement: Achievement) => {
    const userProgress = (userAchievements as UserAchievement[] || []).find(
      (ua: UserAchievement) => ua.achievement_id === achievement.id
    );

    return {
      ...achievement,
      progress: userProgress?.progress || 0,
      unlocked: userProgress?.unlocked || false,
      unlocked_at: userProgress?.unlocked_at || null,
      progressPercent: Math.min(
        100,
        Math.floor(((userProgress?.progress || 0) / achievement.requirement_value) * 100)
      ),
    };
  });

  return { data: achievementsWithProgress, error: null };
}

/**
 * Demo mode: Fetch achievements with mock progress
 */
function fetchAchievementsWithProgressDemo(
  userId: string
): Promise<ServiceResponse<AchievementWithProgress[]>> {
  try {
    // Demo achievements data (matching Phase 1 achievements)
    const demoAchievements: Achievement[] = [
      {
        id: 'demo-ach-1',
        achievement_key: 'getting_started',
        name: 'Getting Started',
        description: 'Complete your first habit',
        icon: '✅',
        tier: 'bronze',
        category: 'habit',
        xp_reward: 10,
        requirement_type: 'habits_completed',
        requirement_value: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-2',
        achievement_key: 'habit_builder',
        name: 'Habit Builder',
        description: 'Complete 10 habits',
        icon: '📋',
        tier: 'bronze',
        category: 'habit',
        xp_reward: 50,
        requirement_type: 'habits_completed',
        requirement_value: 10,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-3',
        achievement_key: 'consistency_pro',
        name: 'Consistency Pro',
        description: 'Complete 50 habits',
        icon: '⭐',
        tier: 'silver',
        category: 'habit',
        xp_reward: 200,
        requirement_type: 'habits_completed',
        requirement_value: 50,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-4',
        achievement_key: 'century_club',
        name: 'Century Club',
        description: 'Complete 100 habits',
        icon: '💯',
        tier: 'gold',
        category: 'habit',
        xp_reward: 500,
        requirement_type: 'habits_completed',
        requirement_value: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-5',
        achievement_key: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        tier: 'bronze',
        category: 'streak',
        xp_reward: 100,
        requirement_type: 'streak',
        requirement_value: 7,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-6',
        achievement_key: 'fortnight_fighter',
        name: 'Fortnight Fighter',
        description: 'Maintain a 14-day streak',
        icon: '💪',
        tier: 'silver',
        category: 'streak',
        xp_reward: 200,
        requirement_type: 'streak',
        requirement_value: 14,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-7',
        achievement_key: 'consistency_king',
        name: 'Consistency King',
        description: 'Maintain a 30-day streak',
        icon: '👑',
        tier: 'gold',
        category: 'streak',
        xp_reward: 500,
        requirement_type: 'streak',
        requirement_value: 30,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-8',
        achievement_key: 'century_streak',
        name: 'Century Streak',
        description: 'Maintain a 100-day streak',
        icon: '💯',
        tier: 'diamond',
        category: 'streak',
        xp_reward: 1500,
        requirement_type: 'streak',
        requirement_value: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-9',
        achievement_key: 'visionary',
        name: 'Visionary',
        description: 'Create your first goal',
        icon: '🎯',
        tier: 'bronze',
        category: 'goal',
        xp_reward: 50,
        requirement_type: 'goals_achieved',
        requirement_value: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-ach-10',
        achievement_key: 'goal_crusher',
        name: 'Goal Crusher',
        description: 'Complete 5 goals',
        icon: '🏆',
        tier: 'silver',
        category: 'goal',
        xp_reward: 200,
        requirement_type: 'goals_achieved',
        requirement_value: 5,
        created_at: new Date().toISOString(),
      },
    ];

    // Get stored user progress from localStorage
    const storedProgress = localStorage.getItem(DEMO_ACHIEVEMENTS_KEY);
    const userAchievements: Record<string, { progress: number; unlocked: boolean; unlocked_at: string | null }> = storedProgress 
      ? JSON.parse(storedProgress) 
      : {};

    // Merge with progress
    const achievementsWithProgress: AchievementWithProgress[] = demoAchievements.map(achievement => {
      const userProgress = userAchievements[achievement.achievement_key] || {
        progress: 0,
        unlocked: false,
        unlocked_at: null,
      };

      return {
        ...achievement,
        progress: userProgress.progress,
        unlocked: userProgress.unlocked,
        unlocked_at: userProgress.unlocked_at,
        progressPercent: Math.min(
          100,
          Math.floor((userProgress.progress / achievement.requirement_value) * 100)
        ),
      };
    });

    return Promise.resolve({ data: achievementsWithProgress, error: null });
  } catch (error) {
    return Promise.resolve({
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch demo achievements'),
    });
  }
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
  const unlocked = achievementsData.filter(a => a.unlocked).length;
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
    if (achievement.unlocked) {
      tierCounts[tier].unlocked++;
    }
  });

  const totalXPEarned = achievementsData
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.xp_reward, 0);

  return {
    data: {
      total,
      unlocked,
      percentComplete,
      tierCounts,
      totalXPEarned,
    },
    error: null,
  };
}

/**
 * Get next closest achievement to unlock
 */
export function getNextAchievement(achievements: AchievementWithProgress[]): AchievementWithProgress | null {
  const locked = achievements.filter(a => !a.unlocked);
  if (locked.length === 0) return null;

  // Sort by progress percent descending
  const sorted = locked.sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0));
  return sorted[0];
}

// Types
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
}
