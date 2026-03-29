import { useEffect, useState } from 'react';
import { TimerCircle } from '../components/TimerCircle';

type SummaryCard = {
  id: string;
  title: string;
  text: string;
  toneSoftened?: boolean;
  moderationNotes?: string[];
};

type HighlightAction = 'accurate' | 'missing' | 'note';

type ParallelReadScreenProps = {
  summaryCards: readonly SummaryCard[];
  alignmentReached?: boolean;
  durationSeconds?: number;
  onAlignmentReached?: () => void;
  onComplete: (decision: 'accurate' | 'missing', annotations: Record<string, HighlightAction>) => void;
};

export function ParallelReadScreen({
  summaryCards,
  alignmentReached = false,
  durationSeconds = 45,
  onAlignmentReached,
  onComplete,
}: ParallelReadScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, HighlightAction>>({});
  const [alignmentCallbackSent, setAlignmentCallbackSent] = useState(false);
  const [extensionsUsed, setExtensionsUsed] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  const timerDone = remainingSeconds === 0;
  const allCardsAccurate =
    summaryCards.length > 0 && summaryCards.every((card) => annotations[card.id] === 'accurate');

  useEffect(() => {
    if (!timerDone || !allCardsAccurate || !onAlignmentReached || alignmentCallbackSent) return;
    onAlignmentReached();
    setAlignmentCallbackSent(true);
  }, [timerDone, allCardsAccurate, onAlignmentReached, alignmentCallbackSent]);

  const applyAnnotation = (action: HighlightAction) => {
    if (!timerDone) return;
    if (!selectedCardId) return;
    setAnnotations((prev) => ({ ...prev, [selectedCardId]: action }));
    setSelectedCardId(null);
  };

  const requestMoreTime = () => {
    if (timerDone || extensionsUsed >= 2) return;
    setRemainingSeconds((prev) => prev + 15);
    setExtensionsUsed((prev) => prev + 1);
  };

  const unlockEarly = () => {
    setRemainingSeconds(0);
  };

  return (
    <section className="conflict-resolver__screen" aria-labelledby="parallel-read-title">
      <header className="conflict-resolver__header">
        <h3 id="parallel-read-title" className="conflict-resolver__title">Parallel Read</h3>
        <p className="conflict-resolver__subtitle">You’re not required to agree. Just understand first.</p>
      </header>

      <TimerCircle totalSeconds={durationSeconds} remainingSeconds={remainingSeconds} />

      <div className="conflict-resolver__parallel-cards">
        {summaryCards.map((card) => (
          <article
            key={card.id}
            className={`conflict-resolver__parallel-card ${
              selectedCardId === card.id ? 'conflict-resolver__parallel-card--selected' : ''
            }`}
            role="button"
            tabIndex={timerDone ? 0 : -1}
            aria-pressed={selectedCardId === card.id}
            onClick={() => {
              if (!timerDone) return;
              setSelectedCardId(card.id);
            }}
            onKeyDown={(event) => {
              if (!timerDone) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedCardId(card.id);
              }
            }}
          >
            <h4>{card.title}</h4>
            <p>{card.text}</p>
            {card.toneSoftened ? (
              <div className="conflict-resolver__softened-note">
                <p>Tone softened for shared clarity.</p>
                {card.moderationNotes?.length ? (
                  <ul>
                    {card.moderationNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {annotations[card.id] ? (
              <span className="conflict-resolver__annotation-chip">{annotations[card.id]}</span>
            ) : null}
          </article>
        ))}
      </div>

      {selectedCardId ? (
        <div className="conflict-resolver__annotation-menu" role="group" aria-label="Tag selected summary line">
          <button type="button" className="btn" onClick={() => applyAnnotation('accurate')}>✓ Accurate</button>
          <button type="button" className="btn" onClick={() => applyAnnotation('missing')}>＋ Missing something</button>
          <button type="button" className="btn" onClick={() => applyAnnotation('note')}>💬 Add note</button>
        </div>
      ) : null}

      <div className="conflict-resolver__footer-actions">
        {!timerDone ? (
          <div className="conflict-resolver__pace-controls">
            <p className="conflict-resolver__input-error" role="status" aria-live="polite">
              Reactions unlock in {remainingSeconds}s.
            </p>
            <div className="conflict-resolver__pace-actions">
              <button type="button" className="btn" onClick={requestMoreTime} disabled={extensionsUsed >= 2}>
                Need more time (+15s)
              </button>
              <button type="button" className="btn" onClick={unlockEarly}>
                Unlock now
              </button>
            </div>
          </div>
        ) : null}
        {alignmentReached ? (
          <p className="conflict-resolver__alignment-banner" role="status">
            Alignment reached: all summary cards marked accurate.
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn--primary"
          disabled={!timerDone}
          onClick={() => onComplete('accurate', annotations)}
        >
          This feels accurate
        </button>
        <button
          type="button"
          className="btn"
          disabled={!timerDone}
          onClick={() => onComplete('missing', annotations)}
        >
          Something feels off
        </button>
      </div>
    </section>
  );
}
