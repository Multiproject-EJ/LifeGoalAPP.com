import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Native modal dialog supplies focus containment/inert background. Portal avoids transformed ancestors. */
export function CreatureModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId();
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="cs-theme cs-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close.current(); }} onClick={event => {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current();
  }}>
    <header className="cs-modal-header"><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">Close ×</button></header>
    <div className="cs-modal-body">{children}</div>
  </dialog>, document.body);
}
