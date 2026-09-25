import React from 'react';
import './IslandFrostwellMissionPresentation.css';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { FROSTWELL_SPIN_METERS } from '../services/islandRunSignatureMissions';
import type { FrostwellSequencePhase } from '../hooks/useFrostwellMissionSequence';

export function IslandFrostwellMissionModal({ open, phase, meters, built, spins, rotation, result, onSpin, onClose, onOverview }: {
  open: boolean; phase: FrostwellSequencePhase; meters: number; built: boolean; spins: number;
  rotation: number; result: number | null; onSpin: () => void; onClose: () => void; onOverview: () => void;
}) {
  const title = React.useId();
  const dialog = React.useRef<HTMLElement>(null);
  const cinematic = phase === 'drilling' || phase === 'commissioning';
  const busy = phase === 'arming' || phase === 'spinning' || cinematic;
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll();
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { unlock(); document.removeEventListener('keydown', key); previous?.focus(); };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className={`frostwell-v2-overlay${cinematic ? ' is-cinematic' : ''}`} onClick={onClose}>
    <section ref={dialog} tabIndex={-1} className={`frostwell-v2${built && !busy ? ' is-complete' : ''}`} role="dialog" aria-modal="true" aria-labelledby={title} onClick={event => event.stopPropagation()}>
      <button className="frostwell-v2__close" aria-label={busy ? 'Finish animation and close' : 'Close Frostwell mission'} onClick={onClose}>×</button>
      <div className="frostwell-v2__eyebrow">FROSTWELL ICEWORKS · SPECIAL MISSION</div>
      <h2 id={title}>{phase === 'drilling' ? 'Into the blue' : phase === 'commissioning' ? 'The iceworks awaken' : built ? 'Life beneath the ice' : 'What lies 500 metres below?'}</h2>
      {cinematic ? <>
        <p role="status">{phase === 'drilling' ? `Your auger is cutting ${result ?? 0} metres deeper. Follow its light through the frozen ocean.` : 'Fresh water rises. The lift turns. Your fishery comes to life.'}</p>
        <div className="frostwell-v2__cinematic-meter"><span>{meters}m</span><i /><span>{phase === 'drilling' ? 'BORING THROUGH ICE' : 'BRINGING SYSTEMS ONLINE'}</span></div>
        <button className="frostwell-v2__text" onClick={onClose}>Finish animation</button>
      </> : built ? <>
        <div className="frostwell-v2__seal" aria-hidden="true">✦<span>500<small>METRES</small></span>✦</div>
        <p>The deep ice is open. Watch the nets bring up fish, the lifts rise and your new iceworks start trading.</p>
        <div className="frostwell-v2__systems"><span>✓ Fresh water</span><span>✓ Deep fishery</span><span>✓ Seafood trade</span></div>
        <button className="frostwell-v2__primary" onClick={onClose}>Explore the iceworks</button>
        <button className="frostwell-v2__text" onClick={onOverview}>Return to island</button>
      </> : <>
        <p>Collect blue drill symbols on the route. Each earned spin takes your auger deeper through the frozen ocean.</p>
        <div className="frostwell-v2__wheel-wrap">
          <div className="frostwell-v2__pointer" aria-hidden="true">▼</div>
          <div className="frostwell-v2__wheel" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
            {FROSTWELL_SPIN_METERS.map((value, index) => <span key={value} style={{ transform: `rotate(${index * 45 + 22.5}deg) translateY(-88px) rotate(-${index * 45 + 22.5}deg)` }}>{value}<small>m</small></span>)}
          </div>
          <button className="frostwell-v2__hub" onClick={onSpin} disabled={busy || spins < 1 || meters >= 500}>{phase === 'arming' ? 'READYING' : phase === 'spinning' ? 'SPINNING' : 'SPIN'}<small>{spins} ready</small></button>
        </div>
        <div className="frostwell-v2__depth"><strong>{meters}<small> / 500 m</small></strong><span>{phase === 'spinning' ? 'Your next descent…' : phase === 'complete' && result !== null ? `+${result}m · deeper into the ice` : 'Find the water below'}</span></div>
        <div className="frostwell-v2__track" role="progressbar" aria-label="Drilling depth" aria-valuemin={0} aria-valuemax={500} aria-valuenow={meters}><i style={{ width: `${meters / 5}%` }} /></div>
        <p className="frostwell-v2__hint" role="status">{spins < 1 && !busy ? 'Land on a blue drill symbol to earn your next spin.' : 'Every spin drills 15–75 metres. No extra payment at breakthrough.'}</p>
        <button className="frostwell-v2__text" onClick={onOverview}>{busy ? 'Finish and return to island' : 'Keep exploring'}</button>
      </>}
    </section>
  </div>, document.body);
}
