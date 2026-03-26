import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isDemoSession } from '../../services/demoSession';
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalQueueStatus,
  listJournalEntries,
  listJournalEntriesByMode,
  syncQueuedJournalEntries,
  type JournalQueueStatus,
  updateJournalEntry,
  type JournalEntry,
} from '../../services/journal';
import { fetchGoals } from '../../services/goals';
import { fetchHabitsForUser } from '../../compat/legacyHabitsAdapter';
import { listHabitsV2, type HabitV2Row } from '../../services/habitsV2';
import { JournalEntryList } from './JournalEntryList';
import { JournalEntryDetail } from './JournalEntryDetail';
import { JournalEntryEditor, type JournalEntryDraft, type JournalMoodOption } from './JournalEntryEditor';
import { JournalTypeSelector } from './JournalTypeSelector';
import type { Database, JournalEntryType, Json } from '../../lib/database.types';
import { DEFAULT_JOURNAL_TYPE } from './constants';
import { getModeLabel, isEntryLocked } from './utils';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { recordChallengeActivity } from '../../services/challenges';
import { GoalReflectionJournal } from '../goals/GoalReflectionJournal';
import { awardZenTokens } from '../../services/zenGarden';
import { getGratitudeCoachFeedback, type GratitudeCoachResult } from './gratitudeCoach';
import { buildGratitudeWeeklySummary, buildThankYouDraft, type GratitudeWeeklySummary } from './gratitudeInsights';
import { CelebrationAnimation } from '../../components/CelebrationAnimation';
import { triggerCompletionHaptic } from '../../utils/completionHaptics';
import { recordTelemetryEvent } from '../../services/telemetry';
import type { TimerLaunchContext } from '../timer/timerSession';
import { loadPersonalityTestHistoryWithSupabase } from '../../services/personalityTest';
import type { ArchetypeHand } from '../identity/archetypes/archetypeHandBuilder';
import { recommendGuidedTemplates, recommendTraitBandTemplates, type GuidedJournalTemplate } from './guidedTemplates';

/**
 * Journal mode type representing different journaling experiences.
 * This is an alias for JournalEntryType to provide better semantic meaning
 * in the context of journal UI state.
 */
export type JournalType = JournalEntryType;

const MOOD_OPTIONS: JournalMoodOption[] = [
  { value: 'happy', label: 'Happy', icon: '🙂' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'sad', label: 'Sad', icon: '🙁' },
  { value: 'stressed', label: 'Stressed', icon: '😰' },
  { value: 'excited', label: 'Excited', icon: '🤩' },
];

const SOUNDSCAPE_STORAGE_KEY = 'lifegoal.journal.soundscape';

type GoalRow = Database['public']['Tables']['goals']['Row'];
// Use V2 habits
type HabitRow = HabitV2Row;
type JournalEntryInsertPayload = Database['public']['Tables']['journal_entries']['Insert'];
type JournalEntryUpdatePayload = Database['public']['Tables']['journal_entries']['Update'];

type JournalLaunchRequest = {
  type: JournalType;
  openComposer?: boolean;
  requestId: number;
};

type JournalProps = {
  session: Session;
  onNavigateToGoals?: () => void;
  onNavigateToHabits?: () => void;
  onNavigateToTimer?: (context?: TimerLaunchContext) => void;
  onOpenAiCoach?: (starterQuestion?: string) => void;
  launchRequest?: JournalLaunchRequest | null;
};

type StatusState = { kind: 'success' | 'warning' | 'error'; message: string } | null;
const EMPTY_QUEUE_STATUS: JournalQueueStatus = { pending: 0, failed: 0 };
type JournalView = 'hub' | 'write' | 'read';
type JournalSoundscape = 'off' | 'rain' | 'lofi' | 'nature';

type WeeklyJournalRecap = {
  weekStart: string;
  totalEntries: number;
  daysPracticed: number;
  topModes: Array<{ mode: JournalEntryType; count: number }>;
  averageMood: number | null;
};

type CoachQuest = {
  id: string;
  label: string;
  progress: number;
  target: number;
};

type GratitudeAttachmentMeta = {
  coachScore: number;
  isAuthentic: boolean;
  warning: string | null;
  evaluatedAt: string;
  version: number;
};

function toRecord(value: Json | null | undefined): Record<string, Json> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, Json>) };
}

function buildGratitudeMeta(result: GratitudeCoachResult): GratitudeAttachmentMeta {
  return {
    coachScore: result.score,
    isAuthentic: result.isAuthentic,
    warning: result.warning ?? null,
    evaluatedAt: new Date().toISOString(),
    version: 1,
  };
}

function readGratitudeMeta(attachments: Json | null | undefined): GratitudeAttachmentMeta | null {
  const record = toRecord(attachments);
  const raw = record.gratitudeCoach;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const candidate = raw as Record<string, Json>;
  const coachScore = typeof candidate.coachScore === 'number' ? candidate.coachScore : null;
  const isAuthentic = typeof candidate.isAuthentic === 'boolean' ? candidate.isAuthentic : null;
  const warning = typeof candidate.warning === 'string' ? candidate.warning : candidate.warning === null ? null : null;
  const evaluatedAt = typeof candidate.evaluatedAt === 'string' ? candidate.evaluatedAt : null;
  const version = typeof candidate.version === 'number' ? candidate.version : 1;

  if (coachScore === null || isAuthentic === null || !evaluatedAt) return null;

  return {
    coachScore,
    isAuthentic,
    warning,
    evaluatedAt,
    version,
  };
}

function withGratitudeMeta(attachments: Json | null | undefined, result: GratitudeCoachResult): Json {
  const next = toRecord(attachments);
  next.gratitudeCoach = buildGratitudeMeta(result) as unknown as Json;
  return next as Json;
}

function isAuthenticGratitudeEntry(entry: JournalEntry): boolean {
  const attachmentMeta = readGratitudeMeta(entry.attachments);
  if (attachmentMeta) return attachmentMeta.isAuthentic;
  return getGratitudeCoachFeedback(entry.content).isAuthentic;
}

function getGratitudeWarning(entry: JournalEntry): string | null {
  const attachmentMeta = readGratitudeMeta(entry.attachments);
  if (attachmentMeta) return attachmentMeta.warning;
  return getGratitudeCoachFeedback(entry.content).warning ?? null;
}

function getWarningTheme(warning: string): string {
  const normalized = warning.toLowerCase();
  if (normalized.includes('pain') || normalized.includes('celebrate')) return 'avoid joy in others’ pain';
  if (normalized.includes('revenge')) return 'reframe revenge language';
  if (normalized.includes('compassion')) return 'increase compassion';
  if (normalized.includes('specific')) return 'be more specific';
  return 'tone needs reframing';
}

function formatMonthDay(value: string): string {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}-${day}`;
}

function getIsoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeekIso(date = new Date()): string {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = (day + 6) % 7; // Monday start
  clone.setDate(clone.getDate() - diff);
  clone.setHours(0, 0, 0, 0);
  return clone.toISOString().slice(0, 10);
}

function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    const dateCompare = b.entry_date.localeCompare(a.entry_date);
    if (dateCompare !== 0) return dateCompare;
    const aCreated = a.created_at ?? '';
    const bCreated = b.created_at ?? '';
    return bCreated.localeCompare(aCreated);
  });
}

export function Journal({ session, onNavigateToGoals, onNavigateToHabits, onNavigateToTimer, onOpenAiCoach, launchRequest }: JournalProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const journalDisabled = !isConfigured && !isDemoExperience;
  const isCompactLayout = useMediaQuery('(max-width: 960px)');
  const { earnXP, recordActivity, levelUpEvent, dismissLevelUpEvent } = useGamification(session);

  // Journal mode state for different journaling experiences
  const [journalType, setJournalType] = useState<JournalType>(DEFAULT_JOURNAL_TYPE);
  const isGoalReflectionMode = journalType === 'goal';

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [showMobileDetail, setShowMobileDetail] = useState(!isCompactLayout);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXP, setCelebrationXP] = useState(0);
  const [celebrationType, setCelebrationType] = useState<'journal' | 'action' | 'breathing' | 'levelup'>('journal');
  const [justSavedEntryId, setJustSavedEntryId] = useState<string | null>(null);
  const [entryFeedbackById, setEntryFeedbackById] = useState<Record<string, string>>({});
  const [gratitudeCoach, setGratitudeCoach] = useState<GratitudeCoachResult | null>(null);
  const [gratitudeWeeklySummary, setGratitudeWeeklySummary] = useState<GratitudeWeeklySummary | null>(null);
  const [thankYouDraft, setThankYouDraft] = useState<string | null>(null);
  const [thankYouCopied, setThankYouCopied] = useState(false);
  const [handledLaunchRequestId, setHandledLaunchRequestId] = useState<number | null>(null);
  const [queueStatus, setQueueStatus] = useState<JournalQueueStatus>(EMPTY_QUEUE_STATUS);
  const [journalView, setJournalView] = useState<JournalView>('hub');
  const [soundscape, setSoundscape] = useState<JournalSoundscape>('off');
  const [seedDraft, setSeedDraft] = useState<Partial<JournalEntryDraft> | null>(null);
  const [archetypeHand, setArchetypeHand] = useState<ArchetypeHand | null>(null);
  const [traitGuidance, setTraitGuidance] = useState<GuidedJournalTemplate[]>([]);

  // Watch for level-up events
  useEffect(() => {
    if (levelUpEvent) {
      setCelebrationType('levelup');
      setCelebrationXP(levelUpEvent.xp);
      setShowCelebration(true);
    }
  }, [levelUpEvent]);

  useEffect(() => {
    if (!isCompactLayout) {
      setShowMobileDetail(true);
    } else {
      setShowMobileDetail(false);
    }
  }, [isCompactLayout]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SOUNDSCAPE_STORAGE_KEY) as JournalSoundscape | null;
    if (stored === 'off' || stored === 'rain' || stored === 'lofi' || stored === 'nature') {
      setSoundscape(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, soundscape);
  }, [soundscape]);

  useEffect(() => {
    if (!launchRequest) return;
    if (launchRequest.requestId === handledLaunchRequestId) return;

    setJournalType(launchRequest.type);
    setJournalView('write');
    if (launchRequest.openComposer) {
      setEditorMode('create');
      setEditingEntry(null);
      setEditorError(null);
      setSeedDraft(null);
      setEditorOpen(true);
    }

    setHandledLaunchRequestId(launchRequest.requestId);
  }, [launchRequest, handledLaunchRequestId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalityGuidance() {
      try {
        const history = await loadPersonalityTestHistoryWithSupabase(session.user.id);
        if (cancelled || history.length === 0) return;

        const latest = history[0];
        const parsedHand = latest.archetype_hand as ArchetypeHand | undefined;
        setArchetypeHand(parsedHand ?? null);
        setTraitGuidance(recommendTraitBandTemplates(latest.traits, latest.axes, journalType));
      } catch {
        if (cancelled) return;
        setArchetypeHand(null);
        setTraitGuidance([]);
      }
    }

    void loadPersonalityGuidance();

    return () => {
      cancelled = true;
    };
  }, [session.user.id, journalType]);

  const guidedTemplates = useMemo(() => {
    const handTemplates = recommendGuidedTemplates(archetypeHand, journalType);
    return [...handTemplates, ...traitGuidance];
  }, [archetypeHand, journalType, traitGuidance]);

  const loadEntries = useCallback(async () => {
    if (!session || journalDisabled) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: serviceError } = await listJournalEntries({ limit: 250 });
      if (serviceError) {
        throw new Error(serviceError.message);
      }
      const sorted = sortEntries(data ?? []);
      setEntries(sorted);
      setSelectedEntryId((current) => {
        if (current && sorted.some((entry) => entry.id === current)) {
          return current;
        }
        return sorted[0]?.id ?? null;
      });
      if (sorted.length === 0 && isCompactLayout) {
        setShowMobileDetail(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your journal entries right now.');
    } finally {
      setLoading(false);
    }
  }, [session, journalDisabled, isCompactLayout]);

  const refreshQueueStatus = useCallback(async () => {
    if (journalDisabled) {
      setQueueStatus(EMPTY_QUEUE_STATUS);
      return;
    }
    const status = await getJournalQueueStatus();
    setQueueStatus(status);
  }, [journalDisabled]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const trySync = () => {
      syncQueuedJournalEntries()
        .then(async () => {
          await loadEntries();
          await refreshQueueStatus();
        })
        .catch(() => undefined);
    };

    trySync();
    window.addEventListener('online', trySync);
    return () => window.removeEventListener('online', trySync);
  }, [loadEntries, refreshQueueStatus]);

  useEffect(() => {
    void refreshQueueStatus();
    const interval = window.setInterval(() => {
      void refreshQueueStatus();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [refreshQueueStatus]);

  useEffect(() => {
    if (queueStatus.pending === 0 && queueStatus.failed === 0) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        'You have unsynced journal changes on this device. Leaving now may discard unsynced content.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [queueStatus.pending, queueStatus.failed]);

  useEffect(() => {
    if (!session || journalDisabled) {
      setGoals([]);
      return;
    }
    fetchGoals().then(({ data }) => {
      setGoals(data ?? []);
    });
  }, [session, journalDisabled]);

  useEffect(() => {
    if (!session || journalDisabled) {
      setHabits([]);
      return;
    }
    listHabitsV2().then(({ data }) => {
      setHabits(data ?? []);
    });
  }, [session, journalDisabled]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => {
        if (tag) set.add(tag);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const searchTerm = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (selectedTag && !(entry.tags?.includes(selectedTag))) {
        return false;
      }
      if (searchTerm) {
        const haystack = `${entry.title ?? ''} ${entry.content}`.toLowerCase();
        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, searchQuery, selectedTag]);

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedEntryId(null);
      if (isCompactLayout) {
        setShowMobileDetail(false);
      }
      return;
    }
    setSelectedEntryId((current) => {
      if (current && filteredEntries.some((entry) => entry.id === current)) {
        return current;
      }
      return filteredEntries[0].id;
    });
  }, [filteredEntries, isCompactLayout]);

  const activeEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null;

  useEffect(() => {
    if (journalType !== 'gratitude') {
      setGratitudeWeeklySummary(null);
      setThankYouDraft(null);
      setThankYouCopied(false);
      return;
    }

    const gratitudeEntries = entries.filter((entry) => entry.type === 'gratitude');
    const summary = buildGratitudeWeeklySummary(gratitudeEntries);
    setGratitudeWeeklySummary(summary);
  }, [entries, journalType]);

  const gratitudeLookbackEntry = useMemo(() => {
    if (journalType !== 'gratitude') return null;
    const todayMonthDay = formatMonthDay(new Date().toISOString());

    const sameDayHistory = entries
      .filter((entry) => entry.type === 'gratitude')
      .filter((entry) => formatMonthDay(entry.entry_date) === todayMonthDay)
      .filter((entry) => entry.entry_date !== new Date().toISOString().slice(0, 10))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    if (sameDayHistory.length > 0) return sameDayHistory[0];

    const fallback = entries
      .filter((entry) => entry.type === 'gratitude')
      .filter((entry) => entry.entry_date < new Date().toISOString().slice(0, 10))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    return fallback[0] ?? null;
  }, [entries, journalType]);

  const hasTodayGratitudeEntry = useMemo(() => {
    if (journalType !== 'gratitude') return false;
    const today = new Date().toISOString().slice(0, 10);
    return entries.some((entry) => entry.type === 'gratitude' && entry.entry_date === today);
  }, [entries, journalType]);

  const gratitudeAuthenticityStats = useMemo(() => {
    if (journalType !== 'gratitude') {
      return {
        authenticCount: 0,
        totalCount: 0,
        authenticRate: 0,
        weeklyAuthenticCount: 0,
        weeklyTotalCount: 0,
        weeklyAuthenticRate: 0,
        previousWeeklyAuthenticRate: 0,
        weeklyAuthenticDelta: 0,
      };
    }

    const weekStartIso = getIsoDateDaysAgo(6);
    const previousWeekStartIso = getIsoDateDaysAgo(13);
    const previousWeekEndIso = getIsoDateDaysAgo(7);

    const gratitudeEntries = entries.filter((entry) => entry.type === 'gratitude');
    const weeklyGratitudeEntries = gratitudeEntries.filter((entry) => entry.entry_date >= weekStartIso);
    const previousWeeklyEntries = gratitudeEntries.filter(
      (entry) => entry.entry_date >= previousWeekStartIso && entry.entry_date <= previousWeekEndIso,
    );

    const authenticCount = gratitudeEntries.filter(isAuthenticGratitudeEntry).length;
    const totalCount = gratitudeEntries.length;
    const authenticRate = totalCount > 0 ? Math.round((authenticCount / totalCount) * 100) : 0;

    const weeklyAuthenticCount = weeklyGratitudeEntries.filter(isAuthenticGratitudeEntry).length;
    const weeklyTotalCount = weeklyGratitudeEntries.length;
    const weeklyAuthenticRate = weeklyTotalCount > 0 ? Math.round((weeklyAuthenticCount / weeklyTotalCount) * 100) : 0;

    const previousWeeklyAuthenticCount = previousWeeklyEntries.filter(isAuthenticGratitudeEntry).length;
    const previousWeeklyTotalCount = previousWeeklyEntries.length;
    const previousWeeklyAuthenticRate =
      previousWeeklyTotalCount > 0 ? Math.round((previousWeeklyAuthenticCount / previousWeeklyTotalCount) * 100) : 0;

    return {
      authenticCount,
      totalCount,
      authenticRate,
      weeklyAuthenticCount,
      weeklyTotalCount,
      weeklyAuthenticRate,
      previousWeeklyAuthenticRate,
      weeklyAuthenticDelta: weeklyAuthenticRate - previousWeeklyAuthenticRate,
    };
  }, [entries, journalType]);

  const gratitudeWarningSummary = useMemo(() => {
    if (journalType !== 'gratitude') {
      return { totalFlagged: 0, topWarningThemes: [] as Array<{ theme: string; count: number; percent: number }> };
    }

    const weekStartIso = getIsoDateDaysAgo(6);

    const warningMap = new Map<string, number>();
    let totalFlagged = 0;

    entries
      .filter((entry) => entry.type === 'gratitude')
      .filter((entry) => entry.entry_date >= weekStartIso)
      .forEach((entry) => {
        if (isAuthenticGratitudeEntry(entry)) return;
        const warning = getGratitudeWarning(entry);
        const theme = warning ? getWarningTheme(warning) : 'tone needs reframing';
        warningMap.set(theme, (warningMap.get(theme) ?? 0) + 1);
        totalFlagged += 1;
      });

    const topWarningThemes = [...warningMap.entries()]
      .sort((a, b) => {
        const countDiff = b[1] - a[1];
        if (countDiff !== 0) return countDiff;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 3)
      .map(([theme, count]) => ({
        theme,
        count,
        percent: totalFlagged > 0 ? Math.round((count / totalFlagged) * 100) : 0,
      }));

    return { totalFlagged, topWarningThemes };
  }, [entries, journalType]);

  const weeklyRecap = useMemo<WeeklyJournalRecap>(() => {
    const weekStart = startOfWeekIso();
    const weekEntries = entries.filter((entry) => entry.entry_date >= weekStart);
    const totalEntries = weekEntries.length;
    const daysPracticed = new Set(weekEntries.map((entry) => entry.entry_date)).size;
    const modeCountMap = new Map<JournalEntryType, number>();
    const moodScores = weekEntries
      .map((entry) => entry.mood_score)
      .filter((value): value is number => typeof value === 'number');

    weekEntries.forEach((entry) => {
      modeCountMap.set(entry.type, (modeCountMap.get(entry.type) ?? 0) + 1);
    });

    const topModes = [...modeCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mode, count]) => ({ mode, count }));

    const averageMood = moodScores.length
      ? Number((moodScores.reduce((sum, value) => sum + value, 0) / moodScores.length).toFixed(1))
      : null;

    return {
      weekStart,
      totalEntries,
      daysPracticed,
      topModes,
      averageMood,
    };
  }, [entries]);

  const coachQuests = useMemo<CoachQuest[]>(() => {
    const weekStart = startOfWeekIso();
    const weekEntries = entries.filter((entry) => entry.entry_date >= weekStart);
    const gratitudeCount = weekEntries.filter((entry) => entry.type === 'gratitude').length;
    const deepWorkCount = weekEntries.filter((entry) => entry.type === 'deep' || entry.type === 'problem').length;

    return [
      { id: 'quest_reflect_twice', label: 'Write 2 journal entries this week', progress: weekEntries.length, target: 2 },
      { id: 'quest_gratitude_pair', label: 'Log 2 gratitude entries this week', progress: gratitudeCount, target: 2 },
      { id: 'quest_deep_dive', label: 'Complete 1 deep/problem reflection', progress: deepWorkCount, target: 1 },
    ];
  }, [entries]);

  const gratitudeReadiness = useMemo(() => {
    if (journalType !== 'gratitude') return null;

    if (gratitudeAuthenticityStats.totalCount === 0) {
      return {
        tone: 'neutral' as const,
        title: 'Start your first gratitude check-in',
        message: 'Write one short authentic gratitude moment to unlock weekly coaching insights.',
      };
    }

    if (gratitudeWarningSummary.totalFlagged === 0 && gratitudeAuthenticityStats.weeklyAuthenticRate >= 80) {
      return {
        tone: 'success' as const,
        title: 'You are on a healthy gratitude track',
        message: 'Great compassion signal this week. Keep your entries specific and people-aware.',
      };
    }

    return {
      tone: 'warning' as const,
      title: 'Small reframing can boost your impact',
      message: 'Use “Coach me on this” to rewrite one flagged theme into compassionate gratitude.',
    };
  }, [journalType, gratitudeAuthenticityStats, gratitudeWarningSummary]);

  const goalMap = useMemo(() => {
    const map: Record<string, GoalRow> = {};
    goals.forEach((goal) => {
      map[goal.id] = goal;
    });
    return map;
  }, [goals]);

  const habitMap = useMemo(() => {
    const map: Record<string, HabitRow> = {};
    habits.forEach((habit) => {
      map[habit.id] = habit;
    });
    return map;
  }, [habits]);

  const getMoodMeta = useCallback(
    (mood?: string | null) => MOOD_OPTIONS.find((option) => option.value === mood),
    [],
  );

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    if (isCompactLayout) {
      setShowMobileDetail(true);
    }
  };

  const handleOpenEditor = (mode: 'create' | 'edit', entryToEdit: JournalEntry | null) => {
    setEditorMode(mode);
    setEditingEntry(entryToEdit);
    setEditorError(null);
    if (mode === 'edit') {
      setSeedDraft(null);
    }
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setSeedDraft(null);
  };

  const handleQuickStartPreset = (type: JournalType, title: string, content: string) => {
    setJournalType(type);
    setJournalView('write');
    setEditorMode('create');
    setEditingEntry(null);
    setEditorError(null);
    setSeedDraft({
      type,
      title,
      content,
    });
    setEditorOpen(true);
  };

  const handleCopyThankYouDraft = async () => {
    if (!thankYouDraft) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(thankYouDraft);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = thankYouDraft;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setThankYouCopied(true);
      window.setTimeout(() => setThankYouCopied(false), 1800);

      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'gratitude_thank_you_draft_copied',
        metadata: {
          hasTarget: Boolean(gratitudeWeeklySummary?.suggestedThankYouTarget),
          draftLength: thankYouDraft.length,
        },
      });
    } catch {
      setStatus({ kind: 'warning', message: 'Could not copy draft automatically. Select text manually to copy.' });
    }
  };

  const handleRefineDraftWithCoach = () => {
    if (!thankYouDraft || !onOpenAiCoach) return;

    const target = gratitudeWeeklySummary?.suggestedThankYouTarget?.trim();
    const targetHint = target ? `The thank-you target is ${target}.` : 'No specific target was detected; help me choose one.';

    onOpenAiCoach(
      `Please help me refine this gratitude thank-you message so it feels warm, authentic, and concise. ${targetHint}

Draft:
${thankYouDraft}`,
    );

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'gratitude_thank_you_draft_refine_requested',
      metadata: {
        hasTarget: Boolean(target),
        draftLength: thankYouDraft.length,
      },
    });
  };

  const handleOpenWarningCoach = () => {
    if (!onOpenAiCoach || gratitudeWarningSummary.totalFlagged === 0) return;

    const themes = gratitudeWarningSummary.topWarningThemes.length
      ? gratitudeWarningSummary.topWarningThemes
          .map(({ theme, count, percent }) => `${theme} (${count}, ${percent}%)`)
          .join(', ')
      : 'tone needs reframing';

    onOpenAiCoach(
      `Please coach me to improve my gratitude journaling tone. My recent flagged themes were: ${themes}. Give me 3 short reframing examples and one prompt for tomorrow.`,
    );

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'gratitude_warning_coach_opened',
      metadata: {
        totalFlagged: gratitudeWarningSummary.totalFlagged,
        themes: gratitudeWarningSummary.topWarningThemes.map(({ theme, count, percent }) => ({
          theme,
          count,
          percent,
        })),
      },
    });
  };

  const handleSaveEntry = async (draft: JournalEntryDraft) => {
    // For problem mode, validate that at least one section has content
    const isProblemMode = draft.type === 'problem';
    if (isProblemMode) {
      const hasAnyProblemContent = [
        draft.irrationalFears,
        draft.trainingSolutions,
        draft.concreteSteps
      ].some(field => field?.trim());
      
      if (!hasAnyProblemContent) {
        setEditorError('Please fill in at least one problem-solving section before saving.');
        return;
      }
    }
    
    const isGratitudeMode = draft.type === 'gratitude';
    const gratitudeCoachResult = isGratitudeMode ? getGratitudeCoachFeedback(draft.content) : null;

    if (isGratitudeMode) {
      const trimmedContent = draft.content.trim();
      if (trimmedContent.length < 10) {
        setEditorError('Add at least one meaningful gratitude thought before saving.');
        return;
      }
    }

    // For other modes, require content
    if (!isProblemMode && !draft.content.trim()) {
      setEditorError('Write a few lines before saving.');
      return;
    }

    setEditorSaving(true);
    setEditorError(null);

    try {
      const basePayload: Omit<JournalEntryInsertPayload, 'user_id'> = {
        entry_date: draft.entryDate,
        title: draft.title.trim() ? draft.title.trim() : null,
        content: draft.content.trim() || (isProblemMode ? 'Problem journal entry' : ''),
        mood: draft.mood ?? null,
        tags: draft.tags.length ? draft.tags : null,
        linked_goal_ids: draft.linkedGoalIds.length ? draft.linkedGoalIds : null,
        linked_habit_ids: draft.linkedHabitIds.length ? draft.linkedHabitIds : null,
        attachments: gratitudeCoachResult
          ? withGratitudeMeta(editingEntry?.attachments ?? null, gratitudeCoachResult)
          : undefined,
        is_private: true,
        type: draft.type ?? DEFAULT_JOURNAL_TYPE,
        mood_score: draft.moodScore ?? null,
        category: draft.category ?? null,
        unlock_date: draft.unlockDate ?? null,
        goal_id: draft.goalId ?? null,
        irrational_fears: draft.irrationalFears ?? null,
        training_solutions: draft.trainingSolutions ?? null,
        concrete_steps: draft.concreteSteps ?? null,
      };

      let saved: JournalEntry | null = null;
      if (editorMode === 'create') {
        const insertPayload: JournalEntryInsertPayload = {
          ...basePayload,
          user_id: session.user.id,
        };
        const { data, error: serviceError } = await createJournalEntry(insertPayload);
        if (serviceError || !data) {
          throw new Error(serviceError?.message ?? 'Unable to save the entry.');
        }
        saved = data;
        setEntries((current) => sortEntries([data, ...current]));
      } else if (editingEntry) {
        const updatePayload: JournalEntryUpdatePayload = basePayload;
        const { data, error: serviceError } = await updateJournalEntry(editingEntry.id, updatePayload);
        if (serviceError || !data) {
          throw new Error(serviceError?.message ?? 'Unable to update the entry.');
        }
        saved = data;
        setEntries((current) =>
          sortEntries(current.map((item) => (item.id === data.id ? data : item))),
        );
      }

      if (saved) {
        const savedPendingSync = saved.id.startsWith('local-');
        // Award XP for journal entry (only for new entries, not edits)
        if (editorMode === 'create') {
          const content = draft.content.trim();
          const wordCount = content ? content.split(/\s+/).length : 0;
          const isLongEntry = wordCount >= 500;
          const xpAmount = isLongEntry 
            ? XP_REWARDS.JOURNAL_ENTRY + XP_REWARDS.JOURNAL_LONG_ENTRY  // 25 XP for 500+ words
            : XP_REWARDS.JOURNAL_ENTRY;  // 15 XP base

          await earnXP(xpAmount, 'journal_entry', saved.id);
          await recordActivity(); // Update daily streak
          recordChallengeActivity(session.user.id, 'journal_entry');

          if (draft.type === 'gratitude' && gratitudeCoachResult) {
            const coachResult = gratitudeCoachResult;
            setGratitudeCoach(coachResult);
            setThankYouDraft(null);

            if (coachResult.isAuthentic) {
              const { data: gratitudeEntries } = await listJournalEntriesByMode({ type: 'gratitude', limit: 1000 });
              const existingValidCount = (gratitudeEntries ?? [])
                .filter((entry) => entry.id !== saved.id)
                .filter(isAuthenticGratitudeEntry).length;

              const validCountIncludingCurrent = existingValidCount + 1;
              const baseZen = 3;
              const milestoneBonus =
                validCountIncludingCurrent > 0 && validCountIncludingCurrent % 10 === 0 ? 12 : 0;
              const totalZen = baseZen + milestoneBonus;

              await awardZenTokens(
                session.user.id,
                totalZen,
                'gratitude_journal',
                saved.id,
                milestoneBonus > 0
                  ? `Authentic gratitude entry + 10th-entry bonus (${totalZen} zen)`
                  : 'Authentic gratitude entry reward',
              );

              setStatus({
                kind: 'success',
                message:
                  milestoneBonus > 0
                    ? `Gratitude saved. +${totalZen} Zen (includes 10-entry bonus).`
                    : `Gratitude saved. +${totalZen} Zen.`,
              });

              void recordTelemetryEvent({
                userId: session.user.id,
                eventType: 'gratitude_entry_rewarded',
                metadata: {
                  authenticityScore: coachResult.score,
                  zenAwarded: totalZen,
                  milestoneBonus,
                  entryId: saved.id,
                },
              });
            } else {
              setStatus({
                kind: 'warning',
                message: 'Entry saved, but no Zen reward this time. Coach suggests reframing toward compassionate gratitude.',
              });

              void recordTelemetryEvent({
                userId: session.user.id,
                eventType: 'gratitude_entry_flagged',
                metadata: {
                  authenticityScore: coachResult.score,
                  warning: coachResult.warning ?? null,
                  entryId: saved.id,
                },
              });
            }
          } else {
            setGratitudeCoach(null);
          }

          // 1. Immediately add instant feedback (pop/glow)
          const feedbackClassName = draft.type === 'gratitude'
            ? 'journal-item--feedback-gratitude'
            : 'journal-item--feedback-reflective';
          setJustSavedEntryId(saved.id);
          setEntryFeedbackById((current) => ({ ...current, [saved.id]: feedbackClassName }));
          if (draft.type === 'gratitude') {
            triggerCompletionHaptic('medium', { channel: 'journal', minIntervalMs: 1800 });
          }

          // 2. After pop animation completes, trigger celebration
          setTimeout(() => {
            setCelebrationType('journal');
            setCelebrationXP(xpAmount);
            setShowCelebration(true);
          }, 400);

          // 3. Clean up instant feedback class
          setTimeout(() => {
            setJustSavedEntryId(null);
            setEntryFeedbackById((current) => {
              const next = { ...current };
              delete next[saved.id];
              return next;
            });
          }, 600);
        }

        setSelectedEntryId(saved.id);
        if (!(editorMode === 'create' && draft.type === 'gratitude')) {
          setStatus(
            savedPendingSync
              ? { kind: 'warning', message: 'Entry saved locally. It will sync once you are back online.' }
              : { kind: 'success', message: editorMode === 'create' ? 'Entry saved.' : 'Entry updated.' }
          );
        }
        setEditorOpen(false);
        setSeedDraft(null);
        if (isCompactLayout) {
          setShowMobileDetail(true);
        }
        void refreshQueueStatus();
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Unable to save your entry right now.');
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!activeEntry) return;
    const confirmed = window.confirm('Delete this journal entry? This action cannot be undone.');
    if (!confirmed) return;

    setActionLoading(true);
    setStatus(null);
    try {
      const { error: serviceError } = await deleteJournalEntry(activeEntry.id);
      if (serviceError) {
        throw new Error(serviceError.message);
      }
      let nextEntriesSnapshot: JournalEntry[] = [];
      setEntries((current) => {
        const next = sortEntries(current.filter((item) => item.id !== activeEntry.id));
        nextEntriesSnapshot = next;
        return next;
      });
      setSelectedEntryId((current) => {
        if (current === activeEntry.id) {
          return nextEntriesSnapshot[0]?.id ?? null;
        }
        return current;
      });
      if (isCompactLayout && nextEntriesSnapshot.length === 0) {
        setShowMobileDetail(false);
      }
      setStatus({ kind: 'success', message: 'Entry deleted.' });
      void refreshQueueStatus();
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Unable to delete the entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigateGoal = (goalId: string) => {
    window.__LifeGoalAppDebugger?.log?.('journal-goal-link', { goalId });
    onNavigateToGoals?.();
  };

  const handleNavigateHabit = (habitId: string) => {
    window.__LifeGoalAppDebugger?.log?.('journal-habit-link', { habitId });
    onNavigateToHabits?.();
  };

  const listEmptyState = journalDisabled
    ? 'Connect Supabase or open the demo workspace to unlock your private journal.'
    : entries.length === 0 && !searchQuery && !selectedTag
      ? 'No entries yet. Create your first reflection to begin.'
      : 'No entries match your filters right now.';

  return (
    <section className="journal">
      <header className="journal__header">
        <div>
          <p className="journal__eyebrow">Daily reflections</p>
          <h1>Journal</h1>
          {journalView === 'write' ? <p className="journal__mode-note">Current mode: {getModeLabel(journalType)}</p> : null}
        </div>
        {journalView !== 'hub' ? (
          <div className="journal__header-actions">
            <button
              type="button"
              className="journal__back-to-hub"
              onClick={() => setJournalView('hub')}
              aria-label="Back to journal hub"
            >
              ← Back to hub
            </button>
            {journalView === 'write' ? (
              <>
                <JournalTypeSelector journalType={journalType} onChange={setJournalType} />
                <label className="journal__field journal__field--soundscape">
                  <span style={{ fontSize: '0.75rem' }}>Soundscape</span>
                  <select value={soundscape} onChange={(event) => setSoundscape(event.target.value as JournalSoundscape)}>
                    <option value="off">Off</option>
                    <option value="rain">🌧️ Rain</option>
                    <option value="lofi">🎧 Lo-fi</option>
                    <option value="nature">🌿 Nature</option>
                  </select>
                </label>
                {onNavigateToTimer ? (
                  <button
                    type="button"
                    className="journal__new"
                    onClick={() =>
                      onNavigateToTimer({
                        sourceType: 'journal',
                        sourceName: soundscape === 'off' ? 'Journal reflection' : `Journal reflection · ${soundscape}`,
                      })
                    }
                    disabled={journalDisabled}
                  >
                    ⏱️ Focus timer {soundscape !== 'off' ? `(${soundscape})` : ''}
                  </button>
                ) : null}
                {!isGoalReflectionMode ? (
                  <button
                    type="button"
                    className="journal__new"
                    onClick={() => handleOpenEditor('create', null)}
                    disabled={journalDisabled}
                  >
                    + New entry
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="journal-view-tabs" role="tablist" aria-label="Journal sections">
        <button type="button" className={`journal-view-tabs__tab ${journalView === 'hub' ? 'journal-view-tabs__tab--active' : ''}`} onClick={() => setJournalView('hub')}>Hub</button>
        <button type="button" className={`journal-view-tabs__tab ${journalView === 'write' ? 'journal-view-tabs__tab--active' : ''}`} onClick={() => setJournalView('write')}>New journal</button>
        <button type="button" className={`journal-view-tabs__tab ${journalView === 'read' ? 'journal-view-tabs__tab--active' : ''}`} onClick={() => setJournalView('read')}>Read old</button>
      </div>

      {journalView === 'hub' ? (
      <section className="journal-hub" aria-label="Journal hub">
        <button
          type="button"
          className="journal-hub__card"
          onClick={() => {
            setJournalView('write');
          }}
          disabled={journalDisabled}
        >
          <span className="journal-hub__icon" aria-hidden="true">✨</span>
          <span className="journal-hub__title">New journal</span>
          <span className="journal-hub__description">Start a fresh reflection in {getModeLabel(journalType)} mode.</span>
        </button>
        <button
          type="button"
          className="journal-hub__card"
          onClick={() => {
            setJournalView('read');
            if (isCompactLayout) {
              setShowMobileDetail(false);
            } else if (filteredEntries.length > 0) {
              handleSelectEntry(filteredEntries[0].id);
            }
          }}
          disabled={journalDisabled}
        >
          <span className="journal-hub__icon" aria-hidden="true">📚</span>
          <span className="journal-hub__title">Read old journal</span>
          <span className="journal-hub__description">Browse history, revisit patterns, and search older entries.</span>
        </button>
      </section>
      ) : null}

      {journalView === 'hub' ? (
        <section className="journal-write-stage" aria-label="Two minute starts">
          <p><strong>2-minute starts</strong> — low-friction journaling sprints.</p>
          <div className="journal-coach-stage__actions">
            <button
              type="button"
              className="journal__new"
              onClick={() =>
                handleQuickStartPreset(
                  'problem',
                  '2-minute clear mind',
                  '1) What is bothering me most right now?\n2) What is true vs story?\n3) One small action in the next 10 minutes.',
                )
              }
              disabled={journalDisabled}
            >
              🧠 Clear mind
            </button>
            <button
              type="button"
              className="journal__new"
              onClick={() =>
                handleQuickStartPreset(
                  'gratitude',
                  '2-minute gratitude',
                  '1) One person I appreciate today.\n2) One small moment that felt good.\n3) Why this mattered.',
                )
              }
              disabled={journalDisabled}
            >
              🙏 Gratitude
            </button>
            <button
              type="button"
              className="journal__new"
              onClick={() =>
                handleQuickStartPreset(
                  'goal',
                  '2-minute tomorrow plan',
                  '1) Most important task tomorrow.\n2) Biggest likely blocker.\n3) First 10-minute starter action.',
                )
              }
              disabled={journalDisabled}
            >
              🚀 Plan tomorrow
            </button>
          </div>
        </section>
      ) : null}

      {journalDisabled ? (
        <p className="journal__banner">
          Add your Supabase credentials or launch the demo workspace to save private journal entries.
        </p>
      ) : null}

      {journalView !== 'hub' && status ? <p className={`journal__status journal__status--${status.kind}`}>{status.message}</p> : null}
      {journalView !== 'hub' && error ? <p className="journal__status journal__status--error">{error}</p> : null}
      {journalView !== 'hub' && (queueStatus.pending > 0 || queueStatus.failed > 0) ? (
        <p className="journal__status journal__status--warning">
          {queueStatus.failed > 0
            ? `${queueStatus.failed} journal change${queueStatus.failed === 1 ? '' : 's'} failed to sync. We will keep retrying when online.`
            : `${queueStatus.pending} journal change${queueStatus.pending === 1 ? '' : 's'} pending sync.`}{' '}
          Avoid clearing browser/app data until sync completes.
        </p>
      ) : null}
      {journalView === 'write' && (
        <section className="journal-write-stage">
          <p>Pick a mode, then tap <strong>+ New entry</strong> to start writing.</p>
          {onOpenAiCoach ? (
            <div className="journal-coach-stage__actions">
              <button
                type="button"
                className="journal__new"
                onClick={() =>
                  onOpenAiCoach(
                    `I'm about to journal in ${getModeLabel(journalType)} mode. Give me one concise framing question and one action-oriented prompt before I write.`,
                  )
                }
              >
                ✨ Coach prep prompt
              </button>
              <button
                type="button"
                className="journal__new"
                onClick={() =>
                  onOpenAiCoach(
                    'Help me choose the best journal mode right now (quick, deep, gratitude, problem, goal) and explain why in 3 bullets.',
                  )
                }
              >
                🧭 Help me pick a mode
              </button>
            </div>
          ) : null}
        </section>
      )}

      {journalView === 'read' ? (
        <section className="journal-gratitude-weekly" aria-live="polite">
          <div className="journal-gratitude-weekly__head">
            <p className="journal-gratitude-weekly__eyebrow">Weekly journal recap</p>
            <h3>{weeklyRecap.totalEntries} entries since {weeklyRecap.weekStart}</h3>
          </div>
          <div className="journal-gratitude-weekly__stats">
            <span className="journal-gratitude-weekly__stat">Days practiced: {weeklyRecap.daysPracticed}</span>
            <span className="journal-gratitude-weekly__stat">
              Avg mood score: {weeklyRecap.averageMood === null ? 'N/A' : weeklyRecap.averageMood}
            </span>
          </div>
          <p className="journal-gratitude-weekly__label">Most used modes</p>
          <div className="journal-gratitude-weekly__themes">
            {weeklyRecap.topModes.length > 0 ? weeklyRecap.topModes.map((mode) => (
              <span key={mode.mode} className="journal-gratitude-weekly__theme">
                {getModeLabel(mode.mode)} ({mode.count})
              </span>
            )) : <span className="journal-gratitude-weekly__theme">Write your first entry this week ✍️</span>}
          </div>
          <div className="journal-gratitude-weekly__readiness journal-gratitude-weekly__readiness--neutral">
            <p className="journal-gratitude-weekly__label">Coach quests this week</p>
            <div className="journal-gratitude-weekly__themes">
              {coachQuests.map((quest) => {
                const completed = quest.progress >= quest.target;
                return (
                  <span
                    key={quest.id}
                    className={`journal-gratitude-weekly__theme ${completed ? '' : 'journal-gratitude-weekly__theme--warning'}`}
                  >
                    {completed ? '🏆' : '🎯'} {quest.label} ({Math.min(quest.progress, quest.target)}/{quest.target})
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {journalView === 'read' && gratitudeCoach ? (
        <section className="journal-gratitude-coach" aria-live="polite">
          <div>
            <p className="journal-gratitude-coach__eyebrow">Coach check-in</p>
            <h3>Want to hear what Coach is saying?</h3>
            {gratitudeCoach.warning ? <p className="journal-gratitude-coach__warning">{gratitudeCoach.warning}</p> : null}
            <p>{gratitudeCoach.feedback}</p>
          </div>
          <div className="journal-gratitude-coach__actions">
            <span className="journal-gratitude-coach__score">Authenticity score: {gratitudeCoach.score}%</span>
            {onOpenAiCoach ? (
              <button
                type="button" className="journal__new"
                onClick={() =>
                  onOpenAiCoach?.(
                    gratitudeCoach.warning
                      ? `I just wrote a gratitude entry and got this warning: ${gratitudeCoach.warning} Please help me rewrite it into compassionate gratitude.`
                      : `I just completed a gratitude entry. Here is the coach feedback: ${gratitudeCoach.feedback} Can you give me one deeper prompt for tomorrow?`,
                  )
                }
              >
                Report to AI chat
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {journalView === 'read' && journalType === 'gratitude' && !hasTodayGratitudeEntry ? (
        <section className="journal-gratitude-today" aria-live="polite">
          <p className="journal-gratitude-today__eyebrow">Today’s gratitude</p>
          <h3>Capture one gratitude moment for today</h3>
          <p>A 60-second note keeps your reflection streak warm and your weekly insights richer.</p>
          <button
            type="button"
            className="journal__new"
            onClick={() => handleOpenEditor('create', null)}
            disabled={journalDisabled}
          >
            Capture today’s gratitude
          </button>
        </section>
      ) : null}

      {journalView === 'read' && journalType === 'gratitude' && gratitudeWeeklySummary ? (
        <section className="journal-gratitude-weekly" aria-live="polite">
          <div className="journal-gratitude-weekly__head">
            <p className="journal-gratitude-weekly__eyebrow">Weekly gratitude review</p>
            <h3>{gratitudeWeeklySummary.totalEntries} entries • {gratitudeWeeklySummary.totalMoments} gratitude moments</h3>
          </div>
          <div className="journal-gratitude-weekly__stats">
            <span className="journal-gratitude-weekly__stat">Days practiced this month: {gratitudeWeeklySummary.daysPracticedThisMonth}</span>
            <span className="journal-gratitude-weekly__stat">Best streak: {gratitudeWeeklySummary.bestStreakDays} day{gratitudeWeeklySummary.bestStreakDays === 1 ? '' : 's'}</span>
            <span className="journal-gratitude-weekly__stat">
              Authentic entries this week: {gratitudeAuthenticityStats.weeklyAuthenticCount}/{gratitudeAuthenticityStats.weeklyTotalCount} ({gratitudeAuthenticityStats.weeklyAuthenticRate}%)
            </span>
            {gratitudeAuthenticityStats.previousWeeklyAuthenticRate > 0 ? (
              <span className="journal-gratitude-weekly__stat">
                Authenticity trend: {gratitudeAuthenticityStats.weeklyAuthenticDelta >= 0 ? '+' : ''}{gratitudeAuthenticityStats.weeklyAuthenticDelta} pts vs last week
              </span>
            ) : null}
          </div>
          {gratitudeReadiness ? (
            <div className={`journal-gratitude-weekly__readiness journal-gratitude-weekly__readiness--${gratitudeReadiness.tone}`}>
              <p className="journal-gratitude-weekly__label">{gratitudeReadiness.title}</p>
              <p>{gratitudeReadiness.message}</p>
            </div>
          ) : null}
          {gratitudeWarningSummary.totalFlagged > 0 ? (
            <div className="journal-gratitude-weekly__flags" aria-live="polite">
              <p className="journal-gratitude-weekly__label">
                Coach noticed {gratitudeWarningSummary.totalFlagged} entry{gratitudeWarningSummary.totalFlagged === 1 ? '' : 'ies'} this week needing reframing
              </p>
              <div className="journal-gratitude-weekly__themes">
                {gratitudeWarningSummary.topWarningThemes.map(({ theme, count, percent }) => (
                  <span key={theme} className="journal-gratitude-weekly__theme journal-gratitude-weekly__theme--warning">
                    {theme} ({count}, {percent}%)
                  </span>
                ))}
              </div>
              {onOpenAiCoach ? (
                <button
                  type="button"
                  className="journal-gratitude-weekly__coach-help"
                  onClick={handleOpenWarningCoach}
                >
                  Coach me on this
                </button>
              ) : null}
            </div>
          ) : null}

          <p className="journal-gratitude-weekly__label">Top themes this week</p>
          <div className="journal-gratitude-weekly__themes">
            {(gratitudeWeeklySummary.topThemes.length ? gratitudeWeeklySummary.topThemes : ['consistency', 'small wins'])
              .map((theme) => (
                <span key={theme} className="journal-gratitude-weekly__theme">#{theme}</span>
              ))}
          </div>
          <div className="journal-gratitude-weekly__actions">
            <button
              type="button"
              className="journal__new"
              onClick={() => {
                setThankYouDraft(buildThankYouDraft(gratitudeWeeklySummary.suggestedThankYouTarget));
                setThankYouCopied(false);
              }}
            >
              Draft thank-you message
            </button>
          </div>
          {thankYouDraft ? (
            <div className="journal-gratitude-weekly__draft-wrap">
              <p className="journal-gratitude-weekly__draft">{thankYouDraft}</p>
              <div className="journal-gratitude-weekly__draft-actions">
                <button type="button" className="journal-gratitude-weekly__copy" onClick={handleCopyThankYouDraft}>
                  {thankYouCopied ? 'Copied ✓' : 'Copy draft'}
                </button>
                {onOpenAiCoach ? (
                  <button
                    type="button"
                    className="journal-gratitude-weekly__coach"
                    onClick={handleRefineDraftWithCoach}
                  >
                    Refine with Coach
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {journalView === 'read' && journalType === 'gratitude' && gratitudeLookbackEntry ? (
        <section className="journal-gratitude-lookback" aria-live="polite">
          <p className="journal-gratitude-lookback__eyebrow">Look back</p>
          <h3>On this day gratitude memory</h3>
          <p className="journal-gratitude-lookback__date">{new Date(gratitudeLookbackEntry.entry_date).toLocaleDateString()}</p>
          <p className="journal-gratitude-lookback__content">{gratitudeLookbackEntry.content.slice(0, 180)}{gratitudeLookbackEntry.content.length > 180 ? '…' : ''}</p>
          <button
            type="button"
            className="journal-gratitude-lookback__open"
            onClick={() => handleSelectEntry(gratitudeLookbackEntry.id)}
          >
            Open this entry
          </button>
        </section>
      ) : null}

      {journalView === 'read' && isGoalReflectionMode ? (
        <GoalReflectionJournal session={session} />
      ) : journalView === 'read' ? (
        <>
          <div className="journal__layout">
            <div className={`journal__column journal__column--list ${
              isCompactLayout && showMobileDetail ? 'journal__column--hidden' : ''
            }`}>
              <JournalEntryList
                entries={entries}
                filteredEntries={filteredEntries}
                selectedEntryId={selectedEntryId}
                justSavedEntryId={justSavedEntryId}
                completionFeedbackById={entryFeedbackById}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                availableTags={availableTags}
                loading={loading}
                disabled={journalDisabled}
                isCollapsed={isCompactLayout && showMobileDetail}
                emptyStateMessage={listEmptyState}
                getMoodMeta={getMoodMeta}
                onSelectEntry={handleSelectEntry}
                isEntryLocked={isEntryLocked}
              />
            </div>
            <div className={`journal__column journal__column--detail ${
              isCompactLayout && !showMobileDetail ? 'journal__column--hidden' : ''
            }`}>
              <JournalEntryDetail
                entry={activeEntry}
                getMoodMeta={getMoodMeta}
                goalMap={goalMap}
                habitMap={habitMap}
                onEdit={() => handleOpenEditor('edit', activeEntry)}
                onDelete={handleDeleteEntry}
                showBackButton={isCompactLayout}
                onBack={() => setShowMobileDetail(false)}
                onNavigateToGoal={handleNavigateGoal}
                onNavigateToHabit={handleNavigateHabit}
                disabled={journalDisabled || actionLoading}
                unavailableMessage={journalDisabled ? listEmptyState : null}
                isLocked={activeEntry ? isEntryLocked(activeEntry) : false}
              />
            </div>
          </div>

          <JournalEntryEditor
            open={editorOpen}
            mode={editorMode}
            entry={editorMode === 'edit' ? editingEntry : null}
            goals={goals}
            habits={habits}
            moodOptions={MOOD_OPTIONS}
            saving={editorSaving}
            error={editorError}
            journalType={journalType}
            guidedTemplates={guidedTemplates}
            seedDraft={seedDraft}
            onClose={handleCloseEditor}
            onSave={handleSaveEntry}
          />
        </>
      ) : (
        <JournalEntryEditor
          open={editorOpen}
          mode={editorMode}
          entry={editorMode === 'edit' ? editingEntry : null}
          goals={goals}
          habits={habits}
          moodOptions={MOOD_OPTIONS}
          saving={editorSaving}
          error={editorError}
          journalType={journalType}
          guidedTemplates={guidedTemplates}
          seedDraft={seedDraft}
          onClose={handleCloseEditor}
          onSave={handleSaveEntry}
        />
      )}

      {/* Celebration animation for journal completion */}
      {showCelebration && (
        <CelebrationAnimation
          type={celebrationType}
          xpAmount={celebrationXP}
          targetElement="fab-button"
          onComplete={() => {
            setShowCelebration(false);
            if (celebrationType === 'levelup') {
              dismissLevelUpEvent?.();
            }
          }}
        />
      )}
    </section>
  );
}
