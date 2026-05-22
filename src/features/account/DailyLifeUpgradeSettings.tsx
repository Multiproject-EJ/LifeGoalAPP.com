import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getDailyLifeUpgradeEnabled,
  setDailyLifeUpgradeEnabled,
} from '../../services/dailyLifeUpgradePrefs';

type DailyLifeUpgradeSettingsProps = {
  session: Session;
};

export function DailyLifeUpgradeSettings({ session }: DailyLifeUpgradeSettingsProps) {
  const userId = session.user.id;
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(getDailyLifeUpgradeEnabled(userId));
  }, [userId]);

  const handleToggle = (nextEnabled: boolean) => {
    setSaving(true);
    setEnabled(nextEnabled);
    setDailyLifeUpgradeEnabled(userId, nextEnabled);
    window.setTimeout(() => setSaving(false), 250);
  };

  return (
    <section className="account-panel__card" aria-labelledby="daily-life-upgrade-setting">
      <p className="account-panel__eyebrow">Daily Life Upgrade</p>
      <h3 id="daily-life-upgrade-setting">Daily Life Upgrade</h3>
      <p className="account-panel__hint">Get one small suggestion each day to improve a habit or goal.</p>
      <div className="account-panel__toggle-row">
        <label className="account-panel__toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleToggle(event.target.checked)}
            disabled={saving}
            className="account-panel__toggle-input"
          />
          <span className="account-panel__toggle-text">Enable Daily Life Upgrade</span>
        </label>
      </div>
    </section>
  );
}
