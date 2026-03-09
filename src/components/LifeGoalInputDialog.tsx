import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import type { GoalStatusTag } from '../features/goals/goalStatus';
import { DEFAULT_GOAL_STATUS, GOAL_STATUS_OPTIONS } from '../features/goals/goalStatus';
import {
  DEFAULT_GOAL_STRATEGY,
  GOAL_STRATEGY_META,
  type GoalStrategyType,
} from '../features/goals/goalStrategy';
import { StrategyPicker } from './StrategyPicker';
import useAiGoalSuggestion from '../hooks/useAiGoalSuggestion';
import useGoalCoachChat, {
  type GoalCoachContextEvolutionEvent,
  type GoalCoachContextGoal,
  type GoalCoachDraft,
} from '../hooks/useGoalCoachChat';
import { fetchPersonalityProfile } from '../services/personalityTest';
import { fetchGoals } from '../services/goals';
import { fetchRecentGoalSnapshots } from '../services/goalSnapshots';
import { getAiCoachAccess } from '../services/aiCoachAccess';
import { recordTelemetryEvent } from '../services/telemetry';
import { AI_FEATURE_ICON } from '../constants/ai';
import { resolveGoalCoachExperimentVariant } from '../features/goals/goalCoachExperiments';

type LifeGoalStep = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  substeps: LifeGoalSubstep[];
};

type LifeGoalSubstep = {
  id: string;
  title: string;
};

type LifeGoalAlert = {
  id: string;
  alertType: 'milestone' | 'deadline' | 'reminder' | 'custom';
  alertTime: string;
  title: string;
  message: string;
  repeatPattern: 'once' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
};

type LifeGoalFormData = {
  title: string;
  description: string;
  lifeWheelCategory: LifeWheelCategoryKey;
  startDate: string;
  targetDate: string;
  estimatedDurationDays: string;
  timingNotes: string;
  statusTag: GoalStatusTag;
  strategyType: GoalStrategyType;
  steps: LifeGoalStep[];
  alerts: LifeGoalAlert[];
};

type GoalCoachUiMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type LifeGoalInputDialogProps = {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LifeGoalFormData) => Promise<void>;
  initialCategory: LifeWheelCategoryKey | null;
  initialPromptTitle?: string | null;
  coachingMode?: 'slice' | 'guided';
};

export function LifeGoalInputDialog({
  session,
  isOpen,
  onClose,
  onSave,
  initialCategory,
  initialPromptTitle = null,
  coachingMode = 'slice',
}: LifeGoalInputDialogProps) {
  // Initialize AI goal suggestion hook for generating goal recommendations
  const { loading: aiLoading, error: aiError, suggestion: aiSuggestion, generateSuggestion } = useAiGoalSuggestion();
  const { loading: chatLoading, error: chatServiceError, sendMessage } = useGoalCoachChat();

  const [formData, setFormData] = useState<LifeGoalFormData>(() => ({
    title: '',
    description: '',
    lifeWheelCategory: initialCategory || 'health_fitness',
    startDate: '',
    targetDate: '',
    estimatedDurationDays: '',
    timingNotes: '',
    statusTag: DEFAULT_GOAL_STATUS,
    strategyType: DEFAULT_GOAL_STRATEGY,
    steps: [],
    alerts: [],
  }));

  const [currentStep, setCurrentStep] = useState<Partial<LifeGoalStep>>({
    title: '',
    description: '',
    dueDate: '',
    substeps: [],
  });

  const [currentSubstep, setCurrentSubstep] = useState('');
  const [currentAlert, setCurrentAlert] = useState<Partial<LifeGoalAlert>>({
    alertType: 'reminder',
    alertTime: '',
    title: '',
    message: '',
    repeatPattern: 'once',
    enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [strategyExpanded, setStrategyExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'steps' | 'timing' | 'alerts'>('basic');
  const guidedTabOrder: Array<'basic' | 'steps' | 'timing' | 'alerts'> = ['basic', 'steps', 'timing', 'alerts'];
  const guidedTabIndex = guidedTabOrder.indexOf(activeTab);
  const isGuidedMode = coachingMode === 'guided';
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<GoalCoachUiMessage[]>([]);
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatDraftGoal, setChatDraftGoal] = useState<GoalCoachDraft | null>(null);
  const [personalitySummary, setPersonalitySummary] = useState<string | null>(null);
  const [existingGoalTitles, setExistingGoalTitles] = useState<string[]>([]);
  const [existingGoalsStructured, setExistingGoalsStructured] = useState<GoalCoachContextGoal[]>([]);
  const [goalEvolutionSummary, setGoalEvolutionSummary] = useState<string | null>(null);
  const [goalEvolutionEvents, setGoalEvolutionEvents] = useState<GoalCoachContextEvolutionEvent[]>([]);
  const aiCoachAccess = getAiCoachAccess(session);
  const goalCoachVariant = resolveGoalCoachExperimentVariant();
  const buildCoachMessagesPayload = useCallback(
    (newUserMessage?: string) => {
      const baseMessages = chatMessages.map((message) => ({
        role: message.role,
        content: message.text,
      }));

      if (newUserMessage?.trim()) {
        baseMessages.push({
          role: 'user',
          content: newUserMessage.trim(),
        });
      }

      return baseMessages;
    },
    [chatMessages],
  );



  const recordCoachTelemetry = useCallback(
    (eventType: 'goal_coach_chat_sent' | 'goal_coach_chat_draft_received' | 'goal_coach_chat_goal_created', metadata?: Record<string, unknown>) => {
      const userId = session?.user?.id;
      if (!userId) {
        return;
      }

      void recordTelemetryEvent({
        userId,
        eventType,
        metadata: {
          source: 'life_goal_input_dialog',
          variant: goalCoachVariant,
          ...metadata,
        },
      });
    },
    [session?.user?.id],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData((current) => ({
      ...current,
      title: initialPromptTitle?.trim() ?? '',
      description: '',
      lifeWheelCategory: initialCategory || current.lifeWheelCategory || 'health_fitness',
      startDate: '',
      targetDate: '',
      estimatedDurationDays: '',
      timingNotes: '',
      statusTag: DEFAULT_GOAL_STATUS,
      steps: [],
      alerts: [],
    }));
    setCurrentStep({
      title: '',
      description: '',
      dueDate: '',
      substeps: [],
    });
    setCurrentSubstep('');
    setCurrentAlert({
      alertType: 'reminder',
      alertTime: '',
      title: '',
      message: '',
      repeatPattern: 'once',
      enabled: true,
    });
    setActiveTab('basic');
  }, [initialCategory, initialPromptTitle, isOpen]);

  useEffect(() => {
    if (!isOpen || !session?.user?.id) {
      return;
    }

    let cancelled = false;

    const loadCoachContext = async () => {
      try {
        const [profileResult, goalsResult] = await Promise.all([
          fetchPersonalityProfile(session.user.id),
          fetchGoals(),
        ]);

        if (!cancelled) {
          const summary = profileResult.data?.personality_summary;
          setPersonalitySummary(typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : null);

          const goals = goalsResult.data ?? [];
          const goalTitles = goals
            .map((goal) => (typeof goal.title === 'string' ? goal.title.trim() : ''))
            .filter((title) => title.length > 0)
            .slice(0, 12);
          setExistingGoalTitles(goalTitles);

          const structuredGoals: GoalCoachContextGoal[] = goals
            .map((goal) => ({
              title: typeof goal.title === 'string' ? goal.title.trim() : '',
              statusTag: goal.status_tag,
              lifeWheelCategory: goal.life_wheel_category,
              targetDate: goal.target_date,
            }))
            .filter((goal) => goal.title.length > 0)
            .slice(0, 12);
          setExistingGoalsStructured(structuredGoals);
        }

        if (aiCoachAccess.goalEvolution) {
          const snapshots = await fetchRecentGoalSnapshots(session.user.id, 8);
          if (!cancelled) {
            const snapshotSummary = snapshots
              .map((snapshot) => (typeof snapshot.summary === 'string' ? snapshot.summary.trim() : ''))
              .filter((item) => item.length > 0)
              .slice(0, 6)
              .join(' | ');
            setGoalEvolutionSummary(snapshotSummary || null);

            const structuredEvents: GoalCoachContextEvolutionEvent[] = snapshots
              .map((snapshot) => ({
                snapshotType: snapshot.snapshot_type,
                summary: typeof snapshot.summary === 'string' ? snapshot.summary.trim() : '',
                createdAt: snapshot.created_at,
              }))
              .filter((event) => event.summary.length > 0)
              .slice(0, 8);
            setGoalEvolutionEvents(structuredEvents);
          }
        } else if (!cancelled) {
          setGoalEvolutionSummary(null);
          setGoalEvolutionEvents([]);
        }
      } catch {
        if (!cancelled) {
          setPersonalitySummary(null);
          setExistingGoalTitles([]);
          setExistingGoalsStructured([]);
          setGoalEvolutionSummary(null);
          setGoalEvolutionEvents([]);
        }
      }
    };

    void loadCoachContext();

    return () => {
      cancelled = true;
    };
  }, [aiCoachAccess.goalEvolution, isOpen, session]);

  const handleFieldChange = (field: keyof LifeGoalFormData) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const canAdvanceGuidedStep = useCallback((tab: 'basic' | 'steps' | 'timing' | 'alerts') => {
    if (tab === 'basic') {
      return formData.title.trim().length > 0 && formData.description.trim().length > 0;
    }

    if (tab === 'steps') {
      return formData.steps.length > 0 || (currentStep.title?.trim().length ?? 0) > 0;
    }

    if (tab === 'timing') {
      return formData.targetDate.trim().length > 0 || formData.estimatedDurationDays.trim().length > 0;
    }

    return true;
  }, [currentStep.title, formData.description, formData.estimatedDurationDays, formData.steps.length, formData.targetDate, formData.title]);

  const handleGuidedNext = useCallback(() => {
    if (!canAdvanceGuidedStep(activeTab)) {
      return;
    }
    const nextTab = guidedTabOrder[Math.min(guidedTabIndex + 1, guidedTabOrder.length - 1)];
    setActiveTab(nextTab);
  }, [activeTab, canAdvanceGuidedStep, guidedTabIndex, guidedTabOrder]);

  const handleGuidedBack = useCallback(() => {
    const previousTab = guidedTabOrder[Math.max(guidedTabIndex - 1, 0)];
    setActiveTab(previousTab);
  }, [guidedTabIndex, guidedTabOrder]);

  const handleAddStep = () => {
    if (!currentStep.title?.trim()) return;

    const newStep: LifeGoalStep = {
      id: crypto.randomUUID(),
      title: currentStep.title,
      description: currentStep.description || '',
      dueDate: currentStep.dueDate || '',
      substeps: currentStep.substeps || [],
    };

    setFormData((current) => ({
      ...current,
      steps: [...current.steps, newStep],
    }));

    setCurrentStep({
      title: '',
      description: '',
      dueDate: '',
      substeps: [],
    });
  };

  const handleRemoveStep = (stepId: string) => {
    setFormData((current) => ({
      ...current,
      steps: current.steps.filter((step) => step.id !== stepId),
    }));
  };

  const handleAddSubstep = () => {
    if (!currentSubstep.trim()) return;

    const newSubstep: LifeGoalSubstep = {
      id: crypto.randomUUID(),
      title: currentSubstep,
    };

    setCurrentStep((current) => ({
      ...current,
      substeps: [...(current.substeps || []), newSubstep],
    }));

    setCurrentSubstep('');
  };

  const handleRemoveSubstep = (substepId: string) => {
    setCurrentStep((current) => ({
      ...current,
      substeps: (current.substeps || []).filter((substep) => substep.id !== substepId),
    }));
  };

  const handleAddAlert = () => {
    if (!currentAlert.title?.trim() || !currentAlert.alertTime) return;

    const newAlert: LifeGoalAlert = {
      id: crypto.randomUUID(),
      alertType: currentAlert.alertType || 'reminder',
      alertTime: currentAlert.alertTime || '',
      title: currentAlert.title,
      message: currentAlert.message || '',
      repeatPattern: currentAlert.repeatPattern || 'once',
      enabled: currentAlert.enabled !== false,
    };

    setFormData((current) => ({
      ...current,
      alerts: [...current.alerts, newAlert],
    }));

    setCurrentAlert({
      alertType: 'reminder',
      alertTime: '',
      title: '',
      message: '',
      repeatPattern: 'once',
      enabled: true,
    });
  };

  const handleRemoveAlert = (alertId: string) => {
    setFormData((current) => ({
      ...current,
      alerts: current.alerts.filter((alert) => alert.id !== alertId),
    }));
  };

  const handleGenerateAiSuggestion = async () => {
    if (!formData.description.trim()) return;

    // Calculate timeframe from target date if available
    let timeframe: string | undefined;
    if (formData.targetDate) {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) {
        timeframe = `${daysUntil} days`;
      }
    } else if (formData.estimatedDurationDays) {
      timeframe = `${formData.estimatedDurationDays} days`;
    }

    await generateSuggestion({
      description: formData.description,
      timeframe,
      category: formData.lifeWheelCategory,
    });
  };

  const buildAiDraft = useCallback(() => {
    if (chatDraftGoal?.title) {
      const steps: LifeGoalStep[] = chatDraftGoal.milestones.map((milestone) => ({
        id: crypto.randomUUID(),
        title: milestone,
        description: '',
        dueDate: '',
        substeps: [],
      }));

      if (chatDraftGoal.tasks.length > 0 && steps.length > 0) {
        steps[0].substeps = chatDraftGoal.tasks.map((task) => ({
          id: crypto.randomUUID(),
          title: task,
        }));
      }

      return {
        title: chatDraftGoal.title,
        description: chatDraftGoal.description,
        targetDate: chatDraftGoal.target_date ?? '',
        statusTag: (chatDraftGoal.status_tag as GoalStatusTag) || DEFAULT_GOAL_STATUS,
        lifeWheelCategory: (chatDraftGoal.life_wheel_category as LifeWheelCategoryKey) || formData.lifeWheelCategory,
        steps,
      };
    }

    if (!aiSuggestion) {
      return null;
    }

    const title = aiSuggestion.goal.trim();
    if (!title) {
      return null;
    }

    const steps: LifeGoalStep[] = aiSuggestion.milestones.map((milestone) => ({
      id: crypto.randomUUID(),
      title: milestone,
      description: '',
      dueDate: '',
      substeps: [],
    }));

    if (aiSuggestion.tasks.length > 0 && steps.length > 0) {
      steps[0].substeps = aiSuggestion.tasks.map((task) => ({
        id: crypto.randomUUID(),
        title: task,
      }));
    }

    return {
      title,
      description: formData.description,
      targetDate: formData.targetDate,
      statusTag: formData.statusTag,
      lifeWheelCategory: formData.lifeWheelCategory,
      steps,
    };
  }, [aiSuggestion, chatDraftGoal, formData.description, formData.lifeWheelCategory, formData.statusTag, formData.targetDate]);

  const handleUseAiSuggestion = () => {
    const draft = buildAiDraft();
    if (!draft) {
      return;
    }

    setFormData((current) => ({
      ...current,
      title: draft.title,
      description: draft.description || current.description,
      targetDate: draft.targetDate || current.targetDate,
      statusTag: draft.statusTag,
      lifeWheelCategory: draft.lifeWheelCategory,
      steps: [...current.steps, ...draft.steps],
    }));
  };

  const handleCreateGoalFromAi = async () => {
    if (saving || chatSubmitting || chatLoading) {
      return;
    }

    let draft = buildAiDraft();

    if (!draft && chatMessages.length > 0) {
      try {
        setChatSubmitting(true);
        const response = await sendMessage({
          messages: buildCoachMessagesPayload(),
          lifeWheelCategory: formData.lifeWheelCategory,
          personalitySummary: personalitySummary ?? undefined,
          existingGoals: existingGoalTitles,
          existingGoalsStructured: goalCoachVariant === 'context_rich' ? existingGoalsStructured : undefined,
          includeGoalEvolution: aiCoachAccess.goalEvolution,
          goalEvolutionSummary: goalEvolutionSummary ?? undefined,
          goalEvolutionEvents: goalCoachVariant === 'context_rich' ? goalEvolutionEvents : undefined,
          finalize: true,
        });

        setChatMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: response.assistantMessage,
          },
        ]);

        setChatDraftGoal(response.draftGoal);
        if (response.draftGoal) {
          recordCoachTelemetry('goal_coach_chat_draft_received', {
            milestoneCount: response.draftGoal.milestones.length,
            taskCount: response.draftGoal.tasks.length,
            statusTag: response.draftGoal.status_tag,
            finalized: true,
            cohort: existingGoalTitles.length === 0 ? 'new' : 'returning',
          });
        }
        const finalizedDraft = response.draftGoal;
        draft = finalizedDraft
          ? {
              title: finalizedDraft.title,
              description: finalizedDraft.description,
              targetDate: finalizedDraft.target_date ?? '',
              statusTag: (finalizedDraft.status_tag as GoalStatusTag) || DEFAULT_GOAL_STATUS,
              lifeWheelCategory:
                (finalizedDraft.life_wheel_category as LifeWheelCategoryKey) || formData.lifeWheelCategory,
              steps: finalizedDraft.milestones.map((milestone, index) => ({
                id: crypto.randomUUID(),
                title: milestone,
                description: '',
                dueDate: '',
                substeps:
                  index === 0
                    ? finalizedDraft.tasks.map((task) => ({ id: crypto.randomUUID(), title: task }))
                    : [],
              })),
            }
          : null;
      } catch (error) {
        setChatError(error instanceof Error ? error.message : 'Unable to finalize draft right now.');
      } finally {
        setChatSubmitting(false);
      }
    }

    if (!draft) {
      setChatError('No draft available yet. Continue the chat a bit more or use quick AI generate.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        title: draft.title,
        description: draft.description || formData.description,
        targetDate: draft.targetDate || formData.targetDate,
        statusTag: draft.statusTag,
        lifeWheelCategory: draft.lifeWheelCategory,
        steps: [...formData.steps, ...draft.steps],
      });
      recordCoachTelemetry('goal_coach_chat_goal_created', {
        lifeWheelCategory: draft.lifeWheelCategory,
        stepCount: draft.steps.length,
        usedChatDraft: Boolean(chatDraftGoal),
        contextProfile: goalCoachVariant === 'context_rich' ? 'structured' : 'summary_only',
        cohort: existingGoalTitles.length === 0 ? 'new' : 'returning',
      });
      onClose();
    } catch (error) {
      console.error('Error creating life goal from AI summary:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatSubmitting || chatLoading) {
      return;
    }

    const nextMessages = buildCoachMessagesPayload(trimmed);

    setChatSubmitting(true);
    setChatError(null);
    setChatInput('');
    setChatMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed,
      },
    ]);

    recordCoachTelemetry('goal_coach_chat_sent', {
      messageLength: trimmed.length,
      messageCount: nextMessages.length,
      hasPersonalitySummary: Boolean(personalitySummary),
      existingGoalsCount: existingGoalTitles.length,
      existingGoalsStructuredCount: existingGoalsStructured.length,
      includeGoalEvolution: aiCoachAccess.goalEvolution,
      goalEvolutionEventsCount: goalEvolutionEvents.length,
      contextProfile: goalCoachVariant === 'context_rich' ? 'structured' : 'summary_only',
      cohort: existingGoalTitles.length === 0 ? 'new' : 'returning',
    });

    try {
      const response = await sendMessage({
        messages: nextMessages,
        lifeWheelCategory: formData.lifeWheelCategory,
        personalitySummary: personalitySummary ?? undefined,
        existingGoals: existingGoalTitles,
        includeGoalEvolution: aiCoachAccess.goalEvolution,
        goalEvolutionSummary: goalEvolutionSummary ?? undefined,
        finalize: false,
      });

      setChatDraftGoal(response.draftGoal);
      if (response.draftGoal) {
        recordCoachTelemetry('goal_coach_chat_draft_received', {
          milestoneCount: response.draftGoal.milestones.length,
          taskCount: response.draftGoal.tasks.length,
          statusTag: response.draftGoal.status_tag,
          finalized: false,
          cohort: existingGoalTitles.length === 0 ? 'new' : 'returning',
        });
      }
      setChatMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.assistantMessage,
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unable to send chat message right now.');
    } finally {
      setChatSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        lifeWheelCategory: initialCategory || 'health_fitness',
        startDate: '',
        targetDate: '',
        estimatedDurationDays: '',
        timingNotes: '',
        statusTag: DEFAULT_GOAL_STATUS,
        strategyType: DEFAULT_GOAL_STRATEGY,
        steps: [],
        alerts: [],
      });
      setStrategyExpanded(false);
      onClose();
    } catch (error) {
      console.error('Error saving life goal:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="life-goal-dialog-overlay" onClick={onClose}>
      <div className="life-goal-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="life-goal-dialog__header">
          <div>
            <h2>{isGuidedMode ? 'Guided goal coach' : 'Create Life Goal'}</h2>
            {isGuidedMode ? <p className="life-goal-dialog__guided-subtitle">Follow each step to build one clear goal before you save.</p> : null}
          </div>
          <button
            type="button"
            className="life-goal-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>

        {isGuidedMode ? (
          <div className="life-goal-dialog__guided-stepper" role="status" aria-live="polite">
            {guidedTabOrder.map((tab, index) => (
              <div key={tab} className={`life-goal-dialog__guided-step ${index <= guidedTabIndex ? 'life-goal-dialog__guided-step--active' : ''}`}>
                <span className="life-goal-dialog__guided-step-index">{index + 1}</span>
                <span className="life-goal-dialog__guided-step-label">
                  {tab === 'basic' ? 'Outcome' : tab === 'steps' ? 'First actions' : tab === 'timing' ? 'Timeline' : 'Confirm'}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="life-goal-dialog__tabs">
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'basic' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('basic')}
            disabled={isGuidedMode}
          >
            Basic Info
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'steps' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('steps')}
            disabled={isGuidedMode}
          >
            Steps ({formData.steps.length})
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'timing' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('timing')}
            disabled={isGuidedMode}
          >
            Timing
          </button>
          <button
            type="button"
            className={`life-goal-dialog__tab ${activeTab === 'alerts' ? 'life-goal-dialog__tab--active' : ''}`}
            onClick={() => setActiveTab('alerts')}
            disabled={isGuidedMode}
          >
            Alerts ({formData.alerts.length})
          </button>
        </div>

        <form className="life-goal-dialog__form" onSubmit={handleSubmit}>
          {activeTab === 'basic' && (
            <div className="life-goal-dialog__section">
              <label className="life-goal-dialog__field">
                <span>Goal Title *</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleFieldChange('title')}
                  placeholder="e.g., Run a marathon"
                  required
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Description</span>
                <textarea
                  value={formData.description}
                  onChange={handleFieldChange('description')}
                  placeholder="Describe what success looks like and why this goal matters to you..."
                  rows={4}
                />
              </label>

              {/* AI Suggestion Section */}
              <div className="life-goal-dialog__ai-section">
                <div className="life-goal-dialog__ai-actions">
                  <button
                    type="button"
                    className="life-goal-dialog__ai-generate"
                    onClick={handleGenerateAiSuggestion}
                    disabled={!formData.description.trim() || aiLoading}
                  >
                    {aiLoading ? `${AI_FEATURE_ICON} Generating...` : `${AI_FEATURE_ICON} Generate with AI`}
                  </button>
                  <button
                    type="button"
                    className="life-goal-dialog__ai-chat"
                    onClick={() => setChatOpen((current) => !current)}
                    aria-expanded={chatOpen}
                  >
                    {AI_FEATURE_ICON} Chat with AI
                  </button>
                </div>

                {chatOpen && (
                  <div className="life-goal-dialog__chat-panel">
                    <p className="life-goal-dialog__chat-hint">
                      Describe your current situation, blockers, and desired outcome. The AI coach will draft a goal summary you can confirm.
                    </p>
                    <div className="life-goal-dialog__chat-log" role="log" aria-live="polite">
                      {chatMessages.length === 0 ? (
                        <p className="life-goal-dialog__chat-empty">No messages yet. Start with what you want to improve in this life area.</p>
                      ) : (
                        chatMessages.map((message) => (
                          <p key={message.id} className={`life-goal-dialog__chat-message life-goal-dialog__chat-message--${message.role}`}>
                            <strong>{message.role === 'user' ? 'You' : 'AI Coach'}:</strong> {message.text}
                          </p>
                        ))
                      )}
                    </div>
                    <div className="life-goal-dialog__chat-compose">
                      <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        rows={3}
                        placeholder="I want to improve my consistency with workouts because..."
                      />
                      <button type="button" onClick={handleSendChatMessage} disabled={chatSubmitting || chatLoading || !chatInput.trim()}>
                        {chatSubmitting ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {chatError || chatServiceError ? <p className="life-goal-dialog__ai-error">{chatError ?? chatServiceError}</p> : null}
                  </div>
                )}

                {aiLoading && (
                  <p className="life-goal-dialog__ai-status">
                    Generating AI suggestion based on your description...
                  </p>
                )}

                {aiError && (
                  <div className="life-goal-dialog__ai-error">
                    <strong>Error:</strong> {aiError}
                  </div>
                )}

                {(aiSuggestion || chatDraftGoal) && (
                  <div className="life-goal-dialog__ai-suggestion">
                    <h4>💡 AI Suggestion</h4>
                    <div className="life-goal-dialog__ai-content">
                      <div className="life-goal-dialog__ai-goal">
                        <strong>Goal:</strong>
                        <p>{chatDraftGoal?.title ?? aiSuggestion?.goal}</p>
                      </div>

                      {(chatDraftGoal?.milestones ?? aiSuggestion?.milestones ?? []).length > 0 && (
                        <div className="life-goal-dialog__ai-milestones">
                          <strong>Milestones:</strong>
                          <ul>
                            {(chatDraftGoal?.milestones ?? aiSuggestion?.milestones ?? []).map((milestone, index) => (
                              <li key={index}>{milestone}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(chatDraftGoal?.tasks ?? aiSuggestion?.tasks ?? []).length > 0 && (
                        <div className="life-goal-dialog__ai-tasks">
                          <strong>Tasks:</strong>
                          <ul>
                            {(chatDraftGoal?.tasks ?? aiSuggestion?.tasks ?? []).map((task, index) => (
                              <li key={index}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="life-goal-dialog__ai-confirm-actions">
                        <button
                          type="button"
                          className="life-goal-dialog__ai-use"
                          onClick={handleUseAiSuggestion}
                        >
                          ✓ Use this as goal
                        </button>
                        <button
                          type="button"
                          className="life-goal-dialog__ai-create"
                          onClick={() => void handleCreateGoalFromAi()}
                          disabled={saving || chatSubmitting || chatLoading}
                        >
                          {saving || chatSubmitting ? 'Creating…' : 'Create goal from summary'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <label className="life-goal-dialog__field">
                <span>Life Area</span>
                <select value={formData.lifeWheelCategory} onChange={handleFieldChange('lifeWheelCategory')}>
                  <option value="spirituality_community">Spirituality & Community</option>
                  <option value="finance_wealth">Finance & Wealth</option>
                  <option value="love_relations">Love & Relations</option>
                  <option value="fun_creativity">Fun & Creativity</option>
                  <option value="career_development">Career & Self Development</option>
                  <option value="health_fitness">Health & Fitness</option>
                  <option value="family_friends">Family & Friends</option>
                  <option value="living_spaces">Living Spaces</option>
                </select>
              </label>

              <label className="life-goal-dialog__field">
                <span>Status</span>
                <select value={formData.statusTag} onChange={handleFieldChange('statusTag')}>
                  {GOAL_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="life-goal-dialog__strategy-section">
                <button
                  type="button"
                  className="life-goal-dialog__strategy-toggle"
                  onClick={() => setStrategyExpanded((prev) => !prev)}
                  aria-expanded={strategyExpanded}
                >
                  <span>How will you pursue this? <em>(optional)</em></span>
                  {!strategyExpanded && (
                    <span className="life-goal-dialog__strategy-preview">
                      {GOAL_STRATEGY_META[formData.strategyType].icon}{' '}
                      {GOAL_STRATEGY_META[formData.strategyType].label}
                    </span>
                  )}
                  <span className="life-goal-dialog__strategy-chevron">{strategyExpanded ? '▲' : '▼'}</span>
                </button>
                {strategyExpanded && (
                  <StrategyPicker
                    value={formData.strategyType}
                    onChange={(strategy) => setFormData((current) => ({ ...current, strategyType: strategy }))}
                    className="life-goal-dialog__strategy-picker"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="life-goal-dialog__section">
              <div className="life-goal-dialog__steps-form">
                <h3>Add a Step</h3>
                <label className="life-goal-dialog__field">
                  <span>Step Title *</span>
                  <input
                    type="text"
                    value={currentStep.title || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, title: e.target.value })}
                    placeholder="e.g., Complete 5K training program"
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Step Description</span>
                  <textarea
                    value={currentStep.description || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, description: e.target.value })}
                    placeholder="Additional details about this step..."
                    rows={2}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={currentStep.dueDate || ''}
                    onChange={(e) => setCurrentStep({ ...currentStep, dueDate: e.target.value })}
                  />
                </label>

                <div className="life-goal-dialog__substeps">
                  <h4>Substeps</h4>
                  <div className="life-goal-dialog__substep-input">
                    <input
                      type="text"
                      value={currentSubstep}
                      onChange={(e) => setCurrentSubstep(e.target.value)}
                      placeholder="Add a substep..."
                    />
                    <button type="button" onClick={handleAddSubstep} disabled={!currentSubstep.trim()}>
                      Add
                    </button>
                  </div>
                  {currentStep.substeps && currentStep.substeps.length > 0 && (
                    <ul className="life-goal-dialog__substep-list">
                      {currentStep.substeps.map((substep) => (
                        <li key={substep.id}>
                          <span>{substep.title}</span>
                          <button type="button" onClick={() => handleRemoveSubstep(substep.id)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  className="life-goal-dialog__add-step"
                  onClick={handleAddStep}
                  disabled={!currentStep.title?.trim()}
                >
                  Add Step
                </button>
              </div>

              {formData.steps.length > 0 && (
                <div className="life-goal-dialog__steps-list">
                  <h3>Steps ({formData.steps.length})</h3>
                  <ul>
                    {formData.steps.map((step, index) => (
                      <li key={step.id} className="life-goal-dialog__step-item">
                        <div className="life-goal-dialog__step-header">
                          <span className="life-goal-dialog__step-number">{index + 1}.</span>
                          <strong>{step.title}</strong>
                          <button type="button" onClick={() => handleRemoveStep(step.id)}>
                            Remove
                          </button>
                        </div>
                        {step.description && <p>{step.description}</p>}
                        {step.dueDate && <p className="life-goal-dialog__step-date">Due: {step.dueDate}</p>}
                        {step.substeps.length > 0 && (
                          <ul className="life-goal-dialog__step-substeps">
                            {step.substeps.map((substep) => (
                              <li key={substep.id}>{substep.title}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="life-goal-dialog__section">
              <label className="life-goal-dialog__field">
                <span>Start Date</span>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={handleFieldChange('startDate')}
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Target Date</span>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={handleFieldChange('targetDate')}
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Estimated Duration (days)</span>
                <input
                  type="number"
                  value={formData.estimatedDurationDays}
                  onChange={handleFieldChange('estimatedDurationDays')}
                  placeholder="e.g., 90"
                  min="1"
                />
              </label>

              <label className="life-goal-dialog__field">
                <span>Timing Notes</span>
                <textarea
                  value={formData.timingNotes}
                  onChange={handleFieldChange('timingNotes')}
                  placeholder="Add notes about your schedule, milestones, or important dates..."
                  rows={4}
                />
              </label>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="life-goal-dialog__section">
              <div className="life-goal-dialog__alert-form">
                <h3>Add an Alert</h3>
                <p className="life-goal-dialog__hint">
                  Alerts work as PWA notifications and will appear even when the app is closed (on supported devices).
                </p>

                <label className="life-goal-dialog__field">
                  <span>Alert Type</span>
                  <select
                    value={currentAlert.alertType || 'reminder'}
                    onChange={(e) =>
                      setCurrentAlert({
                        ...currentAlert,
                        alertType: e.target.value as LifeGoalAlert['alertType'],
                      })
                    }
                  >
                    <option value="reminder">Reminder</option>
                    <option value="milestone">Milestone</option>
                    <option value="deadline">Deadline</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Time *</span>
                  <input
                    type="datetime-local"
                    value={currentAlert.alertTime || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, alertTime: e.target.value })}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Title *</span>
                  <input
                    type="text"
                    value={currentAlert.title || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, title: e.target.value })}
                    placeholder="e.g., Time to train!"
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Alert Message</span>
                  <textarea
                    value={currentAlert.message || ''}
                    onChange={(e) => setCurrentAlert({ ...currentAlert, message: e.target.value })}
                    placeholder="Additional message for the notification..."
                    rows={2}
                  />
                </label>

                <label className="life-goal-dialog__field">
                  <span>Repeat</span>
                  <select
                    value={currentAlert.repeatPattern || 'once'}
                    onChange={(e) =>
                      setCurrentAlert({
                        ...currentAlert,
                        repeatPattern: e.target.value as LifeGoalAlert['repeatPattern'],
                      })
                    }
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="life-goal-dialog__add-alert"
                  onClick={handleAddAlert}
                  disabled={!currentAlert.title?.trim() || !currentAlert.alertTime}
                >
                  Add Alert
                </button>
              </div>

              {formData.alerts.length > 0 && (
                <div className="life-goal-dialog__alerts-list">
                  <h3>Alerts ({formData.alerts.length})</h3>
                  <ul>
                    {formData.alerts.map((alert) => (
                      <li key={alert.id} className="life-goal-dialog__alert-item">
                        <div className="life-goal-dialog__alert-header">
                          <strong>{alert.title}</strong>
                          <span className="life-goal-dialog__alert-type">{alert.alertType}</span>
                          <button type="button" onClick={() => handleRemoveAlert(alert.id)}>
                            Remove
                          </button>
                        </div>
                        <p className="life-goal-dialog__alert-time">
                          {new Date(alert.alertTime).toLocaleString()} • {alert.repeatPattern}
                        </p>
                        {alert.message && <p>{alert.message}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {isGuidedMode ? (
            <div className="life-goal-dialog__guided-nav">
              <button
                type="button"
                className="life-goal-dialog__cancel"
                onClick={handleGuidedBack}
                disabled={guidedTabIndex === 0}
              >
                Back
              </button>
              {guidedTabIndex < guidedTabOrder.length - 1 ? (
                <button
                  type="button"
                  className="life-goal-dialog__save"
                  onClick={handleGuidedNext}
                  disabled={!canAdvanceGuidedStep(activeTab)}
                >
                  Continue
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="life-goal-dialog__actions">
            <button type="button" className="life-goal-dialog__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="life-goal-dialog__save" disabled={saving || !formData.title.trim() || (isGuidedMode && guidedTabIndex < guidedTabOrder.length - 1)}>
              {saving ? 'Saving...' : isGuidedMode ? 'Finish guided goal' : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
