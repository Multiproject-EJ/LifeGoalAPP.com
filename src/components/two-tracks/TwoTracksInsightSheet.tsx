import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import type { TwoTracksTileInsight } from '../../features/gamification/level-worlds/services/twoTracksRoad';

/** Tap-a-step insight: a small viewport sheet with a backdrop and scroll lock. */
export function TwoTracksInsightSheet({ insight, onClose }: { insight: TwoTracksTileInsight; onClose: () => void }) {
  useEffect(() => {
    const unlockScroll = lockPageScroll();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { unlockScroll(); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="tt-insight" role="dialog" aria-modal="true" aria-labelledby="tt-insight-title">
      <button type="button" className="tt-insight__backdrop" aria-label="Close" onClick={onClose} />
      <section className={`tt-insight__card tt-insight__card--${insight.tone}`}>
        {insight.imageSrc ? <img className="tt-insight__art" src={insight.imageSrc} alt="" /> : null}
        <small className="tt-insight__kicker">{insight.kicker}</small>
        <h3 id="tt-insight-title">{insight.title}</h3>
        <ul>
          {insight.lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button type="button" className="tt-insight__close" onClick={onClose}>Got it</button>
      </section>
    </div>,
    document.body,
  );
}
