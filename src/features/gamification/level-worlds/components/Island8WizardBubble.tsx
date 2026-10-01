import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import { ISLAND8_BASELINE_QUESTIONS, type Island8BaselineQuestion } from '../services/island8BaselineCheck';

/**
 * Island 008: the masked caretaker's speech bubble. One baseline question per
 * visit; answering lights the next seal (beacon). Presentation only — the
 * board passes the canonical answer action in `onAnswer`.
 */
export function Island8WizardBubble(props: {
  question: Island8BaselineQuestion;
  answeredCount: number;
  busy: boolean;
  firstVisit: boolean;
  onAnswer: (value: number) => void;
  onLater: () => void;
}) {
  useControllerShopScrollLock();
  const [picked, setPicked] = useState<number | null>(null);
  const onLaterRef = useRef(props.onLater);
  onLaterRef.current = props.onLater;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onLaterRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { setPicked(null); }, [props.question.id]);
  const total = ISLAND8_BASELINE_QUESTIONS.length;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="island8-wizard" role="dialog" aria-modal="true" aria-labelledby="island8-wizard-line">
      <div className="island8-wizard__backdrop" aria-hidden="true" />
      <div className="island8-wizard__stage">
        <div className="island8-wizard__beacons" aria-label={`${props.answeredCount} of ${total} seals lit`}>
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={index < props.answeredCount ? 'is-lit' : index === props.answeredCount ? 'is-next' : undefined} aria-hidden="true" />
          ))}
        </div>
        <div className="island8-wizard__bubble">
          <p className="island8-wizard__speaker">
            <span className="island8-wizard__mask" aria-hidden="true" /> The masked caretaker · {props.question.area}
          </p>
          {props.firstVisit ? (
            <p className="island8-wizard__intro">I keep the five seals of this jungle. Answer me honestly — each answer wakes one seal.</p>
          ) : null}
          <p id="island8-wizard-line" className="island8-wizard__line">{props.question.prompt}</p>
          <div className="island8-wizard__choices" role="radiogroup" aria-label="Your answer">
            {props.question.scale.map((label, index) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={picked === index + 1}
                className={picked === index + 1 ? 'is-picked' : undefined}
                disabled={props.busy}
                onClick={() => setPicked(index + 1)}
              >
                <b>{index + 1}</b>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="island8-wizard__actions">
            <button type="button" className="island8-wizard__later" disabled={props.busy} onClick={props.onLater}>Ask me later</button>
            <button
              type="button"
              className="island8-wizard__submit"
              disabled={picked === null || props.busy}
              onClick={() => { if (picked !== null) props.onAnswer(picked); }}
            >
              {props.busy ? 'The seal wakes…' : `Light seal ${Math.min(total, props.answeredCount + 1)}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
