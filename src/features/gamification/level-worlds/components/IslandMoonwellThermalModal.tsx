import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';

export function IslandMoonwellThermalModal({ open, busy, onClose, onBoil }: {
  open: boolean; busy: boolean; onClose: () => void; onBoil: () => void;
}) {
  const title = React.useId();
  const button = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPageScroll();
    button.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key !== 'Tab') return;
      const items = Array.from(button.current?.closest('section')?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); unlock(); previous?.focus(); };
  }, [open, busy, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className="moonwell-thermal-modal" onClick={() => { if (!busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby={title} onClick={event => event.stopPropagation()}>
      <button className="moonwell-thermal-modal__close" aria-label="Close Moonwell restoration" onClick={onClose} disabled={busy}>×</button>
      <span className="moonwell-thermal-modal__sigil" aria-hidden="true">♨</span>
      <small>MOONWELL OBSERVATORY · HEAT SECURED</small>
      <h2 id={title}>Wake the frozen well</h2>
      <p>Your observatory is complete. Send the captured heat into its ancient basin and watch the ice soften, melt and gently begin to boil.</p>
      <button ref={button} className="moonwell-thermal-modal__boil" disabled={busy} onClick={onBoil}>{busy ? 'Opening the heat valves…' : 'Boil water'}</button>
      <button className="moonwell-thermal-modal__later" disabled={busy} onClick={onClose}>Keep the heat for later</button>
    </section>
  </div>, document.body);
}
