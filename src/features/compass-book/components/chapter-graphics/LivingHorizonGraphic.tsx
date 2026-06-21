import { LIVING_HORIZON_LABELS } from '../../content/chapter3LivingHorizon';
import type { LivingHorizonOutput } from '../../logic/projectors/livingHorizonProjector';

export type LivingHorizonGraphicProps = {
  output: LivingHorizonOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return LIVING_HORIZON_LABELS[id] ?? id;
}

/**
 * App-rendered Living Horizon — the Chapter 3 one-page graphic. A stylised
 * panoramic landscape with labelled zones (Sanctuary, Workshop, Gathering Place,
 * Vital Path, Open Gate). Built entirely from structured output.
 */
export function LivingHorizonGraphic({ output, mode }: LivingHorizonGraphicProps) {
  const zones: { emoji: string; label: string; value: string }[] = [
    { emoji: '🏡', label: 'Sanctuary', value: labelOf(output.environmentId) },
    { emoji: '🛠️', label: 'Workshop', value: labelOf(output.workModeId) },
    { emoji: '🤝', label: 'Gathering', value: labelOf(output.socialId) },
    { emoji: '🧭', label: 'Vital Path', value: labelOf(output.challengeId) },
    { emoji: '🌅', label: 'Open Gate', value: labelOf(output.enoughId) },
  ];

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 120" role="img" aria-label="Living Horizon" className="compass-wheel__svg compass-wheel__svg--wide">
        <defs>
          <linearGradient id="horizon-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="220" height="78" fill="url(#horizon-sky)" />
        <circle cx="110" cy="70" r="20" fill="#fcd34d" opacity="0.85" />
        {/* hills */}
        <path d="M0 78 Q 55 52 110 70 T 220 64 L220 120 L0 120 Z" fill="#0f3d2e" opacity="0.9" />
        <path d="M0 92 Q 70 74 140 88 T 220 84 L220 120 L0 120 Z" fill="#0b2a22" />
        {/* zone markers along the path */}
        {zones.map((zone, i) => {
          const x = 24 + i * 43;
          const y = 96;
          return (
            <text key={zone.label} x={x} y={y} textAnchor="middle" className="compass-wheel__marker">
              {zone.emoji}
            </text>
          );
        })}
      </svg>

      <div className="compass-wheel__mechanics">
        {zones.map((zone) => (
          <span key={zone.label} className="compass-wheel__mechanic">
            <span aria-hidden="true">{zone.emoji}</span>
            <span className="compass-wheel__mechanic-label">{zone.label}</span>
            <span className="compass-wheel__mechanic-area">{zone.value}</span>
          </span>
        ))}
      </div>

      {mode === 'full' ? (
        <>
          <div className="compass-wheel__mechanics">
            <span className="compass-wheel__mechanic">
              <span aria-hidden="true">⏳</span>
              <span className="compass-wheel__mechanic-label">Rhythm</span>
              <span className="compass-wheel__mechanic-area">{labelOf(output.desiredRhythmId)}</span>
            </span>
            <span className="compass-wheel__mechanic">
              <span aria-hidden="true">🚫</span>
              <span className="compass-wheel__mechanic-label">Won't pay</span>
              <span className="compass-wheel__mechanic-area">{labelOf(output.priceNotPaidId)}</span>
            </span>
          </div>
          {output.antiVisionId ? (
            <p className="compass-wheel__next">
              <strong>Anti-vision:</strong> {labelOf(output.antiVisionId)}
            </p>
          ) : null}
          {output.horizonStatement ? (
            <p className="compass-wheel__statement">“{output.horizonStatement}”</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
