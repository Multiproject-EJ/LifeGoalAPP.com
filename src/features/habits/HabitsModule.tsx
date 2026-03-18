import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listHabitsV2, listTodayHabitLogsV2, createHabitV2, logHabitCompletionV2, listHabitStreaksV2, archiveHabitV2, listHabitLogsForWeekV2, listHabitLogsForRangeMultiV2, updateHabitFullV2, isHabitLifecycleActive, getHabitLifecycleStatus, pauseHabitV2, resumeHabitV2, deactivateHabitV2, reactivateHabitV2, type HabitV2Row, type HabitLogV2Row, type HabitStreakRow } from '../../services/habitsV2';
import { buildAdherenceSnapshots, type HabitAdherenceSnapshot } from '../../services/adherenceMetrics';
import { saveAndApplySuggestion, revertSuggestionForHabit, listRevertableSuggestions, type HabitAdjustmentRow } from '../../services/habitAdjustments';
import { HabitWizard, type HabitWizardDraft } from './HabitWizard';
import { environmentContextToJson, normalizeEnvironmentContext } from '../environment/environmentSchema';
import { loadHabitTemplates, type HabitTemplate } from './habitTemplates';
import { HabitsInsights } from './HabitsInsights';
import { isHabitScheduledToday, parseSchedule, getTimesPerWeekProgress, getEveryNDaysNextDue } from './scheduleInterpreter';
import { classifyHabit } from './performanceClassifier';
import { getTelemetryDifficultyAdjustment, recordTelemetryEvent } from '../../services/telemetry';
import { buildSuggestion, type HabitSuggestion } from './suggestionsEngine';
import { buildEnhancedRationale, type EnhancedRationaleResult } from './aiRationale';
import type { Database } from '../../lib/database.types';
import type { TimerLaunchContext } from '../timer/timerSession';
import { scheduleHabitNotifications, cancelHabitNotifications } from '../../services/habitAlertNotifications';
import './HabitsModule.css';
import {
  AUTO_PROGRESS_TIERS,
  buildAutoProgressPlan,
  buildDefaultAutoProgressState,
  getAutoProgressState,
  getNextDownshiftTier,
  getNextUpgradeTier,
  type AutoProgressTier,
} from './autoProgression';
import {
  buildHabitLogPayload,
  type DoneIshConfig,
  DEFAULT_DONEISH_CONFIG,
} from './progressGrading';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Check if habit suggestions feature is enabled via environment variable
const SUGGESTIONS_ENABLED = import.meta.env.VITE_ENABLE_HABIT_SUGGESTIONS === '1';

type HabitsModuleProps = {
  session: Session;
  onNavigateToTimer?: (context?: TimerLaunchContext) => void;
};

function getHabitEnvironmentReviewPrompt(habit: HabitV2Row): { title: string; detail: string; tone: '#0f766e' | '#92400e' | '#1d4ed8' } {
  const lastAuditedAt = habit.environment_last_audited_at ? new Date(habit.environment_last_audited_at) : null;
  const isStale = lastAuditedAt
    ? (Date.now() - lastAuditedAt.getTime()) / (1000 * 60 * 60 * 24) >= 30
    : false;

  if (habit.environment_score === null) {
    return {
      title: 'Environment setup missing',
      detail: 'Add a cue, blocker fix, and fallback to make this habit easier to keep.',
      tone: '#1d4ed8',
    };
  }

  if (habit.environment_score <= 2) {
    return {
      title: `Environment score ${habit.environment_score}/5`,
      detail: 'This setup looks fragile. Re-audit the habit environment and save a smaller fallback version.',
      tone: '#92400e',
    };
  }

  if (isStale) {
    return {
      title: 'Environment audit is stale',
      detail: 'This habit has not been re-audited in 30+ days. Refresh the setup if your routine has changed.',
      tone: '#92400e',
    };
  }

  return {
    title: `Environment score ${habit.environment_score}/5`,
    detail: 'This habit has a recent environment setup on file.',
    tone: '#0f766e',
  };
}

function isHabitReadyToResume(habit: HabitV2Row): boolean {
  if (getHabitLifecycleStatus(habit) !== 'paused' || !habit.resume_on) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resumeOn = new Date(habit.resume_on);
  resumeOn.setHours(0, 0, 0, 0);
  return resumeOn.getTime() <= today.getTime();
}

export function HabitsModule({ session, onNavigateToTimer }: HabitsModuleProps) {
  const isMobileLayout = useMediaQuery('(max-width: 768px)');
  const [mobileHabitPanel, setMobileHabitPanel] = useState<'menu' | 'create' | 'manage' | 'coach'>('menu');
  const [showDevNotes, setShowDevNotes] = useState(false);
  const [habits, setHabits] = useState<HabitV2Row[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLogV2Row[]>([]);
  const [weekLogs, setWeekLogs] = useState<HabitLogV2Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Streaks state
  const [streaks, setStreaks] = useState<HabitStreakRow[]>([]);
  const [streaksLoading, setStreaksLoading] = useState(false);
  const [streaksError, setStreaksError] = useState<string | null>(null);
  
  // Adherence state
  const [adherenceSnapshots, setAdherenceSnapshots] = useState<HabitAdherenceSnapshot[]>([]);
  const [adherenceLoading, setAdherenceLoading] = useState(false);
  const [showAdherence, setShowAdherence] = useState(false);
  const [stageMixByHabit, setStageMixByHabit] = useState<Record<string, { seed: number; minimum: number; standard: number; total: number }>>({});
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [pendingHabitDraft, setPendingHabitDraft] = useState<HabitWizardDraft | null>(null);
  const [wizardInitialDraft, setWizardInitialDraft] = useState<HabitWizardDraft | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<HabitTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  
  // Logging state for tracking in-flight habit logging
  const [loggingHabitIds, setLoggingHabitIds] = useState<Set<string>>(new Set());
  
  // Archiving state for tracking in-flight archive operations
  const [archivingHabitIds, setArchivingHabitIds] = useState<Set<string>>(new Set());
  const [lifecycleUpdatingHabitIds, setLifecycleUpdatingHabitIds] = useState<Set<string>>(new Set());

  // Auto-progress ladder state for tracking in-flight tier changes
  const [autoProgressHabitIds, setAutoProgressHabitIds] = useState<Set<string>>(new Set());
  
  // Input values for quantity/duration habits
  const [habitInputValues, setHabitInputValues] = useState<Record<string, string>>({});
  
  // Performance suggestions state
  const [performanceSuggestions, setPerformanceSuggestions] = useState<Record<string, HabitSuggestion>>({});
  
  // State for tracking which suggestions are being applied
  const [applyingSuggestionIds, setApplyingSuggestionIds] = useState<Set<string>>(new Set());
  
  // State for tracking which suggestions have been applied (by habit ID)
  const [appliedSuggestionHabitIds, setAppliedSuggestionHabitIds] = useState<Set<string>>(new Set());
  
  // State for revertable suggestions (applied suggestions with old_* values)
  const [revertableSuggestions, setRevertableSuggestions] = useState<HabitAdjustmentRow[]>([]);
  
  // State for tracking which suggestions are being reverted (by suggestion ID)
  const [revertingSuggestionIds, setRevertingSuggestionIds] = useState<Set<string>>(new Set());
  
  // State for tracking which suggestions have been reverted (by suggestion ID)
  const [revertedSuggestionIds, setRevertedSuggestionIds] = useState<Set<string>>(new Set());
  
  // State for revert confirmation dialog
  const [revertConfirmation, setRevertConfirmation] = useState<{
    suggestionId: string;
    habitId: string;
    habitTitle: string;
  } | null>(null);
  const [revertRationale, setRevertRationale] = useState('');
  
  // State for archive confirmation dialog
  const [archiveConfirmation, setArchiveConfirmation] = useState<{
    habitId: string;
    habitTitle: string;
  } | null>(null);
  const [lifecycleDialog, setLifecycleDialog] = useState<{
    habitId: string;
    habitTitle: string;
    action: 'pause' | 'deactivate';
  } | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleResumeOn, setLifecycleResumeOn] = useState('');
  
  // State for AI-enhanced rationales (by habit ID)
  const [enhancedRationales, setEnhancedRationales] = useState<Record<string, EnhancedRationaleResult>>({});
  
  // State for tracking which rationales are being expanded (by habit ID)
  const [expandedRationales, setExpandedRationales] = useState<Set<string>>(new Set());

  // Compute habits scheduled for today using the schedule interpreter with week logs
  const todaysHabits = useMemo(() => {
    const today = new Date();
    return habits.filter((habit) => {
      if (!isHabitLifecycleActive(habit)) {
        return false;
      }
      // Get this habit's week logs
      const habitWeekLogs = weekLogs.filter(log => log.habit_id === habit.id);
      return isHabitScheduledToday(habit, today, habitWeekLogs);
    });
  }, [habits, weekLogs]);

  const activeHabits = useMemo(
    () => habits.filter((habit) => getHabitLifecycleStatus(habit) === 'active'),
    [habits],
  );

  const inactiveHabits = useMemo(
    () =>
      habits
        .filter((habit) => getHabitLifecycleStatus(habit) !== 'active')
        .sort((a, b) => {
          const aReady = isHabitReadyToResume(a) ? 1 : 0;
          const bReady = isHabitReadyToResume(b) ? 1 : 0;
          if (aReady !== bReady) {
            return bReady - aReady;
          }
          return a.title.localeCompare(b.title);
        }),
    [habits],
  );

  const resumeReadyHabits = useMemo(
    () => inactiveHabits.filter((habit) => isHabitReadyToResume(habit)),
    [inactiveHabits],
  );

  // Load habits and today's logs on mount
  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setStreaksLoading(true);
      setStreaksError(null);

      try {
        // Load habits
        const { data: habitsData, error: habitsError } = await listHabitsV2({ includeInactive: true });
        if (habitsError) {
          throw new Error(habitsError.message);
        }

        const loadedHabits = habitsData ?? [];
        setHabits(loadedHabits);

        // Load today's logs
        const { data: logsData, error: logsError } = await listTodayHabitLogsV2(session.user.id);
        if (logsError) {
          throw new Error(logsError.message);
        }
        setTodayLogs(logsData ?? []);

        // Load week logs for times_per_week schedule support
        if (loadedHabits.length > 0) {
          const habitIds = loadedHabits.map(h => h.id);
          const { data: weekLogsData, error: weekLogsError } = await listHabitLogsForWeekV2(
            session.user.id,
            habitIds
          );
          if (weekLogsError) {
            console.error('Error loading week logs:', weekLogsError);
          } else {
            setWeekLogs(weekLogsData ?? []);
          }
        }

        // Load streaks
        const { data: streaksData, error: streaksApiError } = await listHabitStreaksV2(session.user.id);
        if (streaksApiError) {
          console.error('Error loading streaks:', streaksApiError);
          setStreaksError(streaksApiError.message);
        } else {
          setStreaks(streaksData ?? []);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load habits right now.');
      } finally {
        setLoading(false);
        setStreaksLoading(false);
      }
    };

    loadData();
  }, [session]);

  // Load templates on mount
  useEffect(() => {
    const loadTemplatesData = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);

      try {
        const templatesData = await loadHabitTemplates();
        setTemplates(templatesData);
      } catch (err) {
        setTemplatesError(err instanceof Error ? err.message : 'Failed to load templates');
        console.error('Error loading habit templates:', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplatesData();
  }, []);

  // Ref to store latest habits for use in service worker message handler
  const habitsRef = useRef<HabitV2Row[]>([]);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  // Handler for service worker messages - defined outside effect to maintain stable reference
  const handleServiceWorkerMessage = useCallback(async (event: MessageEvent) => {
    if (event.data?.type === 'HABIT_ACTION_FROM_NOTIFICATION') {
      const { habitId, action, completed, wasAlreadyCompleted } = event.data;
      
      if (action === 'done' && completed) {
        // Reload today's and week logs to update UI
        // Note: These functions reference session from closure which is stable
        await Promise.all([reloadTodayLogs(), reloadWeekLogs()]);
        
        // Find habit name for toast message using ref to get latest habits
        const habit = habitsRef.current.find(h => h.id === habitId);
        const habitName = habit?.title || 'Habit';
        
        // Show appropriate toast message
        if (wasAlreadyCompleted) {
          setSuccessMessage(`"${habitName}" was already completed today.`);
        } else {
          setSuccessMessage(`✓ Marked "${habitName}" as done!`);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else if (action === 'snooze') {
        setSuccessMessage('Habit snoozed until tomorrow.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // Only depends on session for reloadTodayLogs/reloadWeekLogs stability

  // Listen for service worker messages (habit completion from notification actions)
  useEffect(() => {
    if (!session) return;

    // Listen for messages from service worker
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [session, handleServiceWorkerMessage]);

  // Helper to reload today's logs
  const reloadTodayLogs = async () => {
    if (!session) return;
    
    try {
      const { data: logsData, error: logsError } = await listTodayHabitLogsV2(session.user.id);
      if (logsError) {
        throw new Error(logsError.message);
      }
      setTodayLogs(logsData ?? []);
    } catch (err) {
      console.error('Error reloading today\'s logs:', err);
    }
  };

  // Helper to reload week logs (for times_per_week support)
  const reloadWeekLogs = async () => {
    if (!session || habits.length === 0) return;
    
    try {
      const habitIds = habits.map(h => h.id);
      const { data: weekLogsData, error: weekLogsError } = await listHabitLogsForWeekV2(
        session.user.id,
        habitIds
      );
      if (weekLogsError) {
        throw new Error(weekLogsError.message);
      }
      setWeekLogs(weekLogsData ?? []);
    } catch (err) {
      console.error('Error reloading week logs:', err);
    }
  };

  // Load adherence snapshots when toggled on
  const loadAdherenceData = async () => {
    if (!session || habits.length === 0) return;
    
    setAdherenceLoading(true);
    try {
      const snapshots = await buildAdherenceSnapshots(session.user.id, habits);
      setAdherenceSnapshots(snapshots);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime());
      startDate.setDate(startDate.getDate() - 29);
      const startISO = startDate.toISOString().split('T')[0];
      const endISO = endDate.toISOString().split('T')[0];
      const habitIds = habits.map((habit) => habit.id);

      const { data: rangeLogs, error: rangeLogsError } = await listHabitLogsForRangeMultiV2({
        userId: session.user.id,
        habitIds,
        startDate: startISO,
        endDate: endISO,
      });
      if (rangeLogsError) {
        throw new Error(rangeLogsError.message);
      }

      const nextStageMix: Record<string, { seed: number; minimum: number; standard: number; total: number }> = {};
      habitIds.forEach((habitId) => {
        nextStageMix[habitId] = { seed: 0, minimum: 0, standard: 0, total: 0 };
      });
      (rangeLogs ?? []).forEach((log) => {
        const stage = log.logged_stage;
        if (!stage || !nextStageMix[log.habit_id]) {
          return;
        }
        if (stage === 'seed' || stage === 'minimum' || stage === 'standard') {
          nextStageMix[log.habit_id][stage] += 1;
          nextStageMix[log.habit_id].total += 1;
        }
      });
      setStageMixByHabit(nextStageMix);

      const { minProgressStreak } = await getTelemetryDifficultyAdjustment(session.user.id);
      
      // Build performance suggestions for each habit based on adherence and streaks
      const suggestions: Record<string, HabitSuggestion> = {};
      for (const habit of habits) {
        const snapshot = snapshots.find(s => s.habitId === habit.id);
        if (!snapshot) continue;
        
        // Get streak data for this habit
        const streakData = streaks.find(s => s.habit_id === habit.id);
        
        // Classify the habit's performance
        // TODO: Implement previousStreak tracking for more accurate underperforming detection
        // Currently, we only use currentStreak since historical streak data is not stored
        const classificationResult = classifyHabit({
          adherence7: snapshot.window7.percentage,
          adherence30: snapshot.window30.percentage,
          currentStreak: streakData?.current_streak ?? 0,
          minProgressStreak,
        });
        
        // Build suggestion based on classification
        const suggestion = buildSuggestion(habit, classificationResult, snapshot);
        suggestions[habit.id] = suggestion;
        
        // Optionally enhance the rationale with AI (async, non-blocking)
        // Note: buildEnhancedRationale has internal caching, so repeated calls with same params are fast
        // Skip if we already have an enhanced rationale in state (from previous load)
        if (!enhancedRationales[habit.id]) {
          buildEnhancedRationale({
            classification: classificationResult.classification,
            adherence7: snapshot.window7.percentage,
            adherence30: snapshot.window30.percentage,
            streak: streakData?.current_streak ?? 0,
            preview: suggestion.previewChange,
            baselineRationale: classificationResult.rationale,
          }).then(result => {
            setEnhancedRationales(prev => ({ ...prev, [habit.id]: result }));
          }).catch(err => {
            console.warn('Error enhancing rationale:', err);
          });
        }
      }
      setPerformanceSuggestions(suggestions);
      
      // Also load revertable suggestions
      const revertable = await listRevertableSuggestions(session.user.id);
      setRevertableSuggestions(revertable);
    } catch (err) {
      console.error('Error loading adherence data:', err);
    } finally {
      setAdherenceLoading(false);
    }
  };

  // Handler for marking a habit as done
  const handleMarkHabitDone = async (habitId: string, type: HabitV2Row['type']) => {
    // Only handle boolean habits for now
    if (type !== 'boolean') {
      return;
    }

    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Mark habit as logging
    setLoggingHabitIds(prev => new Set(prev).add(habitId));
    setError(null);

    try {
      // Get habit to read done-ish config
      const habit = habits.find(h => h.id === habitId);
      const doneIshConfig = (habit?.done_ish_config as DoneIshConfig) ?? DEFAULT_DONEISH_CONFIG;

      // Build log payload with progress grading
      const logPayload = buildHabitLogPayload({
        habitType: 'boolean',
        target: null,
        value: null,
        done: true,
        wasSkipped: false,
        doneIshConfig,
      });

      // Create log entry for boolean habit
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habitId,
          ...logPayload,
        },
        session.user.id
      );

      if (logError) {
        throw new Error(logError.message);
      }

      if (!newLog) {
        throw new Error('Failed to log habit - no data returned');
      }

      // Reload today's logs and week logs to update the UI
      await Promise.all([reloadTodayLogs(), reloadWeekLogs()]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
      console.error('Error logging habit:', err);
    } finally {
      // Remove habit from logging state
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Handler for logging habit with a numeric value (quantity or duration)
  const handleLogHabitValue = async (habit: HabitV2Row, value: number) => {
    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Mark habit as logging
    setLoggingHabitIds(prev => new Set(prev).add(habit.id));
    setError(null);

    try {
      // Get done-ish config
      const doneIshConfig = (habit.done_ish_config as DoneIshConfig) ?? DEFAULT_DONEISH_CONFIG;

      // Build log payload with progress grading
      const logPayload = buildHabitLogPayload({
        habitType: habit.type,
        target: habit.target_num,
        value: value,
        done: false, // Will be calculated based on value vs target
        wasSkipped: false,
        doneIshConfig,
      });

      // Create log entry with the value
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habit.id,
          ...logPayload,
        },
        session.user.id
      );

      if (logError) {
        throw new Error(logError.message);
      }

      if (!newLog) {
        throw new Error('Failed to log habit - no data returned');
      }

      // Reload today's logs and week logs to update the UI
      await Promise.all([reloadTodayLogs(), reloadWeekLogs()]);
      
      // Clear the input value after successful log
      setHabitInputValues(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
      console.error('Error logging habit:', err);
    } finally {
      // Remove habit from logging state
      setLoggingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  };

  // Handler for initiating archive (shows confirmation dialog)
  const handleArchiveHabit = (habitId: string, habitTitle?: string) => {
    const habit = habits.find(h => h.id === habitId);
    setArchiveConfirmation({
      habitId,
      habitTitle: habitTitle || habit?.title || 'this habit',
    });
  };

  const handleLifecycleAction = async (
    habit: HabitV2Row,
    action: 'pause' | 'resume' | 'deactivate' | 'reactivate',
    options?: { reason?: string; resumeOn?: string },
  ) => {
    if (lifecycleUpdatingHabitIds.has(habit.id)) {
      return;
    }

    setLifecycleUpdatingHabitIds((prev) => new Set(prev).add(habit.id));
    setError(null);

    try {
      const actionResult = await (async () => {
        switch (action) {
          case 'pause':
            return pauseHabitV2(habit.id, {
              reason: options?.reason,
              resumeOn: options?.resumeOn || null,
            });
          case 'resume':
            return resumeHabitV2(habit.id);
          case 'deactivate':
            return deactivateHabitV2(habit.id, { reason: options?.reason });
          case 'reactivate':
            return reactivateHabitV2(habit.id);
        }
      })();

      if (actionResult.error || !actionResult.data) {
        throw new Error(actionResult.error?.message ?? 'Unable to update habit lifecycle.');
      }

      const updatedHabit = actionResult.data;
      setHabits((prev) => prev.map((entry) => (entry.id === habit.id ? updatedHabit : entry)));

      if (action === 'resume' || action === 'reactivate') {
        await scheduleHabitNotifications(habit.id, session.user.id);
      } else {
        await cancelHabitNotifications(habit.id);
      }

      const messageMap: Record<typeof action, string> = {
        pause: 'Habit paused.',
        resume: 'Habit resumed.',
        deactivate: 'Habit deactivated.',
        reactivate: 'Habit reactivated.',
      };
      setSuccessMessage(messageMap[action]);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update habit lifecycle.');
    } finally {
      setLifecycleUpdatingHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  };

  const handleOpenLifecycleDialog = (habit: HabitV2Row, action: 'pause' | 'deactivate') => {
    setLifecycleDialog({
      habitId: habit.id,
      habitTitle: habit.title,
      action,
    });
    setLifecycleReason('');
    setLifecycleResumeOn('');
  };

  const handleConfirmLifecycleDialog = async () => {
    if (!lifecycleDialog) {
      return;
    }

    const habit = habits.find((entry) => entry.id === lifecycleDialog.habitId);
    if (!habit) {
      setLifecycleDialog(null);
      return;
    }

    await handleLifecycleAction(habit, lifecycleDialog.action, {
      reason: lifecycleReason.trim() || undefined,
      resumeOn: lifecycleDialog.action === 'pause' ? lifecycleResumeOn || undefined : undefined,
    });
    setLifecycleDialog(null);
    setLifecycleReason('');
    setLifecycleResumeOn('');
  };

  const handleResumeReadyHabits = async () => {
    if (!resumeReadyHabits.length) {
      return;
    }

    for (const habit of resumeReadyHabits) {
      await handleLifecycleAction(habit, 'resume');
    }
  };

  // Handler for confirming the archive action
  const handleConfirmArchive = async () => {
    if (!archiveConfirmation) return;
    
    const { habitId } = archiveConfirmation;
    
    if (!session) {
      setError('Session expired. Please refresh the page.');
      setArchiveConfirmation(null);
      return;
    }

    // Mark habit as archiving
    setArchivingHabitIds(prev => new Set(prev).add(habitId));
    setError(null);
    setArchiveConfirmation(null);

    try {
      const { error: archiveError } = await archiveHabitV2(habitId);

      if (archiveError) {
        throw new Error(archiveError.message);
      }

      // Update local state to remove the archived habit from the list
      setHabits(prev => prev.filter(h => h.id !== habitId));
      setSuccessMessage('Habit archived successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive habit');
      console.error('Error archiving habit:', err);
    } finally {
      // Remove habit from archiving state
      setArchivingHabitIds(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  const handleAutoProgressShift = async (
    habit: HabitV2Row,
    targetTier: AutoProgressTier,
    shiftType: 'downshift' | 'upgrade',
  ) => {
    if (autoProgressHabitIds.has(habit.id)) {
      return;
    }

    const currentState = getAutoProgressState(habit);
    const todayISO = new Date().toISOString().split('T')[0];
    if (currentState.lastShiftAt && new Date(currentState.lastShiftAt).toISOString().split('T')[0] === todayISO) {
      setError(`"${habit.title}" already changed tier today. Try again tomorrow.`);
      return;
    }
    if (currentState.tier === targetTier) {
      setError(`"${habit.title}" is already on the ${AUTO_PROGRESS_TIERS[targetTier].label} tier.`);
      return;
    }

    setAutoProgressHabitIds((prev) => new Set(prev).add(habit.id));
    setError(null);

    try {
      const plan = buildAutoProgressPlan({ habit, targetTier, shiftType });
      const scheduleChanged = JSON.stringify(plan.schedule) !== JSON.stringify(habit.schedule);
      const targetChanged = plan.target !== habit.target_num;

      if (!scheduleChanged && !targetChanged) {
        throw new Error('This tier matches your current habit settings.');
      }

      const { data: updatedHabit, error: updateError } = await updateHabitFullV2(habit.id, {
        schedule: plan.schedule ?? habit.schedule,
        target_num: plan.target,
        autoprog: plan.state as Database['public']['Tables']['habits_v2']['Row']['autoprog'],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!updatedHabit) {
        throw new Error('Unable to update the habit tier.');
      }

      setHabits((prev) => prev.map((entry) => (entry.id === habit.id ? updatedHabit : entry)));
      const verb = shiftType === 'downshift' ? 'Downshifted' : 'Re-upgraded';
      setSuccessMessage(`${verb} "${habit.title}" to ${AUTO_PROGRESS_TIERS[targetTier].label}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the habit tier.');
    } finally {
      setAutoProgressHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habit.id);
        return next;
      });
    }
  };

  const renderHabitCard = (habit: HabitV2Row) => {
    const autoProgressState = getAutoProgressState(habit);
    const downshiftTier = getNextDownshiftTier(autoProgressState.tier);
    const upgradeTier = getNextUpgradeTier(autoProgressState.tier);
    const suggestion = performanceSuggestions[habit.id];
    const environmentPrompt = getHabitEnvironmentReviewPrompt(habit);
    const recommendedDownshift = downshiftTier && suggestion?.suggestedAction === 'ease';
    const canUpgrade = upgradeTier && suggestion?.suggestedAction === 'progress';
    const isUpdatingAutoProgress = autoProgressHabitIds.has(habit.id);
    const lifecycleStatus = getHabitLifecycleStatus(habit);
    const isLifecycleUpdating = lifecycleUpdatingHabitIds.has(habit.id);
    const readyToResume = isHabitReadyToResume(habit);

    return (
      <div
        key={habit.id}
        className="habit-card"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          position: 'relative',
        }}
      >
        {!habit.archived && (
          <div
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              display: 'flex',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => handleEditHabit(habit)}
              className="action-btn"
              aria-label={`Edit habit: ${habit.title}`}
              title="Edit habit"
              style={{
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                transition: 'all 0.2s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleArchiveHabit(habit.id, habit.title)}
              disabled={archivingHabitIds.has(habit.id)}
              className="action-btn archive"
              aria-label={`Archive habit: ${habit.title}`}
              title="Archive habit"
              style={{
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '0.375rem',
                cursor: archivingHabitIds.has(habit.id) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: archivingHabitIds.has(habit.id) ? '#94a3b8' : '#64748b',
                opacity: archivingHabitIds.has(habit.id) ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', paddingRight: '4.5rem' }}>
          {habit.emoji && <span style={{ fontSize: '1.5rem' }}>{habit.emoji}</span>}
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {habit.title}
          </h3>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              color: lifecycleStatus === 'active' ? '#166534' : lifecycleStatus === 'paused' ? '#92400e' : '#475569',
              background: lifecycleStatus === 'active' ? '#dcfce7' : lifecycleStatus === 'paused' ? '#fef3c7' : '#e2e8f0',
              borderRadius: '999px',
              padding: '0.2rem 0.5rem',
            }}
          >
            {lifecycleStatus.replace('_', ' ')}
          </span>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div>
            <strong>Type:</strong> {habit.type}
            {habit.type !== 'boolean' && habit.target_num !== null && (
              <span> • Target: {habit.target_num} {habit.target_unit || ''}</span>
            )}
          </div>
          <div>
            <strong>Schedule:</strong> {(() => {
              const schedule = parseSchedule(habit.schedule);
              if (!schedule || !schedule.mode) return 'Custom';
              if (schedule.mode === 'daily') return 'Every day';
              if (schedule.mode === 'specific_days') {
                return `Specific days (${schedule.days?.length || 0} days/week)`;
              }
              if (schedule.mode === 'times_per_week') {
                return `${schedule.timesPerWeek || 0} times per week`;
              }
              if (schedule.mode === 'every_n_days') {
                const nextDue = getEveryNDaysNextDue(schedule, habit.created_at);
                return `Every ${schedule.intervalDays || '?'} days${nextDue ? ` • Next due ${nextDue.toLocaleDateString()}` : ''}`;
              }
              return 'Custom';
            })()}
          </div>
          {lifecycleStatus === 'paused' && habit.resume_on ? (
            <div><strong>Resume on:</strong> {new Date(habit.resume_on).toLocaleDateString()}</div>
          ) : null}
          {lifecycleStatus === 'paused' && habit.paused_reason ? (
            <div><strong>Pause reason:</strong> {habit.paused_reason}</div>
          ) : null}
          {lifecycleStatus === 'deactivated' && habit.deactivated_reason ? (
            <div><strong>Why deactivated:</strong> {habit.deactivated_reason}</div>
          ) : null}
          {lifecycleStatus === 'deactivated' && habit.deactivated_at ? (
            <div><strong>Deactivated:</strong> {new Date(habit.deactivated_at).toLocaleDateString()}</div>
          ) : null}
          {readyToResume ? (
            <div style={{ color: '#166534', fontWeight: 600 }}>
              Ready to resume today.
            </div>
          ) : null}
          <div style={{ marginTop: '0.25rem', color: environmentPrompt.tone }}>
            <strong>{environmentPrompt.title}:</strong> {environmentPrompt.detail}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
          {lifecycleStatus === 'active' ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenLifecycleDialog(habit, 'pause')}
                disabled={isLifecycleUpdating}
                style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.45rem 0.75rem', background: 'white', cursor: isLifecycleUpdating ? 'not-allowed' : 'pointer' }}
              >
                {isLifecycleUpdating ? 'Updating…' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenLifecycleDialog(habit, 'deactivate')}
                disabled={isLifecycleUpdating}
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.45rem 0.75rem', background: '#f8fafc', cursor: isLifecycleUpdating ? 'not-allowed' : 'pointer' }}
              >
                Deactivate
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleLifecycleAction(habit, lifecycleStatus === 'paused' ? 'resume' : 'reactivate')}
              disabled={isLifecycleUpdating}
              style={{ border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.45rem 0.75rem', background: '#eff6ff', color: '#1d4ed8', cursor: isLifecycleUpdating ? 'not-allowed' : 'pointer' }}
            >
              {isLifecycleUpdating ? 'Updating…' : lifecycleStatus === 'paused' ? (readyToResume ? 'Resume today' : 'Resume') : 'Reactivate'}
            </button>
          )}
          {recommendedDownshift && (
            <button
              type="button"
              onClick={() => void handleAutoProgressShift(habit, downshiftTier, 'downshift')}
              disabled={isUpdatingAutoProgress}
              style={{ border: '1px solid #f59e0b', borderRadius: '6px', padding: '0.45rem 0.75rem', background: '#fffbeb', color: '#92400e', cursor: isUpdatingAutoProgress ? 'not-allowed' : 'pointer' }}
            >
              {isUpdatingAutoProgress ? 'Adjusting…' : `Ease to ${AUTO_PROGRESS_TIERS[downshiftTier].label}`}
            </button>
          )}
          {canUpgrade && (
            <button
              type="button"
              onClick={() => void handleAutoProgressShift(habit, upgradeTier, 'upgrade')}
              disabled={isUpdatingAutoProgress}
              style={{ border: '1px solid #10b981', borderRadius: '6px', padding: '0.45rem 0.75rem', background: '#ecfdf5', color: '#047857', cursor: isUpdatingAutoProgress ? 'not-allowed' : 'pointer' }}
            >
              {isUpdatingAutoProgress ? 'Adjusting…' : `Upgrade to ${AUTO_PROGRESS_TIERS[upgradeTier].label}`}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Handler for editing a habit (opens wizard with pre-filled data)
  const handleEditHabit = (habit: HabitV2Row) => {
    const autoProgressState = getAutoProgressState(habit);
    const scalePlan = autoProgressState.scale_plan;

    // Build HabitWizardDraft from HabitV2Row
    const draft: HabitWizardDraft = {
      habitId: habit.id,
      title: habit.title,
      emoji: habit.emoji,
      type: habit.type,
      targetValue: habit.target_num,
      targetUnit: habit.target_unit,
      schedule: {
        choice: mapScheduleToChoice(habit.schedule),
      },
      remindersEnabled: false,
      reminderTimes: [],
      habitEnvironment: habit.habit_environment ?? undefined,
      environmentContext: normalizeEnvironmentContext(habit.environment_context ?? null, {
        fallbackText: habit.habit_environment ?? undefined,
      }),
      environmentScore: habit.environment_score ?? null,
      environmentRiskTags: habit.environment_risk_tags ?? [],
      doneIshThreshold:
        habit.type === 'quantity'
          ? ((habit.done_ish_config as DoneIshConfig | null)?.quantityThresholdPercent ?? 80)
          : habit.type === 'duration'
            ? ((habit.done_ish_config as DoneIshConfig | null)?.durationThresholdPercent ?? 80)
            : 80,
      booleanPartialEnabled: ((habit.done_ish_config as DoneIshConfig | null)?.booleanPartialEnabled ?? true),
      scalePlanEnabled: scalePlan?.enabled ?? true,
      stageLabels: {
        seed: scalePlan?.stages.seed.label ?? 'Quick fallback',
        minimum: scalePlan?.stages.minimum.label ?? 'Smaller version',
        standard: scalePlan?.stages.standard.label ?? 'Full version',
      },
      stageCompletionPercents: {
        seed: scalePlan?.stages.seed.completionPercent ?? 50,
        minimum: scalePlan?.stages.minimum.completionPercent ?? 75,
        standard: scalePlan?.stages.standard.completionPercent ?? 100,
      },
    };
    
    setWizardInitialDraft(draft);
    setShowWizard(true);
  };

  // Helper to map schedule JSON to wizard choice
  const mapScheduleToChoice = (schedule: unknown): 'every_day' | 'specific_days' | 'x_per_week' => {
    if (typeof schedule !== 'object' || schedule === null) return 'every_day';
    const mode = (schedule as Record<string, unknown>).mode;
    if (typeof mode !== 'string') return 'every_day';
    switch (mode) {
      case 'daily':
        return 'every_day';
      case 'specific_days':
        return 'specific_days';
      case 'times_per_week':
        return 'x_per_week';
      case 'every_n_days':
        return 'every_day';
      default:
        return 'every_day';
    }
  };

  // Handler for wizard completion
  const handleCompleteDraft = async (draft: HabitWizardDraft) => {
    console.log('Habit draft', draft);
    setPendingHabitDraft(draft);
    
    // Clear any previous messages
    setError(null);
    setSuccessMessage(null);
    
    const isEditMode = Boolean(draft.habitId);
    
    try {
      if (isEditMode && draft.habitId) {
        const existingHabit = habits.find((h) => h.id === draft.habitId);
        const existingAutoprog = existingHabit ? getAutoProgressState(existingHabit) : null;

        // Update existing habit
        const doneIshConfig = {
          booleanPartialEnabled: draft.booleanPartialEnabled ?? true,
          quantityThresholdPercent: draft.type === 'quantity' ? draft.doneIshThreshold : 80,
          durationThresholdPercent: draft.type === 'duration' ? draft.doneIshThreshold : 80,
        };

        const updatePayload = {
          title: draft.title,
          emoji: draft.emoji,
          type: draft.type,
          target_num: draft.targetValue ?? null,
          target_unit: draft.targetUnit ?? null,
          schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Row']['schedule'],
          habit_environment: draft.habitEnvironment ?? null,
          environment_context: environmentContextToJson(draft.environmentContext ?? null),
          environment_score: draft.environmentScore ?? null,
          environment_risk_tags: draft.environmentRiskTags ?? [],
          done_ish_config: doneIshConfig as unknown as Database['public']['Tables']['habits_v2']['Row']['done_ish_config'],
          autoprog: {
            ...(existingAutoprog ?? buildDefaultAutoProgressState({
              schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Row']['schedule'],
              target: draft.targetValue ?? null,
            })),
            scale_plan: {
              enabled: draft.scalePlanEnabled ?? true,
              stages: {
                seed: {
                  label: draft.stageLabels?.seed ?? 'Quick fallback',
                  completionPercent: draft.stageCompletionPercents?.seed ?? 50,
                },
                minimum: {
                  label: draft.stageLabels?.minimum ?? 'Smaller version',
                  completionPercent: draft.stageCompletionPercents?.minimum ?? 75,
                },
                standard: {
                  label: draft.stageLabels?.standard ?? 'Full version',
                  completionPercent: draft.stageCompletionPercents?.standard ?? 100,
                },
              },
            },
          } as unknown as Database['public']['Tables']['habits_v2']['Row']['autoprog'],
        };
        
        const { data: updatedHabit, error: updateError } = await updateHabitFullV2(draft.habitId, updatePayload);
        
        if (updateError) {
          throw new Error(updateError.message);
        }
        
        if (!updatedHabit) {
          throw new Error('Failed to update habit - no data returned');
        }
        
        // Fire telemetry event if habit environment was updated
        if (draft.habitEnvironment && session?.user?.id) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'habit_environment_updated',
            metadata: {
              habitId: draft.habitId,
              environment: draft.habitEnvironment,
            },
          });
        }
        
        // Success: hide wizard, clear draft, update list
        setShowWizard(false);
        setPendingHabitDraft(null);
        setWizardInitialDraft(undefined);
        setSuccessMessage('Habit saved successfully!');
        
        // Update the habit in local state
        setHabits(prev => prev.map(h => h.id === draft.habitId ? updatedHabit : h));
        
      } else {
        // Create new habit
        const doneIshConfig = {
          booleanPartialEnabled: draft.booleanPartialEnabled ?? true,
          quantityThresholdPercent: draft.type === 'quantity' ? draft.doneIshThreshold : 80,
          durationThresholdPercent: draft.type === 'duration' ? draft.doneIshThreshold : 80,
        };

        const insertPayload: Omit<Database['public']['Tables']['habits_v2']['Insert'], 'user_id'> = {
          title: draft.title,
          emoji: draft.emoji,
          type: draft.type,
          target_num: draft.targetValue ?? null,
          target_unit: draft.targetUnit ?? null,
          schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Insert']['schedule'],
          habit_environment: draft.habitEnvironment ?? null,
          environment_context: environmentContextToJson(draft.environmentContext ?? null),
          environment_score: draft.environmentScore ?? null,
          environment_risk_tags: draft.environmentRiskTags ?? [],
          done_ish_config: doneIshConfig as unknown as Database['public']['Tables']['habits_v2']['Insert']['done_ish_config'],
          autoprog: buildDefaultAutoProgressState({
            schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Insert']['schedule'],
            target: draft.targetValue ?? null,
          }) as Database['public']['Tables']['habits_v2']['Insert']['autoprog'],
          archived: false,
        };

        insertPayload.autoprog = {
          ...(insertPayload.autoprog as Record<string, unknown>),
          scale_plan: {
            enabled: draft.scalePlanEnabled ?? true,
            stages: {
              seed: {
                label: draft.stageLabels?.seed ?? 'Quick fallback',
                completionPercent: draft.stageCompletionPercents?.seed ?? 50,
              },
              minimum: {
                label: draft.stageLabels?.minimum ?? 'Smaller version',
                completionPercent: draft.stageCompletionPercents?.minimum ?? 75,
              },
              standard: {
                label: draft.stageLabels?.standard ?? 'Full version',
                completionPercent: draft.stageCompletionPercents?.standard ?? 100,
              },
            },
          },
        } as Database['public']['Tables']['habits_v2']['Insert']['autoprog'];
        
        const { data: newHabit, error: createError } = await createHabitV2(insertPayload, session.user.id);
        
        if (createError) {
          throw new Error(createError.message);
        }
        
        if (!newHabit) {
          throw new Error('Failed to create habit - no data returned');
        }
        
        // Fire telemetry event if habit environment was set
        if (draft.habitEnvironment && session?.user?.id) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'habit_environment_set',
            metadata: {
              habitId: newHabit.id,
              environment: draft.habitEnvironment,
            },
          });
        }
        
        // Success: hide wizard, clear draft, refresh list
        setShowWizard(false);
        setPendingHabitDraft(null);
        setWizardInitialDraft(undefined);
        setSuccessMessage(`Habit "${draft.title}" created successfully!`);
        
        // Prepend new habit to local state for immediate feedback
        setHabits([newHabit, ...habits]);
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      // Show error but keep wizard open
      const action = isEditMode ? 'update' : 'create';
      setError(err instanceof Error ? err.message : `Failed to ${action} habit`);
      console.error(`Error ${action}ing habit:`, err);
    }
  };

  // Handler for wizard cancel
  const handleCancelWizard = () => {
    setShowWizard(false);
    setWizardInitialDraft(undefined);
  };

  // Handler for applying a suggestion to a habit
  const handleApplySuggestion = async (habitId: string, suggestion: HabitSuggestion) => {
    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Find the habit
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      setError('Habit not found.');
      return;
    }

    // Mark as applying
    setApplyingSuggestionIds(prev => new Set(prev).add(habitId));
    setError(null);

    try {
      const result = await saveAndApplySuggestion({
        habit,
        suggestion,
        userId: session.user.id,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to apply suggestion');
      }

      // Update local habits state with the updated habit
      if (result.updatedHabit) {
        const updatedHabit = result.updatedHabit;
        setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
      }

      // Mark suggestion as applied
      setAppliedSuggestionHabitIds(prev => new Set(prev).add(habitId));

      // Show success toast
      setSuccessMessage(`Suggestion applied to "${habit.title}"!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload revertable suggestions after successful apply
      const revertable = await listRevertableSuggestions(session.user.id);
      setRevertableSuggestions(revertable);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestion');
      console.error('Error applying suggestion:', err);
    } finally {
      // Remove from applying state
      setApplyingSuggestionIds(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // Handler for reverting a suggestion
  const handleRevertSuggestion = async (suggestionId: string, rationale?: string) => {
    if (!session) {
      setError('Session expired. Please refresh the page.');
      return;
    }

    // Mark as reverting
    setRevertingSuggestionIds(prev => new Set(prev).add(suggestionId));
    setError(null);

    try {
      const result = await revertSuggestionForHabit({
        suggestionId,
        userId: session.user.id,
        rationale,
      });

      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to revert suggestion');
      }

      // Update local habits state with the restored habit
      if (result.updatedHabit) {
        const updatedHabit = result.updatedHabit;
        setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
      }

      // Mark suggestion as reverted
      setRevertedSuggestionIds(prev => new Set(prev).add(suggestionId));

      // Find the habit title for the toast
      const revertedSuggestion = revertableSuggestions.find(s => s.id === suggestionId);
      const habit = habits.find(h => h.id === revertedSuggestion?.habit_id);
      const habitTitle = habit?.title ?? 'habit';

      // Show success toast
      setSuccessMessage(`Successfully reverted changes to "${habitTitle}"!`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reload revertable suggestions
      const revertable = await listRevertableSuggestions(session.user.id);
      setRevertableSuggestions(revertable);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert suggestion');
      console.error('Error reverting suggestion:', err);
    } finally {
      // Remove from reverting state
      setRevertingSuggestionIds(prev => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
      // Close the confirmation dialog
      setRevertConfirmation(null);
      setRevertRationale('');
    }
  };

  // Helper to map template schedule to ScheduleDraft choice
  const mapTemplateScheduleToChoice = (schedule: HabitTemplate['schedule']): 'every_day' | 'specific_days' | 'x_per_week' => {
    switch (schedule.mode) {
      case 'daily':
        return 'every_day';
      case 'specific_days':
        return 'specific_days';
      case 'times_per_week':
        return 'x_per_week';
      case 'every_n_days':
        // Map every_n_days to every_day for now (simplified)
        return 'every_day';
      default:
        return 'every_day';
    }
  };

  // Handler for template click
  const handleTemplateClick = (template: HabitTemplate) => {
    // Map template to HabitWizardDraft
    const draft: HabitWizardDraft = {
      title: template.title,
      emoji: template.emoji ? template.emoji : null,
      type: template.type,
      targetValue: template.target_num ?? null,
      targetUnit: template.target_unit ?? null,
      schedule: {
        choice: mapTemplateScheduleToChoice(template.schedule)
      },
      remindersEnabled: (template.reminders && template.reminders.length > 0) || false,
      reminderTimes: template.reminders || []
    };

    // Set the initial draft and open wizard
    setWizardInitialDraft(draft);
    setShowWizard(true);
  };

  if (isMobileLayout) {
    return (
      <div className="habits-module-container habits-module-container--mobile">
        <div className="habits-module-hero">
          <h1 className="habits-module-hero__title">Habits</h1>
          <p className="habits-module-hero__subtitle">A focused mobile flow for creating, improving, and coaching habits.</p>
        </div>

        <div className="habits-mobile-nav" role="tablist" aria-label="Habits mobile sections">
          <button type="button" className={`habits-mobile-nav__button ${mobileHabitPanel === 'menu' ? 'is-active' : ''}`} onClick={() => setMobileHabitPanel('menu')}>Overview</button>
          <button type="button" className={`habits-mobile-nav__button ${mobileHabitPanel === 'create' ? 'is-active' : ''}`} onClick={() => setMobileHabitPanel('create')}>Add / Create</button>
          <button type="button" className={`habits-mobile-nav__button ${mobileHabitPanel === 'manage' ? 'is-active' : ''}`} onClick={() => setMobileHabitPanel('manage')}>Improve Existing</button>
          <button type="button" className={`habits-mobile-nav__button ${mobileHabitPanel === 'coach' ? 'is-active' : ''}`} onClick={() => setMobileHabitPanel('coach')}>Guided Coaching</button>
        </div>

        {mobileHabitPanel === 'menu' && (
          <div className="habits-module-card habits-mobile-card">
            <h2>Choose what to do</h2>
            <p>Use the tabs above to create a new habit, adjust existing habits with a clean list, or review coaching suggestions.</p>
          </div>
        )}

        {mobileHabitPanel === 'create' && !showWizard && (
          <div className="habits-module-card habits-mobile-card">
            <div className="habits-mobile-card__header">
              <h2>Create habits</h2>
              <button
                onClick={() => {
                  setWizardInitialDraft(undefined);
                  setShowWizard(true);
                }}
                className="habits-mobile-card__cta"
              >
                + New habit
              </button>
            </div>
            <div className="habits-mobile-template-list">
              {templates.slice(0, 8).map((template) => (
                <button key={`${template.emoji}-${template.title}`} type="button" className="habits-mobile-template-list__item" onClick={() => handleTemplateClick(template)}>
                  <span>{template.emoji}</span>
                  <span>{template.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mobileHabitPanel === 'manage' && (
          <div className="habits-module-card habits-mobile-card">
            <h2>Habit list</h2>
            <ul className="habits-mobile-list">
              {habits.map((habit) => {
                const isDone = todayLogs.some((log) => log.habit_id === habit.id);
                const environmentPrompt = getHabitEnvironmentReviewPrompt(habit);
                return (
                  <li key={habit.id} className="habits-mobile-list__item">
                    <div className="habits-mobile-list__line">
                      <span className="habits-mobile-list__title">{habit.emoji ? `${habit.emoji} ` : ''}{habit.title}</span>
                      <span className="habits-mobile-list__status">{isDone ? 'Done' : 'Pending'}</span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: environmentPrompt.tone }}>
                      {environmentPrompt.title}
                    </p>
                    <div className="habits-mobile-list__actions">
                      <button type="button" onClick={() => handleEditHabit(habit)}>Edit</button>
                      {!isDone ? <button type="button" onClick={() => handleMarkHabitDone(habit.id, habit.type)}>Log</button> : null}
                      <button type="button" onClick={() => handleArchiveHabit(habit.id)}>Archive</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {mobileHabitPanel === 'coach' && (
          <div className="habits-module-card habits-mobile-card">
            <h2>Guided coaching</h2>
            <p>Review the latest AI-guided improvement notes for each habit and tune difficulty as needed.</p>
            <button type="button" className="habits-mobile-card__cta" onClick={() => setShowAdherence((current) => !current)}>
              {showAdherence ? 'Hide adherence insights' : 'Show adherence insights'}
            </button>
            <ul className="habits-mobile-coach-list">
              {habits.slice(0, 10).map((habit) => {
                const suggestion = performanceSuggestions[habit.id];
                return (
                  <li key={habit.id}>
                    <strong>{habit.title}</strong>
                    <p>{suggestion?.rationale || 'Keep logging this habit to unlock coaching suggestions.'}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {showWizard && (
          <HabitWizard
            onCancel={handleCancelWizard}
            onCompleteDraft={handleCompleteDraft}
            initialDraft={wizardInitialDraft}
          />
        )}

        {showAdherence && <HabitsInsights session={session} habits={habits} />}
      </div>
    );
  }

  return (
    <div className="habits-module-container">
      <div className="habits-module-hero">
        <h1 className="habits-module-hero__title">Habits</h1>
        <p className="habits-module-hero__subtitle">
          Create and track habits that support your goals.
        </p>
      </div>

      <div className="habits-module-devnotes">
        <button
          onClick={() => setShowDevNotes(!showDevNotes)}
          className="habits-module-devnotes__toggle"
        >
          <span>{showDevNotes ? '▼' : '▶'}</span>
          Developer setup notes (Supabase & Edge functions)
        </button>
        
        {showDevNotes && (
          <div className="habits-module-devnotes__content">
            <ul>
              <li>SQL migrations for <code>habits_v2</code>, <code>habit_logs_v2</code>, <code>habit_reminders</code>, and related tables exist under <code>/supabase/migrations/</code></li>
              <li>Edge Functions live under <code>/supabase/functions/</code></li>
              <li>More details are in <code>/HABITS_SETUP_GUIDE.md</code></li>
            </ul>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div 
          role="alert"
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#991b1b'
          }}
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div 
          role="status"
          aria-live="polite"
          style={{
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#065f46'
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Streaks Section */}
      <div
        className="habits-module-card"
        style={{
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Streaks</h2>

        {streaksLoading ? (
          <p style={{ color: '#64748b', margin: 0 }}>Loading streaks…</p>
        ) : streaksError ? (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.875rem',
            color: '#991b1b'
          }}>
            {streaksError}
          </div>
        ) : streaks.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            Start logging habits to see streaks here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {streaks.map((streak) => {
              // Find the corresponding habit
              const habit = habits.find(h => h.id === streak.habit_id);
              if (!habit) return null;

              return (
                <div
                  key={streak.habit_id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {habit.emoji && (
                      <span style={{ fontSize: '1.25rem' }}>{habit.emoji}</span>
                    )}
                    <div style={{ fontWeight: 500 }}>{habit.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>🔥</span>
                      <span style={{ color: '#64748b' }}>Current:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{streak.current_streak} days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>⭐</span>
                      <span style={{ color: '#64748b' }}>Best:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{streak.best_streak} days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates Gallery */}
      {!showWizard && (
        <div
          className="habits-module-card"
          style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div
            className="habits-module-card__header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Templates</h2>
            <button
              onClick={() => {
                setWizardInitialDraft(undefined);
                setShowWizard(true);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>+</span>
              New habit
            </button>
          </div>

          {templatesLoading && (
            <p style={{ color: '#64748b', margin: 0 }}>Loading templates…</p>
          )}

          {templatesError && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
              {templatesError}
            </p>
          )}

          {!templatesLoading && !templatesError && templates.length > 0 && (
            <div
              className="habits-module-templates-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {templates.map((template) => {
                // Generate a short schedule description
                let scheduleDesc = '';
                if (template.schedule.mode === 'daily') {
                  scheduleDesc = 'Daily';
                } else if (template.schedule.mode === 'specific_days') {
                  scheduleDesc = `${template.schedule.days?.length || 0} days/week`;
                } else if (template.schedule.mode === 'times_per_week') {
                  scheduleDesc = `${template.schedule.value || 0}x/week`;
                } else if (template.schedule.mode === 'every_n_days') {
                  scheduleDesc = `Every ${template.schedule.value || 0} days`;
                }

                // Use a unique key combining title and emoji
                const templateKey = `${template.emoji}-${template.title}`;

                return (
                  <button
                    key={templateKey}
                    onClick={() => handleTemplateClick(template)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
                      {template.emoji}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {template.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {template.type} • {scheduleDesc}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!templatesLoading && !templatesError && templates.length === 0 && (
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              No templates available.
            </p>
          )}
        </div>
      )}

      {/* Habit Wizard */}
      {showWizard && (
        <HabitWizard 
          onCancel={handleCancelWizard}
          onCompleteDraft={handleCompleteDraft}
          initialDraft={wizardInitialDraft}
        />
      )}

      {/* Debug: Show pending draft */}
      {pendingHabitDraft && !showWizard && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          fontSize: '0.875rem'
        }}>
          <strong>Draft created:</strong> {pendingHabitDraft.title} ({pendingHabitDraft.type})
        </div>
      )}

      {/* Two-column layout: Your habits | Today's checklist */}
      <div
        className="habits-module-columns"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {/* Left column: Your habits */}
        <div
          className="habits-module-card"
          style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '2rem',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Your habits</h2>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', margin: 0 }}>Loading habits…</p>
          ) : habits.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No habits yet. Create your first habit to get started!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Active habits ({activeHabits.length})</h3>
                {activeHabits.length === 0 ? (
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
                    No active habits right now.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeHabits.map(renderHabitCard)}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Inactive habits ({inactiveHabits.length})</h3>
                {resumeReadyHabits.length > 0 ? (
                  <div
                    style={{
                      border: '1px solid #86efac',
                      background: '#f0fdf4',
                      borderRadius: '10px',
                      padding: '0.9rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.2rem' }}>
                        {resumeReadyHabits.length} habit{resumeReadyHabits.length === 1 ? '' : 's'} ready to resume
                      </div>
                      <div style={{ color: '#166534', fontSize: '0.875rem' }}>
                        {resumeReadyHabits.map((habit) => habit.title).join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleResumeReadyHabits()}
                      disabled={resumeReadyHabits.some((habit) => lifecycleUpdatingHabitIds.has(habit.id))}
                      style={{
                        border: 'none',
                        borderRadius: '8px',
                        background: '#16a34a',
                        color: 'white',
                        padding: '0.6rem 0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Resume all due today
                    </button>
                  </div>
                ) : null}
                {inactiveHabits.length === 0 ? (
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
                    No paused or deactivated habits.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {inactiveHabits.map(renderHabitCard)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Today's checklist */}
        <div style={{
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Today's checklist</h2>

          {loading ? (
            <p style={{ color: '#64748b', margin: 0 }}>Loading today's status…</p>
          ) : todaysHabits.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>
              No habits to check today.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todaysHabits.map((habit) => {
                // Find log for this habit
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                const isDone = log?.done ?? false;
                const logValue = log?.value;
                const isLogging = loggingHabitIds.has(habit.id);
                const inputValue = habitInputValues[habit.id] || '';
                
                // Parse schedule for badge display
                const schedule = parseSchedule(habit.schedule);
                const habitWeekLogs = weekLogs.filter(l => l.habit_id === habit.id);
                
                // Get times_per_week progress if applicable
                let weekProgress: { completed: number; target: number } | null = null;
                if (schedule?.mode === 'times_per_week' && schedule.timesPerWeek) {
                  const progress = getTimesPerWeekProgress(schedule, habitWeekLogs);
                  weekProgress = { completed: progress.completed, target: progress.target };
                }
                
                // Get every_n_days next due date if applicable
                let nextDueLabel: string | null = null;
                if (schedule?.mode === 'every_n_days') {
                  const nextDue = getEveryNDaysNextDue(schedule, habit.created_at);
                  if (nextDue) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) {
                      nextDueLabel = 'Due today';
                    } else if (diffDays === 1) {
                      nextDueLabel = 'Due tomorrow';
                    } else if (diffDays > 0) {
                      nextDueLabel = `Due in ${diffDays} days`;
                    }
                  }
                }

                return (
                  <div
                    key={habit.id}
                    style={{
                      background: isDone ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      {habit.emoji && (
                        <span style={{ fontSize: '1.25rem' }}>{habit.emoji}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500 }}>{habit.title}</span>
                          {/* Badge for times_per_week progress */}
                          {weekProgress && (
                            <span style={{
                              fontSize: '0.625rem',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}>
                              {weekProgress.completed}/{weekProgress.target} this week
                            </span>
                          )}
                          {/* Badge for every_n_days */}
                          {nextDueLabel && (
                            <span style={{
                              fontSize: '0.625rem',
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}>
                              {nextDueLabel}
                            </span>
                          )}
                        </div>
                        {!isDone && habit.type !== 'boolean' && habit.target_num && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Target: {habit.target_num} {habit.target_unit || 'units'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {onNavigateToTimer && !isDone ? (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToTimer({
                              sourceType: 'habit',
                              sourceId: habit.id,
                              sourceName: habit.title,
                            })
                          }
                          title="Start timer for habit"
                          aria-label={`Start timer for habit: ${habit.title}`}
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            border: '1px solid #c7d2fe',
                            background: '#eef2ff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.95rem',
                          }}
                        >
                          ⏱️
                        </button>
                      ) : null}
                      {isDone ? (
                        <div style={{ 
                          fontSize: '0.875rem',
                          color: '#15803d',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          Done
                          {logValue !== null && logValue !== undefined && habit.type !== 'boolean' && (
                            <span> – {logValue} {habit.target_unit || 'units'}</span>
                          )}
                        </div>
                      ) : (
                        <>
                          {habit.type === 'boolean' ? (
                            <button
                              onClick={() => handleMarkHabitDone(habit.id, habit.type)}
                              disabled={isLogging}
                              style={{
                                padding: '0.5rem 1rem',
                                background: isLogging ? '#94a3b8' : '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: isLogging ? 'not-allowed' : 'pointer',
                                opacity: isLogging ? 0.7 : 1,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isLogging ? 'Saving…' : 'Mark done'}
                            </button>
                          ) : habit.type === 'quantity' ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inputValue}
                                onChange={(e) => setHabitInputValues(prev => ({ ...prev, [habit.id]: e.target.value }))}
                                placeholder="0"
                                disabled={isLogging}
                                style={{
                                  width: '70px',
                                  padding: '0.5rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                onClick={() => {
                                  const value = parseFloat(inputValue);
                                  if (!isNaN(value) && value > 0) {
                                    handleLogHabitValue(habit, value);
                                  }
                                }}
                                disabled={isLogging || !inputValue || parseFloat(inputValue) <= 0}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? '#94a3b8' : '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 'not-allowed' : 'pointer',
                                  opacity: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 0.7 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isLogging ? 'Saving…' : 'Log'}
                              </button>
                            </>
                          ) : habit.type === 'duration' ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={inputValue}
                                onChange={(e) => setHabitInputValues(prev => ({ ...prev, [habit.id]: e.target.value }))}
                                placeholder="0"
                                disabled={isLogging}
                                style={{
                                  width: '70px',
                                  padding: '0.5rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  textAlign: 'center'
                                }}
                              />
                              <button
                                onClick={() => {
                                  const value = parseFloat(inputValue);
                                  if (!isNaN(value) && value > 0) {
                                    handleLogHabitValue(habit, value);
                                  }
                                }}
                                disabled={isLogging || !inputValue || parseFloat(inputValue) <= 0}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? '#94a3b8' : '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 'not-allowed' : 'pointer',
                                  opacity: isLogging || !inputValue || parseFloat(inputValue) <= 0 ? 0.7 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isLogging ? 'Saving…' : 'Log min'}
                              </button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Adherence Snapshot Section (Optional) */}
      <div style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Adherence</h2>
          <button
            onClick={() => {
              if (!showAdherence) {
                loadAdherenceData();
              }
              setShowAdherence(!showAdherence);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: showAdherence ? '#64748b' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showAdherence ? 'Hide' : 'Show 7d/30d metrics'}
          </button>
        </div>

        {showAdherence && (
          <>
            {adherenceLoading ? (
              <p style={{ color: '#64748b', margin: 0 }}>Loading adherence data…</p>
            ) : adherenceSnapshots.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
                No habits to analyze. Create habits and log progress to see adherence metrics.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 600 }}>Habit</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 600 }}>7-day</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 600 }}>30-day</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 600 }}>Stage mix</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontWeight: 600 }}>Suggestion</th>
                      {SUGGESTIONS_ENABLED && (
                        <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 600 }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {adherenceSnapshots.map((snapshot) => {
                      const habit = habits.find(h => h.id === snapshot.habitId);
                      const suggestion = performanceSuggestions[snapshot.habitId];
                      const isApplying = applyingSuggestionIds.has(snapshot.habitId);
                      const isApplied = appliedSuggestionHabitIds.has(snapshot.habitId);
                      const canApply = SUGGESTIONS_ENABLED && suggestion?.previewChange && !isApplied;
                      const stageMix = stageMixByHabit[snapshot.habitId] ?? { seed: 0, minimum: 0, standard: 0, total: 0 };
                      
                      // Determine suggestion badge colors
                      const getSuggestionBadgeStyle = (action: string) => {
                        switch (action) {
                          case 'ease':
                            return { background: '#fef3c7', color: '#92400e' };
                          case 'progress':
                            return { background: '#dbeafe', color: '#1e40af' };
                          case 'maintain':
                            return { background: '#dcfce7', color: '#166534' };
                          default:
                            return { background: '#f1f5f9', color: '#475569' };
                        }
                      };
                      
                      return (
                        <tr key={snapshot.habitId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {habit?.emoji && <span>{habit.emoji}</span>}
                              <span>{snapshot.habitTitle}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: snapshot.window7.percentage >= 80 ? '#dcfce7' : 
                                         snapshot.window7.percentage >= 50 ? '#fef9c3' : '#fee2e2',
                              color: snapshot.window7.percentage >= 80 ? '#166534' : 
                                    snapshot.window7.percentage >= 50 ? '#854d0e' : '#991b1b',
                            }}>
                              {snapshot.window7.percentage}%
                            </span>
                            <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.125rem' }}>
                              {snapshot.window7.completedCount}/{snapshot.window7.scheduledCount}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: snapshot.window30.percentage >= 80 ? '#dcfce7' : 
                                         snapshot.window30.percentage >= 50 ? '#fef9c3' : '#fee2e2',
                              color: snapshot.window30.percentage >= 80 ? '#166534' : 
                                    snapshot.window30.percentage >= 50 ? '#854d0e' : '#991b1b',
                            }}>
                              {snapshot.window30.percentage}%
                            </span>
                            <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.125rem' }}>
                              {snapshot.window30.completedCount}/{snapshot.window30.scheduledCount}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#334155' }}>
                            {stageMix.total > 0 ? (
                              <>
                                <div>E {stageMix.seed}</div>
                                <div>M {stageMix.minimum}</div>
                                <div>H {stageMix.standard}</div>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {suggestion ? (
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  textTransform: 'capitalize',
                                  ...getSuggestionBadgeStyle(suggestion.suggestedAction),
                                }}>
                                  {suggestion.suggestedAction}
                                </span>
                                {/* Show enhanced rationale with expandable details */}
                                {enhancedRationales[snapshot.habitId] ? (
                                  <div style={{ marginTop: '0.25rem' }}>
                                    <button
                                      onClick={() => {
                                        setExpandedRationales(prev => {
                                          const next = new Set(prev);
                                          if (next.has(snapshot.habitId)) {
                                            next.delete(snapshot.habitId);
                                          } else {
                                            next.add(snapshot.habitId);
                                          }
                                          return next;
                                        });
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        fontSize: '0.625rem',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        textAlign: 'left',
                                        maxWidth: '200px',
                                      }}
                                    >
                                      <span style={{ 
                                        transform: expandedRationales.has(snapshot.habitId) ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        display: 'inline-block',
                                      }}>
                                        ▶
                                      </span>
                                      <span>
                                        {expandedRationales.has(snapshot.habitId) ? 'Hide' : 'View'} rationale
                                        {enhancedRationales[snapshot.habitId].isAiEnhanced && (
                                          <span style={{ 
                                            marginLeft: '0.25rem',
                                            background: '#e0e7ff',
                                            color: '#4338ca',
                                            padding: '0.0625rem 0.25rem',
                                            borderRadius: '2px',
                                            fontSize: '0.5rem',
                                          }}>
                                            AI
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                    {expandedRationales.has(snapshot.habitId) && (
                                      <div style={{ 
                                        fontSize: '0.625rem', 
                                        color: '#475569', 
                                        marginTop: '0.25rem', 
                                        maxWidth: '200px',
                                        padding: '0.5rem',
                                        background: '#f8fafc',
                                        borderRadius: '4px',
                                        border: '1px solid #e2e8f0',
                                      }}>
                                        {enhancedRationales[snapshot.habitId].rationale}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '200px' }}>
                                    {suggestion.rationale}
                                  </div>
                                )}
                                {suggestion.previewChange?.changeDescription && (
                                  <div style={{ 
                                    fontSize: '0.625rem', 
                                    color: '#6366f1', 
                                    marginTop: '0.25rem',
                                    fontStyle: 'italic'
                                  }}>
                                    Preview: {suggestion.previewChange.changeDescription}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          {SUGGESTIONS_ENABLED && (
                            <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                              {(() => {
                                // Check if there's a revertable suggestion for this habit
                                const revertableSuggestion = revertableSuggestions.find(
                                  s => s.habit_id === snapshot.habitId && !revertedSuggestionIds.has(s.id)
                                );
                                const isReverting = revertableSuggestion && revertingSuggestionIds.has(revertableSuggestion.id);

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                    {canApply && habit && suggestion ? (
                                      <button
                                        onClick={() => handleApplySuggestion(habit.id, suggestion)}
                                        disabled={isApplying}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          background: isApplying ? '#94a3b8' : '#667eea',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          cursor: isApplying ? 'not-allowed' : 'pointer',
                                          opacity: isApplying ? 0.7 : 1,
                                        }}
                                      >
                                        {isApplying ? 'Applying…' : 'Apply'}
                                      </button>
                                    ) : isApplied && !revertableSuggestion ? (
                                      <span style={{
                                        fontSize: '0.75rem',
                                        color: '#16a34a',
                                        fontWeight: 600,
                                      }}>
                                        ✓ Applied
                                      </span>
                                    ) : !revertableSuggestion ? (
                                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                    ) : null}
                                    
                                    {/* Revert button for applied suggestions */}
                                    {revertableSuggestion && habit && (
                                      <button
                                        onClick={() => setRevertConfirmation({
                                          suggestionId: revertableSuggestion.id,
                                          habitId: revertableSuggestion.habit_id,
                                          habitTitle: habit.title,
                                        })}
                                        disabled={isReverting}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          background: isReverting ? '#94a3b8' : '#f59e0b',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.625rem',
                                          fontWeight: 600,
                                          cursor: isReverting ? 'not-allowed' : 'pointer',
                                          opacity: isReverting ? 0.7 : 1,
                                        }}
                                      >
                                        {isReverting ? 'Reverting…' : '↩ Revert'}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Revert Confirmation Dialog */}
      {revertConfirmation && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setRevertConfirmation(null);
            setRevertRationale('');
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>
              Revert Changes?
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              This will restore the previous schedule/target settings for "{revertConfirmation.habitTitle}".
            </p>
            
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Reason for reverting (optional):
            </label>
            <textarea
              value={revertRationale}
              onChange={(e) => setRevertRationale(e.target.value)}
              placeholder="Why are you reverting this change?"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical',
                marginBottom: '1.5rem',
                boxSizing: 'border-box',
              }}
            />
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setRevertConfirmation(null);
                  setRevertRationale('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevertSuggestion(revertConfirmation.suggestionId, revertRationale || undefined)}
                disabled={revertingSuggestionIds.has(revertConfirmation.suggestionId)}
                style={{
                  padding: '0.5rem 1rem',
                  background: revertingSuggestionIds.has(revertConfirmation.suggestionId) ? '#94a3b8' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: revertingSuggestionIds.has(revertConfirmation.suggestionId) ? 'not-allowed' : 'pointer',
                }}
              >
                {revertingSuggestionIds.has(revertConfirmation.suggestionId) ? 'Reverting…' : 'Confirm Revert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {lifecycleDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setLifecycleDialog(null);
            setLifecycleReason('');
            setLifecycleResumeOn('');
          }}
        >
          <div
            role="dialog"
            aria-labelledby="lifecycle-dialog-title"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="lifecycle-dialog-title" style={{ margin: '0 0 0.75rem 0', fontSize: '1.125rem' }}>
              {lifecycleDialog.action === 'pause' ? 'Pause habit?' : 'Deactivate habit?'}
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              {lifecycleDialog.action === 'pause'
                ? `Pause "${lifecycleDialog.habitTitle}" and remove it from today's active checklist until you resume it.`
                : `Deactivate "${lifecycleDialog.habitTitle}" and move it out of the active habit list while keeping its history.`}
            </p>

            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Reason (optional)
            </label>
            <textarea
              value={lifecycleReason}
              onChange={(e) => setLifecycleReason(e.target.value)}
              placeholder={lifecycleDialog.action === 'pause' ? 'Why are you pausing this habit?' : 'Why are you deactivating this habit?'}
              style={{
                width: '100%',
                minHeight: '90px',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: lifecycleDialog.action === 'pause' ? '1rem' : '1.5rem',
              }}
            />

            {lifecycleDialog.action === 'pause' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Resume on (optional)
                </label>
                <input
                  type="date"
                  value={lifecycleResumeOn}
                  onChange={(e) => setLifecycleResumeOn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setLifecycleDialog(null);
                  setLifecycleReason('');
                  setLifecycleResumeOn('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmLifecycleDialog()}
                style={{
                  padding: '0.5rem 1rem',
                  background: lifecycleDialog.action === 'pause' ? '#f59e0b' : '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lifecycleDialog.action === 'pause' ? 'Pause habit' : 'Deactivate habit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveConfirmation && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setArchiveConfirmation(null)}
        >
          <div 
            role="dialog"
            aria-labelledby="archive-dialog-title"
            aria-describedby="archive-dialog-description"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="archive-dialog-title" style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>
              Archive Habit?
            </h3>
            <p id="archive-dialog-description" style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              Are you sure you want to archive "{archiveConfirmation.habitTitle}"? 
              The habit will be removed from your active list, but all history and logs will be preserved.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setArchiveConfirmation(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={archivingHabitIds.has(archiveConfirmation.habitId)}
                style={{
                  padding: '0.5rem 1rem',
                  background: archivingHabitIds.has(archiveConfirmation.habitId) ? '#94a3b8' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: archivingHabitIds.has(archiveConfirmation.habitId) ? 'not-allowed' : 'pointer',
                }}
              >
                {archivingHabitIds.has(archiveConfirmation.habitId) ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insights Section */}
      <HabitsInsights session={session} habits={habits} />
    </div>
  );
}
