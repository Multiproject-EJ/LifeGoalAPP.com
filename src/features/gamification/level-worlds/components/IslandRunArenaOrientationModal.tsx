import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { completeIslandRunArenaOrientation } from '../services/islandRunArenaOrientationAction';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './OpeningGamesCeremonyModal.css';

export function IslandRunArenaOrientationModal({ session, client, onClose }: {
  session: Session; client: SupabaseClient | null; onClose: () => void;
}) {
  const { state } = useIslandRunState(session, client);
  const visitKey = useRef(`${state.cycleIndex}:${state.currentIslandNumber}`);
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const close = () => { if (!pending.current) onClose(); };
  const focusRef = useVaultModalFocusTrap<HTMLDivElement>(close);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  const complete = state.stopStatesByIndex[2]?.objectiveComplete
    || state.completedStopsByIsland[String(state.currentIslandNumber)]?.includes('mystery');
  const finish = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setFeedback(null);
    try {
      const result = await completeIslandRunArenaOrientation({ session, client,
        visitKey: visitKey.current, answers: ['build-landmarks', 'island-002'] });
      if (result.status !== 'completed' && result.status !== 'already-complete') {
        setFeedback('Open this landmark on the current island, then try again.');
      }
    } catch { setFeedback('Your orientation could not save. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return createPortal(<div className="opening-games-overlay" ref={focusRef} tabIndex={-1}>
    <section className="opening-games-dialog" role="dialog" aria-modal="true" aria-label="Arena orientation">
      <button className="opening-games-close" aria-label="Close arena orientation" onClick={close} disabled={busy}>×</button>
      <p className="opening-games-eyebrow">Island 001 · Meet your hosts</p>
      <h2>{complete ? 'Ready for the journey' : 'One discovery at a time'}</h2>
      {complete ? <><p>Your orientation is complete. Keep exploring this island; the First Games open on Island 002. Wisdom still needs its normal landmark ticket.</p>
        <button onClick={close}>Continue exploring</button></> : step === 0 ? <>
        <p>Roll to explore the board and earn Essence. Spend Essence to build landmarks, then complete the activities inside. What does Essence help you do?</p>
        <button onClick={() => { setStep(1); setFeedback(null); }}>Build landmarks</button>
        <button onClick={() => setFeedback('Not yet. Games are introduced on the next island. Here, Essence helps you build.')}>Start the arena games now</button>
      </> : <>
        <p>The hosts are preparing a celebration on the next island. Where will you open the First Games and try a free round?</p>
        <button disabled={busy} onClick={() => void finish()}>{busy ? 'Saving…' : 'Island 002 · The opening ceremony'}</button>
        <button disabled={busy} onClick={() => setFeedback('The celebration is on Island 002. Finish exploring this island first.')}>Here on Island 001</button>
      </>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  </div>, document.body);
}
