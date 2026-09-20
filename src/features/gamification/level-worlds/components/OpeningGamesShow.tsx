import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { sampleOpeningCeremony } from '../services/islandRunOpeningCeremonyPresentation';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './OpeningGamesShow.css';

/** Captions and Skip belong to the viewport, not the transformed 3D canvas.
 * Completion is presentation-only: the canonical beacon action already saved. */
export function OpeningGamesShow({ startedAtMs, reducedMotion, onFinish, onOverview }: {
  startedAtMs: number; reducedMotion: boolean; onFinish: () => void; onOverview: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startedAtMs));
  const finished = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const overviewRef = useRef(onOverview);
  overviewRef.current = onOverview;
  const finish = () => { if (!finished.current) { finished.current = true; finishRef.current(); } };
  const focusRef = useVaultModalFocusTrap<HTMLDivElement>(finish);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);
  useEffect(() => {
    finished.current = false;
    const update = () => {
      const ms = Math.max(0, Date.now() - startedAtMs);
      setElapsed(ms);
      if (sampleOpeningCeremony(ms, reducedMotion).done && !finished.current) {
        finished.current = true;
        finishRef.current();
      }
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [startedAtMs, reducedMotion]);
  const sample = sampleOpeningCeremony(elapsed, reducedMotion);
  useEffect(() => {
    if (sample.phase === 'celebration' || sample.phase === 'introduction') overviewRef.current();
  }, [sample.phase]);
  return createPortal(<div className="opening-games-show" ref={focusRef} tabIndex={-1}
    role="dialog" aria-modal="true" aria-label="First Games opening show" data-phase={sample.phase}>
    <div className="opening-games-show__caption">
      <p className="opening-games-show__eyebrow">Island 002 · The First Games</p>
      <p role="status" aria-live="polite">{sample.caption}</p>
      <button type="button" onClick={finish}>{reducedMotion ? 'Continue to the island' : 'Skip animation'}</button>
    </div>
  </div>, document.body);
}
