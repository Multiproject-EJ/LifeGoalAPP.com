import { useState, useCallback } from 'react'
import type { LevelState, LevelResult, Position, LevelConfig } from '../types/game'
import { levels, getLevel } from '../data/levels'
import { generateBoard, canBreakTile, getTileStatus, getTileRenderState } from '../game/engine'
import { checkObjectCompletion } from '../game/winConditions'
import { calculateTotalScore } from '../game/scoring'
import { GAME_CONFIG } from '../game/config'

function initializeLevelState(config: LevelConfig): LevelState {
  const board = generateBoard(config)
  return {
    board,
    toolsRemaining: config.tools,
    objectsCollected: 0,
    totalObjects: config.objects.length,
    isComplete: false,
    isGameOver: false,
    score: 0,
  }
}

export function useTreasureDigGame(customLevels?: LevelConfig[], initialLevel: number = 1) {
  const levelData = customLevels || levels
  const [currentLevel, setCurrentLevel] = useState(initialLevel)

  const currentLevelConfig = getLevel(currentLevel) || levelData[0]

  const [levelState, setLevelState] = useState<LevelState>(() =>
    initializeLevelState(currentLevelConfig)
  )

  const [bombEffect, setBombEffect] = useState<{ type: 'row' | 'col'; index: number } | null>(null)
  const [chainRowEffect, setChainRowEffect] = useState<number | null>(null)

  const breakTile = useCallback((position: Position) => {
    setLevelState(prev => {
      const { board, toolsRemaining } = prev
      const tile = board.tiles[position.row]?.[position.col]

      if (!canBreakTile(tile, prev.isComplete, prev.isGameOver)) {
        console.log(`[TILE DIG] Cannot break tile at (${position.row}, ${position.col})`)
        return prev
      }

      const newToolsRemaining = toolsRemaining - 1
      const currentHP = tile.hp || 1
      const currentMaxHP = tile.maxHp || 1

      console.log(`[TILE DIG] ====== CLICK START ======`)
      console.log(`[TILE DIG] Position: (${position.row}, ${position.col})`)
      console.log(`[TILE DIG] Contains treasure: ${!!tile.objectId}`)
      console.log(`[TILE DIG] Type: ${tile.type}`)
      console.log(`[TILE DIG] Status before: ${tile.status}`)
      console.log(`[TILE DIG] HP before: ${currentHP}`)
      console.log(`[TILE DIG] MaxHP: ${currentMaxHP}`)

      const newTiles = board.tiles.map(row => row.map(t => ({ ...t })))
      const updatedTile = newTiles[position.row][position.col]

      const newHP = currentHP - 1
      updatedTile.hp = newHP
      updatedTile.status = 'breaking'

      console.log(`[TILE DIG] HP after decrement: ${newHP}`)
      console.log(`[TILE DIG] Durability remaining: ${newHP}`)

      if (newHP > 0) {
        console.log(`[TILE DIG] Tile still has durability, setting to cracked state after animation`)

        setTimeout(() => {
          setLevelState(current => {
            const newTilesAfterBreak = current.board.tiles.map(row => row.map(t => ({ ...t })))
            const tileAfterBreak = newTilesAfterBreak[position.row][position.col]

            if (
              tileAfterBreak.status === 'breaking' &&
              tileAfterBreak.hp !== undefined &&
              tileAfterBreak.hp > 0
            ) {
              tileAfterBreak.status = 'cracked'
              tileAfterBreak.renderState = 'damaged'
              console.log(
                `[TILE DIG] Transitioned to cracked/damaged state, HP remaining: ${tileAfterBreak.hp}`
              )
              console.log(`[TILE DIG] Tile can be clicked again`)
            }

            return {
              ...current,
              board: {
                ...current.board,
                tiles: newTilesAfterBreak,
              },
            }
          })
        }, GAME_CONFIG.ANIMATION.TILE_REVEAL_DELAY)

        return {
          ...prev,
          toolsRemaining: newToolsRemaining,
          board: {
            ...board,
            tiles: newTiles,
          },
        }
      }

      console.log(`[TILE DIG] Durability reached 0, fully revealing tile`)

      setTimeout(() => {
        setLevelState(current => {
          const newTilesAfterBreak = current.board.tiles.map(row => row.map(t => ({ ...t })))
          const updatedTile = newTilesAfterBreak[position.row][position.col]

          if (updatedTile.hp !== undefined) {
            updatedTile.hp = 0
          }

          const finalStatus = getTileStatus(updatedTile, current.board.objects)
          updatedTile.status = finalStatus
          updatedTile.renderState = getTileRenderState(updatedTile)

          console.log(`[TILE DIG] Final status: ${finalStatus}`)
          console.log(`[TILE DIG] Final render state: ${updatedTile.renderState}`)
          console.log(`[TILE DIG] ====== CLICK END ======`)

          let objectsCollected = current.objectsCollected
          let bonusTools = 0
          const tilesToReveal: Position[] = []

          if (updatedTile.type === 'bonus') {
            bonusTools = 3
          }

          if (updatedTile.type === 'chain-row') {
            console.log(`[CHAIN] Chain-row triggered at row ${position.row}`)
            setChainRowEffect(position.row)
            setTimeout(() => setChainRowEffect(null), 800)

            for (let col = 0; col < current.board.size; col++) {
              if (col !== position.col) {
                const targetTile = newTilesAfterBreak[position.row][col]
                if (targetTile.status === 'hidden' || targetTile.status === 'cracked') {
                  console.log(
                    `[CHAIN] Adding tile at (${position.row}, ${col}) to reveal queue - current status: ${targetTile.status}`
                  )
                  tilesToReveal.push({ row: position.row, col })
                }
              }
            }
            console.log(`[CHAIN] Total tiles queued for chain reveal: ${tilesToReveal.length}`)
          }

          if (updatedTile.type === 'bomb-row') {
            setBombEffect({ type: 'row', index: position.row })
            setTimeout(() => setBombEffect(null), 800)

            for (let col = 0; col < current.board.size; col++) {
              if (col !== position.col) {
                const targetTile = newTilesAfterBreak[position.row][col]
                if (targetTile.status === 'hidden' || targetTile.status === 'cracked') {
                  tilesToReveal.push({ row: position.row, col })
                }
              }
            }
          }

          if (updatedTile.type === 'bomb-col') {
            setBombEffect({ type: 'col', index: position.col })
            setTimeout(() => setBombEffect(null), 800)

            for (let row = 0; row < current.board.size; row++) {
              if (row !== position.row) {
                const targetTile = newTilesAfterBreak[row][position.col]
                if (targetTile.status === 'hidden' || targetTile.status === 'cracked') {
                  tilesToReveal.push({ row, col: position.col })
                }
              }
            }
          }

          if (updatedTile.type === 'reveal') {
            const neighbors = [
              { row: position.row - 1, col: position.col },
              { row: position.row + 1, col: position.col },
              { row: position.row, col: position.col - 1 },
              { row: position.row, col: position.col + 1 },
            ]
            neighbors.forEach(pos => {
              if (newTilesAfterBreak[pos.row]?.[pos.col]?.status === 'hidden') {
                tilesToReveal.push(pos)
              }
            })
          }

          tilesToReveal.forEach(pos => {
            const tileToReveal = newTilesAfterBreak[pos.row][pos.col]

            if (tileToReveal.type === 'hard' && tileToReveal.hp !== undefined && tileToReveal.hp > 1) {
              tileToReveal.hp -= 1
              tileToReveal.status = 'cracked'
              tileToReveal.renderState = 'damaged'
              console.log(
                `[CHAIN REVEAL] Hard tile at (${pos.row}, ${pos.col}) damaged, HP now: ${tileToReveal.hp}`
              )
            } else if (tileToReveal.type === 'hard' && tileToReveal.hp === 1) {
              tileToReveal.hp = 0
              const revealedStatus = getTileStatus(tileToReveal, current.board.objects)
              tileToReveal.status = revealedStatus
              tileToReveal.renderState = getTileRenderState(tileToReveal)
              console.log(
                `[CHAIN REVEAL] Hard tile at (${pos.row}, ${pos.col}) fully revealed - status: ${revealedStatus}, renderState: ${tileToReveal.renderState}`
              )

              if (tileToReveal.objectId) {
                const obj = current.board.objects.get(tileToReveal.objectId)
                if (obj && !obj.isCollected) {
                  const posKey = `${pos.row},${pos.col}`
                  obj.revealedCells.add(posKey)
                }
              }
            } else {
              const revealedStatus = getTileStatus(tileToReveal, current.board.objects)
              tileToReveal.status = revealedStatus
              tileToReveal.renderState = getTileRenderState(tileToReveal)
              console.log(
                `[CHAIN REVEAL] Tile at (${pos.row}, ${pos.col}) revealed - status: ${revealedStatus}, renderState: ${tileToReveal.renderState}, hasTreasure: ${!!tileToReveal.objectId}`
              )

              if (tileToReveal.objectId) {
                const obj = current.board.objects.get(tileToReveal.objectId)
                if (obj && !obj.isCollected) {
                  const posKey = `${pos.row},${pos.col}`
                  obj.revealedCells.add(posKey)
                }
              }
            }
          })

          if (updatedTile.objectId) {
            const obj = current.board.objects.get(updatedTile.objectId)
            if (obj && !obj.isCollected) {
              const completed = checkObjectCompletion(obj, position)

              if (completed) {
                obj.isCollected = true
                objectsCollected += 1
              }
            }
          }

          const isComplete = objectsCollected === current.totalObjects
          const finalToolCount = newToolsRemaining + bonusTools
          const gameOver = finalToolCount <= 0 && !isComplete
          const newScore = calculateTotalScore(objectsCollected, finalToolCount, isComplete)

          return {
            ...current,
            toolsRemaining: finalToolCount,
            objectsCollected,
            score: newScore,
            isComplete,
            isGameOver: gameOver,
            board: {
              ...current.board,
              tiles: newTilesAfterBreak,
            },
          }
        })
      }, GAME_CONFIG.ANIMATION.TILE_REVEAL_DELAY)

      return {
        ...prev,
        toolsRemaining: newToolsRemaining,
        board: { ...board, tiles: newTiles },
      }
    })
  }, [])

  const restartLevel = useCallback(() => {
    setLevelState(initializeLevelState(currentLevelConfig))
  }, [currentLevelConfig])

  const nextLevel = useCallback(() => {
    const newLevel = currentLevel + 1
    const newLevelConfig = getLevel(newLevel) || levelData[0]

    setCurrentLevel(newLevel)
    setLevelState(initializeLevelState(newLevelConfig))
  }, [currentLevel, levelData])

  const getLevelResult = useCallback((): LevelResult => {
    return {
      levelId: currentLevel,
      completed: levelState.isComplete,
      toolsLeft: levelState.toolsRemaining,
      score: levelState.score,
      objectsFound: levelState.objectsCollected,
      totalObjects: levelState.totalObjects,
      timestamp: Date.now(),
    }
  }, [currentLevel, levelState])

  return {
    levelState,
    currentLevel,
    currentLevelConfig,
    breakTile,
    restartLevel,
    nextLevel,
    getLevelResult,
    bombEffect,
    chainRowEffect,
  }
}