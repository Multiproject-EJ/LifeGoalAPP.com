import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchAiSettings, upsertAiModel } from '../../services/aiSettings';
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL, type AiModel } from '../../types/aiModel';

type Props = {
  session: Session;
};

export function AiSettingsSection({ session }: Props) {
  const [selectedModel, setSelectedModel] = useState<AiModel>(DEFAULT_AI_MODEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    setLoading(true);
    fetchAiSettings(session.user.id)
      .then(({ data, error: fetchError }) => {
        if (!isActive) return;

        if (fetchError) {
          console.error('Failed to load AI settings:', fetchError);
          setError('Unable to load AI settings. Using default model.');
          return;
        }

        if (data?.model) {
          // Validate that the model is one of our supported models
          const isValidModel = AI_MODEL_OPTIONS.some(opt => opt.value === data.model);
          if (isValidModel) {
            setSelectedModel(data.model as AiModel);
          }
        }
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

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value as AiModel;
    if (newModel === selectedModel) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    const previousModel = selectedModel;
    setSelectedModel(newModel);

    try {
      const { error: saveError } = await upsertAiModel(session.user.id, newModel);
      
      if (saveError) throw saveError;
      
      setSuccessMessage('AI model preference saved successfully.');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setSelectedModel(previousModel);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save AI model preference.';
      setError(errorMessage);
      console.error('Error saving AI model:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-panel__card" aria-labelledby="account-ai-settings">
      <p className="account-panel__eyebrow">AI Settings</p>
      <h3 id="account-ai-settings">AI Model for Goal Suggestions</h3>
      <p className="account-panel__hint">
        Choose which OpenAI model to use when generating AI-powered goal suggestions. Higher-tier models provide better quality but cost more.
      </p>

      {error && (
        <p className="notification-preferences__message notification-preferences__message--error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="notification-preferences__message notification-preferences__message--success" role="status">
          {successMessage}
        </p>
      )}

      <div className="notification-preferences__control notification-preferences__control--inline">
        <label className="notification-preferences__inline">
          AI model
          <select
            value={selectedModel}
            onChange={handleModelChange}
            disabled={loading || saving}
            style={{ minWidth: '300px' }}
          >
            {AI_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {AI_MODEL_OPTIONS.find(opt => opt.value === selectedModel)?.description}
        </p>
      </div>

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
        <p style={{ fontSize: '0.875rem', margin: 0 }}>
          <strong>Cost comparison:</strong>
        </p>
        <ul style={{ fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
          <li><strong>nano:</strong> Fastest and cheapest option, good for basic suggestions</li>
          <li><strong>mini:</strong> Balanced quality and cost, recommended for most users</li>
          <li><strong>pro:</strong> Premium quality with highest cost, best for detailed planning</li>
        </ul>
      </div>
    </section>
  );
}
