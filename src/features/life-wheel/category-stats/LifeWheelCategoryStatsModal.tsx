import type { LifeWheelCategoryStatsViewModel, RealmStatDimension } from './lifeWheelCategoryStats';

type LifeWheelCategoryStatsModalProps = {
  viewModel: LifeWheelCategoryStatsViewModel;
  onBack: () => void;
  onClose: () => void;
};

const ACCENT_ICON: Record<RealmStatDimension['accent'], string> = {
  violet: '✺',
  blue: '◎',
  green: '✣',
};

function formatStatScore(score: number | null): string {
  return score === null ? '—' : String(score);
}

function StatCard({ dimension }: { dimension: RealmStatDimension }) {
  const score = dimension.score ?? 0;
  return (
    <section className={`life-wheel-realm-stat life-wheel-realm-stat--${dimension.accent}`}>
      <div className="life-wheel-realm-stat__header">
        <span className="life-wheel-realm-stat__icon" aria-hidden="true">{ACCENT_ICON[dimension.accent]}</span>
        <div>
          <p className="life-wheel-realm-stat__eyebrow">{dimension.eyebrow}</p>
          <h3>{dimension.title}</h3>
        </div>
        <div className="life-wheel-realm-stat__score" aria-label={`${dimension.title} score`}>
          <strong>{formatStatScore(dimension.score)}</strong>
          <span>/100</span>
        </div>
      </div>
      <div className="life-wheel-realm-stat__bar" aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>
      <p className="life-wheel-realm-stat__summary">{dimension.summary}</p>
      <ul className="life-wheel-realm-stat__evidence">
        {dimension.evidence.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function LifeWheelCategoryStatsModal({ viewModel, onBack, onClose }: LifeWheelCategoryStatsModalProps) {
  return (
    <div className="life-wheel-realm__panel life-wheel-realm__panel--stats" role="document">
      <div className="life-wheel-realm__topbar">
        <button type="button" className="life-wheel-realm__round-button" onClick={onBack} aria-label="Back to realm intro">
          ←
        </button>
        <button type="button" className="life-wheel-realm__round-button" onClick={onClose} aria-label="Close realm stats">
          ✕
        </button>
      </div>

      <header className="life-wheel-realm__stats-heading">
        <span className="life-wheel-realm__mini-icon" aria-hidden="true">{viewModel.icon}</span>
        <p>{viewModel.title}</p>
        <h2>Your Life Wheel Stats</h2>
        <div className="life-wheel-realm__chips" aria-label="Realm score summary">
          <span>{viewModel.latestScore === null ? 'No score yet' : `Latest ${viewModel.latestScore}/10`}</span>
          <span>{viewModel.trendLabel}</span>
        </div>
      </header>

      <div className="life-wheel-realm__stat-list">
        {viewModel.dimensions.map((dimension) => (
          <StatCard key={dimension.key} dimension={dimension} />
        ))}
      </div>
    </div>
  );
}
