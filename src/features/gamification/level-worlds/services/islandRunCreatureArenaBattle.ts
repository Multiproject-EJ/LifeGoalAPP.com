import {
  getIslandRunArenaCreatureSlot,
  isIslandRunArenaIsland,
} from './islandRunArenaCreaturePresentation';

/**
 * Pure, deterministic rules for the turn-based creature arena encounter.
 *
 * Rendering, camera, audio, haptics, persistence, inventory rewards, and Boss
 * completion remain outside this module. Keeping this engine side-effect free
 * makes interrupted animations and save/restore deterministic, and prevents a
 * React surface from becoming a second gameplay authority.
 */

export const ISLAND_RUN_ARENA_BATTLE_VERSION = 1 as const;
export const ISLAND_RUN_ARENA_MAX_SHIELDS = 3 as const;
export const ISLAND_RUN_ARENA_MAX_FOCUS = 3 as const;
export const ISLAND_RUN_ARENA_POWER_FOCUS_COST = 2 as const;

export type IslandRunArenaBattlePhase = 'awaiting_command' | 'victory' | 'defeat';
export type IslandRunArenaPlayerAction = 'quick_attack' | 'power_attack' | 'guard' | 'focus' | 'shield';
export type IslandRunArenaOpponentIntent = 'quick_attack' | 'heavy_attack' | 'guard' | 'charge_power' | 'release_power';
export type IslandRunArenaActor = 'player' | 'opponent';

export interface IslandRunArenaBattleConfig {
  islandNumber: number;
  arenaSlot: number;
  playerMaxHp: number;
  opponentMaxHp: number;
  playerQuickDamage: number;
  playerPowerDamage: number;
  opponentQuickDamage: number;
  opponentHeavyDamage: number;
  opponentPowerDamage: number;
  guardDamageMultiplier: number;
  shieldDamageMultiplier: number;
}

export interface IslandRunArenaBattleFighterState {
  hp: number;
  maxHp: number;
}

export interface IslandRunArenaBattleState {
  version: typeof ISLAND_RUN_ARENA_BATTLE_VERSION;
  islandNumber: number;
  opponentCreatureId: string;
  turnNumber: number;
  phase: IslandRunArenaBattlePhase;
  player: IslandRunArenaBattleFighterState & {
    focus: number;
    shieldCharges: number;
  };
  opponent: IslandRunArenaBattleFighterState;
  opponentIntent: IslandRunArenaOpponentIntent;
  rngState: number;
}

export type IslandRunArenaBattleEvent =
  | { type: 'player_attack'; action: Extract<IslandRunArenaPlayerAction, 'quick_attack' | 'power_attack'>; damage: number; opponentHpAfter: number }
  | { type: 'player_focus'; focusAfter: number }
  | { type: 'player_guard' }
  | { type: 'player_shield'; shieldChargesAfter: number }
  | { type: 'opponent_attack'; intent: Extract<IslandRunArenaOpponentIntent, 'quick_attack' | 'heavy_attack' | 'release_power'>; damage: number; playerHpAfter: number; mitigation: 'none' | 'guard' | 'shield' }
  | { type: 'opponent_guard' }
  | { type: 'opponent_charge'; nextIntent: 'release_power' }
  | { type: 'battle_victory' }
  | { type: 'battle_defeat' };

export type IslandRunArenaBattleRejection =
  | 'battle_finished'
  | 'insufficient_focus'
  | 'no_shield_charges';

export interface ResolveIslandRunArenaBattleTurnResult {
  accepted: boolean;
  rejection: IslandRunArenaBattleRejection | null;
  state: IslandRunArenaBattleState;
  events: readonly IslandRunArenaBattleEvent[];
}

/**
 * Accepts only the serializable battle shape owned by the deterministic arena
 * engine. Remote/local runtime hydration uses this instead of trusting JSONB
 * values, so a malformed interrupted battle can never leak NaN health or an
 * impossible command phase into the UI.
 */
export function sanitizeIslandRunArenaBattleState(value: unknown): IslandRunArenaBattleState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== ISLAND_RUN_ARENA_BATTLE_VERSION) return null;
  if (typeof candidate.islandNumber !== 'number' || !Number.isInteger(candidate.islandNumber)) return null;
  if (!isIslandRunArenaIsland(candidate.islandNumber)) return null;
  if (typeof candidate.opponentCreatureId !== 'string' || candidate.opponentCreatureId.trim().length === 0) return null;
  if (typeof candidate.turnNumber !== 'number' || !Number.isInteger(candidate.turnNumber) || candidate.turnNumber < 1) return null;
  if (candidate.phase !== 'awaiting_command' && candidate.phase !== 'victory' && candidate.phase !== 'defeat') return null;
  if (
    candidate.opponentIntent !== 'quick_attack'
    && candidate.opponentIntent !== 'heavy_attack'
    && candidate.opponentIntent !== 'guard'
    && candidate.opponentIntent !== 'charge_power'
    && candidate.opponentIntent !== 'release_power'
  ) return null;
  if (typeof candidate.rngState !== 'number' || !Number.isInteger(candidate.rngState)) return null;
  if (!candidate.player || typeof candidate.player !== 'object' || Array.isArray(candidate.player)) return null;
  if (!candidate.opponent || typeof candidate.opponent !== 'object' || Array.isArray(candidate.opponent)) return null;
  const player = candidate.player as Record<string, unknown>;
  const opponent = candidate.opponent as Record<string, unknown>;
  const numericFields = [player.hp, player.maxHp, player.focus, player.shieldCharges, opponent.hp, opponent.maxHp];
  if (numericFields.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))) return null;

  const playerMaxHp = clampInteger(player.maxHp as number, 1, 10_000);
  const opponentMaxHp = clampInteger(opponent.maxHp as number, 1, 10_000);
  return {
    version: ISLAND_RUN_ARENA_BATTLE_VERSION,
    islandNumber: candidate.islandNumber,
    opponentCreatureId: candidate.opponentCreatureId.trim(),
    turnNumber: candidate.turnNumber,
    phase: candidate.phase,
    player: {
      hp: clampInteger(player.hp as number, 0, playerMaxHp),
      maxHp: playerMaxHp,
      focus: clampInteger(player.focus as number, 0, ISLAND_RUN_ARENA_MAX_FOCUS),
      shieldCharges: clampInteger(player.shieldCharges as number, 0, ISLAND_RUN_ARENA_MAX_SHIELDS),
    },
    opponent: {
      hp: clampInteger(opponent.hp as number, 0, opponentMaxHp),
      maxHp: opponentMaxHp,
    },
    opponentIntent: candidate.opponentIntent,
    rngState: candidate.rngState >>> 0,
  };
}

const clampInteger = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

function nextRandom(rngState: number): { rngState: number; value: number } {
  let state = rngState >>> 0;
  state = (state + 0x6d2b79f5) >>> 0;
  let mixed = state;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const value = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  return { rngState: state, value };
}

function deriveInitialRngState(islandNumber: number, encounterSeed: number): number {
  const island = Math.max(1, Math.trunc(islandNumber));
  const seed = Number.isFinite(encounterSeed) ? Math.trunc(encounterSeed) : 0;
  return (Math.imul(island, 2654435761) ^ Math.imul(seed + 1, 2246822519) ^ 0x9e3779b9) >>> 0;
}

export function getIslandRunCreatureArenaBattleConfig(islandNumber: number): IslandRunArenaBattleConfig | null {
  const arenaSlot = getIslandRunArenaCreatureSlot(islandNumber);
  if (arenaSlot === null) return null;

  return {
    islandNumber,
    arenaSlot,
    playerMaxHp: 100,
    opponentMaxHp: 82 + arenaSlot * 3,
    playerQuickDamage: 13 + Math.floor(arenaSlot / 8),
    playerPowerDamage: 29 + Math.floor(arenaSlot / 5),
    opponentQuickDamage: 10 + Math.floor(arenaSlot / 6),
    opponentHeavyDamage: 18 + Math.floor(arenaSlot / 5),
    opponentPowerDamage: 34 + Math.floor(arenaSlot / 4),
    guardDamageMultiplier: 0.5,
    shieldDamageMultiplier: 0.15,
  };
}

function resolveOpponentIntent(options: {
  rngState: number;
  turnNumber: number;
  previousIntent?: IslandRunArenaOpponentIntent;
}): IslandRunArenaOpponentIntent {
  if (options.previousIntent === 'charge_power') return 'release_power';
  if (options.previousIntent === 'release_power') return 'quick_attack';
  if (options.turnNumber > 1 && options.turnNumber % 4 === 0) return 'charge_power';

  const roll = nextRandom(options.rngState).value;
  if (roll < 0.52) return 'quick_attack';
  if (roll < 0.75) return 'heavy_attack';
  if (roll < 0.9) return 'guard';
  return 'charge_power';
}

export function createIslandRunCreatureArenaBattle(options: {
  islandNumber: number;
  opponentCreatureId: string;
  shieldCharges: number;
  encounterSeed?: number;
}): IslandRunArenaBattleState | null {
  const config = getIslandRunCreatureArenaBattleConfig(options.islandNumber);
  if (!config) return null;

  const rngState = deriveInitialRngState(options.islandNumber, options.encounterSeed ?? 0);
  return {
    version: ISLAND_RUN_ARENA_BATTLE_VERSION,
    islandNumber: options.islandNumber,
    opponentCreatureId: options.opponentCreatureId,
    turnNumber: 1,
    phase: 'awaiting_command',
    player: {
      hp: config.playerMaxHp,
      maxHp: config.playerMaxHp,
      focus: 0,
      shieldCharges: clampInteger(options.shieldCharges, 0, ISLAND_RUN_ARENA_MAX_SHIELDS),
    },
    opponent: {
      hp: config.opponentMaxHp,
      maxHp: config.opponentMaxHp,
    },
    opponentIntent: resolveOpponentIntent({ rngState, turnNumber: 1 }),
    rngState,
  };
}

function rejectedTurn(
  state: IslandRunArenaBattleState,
  rejection: IslandRunArenaBattleRejection,
): ResolveIslandRunArenaBattleTurnResult {
  return { accepted: false, rejection, state, events: [] };
}

export function resolveIslandRunCreatureArenaTurn(
  state: IslandRunArenaBattleState,
  action: IslandRunArenaPlayerAction,
): ResolveIslandRunArenaBattleTurnResult {
  if (state.phase !== 'awaiting_command') return rejectedTurn(state, 'battle_finished');
  if (action === 'power_attack' && state.player.focus < ISLAND_RUN_ARENA_POWER_FOCUS_COST) {
    return rejectedTurn(state, 'insufficient_focus');
  }
  if (action === 'shield' && state.player.shieldCharges < 1) {
    return rejectedTurn(state, 'no_shield_charges');
  }

  const config = getIslandRunCreatureArenaBattleConfig(state.islandNumber);
  if (!config) return rejectedTurn(state, 'battle_finished');

  const events: IslandRunArenaBattleEvent[] = [];
  const random = nextRandom(state.rngState);
  const variance = Math.floor(random.value * 4);
  let player = { ...state.player };
  let opponent = { ...state.opponent };

  const opponentIsGuarding = state.opponentIntent === 'guard';
  if (action === 'quick_attack' || action === 'power_attack') {
    const baseDamage = action === 'quick_attack'
      ? config.playerQuickDamage + variance
      : config.playerPowerDamage + variance;
    const damage = Math.max(1, Math.round(baseDamage * (opponentIsGuarding ? config.guardDamageMultiplier : 1)));
    opponent = { ...opponent, hp: Math.max(0, opponent.hp - damage) };
    player = {
      ...player,
      focus: action === 'quick_attack'
        ? Math.min(ISLAND_RUN_ARENA_MAX_FOCUS, player.focus + 1)
        : player.focus - ISLAND_RUN_ARENA_POWER_FOCUS_COST,
    };
    events.push({ type: 'player_attack', action, damage, opponentHpAfter: opponent.hp });
  } else if (action === 'focus') {
    player = { ...player, focus: Math.min(ISLAND_RUN_ARENA_MAX_FOCUS, player.focus + 2) };
    events.push({ type: 'player_focus', focusAfter: player.focus });
  } else if (action === 'guard') {
    events.push({ type: 'player_guard' });
  } else {
    player = { ...player, shieldCharges: player.shieldCharges - 1 };
    events.push({ type: 'player_shield', shieldChargesAfter: player.shieldCharges });
  }

  if (opponent.hp <= 0) {
    events.push({ type: 'battle_victory' });
    return {
      accepted: true,
      rejection: null,
      events,
      state: { ...state, player, opponent, phase: 'victory', rngState: random.rngState },
    };
  }

  if (state.opponentIntent === 'guard') {
    events.push({ type: 'opponent_guard' });
  } else if (state.opponentIntent === 'charge_power') {
    events.push({ type: 'opponent_charge', nextIntent: 'release_power' });
  } else {
    const baseDamage = state.opponentIntent === 'quick_attack'
      ? config.opponentQuickDamage + variance
      : state.opponentIntent === 'heavy_attack'
        ? config.opponentHeavyDamage + variance
        : config.opponentPowerDamage + variance;
    const mitigation = action === 'shield' ? 'shield' : action === 'guard' ? 'guard' : 'none';
    const multiplier = mitigation === 'shield'
      ? config.shieldDamageMultiplier
      : mitigation === 'guard' ? config.guardDamageMultiplier : 1;
    const damage = Math.max(0, Math.ceil(baseDamage * multiplier));
    player = { ...player, hp: Math.max(0, player.hp - damage) };
    events.push({
      type: 'opponent_attack',
      intent: state.opponentIntent,
      damage,
      playerHpAfter: player.hp,
      mitigation,
    });
  }

  if (player.hp <= 0) {
    events.push({ type: 'battle_defeat' });
    return {
      accepted: true,
      rejection: null,
      events,
      state: { ...state, player, opponent, phase: 'defeat', rngState: random.rngState },
    };
  }

  const nextTurnNumber = state.turnNumber + 1;
  const opponentIntent = resolveOpponentIntent({
    rngState: random.rngState,
    turnNumber: nextTurnNumber,
    previousIntent: state.opponentIntent,
  });
  return {
    accepted: true,
    rejection: null,
    events,
    state: {
      ...state,
      turnNumber: nextTurnNumber,
      player,
      opponent,
      opponentIntent,
      rngState: random.rngState,
    },
  };
}

export function getIslandRunArenaShieldPickupCount(islandNumber: number): number {
  const slot = getIslandRunArenaCreatureSlot(islandNumber);
  if (slot === null) return 0;
  return (ISLAND_RUN_ARENA_MAX_SHIELDS - (slot % 4)) % 4;
}

/**
 * Selects shield pickups only from tile indices supplied by the canonical tile
 * map. This keeps the arena system profile-independent and prevents it from
 * stealing stop doors or other special tiles.
 */
export function selectIslandRunArenaShieldPickupTiles(options: {
  islandNumber: number;
  eligibleTileIndices: readonly number[];
}): number[] {
  if (!isIslandRunArenaIsland(options.islandNumber)) return [];
  const uniqueEligible = Array.from(new Set(options.eligibleTileIndices
    .filter((index) => Number.isInteger(index) && index >= 0)));
  const count = Math.min(getIslandRunArenaShieldPickupCount(options.islandNumber), uniqueEligible.length);
  const selected: number[] = [];
  let rngState = deriveInitialRngState(options.islandNumber, uniqueEligible.length);
  const pool = [...uniqueEligible];
  while (selected.length < count && pool.length > 0) {
    const random = nextRandom(rngState);
    rngState = random.rngState;
    const index = Math.floor(random.value * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected.sort((a, b) => a - b);
}
