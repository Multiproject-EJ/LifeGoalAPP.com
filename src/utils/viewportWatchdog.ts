/**
 * Viewport watchdog for the iOS "short webview" bug.
 *
 * On iOS home-screen web apps (standalone/fullscreen + black-translucent),
 * launching or resuming the app while the status bar is in a non-standard
 * state (Live Activity, timer, phone call, hotspot, screen recording, …) can
 * leave the WKWebView sized shorter than the physical screen. The page cannot
 * paint the resulting band at the bottom — it sits outside the web content —
 * so no CSS/safe-area change can fix it.
 *
 * This module:
 *  1. measures the real viewport against the screen on launch/resume/resize,
 *  2. records "episodes" (deficit appeared/resolved) to localStorage so
 *     intermittent occurrences survive a relaunch and can be inspected later,
 *  3. attempts a gentle re-layout nudge (scroll + 1-frame min-height toggle)
 *     that sometimes coaxes iOS into re-measuring the webview. The nudge is a
 *     no-op for correctly-sized viewports and never moves app content.
 *
 * It is dependency-free and safe to run in any browser; detection and nudging
 * only arm themselves on iOS standalone displays.
 */

const EPISODES_STORAGE_KEY = 'lifeGoalApp:viewport-watchdog:episodes';
const MAX_STORED_EPISODES = 20;
/** Height mismatches at or below this many CSS px are treated as normal. */
const DEFICIT_TOLERANCE_PX = 8;
const MAX_NUDGES_PER_EPISODE = 3;
const NUDGE_RETRY_DELAY_MS = 1500;
const NUDGE_RECHECK_DELAY_MS = 350;
const CHECK_DEBOUNCE_MS = 150;

export interface ViewportMetrics {
  timestamp: string;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  screenWidth: number;
  screenHeight: number;
  visualViewportWidth: number | null;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number | null;
  visualViewportScale: number | null;
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;
  orientation: 'portrait' | 'landscape';
  displayMode: 'fullscreen' | 'standalone' | 'browser';
  isIOS: boolean;
  /** Expected full-screen height minus innerHeight; > tolerance means bugged. */
  bottomDeficit: number;
}

export interface ViewportWatchdogEpisode {
  startedAt: string;
  resolvedAt: string | null;
  resolvedBy: 'nudge' | 'external' | null;
  trigger: string;
  deficitAtStart: number;
  deficitAtResolve: number | null;
  nudgeAttempts: number;
  metricsAtStart: ViewportMetrics;
}

type WatchdogListener = (metrics: ViewportMetrics) => void;

declare global {
  interface Navigator {
    /** iOS Safari legacy flag for home-screen web apps. */
    standalone?: boolean;
  }
  interface Window {
    __LifeGoalAppViewportWatchdog?: {
      getMetrics: () => ViewportMetrics;
      getEpisodes: () => ViewportWatchdogEpisode[];
      clearEpisodes: () => void;
      checkNow: () => ViewportMetrics;
    };
  }
}

const safeLocalStorage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

let initialized = false;
let safeAreaProbe: HTMLElement | null = null;
let activeEpisode: ViewportWatchdogEpisode | null = null;
let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
let checkDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<WatchdogListener>();

const debugLog = (level: 'log' | 'warn', message: string, detail?: unknown) => {
  try {
    window.__LifeGoalAppDebugger?.[level](message, detail);
  } catch {
    // Debugger is best-effort only.
  }
};

const ensureSafeAreaProbe = (): HTMLElement | null => {
  if (safeAreaProbe?.isConnected) return safeAreaProbe;
  if (!document.body) return null;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)',
    'padding-left:env(safe-area-inset-left, 0px)',
    'padding-right:env(safe-area-inset-right, 0px)',
  ].join(';');
  document.body.appendChild(probe);
  safeAreaProbe = probe;
  return probe;
};

const readSafeAreaInsets = () => {
  const probe = ensureSafeAreaProbe();
  if (!probe) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
};

const detectDisplayMode = (): ViewportMetrics['displayMode'] => {
  try {
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.navigator.standalone === true) return 'standalone';
  } catch {
    // Fall through to browser.
  }
  return 'browser';
};

const detectIOS = (): boolean => {
  const ua = window.navigator.userAgent;
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS reports as Mac; distinguish by touch support.
  return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
};

export const getViewportMetrics = (): ViewportMetrics => {
  const vv = window.visualViewport ?? null;
  const orientation: ViewportMetrics['orientation'] =
    window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
  // In standalone mode with viewport-fit=cover the webview should span the
  // full screen, so innerHeight should match the screen's long/short edge.
  const expectedHeight = orientation === 'portrait'
    ? Math.max(window.screen.height, window.screen.width)
    : Math.min(window.screen.height, window.screen.width);
  const safeArea = readSafeAreaInsets();

  return {
    timestamp: new Date().toISOString(),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    visualViewportWidth: vv ? Math.round(vv.width) : null,
    visualViewportHeight: vv ? Math.round(vv.height) : null,
    visualViewportOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    visualViewportScale: vv ? Number(vv.scale.toFixed(3)) : null,
    safeAreaTop: safeArea.top,
    safeAreaBottom: safeArea.bottom,
    safeAreaLeft: safeArea.left,
    safeAreaRight: safeArea.right,
    orientation,
    displayMode: detectDisplayMode(),
    isIOS: detectIOS(),
    bottomDeficit: expectedHeight - window.innerHeight,
  };
};

export const getViewportWatchdogEpisodes = (): ViewportWatchdogEpisode[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(EPISODES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ViewportWatchdogEpisode[]) : [];
  } catch {
    return [];
  }
};

export const clearViewportWatchdogEpisodes = (): void => {
  try {
    safeLocalStorage?.removeItem(EPISODES_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};

const persistEpisode = (episode: ViewportWatchdogEpisode) => {
  if (!safeLocalStorage) return;
  try {
    const episodes = getViewportWatchdogEpisodes();
    const index = episodes.findIndex((entry) => entry.startedAt === episode.startedAt);
    if (index >= 0) {
      episodes[index] = episode;
    } else {
      episodes.push(episode);
    }
    safeLocalStorage.setItem(
      EPISODES_STORAGE_KEY,
      JSON.stringify(episodes.slice(-MAX_STORED_EPISODES)),
    );
  } catch {
    // Episode history is best-effort only.
  }
};

const notifyListeners = (metrics: ViewportMetrics) => {
  listeners.forEach((listener) => {
    try {
      listener(metrics);
    } catch {
      // Listener errors must not break the watchdog.
    }
  });
};

export const subscribeViewportWatchdog = (listener: WatchdogListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Ask iOS to re-measure the layout without moving any content: scroll the
 * (normally unscrolled) window to origin and grow the document root by 1px
 * for a single frame to force a reflow.
 */
const applyRelayoutNudge = () => {
  try {
    window.scrollTo(0, 0);
    const root = document.documentElement;
    const previousMinHeight = root.style.minHeight;
    root.style.minHeight = 'calc(100dvh + 1px)';
    // Force a synchronous reflow so the temporary size is actually observed.
    void root.offsetHeight;
    requestAnimationFrame(() => {
      root.style.minHeight = previousMinHeight;
    });
  } catch {
    // The nudge is opportunistic; failure is acceptable.
  }
};

const isKeyboardLikelyOpen = (metrics: ViewportMetrics): boolean =>
  metrics.visualViewportHeight !== null &&
  metrics.visualViewportHeight < metrics.innerHeight * 0.8;

const scheduleNudge = (trigger: string) => {
  if (nudgeTimer !== null) return;
  const episode = activeEpisode;
  if (!episode || episode.nudgeAttempts >= MAX_NUDGES_PER_EPISODE) return;

  episode.nudgeAttempts += 1;
  persistEpisode(episode);
  applyRelayoutNudge();

  nudgeTimer = setTimeout(() => {
    nudgeTimer = null;
    const metrics = getViewportMetrics();
    if (activeEpisode && metrics.bottomDeficit <= DEFICIT_TOLERANCE_PX) {
      resolveEpisode(metrics, 'nudge');
    } else if (activeEpisode) {
      debugLog('warn', 'Viewport watchdog: deficit persists after nudge.', {
        trigger,
        attempt: activeEpisode.nudgeAttempts,
        bottomDeficit: metrics.bottomDeficit,
      });
      if (activeEpisode.nudgeAttempts < MAX_NUDGES_PER_EPISODE) {
        setTimeout(() => scheduleNudge(trigger), NUDGE_RETRY_DELAY_MS);
      }
    }
    notifyListeners(metrics);
  }, NUDGE_RECHECK_DELAY_MS);
};

const resolveEpisode = (metrics: ViewportMetrics, resolvedBy: 'nudge' | 'external') => {
  const episode = activeEpisode;
  if (!episode) return;
  episode.resolvedAt = metrics.timestamp;
  episode.resolvedBy = resolvedBy;
  episode.deficitAtResolve = metrics.bottomDeficit;
  persistEpisode(episode);
  activeEpisode = null;
  debugLog('log', 'Viewport watchdog: short-viewport episode resolved.', {
    resolvedBy,
    startedAt: episode.startedAt,
    nudgeAttempts: episode.nudgeAttempts,
  });
};

const runCheck = (trigger: string): ViewportMetrics => {
  const metrics = getViewportMetrics();
  const armed =
    metrics.isIOS && (metrics.displayMode === 'standalone' || metrics.displayMode === 'fullscreen');

  if (armed && metrics.bottomDeficit > DEFICIT_TOLERANCE_PX && !isKeyboardLikelyOpen(metrics)) {
    if (!activeEpisode) {
      activeEpisode = {
        startedAt: metrics.timestamp,
        resolvedAt: null,
        resolvedBy: null,
        trigger,
        deficitAtStart: metrics.bottomDeficit,
        deficitAtResolve: null,
        nudgeAttempts: 0,
        metricsAtStart: metrics,
      };
      persistEpisode(activeEpisode);
      debugLog('warn', 'Viewport watchdog: short viewport detected (iOS webview sized below screen).', {
        trigger,
        bottomDeficit: metrics.bottomDeficit,
        innerHeight: metrics.innerHeight,
        screenHeight: metrics.screenHeight,
      });
    }
    scheduleNudge(trigger);
  } else if (activeEpisode && metrics.bottomDeficit <= DEFICIT_TOLERANCE_PX) {
    resolveEpisode(metrics, 'external');
  }

  notifyListeners(metrics);
  return metrics;
};

export const checkViewportNow = (): ViewportMetrics => runCheck('manual');

const debouncedCheck = (trigger: string) => {
  if (checkDebounceTimer !== null) clearTimeout(checkDebounceTimer);
  checkDebounceTimer = setTimeout(() => {
    checkDebounceTimer = null;
    runCheck(trigger);
  }, CHECK_DEBOUNCE_MS);
};

export const initViewportWatchdog = (): void => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('pageshow', () => debouncedCheck('pageshow'));
  window.addEventListener('focus', () => debouncedCheck('focus'));
  window.addEventListener('resize', () => debouncedCheck('resize'));
  window.addEventListener('orientationchange', () => debouncedCheck('orientationchange'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') debouncedCheck('visibilitychange');
  });
  window.visualViewport?.addEventListener('resize', () => debouncedCheck('visualviewport-resize'));

  // The status bar / Live Activity state can settle after first paint, so run
  // a few staggered launch checks in addition to the event-driven ones.
  [500, 2000, 5000].forEach((delay) => {
    setTimeout(() => runCheck(`launch+${delay}ms`), delay);
  });

  const boot = () => {
    const metrics = runCheck('init');
    debugLog('log', 'Viewport watchdog initialized.', {
      displayMode: metrics.displayMode,
      isIOS: metrics.isIOS,
      innerHeight: metrics.innerHeight,
      screenHeight: metrics.screenHeight,
      bottomDeficit: metrics.bottomDeficit,
      safeAreaBottom: metrics.safeAreaBottom,
    });
  };

  if (document.body) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }

  window.__LifeGoalAppViewportWatchdog = {
    getMetrics: getViewportMetrics,
    getEpisodes: getViewportWatchdogEpisodes,
    clearEpisodes: clearViewportWatchdogEpisodes,
    checkNow: () => runCheck('manual'),
  };
};
