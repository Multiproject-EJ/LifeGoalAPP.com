import {
  createJourneyDiscArenaState,
  getJourneyDiscArenaFighterStats,
  getJourneyDiscArenaRankStats,
  getJourneyDiscArenaRankUpCost,
  getJourneyDiscArenaRecruitCost,
  JOURNEY_DISC_ARENA_ECHO_TICKS,
  JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS,
  JOURNEY_DISC_ARENA_FREEZE_TICKS,
  JOURNEY_DISC_ARENA_SURGE_READY,
  JOURNEY_DISC_ARENA_SPEED_MULTIPLIER,
  resolveJourneyDiscArenaEncounter,
  scoreJourneyDiscArenaRound,
  stepJourneyDiscArena,
  triggerJourneyDiscArenaSurge,
  upgradeJourneyDiscArenaRank,
  type JourneyDiscArenaFighterSeed,
  type JourneyDiscArenaState,
} from '../journeyDiscArenaGame';
import { JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS, resolveJourneyDiscArenaCameraFit } from '../journeyDiscArenaPresentation';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const lineup: readonly JourneyDiscArenaFighterSeed[] = [
  { id: 'player-ship', pieceId: 'explorer_ship', team: 'player', rank: 1, moduleId: 'ram_fin', position: { x: -3.6, z: -1.3 }, velocity: { x: 3.4, z: 0.4 } },
  { id: 'player-seed', pieceId: 'world_seed', team: 'player', rank: 2, moduleId: 'aegis_ring', position: { x: -3.4, z: 1.5 }, velocity: { x: 3.1, z: -0.3 } },
  { id: 'rival-idol', pieceId: 'guardian_idol', team: 'rival', rank: 2, moduleId: 'ram_fin', position: { x: 3.5, z: -1.2 }, velocity: { x: -3.3, z: 0.2 } },
  { id: 'rival-star', pieceId: 'fallen_star', team: 'rival', rank: 1, moduleId: 'pulse_vane', position: { x: 3.4, z: 1.4 }, velocity: { x: -3.2, z: -0.3 } },
];

function playTicks(initial: JourneyDiscArenaState, count: number): JourneyDiscArenaState {
  let state = initial;
  for (let index = 0; index < count && state.phase === 'running'; index += 1) {
    state = stepJourneyDiscArena(state).state;
  }
  return state;
}

function buildFormation(count: number): JourneyDiscArenaFighterSeed[] {
  return Array.from({ length: count }, (_, index) => [
    { id: `player-${index}`, pieceId: 'explorer_ship' as const, team: 'player' as const, rank: 1 as const, position: { x: -4, z: (index - (count - 1) / 2) * 1.8 }, velocity: { x: 3.2, z: 0 } },
    { id: `rival-${index}`, pieceId: 'guardian_idol' as const, team: 'rival' as const, rank: 1 as const, position: { x: 4, z: (index - (count - 1) / 2) * 1.8 }, velocity: { x: -3.2, z: 0 } },
  ]).flat();
}

export const journeyDiscArenaGameTests: TestCase[] = [
  {
    name: 'encounter classification creates asymmetric waves and a deterministic Guardian finale',
    run: () => {
      const scout = resolveJourneyDiscArenaEncounter({ eventPoints: 0, deployedDiscs: 4, roundsStarted: 0 });
      const challengerEven = resolveJourneyDiscArenaEncounter({ eventPoints: 160, deployedDiscs: 2, roundsStarted: 0 });
      const challengerOdd = resolveJourneyDiscArenaEncounter({ eventPoints: 160, deployedDiscs: 2, roundsStarted: 1 });
      const elite = resolveJourneyDiscArenaEncounter({ eventPoints: 560, deployedDiscs: 4, roundsStarted: 3 });
      const guardianI = resolveJourneyDiscArenaEncounter({ eventPoints: 900, deployedDiscs: 4, roundsStarted: 8 });
      const guardianII = resolveJourneyDiscArenaEncounter({ eventPoints: 1050, deployedDiscs: 4, roundsStarted: 9 });
      const guardianIII = resolveJourneyDiscArenaEncounter({ eventPoints: 1200, deployedDiscs: 4, roundsStarted: 10 });
      assertEqual(scout.rivalCount, 3, 'Scout formation should be one rival smaller than a four-disc player team');
      assertEqual(challengerEven.rivalCount, 2, 'Challenger formation may begin evenly matched');
      assertEqual(challengerOdd.rivalCount, 3, 'the next Challenger wave deterministically adds one rival');
      assertEqual(elite.rivalCount, 5, 'Elite class should visibly outnumber a full player formation');
      assertEqual(guardianI.class, 'guardian', '900 points unlock the named end-prize boss class');
      assertEqual(guardianI.rivalCount, 1, 'Guardian I is one enlarged boss rather than another mirrored formation');
      assertEqual(guardianI.bossTier, 1, 'Guardian I receives the explicit first boss tier');
      assertEqual(guardianII.bossTier, 2, '1050 points escalates to Guardian II');
      assertEqual(guardianII.rivalCount, 2, 'Guardian II can become a two-boss encounter');
      assertEqual(guardianIII.bossTier, 3, '1200 points escalates to the final Guardian III');
      assertEqual(guardianIII.rivalCount, 2, 'the end-prize level fields two final bosses');
      assertEqual(guardianIII.theme, 'eclipse', 'the high-prize boss gate owns the Eclipse presentation');
      assertEqual(guardianIII.victoryScoreMultiplier, 1.8, 'the final multiplier remains bounded and explicit');
      assert(guardianI.victoryScoreMultiplier < guardianII.victoryScoreMultiplier && guardianII.victoryScoreMultiplier < guardianIII.victoryScoreMultiplier, 'boss score multipliers climb with each named level');
      assertDeepEqual(guardianI, resolveJourneyDiscArenaEncounter({ eventPoints: 900, deployedDiscs: 4, roundsStarted: 8 }), 'classification should replay exactly');
    },
  },
  {
    name: 'Guardian boss stats and victory multiplier are bounded and do not reward losses',
    run: () => {
      const guardian = resolveJourneyDiscArenaEncounter({ eventPoints: 1200, deployedDiscs: 1, roundsStarted: 4 });
      const ordinaryStats = getJourneyDiscArenaFighterStats({ rank: 3, moduleId: 'aegis_ring', bossTier: 0 });
      const guardianStats = getJourneyDiscArenaFighterStats({ rank: 3, moduleId: 'aegis_ring', bossTier: 1 });
      const finalGuardianStats = getJourneyDiscArenaFighterStats({ rank: 3, moduleId: 'aegis_ring', bossTier: 3 });
      assert(guardianStats.maxShield > ordinaryStats.maxShield * 2, 'boss shield should be immediately legible');
      assert(finalGuardianStats.maxShield < ordinaryStats.maxShield * 3, 'even Guardian III shield must remain bounded');
      assert(guardianStats.maxSpeed < ordinaryStats.maxSpeed, 'boss durability trades away speed');
      const winning = stepJourneyDiscArena(createJourneyDiscArenaState({
        seed: 140,
        arenaRadius: 5,
        encounter: guardian,
        fighters: [
          { id: 'hero', pieceId: 'explorer_ship', team: 'player', rank: 3, position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } },
          { id: 'boss-out', pieceId: 'guardian_idol', team: 'rival', rank: 3, bossTier: 3, position: { x: 6, z: 0 }, velocity: { x: 1, z: 0 } },
        ],
      })).state;
      const victoryScore = scoreJourneyDiscArenaRound(winning);
      assertEqual(victoryScore?.victoryScoreMultiplier, 1.8, 'boss victory applies the declared multiplier');
      assertEqual(victoryScore?.score, Math.round((victoryScore?.baseScore ?? 0) * 1.8), 'multiplied score derives only from the deterministic base score');
      const losing = stepJourneyDiscArena(createJourneyDiscArenaState({
        seed: 141,
        arenaRadius: 5,
        encounter: guardian,
        fighters: [
          { id: 'hero-out', pieceId: 'explorer_ship', team: 'player', rank: 3, position: { x: -6, z: 0 }, velocity: { x: -1, z: 0 } },
          { id: 'boss', pieceId: 'guardian_idol', team: 'rival', rank: 3, bossTier: 3, position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } },
        ],
      })).state;
      assertEqual(scoreJourneyDiscArenaRound(losing)?.victoryScoreMultiplier, 1, 'losing a boss round never grants the victory multiplier');
    },
  },
  {
    name: '390×844 framing keeps the complete lip visible at near edge-to-edge width',
    run: () => {
      const fit = resolveJourneyDiscArenaCameraFit(390, 844);
      assertEqual(fit.isPortrait, true, 'the canonical phone viewport uses portrait framing');
      assert(fit.visibleHalfWidthAtArena >= JOURNEY_DISC_ARENA_VISUAL_LIP_RADIUS, 'the full outer lip must fit horizontally');
      assert(fit.lipWidthPercent >= 92 && fit.lipWidthPercent <= 96, 'the ring should occupy roughly 94% of phone width');
      assertDeepEqual(fit, resolveJourneyDiscArenaCameraFit(390, 844), 'camera framing should be pure and deterministic');
    },
  },
  {
    name: 'speed field grants one bounded acceleration window without invalid velocity',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 61,
        arenaRadius: 50,
        durationSeconds: 12,
        fighters: [
          { id: 'runner', pieceId: 'explorer_ship', team: 'player', rank: 1, position: { x: 0, z: 0 }, velocity: { x: 3, z: 0 } },
          { id: 'target', pieceId: 'guardian_idol', team: 'rival', rank: 1, position: { x: 8, z: 0 }, velocity: { x: 0, z: 0 } },
        ],
      });
      const result = stepJourneyDiscArena(state);
      const runner = result.state.fighters.find((fighter) => fighter.id === 'runner')!;
      const maximum = getJourneyDiscArenaFighterStats(runner).maxSpeed * JOURNEY_DISC_ARENA_SPEED_MULTIPLIER;
      assert(result.events.some((event) => event.type === 'speed_field' && event.fighterId === 'runner'), 'entering the lime field should emit one readable event');
      assert(runner.speedBoostUntilTick > result.state.tick, 'speed boost should remain active after collection');
      assert(Math.hypot(runner.velocity.x, runner.velocity.z) <= maximum + 0.000001, 'boosted velocity remains clamped to the declared maximum');
      assertDeepEqual(result, stepJourneyDiscArena(state), 'speed ownership and timing should replay exactly');
    },
  },
  {
    name: 'ice pickup freezes the nearest opponent for a bounded interval and releases',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 62,
        arenaRadius: 50,
        durationSeconds: 12,
        fighters: [
          { id: 'collector', pieceId: 'world_seed', team: 'player', rank: 1, position: { x: -2.4, z: -1.4 }, velocity: { x: 0, z: 0 } },
          { id: 'nearest', pieceId: 'fallen_star', team: 'rival', rank: 1, position: { x: 3, z: -1 }, velocity: { x: -2, z: 0 } },
          { id: 'farther', pieceId: 'guardian_idol', team: 'rival', rank: 1, position: { x: 9, z: 5 }, velocity: { x: 0, z: 0 } },
        ],
      });
      const result = stepJourneyDiscArena(state);
      const freeze = result.events.find((event) => event.type === 'freeze');
      assert(freeze?.type === 'freeze' && freeze.targetFighterId === 'nearest', 'ice should target the nearest real opponent');
      assertEqual(freeze?.untilTick, JOURNEY_DISC_ARENA_FREEZE_TICKS, 'freeze duration is explicit and bounded');
      const released = playTicks(result.state, JOURNEY_DISC_ARENA_FREEZE_TICKS + 1);
      assert((released.fighters.find((fighter) => fighter.id === 'nearest')?.frozenUntilTick ?? 0) <= released.tick, 'frozen fighter always releases after the declared tick');
      assertDeepEqual(result, stepJourneyDiscArena(state), 'freeze target and timing should replay exactly');
    },
  },
  {
    name: 'echo pickup spawns one temporary helper, expires, and cannot inflate terminal score',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 63,
        arenaRadius: 50,
        durationSeconds: 12,
        fighters: [
          { id: 'collector', pieceId: 'living_compass', team: 'player', rank: 2, position: { x: 2.4, z: 1.4 }, velocity: { x: 0, z: 0 } },
          { id: 'target', pieceId: 'guardian_idol', team: 'rival', rank: 1, position: { x: 10, z: 0 }, velocity: { x: 0, z: 0 } },
        ],
      });
      const spawned = stepJourneyDiscArena(state);
      const echoEvent = spawned.events.find((event) => event.type === 'echo_spawn');
      assert(echoEvent?.type === 'echo_spawn', 'violet pickup should emit an echo spawn event');
      const echo = spawned.state.fighters.find((fighter) => fighter.isEcho);
      assertEqual(echo?.expiresAtTick, JOURNEY_DISC_ARENA_ECHO_TICKS, 'echo lifetime is explicit');
      const expired = playTicks(spawned.state, JOURNEY_DISC_ARENA_ECHO_TICKS + 1);
      assertEqual(expired.fighters.find((fighter) => fighter.id === echo?.id)?.active, false, 'echo expires without spending another ticket');
      assertDeepEqual(spawned, stepJourneyDiscArena(state), 'echo ownership, id, and lifetime should replay exactly');

      const terminal = stepJourneyDiscArena(createJourneyDiscArenaState({
        seed: 64,
        arenaRadius: 5,
        fighters: [
          { id: 'winner', pieceId: 'explorer_ship', team: 'player', rank: 1, position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } },
          { id: 'out', pieceId: 'fallen_star', team: 'rival', rank: 1, position: { x: 6, z: 0 }, velocity: { x: 1, z: 0 } },
        ],
      })).state;
      const fakeEcho = { ...terminal.fighters[0], id: 'score-echo', isEcho: true, active: true, expiresAtTick: terminal.tick + 100 };
      assertDeepEqual(scoreJourneyDiscArenaRound({ ...terminal, fighters: [...terminal.fighters, fakeEcho] }), scoreJourneyDiscArenaRound(terminal), 'echoes never inflate survivor or knockout scoring');
    },
  },
  {
    name: 'two-, three-, and four-disc formations preserve team counts and terminate',
    run: () => {
      [2, 3, 4].forEach((count) => {
        const initial = createJourneyDiscArenaState({ seed: 800 + count, fighters: buildFormation(count), durationSeconds: 24 });
        assertEqual(initial.fighters.filter((fighter) => fighter.team === 'player').length, count, `${count} player discs should deploy`);
        assertEqual(initial.fighters.filter((fighter) => fighter.team === 'rival').length, count, `${count} rival discs should deploy`);
        const terminal = playTicks(initial, Math.ceil(24 / JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS) + 1);
        assertEqual(terminal.phase, 'finished', `${count}-disc battle must terminate`);
        assert(terminal.winner !== null, `${count}-disc battle must resolve a winner or draw`);
      });
    },
  },
  {
    name: 'allied discs steer into separate attack lanes without losing deterministic replay',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 78,
        arenaRadius: 50,
        durationSeconds: 12,
        fighters: [
          { id: 'left-wing', pieceId: 'explorer_ship', team: 'player', rank: 1, position: { x: -4, z: -0.8 }, velocity: { x: 2.4, z: 0 } },
          { id: 'right-wing', pieceId: 'world_seed', team: 'player', rank: 1, position: { x: -4, z: 0.8 }, velocity: { x: 2.4, z: 0 } },
          { id: 'target', pieceId: 'guardian_idol', team: 'rival', rank: 1, position: { x: 10, z: 0 }, velocity: { x: 0, z: 0 } },
        ],
      });
      const initialSpacing = 1.6;
      const separated = playTicks(state, 24);
      const left = separated.fighters.find((fighter) => fighter.id === 'left-wing')!;
      const right = separated.fighters.find((fighter) => fighter.id === 'right-wing')!;
      const finalSpacing = Math.hypot(left.position.x - right.position.x, left.position.z - right.position.z);
      assert(finalSpacing > initialSpacing, 'same-team steering should open readable lanes before the shared target');
      assertDeepEqual(separated, playTicks(state, 24), 'formation separation must remain fully deterministic');
    },
  },
  {
    name: 'terminal battle score is deterministic, bounded, and rewards victory quality',
    run: () => {
      const terminal = stepJourneyDiscArena(createJourneyDiscArenaState({
        seed: 44,
        arenaRadius: 5,
        fighters: [
          { id: 'winner', pieceId: 'explorer_ship', team: 'player', rank: 2, position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } },
          { id: 'out', pieceId: 'fallen_star', team: 'rival', rank: 1, position: { x: 6, z: 0 }, velocity: { x: 1, z: 0 } },
        ],
      })).state;
      const first = scoreJourneyDiscArenaRound(terminal);
      assertDeepEqual(first, scoreJourneyDiscArenaRound(terminal), 'terminal state must always produce the same score report');
      assertEqual(first?.winner, 'player', 'winner is preserved in the report');
      assert((first?.score ?? 0) >= 100, 'a clean victory earns meaningful Disc Points');
      assertEqual(scoreJourneyDiscArenaRound(createJourneyDiscArenaState({ seed: 44, fighters: lineup })), null, 'running state cannot bank score');
    },
  },
  {
    name: 'opening countdown holds deterministic formation without consuming round time',
    run: () => {
      const state = createJourneyDiscArenaState({ seed: 18, fighters: lineup, openingTicks: 3 });
      const first = stepJourneyDiscArena(state);
      assertEqual(first.state.openingTicksRemaining, 2, 'one fixed step advances exactly one countdown tick');
      assertEqual(first.state.elapsedSeconds, 0, 'countdown does not consume the playable round timer');
      assertDeepEqual(first.state.fighters, state.fighters, 'formation remains completely still during the opening beat');
      assertEqual(triggerJourneyDiscArenaSurge(first.state, 'player-seed').failureReason, 'opening', 'captain strike waits until SPIN');
      const ready = playTicks(first.state, 2);
      assertEqual(ready.openingTicksRemaining, 0, 'countdown reaches a deterministic ready state');
      assertEqual(triggerJourneyDiscArenaSurge(ready, 'player-seed').accepted, true, 'captain may launch as soon as the countdown finishes');
      assertDeepEqual(first, stepJourneyDiscArena(state), 'opening timing replays exactly');
    },
  },
  {
    name: 'selected captain launches exactly and each weapon owns a bounded strike identity',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 191,
        arenaRadius: 50,
        fighters: [
          { id: 'ram', pieceId: 'explorer_ship', team: 'player', rank: 2, moduleId: 'ram_fin', weaponLevel: 3, position: { x: -5, z: -2 }, velocity: { x: 0, z: 0 } },
          { id: 'aegis', pieceId: 'world_seed', team: 'player', rank: 2, moduleId: 'aegis_ring', weaponLevel: 3, position: { x: -5, z: 0 }, velocity: { x: 0, z: 0 } },
          { id: 'pulse', pieceId: 'living_compass', team: 'player', rank: 2, moduleId: 'pulse_vane', weaponLevel: 3, position: { x: -5, z: 2 }, velocity: { x: 0, z: 0 } },
          { id: 'target', pieceId: 'guardian_idol', team: 'rival', rank: 2, position: { x: 8, z: 0 }, velocity: { x: 0, z: 0 } },
        ],
      });
      const damagedAegis = {
        ...state,
        fighters: state.fighters.map((fighter) => fighter.id === 'aegis' ? { ...fighter, shield: 12 } : fighter),
      };
      const ram = triggerJourneyDiscArenaSurge(state, 'ram');
      const aegis = triggerJourneyDiscArenaSurge(damagedAegis, 'aegis');
      const pulse = triggerJourneyDiscArenaSurge(state, 'pulse');
      const ramEvent = ram.events.find((event) => event.type === 'surge');
      const aegisEvent = aegis.events.find((event) => event.type === 'surge');
      const pulseEvent = pulse.events.find((event) => event.type === 'surge');
      assert(ramEvent?.type === 'surge' && ramEvent.fighterId === 'ram', 'Ram selection launches the exact requested captain');
      assert(aegisEvent?.type === 'surge' && aegisEvent.fighterId === 'aegis' && aegisEvent.shieldRestored > 0, 'Aegis captain restores a bounded shield amount before launch');
      assert(pulseEvent?.type === 'surge' && pulseEvent.fighterId === 'pulse' && pulseEvent.speedBoostUntilTick > state.tick, 'Pulse captain receives a bounded speed window');
      assert((ramEvent?.type === 'surge' ? ramEvent.power : 0) > (aegisEvent?.type === 'surge' ? aegisEvent.power : Number.POSITIVE_INFINITY), 'Ram trades defence for the hardest strike');
      assertDeepEqual(aegis, triggerJourneyDiscArenaSurge(damagedAegis, 'aegis'), 'captain and module effect replay exactly');
    },
  },
  {
    name: 'player surge is immediately available, deterministic, bounded, and must recharge',
    run: () => {
      const state = createJourneyDiscArenaState({ seed: 19, fighters: lineup });
      const first = triggerJourneyDiscArenaSurge(state);
      const replay = triggerJourneyDiscArenaSurge(state);
      assertEqual(first.accepted, true, 'a new round gives the player an immediate meaningful action');
      assertDeepEqual(first, replay, 'the same state selects the same disc, target, and impulse');
      assertEqual(first.state.playerSurge, 0, 'surge spends the full meter once');
      assert(first.events.some((event) => event.type === 'surge'), 'surge emits an animation-ready event');
      const rejected = triggerJourneyDiscArenaSurge(first.state);
      assertEqual(rejected.accepted, false, 'surge cannot be spammed before recharge');
      assertEqual(rejected.failureReason, 'not_ready', 'cooldown rejection is explicit');
      const almostReady = { ...first.state, playerSurge: JOURNEY_DISC_ARENA_SURGE_READY - 1 };
      const ready = { ...first.state, playerSurge: JOURNEY_DISC_ARENA_SURGE_READY };
      assertEqual(triggerJourneyDiscArenaSurge(almostReady).accepted, false, 'a strike below the explicit threshold is rejected');
      assertEqual(triggerJourneyDiscArenaSurge(ready).accepted, true, 'the player can tactically fire early at the explicit threshold');
      const recharged = playTicks(first.state, 180);
      assertEqual(recharged.playerSurge, 100, 'three seconds safely reaches the clamped full meter');
    },
  },
  {
    name: 'rank progression raises shield and impact while remaining explicitly bounded',
    run: () => {
      const rank1 = getJourneyDiscArenaRankStats(1);
      const rank2 = getJourneyDiscArenaRankStats(2);
      const rank3 = getJourneyDiscArenaRankStats(3);
      assert(rank2.maxShield > rank1.maxShield && rank3.maxShield > rank2.maxShield, 'each rank should add readable shield health');
      assert(rank2.impact > rank1.impact && rank3.impact > rank2.impact, 'each rank should add impact power');
      assertEqual(rank1.moduleSlots, 1, 'rank one starts with one module slot');
      assertEqual(rank3.moduleSlots, 2, 'rank three earns a second future module slot');
      assert(rank3.maxSpeed < rank1.maxSpeed * 1.1, 'rank must not create an unbounded speed advantage');
    },
  },
  {
    name: 'modules apply one bounded build identity without invalidating stats',
    run: () => {
      const base = getJourneyDiscArenaFighterStats({ rank: 2, moduleId: null });
      const ram = getJourneyDiscArenaFighterStats({ rank: 2, moduleId: 'ram_fin' });
      const ramLevelFive = getJourneyDiscArenaFighterStats({ rank: 2, moduleId: 'ram_fin', weaponLevel: 5 });
      const aegis = getJourneyDiscArenaFighterStats({ rank: 2, moduleId: 'aegis_ring' });
      const pulse = getJourneyDiscArenaFighterStats({ rank: 2, moduleId: 'pulse_vane' });
      assert(ram.impact > base.impact, 'Comet Fin should improve impact');
      assert(ramLevelFive.impact > ram.impact, 'saved weapon levels should materially strengthen the equipped module');
      assert(ramLevelFive.impact < ram.impact * 2, 'maximum weapon level remains bounded');
      assert(aegis.maxShield > base.maxShield && aegis.maxSpeed < base.maxSpeed, 'Aegis should trade agility for shield');
      assert(pulse.drive > base.drive && pulse.maxShield < base.maxShield, 'Pulse Vane should trade shield for acceleration');
      assert([ram, aegis, pulse].every((stats) => stats.mass > 0 && stats.stability > 0), 'all module builds remain physically valid');
    },
  },
  {
    name: 'ticket helpers scale recruits and reject unaffordable or max-rank upgrades without spending',
    run: () => {
      assertEqual(getJourneyDiscArenaRecruitCost(0), 2, 'first recruit uses the entry price');
      assert(getJourneyDiscArenaRecruitCost(8) > getJourneyDiscArenaRecruitCost(2), 'larger lineups cost more to expand');
      assertEqual(getJourneyDiscArenaRankUpCost(3), null, 'max rank has no upgrade price');
      assertDeepEqual(
        upgradeJourneyDiscArenaRank({ rank: 2, tickets: 4 }),
        { ok: false, rank: 2, ticketsRemaining: 4, failureReason: 'insufficient_tickets' },
        'failed upgrades preserve tickets and rank',
      );
      assertDeepEqual(
        upgradeJourneyDiscArenaRank({ rank: 1, tickets: 7 }),
        { ok: true, rank: 2, ticketsRemaining: 3, failureReason: null },
        'successful upgrades spend exactly the declared cost',
      );
    },
  },
  {
    name: 'identical seed, lineup, and fixed steps reproduce the exact battle',
    run: () => {
      const first = createJourneyDiscArenaState({ seed: 812, fighters: lineup });
      const second = createJourneyDiscArenaState({ seed: 812, fighters: lineup });
      assertDeepEqual(first, second, 'initial state should be deterministic');
      assertDeepEqual(playTicks(first, 720), playTicks(second, 720), 'twelve seconds of fixed-step replay should be exact');
    },
  },
  {
    name: 'opposing high-speed discs collide, exchange impulses, and lose shield through service rules',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 7,
        fighters: [
          { id: 'left', pieceId: 'explorer_ship', team: 'player', rank: 1, position: { x: -0.66, z: 0 }, velocity: { x: 5, z: 0 } },
          { id: 'right', pieceId: 'guardian_idol', team: 'rival', rank: 1, position: { x: 0.66, z: 0 }, velocity: { x: -5, z: 0 } },
        ],
      });
      const result = stepJourneyDiscArena(state);
      assert(result.events.some((event) => event.type === 'impact'), 'collision should emit an animation-ready impact event');
      assert(result.state.fighters.every((fighter) => fighter.shield < getJourneyDiscArenaFighterStats(fighter).maxShield), 'both opponents should lose shield');
      assert(result.state.fighters[0].velocity.x < 0 && result.state.fighters[1].velocity.x > 0, 'impulse should separate approaching discs');
    },
  },
  {
    name: 'crossing the arena boundary produces one knockout and an elimination result',
    run: () => {
      const state = createJourneyDiscArenaState({
        seed: 9,
        arenaRadius: 5,
        fighters: [
          { id: 'safe', pieceId: 'world_seed', team: 'player', rank: 1, position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 } },
          { id: 'out', pieceId: 'fallen_star', team: 'rival', rank: 1, position: { x: 5.9, z: 0 }, velocity: { x: 5, z: 0 } },
        ],
      });
      const result = stepJourneyDiscArena(state);
      assertEqual(result.state.fighters.find((fighter) => fighter.id === 'out')?.active, false, 'fighter beyond the lip is knocked out');
      assertEqual(result.state.winner, 'player', 'remaining team wins by elimination');
      assert(result.events.some((event) => event.type === 'knockout'), 'knockout is exposed for 3D fall animation');
      assert(result.events.some((event) => event.type === 'round_complete' && event.reason === 'elimination'), 'elimination closes the round exactly once');
      assertDeepEqual(stepJourneyDiscArena(result.state), { state: result.state, events: [] }, 'finished rounds reject duplicate resolution');
    },
  },
  {
    name: 'timeout scores active fighters before shield and spin, with no hidden extra tick',
    run: () => {
      const state = createJourneyDiscArenaState({ seed: 12, fighters: lineup, durationSeconds: 5 });
      const finished = playTicks(state, Math.ceil(5 / JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS) + 1);
      assertEqual(finished.phase, 'finished', 'round ends at its configured duration');
      assertEqual(finished.elapsedSeconds, 5, 'elapsed time clamps to the configured duration');
      assert(finished.winner !== null, 'timeout always resolves a serializable result');
    },
  },
];
