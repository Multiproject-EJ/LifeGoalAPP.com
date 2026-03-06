import { useState, useCallback, useEffect, useRef } from 'react';
import { isStandaloneMode } from '../routes/detectStandalone.ts';
import { trackWorldEvent } from './worldAnalytics.ts';

// Re-exported so main.tsx and WorldHome can share the same type.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** 'android' = beforeinstallprompt available, 'ios' = Safari + not standalone,
   *  'installed' = standalone mode, 'unavailable' = none */
  platform: 'android' | 'ios' | 'installed' | 'unavailable';
  /** True when the user has dismissed and the 7-day cooldown hasn't expired */
  isDismissed: boolean;
  /** Record a dismissal — persists timestamp to localStorage */
  dismiss: () => void;
  /** For Android: trigger the native install prompt */
  promptInstall: (() => Promise<void>) | null;
}

const STORAGE_KEY = 'habitgame:install-dismiss';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { dismissedAt?: string };
    if (!parsed.dismissedAt) return false;
    return Date.now() - new Date(parsed.dismissedAt).getTime() < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function writeDismiss(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dismissedAt: new Date().toISOString() }),
    );
  } catch {
    // Ignore — localStorage may be unavailable (private mode, storage full, etc.)
  }
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as 'Macintosh' when requesting desktop site
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  // Exclude Chrome for iOS (CriOS), Firefox for iOS (FxiOS), Opera Mini (OPiOS)
  const isNativeSafari = /safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  return isIOS && isNativeSafari;
}

function detectPlatform(
  beforeInstallPromptEvent: BeforeInstallPromptEvent | null,
): InstallState['platform'] {
  if (typeof window === 'undefined') return 'unavailable';
  if (isStandaloneMode()) return 'installed';
  if (beforeInstallPromptEvent) return 'android';
  if (isIOSSafari()) return 'ios';
  return 'unavailable';
}

/**
 * Centralises all install-state logic for the world home screen.
 *
 * @param beforeInstallPromptEvent - The captured `beforeinstallprompt` event
 *   (or null when not available). Pass this from the Root component in main.tsx.
 */
export function useInstallState(
  beforeInstallPromptEvent: BeforeInstallPromptEvent | null,
): InstallState {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => readDismissed());

  const platform = detectPlatform(beforeInstallPromptEvent);
  const isEligible =
    (platform === 'android' || platform === 'ios') && !isDismissed;

  // Fire install_view once per session when the install module becomes eligible.
  // Uses a ref so the effect can re-run when eligibility changes without
  // firing the event more than once (handles async beforeInstallPromptEvent).
  const installViewTracked = useRef(false);
  useEffect(() => {
    if (isEligible && !installViewTracked.current) {
      installViewTracked.current = true;
      trackWorldEvent('install_view');
    }
  }, [isEligible]);

  const dismiss = useCallback(() => {
    writeDismiss();
    setIsDismissed(true);
    trackWorldEvent('install_dismiss', {
      dismiss_ttl_days: Math.round(COOLDOWN_MS / (24 * 60 * 60 * 1000)),
    });
  }, []);

  const promptInstall: (() => Promise<void>) | null =
    platform === 'android' && beforeInstallPromptEvent
      ? async () => {
          await beforeInstallPromptEvent.prompt();
          await beforeInstallPromptEvent.userChoice;
        }
      : null;

  return { platform, isDismissed, dismiss, promptInstall };
}
