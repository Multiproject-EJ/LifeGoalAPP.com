import {
  createJourneyDiscArenaState,
  JOURNEY_DISC_ARENA_OPENING_TICKS,
  resolveJourneyDiscArenaEncounter,
  scoreJourneyDiscArenaRound,
  stepJourneyDiscArena,
  triggerJourneyDiscArenaSurge,
  type JourneyDiscArenaEvent,
  type JourneyDiscArenaEncounterProfile,
  type JourneyDiscArenaFighterSeed,
  type JourneyDiscArenaModuleId,
  type JourneyDiscArenaRank,
  type JourneyDiscArenaState,
} from '../../level-worlds/services/journeyDiscArenaGame';
import {
  applyJourneyDiscArenaRoundToProgress,
  createJourneyDiscArenaProgress,
  getJourneyDiscArenaMilestone,
} from '../../level-worlds/services/journeyDiscArenaProgression';
import {
  createJourneyDiscArmory,
  getJourneyDiscUnlockedWeapons,
  upgradeJourneyDiscWeapon,
  type JourneyDiscArmoryState,
} from '../../level-worlds/services/journeyDiscArmory';
import type { JourneyDiscArenaProgressEntry } from '../../level-worlds/services/islandRunGameStateStore';
import type { PlayerPieceId } from '../../level-worlds/services/islandRunPlayerPieces';

export type JourneyDiscArenaPreviewMode = 'prep' | 'battle' | 'resolve' | 'result';

export interface JourneyDiscArenaLineupEntry {
  id: string;
  pieceId: PlayerPieceId;
  name: string;
  rank: JourneyDiscArenaRank;
  moduleId: JourneyDiscArenaModuleId;
  weaponLevel: number;
  formationSlot: number;
}

export interface JourneyDiscArenaPreviewSnapshot {
  mode: JourneyDiscArenaPreviewMode;
  tickets: number;
  wins: number;
  deployedDiscCount: number;
  roundId: string | null;
  lastRoundScore: number;
  progress: JourneyDiscArenaProgressEntry;
  encounter: JourneyDiscArenaEncounterProfile;
  armory: JourneyDiscArmoryState;
  formationSlots: readonly boolean[];
  playerLineup: readonly JourneyDiscArenaLineupEntry[];
  selectedFighterId: string | null;
  battle: JourneyDiscArenaState | null;
  recentEvents: readonly JourneyDiscArenaEvent[];
  combo: number;
  comboExpiresAtMs: number;
  lastImpactLabel: string;
  notice: string;
}

export interface JourneyDiscArenaPreviewController {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => JourneyDiscArenaPreviewSnapshot;
  setDeployedDiscCount: (count: number) => void;
  toggleFormationSlot: (slotIndex: number) => void;
  applyExternalProgress: (progress: JourneyDiscArenaProgressEntry, tickets?: number) => void;
  claimMilestone: (milestoneId: string) => void;
  launchRound: () => void;
  selectFighter: (fighterId: string) => void;
  triggerSurge: () => void;
  launchRematch: () => void;
  prepareNextRound: () => void;
  resetPreview: () => void;
  dispose: () => void;
}

export interface JourneyDiscArenaControllerOptions {
  tickets?: number;
  progress?: JourneyDiscArenaProgressEntry | null;
  armory?: JourneyDiscArmoryState | null;
  requestStartRound?: (deployedDiscs: number) => { ok: boolean; roundId: string | null; ticketsRemaining: number; progress: JourneyDiscArenaProgressEntry | null; failureReason?: string };
  requestBankRound?: (payload: { roundId: string; score: number; won: boolean; deployedDiscs: number; guardianTier?: 0 | 1 | 2 | 3 }) => { ok: boolean; progress: JourneyDiscArenaProgressEntry | null; armory?: JourneyDiscArmoryState };
  requestClaimMilestone?: (milestoneId: string) => { ok: boolean; progress: JourneyDiscArenaProgressEntry | null; rewardLabel: string | null; ticketsRemaining: number; armory?: JourneyDiscArmoryState };
}

const PLAYER_RELICS: readonly { pieceId: PlayerPieceId; name: string }[] = [
  { pieceId: 'explorer_ship', name: 'Explorer Ship' },
  { pieceId: 'world_seed', name: 'World Seed' },
  { pieceId: 'living_compass', name: 'Living Compass' },
  { pieceId: 'ancient_egg', name: 'Ancient Egg' },
];

const RIVAL_RELICS: readonly PlayerPieceId[] = [
  'guardian_idol',
  'fallen_star',
  'keepers_lantern',
  'oris_shell',
];

const MODULE_ROTATION: readonly Exclude<JourneyDiscArenaModuleId, null>[] = [
  'ram_fin',
  'aegis_ring',
  'pulse_vane',
];

function createInitialLineup(rank: JourneyDiscArenaRank, armory: JourneyDiscArmoryState): JourneyDiscArenaLineupEntry[] {
  const unlockedWeapons = getJourneyDiscUnlockedWeapons(armory);
  return PLAYER_RELICS.map((relic, index) => ({
    id: `player-${index + 1}`,
    pieceId: relic.pieceId,
    name: relic.name,
    rank,
    moduleId: unlockedWeapons[index % unlockedWeapons.length] ?? 'ram_fin',
    weaponLevel: armory.weaponLevels[unlockedWeapons[index % unlockedWeapons.length] ?? 'ram_fin'],
    formationSlot: index,
  }));
}

const FORMATION_POSITIONS = Object.freeze([
  { x: -4.15, z: -1.05 },
  { x: -4.95, z: -2.65 },
  { x: -4.15, z: 1.05 },
  { x: -4.95, z: 2.65 },
]);

function buildBattleSeeds(
  lineup: readonly JourneyDiscArenaLineupEntry[],
  roundSeed: number,
  encounter: JourneyDiscArenaEncounterProfile,
): JourneyDiscArenaFighterSeed[] {
  const playerCount = lineup.length;
  const playerSeeds = lineup.map((fighter, index) => ({
    id: fighter.id,
    pieceId: fighter.pieceId,
    team: 'player' as const,
    rank: fighter.rank,
    moduleId: fighter.moduleId,
    weaponLevel: fighter.weaponLevel,
    position: FORMATION_POSITIONS[fighter.formationSlot] ?? FORMATION_POSITIONS[index],
    // Leave a readable beat before the opening clash so the player can fire
    // the first Surge instead of watching the round decide itself.
    velocity: { x: 3.05 + fighter.rank * 0.18, z: (index - (playerCount - 1) / 2) * -0.18 },
  }));
  const rivalSpacing = encounter.rivalCount <= 2 ? 2.8 : 1.86;
  const rivalOffset = (encounter.rivalCount - 1) * rivalSpacing * 0.5;
  const rivalSeeds = Array.from({ length: encounter.rivalCount }, (_, index) => {
    const rivalRank = Math.max(
      encounter.rivalRankFloor,
      Math.min(3, encounter.rivalRankFloor + (((roundSeed + index) % 3 === 0) ? 1 : 0)),
    ) as JourneyDiscArenaRank;
    return {
      id: `rival-${index + 1}`,
      pieceId: RIVAL_RELICS[index % RIVAL_RELICS.length],
      team: 'rival' as const,
      rank: rivalRank,
      bossTier: encounter.bossTier,
      moduleId: MODULE_ROTATION[(index + 1) % MODULE_ROTATION.length],
      weaponLevel: Math.min(5, encounter.bossTier > 0 ? encounter.bossTier + 2 : rivalRank),
      position: { x: 4.6 + (index % 2) * 0.25, z: index * rivalSpacing - rivalOffset },
      velocity: { x: -3.05 - rivalRank * 0.18, z: (index - (encounter.rivalCount - 1) / 2) * 0.18 },
    };
  });
  return [...playerSeeds, ...rivalSeeds];
}

export function createJourneyDiscArenaPreviewController(options: JourneyDiscArenaControllerOptions = {}): JourneyDiscArenaPreviewController {
  const listeners = new Set<() => void>();
  const initialProgress = options.progress ?? createJourneyDiscArenaProgress(0);
  const initialArmory = options.armory ?? createJourneyDiscArmory(0);
  let lineup = createInitialLineup(Math.max(initialProgress.rank, initialArmory.rank) as JourneyDiscArenaRank, initialArmory);
  const initialTickets = Math.max(0, Math.floor(options.tickets ?? 6));
  const initialDeployedCount = Math.min(2, initialTickets);
  const initialFormationSlots = lineup.map((_, index) => index < initialDeployedCount);
  let snapshot: JourneyDiscArenaPreviewSnapshot = {
    mode: 'prep',
    tickets: initialTickets,
    wins: initialProgress.victories,
    deployedDiscCount: initialDeployedCount,
    roundId: null,
    lastRoundScore: 0,
    progress: initialProgress,
    encounter: resolveJourneyDiscArenaEncounter({ eventPoints: initialProgress.eventPoints, deployedDiscs: Math.max(1, initialDeployedCount), roundsStarted: initialProgress.roundsStarted }),
    armory: initialArmory,
    formationSlots: initialFormationSlots,
    playerLineup: lineup,
    selectedFighterId: null,
    battle: null,
    recentEvents: [],
    combo: 0,
    comboExpiresAtMs: 0,
    lastImpactLabel: '',
    notice: 'Tap a formation slot to spend one ticket on that fighter.',
  };
  let animationFrame = 0;
  let previousTimeMs = 0;
  let accumulatorSeconds = 0;
  let roundSeed = 20260813;
  let rewardGrantedForTick = -1;
  let lastMeaningfulImpactTick = -120;
  let resultRevealTimer = 0;

  const emit = () => listeners.forEach((listener) => listener());
  const commit = (patch: Partial<JourneyDiscArenaPreviewSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    emit();
  };

  const frame = (timeMs: number) => {
    if (previousTimeMs === 0) previousTimeMs = timeMs;
    // Preserve wall-clock round pacing when an embedded or automation browser
    // briefly throttles animation frames. The one-second cap avoids an
    // unbounded catch-up after a long device sleep while keeping short tab
    // switches honest.
    accumulatorSeconds += Math.min(1, Math.max(0, (timeMs - previousTimeMs) / 1000));
    previousTimeMs = timeMs;
    let battle = snapshot.battle;
    let newestEvents: readonly JourneyDiscArenaEvent[] = [];
    let stepped = false;
    while (battle?.phase === 'running' && accumulatorSeconds >= 1 / 60) {
      const result = stepJourneyDiscArena(battle);
      battle = result.state;
      if (result.events.length > 0) newestEvents = [...newestEvents, ...result.events].slice(-32);
      accumulatorSeconds -= 1 / 60;
      stepped = true;
    }
    if (stepped && battle) {
      const shouldPublish = battle.tick % 2 === 0 || newestEvents.length > 0 || battle.phase === 'finished';
      if (shouldPublish) {
        const strongestImpact = newestEvents
          .filter((event): event is Extract<JourneyDiscArenaEvent, { type: 'impact' }> => event.type === 'impact')
          .reduce((best, event) => Math.max(best, event.strength), 0);
        const knockouts = newestEvents.filter((event) => event.type === 'knockout').length;
        const nowMs = performance.now();
        const comboStillLive = snapshot.comboExpiresAtMs > nowMs;
        const meaningfulImpact = strongestImpact >= 5.5 && battle.tick - lastMeaningfulImpactTick >= 12;
        if (meaningfulImpact) lastMeaningfulImpactTick = battle.tick;
        const combo = meaningfulImpact || knockouts > 0
          ? Math.min(9, (comboStillLive ? snapshot.combo : 0) + 1 + knockouts)
          : snapshot.combo;
        const comboExpiresAtMs = meaningfulImpact || knockouts > 0 ? nowMs + 1850 : snapshot.comboExpiresAtMs;
        const lastImpactLabel = knockouts > 0
          ? 'RING OUT!'
          : newestEvents.some((event) => event.type === 'echo_spawn')
            ? 'ECHO SPAWNED!'
            : newestEvents.some((event) => event.type === 'freeze')
              ? 'FROZEN!'
              : newestEvents.some((event) => event.type === 'speed_field')
                ? 'SPEED FIELD!'
          : strongestImpact >= 8
            ? 'CRITICAL HIT!'
            : meaningfulImpact
              ? 'RESONANCE HIT'
              : snapshot.lastImpactLabel;
        const activePlayerIds = battle.fighters
          .filter((fighter) => fighter.active && !fighter.isEcho && fighter.team === 'player')
          .map((fighter) => fighter.id);
        const selectedFighterId = snapshot.selectedFighterId && activePlayerIds.includes(snapshot.selectedFighterId)
          ? snapshot.selectedFighterId
          : activePlayerIds[0] ?? null;
        const terminal = newestEvents.find((event) => event.type === 'round_complete');
        if (terminal?.type === 'round_complete' && rewardGrantedForTick !== battle.tick) {
          rewardGrantedForTick = battle.tick;
          const won = terminal.winner === 'player';
          const scoreReport = scoreJourneyDiscArenaRound(battle);
          const bank = snapshot.roundId && scoreReport
            ? options.requestBankRound?.({
              roundId: snapshot.roundId,
              score: scoreReport.score,
              won,
              deployedDiscs: snapshot.deployedDiscCount,
              guardianTier: snapshot.encounter.class === 'guardian' ? snapshot.encounter.bossTier : undefined,
            })
            : null;
          const previewBank = !options.requestBankRound && snapshot.roundId && scoreReport
            ? applyJourneyDiscArenaRoundToProgress({
              progress: snapshot.progress,
              roundId: snapshot.roundId,
              score: scoreReport.score,
              won,
              deployedDiscs: snapshot.deployedDiscCount,
            })
            : null;
          const progress = bank?.progress ?? previewBank?.progress ?? snapshot.progress;
          const previewArmory = won && snapshot.encounter.class === 'guardian' && snapshot.encounter.bossTier > snapshot.armory.highestGuardianTierDefeated
            ? { ...snapshot.armory, highestGuardianTierDefeated: snapshot.encounter.bossTier, updatedAtMs: Date.now() }
            : snapshot.armory;
          const armory = bank?.armory ?? previewArmory;
          lineup = createInitialLineup(Math.max(progress.rank, armory.rank) as JourneyDiscArenaRank, armory);
          snapshot = {
            ...snapshot,
            mode: 'resolve',
            wins: progress.victories,
            lastRoundScore: scoreReport?.score ?? 0,
            progress,
            armory,
            playerLineup: lineup,
            selectedFighterId,
            battle,
            recentEvents: newestEvents,
            combo,
            comboExpiresAtMs,
            lastImpactLabel,
            notice: `${won ? 'Victory' : terminal.winner === 'draw' ? 'Draw' : 'Defeat'} · +${scoreReport?.score ?? 0} Disc Points`,
          };
          window.clearTimeout(resultRevealTimer);
          resultRevealTimer = window.setTimeout(() => {
            if (snapshot.mode !== 'resolve') return;
            snapshot = { ...snapshot, mode: 'result' };
            emit();
          }, 1050);
        } else {
          snapshot = { ...snapshot, battle, selectedFighterId, recentEvents: newestEvents, combo, comboExpiresAtMs, lastImpactLabel };
        }
        emit();
      } else {
        snapshot = { ...snapshot, battle };
      }
    }
    if (listeners.size > 0) animationFrame = window.requestAnimationFrame(frame);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (animationFrame === 0) animationFrame = window.requestAnimationFrame(frame);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && animationFrame !== 0) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
          previousTimeMs = 0;
        }
      };
    },
    getSnapshot: () => snapshot,
    setDeployedDiscCount(count) {
      if (snapshot.mode !== 'prep') return;
      const maximum = Math.min(4, snapshot.tickets);
      const deployedDiscCount = Math.max(0, Math.min(maximum, Math.floor(count)));
      const formationSlots = lineup.map((_, index) => index < deployedDiscCount);
      const encounter = resolveJourneyDiscArenaEncounter({ eventPoints: snapshot.progress.eventPoints, deployedDiscs: Math.max(1, deployedDiscCount), roundsStarted: snapshot.progress.roundsStarted });
      commit({ formationSlots, deployedDiscCount, encounter, notice: deployedDiscCount > 0 ? `${deployedDiscCount} disc${deployedDiscCount === 1 ? '' : 's'} · ${encounter.rivalCount} ${encounter.label} rival${encounter.rivalCount === 1 ? '' : 's'}.` : 'Tap a slot to add your first fighter.' });
    },
    toggleFormationSlot(slotIndex) {
      if (snapshot.mode !== 'prep' || slotIndex < 0 || slotIndex >= lineup.length) return;
      const formationSlots = [...snapshot.formationSlots];
      const wasOccupied = formationSlots[slotIndex] === true;
      if (!wasOccupied && snapshot.deployedDiscCount >= snapshot.tickets) {
        commit({ notice: 'That slot needs one more event ticket.' });
        return;
      }
      formationSlots[slotIndex] = !wasOccupied;
      const deployedDiscCount = formationSlots.filter(Boolean).length;
      const encounter = resolveJourneyDiscArenaEncounter({ eventPoints: snapshot.progress.eventPoints, deployedDiscs: Math.max(1, deployedDiscCount), roundsStarted: snapshot.progress.roundsStarted });
      commit({
        formationSlots,
        deployedDiscCount,
        encounter,
        notice: deployedDiscCount > 0
          ? `${deployedDiscCount} placed · costs ${deployedDiscCount} ticket${deployedDiscCount === 1 ? '' : 's'} to deploy.`
          : 'Formation empty. Tap any slot to add a fighter.',
      });
    },
    applyExternalProgress(progress, tickets) {
      lineup = createInitialLineup(Math.max(progress.rank, snapshot.armory.rank) as JourneyDiscArenaRank, snapshot.armory);
      const encounter = resolveJourneyDiscArenaEncounter({ eventPoints: progress.eventPoints, deployedDiscs: snapshot.deployedDiscCount, roundsStarted: progress.roundsStarted });
      commit({ progress, encounter, playerLineup: lineup, wins: progress.victories, ...(tickets === undefined ? {} : { tickets }), notice: 'Reward claimed. Formation energy increased.' });
    },
    claimMilestone(milestoneId) {
      if (snapshot.mode !== 'prep') return;
      const external = options.requestClaimMilestone?.(milestoneId);
      if (external) {
        if (external.ok && external.progress) {
          const armory = external.armory ?? snapshot.armory;
          lineup = createInitialLineup(Math.max(external.progress.rank, armory.rank) as JourneyDiscArenaRank, armory);
          commit({
            progress: external.progress,
            encounter: resolveJourneyDiscArenaEncounter({ eventPoints: external.progress.eventPoints, deployedDiscs: snapshot.deployedDiscCount, roundsStarted: external.progress.roundsStarted }),
            playerLineup: lineup,
            armory,
            wins: external.progress.victories,
            tickets: external.ticketsRemaining,
            notice: external.rewardLabel ? `${external.rewardLabel} claimed.` : 'Reward claimed.',
          });
        }
        return;
      }
      const milestone = getJourneyDiscArenaMilestone(milestoneId);
      if (!milestone || snapshot.progress.eventPoints < milestone.points || snapshot.progress.claimedMilestoneIds.includes(milestone.id)) return;
      const progress: JourneyDiscArenaProgressEntry = {
        ...snapshot.progress,
        rank: milestone.reward.rank ?? snapshot.progress.rank,
        claimedMilestoneIds: [...snapshot.progress.claimedMilestoneIds, milestone.id],
        updatedAtMs: Date.now(),
      };
      const armory = milestone.reward.armoryUpgrade
        ? upgradeJourneyDiscWeapon(snapshot.armory, milestone.reward.armoryUpgrade).armory
        : snapshot.armory;
      lineup = createInitialLineup(Math.max(progress.rank, armory.rank) as JourneyDiscArenaRank, armory);
      commit({
        progress,
        encounter: resolveJourneyDiscArenaEncounter({ eventPoints: progress.eventPoints, deployedDiscs: snapshot.deployedDiscCount, roundsStarted: progress.roundsStarted }),
        playerLineup: lineup,
        armory,
        tickets: snapshot.tickets + (milestone.reward.eventTickets ?? 0),
        notice: `${milestone.label} claimed in the preview.`,
      });
    },
    launchRound() {
      if (snapshot.mode !== 'prep') return;
      if (snapshot.deployedDiscCount < 1) {
        commit({ notice: 'Add at least one fighter to the formation pad.' });
        return;
      }
      if (snapshot.tickets < snapshot.deployedDiscCount) {
        const affordableCount = Math.min(4, snapshot.tickets);
        const formationSlots = lineup.map((_, index) => index < affordableCount);
        commit({
          formationSlots,
          deployedDiscCount: affordableCount,
          notice: affordableCount > 0
            ? `Only ${affordableCount} weapon disc${affordableCount === 1 ? '' : 's'} available. Formation adjusted.`
            : 'No weapon discs remain. Earn event tickets from the Island Run reward bar.',
        });
        return;
      }
      const start = options.requestStartRound?.(snapshot.deployedDiscCount);
      if (start && !start.ok) {
        commit({ tickets: start.ticketsRemaining, notice: `Need ${snapshot.deployedDiscCount} event tickets to deploy this formation.` });
        return;
      }
      roundSeed += 97;
      rewardGrantedForTick = -1;
      lastMeaningfulImpactTick = -120;
      previousTimeMs = 0;
      accumulatorSeconds = 0;
      const previewProgress = start?.progress ?? (!options.requestStartRound ? {
        ...snapshot.progress,
        roundsStarted: snapshot.progress.roundsStarted + 1,
        totalDiscsDeployed: snapshot.progress.totalDiscsDeployed + snapshot.deployedDiscCount,
        updatedAtMs: Date.now(),
      } : snapshot.progress);
      const encounter = resolveJourneyDiscArenaEncounter({
        eventPoints: snapshot.progress.eventPoints,
        deployedDiscs: snapshot.deployedDiscCount,
        roundsStarted: snapshot.progress.roundsStarted,
      });
      const selectedLineup = lineup.filter((_, index) => snapshot.formationSlots[index]);
      commit({
        mode: 'battle',
        tickets: start?.ticketsRemaining ?? Math.max(0, snapshot.tickets - snapshot.deployedDiscCount),
        roundId: start?.roundId ?? `preview:${roundSeed}:${snapshot.deployedDiscCount}`,
        progress: previewProgress,
        encounter,
        selectedFighterId: selectedLineup[0]?.id ?? null,
        battle: createJourneyDiscArenaState({
          seed: roundSeed,
          fighters: buildBattleSeeds(selectedLineup, roundSeed, encounter),
          durationSeconds: encounter.class === 'guardian' ? 32 : 24,
          openingTicks: JOURNEY_DISC_ARENA_OPENING_TICKS,
          encounter,
        }),
        recentEvents: [],
        combo: 0,
        comboExpiresAtMs: 0,
        lastImpactLabel: '',
        notice: `${encounter.label} · ${encounter.rivalCount} rival${encounter.rivalCount === 1 ? '' : 's'}.`,
      });
    },
    selectFighter(fighterId) {
      if (snapshot.mode !== 'battle' || !snapshot.battle) return;
      const fighter = snapshot.battle.fighters.find((candidate) => candidate.id === fighterId);
      if (!fighter || !fighter.active || fighter.isEcho || fighter.team !== 'player') return;
      const lineupEntry = snapshot.playerLineup.find((candidate) => candidate.id === fighterId);
      commit({ selectedFighterId: fighterId, notice: `${lineupEntry?.name ?? 'Fighter'} appointed captain.` });
    },
    triggerSurge() {
      if (snapshot.mode !== 'battle' || !snapshot.battle) return;
      const result = triggerJourneyDiscArenaSurge(snapshot.battle, snapshot.selectedFighterId);
      if (!result.accepted) {
        commit({ notice: result.failureReason === 'opening' ? 'Hold formation…' : result.failureReason === 'not_ready' ? 'Surge is recharging…' : 'No rival can be targeted.' });
        return;
      }
      const surge = result.events.find((event) => event.type === 'surge');
      const actionLabel = surge?.type === 'surge' && surge.moduleId === 'ram_fin'
        ? 'COMET RAM'
        : surge?.type === 'surge' && surge.moduleId === 'aegis_ring'
          ? 'AEGIS DRIVE'
          : surge?.type === 'surge' && surge.moduleId === 'pulse_vane'
            ? 'PULSE DASH'
            : 'RESONANCE SURGE';
      commit({
        battle: result.state,
        recentEvents: result.events,
        notice: `${actionLabel} — captain launched!`,
        lastImpactLabel: `${actionLabel}!`,
      });
    },
    launchRematch() {
      if (snapshot.mode !== 'result') return;
      const affordableCount = Math.min(snapshot.deployedDiscCount, snapshot.tickets);
      if (affordableCount < 1) {
        commit({ mode: 'prep', battle: null, notice: 'No weapon discs remain. Earn event tickets from the Island Run reward bar.' });
        return;
      }
      const start = options.requestStartRound?.(affordableCount);
      if (start && !start.ok) {
        commit({ mode: 'prep', battle: null, tickets: start.ticketsRemaining, notice: 'Earn more event tickets before the rematch.' });
        return;
      }
      roundSeed += 97;
      rewardGrantedForTick = -1;
      lastMeaningfulImpactTick = -120;
      previousTimeMs = 0;
      accumulatorSeconds = 0;
      const previewProgress = start?.progress ?? (!options.requestStartRound ? {
        ...snapshot.progress,
        roundsStarted: snapshot.progress.roundsStarted + 1,
        totalDiscsDeployed: snapshot.progress.totalDiscsDeployed + affordableCount,
        updatedAtMs: Date.now(),
      } : snapshot.progress);
      const encounter = resolveJourneyDiscArenaEncounter({
        eventPoints: snapshot.progress.eventPoints,
        deployedDiscs: affordableCount,
        roundsStarted: snapshot.progress.roundsStarted,
      });
      const selectedLineup = lineup.filter((_, index) => snapshot.formationSlots[index]).slice(0, affordableCount);
      commit({
        mode: 'battle',
        tickets: start?.ticketsRemaining ?? Math.max(0, snapshot.tickets - affordableCount),
        deployedDiscCount: affordableCount,
        roundId: start?.roundId ?? `preview:${roundSeed}:${affordableCount}`,
        progress: previewProgress,
        encounter,
        selectedFighterId: selectedLineup[0]?.id ?? null,
        battle: createJourneyDiscArenaState({
          seed: roundSeed,
          fighters: buildBattleSeeds(selectedLineup, roundSeed, encounter),
          durationSeconds: encounter.class === 'guardian' ? 32 : 24,
          openingTicks: JOURNEY_DISC_ARENA_OPENING_TICKS,
          encounter,
        }),
        recentEvents: [],
        combo: 0,
        comboExpiresAtMs: 0,
        lastImpactLabel: '',
        notice: `${encounter.label} rematch · Surge is ready.`,
      });
    },
    prepareNextRound() {
      if (snapshot.mode !== 'result') return;
      const affordableCount = Math.min(snapshot.deployedDiscCount, snapshot.tickets);
      let remaining = affordableCount;
      const formationSlots = snapshot.formationSlots.map((occupied) => occupied && remaining-- > 0);
      commit({
        mode: 'prep',
        battle: null,
        selectedFighterId: null,
        deployedDiscCount: affordableCount,
        formationSlots,
        encounter: resolveJourneyDiscArenaEncounter({ eventPoints: snapshot.progress.eventPoints, deployedDiscs: Math.max(1, affordableCount), roundsStarted: snapshot.progress.roundsStarted }),
        recentEvents: [],
        combo: 0,
        comboExpiresAtMs: 0,
        lastImpactLabel: '',
        notice: snapshot.tickets > 0
          ? `Formation adjusted to ${affordableCount} available weapon disc${affordableCount === 1 ? '' : 's'}.`
          : 'No weapon discs remain. Earn event tickets from the Island Run reward bar.',
      });
    },
    resetPreview() {
      lineup = createInitialLineup(Math.max(initialProgress.rank, initialArmory.rank) as JourneyDiscArenaRank, initialArmory);
      roundSeed = 20260813;
      rewardGrantedForTick = -1;
      lastMeaningfulImpactTick = -120;
      commit({
        mode: 'prep',
        tickets: initialTickets,
        wins: initialProgress.victories,
        deployedDiscCount: initialDeployedCount,
        roundId: null,
        lastRoundScore: 0,
        progress: initialProgress,
        encounter: resolveJourneyDiscArenaEncounter({ eventPoints: initialProgress.eventPoints, deployedDiscs: Math.max(1, initialDeployedCount), roundsStarted: initialProgress.roundsStarted }),
        armory: initialArmory,
        formationSlots: initialFormationSlots,
        playerLineup: lineup,
        selectedFighterId: null,
        battle: null,
        recentEvents: [],
        combo: 0,
        comboExpiresAtMs: 0,
        lastImpactLabel: '',
        notice: 'Prototype reset.',
      });
    },
    dispose() {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resultRevealTimer);
      animationFrame = 0;
      listeners.clear();
    },
  };
}
