import './FutureMessageReveal.css';

interface FutureMessageRevealProps {
  message: string;
  isRevealed: boolean;
  revealedAt: string | null;
}

export function FutureMessageReveal({ message, isRevealed, revealedAt }: FutureMessageRevealProps) {
  if (!isRevealed) {
    return (
      <div className="future-message future-message--sealed">
        <span className="future-message__envelope" aria-hidden="true">📩</span>
        <p className="future-message__sealed-text">Your message awaits…</p>
        <p className="future-message__sealed-hint">
          Complete this contract to unseal your letter from the past.
        </p>
      </div>
    );
  }

  const revealDate = revealedAt
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(revealedAt))
    : null;

  return (
    <div className="future-message future-message--revealed">
      <div className="future-message__header">
        <span className="future-message__envelope" aria-hidden="true">💌</span>
        <div>
          <p className="future-message__revealed-label">A message from your past self</p>
          {revealDate && (
            <p className="future-message__date">Unsealed on {revealDate}</p>
          )}
        </div>
      </div>
      <blockquote className="future-message__body">{message}</blockquote>
    </div>
  );
}
