import { useEffect, useRef } from 'react';
import { canUseSupabaseDataForUser } from '../../../../lib/supabaseClient';
import {
  createPlayerActivityTracker,
  sendPlayerActivity,
  type PlayerActivitySnapshot,
  type PlayerActivityTracker,
} from '../../../../services/playerActivity';
import { twoTracksDayKey } from '../services/twoTracksDaily';

const TICK_MS = 15_000;
const FLUSH_MS = 60_000;

/**
 * Keeps a per-day play heartbeat for the player-insights dashboard. Reads the
 * canonical Island Run record only; sends clamped counts, never content.
 * Inactive for guests, demo users and signed-out sessions.
 */
export function usePlayerActivityHeartbeat(
  userId: string | null,
  record: PlayerActivitySnapshot | null | undefined,
): void {
  const enabled = Boolean(userId && canUseSupabaseDataForUser(userId));
  const trackerRef = useRef<PlayerActivityTracker | null>(null);

  useEffect(() => {
    if (!enabled) {
      trackerRef.current = null;
      return;
    }
    const tracker = createPlayerActivityTracker(Date.now());
    trackerRef.current = tracker;
    let lastFlush = Date.now();
    let rpcMissing = false;
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

    const flush = () => {
      const delta = tracker.drain(twoTracksDayKey());
      lastFlush = Date.now();
      if (!delta || rpcMissing) return;
      void sendPlayerActivity(delta).then((result) => {
        if (result === 'missing') rpcMissing = true;
      });
    };
    const interval = window.setInterval(() => {
      tracker.tick(Date.now(), visible());
      if (Date.now() - lastFlush >= FLUSH_MS) flush();
    }, TICK_MS);
    const onVisibility = () => {
      const now = Date.now();
      if (visible()) {
        tracker.resume(now);
      } else {
        tracker.tick(now, true);
        tracker.hide(now);
        flush();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      tracker.tick(Date.now(), visible());
      flush();
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, [enabled, userId]);

  const island = record?.currentIslandNumber;
  const cycle = record?.cycleIndex;
  const token = record?.tokenIndex;
  const spent = record?.essenceLifetimeSpent;
  useEffect(() => {
    if (island === undefined || cycle === undefined || token === undefined || spent === undefined) return;
    trackerRef.current?.observe({
      currentIslandNumber: island, cycleIndex: cycle, tokenIndex: token, essenceLifetimeSpent: spent,
    });
  }, [island, cycle, token, spent, enabled]);
}
