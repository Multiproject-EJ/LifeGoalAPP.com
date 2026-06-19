import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  EXPERIMENTAL_FEATURES,
  getExperimentalFeatures,
  saveExperimentalFeatures,
  type ExperimentalFeatureState,
} from '../../services/experimentalFeatures';

interface ExperimentalFeaturesSectionProps {
  session: Session;
  isAdmin?: boolean;
  onLaunchYesterdayTodoCleanup?: () => void;
}

export function ExperimentalFeaturesSection({
  session,
  isAdmin = false,
  onLaunchYesterdayTodoCleanup,
}: ExperimentalFeaturesSectionProps) {
  const [features, setFeatures] = useState<ExperimentalFeatureState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const userId = session.user.id;

  useEffect(() => {
    setFeatures(getExperimentalFeatures(userId));
  }, [userId]);

  const handleToggle = (key: keyof ExperimentalFeatureState, enabled: boolean) => {
    if (!features) return;

    const updated = {
      ...features,
      [key]: enabled,
    };

    setFeatures(updated);
    saveExperimentalFeatures(userId, updated);
    setMessage(enabled ? 'Experimental feature enabled.' : 'Experimental feature disabled.');

    setTimeout(() => setMessage(null), 2500);
  };

  if (!features) {
    return (
      <div className="account-panel__section">
        <h3 className="account-panel__section-title">Experimental Functions</h3>
        <p className="account-panel__loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="account-panel__section">
      <h3 className="account-panel__section-title">Experimental Functions</h3>
      <p className="account-panel__hint">
        Try upcoming features that are still in development. These are off by default and may change.
      </p>

      {EXPERIMENTAL_FEATURES.map((feature) => (
        <div className="account-panel__setting" key={feature.key}>
          <label className="account-panel__setting-label">
            <input
              type="checkbox"
              checked={features[feature.key]}
              onChange={(event) => handleToggle(feature.key, event.target.checked)}
              className="account-panel__checkbox"
            />
            <span className="account-panel__setting-text">
              <strong>{feature.title}</strong>
              <span className="account-panel__setting-description">{feature.description}</span>
            </span>
          </label>
        </div>
      ))}

      {isAdmin ? (
        <div className="account-panel__setting">
          <div className="account-panel__setting-label">
            <span className="account-panel__setting-text">
              <strong>Yesterday todo cleanup modal</strong>
              <span className="account-panel__setting-description">
                Admin-only manual launcher for the cleanup modal that normally appears after yesterday leaves unfinished todos.
              </span>
            </span>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onLaunchYesterdayTodoCleanup}
            disabled={!onLaunchYesterdayTodoCleanup}
          >
            Launch cleanup modal
          </button>
        </div>
      ) : null}

      {message ? <div className="account-panel__message account-panel__message--success">{message}</div> : null}

      <p className="account-panel__demo-notice">
        ⚗️ Experimental settings are stored on this device for now.
      </p>
    </div>
  );
}
