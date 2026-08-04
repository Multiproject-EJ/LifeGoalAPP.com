import { useMemo, useState, type CSSProperties } from 'react';
import {
  loadRecentArenaGameIds,
  recordRecentArenaGame,
  selectArenaGamePair,
  type ArenaGameDefinition,
  type ArenaGameId,
} from '../services/islandRunArenaCatalog';
import type { ArenaMinigamePreferences } from '../services/islandRunArenaPreferences';
import type { EventId } from '../services/islandRunEventEngine';
import './IslandRunArenaChoice.css';

interface IslandRunArenaChoiceProps {
  playerKey: string;
  islandNumber: number;
  activeEventId: EventId | null;
  activeEventRuntimeId: string | null;
  preferences: ArenaMinigamePreferences;
  tickets: number;
  onLaunch: (gameId: ArenaGameId) => void;
  onTune: () => void;
}

function ArenaChoiceCard(props: {
  game: ArenaGameDefinition;
  tickets: number;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      className="arena-choice__card"
      style={{ '--arena-choice-accent': props.game.accent } as CSSProperties}
      onClick={props.onChoose}
      disabled={props.tickets < 1}
      aria-label={`Play ${props.game.displayName}. ${props.game.familyLabel}. Costs one event ticket.`}
    >
      <span className="arena-choice__glow" aria-hidden="true" />
      <span className="arena-choice__icon" aria-hidden="true">{props.game.icon}</span>
      {props.game.isNew ? <b className="arena-choice__new">New</b> : null}
      <small>{props.game.familyLabel} · {props.game.estimatedSeconds[0]}–{props.game.estimatedSeconds[1]} sec</small>
      <strong>{props.game.displayName}</strong>
      <p>{props.game.description}</p>
      <span className="arena-choice__cost">1 🎟️ <i>Choose</i></span>
    </button>
  );
}

export function IslandRunArenaChoice(props: IslandRunArenaChoiceProps) {
  const [recent, setRecent] = useState(() => loadRecentArenaGameIds(props.playerKey));
  const pair = useMemo(() => selectArenaGamePair({
    activeEventId: props.activeEventId,
    rankedGameIds: props.preferences.rankedEventIds,
    disabledGameIds: props.preferences.disabledEventIds,
    recentGameIds: recent,
    seed: `${props.activeEventRuntimeId ?? 'no-event'}:${props.islandNumber}:${recent.join(',')}`,
  }), [props.activeEventId, props.activeEventRuntimeId, props.islandNumber, props.preferences, recent]);

  const choose = (gameId: ArenaGameId) => {
    setRecent(recordRecentArenaGame(props.playerKey, gameId));
    props.onLaunch(gameId);
  };

  return (
    <section className="arena-choice" aria-labelledby="arena-choice-title">
      <div className="arena-choice__heading">
        <div>
          <span>Host challenge</span>
          <h3 id="arena-choice-title">Choose your Arena game</h3>
        </div>
        <button type="button" onClick={props.onTune}>Tune</button>
      </div>
      <div className="arena-choice__cards">
        <ArenaChoiceCard game={pair.primary} tickets={props.tickets} onChoose={() => choose(pair.primary.id)} />
        <span className="arena-choice__or" aria-hidden="true">or</span>
        <ArenaChoiceCard game={pair.alternative} tickets={props.tickets} onChoose={() => choose(pair.alternative.id)} />
      </div>
      <p className="arena-choice__note">
        {props.tickets > 0
          ? 'Both choices advance the same active event reward channel.'
          : 'Earn an event ticket on the reward bar to enter either challenge.'}
      </p>
    </section>
  );
}
