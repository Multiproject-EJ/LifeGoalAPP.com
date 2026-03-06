// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorldPlatform = 'ios' | 'android' | 'desktop';

export type WorldEventName =
  | 'world_view'
  | 'continue_click'
  | 'login_click'
  | 'install_view'
  | 'install_click'
  | 'install_dismiss'
  | 'archetype_select';

export interface WorldEventPayload {
  event: WorldEventName;
  path: string;
  platform: WorldPlatform;
  is_standalone: boolean;
  session_state?: 'authed' | 'guest';
  archetype_id?: string;
  dismiss_ttl_days?: number;
  timestamp: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSTALL_VIEW_SEEN_KEY = 'habitgame_install_view_seen';

// ---------------------------------------------------------------------------
// Module-level dedupe flag for world_view (once per page load)
// ---------------------------------------------------------------------------

let viewTracked = false;

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Detect the current platform from the user agent.
 *
 * @returns `'ios'` for iPhone/iPad/iPod (and MacOS with touch points),
 *          `'android'` for Android devices, or `'desktop'` as fallback.
 */
export function detectPlatform(): WorldPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** @deprecated Use `detectPlatform()` instead. */
export const getWorldPlatform = detectPlatform;

// ---------------------------------------------------------------------------
// Standalone detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the app is running in standalone (installed PWA) mode.
 *
 * Uses `window.matchMedia('(display-mode: standalone)')` and the iOS
 * `navigator.standalone` property.
 */
export function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((navigator as any).standalone === true) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Core tracking function
// ---------------------------------------------------------------------------

/**
 * Track a world-site analytics event.
 *
 * Builds the full payload (path, platform, standalone, timestamp) from browser
 * APIs, merges any `extra` fields, then:
 *  1. Logs via `console.info('[WorldAnalytics]', payload)` for dev-tools visibility.
 *  2. Dispatches a `CustomEvent('world-analytics')` on `window` so other code
 *     can subscribe without coupling to this module.
 *
 * Dedupe rules:
 *  - `world_view`: fires at most once per page load (module-level flag).
 *  - `install_view`: fires at most once per browsing session (sessionStorage flag).
 *  - All other events: fire on every call (1× per user action is natural).
 *
 * @param name  - The event name from {@link WorldEventName}.
 * @param extra - Optional additional payload fields merged with auto-detected context.
 */
export function trackWorldEvent(
  name: WorldEventName,
  extra: Partial<Omit<WorldEventPayload, 'event' | 'path' | 'platform' | 'is_standalone' | 'timestamp'>> = {},
): void {
  // Dedupe: world_view fires at most once per page load
  if (name === 'world_view') {
    if (viewTracked) return;
    viewTracked = true;
  }

  // Dedupe: install_view fires at most once per session
  if (name === 'install_view') {
    try {
      if (sessionStorage.getItem(INSTALL_VIEW_SEEN_KEY)) return;
      sessionStorage.setItem(INSTALL_VIEW_SEEN_KEY, '1');
    } catch {
      // If sessionStorage is unavailable, proceed without dedupe
    }
  }

  const payload: WorldEventPayload = {
    event: name,
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    platform: detectPlatform(),
    is_standalone: detectStandalone(),
    timestamp: new Date().toISOString(),
    ...extra,
  };

  // Log for dev-tools visibility (always, not just DEV mode)
  console.info('[WorldAnalytics]', payload);

  // Dispatch custom event so other code can subscribe
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('world-analytics', { detail: payload }));
  }
}
