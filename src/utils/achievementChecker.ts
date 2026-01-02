/**
 * Achievement Checker Utility
 * Defines achievement criteria and checks user progress
 */

import type { Achievement, RequirementType } from '../types/gamification';

/**
 * Achievement criteria definitions
 */
export interface AchievementCriteria {
  key: string;
  name: string;
  description: string;
  requirementType: RequirementType;
  requirementValue: number;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  category: 'streak' | 'habit' | 'goal' | 'journal' | 'general';
  xpReward: number;
}

/**
 * Predefined meditation-related achievements
 */
export const MEDITATION_ACHIEVEMENTS: AchievementCriteria[] = [
  {
    key: 'first_meditation',
    name: 'First Meditation',
    description: 'Complete your first meditation session',
    requirementType: 'streak',
    requirementValue: 1,
    icon: '🧘',
    tier: 'bronze',
    category: 'general',
    xpReward: 20,
  },
  {
    key: 'meditation_beginner',
    name: 'Meditation Beginner',
    description: 'Complete 5 meditation sessions',
    requirementType: 'streak',
    requirementValue: 5,
    icon: '🌱',
    tier: 'bronze',
    category: 'general',
    xpReward: 50,
  },
  {
    key: 'meditation_practitioner',
    name: 'Meditation Practitioner',
    description: 'Complete 20 meditation sessions',
    requirementType: 'streak',
    requirementValue: 20,
    icon: '🌿',
    tier: 'silver',
    category: 'general',
    xpReward: 150,
  },
  {
    key: 'meditation_master',
    name: 'Meditation Master',
    description: 'Complete 50 meditation sessions',
    requirementType: 'streak',
    requirementValue: 50,
    icon: '🌳',
    tier: 'gold',
    category: 'general',
    xpReward: 400,
  },
  {
    key: 'breathing_expert',
    name: 'Breathing Expert',
    description: 'Complete 30 breathing sessions',
    requirementType: 'streak',
    requirementValue: 30,
    icon: '🌬️',
    tier: 'silver',
    category: 'general',
    xpReward: 200,
  },
  {
    key: 'body_awareness',
    name: 'Body Awareness',
    description: 'Complete 15 body practice sessions',
    requirementType: 'streak',
    requirementValue: 15,
    icon: '💪',
    tier: 'silver',
    category: 'general',
    xpReward: 150,
  },
  {
    key: 'goal_achiever',
    name: 'Goal Achiever',
    description: 'Complete your first meditation goal',
    requirementType: 'goals_achieved',
    requirementValue: 1,
    icon: '🎯',
    tier: 'bronze',
    category: 'goal',
    xpReward: 100,
  },
  {
    key: 'goal_master',
    name: 'Goal Master',
    description: 'Complete 5 meditation goals',
    requirementType: 'goals_achieved',
    requirementValue: 5,
    icon: '🏆',
    tier: 'gold',
    category: 'goal',
    xpReward: 500,
  },
  {
    key: 'challenge_champion',
    name: 'Challenge Champion',
    description: 'Complete 10 daily challenges',
    requirementType: 'challenge_won',
    requirementValue: 10,
    icon: '⚡',
    tier: 'silver',
    category: 'general',
    xpReward: 250,
  },
];

/**
 * User progress data for achievement checking
 */
export interface UserProgressData {
  totalMeditationSessions?: number;
  totalBreathingSessions?: number;
  totalBodySessions?: number;
  meditationGoalsCompleted?: number;
  dailyChallengesCompleted?: number;
  currentStreak?: number;
  longestStreak?: number;
  habitsCompleted?: number;
  goalsAchieved?: number;
  journalEntries?: number;
  journalLongEntries?: number;
  checkinsCompleted?: number;
  visionUploads?: number;
}

/**
 * Check if user meets achievement criteria
 */
export function checkAchievementProgress(
  criteria: AchievementCriteria,
  progress: UserProgressData,
): { met: boolean; currentProgress: number; targetProgress: number } {
  let currentProgress = 0;
  
  switch (criteria.requirementType) {
    case 'streak':
      currentProgress = progress.currentStreak || 0;
      break;
    case 'habits_completed':
      currentProgress = progress.habitsCompleted || 0;
      break;
    case 'goals_achieved':
      currentProgress = progress.goalsAchieved || 0;
      break;
    case 'journal_entries':
      currentProgress = progress.journalEntries || 0;
      break;
    case 'journal_long_entries':
      currentProgress = progress.journalLongEntries || 0;
      break;
    case 'checkins_completed':
      currentProgress = progress.checkinsCompleted || 0;
      break;
    case 'vision_uploads':
      currentProgress = progress.visionUploads || 0;
      break;
    case 'challenge_won':
      currentProgress = progress.dailyChallengesCompleted || 0;
      break;
    default:
      currentProgress = 0;
  }
  
  return {
    met: currentProgress >= criteria.requirementValue,
    currentProgress,
    targetProgress: criteria.requirementValue,
  };
}

/**
 * Get newly earned achievements
 */
export function getNewlyEarnedAchievements(
  allCriteria: AchievementCriteria[],
  progress: UserProgressData,
  currentAchievements: string[], // Array of achievement keys already earned
): AchievementCriteria[] {
  const newlyEarned: AchievementCriteria[] = [];
  
  for (const criteria of allCriteria) {
    // Skip if already earned
    if (currentAchievements.includes(criteria.key)) {
      continue;
    }
    
    // Check if criteria is met
    const result = checkAchievementProgress(criteria, progress);
    if (result.met) {
      newlyEarned.push(criteria);
    }
  }
  
  return newlyEarned;
}

/**
 * Calculate achievement progress percentage
 */
export function calculateAchievementProgressPercent(
  criteria: AchievementCriteria,
  progress: UserProgressData,
): number {
  const result = checkAchievementProgress(criteria, progress);
  return Math.min(100, (result.currentProgress / result.targetProgress) * 100);
}

/**
 * Get achievement tier color
 */
export function getAchievementTierColor(tier: 'bronze' | 'silver' | 'gold' | 'diamond'): string {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    diamond: '#B9F2FF',
  };
  return colors[tier];
}

/**
 * Get achievement category icon
 */
export function getAchievementCategoryIcon(
  category: 'streak' | 'habit' | 'goal' | 'journal' | 'general',
): string {
  const icons = {
    streak: '🔥',
    habit: '✅',
    goal: '🎯',
    journal: '📝',
    general: '⭐',
  };
  return icons[category];
}
