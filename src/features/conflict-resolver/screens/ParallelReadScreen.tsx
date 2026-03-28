import { useEffect, useState } from 'react';
import { TimerCircle } from '../components/TimerCircle';

type SummaryCard = {
  id: string;
  title: string;
  text: string;
};

type HighlightAction = 'accurate' | 'missing' | 'note';

type ParallelReadScreenProps = {
  summaryCards: readonly SummaryCard[];
  durationSeconds?: number;
  onComplete: (decision: 'accurate' | 'missing', annotations: Record<string, HighlightAction>) => void;
};

export function ParallelReadScreen({ summaryCards, durationSeconds = 45, onComplete }: ParallelReadScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, HighlightAction>>({});

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

  const applyAnnotation = (action: HighlightAction) => {
    if (!selectedCardId) return;
    setAnnotations((prev) => ({ ...prev, [selectedCardId]: action }));
    setSelectedCardId(null);
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
            onClick={() => setSelectedCardId(card.id)}
          >
            <h4>{card.title}</h4>
            <p>{card.text}</p>
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
