import { useEffect, useState, useId } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  featureAvailabilityRegistry,
  getFeatureAvailability,
  type FeatureAvailabilityId,
} from '../config/featureAvailability';
import {
  EXPERIMENTAL_FEATURES,
  getExperimentalFeatures,
  saveExperimentalFeatures,
  type ExperimentalFeatureState,
} from '../services/experimentalFeatures';
import {
  getUserEnabledFeatures,
  setUserFeatureEnabled,
  USER_FEATURE_OVERRIDES_UPDATED_EVENT,
} from '../services/userFeatureOverrides';
import { upsertFeatureVote } from '../services/featureVotes';
import { notifyFutureFeatureVoteSaved } from '../services/futureFeatureEngagement';
import '../styles/experiments-modal.css';

const FEATURE_ICONS: Partial<Record<FeatureAvailabilityId, string>> = {
  'app.body': '💪',
  'app.contracts': '🤝',
  'app.routines': '🔄',
  'today.visionStar': '⭐',
  'today.waterZenTree': '🌿',
  'today.feedCreatures': '🦋',
  'actions.taskTower': '🏗️',
  'actions.visionBoard': '🎯',
  'mind.meditation': '🧘',
  'mind.conflictResolver': '⚖️',
  'body.yoga': '🤸',
  'body.food': '🥗',
  'body.exercise': '🏃',
  'score.playerShop': '🛒',
  'score.garage': '🚀',
  'score.achievements': '🏆',
  'score.leaderboard': '📊',
  'score.bank': '💰',
  'score.creatureSanctuary': '🏝️',
  'score.stickersGallery': '🎨',
  'score.zenGarden': '🌸',
  'settings.holidayThemes': '🎊',
  'settings.notifications': '🔔',
  'future.socialQuests': '🧑‍🤝‍🧑',
  'future.aiQuestCoach': '🤖',
};

/** All demo features eligible for user unlock, excluding the Experiments card itself. */
const DEMO_FEATURE_IDS: FeatureAvailabilityId[] = (
  Object.values(featureAvailabilityRegistry) as Array<{ id: FeatureAvailabilityId; status: string; adminAccess: string }>
)
  .filter(
    (f) =>
      f.status === 'demo' &&
      f.id !== 'settings.experimentalFeatures' &&
      f.adminAccess === 'open',
  )
  .map((f) => f.id as FeatureAvailabilityId);

const COMING_SOON_IDS: FeatureAvailabilityId[] = ['future.socialQuests', 'future.aiQuestCoach'];

type ExperimentsModalProps = {
  session: Session;
  onClose: () => void;
};

export function ExperimentsModal({ session, onClose }: ExperimentsModalProps) {
  const userId = session.user.id;
  const titleId = useId();
  const [enabledOverrides, setEnabledOverrides] = useState<Set<FeatureAvailabilityId>>(
    () => getUserEnabledFeatures(userId),
  );
  const [inDevFeatures, setInDevFeatures] = useState<ExperimentalFeatureState | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<FeatureAvailabilityId>>(new Set());
  const [votingId, setVotingId] = useState<FeatureAvailabilityId | null>(null);

  // Lock body scroll while modal is open (same pattern as FeaturePreviewOverlay).
  useEffect(() => {
    document.body.classList.add('feature-preview-overlay-open');
    return () => {
      document.body.classList.remove('feature-preview-overlay-open');
    };
  }, []);

  useEffect(() => {
    setInDevFeatures(getExperimentalFeatures(userId));
  }, [userId]);

  // Keep local state in sync when overrides are changed from outside.
  useEffect(() => {
    const handleUpdate = () => {
      setEnabledOverrides(getUserEnabledFeatures(userId));
    };
    window.addEventListener(USER_FEATURE_OVERRIDES_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(USER_FEATURE_OVERRIDES_UPDATED_EVENT, handleUpdate);
  }, [userId]);

  const showMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2400);
  };

  const handleDemoToggle = (featureId: FeatureAvailabilityId, enabled: boolean) => {
    setUserFeatureEnabled(userId, featureId, enabled);
    setEnabledOverrides(getUserEnabledFeatures(userId));
    const label = getFeatureAvailability(featureId).label;
    showMsg(enabled ? `${label} unlocked.` : `${label} locked.`);
  };

  const handleInDevToggle = (key: keyof ExperimentalFeatureState, enabled: boolean) => {
    if (!inDevFeatures) return;
    const updated = { ...inDevFeatures, [key]: enabled };
    setInDevFeatures(updated);
    saveExperimentalFeatures(userId, updated);
    const feature = EXPERIMENTAL_FEATURES.find((f) => f.key === key);
    showMsg(enabled ? `${feature?.title ?? 'Feature'} enabled.` : `${feature?.title ?? 'Feature'} disabled.`);
  };

  const handleVote = async (featureId: FeatureAvailabilityId) => {
    if (votedIds.has(featureId) || votingId === featureId) return;
    setVotingId(featureId);
    const feature = getFeatureAvailability(featureId);
    const sourceRoute =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined;
    await upsertFeatureVote({
      featureId,
      voteState: 'would_help_my_quest',
      sourceSurface: feature.surface,
      sourceRoute,
      featureCategory: feature.voteCategory ?? feature.category,
      metadata: {
        featureLabel: feature.label,
        status: feature.status,
        surface: feature.surface,
        category: feature.category,
        voteCategory: feature.voteCategory,
      },
    });
    notifyFutureFeatureVoteSaved(featureId);
    setVotedIds((prev) => new Set([...prev, featureId]));
    setVotingId(null);
    showMsg(`Vote recorded for ${feature.label}!`);
  };

  return (
    <div
      className="experiments-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="experiments-modal__backdrop"
        aria-label="Close experiments"
        onClick={onClose}
      />
      <div className="experiments-modal__panel">
        <div className="experiments-modal__header">
          <div className="experiments-modal__title-group">
            <div className="experiments-modal__icon" aria-hidden="true">⚗️</div>
            <h2 className="experiments-modal__title" id={titleId}>
              Experiments
            </h2>
            <p className="experiments-modal__subtitle">
              Unlock demo features or vote on what gets built next.
            </p>
          </div>
          <button
            type="button"
            className="experiments-modal__close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="experiments-modal__body">
          {statusMsg ? (
            <div className="experiments-modal__status-msg" role="status">
              ✓ {statusMsg}
            </div>
          ) : null}

          {/* ── Demo Unlock section ───────────────────────── */}
          <div className="experiments-modal__section">
            <div className="experiments-modal__section-header">
              <p className="experiments-modal__section-eyebrow">Demo Unlocks</p>
              <p className="experiments-modal__section-hint">
                Toggle on to use a demo feature like an admin.
              </p>
            </div>
            {DEMO_FEATURE_IDS.map((featureId) => {
              const feature = getFeatureAvailability(featureId);
              const isEnabled = enabledOverrides.has(featureId);
              const icon = FEATURE_ICONS[featureId] ?? '✨';
              return (
                <div key={featureId} className="experiments-modal__feature-row">
                  <span
                    className="experiments-modal__feature-icon"
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <div className="experiments-modal__feature-info">
                    <span className="experiments-modal__feature-name">{feature.label}</span>
                    <span className="experiments-modal__feature-desc">{feature.shortPitch ?? feature.description}</span>
                  </div>
                  <div className="experiments-modal__feature-actions">
                    <label
                      className="experiments-modal__toggle"
                      aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${feature.label}`}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleDemoToggle(featureId, e.target.checked)}
                      />
                      <span className="experiments-modal__toggle-track" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="experiments-modal__divider" />

          {/* ── In Development section ────────────────────── */}
          <div className="experiments-modal__section">
            <div className="experiments-modal__section-header">
              <p className="experiments-modal__section-eyebrow">In Development</p>
              <p className="experiments-modal__section-hint">
                Unstable experiments — toggle to try early builds.
              </p>
            </div>
            {inDevFeatures
              ? EXPERIMENTAL_FEATURES.map((feature) => {
                  const isEnabled = inDevFeatures[feature.key];
                  return (
                    <div key={feature.key} className="experiments-modal__feature-row">
                      <span
                        className="experiments-modal__feature-icon"
                        aria-hidden="true"
                      >
                        🔬
                      </span>
                      <div className="experiments-modal__feature-info">
                        <span className="experiments-modal__feature-name">{feature.title}</span>
                        <span className="experiments-modal__feature-desc">{feature.description}</span>
                      </div>
                      <div className="experiments-modal__feature-actions">
                        <label
                          className="experiments-modal__toggle"
                          aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${feature.title}`}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleInDevToggle(feature.key, e.target.checked)}
                          />
                          <span className="experiments-modal__toggle-track" />
                        </label>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>

          <div className="experiments-modal__divider" />

          {/* ── Coming Soon / Vote section ────────────────── */}
          <div className="experiments-modal__section">
            <div className="experiments-modal__section-header">
              <p className="experiments-modal__section-eyebrow">Coming Soon</p>
              <p className="experiments-modal__section-hint">
                These features don't exist yet — vote to shape the roadmap.
              </p>
            </div>
            {COMING_SOON_IDS.map((featureId) => {
              const feature = getFeatureAvailability(featureId);
              const icon = FEATURE_ICONS[featureId] ?? '💡';
              const voted = votedIds.has(featureId);
              const isVoting = votingId === featureId;
              return (
                <div key={featureId} className="experiments-modal__feature-row">
                  <span
                    className={`experiments-modal__feature-icon experiments-modal__feature-icon--muted`}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <div className="experiments-modal__feature-info">
                    <span className={`experiments-modal__feature-name experiments-modal__feature-name--muted`}>
                      {feature.label}
                    </span>
                    <span className="experiments-modal__feature-desc">
                      {feature.shortPitch ?? feature.description}
                    </span>
                  </div>
                  <div className="experiments-modal__feature-actions">
                    <label
                      className="experiments-modal__toggle"
                      aria-label={`${feature.label} — not yet available`}
                    >
                      <input type="checkbox" disabled checked={false} onChange={() => undefined} />
                      <span className="experiments-modal__toggle-track" />
                    </label>
                    <button
                      type="button"
                      className="experiments-modal__vote-btn"
                      onClick={() => handleVote(featureId)}
                      disabled={voted || isVoting}
                      aria-label={voted ? `You voted for ${feature.label}` : `Vote for ${feature.label}`}
                    >
                      {voted ? '✓ Voted' : isVoting ? '…' : '+ Vote'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
