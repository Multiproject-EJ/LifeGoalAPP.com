import { INNER_COMPASS_LABELS } from '../../content/chapter2InnerCompass';
import type { InnerCompassOutput } from '../../logic/projectors/innerCompassProjector';

export type InnerCompassGraphicProps = {
  output: InnerCompassOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return INNER_COMPASS_LABELS[id] ?? id;
}

/**
 * App-rendered Inner Compass — the Chapter 2 one-page graphic. A four-direction
 * rose: North = True North (value), East = Life Spark (energy), South = essential
 * need, West = Shadow Pull. Built entirely from structured output.
 */
export function InnerCompassGraphic({ output, mode }: InnerCompassGraphicProps) {
  const cx = 110;
  const cy = 110;
  const arms: { dir: string; label: string; value: string; color: string }[] = [
    { dir: 'N', label: 'True North', value: labelOf(output.trueNorthValueId), color: '#a5b4fc' },
    { dir: 'E', label: 'Life Spark', value: labelOf(output.lifeSparkId), color: '#fcd34d' },
    { dir: 'S', label: 'Need', value: labelOf(output.essentialNeedId), color: '#6ee7b7' },
    { dir: 'W', label: 'Shadow Pull', value: labelOf(output.shadowPullId), color: '#fb923c' },
  ];

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label="Inner Compass" className="compass-wheel__svg">
        <circle cx={cx} cy={cy} r={84} className="compass-wheel__rim" />
        <circle cx={cx} cy={cy} r={60} className="compass-wheel__rim" />

        {/* Compass star */}
        <polygon points={`${cx},30 ${cx + 12},${cy} ${cx},${cy + 80} ${cx - 12},${cy}`} fill="#818cf8" opacity={0.85} />
        <polygon points={`30,${cy} ${cx},${cy - 12} ${cx + 80},${cy} ${cx},${cy + 12}`} fill="#38bdf8" opacity={0.7} />
        <circle cx={cx} cy={cy} r={10} className="compass-wheel__hub" />

        {/* Cardinal letters */}
        <text x={cx} y={20} className="compass-wheel__hub-title" textAnchor="middle">N</text>
        <text x={206} y={cy + 4} className="compass-wheel__hub-title" textAnchor="middle">E</text>
        <text x={cx} y={210} className="compass-wheel__hub-title" textAnchor="middle">S</text>
        <text x={14} y={cy + 4} className="compass-wheel__hub-title" textAnchor="middle">W</text>

        {mode === 'full' ? (
          <>
            <text x={cx} y={44} className="compass-wheel__compass-value" textAnchor="middle">{labelOf(output.trueNorthValueId)}</text>
            <text x={cx} y={196} className="compass-wheel__compass-value" textAnchor="middle">{labelOf(output.essentialNeedId)}</text>
            <text x={150} y={cy + 20} className="compass-wheel__compass-value" textAnchor="middle">{labelOf(output.lifeSparkId)}</text>
            <text x={70} y={cy + 20} className="compass-wheel__compass-value" textAnchor="middle">{labelOf(output.shadowPullId)}</text>
          </>
        ) : null}
      </svg>

      <div className="compass-wheel__mechanics">
        {arms.map((arm) => (
          <span key={arm.dir} className="compass-wheel__mechanic">
            <span aria-hidden="true" style={{ color: arm.color }}>◆</span>
            <span className="compass-wheel__mechanic-label">{arm.label}</span>
            <span className="compass-wheel__mechanic-area">{arm.value}</span>
          </span>
        ))}
      </div>

      {mode === 'full' ? (
        <>
          {output.guardianBoundary ? (
            <p className="compass-wheel__next">
              <strong>Guardian Boundary:</strong> {output.guardianBoundary}
            </p>
          ) : null}
          {output.compassStatement ? (
            <p className="compass-wheel__statement">“{output.compassStatement}”</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
