import { useCallback, useEffect, useRef, useState } from 'react';
import { createHabitV2, pauseHabitV2 } from '../../../services/habitsV2';
import { getSuggestedHabitById } from '../suggestedHabitLibrary';
import { getDailyLifeUpgradeEnabled } from '../../../services/dailyLifeUpgradePrefs';
import { hasShownDailyLifeUpgradeToday, markDailyLifeUpgradeShownToday } from '../../../services/dailyLifeUpgradeCooldown';
import { selectDailyLifeUpgradeCandidate, type DailyLifeUpgradeCandidate } from '../../../services/dailyLifeUpgradeCandidate';

export type DailyLifeUpgradeAlternativeCreateDraft = {
  title: string;
  notes: string;
  lifeWheelKey: string;
  timing: string | null;
  linkedGoalId: string | null;
  linkedDomainKey: string | null;
  linkedHabitIntent: string | null;
};

type HabitInput = {
  id: string;
  name: string;
  status?: string | null;
  archived?: boolean | null;
  goal?: { id?: string | null } | null;
  goal_id?: string | null;
  domain_key?: string | null;
  schedule?: unknown;
  habit_intent?: string | null;
};

export function useDailyLifeUpgradeFlow(params: {
  userId: string | null | undefined;
  habits: HabitInput[];
  historicalLogs: Array<{ habit_id: string; completed: boolean }>;
  sortedHabits: HabitInput[];
  isConfigured: boolean;
  isDemoExperience: boolean;
  lifeWheelUnassigned: string;
  extractLifeWheelDomain: (schedule: any) => { key: string | null } | null;
  buildScheduleWithLifeWheel: (schedule: any, key: string | null) => any;
  buildScheduleWithNotes: (schedule: any, notes: string) => any;
  buildScheduleWithDefaultTiming: (schedule: any, timing: string | null) => any;
  handleOpenEdit: (habit: any) => void;
  focusHabitCardById: (habitId: string) => void;
  refreshHabits: () => Promise<unknown>;
  deferInitialModal?: boolean;
}) {
  const [dailyLifeUpgradeCandidate, setDailyLifeUpgradeCandidate] = useState<DailyLifeUpgradeCandidate | null>(null);
  const [showDailyLifeUpgradeModal, setShowDailyLifeUpgradeModal] = useState(false);
  const [dailyLifeUpgradeAlternativeCreateDraft, setDailyLifeUpgradeAlternativeCreateDraft] = useState<DailyLifeUpgradeAlternativeCreateDraft | null>(null);
  const [dailyLifeUpgradeAlternativeCreateSuccess, setDailyLifeUpgradeAlternativeCreateSuccess] = useState<{ habitId: string | null; originalHabitId: string | null } | null>(null);
  const [dailyLifeUpgradeCreateSaving, setDailyLifeUpgradeCreateSaving] = useState(false);
  const [dailyLifeUpgradeCreateError, setDailyLifeUpgradeCreateError] = useState<string | null>(null);
  const [dailyLifeUpgradePauseConfirmOpen, setDailyLifeUpgradePauseConfirmOpen] = useState(false);
  const [dailyLifeUpgradePauseSaving, setDailyLifeUpgradePauseSaving] = useState(false);
  const [dailyLifeUpgradePauseStatus, setDailyLifeUpgradePauseStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [dailyLifeUpgradeHighlightedHabitId, setDailyLifeUpgradeHighlightedHabitId] = useState<string | null>(null);
  const dailyLifeUpgradeHighlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!params.userId) return;
    if (params.habits.length === 0 || params.historicalLogs.length === 0) return;
    if (!getDailyLifeUpgradeEnabled(params.userId)) return;
    if (hasShownDailyLifeUpgradeToday(params.userId)) return;
    const candidate = selectDailyLifeUpgradeCandidate({
      habits: params.habits.map((habit) => ({
        id: habit.id,
        title: habit.name,
        status: habit.status ?? 'active',
        is_archived: habit.archived ?? false,
        linked_goal_id: habit.goal?.id ?? null,
      })),
      recentLogs: params.historicalLogs,
    });
    if (!candidate) return;
    setDailyLifeUpgradeCandidate(candidate);
    if (params.deferInitialModal) return;
    setShowDailyLifeUpgradeModal(true);
  }, [params.userId, params.habits, params.historicalLogs, params.deferInitialModal]);

  useEffect(() => () => {
    if (dailyLifeUpgradeHighlightTimeoutRef.current !== null) {
      window.clearTimeout(dailyLifeUpgradeHighlightTimeoutRef.current);
    }
  }, []);

  const closeDailyLifeUpgradeModal = useCallback(() => {
    if (!params.userId) return;
    markDailyLifeUpgradeShownToday(params.userId);
    setShowDailyLifeUpgradeModal(false);
  }, [params.userId]);

  const handleDailyLifeUpgradePrimaryAction = useCallback(() => {
    if (!params.userId || !dailyLifeUpgradeCandidate) return;
    markDailyLifeUpgradeShownToday(params.userId);
    setShowDailyLifeUpgradeModal(false);
    const targetHabit = params.sortedHabits.find((habit) => habit.id === dailyLifeUpgradeCandidate.habitId);
    if (!targetHabit) return;
    params.handleOpenEdit(targetHabit);
    params.focusHabitCardById(targetHabit.id);
  }, [params, dailyLifeUpgradeCandidate]);

  const handleDailyLifeUpgradeAlternativeAction = useCallback((alternative: DailyLifeUpgradeCandidate['alternatives'][number]) => {
    if (!params.userId || !dailyLifeUpgradeCandidate) return;
    markDailyLifeUpgradeShownToday(params.userId);
    setShowDailyLifeUpgradeModal(false);
    const targetHabit = params.sortedHabits.find((habit) => habit.id === dailyLifeUpgradeCandidate.habitId);
    if (!targetHabit) return;
    const sourceSuggestedHabit = getSuggestedHabitById(alternative.suggestedHabitId);
    const lifeWheelMeta = params.extractLifeWheelDomain(targetHabit.schedule ?? null);
    const linkedHabitIntent = typeof targetHabit.habit_intent === 'string' ? targetHabit.habit_intent ?? null : null;
    const nextLifeWheelKey = lifeWheelMeta?.key ?? params.lifeWheelUnassigned;
    const nextTitle = sourceSuggestedHabit?.tinyVersion?.trim()
      || sourceSuggestedHabit?.title?.trim()
      || alternative.title.trim()
      || targetHabit.name;
    const notesSegments = [
      alternative.supportiveCopy?.trim() ?? '',
      sourceSuggestedHabit?.cueSuggestions.length ? `Cue: ${sourceSuggestedHabit.cueSuggestions[0]}` : '',
      sourceSuggestedHabit?.environmentHacks.length ? `Support: ${sourceSuggestedHabit.environmentHacks[0]}` : '',
    ].filter(Boolean);
    setDailyLifeUpgradeCreateError(null);
    setDailyLifeUpgradeAlternativeCreateDraft({
      title: nextTitle,
      notes: notesSegments.join('\n'),
      lifeWheelKey: nextLifeWheelKey,
      timing: sourceSuggestedHabit?.defaultTiming ?? null,
      linkedGoalId: targetHabit.goal_id ?? null,
      linkedDomainKey: targetHabit.domain_key ?? null,
      linkedHabitIntent,
    });
  }, [params, dailyLifeUpgradeCandidate]);

  const handleCloseDailyLifeUpgradeCreateFlow = useCallback(() => {
    setDailyLifeUpgradeAlternativeCreateDraft(null);
    setDailyLifeUpgradeAlternativeCreateSuccess(null);
    setDailyLifeUpgradeCreateSaving(false);
    setDailyLifeUpgradeCreateError(null);
    setDailyLifeUpgradePauseConfirmOpen(false);
    setDailyLifeUpgradePauseSaving(false);
    setDailyLifeUpgradePauseStatus(null);
  }, []);

  const handleSaveDailyLifeUpgradeCreateFlow = useCallback(async () => {
    if (!dailyLifeUpgradeAlternativeCreateDraft || !params.userId) return;
    if (!params.isConfigured && !params.isDemoExperience) {
      setDailyLifeUpgradeCreateError('Supabase credentials are not configured. Add them to continue.');
      return;
    }
    const nextTitle = dailyLifeUpgradeAlternativeCreateDraft.title.trim();
    if (!nextTitle) {
      setDailyLifeUpgradeCreateError('Please enter a habit title.');
      return;
    }
    setDailyLifeUpgradeCreateSaving(true);
    setDailyLifeUpgradeCreateError(null);
    try {
      const scheduleWithLifeWheel = params.buildScheduleWithLifeWheel(null, dailyLifeUpgradeAlternativeCreateDraft.lifeWheelKey !== params.lifeWheelUnassigned ? dailyLifeUpgradeAlternativeCreateDraft.lifeWheelKey : null);
      const scheduleWithNotes = params.buildScheduleWithNotes(scheduleWithLifeWheel, dailyLifeUpgradeAlternativeCreateDraft.notes);
      const scheduleWithTiming = params.buildScheduleWithDefaultTiming(scheduleWithNotes, dailyLifeUpgradeAlternativeCreateDraft.timing);
      const { data, error } = await createHabitV2({
        title: nextTitle,
        type: 'boolean',
        schedule: scheduleWithTiming as never,
        target_num: null,
        target_unit: null,
        archived: false,
        allow_skip: true,
        goal_id: dailyLifeUpgradeAlternativeCreateDraft.linkedGoalId,
        domain_key: dailyLifeUpgradeAlternativeCreateDraft.linkedDomainKey,
        habit_intent: dailyLifeUpgradeAlternativeCreateDraft.linkedHabitIntent,
      }, params.userId);
      if (error) throw error;
      await params.refreshHabits();
      setDailyLifeUpgradeAlternativeCreateDraft(null);
      setDailyLifeUpgradeCreateError(null);
      setDailyLifeUpgradeAlternativeCreateSuccess({ habitId: data?.id ?? null, originalHabitId: dailyLifeUpgradeCandidate?.habitId ?? null });
      setDailyLifeUpgradePauseConfirmOpen(false);
      setDailyLifeUpgradePauseStatus(null);
    } catch (error) {
      setDailyLifeUpgradeCreateError(error instanceof Error ? error.message : 'Unable to create this habit right now.');
    } finally {
      setDailyLifeUpgradeCreateSaving(false);
    }
  }, [dailyLifeUpgradeAlternativeCreateDraft, dailyLifeUpgradeCandidate?.habitId, params]);

  const handlePauseOriginalHabitFromDailyLifeUpgrade = useCallback(async () => {
    const originalHabitId = dailyLifeUpgradeAlternativeCreateSuccess?.originalHabitId;
    if (!originalHabitId || dailyLifeUpgradePauseSaving) return;
    setDailyLifeUpgradePauseSaving(true);
    setDailyLifeUpgradePauseStatus(null);
    try {
      const { error } = await pauseHabitV2(originalHabitId, { reason: 'Trying a lighter HabitGame quest path' });
      if (error) throw error;
      await params.refreshHabits();
      setDailyLifeUpgradePauseStatus({ tone: 'success', message: 'Original habit paused.' });
      setDailyLifeUpgradePauseConfirmOpen(false);
    } catch (error) {
      setDailyLifeUpgradePauseStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to pause the original habit right now.' });
    } finally {
      setDailyLifeUpgradePauseSaving(false);
    }
  }, [dailyLifeUpgradeAlternativeCreateSuccess?.originalHabitId, dailyLifeUpgradePauseSaving, params]);

  return {
    dailyLifeUpgradeCandidate,
    showDailyLifeUpgradeModal,
    dailyLifeUpgradeAlternativeCreateDraft,
    setDailyLifeUpgradeAlternativeCreateDraft,
    dailyLifeUpgradeAlternativeCreateSuccess,
    dailyLifeUpgradeCreateSaving,
    dailyLifeUpgradeCreateError,
    dailyLifeUpgradePauseConfirmOpen,
    setDailyLifeUpgradePauseConfirmOpen,
    dailyLifeUpgradePauseSaving,
    dailyLifeUpgradePauseStatus,
    setDailyLifeUpgradePauseStatus,
    dailyLifeUpgradeHighlightedHabitId,
    setDailyLifeUpgradeHighlightedHabitId,
    closeDailyLifeUpgradeModal,
    handleDailyLifeUpgradePrimaryAction,
    handleDailyLifeUpgradeAlternativeAction,
    handleCloseDailyLifeUpgradeCreateFlow,
    handleSaveDailyLifeUpgradeCreateFlow,
    handlePauseOriginalHabitFromDailyLifeUpgrade,
  };
}
