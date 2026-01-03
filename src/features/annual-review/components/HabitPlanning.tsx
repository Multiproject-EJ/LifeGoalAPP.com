import React, { useState, useEffect } from 'react';
import { LIFE_WHEEL_CATEGORIES, LifeWheelCategoryKey } from '../../checkins/LifeWheelCheckins';
import { fetchAnnualGoalsByReview, type AnnualGoal } from '../../../services/annualReviews';
import { createHabitV2 } from '../../../services/habitsV2';
import { getSupabaseClient } from '../../../lib/supabaseClient';

type HabitPlanningProps = {
  onBack: () => void;
  onComplete: () => void;
  reviewId: string | null;
  reviewYear: number;
};

type HabitInput = {
  goalId: string;
  category: string;
  title: string;
  emoji: string;
};

export const HabitPlanning: React.FC<HabitPlanningProps> = ({
  onBack,
  onComplete,
  reviewId,
  reviewYear,
}) => {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [habitInputs, setHabitInputs] = useState<Record<string, HabitInput>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) {
      setIsLoading(false);
      return;
    }

    const loadGoals = async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await fetchAnnualGoalsByReview(reviewId);
      
      if (fetchError) {
        setError('Failed to load your goals. You can still complete the review.');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setGoals(data);
        setSelectedGoalId(data[0].id);
        
        // Initialize habit inputs for each goal
        const initialInputs: Record<string, HabitInput> = {};
        data.forEach(goal => {
          initialInputs[goal.id] = {
            goalId: goal.id,
            category: goal.category,
            title: '',
            emoji: '✅',
          };
        });
        setHabitInputs(initialInputs);
      }
      
      setIsLoading(false);
    };

    loadGoals();
  }, [reviewId]);

  const handleHabitTitleChange = (goalId: string, title: string) => {
    setHabitInputs(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        title,
      },
    }));
  };

  const handleComplete = async () => {
    if (!reviewId) {
      onComplete();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create habits for goals that have a title defined
      for (const goal of goals) {
        const habitInput = habitInputs[goal.id];
        
        if (!habitInput || habitInput.title.trim() === '') {
          continue; // Skip goals without habit titles
        }

        // Create a simple daily habit
        const { error: createError } = await createHabitV2(
          {
            title: habitInput.title.trim(),
            emoji: habitInput.emoji,
            habit_type: 'boolean',
            schedule_mode: 'daily',
            domain_key: habitInput.category as LifeWheelCategoryKey,
            target_num: null,
            target_unit: null,
            archived: false,
            allow_skip: true,
          },
          user.id
        );

        if (createError) {
          console.error(`Failed to create habit for goal ${goal.goal_statement}:`, createError);
          // Continue creating other habits even if one fails
        }
      }

      onComplete();
    } catch (error) {
      console.error('Failed to create habits:', error);
      setError(error instanceof Error ? error.message : 'Failed to create habits. You can add them manually later.');
      setIsSaving(false);
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const selectedCategory = selectedGoal 
    ? LIFE_WHEEL_CATEGORIES.find(cat => cat.key === selectedGoal.category)
    : null;
  const selectedHabitInput = selectedGoalId ? habitInputs[selectedGoalId] : null;

  const habitsCreatedCount = Object.values(habitInputs).filter(h => h.title.trim() !== '').length;

  if (isLoading) {
    return (
      <div className="review-step">
        <h2>📅 Habit Planning</h2>
        <p>Loading your goals...</p>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner" />
        </div>
        
        <style>{`
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(6, 182, 212, 0.1);
            border-top-color: #06b6d4;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="review-step habit-planning">
        <h2>📅 Habit Planning</h2>
        <p>No goals were defined in the previous step. You can add habits manually from the Habits section later.</p>
        
        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>
            Back
          </button>
          <button className="btn-primary" onClick={onComplete}>
            Complete Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-step habit-planning">
      <div className="planning-header">
        <h2>📅 Habit Planning</h2>
        <p>Create daily habits to support your {reviewYear + 1} goals.</p>
        <div className="progress-indicator">
          <span className="progress-text">
            {habitsCreatedCount} / {goals.length} habits planned
          </span>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(habitsCreatedCount / goals.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="planning-content">
        {/* Goal Tabs */}
        <div className="goal-tabs">
          {goals.map(goal => {
            const category = LIFE_WHEEL_CATEGORIES.find(cat => cat.key === goal.category);
            const hasHabit = habitInputs[goal.id]?.title.trim() !== '';
            
            return (
              <button
                key={goal.id}
                className={`goal-tab ${selectedGoalId === goal.id ? 'active' : ''} ${hasHabit ? 'completed' : ''}`}
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <span className="goal-category">{category?.label || goal.category}</span>
                {hasHabit && <span className="check-icon">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Habit Form */}
        {selectedGoal && selectedHabitInput && (
          <div className="habit-form">
            <h3>{selectedCategory?.label}</h3>
            <div className="goal-summary">
              <strong>Your Goal:</strong>
              <p>{selectedGoal.goal_statement}</p>
            </div>

            <div className="form-group">
              <label htmlFor="habit-title">
                Daily Habit to Support This Goal
              </label>
              <p className="help-text">
                What's one small daily action you can take? Keep it simple and specific.
              </p>
              <input
                id="habit-title"
                type="text"
                value={selectedHabitInput.title}
                onChange={(e) => handleHabitTitleChange(selectedGoalId!, e.target.value)}
                placeholder={`e.g., "10 minutes of reading", "30-minute walk", "Call a friend"`}
                aria-label="Daily habit title"
              />
            </div>

            <div className="habit-preview">
              {selectedHabitInput.title.trim() !== '' && (
                <div className="preview-card">
                  <span className="preview-emoji">{selectedHabitInput.emoji}</span>
                  <span className="preview-title">{selectedHabitInput.title}</span>
                  <span className="preview-frequency">Daily</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack} disabled={isSaving}>
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={handleComplete}
          disabled={isSaving}
        >
          {isSaving ? 'Creating Habits...' : 'Complete Review 🎉'}
        </button>
      </div>

      <style>{`
        .habit-planning {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .planning-header {
          text-align: center;
        }

        .progress-indicator {
          margin-top: 1rem;
        }

        .progress-text {
          display: block;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .progress-bar-container {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .planning-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .goal-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
        }

        .goal-tab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .goal-tab:hover {
          border-color: #06b6d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .goal-tab.active {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border-color: #06b6d4;
          color: white;
        }

        .goal-tab.completed:not(.active) {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
        }

        .goal-category {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .check-icon {
          font-size: 1rem;
          color: #10b981;
        }

        .goal-tab.active .check-icon {
          color: white;
        }

        .habit-form {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .habit-form h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #0f172a;
          font-weight: 700;
        }

        .goal-summary {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border: 1px solid #fbbf24;
        }

        .goal-summary strong {
          display: block;
          font-size: 0.75rem;
          color: #78350f;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .goal-summary p {
          color: #0f172a;
          margin: 0;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .help-text {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.75rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .habit-preview {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 2px solid #06b6d4;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .preview-emoji {
          font-size: 1.5rem;
        }

        .preview-title {
          flex: 1;
          font-weight: 600;
          color: #0f172a;
        }

        .preview-frequency {
          font-size: 0.75rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-weight: 600;
        }

        .error-message {
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .goal-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .habit-form {
            padding: 1rem;
          }

          .preview-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};
