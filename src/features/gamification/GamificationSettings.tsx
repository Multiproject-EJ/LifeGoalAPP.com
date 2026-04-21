// Gamification Settings - Toggle to enable/disable gamification features

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGamificationEnabled, updateGamificationEnabled } from '../../services/gamificationPrefs';
import { canUseSupabaseData, getSupabaseClient } from '../../lib/supabaseClient';
import { resetIslandRunProgress } from './level-worlds/services/islandRunProgressReset';

interface GamificationSettingsProps {
  session: Session;
}

export function GamificationSettings({ session }: GamificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isDemoMode = !canUseSupabaseData();
  const userId = session.user.id;

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchGamificationEnabled(userId);
      if (error) {
        console.error('Failed to load gamification settings:', error);
      } else if (data !== null) {
        setEnabled(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (newValue: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await updateGamificationEnabled(userId, newValue);
      
      if (error) {
        setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
      } else {
        setEnabled(newValue);
        setMessage({ 
          type: 'success', 
          text: newValue 
            ? 'Game of Life features enabled! Refresh to see changes.' 
            : 'Game of Life features disabled. Your progress is saved.' 
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-panel__section">
        <h3 className="account-panel__section-title">Game of Life</h3>
        <p className="account-panel__loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="account-panel__section">
      <h3 className="account-panel__section-title">
        Game of Life
        {isDemoMode && <span className="demo-badge">Demo Mode</span>}
      </h3>

      <div className="account-panel__setting">
        <label className="account-panel__setting-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={saving}
            className="account-panel__checkbox"
          />
          <span className="account-panel__setting-text">
            <strong>Enable Game of Life Features</strong>
            <span className="account-panel__setting-description">
              Show XP, levels, streaks, achievements, and progress indicators
            </span>
          </span>
        </label>
      </div>

      {enabled && (
        <div className="gamification-settings__preview">
          <h4 className="gamification-settings__preview-title">When enabled, you'll see:</h4>
          <ul className="gamification-settings__features">
            <li>🆙 Level badge and XP progress bar</li>
            <li>🔥 Daily streak counter</li>
            <li>❤️ Lives and streak freezes</li>
            <li>🏆 Achievement notifications</li>
            <li>🪙 Gold and rewards</li>
          </ul>
        </div>
      )}

      {!enabled && (
        <p className="gamification-settings__disabled-note">
          Your progress is safely stored and will be available when you re-enable Game of Life.
        </p>
      )}

      {message && (
        <div className={`account-panel__message account-panel__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {isDemoMode && (
        <p className="account-panel__demo-notice">
          💡 Demo mode: Settings stored locally. Sign in to sync across devices.
        </p>
      )}

      {/* ── Island Run Progress Reset ─────────────────────────────── */}
      <div className="account-panel__setting" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border, #e2e2e2)', paddingTop: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>🏝️ Island Run Progress</h4>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-secondary, #666)' }}>
          Reset your 120-island board game progress back to island 1 with starting resources.
          Your <strong>XP and level will also be reset to 1</strong>. Journals, habits, and achievements will <strong>not</strong> be affected.
        </p>

        {!resetConfirmOpen ? (
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetting}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--color-danger, #dc3545)',
              background: 'transparent',
              color: 'var(--color-danger, #dc3545)',
              cursor: 'pointer',
            }}
          >
            Reset Island Run Progress
          </button>
        ) : (
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--color-danger-bg, #fff3f3)', border: '1px solid var(--color-danger, #dc3545)' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠️ Are you sure?
            </p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary, #666)' }}>
              This will reset your island game to island 1 with 30 dice, 0 essence, and clear all
              island stops, eggs, and creatures. Your XP and level will also be reset to 1.
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleResetIslandProgress}
                disabled={resetting}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--color-danger, #dc3545)',
                  color: '#fff',
                  cursor: resetting ? 'wait' : 'pointer',
                  opacity: resetting ? 0.6 : 1,
                }}
              >
                {resetting ? 'Resetting…' : 'Yes, Reset Progress'}
              </button>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={resetting}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #ccc)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  async function handleResetIslandProgress() {
    setResetting(true);
    setMessage(null);

    try {
      const client = canUseSupabaseData() ? getSupabaseClient() : null;
      const result = await resetIslandRunProgress({ session, client });

      if (result.ok) {
        setResetConfirmOpen(false);
        setMessage({
          type: 'success',
          text: 'Island Run progress and XP have been reset! Your level is now 1.',
        });
        // Notify the gamification hook so the level chip updates immediately.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('gamificationProfileUpdated', {
              detail: { userId },
            }),
          );
        }
      } else {
        setMessage({
          type: 'error',
          text: `Failed to reset: ${result.errorMessage}`,
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred while resetting.' });
    } finally {
      setResetting(false);
    }
  }
}
