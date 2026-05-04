import type { LevelConfig, HiddenObject } from '../types/game.types'
import { getObjectShape } from '../data/objects'
import { isValidPlacement } from './placement'

export function validateLevel(level: LevelConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (level.boardSize < 5 || level.boardSize > 7) {
    errors.push(`Board size must be between 5 and 7, got ${level.boardSize}`)
  }

  if (level.objects.length === 0) {
    errors.push('Level must have at least one object')
  }

  if (level.tools < level.objects.length) {
    errors.push('Not enough tools to reveal minimum number of objects')
  }

  const placedObjects = new Map()
  const blockers = level.blockers || []

  for (const objConfig of level.objects) {
    const shape = getObjectShape(objConfig.shapeId)
    if (!shape) {
      errors.push(`Unknown object shape: ${objConfig.shapeId}`)
      continue
    }

    if (!isValidPlacement(shape, objConfig.position, level.boardSize, placedObjects, Array.from(blockers))) {
      errors.push(
        `Invalid placement for ${shape.name} at (${objConfig.position.row}, ${objConfig.position.col})`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
