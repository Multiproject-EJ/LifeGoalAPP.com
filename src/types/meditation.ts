/**
 * Types for guided meditation feature
 */

export type RevealMode = 'word' | 'sentence' | 'paragraph';

export type MeditationContent = {
  id: string;
  title: string;
  theme: string; // e.g., "Simple focus · presence · returning"
  content: string; // Full meditation text
  isPlaceholder: boolean; // True if meditation is not yet available
  placeholderMessage?: string; // Message to show for placeholder meditations
};

export type MeditationChunk = {
  text: string;
  index: number;
};

/**
 * Configuration for a meditation session
 */
export type MeditationSessionConfig = {
  meditationId: string;
  durationMinutes: number;
  revealMode: RevealMode;
};

/**
 * Meditation goal tracking types
 */
export interface MeditationGoal {
  id: string;
  user_id: string;
  start_date: string; // ISO date string
  target_days: number;
  completed_days: number;
  is_active: boolean;
  reminder_time: string | null; // HH:MM format
  created_at: string;
  updated_at: string;
}

export interface DailyCompletion {
  id: string;
  goal_id: string;
  completion_date: string; // ISO date string
  duration_minutes: number | null;
  activity_type: 'meditation' | 'breathing' | 'body';
  notes: string | null;
  created_at: string;
}

export interface DailyChallenge {
  id: string;
  user_id: string;
  challenge_date: string; // ISO date string
  challenge_type: 'duration' | 'frequency' | 'variety';
  description: string;
  target_value: number;
  current_progress: number;
  bonus_xp: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_name: string;
  skill_level: number;
  experience_points: number;
  unlocked_at: string;
}

/**
 * Meditation goal with completions
 */
export interface MeditationGoalWithCompletions extends MeditationGoal {
  completions: DailyCompletion[];
}

/**
 * Goal progress stats
 */
export interface GoalProgressStats {
  goalId: string;
  completedDays: number;
  targetDays: number;
  currentStreak: number;
  daysRemaining: number;
  progressPercentage: number;
  isCompleted: boolean;
}
