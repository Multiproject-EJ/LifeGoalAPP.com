import type { LevelConfig } from '../types/game'

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'First Dig',
    boardSize: 4,
    tools: 10,
    objects: [
      { shapeId: 'line_2', position: { row: 1, col: 1 } },
    ],
  },
  {
    id: 2,
    name: 'Easy Find',
    boardSize: 4,
    tools: 11,
    objects: [
      { shapeId: 'line_3', position: { row: 0, col: 1 } },
    ],
  },
  {
    id: 3,
    name: 'Long Bar',
    boardSize: 5,
    tools: 13,
    objects: [
      { shapeId: 'line_4', position: { row: 2, col: 0 } },
    ],
  },
  {
    id: 4,
    name: 'Square Coin',
    boardSize: 5,
    tools: 14,
    objects: [
      { shapeId: 'square_2x2', position: { row: 1, col: 2 } },
    ],
  },
  {
    id: 5,
    name: 'Hook Shape',
    boardSize: 5,
    tools: 16,
    objects: [
      { shapeId: 'l_shape_3', position: { row: 1, col: 1 } },
      { shapeId: 'line_2', position: { row: 3, col: 3 } },
    ],
  },
  {
    id: 6,
    name: 'Bronze Relics',
    boardSize: 6,
    tools: 18,
    objects: [
      { shapeId: 'l_shape_4', position: { row: 0, col: 1 } },
      { shapeId: 'line_3', position: { row: 4, col: 3 } },
    ],
  },
  {
    id: 7,
    name: 'T-Shaped Relic',
    boardSize: 6,
    tools: 20,
    objects: [
      { shapeId: 't_shape', position: { row: 1, col: 1 } },
      { shapeId: 'square_2x2', position: { row: 4, col: 3 } },
    ],
  },
  {
    id: 8,
    name: 'Plus Pattern',
    boardSize: 6,
    tools: 22,
    objects: [
      { shapeId: 'plus_shape', position: { row: 1, col: 1 } },
      { shapeId: 'l_shape_3', position: { row: 4, col: 3 } },
    ],
  },
  {
    id: 9,
    name: 'Zigzag',
    boardSize: 6,
    tools: 24,
    objects: [
      { shapeId: 'z_shape', position: { row: 2, col: 1 } },
      { shapeId: 't_shape', position: { row: 0, col: 3 } },
    ],
    hardTiles: [
      { position: { row: 1, col: 1 }, hp: 2 },
      { position: { row: 4, col: 4 }, hp: 2 },
    ],
  },
  {
    id: 10,
    name: 'Hard Ground',
    boardSize: 6,
    tools: 26,
    objects: [
      { shapeId: 'big_l_5', position: { row: 1, col: 1 } },
      { shapeId: 'line_4', position: { row: 0, col: 0 } },
    ],
    hardTiles: [
      { position: { row: 3, col: 3 }, hp: 2 },
      { position: { row: 2, col: 4 }, hp: 2 },
      { position: { row: 5, col: 2 }, hp: 2 },
    ],
  },
  {
    id: 11,
    name: 'Cross Hunt',
    boardSize: 6,
    tools: 28,
    objects: [
      { shapeId: 'cross_5', position: { row: 0, col: 1 } },
      { shapeId: 'square_2x2', position: { row: 4, col: 4 } },
    ],
    hardTiles: [
      { position: { row: 2, col: 2 }, hp: 3 },
      { position: { row: 3, col: 4 }, hp: 2 },
    ],
  },
  {
    id: 12,
    name: 'Serpent Path',
    boardSize: 7,
    tools: 30,
    objects: [
      { shapeId: 'offset_snake', position: { row: 1, col: 1 } },
      { shapeId: 'stair_shape', position: { row: 3, col: 4 } },
    ],
    hardTiles: [
      { position: { row: 2, col: 3 }, hp: 3 },
      { position: { row: 4, col: 1 }, hp: 2 },
      { position: { row: 6, col: 5 }, hp: 2 },
    ],
  },
  {
    id: 13,
    name: 'Big Dig',
    boardSize: 7,
    tools: 32,
    objects: [
      { shapeId: 'hook_shape', position: { row: 0, col: 1 } },
      { shapeId: 'z_shape', position: { row: 4, col: 3 } },
      { shapeId: 'line_3', position: { row: 6, col: 0 } },
    ],
    blockers: [{ row: 2, col: 6 }],
    hardTiles: [
      { position: { row: 1, col: 4 }, hp: 2 },
      { position: { row: 5, col: 2 }, hp: 2 },
    ],
  },
  {
    id: 14,
    name: 'Triple Hunt',
    boardSize: 7,
    tools: 34,
    objects: [
      { shapeId: 'cross_5', position: { row: 0, col: 2 } },
      { shapeId: 'l_shape_4', position: { row: 4, col: 0 } },
      { shapeId: 'square_2x2', position: { row: 5, col: 5 } },
    ],
    blockers: [{ row: 3, col: 6 }],
    hardTiles: [
      { position: { row: 2, col: 2 }, hp: 2 },
      { position: { row: 5, col: 4 }, hp: 2 },
    ],
  },
  {
    id: 15,
    name: 'Ancient Fork',
    boardSize: 7,
    tools: 36,
    objects: [
      { shapeId: 'fork', position: { row: 1, col: 1 } },
      { shapeId: 'plus_shape', position: { row: 1, col: 4 } },
    ],
    blockers: [{ row: 0, col: 0 }, { row: 6, col: 6 }],
    hardTiles: [
      { position: { row: 3, col: 3 }, hp: 3 },
      { position: { row: 5, col: 5 }, hp: 2 },
    ],
    chainRowTiles: [{ row: 4, col: 2 }],
  },
  {
    id: 16,
    name: 'Glass Vault',
    boardSize: 8,
    tools: 40,
    objects: [
      { shapeId: 'bottle', position: { row: 1, col: 2 } },
      { shapeId: 'big_l_5', position: { row: 3, col: 5 } },
      { shapeId: 'line_4', position: { row: 6, col: 0 } },
    ],
    blockers: [{ row: 0, col: 0 }, { row: 7, col: 7 }],
    hardTiles: [
      { position: { row: 2, col: 4 }, hp: 3 },
      { position: { row: 5, col: 1 }, hp: 2 },
    ],
    bombTiles: [
      { position: { row: 4, col: 3 }, direction: 'row' },
    ],
  },
  {
    id: 17,
    name: 'Golden Key',
    boardSize: 8,
    tools: 42,
    objects: [
      { shapeId: 'key', position: { row: 2, col: 1 } },
      { shapeId: 'hook_shape', position: { row: 1, col: 4 } },
      { shapeId: 'square_2x2', position: { row: 6, col: 5 } },
    ],
    blockers: [{ row: 0, col: 7 }, { row: 7, col: 0 }],
    hardTiles: [
      { position: { row: 4, col: 3 }, hp: 3 },
      { position: { row: 5, col: 6 }, hp: 2 },
      { position: { row: 3, col: 2 }, hp: 2 },
    ],
    bombTiles: [
      { position: { row: 7, col: 3 }, direction: 'col' },
    ],
    revealTiles: [{ row: 5, col: 2 }],
    chainRowTiles: [{ row: 6, col: 2 }],
  },
  {
    id: 18,
    name: 'Triple Artifact',
    boardSize: 8,
    tools: 44,
    objects: [
      { shapeId: 'fork', position: { row: 0, col: 1 } },
      { shapeId: 'bottle', position: { row: 4, col: 0 } },
      { shapeId: 'offset_snake', position: { row: 2, col: 5 } },
    ],
    blockers: [{ row: 3, col: 3 }, { row: 7, col: 7 }],
    hardTiles: [
      { position: { row: 1, col: 4 }, hp: 3 },
      { position: { row: 5, col: 5 }, hp: 3 },
      { position: { row: 6, col: 2 }, hp: 2 },
    ],
    bombTiles: [
      { position: { row: 5, col: 3 }, direction: 'row' },
    ],
    revealTiles: [{ row: 3, col: 2 }],
    bonusTiles: [{ row: 7, col: 0 }],
  },
  {
    id: 19,
    name: 'Royal Treasure',
    boardSize: 8,
    tools: 46,
    objects: [
      { shapeId: 'chest_fragment', position: { row: 1, col: 1 } },
      { shapeId: 'crown_medium', position: { row: 5, col: 4 } },
    ],
    blockers: [{ row: 0, col: 4 }, { row: 4, col: 0 }, { row: 7, col: 7 }],
    hardTiles: [
      { position: { row: 2, col: 2 }, hp: 3 },
      { position: { row: 3, col: 3 }, hp: 3 },
      { position: { row: 6, col: 5 }, hp: 3 },
    ],
    bombTiles: [
      { position: { row: 7, col: 2 }, direction: 'row' },
    ],
    revealTiles: [{ row: 5, col: 1 }],
    bonusTiles: [{ row: 6, col: 3 }],
    chainRowTiles: [{ row: 3, col: 6 }],
  },
  {
    id: 20,
    name: 'Master Excavator',
    boardSize: 8,
    tools: 48,
    objects: [
      { shapeId: 'chest_fragment', position: { row: 2, col: 2 } },
      { shapeId: 'crown_medium', position: { row: 0, col: 5 } },
      { shapeId: 'key', position: { row: 5, col: 0 } },
    ],
    blockers: [{ row: 0, col: 0 }, { row: 7, col: 0 }, { row: 7, col: 7 }],
    hardTiles: [
      { position: { row: 3, col: 3 }, hp: 3 },
      { position: { row: 4, col: 4 }, hp: 3 },
      { position: { row: 1, col: 6 }, hp: 3 },
    ],
    bombTiles: [
      { position: { row: 6, col: 5 }, direction: 'row' },
    ],
    revealTiles: [{ row: 1, col: 1 }],
    bonusTiles: [{ row: 6, col: 3 }],
  },
]

export function getLevel(id: number): LevelConfig | undefined {
  return levels.find(level => level.id === id)
}
