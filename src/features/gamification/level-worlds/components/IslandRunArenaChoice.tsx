import { useMemo, useState, type CSSProperties } from 'react';
import {
  ARENA_GAME_CATALOG,
  loadRecentArenaGameIds,
  recordRecentArenaGame,
  selectArenaGamePair,
  type ArenaGameDefinition,
  type ArenaGameId,
} from '../services/islandRunArenaCatalog';
import type { ArenaMinigamePreferences } from '../services/islandRunArenaPreferences';
import type { EventId } from '../services/islandRunEventEngine';
import { EVENT_MINIGAME_REWARD_BAR_PROGRESS } from '../services/islandRunContractV2RewardBar';
import './IslandRunArenaChoice.css';

interface IslandRunArenaChoiceProps {
  allowedGameIds: readonly ArenaGameId[];
  playerKey: string;
  islandNumber: number;
  activeEventId: EventId | null;
  activeEventRuntimeId: string | null;
  preferences: ArenaMinigamePreferences;
  tickets: number;
  activeEventName: string;
  activeEventIcon: string;
  eventTicketIcon?: string;
  rewardProgress: number;
  rewardThreshold: number;
  nextRewardIcon: string;
  nextRewardLabel: string;
  onLaunch: (gameId: ArenaGameId) => void;
  onTune?: () => void;
  /** Games whose journey is already finished for this event: never offered, so a
   * completed game can never trap the stadium. They return with the next event. */
  finishedGameIds?: readonly ArenaGameId[];
  /** Human countdown until the next event (and the finished games' new season). */
  nextEventLabel?: string;
  /** Verified-dev only: rotate to the next timed event now. */
  onDevSkipEvent?: () => void;
}

function ArenaChoiceMiniature({ game }: { game: ArenaGameDefinition }) {
  if (game.id === 'crystal_miners') {
    return <img src="/assets/event-games/crystal-miners/cover.svg" alt="" style={{height:94,width:'100%',objectFit:'contain'}}/>;
  }
  if (game.id === 'lucky_spin') {
    return <span className="arena-choice__miniature arena-choice__miniature--wheel" aria-hidden="true"><i /><i /><b>✦</b></span>;
  }
  if (game.id === 'concord_categories') {
    return <span className="arena-choice__miniature arena-choice__miniature--links" aria-hidden="true"><i>NOVA</i><i>ORBIT</i><i>PULSE</i><i>BEACON</i></span>;
  }
  if (game.id === 'lexicon_relay') {
    return <span className="arena-choice__miniature arena-choice__miniature--words" aria-hidden="true"><i>COLD</i><b>→</b><i>CORD</i><b>→</b><i>WARM</i></span>;
  }
  if (game.id === 'signal_path') {
    return <span className="arena-choice__miniature arena-choice__miniature--path" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index}>{index === 0 ? '1' : index === 4 ? '2' : index === 8 ? '3' : ''}</i>)}</span>;
  }
  if (game.id === 'twin_sigils') {
    return <span className="arena-choice__miniature arena-choice__miniature--sigils" aria-hidden="true"><i>✦</i><b>◐</b><b>◐</b><i>✦</i></span>;
  }
  if (game.id === 'space_excavator') {
    return <span className="arena-choice__miniature arena-choice__miniature--excavator" aria-hidden="true"><i /><i>◇</i><i /><i /><i /><i>✦</i><i /><i /><i /></span>;
  }
  if (game.id === 'companion_feast') {
    return <span className="arena-choice__miniature arena-choice__miniature--feast" aria-hidden="true"><i>●</i><i>●</i><b>◆</b><i>●</i><i>●</i></span>;
  }
  if (game.id === 'momentum_matrix') {
    return <span className="arena-choice__miniature arena-choice__miniature--matrix" aria-hidden="true"><i>⌜</i><i>━</i><i>┛</i><i>┃</i><i>✦</i><i>┃</i></span>;
  }
  if (game.id === 'journey_disc_arena') {
    return <span className="arena-choice__miniature arena-choice__miniature--disc-arena" aria-hidden="true"><i>◉</i><b>⚡</b><i>◉</i><i>◉</i></span>;
  }
  return <span className="arena-choice__miniature arena-choice__miniature--workshop" aria-hidden="true"><i /><i /><i /><b>✦</b></span>;
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
      aria-label={`Play ${props.game.displayName}. ${props.game.familyLabel}. ${props.game.id === 'crystal_miners' ? 'Requires an event ticket. One event ticket per drop.' : props.game.id === 'journey_disc_arena' ? 'Choose one to four event-ticket weapon discs.' : 'Costs one event ticket.'}`}
    >
      <span className="arena-choice__glow" aria-hidden="true" />
      <span className="arena-choice__icon" aria-hidden="true">{props.game.icon}</span>
      {props.game.isNew ? <b className="arena-choice__new">New</b> : null}
      <small>{props.game.familyLabel} · {props.game.estimatedSeconds[0]}–{props.game.estimatedSeconds[1]} sec</small>
      <strong>{props.game.displayName}</strong>
      <ArenaChoiceMiniature game={props.game} />
      <p>{props.game.description}</p>
      <span className="arena-choice__cost"><i>{props.game.id === 'crystal_miners' ? 'Open workshop' : 'Play'}</i> · {props.game.id === 'crystal_miners' ? '1 🎟️ per drop' : props.game.id === 'journey_disc_arena' ? '1–4 ◉' : '1 🎟️'}</span>
    </button>
  );
}

export function IslandRunArenaChoice(props: IslandRunArenaChoiceProps) {
  const [recent, setRecent] = useState(() => loadRecentArenaGameIds(props.playerKey));
  const pair = useMemo(() => selectArenaGamePair({
    allowedGameIds: props.allowedGameIds,
    islandNumber: props.islandNumber,
    activeEventId: props.activeEventId,
    rankedGameIds: props.preferences.rankedEventIds,
    disabledGameIds: [...props.preferences.disabledEventIds, ...(props.finishedGameIds ?? [])],
    recentGameIds: recent,
    seed: `${props.activeEventRuntimeId ?? 'no-event'}:${props.islandNumber}:${recent.join(',')}`,
  }), [props.allowedGameIds, props.activeEventId, props.activeEventRuntimeId, props.islandNumber, props.preferences, props.finishedGameIds, recent]);
  const finishedGames = (props.finishedGameIds ?? []).filter((id) => props.allowedGameIds.includes(id));

  const choose = (gameId: ArenaGameId) => {
    setRecent(recordRecentArenaGame(props.playerKey, gameId));
    props.onLaunch(gameId);
  };
  const progressPercent = props.rewardThreshold > 0
    ? Math.max(0, Math.min(100, (props.rewardProgress / props.rewardThreshold) * 100))
    : 0;

  return (
    <section className="arena-choice" aria-labelledby="arena-choice-title">
      <div className="arena-choice__event">
        <div className="arena-choice__event-heading">
          <span><b aria-hidden="true">{props.activeEventIcon}</b>{props.activeEventName}</span>
          <strong>{props.tickets} {props.eventTicketIcon ?? '🎟️'}</strong>
        </div>
        <div
          className="arena-choice__event-track"
          role="progressbar"
          aria-label={`${props.activeEventName} reward progress`}
          aria-valuenow={Math.floor(props.rewardProgress)}
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.floor(props.rewardThreshold))}
        >
          <i style={{ width: `${progressPercent}%` }} />
          <b>{Math.floor(props.rewardProgress)} / {Math.floor(props.rewardThreshold)}</b>
        </div>
        <small>Next: {props.nextRewardIcon} {props.nextRewardLabel}</small>
      </div>
      <div className="arena-choice__heading">
        <div>
          <span>Host challenge</span>
          <h3 id="arena-choice-title">Choose your Arena game</h3>
          <p>{pair.alternative ? 'Choose an introduced game.' : pair.primary ? 'Your first Arena game.' : 'Meet your next game in the catalogue.'}</p>
        </div>
        {props.onTune && <button type="button" onClick={props.onTune}>Tune</button>}
      </div>
      <div className="arena-choice__cards">
        {pair.primary && <ArenaChoiceCard game={pair.primary} tickets={props.tickets} onChoose={() => choose(pair.primary!.id)} />}
        {pair.alternative && <><span className="arena-choice__or" aria-hidden="true">or</span>
          <ArenaChoiceCard game={pair.alternative} tickets={props.tickets} onChoose={() => choose(pair.alternative!.id)} /></>}
      </div>
      {finishedGames.length > 0 && (
        <div className="arena-choice__finished" role="status">
          {finishedGames.map((id) => {
            const game = ARENA_GAME_CATALOG.find((entry) => entry.id === id);
            return game ? <span key={id}><b aria-hidden="true">{game.icon}</b> {game.displayName} <strong>Completed ✓</strong></span> : null;
          })}
          <small>{props.nextEventLabel ? `New season with the next event · ${props.nextEventLabel}` : 'New season with the next event'}</small>
          {props.onDevSkipEvent && <button type="button" onClick={props.onDevSkipEvent}>Dev · skip to next event</button>}
        </div>
      )}
      {!finishedGames.length && props.onDevSkipEvent && (
        <button type="button" className="arena-choice__dev-skip" onClick={props.onDevSkipEvent}>Dev · skip to next event</button>
      )}
      <p className="arena-choice__note">
        {props.tickets > 0
          ? `Complete a challenge: +${EVENT_MINIGAME_REWARD_BAR_PROGRESS} event progress.`
          : 'Earn event tickets from island play to enter a challenge.'}
      </p>
    </section>
  );
}
