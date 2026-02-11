import { useState, useEffect } from 'react';
import type { ContractCadence, ContractStakeType, ContractTargetType } from '../../types/gamification';
import { listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import { fetchGoals } from '../../services/goals';
import type { Database } from '../../lib/database.types';
import { createContract, activateContract, type ContractInput } from '../../services/commitmentContracts';
import './ContractWizard.css';

type GoalRow = Database['public']['Tables']['goals']['Row'];

interface ContractWizardProps {
  userId: string;
  currentGoldBalance: number;
  currentTokenBalance: number;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface TargetOption {
  id: string;
  title: string;
  type: ContractTargetType;
}

export function ContractWizard({
  userId,
  currentGoldBalance,
  currentTokenBalance,
  onComplete,
  onCancel,
}: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);
  const [cadence, setCadence] = useState<ContractCadence>('daily');
  const [targetCount, setTargetCount] = useState<number>(1);
  const [stakeType, setStakeType] = useState<ContractStakeType>('gold');
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [graceDays, setGraceDays] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load habits and goals for target selection
  useEffect(() => {
    const loadTargets = async () => {
      setLoading(true);
      try {
        const [habitsResult, goalsResult] = await Promise.all([
          listHabitsV2(),
          fetchGoals(),
        ]);

        const targets: TargetOption[] = [];

        // Add habits
        if (habitsResult.data) {
          habitsResult.data.forEach((habit: HabitV2Row) => {
            if (!habit.archived) {
              targets.push({
                id: habit.id,
                title: habit.title,
                type: 'Habit',
              });
            }
          });
        }

        // Add goals
        if (goalsResult.data) {
          goalsResult.data.forEach((goal: GoalRow) => {
            // Filter for active goals (not completed or cancelled)
            // Goals use status_tag field, filter out 'completed' and 'cancelled' tags
            if (goal.status_tag !== 'completed' && goal.status_tag !== 'cancelled') {
              targets.push({
                id: goal.id,
                title: goal.title,
                type: 'Goal',
              });
            }
          });
        }

        setTargetOptions(targets);
      } catch (err) {
        console.error('Failed to load targets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTargets();
  }, []);

  // Update default target count when cadence changes
  useEffect(() => {
    if (cadence === 'daily') {
      setTargetCount(1);
    } else {
      setTargetCount(3);
    }
  }, [cadence]);

  const maxStake = stakeType === 'gold' 
    ? Math.floor(currentGoldBalance * 0.2)
    : Math.floor(currentTokenBalance * 0.2);

  const balance = stakeType === 'gold' ? currentGoldBalance : currentTokenBalance;
  const stakeValid = stakeAmount > 0 && stakeAmount <= maxStake;

  const handleNext = () => {
    if (currentStep === 1 && !selectedTarget) {
      setError('Please select a target');
      return;
    }
    if (currentStep === 2 && targetCount <= 0) {
      setError('Target count must be greater than 0');
      return;
    }
    if (currentStep === 3 && !stakeValid) {
      setError(`Stake must be between 1 and ${maxStake} (20% of your ${stakeType})`);
      return;
    }

    setError(null);
    setCurrentStep((prev) => Math.min(4, prev + 1) as WizardStep);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
  };

  const handleConfirm = async () => {
    if (!selectedTarget) return;

    setSubmitting(true);
    setError(null);

    try {
      const input: ContractInput = {
        title: selectedTarget.title,
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        cadence,
        targetCount,
        stakeType,
        stakeAmount,
        graceDays,
      };

      const { data: contract, error: createError } = await createContract(userId, input);
      
      if (createError || !contract) {
        throw createError || new Error('Failed to create contract');
      }

      // Activate the contract immediately
      const { error: activateError } = await activateContract(userId, contract.id);
      
      if (activateError) {
        throw activateError;
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contract-wizard">
      <div className="contract-wizard__header">
        <div className="contract-wizard__step-indicator">
          Step {currentStep} of 4
        </div>
        <button
          type="button"
          className="contract-wizard__close"
          onClick={onCancel}
          aria-label="Close wizard"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="contract-wizard__error" role="alert">
          {error}
        </div>
      )}

      {/* Step 1: Select Target */}
      {currentStep === 1 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">What do you want to commit to?</h3>
          
          {loading ? (
            <p className="contract-wizard__loading">Loading your habits and goals...</p>
          ) : targetOptions.length === 0 ? (
            <div className="contract-wizard__fallback">
              <p>Create a habit first to start a contract</p>
              <button
                type="button"
                className="contract-wizard__button contract-wizard__button--secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="contract-wizard__target-list">
                {targetOptions.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    className={`contract-wizard__target-option${
                      selectedTarget?.id === target.id ? ' contract-wizard__target-option--selected' : ''
                    }`}
                    onClick={() => setSelectedTarget(target)}
                  >
                    <span className="contract-wizard__target-type">
                      {target.type === 'Habit' ? '✓' : '🎯'}
                    </span>
                    <span className="contract-wizard__target-title">{target.title}</span>
                  </button>
                ))}
              </div>
              <div className="contract-wizard__actions">
                <button
                  type="button"
                  className="contract-wizard__button contract-wizard__button--secondary"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="contract-wizard__button contract-wizard__button--primary"
                  onClick={handleNext}
                  disabled={!selectedTarget}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Set Cadence + Count */}
      {currentStep === 2 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">How often should you complete this?</h3>
          
          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label">Cadence</label>
            <div className="contract-wizard__chip-group">
              <button
                type="button"
                className={`contract-wizard__chip${cadence === 'daily' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setCadence('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                className={`contract-wizard__chip${cadence === 'weekly' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setCadence('weekly')}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="target-count">
              Target count
            </label>
            <input
              id="target-count"
              type="number"
              min="1"
              className="contract-wizard__input"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 1)}
            />
            <p className="contract-wizard__helper-text">
              This is the minimum to keep your contract
            </p>
          </div>

          <div className="contract-wizard__actions">
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--secondary"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--primary"
              onClick={handleNext}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Choose Stake */}
      {currentStep === 3 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">What are you willing to stake?</h3>
          
          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label">Stake type</label>
            <div className="contract-wizard__chip-group">
              <button
                type="button"
                className={`contract-wizard__chip${stakeType === 'gold' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setStakeType('gold')}
              >
                Gold
              </button>
              <button
                type="button"
                className={`contract-wizard__chip${stakeType === 'tokens' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setStakeType('tokens')}
              >
                Tokens
              </button>
            </div>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="stake-amount">
              Amount
            </label>
            <input
              id="stake-amount"
              type="number"
              min="1"
              max={maxStake}
              className="contract-wizard__input"
              value={stakeAmount || ''}
              onChange={(e) => setStakeAmount(parseInt(e.target.value, 10) || 0)}
            />
            <p className="contract-wizard__helper-text">
              You have {balance} {stakeType === 'gold' ? 'Gold' : 'Tokens'} (max stake: {maxStake})
            </p>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label">Grace days</label>
            <div className="contract-wizard__chip-group">
              <button
                type="button"
                className={`contract-wizard__chip${graceDays === 0 ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setGraceDays(0)}
              >
                0
              </button>
              <button
                type="button"
                className={`contract-wizard__chip${graceDays === 1 ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setGraceDays(1)}
              >
                1
              </button>
              <button
                type="button"
                className={`contract-wizard__chip${graceDays === 2 ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setGraceDays(2)}
              >
                2
              </button>
            </div>
            <p className="contract-wizard__helper-text">
              Grace days protect you from burnout
            </p>
          </div>

          <div className="contract-wizard__actions">
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--secondary"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--primary"
              onClick={handleNext}
              disabled={!stakeValid}
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review + Confirm */}
      {currentStep === 4 && selectedTarget && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Review your contract</h3>
          
          <div className="contract-wizard__summary">
            <div className="contract-wizard__summary-row">
              <strong>Commit to:</strong>
              <span>{selectedTarget.title}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Cadence:</strong>
              <span>Complete {targetCount} times per {cadence}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Stake:</strong>
              <span>{stakeAmount} {stakeType === 'gold' ? 'Gold' : 'Tokens'}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Grace days:</strong>
              <span>{graceDays}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Cooling-off:</strong>
              <span>You can cancel within 24 hours without penalty</span>
            </div>
          </div>

          <div className="contract-wizard__warning" role="alert">
            <strong>⚠️</strong> This contract will forfeit your stake if you miss. Are you sure?
          </div>

          <div className="contract-wizard__actions">
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--secondary"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              type="button"
              className="contract-wizard__button contract-wizard__button--primary"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Confirm Contract'}
            </button>
          </div>
        </div>
      )}

      <div className="contract-wizard__cancel">
        <button
          type="button"
          className="contract-wizard__cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
