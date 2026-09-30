import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import { MINIGAME_RATING_LEVELS, resolveRatingFromDrag, type MinigameRatingValue } from '../services/minigameFeedback';

/**
 * Optional 5-level rating after an event mini game: drag the knob up (loved
 * it) or down (not for me), tap a level, or use the arrow keys.
 */
export function MinigameRatingModal(props: {
  gameName: string;
  gameIcon: string;
  onSubmit: (rating: MinigameRatingValue) => void;
  onSkip: () => void;
}) {
  useControllerShopScrollLock();
  const [rating, setRating] = useState<MinigameRatingValue>(3);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const onSkipRef = useRef(props.onSkip);
  onSkipRef.current = props.onSkip;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkipRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setFromPointer = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return;
    setRating(resolveRatingFromDrag(1 - (clientY - rect.top) / rect.height));
  };
  const level = MINIGAME_RATING_LEVELS[rating - 1];
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="minigame-rating" role="dialog" aria-modal="true" aria-labelledby="minigame-rating-title">
      <div className="minigame-rating__backdrop" aria-hidden="true" />
      <section className="minigame-rating__card">
        <p className="minigame-rating__eyebrow">Quick feedback · optional</p>
        <h2 id="minigame-rating-title"><span aria-hidden="true">{props.gameIcon}</span> How was {props.gameName}?</h2>
        <div className="minigame-rating__body">
          <div
            ref={trackRef}
            className={`minigame-rating__track${dragging ? ' is-dragging' : ''}`}
            role="slider"
            tabIndex={0}
            aria-label="Rate this game"
            aria-orientation="vertical"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={rating}
            aria-valuetext={level.label}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); setFromPointer(event.clientY); }}
            onPointerMove={(event) => { if (dragging) setFromPointer(event.clientY); }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); setRating((value) => Math.min(5, value + 1) as MinigameRatingValue); }
              if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); setRating((value) => Math.max(1, value - 1) as MinigameRatingValue); }
            }}
          >
            <span className="minigame-rating__fill" style={{ height: `${(rating - 0.5) * 20}%` }} aria-hidden="true" />
            <span className="minigame-rating__knob" style={{ bottom: `calc(${(rating - 0.5) * 20}% - 22px)` }} aria-hidden="true">{level.emoji}</span>
          </div>
          <ol className="minigame-rating__levels">
            {[...MINIGAME_RATING_LEVELS].reverse().map((entry) => (
              <li key={entry.value}>
                <button type="button" className={entry.value === rating ? 'is-selected' : undefined} onClick={() => setRating(entry.value)}>
                  <span aria-hidden="true">{entry.emoji}</span> {entry.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="minigame-rating__actions">
          <button type="button" className="minigame-rating__send" onClick={() => props.onSubmit(rating)}>Send · {level.label}</button>
          <button type="button" className="minigame-rating__skip" onClick={props.onSkip}>Skip</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
