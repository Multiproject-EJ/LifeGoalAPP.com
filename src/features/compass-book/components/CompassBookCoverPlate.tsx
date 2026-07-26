import { useEffect, useState } from 'react';
import { CompassRose } from './CompassRose';

/** How long the cover takes to swing open. Must match `cbk-cover-open` in CSS. */
export const COVER_OPEN_MS = 900;

export type CompassBookCoverPlateProps = {
  /** Fires once the cover has finished swinging and can be unmounted. */
  onOpened: () => void;
};

/**
 * The book's front board, shown for one beat when the Compass Book opens.
 *
 * It swings on its spine, so the book is opened rather than a panel appearing.
 * Purely decorative and never blocking: it is `aria-hidden`, the page behind it
 * is already mounted and readable by assistive tech, and a tap skips the swing.
 * Players who prefer reduced motion never see it at all — {@link CompassBookScreen}
 * skips mounting it, and the CSS collapses the animation as a second guard.
 */
export function CompassBookCoverPlate({ onOpened }: CompassBookCoverPlateProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(onOpened, COVER_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [onOpened]);

  return (
    <div
      className={`compass-book__cover-plate ${closing ? 'compass-book__cover-plate--skip' : ''}`}
      aria-hidden="true"
      onClick={() => {
        setClosing(true);
        onOpened();
      }}
    >
      <div className="compass-book__cover-board">
        <span className="compass-book__cover-rule" />
        <span className="compass-book__cover-star">✦</span>
        <span className="compass-book__cover-name">
          Compass
          <br />
          Book
        </span>
        <span className="compass-book__cover-rule" />
        <span className="compass-book__cover-motto">
          Your journey.
          <br />
          Your growth.
          <br />
          Your legend.
        </span>
        <span className="compass-book__cover-rose" aria-hidden="true">
          <CompassRose tone="gilt" size={132} />
        </span>
      </div>
    </div>
  );
}
