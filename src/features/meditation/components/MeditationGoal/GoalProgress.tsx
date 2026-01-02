import { useMemo } from 'react';
import type { MeditationGoalWithCompletions } from '../../../../types/meditation';
import './GoalProgress.css';

interface GoalProgressProps {
  goal: MeditationGoalWithCompletions;
}

export function GoalProgress({ goal }: GoalProgressProps) {
  const { calendarDays, currentStreak } = useMemo(() => {
    const startDate = new Date(goal.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days: Array<{
      date: Date;
      isCompleted: boolean;
      isPast: boolean;
      isFuture: boolean;
      dayNumber: number;
    }> = [];
    
    // Generate calendar days from start date to target days
    for (let i = 0; i < goal.target_days; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      
      const dateStr = dayDate.toISOString().split('T')[0];
      const isCompleted = goal.completions.some(
        (c) => c.completion_date === dateStr
      );
      
      days.push({
        date: dayDate,
        isCompleted,
        isPast: dayDate < today,
        isFuture: dayDate > today,
        dayNumber: i + 1,
      });
    }
    
    // Calculate current streak
    let streak = 0;
    const sortedCompletions = [...goal.completions].sort(
      (a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
    );
    
    let checkDate = new Date(today);
    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.completion_date);
      completionDate.setHours(0, 0, 0, 0);
      
      if (completionDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return { calendarDays: days, currentStreak: streak };
  }, [goal]);
  
  const progressPercent = (goal.completed_days / goal.target_days) * 100;
  
  return (
    <div className="goal-progress">
      <div className="goal-progress__header">
        <h3 className="goal-progress__title">Daily Progress</h3>
        <div className="goal-progress__streak">
          <span className="goal-progress__streak-icon">🔥</span>
          <span className="goal-progress__streak-count">{currentStreak}</span>
          <span className="goal-progress__streak-label">day streak</span>
        </div>
      </div>
      
      <div className="goal-progress__bar-container">
        <div className="goal-progress__bar">
          <div
            className="goal-progress__bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="goal-progress__bar-label">
          {goal.completed_days} of {goal.target_days} days ({Math.round(progressPercent)}%)
        </div>
      </div>
      
      <div className="goal-progress__calendar">
        {calendarDays.map((day) => (
          <div
            key={day.dayNumber}
            className={`goal-progress__day ${
              day.isCompleted ? 'goal-progress__day--completed' : ''
            } ${
              day.isPast && !day.isCompleted ? 'goal-progress__day--missed' : ''
            } ${
              day.isFuture ? 'goal-progress__day--future' : ''
            }`}
            title={day.date.toLocaleDateString()}
          >
            {day.isCompleted ? (
              <span className="goal-progress__day-check">✓</span>
            ) : (
              <span className="goal-progress__day-number">{day.dayNumber}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
