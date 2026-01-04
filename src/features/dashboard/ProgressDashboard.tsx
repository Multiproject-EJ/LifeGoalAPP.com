import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { FormEvent, TouchEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchGoals } from '../../services/goals';
import { fetchCheckinsForUser } from '../../services/checkins';
import {
  listHabitsV2,
  listHabitLogsForRangeMultiV2,
  quickAddDailyHabit,
  type HabitV2Row,
  type HabitLogV2Row,
} from '../../services/habitsV2';
import type { Database } from '../../lib/database.types';
import {
  GOAL_STATUS_META,
  GOAL_STATUS_ORDER,
  type GoalStatusTag,
  normalizeGoalStatus,
} from '../goals/goalStatus';
import { LIFE_WHEEL_CATEGORIES, LifeWheelCheckins, LifeWheelInsightsPanel } from '../checkins/LifeWheelCheckins';
import { DeveloperIdeasPage } from '../ideas/DeveloperIdeasPage';
import { isDemoSession } from '../../services/demoSession';
import { DailySpinWheel } from '../spin-wheel/DailySpinWheel';
import { FocusWidget } from './components/FocusWidget';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import {
  BALANCE_STATUS_META,
  createBalanceSnapshot,
  getBalanceWeekId,
  hasBalanceBonus,
} from '../../services/balanceScore';
import {
  completeMicroQuest,
  countCompletedMicroQuests,
  ensureMicroQuestState,
  getMicroQuestDateLabel,
  type MicroQuestState,
} from '../../services/microQuests';
import {
  createRationalityEntry,
  getUniqueRationalityDates,
  listRationalityEntries,
  RATIONALITY_PROMPT,
} from '../../services/rationality';
import type { JournalEntry } from '../../services/journal';
import { recordBalanceShiftEvent, recordTelemetryEvent } from '../../services/telemetry';

type GoalRow = Database['public']['Tables']['goals']['Row'];
// Use V2 habit types
type HabitRow = HabitV2Row;
type HabitLogRow = HabitLogV2Row;
// Adapt V2 habit to include goal data for compatibility
type HabitWithGoal = HabitV2Row & {
  goal: {
    id: string;
    title: string;
    target_date: string | null;
} | null;
};

import type { WorkspaceStats } from '../../services/workspaceStats';
type CheckinRow = Database['public']['Tables']['checkins']['Row'];

type ProgressDashboardProps = {
  session: Session;
  stats?: WorkspaceStats | null;
};

type CalendarDay = {
  date: string;
  label: string;
  completions: number;
  isToday: boolean;
};

type WeeklySnapshot = {
  date: string;
  label: string;
  completions: number;
};

type StatusMessage = { kind: 'success' | 'error'; message: string } | null;

type GoalStatusExample = {
  title: string;
  note: string | null;
};

type GoalStatusSummary = {
  counts: Record<GoalStatusTag, number>;
  total: number;
  activeTotal: number;
  flagged: number;
  examples: Partial<Record<GoalStatusTag, GoalStatusExample>>;
};

const FOCUS_TONE_META = {
  stabilize: {
    label: 'Stabilize',
  },
  boost: {
    label: 'Boost',
  },
  celebrate: {
    label: 'Celebrate',
  },
} as const;

type FocusTone = keyof typeof FOCUS_TONE_META;

type FocusAction = {
  id: string;
  tone: FocusTone;
  status: GoalStatusTag;
  title: string;
  summary: string;
  note?: string;
};

type WeeklyFocusDigest = {
  intro: string;
  headline: string;
  actions: FocusAction[];
  emptyMessage: string;
};

type UrgentTaskNote = {
  id: string;
  title: string;
  detail: string;
  dueLabel: string;
  accent: 'sunrise' | 'ocean';
};

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthBoundaries(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return {
    start,
    end,
  };
}

function buildCalendarDays(reference: Date, completions: Record<string, number>): CalendarDay[] {
  const { start, end } = getMonthBoundaries(reference);
  const totalDays = end.getDate();
  const todayISO = formatISODate(reference);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(reference.getFullYear(), reference.getMonth(), index + 1);
    const isoDate = formatISODate(day);
    return {
      date: isoDate,
      label: day.getDate().toString(),
      completions: completions[isoDate] ?? 0,
      isToday: isoDate === todayISO,
    } satisfies CalendarDay;
  });
}

function buildWeeklySnapshot(reference: Date, completions: Record<string, number>): WeeklySnapshot[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(reference);
    day.setDate(reference.getDate() - (6 - index));
    const isoDate = formatISODate(day);
    return {
      date: isoDate,
      label: formatter.format(day),
      completions: completions[isoDate] ?? 0,
    } satisfies WeeklySnapshot;
  });
}

export function ProgressDashboard({ session, stats }: ProgressDashboardProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const { earnXP, enabled: gamificationEnabled, recordActivity } = useGamification(session);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitWithGoal[]>([]);
  const [logs, setLogs] = useState<HabitLogRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [rationalityEntries, setRationalityEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedDomainKey, setSelectedDomainKey] = useState<string>(
    LIFE_WHEEL_CATEGORIES[0]?.key ?? '',
  );
  const [habitFormMessage, setHabitFormMessage] = useState<string | null>(null);
  const [habitFormError, setHabitFormError] = useState<string | null>(null);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [showIdeasPage, setShowIdeasPage] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [rationalityNote, setRationalityNote] = useState('');
  const [rationalityStatus, setRationalityStatus] = useState<StatusMessage>(null);
  const [rationalityLoading, setRationalityLoading] = useState(false);
  const [rationalitySaving, setRationalitySaving] = useState(false);
  const [microQuestState, setMicroQuestState] = useState<MicroQuestState | null>(null);
  const [microQuestStatus, setMicroQuestStatus] = useState<StatusMessage>(null);
  const [microQuestLoading, setMicroQuestLoading] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => formatISODate(today), [today]);
  const yesterdayISO = useMemo(() => formatISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)), [today]);
  const { start: monthStart, end: monthEnd } = useMemo(() => getMonthBoundaries(today), [today]);
  const nameFieldId = useId();
  const domainFieldId = useId();
  const goalFieldId = useId();
  const rationalityFieldId = useId();
  const rationalityPromptId = useId();
  const rationalityHintId = useId();
  const canCreateHabits = isConfigured || isDemoExperience;
  const hasGoals = goals.length > 0;

  const refreshDashboard = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      setGoals([]);
      setHabits([]);
      setLogs([]);
      setCheckins([]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [
        { data: goalData, error: goalError },
        { data: habitData, error: habitError },
        { data: checkinData, error: checkinError },
      ] = await Promise.all([fetchGoals(), listHabitsV2(), fetchCheckinsForUser(session.user.id, 4)]);

      if (goalError) throw goalError;
      if (habitError) throw habitError;
      if (checkinError) throw checkinError;

      const ownedGoals = (goalData ?? []).filter((goal) => goal.user_id === session.user.id);
      setGoals(ownedGoals);
      setCheckins(checkinData ?? []);

      // Map V2 habits to include goal data
      const habitsV2 = habitData ?? [];
      const goalsMap = new Map(ownedGoals.map(g => [g.id, { id: g.id, title: g.title, target_date: g.target_date }]));
      const nextHabits: HabitWithGoal[] = habitsV2.map(h => ({
        ...h,
        goal: h.goal_id ? (goalsMap.get(h.goal_id) ?? null) : null,
      }));
      setHabits(nextHabits);

      if (nextHabits.length === 0) {
        setLogs([]);
        return;
      }

      const habitIds = nextHabits.map((habit) => habit.id);
      const { data: logData, error: logError } = await listHabitLogsForRangeMultiV2({
        userId: session.user.id,
        habitIds,
        startDate: formatISODate(monthStart),
        endDate: formatISODate(monthEnd),
      });
      if (logError) throw logError;
      setLogs(logData ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load dashboard insights. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [session, isConfigured, isDemoExperience, monthStart, monthEnd]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshDashboard();
  }, [session?.user?.id, isConfigured, isDemoExperience, refreshDashboard]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setGoals([]);
      setHabits([]);
      setLogs([]);
    }
  }, [isConfigured, isDemoExperience]);

  useEffect(() => {
    if (selectedGoalId || goals.length === 0) {
      return;
    }
    setSelectedGoalId(goals[0]?.id ?? '');
  }, [goals, selectedGoalId]);

  useEffect(() => {
    if (!rationalityStatus) return;
    const timer = window.setTimeout(() => setRationalityStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [rationalityStatus]);

  useEffect(() => {
    if (!microQuestStatus) return;
    const timer = window.setTimeout(() => setMicroQuestStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [microQuestStatus]);

  const loadRationalityEntries = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      setRationalityEntries([]);
      return;
    }

    setRationalityLoading(true);
    try {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const { data, error } = await listRationalityEntries({
        fromDate: formatISODate(start),
        toDate: todayISO,
        limit: 14,
      });
      if (error) {
        throw new Error(error.message);
      }
      setRationalityEntries(data ?? []);
    } catch (error) {
      setRationalityStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to load today’s rationality prompt.',
      });
    } finally {
      setRationalityLoading(false);
    }
  }, [session, isConfigured, isDemoExperience, today, todayISO]);

  useEffect(() => {
    void loadRationalityEntries();
  }, [loadRationalityEntries]);

  const handleHabitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHabitFormMessage(null);
    setHabitFormError(null);

    if (!canCreateHabits) {
      setHabitFormError('Connect Supabase to create new habits from the dashboard.');
      return;
    }

    const trimmedName = newHabitName.trim();
    if (!trimmedName) {
      setHabitFormError('Name your habit to save it.');
      return;
    }

    setCreatingHabit(true);

    try {
      // Use quickAddDailyHabit to create the habit in habits_v2
      // This ensures the habit appears in the unified checklist
      const { data: newHabit, error } = await quickAddDailyHabit(
        {
          title: trimmedName,
          domainKey: selectedDomainKey || null,
          goalId: selectedGoalId || null,
          emoji: null,
        },
        session.user.id
      );

      if (error) throw error;

      if (!newHabit) {
        throw new Error('Failed to create habit - no data returned');
      }

      setHabitFormMessage('Habit added to your daily checklist.');
      setNewHabitName('');
      setSelectedGoalId('');
      setSelectedDomainKey(LIFE_WHEEL_CATEGORIES[0]?.key ?? '');
      await refreshDashboard();
    } catch (error) {
      setHabitFormError(
        error instanceof Error ? error.message : 'Unable to save the habit. Please try again shortly.',
      );
    } finally {
      setCreatingHabit(false);
    }
  };

  const completionMap = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      // V2 uses 'done' field instead of 'completed'
      if (!log.done) {
        return acc;
      }
      acc[log.date] = (acc[log.date] ?? 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  const calendarDays = useMemo(() => buildCalendarDays(today, completionMap), [today, completionMap]);
  const weeklySnapshot = useMemo(
    () => buildWeeklySnapshot(today, completionMap),
    [today, completionMap],
  );

  const totalHabits = habits.length;
  const weeklyTotals = useMemo(() => {
    const completed = weeklySnapshot.reduce((sum, day) => sum + day.completions, 0);
    const possible = totalHabits * weeklySnapshot.length;
    const completionRate = possible > 0 ? Math.min(100, Math.round((completed / possible) * 100)) : 0;
    return { completed, possible, completionRate };
  }, [weeklySnapshot, totalHabits]);

  const upcomingGoals = useMemo(() => {
    const todayISO = formatISODate(today);
    return goals
      .filter((goal) => goal.target_date && goal.target_date >= todayISO)
      .sort((a, b) => (a.target_date ?? '').localeCompare(b.target_date ?? ''))
      .slice(0, 4);
  }, [goals, today]);

  const goalStatusSummary = useMemo<GoalStatusSummary>(() => {
    const counts: Record<GoalStatusTag, number> = {
      on_track: 0,
      at_risk: 0,
      off_track: 0,
      achieved: 0,
    };
    const examples: GoalStatusSummary['examples'] = {};

    for (const goal of goals) {
      const status = normalizeGoalStatus(goal.status_tag);
      counts[status] += 1;

      const title = goal.title?.trim() || 'Untitled goal';
      const trimmedNote = goal.progress_notes?.trim() ?? '';
      const note = trimmedNote ? trimmedNote : null;
      const existing = examples[status];

      if (!existing || (note && !existing.note)) {
        examples[status] = { title, note };
      }
    }

    const total = GOAL_STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
    const activeTotal = total - counts.achieved;
    const flagged = counts.at_risk + counts.off_track;

    return { counts, total, activeTotal, flagged, examples };
  }, [goals]);

  const goalStatusMessage = useMemo(() => {
    const { total, flagged, counts } = goalStatusSummary;

    if (total === 0) {
      return 'Add your first goal to start tracking progress health.';
    }

    if (flagged > 0) {
      if (counts.off_track > 0) {
        const count = counts.off_track;
        return `${count} goal${count === 1 ? ' is' : 's are'} off track. Use the latest notes to plan a reset.`;
      }

      const count = counts.at_risk;
      return `${count} goal${count === 1 ? ' needs' : 's need'} a boost this week to stay on track.`;
    }

    if (counts.achieved > 0 && counts.achieved === total) {
      return 'All of your goals here are achieved—time to dream up the next milestone!';
    }

    if (counts.achieved > 0) {
      const count = counts.achieved;
      return `Celebrate ${count} recent ${count === 1 ? 'win' : 'wins'} while keeping the rest in motion.`;
    }

    return 'Everything is trending smoothly—keep showing up for your rituals.';
  }, [goalStatusSummary]);

  const focusDigest = useMemo(
    () => createWeeklyFocusDigest(goals, today),
    [goals, today],
  );

  const urgentTasks = useMemo<UrgentTaskNote[]>(
    () => [
      {
        id: 'client-sync',
        title: 'Client strategy sync',
        detail: 'Finalize the talking points and share the deck before the call.',
        dueLabel: 'Today · 2:30 PM',
        accent: 'sunrise',
      },
      {
        id: 'habit-journal',
        title: 'Evening reflection',
        detail: 'Log your top three wins and note one improvement for tomorrow.',
        dueLabel: 'Tonight · 9:00 PM',
        accent: 'ocean',
      },
    ],
    [],
  );

  const balanceSnapshot = useMemo(() => createBalanceSnapshot(checkins), [checkins]);
  const balanceWeekId = useMemo(() => {
    if (!balanceSnapshot) return null;
    return getBalanceWeekId(new Date(balanceSnapshot.referenceDate));
  }, [balanceSnapshot]);

  useEffect(() => {
    if (!session?.user?.id || !gamificationEnabled) {
      setMicroQuestState(null);
      return;
    }
    if (!isConfigured && !isDemoExperience) {
      setMicroQuestState(null);
      return;
    }
    const nextState = ensureMicroQuestState(session.user.id, balanceSnapshot, habits, today);
    setMicroQuestState(nextState);
  }, [
    session?.user?.id,
    gamificationEnabled,
    isConfigured,
    isDemoExperience,
    balanceSnapshot,
    habits,
    today,
  ]);

  useEffect(() => {
    if (!balanceSnapshot || !balanceWeekId || !gamificationEnabled) {
      return;
    }

    if (balanceSnapshot.harmonyStatus !== 'harmonized') {
      return;
    }

    const isCurrentWeek = balanceWeekId === getBalanceWeekId(new Date());
    if (!isCurrentWeek) {
      return;
    }

    const awardBonus = async () => {
      const alreadyAwarded = await hasBalanceBonus(session.user.id, balanceWeekId);
      if (alreadyAwarded) return;
      await earnXP(
        XP_REWARDS.BALANCE_WEEK,
        'balance_week',
        balanceWeekId,
        'Game of Life harmony bonus for a balanced week.',
      );
    };

    void awardBonus();
  }, [balanceSnapshot, balanceWeekId, gamificationEnabled, earnXP, session.user.id]);

  useEffect(() => {
    if (!session?.user?.id || !balanceSnapshot) {
      return;
    }

    void recordBalanceShiftEvent({
      userId: session.user.id,
      harmonyStatus: balanceSnapshot.harmonyStatus,
      referenceDate: balanceSnapshot.referenceDate,
      metadata: {
        harmonyScore: balanceSnapshot.harmonyScore,
        trendDirection: balanceSnapshot.trendDirection,
        averageScore: balanceSnapshot.averageScore,
        spread: balanceSnapshot.spread,
      },
    });
  }, [
    session?.user?.id,
    balanceSnapshot?.harmonyStatus,
    balanceSnapshot?.referenceDate,
    balanceSnapshot?.harmonyScore,
    balanceSnapshot?.trendDirection,
    balanceSnapshot?.averageScore,
    balanceSnapshot?.spread,
  ]);

  const rationalityRangeStart = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return formatISODate(start);
  }, [today]);
  const rationalityDates = useMemo(
    () => getUniqueRationalityDates(rationalityEntries),
    [rationalityEntries],
  );
  const rationalityCompletedToday = rationalityDates.includes(todayISO);
  const rationalityCompletedYesterday = rationalityDates.includes(yesterdayISO);
  const rationalityWeekCount = useMemo(
    () =>
      rationalityDates.filter((date) => date >= rationalityRangeStart && date <= todayISO).length,
    [rationalityDates, rationalityRangeStart, todayISO],
  );
  const latestRationalityEntry = useMemo(() => {
    if (rationalityEntries.length === 0) return null;
    return [...rationalityEntries].sort((a, b) => {
      const dateCompare = b.entry_date.localeCompare(a.entry_date);
      if (dateCompare !== 0) return dateCompare;
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    })[0];
  }, [rationalityEntries]);

  const microQuestCompletedCount = useMemo(
    () => countCompletedMicroQuests(microQuestState),
    [microQuestState],
  );
  const microQuestTotalCount = microQuestState?.quests.length ?? 0;
  const microQuestDateLabel = useMemo(
    () => getMicroQuestDateLabel(microQuestState, today),
    [microQuestState, today],
  );
  const microQuestBonusAvailable = microQuestCompletedCount >= 2;
  const microQuestBonusEarned = microQuestState?.bonusAwarded ?? false;

  const handleRationalitySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!session || (!isConfigured && !isDemoExperience)) {
        setRationalityStatus({
          kind: 'error',
          message: 'Connect Supabase or use demo mode to save today’s rationality check.',
        });
        return;
      }

      if (rationalityCompletedToday) {
        setRationalityStatus({
          kind: 'error',
          message: 'You already completed today’s rationality check.',
        });
        return;
      }

      const trimmed = rationalityNote.trim();
      if (!trimmed) {
        setRationalityStatus({
          kind: 'error',
          message: 'Add a quick note before saving.',
        });
        return;
      }

      setRationalitySaving(true);
      try {
        const { data, error } = await createRationalityEntry({
          userId: session.user.id,
          content: trimmed,
          entryDate: todayISO,
        });
        if (error || !data) {
          throw new Error(error?.message ?? 'Unable to save the rationality check.');
        }

        setRationalityEntries((current) => [data, ...current]);
        setRationalityNote('');

        if (gamificationEnabled) {
          await earnXP(
            XP_REWARDS.RATIONALITY_CHECKIN,
            'rationality_checkin',
            data.id,
            'Game of Life rationality check completion.',
          );
          if (rationalityCompletedYesterday) {
            await earnXP(
              XP_REWARDS.RATIONALITY_STREAK,
              'rationality_streak',
              data.id,
              'Game of Life rationality consistency bonus.',
            );
          }
          await recordActivity();
        }

        setRationalityStatus({
          kind: 'success',
          message: rationalityCompletedYesterday
            ? 'Saved! Game of Life XP earned with a consistency bonus.'
            : 'Saved! Game of Life XP earned for today.',
        });
      } catch (error) {
        setRationalityStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Unable to save the rationality check.',
        });
      } finally {
        setRationalitySaving(false);
      }
    },
    [
      session,
      isConfigured,
      isDemoExperience,
      rationalityCompletedToday,
      rationalityNote,
      todayISO,
      gamificationEnabled,
      earnXP,
      rationalityCompletedYesterday,
      recordActivity,
    ],
  );

  const handleMicroQuestComplete = useCallback(
    async (questId: string) => {
      if (!session?.user?.id) return;
      if (!microQuestState) return;

      setMicroQuestLoading(true);
      try {
        const { state, quest, bonusAwarded, didComplete } = completeMicroQuest(session.user.id, questId);
        if (!state || !quest) {
          throw new Error('Unable to update the micro-quest.');
        }

        setMicroQuestState(state);

        if (!didComplete) {
          setMicroQuestStatus({
            kind: 'error',
            message: 'That micro-quest is already completed.',
          });
          return;
        }

        if (gamificationEnabled) {
          await earnXP(quest.xpReward, 'micro_quest', quest.id, quest.title);
          if (bonusAwarded) {
            await earnXP(
              XP_REWARDS.MICRO_QUEST_BONUS,
              'micro_quest_bonus',
              quest.id,
              'Game of Life daily path bonus.',
            );
          }
          await recordActivity();
        }

        setMicroQuestStatus({
          kind: 'success',
          message: bonusAwarded
            ? 'Micro-quest complete! Game of Life daily bonus unlocked.'
            : 'Micro-quest complete! Game of Life XP earned.',
        });

        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'micro_quest_completed',
          metadata: {
            questId: quest.id,
            questTitle: quest.title,
            xpReward: quest.xpReward,
            bonusAwarded,
          },
        });
      } catch (error) {
        setMicroQuestStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Unable to complete the micro-quest.',
        });
      } finally {
        setMicroQuestLoading(false);
      }
    },
    [session?.user?.id, microQuestState, gamificationEnabled, earnXP, recordActivity],
  );

  const fullDashboardPanel = (
    <div className="progress-dashboard__panel-content">
      <header className="progress-dashboard__header">
        <div>
          <h2>Progress dashboard</h2>
          <p>
            Visualize your month at a glance, track streaks, and keep upcoming goal milestones on your radar.
          </p>
        </div>
        <div className="progress-dashboard__actions">
          <button
            type="button"
            className="progress-dashboard__ideas"
            onClick={() => setShowIdeasPage(true)}
          >
            Developer ideas
          </button>
          <button
            type="button"
            className="progress-dashboard__refresh"
            onClick={() => void refreshDashboard()}
            disabled={loading || (!isConfigured && !isDemoExperience)}
          >
            {loading ? 'Refreshing…' : 'Refresh insights'}
          </button>
        </div>
      </header>

      {/* Workspace Snapshot Section */}
      <section className="workspace-snapshot fade-in stagger-1" aria-labelledby="workspace-snapshot-heading">
        <div className="workspace-snapshot__header">
          <h3 id="workspace-snapshot-heading">Workspace snapshot</h3>
          <p>Track your stored rituals & goals at a glance</p>
        </div>
        {stats ? (
          <div className="workspace-snapshot__stats">
            <div className="workspace-snapshot__stat">
              <span className="workspace-snapshot__stat-label">Goals saved</span>
              <span className="workspace-snapshot__stat-value">{stats.goalCount}</span>
            </div>
            <div className="workspace-snapshot__stat">
              <span className="workspace-snapshot__stat-label">Habits tracked</span>
              <span className="workspace-snapshot__stat-value">{stats.habitCount}</span>
            </div>
            <div className="workspace-snapshot__stat">
              <span className="workspace-snapshot__stat-label">Check-ins logged</span>
              <span className="workspace-snapshot__stat-value">{stats.checkinCount}</span>
            </div>
          </div>
        ) : (
          <p className="workspace-snapshot__hint">Sign in to Supabase to see your synced ritual stats.</p>
        )}
      </section>

      <section className="urgent-tasks" aria-label="Urgent tasks">
        <div className="urgent-tasks__header">
          <h3>Urgent tasks</h3>
          <p>Pin a couple of sticky notes to spotlight what needs your focus first.</p>
        </div>
        <div className="urgent-tasks__board">
          {urgentTasks.map((task) => (
            <article key={task.id} className={`sticky-note sticky-note--${task.accent}`}>
              <span className="sticky-note__pin" aria-hidden="true" />
              <h4>{task.title}</h4>
              <p>{task.detail}</p>
              <p className="sticky-note__due">
                <strong>Due</strong> {task.dueLabel}
              </p>
            </article>
          ))}
        </div>
      </section>

      {isDemoExperience ? (
        <p className="progress-dashboard__status progress-dashboard__status--info">
          Dashboard metrics are generated from demo data stored locally. Connect Supabase to analyze real habit completions
          and goal milestones.
        </p>
      ) : !isConfigured ? (
        <p className="progress-dashboard__status progress-dashboard__status--warning">
          Add your Supabase credentials to enable analytics, calendar history, and personalized goal summaries.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="progress-dashboard__status progress-dashboard__status--error">{errorMessage}</p>
      ) : null}

      <div className="progress-dashboard__grid">
          <article className="progress-card progress-card--habit-create fade-in stagger-2">
            <header>
              <h3>Capture a new daily habit</h3>
              <p>Align a fresh ritual with your life wheel so it appears on today&apos;s checklist.</p>
            </header>
            <form className="habit-create-form" onSubmit={handleHabitCreate}>
              <label className="habit-create-form__field" htmlFor={nameFieldId}>
                <span>Habit name</span>
                <input
                  id={nameFieldId}
                  type="text"
                  value={newHabitName}
                  onChange={(event) => setNewHabitName(event.target.value)}
                  placeholder="Evening wind-down ritual"
                  autoComplete="off"
                  disabled={!canCreateHabits}
                />
              </label>

              <div className="habit-create-form__row">
                <label className="habit-create-form__field" htmlFor={domainFieldId}>
                  <span>Life wheel focus</span>
                  <select
                    id={domainFieldId}
                    value={selectedDomainKey}
                    onChange={(event) => setSelectedDomainKey(event.target.value)}
                    disabled={!canCreateHabits}
                  >
                    {LIFE_WHEEL_CATEGORIES.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="habit-create-form__field" htmlFor={goalFieldId}>
                  <span>Attach to goal</span>
                  <select
                    id={goalFieldId}
                    value={selectedGoalId}
                    onChange={(event) => setSelectedGoalId(event.target.value)}
                    disabled={!canCreateHabits || !hasGoals}
                  >
                    <option value="" disabled>
                      {hasGoals ? 'Choose a goal' : 'No goals yet'}
                    </option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title ?? 'Untitled goal'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {habitFormMessage ? (
                <p className="habit-create-form__status habit-create-form__status--success">
                  {habitFormMessage}
                </p>
              ) : null}
              {habitFormError ? (
                <p className="habit-create-form__status habit-create-form__status--error">{habitFormError}</p>
              ) : null}

              <button
                type="submit"
                className="habit-create-form__submit"
                disabled={creatingHabit || !canCreateHabits}
              >
                {creatingHabit ? 'Saving…' : 'Add daily habit'}
              </button>
            </form>

            {!canCreateHabits ? (
              <p className="habit-create-form__hint">
                Connect Supabase or explore demo mode to create habits from the dashboard.
              </p>
            ) : null}
          </article>

          <article className="progress-card progress-card--digest fade-in stagger-3">
            <header>
              <h3>Weekly focus digest</h3>
              <p>{focusDigest.intro}</p>
              {focusDigest.headline ? (
                <p className="focus-digest__headline">{focusDigest.headline}</p>
              ) : null}
            </header>
            {focusDigest.actions.length === 0 ? (
              <p className="progress-card__empty">{focusDigest.emptyMessage}</p>
            ) : (
              <ul className="focus-digest__actions">
                {focusDigest.actions.map((action) => (
                  <li
                    key={action.id}
                    className={`focus-digest__action focus-digest__action--${action.tone}`}
                  >
                    <div className="focus-digest__meta">
                      <span className={`goal-status goal-status--${action.status}`}>
                        {GOAL_STATUS_META[action.status].label}
                      </span>
                      <span className={`focus-digest__tone focus-digest__tone--${action.tone}`}>
                        {FOCUS_TONE_META[action.tone].label}
                      </span>
                    </div>
                    <p className="focus-digest__action-title">{action.title}</p>
                    <p className="focus-digest__action-summary">{action.summary}</p>
                    {action.note ? (
                      <p className="focus-digest__action-note">{action.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="progress-card progress-card--summary fade-in stagger-4">
            <header>
              <h3>This week&apos;s momentum</h3>
              <p>
                {totalHabits > 0
                  ? `You checked off ${weeklyTotals.completed} of ${weeklyTotals.possible} planned habits this week.`
                  : 'Add habits to start measuring your streaks.'}
              </p>
            </header>
            <div className="progress-card__metric">
              <span className="progress-card__metric-value">{weeklyTotals.completionRate}%</span>
              <span className="progress-card__metric-label">Completion rate</span>
            </div>
            <ul className="progress-card__trend" aria-label="Daily habit completions for the past 7 days">
              {weeklySnapshot.map((day) => (
                <li key={day.date}>
                  <span className="progress-card__trend-label">{day.label}</span>
                  <span className="progress-card__trend-value">{day.completions}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="progress-card progress-card--statuses fade-in stagger-5">
            <header>
              <h3>Goal health snapshot</h3>
              <p>{goalStatusMessage}</p>
            </header>
            {goalStatusSummary.total === 0 ? (
              <p className="progress-card__empty">Add at least one goal to see the health breakdown.</p>
            ) : (
              <ul className="progress-status-list">
                {GOAL_STATUS_ORDER.map((status) => {
                  const count = goalStatusSummary.counts[status];
                  const percent =
                    goalStatusSummary.total > 0
                      ? Math.round((count / goalStatusSummary.total) * 100)
                      : 0;
                  const meta = GOAL_STATUS_META[status];
                  const example = goalStatusSummary.examples[status];
                  const noteSnippet = example?.note ? summarizeNote(example.note) : '';
                  const hasNote = Boolean(noteSnippet);

                  return (
                    <li key={status} className={`progress-status progress-status--${status}`}>
                      <div className="progress-status__label">
                        <span className={`goal-status goal-status--${status}`}>{meta.label}</span>
                        <span className="progress-status__count">
                          {count} {count === 1 ? 'goal' : 'goals'}
                          <span className="progress-status__percent">({percent}%)</span>
                        </span>
                      </div>
                      <div
                        className="progress-status__bar"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className={`progress-status__bar-fill progress-status__bar-fill--${status}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {hasNote ? (
                        <div className="progress-status__note">
                          <span className="progress-status__note-title">
                            {example?.title ?? meta.label}
                          </span>
                          <span className="progress-status__note-text">{noteSnippet}</span>
                        </div>
                      ) : (
                        <p className="progress-status__description">
                          {count === 0 ? meta.empty : meta.description}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="progress-card progress-card--calendar fade-in stagger-6">
            <header>
              <h3>{today.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <p>Each dot represents habits you completed on that day.</p>
            </header>
            <div className="progress-calendar" role="grid" aria-label="Habit completion calendar">
              {calendarDays.map((day) => (
                <div
                  key={day.date}
                  role="gridcell"
                  aria-label={`${day.date}: ${day.completions} habits completed`}
                  className={`progress-calendar__day ${day.isToday ? 'progress-calendar__day--today' : ''}`}
                >
                  <span className="progress-calendar__date">{day.label}</span>
                  <span
                    className={`progress-calendar__dot progress-calendar__dot--level-${getDensityLevel(
                      day.completions,
                    )}`}
                  />
                  <span className="progress-calendar__count">{day.completions}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="progress-card progress-card--goals fade-in stagger-7">
            <header>
              <h3>Upcoming goal milestones</h3>
              <p>Stay ahead of deadlines by keeping these target dates in focus.</p>
            </header>
            {upcomingGoals.length === 0 ? (
              <p className="progress-card__empty">No upcoming target dates. Set target dates when creating your goals.</p>
            ) : (
              <ul className="progress-card__goal-list">
                {upcomingGoals.map((goal) => (
                  <li key={goal.id}>
                    <span className="progress-card__goal-title">{goal.title}</span>
                    <span className="progress-card__goal-date">{formatReadableDate(goal.target_date!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* 202X Focus Widget */}
          <FocusWidget session={session} />

          {/* Daily Spin Wheel Widget */}
          <article className="progress-card progress-card--spin-wheel fade-in stagger-8">
            <DailySpinWheel session={session} />
          </article>
        </div>
      </div>
    );

  const panels = [
    {
      id: 'life-wheel',
      title: 'Life wheel',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--life-wheel">
          <div className="progress-dashboard__life-wheel-stack">
            <LifeWheelCheckins session={session} />
            <article className="progress-card progress-card--spin-wheel progress-dashboard__spin-wheel-card">
              <DailySpinWheel session={session} />
            </article>
          </div>
        </div>
      ),
    },
    {
      id: 'balance-harmony',
      title: 'Balance and harmony',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--balance">
          <header className="progress-dashboard__panel-header">
            <h2>Game of Life balance check</h2>
            <p>Track harmony across Agency, Awareness, Rationality, and Vitality.</p>
          </header>
          {balanceSnapshot ? (
            <>
              <section className="balance-panel__summary">
                <div className="balance-panel__score">
                  <span className="balance-panel__score-value">{balanceSnapshot.harmonyScore}</span>
                  <span className="balance-panel__score-label">Harmony score</span>
                  <span className="balance-panel__score-detail">
                    Avg {balanceSnapshot.averageScore} · Spread {balanceSnapshot.spread}
                  </span>
                </div>
                <div
                  className={`balance-panel__status balance-panel__status--${balanceSnapshot.harmonyStatus}`}
                >
                  <h3>{BALANCE_STATUS_META[balanceSnapshot.harmonyStatus].label}</h3>
                  <p>{BALANCE_STATUS_META[balanceSnapshot.harmonyStatus].description}</p>
                </div>
                <div className="balance-panel__trend">
                  <span className="balance-panel__trend-title">Trend vs last check-in</span>
                  <span className={`balance-panel__trend-value balance-panel__trend-value--${balanceSnapshot.trendDirection}`}>
                    {balanceSnapshot.trendDirection === 'new'
                      ? 'New baseline'
                      : `${balanceSnapshot.trendDirection === 'up' ? '▲' : balanceSnapshot.trendDirection === 'down' ? '▼' : '●'} ${balanceSnapshot.trendDelta}`}
                  </span>
                  <span className="balance-panel__trend-caption">
                    {balanceSnapshot.trendDirection === 'new'
                      ? 'Complete another check-in to unlock trend signals.'
                      : 'Based on your latest life wheel scores.'}
                  </span>
                </div>
              </section>
              <ul className="balance-panel__axes">
                {balanceSnapshot.axes.map((axis) => (
                  <li key={axis.key} className={`balance-panel__axis balance-panel__axis--${axis.band}`}>
                    <div className="balance-panel__axis-header">
                      <div>
                        <h4>{axis.title}</h4>
                        <p>{axis.description}</p>
                      </div>
                      <div className="balance-panel__axis-score">
                        <span>{axis.score}</span>
                        <small>/10</small>
                      </div>
                    </div>
                    <div
                      className="balance-panel__axis-bar"
                      role="progressbar"
                      aria-valuenow={axis.score}
                      aria-valuemin={0}
                      aria-valuemax={10}
                    >
                      <span style={{ width: `${axis.score * 10}%` }} />
                    </div>
                    {axis.delta !== null && axis.delta !== undefined ? (
                      <span className="balance-panel__axis-delta">
                        {axis.delta === 0
                          ? 'No change'
                          : `${axis.delta > 0 ? '+' : ''}${axis.delta} vs last check-in`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <section className="balance-panel__focus">
                <h3>Next focus</h3>
                <p>
                  Lean into <strong>{balanceSnapshot.nextFocus.title}</strong> next. Small, consistent steps here will
                  keep your Game of Life balance steady.
                </p>
              </section>
            </>
          ) : (
            <div className="progress-dashboard__empty">
              <h3>No balance snapshot yet</h3>
              <p>Complete a life wheel check-in to unlock your harmony score and axis trends.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'micro-quests',
      title: 'Micro-quests',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--micro-quests">
          <header className="progress-dashboard__panel-header">
            <h2>Game of Life micro-quests</h2>
            <p>
              Your daily path blends balance gaps and habits into tiny, non-compulsive wins. Skip freely—fresh quests
              arrive each morning.
            </p>
          </header>
          {!gamificationEnabled ? (
            <div className="progress-dashboard__empty">
              <h3>Enable Game of Life XP to unlock micro-quests</h3>
              <p>Turn on Game of Life in your account settings to earn XP for daily balance steps.</p>
            </div>
          ) : !isConfigured && !isDemoExperience ? (
            <div className="progress-dashboard__empty">
              <h3>Connect to unlock today&apos;s micro-quests</h3>
              <p>Enable Supabase or demo mode to load your Game of Life daily path.</p>
            </div>
          ) : !microQuestState ? (
            <div className="progress-dashboard__empty">
              <h3>Loading your daily path</h3>
              <p>We&apos;re preparing today&apos;s Game of Life micro-quests.</p>
            </div>
          ) : (
            <div className="micro-quests">
              <div className="micro-quests__summary">
                <div>
                  <p className="micro-quests__eyebrow">{microQuestDateLabel}</p>
                  <h3>Daily path</h3>
                  <p>
                    Complete any two micro-quests to unlock today&apos;s harmony bonus. No penalties if you pause or
                    skip.
                  </p>
                </div>
                <div className="micro-quests__progress">
                  <span>{microQuestCompletedCount}/{microQuestTotalCount} complete</span>
                  <div className="micro-quests__progress-bar" role="progressbar" aria-valuenow={microQuestCompletedCount} aria-valuemin={0} aria-valuemax={microQuestTotalCount}>
                    <span
                      style={{
                        width: `${microQuestTotalCount === 0 ? 0 : (microQuestCompletedCount / microQuestTotalCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {microQuestStatus ? (
                <p
                  className={`micro-quests__status micro-quests__status--${microQuestStatus.kind}`}
                  role="status"
                  aria-live="polite"
                >
                  {microQuestStatus.message}
                </p>
              ) : null}

              <ul className="micro-quests__list">
                {microQuestState.quests.map((quest) => (
                  <li
                    key={quest.id}
                    className={`micro-quests__card micro-quests__card--${quest.status}`}
                  >
                    <div className="micro-quests__card-header">
                      <h4>{quest.title}</h4>
                      <span className="micro-quests__reward">+{quest.xpReward} XP</span>
                    </div>
                    <p>{quest.description}</p>
                    <button
                      type="button"
                      className="micro-quests__button"
                      disabled={quest.status === 'completed' || microQuestLoading}
                      onClick={() => handleMicroQuestComplete(quest.id)}
                    >
                      {quest.status === 'completed'
                        ? 'Completed'
                        : microQuestLoading
                          ? 'Saving…'
                          : 'Mark complete'}
                    </button>
                  </li>
                ))}
              </ul>

              <div className={`micro-quests__bonus ${microQuestBonusEarned ? 'micro-quests__bonus--earned' : ''}`}>
                <div>
                  <h4>Daily harmony bonus</h4>
                  <p>
                    Complete any two micro-quests to earn +{XP_REWARDS.MICRO_QUEST_BONUS} Game of Life XP.
                  </p>
                </div>
                <div className="micro-quests__bonus-status">
                  {microQuestBonusEarned
                    ? 'Bonus earned'
                    : microQuestBonusAvailable
                      ? 'Bonus ready'
                      : 'Bonus locked'}
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'rationality-check',
      title: 'Rationality check',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--rationality">
          <header className="progress-dashboard__panel-header">
            <h2>Game of Life rationality check</h2>
            <p>Use a daily prompt to stay correctable and avoid overconfidence traps.</p>
          </header>
          {!isConfigured && !isDemoExperience ? (
            <div className="progress-dashboard__empty">
              <h3>Connect to start the rationality check</h3>
              <p>Enable Supabase or demo mode to capture your daily “what might I be wrong about?” reflection.</p>
            </div>
          ) : (
            <div className="rationality-check">
              <div className="rationality-check__prompt">
                <p className="rationality-check__question" id={rationalityPromptId}>
                  {RATIONALITY_PROMPT}
                </p>
                <p className="rationality-check__hint" id={rationalityHintId}>
                  Name one assumption, decision, or belief you want to revisit later.
                </p>
              </div>
              <form className="rationality-check__form" onSubmit={handleRationalitySubmit}>
                <label className="rationality-check__label" htmlFor={rationalityFieldId}>
                  Today&apos;s reflection
                </label>
                <textarea
                  id={rationalityFieldId}
                  aria-describedby={`${rationalityPromptId} ${rationalityHintId}`}
                  value={rationalityNote}
                  onChange={(event) => setRationalityNote(event.target.value)}
                  placeholder="Write one sentence that keeps you open to updating."
                  rows={4}
                  disabled={rationalityCompletedToday || rationalitySaving || rationalityLoading}
                />
                <div className="rationality-check__meta">
                  <span>Consistency: {rationalityWeekCount}/7 days</span>
                  <span>
                    Game of Life XP: {XP_REWARDS.RATIONALITY_CHECKIN}
                    {rationalityCompletedYesterday ? ` + ${XP_REWARDS.RATIONALITY_STREAK} streak` : ' + streak bonus'}
                  </span>
                </div>
                {rationalityStatus ? (
                  <p
                    className={`rationality-check__status rationality-check__status--${rationalityStatus.kind}`}
                    role="status"
                    aria-live="polite"
                  >
                    {rationalityStatus.message}
                  </p>
                ) : null}
                <div className="rationality-check__actions">
                  <button
                    type="submit"
                    className="rationality-check__button"
                    disabled={
                      rationalityCompletedToday || rationalitySaving || rationalityLoading || !rationalityNote.trim()
                    }
                  >
                    {rationalityCompletedToday
                      ? 'Completed today'
                      : rationalitySaving
                        ? 'Saving…'
                        : 'Save reflection'}
                  </button>
                </div>
              </form>
              <div className="rationality-check__recent">
                {rationalityLoading ? (
                  <p>Loading your recent rationality notes…</p>
                ) : latestRationalityEntry ? (
                  <>
                    <h3>Latest entry</h3>
                    <p className="rationality-check__recent-date">
                      {formatReadableDate(latestRationalityEntry.entry_date)}
                    </p>
                    <p className="rationality-check__recent-note">{latestRationalityEntry.content}</p>
                  </>
                ) : (
                  <>
                    <h3>No rationality entries yet</h3>
                    <p>Save your first reflection to build your Game of Life rationality streak.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'visionboard',
      title: 'Visionboard peak + Game of Life',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--vision-board">
          <header className="progress-dashboard__panel-header">
            <h2>Vision board peak + Game of Life</h2>
            <p>Curate themed boards that fuel daily momentum and highlight who inspires you.</p>
          </header>
          <div className="progress-dashboard__vision-board-grid">
            <article className="progress-dashboard__vision-board-card">
              <h3>Dream lifestyle</h3>
              <p>Collect visuals that represent the life you&apos;re building—home, travel, and daily rituals.</p>
            </article>
            <article className="progress-dashboard__vision-board-card">
              <h3>Goals + milestones</h3>
              <p>Pin achievements, awards, or milestones you want to celebrate so progress stays visible.</p>
            </article>
            <article className="progress-dashboard__vision-board-card">
              <h3>Inspiring people + traits</h3>
              <p>Highlight mentors, icons, or loved ones and the traits you admire in them.</p>
            </article>
          </div>
        </div>
      ),
    },
    {
      id: 'improvements',
      title: 'Improvements and Game of Life stats',
      content: (
        <div className="progress-dashboard__panel-content progress-dashboard__panel-content--title">
          <h2>Improvements and Game of Life stats</h2>
          <LifeWheelInsightsPanel session={session} />
        </div>
      ),
    },
    {
      id: 'full-dashboard',
      title: 'Progress dashboard',
      content: fullDashboardPanel,
    },
  ];

  const maxPanelIndex = panels.length - 1;

  const handlePrevPanel = useCallback(
    () => setActivePanel((current) => Math.max(0, current - 1)),
    [],
  );

  const handleNextPanel = useCallback(
    () => setActivePanel((current) => Math.min(maxPanelIndex, current + 1)),
    [maxPanelIndex],
  );

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = endX - touchStartX;
    const swipeThreshold = 40;

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0) {
        handleNextPanel();
      } else {
        handlePrevPanel();
      }
    }

    setTouchStartX(null);
  };

  return (
    <section className="progress-dashboard">
      {showIdeasPage ? <DeveloperIdeasPage onClose={() => setShowIdeasPage(false)} /> : null}

      <div
        className="progress-dashboard__carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="progress-dashboard__track"
          style={{ transform: `translateX(-${activePanel * 100}%)` }}
        >
          {panels.map((panel) => (
            <div
              key={panel.id}
              className="progress-dashboard__panel"
              role="group"
              aria-roledescription="slide"
              aria-label={panel.title}
            >
              {panel.content}
            </div>
          ))}
        </div>
      </div>

      <div className="progress-dashboard__controls" aria-label="Dashboard panel navigation">
        <button
          type="button"
          className="progress-dashboard__control-button"
          onClick={handlePrevPanel}
          disabled={activePanel === 0}
          aria-label="Show previous panel"
        >
          ←
        </button>

        <div className="progress-dashboard__dots" role="tablist" aria-label="Dashboard panels">
          {panels.map((panel, index) => (
            <button
              key={panel.id}
              type="button"
              className={`progress-dashboard__dot ${
                activePanel === index ? 'progress-dashboard__dot--active' : ''
              }`}
              onClick={() => setActivePanel(index)}
              aria-label={`Go to ${panel.title}`}
              aria-pressed={activePanel === index}
              role="tab"
            />
          ))}
        </div>

        <button
          type="button"
          className="progress-dashboard__control-button"
          onClick={handleNextPanel}
          disabled={activePanel === maxPanelIndex}
          aria-label="Show next panel"
        >
          →
        </button>
      </div>
    </section>
  );
}

function getDensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function summarizeNote(note: string, maxLength = 160): string {
  const condensed = note.replace(/\s+/g, ' ').trim();
  if (!condensed) {
    return '';
  }
  if (condensed.length <= maxLength) {
    return condensed;
  }
  return `${condensed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatReadableDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

type RelativeUnit = 'day' | 'week' | 'month';

type TargetContext = {
  relative: string;
  readable: string;
  isPast: boolean;
};

function getGoalTargetContext(goal: GoalRow, reference: Date): TargetContext | null {
  if (!goal.target_date) {
    return null;
  }

  const target = new Date(goal.target_date);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const today = startOfDay(reference).getTime();
  const targetTime = startOfDay(target).getTime();
  const diffMs = targetTime - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  let unit: RelativeUnit = 'day';
  let value = diffDays;

  if (absDays >= 60) {
    unit = 'month';
    value = Math.round(diffDays / 30);
  } else if (absDays >= 14) {
    unit = 'week';
    value = Math.round(diffDays / 7);
  }

  return {
    relative: formatter.format(value, unit),
    readable: formatReadableDate(goal.target_date),
    isPast: diffDays < 0,
  };
}

function resolveGoalTimestamp(goal: GoalRow): number {
  if (goal.target_date) {
    const target = new Date(goal.target_date).getTime();
    if (!Number.isNaN(target)) {
      return target;
    }
  }

  if (goal.created_at) {
    const created = new Date(goal.created_at).getTime();
    if (!Number.isNaN(created)) {
      return created;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function compareGoalsByUrgency(a: GoalRow, b: GoalRow): number {
  const aTime = resolveGoalTimestamp(a);
  const bTime = resolveGoalTimestamp(b);

  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) {
    return 0;
  }

  if (!Number.isFinite(aTime)) {
    return 1;
  }

  if (!Number.isFinite(bTime)) {
    return -1;
  }

  return aTime - bTime;
}

function pickMostRecentGoal(goals: GoalRow[]): GoalRow | null {
  if (goals.length === 0) {
    return null;
  }

  return goals
    .slice()
    .sort((a, b) => {
      const aTime = resolveGoalTimestamp(a);
      const bTime = resolveGoalTimestamp(b);

      if (Number.isFinite(bTime) && Number.isFinite(aTime)) {
        return bTime - aTime;
      }

      if (Number.isFinite(bTime)) {
        return -1;
      }

      if (Number.isFinite(aTime)) {
        return 1;
      }

      return 0;
    })[0];
}

function buildFocusAction(
  goal: GoalRow,
  status: GoalStatusTag,
  tone: FocusTone,
  reference: Date,
): FocusAction {
  const title = goal.title?.trim() || 'Untitled goal';
  const noteSnippet = summarizeNote(goal.progress_notes ?? '');
  const context = getGoalTargetContext(goal, reference);

  let summary: string;

  if (status === 'off_track') {
    if (context) {
      summary = context.isPast
        ? `Target date was ${context.relative} (${context.readable}). Plan a reset and log next steps.`
        : `Target date is ${context.relative} (${context.readable}). Rebuild the plan and confirm support.`;
    } else {
      summary = 'Define a new checkpoint and list the blockers so you can tackle them head-on.';
    }
  } else if (status === 'at_risk') {
    if (context) {
      summary = `Protect momentum before ${context.relative} (${context.readable}) by booking time for the next milestone.`;
    } else {
      summary = 'Schedule a working session and capture the next milestone to keep things moving.';
    }
  } else if (status === 'achieved') {
    if (context) {
      summary = `Celebrate the win and share highlights from ${context.readable}.`;
    } else {
      summary = 'Celebrate the win and document what made it successful for future projects.';
    }
  } else {
    if (context) {
      summary = `Lock in your next micro-win ${context.relative} (${context.readable}) so progress stays steady.`;
    } else {
      summary = 'Capture the very next action and set a target date to keep momentum focused.';
    }
  }

  return {
    id: goal.id,
    tone,
    status,
    title,
    summary,
    note: noteSnippet ? `Latest note: ${noteSnippet}` : undefined,
  };
}

function createWeeklyFocusDigest(goals: GoalRow[], reference: Date): WeeklyFocusDigest {
  if (goals.length === 0) {
    return {
      intro: 'Use this digest to plan your weekly sprint once goals are in place.',
      headline: '',
      actions: [],
      emptyMessage: 'Add your first goal to unlock personalized focus prompts.',
    } satisfies WeeklyFocusDigest;
  }

  const normalized = goals.map((goal) => ({
    goal,
    status: normalizeGoalStatus(goal.status_tag),
  }));

  const offTrack = normalized.filter((entry) => entry.status === 'off_track').map((entry) => entry.goal);
  const atRisk = normalized.filter((entry) => entry.status === 'at_risk').map((entry) => entry.goal);
  const onTrack = normalized.filter((entry) => entry.status === 'on_track').map((entry) => entry.goal);
  const achieved = normalized.filter((entry) => entry.status === 'achieved').map((entry) => entry.goal);

  const flaggedCount = offTrack.length + atRisk.length;
  const totalGoals = normalized.length;

  let intro: string;
  let headline: string;

  if (flaggedCount > 0) {
    intro = `You have ${flaggedCount} goal${flaggedCount === 1 ? '' : 's'} that need attention this week.`;
    headline =
      offTrack.length > 0
        ? 'Stabilize off-track goals first, then boost the ones losing momentum.'
        : 'Give at-risk goals a boost so they stay out of the danger zone.';
  } else if (onTrack.length > 0) {
    intro = `All ${totalGoals === 1 ? 'goal is' : 'goals are'} currently on track.`;
    headline = 'Lock in the next milestone while energy is high.';
  } else {
    intro = 'Wins are rolling in—capture what worked and plan the next adventure.';
    headline = 'Celebrate progress and choose the next big focus.';
  }

  const actions: FocusAction[] = [];

  const urgentOffTrack = offTrack
    .slice()
    .sort((a, b) => compareGoalsByUrgency(a, b));
  for (const goal of urgentOffTrack.slice(0, 2)) {
    actions.push(buildFocusAction(goal, 'off_track', 'stabilize', reference));
  }

  if (actions.length < 3) {
    const urgentAtRisk = atRisk
      .slice()
      .sort((a, b) => compareGoalsByUrgency(a, b));
    for (const goal of urgentAtRisk.slice(0, 3 - actions.length)) {
      actions.push(buildFocusAction(goal, 'at_risk', 'boost', reference));
    }
  }

  if (actions.length < 3 && onTrack.length > 0) {
    const focused = onTrack
      .slice()
      .sort((a, b) => compareGoalsByUrgency(a, b))[0];
    if (focused) {
      actions.push(buildFocusAction(focused, 'on_track', 'boost', reference));
    }
  }

  if (actions.length < 3 && achieved.length > 0) {
    const recentWin = pickMostRecentGoal(achieved);
    if (recentWin) {
      actions.push(buildFocusAction(recentWin, 'achieved', 'celebrate', reference));
    }
  }

  const emptyMessage = flaggedCount > 0
    ? 'Once these goals are stabilized we will suggest the next set of focus moves here.'
    : 'Capture new goals or progress notes to unlock personalized focus ideas.';

  return {
    intro,
    headline,
    actions,
    emptyMessage,
  } satisfies WeeklyFocusDigest;
}
