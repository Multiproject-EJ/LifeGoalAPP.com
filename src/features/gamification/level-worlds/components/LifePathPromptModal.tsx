import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { LIFE_PATH_REASSURANCE, type LifePathIntent, type LifePathPrompt } from '../services/lifePathProgress';
import './LifePathPromptModal.css';

const INTENT_OPTIONS: Array<{ intent: LifePathIntent; emoji: string; label: string; detail: string }> = [
  { intent: 'game', emoji: '🎲', label: 'The game', detail: 'Islands, eggs and adventure first.' },
  { intent: 'life', emoji: '🌱', label: 'Improving my life', detail: 'Goals and habits as soon as possible.' },
  { intent: 'both', emoji: '✨', label: 'Both', detail: 'A bit of each, at my own pace.' },
];

/**
 * The caretaker's life-path prompts: "What brings you here?" once, then the
 * optional fast-track offer to open Today, habits and goals early.
 * Presentation only; the board passes canonical action callbacks.
 */
export function LifePathPromptModal(props: {
  prompt: Exclude<LifePathPrompt, null>;
  canOpenToday: boolean;
  onAnswerIntent: (intent: LifePathIntent) => Promise<unknown>;
  onAcceptFastTrack: () => Promise<unknown>;
  onDeclineFastTrack: () => Promise<unknown>;
  onOpenToday: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [answeredIntent, setAnsweredIntent] = useState<LifePathIntent | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => lockPageScroll(['body', 'documentElement']), []);
  useEffect(() => { dialog.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [props.prompt, accepted, answeredIntent]);

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      after?.();
    } finally {
      setBusy(false);
    }
  };

  let body: JSX.Element;
  if (accepted) {
    body = <>
      <p className="life-path-prompt__eyebrow">Your plan is open</p>
      <h2 className="life-path-prompt__title">Today, habits and goals are ready</h2>
      <p className="life-path-prompt__text">
        Start small: one goal and one or two habits are plenty. Your island journey keeps going exactly where you left it,
        and every habit you check in now warms your eggs.
      </p>
      <div className="life-path-prompt__actions">
        {props.canOpenToday ? (
          <button type="button" className="life-path-prompt__primary" onClick={props.onOpenToday}>Open Today</button>
        ) : null}
        <button type="button" className="life-path-prompt__secondary" onClick={props.onClose}>Keep playing for now</button>
      </div>
    </>;
  } else if (answeredIntent) {
    body = <>
      <p className="life-path-prompt__eyebrow">Got it</p>
      <h2 className="life-path-prompt__title">
        {answeredIntent === 'life' ? 'I’ll offer your real-life plan soon' : 'Then let’s keep exploring'}
      </h2>
      <p className="life-path-prompt__text">{LIFE_PATH_REASSURANCE}</p>
      <div className="life-path-prompt__actions">
        <button type="button" className="life-path-prompt__primary" onClick={props.onClose}>Let&rsquo;s go</button>
      </div>
    </>;
  } else if (props.prompt === 'intent') {
    body = <>
      <p className="life-path-prompt__eyebrow">A quick question from your caretaker</p>
      <h2 className="life-path-prompt__title">What brings you here?</h2>
      <p className="life-path-prompt__text">There&rsquo;s no wrong answer. It only changes when I offer you the real-life tools.</p>
      <div className="life-path-prompt__options">
        {INTENT_OPTIONS.map((option) => (
          <button key={option.intent} type="button" className="life-path-prompt__option" disabled={busy}
            onClick={() => void run(() => props.onAnswerIntent(option.intent), () => setAnsweredIntent(option.intent))}>
            <span className="life-path-prompt__option-emoji" aria-hidden="true">{option.emoji}</span>
            <span><strong>{option.label}</strong><small>{option.detail}</small></span>
          </button>
        ))}
      </div>
    </>;
  } else {
    body = <>
      <p className="life-path-prompt__eyebrow">Optional fast track</p>
      <h2 className="life-path-prompt__title">Want to start your real-life plan now?</h2>
      <p className="life-path-prompt__text">
        I can open Today, habits and goals for you right away. Your island journey carries on exactly as before,
        and you can hop between the two any time.
      </p>
      <p className="life-path-prompt__reassure">{LIFE_PATH_REASSURANCE}</p>
      <div className="life-path-prompt__actions">
        <button type="button" className="life-path-prompt__primary" disabled={busy}
          onClick={() => void run(props.onAcceptFastTrack, () => setAccepted(true))}>Yes, start my plan</button>
        <button type="button" className="life-path-prompt__secondary" disabled={busy}
          onClick={() => void run(props.onDeclineFastTrack, props.onClose)}>Not yet, keep playing</button>
      </div>
    </>;
  }

  const modal = (
    <div className="life-path-prompt" role="presentation">
      <div ref={dialog} className="life-path-prompt__card" role="dialog" aria-modal="true" aria-label="Your caretaker">
        <div className="life-path-prompt__badge" aria-hidden="true">🧭</div>
        {body}
      </div>
    </div>
  );
  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
