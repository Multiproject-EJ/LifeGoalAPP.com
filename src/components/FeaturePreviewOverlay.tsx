import { useEffect, useState, type FormEvent } from 'react';
import { getFeatureAvailability, type FeatureAvailabilityId } from '../config/featureAvailability';
import { upsertFeatureVote, type FeatureVoteState } from '../services/featureVotes';
import '../styles/feature-status.css';
import '../styles/feature-preview-overlay.css';

type FeaturePreviewOverlayVariant = 'preview' | 'notImplemented';
type FeatureFeedbackUsefulness = 'quest' | 'fun' | 'not_for_me';

type FeaturePreviewOverlayProps = {
  featureId: FeatureAvailabilityId;
  label: string;
  variant?: FeaturePreviewOverlayVariant;
  body?: string;
  notImplementedBody?: string;
  backLabel?: string;
  statusLabelOverride?: string;
  voteLabel?: string;
  voteConfirmation?: string;
  onClose: () => void;
};

const USEFULNESS_OPTIONS: Array<{ value: FeatureFeedbackUsefulness; label: string }> = [
  { value: 'quest', label: 'Would help my real-life quest' },
  { value: 'fun', label: 'Looks fun, but not essential' },
  { value: 'not_for_me', label: 'Not for me' },
];

const USEFULNESS_TO_VOTE_STATE: Record<FeatureFeedbackUsefulness, FeatureVoteState> = {
  quest: 'would_help_my_quest',
  fun: 'looks_fun',
  not_for_me: 'not_for_me',
};

export function FeaturePreviewOverlay({
  featureId,
  label,
  variant = 'preview',
  body = 'HabitGame grows around what helps players stay motivated in real life. Vote if this is a feature you’d love to see next.',
  notImplementedBody = 'Admin access is enabled for this feature, but the implementation is not available yet.',
  backLabel = 'Back',
  statusLabelOverride = 'Future Feature',
  voteLabel = 'Shape this feature',
  voteConfirmation = 'Thanks — your feedback helps shape the HabitGame roadmap.',
  onClose,
}: FeaturePreviewOverlayProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [usefulness, setUsefulness] = useState<FeatureFeedbackUsefulness>('quest');
  const [suggestion, setSuggestion] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const isNotImplemented = variant === 'notImplemented';
  const statusLabel = isNotImplemented ? 'Not implemented yet' : statusLabelOverride;
  const featureAvailability = getFeatureAvailability(featureId);

  useEffect(() => {
    document.body.classList.add('feature-preview-overlay-open');

    return () => {
      document.body.classList.remove('feature-preview-overlay-open');
    };
  }, []);

  const handleSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (feedbackSaving) return;

    setFeedbackSaving(true);
    setFeedbackError(null);
    const sourceRoute = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : undefined;
    const result = await upsertFeatureVote({
      featureId,
      voteState: USEFULNESS_TO_VOTE_STATE[usefulness],
      suggestionText: suggestion,
      sourceSurface: featureAvailability.surface,
      sourceRoute,
      featureCategory: featureAvailability.voteCategory ?? featureAvailability.category,
      metadata: {
        featureLabel: featureAvailability.label,
        status: featureAvailability.status,
        surface: featureAvailability.surface,
        category: featureAvailability.category,
        voteCategory: featureAvailability.voteCategory,
      },
    });
    setFeedbackSaving(false);

    if (result.error) {
      setFeedbackError(result.error.message || 'Failed to save roadmap feedback. Please try again.');
      return;
    }

    setFeedbackSubmitted(true);
  };

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
              onClick={() => setFeedbackOpen(true)}
              disabled={feedbackSubmitted}
            >
              {feedbackSubmitted ? 'Feedback sent' : voteLabel}
            </button>
            {feedbackSubmitted ? (
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
      {feedbackOpen ? (
        <div
          className="feature-preview-overlay__feedback-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Help shape ${label}`}
        >
          <button
            type="button"
            className="feature-preview-overlay__feedback-backdrop"
            aria-label="Close feature feedback"
            onClick={() => setFeedbackOpen(false)}
          />
          <div className="feature-preview-overlay__feedback-panel">
            {feedbackSubmitted ? (
              <>
                <div className="feature-preview-overlay__icon" aria-hidden="true">💛</div>
                <h3 className="feature-preview-overlay__feedback-title">Feedback sent</h3>
                <p className="feature-preview-overlay__feedback-subtitle" role="status">
                  {voteConfirmation}
                </p>
                <button
                  type="button"
                  className="feature-preview-overlay__vote-btn"
                  onClick={() => setFeedbackOpen(false)}
                >
                  Done
                </button>
              </>
            ) : (
              <form className="feature-preview-overlay__feedback-form" onSubmit={handleSubmitFeedback}>
                <div>
                  <p className="feature-preview-overlay__feedback-eyebrow">Future Feature</p>
                  <h3 className="feature-preview-overlay__feedback-title">Help shape this feature</h3>
                  <p className="feature-preview-overlay__feedback-subtitle">
                    HabitGame grows around what helps players stay motivated in real life.
                  </p>
                  {feedbackError ? (
                    <p className="feature-preview-overlay__feedback-error" role="alert">
                      {feedbackError}
                    </p>
                  ) : null}
                </div>
                <fieldset className="feature-preview-overlay__feedback-fieldset">
                  <legend>How useful would this be for your real-life quest?</legend>
                  {USEFULNESS_OPTIONS.map((option) => (
                    <label key={option.value} className="feature-preview-overlay__feedback-option">
                      <input
                        type="radio"
                        name="feature-usefulness"
                        value={option.value}
                        checked={usefulness === option.value}
                        onChange={() => setUsefulness(option.value)}
                        disabled={feedbackSaving}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="feature-preview-overlay__feedback-textarea">
                  <span>What would make this feature useful for you?</span>
                  <textarea
                    value={suggestion}
                    onChange={(event) => setSuggestion(event.target.value)}
                    disabled={feedbackSaving}
                    rows={4}
                    maxLength={500}
                    placeholder="Optional — share one idea, wish, or concern."
                  />
                </label>
                <div className="feature-preview-overlay__feedback-actions">
                  <button type="submit" className="feature-preview-overlay__vote-btn" disabled={feedbackSaving}>
                    {feedbackSaving ? 'Saving…' : 'Send feedback'}
                  </button>
                  <button
                    type="button"
                    className="feature-preview-overlay__back-btn"
                    onClick={() => setFeedbackOpen(false)}
                    disabled={feedbackSaving}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
