// Level Worlds Rewards Service
// Manages reward tables and awarding for node completion and board completion
//
// Hearts and coins are RETIRED from the island game economy.
// All rewards now grant dice, essence, game tokens, shards, and XP.

import type { NodeReward, BoardCompletionReward } from '../types/levelWorlds';
import { awardDice, awardGameTokens, type GameSource } from '../../../../services/gameRewards';
import { awardXP } from '../../../../services/gamification';

/**
 * Get reward for completing a node based on level.
 * Hearts/coins retired — replaced with essence + shards.
 *
 * Level 1-3:  5🟣 + 3🎲 + 1🔮 + 10 XP
 * Level 4-7:  10🟣 + 5🎲 + 2🔮 + 15 XP
 * Level 8-15: 18🟣 + 7🎲 + 3🔮 + 20 XP
 * Level 16+:  25🟣 + 10🎲 + 4🔮 + 30 XP
 */
export function getNodeReward(level: number): NodeReward {
  if (level <= 3) {
    return { dice: 3, essence: 5, shards: 1, xp: 10 };
  } else if (level <= 7) {
    return { dice: 5, essence: 10, shards: 2, xp: 15 };
  } else if (level <= 15) {
    return { dice: 7, essence: 18, shards: 3, xp: 20 };
  } else {
    return { dice: 10, essence: 25, shards: 4, xp: 30 };
  }
}

/**
 * Get reward for completing a board based on level.
 * Hearts/coins retired — replaced with essence + shards + game tokens.
 *
 * Level 1-3:  30🟣 + 10🎲 + 5🔮 + 2🎫 + 50 XP
 * Level 4-7:  60🟣 + 20🎲 + 10🔮 + 3🎫 + 100 XP
 * Level 8-15: 120🟣 + 30🎲 + 18🔮 + 5🎫 + 150 XP
 * Level 16+:  200🟣 + 50🎲 + 25🔮 + 8🎫 + 250 XP + cosmetic
 */
export function getBoardCompletionReward(level: number): BoardCompletionReward {
  if (level <= 3) {
    return {
      dice: 10,
      essence: 30,
      shards: 5,
      gameTokens: 2,
      xp: 50
    };
  } else if (level <= 7) {
    return {
      dice: 20,
      essence: 60,
      shards: 10,
      gameTokens: 3,
      xp: 100
    };
  } else if (level <= 15) {
    return {
      dice: 30,
      essence: 120,
      shards: 18,
      gameTokens: 5,
      xp: 150
    };
  } else {
    return {
      dice: 50,
      essence: 200,
      shards: 25,
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
    
    if (reward.dice) {
      awardDice(userId, reward.dice, source, 'Level Worlds node completion');
    }
    
    if (reward.gameTokens) {
      awardGameTokens(userId, reward.gameTokens, source, 'Level Worlds node completion');
    }
    
    if (reward.xp) {
      await awardXP(userId, reward.xp, 'level_worlds', 'Level Worlds node completion');
    }

    // NOTE: essence and shards are applied directly to the island run runtime
    // state by the caller (IslandRunBoardPrototype), not through this service.
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
    
    awardDice(userId, reward.dice, source, context);
    awardGameTokens(userId, reward.gameTokens, source, context);
    await awardXP(userId, reward.xp, 'level_worlds', context);
    
    // NOTE: essence and shards are applied directly to the island run runtime
    // state by the caller, not through this service.

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
