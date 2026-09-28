import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DRAGON_AFTERMATH_FROM_SECONDS, DRAGON_EGG_RUMOUR, shouldShowDragonEggRumour } from '../services/fishermansDragonPrelude';
import './fishermans-dragon-prelude.css';

/**
 * After the dragon: "Imagine having one of those!" → "No creature egg for me
 * then?" → "Rumour has it there's one buried in the water world." Tap-through
 * conversation, shown once after a live dragon cinematic. Presentation only.
 */
export function FishermansEggRumour({ elapsed }: { elapsed: number }) {
  // Live only if we see the cinematic actually in progress (a later visit jumps
  // straight from the initial 0 to far past the end).
  const watchedLive = useRef(false);
  if (elapsed > 0.05 && elapsed < DRAGON_AFTERMATH_FROM_SECONDS) watchedLive.current = true;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done && !open && shouldShowDragonEggRumour({ elapsed, watchedLive: watchedLive.current })) setOpen(true);
  }, [done, elapsed, open]);
  if (!open || done || typeof document === 'undefined') return null;
  const current = DRAGON_EGG_RUMOUR[step]!;
  const next = () => { if (step + 1 < DRAGON_EGG_RUMOUR.length) setStep(step + 1); else setDone(true); };
  return createPortal(
    <div className="dragon-rumour" role="dialog" aria-label="The fisherman">
      <p key={current.text} className="dragon-rumour__line">
        <small>{current.speaker}</small>
        {current.text}
      </p>
      <button type="button" className="dragon-prelude__ask dragon-rumour__reply" onClick={next}>
        {current.reply ?? 'I\'ll keep an eye out'}
      </button>
    </div>,
    document.body,
  );
}
