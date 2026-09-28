import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { COASTER_SECTION_COUNT, type CoasterOrderStatus } from '../services/islandRunSignatureMissions';
import './coaster-director-overlay.css';

const INTRO_SEEN_PREFIX = 'lifegoal:island19:director-intro-seen';

function readIntroSeen(key: string): boolean {
  try { return window.localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeIntroSeen(key: string) {
  try { window.localStorage.setItem(key, '1'); } catch { /* private mode */ }
}

export type CoasterDirectorFeedback = { tone: 'ok' | 'warn'; text: string } | null;

type Props = {
  playerKey: string;
  order: CoasterOrderStatus;
  missionComplete: boolean;
  money: number;
  busy: boolean;
  feedback: CoasterDirectorFeedback;
  onOrder: () => void;
  onInstall: () => void;
  onClose: () => void;
};

/**
 * Island 019's Theme Park Director. Speech bubbles tell the commission story
 * once, then become the order desk. Every gameplay change goes through the
 * canonical actions passed in (`onOrder`, `onInstall`); this is presentation.
 */
export function CoasterDirectorOverlay({
  playerKey, order, missionComplete, money, busy, feedback, onOrder, onInstall, onClose,
}: Props) {
  const introKey = `${INTRO_SEEN_PREFIX}:${playerKey}`;
  const [introSeen, setIntroSeen] = useState(() => readIntroSeen(introKey));

  useEffect(() => {
    const unlockScroll = lockPageScroll();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { unlockScroll(); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const acceptCommission = () => { writeIntroSeen(introKey); setIntroSeen(true); };
  const price = order.nextPrice ?? 0;
  const funded = price > 0 ? Math.min(1, money / price) : 1;
  const canAfford = price > 0 && money >= price;

  let bubbles: string[];
  let actions: JSX.Element;
  if (!introSeen) {
    bubbles = [
      'Welcome to Coaster Carnival! I’m the Director.',
      'Stalls, lanterns, cotton candy… but every great park needs a coaster, and ours never got one.',
      'Would you build and gift us the Wonder Express? Fair warning: it isn’t cheap.',
    ];
    actions = (
      <>
        <button type="button" className="coaster-director__secondary" onClick={onClose}>Maybe later</button>
        <button type="button" className="coaster-director__primary" onClick={acceptCommission}>Yes, I’ll build it!</button>
      </>
    );
  } else if (missionComplete) {
    bubbles = ['The Wonder Express is complete. The whole park is buzzing!', 'Thank you, builder. Come back any time.'];
    actions = <button type="button" className="coaster-director__primary" onClick={onClose}>Back to the island</button>;
  } else if (order.sectionReady) {
    bubbles = [
      feedback?.tone === 'ok' ? feedback.text : 'Your section has arrived!',
      `Install section ${order.sectionsInstalled + 1} of ${COASTER_SECTION_COUNT} and watch it lock into the park.`,
    ];
    actions = (
      <>
        <button type="button" className="coaster-director__secondary" onClick={onClose}>Later</button>
        <button type="button" className="coaster-director__primary" disabled={busy} onClick={onInstall}>
          Install section {order.sectionsInstalled + 1}
        </button>
      </>
    );
  } else {
    bubbles = [
      order.sectionsOrdered === 0
        ? 'Let’s start with the first section. I’ve got the catalogue right here.'
        : 'Ready for the next section? This one is a thriller.',
      `Section ${order.sectionsOrdered + 1}: ${order.nextSectionName}. That’s ${price.toLocaleString()} Money.`,
      ...(feedback?.tone === 'warn' ? [feedback.text] : canAfford ? [] : ['Earn Money around the island, then come back and order.']),
    ];
    actions = (
      <>
        <button type="button" className="coaster-director__secondary" onClick={onClose}>Not yet</button>
        <button type="button" className="coaster-director__primary" disabled={busy || !canAfford} onClick={onOrder}>
          {canAfford ? `Order · ${price.toLocaleString()} 💰` : `Need ${(price - money).toLocaleString()} more 💰`}
        </button>
      </>
    );
  }

  return createPortal(
    <div className="coaster-director" role="dialog" aria-modal="true" aria-label="Theme Park Director">
      <button type="button" className="coaster-director__backdrop" aria-label="Close" onClick={onClose} />
      <div className="coaster-director__stage">
        <div className="coaster-director__avatar" aria-hidden="true">
          <span className="coaster-director__hat">🎩</span>
          <span className="coaster-director__face">🧔</span>
        </div>
        <div className="coaster-director__bubbles" key={bubbles.join('|')}>
          {bubbles.map((text, index) => (
            <p key={text} className="coaster-director__bubble" style={{ animationDelay: `${index * 0.45}s` }}>{text}</p>
          ))}
        </div>
        {introSeen && !missionComplete ? (
          <div className="coaster-director__ledger" aria-label="Coaster progress">
            <div className="coaster-director__sections">
              {Array.from({ length: COASTER_SECTION_COUNT }, (_, index) => (
                <span
                  key={index}
                  className={index < order.sectionsInstalled ? 'is-installed' : index < order.sectionsOrdered ? 'is-ordered' : ''}
                >{index + 1}</span>
              ))}
            </div>
            {!order.sectionReady && !order.allOrdered ? (
              <div className="coaster-director__fund">
                <div className="coaster-director__fund-bar"><i style={{ width: `${Math.round(funded * 100)}%` }} /></div>
                <small>Coaster fund {Math.min(money, price).toLocaleString()} / {price.toLocaleString()}</small>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="coaster-director__actions" style={{ animationDelay: `${bubbles.length * 0.45}s` }}>{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
