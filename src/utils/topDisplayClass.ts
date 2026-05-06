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

export function getTopDisplayClass(): TopDisplayClass | null {
  const override = readTopChromeOverride();
  if (override === 'off') return null;
  if (override) return override;

  // Production default is intentionally generic. The real OS/browser status
  // icons live outside app-controlled content, so rough phone heuristics should
  // not select strong notch/dynamic-island pill shapes by default.
  return 'generic';
}
