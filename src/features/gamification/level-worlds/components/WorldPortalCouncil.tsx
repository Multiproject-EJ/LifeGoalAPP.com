import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useIslandRunState } from '../hooks/useIslandRunState';
import { getIslandCaretakerConcordContent } from '../inhabitants/islandCaretakerConcord';
import { acceptWorldPortal, readSavedWorldPortalReceipt } from '../services/worldPortalActions';
import { canAttendWorldPortalCouncil, resolveWorldPortalProgress } from '../services/worldPortalProgress';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './WorldPortalCouncil.css';

const speakers = [1, 2, 3, 4, 5].map(island => getIslandCaretakerConcordContent(island)!);

/** Presentation only. Ownership and eligibility are rechecked by the action. */
export function WorldPortalCouncilDialog({ replay, busy, error, saved, onAccept, onClose, onOpenApp }: {
  replay: boolean; busy: boolean; error: string | null; saved: boolean;
  onAccept: () => void; onClose: () => void; onOpenApp?: () => void;
}) {
  const [step, setStep] = useState(0);
  const focus = useVaultModalFocusTrap<HTMLDivElement>(() => { if (!busy) onClose(); });
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  const completed = saved || (replay && step === 1);
  return createPortal(<div className="world-portal-overlay" ref={focus} tabIndex={-1}>
    <section className="world-portal-dialog" role="dialog" aria-modal="true" aria-labelledby="world-portal-title">
      <p className="world-portal-eyebrow">Island 040 · Caretaker council</p>
      <div className="world-portal-art" aria-hidden="true">
        <svg viewBox="0 0 400 180">
          <defs><linearGradient id="council-ring"><stop stopColor="#70f4ed"/><stop offset="1" stopColor="#b792ff"/></linearGradient></defs>
          <ellipse cx="200" cy="157" rx="116" ry="14" fill="#82dfff" opacity=".08"/>
          <ellipse cx="200" cy="84" rx="57" ry="73" fill="#88ccff" fillOpacity=".06" stroke="url(#council-ring)" strokeWidth="5"/>
          <ellipse cx="200" cy="84" rx="48" ry="64" fill="none" stroke="#91e9ff" strokeOpacity=".24"/>
          <path d="M175 97L200 70L225 97M200 70V116" fill="none" stroke="#dcfbff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          {Array.from({ length: 120 }, (_, i) => {
            const angle = i / 120 * Math.PI * 2;
            return <circle key={i} cx={200 + Math.cos(angle) * 157} cy={88 + Math.sin(angle) * 81} r={i % 10 === 0 ? 2.2 : 1.2} fill="#a3edf3" opacity={i % 10 === 0 ? .9 : .35}/>;
          })}
        </svg>
      </div>
      <h2 id="world-portal-title">{completed ? 'Two worlds. One journey.' : step === 0 ? 'The Meeting Between Worlds' : 'A tool for life beyond the game'}</h2>
      <div className="world-portal-copy" aria-live="polite">
        {completed ? <>
          <p>{replay ? 'Your portal is already part of your journey.' : 'The caretakers place the portal in your hands.'} You can keep exploring the islands and carry your discoveries into everyday life.</p>
          <p className="world-portal-note">{replay ? 'Replaying the meeting gives no duplicate rewards.' : 'Saved on this device. Account sync uses the existing save connection; cloud backup is not confirmed here.'}</p>
        </> : step === 0 ? <>
          <p>The caretakers gather at the council deck on Island 040. Those farther away join by holographic link. For the first time, the whole council is together.</p>
          <div className="world-portal-speakers">{speakers.map(speaker => <figure key={speaker.islandNumber}>
            <img src={speaker.inhabitant.premiumArtSrc ?? speaker.inhabitant.retroSpriteSrc} alt="" />
            <figcaption>{speaker.islandName}</figcaption>
          </figure>)}</div>
          <p className="world-portal-note">Familiar voices lead the meeting · all island caretakers connected</p>
          <p>“The small choices you made here belong to you. This portal is a way to bring that journey into your world.”</p>
        </> : <>
          <p>Today, habits and goals can become the other side of your adventure. The portal belongs to you permanently, even when you begin another island cycle.</p>
          <p>Your existing habits and goals stay intact. Accepting this tool does not send your answers to AI, create habits, or grant permission to use personal answers.</p>
          <p className="world-portal-note">Any future answer-based suggestions need a separate, explicit choice from you.</p>
        </>}
      </div>
      {error && <p className="world-portal-error" role="alert">{error}</p>}
      <div className="world-portal-actions">
        {completed ? <>
          {onOpenApp && <button type="button" onClick={onOpenApp}>Return to app <span aria-hidden="true">↗</span></button>}
          <button type="button" className="world-portal-secondary" onClick={onClose}>Keep exploring</button>
        </> : <>
          <button type="button" disabled={busy} onClick={step === 0 ? () => setStep(1) : onAccept}>
            {busy ? 'Saving portal…' : step === 0 ? 'Hear the council' : 'Accept the portal'}
          </button>
          <button type="button" className="world-portal-secondary" disabled={busy} onClick={onClose}>Return to game</button>
        </>}
      </div>
    </section>
  </div>, document.body);
}

/** Owner-keyed by the board; this component holds only modal/pending UI state. */
export function WorldPortalCouncilControl({ session, client, onOpenApp, onClose }: {
  session: Session; client: SupabaseClient | null; onOpenApp?: () => void; onClose: () => void;
}) {
  const { state } = useIslandRunState(session, client);
  const owned = !!resolveWorldPortalProgress(state.signatureMissionProgressByIsland);
  const [panel] = useState(() => ({ island: state.currentIslandNumber, cycle: state.cycleIndex,
    replay: owned && !!readSavedWorldPortalReceipt(session) }));
  const [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const eligible = canAttendWorldPortalCouncil(state) || owned;
  const contextMatches = panel?.island === state.currentIslandNumber && panel?.cycle === state.cycleIndex;
  useEffect(() => { if (!contextMatches || !eligible) onClose(); }, [contextMatches, eligible, onClose]);
  const accept = async () => {
    if (!panel || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await acceptWorldPortal({ session, client, expectedIsland: panel.island, expectedCycle: panel.cycle });
      if (!mounted.current) return;
      if (result.status === 'saved-on-device') setSaved(true);
      else setError(result.status === 'storage-unavailable'
        ? 'Your device could not save the portal. Free some storage and try again before leaving.'
        : 'Your island journey changed. Return to the game and reopen the council.');
    } catch {
      if (mounted.current) setError('The save connection was interrupted. Please try again.');
    } finally { if (mounted.current) setBusy(false); }
  };
  if (!eligible) return null;
  return contextMatches ? <WorldPortalCouncilDialog replay={panel.replay} busy={busy} error={error} saved={saved}
    onAccept={() => void accept()} onClose={onClose}
    onOpenApp={onOpenApp ? () => { onClose(); onOpenApp(); } : undefined}/> : null;
}
