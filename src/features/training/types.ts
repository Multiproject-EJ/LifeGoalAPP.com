// TypeScript types for Training / Exercise feature

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'cardio'
  | 'flexibility'
  | 'other';

export type StrategyType =
  | 'weekly_target'
  | 'monthly_target'
  | 'rolling_window'
  | 'duration'
  | 'focus_muscle'
  | 'streak'
  | 'variety'
  | 'progressive_load'
  | 'micro_goal'
  | 'recovery';

export type StrategyStatus = 'on_track' | 'at_risk' | 'unreachable';

export interface ExerciseLog {
  id: string;
  user_id: string;
  exercise_name: string;
  muscle_groups: string[];
  reps?: number | null;
  sets?: number | null;
  weight_kg?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
  logged_at: string;
  created_at?: string | null;
}

export interface TrainingStrategy {
  id: string;
  user_id: string;
  name: string;
  strategy_type: StrategyType | string;
  exercise_name?: string | null;
  target_value: number;
  target_unit: string;
  time_window_days: number;
  focus_muscles: string[];
  is_active: boolean;
  created_at?: string | null;
}

export interface StrategyProgress {
  current: number;
  target: number;
  percentage: number;
  status: StrategyStatus;
  forecastMessage: string;
}

export interface TodaySummary {
  totalExercises: number;
  totalReps: number;
  totalDuration: number;
}
