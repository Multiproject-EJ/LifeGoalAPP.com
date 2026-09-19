import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { FIRST_LIGHT_ASSEMBLY_BATCH_ENDS, FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET } from '../services/islandRunSignatureMissions';
import './IslandAssemblyCraterModal.css';

/** A window onto the live 3D crater. All mission changes stay in canonical actions. */
export function IslandAssemblyCraterModal({ open, used, available, nextCost, complete, busy, error, onClose, onBlast, onEnter }: {
  open: boolean; used: number; available: number; nextCost: number; complete: boolean; busy: boolean;
  error?: string | null; onClose: () => void; onBlast: () => void; onEnter: () => void;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const canBlast = !complete && available >= nextCost;
  const stage = FIRST_LIGHT_ASSEMBLY_BATCH_ENDS.findIndex(end => used < end);
  const labels = ['Break ground', 'Dig deeper', 'Raise the Assembly'];
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll(['body', 'documentElement']);
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { unlock(); document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className="assembly-v2-overlay" onClick={onClose}>
    <section ref={dialog} tabIndex={-1} className={`assembly-v2${complete ? ' is-complete' : ''}${busy ? ' is-firing' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <header className="assembly-v2__header">
        <span className="assembly-v2__eyebrow">FIRST LIGHT · ISLAND 001</span>
        <button className="assembly-v2__close" aria-label="Close Assembly Crater mission" onClick={onClose}>×</button>
        <h2 id={titleId}>{complete ? 'A new beginning' : 'Assembly Crater'}</h2>
        <p>{complete ? 'Your General Assembly is ready.' : 'Three blasts. One extraordinary transformation.'}</p>
      </header>
      <div className="assembly-v2__scene" role="img" aria-label={complete ? 'The completed General Assembly in the live 3D island' : 'The live 3D crater, ready for its next excavation'}>
        <span className="assembly-v2__scene-label">{complete ? 'GENERAL ASSEMBLY' : 'EXCAVATION SITE'}</span>
        <span className="assembly-v2__corner assembly-v2__corner--left" aria-hidden="true" />
        <span className="assembly-v2__corner assembly-v2__corner--right" aria-hidden="true" />
        <span className="assembly-v2__scene-caption">{complete ? 'Built by your crew' : labels[Math.max(0, stage)]}</span>
      </div>
      <footer className="assembly-v2__footer">
        <ol className="assembly-v2__stages" aria-label="Excavation stages">
          {FIRST_LIGHT_ASSEMBLY_BATCH_ENDS.map((end, index) => {
            const start = index === 0 ? 0 : FIRST_LIGHT_ASSEMBLY_BATCH_ENDS[index - 1];
            const done = used >= end;
            return <li key={end} className={done ? 'is-done' : stage === index ? 'is-current' : ''} aria-current={stage === index ? 'step' : undefined}>
              <span className="assembly-v2__stage-seal" aria-hidden="true">{done ? '✓' : index + 1}</span>
              <strong>{labels[index]}</strong><small>{end - start} charges</small>
            </li>;
          })}
        </ol>
        <div className="assembly-v2__supplies">
          <span className="assembly-v2__dynamite" aria-hidden="true"><i /><i /><i /><b /></span>
          <span><strong>{available}<small> charges ready</small></strong><span className="assembly-v2__supply-caption">{complete ? 'Excavation complete' : `${Math.min(available, nextCost)} of ${nextCost} needed for this blast`}</span></span>
          <span className="assembly-v2__total">{used}<small> / {FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET}<br />used</small></span>
        </div>
        <div className="assembly-v2__track" role="progressbar" aria-label="Excavation progress" aria-valuemin={0} aria-valuemax={FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET} aria-valuenow={used}><i style={{ width: `${used / FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET * 100}%` }} /></div>
        {error && <p className="assembly-v2__error" role="alert">{error}</p>}
        <button className={`assembly-v2__action${canBlast ? ' is-ready' : ''}`} disabled={busy} onClick={complete ? onEnter : canBlast ? onBlast : onClose}>
          <span aria-hidden="true">{complete ? '✦' : canBlast ? '✹' : '↗'}</span>
          {busy ? 'Lighting the fuse…' : complete ? 'Enter the Assembly' : canBlast ? `Detonate ${nextCost} charges` : 'Find more charges'}
        </button>
        <p className="assembly-v2__hint" role="status">{complete ? 'Your next chapter starts here.' : canBlast ? 'Ready when you are. Watch the island transform.' : `Land on dynamite to collect ${Math.max(0, nextCost - available)} more.`}</p>
      </footer>
    </section>
  </div>, document.body);
}
