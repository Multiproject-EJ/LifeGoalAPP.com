import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { HolidayPreferences } from '../../services/holidayPreferences';
import { fetchHolidayPreferences, upsertHolidayPreferences } from '../../services/holidayPreferences';

export const HOLIDAY_OPTIONS = [
  {
    id: 'new_year',
    label: 'New Year',
    emoji: '🎉',
    description: 'Confetti, countdowns, and fresh-start energy.',
  },
  {
    id: 'valentines_day',
    label: 'Valentine’s Day',
    emoji: '💘',
    description: 'Heart-forward themes and warm highlights.',
  },
  {
    id: 'st_patricks_day',
    label: 'St. Patrick’s Day',
    emoji: '☘️',
    description: 'Lucky greens and playful accents.',
  },
  {
    id: 'easter',
    label: 'Easter',
    emoji: '🐣',
    description: 'Spring pastels and soft gradients.',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    emoji: '🎃',
    description: 'Moody glows and spooky moments.',
  },
  {
    id: 'thanksgiving',
    label: 'Thanksgiving',
    emoji: '🦃',
    description: 'Cozy harvest palettes and gratitude vibes.',
  },
  {
    id: 'hanukkah',
    label: 'Hanukkah',
    emoji: '🕎',
    description: 'Candlelight shimmer and cool tones.',
  },
  {
    id: 'christmas',
    label: 'Christmas',
    emoji: '🎄',
    description: 'Festive sparkle with snow-bright highlights.',
  },
];

type HolidayPreferencesSectionProps = {
  session: Session;
  isDemoExperience: boolean;
};

const buildDefaultPreferences = (): HolidayPreferences =>
  HOLIDAY_OPTIONS.reduce<HolidayPreferences>((acc, holiday) => {
    acc[holiday.id] = false;
    return acc;
  }, {});

const mergePreferences = (stored: HolidayPreferences | null): HolidayPreferences => {
  const defaults = buildDefaultPreferences();
  if (!stored) return defaults;
  return Object.keys(defaults).reduce<HolidayPreferences>((acc, key) => {
    acc[key] = stored[key] ?? defaults[key];
    return acc;
  }, {});
};

export function HolidayPreferencesSection({ session, isDemoExperience }: HolidayPreferencesSectionProps) {
  const userId = session.user.id;
  const [preferences, setPreferences] = useState<HolidayPreferences>(() => buildDefaultPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disabled = isDemoExperience || saving;

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      setLoading(true);
      const { data, error } = await fetchHolidayPreferences(userId);
      if (!isMounted) return;

      if (error) {
        setErrorMessage('Unable to load holiday preferences.');
      }

      setPreferences(mergePreferences(data?.holidays ?? null));
      setLoading(false);
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const selectedCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences],
  );

  const savePreferences = async (nextPreferences: HolidayPreferences) => {
    setSaving(true);
    setErrorMessage(null);

    const { error } = await upsertHolidayPreferences(userId, nextPreferences);

    if (error) {
      setErrorMessage('Unable to save holiday preferences. Please try again.');
    }

    setSaving(false);
  };

  const handleToggle = (holidayId: string, nextValue: boolean) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        [holidayId]: nextValue,
      };

      if (!isDemoExperience) {
        void savePreferences(updated);
      }

      return updated;
    });
  };

  return (
    <section className="account-panel__card" aria-labelledby="holiday-preferences">
      <p className="account-panel__eyebrow">Seasonal themes</p>
      <h3 id="holiday-preferences">Holiday highlights</h3>
      <p className="account-panel__hint">
        Choose which holidays can unlock themed visuals and motivation moments across the app.
      </p>
      {isDemoExperience ? (
        <p className="account-panel__hint">
          Demo mode keeps these preferences locally. Connect to Supabase to save them for your account.
        </p>
      ) : null}
      {loading ? (
        <p className="account-panel__saving-indicator">Loading preferences…</p>
      ) : (
        <div className="holiday-preferences" role="group" aria-label="Holiday theme preferences">
          {HOLIDAY_OPTIONS.map((holiday) => (
            <div key={holiday.id} className="holiday-preferences__item">
              <div className="holiday-preferences__row">
                <label className="account-panel__toggle-label">
                  <input
                    type="checkbox"
                    className="account-panel__toggle-input"
                    checked={Boolean(preferences[holiday.id])}
                    disabled={disabled}
                    onChange={(event) => handleToggle(holiday.id, event.target.checked)}
                  />
                  <span className="account-panel__toggle-text">
                    <span className="holiday-preferences__emoji" aria-hidden="true">
                      {holiday.emoji}
                    </span>
                    {holiday.label}
                  </span>
                </label>
              </div>
              <p className="holiday-preferences__description">{holiday.description}</p>
            </div>
          ))}
        </div>
      )}
      {saving ? <p className="account-panel__saving-indicator">Saving changes…</p> : null}
      {errorMessage ? <p className="account-panel__saving-indicator">{errorMessage}</p> : null}
      {!loading && !errorMessage ? (
        <p className="account-panel__saving-indicator">{selectedCount} holiday themes enabled.</p>
      ) : null}
    </section>
  );
}
