import { PLAYBOOK_LABELS } from '../../content/chapter6PersonalPlaybook';
import type { PersonalPlaybookOutput } from '../../logic/projectors/personalPlaybookProjector';
import { CompassRose } from '../CompassRose';

export type PersonalPlaybookGraphicProps = {
  output: PersonalPlaybookOutput;
  mode: 'compact' | 'full';
};

function labelOf(id: string | null): string {
  if (!id) return '—';
  return PLAYBOOK_LABELS[id] ?? id;
}

/** App-rendered Chapter 6 seal, built entirely from structured output. */
export function PersonalPlaybookGraphic({ output, mode }: PersonalPlaybookGraphicProps) {
  const panels: { glyph: string; label: string; value: string }[] = [
    { glyph: '✦', label: 'Start Engine', value: labelOf(output.startEngineId) },
    { glyph: '↻', label: 'Momentum', value: labelOf(output.momentumLoopId) },
    { glyph: '◆', label: 'Minimum Mode', value: output.habitMinimum ?? '—' },
    { glyph: '△', label: 'Warning Light', value: labelOf(output.warningLightId) },
    { glyph: '◇', label: 'Environment', value: labelOf(output.envRuleId) },
    { glyph: '⟳', label: 'Recovery', value: labelOf(output.recoveryRouteId) },
    { glyph: '⊙', label: 'Weekly Check', value: labelOf(output.weeklyCheckId) },
  ];

  return (
    <div className={`compass-wheel compass-wheel--${mode} playbook-seal playbook-seal--${mode}`}>
      <div className="playbook-seal__north-star" role="img" aria-label="Passion and Purpose meet at your North Star">
        <span className="playbook-seal__star" aria-hidden="true">✦</span>
        <span className="playbook-seal__star-label">My North Star</span>
        <span className="playbook-seal__stream playbook-seal__stream--passion">
          <span className="playbook-seal__stream-name">Passion</span>
          <span className="playbook-seal__stream-value">{output.passion ?? 'What brings me alive'}</span>
        </span>
        <span className="playbook-seal__stream playbook-seal__stream--purpose">
          <span className="playbook-seal__stream-name">Purpose</span>
          <span className="playbook-seal__stream-value">{output.purpose ?? 'What my energy serves'}</span>
        </span>
        <span className="playbook-seal__compass" aria-hidden="true">
          <CompassRose tone={mode === 'compact' ? 'gilt' : 'ink'} size={mode === 'compact' ? 104 : 132} />
        </span>
      </div>

      {output.northStar ? (
        <blockquote className="playbook-seal__guiding-statement">“{output.northStar}”</blockquote>
      ) : (
        <p className="playbook-seal__guiding-placeholder">Passion + Purpose become your direction.</p>
      )}

      <div className="compass-wheel__mechanics">
        {panels.slice(0, mode === 'compact' ? 4 : 7).map((panel) => (
          <span key={panel.label} className="compass-wheel__mechanic">
            <span className="playbook-seal__mechanic-glyph" aria-hidden="true">{panel.glyph}</span>
            <span className="compass-wheel__mechanic-label">{panel.label}</span>
            <span className="compass-wheel__mechanic-area">{panel.value}</span>
          </span>
        ))}
      </div>

      {mode === 'full' && output.operatingPrinciple ? (
        <p className="compass-wheel__statement">
          <span>How I keep moving</span>
          “{output.operatingPrinciple}”
        </p>
      ) : null}
    </div>
  );
}
