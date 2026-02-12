// Strategy Engine - Pure functions for calculating training strategy progress
import type { TrainingStrategy, ExerciseLog, StrategyProgress, StrategyStatus } from './types';

/**
 * Calculate progress for a training strategy based on exercise logs
 */
export function calculateProgress(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  switch (strategy.strategy_type) {
    case 'weekly_target':
      return calculateWeeklyTarget(strategy, logs);
    case 'monthly_target':
      return calculateMonthlyTarget(strategy, logs);
    case 'rolling_window':
      return calculateRollingWindow(strategy, logs);
    case 'duration':
      return calculateDuration(strategy, logs);
    case 'focus_muscle':
      return calculateFocusMuscle(strategy, logs);
    case 'streak':
      return calculateStreak(strategy, logs);
    case 'variety':
      return calculateVariety(strategy, logs);
    case 'progressive_load':
      return calculateProgressiveLoad(strategy, logs);
    case 'micro_goal':
      return calculateMicroGoal(strategy, logs);
    case 'recovery':
      return calculateRecovery(strategy, logs);
    default:
      return {
        current: 0,
        target: strategy.target_value,
        percentage: 0,
        status: 'unreachable',
        forecastMessage: 'Unknown strategy type',
      };
  }
}

/**
 * Get the start and end of the current week (Monday to Sunday)
 */
function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is day 1
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get the start and end of the current month
 */
function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Filter logs within a date range
 */
function filterLogsByDateRange(logs: ExerciseLog[], start: Date, end: Date): ExerciseLog[] {
  return logs.filter((log) => {
    const logDate = new Date(log.logged_at);
    return logDate >= start && logDate <= end;
  });
}

/**
 * Filter logs by exercise name (case-insensitive)
 */
function filterLogsByExercise(logs: ExerciseLog[], exerciseName?: string | null): ExerciseLog[] {
  if (!exerciseName) return logs;
  const lowerName = exerciseName.toLowerCase();
  return logs.filter((log) => log.exercise_name.toLowerCase().includes(lowerName));
}

/**
 * Filter logs by muscle groups
 */
function filterLogsByMuscles(logs: ExerciseLog[], muscles: string[]): ExerciseLog[] {
  if (muscles.length === 0) return logs;
  return logs.filter((log) =>
    log.muscle_groups.some((muscle) => muscles.includes(muscle))
  );
}

/**
 * Sum reps from logs
 */
function sumReps(logs: ExerciseLog[]): number {
  return logs.reduce((sum, log) => sum + (log.reps || 0) * (log.sets || 1), 0);
}

/**
 * Sum duration from logs
 */
function sumDuration(logs: ExerciseLog[]): number {
  return logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
}

/**
 * Calculate status based on percentage and expected pace
 */
function calculateStatus(
  percentage: number,
  expectedPercentage: number
): StrategyStatus {
  const ratio = expectedPercentage > 0 ? percentage / expectedPercentage : 0;
  if (ratio >= 1) return 'on_track';
  if (ratio >= 0.5) return 'at_risk';
  return 'unreachable';
}

/**
 * Weekly Target Strategy
 */
function calculateWeeklyTarget(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentWeekRange();
  const weekLogs = filterLogsByDateRange(logs, start, end);
  const filteredLogs = filterLogsByExercise(weekLogs, strategy.exercise_name);
  const current = sumReps(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  // Calculate expected progress based on day of week
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Sunday = 7
  const expectedPercentage = (dayOfWeek / 7) * 100;

  const status = calculateStatus(percentage, expectedPercentage);

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = 'On pace to hit your weekly target!';
  } else if (status === 'at_risk') {
    const remaining = target - current;
    const daysLeft = 8 - dayOfWeek;
    const perDay = Math.ceil(remaining / daysLeft);
    forecastMessage = `Need ~${perDay} reps/day to reach target`;
  } else {
    forecastMessage = 'Target may be unreachable this week';
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Monthly Target Strategy
 */
function calculateMonthlyTarget(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentMonthRange();
  const monthLogs = filterLogsByDateRange(logs, start, end);
  const filteredLogs = filterLogsByExercise(monthLogs, strategy.exercise_name);
  const current = sumReps(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  // Calculate expected progress based on day of month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedPercentage = (dayOfMonth / daysInMonth) * 100;

  const status = calculateStatus(percentage, expectedPercentage);

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = 'On pace to hit your monthly target!';
  } else if (status === 'at_risk') {
    const remaining = target - current;
    const daysLeft = daysInMonth - dayOfMonth + 1;
    const perDay = Math.ceil(remaining / daysLeft);
    forecastMessage = `Need ~${perDay} reps/day to reach target`;
  } else {
    forecastMessage = 'Target may be unreachable this month';
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Rolling Window Strategy
 */
function calculateRollingWindow(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - strategy.time_window_days);
  start.setHours(0, 0, 0, 0);

  const windowLogs = filterLogsByDateRange(logs, start, now);
  const filteredLogs = filterLogsByExercise(windowLogs, strategy.exercise_name);
  const current = sumReps(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const status: StrategyStatus =
    percentage >= 100 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'unreachable';

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = `Hit your ${strategy.time_window_days}-day target!`;
  } else if (status === 'at_risk') {
    const remaining = target - current;
    forecastMessage = `${remaining} reps needed in the window`;
  } else {
    forecastMessage = 'Progress is below target';
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Duration Strategy
 */
function calculateDuration(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentWeekRange();
  const weekLogs = filterLogsByDateRange(logs, start, end);
  const filteredLogs = filterLogsByExercise(weekLogs, strategy.exercise_name);
  const current = sumDuration(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const expectedPercentage = (dayOfWeek / 7) * 100;

  const status = calculateStatus(percentage, expectedPercentage);

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = 'On pace to hit your duration target!';
  } else if (status === 'at_risk') {
    const remaining = Math.ceil(target - current);
    forecastMessage = `Need ${remaining} more minutes this week`;
  } else {
    forecastMessage = 'Duration target may be unreachable';
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Focus Muscle Strategy
 */
function calculateFocusMuscle(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentMonthRange();
  const monthLogs = filterLogsByDateRange(logs, start, end);
  const filteredLogs = filterLogsByMuscles(monthLogs, strategy.focus_muscles);
  const current = sumReps(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedPercentage = (dayOfMonth / daysInMonth) * 100;

  const status = calculateStatus(percentage, expectedPercentage);

  const musclesList = strategy.focus_muscles.join(', ');
  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = `Great focus on ${musclesList}!`;
  } else if (status === 'at_risk') {
    const remaining = target - current;
    forecastMessage = `${remaining} more reps needed for ${musclesList}`;
  } else {
    forecastMessage = 'Need more focus on target muscles';
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Streak Strategy
 */
function calculateStreak(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentWeekRange();
  const weekLogs = filterLogsByDateRange(logs, start, end);

  // Count distinct workout days
  const uniqueDays = new Set(
    weekLogs.map((log) => new Date(log.logged_at).toDateString())
  );
  const current = uniqueDays.size;
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const status: StrategyStatus =
    percentage >= 100 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'unreachable';

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = `${current} workout days - streak maintained!`;
  } else {
    const remaining = target - current;
    forecastMessage = `${remaining} more workout days needed this week`;
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Variety Strategy
 */
function calculateVariety(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentWeekRange();
  const weekLogs = filterLogsByDateRange(logs, start, end);

  // Count distinct exercise types
  const uniqueExercises = new Set(
    weekLogs.map((log) => log.exercise_name.toLowerCase())
  );
  const current = uniqueExercises.size;
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const status: StrategyStatus =
    percentage >= 100 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'unreachable';

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = `${current} different exercises - great variety!`;
  } else {
    const remaining = target - current;
    forecastMessage = `Try ${remaining} more exercise types this week`;
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Progressive Load Strategy
 */
function calculateProgressiveLoad(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start: thisWeekStart, end: thisWeekEnd } = getCurrentWeekRange();
  const thisWeekLogs = filterLogsByDateRange(logs, thisWeekStart, thisWeekEnd);
  const filteredThisWeek = filterLogsByExercise(thisWeekLogs, strategy.exercise_name);

  // Calculate this week's total load (weight × reps)
  const thisWeekLoad = filteredThisWeek.reduce(
    (sum, log) => sum + (log.weight_kg || 0) * (log.reps || 0) * (log.sets || 1),
    0
  );

  // Calculate last week's total load
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);
  const lastWeekLogs = filterLogsByDateRange(logs, lastWeekStart, lastWeekEnd);
  const filteredLastWeek = filterLogsByExercise(lastWeekLogs, strategy.exercise_name);
  const lastWeekLoad = filteredLastWeek.reduce(
    (sum, log) => sum + (log.weight_kg || 0) * (log.reps || 0) * (log.sets || 1),
    0
  );

  const target = lastWeekLoad + strategy.target_value; // Target is last week + increase
  const current = thisWeekLoad;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const expectedPercentage = (dayOfWeek / 7) * 100;

  const status = calculateStatus(percentage, expectedPercentage);

  let forecastMessage = '';
  if (lastWeekLoad === 0) {
    forecastMessage = 'No baseline - start tracking weight!';
  } else if (status === 'on_track') {
    const increase = thisWeekLoad - lastWeekLoad;
    forecastMessage = `+${increase.toFixed(0)} kg from last week!`;
  } else {
    const needed = target - current;
    forecastMessage = `${needed.toFixed(0)} kg more needed vs last week`;
  }

  return {
    current: Math.round(current),
    target: Math.round(target),
    percentage,
    status,
    forecastMessage,
  };
}

/**
 * Micro Goal Strategy (Daily)
 */
function calculateMicroGoal(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayLogs = filterLogsByDateRange(logs, today, tomorrow);
  const filteredLogs = filterLogsByExercise(todayLogs, strategy.exercise_name);
  const current = sumReps(filteredLogs);
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const status: StrategyStatus =
    percentage >= 100 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'unreachable';

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = "Today's micro goal complete!";
  } else {
    const remaining = target - current;
    forecastMessage = `${remaining} more reps to hit today's goal`;
  }

  return { current, target, percentage, status, forecastMessage };
}

/**
 * Recovery Strategy
 */
function calculateRecovery(
  strategy: TrainingStrategy,
  logs: ExerciseLog[]
): StrategyProgress {
  const { start, end } = getCurrentWeekRange();
  const weekLogs = filterLogsByDateRange(logs, start, end);

  // Filter for recovery-related exercises (flexibility, stretching, yoga, etc.)
  const recoveryLogs = weekLogs.filter(
    (log) =>
      log.muscle_groups.includes('flexibility') ||
      log.exercise_name.toLowerCase().includes('stretch') ||
      log.exercise_name.toLowerCase().includes('yoga') ||
      log.exercise_name.toLowerCase().includes('recovery')
  );

  // Count recovery sessions
  const current = recoveryLogs.length;
  const target = strategy.target_value;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const status: StrategyStatus =
    percentage >= 100 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'unreachable';

  let forecastMessage = '';
  if (status === 'on_track') {
    forecastMessage = `${current} recovery sessions - great balance!`;
  } else {
    const remaining = target - current;
    forecastMessage = `${remaining} more recovery sessions needed`;
  }

  return { current, target, percentage, status, forecastMessage };
}
