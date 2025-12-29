import { useState, useRef, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { 
  fetchHabitsForUser, 
  fetchHabitLogsForRange,
  logHabitCompletion,
  clearHabitCompletion,
  type LegacyHabitWithGoal as HabitWithGoal 
} from '../compat/legacyHabitsAdapter';
import { useGamification } from '../hooks/useGamification';
import { XP_REWARDS } from '../types/gamification';
import { AiCoach } from '../features/ai-coach';
import '../features/ai-coach/AiCoach.css';
import { GamificationHeader } from './GamificationHeader';

type JournalType = 'standard' | 'quick' | 'deep' | 'brain_dump' | 'life_wheel' | 'secret' | 'goal' | 'time_capsule';

type QuickActionsFABProps = {
  session: Session;
  onCheckHabit?: () => void;
  onJournalNow?: (type: JournalType) => void;
  onOpenLifeCoach?: () => void;
  onToggleWorkspaceMenu?: (isFabOpen: boolean) => void;
};

type QuickAction = {
  id: string;
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
};

const JOURNAL_TYPES: { type: JournalType; icon: string; label: string }[] = [
  { type: 'quick', icon: '⚡', label: 'Quick' },
  { type: 'standard', icon: '📝', label: 'Standard' },
  { type: 'deep', icon: '🔮', label: 'Deep' },
  { type: 'brain_dump', icon: '🧠', label: 'Brain Dump' },
  { type: 'life_wheel', icon: '🎯', label: 'Life Wheel' },
  { type: 'goal', icon: '🎪', label: 'Goal' },
];

const QUICK_JOURNAL_SHORTCUTS = JOURNAL_TYPES.filter((jt) =>
  ['quick', 'brain_dump'].includes(jt.type),
);

const EXTENDED_JOURNAL_TYPES = JOURNAL_TYPES.filter(
  (jt) => !['quick', 'brain_dump'].includes(jt.type),
);

const STREAK_LOOKBACK_DAYS = 60;

export function QuickActionsFAB({
  session,
  onCheckHabit,
  onJournalNow,
  onOpenLifeCoach,
  onToggleWorkspaceMenu,
}: QuickActionsFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showJournalTypes, setShowJournalTypes] = useState(false);
  const [showLifeCoach, setShowLifeCoach] = useState(false);
  const [showHabitsSubmenu, setShowHabitsSubmenu] = useState(false);
  const [showGamificationCard, setShowGamificationCard] = useState(false);
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<Record<string, { logId: string | null; completed: boolean }>>({});
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  const {
    earnXP,
    recordActivity,
    profile: gamificationProfile,
    levelInfo,
    enabled: gamificationEnabled,
    loading: gamificationLoading,
    refreshProfile,
  } = useGamification(session);

  const parseISODate = (value: string): Date => {
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return new Date(value);
    }
    return new Date(year, month - 1, day);
  };

  const createScheduleChecker = (frequency: string, schedule: unknown) => {
    if (schedule && Array.isArray(schedule)) {
      const indexes = schedule
        .map((item) => (typeof item === 'string' ? item.toLowerCase() : undefined))
        .map((day) => {
          switch (day) {
            case 'sunday':
              return 0;
            case 'monday':
              return 1;
            case 'tuesday':
              return 2;
            case 'wednesday':
              return 3;
            case 'thursday':
              return 4;
            case 'friday':
              return 5;
            case 'saturday':
              return 6;
            default:
              return undefined;
          }
        })
        .filter((value): value is number => typeof value === 'number');
      if (indexes.length > 0) {
        return (date: Date) => indexes.includes(date.getDay());
      }
    }

    if (schedule && typeof schedule === 'object') {
      const value = schedule as { type?: string; days?: unknown[] };
      const type = typeof value.type === 'string' ? value.type.toLowerCase() : '';
      if (type === 'weekly' && Array.isArray(value.days)) {
        const indexes = value.days
          .map((item) => (typeof item === 'string' ? item.toLowerCase() : undefined))
          .map((day) => {
            switch (day) {
              case 'sunday':
                return 0;
              case 'monday':
                return 1;
              case 'tuesday':
                return 2;
              case 'wednesday':
                return 3;
              case 'thursday':
                return 4;
              case 'friday':
                return 5;
              case 'saturday':
                return 6;
              default:
                return undefined;
            }
          })
          .filter((value): value is number => typeof value === 'number');
        if (indexes.length > 0) {
          return (date: Date) => indexes.includes(date.getDay());
        }
      }
      if (type === 'daily') {
        return () => true;
      }
    }

    if (typeof frequency === 'string' && frequency.toLowerCase().includes('weekly')) {
      return () => true;
    }

    return () => true;
  };

  const formatISODate = (date: Date) => date.toISOString().split('T')[0];

  const subtractDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() - days);
    return next;
  };

  const calculateHabitStreaks = (
    habitsList: HabitWithGoal[],
    logs: { habit_id: string; date: string; completed: boolean }[],
    trackingDateISO: string,
  ) => {
    const todayDate = parseISODate(trackingDateISO);
    const lookbackStartDate = subtractDays(todayDate, STREAK_LOOKBACK_DAYS - 1);
    const lookbackStartISO = formatISODate(lookbackStartDate);

    const completionSets = new Map<string, Set<string>>();

    for (const log of logs) {
      if (!log.completed) continue;
      if (log.date < lookbackStartISO || log.date > trackingDateISO) continue;
      let set = completionSets.get(log.habit_id);
      if (!set) {
        set = new Set<string>();
        completionSets.set(log.habit_id, set);
      }
      set.add(log.date);
    }

    const insights = new Map<string, { currentStreak: number; longestStreak: number }>();

    for (const habit of habitsList) {
      const scheduleChecker = createScheduleChecker(habit.frequency, habit.schedule);
      const completionDates = completionSets.get(habit.id) ?? new Set<string>();
      let currentStreak = 0;
      let longestStreak = 0;
      let runningStreak = 0;
      let withinCurrent = true;

      for (let offset = 0; offset < STREAK_LOOKBACK_DAYS; offset += 1) {
        const checkDate = subtractDays(todayDate, offset);
        if (checkDate < lookbackStartDate) {
          break;
        }
        if (!scheduleChecker(checkDate)) {
          continue;
        }

        const isoDate = formatISODate(checkDate);
        const completed = completionDates.has(isoDate);
        if (completed) {
          runningStreak += 1;
          if (withinCurrent) {
            currentStreak += 1;
          }
          if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
          }
        } else {
          if (withinCurrent) {
            withinCurrent = false;
          }
          runningStreak = 0;
        }
      }

      insights.set(habit.id, {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
      });
    }

    return insights;
  };

  // Close FAB menu and reset all states on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowJournalTypes(false);
        setShowHabitsSubmenu(false);
        setShowGamificationCard(false);
        // Note: showLifeCoach is not reset here because the Life Coach modal
        // has its own backdrop click handler for closing
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) {
      setShowJournalTypes(false);
      setShowHabitsSubmenu(false);
      setShowGamificationCard(false);
    }
    onToggleWorkspaceMenu?.(nextIsOpen);
  };

  // Load habits and their completion status
  const loadHabits = useCallback(async () => {
    setLoadingHabits(true);
    try {
      // Get today's date in ISO format
      const today = new Date();
      const todayISO = formatISODate(today);
      const lookbackStartISO = formatISODate(subtractDays(today, STREAK_LOOKBACK_DAYS - 1));
      
      // Fetch habits
      const { data: habitsData, error: habitsError } = await fetchHabitsForUser(session.user.id);
      if (habitsError) throw habitsError;
      
      const fetchedHabits = habitsData ?? [];
      
      if (fetchedHabits.length === 0) {
        setHabitCompletions({});
        setHabits([]);
        return;
      }
      
      // Fetch completion logs for streak sorting + today completion state
      const habitIds = fetchedHabits.map((habit) => habit.id);
      const { data: logs, error: logsError } = await fetchHabitLogsForRange(
        habitIds,
        lookbackStartISO,
        todayISO,
      );
      if (logsError) throw logsError;

      const streaks = calculateHabitStreaks(fetchedHabits, logs ?? [], todayISO);
      const sortedHabits = [...fetchedHabits].sort((a, b) => {
        const aStreak = streaks.get(a.id);
        const bStreak = streaks.get(b.id);
        const aCurrent = aStreak?.currentStreak ?? 0;
        const bCurrent = bStreak?.currentStreak ?? 0;
        if (aCurrent !== bCurrent) {
          return bCurrent - aCurrent;
        }
        const aLongest = aStreak?.longestStreak ?? 0;
        const bLongest = bStreak?.longestStreak ?? 0;
        if (aLongest !== bLongest) {
          return bLongest - aLongest;
        }
        return a.name.localeCompare(b.name);
      });
      
      // Build completion state
      const completions: Record<string, { logId: string | null; completed: boolean }> = {};
      habitIds.forEach((id) => {
        completions[id] = { logId: null, completed: false };
      });
      
      (logs ?? []).forEach((log) => {
        if (log.date === todayISO) {
          completions[log.habit_id] = {
            logId: log.id,
            completed: Boolean(log.completed),
          };
        }
      });
      
      setHabitCompletions(completions);
      setHabits(sortedHabits);
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setLoadingHabits(false);
    }
  }, [session.user.id]);

  const handleCheckHabit = async () => {
    // Toggle the habits submenu instead of navigating
    const newShowHabitsSubmenu = !showHabitsSubmenu;
    setShowHabitsSubmenu(newShowHabitsSubmenu);
    setShowJournalTypes(false);
    setShowLifeCoach(false);
    setShowGamificationCard(false);
    
    // Load habits when opening the submenu (only if not already loading or loaded)
    if (newShowHabitsSubmenu && habits.length === 0 && !loadingHabits) {
      await loadHabits();
    }
  };

  const handleJournalClick = () => {
    setShowJournalTypes(!showJournalTypes);
    setShowHabitsSubmenu(false);
    setShowLifeCoach(false);
    setShowGamificationCard(false);
  };

  const handleJournalTypeSelect = (type: JournalType) => {
    onJournalNow?.(type);
    setIsOpen(false);
    setShowJournalTypes(false);
  };

  const handleLifeCoachClick = () => {
    setShowHabitsSubmenu(false);
    setShowJournalTypes(false);
    setShowLifeCoach(true);
    setShowGamificationCard(false);
    setIsOpen(false);
  };

  const handleGamificationClick = () => {
    setShowHabitsSubmenu(false);
    setShowJournalTypes(false);
    setShowLifeCoach(false);
    setShowGamificationCard(true);
    setIsOpen(false);
    refreshProfile?.();
  };

  const closeLifeCoach = () => {
    setShowLifeCoach(false);
  };

  const openFullHabits = () => {
    setIsOpen(false);
    setShowHabitsSubmenu(false);
    onCheckHabit?.();
  };

  const openFullJournal = () => {
    onJournalNow?.('standard');
    setIsOpen(false);
    setShowJournalTypes(false);
  };

  const closeGamificationCard = () => {
    setShowGamificationCard(false);
  };

  const toggleHabitCompletion = async (habitId: string) => {
    setSavingHabitId(habitId);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentState = habitCompletions[habitId];
      const wasCompleted = currentState?.completed ?? false;

      if (wasCompleted) {
        // Clear the completion
        const { error } = await clearHabitCompletion(habitId, today);
        if (error) throw error;
        
        setHabitCompletions(prev => ({
          ...prev,
          [habitId]: { logId: null, completed: false },
        }));
      } else {
        // Log the completion
        const { data, error } = await logHabitCompletion({
          habit_id: habitId,
          date: today,
          completed: true,
        });
        if (error) throw error;
        
        setHabitCompletions(prev => ({
          ...prev,
          [habitId]: { logId: data?.id ?? null, completed: true },
        }));

        // ✨ Award XP for habit completion
        const now = new Date();
        const isEarlyMorning = now.getHours() < 9;
        const xpAmount = isEarlyMorning 
          ? XP_REWARDS.HABIT_COMPLETE_EARLY  // 15 XP for early morning
          : XP_REWARDS.HABIT_COMPLETE;        // 10 XP
        
        await earnXP(xpAmount, 'habit_complete', habitId);
        await recordActivity();
      }

      await loadHabits();
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    } finally {
      setSavingHabitId(null);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'check-habit',
      icon: '✅',
      label: 'Check off habit',
      color: '#10b981',
      onClick: handleCheckHabit,
    },
    {
      id: 'journal',
      icon: '📔',
      label: 'Journal Now',
      color: '#8b5cf6',
      onClick: handleJournalClick,
    },
    {
      id: 'life-coach',
      icon: '🤖',
      label: 'Life Coach AI',
      color: '#0ea5e9',
      onClick: handleLifeCoachClick,
    },
    {
      id: 'gamification',
      icon: '🎮',
      label: 'Scorecard',
      color: '#f97316',
      onClick: handleGamificationClick,
    },
  ];

  return (
    <>
      <div
        ref={fabRef}
        className={`quick-actions-fab ${isOpen ? 'quick-actions-fab--open' : ''}`}
      >
        {/* Action buttons that fan out */}
        <div className="quick-actions-fab__actions">
          {quickActions.map((action, index) => (
            <div
              key={action.id}
              className={`quick-actions-fab__action ${isOpen ? 'quick-actions-fab__action--visible' : ''}`}
              style={{
                '--action-index': index,
                '--action-color': action.color,
              } as React.CSSProperties}
            >
              <button
                type="button"
                className="quick-actions-fab__action-btn"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
              >
                <span className="quick-actions-fab__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
              </button>
              <span className="quick-actions-fab__action-label">{action.label}</span>

              {/* Journal type sub-menu */}
              {action.id === 'journal' && showJournalTypes && (
                <div className="quick-actions-fab__submenu">
                  <div className="quick-actions-fab__submenu-title">Quick journals</div>
                  <div className="quick-actions-fab__submenu-items">
                    {QUICK_JOURNAL_SHORTCUTS.map((jt) => (
                      <button
                        key={jt.type}
                        type="button"
                        className="quick-actions-fab__submenu-item"
                        onClick={() => handleJournalTypeSelect(jt.type)}
                      >
                        <span aria-hidden="true">{jt.icon}</span>
                        {jt.label}
                      </button>
                    ))}
                  </div>

                  {EXTENDED_JOURNAL_TYPES.length > 0 && (
                    <>
                      <div className="quick-actions-fab__submenu-title">More modes</div>
                      <div className="quick-actions-fab__submenu-items">
                        {EXTENDED_JOURNAL_TYPES.map((jt) => (
                          <button
                            key={jt.type}
                            type="button"
                            className="quick-actions-fab__submenu-item"
                            onClick={() => handleJournalTypeSelect(jt.type)}
                          >
                            <span aria-hidden="true">{jt.icon}</span>
                            {jt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {onJournalNow && (
                    <button
                      type="button"
                      className="quick-actions-fab__submenu-item quick-actions-fab__submenu-item--full"
                      onClick={openFullJournal}
                    >
                      <span aria-hidden="true">📔</span>
                      Open full journal
                    </button>
                  )}
                </div>
              )}

              {/* Habits sub-menu */}
              {action.id === 'check-habit' && showHabitsSubmenu && (
                <div className="quick-actions-fab__submenu quick-actions-fab__submenu--habits">
                  <div className="quick-actions-fab__submenu-title">
                    {loadingHabits ? 'Loading habits...' : "Today's habits:"}
                  </div>
                  {onCheckHabit && !loadingHabits && (
                    <button
                      type="button"
                      className="quick-actions-fab__submenu-item quick-actions-fab__submenu-item--full"
                      onClick={openFullHabits}
                    >
                      <span aria-hidden="true">📋</span>
                      Open full checklist
                    </button>
                  )}
                  {loadingHabits ? (
                    <div className="quick-actions-fab__submenu-loading">
                      <span>⏳</span>
                    </div>
                  ) : habits.length === 0 ? (
                    <div className="quick-actions-fab__submenu-empty">
                      <p>No habits scheduled for today.</p>
                      <p>Add habits to your goals to track them here.</p>
                    </div>
                  ) : (
                    <div className="quick-actions-fab__submenu-habits">
                      {habits.map((habit) => {
                        const isCompleted = habitCompletions[habit.id]?.completed ?? false;
                        const isSaving = savingHabitId === habit.id;
                        
                        return (
                          <button
                            key={habit.id}
                            type="button"
                            className={`quick-actions-fab__habit-item ${isCompleted ? 'quick-actions-fab__habit-item--completed' : ''}`}
                            onClick={() => !isSaving && toggleHabitCompletion(habit.id)}
                            disabled={isSaving}
                            aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${habit.name}`}
                          >
                            <span className="quick-actions-fab__habit-checkbox" aria-hidden="true">
                              {isSaving ? '⏳' : isCompleted ? '✅' : '☐'}
                            </span>
                            <span className="quick-actions-fab__habit-name">{habit.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          type="button"
          className={`quick-actions-fab__main ${isOpen ? 'quick-actions-fab__main--open' : ''}`}
          onClick={handleToggle}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={isOpen}
        >
          <span className="quick-actions-fab__main-icon" aria-hidden="true">
            ✨
          </span>
        </button>
      </div>

      {/* Life Coach AI Modal */}
      {showLifeCoach && (
        <AiCoach
          session={session}
          onClose={closeLifeCoach}
          starterQuestion="What's one thing you want help with today?"
        />
      )}

      {showGamificationCard && (
        <div
          className="gamification-scorecard-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Game of Life scorecard"
          onClick={closeGamificationCard}
        >
          <div
            className="gamification-scorecard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gamification-scorecard__header">
              <div className="gamification-scorecard__title">
                <span className="gamification-scorecard__badge" aria-hidden="true">🎮</span>
                <div>
                  <p className="gamification-scorecard__eyebrow">Game of Life</p>
                  <h3 className="gamification-scorecard__headline">Scorecard & progress</h3>
                </div>
              </div>
              <button
                type="button"
                className="gamification-scorecard__close"
                onClick={closeGamificationCard}
                aria-label="Close Game of Life scorecard"
              >
                ✕
              </button>
            </div>

            <div className="gamification-scorecard__body">
              {gamificationLoading && (
                <div className="gamification-scorecard__loading">Fetching your XP story...</div>
              )}

              {!gamificationLoading && !gamificationEnabled && (
                <div className="gamification-scorecard__empty">
                  <p>Game of Life is currently turned off.</p>
                  <p className="gamification-scorecard__muted">
                    Enable it from Settings to unlock XP, streaks, and rewards.
                  </p>
                </div>
              )}

              {!gamificationLoading && gamificationEnabled && gamificationProfile && levelInfo && (
                <>
                  <GamificationHeader profile={gamificationProfile} levelInfo={levelInfo} />

                  <div className="gamification-scorecard__grid">
                    <div className="gamification-scorecard__tile">
                      <p className="gamification-scorecard__label">XP to next level</p>
                      <p className="gamification-scorecard__value">
                        {Math.max(levelInfo.xpForNextLevel - gamificationProfile.total_xp, 0)} XP
                      </p>
                      <p className="gamification-scorecard__hint">Keep checking off habits to climb faster.</p>
                    </div>

                    <div className="gamification-scorecard__tile">
                      <p className="gamification-scorecard__label">Current streak</p>
                      <p className="gamification-scorecard__value">🔥 {gamificationProfile.current_streak} days</p>
                      <p className="gamification-scorecard__hint">Longest streak: {gamificationProfile.longest_streak} days</p>
                    </div>

                    <div className="gamification-scorecard__tile">
                      <p className="gamification-scorecard__label">Lives & freezes</p>
                      <p className="gamification-scorecard__value">
                        ❤️ {gamificationProfile.lives}/{gamificationProfile.max_lives} · ❄️ {gamificationProfile.streak_freezes}
                      </p>
                      <p className="gamification-scorecard__hint">Use freezes to protect your streak on busy days.</p>
                    </div>

                    <div className="gamification-scorecard__tile gamification-scorecard__tile--points">
                      <div className="gamification-scorecard__tile-header">
                        <p className="gamification-scorecard__label">Points bank</p>
                        <span className="gamification-scorecard__pill">Bonus ready</span>
                      </div>
                      <p className="gamification-scorecard__value gamification-scorecard__value--glow">
                        💎 {gamificationProfile.total_points}
                      </p>
                      <p className="gamification-scorecard__hint">Spend points on boosters in the store.</p>
                    </div>
                  </div>

                  <div className="gamification-scorecard__next-steps">
                    <h4>Quick wins to boost XP</h4>
                    <ul>
                      <li>✔️ Check off another habit today</li>
                      <li>📔 Add a journal entry to keep momentum</li>
                      <li>🏆 Visit Achievements to review unlocks</li>
                    </ul>
                  </div>
                </>
              )}

              {!gamificationLoading && gamificationEnabled && (!gamificationProfile || !levelInfo) && (
                <div className="gamification-scorecard__empty">
                  <p>No scorecard data yet.</p>
                  <p className="gamification-scorecard__muted">
                    Start completing habits and journals to build your Game of Life profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
