import '../styles/feature-status.css';
import '../styles/feature-preview-overlay.css';

type FeaturePreviewOverlayVariant = 'preview' | 'notImplemented';

type FeaturePreviewOverlayProps = {
  label: string;
  variant?: FeaturePreviewOverlayVariant;
  body?: string;
  notImplementedBody?: string;
  backLabel?: string;
  onClose: () => void;
};

export function FeaturePreviewOverlay({
  label,
  variant = 'preview',
  body = 'This area is being shaped and tested. It will unlock when the feature is ready.',
  notImplementedBody = 'Admin access is enabled for this feature, but the implementation is not available yet.',
  backLabel = '← Back',
  onClose,
}: FeaturePreviewOverlayProps) {
  const isNotImplemented = variant === 'notImplemented';
  const badgeLabel = isNotImplemented ? 'Not implemented yet' : 'Preview';

  return (
    <div
      className="feature-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
    >
      <div
        className="feature-preview-overlay__backdrop"
        onClick={onClose}
      />
      <div className="feature-preview-overlay__panel">
        <div className="feature-preview-overlay__icon" aria-hidden="true">✨</div>
        <div className="feature-preview-overlay__badge-row">
          <span
            className="feature-status-badge feature-status-badge--preview"
            aria-label={`Feature status: ${badgeLabel}`}
          >
            {badgeLabel}
          </span>
        </div>
        <h2 className="feature-preview-overlay__title">{label}</h2>
        <p className="feature-preview-overlay__body">
          {isNotImplemented ? notImplementedBody : body}
        </p>
        <button
          type="button"
          className="feature-preview-overlay__back-btn"
          onClick={onClose}
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
