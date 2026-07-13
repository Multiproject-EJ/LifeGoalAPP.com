import { FormEvent, useState } from 'react';
import type { Database } from '../../lib/database.types';
import { DEFAULT_VISION_TYPE, VISION_TYPES } from './visionTypes';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImage = VisionImageRow & { publicUrl: string };
type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];

type VisionCardEditFormProps = {
  image: VisionImage;
  goals: GoalRow[];
  habits: HabitRow[];
  onSave: (imageId: string, updates: Partial<VisionImageRow>) => Promise<boolean>;
  onCancel: () => void;
};

function toggle<T extends string>(current: T[], id: T): T[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

/**
 * Inline "edit details" form for a vision card. Owns its own draft state
 * (seeded from the image) and saving flag; the parent supplies the persistence
 * via onSave and closes the form via onCancel / on success.
 */
export function VisionCardEditForm({ image, goals, habits, onSave, onCancel }: VisionCardEditFormProps) {
  const [caption, setCaption] = useState(image.caption ?? '');
  const [visionType, setVisionType] = useState(image.vision_type ?? DEFAULT_VISION_TYPE);
  const [linkedGoals, setLinkedGoals] = useState<string[]>(image.linked_goal_ids ?? []);
  const [linkedHabits, setLinkedHabits] = useState<string[]>(image.linked_habit_ids ?? []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const success = await onSave(image.id, {
      caption: caption.trim() ? caption.trim() : null,
      vision_type: visionType,
      linked_goal_ids: linkedGoals,
      linked_habit_ids: linkedHabits,
    });
    setSaving(false);
    if (success) {
      onCancel();
    }
  };

  return (
    <form className="vision-board__edit-form" onSubmit={handleSubmit}>
      <div className="vision-board__field">
        <label htmlFor={`vision-edit-caption-${image.id}`}>Caption</label>
        <input
          id={`vision-edit-caption-${image.id}`}
          type="text"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          disabled={saving}
        />
      </div>
      <div className="vision-board__field">
        <label htmlFor={`vision-edit-type-${image.id}`}>Vision type</label>
        <select
          id={`vision-edit-type-${image.id}`}
          value={visionType}
          onChange={(event) => setVisionType(event.target.value)}
          disabled={saving}
        >
          {VISION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="vision-board__field">
        <label>Linked goals</label>
        {goals.length === 0 ? (
          <span className="vision-board__hint">No goals available yet.</span>
        ) : (
          <div className="vision-board__link-grid">
            {goals.map((goal) => (
              <label key={goal.id} className="vision-board__link-option">
                <input
                  type="checkbox"
                  checked={linkedGoals.includes(goal.id)}
                  onChange={() => setLinkedGoals((current) => toggle(current, goal.id))}
                  disabled={saving}
                />
                <span>{goal.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="vision-board__field">
        <label>Linked habits</label>
        {habits.length === 0 ? (
          <span className="vision-board__hint">No habits available yet.</span>
        ) : (
          <div className="vision-board__link-grid">
            {habits.map((habit) => (
              <label key={habit.id} className="vision-board__link-option">
                <input
                  type="checkbox"
                  checked={linkedHabits.includes(habit.id)}
                  onChange={() => setLinkedHabits((current) => toggle(current, habit.id))}
                  disabled={saving}
                />
                <span>{habit.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="vision-board__edit-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save updates'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
