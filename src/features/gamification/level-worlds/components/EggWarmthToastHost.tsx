import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EGG_WARMTH_EVENT } from '../services/islandRunHabitEggWarmthAction';
import './EggWarmthToastHost.css';

/** Shows the short "your eggs got warmer" confirmation from any warmth source. */
export function EggWarmthToastHost() {
  const [notice, setNotice] = useState<string | null>(null);
  const [serial, setSerial] = useState(0);

  useEffect(() => {
    const onWarmth = (event: Event) => {
      const detail = (event as CustomEvent<{ notice?: unknown }>).detail;
      if (typeof detail?.notice !== 'string') return;
      setNotice(detail.notice);
      setSerial((value) => value + 1);
    };
    window.addEventListener(EGG_WARMTH_EVENT, onWarmth);
    return () => window.removeEventListener(EGG_WARMTH_EVENT, onWarmth);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice, serial]);

  if (!notice || typeof document === 'undefined') return null;
  return createPortal(
    <div key={serial} className="egg-warmth-toast" role="status" aria-live="polite">
      <span className="egg-warmth-toast__egg" aria-hidden="true">🥚</span>
      <span>{notice}</span>
    </div>,
    document.body,
  );
}
