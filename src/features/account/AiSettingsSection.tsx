import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getAiCoachAccess, updateAiCoachAccess } from '../../services/aiCoachAccess';
import { AI_COACH_ACCESS_FIELDS, type AiCoachDataAccess } from '../../types/aiCoach';

type Props = {
  session: Session;
};

export function AiSettingsSection({ session }: Props) {
  const [dataAccess, setDataAccess] = useState<AiCoachDataAccess>(() => getAiCoachAccess(session));
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessSuccessMessage, setAccessSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setDataAccess(getAiCoachAccess(session));
    // Re-read only when the signed-in user changes, not on every session refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const handleAccessToggle = async (key: keyof AiCoachDataAccess, enabled: boolean) => {
    const previousAccess = dataAccess;
    const nextAccess = { ...dataAccess, [key]: enabled };
    setDataAccess(nextAccess);
    setAccessSaving(true);
    setAccessError(null);
    setAccessSuccessMessage(null);

    try {
      const { error: saveError } = await updateAiCoachAccess(session, nextAccess);

      if (saveError) {
        throw saveError;
      }

      setAccessSuccessMessage('AI coach privacy settings saved.');
      setTimeout(() => setAccessSuccessMessage(null), 3000);
    } catch (err) {
      setDataAccess(previousAccess);
      const message = err instanceof Error ? err.message : 'Failed to save AI coach privacy settings.';
      setAccessError(message);
      console.error('Error saving AI coach access:', err);
    } finally {
      setAccessSaving(false);
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="account-ai-settings">
      <div>
        <p className="account-panel__eyebrow">AI Coach privacy</p>
        <h3 id="account-ai-settings">Choose what the coach can read</h3>
        <p className="account-panel__hint">
          These toggles control which Game of Life data the coach can reference when offering guidance.
        </p>

        {accessError && (
          <p className="notification-preferences__message notification-preferences__message--error" role="alert">
            {accessError}
          </p>
        )}

        {accessSuccessMessage && (
          <p className="notification-preferences__message notification-preferences__message--success" role="status">
            {accessSuccessMessage}
          </p>
        )}

        {AI_COACH_ACCESS_FIELDS.map((field) => (
          <div key={field.key} className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input
                type="checkbox"
                checked={dataAccess[field.key]}
                onChange={(event) => handleAccessToggle(field.key, event.target.checked)}
                disabled={accessSaving}
                className="account-panel__toggle-input"
              />
              <span className="account-panel__toggle-text">{field.label}</span>
            </label>
            <p className="account-panel__hint" style={{ marginTop: '0.25rem' }}>
              {field.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
