import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { InteractiveLifeWheel } from '../../components/InteractiveLifeWheel';
import { CategoryInfoCard } from '../../components/CategoryInfoCard';
import { LifeGoalInputDialog } from '../../components/LifeGoalInputDialog';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { insertGoal, updateGoal, fetchGoals } from '../../services/goals';
import { fetchStepsForGoal, insertStep, insertSubstep, insertAlert } from '../../services/lifeGoals';
import { useMediaQuery, WORKSPACE_MOBILE_MEDIA_QUERY } from '../../hooks/useMediaQuery';
import type { Database } from '../../lib/database.types';

type LifeGoalsSectionProps = {
  session: Session;
};

export function LifeGoalsSection({ session }: LifeGoalsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<LifeWheelCategoryKey | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categoryGoals, setCategoryGoals] = useState<Database['public']['Tables']['goals']['Row'][]>([]);
  const [stepsByGoal, setStepsByGoal] = useState<
    Record<string, Database['public']['Tables']['life_goal_steps']['Row'][]>
  >({});
  const [goalStats, setGoalStats] = useState<
    Partial<Record<LifeWheelCategoryKey, { mainCount: number; subCount: number }>>
  >({});
  const isMobile = useMediaQuery(WORKSPACE_MOBILE_MEDIA_QUERY);

  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategory) {
      return 'Choose a life area to focus on';
    }

    const match = LIFE_WHEEL_CATEGORIES.find((category) => category.key === selectedCategory);
    return match ? `Focus: ${match.label}` : 'Explore each life area';
  }, [selectedCategory]);

  const handleCategorySelect = (categoryKey: LifeWheelCategoryKey) => {
    setSelectedCategory(categoryKey);
  };

  const handleAddGoal = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const refreshGoalStats = useCallback(async () => {
    try {
      const { data, error } = await fetchGoals();
      if (error) throw error;

      const goals = data ?? [];
      const grouped = goals.reduce<
        Partial<Record<LifeWheelCategoryKey, { mainCount: number; subCount: number }>>
      >((acc, goal) => {
        const key = goal.life_wheel_category as LifeWheelCategoryKey | null;
        if (!key) return acc;
        if (!acc[key]) {
          acc[key] = { mainCount: 0, subCount: 0 };
        }
        acc[key]!.mainCount += 1;
        return acc;
      }, {});

      const stepsResults = await Promise.all(
        goals.map(async (goal) => {
          const { data: steps, error: stepsError } = await fetchStepsForGoal(goal.id);
          if (stepsError) throw stepsError;
          return { categoryKey: goal.life_wheel_category, count: steps?.length ?? 0 };
        })
      );

      stepsResults.forEach((result) => {
        if (!result.categoryKey) return;
        const key = result.categoryKey as LifeWheelCategoryKey;
        if (!grouped[key]) {
          grouped[key] = { mainCount: 0, subCount: 0 };
        }
        grouped[key]!.subCount += result.count;
      });

      setGoalStats(grouped);
    } catch (error) {
      setGoalStats({});
    }
  }, []);

  const handleSaveGoal = useCallback(
    async (formData: any) => {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        // First, create the goal
        const goalPayload = {
          user_id: session.user.id,
          title: formData.title,
          description: formData.description || null,
          life_wheel_category: formData.lifeWheelCategory,
          start_date: formData.startDate || null,
          target_date: formData.targetDate || null,
          estimated_duration_days: formData.estimatedDurationDays
            ? parseInt(formData.estimatedDurationDays, 10)
            : null,
          timing_notes: formData.timingNotes || null,
          status_tag: formData.statusTag,
        };

        const { data: goal, error: goalError } = await insertGoal(goalPayload);
        if (goalError) throw goalError;
        if (!goal) throw new Error('Failed to create goal');

        // Create steps
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

          // Create substeps for this step
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

        // Create alerts
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
        await refreshGoalStats();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save life goal');
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [refreshGoalStats, session.user.id]
  );

  const loadCategoryGoals = useCallback(
    async (categoryKey: LifeWheelCategoryKey) => {
      setLoadingGoals(true);
      setErrorMessage(null);

      try {
        const { data, error } = await fetchGoals();
        if (error) throw error;

        const filteredGoals = (data ?? []).filter((goal) => goal.life_wheel_category === categoryKey);
        setCategoryGoals(filteredGoals);

        const stepsResults = await Promise.all(
          filteredGoals.map(async (goal) => {
            const { data: steps, error: stepsError } = await fetchStepsForGoal(goal.id);
            if (stepsError) {
              throw stepsError;
            }
            return { goalId: goal.id, steps: steps ?? [] };
          })
        );

        const nextStepsByGoal = stepsResults.reduce<
          Record<string, Database['public']['Tables']['life_goal_steps']['Row'][]>
        >((acc, result) => {
          acc[result.goalId] = result.steps;
          return acc;
        }, {});

        setStepsByGoal(nextStepsByGoal);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load goals for this life area.');
        setCategoryGoals([]);
        setStepsByGoal({});
      } finally {
        setLoadingGoals(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshGoalStats();
  }, [refreshGoalStats]);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryGoals([]);
      setStepsByGoal({});
      return;
    }

    loadCategoryGoals(selectedCategory);
  }, [loadCategoryGoals, selectedCategory]);

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

      await refreshGoalStats();
      if (selectedCategory) {
        await loadCategoryGoals(selectedCategory);
      }
    },
    [loadCategoryGoals, refreshGoalStats, selectedCategory]
  );

  return (
    <section className={`life-goals-section ${isMobile ? 'life-goals-section--mobile' : ''}`}>
      <header className="life-goals-section__header">
        <div className="life-goals-section__eyebrow">Long-term roadmap</div>
        <div className="life-goals-section__heading-row">
          <div>
            <h2>Life Goals</h2>
            <p>
              Use the life wheel to explore different areas of your life. Click or tap on a slice to view goal ideas and
              create detailed life goals with steps, timing, and notifications.
            </p>
          </div>
          <button className="life-goals-section__cta" type="button" onClick={handleAddGoal}>
            Add a life goal
          </button>
        </div>
        <div className="life-goals-section__mobile-bar" aria-live="polite">
          <span className="life-goals-section__chip">{activeCategoryLabel}</span>
          <span className="life-goals-section__chip life-goals-section__chip--muted">Tap the wheel to change focus</span>
        </div>
      </header>

      {errorMessage && (
        <p className="life-goals-section__status life-goals-section__status--error">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="life-goals-section__status life-goals-section__status--success">{successMessage}</p>
      )}

      <div className="life-goals-section__interactive">
        <div className="life-goals-section__wheel-card">
          <div className="life-goals-section__card-header">
            <div>
              <p className="life-goals-section__card-label">Life wheel</p>
              <p className="life-goals-section__card-helper">
                Tap any slice to browse goal prompts for that area. Badges show main goals and sub goals.
              </p>
            </div>
            <button type="button" className="life-goals-section__icon-button" onClick={handleAddGoal}>
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
        </div>
        <div className="life-goals-section__info">
          <CategoryInfoCard
            categoryKey={selectedCategory}
            onAddGoal={handleAddGoal}
            goals={categoryGoals}
            stepsByGoal={stepsByGoal}
            isLoading={loadingGoals}
            onUpdateGoal={handleUpdateGoal}
          />
        </div>
      </div>

      <LifeGoalInputDialog
        session={session}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveGoal}
        initialCategory={selectedCategory}
      />
    </section>
  );
}
