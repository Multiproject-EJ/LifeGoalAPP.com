import type { LevelConfig, Board, Position, PlacedObject, Tile, TileStatus, TileType, TileRenderState } from '../types/game'
import { getObjectShape } from '../data/shapes'
import { placeObject } from './placement'

function createEmptyTiles(size: number): Tile[][] {
  const tiles: Tile[][] = []
  
  for (let row = 0; row < size; row++) {
    tiles[row] = []
    for (let col = 0; col < size; col++) {
      tiles[row][col] = {
        position: { row, col },
        status: 'hidden',
        renderState: 'hidden',
        type: 'normal',
      }
    }
  }
  
  return tiles
}

function placeObjectsOnBoard(
  tiles: Tile[][],
  objects: ReadonlyArray<{ shapeId: string; position: Position }>,
  levelId: number,
  boardSize: number
): Map<string, PlacedObject> {
  const objectsMap = new Map<string, PlacedObject>()

  objects.forEach((objConfig, index) => {
    const objectId = `obj-${levelId}-${index}`
    const placedObject = placeObject(objConfig.shapeId, objConfig.position, objectId, boardSize)
    const shape = getObjectShape(objConfig.shapeId)
    
    if (!placedObject) {
      console.error(
        `[ENGINE] Failed to place object ${objConfig.shapeId} at position (${objConfig.position.row}, ${objConfig.position.col}) ` +
        `on level ${levelId}. Object extends outside board bounds.`
      )
      return
    }
    
    if (!shape) {
      console.error(`[ENGINE] Shape definition not found for ${objConfig.shapeId}`)
      return
    }
    
    placedObject.cells.forEach((cell) => {
      if (!tiles[cell.row]) {
        console.error(`[ENGINE] Tile row ${cell.row} does not exist on board of size ${boardSize}`)
        return
      }
      
      if (!tiles[cell.row][cell.col]) {
        console.error(`[ENGINE] Tile at (${cell.row}, ${cell.col}) does not exist on board of size ${boardSize}`)
        return
      }
      
      const spriteRow = cell.row - objConfig.position.row
      const spriteCol = cell.col - objConfig.position.col
      
      tiles[cell.row][cell.col].objectId = objectId
      tiles[cell.row][cell.col].spritePosition = { row: spriteRow, col: spriteCol }
      tiles[cell.row][cell.col].objectColor = shape.color
    })
    
    objectsMap.set(objectId, placedObject)
  })

  return objectsMap
}

function placeBlockersOnBoard(
  tiles: Tile[][],
  blockers: ReadonlyArray<Position> | undefined
): void {
  if (!blockers) return

  blockers.forEach((blocker) => {
    if (tiles[blocker.row]?.[blocker.col]) {
      tiles[blocker.row][blocker.col].isBlocker = true
      tiles[blocker.row][blocker.col].type = 'blocker'
    }
  })
}

function placeSpecialTilesOnBoard(tiles: Tile[][], level: LevelConfig): void {
  if (level.hardTiles) {
    level.hardTiles.forEach(({ position, hp }) => {
      if (tiles[position.row]?.[position.col]) {
        tiles[position.row][position.col].type = 'hard'
        tiles[position.row][position.col].hp = hp
        tiles[position.row][position.col].maxHp = hp
      }
    })
  }

  if (level.bombTiles) {
    level.bombTiles.forEach(({ position, direction }) => {
      if (tiles[position.row]?.[position.col]) {
        tiles[position.row][position.col].type = direction === 'row' ? 'bomb-row' : 'bomb-col'
      }
    })
  }

  if (level.revealTiles) {
    level.revealTiles.forEach((position) => {
      if (tiles[position.row]?.[position.col]) {
        tiles[position.row][position.col].type = 'reveal'
      }
    })
  }

  if (level.bonusTiles) {
    level.bonusTiles.forEach((position) => {
      if (tiles[position.row]?.[position.col]) {
        tiles[position.row][position.col].type = 'bonus'
      }
    })
  }

  if (level.chainRowTiles) {
    level.chainRowTiles.forEach((position) => {
      if (tiles[position.row]?.[position.col]) {
        tiles[position.row][position.col].type = 'chain-row'
      }
    })
  }
}

export function generateBoard(level: LevelConfig): Board {
  const tiles = createEmptyTiles(level.boardSize)
  const objectsMap = placeObjectsOnBoard(tiles, level.objects, level.id, level.boardSize)
  placeBlockersOnBoard(tiles, level.blockers)
  placeSpecialTilesOnBoard(tiles, level)

  return {
    size: level.boardSize,
    tiles,
    objects: objectsMap,
  }
}

export function getTileRenderState(tile: Tile): TileRenderState {
  if (tile.status === 'hidden') {
    return 'hidden'
  }
  
  if (tile.status === 'cracked' || (tile.hp !== undefined && tile.hp > 0)) {
    return 'damaged'
  }
  
  if (tile.isBlocker) {
    return 'revealedBlocker'
  }
  
  if (tile.objectId) {
    return 'revealedTreasure'
  }
  
  return 'revealedEmpty'
}

export function getTileStatus(
  tile: Tile,
  objectsMap: Map<string, PlacedObject>
): TileStatus {
  if (tile.status === 'breaking') return 'breaking'
  if (tile.hp !== undefined && tile.hp > 0) return 'cracked'
  if (tile.isBlocker) return 'revealed-blocker'
  if (tile.objectId) return 'revealed-object'
  return 'revealed-empty'
}

export function canBreakTile(
  tile: Tile | undefined,
  isComplete: boolean,
  isGameOver: boolean
): boolean {
  if (!tile || isComplete || isGameOver) {
    console.log(`[CAN_BREAK] Blocked: tile=${!!tile}, complete=${isComplete}, gameOver=${isGameOver}`)
    return false
  }
  if (tile.isBlocker) {
    console.log(`[CAN_BREAK] Blocked: tile is blocker`)
    return false
  }
  if (tile.status === 'breaking') {
    console.log(`[CAN_BREAK] Blocked: tile is currently breaking (animation in progress)`)
    return false
  }
  
  if (tile.status === 'hidden') {
    console.log(`[CAN_BREAK] Allowed: tile is hidden`)
    return true
  }
  
  if (tile.status === 'cracked' && tile.hp !== undefined && tile.hp > 0) {
    console.log(`[CAN_BREAK] Allowed: tile is cracked with HP=${tile.hp}`)
    return true
  }
  
  if (tile.status.startsWith('revealed')) {
    console.log(`[CAN_BREAK] Blocked: tile is already fully revealed (${tile.status})`)
    return false
  }
  
  console.log(`[CAN_BREAK] Blocked: tile status is ${tile.status}, HP=${tile.hp}`)
  return false
}
