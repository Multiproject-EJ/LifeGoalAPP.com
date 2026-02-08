/**
 * Lucky Roll Tile Effect Resolution System
 * 
 * Handles what happens when landing on each tile type:
 * - Calculates rewards/penalties (with crypto RNG)
 * - Delivers rewards through gameRewards service
 * - Returns results for UI display
 */

import type { BoardTile } from './luckyRollTypes';
import { awardDice, awardGameTokens, logRewardEvent, loadCurrencyBalance } from '../../../services/gameRewards';

// For gold/coins, we need to manage it through localStorage similar to gameRewards
// The existing system doesn't have gold management, so we'll add it here
const STORAGE_KEY_GOLD = 'gol_game_gold_balance';

const RANDOM_BUFFER = new Uint32Array(1);

export interface TileEffectResult {
  type: 'gain_coins' | 'lose_coins' | 'bonus_dice' | 'game_token' | 'mystery' | 'jackpot' | 'neutral' | 'mini_game';
  amount: number;
  currency: string;
  message: string;       // "🪙 +25 coins!"
  celebrationType: 'none' | 'small' | 'medium' | 'big';
  miniGame?: string;     // which mini-game to trigger (for mini_game tiles)
}

/**
 * Get secure random float between 0 and 1
 */
function getSecureRandomFloat(): number {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(RANDOM_BUFFER);
    return RANDOM_BUFFER[0] / (0xffffffff + 1);
  }
  return Math.random();
}

/**
 * Get random integer in range [min, max] inclusive
 */
function getRandomIntInclusive(min: number, max: number): number {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(getSecureRandomFloat() * (safeMax - safeMin + 1)) + safeMin;
}

/**
 * Load gold balance from localStorage
 */
function loadGoldBalance(userId: string): number {
  const safeLocalStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  if (!safeLocalStorage) return 0;
  
  try {
    const stored = safeLocalStorage.getItem(`${STORAGE_KEY_GOLD}_${userId}`);
    if (!stored) return 0;
    return Math.max(0, parseInt(stored, 10) || 0);
  } catch (error) {
    console.warn('Failed to load gold balance:', error);
    return 0;
  }
}

/**
 * Save gold balance to localStorage
 */
function saveGoldBalance(userId: string, amount: number): void {
  const safeLocalStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  if (!safeLocalStorage) return;
  
  try {
    safeLocalStorage.setItem(`${STORAGE_KEY_GOLD}_${userId}`, Math.max(0, amount).toString());
  } catch (error) {
    console.warn('Failed to save gold balance:', error);
  }
}

/**
 * Award gold coins
 */
function awardGold(userId: string, amount: number, context: string): number {
  const currentGold = loadGoldBalance(userId);
  const newGold = currentGold + amount;
  saveGoldBalance(userId, newGold);
  
  logRewardEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    source: 'lucky_roll',
    currency: 'gold',
    amount,
    context,
    timestamp: new Date().toISOString(),
  });
  
  return newGold;
}

/**
 * Deduct gold coins (never goes below 0)
 */
function deductGold(userId: string, amount: number, context: string): number {
  const currentGold = loadGoldBalance(userId);
  const deductAmount = Math.min(currentGold, amount); // Can't deduct more than available
  const newGold = currentGold - deductAmount;
  saveGoldBalance(userId, newGold);
  
  logRewardEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    source: 'lucky_roll',
    currency: 'gold',
    amount: -deductAmount,
    context,
    timestamp: new Date().toISOString(),
  });
  
  return newGold;
}

/**
 * Resolve mystery tile outcome
 */
function resolveMysteryOutcome(userId: string): TileEffectResult {
  const roll = getSecureRandomFloat();
  
  // 40% gain coins (20-80)
  if (roll < 0.40) {
    const amount = getRandomIntInclusive(20, 80);
    awardGold(userId, amount, 'Lucky Roll: Mystery tile - coins');
    
    return {
      type: 'mystery',
      amount,
      currency: 'gold',
      message: `🪙 +${amount} coins!`,
      celebrationType: amount >= 60 ? 'medium' : 'small',
    };
  }
  
  // 25% bonus dice (1-2)
  if (roll < 0.65) {
    const amount = getRandomIntInclusive(1, 2);
    awardDice(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - dice');
    
    return {
      type: 'mystery',
      amount,
      currency: 'dice',
      message: `🎲 +${amount} dice!`,
      celebrationType: 'medium',
    };
  }
  
  // 20% game tokens (2-4)
  if (roll < 0.85) {
    const amount = getRandomIntInclusive(2, 4);
    awardGameTokens(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - tokens');
    
    return {
      type: 'mystery',
      amount,
      currency: 'game_tokens',
      message: `🎟️ +${amount} tokens!`,
      celebrationType: 'small',
    };
  }
  
  // 10% nothing interesting
  if (roll < 0.95) {
    return {
      type: 'mystery',
      amount: 0,
      currency: 'none',
      message: 'Nothing this time...',
      celebrationType: 'none',
    };
  }
  
  // 5% jackpot-level (100+ coins)
  const amount = getRandomIntInclusive(100, 200);
  awardGold(userId, amount, 'Lucky Roll: Mystery tile - jackpot');
  
  return {
    type: 'mystery',
    amount,
    currency: 'gold',
    message: `💎 MYSTERY JACKPOT! +${amount} coins!`,
    celebrationType: 'big',
  };
}

/**
 * Main tile effect resolver
 * Determines what happens when landing on a tile
 */
export function resolveTileEffect(tile: BoardTile, userId: string): TileEffectResult {
  switch (tile.type) {
    case 'neutral':
      return {
        type: 'neutral',
        amount: 0,
        currency: 'none',
        message: tile.label || 'Safe Ground',
        celebrationType: 'none',
      };
    
    case 'gain_coins': {
      const min = tile.effect?.min || 10;
      const max = tile.effect?.max || 50;
      const amount = getRandomIntInclusive(min, max);
      awardGold(userId, amount, 'Lucky Roll: Gain coins tile');
      
      let celebrationType: 'small' | 'medium' | 'big' = 'small';
      if (amount >= 76) celebrationType = 'big';
      else if (amount >= 31) celebrationType = 'medium';
      
      return {
        type: 'gain_coins',
        amount,
        currency: 'gold',
        message: `🪙 +${amount} coins!`,
        celebrationType,
      };
    }
    
    case 'lose_coins': {
      const min = Math.abs(tile.effect?.min || -25);
      const max = Math.abs(tile.effect?.max || -5);
      const amount = getRandomIntInclusive(Math.min(min, max), Math.max(min, max));
      deductGold(userId, amount, 'Lucky Roll: Lose coins tile');
      
      return {
        type: 'lose_coins',
        amount,
        currency: 'gold',
        message: `-${amount} 🪙`,
        celebrationType: 'none',
      };
    }
    
    case 'bonus_dice': {
      const min = tile.effect?.min || 1;
      const max = tile.effect?.max || 3;
      const amount = getRandomIntInclusive(min, max);
      awardDice(userId, amount, 'lucky_roll', 'Lucky Roll: Bonus dice tile');
      
      return {
        type: 'bonus_dice',
        amount,
        currency: 'dice',
        message: `🎲 +${amount} dice!`,
        celebrationType: 'medium',
      };
    }
    
    case 'game_token': {
      const min = tile.effect?.min || 1;
      const max = tile.effect?.max || 3;
      const amount = getRandomIntInclusive(min, max);
      awardGameTokens(userId, amount, 'lucky_roll', 'Lucky Roll: Game token tile');
      
      return {
        type: 'game_token',
        amount,
        currency: 'game_tokens',
        message: `🎟️ +${amount} tokens!`,
        celebrationType: 'small',
      };
    }
    
    case 'mystery':
      return resolveMysteryOutcome(userId);
    
    case 'jackpot': {
      const min = tile.effect?.min || 100;
      const max = tile.effect?.max || 500;
      const amount = getRandomIntInclusive(min, max);
      awardGold(userId, amount, 'Lucky Roll: Jackpot tile');
      
      return {
        type: 'jackpot',
        amount,
        currency: 'gold',
        message: `💎 JACKPOT! +${amount} coins!`,
        celebrationType: 'big',
      };
    }
    
    case 'mini_game':
      return {
        type: 'mini_game',
        amount: 0,
        currency: 'none',
        message: tile.label || 'Mini-Game',
        celebrationType: 'medium',
        miniGame: tile.miniGame,
      };
    
    default:
      return {
        type: 'neutral',
        amount: 0,
        currency: 'none',
        message: 'Unknown tile',
        celebrationType: 'none',
      };
  }
}

/**
 * Get current gold balance for display
 */
export function getGoldBalance(userId: string): number {
  return loadGoldBalance(userId);
}
