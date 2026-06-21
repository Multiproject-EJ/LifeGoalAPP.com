import { QUEST_FORGE_LABELS } from '../../content/chapter5QuestForge';
import type { QuestForgeOutput } from '../../logic/projectors/questForgeProjector';

export type QuestForgeGraphicProps = {
  output: QuestForgeOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return QUEST_FORGE_LABELS[id] ?? id;
}

/**
 * App-rendered Quest Forge — the Chapter 5 one-page graphic. A central Quest
 * Crest carrying the Primary Quest, ringed by supporting/maintenance/released
 * emblems. Built entirely from structured output.
 */
export function QuestForgeGraphic({ output, mode }: QuestForgeGraphicProps) {
  const cx = 110;
  const cy = 78;

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 150" role="img" aria-label="Quest Forge" className="compass-wheel__svg compass-wheel__svg--wide">
        <defs>
          <radialGradient id="forge-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={62} fill="url(#forge-glow)" opacity={0.5} />
        {/* crest shield */}
        <path
          d={`M ${cx - 34} ${cy - 34} L ${cx + 34} ${cy - 34} L ${cx + 34} ${cy + 10} Q ${cx} ${cy + 46} ${cx - 34} ${cy + 10} Z`}
          fill="rgba(99,102,241,0.25)"
          stroke="rgba(252,211,77,0.8)"
          strokeWidth={2}
        />
        <text x={cx} y={cy - 14} textAnchor="middle" className="compass-wheel__hub-title">
          Primary Quest
        </text>
        <text x={cx} y={cy + 2} textAnchor="middle" className="compass-wheel__crest-title">
          {truncate(output.primaryQuestTitle, 22)}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" className="compass-wheel__label">
          ✦ {labelOf(output.acceptedCostId)} accepted
        </text>
      </svg>

      <div className="compass-wheel__mechanics">
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🔥</span>
          <span className="compass-wheel__mechanic-label">Calling</span>
          <span className="compass-wheel__mechanic-area">{output.callingText ?? '—'}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🎯</span>
          <span className="compass-wheel__mechanic-label">First milestone</span>
          <span className="compass-wheel__mechanic-area">{output.firstMilestone ?? '—'}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🛡️</span>
          <span className="compass-wheel__mechanic-label">Protected Flame</span>
          <span className="compass-wheel__mechanic-area">{output.protectedFlame ?? '—'}</span>
        </span>
        <span className="compass-wheel__mechanic">
          <span aria-hidden="true">🤝</span>
          <span className="compass-wheel__mechanic-label">Supporting</span>
          <span className="compass-wheel__mechanic-area">{output.supportingQuestTitle ?? '—'}</span>
        </span>
      </div>

      {mode === 'full' && output.releasedQuestTitle ? (
        <p className="compass-wheel__next">
          <strong>Released for now:</strong> {output.releasedQuestTitle}
        </p>
      ) : null}
    </div>
  );
}

function truncate(text: string | null, max: number): string {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
