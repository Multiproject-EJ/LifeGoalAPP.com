import { GAME_CONFIG } from './config'

export function calculateObjectScore(): number {
  return GAME_CONFIG.SCORING.PER_OBJECT
}

export function calculateToolBonus(toolsRemaining: number): number {
  return toolsRemaining * GAME_CONFIG.SCORING.TOOL_BONUS
}

export function calculateLevelCompleteBonus(): number {
  return GAME_CONFIG.SCORING.LEVEL_COMPLETE_BONUS
}

export function calculateTotalScore(
  objectsCollected: number,
  toolsRemaining: number,
  isComplete: boolean
): number {
  let score = objectsCollected * calculateObjectScore()
  
  if (isComplete) {
    score += calculateLevelCompleteBonus()
    score += calculateToolBonus(toolsRemaining)
  }
  
  return score
}
