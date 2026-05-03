import type { Position, PlacedObject, HiddenObject } from '../types/game'
import { getObjectShape } from '../data/shapes'

export function placeObject(
  shapeId: string,
  position: Position,
  objectId: string,
  boardSize?: number
): PlacedObject | null {
  const shape = getObjectShape(shapeId)
  if (!shape) {
    console.error(`[PLACEMENT] Shape not found: ${shapeId}`)
    return null
  }

  const cells: Position[] = []
  const pattern = shape.pattern

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col] === 1) {
        const actualRow = position.row + row
        const actualCol = position.col + col
        
        if (boardSize !== undefined) {
          if (actualRow < 0 || actualRow >= boardSize || actualCol < 0 || actualCol >= boardSize) {
            console.error(
              `[PLACEMENT] Object ${shapeId} at position (${position.row}, ${position.col}) ` +
              `would place cell at (${actualRow}, ${actualCol}) which is outside board bounds [0-${boardSize - 1}]`
            )
            return null
          }
        }
        
        cells.push({
          row: actualRow,
          col: actualCol,
        })
      }
    }
  }

  if (cells.length === 0) {
    console.error(`[PLACEMENT] Object ${shapeId} has no valid cells`)
    return null
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

export function isPositionOccupied(
  position: Position,
  existingObjects: Map<string, PlacedObject>
): boolean {
  for (const obj of existingObjects.values()) {
    if (
      obj.cells.some(
        cell => cell.row === position.row && cell.col === position.col
      )
    ) {
      return true
    }
  }
  return false
}

export function isValidPlacement(
  shape: HiddenObject,
  position: Position,
  boardSize: number,
  existingObjects: Map<string, PlacedObject>,
  blockers: Position[]
): boolean {
  const pattern = shape.pattern

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col] === 1) {
        const actualRow = position.row + row
        const actualCol = position.col + col

        if (
          actualRow < 0 ||
          actualRow >= boardSize ||
          actualCol < 0 ||
          actualCol >= boardSize
        ) {
          return false
        }

        const cellPosition = { row: actualRow, col: actualCol }

        if (isPositionOccupied(cellPosition, existingObjects)) {
          return false
        }

        if (
          blockers.some(
            blocker =>
              blocker.row === actualRow && blocker.col === actualCol
          )
        ) {
          return false
        }
      }
    }
  }

  return true
}
