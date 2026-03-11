import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import { NotificationSettingsSection, PushNotificationTestPanel, DailyReminderPreferences, PerHabitReminderPrefs, ReminderActionDebugPanel, ReminderAnalyticsDashboard } from '../notifications';
import { AiSettingsSection } from './AiSettingsSection';
import { ExperimentalFeaturesSection } from './ExperimentalFeaturesSection';
import { YesterdayRecapSettings } from './YesterdayRecapSettings';
import { GamificationSettings } from '../gamification/GamificationSettings';
import { TelemetrySettingsSection } from './TelemetrySettingsSection';
import { SettingsFolderButton } from '../../components/SettingsFolderButton';
import { SettingsFolderPopup } from '../../components/SettingsFolderPopup';
import { HolidayPreferencesSection, HOLIDAY_OPTIONS } from './HolidayPreferencesSection';
import type { WorkspaceProfileRow } from '../../services/workspaceProfile';
import type { WorkspaceStats } from '../../services/workspaceStats';
import { upsertWorkspaceProfile } from '../../services/workspaceProfile';
import { generateInitials } from '../../utils/initials';
import { getHapticMode, setHapticMode, triggerCompletionHaptic, type HapticMode } from '../../utils/completionHaptics';
import { getLegacyAliasSunsetReadiness, type LegacyAliasSunsetReadiness } from '../../services/gameRewards';

type MyAccountPanelProps = {
  session: Session;
  isDemoExperience: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  onLaunchOnboarding?: (options?: { reset?: boolean }) => void;
  onLaunchDayZeroOnboarding?: (options?: { reset?: boolean }) => void;
  profile: WorkspaceProfileRow | null;
  stats: WorkspaceStats | null;
  profileLoading: boolean;
  onProfileUpdate?: (profile: WorkspaceProfileRow) => void;
  onLaunchWeeklyHabitReview?: () => void;
  onLaunchDailyCatchUpPrompt?: () => void;
};

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Not available';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, options).format(timestamp);
}

export function MyAccountPanel({
  session,
  isDemoExperience,
  isAuthenticated,
  onSignOut,
  onEditProfile,
  onLaunchOnboarding,
  onLaunchDayZeroOnboarding,
  profile,
  stats,
  profileLoading,
  onProfileUpdate,
  onLaunchWeeklyHabitReview,
  onLaunchDailyCatchUpPrompt,
}: MyAccountPanelProps) {
  const [folder1Open, setFolder1Open] = useState(false);
  const [folder2Open, setFolder2Open] = useState(false);
  const [holidayFolderOpen, setHolidayFolderOpen] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [hapticMode, setHapticModeState] = useState<HapticMode>('balanced');
  const [onboardingSnapshot, setOnboardingSnapshot] = useState<string | null>(null);
  const [dayZeroStored, setDayZeroStored] = useState(false);
  const [legacyAliasReadiness, setLegacyAliasReadiness] = useState<LegacyAliasSunsetReadiness | null>(null);
  
  const user = session.user;
  const userInitials = profile?.initials || generateInitials(profile?.full_name || '');

  const planName =
    (user.user_metadata?.subscription_plan as string | undefined) ||
    (isDemoExperience ? 'Demo preview' : 'LifeGoal workspace');
  const planStatus =
    (user.user_metadata?.subscription_status as string | undefined) ||
    (isDemoExperience ? 'Preview mode' : 'Active');
  const renewsOn = formatDate(
    (user.user_metadata?.subscription_renews_on as string | undefined) ?? null,
    {
      dateStyle: 'medium',
    },
  );

  const memberSince = formatDate(user.created_at, { dateStyle: 'medium' });
  const lastSignIn = formatDate(user.last_sign_in_at, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const isBirthdayGiftEnabled = profile?.birthday_gift_enabled ?? false;
  const lastBirthdayGiftClaimedLabel = formatDate(profile?.birthday_gift_last_claimed_at, { dateStyle: 'medium' });
  const nextBirthdayGiftEligibleLabel = profile?.birthday_gift_last_claimed_at
    ? formatDate(new Date(new Date(profile.birthday_gift_last_claimed_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), { dateStyle: 'medium' })
    : 'Now (if birthday matches today)';
  const showDemoNotice = isDemoExperience;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!onLaunchOnboarding && !onLaunchDayZeroOnboarding) return;
    const storageKey = `gol_onboarding_${session.user.id}`;
    const dayZeroKey = `day_zero_onboarding_${session.user.id}`;
    const storedValue = window.localStorage.getItem(storageKey);
    const dayZeroValue = window.localStorage.getItem(dayZeroKey);

    setDayZeroStored(Boolean(dayZeroValue));

    if (!storedValue) {
      setOnboardingSnapshot(null);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as {
        stepIndex?: number;
        tokens?: number;
        unlockedItemIds?: string[];
      };
      const stepIndex =
        typeof parsed.stepIndex === 'number' ? Math.min(parsed.stepIndex + 1, 20) : null;
      const tokens = typeof parsed.tokens === 'number' ? parsed.tokens : null;
      const unlockedCount = parsed.unlockedItemIds?.length ?? 0;
      const stepLabel = stepIndex ? `Loop ${stepIndex} of 20` : 'Loop progress unavailable';
      const tokenLabel = tokens !== null ? `${tokens} tokens banked` : 'Token balance unavailable';
      const unlockLabel = `${unlockedCount} shop unlock${unlockedCount === 1 ? '' : 's'}`;
      setOnboardingSnapshot(`${stepLabel} • ${tokenLabel} • ${unlockLabel}`);
    } catch {
      setOnboardingSnapshot('Stored onboarding progress is unreadable.');
    }
  }, [onLaunchOnboarding, onLaunchDayZeroOnboarding, session.user.id]);

  useEffect(() => {
    setHapticModeState(getHapticMode());
  }, []);

  const handleToggleInitialsInMenu = async (enabled: boolean) => {
    if (!profile || isDemoExperience) return;
    
    setSavingPreference(true);
    try {
      const { data, error } = await upsertWorkspaceProfile({
        ...profile,
        show_initials_in_menu: enabled,
      });
      
      if (error) {
        console.error('Failed to update initials preference:', error);
        return;
      }
      
      if (data && onProfileUpdate) {
        onProfileUpdate(data);
      }
    } catch (error) {
      console.error('Failed to update initials preference:', error);
    } finally {
      setSavingPreference(false);
    }
  };

  const handleToggleBirthdayGift = async (enabled: boolean) => {
    if (!profile || isDemoExperience) return;

    setSavingPreference(true);
    try {
      const { data, error } = await upsertWorkspaceProfile({
        ...profile,
        birthday_gift_enabled: enabled,
      });

      if (error) {
        console.error('Failed to update birthday gift preference:', error);
        return;
      }

      if (data && onProfileUpdate) {
        onProfileUpdate(data);
      }
    } catch (error) {
      console.error('Failed to update birthday gift preference:', error);
    } finally {
      setSavingPreference(false);
    }
  };

  const handleRunLegacyAliasScan = () => {
    setLegacyAliasReadiness(getLegacyAliasSunsetReadiness(session.user.id));
  };

  const handleClearAppCache = async () => {
    if (typeof window === 'undefined') return;

    setCacheClearing(true);
    setCacheStatus(null);

    try {
      let clearedCaches = 0;
      let clearedRegistrations = 0;

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        clearedCaches = cacheKeys.length;
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        clearedRegistrations = registrations.length;
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      setCacheStatus(
        `Cleared ${clearedCaches} cache${clearedCaches === 1 ? '' : 's'} and ${clearedRegistrations} service worker${
          clearedRegistrations === 1 ? '' : 's'
        }. Reloading…`,
      );
      window.setTimeout(() => window.location.reload(), 750);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setCacheStatus('Unable to clear the PWA cache. Check the console for details.');
    } finally {
      setCacheClearing(false);
    }
  };

  const handleLaunchWeeklyHabitReview = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`lifegoal.weekly-habit-review-launch:${session.user.id}`, 'true');
    window.dispatchEvent(new CustomEvent('lifegoal:launch-weekly-habit-review'));
    onLaunchWeeklyHabitReview?.();
  };

  return (
    <div className="account-panel">
      {showDemoNotice ? (
        <p className="account-panel__notice">
          You’re exploring demo data. Sign in to sync with your Supabase project.
        </p>
      ) : null}
      <section className="account-panel__card" aria-labelledby="account-theme">
        <p className="account-panel__eyebrow">Appearance</p>
        <ThemeSelector />
      </section>
      <div className="account-panel__summary-grid">
        {onLaunchOnboarding ? (
          <section className="account-panel__card" aria-labelledby="account-onboarding">
            <p className="account-panel__eyebrow">Onboarding</p>
            <h3 id="account-onboarding">Onboarding tools</h3>
            <p className="account-panel__hint">
              Launch the 20-step Game of Life onboarding or the Day Zero quick start.
            </p>
            <dl className="account-panel__details">
              <div>
                <dt>Local progress</dt>
                <dd>{onboardingSnapshot ?? 'No local progress saved yet.'}</dd>
              </div>
              <div>
                <dt>Day 0 storage</dt>
                <dd>{dayZeroStored ? 'Saved' : 'Not saved'}</dd>
              </div>
              <div>
                <dt>Storage key</dt>
                <dd>
                  <code>{`gol_onboarding_${session.user.id}`}</code>
                </dd>
              </div>
              <div>
                <dt>Day 0 key</dt>
                <dd>
                  <code>{`day_zero_onboarding_${session.user.id}`}</code>
                </dd>
              </div>
            </dl>
            <div className="account-panel__actions-row">
              <button
                type="button"
                className="btn"
                onClick={() => onLaunchOnboarding()}
              >
                Launch onboarding
              </button>
              {onLaunchDayZeroOnboarding ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => onLaunchDayZeroOnboarding()}
                >
                  Launch Day Zero quick start
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => onLaunchOnboarding({ reset: true })}
              >
                Restart 20-step onboarding
              </button>
              {onLaunchDayZeroOnboarding ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => onLaunchDayZeroOnboarding({ reset: true })}
                >
                  Restart Day Zero
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="account-panel__card" aria-labelledby="account-subscription">
          <p className="account-panel__eyebrow">Subscription</p>
          <h3 id="account-subscription">Plan overview</h3>
          <p className="account-panel__hint">
            Manage billing from your Supabase dashboard. Updates sync instantly to this workspace.
          </p>
          <dl className="account-panel__details">
            <div>
              <dt>Plan</dt>
              <dd>{planName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{planStatus}</dd>
            </div>
            <div>
              <dt>Renews</dt>
              <dd>{renewsOn}</dd>
            </div>
          </dl>
        </section>

        <section className="account-panel__card" aria-labelledby="account-haptics">
          <p className="account-panel__eyebrow">Haptic feedback</p>
          <h3 id="account-haptics">Vibration intensity</h3>
          <p className="account-panel__hint">
            Tune how much vibration feedback you receive across habits, rewards, and timer/game completions.
          </p>
          <p className="account-panel__hint" style={{ marginTop: '0.35rem' }}>
            Off = no vibration, Subtle = lighter pulses, Balanced = full recommended feedback.
          </p>
          <div className="account-panel__actions-row" role="radiogroup" aria-label="Haptic feedback mode">
            <button
              type="button"
              className={`btn ${hapticMode === 'off' ? 'btn--primary' : ''}`}
              aria-pressed={hapticMode === 'off'}
              onClick={() => {
                setHapticMode('off');
                setHapticModeState('off');
              }}
            >
              Off
            </button>
            <button
              type="button"
              className={`btn ${hapticMode === 'subtle' ? 'btn--primary' : ''}`}
              aria-pressed={hapticMode === 'subtle'}
              onClick={() => {
                setHapticMode('subtle');
                setHapticModeState('subtle');
              }}
            >
              Subtle
            </button>
            <button
              type="button"
              className={`btn ${hapticMode === 'balanced' ? 'btn--primary' : ''}`}
              aria-pressed={hapticMode === 'balanced'}
              onClick={() => {
                setHapticMode('balanced');
                setHapticModeState('balanced');
              }}
            >
              Balanced
            </button>
          </div>
          <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>
            Active mode: {hapticMode === 'off' ? 'Off' : hapticMode === 'subtle' ? 'Subtle' : 'Balanced'}
          </p>
          <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 0 })}
            >
              Test vibration
            </button>
          </div>
        </section>

        <section className="account-panel__card" aria-labelledby="account-menu-icon">
          <p className="account-panel__eyebrow">Menu Icon</p>
          <h3 id="account-menu-icon">Display Preferences</h3>
          <p className="account-panel__hint">
            Choose whether to display your initials or the default icon in the main menu when signed in.
          </p>
          <div className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input
                type="checkbox"
                checked={profile?.show_initials_in_menu ?? false}
                onChange={(e) => handleToggleInitialsInMenu(e.target.checked)}
                disabled={savingPreference || !profile?.full_name || isDemoExperience}
                className="account-panel__toggle-input"
              />
              <span className="account-panel__toggle-text">
                Show my initials ({userInitials || '--'}) in main menu
              </span>
            </label>
            {savingPreference && <span className="account-panel__saving-indicator">Saving...</span>}
          </div>
          {!profile?.full_name && !isDemoExperience && (
            <p className="account-panel__hint" style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
              Set your name in the account details to enable this feature.
            </p>
          )}
        </section>

        <section className="account-panel__card" aria-labelledby="account-birthday-gift">
          <p className="account-panel__eyebrow">Rewards</p>
          <h3 id="account-birthday-gift">Birthday gift</h3>
          <p className="account-panel__hint">
            Opt in to receive a birthday gift worth 💎 1 diamond. Gifts are limited to one claim every 365 days even if your birthday date changes.
          </p>
          <div className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input
                type="checkbox"
                checked={isBirthdayGiftEnabled}
                onChange={(event) => handleToggleBirthdayGift(event.target.checked)}
                disabled={savingPreference || isDemoExperience}
                className="account-panel__toggle-input"
              />
              <span className="account-panel__toggle-text">Enable optional birthday gift</span>
            </label>
            {savingPreference && <span className="account-panel__saving-indicator">Saving...</span>}
          </div>
          <p className="account-panel__hint" style={{ marginTop: '0.5rem' }}>
            Last claimed: {lastBirthdayGiftClaimedLabel}
          </p>
          <p className="account-panel__hint">
            Next eligible claim window: {nextBirthdayGiftEligibleLabel}
          </p>
        </section>
      </div>

      <AiSettingsSection session={session} />

      <GamificationSettings session={session} />

      <ExperimentalFeaturesSection session={session} />

      <TelemetrySettingsSection session={session} isDemoExperience={isDemoExperience} />

      <YesterdayRecapSettings
        session={session}
        onLaunchDailyCatchUpPrompt={onLaunchDailyCatchUpPrompt}
      />

      <section className="account-panel__card" aria-labelledby="weekly-habit-review-launcher">
        <p className="account-panel__eyebrow">Habits</p>
        <h3 id="weekly-habit-review-launcher">Weekly habit review</h3>
        <p className="account-panel__hint">
          Open your weekly 30-day stage mix and stalled/on-track habit snapshot at any time.
        </p>
        <div className="account-panel__actions-row">
          <button
            type="button"
            className="btn"
            onClick={handleLaunchWeeklyHabitReview}
          >
            Launch weekly habit review
          </button>
        </div>
      </section>

      <section className="account-panel__card" aria-labelledby="weekly-habit-review-launcher">
        <p className="account-panel__eyebrow">Habits</p>
        <h3 id="weekly-habit-review-launcher">Weekly habit review</h3>
        <p className="account-panel__hint">
          Open your weekly 30-day stage mix and stalled/on-track habit snapshot at any time.
        </p>
        <div className="account-panel__actions-row">
          <button
            type="button"
            className="btn"
            onClick={handleLaunchWeeklyHabitReview}
          >
            Launch weekly habit review
          </button>
        </div>
      </section>

      {/* Collapsible Folder: Holiday Themes */}
      <section className="account-panel__card">
        <SettingsFolderButton
          title="Holiday Themes"
          description="Pick which seasonal moments can trigger themed experiences"
          icon="🎊"
          itemCount={HOLIDAY_OPTIONS.length}
          onClick={() => setHolidayFolderOpen(true)}
        />
      </section>

      {/* Collapsible Folder 1: Developer & Analytics Tools */}
      <section className="account-panel__card">
        <SettingsFolderButton
          title="Developer & Analytics Tools"
          description="Advanced settings for workspace data, analytics, debugging, and testing"
          icon="🔧"
          itemCount={6}
          onClick={() => setFolder1Open(true)}
        />
      </section>

      {/* Collapsible Folder 2: Notification Settings */}
      <section className="account-panel__card">
        <SettingsFolderButton
          title="Notification Settings"
          description="Configure habit notifications, daily reminders, and per-habit reminder preferences"
          icon="🔔"
          itemCount={3}
          onClick={() => setFolder2Open(true)}
        />
      </section>

      {/* Folder 1 Popup */}
      <SettingsFolderPopup
        isOpen={folder1Open}
        onClose={() => setFolder1Open(false)}
        title="Developer & Analytics Tools"
      >
        <section className="account-panel__card" aria-labelledby="account-data">
          <p className="account-panel__eyebrow">Data &amp; security</p>
          <h3 id="account-data">Workspace data</h3>
          <p className="account-panel__hint">
            View high-level metadata about your profile. Detailed exports are available through Supabase.
          </p>
          <dl className="account-panel__details">
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{lastSignIn}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd className="account-panel__code">{user.id}</dd>
            </div>
          </dl>
        </section>

        <section className="account-panel__card" aria-labelledby="account-cache">
          <p className="account-panel__eyebrow">PWA Tools</p>
          <h3 id="account-cache">Clear app cache</h3>
          <p className="account-panel__hint">
            Remove cached assets and unregister the service worker so you can verify a fresh build.
          </p>
          <div className="account-panel__actions-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleClearAppCache}
              disabled={cacheClearing}
            >
              {cacheClearing ? 'Clearing…' : 'Clear cache & refresh'}
            </button>
            {cacheStatus ? <span className="account-panel__saving-indicator">{cacheStatus}</span> : null}
          </div>
          <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>
            Active mode: {hapticMode === 'off' ? 'Off' : hapticMode === 'subtle' ? 'Subtle' : 'Balanced'}
          </p>
          <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 0 })}
            >
              Test vibration
            </button>
          </div>
        </section>

        <section className="account-panel__card" aria-labelledby="account-legacy-alias-readiness">
          <p className="account-panel__eyebrow">Migration diagnostics</p>
          <h3 id="account-legacy-alias-readiness">Legacy alias sunset readiness</h3>
          <p className="account-panel__hint">
            Scan local reward/session history for remaining <code>pomodoro_sprint</code> rows before removing legacy aliases.
          </p>
          <div className="account-panel__actions-row">
            <button
              type="button"
              className="btn"
              onClick={handleRunLegacyAliasScan}
            >
              Run legacy alias scan
            </button>
          </div>
          {legacyAliasReadiness ? (
            <dl className="account-panel__details" style={{ marginTop: '0.75rem' }}>
              <div>
                <dt>Legacy reward rows</dt>
                <dd>{legacyAliasReadiness.legacyRewardSourceRows}</dd>
              </div>
              <div>
                <dt>Legacy session rows</dt>
                <dd>{legacyAliasReadiness.legacySessionGameIdRows}</dd>
              </div>
              <div>
                <dt>Ready to sunset</dt>
                <dd>{legacyAliasReadiness.hasLegacyAliases ? 'No' : 'Yes'}</dd>
              </div>
              <div>
                <dt>Scanned at</dt>
                <dd>{formatDate(legacyAliasReadiness.scannedAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <ReminderAnalyticsDashboard session={session} />

        <PushNotificationTestPanel session={session} />

        <ReminderActionDebugPanel session={session} />

        <SupabaseConnectionTest 
          session={session} 
          isDemoExperience={isDemoExperience} 
        />
      </SettingsFolderPopup>

      {/* Folder 2 Popup */}
      <SettingsFolderPopup
        isOpen={folder2Open}
        onClose={() => setFolder2Open(false)}
        title="Notification Settings"
      >
        <NotificationSettingsSection session={session} />

        <DailyReminderPreferences session={session} />

        <PerHabitReminderPrefs session={session} />
      </SettingsFolderPopup>

      {/* Holiday Preferences Popup */}
      <SettingsFolderPopup
        isOpen={holidayFolderOpen}
        onClose={() => setHolidayFolderOpen(false)}
        title="Holiday Themes"
      >
        <HolidayPreferencesSection session={session} isDemoExperience={isDemoExperience} />
      </SettingsFolderPopup>

      <div className="account-panel__actions">
        <div>
          <p className="account-panel__eyebrow">Session</p>
          <p className="account-panel__hint">
            {isAuthenticated
              ? 'Sign out to switch to a different Supabase project.'
              : 'Sign in with Supabase to sync your personal rituals.'}
          </p>
        </div>
        {isAuthenticated ? (
          <button type="button" className="btn btn--primary" onClick={() => onSignOut()}>
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}
