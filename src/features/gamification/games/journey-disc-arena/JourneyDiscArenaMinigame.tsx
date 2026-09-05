import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { IslandRunMinigameProps } from '../../level-worlds/services/islandRunMinigameTypes';
import {
  getJourneyDiscArenaFighterStats,
  JOURNEY_DISC_ARENA_FREEZE_READY,
  JOURNEY_DISC_ARENA_GRAVITY_READY,
  JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS,
  JOURNEY_DISC_ARENA_OPENING_TICKS,
  JOURNEY_DISC_ARENA_SURGE_READY,
  resolveJourneyDiscArenaEncounter,
  scoreJourneyDiscArenaRound,
} from '../../level-worlds/services/journeyDiscArenaGame';
import { buildJourneyDiscArenaRewardTrack } from '../../level-worlds/services/journeyDiscArenaProgression';
import type { JourneyDiscArenaProgressEntry } from '../../level-worlds/services/islandRunGameStateStore';
import { JOURNEY_DISC_WEAPON_NAMES, type JourneyDiscArmoryState } from '../../level-worlds/services/journeyDiscArmory';
import { buildJourneyDiscArenaRivalRoster, resolveJourneyDiscArenaCampaign } from '../../level-worlds/services/journeyDiscArenaPresentation';
import { resolvePlayerPiece, type PlayerPieceId } from '../../level-worlds/services/islandRunPlayerPieces';
import { createJourneyDiscArenaPreviewController, type JourneyDiscArenaLineupEntry } from './JourneyDiscArenaPreviewController';
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

const JOURNEY_DISC_RELIC_GLYPHS: Record<PlayerPieceId, string> = {
  explorer_ship: '▲',
  ancient_egg: '⬡',
  living_compass: '✦',
  keepers_lantern: '◇',
  quest_journal: '▤',
  world_seed: '♢',
  ancient_key: '⚿',
  fallen_star: '✧',
  oris_shell: '◒',
  guardian_idol: '◆',
};

function JourneyDiscMiniature({ fighter, team = 'player', compact = false }: {
  fighter: Pick<JourneyDiscArenaLineupEntry, 'pieceId' | 'rank' | 'moduleId'>;
  team?: 'player' | 'rival';
  compact?: boolean;
}) {
  const piece = resolvePlayerPiece(fighter.pieceId);
  return (
    <span
      className="journey-disc-arena__miniature"
      data-team={team}
      data-compact={compact || undefined}
      data-module={fighter.moduleId ?? 'core'}
      style={{ '--disc-accent': piece.accentColor } as React.CSSProperties}
      aria-hidden="true"
    >
      <i>{JOURNEY_DISC_RELIC_GLYPHS[fighter.pieceId]}</i>
      <b>{fighter.rank}</b>
    </span>
  );
}

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
  const [showCollection, setShowCollection] = useState(false);
  useEffect(() => () => {
    controller.dispose();
    audio.dispose();
  }, [audio, controller]);
  useEffect(() => {
    audio.playEvents(snapshot.recentEvents);
    if (snapshot.recentEvents.some((event) => event.type === 'gravity_hole_gulp' || event.type === 'knockout')) triggerIslandRunHaptic('boss_trial_resolve');
    else if (snapshot.recentEvents.some((event) => event.type === 'freeze' || event.type === 'drive_off')) triggerIslandRunHaptic('encounter_resolve');
    else if (snapshot.recentEvents.some((event) => event.type === 'shield_break')) triggerIslandRunHaptic('encounter_resolve');
    else if (snapshot.recentEvents.some((event) => event.type === 'impact' && event.strength >= 8)) triggerIslandRunHaptic('stop_land');
    else if (snapshot.recentEvents.some((event) => event.type === 'surge' || event.type === 'gravity_hole_open')) triggerIslandRunHaptic('roll');
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
  const freezePercent = Math.round(battle?.playerFreezeCharge ?? 100);
  const gravityPercent = Math.round(battle?.playerGravityCharge ?? 100);
  const gravityHoleActive = Boolean(battle?.gravityHole);
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
  const campaign = resolveJourneyDiscArenaCampaign(snapshot.progress.eventPoints);
  const nextEncounter = resolveJourneyDiscArenaEncounter({
    eventPoints: snapshot.progress.eventPoints,
    deployedDiscs: Math.max(1, snapshot.deployedDiscCount),
    roundsStarted: snapshot.progress.roundsStarted,
  });
  const stageAdvanced = snapshot.mode === 'result' && nextEncounter.id !== encounter.id;
  const rivalRoster = buildJourneyDiscArenaRivalRoster(encounter);
  const nextPrizeLabel = nextMilestone
    ? nextMilestone.state === 'claimable'
      ? `Claim ${nextMilestone.label}`
      : `${Math.max(0, nextMilestone.points - rewardTrack.points)} to ${nextMilestone.label}`
    : 'All prizes claimed';
  const claimableMilestone = rewardTrack.milestones.find((milestone) => milestone.state === 'claimable');
  const campaignStageNumber = campaign.stages.findIndex((stage) => stage.state === 'current') + 1;
  const journeyTargetPoints = campaign.next?.points ?? rewardTrack.maximum;
  const journeyFloorPoints = campaign.current.points;
  const journeyProgressPercent = Math.min(100, Math.max(0,
    (rewardTrack.points - journeyFloorPoints) / Math.max(1, journeyTargetPoints - journeyFloorPoints) * 100,
  ));
  const activeFormation = snapshot.playerLineup.filter((_, index) => snapshot.formationSlots[index]);
  const selectedRosterFighter = snapshot.playerLineup.find((fighter) => fighter.id === snapshot.selectedFighterId) ?? snapshot.playerLineup[0] ?? null;
  const selectedRosterStats = selectedRosterFighter ? getJourneyDiscArenaFighterStats(selectedRosterFighter) : null;
  const selectedRosterWeapon = selectedRosterFighter?.moduleId ? JOURNEY_DISC_WEAPON_NAMES[selectedRosterFighter.moduleId] : 'Resonance Core';
  const canAddAnother = snapshot.deployedDiscCount < JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS
    && snapshot.deployedDiscCount < snapshot.tickets;

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
          <p>{snapshot.mode === 'prep' ? `Stage ${campaignStageNumber} · ${campaign.current.shortLabel}` : encounter.class === 'guardian' ? 'Boss prize battle' : `${encounter.class} class`}</p>
          <h1>{snapshot.mode === 'prep' ? 'Battle Setup' : 'Journey Disc Arena'}</h1>
        </div>
        <div className="journey-disc-arena__wallets" aria-label="Event progress">
          <span><b>🎟</b> {snapshot.tickets}</span>
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

      {snapshot.mode === 'prep' ? (
        <section className="journey-disc-arena__rival-squad" data-class={encounter.class} aria-label={`${encounter.label} rival squad. ${rivalRoster.length} enemies: ${rivalRoster.map((fighter) => fighter.name).join(', ')}.`}>
          <div className="journey-disc-arena__rival-heading">
            <span>{encounter.class === 'guardian' ? 'Guardian battle' : 'Rival squad'}</span>
            <strong>{rivalRoster.length} enem{rivalRoster.length === 1 ? 'y' : 'ies'}</strong>
          </div>
          <div className="journey-disc-arena__rival-models">
            {rivalRoster.map((fighter, index) => (
              <JourneyDiscMiniature
                key={fighter.id}
                fighter={{ pieceId: fighter.pieceId, rank: encounter.rivalRankFloor, moduleId: index % 2 === 0 ? 'ram_fin' : 'aegis_ring' }}
                team="rival"
                compact
              />
            ))}
          </div>
          <div className="journey-disc-arena__rival-meta"><strong>{encounter.label}</strong><small>Victory ×{encounter.victoryScoreMultiplier}</small></div>
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
        <section className="journey-disc-arena__prep-panel" aria-label="Choose your active Journey Disc battle team">
          <div className="journey-disc-arena__next-battle" aria-label={`Stage ${campaignStageNumber} of ${campaign.stages.length}. ${nextPrizeLabel}.`}>
            <div className="journey-disc-arena__next-battle-heading">
              <span>NEXT BATTLE · STAGE {campaignStageNumber}/{campaign.stages.length}</span>
              <b>{matchupLabel}</b>
            </div>
            <h2>{encounter.label}</h2>
            <p>Win battles → earn Disc Points → claim rewards.</p>
            <div className="journey-disc-arena__journey-progress-copy">
              <strong>{rewardTrack.points} Disc Points</strong>
              <span>{campaign.next ? `${campaign.pointsToNext} to ${campaign.next.shortLabel}` : 'Final Guardian reached'}</span>
            </div>
            <i className="journey-disc-arena__journey-progress"><b style={{ width: `${journeyProgressPercent}%` }} /></i>
            {nextMilestone ? (
              <div className="journey-disc-arena__next-reward" data-state={nextMilestone.state}>
                <span aria-hidden="true">{nextMilestone.icon}</span>
                <p><small>{nextMilestone.state === 'claimable' ? 'REWARD READY' : `NEXT REWARD · ${nextMilestone.points} POINTS`}</small><strong>{nextMilestone.label}</strong></p>
                {nextMilestone.state === 'claimable' ? (
                  <button type="button" onClick={() => controller.claimMilestone(nextMilestone.id)}>CLAIM</button>
                ) : <b>{Math.max(0, nextMilestone.points - rewardTrack.points)} away</b>}
              </div>
            ) : null}
          </div>

          <details className="journey-disc-arena__roadmap">
            <summary><span>View journey & rewards</span><small>How stages and upgrades work</small></summary>
            <div className="journey-disc-arena__campaign" aria-label={`Journey Disc campaign stage ${campaignStageNumber} of ${campaign.stages.length}`}>
              <div><strong>FIGHT PATH</strong><span>More points unlock harder rivals</span></div>
              <ol>
                {campaign.stages.map((stage, index) => (
                  <li key={stage.id} data-state={stage.state}><i>{stage.state === 'cleared' ? '✓' : index + 1}</i><small>{stage.shortLabel}</small></li>
                ))}
              </ol>
            </div>
            <ol className="journey-disc-arena__reward-list" aria-label="Journey Disc reward milestones">
              {rewardTrack.milestones.map((milestone) => (
                <li key={milestone.id} data-state={milestone.state}>
                  <button type="button" disabled={milestone.state !== 'claimable'} onClick={() => controller.claimMilestone(milestone.id)} aria-label={`${milestone.state === 'claimable' ? 'Claim' : milestone.state} ${milestone.label}`}>{milestone.icon}</button>
                  <span><strong>{milestone.points} points</strong><small>{milestone.label}</small></span>
                  <b>{milestone.state === 'claimed' ? 'CLAIMED' : milestone.state === 'claimable' ? 'CLAIM' : 'LOCKED'}</b>
                </li>
              ))}
            </ol>
            <p className="journey-disc-arena__upgrade-guide"><b>Upgrades are automatic.</b> Claim a glowing reward and its rank or weapon level is applied—there is nothing extra to buy or equip.</p>
          </details>

          <div className="journey-disc-arena__setup-heading journey-disc-arena__setup-heading--team">
            <div><strong>YOUR TEAM <b>{snapshot.deployedDiscCount}/{JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS}</b></strong><small>{snapshot.deployedDiscCount > 0 ? `${matchupLabel} against this rival squad` : 'Add at least one disc'}</small></div>
            <button type="button" aria-expanded={showCollection} onClick={() => setShowCollection((visible) => !visible)}>{showCollection ? 'DONE' : 'CHANGE TEAM'}</button>
          </div>
          <div className="journey-disc-arena__active-team" aria-label={`${snapshot.deployedDiscCount} of ${JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS} active team slots filled`}>
            {activeFormation.map((fighter, slotIndex) => (
                <button
                  type="button"
                  key={fighter.id}
                  data-occupied="true"
                  onClick={() => { audio.prime(); audio.playPlacement(false); triggerIslandRunHaptic('stop_land'); controller.removeFormationFighter(fighter.id); }}
                  aria-label={`Remove ${fighter.name} from active team slot ${slotIndex + 1}`}
                >
                  <JourneyDiscMiniature fighter={fighter} compact />
                  <span><strong>{fighter.name}</strong><small>Slot {slotIndex + 1}</small></span>
                  <b aria-hidden="true">−</b>
                </button>
            ))}
            {snapshot.deployedDiscCount < JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS ? (
              <button type="button" className="journey-disc-arena__empty-team-slot" disabled={!canAddAnother} onClick={() => setShowCollection(true)} aria-label="Add a disc to your team">
                <i>+</i><span><strong>ADD A DISC</strong><small>{canAddAnother ? 'Open collection' : 'Need 1 ticket'}</small></span>
              </button>
            ) : null}
          </div>

          {showCollection ? (
            <section className="journey-disc-arena__collection-drawer" aria-label="Your Journey Disc collection">
              <div className="journey-disc-arena__collection-heading"><strong>YOUR DISCS</strong><span>Choose Add or Remove</span></div>
              <div className="journey-disc-arena__collection" role="listbox" aria-label={`${snapshot.playerLineup.length} owned Journey Discs`}>
                {snapshot.playerLineup.map((fighter, index) => {
                  const active = snapshot.formationSlots[index] === true;
                  const selected = fighter.id === selectedRosterFighter?.id;
                  const weaponName = fighter.moduleId ? JOURNEY_DISC_WEAPON_NAMES[fighter.moduleId] : 'Core';
                  const canAdd = !active && canAddAnother;
                  return (
                    <div key={fighter.id} data-selected={selected} data-active={active}>
                      <button type="button" role="option" aria-selected={selected} onClick={() => { audio.prime(); triggerIslandRunHaptic('stop_land'); controller.selectFighter(fighter.id); }}>
                        <JourneyDiscMiniature fighter={fighter} compact />
                        <span><strong>{fighter.name}</strong><small>Rank {fighter.rank} · {weaponName} Lv. {fighter.weaponLevel}</small></span>
                      </button>
                      <button type="button" className="journey-disc-arena__collection-action" disabled={!active && !canAdd} onClick={() => {
                        audio.prime(); audio.playPlacement(!active); triggerIslandRunHaptic('build_part');
                        if (active) controller.removeFormationFighter(fighter.id);
                        else controller.addSelectedFighterToFormation(fighter.id);
                      }}>{active ? 'REMOVE' : canAdd ? 'ADD' : snapshot.deployedDiscCount >= snapshot.tickets ? 'NEED TICKET' : 'TEAM FULL'}</button>
                    </div>
                  );
                })}
              </div>
              {selectedRosterFighter && selectedRosterStats ? (
                <details className="journey-disc-arena__disc-details">
                  <summary>Inspect {selectedRosterFighter.name} · Rank {selectedRosterFighter.rank} · {selectedRosterWeapon} Lv. {selectedRosterFighter.weaponLevel}</summary>
                  <div className="journey-disc-arena__selected-bars" aria-label="Selected disc stats">
                    <span>Shield<i><b style={{ width: `${Math.min(100, Math.round(selectedRosterStats.maxShield / 2.6))}%` }} /></i></span>
                    <span>Speed<i><b style={{ width: `${Math.min(100, Math.round(selectedRosterStats.maxSpeed * 9))}%` }} /></i></span>
                    <span>Impact<i><b style={{ width: `${Math.min(100, Math.round(selectedRosterStats.impact * 36))}%` }} /></i></span>
                  </div>
                </details>
              ) : null}
              <p className="journey-disc-arena__upgrade-guide"><b>Current team rank: {permanentRank}.</b> Rank and weapon upgrades come from claimed rewards above.</p>
            </section>
          ) : null}

          <div className="journey-disc-arena__prep-actions">
            <button type="button" className="journey-disc-arena__launch" disabled={snapshot.deployedDiscCount < 1 || snapshot.tickets < snapshot.deployedDiscCount} onClick={() => { audio.prime(); audio.playLaunch(); triggerIslandRunHaptic('roll'); controller.launchRound(); }}>
              {snapshot.deployedDiscCount > 0 ? `START NEXT BATTLE · ${snapshot.deployedDiscCount} TICKET${snapshot.deployedDiscCount === 1 ? '' : 'S'}` : 'ADD A DISC TO START'} <span>→</span>
            </button>
            <small>{snapshot.deployedDiscCount} disc{snapshot.deployedDiscCount === 1 ? '' : 's'} deploy · 1 ticket each · points bank automatically</small>
          </div>
          <p className="journey-disc-arena__notice" role="status">{snapshot.notice}</p>
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
                  disabled={gravityHoleActive}
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
          <div className="journey-disc-arena__battle-actions">
            <button
              type="button"
              className="journey-disc-arena__freeze"
              data-ready={freezePercent >= JOURNEY_DISC_ARENA_FREEZE_READY}
              disabled={freezePercent < JOURNEY_DISC_ARENA_FREEZE_READY || Boolean(battle?.openingTicksRemaining) || gravityHoleActive}
              onClick={() => { audio.prime(); controller.triggerFreezeAttack(); }}
              style={{ '--freeze': `${freezePercent}%` } as React.CSSProperties}
            >
              <span>{battle?.openingTicksRemaining ? 'HOLD' : freezePercent >= JOURNEY_DISC_ARENA_FREEZE_READY ? 'ICE LOCK READY' : 'RECHARGING'}</span>
              <strong>❄ Freeze Pulse</strong>
              <i>{freezePercent}%</i>
            </button>
            <button
              type="button"
              className="journey-disc-arena__gravity"
              data-ready={gravityPercent >= JOURNEY_DISC_ARENA_GRAVITY_READY && !gravityHoleActive}
              data-active={gravityHoleActive || undefined}
              disabled={gravityPercent < JOURNEY_DISC_ARENA_GRAVITY_READY || Boolean(battle?.openingTicksRemaining) || gravityHoleActive}
              onClick={() => { audio.prime(); controller.triggerGravityHole(); }}
              style={{ '--gravity': `${gravityPercent}%` } as React.CSSProperties}
            >
              <span>{battle?.openingTicksRemaining ? 'HOLD' : gravityHoleActive ? 'HUNTING · ONE GULP' : gravityPercent >= JOURNEY_DISC_ARENA_GRAVITY_READY ? `${selectedLineupEntry?.name ?? 'CAPTAIN'} SELECTED` : 'RECHARGING'}</span>
              <strong>◉ Gravity Hole</strong>
              <i>{gravityHoleActive ? 'LIVE' : `${gravityPercent}%`}</i>
            </button>
            <button
              type="button"
              className="journey-disc-arena__surge"
              data-ready={surgePercent >= JOURNEY_DISC_ARENA_SURGE_READY}
              data-max={surgePercent >= 100}
              disabled={surgePercent < JOURNEY_DISC_ARENA_SURGE_READY || Boolean(battle?.openingTicksRemaining) || gravityHoleActive}
              onClick={() => { audio.prime(); controller.triggerSurge(); }}
              style={{ '--surge': `${surgePercent}%` } as React.CSSProperties}
            >
              <span>{battle?.openingTicksRemaining ? 'HOLD FORMATION' : surgePercent >= 100 ? `${selectedLineupEntry?.name ?? 'CAPTAIN'} · MAX POWER` : surgePercent >= JOURNEY_DISC_ARENA_SURGE_READY ? `${selectedWeaponName} · STRIKE READY` : `CHARGING · READY AT ${JOURNEY_DISC_ARENA_SURGE_READY}`}</span>
              <strong>{selectedActionName}</strong>
              <i>{surgePercent}%</i>
            </button>
          </div>
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
            <span><b>{nextMilestone?.state === 'claimable' ? 'READY' : nextMilestone?.points ?? rewardTrack.maximum}</b> {nextMilestone?.state === 'claimable' ? 'Claim reward' : 'Next reward'}</span>
          </div>
          <span>{snapshot.progress.eventPoints} total · Best {snapshot.progress.bestRoundScore}</span>
          <div className="journey-disc-arena__result-progress" data-advanced={stageAdvanced || undefined}>
            <small>{stageAdvanced ? 'NEW CAMPAIGN STAGE UNLOCKED' : 'CAMPAIGN PROGRESS'}</small>
            <strong>{stageAdvanced ? nextEncounter.label : campaign.current.label}</strong>
            <span>{campaign.next ? `${campaign.pointsToNext} more Disc Points to ${campaign.next.label}` : 'Final Guardian reached · finish the 1350-point prize track'}</span>
          </div>
          {claimableMilestone ? (
            <button type="button" className="journey-disc-arena__claim" onClick={() => controller.claimMilestone(claimableMilestone.id)}>
              Claim reward · {claimableMilestone.label}
            </button>
          ) : null}
          <div className="journey-disc-arena__result-actions">
            <button type="button" className="journey-disc-arena__secondary" onClick={controller.prepareNextRound}>Adjust team</button>
            <button type="button" className="journey-disc-arena__launch" onClick={() => { audio.prime(); controller.launchRematch(); }}>
              {stageAdvanced ? `Continue to ${nextEncounter.label} →` : campaign.next ? 'Next campaign battle →' : 'Replay final Guardian →'}
            </button>
          </div>
          <button type="button" className="journey-disc-arena__bank" onClick={() => onComplete({ completed: battle?.winner === 'player', arenaPerformance: {
              gameId: 'journey_disc_arena',
              rawScore: snapshot.lastRoundScore,
              mastery: battle?.winner === 'player' ? 1 : battle?.winner === 'draw' ? 0.6 : 0.35,
              stars: battle?.winner === 'player' ? 3 : battle?.winner === 'draw' ? 2 : 1,
              durationMs: Math.round((battle?.elapsedSeconds ?? 0) * 1000),
              mistakes: Math.max(0, snapshot.deployedDiscCount - playerAlive),
              hintsUsed: 0,
            } })}>Return to Island Run · progress saved</button>
        </section>
      ) : null}

      <button className="journey-disc-arena__reset" type="button" onClick={controller.resetPreview}>Reset lab</button>
    </main>
  );
}
