import {
  COMPASS_BOOK_PRESENTATION_MODES,
  type CompassBookPresentationMode,
  type CompassBookResolvedPresentation,
} from '../logic/presentation';

const MODE_LABELS: Record<CompassBookPresentationMode, string> = {
  auto: 'Auto',
  '2d': '2D',
  '3d': '3D',
};

export function CompassBookPresentationControl({
  preference,
  resolved,
  onChange,
}: {
  preference: CompassBookPresentationMode;
  resolved: CompassBookResolvedPresentation;
  onChange: (mode: CompassBookPresentationMode) => void;
}) {
  return (
    <div className="compass-book__presentation-control">
      <span className="compass-book__presentation-label" aria-hidden="true">View</span>
      <div
        className="compass-book__presentation-options"
        role="radiogroup"
        aria-label={`Compass Book presentation. Currently showing ${resolved.toUpperCase()}.`}
      >
        {COMPASS_BOOK_PRESENTATION_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={preference === mode}
            className={preference === mode ? 'is-selected' : ''}
            onClick={() => onChange(mode)}
            title={
              mode === 'auto'
                ? 'Use 3D for Island Run browsing and 2D for focused work'
                : `Always prefer the ${MODE_LABELS[mode]} presentation`
            }
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
