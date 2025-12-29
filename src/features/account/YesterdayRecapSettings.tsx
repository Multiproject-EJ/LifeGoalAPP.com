import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { canUseSupabaseData } from '../../lib/supabaseClient';
import {
  getYesterdayRecapEnabled,
  setYesterdayRecapEnabled,
} from '../../services/yesterdayRecapPrefs';

interface YesterdayRecapSettingsProps {
  session: Session;
}

export function YesterdayRecapSettings({ session }: YesterdayRecapSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const isDemoMode = !canUseSupabaseData();
  const userId = session.user.id;

  useEffect(() => {
    setEnabled(getYesterdayRecapEnabled(userId));
  }, [userId]);

  const handleToggle = (nextValue: boolean) => {
    setSaving(true);
    setEnabled(nextValue);
    setYesterdayRecapEnabled(userId, nextValue);
    setTimeout(() => setSaving(false), 250);
  };

  return (
    <div className="account-panel__section">
      <h3 className="account-panel__section-title">Daily catch-up prompt</h3>
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
            <strong>Prompt me after a zero-habit day</strong>
            <span className="account-panel__setting-description">
              Show a quick morning recap when no habits were checked off yesterday.
            </span>
          </span>
        </label>
      </div>

      {isDemoMode && (
        <p className="account-panel__demo-notice">
          💡 Demo mode: This preference is stored locally in your browser.
        </p>
      )}
    </div>
  );
}
