import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { Database } from '../lib/database.types';
import {
  DEFAULT_GOAL_STATUS,
  GOAL_STATUS_OPTIONS,
  normalizeGoalStatus,
  type GoalStatusTag,
} from '../features/goals/goalStatus';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import { isLifeWheelCategoryKey } from '../features/life-wheel/lifeWheelVisuals';
import { LifeAreaPicker } from './LifeAreaPicker';

type GoalRow = Database['public']['Tables']['goals']['Row'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type GoalEditDialogProps = {
  goal: GoalRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalId: string, payload: GoalUpdate) => Promise<void>;
};

type GoalEditFormData = {
  title: string;
  description: string;
  statusTag: GoalStatusTag;
  lifeWheelCategory: LifeWheelCategoryKey;
  secondaryCategories: LifeWheelCategoryKey[];
  startDate: string;
  targetDate: string;
  estimatedDurationDays: string;
  timingNotes: string;
};

function readSecondary(goal: GoalRow): LifeWheelCategoryKey[] {
  const raw = (goal as { secondary_life_wheel_categories?: string[] | null }).secondary_life_wheel_categories;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLifeWheelCategoryKey);
}

function buildFormData(goal: GoalRow): GoalEditFormData {
  return {
    title: goal.title,
    description: goal.description ?? '',
    statusTag: normalizeGoalStatus(goal.status_tag),
    lifeWheelCategory: isLifeWheelCategoryKey(goal.life_wheel_category) ? goal.life_wheel_category : 'health_fitness',
    secondaryCategories: readSecondary(goal),
    startDate: goal.start_date ?? '',
    targetDate: goal.target_date ?? '',
    estimatedDurationDays: goal.estimated_duration_days?.toString() ?? '',
    timingNotes: goal.timing_notes ?? '',
  };
}

export function GoalEditDialog({ goal, isOpen, onClose, onSave }: GoalEditDialogProps) {
  const [formData, setFormData] = useState<GoalEditFormData>(() => buildFormData(goal));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData(buildFormData(goal));
  }, [goal]);

  const handleFieldChange =
    (field: keyof GoalEditFormData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const title = formData.title.trim();
    if (!title) {
      setErrorMessage('Give this goal a title before saving.');
      return;
    }

    setSaving(true);
    try {
      await onSave(goal.id, {
        title,
        description: formData.description.trim() || null,
        status_tag: formData.statusTag || DEFAULT_GOAL_STATUS,
        life_wheel_category: formData.lifeWheelCategory,
        secondary_life_wheel_categories: formData.secondaryCategories,
        start_date: formData.startDate || null,
        target_date: formData.targetDate || null,
        estimated_duration_days: formData.estimatedDurationDays
          ? parseInt(formData.estimatedDurationDays, 10)
          : null,
        timing_notes: formData.timingNotes.trim() || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update goal right now.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="goal-edit-dialog-overlay" onClick={onClose}>
      <div className="goal-edit-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="goal-edit-dialog__header">
          <div>
            <h3>Edit Goal</h3>
            <p className="goal-edit-dialog__subtitle">Update the goal and the life areas it belongs to.</p>
          </div>
          <button type="button" className="goal-edit-dialog__close" onClick={onClose}>
            ✕
          </button>
        </header>

        {errorMessage && <p className="goal-edit-dialog__error">{errorMessage}</p>}

        <form className="goal-edit-dialog__form" onSubmit={handleSubmit}>
          <LifeAreaPicker
            primary={formData.lifeWheelCategory}
            secondary={formData.secondaryCategories}
            onChangePrimary={(key) => setFormData((current) => ({ ...current, lifeWheelCategory: key }))}
            onChangeSecondary={(keys) => setFormData((current) => ({ ...current, secondaryCategories: keys }))}
          />

          <label className="goal-edit-dialog__field">
            Goal title
            <input type="text" value={formData.title} onChange={handleFieldChange('title')} />
          </label>

          <label className="goal-edit-dialog__field">
            Description
            <textarea rows={3} value={formData.description} onChange={handleFieldChange('description')} />
          </label>

          <label className="goal-edit-dialog__field">
            Status
            <select value={formData.statusTag} onChange={handleFieldChange('statusTag')}>
              {GOAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="goal-edit-dialog__row">
            <label className="goal-edit-dialog__field">
              Start date
              <input type="date" value={formData.startDate} onChange={handleFieldChange('startDate')} />
            </label>
            <label className="goal-edit-dialog__field">
              Target date
              <input type="date" value={formData.targetDate} onChange={handleFieldChange('targetDate')} />
            </label>
          </div>

          <label className="goal-edit-dialog__field">
            Estimated duration (days)
            <input
              type="number"
              min="1"
              value={formData.estimatedDurationDays}
              onChange={handleFieldChange('estimatedDurationDays')}
            />
          </label>

          <label className="goal-edit-dialog__field">
            Timing notes
            <textarea rows={3} value={formData.timingNotes} onChange={handleFieldChange('timingNotes')} />
          </label>

          <div className="goal-edit-dialog__actions">
            <button type="button" className="goal-edit-dialog__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="goal-edit-dialog__save" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
