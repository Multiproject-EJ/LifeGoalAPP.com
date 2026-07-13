import type { Database } from '../../lib/database.types';
import type { LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { TimerLaunchContext } from '../timer/timerSession';
import type { FourVisionaryCategoryKey } from './categories';
import { getVisionTypeLabel } from './visionTypes';
import { VisionCardEditForm } from './VisionCardEditForm';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImage = VisionImageRow & { publicUrl: string };
type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];

type VisionCardProps = {
  image: VisionImage;
  selectMode: boolean;
  selected: boolean;
  canMutate: boolean;
  goalLookup: Map<string, string>;
  habitLookup: Map<string, string>;
  lifeWheelKeys: LifeWheelCategoryKey[];
  visionaryKeys: FourVisionaryCategoryKey[];
  lifeWheelLabelLookup: Map<LifeWheelCategoryKey, string>;
  visionaryLabelLookup: Map<FourVisionaryCategoryKey, string>;
  isEditing: boolean;
  goals: GoalRow[];
  habits: HabitRow[];
  onToggleSelected: (imageId: string) => void;
  onOpenLightbox: (imageId: string) => void;
  onNavigateToTimer?: (context?: TimerLaunchContext) => void;
  onStartEditing: (image: VisionImage) => void;
  onStartTagging: (image: VisionImage) => void;
  onDelete: (image: VisionImage) => void;
  onSaveEdit: (imageId: string, updates: Partial<VisionImageRow>) => Promise<boolean>;
  onCancelEdit: () => void;
};

export function VisionCard({
  image,
  selectMode,
  selected,
  canMutate,
  goalLookup,
  habitLookup,
  lifeWheelKeys,
  visionaryKeys,
  lifeWheelLabelLookup,
  visionaryLabelLookup,
  isEditing,
  goals,
  habits,
  onToggleSelected,
  onOpenLightbox,
  onNavigateToTimer,
  onStartEditing,
  onStartTagging,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: VisionCardProps) {
  const linkedGoals = image.linked_goal_ids ?? [];
  const linkedHabits = image.linked_habit_ids ?? [];
  const isOrphan = linkedGoals.length === 0 && linkedHabits.length === 0;
  const goalLabels = linkedGoals.map((id) => goalLookup.get(id)).filter(Boolean) as string[];
  const habitLabels = linkedHabits.map((id) => habitLookup.get(id)).filter(Boolean) as string[];
  const lifeWheelLabels = lifeWheelKeys.map((key) => lifeWheelLabelLookup.get(key)).filter(Boolean) as string[];
  const visionaryLabels = visionaryKeys.map((key) => visionaryLabelLookup.get(key)).filter(Boolean) as string[];
  const label = image.caption?.trim() || 'Vision board entry';

  return (
    <article
      className={`vision-board__card${selectMode && selected ? ' vision-board__card--selected' : ''}`}
      role="listitem"
    >
      <div className="vision-board__card-image-container">
        {selectMode && (
          <label className="vision-board__select-checkbox">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelected(image.id)}
              aria-label={`Select ${label}`}
            />
          </label>
        )}
        {image.publicUrl ? (
          <button
            type="button"
            className="vision-board__card-image-button"
            onClick={() => onOpenLightbox(image.id)}
            aria-label={`View ${label} full screen`}
          >
            <img
              src={image.publicUrl}
              alt={image.caption ?? 'Vision board entry'}
              loading="lazy"
              onError={(event) => {
                const target = event.currentTarget;
                target.style.display = 'none';
                target.parentElement?.classList.add('vision-board__card-image-button--broken');
              }}
            />
            <span className="vision-board__card-image-broken" aria-hidden>
              Image unavailable
            </span>
          </button>
        ) : (
          <div className="vision-board__placeholder" aria-hidden>
            <span>No preview</span>
          </div>
        )}
        {image.caption && (
          <div className="vision-board__card-overlay">
            <p>{image.caption}</p>
          </div>
        )}
      </div>
      <div className="vision-board__card-body">
        <div className="vision-board__card-meta">
          <span className="vision-board__chip">{getVisionTypeLabel(image.vision_type)}</span>
          {isOrphan && <span className="vision-board__chip vision-board__chip--orphan">Orphan</span>}
        </div>
        {lifeWheelLabels.length > 0 && (
          <div className="vision-board__card-tags">
            {lifeWheelKeys.map((key) => {
              const chipLabel = lifeWheelLabelLookup.get(key);
              if (!chipLabel) return null;
              return (
                <span key={`${image.id}-${key}`} className="vision-board__chip vision-board__chip--category">
                  {chipLabel}
                </span>
              );
            })}
          </div>
        )}
        {visionaryLabels.length > 0 && (
          <div className="vision-board__card-tags">
            {visionaryKeys.map((key) => {
              const chipLabel = visionaryLabelLookup.get(key);
              if (!chipLabel) return null;
              return (
                <span key={`${image.id}-${key}`} className="vision-board__chip vision-board__chip--visionary">
                  {chipLabel}
                </span>
              );
            })}
          </div>
        )}
        {goalLabels.length > 0 && (
          <p className="vision-board__card-links">
            <strong>Goals:</strong> {goalLabels.join(', ')}
          </p>
        )}
        {habitLabels.length > 0 && (
          <p className="vision-board__card-links">
            <strong>Habits:</strong> {habitLabels.join(', ')}
          </p>
        )}
        {isOrphan && (
          <p className="vision-board__card-links vision-board__card-links--orphan">
            No links yet—attach a goal or habit to keep this Game of Life anchor grounded.
          </p>
        )}
      </div>
      <div className="vision-board__card-actions">
        <button
          type="button"
          onClick={() =>
            onNavigateToTimer?.({
              sourceType: 'vision',
              sourceId: image.id,
              sourceName: label,
            })
          }
          className="vision-board__edit"
          aria-label={`Start timer for vision image: ${label}`}
          title="Start timer"
        >
          ⏱️ Timer
        </button>
        <button type="button" onClick={() => onStartEditing(image)} className="vision-board__edit">
          Edit details
        </button>
        <button
          type="button"
          onClick={() => onStartTagging(image)}
          className="vision-board__edit"
          disabled={!canMutate}
        >
          Tag/Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(image)}
          className="vision-board__delete"
          disabled={!canMutate}
          title="Remove image"
        >
          Remove
        </button>
      </div>
      {isEditing && (
        <VisionCardEditForm
          image={image}
          goals={goals}
          habits={habits}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      )}
    </article>
  );
}
