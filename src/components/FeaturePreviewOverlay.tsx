import { useState } from 'react';
import '../styles/feature-status.css';
import '../styles/feature-preview-overlay.css';

type FeaturePreviewOverlayVariant = 'preview' | 'notImplemented';

type FeaturePreviewOverlayProps = {
  label: string;
  variant?: FeaturePreviewOverlayVariant;
  body?: string;
  notImplementedBody?: string;
  backLabel?: string;
  badgeLabel?: string;
  voteLabel?: string;
  voteConfirmation?: string;
  onClose: () => void;
};

export function FeaturePreviewOverlay({
  label,
  variant = 'preview',
  body = 'HabitGame grows around what helps players stay motivated in real life. Vote if this is a feature you’d love to see next.',
  notImplementedBody = 'Admin access is enabled for this feature, but the implementation is not available yet.',
  backLabel = 'Back',
  badgeLabel = 'Future Feature',
  voteLabel = 'Vote for this',
  voteConfirmation = 'Thanks — your interest has been noted for the roadmap.',
  onClose,
}: FeaturePreviewOverlayProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const isNotImplemented = variant === 'notImplemented';
  const statusLabel = isNotImplemented ? 'Not implemented yet' : badgeLabel;

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
             aria-label={`Feature status: ${statusLabel}`}
           >
             {statusLabel}
           </span>
         </div>
         <h2 className="feature-preview-overlay__title">{label}</h2>
         <p className="feature-preview-overlay__body">
           {isNotImplemented ? notImplementedBody : body}
         </p>
        {!isNotImplemented ? (
          <>
            <button
              type="button"
              className="feature-preview-overlay__vote-btn"
              onClick={() => setHasVoted(true)}
              disabled={hasVoted}
            >
              {hasVoted ? 'Vote noted' : voteLabel}
            </button>
            {hasVoted ? (
              <p className="feature-preview-overlay__confirmation" role="status">
                {voteConfirmation}
              </p>
            ) : null}
          </>
        ) : null}
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
