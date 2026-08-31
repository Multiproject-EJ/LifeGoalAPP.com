import type { PlayerPieceId } from './islandRunPlayerPieces';

/**
 * Pure, deterministic rules for the Journey Disc Arena event exhibition.
 *
 * This module owns arena-local rank stats, steering, impacts, shields,
 * ring-outs, and timeout scoring. Rendering, audio, canonical ticket spending,
 * persistence, and event rewards deliberately live outside the engine.
 */

export const JOURNEY_DISC_ARENA_VERSION = 1 as const;
export const JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS = 1 / 60;
export const JOURNEY_DISC_ARENA_DEFAULT_RADIUS = 8.8;
export const JOURNEY_DISC_ARENA_DEFAULT_ROUND_SECONDS = 55;
export const JOURNEY_DISC_ARENA_MAX_FIGHTERS = 16;
/** Active battle-team capacity. The owned collection is a separate concern. */
export const JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS = 6;
export const JOURNEY_DISC_ARENA_MAX_SURGE = 100;
export const JOURNEY_DISC_ARENA_SURGE_READY = 70;
export const JOURNEY_DISC_ARENA_SURGE_RECHARGE_PER_SECOND = 34;
export const JOURNEY_DISC_ARENA_FREEZE_MAX_CHARGE = 100;
export const JOURNEY_DISC_ARENA_FREEZE_READY = 100;
export const JOURNEY_DISC_ARENA_FREEZE_RECHARGE_PER_SECOND = 14;
export const JOURNEY_DISC_ARENA_FREEZE_TICKS = 180;
export const JOURNEY_DISC_ARENA_ECHO_TICKS = 360;
export const JOURNEY_DISC_ARENA_SPEED_BOOST_TICKS = 90;
export const JOURNEY_DISC_ARENA_SPEED_MULTIPLIER = 1.38;
export const JOURNEY_DISC_ARENA_OPENING_TICKS = 120;

export type JourneyDiscArenaRank = 1 | 2 | 3;
export type JourneyDiscArenaTeam = 'player' | 'rival';
export type JourneyDiscArenaPhase = 'running' | 'finished';
export type JourneyDiscArenaWinner = JourneyDiscArenaTeam | 'draw' | null;
export type JourneyDiscArenaModuleId = 'ram_fin' | 'aegis_ring' | 'pulse_vane' | null;
export type JourneyDiscArenaPowerupType = 'freeze' | 'echo';
export type JourneyDiscArenaArenaShape = 'circle' | 'rectangle';
export type JourneyDiscArenaTheme = 'pearl' | 'eclipse';
export type JourneyDiscArenaEncounterClass = 'scout' | 'challenger' | 'elite' | 'guardian';
export type JourneyDiscArenaBossTier = 0 | 1 | 2 | 3;

export interface JourneyDiscArenaEncounterProfile {
  id: string;
  class: JourneyDiscArenaEncounterClass;
  label: string;
  rivalCount: number;
  rivalRankFloor: JourneyDiscArenaRank;
  bossTier: JourneyDiscArenaBossTier;
  victoryScoreMultiplier: number;
  theme: JourneyDiscArenaTheme;
}

export interface JourneyDiscArenaObstacle {
  id: string;
  shape: 'circle' | 'box';
  position: JourneyDiscArenaVector;
  radius?: number;
  halfExtents?: JourneyDiscArenaVector;
}

export interface JourneyDiscArenaProfile {
  id: string;
  shape: JourneyDiscArenaArenaShape;
  theme: JourneyDiscArenaTheme;
  radius: number;
  halfExtents: JourneyDiscArenaVector | null;
  obstacles: readonly JourneyDiscArenaObstacle[];
}

export interface JourneyDiscArenaVector {
  x: number;
  z: number;
}

export interface JourneyDiscArenaRankStats {
  rank: JourneyDiscArenaRank;
  name: string;
  maxShield: number;
  maxSpin: number;
  mass: number;
  radius: number;
  drive: number;
  maxSpeed: number;
  impact: number;
  stability: number;
  spinDrainPerSecond: number;
  moduleSlots: number;
}

export interface JourneyDiscArenaModuleDefinition {
  id: Exclude<JourneyDiscArenaModuleId, null>;
  name: string;
  description: string;
  shieldDelta: number;
  massDelta: number;
  driveDelta: number;
  maxSpeedDelta: number;
  impactDelta: number;
  stabilityDelta: number;
}

export interface JourneyDiscArenaFighterSeed {
  id: string;
  pieceId: PlayerPieceId;
  team: JourneyDiscArenaTeam;
  rank: JourneyDiscArenaRank;
  bossTier?: JourneyDiscArenaBossTier;
  weaponLevel?: number;
  moduleId?: JourneyDiscArenaModuleId;
  position: JourneyDiscArenaVector;
  velocity?: JourneyDiscArenaVector;
}

export interface JourneyDiscArenaFighterState {
  id: string;
  pieceId: PlayerPieceId;
  team: JourneyDiscArenaTeam;
  rank: JourneyDiscArenaRank;
  bossTier: JourneyDiscArenaBossTier;
  weaponLevel: number;
  moduleId: JourneyDiscArenaModuleId;
  position: JourneyDiscArenaVector;
  velocity: JourneyDiscArenaVector;
  shield: number;
  spin: number;
  active: boolean;
  shieldBroken: boolean;
  lastHitBy: string | null;
  frozenUntilTick: number;
  speedBoostUntilTick: number;
  expiresAtTick: number | null;
  isEcho: boolean;
}

export interface JourneyDiscArenaPowerupState {
  id: string;
  type: JourneyDiscArenaPowerupType;
  position: JourneyDiscArenaVector;
  active: boolean;
}

export interface JourneyDiscArenaSpeedFieldState {
  position: JourneyDiscArenaVector;
  radius: number;
}

export interface JourneyDiscArenaState {
  version: typeof JOURNEY_DISC_ARENA_VERSION;
  seed: number;
  tick: number;
  elapsedSeconds: number;
  durationSeconds: number;
  arenaRadius: number;
  arenaProfile: JourneyDiscArenaProfile;
  encounter: JourneyDiscArenaEncounterProfile;
  phase: JourneyDiscArenaPhase;
  winner: JourneyDiscArenaWinner;
  openingTicksRemaining: number;
  playerSurge: number;
  playerFreezeCharge: number;
  fighters: readonly JourneyDiscArenaFighterState[];
  speedField: JourneyDiscArenaSpeedFieldState;
  powerups: readonly JourneyDiscArenaPowerupState[];
}

export type JourneyDiscArenaEvent =
  | { type: 'impact'; fighterAId: string; fighterBId: string; strength: number }
  | { type: 'surge'; fighterId: string; targetFighterId: string; power: number; moduleId: JourneyDiscArenaModuleId; shieldRestored: number; speedBoostUntilTick: number }
  | { type: 'shield_break'; fighterId: string; byFighterId: string }
  | { type: 'knockout'; fighterId: string; byFighterId: string | null }
  | { type: 'speed_field'; fighterId: string }
  | { type: 'freeze'; collectorFighterId: string; targetFighterId: string; untilTick: number }
  | { type: 'drive_off'; attackerFighterId: string; targetFighterId: string; succeeded: boolean; power: number }
  | { type: 'echo_spawn'; collectorFighterId: string; echoFighterId: string; untilTick: number }
  | { type: 'echo_expired'; fighterId: string }
  | { type: 'round_complete'; winner: Exclude<JourneyDiscArenaWinner, null>; reason: 'elimination' | 'timeout' };

export interface JourneyDiscArenaStepResult {
  state: JourneyDiscArenaState;
  events: readonly JourneyDiscArenaEvent[];
}

export interface JourneyDiscArenaSurgeResult {
  accepted: boolean;
  failureReason: 'round_finished' | 'opening' | 'not_ready' | 'no_target' | null;
  state: JourneyDiscArenaState;
  events: readonly JourneyDiscArenaEvent[];
}

export interface JourneyDiscArenaFreezeAttackResult {
  accepted: boolean;
  failureReason: 'round_finished' | 'opening' | 'not_ready' | 'no_target' | null;
  state: JourneyDiscArenaState;
  events: readonly JourneyDiscArenaEvent[];
}

export interface JourneyDiscArenaUpgradeResult {
  ok: boolean;
  rank: JourneyDiscArenaRank;
  ticketsRemaining: number;
  failureReason: 'max_rank' | 'insufficient_tickets' | null;
}

export interface JourneyDiscArenaRoundScore {
  score: number;
  baseScore: number;
  encounterClass: JourneyDiscArenaEncounterClass;
  victoryScoreMultiplier: number;
  winner: Exclude<JourneyDiscArenaWinner, null>;
  survivors: number;
  knockouts: number;
  shieldPercent: number;
  timeBonus: number;
}

const RANK_STATS: Readonly<Record<JourneyDiscArenaRank, JourneyDiscArenaRankStats>> = Object.freeze({
  1: Object.freeze({
    rank: 1,
    name: 'Kindled',
    maxShield: 74,
    maxSpin: 100,
    mass: 1,
    radius: 0.68,
    drive: 5.3,
    maxSpeed: 6.6,
    impact: 1,
    stability: 0.86,
    spinDrainPerSecond: 3.2,
    moduleSlots: 1,
  }),
  2: Object.freeze({
    rank: 2,
    name: 'Resonant',
    maxShield: 98,
    maxSpin: 112,
    mass: 1.16,
    radius: 0.74,
    drive: 5.45,
    maxSpeed: 6.85,
    impact: 1.18,
    stability: 1.02,
    spinDrainPerSecond: 2.95,
    moduleSlots: 1,
  }),
  3: Object.freeze({
    rank: 3,
    name: 'Ascendant',
    maxShield: 128,
    maxSpin: 126,
    mass: 1.34,
    radius: 0.81,
    drive: 5.6,
    maxSpeed: 7.1,
    impact: 1.38,
    stability: 1.2,
    spinDrainPerSecond: 2.7,
    moduleSlots: 2,
  }),
});

export const JOURNEY_DISC_ARENA_MODULES: Readonly<Record<Exclude<JourneyDiscArenaModuleId, null>, JourneyDiscArenaModuleDefinition>> = Object.freeze({
  ram_fin: Object.freeze({
    id: 'ram_fin',
    name: 'Comet Fin',
    description: 'A forward energy fin that converts speed into stronger impacts.',
    shieldDelta: 0,
    massDelta: 0.04,
    driveDelta: 0,
    maxSpeedDelta: 0.1,
    impactDelta: 0.2,
    stabilityDelta: -0.02,
  }),
  aegis_ring: Object.freeze({
    id: 'aegis_ring',
    name: 'Aegis Ring',
    description: 'A wider shield rail that absorbs hits but makes the disc less agile.',
    shieldDelta: 16,
    massDelta: 0.1,
    driveDelta: -0.2,
    maxSpeedDelta: -0.25,
    impactDelta: 0,
    stabilityDelta: 0.16,
  }),
  pulse_vane: Object.freeze({
    id: 'pulse_vane',
    name: 'Pulse Vane',
    description: 'An energy sail that accelerates quickly at the cost of a thinner shield.',
    shieldDelta: -5,
    massDelta: -0.03,
    driveDelta: 0.48,
    maxSpeedDelta: 0.38,
    impactDelta: 0.04,
    stabilityDelta: -0.08,
  }),
});

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const length = (vector: JourneyDiscArenaVector): number => Math.hypot(vector.x, vector.z);
const normalize = (vector: JourneyDiscArenaVector): JourneyDiscArenaVector => {
  const magnitude = length(vector);
  return magnitude > 0.000001 ? { x: vector.x / magnitude, z: vector.z / magnitude } : { x: 1, z: 0 };
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getJourneyDiscArenaRankStats(rank: JourneyDiscArenaRank): JourneyDiscArenaRankStats {
  return RANK_STATS[rank];
}

export function getJourneyDiscArenaModule(moduleId: JourneyDiscArenaModuleId): JourneyDiscArenaModuleDefinition | null {
  return moduleId ? JOURNEY_DISC_ARENA_MODULES[moduleId] : null;
}

export function getJourneyDiscArenaFighterStats(
  fighter: Pick<JourneyDiscArenaFighterState, 'rank' | 'moduleId'> & Partial<Pick<JourneyDiscArenaFighterState, 'bossTier' | 'weaponLevel'>>,
): JourneyDiscArenaRankStats {
  const base = getJourneyDiscArenaRankStats(fighter.rank);
  const module = getJourneyDiscArenaModule(fighter.moduleId);
  const weaponLevel = module ? Math.max(1, Math.min(5, Math.floor(fighter.weaponLevel ?? 1))) : 0;
  const moduleScale = 1 + Math.max(0, weaponLevel - 1) * 0.18;
  const moduleStats = !module ? base : {
    ...base,
    maxShield: Math.max(1, base.maxShield + module.shieldDelta * moduleScale),
    mass: Math.max(0.2, base.mass + module.massDelta * moduleScale),
    drive: Math.max(0.2, base.drive + module.driveDelta * moduleScale),
    maxSpeed: Math.max(0.5, base.maxSpeed + module.maxSpeedDelta * moduleScale),
    impact: Math.max(0.2, base.impact + module.impactDelta * moduleScale),
    stability: Math.max(0.2, base.stability + module.stabilityDelta * moduleScale),
  };
  const bossTier = fighter.bossTier === 1 || fighter.bossTier === 2 || fighter.bossTier === 3 ? fighter.bossTier : 0;
  if (bossTier === 0) return moduleStats;
  return {
    ...moduleStats,
    name: `Guardian ${bossTier} ${moduleStats.name}`,
    maxShield: Math.round(moduleStats.maxShield * (2.05 + bossTier * 0.3)),
    maxSpin: Math.round(moduleStats.maxSpin * (1.15 + bossTier * 0.1)),
    mass: moduleStats.mass * (1.3 + bossTier * 0.12),
    radius: moduleStats.radius * (1.2 + bossTier * 0.1),
    drive: moduleStats.drive * (0.96 - bossTier * 0.04),
    maxSpeed: moduleStats.maxSpeed * (1 - bossTier * 0.1),
    impact: moduleStats.impact * (1.2 + bossTier * 0.12),
    stability: moduleStats.stability * (1.31 + bossTier * 0.15),
  };
}

export function resolveJourneyDiscArenaEncounter(options: {
  eventPoints: number;
  deployedDiscs: number;
  roundsStarted?: number;
}): JourneyDiscArenaEncounterProfile {
  const points = Math.max(0, Math.floor(options.eventPoints));
  const deployed = Math.max(1, Math.min(JOURNEY_DISC_ARENA_MAX_ACTIVE_DISCS, Math.floor(options.deployedDiscs)));
  const roundsStarted = Math.max(0, Math.floor(options.roundsStarted ?? 0));
  if (points >= 900) {
    const bossTier: JourneyDiscArenaBossTier = points >= 1200 ? 3 : points >= 1050 ? 2 : 1;
    return {
      id: `island_guardian_${bossTier}_v1`,
      class: 'guardian',
      label: `Island Guardian ${['', 'I', 'II', 'III'][bossTier]}`,
      rivalCount: bossTier === 3 ? 2 : bossTier === 2 && deployed >= 2 ? 2 : 1,
      rivalRankFloor: 3,
      bossTier,
      victoryScoreMultiplier: bossTier === 3 ? 1.8 : bossTier === 2 ? 1.6 : 1.4,
      theme: 'eclipse',
    };
  }
  if (points >= 560) {
    return {
      id: 'elite_concourse_v1',
      class: 'elite',
      label: 'Elite Concourse',
      rivalCount: Math.min(6, deployed + 1),
      rivalRankFloor: 2,
      bossTier: 0,
      victoryScoreMultiplier: 1.35,
      theme: 'pearl',
    };
  }
  if (points >= 160) {
    return {
      id: 'challenger_wave_v1',
      class: 'challenger',
      label: 'Challenger Wave',
      rivalCount: Math.min(5, deployed + (roundsStarted % 2)),
      rivalRankFloor: 2,
      bossTier: 0,
      victoryScoreMultiplier: 1.15,
      theme: 'pearl',
    };
  }
  return {
    id: 'scout_exhibition_v1',
    class: 'scout',
    label: 'Scout Exhibition',
    rivalCount: Math.max(1, deployed - 1),
    rivalRankFloor: 1,
    bossTier: 0,
    victoryScoreMultiplier: 1,
    theme: 'pearl',
  };
}

export function getJourneyDiscArenaRecruitCost(ownedFighterCount: number): number {
  const count = Math.max(0, Math.trunc(ownedFighterCount));
  return 2 + Math.floor(count / 2);
}

export function getJourneyDiscArenaRankUpCost(rank: JourneyDiscArenaRank): number | null {
  if (rank === 1) return 4;
  if (rank === 2) return 9;
  return null;
}

/**
 * Resolve the only score report accepted by event progression. Every input is
 * terminal simulation state, so the score is reproducible and independent of
 * React render timing or cumulative local wins.
 */
export function scoreJourneyDiscArenaRound(state: JourneyDiscArenaState): JourneyDiscArenaRoundScore | null {
  if (state.phase !== 'finished' || state.winner === null) return null;
  const player = state.fighters.filter((fighter) => fighter.team === 'player' && !fighter.isEcho);
  const rivals = state.fighters.filter((fighter) => fighter.team === 'rival' && !fighter.isEcho);
  const survivors = player.filter((fighter) => fighter.active).length;
  const knockouts = rivals.filter((fighter) => !fighter.active).length;
  const shieldRatio = player.reduce((total, fighter) => {
    const maximum = getJourneyDiscArenaFighterStats(fighter).maxShield;
    return total + (fighter.active ? fighter.shield / maximum : 0);
  }, 0) / Math.max(1, player.length);
  const shieldPercent = Math.max(0, Math.min(100, Math.round(shieldRatio * 100)));
  const timeBonus = state.winner === 'player'
    ? Math.max(0, Math.round((state.durationSeconds - state.elapsedSeconds) * 2))
    : 0;
  const baseScore = Math.max(10, Math.round(
    20
      + knockouts * 28
      + survivors * 14
      + shieldPercent * 0.35
      + timeBonus
      + (state.winner === 'player' ? 60 : state.winner === 'draw' ? 25 : 0),
  ));
  const victoryScoreMultiplier = state.winner === 'player' ? state.encounter.victoryScoreMultiplier : 1;
  const score = Math.max(10, Math.round(baseScore * victoryScoreMultiplier));
  return {
    score,
    baseScore,
    encounterClass: state.encounter.class,
    victoryScoreMultiplier,
    winner: state.winner,
    survivors,
    knockouts,
    shieldPercent,
    timeBonus,
  };
}

export function upgradeJourneyDiscArenaRank(options: {
  rank: JourneyDiscArenaRank;
  tickets: number;
}): JourneyDiscArenaUpgradeResult {
  const tickets = Math.max(0, Math.trunc(options.tickets));
  const cost = getJourneyDiscArenaRankUpCost(options.rank);
  if (cost === null) {
    return { ok: false, rank: options.rank, ticketsRemaining: tickets, failureReason: 'max_rank' };
  }
  if (tickets < cost) {
    return { ok: false, rank: options.rank, ticketsRemaining: tickets, failureReason: 'insufficient_tickets' };
  }
  return {
    ok: true,
    rank: (options.rank + 1) as JourneyDiscArenaRank,
    ticketsRemaining: tickets - cost,
    failureReason: null,
  };
}

export function createJourneyDiscArenaState(options: {
  seed: number;
  fighters: readonly JourneyDiscArenaFighterSeed[];
  arenaRadius?: number;
  durationSeconds?: number;
  openingTicks?: number;
  theme?: JourneyDiscArenaTheme;
  encounter?: JourneyDiscArenaEncounterProfile;
}): JourneyDiscArenaState {
  const requestedRadius = Math.max(3, Number.isFinite(options.arenaRadius) ? options.arenaRadius as number : JOURNEY_DISC_ARENA_DEFAULT_RADIUS);
  const encounter = options.encounter ?? resolveJourneyDiscArenaEncounter({
    eventPoints: 0,
    deployedDiscs: Math.max(1, options.fighters.filter((fighter) => fighter.team === 'player').length),
  });
  const theme = options.theme ?? encounter.theme;
  const arenaProfile: JourneyDiscArenaProfile = {
    id: theme === 'eclipse' ? 'island_concourse_eclipse_v1' : 'island_concourse_pearl_v1',
    shape: 'circle',
    theme,
    radius: requestedRadius,
    halfExtents: null,
    obstacles: [],
  };
  const arenaRadius = Math.max(3, arenaProfile.radius);
  const durationSeconds = Math.max(5, Number.isFinite(options.durationSeconds) ? options.durationSeconds as number : JOURNEY_DISC_ARENA_DEFAULT_ROUND_SECONDS);
  const fighters = options.fighters.slice(0, JOURNEY_DISC_ARENA_MAX_FIGHTERS).map((seed, index) => {
    const moduleId = seed.moduleId ?? null;
    const weaponLevel = moduleId ? Math.max(1, Math.min(5, Math.floor(seed.weaponLevel ?? 1))) : 0;
    const stats = getJourneyDiscArenaFighterStats({ rank: seed.rank, moduleId, bossTier: seed.bossTier ?? 0, weaponLevel });
    const fallbackAngle = ((stableHash(seed.id) ^ options.seed ^ index) % 6283) / 1000;
    const fallbackVelocity = {
      x: Math.cos(fallbackAngle) * stats.maxSpeed * 0.48,
      z: Math.sin(fallbackAngle) * stats.maxSpeed * 0.48,
    };
    return {
      id: seed.id,
      pieceId: seed.pieceId,
      team: seed.team,
      rank: seed.rank,
      bossTier: seed.bossTier ?? 0,
      weaponLevel,
      moduleId,
      position: { x: seed.position.x, z: seed.position.z },
      velocity: seed.velocity ? { x: seed.velocity.x, z: seed.velocity.z } : fallbackVelocity,
      shield: stats.maxShield,
      spin: stats.maxSpin,
      active: true,
      shieldBroken: false,
      lastHitBy: null,
      frozenUntilTick: 0,
      speedBoostUntilTick: 0,
      expiresAtTick: null,
      isEcho: false,
    } satisfies JourneyDiscArenaFighterState;
  });

  return {
    version: JOURNEY_DISC_ARENA_VERSION,
    seed: options.seed >>> 0,
    tick: 0,
    elapsedSeconds: 0,
    durationSeconds,
    arenaRadius,
    arenaProfile,
    encounter,
    phase: 'running',
    winner: null,
    openingTicksRemaining: Math.max(0, Math.floor(options.openingTicks ?? 0)),
    playerSurge: JOURNEY_DISC_ARENA_MAX_SURGE,
    playerFreezeCharge: JOURNEY_DISC_ARENA_FREEZE_MAX_CHARGE,
    fighters,
    speedField: { position: { x: 0, z: 0 }, radius: 1.75 },
    powerups: [
      { id: 'freeze-core', type: 'freeze', position: { x: -2.4, z: -1.4 }, active: true },
      { id: 'echo-core', type: 'echo', position: { x: 2.4, z: 1.4 }, active: true },
    ],
  };
}

/**
 * Deterministic 19-in-20 drive-off execution. The rare failure keeps edge
 * attacks dramatic without hiding a random source inside the fixed-step loop.
 */
export function doesJourneyDiscDriveOffSucceed(options: {
  seed: number;
  attemptIndex: number;
  attackerFighterId: string;
  targetFighterId: string;
}): boolean {
  const phase = stableHash(`${options.seed >>> 0}:${options.attackerFighterId}:${options.targetFighterId}`) % 20;
  return (Math.max(0, Math.floor(options.attemptIndex)) + phase) % 20 !== 0;
}

/**
 * Spend the shared player surge meter to launch the best-positioned active disc
 * at its nearest rival. Input stays deterministic and serializable: the service
 * selects the fighter/target from state, applies one bounded impulse, and emits
 * the presentation event consumed by the Three.js layer.
 */
export function triggerJourneyDiscArenaSurge(state: JourneyDiscArenaState, requestedFighterId: string | null = null): JourneyDiscArenaSurgeResult {
  if (state.phase !== 'running') {
    return { accepted: false, failureReason: 'round_finished', state, events: [] };
  }
  if (state.openingTicksRemaining > 0) {
    return { accepted: false, failureReason: 'opening', state, events: [] };
  }
  if (state.playerSurge < JOURNEY_DISC_ARENA_SURGE_READY) {
    return { accepted: false, failureReason: 'not_ready', state, events: [] };
  }
  const fighters = state.fighters.map((fighter) => ({
    ...fighter,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
  }));
  const candidates = fighters
    .filter((fighter) => fighter.active && fighter.team === 'player')
    .map((fighter) => ({ fighter, target: nearestOpponent(fighter, fighters) }))
    .filter((entry): entry is { fighter: JourneyDiscArenaFighterState; target: JourneyDiscArenaFighterState } => entry.target !== null)
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.target.position.x - left.fighter.position.x, left.target.position.z - left.fighter.position.z);
      const rightDistance = Math.hypot(right.target.position.x - right.fighter.position.x, right.target.position.z - right.fighter.position.z);
      return leftDistance - rightDistance || left.fighter.id.localeCompare(right.fighter.id);
    });
  const chosen = candidates.find((entry) => entry.fighter.id === requestedFighterId) ?? candidates[0];
  if (!chosen) return { accepted: false, failureReason: 'no_target', state, events: [] };

  const direction = normalize({
    x: chosen.target.position.x - chosen.fighter.position.x,
    z: chosen.target.position.z - chosen.fighter.position.z,
  });
  const stats = getJourneyDiscArenaFighterStats(chosen.fighter);
  const chargeRatio = clamp(state.playerSurge / JOURNEY_DISC_ARENA_MAX_SURGE, 0, 1);
  const modulePowerMultiplier = chosen.fighter.moduleId === 'ram_fin'
    ? 1.16
    : chosen.fighter.moduleId === 'aegis_ring'
      ? 0.94
      : chosen.fighter.moduleId === 'pulse_vane'
        ? 1.03
        : 1;
  const power = stats.maxSpeed * (1.12 + chargeRatio * 0.54) * modulePowerMultiplier;
  const shieldBefore = chosen.fighter.shield;
  if (chosen.fighter.moduleId === 'aegis_ring') {
    const restorationRatio = 0.1 + chosen.fighter.weaponLevel * 0.015;
    chosen.fighter.shield = Math.min(stats.maxShield, chosen.fighter.shield + Math.round(stats.maxShield * restorationRatio));
    if (chosen.fighter.shield > 0) chosen.fighter.shieldBroken = false;
  }
  if (chosen.fighter.moduleId === 'pulse_vane') {
    chosen.fighter.speedBoostUntilTick = Math.max(chosen.fighter.speedBoostUntilTick, state.tick + JOURNEY_DISC_ARENA_SPEED_BOOST_TICKS);
  }
  chosen.fighter.velocity = { x: direction.x * power, z: direction.z * power };
  chosen.fighter.spin = Math.min(stats.maxSpin, chosen.fighter.spin + stats.maxSpin * (0.08 + chargeRatio * 0.1));
  return {
    accepted: true,
    failureReason: null,
    state: { ...state, playerSurge: 0, fighters },
    events: [{
      type: 'surge',
      fighterId: chosen.fighter.id,
      targetFighterId: chosen.target.id,
      power,
      moduleId: chosen.fighter.moduleId,
      shieldRestored: chosen.fighter.shield - shieldBefore,
      speedBoostUntilTick: chosen.fighter.speedBoostUntilTick,
    }],
  };
}

/** Fire a visible, player-controlled freeze pulse from the selected captain. */
export function triggerJourneyDiscArenaFreezeAttack(
  state: JourneyDiscArenaState,
  requestedFighterId: string | null = null,
): JourneyDiscArenaFreezeAttackResult {
  if (state.phase !== 'running') {
    return { accepted: false, failureReason: 'round_finished', state, events: [] };
  }
  if (state.openingTicksRemaining > 0) {
    return { accepted: false, failureReason: 'opening', state, events: [] };
  }
  if (state.playerFreezeCharge < JOURNEY_DISC_ARENA_FREEZE_READY) {
    return { accepted: false, failureReason: 'not_ready', state, events: [] };
  }
  const fighters = state.fighters.map((fighter) => ({
    ...fighter,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
  }));
  const sources = fighters
    .filter((fighter) => fighter.active && !fighter.isEcho && fighter.team === 'player')
    .sort((left, right) => left.id.localeCompare(right.id));
  const source = sources.find((fighter) => fighter.id === requestedFighterId) ?? sources[0];
  const target = source ? nearestOpponent(source, fighters.filter((fighter) => !fighter.isEcho)) : null;
  if (!source || !target) return { accepted: false, failureReason: 'no_target', state, events: [] };

  target.frozenUntilTick = state.tick + JOURNEY_DISC_ARENA_FREEZE_TICKS;
  target.velocity = { x: 0, z: 0 };
  return {
    accepted: true,
    failureReason: null,
    state: { ...state, playerFreezeCharge: 0, fighters },
    events: [{
      type: 'freeze',
      collectorFighterId: source.id,
      targetFighterId: target.id,
      untilTick: target.frozenUntilTick,
    }],
  };
}

function nearestOpponent(
  fighter: JourneyDiscArenaFighterState,
  fighters: readonly JourneyDiscArenaFighterState[],
): JourneyDiscArenaFighterState | null {
  let target: JourneyDiscArenaFighterState | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of fighters) {
    if (!candidate.active || candidate.team === fighter.team) continue;
    const dx = candidate.position.x - fighter.position.x;
    const dz = candidate.position.z - fighter.position.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < bestDistance || (distanceSquared === bestDistance && candidate.id < (target?.id ?? ''))) {
      bestDistance = distanceSquared;
      target = candidate;
    }
  }
  return target;
}

function resolveWinner(fighters: readonly JourneyDiscArenaFighterState[]): JourneyDiscArenaWinner {
  const playerActive = fighters.some((fighter) => fighter.active && !fighter.isEcho && fighter.team === 'player');
  const rivalActive = fighters.some((fighter) => fighter.active && !fighter.isEcho && fighter.team === 'rival');
  if (playerActive && rivalActive) return null;
  if (playerActive) return 'player';
  if (rivalActive) return 'rival';
  return 'draw';
}

function resolveTimeoutWinner(fighters: readonly JourneyDiscArenaFighterState[]): Exclude<JourneyDiscArenaWinner, null> {
  const score = (team: JourneyDiscArenaTeam) => {
    const active = fighters.filter((fighter) => fighter.active && !fighter.isEcho && fighter.team === team);
    return {
      activeCount: active.length,
      shieldRatio: active.reduce((total, fighter) => {
        const stats = getJourneyDiscArenaFighterStats(fighter);
        return total + fighter.shield / stats.maxShield;
      }, 0),
      spinRatio: active.reduce((total, fighter) => {
        const stats = getJourneyDiscArenaFighterStats(fighter);
        return total + fighter.spin / stats.maxSpin;
      }, 0),
    };
  };
  const player = score('player');
  const rival = score('rival');
  if (player.activeCount !== rival.activeCount) return player.activeCount > rival.activeCount ? 'player' : 'rival';
  if (Math.abs(player.shieldRatio - rival.shieldRatio) > 0.0001) return player.shieldRatio > rival.shieldRatio ? 'player' : 'rival';
  if (Math.abs(player.spinRatio - rival.spinRatio) > 0.0001) return player.spinRatio > rival.spinRatio ? 'player' : 'rival';
  return 'draw';
}

export function stepJourneyDiscArena(state: JourneyDiscArenaState): JourneyDiscArenaStepResult {
  if (state.phase === 'finished') return { state, events: [] };

  if (state.openingTicksRemaining > 0) {
    return {
      state: {
        ...state,
        tick: state.tick + 1,
        openingTicksRemaining: state.openingTicksRemaining - 1,
      },
      events: [],
    };
  }

  const dt = JOURNEY_DISC_ARENA_FIXED_STEP_SECONDS;
  const events: JourneyDiscArenaEvent[] = [];
  const fighters = state.fighters.map((fighter) => ({
    ...fighter,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
  }));
  const powerups = state.powerups.map((powerup) => ({ ...powerup, position: { ...powerup.position } }));

  for (const fighter of fighters) {
    if (!fighter.active || fighter.expiresAtTick === null || state.tick < fighter.expiresAtTick) continue;
    fighter.active = false;
    fighter.velocity = { x: 0, z: 0 };
    events.push({ type: 'echo_expired', fighterId: fighter.id });
  }

  for (const fighter of fighters) {
    if (!fighter.active) continue;
    const stats = getJourneyDiscArenaFighterStats(fighter);
    if (fighter.frozenUntilTick > state.tick) {
      // Freeze is a complete combat lock, not a steering slowdown. Collision
      // handling below also treats this fighter as immovable and unable to
      // return damage while still allowing opponents to damage it.
      fighter.velocity = { x: 0, z: 0 };
      continue;
    }
    const target = nearestOpponent(fighter, fighters);
    const radialDistance = length(fighter.position);
    const toCenter = normalize({ x: -fighter.position.x, z: -fighter.position.z });
    const targetDistance = target
      ? Math.hypot(target.position.x - fighter.position.x, target.position.z - fighter.position.z)
      : 0;
    const interceptSeconds = target ? clamp(targetDistance / Math.max(1, stats.maxSpeed) * 0.28, 0.08, 0.5) : 0;
    const towardTarget = target
      ? normalize({
        x: target.position.x + target.velocity.x * interceptSeconds - fighter.position.x,
        z: target.position.z + target.velocity.z * interceptSeconds - fighter.position.z,
      })
      : toCenter;
    const orbitSign = ((stableHash(fighter.id) ^ state.seed) & 1) === 0 ? 1 : -1;
    const tangent = { x: -towardTarget.z * orbitSign, z: towardTarget.x * orbitSign };
    const edgePressure = clamp((radialDistance - state.arenaRadius * 0.67) / (state.arenaRadius * 0.22), 0, 1);
    const spinRatio = clamp(fighter.spin / stats.maxSpin, 0, 1);
    const driveScale = 0.52 + spinRatio * 0.48;
    const insideSpeedField = Math.hypot(
      fighter.position.x - state.speedField.position.x,
      fighter.position.z - state.speedField.position.z,
    ) <= state.speedField.radius;
    if (insideSpeedField && fighter.speedBoostUntilTick <= state.tick) {
      fighter.speedBoostUntilTick = state.tick + JOURNEY_DISC_ARENA_SPEED_BOOST_TICKS;
      events.push({ type: 'speed_field', fighterId: fighter.id });
    }
    const speedMultiplier = fighter.speedBoostUntilTick > state.tick ? JOURNEY_DISC_ARENA_SPEED_MULTIPLIER : 1;
    const allySpacing = fighters.reduce((separation, ally) => {
      if (!ally.active || ally.id === fighter.id || ally.team !== fighter.team) return separation;
      const dx = fighter.position.x - ally.position.x;
      const dz = fighter.position.z - ally.position.z;
      const distance = Math.hypot(dx, dz);
      const spacingRadius = (stats.radius + getJourneyDiscArenaFighterStats(ally).radius) * 1.72;
      if (distance <= 0.0001 || distance >= spacingRadius) return separation;
      const pressure = (spacingRadius - distance) / spacingRadius;
      separation.x += (dx / distance) * pressure;
      separation.z += (dz / distance) * pressure;
      return separation;
    }, { x: 0, z: 0 });
    const huntPressure = target ? 1.06 + clamp(targetDistance / state.arenaRadius, 0, 1.4) * 0.2 : 1;
    const acceleration = {
      x: (towardTarget.x * huntPressure + tangent.x * 0.1 + allySpacing.x * 0.34 + toCenter.x * edgePressure * 1.42) * stats.drive * driveScale * speedMultiplier,
      z: (towardTarget.z * huntPressure + tangent.z * 0.1 + allySpacing.z * 0.34 + toCenter.z * edgePressure * 1.42) * stats.drive * driveScale * speedMultiplier,
    };
    fighter.velocity.x += acceleration.x * dt;
    fighter.velocity.z += acceleration.z * dt;
    const speed = length(fighter.velocity);
    const maximumSpeed = stats.maxSpeed * speedMultiplier;
    if (speed > maximumSpeed) {
      fighter.velocity.x = (fighter.velocity.x / speed) * maximumSpeed;
      fighter.velocity.z = (fighter.velocity.z / speed) * maximumSpeed;
    }
    fighter.position.x += fighter.velocity.x * dt;
    fighter.position.z += fighter.velocity.z * dt;
    fighter.spin = Math.max(0, fighter.spin - stats.spinDrainPerSecond * dt);
    if (fighter.spin <= 0) {
      fighter.velocity.x *= 0.992;
      fighter.velocity.z *= 0.992;
    }
  }

  for (const powerup of powerups) {
    if (!powerup.active) continue;
    const collector = fighters
      .filter((fighter) => fighter.active && !fighter.isEcho && fighter.frozenUntilTick <= state.tick)
      .map((fighter) => ({
        fighter,
        distance: Math.hypot(fighter.position.x - powerup.position.x, fighter.position.z - powerup.position.z),
      }))
      .filter(({ fighter, distance }) => distance <= getJourneyDiscArenaFighterStats(fighter).radius + 0.58)
      .sort((left, right) => left.distance - right.distance || left.fighter.id.localeCompare(right.fighter.id))[0]?.fighter;
    if (!collector) continue;
    powerup.active = false;
    if (powerup.type === 'freeze') {
      const target = nearestOpponent(collector, fighters.filter((fighter) => !fighter.isEcho));
      if (target) {
        target.frozenUntilTick = state.tick + JOURNEY_DISC_ARENA_FREEZE_TICKS;
        target.velocity = { x: 0, z: 0 };
        events.push({ type: 'freeze', collectorFighterId: collector.id, targetFighterId: target.id, untilTick: target.frozenUntilTick });
      }
      continue;
    }
    if (fighters.length >= JOURNEY_DISC_ARENA_MAX_FIGHTERS) continue;
    const stats = getJourneyDiscArenaFighterStats(collector);
    const echoId = `echo:${collector.id}:${state.tick}`;
    const offsetDirection = normalize({ x: -collector.position.z || 0.3, z: collector.position.x || 1 });
    const expiresAtTick = state.tick + JOURNEY_DISC_ARENA_ECHO_TICKS;
    fighters.push({
      ...collector,
      id: echoId,
      position: {
        x: collector.position.x + offsetDirection.x * (stats.radius * 1.4),
        z: collector.position.z + offsetDirection.z * (stats.radius * 1.4),
      },
      velocity: { x: collector.velocity.x * 0.88, z: collector.velocity.z * 0.88 },
      shield: Math.max(1, Math.round(stats.maxShield * 0.48)),
      spin: stats.maxSpin * 0.76,
      shieldBroken: false,
      lastHitBy: null,
      frozenUntilTick: 0,
      speedBoostUntilTick: 0,
      expiresAtTick,
      isEcho: true,
    });
    events.push({ type: 'echo_spawn', collectorFighterId: collector.id, echoFighterId: echoId, untilTick: expiresAtTick });
  }

  for (let leftIndex = 0; leftIndex < fighters.length; leftIndex += 1) {
    const left = fighters[leftIndex];
    if (!left.active) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < fighters.length; rightIndex += 1) {
      const right = fighters[rightIndex];
      if (!right.active) continue;
      const leftStats = getJourneyDiscArenaFighterStats(left);
      const rightStats = getJourneyDiscArenaFighterStats(right);
      const leftFrozen = left.frozenUntilTick > state.tick;
      const rightFrozen = right.frozenUntilTick > state.tick;
      const delta = { x: right.position.x - left.position.x, z: right.position.z - left.position.z };
      const distance = length(delta);
      const minimumDistance = leftStats.radius + rightStats.radius;
      if (distance >= minimumDistance) continue;

      const normal = distance > 0.000001
        ? { x: delta.x / distance, z: delta.z / distance }
        : normalize({ x: ((stableHash(left.id) ^ stableHash(right.id)) & 1) === 0 ? 1 : -1, z: 0.2 });
      const overlap = minimumDistance - distance;
      const totalMass = leftStats.mass + rightStats.mass;
      if (leftFrozen && !rightFrozen) {
        right.position.x += normal.x * overlap;
        right.position.z += normal.z * overlap;
      } else if (rightFrozen && !leftFrozen) {
        left.position.x -= normal.x * overlap;
        left.position.z -= normal.z * overlap;
      } else {
        left.position.x -= normal.x * overlap * (rightStats.mass / totalMass);
        left.position.z -= normal.z * overlap * (rightStats.mass / totalMass);
        right.position.x += normal.x * overlap * (leftStats.mass / totalMass);
        right.position.z += normal.z * overlap * (leftStats.mass / totalMass);
      }

      const leftVelocityBefore = { ...left.velocity };
      const rightVelocityBefore = { ...right.velocity };
      const relativeNormalSpeed = (right.velocity.x - left.velocity.x) * normal.x
        + (right.velocity.z - left.velocity.z) * normal.z;
      if (relativeNormalSpeed >= 0) continue;
      const impactSpeed = -relativeNormalSpeed;
      const inverseLeftMass = leftFrozen ? 0 : 1 / leftStats.mass;
      const inverseRightMass = rightFrozen ? 0 : 1 / rightStats.mass;
      const inverseMassSum = inverseLeftMass + inverseRightMass;
      if (inverseMassSum <= 0) continue;
      const impulse = (1.82 * impactSpeed) / inverseMassSum;
      if (!leftFrozen) {
        left.velocity.x -= impulse * inverseLeftMass * normal.x;
        left.velocity.z -= impulse * inverseLeftMass * normal.z;
      }
      if (!rightFrozen) {
        right.velocity.x += impulse * inverseRightMass * normal.x;
        right.velocity.z += impulse * inverseRightMass * normal.z;
      }
      if (leftFrozen) left.velocity = { x: 0, z: 0 };
      if (rightFrozen) right.velocity = { x: 0, z: 0 };

      if (left.team === right.team || impactSpeed < 0.28) continue;
      // Even small opposing clashes chip shields; high-speed hits retain the
      // dramatic damage band and the livelier rebound carries into the hunt.
      const leftDamage = rightFrozen
        ? 0
        : Math.max(1, Math.round((impactSpeed - 0.18) * 3.45 * rightStats.impact / leftStats.stability));
      const rightDamage = leftFrozen
        ? 0
        : Math.max(1, Math.round((impactSpeed - 0.18) * 3.45 * leftStats.impact / rightStats.stability));
      const leftWasShielded = left.shield > 0;
      const rightWasShielded = right.shield > 0;
      left.shield = Math.max(0, left.shield - leftDamage);
      right.shield = Math.max(0, right.shield - rightDamage);
      left.spin = Math.max(0, left.spin - leftDamage * 0.18);
      right.spin = Math.max(0, right.spin - rightDamage * 0.18);
      if (leftDamage > 0) left.lastHitBy = right.id;
      if (rightDamage > 0) right.lastHitBy = left.id;
      events.push({ type: 'impact', fighterAId: left.id, fighterBId: right.id, strength: impactSpeed });

      const leftEdgeRatio = length(left.position) / state.arenaRadius;
      const rightEdgeRatio = length(right.position) / state.arenaRadius;
      const driveTarget = leftEdgeRatio >= rightEdgeRatio ? left : right;
      const driveAttacker = driveTarget === left ? right : left;
      const driveTargetFrozen = driveTarget.frozenUntilTick > state.tick;
      const driveAttackerFrozen = driveAttacker.frozenUntilTick > state.tick;
      const attackerVelocity = driveAttacker === left ? leftVelocityBefore : rightVelocityBefore;
      const outward = normalize(driveTarget.position);
      const outwardDrive = attackerVelocity.x * outward.x + attackerVelocity.z * outward.z;
      if (!driveTargetFrozen && !driveAttackerFrozen && Math.max(leftEdgeRatio, rightEdgeRatio) >= 0.62 && impactSpeed >= 2.35 && outwardDrive >= 1.05) {
        const succeeded = doesJourneyDiscDriveOffSucceed({
          seed: state.seed,
          attemptIndex: state.tick,
          attackerFighterId: driveAttacker.id,
          targetFighterId: driveTarget.id,
        });
        const power = clamp(impactSpeed * 0.62, 1.2, 4.4);
        if (succeeded) {
          driveTarget.velocity.x += outward.x * power;
          driveTarget.velocity.z += outward.z * power;
        } else {
          driveAttacker.velocity.x -= outward.x * power * 0.42;
          driveAttacker.velocity.z -= outward.z * power * 0.42;
        }
        events.push({
          type: 'drive_off',
          attackerFighterId: driveAttacker.id,
          targetFighterId: driveTarget.id,
          succeeded,
          power,
        });
      }
      if (leftWasShielded && left.shield === 0) {
        left.shieldBroken = true;
        events.push({ type: 'shield_break', fighterId: left.id, byFighterId: right.id });
      }
      if (rightWasShielded && right.shield === 0) {
        right.shieldBroken = true;
        events.push({ type: 'shield_break', fighterId: right.id, byFighterId: left.id });
      }
    }
  }

  for (const fighter of fighters) {
    if (!fighter.active) continue;
    const stats = getJourneyDiscArenaFighterStats(fighter);
    const radialDistance = length(fighter.position);
    const knockoutRadius = state.arenaRadius + stats.radius * (fighter.shieldBroken ? 0.08 : 0.34);
    if (radialDistance <= knockoutRadius) continue;
    fighter.active = false;
    fighter.velocity = { x: 0, z: 0 };
    events.push({ type: 'knockout', fighterId: fighter.id, byFighterId: fighter.lastHitBy });
  }

  const elapsedSeconds = Math.min(state.durationSeconds, state.elapsedSeconds + dt);
  const playerSurge = Math.min(
    JOURNEY_DISC_ARENA_MAX_SURGE,
    state.playerSurge + JOURNEY_DISC_ARENA_SURGE_RECHARGE_PER_SECOND * dt,
  );
  const playerFreezeCharge = Math.min(
    JOURNEY_DISC_ARENA_FREEZE_MAX_CHARGE,
    state.playerFreezeCharge + JOURNEY_DISC_ARENA_FREEZE_RECHARGE_PER_SECOND * dt,
  );
  const eliminationWinner = resolveWinner(fighters);
  const timedOut = elapsedSeconds >= state.durationSeconds;
  const winner = eliminationWinner ?? (timedOut ? resolveTimeoutWinner(fighters) : null);
  const phase: JourneyDiscArenaPhase = winner === null ? 'running' : 'finished';
  if (winner !== null) {
    events.push({ type: 'round_complete', winner, reason: eliminationWinner !== null ? 'elimination' : 'timeout' });
  }

  return {
    state: {
      ...state,
      tick: state.tick + 1,
      elapsedSeconds,
      phase,
      winner,
      playerSurge,
      playerFreezeCharge,
      fighters,
      powerups,
    },
    events,
  };
}
