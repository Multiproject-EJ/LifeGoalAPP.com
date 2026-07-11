import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import type { Theme, ThemeAccessResult, ThemeCheckoutSkuId, ThemeMetadata } from '../../contexts/ThemeContext';
import { NotificationSettingsSection, PushNotificationTestPanel, DailyReminderPreferences, PerHabitReminderPrefs, ReminderActionDebugPanel, ReminderAnalyticsDashboard } from '../notifications';
import { AiSettingsSection } from './AiSettingsSection';
import { ExperimentalFeaturesSection } from './ExperimentalFeaturesSection';
import { GameDebugLogSection } from './GameDebugLogSection';
import { ViewportDiagnosticsSection } from './ViewportDiagnosticsSection';
import { YesterdayRecapSettings } from './YesterdayRecapSettings';
import { DreamJournalReminderSettings } from './DreamJournalReminderSettings';
import { TodaysWinsReminderSettings } from './TodaysWinsReminderSettings';
import { DailyLifeUpgradeSettings } from './DailyLifeUpgradeSettings';
import { GamificationSettings } from '../gamification/GamificationSettings';
import { TelemetrySettingsSection } from './TelemetrySettingsSection';
import { ServiceDiagnosticsPanel, SyncIndicator } from '../../components/service-status';
import { SettingsFolderPopup } from '../../components/SettingsFolderPopup';
import { FeaturePreviewOverlay } from '../../components/FeaturePreviewOverlay';
import { SettingsFeatureCard } from '../../components/SettingsFeatureCard';
import { PersonalizationModal } from '../../components/PersonalizationModal';
import { CreatorNoteModal } from '../onboarding/FounderWelcome';
import { ExperimentsModal } from '../../components/ExperimentsModal';
import { HolidayPreferencesSection, HOLIDAY_OPTIONS } from './HolidayPreferencesSection';
import { CaseSubmissionModal } from '../cases/CaseSubmissionModal';
import { MyCasesPanel } from '../cases/MyCasesPanel';
import { AdminInboxPanel } from '../admin/AdminInboxPanel';
import { AdminTelemetryPanel } from '../admin/AdminTelemetryPanel';
import { FutureFeatureVotingPanel } from './FutureFeatureVotingPanel';
import { getFeatureAvailability, type FeatureAvailabilityId } from '../../config/featureAvailability';
import { resolveFeatureAccess } from '../../services/featureAccess';
import { isUserFeatureEnabled } from '../../services/userFeatureOverrides';
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
import { fetchOwnedThemeIds, initiateThemeCheckout } from '../../services/themePurchases';
import { runAccountLifecycleAction, type AccountLifecycleAction } from '../../services/accountLifecycle';
import { useIslandRunState } from '../gamification/level-worlds/hooks/useIslandRunState';

type MyAccountPanelProps = {
  session: Session;
  isDemoExperience: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  onLaunchLeapProgress?: (options?: { reset?: boolean }) => void;
  onLaunchDayZeroOnboarding?: (options?: { reset?: boolean }) => void;
  onLaunchFirstRunOnboarding?: () => void;
  profile: WorkspaceProfileRow | null;
  stats: WorkspaceStats | null;
  profileLoading: boolean;
  onProfileUpdate?: (profile: WorkspaceProfileRow) => void;
  onLaunchWeeklyHabitReview?: () => void;
  onLaunchDailyCatchUpPrompt?: () => void;
  onLaunchDailyTreatCalendar?: () => void;
  onLaunchYesterdayTodoCleanup?: () => void;
  soundEffectsEnabled: boolean;
  soundPreferenceSaving: boolean;
  soundPreferenceError: string | null;
  onSoundEffectsEnabledChange: (enabled: boolean) => void | Promise<void>;
  isMobileMenuImageActive?: boolean;
  onGameModePreferenceChange?: (nextIsActive: boolean) => void | Promise<void>;
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
  onLaunchLeapProgress,
  onLaunchDayZeroOnboarding,
  onLaunchFirstRunOnboarding,
  profile,
  stats,
  profileLoading,
  onProfileUpdate,
  onLaunchWeeklyHabitReview,
  onLaunchDailyCatchUpPrompt,
  onLaunchDailyTreatCalendar,
  onLaunchYesterdayTodoCleanup,
  soundEffectsEnabled,
  soundPreferenceSaving,
  soundPreferenceError,
  onSoundEffectsEnabledChange,
  isMobileMenuImageActive = true,
  onGameModePreferenceChange,
  billingReturnBanner = null,
}: MyAccountPanelProps) {
  const [folder1Open, setFolder1Open] = useState(false);
  const [folder2Open, setFolder2Open] = useState(false);
  const [holidayFolderOpen, setHolidayFolderOpen] = useState(false);
  const [remindersFolderOpen, setRemindersFolderOpen] = useState(false);
  const [appearanceFolderOpen, setAppearanceFolderOpen] = useState(false);
  const [soundFolderOpen, setSoundFolderOpen] = useState(false);
  const [hapticsFolderOpen, setHapticsFolderOpen] = useState(false);
  const [menuDisplayFolderOpen, setMenuDisplayFolderOpen] = useState(false);
  const [birthdayGiftFolderOpen, setBirthdayGiftFolderOpen] = useState(false);
  const [onboardingToolsFolderOpen, setOnboardingToolsFolderOpen] = useState(false);
  const [aiPrivacyFolderOpen, setAiPrivacyFolderOpen] = useState(false);
  const [experimentalFolderOpen, setExperimentalFolderOpen] = useState(false);
  const [showExperimentsModal, setShowExperimentsModal] = useState(false);
  const [gameRewardsFolderOpen, setGameRewardsFolderOpen] = useState(false);
  const [cacheFolderOpen, setCacheFolderOpen] = useState(false);
  const [creatorNoteOpen, setCreatorNoteOpen] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [cacheAction, setCacheAction] = useState<'pwa' | 'storage' | 'queue' | 'hard-reset' | null>(null);
  const cacheClearing = cacheAction !== null;
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [hapticMode, setHapticModeState] = useState<HapticMode>('balanced');
  const [onboardingSnapshot, setOnboardingSnapshot] = useState<string | null>(null);
  const [dayZeroStored, setDayZeroStored] = useState(false);
  const [legacyAliasReadiness, setLegacyAliasReadiness] = useState<LegacyAliasSunsetReadiness | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [feedbackSupportFolderOpen, setFeedbackSupportFolderOpen] = useState(false);
  const [personalizationModalOpen, setPersonalizationModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState<'upgrade_monthly' | 'upgrade_yearly' | 'manage' | 'buy_rolls' | null>(null);
  const [rollsBudgetFolderOpen, setRollsBudgetFolderOpen] = useState(false);
  const [activeFutureFeatureId, setActiveFutureFeatureId] = useState<FeatureAvailabilityId | null>(null);
  const [ownedThemeIds, setOwnedThemeIds] = useState<Set<Theme>>(new Set());
  const [themeEntitlementsLoading, setThemeEntitlementsLoading] = useState(false);
  const [themeEntitlementsError, setThemeEntitlementsError] = useState<string | null>(null);
  const [themeCheckoutLoadingId, setThemeCheckoutLoadingId] = useState<Theme | null>(null);
  const [themeCheckoutError, setThemeCheckoutError] = useState<string | null>(null);
  const [accountLifecycleAction, setAccountLifecycleAction] = useState<AccountLifecycleAction | null>(null);
  const [accountLifecycleStatus, setAccountLifecycleStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { state: islandRunState, hydrate: hydrateIslandRunState } = useIslandRunState(session, null);
  
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
  const themeAccessContext = useMemo(() => {
    const ownedCreatureIds = new Set(
      (islandRunState.creatureCollection ?? [])
        .map(entry => entry.creatureId)
        .filter((creatureId): creatureId is string => typeof creatureId === 'string' && creatureId.length > 0),
    );
    const creatureBondLevelsById = new Map(
      (islandRunState.creatureCollection ?? [])
        .filter(entry => typeof entry.creatureId === 'string' && entry.creatureId.length > 0)
        .map(entry => [entry.creatureId, entry.bondLevel ?? 0] as const),
    );
    const creatureFormLevelsById = new Map(
      (islandRunState.creatureCollection ?? [])
        .filter(entry => typeof entry.creatureId === 'string' && entry.creatureId.length > 0)
        .map(entry => [entry.creatureId, entry.formLevel ?? 1] as const),
    );
    const pairedCreatureIds = new Set(
      (islandRunState.perfectCompanionIds ?? [])
        .filter((creatureId): creatureId is string => typeof creatureId === 'string' && creatureId.length > 0),
    );

    return {
      ownedThemeIds,
      ownedCreatureIds,
      pairedCreatureIds,
      creatureBondLevelsById,
      creatureFormLevelsById,
    };
  }, [islandRunState.creatureCollection, islandRunState.perfectCompanionIds, ownedThemeIds]);

  useEffect(() => {
    void hydrateIslandRunState({ forceRemote: false });
  }, [hydrateIslandRunState]);

  useEffect(() => {
    let cancelled = false;

    const loadThemeEntitlements = async () => {
      setThemeEntitlementsLoading(true);
      setThemeEntitlementsError(null);
      const { themeIds, error } = await fetchOwnedThemeIds(session.user.id);
      if (cancelled) return;
      setOwnedThemeIds(themeIds);
      setThemeEntitlementsError(error?.message ?? null);
      setThemeEntitlementsLoading(false);
    };

    if (appearanceFolderOpen || billingReturnBanner?.kind === 'success' || billingReturnBanner?.kind === 'processing') {
      void loadThemeEntitlements();
    }

    return () => {
      cancelled = true;
    };
  }, [appearanceFolderOpen, billingReturnBanner?.kind, session.user.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!onLaunchLeapProgress && !onLaunchDayZeroOnboarding) return;
    const storageKey = `leap_progress_${session.user.id}`;
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
        stageIndex?: number;
        xp?: number;
        unlockedPerkIds?: string[];
      };
      const stageIndex =
        typeof parsed.stageIndex === 'number' ? Math.min(parsed.stageIndex + 1, 12) : null;
      const xp = typeof parsed.xp === 'number' ? parsed.xp : null;
      const unlockedCount = parsed.unlockedPerkIds?.length ?? 0;
      const stageLabel = stageIndex ? `Leap ${stageIndex} of 12` : 'Leap progress unavailable';
      const xpLabel = xp !== null ? `${xp} XP banked` : 'XP balance unavailable';
      const unlockLabel = `${unlockedCount} perk unlock${unlockedCount === 1 ? '' : 's'}`;
      setOnboardingSnapshot(`${stageLabel} • ${xpLabel} • ${unlockLabel}`);
    } catch {
      setOnboardingSnapshot('Stored Leap Progress is unreadable.');
    }
  }, [onLaunchLeapProgress, onLaunchDayZeroOnboarding, session.user.id]);

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

  const deleteIndexedDbDatabase = (databaseName: string) =>
    new Promise<boolean>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve(false);
        return;
      }

      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve(true);
      request.onblocked = () => resolve(false);
      request.onerror = () => reject(request.error ?? new Error(`Unable to delete IndexedDB database ${databaseName}`));
    });

  const clearPwaAssetsAndServiceWorkers = async () => {
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

    return { clearedCaches, clearedRegistrations };
  };

  const clearOfflineQueue = async () => {
    const deleted = await deleteIndexedDbDatabase('lifegoalapp-sync-queue');
    return { deletedQueueDatabases: deleted ? 1 : 0 };
  };

  const shouldPreserveStorageKey = (key: string) => {
    const normalized = key.toLowerCase();
    return normalized.startsWith('sb-') || normalized.includes('supabase.auth.token');
  };

  const clearLocalAppStorage = () => {
    let clearedLocalStorageKeys = 0;
    let clearedSessionStorageKeys = 0;

    const clearMatchingStorageKeys = (storage: Storage) => {
      const keysToRemove = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
        (key): key is string => typeof key === 'string' && !shouldPreserveStorageKey(key),
      );
      keysToRemove.forEach((key) => storage.removeItem(key));
      return keysToRemove.length;
    };

    try {
      clearedLocalStorageKeys = clearMatchingStorageKeys(window.localStorage);
    } catch (error) {
      console.warn('Unable to clear localStorage app keys:', error);
    }

    try {
      clearedSessionStorageKeys = clearMatchingStorageKeys(window.sessionStorage);
    } catch (error) {
      console.warn('Unable to clear sessionStorage app keys:', error);
    }

    return { clearedLocalStorageKeys, clearedSessionStorageKeys };
  };

  const handleClearPwaCache = async () => {
    if (typeof window === 'undefined') return;

    setCacheAction('pwa');
    setCacheStatus(null);

    try {
      const { clearedCaches, clearedRegistrations } = await clearPwaAssetsAndServiceWorkers();
      setCacheStatus(
        `Cleared ${clearedCaches} PWA cache${clearedCaches === 1 ? '' : 's'} and ${clearedRegistrations} service worker${
          clearedRegistrations === 1 ? '' : 's'
        }. Reloading…`,
      );
      window.setTimeout(() => window.location.reload(), 750);
    } catch (error) {
      console.error('Failed to clear PWA cache:', error);
      setCacheStatus('Unable to clear the PWA asset cache. Check the console for details.');
    } finally {
      setCacheAction(null);
    }
  };

  const handleClearOfflineQueue = async () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm('Clear the offline Supabase write queue on this device? Unsynced offline writes may be lost.');
    if (!confirmed) return;

    setCacheAction('queue');
    setCacheStatus(null);

    try {
      const { deletedQueueDatabases } = await clearOfflineQueue();
      setCacheStatus(
        deletedQueueDatabases > 0
          ? 'Cleared the offline Supabase write queue for this device.'
          : 'The offline queue could not be deleted because the database is unavailable or currently blocked.',
      );
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
      setCacheStatus('Unable to clear the offline queue. Check the console for details.');
    } finally {
      setCacheAction(null);
    }
  };

  const handleClearLocalAppStorage = () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm('Clear local LifeGoal app storage on this device? This can reset local preferences, demo data, and offline fallback state while preserving Supabase sign-in tokens.');
    if (!confirmed) return;

    setCacheAction('storage');
    setCacheStatus(null);

    const { clearedLocalStorageKeys, clearedSessionStorageKeys } = clearLocalAppStorage();
    setCacheStatus(
      `Cleared ${clearedLocalStorageKeys} localStorage key${clearedLocalStorageKeys === 1 ? '' : 's'} and ${clearedSessionStorageKeys} sessionStorage key${
        clearedSessionStorageKeys === 1 ? '' : 's'
      }. Reloading…`,
    );
    window.setTimeout(() => window.location.reload(), 750);
    setCacheAction(null);
  };

  const handleHardResetDeviceCache = async () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm(
      'Hard reset local device caches? This clears PWA caches, unregisters service workers, deletes the offline queue, clears local/session storage keys except Supabase sign-in tokens, then reloads.',
    );
    if (!confirmed) return;

    setCacheAction('hard-reset');
    setCacheStatus(null);

    try {
      const { clearedCaches, clearedRegistrations } = await clearPwaAssetsAndServiceWorkers();
      const { deletedQueueDatabases } = await clearOfflineQueue();
      const { clearedLocalStorageKeys, clearedSessionStorageKeys } = clearLocalAppStorage();
      setCacheStatus(
        `Hard reset complete: ${clearedCaches} PWA cache${clearedCaches === 1 ? '' : 's'}, ${clearedRegistrations} service worker${
          clearedRegistrations === 1 ? '' : 's'
        }, ${deletedQueueDatabases} offline queue database${deletedQueueDatabases === 1 ? '' : 's'}, ${clearedLocalStorageKeys} localStorage key${
          clearedLocalStorageKeys === 1 ? '' : 's'
        }, and ${clearedSessionStorageKeys} sessionStorage key${clearedSessionStorageKeys === 1 ? '' : 's'}. Reloading…`,
      );
      window.setTimeout(() => window.location.reload(), 750);
    } catch (error) {
      console.error('Failed to hard reset device cache:', error);
      setCacheStatus('Unable to complete the hard reset. Check the console for details.');
    } finally {
      setCacheAction(null);
    }
  };

  const handleLaunchWeeklyHabitReview = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`lifegoal.weekly-habit-review-launch:${session.user.id}`, 'true');
    window.dispatchEvent(new CustomEvent('lifegoal:launch-weekly-habit-review'));
    onLaunchWeeklyHabitReview?.();
  };

  const handleLaunchYesterdayTodoCleanup = () => {
    setFolder1Open(false);
    onLaunchYesterdayTodoCleanup?.();
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

  const handleThemeCheckout = async (theme: ThemeMetadata, access: ThemeAccessResult) => {
    if (!access.checkoutSkuId) {
      setThemeCheckoutError('This theme is not ready for checkout yet.');
      return;
    }

    setThemeCheckoutLoadingId(theme.id);
    setThemeCheckoutError(null);
    try {
      const { url, error } = await initiateThemeCheckout({
        themeId: theme.id,
        skuId: access.checkoutSkuId as ThemeCheckoutSkuId,
        variant: access.status === 'available_for_paired_purchase' ? 'paired' : 'base',
      });
      if (error || !url) {
        setThemeCheckoutError(error?.message ?? 'Unable to start theme checkout.');
        return;
      }
      redirectToUrl(url);
    } finally {
      setThemeCheckoutLoadingId(null);
    }
  };

  const handleSettingsModuleClick = (featureId: FeatureAvailabilityId, setModuleOpen: (isOpen: boolean) => void) => {
    const isUserOverride = isUserFeatureEnabled(session.user.id, featureId);
    const access = resolveFeatureAccess(featureId, { isAdminOrCreator: isAdmin === true || isUserOverride });

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
  const handleExperimentalFeaturesClick = () => setShowExperimentsModal(true);
  const handleAdvancedToolsClick = () => {
    setFolder1Open(true);
  };

  const handleAccountLifecycleAction = async (action: AccountLifecycleAction) => {
    if (isDemoExperience || accountLifecycleAction) return;
    const confirmationWord = action === 'reset' ? 'RESET' : 'DELETE';
    const description = action === 'reset'
      ? 'This will delete your LifeGoal app data in Supabase and keep your email login.'
      : 'This will permanently delete your login and your LifeGoal app data in Supabase.';
    const typed = window.prompt(`${description} Type ${confirmationWord} to continue.`);
    if (typed !== confirmationWord) return;

    setAccountLifecycleAction(action);
    setAccountLifecycleStatus(null);

    const { data, error } = await runAccountLifecycleAction(action);

    if (error) {
      setAccountLifecycleStatus({ type: 'error', text: error.message });
      setAccountLifecycleAction(null);
      return;
    }

    const resetSummary = action === 'reset'
      ? `Reset complete. Removed ${data?.deletedRows ?? 0} rows across ${data?.deletedTables ?? 0} data area${data?.deletedTables === 1 ? '' : 's'}. Reloading…`
      : 'Account deleted. Signing out…';
    setAccountLifecycleStatus({ type: 'success', text: resetSummary });

    window.setTimeout(() => {
      if (action === 'delete') {
        void onSignOut();
        return;
      }
      window.location.reload();
    }, 900);
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
            {canManageBilling || !isDemoExperience ? (
              <div className="account-panel__subscription-cta-split">
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
                    onClick={() => setRollsBudgetFolderOpen(true)}
                  >
                    <span className="account-panel__plan-btn-title">Rolls Budget</span>
                    <span className="account-panel__plan-btn-meta">Manage dice refill options</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

      </div>

      <section className="account-panel__card settings-modules" aria-labelledby="settings-modules-heading">
        <div className="settings-modules__header">
          <p className="account-panel__eyebrow">Settings</p>
          <h3 id="settings-modules-heading">Feature Hub</h3>
        </div>
        {onGameModePreferenceChange ? (
          <div className="mobile-menu-overlay__settings-toggle-row account-panel__game-menu-toggle-row">
            <span className="mobile-menu-overlay__settings-toggle-copy">
              <span className="mobile-menu-overlay__settings-toggle-title">Turn off game menu</span>
              <span className="mobile-menu-overlay__settings-toggle-note">Hide the visual game-mode menu style.</span>
            </span>
            <button
              type="button"
              className={`mobile-footer-nav__diode-toggle ${
                isMobileMenuImageActive
                  ? 'mobile-footer-nav__diode-toggle--on'
                  : 'mobile-footer-nav__diode-toggle--off'
              }`}
              aria-pressed={isMobileMenuImageActive}
              aria-label="Turn off game menu"
              onClick={() => {
                const nextIsActive = !isMobileMenuImageActive;
                void onGameModePreferenceChange(nextIsActive);
              }}
            />
          </div>
        ) : null}
        <div className="settings-modules__group" aria-label="Personalization settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">Personalization</p>
          </div>
          <div className="settings-modules__grid">
            <SettingsFeatureCard
              icon="🎨"
              title="Theme"
              onClick={() => setAppearanceFolderOpen(true)}
            />
            <SettingsFeatureCard
              icon="🎊"
              title="Holiday"
              featureId="settings.holidayThemes"
              onClick={handleHolidayThemesClick}
            />
            <SettingsFeatureCard
              icon="🎁"
              title="Birthday Gift"
              onClick={() => setBirthdayGiftFolderOpen(true)}
            />
          </div>
        </div>
        <div className="settings-modules__group" aria-label="Comfort and alerts settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">Comfort &amp; Alerts</p>
          </div>
          <div className="settings-modules__grid">
            <SettingsFeatureCard
              icon="🔊"
              title="Sound"
              onClick={() => setSoundFolderOpen(true)}
            />
            <SettingsFeatureCard
              icon="📳"
              title="Vibration"
              onClick={() => setHapticsFolderOpen(true)}
            />
            <SettingsFeatureCard
              icon="🪪"
              title="Menu Icon"
              onClick={() => setMenuDisplayFolderOpen(true)}
            />
            <SettingsFeatureCard
              icon="⏰"
              title="Reminders"
              onClick={handleRemindersClick}
            />
            <SettingsFeatureCard
              icon="🔔"
              title="Notifications"
              featureId="settings.notifications"
              onClick={handleNotificationsClick}
            />
          </div>
        </div>
        <div className="settings-modules__group" aria-label="Quick settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">Quick modules</p>
          </div>
          <div className="settings-modules__grid">
            <SettingsFeatureCard
              icon="🛡️"
              title="AI & Privacy"
              onClick={() => setAiPrivacyFolderOpen(true)}
            />
            {onLaunchLeapProgress ? (
              <SettingsFeatureCard
                icon="🧭"
                title="Leap Progress"
                onClick={() => setOnboardingToolsFolderOpen(true)}
              />
            ) : null}
            <SettingsFeatureCard
              icon="🔧"
              title="Advanced"
              onClick={handleAdvancedToolsClick}
            />
            <SettingsFeatureCard
              icon="✨"
              title="Personalize"
              onClick={() => setPersonalizationModalOpen(true)}
            />
            <SettingsFeatureCard
              icon="🎮"
              title="Rewards"
              onClick={() => setGameRewardsFolderOpen(true)}
            />
            <SettingsFeatureCard
              icon="⚗️"
              title="Experiments"
              featureId="settings.experimentalFeatures"
              onClick={handleExperimentalFeaturesClick}
            />
            <SettingsFeatureCard
              icon="🔄"
              title="Device Cache"
              onClick={() => setCacheFolderOpen(true)}
            />
          </div>
        </div>
        <div className="settings-modules__group" aria-label="About settings modules">
          <div className="settings-modules__group-header">
            <p className="settings-modules__group-eyebrow">About</p>
          </div>
          <div className="settings-modules__grid">
            <SettingsFeatureCard
              icon="💌"
              title="Creator Note"
              onClick={() => setCreatorNoteOpen(true)}
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


      <PersonalizationModal
        isOpen={personalizationModalOpen}
        onClose={() => setPersonalizationModalOpen(false)}
        initialName={profile?.full_name ?? ''}
        rankLabel={`Island ${islandRunState.currentIslandNumber ?? 1} Explorer`}
        progressLabel={`${stats?.habitCount ?? 0} habits • ${stats?.goalCount ?? 0} goals • ${stats?.checkinCount ?? 0} check-ins`}
        onSaveName={async (nextName) => {
          if (!profile || isDemoExperience) return;
          const { data, error } = await upsertWorkspaceProfile({
            ...profile,
            full_name: nextName,
          });
          if (error) throw error;
          if (data && onProfileUpdate) onProfileUpdate(data);
        }}
      />

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

      <SettingsFolderPopup
        isOpen={folder1Open}
        onClose={() => setFolder1Open(false)}
        title="Advanced Settings"
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

        <section className="account-panel__card" aria-labelledby="account-cloud-sync">
          <p className="account-panel__eyebrow">Data &amp; security</p>
          <h3 id="account-cloud-sync">
            Cloud sync &amp; service health <SyncIndicator />
          </h3>
          <p className="account-panel__hint">
            Live status of cloud services, pending offline changes, and a diagnostics export you can
            share with support. Changes made while offline stay on this device until sync returns.
          </p>
          <ServiceDiagnosticsPanel />
        </section>

        <section className="account-panel__card" aria-labelledby="account-danger-zone">
          <p className="account-panel__eyebrow">Danger zone</p>
          <h3 id="account-danger-zone">Account reset &amp; deletion</h3>
          <p className="account-panel__hint">
            These actions are intentionally tucked away. Reset keeps your email login and removes app data so you can start over. Delete removes your Supabase login and cascades user-owned app data. Neither action cancels an active Stripe subscription; manage billing first if needed.
          </p>
          {isDemoExperience ? (
            <p className="account-panel__hint">Demo mode cannot reset or delete a Supabase account.</p>
          ) : null}
          <div className="account-panel__actions-row">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void handleAccountLifecycleAction('reset')}
              disabled={isDemoExperience || accountLifecycleAction !== null}
            >
              {accountLifecycleAction === 'reset' ? 'Resetting…' : 'Reset account data'}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void handleAccountLifecycleAction('delete')}
              disabled={isDemoExperience || accountLifecycleAction !== null}
            >
              {accountLifecycleAction === 'delete' ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
          <p className="account-panel__hint" style={{ marginTop: '0.5rem' }}>
            You will be asked to type {`RESET`} or {`DELETE`} before either action runs.
          </p>
          {accountLifecycleStatus ? (
            <p className={`account-panel__saving-indicator account-panel__message--${accountLifecycleStatus.type}`} role={accountLifecycleStatus.type === 'error' ? 'alert' : 'status'}>
              {accountLifecycleStatus.text}
            </p>
          ) : null}
        </section>

        {showAdminTools ? (
          <>
            <section className="account-panel__card" aria-labelledby="account-cache">
              <p className="account-panel__eyebrow">PWA Tools</p>
              <h3 id="account-cache">Clear PWA asset cache</h3>
              <p className="account-panel__hint">
                Remove cached PWA assets and unregister the service worker so you can verify a fresh build.
              </p>
              <div className="account-panel__actions-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleClearPwaCache}
                  disabled={cacheClearing}
                >
                  {cacheAction === 'pwa' ? 'Clearing…' : 'Clear PWA assets & refresh'}
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
            {onLaunchFirstRunOnboarding ? (
              <section className="account-panel__card" aria-labelledby="advanced-first-run-onboarding-launcher">
                <p className="account-panel__eyebrow">Admin-only development</p>
                <h3 id="advanced-first-run-onboarding-launcher">First-start onboarding</h3>
                <p className="account-panel__hint">
                  Manually launch the first-start founder panels and guided game handoff for development review. This control only renders for admins.
                </p>
                <div className="account-panel__actions-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setFolder1Open(false);
                      onLaunchFirstRunOnboarding();
                    }}
                  >
                    Launch first-start onboarding
                  </button>
                </div>
              </section>
            ) : null}

            <section className="account-panel__card" aria-labelledby="advanced-weekly-habit-review-launcher">
              <p className="account-panel__eyebrow">Habits</p>
              <h3 id="advanced-weekly-habit-review-launcher">Weekly habit review</h3>
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

            <section className="account-panel__card" aria-labelledby="advanced-yesterday-todo-cleanup-launcher">
              <p className="account-panel__eyebrow">Todo schedule</p>
              <h3 id="advanced-yesterday-todo-cleanup-launcher">Undone todo schedule popup</h3>
              <p className="account-panel__hint">
                Open the cleanup popup that helps schedule unfinished todos from yesterday.
              </p>
              <div className="account-panel__actions-row">
                <button
                  type="button"
                  className="btn"
                  onClick={handleLaunchYesterdayTodoCleanup}
                  disabled={!onLaunchYesterdayTodoCleanup}
                >
                  Launch undone todo schedule popup
                </button>
              </div>
            </section>

            <GameDebugLogSection />

            <ViewportDiagnosticsSection />

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

            <section className="account-panel__card" aria-labelledby="admin-tools-telemetry">
              <p className="account-panel__eyebrow">Admin telemetry</p>
              <h3 id="admin-tools-telemetry">Telemetry overview</h3>
              <p className="account-panel__hint">
                Aggregated usage statistics rolled up nightly from telemetry events. Raw events are pruned
                after 30 days; these rollups keep the stats forever. Admin-only.
              </p>
              <AdminTelemetryPanel session={session} />
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
          </>
        ) : null}
      </SettingsFolderPopup>

      {/* Folder 2 Popup */}
      <SettingsFolderPopup
        isOpen={rollsBudgetFolderOpen}
        onClose={() => setRollsBudgetFolderOpen(false)}
        title="Rolls Budget"
      >
        <section className="account-panel__card" aria-labelledby="rolls-budget-tools">
          <p className="account-panel__eyebrow">Dice wallet</p>
          <h3 id="rolls-budget-tools">Rolls budget</h3>
          <p className="account-panel__hint">Quickly refill your dice wallet with a one-tap purchase.</p>
          <div className="account-panel__subscription-cta-grid" style={{ marginTop: '0.75rem' }}>
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
          </div>
        </section>
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={appearanceFolderOpen}
        onClose={() => setAppearanceFolderOpen(false)}
        title="Appearance / Theme"
      >
        <section className="account-panel__card" aria-labelledby="account-theme">
          <p className="account-panel__eyebrow">Appearance</p>
          {themeEntitlementsLoading ? (
            <p className="account-panel__hint">Syncing your owned themes…</p>
          ) : null}
          {themeEntitlementsError ? (
            <p className="account-panel__hint">{themeEntitlementsError}</p>
          ) : null}
          {themeCheckoutError ? (
            <p className="account-panel__hint">{themeCheckoutError}</p>
          ) : null}
          <ThemeSelector
            isAdminOrCreator={isAdmin === true}
            accessContext={themeAccessContext}
            checkoutLoadingThemeId={themeCheckoutLoadingId}
            onThemeCheckout={handleThemeCheckout}
          />
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

      <SettingsFolderPopup isOpen={cacheFolderOpen} onClose={() => setCacheFolderOpen(false)} title="Device cache tools">
        <section className="account-panel__card" aria-labelledby="account-reset-cache">
          <p className="account-panel__eyebrow">App maintenance</p>
          <h3 id="account-reset-cache">Clear PWA asset cache</h3>
          <p className="account-panel__hint">
            If the app feels stuck or shows outdated content, clear the PWA asset cache first. This removes Cache Storage entries and unregisters the service worker, then reloads.
          </p>
          <div className="account-panel__actions-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleClearPwaCache}
              disabled={cacheClearing}
            >
              {cacheAction === 'pwa' ? 'Clearing…' : 'Clear PWA assets & refresh'}
            </button>
            {cacheStatus ? <span className="account-panel__saving-indicator">{cacheStatus}</span> : null}
          </div>
          <div className="account-panel__maintenance-actions" aria-label="Additional device cache actions">
            <div>
              <h4>More local cleanup actions</h4>
              <p className="account-panel__hint">
                These are more destructive and only affect this device. They do not delete your Supabase account data, and local storage cleanup preserves Supabase sign-in tokens.
              </p>
            </div>
            <div className="account-panel__actions-row">
              <button type="button" className="btn btn--secondary" onClick={handleClearOfflineQueue} disabled={cacheClearing}>
                {cacheAction === 'queue' ? 'Clearing…' : 'Clear offline queue'}
              </button>
              <button type="button" className="btn btn--secondary" onClick={handleClearLocalAppStorage} disabled={cacheClearing}>
                {cacheAction === 'storage' ? 'Clearing…' : 'Clear local app storage'}
              </button>
              <button type="button" className="btn btn--danger" onClick={handleHardResetDeviceCache} disabled={cacheClearing}>
                {cacheAction === 'hard-reset' ? 'Resetting…' : 'Hard reset device caches'}
              </button>
            </div>
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

      <SettingsFolderPopup
        isOpen={soundFolderOpen}
        onClose={() => setSoundFolderOpen(false)}
        title="Sound effects"
      >
        <section className="account-panel__card" aria-labelledby="account-sound-effects">
          <p className="account-panel__eyebrow">Sound design</p>
          <h3 id="account-sound-effects">App sound effects</h3>
          <p className="account-panel__hint">
            Turn launcher swooshes and footer button clicks on or off. Your choice is saved to your account.
          </p>
          <div className="account-panel__actions-row" role="radiogroup" aria-label="Sound effects">
            <button
              type="button"
              className={`btn ${!soundEffectsEnabled ? 'btn--primary' : ''}`}
              aria-pressed={!soundEffectsEnabled}
              disabled={soundPreferenceSaving}
              onClick={() => void onSoundEffectsEnabledChange(false)}
            >
              Off
            </button>
            <button
              type="button"
              className={`btn ${soundEffectsEnabled ? 'btn--primary' : ''}`}
              aria-pressed={soundEffectsEnabled}
              disabled={soundPreferenceSaving}
              onClick={() => void onSoundEffectsEnabledChange(true)}
            >
              On
            </button>
          </div>
          <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>
            {soundPreferenceSaving
              ? 'Saving sound preference…'
              : `Sound effects: ${soundEffectsEnabled ? 'On' : 'Off'}`}
          </p>
          {soundPreferenceError ? (
            <p className="account-panel__warning" role="alert">
              {soundPreferenceError}
            </p>
          ) : null}
        </section>
      </SettingsFolderPopup>

      <SettingsFolderPopup isOpen={birthdayGiftFolderOpen} onClose={() => setBirthdayGiftFolderOpen(false)} title="Birthday gift">
        <section className="account-panel__card" aria-labelledby="account-birthday-gift">
          <p className="account-panel__eyebrow">Rewards</p>
          <h3 id="account-birthday-gift">Birthday gift</h3>
          <p className="account-panel__hint">Opt in to receive a birthday gift worth 💎 1 diamond plus the free Birthday Wish theme on your first eligible claim. Birthday gifts are separate from AI coach life-stage access; the coach only uses birthday-derived age range if you enable Life stage in AI settings.</p>
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
        title="Leap Progress"
      >
        <section className="account-panel__card" aria-labelledby="account-onboarding">
          <p className="account-panel__eyebrow">Leap Progress</p>
          <h3 id="account-onboarding">Leap Progress</h3>
          <p className="account-panel__hint">
            An optional 12-stage sprint to quickly level up your quest, or the Day Zero quick start.
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
                <code>{`leap_progress_${session.user.id}`}</code>
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
            <button type="button" className="btn" onClick={() => onLaunchLeapProgress?.()} disabled={!onLaunchLeapProgress}>
              Launch Leap Progress
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
              onClick={() => onLaunchLeapProgress?.({ reset: true })}
              disabled={!onLaunchLeapProgress}
            >
              Restart Leap Progress
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
        <ExperimentalFeaturesSection
          session={session}
          isAdmin={showAdminTools}
          onLaunchYesterdayTodoCleanup={onLaunchYesterdayTodoCleanup}
        />
      </SettingsFolderPopup>

      {creatorNoteOpen ? (
        <CreatorNoteModal onClose={() => setCreatorNoteOpen(false)} closeLabel="Done" />
      ) : null}

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

      {showExperimentsModal ? (
        <ExperimentsModal
          session={session}
          onClose={() => setShowExperimentsModal(false)}
        />
      ) : null}
    </div>
  );
}
