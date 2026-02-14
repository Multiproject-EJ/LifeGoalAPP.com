// Level Worlds Rewards Service
// Manages reward tables and awarding for node completion and board completion

import type { NodeReward, BoardCompletionReward } from '../types/levelWorlds';
import { awardHearts, awardDice, awardGameTokens, type GameSource } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardXP } from '../../../../services/gamification';

/**
 * Get reward for completing a node based on level
 * Level 1-3: 1❤️ + 3🎲 + 15🪙
 * Level 4-7: 1❤️ + 5🎲 + 25🪙
 * Level 8-15: 2❤️ + 7🎲 + 40🪙
 * Level 16+: 2❤️ + 10🎲 + 50🪙
 */
export function getNodeReward(level: number): NodeReward {
  if (level <= 3) {
    return { hearts: 1, dice: 3, coins: 15, xp: 10 };
  } else if (level <= 7) {
    return { hearts: 1, dice: 5, coins: 25, xp: 15 };
  } else if (level <= 15) {
    return { hearts: 2, dice: 7, coins: 40, xp: 20 };
  } else {
    return { hearts: 2, dice: 10, coins: 50, xp: 30 };
  }
}

/**
 * Get reward for completing a board based on level
 * Level 1-3: 3❤️ + 10🎲 + 50🪙
 * Level 4-7: 5❤️ + 20🎲 + 100🪙
 * Level 8-15: 8❤️ + 30🎲 + 200🪙
 * Level 16+: 10❤️ + 50🎲 + 300🪙 + cosmetic
 */
export function getBoardCompletionReward(level: number): BoardCompletionReward {
  if (level <= 3) {
    return {
      hearts: 3,
      dice: 10,
      coins: 50,
      gameTokens: 2,
      xp: 50
    };
  } else if (level <= 7) {
    return {
      hearts: 5,
      dice: 20,
      coins: 100,
      gameTokens: 3,
      xp: 100
    };
  } else if (level <= 15) {
    return {
      hearts: 8,
      dice: 30,
      coins: 200,
      gameTokens: 5,
      xp: 150
    };
  } else {
    return {
      hearts: 10,
      dice: 50,
      coins: 300,
      gameTokens: 8,
      xp: 250,
      cosmetic: level % 5 === 0 ? `level_${level}_badge` : undefined,
      title: level % 10 === 0 ? `World ${Math.floor(level / 10)} Champion` : undefined
    };
  }
}

/**
 * Award node completion reward to user
 */
export async function awardNodeReward(userId: string, reward: NodeReward): Promise<void> {
  try {
    const source: GameSource = 'lucky_roll'; // Use lucky_roll as source since Level Worlds is part of the game system
    
    if (reward.hearts) {
      awardHearts(userId, reward.hearts, source, 'Level Worlds node completion');
    }
    
    if (reward.dice) {
      awardDice(userId, reward.dice, source, 'Level Worlds node completion');
    }
    
    if (reward.coins) {
      awardGold(userId, reward.coins, source, 'Level Worlds node completion');
    }
    
    if (reward.gameTokens) {
      awardGameTokens(userId, reward.gameTokens, source, 'Level Worlds node completion');
    }
    
    if (reward.xp) {
      await awardXP(userId, reward.xp, 'level_worlds', 'Level Worlds node completion');
    }
  } catch (error) {
    console.error('Error awarding node reward:', error);
  }
}

/**
 * Award board completion reward to user
 */
export async function awardBoardCompletionReward(
  userId: string,
  reward: BoardCompletionReward,
  level: number
): Promise<void> {
  try {
    const source: GameSource = 'lucky_roll';
    const context = `Level Worlds board ${level} completion`;
    
    awardHearts(userId, reward.hearts, source, context);
    awardDice(userId, reward.dice, source, context);
    awardGold(userId, reward.coins, source, context);
    awardGameTokens(userId, reward.gameTokens, source, context);
    await awardXP(userId, reward.xp, 'level_worlds', context);
    
    // TODO: Handle cosmetic and title unlocks when those systems are ready
    if (reward.cosmetic) {
      console.log('Cosmetic unlock:', reward.cosmetic);
    }
    
    if (reward.title) {
      console.log('Title unlock:', reward.title);
    }
  } catch (error) {
    console.error('Error awarding board completion reward:', error);
  }
}
