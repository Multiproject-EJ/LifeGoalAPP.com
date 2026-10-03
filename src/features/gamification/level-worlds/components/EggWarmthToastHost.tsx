import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EGG_WARMTH_EVENT } from '../services/islandRunHabitEggWarmthAction';
import './EggWarmthToastHost.css';

const LOADING_SCREEN_SELECTOR = '.island-5-three-pilot__loading, .island-run-prototype--loading, .game-first-loading';
const TOAST_MS = 4200;
const MAX_STACK = 3;

interface ToastItem {
  id: number;
  icon: string;
  notice: string;
}

/**
 * Short real-life reward confirmations ("your eggs got warmer", "+8 dice").
 * Any source dispatches EGG_WARMTH_EVENT with `{ notice, icon? }`; toasts that
 * arrive together stack instead of replacing each other.
 */
export function EggWarmthToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const timers = new Set<number>();
    const onWarmth = (event: Event) => {
      const detail = (event as CustomEvent<{ notice?: unknown; icon?: unknown }>).detail;
      if (typeof detail?.notice !== 'string') return;
      const item: ToastItem = {
        id: nextIdRef.current++,
        icon: typeof detail.icon === 'string' && detail.icon ? detail.icon : '🥚',
        notice: detail.notice,
      };
      // Never over a loading screen: wait (up to ~30 s) until it is gone.
      let tries = 0;
      const showWhenReady = () => {
        tries += 1;
        if (document.querySelector(LOADING_SCREEN_SELECTOR) && tries < 30) {
          const wait = window.setTimeout(() => { timers.delete(wait); showWhenReady(); }, 1000);
          timers.add(wait);
          return;
        }
        setItems((current) => [...current, item].slice(-MAX_STACK));
        const expire = window.setTimeout(() => {
          timers.delete(expire);
          setItems((current) => current.filter((entry) => entry.id !== item.id));
        }, TOAST_MS);
        timers.add(expire);
      };
      showWhenReady();
    };
    window.addEventListener(EGG_WARMTH_EVENT, onWarmth);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener(EGG_WARMTH_EVENT, onWarmth);
    };
  }, []);

  if (items.length === 0 || typeof document === 'undefined') return null;
  return createPortal(
    <div className="egg-warmth-toast-stack" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="egg-warmth-toast">
          <span className="egg-warmth-toast__egg" aria-hidden="true">{item.icon}</span>
          <span>{item.notice}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
