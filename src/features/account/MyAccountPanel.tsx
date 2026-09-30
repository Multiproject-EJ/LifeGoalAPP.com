import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { ThemeSelector } from '../../components/ThemeSelector';
import { useTheme, type Theme, type ThemeAccessResult, type ThemeCheckoutSkuId, type ThemeMetadata } from '../../contexts/ThemeContext';
import { NotificationSettingsSection, PushNotificationTestPanel, DailyReminderPreferences, PerHabitReminderPrefs, ReminderActionDebugPanel, ReminderAnalyticsDashboard } from '../notifications';
import { AiSettingsSection } from './AiSettingsSection';
import { AiPrivacySettings } from './AiPrivacySettings';
import { SettingsGroup, SettingsRow, SettingsSegmented, SettingsSwitch } from './SettingsList';
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
import { PersonalizationModal } from '../../components/PersonalizationModal';
import { CreatorNoteModal } from '../onboarding/FounderWelcome';
import { CreatorStory } from '../onboarding/CreatorStory';
import { ExperimentsModal } from '../../components/ExperimentsModal';
import { HolidayPreferencesSection, HOLIDAY_OPTIONS } from './HolidayPreferencesSection';
import { CaseSubmissionModal } from '../cases/CaseSubmissionModal';
import { MyCasesPanel } from '../cases/MyCasesPanel';
import { AdminHub } from '../admin/AdminHub';
import { FutureFeatureVotingPanel } from './FutureFeatureVotingPanel';
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
import {
  DEVELOPER_DAY_LOOP_MAX_DAY,
  readDeveloperDayLoopDay,
  resolveDeveloperDayLoopScenario,
  type DeveloperDayLoopLaunchResult,
} from '../gamification/level-worlds/services/developerDayLoop';

type MyAccountPanelProps = {
  session: Session;
  isDemoExperience: boolean;
  isAuthenticated: boolean;
  onSignOut: () => void | Promise<void>;
  onEditProfile: () => void;
  onLaunchLeapProgress?: (options?: { reset?: boolean }) => void;
  onLaunchDayZeroOnboarding?: (options?: { reset?: boolean }) => void;
  onLaunchFirstRunOnboarding?: () => void;
  onRunDeveloperDayLoop?: (day: number) => Promise<DeveloperDayLoopLaunchResult>;
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
  /**
   * Open one settings surface as soon as the panel mounts, for launchers that
   * deep-link into it — `personalization` is the ✨ Personalize modal (name,
   * ship, traits, theme mode), `appearance` the Appearance / Theme folder. The
   * panel clears it through `onInitialFolderOpened` so returning to settings
   * later lands on the normal index.
   */
  initialFolder?: 'personalization' | 'appearance' | 'admin' | null;
  onInitialFolderOpened?: () => void;
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
  onRunDeveloperDayLoop,
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
  initialFolder = null,
  onInitialFolderOpened,
}: MyAccountPanelProps) {
  const [folder1Open, setFolder1Open] = useState(false);
  const [adminHubOpen, setAdminHubOpen] = useState(initialFolder === 'admin');
  const [planFolderOpen, setPlanFolderOpen] = useState(false);
  const [holidayFolderOpen, setHolidayFolderOpen] = useState(false);
  const [remindersFolderOpen, setRemindersFolderOpen] = useState(false);
  const [appearanceFolderOpen, setAppearanceFolderOpen] = useState(initialFolder === 'appearance');
  const [birthdayGiftFolderOpen, setBirthdayGiftFolderOpen] = useState(false);
  const [onboardingToolsFolderOpen, setOnboardingToolsFolderOpen] = useState(false);
  const [aiPrivacyFolderOpen, setAiPrivacyFolderOpen] = useState(false);
  const [showExperimentsModal, setShowExperimentsModal] = useState(false);
  const [gameRewardsFolderOpen, setGameRewardsFolderOpen] = useState(false);
  const [cacheFolderOpen, setCacheFolderOpen] = useState(false);
  const [creatorNoteOpen, setCreatorNoteOpen] = useState(false);
  const [creatorNoteAsText, setCreatorNoteAsText] = useState(false);
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
  const [personalizationModalOpen, setPersonalizationModalOpen] = useState(
    initialFolder === 'personalization',
  );
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState<'upgrade_monthly' | 'upgrade_yearly' | 'manage' | 'buy_rolls' | null>(null);
  const [rollsBudgetFolderOpen, setRollsBudgetFolderOpen] = useState(false);

  // A deep-link can also arrive while the panel is already mounted, so honour
  // it here too, then report back so the request is consumed once.
  useEffect(() => {
    if (!initialFolder) return;
    if (initialFolder === 'personalization') setPersonalizationModalOpen(true);
    if (initialFolder === 'appearance') setAppearanceFolderOpen(true);
    if (initialFolder === 'admin') setAdminHubOpen(true);
    onInitialFolderOpened?.();
  }, [initialFolder, onInitialFolderOpened]);
  const { themeMode, setThemeMode } = useTheme();
  const [ownedThemeIds, setOwnedThemeIds] = useState<Set<Theme>>(new Set());
  const [themeEntitlementsLoading, setThemeEntitlementsLoading] = useState(false);
  const [themeEntitlementsError, setThemeEntitlementsError] = useState<string | null>(null);
  const [themeCheckoutLoadingId, setThemeCheckoutLoadingId] = useState<Theme | null>(null);
  const [themeCheckoutError, setThemeCheckoutError] = useState<string | null>(null);
  const [accountLifecycleAction, setAccountLifecycleAction] = useState<AccountLifecycleAction | null>(null);
  const [accountLifecycleStatus, setAccountLifecycleStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [developerDayLoopDay, setDeveloperDayLoopDay] = useState(() => (
    readDeveloperDayLoopDay(session.user.user_metadata)
  ));
  const [developerDayLoopPending, setDeveloperDayLoopPending] = useState(false);
  const [developerDayLoopConfirmOpen, setDeveloperDayLoopConfirmOpen] = useState(false);
  const [developerDayLoopStatus, setDeveloperDayLoopStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
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

  const showAdminTools = isAdmin === true;

  useEffect(() => {
    setDeveloperDayLoopDay(readDeveloperDayLoopDay(session.user.user_metadata));
  }, [session.user.user_metadata]);

  const developerDayLoopScenario = resolveDeveloperDayLoopScenario(developerDayLoopDay);

  const runDeveloperDayLoop = async () => {
    if (!onRunDeveloperDayLoop || developerDayLoopPending) return;
    setDeveloperDayLoopPending(true);
    setDeveloperDayLoopStatus(null);
    try {
      const result = await onRunDeveloperDayLoop(developerDayLoopDay);
      setDeveloperDayLoopStatus({
        type: result.ok ? 'success' : 'error',
        text: result.message,
      });
      if (result.ok) {
        setDeveloperDayLoopConfirmOpen(false);
        setFolder1Open(false);
      }
    } catch (error) {
      setDeveloperDayLoopStatus({
        type: 'error',
        text: `The Day Loop could not start: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setDeveloperDayLoopPending(false);
    }
  };

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

  // Developer and QA tools; shown in the Admin screen's "Dev tools" tab.
  const adminDevTools = showAdminTools ? (
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
            {cacheAction === 'pwa' ? 'Refreshing…' : 'Refresh the app'}
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
      {onRunDeveloperDayLoop ? (
        <section className="account-panel__card developer-day-loop" aria-labelledby="advanced-developer-day-loop">
          <p className="account-panel__eyebrow">Admin-only development</p>
          <h3 id="advanced-developer-day-loop">Day Loop controller</h3>
          <p className="account-panel__hint">
            Rehearse the player journey one day at a time without changing the phone date. Day 1 is a clean replay; later days keep the progress you actually earned.
          </p>
          <label className="developer-day-loop__field">
            <span>Journey day</span>
            <select
              value={developerDayLoopDay}
              onChange={(event) => {
                setDeveloperDayLoopDay(Number(event.target.value));
                setDeveloperDayLoopConfirmOpen(false);
                setDeveloperDayLoopStatus(null);
              }}
              disabled={developerDayLoopPending}
            >
              {Array.from({ length: DEVELOPER_DAY_LOOP_MAX_DAY }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>Day {day}</option>
              ))}
            </select>
          </label>
          <div className="developer-day-loop__scenario">
            <strong>{developerDayLoopScenario.title}</strong>
            <span>{developerDayLoopScenario.description}</span>
          </div>

          {developerDayLoopScenario.resetIslandRunProgress && developerDayLoopConfirmOpen ? (
            <div className="developer-day-loop__confirm" role="alert">
              <strong>Reset and replay Day 1?</strong>
              <p>
                Island Run, creatures, eggs, rewards, XP, and level will return to their fresh-start state.
                Habits, todos, journals, achievements, identity, and the real date stay untouched.
              </p>
              <div className="account-panel__actions-row developer-day-loop__actions">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => void runDeveloperDayLoop()}
                  disabled={developerDayLoopPending}
                >
                  {developerDayLoopPending ? 'Preparing Day 1…' : 'Yes, reset & start Day 1'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setDeveloperDayLoopConfirmOpen(false)}
                  disabled={developerDayLoopPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="account-panel__actions-row developer-day-loop__actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (developerDayLoopScenario.resetIslandRunProgress) {
                    setDeveloperDayLoopConfirmOpen(true);
                    return;
                  }
                  void runDeveloperDayLoop();
                }}
                disabled={developerDayLoopPending}
              >
                {developerDayLoopPending
                  ? `Preparing Day ${developerDayLoopDay}…`
                  : developerDayLoopScenario.resetIslandRunProgress
                    ? 'Reset & start Day 1'
                    : `Set Day ${developerDayLoopDay} & open Today`}
              </button>
              {onLaunchFirstRunOnboarding ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setFolder1Open(false);
                    onLaunchFirstRunOnboarding();
                  }}
                  disabled={developerDayLoopPending}
                >
                  Preview intro without reset
                </button>
              ) : null}
            </div>
          )}
          {developerDayLoopStatus ? (
            <p className={`account-panel__message account-panel__message--${developerDayLoopStatus.type}`}>
              {developerDayLoopStatus.text}
            </p>
          ) : null}
          <p className="developer-day-loop__note">
            Day 2–30 are non-destructive journey markers. They reopen Today and preserve the state created by your previous testing.
          </p>
        </section>
      ) : onLaunchFirstRunOnboarding ? (
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
  ) : null;

  const displayName = profile?.full_name?.trim() || (isDemoExperience ? 'Demo player' : 'Player');
  const profileMeta = [
    `Island ${islandRunState.currentIslandNumber ?? 1} Explorer`,
    user.email && !isDemoExperience ? user.email : null,
  ].filter(Boolean).join(' · ');
  const hapticLabel = hapticMode === 'off' ? 'Off' : hapticMode === 'subtle' ? 'Subtle' : 'Full';

  return (
    <div className="account-panel account-panel--list">
      {showDemoNotice ? (
        <p className="account-panel__notice">
          You’re exploring demo data. Sign in to save your progress.
        </p>
      ) : null}
      <AdminHub
        session={session}
        isOpen={showAdminTools && adminHubOpen}
        onClose={() => setAdminHubOpen(false)}
        devTools={adminDevTools}
      />
      {resolvedBillingBanner ? (
        <p className={`notification-preferences__message ${
          resolvedBillingBanner.kind === 'canceled'
            ? 'notification-preferences__message--error'
            : 'notification-preferences__message--success'
        }`} role="status">
          {resolvedBillingBanner.message}
        </p>
      ) : null}

      <div className="settings-list">
        <button
          type="button"
          className="settings-list__profile"
          onClick={() => setPersonalizationModalOpen(true)}
          aria-label={`Edit profile: ${displayName}`}
        >
          <span className="settings-list__avatar" aria-hidden="true">
            {userInitials || '🚀'}
          </span>
          <span>
            <span className="settings-list__profile-name">{displayName}</span>
            <span className="settings-list__profile-meta">{profileMeta}</span>
          </span>
          <span className={`settings-list__chip${isPro ? ' settings-list__chip--pro' : ''}`}>
            {isDemoExperience ? 'Demo' : isPro ? 'Pro' : 'Free plan'}
          </span>
        </button>

        {showAdminTools ? (
          <button type="button" className="account-panel__admin-entry" onClick={() => setAdminHubOpen(true)}>
            <span className="account-panel__admin-entry-title">Admin</span>
            <span className="account-panel__admin-entry-hint">Waitlist, players, alerts and dev tools</span>
            <span aria-hidden="true">›</span>
          </button>
        ) : null}

        <SettingsGroup title="Account">
          <SettingsRow
            icon="⭐"
            tone="gold"
            title="Plan & billing"
            subtitle={isPro ? `${planName} · renews ${renewsOn}` : 'Upgrade to Pro, manage renewal'}
            onClick={() => setPlanFolderOpen(true)}
          />
          {!isDemoExperience ? (
            <SettingsRow
              icon="🎲"
              tone="blue"
              title="Dice rolls"
              value={billingLoading ? '…' : walletRolls}
              onClick={() => setRollsBudgetFolderOpen(true)}
            />
          ) : null}
        </SettingsGroup>

        <SettingsGroup title="Look & feel">
          <SettingsRow
            icon="🎨"
            tone="purple"
            title="Appearance"
            control={(
              <SettingsSegmented
                label="Appearance"
                value={themeMode}
                onChange={setThemeMode}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'Auto' },
                ]}
              />
            )}
          />
          <SettingsRow icon="🖼️" tone="pink" title="Themes" onClick={() => setAppearanceFolderOpen(true)} />
          <SettingsRow icon="🎊" tone="orange" title="Holiday themes" onClick={() => setHolidayFolderOpen(true)} />
          {onGameModePreferenceChange ? (
            <SettingsRow
              icon="🎮"
              tone="green"
              title="Game-style menu"
              subtitle="The illustrated game menu"
              control={(
                <SettingsSwitch
                  label="Game-style menu"
                  checked={isMobileMenuImageActive}
                  onChange={(next) => void onGameModePreferenceChange(next)}
                />
              )}
            />
          ) : null}
          <SettingsRow
            icon="🪪"
            tone="gray"
            title="Initials as menu icon"
            subtitle={profile?.full_name ? undefined : 'Add your name in your profile first'}
            control={(
              <SettingsSwitch
                label="Show my initials as the menu icon"
                checked={profile?.show_initials_in_menu ?? false}
                disabled={savingPreference || !profile?.full_name || isDemoExperience}
                onChange={(next) => void handleToggleInitialsInMenu(next)}
              />
            )}
          />
        </SettingsGroup>

        <SettingsGroup title="Notifications & feedback">
          <SettingsRow
            icon="🔔"
            tone="orange"
            title="Reminders & notifications"
            subtitle="Habits, daily prompts, quiet hours"
            onClick={() => setRemindersFolderOpen(true)}
          />
          <SettingsRow
            icon="🔊"
            tone="blue"
            title="Sound effects"
            subtitle={soundPreferenceError ?? undefined}
            control={(
              <SettingsSwitch
                label="Sound effects"
                checked={soundEffectsEnabled}
                disabled={soundPreferenceSaving}
                onChange={(next) => void onSoundEffectsEnabledChange(next)}
              />
            )}
          />
          <SettingsRow
            icon="📳"
            tone="gray"
            title="Vibration"
            control={(
              <SettingsSegmented
                label={`Vibration: ${hapticLabel}`}
                value={hapticMode}
                onChange={(next) => {
                  setHapticMode(next);
                  setHapticModeState(next);
                  if (next !== 'off') triggerCompletionHaptic('light', { channel: 'navigation', minIntervalMs: 0 });
                }}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'subtle', label: 'Subtle' },
                  { value: 'balanced', label: 'Full' },
                ]}
              />
            )}
          />
        </SettingsGroup>

        <SettingsGroup title="Game">
          <SettingsRow
            icon="🏆"
            tone="gold"
            title="Game & rewards"
            subtitle="XP, streaks, Island Run progress"
            onClick={() => setGameRewardsFolderOpen(true)}
          />
          <SettingsRow
            icon="🎁"
            tone="pink"
            title="Birthday gift"
            value={isBirthdayGiftEnabled ? 'On' : 'Off'}
            onClick={() => setBirthdayGiftFolderOpen(true)}
          />
          {onLaunchLeapProgress ? (
            <SettingsRow
              icon="🧭"
              tone="blue"
              title="Leap progress"
              subtitle="A 12-stage quick-start sprint"
              onClick={() => setOnboardingToolsFolderOpen(true)}
            />
          ) : null}
          <SettingsRow
            icon="🧪"
            tone="green"
            title="Early features"
            subtitle="Try what we're building next"
            value="Beta"
            onClick={handleExperimentalFeaturesClick}
          />
        </SettingsGroup>

        <SettingsGroup title="Privacy & data">
          <SettingsRow
            icon="🛡️"
            tone="green"
            title="AI & privacy"
            subtitle="On-device AI when your phone supports it"
            onClick={() => setAiPrivacyFolderOpen(true)}
          />
          <SettingsRow
            icon="📦"
            tone="gray"
            title="Your data"
            subtitle="Account info, reset or delete"
            onClick={handleAdvancedToolsClick}
          />
        </SettingsGroup>

        <SettingsGroup title="Help">
          <SettingsRow icon="💬" tone="blue" title="Feedback & support" onClick={() => setFeedbackSupportFolderOpen(true)} />
          <SettingsRow
            icon="🧰"
            tone="gray"
            title="Fix app problems"
            subtitle="Sync status, refresh the app"
            onClick={() => setCacheFolderOpen(true)}
          />
          <SettingsRow icon="💌" tone="pink" title="A note from the creator" onClick={() => setCreatorNoteOpen(true)} />
        </SettingsGroup>

        {isAuthenticated ? (
          <SettingsGroup>
            <SettingsRow title="Sign out" danger onClick={() => void onSignOut()} />
          </SettingsGroup>
        ) : null}
      </div>

      <SettingsFolderPopup
        isOpen={planFolderOpen}
        onClose={() => setPlanFolderOpen(false)}
        title="Plan & billing"
      >
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
      </SettingsFolderPopup>

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
        title="Your data"
      >
        <section className="account-panel__card" aria-labelledby="account-data">
          <p className="account-panel__eyebrow">Account</p>
          <h3 id="account-data">Account info</h3>
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
        title="Themes"
      >
        <section className="account-panel__card" aria-labelledby="account-theme">
          <p className="account-panel__eyebrow">Appearance</p>
          {themeEntitlementsLoading ? (
            <p className="account-panel__hint">Syncing your owned themes…</p>
          ) : null}
          {themeEntitlementsError ? (
            <p className="account-panel__hint">
              Couldn’t check which themes you own right now. Purchased themes will show again once you’re online.
            </p>
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

      <SettingsFolderPopup isOpen={cacheFolderOpen} onClose={() => setCacheFolderOpen(false)} title="Fix app problems">
        <section className="account-panel__card" aria-labelledby="account-cloud-sync">
          <p className="account-panel__eyebrow">Sync</p>
          <h3 id="account-cloud-sync">
            Sync status <SyncIndicator />
          </h3>
          <p className="account-panel__hint">
            Live status of cloud services, pending offline changes, and a diagnostics export you can
            share with support. Changes made while offline stay on this device until sync returns.
          </p>
          <ServiceDiagnosticsPanel />
        </section>

        <section className="account-panel__card" aria-labelledby="account-reset-cache">
          <p className="account-panel__eyebrow">App maintenance</p>
          <h3 id="account-reset-cache">Refresh the app</h3>
          <p className="account-panel__hint">
            If the app feels stuck or shows outdated content, try this first. It downloads a fresh copy of the app and reloads. You stay signed in.
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
              <h4>Still stuck?</h4>
              <p className="account-panel__hint">
                These clear more of what this device has stored. They never delete your account or synced progress, and you stay signed in. Changes made offline that haven’t synced yet can be lost.
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
                {cacheAction === 'hard-reset' ? 'Resetting…' : 'Reset everything on this device'}
              </button>
            </div>
          </div>
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
        title="Leap progress"
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
        title="Game & rewards"
      >
        <GamificationSettings session={session} />
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={aiPrivacyFolderOpen}
        onClose={() => setAiPrivacyFolderOpen(false)}
        title="AI & privacy"
      >
        <AiPrivacySettings />

        <AiSettingsSection session={session} />

        <TelemetrySettingsSection session={session} isDemoExperience={isDemoExperience} />
      </SettingsFolderPopup>

      <SettingsFolderPopup
        isOpen={remindersFolderOpen}
        onClose={() => setRemindersFolderOpen(false)}
        title="Reminders & notifications"
      >
        <NotificationSettingsSection session={session} />

        <YesterdayRecapSettings
          session={session}
          onLaunchDailyCatchUpPrompt={onLaunchDailyCatchUpPrompt}
        />

        <DreamJournalReminderSettings session={session} />

        <TodaysWinsReminderSettings session={session} />

        <DailyLifeUpgradeSettings session={session} />

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

      {creatorNoteOpen && !creatorNoteAsText ? (
        <CreatorStory
          onClose={() => setCreatorNoteOpen(false)}
          onReadFullNote={() => setCreatorNoteAsText(true)}
        />
      ) : null}
      {creatorNoteOpen && creatorNoteAsText ? (
        <CreatorNoteModal
          onClose={() => {
            setCreatorNoteAsText(false);
            setCreatorNoteOpen(false);
          }}
          closeLabel="Done"
        />
      ) : null}

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

      {showExperimentsModal ? (
        <ExperimentsModal
          session={session}
          onClose={() => setShowExperimentsModal(false)}
        />
      ) : null}
    </div>
  );
}
