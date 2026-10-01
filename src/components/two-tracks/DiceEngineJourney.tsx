import { useState } from 'react';
import { resolveDiceRegenJourney } from '../../features/gamification/level-worlds/services/islandRunDiceRegeneration';

/**
 * Two Tracks · one climb: how the dice engine (passive dice regeneration) has
 * grown with the player's level so far, and what the next upgrade brings.
 */
export function DiceEngineJourney({ level }: { level: number }) {
  const journey = resolveDiceRegenJourney(level);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="dice-engine-journey" aria-labelledby="dice-engine-journey-title">
      <button
        type="button"
        className="dice-engine-journey__summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="dice-engine-journey__icon" aria-hidden="true">🎲</span>
        <span className="dice-engine-journey__copy">
          <strong id="dice-engine-journey-title">Dice engine · {journey.current.maxDice} dice tank</strong>
          <small>
            +1 dice every {journey.current.regenIntervalMinutes} min
            {journey.maxDiceGainedSinceStart > 0 ? ` · +${journey.maxDiceGainedSinceStart} tank since you started` : ''}
          </small>
        </span>
        <span className="dice-engine-journey__next">
          {journey.next && journey.levelsToNext !== null
            ? <>Lvl {journey.next.minLevel}: <b>{journey.next.maxDice}</b></>
            : <b>Max engine</b>}
        </span>
      </button>
      {expanded ? (
        <ol className="dice-engine-journey__steps">
          {journey.steps.map((step) => (
            <li key={step.minLevel} className={`dice-engine-journey__step dice-engine-journey__step--${step.status}`}>
              <span className="dice-engine-journey__step-level">Lvl {step.minLevel}</span>
              <span className="dice-engine-journey__step-bar" style={{ width: `${Math.round((step.maxDice / 200) * 100)}%` }} aria-hidden="true" />
              <span className="dice-engine-journey__step-value">
                {step.maxDice} dice · {step.regenIntervalMinutes} min
                {step.status === 'current' ? ' · you are here' : step.status === 'next' && journey.levelsToNext !== null ? ` · ${journey.levelsToNext} level${journey.levelsToNext === 1 ? '' : 's'} to go` : ''}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
