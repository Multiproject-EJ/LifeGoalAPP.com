import type { ServiceHealthSnapshot } from '../../services/service-health/types';

export const AUTH_INITIALIZATION_TIMEOUT_MS = 8000;

export type AuthInitializationStatus = 'loading' | 'ready' | 'timeout' | 'error';

export type SupabaseAuthErrorLike = {
  name?: string;
  code?: string;
  message?: string;
};

export function getFriendlySupabaseAuthErrorMessage(error: SupabaseAuthErrorLike): string | null {
  const name = error.name?.toLowerCase() ?? '';
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';
  if (name === 'weakpassworderror' || code === 'weak_password' || message.includes('weak password')) {
    return 'For your security, choose a stronger password you have not used elsewhere. Try a longer passphrase with a mix of words, numbers, and symbols.';
  }
  return null;
}

/**
 * A Supabase session is the source of truth for completing authentication.
 * Closing the overlay from this signal keeps native OAuth callbacks, restored
 * sessions, and password sign-in aligned while failed/cancelled OAuth attempts
 * leave the sign-in UI available.
 */
export function shouldDismissAuthOverlay(options: {
  isOverlayOpen: boolean;
  authenticatedUserId?: string | null;
}): boolean {
  return options.isOverlayOpen && Boolean(options.authenticatedUserId?.trim());
}

export function shouldShowAuthConnectionNotice({
  initializationStatus,
  isConfigured,
  isOnline,
}: {
  initializationStatus: AuthInitializationStatus;
  isConfigured: boolean;
  isOnline: boolean;
}): boolean {
  return !isConfigured || !isOnline || initializationStatus === 'timeout' || initializationStatus === 'error';
}

/**
 * Startup state machine (service resilience Part 3).
 *
 * When the cloud is unavailable at the auth gate, the experience branches on
 * whether this device has a cached session:
 *   - 'new_user'       → offer "Try again" / "Play demo" / "View service status"
 *   - 'returning_user' → offer "Continue locally" (changes stay on this device
 *                        until cloud sync returns)
 *   - 'none'           → normal sign-in flow
 */
export type AuthGateOutageBranch = 'none' | 'new_user' | 'returning_user';

/** Cloud availability for the auth gate, from the service-health snapshot. */
export function isCloudUnavailableForAuthGate(snapshot: ServiceHealthSnapshot): boolean {
  return (
    !snapshot.networkOnline ||
    snapshot.overall === 'OFFLINE' ||
    snapshot.overall === 'MAINTENANCE' ||
    snapshot.services.auth === 'unavailable'
  );
}

export function resolveAuthGateOutageBranch(options: {
  /** shouldShowAuthConnectionNotice(...) — initialization-level trouble. */
  connectionTroubled: boolean;
  /** isCloudUnavailableForAuthGate(snapshot) — health-manager view. */
  cloudUnavailable: boolean;
  hasCachedSession: boolean;
}): AuthGateOutageBranch {
  if (!options.connectionTroubled && !options.cloudUnavailable) return 'none';
  return options.hasCachedSession ? 'returning_user' : 'new_user';
}

interface WebStorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

/**
 * True when a Supabase session persists on this device (supabase-js stores it
 * under `sb-<ref>-auth-token`). Used only to pick outage copy — the session is
 * still validated by the auth provider before any data access.
 */
export function hasCachedAuthSession(storage?: WebStorageLike | null): boolean {
  try {
    const store =
      storage ?? (typeof window !== 'undefined' ? (window.localStorage as WebStorageLike) : null);
    if (!store) return false;
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && /^sb-.+-auth-token$/.test(key) && store.getItem(key)) {
        return true;
      }
    }
  } catch {
    // Storage access can throw in private browsing — treat as no session.
  }
  return false;
}
