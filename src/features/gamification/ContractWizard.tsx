import { useState, useEffect } from 'react';
import type { ContractCadence, ContractStakeType, ContractTargetType, ContractType, ContractStage } from '../../types/gamification';
import { listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import { fetchGoals } from '../../services/goals';
import type { Database } from '../../lib/database.types';
import { createContract, activateContract, type ContractInput } from '../../services/commitmentContracts';
import { IdentityStatementInput } from './IdentityStatementInput';
import { MultiStageEditor } from './MultiStageEditor';
import { NarrativeThemePicker } from './NarrativeThemePicker';
import './ContractWizard.css';

type GoalRow = Database['public']['Tables']['goals']['Row'];

interface ContractWizardProps {
  userId: string;
  currentGoldBalance: number;
  currentTokenBalance: number;
  onComplete: () => void;
  onCancel: () => void;
}

type WizardStep = 0 | 1 | 2 | 3 | 4;

interface TargetOption {
  id: string;
  title: string;
  type: ContractTargetType;
}

interface ContractTypeOption {
  type: ContractType;
  icon: string;
  label: string;
  description: string;
}

const CONTRACT_TYPES: ContractTypeOption[] = [
  { type: 'classic', icon: '📜', label: 'Classic', description: 'Stake on completing a habit or goal' },
  { type: 'identity', icon: '🪞', label: 'Identity', description: 'Commit to who you want to become' },
  { type: 'escalation', icon: '📈', label: 'Escalation', description: 'Stakes grow on consecutive misses' },
  { type: 'redemption', icon: '⚡', label: 'Redemption', description: 'Miss triggers a redemption quest instead' },
  { type: 'reverse', icon: '🚫', label: 'Reverse', description: 'Commit to NOT doing something' },
  { type: 'multi_stage', icon: '🏔️', label: 'Multi-Stage', description: 'Large goal broken into milestones' },
  { type: 'future_self', icon: '💌', label: 'Future Self', description: 'Write a sealed message to your future self' },
  { type: 'narrative', icon: '⚔️', label: 'Narrative', description: 'Story-themed contract with character growth' },
  { type: 'sacred', icon: '🔱', label: 'Sacred', description: 'Rare, high-stakes ceremony (max 2/year)' },
  { type: 'cascading', icon: '🔗', label: 'Cascading', description: 'Completion unlocks the next contract' },
];

export function ContractWizard({
  userId,
  currentGoldBalance,
  currentTokenBalance,
  onComplete,
  onCancel,
}: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 0: Contract type
  const [selectedContractType, setSelectedContractType] = useState<ContractType>('classic');

  // Form state
  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);
  const [cadence, setCadence] = useState<ContractCadence>('daily');
  const [targetCount, setTargetCount] = useState<number>(1);
  const [endDate, setEndDate] = useState<string>('');
  const [stakeType, setStakeType] = useState<ContractStakeType>('gold');
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [graceDays, setGraceDays] = useState<number>(1);
  const [accountabilityMode, setAccountabilityMode] = useState<'solo' | 'witness'>('solo');
  const [witnessLabel, setWitnessLabel] = useState('');

  // Type-specific fields
  const [identityStatement, setIdentityStatement] = useState('');
  const [redemptionQuestTitle, setRedemptionQuestTitle] = useState('');
  const [futureMessage, setFutureMessage] = useState('');
  const [narrativeTheme, setNarrativeTheme] = useState<'warrior' | 'monk' | 'scholar' | 'explorer'>('warrior');
  const [sacredConfirmed, setSacredConfirmed] = useState(false);
  const [stages, setStages] = useState<ContractStage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Total steps depends on contract type
  const totalSteps = selectedContractType === 'sacred' ? 5 : 4;

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
  const hasStakeCapacity = maxStake >= 1;
  const stakeValid = hasStakeCapacity && stakeAmount > 0 && stakeAmount <= maxStake;

  const handleNext = () => {
    if (currentStep === 0) {
      // Contract type selection — always valid
      setError(null);
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1 && !selectedTarget) {
      setError('Please select a target');
      return;
    }
    if (currentStep === 2 && targetCount <= 0) {
      setError('Target count must be greater than 0');
      return;
    }
    if (currentStep === 3 && !stakeValid) {
      if (!hasStakeCapacity) {
        setError(`Build your ${stakeType === 'gold' ? 'Gold' : 'Tokens'} to at least 5 before creating a contract stake.`);
        return;
      }

      setError(`Stake must be between 1 and ${maxStake} (20% of your ${stakeType === 'gold' ? 'Gold' : 'Tokens'})`);
      return;
    }
    if (currentStep === 3 && accountabilityMode === 'witness' && !witnessLabel.trim()) {
      setError('Add a witness name so this mode stays intentional.');
      return;
    }
    if (currentStep === 3 && selectedContractType === 'sacred' && !sacredConfirmed) {
      setError('Please confirm you understand the consequences of a Sacred Contract.');
      return;
    }

    setError(null);
    setCurrentStep((prev) => Math.min(totalSteps as WizardStep, (prev + 1) as WizardStep) as WizardStep);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(0, prev - 1) as WizardStep);
  };

  const handleConfirm = async () => {
    if (!selectedTarget) return;

    setSubmitting(true);
    setError(null);

    try {
      const input: ContractInput = {
        title: selectedContractType === 'identity' && identityStatement.trim()
          ? identityStatement.trim()
          : selectedTarget.title,
        targetType: selectedTarget.type,
        targetId: selectedTarget.id,
        cadence,
        targetCount,
        stakeType,
        stakeAmount,
        graceDays,
        accountabilityMode,
        witnessLabel,
        endAt: endDate ? new Date(endDate).toISOString() : null,
        contractType: selectedContractType,
        identityStatement: identityStatement.trim() || null,
        redemptionQuestTitle: redemptionQuestTitle.trim() || null,
        futureMessage: futureMessage.trim() || null,
        narrativeTheme: selectedContractType === 'narrative' ? narrativeTheme : null,
        isSacred: selectedContractType === 'sacred',
        stages: selectedContractType === 'multi_stage' && stages.length > 0 ? stages : null,
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
          Step {currentStep + 1} of {totalSteps + 1}
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

      {/* Step 0: Choose Contract Type */}
      {currentStep === 0 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Choose your contract type</h3>
          <div className="contract-wizard__type-grid">
            {CONTRACT_TYPES.map((ct) => (
              <button
                key={ct.type}
                type="button"
                className={`contract-wizard__type-card${
                  selectedContractType === ct.type ? ' contract-wizard__type-card--selected' : ''
                }`}
                onClick={() => setSelectedContractType(ct.type)}
              >
                <span className="contract-wizard__type-icon">{ct.icon}</span>
                <span className="contract-wizard__type-name">{ct.label}</span>
                <span className="contract-wizard__type-desc">{ct.description}</span>
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
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Select Target */}
      {currentStep === 1 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">
            {selectedContractType === 'reverse'
              ? 'What do you want to commit NOT to do?'
              : selectedContractType === 'identity'
              ? 'What habit or goal anchors this identity?'
              : 'What do you want to commit to?'}
          </h3>
          
          {/* TODO: Future — add FocusSession loading here once a FocusSession service is available */}
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

      {/* Step 2: Set Cadence + Count + Type-specific extras */}
      {currentStep === 2 && (
        <div className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">How often should you complete this?</h3>
          
          {selectedContractType === 'identity' && (
            <IdentityStatementInput
              value={identityStatement}
              onChange={setIdentityStatement}
            />
          )}

          {selectedContractType === 'redemption' && (
            <div className="contract-wizard__field-group">
              <label className="contract-wizard__label" htmlFor="redemption-quest-title">
                Redemption quest (if you miss)
              </label>
              <input
                id="redemption-quest-title"
                type="text"
                maxLength={120}
                className="contract-wizard__input"
                placeholder="e.g. Run 10km this weekend"
                value={redemptionQuestTitle}
                onChange={(e) => setRedemptionQuestTitle(e.target.value)}
              />
              <p className="contract-wizard__helper-text">
                If you miss, you can redeem yourself by completing this harder quest instead of forfeiting.
              </p>
            </div>
          )}

          {selectedContractType === 'future_self' && (
            <div className="contract-wizard__field-group">
              <label className="contract-wizard__label" htmlFor="future-message">
                💌 Sealed message to your future self
              </label>
              <textarea
                id="future-message"
                rows={4}
                maxLength={600}
                className="contract-wizard__input"
                placeholder="Write something meaningful. This will be unlocked only if you succeed..."
                value={futureMessage}
                onChange={(e) => setFutureMessage(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <p className="contract-wizard__helper-text">
                Hidden until you complete the contract. Lost forever if you fail.
              </p>
            </div>
          )}

          {selectedContractType === 'narrative' && (
            <NarrativeThemePicker
              value={narrativeTheme}
              onChange={setNarrativeTheme}
            />
          )}

          {selectedContractType === 'multi_stage' && (
            <MultiStageEditor
              stages={stages}
              onChange={setStages}
            />
          )}

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
              {selectedContractType === 'reverse' ? 'Max allowed violations per window' : 'Target count'}
            </label>
            <input
              id="target-count"
              type="number"
              min={selectedContractType === 'reverse' ? '0' : '1'}
              className="contract-wizard__input"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || (selectedContractType === 'reverse' ? 0 : 1))}
            />
            <p className="contract-wizard__helper-text">
              {selectedContractType === 'reverse'
                ? 'Max violations you allow before losing the contract (0 = zero tolerance)'
                : 'This is the minimum to keep your contract'}
            </p>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="end-date">
              End date (optional)
            </label>
            <input
              id="end-date"
              type="date"
              className="contract-wizard__input"
              value={endDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="contract-wizard__helper-text">
              Leave blank for an ongoing contract. Set a date to auto-complete it.
            </p>
          </div>

          {selectedContractType === 'escalation' && (
            <div className="contract-wizard__field-group">
              <p className="contract-wizard__helper-text" style={{ background: '#fff7ed', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #f97316' }}>
                ⚡ Escalation: each consecutive miss increases your effective stake by 50% (up to 3x). Hit your target and the stake resets.
              </p>
            </div>
          )}

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
              {hasStakeCapacity
                ? `You have ${balance} ${stakeType === 'gold' ? 'Gold' : 'Tokens'} (max stake: ${maxStake})`
                : `You have ${balance} ${stakeType === 'gold' ? 'Gold' : 'Tokens'}. Reach 5+ to unlock a stake cap above 0.`}
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


          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label">Accountability mode</label>
            <div className="contract-wizard__chip-group">
              <button
                type="button"
                className={`contract-wizard__chip${accountabilityMode === 'solo' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setAccountabilityMode('solo')}
              >
                Solo
              </button>
              <button
                type="button"
                className={`contract-wizard__chip${accountabilityMode === 'witness' ? ' contract-wizard__chip--selected' : ''}`}
                onClick={() => setAccountabilityMode('witness')}
              >
                Witness
              </button>
            </div>
            <p className="contract-wizard__helper-text">
              Witness mode adds a support partner label to this contract card.
            </p>
          </div>

          {accountabilityMode === 'witness' && (
            <div className="contract-wizard__field-group">
              <label className="contract-wizard__label" htmlFor="witness-label">
                Witness name
              </label>
              <input
                id="witness-label"
                type="text"
                maxLength={40}
                className="contract-wizard__input"
                placeholder="e.g. Maya accountability buddy"
                value={witnessLabel}
                onChange={(e) => setWitnessLabel(e.target.value)}
              />
            </div>
          )}

          {selectedContractType === 'sacred' && (
            <div className="contract-wizard__field-group">
              <div className="contract-wizard__warning" role="alert" style={{ background: '#fee2e2', borderColor: '#dc2626' }}>
                <strong>🔱 Sacred Contract Warning</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  Sacred contracts are limited to 2 per year. Breaking one forfeits <strong>3x</strong> your stake and damages your reliability score permanently. Keeping it earns <strong>3x</strong> bonus and a Diamond achievement.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sacredConfirmed}
                    onChange={(e) => setSacredConfirmed(e.target.checked)}
                  />
                  I understand and accept this sacred oath
                </label>
              </div>
            </div>
          )}

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
              disabled={!stakeValid || (selectedContractType === 'sacred' && !sacredConfirmed)}
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
              <strong>Type:</strong>
              <span>{CONTRACT_TYPES.find((ct) => ct.type === selectedContractType)?.icon} {CONTRACT_TYPES.find((ct) => ct.type === selectedContractType)?.label ?? 'Classic'}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Commit to:</strong>
              <span>{selectedTarget.title}</span>
            </div>
            {identityStatement && (
              <div className="contract-wizard__summary-row">
                <strong>Identity:</strong>
                <span>"{identityStatement}"</span>
              </div>
            )}
            <div className="contract-wizard__summary-row">
              <strong>Cadence:</strong>
              <span>{selectedContractType === 'reverse' ? `Max ${targetCount} violations per ${cadence}` : `Complete ${targetCount} times per ${cadence}`}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Stake:</strong>
              <span>{stakeAmount} {stakeType === 'gold' ? 'Gold' : 'Tokens'}{selectedContractType === 'sacred' ? ' (3x penalty on miss, 3x bonus on success)' : ''}</span>
            </div>
            {endDate && (
              <div className="contract-wizard__summary-row">
                <strong>Ends:</strong>
                <span>{new Date(endDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="contract-wizard__summary-row">
              <strong>Grace days:</strong>
              <span>{graceDays}</span>
            </div>
            <div className="contract-wizard__summary-row">
              <strong>Accountability:</strong>
              <span>{accountabilityMode === 'witness' ? `Witness · ${witnessLabel.trim()}` : 'Solo mode'}</span>
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
