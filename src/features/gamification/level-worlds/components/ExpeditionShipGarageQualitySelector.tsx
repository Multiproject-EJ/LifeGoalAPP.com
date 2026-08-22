import {
  EXPEDITION_SHIP_GARAGE_QUALITY_OPTIONS,
  type ExpeditionShipGarageQualityPreference,
} from './expeditionShipGarageQuality';
import './ExpeditionShipGarageQualitySelector.css';

interface ExpeditionShipGarageQualitySelectorProps {
  value: ExpeditionShipGarageQualityPreference;
  onChange: (preference: ExpeditionShipGarageQualityPreference) => void;
  compact?: boolean;
}

export function ExpeditionShipGarageQualitySelector({
  value,
  onChange,
  compact = false,
}: ExpeditionShipGarageQualitySelectorProps) {
  return (
    <fieldset className={`expedition-ship-quality${compact ? ' expedition-ship-quality--compact' : ''}`}>
      <legend>Render quality</legend>
      <div role="radiogroup" aria-label="Garage render quality">
        {EXPEDITION_SHIP_GARAGE_QUALITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={value === option.id ? 'is-active' : ''}
            title={option.description}
            onClick={() => onChange(option.id)}
          >
            <strong>{option.label}</strong>
            {!compact ? <span>{option.description}</span> : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
