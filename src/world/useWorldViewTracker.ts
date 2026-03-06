import { useEffect } from 'react';
import { trackWorldEvent } from './worldAnalytics.ts';

/**
 * React hook that fires the `world_view` analytics event exactly once when the
 * WorldHome component first mounts.
 *
 * The module-level dedupe flag in `worldAnalytics` guarantees the event fires
 * at most once per page load regardless of re-renders or StrictMode double-invocations.
 *
 * Takes no arguments — path, platform, and standalone state are read internally
 * by `trackWorldEvent`.
 */
export function useWorldViewTracker(): void {
  useEffect(() => {
    trackWorldEvent('world_view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — fire once per mount
}
