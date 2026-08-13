import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  getJourneyDiscArenaFighterStats,
  JOURNEY_DISC_ARENA_OPENING_TICKS,
  JOURNEY_DISC_ARENA_SURGE_READY,
  scoreJourneyDiscArenaRound,
} from '../../level-worlds/services/journeyDiscArenaGame';
import { buildJourneyDiscArenaRewardTrack } from '../../level-worlds/services/journeyDiscArenaProgression';
import type { JourneyDiscArenaProgressEntry } from '../../level-worlds/services/islandRunGameStateStore';
import { JOURNEY_DISC_WEAPON_NAMES, type JourneyDiscArmoryState } from '../../level-worlds/services/journeyDiscArmory';
import { createJourneyDiscArenaPreviewController } from './JourneyDiscArenaPreviewController';
import { triggerIslandRunHaptic } from '../../level-worlds/services/islandRunAudio';
import JourneyDiscArenaStage from './JourneyDiscArenaStage';
import { JourneyDiscArenaAudio } from './journeyDiscArenaAudio';
import './journeyDiscArena.css';

type JourneyDiscArenaLaunchConfig = {
  initialTickets?: number;
  initialProgress?: JourneyDiscArenaProgressEntry | null;
  initialArmory?: JourneyDiscArmoryState | null;
  requestStartRound?: (deployedDiscs: number) => { ok: boolean; roundId: string | null; ticketsRemaining: number; progress: JourneyDiscArenaProgressEntry | null; failureReason?: string };
  requestBankRound?: (payload: { roundId: string; score: number; won: boolean; deployedDiscs: number; guardianTier?: 0 | 1 | 2 | 3 }) => { ok: boolean; progress: JourneyDiscArenaProgressEntry | null; armory?: JourneyDiscArmoryState };
  requestClaimMilestone?: (milestoneId: string) => { ok: boolean; progress: JourneyDiscArenaProgressEntry | null; rewardLabel: string | null; ticketsRemaining: number; armory?: JourneyDiscArmoryState };
  previewPhoneFrame?: boolean;
  islandConcourseIntegration?: boolean;
  integratedIslandNumber?: number;
};

export default function JourneyDiscArenaMinigame({ onComplete, launchConfig }: IslandRunMinigameProps) {
  const config = (launchConfig ?? {}) as JourneyDiscArenaLaunchConfig;
  const controller = useMemo(() => createJourneyDiscArenaPreviewController({
    tickets: config.initialTickets,
    progress: config.initialProgress,
    armory: config.initialArmory,
    requestStartRound: config.requestStartRound,
    requestBankRound: config.requestBankRound,
    requestClaimMilestone: config.requestClaimMilestone,
  }), []);
  const audio = useMemo(() => new JourneyDiscArenaAudio(), []);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => () => {
    controller.dispose();
    audio.dispose();
  }, [audio, controller]);
  useEffect(() => {
    audio.playEvents(snapshot.recentEvents);
    if (snapshot.recentEvents.some((event) => event.type === 'knockout')) triggerIslandRunHaptic('boss_trial_resolve');
    else if (snapshot.recentEvents.some((event) => event.type === 'shield_break')) triggerIslandRunHaptic('encounter_resolve');
    else if (snapshot.recentEvents.some((event) => event.type === 'impact' && event.strength >= 8)) triggerIslandRunHaptic('stop_land');
    else if (snapshot.recentEvents.some((event) => event.type === 'surge')) triggerIslandRunHaptic('roll');
    if (snapshot.recentEvents.some((event) => event.type === 'round_complete')) triggerIslandRunHaptic('reward_claim');
  }, [audio, snapshot.recentEvents]);
  useEffect(() => {
    if (snapshot.mode === 'battle' || snapshot.mode === 'resolve') audio.startBattleBed();
    else audio.stopBattleBed();
  }, [audio, snapshot.mode]);
  const rewardTrack = buildJourneyDiscArenaRewardTrack(snapshot.progress);
  const battle = snapshot.battle;
  const encounter = battle?.encounter ?? snapshot.encounter;
  const secondsRemaining = battle ? Math.max(0, Math.ceil(battle.durationSeconds - battle.elapsedSeconds)) : 24;
  const playerAlive = battle?.fighters.filter((fighter) => fighter.team === 'player' && fighter.active && !fighter.isEcho).length ?? snapshot.deployedDiscCount;
  const rivalAlive = battle?.fighters.filter((fighter) => fighter.team === 'rival' && fighter.active && !fighter.isEcho).length ?? encounter.rivalCount;
  const surgePercent = Math.round(battle?.playerSurge ?? 100);
  const permanentRank = Math.max(snapshot.progress.rank, snapshot.armory.rank);
  const openingLabel = battle && snapshot.mode === 'battle'
    ? battle.openingTicksRemaining > 0
      ? String(Math.ceil(battle.openingTicksRemaining / (JOURNEY_DISC_ARENA_OPENING_TICKS / 3)))
      : battle.tick < JOURNEY_DISC_ARENA_OPENING_TICKS + 28
        ? 'SPIN!'
        : null
    : null;
  const activePlayerFighters = battle?.fighters.filter((fighter) => fighter.team === 'player' && fighter.active && !fighter.isEcho) ?? [];
  const selectedFighter = activePlayerFighters.find((fighter) => fighter.id === snapshot.selectedFighterId) ?? activePlayerFighters[0] ?? null;
  const selectedLineupEntry = selectedFighter ? snapshot.playerLineup.find((fighter) => fighter.id === selectedFighter.id) : null;
  const selectedWeaponName = selectedFighter?.moduleId ? JOURNEY_DISC_WEAPON_NAMES[selectedFighter.moduleId] : 'Resonance Core';
  const selectedActionName = selectedFighter?.moduleId === 'ram_fin'
    ? 'Comet Ram'
    : selectedFighter?.moduleId === 'aegis_ring'
      ? 'Aegis Drive'
      : selectedFighter?.moduleId === 'pulse_vane'
        ? 'Pulse Dash'
        : 'Resonance Surge';
  const playerPower = snapshot.playerLineup.reduce((total, fighter, index) => {
    if (!snapshot.formationSlots[index]) return total;
    const stats = getJourneyDiscArenaFighterStats(fighter);
    return total + stats.maxShield * 0.42 + stats.impact * 54 + stats.maxSpeed * 5;
  }, 0);
  const rivalPower = Array.from({ length: encounter.rivalCount }, (_, index) => getJourneyDiscArenaFighterStats({
    rank: encounter.rivalRankFloor,
    bossTier: encounter.bossTier,
    weaponLevel: Math.min(5, encounter.bossTier > 0 ? encounter.bossTier + 2 : encounter.rivalRankFloor),
    moduleId: index % 2 === 0 ? 'ram_fin' as const : 'aegis_ring' as const,
  })).reduce((total, stats) => total + stats.maxShield * 0.42 + stats.impact * 54 + stats.maxSpeed * 5, 0);
  const matchupPercent = Math.round(100 * playerPower / Math.max(1, playerPower + rivalPower));
  const matchupLabel = matchupPercent >= 58 ? 'Favored' : matchupPercent >= 43 ? 'Close fight' : 'Underdog';
  const scoreReport = battle ? scoreJourneyDiscArenaRound(battle) : null;
  const nextMilestone = rewardTrack.milestones.find((milestone) => milestone.state !== 'claimed');

  return (
    <main
      className="journey-disc-arena"
      data-mode={snapshot.mode}
      data-theme={battle?.arenaProfile.theme ?? encounter.theme}
      data-phone-preview={config.previewPhoneFrame ? 'true' : undefined}
      data-island-concourse={config.islandConcourseIntegration ? 'true' : undefined}
      data-island-number={config.integratedIslandNumber}
    >
      <JourneyDiscArenaStage snapshot={snapshot} />
      <div className="journey-disc-arena__vignette" aria-hidden="true" />

      <header className="journey-disc-arena__topbar">
        <button className="journey-disc-arena__exit" type="button" onClick={() => onComplete({ completed: false })} aria-label="Leave Journey Disc Arena">×</button>
        <div className="journey-disc-arena__title-block">
          <p>{encounter.class === 'guardian' ? 'Boss prize battle' : `${encounter.class} class`}</p>
          <h1>Journey Disc Arena</h1>
        </div>
        <div className="journey-disc-arena__wallets" aria-label="Event progress">
          <span><b>◉</b> {snapshot.tickets}</span>
          <span><b>♛</b> {snapshot.wins}</span>
        </div>
      </header>

      {snapshot.mode !== 'prep' ? (
        <section className="journey-disc-arena__score" aria-label="Battle status">
          <div data-team="player"><span>Your discs</span><strong>{playerAlive}</strong></div>
          <div className="journey-disc-arena__timer"><span>Round</span><strong>{secondsRemaining}</strong></div>
          <div data-team="rival"><span>Rivals</span><strong>{rivalAlive}</strong></div>
        </section>
      ) : null}

      {snapshot.mode === 'battle' && snapshot.lastImpactLabel ? (
        <div className="journey-disc-arena__impact-callout" key={`${snapshot.lastImpactLabel}-${snapshot.combo}`}>
          <strong>{snapshot.lastImpactLabel}</strong>
          {snapshot.combo > 1 ? <span>×{snapshot.combo} chain</span> : null}
        </div>
      ) : null}

      {openingLabel ? (
        <div className="journey-disc-arena__countdown" key={openingLabel} data-spin={openingLabel === 'SPIN!'} aria-live="assertive">
          <small>CAPTAINS READY</small>
          <strong>{openingLabel}</strong>
        </div>
      ) : null}

      {snapshot.mode === 'resolve' ? (
        <div className="journey-disc-arena__resolve" data-winner={battle?.winner ?? 'draw'} role="status" aria-live="assertive">
          <small>{battle?.winner === 'player' ? 'FINAL RING OUT' : battle?.winner === 'rival' ? 'FORMATION DOWN' : 'TIME'}</small>
          <strong>{battle?.winner === 'player' ? 'VICTORY!' : battle?.winner === 'rival' ? 'RIVALS WIN' : 'DRAW!'}</strong>
        </div>
      ) : null}

      {snapshot.mode === 'prep' ? (
        <section className="journey-disc-arena__prep-panel">
          <div className="journey-disc-arena__reward-track" aria-label="Journey Disc multi reward track">
            <div><strong>DISC POINTS</strong><span>{rewardTrack.points} / {rewardTrack.maximum}</span></div>
            <i><b style={{ width: `${rewardTrack.fillPercent}%` }} /></i>
            <ol>
              {rewardTrack.milestones.map((milestone) => (
                <li key={milestone.id} data-state={milestone.state} style={{ left: `${milestone.positionPercent}%` }}>
                  <button type="button" disabled={milestone.state !== 'claimable'} onClick={() => controller.claimMilestone(milestone.id)} aria-label={`${milestone.state === 'claimable' ? 'Claim' : milestone.state} ${milestone.label}`}>{milestone.icon}</button>
                  <small>{milestone.points}</small>
                </li>
              ))}
            </ol>
          </div>
          <div className="journey-disc-arena__encounter" data-class={encounter.class}>
            <span>{encounter.class === 'guardian' ? 'BOSS' : encounter.class.toUpperCase()}</span>
            <strong>{encounter.label}</strong>
            <small>{encounter.class === 'guardian' ? 'End-prize gate' : `${encounter.rivalCount} rival${encounter.rivalCount === 1 ? '' : 's'}`} · victory ×{encounter.victoryScoreMultiplier}</small>
          </div>
          <div className="journey-disc-arena__matchup" data-matchup={matchupLabel === 'Underdog' ? 'danger' : matchupLabel === 'Favored' ? 'strong' : 'even'}>
            <span>YOUR FORMATION <b>{Math.round(playerPower)}</b></span>
            <i><b style={{ width: `${matchupPercent}%` }} /></i>
            <strong>{snapshot.deployedDiscCount > 0 ? matchupLabel : 'Place a disc'}</strong>
            <span><b>{Math.round(rivalPower)}</b> RIFT</span>
          </div>
          <div className="journey-disc-arena__section-heading">
            <div><p>1 ticket per fighter</p><h2>Tap formation slots</h2></div>
            <span>Rank {permanentRank}</span>
          </div>
          <div className="journey-disc-arena__formation-grid" aria-label="Tap formation slots to place weapon discs">
            {snapshot.playerLineup.map((fighter, index) => {
              const occupied = snapshot.formationSlots[index] === true;
              const weaponName = fighter.moduleId ? JOURNEY_DISC_WEAPON_NAMES[fighter.moduleId] : 'Unarmed';
              return (
                <button
                  type="button"
                  key={fighter.id}
                  data-occupied={occupied}
                  data-slot={index + 1}
                  onClick={() => { audio.prime(); audio.playPlacement(!occupied); triggerIslandRunHaptic(occupied ? 'stop_land' : 'build_part'); controller.toggleFormationSlot(index); }}
                  aria-pressed={occupied}
                  aria-label={`${occupied ? 'Remove' : 'Add'} ${fighter.name} in formation slot ${index + 1}`}
                >
                  <i>{occupied ? '◉' : '+'}</i>
                  <span><strong>{occupied ? fighter.name : `Empty slot ${index + 1}`}</strong><small>{occupied ? `${weaponName} · Level ${fighter.weaponLevel}` : 'Tap to place'}</small></span>
                  <b>{occupied ? '1 ◉' : ''}</b>
                </button>
              );
            })}
          </div>
          <p className="journey-disc-arena__notice" role="status">{snapshot.notice}</p>
          <div className="journey-disc-arena__prep-actions">
            <button type="button" className="journey-disc-arena__launch" disabled={snapshot.deployedDiscCount < 1} onClick={() => { audio.prime(); audio.playLaunch(); triggerIslandRunHaptic('roll'); controller.launchRound(); }}>
              {snapshot.deployedDiscCount > 0 ? `Deploy ${snapshot.deployedDiscCount} · ${snapshot.deployedDiscCount} ◉` : 'Place a fighter'} <span>→</span>
            </button>
          </div>
        </section>
      ) : null}

      {snapshot.mode === 'battle' ? (
        <section className="journey-disc-arena__battle-hud" aria-live="polite">
          <div className="journey-disc-arena__captains" role="group" aria-label="Choose your captain disc">
            {activePlayerFighters.map((fighter) => {
              const lineupEntry = snapshot.playerLineup.find((entry) => entry.id === fighter.id);
              const weapon = fighter.moduleId ? JOURNEY_DISC_WEAPON_NAMES[fighter.moduleId] : 'Core';
              return (
                <button
                  type="button"
                  key={fighter.id}
                  data-selected={fighter.id === selectedFighter?.id}
                  data-module={fighter.moduleId ?? 'core'}
                  onClick={() => { audio.prime(); triggerIslandRunHaptic('stop_land'); controller.selectFighter(fighter.id); }}
                  aria-pressed={fighter.id === selectedFighter?.id}
                  aria-label={`Appoint ${lineupEntry?.name ?? 'fighter'} with ${weapon} as captain`}
                >
                  <i>{fighter.moduleId === 'ram_fin' ? '◆' : fighter.moduleId === 'aegis_ring' ? '◉' : fighter.moduleId === 'pulse_vane' ? 'ϟ' : '✦'}</i>
                  <span><strong>{lineupEntry?.name.replace('Explorer ', '').replace('Living ', '') ?? 'Disc'}</strong><small>{weapon}</small></span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="journey-disc-arena__surge"
            data-ready={surgePercent >= JOURNEY_DISC_ARENA_SURGE_READY}
            data-max={surgePercent >= 100}
            disabled={surgePercent < JOURNEY_DISC_ARENA_SURGE_READY || Boolean(battle?.openingTicksRemaining)}
            onClick={() => { audio.prime(); controller.triggerSurge(); }}
            style={{ '--surge': `${surgePercent}%` } as React.CSSProperties}
          >
            <span>{battle?.openingTicksRemaining ? 'HOLD FORMATION' : surgePercent >= 100 ? `${selectedLineupEntry?.name ?? 'CAPTAIN'} · MAX POWER` : surgePercent >= JOURNEY_DISC_ARENA_SURGE_READY ? `${selectedWeaponName} · STRIKE READY` : `CHARGING · READY AT ${JOURNEY_DISC_ARENA_SURGE_READY}`}</span>
            <strong>{selectedActionName}</strong>
            <i>{surgePercent}%</i>
          </button>
          <div className="journey-disc-arena__notice">{snapshot.notice}</div>
        </section>
      ) : null}

      {snapshot.mode === 'result' ? (
        <section className="journey-disc-arena__result-panel" role="dialog" aria-modal="true" aria-label="Round result">
          <p>{battle?.winner === 'player' ? 'Formation victorious' : battle?.winner === 'draw' ? 'Resonance draw' : 'Rivals hold the ring'}</p>
          <h2>{battle?.winner === 'player' ? 'Your relics stand.' : battle?.winner === 'draw' ? 'Perfectly balanced.' : 'Rebuild. Reawaken.'}</h2>
          <div className="journey-disc-arena__result-stars" aria-label={`${battle?.winner === 'player' ? 3 : battle?.winner === 'draw' ? 2 : 1} stars`}>
            {[0, 1, 2].map((star) => <i key={star} data-lit={star < (battle?.winner === 'player' ? 3 : battle?.winner === 'draw' ? 2 : 1)}>★</i>)}
          </div>
          <strong className="journey-disc-arena__result-score">+{snapshot.lastRoundScore} DISC POINTS</strong>
          {battle?.winner === 'player' && encounter.victoryScoreMultiplier > 1 ? <em className="journey-disc-arena__boss-bonus">{encounter.label} victory ×{encounter.victoryScoreMultiplier} included</em> : null}
          <div className="journey-disc-arena__result-stats">
            <span><b>{scoreReport?.survivors ?? playerAlive}</b> Survivors</span>
            <span><b>{scoreReport?.shieldPercent ?? 0}%</b> Shield</span>
            <span><b>{nextMilestone?.points ?? rewardTrack.maximum}</b> Next reward</span>
          </div>
          <span>{snapshot.progress.eventPoints} total · Best {snapshot.progress.bestRoundScore}</span>
          <div className="journey-disc-arena__result-actions">
            <button type="button" className="journey-disc-arena__secondary" onClick={controller.prepareNextRound}>Formation bay</button>
            <button type="button" className="journey-disc-arena__launch" onClick={() => { audio.prime(); controller.launchRematch(); }}>Instant rematch →</button>
          </div>
          <button type="button" className="journey-disc-arena__bank" onClick={() => onComplete({ completed: battle?.winner === 'player', arenaPerformance: {
              gameId: 'journey_disc_arena',
              rawScore: snapshot.lastRoundScore,
              mastery: battle?.winner === 'player' ? 1 : battle?.winner === 'draw' ? 0.6 : 0.35,
              stars: battle?.winner === 'player' ? 3 : battle?.winner === 'draw' ? 2 : 1,
              durationMs: Math.round((battle?.elapsedSeconds ?? 0) * 1000),
              mistakes: Math.max(0, snapshot.deployedDiscCount - playerAlive),
              hintsUsed: 0,
            } })}>Return to Island Run</button>
        </section>
      ) : null}

      <button className="journey-disc-arena__reset" type="button" onClick={controller.resetPreview}>Reset lab</button>
    </main>
  );
}
