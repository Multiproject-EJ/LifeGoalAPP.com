// Gamification Settings - Toggle to enable/disable gamification features

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchGamificationEnabled, updateGamificationEnabled } from '../../services/gamificationPrefs';
import { canUseSupabaseData } from '../../lib/supabaseClient';

interface GamificationSettingsProps {
  session: Session;
}

export function GamificationSettings({ session }: GamificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    </div>
  );
}
