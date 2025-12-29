import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchTelemetryPreference, upsertTelemetryPreference } from '../../services/telemetry';

type TelemetrySettingsSectionProps = {
  session: Session;
  isDemoExperience: boolean;
};

export function TelemetrySettingsSection({ session, isDemoExperience }: TelemetrySettingsSectionProps) {
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    setLoading(true);
    fetchTelemetryPreference(session.user.id)
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          console.error('Failed to load telemetry preference:', error);
          setErrorMessage('Unable to load telemetry preferences.');
          return;
        }
        setTelemetryEnabled(data?.telemetry_enabled ?? false);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [session.user.id]);

  const handleTelemetryToggle = async (enabled: boolean) => {
    const previous = telemetryEnabled;
    setTelemetryEnabled(enabled);
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await upsertTelemetryPreference(session.user.id, enabled);
      if (error) {
        throw error;
      }
      setSuccessMessage('Telemetry preferences saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setTelemetryEnabled(previous);
      const message = error instanceof Error ? error.message : 'Unable to save telemetry preferences.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="account-telemetry">
      <p className="account-panel__eyebrow">Game of Life telemetry</p>
      <h3 id="account-telemetry">Adaptive telemetry</h3>
      <p className="account-panel__hint">
        Opt in to share a minimal set of events so Game of Life can tune difficulty recommendations without collecting
        sensitive content. We never store journal text or habit details—only high-level counts.
      </p>

      {isDemoExperience ? (
        <p className="account-panel__hint">Demo mode stores telemetry locally on this device.</p>
      ) : null}

      {errorMessage ? (
        <p className="notification-preferences__message notification-preferences__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="notification-preferences__message notification-preferences__message--success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="account-panel__toggle-row">
        <label className="account-panel__toggle-label">
          <input
            type="checkbox"
            checked={telemetryEnabled}
            onChange={(event) => handleTelemetryToggle(event.target.checked)}
            disabled={loading || saving}
            className="account-panel__toggle-input"
          />
          <span className="account-panel__toggle-text">Enable adaptive telemetry</span>
        </label>
      </div>

      <ul className="account-panel__hint" style={{ marginTop: '0.75rem' }}>
        <li>Onboarding completion</li>
        <li>Balance shifts across the four axes</li>
        <li>Coach intervention acceptances</li>
        <li>Game of Life micro-quest completions</li>
      </ul>
    </section>
  );
}
