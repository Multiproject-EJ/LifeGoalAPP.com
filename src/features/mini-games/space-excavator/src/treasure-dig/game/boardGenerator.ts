import type { Level, Board, Tile, PlacedObject } from '../types/game.types'
import { placeObject } from '../utils/placement'

export function generateBoard(level: Level): Board {
  const size = level.boardSize
  const tiles: Tile[][] = []

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
    const placed = placeObject(objConfig.shapeId, objConfig.position, objectId)
    
    if (placed) {
      objectsMap.set(objectId, placed)
      
      placed.cells.forEach(cell => {
        if (tiles[cell.row] && tiles[cell.row][cell.col]) {
          tiles[cell.row][cell.col].objectId = objectId
        }
      })
    }
  })

  if (level.blockers) {
    level.blockers.forEach(blocker => {
      if (tiles[blocker.row] && tiles[blocker.row][blocker.col]) {
        tiles[blocker.row][blocker.col].isBlocker = true
      }
    })
  }

  if (level.specialTiles) {
    level.specialTiles.forEach(special => {
      if (tiles[special.position.row] && tiles[special.position.row][special.position.col]) {
        tiles[special.position.row][special.position.col].specialType = special.type
      }
    })
  }

  return {
    size,
    tiles,
    objects: objectsMap,
  }
}
