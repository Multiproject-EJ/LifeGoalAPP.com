export type TopDisplayClass =
  | 'iphone-dynamic-island'
  | 'iphone-notch'
  | 'android-generic'
  | 'generic';

export type TopDisplayChromeOverride = TopDisplayClass | 'off';

const TOP_CHROME_QUERY_PARAM = 'topChrome';
export const TOP_CHROME_OVERRIDE_STORAGE_KEY = 'lifegoal:topChromeOverride';

const VALID_TOP_CHROME_VALUES = new Set<TopDisplayChromeOverride>([
  'iphone-dynamic-island',
  'iphone-notch',
  'android-generic',
  'generic',
  'off',
]);

function normalizeTopChromeOverride(value: string | null): TopDisplayChromeOverride | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return VALID_TOP_CHROME_VALUES.has(normalized as TopDisplayChromeOverride)
    ? (normalized as TopDisplayChromeOverride)
    : null;
}

export function readTopChromeOverride(): TopDisplayChromeOverride | null {
  if (typeof window === 'undefined') return null;

  const queryOverride = normalizeTopChromeOverride(
    new URLSearchParams(window.location.search).get(TOP_CHROME_QUERY_PARAM),
  );
  if (queryOverride) return queryOverride;

  try {
    return normalizeTopChromeOverride(window.localStorage.getItem(TOP_CHROME_OVERRIDE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isAndroidLike(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

function isLikelyDynamicIslandViewport(): boolean {
  if (typeof window === 'undefined') return false;

  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const longSide = Math.max(window.innerWidth, window.innerHeight);

  // Broad visual classification only: modern larger/tall iPhone viewports tend to
  // need center clearance, while smaller iOS viewports can use the notch shape.
  // This intentionally does not try to identify exact phone models.
  return shortSide >= 390 && longSide >= 800;
}

export function getTopDisplayClass(): TopDisplayClass | null {
  const override = readTopChromeOverride();
  if (override === 'off') return null;
  if (override) return override;

  if (isAndroidLike()) return 'android-generic';
  if (isIosLike()) {
    return isLikelyDynamicIslandViewport() ? 'iphone-dynamic-island' : 'iphone-notch';
  }

  return 'generic';
}
