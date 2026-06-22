import { PLAYBOOK_LABELS } from '../../content/chapter6PersonalPlaybook';
import type { PersonalPlaybookOutput } from '../../logic/projectors/personalPlaybookProjector';

export type PersonalPlaybookGraphicProps = {
  output: PersonalPlaybookOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return PLAYBOOK_LABELS[id] ?? id;
}

/**
 * App-rendered Personal Playbook — the Chapter 6 one-page graphic. A control
 * panel of the seven systems. Built entirely from structured output.
 */
export function PersonalPlaybookGraphic({ output, mode }: PersonalPlaybookGraphicProps) {
  const panels: { emoji: string; label: string; value: string }[] = [
    { emoji: '🔑', label: 'Start Engine', value: labelOf(output.startEngineId) },
    { emoji: '🔁', label: 'Momentum', value: labelOf(output.momentumLoopId) },
    { emoji: '🪫', label: 'Minimum Mode', value: output.habitMinimum ?? '—' },
    { emoji: '🚦', label: 'Warning Light', value: labelOf(output.warningLightId) },
    { emoji: '🧱', label: 'Environment', value: labelOf(output.envRuleId) },
    { emoji: '🧯', label: 'Recovery', value: labelOf(output.recoveryRouteId) },
    { emoji: '🗓️', label: 'Weekly Check', value: labelOf(output.weeklyCheckId) },
  ];

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 120" role="img" aria-label="Personal Playbook" className="compass-wheel__svg compass-wheel__svg--wide">
        <rect x="14" y="14" width="192" height="92" rx="10" fill="rgba(99,102,241,0.12)" stroke="rgba(129,140,248,0.5)" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const x = 30 + (i % 4) * 48;
          const y = 40 + Math.floor(i / 4) * 38;
          const lit =
            [
              output.startEngineId,
              output.momentumLoopId,
              output.habitMinimum,
              output.warningLightId,
              output.envRuleId,
              output.recoveryRouteId,
              output.weeklyCheckId,
            ][i] != null;
          return <circle key={i} cx={x} cy={y} r={9} fill={lit ? '#34d399' : '#475569'} opacity={0.9} />;
        })}
        <text x="110" y="26" textAnchor="middle" className="compass-wheel__hub-title">Operating Panel</text>
      </svg>

      <div className="compass-wheel__mechanics">
        {panels.slice(0, mode === 'compact' ? 4 : 7).map((panel) => (
          <span key={panel.label} className="compass-wheel__mechanic">
            <span aria-hidden="true">{panel.emoji}</span>
            <span className="compass-wheel__mechanic-label">{panel.label}</span>
            <span className="compass-wheel__mechanic-area">{panel.value}</span>
          </span>
        ))}
      </div>

      {mode === 'full' && output.operatingPrinciple ? (
        <p className="compass-wheel__statement">“{output.operatingPrinciple}”</p>
      ) : null}
    </div>
  );
}
