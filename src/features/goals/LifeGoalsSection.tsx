import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { InteractiveLifeWheel } from '../../components/InteractiveLifeWheel';
import { CategoryInfoCard } from '../../components/CategoryInfoCard';
import { LifeGoalInputDialog } from '../../components/LifeGoalInputDialog';
import { QuickAddSheet } from '../../components/QuickAddSheet';
import { AllGoalsView } from './AllGoalsView';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { GoalRecommendedAction } from './executionTypes';
import type { GoalHealthResult } from './goalHealth';
import { computeAreaProgress } from './goalProgress';
import { insertGoal, updateGoal, fetchGoals } from '../../services/goals';
import { fetchStepsForGoal, insertStep, insertSubstep, insertAlert, updateStep } from '../../services/lifeGoals';
import { applyGoalAdaptation, evaluateGoalHealthFromSignals, recordGoalHealthSnapshot } from '../../services/goalExecution';
import { useMediaQuery, WORKSPACE_MOBILE_MEDIA_QUERY } from '../../hooks/useMediaQuery';
import type { Database } from '../../lib/database.types';
import { readWellbeingShield, WELLBEING_SHIELD_EVENT, type WellbeingShieldScore } from '../habits/wellbeingShield';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type StepRow = Database['public']['Tables']['life_goal_steps']['Row'];

type LifeGoalsSectionProps = {
  session: Session;
};

type ViewMode = 'wheel' | 'all';

export function LifeGoalsSection({ session }: LifeGoalsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<LifeWheelCategoryKey | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [allGoals, setAllGoals] = useState<GoalRow[]>([]);
  const [stepsByGoal, setStepsByGoal] = useState<Record<string, StepRow[]>>({});
  const [goalHealthById, setGoalHealthById] = useState<Record<string, GoalHealthResult>>({});
  const [dialogPromptTitle, setDialogPromptTitle] = useState<string | null>(null);
  const isMobile = useMediaQuery(WORKSPACE_MOBILE_MEDIA_QUERY);
  const [wellbeingShield, setWellbeingShield] = useState<WellbeingShieldScore | null>(() => readWellbeingShield());

  useEffect(() => {
    const update = () => setWellbeingShield(readWellbeingShield());
    window.addEventListener(WELLBEING_SHIELD_EVENT, update);
    return () => window.removeEventListener(WELLBEING_SHIELD_EVENT, update);
  }, []);

  const goalStats = useMemo(() => {
    const byArea: Partial<Record<LifeWheelCategoryKey, { mainCount: number; subCount: number; progress: number }>> = {};
    LIFE_WHEEL_CATEGORIES.forEach((category) => {
      const areaGoals = allGoals.filter((goal) => goal.life_wheel_category === category.key);
      if (areaGoals.length === 0) return;
      const subCount = areaGoals.reduce((sum, goal) => sum + (stepsByGoal[goal.id]?.length ?? 0), 0);
      byArea[category.key] = {
        mainCount: areaGoals.length,
        subCount,
        progress: Math.min(100, computeAreaProgress(areaGoals.map((goal) => goal.id), stepsByGoal)
          + (category.key === 'health_fitness' ? wellbeingShield?.healthContribution ?? 0 : 0)),
      };
    });
    return byArea;
  }, [allGoals, stepsByGoal, wellbeingShield?.healthContribution]);

  const categoryGoals = useMemo(
    () => (selectedCategory ? allGoals.filter((goal) => goal.life_wheel_category === selectedCategory) : []),
    [allGoals, selectedCategory],
  );

  const handleCategorySelect = (categoryKey: LifeWheelCategoryKey) => {
    setSelectedCategory(categoryKey);
  };

  const handleAddGoal = (promptTitle?: string) => {
    setDialogPromptTitle(promptTitle?.trim() ? promptTitle.trim() : null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogPromptTitle(null);
    setIsDialogOpen(false);
  };

  const loadAllGoals = useCallback(async () => {
    setLoadingGoals(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;
      const goals = data ?? [];

      const stepsResults = await Promise.all(
        goals.map(async (goal) => {
          const { data: steps, error: stepsError } = await fetchStepsForGoal(goal.id);
          if (stepsError) throw stepsError;
          return { goalId: goal.id, steps: steps ?? [] };
        }),
      );

      const nextSteps = stepsResults.reduce<Record<string, StepRow[]>>((acc, result) => {
        acc[result.goalId] = result.steps;
        return acc;
      }, {});

      const nextHealth = goals.reduce<Record<string, GoalHealthResult>>((acc, goal) => {
        const steps = nextSteps[goal.id] ?? [];
        const health = evaluateGoalHealthFromSignals(goal, steps);
        acc[goal.id] = health;
        void recordGoalHealthSnapshot(goal, health);
        return acc;
      }, {});

      setAllGoals(goals);
      setStepsByGoal(nextSteps);
      setGoalHealthById(nextHealth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load your goals.');
      setAllGoals([]);
      setStepsByGoal({});
      setGoalHealthById({});
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useEffect(() => {
    void loadAllGoals();
  }, [loadAllGoals]);

  const handleSaveGoal = useCallback(
    async (formData: any) => {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const goalPayload = {
          user_id: session.user.id,
          title: formData.title,
          description: formData.description || null,
          life_wheel_category: formData.lifeWheelCategory,
          secondary_life_wheel_categories: Array.isArray(formData.secondaryCategories)
            ? formData.secondaryCategories
            : [],
          start_date: formData.startDate || null,
          target_date: formData.targetDate || null,
          estimated_duration_days: formData.estimatedDurationDays
            ? parseInt(formData.estimatedDurationDays, 10)
            : null,
          timing_notes: formData.timingNotes || null,
          status_tag: formData.statusTag,
          environment_context: formData.environmentContext ?? null,
        };

        const { data: goal, error: goalError } = await insertGoal(goalPayload);
        if (goalError) throw goalError;
        if (!goal) throw new Error('Failed to create goal');

        for (let i = 0; i < formData.steps.length; i++) {
          const step = formData.steps[i];
          const stepPayload = {
            goal_id: goal.id,
            step_order: i,
            title: step.title,
            description: step.description || null,
            due_date: step.dueDate || null,
          };

          const { data: createdStep, error: stepError } = await insertStep(stepPayload);
          if (stepError) throw stepError;
          if (!createdStep) continue;

          for (let j = 0; j < step.substeps.length; j++) {
            const substep = step.substeps[j];
            const substepPayload = {
              step_id: createdStep.id,
              substep_order: j,
              title: substep.title,
            };
            const { error: substepError } = await insertSubstep(substepPayload);
            if (substepError) throw substepError;
          }
        }

        for (const alert of formData.alerts) {
          const alertPayload = {
            goal_id: goal.id,
            user_id: session.user.id,
            alert_type: alert.alertType,
            alert_time: alert.alertTime,
            title: alert.title,
            message: alert.message || null,
            repeat_pattern: alert.repeatPattern,
            enabled: alert.enabled,
          };
          const { error: alertError } = await insertAlert(alertPayload);
          if (alertError) throw alertError;
        }

        setSuccessMessage('Life goal created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        setSelectedCategory(formData.lifeWheelCategory);
        await loadAllGoals();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save life goal');
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [loadAllGoals, session.user.id],
  );

  const handleUpdateGoal = useCallback(
    async (goalId: string, payload: Database['public']['Tables']['goals']['Update']) => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const { error } = await updateGoal(goalId, payload);
      if (error) {
        setErrorMessage(error.message);
        throw error;
      }

      setSuccessMessage('Life goal updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadAllGoals();
    },
    [loadAllGoals],
  );

  const handleToggleStep = useCallback(
    (goal: GoalRow, step: StepRow, completed: boolean) => {
      const completedAt = completed ? new Date().toISOString() : null;

      // Optimistic local update so the checkbox + progress respond instantly.
      setStepsByGoal((current) => {
        const goalSteps = current[goal.id] ?? [];
        return {
          ...current,
          [goal.id]: goalSteps.map((item) =>
            item.id === step.id ? { ...item, completed, completed_at: completedAt } : item,
          ),
        };
      });

      void updateStep(step.id, { completed, completed_at: completedAt })
        .then(() => loadAllGoals())
        .catch(() => {
          setErrorMessage('Could not update that step. Please try again.');
          void loadAllGoals();
        });
    },
    [loadAllGoals],
  );

  const handleApplyRecommendedAction = useCallback(
    async (goalId: string, action: GoalRecommendedAction) => {
      const goal = allGoals.find((item) => item.id === goalId);
      if (!goal) return;

      setErrorMessage(null);
      setSuccessMessage(null);

      const { error } = await applyGoalAdaptation({ goal, action, source: 'manual' });
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage('Adaptation applied successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadAllGoals();
    },
    [allGoals, loadAllGoals],
  );

  const handleJumpToArea = useCallback((key: LifeWheelCategoryKey) => {
    setViewMode('wheel');
    setSelectedCategory(key);
  }, []);

  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategory) return 'Choose a life area to focus on';
    const match = LIFE_WHEEL_CATEGORIES.find((category) => category.key === selectedCategory);
    return match ? `Focus: ${match.label}` : 'Explore each life area';
  }, [selectedCategory]);

  return (
    <section className={`life-goals-section ${isMobile ? 'life-goals-section--mobile' : ''}`}>
      <header className="life-goals-section__header">
        <div className="life-goals-section__eyebrow">Long-term roadmap</div>
        <div className="life-goals-section__heading-row">
          <div>
            <h2>Goals</h2>
            <p>
              Use the life wheel to explore the areas of your life, or switch to All goals to see everything in one
              place. Each area has its own colour.
            </p>
          </div>
          <button className="life-goals-section__cta" type="button" onClick={() => setIsQuickAddOpen(true)}>
            ＋ Add a goal
          </button>
        </div>
        <div className="life-goals-section__viewtoggle" role="tablist" aria-label="Goals view">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'wheel'}
            className={`life-goals-section__viewtab ${viewMode === 'wheel' ? 'life-goals-section__viewtab--active' : ''}`}
            onClick={() => setViewMode('wheel')}
          >
            🎡 Life wheel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'all'}
            className={`life-goals-section__viewtab ${viewMode === 'all' ? 'life-goals-section__viewtab--active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            📋 All goals{allGoals.length > 0 ? ` (${allGoals.length})` : ''}
          </button>
        </div>
      </header>

      {errorMessage && <p className="life-goals-section__status life-goals-section__status--error">{errorMessage}</p>}
      {successMessage && (
        <p className="life-goals-section__status life-goals-section__status--success">{successMessage}</p>
      )}

      {viewMode === 'wheel' ? (
        <div className="life-goals-section__interactive">
          <div className="life-goals-section__wheel-card">
            <div className="life-goals-section__card-header">
              <div>
                <p className="life-goals-section__card-label">Life wheel</p>
                <p className="life-goals-section__card-helper">
                  Tap any slice to focus that area. The fill shows progress; the badge shows how many goals you have.
                </p>
              </div>
              <button type="button" className="life-goals-section__icon-button" onClick={() => handleAddGoal()}>
                +
              </button>
            </div>
            <div className="life-goals-section__wheel">
              <InteractiveLifeWheel
                onCategorySelect={handleCategorySelect}
                selectedCategory={selectedCategory}
                goalStats={goalStats}
              />
            </div>
            <p className="life-goals-section__chip" aria-live="polite">
              {activeCategoryLabel}
            </p>
            {wellbeingShield ? <p className="life-goals-section__chip" aria-label={`Wellbeing Shield ${wellbeingShield.total} out of 100`}>🛡️ Wellbeing Shield {wellbeingShield.total} · Body {wellbeingShield.body} · Mind {wellbeingShield.mind}</p> : null}
          </div>
          <div className="life-goals-section__info">
            <CategoryInfoCard
              categoryKey={selectedCategory}
              onAddGoal={handleAddGoal}
              onUsePrompt={handleAddGoal}
              goals={categoryGoals}
              goalHealthById={goalHealthById}
              stepsByGoal={stepsByGoal}
              isLoading={loadingGoals}
              onUpdateGoal={handleUpdateGoal}
              onToggleStep={handleToggleStep}
              onApplyRecommendedAction={handleApplyRecommendedAction}
            />
          </div>
        </div>
      ) : (
        <AllGoalsView
          goals={allGoals}
          stepsByGoal={stepsByGoal}
          goalHealthById={goalHealthById}
          isLoading={loadingGoals}
          onUpdateGoal={handleUpdateGoal}
          onToggleStep={handleToggleStep}
          onApplyRecommendedAction={handleApplyRecommendedAction}
          onJumpToArea={handleJumpToArea}
        />
      )}

      <LifeGoalInputDialog
        session={session}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveGoal}
        initialCategory={selectedCategory}
        initialPromptTitle={dialogPromptTitle}
      />

      {isQuickAddOpen ? (
        <QuickAddSheet
          session={session}
          initialMode="goal"
          goalOptions={allGoals.map((goal) => ({ id: goal.id, title: goal.title }))}
          onCreated={() => {
            void loadAllGoals();
          }}
          onOpenAdvanced={(mode) => {
            setIsQuickAddOpen(false);
            if (mode === 'goal') handleAddGoal();
          }}
          onClose={() => setIsQuickAddOpen(false)}
        />
      ) : null}
    </section>
  );
}
