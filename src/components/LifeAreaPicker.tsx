import { LIFE_WHEEL_VISUALS } from '../features/life-wheel/lifeWheelVisuals';
import type { LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';

type LifeAreaPickerProps = {
  primary: LifeWheelCategoryKey;
  secondary: LifeWheelCategoryKey[];
  onChangePrimary: (key: LifeWheelCategoryKey) => void;
  onChangeSecondary: (keys: LifeWheelCategoryKey[]) => void;
};

/**
 * Visual, colour-coded picker for a goal's life areas. The primary area is
 * required (a goal is always anchored to one); the secondary areas are optional
 * and let a goal express the other areas it also touches.
 */
export function LifeAreaPicker({ primary, secondary, onChangePrimary, onChangeSecondary }: LifeAreaPickerProps) {
  const toggleSecondary = (key: LifeWheelCategoryKey) => {
    if (key === primary) return;
    onChangeSecondary(
      secondary.includes(key) ? secondary.filter((item) => item !== key) : [...secondary, key],
    );
  };

  const handlePrimaryChange = (key: LifeWheelCategoryKey) => {
    onChangePrimary(key);
    // A primary area can't also be a secondary one.
    if (secondary.includes(key)) {
      onChangeSecondary(secondary.filter((item) => item !== key));
    }
  };

  return (
    <div className="life-area-picker">
      <div className="life-area-picker__group">
        <div className="life-area-picker__group-head">
          <span className="life-area-picker__group-title">Primary life area</span>
          <span className="life-area-picker__group-req">required</span>
        </div>
        <div className="life-area-picker__chips" role="radiogroup" aria-label="Primary life area">
          {LIFE_WHEEL_VISUALS.map((visual) => {
            const isActive = visual.key === primary;
            return (
              <button
                key={visual.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`life-area-chip ${isActive ? 'life-area-chip--active' : ''}`}
                style={
                  isActive
                    ? { background: visual.color, borderColor: visual.color, color: '#fff' }
                    : { borderColor: visual.color, color: visual.color }
                }
                onClick={() => handlePrimaryChange(visual.key)}
              >
                <span className="life-area-chip__emoji" aria-hidden>
                  {visual.emoji}
                </span>
                <span className="life-area-chip__label">{visual.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="life-area-picker__group">
        <div className="life-area-picker__group-head">
          <span className="life-area-picker__group-title">Also touches on</span>
          <span className="life-area-picker__group-req life-area-picker__group-req--optional">optional</span>
        </div>
        <div className="life-area-picker__chips" aria-label="Secondary life areas">
          {LIFE_WHEEL_VISUALS.filter((visual) => visual.key !== primary).map((visual) => {
            const isActive = secondary.includes(visual.key);
            return (
              <button
                key={visual.key}
                type="button"
                aria-pressed={isActive}
                className={`life-area-chip life-area-chip--secondary ${isActive ? 'life-area-chip--active' : ''}`}
                style={
                  isActive
                    ? { background: visual.color, borderColor: visual.color, color: '#fff' }
                    : { borderColor: visual.color, color: visual.color }
                }
                onClick={() => toggleSecondary(visual.key)}
              >
                <span className="life-area-chip__emoji" aria-hidden>
                  {visual.emoji}
                </span>
                <span className="life-area-chip__label">{visual.shortLabel}</span>
                {isActive ? <span className="life-area-chip__check" aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
