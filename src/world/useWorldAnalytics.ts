import { useEffect, useCallback } from 'react';
import { trackWorldEvent } from './worldAnalytics.ts';
import type { WorldEventName } from './worldAnalytics.ts';

/**
 * Convenience hook that provides a `trackEvent` helper pre-filled with the
 * current session state, and auto-fires `world_view` once on mount.
 *
 * @param sessionState - Auth state of the current user. Defaults to 'guest'.
 */
export function useWorldAnalytics(sessionState: 'authed' | 'guest' = 'guest') {
  // Fire world_view once per mount (module-level flag in worldAnalytics ensures
  // it fires at most once per page load regardless of re-renders).
  useEffect(() => {
    trackWorldEvent('world_view', { session_state: sessionState });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fire once per mount

  const trackEvent = useCallback(
    (
      name: WorldEventName,
      extra?: Record<string, string | boolean | number | undefined>,
    ) => {
      trackWorldEvent(name, { session_state: sessionState, ...extra });
    },
    [sessionState],
  );

  return { trackEvent };
}
