import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { recordTelemetryEvent } from '../../services/telemetry';

type ShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

type OnboardingLoop = {
  id: string;
  title: string;
  prompt: string;
  actionLabel: string;
  rewardLabel: string;
  rewardTokens: number;
  actionType:
    | 'displayName'
    | 'axis'
    | 'goal'
    | 'habit'
    | 'checkin'
    | 'focus'
    | 'vision'
    | 'reflection'
    | 'confirm';
};

const AXES = [
  {
    title: 'Agency',
    description: 'Make clear choices and follow through on what matters most.',
    icon: '🧭',
  },
  {
    title: 'Awareness',
    description: 'Notice patterns, emotions, and signals in your day-to-day rhythm.',
    icon: '🌤️',
  },
  {
    title: 'Rationality',
    description: 'Challenge assumptions and capture what you might be wrong about.',
    icon: '🧠',
  },
  {
    title: 'Vitality',
    description: 'Build energy with habits that keep your body and mind strong.',
    icon: '⚡️',
  },
];

const FOCUS_OPTIONS = ['Energy', 'Career', 'Relationships', 'Learning'];

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'theme-spark',
    name: 'Theme Spark',
    description: 'Unlock a starter color theme for your dashboard.',
    cost: 20,
  },
  {
    id: 'coach-prompt',
    name: 'Coach Prompt Pack',
    description: 'Unlock 3 guided prompts to use with your AI coach.',
    cost: 25,
  },
  {
    id: 'focus-boost',
    name: 'Focus Booster',
    description: 'Add a boost badge to your weekly focus card.',
    cost: 15,
  },
];

const ONBOARDING_LOOPS: OnboardingLoop[] = [
  {
    id: 'display-name',
    title: 'Claim your player name',
    prompt: 'Pick a display name so your wins feel personal.',
    actionLabel: 'Save name & continue',
    rewardLabel: 'Starter badge +10 tokens',
    rewardTokens: 10,
    actionType: 'displayName',
  },
  {
    id: 'axis',
    title: 'Choose your first axis',
    prompt: 'Select the life axis you want to rebalance first.',
    actionLabel: 'Lock in my axis',
    rewardLabel: 'Axis badge +10 tokens',
    rewardTokens: 10,
    actionType: 'axis',
  },
  {
    id: 'goal',
    title: 'Add one goal spark',
    prompt: 'Write one goal you want to move forward this week.',
    actionLabel: 'Save my goal',
    rewardLabel: 'Goal spark +15 tokens',
    rewardTokens: 15,
    actionType: 'goal',
  },
  {
    id: 'habit',
    title: 'Pick one habit',
    prompt: 'Name a habit you can repeat in 5 minutes or less.',
    actionLabel: 'Lock in my habit',
    rewardLabel: 'Habit streak token +15 tokens',
    rewardTokens: 15,
    actionType: 'habit',
  },
  {
    id: 'checkin',
    title: 'Quick check-in',
    prompt: 'How balanced do you feel today? Tap a number.',
    actionLabel: 'Save my check-in',
    rewardLabel: 'Balance insight +15 tokens',
    rewardTokens: 15,
    actionType: 'checkin',
  },
  {
    id: 'focus',
    title: 'Choose a weekly focus',
    prompt: 'Pick a focus area to keep your week simple.',
    actionLabel: 'Confirm my focus',
    rewardLabel: 'Focus badge +10 tokens',
    rewardTokens: 10,
    actionType: 'focus',
  },
  {
    id: 'vision',
    title: 'Add a vision spark',
    prompt: 'Describe one image or moment that motivates you.',
    actionLabel: 'Save my vision',
    rewardLabel: 'Vision spark +20 tokens',
    rewardTokens: 20,
    actionType: 'vision',
  },
  {
    id: 'reflection',
    title: 'One-line reflection',
    prompt: 'Write one sentence about what went well lately.',
    actionLabel: 'Save reflection',
    rewardLabel: 'Reflection boost +10 tokens',
    rewardTokens: 10,
    actionType: 'reflection',
  },
  {
    id: 'win',
    title: 'Celebrate a quick win',
    prompt: 'Tap continue to celebrate a win and lock in momentum.',
    actionLabel: 'Celebrate & continue',
    rewardLabel: 'Momentum badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'streak',
    title: 'Preview your streaks',
    prompt: 'Streaks help you stay consistent. Ready to build one?',
    actionLabel: 'I am ready',
    rewardLabel: 'Streak badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'coach',
    title: 'Meet the coach',
    prompt: 'Your coach turns reflections into next steps.',
    actionLabel: 'Unlock coach tips',
    rewardLabel: 'Coach access +15 tokens',
    rewardTokens: 15,
    actionType: 'confirm',
  },
  {
    id: 'dashboard',
    title: 'Preview your dashboard',
    prompt: 'Your dashboard will show goals, habits, and balance in one view.',
    actionLabel: 'Sounds good',
    rewardLabel: 'Dashboard preview +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'milestone',
    title: 'Set a milestone',
    prompt: 'Milestones keep your goals realistic and rewarding.',
    actionLabel: 'Add my milestone',
    rewardLabel: 'Milestone bonus +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'reminder',
    title: 'Choose your reminder style',
    prompt: 'Quick nudges keep you on track without overwhelm.',
    actionLabel: 'Pick this style',
    rewardLabel: 'Reminder badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'reward',
    title: 'Pick your first reward',
    prompt: 'Spend tokens to unlock helpful extras in the starter shop.',
    actionLabel: 'Open the shop',
    rewardLabel: 'Shop access +15 tokens',
    rewardTokens: 15,
    actionType: 'confirm',
  },
  {
    id: 'anchor',
    title: 'Anchor your day',
    prompt: 'Add a simple ritual you can repeat daily.',
    actionLabel: 'Save my ritual',
    rewardLabel: 'Ritual badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'community',
    title: 'Plan a share moment',
    prompt: 'Sharing wins keeps you accountable and motivated.',
    actionLabel: 'Lock in the plan',
    rewardLabel: 'Community badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'balance',
    title: 'Balance reminder',
    prompt: 'Hitting all four axes beats perfection in just one.',
    actionLabel: 'I get it',
    rewardLabel: 'Balance badge +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'next-step',
    title: 'Choose your next tiny step',
    prompt: 'Small steps keep your streak alive.',
    actionLabel: 'Confirm my step',
    rewardLabel: 'Next-step boost +10 tokens',
    rewardTokens: 10,
    actionType: 'confirm',
  },
  {
    id: 'finish',
    title: 'Ready to launch',
    prompt: 'You are ready to start the Game of Life journey.',
    actionLabel: 'Finish onboarding',
    rewardLabel: 'Launch bonus +30 tokens',
    rewardTokens: 30,
    actionType: 'confirm',
  },
];

type GameOfLifeOnboardingProps = {
  session: Session;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  profileSaving: boolean;
  setProfileSaving: Dispatch<SetStateAction<boolean>>;
  setAuthMessage: Dispatch<SetStateAction<string | null>>;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  isDemoExperience: boolean;
  onSaveDemoProfile: (payload: { displayName: string; onboardingComplete: boolean }) => void;
  onNavigateDashboard: () => void;
  onOpenCoach: () => void;
  onClose: () => void;
};

export function GameOfLifeOnboarding({
  session,
  displayName,
  setDisplayName,
  profileSaving,
  setProfileSaving,
  setAuthMessage,
  setAuthError,
  isDemoExperience,
  onSaveDemoProfile,
  onNavigateDashboard,
  onOpenCoach,
  onClose,
}: GameOfLifeOnboardingProps) {
  const { client } = useSupabaseAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'action' | 'reward'>('action');
  const [tokens, setTokens] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [unlockedItems, setUnlockedItems] = useState<ShopItem[]>([]);
  const [selectedAxis, setSelectedAxis] = useState<string>('');
  const [goalName, setGoalName] = useState('');
  const [habitName, setHabitName] = useState('');
  const [focusChoice, setFocusChoice] = useState('');
  const [checkinScore, setCheckinScore] = useState<number | null>(null);
  const [visionPrompt, setVisionPrompt] = useState('');
  const [reflection, setReflection] = useState('');
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  const step = ONBOARDING_LOOPS[stepIndex];
  const isFinalStep = stepIndex >= ONBOARDING_LOOPS.length - 1;
  const storageKey = `gol_onboarding_${session.user.id}`;

  const progressLabel = useMemo(() => {
    const current = Math.min(stepIndex + 1, ONBOARDING_LOOPS.length);
    return `Loop ${current} of ${ONBOARDING_LOOPS.length}`;
  }, [stepIndex]);

  const progressPercent = useMemo(() => {
    const current = Math.min(stepIndex + 1, ONBOARDING_LOOPS.length);
    return (current / ONBOARDING_LOOPS.length) * 100;
  }, [stepIndex]);

  useEffect(() => {
    if (hasLoadedStorage) return;
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue) as {
          stepIndex?: number;
          tokens?: number;
          unlockedItemIds?: string[];
        };
        if (typeof parsed.stepIndex === 'number') {
          setStepIndex(Math.min(parsed.stepIndex, ONBOARDING_LOOPS.length - 1));
        }
        if (typeof parsed.tokens === 'number') {
          setTokens(parsed.tokens);
        }
        if (parsed.unlockedItemIds?.length) {
          setUnlockedItems(
            SHOP_ITEMS.filter((item) => parsed.unlockedItemIds?.includes(item.id)),
          );
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setHasLoadedStorage(true);
  }, [hasLoadedStorage, storageKey]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    const payload = JSON.stringify({
      stepIndex,
      tokens,
      unlockedItemIds: unlockedItems.map((item) => item.id),
    });
    window.localStorage.setItem(storageKey, payload);
  }, [hasLoadedStorage, stepIndex, tokens, unlockedItems, storageKey]);

  const resetRewardState = () => {
    setPhase('action');
    setRewardClaimed(false);
  };

  const handleNext = () => {
    setStepIndex((current) => Math.min(current + 1, ONBOARDING_LOOPS.length - 1));
    resetRewardState();
  };

  const handleBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
    resetRewardState();
  };

  const handleCompleteAction = () => {
    setPhase('reward');
  };

  const handleClaimReward = () => {
    if (rewardClaimed) return;
    setTokens((current) => current + step.rewardTokens);
    setRewardClaimed(true);
  };

  const handlePurchase = (item: ShopItem) => {
    if (tokens < item.cost || unlockedItems.some((owned) => owned.id === item.id)) {
      return;
    }
    setTokens((current) => current - item.cost);
    setUnlockedItems((current) => [...current, item]);
  };

  const handleCompleteOnboarding = async (destination: 'dashboard' | 'coach') => {
    setProfileSaving(true);
    setAuthMessage(null);
    setAuthError(null);

    const nextName = displayName.trim() || session.user.email || 'Game of Life Player';

    try {
      if (isDemoExperience) {
        onSaveDemoProfile({
          displayName: nextName,
          onboardingComplete: true,
        });
      } else {
        if (!client) {
          throw new Error('Supabase client is not ready.');
        }
        const { error } = await client.auth.updateUser({
          data: {
            full_name: nextName,
            onboarding_complete: true,
          },
        });
        if (error) throw error;
      }

      setAuthMessage('Profile saved! Welcome to Game of Life.');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
      });

      if (destination === 'coach') {
        onOpenCoach();
      } else {
        onNavigateDashboard();
      }
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const renderActionContent = () => {
    switch (step.actionType) {
      case 'displayName':
        return (
          <label className="supabase-auth__field">
            <span>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={session.user.email ?? 'you@example.com'}
            />
          </label>
        );
      case 'axis':
        return (
          <div className="gol-onboarding__choices">
            {AXES.map((axis) => (
              <button
                key={axis.title}
                type="button"
                className={`gol-onboarding__choice ${selectedAxis === axis.title ? 'is-selected' : ''}`}
                onClick={() => setSelectedAxis(axis.title)}
              >
                <span aria-hidden="true">{axis.icon}</span>
                <span>
                  <strong>{axis.title}</strong>
                  <small>{axis.description}</small>
                </span>
              </button>
            ))}
          </div>
        );
      case 'goal':
        return (
          <label className="supabase-auth__field">
            <span>Goal focus</span>
            <input
              type="text"
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              placeholder="Example: Finish my pitch deck"
            />
          </label>
        );
      case 'habit':
        return (
          <label className="supabase-auth__field">
            <span>Habit spark</span>
            <input
              type="text"
              value={habitName}
              onChange={(event) => setHabitName(event.target.value)}
              placeholder="Example: 5-minute stretch"
            />
          </label>
        );
      case 'checkin':
        return (
          <div className="gol-onboarding__score">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={checkinScore === value ? 'is-selected' : ''}
                onClick={() => setCheckinScore(value)}
              >
                {value}
              </button>
            ))}
          </div>
        );
      case 'focus':
        return (
          <div className="gol-onboarding__pill-list">
            {FOCUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={focusChoice === option ? 'is-selected' : ''}
                onClick={() => setFocusChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case 'vision':
        return (
          <label className="supabase-auth__field">
            <span>Vision spark</span>
            <textarea
              rows={3}
              value={visionPrompt}
              onChange={(event) => setVisionPrompt(event.target.value)}
              placeholder="Example: A calm home office with sunlight"
            />
          </label>
        );
      case 'reflection':
        return (
          <label className="supabase-auth__field">
            <span>Reflection line</span>
            <textarea
              rows={3}
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="Example: I kept my promise to walk daily."
            />
          </label>
        );
      default:
        return (
          <div className="gol-onboarding__callout">
            <p>Tap continue to claim the reward and keep your momentum going.</p>
          </div>
        );
    }
  };

  return (
    <section className="gol-onboarding" aria-label="Game of Life onboarding">
      <header className="gol-onboarding__header" aria-live="polite" aria-atomic="true">
        <div className="gol-onboarding__header-row">
          <span className="gol-onboarding__step">{progressLabel}</span>
          <button type="button" className="gol-onboarding__close" onClick={onClose}>
            Close
          </button>
        </div>
        <h3>{step.title}</h3>
        <p>{step.prompt}</p>
        <div className="gol-onboarding__progress">
          <span>Progress</span>
          <div className="gol-onboarding__progress-bar" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span>
            {stepIndex + 1}/{ONBOARDING_LOOPS.length}
          </span>
        </div>
      </header>

      <form className="gol-onboarding__panel" onSubmit={handleProfileSubmit}>
        {phase === 'action' ? (
          <>
            {renderActionContent()}
            <div className="gol-onboarding__actions">
              {stepIndex > 0 ? (
                <button type="button" className="supabase-auth__secondary" onClick={handleBack}>
                  Back
                </button>
              ) : null}
              <button type="button" className="supabase-auth__action" onClick={handleCompleteAction}>
                {step.actionLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="gol-onboarding__reward">
              <div>
                <h4>Reward unlocked</h4>
                <p>{step.rewardLabel}</p>
              </div>
              <button
                type="button"
                className="supabase-auth__action"
                onClick={handleClaimReward}
                disabled={rewardClaimed}
              >
                {rewardClaimed ? `Claimed +${step.rewardTokens} tokens` : `Claim +${step.rewardTokens} tokens`}
              </button>
            </div>
            <div className="gol-onboarding__shop">
              <div className="gol-onboarding__shop-header">
                <h4>Starter shop</h4>
                <div className="gol-onboarding__tokens">Tokens: {tokens}</div>
              </div>
              <div className="gol-onboarding__shop-grid">
                {SHOP_ITEMS.map((item) => {
                  const isOwned = unlockedItems.some((owned) => owned.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`gol-onboarding__shop-item ${isOwned ? 'is-owned' : ''}`}
                      onClick={() => handlePurchase(item)}
                      disabled={isOwned || tokens < item.cost}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                      </div>
                      <span>{isOwned ? 'Unlocked' : `${item.cost} tokens`}</span>
                    </button>
                  );
                })}
              </div>
              {unlockedItems.length > 0 ? (
                <div className="gol-onboarding__shop-unlocks">
                  <span>Unlocked:</span>
                  <ul>
                    {unlockedItems.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="gol-onboarding__actions">
              {!isFinalStep ? (
                <button type="button" className="supabase-auth__action" onClick={handleNext}>
                  Next loop
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="supabase-auth__action"
                    onClick={() => handleCompleteOnboarding('dashboard')}
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving…' : 'Finish & open dashboard'}
                  </button>
                  <button
                    type="button"
                    className="supabase-auth__secondary"
                    onClick={() => handleCompleteOnboarding('coach')}
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving…' : 'Finish & meet your coach'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </form>
    </section>
  );
}
