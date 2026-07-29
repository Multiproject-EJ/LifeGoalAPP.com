import { useMemo, useState } from 'react';
import type {
  CompassAnswerValue,
  CompassBookActivityDefinition,
} from '../types';

type FlightMomentKind = 'log' | 'engine' | 'power' | 'radar' | 'route' | 'launch';

type FlightMomentDefinition = {
  callSign: string;
  title: string;
  story: string;
  action: string;
  kind: FlightMomentKind;
};

const FLIGHT_MOMENTS: Record<number, FlightMomentDefinition> = {
  1: { callSign: 'LOG 01', title: 'Recover a successful flight', story: 'Pull one journey from the archive that stayed airborne longer than expected.', action: 'Open flight log', kind: 'log' },
  2: { callSign: 'LOG 02', title: 'Inspect the abandoned craft', story: 'The black box can show where energy, timing or support disappeared.', action: 'Read black box', kind: 'log' },
  3: { callSign: 'COMPARE', title: 'Overlay both trajectories', story: 'Place the two routes together and find the small difference that changed the outcome.', action: 'Overlay routes', kind: 'route' },
  4: { callSign: 'IGNITION', title: 'Choose your start engine', story: 'Turn the key on the kind of beginning your brain is most willing to trust.', action: 'Prime ignition', kind: 'engine' },
  5: { callSign: 'FIRST MOVE', title: 'Reduce launch resistance', story: 'The first movement should be small enough that the craft begins before fear votes.', action: 'Clear the clamps', kind: 'engine' },
  6: { callSign: 'T–MINUS', title: 'Set the ignition cue', story: 'Attach launch to a moment that already exists in your real day.', action: 'Arm the timer', kind: 'engine' },
  7: { callSign: 'THRUSTER', title: 'Find your sustaining force', story: 'Select the feedback that keeps the engine warm after novelty fades.', action: 'Test thruster', kind: 'engine' },
  8: { callSign: 'PAYLOAD', title: 'Lock in the real habit', story: 'This is the human action the whole control panel is being built to protect.', action: 'Secure payload', kind: 'engine' },
  9: { callSign: 'TELEMETRY', title: 'Make completion visible', story: 'Mission Control needs one signal that clearly says the action happened.', action: 'Check telemetry', kind: 'power' },
  10: { callSign: 'LOW POWER', title: 'Build the busy-day engine', story: 'A smaller engine keeps direction when the day cannot support full thrust.', action: 'Charge small cell', kind: 'power' },
  11: { callSign: 'RESERVE', title: 'Protect emergency power', story: 'The minimum version is enough to keep identity and direction alive on a hard day.', action: 'Seal reserve cell', kind: 'power' },
  12: { callSign: 'RETURN', title: 'Program automatic re-entry', story: 'A missed day becomes a known orbit, not an invitation to disappear.', action: 'Plot return arc', kind: 'route' },
  13: { callSign: 'RADAR', title: 'Locate the earliest warning', story: 'Catch drift while it is still a quiet signal rather than a full emergency.', action: 'Sweep for signal', kind: 'radar' },
  14: { callSign: 'RESPONSE', title: 'Choose the gentle correction', story: 'Pre-decide what the cockpit does when your warning light turns on.', action: 'Open response card', kind: 'radar' },
  15: { callSign: 'SHIELDS', title: 'Select an environment rule', story: 'The ship should make useful actions visible and protect them from friction.', action: 'Raise shield', kind: 'power' },
  16: { callSign: 'HANGAR', title: 'Change one physical detail', story: 'A small environmental change can do work that motivation should not have to do.', action: 'Prepare hangar', kind: 'power' },
  17: { callSign: 'RECOVERY', title: 'Plot a route home', story: 'A break is navigable when the return path already exists.', action: 'Trace recovery route', kind: 'route' },
  18: { callSign: 'LIFE SUPPORT', title: 'Protect what the quest must not harm', story: 'No mission is a success if it burns the life system carrying the player.', action: 'Lock life support', kind: 'power' },
  19: { callSign: 'NAVIGATION', title: 'Choose one weekly bearing', story: 'A short recurring question keeps the ship pointed toward the life you meant to build.', action: 'Align the stars', kind: 'route' },
  20: { callSign: 'FINAL CHECK', title: 'Seal the flight principle', story: 'Name how you begin, reduce, recover and continue — then clear the tower.', action: 'Run launch check', kind: 'launch' },
};

function displayValue(
  activity: CompassBookActivityDefinition,
  values: Record<string, CompassAnswerValue | undefined>,
): string | null {
  for (const block of activity.blocks) {
    const value = values[block.questionId];
    if (!value) continue;
    if (value.kind === 'text' && value.text.trim()) return value.text.trim();
    if (value.kind === 'choice' || value.kind === 'emotion') {
      return block.options?.find((option) => option.id === value.optionId)?.label ?? value.optionId;
    }
    if (value.kind === 'multi_choice') {
      return value.optionIds
        .map((id) => block.options?.find((option) => option.id === id)?.label ?? id)
        .join(' · ');
    }
    if (value.kind === 'scale') return `${value.value} / ${block.max ?? 10}`;
    if (value.kind === 'confirmation' && value.confirmed) return 'Flight check confirmed';
  }
  return null;
}

function FlightVisual({
  kind,
  active,
  answered,
}: {
  kind: FlightMomentKind;
  active: boolean;
  answered: boolean;
}) {
  return (
    <div
      className={`playbook-flight-moment__visual playbook-flight-moment__visual--${kind}${active ? ' is-active' : ''}${answered ? ' is-answered' : ''}`}
      aria-hidden="true"
    >
      {kind === 'log' ? (
        <>
          <span className="playbook-flight-moment__log-sheet" />
          <span className="playbook-flight-moment__log-line" />
          <span className="playbook-flight-moment__log-line" />
          <span className="playbook-flight-moment__log-seal">✦</span>
        </>
      ) : null}
      {kind === 'engine' ? (
        <>
          <span className="playbook-flight-moment__engine-ring" />
          <span className="playbook-flight-moment__engine-core">⚡</span>
          <span className="playbook-flight-moment__engine-meter"><i /></span>
        </>
      ) : null}
      {kind === 'power' ? (
        <>
          <span className="playbook-flight-moment__battery">
            <i /><i /><i /><i />
          </span>
          <span className="playbook-flight-moment__power-label">RESERVE</span>
        </>
      ) : null}
      {kind === 'radar' ? (
        <>
          <span className="playbook-flight-moment__radar-ring" />
          <span className="playbook-flight-moment__radar-ring" />
          <span className="playbook-flight-moment__radar-sweep" />
          <span className="playbook-flight-moment__radar-blip" />
        </>
      ) : null}
      {kind === 'route' ? (
        <>
          <svg viewBox="0 0 160 90" preserveAspectRatio="none">
            <path d="M12 70C35 70 36 20 66 28C91 34 90 72 119 58C137 50 139 26 151 18" />
            <circle cx="12" cy="70" r="4" />
            <circle cx="66" cy="28" r="4" />
            <circle cx="119" cy="58" r="4" />
            <circle cx="151" cy="18" r="5" />
          </svg>
          <span className="playbook-flight-moment__route-craft">➤</span>
        </>
      ) : null}
      {kind === 'launch' ? (
        <>
          <span className="playbook-flight-moment__launch-stars">✦ · ✧ · ✦</span>
          <span className="playbook-flight-moment__launch-rocket">▲</span>
          <span className="playbook-flight-moment__launch-flame" />
          <span className="playbook-flight-moment__launch-horizon" />
        </>
      ) : null}
    </div>
  );
}

export function PersonalPlaybookFlightMoment({
  activity,
  values,
}: {
  activity: CompassBookActivityDefinition;
  values: Record<string, CompassAnswerValue | undefined>;
}) {
  const moment = FLIGHT_MOMENTS[activity.order];
  const [active, setActive] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const answer = useMemo(() => displayValue(activity, values), [activity, values]);

  if (!moment) return null;
  const opensCard = activity.order === 13 || activity.order === 14;

  return (
    <section
      className={`playbook-flight-moment${active ? ' is-active' : ''}${answer ? ' is-answered' : ''}`}
      aria-label={`${moment.callSign}: ${moment.title}`}
    >
      <div className="playbook-flight-moment__copy">
        <span>{moment.callSign}</span>
        <h3>{moment.title}</h3>
        <p>{moment.story}</p>
      </div>
      <FlightVisual kind={moment.kind} active={active} answered={Boolean(answer)} />
      <button
        type="button"
        className="playbook-flight-moment__action"
        onClick={() => {
          setActive(true);
          if (opensCard) setShowCard(true);
        }}
      >
        <span aria-hidden="true">{active ? '✓' : '✦'}</span>
        {active ? 'Console ready' : moment.action}
      </button>
      <div className="playbook-flight-moment__signal" aria-live="polite">
        <small>{answer ? 'Signal received' : 'Awaiting your answer below'}</small>
        <strong>{answer ?? '—'}</strong>
      </div>

      {showCard ? (
        <div className="playbook-flight-moment__popup" role="dialog" aria-modal="false" aria-label="Warning radar detail">
          <button type="button" onClick={() => setShowCard(false)} aria-label="Close radar card">✕</button>
          <span aria-hidden="true">⌁</span>
          <small>RADAR CONTACT</small>
          <h4>{activity.order === 13 ? 'A warning is useful information' : 'Correction route armed'}</h4>
          <p>
            {activity.order === 13
              ? 'Notice the first quiet signal. You do not need to wait for a crisis before making the mission smaller or kinder.'
              : 'When this signal appears, follow the response you choose below. No debate is required in the difficult moment.'}
          </p>
        </div>
      ) : null}
    </section>
  );
}
