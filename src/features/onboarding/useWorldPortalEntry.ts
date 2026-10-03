import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getIslandRunStateSnapshot, hydrateIslandRunState, subscribeIslandRunState } from '../gamification/level-worlds/services/islandRunStateStore';
import { hasSavedIslandRunRecord } from '../gamification/level-worlds/services/islandRunGameStateStore';
import { resolveWorldPortalProgress } from '../gamification/level-worlds/services/worldPortalProgress';
import { readSavedWorldPortalReceipt } from '../gamification/level-worlds/services/worldPortalActions';
import { resolveWorldPortalAccess } from './worldPortalAccess';
import { hasAcceptedLifeFastTrack } from '../gamification/level-worlds/services/lifePathProgress';
import { isDemoSession } from '../../services/demoSession';
import type { DeveloperCheck } from './useVerifiedDeveloper';

type Hydration = { owner: string; status: 'ready' | 'error'; offline: boolean };
export function useWorldPortalEntry(session: Session | null, client: SupabaseClient | null, developer: DeveloperCheck, guestTransferPending = false, guestTransferFailed = false) {
  const owner = session?.user.id ?? null;
  const subscribe = useCallback((changed: () => void) => session ? subscribeIslandRunState(session, changed) : () => {}, [session]);
  const snapshot = useCallback(() => session ? getIslandRunStateSnapshot(session) : null, [session]);
  const journeyState = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [hydration, setHydration] = useState<Hydration | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  // Only presentation: keep the live board/council mounted until explicit exit.
  const [boardOwner, setBoardOwner] = useState<string | null>(null);
  const previousOwner = useRef(owner);
  useEffect(() => {
    if (previousOwner.current !== owner) {
      previousOwner.current = owner; setBoardOwner(null);
    }
  }, [owner]);
  useEffect(() => {
    if (!session || !owner || guestTransferPending) return;
    let current = true;
    const localAvailable = hasSavedIslandRunRecord(session);
    const settleFailure = () => {
      if (current) setHydration({ owner, status: localAvailable ? 'ready' : 'error', offline: true });
    };
    const timer = window.setTimeout(settleFailure, 12000);
    void hydrateIslandRunState({ session, client, forceRemote: true }).then(result => {
      if (!current) return;
      const usable = result.source === 'table' || result.source === 'fallback_no_row'
        || isDemoSession(session) || localAvailable;
      setHydration({ owner, status: usable ? 'ready' : 'error',
        offline: result.source !== 'table' && result.source !== 'fallback_no_row' && !isDemoSession(session) });
    }).catch(settleFailure).finally(() => window.clearTimeout(timer));
    const refresh = () => { if (document.visibilityState !== 'hidden') retry(); };
    window.addEventListener('online', refresh); window.addEventListener('focus', refresh);
    return () => {
      current = false; window.clearTimeout(timer);
      window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh);
    };
  }, [session, owner, client, attempt, retry, guestTransferPending]);
  // Read back durability only when the canonical save changes, not on every
  // unrelated App clock/menu render (the full saved record can be large).
  const hasEarnedPortal = useMemo(() => !!session && !!journeyState
    && !!resolveWorldPortalProgress(journeyState.signatureMissionProgressByIsland) && !!readSavedWorldPortalReceipt(session),
  [session, journeyState]);
  const access = resolveWorldPortalAccess({
    highestReachedIsland: journeyState?.cycleIndex ? 120 : journeyState?.currentIslandNumber ?? 1,
    hasEarnedPortal,
    isVerifiedDeveloper: !!owner && developer.owner === owner && developer.verified,
    hasVerifiedEarlyAccess: false,
    hasAcceptedFastTrack: !!journeyState && hasAcceptedLifeFastTrack(journeyState.signatureMissionProgressByIsland),
  });
  const phase: 'loading' | 'ready' | 'error' = guestTransferPending ? (guestTransferFailed ? 'error' : 'loading')
    : owner && access.canOpenFullApp ? 'ready'
    : !owner || hydration?.owner !== owner ? 'loading'
    : hydration.status === 'error' ? 'error'
      : !access.canOpenFullApp && developer.status === 'checking' ? 'loading' : 'ready';
  const locked = !access.canOpenFullApp;
  useEffect(() => { if (owner && phase === 'ready' && locked) setBoardOwner(owner); }, [owner, phase, locked]);
  return {
    journeyState, access, phase, offline: hydration?.owner === owner && hydration.offline,
    showGameFirst: !!owner && (phase !== 'ready' || locked || boardOwner === owner),
    retry, leaveGame: () => { if (access.canOpenFullApp) setBoardOwner(null); },
  };
}
