import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import { NotificationSettingsSection, PushNotificationTestPanel, DailyReminderPreferences, PerHabitReminderPrefs, ReminderActionDebugPanel, ReminderAnalyticsDashboard } from '../notifications';
import { AiSettingsSection } from './AiSettingsSection';
import { ExperimentalFeaturesSection } from './ExperimentalFeaturesSection';
import { GameDebugLogSection } from './GameDebugLogSection';
import { YesterdayRecapSettings } from './YesterdayRecapSettings';
import { DreamJournalReminderSettings } from './DreamJournalReminderSettings';
import { TodaysWinsReminderSettings } from './TodaysWinsReminderSettings';
import { DailyLifeUpgradeSettings } from './DailyLifeUpgradeSettings';
import { GamificationSettings } from '../gamification/GamificationSettings';
import { TelemetrySettingsSection } from './TelemetrySettingsSection';
import { SettingsFolderPopup } from '../../components/SettingsFolderPopup';
import { FeaturePreviewOverlay } from '../../components/FeaturePreviewOverlay';
import { SettingsFeatureCard } from '../../components/SettingsFeatureCard';
import { HolidayPreferencesSection, HOLIDAY_OPTIONS } from './HolidayPreferencesSection';
import { CaseSubmissionModal } from '../cases/CaseSubmissionModal';
import { MyCasesPanel } from '../cases/MyCasesPanel';
import { AdminInboxPanel } from '../admin/AdminInboxPanel';
import { FutureFeatureVotingPanel } from './FutureFeatureVotingPanel';
import { getFeatureAvailability, type FeatureAvailabilityId } from '../../config/featureAvailability';
import { resolveFeatureAccess } from '../../services/featureAccess';
import { isAdminUser } from '../../services/adminRoles';
import type { WorkspaceProfileRow } from '../../services/workspaceProfile';
import type { WorkspaceStats } from '../../services/workspaceStats';
import { upsertWorkspaceProfile } from '../../services/workspaceProfile';
import { generateInitials } from '../../utils/initials';
import { getHapticMode, setHapticMode, triggerCompletionHaptic, type HapticMode } from '../../utils/completionHaptics';
import { getLegacyAliasSunsetReadiness, type LegacyAliasSunsetReadiness } from '../../services/gameRewards';
import {
  createCustomerPortalSession,
  createDicePackCheckoutSession,
  createSubscriptionCheckoutSession,
  fetchBillingSnapshot,
  type BillingSnapshot,
} from '../../services/billing';

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
  onLaunchDailyTreatCalendar?: () => void;
  billingReturnBanner?: {
    kind: 'processing' | 'success' | 'canceled';
    message: string;
  } | null;
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
  onLaunchDailyTreatCalendar,
  billingReturnBanner = null,
}: MyAccountPanelProps) {
  const [folder1Open, setFolder1Open] = useState(false);
  const [folder2Open, setFolder2Open] = useState(false);
  const [holidayFolderOpen, setHolidayFolderOpen] = useState(false);
  const [remindersFolderOpen, setRemindersFolderOpen] = useState(false);
  const [appearanceFolderOpen, setAppearanceFolderOpen] = useState(false);
  const [hapticsFolderOpen, setHapticsFolderOpen] = useState(false);
  const [menuDisplayFolderOpen, setMenuDisplayFolderOpen] = useState(false);
  const [birthdayGiftFolderOpen, setBirthdayGiftFolderOpen] = useState(false);
  const [onboardingToolsFolderOpen, setOnboardingToolsFolderOpen] = useState(false);
  const [aiPrivacyFolderOpen, setAiPrivacyFolderOpen] = useState(false);
  const [experimentalFolderOpen, setExperimentalFolderOpen] = useState(false);
  const [gameRewardsFolderOpen, setGameRewardsFolderOpen] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [hapticMode, setHapticModeState] = useState<HapticMode>('balanced');
  const [onboardingSnapshot, setOnboardingSnapshot] = useState<string | null>(null);
  const [dayZeroStored, setDayZeroStored] = useState(false);
  const [legacyAliasReadiness, setLegacyAliasReadiness] = useState<LegacyAliasSunsetReadiness | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [feedbackSupportFolderOpen, setFeedbackSupportFolderOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState<'upgrade_monthly' | 'upgrade_yearly' | 'manage' | 'buy_rolls' | null>(null);
  const [activeFutureFeatureId, setActiveFutureFeatureId] = useState<FeatureAvailabilityId | null>(null);
  
  const user = session.user;
  const userInitials = generateInitials(profile?.full_name || '');

  const isPro = billingSnapshot?.entitlement?.is_pro ?? false;
  const subscriptionStatus = billingSnapshot?.subscription?.status ?? null;
  const planName = isDemoExperience ? 'Demo preview' : isPro ? 'HabitGame Pro' : 'Free';
  const planStatus = isDemoExperience ? 'Preview mode' : subscriptionStatus ? subscriptionStatus.replace(/_/g, ' ') : 'No active subscription';
  const renewsOn = formatDate(billingSnapshot?.subscription?.current_period_end ?? null, { dateStyle: 'medium' });
  const walletRolls = billingSnapshot?.wallet?.dice_rolls ?? 0;
  const canManageBilling = !isDemoExperience && (isPro || Boolean(billingSnapshot?.customer?.stripe_customer_id));
  const resolvedBillingBanner = billingReturnBanner?.kind === 'processing' && isPro
    ? {
      kind: 'success' as const,
      message: 'Billing synced. HabitGame Pro is active on your account.',
    }
    : billingReturnBanner;

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
  const activeFutureFeature = activeFutureFeatureId ? getFeatureAvailability(activeFutureFeatureId) : null;

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

  useEffect(() => {
    let active = true;
    isAdminUser(session.user.id).then((value) => {
      if (!active) return;
      setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    if (isAdmin === true) return;
    setFolder1Open(false);
    setFolder2Open(false);
    setHolidayFolderOpen(false);
    setExperimentalFolderOpen(false);
  }, [isAdmin]);

  const showAdminTools = isAdmin === true;

  useEffect(() => {
    if (isDemoExperience) {
      setBillingSnapshot(null);
      setBillingError(null);
      setBillingLoading(false);
      return;
    }

    let active = true;
    setBillingLoading(true);
    fetchBillingSnapshot(session.user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setBillingError(error.message);
          return;
        }
        setBillingSnapshot(data);
        setBillingError(null);
      })
      .finally(() => {
        if (active) {
          setBillingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session.user.id, isDemoExperience, billingReturnBanner]);

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

  const redirectToUrl = (url: string) => {
    if (typeof window === 'undefined') return;
    window.location.assign(url);
  };

  const runBillingAction = async (
    action: 'upgrade_monthly' | 'upgrade_yearly' | 'manage' | 'buy_rolls',
    runner: () => Promise<{ url: string | null; error: Error | null }>,
  ) => {
    setBillingActionLoading(action);
    setBillingError(null);
    try {
      const { url, error } = await runner();
      if (error || !url) {
        setBillingError(error?.message ?? 'Unable to start billing action.');
        return;
      }
      redirectToUrl(url);
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleSettingsModuleClick = (featureId: FeatureAvailabilityId, setModuleOpen: (isOpen: boolean) => void) => {
    const access = resolveFeatureAccess(featureId, { isAdminOrCreator: isAdmin === true });

    if (access === 'open') {
      setModuleOpen(true);
      return;
    }

    if (access === 'previewOnly') {
      setActiveFutureFeatureId(featureId);
      return;
    }

    // Hidden feature access should remain silent so public users never see internal details.
  };
  const handleHolidayThemesClick = () => handleSettingsModuleClick('settings.holidayThemes', setHolidayFolderOpen);
  const handleNotificationsClick = () => handleSettingsModuleClick('settings.notifications', setFolder2Open);
  const handleRemindersClick = () => setRemindersFolderOpen(true);
  const handleExperimentalFeaturesClick = () =>
    handleSettingsModuleClick('settings.experimentalFeatures', setExperimentalFolderOpen);
  const handleAdvancedToolsClick = () => {
    if (showAdminTools) {
      setFolder1Open(true);
    }
  };

  return (
    <div className="account-panel">
      {showDemoNotice ? (
        <p className="account-panel__notice">
          You’re exploring demo data. Sign in to sync with your Supabase project.
        </p>
      ) : null}
      <div className="account-panel__summary-grid">
        <section className="account-panel__card" aria-labelledby="account-subscription">
          <div className="account-panel__subscription-header">
            <div>
              <p className="account-panel__eyebrow">Subscription</p>
              <h3 id="account-subscription">Plan overview</h3>
              <p className="account-panel__hint">Manage your plan, renewal, and dice wallet in one place.</p>
            </div>
            <span className={`account-panel__status-chip ${isPro ? 'account-panel__status-chip--pro' : ''}`}>
              {isPro ? 'Pro active' : 'Free plan'}
            </span>
          </div>
          {resolvedBillingBanner ? (
            <p className={`notification-preferences__message ${
              resolvedBillingBanner.kind === 'canceled'
                ? 'notification-preferences__message--error'
                : 'notification-preferences__message--success'
            }`} role="status">
              {resolvedBillingBanner.message}
            </p>
          ) : null}
          {billingLoading ? (
            <p className="account-panel__hint">Syncing billing status…</p>
          ) : null}
          {billingError ? (
            <p className="notification-preferences__message notification-preferences__message--error" role="alert">
              {billingError}
            </p>
          ) : null}
          <dl className="account-panel__details account-panel__details--subscription">
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
            <div>
              <dt>Dice rolls</dt>
              <dd>{walletRolls}</dd>
            </div>
          </dl>
          <div className="account-panel__subscription-cta-grid" style={{ marginTop: '0.75rem' }}>
            {!isPro && !isDemoExperience ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary account-panel__plan-btn"
                  disabled={billingActionLoading !== null}
                  onClick={() => runBillingAction('upgrade_monthly', () => createSubscriptionCheckoutSession('monthly'))}
                >
                  <span className="account-panel__plan-btn-title">
                    {billingActionLoading === 'upgrade_monthly' ? 'Starting…' : 'Upgrade Pro Monthly'}
                  </span>
                  <span className="account-panel__plan-btn-meta">Flexible month-to-month</span>
                </button>
                <button
                  type="button"
                  className="btn account-panel__plan-btn account-panel__plan-btn--yearly"
                  disabled={billingActionLoading !== null}
                  onClick={() => runBillingAction('upgrade_yearly', () => createSubscriptionCheckoutSession('yearly'))}
                >
                  <span className="account-panel__plan-btn-title">
                    {billingActionLoading === 'upgrade_yearly' ? 'Starting…' : 'Upgrade Pro Yearly'}
                  </span>
                  <span className="account-panel__plan-btn-meta">Best value for committed builders</span>
                </button>
              </>
            ) : null}
            {canManageBilling ? (
              <button
                type="button"
                className="btn btn--secondary account-panel__plan-btn account-panel__plan-btn--manage"
                disabled={billingActionLoading !== null}
                onClick={() => runBillingAction('manage', () => createCustomerPortalSession())}
              >
                <span className="account-panel__plan-btn-title">
                  {billingActionLoading === 'manage' ? 'Opening…' : 'Manage Billing'}
                </span>
                <span className="account-panel__plan-btn-meta">Open Stripe portal</span>
              </button>
            ) : null}
            {!isDemoExperience ? (
              <button
                type="button"
                className="btn account-panel__plan-btn account-panel__plan-btn--rolls"
                disabled={billingActionLoading !== null}
                onClick={() => runBillingAction('buy_rolls', () => createDicePackCheckoutSession())}
              >
                <span className="account-panel__plan-btn-title">
                  {billingActionLoading === 'buy_rolls' ? 'Starting…' : 'Buy 500 Rolls'}
                </span>
                <span className="account-panel__plan-btn-meta">Quick dice refill</span>
              </button>
            ) : null}
          </div>
        </section>

      </div>

      <section className="account-panel__card settings-modules" aria-labelledby="settings-modules-heading">
        <div className="settings-modules__header">
          <p className="account-panel__eyebrow">Settings</p>
          <h3 id="settings-modules-heading">Feature Hub</h3>
          <p className="account-panel__hint">
            Choose a focused module to adjust seasonal experiences, reminders, and creator-only workspace tools.
          </p>
        </div>
        <div className="settings-modules__group" aria-label="Personalization settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">Personalization</p>
            <p className="settings-modules__group-hint">Live profile and comfort settings you can tune instantly.</p>
          </div>
        <div className="settings-modules__grid">
          <SettingsFeatureCard
            icon="🎨"
            title="Appearance / Theme"
            subtitle="Choose your active app theme and mode."
            meta="LIVE • Theme controls"
            onClick={() => setAppearanceFolderOpen(true)}
          />
          <SettingsFeatureCard
            icon="📳"
            title="Haptic feedback"
            subtitle="Tune vibration intensity across the app."
            meta="LIVE • Off / Subtle / Balanced"
            onClick={() => setHapticsFolderOpen(true)}
          />
          <SettingsFeatureCard
            icon="🪪"
            title="Menu icon / Display preferences"
            subtitle="Show initials or keep the default menu icon."
            meta="LIVE • Profile display"
            onClick={() => setMenuDisplayFolderOpen(true)}
          />
          <SettingsFeatureCard
            icon="🎁"
            title="Birthday gift"
            subtitle="Manage your optional annual birthday reward."
            meta="LIVE • Reward preference"
            onClick={() => setBirthdayGiftFolderOpen(true)}
          />
          {onLaunchOnboarding ? (
            <SettingsFeatureCard
              icon="🧭"
              title="Onboarding Tools"
              subtitle="Launch onboarding flows and review local progress."
              meta="Guided setup tools"
              onClick={() => setOnboardingToolsFolderOpen(true)}
            />
          ) : null}
        </div>
        </div>
        <div className="settings-modules__group" aria-label="Quick settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">Quick modules</p>
            <p className="settings-modules__group-hint">Open the same trusted settings modules in a calmer layout.</p>
          </div>
        <div className="settings-modules__grid">
          <SettingsFeatureCard
            icon="🛡️"
            title="AI & Privacy"
            subtitle="Privacy, coach, and telemetry controls."
            meta="Privacy controls"
            onClick={() => setAiPrivacyFolderOpen(true)}
          />
          <SettingsFeatureCard
            icon="🎊"
            title="Holiday Themes"
            subtitle="Seasonal app styling."
            meta={`${HOLIDAY_OPTIONS.length} moments`}
            featureId="settings.holidayThemes"
            onClick={handleHolidayThemesClick}
          />
          <SettingsFeatureCard
            icon="⏰"
            title="Reminders"
            subtitle="Daily reminder preferences."
            meta="5 reminder areas"
            onClick={handleRemindersClick}
          />
          <SettingsFeatureCard
            icon="🔔"
            title="Notifications"
            subtitle="Notification preferences."
            meta="3 reminder areas"
            featureId="settings.notifications"
            onClick={handleNotificationsClick}
          />
          {showAdminTools ? (
            <SettingsFeatureCard
              icon="🔧"
              title="Advanced Tools"
              subtitle="Diagnostics and previews."
              meta="Admin only"
              onClick={handleAdvancedToolsClick}
            />
          ) : null}
          <SettingsFeatureCard
            icon="🎮"
            title="Game & Rewards"
            subtitle="Gameplay and reward controls."
            meta="Gameplay controls"
            onClick={() => setGameRewardsFolderOpen(true)}
          />
          <SettingsFeatureCard
            icon="⚗️"
            title="Experimental Features"
            subtitle="Creator preview toggles."
            meta="Future Feature"
            featureId="settings.experimentalFeatures"
            onClick={handleExperimentalFeaturesClick}
          />
        </div>
        </div>
      </section>

      <section className="account-panel__card" aria-labelledby="feedback-support-tools">
        <p className="account-panel__eyebrow">Support</p>
        <h3 id="feedback-support-tools">Feedback &amp; Support</h3>
        <p className="account-panel__hint">
          Send product feedback or request support. Support requests are reviewed manually.
        </p>
        <div className="account-panel__actions-row">
          <button type="button" className="btn" onClick={() => setFeedbackSupportFolderOpen(true)}>
            Open support center
          </button>
        </div>
      </section>

      <SettingsFolderPopup
        isOpen={feedbackSupportFolderOpen}
        onClose={() => setFeedbackSupportFolderOpen(false)}
        title="Feedback & Support"
      >
        <section className="account-panel__card" aria-label="Feedback and support tools">
          <p className="account-panel__hint">
            Send product feedback or request support. Support requests are reviewed manually.
          </p>

          <div className="account-panel__support-popup-section">
            <p className="account-panel__support-popup-section-label">Future Feature Voting</p>
            <FutureFeatureVotingPanel session={session} isAuthenticated={isAuthenticated} compact />
          </div>

          <div className="account-panel__support-popup-section">
            <p className="account-panel__support-popup-section-label">New feedback &amp; support request</p>
            <div className="account-panel__actions-row">
              <button type="button" className="btn" onClick={() => setShowFeedbackModal(true)}>
                Send feedback
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setShowSupportModal(true)}>
                Request support
              </button>
            </div>
          </div>

          <div className="account-panel__support-popup-section">
            <p className="account-panel__support-popup-section-label">Past feedback &amp; support requests</p>
            <MyCasesPanel session={session} embeddedInSupportPopup />
          </div>
        </section>
      </SettingsFolderPopup>

      {showAdminTools ? (
        <>
          <SettingsFolderPopup
            isOpen={folder1Open}
            onClose={() => setFolder1Open(false)}
            title="Advanced Tools"
          >
            <section className="account-panel__card" aria-labelledby="account-data">
              <p className="account-panel__eyebrow">Data &amp; security</p>
              <h3 id="account-data">Ship data</h3>
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
            <GameDebugLogSection />

            <ReminderAnalyticsDashboard session={session} />

            <PushNotificationTestPanel session={session} />

            <ReminderActionDebugPanel session={session} />

            <SupabaseConnectionTest
              session={session}
              isDemoExperience={isDemoExperience}
            />

            <section className="account-panel__card" aria-labelledby="admin-tools-inbox">
              <p className="account-panel__eyebrow">Admin inbox / support ops</p>
              <h3 id="admin-tools-inbox">Admin inbox / support ops</h3>
              <AdminInboxPanel session={session} />
            </section>
            {onLaunchDailyTreatCalendar && (
              <section className="account-panel__card" aria-labelledby="dev-daily-treat-calendar">
                <p className="account-panel__eyebrow">Daily Treats</p>
                <h3 id="dev-daily-treat-calendar">Daily Treat Calendar</h3>
                <p className="account-panel__hint">
                  Open the Daily Treat Calendar (Personal Quest) directly for development and preview.
                </p>
                <div className="account-panel__actions-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setFolder1Open(false);
                      onLaunchDailyTreatCalendar();
                    }}
                  >
                    Launch Daily Treat Calendar
                  </button>
                </div>
              </section>
            )}
          </SettingsFolderPopup>
        </>
      ) : null}

      {/* Folder 2 Popup */}
      <SettingsFolderPopup
        isOpen={appearanceFolderOpen}
        onClose={() => setAppearanceFolderOpen(false)}
        title="Appearance / Theme"
      >
        <section className="account-panel__card" aria-labelledby="account-theme">
          <p className="account-panel__eyebrow">Appearance</p>
          <ThemeSelector />
        </section>
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={hapticsFolderOpen}
        onClose={() => setHapticsFolderOpen(false)}
        title="Haptic feedback"
      >
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
            <button type="button" className={`btn ${hapticMode === 'off' ? 'btn--primary' : ''}`} aria-pressed={hapticMode === 'off'} onClick={() => { setHapticMode('off'); setHapticModeState('off'); }}>
              Off
            </button>
            <button type="button" className={`btn ${hapticMode === 'subtle' ? 'btn--primary' : ''}`} aria-pressed={hapticMode === 'subtle'} onClick={() => { setHapticMode('subtle'); setHapticModeState('subtle'); }}>
              Subtle
            </button>
            <button type="button" className={`btn ${hapticMode === 'balanced' ? 'btn--primary' : ''}`} aria-pressed={hapticMode === 'balanced'} onClick={() => { setHapticMode('balanced'); setHapticModeState('balanced'); }}>
              Balanced
            </button>
          </div>
          <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>
            Active mode: {hapticMode === 'off' ? 'Off' : hapticMode === 'subtle' ? 'Subtle' : 'Balanced'}
          </p>
          <div className="account-panel__actions-row" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 0 })}>
              Test vibration
            </button>
          </div>
        </section>
      </SettingsFolderPopup>

      <SettingsFolderPopup isOpen={menuDisplayFolderOpen} onClose={() => setMenuDisplayFolderOpen(false)} title="Menu icon / Display preferences">
        <section className="account-panel__card" aria-labelledby="account-menu-icon">
          <p className="account-panel__eyebrow">Menu Icon</p>
          <h3 id="account-menu-icon">Display Preferences</h3>
          <p className="account-panel__hint">Choose whether to display your initials or the default icon in the main menu when signed in.</p>
          <div className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input type="checkbox" checked={profile?.show_initials_in_menu ?? false} onChange={(e) => handleToggleInitialsInMenu(e.target.checked)} disabled={savingPreference || !profile?.full_name || isDemoExperience} className="account-panel__toggle-input" />
              <span className="account-panel__toggle-text">Show my initials ({userInitials || '--'}) in main menu</span>
            </label>
            {savingPreference && <span className="account-panel__saving-indicator">Saving...</span>}
          </div>
          {!profile?.full_name && !isDemoExperience && <p className="account-panel__hint" style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>Set your name in the account details to enable this feature.</p>}
        </section>
      </SettingsFolderPopup>

      <SettingsFolderPopup isOpen={birthdayGiftFolderOpen} onClose={() => setBirthdayGiftFolderOpen(false)} title="Birthday gift">
        <section className="account-panel__card" aria-labelledby="account-birthday-gift">
          <p className="account-panel__eyebrow">Rewards</p>
          <h3 id="account-birthday-gift">Birthday gift</h3>
          <p className="account-panel__hint">Opt in to receive a birthday gift worth 💎 1 diamond. Gifts are limited to one claim every 365 days even if your birthday date changes.</p>
          <div className="account-panel__toggle-row">
            <label className="account-panel__toggle-label">
              <input type="checkbox" checked={isBirthdayGiftEnabled} onChange={(event) => handleToggleBirthdayGift(event.target.checked)} disabled={savingPreference || isDemoExperience} className="account-panel__toggle-input" />
              <span className="account-panel__toggle-text">Enable optional birthday gift</span>
            </label>
            {savingPreference && <span className="account-panel__saving-indicator">Saving...</span>}
          </div>
          <p className="account-panel__hint" style={{ marginTop: '0.5rem' }}>Last claimed: {lastBirthdayGiftClaimedLabel}</p>
          <p className="account-panel__hint">Next eligible claim window: {nextBirthdayGiftEligibleLabel}</p>
        </section>
      </SettingsFolderPopup>
      <SettingsFolderPopup
        isOpen={onboardingToolsFolderOpen}
        onClose={() => setOnboardingToolsFolderOpen(false)}
        title="Onboarding Tools"
      >
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
            <button type="button" className="btn" onClick={() => onLaunchOnboarding?.()} disabled={!onLaunchOnboarding}>
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
              onClick={() => onLaunchOnboarding?.({ reset: true })}
              disabled={!onLaunchOnboarding}
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
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={gameRewardsFolderOpen}
        onClose={() => setGameRewardsFolderOpen(false)}
        title="Game & Rewards"
      >
        <GamificationSettings session={session} />

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
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={aiPrivacyFolderOpen}
        onClose={() => setAiPrivacyFolderOpen(false)}
        title="AI & Privacy"
      >
        <section className="account-panel__card" aria-labelledby="account-ai-privacy-overview">
          <p className="account-panel__eyebrow">Privacy-sensitive</p>
          <h3 id="account-ai-privacy-overview">AI &amp; Privacy controls</h3>
          <p className="account-panel__hint">
            Manage how AI Coach assists you and how adaptive telemetry supports personalized balance tuning.
          </p>
          <p className="account-panel__hint" style={{ marginTop: '0.35rem' }}>
            Review these preferences before changing any toggles. Your selections stay in these dedicated controls.
          </p>
        </section>

        <AiSettingsSection session={session} />

        <TelemetrySettingsSection session={session} isDemoExperience={isDemoExperience} />
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={folder2Open}
        onClose={() => setFolder2Open(false)}
        title="Notification Settings"
      >
        <NotificationSettingsSection session={session} />

        <PerHabitReminderPrefs session={session} />
      </SettingsFolderPopup>


      <SettingsFolderPopup
        isOpen={remindersFolderOpen}
        onClose={() => setRemindersFolderOpen(false)}
        title="Reminders"
      >
        <YesterdayRecapSettings
          session={session}
          onLaunchDailyCatchUpPrompt={onLaunchDailyCatchUpPrompt}
        />

        <DreamJournalReminderSettings session={session} />

        <TodaysWinsReminderSettings session={session} />

        <DailyLifeUpgradeSettings session={session} />

        <DailyReminderPreferences session={session} />
      </SettingsFolderPopup>

      {/* Holiday Preferences Popup */}
      <SettingsFolderPopup
        isOpen={holidayFolderOpen}
        onClose={() => setHolidayFolderOpen(false)}
        title="Holiday Themes"
      >
        <HolidayPreferencesSection session={session} isDemoExperience={isDemoExperience} />
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={experimentalFolderOpen}
        onClose={() => setExperimentalFolderOpen(false)}
        title="Experimental Features"
      >
        <ExperimentalFeaturesSection session={session} />
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

      {showFeedbackModal ? (
        <CaseSubmissionModal
          session={session}
          caseType="feedback"
          sourceSurface="account_panel"
          onClose={() => setShowFeedbackModal(false)}
        />
      ) : null}

      {showSupportModal ? (
        <CaseSubmissionModal
          session={session}
          caseType="support"
          sourceSurface="account_panel"
          onClose={() => setShowSupportModal(false)}
        />
      ) : null}

      {activeFutureFeature ? (
        <FeaturePreviewOverlay
          featureId={activeFutureFeature.id}
          label={activeFutureFeature.label}
          body={activeFutureFeature.shortPitch}
          statusLabelOverride={activeFutureFeature.publicLabel}
          onClose={() => setActiveFutureFeatureId(null)}
        />
      ) : null}
    </div>
  );
}
