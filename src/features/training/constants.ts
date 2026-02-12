// Constants for Training / Exercise feature
import type { MuscleGroup, StrategyType } from './types';

export const MUSCLE_GROUPS: Array<{
  value: MuscleGroup;
  label: string;
  emoji: string;
}> = [
  { value: 'chest', label: 'Chest', emoji: '💪' },
  { value: 'back', label: 'Back', emoji: '🦾' },
  { value: 'shoulders', label: 'Shoulders', emoji: '🏋️' },
  { value: 'biceps', label: 'Biceps', emoji: '💪' },
  { value: 'triceps', label: 'Triceps', emoji: '💪' },
  { value: 'legs', label: 'Legs', emoji: '🦵' },
  { value: 'glutes', label: 'Glutes', emoji: '🍑' },
  { value: 'core', label: 'Core', emoji: '🧘' },
  { value: 'cardio', label: 'Cardio', emoji: '❤️' },
  { value: 'flexibility', label: 'Flexibility', emoji: '🤸' },
  { value: 'other', label: 'Other', emoji: '⭐' },
];

export const STRATEGY_TYPES: Array<{
  value: StrategyType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'weekly_target',
    label: 'Weekly Target',
    description: 'Hit a rep/set target each week',
    icon: '📅',
  },
  {
    value: 'monthly_target',
    label: 'Monthly Target',
    description: 'Achieve a monthly rep/set goal',
    icon: '📆',
  },
  {
    value: 'rolling_window',
    label: 'Rolling Window',
    description: 'Track progress over last N days',
    icon: '🔄',
  },
  {
    value: 'duration',
    label: 'Duration Goal',
    description: 'Track active minutes instead of reps',
    icon: '⏱️',
  },
  {
    value: 'focus_muscle',
    label: 'Focus Muscle',
    description: 'Target specific muscle groups',
    icon: '🎯',
  },
  {
    value: 'streak',
    label: 'Workout Streak',
    description: 'Maintain consistent workout days',
    icon: '🔥',
  },
  {
    value: 'variety',
    label: 'Exercise Variety',
    description: 'Try different exercises each week',
    icon: '🌈',
  },
  {
    value: 'progressive_load',
    label: 'Progressive Load',
    description: 'Increase weight lifted weekly',
    icon: '📈',
  },
  {
    value: 'micro_goal',
    label: 'Daily Micro Goal',
    description: 'Small daily targets that add up',
    icon: '🎯',
  },
  {
    value: 'recovery',
    label: 'Recovery Sessions',
    description: 'Track mobility and recovery work',
    icon: '🧘',
  },
];

export const COMMON_EXERCISES: Array<{
  name: string;
  defaultMuscles: MuscleGroup[];
}> = [
  { name: 'Bench Press', defaultMuscles: ['chest', 'triceps'] },
  { name: 'Push-ups', defaultMuscles: ['chest', 'triceps', 'shoulders'] },
  { name: 'Dumbbell Flyes', defaultMuscles: ['chest'] },
  { name: 'Pull-ups', defaultMuscles: ['back', 'biceps'] },
  { name: 'Barbell Rows', defaultMuscles: ['back'] },
  { name: 'Deadlifts', defaultMuscles: ['back', 'legs', 'glutes'] },
  { name: 'Lat Pulldown', defaultMuscles: ['back', 'biceps'] },
  { name: 'Shoulder Press', defaultMuscles: ['shoulders', 'triceps'] },
  { name: 'Lateral Raises', defaultMuscles: ['shoulders'] },
  { name: 'Front Raises', defaultMuscles: ['shoulders'] },
  { name: 'Bicep Curls', defaultMuscles: ['biceps'] },
  { name: 'Hammer Curls', defaultMuscles: ['biceps'] },
  { name: 'Tricep Dips', defaultMuscles: ['triceps'] },
  { name: 'Tricep Extensions', defaultMuscles: ['triceps'] },
  { name: 'Squats', defaultMuscles: ['legs', 'glutes'] },
  { name: 'Lunges', defaultMuscles: ['legs', 'glutes'] },
  { name: 'Leg Press', defaultMuscles: ['legs', 'glutes'] },
  { name: 'Leg Curls', defaultMuscles: ['legs'] },
  { name: 'Calf Raises', defaultMuscles: ['legs'] },
  { name: 'Hip Thrusts', defaultMuscles: ['glutes'] },
  { name: 'Planks', defaultMuscles: ['core'] },
  { name: 'Crunches', defaultMuscles: ['core'] },
  { name: 'Russian Twists', defaultMuscles: ['core'] },
  { name: 'Running', defaultMuscles: ['cardio', 'legs'] },
  { name: 'Cycling', defaultMuscles: ['cardio', 'legs'] },
  { name: 'Swimming', defaultMuscles: ['cardio'] },
  { name: 'Jump Rope', defaultMuscles: ['cardio', 'legs'] },
  { name: 'Burpees', defaultMuscles: ['cardio', 'core'] },
  { name: 'Yoga', defaultMuscles: ['flexibility', 'core'] },
  { name: 'Stretching', defaultMuscles: ['flexibility'] },
];
