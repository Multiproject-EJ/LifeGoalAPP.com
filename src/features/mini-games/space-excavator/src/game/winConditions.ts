import type { PlacedObject, Position } from '../types/game'

export function positionKey(position: Position): string {
  return `${position.row},${position.col}`
}

export function checkObjectCompletion(obj: PlacedObject, revealedPosition: Position): boolean {
  const key = positionKey(revealedPosition)
  obj.revealedCells.add(key)
  return obj.revealedCells.size === obj.cells.length
}
