import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { DEMO_FEATURE_LABEL, getFeatureAvailability, type FeatureAvailabilityId } from '../config/featureAvailability';
import { upsertFeatureVote, type FeatureVoteState } from '../services/featureVotes';
import { markFutureFeatureSeen, notifyFutureFeatureVoteSaved } from '../services/futureFeatureEngagement';
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
  progressionUnlock?: {
    currentIsland: number;
    unlockIsland: number;
    eyebrow?: string;
    body?: string;
  };
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

const FEATURE_ICON_BY_CATEGORY: Record<string, string> = {
  workspace: '🗺️',
  lifeTools: '🧭',
  today: '✨',
  actions: '🏰',
  mind: '🌙',
  body: '🌿',
  scoreHub: '🏆',
};

const DEFAULT_PREVIEW_BODY = 'HabitGame grows around what helps players stay motivated in real life. Vote if this is a feature you’d love to see next.';

export function FeaturePreviewOverlay({
  featureId,
  label,
  variant = 'preview',
  body = DEFAULT_PREVIEW_BODY,
  notImplementedBody = 'Admin access is enabled for this feature, but the implementation is not available yet.',
  backLabel = 'Back',
  statusLabelOverride = DEMO_FEATURE_LABEL,
  voteLabel = 'Shape this feature',
  voteConfirmation = 'Thanks — your feedback helps shape the HabitGame roadmap.',
  progressionUnlock,
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
  const featureIcon = FEATURE_ICON_BY_CATEGORY[featureAvailability.category ?? ''] ?? '🔮';
  const featurePitch = isNotImplemented
    ? notImplementedBody
    : body !== DEFAULT_PREVIEW_BODY
      ? body
      : featureAvailability.shortPitch ?? body;
  const previewScreenshots = featureAvailability.previewScreenshots ?? [];
  const [activeScreenshot, setActiveScreenshot] = useState<number | null>(null);
  const isProgressionUnlock = Boolean(progressionUnlock);
  const currentIsland = Math.max(1, Math.trunc(progressionUnlock?.currentIsland ?? 1));
  const unlockIsland = Math.max(currentIsland, Math.trunc(progressionUnlock?.unlockIsland ?? currentIsland));
  const unlockProgress = unlockIsland <= 1
    ? 100
    : Math.min(100, Math.max(0, ((currentIsland - 1) / (unlockIsland - 1)) * 100));

  useEffect(() => {
    markFutureFeatureSeen(featureId);
    document.body.classList.add('feature-preview-overlay-open');

    return () => {
      document.body.classList.remove('feature-preview-overlay-open');
    };
  }, [featureId]);

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
    notifyFutureFeatureVoteSaved(featureId);
  };

  const overlay = (
    <div
      className={`feature-preview-overlay${isProgressionUnlock ? ' feature-preview-overlay--progression' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
    >
      <div
        className="feature-preview-overlay__backdrop"
        onClick={onClose}
      />
      <div className="feature-preview-overlay__panel">
        {isProgressionUnlock ? (
          <div className="feature-preview-overlay__progression-art" aria-hidden="true" />
        ) : null}
        <div className="feature-preview-overlay__spark-field" aria-hidden="true">
          <span>✦</span><span>✧</span><span>✦</span><span>·</span><span>✧</span>
        </div>
        <div className="feature-preview-overlay__unlock-emblem" aria-hidden="true">
          <span className="feature-preview-overlay__unlock-ring" />
          <span className="feature-preview-overlay__unlock-icon">{featureIcon}</span>
          <span className="feature-preview-overlay__unlock-lock">🔒</span>
        </div>
        <div className="feature-preview-overlay__hero-copy">
          <p className="feature-preview-overlay__eyebrow">
            {progressionUnlock?.eyebrow ?? 'Play to unlock'}
          </p>
          {!isProgressionUnlock ? (
            <div className="feature-preview-overlay__badge-row">
              <span
                className="feature-status-badge feature-status-badge--preview"
                aria-label={`Feature status: ${statusLabel}`}
              >
                {statusLabel}
              </span>
            </div>
          ) : null}
          <h2 className="feature-preview-overlay__title">{label}</h2>
          <p className="feature-preview-overlay__body">
            {progressionUnlock?.body ?? featurePitch}
          </p>
        </div>

        {isProgressionUnlock ? (
          <div className="feature-preview-overlay__island-progress" aria-label={`Island ${currentIsland} of ${unlockIsland}`}>
            <div className="feature-preview-overlay__island-progress-labels">
              <span>Island {currentIsland}</span>
              <span>Island {unlockIsland}</span>
            </div>
            <div className="feature-preview-overlay__island-progress-track" aria-hidden="true">
              <span style={{ width: `${unlockProgress}%` }} />
            </div>
          </div>
        ) : !isNotImplemented ? (
          <div className="feature-preview-overlay__unlock-path" aria-label="Feature unlock path">
            <div className="feature-preview-overlay__unlock-step is-complete">
              <span aria-hidden="true">✓</span>
              <small>Discovered</small>
            </div>
            <span className="feature-preview-overlay__unlock-line is-complete" aria-hidden="true" />
            <div className="feature-preview-overlay__unlock-step is-current">
              <span aria-hidden="true">▶</span>
              <small>Keep playing</small>
            </div>
            <span className="feature-preview-overlay__unlock-line" aria-hidden="true" />
            <div className="feature-preview-overlay__unlock-step">
              <span aria-hidden="true">🔒</span>
              <small>Unlock</small>
            </div>
          </div>
        ) : null}

        <p className="feature-preview-overlay__unlock-note">
          {isProgressionUnlock
            ? `Keep building your island to awaken ${label}.`
            : isNotImplemented
            ? notImplementedBody
            : 'Continue your island journey. When this release path is ready, your play will lead you back here.'}
        </p>
        {previewScreenshots.length > 0 ? (
          <div className="feature-preview-overlay__screenshots" aria-label="Feature preview screenshots">
            {previewScreenshots.map((screenshot, index) => (
              <button
                type="button"
                key={`${screenshot.src}-${index}`}
                className="feature-preview-overlay__screenshot"
                onClick={() => setActiveScreenshot(index)}
                aria-label={`Open screenshot ${index + 1} in full screen`}
              >
                <img src={screenshot.src} alt={screenshot.alt} loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
        {isProgressionUnlock ? (
          <button
            type="button"
            className="feature-preview-overlay__vote-btn"
            onClick={onClose}
          >
            Keep playing
          </button>
        ) : !isNotImplemented ? (
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
          <span aria-hidden="true">←</span> {backLabel}
        </button>
      </div>
      {activeScreenshot !== null ? (
        <div
          className="feature-preview-overlay__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Feature preview screenshot"
        >
          <button
            type="button"
            className="feature-preview-overlay__lightbox-backdrop"
            aria-label="Close screenshot preview"
            onClick={() => setActiveScreenshot(null)}
          />
          <div className="feature-preview-overlay__lightbox-panel">
            <img
              src={previewScreenshots[activeScreenshot]?.src}
              alt={previewScreenshots[activeScreenshot]?.alt ?? 'Feature screenshot'}
            />
            <button
              type="button"
              className="feature-preview-overlay__back-btn"
              onClick={() => setActiveScreenshot(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
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
                  <p className="feature-preview-overlay__feedback-eyebrow">{statusLabel}</p>
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

  return createPortal(overlay, document.body);
}
