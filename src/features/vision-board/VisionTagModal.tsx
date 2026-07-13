import { useState } from 'react';
import type { Database } from '../../lib/database.types';
import { setVisionImageCategories } from '../../services/visionBoardTags';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import { FOUR_VISIONARIES, type FourVisionaryCategoryKey } from './categories';
import { useModalA11y } from './useModalA11y';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImage = VisionImageRow & { publicUrl: string };

type VisionTagModalProps = {
  image: VisionImage;
  userId: string;
  canSave: boolean;
  initialLifeWheel: LifeWheelCategoryKey[];
  initialVisionary: FourVisionaryCategoryKey[];
  onClose: () => void;
  onSaved: (
    imageId: string,
    lifeWheel: LifeWheelCategoryKey[],
    visionary: FourVisionaryCategoryKey[],
  ) => void;
  onError: (message: string) => void;
};

function toggle<T extends string>(current: T[], id: T): T[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

/**
 * Modal for assigning an image to life-wheel and Four Visionaries categories.
 * Owns its draft state and the save call; the parent supplies the current tags
 * and receives the saved result via onSaved.
 */
export function VisionTagModal({
  image,
  userId,
  canSave,
  initialLifeWheel,
  initialVisionary,
  onClose,
  onSaved,
  onError,
}: VisionTagModalProps) {
  const [lifeWheelDraft, setLifeWheelDraft] = useState<LifeWheelCategoryKey[]>(initialLifeWheel);
  const [visionaryDraft, setVisionaryDraft] = useState<FourVisionaryCategoryKey[]>(initialVisionary);
  const [saving, setSaving] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>(true, onClose);

  const lifeWheelAvailable = LIFE_WHEEL_CATEGORIES.length > 0;
  const visionariesAvailable = FOUR_VISIONARIES.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      onError('Connect Supabase to save vision board tags.');
      return;
    }
    setSaving(true);
    try {
      const [lifeWheelResult, visionaryResult] = await Promise.all([
        setVisionImageCategories(userId, image.id, lifeWheelDraft, 'life_wheel'),
        setVisionImageCategories(userId, image.id, visionaryDraft, 'four_visionaries'),
      ]);
      if (lifeWheelResult.error) throw lifeWheelResult.error;
      if (visionaryResult.error) throw visionaryResult.error;
      onSaved(
        image.id,
        (lifeWheelResult.data ?? []).map((tag) => tag.category_key as LifeWheelCategoryKey),
        (visionaryResult.data ?? []).map((tag) => tag.category_key as FourVisionaryCategoryKey),
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to save tags for this image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vision-board__modal-backdrop" onClick={onClose}>
      <div
        className="vision-board__modal vision-board__tag-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tag vision image"
        tabIndex={-1}
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vision-board__tag-header">
          <h3>Tag vision image</h3>
          <p>Select the life wheel areas and visionary themes this image supports.</p>
        </header>
        <div className="vision-board__tag-section">
          <h4>Life wheel categories</h4>
          {lifeWheelAvailable ? (
            <div className="vision-board__tag-list">
              {LIFE_WHEEL_CATEGORIES.map((category) => (
                <label key={category.key} className="vision-board__tag-option">
                  <input
                    type="checkbox"
                    checked={lifeWheelDraft.includes(category.key)}
                    onChange={() => setLifeWheelDraft((current) => toggle(current, category.key))}
                    disabled={saving}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="vision-board__hint">Life wheel categories are unavailable right now.</p>
          )}
        </div>
        <div className="vision-board__tag-section">
          <h4>The Four Visionaries</h4>
          {visionariesAvailable ? (
            <div className="vision-board__tag-list">
              {FOUR_VISIONARIES.map((category) => (
                <label key={category.key} className="vision-board__tag-option">
                  <input
                    type="checkbox"
                    checked={visionaryDraft.includes(category.key)}
                    onChange={() => setVisionaryDraft((current) => toggle(current, category.key))}
                    disabled={saving}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="vision-board__hint">Visionary categories are unavailable right now.</p>
          )}
        </div>
        <div className="vision-board__edit-actions">
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save tags'}
          </button>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
