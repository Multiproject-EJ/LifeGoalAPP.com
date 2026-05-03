import type {
  LevelConfig,
  Board,
  TileState,
  Position,
  PlacedObject,
  TileStatus,
} from '../types/game.types'
import { getObjectShape } from '../data/objects'

export interface EngineState {
  board: Board
  toolsRemaining: number
  objectsCollected: number
  totalObjects: number
  isComplete: boolean
  isGameOver: boolean
  score: number
}

export interface BreakTileResult {
  newState: EngineState
  tileRevealed: TileStatus
  objectCompleted: boolean
  levelComplete: boolean
  gameOver: boolean
}

export class GameEngine {
  private state: EngineState

  constructor(level: LevelConfig) {
    this.state = this.initializeState(level)
  }

  private initializeState(level: LevelConfig): EngineState {
    const board = this.generateBoard(level)
    return {
      board,
      toolsRemaining: level.tools,
      objectsCollected: 0,
      totalObjects: level.objects.length,
      isComplete: false,
      isGameOver: false,
      score: 0,
    }
  }

  private generateBoard(level: LevelConfig): Board {
    const size = level.boardSize
    const tiles: TileState[][] = []

    for (let row = 0; row < size; row++) {
      tiles[row] = []
      for (let col = 0; col < size; col++) {
        tiles[row][col] = {
          position: { row, col },
          status: 'hidden',
        }
      }
    }

    const objectsMap = new Map<string, PlacedObject>()

    level.objects.forEach((objConfig, index) => {
      const objectId = `obj-${level.id}-${index}`
      const placed = this.placeObject(objConfig.shapeId, objConfig.position, objectId)

      if (placed) {
        objectsMap.set(objectId, placed)

        placed.cells.forEach((cell) => {
          if (tiles[cell.row] && tiles[cell.row][cell.col]) {
            tiles[cell.row][cell.col].objectId = objectId
          }
        })
      }
    })

    if (level.blockers) {
      level.blockers.forEach((blocker) => {
        if (tiles[blocker.row] && tiles[blocker.row][blocker.col]) {
          tiles[blocker.row][blocker.col].isBlocker = true
        }
      })
    }

    return {
      size,
      tiles,
      objects: objectsMap,
    }
  }

  private placeObject(
    shapeId: string,
    position: Position,
    objectId: string
  ): PlacedObject | null {
    const shape = getObjectShape(shapeId)
    if (!shape) return null

    const cells: Position[] = []
    const pattern = shape.pattern

    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        if (pattern[row][col] === 1) {
          cells.push({
            row: position.row + row,
            col: position.col + col,
          })
        }
      }
    }

    return {
      id: objectId,
      shapeId,
      position,
      cells,
      revealedCells: new Set(),
      isCollected: false,
    }
  }

  private positionKey(position: Position): string {
    return `${position.row},${position.col}`
  }

  private checkObjectCompletion(obj: PlacedObject, revealedPosition: Position): boolean {
    const key = this.positionKey(revealedPosition)
    obj.revealedCells.add(key)
    return obj.revealedCells.size === obj.cells.length
  }

  public breakTile(position: Position, scoringConfig: { perObject: number; toolBonus: number; levelBonus: number }): BreakTileResult {
    const tile = this.state.board.tiles[position.row]?.[position.col]

    if (!tile || tile.status !== 'hidden' || this.state.isComplete || this.state.isGameOver) {
      return {
        newState: this.state,
        tileRevealed: tile?.status || 'hidden',
        objectCompleted: false,
        levelComplete: false,
        gameOver: false,
      }
    }

    this.state.toolsRemaining -= 1
    let objectCompleted = false
    let tileRevealed: TileStatus = 'revealed-empty'

    if (tile.isBlocker) {
      tile.status = 'revealed-blocker'
      tileRevealed = 'revealed-blocker'
    } else if (tile.objectId) {
      tile.status = 'revealed-object'
      tileRevealed = 'revealed-object'

      const obj = this.state.board.objects.get(tile.objectId)
      if (obj && !obj.isCollected) {
        const completed = this.checkObjectCompletion(obj, position)

        if (completed) {
          obj.isCollected = true
          this.state.objectsCollected += 1
          this.state.score += scoringConfig.perObject
          objectCompleted = true

          if (this.state.objectsCollected === this.state.totalObjects) {
            this.state.isComplete = true
            this.state.score += scoringConfig.levelBonus
            this.state.score += this.state.toolsRemaining * scoringConfig.toolBonus
          }
        }
      }
    } else {
      tile.status = 'revealed-empty'
      tileRevealed = 'revealed-empty'
    }

    const isGameOver = this.state.toolsRemaining === 0 && !this.state.isComplete

    if (isGameOver) {
      this.state.isGameOver = true
    }

    return {
      newState: { ...this.state },
      tileRevealed,
      objectCompleted,
      levelComplete: this.state.isComplete,
      gameOver: isGameOver,
    }
  }

  public getState(): EngineState {
    return { ...this.state }
  }

  public reset(level: LevelConfig): void {
    this.state = this.initializeState(level)
  }
}
