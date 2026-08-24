import { useMemo, useState } from 'react';
import { PLAYBOOK_LABELS } from '../../content/chapter6PersonalPlaybook';
import { calculatePersonalPlaybookMission } from '../../logic/personalPlaybookMission';
import type { PersonalPlaybookOutput } from '../../logic/projectors/personalPlaybookProjector';
import type { CompassAnswerRecord } from '../../types';

export type PersonalPlaybookGraphicProps = {
  output: PersonalPlaybookOutput;
  answers: readonly CompassAnswerRecord[];
  mode: 'compact' | 'full';
};

type FlightSystem = {
  id: string;
  glyph: string;
  label: string;
  value: string;
  ready: boolean;
  story: string;
};

function labelOf(id: string | null): string {
  if (!id) return 'Waiting for calibration';
  return PLAYBOOK_LABELS[id] ?? id;
}

function readingLabel(status: PersonalPlaybookOutput['readingStatus']): string {
  if (status === 'trial-ready') return 'Flight test ready';
  if (status === 'evidence-backed') return 'Evidence-backed system';
  return 'System under calibration';
}

/**
 * The Personal Playbook is presented as a seven-system rocket cockpit.
 *
 * Every answered system illuminates a control. Completing all seven launches
 * the little ship out of orbit whenever the player is ready. In full mode the
 * controls are interactive: tapping one opens its own pop-up flight card.
 */
export function PersonalPlaybookGraphic({
  output,
  answers,
  mode,
}: PersonalPlaybookGraphicProps) {
  const systems: FlightSystem[] = [
    {
      id: 'start',
      glyph: '⚡',
      label: 'Start Engine',
      value: labelOf(output.startEngineId),
      ready: output.startEngineId != null,
      story: 'The ignition sequence that helps you begin before doubt can take the controls.',
    },
    {
      id: 'momentum',
      glyph: '✦',
      label: 'Momentum Thruster',
      value: labelOf(output.momentumLoopId),
      ready: output.momentumLoopId != null,
      story: 'The steady force that keeps the mission moving after the first burst of energy.',
    },
    {
      id: 'minimum',
      glyph: '◒',
      label: 'Minimum Power',
      value: output.habitMinimum ?? 'Waiting for calibration',
      ready: output.habitMinimum != null,
      story: 'A tiny reserve engine for hard days. It keeps the craft alive without demanding a perfect streak.',
    },
    {
      id: 'warning',
      glyph: '⌁',
      label: 'Warning Radar',
      value: labelOf(output.warningLightId),
      ready: output.warningLightId != null,
      story: 'Your earliest signal that the flight is drifting, caught while a gentle correction still works.',
    },
    {
      id: 'environment',
      glyph: '⬡',
      label: 'Environment Shield',
      value: labelOf(output.envRuleId),
      ready: output.envRuleId != null,
      story: 'A protective field that makes the helpful action easier and distractions a little harder.',
    },
    {
      id: 'recovery',
      glyph: '↺',
      label: 'Recovery Route',
      value: labelOf(output.recoveryRouteId),
      ready: output.recoveryRouteId != null,
      story: 'The plotted route home after a miss, detour or long break — without shame or lost progress.',
    },
    {
      id: 'weekly',
      glyph: '⌖',
      label: 'Weekly Navigation',
      value: labelOf(output.weeklyCheckId),
      ready: output.weeklyCheckId != null,
      story: 'One recurring navigation check that keeps your life, habits and destination aligned.',
    },
  ];

  const mission = useMemo(
    () => calculatePersonalPlaybookMission({
      systemReady: systems.map((system) => system.ready),
      answers,
    }),
    [answers, output],
  );
  const { readyCount, launched } = mission;
  const [activeSystemId, setActiveSystemId] = useState<string | null>(null);
  const activeSystem = systems.find((system) => system.id === activeSystemId) ?? null;

  const missionStatus = launched
    ? 'ORBIT CLEARED'
    : readyCount === 0
      ? 'NO COUNTDOWN · BEGIN WITH ANY USEFUL SYSTEM'
      : 'ASSEMBLE AT YOUR OWN PACE · PROGRESS IS SAFE';

  return (
    <div
      className={`compass-wheel compass-wheel--${mode} playbook-mission${launched ? ' playbook-mission--launched' : ''}`}
    >
      <div className="playbook-mission__brief">
        <span className="playbook-mission__brief-kicker">Mission · Break Orbit</span>
        <strong>{readyCount} / {systems.length} flight systems online</strong>
        <span>{missionStatus}</span>
      </div>
      <p className="compass-wheel__proof compass-wheel__proof--dark">
        <strong>{readingLabel(output.readingStatus)}</strong>
        <span>{output.evidenceCount} real-life signals recorded</span>
      </p>

      <svg
        viewBox="0 0 260 172"
        role="img"
        aria-label={`Personal Playbook rocket control panel. ${readyCount} of ${systems.length} systems ready.`}
        className="compass-wheel__svg compass-wheel__svg--wide playbook-mission__cockpit"
      >
        <defs>
          <radialGradient id="playbook-space" cx="50%" cy="18%" r="90%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="52%" stopColor="#eef8fb" />
            <stop offset="100%" stopColor="#d8ebf1" />
          </radialGradient>
          <linearGradient id="playbook-earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fddec" />
            <stop offset="42%" stopColor="#4da4c4" />
            <stop offset="100%" stopColor="#265d83" />
          </linearGradient>
          <linearGradient id="playbook-rocket" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff9dd" />
            <stop offset="46%" stopColor="#b9d8ea" />
            <stop offset="100%" stopColor="#537797" />
          </linearGradient>
          <filter id="playbook-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="3" y="3" width="254" height="166" rx="19" fill="url(#playbook-space)" stroke="#b8862d" strokeWidth="2" />
        <g className="playbook-mission__stars" fill="#5188a3">
          <circle cx="25" cy="25" r="1" /><circle cx="54" cy="15" r="0.8" />
          <circle cx="214" cy="24" r="1.2" /><circle cx="238" cy="53" r="0.7" />
          <circle cx="196" cy="76" r="0.8" /><circle cx="64" cy="68" r="0.65" />
          <path d="M92 19h8M96 15v8M177 35h7M180.5 31.5v7" stroke="#ffe598" strokeWidth="1" />
        </g>

        <g className="playbook-mission__orbit" fill="none" stroke="rgba(52,130,163,.34)">
          <ellipse cx="130" cy="113" rx="90" ry="43" strokeDasharray="3 5" />
          <ellipse cx="130" cy="113" rx="65" ry="30" strokeDasharray="2 6" />
        </g>

        {systems.map((system, index) => {
          const angle = (-150 + index * 50) * (Math.PI / 180);
          const x = 130 + Math.cos(angle) * 98;
          const y = 88 + Math.sin(angle) * 59;
          return (
            <g key={system.id} className={system.ready ? 'playbook-mission__node playbook-mission__node--ready' : 'playbook-mission__node'}>
              <line x1="130" y1="87" x2={x} y2={y} stroke={system.ready ? '#2396b3' : '#8aa4b2'} strokeWidth="1" opacity="0.6" />
              <circle cx={x} cy={y} r="11" fill={system.ready ? '#d8f4ef' : '#f5f0df'} stroke={system.ready ? '#258d84' : '#9a8652'} strokeWidth="1.4" />
              <text x={x} y={y + 3.5} textAnchor="middle" fill={system.ready ? '#17645e' : '#6b7780'} fontSize="10">{system.glyph}</text>
            </g>
          );
        })}

        <g className="playbook-mission__rocket" filter="url(#playbook-glow)">
          <path d="M130 45C143 57 148 75 145 99L130 109L115 99C112 75 117 57 130 45Z" fill="url(#playbook-rocket)" stroke="#e7f7ff" strokeWidth="1.3" />
          <circle cx="130" cy="74" r="7" fill="#2d739d" stroke="#d9f6ff" strokeWidth="1.4" />
          <path d="M115 86L104 104L116 100M145 86L156 104L144 100" fill="#b78730" stroke="#ffe89a" strokeWidth="1" />
          <path className="playbook-mission__flame" d="M121 103C123 122 127 130 130 140C133 130 138 121 139 103Z" fill={launched ? '#9af3ff' : readyCount > 0 ? '#ffbf47' : '#53657d'} />
          <path className="playbook-mission__flame-core" d="M126 104C127 116 129 121 130 127C132 120 134 114 134 104Z" fill="#fff5ad" />
        </g>

        <path d="M7 151Q130 114 253 151V169H7Z" fill="url(#playbook-earth)" />
        <path d="M7 151Q130 114 253 151" fill="none" stroke="#b6f2ff" strokeWidth="2.2" opacity="0.8" />
        <text x="130" y="163" textAnchor="middle" fill="#f8fdff" fontSize="7.5" fontWeight="800" letterSpacing="1.3">
          {launched ? 'ESCAPE VELOCITY ACHIEVED' : 'BUILD YOUR ESCAPE VELOCITY'}
        </text>
      </svg>

      <div className="playbook-mission__controls" aria-label="Rocket flight systems">
        {systems.slice(0, mode === 'compact' ? 4 : systems.length).map((system) => (
          <button
            key={system.id}
            type="button"
            className={`playbook-mission__control${system.ready ? ' playbook-mission__control--ready' : ''}`}
            onClick={() => setActiveSystemId(system.id)}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">{system.glyph}</span>
            <span>
              <small>{system.label}</small>
              <strong>{system.value}</strong>
            </span>
            <i aria-hidden="true">{system.ready ? 'ON' : 'OFF'}</i>
          </button>
        ))}
      </div>

      {mode === 'full' && activeSystem ? (
        <div
          className="playbook-mission__system-popover"
          role="dialog"
          aria-modal="false"
          aria-label={`${activeSystem.label} flight system`}
        >
          <button
            type="button"
            className="playbook-mission__system-close"
            onClick={() => setActiveSystemId(null)}
            aria-label="Close flight system"
          >
            ✕
          </button>
          <span className="playbook-mission__system-glyph" aria-hidden="true">{activeSystem.glyph}</span>
          <p>Flight system</p>
          <h3>{activeSystem.label}</h3>
          <strong>{activeSystem.value}</strong>
          <span>{activeSystem.story}</span>
        </div>
      ) : null}

      {mode === 'full' ? (
        <p className="playbook-mission__story">
          Your playbook is the ship’s control panel. Bring all seven useful systems online and
          the rocket breaks orbit whenever you are ready — with no countdown or perfect streak.
        </p>
      ) : null}

      {mode === 'full' && output.operatingPrinciple ? (
        <p className="compass-wheel__statement">Flight principle: “{output.operatingPrinciple}”</p>
      ) : null}
      {mode === 'full' && output.warningPlan ? (
        <p className="playbook-mission__story"><strong>Automatic correction:</strong> {output.warningPlan}</p>
      ) : null}
    </div>
  );
}
