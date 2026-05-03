import type { HiddenObject } from '../types/game.types'

export const objectShapes: HiddenObject[] = [
  {
    id: 'coin_small',
    name: 'Gold Coin',
    icon: 'Coin',
    color: 'gold',
    pattern: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    id: 'diamond_tiny',
    name: 'Diamond Shard',
    icon: 'Diamond',
    color: 'diamond',
    pattern: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    id: 'crown_medium',
    name: 'Ancient Crown',
    icon: 'Crown',
    color: 'gold',
    pattern: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  },
  {
    id: 'treasure_large',
    name: 'Treasure Chest',
    icon: 'Vault',
    color: 'gold',
    pattern: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  },
  {
    id: 'ruby_cross',
    name: 'Ruby Cross',
    icon: 'FirstAid',
    color: 'ruby',
    pattern: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    id: 'silver_bar',
    name: 'Silver Bar',
    icon: 'SquareHalf',
    color: 'silver',
    pattern: [
      [1, 1, 1],
    ],
  },
  {
    id: 'bronze_l',
    name: 'Bronze Relic',
    icon: 'Cube',
    color: 'bronze',
    pattern: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  },
  {
    id: 'diamond_big',
    name: 'Large Diamond',
    icon: 'DiamondsFour',
    color: 'diamond',
    pattern: [
      [0, 1, 1, 0],
      [1, 1, 1, 1],
      [0, 1, 1, 0],
    ],
  },
]

export function getObjectShape(id: string): HiddenObject | undefined {
  return objectShapes.find(shape => shape.id === id)
}
