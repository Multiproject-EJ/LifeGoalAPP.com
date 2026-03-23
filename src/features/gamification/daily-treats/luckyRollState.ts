import type { BoardTile, LuckyRollState, TileType } from './luckyRollTypes';

const STORAGE_KEY = 'gol_lucky_roll_state';
const BOARD_SIZE = 30;

// Life wheel zone mapping (tiles 1-30 distributed across 8 zones)
const LIFE_WHEEL_ZONES = [
  'Health', 'Health', 'Health', 'Health',          // tiles 0-3
  'Career', 'Career', 'Career', 'Career',           // tiles 4-7
  'Relationships', 'Relationships', 'Relationships', 'Relationships', // tiles 8-11
  'Personal Growth', 'Personal Growth', 'Personal Growth', 'Personal Growth', // tiles 12-15
  'Finance', 'Finance', 'Finance', 'Finance',       // tiles 16-19
  'Recreation', 'Recreation', 'Recreation', 'Recreation', // tiles 20-23
  'Contribution', 'Contribution', 'Contribution',   // tiles 24-26
  'Environment', 'Environment', 'Environment'       // tiles 27-29
];

const safeLocalStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

/**
 * Generates the default 30-tile board with the distribution from the dev plan
 */
export function generateDefaultBoard(): BoardTile[] {
  const board: BoardTile[] = [];

  // Create tiles
  for (let i = 0; i < BOARD_SIZE; i++) {
    const zoneLabel = LIFE_WHEEL_ZONES[i];

    let type: TileType;
    let label: string;
    let emoji: string;
    let effect: BoardTile['effect'];

    if (i === BOARD_SIZE - 1) {
      type = 'finish';
      label = 'Finish Chest';
      emoji = '🏁';
      effect = { currency: 'game_tokens', min: 5, max: 8 };
    } else {
      const mod = i % 18;

      if (mod === 0) {
        type = 'jackpot';
        label = 'Jackpot!';
        emoji = '💎';
        effect = { currency: 'gold', min: 120, max: 260 };
      } else if (mod === 1 || mod === 10) {
        type = 'mystery';
        label = 'Mystery';
        emoji = '❓';
      } else if (mod === 2 || mod === 11) {
        type = 'bonus_dice';
        label = 'Bonus Roll';
        emoji = '🎲';
        effect = { currency: 'dice', min: 1, max: 3 };
      } else if (mod === 3 || mod === 12) {
        type = 'game_token';
        label = 'Token Cache';
        emoji = '🎟️';
        effect = { currency: 'game_tokens', min: 1, max: 2 };
      } else if (mod === 4 || mod === 13) {
        type = 'boost_step';
        label = 'Lucky Boost';
        emoji = '🚀';
        effect = { currency: 'position', min: 1, max: 2 };
      } else if (mod === 5 || mod === 14) {
        type = 'slow_zone';
        label = 'Sticky Mud';
        emoji = '🪨';
        effect = { currency: 'position', min: -2, max: -1 };
      } else if (mod === 6 || mod === 15) {
        type = 'lose_coins';
        label = 'Lose Coins';
        emoji = '💸';
        effect = { currency: 'gold', min: -45, max: -10 };
      } else if (mod === 7 || mod === 16) {
        type = 'gain_coins';
        label = 'Coin Burst';
        emoji = '🪙';
        effect = { currency: 'gold', min: 15, max: 70 };
      } else {
        type = 'neutral';
        label = 'Safe Ground';
        emoji = '⬜';
      }
    }

    board.push({
      index: i,
      type,
      label,
      emoji,
      effect,
      zoneLabel,
    });
  }
  
  return board;
}

/**
 * Loads the Lucky Roll state from localStorage
 */
export function loadState(userId: string): LuckyRollState {
  if (!safeLocalStorage) {
    return createDefaultState();
  }
  
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    const stored = safeLocalStorage.getItem(key);
    
    if (!stored) {
      return createDefaultState();
    }
    
    const parsed = JSON.parse(stored) as LuckyRollState;
    
    // Validate and sanitize
    return {
      currentPosition: Math.max(0, Math.min(BOARD_SIZE - 1, parsed.currentPosition || 0)),
      availableDice: Math.max(0, parsed.availableDice || 0),
      lastRoll: Math.max(0, Math.min(6, parsed.lastRoll || 0)),
      lastRollTimestamp: parsed.lastRollTimestamp || new Date().toISOString(),
      totalRolls: Math.max(0, parsed.totalRolls || 0),
      visitHistory: Array.isArray(parsed.visitHistory) ? parsed.visitHistory : [],
      tilesVisitedThisRun: Array.isArray(parsed.tilesVisitedThisRun)
        ? parsed.tilesVisitedThisRun
        : Array.isArray((parsed as LuckyRollState & { tilesVisitedThisLap?: number[] }).tilesVisitedThisLap)
          ? (parsed as LuckyRollState & { tilesVisitedThisLap?: number[] }).tilesVisitedThisLap ?? []
          : [],
      rollsToday: Math.max(0, parsed.rollsToday || 0),
      lastSessionDate: parsed.lastSessionDate || getTodayDateString(),
      sessionComplete: Boolean(parsed.sessionComplete)
    };
  } catch (error) {
    console.warn('Failed to load Lucky Roll state:', error);
    return createDefaultState();
  }
}

/**
 * Saves the Lucky Roll state to localStorage
 */
export function saveState(userId: string, state: LuckyRollState): void {
  if (!safeLocalStorage) return;
  
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    safeLocalStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save Lucky Roll state:', error);
  }
}

/**
 * Rolls a six-sided die using crypto.getRandomValues for fairness
 */
export function rollDice(): number {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return (buffer[0] % 6) + 1; // 1-6
  }
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Moves the token by the rolled amount on a finite board.
 */
export function moveToken(state: LuckyRollState, roll: number, boardSize: number): LuckyRollState {
  const finalPosition = Math.min(boardSize - 1, state.currentPosition + roll);
  const visitHistory = [...state.visitHistory, finalPosition];
  const tilesVisitedThisRun = [...state.tilesVisitedThisRun, finalPosition];
  
  return {
    ...state,
    currentPosition: finalPosition,
    visitHistory,
    tilesVisitedThisRun,
    sessionComplete: finalPosition >= boardSize - 1
  };
}

/**
 * Resets daily counters if it's a new day
 */
export function resetDailyCounters(state: LuckyRollState): LuckyRollState {
  const today = getTodayDateString();
  
  if (state.lastSessionDate !== today) {
    return {
      ...state,
      rollsToday: 0,
      lastSessionDate: today
    };
  }
  
  return state;
}

/**
 * Creates the default initial state
 */
function createDefaultState(): LuckyRollState {
  return {
    currentPosition: 0,
    availableDice: 0,
    lastRoll: 0,
    lastRollTimestamp: new Date().toISOString(),
    totalRolls: 0,
    visitHistory: [0],
    tilesVisitedThisRun: [0],
    rollsToday: 0,
    lastSessionDate: getTodayDateString(),
    sessionComplete: false,
  };
}

/**
 * Gets today's date as YYYY-MM-DD string
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
