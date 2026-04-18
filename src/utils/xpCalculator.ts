/**
 * XP Calculator Utility
 * Calculates XP rewards based on activity type and duration
 */

import { XP_REWARDS } from '../types/gamification';

/**
 * Calculate XP for meditation session
 */
export function calculateMeditationXP(durationMinutes: number): number {
  let xp = XP_REWARDS.MEDITATION_SESSION;
  
  // Bonus for long sessions (10+ minutes)
  if (durationMinutes >= 10) {
    xp += XP_REWARDS.MEDITATION_LONG_SESSION;
  }
  
  return xp;
}

/**
 * Calculate XP for breathing session
 */
export function calculateBreathingXP(durationMinutes: number): number {
  return XP_REWARDS.BREATHING_SESSION;
}

/**
 * Calculate XP for body practice session
 */
export function calculateBodyXP(durationMinutes: number): number {
  return XP_REWARDS.BODY_SESSION;
}

/**
 * Calculate XP for activity type
 */
export function calculateActivityXP(
  activityType: 'meditation' | 'breathing' | 'body',
  durationMinutes: number,
): number {
  switch (activityType) {
    case 'meditation':
      return calculateMeditationXP(durationMinutes);
    case 'breathing':
      return calculateBreathingXP(durationMinutes);
    case 'body':
      return calculateBodyXP(durationMinutes);
    default:
      return 0;
  }
}

/**
 * Calculate level from total XP
 * Level progression uses a conservative quadratic curve:
 *   XP needed for level N = 150 × (N-1) × N
 *   Level 1 = 0 XP, Level 2 = 300 XP, Level 3 = 900 XP,
 *   Level 5 = 3000 XP, Level 10 = 13500 XP, Level 20 = 57000 XP
 *
 * This is 3× harder than the previous formula (50 × (N-1) × N),
 * ensuring levels are meaningful achievements tied to consistent engagement.
 *
 * To find level from XP, we solve: 150 × level × (level + 1) = totalXP
 * Using quadratic formula: level = (-1 + sqrt(1 + 4 × totalXP / 150)) / 2
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;
  
  const level = Math.floor((-1 + Math.sqrt(1 + (4 * totalXP) / 150)) / 2) + 1;
  return Math.max(1, level);
}

/**
 * Calculate XP required for a specific level
 * Formula: 150 × (level - 1) × level
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 150 * (level - 1) * level;
}

/**
 * Calculate XP required to reach next level
 */
export function xpToNextLevel(currentLevel: number, currentXP: number): number {
  const nextLevelXP = xpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentXP);
}

/**
 * Calculate XP progress within current level
 */
export function xpProgressInLevel(currentLevel: number, currentXP: number): number {
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const xpInLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  
  return Math.max(0, Math.min(100, (xpInLevel / xpNeeded) * 100));
}

/**
 * Get level info from total XP
 */
export interface LevelInfo {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  progressPercentage: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  const currentLevel = calculateLevel(totalXP);
  const xpForCurrentLevel = xpForLevel(currentLevel);
  const xpForNextLevel = xpForLevel(currentLevel + 1);
  const xpProgress = totalXP - xpForCurrentLevel;
  const progressPercentage = xpProgressInLevel(currentLevel, totalXP);
  
  return {
    currentLevel,
    currentXP: totalXP,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    progressPercentage,
  };
}
