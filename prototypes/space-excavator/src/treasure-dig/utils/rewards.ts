import type { Reward } from '../types/game.types'
import { GAME_CONSTANTS } from '../data/constants'

export function calculateReward(
  levelId: number,
  toolsRemaining: number,
  objectsFound: number
): Reward {
  const isMilestone = GAME_CONSTANTS.MILESTONES.includes(levelId)

  if (isMilestone) {
    return {
      type: 'milestone',
      amount: 500,
      message: `Level ${levelId} Milestone! Bonus reward!`,
    }
  }

  const baseReward = objectsFound * GAME_CONSTANTS.SCORING.PER_OBJECT
  const toolBonus = toolsRemaining * GAME_CONSTANTS.SCORING.TOOL_BONUS
  const total = baseReward + toolBonus + GAME_CONSTANTS.SCORING.LEVEL_COMPLETE_BONUS

  return {
    type: 'coins',
    amount: total,
    message: `+${total} coins`,
  }
}
