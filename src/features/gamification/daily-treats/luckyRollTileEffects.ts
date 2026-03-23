/**
 * Lucky Roll Tile Effect Resolution System
 *
 * Handles what happens when landing on each tile type:
 * - Calculates rewards/penalties (with crypto RNG)
 * - Delivers rewards through gameRewards service
 * - Returns results for UI display
 */

import type { BoardTile } from './luckyRollTypes';
import { awardDice, awardGameTokens, logRewardEvent, type GameSource } from '../../../services/gameRewards';

const STORAGE_KEY_GOLD = 'gol_game_gold_balance';
const RANDOM_BUFFER = new Uint32Array(1);

export interface TileEffectResult {
  type:
    | 'gain_coins'
    | 'lose_coins'
    | 'bonus_dice'
    | 'game_token'
    | 'mystery'
    | 'jackpot'
    | 'neutral'
    | 'boost_step'
    | 'slow_zone'
    | 'finish';
  amount: number;
  currency: string;
  message: string;
  celebrationType: 'none' | 'small' | 'medium' | 'big';
  movementDelta?: number;
}

function getSecureRandomFloat(): number {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(RANDOM_BUFFER);
    return RANDOM_BUFFER[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function getRandomIntInclusive(min: number, max: number): number {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(getSecureRandomFloat() * (safeMax - safeMin + 1)) + safeMin;
}

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

function saveGoldBalance(userId: string, amount: number): void {
  const safeLocalStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  if (!safeLocalStorage) return;

  try {
    safeLocalStorage.setItem(`${STORAGE_KEY_GOLD}_${userId}`, Math.max(0, amount).toString());
  } catch (error) {
    console.warn('Failed to save gold balance:', error);
  }
}

export function awardGold(userId: string, amount: number, source: GameSource, context: string): number {
  const currentGold = loadGoldBalance(userId);
  const newGold = currentGold + amount;
  saveGoldBalance(userId, newGold);

  logRewardEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    source,
    currency: 'gold',
    amount,
    context,
    timestamp: new Date().toISOString(),
  });

  return newGold;
}

function deductGold(userId: string, amount: number, source: GameSource = 'lucky_roll', context: string): number {
  const currentGold = loadGoldBalance(userId);
  const deductAmount = Math.min(currentGold, amount);
  const newGold = currentGold - deductAmount;
  saveGoldBalance(userId, newGold);

  logRewardEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    source,
    currency: 'gold',
    amount: -deductAmount,
    context,
    timestamp: new Date().toISOString(),
  });

  return newGold;
}

function resolveMysteryOutcome(userId: string): TileEffectResult {
  const roll = getSecureRandomFloat();

  if (roll < 0.35) {
    const amount = getRandomIntInclusive(25, 90);
    awardGold(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - coins');
    return {
      type: 'mystery',
      amount,
      currency: 'gold',
      message: `🪙 +${amount} coins!`,
      celebrationType: amount >= 60 ? 'medium' : 'small',
    };
  }

  if (roll < 0.60) {
    const amount = getRandomIntInclusive(1, 2);
    awardDice(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - bonus rolls');
    return {
      type: 'mystery',
      amount,
      currency: 'dice',
      message: `🎲 +${amount} bonus roll${amount === 1 ? '' : 's'}!`,
      celebrationType: 'medium',
    };
  }

  if (roll < 0.78) {
    const amount = getRandomIntInclusive(1, 3);
    awardGameTokens(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - tokens');
    return {
      type: 'mystery',
      amount,
      currency: 'game_tokens',
      message: `🎟️ +${amount} tokens!`,
      celebrationType: 'small',
    };
  }

  if (roll < 0.90) {
    const amount = getRandomIntInclusive(1, 2);
    return {
      type: 'mystery',
      amount,
      currency: 'position',
      message: `🚀 Mystery boost! Move +${amount}.`,
      celebrationType: 'medium',
      movementDelta: amount,
    };
  }

  if (roll < 0.97) {
    const amount = -getRandomIntInclusive(1, 2);
    return {
      type: 'mystery',
      amount,
      currency: 'position',
      message: `🪨 Mystery snag! Slip ${Math.abs(amount)} tile${Math.abs(amount) === 1 ? '' : 's'}.`,
      celebrationType: 'none',
      movementDelta: amount,
    };
  }

  const amount = getRandomIntInclusive(120, 220);
  awardGold(userId, amount, 'lucky_roll', 'Lucky Roll: Mystery tile - jackpot');
  return {
    type: 'mystery',
    amount,
    currency: 'gold',
    message: `💎 MYSTERY JACKPOT! +${amount} coins!`,
    celebrationType: 'big',
  };
}

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
      const amount = getRandomIntInclusive(tile.effect?.min || 10, tile.effect?.max || 50);
      awardGold(userId, amount, 'lucky_roll', 'Lucky Roll: Gain coins tile');
      return {
        type: 'gain_coins',
        amount,
        currency: 'gold',
        message: `🪙 +${amount} coins!`,
        celebrationType: amount >= 40 ? 'medium' : 'small',
      };
    }

    case 'lose_coins': {
      const min = Math.abs(tile.effect?.min || -25);
      const max = Math.abs(tile.effect?.max || -5);
      const amount = getRandomIntInclusive(Math.min(min, max), Math.max(min, max));
      deductGold(userId, amount, 'lucky_roll', 'Lucky Roll: Lose coins tile');
      return {
        type: 'lose_coins',
        amount,
        currency: 'gold',
        message: `💸 -${amount} coins`,
        celebrationType: 'none',
      };
    }

    case 'bonus_dice': {
      const amount = getRandomIntInclusive(tile.effect?.min || 1, tile.effect?.max || 2);
      awardDice(userId, amount, 'lucky_roll', 'Lucky Roll: Bonus dice tile');
      return {
        type: 'bonus_dice',
        amount,
        currency: 'dice',
        message: `🎲 +${amount} bonus roll${amount === 1 ? '' : 's'}!`,
        celebrationType: 'medium',
      };
    }

    case 'game_token': {
      const amount = getRandomIntInclusive(tile.effect?.min || 1, tile.effect?.max || 2);
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
      const amount = getRandomIntInclusive(tile.effect?.min || 100, tile.effect?.max || 240);
      awardGold(userId, amount, 'lucky_roll', 'Lucky Roll: Jackpot tile');
      return {
        type: 'jackpot',
        amount,
        currency: 'gold',
        message: `💎 JACKPOT! +${amount} coins!`,
        celebrationType: 'big',
      };
    }

    case 'boost_step': {
      const amount = getRandomIntInclusive(tile.effect?.min || 1, tile.effect?.max || 2);
      return {
        type: 'boost_step',
        amount,
        currency: 'position',
        message: `🚀 Surge ahead +${amount}!`,
        celebrationType: 'medium',
        movementDelta: amount,
      };
    }

    case 'slow_zone': {
      const amount = getRandomIntInclusive(tile.effect?.min || -2, tile.effect?.max || -1);
      return {
        type: 'slow_zone',
        amount,
        currency: 'position',
        message: `🪨 Slow zone ${amount} tile${Math.abs(amount) === 1 ? '' : 's'}`,
        celebrationType: 'none',
        movementDelta: amount,
      };
    }

    case 'finish': {
      const tokenAmount = getRandomIntInclusive(tile.effect?.min || 5, tile.effect?.max || 8);
      const goldAmount = getRandomIntInclusive(150, 260);
      awardGameTokens(userId, tokenAmount, 'lucky_roll', 'Lucky Roll: Finish chest - tokens');
      awardGold(userId, goldAmount, 'lucky_roll', 'Lucky Roll: Finish chest - coins');
      return {
        type: 'finish',
        amount: tokenAmount,
        currency: 'game_tokens',
        message: `🏁 Finish chest! +${tokenAmount} tokens and +${goldAmount} coins!`,
        celebrationType: 'big',
      };
    }

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

export function getGoldBalance(userId: string): number {
  return loadGoldBalance(userId);
}
