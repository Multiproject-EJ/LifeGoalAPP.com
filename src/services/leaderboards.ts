// Leaderboards service for Phase 2 gamification
// Handles rankings, prize distribution, and demo mode

import { getSupabaseClient, canUseSupabaseData } from '../lib/supabaseClient';
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardCategory,
  LeaderboardReward,
  LEADERBOARD_PRIZE_TIERS,
} from '../types/gamification';
import { DEMO_LEADERBOARD_KEY, DEMO_LEADERBOARD_REWARDS_KEY } from '../types/gamification';
import { awardXP } from './gamification';
import { getGamificationProfile } from './gamification';

// =====================================================
// PERIOD KEY GENERATION
// =====================================================

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNum;
}

/**
 * Generate period key for a given scope
 */
export function getCurrentPeriodKey(scope: LeaderboardScope): string {
  if (scope === 'all_time') return 'all_time';
  
  const now = new Date();
  
  if (scope === 'weekly') {
    // ISO week format: YYYY-Www
    const year = now.getFullYear();
    const weekNum = getISOWeek(now);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  }
  
  if (scope === 'monthly') {
    // YYYY-MM
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
  
  return 'all_time';
}

// =====================================================
// RANKING ALGORITHM
// =====================================================

/**
 * Calculate ranks for entries, handling ties
 */
function calculateRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  // Sort by score descending
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  
  // Assign ranks (handle ties)
  let currentRank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && sorted[index - 1].score === entry.score) {
      // Tie - same rank as previous
      entry.rank = sorted[index - 1].rank;
    } else {
      entry.rank = currentRank;
    }
    currentRank++;
    return entry;
  });
}

// =====================================================
// DEMO MODE FUNCTIONS
// =====================================================

/**
 * Generate mock leaderboard data for demo mode
 */
function generateMockLeaderboard(
  category: LeaderboardCategory,
  userScore: number,
  username: string = 'You'
): LeaderboardEntry[] {
  const mockUsers = [
    'GoalCrusher', 'StreakMaster', 'XPHunter', 'AchieveKing', 'LevelWarrior',
    'DailyHero', 'ProgressPro', 'MilestoneMaven', 'VictorySeeker', 'ChampionRise',
    'QuestConqueror', 'ElitePlayer', 'TopPerformer', 'MegaAchiever', 'StarClimber',
    'RankRuler', 'PointsPilot', 'SkillMaster', 'TrophyHunter', 'BadgeCollector',
    'PowerUser123', 'GoalGetter88', 'StreakKeeper', 'XPCollector', 'DreamChaser',
    'FocusedMind', 'HabitBuilder', 'JourneyMaker', 'PathFinder', 'SuccessStory',
    'RiseAndGrind', 'WinnerCircle', 'DailyDriver', 'GoalDigger', 'ProgressTracker',
    'MilestoneKing', 'VisionSeeker', 'PeakPerformer', 'TopTierUser', 'EliteMindset',
    'ChallengeMaster', 'QuestHero', 'VictoryLane', 'PrizeWinner', 'RankClimber',
    'ScoreLeader', 'PointMaster', 'LevelUpPro', 'StreakChamp', 'XPExpert',
    'AchievementAce', 'GoalGuru', 'HabitHero', 'JournalJedi', 'CheckInChamp',
    'VisionVictor', 'DailyDynamo', 'WeeklyWinner', 'MonthlyMVP', 'YearlyChamp',
    'CrushingGoals', 'SmashingTargets', 'HittingMarks', 'MeetingGoals', 'ExceedingLimits',
    'PushingBoundaries', 'BreakingRecords', 'SettingStandards', 'RaisingBar', 'DefyingOdds',
    'ConsistencyKing', 'DedicationQueen', 'PersistencePro', 'CommitmentChamp', 'DeterminedSoul',
    'FocusedForce', 'DrivenMind', 'MotivatedUser', 'InspiredLife', 'EmpoweredGoal',
    'BalancedLife', 'WellnessWarrior', 'MindfulMaster', 'ZenAchiever', 'CalmConqueror',
    'PeacefulProgress', 'HarmonySeeker', 'FlowState', 'InTheZone', 'OnTrack',
    'Unstoppable', 'Unbreakable', 'Invincible', 'Legendary', 'Phenomenal',
    'Extraordinary', 'Remarkable', 'Outstanding', 'Exceptional', 'Impressive',
    'BeyondLimits', 'NextLevel', 'UltraUser', 'SuperStreak', 'MegaMotivated',
  ];
  
  // Generate scores based on category and user score
  const entries: LeaderboardEntry[] = mockUsers.map((name, i) => {
    // Scores decrease from top to bottom with some randomness
    let mockScore = Math.max(Math.floor(userScore * 2.5 - (i * userScore * 0.03)), 1);
    
    // Add some variation
    if (i > 10) {
      mockScore = Math.floor(mockScore * (0.8 + Math.random() * 0.4));
    }
    
    return {
      user_id: `mock-${i}`,
      username: name,
      scope: 'all_time' as LeaderboardScope,
      category,
      score: mockScore,
      rank: i + 1,
      period_key: 'all_time',
    };
  });
  
  // Insert user at appropriate rank
  const userRank = entries.findIndex(e => e.score < userScore);
  const userEntry: LeaderboardEntry = {
    user_id: 'current-user',
    username,
    scope: 'all_time' as LeaderboardScope,
    category,
    score: userScore,
    rank: userRank >= 0 ? userRank + 1 : entries.length + 1,
    period_key: 'all_time',
    isCurrentUser: true,
  };
  
  if (userRank >= 0) {
    entries.splice(userRank, 0, userEntry);
  } else {
    entries.push(userEntry);
  }
  
  // Recalculate ranks
  return calculateRanks(entries);
}

/**
 * Get user's score for a category in demo mode
 */
async function getDemoUserScore(category: LeaderboardCategory): Promise<{ score: number; username: string }> {
  const profile = await getGamificationProfile('demo_user');
  
  let score = 0;
  switch (category) {
    case 'level':
      score = profile.current_level;
      break;
    case 'xp':
      score = profile.total_xp;
      break;
    case 'streak':
      score = profile.current_streak;
      break;
    case 'achievements':
      // Count demo achievements
      const achievementsStr = localStorage.getItem('lifegoal_demo_user_achievements');
      if (achievementsStr) {
        const achievements = JSON.parse(achievementsStr);
        score = achievements.filter((a: any) => a.unlocked).length;
      }
      break;
    case 'points':
      score = profile.total_points;
      break;
  }
  
  return { score, username: 'You (Demo)' };
}

/**
 * Get leaderboard in demo mode
 */
async function getLeaderboardDemo(
  scope: LeaderboardScope,
  category: LeaderboardCategory,
  limit: number = 50
): Promise<{ data: LeaderboardEntry[] | null; error: Error | null }> {
  try {
    const periodKey = getCurrentPeriodKey(scope);
    const storageKey = `${DEMO_LEADERBOARD_KEY}_${scope}_${category}_${periodKey}`;
    
    // Try to get cached demo data
    let entries: LeaderboardEntry[] = [];
    const cached = localStorage.getItem(storageKey);
    
    if (cached) {
      entries = JSON.parse(cached);
    } else {
      // Generate new mock data
      const { score, username } = await getDemoUserScore(category);
      entries = generateMockLeaderboard(category, score, username);
      
      // Cache it
      localStorage.setItem(storageKey, JSON.stringify(entries));
    }
    
    // Mark current user's entry
    entries = entries.map(e => ({
      ...e,
      isCurrentUser: e.user_id === 'current-user',
    }));
    
    return { data: entries.slice(0, limit), error: null };
  } catch (error) {
    console.error('Demo leaderboard error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get user rank in demo mode
 */
async function getUserRankDemo(
  scope: LeaderboardScope,
  category: LeaderboardCategory
): Promise<{ data: LeaderboardEntry | null; error: Error | null }> {
  const { data, error } = await getLeaderboardDemo(scope, category, 1000);
  if (error || !data) {
    return { data: null, error };
  }
  
  const userEntry = data.find(e => e.isCurrentUser);
  return { data: userEntry || null, error: null };
}

// =====================================================
// SUPABASE MODE FUNCTIONS
// =====================================================

/**
 * Fetch leaderboard from Supabase
 */
export async function getLeaderboard(
  scope: LeaderboardScope,
  category: LeaderboardCategory,
  limit: number = 50
): Promise<{ data: LeaderboardEntry[] | null; error: Error | null }> {
  // Demo mode
  if (!canUseSupabaseData()) {
    return getLeaderboardDemo(scope, category, limit);
  }
  
  try {
    const supabase = getSupabaseClient();
    const periodKey = getCurrentPeriodKey(scope);
    
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('scope', scope)
      .eq('category', category)
      .eq('period_key', periodKey)
      .order('rank', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get user's rank for a specific leaderboard
 */
export async function getUserRank(
  userId: string,
  scope: LeaderboardScope,
  category: LeaderboardCategory
): Promise<{ data: LeaderboardEntry | null; error: Error | null }> {
  // Demo mode
  if (!canUseSupabaseData()) {
    return getUserRankDemo(scope, category);
  }
  
  try {
    const supabase = getSupabaseClient();
    const periodKey = getCurrentPeriodKey(scope);
    
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('scope', scope)
      .eq('category', category)
      .eq('period_key', periodKey)
      .maybeSingle();
    
    if (error) throw error;
    
    return { data: data || null, error: null };
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Refresh leaderboard rankings (admin/cron)
 */
export async function refreshLeaderboard(
  scope: LeaderboardScope
): Promise<{ success: boolean; error: Error | null }> {
  if (!canUseSupabaseData()) {
    // In demo mode, just regenerate cached data
    return { success: true, error: null };
  }
  
  try {
    const supabase = getSupabaseClient();
    const periodKey = getCurrentPeriodKey(scope);
    
    const { error } = await supabase.rpc('refresh_leaderboard_entries', {
      target_scope: scope,
      target_period: periodKey,
    });
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return { success: false, error: error as Error };
  }
}

// =====================================================
// PRIZE DISTRIBUTION
// =====================================================

const PRIZE_TIERS: typeof LEADERBOARD_PRIZE_TIERS = {
  1: { xp: 1000, badge: 'leaderboard_champion' },
  2: { xp: 500, badge: 'leaderboard_runner_up' },
  3: { xp: 500, badge: 'leaderboard_third' },
  4: { xp: 500, badge: null },
  5: { xp: 500, badge: null },
  6: { xp: 250, badge: null },
  7: { xp: 250, badge: null },
  8: { xp: 250, badge: null },
  9: { xp: 250, badge: null },
  10: { xp: 250, badge: null },
};

/**
 * Award prizes to top 10 users for a completed period
 */
async function awardPrizes(
  scope: LeaderboardScope,
  category: LeaderboardCategory,
  periodKey: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!canUseSupabaseData()) {
    return { success: true, error: null };
  }
  
  try {
    const supabase = getSupabaseClient();
    
    // Get top 10
    const { data: topUsers, error: fetchError } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('scope', scope)
      .eq('category', category)
      .eq('period_key', periodKey)
      .order('rank', { ascending: true })
      .limit(10);
    
    if (fetchError) throw fetchError;
    if (!topUsers || topUsers.length === 0) {
      return { success: true, error: null };
    }
    
    // Award prizes
    for (const entry of topUsers) {
      const prize = PRIZE_TIERS[entry.rank as keyof typeof PRIZE_TIERS];
      if (!prize) continue;
      
      // Check if already awarded
      const { data: existing } = await supabase
        .from('leaderboard_rewards')
        .select('id')
        .eq('user_id', entry.user_id)
        .eq('scope', scope)
        .eq('category', category)
        .eq('period_key', periodKey)
        .maybeSingle();
      
      if (existing) continue; // Already awarded
      
      // Award XP
      await awardXP(
        entry.user_id,
        prize.xp,
        'leaderboard_prize',
        undefined,
        `Leaderboard prize: Rank #${entry.rank} in ${category} (${scope})`
      );
      
      // Record reward
      await supabase.from('leaderboard_rewards').insert({
        user_id: entry.user_id,
        scope,
        category,
        period_key: periodKey,
        rank: entry.rank,
        xp_reward: prize.xp,
        badge_key: prize.badge,
      });
      
      // TODO: Award badge if applicable (future enhancement)
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error awarding prizes:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Check and award weekly prizes (called on Monday)
 */
export async function checkAndAwardWeeklyPrizes(): Promise<void> {
  // Get previous week's period key
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const year = lastWeek.getFullYear();
  const weekNum = getISOWeek(lastWeek);
  const periodKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
  
  // Award prizes for each category
  const categories: LeaderboardCategory[] = ['level', 'xp', 'streak', 'achievements', 'points'];
  for (const category of categories) {
    await awardPrizes('weekly', category, periodKey);
  }
}

/**
 * Check and award monthly prizes (called on 1st of month)
 */
export async function checkAndAwardMonthlyPrizes(): Promise<void> {
  // Get previous month's period key
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const year = lastMonth.getFullYear();
  const month = (lastMonth.getMonth() + 1).toString().padStart(2, '0');
  const periodKey = `${year}-${month}`;
  
  // Award prizes for each category
  const categories: LeaderboardCategory[] = ['level', 'xp', 'streak', 'achievements', 'points'];
  for (const category of categories) {
    await awardPrizes('monthly', category, periodKey);
  }
}

/**
 * Check if prizes should be distributed (called on component mount)
 */
export async function checkPrizeDistribution(): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = now.getDate();
  
  // Award weekly prizes on Monday
  if (dayOfWeek === 1) {
    const lastCheck = localStorage.getItem('leaderboard_weekly_check');
    const today = now.toISOString().split('T')[0];
    
    if (lastCheck !== today) {
      await checkAndAwardWeeklyPrizes();
      localStorage.setItem('leaderboard_weekly_check', today);
    }
  }
  
  // Award monthly prizes on 1st of month
  if (dayOfMonth === 1) {
    const lastCheck = localStorage.getItem('leaderboard_monthly_check');
    const today = now.toISOString().split('T')[0];
    
    if (lastCheck !== today) {
      await checkAndAwardMonthlyPrizes();
      localStorage.setItem('leaderboard_monthly_check', today);
    }
  }
}
