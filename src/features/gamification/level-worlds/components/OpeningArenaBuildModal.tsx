import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import {
  OPENING_ARENA_SEAT_COUNT,
  SKY_LIFT_CAPACITY,
  getOpeningArenaLevelCost,
  type OpeningArenaProgress,
} from '../services/island2OpeningArena';
import { MAX_BUILD_LEVEL } from '../services/islandRunBuildConstants';

const HOLD_STEP_MS = 140;
const LEVEL_NAMES = ['Lower bowl & pitch', 'Upper tier & columns', 'Grand canopy & floodlights'];

/** The Opening Arena's own build modal: hold to fund, three levels. */
export function OpeningArenaBuildModal(props: {
  progress: OpeningArenaProgress;
  islandNumber: number;
  cycleIndex: number;
  money: number;
  onFundStep: () => Promise<{ status: string; leveledUp?: boolean }>;
  onClose: () => void;
}) {
  useControllerShopScrollLock();
  const { progress } = props;
  const level = progress.arenaLevel;
  const complete = level >= MAX_BUILD_LEVEL;
  const required = complete ? 0 : getOpeningArenaLevelCost({ currentLevel: level, islandNumber: props.islandNumber, cycleIndex: props.cycleIndex });
  const percent = complete ? 100 : Math.min(99, Math.floor(((level + (required > 0 ? progress.spentTowardLevel / required : 0)) / MAX_BUILD_LEVEL) * 100));
  const [holding, setHolding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const onFundStepRef = useRef(props.onFundStep);
  onFundStepRef.current = props.onFundStep;
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  const step = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await onFundStepRef.current();
      if (result.status === 'insufficient_money') { setNotice('Not enough money. Roll to collect more, then keep building.'); setHolding(false); }
      else if (result.status !== 'ok') setHolding(false);
      else if (result.leveledUp) setNotice('Level up! The crowd cheers 🎉');
    } finally {
      inFlight.current = false;
    }
  };
  useEffect(() => {
    if (!holding) return undefined;
    void step();
    const timer = window.setInterval(() => { void step(); }, HOLD_STEP_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="island-soft-save-modal island-stormfront-modal opening-arena-modal" role="dialog" aria-modal="true" aria-labelledby="opening-arena-title">
      <div className="island-soft-save-modal__backdrop" aria-hidden="true" onClick={props.onClose} />
      <div className="island-soft-save-modal__dialog island-stormfront-modal__dialog opening-arena-modal__dialog">
        <button type="button" className="island-stormfront-modal__close" aria-label="Close" onClick={props.onClose}>×</button>
        <p className="island-soft-save-modal__eyebrow">Island 002 · Opening Arena</p>
        <h2 id="opening-arena-title">Build the Opening Arena</h2>
        <div className="opening-arena-modal__hero" aria-hidden="true">
          <span className="opening-arena-modal__stadium">🏟️</span>
          <span className="opening-arena-modal__base">🛸</span>
        </div>
        <p className="opening-arena-modal__facts">
          <span>🪑 {OPENING_ARENA_SEAT_COUNT.toLocaleString()} seats</span>
          <span>🛗 Golden Sky Lift · {SKY_LIFT_CAPACITY} guests a ride</span>
        </p>
        <ol className="opening-arena-modal__levels">
          {LEVEL_NAMES.map((name, index) => (
            <li key={name} className={index < level ? 'is-built' : index === level && !complete ? 'is-current' : undefined}>
              <b>L{index + 1}</b>
              <span>{name}</span>
              <i aria-hidden="true">{index < level ? '✓' : ''}</i>
            </li>
          ))}
        </ol>
        <div className="island-stormfront-structure__bar" role="progressbar" aria-label="Opening Arena progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="island-soft-save-modal__fineprint">Money: {Math.floor(props.money).toLocaleString()}</p>
        {complete ? (
          <p className="island-stormfront-structure__done">The Opening Arena is ready. Guests are riding up the Sky Lift to find their seats!</p>
        ) : (
          <button
            type="button"
            className={`island-stop-modal__btn island-stop-modal__btn--primary island-stormfront-structure__build${holding ? ' is-holding' : ''}`}
            onPointerDown={(event) => { event.preventDefault(); setHolding(true); }}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void step(); } }}
            onContextMenu={(event) => event.preventDefault()}
          >
            Hold to build L{level + 1} · {progress.spentTowardLevel.toLocaleString()}/{required.toLocaleString()}
          </button>
        )}
        {notice ? <p className="island-stormfront-modal__notice" role="status">{notice}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
