import { HoldButton } from '../components/HoldButton';

type GroundingScreenProps = {
  statementIndex: number;
  statements: readonly string[];
  onNextStatement: () => void;
  onReady: () => void;
};

export function GroundingScreen({
  statementIndex,
  statements,
  onNextStatement,
  onReady,
}: GroundingScreenProps) {
  const isLastStatement = statementIndex >= statements.length - 1;

  return (
    <section className="conflict-resolver__screen" aria-labelledby="conflict-grounding-title">
      <header className="conflict-resolver__header">
        <h3 id="conflict-grounding-title" className="conflict-resolver__title">Quick Grounding</h3>
        <p className="conflict-resolver__subtitle">Read slowly. Understand first.</p>
      </header>

      <div className="conflict-resolver__breathing-orb" aria-hidden="true" />

      <article className="conflict-resolver__statement-card">
        <p>{statements[statementIndex]}</p>
      </article>

      <div className="conflict-resolver__progress-dots" aria-hidden="true">
        {statements.map((_, index) => (
          <span
            key={`grounding-dot-${index}`}
            className={`conflict-resolver__progress-dot ${
              index === statementIndex ? 'conflict-resolver__progress-dot--active' : ''
            }`}
          />
        ))}
      </div>

      {isLastStatement ? (
        <HoldButton label="Hold to continue" durationMs={1800} onComplete={onReady} />
      ) : (
        <button type="button" className="btn btn--primary conflict-resolver__primary-cta" onClick={onNextStatement}>
          Next
        </button>
      )}
    </section>
  );
}
