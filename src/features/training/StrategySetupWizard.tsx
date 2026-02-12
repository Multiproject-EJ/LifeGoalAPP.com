// Strategy Setup Wizard - Multi-step strategy creation
import { useState } from 'react';
import { STRATEGY_TYPES, MUSCLE_GROUPS, COMMON_EXERCISES } from './constants';
import type { TrainingStrategy, StrategyType } from './types';

interface StrategySetupWizardProps {
  onClose: () => void;
  onSave: (strategy: Omit<TrainingStrategy, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

export function StrategySetupWizard({ onClose, onSave }: StrategySetupWizardProps) {
  const [step, setStep] = useState(1);
  const [strategyType, setStrategyType] = useState<StrategyType | null>(null);
  const [name, setName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('reps');
  const [timeWindowDays, setTimeWindowDays] = useState('7');
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Auto-set name when strategy type is selected
  const handleStrategyTypeSelect = (type: StrategyType) => {
    setStrategyType(type);
    const typeInfo = STRATEGY_TYPES.find((t) => t.value === type);
    if (typeInfo && !name) {
      setName(typeInfo.label);
    }
    
    // Auto-set units based on type
    if (type === 'duration') {
      setTargetUnit('minutes');
    } else if (type === 'streak' || type === 'variety' || type === 'recovery') {
      setTargetUnit('days');
    } else if (type === 'progressive_load') {
      setTargetUnit('kg');
    } else {
      setTargetUnit('reps');
    }
  };

  // Toggle muscle selection
  const toggleMuscle = (muscle: string) => {
    setFocusMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  // Validate current step
  const canProceed = () => {
    if (step === 1) return strategyType !== null;
    if (step === 2) return name.trim() && targetValue && parseFloat(targetValue) > 0;
    if (step === 3 && strategyType === 'focus_muscle') return focusMuscles.length > 0;
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!strategyType || !name.trim() || !targetValue) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        strategy_type: strategyType,
        exercise_name: exerciseName.trim() || null,
        target_value: parseFloat(targetValue),
        target_unit: targetUnit,
        time_window_days: parseInt(timeWindowDays, 10),
        focus_muscles: focusMuscles,
        is_active: true,
      });
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Failed to save strategy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = strategyType === 'focus_muscle' ? 3 : 2;

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal__panel card glass">
        <h2 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
          Create Training Strategy
        </h2>

        {/* Wizard Steps Indicator */}
        <div className="wizard-steps">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`wizard-step ${s === step ? 'wizard-step--active' : ''} ${
                s < step ? 'wizard-step--complete' : ''
              }`}
            >
              <span className="wizard-step__number">{s}</span>
              <span className="wizard-step__label">
                {s === 1 && 'Type'}
                {s === 2 && 'Details'}
                {s === 3 && 'Muscles'}
              </span>
            </div>
          ))}
        </div>

        <div className="wizard-content">
          {/* Step 1: Choose Strategy Type */}
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--fs-lg)' }}>
                Choose Your Strategy
              </h3>
              <div className="strategy-type-grid">
                {STRATEGY_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`strategy-type-card ${
                      strategyType === type.value ? 'strategy-type-card--selected' : ''
                    }`}
                    onClick={() => handleStrategyTypeSelect(type.value)}
                  >
                    <div className="strategy-type-card__icon">{type.icon}</div>
                    <div className="strategy-type-card__label">{type.label}</div>
                    <div className="strategy-type-card__description">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Set Details */}
          {step === 2 && (
            <div className="quick-log-form">
              <div className="form-group">
                <label htmlFor="strategy-name">Strategy Name *</label>
                <input
                  id="strategy-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Push-ups Goal"
                />
              </div>

              {strategyType !== 'streak' &&
                strategyType !== 'variety' &&
                strategyType !== 'recovery' && (
                  <div className="form-group">
                    <label htmlFor="exercise-name">Exercise (optional)</label>
                    <input
                      id="exercise-name"
                      type="text"
                      value={exerciseName}
                      onChange={(e) => setExerciseName(e.target.value)}
                      placeholder="Leave blank for all exercises"
                      list="exercise-suggestions"
                    />
                    <datalist id="exercise-suggestions">
                      {COMMON_EXERCISES.map((ex) => (
                        <option key={ex.name} value={ex.name} />
                      ))}
                    </datalist>
                  </div>
                )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="target-value">Target *</label>
                  <input
                    id="target-value"
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="target-unit">Unit</label>
                  <select
                    id="target-unit"
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                  >
                    <option value="reps">Reps</option>
                    <option value="minutes">Minutes</option>
                    <option value="days">Days</option>
                    <option value="kg">kg</option>
                    <option value="sessions">Sessions</option>
                  </select>
                </div>
              </div>

              {(strategyType === 'rolling_window' || strategyType === 'weekly_target') && (
                <div className="form-group">
                  <label htmlFor="time-window">Time Window (days)</label>
                  <input
                    id="time-window"
                    type="number"
                    min="1"
                    value={timeWindowDays}
                    onChange={(e) => setTimeWindowDays(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Focus Muscles (for focus_muscle strategy) */}
          {step === 3 && strategyType === 'focus_muscle' && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--fs-lg)' }}>
                Select Focus Muscle Groups *
              </h3>
              <div className="muscle-groups">
                {MUSCLE_GROUPS.map((muscle) => (
                  <button
                    key={muscle.value}
                    type="button"
                    className={`muscle-pill ${
                      focusMuscles.includes(muscle.value) ? 'muscle-pill--selected' : ''
                    }`}
                    onClick={() => toggleMuscle(muscle.value)}
                  >
                    <span className="muscle-pill__emoji">{muscle.emoji}</span>
                    {muscle.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal__actions">
          {step > 1 && (
            <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {step < totalSteps ? (
            <button
              className="btn btn--primary"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={!canProceed() || saving}
            >
              {saving ? 'Creating...' : 'Create Strategy'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
