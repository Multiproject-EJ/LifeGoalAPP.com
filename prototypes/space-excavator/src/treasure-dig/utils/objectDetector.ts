import type { PlacedObject, Position } from '../types/game.types'
import { positionKey } from './placement'

export function checkObjectCompletion(
  obj: PlacedObject,
  revealedPosition: Position
): boolean {
  const key = positionKey(revealedPosition)
  obj.revealedCells.add(key)

  return obj.revealedCells.size === obj.cells.length
}

export function findObjectAtPosition(
  position: Position,
  objects: Map<string, PlacedObject>
): PlacedObject | null {
  for (const obj of objects.values()) {
    if (
      obj.cells.some(
        cell => cell.row === position.row && cell.col === position.col
      )
    ) {
      return obj
    }
  }
  return null
}
