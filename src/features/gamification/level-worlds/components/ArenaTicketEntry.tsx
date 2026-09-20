import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Presentation only: each game retains its canonical ticket debit. */
export function ArenaTicketEntry() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(timer);
  }, []);
  return visible ? createPortal(
    <div className="island-arena-ticket-entry" role="status" aria-label="Entering Event Arena">
      <img src="/assets/island-run/tickets/event-arena-pass-emblem.webp" alt="" />
      <strong>Entering Event Arena</strong>
    </div>, document.body,
  ) : null;
}
