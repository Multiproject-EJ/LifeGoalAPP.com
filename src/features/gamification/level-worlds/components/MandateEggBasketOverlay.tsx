import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import { MANDATE_EGG_BASKET_TIERS } from '../services/mandateEggBasket';

const BASKET_DURATION_MS = 3200;
const BASKET_REDUCED_DURATION_MS = 1600;

/**
 * Island 001 mandate reward: a basket pops up with three eggs (one rare, two
 * common) that fly one by one into the egg column on the left, so the player
 * sees them land. Presentation only — the eggs were granted canonically.
 */
export function MandateEggBasketOverlay(props: { onDone: () => void }) {
  useControllerShopScrollLock();
  const onDoneRef = useRef(props.onDone);
  onDoneRef.current = props.onDone;
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useLayoutEffect(() => {
    // Aim for the travelling egg column; fall back to the left edge.
    const tray = document.querySelector('.island-run-board__rewardbar-hatchery-tray');
    const rect = tray?.getBoundingClientRect();
    setTarget(rect && rect.width > 0
      ? { x: rect.left + Math.min(rect.width, 44) / 2, y: rect.top + Math.min(rect.height, 44) / 2 }
      : { x: 28, y: window.innerHeight * 0.42 });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), reduced ? BASKET_REDUCED_DURATION_MS : BASKET_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  if (typeof document === 'undefined') return null;
  const centreX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const centreY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  return createPortal(
    <div className="mandate-basket" role="dialog" aria-modal="true" aria-label="Mandate reward: a basket of three eggs" onClick={() => onDoneRef.current()}>
      <div className="mandate-basket__backdrop" aria-hidden="true" />
      <div className="mandate-basket__card">
        <p className="mandate-basket__eyebrow">Mandate signed · reward</p>
        <div className="mandate-basket__basket" aria-hidden="true">
          <span className="mandate-basket__weave">🧺</span>
        </div>
        <strong>A basket of eggs!</strong>
        <small>1 rare · 2 common — added to your egg column</small>
      </div>
      {target ? MANDATE_EGG_BASKET_TIERS.map((tier, index) => (
        <span
          key={index}
          className={`mandate-basket__egg mandate-basket__egg--${tier}`}
          aria-hidden="true"
          style={{
            left: centreX - 18 + (index - 1) * 34,
            top: centreY - 64,
            '--egg-fly-x': `${target.x - (centreX + (index - 1) * 34)}px`,
            '--egg-fly-y': `${target.y - (centreY - 46)}px`,
            '--egg-delay': `${reduced ? 0 : 900 + index * 380}ms`,
          } as CSSProperties}
        >
          🥚
        </span>
      )) : null}
    </div>,
    document.body,
  );
}
