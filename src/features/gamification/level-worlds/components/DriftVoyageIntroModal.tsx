import { createPortal } from 'react-dom';
import { DRIFT_CURRENTS, type DriftVoyageIntro } from '../services/islandRunDriftVoyage';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import './DriftVoyageIntroModal.css';

/**
 * Shown once when a Drift Voyage begins on Island 1 after the 120-island
 * voyage is complete. Presentation only.
 */
export function DriftVoyageIntroModal({ intro, onClose }: { intro: DriftVoyageIntro; onClose: () => void }) {
  useControllerShopScrollLock();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="drift-voyage-intro" role="dialog" aria-modal="true" aria-labelledby="drift-voyage-intro-title">
      <div className="drift-voyage-intro__backdrop" aria-hidden="true" onClick={onClose} />
      <section className="drift-voyage-intro__card">
        <p className="drift-voyage-intro__eyebrow">Drift Voyage {intro.voyageNumber}</p>
        <h2 id="drift-voyage-intro-title">{intro.title}</h2>
        {intro.lines.map((line) => <p key={line} className="drift-voyage-intro__line">{line}</p>)}
        <ul className="drift-voyage-intro__currents" aria-label="Drift currents">
          {DRIFT_CURRENTS.map((current) => (
            <li key={current.id}>
              <span aria-hidden="true">{current.icon}</span>
              <strong>{current.title}</strong>
              <small>{current.blurb}</small>
            </li>
          ))}
        </ul>
        <div className="drift-voyage-intro__teaser">
          <strong>🏛️ {intro.teaser.title}</strong>
          <p>{intro.teaser.body}</p>
        </div>
        <button type="button" className="drift-voyage-intro__cta" onClick={onClose}>Set sail</button>
      </section>
    </div>,
    document.body,
  );
}
