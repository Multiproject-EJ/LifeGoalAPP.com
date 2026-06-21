import { IKIGAI_LABELS } from '../../content/chapter4IkigaiMap';
import type { IkigaiMapOutput } from '../../logic/projectors/ikigaiMapProjector';

export type IkigaiMapGraphicProps = {
  output: IkigaiMapOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return IKIGAI_LABELS[id] ?? id;
}

const FORCES: { key: keyof IkigaiMapOutput; name: string }[] = [
  { key: 'sparkId', name: 'Curiosity' },
  { key: 'giftId', name: 'Capability' },
  { key: 'needId', name: 'Contribution' },
  { key: 'viabilityId', name: 'Viability' },
  { key: 'toleranceId', name: 'Willingness' },
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/**
 * App-rendered Ikigai Map — the Chapter 4 one-page graphic. A five-point
 * constellation of forces (Curiosity, Capability, Contribution, Viability,
 * Willingness) with the chosen Trial glowing at the centre.
 */
export function IkigaiMapGraphic({ output, mode }: IkigaiMapGraphicProps) {
  const cx = 110;
  const cy = 110;
  const r = 80;
  const points = FORCES.map((force, i) => {
    const p = polar(cx, cy, r, (360 / FORCES.length) * i);
    const lit = output[force.key] != null;
    return { ...force, ...p, lit };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label="Ikigai Map" className="compass-wheel__svg">
        <polygon points={polygon} className="compass-wheel__constellation" />
        {points.map((p) => (
          <g key={p.name}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} className="compass-wheel__ray" />
            <circle cx={p.x} cy={p.y} r={p.lit ? 6 : 3} fill={p.lit ? '#fcd34d' : '#475569'} />
            {mode === 'full' ? (
              <text
                x={p.x}
                y={p.y - 9}
                textAnchor="middle"
                className="compass-wheel__label"
              >
                {p.name}
              </text>
            ) : null}
          </g>
        ))}
        <circle cx={cx} cy={cy} r={16} className="compass-wheel__hub" />
        <text x={cx} y={cy + 3} textAnchor="middle" className="compass-wheel__hub-title">
          Trial
        </text>
      </svg>

      <div className="compass-wheel__mechanics">
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">✨</span>
          <span className="compass-wheel__mechanic-label">Spark</span>
          <span className="compass-wheel__mechanic-area">{labelOf(output.sparkId)}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🎁</span>
          <span className="compass-wheel__mechanic-label">Gift</span>
          <span className="compass-wheel__mechanic-area">{labelOf(output.giftId)}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🫶</span>
          <span className="compass-wheel__mechanic-label">Need</span>
          <span className="compass-wheel__mechanic-area">{labelOf(output.needId)}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🧪</span>
          <span className="compass-wheel__mechanic-label">Trial</span>
          <span className="compass-wheel__mechanic-area">{output.trialPath ?? '—'}</span>
        </span>
      </div>

      {output.mirageWarning ? (
        <p className="compass-wheel__warning">
          ⚠️ Mirage warning: you may want the outcome more than the daily work. Test before committing.
        </p>
      ) : null}

      {mode === 'full' ? (
        <>
          {output.trialExperiment ? (
            <p className="compass-wheel__next">
              <strong>Experiment:</strong> {output.trialExperiment}
            </p>
          ) : null}
          {output.ikigaiStatement ? (
            <p className="compass-wheel__statement">“{output.ikigaiStatement}”</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
