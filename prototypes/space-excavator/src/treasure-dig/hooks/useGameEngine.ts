import { useState, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { GameState, Level, LevelState, LevelResult, Position } from '../types/game.types'
import { levels, getLevel } from '../data/levels'
import { generateBoard } from '../game/boardGenerator'
import { findObjectAtPosition, checkObjectCompletion } from '../utils/objectDetector'
import { GAME_CONSTANTS } from '../data/constants'

const initialGameState: GameState = {
  currentLevel: 1,
  completedLevels: [],
  totalScore: 0,
  highScores: {},
}

export function useGameEngine(customLevels?: Level[], initialLevel?: number) {
  const levelData = customLevels || levels
  const [gameState, setGameState, deleteGameState] = useKV<GameState>(
    GAME_CONSTANTS.STORAGE_KEYS.GAME_STATE,
    initialGameState
  )

  const startingLevel = initialLevel || (gameState?.currentLevel ?? 1)
  const currentLevelConfig = getLevel(startingLevel) || levelData[0]

  const [levelState, setLevelState] = useState<LevelState>(() => {
    const board = generateBoard(currentLevelConfig)
    return {
      board,
      toolsRemaining: currentLevelConfig.tools,
      objectsCollected: 0,
      totalObjects: currentLevelConfig.objects.length,
      isComplete: false,
      isGameOver: false,
      score: 0,
    }
  })

  const breakTile = useCallback(
    (position: Position) => {
      if (levelState.isComplete || levelState.isGameOver) return

      setLevelState(prev => {
        const { board, toolsRemaining } = prev
        const tile = board.tiles[position.row]?.[position.col]

        if (!tile || tile.status !== 'hidden') return prev

        const newToolsRemaining = toolsRemaining - 1
        let newScore = prev.score
        let objectsCollected = prev.objectsCollected
        let isComplete = prev.isComplete

        tile.status = 'breaking'
        
        setTimeout(() => {
          setLevelState(current => {
            const updatedTile = current.board.tiles[position.row][position.col]
            const tilesToReveal: Position[] = [position]
            
            if (updatedTile.specialType === 'bomb-row') {
              for (let col = 0; col < current.board.size; col++) {
                if (col !== position.col) {
                  tilesToReveal.push({ row: position.row, col })
                }
              }
            } else if (updatedTile.specialType === 'bomb-col') {
              for (let row = 0; row < current.board.size; row++) {
                if (row !== position.row) {
                  tilesToReveal.push({ row, col: position.col })
                }
              }
            } else if (updatedTile.specialType === 'chain-row') {
              for (let col = 0; col < current.board.size; col++) {
                if (col !== position.col) {
                  tilesToReveal.push({ row: position.row, col })
                }
              }
            }

            tilesToReveal.forEach(pos => {
              const tileToReveal = current.board.tiles[pos.row]?.[pos.col]
              if (!tileToReveal || tileToReveal.status !== 'hidden') return
              
              if (tileToReveal.isBlocker) {
                tileToReveal.status = 'revealed-blocker'
              } else if (tileToReveal.objectId) {
                tileToReveal.status = 'revealed-object'
                
                const obj = current.board.objects.get(tileToReveal.objectId)
                if (obj && !obj.isCollected) {
                  const completed = checkObjectCompletion(obj, pos)
                  
                  if (completed) {
                    obj.isCollected = true
                    objectsCollected += 1
                    newScore += GAME_CONSTANTS.SCORING.PER_OBJECT
                    
                    if (objectsCollected === current.totalObjects) {
                      isComplete = true
                      newScore += GAME_CONSTANTS.SCORING.LEVEL_COMPLETE_BONUS
                      newScore += newToolsRemaining * GAME_CONSTANTS.SCORING.TOOL_BONUS
                    }
                  }
                }
              } else {
                tileToReveal.status = 'revealed-empty'
              }
            })

            const isGameOver = newToolsRemaining === 0 && !isComplete

            return {
              ...current,
              toolsRemaining: newToolsRemaining,
              objectsCollected,
              score: newScore,
              isComplete,
              isGameOver,
            }
          })
        }, GAME_CONSTANTS.ANIMATION_DURATION.TILE_BREAK)

        return {
          ...prev,
          toolsRemaining: newToolsRemaining,
        }
      })
    },
    [levelState.isComplete, levelState.isGameOver]
  )

  const restartLevel = useCallback(() => {
    const board = generateBoard(currentLevelConfig)
    setLevelState({
      board,
      toolsRemaining: currentLevelConfig.tools,
      objectsCollected: 0,
      totalObjects: currentLevelConfig.objects.length,
      isComplete: false,
      isGameOver: false,
      score: 0,
    })
  }, [currentLevelConfig])

  const nextLevel = useCallback(() => {
    const nextLevelId = currentLevelConfig.id + 1
    const nextLevelConfig = getLevel(nextLevelId)

    if (!nextLevelConfig) return

    setGameState(prev => {
      const current: GameState = prev || initialGameState
      return {
        ...current,
        currentLevel: nextLevelId,
        completedLevels: [...current.completedLevels, currentLevelConfig.id],
        totalScore: current.totalScore + levelState.score,
        highScores: {
          ...current.highScores,
          [currentLevelConfig.id]: Math.max(
            current.highScores[currentLevelConfig.id] || 0,
            levelState.score
          ),
        },
      }
    })

    const board = generateBoard(nextLevelConfig)
    setLevelState({
      board,
      toolsRemaining: nextLevelConfig.tools,
      objectsCollected: 0,
      totalObjects: nextLevelConfig.objects.length,
      isComplete: false,
      isGameOver: false,
      score: 0,
    })
  }, [currentLevelConfig, levelState.score, setGameState])

  const getLevelResult = useCallback((): LevelResult => {
    return {
      levelId: currentLevelConfig.id,
      completed: levelState.isComplete,
      toolsLeft: levelState.toolsRemaining,
      score: levelState.score,
      objectsFound: levelState.objectsCollected,
      totalObjects: levelState.totalObjects,
      timestamp: Date.now(),
    }
  }, [currentLevelConfig.id, levelState])

  return {
    levelState,
    currentLevel: currentLevelConfig,
    gameState,
    breakTile,
    restartLevel,
    nextLevel,
    getLevelResult,
  }
}
