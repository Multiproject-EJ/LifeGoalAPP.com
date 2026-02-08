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
  
  // Define mini-game tiles first (from dev plan)
  const miniGameTiles: Record<number, { game: 'task_tower' | 'pomodoro_sprint' | 'vision_quest' | 'wheel_of_wins' }> = {
    7: { game: 'task_tower' },
    22: { game: 'task_tower' },
    12: { game: 'pomodoro_sprint' },
    27: { game: 'pomodoro_sprint' },
    15: { game: 'vision_quest' },
    20: { game: 'wheel_of_wins' }
  };
  
  // Create tiles
  for (let i = 0; i < BOARD_SIZE; i++) {
    const zoneLabel = LIFE_WHEEL_ZONES[i];
    
    // Check if this is a mini-game tile
    if (miniGameTiles[i]) {
      const miniGame = miniGameTiles[i].game;
      let label = '';
      let emoji = '';
      
      switch (miniGame) {
        case 'task_tower':
          label = 'Task Tower';
          emoji = '🏗️';
          break;
        case 'pomodoro_sprint':
          label = 'Pomodoro Sprint';
          emoji = '⏰';
          break;
        case 'vision_quest':
          label = 'Vision Quest';
          emoji = '🎯';
          break;
        case 'wheel_of_wins':
          label = 'Wheel of Wins';
          emoji = '🎡';
          break;
      }
      
      board.push({
        index: i,
        type: 'mini_game',
        label,
        emoji,
        miniGame,
        zoneLabel
      });
    } else {
      // Distribute remaining tiles (24 tiles to distribute)
      // ~30% neutral, ~20% gain_coins, ~10% lose_coins, ~10% bonus_dice, ~10% game_token, ~5% mystery, ~5% jackpot
      let type: TileType;
      let label: string;
      let emoji: string;
      let effect: BoardTile['effect'];
      
      // Use a simple distribution pattern
      const position = i;
      const mod = position % 20; // Create pattern over 20 positions
      
      if (mod === 0) {
        type = 'jackpot';
        label = 'Jackpot!';
        emoji = '💎';
        effect = { currency: 'gold', min: 100, max: 500 };
      } else if (mod === 1) {
        type = 'mystery';
        label = 'Mystery';
        emoji = '❓';
      } else if (mod === 2 || mod === 11) {
        type = 'bonus_dice';
        label = 'Bonus Dice';
        emoji = '🎲';
        effect = { currency: 'dice', min: 2, max: 5 };
      } else if (mod === 3 || mod === 13) {
        type = 'game_token';
        label = 'Game Tokens';
        emoji = '🎟️';
        effect = { currency: 'game_tokens', min: 1, max: 3 };
      } else if (mod === 4 || mod === 9) {
        type = 'lose_coins';
        label = 'Lose Coins';
        emoji = '💸';
        effect = { currency: 'gold', min: -50, max: -10 };
      } else if (mod === 5 || mod === 8 || mod === 14 || mod === 17) {
        type = 'gain_coins';
        label = 'Gain Coins';
        emoji = '🪙';
        effect = { currency: 'gold', min: 10, max: 75 };
      } else {
        type = 'neutral';
        label = 'Safe Ground';
        emoji = '⬜';
      }
      
      board.push({
        index: i,
        type,
        label,
        emoji,
        effect,
        zoneLabel
      });
    }
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
      currentLap: Math.max(1, parsed.currentLap || 1),
      availableDice: Math.max(0, parsed.availableDice || 0),
      lastRoll: Math.max(0, Math.min(6, parsed.lastRoll || 0)),
      lastRollTimestamp: parsed.lastRollTimestamp || new Date().toISOString(),
      totalRolls: Math.max(0, parsed.totalRolls || 0),
      visitHistory: Array.isArray(parsed.visitHistory) ? parsed.visitHistory : [],
      tilesVisitedThisLap: Array.isArray(parsed.tilesVisitedThisLap) ? parsed.tilesVisitedThisLap : [],
      rollsToday: Math.max(0, parsed.rollsToday || 0),
      lastSessionDate: parsed.lastSessionDate || getTodayDateString()
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
 * Moves the token by the rolled amount, handles wrapping and lap increment
 */
export function moveToken(state: LuckyRollState, roll: number, boardSize: number): LuckyRollState {
  const newPosition = state.currentPosition + roll;
  let currentLap = state.currentLap;
  let finalPosition = newPosition;
  let tilesVisitedThisLap = [...state.tilesVisitedThisLap];
  
  // Check if we wrapped around the board
  if (newPosition >= boardSize) {
    currentLap += 1;
    finalPosition = newPosition % boardSize;
    tilesVisitedThisLap = []; // Reset visited tiles for new lap
  }
  
  // Add current position to visit history
  const visitHistory = [...state.visitHistory, finalPosition];
  tilesVisitedThisLap.push(finalPosition);
  
  return {
    ...state,
    currentPosition: finalPosition,
    currentLap,
    visitHistory,
    tilesVisitedThisLap
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
    currentLap: 1,
    availableDice: 0,
    lastRoll: 0,
    lastRollTimestamp: new Date().toISOString(),
    totalRolls: 0,
    visitHistory: [0],
    tilesVisitedThisLap: [0],
    rollsToday: 0,
    lastSessionDate: getTodayDateString()
  };
}

/**
 * Gets today's date as YYYY-MM-DD string
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
