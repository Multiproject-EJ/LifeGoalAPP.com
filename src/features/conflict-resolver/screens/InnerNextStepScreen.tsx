type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

type InnerNextStepScreenProps = {
  recommendations: InnerRecommendation[];
  onContinue: () => void;
};

export function InnerNextStepScreen({ recommendations, onContinue }: InnerNextStepScreenProps) {
  return (
    <section className="conflict-resolver__screen" aria-labelledby="inner-next-step-title">
      <header className="conflict-resolver__header">
        <h3 id="inner-next-step-title" className="conflict-resolver__title">Inner tension, translated into action</h3>
        <p className="conflict-resolver__subtitle">
          Based on your brain-dump, here are focused next steps. Pick one now so this becomes momentum.
        </p>
      </header>

      <div className="conflict-resolver__options-grid">
        {recommendations.map((item) => (
          <article key={item.id} className="conflict-resolver__option-card">
            <h4>{item.title}</h4>
            <p>{item.reason}</p>
            <a className="btn btn--primary" href={item.href}>
              {item.ctaLabel}
            </a>
          </article>
        ))}
      </div>

      <button type="button" className="btn conflict-resolver__primary-cta" onClick={onContinue}>
        Save and close
      </button>
    </section>
  );
}
