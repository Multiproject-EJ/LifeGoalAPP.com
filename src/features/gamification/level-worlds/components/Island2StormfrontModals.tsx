import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import {
  STORMFRONT_STRUCTURES,
  getStormfrontLevelCost,
  type StormfrontProgress,
  type StormfrontStructureId,
} from '../services/island2Stormfront';
import { resolveLandmarkFlag, LANDMARK_FLAG_LABEL } from '../services/landmarkFlags';
import { MAX_BUILD_LEVEL } from '../services/islandRunBuildConstants';

/** Hold-to-build cadence (one funded step per tick while held). */
const HOLD_STEP_MS = 140;

const STRUCTURE_ICONS: Record<StormfrontStructureId, string> = { 'lightning-grid': '⚡', 'sky-hangar': '🛩️' };

export function resolveStormfrontStructureView(progress: StormfrontProgress, islandNumber: number, cycleIndex: number) {
  return STORMFRONT_STRUCTURES.map((structure) => {
    const level = progress.levels[structure.id];
    const required = level >= MAX_BUILD_LEVEL ? 0 : getStormfrontLevelCost({ structureId: structure.id, currentLevel: level, islandNumber, cycleIndex });
    const spent = progress.spentTowardLevel[structure.id];
    const fraction = required > 0 ? Math.min(1, spent / required) : 1;
    const percent = level >= MAX_BUILD_LEVEL ? 100 : Math.min(99, Math.floor(((level + fraction) / MAX_BUILD_LEVEL) * 100));
    return { ...structure, level, required, spent, percent, flag: resolveLandmarkFlag({ level, percent }) };
  });
}

function ModalShell(props: { labelledBy: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  useControllerShopScrollLock();
  const { onClose } = props;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`island-soft-save-modal island-stormfront-modal ${props.className ?? ''}`} role="dialog" aria-modal="true" aria-labelledby={props.labelledBy}>
      <div className="island-soft-save-modal__backdrop" aria-hidden="true" onClick={props.onClose} />
      <div className="island-soft-save-modal__dialog island-stormfront-modal__dialog">
        <button type="button" className="island-stormfront-modal__close" aria-label="Close" onClick={props.onClose}>×</button>
        {props.children}
      </div>
    </div>,
    document.body,
  );
}

/** The add-on mission arriving on the Mission Phone right after the strike. */
export function Island2StormfrontMessage(props: { onBuild: () => void; onClose: () => void }) {
  return (
    <ModalShell labelledBy="island-stormfront-message-title" onClose={props.onClose} className="island-stormfront-modal--message">
      <p className="island-soft-save-modal__eyebrow">📱 Mission Phone · Incoming add-on mission</p>
      <h2 id="island-stormfront-message-title">Stormfront: make the island storm-safe</h2>
      <p>
        That strike tore pieces off all four landmarks. Rebuild them, and this time protect the island properly.
      </p>
      <ul className="island-stormfront-modal__brief">
        {STORMFRONT_STRUCTURES.map((structure) => (
          <li key={structure.id}>
            <span aria-hidden="true">{STRUCTURE_ICONS[structure.id]}</span>
            <span><strong>{structure.title}</strong> {structure.blurb}</span>
          </li>
        ))}
      </ul>
      <p className="island-soft-save-modal__fineprint">
        Build each one to Level 3 like a landmark. The hangar is where the Event Arena planes take off and are stored.
      </p>
      <div className="island-soft-save-modal__actions">
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--primary" onClick={props.onBuild}>Build storm defences</button>
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--secondary" onClick={props.onClose}>Later</button>
      </div>
    </ModalShell>
  );
}

/** Hold-to-build panel for the two storm-safe structures. */
export function Island2StormfrontBuildModal(props: {
  progress: StormfrontProgress;
  islandNumber: number;
  cycleIndex: number;
  money: number;
  onFundStep: (structureId: StormfrontStructureId) => Promise<{ status: string; leveledUp?: boolean }>;
  onClose: () => void;
}) {
  const structures = resolveStormfrontStructureView(props.progress, props.islandNumber, props.cycleIndex);
  const [holding, setHolding] = useState<StormfrontStructureId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const onFundStepRef = useRef(props.onFundStep);
  onFundStepRef.current = props.onFundStep;

  const step = async (id: StormfrontStructureId) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await onFundStepRef.current(id);
      if (result.status === 'insufficient_money') { setNotice('Not enough money. Roll to collect more, then keep building.'); setHolding(null); }
      else if (result.status === 'already_complete') setHolding(null);
      else if (result.status === 'ok') { setNotice(result.leveledUp ? 'Level up! 🚩' : null); }
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (!holding) return undefined;
    void step(holding);
    const timer = window.setInterval(() => { void step(holding); }, HOLD_STEP_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  const allDone = structures.every((entry) => entry.level >= MAX_BUILD_LEVEL);
  return (
    <ModalShell labelledBy="island-stormfront-build-title" onClose={props.onClose}>
      <p className="island-soft-save-modal__eyebrow">Island 002 · Add-on mission</p>
      <h2 id="island-stormfront-build-title">Storm defences</h2>
      <p className="island-soft-save-modal__fineprint">Hold to build. Money: {Math.floor(props.money).toLocaleString()}</p>
      <div className="island-stormfront-modal__structures">
        {structures.map((structure) => (
          <section key={structure.id} className="island-stormfront-structure" aria-label={structure.title}>
            <header>
              <span className="island-stormfront-structure__icon" aria-hidden="true">{STRUCTURE_ICONS[structure.id]}</span>
              <div>
                <h3>{structure.title}</h3>
                <span className="island-stormfront-structure__flag">
                  {structure.flag === 'none'
                    ? <span className="island-mission-tracker__flag-empty" aria-hidden="true" />
                    : <i className={`island-landmark-flag island-landmark-flag--${structure.flag}`} aria-hidden="true" />}
                  {LANDMARK_FLAG_LABEL[structure.flag]}
                </span>
              </div>
            </header>
            <p>{structure.blurb}</p>
            <div className="island-stormfront-structure__levels" aria-label={`Level ${structure.level} of ${MAX_BUILD_LEVEL}`}>
              {Array.from({ length: MAX_BUILD_LEVEL }, (_, index) => (
                <span key={index} className={index < structure.level ? 'is-built' : ''}>L{index + 1}</span>
              ))}
            </div>
            <div className="island-stormfront-structure__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={structure.percent}>
              <span style={{ width: `${structure.percent}%` }} />
            </div>
            {structure.level >= MAX_BUILD_LEVEL ? (
              <p className="island-stormfront-structure__done">Storm-safe ✓</p>
            ) : (
              <button
                type="button"
                className={`island-stop-modal__btn island-stop-modal__btn--primary island-stormfront-structure__build${holding === structure.id ? ' is-holding' : ''}`}
                onPointerDown={(event) => { event.preventDefault(); setHolding(structure.id); }}
                onPointerUp={() => setHolding(null)}
                onPointerLeave={() => setHolding(null)}
                onPointerCancel={() => setHolding(null)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void step(structure.id); } }}
                onContextMenu={(event) => event.preventDefault()}
              >
                Hold to build L{structure.level + 1} · {structure.spent.toLocaleString()}/{structure.required.toLocaleString()}
              </button>
            )}
          </section>
        ))}
      </div>
      {notice ? <p className="island-stormfront-modal__notice" role="status">{notice}</p> : null}
      {allDone ? <p className="island-stormfront-modal__notice" role="status">The island is storm-safe. The Sky Hangar is ready for the Event Arena planes.</p> : null}
    </ModalShell>
  );
}
