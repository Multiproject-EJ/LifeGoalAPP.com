type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

type InnerNextStepScreenProps = {
  recommendations: InnerRecommendation[];
  guidanceMeta?: {
    guidancePlan: {
      insightSummary: string;
      patternLinks: string[];
      riskFlags: string[];
      nowPlan: string[];
      weekPlan: string[];
      monthPlan: string[];
    };
    priorityScore: number;
    deepMode: boolean;
    usedContextDomains: string[];
  } | null;
  onContinue: () => void;
};

export function InnerNextStepScreen({ recommendations, guidanceMeta, onContinue }: InnerNextStepScreenProps) {
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

      {guidanceMeta ? (
        <article className="conflict-resolver__guidance-card" aria-label="Inner guidance snapshot">
          <p className="conflict-resolver__guidance-insight">{guidanceMeta.guidancePlan.insightSummary}</p>
          <p className="conflict-resolver__guidance-meta">
            Priority {Math.round(guidanceMeta.priorityScore * 100)}% · Mode {guidanceMeta.deepMode ? 'Deep' : 'Focused'} · Domains {guidanceMeta.usedContextDomains.join(', ')}
          </p>
          {guidanceMeta.guidancePlan.riskFlags.length > 0 ? (
            <ul className="conflict-resolver__guidance-tags">
              {guidanceMeta.guidancePlan.riskFlags.map((flag) => (
                <li key={flag}>{flag.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          ) : null}
          <div className="conflict-resolver__guidance-plan-grid">
            <div>
              <h4>Now</h4>
              <ul>{guidanceMeta.guidancePlan.nowPlan.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h4>This week</h4>
              <ul>{guidanceMeta.guidancePlan.weekPlan.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h4>This month</h4>
              <ul>{guidanceMeta.guidancePlan.monthPlan.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </article>
      ) : null}

      <button type="button" className="btn conflict-resolver__primary-cta" onClick={onContinue}>
        Save and close
      </button>
    </section>
  );
}
