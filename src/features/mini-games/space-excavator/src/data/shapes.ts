import type { HiddenObject } from '../types/game'

function createSpriteMap(pattern: number[][]): Map<string, string> {
  const map = new Map<string, string>()
  pattern.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 1) {
        map.set(`${r},${c}`, `${r},${c}`)
      }
    })
  })
  return map
}

export const objectShapes: HiddenObject[] = [
  {
    id: 'line_2',
    name: 'Small Pin',
    icon: 'Minus',
    color: 'silver',
    pattern: [[1, 1]],
    spriteMap: createSpriteMap([[1, 1]]),
  },
  {
    id: 'line_3',
    name: 'Iron Rod',
    icon: 'Minus',
    color: 'bronze',
    pattern: [[1, 1, 1]],
    spriteMap: createSpriteMap([[1, 1, 1]]),
  },
  {
    id: 'line_4',
    name: 'Silver Bar',
    icon: 'SquareHalf',
    color: 'silver',
    pattern: [[1, 1, 1, 1]],
    spriteMap: createSpriteMap([[1, 1, 1, 1]]),
  },
  {
    id: 'square_2x2',
    name: 'Gold Coin',
    icon: 'Coin',
    color: 'gold',
    pattern: [[1, 1], [1, 1]],
    spriteMap: createSpriteMap([[1, 1], [1, 1]]),
  },
  {
    id: 'l_shape_3',
    name: 'Bronze Hook',
    icon: 'Cube',
    color: 'bronze',
    pattern: [[1, 0], [1, 1]],
    spriteMap: createSpriteMap([[1, 0], [1, 1]]),
  },
  {
    id: 'l_shape_4',
    name: 'Bronze L',
    icon: 'Cube',
    color: 'bronze',
    pattern: [[1, 0], [1, 0], [1, 1]],
    spriteMap: createSpriteMap([[1, 0], [1, 0], [1, 1]]),
  },
  {
    id: 't_shape',
    name: 'Bronze T',
    icon: 'FirstAid',
    color: 'bronze',
    pattern: [[1, 1, 1], [0, 1, 0]],
    spriteMap: createSpriteMap([[1, 1, 1], [0, 1, 0]]),
  },
  {
    id: 'plus_shape',
    name: 'Ruby Cross',
    icon: 'FirstAid',
    color: 'ruby',
    pattern: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    spriteMap: createSpriteMap([[0, 1, 0], [1, 1, 1], [0, 1, 0]]),
  },
  {
    id: 'z_shape',
    name: 'Twisted Relic',
    icon: 'Lightning',
    color: 'bronze',
    pattern: [[1, 1, 0], [0, 1, 1]],
    spriteMap: createSpriteMap([[1, 1, 0], [0, 1, 1]]),
  },
  {
    id: 'big_l_5',
    name: 'Ancient L',
    icon: 'Cube',
    color: 'gold',
    pattern: [[1, 0], [1, 0], [1, 0], [1, 1]],
    spriteMap: createSpriteMap([[1, 0], [1, 0], [1, 0], [1, 1]]),
  },
  {
    id: 'cross_5',
    name: 'Golden Cross',
    icon: 'Cross',
    color: 'gold',
    pattern: [[0, 1, 0], [0, 1, 0], [1, 1, 1]],
    spriteMap: createSpriteMap([[0, 1, 0], [0, 1, 0], [1, 1, 1]]),
  },
  {
    id: 'stair_shape',
    name: 'Stone Stairs',
    icon: 'Stairs',
    color: 'silver',
    pattern: [[1, 0, 0], [1, 1, 0], [1, 1, 1]],
    spriteMap: createSpriteMap([[1, 0, 0], [1, 1, 0], [1, 1, 1]]),
  },
  {
    id: 'hook_shape',
    name: 'Iron Hook',
    icon: 'FishHook',
    color: 'silver',
    pattern: [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
    spriteMap: createSpriteMap([[1, 1, 1], [1, 0, 0], [1, 0, 0]]),
  },
  {
    id: 'offset_snake',
    name: 'Serpent Relic',
    icon: 'Waveform',
    color: 'ruby',
    pattern: [[1, 0, 0], [1, 1, 0], [0, 1, 1]],
    spriteMap: createSpriteMap([[1, 0, 0], [1, 1, 0], [0, 1, 1]]),
  },
  {
    id: 'fork',
    name: 'Ancient Fork',
    icon: 'GitFork',
    color: 'silver',
    pattern: [[1, 0, 1], [1, 0, 1], [1, 1, 1]],
    spriteMap: createSpriteMap([[1, 0, 1], [1, 0, 1], [1, 1, 1]]),
  },
  {
    id: 'bottle',
    name: 'Glass Bottle',
    icon: 'Flask',
    color: 'diamond',
    pattern: [[0, 1, 0], [0, 1, 0], [1, 1, 1], [1, 1, 1]],
    spriteMap: createSpriteMap([[0, 1, 0], [0, 1, 0], [1, 1, 1], [1, 1, 1]]),
  },
  {
    id: 'key',
    name: 'Golden Key',
    icon: 'Key',
    color: 'gold',
    pattern: [[1, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 0]],
    spriteMap: createSpriteMap([[1, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 0]]),
  },
  {
    id: 'chest_fragment',
    name: 'Treasure Chest',
    icon: 'Vault',
    color: 'gold',
    pattern: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
    spriteMap: createSpriteMap([[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]),
  },
  {
    id: 'diamond_tiny',
    name: 'Diamond Shard',
    icon: 'Diamond',
    color: 'diamond',
    pattern: [[0, 1, 0], [1, 1, 1]],
    spriteMap: createSpriteMap([[0, 1, 0], [1, 1, 1]]),
  },
  {
    id: 'crown_medium',
    name: 'Ancient Crown',
    icon: 'Crown',
    color: 'gold',
    pattern: [[1, 0, 1], [1, 1, 1], [1, 1, 1]],
    spriteMap: createSpriteMap([[1, 0, 1], [1, 1, 1], [1, 1, 1]]),
  },
]

export function getObjectShape(id: string): HiddenObject | undefined {
  return objectShapes.find(shape => shape.id === id)
}
