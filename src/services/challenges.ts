// Challenge System service for daily and weekly gamification challenges
// Supports demo mode via localStorage with deterministic challenge generation

import type {
  ChallengeDefinition,
  ChallengeInstance,
  ChallengeState,
  ChallengeStatus,
} from '../types/gamification';
import { DEMO_CHALLENGES_KEY, XP_REWARDS } from '../types/gamification';

// =====================================================
// CHALLENGE DEFINITIONS
// =====================================================

const DAILY_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'daily-habits-3',
    title: 'Complete 3 habits today',
    description: 'Mark at least 3 habits as done before the day ends.',
    icon: '✅',
    period: 'daily',
    category: 'habit',
    targetValue: 3,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
  {
    id: 'daily-habits-5',
    title: 'High-five habits',
    description: 'Complete 5 habits in a single day.',
    icon: '🖐️',
    period: 'daily',
    category: 'habit',
    targetValue: 5,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
  {
    id: 'daily-journal-1',
    title: 'Reflect and write',
    description: 'Write at least one journal entry today.',
    icon: '📝',
    period: 'daily',
    category: 'journal',
    targetValue: 1,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
  {
    id: 'daily-checkin-1',
    title: 'Life wheel check-in',
    description: 'Complete a life wheel check-in today.',
    icon: '🎯',
    period: 'daily',
    category: 'checkin',
    targetValue: 1,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
  {
    id: 'daily-early-2',
    title: 'Early bird',
    description: 'Complete 2 habits before 9 AM.',
    icon: '🌅',
    period: 'daily',
    category: 'habit',
    targetValue: 2,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
  {
    id: 'daily-mixed-streak',
    title: 'Keep the fire burning',
    description: 'Continue your streak by completing at least 1 activity today.',
    icon: '🔥',
    period: 'daily',
    category: 'streak',
    targetValue: 1,
    xpReward: XP_REWARDS.CHALLENGE_DAILY,
  },
];

const WEEKLY_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'weekly-habits-15',
    title: 'Habit marathon',
    description: 'Complete 15 habits this week across any category.',
    icon: '🏃',
    period: 'weekly',
    category: 'habit',
    targetValue: 15,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
  {
    id: 'weekly-journal-3',
    title: 'Thoughtful week',
    description: 'Write 3 journal entries this week.',
    icon: '📖',
    period: 'weekly',
    category: 'journal',
    targetValue: 3,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
  {
    id: 'weekly-checkin-2',
    title: 'Balance check',
    description: 'Complete 2 life wheel check-ins this week.',
    icon: '⚖️',
    period: 'weekly',
    category: 'checkin',
    targetValue: 2,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
  {
    id: 'weekly-streak-5',
    title: 'Five-day streak',
    description: 'Maintain a 5-day activity streak this week.',
    icon: '🔥',
    period: 'weekly',
    category: 'streak',
    targetValue: 5,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
  {
    id: 'weekly-perfect-3',
    title: 'Perfect trio',
    description: 'Complete all your daily habits on 3 separate days this week.',
    icon: '⭐',
    period: 'weekly',
    category: 'mixed',
    targetValue: 3,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
  {
    id: 'weekly-habits-25',
    title: 'Consistency champion',
    description: 'Complete 25 habits this week to prove your dedication.',
    icon: '🏆',
    period: 'weekly',
    category: 'habit',
    targetValue: 25,
    xpReward: XP_REWARDS.CHALLENGE_WEEKLY,
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function normalizeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEndDate(date: Date): string {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return normalizeDate(sunday);
}

/** Deterministic selection based on a seed string */
function selectByHash(seed: string, pool: ChallengeDefinition[], count: number): ChallengeDefinition[] {
  if (pool.length <= count) return [...pool];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  const indices: Set<number> = new Set();
  let attempt = Math.abs(hash);
  while (indices.size < count) {
    indices.add(attempt % pool.length);
    attempt = ((attempt * 31 + 7) | 0) >>> 0;
  }

  return Array.from(indices).map((i) => pool[i]);
}

function buildInstance(def: ChallengeDefinition, startDate: string, endDate: string): ChallengeInstance {
  return {
    id: `${def.id}-${startDate}`,
    definitionId: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    period: def.period,
    category: def.category,
    targetValue: def.targetValue,
    currentProgress: 0,
    xpReward: def.xpReward,
    status: 'active',
    startDate,
    endDate,
  };
}

// =====================================================
// STATE MANAGEMENT (localStorage)
// =====================================================

function loadState(userId: string): ChallengeState | null {
  try {
    const stored = localStorage.getItem(`${DEMO_CHALLENGES_KEY}_${userId}`);
    return stored ? (JSON.parse(stored) as ChallengeState) : null;
  } catch {
    return null;
  }
}

function saveState(userId: string, state: ChallengeState): void {
  localStorage.setItem(`${DEMO_CHALLENGES_KEY}_${userId}`, JSON.stringify(state));
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Load or create the challenge state, rotating daily/weekly challenges as needed.
 */
export function ensureChallengeState(userId: string, now = new Date()): ChallengeState {
  const today = normalizeDate(now);
  const weekStart = normalizeDate(getMonday(now));
  const weekEnd = getWeekEndDate(now);

  const existing = loadState(userId);

  let dailyChallenges: ChallengeInstance[];
  let weeklyChallenges: ChallengeInstance[];
  let totalCompleted = existing?.totalChallengesCompleted ?? 0;

  // Rotate daily challenges if needed
  if (existing && existing.lastDailyReset === today) {
    dailyChallenges = existing.dailyChallenges;
  } else {
    const seed = `${userId}-daily-${today}`;
    const picked = selectByHash(seed, DAILY_CHALLENGES, 3);
    dailyChallenges = picked.map((def) => buildInstance(def, today, today));
  }

  // Rotate weekly challenges if needed
  if (existing && existing.lastWeeklyReset === weekStart) {
    weeklyChallenges = existing.weeklyChallenges;
  } else {
    const seed = `${userId}-weekly-${weekStart}`;
    const picked = selectByHash(seed, WEEKLY_CHALLENGES, 2);
    weeklyChallenges = picked.map((def) => buildInstance(def, weekStart, weekEnd));
  }

  const state: ChallengeState = {
    userId,
    dailyChallenges,
    weeklyChallenges,
    lastDailyReset: today,
    lastWeeklyReset: weekStart,
    totalChallengesCompleted: totalCompleted,
  };

  saveState(userId, state);
  return state;
}

/**
 * Increment progress on a challenge. Returns the updated challenge and whether it was just completed.
 */
export function incrementChallengeProgress(
  userId: string,
  challengeId: string,
  amount = 1,
): { state: ChallengeState; challenge: ChallengeInstance | null; justCompleted: boolean } {
  const state = ensureChallengeState(userId);
  let justCompleted = false;
  let updatedChallenge: ChallengeInstance | null = null;

  const updateList = (list: ChallengeInstance[]): ChallengeInstance[] =>
    list.map((challenge) => {
      if (challenge.id !== challengeId || challenge.status !== 'active') return challenge;

      const newProgress = Math.min(challenge.currentProgress + amount, challenge.targetValue);
      const wasIncomplete = challenge.status === 'active' && challenge.currentProgress < challenge.targetValue;
      const isNowComplete = newProgress >= challenge.targetValue;

      const newStatus: ChallengeStatus = isNowComplete ? 'completed' : 'active';

      if (wasIncomplete && isNowComplete) {
        justCompleted = true;
        state.totalChallengesCompleted += 1;
      }

      const updated: ChallengeInstance = {
        ...challenge,
        currentProgress: newProgress,
        status: newStatus,
        completedAt: isNowComplete ? new Date().toISOString() : undefined,
      };
      updatedChallenge = updated;
      return updated;
    });

  state.dailyChallenges = updateList(state.dailyChallenges);
  state.weeklyChallenges = updateList(state.weeklyChallenges);

  saveState(userId, state);
  return { state, challenge: updatedChallenge, justCompleted };
}

/**
 * Record a user activity and automatically increment matching challenges.
 * Returns challenges that were just completed.
 */
export function recordChallengeActivity(
  userId: string,
  activityType: 'habit_complete' | 'journal_entry' | 'checkin_complete' | 'streak_day' | 'perfect_day',
  amount = 1,
): ChallengeInstance[] {
  const state = ensureChallengeState(userId);
  const justCompleted: ChallengeInstance[] = [];

  const matchCategory = (challenge: ChallengeInstance): boolean => {
    switch (activityType) {
      case 'habit_complete':
        return challenge.category === 'habit';
      case 'journal_entry':
        return challenge.category === 'journal';
      case 'checkin_complete':
        return challenge.category === 'checkin';
      case 'streak_day':
        return challenge.category === 'streak';
      case 'perfect_day':
        return challenge.category === 'mixed';
      default:
        return false;
    }
  };

  const allChallenges = [...state.dailyChallenges, ...state.weeklyChallenges];
  for (const challenge of allChallenges) {
    if (challenge.status !== 'active' || !matchCategory(challenge)) continue;

    const result = incrementChallengeProgress(userId, challenge.id, amount);
    if (result.justCompleted && result.challenge) {
      justCompleted.push(result.challenge);
    }
  }

  return justCompleted;
}

/**
 * Get all active challenges (daily + weekly).
 */
export function getActiveChallenges(userId: string, now = new Date()): ChallengeInstance[] {
  const state = ensureChallengeState(userId, now);
  return [...state.dailyChallenges, ...state.weeklyChallenges];
}

/**
 * Get summary stats.
 */
export function getChallengeStats(userId: string): {
  totalCompleted: number;
  dailyCompleted: number;
  weeklyCompleted: number;
  dailyTotal: number;
  weeklyTotal: number;
} {
  const state = ensureChallengeState(userId);
  const dailyCompleted = state.dailyChallenges.filter((c) => c.status === 'completed').length;
  const weeklyCompleted = state.weeklyChallenges.filter((c) => c.status === 'completed').length;

  return {
    totalCompleted: state.totalChallengesCompleted,
    dailyCompleted,
    weeklyCompleted,
    dailyTotal: state.dailyChallenges.length,
    weeklyTotal: state.weeklyChallenges.length,
  };
}
