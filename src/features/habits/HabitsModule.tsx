import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { listHabitsV2, listTodayHabitLogsV2, createHabitV2, logHabitCompletionV2, listHabitStreaksV2, archiveHabitV2, listHabitLogsForWeekV2, updateHabitFullV2, type HabitV2Row, type HabitLogV2Row, type HabitStreakRow } from '../../services/habitsV2';
import { buildAdherenceSnapshots, type HabitAdherenceSnapshot } from '../../services/adherenceMetrics';
import { saveAndApplySuggestion, revertSuggestionForHabit, listRevertableSuggestions, type HabitAdjustmentRow } from '../../services/habitAdjustments';
import { HabitWizard, type HabitWizardDraft } from './HabitWizard';
import { loadHabitTemplates, type HabitTemplate } from './habitTemplates';
import { HabitsInsights } from './HabitsInsights';
import { isHabitScheduledToday, parseSchedule, getTimesPerWeekProgress, getEveryNDaysNextDue } from './scheduleInterpreter';
import { classifyHabit } from './performanceClassifier';
import { getTelemetryDifficultyAdjustment } from '../../services/telemetry';
import { buildSuggestion, type HabitSuggestion } from './suggestionsEngine';
import { buildEnhancedRationale, type EnhancedRationaleResult } from './aiRationale';
import type { Database } from '../../lib/database.types';
import './HabitsModule.css';
import {
  AUTO_PROGRESS_TIERS,
  AUTO_PROGRESS_UPGRADE_RULES,
  buildAutoProgressPlan,
  buildDefaultAutoProgressState,
  getAutoProgressState,
  getNextDownshiftTier,
  getNextUpgradeTier,
  type AutoProgressTier,
} from './autoProgression';

// Check if habit suggestions feature is enabled via environment variable
const SUGGESTIONS_ENABLED = import.meta.env.VITE_ENABLE_HABIT_SUGGESTIONS === '1';

type HabitsModuleProps = {
  session: Session;
};

export function HabitsModule({ session }: HabitsModuleProps) {
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
  
  // State for AI-enhanced rationales (by habit ID)
  const [enhancedRationales, setEnhancedRationales] = useState<Record<string, EnhancedRationaleResult>>({});
  
  // State for tracking which rationales are being expanded (by habit ID)
  const [expandedRationales, setExpandedRationales] = useState<Set<string>>(new Set());

  // Compute habits scheduled for today using the schedule interpreter with week logs
  const todaysHabits = useMemo(() => {
    const today = new Date();
    return habits.filter((habit) => {
      // Get this habit's week logs
      const habitWeekLogs = weekLogs.filter(log => log.habit_id === habit.id);
      return isHabitScheduledToday(habit, today, habitWeekLogs);
    });
  }, [habits, weekLogs]);

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
        const { data: habitsData, error: habitsError } = await listHabitsV2();
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
      // Create log entry for boolean habit
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habitId,
          done: true,
          value: null, // For boolean habits, value is null
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
      // Create log entry with the value
      const { data: newLog, error: logError } = await logHabitCompletionV2(
        {
          habit_id: habit.id,
          done: true,
          value: value,
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

  // Handler for editing a habit (opens wizard with pre-filled data)
  const handleEditHabit = (habit: HabitV2Row) => {
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
          done_ish_config: doneIshConfig as unknown as Database['public']['Tables']['habits_v2']['Row']['done_ish_config'],
        };
        
        const { data: updatedHabit, error: updateError } = await updateHabitFullV2(draft.habitId, updatePayload);
        
        if (updateError) {
          throw new Error(updateError.message);
        }
        
        if (!updatedHabit) {
          throw new Error('Failed to update habit - no data returned');
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
          done_ish_config: doneIshConfig as unknown as Database['public']['Tables']['habits_v2']['Insert']['done_ish_config'],
          autoprog: buildDefaultAutoProgressState({
            schedule: draft.schedule as unknown as Database['public']['Tables']['habits_v2']['Insert']['schedule'],
            target: draft.targetValue ?? null,
          }) as Database['public']['Tables']['habits_v2']['Insert']['autoprog'],
          archived: false,
        };
        
        const { data: newHabit, error: createError } = await createHabitV2(insertPayload, session.user.id);
        
        if (createError) {
          throw new Error(createError.message);
        }
        
        if (!newHabit) {
          throw new Error('Failed to create habit - no data returned');
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {habits.map((habit) => {
                const autoProgressState = getAutoProgressState(habit);
                const downshiftTier = getNextDownshiftTier(autoProgressState.tier);
                const upgradeTier = getNextUpgradeTier(autoProgressState.tier);
                const suggestion = performanceSuggestions[habit.id];
                const recommendedDownshift = downshiftTier && suggestion?.suggestedAction === 'ease';
                const canUpgrade = upgradeTier && suggestion?.suggestedAction === 'progress';
                const isUpdatingAutoProgress = autoProgressHabitIds.has(habit.id);

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
                    {/* Action strip in top-right corner */}
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
                          {/* Pencil icon */}
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
                          {/* Trash icon */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', paddingRight: '4.5rem' }}>
                      {habit.emoji && (
                        <span style={{ fontSize: '1.5rem' }}>{habit.emoji}</span>
                      )}
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {habit.title}
                      </h3>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div>
                        <strong>Type:</strong> {habit.type}
                        {habit.type !== 'boolean' && habit.target_num && (
                          <span> ({habit.target_num} {habit.target_unit || 'units'})</span>
                        )}
                      </div>
                      <div>
                        <strong>Schedule:</strong> Custom schedule
                      </div>
                    </div>

                    <div className="habit-card__autoprog">
                      <div className="habit-card__autoprog-header">
                        <div>
                          <p className="habit-card__autoprog-label">Game of Life ladder</p>
                          <h4 className="habit-card__autoprog-tier">
                            {AUTO_PROGRESS_TIERS[autoProgressState.tier].label} tier
                          </h4>
                          <p className="habit-card__autoprog-description">
                            {AUTO_PROGRESS_TIERS[autoProgressState.tier].description}
                          </p>
                        </div>
                        {autoProgressState.lastShiftAt ? (
                          <span className="habit-card__autoprog-meta">
                            Last shift: {new Date(autoProgressState.lastShiftAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                      {recommendedDownshift ? (
                        <p className="habit-card__autoprog-hint">
                          Consistency dipped—downshifting will keep momentum without breaking your Game of Life streaks.
                        </p>
                      ) : null}
                      <div className="habit-card__autoprog-actions">
                        <button
                          type="button"
                          className="habit-card__autoprog-button"
                          disabled={!downshiftTier || isUpdatingAutoProgress}
                          onClick={() => {
                            if (!downshiftTier) return;
                            handleAutoProgressShift(habit, downshiftTier, 'downshift');
                          }}
                        >
                          {downshiftTier
                            ? `Downshift to ${AUTO_PROGRESS_TIERS[downshiftTier].label}`
                            : 'At lowest tier'}
                        </button>
                        <button
                          type="button"
                          className="habit-card__autoprog-button habit-card__autoprog-button--primary"
                          disabled={!upgradeTier || !canUpgrade || isUpdatingAutoProgress}
                          onClick={() => {
                            if (!upgradeTier) return;
                            handleAutoProgressShift(habit, upgradeTier, 'upgrade');
                          }}
                        >
                          {upgradeTier
                            ? `Re-upgrade to ${AUTO_PROGRESS_TIERS[upgradeTier].label}`
                            : 'At standard tier'}
                        </button>
                      </div>
                      <p className="habit-card__autoprog-rules">
                        Re-upgrade rule: {AUTO_PROGRESS_UPGRADE_RULES.minStreakDays}-day streak and{' '}
                        {AUTO_PROGRESS_UPGRADE_RULES.minAdherence30}% 30-day adherence.
                      </p>
                      {upgradeTier && !canUpgrade ? (
                        <p className="habit-card__autoprog-locked">
                          Keep logging to unlock the next tier.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
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
