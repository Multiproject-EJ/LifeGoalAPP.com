import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './egg-mania-popup.css';

type Props = {
  islandNumber: number;
  unused: boolean;
  endsLabel: string;
  /** Shown when the player is not already at the Hatchery and can still use it. */
  onGoToHatchery?: () => void;
  onClose: () => void;
};

const EGG_TINTS = ['#fde68a', '#f9a8d4', '#a5f3fc'] as const;

/**
 * Egg Mania announcement: a viewport-fixed portal with backdrop and scroll
 * lock. Presentation only; setting eggs still goes through the Hatchery.
 */
export function EggManiaPopup({ islandNumber, unused, endsLabel, onGoToHatchery, onClose }: Props) {
  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="egg-mania-popup" role="dialog" aria-modal="true" aria-labelledby="egg-mania-popup-title">
      <button type="button" className="egg-mania-popup__backdrop" aria-label="Close" onClick={onClose} />
      <section className={`egg-mania-popup__card${unused ? '' : ' egg-mania-popup__card--used'}`}>
        <div className="egg-mania-popup__eggs" aria-hidden="true">
          {EGG_TINTS.map((tint, index) => (
            <span
              key={tint}
              className="egg-mania-popup__egg"
              style={{ ['--egg-tint' as string]: tint, animationDelay: `${0.15 + index * 0.14}s` }}
            >
              <i /><i /><i />
            </span>
          ))}
          <span className="egg-mania-popup__flame egg-mania-popup__flame--left">🔥</span>
          <span className="egg-mania-popup__flame egg-mania-popup__flame--right">🔥</span>
        </div>
        <small className="egg-mania-popup__kicker">Island {islandNumber} · limited time</small>
        <h2 id="egg-mania-popup-title">EGG MANIA!</h2>
        <p className="egg-mania-popup__lead">
          This island&apos;s Hatchery can set <strong>3 eggs at once</strong> instead of 1.
        </p>
        <ul className="egg-mania-popup__facts">
          <li><span>Status</span><strong>{unused ? 'Ready: set your triple batch!' : 'Triple batch already set'}</strong></li>
          <li><span>Ends</span><strong>{endsLabel}</strong></li>
        </ul>
        <p className="egg-mania-popup__note">Each egg hatches on its own, so you can collect creatures or sell eggs one by one.</p>
        <div className="egg-mania-popup__actions">
          {onGoToHatchery ? (
            <button type="button" className="egg-mania-popup__primary" onClick={onGoToHatchery}>Go to Hatchery 🥚</button>
          ) : null}
          <button type="button" className="egg-mania-popup__secondary" onClick={onClose}>{onGoToHatchery ? 'Later' : 'Got it'}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
