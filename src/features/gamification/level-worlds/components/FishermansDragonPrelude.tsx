import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  dragonPreludeBeat,
  dragonPreludeTalk,
  isDragonPreludeActive,
  isDragonPreludePanic,
} from '../services/fishermansDragonPrelude';
import './fishermans-dragon-prelude.css';

/**
 * Siren, draining pond and "NOT A DRILL!" before the dragon erupts. The
 * player may tap "Why?"; the answer depends on the moment. Everything closes
 * when the dragon breaks the surface. Presentation only.
 */
export function FishermansDragonPrelude({ elapsed }: { elapsed: number }) {
  const [asked, setAsked] = useState(0);
  const [askedAt, setAskedAt] = useState<number | null>(null);
  if (!isDragonPreludeActive(elapsed) || typeof document === 'undefined') return null;
  const beat = dragonPreludeBeat(elapsed);
  const panic = isDragonPreludePanic(elapsed);
  const talk = dragonPreludeTalk(elapsed, asked, askedAt);
  return createPortal(
    <div className={`dragon-prelude${panic ? ' dragon-prelude--panic' : ''}`} aria-live="polite">
      <div className="dragon-prelude__siren" aria-hidden="true"><i /><span>⚠ POND ALARM</span><i /></div>
      {beat ? (
        <div key={beat.text} className={`dragon-prelude__line dragon-prelude__line--${beat.speaker.toLowerCase()}`} role="status">
          <small>{beat.speaker}</small>
          <strong>{beat.text}</strong>
        </div>
      ) : null}
      {talk.kind === 'ask' ? (
        <button type="button" className="dragon-prelude__ask" onClick={() => { setAsked(1); setAskedAt(elapsed); }}>
          {talk.label}
        </button>
      ) : null}
      {talk.kind === 'reply' ? (
        <div className="dragon-prelude__reply">
          <p key={talk.text}><small>Fisherman</small>{talk.text}</p>
          {talk.followUp && asked < 2 ? (
            <button type="button" className="dragon-prelude__ask" onClick={() => setAsked(2)}>{talk.followUp}</button>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
