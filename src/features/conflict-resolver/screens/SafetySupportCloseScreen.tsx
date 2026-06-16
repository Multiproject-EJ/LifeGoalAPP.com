type SafetySupportCloseScreenProps = {
  onFinish: () => void;
};

export function SafetySupportCloseScreen({ onFinish }: SafetySupportCloseScreenProps) {
  return (
    <section className="conflict-resolver__screen conflict-resolver__screen--safety-close" aria-labelledby="safety-support-close-title">
      <header className="conflict-resolver__header">
        <p className="conflict-resolver__eyebrow">Safety first</p>
        <h3 id="safety-support-close-title" className="conflict-resolver__title">Support plan saved</h3>
        <p className="conflict-resolver__subtitle">
          This does not need to become a shared plan right now. Your next step is to focus on safety, support, and what you can control.
        </p>
      </header>

      <div className="conflict-resolver__safety-close-card" role="status" aria-live="polite">
        <h4>Keep the next step small</h4>
        <p>
          Choose one grounded action: contact trusted support, step away if you need distance, or keep your plan private until you feel steadier.
        </p>
      </div>

      <button type="button" className="btn btn--primary conflict-resolver__primary-cta" onClick={onFinish}>
        Finish
      </button>
    </section>
  );
}
