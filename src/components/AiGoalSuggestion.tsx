import { useState } from 'react';
import { suggestGoal, type SuggestGoalResponse } from '../services/goalSuggestions';

/**
 * AI Goal Suggestion Component
 * 
 * This component provides a form for users to get AI-powered goal suggestions.
 * It can be integrated into the Goals workspace or used as a standalone feature.
 * 
 * Features:
 * - Input form for goal description, timeframe, and category
 * - Loading state during API call
 * - Error handling with user-friendly messages
 * - Demo mode indicator when Supabase is unavailable
 * - Displays suggested goal, milestones, and tasks
 * - Optional callback to save the suggested goal
 * 
 * Usage:
 * ```tsx
 * <AiGoalSuggestion onSaveGoal={(suggestion) => {
 *   // Handle saving the goal to your database
 *   console.log('Saving goal:', suggestion);
 * }} />
 * ```
 */

interface AiGoalSuggestionProps {
  onSaveGoal?: (suggestion: SuggestGoalResponse) => void;
  onCancel?: () => void;
  className?: string;
}

export function AiGoalSuggestion({ onSaveGoal, onCancel, className = '' }: AiGoalSuggestionProps) {
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestGoalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'demo' | 'unavailable' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please provide a description of what you want to achieve');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await suggestGoal({
        description: description.trim(),
        timeframe: timeframe.trim() || undefined,
        category: category.trim() || undefined,
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setSuggestion(result.data);
        setSource(result.source);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuggestion(null);
    setError(null);
    setSource(null);
    // Keep form fields to allow quick refinement
  };

  const handleSave = () => {
    if (suggestion && onSaveGoal) {
      onSaveGoal(suggestion);
    }
  };

  return (
    <div className={`ai-goal-suggestion ${className}`}>
      <div className="ai-goal-suggestion__header">
        <h2>✨ AI Goal Suggestion</h2>
        <p className="ai-goal-suggestion__subtitle">
          Describe what you want to achieve, and get a structured goal with milestones and tasks
        </p>
      </div>

      {!suggestion ? (
        <form className="ai-goal-suggestion__form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="ai-description" className="form-field__label">
              What do you want to achieve? <span className="required">*</span>
            </label>
            <textarea
              id="ai-description"
              className="form-field__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., I want to improve my health and fitness, learn web development, or start a business"
              required
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="ai-timeframe" className="form-field__label">
                Timeframe (optional)
              </label>
              <input
                type="text"
                id="ai-timeframe"
                className="form-field__input"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="E.g., 3 months, 6 months, 1 year"
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="ai-category" className="form-field__label">
                Category (optional)
              </label>
              <input
                type="text"
                id="ai-category"
                className="form-field__input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="E.g., Health, Career, Learning"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="ai-goal-suggestion__error">
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          <div className="ai-goal-suggestion__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  ✨ Suggest Goal
                </>
              )}
            </button>
            
            {onCancel && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="ai-goal-suggestion__result">
          {source === 'demo' && (
            <div className="demo-notice">
              📝 <strong>Demo mode:</strong> Connect Supabase and configure OpenAI API key for AI-powered suggestions
            </div>
          )}
          
          <div className="suggestion-section">
            <h3 className="suggestion-section__title">🎯 Suggested Goal</h3>
            <p className="suggestion-section__content">{suggestion.goal}</p>
          </div>

          <div className="suggestion-section">
            <h3 className="suggestion-section__title">🏔️ Milestones</h3>
            <ul className="suggestion-list">
              {suggestion.milestones.map((milestone, index) => (
                <li key={index} className="suggestion-list__item">
                  {milestone}
                </li>
              ))}
            </ul>
          </div>

          <div className="suggestion-section">
            <h3 className="suggestion-section__title">✅ Action Tasks</h3>
            <ul className="suggestion-list">
              {suggestion.tasks.map((task, index) => (
                <li key={index} className="suggestion-list__item">
                  {task}
                </li>
              ))}
            </ul>
          </div>

          <div className="ai-goal-suggestion__actions">
            {onSaveGoal && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
              >
                💾 Save as Goal
              </button>
            )}
            
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleReset}
            >
              ✨ Try Again
            </button>

            {onCancel && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export default for easier importing
export default AiGoalSuggestion;
