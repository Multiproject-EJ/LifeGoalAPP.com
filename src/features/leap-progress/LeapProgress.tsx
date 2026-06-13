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

type QuestPerk = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

type LeapStageActionType =
  | 'heroName'
  | 'lifeForce'
  | 'questLine'
  | 'ritual'
  | 'radarCheckin'
  | 'microQuest'
  | 'focus'
  | 'vision'
  | 'reflection'
  | 'confirm';

type LeapStage = {
  id: string;
  act: string;
  title: string;
  prompt: string;
  actionLabel: string;
  rewardLabel: string;
  rewardXp: number;
  actionType: LeapStageActionType;
};

// Quest Compass "Life Forces" — the newer front-end framing for the Life Wheel.
const LIFE_FORCES = [
  {
    title: 'Fire',
    description: 'Passion, energy, joy, and creativity that light up your days.',
    icon: '🔥',
  },
  {
    title: 'Strength',
    description: 'Health, resilience, and the stable base your quest stands on.',
    icon: '💪',
  },
  {
    title: 'Connection',
    description: 'Love, family, and the people who travel the quest with you.',
    icon: '🤝',
  },
  {
    title: 'Wealth',
    description: 'Money, resources, and the freedom to choose your next move.',
    icon: '💎',
  },
  {
    title: 'Growth',
    description: 'Learning, skill, and the wisdom that levels up your hero.',
    icon: '🌱',
  },
  {
    title: 'Direction',
    description: 'Purpose, vision, and the meaning that points your compass.',
    icon: '🧭',
  },
];

const MICRO_QUESTS = [
  {
    id: 'decisive-move',
    title: 'Make one decisive move',
    description: 'Take a single 10-minute action that nudges your Quest Line forward.',
  },
  {
    id: 'log-a-signal',
    title: 'Log one signal',
    description: 'Notice a pattern, emotion, or trigger and jot it down in one sentence.',
  },
  {
    id: 'refuel',
    title: 'Refuel for 5 minutes',
    description: 'Hydrate, stretch, or rest to top up the energy your quest runs on.',
  },
];

const FOCUS_OPTIONS = ['Energy', 'Career', 'Relationships', 'Learning'];

const QUEST_PERKS: QuestPerk[] = [
  {
    id: 'theme-spark',
    name: 'Theme Spark',
    description: 'Unlock a starter color theme for your Quest Hub.',
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

// A tighter, quest-aligned leveling sprint (3 acts) — optional, opt-in.
const LEAP_STAGES: LeapStage[] = [
  // Act 1 — Set your quest
  {
    id: 'hero-name',
    act: 'Set your quest',
    title: 'Name your hero',
    prompt: 'Step into your Quest Journey with a name that makes every win feel personal.',
    actionLabel: 'Save name & continue',
    rewardLabel: 'Starter badge +10 XP',
    rewardXp: 10,
    actionType: 'heroName',
  },
  {
    id: 'life-force',
    act: 'Set your quest',
    title: 'Read your Life Radar',
    prompt: 'Pick the Life Force you want to strengthen first — your compass points here.',
    actionLabel: 'Lock in my force',
    rewardLabel: 'Compass badge +10 XP',
    rewardXp: 10,
    actionType: 'lifeForce',
  },
  {
    id: 'quest-line',
    act: 'Set your quest',
    title: 'Define a Quest Line',
    prompt: 'Name one goal — your Quest Line — you want to move forward this week.',
    actionLabel: 'Save my Quest Line',
    rewardLabel: 'Quest Line spark +15 XP',
    rewardXp: 15,
    actionType: 'questLine',
  },
  {
    id: 'ritual',
    act: 'Set your quest',
    title: 'Attach a Supporting Ritual',
    prompt: 'Name a habit you can repeat in 5 minutes or less to power the Quest Line.',
    actionLabel: 'Lock in my ritual',
    rewardLabel: 'Ritual streak +15 XP',
    rewardXp: 15,
    actionType: 'ritual',
  },
  // Act 2 — Play the loop
  {
    id: 'radar-checkin',
    act: 'Play the loop',
    title: 'Log a Life Radar check-in',
    prompt: 'How balanced do you feel today? Tap a number to log your Radar.',
    actionLabel: 'Save my check-in',
    rewardLabel: 'Radar insight +15 XP',
    rewardXp: 15,
    actionType: 'radarCheckin',
  },
  {
    id: 'micro-quest',
    act: 'Play the loop',
    title: "Claim today's Micro-Quest",
    prompt: 'Pick one tiny Micro-Quest to play right now and keep the loop turning.',
    actionLabel: 'Claim my Micro-Quest',
    rewardLabel: 'Micro-Quest +15 XP',
    rewardXp: 15,
    actionType: 'microQuest',
  },
  {
    id: 'done-ish',
    act: 'Play the loop',
    title: 'Partial wins still count',
    prompt:
      'Didn’t fully finish a ritual? Use the "Done-ish" button in the expanded habit card to log partial credit. You keep 70% XP and your streak stays alive — honest tracking beats all-or-nothing.',
    actionLabel: 'Got it',
    rewardLabel: 'Honesty badge +10 XP',
    rewardXp: 10,
    actionType: 'confirm',
  },
  {
    id: 'weekly-focus',
    act: 'Play the loop',
    title: 'Choose a weekly focus',
    prompt: 'Pick a focus area to keep your week simple and your quest pointed.',
    actionLabel: 'Confirm my focus',
    rewardLabel: 'Focus badge +10 XP',
    rewardXp: 10,
    actionType: 'focus',
  },
  // Act 3 — Level up
  {
    id: 'vision',
    act: 'Level up',
    title: 'Add a Vision spark',
    prompt: 'Describe one image or moment that motivates the hero of your quest.',
    actionLabel: 'Save my vision',
    rewardLabel: 'Vision spark +20 XP',
    rewardXp: 20,
    actionType: 'vision',
  },
  {
    id: 'reflection',
    act: 'Level up',
    title: 'Capture a reflection',
    prompt: 'Write one sentence about what has gone well on your quest lately.',
    actionLabel: 'Save reflection',
    rewardLabel: 'Reflection boost +10 XP',
    rewardXp: 10,
    actionType: 'reflection',
  },
  {
    id: 'coach',
    act: 'Level up',
    title: 'Meet your Coach',
    prompt: 'Your coach turns reflections and Radar signals into your next step.',
    actionLabel: 'Unlock coach tips',
    rewardLabel: 'Coach access +15 XP',
    rewardXp: 15,
    actionType: 'confirm',
  },
  {
    id: 'launch',
    act: 'Level up',
    title: 'Take the leap',
    prompt: 'Your Quest Journey is primed. Bank the launch bonus and jump in.',
    actionLabel: 'Finish the leap',
    rewardLabel: 'Launch bonus +40 XP',
    rewardXp: 40,
    actionType: 'confirm',
  },
];

type LeapProgressProps = {
  session: Session;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  profileSaving: boolean;
  setProfileSaving: Dispatch<SetStateAction<boolean>>;
  setAuthMessage: Dispatch<SetStateAction<string | null>>;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  isDemoExperience: boolean;
  onSaveDemoProfile: (payload: { displayName: string; onboardingComplete: boolean }) => void;
  onNavigateHub: () => void;
  onOpenCoach: () => void;
  onClose: () => void;
};

export function LeapProgress({
  session,
  displayName,
  setDisplayName,
  profileSaving,
  setProfileSaving,
  setAuthMessage,
  setAuthError,
  isDemoExperience,
  onSaveDemoProfile,
  onNavigateHub,
  onOpenCoach,
  onClose,
}: LeapProgressProps) {
  const { client } = useSupabaseAuth();
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<'action' | 'reward'>('action');
  const [xp, setXp] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [unlockedPerks, setUnlockedPerks] = useState<QuestPerk[]>([]);
  const [selectedForce, setSelectedForce] = useState('');
  const [questLine, setQuestLine] = useState('');
  const [ritualName, setRitualName] = useState('');
  const [focusChoice, setFocusChoice] = useState('');
  const [checkinScore, setCheckinScore] = useState<number | null>(null);
  const [microQuestId, setMicroQuestId] = useState('');
  const [visionPrompt, setVisionPrompt] = useState('');
  const [reflection, setReflection] = useState('');
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  const stage = LEAP_STAGES[stageIndex];
  const isFinalStage = stageIndex >= LEAP_STAGES.length - 1;
  const storageKey = `leap_progress_${session.user.id}`;

  const progressLabel = useMemo(() => {
    const current = Math.min(stageIndex + 1, LEAP_STAGES.length);
    return `Leap ${current} of ${LEAP_STAGES.length}`;
  }, [stageIndex]);

  const progressPercent = useMemo(() => {
    const current = Math.min(stageIndex + 1, LEAP_STAGES.length);
    return (current / LEAP_STAGES.length) * 100;
  }, [stageIndex]);

  useEffect(() => {
    if (hasLoadedStorage) return;
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue) as {
          stageIndex?: number;
          xp?: number;
          unlockedPerkIds?: string[];
        };
        if (typeof parsed.stageIndex === 'number') {
          setStageIndex(Math.min(parsed.stageIndex, LEAP_STAGES.length - 1));
        }
        if (typeof parsed.xp === 'number') {
          setXp(parsed.xp);
        }
        if (parsed.unlockedPerkIds?.length) {
          setUnlockedPerks(
            QUEST_PERKS.filter((perk) => parsed.unlockedPerkIds?.includes(perk.id)),
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
      stageIndex,
      xp,
      unlockedPerkIds: unlockedPerks.map((perk) => perk.id),
    });
    window.localStorage.setItem(storageKey, payload);
  }, [hasLoadedStorage, stageIndex, xp, unlockedPerks, storageKey]);

  // Close Leap Progress with Escape key.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const resetRewardState = () => {
    setPhase('action');
    setRewardClaimed(false);
  };

  const handleNext = () => {
    setStageIndex((current) => Math.min(current + 1, LEAP_STAGES.length - 1));
    resetRewardState();
  };

  const handleBack = () => {
    setStageIndex((current) => Math.max(current - 1, 0));
    resetRewardState();
  };

  const handleCompleteAction = () => {
    setPhase('reward');
  };

  const handleClaimReward = () => {
    if (rewardClaimed) return;
    setXp((current) => current + stage.rewardXp);
    setRewardClaimed(true);
  };

  const handlePurchase = (perk: QuestPerk) => {
    if (xp < perk.cost || unlockedPerks.some((owned) => owned.id === perk.id)) {
      return;
    }
    setXp((current) => current - perk.cost);
    setUnlockedPerks((current) => [...current, perk]);
  };

  const handleCompleteLeap = async (destination: 'hub' | 'coach') => {
    setProfileSaving(true);
    setAuthMessage(null);
    setAuthError(null);

    const nextName = displayName.trim() || session.user.email || 'Quest Player';

    try {
      if (isDemoExperience) {
        // Leap Progress is decoupled from onboarding: it never flips onboarding_complete.
        onSaveDemoProfile({
          displayName: nextName,
          onboardingComplete: false,
        });
      } else if (nextName !== (session.user.user_metadata?.full_name ?? '')) {
        if (!client) {
          throw new Error('Supabase client is not ready.');
        }
        const { error } = await client.auth.updateUser({
          data: {
            full_name: nextName,
          },
        });
        if (error) throw error;
      }

      setAuthMessage('Leap complete — your quest just levelled up.');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'leap_progress_completed',
        metadata: {
          xp,
          life_force: selectedForce,
          quest_line: questLine,
          ritual: ritualName,
        },
      });

      if (destination === 'coach') {
        onOpenCoach();
      } else {
        onNavigateHub();
      }
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to save your leap.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const renderActionContent = () => {
    switch (stage.actionType) {
      case 'heroName':
        return (
          <label className="supabase-auth__field">
            <span>Hero name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={session.user.email ?? 'you@example.com'}
            />
          </label>
        );
      case 'lifeForce':
        return (
          <div className="leap-progress__choices">
            {LIFE_FORCES.map((force) => (
              <button
                key={force.title}
                type="button"
                className={`leap-progress__choice ${selectedForce === force.title ? 'is-selected' : ''}`}
                onClick={() => setSelectedForce(force.title)}
                aria-pressed={selectedForce === force.title}
              >
                <span aria-hidden="true">{force.icon}</span>
                <span>
                  <strong>{force.title}</strong>
                  <small>{force.description}</small>
                </span>
              </button>
            ))}
          </div>
        );
      case 'questLine':
        return (
          <label className="supabase-auth__field">
            <span>Quest Line</span>
            <input
              type="text"
              value={questLine}
              onChange={(event) => setQuestLine(event.target.value)}
              placeholder="Example: Finish my pitch deck"
            />
          </label>
        );
      case 'ritual':
        return (
          <label className="supabase-auth__field">
            <span>Supporting Ritual</span>
            <input
              type="text"
              value={ritualName}
              onChange={(event) => setRitualName(event.target.value)}
              placeholder="Example: 5-minute stretch"
            />
          </label>
        );
      case 'radarCheckin':
        return (
          <div className="leap-progress__score">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={checkinScore === value ? 'is-selected' : ''}
                onClick={() => setCheckinScore(value)}
                aria-label={`Rate balance level ${value} out of 5`}
                aria-pressed={checkinScore === value}
              >
                {value}
              </button>
            ))}
          </div>
        );
      case 'microQuest':
        return (
          <div className="leap-progress__choices">
            {MICRO_QUESTS.map((quest) => (
              <button
                key={quest.id}
                type="button"
                className={`leap-progress__choice ${microQuestId === quest.id ? 'is-selected' : ''}`}
                onClick={() => setMicroQuestId(quest.id)}
                aria-pressed={microQuestId === quest.id}
              >
                <span aria-hidden="true">⚡️</span>
                <span>
                  <strong>{quest.title}</strong>
                  <small>{quest.description}</small>
                </span>
              </button>
            ))}
          </div>
        );
      case 'focus':
        return (
          <div className="leap-progress__pill-list">
            {FOCUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={focusChoice === option ? 'is-selected' : ''}
                onClick={() => setFocusChoice(option)}
                aria-pressed={focusChoice === option}
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
          <div className="leap-progress__callout">
            <p>Tap continue to bank the XP and keep your quest momentum going.</p>
          </div>
        );
    }
  };

  return (
    <section className="leap-progress" role="dialog" aria-modal="true" aria-label="Leap Progress">
      <header className="leap-progress__header" aria-live="polite" aria-atomic="true">
        <div className="leap-progress__header-row">
          <span className="leap-progress__step">{progressLabel}</span>
          <button type="button" className="leap-progress__close" onClick={onClose} aria-label="Close Leap Progress">
            Close
          </button>
        </div>
        <p className="leap-progress__eyebrow">Leap Progress · {stage.act}</p>
        <h3>{stage.title}</h3>
        <p>{stage.prompt}</p>
        <div className="leap-progress__progress">
          <span>Progress</span>
          <div className="leap-progress__progress-bar" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span>
            {stageIndex + 1}/{LEAP_STAGES.length}
          </span>
        </div>
      </header>

      <form className="leap-progress__panel" onSubmit={handleProfileSubmit}>
        {phase === 'action' ? (
          <>
            {renderActionContent()}
            <div className="leap-progress__actions">
              {stageIndex > 0 ? (
                <button type="button" className="supabase-auth__secondary" onClick={handleBack}>
                  Back
                </button>
              ) : null}
              <button type="button" className="supabase-auth__action" onClick={handleCompleteAction}>
                {stage.actionLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="leap-progress__reward">
              <div>
                <h4>XP unlocked</h4>
                <p>{stage.rewardLabel}</p>
              </div>
              <button
                type="button"
                className="supabase-auth__action"
                onClick={handleClaimReward}
                disabled={rewardClaimed}
              >
                {rewardClaimed ? `Claimed +${stage.rewardXp} XP` : `Claim +${stage.rewardXp} XP`}
              </button>
            </div>
            <div className="leap-progress__shop">
              <div className="leap-progress__shop-header">
                <h4>Quest perks</h4>
                <div className="leap-progress__tokens">XP: {xp}</div>
              </div>
              <div className="leap-progress__shop-grid">
                {QUEST_PERKS.map((perk) => {
                  const isOwned = unlockedPerks.some((owned) => owned.id === perk.id);
                  return (
                    <button
                      key={perk.id}
                      type="button"
                      className={`leap-progress__shop-item ${isOwned ? 'is-owned' : ''}`}
                      onClick={() => handlePurchase(perk)}
                      disabled={isOwned || xp < perk.cost}
                    >
                      <div>
                        <strong>{perk.name}</strong>
                        <p>{perk.description}</p>
                      </div>
                      <span>{isOwned ? 'Unlocked' : `${perk.cost} XP`}</span>
                    </button>
                  );
                })}
              </div>
              {unlockedPerks.length > 0 ? (
                <div className="leap-progress__shop-unlocks">
                  <span>Unlocked:</span>
                  <ul>
                    {unlockedPerks.map((perk) => (
                      <li key={perk.id}>{perk.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="leap-progress__actions">
              {!isFinalStage ? (
                <button type="button" className="supabase-auth__action" onClick={handleNext}>
                  Next leap
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="supabase-auth__action"
                    onClick={() => handleCompleteLeap('hub')}
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving…' : 'Finish & open Quest Hub'}
                  </button>
                  <button
                    type="button"
                    className="supabase-auth__secondary"
                    onClick={() => handleCompleteLeap('coach')}
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
