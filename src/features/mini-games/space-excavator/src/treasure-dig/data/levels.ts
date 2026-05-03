import type { LevelConfig } from '../types/game.types'

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'First Dig',
    boardSize: 5,
    tools: 15,
    objects: [
      {
        shapeId: 'coin_small',
        position: { row: 1, col: 1 },
      },
      {
        shapeId: 'silver_bar',
        position: { row: 3, col: 0 },
      },
    ],
  },
  {
    id: 2,
    name: 'Hidden Gems',
    boardSize: 5,
    tools: 18,
    objects: [
      {
        shapeId: 'diamond_tiny',
        position: { row: 0, col: 1 },
      },
      {
        shapeId: 'coin_small',
        position: { row: 2, col: 3 },
      },
      {
        shapeId: 'bronze_l',
        position: { row: 3, col: 0 },
      },
    ],
    blockers: [
      { row: 1, col: 4 },
    ],
  },
  {
    id: 3,
    name: 'Royal Vault',
    boardSize: 6,
    tools: 22,
    objects: [
      {
        shapeId: 'crown_medium',
        position: { row: 1, col: 1 },
      },
      {
        shapeId: 'ruby_cross',
        position: { row: 1, col: 4 },
      },
    ],
    blockers: [
      { row: 0, col: 0 },
      { row: 5, col: 5 },
    ],
  },
  {
    id: 4,
    name: 'Cavern Depths',
    boardSize: 6,
    tools: 25,
    objects: [
      {
        shapeId: 'treasure_large',
        position: { row: 2, col: 1 },
      },
      {
        shapeId: 'coin_small',
        position: { row: 0, col: 4 },
      },
    ],
    blockers: [
      { row: 1, col: 0 },
      { row: 3, col: 5 },
      { row: 5, col: 3 },
    ],
    specialTiles: [
      {
        position: { row: 4, col: 2 },
        type: 'bomb-row',
      },
    ],
  },
  {
    id: 5,
    name: 'Lost Riches',
    boardSize: 7,
    tools: 30,
    objects: [
      {
        shapeId: 'diamond_big',
        position: { row: 1, col: 1 },
      },
      {
        shapeId: 'crown_medium',
        position: { row: 3, col: 4 },
      },
      {
        shapeId: 'silver_bar',
        position: { row: 6, col: 0 },
      },
    ],
    blockers: [
      { row: 0, col: 0 },
      { row: 0, col: 6 },
      { row: 6, col: 6 },
    ],
    specialTiles: [
      {
        position: { row: 2, col: 5 },
        type: 'bomb-col',
      },
    ],
  },
  {
    id: 6,
    name: 'Ancient Trove',
    boardSize: 7,
    tools: 32,
    objects: [
      {
        shapeId: 'treasure_large',
        position: { row: 0, col: 2 },
      },
      {
        shapeId: 'ruby_cross',
        position: { row: 3, col: 0 },
      },
      {
        shapeId: 'bronze_l',
        position: { row: 4, col: 4 },
      },
      {
        shapeId: 'coin_small',
        position: { row: 5, col: 5 },
      },
    ],
    blockers: [
      { row: 1, col: 6 },
      { row: 3, col: 3 },
      { row: 5, col: 1 },
      { row: 6, col: 6 },
    ],
    specialTiles: [
      {
        position: { row: 2, col: 3 },
        type: 'chain-row',
      },
    ],
  },
]

export function getLevel(id: number): LevelConfig | undefined {
  return levels.find(level => level.id === id)
}
