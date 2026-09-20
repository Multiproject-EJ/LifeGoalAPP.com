import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { completeIslandRunWelcomeCheckIn } from '../services/islandRunWelcomeCheckInAction';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './OpeningGamesCeremonyModal.css';

export function IslandRunWelcomeCheckInModal({ session, client, onClose, onReviewEggs }: {
  session: Session; client: SupabaseClient | null; onClose: () => void; onReviewEggs?: () => void;
}) {
  const { state } = useIslandRunState(session, client);
  const visitKey = useRef(`${state.cycleIndex}:${state.currentIslandNumber}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const close = () => { if (!pending.current) onClose(); };
  const focusRef = useVaultModalFocusTrap<HTMLDivElement>(close);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  const complete = state.stopStatesByIndex[0]?.objectiveComplete
    || state.completedStopsByIsland[String(state.currentIslandNumber)]?.includes('hatchery');
  const checkIn = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(false);
    try {
      const result = await completeIslandRunWelcomeCheckIn({ session, client, visitKey: visitKey.current });
      if (result.status === 'ineligible') setError(true);
    } catch { setError(true); }
    finally { pending.current = false; setBusy(false); }
  };
  return createPortal(<div className="opening-games-overlay" ref={focusRef} tabIndex={-1}>
    <section className="opening-games-dialog" role="dialog" aria-modal="true" aria-label="Welcome venue">
      <button className="opening-games-close" aria-label="Close welcome venue" onClick={close} disabled={busy}>×</button>
      <p className="opening-games-eyebrow">Island {String(state.currentIslandNumber).padStart(3, '0')} · Welcome venue</p>
      <div className="opening-games-emblem" aria-hidden="true">{complete ? '✓' : '⚑'}</div>
      <h2>{complete ? 'You’re checked in!' : 'Welcome to the island'}</h2>
      <p>{complete ? 'Your first landmark activity is complete. Keep exploring, earn Essence and open the next landmark. Building upgrades are separate.'
        : 'Check in with your island hosts, then explore the board and build your landmarks. This welcome activity is free.'}</p>
      {complete ? <button onClick={close}>Continue exploring</button>
        : <button disabled={busy} onClick={() => void checkIn()}>{busy ? 'Checking in…' : 'Check in · Free'}</button>}
      {onReviewEggs && <p><button disabled={busy} onClick={onReviewEggs}>View previously earned eggs</button></p>}
      {error && <p role="alert">Check-in could not finish. Return to the island and try again.</p>}
    </section>
  </div>, document.body);
}
