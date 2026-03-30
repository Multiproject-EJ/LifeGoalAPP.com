import type { AppSurface } from '../../../surfaces/surfaceContext';
import { getConflictSurfaceConfig, mapRecommendationForSurface } from '../conflictSurfaceConfig';

type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

type InnerNextStepScreenProps = {
  surface?: AppSurface;
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
    aiMode: 'premium' | 'free_quota' | 'fallback';
  } | null;
  onContinue: () => void;
  onUpgrade?: () => void;
};

function formatModeLabel(mode: 'premium' | 'free_quota' | 'fallback'): string {
  if (mode === 'premium') return 'Premium';
  if (mode === 'free_quota') return 'Free';
  return 'Fallback';
}

export function InnerNextStepScreen({
  surface = 'habitgame',
  recommendations,
  guidanceMeta,
  onContinue,
  onUpgrade,
}: InnerNextStepScreenProps) {
  const surfaceConfig = getConflictSurfaceConfig(surface);
  const mappedRecommendations = recommendations.map((item) => mapRecommendationForSurface(item, surface));

  return (
    <section className="conflict-resolver__screen" aria-labelledby="inner-next-step-title">
      <header className="conflict-resolver__header">
        <h3 id="inner-next-step-title" className="conflict-resolver__title">Inner tension, translated into action</h3>
        <p className="conflict-resolver__subtitle">
          {surface === 'peacebetween'
            ? 'Choose one repair-focused next move to continue within Peace Between.'
            : 'Based on your brain-dump, here are focused next steps. Pick one now so this becomes momentum.'}
        </p>
      </header>

      <div className="conflict-resolver__options-grid">
        {mappedRecommendations.map((item) => (
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
            Priority {Math.round(guidanceMeta.priorityScore * 100)}% · Intensity {guidanceMeta.deepMode ? 'Deep' : 'Focused'} · AI {formatModeLabel(guidanceMeta.aiMode)} · Domains {guidanceMeta.usedContextDomains.join(', ')}
          </p>
          {guidanceMeta.guidancePlan.patternLinks.length > 0 ? (
            <div className="conflict-resolver__guidance-why">
              <h4>Why these suggestions</h4>
              <ul>{guidanceMeta.guidancePlan.patternLinks.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
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
          {guidanceMeta.aiMode !== 'premium' ? (
            <aside className="conflict-resolver__upgrade-prompt" aria-label="Upgrade prompt">
              <p>
                {surface === 'peacebetween'
                  ? 'Unlock deeper planning and richer coaching tuned for difficult conversations.'
                  : 'Unlock deeper week/month planning and richer personalization with Premium AI guidance.'}
              </p>
              <a className="btn btn--secondary" href={surfaceConfig.upgradeHref} onClick={onUpgrade}>
                {surfaceConfig.upgradeLabel}
              </a>
            </aside>
          ) : null}
        </article>
      ) : null}

      <button type="button" className="btn conflict-resolver__primary-cta" onClick={onContinue}>
        Save and close
      </button>
    </section>
  );
}
