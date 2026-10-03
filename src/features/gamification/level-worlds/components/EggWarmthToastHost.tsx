import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EGG_WARMTH_EVENT } from '../services/islandRunHabitEggWarmthAction';
import './EggWarmthToastHost.css';

const LOADING_SCREEN_SELECTOR = '.island-5-three-pilot__loading, .island-run-prototype--loading, .game-first-loading';

/** Shows the short "your eggs got warmer" confirmation from any warmth source. */
export function EggWarmthToastHost() {
  const [notice, setNotice] = useState<string | null>(null);
  const [serial, setSerial] = useState(0);

  useEffect(() => {
    let waitTimer: number | undefined;
    const onWarmth = (event: Event) => {
      const detail = (event as CustomEvent<{ notice?: unknown }>).detail;
      if (typeof detail?.notice !== 'string') return;
      const notice = detail.notice;
      // Never over a loading screen: wait (up to ~30 s) until it is gone.
      let tries = 0;
      const showWhenReady = () => {
        tries += 1;
        if (document.querySelector(LOADING_SCREEN_SELECTOR) && tries < 30) {
          waitTimer = window.setTimeout(showWhenReady, 1000);
          return;
        }
        setNotice(notice);
        setSerial((value) => value + 1);
      };
      window.clearTimeout(waitTimer);
      showWhenReady();
    };
    window.addEventListener(EGG_WARMTH_EVENT, onWarmth);
    return () => {
      window.clearTimeout(waitTimer);
      window.removeEventListener(EGG_WARMTH_EVENT, onWarmth);
    };
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
