import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import { v4 as uuidv4 } from 'uuid';

export type MeditationSession = Database['public']['Tables']['meditation_sessions']['Row'];
type MeditationSessionInsert = Database['public']['Tables']['meditation_sessions']['Insert'];
type MeditationSessionUpdate = Database['public']['Tables']['meditation_sessions']['Update'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// Demo data storage
const demoMeditationSessions: Map<string, MeditationSession[]> = new Map();

/**
 * Get demo meditation sessions for a user
 */
function getDemoMeditationSessions(userId: string): MeditationSession[] {
  if (!demoMeditationSessions.has(userId)) {
    // Initialize with some sample sessions
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    demoMeditationSessions.set(userId, [
      {
        id: uuidv4(),
        user_id: userId,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        session_date: yesterday,
        session_type: 'breathing',
        duration_seconds: 180,
        completed: true,
        notes: null,
      },
      {
        id: uuidv4(),
        user_id: userId,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        session_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        session_type: 'breathing',
        duration_seconds: 180,
        completed: true,
        notes: null,
      },
    ]);
  }
  return demoMeditationSessions.get(userId) ?? [];
}

/**
 * Add demo meditation session
 */
function addDemoMeditationSession(userId: string, session: MeditationSession): void {
  const sessions = getDemoMeditationSessions(userId);
  sessions.push(session);
  demoMeditationSessions.set(userId, sessions);
}

/**
 * List meditation sessions for the current user
 */
export async function listMeditationSessions(
  userId: string,
  limit: number = 100,
): Promise<ServiceResponse<MeditationSession[]>> {
  if (!canUseSupabaseData()) {
    const sessions = getDemoMeditationSessions(userId);
    // Sort by session_date descending, then created_at descending
    const sorted = [...sessions].sort((a, b) => {
      const dateCompare = b.session_date.localeCompare(a.session_date);
      if (dateCompare !== 0) return dateCompare;
      return b.created_at.localeCompare(a.created_at);
    });
    return { data: sorted.slice(0, limit), error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<MeditationSession[]>();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Create a new meditation session
 */
export async function createMeditationSession(
  payload: MeditationSessionInsert,
): Promise<ServiceResponse<MeditationSession>> {
  if (!canUseSupabaseData()) {
    const session: MeditationSession = {
      id: uuidv4(),
      user_id: payload.user_id,
      created_at: payload.created_at ?? new Date().toISOString(),
      session_date: payload.session_date ?? new Date().toISOString().split('T')[0],
      session_type: payload.session_type ?? 'breathing',
      duration_seconds: payload.duration_seconds,
      completed: payload.completed ?? true,
      notes: payload.notes ?? null,
    };
    addDemoMeditationSession(payload.user_id, session);
    return { data: session, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_sessions')
    .insert(payload)
    .select()
    .returns<MeditationSession>()
    .single();

  return { data: response.data ?? null, error: response.error };
}

/**
 * Calculate meditation streak from sorted sessions (most recent first)
 */
function calculateStreak(sessions: { session_date: string }[]): number {
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();

  for (const session of sessions) {
    const sessionDate = session.session_date;
    const expectedDate = checkDate.toISOString().split('T')[0];

    if (sessionDate === expectedDate || (currentStreak === 0 && sessionDate === today)) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 86400000); // Move back one day
    } else if (
      currentStreak === 0 &&
      sessionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
    ) {
      // Allow streak to start from yesterday
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 172800000); // Move back two days
    } else {
      break;
    }
  }

  return currentStreak;
}

/**
 * Get meditation stats for a user
 */
export async function getMeditationStats(userId: string): Promise<
  ServiceResponse<{
    totalMinutes: number;
    totalSessions: number;
    currentStreak: number;
  }>
> {
  if (!canUseSupabaseData()) {
    const sessions = getDemoMeditationSessions(userId);
    const completedSessions = sessions.filter((s) => s.completed);
    const totalMinutes = Math.round(
      completedSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    );
    const totalSessions = completedSessions.length;

    // Calculate streak
    const sortedSessions = [...completedSessions].sort((a, b) =>
      b.session_date.localeCompare(a.session_date),
    );
    const currentStreak = calculateStreak(sortedSessions);

    return {
      data: { totalMinutes, totalSessions, currentStreak },
      error: null,
    };
  }

  const supabase = getSupabaseClient();

  try {
    // Get total stats
    const { data: sessions, error: sessionsError } = await supabase
      .from('meditation_sessions')
      .select('session_date, duration_seconds, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('session_date', { ascending: false });

    if (sessionsError) {
      return { data: null, error: sessionsError };
    }

    const totalMinutes = Math.round(
      (sessions ?? []).reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    );
    const totalSessions = sessions?.length ?? 0;

    // Calculate streak
    const currentStreak = calculateStreak(sessions ?? []);

    return {
      data: { totalMinutes, totalSessions, currentStreak },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch meditation stats'),
    };
  }
}

/**
 * Placeholder meditation sessions for the library
 */
export const PLACEHOLDER_SESSIONS = [
  {
    id: 'one-minute-reset',
    title: '1-Minute Reset',
    description: 'A quick 60-second reset to refocus',
    duration: 60,
    type: 'breathing',
    icon: '⏱️',
  },
  {
    id: 'quick-breathing',
    title: '3-Minute Breathing',
    description: 'A quick breathing exercise to center yourself',
    duration: 180,
    type: 'breathing',
    icon: '🌬️',
  },
  {
    id: 'focused-breathing',
    title: '5-Minute Focus',
    description: 'Build focus with mindful breathing',
    duration: 300,
    type: 'breathing',
    icon: '🎯',
  },
  {
    id: 'deep-relaxation',
    title: '10-Minute Deep Relaxation',
    description: 'Deeply relax your mind and body',
    duration: 600,
    type: 'breathing',
    icon: '🧘',
  },
] as const;

// =====================================================
// MEDITATION GOALS SERVICE
// =====================================================

import type {
  MeditationGoal,
  DailyCompletion,
  MeditationGoalWithCompletions,
  GoalProgressStats,
  DailyChallenge,
  UserSkill,
} from '../types/meditation';

// Demo data storage for goals
const demoMeditationGoals: Map<string, MeditationGoal[]> = new Map();
const demoDailyCompletions: Map<string, DailyCompletion[]> = new Map();
const demoDailyChallenges: Map<string, DailyChallenge[]> = new Map();
const demoUserSkills: Map<string, UserSkill[]> = new Map();

/**
 * Create a new meditation goal
 */
export async function createMeditationGoal(
  userId: string,
  targetDays: number,
  reminderTime?: string,
): Promise<ServiceResponse<MeditationGoal>> {
  if (!canUseSupabaseData()) {
    const goal: MeditationGoal = {
      id: uuidv4(),
      user_id: userId,
      start_date: new Date().toISOString().split('T')[0],
      target_days: targetDays,
      completed_days: 0,
      is_active: true,
      reminder_time: reminderTime || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const goals = demoMeditationGoals.get(userId) || [];
    goals.push(goal);
    demoMeditationGoals.set(userId, goals);
    return { data: goal, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_goals' as any)
    .insert({
      user_id: userId,
      start_date: new Date().toISOString().split('T')[0],
      target_days: targetDays,
      completed_days: 0,
      is_active: true,
      reminder_time: reminderTime || null,
    })
    .select()
    .single();

  return { data: response.data as any ?? null, error: response.error };
}

/**
 * Get active meditation goal for a user
 */
export async function getActiveMeditationGoal(
  userId: string,
): Promise<ServiceResponse<MeditationGoalWithCompletions>> {
  if (!canUseSupabaseData()) {
    const goals = demoMeditationGoals.get(userId) || [];
    const activeGoal = goals.find((g) => g.is_active);
    if (!activeGoal) {
      return { data: null, error: null };
    }
    const completions = (demoDailyCompletions.get(userId) || []).filter(
      (c) => c.goal_id === activeGoal.id,
    );
    return {
      data: { ...activeGoal, completions },
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('meditation_goals' as any)
    .select('*, daily_completions(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (response.error || !response.data) {
    return { data: null, error: response.error };
  }

  const goal: MeditationGoalWithCompletions = {
    id: (response.data as any).id,
    user_id: (response.data as any).user_id,
    start_date: (response.data as any).start_date,
    target_days: (response.data as any).target_days,
    completed_days: (response.data as any).completed_days,
    is_active: (response.data as any).is_active,
    reminder_time: (response.data as any).reminder_time,
    created_at: (response.data as any).created_at,
    updated_at: (response.data as any).updated_at,
    completions: (response.data as any).daily_completions || [],
  };

  return { data: goal, error: null };
}

/**
 * Complete a day for a meditation goal
 */
export async function completeMeditationDay(
  goalId: string,
  date: string,
  durationMinutes: number,
  activityType: 'meditation' | 'breathing' | 'body',
): Promise<ServiceResponse<DailyCompletion>> {
  if (!canUseSupabaseData()) {
    const completion: DailyCompletion = {
      id: uuidv4(),
      goal_id: goalId,
      completion_date: date,
      duration_minutes: durationMinutes,
      activity_type: activityType,
      notes: null,
      created_at: new Date().toISOString(),
    };
    const completions = demoDailyCompletions.get(goalId) || [];
    completions.push(completion);
    demoDailyCompletions.set(goalId, completions);

    // Update goal completed_days
    const allGoals = Array.from(demoMeditationGoals.values()).flat();
    const goal = allGoals.find((g) => g.id === goalId);
    if (goal) {
      goal.completed_days += 1;
      goal.updated_at = new Date().toISOString();
    }

    return { data: completion, error: null };
  }

  const supabase = getSupabaseClient();

  // Insert completion
  const { data: completion, error: insertError } = await supabase
    .from('daily_completions' as any)
    .insert({
      goal_id: goalId,
      completion_date: date,
      duration_minutes: durationMinutes,
      activity_type: activityType,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError };
  }

  // Update goal completed_days count
  const { error: updateError } = await (supabase.rpc as any)('increment_meditation_goal_days', {
    goal_id: goalId,
  });

  if (updateError) {
    console.warn('Failed to update goal completed_days:', updateError);
  }

  return { data: completion as any ?? null, error: insertError };
}

/**
 * Get goal progress statistics
 */
export async function getMeditationGoalProgress(
  goalId: string,
): Promise<ServiceResponse<GoalProgressStats>> {
  if (!canUseSupabaseData()) {
    const allGoals = Array.from(demoMeditationGoals.values()).flat();
    const goal = allGoals.find((g) => g.id === goalId);
    if (!goal) {
      return { data: null, error: new Error('Goal not found') };
    }

    const completions = demoDailyCompletions.get(goalId) || [];
    const daysRemaining = Math.max(0, goal.target_days - goal.completed_days);
    const progressPercentage = (goal.completed_days / goal.target_days) * 100;
    const isCompleted = goal.completed_days >= goal.target_days;

    // Calculate streak
    const sortedCompletions = [...completions].sort(
      (a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime(),
    );
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);

    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.completion_date);
      completionDate.setHours(0, 0, 0, 0);
      if (completionDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      data: {
        goalId: goal.id,
        completedDays: goal.completed_days,
        targetDays: goal.target_days,
        currentStreak,
        daysRemaining,
        progressPercentage,
        isCompleted,
      },
      error: null,
    };
  }

  const supabase = getSupabaseClient();
  const { data: goal, error } = await supabase
    .from('meditation_goals' as any)
    .select('*, daily_completions(*)')
    .eq('id', goalId)
    .single();

  if (error || !goal) {
    return { data: null, error };
  }

  const completions = (goal as any).daily_completions || [];
  const daysRemaining = Math.max(0, (goal as any).target_days - (goal as any).completed_days);
  const progressPercentage = ((goal as any).completed_days / (goal as any).target_days) * 100;
  const isCompleted = (goal as any).completed_days >= (goal as any).target_days;

  // Calculate streak
  const sortedCompletions = [...completions].sort(
    (a: any, b: any) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime(),
  );
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let checkDate = new Date(today);

  for (const completion of sortedCompletions) {
    const completionDate = new Date((completion as any).completion_date);
    completionDate.setHours(0, 0, 0, 0);
    if (completionDate.getTime() === checkDate.getTime()) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    data: {
      goalId: (goal as any).id,
      completedDays: (goal as any).completed_days,
      targetDays: (goal as any).target_days,
      currentStreak,
      daysRemaining,
      progressPercentage,
      isCompleted,
    },
    error: null,
  };
}

/**
 * Get or create today's daily challenge
 */
export async function getTodaysDailyChallenge(
  userId: string,
): Promise<ServiceResponse<DailyChallenge>> {
  const today = new Date().toISOString().split('T')[0];

  if (!canUseSupabaseData()) {
    const challenges = demoDailyChallenges.get(userId) || [];
    let todayChallenge = challenges.find((c) => c.challenge_date === today);

    if (!todayChallenge) {
      // Generate a random challenge
      const challengeTypes: Array<'duration' | 'frequency' | 'variety'> = [
        'duration',
        'frequency',
        'variety',
      ];
      const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
      const descriptions = {
        duration: 'Meditate for 10 minutes today',
        frequency: 'Complete 3 meditation sessions today',
        variety: 'Try 2 different types of meditation today',
      };
      const targets = {
        duration: 10,
        frequency: 3,
        variety: 2,
      };

      todayChallenge = {
        id: uuidv4(),
        user_id: userId,
        challenge_date: today,
        challenge_type: type,
        description: descriptions[type],
        target_value: targets[type],
        current_progress: 0,
        bonus_xp: 50,
        is_completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      challenges.push(todayChallenge);
      demoDailyChallenges.set(userId, challenges);
    }

    return { data: todayChallenge, error: null };
  }

  const supabase = getSupabaseClient();
  const { data: existingChallenge } = await supabase
    .from('daily_challenges' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_date', today)
    .single();

  if (existingChallenge) {
    return { data: existingChallenge as any, error: null };
  }

  // Generate a new challenge
  const challengeTypes: Array<'duration' | 'frequency' | 'variety'> = [
    'duration',
    'frequency',
    'variety',
  ];
  const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
  const descriptions = {
    duration: 'Meditate for 10 minutes today',
    frequency: 'Complete 3 meditation sessions today',
    variety: 'Try 2 different types of meditation today',
  };
  const targets = {
    duration: 10,
    frequency: 3,
    variety: 2,
  };

  const { data: newChallenge, error } = await supabase
    .from('daily_challenges' as any)
    .insert({
      user_id: userId,
      challenge_date: today,
      challenge_type: type,
      description: descriptions[type],
      target_value: targets[type],
      current_progress: 0,
      bonus_xp: 50,
      is_completed: false,
    })
    .select()
    .single();

  return { data: newChallenge as any ?? null, error };
}

/**
 * Update daily challenge progress
 */
export async function updateDailyChallengeProgress(
  challengeId: string,
  progress: number,
): Promise<ServiceResponse<DailyChallenge>> {
  if (!canUseSupabaseData()) {
    const allChallenges = Array.from(demoDailyChallenges.values()).flat();
    const challenge = allChallenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { data: null, error: new Error('Challenge not found') };
    }

    challenge.current_progress = progress;
    if (progress >= challenge.target_value && !challenge.is_completed) {
      challenge.is_completed = true;
      challenge.completed_at = new Date().toISOString();
    }

    return { data: challenge, error: null };
  }

  const supabase = getSupabaseClient();

  // Get current challenge
  const { data: challenge } = await supabase
    .from('daily_challenges' as any)
    .select('*')
    .eq('id', challengeId)
    .single();

  if (!challenge) {
    return { data: null, error: new Error('Challenge not found') };
  }

  const isCompleted = progress >= (challenge as any).target_value;
  const { data: updated, error } = await supabase
    .from('daily_challenges' as any)
    .update({
      current_progress: progress,
      is_completed: isCompleted,
      completed_at: isCompleted && !(challenge as any).is_completed ? new Date().toISOString() : (challenge as any).completed_at,
    })
    .eq('id', challengeId)
    .select()
    .single();

  return { data: updated as any ?? null, error };
}

/**
 * Get user skills
 */
export async function getUserSkills(userId: string): Promise<ServiceResponse<UserSkill[]>> {
  if (!canUseSupabaseData()) {
    const skills = demoUserSkills.get(userId) || [];
    return { data: skills, error: null };
  }

  const supabase = getSupabaseClient();
  const response = await supabase
    .from('user_skills' as any)
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  return { data: response.data as any ?? null, error: response.error };
}

/**
 * Unlock or update a user skill
 */
export async function unlockSkill(
  userId: string,
  skillName: string,
  experiencePoints: number = 0,
): Promise<ServiceResponse<UserSkill>> {
  if (!canUseSupabaseData()) {
    const skills = demoUserSkills.get(userId) || [];
    let skill = skills.find((s) => s.skill_name === skillName);

    if (!skill) {
      skill = {
        id: uuidv4(),
        user_id: userId,
        skill_name: skillName,
        skill_level: 1,
        experience_points: experiencePoints,
        unlocked_at: new Date().toISOString(),
      };
      skills.push(skill);
      demoUserSkills.set(userId, skills);
    } else {
      skill.experience_points += experiencePoints;
      skill.skill_level = Math.floor(skill.experience_points / 100) + 1;
    }

    return { data: skill, error: null };
  }

  const supabase = getSupabaseClient();

  // Try to get existing skill
  const { data: existing } = await supabase
    .from('user_skills' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('skill_name', skillName)
    .single();

  if (existing) {
    // Update existing skill
    const newXP = (existing as any).experience_points + experiencePoints;
    const newLevel = Math.floor(newXP / 100) + 1;
    const { data: updated, error } = await supabase
      .from('user_skills' as any)
      .update({
        experience_points: newXP,
        skill_level: newLevel,
      })
      .eq('id', (existing as any).id)
      .select()
      .single();

    return { data: updated as any ?? null, error };
  }

  // Create new skill
  const { data: newSkill, error } = await supabase
    .from('user_skills' as any)
    .insert({
      user_id: userId,
      skill_name: skillName,
      skill_level: 1,
      experience_points: experiencePoints,
    })
    .select()
    .single();

  return { data: newSkill as any ?? null, error };
}
