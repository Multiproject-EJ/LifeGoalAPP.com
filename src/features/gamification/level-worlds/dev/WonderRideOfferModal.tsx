import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import './wonder-ride-offer-modal.css';

type Props = {
  onRide: (wagon: 'front' | 'middle') => void;
  onLater: () => void;
};

/**
 * Island 019: once the last coaster section is installed, the Director offers
 * the very first ride. Viewport portal with backdrop and scroll lock.
 */
export function WonderRideOfferModal({ onRide, onLater }: Props) {
  useEffect(() => {
    const unlockScroll = lockPageScroll();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onLater(); };
    window.addEventListener('keydown', onKey);
    return () => { unlockScroll(); window.removeEventListener('keydown', onKey); };
  }, [onLater]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="wonder-ride-offer" role="dialog" aria-modal="true" aria-labelledby="wonder-ride-offer-title">
      <button type="button" className="wonder-ride-offer__backdrop" aria-label="Maybe later" onClick={onLater} />
      <section className="wonder-ride-offer__card">
        <div className="wonder-ride-offer__burst" aria-hidden="true">🎢</div>
        <small>COASTER COMPLETE · FIRST RIDE</small>
        <h2 id="wonder-ride-offer-title">The Wonder Express is ready!</h2>
        <p>
          <span aria-hidden="true">🎩</span> “You built it, and it’s magnificent. Would you do us the honour of the very first ride?”
        </p>
        <div className="wonder-ride-offer__choices">
          <button type="button" onClick={() => onRide('front')}>
            Front wagon
            <small>Nothing between you and the drop</small>
          </button>
          <button type="button" onClick={() => onRide('middle')}>
            Middle wagon
            <small>Follow the train into the deep</small>
          </button>
        </div>
        <button type="button" className="wonder-ride-offer__later" onClick={onLater}>Maybe later</button>
      </section>
    </div>,
    document.body,
  );
}
