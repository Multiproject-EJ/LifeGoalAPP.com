import { isStandaloneMode } from '../routes/detectStandalone.ts';

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
  path: string;
  platform: WorldPlatform;
  session_state?: 'authed' | 'guest';
  is_standalone?: boolean;
  [key: string]: string | boolean | number | undefined;
}

interface StoredEvent extends WorldEventPayload {
  event: WorldEventName;
  ts: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'habitgame_world_events';
const MAX_EVENTS = 50;
const INSTALL_VIEW_SEEN_KEY = 'habitgame_install_view_seen';

// ---------------------------------------------------------------------------
// Module-level dedupe flag for world_view (once per page load)
// ---------------------------------------------------------------------------

let worldViewFired = false;

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

export function getWorldPlatform(): WorldPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

// ---------------------------------------------------------------------------
// Standalone detection (re-exports existing helper)
// ---------------------------------------------------------------------------

export { isStandaloneMode };

// ---------------------------------------------------------------------------
// SessionStorage helpers
// ---------------------------------------------------------------------------

function readEvents(): StoredEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredEvent[];
  } catch {
    return [];
  }
}

function writeEvents(events: StoredEvent[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore — sessionStorage may be unavailable (private mode, quota exceeded)
  }
}

function appendEvent(entry: StoredEvent): void {
  const events = readEvents();
  events.push(entry);
  // Cap at MAX_EVENTS (FIFO — drop oldest first)
  const capped = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
  writeEvents(capped);
}

// ---------------------------------------------------------------------------
// Core tracking function
// ---------------------------------------------------------------------------

/**
 * Track a world-site analytics event.
 *
 * @param name - The event name.
 * @param extra - Additional payload fields merged with auto-detected context.
 */
export function trackWorldEvent(
  name: WorldEventName,
  extra: Record<string, string | boolean | number | undefined> = {},
): void {
  // Dedupe: world_view fires at most once per page load
  if (name === 'world_view') {
    if (worldViewFired) return;
    worldViewFired = true;
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

  const platform = getWorldPlatform();
  const path =
    typeof window !== 'undefined' ? window.location.pathname : '/';
  const is_standalone =
    typeof window !== 'undefined' ? isStandaloneMode() : false;

  const payload: WorldEventPayload = {
    path,
    platform,
    is_standalone,
    ...extra,
  };

  const entry: StoredEvent = {
    event: name,
    ts: Date.now(),
    ...payload,
  };

  if (import.meta.env.DEV) {
    console.debug('[WorldAnalytics]', name, entry);
  }

  appendEvent(entry);
}
