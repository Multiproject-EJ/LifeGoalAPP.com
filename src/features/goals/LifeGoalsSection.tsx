import { useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { InteractiveLifeWheel } from '../../components/InteractiveLifeWheel';
import { CategoryInfoCard } from '../../components/CategoryInfoCard';
import { LifeGoalInputDialog } from '../../components/LifeGoalInputDialog';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { insertGoal } from '../../services/goals';
import { insertStep, insertSubstep, insertAlert } from '../../services/lifeGoals';

type LifeGoalsSectionProps = {
  session: Session;
};

export function LifeGoalsSection({ session }: LifeGoalsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<LifeWheelCategoryKey | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCategorySelect = (categoryKey: LifeWheelCategoryKey) => {
    setSelectedCategory(categoryKey);
  };

  const handleAddGoal = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

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
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save life goal');
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [session.user.id]
  );

  return (
    <section className="life-goals-section">
      <header className="life-goals-section__header">
        <h2>Life Goals</h2>
        <p>
          Use the life wheel to explore different areas of your life. Click on a slice to view goal ideas and create
          detailed life goals with steps, timing, and notifications.
        </p>
      </header>

      {errorMessage && (
        <p className="life-goals-section__status life-goals-section__status--error">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="life-goals-section__status life-goals-section__status--success">{successMessage}</p>
      )}

      <div className="life-goals-section__interactive">
        <div className="life-goals-section__wheel">
          <InteractiveLifeWheel
            onCategorySelect={handleCategorySelect}
            selectedCategory={selectedCategory}
          />
        </div>
        <div className="life-goals-section__info">
          <CategoryInfoCard categoryKey={selectedCategory} onAddGoal={handleAddGoal} />
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
