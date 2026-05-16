import { useEffect, useMemo, useState } from 'react';
import type { ContractCadence, ContractStakeType, ContractTargetType, ContractType } from '../../types/gamification';
import { listHabitsV2, quickAddDailyHabit, type HabitV2Row } from '../../services/habitsV2';
import { fetchGoals, insertGoal } from '../../services/goals';
import type { Database } from '../../lib/database.types';
import { createContract, activateContract, type ContractInput } from '../../services/commitmentContracts';
import { listAvailableRewardsForContracts, linkRewardToContract } from '../../services/contractRewards';
import { createReward } from '../../services/rewards';
import type { RewardCategory, RewardItem } from '../../types/gamification';
import './ContractWizard.css';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];

interface ContractWizardProps {
  userId: string;
  currentGoldBalance: number;
  currentTokenBalance: number;
  onComplete: () => void;
  onCancel: () => void;
  onRewardLinked?: (contractId: string) => void;
}

interface TargetOption {
  id: string;
  title: string;
  type: ContractTargetType;
}

type WizardScreen =
  | 'target'
  | 'type'
  | 'sacred_confirm'
  | 'cadence'
  | 'ending'
  | 'stake'
  | 'checkin'
  | 'buffer'
  | 'reward'
  | 'review';

interface ContractTypeCard {
  type: ContractType;
  icon: string;
  title: string;
  subtitle: string;
  example: string;
}

const MVP_CONTRACT_TYPES: ContractTypeCard[] = [
  {
    type: 'classic',
    icon: '📜',
    title: 'Build a habit',
    subtitle: 'Classic',
    example: 'Complete workout 4x this week',
  },
  {
    type: 'reverse',
    icon: '🚫',
    title: 'Stop doing something',
    subtitle: 'Reverse',
    example: 'Max 1 doom-scroll slip per day',
  },
  {
    type: 'sacred',
    icon: '🔱',
    title: 'A once-a-year oath',
    subtitle: 'Sacred',
    example: 'High-stakes annual promise',
  },
];

const REWARD_CATEGORY_OPTIONS: RewardCategory[] = ['Rest', 'Fun', 'Growth', 'Treat', 'Social', 'Meta'];

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addWeeksToToday(weeks: number): string {
  const now = new Date();
  now.setDate(now.getDate() + weeks * 7);
  return toDateInputValue(now);
}

export function ContractWizard({
  userId,
  currentGoldBalance,
  currentTokenBalance,
  onComplete,
  onCancel,
  onRewardLinked,
}: ContractWizardProps) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickCreateType, setQuickCreateType] = useState<'Habit' | 'Goal' | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [quickCreateTargetDate, setQuickCreateTargetDate] = useState('');
  const [quickCreateSubmitting, setQuickCreateSubmitting] = useState(false);

  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);
  const [selectedContractType, setSelectedContractType] = useState<ContractType>('classic');
  const [sacredConfirmed, setSacredConfirmed] = useState(false);

  const [cadence, setCadence] = useState<ContractCadence>('daily');
  const [targetCount, setTargetCount] = useState<number>(1);
  const [endMode, setEndMode] = useState<'ongoing' | 'date' | 'weeks'>('ongoing');
  const [endDate, setEndDate] = useState<string>('');
  const [durationWeeks, setDurationWeeks] = useState<number>(4);

  const [stakeType, setStakeType] = useState<ContractStakeType>('gold');
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [graceDays, setGraceDays] = useState<number>(1);
  const [trackingMode, setTrackingMode] = useState<'progress' | 'outcome_only'>('progress');
  const [accountabilityMode] = useState<'solo' | 'witness'>('solo');
  const [witnessLabel] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRewards, setAvailableRewards] = useState<RewardItem[]>([]);
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [createRewardInline, setCreateRewardInline] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');

  const screens = useMemo<WizardScreen[]>(() => {
    const base: WizardScreen[] = ['target', 'type'];
    if (selectedContractType === 'sacred') {
      base.push('sacred_confirm');
    }
    base.push('cadence', 'ending', 'stake', 'checkin', 'buffer', 'reward', 'review');
    return base;
  }, [selectedContractType]);

  const currentScreen = screens[screenIndex] ?? screens[0];

  useEffect(() => {
    setScreenIndex((prev) => Math.min(prev, screens.length - 1));
  }, [screens.length]);

  useEffect(() => {
    const loadTargets = async () => {
      setLoading(true);
      try {
        const [habitsResult, goalsResult] = await Promise.all([listHabitsV2(), fetchGoals()]);
        const targets: TargetOption[] = [];

        if (habitsResult.data) {
          habitsResult.data.forEach((habit: HabitV2Row) => {
            if (!habit.archived) {
              targets.push({ id: habit.id, title: habit.title, type: 'Habit' });
            }
          });
        }

        if (goalsResult.data) {
          goalsResult.data.forEach((goal: GoalRow) => {
            if (goal.status_tag !== 'completed' && goal.status_tag !== 'cancelled') {
              targets.push({ id: goal.id, title: goal.title, type: 'Goal' });
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

    void loadTargets();
  }, []);

  useEffect(() => {
    const loadRewards = async () => {
      const { data } = await listAvailableRewardsForContracts(userId);
      setAvailableRewards(data ?? []);
    };

    void loadRewards();
  }, [userId]);

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

  const resolvedEndDate = endMode === 'date'
    ? endDate
    : endMode === 'weeks'
      ? addWeeksToToday(durationWeeks)
      : '';

  const reviewType = MVP_CONTRACT_TYPES.find((option) => option.type === selectedContractType);

  const validateCurrentScreen = (): boolean => {
    if (currentScreen === 'target' && !selectedTarget) {
      setError('Choose a habit, goal, or create a new target.');
      return false;
    }

    if (currentScreen === 'sacred_confirm' && !sacredConfirmed) {
      setError('Please confirm that you understand Sacred promise stakes.');
      return false;
    }

    if (currentScreen === 'cadence' && targetCount <= 0) {
      setError('Count must be at least 1.');
      return false;
    }

    if (currentScreen === 'ending' && endMode === 'date' && !endDate) {
      setError('Pick an end date or choose another ending option.');
      return false;
    }

    if (currentScreen === 'ending' && endMode === 'weeks' && durationWeeks < 1) {
      setError('Duration must be at least 1 week.');
      return false;
    }

    if (currentScreen === 'stake' && !stakeValid) {
      if (!hasStakeCapacity) {
        setError(`Build your ${stakeType === 'gold' ? 'Gold' : 'Tokens'} to at least 5 before creating a promise stake.`);
        return false;
      }
      setError(`Stake must be between 1 and ${maxStake} (20% of your ${stakeType === 'gold' ? 'Gold' : 'Tokens'}).`);
      return false;
    }

    if (currentScreen === 'reward' && createRewardInline && !newRewardTitle.trim()) {
      setError('Add a name for the quick reward or turn it off.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentScreen()) {
      return;
    }
    setScreenIndex((prev) => Math.min(prev + 1, screens.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setScreenIndex((prev) => Math.max(0, prev - 1));
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
        trackingMode,
        accountabilityMode,
        witnessLabel,
        endAt: resolvedEndDate ? new Date(resolvedEndDate).toISOString() : null,
        contractType: selectedContractType,
        identityStatement: null,
        redemptionQuestTitle: null,
        futureMessage: null,
        narrativeTheme: null,
        isSacred: selectedContractType === 'sacred',
        stages: null,
      };

      const { data: contract, error: createError } = await createContract(userId, input);
      if (createError || !contract) {
        throw createError || new Error('Failed to create contract');
      }

      const { error: activateError } = await activateContract(userId, contract.id);
      if (activateError) {
        throw activateError;
      }

      let rewardIdToLink = selectedRewardId;

      if (createRewardInline && newRewardTitle.trim()) {
        const { data: createdReward, error: createRewardError } = await createReward(userId, {
          title: newRewardTitle.trim(),
          description: '',
          costGold: 0,
          category: 'Treat',
          cooldownType: 'none',
          cooldownHours: undefined,
        });

        if (createRewardError || !createdReward) {
          throw createRewardError || new Error('Failed to create linked reward');
        }

        rewardIdToLink = createdReward.id;
      }

      if (rewardIdToLink) {
        const { error: linkError } = await linkRewardToContract(userId, contract.id, rewardIdToLink);
        if (linkError) {
          throw linkError;
        }
        onRewardLinked?.(contract.id);
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
        <div>
          <p className="contract-wizard__step-indicator">Step {screenIndex + 1} of {screens.length}</p>
          <div className="contract-wizard__progress" role="progressbar" aria-valuemin={1} aria-valuemax={screens.length} aria-valuenow={screenIndex + 1}>
            {screens.map((screen, idx) => (
              <span
                key={`${screen}-${idx}`}
                className={`contract-wizard__dot${idx <= screenIndex ? ' contract-wizard__dot--active' : ''}`}
              />
            ))}
          </div>
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

      {currentScreen === 'target' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">What do you want to commit to?</h3>

          {loading ? (
            <p className="contract-wizard__loading">Loading your habits and goals...</p>
          ) : targetOptions.length === 0 ? (
            <div className="contract-wizard__fallback">
              <p>Create a habit or goal first.</p>
            </div>
          ) : (
            <div className="contract-wizard__target-list">
              {targetOptions.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className={`contract-wizard__card${selectedTarget?.id === target.id ? ' contract-wizard__card--selected' : ''}`}
                  onClick={() => setSelectedTarget(target)}
                >
                  <span className="contract-wizard__card-icon">{target.type === 'Habit' ? '✓' : '🎯'}</span>
                  <span className="contract-wizard__card-content">
                    <strong>{target.title}</strong>
                    <small>{target.type}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="contract-wizard__quick-create">
            <p className="contract-wizard__quick-create-title">Or create a new one</p>
            <div className="contract-wizard__quick-create-types">
              <button
                type="button"
                className={`contract-wizard__pill${quickCreateType === 'Habit' ? ' contract-wizard__pill--selected' : ''}`}
                onClick={() => setQuickCreateType('Habit')}
              >
                + New Habit
              </button>
              <button
                type="button"
                className={`contract-wizard__pill${quickCreateType === 'Goal' ? ' contract-wizard__pill--selected' : ''}`}
                onClick={() => setQuickCreateType('Goal')}
              >
                + New Goal
              </button>
            </div>

            {quickCreateType && (
              <div className="contract-wizard__quick-create-form">
                <input
                  type="text"
                  className="contract-wizard__input"
                  placeholder={quickCreateType === 'Habit' ? 'Habit name' : 'Goal name'}
                  value={quickCreateTitle}
                  onChange={(event) => setQuickCreateTitle(event.target.value)}
                />
                {quickCreateType === 'Goal' && (
                  <input
                    type="date"
                    className="contract-wizard__input"
                    value={quickCreateTargetDate}
                    min={toDateInputValue(new Date())}
                    onChange={(event) => setQuickCreateTargetDate(event.target.value)}
                  />
                )}
                <button
                  type="button"
                  className="contract-wizard__button contract-wizard__button--secondary"
                  disabled={quickCreateSubmitting || !quickCreateTitle.trim()}
                  onClick={async () => {
                    const title = quickCreateTitle.trim();
                    if (!title) return;

                    setQuickCreateSubmitting(true);
                    setError(null);
                    try {
                      if (quickCreateType === 'Habit') {
                        const { data: habit, error: createError } = await quickAddDailyHabit({ title }, userId);
                        if (createError || !habit) {
                          throw createError || new Error('Failed to create habit');
                        }

                        const option: TargetOption = { id: habit.id, title: habit.title, type: 'Habit' };
                        setTargetOptions((prev) => [option, ...prev]);
                        setSelectedTarget(option);
                      } else {
                        const payload: GoalInsert = {
                          title,
                          description: null,
                          target_date: quickCreateTargetDate || null,
                          user_id: userId,
                          progress_notes: null,
                          status_tag: 'active',
                        };

                        const { data: goal, error: createError } = await insertGoal(payload);
                        if (createError || !goal) {
                          throw createError || new Error('Failed to create goal');
                        }

                        const option: TargetOption = { id: goal.id, title: goal.title, type: 'Goal' };
                        setTargetOptions((prev) => [option, ...prev]);
                        setSelectedTarget(option);
                      }

                      setQuickCreateTitle('');
                      setQuickCreateTargetDate('');
                      setQuickCreateType(null);
                    } catch (creationError) {
                      setError(creationError instanceof Error ? creationError.message : 'Failed to create target');
                    } finally {
                      setQuickCreateSubmitting(false);
                    }
                  }}
                >
                  {quickCreateSubmitting ? 'Creating...' : `Create ${quickCreateType}`}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {currentScreen === 'type' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">What kind of promise fits best?</h3>
          <div className="contract-wizard__type-grid">
            {MVP_CONTRACT_TYPES.map((option) => (
              <button
                key={option.type}
                type="button"
                className={`contract-wizard__card contract-wizard__card--type${selectedContractType === option.type ? ' contract-wizard__card--selected' : ''}`}
                onClick={() => setSelectedContractType(option.type)}
              >
                <span className="contract-wizard__card-icon">{option.icon}</span>
                <span className="contract-wizard__card-content">
                  <strong>{option.title}</strong>
                  <small>{option.subtitle}</small>
                  <small>{option.example}</small>
                </span>
              </button>
            ))}
          </div>
          <p className="contract-wizard__helper-text">More options coming soon.</p>
        </section>
      )}

      {currentScreen === 'sacred_confirm' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Sacred promise — are you sure?</h3>
          <div className="contract-wizard__sacred-card">
            <p className="contract-wizard__sacred-icon">🔱</p>
            <p>This is a once-a-year oath.</p>
            <p><strong>If you keep it:</strong> 3× bonus.</p>
            <p><strong>If you break it:</strong> 3× penalty + permanent reputation note.</p>
            <label className="contract-wizard__checkbox-row">
              <input
                type="checkbox"
                checked={sacredConfirmed}
                onChange={(event) => setSacredConfirmed(event.target.checked)}
              />
              I understand
            </label>
          </div>
        </section>
      )}

      {currentScreen === 'cadence' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">How often?</h3>
          <div className="contract-wizard__choice-row">
            <button
              type="button"
              className={`contract-wizard__choice${cadence === 'daily' ? ' contract-wizard__choice--selected' : ''}`}
              onClick={() => setCadence('daily')}
            >
              Daily
            </button>
            <button
              type="button"
              className={`contract-wizard__choice${cadence === 'weekly' ? ' contract-wizard__choice--selected' : ''}`}
              onClick={() => setCadence('weekly')}
            >
              Weekly
            </button>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="target-count">
              {selectedContractType === 'reverse'
                ? `How many slips are you allowing per ${cadence}?`
                : `How many times per ${cadence}?`}
            </label>
            <input
              id="target-count"
              type="number"
              min="1"
              className="contract-wizard__input"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </section>
      )}

      {currentScreen === 'ending' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Choose ending</h3>
          <div className="contract-wizard__target-list">
            <button
              type="button"
              className={`contract-wizard__card${endMode === 'ongoing' ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setEndMode('ongoing')}
            >
              <span className="contract-wizard__card-content">
                <strong>It keeps going until I cancel</strong>
              </span>
            </button>

            <button
              type="button"
              className={`contract-wizard__card${endMode === 'date' ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setEndMode('date')}
            >
              <span className="contract-wizard__card-content">
                <strong>On a specific date</strong>
              </span>
            </button>
            {endMode === 'date' && (
              <input
                type="date"
                className="contract-wizard__input"
                value={endDate}
                min={toDateInputValue(new Date())}
                onChange={(event) => setEndDate(event.target.value)}
              />
            )}

            <button
              type="button"
              className={`contract-wizard__card${endMode === 'weeks' ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setEndMode('weeks')}
            >
              <span className="contract-wizard__card-content">
                <strong>After N weeks</strong>
              </span>
            </button>
            {endMode === 'weeks' && (
              <input
                type="number"
                min={1}
                className="contract-wizard__input"
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(Math.max(1, Number(event.target.value) || 1))}
              />
            )}
          </div>
        </section>
      )}

      {currentScreen === 'stake' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">What do you stake?</h3>
          <p className="contract-wizard__balance-pill">
            Gold: {currentGoldBalance} · Tokens: {currentTokenBalance}
          </p>

          <div className="contract-wizard__choice-row">
            <button
              type="button"
              className={`contract-wizard__choice${stakeType === 'gold' ? ' contract-wizard__choice--selected' : ''}`}
              onClick={() => setStakeType('gold')}
            >
              Gold
            </button>
            <button
              type="button"
              className={`contract-wizard__choice${stakeType === 'tokens' ? ' contract-wizard__choice--selected' : ''}`}
              onClick={() => setStakeType('tokens')}
            >
              Tokens
            </button>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="stake-amount">Amount</label>
            <input
              id="stake-amount"
              type="number"
              min="1"
              max={Math.max(maxStake, 1)}
              className="contract-wizard__input"
              value={stakeAmount || ''}
              onChange={(event) => setStakeAmount(parseInt(event.target.value, 10) || 0)}
            />
            <p className="contract-wizard__helper-text">
              {hasStakeCapacity
                ? `You have ${balance} ${stakeType === 'gold' ? 'Gold' : 'Tokens'} (max: ${maxStake}).`
                : `You have ${balance} ${stakeType === 'gold' ? 'Gold' : 'Tokens'}. Reach 5+ to unlock staking.`}
            </p>
            {hasStakeCapacity && (
              <div className="contract-wizard__quick-stake-row">
                {[10, 15, 20].map((pct) => {
                  const value = Math.floor(balance * (pct / 100));
                  return (
                    <button
                      key={pct}
                      type="button"
                      className="contract-wizard__pill"
                      onClick={() => setStakeAmount(value)}
                    >
                      {pct}% ({value})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {currentScreen === 'checkin' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">How do you check in?</h3>
          <div className="contract-wizard__target-list">
            <button
              type="button"
              className={`contract-wizard__card${trackingMode === 'progress' ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setTrackingMode('progress')}
            >
              <span className="contract-wizard__card-content">
                <strong>I’ll mark each session</strong>
                <small>Tap a button whenever you complete it.</small>
              </span>
            </button>
            <button
              type="button"
              className={`contract-wizard__card${trackingMode === 'outcome_only' ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setTrackingMode('outcome_only')}
            >
              <span className="contract-wizard__card-content">
                <strong>I’ll declare pass/fail at the end</strong>
                <small>Best for “stop-doing” or one-time outcomes.</small>
              </span>
            </button>
          </div>
        </section>
      )}

      {currentScreen === 'buffer' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Buffer days</h3>
          <div className="contract-wizard__target-list">
            <button
              type="button"
              className={`contract-wizard__card${graceDays === 0 ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setGraceDays(0)}
            >
              <span className="contract-wizard__card-content">
                <strong>No buffer — strict</strong>
              </span>
            </button>
            <button
              type="button"
              className={`contract-wizard__card${graceDays === 1 ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setGraceDays(1)}
            >
              <span className="contract-wizard__card-content">
                <strong>1 buffer day — I might slip once</strong>
              </span>
            </button>
            <button
              type="button"
              className={`contract-wizard__card${graceDays === 2 ? ' contract-wizard__card--selected' : ''}`}
              onClick={() => setGraceDays(2)}
            >
              <span className="contract-wizard__card-content">
                <strong>2 buffer days — I want some slack</strong>
              </span>
            </button>
          </div>
          <p className="contract-wizard__helper-text">A buffer day means one miss won’t cost your stake.</p>
        </section>
      )}

      {currentScreen === 'reward' && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Optional reward</h3>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__label" htmlFor="linked-reward">Pick an existing reward</label>
            <select
              id="linked-reward"
              className="contract-wizard__input"
              value={selectedRewardId}
              onChange={(event) => setSelectedRewardId(event.target.value)}
            >
              <option value="">No reward</option>
              {availableRewards.map((reward) => (
                <option key={reward.id} value={reward.id}>{reward.title}</option>
              ))}
            </select>
          </div>

          <div className="contract-wizard__field-group">
            <label className="contract-wizard__checkbox-row">
              <input
                type="checkbox"
                checked={createRewardInline}
                onChange={(event) => setCreateRewardInline(event.target.checked)}
              />
              Create a quick reward
            </label>

            {createRewardInline && (
              <div className="contract-wizard__quick-create-form">
                <input
                  className="contract-wizard__input"
                  placeholder="Reward name"
                  value={newRewardTitle}
                  onChange={(event) => setNewRewardTitle(event.target.value)}
                  maxLength={40}
                />
                <select className="contract-wizard__input" defaultValue="Treat" disabled>
                  {REWARD_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>
      )}

      {currentScreen === 'review' && selectedTarget && (
        <section className="contract-wizard__step">
          <h3 className="contract-wizard__prompt">Review promise card</h3>

          <article className="contract-wizard__promise-card">
            <header>
              <p className="contract-wizard__promise-type">{reviewType?.icon} {reviewType?.subtitle ?? 'Classic'} promise</p>
              <h4>{selectedTarget.title}</h4>
            </header>

            <p>
              {selectedContractType === 'reverse'
                ? `You allow up to ${targetCount} slips per ${cadence}.`
                : `You commit to ${targetCount} ${targetCount === 1 ? 'time' : 'times'} per ${cadence}.`}
            </p>

            <p>
              {resolvedEndDate
                ? `Ends on ${new Date(resolvedEndDate).toLocaleDateString()}.`
                : 'No end date — ongoing until you cancel.'}
            </p>

            <p>
              Stake: {stakeAmount} {stakeType === 'gold' ? 'Gold' : 'Tokens'}
              {selectedContractType === 'sacred' ? ' (3× bonus on success, 3× penalty on miss)' : ''}.
            </p>

            <p>
              Check-in: {trackingMode === 'progress' ? 'I’ll mark each session.' : 'I’ll declare pass/fail at the end.'}
            </p>

            <p>Buffer days: {graceDays}.</p>

            <p>
              Reward: {
                createRewardInline && newRewardTitle.trim()
                  ? `${newRewardTitle.trim()} (new)`
                  : selectedRewardId
                    ? (availableRewards.find((reward) => reward.id === selectedRewardId)?.title ?? 'Linked reward')
                    : 'None'
              }.
            </p>

            <p className="contract-wizard__helper-text">
              This promise ends every {cadence === 'daily' ? 'day' : 'week'} at midnight. If you keep it, you earn back your stake + bonus. If you miss, your stake is forfeited.
            </p>
          </article>
        </section>
      )}

      <div className="contract-wizard__actions">
        {screenIndex > 0 ? (
          <button
            type="button"
            className="contract-wizard__button contract-wizard__button--secondary"
            onClick={handleBack}
            disabled={submitting}
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            className="contract-wizard__button contract-wizard__button--secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}

        {currentScreen === 'review' ? (
          <button
            type="button"
            className="contract-wizard__button contract-wizard__button--primary"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Creating promise...' : 'Make this promise'}
          </button>
        ) : (
          <button
            type="button"
            className="contract-wizard__button contract-wizard__button--primary"
            onClick={handleNext}
            disabled={submitting}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
