import { useEffect, useState } from 'react';
import type { MeditationGoal } from '../../../../types/meditation';
import './GoalCountdown.css';

interface GoalCountdownProps {
  goal: MeditationGoal;
}

export function GoalCountdown({ goal }: GoalCountdownProps) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const remaining = Math.max(0, goal.target_days - goal.completed_days);
    const progress = (goal.completed_days / goal.target_days) * 100;
    
    setDaysRemaining(remaining);
    setProgressPercent(Math.min(100, progress));
  }, [goal.completed_days, goal.target_days]);

  const isCompleted = goal.completed_days >= goal.target_days;
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="goal-countdown">
      <div className="goal-countdown__header">
        <h3 className="goal-countdown__title">
          {isCompleted ? '🎉 Goal Completed!' : '🎯 Your Meditation Goal'}
        </h3>
      </div>
      
      <div className="goal-countdown__circle-container">
        <svg className="goal-countdown__circle" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="goal-countdown__circle-bg"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <circle
            className={`goal-countdown__circle-progress ${isCompleted ? 'goal-countdown__circle-progress--complete' : ''}`}
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        
        <div className="goal-countdown__content">
          {isCompleted ? (
            <>
              <div className="goal-countdown__completed-icon">✓</div>
              <div className="goal-countdown__label">Completed!</div>
            </>
          ) : (
            <>
              <div className="goal-countdown__days">{daysRemaining}</div>
              <div className="goal-countdown__label">
                {daysRemaining === 1 ? 'day left' : 'days left'}
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="goal-countdown__stats">
        <div className="goal-countdown__stat">
          <span className="goal-countdown__stat-value">{goal.completed_days}</span>
          <span className="goal-countdown__stat-label">Completed</span>
        </div>
        <div className="goal-countdown__stat-divider" />
        <div className="goal-countdown__stat">
          <span className="goal-countdown__stat-value">{goal.target_days}</span>
          <span className="goal-countdown__stat-label">Target</span>
        </div>
      </div>
      
      {isCompleted && (
        <div className="goal-countdown__celebration">
          <p className="goal-countdown__celebration-text">
            Congratulations on completing your {goal.target_days}-day meditation goal! 🌟
          </p>
        </div>
      )}
    </div>
  );
}
